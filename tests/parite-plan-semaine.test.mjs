/**
 * Parite du programme hebdomadaire : ancienne version contre nouvelle.
 *
 * Ce calcul decide de ce que le client voit en ouvrant son application :
 * « tu as fait 2 seances sur 3 ». Se tromper d'un jour, et on lui reproche
 * une seance qu'il a le temps de faire, ou on lui laisse croire qu'il est a
 * jour alors qu'il a saute un rendez-vous.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import {
  RAISONS_SEMAINE_DIFFICILE,
  bilanPlanSemaine,
  estSemaineDifficile,
  etatPlanSemaine,
  raisonSemaineDifficile,
  semaineDifficileDe
} from "../app/src/lib/plan-semaine.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

const JOURS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const LUNDI = "2026-08-31";

function tirage(graine) {
  let etat = graine >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

function decaler(iso, jours) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
}

const ROUTINES = [{ id: "r1", name: "Haut du corps" }, { id: "r2", name: "Bas du corps" }];

function scenario(alea) {
  const plan = {};
  for (const j of JOURS) {
    const tire = alea();
    if (tire < 0.4) plan[j] = ROUTINES[Math.floor(alea() * ROUTINES.length)].id;
    // Un plan peut aussi designer une routine qui n'existe plus.
    else if (tire < 0.45) plan[j] = "supprimee";
  }

  const seances = Array.from({ length: Math.floor(alea() * 6) }, (_, i) => ({
    id: "s" + i,
    date: decaler(LUNDI, Math.floor(alea() * 7)),
    routineId: alea() < 0.6 ? ROUTINES[Math.floor(alea() * ROUTINES.length)].id : null
  }));

  return { plan, seances, aujourdhui: decaler(LUNDI, Math.floor(alea() * 7)) };
}

const resume = (r) => ({
  id: r.id,
  date: r.date,
  status: r.status,
  extra: r.extra,
  isToday: r.isToday,
  routine: r.routine ? r.routine.id : null
});

describe("etat du programme de la semaine", () => {
  test("les deux versions concordent sur 300 situations tirees au sort", () => {
    const alea = tirage(20260905);

    for (let i = 0; i < 300; i++) {
      const { plan, seances, aujourdhui } = scenario(alea);
      const contexte = "situation " + i + " : " + JSON.stringify({ plan, seances, aujourdhui });

      assert.deepEqual(
        Array.from(etatPlanSemaine(plan, ROUTINES, seances, aujourdhui), resume),
        Array.from(legacy.weekPlanStatus(plan, ROUTINES, seances, aujourdhui), resume),
        contexte
      );
    }
  });

  test("les bilans concordent", () => {
    const alea = tirage(4242);

    for (let i = 0; i < 200; i++) {
      const { plan, seances, aujourdhui } = scenario(alea);
      const ancien = legacy.weekPlanSummary(legacy.weekPlanStatus(plan, ROUTINES, seances, aujourdhui));
      const nouveau = bilanPlanSemaine(etatPlanSemaine(plan, ROUTINES, seances, aujourdhui));

      assert.equal(nouveau.prevus, ancien.planned, "prevus — situation " + i);
      assert.equal(nouveau.faits, ancien.done, "faits — situation " + i);
      assert.equal(nouveau.manques, ancien.missed, "manques — situation " + i);
      assert.equal(nouveau.restants, ancien.left, "restants — situation " + i);
    }
  });

  test("faits et manques ne peuvent jamais depasser les jours prevus", () => {
    // Invariant qui rend inatteignable le Math.max(0, ...) du bilan. Le
    // verifier ici documente pourquoi ce garde-fou n'est jamais declenche,
    // plutot que de laisser croire qu'il est teste.
    const alea = tirage(9001);
    for (let i = 0; i < 200; i++) {
      const { plan, seances, aujourdhui } = scenario(alea);
      const b = bilanPlanSemaine(etatPlanSemaine(plan, ROUTINES, seances, aujourdhui));
      assert.ok(b.faits + b.manques <= b.prevus, "invariant rompu — situation " + i);
      assert.ok(b.restants >= 0, "restants negatif — situation " + i);
    }
  });

  test("un jour prevu n'est manque qu'une fois passe", () => {
    // Le jour meme, il reste toute la journee pour s'y mettre : le compter
    // comme manque serait un reproche premature.
    const plan = { wed: "r1" };
    const mercredi = decaler(LUNDI, 2);
    const parJour = (aujourdhui) => etatPlanSemaine(plan, ROUTINES, [], aujourdhui).find((r) => r.id === "wed").status;

    assert.equal(parJour(decaler(LUNDI, 1)), "todo");
    assert.equal(parJour(mercredi), "today");
    assert.equal(parJour(decaler(LUNDI, 3)), "missed");
  });

  test("une seance un jour de repos compte en bonus, pas en erreur", () => {
    const lignes = etatPlanSemaine({}, ROUTINES, [{ id: "s1", date: LUNDI, routineId: null }], decaler(LUNDI, 3));
    const lundi = lignes.find((r) => r.id === "mon");
    assert.equal(lundi.status, "bonus");
    assert.equal(lundi.extra, 1);
  });
});

describe("semaines difficiles", () => {
  test("la lecture concorde avec l'original", () => {
    const cas = [
      null,
      {},
      { "2026-08-31": { active: true, reason: "travail" } },
      { "2026-08-31": { active: false, reason: "travail" } },
      { "2026-08-31": { active: true } }
    ];
    for (const semaines of cas) {
      assert.deepEqual(
        { ...(semaineDifficileDe(semaines, "2026-08-31") || {}) },
        { ...(legacy.hardWeekOf(semaines, "2026-08-31") || {}) },
        JSON.stringify(semaines)
      );
      assert.equal(
        estSemaineDifficile(semaines, "2026-08-31"),
        legacy.isHardWeek(semaines, "2026-08-31"),
        JSON.stringify(semaines)
      );
    }
  });

  test("les raisons proposees sont les memes que dans l'application actuelle", () => {
    assert.deepEqual(
      RAISONS_SEMAINE_DIFFICILE.map((r) => r.id),
      Array.from(legacy.HARD_WEEK_REASONS, (r) => r.id)
    );
    assert.deepEqual(
      RAISONS_SEMAINE_DIFFICILE.map((r) => r.label),
      Array.from(legacy.HARD_WEEK_REASONS, (r) => r.label)
    );
  });

  test("une raison inconnue s'affiche telle quelle plutot que de disparaitre", () => {
    assert.equal(raisonSemaineDifficile({ active: true, reason: "demenagement" }), "demenagement");
    assert.equal(raisonSemaineDifficile({ active: true, reason: "travail" }), "Charge de travail");
    assert.equal(raisonSemaineDifficile({ active: false, reason: "travail" }), null);
    assert.equal(raisonSemaineDifficile(null), null);
  });
});
