/**
 * Les fibres, enfin visibles.
 *
 * Le module lib/fibres.js et la table food-fibres.js existaient depuis
 * longtemps, et la recherche d'aliments enrichissait deja ses resultats
 * avec la teneur. Mais la chaine s'arretait la : `fibres100` n'etait lu
 * nulle part, aucune entree du journal ne portait de fibres, et aucun ecran
 * n'en affichait. Du travail fait, branche sur rien.
 *
 * Ces tests ferment les deux maillons manquants : enregistrer la teneur au
 * moment de l'ajout, et l'afficher face a un objectif.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fibresPour, objectifFibres, totalFibres } from "../app/src/lib/fibres.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const source = (c) => readFileSync(join(ICI, "..", c), "utf8");
const sansCommentaires = (code) =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("une teneur inconnue n'est pas une teneur nulle", () => {
  test("un aliment sans valeur connue ne compte pas dans le total", () => {
    const jour = totalFibres([{ fiber: 6 }, { fiber: null }, { fiber: 3 }]);
    assert.equal(jour.total, 9);
    assert.equal(jour.inconnus, 1);
    assert.equal(jour.partiel, true, "le total doit se declarer incomplet");
  });

  test("un total complet ne se declare pas partiel", () => {
    assert.equal(totalFibres([{ fiber: 6 }, { fiber: 3 }]).partiel, false);
  });

  test("aucun aliment connu : rien a annoncer", () => {
    const jour = totalFibres([{ fiber: null }, { fiber: "" }]);
    assert.equal(jour.total, 0);
    assert.equal(jour.connus, 0);
    assert.equal(jour.partiel, true);
  });

  test("la teneur suit la quantite pesée", () => {
    assert.equal(fibresPour(10, 50), 5);
    assert.equal(fibresPour(null, 50), null, "teneur inconnue reste inconnue");
    assert.equal(fibresPour(10, 0), null, "sans quantite, aucune teneur");
  });
});

describe("l'objectif suit l'apport, pas un chiffre fixe", () => {
  test("proportionnel aux calories", () => {
    // 14 g pour 1000 kcal : un pratiquant a 3000 kcal n'a pas les memes
    // besoins qu'une cliente a 1500.
    assert.equal(objectifFibres(3000), 42);
    assert.equal(objectifFibres(2000), 28);
  });

  test("borné des deux côtés", () => {
    assert.equal(objectifFibres(1000), 20, "plancher : sous 20 g, le transit souffre");
    assert.equal(objectifFibres(5000), 45, "plafond : au-dela, l'inconfort l'emporte");
  });

  test("sans calories, aucun objectif inventé", () => {
    assert.equal(objectifFibres(0), null);
    assert.equal(objectifFibres(null), null);
  });
});

describe("la teneur est enregistrée au moment de l'ajout", () => {
  const recherche = sansCommentaires(source("app/src/ecrans/RechercheAliment.jsx"));

  test("l'entrée créée porte les fibres", () => {
    const bloc = recherche.slice(recherche.indexOf("onChoisir({"));
    assert.match(bloc.slice(0, 500), /fiber: fibresPour\(produit\.fibres100, g\)/);
  });

  test("elle passe par fibresPour, qui préserve l'inconnu", () => {
    // Ecrire `produit.fibres100 * g / 100` directement rendrait 0 pour une
    // teneur inconnue — exactement l'erreur que tout ce module evite.
    assert.match(recherche, /import \{[^}]*fibresPour/);
  });
});

describe("l'écran de nutrition les affiche", () => {
  const nutrition = sansCommentaires(source("app/src/ecrans/Nutrition.jsx"));

  test("le total du jour est calculé, pas inventé", () => {
    assert.match(nutrition, /totalFibres\(/);
    assert.match(nutrition, /objectifFibres\(/);
  });

  /*
   * Les motifs ci-dessous visent le texte AFFICHE, pas le code.
   *
   * Une premiere version cherchait /Fibres/ et /partiel/ — satisfaits par
   * les identifiants `totalFibres` et `fibres.partiel`. Retirer le bloc du
   * rendu ne declenchait rien : les tests validaient l'import, pas l'ecran.
   */
  test("les fibres apparaissent bien dans le rendu", () => {
    assert.match(nutrition, /Fibres aujourd'hui<\/span>/, "le libelle doit etre rendu, pas seulement importe");
    assert.match(nutrition, /fibres\.objectif \? \(/, "le bloc doit etre conditionne a l'existence d'un objectif");
  });

  test("un total partiel est signalé comme tel", () => {
    assert.match(nutrition, /Total partiel/);
    assert.match(
      nutrition,
      /fibres\.objectif && fibres\.partiel \? \(/,
      "la mention ne doit s'afficher QUE si le total est reellement partiel"
    );
    assert.match(nutrition, /apport\s*\n?\s*réel est plus élevé/, "le client doit savoir dans quel sens ca penche");
  });

  test("le total dit « — » plutôt que 0 quand rien n'est connu", () => {
    // Afficher « 0 g / 39 g » affirmerait un deficit total. Le tiret dit
    // qu'on ne sait pas, ce qui est la verite.
    assert.match(nutrition, /fibres\.connus \?/);
  });
});
