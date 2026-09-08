/**
 * Regimes alimentaires : liste proposee, filtrage et calibrage des macros.
 *
 * Le defaut corrige ici etait silencieux et complet : cocher « Kéto » dans
 * le profil filtrait les aliments proposes — au-dela de 12 g de glucides
 * pour 100 g, un aliment disparaissait — sans toucher aux objectifs du
 * jour. Le client se voyait donc demander 250 a 350 g de glucides, avec un
 * catalogue amputé de leurs sources. Objectif intenable, et faux.
 *
 * Ces tests verrouillent les proprietes qui font qu'un objectif keto est un
 * objectif keto — glucides bas, lipides majoritaires — et la regle qui vaut
 * pour TOUS les regimes, ancien comme nouveau : LES CALORIES NE BOUGENT
 * JAMAIS. Un regime deplace la repartition ; il ne change pas la depense
 * d'un corps.
 *
 * Chaque regime est aussi teste CONTRE CHAQUE OBJECTIF : c'est la seule
 * facon de voir qu'un calibrage juste en seche devient absurde en prise de
 * masse, et l'erreur la plus facile a laisser passer.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeTargets } from "../app/src/lib/nutrition.js";
import {
  descriptionRegime,
  estFaibleEnGlucides,
  glucidesKeto,
  glucidesLowCarb,
  libelleRegime,
  REGIMES
} from "../app/src/lib/regimes.js";
import { DIET_TYPES } from "../app/src/lib/catalogues.js";
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

describe("les régimes à glucides abaissés sont reconnus", () => {
  test("kéto et low carb, et eux seuls", () => {
    assert.equal(estFaibleEnGlucides(keto()), true);
    assert.equal(estFaibleEnGlucides({ ...BASE, dietType: "lowcarb" }), true);
    assert.equal(estFaibleEnGlucides(normal()), false);
    assert.equal(estFaibleEnGlucides({ ...BASE, dietType: "vegetarien" }), false);
    assert.equal(estFaibleEnGlucides({ ...BASE, dietType: "hyperproteine" }), false);
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

describe("liste proposée dans le profil", () => {
  test("aucun régime d'origine n'a disparu au passage", () => {
    // La liste de index.html est extraite par un script. Composer la liste
    // complete ailleurs fait courir un risque precis : qu'un regime de la
    // source cesse silencieusement d'etre proposé.
    for (const origine of DIET_TYPES) {
      assert.ok(
        REGIMES.some((r) => r.id === origine.id && r.label === origine.label),
        `régime d'origine absent ou renommé : ${origine.id}`
      );
    }
  });

  test("les régimes ajoutés sont proposés, chacun une seule fois", () => {
    for (const id of ["pescetarien", "lowcarb", "hyperproteine"]) {
      assert.equal(REGIMES.filter((r) => r.id === id).length, 1, id);
    }
  });

  test("chaque régime a un libellé lisible, jamais son identifiant", () => {
    for (const r of REGIMES) {
      assert.ok(r.label && r.label !== r.id, `libellé manquant : ${r.id}`);
      assert.equal(libelleRegime(r.id), r.label);
    }
  });

  test("un identifiant inconnu ne fait pas tomber l'affichage", () => {
    assert.equal(libelleRegime("regime-inconnu"), "regime-inconnu");
  });
});

describe("les calories ne dépendent jamais du régime", () => {
  test("tous les régimes, tous les objectifs, tous les poids", () => {
    for (const goal of ["perte", "prise", "maintien", "performance"]) {
      for (const poids of [50, 70, 90, 120]) {
        const reference = computeTargets({ ...BASE, goal, dietType: "aucun" }, poids).calories;
        for (const r of REGIMES) {
          assert.equal(
            computeTargets({ ...BASE, goal, dietType: r.id }, poids).calories,
            reference,
            `régime ${r.id}, objectif ${goal}, ${poids} kg`
          );
        }
      }
    }
  });
});

describe("régime pauvre en glucides (low carb)", () => {
  const lowcarb = (extra) => ({ ...BASE, dietType: "lowcarb", ...extra });

  test("la cible suit l'objectif : plus serrée en sèche qu'en prise", () => {
    // Ce n'est pas un reglage cosmetique. En deficit, les glucides servent
    // moins et sont le levier habituel ; en prise ou en performance, le
    // meme client s'entraine en volume et en a besoin pour finir ses
    // series. Un pourcentage unique aurait handicapé la moitié des cas.
    const enSeche = computeTargets(lowcarb({ goal: "perte" }), 90);
    const enPrise = computeTargets(lowcarb({ goal: "prise" }), 90);
    assert.ok(
      Math.abs(enSeche.carbs * 4 / enSeche.calories - 0.25) < 0.02,
      `${Math.round((enSeche.carbs * 4 * 100) / enSeche.calories)} % en sèche`
    );
    assert.ok(
      Math.abs(enPrise.carbs * 4 / enPrise.calories - 0.3) < 0.02,
      `${Math.round((enPrise.carbs * 4 * 100) / enPrise.calories)} % en prise`
    );
  });

  test("une sèche de force compte comme un déficit", () => {
    // Objectif « performance » avec direction « perte » : c'est une sèche,
    // même si l'objectif affiché ne le dit pas.
    const seche = computeTargets(lowcarb({ goal: "performance", performanceDirection: "perte" }), 90);
    const maintien = computeTargets(lowcarb({ goal: "performance", performanceDirection: "maintien" }), 90);
    assert.ok(
      seche.carbs * 4 / seche.calories < maintien.carbs * 4 / maintien.calories,
      "la sèche de force devrait être calibrée comme un déficit"
    );
  });

  test("il reste nettement au-dessus du kéto : ce sont deux régimes différents", () => {
    const bas = computeTargets({ ...BASE, dietType: "keto" }, 90).carbs;
    const modere = computeTargets(lowcarb(), 90).carbs;
    assert.ok(modere > bas * 3, `low carb ${modere} g contre kéto ${bas} g`);
    assert.ok(modere >= 50, "un low carb sous 50 g de glucides est un kéto qui s'ignore");
  });

  test("les lipides absorbent le reste, sans jamais passer sous le plancher", () => {
    for (const goal of ["perte", "prise", "maintien"]) {
      for (const poids of [50, 70, 90, 120]) {
        const t = computeTargets(lowcarb({ goal }), poids);
        assert.ok((t.fat * 9) / t.calories >= 0.2, `lipides sous 20 % — ${goal}, ${poids} kg`);
        const somme = t.protein * 4 + t.carbs * 4 + t.fat * 9;
        assert.ok(Math.abs(somme - t.calories) / t.calories < 0.01, `${somme} kcal pour ${t.calories}`);
      }
    }
  });

  test("les protéines ne bougent pas : c'est un régime de glucides", () => {
    assert.equal(computeTargets(lowcarb(), 90).protein, computeTargets(normal(), 90).protein);
  });

  test("la cible en grammes suit les calories : un gros mangeur a droit à plus", () => {
    assert.ok(glucidesLowCarb(3500, false) > glucidesLowCarb(1800, false));
    assert.equal(glucidesLowCarb(null, false), null);
  });
});

describe("régime hyperprotéiné", () => {
  const hyper = (extra) => ({ ...BASE, dietType: "hyperproteine", ...extra });

  test("les protéines montent nettement au-dessus du calcul standard", () => {
    const standard = computeTargets(normal(), 90).protein;
    const releve = computeTargets(hyper(), 90).protein;
    assert.ok(releve > standard * 1.2, `${releve} g contre ${standard} g`);
  });

  test("elles montent plus en déficit qu'en prise : c'est là qu'elles servent", () => {
    // En déficit, les protéines protègent la masse maigre. Hors déficit,
    // en empiler davantage prend seulement la place des glucides.
    const enSeche = computeTargets(hyper({ goal: "perte" }), 90).protein;
    const enPrise = computeTargets(hyper({ goal: "prise" }), 90).protein;
    assert.ok(enSeche > enPrise, `sèche ${enSeche} g, prise ${enPrise} g`);
  });

  test("elles restent supérieures à la sèche de force, qui monte déjà à 2,2 g/kg", () => {
    const secheDeForce = computeTargets(
      { ...BASE, goal: "performance", performanceDirection: "perte", dietType: "aucun" },
      90
    ).protein;
    const hyperSeche = computeTargets(
      hyper({ goal: "performance", performanceDirection: "perte" }),
      90
    ).protein;
    assert.ok(hyperSeche > secheDeForce, `${hyperSeche} g contre ${secheDeForce} g`);
  });

  test("les glucides absorbent le reste et ne deviennent jamais négatifs", () => {
    for (const goal of ["perte", "prise", "maintien", "performance"]) {
      for (const poids of [45, 70, 90, 130]) {
        const t = computeTargets(hyper({ goal }), poids);
        assert.ok(t.carbs >= 0, `glucides négatifs — ${goal}, ${poids} kg`);
        const somme = t.protein * 4 + t.carbs * 4 + t.fat * 9;
        assert.ok(Math.abs(somme - t.calories) / t.calories < 0.01, `${somme} kcal pour ${t.calories}`);
      }
    }
  });

  test("la butée empêche une assiette entièrement en protéines", () => {
    // Client lourd sur un très petit budget calorique : continuer à
    // appliquer la règle au poids ne laisserait plus de place au reste.
    // Le régime se rapproche alors du calcul standard, ce qui est le bon
    // comportement — personne ne tient 60 % de ses calories en protéines.
    for (const poids of [45, 70, 90, 130, 160]) {
      const t = computeTargets(hyper({ goal: "perte" }), poids);
      assert.ok(
        (t.protein * 4) / t.calories <= 0.5,
        `${Math.round((t.protein * 400) / t.calories)} % des calories en protéines à ${poids} kg`
      );
    }
  });

  test("les lipides gardent leur règle au poids : ce n'est pas un régime de lipides", () => {
    assert.equal(computeTargets(hyper(), 90).fat, computeTargets(normal(), 90).fat);
  });
});

describe("régime pescétarien", () => {
  const profil = { ...BASE, dietType: "pescetarien", allergies: [] };

  test("le poisson et les fruits de mer restent proposés", () => {
    assert.equal(regimeOk({ contains: ["poisson"], c: 0 }, profil), true);
    assert.equal(regimeOk({ contains: ["crustaces"], c: 0 }, profil), true);
  });

  test("la viande et la volaille sont écartées", () => {
    assert.equal(regimeOk({ contains: ["viande"], c: 0 }, profil), false);
    assert.equal(regimeOk({ contains: ["volaille"], c: 0 }, profil), false);
  });

  test("c'est bien ce qui le distingue du végétarien", () => {
    const vegetarien = { ...profil, dietType: "vegetarien" };
    assert.equal(regimeOk({ contains: ["poisson"], c: 0 }, vegetarien), false);
    assert.equal(regimeOk({ contains: ["poisson"], c: 0 }, profil), true);
  });

  test("une allergie prime toujours sur le régime", () => {
    assert.equal(regimeOk({ contains: ["poisson"], c: 0 }, { ...profil, allergies: ["poisson"] }), false);
  });

  test("les objectifs chiffrés sont ceux d'un client sans régime", () => {
    assert.deepEqual(computeTargets(profil, 90), computeTargets(normal(), 90));
  });
});

describe("explication affichée au client", () => {
  test("chaque régime qui change quelque chose s'explique", () => {
    for (const id of ["keto", "lowcarb", "hyperproteine", "pescetarien", "vegetarien", "vegetalien"]) {
      const texte = descriptionRegime({ ...BASE, dietType: id });
      assert.ok(texte && texte.length > 40, `explication absente ou trop courte : ${id}`);
    }
  });

  test("« aucun régime » n'affiche rien plutôt qu'une phrase vide de sens", () => {
    assert.equal(descriptionRegime({ ...BASE, dietType: "aucun" }), null);
    assert.equal(descriptionRegime({}), null);
    assert.equal(descriptionRegime(null), null);
  });

  test("l'explication suit l'objectif quand le calibrage en dépend", () => {
    const enSeche = descriptionRegime({ ...BASE, goal: "perte", dietType: "hyperproteine" });
    const enPrise = descriptionRegime({ ...BASE, goal: "prise", dietType: "hyperproteine" });
    assert.notEqual(enSeche, enPrise, "la même phrase pour deux calibrages différents");
    assert.ok(enSeche.includes("2,8"), enSeche);
    assert.ok(enPrise.includes("2,5"), enPrise);
  });
});
