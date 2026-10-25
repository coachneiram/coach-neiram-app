/**
 * Fumée : carte « Aujourd'hui » en haut du Journal (25 octobre 2026, idée
 * reprise de Fallen).
 *
 *   1. la carte est la première du Journal, avec ses trois lignes ;
 *   2. « Noter un repas » ouvre l'ajout d'un aliment ;
 *   3. « Commencer » ouvre la séance prévue dans l'onglet Séances ;
 *   4. séance faite et bilan envoyé : lignes passées à « fait », sans bouton ;
 *   5. un autre jour que celui d'aujourd'hui : pas de carte.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-aujourdhui.mjs
 */

import { chromium } from "playwright";
import { appareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4734;
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
const ctx = await nav.newContext(appareil());
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");
const BASE = `http://localhost:${PORT}/`;

await page.route("**/coach-sync", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  // Jour du plan calculé comme l'app (date UTC du jour, lue en local).
  const ids = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const jour = ids[(new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getDay() + 6) % 7];
  localStorage.setItem("cn_synchro_locale", "1");
  localStorage.setItem("coach_profile", JSON.stringify({
    name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 80,
    activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_routines", JSON.stringify([
    { id: "r1", name: "Haut du corps", color: "#F5A040", programme: true, exercises: [{ name: "Développé couché", series: [{ weight: "40", reps: "10", rpe: "" }] }] }
  ]));
  localStorage.setItem("cn_weekly_plan", JSON.stringify({ [jour]: "r1" }));
});

const carte = () => page.locator('[data-carte="aujourdhui"]');
const ligne = (id) => carte().locator(`[data-ligne="${id}"]`);
const ongletActif = async () => net(await page.locator("button.active").first().innerText().catch(() => ""));
const ouvrir = async () => {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
};

try {
  // 1. Carte en tête du Journal.
  await ouvrir();
  const lignes = await carte().locator("[data-ligne]").evaluateAll((els) => els.map((e) => e.dataset.ligne + ":" + e.dataset.etat));
  const premiere = await page.evaluate(() => {
    const c = document.querySelector('[data-carte="aujourdhui"]');
    const m = [...document.querySelectorAll("*")].find((e) => /Le mot du coach/i.test(e.textContent || "") && e.children.length === 0);
    return !!c && (!m || c.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING) ? true : false;
  });
  const texte = net(await carte().innerText().catch(() => ""));
  console.log(
    "1. CARTE AUJOURD'HUI    :",
    premiere && lignes.join(",") === "entrainement:a-faire,nutrition:vide,bilan:" + (await ligne("bilan").getAttribute("data-etat")) && /Haut du corps/.test(texte)
      ? `en tête du Journal (${lignes.join(", ")})`
      : `*** en tête ${premiere}, lignes ${lignes.join(",")}, « ${texte.slice(0, 120)} » ***`
  );

  // 2. Noter un repas.
  await ligne("nutrition").locator("button").click();
  await page.waitForTimeout(500);
  const ajout = net(await page.locator(".modal-panel").last().innerText().catch(() => ""));
  console.log("2. NOTER UN REPAS       :", /Ajouter —/i.test(ajout) ? "ajout d'aliment ouvert" : `*** « ${ajout.slice(0, 80)} » ***`);
  await page.locator(".modal-panel").last().getByRole("button", { name: "Fermer" }).first().click();
  await page.waitForTimeout(400);

  // 3. Commencer la séance.
  await ligne("entrainement").locator("button").click();
  await page.waitForTimeout(1000);
  const seance = net(await page.locator(".modal-panel").last().innerText().catch(() => ""));
  const onglet = await ongletActif();
  console.log(
    "3. COMMENCER            :",
    /Haut du corps/i.test(seance) && /Séances|Entraînements/.test(onglet) ? "séance prévue ouverte dans Séances" : `*** onglet « ${onglet} », « ${seance.slice(0, 80)} » ***`
  );
  await page.evaluate(() => localStorage.removeItem("brouillon_seance_neiram"));

  // 4. Séance faite et bilan envoyé.
  await page.evaluate(() => {
    const d = new Date().toISOString().slice(0, 10);
    const lundi = new Date(d + "T00:00:00");
    lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
    const p = (n) => String(n).padStart(2, "0");
    localStorage.setItem("coach_report_last_sent", JSON.stringify(`${lundi.getFullYear()}-${p(lundi.getMonth() + 1)}-${p(lundi.getDate())}`));
    localStorage.setItem("coach_sessions", JSON.stringify([{ id: "s1", date: d, routineId: "r1", routineName: "Haut du corps", exercises: [] }]));
  });
  await ouvrir();
  const etats = await carte().locator("[data-ligne]").evaluateAll((els) => els.map((e) => e.dataset.ligne + ":" + e.dataset.etat));
  const boutons = await ligne("entrainement").locator("button").count() + (await ligne("bilan").locator("button").count());
  console.log(
    "4. FAIT                 :",
    etats.includes("entrainement:fait") && etats.includes("bilan:fait") && boutons === 0 ? "séance faite et bilan envoyé, sans bouton" : `*** ${etats.join(",")}, ${boutons} bouton(s) ***`
  );

  // 5. Autre jour : pas de carte.
  // Flèche « jour précédent » du sélecteur de date, juste avant la carte.
  await page.evaluate(() => document.querySelector('[data-carte="aujourdhui"]').previousElementSibling.querySelector("button").click());
  await page.waitForTimeout(400);
  const hier = await carte().count();
  console.log("5. AUTRE JOUR           :", hier === 0 ? "pas de carte la veille" : `*** ${hier} carte(s) la veille ***`);
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
