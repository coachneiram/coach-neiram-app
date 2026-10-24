/**
 * Régimes, contraintes alimentaires, 14 allergènes UE et règle des preuves
 * dans les consignes IA, repris de l'app Neiram le 24/10/2026.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ALLERGENS } from "../app/src/lib/catalogues.js";
import { ALLERGENES_AJOUTES, libelleAllergene, TOUS_LES_ALLERGENES } from "../app/src/lib/allergenes.js";
import { CONTRAINTES_ALIM, descriptionRegime, exclusionsContraintes, REPARTITIONS, repartitionDuProfil, RESTRICTIONS } from "../app/src/lib/regimes.js";
import { computeTargets } from "../app/src/lib/nutrition.js";
import { regimeOk } from "../app/src/lib/aliments.js";
import { construireConsigneCoach, lireContraintes, verifierReponse } from "../app/src/lib/consigne-coach.js";
import { promptBilanHebdo, promptBilanMensuel } from "../app/src/lib/bilan-ia.js";
import { REGLE_PREUVES } from "../app/src/lib/preuves.js";
import { CONTIENT_RECETTE, REVELE, verifierRecette } from "../app/src/lib/recettes-coach.js";
import { RECETTES_COACH } from "../app/src/lib/recettes-coach-catalogue.js";

const BASE = { sex: "homme", age: 35, heightCm: 180, startWeightKg: 80, activityLevel: "modere", goal: "perte", dietType: "aucun", allergies: [] };

describe("régimes ajoutés", () => {
  test("méditerranéen, DASH, paléo proposés ; les régimes existants et le « sans porc » restent", () => {
    const ids = REPARTITIONS.map((r) => r.id);
    for (const id of ["standard", "lowcarb", "keto", "hyperproteine", "mediterraneen", "dash", "paleo"]) assert.ok(ids.includes(id), id);
    assert.ok(RESTRICTIONS.some((r) => r.id === "sans-porc"));
    assert.equal(repartitionDuProfil({ repartitionMacros: "dash" }), "dash");
  });

  test("un modèle alimentaire ne change pas les objectifs du coach, et le dit", () => {
    for (const id of ["mediterraneen", "dash", "paleo"]) {
      assert.deepEqual(computeTargets({ ...BASE, repartitionMacros: id }, 80), computeTargets(BASE, 80), id);
      const phrases = descriptionRegime({ ...BASE, repartitionMacros: id });
      assert.equal(phrases.length, 1);
      assert.match(phrases[0], /restent ceux de ton coach/);
    }
  });

  test("halal, casher, sans alcool, flexitarien : cumulables, sans toucher aux objectifs", () => {
    assert.deepEqual(CONTRAINTES_ALIM.map((c) => c.id), ["halal", "casher", "sans-alcool", "flexitarien"]);
    assert.deepEqual(exclusionsContraintes({ contraintesAlim: ["halal", "casher"] }).sort(), ["alcool", "crustaces", "mollusques", "porc"]);
    assert.deepEqual(exclusionsContraintes({ contraintesAlim: ["inconnue"] }), []);
    assert.deepEqual(computeTargets({ ...BASE, contraintesAlim: ["halal"] }, 80), computeTargets(BASE, 80));
    // Cumul avec un régime : un pescétarien halal garde le poisson, perd le porc.
    const p = { ...BASE, dietType: "pescetarien", contraintesAlim: ["halal"] };
    assert.equal(regimeOk({ contains: ["poisson"] }, p), true);
    assert.equal(regimeOk({ contains: ["porc"] }, p), false);
    assert.equal(regimeOk({ contains: ["volaille"] }, p), false);
  });
});

describe("14 allergènes UE", () => {
  test("la liste d'origine est intacte, les six ajouts complètent", () => {
    assert.equal(ALLERGENS.length, 8);
    assert.equal(TOUS_LES_ALLERGENES.length, 14);
    assert.deepEqual(ALLERGENES_AJOUTES.map((a) => a.id), ["sesame", "moutarde", "celeri", "sulfites", "lupin", "mollusques"]);
    assert.equal(new Set(TOUS_LES_ALLERGENES.map((a) => a.id)).size, 14);
    assert.equal(libelleAllergene("sesame"), "Sésame");
    assert.equal(libelleAllergene("kiwi"), "kiwi");
  });

  test("repérés dans les recettes, et le catalogue reste publiable", () => {
    for (const a of ALLERGENES_AJOUTES) {
      assert.ok(CONTIENT_RECETTE.includes(a.id), a.id);
      assert.ok(REVELE[a.id], a.id);
    }
    assert.ok(REVELE.moutarde.test("1 c. à café de moutarde"));
    assert.ok(REVELE.sesame.test("houmous"));
    for (const r of RECETTES_COACH) assert.deepEqual(verifierRecette(r), [], r.id);
  });

  test("Coach IA : un allergène ajouté est connu, transmis et vérifié dans la réponse", () => {
    const p = { ...BASE, allergies: ["sesame", "mollusques"] };
    const k = lireContraintes(p);
    assert.deepEqual(k.horsListe, []);
    assert.match(construireConsigneCoach(p, null, null), /déclarées : Sésame, Mollusques\./);
    const r = verifierReponse("Une salade avec du tahini et des moules.", p);
    assert.deepEqual(r.alertes.map((a) => a.famille).sort(), ["mollusques", "sesame"]);
    assert.deepEqual(r.nonVerifiables, []);
  });
});

describe("contraintes dans la consigne du Coach IA", () => {
  test("transmises au modèle et relues dans la réponse", () => {
    const p = { ...BASE, contraintesAlim: ["halal"] };
    assert.match(construireConsigneCoach(p, null, null), /Contraintes alimentaires \(à respecter comme le régime\) : Halal\./);
    const r = verifierReponse("Un filet mignon de porc et un verre de vin.", p);
    assert.deepEqual(r.alertes.map((a) => [a.famille, a.motif]), [["porc", "regime"], ["alcool", "regime"]]);
    assert.deepEqual(verifierReponse("Un filet de poulet.", p).alertes, []);
  });

  test("sans contrainte, la consigne n'en parle pas", () => {
    assert.ok(!/Contraintes alimentaires/.test(construireConsigneCoach(BASE, null, null)));
  });

  test("aucun protocole de déshydratation", () => {
    assert.match(construireConsigneCoach(BASE, null, null), /Ne donne JAMAIS de protocole de déshydratation/);
  });
});

describe("IA fondée sur les preuves", () => {
  test("la règle est dans la consigne du Coach IA, même profil inconnu", () => {
    assert.ok(construireConsigneCoach(BASE, null, null).includes(REGLE_PREUVES));
    assert.ok(construireConsigneCoach(null, null, null).includes(REGLE_PREUVES));
    assert.match(REGLE_PREUVES, /N'invente JAMAIS une étude/);
  });

  test("et dans les bilans hebdomadaire et mensuel, juste avant le format", () => {
    const semaine = { start: "2026-10-19", end: "2026-10-25", hasAnyData: false, sessionNotes: [], dayNotes: [], painLines: [] };
    const hebdo = promptBilanHebdo({ weekStats: semaine, lastWeekStats: null, profile: BASE, lastActionsText: null });
    const mois = { monthKey: "2026-09", start: "2026-09-01", end: "2026-09-30", hasAnyData: false, measureDeltas: [] };
    const mensuel = promptBilanMensuel({ monthStats: mois, prevMonthStats: null, profile: BASE, lastActionsText: null });
    for (const p of [hebdo, mensuel]) {
      assert.ok(p.includes(REGLE_PREUVES + "\n\nRéponds UNIQUEMENT"));
    }
  });
});
