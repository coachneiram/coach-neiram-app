/**
 * Communauté « Team Neiram » (24 octobre 2026), entre clients du coach.
 *
 * Reprise de l'app publique Neiram (public/communaute.js,
 * lib/classements.js, ui/stats-communaute.js) avec l'accord du coach du
 * 24/10/2026. Le serveur est le Worker du coach (routes /communaute/*,
 * worker/coach-neiram-proxy.js) : chaque appel porte le jeton du client
 * (lib/acces.js). Sans code d'accès activé, pas de communauté : l'écran
 * invite à entrer le code du coach dans les Réglages.
 *
 * TROIS ACCORDS DISTINCTS, demandés dans l'app et retirables à tout moment
 * (le serveur efface alors les données correspondantes) :
 *  - profil : pseudo, séances du mois et régularité sur 30 jours ;
 *  - disciplines : performances (force athlétique, haltérophilie, course,
 *    natation), sexe et catégorie de poids — jamais le poids exact ;
 *  - transformation : gras perdu (% du poids de départ), muscle pris (kg),
 *    et le mur des transformations (chiffres et message, ni photo ni poids).
 *
 * RIEN DE SANTÉ NE PART : les exclusions du classement de perte (moins de
 * 18 ans, grossesse, allaitement, antécédent de trouble alimentaire, IMC
 * sous 18,5, masse grasse très basse) se calculent sur le téléphone
 * (lib/eligibilite-perte.js, seul à lire les réponses de santé) ; le
 * serveur reçoit seulement « perte_eligible » (1 ou 0).
 *
 * Pseudo proposé : celui des défis entre amis (cn_defis_pseudo), sinon le
 * prénom du libellé de l'accès. Jamais le libellé complet.
 *
 * « cn_communaute » (dans la sauvegarde) : { pseudo, disciplines,
 * transformation, publiees, publieA } — copie locale de l'état du serveur,
 * qui fait foi.
 */

import { charger, enregistrer } from "./stockage.js";
import { accesActuel } from "./acces.js";
import { CLE_PSEUDO_DEFIS, appelerDefis, prenomDuLibelle } from "./defis-amis.js";
import { addDays, num } from "./dates.js";
import { fmtTemps } from "./performances.js";
import { statsDisciplines } from "./stats-disciplines.js";
import { periodes, statsTransformation, transformation } from "./transformation.js";
import { perteEligible } from "./eligibilite-perte.js";

export const CLE_COMMUNAUTE = "cn_communaute";
export const DELAI_PUBLICATION_MS = 30 * 60000;

/* ------------------------------------------------------------------ */
/* Mémoire locale                                                      */
/* ------------------------------------------------------------------ */

export function lireCommunaute() {
  const v = charger(CLE_COMMUNAUTE, null);
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}
const memoriser = (modif) => enregistrer(CLE_COMMUNAUTE, { ...lireCommunaute(), ...modif });

/** Retient l'état du serveur (profil ou null). */
export function retenirProfil(profil) {
  if (!profil) {
    memoriser({ pseudo: null, disciplines: false, transformation: false, publiees: null, publieA: null });
    return null;
  }
  const avant = lireCommunaute();
  const accordsChanges = avant.disciplines !== profil.disciplines || avant.transformation !== profil.transformation;
  memoriser({ pseudo: profil.pseudo, disciplines: !!profil.disciplines, transformation: !!profil.transformation, ...(accordsChanges ? { publiees: null, publieA: null } : {}) });
  return profil;
}

/** La communauté est-elle possible sur ce téléphone (code d'accès activé) ? */
export const communautePossible = (env) => Boolean(accesActuel(env));

/** Pseudo proposé : celui des défis, sinon le prénom de l'accès. */
export function pseudoPropose(env) {
  const garde = charger(CLE_PSEUDO_DEFIS, "");
  if (typeof garde === "string" && garde.trim()) return garde.trim();
  const a = accesActuel(env);
  return a ? prenomDuLibelle(a.libelle) : "";
}

/* ------------------------------------------------------------------ */
/* Chiffres publiés                                                    */
/* ------------------------------------------------------------------ */

