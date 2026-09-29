/**
 * Fumee : reprendre la veille, et compter ses portions du jour.
 *
 * Deux ajouts au Journal, d'apres MyFitnessPal et Lifesum :
 *   1. « Reprendre celui d'hier » sous un repas vide : les aliments d'hier
 *      arrivent aujourd'hui, et hier n'est pas modifie ;
 *   2. « Reprendre toute la journee d'hier » quand la journee est vide ;
 *      le bouton disparait ensuite (pas de double copie) ;
 *   3. Portions du jour : + et − sur fruits, legumes, proteines, enregistres
 *      dans le journal du jour, comptes dans le score, conserves au
 *      redemarrage.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-copier-portions.mjs
 */

import { chromium } from "playwright";
import { appareil } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4642, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil("Pixel 7"));
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));

// Les dates sont calculees DANS la page, comme l'application les calcule.
const { auj, hier } = await (async () => {
  const p = await ctx.newPage();
  await p.goto("about:blank");
  const r = await p.evaluate(() => {
    const auj = new Date().toISOString().slice(0, 10);
    const d = new Date(auj + "T00:00:00");
    d.setDate(d.getDate() - 1);
    const hier = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { auj, hier };
  });
  await p.close();
  return r;
})();

await page.addInitScript((HIER) => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Claire", sex: "femme", age: 35, heightCm: 166, startWeightKg: 64,
    activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3, targetWeightKg: 62,
    trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_log_entries", JSON.stringify([
    { id: "h1", date: HIER, mealType: "petit-dejeuner", name: "Skyr (150 g)", calories: 90, protein: 15, carbs: 6, fat: 0, grams: 150, baseName: "Skyr" },
    { id: "h2", date: HIER, mealType: "petit-dejeuner", name: "Banane", calories: 105, protein: 1, carbs: 27, fat: 0 },
    { id: "h3", date: HIER, mealType: "dejeuner", name: "Poulet riz", calories: 520, protein: 40, carbs: 60, fat: 10 }
  ]));
  localStorage.setItem("coach_daily_form", JSON.stringify([]));
}, hier);

const lire = (cle) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "[]"), cle);
const texte = () => page.locator("body").innerText();

