/**
 * Feu Vert : coaching collectif en ligne pour débutants en salle
 * (cohortes de 12, cycles de 6 semaines, cohorte 1 le lundi 18 janvier 2027).
 *
 * PAS UNE NOUVELLE APPLICATION : un mode de celle-ci, activé dans le profil
 * (« Formule : Feu Vert (collectif) »). Il ajoute un onglet « Feu Vert » et
 * allège la barre du bas (lib/onglets.js, ongletsPour).
 *
 * CE QUI VIENT DU COACH (lecture seule ici) : le Passeport (rouge / orange /
 * vert de chacun des 8 gestes) et les missions validées. Marien les fixe dans
 * l'Espace coach ; le Worker les sert à le membre identifiée par son
 * code d'accès (POST /feuvert/etat). Dernière valeur reçue gardée sur le
 * téléphone : hors ligne, l'écran montre le Passeport tel qu'il était à la
 * dernière synchro, avec sa date.
 *
 * CE QUI VIENT DE LA PARTICIPANTE : séances pointées (le pointage habituel,
 * étiqueté `feuVert`), missions qu'elle déclare faites, check-in du lundi
 * (envoyé au classeur du coach, type checkin_feu_vert), accord et pseudo du
 * tableau de régularité.
 *
 * JAMAIS dans ce mode : poids corporel, photo physique, promesse de résultat.
 * Le niveau mesure la technique, rien d'autre.
 */

import { CONTENU_FEU_VERT } from "./feu-vert-contenu.js";
import { addDays, parseISO } from "./dates.js";
import { dayIdOf } from "./semaine.js";
import { charger, enregistrer } from "./stockage.js";
import { PROXY_BASE_URL, lienWhatsappCoach } from "./config.js";
import { enTetesAcces, accesActuel } from "./acces.js";
import { ETATS_GESTE, NIVEAUX_PASSEPORT, etatGeste, niveauPasseport } from "./feu-vert-passeport.js";

export { ETATS_GESTE, NIVEAUX_PASSEPORT, etatGeste, niveauPasseport };

export { CONTENU_FEU_VERT };

export const FORMULE_FEU_VERT = "feuvert";
export const DEBUT_COHORTE_1 = "2027-01-18";
export const NB_SEMAINES = 6;

export const FORMULES = [
  { id: "", label: "Coaching individuel" },
  { id: FORMULE_FEU_VERT, label: "Feu Vert (collectif)" }
];

export const PARCOURS_FEU_VERT = [
  { id: "reprise", label: "Reprise", aide: "Jamais pratiqué, ou arrêt depuis plus d'un an." },
  { id: "basesplus", label: "Bases+", aide: "Moins de 6 mois de pratique." }
];

export const feuVertActif = (profil) => !!profil && profil.formule === FORMULE_FEU_VERT;

/** Réglages Feu Vert du profil, avec les valeurs de la cohorte 1 par défaut. */
export function reglagesFeuVert(profil) {
  const fv = (profil && profil.feuVert) || {};
  return {
    parcours: fv.parcours === "basesplus" ? "basesplus" : "reprise",
    cohorte: String(fv.cohorte || "1"),
    debut: /^\d{4}-\d{2}-\d{2}$/.test(String(fv.debut || "")) ? fv.debut : DEBUT_COHORTE_1
  };
}

export const libelleParcours = (id) => (PARCOURS_FEU_VERT.find((p) => p.id === id) || PARCOURS_FEU_VERT[0]).label;

/* ------------------------------------------------------------------ */
/* Calendrier                                                          */
/* ------------------------------------------------------------------ */

const joursEntre = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);

/**
 * Où en est le cycle ? { etat: "avant" | "en-cours" | "termine", numero
 * (1 à 6, borné), joursAvant }.
 */
