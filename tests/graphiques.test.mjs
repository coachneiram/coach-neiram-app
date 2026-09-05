/**
 * Graphiques : courbe et histogramme.
 *
 * Ces deux composants ne sont pas interchangeables, et c'est une capture
 * d'ecran de l'application reelle qui l'a montre : les tendances
 * d'hydratation, de pas et de calories sont des barres, pas des courbes.
 * Sans cette verification, la courbe aurait ete utilisee partout.
 *
 * Le test porte sur ce qui distingue les deux et sur ce qui casse
 * silencieusement un graphique : une echelle plate, un message d'absence
 * inadapte, des barres qui ne partent pas de zero.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chartScale, fmtTick } from "../app/src/lib/mensurations.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(ICI, "..", "app", "src", "ui", "Courbe.jsx"), "utf8");
const LEGACY = readFileSync(join(ICI, "..", "index.html"), "utf8")
  .replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

describe("les deux formes de graphique existent", () => {
  test("la courbe et l'histogramme sont tous deux fournis", () => {
    assert.match(SOURCE, /export function Courbe/);
    assert.match(SOURCE, /export function Histogramme/);
  });

  test("l'histogramme dessine des rectangles, la courbe une ligne", () => {
    const courbe = SOURCE.slice(SOURCE.indexOf("export function Courbe"), SOURCE.indexOf("export function Histogramme"));
    const barres = SOURCE.slice(SOURCE.indexOf("export function Histogramme"));
    assert.match(courbe, /<polyline/);
    assert.match(barres, /<rect/);
    assert.doesNotMatch(barres, /<polyline/);
  });
});

describe("messages d'absence de donnees", () => {
  test("les deux messages sont ceux de l'application actuelle", () => {
    // Ils different volontairement : une barre isolee reste lisible, la ou
    // une courbe a besoin d'au moins deux points.
    for (const message of ["Pas encore assez de données pour tracer la courbe.", "Pas encore de données."]) {
      assert.ok(SOURCE.includes(message), "message absent du portage : " + message);
      assert.ok(LEGACY.includes(message), "message absent de index.html : " + message);
    }
  });

  test("la courbe exige deux points, l'histogramme un seul", () => {
    const courbe = SOURCE.slice(SOURCE.indexOf("export function Courbe"), SOURCE.indexOf("export function Histogramme"));
    const barres = SOURCE.slice(SOURCE.indexOf("export function Histogramme"));
    assert.match(courbe, /vals\.length < 2/);
    assert.match(barres, /!vals\.length/);
  });
});

describe("echelle des histogrammes", () => {
  test("les barres partent toujours de zero", () => {
    // Des barres tronquees a mi-hauteur exagereraient visuellement des
    // ecarts minimes — 2,1 L paraitrait deux fois 2,0 L.
    assert.match(SOURCE, /const mn = Math\.min\(0, mnBrut\)/);
  });

  test("une serie de valeurs proches garde une echelle exploitable", () => {
    const { mn, mx } = chartScale([2.0, 2.1, 2.05]);
    assert.ok(mx > mn, "échelle plate");
    assert.ok(Math.min(0, mn) === 0, "le plancher doit descendre à zéro pour un histogramme");
  });

  test("les graduations restent lisibles sur des litres", () => {
    assert.equal(fmtTick(2.6), "2.6");
    assert.equal(fmtTick(4.55), "4.6");
  });
});

describe("geometrie identique a l'original", () => {
  /**
   * Les constantes de trace sont comparees a celles de index.html.
   *
   * Sans cela, une largeur de barre passee de 0,55 a 0,9 emplacement
   * n'etait detectee par aucun test : le graphique restait plausible,
   * simplement il ne ressemblait plus a celui que le client connait.
   */
  const CONSTANTES = [
    ["marge gauche", /padL = (\d+)/, /padL = (\d+)/],
    ["marge droite", /padR = (\d+)/, /padR = (\d+)/],
    ["marge haute", /padT = (\d+)/, /padT = (\d+)/],
    ["marge basse", /padB = (\d+)/, /padB = (\d+)/],
    ["largeur du dessin", /const W = (\d+)/, /W = (\d+)/]
  ];

  for (const [nom, motifMigre, motifOrigine] of CONSTANTES) {
    test(nom, () => {
      const migre = SOURCE.match(motifMigre);
      const origine = LEGACY.match(motifOrigine);
      assert.notEqual(migre, null, "constante absente du portage : " + nom);
      assert.notEqual(origine, null, "constante absente de index.html : " + nom);
      assert.equal(migre[1], origine[1], nom + " différente de l'original");
    });
  }

  test("la largeur des barres est celle de l'original", () => {
    const migre = SOURCE.match(/emplacement \* ([\d.]+)/);
    const origine = LEGACY.match(/slot \* ([\d.]+)/);
    assert.notEqual(migre, null, "largeur de barre introuvable dans le portage");
    assert.notEqual(origine, null, "largeur de barre introuvable dans index.html");
    assert.equal(migre[1], origine[1], "largeur de barre différente de l'original");
  });

  test("l'epaisseur du trait de la courbe est celle de l'original", () => {
    const migre = SOURCE.match(/strokeWidth="([\d.]+)"/);
    const origine = LEGACY.match(/strokeWidth: "([\d.]+)", strokeLinejoin/);
    assert.notEqual(origine, null, "épaisseur introuvable dans index.html");
    assert.equal(migre[1], origine[1], "épaisseur de trait différente de l'original");
  });

  test("le rayon des coins de barre est celui de l'original", () => {
    const barres = SOURCE.slice(SOURCE.indexOf("export function Histogramme"));
    assert.match(barres, /rx="3"/, "rayon des coins différent de l'original");
  });
});
