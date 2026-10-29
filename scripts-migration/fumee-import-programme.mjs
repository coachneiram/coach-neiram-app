/**
 * Fumée : importer son programme par dictée, photo ou PDF (29 octobre 2026).
 *
 *   1. la carte « Importer mon programme » est dans Séances ;
 *   2. un programme tapé est lu, vérifié, puis enregistré en séances types ;
 *   3. un PDF part au proxy en application/pdf, avec la fonction « programme » ;
 *   4. une photo part en image, réduite ;
 *   5. un document illisible : message clair, rien d'enregistré ;
 *   6. une séance décochée n'est pas enregistrée, le nom corrigé l'est.
 *
 * L'IA est simulée (route /ai) : la lecture réelle de Gemini n'est pas
 * vérifiée ici.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-import-programme.mjs
 */

import { chromium } from "playwright";
import { appareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4741;
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

const PROGRAMME = {
  seances: [
    { nom: "Jour 1 - Haut du corps", elements: [{ nom: "developpe couche BARRE", mode: "muscu", series: 4, reps: "8-10", charge_kg: 60, repos_s: 90 }, { nom: "Tractions", mode: "pdc", series: 3, reps: "max" }] },
    { nom: "Jour 2 - Circuit", elements: [{ nom: "Pompes", mode: "pdc", series: 5, reps: 10, note: "AMRAP 20 min" }] }
  ]
};
let reponseIA = JSON.stringify(PROGRAMME);
const requetesIA = [];
await page.route("**/ai", (route) => {
  requetesIA.push(JSON.parse(route.request().postData() || "{}"));
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ candidates: [{ content: { parts: [{ text: reponseIA }] } }] }) });
});
await page.route("**/coach-sync", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("cn_synchro_locale", "1");
  localStorage.setItem("cn_consentement_ia", JSON.stringify({ accepte: true, version: 2, le: "2026-10-29" }));
  localStorage.setItem("cn_acces", JSON.stringify({ jeton: "jeton-de-test-0123456789" }));
  localStorage.setItem("coach_profile", JSON.stringify({
    name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 80,
    activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
const routines = () => page.evaluate(() => JSON.parse(localStorage.getItem("coach_routines") || "[]"));
const fenetre = () => page.locator(".modal-panel").last();
const ouvrirImport = async () => {
  await page.getByRole("button", { name: "Photo, PDF ou dictée" }).click();
  await page.waitForTimeout(300);
};

try {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /^(Séances|Entraînements)$/ }).last().click();
  await page.waitForTimeout(600);

  // 1. La carte.
  const carte = await page.locator("[data-import-programme]").count();
  console.log("1. CARTE                :", carte === 1 ? "« Importer mon programme » dans Séances" : `*** ${carte} carte(s) ***`);

  // 2. Texte tapé → vérification → enregistrement (nom corrigé, 2e séance décochée).
  await ouvrirImport();
  await fenetre().getByLabel("Programme dicté ou tapé").fill("Lundi développé couché 4 fois 8 à 60 kilos, tractions 3 fois max. Mardi circuit pompes.");
  await fenetre().getByRole("button", { name: "Lire mon programme" }).click();
  await fenetre().getByText("Garder cette séance").first().waitFor({ timeout: 8000 });
  const verif = net(await fenetre().innerText());
  const envoyee = requetesIA[0] || {};
  await fenetre().getByLabel("Nom de la séance Jour 1 - Haut du corps").fill("Haut du corps A");
  await fenetre().getByLabel("Garder cette séance").nth(1).uncheck();
  const bouton = fenetre().getByRole("button", { name: /Ajouter 1 séance/ });
  await bouton.waitFor({ timeout: 3000 });
  const avant = (await routines()).length;
  await bouton.click();
  await page.waitForTimeout(600);
  const apres = await routines();
  const nouvelle = apres.find((r) => r.name === "Haut du corps A");
  console.log(
    "2. TEXTE → SEANCES      :",
    /Développé couché barre/.test(verif) && /2 séances lues/.test(verif) && envoyee.fonction === "programme" && apres.length === avant + 1 && nouvelle && nouvelle.exercises.length === 2 && nouvelle.exercises[0].weight === "60" && !apres.some((r) => /Circuit/.test(r.name))
      ? "2 séances lues, 1 gardée, renommée, 2 exercices enregistrés"
      : `*** vérif « ${verif.slice(0, 100)} », fonction ${envoyee.fonction}, routines ${avant}→${apres.length} ***`
  );
  const aucune = await page.locator(".modal-panel").count();
  console.log("   FERMETURE            :", aucune === 0 ? "fenêtre fermée après l'ajout" : `*** ${aucune} fenêtre(s) ouverte(s) ***`);

  // 3. PDF.
  requetesIA.length = 0;
  await ouvrirImport();
  await fenetre().locator('input[type="file"][accept*="pdf"]').setInputFiles({ name: "programme.pdf", mimeType: "application/pdf", buffer: PDF });
  const listeVue = net(await fenetre().innerText());
  await fenetre().getByRole("button", { name: "Lire mon programme" }).click();
  await fenetre().getByText("Garder cette séance").first().waitFor({ timeout: 8000 });
  const types = (requetesIA[0]?.messages?.[0]?.parts || []).filter((p) => p.inlineData).map((p) => p.inlineData.mimeType);
  console.log(
    "3. PDF                  :",
    /programme\.pdf/.test(listeVue) && types.join() === "application/pdf" && requetesIA[0].fonction === "programme" && requetesIA[0].maxTokens === 8000
      ? "PDF envoyé en application/pdf, fonction « programme »"
      : `*** fichiers ${net(listeVue).slice(0, 80)}, types ${types}, fonction ${requetesIA[0]?.fonction} ***`
  );
  await fenetre().getByRole("button", { name: "Fermer" }).first().click().catch(() => {});
  await page.waitForTimeout(300);
  if (await page.locator(".modal-panel").count()) await page.locator(".modal-panel button[aria-label='Fermer']").last().click();

  // 4. Photo.
  requetesIA.length = 0;
  await ouvrirImport();
  await fenetre().locator('input[type="file"][accept="image/*"]:not([capture])').first().setInputFiles({ name: "page1.png", mimeType: "image/png", buffer: PNG });
  await fenetre().getByRole("button", { name: "Lire mon programme" }).click();
  await fenetre().getByText("Garder cette séance").first().waitFor({ timeout: 8000 });
  const typesPhoto = (requetesIA[0]?.messages?.[0]?.parts || []).filter((p) => p.inlineData).map((p) => p.inlineData.mimeType);
  console.log("4. PHOTO                :", typesPhoto.length === 1 && /^image\//.test(typesPhoto[0]) ? `photo envoyée en ${typesPhoto[0]}` : `*** types ${typesPhoto} ***`);
  await page.locator(".modal-panel button[aria-label='Fermer']").last().click();
  await page.waitForTimeout(300);

  // 5. Document illisible.
  reponseIA = JSON.stringify({ seances: [], erreur: "illisible" });
  const avantIllisible = (await routines()).length;
  await ouvrirImport();
  await fenetre().getByLabel("Programme dicté ou tapé").fill("bla bla");
  await fenetre().getByRole("button", { name: "Lire mon programme" }).click();
  await fenetre().getByRole("alert").waitFor({ timeout: 8000 });
  const message = net(await fenetre().getByRole("alert").innerText());
  console.log(
    "5. ILLISIBLE            :",
    /pas réussi à lire/.test(message) && (await routines()).length === avantIllisible && (await fenetre().getByLabel("Programme dicté ou tapé").count()) === 1
      ? "message clair, retour à la saisie, rien d'enregistré"
      : `*** « ${message} » ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
