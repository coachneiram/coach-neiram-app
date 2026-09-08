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
import { computeTargets, poidsDeReference } from "../app/src/lib/nutrition.js";
import {
  alerteRegime,
  descriptionRegime,
  estFaibleEnGlucides,
  glucidesKeto,
  glucidesLowCarb,
  libelleRegime,
  REPARTITIONS,
  repartitionDuProfil,
  RESTRICTIONS,
  restrictionDuProfil,
  resumeRegime
} from "../app/src/lib/regimes.js";
import { DIET_TYPES, FOOD_DB } from "../app/src/lib/catalogues.js";
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
    assert.equal(estFaibleEnGlucides({ ...BASE, repartitionMacros: "lowcarb" }), true);
    assert.equal(estFaibleEnGlucides(normal()), false);
    assert.equal(estFaibleEnGlucides({ ...BASE, dietType: "vegetarien" }), false);
    assert.equal(estFaibleEnGlucides({ ...BASE, repartitionMacros: "hyperproteine" }), false);
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

describe("les deux axes du profil", () => {
  test("aucune restriction d'origine n'a disparu au passage", () => {
    // La liste de index.html est extraite par un script. Composer la liste
    // ailleurs fait courir un risque precis : qu'un regime de la source
    // cesse silencieusement d'etre proposé.
    for (const origine of DIET_TYPES.filter((d) => d.id !== "keto")) {
      assert.ok(
        RESTRICTIONS.some((r) => r.id === origine.id && r.label === origine.label),
        `restriction d'origine absente ou renommée : ${origine.id}`
      );
    }
  });

  test("le kéto a changé d'axe : ce n'est pas une restriction", () => {
    assert.ok(!RESTRICTIONS.some((r) => r.id === "keto"));
    assert.ok(REPARTITIONS.some((r) => r.id === "keto"));
  });

  test("« standard » est la répartition par défaut, et elle est en tête", () => {
    assert.equal(REPARTITIONS[0].id, "standard");
    assert.equal(repartitionDuProfil({}), "standard");
    assert.equal(repartitionDuProfil(null), "standard");
  });

  test("chaque entrée a un libellé lisible, jamais son identifiant", () => {
    for (const r of [...RESTRICTIONS, ...REPARTITIONS]) {
      assert.ok(r.label && r.label !== r.id, `libellé manquant : ${r.id}`);
      assert.equal(libelleRegime(r.id), r.label);
    }
  });

  test("les deux axes se combinent librement", () => {
    // C'est la raison d'etre de la scission : un vegetarien qui veut monter
    // ses proteines ne devait plus avoir a choisir entre les deux.
    const profil = { ...BASE, dietType: "vegetarien", repartitionMacros: "hyperproteine" };
    assert.equal(restrictionDuProfil(profil), "vegetarien");
    assert.equal(repartitionDuProfil(profil), "hyperproteine");
  });
});

