/**
 * Fumee : les fibres, du catalogue jusqu'a l'ecran.
 *
 * Le module et la table existaient depuis longtemps, branches sur rien :
 * la recherche enrichissait ses resultats avec la teneur, et plus personne
 * ne la lisait ensuite. C'est le genre de travail qu'un test unitaire
 * declare fait alors qu'aucun client ne verra jamais le chiffre.
 *
 * Ce script ajoute un aliment REEL du catalogue, puis va lire l'ecran
 * Nutrition pour verifier que la teneur y arrive.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-fibres.mjs
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
await new Promise((r) => serveur.listen(4660, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await (await nav.newContext({ ...devices["iPhone 13"] })).newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Marien", sex: "homme", age: 28, heightCm: 174, startWeightKg: 70,
    activityLevel: "modere", goal: "prise", sessionsPerWeek: 4, targetWeightKg: 75,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_log_entries", JSON.stringify([]));
});

const lire = (k) => page.evaluate((c) => JSON.parse(localStorage.getItem(c) || "[]"), k);

try {
  await page.goto("http://localhost:4660/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  // La table connait les lentilles crues a 11 g pour 100 g.
  const teneur = await page.evaluate(() => {
    const t = window.__CN_FOOD_FIBRES__ || {};
    return { chargee: Object.keys(t).length, lentilles: t["cn-fr-x-lentilles-crues"] };
  });
  console.log("1. TABLE CHARGEE     :", teneur.chargee, "aliments · lentilles crues :", teneur.lentilles, "g/100 g");

  // ── Ajouter cet aliment par le vrai parcours ─────────────────────
  await page.getByRole("button", { name: "Journal", exact: true }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "+ ajouter", exact: true }).nth(1).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Aliments", exact: true }).first().click();
  await page.waitForTimeout(400);
  const modale = page.locator(".modal-panel").last();
  await modale.getByPlaceholder(/skyr, riz basmati/).fill("lentilles");
  await modale.getByRole("button", { name: "Chercher", exact: true }).click();
  await page.waitForTimeout(1200);

  // Un resultat s'ouvre AVANT de pouvoir etre ajoute : c'est la que se
  // saisit la quantite. La premiere version de ce script cherchait
  // « Ajouter » tout de suite et concluait a tort qu'il n'y avait aucun
  // resultat.
  const resultat = modale.getByRole("button", { name: /Lentilles crues/ }).first();
  if (!(await resultat.count())) throw new Error("aucun resultat pour « lentilles »");
  await resultat.click();
  await page.waitForTimeout(600);
  await modale.locator('input[type="number"]').first().fill("100");
  await page.waitForTimeout(300);
  await modale.getByRole("button", { name: "Ajouter", exact: true }).first().click();
  await page.waitForTimeout(800);

  const entrees = await lire("coach_log_entries");
  const avec = entrees.filter((e) => e.fiber != null);
  console.log("2. ALIMENT AJOUTE    :", entrees.length ? entrees[0].name : "*** AUCUN ***");
  console.log("   FIBRES ENREGISTREES:", avec.length ? `${avec[0].fiber} g` : "*** ABSENTES — la chaine est encore coupee ***");

  // ── Un aliment saisi a la main n'a PAS de teneur connue ──────────
  await page.evaluate(() => {
    const e = JSON.parse(localStorage.getItem("coach_log_entries") || "[]");
    e.push({ id: "libre", date: new Date().toISOString().slice(0, 10), mealType: "collation",
      name: "Plat maison", calories: 400, protein: 20, carbs: 40, fat: 15 });
    localStorage.setItem("coach_log_entries", JSON.stringify(e));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  // ── L'ecran Nutrition affiche-t-il quelque chose ? ───────────────
  await page.getByRole("button", { name: "Nutrition", exact: true }).first().click();
  await page.waitForTimeout(700);
  const texte = await page.locator("body").innerText();
  const ligne = texte.match(/Fibres aujourd'hui[^\n]*\n?[^\n]*/);
  console.log("3. SUR L'ECRAN       :", ligne ? ligne[0].replace(/\n/g, " ") : "*** RIEN D'AFFICHE ***");
  console.log("   MENTION PARTIELLE :", /Total partiel/.test(texte) ? "présente" : "*** ABSENTE ***");
  console.log("   ce qu'elle dit    :", texte.match(/Total partiel[^\n]*/)?.[0] || "(rien)");
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
