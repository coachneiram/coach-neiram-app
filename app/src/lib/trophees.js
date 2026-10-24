/**
 * Trophees et serie de semaines tenues : donner envie de continuer.
 *
 * Demande du coach (1er octobre 2026) : un systeme de recompenses pour que
 * les clients restent actifs, inspire de ce qui marche aux Etats-Unis.
 * Trois mecaniques eprouvees, adaptees a un debutant ou a un jeune papa :
 *
 * 1. LA SERIE DE SEMAINES (Peloton, « weekly streaks ») : on compte les
 *    semaines ou l'objectif de seances est tenu, pas les jours. Une serie
 *    quotidienne casse au premier enfant malade ; une serie hebdomadaire
 *    recompense exactement ce que le coach vend — proteger son creneau.
 * 2. LES PALIERS DE SEANCES (Orangetheory, Peloton « milestones ») : 1, 10,
 *    25, 50, 100, 200 seances. Orangetheory fete les 100 seances au club ;
 *    le coach peut faire de meme.
 * 3. LE JOKER (Duolingo, « streak freeze ») : une semaine declaree difficile
 *    reste tenue avec une seule seance maintien. C'est la promesse « Creneau
 *    Protege » : une semaine chargee ne remet pas tout a zero.
 *
 * Plus la regle « ne jamais rater deux fois » (James Clear, Atomic Habits) :
 * apres une semaine non tenue, la suivante est presentee comme celle qui
 * compte double.
 *
 * Les trophees se fondent sur le MEILLEUR historique, pas sur la serie en
 * cours : un trophee gagne ne se perd jamais.
 *
 * Demande du coach (2 octobre 2026) : des clients suivis depuis 2022
 * approchent les 1 000 seances. Les paliers de seances comptent donc AUSSI
 * les seances d'avant l'application saisies sur la carte de progres
 * (profil.seancesAvantApp), et montent jusqu'a 1 000 ; une famille
 * « anciennete » recompense le temps de suivi depuis le debut du coaching
 * (date saisie, sinon premiere seance notee).
 *
 * Mode de vie et tous sports (24 octobre 2026, repris des badges de l'app
 * Neiram, memes paliers que FAMILLES_BADGES) : Mon annee, Multisport,
 * Semaines actives (OMS), Programmes guides, Habitudes, L'ecole Neiram et
 * Niveau federal. Leurs compteurs viennent de lib/compteurs-trophees.js
 * (qui lit le stockage) et sont PASSES a trophees() : la fonction reste
 * pure. Sans compteurs, ces familles valent 0 et ne s'affichent pas (une
 * famille de ce type n'apparait qu'une fois commencee).
 *
 * Communaute Team Neiram (24 octobre 2026, accord du coach) : familles
 * « Classements », « Podiums du mois », « Athlète du mois » et « Athlète
 * de l'année » (lib/palmares.js), visibles une fois commencees.
 *
 * Defis entre amis (24 octobre 2026, accord du coach) : les defis passent
 * par le Worker du coach et sont reserves a ses clients. La famille
 * « Defis entre amis » (id « duels », memes paliers que l'app Neiram)
 * compte les defis gagnes (lib/defis-amis.js) ; comme les autres familles
 * mode de vie, elle n'apparait qu'une fois commencee.
 */

import { addDays, num } from "./dates.js";
import { getMonday } from "./semaine.js";
import { semaineDifficileDe } from "./plan-semaine.js";
import { debutSaisi, seancesAvant } from "./carte-progres.js";
import { etatContrat, tropheesContrat } from "./contrat.js";

export const PALIERS_SEANCES = [
  { n: 1, titre: "Premier pas" },
  { n: 10, titre: "Lancé" },
  { n: 25, titre: "Régulier" },
  { n: 50, titre: "Club des 50" },
  { n: 100, titre: "Club des 100" },
  { n: 200, titre: "Club des 200" },
  { n: 300, titre: "Club des 300" },
  { n: 500, titre: "Club des 500" },
  { n: 750, titre: "Club des 750" },
  { n: 1000, titre: "Club des 1000" }
];

