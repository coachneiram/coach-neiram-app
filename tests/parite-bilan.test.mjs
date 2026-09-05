/**
 * Parite du bilan hebdomadaire : ancienne version contre nouvelle.
 *
 * C'est la synthese que le coach lit et que le rapport IA resume. Elle
 * agrege seances, sommeil, alimentation, douleurs, poids et respect des
 * creneaux en une trentaine de valeurs. Une seule qui derive, et le coach
 * prend une decision sur un chiffre faux sans jamais s'en apercevoir.
 *
 * Le test compare donc la totalite du resultat, champ par champ, sur des
 * semaines completes tirees au sort.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { bilanHebdomadaire } from "../app/src/lib/bilan.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

const LUNDI = "2026-08-31";

function tirage(graine) {
  let etat = graine >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

function decaler(iso, jours) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
}

const ZONES = ["épaule droite", "genou gauche", "bas du dos"];
const ROUTINES = [{ id: "r1", name: "Haut" }, { id: "r2", name: "Bas" }];

/** Une semaine complete de donnees, avec de l'historique avant elle. */
function scenario(alea) {
  const jour = () => decaler(LUNDI, Math.floor(alea() * 7));

  const sessions = Array.from({ length: Math.floor(alea() * 6) }, (_, i) => ({
    id: "s" + i,
    date: jour(),
    startTime: alea() < 0.7 ? "18:0" + Math.floor(alea() * 9) : null,
    slotId: alea() < 0.4 ? "c0" : null,
    routineId: alea() < 0.5 ? ROUTINES[Math.floor(alea() * 2)].id : null,
    rpe: alea() < 0.6 ? Math.floor(alea() * 10) + 1 : null,
    // Certaines notes depassent volontairement 140 caracteres : c'est la
    // seule facon d'eprouver la troncature. Sans elles, la supprimer
    // passait inapercu — verifie en la mutant.
    notes:
      alea() < 0.4
        ? "Note de séance " + i + " détaillée ".repeat(Math.floor(alea() * 20)) + "fin"
        : "",
    deload: alea() < 0.15,
    maintenance: alea() < 0.15,
    pains:
      alea() < 0.4
        ? [{ zone: ZONES[Math.floor(alea() * ZONES.length)], level: Math.floor(alea() * 11) }]
        : []
  }));

  const dailyForm = Array.from({ length: Math.floor(alea() * 8) }, (_, i) => ({
    id: "f" + i,
    date: jour(),
    sleepHours: alea() < 0.8 ? Math.round(alea() * 100) / 10 : null,
    sleepQuality: alea() < 0.7 ? Math.ceil(alea() * 5) : null,
    energy: alea() < 0.6 ? Math.ceil(alea() * 10) : null,
    stress: alea() < 0.6 ? Math.ceil(alea() * 10) : null,
    // Zero est une valeur possible : elle doit etre ignoree, pas moyennee.
    waterMl: alea() < 0.7 ? Math.floor(alea() * 3000) : null,
    steps: alea() < 0.7 ? Math.floor(alea() * 15000) : null,
    sleepNote: alea() < 0.3 ? "mal dormi " + i : "",
    stressNote: alea() < 0.3 ? "journée tendue " + i : ""
  }));

  // De l'historique avant la semaine : il sert de reference aux ecarts de
  // poids. Sans lui, on ne testerait jamais ce chemin.
  const bodyLogs = [
    ...Array.from({ length: Math.floor(alea() * 4) }, (_, i) => ({
      date: decaler(LUNDI, -20 + i * 3),
      weightKg: alea() < 0.9 ? 78 + Math.round(alea() * 40) / 10 : null,
      bodyFatPct: alea() < 0.5 ? 15 + Math.round(alea() * 50) / 10 : null,
      muscleKg: alea() < 0.5 ? 35 + Math.round(alea() * 30) / 10 : null
    })),
    ...Array.from({ length: Math.floor(alea() * 4) }, () => ({
      date: jour(),
      weightKg: alea() < 0.9 ? 78 + Math.round(alea() * 40) / 10 : null,
      bodyFatPct: alea() < 0.5 ? 15 + Math.round(alea() * 50) / 10 : null,
      muscleKg: alea() < 0.5 ? 35 + Math.round(alea() * 30) / 10 : null
    }))
  ];

  const logEntries = Array.from({ length: Math.floor(alea() * 14) }, (_, i) => ({
    id: "e" + i,
    date: jour(),
    calories: Math.floor(alea() * 900),
    protein: Math.floor(alea() * 60),
    carbs: Math.floor(alea() * 120),
    fat: Math.floor(alea() * 40)
  }));

  const weekPlan = alea() < 0.6 ? { mon: "r1", wed: "r2", fri: "r1" } : null;

  const hardWeeks =
    alea() < 0.3 ? { [LUNDI]: { active: alea() < 0.7, reason: alea() < 0.5 ? "travail" : "inconnue" } } : null;

  const profile = {
    weeklyWorkoutTarget: alea() < 0.7 ? Math.ceil(alea() * 5) : 0,
    targetSleepHours: alea() < 0.5 ? 7 : 8,
    coachingMode: alea() < 0.5 ? "enligne" : "presentiel",
    slots:
      alea() < 0.6
        ? [
            { id: "c0", day: "wed", time: "18:00", place: "Salle" },
            { id: "c1", day: "sat", time: "10:00", place: "" }
          ]
        : []
  };

  const targets = { calories: 1800 + Math.floor(alea() * 1200), protein: 150, carbs: 220, fat: 70 };

  return {
    donnees: { sessions, dailyForm, bodyLogs, logEntries, weekPlan, routines: ROUTINES, hardWeeks },
    profile,
    targets
  };
}

