/**
 * Fumée : les nombres des rappels nutrition et hydratation (28 octobre 2026).
 *
 * Le rappel nutrition affichait « Nutrition : NaN / 3010 kcal — il te reste
 * NaN kcal (P NaN g · G NaN g · L NaN g) » : le rappel et totauxDuJour ne
 * nommaient pas leurs champs pareil. La fumée précédente (rappels-alertes)
 * montrait les messages sans les vérifier.
 *
 *   1. nutrition : 900 kcal notées → pas de NaN, « il te reste R kcal » avec
 *      R = objectif − 900, et le même R que la carte « Aujourd'hui » ;
 *   2. hydratation : 0,75 L bus sur 2,5 L → « il te reste 1,75 L », le même
 *      reste que la carte Eau du Journal.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-rappels-nombres.mjs
 */

import { chromium } from "playwright";
import { appareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4736;
const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const serveur = createServer((req, res) => {
  const chemin = req.url.split("?")[0];
  const c = join(DIST, chemin === "/" ? "index.html" : chemin);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(PORT, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();

/** Ouvre l'app un mardi 8 septembre 2026 à 14 h, avec ce profil et ces données. */
async function ouvrir({ rappels, eau = 0, repas = [] }) {
  const ctx = await nav.newContext(appareil());
  await ctx.addInitScript(sansAides);
  await ctx.addInitScript(({ rappels, eau, repas }) => {
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
    localStorage.setItem("cn_synchro_locale", "1");
    localStorage.setItem("coach_profile", JSON.stringify({
      name: "Thomas", sex: "homme", age: 30, heightCm: 180, startWeightKg: 80,
      activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3, targetWaterL: 2.5,
      trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: [],
      ...rappels
    }));
    localStorage.setItem("coach_daily_form", JSON.stringify(eau ? [{ date: "2026-09-08", waterMl: eau }] : []));
    localStorage.setItem("coach_log_entries", JSON.stringify(repas));
  }, { rappels, eau, repas });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  // Un seul emplacement de toast : on relève ce qui s'y affiche pendant 2,5 s.
  const vus = new Set();
  for (let i = 0; i < 25; i++) {
    if (await page.locator(".toast").count()) vus.add(net(await page.locator(".toast").first().innerText()).replace(/ Fermer$/, ""));
    await page.waitForTimeout(100);
  }
  return { ctx, page, messages: [...vus] };
}

try {
  // 1. Nutrition : 620 + 280 = 900 kcal notées.
  {
    const repas = [
      { id: "l1", date: "2026-09-08", mealType: "dejeuner", name: "Poulet riz", calories: 620, protein: 48, carbs: 70, fat: 12 },
      { id: "l2", date: "2026-09-08", mealType: "gouter", name: "Skyr", calories: 280, protein: 20, carbs: 30, fat: 8 }
    ];
    const { ctx, page, messages } = await ouvrir({ rappels: { nutritionRemindersEnabled: true }, repas });
    const m = messages.find((t) => /^Nutrition :/.test(t)) || "";
    const re = /^Nutrition : (\d+) \/ (\d+) kcal — il te reste (-?\d+) kcal \(P (\d+) g · G (\d+) g · L (\d+) g\) aujourd'hui\./;
    const x = m.match(re);
    const carte = net(await page.locator('[data-ligne="nutrition"]').innerText().catch(() => ""));
    const resteCarte = (carte.match(/Encore (\d+) kcal/) || [])[1];
    const ok = x && !/NaN/.test(m) && +x[1] === 900 && +x[3] === +x[2] - 900 && resteCarte === x[3];
    console.log(
      "1. RAPPEL NUTRITION     :",
      ok ? `« ${m.slice(0, 90)}… » : reste ${x[3]} kcal, identique à la carte « Aujourd'hui »` : `*** « ${m}» · carte « ${carte} » · vus ${JSON.stringify(messages)} ***`
    );
    await ctx.close();
  }
  // 2. Hydratation : 750 ml sur 2,5 L.
  {
    const { ctx, page, messages } = await ouvrir({ rappels: { hydrationRemindersEnabled: true }, eau: 750 });
    const m = messages.find((t) => /^Hydratation :/.test(t)) || "";
    const ok = /^Hydratation : 0[,.]75 L \/ 2[,.]5 L — il te reste 1[,.]75 L à boire aujourd'hui\./.test(m) && !/NaN/.test(m);
    const corps = net(await page.locator("body").innerText());
    const carteEau = /Reste 1[,.]75 L/.test(corps);
    console.log(
      "2. RAPPEL HYDRATATION   :",
      ok && carteEau ? `« ${m.slice(0, 80)}… » : reste 1,75 L, identique à la carte Eau` : `*** « ${m}» · carte Eau ${carteEau} · vus ${JSON.stringify(messages)} ***`
    );
    await ctx.close();
  }
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