export function semaineFeuVert(debut, aujourdhui) {
  const ecart = joursEntre(debut, aujourdhui);
  if (ecart < 0) return { etat: "avant", numero: 1, joursAvant: -ecart };
  const n = Math.floor(ecart / 7) + 1;
  if (n > NB_SEMAINES) return { etat: "termine", numero: NB_SEMAINES, joursAvant: 0 };
  return { etat: "en-cours", numero: n, joursAvant: 0 };
}

/** Lundi et dimanche de la semaine n du cycle. */
export const datesSemaine = (debut, n) => ({ du: addDays(debut, 7 * (n - 1)), au: addDays(debut, 7 * (n - 1) + 6) });

export const semaineContenu = (n) => CONTENU_FEU_VERT.semaines.find((s) => s.numero === n) || null;

/* ------------------------------------------------------------------ */
/* Passeport                                                           */
/* ------------------------------------------------------------------ */

export const gesteParId = (id) => CONTENU_FEU_VERT.gestes.find((g) => g.id === id) || null;

export const chargeBloquee = (etat) => etat !== "vert";

/* ------------------------------------------------------------------ */
/* Programme et pointage                                               */
/* ------------------------------------------------------------------ */

/** Séance A, B ou bonus d'une semaine, dans le parcours choisi. */
export function seanceFeuVert(n, lettre, parcours) {
  const s = semaineContenu(n);
  if (!s) return null;
  if (lettre === "bonus") {
    if (!s.bonus) return null;
    return {
      titre: s.bonus.titre,
      texte: s.bonus.texte || null,
      blocs: (s.bonus.blocs || []).map((b) => ({ bloc: b.bloc, volume: parcours === "basesplus" ? b.basesplus : b.reprise }))
    };
  }
  const liste = s[lettre];
  if (!liste) return null;
  return {
    titre: "Séance " + lettre,
    exercices: liste.map((e) => ({ ...e, series: parcours === "basesplus" ? e.basesplus : e.reprise }))
  };
}

export const seancesDisponibles = (n) => (semaineContenu(n)?.bonus ? ["A", "B", "bonus"] : ["A", "B"]);

/** Séances Feu Vert pointées pour une semaine du cycle (de cette cohorte). */
export function pointagesSemaine(seances, n, cohorte) {
  const sortie = { A: null, B: null, bonus: null };
  for (const s of seances || []) {
    const fv = s && s.feuVert;
    if (!fv || fv.semaine !== n || String(fv.cohorte) !== String(cohorte)) continue;
    if (fv.seance in sortie && !sortie[fv.seance]) sortie[fv.seance] = s;
  }
  return sortie;
}

/** Compteurs d'une semaine : séances A/B (max 2) et bonus (S4-S6). */
export function compteSemaine(seances, n, cohorte) {
  const p = pointagesSemaine(seances, n, cohorte);
  return { seances: (p.A ? 1 : 0) + (p.B ? 1 : 0), bonus: n >= 4 && p.bonus ? 1 : 0 };
}

/**
 * Séance pointée : la séance enregistrée (même forme que le pointage de
 * l'écran Séances) et l'événement « pointage » pour le coach.
 */
export function pointageFeuVert({ date, heure = "", semaine, lettre, reglages, charges = {} }) {
  const s = lettre === "bonus" ? null : semaineContenu(semaine)?.[lettre] || [];
  const detailCharges = (s || [])
    .filter((e) => e.geste && charges[e.geste])
    .map((e) => (gesteParId(e.geste)?.nom.split(" (")[0] || e.geste) + " " + charges[e.geste] + " kg")
    .join(", ");
  const libelle = "Feu Vert S" + semaine + " · " + (lettre === "bonus" ? "séance bonus" : "séance " + lettre) + " · " + libelleParcours(reglages.parcours);
  const note = libelle + (detailCharges ? " · charges : " + detailCharges : "");
  return {
    seance: {
      date,
      routineId: null,
      source: "feuvert",
      startTime: heure,
      durationMin: lettre === "bonus" ? 45 : 50,
      rpe: "",
      notes: note,
      pains: [],
      exercises: [],
      feuVert: { semaine, seance: lettre, cohorte: reglages.cohorte, parcours: reglages.parcours }
    },
    evenement: { type: "pointage", date, creneau: "Feu Vert", lieu: "", heureReelle: heure, dureeMin: lettre === "bonus" ? 45 : 50, rpe: "", note }
  };
}

