/**
 * Test de fumee dans un vrai navigateur.
 *
 * Les 636 tests de la suite verifient la logique ; aucun ne verifie que
 * l'application DEMARRE. C'est pourtant la panne la plus grave et la plus
 * bete : un import casse, un catalogue absent, et le client voit une page
 * blanche sans le moindre message.
 *
 * Ce script sert app/dist, y pose le profil et des donnees reelles, ouvre
 * chaque onglet, demarre une seance et ouvre la bibliotheque, et signale
 * la moindre erreur de console.
 *
 * Il n'est PAS dans la suite de tests : il demande Playwright, qui n'est pas
 * une dependance du projet. A lancer a la main avant une bascule :
 *
 *   cd app && npm run build && cd ..
 *   npm i --no-save playwright
 *   node scripts-migration/fumee-navigateur.mjs
 */

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";

import { fileURLToPath } from "node:url";
const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

const serveur = createServer((req, res) => {
  const chemin = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(chemin)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(chemin)] || "application/octet-stream" });
  res.end(readFileSync(chemin));
});
await new Promise((r) => serveur.listen(4599, r));

const navigateur = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await navigateur.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message));
page.on("requestfailed", (r) => erreurs.push("echec: " + r.url()));
page.on("response", (r) => r.status() >= 400 && erreurs.push("http " + r.status() + " " + r.url()));
page.on("console", (m) => m.type() === "error" && erreurs.push("console: " + m.text()));

// Le profil reel de Marien, pose avant le chargement de l'application.
await page.addInitScript(() => {
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Marien", sex: "homme", age: 28, heightCm: 174, startWeightKg: 70,
    activityLevel: "modere", goal: "prise", sessionsPerWeek: 4, targetWeightKg: 75,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_body_logs", JSON.stringify([{ id: "b1", date: "2026-09-04", weightKg: 70.4 }]));
  localStorage.setItem("coach_routines", JSON.stringify([
    { id: "r1", name: "Haut du corps", description: "Pecs / Dos", color: "#2DD4BF" }
  ]));
  localStorage.setItem("coach_sessions", JSON.stringify([
    { id: "s1", date: "2026-09-03", routineId: "r1", durationMin: 62, rpe: 8,
      exercises: [{ id: "e1", name: "Développé couché", mode: "muscu", sets: 4, reps: 8, weight: "60", rpe: "6" }] }
  ]));
  localStorage.setItem("coach_log_entries", JSON.stringify([
    { id: "l1", date: new Date().toISOString().slice(0, 10), meal: "midi", name: "Poulet riz",
      calories: 620, protein: 48, carbs: 70, fat: 12 }
  ]));
});

await page.goto("http://localhost:4599/", { waitUntil: "networkidle" });

const onglets = ["Journal", "Repas", "Nutrition", "Sommeil", "Mensurations", "Entraînements", "Tendances"];
for (const onglet of onglets) {
  const avant = erreurs.length;
  await page.getByRole("button", { name: onglet, exact: true }).first().click();
  await page.waitForTimeout(350);
  const texte = (await page.locator("main, #root").first().innerText()).replace(/\n+/g, " | ");
  console.log(`ONGLET ${onglet.padEnd(14)} ${erreurs.length > avant ? "ERREUR" : "ok"}  ${texte.slice(0, 150)}`);
}

// Ouvrir le constructeur de seances et sa bibliotheque.
await page.getByRole("button", { name: "Entraînements", exact: true }).first().click();
await page.waitForTimeout(300);
await page.getByText("Haut du corps").first().click();
await page.waitForTimeout(300);
console.log("MODALE SEANCE", (await page.locator("body").innerText()).includes("Enregistrer la séance") ? "ouverte" : "ABSENTE");
const bandeau = await page.locator("body").innerText();
console.log("SUGGESTION", /→ .* kg \(/.test(bandeau) ? bandeau.match(/[↑↓=] [^\n]*kg \([^)]*\)/)?.[0] : "absente");
await page.getByRole("button", { name: /Bibliothèque/ }).first().click();
await page.waitForTimeout(400);
const apres = await page.locator("body").innerText();
console.log("BIBLIOTHEQUE", apres.includes("MACHINES GUIDÉES") ? "ouverte" : "ABSENTE");
console.log("TITRES MODALES", await page.locator(".modal-panel, [role=dialog]").count(), JSON.stringify(apres.match(/Biblioth[^\n]*/g)));
console.log("EXTRAIT FIN", apres.slice(-500).replace(/\n+/g," | "));

// Le moteur de recherche local doit etre installe par les catalogues.
const moteur = await page.evaluate(() => ({
  moteur: typeof window.__CN_FOOD_SEARCH__,
  aliments: (window.__CN_FOOD_ITEMS__ || []).length,
  resultatRiz: (window.__CN_FOOD_SEARCH__ ? window.__CN_FOOD_SEARCH__("riz") : []).length
}));

const texte = await page.locator("body").innerText();

console.log("MOTEUR", JSON.stringify(moteur));
console.log("ERREURS", erreurs.length ? JSON.stringify(erreurs, null, 1) : "aucune");
console.log("EXTRAIT", texte.slice(0, 400).replace(/\n+/g, " | "));

await navigateur.close();
serveur.close();
