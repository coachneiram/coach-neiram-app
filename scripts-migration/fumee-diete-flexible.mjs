/**
 * Fumee : diete flexible dans l'onglet Nutrition (14 octobre 2026).
 *
 *   1. la carte « Ta semaine compte plus que ta journée » montre le budget
 *      de la semaine (objectif × 7) et les 5 regles, plaisir prevu compris ;
 *   2. un ecart de 1 000 kcal la veille donne le conseil des jours restants,
 *      le meme que la bibliotheque, sans jeune, et l'explication de la
 *      balance (eau et sel, grammes de graisse au plus) ;
 *   3. l'Aide repond a « J'ai fait un écart ».
 *
 * Un lundi, il n'y a pas encore de veille dans la semaine : le controle 2
 * verifie alors le message « dans les clous ».
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-diete-flexible.mjs
 */

import { chromium } from "playwright";
import { appareil } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { budgetSemaine, messageSemaine, reglesDieteFlexible } from "../app/src/lib/diete-flexible.js";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4706, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil("Pixel 7"));
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Alex", name: "Alex", sex: "homme", age: 34, heightCm: 178, startWeightKg: 88,
    activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, targetWeightKg: 80,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_log_entries", JSON.stringify([]));
});

const ouvrirNutrition = async () => {
  await page.getByRole("button", { name: /^Nutrition$/ }).last().click();
  await page.waitForTimeout(700);
};
const carte = () => page.locator("[data-diete-flexible]").locator("xpath=ancestor::div[contains(@style,'border-radius')][1]");

try {
  await page.goto("http://localhost:4706/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await ouvrirNutrition();

  // 1. Budget et regles.
  const t1 = net(await carte().innerText());
  const m = t1.match(/Budget de la semaine : ([\d ]+) kcal \(([\d ]+) × 7\)/);
  const cible = m ? Number(m[2].replace(/ /g, "")) : null;
  const regles = ["Ton total de la journée compte", "lisse sur la semaine", "Prévois ton plaisir", "Pas de jeûne le lendemain", "Garde tes protéines"].filter((r) => t1.includes(r)).length;
  console.log(
    "1. BUDGET ET RÈGLES     :",
    // Les regles sont chiffrees sur l'objectif du client (16 octobre 2026).
    cible && Number(m[1].replace(/ /g, "")) === cible * 7 && regles === 5 &&
      reglesDieteFlexible(cible).every(([t, x]) => t1.includes(net(`${t} ${x}`)))
      ? `${(cible * 7).toLocaleString("fr-FR")} kcal (${cible} × 7), 5 règles chiffrées sur ${cible} kcal`
      : `*** ${t1.slice(0, 200)} ***`
  );

  // 2. Un ecart de 1 000 kcal la veille.
  const auj = await page.evaluate(() => new Date().toISOString().slice(0, 10));
  const lundi = (() => {
    const d = new Date(auj + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  })();
  const hier = (() => {
    const d = new Date(auj + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const entrees = auj === lundi ? [] : [{ id: "r1", date: hier, mealType: "diner", name: "Raclette", calories: cible + 1000, protein: 60, carbs: 120, fat: 90 }];
  await page.evaluate((e) => localStorage.setItem("coach_log_entries", JSON.stringify(e)), entrees);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await ouvrirNutrition();
  const t2 = net(await carte().innerText());
  const attendu = net(messageSemaine(budgetSemaine({ entrees, objectif: cible, aujourdhui: auj })));
  const avecEcart = entrees.length > 0;
  console.log(
    "2. ÉCART DE LA VEILLE   :",
    t2.includes(attendu) && (!avecEcart || (/Pas besoin de jeûner/.test(t2) && /au plus 130 g de graisse/.test(t2)))
      ? avecEcart
        ? `« ${attendu.slice(0, 90)}… », 130 g de graisse au plus`
        : "lundi : « dans les clous »"
      : `*** attendu « ${attendu} » ; affiché « ${t2.slice(0, 260)} » ***`
  );

  // 3. Aide.
  await page.locator('button[aria-label="Réglages"]').first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Aide/ }).first().click();
  await page.waitForTimeout(500);
  const aide = net(await page.locator(".modal-panel").last().innerText());
  console.log("3. AIDE                 :", /J'ai fait un écart/.test(aide) ? "« J'ai fait un écart (raclette, resto) : je fais quoi ? »" : "*** question absente ***");
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
