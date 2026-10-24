/**
 * Fumée : raccourcis de l'app (partie web, reprise de l'app Neiram le
 * 24 octobre 2026) et voix de la séance sans fichier audio.
 *
 *   1. /?raccourci=eau&ml=250 : +250 ml une seule fois, adresse nettoyée,
 *      message affiché ; un rechargement ne recompte pas ;
 *   2. lien inconnu ou quantité hors bornes : aucun effet ;
 *   3. /?raccourci=repas : l'ajout d'un aliment s'ouvre dans le Journal ;
 *   4. /?raccourci=seance : la séance du jour s'ouvre ;
 *   5. /?raccourci=sommeil et poids : le bon onglet s'ouvre ;
 *   6. voix sans fichier : réglage absent, cocher une série ne casse rien ;
 *   7. le manifeste construit déclare les raccourcis.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-raccourcis.mjs
 */

import { chromium } from "playwright";
import { appareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4727;
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
  localStorage.setItem("cn_synchro_locale", "1");
  localStorage.setItem("coach_profile", JSON.stringify({
    name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 80,
    activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_routines", JSON.stringify([
    { id: "r1", name: "Haut du corps", color: "#F5A040", programme: true, exercises: [{ name: "Développé couché", series: [{ weight: "40", reps: "10", rpe: "" }, { weight: "40", reps: "10", rpe: "" }] }] }
  ]));
});

const eauDuJour = () =>
  page.evaluate(() => {
    const jour = new Date().toISOString().slice(0, 10);
    const f = JSON.parse(localStorage.getItem("coach_daily_form") || "[]").find((x) => x.date === jour);
    return (f && Number(f.waterMl)) || 0;
  });
const ongletActif = async () => net(await page.locator("button.active").first().innerText().catch(() => ""));
const ouvrir = async (adresse) => {
  await page.goto(BASE + adresse, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
};

try {
  // 1. Eau.
  await ouvrir("?raccourci=eau&ml=250");
  const eau1 = await eauDuJour();
  const adresse1 = page.url();
  const message = /\+250 ml d'eau/.test(net(await page.locator("body").innerText()));
  const journal = /Journal/.test(await ongletActif());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const eau2 = await eauDuJour();
  console.log(
    "1. EAU                  :",
    eau1 === 250 && eau2 === 250 && !/raccourci/.test(adresse1) && message && journal
      ? "+250 ml une seule fois, adresse nettoyée, message affiché, rechargement sans effet"
      : `*** ${eau1} ml puis ${eau2} ml après rechargement · adresse ${adresse1} · message ${message} · Journal ${journal} ***`
  );

  // 2. Liens inconnus ou hors bornes.
  for (const adresse of ["?raccourci=inconnu", "?raccourci=eau&ml=5000", "?raccourci=eau&ml=abc", "?raccourci="]) await ouvrir(adresse);
  const eau3 = await eauDuJour();
  console.log("2. LIENS INCONNUS       :", eau3 === 250 ? "aucun effet (toujours 250 ml)" : `*** ${eau3} ml ***`);

  // 3. Repas.
  await ouvrir("?raccourci=repas");
  const titre = net(await page.locator(".modal-panel").last().innerText().catch(() => ""));
  console.log("3. NOTER UN REPAS       :", /Ajouter —/i.test(titre) ? `ajout ouvert (« ${titre.slice(0, 40)} »)` : `*** « ${titre.slice(0, 80)} » ***`);
  await page.keyboard.press("Escape");

  // 4. Seance du jour.
  await ouvrir("?raccourci=seance");
  const seance = net(await page.locator(".modal-panel").last().innerText().catch(() => ""));
  const onglet4 = await ongletActif();
  const exercices = await page.locator('.modal-panel [data-exercice="0"]').count();
  console.log(
    "4. LANCER MA SÉANCE     :",
    /Haut du corps/i.test(seance) && exercices === 1 && /Séances|Entraînements/.test(onglet4)
      ? "séance du jour ouverte (Haut du corps)"
      : `*** onglet « ${onglet4} », ${exercices} exercice(s), « ${seance.slice(0, 80)} » ***`
  );

  // 6. Voix sans fichier : cocher une serie ne joue rien et ne casse rien.
  const cases = page.locator(".modal-panel").last().locator('[data-exercice="0"] button[aria-pressed]');
  const nbCases = await cases.count();
  if (nbCases) await cases.first().click();
  await page.waitForTimeout(500);
  const minuteur = (await page.locator('[role="timer"]').count()) === 1;
  // Seance laissee sans l'enregistrer : son brouillon est oublie.
  await page.evaluate(() => localStorage.removeItem("brouillon_seance_neiram"));

  // 5. Sommeil et poids.
  await ouvrir("?raccourci=sommeil");
  const sommeil = await ongletActif();
  await ouvrir("?raccourci=poids");
  const poids = await ongletActif();
  console.log(
    "5. SOMMEIL ET POIDS     :",
    /Sommeil/.test(sommeil) && /Mesures|Mensurations/.test(poids) ? "onglets Sommeil puis Mesures" : `*** « ${sommeil} » puis « ${poids} » ***`
  );

  await page.locator('button[aria-label="Réglages"]').first().click();
  await page.waitForTimeout(500);
  const reglagesOuverts = /Rappel du dimanche/.test(net(await page.locator(".modal-panel").last().innerText().catch(() => "")));
  const reglageVoix = await page.locator("[data-reglage-voix]").count();
  console.log(
    "6. VOIX SANS FICHIER    :",
    reglagesOuverts && reglageVoix === 0 && nbCases > 0 && minuteur
      ? "réglage caché, série cochée (minuteur lancé) sans erreur"
      : `*** réglages ouverts ${reglagesOuverts}, réglage voix ${reglageVoix}, cases ${nbCases}, minuteur ${minuteur} ***`
  );

  // 7. Manifeste construit.
  const manifeste = await page.evaluate(async () => (await fetch("./manifest.json")).json());
  const urls = (manifeste.shortcuts || []).map((s) => s.url);
  console.log(
    "7. MANIFESTE            :",
    urls.length === 5 && urls.every((u) => u.startsWith("./?raccourci=")) ? `${urls.length} raccourcis (${urls.join(", ")})` : `*** ${JSON.stringify(urls)} ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
