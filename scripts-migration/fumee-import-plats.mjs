/**
 * Fumee ciblee : importer un aliment dans « Mes plats ».
 *
 * Remonte par Marien avec une capture : « Je ne peux plus importer mes
 * aliments ». Le bouton annoncait « recherche, photo IA ou code-barres »
 * et n'ouvrait rien — mon portage l'avait laisse branche sur une prop que
 * personne ne fournissait.
 *
 * Open Food Facts est simule : le script ne depend d'aucun reseau.
 *
 *   cd app && npm run build && cd ..
 *   npm i --no-save playwright
 *   node scripts-migration/fumee-import-plats.mjs
 */

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4605, r));
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await nav.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message));
await page.addInitScript(() => {
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Marien", sex: "homme", age: 28, heightCm: 174, startWeightKg: 70,
    activityLevel: "modere", goal: "prise", sessionsPerWeek: 4, targetWeightKg: 75,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: [], weighsStaples: "cru"
  }));
  localStorage.setItem("coach_dishes", JSON.stringify([]));
});
// Open Food Facts est injoignable dans ce bac a sable : on simule sa reponse.
await page.route("**/world.openfoodfacts.org/**", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      products: [{
        product_name: "Riz basmati",
        brands: "Taureau Ailé",
        nutriments: { "energy-kcal_100g": 130, proteins_100g: 2.7, carbohydrates_100g: 28, fat_100g: 0.3 }
      }]
    })
  });
});

await page.goto("http://localhost:4605/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Repas", exact: true }).first().click();
await page.waitForTimeout(400);

const btn = page.getByRole("button", { name: /Importer un aliment/ });
console.log("BOUTON", (await btn.count()) ? "present" : "ABSENT");
await btn.click();
await page.waitForTimeout(500);
const corps = await page.locator("body").innerText();
console.log("MODALE", /importer un aliment/i.test(corps) ? "ouverte" : "NE S'OUVRE PAS");
console.log("ONGLETS", ["Recherche", "Photo IA", "Code-barres"].filter((t) => corps.includes(t)).join(" · ") || "AUCUN");

// Chercher un aliment et l'importer.
const dlg = page.locator("[role=dialog], .modal-panel").last();
await dlg.getByPlaceholder(/skyr, riz basmati/).fill("riz basmati");
await page.waitForTimeout(600);
await dlg.getByRole("button", { name: "Chercher", exact: true }).click();
await page.waitForTimeout(900);
console.log("RESULTAT", (await dlg.innerText()).match(/Riz basmati[^\n]*\n?[^\n]*/)?.[0]?.replace(/\n/g, " | ") || "AUCUN");
await dlg.getByText(/^Riz basmati/).first().click();
await page.waitForTimeout(400);
console.log("PANNEAU QUANTITE", /Quantité \(g\)/i.test(await dlg.innerText()) ? "ouvert" : "ABSENT");
await dlg.getByRole("button", { name: "Ajouter", exact: true }).first().click();
await page.waitForTimeout(600);

const plats = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_dishes") || "[]"));
console.log("PLATS ENREGISTRES", plats.length);
for (const p of plats) console.log("  -", p.name, "|", p.calories, "kcal | P" + p.protein, "| grams:", p.grams);
console.log("MODALE REFERMEE", (await page.locator("[role=dialog], .modal-panel").count()) === 0 ? "oui" : "NON");
console.log("VISIBLE DANS LA LISTE", (await page.locator("body").innerText()).includes(plats[0]?.name || "@@") ? "oui" : "NON");
console.log("ERREURS", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close(); serveur.close();
