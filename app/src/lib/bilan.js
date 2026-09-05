/**
 * Bilan hebdomadaire.
 *
 * Portage fidele de computeWeekStats (index.html, ligne 983).
 *
 * C'est la synthese que le coach lit et que le rapport IA resume. Elle
 * agrege tout : seances, sommeil, alimentation, douleurs, poids, respect
 * des creneaux. Chaque moyenne absente vaut null et non zero — « je n'ai
 * pas la donnee » et « il a dormi zero heure » ne se racontent pas pareil.
 */

import { avg, clamp, fmtWeekShort, num, round, todayISO } from "./dates.js";
import { getWeekKey, getWeekRange } from "./semaine.js";
import { bilanSemaine, semaineCreneaux } from "./creneaux.js";
import { normaliserCreneaux } from "./semaine.js";
import { bilanPlanSemaine, etatPlanSemaine, raisonSemaineDifficile, semaineDifficileDe } from "./plan-semaine.js";

/** Longueur maximale d'une note reprise dans le bilan. */
const LONGUEUR_NOTE = 140;

/** Moyenne arrondie d'une liste de valeurs, ou null si la liste est vide. */
function moyenneOuNull(valeurs, decimales = 0) {
  return valeurs.length ? round(avg(valeurs), decimales) : null;
}

/** Valeurs non nulles d'un champ, parmi les entrees du journal. */
const valeursDe = (entrees, champ) => entrees.filter((f) => f[champ] != null).map((f) => f[champ]);

/** Idem, mais en ignorant aussi les zeros (eau, pas : zero = non saisi). */
const valeursPositives = (entrees, champ) =>
  entrees.filter((f) => f[champ] != null && f[champ] > 0).map((f) => f[champ]);