export const REGLES_FEU_VERT = {
  bloquee: "Charge bloquée tant que le geste n'est pas vert.",
  rougeOrange: "Geste rouge ou orange : la charge ne bouge pas. Tu progresses en appliquant la correction de Marien (amplitude, placement, tempo).",
  vert: "Geste vert : double progression. Haut de la fourchette réussi sur toutes tes séries, technique propre : +1 cran à la séance suivante, maximum 1 augmentation par geste et par semaine.",
  effort: "Effort : jamais au-delà de 8 sur 10. Si la technique se dégrade, la série est finie.",
  tempo: "Tempo 3-1-1 pour les gestes rouges et orange, 2-1-1 pour les gestes verts.",
  douleur: "Douleur dans une articulation, vive ou qui augmente : arrête l'exercice, passe à la version facilitée et signale-le dans ton check-in. Feu Vert ne remplace pas un avis médical ou kiné.",
  chargeDepart: "Semaine 1 : prends une charge avec laquelle tu pourrais faire 15 répétitions propres, fais-en 10, et note-la ici : c'est ta charge bloquée."
};

/**
 * Séance de la semaine filmée par Marien (lien saisi dans l'Espace coach,
 * par cohorte et par semaine). null si pas de lien : rien n'est affiché.
 */
export function videoDeLaSemaine(serveur, n) {
  const u = serveur && serveur.videos && serveur.videos[String(n)];
  return typeof u === "string" && /^https:\/\//.test(u) ? u : null;
}

/* ------------------------------------------------------------------ */
/* Vidéos de correction (WhatsApp)                                     */
/* ------------------------------------------------------------------ */

export const TEXTES_VIDEO = {
  bouton: "Envoyer ma vidéo sur WhatsApp",
  plafond: "2 vidéos maximum par semaine (du lundi 0 h au dimanche 23 h 59), non reportables. Réponse de Marien sous 48 h ouvrées, sur WhatsApp.",
  format: "1 geste par vidéo, 2 séries consécutives, 90 s maximum, téléphone posé. Légende : Geste n° / Parcours / Charge / Effort (1-10) / 1 question.",
  pasDeVideo: "Vidéo de démonstration bientôt disponible."
};

/** Lien WhatsApp vers le numéro pro de Marien (lib/config.js), message pré-rempli. */
export const lienVideoWhatsapp = (geste, semaine) =>
  lienWhatsappCoach("Feu Vert — vidéo " + (geste ? geste.nom.split(" (")[0] : "") + ", semaine " + semaine);

/* ------------------------------------------------------------------ */
/* Missions et module mental                                           */
/* ------------------------------------------------------------------ */

/** Missions au programme de la semaine (S2 : rattrapage de la 1 ; S6 : toutes celles non validées). */
export function missionsDeLaSemaine(n, validees = {}) {
  if (n >= 6) return [1, 2, 3, 4].filter((m) => !validees[String(m)]);
  return { 1: [1], 2: [1], 3: [2], 4: [3], 5: [4] }[n] || [];
}

export const missionParNumero = (n) => CONTENU_FEU_VERT.missions.find((m) => m.numero === n) || null;
export const moduleDeLaSemaine = (n) => CONTENU_FEU_VERT.modules.find((m) => m.semaine === n) || null;

/* ------------------------------------------------------------------ */
/* Mémoire locale (incluse dans la sauvegarde : préfixe cn_)            */
/* ------------------------------------------------------------------ */

export const CLE_FEU_VERT = "cn_feu_vert";

export function lireFeuVert() {
  const v = charger(CLE_FEU_VERT, null);
  const o = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  return {
    missionsFaites: o.missionsFaites || {},
    checkins: o.checkins || {},
    charges: o.charges || {},
    tableau: o.tableau || { accord: false, pseudo: "" },
    serveur: o.serveur || null,
    tableauServeur: o.tableauServeur || null
  };
}