/** Dernière pesée (jamais publiée : seule la catégorie l'est). */
function dernierPoids(corps) {
  const pesees = (corps || []).filter((c) => c && c.date && num(c.weightKg) > 0).sort((a, b) => (a.date < b.date ? 1 : -1));
  return pesees.length ? num(pesees[0].weightKg) : null;
}

export { perteEligible };

/** Séances du mois et régularité (jours notés sur 30 jours). */
export function statsRegularite({ date, seances = [], repas = [], journal = [] }) {
  const mois = date.slice(0, 7);
  const valides = (seances || []).filter((s) => s && typeof s.date === "string");
  const debut = addDays(date, -29);
  const jours = new Set();
  for (const l of [repas, journal, valides]) for (const x of l || []) if (x && typeof x.date === "string" && x.date >= debut && x.date <= date) jours.add(x.date);
  return {
    mois,
    seances_mois: valides.filter((s) => s.date.startsWith(mois) && s.date <= date).length,
    regularite_30: jours.size
  };
}

/**
 * Chiffres à publier, selon les accords (le serveur refait le tri avec
 * les accords qu'il a enregistrés). Jamais le poids, ni une mesure.
 */
export function statsCommunaute({ date, seances = [], repas = [], journal = [], corps = [], profil = {}, maxis = {}, accords = lireCommunaute(), reglages }) {
  const sortie = statsRegularite({ date, seances, repas, journal });
  const sexe = profil && profil.sex === "femme" ? "f" : "h";
  if (accords.disciplines) {
    Object.assign(sortie, statsDisciplines({ date, profil: profil || {}, poids: dernierPoids(corps) || num(profil && profil.startWeightKg) || null, maxis: maxis || {}, seances }));
  }
  if (accords.transformation) {
    const eligible = perteEligible({ corps, profil, reglages });
    const t = statsTransformation({ bodyLogs: corps || [], profil: profil || {}, date });
    // Non éligible : la perte de gras ne part pas du tout.
    if (!eligible) {
      delete t.gras_90;
      delete t.gras_an;
    }
    Object.assign(sortie, t, { sexe, perte_eligible: eligible ? 1 : 0 });
  }
  return sortie;
}

/**
 * Ma transformation sur une période, prête pour le mur : chiffres publiés
 * (perte seulement si éligible), et la transformation complète pour
 * l'affichage sur le téléphone.
 */
export function maTransformation({ corps, profil, date, periode = "j90", reglages }) {
  const t = transformation({ bodyLogs: corps || [], profil: profil || {}, ...periodes(date)[periode] });
  const eligible = Boolean(t) && !t.exclusionPerte && perteEligible({ corps, profil, reglages });
  return {
    t,
    eligible,
    gras: t && t.gras && eligible && t.gras.pct > 0 ? t.gras.pct : null,
    muscle: t && t.muscle && t.muscle.compteKg > 0 ? t.muscle.compteKg : null
  };
}

/* ------------------------------------------------------------------ */
/* Appels au Worker du coach                                           */
/* ------------------------------------------------------------------ */

const appeler = (chemin, corps, env) => appelerDefis(chemin, corps, env);

export async function etatCommunaute(env) {
  const r = await appeler("/communaute/etat", {}, env);
  retenirProfil(r.profil);
  return r;
}

export async function creerProfil({ pseudo, stats, maintenant = Date.now() }, env) {
  const r = await appeler("/communaute/profil", { pseudo, accord: true, stats }, env);
  retenirProfil(r.profil);
  memoriser({ publiees: JSON.stringify(stats), publieA: maintenant });
  return r.profil;
}

/** Donne ou retire l'accord « disciplines » ou « transformation ». */
export async function changerAccord(type, oui, env) {
  const r = await appeler("/communaute/accord", { type, oui: !!oui }, env);
  retenirProfil(r.profil);
  return r.profil;
}

/**
 * Publie les chiffres s'ils ont changé, toutes les 30 minutes au plus, et
 * seulement avec un profil. `force` : tout de suite (accord donné).
 */
