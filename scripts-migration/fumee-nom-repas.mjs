/**
 * Fumee ciblee : nommer un repas type au moment de l'enregistrer.
 *
 * Remonte par Marien : « quand on fait enregistrer ce repas, avant on avait
 * la possibilite de lui donner un nom, maintenant on ne peut plus ». Mon
 * portage enregistrait d'office sous le libelle de la section.
 *
 * Ce script rejoue le parcours : composer un petit-dejeuner, appuyer sur
 * « Enregistrer ce repas », le renommer, dire que la recette fait 8 parts,
 * et verifier ce qui atterrit dans le stockage.
 *
 *   cd app && npm run build && cd ..
 *   npm i --no-save playwright
 *   node scripts-migration/fumee-nom-repas.mjs
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
await new Promise((r) => serveur.listen(4602, r));
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await nav.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message));
const AUJ = new Date().toISOString().slice(0, 10);
await page.addInitScript((auj) => {
  localStorage.setItem("coach_profile", JSON.stringify({ firstName: "Marien", sex: "homme", age: 28, heightCm: 174, startWeightKg: 70, activityLevel: "modere", goal: "prise", sessionsPerWeek: 4, targetWeightKg: 75, trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: [] }));
  localStorage.setItem("cn_meal_presets", JSON.stringify([]));
  localStorage.setItem("coach_log_entries", JSON.stringify([
    { id: "a1", date: auj, mealType: "petit-dejeuner", name: "Flocons d'avoine (80 g)", grams: 80, baseName: "Flocons d'avoine", calories: 300, protein: 10, carbs: 52, fat: 6 },
    { id: "a2", date: auj, mealType: "petit-dejeuner", name: "Fromage blanc 0% (200 g)", grams: 200, baseName: "Fromage blanc 0%", calories: 94, protein: 15, carbs: 8, fat: 0 }
  ]));
}, AUJ);
await page.goto("http://localhost:4602/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Journal", exact: true }).first().click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /Enregistrer ce repas/ }).first().click();
await page.waitForTimeout(400);
const corps = await page.locator("body").innerText();
console.log("MODALE", /nom du repas/i.test(corps) ? "ouverte avec « Nom du repas »" : "PAS DE CHAMP NOM");
console.log("PORTIONS", /cette recette fait combien de portions/i.test(corps) ? "champ present" : "ABSENT");
console.log("RESUME", corps.match(/\d+ aliments? seront enregistr[^\n]*/)?.[0]);
const dlg = page.locator("[role=dialog], .modal-panel").last();
const nom = dlg.locator('input[type="text"], input:not([type])').first();
console.log("VALEUR PRE-REMPLIE", JSON.stringify(await nom.inputValue()));
await nom.fill("Pancakes du dimanche");
await dlg.locator('input[type="number"]').first().fill("8");
await page.waitForTimeout(200);
await dlg.getByRole("button", { name: "Enregistrer", exact: true }).click();
await page.waitForTimeout(500);
const presets = await page.evaluate(() => JSON.parse(localStorage.getItem("cn_meal_presets") || "[]"));
console.log("ENREGISTRE", JSON.stringify(presets.map((p) => ({ nom: p.name, portions: p.portions, aliments: p.items.length }))));
console.log("ERREURS", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close(); serveur.close();
