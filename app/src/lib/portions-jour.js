/**
 * Portions du jour : fruits, legumes, proteines, en un geste.
 *
 * Demande du coach, d'apres Lifesum : un debutant apprend a mieux manger
 * sans peser. Il compte ses portions — un fruit, une poignee de legumes,
 * une paume de viande, de poisson, d'oeufs ou de tofu — au lieu de
 * grammes et de macros.
 *
 * Reperes retenus :
 * - fruits et legumes : 5 portions par jour, le repere du Programme
 *   national nutrition sante (« au moins 5 fruits et legumes par jour ») ;
 * - proteines : 3 portions, une par repas principal.
 *
 * Les compteurs vivent dans le journal du jour (coach_daily_form), a cote
 * de l'eau et des pas : ils sont donc sauvegardes, restaures, et comptent
 * dans la serie de jours sans rien ajouter.
 */

import { avg, clamp, num, round } from "./dates.js";

/** Les trois compteurs, dans l'ordre d'affichage. */
export const PORTIONS = [
  { cle: "fruits", label: "Fruits", icone: "🍎" },
  { cle: "vegetables", label: "Légumes", icone: "🥦" },
  { cle: "proteinPortions", label: "Protéines", icone: "🍗" }
];

export const OBJECTIF_FRUITS_LEGUMES = 5;
export const OBJECTIF_PORTIONS_PROTEINES = 3;

/** Au-dela, c'est une faute de frappe plutot qu'une journee reelle. */
const MAXIMUM = 20;

/** Valeur d'un compteur, entiere et jamais negative. */
export const lirePortion = (form, cle) => Math.max(0, Math.round(num(form && form[cle])));

/** Nouvelle valeur apres un appui sur + ou −, bornee entre 0 et 20. */
export const ajusterPortion = (valeur, delta) => clamp(Math.round(num(valeur)) + delta, 0, MAXIMUM);

export const fruitsEtLegumes = (form) => lirePortion(form, "fruits") + lirePortion(form, "vegetables");

/**
 * Composantes du score du jour.
 *
 * Meme principe que le reste du score : on ne note que ce qui est
 * renseigne. Quelqu'un qui ne compte pas ses portions ne perd rien ;
 * quelqu'un qui ne compte que ses legumes n'est pas penalise sur les
 * proteines.
 */
export function composantesPortions(form) {
  const composantes = [];
  const fl = fruitsEtLegumes(form);
  if (fl > 0) {
    composantes.push({
      key: "fruitsVeg",
      label: "Fruits & légumes",
      value: clamp((fl / OBJECTIF_FRUITS_LEGUMES) * 100, 0, 100)
    });
  }
  const prot = lirePortion(form, "proteinPortions");
  if (prot > 0) {
    composantes.push({
      key: "proteinPortions",
      label: "Portions de protéines",
      value: clamp((prot / OBJECTIF_PORTIONS_PROTEINES) * 100, 0, 100)
    });
  }
  return composantes;
}

/**
 * Moyennes de la semaine, pour le bilan envoye au coach.
 *
 * Moyenne sur les jours ou le compteur a ete utilise : un jour sans saisie
 * est un jour « non renseigne », pas un jour a zero legume. Null quand le
 * client n'a jamais compte — le bilan n'en parle alors pas.
 */
export function moyennesPortions(journal) {
  const jours = journal || [];
  const fl = jours.map(fruitsEtLegumes).filter((v) => v > 0);
  const prot = jours.map((f) => lirePortion(f, "proteinPortions")).filter((v) => v > 0);
  return {
    avgFruitsVeg: fl.length ? round(avg(fl), 1) : null,
    avgProteinPortions: prot.length ? round(avg(prot), 1) : null
  };
}
