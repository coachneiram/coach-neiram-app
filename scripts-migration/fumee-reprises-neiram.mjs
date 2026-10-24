/**
 * Fumée : fonctions reprises de l'app Neiram (24 octobre 2026).
 *
 *   1. client déjà installé : seul le tuto de Séances s'ouvre, une fois ;
 *      le bouton du livre le rouvre ; Repas n'ouvre rien ;
 *   2. disques par côté et échauffement sous un exercice à 100 kg ;
 *   3. technique « Rest-pause » : réglages et niveau de preuve ;
 *   4. rappel de sauvegarde au Journal après 14 jours de suivi, « Plus tard » ;
 *   5. accord avant l'IA : refus = rien n'est envoyé ; accord = réponse,
 *      puis « Retirer mon accord » dans les Réglages ;
 *   6. séance abîmée (exercices pas en liste) : l'onglet Séances s'affiche.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-reprises-neiram.mjs
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
await new Promise((r) => serveur.listen(4718, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");
const corps = async () => net(await page.locator("body").innerText());

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  const jour = (k) => {
    const d = new Date();
    d.setDate(d.getDate() - k);
    return d.toISOString().slice(0, 10);
  };
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Sabine", name: "Sabine", sex: "femme", age: 40, heightCm: 165, startWeightKg: 62,
    activityLevel: "modere", goal: "forme", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_routines", JSON.stringify([{ id: "r1", name: "Bas du corps", color: "#F5A040" }]));
  localStorage.setItem("coach_sessions", JSON.stringify([
    { id: "s1", date: jour(7), routineId: "r1", durationMin: 60, rpe: 7, exercises: [{ id: "e1", name: "Squat", mode: "muscu", sets: "3", reps: "5", weight: "100", rpe: "8" }] },
    // Seance abimee : « exercises » n'est pas une liste.
    { id: "s2", date: jour(20), routineId: "r1", exercises: "pas une liste" },
    null
  ]));
  localStorage.setItem("coach_log_entries", JSON.stringify([{ id: "l1", date: jour(20), mealType: "dejeuner", name: "Riz", calories: 300 }]));
});

const onglet = async (nom) => {
  await page.getByRole("button", { name: nom, exact: true }).last().click();
  await page.waitForTimeout(500);
};
const tutoOuvert = async () => (await page.locator("[data-tuto]").count()) > 0;

try {
  await page.goto("http://localhost:4718/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  // 1. Tutos.
  const auJournal = await tutoOuvert();
  await onglet("Séances");
  await page.waitForTimeout(900);
  const titreTuto = (await page.locator("[data-tuto]").count()) ? await page.locator("[data-tuto]").getAttribute("data-tuto") : null;
  for (let k = 0; k < 3; k++) await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("button", { name: "C'est compris" }).click();
  await page.waitForTimeout(300);
  const ferme = !(await tutoOuvert());
  await onglet("Repas");
  await page.waitForTimeout(900);
  const repasRien = !(await tutoOuvert());
  await onglet("Séances");
  await page.waitForTimeout(900);
  const pasRouvert = !(await tutoOuvert());
  await page.locator("[data-bouton-tuto]").click();
  await page.waitForTimeout(400);
  const livre = (await page.locator('[data-tuto="entrainements"]').count()) === 1;
  await page.locator(".modal-panel button[aria-label='Fermer']").last().click();
  await page.waitForTimeout(300);
  const seancesOk = /S[ÉE]ANCES TYPES/i.test(await corps());
  console.log(
    "1. TUTOS                :",
    !auJournal && titreTuto === "entrainements" && ferme && repasRien && pasRouvert && livre
      ? "seul le tuto Séances s'ouvre (client déjà installé), une fois ; le livre le rouvre"
      : `*** journal ${auJournal}, tuto ${titreTuto}, fermé ${ferme}, repas ${repasRien}, pas rouvert ${pasRouvert}, livre ${livre} ***`
  );
  console.log(
    "6. SÉANCE ABÎMÉE        :",
    seancesOk ? "l'onglet Séances s'affiche malgré une séance aux exercices illisibles" : "*** onglet Séances absent ***"
  );

  // 2. Disques et echauffement.
  await page.getByRole("button", { name: "Démarrer" }).click();
  await page.waitForTimeout(500);
  const outil = page.locator("[data-outils-barre]").first();
  const libelle = net(await outil.innerText().catch(() => ""));
  await outil.locator("button").first().click();
  await page.waitForTimeout(200);
  const disques = net(await outil.locator("[data-disques]").innerText().catch(() => ""));
  const echauffement = await outil.locator("[data-echauffement] li").count();
  console.log(
    "2. DISQUES & ÉCHAUFFEMENT:",
    /pour 102,5 kg|pour 100 kg/.test(libelle) && /25 kg/.test(disques) && echauffement === 4
      ? `« ${libelle.replace(/ [▲▼]$/, "")} » : ${disques}, ${echauffement} séries d'échauffement`
      : `*** « ${libelle} », disques « ${disques} », ${echauffement} échauffement ***`
  );

  // 3. Technique etendue.
  await page.getByRole("button", { name: "Options", exact: true }).first().click();
  await page.waitForTimeout(200);
  await page.locator("select").filter({ hasText: "Série classique" }).first().selectOption("rest-pause");
  await page.waitForTimeout(300);
  const reglage = await page.locator('[data-param-technique="miniSeries"]').count();
  const preuve = net(await page.locator('[data-preuve-technique="rest-pause"]').innerText().catch(() => ""));
  console.log(
    "3. TECHNIQUE REST-PAUSE :",
    reglage === 1 && /pause/i.test(preuve)
      ? "réglage « Mini-séries » proposé, définition et preuves affichées"
      : `*** réglage ${reglage}, « ${preuve.slice(0, 80)} » ***`
  );
  page.once("dialog", (d) => d.accept());
  await page.locator(".modal-panel button[aria-label='Fermer']").last().click();
  await page.waitForTimeout(400);

  // 4. Rappel de sauvegarde.
  await onglet("Journal");
  const carte = page.locator("[data-rappel-sauvegarde]");
  const vue = (await carte.count()) === 1 && /uniquement sur ce téléphone/.test(await carte.innerText());
  await carte.getByRole("button", { name: "Plus tard" }).click();
  await page.waitForTimeout(300);
  const tue = (await page.locator("[data-rappel-sauvegarde]").count()) === 0;
  console.log(
    "4. RAPPEL DE SAUVEGARDE :",
    vue && tue ? "carte affichée après 14 jours de suivi, « Plus tard » la fait taire" : `*** vue ${vue}, tue ${tue} ***`
  );

  // 5. Accord avant l'IA.
  const requetes = [];
  await page.route("**/ai", async (route) => {
    requetes.push(1);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text: "Un skyr et une poignée d'amandes." }] } }] })
    });
  });
  await onglet("Repas");
  await page.getByRole("button", { name: "Coach IA", exact: true }).click();
  await page.waitForTimeout(400);
  const envoyer = async () => {
    await page.locator('input[placeholder^="Ex : je suis"]').fill("Une idée de collation ?");
    await page.getByRole("button", { name: "Envoyer", exact: true }).click();
    await page.waitForTimeout(500);
  };
  await envoyer();
  const demande = (await page.locator("[data-ecran-consentement]").count()) === 1;
  await page.getByRole("button", { name: "Refuser" }).click();
  await page.waitForTimeout(500);
  const refus = /Rien n'a été envoyé/.test(await corps()) && requetes.length === 0;
  await envoyer();
  await page.getByRole("button", { name: "J'accepte" }).click();
  await page.waitForTimeout(800);
  const reponse = /poignée d'amandes/.test(await corps()) && requetes.length === 1;
  await page.locator('button[aria-label="Réglages"]').first().click();
  await page.waitForTimeout(500);
  const bloc = page.locator("[data-bloc-accord-ia]");
  const blocVu = (await bloc.count()) === 1;
  await bloc.getByRole("button", { name: "Retirer mon accord" }).click();
  const retire = (await page.evaluate(() => localStorage.getItem("cn_consentement_ia"))) === null;
  console.log(
    "5. ACCORD AVANT L'IA    :",
    demande && refus && reponse && blocVu && retire
      ? "demandé au premier envoi ; refus : rien n'est envoyé ; accord : réponse ; retrait dans les Réglages"
      : `*** demandé ${demande}, refus ${refus}, réponse ${reponse} (${requetes.length} requête(s)), bloc ${blocVu}, retiré ${retire} ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
