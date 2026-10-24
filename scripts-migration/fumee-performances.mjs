/**
 * Fumée : mes performances, niveau officiel et transformation (24 octobre 2026).
 *
 *   1. Séances → « Mes performances » : les trois maxis donnent le total,
 *      le niveau FFForce et les points IPF GL ;
 *   2. course : un 10 km en 45:00 donne le niveau FFA ; une faute de frappe
 *      est signalée sans effacer le chrono ;
 *   3. Mesures → « Ma transformation » : gras perdu sur 90 jours.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-performances.mjs
 */

import { chromium } from "playwright";
import { appareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4722, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  const jour = (k) => {
    const d = new Date();
    d.setDate(d.getDate() - k);
    return d.toISOString().slice(0, 10);
  };
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Thomas", name: "Thomas", sex: "homme", age: 30, heightCm: 180, startWeightKg: 86,
    activityLevel: "modere", goal: "perte", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_body_logs", JSON.stringify([
    { id: "b1", date: jour(80), weightKg: 86, bodyFatPct: 20 },
    { id: "b2", date: jour(2), weightKg: 82.4, bodyFatPct: 17 }
  ]));
});

try {
  await page.goto("http://localhost:4722/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /^(Séances|Entraînements)$/ }).last().click();
  await page.waitForTimeout(600);

  // 1. Force.
  const carte = page.locator("[data-carte-performances]");
  for (const [id, v] of [["squat", "180"], ["bench", "120"], ["deadlift", "220"]]) await carte.locator(`[data-perf="pl_${id}"]`).fill(v);
  await page.waitForTimeout(300);
  const t1 = net(await carte.locator("[data-niveau-force]").innerText().catch(() => ""));
  console.log(
    "1. FORCE ATHLÉTIQUE     :",
    /Total 520 kg : niveau/.test(t1) && /grille FFForce/.test(t1) && /Points IPF GL : \d/.test(t1)
      ? t1.split(" Catégorie")[0]
      : `*** « ${t1.slice(0, 200)} » ***`
  );

  // 2. Course.
  await carte.locator('[data-discipline-perf="course"]').click();
  await page.waitForTimeout(200);
  const champ10 = carte.locator('[data-perf="course_10k"]');
  await champ10.fill("45:00");
  await champ10.blur();
  await page.waitForTimeout(200);
  const t2 = net(await carte.locator('[data-niveau-course="course_10k"]').innerText().catch(() => ""));
  await champ10.fill("45:9x");
  await champ10.blur();
  await page.waitForTimeout(200);
  const erreur = /Temps à écrire comme 24:35/.test(net(await carte.innerText()));
  const garde = await page.evaluate(() => JSON.parse(localStorage.getItem("cn_performances") || "{}").course_10k?.valeur);
  console.log(
    "2. COURSE 10 KM         :",
    /^Niveau FFA : /.test(t2) && erreur && garde === 2700 ? `« ${t2} », faute signalée, chrono gardé` : `*** « ${t2} », erreur ${erreur}, gardé ${garde} ***`
  );

  // 3. Transformation.
  await page.getByRole("button", { name: /^(Mesures|Mensurations)$/ }).last().click();
  await page.waitForTimeout(600);
  const t3 = net(await page.locator("[data-carte-transformation]").innerText().catch(() => ""));
  console.log(
    "3. TRANSFORMATION       :",
    /Poids : 86 kg → 82,4 kg/.test(t3) && /Gras perdu : 3,2 kg/.test(t3) ? "poids 86 → 82,4 kg, 3,2 kg de gras perdus sur 90 jours" : `*** « ${t3.slice(0, 200)} » ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
