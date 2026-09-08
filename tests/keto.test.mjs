/**
 * Regime cetogene : calibrage des macros.
 *
 * Le defaut corrige ici etait silencieux et complet : cocher « Kéto » dans
 * le profil filtrait les aliments proposes — au-dela de 12 g de glucides
 * pour 100 g, un aliment disparaissait — sans toucher aux objectifs du
 * jour. Le client se voyait donc demander 250 a 350 g de glucides, avec un
 * catalogue amputé de leurs sources. Objectif intenable, et faux.
 *
 * Ces tests verrouillent les trois proprietes qui font qu'un objectif keto
 * est un objectif keto : glucides bas, lipides majoritaires, et calories
 * inchangees par rapport a n'importe quel autre regime.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeTargets, estFaibleEnGlucides, glucidesKeto } from "../app/src/lib/nutrition.js";
import { regimeOk } from "../app/src/lib/aliments.js";

const BASE = {
  sex: "homme",
  age: 38,
  heightCm: 180,
  startWeightKg: 90,
  activityLevel: "modere",
  jobType: "sedentaire",
  goal: "perte"
};

const keto = (extra) => ({ ...BASE, dietType: "keto", ...extra });
const normal = (extra) => ({ ...BASE, dietType: "aucun", ...extra });

describe("le profil kéto est reconnu", () => {
  test("seul « keto » declenche le calcul faible en glucides", () => {
    assert.equal(estFaibleEnGlucides(keto()), true);
    assert.equal(estFaibleEnGlucides(normal()), false);
    assert.equal(estFaibleEnGlucides({ ...BASE, dietType: "vegetarien" }), false);
    assert.equal(estFaibleEnGlucides({ ...BASE }), false);
    assert.equal(estFaibleEnGlucides(null), false);
  });
});

describe("cible de glucides", () => {
  test("5 % des calories, bornee entre 20 et 50 g", () => {
    assert.equal(glucidesKeto(2000), 25);
    assert.equal(glucidesKeto(2800), 35);
    // Sous 1600 kcal, 5 % descend en dessous du seuil bas d'induction.
    assert.equal(glucidesKeto(1000), 20);
    // Au-dela de 4000 kcal, 5 % depasse le plafond de la cetose.
    assert.equal(glucidesKeto(5000), 50);
  });

  test("sans calories calculables, pas de cible", () => {
    assert.equal(glucidesKeto(null), null);
  });
});

describe("objectifs d'un client kéto", () => {
  test("les glucides sont bas, la ou ils etaient un reste", () => {
    const avant = computeTargets(normal(), 90);
    const apres = computeTargets(keto(), 90);

    assert.ok(avant.carbs > 100, `le cas de reference n'est plus pertinent : ${avant.carbs} g`);
    assert.ok(apres.carbs <= 50, `glucides trop hauts pour un keto : ${apres.carbs} g`);
    assert.ok(apres.carbs >= 20, `glucides sous le seuil d'induction : ${apres.carbs} g`);
  });

  test("les calories ne bougent pas d'une kilocalorie", () => {
    for (const goal of ["perte", "prise", "maintien", "performance"]) {
      for (const poids of [55, 70, 90, 115]) {
        assert.equal(
          computeTargets(keto({ goal }), poids).calories,
          computeTargets(normal({ goal }), poids).calories,
          `objectif ${goal}, ${poids} kg`
        );
      }
    }
  });

  test("les proteines ne bougent pas non plus", () => {
    for (const poids of [55, 70, 90, 115]) {
      assert.equal(computeTargets(keto(), poids).protein, computeTargets(normal(), poids).protein);
    }
  });

  test("les lipides absorbent le reste : ils deviennent la macro majoritaire", () => {
    const t = computeTargets(keto(), 90);
    const partLipides = (t.fat * 9) / t.calories;
    assert.ok(partLipides > 0.55, `lipides a ${Math.round(partLipides * 100)} % des calories`);
    assert.ok(partLipides < 0.85, `lipides a ${Math.round(partLipides * 100)} % des calories`);
  });

  test("la somme des macros reste coherente avec le total calorique", () => {
    for (const goal of ["perte", "prise", "maintien", "performance"]) {
      for (const poids of [50, 70, 90, 120]) {
        const t = computeTargets(keto({ goal }), poids);
        const somme = t.protein * 4 + t.carbs * 4 + t.fat * 9;
        // Tolerance de 1 % : les trois macros sont arrondies au gramme.
        assert.ok(
          Math.abs(somme - t.calories) / t.calories < 0.01,
          `objectif ${goal}, ${poids} kg : ${somme} kcal de macros pour ${t.calories} kcal`
        );
      }
    }
  });

  test("le plancher hormonal de lipides reste tenu", () => {
    for (const poids of [45, 60, 90, 130]) {
      const t = computeTargets(keto(), poids);
      assert.ok((t.fat * 9) / t.calories >= 0.2, `lipides sous 20 % a ${poids} kg`);
    }
  });

  test("un profil incomplet ne produit pas de macros inventees", () => {
    const t = computeTargets(keto({ heightCm: undefined }), null);
    assert.equal(t.calories, null);
    assert.equal(t.carbs, null);
    assert.equal(t.fat, null);
  });
});

describe("cohérence entre les objectifs et les aliments proposés", () => {
  /**
   * C'est le test qui aurait attrape le defaut d'origine : un objectif de
   * glucides qu'aucun aliment autorise ne permet d'atteindre.
   *
   * Le filtre keto de lib/aliments.js ecarte tout aliment au-dessus de 12 g
   * de glucides pour 100 g. Atteindre 300 g de glucides avec de tels
   * aliments demanderait plus de 2,5 kg de nourriture par jour.
   */
  test("la cible de glucides est atteignable avec les aliments autorisés", () => {
    const profil = keto();
    const t = computeTargets(profil, 90);
    const alimentLePlusRiche = { name: "Test", c: 12, contains: [] };
    assert.equal(regimeOk(alimentLePlusRiche, profil), true);

    // Grammes d'aliment necessaires si l'on ne mangeait que le plus riche
    // en glucides encore autorise.
    const grammes = (t.carbs / alimentLePlusRiche.c) * 100;
    assert.ok(grammes < 600, `il faudrait ${Math.round(grammes)} g de l'aliment le plus riche autorisé`);
  });
});