export async function publierSiBesoin({ stats, maintenant = Date.now(), force = false }, env) {
  const c = lireCommunaute();
  const empreinte = JSON.stringify(stats);
  if (!c.pseudo || !communautePossible(env)) return false;
  if (!force && (c.publiees === empreinte || (c.publieA && maintenant - c.publieA < DELAI_PUBLICATION_MS))) return false;
  try {
    await appeler("/communaute/stats", { stats }, env);
    memoriser({ publiees: empreinte, publieA: maintenant });
    return true;
  } catch (e) {
    // Profil effacé ailleurs (suppression, accès révoqué) : on l'oublie.
    if (e && (e.message === "profil-requis" || e.message === "jeton-invalide")) retenirProfil(null);
    return false;
  }
}

export async function supprimerProfil(env) {
  await appeler("/communaute/supprimer", {}, env);
  retenirProfil(null);
}

export const classementDe = (categorie, filtres, env) => appeler("/communaute/classement", { categorie, ...(filtres ? { filtres } : {}) }, env);
export const athletesDuMois = (env) => appeler("/communaute/athletes-du-mois", {}, env);
export const signaler = (type, cible, motif, env) => appeler("/communaute/signaler", { type, cible: String(cible), motif }, env);
export const listeTransformations = (env) => appeler("/communaute/transformations/liste", {}, env);
export const publierTransformation = (t, env) => appeler("/communaute/transformations/publier", t, env);
export const bravoTransformation = (id, env) => appeler("/communaute/transformations/bravo", { id }, env);
export const supprimerTransformation = (id, env) => appeler("/communaute/transformations/supprimer", { id }, env);

/* ------------------------------------------------------------------ */
/* Catégories (elles concordent avec le Worker : un test le vérifie)    */
/* ------------------------------------------------------------------ */

const virgule = (v) => String(v).replace(".", ",");
const kg = (v) => `${virgule(v)} kg`;
const pts = (v) => `${virgule(Math.round(v * 10) / 10)} pts`;

export const GROUPE_REGULARITE = "Régularité";
export const GROUPES_DISCIPLINES = ["Force athlé", "Haltéro", "Course", "Natation"];
export const GROUPE_TRANSFORMATION = "Transformation";

