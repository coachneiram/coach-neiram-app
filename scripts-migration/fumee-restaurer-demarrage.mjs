/**
 * Fumee : restaurer sa sauvegarde des le premier ecran.
 *
 * Le scenario reel : une cliente change de telephone. Elle installe
 * l'application, tombe sur l'ecran de bienvenue, et doit pouvoir reprendre
 * ses donnees SANS avoir a recreer un profil d'abord.
 *
 * Ce script joue la chose en entier : il exporte depuis un telephone
 * « plein », vide tout, puis restaure depuis l'ecran de bienvenue et
 * verifie que les donnees sont bien revenues.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-restaurer-demarrage.mjs
 */

import { chromium, devices } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
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
await new Promise((r) => serveur.listen(4650, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const AUJ = new Date().toISOString().slice(0, 10);
const CHEMIN = "/tmp/sauvegarde-cliente.json";

try {
  // ── 1. Un telephone deja utilise ─────────────────────────────────
  await page.goto("http://localhost:4650/", { waitUntil: "domcontentloaded" });
  await page.evaluate((auj) => {
    localStorage.setItem("coach_profile", JSON.stringify({
      firstName: "Sophie", sex: "femme", age: 34, heightCm: 165, startWeightKg: 62,
      activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, targetWeightKg: 58,
      trainingMode: "app", coachingMode: "ligne", dietType: "aucun", allergies: []
    }));
    localStorage.setItem("coach_log_entries", JSON.stringify([
      { id: "l1", date: auj, mealType: "dejeuner", name: "Saumon riz", calories: 540, protein: 38, carbs: 55, fat: 16 }
    ]));
    localStorage.setItem("coach_body_logs", JSON.stringify([{ id: "b1", date: auj, weightKg: 61.4 }]));
  }, AUJ);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  // Export par le vrai bouton des reglages.
  const attenteFichier = page.waitForEvent("download");
  await page.locator('button[aria-label="Réglages"]').first().tap();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Exporter mes données/ }).first().click();
  const telechargement = await attenteFichier;
  writeFileSync(CHEMIN, readFileSync(await telechargement.path()));
  const sauvegarde = JSON.parse(readFileSync(CHEMIN, "utf8"));
  console.log("1. SAUVEGARDE EXPORTEE :", Object.keys(sauvegarde.data).length, "clés");

  // ── 2. Nouveau telephone : tout est vide ─────────────────────────
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const accueil = await page.locator("body").innerText();
  console.log("2. ECRAN DE BIENVENUE  :", /Commencer le suivi/.test(accueil) ? "affiché" : "*** ABSENT ***");
  console.log("   BOUTON RESTAURER    :", /J'ai déjà une sauvegarde/.test(accueil) ? "présent" : "*** ABSENT ***");

  // ── 3. Un mauvais fichier doit etre refuse, avec une phrase ──────
  writeFileSync("/tmp/pas-une-sauvegarde.json", '{"app":"autre-appli","data":{}}');
  await page.setInputFiles('input[type="file"]', "/tmp/pas-une-sauvegarde.json");
  await page.waitForTimeout(700);
  const apresErreur = await page.locator("body").innerText();
  console.log("3. MAUVAIS FICHIER     :", /invalide|aucune donnée/i.test(apresErreur) ? "refusé avec un message" : "*** AVALÉ EN SILENCE ***");
  console.log("   ECRAN TOUJOURS LA   :", /Commencer le suivi/.test(apresErreur) ? "oui" : "*** ÉCRAN PERDU ***");

  // ── 4. La vraie sauvegarde ───────────────────────────────────────
  await page.setInputFiles('input[type="file"]', CHEMIN);
  await page.waitForTimeout(1800);
  const donnees = await page.evaluate(() => ({
    profil: JSON.parse(localStorage.getItem("coach_profile") || "null"),
    repas: JSON.parse(localStorage.getItem("coach_log_entries") || "[]").length
  }));
  console.log("4. APRES RESTAURATION  :", donnees.profil ? `« ${donnees.profil.firstName} », ${donnees.profil.age} ans, ${donnees.repas} repas` : "*** RIEN ***");

  const final = await page.locator("body").innerText();
  console.log("   APPLICATION OUVERTE :", /Commencer le suivi/.test(final) ? "*** ENCORE SUR L'ACCUEIL ***" : "oui, sans ressaisie");
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