/** Anciennete, en mois de suivi depuis le debut du coaching. */
export const PALIERS_ANCIENNETE = [
  { n: 1, titre: "1 mois de suivi" },
  { n: 3, titre: "3 mois de suivi" },
  { n: 6, titre: "6 mois de suivi" },
  { n: 12, titre: "1 an de suivi" },
  { n: 24, titre: "2 ans de suivi" },
  { n: 36, titre: "3 ans de suivi" },
  { n: 60, titre: "5 ans de suivi" }
];

export const PALIERS_SEMAINES = [
  { n: 2, titre: "Bien parti" },
  { n: 4, titre: "1 mois tenu" },
  { n: 8, titre: "2 mois tenus" },
  { n: 12, titre: "3 mois tenus" },
  { n: 26, titre: "6 mois tenus" },
  { n: 52, titre: "1 an tenu" }
];

/** Au-dela, remonter plus loin ne change plus aucun trophee. */
const SEMAINES_MAX = 110;

/** Objectif de seances par semaine : celui du profil, 2 a defaut. */
export function objectifHebdo(profil) {
  const v = Math.round(num(profil && (profil.weeklyWorkoutTarget || profil.sessionsPerWeek)));
  return v > 0 ? v : 2;
}

/**
 * Etat d'une semaine (cle = date du lundi).
 *
 * Tenue si l'objectif est atteint ; ou, semaine declaree difficile, si au
 * moins une seance a ete faite — c'est le joker.
 */
export function etatSemaine({ seances, cleSemaine, objectif, semainesDifficiles }) {
  const fin = addDays(cleSemaine, 6);
  const faites = (seances || []).filter((s) => s && s.date >= cleSemaine && s.date <= fin).length;
  const difficile = Boolean(semaineDifficileDe(semainesDifficiles, cleSemaine)?.active);
  const objectifTenu = faites >= objectif;
  const joker = !objectifTenu && difficile && faites >= 1;
  return { cleSemaine, faites, objectif, difficile, tenue: objectifTenu || joker, joker };
}

/**
 * Serie en cours et meilleure serie, en semaines tenues d'affilee.
 *
 * La semaine en cours ne casse jamais la serie : elle n'est pas finie. Elle
 * s'y ajoute des qu'elle est tenue.
 */
export function seriesSemaines({ seances, profil, semainesDifficiles, date }) {
  const objectif = objectifHebdo(profil);
  const lundi = getMonday(date);
  const etat = (cle) => etatSemaine({ seances, cleSemaine: cle, objectif, semainesDifficiles });
  const enCours = etat(lundi);

  // Serie en cours : semaines terminees tenues d'affilee, plus la semaine en
  // cours si elle est deja tenue.
  let serie = enCours.tenue ? 1 : 0;
  let cle = addDays(lundi, -7);
  let derniere = null;
  for (let k = 0; k < SEMAINES_MAX; k++) {
    const e = etat(cle);
    if (k === 0) derniere = e;
    if (!e.tenue) break;
    serie++;
    cle = addDays(cle, -7);
  }

  // Meilleure serie depuis la premiere seance.
  const premiere = (seances || []).map((s) => s && s.date).filter(Boolean).sort()[0];
  let meilleure = serie;
  if (premiere) {
    let courante = 0;
    let c = getMonday(premiere);
    for (let k = 0; k < SEMAINES_MAX * 3 && c <= lundi; k++) {
      const e = etat(c);
      courante = e.tenue ? courante + 1 : 0;
      if (courante > meilleure) meilleure = courante;
      c = addDays(c, 7);
    }
  }

  // Le client avait-il deja commence avant cette semaine ? Sans cela, un
  // nouveau client se verrait reprocher une « semaine ratee » avant meme
  // sa premiere seance.
  const aDejaCommence = Boolean(premiere && premiere < lundi);

  return { objectif, serie, meilleure, enCours, semainePrecedente: derniere, aDejaCommence };
}

