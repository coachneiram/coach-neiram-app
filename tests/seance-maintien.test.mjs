/**
 * Seance maintien d'une semaine difficile.
 *
 * C'est la fonctionnalite la plus « coaching » de l'application : elle
 * s'adresse a quelqu'un qui allait sauter sa semaine. Se tromper ici ne
 * produit pas un bug visible, mais une seance inadaptee — trop lourde apres
 * une nuit courte, ou trop generique pour donner envie.
 *
 * Elle est donc comparee a index.html sur des scenarios reels, motif par
 * motif, avec et sans historique.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { seanceMaintien } from "../app/src/lib/plan-semaine.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

const nu = (v) => JSON.parse(JSON.stringify(v));

const AUJ = "2026-09-07"; // un lundi
const ROUTINES = [
  { id: "r1", name: "Haut du corps", color: "#2DD4BF" },
  { id: "r2", name: "Bas du corps", color: "#4ADE80" }
];

const ex = (name, mode, sets, reps, weight) => ({ id: name, name, mode, sets, reps, weight });

const SEANCES = [
  {
    id: "s1",
    date: "2026-08-31",
    routineId: "r1",
    exercises: [ex("Développé couché", "muscu", 4, 8, "60"), ex("Rowing barre", "muscu", 4, 10, "50")]
  },
  {
    id: "s2",
    date: "2026-09-03",
    routineId: "r1",
    exercises: [
      ex("Développé couché", "muscu", 5, 3, "100"),
      ex("Tractions", "pdc", 4, 6, ""),
      ex("Rameur", "cardio", "", "", ""),
      ex("Curl", "muscu", 3, 12, "15"),
      ex("Élévations", "muscu", 3, 15, "8")
    ]
  },
  { id: "s3", date: "2026-09-04", routineId: "r2", exercises: [ex("Squat", "muscu", 4, 5, "120")] },
  // Une seance maintien : elle ne doit jamais servir de modele.
  {
    id: "s4",
    date: "2026-09-05",
    routineId: "r1",
    maintenance: true,
    exercises: [ex("Gainage", "pdc", 2, 30, "")]
  }
];

const SCENARIOS = [
  ["sans historique, motif sommeil", [], {}, "sommeil"],
  ["sans historique, motif charge", [], {}, "charge"],
  ["historique, sans plan du jour", SEANCES, {}, "charge"],
  ["historique, plan sur r1", SEANCES, { mon: "r1" }, "charge"],
  ["historique, plan sur r1, motif sommeil", SEANCES, { mon: "r1" }, "sommeil"],
  ["historique, plan sur r2 (un seul exercice)", SEANCES, { mon: "r2" }, "charge"],
  ["plan sur une routine sans historique", SEANCES, { mon: "INCONNUE" }, "charge"],
  ["seance sans exercice exploitable", [{ id: "x", date: "2026-09-04", routineId: "r1", exercises: [ex("Rameur", "cardio")] }], { mon: "r1" }, "charge"],
  ["uniquement des seances maintien", [SEANCES[3]], { mon: "r1" }, "charge"]
];

describe("seance maintien", () => {
  test("identique a index.html sur tous les scenarios", () => {
    for (const [nom, seances, plan, motif] of SCENARIOS) {
      assert.deepEqual(
        nu(seanceMaintien(ROUTINES, seances, plan, AUJ, motif)),
        nu(legacy.buildMaintien(ROUTINES, seances, plan, AUJ, motif)),
        nom
      );
    }
  });

  test("toujours exactement trois exercices", () => {
    for (const [nom, seances, plan, motif] of SCENARIOS) {
      const r = seanceMaintien(ROUTINES, seances, plan, AUJ, motif);
      assert.ok(r.items.length >= 3, `${nom} : seulement ${r.items.length} exercice(s)`);
      for (const it of r.items) {
        assert.ok(it.name, `${nom} : un exercice sans nom`);
        assert.ok(it.detail, `${nom} : « ${it.name} » sans consigne`);
      }
    }
  });

  test("une seance de force est ramenee a des series longues et allegee", () => {
    // 5x3 a 100 kg n'est pas un format maintien : 2x8 a 60 kg.
    const r = seanceMaintien(ROUTINES, SEANCES, { mon: "r1" }, AUJ, "charge");
    const dev = r.items.find((i) => i.name === "Développé couché");
    assert.match(dev.detail, /2 séries × 8/);
    assert.match(dev.detail, /60 kg \(charge allégée\)/);
  });

  test("une seance deja longue garde sa charge", () => {
    const r = seanceMaintien(ROUTINES, SEANCES, { mon: "r1" }, AUJ, "charge");
    const curl = r.items.find((i) => i.name === "Curl");
    assert.match(curl.detail, /15 kg \(charge inchangée\)/);
  });

  test("aucun cardio dans une seance maintien", () => {
    const r = seanceMaintien(ROUTINES, SEANCES, { mon: "r1" }, AUJ, "charge");
    assert.ok(!r.items.some((i) => i.name === "Rameur"));
  });

  test("une seance maintien ne sert jamais de modele a la suivante", () => {
    // Sinon le volume se diviserait par deux a chaque semaine difficile.
    const r = seanceMaintien(ROUTINES, [SEANCES[3]], { mon: "r1" }, AUJ, "charge");
    assert.ok(!r.items.some((i) => i.name === "Gainage"));
    assert.match(r.title, /Circuit maintien/);
  });

  test("le motif sommeil change le contenu, pas seulement le titre", () => {
    const sommeil = seanceMaintien(ROUTINES, [], {}, AUJ, "sommeil");
    const charge = seanceMaintien(ROUTINES, [], {}, AUJ, "charge");
    assert.notDeepEqual(sommeil.items, charge.items);
    assert.deepEqual(sommeil.items, JSON.parse(JSON.stringify(legacy.MAINTIEN_SLEEP)));
    assert.deepEqual(charge.items, JSON.parse(JSON.stringify(legacy.MAINTIEN_STANDING)));
  });

  test("la seance la plus recente est reprise, pas la premiere trouvee", () => {
    const r = seanceMaintien(ROUTINES, SEANCES, { mon: "r1" }, AUJ, "charge");
    // s2 (03/09) et non s1 (31/08) : « Rowing barre » n'appartient qu'a s1.
    assert.ok(!r.items.some((i) => i.name === "Rowing barre"));
  });

  test("le nom de la routine du jour apparait dans le titre", () => {
    assert.match(seanceMaintien(ROUTINES, SEANCES, { mon: "r1" }, AUJ, "charge").title, /Haut du corps/);
  });

  test("chaque consigne plafonne l'intensite", () => {
    const r = seanceMaintien(ROUTINES, SEANCES, { mon: "r1" }, AUJ, "charge");
    for (const it of r.items.slice(0, 3)) {
      assert.match(it.detail, /RPE 6 max/, `« ${it.name} » ne plafonne pas l'intensite`);
    }
  });
});
