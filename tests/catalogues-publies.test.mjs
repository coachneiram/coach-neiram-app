/**
 * Catalogues d'aliments servis a l'application Vite.
 *
 * Les quatre fichiers food-*-catalog.js vivent a la racine du depot et sont
 * charges par index.html. L'application Vite a besoin des memes, dans le
 * meme ordre : ils installent window.__CN_FOOD_SEARCH__ et l'interception
 * de fetch vers Open Food Facts.
 *
 * app/public/ contient des LIENS vers ces fichiers, pour qu'une correction
 * du catalogue profite aux deux versions sans recopie. Ce test verifie que
 * le lien tient : deux catalogues qui divergeraient donneraient a deux
 * clients deux valeurs nutritionnelles differentes pour le meme aliment,
 * sans que rien ne le signale.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, lstatSync, readlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");

/** L'ordre compte : le dernier installe le moteur de recherche. */
const CATALOGUES = [
  "food-extended-catalog.js",
  "food-staples-catalog.js",
  "food-bruts-catalog.js",
  "food-basic-catalog.js"
];

const lire = (...morceaux) => readFileSync(join(RACINE, ...morceaux), "utf8");

describe("catalogues servis aux deux versions", () => {
  test("chaque catalogue est disponible pour l'application Vite", () => {
    for (const nom of CATALOGUES) {
      assert.ok(existsSync(join(RACINE, nom)), `${nom} absent de la racine`);
      assert.ok(existsSync(join(RACINE, "app", "public", nom)), `${nom} absent de app/public`);
    }
  });

  /**
   * Comparer les CONTENUS ne prouverait rien tant que ce sont des liens :
   * les deux lectures rendent forcement la meme chose. Ce qui doit etre
   * verrouille, c'est que ce soient bien des liens — le jour ou quelqu'un
   * les remplacera par des copies, les deux catalogues pourront diverger et
   * deux clients liront deux valeurs differentes pour le meme aliment.
   */
  test("app/public ne contient que des liens, jamais des copies", () => {
    for (const nom of CATALOGUES) {
      const chemin = join(RACINE, "app", "public", nom);
      assert.ok(
        lstatSync(chemin).isSymbolicLink(),
        `${nom} est une copie dans app/public : elle divergera de la racine`
      );
      assert.equal(
        readlinkSync(chemin),
        join("..", "..", nom),
        `${nom} ne pointe pas vers le catalogue de la racine`
      );
    }
  });

  test("le lien donne bien le meme contenu que la racine", () => {
    for (const nom of CATALOGUES) {
      assert.equal(lire("app", "public", nom), lire(nom), `${nom} : contenu different`);
    }
  });

  test("les deux index.html chargent les memes catalogues dans le meme ordre", () => {
    const ordreDe = (html) =>
      [...html.matchAll(/src="\.?\/?(food-[a-z]+-catalog\.js)"/g)].map((m) => m[1]);

    const legacy = ordreDe(lire("index.html"));
    const vite = ordreDe(lire("app", "index.html"));

    assert.deepEqual(legacy, CATALOGUES, "index.html ne charge plus les catalogues attendus");
    assert.deepEqual(vite, CATALOGUES, "app/index.html ne charge pas les catalogues dans le bon ordre");
  });

  test("les catalogues sont charges avant le module de l'application", () => {
    const html = lire("app", "index.html");
    const dernierCatalogue = html.lastIndexOf("food-basic-catalog.js");
    // La balise reelle, pas la mention entre commentaires plus haut.
    const module = html.indexOf('<script type="module" src=');
    assert.ok(dernierCatalogue !== -1 && module !== -1);
    assert.ok(
      dernierCatalogue < module,
      "le module s'executerait avant l'installation du moteur de recherche"
    );
  });

  test("le moteur de recherche est bien installe par le dernier catalogue", () => {
    assert.ok(
      lire("food-basic-catalog.js").includes("__CN_FOOD_SEARCH__"),
      "le dernier catalogue n'installe plus le moteur de recherche : l'ordre de chargement est a revoir"
    );
  });
});