/** Mois entiers ecoules entre deux dates ISO (le 15 mars au 14 avril : 0). */
export function moisEcoules(debut, date) {
  const [a1, m1, j1] = String(debut).split("-").map(Number);
  const [a2, m2, j2] = String(date).split("-").map(Number);
  const n = (a2 - a1) * 12 + (m2 - m1) - (j2 < j1 ? 1 : 0);
  return Math.max(0, n);
}

/**
 * Debut du suivi pour l'anciennete : la date saisie par le client sur la
 * carte de progres, sinon sa premiere seance notee ; null sans l'une ni
 * l'autre.
 */
export function debutDuSuivi({ seances, profil, date }) {
  const saisi = debutSaisi(profil, date);
  if (saisi) return saisi;
  const premiere = (seances || []).map((s) => s && s.date).filter((d) => d && d <= date).sort()[0];
  return premiere || null;
}

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** Noms des niveaux d'une famille « mode de vie », du premier au dernier. */
export const NIVEAUX_TROPHEES = ["Bronze", "Argent", "Or", "Platine", "Diamant", "Légende", "Mythique", "Immortel"];

/** Marches du trophee « Niveau federal » (lib/niveaux.js, marcheFederale). */
const MARCHES_FEDERALES = ["régional", "national", "international"];

/**
 * Familles reprises des badges de l'app Neiram (lib/badges.js,
 * FAMILLES_BADGES), avec les memes paliers. `compteur` : le champ de
 * `compteurs` passe a trophees().
 */
export const FAMILLES_MODE_DE_VIE = [
  { id: "annee", titre: "Mon année", icone: "📅", unite: (n) => `${n} séances dans une même année`, paliers: [12, 26, 52, 100, 150, 200, 250] },
  { id: "sports", titre: "Multisport", icone: "🏅", unite: (n) => `${n} sports différents`, paliers: [2, 3, 5, 8, 12] },
  { id: "actif", titre: "Semaines actives", icone: "🌿", unite: (n) => `${pluriel(n, "semaine")} à 150 min (OMS)`, paliers: [1, 4, 12, 26, 52] },
  { id: "programmes", titre: "Programmes guidés", icone: "🎯", unite: (n) => `${pluriel(n, "programme")} terminé${n > 1 ? "s" : ""}`, paliers: [1, 2, 3] },
  { id: "habitudes", titre: "Habitudes", icone: "🌱", unite: (n) => `${n} jours d'affilée sur une habitude`, paliers: [3, 7, 21, 66, 100, 365] },
  { id: "lecons", titre: "L'école Neiram", icone: "🎓", unite: (n) => pluriel(n, "leçon"), paliers: [1, 7, 14, 28] },
  { id: "niveauFederal", titre: "Niveau fédéral", icone: "🎖️", unite: (n) => `Niveau ${MARCHES_FEDERALES[n - 1]} dans une discipline`, paliers: [1, 2, 3] },
  { id: "duels", titre: "Défis entre amis", icone: "⚔️", unite: (n) => `${pluriel(n, "défi")} gagné${n > 1 ? "s" : ""} entre amis`, paliers: [1, 3, 10, 25] },
  // Communaute Team Neiram (24 octobre 2026) : memes paliers que les
  // badges de l'app Neiram (lib/badges.js). « Classements » : top 50 % a
  // top 1 % d'un classement d'au moins 10 clients (lib/palmares.js).
  { id: "topClassement", titre: "Classements", icone: "📊", unite: (n) => `Top ${100 - n} % d'un classement`, paliers: [50, 75, 90, 95, 99] },
  { id: "podiums", titre: "Podiums du mois", icone: "🥉", unite: (n) => `${pluriel(n, "podium")} du mois`, paliers: [1, 3, 6, 12] },
  { id: "athleteMois", titre: "Athlète du mois", icone: "👑", unite: (n) => `${pluriel(n, "titre")} d'athlète du mois`, paliers: [1, 2, 3, 6, 12] },
  { id: "athleteAnnee", titre: "Athlète de l'année", icone: "🏆", unite: (n) => `${pluriel(n, "titre")} d'athlète de l'année`, paliers: [1, 2, 3] }
];

