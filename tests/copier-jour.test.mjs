/**
 * Copier les repas de la veille.
 *
 * Un debutant mange souvent la meme chose deux jours de suite : reprendre
 * la veille en un geste evite de tout ressaisir. Ces tests verrouillent ce
 * qui est copie, et surtout ce qui ne doit pas l'etre.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { entreesACopier, resumeCopie, veille } from "../app/src/lib/copier-jour.js";

const HIER = "2026-09-28";
const AUJ = "2026-09-29";

const JOURNAL = [
  { id: "a", date: HIER, mealType: "petit-dejeuner", name: "Skyr (150 g)", calories: 90, protein: 15, carbs: 6, fat: 0, grams: 150, baseName: "Skyr" },
  { id: "b", date: HIER, mealType: "petit-dejeuner", name: "Banane", calories: 105, protein: 1, carbs: 27, fat: 0 },
  { id: "c", date: HIER, mealType: "dejeuner", name: "Poulet riz", calories: 520, protein: 40, carbs: 60, fat: 10, dishId: "p1" },
  { id: "d", date: "2026-09-27", mealType: "petit-dejeuner", name: "Avant-hier", calories: 300, protein: 5, carbs: 50, fat: 8 },
  { id: "e", date: AUJ, mealType: "diner", name: "Deja la", calories: 400, protein: 30, carbs: 20, fat: 20 }
];

describe("Copier la veille", () => {
  test("la veille d'une date, y compris a un changement de mois et d'annee", () => {
    assert.equal(veille("2026-09-29"), "2026-09-28");
    assert.equal(veille("2026-10-01"), "2026-09-30");
    assert.equal(veille("2026-01-01"), "2025-12-31");
    assert.equal(veille("2028-03-01"), "2028-02-29");
  });

  test("un repas : seuls ses aliments de la veille, a la nouvelle date", () => {
    const copie = entreesACopier(JOURNAL, { depuis: HIER, vers: AUJ, mealType: "petit-dejeuner" });
    assert.deepEqual(copie.map((e) => e.name), ["Skyr (150 g)", "Banane"]);
    assert.ok(copie.every((e) => e.date === AUJ && e.mealType === "petit-dejeuner"));
  });

  test("toute la journee : chaque aliment reste dans son repas d'origine", () => {
    const copie = entreesACopier(JOURNAL, { depuis: HIER, vers: AUJ });
    assert.deepEqual(copie.map((e) => `${e.mealType}:${e.name}`), [
      "petit-dejeuner:Skyr (150 g)",
      "petit-dejeuner:Banane",
      "dejeuner:Poulet riz"
    ]);
  });

  test("les autres jours ne sont jamais repris", () => {
    const copie = entreesACopier(JOURNAL, { depuis: HIER, vers: AUJ });
    assert.ok(!copie.some((e) => e.name === "Avant-hier" || e.name === "Deja la"));
  });

  test("quantite, macros et plat d'origine sont conserves", () => {
    const [skyr] = entreesACopier(JOURNAL, { depuis: HIER, vers: AUJ, mealType: "petit-dejeuner" });
    assert.deepEqual(skyr, {
      date: AUJ, mealType: "petit-dejeuner", name: "Skyr (150 g)",
      calories: 90, protein: 15, carbs: 6, fat: 0, grams: 150, baseName: "Skyr"
    });
    const [poulet] = entreesACopier(JOURNAL, { depuis: HIER, vers: AUJ, mealType: "dejeuner" });
    assert.equal(poulet.dishId, "p1");
  });

  test("l'identifiant est retire : la copie en recevra un nouveau", () => {
    // Deux lignes au meme identifiant : supprimer l'une effacerait l'autre.
    const copie = entreesACopier(JOURNAL, { depuis: HIER, vers: AUJ });
    assert.ok(copie.every((e) => !("id" in e)));
  });

  test("la veille n'est pas modifiee", () => {
    const avant = JSON.stringify(JOURNAL);
    entreesACopier(JOURNAL, { depuis: HIER, vers: AUJ });
    assert.equal(JSON.stringify(JOURNAL), avant);
  });

  test("rien a copier : liste vide, sans erreur", () => {
    assert.deepEqual(entreesACopier(JOURNAL, { depuis: "2026-01-01", vers: AUJ }), []);
    assert.deepEqual(entreesACopier(undefined, { depuis: HIER, vers: AUJ }), []);
    assert.deepEqual(entreesACopier(JOURNAL, { depuis: HIER, vers: AUJ, mealType: "gouter" }), []);
  });

  test("le resume annonce le nombre d'aliments et les calories", () => {
    assert.deepEqual(resumeCopie(entreesACopier(JOURNAL, { depuis: HIER, vers: AUJ })), { aliments: 3, kcal: 715 });
    assert.deepEqual(resumeCopie([]), { aliments: 0, kcal: 0 });
    assert.deepEqual(resumeCopie([{ calories: "12.6" }, { calories: null }]), { aliments: 2, kcal: 13 });
  });
});