describe("profils enregistrés avant la scission", () => {
  /*
   * Le risque de cette refonte tient en une phrase : un client passé en
   * kéto AVANT la scission n'a pas de champ `repartitionMacros`. Si son
   * ancien `dietType` cessait d'être lu, il perdrait ses macros kéto d'un
   * jour à l'autre, sans rien avoir touché et sans que rien ne le signale.
   */
  test("un ancien profil kéto garde exactement ses macros kéto", () => {
    const ancien = { ...BASE, dietType: "keto" };
    const nouveau = { ...BASE, dietType: "aucun", repartitionMacros: "keto" };
    assert.deepEqual(computeTargets(ancien, 90), computeTargets(nouveau, 90));
    assert.equal(repartitionDuProfil(ancien), "keto");
  });

  test("un ancien profil kéto n'hérite d'aucune restriction alimentaire", () => {
    // Le lire comme une restriction écarterait la viande de son catalogue
    // sans aucune raison : le kéto n'a jamais exclu la viande.
    assert.equal(restrictionDuProfil({ dietType: "keto" }), "aucun");
    assert.equal(regimeOk({ contains: ["viande"], c: 0 }, { dietType: "keto", allergies: [] }), true);
  });

  test("un ancien profil kéto voit le même catalogue qu'un nouveau", () => {
    const ancien = { dietType: "keto", allergies: [] };
    const nouveau = { dietType: "aucun", repartitionMacros: "keto", allergies: [] };
    for (const c of [0, 5, 12, 12.5, 40, 70]) {
      assert.equal(
        regimeOk({ contains: [], c }, ancien),
        regimeOk({ contains: [], c }, nouveau),
        `${c} g de glucides pour 100 g`
      );
    }
  });

  test("un ancien profil végétarien garde sa restriction", () => {
    assert.equal(restrictionDuProfil({ dietType: "vegetarien" }), "vegetarien");
    assert.equal(repartitionDuProfil({ dietType: "vegetarien" }), "standard");
  });

  test("un profil sans aucun de ces champs se comporte comme avant", () => {
    assert.deepEqual(computeTargets({ ...BASE }, 90), computeTargets(normal(), 90));
  });

  test("une valeur inconnue reste transmise au coach plutôt qu'ignorée", () => {
    // Elle vient d'une version plus ancienne, ou d'une saisie à la main.
    // La faire disparaître du brief ferait croire le champ vide.
    assert.ok(resumeRegime({ dietType: "vegan" }).includes("vegan"));
  });

  test("le résumé pour le coach nomme les deux axes", () => {
    const resume = resumeRegime({ dietType: "vegetalien", repartitionMacros: "hyperproteine" });
    assert.match(resume, /[Vv]égétalien/);
    assert.match(resume, /protéiné/i);
  });

  test("un profil sans régime ne produit aucun résumé", () => {
    assert.equal(resumeRegime({ dietType: "aucun" }), "");
    assert.equal(resumeRegime({}), "");
  });
});

describe("les calories ne dépendent jamais du régime", () => {
  test("toutes les combinaisons des deux axes, tous les objectifs, tous les poids", () => {
    let combinaisons = 0;
    for (const goal of ["perte", "prise", "maintien", "performance"]) {
      for (const poids of [50, 70, 90, 120]) {
        const reference = computeTargets({ ...BASE, goal }, poids).calories;
        for (const restriction of RESTRICTIONS) {
          for (const repartition of REPARTITIONS) {
            const profil = { ...BASE, goal, dietType: restriction.id, repartitionMacros: repartition.id };
            assert.equal(
              computeTargets(profil, poids).calories,
              reference,
              `${restriction.id} + ${repartition.id}, objectif ${goal}, ${poids} kg`
            );
            combinaisons++;
          }
        }
      }
    }
    assert.ok(combinaisons > 200, "trop peu de combinaisons comparées : " + combinaisons);
  });

  test("la somme des macros reste cohérente sur toutes les combinaisons", () => {
    for (const goal of ["perte", "prise", "maintien"]) {
      for (const poids of [50, 90, 130]) {
        for (const restriction of RESTRICTIONS) {
          for (const repartition of REPARTITIONS) {
            const t = computeTargets(
              { ...BASE, goal, dietType: restriction.id, repartitionMacros: repartition.id },
              poids
            );
            const somme = t.protein * 4 + t.carbs * 4 + t.fat * 9;
            assert.ok(
              Math.abs(somme - t.calories) / t.calories < 0.01,
              `${restriction.id} + ${repartition.id}, ${goal}, ${poids} kg : ${somme} pour ${t.calories}`
            );
            assert.ok(t.carbs >= 0 && t.fat > 0 && t.protein > 0, "macro nulle ou négative");
          }
        }
      }
    }
  });
});

