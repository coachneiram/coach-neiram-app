/**
 * Fumée : le « ? » de chaque carte ouvre son tuto (24 octobre 2026).
 *
 * Tutos des fonctions repris de l'app Neiram (PR #55) :
 *   1. dans chaque onglet (et les sous-onglets de Repas), chaque bouton
 *      « ? » visible ouvre le tuto de sa carte, qui se referme ;
 *   2. pendant une séance : minuteur, disques, technique (après
 *      « Options ») et bibliothèque d'exercices ;
 *   3. dans les Réglages : le « ? » s'ouvre par-dessus, et la fermeture
 *      ramène aux Réglages ; le guide liste tous les tutos ;
 *   4. tout tuto de fonction rattaché à une carte a été ouvert au moins
 *      une fois (sinon, son identifiant est affiché).
 *
 *   cd app && npm run build && cd ..
 *   APPAREIL="Pixel 7" CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts-migration/fumee-tutos-cartes.mjs
 */

import { chromium } from "playwright";
import { appareil, nomAppareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TUTOS } from "../app/src/lib/tutos.js";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4729, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  const jour = (k) => {
    const d = new Date();
    d.setDate(d.getDate() - k);
    return d.toISOString().slice(0, 10);
  };
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Sabine", name: "Sabine", sex: "femme", age: 40, heightCm: 165, startWeightKg: 62,
    activityLevel: "modere", goal: "performance", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_routines", JSON.stringify([{
    id: "r1", name: "Bas du corps", color: "#F5A040",
    exercises: [{ id: "p1", name: "Squat", mode: "muscu", sets: "3", reps: "5", weight: "100" }]
  }]));
  localStorage.setItem("coach_sessions", JSON.stringify([
    { id: "s1", date: jour(7), routineId: "r1", durationMin: 60, rpe: 7, exercises: [{ id: "e1", name: "Squat", mode: "muscu", sets: "3", reps: "5", weight: "100", rpe: "8" }] },
    { id: "s2", date: jour(3), routineId: "r1", durationMin: 55, rpe: 7, exercises: [{ id: "e2", name: "Squat", mode: "muscu", sets: "3", reps: "5", weight: "102.5", rpe: "8" }] },
    { id: "s3", date: jour(2), durationMin: 40, activite: { id: "course", label: "Course à pied", emoji: "🏃", duree: 40, rpe: 6, distance: 8 } }
  ]));
  localStorage.setItem("coach_daily_form", JSON.stringify([
    { date: jour(0), sleepHours: 7.5, bedTime: "23:00", wakeTime: "06:30", energy: 4, stress: 3, waterMl: 1000, steps: 8000 },
    { date: jour(1), sleepHours: 7, bedTime: "23:30", wakeTime: "06:30", energy: 3, stress: 4 }
  ]));
  localStorage.setItem("coach_body_logs", JSON.stringify([
    { id: "b1", date: jour(40), weightKg: 64, bodyFatPct: 30 },
    { id: "b2", date: jour(1), weightKg: 62.5, bodyFatPct: 28.5 }
  ]));
  localStorage.setItem("coach_measurements", JSON.stringify([
    { id: "m1", date: jour(40), waistCm: 80 },
    { id: "m2", date: jour(1), waistCm: 77 }
  ]));
  localStorage.setItem("coach_log_entries", JSON.stringify([
    { id: "l1", date: jour(1), mealType: "dejeuner", name: "Riz", calories: 300, protein: 6, carbs: 60, fat: 1 }
  ]));
  // Un bilan d'il y a deux semaines : « Historique des bilans » apparait.
  const lundi = (k) => {
    const d = new Date(jour(k) + "T12:00:00");
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  };
  localStorage.setItem("coach_reports", JSON.stringify([{ id: "w1", weekKey: lundi(14), sections: [] }]));
});

const ouverts = new Set();
const echecs = [];
const fermerTuto = async () => {
  await page.locator(".modal-panel button[aria-label='Fermer']").last().click();
  await page.waitForTimeout(250);
};

/** Clique chaque « ? » visible de l'écran ; rend le nombre de clics réussis. */
async function cliquerLesLiens(contexte, dansFenetre = false) {
  // Une fenetre ouverte : seuls ses « ? » sont cliquables, pas ceux de l'ecran dessous.
  const racine = dansFenetre ? page.locator(".modal-panel").last() : page;
  const liens = racine.locator("[data-lien-tuto-carte]");
  const n = await liens.count();
  let reussis = 0;
  for (let i = 0; i < n; i++) {
    const lien = liens.nth(i);
    if (!(await lien.isVisible().catch(() => false))) continue;
    const id = await lien.getAttribute("data-lien-tuto-carte");
    await lien.scrollIntoViewIfNeeded();
    await lien.click();
    await page.waitForTimeout(300);
    const ouvert = (await page.locator(`[data-tuto="${id}"]`).count()) === 1;
    if (ouvert) {
      ouverts.add(id);
      reussis++;
      await fermerTuto();
      if ((await page.locator(`[data-tuto="${id}"]`).count()) !== 0) echecs.push(`${contexte} : ${id} ne se ferme pas`);
    } else {
      echecs.push(`${contexte} : ${id} ne s'ouvre pas`);
    }
  }
  return reussis;
}

