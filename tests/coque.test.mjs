/**
 * Coque de navigation.
 *
 * Les onglets sont ce que le client connait par coeur : il tape au meme
 * endroit tous les jours sans regarder. En changer l'ordre ou le libelle
 * lui ferait ouvrir le mauvais ecran pendant des semaines, sans qu'il
 * comprenne pourquoi.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chargerApp } from "./harness.mjs";
import { ONGLETS } from "../app/src/lib/onglets.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

const ICI = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(ICI, "..", "app", "src", "styles.css"), "utf8");

describe("onglets", () => {
  test("memes onglets, dans le meme ordre que l'application actuelle", () => {
    assert.deepEqual(ONGLETS.map((o) => o.id), Array.from(legacy.TABS, (t) => t.id));
  });

  test("memes libelles longs et memes libelles courts", () => {
    assert.deepEqual(ONGLETS.map((o) => o.label), Array.from(legacy.TABS, (t) => t.label));
    assert.deepEqual(ONGLETS.map((o) => o.short), Array.from(legacy.TABS, (t) => t.short));
  });

  test("chaque onglet recoit une icone dans la coque", () => {
    // La liste est de la donnee ; les icones sont rattachees a l'affichage.
    // Un onglet ajoute sans icone afficherait un bouton vide.
    const coque = readFileSync(join(ICI, "..", "app", "src", "ui", "Coque.jsx"), "utf8");
    const bloc = coque.slice(coque.indexOf("const ICONES"), coque.indexOf("export const ONGLETS"));
    for (const o of ONGLETS) {
      assert.match(bloc, new RegExp("\\b" + o.id + ":"), "icône manquante pour l'onglet " + o.id);
    }
  });

  test("le libelle court n'est jamais plus long que le libelle long", () => {
    // La barre du bas a sept boutons a caser sur la largeur d'un telephone.
    for (const o of ONGLETS) {
      assert.ok(o.short.length <= o.label.length, "libellé court trop long : " + o.id);
      assert.ok(o.short.length <= 10, "libellé court qui ne tiendra pas : " + o.short);
    }
  });
});

describe("mise en page de la coque", () => {
  test("les deux dispositions existent et basculent au meme seuil", () => {
    assert.match(CSS, /@media \(max-width: 760px\)/);
    assert.match(CSS, /\.sidebar\s*\{/);
    assert.match(CSS, /\.bottom-nav\s*\{/);
  });

  test("la barre du bas est masquee sur ordinateur et le menu sur telephone", () => {
    // Sans cela, les deux navigations s'afficheraient en meme temps.
    const avantMedia = CSS.slice(0, CSS.indexOf("@media (max-width: 760px)"));
    assert.match(avantMedia, /\.bottom-nav\s*\{\s*display:\s*none/);
    assert.match(avantMedia, /\.mobile-header\s*\{\s*display:\s*none/);

    const dansMedia = CSS.slice(CSS.indexOf("@media (max-width: 760px)"));
    assert.match(dansMedia, /\.sidebar\s*\{\s*display:\s*none/);
  });

  test("les zones sures des iPhone sont respectees", () => {
    // Sans elles, le dernier onglet passe sous la barre gestuelle et
    // devient intouchable — un ecran entier inaccessible.
    assert.match(CSS, /bottom-nav[\s\S]*?env\(safe-area-inset-bottom\)/);
    assert.match(CSS, /mobile-header[\s\S]*?env\(safe-area-inset-top\)/);
    assert.match(CSS, /main-content[\s\S]*?env\(safe-area-inset-bottom\)/);
  });

  test("les champs de saisie font au moins 16 px sur telephone", () => {
    // En dessous, iOS zoome tout seul au premier appui et ne se remet
    // jamais droit.
    assert.match(CSS, /font-size:\s*16px\s*!important/);
  });

  test("le reglage systeme « reduire les animations » est respecte", () => {
    assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)/);
  });

  test("chaque animation utilisee est definie", () => {
    for (const nom of [...CSS.matchAll(/animation:\s*([A-Za-z][\w-]*)/g)].map((m) => m[1])) {
      assert.ok(CSS.includes("@keyframes " + nom), "animation jamais définie : " + nom);
    }
  });
});
