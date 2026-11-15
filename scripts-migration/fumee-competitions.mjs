/**
 * Fumée : « Mes compétitions » (15 novembre 2026).
 *
 *   1. Force athlétique : une compétition notée garde son historique, donne
 *      son total, et ne met à jour que le squat (le seul résultat meilleur) ;
 *   2. un nom manquant et un résultat illisible sont signalés, rien n'est
 *      enregistré ;
 *   3. la compétition survit à un rechargement ;
 *   4. course : un 10 km en compétition met à jour le chrono et le marque
 *      « fait en compétition » ;
 *   5. la suppression demande une confirmation et ne touche pas aux records.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-competitions.mjs
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
await new Promise((r) => serveur.listen(4750, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Sabine", name: "Sabine", sex: "femme", age: 42, heightCm: 168, startWeightKg: 72,
    activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
});

const aller = async () => {
  await page.goto("http://localhost:4750/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /^(Séances|Entraînements)$/ }).last().click();
  await page.waitForTimeout(600);
};

try {
  await aller();
  const carte = page.locator("[data-carte-performances]");
  const comps = carte.locator("[data-competitions]");
  for (const [id, v] of [["squat", "110"], ["bench", "70"], ["deadlift", "147.5"]]) await carte.locator(`[data-perf="pl_${id}"]`).fill(v);
  await page.waitForTimeout(300);

  // 1. Une compétition de force.
  await comps.getByRole("button", { name: "Ajouter une compétition" }).click();
  await comps.locator("[data-comp-nom]").fill("Championnat régional");
  await comps.locator("[data-comp-date]").fill("2026-10-12");
  await comps.locator('[data-comp-champ="squat"]').fill("115");
  await comps.locator('[data-comp-champ="bench"]').fill("70");
  await comps.locator('[data-comp-champ="deadlift"]').fill("147,5");
  await comps.getByRole("button", { name: "Enregistrer la compétition" }).click();
  await page.waitForTimeout(300);
  const ligne = net(await comps.locator("[data-comp-ligne]").first().innerText().catch(() => ""));
  const message = net(await comps.locator("[data-comp-message]").innerText().catch(() => ""));
  const squat = await carte.locator('[data-perf="pl_squat"]').inputValue();
  const bench = await carte.locator('[data-perf="pl_bench"]').inputValue();
  console.log(
    "1. COMPÉTITION FORCE    :",
    /^12\/10\/2026 · Championnat régional Squat 115 kg · Développé couché 70 kg · Soulevé de terre 147,5 kg Total 332,5 kg/.test(ligne) &&
      /Squat 110 kg → 115 kg/.test(message) &&
      !/Développé couché/.test(message) &&
      squat === "115" &&
      bench === "70"
      ? "historique, total 332,5 kg, seul le squat (110 → 115) mis à jour"
      : `*** ligne « ${ligne} » message « ${message} » squat ${squat} dc ${bench} ***`
  );

  // 2. Refus.
  await comps.getByRole("button", { name: "Ajouter une compétition" }).click();
  await comps.locator('[data-comp-champ="squat"]').fill("120");
  await comps.getByRole("button", { name: "Enregistrer la compétition" }).click();
  const sansNom = net(await comps.locator("[data-comp-erreur]").innerText().catch(() => ""));
  await comps.locator("[data-comp-nom]").fill("Meeting");
  await comps.locator('[data-comp-champ="bench"]').fill("7o");
  await comps.getByRole("button", { name: "Enregistrer la compétition" }).click();
  const illisible = net(await comps.locator("[data-comp-erreur]").innerText().catch(() => ""));
  const nb = await comps.locator("[data-comp-ligne]").count();
  console.log(
    "2. REFUS                :",
    /Donne un nom/.test(sansNom) && /Un résultat n'est pas reconnu/.test(illisible) && nb === 1 ? "nom manquant et résultat illisible signalés, rien d'enregistré" : `*** « ${sansNom} » « ${illisible} » lignes ${nb} ***`
  );
  await comps.getByRole("button", { name: "Annuler" }).click();

  // 3. Rechargement.
  await aller();
  const apres = await page.locator("[data-carte-performances] [data-comp-ligne]").count();
  console.log("3. RECHARGEMENT         :", apres === 1 ? "la compétition est toujours là" : `*** ${apres} compétition(s) après rechargement ***`);

  // 4. Course.
  const carte2 = page.locator("[data-carte-performances]");
  await carte2.locator('[data-discipline-perf="course"]').click();
  await page.waitForTimeout(200);
  const c2 = carte2.locator("[data-competitions]");
  const videCourse = /Aucune compétition notée/.test(net(await c2.innerText()));
  await c2.getByRole("button", { name: "Ajouter une compétition" }).click();
  await c2.locator("[data-comp-nom]").fill("10 km de Clermont");
  await c2.locator("[data-comp-date]").fill("2026-11-01");
  await c2.locator('[data-comp-champ="course_10k"]').fill("44:10");
  await c2.getByRole("button", { name: "Enregistrer la compétition" }).click();
  await page.waitForTimeout(300);
  const perf = await page.evaluate(() => JSON.parse(localStorage.getItem("cn_performances") || "{}").course_10k);
  const champ10 = await carte2.locator('[data-perf="course_10k"]').inputValue();
  console.log(
    "4. COURSE 10 KM         :",
    videCourse && perf && perf.valeur === 2650 && perf.competition === true && perf.date === "2026-11-01" && champ10 === "44:10"
      ? "liste vide par discipline, chrono 44:10 mis à jour et marqué compétition"
      : `*** vide ${videCourse} perf ${JSON.stringify(perf)} champ « ${champ10} » ***`
  );

  // 5. Suppression.
  await carte2.locator('[data-discipline-perf="force"]').click();
  await page.waitForTimeout(200);
  const c3 = carte2.locator("[data-competitions]");
  await c3.locator("[data-comp-supprimer]").first().click();
  const encore = await c3.locator("[data-comp-ligne]").count();
  await c3.getByRole("button", { name: "Confirmer la suppression" }).click();
  await page.waitForTimeout(200);
  const reste = await c3.locator("[data-comp-ligne]").count();
  const squatApres = await carte2.locator('[data-perf="pl_squat"]').inputValue();
  console.log(
    "5. SUPPRESSION          :",
    encore === 1 && reste === 0 && squatApres === "115" ? "confirmation demandée, compétition retirée, squat 115 conservé" : `*** avant confirmation ${encore}, après ${reste}, squat ${squatApres} ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
