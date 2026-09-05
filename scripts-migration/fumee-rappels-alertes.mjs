/**
 * Fumee ciblee : les rappels client et les alertes coach.
 *
 * DERNIER BLOC NON PORTE de la bascule : l'ecran Reglages proposait les
 * interrupteurs et les horaires, et il n'y avait rien derriere — ni
 * setInterval, ni Notification, ni alerte coach.
 *
 * Ce script fige l'horloge, pose un profil en coaching en ligne avec des
 * creneaux manques, intercepte la synchro coach, et verifie que la
 * banniere d'hydratation s'affiche et que l'alerte part vers le coach.
 *
 *   cd app && npm run build && cd ..
 *   npm i --no-save playwright
 *   node scripts-migration/fumee-rappels-alertes.mjs
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
await new Promise((r) => serveur.listen(4606, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await nav.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message));

// La synchro coach est interceptee : rien ne part reellement.
const versLeCoach = [];
await page.route("**/coach-sync", async (route) => {
  versLeCoach.push(JSON.parse(route.request().postData()));
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
});

// Mardi 8 septembre 2026, 14 h : dans la plage d'hydratation.
await page.addInitScript(() => {
  const fige = new Date(2026, 8, 8, 14, 0, 0).getTime();
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
    targetWeightKg: 66, trainingMode: "app", coachingMode: "en_ligne",
    coachSyncUrl: "https://coach-neiram-proxy.pelissier-marien.workers.dev",
    dietType: "aucun", allergies: [], targetWaterL: 2,
    hydrationRemindersEnabled: true,
    nutritionRemindersEnabled: true,
    slots: [{ id: "c1", day: "tue", time: "18:30" }, { id: "c2", day: "fri", time: "18:30" }]
  }));
  // Deux creneaux passes sans seance : de quoi declencher l'alerte coach.
  localStorage.setItem("coach_sessions", JSON.stringify([]));
  localStorage.setItem("coach_daily_form", JSON.stringify([{ date: "2026-09-08", waterMl: 500 }]));
  localStorage.setItem("coach_log_entries", JSON.stringify([]));
});

await page.goto("http://localhost:4606/", { waitUntil: "networkidle" });
// Il n'y a qu'un emplacement de toast, comme dans l'application
// d'origine : le dernier message remplace le precedent. On les collecte
// donc au fil de l'eau plutot qu'a un instant donne.
const vus = new Set();
for (let i = 0; i < 20; i++) {
  if (await page.locator(".toast").count()) {
    vus.add((await page.locator(".toast").first().innerText()).replace(/\n/g, " ").trim());
  }
  await page.waitForTimeout(100);
}
const messages = [...vus];
// Le rappel d'hydratation part aussi ici, mais l'alerte coach le
// remplace en moins de 100 ms : c'est le second scenario qui le montre.
// Ce qui compte ici, c'est que son etat soit ecrit.
for (const t of messages) console.log("  toast :", t.replace(/ Fermer$/, ""));
console.log("ETAT NOTE", await page.evaluate(() => localStorage.getItem("coach_hydration_state")));

// Deuxieme ouverture : l'intervalle n'est pas ecoule, pas de repetition.
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1000);
console.log("2e OUVERTURE", /Hydratation :.*il te reste/.test(await page.locator("body").innerText()) ? "RAPPEL REPETE" : "pas de repetition");

console.log("VERS LE COACH", versLeCoach.length, "evenement(s)");
for (const e of versLeCoach) console.log("  -", e.type, "|", e.message);
console.log("ETAT ALERTE", await page.evaluate(() => localStorage.getItem("cn_coach_alert_state")));
// ── Second scenario : client en presentiel, sans alerte coach pour
// masquer le rappel. C'est le seul moyen de voir la banniere seule.
const page2 = await nav.newPage();
const erreurs2 = [];
page2.on("pageerror", (e) => erreurs2.push("pageerror: " + e.message));
await page2.addInitScript(() => {
  const fige = new Date(2026, 8, 8, 14, 0, 0).getTime();
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
    firstName: "Tristan", sex: "homme", age: 30, heightCm: 180, startWeightKg: 78,
    activityLevel: "modere", goal: "prise", sessionsPerWeek: 4, targetWeightKg: 82,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: [],
    targetWaterL: 2, hydrationRemindersEnabled: true
  }));
  localStorage.setItem("coach_daily_form", JSON.stringify([{ date: "2026-09-08", waterMl: 500 }]));
});
await page2.goto("http://localhost:4606/", { waitUntil: "networkidle" });
await page2.waitForTimeout(600);
const t2 = (await page2.locator(".toast").count())
  ? (await page2.locator(".toast").first().innerText()).replace(/\n/g, " ").replace(/ Fermer$/, "").trim()
  : "(aucun toast)";
console.log("");
console.log("PRESENTIEL — RAPPEL SEUL", /Hydratation :.*il te reste/.test(t2) ? "banniere affichee" : "ABSENTE");
console.log("  toast :", t2);

console.log("ERREURS", [...erreurs, ...erreurs2].length ? JSON.stringify([...erreurs, ...erreurs2], null, 1) : "aucune");

await nav.close();
serveur.close();
