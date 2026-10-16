/**
 * Fumee : correctifs P0 de l'audit (17 octobre 2026).
 *
 *   1. Coach IA sans code d'acces : le refus du proxy (401) donne un message
 *      qui dit quoi faire ;
 *   2. code saisi dans les Reglages : « Activé pour … » ;
 *   3. Coach IA : la requete REELLEMENT envoyee porte le jeton, le regime
 *      et les allergies ; une reponse qui cite un allergene est signalee ;
 *   4. profil sans allergies renseignees : bandeau, et consigne prudente ;
 *   5. bilan hebdo : le prompt et le fichier du coach portent le programme
 *      (« x/7 respectées ») et les creneaux (« x/7 tenus »).
 *
 * Le proxy est simule : aucun appel reseau reel.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-correctifs-p0.mjs
 */

import { chromium } from "playwright";
import { appareil } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4710, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");
const JETON = "jeton-de-fumee-" + "x".repeat(30);
const PROFIL = {
  firstName: "Thomas", name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 85,
  activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, targetWeightKg: 80,
  trainingMode: "app", coachingMode: "presentiel", dietType: "vegetarien", allergies: ["arachides"]
};

async function contexte(profil, extra = () => {}) {
  const ctx = await nav.newContext({ ...appareil(), acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript(
    ({ profil, extra }) => {
      if (localStorage.getItem("coach_profile")) return;
      localStorage.setItem("coach_profile", JSON.stringify(profil));
      localStorage.setItem("coach_log_entries", "[]");
      new Function(extra)();
    },
    { profil, extra: `(${extra})()` }
  );
  return { ctx, page };
}

const ouvrirCoachIA = async (page) => {
  await page.getByRole("button", { name: /^Repas$/ }).last().click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Coach IA", exact: true }).click();
  await page.waitForTimeout(400);
};

try {
  // ── 1 à 3 ──────────────────────────────────────────────────────────
  {
    const { ctx, page } = await contexte(PROFIL);
    const requetes = [];
    await page.route("**/ai", async (route) => {
      const r = route.request();
      requetes.push({ corps: JSON.parse(r.postData()), auth: r.headers()["authorization"] || null });
      if (!r.headers()["authorization"]) {
        return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ ok: false, error: "acces-requis" }) });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: "Ce soir : 200 g de lentilles, et 30 g de beurre de cacahuète en collation." }] } }] })
      });
    });
    await page.route("**/auth/activer", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, jeton: JETON, libelle: "Thomas B." }) })
    );
    await page.goto("http://localhost:4710/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);

    await ouvrirCoachIA(page);
    await page.getByRole("button", { name: "Idée de dîner ce soir ?" }).click();
    await page.waitForTimeout(800);
    const t1 = net(await page.locator("body").innerText());
    console.log(
      "1. SANS CODE D'ACCÈS    :",
      requetes.length === 1 && /code d'accès donné par ton coach dans les Réglages/.test(t1)
        ? "refus 401 → « entre le code d'accès donné par ton coach dans les Réglages »"
        : `*** ${requetes.length} requete(s) : ${t1.slice(0, 200)} ***`
    );

    await page.locator('button[aria-label="Réglages"]').first().click();
    await page.waitForTimeout(500);
    const carte = page.locator("[data-carte-acces]");
    await carte.locator("input").fill("k7pm-q4xt");
    await carte.getByRole("button", { name: "Activer" }).click();
    await page.waitForTimeout(600);
    const t2 = net(await carte.innerText());
    const garde = await page.evaluate(() => JSON.parse(localStorage.getItem("acces_neiram") || "null"));
    console.log(
      "2. CODE ACTIVÉ          :",
      /Activé pour Thomas B\./.test(t2) && garde && garde.jeton
        ? "« Activé pour Thomas B. », jeton gardé hors sauvegarde (acces_neiram)"
        : `*** ${t2} ***`
    );
    await page.keyboard.press("Escape");
    await page.locator(".modal-panel button[aria-label]").last().click().catch(() => {});
    await page.waitForTimeout(400);

    await ouvrirCoachIA(page);
    await page.locator('input[placeholder^="Ex : je suis"]').fill("Une idée de collation ?");
    await page.getByRole("button", { name: "Envoyer", exact: true }).click();
    await page.waitForTimeout(900);
    const r = requetes.at(-1);
    const consigne = (r && r.corps.systemPrompt) || "";
    const alerte = page.locator("[data-coach-garde-fou]");
    const t3 = (await alerte.count()) ? net(await alerte.last().innerText()) : "";
    console.log(
      "3. REQUÊTE ET GARDE-FOU :",
      r && r.auth === "Bearer " + JETON &&
        /Allergies et intolérances déclarées : Arachides\./.test(consigne) &&
        /Régime : Végétarien\./.test(consigne) &&
        !/cacahu/i.test(consigne.slice(consigne.indexOf("ALIMENTS À PRIVILÉGIER"))) &&
        /cite « cacahuète », or tu as déclaré : Arachides/.test(t3)
        ? "jeton, régime et allergie dans la requête ; « cacahuète » signalé sous la réponse"
        : `*** auth ${r && r.auth}, consigne ${consigne.slice(0, 120)} ; alerte « ${t3} » ***`
    );
    await ctx.close();
  }

  // ── 4 : allergies non renseignees ──────────────────────────────────
  {
    const { allergies, ...sans } = PROFIL;
    const { ctx, page } = await contexte(sans, () => localStorage.setItem("acces_neiram", JSON.stringify({ jeton: "j".repeat(40) })));
    let consigne = "";
    await page.route("**/ai", async (route) => {
      consigne = JSON.parse(route.request().postData()).systemPrompt || "";
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candidates: [{ content: { parts: [{ text: "Dis-moi d'abord tes allergies." }] } }] }) });
    });
    await page.goto("http://localhost:4710/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await ouvrirCoachIA(page);
    const bandeau = await page.locator("[data-coach-profil-incomplet]").count();
    await page.getByRole("button", { name: "Une collation protéinée ?" }).click();
    await page.waitForTimeout(800);
    console.log(
      "4. ALLERGIES INCONNUES  :",
      bandeau === 1 && /NE SONT PAS CONNUES DE FAÇON FIABLE/.test(consigne) && !consigne.includes("ALIMENTS À PRIVILÉGIER")
        ? "bandeau affiché, consigne prudente, aucune liste d'aliments envoyée"
        : `*** bandeau ${bandeau}, consigne ${consigne.slice(0, 160)} ***`
    );
    await ctx.close();
  }

  // ── 5 : bilan hebdo, programme et creneaux ─────────────────────────
  {
    const profil = {
      ...PROFIL, coachingMode: "enligne",
      slots: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day, i) => ({ id: "c" + i, day, time: "06:00" }))
    };
    const { ctx, page } = await contexte(profil, () => {
      const auj = new Date().toISOString().slice(0, 10);
      localStorage.setItem("coach_routines", JSON.stringify([{ id: "r1", name: "Full body", exercises: [] }]));
      localStorage.setItem("cn_weekly_plan", JSON.stringify({ mon: "r1", tue: "r1", wed: "r1", thu: "r1", fri: "r1", sat: "r1", sun: "r1" }));
      localStorage.setItem("coach_sessions", JSON.stringify([{ id: "s1", date: auj, routineId: "r1", durationMin: 45, rpe: 7, exercises: [] }]));
      localStorage.setItem("coach_reports", "[]");
      localStorage.setItem("acces_neiram", JSON.stringify({ jeton: "j".repeat(40) }));
    });
    let prompt = "";
    await page.route("**/ai", async (route) => {
      prompt = JSON.parse(route.request().postData()).messages.at(-1).parts.map((p) => p.text || "").join("");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candidates: [{ content: { parts: [{ text: "RÉSUMÉ:\nSemaine correcte.\n\nÉVOLUTION:\nStable.\n\nACTIONS:\n1. Tenir le créneau" }] } }] }) });
    });
    await page.goto("http://localhost:4710/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Tendances", exact: true }).last().click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /Bilan IA/ }).click();
    await page.waitForTimeout(900);
    const [telechargement] = await Promise.all([
      page.waitForEvent("download", { timeout: 8000 }),
      page.getByRole("button", { name: /Envoyer à mon coach/ }).click()
    ]);
    const chemin = join(mkdtempSync(join(tmpdir(), "p0-")), "bilan.html");
    await telechargement.saveAs(chemin);
    const html = readFileSync(chemin, "utf8");
    const programme = prompt.match(/programme : \d+\/7 respectées[^)]*/)?.[0];
    const creneaux = prompt.match(/Créneaux du profil : \d+\/7 tenus[^\n]*/)?.[0];
    console.log(
      "5. BILAN HEBDO          :",
      programme && creneaux && /\(\d+\/7 programmées\)/.test(html) && /Créneaux tenus/.test(html)
        ? `prompt « ${programme} » et « ${creneaux} » ; fichier du coach avec programme et créneaux`
        : `*** programme « ${programme} », créneaux « ${creneaux} », fichier ${/programmées/.test(html)} ***`
    );
    await ctx.close();
  }
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
