/**
 * Menu de la semaine (repris de l'app Neiram le 24/10/2026, PR #52), avec
 * les règles de l'app coach : cibles du coach (computeTargets), contraintes
 * halal / casher / sans alcool, clé cn_ dans la sauvegarde, articles
 * « menu » dans la liste Courses.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { RECETTES_COACH } from "../app/src/lib/recettes-coach-catalogue.js";
import { recetteCompatible } from "../app/src/lib/recettes-coach.js";
import { computeTargets } from "../app/src/lib/nutrition.js";
import { construireSauvegarde, enregistrer } from "../app/src/lib/stockage.js";
import { partagerTexte } from "../app/src/lib/partage-texte.js";
import { TEXTES_MENU } from "../app/src/lib/textes-menu.js";
import { creerLocalStorage } from "./harness.mjs";
import {
  CLE_AJOUTS_COURSES,
  CLE_PLAN_REPAS,
  REPAS_DU_JOUR,
  ajouterCoursesMenu,
  ciblesChangees,
  partsCuisinees,
  recettesDuMenu,
  bilanPlan,
  changerRepas,
  formaterQuantite,
  genererPlanRepas,
  ingredientsPourParts,
  lireQuantite,
  articlesPlacard,
  listeCoursesPlan,
  partsPour
} from "../app/src/lib/plan-repas.js";

const cibles = { calories: 2200, protein: 150 };
const plan = (profil, extra = {}) => genererPlanRepas({ catalogue: RECETTES_COACH, profil, cibles, debut: "2026-10-26", graine: 7, ...extra });
const parId = new Map(RECETTES_COACH.map((r) => [r.id, r]));

test("les parts de chaque repas totalisent 100 % des calories", () => {
  assert.equal(Math.round(REPAS_DU_JOUR.reduce((s, c) => s + c.part, 0) * 100), 100);
});

test("7 jours, 4 repas, dates suivies, calories proches de la cible", () => {
  const p = plan({ goal: "perte" });
  assert.equal(p.jours.length, 7);
  assert.deepEqual(
    p.jours.map((j) => j.date),
    ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]
  );
  for (const j of p.jours) assert.equal(j.repas.length, 4);
  const b = bilanPlan(p);
  assert.ok(Math.abs(b.kcal - 2200) <= 2200 * 0.08, `moyenne ${b.kcal} kcal`);
  assert.equal(b.libresKcal, 0);
});

test("régime et allergies : jamais une recette incompatible, même pour remplir un trou", () => {
  const profils = [{ dietType: "vegetalien" }, { dietType: "vegetarien" }, { dietType: "sans-porc" }, { dietType: "pescetarien" }, { allergies: ["gluten"] }, { allergies: ["lactose", "oeufs"] }];
  for (const profil of profils) {
    const p = plan({ goal: "maintien", ...profil });
    for (const j of p.jours) for (const x of j.repas) if (x.recetteId) assert.ok(recetteCompatible(parId.get(x.recetteId), profil), `${x.nom} servi à ${JSON.stringify(profil)}`);
  }
});

test("repas sans recette compatible : repas libre avec les calories à placer", () => {
  const p = plan({ goal: "maintien", allergies: ["gluten", "lactose", "oeufs", "soja", "fruits-a-coque", "arachides"] });
  const b = bilanPlan(p);
  for (const id of p.repasVides) {
    const x = p.jours[0].repas.find((r) => r.typeRepas === id);
    assert.equal(x.recetteId, null);
    assert.equal(x.kcalVisees, Math.round(2200 * REPAS_DU_JOUR.find((c) => c.id === id).part));
  }
  if (p.repasVides.length) assert.ok(b.libresKcal > 0);
});

test("restes : le dîner de 4 portions ou plus revient au déjeuner du lendemain, une seule fois", () => {
  const p = plan({ goal: "perte" });
  let vus = 0;
  for (let k = 1; k < 7; k++) {
    const dej = p.jours[k].repas.find((x) => x.typeRepas === "dejeuner");
    if (!dej.restes) continue;
    vus++;
    const dinerVeille = p.jours[k - 1].repas.find((x) => x.typeRepas === "diner");
    assert.equal(dej.recetteId, dinerVeille.recetteId);
    assert.ok(parId.get(dej.recetteId).portions >= 4);
    assert.ok(!dinerVeille.restes);
  }
  assert.ok(vus > 0, "au moins un repas en restes sur la semaine");
  const sans = plan({ goal: "perte" }, { restes: false });
  assert.ok(sans.jours.every((j) => j.repas.every((x) => !x.restes)));
});

test("variété : une recette n'est pas reprise le lendemain (hors restes)", () => {
  const p = plan({ goal: "prise" });
  for (let k = 1; k < 7; k++)
    for (const x of p.jours[k].repas) {
      if (!x.recetteId || x.restes) continue;
      const veille = p.jours[k - 1].repas.filter((y) => y.recetteId === x.recetteId && y.typeRepas === x.typeRepas);
      assert.equal(veille.length, 0, `${x.nom} deux jours de suite`);
    }
});

test("même graine, même menu ; graine différente, menu différent", () => {
  assert.deepEqual(plan({ goal: "perte" }), plan({ goal: "perte" }));
  const a = JSON.stringify(plan({ goal: "perte" }, { graine: 1 }).jours.map((j) => j.repas.map((x) => x.recetteId)));
  const b = JSON.stringify(plan({ goal: "perte" }, { graine: 99 }).jours.map((j) => j.repas.map((x) => x.recetteId)));
  assert.notEqual(a, b);
});

test("parts au quart, bornées", () => {
  assert.equal(partsPour(550, 348), 1.5);
  assert.equal(partsPour(100, 600), 0.5);
  assert.equal(partsPour(5000, 300), 2.5);
  assert.equal(partsPour(500, 0), 1);
});

test("changer un repas : autre recette compatible, le reste ne bouge pas", () => {
  const profil = { goal: "perte", dietType: "vegetarien" };
  const p = plan(profil);
  const avant = p.jours[2].repas.find((x) => x.typeRepas === "diner").recetteId;
  const q = changerRepas(p, { catalogue: RECETTES_COACH, profil, jour: 2, typeRepas: "diner" });
  const apres = q.jours[2].repas.find((x) => x.typeRepas === "diner");
  assert.notEqual(apres.recetteId, avant);
  assert.ok(recetteCompatible(parId.get(apres.recetteId), profil));
  assert.deepEqual(q.jours[3], p.jours[3]);
  assert.equal(q.jours[2].total.kcal, q.jours[2].repas.reduce((s, x) => s + (x.kcal || 0), 0));
});

test("lecture des quantités", () => {
  assert.deepEqual(lireQuantite("250 g"), { valeur: 250, unite: "g" });
  assert.deepEqual(lireQuantite("1,5 kg"), { valeur: 1500, unite: "g" });
  assert.deepEqual(lireQuantite("200 ml"), { valeur: 200, unite: "ml" });
  assert.deepEqual(lireQuantite("1 cuillère à soupe (10 g)"), { valeur: 10, unite: "g" });
  assert.deepEqual(lireQuantite("3 grandes (120 g)"), { valeur: 120, unite: "g" });
  assert.deepEqual(lireQuantite("1 cuillère à soupe"), { valeur: 15, unite: "g" });
  assert.deepEqual(lireQuantite("1 c. à café"), { valeur: 5, unite: "g" });
  assert.deepEqual(lireQuantite("2 gousses"), { valeur: 2, unite: "gousse" });
  assert.deepEqual(lireQuantite("1/2"), { valeur: 0.5, unite: "pièce" });
  assert.equal(lireQuantite("selon goût").valeur, null);
  assert.equal(lireQuantite("1 à 2 cuillères à soupe").valeur, null);
});

test("formatage des quantités", () => {
  assert.equal(formaterQuantite({ valeur: 1120, unite: "g" }), "1,1 kg");
  assert.equal(formaterQuantite({ valeur: 333, unite: "g" }), "330 g");
  assert.equal(formaterQuantite({ valeur: 12, unite: "g" }), "10 g");
  assert.equal(formaterQuantite({ valeur: 2.2, unite: "gousse" }), "2,5 gousses");
  assert.equal(formaterQuantite({ valeur: 1, unite: "pièce" }), "1");
});

test("liste de courses : ingrédients additionnés selon les parts mangées, épices au placard", () => {
  const p = plan({ goal: "perte" });
  const liste = listeCoursesPlan(p, RECETTES_COACH);
  assert.ok(liste.length > 10);
  const placard = liste.filter((l) => l.placard);
  assert.ok(placard.length > 0 && placard.every((l) => l.quantite));
  const premierPlacard = liste.findIndex((l) => l.placard);
  assert.ok(liste.slice(premierPlacard).every((l) => l.placard), "le placard est rangé à la fin");
  // Une seule recette sur un jour : quantité = ingrédient × parts / portions.
  const r = RECETTES_COACH.find((x) => x.ingredients.some((i) => i.quantite === "250 g"));
  const seul = { jours: [{ repas: [{ recetteId: r.id, parts: r.portions * 2 }] }] };
  const ing = r.ingredients.find((i) => i.quantite === "250 g");
  const ligne = listeCoursesPlan(seul, RECETTES_COACH).find((l) => l.nom === ing.nom.replace(/\s*\(.*?\)\s*/g, " ").trim());
  assert.equal(ligne.quantite, "500 g");
});

