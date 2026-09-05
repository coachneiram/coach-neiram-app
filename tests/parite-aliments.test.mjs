/**
 * Parite du filtrage des aliments : ancienne version contre nouvelle.
 *
 * Le filtre des allergies est la fonction la plus sensible de
 * l'application. Une erreur ici ne fausse pas un chiffre : elle propose a
 * quelqu'un un aliment auquel il est allergique. On ne se contente donc pas
 * d'un echantillon — les 51 aliments du catalogue sont passes devant tous
 * les regimes et toutes les combinaisons d'allergies.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { ordreRecommandation, regimeOk, trierPourObjectif } from "../app/src/lib/aliments.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

const REGIMES = ["aucun", "vegetarien", "vegetalien", "keto", "sansgluten"];
const ALLERGENES = ["lactose", "oeufs", "gluten", "fruits-a-coque", "poisson", "crustaces", "soja", "viande", "volaille"];

/** Toutes les combinaisons d'allergies jusqu'a deux allergenes. */
function combinaisonsAllergies() {
  const out = [[]];
  for (const a of ALLERGENES) {
    out.push([a]);
    for (const b of ALLERGENES) if (a < b) out.push([a, b]);
  }
  return out;
}

describe("filtrage par regime et allergies", () => {
  test("les deux versions concordent sur tout le catalogue, tous regimes et allergies", () => {
    let comparaisons = 0;

    for (const dietType of REGIMES) {
      for (const allergies of combinaisonsAllergies()) {
        const profil = { dietType, allergies };
        for (const aliment of legacy.FOOD_DB) {
          const attendu = legacy.dietOk(aliment, profil);
          const obtenu = regimeOk(aliment, profil);
          assert.equal(
            obtenu,
            attendu,
            `divergence sur « ${aliment.name} » — régime ${dietType}, allergies [${allergies.join(", ")}]`
          );
          comparaisons++;
        }
      }
    }

    // Garde-fou : si le catalogue ou la liste des regimes se vidait, le
    // test passerait sans rien avoir compare.
    assert.ok(comparaisons > 10000, "trop peu de comparaisons : " + comparaisons);
  });

  test("un profil vide ou absent se comporte comme l'original", () => {
    for (const profil of [null, undefined, {}, { allergies: null }, { dietType: null }]) {
      for (const aliment of legacy.FOOD_DB.slice(0, 10)) {
        assert.equal(regimeOk(aliment, profil), legacy.dietOk(aliment, profil), "profil " + JSON.stringify(profil));
      }
    }
  });

  test("un aliment sans liste d'ingredients ne fait pas tomber le filtre", () => {
    const profil = { dietType: "vegetalien", allergies: ["lactose"] };
    assert.equal(regimeOk({ c: 0 }, profil), legacy.dietOk({ c: 0 }, profil));
  });

  test("une allergie prime sur tout le reste", () => {
    // Regle metier : une allergie est une contrainte medicale, pas une
    // preference. Elle doit exclure meme un aliment par ailleurs conforme.
    const conforme = { contains: ["lactose"], c: 2 };
    assert.equal(regimeOk(conforme, { dietType: "keto", allergies: [] }), true);
    assert.equal(regimeOk(conforme, { dietType: "keto", allergies: ["lactose"] }), false);
  });
});

describe("ordre des recommandations", () => {
  const OBJECTIFS = [
    { calories: 2200, protein: 150, carbs: 220, fat: 70 },
    { calories: 1800, protein: 130, carbs: 150, fat: 60 },
    { calories: 3000, protein: 0, carbs: 0, fat: 0 }
  ];

  test("les deux versions concordent sur une grille de situations", () => {
    for (const objectifs of OBJECTIFS) {
      for (let kcal = -200; kcal <= 2400; kcal += 137) {
        for (const p of [0, 3, 6, 40, 120]) {
          for (const c of [0, 5, 80, 210]) {
            const restant = { kcal, p, c, f: Math.round(c / 3) };
            const ancien = legacy.foodRecoOrder(restant, objectifs);
            const nouveau = ordreRecommandation(restant, objectifs);
            const contexte = JSON.stringify({ restant, objectifs });
            assert.deepEqual([...nouveau.ordre], [...ancien.order], "ordre — " + contexte);
            assert.equal(nouveau.accroche, ancien.headline, "accroche — " + contexte);
          }
        }
      }
    }
  });

  test("sans donnee, l'ordre par defaut est le meme", () => {
    for (const [restant, objectifs] of [[null, null], [{ kcal: 500 }, null], [null, OBJECTIFS[0]]]) {
      const ancien = legacy.foodRecoOrder(restant, objectifs);
      const nouveau = ordreRecommandation(restant, objectifs);
      assert.deepEqual([...nouveau.ordre], [...ancien.order]);
      assert.equal(nouveau.accroche, ancien.headline);
    }
  });
});

describe("tri des aliments selon l'objectif", () => {
  test("les deux versions produisent le meme classement", () => {
    for (const categorie of ["proteines", "glucides", "lipides", "legumes"]) {
      for (const objectif of ["perte", "prise", "maintien", "performance"]) {
        const items = legacy.FOOD_DB.filter((f) => f.cat === categorie);
        if (!items.length) continue;
        assert.deepEqual(
          trierPourObjectif(items, categorie, objectif).map((f) => f.name),
          Array.from(legacy.sortFoodsForGoal(items, categorie, objectif), (f) => f.name),
          `catégorie ${categorie}, objectif ${objectif}`
        );
      }
    }
  });

  test("le tri ne modifie pas la liste d'origine", () => {
    const items = legacy.FOOD_DB.filter((f) => f.cat === "proteines");
    const avant = items.map((f) => f.name);
    trierPourObjectif(items, "proteines", "prise");
    assert.deepEqual(items.map((f) => f.name), avant);
  });
});
