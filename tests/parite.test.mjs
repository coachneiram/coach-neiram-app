/**
 * Parite entre l'ancienne et la nouvelle implementation.
 *
 * Pendant la migration, deux versions du meme calcul coexistent : celle de
 * index.html, en production, et celle de app/src/lib, en construction. Toute
 * divergence signifierait qu'un client verrait ses objectifs changer le jour
 * de la bascule, sans explication.
 *
 * Ces tests confrontent les deux implementations sur des centaines de cas
 * generes, y compris des profils absurdes ou incomplets. Ils doivent rester
 * verts jusqu'a la bascule (phase 8) ; ils deviendront alors inutiles et
 * pourront etre supprimes avec l'ancien code.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import * as neuf from "../app/src/lib/nutrition.js";
import * as dates from "../app/src/lib/dates.js";

const ancien = chargerApp();

/** Ramene un objet du bac a sable dans le realm du test. */
const plat = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));

/** Generateur deterministe : un echec est toujours reproductible. */
function generateur(graine) {
  let etat = graine;
  return () => {
    etat = (etat * 1103515245 + 12345) % 2147483648;
    return etat / 2147483648;
  };
}

const SEXES = ["homme", "femme"];
const OBJECTIFS = ["perte", "prise", "maintien", "performance", "inconnu"];
const ACTIVITES = ["sedentaire", "leger", "modere", "actif", "tresactif", "inexistant"];
const METIERS = ["sedentaire", "actif", "tres-actif", undefined];

function profilAleatoire(hasard) {
  const choisir = (liste) => liste[Math.floor(hasard() * liste.length)];
  return {
    sex: choisir(SEXES),
    heightCm: Math.round(140 + hasard() * 70),
    age: Math.round(16 + hasard() * 60),
    startWeightKg: Math.round(45 + hasard() * 80),
    activityLevel: choisir(ACTIVITES),
    jobType: choisir(METIERS),
    goal: choisir(OBJECTIFS),
    calibratedMaintenanceKcal: hasard() < 0.25 ? Math.round(1500 + hasard() * 1800) : undefined
  };
}

describe("computeTargets : ancien et nouveau donnent le meme resultat", () => {
  test("sur 400 profils generes", () => {
    const hasard = generateur(20260905);
    for (let i = 0; i < 400; i++) {
      const profil = profilAleatoire(hasard);
      const poids = hasard() < 0.3 ? null : Math.round(45 + hasard() * 80);

      const a = plat(ancien.computeTargets(profil, poids));
      const n = neuf.computeTargets(profil, poids);

      assert.deepEqual(
        n,
        a,
        "divergence sur le profil " + JSON.stringify({ ...profil, poids })
      );
    }
  });

  test("sur les profils incomplets, ou l'ancien renvoie null", () => {
    const incomplets = [
      { sex: "homme", heightCm: null, age: 30, startWeightKg: 80, goal: "maintien" },
      { sex: "femme", heightCm: 170, age: null, startWeightKg: 60, goal: "perte" },
      { sex: "homme", heightCm: 180, age: 30, startWeightKg: 0, goal: "prise" },
      { sex: "homme", heightCm: 180, age: 30, startWeightKg: 80, goal: undefined }
    ];
    for (const profil of incomplets) {
      assert.deepEqual(
        neuf.computeTargets(profil, null),
        plat(ancien.computeTargets(profil, null)),
        "divergence sur " + JSON.stringify(profil)
      );
    }
  });
});

describe("computeBMR : parite", () => {
  test("sur 300 morphologies generees", () => {
    const hasard = generateur(1234);
    for (let i = 0; i < 300; i++) {
      const entree = {
        sex: SEXES[Math.floor(hasard() * 2)],
        weightKg: Math.round(40 + hasard() * 90),
        heightCm: Math.round(140 + hasard() * 70),
        age: Math.round(16 + hasard() * 70)
      };
      assert.equal(
        neuf.computeBMR(entree),
        ancien.computeBMR(entree),
        "divergence sur " + JSON.stringify(entree)
      );
    }
  });

  test("sur les entrees vides", () => {
    for (const entree of [
      { sex: "homme", weightKg: 0, heightCm: 180, age: 30 },
      { sex: "homme", weightKg: 80, heightCm: null, age: 30 },
      { sex: "femme", weightKg: 80, heightCm: 180, age: undefined }
    ]) {
      assert.equal(neuf.computeBMR(entree), ancien.computeBMR(entree));
    }
  });
});