test("fiche : ingrédients pour le nombre de parts cuisinées", () => {
  const r = RECETTES_COACH.find((x) => x.ingredients.some((i) => i.quantite === "250 g") && x.portions === 2);
  const lignes = ingredientsPourParts(r, 1);
  const ing = r.ingredients.findIndex((i) => i.quantite === "250 g");
  assert.equal(lignes[ing].quantite, "130 g");
});

test("placard : épices séparées, sans doublon, triées", () => {
  const liste = [
    { nom: "Ail, curry, sel", placard: true },
    { nom: "Sel, poivre et cumin", placard: true },
    { nom: "Une pincée de sel, eau", placard: true },
    { nom: "Tofu", placard: false }
  ];
  assert.deepEqual(articlesPlacard(liste), ["ail", "cumin", "curry", "eau", "poivre", "sel"]);
});

// ── Règles propres à l'app coach ────────────────────────────────────────

test("cibles du coach : le menu part des targets de computeTargets, sans en inventer", () => {
  const profil = { name: "Test", sex: "homme", age: 35, heightCm: 180, startWeightKg: 82, activityLevel: "modere", goal: "perte", sessionsPerWeek: 3 };
  const targets = computeTargets(profil, 82);
  assert.ok(targets.calories > 0 && targets.protein > 0);
  const p = genererPlanRepas({ catalogue: RECETTES_COACH, profil, cibles: targets, debut: "2026-10-26", graine: 3 });
  assert.deepEqual(p.cibles, { calories: targets.calories, protein: targets.protein });
  const b = bilanPlan(p);
  assert.equal(b.cibleKcal, targets.calories);
  assert.ok(Math.abs(b.kcal - targets.calories) <= targets.calories * 0.1, `moyenne ${b.kcal} pour ${targets.calories}`);
  // Profil incomplet : pas de menu sur une cible par défaut.
  assert.equal(genererPlanRepas({ catalogue: RECETTES_COACH, profil, cibles: null, debut: "2026-10-26" }), null);
  assert.equal(genererPlanRepas({ catalogue: RECETTES_COACH, profil, cibles: { calories: null, protein: 120 }, debut: "2026-10-26" }), null);
});

