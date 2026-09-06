/**
 * Fumee : ne rien retaper deux fois.
 *
 * Trois raccourcis repondent a la meme question — « est-ce que je dois
 * ressaisir mes macros a chaque fois ? » :
 *
 *   1. enregistrer un repas complet, et le rappeler ;
 *   2. mettre un aliment en favori, et le retrouver ;
 *   3. enregistrer un plat dans « Mes plats ».
 *
 * Le script verifie surtout qu'ils SURVIVENT a la fermeture de l'app :
 * un favori qui disparait au redemarrage ne sert a rien, et c'est
 * exactement le genre de panne qui ne se voit qu'a l'usage.
 *
 *   cd app && npm run build && cd ..
 *   npm i --no-save playwright
 *   node scripts-migration/fumee-favoris-repas.mjs
 */

import { chromium } from "playwright";
import { appareil, nomAppareil } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4623, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));

const AUJ = new Date().toISOString().slice(0, 10);

// Open Food Facts est injoignable ici : on simule une reponse stable.
await page.route("**/world.openfoodfacts.org/**", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      products: [{
        product_name: "Skyr nature",
        brands: "Danone",
        code: "3033490004743",
        nutriments: { "energy-kcal_100g": 63, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: 0.2 }
      }]
    })
  });
});

// L'amorçage se rejoue a CHAQUE navigation : sans ce garde-fou, le
// rechargement remettrait les listes a zero et ferait croire a une perte
// de donnees. La premiere version de ce script s'y est fait prendre.
await page.addInitScript((auj) => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Marien", sex: "homme", age: 28, heightCm: 174, startWeightKg: 70,
    activityLevel: "modere", goal: "prise", sessionsPerWeek: 4, targetWeightKg: 75,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_log_entries", JSON.stringify([
    { id: "a1", date: auj, mealType: "petit-dejeuner", name: "Flocons d'avoine (80 g)", grams: 80, baseName: "Flocons d'avoine", calories: 300, protein: 10, carbs: 52, fat: 6 },
    { id: "a2", date: auj, mealType: "petit-dejeuner", name: "Fromage blanc 0% (200 g)", grams: 200, baseName: "Fromage blanc 0%", calories: 94, protein: 15, carbs: 8, fat: 0 }
  ]));
  localStorage.setItem("cn_meal_presets", JSON.stringify([]));
  localStorage.setItem("cn_food_favorites", JSON.stringify([]));
  localStorage.setItem("coach_dishes", JSON.stringify([]));
}, AUJ);

const lire = (cle) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "[]"), cle);

try {
  await page.goto("http://localhost:4623/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Journal", exact: true }).first().click();
  await page.waitForTimeout(700);

  // ── 1. Enregistrer un repas complet ──────────────────────────────
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Enregistrer ce repas/ }).first().click();
  await page.waitForTimeout(500);
  const dlg = page.locator(".modal-panel").last();
  await dlg.locator('input[type="text"], input:not([type])').first().fill("Petit-déj protéiné");
  await dlg.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.waitForTimeout(600);
  const repas = await lire("cn_meal_presets");
  console.log("1. REPAS ENREGISTRE :", repas.length ? `« ${repas[0].name} » · ${repas[0].items.length} aliments` : "*** AUCUN ***");

  // ── 2. Mettre un aliment en favori ───────────────────────────────
  await page.getByRole("button", { name: "+ ajouter", exact: true }).nth(1).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Aliments", exact: true }).first().click();
  await page.waitForTimeout(400);
  const modale = page.locator(".modal-panel").last();
  await modale.getByPlaceholder(/skyr, riz basmati/).fill("skyr");
  await modale.getByRole("button", { name: "Chercher", exact: true }).click();
  await page.waitForTimeout(900);
  const etoile = modale.getByRole("button", { name: "Ajouter aux favoris" }).first();
  console.log("2. ETOILE FAVORI      :", (await etoile.count()) ? "présente" : "*** ABSENTE ***");
  if (await etoile.count()) {
    await etoile.click();
    await page.waitForTimeout(500);
  }
  const favoris = await lire("cn_food_favorites");
  console.log("   FAVORI ENREGISTRE  :", favoris.length ? `« ${favoris[0].name} » · ${favoris[0].kcal100} kcal/100 g` : "*** AUCUN ***");

  // ── 3. Le tout survit-il a la fermeture de l'app ? ───────────────
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const repasApres = await lire("cn_meal_presets");
  const favApres = await lire("cn_food_favorites");
  console.log("3. APRES REDEMARRAGE  : repas =", repasApres.length, "· favoris =", favApres.length);

  // ── 4. Sont-ils REELLEMENT proposes a la saisie ? ────────────────
  await page.getByRole("button", { name: "Journal", exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "+ ajouter", exact: true }).nth(1).click();
  await page.waitForTimeout(600);
  const contenu = await page.locator(".modal-panel").last().innerText();
  console.log("4. ONGLET PAR DEFAUT  :", contenu.split("\n").slice(0, 6).join(" | "));
  console.log("   REPAS PROPOSE      :", /Petit-déj protéiné/.test(contenu) ? "oui, en un appui" : "*** NON PROPOSE ***");

  await page.getByRole("button", { name: "Aliments", exact: true }).first().click();
  await page.waitForTimeout(600);
  const ecranAliments = await page.locator(".modal-panel").last().innerText();
  console.log("   FAVORIS PROPOSES   :", /Mes aliments favoris/i.test(ecranAliments) ? "oui, sans rien chercher" : "*** NON PROPOSES ***");
  console.log("   dont              :", ecranAliments.match(/Skyr[^\n]*/)?.[0] || "(aucun)");
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
