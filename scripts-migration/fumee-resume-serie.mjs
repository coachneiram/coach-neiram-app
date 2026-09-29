/**
 * Fumee : paliers de serie (Journal) et resume nutrition des 7 derniers
 * jours (Tendances).
 *
 *   1. 7 jours notes d'affilee, aujourd'hui compris : « Palier des 7 jours
 *      atteint ! » dans le Journal ;
 *   2. le matin, rien encore note aujourd'hui, 5 jours jusqu'a hier :
 *      « 5 jours de suite » et l'invitation a prolonger — pas « 0 » ;
 *   3. Tendances : jours notes, moyennes, meilleur jour, un axe de travail.
 *
 * Le fuseau est celui de Paris : c'est la ou la serie comptait un jour de
 * moins (dates calculees en UTC).
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-resume-serie.mjs
 */

import { chromium } from "playwright";
import { appareil } from "./appareil.mjs";
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
await new Promise((r) => serveur.listen(4644, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];

/**
 * Ouvre l'application avec `jours` journees notees, en finissant `decalage`
 * jours avant aujourd'hui (0 = aujourd'hui compris, 1 = jusqu'a hier).
 * Les dates sont calculees dans la page, comme l'application les calcule.
 */
async function ouvrir({ jours, decalage }) {
  const ctx = await nav.newContext({ ...appareil("Pixel 7"), timezoneId: "Europe/Paris" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript(({ jours, decalage }) => {
    if (localStorage.getItem("coach_profile")) return;
    const auj = new Date().toISOString().slice(0, 10);
    const date = (k) => {
      const d = new Date(auj + "T00:00:00");
      d.setDate(d.getDate() - k);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    localStorage.setItem("coach_profile", JSON.stringify({
      firstName: "Claire", sex: "femme", age: 35, heightCm: 166, startWeightKg: 64,
      activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3, targetWeightKg: 62,
      trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
    }));
    const entrees = [];
    for (let k = decalage; k < decalage + jours; k++) {
      // Proteines volontairement basses : l'axe attendu est « Protéines ».
      entrees.push({ id: "e" + k, date: date(k), mealType: "dejeuner", name: "Repas " + k, calories: 1500 + k * 10, protein: 40, carbs: 200, fat: 50 });
    }
    localStorage.setItem("coach_log_entries", JSON.stringify(entrees));
    localStorage.setItem("coach_daily_form", JSON.stringify([]));
  }, { jours, decalage });
  await page.goto("http://localhost:4644/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Journal", exact: true }).first().click();
  await page.waitForTimeout(500);
  return { ctx, page };
}

const bandeau = async (page) =>
  (await page.locator("[data-serie]").count()) ? (await page.locator("[data-serie]").innerText()).replace(/\s+/g, " ") : "";

try {
  // ── 1. Palier des 7 jours ───────────────────────────────────────
  {
    const { ctx, page } = await ouvrir({ jours: 7, decalage: 0 });
    const b = await bandeau(page);
    console.log(
      "1. PALIER 7 JOURS      :",
      /Palier des 7 jours atteint/.test(b) && /prochain palier : 14 jours \(encore 7\)/.test(b)
        ? "« Palier des 7 jours atteint ! · prochain palier : 14 jours (encore 7) »"
        : `*** « ${b} » ***`
    );

    // ── 3. Tendances : resume des 7 derniers jours ────────────────
    await page.getByRole("button", { name: "Tendances", exact: true }).first().click();
    await page.waitForTimeout(700);
    const t = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const checks = {
      titre: /Ma nutrition — 7 derniers jours/i.test(t),
      jours: /7 jours notés sur 7/.test(t),
      moyenne: /Calories moy\.\/jour 1530 kcal/.test(t),
      proteines: /Protéines moy\.\/jour 40 g/.test(t),
      meilleur: /Meilleur jour :/.test(t),
      axe: /À travailler : Protéines : 40 g par jour/.test(t)
    };
    const manquants = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
    console.log(
      "3. RÉSUMÉ 7 JOURS      :",
      manquants.length ? `*** MANQUE : ${manquants.join(", ")} ***` : "7/7 jours, 1530 kcal moy., meilleur jour, axe « Protéines »"
    );
    await ctx.close();
  }

  // ── 2. Le matin : serie d'hier, pas 0 ───────────────────────────
  {
    const { ctx, page } = await ouvrir({ jours: 5, decalage: 1 });
    const b = await bandeau(page);
    console.log(
      "2. LE MATIN            :",
      /5 jours de suite/.test(b) && /encore 2/.test(b) && /note quelque chose aujourd'hui/.test(b) && !/Palier/.test(b)
        ? "« 5 jours de suite · encore 2 · note quelque chose aujourd'hui »"
        : `*** « ${b} » ***`
    );
    await ctx.close();
  }
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