test("contraintes halal, casher, sans alcool : jamais de porc, crustacés, mollusques ou alcool", () => {
  const crevettes = RECETTES_COACH.find((r) => (r.contient || []).includes("crustaces"));
  assert.ok(crevettes, "le catalogue contient une recette aux crustacés");
  assert.ok(recettesDuMenu(RECETTES_COACH, {}).some((r) => r.id === crevettes.id));
  assert.ok(!recettesDuMenu(RECETTES_COACH, { contraintesAlim: ["casher"] }).some((r) => r.id === crevettes.id));
  for (const contraintes of [["halal"], ["casher"], ["sans-alcool"], ["halal", "casher"]]) {
    const profil = { goal: "maintien", contraintesAlim: contraintes };
    const p = plan(profil);
    for (const j of p.jours)
      for (const x of j.repas) {
        if (!x.recetteId) continue;
        const r = parId.get(x.recetteId);
        if (contraintes.includes("halal") || contraintes.includes("casher")) assert.ok(!r.contient.includes("porc"), `${r.nom} (porc) en ${contraintes}`);
        if (contraintes.includes("casher")) assert.ok(!r.contient.some((c) => ["crustaces", "mollusques"].includes(c)), `${r.nom} en casher`);
      }
  }
  // Alcool repéré dans les ingrédients ; le vinaigre de vin n'en est pas.
  const base = RECETTES_COACH[0];
  const auVin = { ...base, id: "2026-01-01-test-vin", ingredients: [...base.ingredients, { nom: "Vin blanc sec", quantite: "10 cl" }] };
  const auVinaigre = { ...base, id: "2026-01-01-test-vinaigre", ingredients: [...base.ingredients, { nom: "Vinaigre de vin", quantite: "1 c. à soupe" }] };
  const ids = (profil) => recettesDuMenu([auVin, auVinaigre], profil).map((r) => r.id);
  assert.deepEqual(ids({ contraintesAlim: ["halal"] }), [auVinaigre.id]);
  assert.deepEqual(ids({ contraintesAlim: ["sans-alcool"] }), [auVinaigre.id]);
  assert.deepEqual(ids({ contraintesAlim: ["casher"] }), [auVin.id, auVinaigre.id]);
});