/** Compteurs a 0 : l'etat d'un client qui n'a rien commence. */
export const COMPTEURS_VIDES = Object.fromEntries(FAMILLES_MODE_DE_VIE.map((f) => [f.id, 0]));

/** Trophees des familles « mode de vie », a partir des compteurs. */
export function tropheesModeDeVie(compteurs = COMPTEURS_VIDES) {
  const liste = [];
  for (const f of FAMILLES_MODE_DE_VIE) {
    const valeur = Math.max(0, num(compteurs && compteurs[f.id]));
    f.paliers.forEach((n, i) => {
      liste.push({
        id: `${f.id}-${n}`,
        famille: f.id,
        icone: f.icone,
        titre: `${f.titre} ${NIVEAUX_TROPHEES[i]}`,
        detail: f.unite(n),
        obtenu: valeur >= n,
        progression: `${Math.min(valeur, n)}/${n}`,
        valeur
      });
    });
  }
  return liste;
}

/**
 * Les trophees, obtenus ou a venir, avec la progression vers chacun.
 *
 * `total` : seances notees dans l'application plus celles d'avant ;
 * `totalApp` : seances notees dans l'application seulement.
 */
export function trophees({ seances, profil, semainesDifficiles, date, compteurs = COMPTEURS_VIDES }) {
  const totalApp = (seances || []).filter((s) => s && s.date && s.date <= date).length;
  const total = totalApp + seancesAvant(profil);
  const series = seriesSemaines({ seances, profil, semainesDifficiles, date });
  const debut = debutDuSuivi({ seances, profil, date });
  const mois = debut ? moisEcoules(debut, date) : 0;
  const liste = [
    ...PALIERS_SEANCES.map((p) => ({
      id: `seances-${p.n}`,
      famille: "seances",
      titre: p.titre,
      detail: `${p.n} séance${p.n > 1 ? "s" : ""}`,
      obtenu: total >= p.n,
      progression: `${Math.min(total, p.n)}/${p.n}`
    })),
    ...PALIERS_SEMAINES.map((p) => ({
      id: `semaines-${p.n}`,
      famille: "semaines",
      titre: p.titre,
      detail: `${p.n} semaines d'affilée`,
      obtenu: series.meilleure >= p.n,
      progression: `${Math.min(series.meilleure, p.n)}/${p.n}`
    })),
    ...PALIERS_ANCIENNETE.map((p) => ({
      id: `anciennete-${p.n}`,
      famille: "anciennete",
      titre: p.titre,
      detail: p.n % 12 === 0 ? `Suivi depuis ${pluriel(p.n / 12, "an")}` : `Suivi depuis ${p.n} mois`,
      obtenu: Boolean(debut) && mois >= p.n,
      progression: `${Math.min(mois, p.n)}/${p.n} mois`
    })),
    ...tropheesContrat(etatContrat({ profil, seances, date })),
    ...tropheesModeDeVie({ ...COMPTEURS_VIDES, ...(compteurs || {}) })
  ];
  return { total, totalApp, mois, debut, series, liste };
}

/**
 * Le message de la semaine en cours : ce qu'il reste a faire, ou le rappel
 * « ne jamais rater deux fois » quand la semaine precedente n'a pas ete
 * tenue. Rend null quand il n'y a rien d'utile a dire.
 */