export function majFeuVert(modif) {
  const suivant = { ...lireFeuVert(), ...modif };
  enregistrer(CLE_FEU_VERT, suivant);
  return suivant;
}

/* ------------------------------------------------------------------ */
/* Check-in du lundi                                                   */
/* ------------------------------------------------------------------ */

export const estLundi = (date) => dayIdOf(date) === "mon";

/**
 * Semaine sur laquelle porte le check-in : la semaine écoulée. Premier
 * check-in le lundi de la semaine 2 ; le dernier (semaine 6) le lundi qui
 * suit la fin du cycle. Avant le cycle et en semaine 1 : aucun.
 */
export function semaineDuCheckin(debut, aujourdhui) {
  const ecart = joursEntre(debut, aujourdhui);
  if (ecart < 7) return null;
  const n = Math.floor(ecart / 7);
  return n > NB_SEMAINES ? (ecart < 7 * NB_SEMAINES + 7 ? NB_SEMAINES : null) : n;
}

/** Bandeau du lundi : check-in de la semaine écoulée pas encore envoyé. */
export function checkinAttendu(debut, aujourdhui, checkins = {}) {
  const n = semaineDuCheckin(debut, aujourdhui);
  return !!n && estLundi(aujourdhui) && !checkins[String(n)];
}

/** Événement checkin_feu_vert (relayé par /coach-sync vers le classeur du coach). */
export function evenementCheckin({ semaine, seances, bonus, victoire, blocage, missions, reglages, aujourdhui }) {
  const lignes = ["Feu Vert S" + semaine + " · séances " + seances + "/2"];
  if (semaine >= 4) lignes.push("bonus : " + (bonus ? "oui" : "non"));
  for (const m of missions || []) lignes.push("Mission " + m.numero + " : " + (m.faite ? "faite" : "pas faite"));
  return {
    type: "checkin_feu_vert",
    date: aujourdhui,
    weekKey: datesSemaine(reglages.debut, semaine).du,
    creneau: "Feu Vert cohorte " + reglages.cohorte + " · " + libelleParcours(reglages.parcours),
    message: lignes.join(" · "),
    note: "Victoire : " + String(victoire || "").trim(),
    motif: "Blocage : " + String(blocage || "").trim()
  };
}

/* ------------------------------------------------------------------ */
/* Tableau de régularité                                               */
/* ------------------------------------------------------------------ */

/** Points d'une semaine : 1 par séance (max 2), 1 bonus (S4-S6), 1 check-in, 2 par mission validée. */
export function pointsSemaine(n, compteurs = {}, missions = {}) {
  const c = compteurs || {};
  const missionsSemaine = Object.values(missions || {}).filter((m) => m && m.semaine === n).length;
  return Math.min(2, Number(c.seances) || 0) + (n >= 4 ? Math.min(1, Number(c.bonus) || 0) : 0) + Math.min(1, Number(c.checkin) || 0) + 2 * missionsSemaine;
}

export const pointsMax = (n) => (n >= 4 ? 6 : 5);

/** Semaines consécutives à 2 séances, en remontant depuis `jusqua`. */
export function serie(semaines = {}, jusqua) {
  let n = 0;
  for (let s = jusqua; s >= 1; s--) {
    if ((Number(semaines[String(s)]?.seances) || 0) >= 2) n++;
    else break;
  }
  return n;
}

/** Ligne affichée : points de la semaine, cumul, série. */
export function ligneRegularite({ semaines = {}, missions = {} }, n) {
  let cumul = 0;
  for (let s = 1; s <= n; s++) cumul += pointsSemaine(s, semaines[String(s)], missions);
  // Série : semaine en cours comprise si elle compte déjà 2 séances, sinon jusqu'à la précédente.
  const enCours = (Number(semaines[String(n)]?.seances) || 0) >= 2;
  return { semaine: pointsSemaine(n, semaines[String(n)], missions), cumul, serie: serie(semaines, enCours ? n : n - 1) };
}

