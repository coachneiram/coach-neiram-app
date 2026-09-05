/**
 * Nommer un repas type au moment de l'enregistrer.
 *
 * DEUXIEME REGRESSION DE LA BASCULE, remontee par Marien : « quand on fait
 * enregistrer ce repas, avant on avait la possibilite de lui donner un nom,
 * maintenant on ne peut plus ».
 *
 * L'application d'origine ouvre une modale avec DEUX champs :
 *   - le nom du repas, pre-rempli avec le libelle de la section mais
 *     librement modifiable ;
 *   - le nombre de portions que donne la recette (le cas de la pate a
 *     pancakes : on saisit toute la pate, l'appli divise par 8).
 *
 * Mon portage appelait directement enregistrerRepasType avec le libelle de
 * la section et portions: 1 en dur. Consequence : tous les petits-dejeuners
 * s'appelaient « Petit-dejeuner » et devenaient indistinguables, et le bloc
 * « Recette pour N portions » de l'editeur de quantites ne se declenchait
 * jamais, faute de recette a plus d'une part.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { enregistrerRepasType } from "../app/src/lib/repas-types.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (c) => readFileSync(join(ICI, "..", c), "utf8");

function installerStockage() {
  const d = new Map();
  globalThis.localStorage = {
    getItem: (k) => (d.has(k) ? d.get(k) : null),
    setItem: (k, v) => d.set(k, String(v)),
    removeItem: (k) => d.delete(k),
    get length() {
      return d.size;
    }
  };
}

const ENTREES = [
  { name: "Flocons d'avoine (80 g)", grams: 80, baseName: "Flocons d'avoine", calories: 300, protein: 10, carbs: 52, fat: 6 },
  { name: "Fromage blanc 0% (200 g)", grams: 200, baseName: "Fromage blanc 0%", calories: 94, protein: 15, carbs: 8, fat: 0 }
];

describe("nom choisi par le client", () => {
  beforeEach(installerStockage);

  test("le nom saisi est celui retenu, pas le libelle de la section", () => {
    const liste = enregistrerRepasType([], {
      nom: "Petit-déj protéiné",
      mealType: "petitdej",
      entrees: ENTREES,
      portions: "1"
    });
    assert.equal(liste[0].name, "Petit-déj protéiné");
  });

  test("deux petits-dejeuners differents restent distinguables", () => {
    let liste = enregistrerRepasType([], { nom: "Avoine & fromage blanc", mealType: "petitdej", entrees: ENTREES, portions: "1" });
    liste = enregistrerRepasType(liste, { nom: "Pancakes du dimanche", mealType: "petitdej", entrees: ENTREES, portions: "8" });
    assert.deepEqual(
      liste.map((r) => r.name),
      ["Pancakes du dimanche", "Avoine & fromage blanc"],
      "le plus recent en tete, et les deux noms conserves"
    );
  });

  test("un nom vide retombe sur « Repas » plutot que de casser", () => {
    const liste = enregistrerRepasType([], { nom: "   ", mealType: "diner", entrees: ENTREES, portions: "1" });
    assert.equal(liste[0].name, "Repas");
  });
});

describe("nombre de portions de la recette", () => {
  beforeEach(installerStockage);

  test("la pate a pancakes est enregistree pour 8 parts", () => {
    const liste = enregistrerRepasType([], { nom: "Pancakes", mealType: "petitdej", entrees: ENTREES, portions: "8" });
    assert.equal(liste[0].portions, 8);
  });

  test("une saisie absente ou invalide vaut une seule part", () => {
    for (const v of ["", "0", "abc", null, undefined]) {
      const liste = enregistrerRepasType([], { nom: "Assiette", mealType: "midi", entrees: ENTREES, portions: v });
      assert.equal(liste[0].portions, 1, `portions=${String(v)}`);
    }
  });
});

describe("branchement de la modale", () => {
  const journal = lire("app/src/ecrans/Journal.jsx");

  test("« Enregistrer ce repas » ouvre la modale au lieu d'enregistrer d'office", () => {
    assert.match(journal, /Enregistrer ce repas/);
    assert.match(
      journal,
      /onClick=\{\(\) =>\s*setInviteEnregistrement\(\{ mealType: section\.id, nom: section\.label, portions: "1" \}\)/,
      "le bouton doit ouvrir la modale, pre-remplie avec le libelle de la section"
    );
    assert.ok(
      !/enregistrerRepasType\(repasTypes, \{ nom, mealType, entrees, portions: 1 \}\)/.test(journal),
      "l'enregistrement direct avec portions: 1 en dur est revenu"
    );
  });

  test("les deux champs sont a l'ecran", () => {
    assert.match(journal, /<Field label="Nom du repas">/);
    assert.match(journal, /<Field label="Cette recette fait combien de portions \?">/);
    assert.match(journal, /placeholder="Ex : Petit-déj protéiné"/);
  });

  test("le nom et les portions saisis remontent bien a l'enregistrement", () => {
    assert.match(journal, /nom: inviteEnregistrement\.nom/);
    assert.match(journal, /portions: inviteEnregistrement\.portions/);
  });

  test("on ne peut pas enregistrer un repas sans nom", () => {
    assert.match(journal, /disabled=\{!inviteEnregistrement\.nom\.trim\(\)\}/);
  });
});
