/**
 * Seances : selection et resume.
 *
 * Sorti de l'ecran pour etre testable. C'est le calcul qui decide de ce que
 * le coach voit dans le bilan hebdomadaire de son client : une erreur de
 * bornes ne se voit pas a l'oeil, elle deplace juste une seance d'une
 * semaine a l'autre et fausse les deux bilans.
 */

import { todayISO } from "./dates.js";
import { getWeekKey } from "./semaine.js";

/** Seances de la semaine en cours, de la plus recente a la plus ancienne. */
export function seancesDeLaSemaine(seances, aujourdhui = todayISO()) {
  const semaine = getWeekKey(aujourdhui);
  return (seances || [])
    .filter((x) => x.date && getWeekKey(x.date) === semaine)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Resume d'une seance : duree et RPE.
 *
 * Un pointage sans aucun detail reste valable — le client a pu ne rien
 * vouloir saisir — d'ou le tiret plutot qu'une ligne vide.
 */
export function resumeSeance(seance) {
  return (
    [seance.durationMin ? seance.durationMin + " min" : null, seance.rpe ? "RPE " + seance.rpe : null]
      .filter(Boolean)
      .join(" · ") || "—"
  );
}
