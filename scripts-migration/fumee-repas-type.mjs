/**
 * Fumee ciblee : l'editeur de quantites d'un repas type.
 *
 * La bascule vers Vite avait remplace l'editeur par aliment de
 * MealPortionEditor par un simple multiplicateur global, et n'ecrivait
 * qu'UNE ligne au journal au lieu d'une par aliment. Aucun test unitaire
 * ne pouvait le voir : les deux cotes etaient corrects separement.
 *
 * Ce script rejoue le parcours decrit page 5 du guide client :
 * ouvrir un repas type, passer le poulet en grammes, changer le riz de
 * 150 a 200 g sans toucher au reste, ajouter — et verifier que le journal
 * recoit bien trois entrees et que le poids de portion est retenu.
 *
 * Il n'est PAS dans la suite de tests : il demande Playwright.
 *
 *   cd app && npm run build && cd ..
 *   npm i --no-save playwright
 *   node scripts-migration/fumee-repas-type.mjs
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
await new Promise((r) => serveur.listen(4601, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await nav.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && erreurs.push("console: " + m.text()));

const AUJ = new Date().toISOString().slice(0, 10);
await page.addInitScript((auj) => {
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Marien", sex: "homme", age: 28, heightCm: 174, startWeightKg: 70,
    activityLevel: "modere", goal: "prise", sessionsPerWeek: 4, targetWeightKg: 75,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_log_entries", JSON.stringify([]));
  localStorage.setItem("cn_meal_presets", JSON.stringify([{
    id: "r1", name: "Déjeuner type", portions: 1,
    items: [
      { name: "Blanc de poulet", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
      { name: "Riz basmati cuit (150 g)", grams: 150, baseName: "Riz basmati cuit", calories: 195, protein: 4, carbs: 42, fat: 0.5 },
      { name: "Huile d'olive (10 g)", grams: 10, baseName: "Huile d'olive", calories: 88, protein: 0, carbs: 0, fat: 10 }
    ]
  }]));
}, AUJ);

await page.goto("http://localhost:4601/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Journal", exact: true }).first().click();
await page.waitForTimeout(400);

// Ouvrir l'ajout d'aliment sur le premier repas propose.
const boutonsAjout = page.getByRole("button", { name: "+ ajouter", exact: true });
console.log("BOUTONS AJOUT", await boutonsAjout.count());
await boutonsAjout.nth(1).click();  // Dejeuner
await page.waitForTimeout(400);
console.log("BOUTONS", JSON.stringify((await page.locator("button").allInnerTexts()).filter(Boolean).slice(0, 60)));
console.log("MODALE", (await page.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 1200));

await page.getByText("Déjeuner type").first().click();
await page.waitForTimeout(400);
const corps = await page.locator("body").innerText();
console.log("EDITEUR OUVERT", corps.includes("Ajuste la quantité de chaque aliment") ? "oui" : "NON");
console.log("COMPTER EN GRAMMES", corps.includes("Compter en grammes") ? "present" : "ABSENT");

const editeur = page.locator("div").filter({ hasText: /^Déjeuner typeAjuste la quantité/ }).last();
const champs = editeur.locator('input[type="number"]');
console.log("CHAMPS NUMERIQUES", await champs.count(), "(attendu 3 : un par aliment)");
const totalDe = async () => (await editeur.innerText()).match(/TOTAL\s*\n?\s*([\d ]+ kcal[^\n]*)/i)?.[1];
console.log("TOTAL AVANT", await totalDe());

// Le poulet est en portions : on le passe en grammes, puis 200 g.
await editeur.getByText("Compter en grammes").first().click();
await page.waitForTimeout(250);
await champs.first().fill("150");
await page.waitForTimeout(300);
await champs.first().fill("200");
await page.waitForTimeout(300);
const apres = await page.locator("body").innerText();
console.log("TOTAL APRES", await totalDe());
console.log("RIZ INTACT", /Riz basmati cuit[\s\S]{0,60}195 kcal/.test(apres) ? "oui (195 kcal)" : "NON : " + apres.match(/Riz basmati[^\n]*\n[^\n]*/)?.[0]);

// Le riz est deja en grammes : 150 -> 200 sans toucher aux autres lignes.
await champs.nth(1).fill("200");
await page.waitForTimeout(300);
const apres2 = await editeur.innerText();
console.log("RIZ 200 G", apres2.match(/Riz basmati cuit[^\n]*\n([^\n]*)/)?.[1]);
console.log("HUILE INTACTE", apres2.match(/Huile d'olive[^\n]*\n([^\n]*)/)?.[1]);
console.log("TOTAL FINAL", await totalDe());

await editeur.getByRole("button", { name: "Ajouter", exact: true }).click();
await page.waitForTimeout(600);

const journal = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_log_entries") || "[]"));
console.log("ENTREES JOURNAL", journal.length, "(attendu 3)");
for (const e of journal) console.log("  -", e.name, "|", e.calories, "kcal | P" + e.protein);
const presets = await page.evaluate(() => JSON.parse(localStorage.getItem("cn_meal_presets") || "[]"));
console.log("POIDS MEMORISE", presets[0]?.items?.[0]?.grams, "baseName:", presets[0]?.items?.[0]?.baseName);
console.log("ERREURS", erreurs.length ? JSON.stringify(erreurs, null, 1) : "aucune");

await nav.close();
serveur.close();
