/**
 * Reparation douce des donnees au chargement (lib/reparer-donnees.js).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reparerCollection } from "../app/src/lib/reparer-donnees.js";

test("une valeur qui n'est pas une liste donne une liste vide", () => {
  assert.deepEqual(reparerCollection("sessions", null), []);
  assert.deepEqual(reparerCollection("sessions", { a: 1 }), []);
  assert.deepEqual(reparerCollection("inconnue", "x"), []);
});

test("seules les entrees qui ne sont pas des objets sont retirees", () => {
  const r = reparerCollection("logEntries", [null, "x", 3, [], { id: "a", name: "Riz", calories: 200 }]);
  assert.deepEqual(r, [{ id: "a", name: "Riz", calories: 200 }]);
});

test("seance : exercices en liste d'objets, noms en texte, series non-liste retirees", () => {
  const [s] = reparerCollection("sessions", [
    { id: "s", date: "2026-10-23", routineId: "r", exercises: "abime" }
  ]);
  assert.deepEqual(s.exercises, []);
  const [t] = reparerCollection("sessions", [
    { id: "t", routineId: "r", exercises: [{ name: 12, sets: 3 }, null, { name: { x: 1 }, series: "abime" }] }
  ]);
  assert.deepEqual(t.exercises, [{ name: "12", sets: 3 }, { name: "" }]);
});

test("rien n'est perdu : les champs inconnus et les entrees saines restent identiques", () => {
  const saine = { id: "s", date: "2026-10-23", routineId: "r", exercises: [{ id: "e", name: "Squat", series: [{ reps: 5 }] }], notes: "ok", champFutur: 42 };
  assert.deepEqual(reparerCollection("sessions", [saine]), [saine]);
  const routine = { id: "r", name: "Haut du corps", color: "#2DD4BF" };
  assert.deepEqual(reparerCollection("routines", [routine]), [routine], "une seance type sans exercices n'en recoit pas");
  const mesure = { id: "m", date: "2026-10-23", waist: 80 };
  assert.deepEqual(reparerCollection("measurements", [mesure]), [mesure]);
});

test("l'app repare chaque liste au chargement", () => {
  const app = readFileSync(new URL("../app/src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /return reparerCollection\(nom, charger\(cle, \[\]\)\);/);
});
