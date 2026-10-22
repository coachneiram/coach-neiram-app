/**
 * Fumee : carnet d'entrainement, saisie serie par serie (22 octobre 2026).
 *
 *   1. une seance type deja faite se rouvre avec « Dernière fois » et les
 *      series de la derniere fois, charge proposee posee sur les series
 *      lourdes ;
 *   2. « + Série » ajoute une ligne, pre-remplie ;
 *   3. cocher une serie lance le repos (90 s par defaut), -15 s / +15 s /
 *      Passer marchent, et le repos regle a 30 s arrive a « Repos terminé » ;
 *   4. l'application rechargee en pleine seance la rouvre telle quelle ;
 *   5. a l'enregistrement, l'historique ecrit les series une a une, et
 *      l'exercice a l'ancien format reste a l'ancien format.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-carnet-series.mjs
 */

import { chromium } from "playwright";
import { appareil } from "./appareil.mjs";
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
await new Promise((r) => serveur.listen(4714, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const ilYa7 = d.toISOString().slice(0, 10);
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Sabine", name: "Sabine", sex: "femme", age: 40, heightCm: 165, startWeightKg: 62,
    activityLevel: "modere", goal: "forme", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_routines", JSON.stringify([{ id: "r1", name: "Bas du corps", color: "#F5A040" }]));
  localStorage.setItem("coach_sessions", JSON.stringify([{
    id: "s1", date: ilYa7, routineId: "r1", durationMin: 60, rpe: 7, notes: "", pains: [],
    exercises: [
      {
        id: "e1", name: "Squat", mode: "muscu", sets: "3", reps: "6", weight: "62.5", rpe: "7",
        series: [
          { weight: "60", reps: "8", rpe: "" },
          { weight: "62.5", reps: "8", rpe: "" },
          { weight: "62.5", reps: "6", rpe: "7" }
        ]
      },
      { id: "e2", name: "Fentes", mode: "muscu", sets: "3", reps: "10", weight: "20", rpe: "" }
    ]
  }]));
});

/** Etat des lignes de series du premier exercice (Squat). */
const lignesSquat = () =>
  page.evaluate(() => {
    const champ = [...document.querySelectorAll('input[placeholder="Exercice"]')].find((x) => x.value === "Squat");
    const carte = champ && champ.closest("[data-exercice]");
    if (!carte) return null;
    const charges = [...carte.querySelectorAll('input[type="number"][step="0.5"]:not([max])')].map((x) => x.value);
    const reps = [...carte.querySelectorAll('input[inputmode="numeric"]')].map((x) => x.value);
    const faits = [...carte.querySelectorAll('[aria-label="Série faite"]')].map((x) => x.getAttribute("aria-pressed"));
    return { texte: carte.innerText, charges, reps, faits };
  });

