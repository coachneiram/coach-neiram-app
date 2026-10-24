import { test } from "node:test";
import assert from "node:assert/strict";
import { chargeRecente, scoreForme } from "../app/src/lib/forme.js";

const D = "2026-10-23";
test("rien de note : pas de score", () => {
  assert.equal(scoreForme({ form: {}, seances: [], date: D }), null);
});

test("bien dormi, en forme, peu stresse : feu vert", () => {
  const r = scoreForme({ form: { sleepHours: 8, sleepQuality: 5, energy: 5, stress: 2 }, seances: [], date: D });
  assert.equal(r.niveau, "pousse");
  assert.ok(r.score >= 90);
});

test("nuit courte, fatigue, stress : recuperer", () => {
  const r = scoreForme({ form: { sleepHours: 4.5, sleepQuality: 1, energy: 1, stress: 9 }, seances: [], date: D });
  assert.equal(r.niveau, "recupere");
});

test("charge recente bien au-dessus de l'habitude : le score baisse", () => {
  const form = { sleepHours: 7.5, energy: 4, stress: 3 };
  const seance = (date, sets) => ({ date, exercises: [{ name: "Squat", sets, reps: 5, weight: 100 }] });
  const habituel = [seance("2026-10-10", 10), seance("2026-10-14", 10), seance("2026-10-18", 10)];
  const calme = scoreForme({ form, seances: habituel, date: D });
  const charge = scoreForme({ form, seances: [...habituel, seance("2026-10-22", 25), seance("2026-10-21", 25)], date: D });
  assert.ok(charge.score < calme.score);
  assert.ok(chargeRecente([...habituel, seance("2026-10-22", 25)], D) > 1.5);
});