export const CATEGORIES_COMMUNAUTE = [
  { id: "seances_mois", groupe: GROUPE_REGULARITE, emoji: "📅", titre: "Séances du mois", unite: (v) => `${v} séance${v > 1 ? "s" : ""}` },
  { id: "regularite_30", groupe: GROUPE_REGULARITE, emoji: "🎯", titre: "Les plus réguliers (30 j)", unite: (v) => `${v}/30 jours` },
  { id: "pl_total", groupe: "Force athlé", emoji: "🏋️", titre: "Total (catégorie)", unite: kg, filtres: ["sexe", "cat_pl"] },
  { id: "pl_gl", groupe: "Force athlé", emoji: "⚖️", titre: "Points IPF GL", unite: pts, filtres: ["sexe"] },
  { id: "halt_total", groupe: "Haltéro", emoji: "🥇", titre: "Total (catégorie)", unite: kg, filtres: ["sexe", "cat_halt"] },
  { id: "halt_sinclair", groupe: "Haltéro", emoji: "⚖️", titre: "Points Sinclair", unite: pts, filtres: ["sexe"] },
  { id: "course_5k", groupe: "Course", emoji: "🏃", titre: "5 km", unite: fmtTemps, ordre: "asc", filtres: ["sexe"] },
  { id: "course_10k", groupe: "Course", emoji: "🏃", titre: "10 km", unite: fmtTemps, ordre: "asc", filtres: ["sexe"] },
  { id: "course_semi", groupe: "Course", emoji: "🏃", titre: "Semi-marathon", unite: fmtTemps, ordre: "asc", filtres: ["sexe"] },
  { id: "course_marathon", groupe: "Course", emoji: "🏅", titre: "Marathon", unite: fmtTemps, ordre: "asc", filtres: ["sexe"] },
  { id: "nat_50nl_25", groupe: "Natation", emoji: "🏊", titre: "50 m NL (25 m)", unite: fmtTemps, ordre: "asc", filtres: ["sexe"] },
  { id: "nat_100nl_25", groupe: "Natation", emoji: "🏊", titre: "100 m NL (25 m)", unite: fmtTemps, ordre: "asc", filtres: ["sexe"] },
  { id: "nat_400nl_25", groupe: "Natation", emoji: "🏊", titre: "400 m NL (25 m)", unite: fmtTemps, ordre: "asc", filtres: ["sexe"] },
  { id: "nat_50nl_50", groupe: "Natation", emoji: "🏊", titre: "50 m NL (50 m)", unite: fmtTemps, ordre: "asc", filtres: ["sexe"] },
  { id: "nat_100nl_50", groupe: "Natation", emoji: "🏊", titre: "100 m NL (50 m)", unite: fmtTemps, ordre: "asc", filtres: ["sexe"] },
  { id: "nat_400nl_50", groupe: "Natation", emoji: "🏊", titre: "400 m NL (50 m)", unite: fmtTemps, ordre: "asc", filtres: ["sexe"] },
  { id: "gras_90", groupe: GROUPE_TRANSFORMATION, emoji: "🔥", titre: "Perte de gras (90 j)", unite: (v) => `−${virgule(v)} % de gras`, filtres: ["sexe"] },
  { id: "muscle_90", groupe: GROUPE_TRANSFORMATION, emoji: "💪", titre: "Prise de muscle (90 j)", unite: (v) => `+${virgule(v)} kg de muscle`, filtres: ["sexe"] },
  { id: "gras_an", groupe: GROUPE_TRANSFORMATION, emoji: "🔥", titre: "Perte de gras (année)", unite: (v) => `−${virgule(v)} % de gras`, filtres: ["sexe"] },
  { id: "muscle_an", groupe: GROUPE_TRANSFORMATION, emoji: "💪", titre: "Prise de muscle (année)", unite: (v) => `+${virgule(v)} kg de muscle`, filtres: ["sexe"] }
];
export const GROUPES_COMMUNAUTE = [...new Set(CATEGORIES_COMMUNAUTE.map((c) => c.groupe))];
export const categorieParId = (id) => CATEGORIES_COMMUNAUTE.find((c) => c.id === id) || null;

/** Groupe de classement de chaque discipline de « Mes performances ». */
export const GROUPE_DISCIPLINE = { force: "Force athlé", halterophilie: "Haltéro", course: "Course", natation: "Natation" };
export const DISCIPLINE_GROUPE = Object.fromEntries(Object.entries(GROUPE_DISCIPLINE).map(([d, g]) => [g, d]));

/** Score de l'athlète du mois, lisible. */
export const SCORE_MOIS = {
  force: (v) => `${virgule(v)} pts IPF GL`,
  halterophilie: (v) => `${virgule(v)} pts Sinclair`,
  course: (v) => `${virgule(v)} % du record du monde`,
  natation: (v) => `${v} pts World Aquatics`
};

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const nomMois = (m) => (m ? `${MOIS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}` : "");

/** Libellé du filtre « Ma catégorie ». */
export const libelleCategorie = (c) => (c ? `Ma catégorie (−${c.replace("+", "")} kg${c.endsWith("+") ? " et +" : ""})` : "Ma catégorie (note ton poids)");

/* ------------------------------------------------------------------ */
/* Textes de l'écran (ui/EcranCommunaute.jsx et ses onglets)            */
/* ------------------------------------------------------------------ */

export const PSEUDO = { min: 3, max: 20 };

