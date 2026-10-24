/**
 * Fumee : type de serie en mode Force (retour client du 18 octobre 2026).
 *
 * Une cliente voyait « Top set » et « Back-off » sur ses exercices sans les
 * avoir choisis, et ne pouvait pas les retirer : le menu « Type de série »
 * de l'ancienne application n'avait pas ete repris.
 *
 *   1. une seance enregistree avec « Top set » et « Back-off » les affiche ;
 *   2. en la modifiant, le menu « Type de série » propose « Aucun type » ;
 *   3. apres « Aucun type » et enregistrement, l'historique n'affiche plus
 *      ni « Top set » ni « Back-off », series et RPE intacts.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-type-serie.mjs
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
await new Promise((r) => serveur.listen(4712, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  const auj = new Date().toISOString().slice(0, 10);
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Sabine", name: "Sabine", sex: "femme", age: 40, heightCm: 165, startWeightKg: 62,
    activityLevel: "modere", goal: "performance", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_routines", JSON.stringify([{ id: "r1", name: "SBD", color: "#F5A040", exercises: [] }]));
  localStorage.setItem("coach_sessions", JSON.stringify([{
    id: "s1", date: auj, routineId: "r1", durationMin: 60, rpe: 7, notes: "", pains: [],
    exercises: [
      { id: "e1", name: "Comp Squat", mode: "powerlifting", setType: "top", sets: 1, reps: 1, rpe: 6, weight: "" },
      { id: "e2", name: "Comp Squat", mode: "powerlifting", setType: "backoff", sets: 1, reps: 1, weight: "" },
      { id: "e3", name: "Comp bench", mode: "powerlifting", sets: 1, reps: 1, rpe: 6, weight: "" }
    ]
  }]));
});

try {
  await page.goto("http://localhost:4712/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^(Séances|Entraînements)$/ }).last().click();
  await page.waitForTimeout(600);

  const historique = async () => net(await page.locator("body").innerText());
  const t1 = await historique();
  console.log(
    "1. AVANT                :",
    /Top set — 1×1/.test(t1) && /Back-off — 1×1/.test(t1) ? "« Top set » et « Back-off » affichés" : `*** ${t1.slice(0, 200)} ***`
  );

  // Crayon de la carte de la seance, dans l'historique.
  const ouvert = await page.evaluate(() => {
    const ligne = [...document.querySelectorAll("div")].find((d) => /Back-off — 1×1/.test(d.innerText || "") && d.querySelectorAll("button").length >= 2 && d.innerText.length < 600);
    const bouton = ligne && ligne.querySelector("button");
    if (bouton) bouton.click();
    return Boolean(bouton);
  });
  await page.waitForTimeout(600);
  const menus = page.locator("select").filter({ has: page.locator('option[value="backoff"]') });
  const nb = await menus.count();
  const valeurs = [];
  for (let i = 0; i < nb; i++) valeurs.push(await menus.nth(i).inputValue());
  const libelleVide = nb ? await menus.first().locator('option[value=""]').innerText() : "";
  console.log(
    "2. MENU TYPE DE SÉRIE   :",
    ouvert && nb === 3 && valeurs.join(",") === "top,backoff," && libelleVide === "Aucun type"
      ? "3 menus (top, back-off, aucun), « Aucun type » proposé"
      : `*** ouvert ${ouvert}, ${nb} menu(s), valeurs ${valeurs.join(",")}, « ${libelleVide} » ***`
  );

  for (let i = 0; i < nb; i++) await menus.nth(i).selectOption("");
  await page.getByRole("button", { name: /^Enregistrer( la séance)?$/ }).last().click();
  await page.waitForTimeout(700);
  const t3 = await historique();
  const stocke = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_sessions") || "[]")[0]);
  const exos = (stocke && stocke.exercises) || [];
  console.log(
    "3. APRÈS « AUCUN TYPE » :",
    !/Top set|Back-off/.test(t3) && /1×1 · RPE 6/.test(t3) && exos.length === 3 && exos.every((e) => !e.setType)
      ? "plus d'étiquette, séries et RPE intacts, rien d'enregistré comme type"
      : `*** ${exos.map((e) => e.setType).join(",")} : ${t3.slice(0, 200)} ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
