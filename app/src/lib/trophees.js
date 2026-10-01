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
 */

import { addDays, num } from "./dates.js";
import { getMonday } from "./semaine.js";
import { semaineDifficileDe } from "./plan-semaine.js";

export const PALIERS_SEANCES = [
  { n: 1, titre: "Premier pas" },
  { n: 10, titre: "Lancé" },
  { n: 25, titre: "Régulier" },
  { n: 50, titre: "Club des 50" },
  { n: 100, titre: "Club des 100" },
  { n: 200, titre: "Club des 200" }
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

/**
 * Les trophees, obtenus ou a venir, avec la progression vers chacun.
 */
export function trophees({ seances, profil, semainesDifficiles, date }) {
  const total = (seances || []).filter((s) => s && s.date && s.date <= date).length;
  const series = seriesSemaines({ seances, profil, semainesDifficiles, date });
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
    }))
  ];
  return { total, series, liste };
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

/** Trophees obtenus pas encore montres au client, a celebrer. */
export function nouveauxTrophees(liste, vus) {
  const deja = new Set(vus || []);
  return (liste || []).filter((t) => t.obtenu && !deja.has(t.id));
}
