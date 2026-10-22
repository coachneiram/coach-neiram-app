/**
 * Onglet Séances pour débutant (22 octobre 2026) : séance du jour, séance
 * type programmée, recherche dans la bibliothèque.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { apercuExercices, derniereDate, exercicesAnnonces, seanceDuJour } from "../app/src/lib/seance-du-jour.js";
import {
  exercicePourProgramme,
  exerciceProgramme,
  filtrerBibliotheque,
  preparerSeance
} from "../app/src/lib/constructeur-seances.js";
import { EXERCISE_LIBRARY } from "../app/src/lib/catalogues.js";

// Jeudi 22 octobre 2026.
const AUJ = "2026-10-22";
const A = { id: "a", name: "Full body A", color: "#2DD4BF" };
const B = { id: "b", name: "Full body B", color: "#F5A040" };

describe("séance du jour", () => {
  test("aucune séance type : on invite à créer la première", () => {
    assert.deepEqual(seanceDuJour([], [], {}, AUJ), { etat: "vide" });
  });

  test("sans programme : celle qui n'a jamais été faite d'abord", () => {
    const s = seanceDuJour([A, B], [{ id: "1", date: "2026-10-20", routineId: "a" }], {}, AUJ);
    assert.equal(s.etat, "rotation");
    assert.equal(s.routine.id, "b");
    assert.equal(s.derniere, null);
  });

  test("sans programme : sinon celle faite il y a le plus longtemps", () => {
    const seances = [
      { id: "1", date: "2026-10-15", routineId: "a" },
      { id: "2", date: "2026-10-17", routineId: "b" },
      { id: "3", date: "2026-10-20", routineId: "a" }
    ];
    const s = seanceDuJour([A, B], seances, {}, AUJ);
    assert.equal(s.routine.id, "b");
    assert.equal(s.derniere, "2026-10-17");
  });

  test("prévue aujourd'hui dans le programme", () => {
    const s = seanceDuJour([A, B], [], { thu: "b", fri: "a" }, AUJ);
    assert.equal(s.etat, "prevue");
    assert.equal(s.routine.id, "b");
  });

  test("programme sans rien aujourd'hui : repos, et la prochaine", () => {
    const s = seanceDuJour([A, B], [], { mon: "a", fri: "b" }, AUJ);
    assert.equal(s.etat, "repos");
    assert.equal(s.prochaine.routine.id, "b");
    assert.equal(s.prochaine.jour, "Vendredi");
  });

  test("déjà faite aujourd'hui : on ne pousse pas à en refaire une", () => {
    const s = seanceDuJour([A, B], [{ id: "1", date: AUJ, routineId: "b" }], { thu: "b" }, AUJ);
    assert.equal(s.etat, "faite");
    assert.equal(s.routine.id, "b");
  });

  test("programme qui pointe vers une séance type supprimée : ignoré", () => {
    const s = seanceDuJour([A], [], { thu: "zz" }, AUJ);
    assert.equal(s.etat, "rotation");
    assert.equal(s.routine.id, "a");
  });

  test("dernière date et aperçu", () => {
    assert.equal(derniereDate([{ date: "2026-10-01", routineId: "a" }, { date: "2026-10-09", routineId: "a" }], "a"), "2026-10-09");
    assert.equal(apercuExercices(["Squat", "Développé", "Rowing", "Gainage", "Fentes"]), "Squat · Développé · Rowing · +2");
    assert.deepEqual(exercicesAnnonces({ id: "a", exercises: [{ name: "Squat" }] }, []), ["Squat"]);
    assert.deepEqual(
      exercicesAnnonces(A, [{ date: "2026-10-01", routineId: "a", exercises: [{ name: "Presse" }] }]),
      ["Presse"]
    );
  });
});

describe("séance type programmée", () => {
  const presse = { name: "Presse à cuisses", mode: "muscu", defaults: { sets: 3, reps: 10 } };

  test("un exercice choisi garde ce qui se prévoit, rien de ce qui se mesure", () => {
    const e = exercicePourProgramme(presse);
    assert.deepEqual({ ...e, id: "x" }, { id: "x", name: "Presse à cuisses", mode: "muscu", sets: 3, reps: 10 });
  });

  const routine = {
    id: "r1",
    name: "Full body A",
    programme: true,
    exercises: [
      { id: "p1", name: "Presse à cuisses", mode: "muscu", sets: 4, reps: 8, repos: 120 },
      { id: "p2", name: "Rowing", mode: "muscu", sets: 3, reps: 12 }
    ]
  };

  test("la liste vient du programme, pas de la dernière fois", () => {
    const derniere = {
      id: "s1",
      date: "2026-10-15",
      routineId: "r1",
      exercises: [{ name: "Leg extension", mode: "muscu", sets: "3", reps: "12", weight: "30" }]
    };
    const s = preparerSeance(routine, [derniere], AUJ);
    assert.deepEqual(s.exercises.map((e) => e.name), ["Presse à cuisses", "Rowing"]);
    assert.equal(s.exercises[0].sets, 4);
    assert.equal(s.exercises[0].repos, 120);
  });

  test("la charge vient de la dernière fois, toute séance type confondue, avec la progression", () => {
    const ailleurs = {
      id: "s9",
      date: "2026-10-18",
      routineId: "autre",
      exercises: [{ name: "presse a cuisses", mode: "muscu", sets: "3", reps: "10", weight: "80", rpe: "7" }]
    };
    const ex = preparerSeance(routine, [ailleurs], AUJ).exercises[0];
    // RPE 7 sur 80 kg : +2,5 % → 82.
    assert.equal(ex.weight, "82.5");
    assert.equal(ex.suggested.from, 80);
    // Sans exercice connu : pas de charge inventée.
    assert.equal(preparerSeance(routine, [ailleurs], AUJ).exercises[1].weight, undefined);
  });

  test("ressenti absent la dernière fois : même charge, sans suggestion", () => {
    const e = exerciceProgramme(
      { name: "Rowing", mode: "muscu", sets: 3, reps: 12 },
      [{ id: "s", date: "2026-10-18", exercises: [{ name: "Rowing", mode: "muscu", weight: "40" }] }],
      AUJ
    );
    assert.equal(e.weight, "40");
    assert.equal(e.suggested, null);
  });

  test("séance type non programmée : comportement d'avant", () => {
    const sansProgramme = { id: "r2", name: "Libre" };
    const s = preparerSeance(sansProgramme, [{ id: "s", date: "2026-10-18", routineId: "r2", exercises: [{ name: "Squat", mode: "muscu", sets: "3", reps: "8", weight: "60" }] }], AUJ);
    assert.deepEqual(s.exercises.map((e) => e.name), ["Squat"]);
  });

  test("import du coach (exercices sans « programme ») : comportement d'avant", () => {
    const importee = { id: "r3", source: "sheets", exercises: [{ name: "Squat", mode: "muscu", sets: 3, reps: 8, weight: "50" }] };
    const derniere = { id: "s", date: "2026-10-18", routineId: "r3", exercises: [{ name: "Squat", mode: "muscu", sets: "3", reps: "8", weight: "55" }, { name: "Gainage", mode: "pdc" }] };
    assert.deepEqual(preparerSeance(importee, [derniere], AUJ).exercises.map((e) => e.name), ["Squat", "Gainage"]);
  });
});

describe("recherche dans la bibliothèque", () => {
  test("vide : tout", () => {
    assert.equal(filtrerBibliotheque(EXERCISE_LIBRARY, "  "), EXERCISE_LIBRARY);
  });

  test("chaque mot, sans accents ni majuscules", () => {
    const r = filtrerBibliotheque(EXERCISE_LIBRARY, "dev couche");
    const noms = r.flatMap((g) => g.items.map((i) => i.name));
    assert.ok(noms.includes("Développé couché barre"));
    assert.ok(noms.every((n) => /d[ée]velopp[ée]/i.test(n) && /couch[ée]/i.test(n)));
    assert.ok(r.every((g) => g.items.length));
  });

  test("rien ne correspond : aucun groupe", () => {
    assert.deepEqual(filtrerBibliotheque(EXERCISE_LIBRARY, "zzzz"), []);
  });
});

describe("programme débutant du coach (validé le 22 octobre 2026)", async () => {
  const { PROGRAMME_DEBUTANT_SALLE, seancesProgrammeDebutant } = await import("../app/src/lib/seance-du-jour.js");
  let n = 0;
  const uid = () => "id" + n++;
  const noms = new Map(EXERCISE_LIBRARY.flatMap((g) => g.items.map((i) => [i.name, i])));

  test("chaque exercice existe tel quel dans la bibliothèque", () => {
    for (const p of PROGRAMME_DEBUTANT_SALLE) for (const e of p.exercises) assert.ok(noms.has(e.name), e.name);
  });

  test("deux séances types programmées, type d'exercice repris de la bibliothèque", () => {
    const r = seancesProgrammeDebutant([], EXERCISE_LIBRARY, uid);
    assert.deepEqual(r.map((x) => x.name), ["Full body A", "Full body B"]);
    assert.ok(r.every((x) => x.programme === true && x.exercises.length === 6));
    const planche = r[0].exercises.find((e) => e.name === "Gainage planche");
    assert.deepEqual([planche.mode, planche.repUnit, planche.reps, planche.repos], ["pdc", "sec", 30, 60]);
    assert.equal(r[0].exercises[0].repos, 90);
  });

  test("déjà ajoutées : pas de doublon", () => {
    const r = seancesProgrammeDebutant([{ templateId: "salle-debutant-a" }], EXERCISE_LIBRARY, uid);
    assert.deepEqual(r.map((x) => x.name), ["Full body B"]);
  });

  test("alternance : A puis B, puis A", () => {
    const [a, b] = seancesProgrammeDebutant([], EXERCISE_LIBRARY, uid).map((x, k) => ({ ...x, id: "r" + k }));
    assert.equal(seanceDuJour([a, b], [], {}, AUJ).routine.name, "Full body A");
    assert.equal(seanceDuJour([a, b], [{ date: "2026-10-20", routineId: a.id }], {}, AUJ).routine.name, "Full body B");
    assert.equal(
      seanceDuJour([a, b], [{ date: "2026-10-18", routineId: a.id }, { date: "2026-10-20", routineId: b.id }], {}, AUJ).routine.name,
      "Full body A"
    );
  });

  test("démarrée, la séance A arrive prête : 6 exercices, séries du programme", () => {
    const [a] = seancesProgrammeDebutant([], EXERCISE_LIBRARY, uid).map((x) => ({ ...x, id: "ra" }));
    const s = preparerSeance(a, [], AUJ);
    assert.equal(s.exercises.length, 6);
    assert.equal(s.exercises[0].name, "Presse à cuisses");
    assert.equal(s.exercises[0].sets, 3);
  });
});
