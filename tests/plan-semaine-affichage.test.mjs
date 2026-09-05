/**
 * Statuts affiches du programme de la semaine.
 *
 * Le calcul des statuts est couvert ailleurs. Ce fichier verrouille leur
 * RENDU : la couleur, la marque et le libelle.
 *
 * Une couleur mal nommee ne provoque aucune erreur — le libelle du statut
 * devient simplement invisible, et personne ne le voit avant un client.
 * Une marque perdue est pire : sur un telephone en plein soleil, c'est
 * souvent la seule chose qui distingue « fait » de « manquee ».
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { META_PLAN, etatPlanSemaine } from "../app/src/lib/plan-semaine.js";
import { COLORS } from "../app/src/tokens.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

describe("statuts du programme de la semaine", () => {
  test("chaque statut designe une couleur qui existe vraiment", () => {
    for (const [statut, meta] of Object.entries(META_PLAN)) {
      assert.ok(COLORS[meta.couleur], `statut « ${statut} » : couleur « ${meta.couleur} » inconnue`);
    }
  });

  test("chaque statut porte une marque distincte", () => {
    const marques = Object.values(META_PLAN).map((m) => m.marque);
    assert.equal(new Set(marques).size, marques.length, `marques en double : ${marques.join(" ")}`);
    for (const [statut, meta] of Object.entries(META_PLAN)) {
      assert.ok(meta.marque && meta.texte, `statut « ${statut} » incomplet`);
    }
  });

  test("tout statut produit par le calcul a un rendu", () => {
    // Sans cela, un statut ajoute au calcul ferait planter la carte.
    const routines = [{ id: "r1", name: "Haut du corps", color: "#2DD4BF" }];
    const seances = [
      { id: "s1", date: "2026-09-07", routineId: "r1", exercises: [{ name: "Squat" }] },
      { id: "s2", date: "2026-09-08", routineId: null, exercises: [{ name: "Course" }] }
    ];
    const plans = [{}, { mon: "r1" }, { mon: "r1", wed: "r1", fri: "r1" }, { sun: "r1" }];
    let vus = new Set();
    for (const plan of plans) {
      for (const jour of ["2026-09-07", "2026-09-09", "2026-09-13"]) {
        for (const ligne of etatPlanSemaine(plan, routines, seances, jour)) {
          assert.ok(META_PLAN[ligne.status], `statut « ${ligne.status} » sans rendu`);
          vus.add(ligne.status);
        }
      }
    }
    assert.ok(vus.size >= 5, `trop peu de statuts couverts : ${[...vus].join(", ")}`);
  });
});
