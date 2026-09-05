/**
 * Series temporelles des tendances.
 *
 * Portage fidele de buildWeeklySeries (index.html, ligne 1179) et des
 * series de composition corporelle construites dans TendancesTab (4402).
 *
 * Ces series alimentent les courbes que le client regarde pour juger sa
 * progression. Une valeur absente doit rester absente : relier deux points
 * distants d'un mois par une droite laisserait croire a une progression
 * reguliere qui n'a jamais ete mesuree.
 */

import { addDays, fmtWeekShort, round, todayISO } from "./dates.js";
import { getWeekKey } from "./semaine.js";
import { bilanHebdomadaire } from "./bilan.js";

/** Les N dernieres semaines, de la plus ancienne a la plus recente. */
export function clesDesDernieresSemaines(nbSemaines, aujourdhui = todayISO()) {
  const cles = [];
  let semaine = getWeekKey(aujourdhui);
  for (let i = 0; i < nbSemaines; i++) {
    cles.unshift(semaine);
    semaine = addDays(semaine, -7);
  }
  return cles;
}

/**
 * Serie hebdomadaire des indicateurs suivis.
 *
 * L'eau est convertie en litres : afficher « 2100 » sur un axe a cote de
 * « 7,5 heures de sommeil » melange deux ordres de grandeur sans raison.
 */
export function serieHebdomadaire(nbSemaines, donnees, profil, objectifs, aujourdhui = todayISO()) {
  return clesDesDernieresSemaines(nbSemaines, aujourdhui).map((cle) => {
    const b = bilanHebdomadaire(cle, donnees, profil, objectifs);
    return {
      label: fmtWeekShort(cle),
      calories: b.avgCalories,
      sleep: b.avgSleepH,
      workouts: b.workoutsCount,
      water: b.avgWaterMl != null ? round(b.avgWaterMl / 1e3, 2) : null,
      steps: b.avgSteps
    };
  });
}

/** Serie d'un champ du journal corporel, dans l'ordre chronologique. */
export function serieCorporelle(journalCorps, champ) {
  return (journalCorps || [])
    .filter((b) => b[champ] != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => ({ label: fmtWeekShort(b.date), value: b[champ] }));
}