/**
 * Les bilans imbriques ont ete renommes en francais comme le reste du
 * portage. On retablit la correspondance pour comparer, plutot que de
 * garder deux vocabulaires dans le meme fichier.
 */
const memesBilans = (nouveau, ancien, quoi) => {
  if (ancien === null || nouveau === null) {
    assert.equal(nouveau, ancien, quoi + " : l'un est null et pas l'autre");
    return;
  }
  assert.equal(nouveau.prevus, ancien.planned, quoi + ".prevus");
  assert.equal(nouveau.honores ?? nouveau.faits, ancien.honored ?? ancien.done, quoi + ".honores/faits");
  assert.equal(nouveau.manques, ancien.missed, quoi + ".manques");
};

/** Champs simples, compares valeur pour valeur. */
const CHAMPS = [
  "weekKey", "start", "end", "workoutsCount",
  "avgCalories", "avgProtein", "avgCarbs", "avgFat",
  "loggedDaysCount", "avgSleepH", "avgSleepQuality", "avgEnergy", "avgStress",
  "avgWaterMl", "avgSteps", "deloadCount", "maintenanceCount",
  "hardWeek", "hardWeekReason",
  "latestWeight", "weightDelta", "latestFatPct", "fatPctDelta",
  "latestMuscle", "muscleDelta", "adherence", "hasAnyData"
];

describe("bilan hebdomadaire", () => {
  test("les deux versions concordent sur 250 semaines tirees au sort", () => {
    const alea = tirage(20260905);

    for (let i = 0; i < 250; i++) {
      const { donnees, profile, targets } = scenario(alea);
      const ancien = legacy.computeWeekStats(LUNDI, donnees, profile, targets);
      const nouveau = bilanHebdomadaire(LUNDI, donnees, profile, targets);
      const contexte = "semaine " + i;

      for (const champ of CHAMPS) {
        assert.equal(nouveau[champ], ancien[champ], `${champ} — ${contexte}`);
      }

      assert.deepEqual(Array.from(nouveau.dayNotes), Array.from(ancien.dayNotes), "dayNotes — " + contexte);
      assert.deepEqual(Array.from(nouveau.sessionNotes), Array.from(ancien.sessionNotes), "sessionNotes — " + contexte);
      assert.deepEqual(Array.from(nouveau.painLines), Array.from(ancien.painLines), "painLines — " + contexte);
      assert.deepEqual(
        Array.from(nouveau.pains, (p) => ({ ...p })),
        Array.from(ancien.pains, (p) => ({ ...p })),
        "pains — " + contexte
      );

      memesBilans(nouveau.slotSummary, ancien.slotSummary, contexte + " slotSummary");
      memesBilans(nouveau.planSummary, ancien.planSummary, contexte + " planSummary");
    }
  });

  test("une semaine totalement vide donne le meme resultat", () => {
    const vide = {
      sessions: [], dailyForm: [], bodyLogs: [], logEntries: [],
      weekPlan: null, routines: [], hardWeeks: null
    };
    const profile = { weeklyWorkoutTarget: 3, targetSleepHours: 8, slots: [] };
    const targets = { calories: 2200, protein: 150, carbs: 220, fat: 70 };

    const ancien = legacy.computeWeekStats(LUNDI, vide, profile, targets);
    const nouveau = bilanHebdomadaire(LUNDI, vide, profile, targets);
    for (const champ of CHAMPS) {
      assert.equal(nouveau[champ], ancien[champ], champ);
    }
  });

  test("une moyenne absente vaut null, jamais zero", () => {
    // « Je n'ai pas la donnee » et « il a dormi zero heure » ne se
    // racontent pas pareil dans un bilan lu par un coach.
    const donnees = {
      sessions: [], dailyForm: [{ id: "f", date: LUNDI, waterMl: 0, steps: 0 }],
      bodyLogs: [], logEntries: [], weekPlan: null, routines: [], hardWeeks: null
    };
    const b = bilanHebdomadaire(LUNDI, donnees, { slots: [] }, { calories: 2000 });
    assert.equal(b.avgSleepH, null);
    assert.equal(b.avgWaterMl, null, "zero pas saisi ne doit pas devenir une moyenne de zero");
    assert.equal(b.avgSteps, null);
  });
});