export const ERREURS_COMMUNAUTE = {
  "pseudo-longueur": `Ton pseudo doit faire entre ${PSEUDO.min} et ${PSEUDO.max} caractères.`,
  "pseudo-caracteres": "Lettres, chiffres, espaces, points, tirets et _ seulement.",
  "pseudo-refuse": "Ce pseudo n'est pas accepté. Choisis-en un autre.",
  "pseudo-pris": "Ce pseudo est déjà pris par un autre client.",
  "accord-requis": "Coche la case pour rejoindre la communauté.",
  "accord-disciplines-requis": "Entre d'abord dans les classements par discipline.",
  "accord-transformation-requis": "Entre d'abord dans les classements de transformation.",
  "profil-requis": "Crée d'abord ton pseudo de la communauté.",
  "profil-masque": "Ton profil est masqué le temps que ton coach regarde un signalement.",
  "une-par-semaine": "Une transformation par semaine : reviens dans quelques jours.",
  "message-refuse": "Ce message n'est pas accepté (insultes, liens, e-mails et numéros sont refusés).",
  "message-vide": "Écris quelques mots pour encourager les autres.",
  "transformation-vide": "Pas encore de chiffres à partager sur cette période.",
  "trop-de-requetes": "Doucement : réessaie dans une minute.",
  "acces-requis": "Entre le code de ton coach dans les Réglages pour rejoindre la communauté.",
  "jeton-invalide": "Ton accès n'est plus actif : demande un nouveau code à ton coach.",
  reseau: "Pas de connexion : réessaie une fois le réseau revenu."
};
export const messageErreurCommunaute = (e) => ERREURS_COMMUNAUTE[e && e.message] || "Service indisponible pour l'instant.";

/** Erreur de pseudo vue avant l'envoi, ou null. */
export function erreurPseudo(p) {
  const t = String(p || "").trim();
  if (t.length < PSEUDO.min || t.length > PSEUDO.max) return ERREURS_COMMUNAUTE["pseudo-longueur"];
  if (!/^[\p{L}\p{N} _.\-]+$/u.test(t)) return ERREURS_COMMUNAUTE["pseudo-caracteres"];
  return null;
}

