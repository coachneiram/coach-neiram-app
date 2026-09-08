/**
 * RPE au demi-point : saisie, lecture du tableur, affichage.
 *
 * POURQUOI LE DEMI-POINT N'EST PAS UN DETAIL. « Entre 7 et 8 » est la
 * reponse la plus honnete que donne un pratiquant apres une serie.
 * L'arrondir a l'entier jette la moitie de l'information qui sert
 * ensuite a calculer sa prochaine charge : les seuils de progression
 * (PROGRESSION_RULES) valent 6,5 · 7,5 · 8,5 · 9,25, et la table
 * RPE/pourcentage du 1RM raisonne elle aussi au demi.
 *
 * LE DEFAUT CORRIGE ICI ETAIT UNE DIVERGENCE SILENCIEUSE. Les trois
 * champs de RPE de l'application etaient ecrits a la main, chacun de son
 * cote : le pointage acceptait les demis, le constructeur de seances non.
 * Un client qui notait 7,5 dans un ecran et 7 dans l'autre n'avait aucun
 * moyen de comprendre pourquoi. D'ou une definition partagee — et le test
 * ci-dessous, qui interdit d'en reecrire une a la main.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CHAMP_RPE, PALIERS_RPE, fmtRPE } from "../app/src/lib/force.js";
import { chargeSuivante, resumeExercice } from "../app/src/lib/constructeur-seances.js";
import { resumeSeance } from "../app/src/lib/seances.js";
import { seancesDepuisTexte, valeurPlausible } from "../app/src/lib/import-seances.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const ECRANS = join(ICI, "..", "app", "src", "ecrans");

describe("la définition du champ", () => {
  test("elle autorise le demi-point, entre 1 et 10", () => {
    assert.equal(CHAMP_RPE.step, "0.5");
    assert.equal(CHAMP_RPE.min, "1");
    assert.equal(CHAMP_RPE.max, "10");
    assert.equal(CHAMP_RPE.type, "number");
  });

  test("elle couvre tous les paliers dont l'application se sert déjà", () => {
    // PALIERS_RPE et les seuils de progression raisonnent au demi depuis
    // le debut. La saisie etait la seule a ne pas suivre.
    for (const palier of PALIERS_RPE) {
      assert.ok(palier >= 1 && palier <= 10, `palier hors bornes : ${palier}`);
      assert.equal((palier * 2) % 1, 0, `palier plus fin que le demi : ${palier}`);
    }
  });
});

describe("aucun écran ne réécrit un champ de RPE à la main", () => {
  /** Champs de saisie dont la valeur est un RPE, dans un fichier d'écran. */
  function champsRPE(source) {
    const trouves = [];
    for (const m of source.matchAll(/<(?:input|NumberInput)\b([\s\S]*?)\/>/g)) {
      if (/value=\{[^}]*\brpe\b/i.test(m[1])) trouves.push(m[1]);
    }
    return trouves;
  }

  const fichiers = readdirSync(ECRANS)
    .filter((f) => f.endsWith(".jsx"))
    .map((f) => ({ nom: f, source: readFileSync(join(ECRANS, f), "utf8") }));

  test("chaque champ de RPE utilise la définition partagée", () => {
    let champs = 0;
    for (const { nom, source } of fichiers) {
      for (const attributs of champsRPE(source)) {
        champs++;
        assert.match(
          attributs,
          /\{\.\.\.CHAMP_RPE\}/,
          `champ de RPE écrit à la main dans ${nom} : ${attributs.trim().slice(0, 80)}`
        );
      }
    }
    // Garde-fou : si le balayage ne trouvait plus rien, le test passerait
    // sans avoir rien verifie.
    assert.ok(champs >= 3, `seulement ${champs} champs de RPE trouvés — le balayage est cassé`);
  });
});

describe("affichage à la française", () => {
  test("le demi s'écrit avec une virgule, pas un point", () => {
    assert.equal(fmtRPE("6.5"), "6,5");
    assert.equal(fmtRPE(7.5), "7,5");
    assert.equal(fmtRPE(9.25), "9,25");
  });

  test("un entier reste un entier", () => {
    assert.equal(fmtRPE("8"), "8");
    assert.equal(fmtRPE(8), "8");
  });

  test("une valeur absente ne produit pas « null »", () => {
    assert.equal(fmtRPE(""), "");
    assert.equal(fmtRPE(null), "");
    assert.equal(fmtRPE(undefined), "");
  });

  test("le résumé d'exercice et celui de séance sont d'accord", () => {
    assert.ok(resumeExercice({ mode: "muscu", sets: 4, reps: 8, rpe: "7.5" }).includes("RPE 7,5"));
    assert.equal(resumeSeance({ durationMin: 60, rpe: "7.5" }), "60 min · RPE 7,5");
  });

  test("les résumés existants ne bougent pas d'un caractère", () => {
    assert.equal(resumeExercice({ mode: "muscu", sets: 4, reps: 8, weight: 60, rpe: 8 }), "4×8 @ 60 kg · RPE 8");
    assert.equal(resumeSeance({ durationMin: 60, rpe: 8 }), "60 min · RPE 8");
  });
});

describe("le demi-RPE traverse toute la chaîne", () => {
  test("il est lu depuis le tableur, virgule comme point", () => {
    assert.equal(valeurPlausible("rpe", "6.5"), "6.5");
    for (const cellule of ["6,5", "6.5"]) {
      const tableau = `Exercices,Séries,Reps,RPE,Charge\nSquat,5,5,"${cellule}",90`;
      const ex = seancesDepuisTexte(tableau).seances[0].exercises[0];
      assert.equal(ex.rpe, "6.5", `cellule « ${cellule} »`);
      assert.equal(ex.weight, "90");
    }
  });

  test("il est lu depuis une colonne double « RPE/Charge »", () => {
    const tableau = 'Exercices,RPE/Charge\nSquat,"7,5 / 90"';
    const ex = seancesDepuisTexte(tableau).seances[0].exercises[0];
    assert.equal(ex.rpe, "7.5");
    assert.equal(ex.weight, "90");
  });

  test("il produit une progression de charge distincte des entiers voisins", () => {
    // C'est la raison d'etre du demi : 7,5 ne doit pas se comporter comme
    // 7 ni comme 8, sinon autant ne pas le proposer.
    const a = chargeSuivante("100", "7", "").weight;
    const demi = chargeSuivante("100", "7.5", "").weight;
    const b = chargeSuivante("100", "8", "").weight;
    assert.ok(a >= demi && demi >= b, `progression non monotone : ${a} / ${demi} / ${b}`);
    assert.notEqual(a, b, "le cas de référence n'oppose plus deux entiers distincts");
  });
});