export function messageSemaine({ serie, enCours, semainePrecedente, aDejaCommence }) {
  const reste = Math.max(0, enCours.objectif - enCours.faites);
  if (enCours.tenue) {
    return enCours.joker
      ? "Semaine difficile, et pourtant tenue grâce à ta séance maintien. C'est ça, protéger son créneau."
      : `Semaine tenue : ${enCours.faites}/${enCours.objectif} séances. Ta série passe à ${serie} semaine${serie > 1 ? "s" : ""}.`;
  }
  const seance = `${reste} séance${reste > 1 ? "s" : ""}`;
  if (aDejaCommence && semainePrecedente && !semainePrecedente.tenue) {
    return `La semaine dernière n'a pas été tenue. La règle des sportifs qui durent : ne jamais rater deux semaines de suite. Encore ${seance} cette semaine.`;
  }
  if (serie > 0) {
    return `Encore ${seance} cette semaine pour porter ta série à ${serie + 1} semaine${serie + 1 > 1 ? "s" : ""}.`;
  }
  return `Encore ${seance} cette semaine pour lancer ta série.`;
}

/** Ordre et titre des familles a l'ecran. */
export const FAMILLES_TROPHEES = [
  { id: "seances", titre: "Séances" },
  { id: "semaines", titre: "Semaines tenues d'affilée" },
  { id: "anciennete", titre: "Ancienneté" },
  { id: "contrat", titre: "Contrat en cours" },
  ...FAMILLES_MODE_DE_VIE.map((f) => ({ id: f.id, titre: f.titre, siCommencee: true }))
];

/** Familles ajoutees le 24/10/2026 (celebration : voir vusAvecModeDeVie). */
export const IDS_FAMILLES_MODE_DE_VIE = FAMILLES_MODE_DE_VIE.map((f) => f.id);

/**
 * Les tuiles a afficher : dans chaque famille, les trophees obtenus puis le
 * PROCHAIN a gagner seulement. Avec les paliers jusqu'a 1 000 seances et
 * 5 ans de suivi, tout montrer ferait une grille de 23 tuiles surtout
 * grisees.
 *
 * Une famille « mode de vie » (siCommencee) n'apparait qu'une fois
 * commencee : un debutant n'a pas sept familles a zero sous les yeux.
 */
export function tropheesAffiches(liste) {
  return FAMILLES_TROPHEES.map((f) => {
    const siens = (liste || []).filter((t) => t.famille === f.id);
    if (f.siCommencee && !siens.some((t) => num(t.valeur) > 0)) return { ...f, tuiles: [] };
    const obtenus = siens.filter((t) => t.obtenu);
    const prochain = siens.find((t) => !t.obtenu);
    return { ...f, tuiles: prochain ? [...obtenus, prochain] : obtenus };
  }).filter((f) => f.tuiles.length);
}

/**
 * Marque posee dans « cn_trophees_vus » une fois les familles « mode de
 * vie » prises en compte.
 */
export const MARQUE_MODE_DE_VIE = "familles-mode-de-vie";

/**
 * Celebration des familles ajoutees le 24/10/2026. Chez un client existant,
 * leurs trophees seraient « obtenus » d'un coup (une annee a 52 seances,
 * trois sports…) et la celebration en listerait une dizaine. Au premier
 * calcul, ceux deja obtenus sont donc marques vus sans fete ; ensuite,
 * chaque nouveau palier est celebre normalement. Les familles d'avant
 * (seances, semaines, anciennete, contrat) ne changent pas.
 *
 * Rend la liste des vus a enregistrer, ou null si rien ne change.
 */
export function vusAvecModeDeVie(liste, vus) {
  const deja = Array.isArray(vus) ? vus : [];
  if (deja.includes(MARQUE_MODE_DE_VIE)) return null;
  const familles = new Set(IDS_FAMILLES_MODE_DE_VIE);
  const silencieux = (liste || []).filter((t) => t.obtenu && familles.has(t.famille)).map((t) => t.id);
  return [...new Set([...deja, ...silencieux, MARQUE_MODE_DE_VIE])];
}

/** Trophees obtenus pas encore montres au client, a celebrer. */
export function nouveauxTrophees(liste, vus) {
  const deja = new Set(vus || []);
  return (liste || []).filter((t) => t.obtenu && !deja.has(t.id));
}
