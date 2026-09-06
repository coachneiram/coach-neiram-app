/**
 * Fumee : la version construite est visible dans les Reglages.
 *
 * Sans elle, impossible de savoir ce qu'un telephone execute vraiment.
 * Deux fois pendant la migration, un bug signale comme « toujours la »
 * etait en realite un ancien paquet garde en cache — et il a fallu un
 * aller-retour complet pour s'en apercevoir.
 *
 *   cd app && npm run build && cd ..
 *   npm i --no-save playwright
 *   node scripts-migration/fumee-version.mjs
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
await new Promise((r) => serveur.listen(4621, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await (await nav.newContext(appareil())).newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));

await page.addInitScript(() => {
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Marien", sex: "homme", age: 28, heightCm: 174, startWeightKg: 70,
    activityLevel: "modere", goal: "prise", sessionsPerWeek: 4, targetWeightKg: 75,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
});

try {
  await page.goto("http://localhost:4621/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  // Sur mobile, les reglages s'ouvrent par l'icone en haut a droite : le
  // lien « Mon profil & reglages » vit dans la barre laterale, masquee.
  await page.locator('button[aria-label="Réglages"]').first().tap();
  await page.waitForTimeout(700);

  const texte = await page.locator(".modal-panel").first().innerText();
  const version = texte.match(/Version [^\n]+/)?.[0];
  console.log("VERSION AFFICHEE :", version || "*** ABSENTE ***");
  console.log("  forme attendue :", /^Version \d{4}-\d{2}-\d{2} · [0-9a-f]{7,}$/.test(version || "") ? "date + commit" : "inattendue");

  // L'ecran doit rester utilisable : la version ne doit rien recouvrir.
  const enregistrer = page.getByRole("button", { name: "Enregistrer", exact: true }).first();
  console.log("BOUTON ENREGISTRER :", (await enregistrer.isVisible()) ? "toujours visible" : "*** MASQUE ***");
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
