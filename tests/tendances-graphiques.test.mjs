/**
 * Choix des graphiques dans l'ecran Tendances.
 *
 * Chaque indicateur a son type de graphique dans l'application actuelle, et
 * ce choix n'est pas decoratif : courbe pour les grandeurs continues,
 * histogramme pour ce qui se cumule sur une semaine. Une capture d'ecran a
 * revele que le portage se serait trompe partout.
 *
 * Chaque graphique porte aussi la ligne de reference de l'objectif du
 * client. Sans elle, on voit une evolution mais pas si elle va dans le bon
 * sens — c'est toute la difference entre une donnee et une information.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");
const ECRAN = readFileSync(join(RACINE, "app", "src", "ecrans", "Tendances.jsx"), "utf8");
const LEGACY = readFileSync(join(RACINE, "index.html"), "utf8");

/** Titre affiche, type attendu, et objectif servant de ligne de reference. */
const GRAPHIQUES = [
  ["Calories moyennes / semaine", "Courbe", "targets?.calories"],
  ["Sommeil / semaine", "Histogramme", "profile.targetSleepHours"],
  ["Hydratation / semaine (L/jour)", "Histogramme", "profile.targetWaterL"],
  ["Pas / semaine (moyenne/jour)", "Histogramme", "profile.targetSteps"],
  ["Poids", "Courbe", null],
  ["Muscle (masse maigre)", "Courbe", null]
];

/** Type de graphique utilise par l'application actuelle pour ce titre. */
function typeOrigine(titre) {
  const i = LEGACY.indexOf('SectionTitle, null, "' + titre.replace(/é/g, "\\xE9"));
  const j = LEGACY.indexOf('SectionTitle, null, "' + titre);
  const depart = j >= 0 ? j : i;
  if (depart < 0) return null;
  const bloc = LEGACY.slice(depart, depart + 700);
  /*
   * On retient le PREMIER type rencontre, pas celui qu'on teste en
   * premier : la fenetre de lecture deborde sur le graphique suivant, et
   * chercher les barres d'abord attribuait les barres du sommeil au
   * graphique des calories, juste au-dessus.
   */
  const barres = bloc.indexOf("BarChartSVG");
  const courbe = bloc.indexOf("LineChartSVG");
  if (barres === -1 && courbe === -1) return null;
  if (barres === -1) return "Courbe";
  if (courbe === -1) return "Histogramme";
  return barres < courbe ? "Histogramme" : "Courbe";
}

describe("chaque indicateur utilise le graphique de l'application actuelle", () => {
  for (const [titre, attendu] of GRAPHIQUES) {
    test(titre, () => {
      assert.equal(typeOrigine(titre), attendu, "le type attendu ne correspond pas à index.html — test à revoir");

      const depart = ECRAN.indexOf(`titre="${titre}"`);
      assert.notEqual(depart, -1, "graphique absent de l'écran migré : " + titre);
      const bloc = ECRAN.slice(depart, ECRAN.indexOf("</CarteGraphique>", depart));

      assert.ok(bloc.includes(`<${attendu}`), `« ${titre} » devrait être un ${attendu}`);
      const autre = attendu === "Courbe" ? "Histogramme" : "Courbe";
      assert.ok(!bloc.includes(`<${autre}`), `« ${titre} » ne doit pas aussi tracer un ${autre}`);
    });
  }
});

describe("lignes de reference", () => {
  for (const [titre, , objectif] of GRAPHIQUES.filter((g) => g[2])) {
    test(titre, () => {
      const depart = ECRAN.indexOf(`titre="${titre}"`);
      const bloc = ECRAN.slice(depart, ECRAN.indexOf("</CarteGraphique>", depart));
      assert.ok(bloc.includes("refY"), `« ${titre} » n'affiche aucune ligne d'objectif`);
      assert.ok(bloc.includes(objectif), `« ${titre} » ne se réfère pas à ${objectif}`);
    });
  }

  test("poids et muscle n'ont pas de ligne d'objectif", () => {
    // L'application n'en trace pas : le poids cible existe dans le profil
    // mais n'est pas reporte ici, et en inventer une serait un ajout.
    for (const titre of ["Poids", "Muscle (masse maigre)"]) {
      const depart = ECRAN.indexOf(`titre="${titre}"`);
      const bloc = ECRAN.slice(depart, ECRAN.indexOf("</CarteGraphique>", depart));
      assert.ok(!bloc.includes("refY"), `« ${titre} » ne devrait pas avoir de ligne de référence`);
    }
  });
});

describe("indicateurs du bilan de la semaine", () => {
  test("les six vignettes sont presentes, avec leurs libelles", () => {
    for (const label of ["Séances", "Sommeil moy.", "Poids", "Calories moy.", "Pas moy./jour", "Eau moy./jour"]) {
      assert.ok(ECRAN.includes(`label="${label}"`), "vignette manquante : " + label);
    }
  });

  test("une valeur absente s'affiche en tiret, jamais en zero", () => {
    // Zero se lirait « il n'a pas dormi » ; le tiret dit « pas de donnée ».
    const bloc = ECRAN.slice(ECRAN.indexOf("Bilan de la semaine"), ECRAN.indexOf("Photos de progression"));
    const vignettes = [...bloc.matchAll(/<StatChip[\s\S]*?\/>/g)];
    assert.ok(vignettes.length >= 6, "vignettes introuvables");
    for (const v of vignettes) {
      if (v[0].includes("Séances")) continue; // un compte de zéro séance est une information
      assert.ok(v[0].includes('"—"'), "pas de repli en tiret dans : " + v[0].slice(0, 60));
    }
  });
});