/** Compteurs de le membre, à publier (si accord) et à afficher. */
export function mesSemaines({ seances, checkins = {}, reglages, jusqua }) {
  const sortie = {};
  for (let n = 1; n <= Math.min(jusqua, NB_SEMAINES); n++) {
    sortie[String(n)] = { ...compteSemaine(seances, n, reglages.cohorte), checkin: checkins[String(n)] ? 1 : 0 };
  }
  return sortie;
}

/** Tableau trié par ordre alphabétique des pseudos (jamais par points). */
export const trierTableau = (lignes) => [...(lignes || [])].sort((a, b) => String(a.pseudo).localeCompare(String(b.pseudo), "fr", { sensitivity: "base" }));

/* ------------------------------------------------------------------ */
/* Échanges avec le Worker                                             */
/* ------------------------------------------------------------------ */

export const MSG_FEU_VERT = {
  "sans-acces": "Entre le code d'accès donné par Marien (Mon profil & réglages) pour recevoir ton Passeport.",
  "non-inscrit": "Ton inscription dans la cohorte n'est pas encore enregistrée : ton Passeport apparaîtra dès que Marien l'aura faite.",
  "pseudo-pris": "Ce pseudo est déjà pris dans ta cohorte : choisis-en un autre.",
  "pseudo-longueur": "Pseudo : entre 2 et 20 caractères.",
  "pseudo-caracteres": "Pseudo : lettres, chiffres, espace, tiret ou point seulement.",
  "pseudo-refuse": "Ce pseudo n'est pas accepté : choisis-en un autre.",
  reseau: "Pas de connexion : dernière version connue affichée.",
  indisponible: "Serveur momentanément indisponible : dernière version connue affichée."
};

async function appeler(chemin, corps, env) {
  if (!accesActuel(env)) throw new Error("sans-acces");
  let r;
  try {
    r = await env.fetch(PROXY_BASE_URL + chemin, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...enTetesAcces(env) },
      body: JSON.stringify(corps || {})
    });
  } catch (e) {
    throw new Error("reseau");
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) throw new Error(MSG_FEU_VERT[d.error] ? d.error : "indisponible");
  return d;
}

/**
 * Passeport et missions validées, du serveur ; gardés sur le téléphone
 * (dernière valeur connue). En cas d'échec, rend la copie locale et
 * l'erreur.
 */
export async function actualiserPasseport(env = globalThis, maintenant = new Date()) {
  try {
    const d = await appeler("/feuvert/etat", {}, env);
    const serveur = { inscrit: !!d.inscrit, cohorte: d.cohorte || null, passeport: d.passeport || {}, missions: d.missions || {}, videos: d.videos || {}, majLe: d.majLe || null, recuLe: maintenant.toISOString() };
    majFeuVert({ serveur });
    return { serveur, erreur: d.inscrit ? null : "non-inscrit" };
  } catch (e) {
    return { serveur: lireFeuVert().serveur, erreur: e.message };
  }
}

/**
 * Publie (accord true) ou retire (accord false) sa ligne, ou lit seulement
 * (accord null), et rend le tableau de la cohorte.
 */
export async function synchroniserTableau({ accord = null, pseudo, semaines } = {}, env = globalThis, maintenant = new Date()) {
  try {
    const corps = accord === true ? { accord: true, pseudo, semaines } : accord === false ? { accord: false } : {};
    const d = await appeler("/feuvert/tableau", corps, env);
    const tableauServeur = { accord: !!d.accord, pseudo: d.pseudo || null, lignes: trierTableau(d.tableau || []), recuLe: maintenant.toISOString() };
    majFeuVert({ tableauServeur });
    return { tableauServeur, erreur: null };
  } catch (e) {
    return { tableauServeur: lireFeuVert().tableauServeur, erreur: e.message };
  }
}