export function bilanHebdomadaire(cleSemaine, donnees, profil, objectifs) {
  const { start, end } = getWeekRange(cleSemaine);
  const dansLaSemaine = (d) => d >= start && d <= end;

  const seances = donnees.sessions.filter((s) => dansLaSemaine(s.date));
  const journal = donnees.dailyForm.filter((f) => dansLaSemaine(f.date));
  const corps = donnees.bodyLogs.filter((b) => dansLaSemaine(b.date)).sort((a, b) => a.date.localeCompare(b.date));
  const repas = donnees.logEntries.filter((e) => dansLaSemaine(e.date));

  // --- Alimentation : on moyenne par jour saisi, pas par ligne de repas.
  // Sinon quelqu'un qui note cinq collations un jour et rien le lendemain
  // verrait sa moyenne tiree par le nombre de saisies.
  const totauxParJour = {};
  repas.forEach((e) => {
    const d = totauxParJour[e.date] || (totauxParJour[e.date] = { calories: 0, protein: 0, carbs: 0, fat: 0 });
    d.calories += num(e.calories);
    d.protein += num(e.protein);
    d.carbs += num(e.carbs);
    d.fat += num(e.fat);
  });
  const joursSaisis = Object.keys(totauxParJour);
  const moyenneMacro = (champ) => moyenneOuNull(joursSaisis.map((d) => totauxParJour[d][champ]));

  const avgCalories = moyenneMacro("calories");
  const avgProtein = moyenneMacro("protein");
  const avgCarbs = moyenneMacro("carbs");
  const avgFat = moyenneMacro("fat");

  // --- Forme du jour.
  const avgSleepH = moyenneOuNull(valeursDe(journal, "sleepHours"), 1);
  const avgSleepQuality = moyenneOuNull(valeursDe(journal, "sleepQuality"), 1);
  const avgEnergy = moyenneOuNull(valeursDe(journal, "energy"), 1);
  const avgStress = moyenneOuNull(valeursDe(journal, "stress"), 1);
  const avgWaterMl = moyenneOuNull(valeursPositives(journal, "waterMl"));
  const avgSteps = moyenneOuNull(valeursPositives(journal, "steps"));

  // --- Notes libres : ce que le client a ecrit compte autant que ses
  // chiffres, souvent davantage pour comprendre une mauvaise semaine.
  const dayNotes = journal
    .filter((f) => f.sleepNote || f.stressNote)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (f) =>
        `${fmtWeekShort(f.date)} :${f.sleepNote ? ` sommeil « ${f.sleepNote} »` : ""}` +
        `${f.sleepNote && f.stressNote ? " ·" : ""}${f.stressNote ? ` stress « ${f.stressNote} »` : ""}`
    )
    .slice(-5);

  const tronquer = (t) => String(t).trim().slice(0, LONGUEUR_NOTE);
  const sessionNotes = seances
    .filter((s) => s.notes && String(s.notes).trim())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => `${fmtWeekShort(s.date)}${s.rpe ? ` (RPE ${s.rpe})` : ""} : « ${tronquer(s.notes)} »`)
    .slice(-4);

  // --- Douleurs, regroupees par zone : une gene legere mais recurrente
  // compte autant qu'un pic isole, et c'est le regroupement qui la revele.
  const parZone = {};
  seances.forEach((seance) =>
    (seance.pains || []).forEach((douleur) => {
      if (!douleur || !douleur.zone) return;
      const niveau = num(douleur.level);
      const e = parZone[douleur.zone] || (parZone[douleur.zone] = { zone: douleur.zone, count: 0, max: 0 });
      e.count++;
      if (niveau > e.max) e.max = niveau;
    })
  );
  const pains = Object.values(parZone).sort((a, b) => b.max - a.max || b.count - a.count);
  const painLines = pains.map(
    (p) => p.zone + " : " + p.count + " séance" + (p.count > 1 ? "s" : "") + ", intensité max " + p.max + "/10"
  );

  const deloadCount = seances.filter((s) => s.deload).length;
  const maintenanceCount = seances.filter((s) => s.maintenance).length;

  // --- Creneaux (coaching en ligne).
  // Pour la semaine en cours on s'arrete a aujourd'hui : compter comme
  // manques des creneaux encore a venir fausserait le bilan a la baisse.
  const creneaux = normaliserCreneaux(profil);
  const jourReference = cleSemaine === getWeekKey(todayISO()) ? todayISO() : end;
  const slotSummary = creneaux.length
    ? bilanSemaine(semaineCreneaux(creneaux, donnees.sessions, cleSemaine, jourReference).lignes)
    : null;

  const entreeDifficile = semaineDifficileDe(donnees.hardWeeks, cleSemaine);
  const hardWeek = !!(entreeDifficile && entreeDifficile.active);
  const hardWeekReason = raisonSemaineDifficile(entreeDifficile);

  // --- Composition corporelle : on compare a la derniere mesure connue
  // AVANT la semaine, pas a la premiere de la semaine. Sinon un client qui
  // ne se pese qu'une fois affiche toujours une variation nulle.
  function evolution(champ) {
    const semaine = corps.filter((b) => b[champ] != null);
    if (!semaine.length) return { latest: null, delta: null };
    const derniere = semaine[semaine.length - 1][champ];
    const avant = donnees.bodyLogs
      .filter((b) => b.date < start && b[champ] != null)
      .sort((a, b) => a.date.localeCompare(b.date));
    const reference = avant.length ? avant[avant.length - 1][champ] : semaine[0][champ];
    return { latest: derniere, delta: round(derniere - reference, 1) };
  }
  const poids = evolution("weightKg");
  const masseGrasse = evolution("bodyFatPct");
  const muscle = evolution("muscleKg");

  const workoutsCount = seances.length;
  const lignesPlan = donnees.weekPlan
    ? etatPlanSemaine(donnees.weekPlan, donnees.routines || [], donnees.sessions, jourReference)
    : null;
  const planSummary = lignesPlan ? bilanPlanSemaine(lignesPlan) : null;

  const loggedDaysCount = new Set([
    ...repas.map((e) => e.date),
    ...journal.map((f) => f.date),
    ...seances.map((s) => s.date),
    ...corps.map((b) => b.date)
  ]).size;

  // --- Note d'assiduite.
  // Une seule source compte pour l'entrainement, par ordre de precision :
  // creneaux declares, puis programme hebdomadaire, puis simple objectif de
  // seances. Les cumuler compterait deux fois la meme chose.
  const composantes = [];
  if (slotSummary && slotSummary.prevus > 0) {
    composantes.push(clamp((slotSummary.honores / slotSummary.prevus) * 100, 0, 100));
  } else if (planSummary && planSummary.prevus > 0) {
    composantes.push(clamp((planSummary.faits / planSummary.prevus) * 100, 0, 100));
  } else if (profil.weeklyWorkoutTarget) {
    composantes.push(clamp((workoutsCount / profil.weeklyWorkoutTarget) * 100, 0, 100));
  }
  if (avgCalories != null && objectifs.calories) {
    composantes.push(clamp(100 - (Math.abs(avgCalories - objectifs.calories) / objectifs.calories) * 100, 0, 100));
  }
  if (avgSleepH != null) {
    composantes.push(clamp((avgSleepH / (profil.targetSleepHours || 8)) * 100, 0, 100));
  }
  composantes.push(clamp((loggedDaysCount / 7) * 100, 0, 100));
  const adherence = composantes.length ? Math.round(avg(composantes)) : 0;

  return {
    weekKey: cleSemaine,
    start,
    end,
    workoutsCount,
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    loggedDaysCount,
    avgSleepH,
    avgSleepQuality,
    avgEnergy,
    avgStress,
    avgWaterMl,
    avgSteps,
    dayNotes,
    sessionNotes,
    pains,
    painLines,
    deloadCount,
    planSummary,
    slotSummary,
    hardWeek,
    hardWeekReason,
    maintenanceCount,
    latestWeight: poids.latest,
    weightDelta: poids.delta,
    latestFatPct: masseGrasse.latest,
    fatPctDelta: masseGrasse.delta,
    latestMuscle: muscle.latest,
    muscleDelta: muscle.delta,
    adherence,
    hasAnyData: seances.length + journal.length + corps.length + repas.length > 0
  };
}