export const TEXTES_COMMUNAUTE = {
  titre: "Communauté",
  carteTitre: "🏆 Team Neiram",
  carteIntro: "Classements entre clients du coach, athlète du mois et mur des transformations. Tu n'y apparais que si tu le choisis.",
  ouvrir: "Ouvrir la communauté",
  sansAcces: "La communauté est réservée aux clients du coach. Entre le code d'accès de ton coach dans les Réglages (« Accès de ton coach ») pour la rejoindre.",
  ongletClassements: "🏆 Classements",
  ongletTransformations: "🔥 Transformations",
  chargement: "Chargement…",
  // Accord « profil ».
  profilTitre: "Rejoindre la Team Neiram",
  profilAide: "Choisis un pseudo : c'est lui que voient les autres clients du coach. Ton nom n'est jamais montré.",
  pseudo: "Ton pseudo (ex. ton prénom)",
  accordProfil:
    "J'accepte que mon pseudo, mes séances du mois et ma régularité sur 30 jours soient visibles des autres clients du coach. Rien d'autre : ni mon nom, ni mon poids, ni mes données de santé.",
  rejoindre: "Rejoindre la communauté",
  // Accord « disciplines ».
  disciplinesAide:
    "Compare tes performances (force athlétique, haltérophilie, course, natation) à celles des autres clients, à armes égales : même sexe et, pour les totaux, même catégorie de poids. Tes performances se notent dans Séances → « Mes performances ».",
  disciplinesAccord:
    "J'accepte que mes performances par discipline, mon sexe et ma catégorie de poids soient visibles des autres clients du coach avec mon pseudo. Jamais mon poids exact ni mes mesures.",
  disciplinesCreer: "Entrer dans les classements par discipline",
  disciplinesQuitter: "Retirer mes performances",
  disciplinesRetirees: "Tes performances, ton sexe et ta catégorie sont effacés du serveur.",
  // Accord « transformation ».
  transformationAide:
    "Compare ta transformation à celle des autres clients : le gras perdu (en % de ton poids de départ) et le muscle pris, sur 90 jours et sur l'année, d'après tes pesées. La perte comptée est plafonnée à 1 % du poids par semaine et le muscle à 0,25 kg par semaine : aller plus vite ne fait pas gagner de place.",
  transformationAccord:
    "J'accepte que mon gras perdu (en %), mon muscle pris (en kg), mon sexe et mes messages du mur soient visibles des autres clients du coach avec mon pseudo. Jamais mon poids, ni ma masse grasse, ni de photo.",
  transformationCreer: "Entrer dans les classements de transformation",
  transformationQuitter: "Retirer ma transformation",
  transformationRetiree: "Tes chiffres de transformation et tes messages du mur sont effacés du serveur.",
  // Classements.
  accroche: "📊 Compare-toi aux autres clients du coach, à armes égales.",
  vide: "Personne encore dans ce classement. Sois le premier !",
  monRang: (rang, total) => `Ton rang : ${rang}${rang === 1 ? "er" : "e"} sur ${total}`,
  absent: "Tu n'apparais pas encore ici : note tes séances et tes performances, puis reviens.",
  options: (p) => `Options pour ${p}`,
  signaler: "Signaler",
  motifProfil: "pseudo ou chiffres",
  motifTransformation: "transformation",
  signale: "Merci, le signalement est envoyé à ton coach.",
  hommes: "Hommes",
  femmes: "Femmes",
  toutLeMonde: "Tout le monde",
  // Athlète du mois et de l'année.
  athleteTitre: "👑 Athlète du mois et de l'année",
  athleteElu: (mois, pseudo, score) => `${mois} : ${pseudo} (${score})`,
  cestToi: " — c'est toi ! 🎉",
  athletePersonne: "Pas encore d'athlète du mois dans cette discipline.",
  athleteCourse: (mois) => `Course au titre de ${mois} :`,
  athleteVide: "Personne encore ce mois-ci : une performance notée ce mois te place en tête.",
  anneeTitre: "🏆 Athlète de l'année",
  anneeCourse: (annee) => `Course au titre ${annee} :`,
  anneeVide: "Personne encore cette année.",
  podium: (medaille, pseudo, score) => `${medaille} ${pseudo} · ${score}`,
  athleteRegle:
    "Le titre se joue sur les performances notées dans le mois, avec un score qui compare hommes et femmes et toutes les catégories : points IPF GL (force), Sinclair (haltérophilie), % du record du monde (course), points World Aquatics (natation).",
  // Mon profil.
  tonPseudo: "Ton pseudo :",
  masque: "Ton profil est masqué : deux clients l'ont signalé. Ton coach va regarder.",
  changerPseudo: "Changer de pseudo",
  annuler: "Annuler",
  supprimer: "Supprimer mon profil de la communauté",
  confirmerSupprimer: "Supprimer ton profil de la communauté ? Ton pseudo, tes chiffres et tes messages du mur sont effacés du serveur. Tes données restent sur ton téléphone.",
  supprime: "Ton profil de la communauté est supprimé.",
  // Transformations.
  transfoAccroche: "🔥 Partage ta transformation pour encourager les autres clients.",
  maTransformation: "Ma transformation",
  periodes: { j90: "90 derniers jours", annee: "Cette année" },
  transfoVide:
    "Note ton poids et ton % de masse grasse (et ta masse musculaire si ta balance la donne) dans l'onglet Mesures, au moins à 3 semaines d'écart. Pèse-toi dans les mêmes conditions : le matin, à jeun.",
  grasPublie: (v) => `🔥 −${virgule(v)} % de gras`,
  musclePublie: (v) => `💪 +${virgule(v)} kg de muscle`,
  enSemaines: (j) => `en ${Math.round(j / 7)} semaines`,
  perteHorsClassement: "Ta perte de gras reste sur ton téléphone : pour ta santé, elle n'entre pas dans les classements ni sur le mur.",
  rienAPartager: "Rien à partager pour l'instant sur cette période.",
  message: "Ce qui t'a aidé, un conseil, un merci…",
  partager: "Partager sur le mur",
  partage: "Ta transformation est partagée. Merci d'inspirer les autres !",
  murTitre: "Le mur des transformations",
  murVide: "Personne encore : sois le premier à partager ta transformation !",
  bravo: "👏 Bravo",
  bravos: (n) => `👏 ${n}`,
  supprimerPublication: "Supprimer",
  rienNePart: "Aucune photo ni aucun poids n'est envoyé : seulement ces chiffres et ton message."
};

export const MEDAILLES = { 1: "🥇", 2: "🥈", 3: "🥉" };