test("pescetarien et allergènes UE ajoutés : filtrés aussi", () => {
  for (const profil of [{ dietType: "pescetarien" }, { allergies: ["sesame", "moutarde", "celeri", "sulfites", "mollusques"] }]) {
    const p = plan({ goal: "maintien", ...profil });
    for (const j of p.jours) for (const x of j.repas) if (x.recetteId) assert.ok(recetteCompatible(parId.get(x.recetteId), profil), `${x.nom} servi à ${JSON.stringify(profil)}`);
  }
});

test("parts à cuisiner : le dîner compte aussi les restes du lendemain", () => {
  const p = plan({ goal: "perte" });
  const k = p.jours.findIndex((j, i) => i > 0 && j.repas.some((x) => x.typeRepas === "dejeuner" && x.restes));
  assert.ok(k > 0);
  const diner = p.jours[k - 1].repas.find((x) => x.typeRepas === "diner");
  const dej = p.jours[k].repas.find((x) => x.typeRepas === "dejeuner");
  assert.equal(partsCuisinees(p, k - 1, diner), diner.parts + dej.parts);
  const petitDej = p.jours[0].repas[0];
  assert.equal(partsCuisinees(p, 0, petitDej), petitDej.parts);
});

test("objectifs changés depuis le menu : signalé au-delà de 5 % ou 10 g", () => {
  const p = plan({ goal: "perte" });
  assert.equal(ciblesChangees(p, cibles), false);
  assert.equal(ciblesChangees(p, { calories: 2250, protein: 155 }), false);
  assert.equal(ciblesChangees(p, { calories: 2400, protein: 150 }), true);
  assert.equal(ciblesChangees(p, { calories: 2200, protein: 170 }), true);
  assert.equal(ciblesChangees(p, null), false);
});