describe("computeCalibration : parite", () => {
  const jour = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  test("sur 100 historiques generes", () => {
    const hasard = generateur(777);
    for (let i = 0; i < 100; i++) {
      const nbJours = Math.floor(hasard() * 20);
      const journal = Array.from({ length: nbJours }, (_, j) => ({
        date: jour(j),
        calories: Math.round(1200 + hasard() * 2000)
      }));
      const pesees = Array.from({ length: Math.floor(hasard() * 5) }, (_, j) => ({
        date: jour(j * 4),
        weightKg: Math.round((60 + hasard() * 40) * 10) / 10
      }));

      assert.deepEqual(
        neuf.computeCalibration(pesees, journal, 28),
        plat(ancien.computeCalibration(pesees, journal, 28)),
        "divergence sur un historique de " + nbJours + " jours et " + pesees.length + " pesees"
      );
    }
  });
});

describe("computeRemainingToday : parite", () => {
  test("sur 200 journaux generes, y compris en depassement", () => {
    const hasard = generateur(4242);
    const aujourdHui = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < 200; i++) {
      const entrees = Array.from({ length: Math.floor(hasard() * 8) }, () => ({
        date: hasard() < 0.8 ? aujourdHui : jourPrecedent(),
        calories: Math.round(hasard() * 1200),
        protein: Math.round(hasard() * 80),
        carbs: Math.round(hasard() * 150),
        fat: Math.round(hasard() * 60)
      }));
      const cibles = {
        calories: Math.round(1500 + hasard() * 1500),
        protein: Math.round(100 + hasard() * 100),
        carbs: Math.round(150 + hasard() * 250),
        fat: Math.round(40 + hasard() * 60)
      };

      assert.deepEqual(
        neuf.computeRemainingToday(entrees, cibles),
        plat(ancien.computeRemainingToday(entrees, cibles)),
        "divergence sur " + entrees.length + " entrees"
      );
    }

    function jourPrecedent() {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    }
  });

  test("sans objectifs, les deux renvoient null", () => {
    assert.equal(neuf.computeRemainingToday([], null), ancien.computeRemainingToday([], null));
  });
});

describe("utilitaires de dates : parite", () => {
  test("addDays, y compris a cheval sur les mois et les annees", () => {
    const cas = [
      ["2026-01-31", 1],
      ["2026-12-31", 1],
      ["2026-03-01", -1],
      ["2026-02-28", 1],
      ["2028-02-28", 1], // annee bissextile
      ["2026-09-05", 0],
      ["2026-09-05", -400],
      ["2026-09-05", 400]
    ];
    for (const [date, n] of cas) {
      assert.equal(dates.addDays(date, n), ancien.addDays(date, n), `addDays(${date}, ${n})`);
    }
  });

  test("num et round", () => {
    for (const v of ["12.5", "abc", "", null, undefined, 0, -3.7, "8,5"]) {
      assert.equal(dates.num(v), ancien.num(v), "num(" + JSON.stringify(v) + ")");
    }
    for (const [n, d] of [
      [1.2345, 2],
      [null, 0],
      [-1.5, 0],
      [1000.5, 1]
    ]) {
      assert.equal(dates.round(n, d), ancien.round(n, d), `round(${n}, ${d})`);
    }
  });

  test("avg", () => {
    for (const arr of [[], [1], [1, 2, 3], [-5, 5]]) {
      assert.equal(dates.avg(arr), ancien.avg(arr), "avg(" + JSON.stringify(arr) + ")");
    }
  });
});

describe("les constantes n'ont pas derive", () => {
  test("niveaux d'activite identiques", () => {
    assert.deepEqual(neuf.ACTIVITY_LEVELS.map((a) => [a.id, a.mult]), plat(ancien.ACTIVITY_LEVELS).map((a) => [a.id, a.mult]));
  });

  test("ajustements caloriques par objectif identiques", () => {
    assert.deepEqual(neuf.GOAL_CAL_ADJUST, plat(ancien.GOAL_CAL_ADJUST));
  });
});
