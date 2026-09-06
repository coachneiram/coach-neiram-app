/**
 * Prendre une photo avec l'appareil, pas seulement dans la photothèque.
 *
 * BUG SIGNALE PAR MARIEN, cote Android : « les gens ne pouvaient pas
 * prendre de photo à partir de l'appareil photo, elles pouvaient que à
 * partir de la photothèque ou des fichiers ».
 *
 * Ce n'est PAS une regression de la bascule : l'application d'origine
 * avait exactement le meme defaut — un seul champ `accept="image/*"`,
 * sans attribut `capture`. Sur Android, ce champ n'expose pas toujours
 * l'appareil photo, en particulier depuis une application installee sur
 * l'ecran d'accueil, ou le selecteur systeme ne propose que la
 * photothèque et les fichiers.
 *
 * Le correctif n'est pas d'ajouter `capture` au champ existant : cela
 * FORCERAIT l'appareil photo et retirerait le choix d'une photo deja
 * prise, cassant l'autre moitie des usages. Il faut deux champs
 * distincts, et deux boutons qui disent lequel fait quoi.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (c) => readFileSync(join(ICI, "..", c), "utf8");

const COMPOSANT = lire("app/src/ui/ChoixPhoto.jsx");

/**
 * Le bloc JSX seul, a partir du premier <input.
 *
 * On ne peut pas simplement retirer les commentaires : « accept="image/*" »
 * contient « /* », qui ouvre un faux commentaire et avale le reste du
 * fichier. La premiere version de ce test s'y est fait prendre.
 */
const JSX = COMPOSANT.slice(COMPOSANT.indexOf("<input"));
const LEGACY = lire("index.html");

describe("le composant partage", () => {
  test("il expose DEUX champs distincts", () => {
    assert.equal((JSX.match(/type="file"/g) || []).length, 2);
  });

  test("celui de l'appareil photo force la camera arriere", () => {
    // « environment » cadre l'assiette ou le code-barres ; « user »
    // ouvrirait le selfie.
    assert.match(
      JSX,
      /ref=\{champAppareil\}/,
      "le champ appareil doit exister"
    );
    assert.match(JSX, /capture="environment"/);
    assert.ok(!/capture="user"/.test(JSX), "jamais la camera frontale");
  });

  test("celui de la photothèque n'a PAS capture", () => {
    // Sinon le client perd l'acces a ses photos deja prises, et on
    // remplace un manque par un autre.
    const galerie = JSX.slice(JSX.indexOf("champGalerie") - 120, JSX.indexOf("champGalerie") + 120);
    assert.ok(!/capture/.test(galerie), "le champ galerie doit rester sans capture");
  });

  test("les deux voies aboutissent au meme traitement", () => {
    assert.equal((JSX.match(/onChange=\{recevoir\}/g) || []).length, 2);
  });

  test("le champ est vide apres lecture", () => {
    // Sans ce vidage, rechoisir exactement la meme photo ne declenche
    // aucun evenement et l'ecran parait bloque.
    assert.match(COMPOSANT, /evenement\.target\.value = "";/);
  });
});

describe("toutes les entrees photo de l'application", () => {
  const ECRANS = [
    ["app/src/ecrans/RechercheAliment.jsx", 2, "photo du repas et code-barres"],
    ["app/src/ecrans/Courses.jsx", 2, "photo aliment et code-barres"],
    ["app/src/App.jsx", 1, "photos de progression"]
  ];

  for (const [chemin, nombre, quoi] of ECRANS) {
    test(`${chemin} — ${quoi}`, () => {
      const source = lire(chemin);
      const usages = source.match(/<ChoixPhoto/g) || [];
      assert.equal(usages.length, nombre, `${quoi} : ${nombre} entree(s) attendue(s)`);
    });
  }

  test("chaque ecran qui l'utilise l'importe vraiment", () => {
    // Le composant manquait dans les imports de Courses : le build
    // passait, les 898 tests passaient, et l'ecran plantait a
    // l'ouverture sur « ChoixPhoto is not defined ». Seul le navigateur
    // l'a vu.
    for (const [chemin] of ECRANS) {
      const source = lire(chemin);
      if (!/<ChoixPhoto/.test(source)) continue;
      assert.match(
        source,
        /import \{ ChoixPhoto \} from ".*ChoixPhoto\.jsx";/,
        `${chemin} utilise ChoixPhoto sans l'importer`
      );
    }
  });

  test("plus aucun champ photo n'est declare a la main", () => {
    // Un champ oublie quelque part reintroduirait le bug sur cet ecran
    // seulement — le plus difficile a reperer.
    for (const [chemin] of ECRANS) {
      const source = lire(chemin);
      assert.ok(
        !/accept="image\/\*"/.test(source),
        `${chemin} declare encore un champ photo en direct, hors du composant partage`
      );
    }
  });

  test("les photos de progression demandent la source avant d'ouvrir", () => {
    // Le clic sur une pose n'ouvre plus le selecteur : il ouvre une
    // fenetre qui propose les deux voies, puis traite le fichier recu.
    const app = lire("app/src/App.jsx");
    assert.match(app, /onUploadPhoto=\{setPoseAPhotographier\}/);
    assert.match(app, /open=\{!!poseAPhotographier\}/);
    assert.match(app, /traiterPhoto\(pose, fichier\)/);
  });
});

describe("l'application d'origine avait le meme defaut", () => {
  test("aucun de ses champs photo ne porte capture", () => {
    // Ce test documente pourquoi ce n'est pas une regression de la
    // bascule : le bug est anterieur, et le correctif est une
    // amelioration assumee.
    assert.ok(!/capture/.test(LEGACY), "l'original n'utilisait pas capture");
    assert.match(LEGACY, /accept: "image\/\*"/);
  });
});
