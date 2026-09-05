/**
 * Fumee ciblee : generation et AFFICHAGE des bilans IA.
 *
 * Trois pannes empilees dans l'application deployee : le bouton mensuel
 * etait branche sur rien, la generation hebdo n'avait jamais ete portee,
 * et l'affichage du bilan non plus.
 *
 * Ce script simule le proxy IA (aucun appel reseau reel), clique les deux
 * boutons et verifie que le bilan s'affiche ET s'enregistre.
 *
 *   cd app && npm run build && cd ..
 *   npm i --no-save playwright
 *   node scripts-migration/fumee-bilan-ia.mjs
 */

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4604, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await nav.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message));

const BILAN = `RÉSUMÉ:
Semaine solide malgré un déficit un peu creusé.

ÉVOLUTION:
Poids en baisse régulière, adhérence en hausse.

POINTS_FORTS:
- Assiduité aux séances

VIGILANCE:
- Apport calorique bas

A_CORRIGER:
- Monter les glucides

ACTIONS:
1. Ajouter 150 kcal par jour
2. Coucher avant 23 h`;

// Le proxy IA est simule : le prompt reellement envoye est capture.
let promptRecu = null;
await page.route("**/ai", async (route) => {
  promptRecu = JSON.parse(route.request().postData()).messages.at(-1).parts.map((p) => p.text).join("");
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ candidates: [{ content: { parts: [{ text: BILAN }] } }] })
  });
});

const AUJ = new Date().toISOString().slice(0, 10);
await page.addInitScript((auj) => {
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Sabine", name: "Sabine Marchand", sex: "femme", age: 42, heightCm: 165,
    startWeightKg: 72, activityLevel: "actif", goal: "perte", sessionsPerWeek: 6,
    targetWeightKg: 66, trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_body_logs", JSON.stringify([{ id: "b1", date: auj, weightKg: 71.1 }]));
  localStorage.setItem("coach_log_entries", JSON.stringify([
    { id: "l1", date: auj, mealType: "dejeuner", name: "Poulet riz", calories: 620, protein: 48, carbs: 70, fat: 12 }
  ]));
  localStorage.setItem("coach_daily_form", JSON.stringify([{ date: auj, energy: 4, stress: 5, steps: 8400, waterMl: 1750 }]));
  localStorage.setItem("coach_reports", JSON.stringify([]));
  localStorage.setItem("coach_reports_monthly", JSON.stringify([]));
  // Une douleur declaree : la consigne de securite doit apparaitre dans le prompt.
  localStorage.setItem("coach_sessions", JSON.stringify([
    { id: "s1", date: auj, durationMin: 60, rpe: 8, pains: [{ zone: "Genou droit", level: 3 }], exercises: [] }
  ]));
}, AUJ);

await page.goto("http://localhost:4604/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Tendances", exact: true }).first().click();
await page.waitForTimeout(400);

console.log("BOUTON IA", (await page.locator("body").innerText()).includes("Bilan IA") ? "present" : "ABSENT");
await page.getByRole("button", { name: /Bilan IA/ }).click();
await page.waitForTimeout(900);

const corps = await page.locator("body").innerText();
console.log("PROMPT ENVOYE", promptRecu ? promptRecu.length + " caracteres" : "AUCUN APPEL");
console.log("  consigne douleurs :", /Ne pose aucun diagnostic/.test(promptRecu || "") ? "presente" : "ABSENTE");
console.log("BILAN AFFICHE", /Semaine solide malgré un déficit/.test(corps) ? "oui" : "NON");
console.log("  sections    :", ["Évolution", "Points forts", "Vigilance", "À corriger", "Actions pour la semaine prochaine"].filter((t) => new RegExp(t, "i").test(corps)).join(" · "));
console.log("  action 1    :", corps.match(/1\.\s*(Ajouter[^\n]*)/)?.[1]);
console.log("BOUTON DEVENU", /Régénérer/.test(corps) ? "« Régénérer »" : "inchange");
console.log("ENVOI DEVENU", /Envoyer à mon coach/.test(corps) ? "« Envoyer à mon coach »" : "inchange");
const stocke = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_reports") || "[]"));
console.log("ENREGISTRE", stocke.length, "bilan(s) —", JSON.stringify(stocke[0]?.sections?.actions));

// Bilan mensuel
const btnMois = page.getByRole("button", { name: /Générer le bilan mensuel/ });
console.log("BOUTON MENSUEL", (await btnMois.count()) ? "present" : "ABSENT");
if (await btnMois.count()) {
  await btnMois.click();
  await page.waitForTimeout(900);
  const m = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_reports_monthly") || "[]"));
  console.log("MENSUEL ENREGISTRE", m.length, "—", JSON.stringify(m[0]?.sections?.resume)?.slice(0, 60));
  console.log("  prompt mensuel :", /BILAN MENSUEL/.test(promptRecu || "") ? "bien celui du mois" : "MAUVAIS PROMPT");
}
console.log("ERREURS", erreurs.length ? JSON.stringify(erreurs, null, 1) : "aucune");

await nav.close();
serveur.close();
