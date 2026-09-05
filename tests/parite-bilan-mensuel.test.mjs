/**
 * Parite du bilan mensuel : ancienne version contre nouvelle.
 *
 * Le mois est l'echelle ou les mensurations deviennent lisibles, et la
 * seule vue qui rapporte les seances a une cadence hebdomadaire. Deux
 * pieges y vivent : la longueur variable des mois (fevrier bissextile), et
 * le fait qu'un mois en cours n'est pas termine.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { bilanMensuel } from "../app/src/lib/bilan-mensuel.js";
import { getMonthRange } from "../app/src/lib/semaine.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

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

/**
 * Mois choisis pour leurs longueurs differentes, fevrier bissextile inclus.
 *
 * Le mois EN COURS en fait partie, et ce n'est pas un detail : la cadence
 * hebdomadaire ne compte alors que les jours ecoules. Sans lui, remplacer
 * cette regle par une division sur le mois entier passait inapercu —
 * verifie en la mutant.
 */
const MOIS_EN_COURS = new Date().toISOString().slice(0, 7);
const MOIS = ["2026-01", "2026-02", "2024-02", "2026-04", "2026-08", MOIS_EN_COURS];

function scenario(alea, cleMois) {
  const { start, end } = getMonthRange(cleMois);
  // Pour le mois en cours, on ne genere pas de donnees dans le futur :
  // l'application n'en produit jamais, et cela brouillerait la cadence.
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const dernierJour = Math.min(
    27,
    Math.round((new Date((aujourdhui < end ? aujourdhui : end) + "T00:00:00") - new Date(start + "T00:00:00")) / 864e5)
  );
  const jour = () => decaler(start, Math.floor(alea() * Math.max(1, dernierJour + 1)));

  const mesure = (date) => ({
    id: "m" + date,
    date,
    poitrine: alea() < 0.9 ? 100 + Math.round(alea() * 50) / 10 : null,
    taille: alea() < 0.9 ? 84 + Math.round(alea() * 50) / 10 : null,
    hanches: alea() < 0.6 ? 98 + Math.round(alea() * 40) / 10 : null,
    brasD: alea() < 0.5 ? 35 + Math.round(alea() * 20) / 10 : null
  });

  return {
    sessions: Array.from({ length: Math.floor(alea() * 14) }, (_, i) => ({ id: "s" + i, date: jour() })),
    dailyForm: Array.from({ length: Math.floor(alea() * 20) }, (_, i) => ({
      id: "f" + i,
      date: jour(),
      sleepHours: alea() < 0.8 ? Math.round(alea() * 100) / 10 : null,
      sleepQuality: alea() < 0.7 ? Math.ceil(alea() * 5) : null,
      energy: alea() < 0.6 ? Math.ceil(alea() * 10) : null,
      stress: alea() < 0.6 ? Math.ceil(alea() * 10) : null,
      waterMl: alea() < 0.7 ? Math.floor(alea() * 3000) : null,
      steps: alea() < 0.7 ? Math.floor(alea() * 15000) : null
    })),
    bodyLogs: [
      // De l'historique avant le mois : reference des ecarts.
      ...Array.from({ length: Math.floor(alea() * 3) }, (_, i) => ({
        date: decaler(start, -30 + i * 7),
        weightKg: 78 + Math.round(alea() * 40) / 10,
        bodyFatPct: alea() < 0.5 ? 15 + Math.round(alea() * 50) / 10 : null,
        muscleKg: alea() < 0.5 ? 35 + Math.round(alea() * 30) / 10 : null
      })),
      ...Array.from({ length: Math.floor(alea() * 6) }, () => ({
        date: jour(),
        weightKg: alea() < 0.9 ? 78 + Math.round(alea() * 40) / 10 : null,
        bodyFatPct: alea() < 0.5 ? 15 + Math.round(alea() * 50) / 10 : null,
        muscleKg: alea() < 0.5 ? 35 + Math.round(alea() * 30) / 10 : null
      }))
    ],
    logEntries: Array.from({ length: Math.floor(alea() * 40) }, (_, i) => ({
      id: "e" + i,
      date: jour(),
      calories: Math.floor(alea() * 900),
      protein: Math.floor(alea() * 60),
      carbs: Math.floor(alea() * 120),
      fat: Math.floor(alea() * 40)
    })),
    // Trois cas a couvrir : aucune prise, une seule, et une anterieure.
    measurements: (() => {
      const tire = alea();
      if (tire < 0.25) return [];
      if (tire < 0.5) return [mesure(jour())];
      if (tire < 0.75) return [mesure(jour()), mesure(jour())];
      return [mesure(decaler(start, -40)), mesure(jour())];
    })()
  };
}

