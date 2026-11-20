/**
 * Menu sur mesure (repris de l'app Neiram, PR #76, le 20/11/2026) :
 * contrôle des recettes rendues par l'IA, menu de 14 repas (déjeuner +
 * dîner), budget estimé, et la fonction « planrepas » du Worker du coach
 * (8 192 jetons, 3 menus par jour et par client).
 *
 * Porté de tests/menu-sur-mesure.test.mjs de l'app publique, y compris
 * les cas de la revue de sécurité (allergènes relus d'après les
 * ingrédients, régimes contredits, halal/casher, mots entiers).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  BUDGET_MAX,
  budgetParRepas,
  consigneMenu,
  construireMenuSurMesure,
  contientMotRefuse,
  coutPlan,
  lireRecettesIa,
  motsAEviter,
  nombreRepas,
  nombreRecettesDemandees,
  preferencesValides
} from "../app/src/lib/menu-sur-mesure.js";
import { bilanPlan, listeCoursesPlan } from "../app/src/lib/plan-repas.js";
import { versRecetteClient } from "../app/src/lib/recettes-coach.js";
import { fauxD1 } from "./faux-d1.mjs";

globalThis.__COACH_TEST__ = globalThis.__COACH_TEST__ || {};
const { default: worker } = await import("../worker/coach-neiram-proxy.js");
const W = globalThis.__COACH_TEST__;

const prefs = preferencesValides({ repas: ["dejeuner", "diner"], budget: 30, cuisine: "asiatique", aEviter: "tofu, épinards et olives", tempsMax: 20, materiel: ["plaque", "poele", "four"] });
const profil = { goal: "prise", allergies: ["arachides"] };
const cibles = { calories: 2900, protein: 130 };

const recette = (nom, extra = {}) => ({
  nom,
  description: "Rapide et rassasiant.",
  categorie: "diner",
  portions: 4,
  preparationMin: 10,
  cuissonMin: 10,
  ingredients: [
    { nom: "Riz basmati", quantite: "400 g" },
    { nom: "Hauts de cuisse de poulet", quantite: "600 g" },
    { nom: "Sauce soja", quantite: "40 ml" }
  ],
  etapes: ["Cuire le riz.", "Saisir le poulet.", "Mélanger avec la sauce."],
  parPortion: { kcal: 640, p: 42, c: 80, f: 15 },
  coutPortion: 1.6,
  contient: ["volaille", "soja", "gluten"],
  regimes: ["sans-porc"],
  ...extra
});

const reponseIa = JSON.stringify({
  recettes: [
    recette("Poulet teriyaki et riz"),
    recette("Bœuf sauté aux légumes", { categorie: "dejeuner", contient: ["viande", "soja"], coutPortion: 2.1 }),
    recette("Nouilles sautées aux œufs", { categorie: "dejeuner", contient: ["gluten", "oeufs", "soja"], coutPortion: 1.1 }),
    recette("Curry de pois chiches", { coutPortion: 0.9, contient: [], regimes: ["vegan", "vegetarien", "sans-porc"] }),
    recette("Riz cantonais", { coutPortion: 1.2, contient: ["oeufs", "porc"] }),
    // Pièges : tofu refusé, trop long, arachides (allergie), calories absurdes.
    recette("Tofu croustillant au sésame", { ingredients: [{ nom: "Tofu ferme", quantite: "400 g" }], contient: ["soja"] }),
    recette("Ramen maison", { preparationMin: 30, cuissonMin: 60 }),
    recette("Poulet satay", { contient: ["volaille", "arachides"] }),
    recette("Wok de crevettes", { parPortion: { kcal: 50, p: 30, c: 60, f: 10 }, contient: ["crustaces"] })
  ]
});

describe("préférences", () => {
  test("14 repas : 7 jours × déjeuner et dîner, budget par repas", () => {
    assert.equal(nombreRepas(prefs), 14);
    assert.ok(Math.abs(budgetParRepas(prefs) - 30 / 14) < 1e-9);
    assert.equal(nombreRecettesDemandees(prefs), 7);
  });

  test("valeurs hors bornes ramenées dans les limites", () => {
    const p = preferencesValides({ repas: ["inconnu"], budget: 99999, tempsMax: 7, cuisine: "martienne", materiel: ["laser", "four"] });
    assert.deepEqual(p.repas, ["dejeuner", "diner"]);
    assert.equal(p.budget, BUDGET_MAX);
    assert.equal(p.tempsMax, 20);
    assert.equal(p.cuisine, "variee");
    assert.deepEqual(p.materiel, ["four"]);
  });

  test("aliments à éviter : liste libre découpée, sans accents, pluriels reconnus", () => {
    assert.deepEqual(motsAEviter("tofu, épinards et olives"), ["tofu", "epinards", "olives"]);
    assert.ok(contientMotRefuse({ nom: "Salade", ingredients: [{ nom: "Olive noire" }] }, ["olives"]));
    assert.ok(!contientMotRefuse({ nom: "Riz au poulet", ingredients: [{ nom: "Riz" }] }, ["olives"]));
  });
});

describe("consigne envoyée à l'IA", () => {
  test("toutes les contraintes y figurent", () => {
    const c = consigneMenu({ profil, cibles, prefs });
    for (const attendu of ["Asiatique", "20 minutes", "30 €", "14 repas", "tofu", "Arachides", "prise de masse", "2900 kcal", "coutPortion", "JSON"]) assert.ok(c.includes(attendu), attendu);
    assert.ok(/plaque, poêle, four/.test(c));
  });

  test("le Worker connaît la fonction planrepas, avec 8 192 jetons", () => {
    assert.ok(W.IA_FONCTIONS.includes("planrepas"));
    assert.equal(W.IA_JETONS_SORTIE_PAR_FONCTION.planrepas, 8192);
    const v = W.validerRequeteIa({ fonction: "planrepas", model: "gemini-3.6-flash", messages: [{ role: "user", parts: [{ text: "x" }] }], maxTokens: 99999 });
    assert.equal(v.erreur, undefined);
    assert.equal(v.charge.generationConfig.maxOutputTokens, 8192);
    const sans = W.validerRequeteIa({ model: "gemini-3.6-flash", messages: [{ role: "user", parts: [{ text: "x" }] }], maxTokens: 99999 });
    assert.equal(sans.charge.generationConfig.maxOutputTokens, 4096, "les autres appels ne changent pas");
  });

  test("le Worker : 3 menus sur mesure par jour et par client, sans bloquer les autres usages de l'IA", async () => {
    assert.equal(W.PLAN_REPAS_PAR_JOUR, 3);
    const env = { GEMINI_API_KEY: "cle-de-test", ADMIN_SECRET: "secret-admin-de-test-0123456789abcdef", DB: fauxD1() };
    const inv = await (await worker.fetch(new Request("https://proxy.test/admin/invitations", { method: "POST", headers: { Authorization: "Bearer " + env.ADMIN_SECRET }, body: JSON.stringify({ libelle: "Test M." }) }), env)).json();
    const act = await (await worker.fetch(new Request("https://proxy.test/auth/activer", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://coachneiram.github.io" }, body: JSON.stringify({ code: inv.code }) }), env)).json();
    const fetchOrigine = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 });
    try {
      const appel = (corps) =>
        worker.fetch(
          new Request("https://proxy.test/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: "https://coachneiram.github.io", Authorization: "Bearer " + act.jeton },
            body: JSON.stringify({ model: "gemini-3.6-flash", messages: [{ role: "user", parts: [{ text: "menu" }] }], maxTokens: 8192, ...corps })
          }),
          env
        );
      const statuts = [];
      for (let i = 0; i < 4; i++) statuts.push((await appel({ fonction: "planrepas" })).status);
      assert.deepEqual(statuts, [200, 200, 200, 429]);
      assert.equal((await (await appel({ fonction: "planrepas" })).json()).error, "quota-planrepas", "un code à part, pas « toute ton IA du jour »");
      assert.equal((await appel({})).status, 200, "le plafond « planrepas » ne bloque pas les autres usages IA");
    } finally {
      globalThis.fetch = fetchOrigine;
    }
  });
});

describe("contrôle des recettes de l'IA", () => {
  const { recettes, ecartees } = lireRecettesIa(reponseIa, { profil, prefs, graine: 3 });
  const noms = recettes.map((r) => r.nom);

  test("aliment refusé, trop long, allergie : écartés avec leur raison", () => {
    const raison = (n) => (ecartees.find((e) => e.nom === n) || {}).raison;
    assert.equal(raison("Tofu croustillant au sésame"), "aliment refusé");
    assert.equal(raison("Ramen maison"), "trop longue");
    assert.equal(raison("Poulet satay"), "régime ou allergies");
    for (const n of ["Tofu croustillant au sésame", "Ramen maison", "Poulet satay"]) assert.ok(!noms.includes(n), n);
  });

  test("calories incohérentes : recalculées depuis les macros", () => {
    const wok = recettes.find((r) => r.nom === "Wok de crevettes");
    assert.equal(wok.parPortion.kcal, 30 * 4 + 60 * 4 + 10 * 9);
  });

  test("identifiants uniques, coût par portion conservé", () => {
    assert.equal(new Set(recettes.map((r) => r.id)).size, recettes.length);
    assert.ok(recettes.every((r) => r.id.startsWith("ia-3-") && r.coutPortion > 0 && r.surMesure));
  });

  test("halal : porc écarté même sans étiquette", () => {
    const { recettes: halal } = lireRecettesIa(
      JSON.stringify({ recettes: [recette("Riz aux lardons", { contient: [], ingredients: [{ nom: "Lardons fumés", quantite: "200 g" }] }), recette("Poulet au riz")] }),
      { profil: { goal: "prise", contraintesAlim: ["halal"] }, prefs }
    );
    assert.deepEqual(halal.map((r) => r.nom), ["Poulet au riz"]);
  });

  test("réponse illisible : erreur levée, rien d'inventé", () => {
    assert.throws(() => lireRecettesIa("désolé, je ne peux pas", { profil, prefs }));
  });
});

describe("objectifs du coach", () => {
  test("sans calories (profil incomplet), pas de menu inventé ni d'appel à l'IA", async () => {
    const { recettes } = lireRecettesIa(reponseIa, { profil, prefs, graine: 3 });
    assert.equal(construireMenuSurMesure({ recettes, profil, cibles: {}, prefs, debut: "2026-11-23" }), null);
    const { genererMenuSurMesure } = await import("../app/src/lib/menu-sur-mesure.js");
    await assert.rejects(genererMenuSurMesure({ profil, cibles: { calories: 0 }, prefs, debut: "2026-11-23" }), /sans-objectifs/);
  });

  test("la recette notée dans « Mes recettes » ne se dit pas recette du coach", () => {
    const { recettes } = lireRecettesIa(reponseIa, { profil, prefs, graine: 3 });
    assert.match(versRecetteClient(recettes[0]).ingredients[0].name, /\(menu sur mesure\)$/);
  });
});

describe("menu de 14 repas", () => {
  const { recettes } = lireRecettesIa(reponseIa, { profil, prefs, graine: 3 });
  const menu = construireMenuSurMesure({ recettes, profil, cibles, prefs, debut: "2026-11-23", graine: 5 });

  test("déjeuner et dîner remplis 7 jours, petit-déjeuner et collation hors menu", () => {
    let planifies = 0;
    for (const j of menu.jours) {
      for (const x of j.repas) {
        if (x.typeRepas === "dejeuner" || x.typeRepas === "diner") {
          assert.ok(x.recetteId, `${j.date} ${x.typeRepas}`);
          planifies += 1;
        } else {
          assert.equal(x.recetteId, null);
          assert.equal(x.horsMenu, true);
        }
      }
    }
    assert.equal(planifies, 14);
    const b = bilanPlan(menu);
    assert.equal(b.libresKcal, 0);
    assert.equal(b.horsMenuKcal, Math.round(2900 * 0.35));
  });

  test("coût estimé = somme des parts mangées × coût par portion", () => {
    const parId = new Map(recettes.map((r) => [r.id, r]));
    let attendu = 0;
    for (const j of menu.jours) for (const x of j.repas) if (x.recetteId) attendu += parId.get(x.recetteId).coutPortion * x.parts;
    assert.equal(menu.cout.total, Math.round(attendu * 100) / 100);
    assert.equal(menu.cout.budget, 30);
    assert.equal(menu.cout.depasse, menu.cout.total > 30);
    assert.deepEqual(coutPlan(menu, recettes).total, menu.cout.total);
  });

  test("le budget oriente vers les recettes moins chères", () => {
    const large = construireMenuSurMesure({ recettes, profil, cibles, prefs: { ...prefs, budget: 300 }, debut: "2026-11-23", graine: 5 });
    assert.ok(menu.cout.total <= large.cout.total, `${menu.cout.total} € contre ${large.cout.total} €`);
  });

  test("liste de courses calculée depuis les recettes du menu", () => {
    const liste = listeCoursesPlan(menu, menu.recettes);
    assert.ok(liste.some((l) => /riz/i.test(l.nom)));
  });
});

describe("étiquettes de l'IA relues d'après les ingrédients", () => {
  const avec = (nom, ingredients, extra = {}) => recette(nom, { ingredients: ingredients.map((n) => ({ nom: n, quantite: "100 g" })), contient: [], regimes: [], ...extra });
  const garde = (profilTest, r) => lireRecettesIa(JSON.stringify({ recettes: [r] }), { profil: profilTest, prefs }).recettes.length === 1;

  test("allergies non déclarées par l'IA : sésame, arachides, mollusques", () => {
    assert.equal(garde({ goal: "prise", allergies: ["sesame"] }, avec("Poulet sésame", ["Poulet", "Graines de sésame"])), false);
    assert.equal(garde({ goal: "prise", allergies: ["arachides"] }, avec("Nouilles", ["Nouilles de riz", "Cacahuètes"])), false);
    assert.equal(garde({ goal: "prise", allergies: ["mollusques"] }, avec("Wok", ["Calamars", "Riz"])), false);
    assert.equal(garde({ goal: "prise", allergies: ["arachides"] }, avec("Riz poulet", ["Riz", "Poulet"])), true);
  });

  test("végétarien annoncé à tort : retiré, la recette est écartée pour un végétarien", () => {
    const r = avec("Soupe", ["Bouillon de poulet", "Carottes"], { regimes: ["vegetarien", "sans-porc"] });
    assert.equal(garde({ goal: "prise", dietType: "vegetarien" }, r), false);
  });

  test("halal : saucisson, mirin, saké écartés ; casher : calamars écartés", () => {
    const halal = { goal: "prise", contraintesAlim: ["halal"] };
    for (const ing of ["Saucisson", "Mirin", "Saké"]) assert.equal(garde(halal, avec("Plat", ["Riz", ing])), false, ing);
    assert.equal(garde({ goal: "prise", contraintesAlim: ["casher"] }, avec("Plat", ["Riz", "Calamars"])), false);
    assert.equal(garde(halal, avec("Plat", ["Riz", "Poulet"])), true);
  });

  test("aliment refusé : mot entier (pois n'écarte ni poivre ni poisson, ail n'écarte pas volaille)", () => {
    assert.equal(contientMotRefuse({ nom: "Poisson au poivre", ingredients: [{ nom: "Poivre" }] }, ["pois"]), false);
    assert.equal(contientMotRefuse({ nom: "Curry", ingredients: [{ nom: "Pois chiches" }] }, ["pois"]), true);
    assert.equal(contientMotRefuse({ nom: "Volaille rôtie", ingredients: [{ nom: "Volaille" }] }, ["ail"]), false);
    assert.equal(contientMotRefuse({ nom: "Poulet", ingredients: [{ nom: "Ail" }] }, ["ail"]), true);
  });

  test("le profil change (devient halal) : « Nouveau menu » retire les recettes devenues interdites", () => {
    const rs = lireRecettesIa(JSON.stringify({ recettes: [avec("Riz aux lardons", ["Riz", "Lardons"], { categorie: "diner" }), avec("Poulet riz", ["Riz", "Poulet"], { categorie: "diner" })] }), { profil: { goal: "prise" }, prefs }).recettes;
    assert.equal(rs.length, 2);
    const menu = construireMenuSurMesure({ recettes: rs, profil: { goal: "prise", contraintesAlim: ["halal"] }, cibles, prefs, debut: "2026-11-23" });
    const ids = new Set(menu.jours.flatMap((j) => j.repas.map((x) => x.recetteId)).filter(Boolean));
    assert.ok(![...ids].some((id) => menu.recettes.find((r) => r.id === id).nom.includes("lardons")));
    assert.equal(menu.recettes.length, 1);
  });
});

describe("revue du 20/11/2026 : ce que les motifs du catalogue ne voyaient pas", () => {
  // Étapes neutres : les étapes sont désormais relues elles aussi.
  const avec = (nom, ingredients, extra = {}) => recette(nom, { ingredients: ingredients.map((n) => ({ nom: n, quantite: "100 g" })), etapes: ["Cuire.", "Servir."], contient: [], regimes: [], ...extra });
  const garde = (profilTest, r) => lireRecettesIa(JSON.stringify({ recettes: [r] }), { profil: profilTest, prefs }).recettes.length === 1;
  const vegetarien = { goal: "prise", dietType: "vegetarien" };
  const vegan = { goal: "prise", dietType: "vegetalien" };

  test("végétarien et vegan annoncés à tort : moules, calamars, steak haché, lapin écartés", () => {
    assert.equal(garde(vegetarien, avec("Pâtes aux moules", ["Pâtes", "Moules"], { regimes: ["vegetarien", "sans-porc"] })), false);
    assert.equal(garde(vegan, avec("Wok", ["Riz", "Calamars"], { regimes: ["vegan", "vegetarien", "sans-porc"] })), false);
    assert.equal(garde(vegetarien, avec("Burger", ["Pain", "Steak haché"], { regimes: ["vegetarien"] })), false);
    assert.equal(garde(vegetarien, avec("Civet", ["Lapin", "Carottes"], { regimes: ["vegetarien"] })), false);
    assert.equal(garde(vegetarien, avec("Curry", ["Pois chiches", "Riz"], { regimes: ["vegetarien", "sans-porc"] })), true);
  });

  test("allergènes absents de l'étiquette et des motifs du catalogue", () => {
    const cas = [
      ["gluten", "Spaghetti"],
      ["gluten", "Naan"],
      ["gluten", "Panko"],
      ["lactose", "Cheddar"],
      ["lactose", "Béchamel"],
      ["lactose", "Gruyère râpé"],
      ["poisson", "Dorade"],
      ["poisson", "Sauce Worcestershire"],
      ["soja", "Sauce teriyaki"],
      ["oeufs", "Omelette"],
      ["fruits-a-coque", "Pesto"],
      ["crustaces", "Fruits de mer surgelés"],
      ["mollusques", "Fruits de mer surgelés"]
    ];
    for (const [allergie, ing] of cas) assert.equal(garde({ goal: "prise", allergies: [allergie] }, avec("Plat", ["Riz", ing])), false, `${ing} pour ${allergie}`);
    assert.equal(garde({ goal: "prise", contraintesAlim: ["casher"] }, avec("Plat", ["Riz", "Fruits de mer surgelés"])), false, "casher");
  });

  test("étapes et description relues : cacahuètes ajoutées à la fin, aliment refusé cité en garniture", () => {
    const r = avec("Nouilles sautées", ["Nouilles de riz", "Carottes"], { etapes: ["Cuire les nouilles.", "Parsemer de cacahuètes concassées."] });
    assert.equal(garde({ goal: "prise", allergies: ["arachides"] }, r), false);
    const coriandre = avec("Riz sauté", ["Riz", "Poulet"], { etapes: ["Cuire.", "Garnir de coriandre."] });
    assert.equal(lireRecettesIa(JSON.stringify({ recettes: [coriandre] }), { profil: { goal: "prise" }, prefs: { ...prefs, aEviter: "coriandre" } }).recettes.length, 0);
    const sans = avec("Riz sauté", ["Riz", "Poulet"], { description: "Sans lait ni crème, sans gluten.", etapes: ["Cuire.", "Servir sans attendre."] });
    assert.equal(garde({ goal: "prise", allergies: ["lactose", "gluten"] }, sans), true, "« sans lait » n'écarte pas la recette");
  });

  test("halal : vinaigre de vin accepté (comme le catalogue), mirin et champagne refusés", () => {
    const halal = { goal: "prise", contraintesAlim: ["halal"] };
    assert.equal(garde(halal, avec("Salade", ["Riz", "Vinaigre de vin"])), true);
    assert.equal(garde(halal, avec("Plat", ["Riz", "Champagne"])), false);
  });
});

describe("menu gardé, profil modifié depuis (revue du 20/11/2026)", () => {
  test("menu sur mesure : les repas devenus interdits disparaissent de l'écran, des restes et des courses", async () => {
    const { retirerInterdits } = await import("../app/src/lib/menu-sur-mesure.js");
    const rs = lireRecettesIa(
      JSON.stringify({ recettes: [recette("Poulet mirin", { ingredients: [{ nom: "Poulet", quantite: "500 g" }, { nom: "Mirin", quantite: "30 ml" }, { nom: "Riz", quantite: "300 g" }] }), recette("Bœuf brocolis", { categorie: "dejeuner", contient: [], ingredients: [{ nom: "Bœuf", quantite: "500 g" }, { nom: "Riz", quantite: "300 g" }] })] }),
      { profil: { goal: "prise" }, prefs }
    ).recettes;
    const menu = construireMenuSurMesure({ recettes: rs, profil: { goal: "prise" }, cibles, prefs, debut: "2026-11-23", graine: 2 });
    assert.equal(retirerInterdits(menu, { profil: { goal: "prise" } }).retires, 0);
    const { plan, retires } = retirerInterdits(menu, { profil: { goal: "prise", contraintesAlim: ["halal"] } });
    assert.ok(retires > 0);
    assert.ok(!plan.jours.some((j) => j.repas.some((x) => x.nom === "Poulet mirin")));
    assert.ok(plan.jours.some((j) => j.repas.some((x) => x.retire)));
    assert.ok(!plan.recettes.some((r) => r.nom === "Poulet mirin"));
    assert.ok(!listeCoursesPlan(plan, plan.recettes).some((l) => /mirin/i.test(l.nom)));
    assert.ok(plan.cout.total < menu.cout.total && plan.cout.budget === 30);
  });

  test("menu du catalogue : une allergie ajoutée retire les recettes qui la contiennent", async () => {
    const { retirerInterdits } = await import("../app/src/lib/menu-sur-mesure.js");
    const { RECETTES_COACH } = await import("../app/src/lib/recettes-coach-catalogue.js");
    const { genererPlanRepas } = await import("../app/src/lib/plan-repas.js");
    const plan = genererPlanRepas({ catalogue: RECETTES_COACH, profil: { goal: "maintien" }, cibles, debut: "2026-11-23", graine: 4 });
    const parId = new Map(RECETTES_COACH.map((r) => [r.id, r]));
    const { plan: relu, retires } = retirerInterdits(plan, { profil: { goal: "maintien", allergies: ["gluten"] }, catalogue: RECETTES_COACH });
    const avecGluten = plan.jours.flatMap((j) => j.repas).filter((x) => x.recetteId && parId.get(x.recetteId).contient.includes("gluten")).length;
    assert.equal(retires, avecGluten);
    assert.ok(!relu.jours.some((j) => j.repas.some((x) => x.recetteId && parId.get(x.recetteId).contient.includes("gluten"))));
  });

  test("catalogue halal : le mirin et le champagne sont aussi reconnus (liste d'alcools commune)", async () => {
    const { filtrerContraintes } = await import("../app/src/lib/plan-repas.js");
    const r = (nom, ing) => ({ id: nom, nom, contient: [], ingredients: [{ nom: ing, quantite: "20 ml" }] });
    const gardees = filtrerContraintes([r("a", "Mirin"), r("b", "Champagne"), r("c", "Vinaigre de vin"), r("d", "Gingembre")], { contraintesAlim: ["halal"] }).map((x) => x.id);
    assert.deepEqual(gardees, ["c", "d"]);
  });
});

describe("app : appel de l'IA pour le menu sur mesure", () => {
  test("un seul modèle, aucun repli : un appui ne consomme qu'un menu ; codes traduits", async () => {
    const { creerLocalStorage } = await import("./outils-neiram.mjs");
    globalThis.localStorage = creerLocalStorage({ acces_neiram: JSON.stringify({ jeton: "j".repeat(40), libelle: "Test", activeLe: "2026-11-20T00:00:00Z" }) });
    const { genererTexte, messageErreur } = await import("../app/src/lib/ia.js");
    const fetchOrigine = globalThis.fetch;
    let appels = 0;
    try {
      globalThis.fetch = async () => {
        appels += 1;
        return new Response(JSON.stringify({ ok: false, error: "amont-injoignable" }), { status: 502 });
      };
      await assert.rejects(genererTexte({ fonction: "planrepas", prompt: "x", maxTokens: 8192 }));
      assert.equal(appels, 1);
      globalThis.fetch = async () => new Response(JSON.stringify({ ok: false, error: "quota-planrepas" }), { status: 429 });
      const e1 = await genererTexte({ fonction: "planrepas", prompt: "x" }).catch((e) => e);
      assert.match(messageErreur(e1), /3 menus sur mesure du jour/);
      globalThis.fetch = async () => new Response(JSON.stringify({ ok: false, error: "fonction-invalide" }), { status: 400 });
      const e2 = await genererTexte({ fonction: "planrepas", prompt: "x" }).catch((e) => e);
      assert.match(messageErreur(e2), /pas encore ouvert sur le serveur de ton coach/);
    } finally {
      globalThis.fetch = fetchOrigine;
    }
  });
});
