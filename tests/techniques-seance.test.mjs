/**
 * Superset et dégressive dans une séance.
 *
 * Avant, ces deux techniques n'existaient que dans les notes libres d'une
 * seance. Consequence : rien n'en remontait au coach, rien n'etait
 * comparable d'une semaine sur l'autre, et le client devait se rappeler
 * seul quels exercices allaient ensemble.
 *
 * Deux garanties comptent ici :
 *
 * 1. LES CHARGES DE DEGRESSIVE SONT REALISABLES. Un affichage a 38,4 kg
 *    n'aide personne : les disques de salle vont par 2,5 kg, comme pour la
 *    progression de charge.
 * 2. UN EXERCICE SANS TECHNIQUE S'AFFICHE EXACTEMENT COMME AVANT. C'est
 *    l'immense majorite des exercices, et de tout l'historique deja
 *    enregistre sur les telephones.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  DEGRESSIVE_PAR_DEFAUT,
  GROUPES_SUPERSET,
  paliersDegressifs,
  preparerSeance,
  resumeExercice,
  resumeTechnique,
  TECHNIQUES_SERIE
} from "../app/src/lib/constructeur-seances.js";

describe("catalogue des techniques", () => {
  test("les deux techniques programmées par le coach sont proposées", () => {
    assert.deepEqual(TECHNIQUES_SERIE.map((t) => t.id).sort(), ["degressive", "superset"]);
    for (const t of TECHNIQUES_SERIE) assert.ok(t.label, `technique sans libellé : ${t.id}`);
  });

  test("les groupes de superset sont des lettres distinctes", () => {
    assert.equal(new Set(GROUPES_SUPERSET).size, GROUPES_SUPERSET.length);
    assert.ok(GROUPES_SUPERSET.length >= 3, "trois groupes au minimum dans une séance");
  });

  test("les valeurs de départ d'une dégressive sont utilisables telles quelles", () => {
    assert.ok(DEGRESSIVE_PAR_DEFAUT.paliers >= 1);
    assert.ok(DEGRESSIVE_PAR_DEFAUT.baissePct > 0 && DEGRESSIVE_PAR_DEFAUT.baissePct < 100);
  });
});

describe("charges d'une série dégressive", () => {
  test("chaque palier retire le pourcentage de la charge précédente", () => {
    // 60 -> 48 arrondi a 47,5 -> 38 arrondi a 37,5.
    assert.deepEqual(paliersDegressifs(60, 2, 20), [47.5, 37.5]);
  });

  test("toute charge affichée est réalisable sur une barre", () => {
    for (let w = 2.5; w <= 200; w += 2.5) {
      for (const pct of [10, 15, 20, 25, 30, 50]) {
        for (const kg of paliersDegressifs(w, 3, pct)) {
          assert.equal(Math.round(kg * 10) % 25, 0, `charge non réalisable : ${kg} kg`);
        }
      }
    }
  });

  test("les charges descendent, et ne tombent jamais à zéro", () => {
    const charges = paliersDegressifs(10, 6, 50);
    assert.equal(charges.length, 6);
    for (let i = 0; i < charges.length; i++) {
      assert.ok(charges[i] >= 2.5, `charge nulle ou négative : ${charges[i]}`);
      if (i > 0) assert.ok(charges[i] <= charges[i - 1], `charge qui remonte : ${charges}`);
    }
  });

  test("sans charge, sans palier ou sans pourcentage : aucune charge affichée", () => {
    assert.deepEqual(paliersDegressifs("", 2, 20), []);
    assert.deepEqual(paliersDegressifs(60, 0, 20), []);
    assert.deepEqual(paliersDegressifs(60, 2, 0), []);
    assert.deepEqual(paliersDegressifs(60, 2, 100), []);
    assert.deepEqual(paliersDegressifs(null, null, null), []);
  });

  test("le nombre de paliers est borné : une saisie absurde ne bloque pas l'écran", () => {
    assert.ok(paliersDegressifs(100, 999, 10).length <= 6);
  });
});

describe("résumé d'un exercice", () => {
  const BASE = { mode: "muscu", sets: 4, reps: 8, weight: 60, rpe: 8 };

  test("un exercice sans technique s'affiche exactement comme avant", () => {
    assert.equal(resumeExercice(BASE), "4×8 @ 60 kg · RPE 8");
    assert.equal(resumeTechnique(BASE), "");
    assert.equal(resumeTechnique({}), "");
    assert.equal(resumeTechnique(null), "");
  });

  test("le superset affiche son groupe : sans lui, on ne sait pas avec qui", () => {
    const ex = { ...BASE, technique: "superset", supersetGroupe: "B" };
    assert.equal(resumeExercice(ex), "4×8 @ 60 kg · RPE 8 · superset B");
  });

  test("la dégressive affiche ses paliers et sa baisse", () => {
    const ex = { ...BASE, technique: "degressive", degressivePaliers: 3, degressiveBaissePct: 15 };
    assert.ok(resumeExercice(ex).endsWith("· dégressive ×3 (-15 %)"), resumeExercice(ex));
  });

  test("la technique s'affiche aussi en poids de corps et en force", () => {
    const pdc = { mode: "pdc", sets: 3, reps: 12, technique: "superset", supersetGroupe: "A" };
    assert.ok(resumeExercice(pdc).includes("superset A"));
    const force = { mode: "powerlifting", setType: "travail", sets: 5, reps: 5, technique: "degressive" };
    assert.ok(resumeExercice(force).includes("dégressive"));
  });

  test("un cardio ne porte pas de technique : elle n'aurait aucun sens", () => {
    const ex = { mode: "cardio", durationMin: 20, technique: "superset", supersetGroupe: "A" };
    assert.equal(resumeExercice(ex), "20 min");
  });

  test("une technique inconnue n'affiche rien plutôt qu'un identifiant brut", () => {
    assert.equal(resumeTechnique({ technique: "cluster" }), "");
  });
});

describe("séance démarrée depuis une séance type importée", () => {
  const ROUTINE = {
    id: "r1",
    name: "Haut du corps",
    exercises: [
      { name: "Développé couché", mode: "muscu", sets: "4", reps: "8", weight: "60", rpe: "8" },
      { name: "Tirage", mode: "muscu", sets: "4", reps: "10", weight: "50", technique: "superset", supersetGroupe: "A" }
    ]
  };

  test("les exercices importés ouvrent la séance, avec leurs charges", () => {
    // Contrairement a un modele du coach, un programme importe a ete ecrit
    // POUR CE CLIENT : ses charges sont les siennes, les effacer viderait
    // l'import de son interet.
    const s = preparerSeance(ROUTINE, [], "2026-03-10");
    assert.equal(s.exercises.length, 2);
    assert.equal(s.exercises[0].name, "Développé couché");
    assert.equal(s.exercises[0].weight, "60");
    assert.equal(s.exercises[1].technique, "superset");
    assert.equal(s.exercises[1].supersetGroupe, "A");
  });

  test("chaque exercice reçoit un identifiant propre à la séance", () => {
    const s = preparerSeance(ROUTINE, [], "2026-03-10");
    const ids = s.exercises.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every(Boolean));
  });

  test("la dernière séance faite prime toujours sur le programme importé", () => {
    const seances = [
      {
        id: "s1",
        routineId: "r1",
        date: "2026-03-03",
        exercises: [{ id: "x", name: "Squat", mode: "muscu", weight: "100", rpe: "6" }]
      }
    ];
    const s = preparerSeance(ROUTINE, seances, "2026-03-10");
    assert.equal(s.exercises.length, 1);
    assert.equal(s.exercises[0].name, "Squat");
  });

  test("une séance type sans exercices importés se comporte comme avant", () => {
    const s = preparerSeance({ id: "r2", name: "Libre" }, [], "2026-03-10");
    assert.equal(s.exercises.length, 1);
    assert.equal(s.exercises[0].name, "");
  });
});