test("Courses : les articles du menu (origine « menu ») remplacent ceux du menu précédent", () => {
  const manuel = { id: "a", name: "Café" };
  const ancien = { id: "b", name: "Riz (200 g)", origine: "menu" };
  const courses = [
    { nom: "Tofu ferme", quantite: "500 g", placard: false },
    { nom: "Sel, poivre", quantite: "selon goût", placard: true }
  ];
  const { liste, ajoutes } = ajouterCoursesMenu([manuel, ancien], courses);
  assert.equal(ajoutes, 1);
  assert.deepEqual(liste.map((x) => [x.name, x.origine]), [["Café", undefined], ["Tofu ferme (500 g)", "menu"]]);
  assert.ok(liste[1].id);
  assert.equal(CLE_AJOUTS_COURSES, "coach_shopping_custom");
  assert.deepEqual(ajouterCoursesMenu(null, []).liste, []);
});

test("sauvegarde : le menu (cn_plan_repas) part dans l'export", () => {
  globalThis.localStorage = creerLocalStorage();
  assert.ok(CLE_PLAN_REPAS.startsWith("cn_"));
  enregistrer(CLE_PLAN_REPAS, plan({ goal: "perte" }));
  const s = construireSauvegarde();
  assert.ok(s.data[CLE_PLAN_REPAS], "cn_plan_repas absent de la sauvegarde");
  assert.equal(JSON.parse(s.data[CLE_PLAN_REPAS]).jours.length, 7);
  delete globalThis.localStorage;
});

test("partage de la liste : partage du téléphone, sinon copie", async () => {
  const partages = [];
  assert.equal(await partagerTexte({ titre: "t", texte: "x" }, { navigator: { share: async (d) => partages.push(d) } }), "shared");
  assert.equal(partages[0].text, "x");
  const annule = Object.assign(new Error("a"), { name: "AbortError" });
  assert.equal(await partagerTexte({ titre: "t", texte: "x" }, { navigator: { share: async () => { throw annule; } } }), "cancelled");
  const copies = [];
  assert.equal(await partagerTexte({ titre: "t", texte: "x" }, { navigator: { clipboard: { writeText: async (t) => copies.push(t) } } }), "copied");
  assert.deepEqual(copies, ["x"]);
  assert.equal(await partagerTexte({ titre: "t", texte: "x" }, { navigator: {} }), "failed");
  const texte = TEXTES_MENU.texteCourses([{ nom: "Tofu", quantite: "500 g", placard: false }, { nom: "Sel", quantite: "selon goût", placard: true }], ["sel"]);
  assert.equal(texte, "Mes courses de la semaine (Coach Neiram)\n- Tofu : 500 g\nAu placard : sel");
});

test("changer un dîner suivi de restes : le déjeuner du lendemain suit, jamais orphelin", () => {
  const profil = { goal: "perte" };
  const p = { ...plan(profil), restes: true };
  const k = p.jours.findIndex((j, i) => i > 0 && j.repas.some((x) => x.typeRepas === "dejeuner" && x.restes));
  assert.ok(k > 0);
  for (let essai = 0; essai < 6; essai++) {
    const q = changerRepas(p, { catalogue: RECETTES_COACH, profil, jour: k - 1, typeRepas: "diner" });
    const diner = q.jours[k - 1].repas.find((x) => x.typeRepas === "diner");
    const dej = q.jours[k].repas.find((x) => x.typeRepas === "dejeuner");
    if (dej.restes) {
      assert.equal(dej.recetteId, diner.recetteId);
      assert.ok(parId.get(diner.recetteId).portions >= 4);
    } else assert.notEqual(dej.recetteId, p.jours[k].repas.find((x) => x.typeRepas === "dejeuner").recetteId);
    assert.equal(q.jours[k].total.kcal, q.jours[k].repas.reduce((s, x) => s + (x.kcal || 0), 0));
  }
});
