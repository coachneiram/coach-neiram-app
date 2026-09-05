/**
 * Liste de courses.
 *
 * Le filtre « Adapter a mon profil » masque les articles incompatibles
 * avec le regime et les allergies. C'est la meme garantie que sur les
 * suggestions d'aliments : un allergene ne doit apparaitre nulle part,
 * pas meme dans une liste de courses.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chargerApp } from "./harness.mjs";
import { articleCoursesOk } from "../app/src/lib/aliments.js";
import { SHOPPING_LIST } from "../app/src/lib/catalogues.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

const REGIMES = ["aucun", "vegetarien", "vegetalien", "keto"];
const ALLERGENES = ["gluten", "lactose", "arachides", "fruits-a-coque", "poisson", "crustaces", "oeufs", "soja"];

describe("filtrage des articles", () => {
  test("les deux versions concordent sur toute la liste", () => {
    let comparaisons = 0;
    for (const dietType of REGIMES) {
      for (const allergene of [null, ...ALLERGENES]) {
        const profil = { dietType, allergies: allergene ? [allergene] : [] };
        for (const rayon of SHOPPING_LIST) {
          for (const article of rayon.items) {
            assert.equal(
              articleCoursesOk(article, profil),
              legacy.shoppingDietOk(article, profil),
              `« ${article.n} » — régime ${dietType}, allergie ${allergene}`
            );
            comparaisons++;
          }
        }
      }
    }
    assert.ok(comparaisons > 4000, "trop peu de comparaisons : " + comparaisons);
  });

  test("un article sans valeur nutritionnelle reste visible en keto", () => {
    /*
     * Sans traiter l'absence de glucides comme un zero, le filtre keto
     * ecarterait tout ce dont on ignore la composition — y compris le sel,
     * les epices et les produits d'entretien.
     */
    const profil = { dietType: "keto", allergies: [] };
    assert.equal(articleCoursesOk({ n: "Sel" }, profil), true);
    assert.equal(articleCoursesOk({ n: "Sucre", c: 100 }, profil), false);
  });

  test("un allergene est ecarte quel que soit le regime", () => {
    for (const dietType of REGIMES) {
      const profil = { dietType, allergies: ["lactose"] };
      assert.equal(articleCoursesOk({ n: "Beurre", contains: ["lactose"], c: 0 }, profil), false, dietType);
    }
  });
});

describe("integrite de la liste", () => {
  test("chaque rayon a un identifiant, un libelle et des articles", () => {
    for (const rayon of SHOPPING_LIST) {
      assert.ok(rayon.id, "rayon sans identifiant");
      assert.ok(rayon.label, "rayon sans libellé : " + rayon.id);
      assert.ok(rayon.items.length > 0, "rayon vide : " + rayon.id);
    }
  });

  test("chaque article a un nom", () => {
    for (const rayon of SHOPPING_LIST) {
      for (const article of rayon.items) {
        assert.ok(article.n, "article sans nom dans le rayon " + rayon.id);
      }
    }
  });

  test("aucun article n'apparait deux fois dans le meme rayon", () => {
    // Les identifiants combinent rayon et nom : un doublon rendrait les
    // deux cases indissociables, cocher l'une cocherait l'autre.
    for (const rayon of SHOPPING_LIST) {
      const noms = rayon.items.map((a) => a.n);
      assert.equal(noms.length, new Set(noms).size, "doublon dans le rayon " + rayon.id);
    }
  });

  test("la liste correspond a celle de l'application actuelle", () => {
    assert.deepEqual(SHOPPING_LIST, JSON.parse(JSON.stringify(legacy.SHOPPING_LIST)));
  });
});

describe("comptage des cochages", () => {
  test("un article decoche disparait du compteur", () => {
    /*
     * Le portage retire la cle plutot que d'y mettre false : sinon le
     * compteur « X coches » gonflerait avec l'historique des articles
     * decoches, et afficherait « 40 coches » sur une liste vide.
     */
    const source = readCourses();
    assert.match(source, /delete suivant\[id\]/);
  });
});

/** Le comportement n'est verifiable que dans la source de l'ecran. */
function readCourses() {
  return readFileSync(new URL("../app/src/ecrans/Courses.jsx", import.meta.url), "utf8");
}
