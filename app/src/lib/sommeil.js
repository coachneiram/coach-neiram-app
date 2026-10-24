/**
 * Sommeil et stress : conseils et moyennes.
 *
 * Le calcul est sorti du composant d'affichage pour pouvoir etre teste
 * directement. Les seuils viennent de index.html (lignes 2783-2830) ; les
 * textes ont ete revus le 24/10/2026 d'apres les meilleures preuves
 * disponibles (lib/sommeil-preuves.js donne la source de chacun).
 */

import { addDays, avg, round, todayISO } from "./dates.js";

export const CONSEILS_SOMMEIL = {
  duree: [
    "Lève-toi à la même heure chaque jour, week-end compris : un sommeil régulier est associé à une meilleure santé, presque autant que sa durée.",
    "Vise au moins 7 h par nuit (8 à 10 h entre 16 et 17 ans) : c'est le repère des sociétés savantes du sommeil.",
    "Avance ton coucher par paliers de 15 min, pas d'un coup."
  ],
  qualite: [
    "Dernier café au moins 8 à 9 h avant le coucher (13 h pour un pré-workout très dosé) : plus tard, il te coûte environ 45 min de sommeil.",
    "Le soir, lumière tamisée et moins d'écrans les 2 à 3 dernières heures ; une chambre la plus noire possible.",
    "Évite l'alcool le soir : dès 2 verres, il perturbe le sommeil paradoxal.",
    "Séance très intense : termine-la au moins 4 h avant de dormir. Une séance modérée le soir ne gêne pas le sommeil."
  ],
  general: [
    "Prends la lumière du jour le matin et dans la journée : elle cale ton horloge interne et t'aide à t'endormir le soir.",
    "Le lit sert à dormir : si le sommeil ne vient pas au bout d'environ 20 min, lève-toi, fais quelque chose de calme sous une lumière douce, et reviens quand il arrive.",
    "Un bain ou une douche chaude 1 à 2 h avant le coucher aide à s'endormir plus vite (environ 10 min de gagnées)."
  ]
};

export const CONSEILS_STRESS = {
  eleve: [
    "Respiration lente 5 min par jour, par exemple le soupir cyclique : deux inspirations par le nez, une longue expiration par la bouche.",
    "Bouge : 150 min d'activité par semaine réduisent nettement stress, anxiété et déprime ; même 10 à 15 min de marche dehors aident.",
    "Protège ton sommeil : mieux dormir fait partie des leviers les plus solides contre le stress et l'anxiété."
  ],
  general: [
    "Essaie la pleine conscience (programme type MBSR, cours ou appli) : elle réduit la détresse chez les adultes en bonne santé.",
    "Passe environ 2 h par semaine dans la nature, en une ou plusieurs fois.",
    "Garde du temps pour tes proches : les liens sociaux sont associés à une meilleure santé et à une vie plus longue."
  ]
};

/** Moyennes sur les sept derniers jours (aujourd'hui inclus). */
export function moyennes7Jours(entrees, aujourdhui = todayISO()) {
  const debut = addDays(aujourdhui, -6);
  const last7 = (entrees || []).filter((f) => f.date >= debut);
  const moyenne = (champ) => {
    const vals = last7.filter((f) => f[champ] != null).map((f) => f[champ]);
    return vals.length ? round(avg(vals), 1) : null;
  };
  return { heures: moyenne("sleepHours"), qualite: moyenne("sleepQuality"), stress: moyenne("stress") };
}

/**
 * Conseils sommeil : on ajoute d'abord ceux qui repondent au probleme
 * constate, puis on complete avec les generaux jusqu'a trois au total.
 */
export function conseilsSommeil({ heures, qualite }, objectifHeures) {
  const conseils = [];
  if (heures != null && heures < objectifHeures - 0.5) conseils.push(...CONSEILS_SOMMEIL.duree.slice(0, 2));
  if (qualite != null && qualite < 3.5) conseils.push(...CONSEILS_SOMMEIL.qualite.slice(0, 2));
  CONSEILS_SOMMEIL.general.forEach((t) => {
    if (conseils.length < 3) conseils.push(t);
  });
  return conseils;
}

