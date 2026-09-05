/**
 * Bilan mensuel.
 *
 * Portage fidele de computeMonthStats (index.html, ligne 1098).
 *
 * Le mois est l'echelle ou les mensurations deviennent lisibles : sur une
 * semaine, un tour de taille ne bouge pas assez pour dire quoi que ce soit.
 * C'est aussi la seule vue qui rapporte les seances a une cadence
 * hebdomadaire, en tenant compte du fait qu'un mois en cours n'est pas
 * termine.
 */

import { avg, num, parseISO, round, todayISO } from "./dates.js";
import { getMonthRange } from "./semaine.js";
import { MEASUREMENT_FIELDS } from "./mensurations.js";

const MS_PAR_JOUR = 864e5;

/** Plus longue duree possible d'un mois, en jours. */
const JOURS_MAX_MOIS = 31;

export function bilanMensuel(cleMois, donnees, profil, objectifs) {
  const { start, end } = getMonthRange(cleMois);
  const dansLeMois = (d) => d >= start && d <= end;

  const seances = donnees.sessions.filter((s) => dansLeMois(s.date));
  const journal = donnees.dailyForm.filter((f) => dansLeMois(f.date));
  const corps = donnees.bodyLogs.filter((b) => dansLeMois(b.date)).sort((a, b) => a.date.localeCompare(b.date));
  const repas = donnees.logEntries.filter((e) => dansLeMois(e.date));
  const mesures = (donnees.measurements || [])
    .filter((m) => dansLeMois(m.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Comme pour la semaine : on moyenne par jour saisi, pas par ligne.
  const totauxParJour = {};
  repas.forEach((e) => {
    const d = totauxParJour[e.date] || (totauxParJour[e.date] = { calories: 0, protein: 0, carbs: 0, fat: 0 });
    d.calories += num(e.calories);
    d.protein += num(e.protein);
    d.carbs += num(e.carbs);
    d.fat += num(e.fat);
  });
  const joursSaisis = Object.keys(totauxParJour);
  const moyenneMacro = (champ) =>
    joursSaisis.length ? round(avg(joursSaisis.map((d) => totauxParJour[d][champ]))) : null;

  const valeurs = (liste, champ) => liste.filter((x) => x[champ] != null).map((x) => x[champ]);
  const moyenne = (liste, decimales = 0) => (liste.length ? round(avg(liste), decimales) : null);
  const valeursPositives = (champ) =>
    journal.filter((f) => f[champ] != null && f[champ] > 0).map((f) => f[champ]);

  /** Ecart avec la derniere valeur connue AVANT le mois. */
  function evolution(champ) {
    const dansMois = corps.filter((b) => b[champ] != null);
    if (!dansMois.length) return { latest: null, delta: null };
    const derniere = dansMois[dansMois.length - 1][champ];
    const avant = donnees.bodyLogs
      .filter((b) => b.date < start && b[champ] != null)
      .sort((a, b) => a.date.localeCompare(b.date));
    const reference = avant.length ? avant[avant.length - 1][champ] : dansMois[0][champ];
    return { latest: derniere, delta: round(derniere - reference, 1) };
  }
  const poids = evolution("weightKg");
  const masseGrasse = evolution("bodyFatPct");
  const muscle = evolution("muscleKg");

  // --- Mensurations.
  // A defaut de prise anterieure au mois, on compare a la premiere du mois,
  // mais seulement s'il y en a plus d'une : comparer une prise a elle-meme
  // afficherait un ecart de zero, ce qui se lirait comme une stagnation.
  const derniereMesure = mesures.length ? mesures[mesures.length - 1] : null;
  const mesuresAnterieures = (donnees.measurements || [])
    .filter((m) => m.date < start)
    .sort((a, b) => a.date.localeCompare(b.date));
  const mesureReference = mesuresAnterieures.length
    ? mesuresAnterieures[mesuresAnterieures.length - 1]
    : mesures.length > 1
      ? mesures[0]
      : null;

  const measureDeltas = MEASUREMENT_FIELDS.map((f) => {
    const latest = derniereMesure?.[f.id] ?? null;
    const base = mesureReference?.[f.id] ?? null;
    return {
      id: f.id,
      label: f.label,
      latest,
      base,
      delta: latest != null && base != null ? round(latest - base, 1) : null
    };
  }).filter((m) => m.latest != null);

  // --- Cadence d'entrainement.
  // Un mois en cours ne compte que les jours ecoules : diviser par 30 en
  // milieu de mois donnerait une cadence deux fois trop basse.
  const aujourdhui = todayISO();
  const finEffective = aujourdhui < end ? aujourdhui : end;
  const joursEcoules = Math.max(
    1,
    Math.min((parseISO(finEffective) - parseISO(start)) / MS_PAR_JOUR + 1, JOURS_MAX_MOIS)
  );
  const workoutsPerWeek = round(seances.length / (joursEcoules / 7), 1);

  return {
    monthKey: cleMois,
    start,
    end,
    workoutsCount: seances.length,
    workoutsPerWeek,
    avgCalories: moyenneMacro("calories"),
    avgProtein: moyenneMacro("protein"),
    avgCarbs: moyenneMacro("carbs"),
    avgFat: moyenneMacro("fat"),
    loggedDaysCount: joursSaisis.length,
    avgSleepH: moyenne(valeurs(journal, "sleepHours"), 1),
    avgSleepQuality: moyenne(valeurs(journal, "sleepQuality"), 1),
    avgEnergy: moyenne(valeurs(journal, "energy"), 1),
    avgStress: moyenne(valeurs(journal, "stress"), 1),
    avgWaterMl: moyenne(valeursPositives("waterMl")),
    avgSteps: moyenne(valeursPositives("steps")),
    latestWeight: poids.latest,
    weightDelta: poids.delta,
    latestFatPct: masseGrasse.latest,
    fatPctDelta: masseGrasse.delta,
    latestMuscle: muscle.latest,
    muscleDelta: muscle.delta,
    measureDeltas,
    measureDate: derniereMesure?.date || null,
    measureBaseDate: mesureReference?.date || null,
    hasAnyData: seances.length + journal.length + corps.length + repas.length + mesures.length > 0
  };
}
