/**
 * Fumee : le mot du coach, en haut du Journal.
 *
 *   1. client regulier : une phrase de la liste standard, celle du jour ;
 *   2. semaine declaree difficile : une phrase « semaine difficile » ;
 *   3. semaine precedente non tenue : une phrase de reprise ;
 *   4. sur un jour passe, pas de phrase (comme le message d'encouragement).
 * La phrase attendue est calculee par lib/mot-du-coach.js, la meme que
 * l'application.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-mot-du-coach.mjs
 */

import { chromium } from "playwright";
import { appareil } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { motDuCoach } from "../app/src/lib/mot-du-coach.js";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4648, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];
const d = new Date();
const AUJ = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Journal ouvert avec un historique relatif au lundi de la semaine en cours. */
async function ouvrir({ semaines, difficiles = [] }) {
  const ctx = await nav.newContext(appareil("Pixel 7"));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript(
    ({ semaines, difficiles }) => {
      if (localStorage.getItem("coach_profile")) return;
      const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
      const auj = new Date();
      const lundi = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - ((auj.getDay() + 6) % 7));
      const jour = (semaine, j) => iso(new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + semaine * 7 + j));
      localStorage.setItem("coach_profile", JSON.stringify({
        firstName: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 88,
        activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, targetWeightKg: 80,
        trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
      }));
      const seances = [];
      for (const [decalage, n] of Object.entries(semaines)) {
        for (let i = 0; i < n; i++) seances.push({ id: `s${decalage}_${i}`, date: jour(Number(decalage), i * 2), name: "Séance", exercises: [] });
      }
      localStorage.setItem("coach_sessions", JSON.stringify(seances));
      localStorage.setItem(
        "cn_hard_weeks",
        JSON.stringify(Object.fromEntries(difficiles.map((k) => [jour(k, 0), { active: true, reason: "enfant malade" }])))
      );
    },
    { semaines, difficiles }
  );
  await page.goto("http://localhost:4648/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  return { ctx, page };
}

async function verifier(numero, libelle, options, contexte) {
  const { ctx, page } = await ouvrir(options);
  const bloc = page.locator("[data-mot-du-coach]");
  const present = await bloc.count();
  const lu = present ? await bloc.getAttribute("data-contexte") : null;
  const texte = present ? (await bloc.innerText()).replace(/\s+/g, " ") : "";
  const attendu = motDuCoach({ date: AUJ, contexte }).texte;
  console.log(
    `${numero}. ${libelle.padEnd(21)}:`,
    lu === contexte && texte.includes(attendu) ? `« ${attendu} »` : `*** contexte ${lu}, texte « ${texte} », attendu « ${attendu} » ***`
  );
  return { ctx, page, bloc };
}

try {
  // Regulier : 4 semaines tenues, 1 seance cette semaine (le lundi).
  {
    const { ctx, page, bloc } = await verifier("1", "STANDARD", { semaines: { "-4": 3, "-3": 3, "-2": 3, "-1": 3, 0: 1 } }, "standard");
    // Jour precedent : deuxieme bouton avant la phrase (‹ date ›).
    await bloc.locator("xpath=preceding::button[2]").click();
    await page.waitForTimeout(500);
    const restant = await page.locator("[data-mot-du-coach]").count();
    const ailleurs = (await page.locator("body").innerText()).includes("Aujourd'hui");
    console.log("4. JOUR PASSÉ            :", restant === 0 && ailleurs ? "pas de phrase sur la veille" : `*** ${restant} phrase(s), navigation ${ailleurs} ***`);
    await ctx.close();
  }
  {
    const { ctx } = await verifier("2", "SEMAINE DIFFICILE", { semaines: { "-2": 3, "-1": 3, 0: 1 }, difficiles: [0] }, "difficile");
    await ctx.close();
  }
  {
    const { ctx } = await verifier("3", "REPRISE", { semaines: { "-3": 3, "-2": 3, "-1": 1 } }, "reprise");
    await ctx.close();
  }
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
