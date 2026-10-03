/**
 * Fumee : ajouter un exercice absent de la bibliotheque, depuis celle-ci
 * (demande du coach du 2 octobre 2026).
 *
 * Seances → seance « Haut du corps » → Bibliotheque :
 *   1. le formulaire « Ton exercice n'est pas dans la liste ? » est la, le
 *      bouton est inactif tant que le nom est vide ;
 *   2. « Ajouter » met l'exercice dans la seance, une seule fois, et le
 *      range tout de suite dans « Mes exercices » (sans enregistrer) ;
 *   3. en rouvrant la bibliotheque, il est dans « Mes exercices » ;
 *   4. un nom deja dans la bibliotheque (tape sans accent, valide avec
 *      Entree) reprend l'exercice de la bibliotheque, sans doublon perso ;
 *   5. objectif « maintien » (pas « performance ») : la liste des modes
 *      propose quand meme « Force », et le choix est garde.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-exercice-tape.mjs
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
await new Promise((r) => serveur.listen(4653, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];

const ctx = await nav.newContext(appareil("Pixel 7"));
const page = await ctx.newPage();
page.on("pageerror", (e) => erreurs.push(e.message));
await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 80,
    activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_routines", JSON.stringify([{ id: "r1", name: "Haut du corps", description: "Pecs / Dos", color: "#2DD4BF" }]));
});

const perso = () => page.evaluate(() => JSON.parse(localStorage.getItem("cn_custom_exercises") || "[]"));
const valeurs = () => page.$$eval("input", (els) => els.map((e) => e.value));
const formulaire = () => page.locator("[data-exercice-tape]");
async function ouvrirBibliotheque() {
  await page.getByRole("button", { name: /Bibliothèque/ }).first().click();
  await page.waitForTimeout(400);
}

try {
  await page.goto("http://localhost:4653/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  // Barre du bas sur telephone : « Séances » (« Entraînements » est le menu du grand ecran).
  await page.getByRole("button", { name: "Séances", exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByText("Haut du corps").first().click();
  await page.waitForTimeout(400);
  await ouvrirBibliotheque();

  const present = (await formulaire().count()) === 1 && /Ton exercice n'est pas dans la liste/.test(await formulaire().innerText());
  const inactif = await formulaire().getByRole("button", { name: /Ajouter/ }).isDisabled();
  console.log(
    "1. FORMULAIRE           :",
    present && inactif ? "présent dans la bibliothèque, bouton inactif sans nom" : `*** présent ${present}, inactif ${inactif} ***`
  );

  await formulaire().getByRole("textbox", { name: "Nom de ton exercice" }).fill("Tirage landmine");
  await formulaire().getByRole("button", { name: /Ajouter/ }).click();
  await page.waitForTimeout(400);
  const fermee = (await formulaire().count()) === 0;
  const dansSeance = (await valeurs()).filter((v) => v === "Tirage landmine").length;
  const stock = await perso();
  console.log(
    "2. AJOUT                :",
    fermee && dansSeance === 1 && stock.length === 1 && stock[0].name === "Tirage landmine" && stock[0].mode === "muscu"
      ? "dans la séance une seule fois, rangé dans « Mes exercices » sans enregistrer"
      : `*** fermée ${fermee}, dans la séance ${dansSeance}, stock ${JSON.stringify(stock)} ***`
  );

  await ouvrirBibliotheque();
  const texte = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  if (process.env.EXERCICE_TAPE_PNG) await page.screenshot({ path: process.env.EXERCICE_TAPE_PNG });
  console.log(
    "3. MES EXERCICES        :",
    /Mes exercices/i.test(texte) && /Tirage landmine/.test(texte) ? "visible en rouvrant la bibliothèque" : "*** absent ***"
  );

  await formulaire().getByRole("textbox", { name: "Nom de ton exercice" }).fill("presse a cuisses");
  await formulaire().getByRole("textbox", { name: "Nom de ton exercice" }).press("Enter");
  await page.waitForTimeout(400);
  const v = await valeurs();
  const stock2 = await perso();
  console.log(
    "4. NOM CONNU            :",
    v.includes("Presse à cuisses") && !v.includes("presse a cuisses") && stock2.length === 1
      ? "« presse a cuisses » → « Presse à cuisses » de la bibliothèque, pas de doublon perso"
      : `*** valeurs ${JSON.stringify(v.filter(Boolean).slice(0, 12))}, stock ${JSON.stringify(stock2)} ***`
  );

  // Mode Force sans objectif « performance » (retour du coach du 3 octobre
  // 2026 : absent sur un telephone Android dont le profil n'etait pas en
  // performance).
  const modes = page.locator("select").filter({ has: page.locator("option[value='warmup']") });
  const options = await modes.first().locator("option").allInnerTexts();
  await modes.first().selectOption("powerlifting");
  await page.waitForTimeout(300);
  const choisi = await modes.first().inputValue();
  console.log(
    "5. MODE FORCE           :",
    JSON.stringify(options) === JSON.stringify(["Muscu", "PDC", "Cardio", "Warm-up", "Force"]) && choisi === "powerlifting"
      ? "proposé avec l'objectif maintien, choix gardé"
      : `*** options ${JSON.stringify(options)}, choisi ${choisi} ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await ctx.close();
await nav.close();
serveur.close();
