/**
 * Suggestions de collation.
 *
 * Portage fidele de pickSuggestions (index.html, ligne 322).
 *
 * Quand il reste de la place dans la journee, l'application propose deux ou
 * trois idees. Le classement combine deux criteres : la proximite du profil
 * proteique de ce qu'il reste a couvrir, et la taille de la portion. Un
 * grain de hasard evite de proposer les trois memes aliments tous les
 * jours — sans lui, le conseil devient decor au bout d'une semaine.
 *
 * Ce hasard est injectable ici, sans quoi la fonction serait intestable.
 */

import { clamp } from "./dates.js";
import { regimeOk } from "./aliments.js";
import { SUGGESTIONS } from "./catalogues.js";

/** Poids respectifs du profil proteique, de la taille, et du hasard. */
const POIDS_PROFIL = 0.6;
const POIDS_TAILLE = 0.4;
const POIDS_HASARD = 0.08;

/** Portion visee au maximum, et echelle de tolerance sur la taille. */
const PORTION_MAX = 600;

/** Marge au-dessus du restant : une collation peut deborder un peu. */
const MARGE_KCAL = 80;

/** Plancher, pour qu'il reste toujours quelques idees tres legeres. */
const PLANCHER_KCAL = 130;

/** Part proteique retenue quand il n'y a rien pour la calculer. */
const PART_PROTEIQUE_DEFAUT = 0.3;

export function choisirSuggestions(restant, profil, nombre, hasard = Math.random) {
  if (!restant || restant.kcal <= 0) return [];

  const candidats = SUGGESTIONS.filter((it) => regimeOk(it, profil)).filter(
    (it) => it.kcal <= Math.max(PLANCHER_KCAL, restant.kcal + MARGE_KCAL)
  );
  if (!candidats.length) return [];

  const partProteique =
    restant.kcal > 0 ? clamp((restant.p * 4) / restant.kcal, 0, 1) : PART_PROTEIQUE_DEFAUT;
  const portionVisee = Math.min(restant.kcal, PORTION_MAX);

  return candidats
    .map((it) => {
      const partItem = it.kcal ? (it.p * 4) / it.kcal : 0;
      const proximite = 1 - Math.min(1, Math.abs(partItem - partProteique));
      const taille = 1 - Math.min(1, Math.abs(it.kcal - portionVisee) / PORTION_MAX);
      return {
        it,
        score: proximite * POIDS_PROFIL + taille * POIDS_TAILLE + hasard() * POIDS_HASARD
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, nombre || 3)
    .map((x) => x.it);
}

/**
 * Repas auquel rattacher un ajout rapide, d'apres l'heure.
 *
 * Repris de index.html (ligne 2392). Les bornes sont volontairement larges :
 * il vaut mieux ranger une collation de 15 h dans le gouter que demander au
 * client de choisir a chaque fois.
 */
export function repasSelonHeure(heure) {
  if (heure < 11) return "petit-dejeuner";
  if (heure < 15) return "dejeuner";
  if (heure < 18) return "gouter";
  return "diner";
}
