/**
 * Force athletique : reconnaissance des mouvements et maxis.
 *
 * L'enjeu est un classement, pas un calcul : quel exercice compte comme un
 * squat de competition, et lequel n'y compte pas.
 *
 * Se tromper dans un sens fait chuter le 1RM estime du client — un squat
 * bulgare a 40 kg compte comme un squat — et lui propose ensuite des
 * charges trop legeres. Se tromper dans l'autre sens perd son historique.
 * Les deux sont invisibles a l'oeil : le chiffre affiche reste plausible.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import {
  MOUVEMENTS_FORCE,
  meilleursMaxis,
  mouvementForce,
  totalForce
} from "../app/src/lib/force.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

/** Noms tels que les clients les ecrivent reellement. */
const NOMS = [
  "Squat", "squat barre", "Back squat", "SQUAT", "Front squat",
  "Squat bulgare", "Bulgarian split squat", "Split squat", "Goblet squat",
  "Hack squat", "Squat jump",
  "Développé couché", "developpe couche", "Bench press", "Bench",
  "Spoto press", "Pause bench", "Développé militaire", "Développé incliné",
  "Soulevé de terre", "souleve de terre", "Deadlift", "Rack pull",
  "Block pull", "Deficit deadlift", "Soulevé de terre roumain",
  "Curl biceps", "Rowing", "Tractions", "", null, "   "
];

describe("reconnaissance des mouvements", () => {
  test("identique a index.html sur tous les libelles", () => {
    for (const nom of NOMS) {
      assert.equal(mouvementForce(nom), legacy.plLiftOf(nom), `nom : ${JSON.stringify(nom)}`);
    }
  });

  test("les variantes ne comptent pas comme le mouvement de competition", () => {
    for (const nom of ["Squat bulgare", "Bulgarian split squat", "Goblet squat", "Hack squat", "Squat jump"]) {
      assert.equal(mouvementForce(nom), null, `« ${nom} » compte a tort comme un squat`);
    }
  });

  test("les trois mouvements sont bien reconnus, quelle que soit l'ecriture", () => {
    assert.equal(mouvementForce("SQUAT BARRE"), "squat");
    assert.equal(mouvementForce("developpe couche"), "bench");
    assert.equal(mouvementForce("Développé couché"), "bench");
    assert.equal(mouvementForce("Souleve de terre"), "deadlift");
    assert.equal(mouvementForce("Soulevé de terre"), "deadlift");
  });

  test("les libelles et identifiants correspondent a index.html", () => {
    assert.deepEqual(
      MOUVEMENTS_FORCE.map((l) => [l.id, l.label]),
      Array.from(legacy.PL_LIFTS).map((l) => [l.id, l.label])
    );
  });
});

describe("maxis estimes depuis l'historique", () => {
  const seances = [
    {
      date: "2026-08-01",
      exercises: [{ name: "Squat", mode: "powerlifting", weight: "140", reps: "3", rpe: "8" }]
    },
    {
      date: "2026-09-01",
      exercises: [
        { name: "Squat", mode: "powerlifting", weight: "150", reps: "3", rpe: "8" },
        { name: "Développé couché", mode: "powerlifting", weight: "100", reps: "5", rpe: "9" },
        // Mode muscu : ne doit pas compter comme reference de maxi.
        { name: "Squat", mode: "muscu", weight: "200", reps: "1", rpe: "10" },
        // Variante : ne doit pas compter non plus.
        { name: "Squat bulgare", mode: "powerlifting", weight: "40", reps: "10", rpe: "9" },
        // Sans ressenti : Epley prend le relais de la table RPE.
        { name: "Soulevé de terre", mode: "powerlifting", weight: "180", reps: "5" }
      ]
    },
    {
      // Seance la plus RECENTE, mais plus legere : le maxi ne doit pas
      // reculer parce que le client a fait une seance facile hier.
      date: "2026-09-08",
      exercises: [{ name: "Squat", mode: "powerlifting", weight: "120", reps: "3", rpe: "8" }]
    }
  ];

  test("identique a index.html", () => {
    const attendu = {};
    for (const s of seances) {
      for (const ex of s.exercises || []) {
        if ((ex.mode || "") !== "powerlifting") continue;
        const lift = legacy.plLiftOf(ex.name);
        if (!lift) continue;
        const r = legacy.est1RMFromSet(ex.weight, ex.reps, ex.rpe, ex.rir);
        if (r == null) continue;
        if (!attendu[lift] || r.value > attendu[lift].est) {
          attendu[lift] = {
            est: r.value,
            method: r.method,
            date: s.date,
            weight: legacy.num ? legacy.num(ex.weight) : Number(ex.weight),
            reps: Number(ex.reps)
          };
        }
      }
    }
    assert.deepEqual(JSON.parse(JSON.stringify(meilleursMaxis(seances))), JSON.parse(JSON.stringify(attendu)));
  });

  test("une serie en mode muscu ne devient jamais une reference de maxi", () => {
    // 200 kg x 1 en fin de seance de jambes n'est pas un maxi de squat.
    assert.ok(meilleursMaxis(seances).squat.est < 200);
  });

  test("le meilleur est retenu, pas le dernier", () => {
    // La seance du 08/09 est plus recente mais plus legere : un maxi qui
    // reculerait apres une seance facile n'aurait aucun sens.
    assert.equal(meilleursMaxis(seances).squat.date, "2026-09-01");
    assert.equal(meilleursMaxis(seances).squat.weight, 150);
  });

  test("un squat bulgare ne fait pas chuter le maxi de squat", () => {
    assert.ok(meilleursMaxis(seances).squat.est > 100);
  });

  test("sans ressenti, l'estimation passe par Epley", () => {
    // Mon attente de depart etait fausse : je croyais qu'une serie sans RPE
    // ni RIR ne donnait rien. est1RMFromSet retombe en fait sur la formule
    // d'Epley, exactement comme index.html — verifie par le test de parite
    // ci-dessus. C'est le test qui avait tort, pas le code.
    const d = meilleursMaxis(seances).deadlift;
    assert.equal(d.method, "Epley");
    assert.ok(d.est > 180, "un 1RM estime doit depasser la charge de la serie");
  });

  test("un historique vide ne leve pas", () => {
    assert.deepEqual(meilleursMaxis([]), {});
    assert.deepEqual(meilleursMaxis(null), {});
    assert.deepEqual(meilleursMaxis([{ date: "2026-01-01" }]), {});
  });
});

describe("total des trois maxis", () => {
  test("somme les maxis declares", () => {
    assert.equal(totalForce({ squat: 150, bench: 100, deadlift: 180 }), 430);
  });

  test("un maxi non declare ne compte pas comme zero fautif", () => {
    assert.equal(totalForce({ squat: 150 }), 150);
    assert.equal(totalForce({ squat: "150", bench: "", deadlift: null }), 150);
  });

  test("aucun maxi declare donne zero", () => {
    assert.equal(totalForce({}), 0);
    assert.equal(totalForce(null), 0);
  });

  test("un mouvement inconnu du client n'est pas compte", () => {
    // Seuls les trois mouvements de competition entrent dans le total.
    assert.equal(totalForce({ squat: 150, curl: 40 }), 150);
  });
});
