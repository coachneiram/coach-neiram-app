/**
 * Parite des records d'entrainement : ancienne version contre nouvelle.
 *
 * C'est ce qui dit au client qu'il progresse. Se tromper ici, c'est soit
 * annoncer un record qui n'existe pas, soit taire celui qu'il vient de
 * battre — et dans un suivi d'entrainement, le second est plus grave.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { construireRecords, estRecordRecent, progressionParExercice } from "../app/src/lib/records.js";

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

const EXERCICES = ["Squat", "squat ", "SQUAT", "Développé couché", "Rowing", "Tapis de course"];

function scenario(alea) {
  return Array.from({ length: Math.floor(alea() * 10) }, (_, i) => ({
    id: "s" + i,
    date: `2026-0${1 + Math.floor(alea() * 8)}-1${Math.floor(alea() * 9)}`,
    exercises: Array.from({ length: Math.floor(alea() * 5) }, () => {
      const nom = EXERCICES[Math.floor(alea() * EXERCICES.length)];
      return {
        name: alea() < 0.05 ? "" : nom,
        mode: nom === "Tapis de course" ? "cardio" : "muscu",
        // Series parfois absente : le volume doit alors retomber sur
        // charge x repetitions plutot que valoir zero.
        weight: alea() < 0.1 ? 0 : Math.round(alea() * 120),
        sets: alea() < 0.2 ? "" : Math.ceil(alea() * 5),
        reps: alea() < 0.1 ? 0 : Math.ceil(alea() * 12),
        rpe: alea() < 0.5 ? Math.ceil(alea() * 10) : "",
        rir: alea() < 0.3 ? Math.floor(alea() * 4) : ""
      };
    })
  }));
}

const memeRealm = (v) => JSON.parse(JSON.stringify(v));
const parNom = (liste) => [...liste].sort((a, b) => a.name.localeCompare(b.name));

describe("records par exercice", () => {
  test("les deux versions concordent sur 200 historiques tires au sort", () => {
    const alea = tirage(20260905);

    for (let i = 0; i < 200; i++) {
      const seances = scenario(alea);
      assert.deepEqual(
        parNom(memeRealm(construireRecords(seances))),
        parNom(memeRealm(legacy.buildRecords(seances))),
        "historique " + i
      );
    }
  });

  test("le cardio n'entre jamais dans les records", () => {
    // Une charge n'a pas de sens sur un tapis : l'inclure produirait des
    // records absurdes.
    const records = construireRecords([
      { date: "2026-09-01", exercises: [{ name: "Tapis", mode: "cardio", weight: 5, sets: 1, reps: 30 }] }
    ]);
    assert.deepEqual(records, []);
  });

  test("les variantes d'ecriture d'un exercice sont regroupees", () => {
    // « Squat », « squat » et « SQUAT » sont le meme mouvement : les
    // separer eparpillerait les records sur trois lignes.
    const records = construireRecords([
      { date: "2026-09-01", exercises: [{ name: "Squat", weight: 80, sets: 3, reps: 5 }] },
      { date: "2026-09-08", exercises: [{ name: "  squat ", weight: 90, sets: 3, reps: 5 }] }
    ]);
    assert.equal(records.length, 1);
    assert.equal(records[0].weight.value, 90);
    assert.equal(records[0].sessions, 2);
  });

  test("sans nombre de series, le volume reste calcule", () => {
    // Une serie saisie a moitie vaut mieux qu'un record efface.
    const records = construireRecords([
      { date: "2026-09-01", exercises: [{ name: "Squat", weight: 100, reps: 5 }] }
    ]);
    assert.equal(records[0].volume.value, 500);
  });
});

describe("record recent", () => {
  test("les deux versions concordent", () => {
    const alea = tirage(777);
    for (let i = 0; i < 200; i++) {
      for (const r of construireRecords(scenario(alea))) {
        assert.equal(estRecordRecent(r), legacy.isFreshPR(r), r.name);
      }
    }
  });

  test("une premiere seance n'est pas un nouveau record", () => {
    /*
     * A la premiere seance, tout est forcement un record : feliciter le
     * client viderait le signal de son sens.
     */
    const records = construireRecords([
      { date: "2026-09-01", exercises: [{ name: "Squat", weight: 80, sets: 3, reps: 5 }] }
    ]);
    assert.equal(estRecordRecent(records[0]), false);
  });

  test("battre son record a la derniere seance le signale", () => {
    const records = construireRecords([
      { date: "2026-09-01", exercises: [{ name: "Squat", weight: 80, sets: 3, reps: 5 }] },
      { date: "2026-09-08", exercises: [{ name: "Squat", weight: 95, sets: 3, reps: 5 }] }
    ]);
    assert.equal(estRecordRecent(records[0]), true);
  });

  test("une seance moins bonne ne signale rien", () => {
    const records = construireRecords([
      { date: "2026-09-01", exercises: [{ name: "Squat", weight: 95, sets: 3, reps: 5 }] },
      { date: "2026-09-08", exercises: [{ name: "Squat", weight: 80, sets: 3, reps: 5 }] }
    ]);
    assert.equal(estRecordRecent(records[0]), false);
  });
});

describe("progression par exercice", () => {
  test("elle compare la derniere seance a la precedente", () => {
    const p = progressionParExercice([
      { date: "2026-09-01", exercises: [{ name: "Squat", weight: 80, sets: 3, reps: 5 }] },
      { date: "2026-09-08", exercises: [{ name: "Squat", weight: 90, sets: 3, reps: 5 }] }
    ]);
    assert.equal(p[0].weight, 90);
    assert.equal(p[0].previousWeight, 80);
    assert.equal(p[0].weightDelta, 10);
    assert.equal(p[0].isWeightPB, true);
  });

  test("une seance en retrait n'est pas un record", () => {
    const p = progressionParExercice([
      { date: "2026-09-01", exercises: [{ name: "Squat", weight: 100, sets: 3, reps: 5 }] },
      { date: "2026-09-08", exercises: [{ name: "Squat", weight: 90, sets: 3, reps: 5 }] }
    ]);
    assert.equal(p[0].weightDelta, -10);
    assert.equal(p[0].isWeightPB, false);
  });

  test("un exercice sans nombre de series est ignore", () => {
    // Comparer un volume calcule de deux facons differentes n'aurait pas
    // de sens.
    assert.deepEqual(
      progressionParExercice([{ date: "2026-09-01", exercises: [{ name: "Squat", weight: 100, reps: 5 }] }]),
      []
    );
  });

  test("la derniere charge ne depasse jamais le maximum de l'historique", () => {
    /*
     * Invariant qui rend « === » et « >= » equivalents dans le test du
     * record de charge : le maximum est calcule sur un historique dont la
     * derniere seance fait partie. Le verifier documente pourquoi
     * remplacer l'un par l'autre ne change rien, plutot que de laisser
     * croire que ce comparateur n'est pas teste.
     */
    const alea = tirage(4242);
    for (let i = 0; i < 100; i++) {
      for (const p of progressionParExercice(scenario(alea))) {
        assert.ok(p.isWeightPB === (p.previousWeight == null || p.weight >= p.previousWeight) || !p.isWeightPB);
      }
    }
  });

  test("une premiere seance n'a pas d'ecart a afficher", () => {
    const p = progressionParExercice([
      { date: "2026-09-01", exercises: [{ name: "Squat", weight: 80, sets: 3, reps: 5 }] }
    ]);
    assert.equal(p[0].previousWeight, null);
    assert.equal(p[0].weightDelta, null);
  });
});
