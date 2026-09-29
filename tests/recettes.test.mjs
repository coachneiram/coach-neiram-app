/**
 * Recettes : composer un plat cuisine ingredient par ingredient.
 *
 * Demande du coach : « la personne prepare une quiche, elle met 200 g de
 * lardons, 100 g de lait... » et l'application calcule les calories.
 *
 * Une recette est un repas type avec un nombre de parts : elle se reprend
 * depuis le Journal comme n'importe quel repas enregistre. Ces tests
 * verrouillent la creation, la modification, et la part consommee.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { creerLocalStorage } from "./harness.mjs";
import { basisMacros, itemBasis, sumMacros } from "../app/src/lib/portions.js";
import {
  CLE_REPAS_TYPES,
  enregistrerRecette,
  enregistrerRepasType,
  estRecette,
  lignesParParts,
  lireRecettes,
  lireRepasTypes,
  quantitesDUnePortion,
  totauxParPortion,
  totauxRepasType
} from "../app/src/lib/repas-types.js";

beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

/** Ce que renvoie la recherche d'aliments une fois la quantite choisie. */
const LARDONS = { name: "Lardons fumés (200 g)", baseName: "Lardons fumés", grams: 200, calories: 540, protein: 32, carbs: 1, fat: 46, fiber: null };
const LAIT = { name: "Lait demi-écrémé (100 g)", baseName: "Lait demi-écrémé", grams: 100, calories: 46, protein: 3.2, carbs: 4.8, fat: 1.6 };
const OEUFS = { name: "Oeufs (150 g)", baseName: "Oeufs", grams: 150, calories: 210, protein: 18.9, carbs: 0.9, fat: 14.9 };

const QUICHE = { nom: "Quiche lorraine", ingredients: [LARDONS, LAIT, OEUFS], portions: 6 };

describe("creer une recette", () => {
  test("elle est enregistree comme repas type, marquee recette, avec ses parts", () => {
    const liste = enregistrerRecette([], QUICHE);
    assert.equal(liste.length, 1);
    const r = liste[0];
    assert.equal(r.name, "Quiche lorraine");
    assert.equal(r.portions, 6);
    assert.equal(r.recette, true);
    assert.ok(r.id, "sans identifiant, impossible de la modifier ensuite");
    assert.equal(r.items.length, 3);
  });

  test("elle survit a la fermeture de l'app : ecrite dans le stockage des repas types", () => {
    enregistrerRecette([], QUICHE);
    const relue = lireRepasTypes();
    assert.equal(relue.length, 1);
    assert.equal(relue[0].name, "Quiche lorraine");
    assert.ok(localStorage.getItem(CLE_REPAS_TYPES), "rien d'écrit sous la clé des repas types");
  });

  test("chaque ingredient garde son poids : le Journal pourra le re-echelonner", () => {
    const [r] = enregistrerRecette([], QUICHE);
    assert.deepEqual(
      r.items.map((it) => [it.baseName, it.grams]),
      [["Lardons fumés", 200], ["Lait demi-écrémé", 100], ["Oeufs", 150]]
    );
  });

  test("le total de la recette est la somme des ingredients", () => {
    const [r] = enregistrerRecette([], QUICHE);
    const t = totauxRepasType(r);
    assert.equal(t.kcal, 540 + 46 + 210);
  });

  test("une recette sans ingredient n'est pas enregistree", () => {
    const liste = enregistrerRecette([], { nom: "Vide", ingredients: [], portions: 4 });
    assert.deepEqual(liste, []);
    assert.equal(localStorage.getItem(CLE_REPAS_TYPES), null);
  });

  test("un nom vide devient « Recette » plutot qu'une ligne sans titre", () => {
    const [r] = enregistrerRecette([], { ...QUICHE, nom: "   " });
    assert.equal(r.name, "Recette");
  });

  test("le nombre de parts vaut au moins 1 et reste entier", () => {
    assert.equal(enregistrerRecette([], { ...QUICHE, portions: 0 })[0].portions, 1);
    assert.equal(enregistrerRecette([], { ...QUICHE, portions: "" })[0].portions, 1);
    assert.equal(enregistrerRecette([], { ...QUICHE, portions: 5.6 })[0].portions, 6);
  });

  test("la nouvelle recette passe en tete, les repas deja enregistres restent intacts", () => {
    const avant = enregistrerRepasType([], {
      nom: "Petit-déj",
      mealType: "petit-dejeuner",
      entrees: [{ name: "Skyr", calories: 90, protein: 15, carbs: 5, fat: 0 }],
      portions: 1
    });
    const apres = enregistrerRecette(avant, QUICHE);
    assert.equal(apres.length, 2);
    assert.equal(apres[0].name, "Quiche lorraine");
    assert.deepEqual(apres[1], avant[0], "le repas existant a été modifié");
    assert.equal(estRecette(apres[1]), false);
  });
});

describe("lister les recettes", () => {
  test("seules les recettes sont listees, pas les repas enregistres depuis le Journal", () => {
    const avec = enregistrerRepasType([], {
      nom: "Petit-déj",
      mealType: "petit-dejeuner",
      entrees: [{ name: "Skyr", calories: 90, protein: 15, carbs: 5, fat: 0 }],
      portions: 1
    });
    enregistrerRecette(avec, QUICHE);
    assert.deepEqual(lireRecettes().map((r) => r.name), ["Quiche lorraine"]);
  });
});

