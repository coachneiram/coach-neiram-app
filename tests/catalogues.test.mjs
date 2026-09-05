/**
 * Catalogues alimentaires extraits.
 *
 * Le fichier app/src/lib/catalogues.js est genere depuis index.html. Ce
 * test verifie qu'il en est la copie exacte — sans quoi l'extraction
 * n'apporterait rien de plus qu'une recopie a la main.
 *
 * Il attrape aussi le cas ou les catalogues evoluent dans index.html sans
 * que l'extraction ait ete relancee : le fichier genere deviendrait
 * silencieusement perime.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import * as catalogues from "../app/src/lib/catalogues.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

const TABLES = [
  "FOOD_DB",
  "FOOD_CATS",
  "EQUIV_GLUCIDES",
  "EQUIV_FRUITS",
  "EQUIV_PROTEINES",
  "EQUIV_LIPIDES",
  "GOAL_FOOD_NOTES"
];

/** Ramene une valeur du bac a sable dans le realm des tests. */
const memeRealm = (v) => JSON.parse(JSON.stringify(v));

describe("les catalogues extraits sont la copie exacte de la source", () => {
  for (const nom of TABLES) {
    test(nom, () => {
      assert.deepEqual(
        catalogues[nom],
        memeRealm(legacy[nom]),
        `${nom} diverge de index.html — relancer scripts-migration/extraire-catalogues.mjs`
      );
    });
  }
});

describe("integrite du catalogue nutritionnel", () => {
  test("aucun aliment n'a perdu ses valeurs nutritionnelles", () => {
    for (const aliment of catalogues.FOOD_DB) {
      for (const champ of ["name", "cat", "p", "c", "f", "kcal"]) {
        assert.notEqual(aliment[champ], undefined, `${champ} manquant pour « ${aliment.name} »`);
      }
    }
  });

  test("les calories annoncees sont coherentes avec les macros", () => {
    // Proteines 4 kcal/g, glucides 4, lipides 9. On tolere un ecart :
    // les valeurs de reference sont arrondies et incluent parfois des
    // fibres. Au-dela, c'est une faute de saisie.
    for (const a of catalogues.FOOD_DB) {
      const calcule = a.p * 4 + a.c * 4 + a.f * 9;
      const ecart = Math.abs(calcule - a.kcal);
      assert.ok(
        ecart <= Math.max(30, a.kcal * 0.25),
        `« ${a.name} » annonce ${a.kcal} kcal mais ses macros en donnent ${calcule}`
      );
    }
  });

  test("chaque aliment appartient a une famille declaree", () => {
    const familles = new Set(catalogues.FOOD_CATS.map((c) => c.id));
    for (const a of catalogues.FOOD_DB) {
      assert.ok(familles.has(a.cat), `« ${a.name} » appartient à une famille inconnue : ${a.cat}`);
    }
  });

  test("aucun aliment n'apparait deux fois", () => {
    const noms = catalogues.FOOD_DB.map((a) => a.name);
    assert.deepEqual(noms.length, new Set(noms).size, "doublon dans le catalogue");
  });

  test("chaque famille a une couleur qui existe dans les jetons", async () => {
    const { COLORS } = await import("../app/src/tokens.js");
    for (const c of catalogues.FOOD_CATS) {
      assert.ok(COLORS[c.color], `couleur inconnue pour la famille ${c.id} : ${c.color}`);
    }
  });
});

describe("tables d'equivalences", () => {
  const EQUIVALENCES = ["EQUIV_GLUCIDES", "EQUIV_FRUITS", "EQUIV_PROTEINES", "EQUIV_LIPIDES"];

  test("chaque ligne comporte un aliment et sa quantite", () => {
    for (const nom of EQUIVALENCES) {
      for (const ligne of catalogues[nom]) {
        assert.equal(typeof ligne[0], "string", nom + " : libellé manquant");
        assert.equal(typeof ligne[1], "string", nom + " : quantité manquante");
        assert.ok(ligne[0].length > 0 && ligne[1].length > 0, nom + " : ligne vide");
      }
    }
  });

  test("la liste d'allergenes d'une ligne, quand elle existe, est bien une liste", () => {
    // C'est elle qui permet de filtrer les equivalences selon le regime.
    // Une valeur mal formee ferait passer un aliment a travers le filtre.
    for (const nom of EQUIVALENCES) {
      for (const ligne of catalogues[nom]) {
        if (ligne.length > 2) {
          assert.ok(Array.isArray(ligne[2]), `${nom} : « ${ligne[0]} » a une liste d'allergènes mal formée`);
        }
      }
    }
  });

  test("un conseil existe pour chaque objectif propose au client", async () => {
    const { GOALS } = await import("../app/src/lib/nutrition.js");
    for (const objectif of GOALS) {
      assert.ok(
        catalogues.GOAL_FOOD_NOTES[objectif.id],
        "aucun conseil alimentaire pour l'objectif « " + objectif.label + " »"
      );
    }
  });
});
