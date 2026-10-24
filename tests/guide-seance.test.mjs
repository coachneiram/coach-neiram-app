/**
 * Guidage pendant la seance (app/src/lib/guide-seance.js), 24 octobre 2026.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  afficherGuide,
  dureeAuto,
  exerciceTermine,
  phraseCharge,
  progressionSeance,
  SEANCES_AVEC_GUIDE,
  TEXTES_GUIDE
} from "../app/src/lib/guide-seance.js";

const serie = (fait) => ({ weight: "60", reps: "8", rpe: "", fait });

describe("avancement", () => {
  test("series cochees sur series prevues, cardio et lignes vides ignores", () => {
    const exos = [
      { name: "Squat", mode: "muscu", series: [serie(true), serie(true), serie(false)] },
      { name: "Gainage", mode: "pdc", series: [serie(true)] },
      { name: "Vélo", mode: "cardio", durationMin: 20 },
      { name: "", mode: "muscu", series: [serie(false)] }
    ];
    assert.deepEqual(progressionSeance(exos), { faites: 3, total: 4 });
    assert.deepEqual(progressionSeance(null), { faites: 0, total: 0 });
  });
  test("exercice termine : toutes ses series cochees", () => {
    assert.equal(exerciceTermine({ name: "Squat", series: [serie(true), serie(true)] }), true);
    assert.equal(exerciceTermine({ name: "Squat", series: [serie(true), serie(false)] }), false);
    assert.equal(exerciceTermine({ name: "Vélo", mode: "cardio" }), false);
    assert.equal(exerciceTermine(null), false);
  });
});

describe("duree calculee", () => {
  const t0 = Date.parse("2026-10-24T10:00:00Z");
  test("minutes depuis le demarrage", () => {
    assert.equal(dureeAuto(t0, t0 + 52 * 60000), 52);
  });
  test("rien de plausible : pas de duree", () => {
    assert.equal(dureeAuto(undefined, t0), null);
    assert.equal(dureeAuto(t0, t0 + 20000), null);
    assert.equal(dureeAuto(t0, t0 + 6 * 3600000), null);
  });
});

describe("textes", () => {
  test("charge proposee en clair, avec la virgule", () => {
    assert.equal(
      phraseCharge({ from: 60, delta: 2.5, reason: "marge confortable" }, "62.5"),
      "Charge proposée : 62,5 kg (+2,5 kg) — la dernière fois : marge confortable."
    );
    assert.match(phraseCharge({ from: 60, delta: -2.5, reason: "à l'échec" }, "57.5"), /57,5 kg \(−2,5 kg\)/);
    assert.match(phraseCharge({ from: 60, delta: 0, reason: "proche de la limite" }, "60"), /60 kg, comme la dernière fois/);
    assert.equal(phraseCharge(null, "60"), "");
    assert.equal(TEXTES_GUIDE.garder(62.5), "Garder 62,5 kg");
  });
  test("mode d'emploi : 3 etapes, montre aux premieres seances seulement", () => {
    assert.equal(TEXTES_GUIDE.etapes.length, 3);
    assert.equal(afficherGuide(0), true);
    assert.equal(afficherGuide(SEANCES_AVEC_GUIDE - 1), true);
    assert.equal(afficherGuide(SEANCES_AVEC_GUIDE), false);
  });
});
