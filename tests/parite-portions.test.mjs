/**
 * Parite du calcul des portions : ancienne version contre nouvelle.
 *
 * C'est le calcul qui transforme « 180 g de riz » en calories. Une erreur
 * ici fausse le journal alimentaire du client, donc son bilan, donc les
 * conseils que son coach lui donne.
 *
 * Un point de compatibilite est teste specifiquement : les entrees creees
 * avant l'ajout du champ « grams » n'ont leur grammage que dans leur
 * libelle, « Riz basmati (150 g) ». Si la relecture de ce format se
 * cassait, les clients ne pourraient plus modifier la portion d'un repas
 * saisi il y a des mois.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import {
  basisMacros,
  fmtPortion,
  itemBasis,
  parseGrams,
  scaleMacros,
  stripGrams,
  sumMacros,
  toGramBasis
} from "../app/src/lib/portions.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

const memeObjet = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

const LIBELLES = [
  "Riz basmati (150 g)",
  "Riz basmati (150g)",
  "Poulet (120,5 g)",
  "Poulet (120.5 g)",
  "Salade (0 g)",
  "Salade (-30 g)",
  "Pain",
  "Yaourt (2 portions)",
  "Gâteau (150 g) maison",
  "",
  null,
  undefined,
  "Riz (150 g) et poulet (120 g)"
];

describe("lecture du grammage dans un libelle", () => {
  test("les deux versions lisent la meme chose", () => {
    for (const nom of LIBELLES) {
      assert.equal(parseGrams(nom), legacy.parseGrams(nom), JSON.stringify(nom));
    }
  });

  test("la virgule decimale est acceptee", () => {
    // C'est ce que tape un francophone.
    assert.equal(parseGrams("Poulet (120,5 g)"), 120.5);
  });

  test("un grammage nul ou negatif est ignore", () => {
    assert.equal(parseGrams("Salade (0 g)"), null);
    assert.equal(parseGrams("Salade (-30 g)"), null);
  });

  test("le libelle se nettoie de la meme facon", () => {
    for (const nom of LIBELLES) {
      assert.equal(stripGrams(nom), legacy.stripGrams(nom), JSON.stringify(nom));
    }
  });
});

describe("base de calcul d'un aliment", () => {
  const ENTREES = [
    { name: "Riz basmati (150 g)", calories: 195, protein: 4, carbs: 42, fat: 0.5 },
    { name: "Riz basmati", grams: 150, baseName: "Riz basmati", calories: 195, protein: 4, carbs: 42, fat: 0.5 },
    { name: "Pomme", calories: 90, protein: 0.5, carbs: 22, fat: 0.3 },
    { name: "Poulet", grams: 0, calories: 200, protein: 40, carbs: 0, fat: 5 },
    { name: "Yaourt", grams: null, calories: 120, protein: 10, carbs: 12, fat: 3 },
    { name: "Sans macros (100 g)" },
    { name: "Zéro calorie (100 g)", calories: 0, protein: 0, carbs: 0, fat: 0 },
    // Grammage negatif : il doit etre ecarte comme un grammage nul. Sans ce
    // cas, retirer le test « > 0 » du champ enregistre passait inapercu.
    { name: "Saisie erronée", grams: -5, calories: 200, protein: 10, carbs: 20, fat: 5 },
    { name: "Grammage illisible", grams: "abc", calories: 200, protein: 10, carbs: 20, fat: 5 },
    // Nom de base different du libelle : sans ce cas, ignorer baseName
    // donnait le meme resultat et la mutation passait inapercue.
    { name: "Riz (150 g)", grams: 150, baseName: "Riz thaï complet", calories: 195, protein: 4, carbs: 42, fat: 0.5 }
  ];

  test("les deux versions produisent la meme base", () => {
    for (const entree of ENTREES) {
      assert.deepEqual(memeObjet(itemBasis(entree)), memeObjet(legacy.itemBasis(entree)), entree.name);
    }
  });

  test("le champ enregistre prime sur le libelle", () => {
    // Une entree recente a les deux ; le champ fait foi.
    const base = itemBasis({ name: "Riz (150 g)", grams: 200, calories: 260 });
    assert.equal(base.qty, 200);
  });

  test("le nom de base enregistre prime sur le libelle nettoye", () => {
    // Le libelle affiche peut avoir ete reecrit ; baseName garde le nom
    // sous lequel l'aliment a ete enregistre.
    const base = itemBasis({ name: "Riz (150 g)", grams: 150, baseName: "Riz thaï complet", calories: 195 });
    assert.equal(base.label, "Riz thaï complet");
  });

  test("un grammage negatif est traite comme absent", () => {
    const base = itemBasis({ name: "Saisie erronée", grams: -5, calories: 200 });
    assert.equal(base.unit, "x", "un grammage négatif ne doit pas créer une base au gramme");
  });

  test("un ancien libelle reste modifiable", () => {
    // Sans cela, les repas saisis avant l'ajout du champ « grams »
    // deviendraient impossibles a re-porter.
    const base = itemBasis({ name: "Riz basmati (150 g)", calories: 195, protein: 4, carbs: 42, fat: 0.5 });
    assert.equal(base.unit, "g");
    assert.equal(base.qty, 150);
    assert.equal(base.label, "Riz basmati");
    assert.equal(round6(base.per.kcal), round6(195 / 150));
  });

  test("sans grammage, l'aliment se compte en portions", () => {
    const base = itemBasis({ name: "Pomme", calories: 90 });
    assert.equal(base.unit, "x");
    assert.equal(base.qty, 1);
  });
});

const round6 = (v) => Math.round(v * 1e6) / 1e6;

describe("mise a l'echelle", () => {
  const MACROS = [
    { kcal: 195, p: 4, c: 42, f: 0.5 },
    { kcal: 0, p: 0, c: 0, f: 0 },
    { kcal: 1000, p: 82.7, c: 33.33, f: 12.5 }
  ];
  const FACTEURS = [0, 0.5, 1, 1.5, 2, 3.25, 0.333];

  test("les deux versions concordent", () => {
    for (const m of MACROS) {
      for (const f of FACTEURS) {
        assert.deepEqual(memeObjet(scaleMacros(m, f)), memeObjet(legacy.scaleMacros(m, f)), `${m.kcal} × ${f}`);
      }
    }
  });

  test("les calories sont entieres, les macros au dixieme", () => {
    // Annoncer « 187,3 kcal » donnerait une fausse impression de precision
    // sur des valeurs deja approximatives.
    const s = scaleMacros({ kcal: 195, p: 4.27, c: 42, f: 0.53 }, 1.37);
    assert.ok(Number.isInteger(s.kcal));
    assert.equal(s.p, 5.8, "4,27 × 1,37 = 5,8499 → 5,8");
    assert.equal(s.f, 0.7, "0,53 × 1,37 = 0,7261 → 0,7");
  });

  test("une quantite vide ou illisible donne zero, pas NaN", () => {
    // Un champ vide en cours de saisie ne doit pas afficher « NaN kcal ».
    const base = itemBasis({ name: "Riz (100 g)", calories: 130 });
    for (const q of ["", null, undefined, "abc", -5, 0]) {
      const m = basisMacros(base, q);
      assert.equal(m.kcal, 0, "quantité " + JSON.stringify(q));
      assert.ok(!Number.isNaN(m.p), "NaN pour la quantité " + JSON.stringify(q));
    }
  });

  test("les macros d'une quantite concordent avec l'original", () => {
    const entree = { name: "Riz basmati (150 g)", calories: 195, protein: 4, carbs: 42, fat: 0.5 };
    const base = itemBasis(entree);
    const baseL = legacy.itemBasis(entree);
    for (const q of [50, 100, 150, 180, 237.5]) {
      assert.deepEqual(memeObjet(basisMacros(base, q)), memeObjet(legacy.basisMacros(baseL, q)), "pour " + q + " g");
    }
  });
});

describe("conversion en base au gramme", () => {
  test("les deux versions concordent", () => {
    const base = itemBasis({ name: "Part de gâteau", calories: 300, protein: 4, carbs: 40, fat: 14 });
    const baseL = legacy.itemBasis({ name: "Part de gâteau", calories: 300, protein: 4, carbs: 40, fat: 14 });
    for (const g of [0, -10, null, "", 80, 125.5]) {
      assert.deepEqual(memeObjet(toGramBasis(base, g)), memeObjet(legacy.toGramBasis(baseL, g)), "référence " + g);
    }
  });

  test("une base deja au gramme n'est pas reconvertie", () => {
    const base = itemBasis({ name: "Riz (150 g)", calories: 195 });
    assert.deepEqual(memeObjet(toGramBasis(base, 200)), memeObjet(base));
  });

  test("apres conversion, le total reste celui de la portion d'origine", () => {
    // C'est le sens de l'operation : le client dit « ma part fait 80 g »,
    // et les 300 kcal de sa part doivent rester 300 kcal.
    const base = itemBasis({ name: "Part de gâteau", calories: 300, protein: 4, carbs: 40, fat: 14 });
    const auGramme = toGramBasis(base, 80);
    assert.deepEqual(basisMacros(auGramme, 80), { kcal: 300, p: 4, c: 40, f: 14 });
  });
});

describe("somme et affichage", () => {
  test("la somme concorde avec l'original", () => {
    const listes = [
      [],
      [{ kcal: 100, p: 10, c: 5, f: 2 }],
      [
        { kcal: 195, p: 4.1, c: 42.2, f: 0.5 },
        { kcal: 220, p: 40.4, c: 0, f: 5.3 },
        { kcal: 90, p: 0.5, c: 22.1, f: 0.3 }
      ]
    ];
    for (const l of listes) {
      assert.deepEqual(memeObjet(sumMacros(l)), memeObjet(legacy.sumMacros(l)), JSON.stringify(l));
    }
  });

  test("le multiplicateur s'affiche a la francaise", () => {
    for (const v of [1, 1.5, 2, 0.25, 3.333]) {
      assert.equal(fmtPortion(v), legacy.fmtPortion(v), "pour " + v);
    }
    assert.equal(fmtPortion(1.5), "1,5");
    assert.equal(fmtPortion(2), "2");
  });
});
