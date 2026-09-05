/**
 * Parite des series de tendances : ancienne version contre nouvelle.
 *
 * Ces series alimentent les courbes que le client regarde pour juger sa
 * progression. Elles reposent sur le bilan hebdomadaire, deja verifie
 * ailleurs — ce qui se joue ici, c'est le fenetrage des semaines et la
 * conservation des trous.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { clesDesDernieresSemaines, serieCorporelle, serieHebdomadaire } from "../app/src/lib/tendances.js";
import { getWeekKey } from "../app/src/lib/semaine.js";

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

const AUJOURDHUI = new Date().toISOString().slice(0, 10);

function decaler(iso, jours) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
}

function scenario(alea) {
  // Donnees reparties sur une dizaine de semaines passees, avec des trous.
  const jour = () => decaler(AUJOURDHUI, -Math.floor(alea() * 70));

  return {
    sessions: Array.from({ length: Math.floor(alea() * 25) }, (_, i) => ({ id: "s" + i, date: jour() })),
    dailyForm: Array.from({ length: Math.floor(alea() * 30) }, (_, i) => ({
      id: "f" + i,
      date: jour(),
      sleepHours: alea() < 0.8 ? Math.round(alea() * 100) / 10 : null,
      waterMl: alea() < 0.7 ? Math.floor(alea() * 3000) : null,
      steps: alea() < 0.7 ? Math.floor(alea() * 15000) : null
    })),
    bodyLogs: Array.from({ length: Math.floor(alea() * 15) }, () => ({
      date: jour(),
      weightKg: alea() < 0.85 ? 78 + Math.round(alea() * 40) / 10 : null,
      muscleKg: alea() < 0.5 ? 35 + Math.round(alea() * 30) / 10 : null
    })),
    logEntries: Array.from({ length: Math.floor(alea() * 50) }, (_, i) => ({
      id: "e" + i,
      date: jour(),
      calories: Math.floor(alea() * 900),
      protein: Math.floor(alea() * 60),
      carbs: Math.floor(alea() * 120),
      fat: Math.floor(alea() * 40)
    })),
    weekPlan: null,
    routines: [],
    hardWeeks: null
  };
}

describe("fenetre des dernieres semaines", () => {
  test("elle couvre le bon nombre de semaines, dans l'ordre chronologique", () => {
    const cles = clesDesDernieresSemaines(8, "2026-09-05");
    assert.equal(cles.length, 8);
    assert.equal(cles[cles.length - 1], getWeekKey("2026-09-05"), "la derniere doit être la semaine en cours");
    for (let i = 1; i < cles.length; i++) {
      assert.ok(cles[i] > cles[i - 1], "les semaines doivent être croissantes");
    }
  });

  test("chaque cle est bien un lundi, espace de sept jours", () => {
    const cles = clesDesDernieresSemaines(6, "2026-09-05");
    for (const cle of cles) assert.equal(getWeekKey(cle), cle);
    for (let i = 1; i < cles.length; i++) {
      const ecart = (new Date(cles[i]) - new Date(cles[i - 1])) / 864e5;
      assert.equal(ecart, 7, "écart entre " + cles[i - 1] + " et " + cles[i]);
    }
  });
});

describe("serie hebdomadaire", () => {
  test("les deux versions concordent sur 80 jeux de donnees", () => {
    const alea = tirage(20260905);
    const profil = { weeklyWorkoutTarget: 3, targetSleepHours: 8, slots: [] };
    const objectifs = { calories: 2200, protein: 150, carbs: 220, fat: 70 };

    for (let i = 0; i < 80; i++) {
      const donnees = scenario(alea);
      for (const nbSemaines of [4, 8, 12]) {
        const ancien = legacy.buildWeeklySeries(nbSemaines, donnees, profil, objectifs);
        const nouveau = serieHebdomadaire(nbSemaines, donnees, profil, objectifs);
        assert.deepEqual(
          Array.from(nouveau, (p) => ({ ...p })),
          Array.from(ancien, (p) => ({ ...p })),
          `jeu ${i}, ${nbSemaines} semaines`
        );
      }
    }
  });

  test("l'eau est exprimee en litres, pas en millilitres", () => {
    // Afficher « 2100 » a cote de « 7,5 heures de sommeil » melange deux
    // ordres de grandeur sur le meme graphique.
    const donnees = {
      sessions: [], dailyForm: [{ id: "f", date: AUJOURDHUI, waterMl: 2100 }],
      bodyLogs: [], logEntries: [], weekPlan: null, routines: [], hardWeeks: null
    };
    const serie = serieHebdomadaire(1, donnees, { slots: [] }, { calories: 2000 });
    assert.equal(serie[0].water, 2.1);
  });

  test("une semaine sans donnee laisse un trou, pas un zero", () => {
    // Un zero se lirait « il n'a rien bu, rien dormi ». Le trou coupe la
    // courbe, ce qui est la verite : on ne sait pas.
    const donnees = {
      sessions: [], dailyForm: [], bodyLogs: [], logEntries: [],
      weekPlan: null, routines: [], hardWeeks: null
    };
    const serie = serieHebdomadaire(4, donnees, { slots: [] }, { calories: 2000 });
    for (const point of serie) {
      assert.equal(point.calories, null);
      assert.equal(point.sleep, null);
      assert.equal(point.water, null);
      assert.equal(point.steps, null);
      assert.equal(point.workouts, 0, "le nombre de séances, lui, est bien zéro");
    }
  });
});

describe("series de composition corporelle", () => {
  test("elles sont triees et sans valeur absente", () => {
    const journal = [
      { date: "2026-03-01", weightKg: 80 },
      { date: "2026-01-01", weightKg: 82 },
      { date: "2026-02-01", weightKg: null },
      { date: "2026-02-15", weightKg: 81 }
    ];
    assert.deepEqual(
      serieCorporelle(journal, "weightKg").map((p) => p.value),
      [82, 81, 80]
    );
  });

  test("elles concordent avec ce que fait l'ecran actuel", () => {
    const alea = tirage(31337);
    for (let i = 0; i < 40; i++) {
      const { bodyLogs } = scenario(alea);
      for (const champ of ["weightKg", "muscleKg"]) {
        const attendu = bodyLogs
          .filter((b) => b[champ] != null)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((b) => b[champ]);
        assert.deepEqual(serieCorporelle(bodyLogs, champ).map((p) => p.value), attendu, champ + " — jeu " + i);
      }
    }
  });

  test("un journal absent ne fait pas tomber la courbe", () => {
    assert.deepEqual(serieCorporelle(null, "weightKg"), []);
  });
});
