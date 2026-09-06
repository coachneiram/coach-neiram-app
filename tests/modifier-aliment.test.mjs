/**
 * Corriger un aliment déjà inscrit au journal.
 *
 * Demandé par une cliente après le correctif de l'appareil photo Android :
 * l'IA estime les macros d'une assiette, elle sait souvent mieux qu'elle
 * (« c'était une petite portion », « il n'y avait pas d'huile ») — et son
 * seul recours était de supprimer la ligne et de tout ressaisir.
 *
 * Ce n'est pas une régression : l'application d'origine n'offrait qu'une
 * croix elle aussi (index.html, ligne 2474). C'est un manque de toujours.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ajusterQuantite,
  entreeCorrigee,
  porteUneQuantite,
  saisieDepuis,
  saisieValide
} from "../app/src/lib/edition-aliment.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const source = (c) => readFileSync(join(ICI, "..", c), "utf8");
const sansCommentaires = (code) =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Une entrée venue du catalogue : elle sait à quel poids elle correspond. */
const DU_CATALOGUE = { id: "a", name: "Poulet (200 g)", calories: 400, protein: 60, carbs: 0, fat: 16, grams: 200, baseName: "Poulet" };

/** Une estimation par photo : aucun poids fiable. */
const DE_LA_PHOTO = { id: "b", name: "Assiette de pâtes", calories: 620, protein: 22, carbs: 88, fat: 18 };

describe("la quantité ne s'ajuste que si elle veut dire quelque chose", () => {
  test("une entrée du catalogue porte sa quantité", () => {
    assert.equal(porteUneQuantite(DU_CATALOGUE), true);
  });

  test("une estimation photo n'en porte pas", () => {
    // Proposer de redimensionner une assiette dont personne ne connaît le
    // poids inviterait à fabriquer un chiffre.
    assert.equal(porteUneQuantite(DE_LA_PHOTO), false);
    assert.equal(porteUneQuantite({ ...DE_LA_PHOTO, grams: 0 }), false);
  });

  test("les macros suivent la quantité, proportionnellement", () => {
    assert.deepEqual(ajusterQuantite(DU_CATALOGUE, 150), { grams: 150, calories: 300, protein: 45, carbs: 0, fat: 12 });
    assert.deepEqual(ajusterQuantite(DU_CATALOGUE, 400), { grams: 400, calories: 800, protein: 120, carbs: 0, fat: 32 });
  });

  test("sans quantité de départ, aucune mise à l'échelle inventée", () => {
    assert.equal(ajusterQuantite(DE_LA_PHOTO, 150), null);
  });

  test("une quantité nulle rend null, pas zéro calorie", () => {
    // Rendre { calories: 0 } ferait disparaître l'aliment du total sans
    // que la cliente l'ait demandé.
    assert.equal(ajusterQuantite(DU_CATALOGUE, 0), null);
    assert.equal(ajusterQuantite(DU_CATALOGUE, ""), null);
  });
});

describe("un champ vide ne veut pas dire zéro", () => {
  test("les valeurs non touchées sont conservées", () => {
    const r = entreeCorrigee(DE_LA_PHOTO, { name: "Assiette de pâtes", calories: "520", protein: "", carbs: "", fat: "" });
    assert.equal(r.calories, 520, "la valeur corrigée est prise");
    assert.equal(r.protein, 22, "les protéines n'ont pas été effacées");
    assert.equal(r.carbs, 88);
    assert.equal(r.fat, 18);
  });

  test("le nom se corrige aussi — l'IA se trompe souvent d'abord là-dessus", () => {
    const r = entreeCorrigee(DE_LA_PHOTO, { ...saisieDepuis(DE_LA_PHOTO), name: "Pâtes bolognaise" });
    assert.equal(r.name, "Pâtes bolognaise");
    assert.equal(r.calories, 620, "corriger le nom ne touche pas aux valeurs");
  });

  test("un nom vide ne remplace pas l'ancien", () => {
    assert.equal(entreeCorrigee(DE_LA_PHOTO, { name: "   " }).name, "Assiette de pâtes");
  });

  test("l'identifiant et les champs annexes survivent", () => {
    const r = entreeCorrigee(DU_CATALOGUE, { ...saisieDepuis(DU_CATALOGUE), calories: "350" });
    assert.equal(r.id, "a");
    assert.equal(r.baseName, "Poulet", "le lien avec le catalogue ne doit pas être perdu");
  });

  test("zéro reste zéro quand il est saisi", () => {
    // Une tisane a bien 0 kcal : refuser la valeur serait faux.
    const r = entreeCorrigee(DE_LA_PHOTO, { name: "Tisane", calories: "0", protein: "0", carbs: "0", fat: "0" });
    assert.equal(r.calories, 0);
  });
});

describe("ce que la saisie refuse", () => {
  test("un aliment sans nom", () => {
    const v = saisieValide({ name: "", calories: "100" });
    assert.equal(v.ok, false);
    assert.match(v.raison, /nom/i);
  });

  test("une valeur négative", () => {
    assert.equal(saisieValide({ name: "X", calories: "-50" }).ok, false);
    assert.equal(saisieValide({ name: "X", grams: "-1" }).ok, false);
  });

  test("mais pas une valeur inhabituelle", () => {
    // Un plat a 1800 kcal existe. Refuser ferait perdre du temps à
    // quelqu'un qui a raison.
    assert.equal(saisieValide({ name: "Raclette", calories: "1800", fat: "140" }).ok, true);
    assert.equal(saisieValide({ name: "Tisane", calories: "0" }).ok, true);
  });
});

describe("le crayon est branché, pas seulement affiché", () => {
  const journal = sansCommentaires(source("app/src/ecrans/Journal.jsx"));

  test("chaque ligne du journal propose de corriger", () => {
    // Le motif vise le RENDU, pas l'import : /Pencil/ seul est satisfait
    // par la ligne d'import, et remplacer l'icône ne déclenchait rien.
    assert.match(journal, /<Pencil size=/, "l'icône crayon doit être rendue");
    assert.match(journal, /libelle="Corriger"/, "le bouton doit porter un nom accessible");
    assert.match(journal, /entreeCorrigee/, "la correction doit passer par la fonction testée");
  });

  test("les deux boutons de la ligne sont nommés", () => {
    // Un bouton réduit à une icône n'a aucun nom pour un lecteur d'écran,
    // qui annonce « bouton » sans plus. Le nom sert aussi d'infobulle, et
    // de point d'accroche aux vérifications au navigateur — sinon elles ne
    // peuvent désigner ces boutons que par leur position.
    assert.match(journal, /libelle="Supprimer"/);
    assert.match(
      sansCommentaires(source("app/src/ui/primitives.jsx")),
      /aria-label=\{libelle\}/,
      "IconBtn doit transmettre le nom, sinon l'attribut est ignoré en silence"
    );
  });

  test("la correction est réellement enregistrée", () => {
    // Un formulaire qui n'appelle jamais update laisserait croire à une
    // sauvegarde : c'est exactement le motif des boutons morts trouvés
    // plus tôt dans cette migration.
    assert.match(journal, /logEntriesApi\.update\(/);
  });

  test("la suppression reste possible", () => {
    assert.match(journal, /logEntriesApi\.remove\(/, "corriger ne doit pas remplacer supprimer");
  });
});