try {
  await page.goto("http://localhost:4714/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^(Séances|Entraînements)$/ }).last().click();
  await page.waitForTimeout(600);

  // 1. Demarrer la seance type depuis sa carte.
  await page.getByText("Bas du corps", { exact: true }).first().click();
  await page.waitForTimeout(600);
  const l1 = await lignesSquat();
  const t1 = l1 ? net(l1.texte) : "";
  console.log(
    "1. DERNIÈRE FOIS        :",
    l1 && /Dernière fois \([^)]+\) : 60×8 · 62\.5×8 · 62\.5×6 kg · RPE 7/.test(t1) && l1.charges.join(",") === "60,65,65" && l1.reps.join(",") === "8,8,6"
      ? "séries de la dernière fois reprises, 62,5 → 65 sur les séries lourdes"
      : `*** ${JSON.stringify(l1 && { charges: l1.charges, reps: l1.reps })} ${t1.slice(0, 200)} ***`
  );

  // 2. Ajouter une serie, puis la passer a 4 repetitions.
  await page.getByRole("button", { name: "+ Série" }).first().click();
  await page.waitForTimeout(200);
  const repsQuatre = page.locator('input[inputmode="numeric"]').nth(3);
  await repsQuatre.fill("4");
  const l2 = await lignesSquat();
  console.log(
    "2. + SÉRIE              :",
    l2 && l2.charges.join(",") === "60,65,65,65" && l2.reps.join(",") === "8,8,6,4"
      ? "4e série ajoutée (65 kg reprise), passée à 4 reps"
      : `*** ${JSON.stringify(l2)} ***`
  );

  // 3. Cocher la premiere serie : repos de 90 s.
  await page.locator('[aria-label="Série faite"]').first().click();
  await page.waitForTimeout(400);
  const minuteur = page.locator('[role="timer"]');
  const c1 = net(await minuteur.innerText().catch(() => ""));
  await page.getByRole("button", { name: "+15 s" }).click();
  await page.waitForTimeout(300);
  const c2 = net(await minuteur.innerText().catch(() => ""));
  await page.getByRole("button", { name: "Passer" }).click();
  await page.waitForTimeout(300);
  const disparu = (await minuteur.count()) === 0;
  const chrono = (t) => {
    const m = t.match(/(\d+):(\d\d)/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
  };
  console.log(
    "3a. REPOS 90 S          :",
    chrono(c1) >= 88 && chrono(c1) <= 90 && chrono(c2) >= 102 && disparu
      ? `démarré à ${c1.match(/\d+:\d\d/)[0]}, +15 s → ${c2.match(/\d+:\d\d/)[0]}, Passer le ferme`
      : `*** « ${c1} » puis « ${c2} », fermé : ${disparu} ***`
  );

  // Repos regle a 30 s, puis -15 s deux fois : la fin arrive.
  await page.getByLabel("Temps de repos entre les séries").first().selectOption("30");
  await page.locator('[aria-label="Série faite"]').nth(1).click();
  await page.waitForTimeout(300);
  const c3 = net(await minuteur.innerText().catch(() => ""));
  await page.getByRole("button", { name: "−15 s" }).click();
  await page.getByRole("button", { name: "−15 s" }).click();
  await page.waitForTimeout(600);
  const c4 = net(await minuteur.innerText().catch(() => ""));
  console.log(
    "3b. REPOS RÉGLÉ À 30 S  :",
    chrono(c3) >= 28 && chrono(c3) <= 30 && /Repos terminé/i.test(c4)
      ? `démarré à ${c3.match(/\d+:\d\d/)[0]}, « Repos terminé » à la fin`
      : `*** « ${c3} » puis « ${c4} » ***`
  );

  // 4. Application rechargee en pleine seance.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /^(Séances|Entraînements)$/ }).last().click().catch(() => {});
  await page.waitForTimeout(500);
  const l4 = await lignesSquat();
  console.log(
    "4. RECHARGEMENT         :",
    l4 && l4.reps.join(",") === "8,8,6,4" && l4.faits.join(",") === "true,true,false,false"
      ? "séance rouverte telle quelle, deux séries cochées"
      : `*** ${JSON.stringify(l4)} ***`
  );

  // 5. Enregistrer.
  await page.getByRole("button", { name: /^Enregistrer la séance$/ }).click();
  await page.waitForTimeout(800);
  const t5 = net(await page.locator("body").innerText());
  const stockees = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_sessions") || "[]"));
  const brouillon = await page.evaluate(() => localStorage.getItem("brouillon_seance_neiram"));
  const nouvelle = stockees.find((s) => s.id !== "s1") || {};
  const squat = (nouvelle.exercises || []).find((e) => e.name === "Squat") || {};
  const fentes = (nouvelle.exercises || []).find((e) => e.name === "Fentes") || {};
  console.log(
    "5. HISTORIQUE           :",
    /60×8 · 65×8 · 65×6 · 65×4 kg/.test(t5) &&
      /3×10 @ 20 kg/.test(t5) &&
      squat.sets === "4" &&
      squat.weight === "65" &&
      (squat.series || []).every((x) => !("fait" in x)) &&
      !("series" in fentes) &&
      brouillon === null
      ? "séries écrites une à une, Fentes à l'ancien format, coches et brouillon effacés"
      : `*** ${JSON.stringify({ squat, fentes, brouillon })} ${t5.slice(0, 200)} ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