describe("régimes végétaux : les protéines sont relevées", () => {
  /*
   * Les protéines végétales sont moins bien utilisées que les animales :
   * profil en acides aminés moins complet, digestibilité plus basse. À
   * apport égal, un végétalien construit moins. Jusqu'ici l'application
   * lui demandait exactement le même apport qu'à un omnivore.
   */
  test("le végétalien monte plus que le végétarien, qui monte plus que l'omnivore", () => {
    const omnivore = computeTargets(normal(), 90).protein;
    const vegetarien = computeTargets({ ...BASE, dietType: "vegetarien" }, 90).protein;
    const vegetalien = computeTargets({ ...BASE, dietType: "vegetalien" }, 90).protein;
    assert.ok(vegetarien > omnivore, `${vegetarien} vs ${omnivore}`);
    assert.ok(vegetalien > vegetarien, `${vegetalien} vs ${vegetarien}`);
  });

  test("le pescétarien ne bouge pas : il mange des protéines animales", () => {
    assert.equal(computeTargets({ ...BASE, dietType: "pescetarien" }, 90).protein, computeTargets(normal(), 90).protein);
  });

  test("les calories et les lipides ne bougent pas pour autant", () => {
    const omnivore = computeTargets(normal(), 90);
    const vegetalien = computeTargets({ ...BASE, dietType: "vegetalien" }, 90);
    assert.equal(vegetalien.calories, omnivore.calories);
    assert.equal(vegetalien.fat, omnivore.fat);
    assert.ok(vegetalien.carbs < omnivore.carbs, "les glucides absorbent la différence");
  });

  test("le cumul des deux axes reste sous le plafond de 3 g/kg", () => {
    /*
     * C'est le seul endroit où deux réglages raisonnables séparément en
     * produisent un qui ne l'est plus : 2,8 g/kg d'hyperprotéiné en sèche,
     * majorés de 15 % pour le végétalien, font 3,2 g/kg. Au-delà de 3 g/kg,
     * aucune donnée ne montre de bénéfice supplémentaire.
     */
    for (const poids of [50, 70, 90, 120]) {
      const profil = { ...BASE, goal: "perte", dietType: "vegetalien", repartitionMacros: "hyperproteine" };
      const t = computeTargets(profil, poids);
      // Les protéines suivent le POIDS DE RÉFÉRENCE, pas le poids réel :
      // diviser par le second donnerait un g/kg qui n'est celui de personne.
      const parKg = t.protein / poidsDeReference(profil, poids);
      assert.ok(parKg <= 3.01, `${parKg.toFixed(2)} g/kg à ${poids} kg`);
      assert.ok(parKg > 2.5, `plafond appliqué trop bas : ${parKg.toFixed(2)} g/kg à ${poids} kg`);
    }
  });

  test("le plafond est inerte pour un client sans cumul", () => {
    // Le calcul standard plafonne à 2,2 g/kg : très loin en dessous.
    const t = computeTargets({ ...BASE, goal: "performance", performanceDirection: "perte" }, 90);
    assert.equal(t.protein, Math.round(90 * 2.2));
  });
});

describe("régime pauvre en glucides (low carb)", () => {
  const lowcarb = (extra) => ({ ...BASE, repartitionMacros: "lowcarb", ...extra });

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
    const bas = computeTargets({ ...BASE, repartitionMacros: "keto" }, 90).carbs;
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
  const hyper = (extra) => ({ ...BASE, repartitionMacros: "hyperproteine", ...extra });

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
      { ...BASE, goal: "performance", performanceDirection: "perte" },
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
  test("chaque réglage qui change quelque chose s'explique", () => {
    for (const [champ, id] of [
      ["repartitionMacros", "keto"],
      ["repartitionMacros", "lowcarb"],
      ["repartitionMacros", "hyperproteine"],
      ["dietType", "pescetarien"],
      ["dietType", "vegetarien"],
      ["dietType", "vegetalien"]
    ]) {
      const phrases = descriptionRegime({ ...BASE, [champ]: id });
      assert.equal(phrases.length, 1, `${id} : ${phrases.length} phrase(s)`);
      assert.ok(phrases[0].length > 40, `explication trop courte : ${id}`);
    }
  });

  test("les deux axes s'expliquent chacun de leur côté", () => {
    const phrases = descriptionRegime({ ...BASE, dietType: "vegetalien", repartitionMacros: "lowcarb" });
    assert.equal(phrases.length, 2);
  });

  test("un profil sans réglage n'affiche rien plutôt qu'une phrase vide de sens", () => {
    assert.deepEqual(descriptionRegime({ ...BASE }), []);
    assert.deepEqual(descriptionRegime({}), []);
    assert.deepEqual(descriptionRegime(null), []);
  });

  test("l'explication suit l'objectif quand le calibrage en dépend", () => {
    const enSeche = descriptionRegime({ ...BASE, goal: "perte", repartitionMacros: "hyperproteine" })[0];
    const enPrise = descriptionRegime({ ...BASE, goal: "prise", repartitionMacros: "hyperproteine" })[0];
    assert.notEqual(enSeche, enPrise, "la même phrase pour deux calibrages différents");
    assert.ok(enSeche.includes("2,8"), enSeche);
    assert.ok(enPrise.includes("2,5"), enPrise);
  });
});

