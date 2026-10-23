/**
 * Historique des bilans IA : semaines et mois passes.
 *
 * Fonction de l'ancienne application (index.html, TendancesTab, l. 4406-4408
 * et 4438 : « Historique des bilans », « Bilans mensuels précédents »)
 * perdue a la migration, et rebranchee ici (22 octobre 2026). Les bilans
 * n'avaient jamais cesse d'etre enregistres (coach_reports,
 * coach_reports_monthly) : seul l'affichage manquait. Aucune donnee n'est
 * convertie.
 *
 * App coach : tout l'historique est visible. (L'app grand public, qui
 * partage ce fichier, limite la version gratuite a 4 semaines.)
 */

import { getWeekKey } from "./semaine.js";

function trier(liste, cle) {
  return (Array.isArray(liste) ? liste : [])
    // sections : l'objet rendu par lireBilan (rapport.js), { resume, evolution, ... }.
    .filter((r) => r && r[cle] && r.sections && typeof r.sections === "object")
    .sort((a, b) => String(b[cle]).localeCompare(String(a[cle])));
}

/**
 * Bilans hebdomadaires passes, du plus recent au plus ancien, sans celui de
 * la semaine en cours (deja affiche au-dessus).
 */
export function historiqueHebdo(reports, { aujourdhui }) {
  const courante = getWeekKey(aujourdhui);
  return { visibles: trier(reports, "weekKey").filter((r) => r.weekKey !== courante) };
}

/** Bilans mensuels passes, sans celui du mois en cours. */
export function historiqueMensuel(monthlyReports, { aujourdhui }) {
  const courant = aujourdhui.slice(0, 7);
  return { visibles: trier(monthlyReports, "monthKey").filter((r) => r.monthKey !== courant) };
}