try {
  await page.goto("http://localhost:4642/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Journal", exact: true }).first().click();
  await page.waitForTimeout(600);

  // ── 1. Journee vide : les deux propositions sont la ─────────────
  let t = await texte();
  console.log(
    "1. JOURNÉE VIDE        :",
    /Reprendre toute la journée d'hier · 3 aliments · 715 kcal/.test(t)
      ? "« Reprendre toute la journée d'hier · 3 aliments · 715 kcal »"
      : "*** BOUTON JOURNÉE ABSENT ***"
  );
  console.log(
    "   par repas           :",
    /Reprendre celui d'hier · 2 aliments · 195 kcal/.test(t) && /Reprendre celui d'hier · 1 aliment · 520 kcal/.test(t)
      ? "petit-déjeuner (2 · 195 kcal) et déjeuner (1 · 520 kcal)"
      : "*** LIENS PAR REPAS ABSENTS ***"
  );

  // ── 2. Reprendre le petit-dejeuner seul ─────────────────────────
  await page.getByRole("button", { name: /Reprendre celui d'hier · 2 aliments/ }).click();
  await page.waitForTimeout(500);
  let journal = await lire("coach_log_entries");
  const aujourdhui = () => journal.filter((e) => e.date === auj);
  console.log(
    "2. PETIT-DÉJ REPRIS    :",
    aujourdhui().length === 2 &&
      aujourdhui().every((e) => e.mealType === "petit-dejeuner" && e.id && !["h1", "h2"].includes(e.id)) &&
      journal.filter((e) => e.date === hier).length === 3
      ? "2 aliments aujourd'hui, nouveaux identifiants, hier intact"
      : `*** ${aujourdhui().length} AUJOURD'HUI, ${journal.filter((e) => e.date === hier).length} HIER ***`
  );
  t = await texte();
  console.log(
    "   plus de doublon     :",
    !/Reprendre toute la journée/.test(t) && !/Reprendre celui d'hier · 2 aliments/.test(t) && /Reprendre celui d'hier · 1 aliment/.test(t)
      ? "boutons journée et petit-déj retirés, déjeuner toujours proposé"
      : "*** BOUTONS ENCORE AFFICHÉS ***"
  );

  // ── 3. Journee entiere, un autre jour : on vide aujourd'hui ─────
  for (const nom of ["Skyr (150 g)", "Banane"]) {
    await page.locator("div", { hasText: new RegExp(`^${nom.replace(/[()]/g, "\\$&")}`) })
      .locator("..").getByRole("button", { name: "Supprimer" }).first().click();
    await page.waitForTimeout(300);
  }
  journal = await lire("coach_log_entries");
  await page.getByRole("button", { name: /Reprendre toute la journée d'hier/ }).click();
  await page.waitForTimeout(500);
  journal = await lire("coach_log_entries");
  const kcal = aujourdhui().reduce((s, e) => s + e.calories, 0);
  console.log(
    "3. JOURNÉE REPRISE     :",
    aujourdhui().length === 3 && kcal === 715 && aujourdhui().filter((e) => e.mealType === "dejeuner").length === 1
      ? "3 aliments, 715 kcal, chacun dans son repas"
      : `*** ${aujourdhui().length} ALIMENTS, ${kcal} kcal ***`
  );

  // ── 4. Portions du jour ─────────────────────────────────────────
  t = await texte();
  console.log("4. PORTIONS            :", /Portions du jour/i.test(t) ? "carte affichée" : "*** CARTE ABSENTE ***");
  const carte = page.locator("div", { has: page.getByText("Portions du jour", { exact: true }) }).last();
  const plus = (i) => carte.getByRole("button", { name: "Ajouter une portion" }).nth(i);
  const moins = (i) => carte.getByRole("button", { name: "Retirer une portion" }).nth(i);
  for (let k = 0; k < 3; k++) await plus(0).click(); // 3 fruits
  for (let k = 0; k < 2; k++) await plus(1).click(); // 2 legumes
  await plus(2).click();
  await plus(2).click();
  await moins(2).click(); // 1 proteine
  await page.waitForTimeout(400);
  let form = (await lire("coach_daily_form")).find((f) => f.date === auj) || {};
  console.log(
    "   compteurs           :",
    form.fruits === 3 && form.vegetables === 2 && form.proteinPortions === 1
      ? "3 fruits, 2 légumes, 1 protéine enregistrés"
      : `*** ${JSON.stringify(form)} ***`
  );
  t = await texte();
  console.log(
    "   score du jour       :",
    /Fruits & légumes\s*100%/.test(t) && /Portions de protéines\s*33%/.test(t)
      ? "« Fruits & légumes 100% » et « Portions de protéines 33% »"
      : "*** COMPOSANTES ABSENTES DU SCORE ***"
  );
  const desactive = await moins(1).isDisabled();
  for (let k = 0; k < 3; k++) await moins(1).click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
  form = (await lire("coach_daily_form")).find((f) => f.date === auj) || {};
  console.log(
    "   jamais négatif      :",
    form.vegetables === 0 && !desactive && (await moins(1).isDisabled())
      ? "légumes à 0, bouton − désactivé"
      : `*** légumes ${form.vegetables} ***`
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Journal", exact: true }).first().click();
  await page.waitForTimeout(500);
  const affiches = await page.locator("[data-portion]").allInnerTexts();
  console.log(
    "5. APRÈS REDÉMARRAGE   :",
    affiches.join(",") === "3,0,1" ? "3 fruits, 0 légume, 1 protéine" : `*** ${affiches.join(",")} ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
