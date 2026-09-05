/**
 * Calculs nutritionnels.
 *
 * Portage fidele de index.html (lignes ~921-968 et ~1901). Ce sont les
 * chiffres sur lesquels le client regle son alimentation : la moindre
 * divergence avec l'ancienne version serait un changement silencieux de ses
 * objectifs. tests/parite.test.mjs compare donc les deux implementations sur
 * des centaines de profils avant toute bascule.
 */

import { addDays, avg, num, parseISO, todayISO } from "./dates.js";

export const GOALS = [
  { id: "perte", label: "Perte de poids" },
  { id: "prise", label: "Prise de masse" },
  { id: "maintien", label: "Maintien" },
  { id: "performance", label: "Performance" }
];

export const ACTIVITY_LEVELS = [
  { id: "sedentaire", label: "Sédentaire (peu ou pas de sport)", mult: 1.2 },
  { id: "leger", label: "Légèrement actif (1-3x/sem)", mult: 1.375 },
  { id: "modere", label: "Modérément actif (3-5x/sem)", mult: 1.55 },
  { id: "actif", label: "Très actif (6-7x/sem)", mult: 1.725 },
  { id: "tresactif", label: "Extrêmement actif (physique)", mult: 1.9 }
];

export const GOAL_CAL_ADJUST = { perte: -0.2, prise: 0.1, maintien: 0, performance: 0.05 };

/** Majoration liee au metier, cumulee au niveau d'activite sportive. */
const MAJORATION_METIER = { sedentaire: 0, actif: 0.05, "tres-actif": 0.12 };

/**
 * Plafond du facteur d'activite.
 *
 * Le cumul sport + metier peut depasser les niveaux physiologiquement
 * soutenables. 2,1 est la valeur haute observee hors athletes d'endurance et
 * travailleurs de force.
 */
const PAL_MAX = 2.1;

/** Metabolisme de base, formule de Mifflin-St Jeor. */
export function computeBMR({ sex, weightKg, heightCm, age }) {
  if (!weightKg || !heightCm || !age) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "homme" ? base + 5 : base - 161;
}

/** Objectifs journaliers : calories et macros. */
export function computeTargets(profile, currentWeightKg) {
  const weight = currentWeightKg || profile.startWeightKg;
  let tdee;

  if (profile.calibratedMaintenanceKcal) {
    // Une maintenance mesuree sur les donnees reelles prime sur toute formule.
    tdee = profile.calibratedMaintenanceKcal;
  } else {
    const bmr = computeBMR({
      sex: profile.sex,
      weightKg: weight,
      heightCm: profile.heightCm,
      age: profile.age
    });
    const activity =
      ACTIVITY_LEVELS.find((a) => a.id === profile.activityLevel) || ACTIVITY_LEVELS[1];
    const jobMult = MAJORATION_METIER[profile.jobType] || 0;
    const pal = Math.min(PAL_MAX, activity.mult * (1 + jobMult));
    tdee = bmr ? bmr * pal : null;
  }

  const adjust = GOAL_CAL_ADJUST[profile.goal] ?? 0;
  const calories = tdee ? (Math.round((tdee * (1 + adjust)) / 10) * 10) : null;

  const proteinPerKg = 2;
  const fatPerKg = profile.goal === "perte" ? 0.6 : 1;
  const protein = weight ? Math.round(weight * proteinPerKg) : null;
  const fat = weight ? Math.round(weight * fatPerKg) : null;

  // Les glucides absorbent ce qui reste une fois proteines et lipides poses.
  const remainingKcal =
    calories != null && protein != null && fat != null
      ? Math.max(0, calories - protein * 4 - fat * 9)
      : null;
  const carbs = remainingKcal != null ? Math.round(remainingKcal / 4) : null;

  return { calories, protein, carbs, fat };
}

/**
 * Maintenance reelle, deduite du poids observe et des calories loguees.
 *
 * Plus fiable qu'une formule : elle tient compte du metabolisme reel du
 * client. Renvoie null tant que les donnees sont trop maigres pour conclure.
 */
export function computeCalibration(bodyLogs, logEntries, windowDays) {
  const since = addDays(todayISO(), -windowDays);

  const weights = bodyLogs
    .filter((b) => b.date >= since && b.weightKg != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (weights.length < 2) return null;

  const dayTotals = {};
  logEntries
    .filter((e) => e.date >= since)
    .forEach((e) => {
      dayTotals[e.date] = (dayTotals[e.date] || 0) + num(e.calories);
    });

  const loggedDays = Object.keys(dayTotals);
  if (loggedDays.length < 7) return null;

  const avgCal = avg(loggedDays.map((d) => dayTotals[d]));
  const weightChange = weights[weights.length - 1].weightKg - weights[0].weightKg;
  const daysSpan = Math.max(
    1,
    (parseISO(weights[weights.length - 1].date) - parseISO(weights[0].date)) / 864e5
  );

  // 7700 kcal ~ 1 kg de masse corporelle.
  const estimate = Math.round((avgCal - (weightChange * 7700) / daysSpan) / 10) * 10;
  return { estimate, days: windowDays, loggedDaysCount: loggedDays.length };
}

/**
 * Ce qu'il reste a consommer aujourd'hui.
 *
 * kcal est un solde SIGNE : il devient negatif en cas de depassement et sert
 * de signal (l'interface ne propose de suggestions qu'au-dessus de 150 kcal
 * restantes). Les macros, elles, alimentent l'algorithme de suggestion et
 * sont bornees a zero. Comportement volontaire, verifie par les tests.
 */
export function computeRemainingToday(logEntries, targets) {
  if (!targets || !targets.calories) return null;
  const today = todayISO();

  const totals = logEntries
    .filter((e) => e.date === today)
    .reduce(
      (a, e) => ({
        kcal: a.kcal + num(e.calories),
        p: a.p + num(e.protein),
        c: a.c + num(e.carbs),
        f: a.f + num(e.fat)
      }),
      { kcal: 0, p: 0, c: 0, f: 0 }
    );

  return {
    consumed: totals,
    kcal: targets.calories - totals.kcal,
    p: Math.max(0, (targets.protein || 0) - totals.p),
    c: Math.max(0, (targets.carbs || 0) - totals.c),
    f: Math.max(0, (targets.fat || 0) - totals.f)
  };
}
