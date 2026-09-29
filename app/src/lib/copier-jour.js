/**
 * Reprendre les repas de la veille en un geste.
 *
 * Demande du coach, d'apres ce que proposent MyFitnessPal (« copier un repas
 * d'un jour a l'autre ») et Yazio : un debutant mange souvent la meme chose
 * deux jours de suite — meme petit-dejeuner, restes du diner au dejeuner.
 * Ressaisir chaque aliment est ce qui le fait decrocher du suivi.
 *
 * Les entrees sont recopiees telles quelles (nom, quantite, macros, fibres,
 * plat d'origine), avec la nouvelle date. Aucun lien n'est garde avec
 * l'original : corriger la copie ne doit pas modifier la veille.
 */

import { addDays, num } from "./dates.js";

/** La veille d'une date ISO (AAAA-MM-JJ). */
export const veille = (date) => addDays(date, -1);

/**
 * Les entrees d'un jour, pretes a etre ajoutees a un autre.
 *
 * `mealType` restreint la copie a un repas ; sans lui, toute la journee est
 * reprise, chaque aliment dans son repas d'origine. L'identifiant est retire :
 * l'ajout en attribue un nouveau, sinon deux lignes partageraient le meme et
 * supprimer l'une effacerait l'autre.
 */
export function entreesACopier(entrees, { depuis, vers, mealType = null }) {
  return (entrees || [])
    .filter((e) => e.date === depuis && (mealType == null || e.mealType === mealType))
    .map(({ id, ...reste }) => ({ ...reste, date: vers }));
}

/** Nombre d'aliments et calories d'une copie, pour l'annoncer avant de la faire. */
export function resumeCopie(entrees) {
  const liste = entrees || [];
  return {
    aliments: liste.length,
    kcal: Math.round(liste.reduce((s, e) => s + num(e.calories), 0))
  };
}
