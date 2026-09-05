/**
 * Score du jour.
 *
 * Portage de la logique de JournalTab (index.html, lignes 2345-2366).
 *
 * ATTENTION — ce portage n'a PAS pu etre verifie par parite comme les
 * autres : dans l'application actuelle, ce calcul est ecrit a l'interieur
 * du composant d'affichage, pas dans une fonction appelable. Il n'y a donc
 * rien a comparer automatiquement. Les tests qui l'accompagnent verifient
 * chaque regle prise separement, avec des valeurs calculees a la main.
 * C'est moins solide qu'une parite : a relire de pres avant la bascule.
 *
 * Principe du score : on ne note que ce que le client a renseigne. Une
 * composante absente ne compte pas, au lieu de valoir zero — sinon
 * quelqu'un qui ne saisit pas ses pas verrait son score s'effondrer sans
 * avoir rien fait de mal.
 */

import { avg, clamp, num } from "./dates.js";
import { getMonday } from "./semaine.js";

/** Objectifs par defaut, quand le profil ne les precise pas. */
export const DEFAUTS = {
  sommeilHeures: 8,
  eauLitres: 2,
  pas: 8000
};

/** Volume d'eau formate pour l'affichage. */
export const fmtL = (ml) =>
  ((ml || 0) / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " L";

/** Totaux nutritionnels d'une liste d'entrees. */
export function totauxDuJour(entrees) {
  return (entrees || []).reduce(
    (a, e) => ({
      calories: a.calories + num(e.calories),
      protein: a.protein + num(e.protein),
      carbs: a.carbs + num(e.carbs),
      fat: a.fat + num(e.fat)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Composantes du score, chacune ramenee sur 100.
 *
 * L'ordre est celui de l'application actuelle : bien-etre, hydratation,
 * pas, nutrition, entrainement.
 */
export function composantesDuScore({ journalDuJour, entreesDuJour, totaux, profil, objectifs, seances, date }) {
  const form = journalDuJour || {};
  const composantes = [];

  // Bien-etre : moyenne de ce qui est renseigne parmi sommeil, energie et
  // stress. Le stress est inverse — beaucoup de stress fait baisser.
  if (form.sleepHours != null || form.energy != null || form.stress != null) {
    const valeurs = [
      form.sleepHours != null
        ? clamp((form.sleepHours / (profil.targetSleepHours || DEFAUTS.sommeilHeures)) * 100, 0, 100)
        : null,
      form.energy != null ? (form.energy / 5) * 100 : null,
      form.stress != null ? ((10 - form.stress) / 10) * 100 : null
    ].filter((v) => v != null);
    if (valeurs.length) composantes.push({ key: "wellbeing", label: "Bien-être", value: avg(valeurs) });
  }

  const eauMl = form.waterMl || 0;
  const eauObjectifMl = (profil.targetWaterL || DEFAUTS.eauLitres) * 1e3;
  if (eauMl > 0) {
    composantes.push({ key: "hydration", label: "Hydratation", value: clamp((eauMl / eauObjectifMl) * 100, 0, 100) });
  }

  const pas = form.steps || 0;
  const pasObjectif = profil.targetSteps || DEFAUTS.pas;
  if (pas > 0) {
    composantes.push({ key: "steps", label: "Pas", value: clamp((pas / pasObjectif) * 100, 0, 100) });
  }

  // Nutrition : c'est l'ECART a l'objectif qui compte, pas le total. Manger
  // 3000 kcal quand on en vise 2000 est aussi loin de la cible que d'en
  // manger 1000.
  if ((entreesDuJour || []).length > 0 && objectifs?.calories) {
    composantes.push({
      key: "nutrition",
      label: "Nutrition",
      value: clamp(100 - (Math.abs(totaux.calories - objectifs.calories) / objectifs.calories) * 100, 0, 100)
    });
  }

  // Entrainement : avancement dans la semaine en cours, jusqu'a la date
  // consultee — pas la semaine entiere, sinon consulter un lundi donnerait
  // toujours un score au plancher.
  if (profil.weeklyWorkoutTarget) {
    const lundi = getMonday(date);
    const faites = (seances || []).filter((s) => s.date >= lundi && s.date <= date).length;
    composantes.push({
      key: "training",
      label: "Entraînement",
      value: clamp((faites / profil.weeklyWorkoutTarget) * 100, 0, 100)
    });
  }

  return composantes;
}

/** Score global, ou null si rien n'a ete renseigne ce jour-la. */
export function scoreDuJour(composantes) {
  return composantes.length ? Math.round(avg(composantes.map((p) => p.value))) : null;
}

/** Appreciation associee au score. */
export function libelleDuScore(score) {
  if (score == null) return "";
  if (score >= 90) return "Optimal";
  if (score >= 70) return "Bon";
  if (score >= 40) return "Correct";
  return "Faible";
}
