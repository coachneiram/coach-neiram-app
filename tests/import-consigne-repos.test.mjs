/**
 * Import du tableau du coach : consigne et repos par exercice (24 octobre
 * 2026), et consigne reprise au demarrage de la seance.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CONSIGNE_MAX, consigneDepuisTexte, reposDepuisTexte, seancesDepuisTexte } from "../app/src/lib/import-seances.js";
import { preparerSeance } from "../app/src/lib/constructeur-seances.js";

describe("reposDepuisTexte", () => {
  const cas = [
    ["90 s", 90],
    ["90", 90],
    ["2", 120],
    ["2 min", 120],
    ["2'", 120],
    ["1 min 30", 90],
    ["1'30", 90],
    ["1min30", 90],
    ['45"', 45],
    ["1-2 min", 120],
    ["60-90 s", 90],
    ["1,5 min", 90],
    ["", null],
    ["libre", null]
  ];
  for (const [texte, attendu] of cas) test(`« ${texte} » → ${attendu}`, () => assert.equal(reposDepuisTexte(texte), attendu));
});

describe("consigneDepuisTexte", () => {
  test("espaces resserres, tiret seul ignore", () => {
    assert.equal(consigneDepuisTexte("  dos   droit "), "dos droit");
    assert.equal(consigneDepuisTexte("-"), "");
    assert.equal(consigneDepuisTexte(null), "");
  });
  test(`coupee a ${CONSIGNE_MAX} caracteres`, () => {
    const c = consigneDepuisTexte("a".repeat(300));
    assert.equal(c.length, CONSIGNE_MAX);
    assert.ok(c.endsWith("…"));
  });
});

describe("tableau importe", () => {
  const CSV = [
    "Séance,Exercice,Séries,Reps,Charge (kg),Repos,Notes",
    'Bas du corps,Squat,4,6,80,2 min 30,"Descends lentement, 3 s"',
    ",Fentes,3,10,20,90 s,",
    ",Vélo,1,20,,,"
  ].join("\n");
  const r = seancesDepuisTexte(CSV);
  const seance = (r.seances || r)[0];
  const exos = seance.exercises;
  test("consigne et repos lus sur la ligne de l'exercice", () => {
    assert.equal(exos[0].consigne, "Descends lentement, 3 s");
    assert.equal(exos[0].repos, 150);
    assert.equal(exos[1].repos, 90);
    assert.equal("consigne" in exos[1], false);
  });
});

describe("preparerSeance garde la consigne a jour", () => {
  const routine = {
    id: "r1",
    name: "Bas du corps",
    source: "sheets",
    exercises: [{ id: "a", name: "Squat", mode: "muscu", sets: "4", reps: "6", weight: "80", consigne: "Nouvelle consigne" }, { id: "b", name: "Fentes", mode: "muscu", sets: "3", reps: "10" }]
  };
  test("premiere fois : la consigne de la seance type", () => {
    const s = preparerSeance(routine, [], "2026-10-24");
    assert.equal(s.exercises[0].consigne, "Nouvelle consigne");
  });
  test("seance d'avant : la consigne de la seance type remplace l'ancienne, et disparait si le coach l'a retiree", () => {
    const avant = {
      id: "s1",
      date: "2026-10-20",
      routineId: "r1",
      exercises: [
        { id: "x", name: "Squat", mode: "muscu", sets: "4", reps: "6", weight: "80", consigne: "Ancienne" },
        { id: "y", name: "Fentes", mode: "muscu", sets: "3", reps: "10", weight: "20", consigne: "Retiree" }
      ]
    };
    const s = preparerSeance(routine, [avant], "2026-10-24");
    assert.equal(s.exercises[0].consigne, "Nouvelle consigne");
    assert.equal("consigne" in s.exercises[1], false);
  });
  test("seance type programmee dans l'app : la consigne suit", () => {
    const prog = { id: "r2", name: "Full body", programme: true, exercises: [{ id: "c", name: "Presse à cuisses", mode: "muscu", sets: "3", reps: "10", consigne: "Pieds largeur bassin" }] };
    assert.equal(preparerSeance(prog, [], "2026-10-24").exercises[0].consigne, "Pieds largeur bassin");
  });
});