describe("avertissement sur les combinaisons difficiles", () => {
  /*
   * Il ne bloque rien : le client a le droit de faire ce qu'il veut de son
   * alimentation. Mais lui laisser découvrir seul, au bout de trois
   * semaines, que sa combinaison ne tient pas, c'est le perdre.
   */
  test("la grande majorité des profils ne déclenche aucun avertissement", () => {
    let avertis = 0;
    let total = 0;
    for (const restriction of RESTRICTIONS) {
      for (const repartition of REPARTITIONS) {
        total++;
        if (alerteRegime({ ...BASE, dietType: restriction.id, repartitionMacros: repartition.id }, regimeOk)) {
          avertis++;
        }
      }
    }
    assert.ok(avertis > 0, "aucun avertissement ne se déclenche : ils sont inutiles");
    assert.ok(avertis < total / 3, `${avertis} avertissements sur ${total} combinaisons : trop bavard`);
  });

  test("kéto et végétalien : le compte de sources de protéines est réel, pas écrit en dur", () => {
    // Une phrase qui annonce un chiffre doit rester vraie le jour où le
    // catalogue s'enrichit. Le compte est donc refait à chaque appel.
    const profil = { ...BASE, dietType: "vegetalien", repartitionMacros: "keto", allergies: [] };
    const alerte = alerteRegime(profil, regimeOk);
    assert.ok(alerte, "aucun avertissement sur la combinaison la plus restrictive du catalogue");

    const compte = Number((alerte.match(/(\d+) sources de protéines/) || [])[1]);
    const reel = DIET_TYPES && FOOD_DB.filter((a) => a.cat === "proteines" && regimeOk(a, profil)).length;
    assert.equal(compte, reel, "le chiffre annoncé au client ne correspond pas au catalogue");
  });

  test("kéto en prise de masse est signalé, sans être interdit", () => {
    const alerte = alerteRegime({ ...BASE, goal: "prise", repartitionMacros: "keto" }, regimeOk);
    assert.ok(alerte && /volume d'entraînement/.test(alerte), alerte);
    // Signalé ne veut pas dire empêché : les objectifs sont bien calculés.
    const t = computeTargets({ ...BASE, goal: "prise", repartitionMacros: "keto" }, 90);
    assert.ok(t.carbs >= 20 && t.carbs <= 50);
  });

  test("hyperprotéiné et végétalien est signalé", () => {
    const alerte = alerteRegime(
      { ...BASE, dietType: "vegetalien", repartitionMacros: "hyperproteine" },
      regimeOk
    );
    assert.ok(alerte && /concentrées/.test(alerte), alerte);
  });

  test("sans fonction de filtrage, l'avertissement chiffré est simplement omis", () => {
    // L'appelant qui n'a pas le filtre sous la main ne doit pas planter.
    assert.doesNotThrow(() =>
      alerteRegime({ ...BASE, dietType: "vegetalien", repartitionMacros: "keto" }, undefined)
    );
  });
});
