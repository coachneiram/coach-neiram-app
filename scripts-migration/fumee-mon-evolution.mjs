/**
 * Fumee : « Mon évolution » (demande du coach du 14 octobre 2026).
 *
 * Chaque donnee saisie au jour, a la semaine, au mois et a l'annee :
 *   1. Tendances : la carte s'ouvre sur les pas de la semaine, 7 barres,
 *      la moyenne par jour note et la ligne d'objectif ;
 *   2. toucher une barre affiche la valeur de ce jour ;
 *   3. Mois : une barre par jour ; Annee : 12 barres ; « < » recule d'une
 *      periode et « > » revient, jamais au-dela d'aujourd'hui ;
 *   4. Calories, Jour : le detail repas par repas ;
 *   5. Poids : la courbe des pesees et l'ecart depuis la mesure d'avant ;
 *   6. le choix est retenu a la reouverture ;
 *   7. Mesures : la meme carte, limitee au corps, suit la tuile touchee.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-mon-evolution.mjs
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
await new Promise((r) => serveur.listen(4704, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil("Pixel 7"));
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  // Meme calcul de « aujourd'hui » que l'application (date UTC).
  const auj = new Date().toISOString().slice(0, 10);
  const jour = (k) => {
    const d = new Date(auj + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - k);
    return d.toISOString().slice(0, 10);
  };
  const form = [];
  for (let k = 0; k < 60; k++) form.push({ date: jour(k), steps: 4000 + k * 100, sleepHours: 7 });
  localStorage.setItem("__auj", auj);
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Alex", name: "Alex", sex: "homme", age: 34, heightCm: 178, startWeightKg: 88,
    activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, targetWeightKg: 80, targetSteps: 8000,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_daily_form", JSON.stringify(form));
  localStorage.setItem("coach_log_entries", JSON.stringify([
    { id: "a", date: jour(0), mealType: "petit-dejeuner", name: "Bol", calories: 400, protein: 25, carbs: 50, fat: 10 },
    { id: "b", date: jour(0), mealType: "dejeuner", name: "Plat", calories: 700, protein: 45, carbs: 70, fat: 20 }
  ]));
  localStorage.setItem("coach_body_logs", JSON.stringify([
    { id: "p1", date: jour(70), weightKg: 87 },
    { id: "p2", date: jour(20), weightKg: 85.6 },
    { id: "p3", date: jour(2), weightKg: 84.9 }
  ]));
  localStorage.setItem("coach_measurements", JSON.stringify([
    { id: "m1", date: jour(70), taille: 96 },
    { id: "m2", date: jour(2), taille: 93 }
  ]));
});

const carte = () => page.locator("[data-mon-evolution]").first();
// Texte de la carte sans la liste deroulante (ses 25 options noieraient le reste).
const texte = async () =>
  (await carte().evaluate((el) => {
    const copie = el.cloneNode(true);
    copie.querySelectorAll("select").forEach((s) => s.remove());
    document.body.appendChild(copie);
    const t = copie.innerText;
    copie.remove();
    return t;
  })).replace(/\s+/g, " ");
const onglet = async (re) => {
  await page.getByRole("button", { name: re }).last().click();
  await page.waitForTimeout(700);
};

try {
  await page.goto("http://localhost:4704/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await onglet(/^Tendances$/);

  // 1. Pas de la semaine.
  const barres = await carte().locator("[data-barre]").count();
  const t1 = await texte();
  console.log(
    "1. PAS DE LA SEMAINE    :",
    barres === 7 && /Pas/.test(await carte().locator("select").inputValue() === "pas" ? "Pas" : "") && /Moyenne par jour noté/i.test(t1) && /ton objectif : 8.000 pas/.test(t1)
      ? "7 barres, moyenne par jour noté, objectif 8 000"
      : `*** ${barres} barres : ${t1.slice(0, 160)} ***`
  );

  // 2. Toucher la barre d'aujourd'hui.
  const auj = await page.evaluate(() => localStorage.getItem("__auj"));
  await carte().locator(`[data-barre="${auj}"]`).click();
  await page.waitForTimeout(250);
  const t2 = await texte();
  console.log("2. BARRE TOUCHÉE        :", /Ce jour-là 4.000 ?pas/i.test(t2) ? "« Ce jour-là 4 000 pas »" : `*** ${t2.slice(0, 120)} ***`);

  // 3. Mois, annee, navigation.
  await carte().getByRole("tab", { name: "Mois" }).click();
  await page.waitForTimeout(250);
  const parMois = await carte().locator("[data-barre]").count();
  await carte().getByRole("tab", { name: "Année" }).click();
  await page.waitForTimeout(250);
  const parAn = await carte().locator("[data-barre]").count();
  const suivantBloque = await carte().getByLabel("Période suivante").isDisabled();
  await carte().getByLabel("Période précédente").click();
  await page.waitForTimeout(250);
  const anneeAvant = await texte();
  await carte().getByLabel("Période suivante").click();
  await page.waitForTimeout(250);
  const anneeCourante = await texte();
  const an = Number(auj.slice(0, 4));
  console.log(
    "3. MOIS, ANNÉE, NAVIG.  :",
    parMois >= 28 && parMois <= 31 && parAn === 12 && suivantBloque && anneeAvant.includes(String(an - 1)) && anneeCourante.includes(String(an))
      ? `${parMois} barres au mois, 12 à l'année, « < » vers ${an - 1}, « > » bloqué sur ${an}`
      : `*** mois ${parMois}, an ${parAn}, bloqué ${suivantBloque} ***`
  );

  // 4. Calories du jour, repas par repas.
  await carte().locator("select").selectOption("calories");
  await carte().getByRole("tab", { name: "Jour" }).click();
  await page.waitForTimeout(250);
  const t4 = await texte();
  const repas = await carte().locator("[data-barre]").count();
  console.log(
    "4. CALORIES DU JOUR     :",
    repas === 4 && /Total du jour 1.100 ?kcal/i.test(t4) && /Repas par repas/.test(t4)
      ? "1 100 kcal, 4 repas en barres"
      : `*** ${repas} barres : ${t4.slice(0, 140)} ***`
  );

  // 5. Poids : courbe et ecart.
  await carte().locator("select").selectOption("poids");
  await carte().getByRole("tab", { name: "Année" }).click();
  await page.waitForTimeout(250);
  const t5 = await texte();
  const pesees = await carte().locator("[data-point]").count();
  console.log(
    "5. POIDS                :",
    pesees >= 2 && /Dernière mesure 84,9 ?kg/i.test(t5) && /−/.test(t5)
      ? `${pesees} pesées tracées, dernière 84,9 kg, écart affiché`
      : `*** ${pesees} points : ${t5.slice(0, 160)} ***`
  );

  // 6. Choix retenu.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await onglet(/^Tendances$/);
  const retenu = await carte().locator("select").inputValue();
  const periode = await carte().getByRole("tab", { selected: true }).getAttribute("aria-label");
  console.log("6. CHOIX RETENU         :", retenu === "poids" && periode === "Année" ? "Poids, Année" : `*** ${retenu} ${periode} ***`);

  // 7. Mesures : carte limitee au corps, synchronisee avec les tuiles.
  await onglet(/^(Mesures|Mensurations)$/);
  const options = await carte().locator("option").evaluateAll((els) => els.map((e) => e.value));
  await page.locator('[data-tuile-progression="taille"]').click();
  await page.waitForTimeout(300);
  const surTaille = await carte().locator("select").inputValue();
  console.log(
    "7. ÉCRAN MESURES        :",
    !options.includes("pas") && options.includes("poids") && options.includes("taille") && surTaille === "taille"
      ? "corps seulement, la tuile Taille choisit la taille"
      : `*** options ${options.join(",")}, choix ${surTaille} ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
