/**
 * Fumee ciblee : envoyer son bilan au coach, et le rappel du dimanche.
 *
 * Dans l'application deployee, le bouton « Envoyer » de Tendances etait
 * branche sur rien (App.jsx ne fournissait pas onPartager) et aucun
 * rappel ne se declenchait (ni setInterval ni Notification dans app/src).
 *
 * Ce script verifie les deux dans un vrai navigateur : le clic produit
 * bien un fichier HTML de bilan, et un dimanche a 11 h la banniere de
 * rappel s'affiche puis ne revient pas.
 *
 *   cd app && npm run build && cd ..
 *   npm i --no-save playwright
 *   node scripts-migration/fumee-bilan-dimanche.mjs
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
await new Promise((r) => serveur.listen(4603, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
// 6 septembre 2026, 11 h : un dimanche, dans la plage du rappel.
const page = await nav.newPage({ acceptDownloads: true });
const erreurs = [];
page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message));

const AUJ = "2026-09-06";
await page.addInitScript((auj) => {
  // Figer l'horloge du navigateur sur ce dimanche a 11 h.
  const fige = new Date(2026, 8, 6, 11, 0, 0).getTime();
  const Vraie = Date;
  function Fausse(...a) {
    return a.length ? new Vraie(...a) : new Vraie(fige);
  }
  Fausse.now = () => fige;
  Fausse.parse = Vraie.parse;
  Fausse.UTC = Vraie.UTC;
  Fausse.prototype = Vraie.prototype;
  window.Date = Fausse;

  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Sabine", name: "Sabine Marchand", sex: "femme", age: 42, heightCm: 165,
    startWeightKg: 72, activityLevel: "actif", goal: "perte", sessionsPerWeek: 6,
    targetWeightKg: 66, trainingMode: "app", coachingMode: "presentiel",
    dietType: "aucun", allergies: [], reportReminderEnabled: true
  }));
  localStorage.setItem("coach_body_logs", JSON.stringify([{ id: "b1", date: auj, weightKg: 71.1 }]));
  localStorage.setItem("coach_log_entries", JSON.stringify([
    { id: "l1", date: auj, mealType: "dejeuner", name: "Poulet riz", calories: 620, protein: 48, carbs: 70, fat: 12 }
  ]));
  localStorage.setItem("coach_daily_form", JSON.stringify([{ date: auj, energy: 4, stress: 5, steps: 8400, waterMl: 1750 }]));
}, AUJ);

await page.goto("http://localhost:4603/", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

const corps = await page.locator("body").innerText();
console.log("RAPPEL DIMANCHE", /C'est dimanche/.test(corps) ? "banniere affichee" : "ABSENTE");
console.log("  extrait :", corps.match(/C'est dimanche[^\n]*/)?.[0]?.slice(0, 110));
const etat = await page.evaluate(() => localStorage.getItem("coach_sunday_state"));
console.log("ETAT NOTE", etat, "(attendu : la semaine du 31 aout)");

// Deuxieme passage : le rappel ne doit pas revenir.
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
console.log("2e OUVERTURE", /C'est dimanche/.test(await page.locator("body").innerText()) ? "RAPPEL REPETE" : "pas de repetition");

// L'envoi du bilan.
await page.getByRole("button", { name: "Tendances", exact: true }).first().click();
await page.waitForTimeout(500);
const tend = await page.locator("body").innerText();
console.log("BOUTON ENVOI", /Envoyer sans bilan IA/.test(tend) ? "present" : "ABSENT");
console.log("BOUTON IA", /Bilan IA/.test(tend) ? "AFFICHE (non branche)" : "masque tant qu'il n'est pas branche");

const telechargement = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
await page.getByRole("button", { name: /Envoyer sans bilan IA/ }).click();
const dl = await telechargement;
console.log("FICHIER", dl ? dl.suggestedFilename() : "AUCUN TELECHARGEMENT");
if (dl) {
  const chemin = await dl.path();
  const html = readFileSync(chemin, "utf8");
  console.log("  taille :", html.length, "caracteres");
  console.log("  client :", html.match(/Client : ([^<]*)/)?.[1]);
  console.log("  semaine:", html.match(/Semaine du ([^<]*)/)?.[1]?.slice(0, 60));
  console.log("  poids  :", /71\.1 kg/.test(html) ? "71.1 kg present" : "ABSENT");
}
console.log("BILAN MARQUE ENVOYE", await page.evaluate(() => localStorage.getItem("coach_report_last_sent")));
console.log("ERREURS", erreurs.length ? JSON.stringify(erreurs, null, 1) : "aucune");

await nav.close();
serveur.close();
