/**
 * Objectif catégorie de poids (lib/categorie-poids.js), repris de l'app
 * Neiram le 24/10/2026, et son effet sur le repère sur mesure. Dans l'app
 * coach, le repère seulement : les objectifs du coach ne bougent pas.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { categoriesPour, FEDERATIONS, MARGE_FINALE, planCategorie } from "../app/src/lib/categorie-poids.js";
import { ciblesPersonnalisees } from "../app/src/lib/nutrition-perso.js";
import { computeTargets } from "../app/src/lib/nutrition.js";

const J = "2026-10-24";

describe("catégorie de poids", () => {
  test("catégories officielles croissantes", () => {
    for (const f of FEDERATIONS.filter((x) => x.id !== "libre")) {
      for (const s of ["homme", "femme"]) {
        const l = categoriesPour(f.id, s);
        assert.ok(l.length >= 6, f.id + s);
        assert.deepEqual([...l].sort((a, b) => a - b), l);
      }
    }
  });

  test("déjà dans la catégorie : maintenance", () => {
    const p = planCategorie({ limiteKg: 74, date: "2026-12-12", pesee: "veille" }, 73, J);
    assert.equal(p.statut, "dans");
  });

  test("79 kg pour -74 kg en 7 semaines (pesée la veille) : faisable, rythme ≤ 1 %", () => {
    const p = planCategorie({ limiteKg: 74, date: "2026-12-12", pesee: "veille" }, 79, J);
    assert.equal(p.statut, "perte");
    assert.equal(p.margeKg, Math.round(74 * MARGE_FINALE.veille * 10) / 10);
    assert.equal(p.cibleChroniqueKg, 75.5);
    assert.ok(p.rythmePct > 0.4 && p.rythmePct <= 1, String(p.rythmePct));
    assert.ok(p.messages.some((m) => /Jamais de sauna/.test(m)));
  });

  test("trop rapide : on le dit et on propose une solution", () => {
    const p = planCategorie({ limiteKg: 66, date: "2026-11-07", pesee: "jour" }, 74, J);
    assert.equal(p.statut, "trop-rapide");
    assert.equal(p.rythmePct, 1);
    assert.match(p.messages[0], /catégorie au-dessus/);
  });

  test("mineur : marge 1 %, 0,5 %/semaine au plus ; antécédent de TCA : pas de plan", () => {
    const p = planCategorie({ limiteKg: 60, date: "2026-12-19", pesee: "veille" }, 64, J, { age: 17 });
    assert.equal(p.margeKg, 0.6);
    assert.ok(p.rythmePct <= 0.5);
    assert.equal(planCategorie({ limiteKg: 74, date: "2026-12-12" }, 79, J, { contraintesSante: ["tca"] }).statut, "bloque");
  });

  test("date passée ou données manquantes", () => {
    assert.equal(planCategorie({ limiteKg: 74, date: "2026-01-01" }, 79, J).statut, "passee");
    assert.equal(planCategorie({ date: "2026-12-12" }, 79, J), null);
  });

  test("repère : déficit au rythme du plan, protéines hautes ; objectifs du coach inchangés", () => {
    const sansCategorie = { sex: "homme", age: 28, heightCm: 178, startWeightKg: 79, activityLevel: "actif", goal: "performance", performanceDirection: "maintien", dietType: "aucun", allergies: [] };
    const profil = { ...sansCategorie, categoriePoids: { actif: true, federation: "ipf", limiteKg: 74, date: "2026-12-12", pesee: "veille" } };
    const c = ciblesPersonnalisees(profil, 79, { aujourdhui: J });
    assert.ok(c.calories < c.details.maintenance);
    assert.ok(c.protein >= Math.round(2.2 * 79));
    assert.equal(c.details.categorie.statut, "perte");
    // Tout inclus : pas de verrou Premium. Et les objectifs du coach ne
    // lisent pas la catégorie.
    assert.deepEqual(computeTargets(profil, 79), computeTargets(sansCategorie, 79));
    const inactif = ciblesPersonnalisees({ ...profil, categoriePoids: { ...profil.categoriePoids, actif: false } }, 79, { aujourdhui: J });
    assert.equal(inactif.details.categorie, null);
  });

  test("haltérophilie : catégories IWF du 1er août 2026", () => {
    assert.deepEqual(categoriesPour("iwf", "homme"), [60, 65, 70, 75, 85, 95, 110]);
    assert.deepEqual(categoriesPour("iwf", "femme"), [49, 53, 57, 61, 69, 77, 86]);
    assert.ok(FEDERATIONS.some((f) => f.sport === "combat"), "sports de combat couverts");
  });

  test("aucun protocole de déshydratation, plan infaisable au-delà de 1 %/semaine", () => {
    const p = planCategorie({ limiteKg: 74, date: "2026-12-12", pesee: "jour" }, 79, J);
    const texte = p.messages.join(" ");
    assert.match(texte, /Jamais de sauna, de combinaison de sudation, de laxatifs ni de diurétiques/);
    assert.match(texte, /sans toucher à l'eau/);
    assert.ok(!/restreindre (?:l'eau|les boissons)|boire moins/i.test(texte));
    const intenable = planCategorie({ limiteKg: 74, date: "2026-11-14", pesee: "veille" }, 80, J);
    assert.equal(intenable.statut, "trop-rapide");
    assert.ok(intenable.rythmeNecessaire > 1);
  });
});