const CHAMPS = [
  "monthKey", "start", "end", "workoutsCount", "workoutsPerWeek",
  "avgCalories", "avgProtein", "avgCarbs", "avgFat", "loggedDaysCount",
  "avgSleepH", "avgSleepQuality", "avgEnergy", "avgStress", "avgWaterMl", "avgSteps",
  "latestWeight", "weightDelta", "latestFatPct", "fatPctDelta",
  "latestMuscle", "muscleDelta", "measureDate", "measureBaseDate", "hasAnyData"
];

describe("bilan mensuel", () => {
  test("les deux versions concordent sur 250 mois tires au sort", () => {
    const alea = tirage(20260905);
    const profil = { weeklyWorkoutTarget: 3, targetSleepHours: 8, slots: [] };
    const objectifs = { calories: 2200, protein: 150, carbs: 220, fat: 70 };

    for (let i = 0; i < 250; i++) {
      const cleMois = MOIS[i % MOIS.length];
      const donnees = scenario(alea, cleMois);
      const ancien = legacy.computeMonthStats(cleMois, donnees, profil, objectifs);
      const nouveau = bilanMensuel(cleMois, donnees, profil, objectifs);
      const contexte = `mois ${cleMois}, tirage ${i}`;

      for (const champ of CHAMPS) {
        assert.equal(nouveau[champ], ancien[champ], `${champ} — ${contexte}`);
      }
      assert.deepEqual(
        Array.from(nouveau.measureDeltas, (m) => ({ ...m })),
        Array.from(ancien.measureDeltas, (m) => ({ ...m })),
        "measureDeltas — " + contexte
      );
    }
  });

  test("la longueur des mois est correcte, fevrier bissextile compris", () => {
    assert.deepEqual(getMonthRange("2026-01"), { start: "2026-01-01", end: "2026-01-31" });
    assert.deepEqual(getMonthRange("2026-04"), { start: "2026-04-01", end: "2026-04-30" });
    assert.deepEqual(getMonthRange("2026-02"), { start: "2026-02-01", end: "2026-02-28" });
    assert.deepEqual(getMonthRange("2024-02"), { start: "2024-02-01", end: "2024-02-29" });
  });

  test("une seule prise de mesures n'affiche pas un ecart de zero", () => {
    // Comparer une prise a elle-meme donnerait « 0 cm », ce qui se lit
    // comme une stagnation alors qu'il n'y a simplement pas de comparaison
    // possible.
    const donnees = {
      sessions: [], dailyForm: [], bodyLogs: [], logEntries: [],
      measurements: [{ id: "m1", date: "2026-04-10", taille: 84 }]
    };
    const b = bilanMensuel("2026-04", donnees, { slots: [] }, { calories: 2000 });
    assert.equal(b.measureBaseDate, null);
    assert.equal(b.measureDeltas.find((m) => m.id === "taille").delta, null);
  });

  test("un mois vide donne le meme resultat que l'original", () => {
    const vide = { sessions: [], dailyForm: [], bodyLogs: [], logEntries: [], measurements: [] };
    const ancien = legacy.computeMonthStats("2026-04", vide, { slots: [] }, { calories: 2000 });
    const nouveau = bilanMensuel("2026-04", vide, { slots: [] }, { calories: 2000 });
    for (const champ of CHAMPS) {
      assert.equal(nouveau[champ], ancien[champ], champ);
    }
  });
});
