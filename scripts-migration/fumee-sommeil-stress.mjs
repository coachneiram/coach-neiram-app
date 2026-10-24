/**
 * Fumée : sommeil et stress d'après les études (24 octobre 2026).
 *
 *   1. client en ligne, stress à 9/10 depuis 7 jours : le coach reçoit une
 *      seule alerte « alerte_sommeil_stress », et le client un message ;
 *   2. onglet Sommeil : « Quand en parler à un médecin » signale le stress,
 *      dit que le coach est prévenu, et montre le 3114 ;
 *   3. régularité du lever (± min sur 14 jours) ;
 *   4. respiration guidée : « Commencer » affiche la première phase ;
 *   5. bibliothèque des preuves : un conseil s'ouvre sur ses sources.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-sommeil-stress.mjs
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
await new Promise((r) => serveur.listen(4721, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");

// Proxy simule : il accepte tout.
const recus = [];
await page.route("**/coach-sync", async (route) => {
  try {
    recus.push(JSON.parse(route.request().postData() || "{}"));
  } catch (e) {
    recus.push({});
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
});

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("cn_synchro_locale", "1"); // /coach-sync est intercepte ici
  localStorage.setItem("coach_profile", JSON.stringify({
    name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 80,
    activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
  }));
  const jour = (k) => {
    const d = new Date();
    d.setDate(d.getDate() - k);
    return d.toISOString().slice(0, 10);
  };
  const levers = ["07:00", "07:30", "06:30", "07:00", "07:10", "06:50", "07:00"];
  localStorage.setItem("coach_daily_form", JSON.stringify(
    levers.map((w, k) => ({ id: "f" + k, date: jour(k), stress: 9, sleepQuality: 3, bedTime: "23:00", wakeTime: w, sleepHours: 8 }))
  ));
});

try {
  await page.goto("http://localhost:4721/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // 1. Alerte au coach.
  const alertes = recus.filter((e) => e.type === "alerte_sommeil_stress");
  const toast = /Ton coach a été prévenu de tes nuits ou de ton stress/.test(net(await page.locator("body").innerText()));
  console.log(
    "1. ALERTE AU COACH      :",
    alertes.length === 1 && /Stress très élevé/.test(alertes[0].message || "")
      ? `une alerte reçue (« ${alertes[0].message} »)${toast ? ", message au client" : ""}`
      : `*** ${alertes.length} alerte(s) sur ${recus.length} envoi(s) : ${JSON.stringify(recus.map((e) => e.type))} ***`
  );

  await page.getByRole("button", { name: "Sommeil", exact: true }).last().click();
  await page.waitForTimeout(700);

  // 2. Quand consulter.
  const carte = page.locator("[data-alertes-sommeil-stress]");
  const t2 = net(await carte.innerText().catch(() => ""));
  console.log(
    "2. QUAND CONSULTER      :",
    (await carte.locator('[data-alerte="R03"]').count()) === 1 && /Ton coach est prévenu/.test(t2) && /3114/.test(t2)
      ? "stress signalé, « Ton coach est prévenu », 3114 visible"
      : `*** « ${t2.slice(0, 200)} » ***`
  );

  // 3. Regularite.
  const t3 = net(await page.locator("[data-regularite-sommeil]").innerText().catch(() => ""));
  console.log("3. RÉGULARITÉ           :", /± \d+ min \(7 levers notés sur 14 jours\)/.test(t3) ? t3.replace(/^RÉGULARITÉ DE TON SOMMEIL\s*/i, "").slice(0, 80) : `*** « ${t3} » ***`);

  // 4. Respiration.
  await page.locator("[data-respiration]").getByRole("button", { name: "Commencer (5 min)" }).click();
  await page.waitForTimeout(400);
  const phase = net(await page.locator("[data-phase-respiration]").innerText().catch(() => ""));
  await page.locator("[data-respiration]").getByRole("button", { name: "Arrêter" }).click();
  console.log("4. RESPIRATION          :", phase === "Inspire par le nez" ? "« Inspire par le nez », puis arrêt" : `*** « ${phase} » ***`);

  // 5. Bibliotheque.
  await page.locator('[data-theme-preuves="alerte"]').click();
  await page.waitForTimeout(200);
  const preuve = page.locator("[data-bibliotheque-preuves] [data-preuve]").first();
  await preuve.locator("button").click();
  await page.waitForTimeout(200);
  const t5 = net(await preuve.innerText());
  console.log("5. PREUVES              :", /Sources : /.test(t5) && /Niveau de preuve : /.test(t5) ? "un conseil « Quand consulter » s'ouvre sur son niveau et ses sources" : `*** « ${t5.slice(0, 160)} » ***`);
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
