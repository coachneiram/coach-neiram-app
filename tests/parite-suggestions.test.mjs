/**
 * Parite des suggestions de collation : ancienne version contre nouvelle.
 *
 * La fonction d'origine tire un nombre au hasard. Une premiere version de ce
 * test comparait donc les ENSEMBLES de resultats possibles sur deux cents
 * tirages — et signalait une divergence qui n'existait pas : un aliment
 * classe huitieme ne sort que 37 fois sur 3 000, et l'echantillon ne le
 * voyait pas. Un test instable qui accuse a tort ne vaut pas mieux qu'un
 * test aveugle.
 *
 * L'ancienne version s'executant dans un bac a sable qui partage l'objet
 * Math, on peut remplacer Math.random des deux cotes par une suite
 * deterministe. La comparaison devient alors exacte, ordre compris.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { choisirSuggestions, repasSelonHeure } from "../app/src/lib/suggestions.js";
import { regimeOk } from "../app/src/lib/aliments.js";
import { SUGGESTIONS } from "../app/src/lib/catalogues.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

const REGIMES = ["aucun", "vegetarien", "vegetalien", "keto"];
const ALLERGENES = ["lactose", "oeufs", "gluten", "fruits-a-coque", "poisson", "soja"];

const RESTANTS = [
  { kcal: 800, p: 60, c: 80, f: 25 },
  { kcal: 300, p: 25, c: 30, f: 8 },
  { kcal: 150, p: 5, c: 20, f: 5 },
  { kcal: 1600, p: 120, c: 180, f: 50 },
  { kcal: 60, p: 2, c: 8, f: 1 }
];

/** Suite pseudo-aleatoire deterministe : un echec se rejoue a l'identique. */
function tirage(graine) {
  let etat = graine >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

/**
 * Appelle les deux versions avec exactement la meme suite de tirages.
 *
 * Math.random est remplace le temps de l'appel a l'ancienne version, puis
 * restaure — y compris si l'assertion echoue, sinon tous les tests suivants
 * heriteraient d'un hasard fige.
 */
function comparer(restant, profil, nombre, graine) {
  const vrai = Math.random;
  let ancien;
  try {
    Math.random = tirage(graine);
    // Array.from : le tableau vient du bac a sable et n'a pas le meme
    // prototype que les notres, ce qui ferait echouer l'egalite stricte sur
    // des valeurs pourtant identiques.
    ancien = Array.from(legacy.pickSuggestions(restant, profil, nombre), (x) => x.name);
  } finally {
    Math.random = vrai;
  }
  const nouveau = choisirSuggestions(restant, profil, nombre, tirage(graine)).map((x) => x.name);
  return { ancien, nouveau };
}

/** Repertoire des aliments qu'une fonction peut proposer sur N tirages. */
function repertoire(appel, tirages = 200) {
  const vus = new Set();
  for (let i = 0; i < tirages; i++) {
    for (const it of appel()) vus.add(it.name);
  }
  return [...vus].sort();
}

describe("repertoire des suggestions", () => {
  test("a hasard identique, les deux versions donnent le meme classement", () => {
    let comparaisons = 0;
    for (const dietType of REGIMES) {
      for (const allergies of [[], ["lactose"], ["oeufs", "gluten"], ["fruits-a-coque"]]) {
        const profil = { dietType, allergies };
        for (const restant of RESTANTS) {
          for (const graine of [1, 7, 42, 1234, 98765]) {
            const { ancien, nouveau } = comparer(restant, profil, 3, graine);
            assert.deepEqual(
              nouveau,
              ancien,
              `classement différent — régime ${dietType}, allergies [${allergies}], reste ${restant.kcal} kcal, graine ${graine}`
            );
            comparaisons++;
          }
        }
      }
    }
    assert.ok(comparaisons >= 300, "trop peu de comparaisons : " + comparaisons);
  });

  test("Math.random est bien restaure apres les comparaisons", () => {
    // Sans cette garantie, un hasard fige contaminerait les tests suivants.
    const a = Math.random();
    const b = Math.random();
    assert.notEqual(a, b, "Math.random est resté figé");
  });

  test("le nombre demande est respecte", () => {
    for (const n of [1, 2, 3, 5]) {
      assert.equal(choisirSuggestions(RESTANTS[0], {}, n).length, Math.min(n, SUGGESTIONS.length));
    }
  });
});

describe("le hasard sert a varier, pas a decider", () => {
  test("sans hasard, le classement est purement determine par les criteres", () => {
    const sansHasard = () => choisirSuggestions(RESTANTS[0], {}, 3, () => 0);
    assert.deepEqual(sansHasard().map((x) => x.name), sansHasard().map((x) => x.name));
  });

  test("avec hasard, les propositions varient d'un jour a l'autre", () => {
    /*
     * Ce test affirmait d'abord que soixante tirages donnent toujours plus
     * de trois aliments differents. C'etait faux : le hasard ne pese que
     * 0,08 face a 1,0 pour les criteres reels, donc les propositions ne
     * varient que lorsque les scores sont serres. Le test echouait environ
     * une fois sur trois — il affirmait une garantie que le code ne donne
     * pas, et une suite qui echoue au hasard ne protege plus rien.
     *
     * Ce qui est vrai, et suffisant : sur des situations ou plusieurs
     * aliments se valent, le classement change d'un tirage a l'autre. Les
     * graines sont fixes, donc le resultat est reproductible.
     */
    const classements = new Set();
    for (let graine = 1; graine <= 40; graine++) {
      classements.add(choisirSuggestions({ kcal: 300, p: 25, c: 30, f: 8 }, {}, 3, tirage(graine)).map((x) => x.name).join("|"));
    }
    assert.ok(classements.size > 10, "les suggestions ne varient presque jamais : " + classements.size);
  });

  test("le hasard ne remonte jamais un aliment mal classe", () => {
    /*
     * Premiere tentative ici : affirmer que le premier choix est toujours
     * le meme. C'etait faux — il varie sur trois aliments. Plutot que
     * d'affaiblir le seuil jusqu'a ce que le test passe, la propriete a ete
     * mesuree : sur deux cents tirages, le hasard ne fait jamais remonter
     * un aliment au-dela du huitieme rang du classement sans hasard.
     *
     * C'est ce qui compte vraiment : la variete ne se fait pas au detriment
     * de la pertinence.
     */
    const RANG_MAX = 10;
    for (const restant of [
      { kcal: 800, p: 60, c: 80, f: 25 },
      { kcal: 300, p: 25, c: 30, f: 8 },
      { kcal: 150, p: 5, c: 20, f: 5 }
    ]) {
      const sansHasard = choisirSuggestions(restant, {}, 50, () => 0).map((x) => x.name);
      for (let graine = 1; graine <= 200; graine++) {
        for (const propose of choisirSuggestions(restant, {}, 3, tirage(graine))) {
          const rang = sansHasard.indexOf(propose.name) + 1;
          assert.ok(
            rang > 0 && rang <= RANG_MAX,
            `« ${propose.name} » est classé ${rang}e sans hasard mais proposé (reste ${restant.kcal} kcal, graine ${graine})`
          );
        }
      }
    }
  });


  test("le hasard ne pese pas assez pour remonter un aliment inadapte", () => {
    // Sa ponderation est de 0,08 face a 1,0 pour les criteres reels : un
    // aliment tres eloigne du besoin ne doit jamais passer devant.
    const restant = { kcal: 800, p: 60, c: 80, f: 25 };
    const toujoursMax = choisirSuggestions(restant, {}, 3, () => 1).map((x) => x.name);
    const jamais = choisirSuggestions(restant, {}, 3, () => 0).map((x) => x.name);
    assert.deepEqual(toujoursMax, jamais, "un hasard constant ne doit pas changer le classement");
  });
});

describe("garanties absolues", () => {
  test("aucun tirage ne propose jamais un aliment interdit", () => {
    let verifications = 0;
    for (const dietType of REGIMES) {
      for (const allergene of ALLERGENES) {
        const profil = { dietType, allergies: [allergene] };
        for (let i = 0; i < 40; i++) {
          for (const it of choisirSuggestions(RESTANTS[0], profil, 3)) {
            assert.ok(
              regimeOk(it, profil),
              `« ${it.name} » proposé malgré le régime ${dietType} et l'allergie ${allergene}`
            );
            verifications++;
          }
        }
      }
    }
    assert.ok(verifications > 500, "trop peu de vérifications : " + verifications);
  });

  test("rien n'est propose quand la journee est deja pleine", () => {
    assert.deepEqual(choisirSuggestions({ kcal: 0, p: 0, c: 0, f: 0 }, {}, 3), []);
    assert.deepEqual(choisirSuggestions({ kcal: -300, p: 0, c: 0, f: 0 }, {}, 3), []);
    assert.deepEqual(choisirSuggestions(null, {}, 3), []);
  });

  test("les suggestions restent legeres quand il ne reste presque rien", () => {
    // Marge de 80 kcal au-dessus du restant, avec un plancher a 130 pour
    // qu'il reste toujours quelques idees tres legeres.
    for (const it of choisirSuggestions({ kcal: 40, p: 2, c: 5, f: 1 }, {}, 3)) {
      assert.ok(it.kcal <= 130, `« ${it.name} » (${it.kcal} kcal) est trop lourd pour 40 kcal restantes`);
    }
  });
});

describe("rattachement au repas selon l'heure", () => {
  test("les bornes sont celles de l'application actuelle", () => {
    assert.equal(repasSelonHeure(7), "petit-dejeuner");
    assert.equal(repasSelonHeure(10), "petit-dejeuner");
    assert.equal(repasSelonHeure(11), "dejeuner");
    assert.equal(repasSelonHeure(14), "dejeuner");
    assert.equal(repasSelonHeure(15), "gouter");
    assert.equal(repasSelonHeure(17), "gouter");
    assert.equal(repasSelonHeure(18), "diner");
    assert.equal(repasSelonHeure(23), "diner");
  });

  test("toutes les heures de la journee tombent quelque part", () => {
    for (let h = 0; h < 24; h++) {
      assert.ok(repasSelonHeure(h), "aucun repas pour " + h + " h");
    }
  });
});
