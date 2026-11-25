/**
 * Fumée : « ✨ Menu sur mesure » et photos des plats (20 novembre 2026).
 * Aucun vrai appel : l'IA (/ai) et les photos (/photo, /photo/img) du
 * Worker du coach sont simulées par l'interception des requêtes.
 *
 *   1. Repas → Menu : le bouton « ✨ Menu sur mesure » ouvre le formulaire ;
 *   2. 14 repas (déjeuner + dîner), budget 30 €, asiatique, 20 min,
 *      « tofu, épinards et olives » refusés : la requête part en
 *      « planrepas », 8 192 jetons, avec toutes les contraintes ;
 *   3. le menu : 14 repas planifiés, aucun tofu, olive ni épinard (l'IA en
 *      avait glissé), petit-déjeuner et collation « Pas prévu », coût
 *      affiché ≤ budget, mention « pas un prix garanti » ;
 *   4. photos visibles sur les repas, et en grand dans la fiche avec le
 *      crédit « Photo : … / Pexels (illustration) » ;
 *   5. aucune erreur dans la console.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-menu-sur-mesure.mjs [dossier-captures]
 */

import { chromium } from "playwright";
import { appareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4752;
const CAPTURES = process.argv[2] || null;
const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const serveur = createServer((req, res) => {
  const chemin = req.url.split("?")[0];
  const c = join(DIST, chemin === "/" ? "index.html" : chemin);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(PORT, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// Une « photo » de plat : un dégradé rendu par le navigateur lui-même.
const atelier = await nav.newPage({ viewport: { width: 640, height: 400 } });
await atelier.setContent('<div style="width:640px;height:400px;background:linear-gradient(135deg,#e2a03f,#7a3e12 60%,#2f5d2a)"></div>');
const IMAGE = await atelier.screenshot({ type: "png" });
await atelier.close();

const ctx = await nav.newContext({ ...appareil(), deviceScaleFactor: 2 });
// Feu Vert (25/11/2026) : un profil individuel avec un code vérifie une fois son inscription Feu Vert : non inscrit.
await ctx.route("**/feuvert/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"inscrit":false}' }));
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
page.on("console", (m) => m.type() === "error" && erreurs.push(m.text()));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");

const recette = (nom, categorie, cout, ingredients, extra = {}) => ({
  nom,
  description: "Rapide, rassasiant, prêt en 20 minutes.",
  categorie,
  portions: 4,
  preparationMin: 8,
  cuissonMin: 12,
  ingredients: ingredients.map(([n, q]) => ({ nom: n, quantite: q })),
  etapes: ["Préparer les légumes.", "Saisir à la poêle.", "Servir chaud."],
  parPortion: { kcal: 520, p: 34, c: 62, f: 14 },
  coutPortion: cout,
  photo: "asian stir fry rice",
  contient: [],
  regimes: [],
  ...extra
});
const REPONSE_IA = JSON.stringify({
  recettes: [
    recette("Poulet sauté au gingembre et riz", "diner", 1.1, [["Riz basmati", "320 g"], ["Hauts de cuisse de poulet", "600 g"], ["Gingembre", "20 g"], ["Sauce soja", "40 ml"]], { photo: "ginger chicken rice" }),
    recette("Bœuf aux oignons et nouilles", "dejeuner", 1.3, [["Nouilles de blé", "300 g"], ["Bœuf haché 5 %", "500 g"], ["Oignons", "300 g"]], { photo: "beef noodles onion" }),
    recette("Riz cantonais aux œufs et petits pois", "dejeuner", 0.8, [["Riz", "320 g"], ["Œufs", "6"], ["Petits pois surgelés", "300 g"]], { photo: "egg fried rice peas" }),
    recette("Curry de pois chiches coco", "diner", 0.9, [["Pois chiches", "500 g"], ["Lait de coco", "400 ml"], ["Riz", "300 g"]], { photo: "chickpea coconut curry" }),
    recette("Wok de dinde aux légumes", "diner", 1.2, [["Escalopes de dinde", "500 g"], ["Poivrons", "300 g"], ["Riz", "300 g"]], { photo: "turkey vegetable wok" }),
    // Pièges : aliments refusés glissés par l'IA, et une recette trop longue.
    recette("Tofu croustillant au sésame", "diner", 0.7, [["Tofu ferme", "400 g"], ["Riz", "300 g"]], { photo: "crispy tofu sesame" }),
    recette("Salade de nouilles aux olives", "dejeuner", 0.6, [["Nouilles de riz", "300 g"], ["Olives noires", "100 g"]]),
    recette("Poêlée de saumon aux épinards", "dejeuner", 1.0, [["Saumon", "400 g"], ["Épinards frais", "300 g"]]),
    recette("Ramen maison", "diner", 1.0, [["Nouilles ramen", "300 g"], ["Bouillon", "1 L"]], { preparationMin: 30, cuissonMin: 60 })
  ]
});

const requetesIA = [];
const recherches = [];
await page.route("**/ai", (route) => {
  requetesIA.push(JSON.parse(route.request().postData() || "{}"));
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candidates: [{ content: { parts: [{ text: REPONSE_IA }] } }] }) });
});
await page.route(/\/photo\?q=/, (route) => {
  const q = new URL(route.request().url()).searchParams.get("q");
  recherches.push(q);
  route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ ok: true, photo: { id: 1000 + recherches.length, ext: "png", auteur: "Ana Photo" } }) });
});
await page.route(/\/photo\/img\//, (route) => route.fulfill({ status: 200, contentType: "image/png", headers: { "X-Content-Type-Options": "nosniff" }, body: IMAGE }));
await page.route("**/coach-sync", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
await page.route("**/presence", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("cn_synchro_locale", "1");
  localStorage.setItem("cn_consentement_ia", JSON.stringify({ accepte: true, version: 2, le: "2026-11-20" }));
  localStorage.setItem("acces_neiram", JSON.stringify({ jeton: "jeton-de-test-0123456789abcdef", libelle: "Test", activeLe: "2026-11-20T00:00:00Z" }));
  localStorage.setItem("coach_profile", JSON.stringify({
    name: "Test", sex: "homme", age: 34, heightCm: 178, startWeightKg: 78,
    activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
  }));
});

const fenetre = () => page.locator(".modal-panel").last();
const capture = async (nom) => {
  if (!CAPTURES) return;
  mkdirSync(CAPTURES, { recursive: true });
  await page.screenshot({ path: join(CAPTURES, nom + ".png") });
};
let ok = true;
const ligne = (etiquette, reussi, detail) => {
  if (!reussi) ok = false;
  console.log(etiquette.padEnd(26), ":", reussi ? detail : `*** ${detail} ***`);
};

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Repas", exact: true }).last().click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Menu", exact: true }).first().click();
  await page.waitForTimeout(400);

  // 1. Le formulaire.
  await page.locator("[data-ouvrir-sur-mesure] button").click();
  await fenetre().locator("[data-formulaire-sur-mesure]").waitFor({ timeout: 3000 });
  const formulaire = net(await fenetre().innerText());
  ligne("1. FORMULAIRE", /Repas à prévoir/.test(formulaire) && /14 repas sur la semaine/.test(formulaire) && /Créer mes 14 repas/.test(formulaire), "repas, budget, cuisine, goûts, temps, matériel ; 14 repas par défaut");

  // 2. Les réglages demandés.
  await fenetre().locator("[data-sm-budget]").fill("30");
  await fenetre().locator('[data-sm-cuisine="asiatique"]').click();
  await fenetre().locator("[data-sm-eviter]").fill("tofu, épinards et olives");
  await fenetre().locator('[data-sm-temps="20"]').click();
  await capture("01-formulaire");
  await fenetre().getByRole("button", { name: /Créer mes 14 repas/ }).click();
  await page.locator("[data-budget-menu]").waitFor({ timeout: 8000 });
  await page.waitForTimeout(800);
  const envoyee = requetesIA[0] || {};
  const consigne = JSON.stringify(envoyee.messages || []);
  ligne(
    "2. REQUETE IA",
    requetesIA.length === 1 && envoyee.fonction === "planrepas" && envoyee.maxTokens === 8192 && /Asiatique/.test(consigne) && /30 €/.test(consigne) && /14 repas/.test(consigne) && /20 minutes/.test(consigne) && /tofu, epinards, olives/.test(consigne),
    "planrepas, 8 192 jetons, asiatique, 30 €, 14 repas, 20 min, aliments refusés"
  );

  // 3. Le menu.
  const plan = await page.evaluate(() => JSON.parse(localStorage.getItem("cn_plan_repas") || "null"));
  const planifies = plan.jours.flatMap((j) => j.repas.filter((x) => x.recetteId));
  const horsMenu = plan.jours.flatMap((j) => j.repas.filter((x) => x.horsMenu));
  const noms = planifies.map((x) => x.nom).join(" | ");
  ligne(
    "3. MENU 14 REPAS",
    planifies.length === 14 && planifies.every((x) => x.typeRepas === "dejeuner" || x.typeRepas === "diner") && horsMenu.length === 14,
    `${planifies.length} repas planifiés, ${horsMenu.length} « pas prévus »`
  );
  ligne("   ALIMENTS REFUSES", !/tofu|olive|épinard|ramen/i.test(noms) && !plan.recettes.some((r) => /tofu|olive|épinard|ramen/i.test(JSON.stringify(r.ingredients) + r.nom)), "ni tofu, ni olives, ni épinards, ni recette trop longue");
  const budget = net(await page.locator("[data-budget-menu]").innerText());
  const montant = Number((budget.match(/Courses estimées : ([\d,]+) €/) || [])[1]?.replace(",", "."));
  ligne(
    "   BUDGET",
    montant > 0 && montant <= 30 && /pour un budget de 30,00 € \(14 repas\)/.test(budget) && /pas un prix garanti/.test(budget) && plan.cout.total === montant && !plan.cout.depasse,
    `courses estimées ${montant} € pour 30 €, « pas un prix garanti »`
  );
  const jourTexte = net(await page.locator("[data-menu-semaine]").innerText());
  ligne("   PAS PREVU", /Pas prévu dans ce menu : vise environ/.test(jourTexte) && /Hors menu : environ/.test(jourTexte), "petit-déjeuner et collation : « Pas prévu dans ce menu : vise environ X kcal »");
  ligne("   COUT PAR REPAS", /≈ \d+,\d{2} €/.test(jourTexte), "coût de chaque repas affiché");

  // 4. Photos.
  await page.waitForTimeout(600);
  const photosMenu = await page.locator("[data-repas-menu] [data-photo-recette] img").evaluateAll((imgs) => imgs.filter((i) => i.complete && i.naturalWidth > 0).length);
  ligne("   PROTEINES", !/Il manque environ/.test(jourTexte), "pas d'alerte protéines due aux repas volontairement hors menu");
  await page.locator('[data-repas-menu="dejeuner"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 120));
  await capture("02-menu");
  await page.locator("[data-voir-recette]").first().click();
  await fenetre().locator("[data-fiche-menu] [data-photo-recette] img").waitFor({ timeout: 3000 });
  await page.waitForTimeout(400);
  const fiche = net(await fenetre().innerText());
  const grande = await fenetre().locator("[data-fiche-menu] [data-photo-recette] img").evaluate((i) => i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().height >= 170);
  await capture("03-fiche");
  ligne("4. PHOTOS", photosMenu === 2 && grande && /Photo : Ana Photo \/ Pexels \(illustration\)/.test(fiche) && recherches.length > 0, `${photosMenu} photos sur le jour, grande photo et crédit dans la fiche, ${recherches.length} recherche(s) par le Worker`);
  await fenetre().getByRole("button", { name: "Fermer" }).click();
  await page.waitForTimeout(300);

  // Liste de courses avec le coût.
  await page.getByRole("button", { name: "🛒 Mes courses" }).click();
  await page.waitForTimeout(300);
  const courses = net(await fenetre().innerText());
  await capture("04-courses");
  ligne("   COURSES", /Coût estimé : [\d,]+ € \(budget 30,00 €\)/.test(courses), "coût estimé rappelé dans les courses");

  // 5. Console.
  const vraies = erreurs.filter((e) => !/favicon|manifest/i.test(e));
  ligne("5. CONSOLE", vraies.length === 0, vraies.length ? vraies.join(" / ").slice(0, 300) : "aucune erreur");
} catch (e) {
  ok = false;
  console.log("*** ÉCHEC :", e.message);
  await capture("zz-echec");
} finally {
  await nav.close();
  serveur.close();
}
console.log(ok ? "\nFUMÉE MENU SUR MESURE : OK" : "\nFUMÉE MENU SUR MESURE : DÉFAUT");
process.exit(ok ? 0 : 1);
