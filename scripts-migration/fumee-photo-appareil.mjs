/**
 * Fumee : l'appareil photo est atteignable depuis chaque entree photo.
 *
 * Signale par Marien cote Android : « les gens ne pouvaient pas prendre
 * de photo à partir de l'appareil photo, elles pouvaient que à partir de
 * la photothèque ou des fichiers ».
 *
 * Ce n'est pas une regression de la bascule — l'application d'origine
 * avait le meme champ unique sans `capture`. Le script verifie que
 * chaque entree expose desormais DEUX champs : un qui ouvre l'appareil
 * photo (capture="environment"), un qui ouvre la photothèque.
 *
 *   cd app && npm run build && cd ..
 *   npm i --no-save playwright
 *   node scripts-migration/fumee-photo-appareil.mjs
 */

import { chromium, devices } from "playwright";
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
await new Promise((r) => serveur.listen(4622, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
// Gabarit Android : c'est la plateforme ou le bug se manifeste.
const page = await (await nav.newContext({ ...devices["Pixel 7"] })).newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));

const AUJ = new Date().toISOString().slice(0, 10);
await page.addInitScript((auj) => {
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Sabine", name: "Sabine M", sex: "femme", age: 42, heightCm: 165,
    startWeightKg: 72, activityLevel: "actif", goal: "perte", sessionsPerWeek: 6,
    targetWeightKg: 66, trainingMode: "app", coachingMode: "presentiel",
    dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_body_logs", JSON.stringify([{ id: "b1", date: auj, weightKg: 71.1 }]));
  localStorage.setItem("coach_log_entries", JSON.stringify([
    { id: "l1", date: auj, mealType: "dejeuner", name: "Poulet riz", calories: 620, protein: 48, carbs: 70, fat: 12 }
  ]));
  localStorage.setItem("coach_daily_form", JSON.stringify([{ date: auj, energy: 4, stress: 5 }]));
}, AUJ);

/** Les champs photo actuellement dans la page, et leur attribut capture. */
const champs = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('input[type="file"][accept^="image"]')].map((e) => ({
      capture: e.getAttribute("capture") || "(aucun)"
    }))
  );

const verifier = async (nom) => {
  const c = await champs();
  const appareil = c.filter((x) => x.capture === "environment").length;
  const galerie = c.filter((x) => x.capture === "(aucun)").length;
  const ok = appareil >= 1 && galerie >= 1;
  console.log(
    `${nom.padEnd(30)} ${c.length} champ(s) — appareil photo : ${appareil}, photothèque : ${galerie}  ${ok ? "ok" : "*** MANQUE UNE VOIE ***"}`
  );
};

try {
  await page.goto("http://localhost:4622/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  // 1. Photo du repas et code-barres, depuis le Journal.
  await page.getByRole("button", { name: "Journal", exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "+ ajouter", exact: true }).nth(1).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Aliments", exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Photo IA", exact: true }).first().click();
  await page.waitForTimeout(400);
  await verifier("Aliments → Photo IA");
  await page.getByRole("button", { name: "Code-barres", exact: true }).first().click();
  await page.waitForTimeout(400);
  await verifier("Aliments → Code-barres");
  await page.locator(".modal-overlay").first().click({ position: { x: 5, y: 5 }, force: true }).catch(() => {});
  await page.waitForTimeout(400);

  // 2. Liste de courses.
  await page.getByRole("button", { name: "Repas", exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Courses", exact: true }).first().click();
  await page.waitForTimeout(500);
  await verifier("Repas → Courses");

  // 3. Photos de progression.
  await page.getByRole("button", { name: "Tendances", exact: true }).first().click();
  await page.waitForTimeout(600);
  const pose = page.locator("text=Photos de progression").locator("xpath=following::button[1]");
  await pose.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(600);
  await verifier("Tendances → photo de pose");
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
