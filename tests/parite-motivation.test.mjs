/**
 * Parite des messages d'encouragement : ancienne version contre nouvelle.
 *
 * Ces messages sont ce que le client lit en premier en ouvrant son journal.
 * La regle qui les gouverne : un message doit s'appuyer sur un chiffre reel.
 * Les messages passe-partout ne servent que si aucun message concret ne
 * s'applique — sinon ils monopolisent l'affichage.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { VARIANTES, construireMotivation, serieDeJours } from "../app/src/lib/motivation.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

/** Contexte type, que chaque cas modifie. */
const ctx = (extra = {}) => ({
  sessions: { target: 0, done: 0, left: 0 },
  proteinLeft: null,
  proteinDone: 0,
  proteinTarget: 0,
  waterLeftMl: null,
  stepsLeft: null,
  stepsDone: 0,
  stepsTarget: 8000,
  streakDays: 0,
  weightGapKg: null,
  emptyToday: false,
  hour: 14,
  seed: 0,
  ...extra
});

describe("parite sur une grille de situations", () => {
  test("les deux versions produisent le meme message", () => {
    let comparaisons = 0;

    for (const sessions of [
      { target: 0, done: 0, left: 0 },
      { target: 3, done: 1, left: 2 },
      { target: 3, done: 3, left: 0 }
    ]) {
      // 12 g encadre le seuil de 15 : sans cette valeur, l'abaisser a 10
      // ne changeait rien au resultat et la mutation passait inapercue.
      for (const proteinLeft of [null, 5, 12, 14, 15, 16, 60]) {
        for (const waterLeftMl of [null, 0, 500, 1500]) {
          for (const stepsLeft of [null, 0, 3000]) {
            for (const stepsDone of [0, 4000]) {
              for (const streakDays of [0, 2, 3, 12]) {
                for (const weightGapKg of [null, 0.2, 0.3, 4.5]) {
                  for (const hour of [8, 11, 12, 20]) {
                    for (const seed of [0, 1, 2, 3, 7, 13, 100]) {
                      const c = ctx({
                        sessions,
                        proteinLeft,
                        proteinDone: 80,
                        proteinTarget: 150,
                        waterLeftMl,
                        stepsLeft,
                        stepsDone,
                        streakDays,
                        weightGapKg,
                        hour,
                        seed,
                        emptyToday: true
                      });
                      assert.equal(
                        construireMotivation(c),
                        legacy.buildMotivation(c),
                        "divergence pour " + JSON.stringify(c)
                      );
                      comparaisons++;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    assert.ok(comparaisons > 10000, "trop peu de comparaisons : " + comparaisons);
  });

  test("les textes sont ceux de l'application actuelle", () => {
    for (const cle of Object.keys(VARIANTES)) {
      assert.equal(
        VARIANTES[cle].length,
        legacy.MOTIVATION_VARIANTS[cle].length,
        "nombre de variantes différent pour " + cle
      );
    }
  });

  test("aucune categorie de message n'a ete perdue", () => {
    assert.deepEqual(Object.keys(VARIANTES).sort(), Object.keys(legacy.MOTIVATION_VARIANTS).sort());
  });
});

describe("regles d'affichage", () => {
  test("rien ne s'affiche quand il n'y a rien a dire", () => {
    assert.equal(construireMotivation(ctx()), null);
  });

  test("le message passe-partout ne sort que faute de mieux", () => {
    // Sinon il masquerait les informations utiles.
    const seul = construireMotivation(ctx({ emptyToday: true }));
    assert.match(seul, /Rien de saisi|Journée vide/);

    const avecConcret = construireMotivation(ctx({ emptyToday: true, streakDays: 5 }));
    assert.match(avecConcret, /jours/);
    assert.doesNotMatch(avecConcret, /Rien de saisi|Journée vide/);
  });

  test("proteines et eau attendent le milieu de journee", () => {
    // Rappeler a 8 h qu'il reste tout a couvrir n'apprend rien.
    assert.equal(construireMotivation(ctx({ proteinLeft: 60, hour: 8 })), null);
    assert.notEqual(construireMotivation(ctx({ proteinLeft: 60, hour: 12 })), null);
    assert.equal(construireMotivation(ctx({ waterLeftMl: 1500, hour: 10 })), null);
    assert.notEqual(construireMotivation(ctx({ waterLeftMl: 1500, hour: 11 })), null);
  });

  test("les pas ne sont rappeles qu'a ceux qui les suivent", () => {
    // Sinon on reprocherait un objectif a quelqu'un qui ne compte pas ses pas.
    assert.equal(construireMotivation(ctx({ stepsLeft: 3000, stepsDone: 0 })), null);
    assert.notEqual(construireMotivation(ctx({ stepsLeft: 3000, stepsDone: 4000 })), null);
  });

  test("la serie ne se felicite qu'a partir de trois jours", () => {
    assert.equal(construireMotivation(ctx({ streakDays: 2 })), null);
    assert.notEqual(construireMotivation(ctx({ streakDays: 3 })), null);
  });

  test("un ecart de poids negligeable n'est pas signale", () => {
    assert.equal(construireMotivation(ctx({ weightGapKg: 0.3 })), null);
    assert.notEqual(construireMotivation(ctx({ weightGapKg: 0.4 })), null);
  });

  test("le message est stable a graine egale, et tourne avec elle", () => {
    // Cale sur l'heure : le message change au fil de la journee mais reste
    // stable si le client rouvre l'application dans la minute.
    const base = { streakDays: 5, sessions: { target: 3, done: 1, left: 2 } };
    assert.equal(construireMotivation(ctx({ ...base, seed: 42 })), construireMotivation(ctx({ ...base, seed: 42 })));

    const vus = new Set();
    for (let seed = 0; seed < 12; seed++) vus.add(construireMotivation(ctx({ ...base, seed })));
    assert.ok(vus.size > 2, "le message ne tourne pas : " + vus.size + " variantes");
  });
});

describe("serie de jours consecutifs", () => {
  const jour = (n) => {
    const d = new Date("2026-09-05T00:00:00");
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  test("une seule trace suffit a compter le jour", () => {
    assert.equal(serieDeJours({ date: "2026-09-05", repas: [{ date: jour(0) }], journal: [], seances: [] }), 1);
    assert.equal(serieDeJours({ date: "2026-09-05", repas: [], journal: [], seances: [{ date: jour(0) }] }), 1);
  });

  test("la serie s'arrete au premier jour vide", () => {
    const repas = [jour(0), jour(1), jour(3)].map((date) => ({ date }));
    assert.equal(serieDeJours({ date: "2026-09-05", repas, journal: [], seances: [] }), 2);
  });

  test("aucune donnee donne une serie nulle", () => {
    assert.equal(serieDeJours({ date: "2026-09-05", repas: [], journal: [], seances: [] }), 0);
  });

  test("les sources se completent au lieu de se remplacer", () => {
    // Un jour ou le client n'a note que son sommeil compte autant qu'un
    // jour ou il a tout saisi.
    const repas = [{ date: jour(0) }];
    const journal = [{ date: jour(1) }];
    const seances = [{ date: jour(2) }];
    assert.equal(serieDeJours({ date: "2026-09-05", repas, journal, seances }), 3);
  });

  test("la remontee s'arrete a la limite fixee", () => {
    // Sans borne, un client tres regulier ferait parcourir des annees de
    // donnees a chaque ouverture du journal.
    const repas = Array.from({ length: 100 }, (_, i) => ({ date: jour(i) }));
    assert.equal(serieDeJours({ date: "2026-09-05", repas, journal: [], seances: [] }), 60);
    assert.equal(serieDeJours({ date: "2026-09-05", repas, journal: [], seances: [], maximum: 10 }), 10);
  });
});