describe("modifier une recette", () => {
  test("elle garde son identifiant, sa place et sa date", () => {
    const creee = enregistrerRecette([], QUICHE);
    const [r] = creee;
    const modifiee = enregistrerRecette(creee, { id: r.id, nom: "Quiche au saumon", ingredients: [LAIT], portions: 8 });
    assert.equal(modifiee.length, 1, "une modification ne doit pas créer de doublon");
    assert.equal(modifiee[0].id, r.id);
    assert.equal(modifiee[0].createdAt, r.createdAt);
    assert.equal(modifiee[0].name, "Quiche au saumon");
    assert.equal(modifiee[0].portions, 8);
    assert.equal(modifiee[0].items.length, 1);
  });

  test("les autres repas ne bougent pas", () => {
    let liste = enregistrerRecette([], QUICHE);
    liste = enregistrerRecette(liste, { nom: "Pizza", ingredients: [LAIT], portions: 4 });
    const pizza = liste[0];
    const quiche = liste[1];
    const apres = enregistrerRecette(liste, { id: quiche.id, nom: "Quiche", ingredients: [OEUFS], portions: 6 });
    assert.deepEqual(apres[0], pizza);
    assert.equal(apres[1].id, quiche.id);
  });
});

describe("une part de la recette", () => {
  test("les totaux d'une part sont ceux de la recette divises par le nombre de parts", () => {
    const [r] = enregistrerRecette([], QUICHE);
    const part = totauxParPortion(r);
    assert.equal(part.kcal, (540 + 46 + 210) / 6);
    assert.equal(part.p, (32 + 3.2 + 18.9) / 6);
  });

  test("le Journal ouvre la recette a UNE part, pas a la recette entiere", () => {
    // C'est ce que le client voit ecrit : « tu en manges combien ? 1 ».
    // Valider sans toucher au champ doit ajouter une part.
    const [r] = enregistrerRecette([], QUICHE);
    const bases = r.items.map(itemBasis);
    const quantites = quantitesDUnePortion(bases, r.portions);
    assert.deepEqual(quantites, ["33.33", "16.67", "25"]);

    const total = sumMacros(bases.map((b, i) => basisMacros(b, quantites[i])));
    assert.ok(
      Math.abs(total.kcal - (540 + 46 + 210) / 6) < 1,
      `une part devrait faire ~${Math.round(796 / 6)} kcal, obtenu ${total.kcal}`
    );
  });

  test("un repas en une seule portion s'ouvre inchange", () => {
    const bases = [LARDONS, LAIT].map(itemBasis);
    assert.deepEqual(quantitesDUnePortion(bases, 1), ["200", "100"]);
    assert.deepEqual(quantitesDUnePortion(bases, undefined), ["200", "100"]);
  });
});

describe("Tableau des parts : 1, 2, 3 parts ou la recette entiere", () => {
  const TOTAL = { kcal: 1200, p: 60, c: 90, f: 72 };

  test("une quiche de 6 parts : 1, 2, 3 parts puis la recette entiere", () => {
    const lignes = lignesParParts(TOTAL, 6);
    assert.deepEqual(lignes.map((l) => l.parts), [1, 2, 3, 6]);
    assert.deepEqual(lignes.map((l) => l.entiere), [false, false, false, true]);
    assert.deepEqual(lignes[0], { parts: 1, entiere: false, kcal: 200, p: 10, c: 15, f: 12 });
    assert.deepEqual(lignes[1], { parts: 2, entiere: false, kcal: 400, p: 20, c: 30, f: 24 });
    assert.deepEqual(lignes[2], { parts: 3, entiere: false, kcal: 600, p: 30, c: 45, f: 36 });
    assert.deepEqual(lignes[3], { parts: 6, entiere: true, kcal: 1200, p: 60, c: 90, f: 72 });
  });

  test("les paliers qui depassent la recette sont omis", () => {
    assert.deepEqual(lignesParParts(TOTAL, 2).map((l) => l.parts), [1, 2]);
    assert.deepEqual(lignesParParts(TOTAL, 3).map((l) => l.parts), [1, 2, 3]);
    assert.deepEqual(lignesParParts(TOTAL, 4).map((l) => l.parts), [1, 2, 3, 4]);
    // La derniere ligne, et elle seule, est la recette entiere.
    assert.equal(lignesParParts(TOTAL, 3).filter((l) => l.entiere).length, 1);
  });

  test("la recette entiere reprend exactement le total", () => {
    const derniere = lignesParParts(TOTAL, 8).at(-1);
    assert.equal(derniere.kcal, 1200);
    assert.equal(derniere.p, 60);
  });

  test("rien a afficher pour un repas d'une seule portion", () => {
    assert.deepEqual(lignesParParts(TOTAL, 1), []);
    assert.deepEqual(lignesParParts(TOTAL, undefined), []);
    assert.deepEqual(lignesParParts(TOTAL, "0"), []);
  });

  test("un nombre de parts saisi en texte ou decimal est arrondi", () => {
    assert.deepEqual(lignesParParts(TOTAL, "6").map((l) => l.parts), [1, 2, 3, 6]);
    assert.deepEqual(lignesParParts(TOTAL, 5.6).map((l) => l.parts), [1, 2, 3, 6]);
  });
});