/** Au-dela de 6/10 de stress moyen, on passe aux conseils cibles. */
export function conseilsStress(stressMoyen) {
  return stressMoyen != null && stressMoyen >= 6
    ? [...CONSEILS_STRESS.eleve]
    : [CONSEILS_STRESS.eleve[0], ...CONSEILS_STRESS.general.slice(0, 2)];
}

/** Nuits renseignees, de la plus recente a la plus ancienne. */
export const nuitsEnregistrees = (entrees) =>
  [...(entrees || [])]
    .filter((f) => f.sleepHours != null || f.sleepQuality != null || f.bedTime)
    .sort((a, b) => b.date.localeCompare(a.date));

/** Cinq dernieres raisons de stress notees par le client. */
export const notesDeStress = (entrees) =>
  [...(entrees || [])]
    .filter((f) => f.stressNote)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

/**
 * Duree de sommeil entre une heure de coucher et une heure de lever.
 *
 * Portage fidele de computeSleepHours (index.html, ligne ~430).
 *
 * Le passage de minuit est la subtilite : coucher a 23 h 30, lever a
 * 6 h 45 donne un ecart negatif, auquel il faut ajouter une journee. Et
 * deux heures identiques ne signifient pas « 24 h de sommeil » mais « le
 * client n'a rien saisi de coherent » — d'ou le refus explicite.
 */
export function dureeDeSommeil(coucher, lever) {
  if (!coucher || !lever) return null;

  const c = String(coucher).split(":").map(Number);
  const l = String(lever).split(":").map(Number);
  if (c.length < 2 || l.length < 2 || c.some(isNaN) || l.some(isNaN)) return null;

  let minutes = l[0] * 60 + l[1] - (c[0] * 60 + c[1]);
  if (minutes <= 0) minutes += 1440;
  if (minutes === 1440) return null;

  return round(minutes / 60, 1);
}

const enMinutes = (h) => {
  const [a, b] = String(h || "").split(":").map(Number);
  return Number.isFinite(a) && Number.isFinite(b) ? a * 60 + b : null;
};

/**
 * Régularité de l'heure de lever sur 14 jours : écart-type en minutes
 * (Windred 2024 ; Phillips 2017 : la régularité compte presque autant que
 * la durée). Rend { ecartMin, nuits } ou null (moins de 5 levers notés).
 */
export function regulariteLever(entrees, aujourdhui = todayISO(), jours = 14) {
  const debut = addDays(aujourdhui, -(jours - 1));
  const levers = (entrees || []).filter((f) => f && f.date >= debut && f.date <= aujourdhui).map((f) => enMinutes(f.wakeTime)).filter((m) => m != null);
  if (levers.length < 5) return null;
  const moyenne = avg(levers);
  const variance = avg(levers.map((m) => (m - moyenne) ** 2));
  return { ecartMin: Math.round(Math.sqrt(variance)), nuits: levers.length };
}

/**
 * Signaux qui justifient d'en parler à un médecin (lib/sommeil-preuves.js,
 * R01 à R04) :
 *  - « nuitsDifficiles » : au moins 12 nuits de qualité 1 ou 2 sur les 28
 *    derniers jours (3 par semaine) — l'insomnie chronique se définit sur
 *    3 mois, mais mieux vaut en parler tôt ;
 *  - « stressDurable » : stress moyen d'au moins 8/10 sur 14 jours, avec
 *    au moins 7 jours notés.
 */
export function signauxAlerte(entrees, aujourdhui = todayISO()) {
  const depuis28 = addDays(aujourdhui, -27);
  const depuis14 = addDays(aujourdhui, -13);
  const l = (entrees || []).filter((f) => f && f.date <= aujourdhui);
  const nuitsDifficiles = l.filter((f) => f.date >= depuis28 && f.sleepQuality != null && f.sleepQuality <= 2).length >= 12;
  const stress14 = l.filter((f) => f.date >= depuis14 && f.stress != null).map((f) => f.stress);
  const stressDurable = stress14.length >= 7 && avg(stress14) >= 8;
  return { nuitsDifficiles, stressDurable };
}
