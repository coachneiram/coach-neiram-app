/**
 * Sommeil et stress : conseils et moyennes.
 *
 * Le calcul est sorti du composant d'affichage pour pouvoir etre teste
 * directement. Les textes et les seuils sont repris a l'identique de
 * index.html (lignes 2783-2830) : ce sont les conseils que le coach donne
 * a ses clients, ils ne se reecrivent pas au passage d'une migration.
 */

import { addDays, avg, round, todayISO } from "./dates.js";

export const CONSEILS_SOMMEIL = {
  duree: [
    "Couche-toi et lève-toi à heures fixes, même le week-end — la régularité prime sur tout le reste.",
    "Coupe les écrans 45-60 min avant le coucher, lumière tamisée dans le logement.",
    "Avance ton coucher par paliers de 15 min, pas d'un coup."
  ],
  qualite: [
    "Dernier café avant 14 h : la caféine a une demi-vie de 5-6 heures.",
    "Chambre fraîche (18-19 °C), noire et silencieuse — investis dans des rideaux occultants si besoin.",
    "Évite l'alcool le soir : il endort vite mais fragmente le sommeil profond.",
    "Séance intense terminée au moins 3 h avant le coucher."
  ],
  general: [
    "Routine fixe de 20 min avant de dormir : lecture, étirements légers, respiration.",
    "Expose-toi à la lumière du jour dans l'heure qui suit le lever — ça cale ton horloge interne.",
    "Le lit sert à dormir : pas de travail ni de scroll au lit."
  ]
};

export const CONSEILS_STRESS = {
  eleve: [
    "Cohérence cardiaque : 5 min, inspire 5 s / expire 5 s, 3 fois par jour — effet mesurable sur le cortisol.",
    "10-15 min de marche dehors à la pause : coupe le stress et ajoute des pas.",
    "Le soir, note ce qui te stresse sur papier : sortir de la tête avant de dormir."
  ],
  general: [
    "Une seule tâche à la fois, 3 priorités max par jour.",
    "Réduis la caféine les journées tendues — elle amplifie la réponse au stress.",
    "Le stress se gère d'abord par le sommeil : protège tes heures cibles."
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
