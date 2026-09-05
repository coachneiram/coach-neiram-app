/**
 * Integrite des catalogues alimentaires.
 *
 * Ces fichiers sont la reference nutritionnelle que le coach donne a ses
 * clients. Une valeur de travers ne se voit pas : elle produit simplement
 * un conseil faux, suivi pendant des semaines.
 *
 * Le controle central compare les calories annoncees a ce que donnent les
 * macronutriments (4 kcal/g pour les proteines et les glucides, 9 pour les
 * lipides). Il attrape les fautes de frappe, les virgules deplacees et les
 * lignes recopiees a moitie.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");

const FICHIERS = [
  "food-basic-catalog.js",
  "food-extended-catalog.js",
  "food-staples-catalog.js",
  "food-bruts-catalog.js"
];

/**
 * Boissons alcoolisees.
 *
 * L'alcool apporte 7 kcal/g et n'entre ni dans les proteines, ni dans les
 * glucides, ni dans les lipides : leurs calories ne se deduisent donc pas
 * des macros, et les compter comme des erreurs serait faux.
 */
const ALCOOLS = /vin |vin$|biere|champagne|whisky|vodka|rhum|gin |irish coffee|cidre|pastis|mojito|spritz|kir|punch|sangria|liqueur|digestif|aperitif/i;

const sansAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

let aliments = [];

before(() => {
  // Les catalogues s'enregistrent dans une variable globale du navigateur.
  globalThis.window = {};
  for (const fichier of FICHIERS) {
    const code = readFileSync(join(RACINE, fichier), "utf8");
    try {
      new Function(code)();
    } catch (e) {
      // food-basic installe aussi un moteur de recherche qui a besoin du
      // DOM : ses aliments sont enregistres avant l'echec, ce qui suffit.
    }
  }
  aliments = globalThis.window.__CN_FOOD_ITEMS__ || [];
});

describe("chargement", () => {
  test("les quatre catalogues fournissent des aliments", () => {
    assert.ok(aliments.length > 600, "catalogue anormalement petit : " + aliments.length);
  });

  test("chaque aliment a un code, un nom et ses macros", () => {
    for (const a of aliments) {
      assert.ok(a.code, "aliment sans code : " + a.product_name);
      assert.ok(a.product_name, "aliment sans nom : " + a.code);
      for (const champ of ["energy-kcal_100g", "proteins_100g", "carbohydrates_100g", "fat_100g"]) {
        assert.equal(typeof a.nutriments[champ], "number", `${champ} manquant pour « ${a.product_name} »`);
      }
    }
  });

  test("aucun code n'est utilise deux fois", () => {
    // Le moteur ignore silencieusement le second : l'aliment disparaitrait
    // de la recherche sans que rien ne le signale.
    const vus = new Set();
    for (const a of aliments) {
      assert.ok(!vus.has(a.code), "code en double : " + a.code);
      vus.add(a.code);
    }
  });
});

describe("coherence nutritionnelle", () => {
  test("les calories correspondent aux macronutriments", () => {
    const ecarts = [];
    for (const a of aliments) {
      if (ALCOOLS.test(sansAccents(a.product_name))) continue;
      const n = a.nutriments;
      const kcal = n["energy-kcal_100g"];
      const calcule = n.proteins_100g * 4 + n.carbohydrates_100g * 4 + n.fat_100g * 9;
      // Tolerance large : les valeurs de reference sont arrondies et les
      // fibres ne sont pas comptees dans les glucides de la meme facon
      // partout. Au-dela, c'est une faute de saisie.
      if (Math.abs(calcule - kcal) > Math.max(35, kcal * 0.3)) {
        ecarts.push(`${a.product_name} : ${kcal} kcal annoncées, ${Math.round(calcule)} calculées`);
      }
    }
    assert.deepEqual(ecarts, [], "incohérences nutritionnelles");
  });

  test("aucune valeur negative", () => {
    for (const a of aliments) {
      const n = a.nutriments;
      for (const champ of ["energy-kcal_100g", "proteins_100g", "carbohydrates_100g", "fat_100g"]) {
        assert.ok(n[champ] >= 0, `${champ} négatif pour « ${a.product_name} »`);
      }
    }
  });

  test("les macros d'un aliment ne depassent pas 100 g", () => {
    for (const a of aliments) {
      const n = a.nutriments;
      const total = n.proteins_100g + n.carbohydrates_100g + n.fat_100g;
      assert.ok(total <= 100.5, `« ${a.product_name} » annonce ${total.toFixed(1)} g de macros pour 100 g`);
    }
  });

  test("aucune valeur energetique impossible", () => {
    // 100 g de lipides purs plafonnent a 900 kcal.
    for (const a of aliments) {
      assert.ok(a.nutriments["energy-kcal_100g"] <= 900, `« ${a.product_name} » dépasse 900 kcal/100 g`);
    }
  });
});

describe("publication", () => {
  test("chaque catalogue est charge par l'application", () => {
    const html = readFileSync(join(RACINE, "index.html"), "utf8");
    for (const fichier of FICHIERS) {
      assert.ok(html.includes(fichier), "catalogue jamais chargé par index.html : " + fichier);
    }
  });

  test("le moteur de recherche est charge en dernier", () => {
    // food-basic-catalog.js enregistre ses aliments PUIS installe le
    // moteur commun. Charge avant les autres, il indexerait un catalogue
    // incomplet.
    const html = readFileSync(join(RACINE, "index.html"), "utf8");
    const moteur = html.indexOf("food-basic-catalog.js");
    for (const fichier of FICHIERS.filter((f) => f !== "food-basic-catalog.js")) {
      assert.ok(html.indexOf(fichier) < moteur, fichier + " doit être chargé avant le moteur de recherche");
    }
  });

  test("chaque catalogue est disponible hors ligne", () => {
    const sw = readFileSync(join(RACINE, "sw.js"), "utf8");
    for (const fichier of FICHIERS) {
      assert.ok(sw.includes(fichier), "catalogue absent du mode hors ligne : " + fichier);
    }
  });
});
