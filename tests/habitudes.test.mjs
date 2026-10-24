/** Habitudes du quotidien (lib/habitudes.js), repris de l'app Neiram le 24/10/2026. */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { addDays } from "../app/src/lib/dates.js";
import {
  ajouterPerso,
  basculer,
  CATALOGUE_HABITUDES,
  choisir,
  HABITUDES_MAX,
  habitudesActives,
  meilleureSerie,
  normaliserHabitudes,
  peutAjouter,
  serie,
  taux
} from "../app/src/lib/habitudes.js";

const J = "2026-10-24";
const cocheJours = (etat, id, debut, n, sauf = []) => {
  let e = etat;
  for (let i = 0; i < n; i++) {
    const d = addDays(debut, i);
    if (!sauf.includes(d)) e = basculer(e, d, id);
  }
  return e;
};

describe("habitudes", () => {
  test("catalogue : identifiants uniques, catégories et explications", () => {
    assert.equal(new Set(CATALOGUE_HABITUDES.map((h) => h.id)).size, CATALOGUE_HABITUDES.length);
    for (const h of CATALOGUE_HABITUDES) assert.ok(h.label && h.emoji && h.pourquoi && h.categorie, h.id);
  });

  test("app coach : jusqu'à 10 habitudes, toutes actives, sans limite gratuite", () => {
    assert.equal(HABITUDES_MAX, 10);
    let e = normaliserHabitudes(null);
    for (const h of CATALOGUE_HABITUDES.slice(0, 5)) e = choisir(e, h.id, true);
    assert.equal(habitudesActives(e).length, 5);
    assert.equal(peutAjouter(e), true);
    for (const h of CATALOGUE_HABITUDES.slice(5, 12)) e = choisir(e, h.id, true);
    assert.equal(habitudesActives(e).length, 10, "au-delà de 10, les choix sont refusés");
    assert.equal(peutAjouter(e), false);
    assert.equal(CATALOGUE_HABITUDES.length, 18);
  });

  test("aucun verrou Premium dans le module ni dans la carte", async () => {
    const { readFileSync } = await import("node:fs");
    for (const f of ["../app/src/lib/habitudes.js", "../app/src/ui/CarteHabitudes.jsx"]) {
      const source = readFileSync(new URL(f, import.meta.url), "utf8");
      assert.doesNotMatch(source, /SiPremium|usePremium|fonctions-premium|GRATUIT/i, f);
    }
  });

  test("décocher une habitude retire le jour vide", () => {
    const e = basculer(basculer(null, J, "lecture"), J, "lecture");
    assert.deepEqual(e.coches, {});
  });

  test("habitude perso", () => {
    const e = ajouterPerso(null, "Appeler un proche");
    assert.equal(e.perso[0].label, "Appeler un proche");
    assert.ok(e.choisies.includes(e.perso[0].id));
    assert.deepEqual(ajouterPerso(null, " ").perso, []);
  });

  test("série : aujourd'hui non coché ne casse rien ; un oubli sans joker remet à zéro", () => {
    let e = cocheJours(null, "lecture", addDays(J, -5), 5);
    assert.equal(serie(e, "lecture", J).jours, 5);
    e = cocheJours(null, "lecture", addDays(J, -5), 5, [addDays(J, -2)]);
    assert.equal(serie(e, "lecture", J).jours, 1, "seul hier compte après l'oubli");
  });

  test("joker : gagné après 7 jours, il pardonne un oubli", () => {
    const debut = addDays(J, -10);
    const e = cocheJours(null, "lecture", debut, 10, [addDays(debut, 8)]);
    const s = serie(e, "lecture", J);
    assert.equal(s.jours, 9);
    assert.equal(s.jokersUtilises, 1);
  });

  test("taux sur 30 jours et meilleure série", () => {
    const e = cocheJours(null, "lecture", addDays(J, -14), 15);
    assert.equal(taux(e, "lecture", J), 50);
    assert.equal(meilleureSerie(e, J), 15);
    assert.equal(meilleureSerie(null, J), 0);
  });
});
