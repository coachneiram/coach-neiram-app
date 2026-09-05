/**
 * Recherche d'aliments.
 *
 * Deux sources se combinent : le catalogue local, verifie et disponible
 * hors ligne, et Open Food Facts pour les produits de marque.
 *
 * Ce qui compte le plus ici est le comportement en cas de panne : le
 * catalogue local doit suffire a saisir un repas. Un client en salle, sans
 * reseau, doit pouvoir loguer son riz.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { chercherAliments, chercherLocalement, convertirProduitOFF } from "../app/src/lib/recherche-aliments.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

/** Environnement simule : moteur local et reseau controles. */
function env({ local = null, reponse = null, echec = null } = {}) {
  return {
    __CN_FOOD_SEARCH__: local,
    fetch: async () => {
      if (echec) throw echec;
      if (!reponse) return { ok: false, status: 503 };
      return { ok: true, json: async () => reponse };
    }
  };
}

const PRODUIT_OFF = {
  code: "123",
  product_name: "Rice",
  product_name_fr: "Riz basmati",
  brands: "Marque, Autre",
  nutriments: { "energy-kcal_100g": 349, proteins_100g: 7.2, carbohydrates_100g: 78.4, fat_100g: 0.9 },
  serving_quantity: "125"
};

describe("conversion d'une fiche Open Food Facts", () => {
  test("elle concorde avec l'application actuelle", () => {
    assert.deepEqual({ ...convertirProduitOFF(PRODUIT_OFF) }, { ...legacy.mapOFFProduct(PRODUIT_OFF) });
  });

  test("le nom francais est prefere", () => {
    assert.equal(convertirProduitOFF(PRODUIT_OFF).name, "Riz basmati");
  });

  test("seule la premiere marque est retenue", () => {
    // Certaines fiches en listent dix : les afficher toutes rendrait la
    // liste illisible.
    assert.equal(convertirProduitOFF(PRODUIT_OFF).brand, "Marque");
  });

  test("les kilojoules sont convertis en calories", () => {
    // Beaucoup de fiches europeennes ne donnent que des kilojoules.
    const p = convertirProduitOFF({ nutriments: { energy_100g: 1460 } });
    assert.equal(p.kcal100, 349);
  });

  test("une fiche sans macros donne zero, pas une valeur absente", () => {
    const p = convertirProduitOFF({ nutriments: {} });
    assert.equal(p.p100, 0);
    assert.equal(p.kcal100, null, "sans énergie, la fiche est inexploitable et doit être écartée");
  });

  test("un produit sans nom reste identifiable", () => {
    assert.equal(convertirProduitOFF({}).name, "Produit");
  });
});

describe("catalogue local", () => {
  const moteur = (q) => [{ item: { code: "cn-riz", product_name: "Riz blanc (cru)", nutriments: { "energy-kcal_100g": 349, proteins_100g: 7, carbohydrates_100g: 78, fat_100g: 1 } } }];

  test("il est interroge quand il est installe", async () => {
    const r = await chercherAliments("riz", env({ local: moteur }));
    assert.equal(r.length, 1);
    assert.equal(r[0].name, "Riz blanc (cru)");
  });

  test("son absence n'empeche pas la recherche", () => {
    assert.deepEqual(chercherLocalement("riz", env()), []);
  });

  test("un moteur en panne n'empeche pas la recherche en ligne", async () => {
    const casse = () => {
      throw new Error("index corrompu");
    };
    const r = await chercherAliments("riz", env({ local: casse, reponse: { products: [PRODUIT_OFF] } }));
    assert.equal(r.length, 1, "le résultat en ligne doit survivre à la panne locale");
  });
});

describe("comportement hors ligne", () => {
  test("le catalogue local suffit quand le reseau est coupe", async () => {
    /*
     * C'est le cas d'usage reel : un client en salle, dans un sous-sol
     * sans reseau, qui veut loguer son repas.
     */
    const moteur = () => [{ item: { product_name: "Riz", nutriments: { "energy-kcal_100g": 349 } } }];
    const r = await chercherAliments("riz", env({ local: moteur, echec: new Error("hors ligne") }));
    assert.equal(r.length, 1);
    assert.equal(r[0].name, "Riz");
  });

  test("sans reseau ni catalogue, la recherche ne plante pas", async () => {
    assert.deepEqual(await chercherAliments("riz", env({ echec: new Error("hors ligne") })), []);
  });

  test("une reponse en erreur est ignoree sans exception", async () => {
    assert.deepEqual(await chercherAliments("riz", env()), []);
  });
});

describe("fusion des deux sources", () => {
  test("le catalogue local passe avant Open Food Facts", () => {
    // Ses valeurs sont verifiees ; Open Food Facts est alimente par ses
    // contributeurs et contient des fiches fausses.
    const moteur = () => [{ item: { product_name: "Riz local", nutriments: { "energy-kcal_100g": 349 } } }];
    return chercherAliments("riz", env({ local: moteur, reponse: { products: [PRODUIT_OFF] } })).then((r) => {
      assert.equal(r[0].name, "Riz local");
    });
  });

  test("un aliment present dans les deux sources n'apparait qu'une fois", async () => {
    const moteur = () => [{ item: { product_name: "Riz basmati", nutriments: { "energy-kcal_100g": 349 } } }];
    const r = await chercherAliments("riz", env({ local: moteur, reponse: { products: [PRODUIT_OFF] } }));
    assert.equal(r.length, 1, "doublon entre catalogue local et Open Food Facts");
  });

  test("une fiche sans valeur energetique est ecartee", async () => {
    // Elle ne permettrait pas de calculer le repas.
    const sansEnergie = { product_name: "Inconnu", nutriments: {} };
    const r = await chercherAliments("x", env({ reponse: { products: [sansEnergie, PRODUIT_OFF] } }));
    assert.equal(r.length, 1);
    assert.equal(r[0].name, "Riz basmati");
  });

  test("une requete vide ne declenche aucun appel", async () => {
    let appele = false;
    const espion = { fetch: async () => ((appele = true), { ok: true, json: async () => ({}) }) };
    assert.deepEqual(await chercherAliments("   ", espion), []);
    assert.equal(appele, false, "une requête vide ne doit pas appeler le réseau");
  });
});
