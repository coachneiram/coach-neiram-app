/**
 * Repas types et portions.
 *
 * C'est ce qui fait qu'un suivi alimentaire tient dans la duree : personne
 * ne retape les macros de son petit-dejeuner tous les matins. Si l'appli
 * l'exige, elle est abandonnee en deux semaines.
 */

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { chargerApp, creerLocalStorage } from "./harness.mjs";
import {
  PALIERS_PORTION,
  enregistrerRepasType,
  lireRepasTypes,
  memoriserGrammage,
  multiplicateur,
  supprimerRepasType,
  totauxRepasType
} from "../app/src/lib/repas-types.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

const REPAS = {
  id: "r1",
  name: "Petit-déj protéiné",
  items: [
    { name: "Flocons d'avoine (60 g)", calories: 228, protein: 8, carbs: 40, fat: 4 },
    { name: "Whey (30 g)", calories: 120, protein: 24, carbs: 2, fat: 1 }
  ]
};

describe("totaux d'un repas type", () => {
  test("ils concordent avec l'application actuelle", () => {
    assert.deepEqual({ ...totauxRepasType(REPAS) }, { ...legacy.presetTotals(REPAS) });
  });

  test("un repas vide totalise zero sans planter", () => {
    assert.deepEqual(totauxRepasType({}), { kcal: 0, p: 0, c: 0, f: 0 });
  });

  test("une valeur illisible compte pour zero", () => {
    const t = totauxRepasType({ items: [{ calories: "abc", protein: "12" }] });
    assert.equal(t.kcal, 0);
    assert.equal(t.p, 12);
  });
});

describe("enregistrement d'un repas", () => {
  test("il est relu tel quel apres enregistrement", () => {
    const liste = enregistrerRepasType([], {
      nom: "Petit-déj",
      mealType: "petit-dejeuner",
      entrees: REPAS.items,
      portions: 1
    });
    assert.equal(liste.length, 1);
    assert.equal(lireRepasTypes()[0].name, "Petit-déj");
    assert.equal(lireRepasTypes()[0].items.length, 2);
  });

  test("un repas sans aliment n'est pas enregistre", () => {
    // Un repas vide occuperait la liste sans rien pouvoir reinjecter.
    assert.deepEqual(enregistrerRepasType([], { nom: "Vide", entrees: [] }), []);
  });

  test("sans nom, le repas s'appelle « Repas »", () => {
    const liste = enregistrerRepasType([], { nom: "   ", entrees: REPAS.items });
    assert.equal(liste[0].name, "Repas");
  });

  test("le nombre de portions vaut au moins un", () => {
    // Zero portion rendrait le repas inutilisable, et une portion
    // fractionnaire n'a pas de sens.
    for (const portions of [0, -3, 0.4, "abc", null]) {
      assert.equal(enregistrerRepasType([], { entrees: REPAS.items, portions })[0].portions, 1, String(portions));
    }
    assert.equal(enregistrerRepasType([], { entrees: REPAS.items, portions: 8 })[0].portions, 8);
    assert.equal(enregistrerRepasType([], { entrees: REPAS.items, portions: 7.6 })[0].portions, 8);
  });

  test("le plus recent arrive en tete", () => {
    let liste = enregistrerRepasType([], { nom: "Ancien", entrees: REPAS.items });
    liste = enregistrerRepasType(liste, { nom: "Récent", entrees: REPAS.items });
    assert.equal(liste[0].name, "Récent");
  });

  test("la liste est plafonnee", () => {
    // Au-dela, elle devient impraticable a faire defiler sur telephone.
    let liste = [];
    for (let i = 0; i < 70; i++) liste = enregistrerRepasType(liste, { nom: "R" + i, entrees: REPAS.items });
    assert.equal(liste.length, 60);
    assert.equal(liste[0].name, "R69", "le plus récent doit survivre au plafonnement");
  });

  test("la suppression retire uniquement le repas vise", () => {
    let liste = enregistrerRepasType([], { nom: "A", entrees: REPAS.items });
    liste = enregistrerRepasType(liste, { nom: "B", entrees: REPAS.items });
    const restant = supprimerRepasType(liste, liste[0].id);
    assert.equal(restant.length, 1);
    assert.equal(restant[0].name, "A");
    assert.equal(lireRepasTypes().length, 1, "la suppression doit être enregistrée");
  });
});

describe("memorisation du grammage", () => {
  test("le poids d'une portion est retenu", () => {
    // Sinon le client devrait re-indiquer « ma part fait 80 g » a chaque
    // reutilisation du repas.
    const liste = memoriserGrammage([{ ...REPAS }], "r1", 0, 60);
    assert.equal(liste[0].items[0].grams, 60);
    assert.equal(liste[0].items[0].baseName, "Flocons d'avoine (60 g)");
  });

  test("un grammage nul ou negatif est ignore", () => {
    for (const g of [0, -10, "", "abc"]) {
      const liste = memoriserGrammage([{ ...REPAS }], "r1", 0, g);
      assert.equal(liste[0].items[0].grams, undefined, String(g));
    }
  });

  test("un repas inconnu laisse la liste intacte", () => {
    const liste = memoriserGrammage([{ ...REPAS }], "inexistant", 0, 60);
    assert.equal(liste[0].items[0].grams, undefined);
  });
});

describe("multiplicateur de portion", () => {
  test("les paliers sont ceux de l'application actuelle", () => {
    assert.deepEqual(PALIERS_PORTION, Array.from(legacy.PORTION_STEPS));
  });

  test("la virgule francaise est acceptee", () => {
    assert.equal(multiplicateur("1,5"), 1.5);
    assert.equal(multiplicateur("1.5"), 1.5);
  });

  test("une saisie invalide vaut zero, ce qui desactive l'ajout", () => {
    for (const saisie of ["", "abc", "0", "-2", null]) {
      assert.equal(multiplicateur(saisie), 0, String(saisie));
    }
  });

  test("le multiplicateur est plafonne a vingt", () => {
    // Une faute de frappe ne doit pas ajouter 20 000 kcal d'un coup.
    assert.equal(multiplicateur("500"), 20);
    assert.equal(multiplicateur("20"), 20);
    assert.equal(multiplicateur("19.5"), 19.5);
  });
});