/** Les « ? » ajoutes ne doivent pas faire deborder l'ecran sur le cote. */
const debordements = [];
async function verifierLargeur(contexte) {
  const trop = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (trop > 1) debordements.push(`${contexte} +${trop}px`);
}

const onglet = async (nom) => {
  await page.getByRole("button", { name: nom, exact: true }).last().click();
  await page.waitForTimeout(600);
};

try {
  await page.goto("http://localhost:4729/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  // 1. Chaque onglet.
  const parOnglet = [];
  for (const nom of ["Journal", "Nutrition", "Sommeil", "Mesures", "Tendances", "Séances"]) {
    await onglet(nom);
    // Le questionnaire du repère sur mesure porte le « ? » de la catégorie de poids.
    if (nom === "Nutrition") await page.getByRole("button", { name: "Mes réponses", exact: true }).click().catch(() => {});
    parOnglet.push(`${nom} ${await cliquerLesLiens(nom)}`);
    await verifierLargeur(nom);
  }
  await onglet("Repas");
  for (const sous of ["Mes plats", "Courses", "Aliments"]) {
    await page.getByRole("button", { name: sous, exact: true }).first().click();
    await page.waitForTimeout(400);
    parOnglet.push(`Repas/${sous} ${await cliquerLesLiens("Repas/" + sous)}`);
  }
  console.log("1. ONGLETS              :", parOnglet.join(" · "));
  console.log("   LARGEUR              :", debordements.length ? "*** " + debordements.join(", ") + " ***" : "aucun débordement horizontal");

  // 2. Pendant une séance.
  await onglet("Séances");
  await page.getByRole("button", { name: "Démarrer" }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Options", exact: true }).first().click();
  await page.waitForTimeout(250);
  const enSeance = await cliquerLesLiens("séance", true);
  await page.getByRole("button", { name: "Ajouter un exercice" }).first().click();
  await page.waitForTimeout(400);
  const enBibliotheque = await cliquerLesLiens("bibliothèque", true);
  const attendusSeance = ["minuteur-repos", "outils-barre", "techniques-serie", "bibliotheque-exercices"].filter((id) => !ouverts.has(id));
  console.log(
    "2. PENDANT LA SÉANCE    :",
    !attendusSeance.length ? `${enSeance + enBibliotheque} « ? » ouverts (minuteur, disques, technique, bibliothèque)` : `*** manquent ${attendusSeance.join(", ")} ***`
  );
  page.on("dialog", (d) => d.accept());
  for (let k = 0; k < 3 && (await page.locator(".modal-panel").count()); k++) {
    await page.locator(".modal-panel button[aria-label='Fermer']").last().click();
    await page.waitForTimeout(300);
  }

  // 3. Réglages et guide.
  await page.locator('button[aria-label="Réglages"]').first().click();
  await page.waitForTimeout(500);
  const dansReglages = await cliquerLesLiens("Réglages", true);
  const reglagesToujoursOuverts = (await page.locator(".modal-panel").count()) === 1;
  await page.getByRole("button", { name: "Guide d'utilisation (tutos)" }).click();
  await page.waitForTimeout(500);
  const dansGuide = await page.locator("[data-guide-tutos] [data-lien-tuto]").count();
  console.log(
    "3. RÉGLAGES ET GUIDE    :",
    dansReglages >= 4 && reglagesToujoursOuverts && dansGuide === TUTOS.length
      ? `${dansReglages} « ? » dans les Réglages (fermeture : retour aux Réglages), guide de ${dansGuide} tutos`
      : `*** réglages ${dansReglages}, toujours ouverts ${reglagesToujoursOuverts}, guide ${dansGuide}/${TUTOS.length} ***`
  );

  // 4. Couverture : chaque tuto de fonction relie a une carte a ete ouvert.
  const source = (await import("node:child_process")).execSync("grep -rhoE '(tuto|LienTuto id)=\"[a-z0-9-]+\"' app/src", {
    cwd: join(dirname(fileURLToPath(import.meta.url)), ".."),
    encoding: "utf8"
  });
  const relies = [...new Set([...source.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]))];
  const jamais = relies.filter((id) => !ouverts.has(id));
  console.log(
    "4. COUVERTURE           :",
    `${ouverts.size} tutos ouverts depuis leur carte sur ${relies.length} reliés` + (jamais.length ? ` · non affichés avec ces données : ${jamais.join(", ")}` : "")
  );
  console.log("ÉCHECS                 :", echecs.length ? "*** " + echecs.join(" | ") + " ***" : "aucun");
} catch (e) {
  console.log("ECHEC :", process.env.DETAIL ? e.message : e.message.split("\n")[0]);
}

console.log("APPAREIL :", nomAppareil());
console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
