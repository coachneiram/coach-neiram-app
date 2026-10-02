/**
 * Fumee : recettes du coach (Repas → Mes plats).
 *
 *   1. client vegan : seule la recette vegan est affichee ;
 *   2. client en performance : « Pour toi » sans la recette hors objectif,
 *      « Toutes » les montre toutes ;
 *   3. la fiche affiche ingredients, etapes et macros par portion (fibres
 *      comprises) ;
 *   4. « Ajouter a mes recettes » la range dans les recettes du client, une
 *      seule fois, avec les macros de la recette entiere ;
 *   5. « Sans porc » est propose dans le profil ;
 *   6. aucune etiquette de regime (« Vegan », « Sans porc »...) sur la liste
 *      ni sur la fiche (choix du coach du 2 octobre 2026).
 * Capture pour controle visuel (RECETTES_PNG).
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-recettes-coach.mjs
 */

import { chromium } from "playwright";
import { appareil } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RECETTES_COACH } from "../app/src/lib/recettes-coach-catalogue.js";
import { recettesPourClient } from "../app/src/lib/recettes-coach.js";

// Attentes calculees sur le catalogue reel, avec la meme fonction que
// l'ecran : la routine ajoute des recettes chaque semaine.
const attendus = (profil, filtre) => recettesPourClient(RECETTES_COACH, { allergies: [], ...profil }, filtre).map((r) => r.id);

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4651, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];
let listeVegan = "";
let ficheBowl = "";
const DAHL = "2026-10-01-dahl-lentilles-corail-epinards";
const BOWL = "2026-10-01-bowl-poulet-haricots-rouges";

async function ouvrir(profil) {
  const ctx = await nav.newContext(appareil("Pixel 7"));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript((p) => {
    if (localStorage.getItem("coach_profile")) return;
    localStorage.setItem("coach_profile", JSON.stringify({
      firstName: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 80,
      activityLevel: "modere", sessionsPerWeek: 3, trainingMode: "app", coachingMode: "enligne", allergies: [], ...p
    }));
  }, profil);
  await page.goto("http://localhost:4651/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Repas", exact: true }).first().click();
  await page.waitForTimeout(800);
  return { ctx, page };
}
const visibles = (page) => page.$$eval("[data-recette-coach]", (els) => els.map((e) => e.dataset.recetteCoach));

try {
  {
    const { ctx, page } = await ouvrir({ goal: "maintien", dietType: "vegetalien" });
    const profilVegan = { goal: "maintien", dietType: "vegetalien" };
    // L'ecran s'ouvre sur « Pour toi » (recettes de son objectif), puis
    // « Toutes » montre tout ce qui est compatible avec son regime.
    const pourToi = await visibles(page);
    await page.locator('[data-filtre="toutes"]').click();
    await page.waitForTimeout(300);
    const toutes = await visibles(page);
    const attenduPourToi = attendus(profilVegan, "pour-toi");
    const attenduToutes = attendus(profilVegan);
    const veganSeulement = toutes.every((id) => RECETTES_COACH.find((r) => r.id === id).regimes.includes("vegan"));
    listeVegan = await page.locator("[data-recettes-coach]").innerText();
    console.log(
      "1. VEGAN                 :",
      JSON.stringify(pourToi) === JSON.stringify(attenduPourToi) &&
        JSON.stringify(toutes) === JSON.stringify(attenduToutes) &&
        toutes.includes(DAHL) &&
        !toutes.includes(BOWL) &&
        veganSeulement
        ? `« Pour toi » ${pourToi.length}, « Toutes » ${toutes.length} recettes, toutes vegan`
        : `*** pour toi ${JSON.stringify(pourToi)}, toutes ${JSON.stringify(toutes)} ***`
    );
    await ctx.close();
  }
  {
    const { ctx, page } = await ouvrir({ goal: "performance", dietType: "aucun" });
    const pourToi = await visibles(page);
    await page.locator('[data-filtre="toutes"]').click();
    await page.waitForTimeout(300);
    const toutes = await visibles(page);
    console.log(
      "2. OBJECTIF              :",
      !pourToi.includes(DAHL) &&
      JSON.stringify(pourToi) === JSON.stringify(attendus({ goal: "performance", dietType: "aucun" }, "pour-toi")) &&
      toutes.length === RECETTES_COACH.length
        ? `« Pour toi » ${pourToi.length} recettes de performance, « Toutes » ${toutes.length}`
        : `*** pour toi ${JSON.stringify(pourToi)}, toutes ${JSON.stringify(toutes)} ***`
    );

    await page.locator(`[data-recette-coach="${BOWL}"]`).click();
    await page.waitForTimeout(400);
    const fiche = (await page.locator(`[data-recette-detail="${BOWL}"]`).innerText().catch(() => "")).replace(/\s+/g, " ");
    ficheBowl = fiche;
    console.log(
      "3. FICHE                 :",
      /Blanc de poulet : 150 g/.test(fiche) && /Dresse le riz/.test(fiche) && /747 kcal/.test(fiche) && /12 g Fibres/.test(fiche) && /par portion/.test(fiche)
        ? "ingrédients, étapes, 747 kcal et 12 g de fibres par portion"
        : `*** « ${fiche.slice(0, 200)} » ***`
    );
    if (process.env.RECETTES_PNG) await page.screenshot({ path: process.env.RECETTES_PNG });

    await page.getByRole("button", { name: "Ajouter à mes recettes" }).click();
    await page.waitForTimeout(400);
    const deja = await page.getByRole("button", { name: /Dans mes recettes/ }).count();
    const stock = await page.evaluate(() => JSON.parse(localStorage.getItem("cn_meal_presets") || "[]"));
    const r = stock.find((x) => x.origine === "2026-10-01-bowl-poulet-haricots-rouges");
    await page.getByRole("button", { name: "Fermer" }).first().click();
    await page.waitForTimeout(300);
    const texte = await page.locator("body").innerText();
    console.log(
      "4. AJOUT                 :",
      deja === 1 && r && r.recette && r.portions === 1 && r.items[0].calories === 747 && stock.length === 1 && texte.includes("Bowl poulet, riz et haricots rouges")
        ? "rangée une fois dans « Mes recettes », 747 kcal, bouton désactivé ensuite"
        : `*** déjà ${deja}, stock ${JSON.stringify(stock).slice(0, 200)} ***`
    );
    await ctx.close();
  }
  {
    const { ctx, page } = await ouvrir({ goal: "maintien", dietType: "aucun" });
    const options = await page.$$eval("option", (os) => os.map((o) => o.textContent));
    // Le profil est dans les reglages : on verifie l'option dans la page des reglages.
    await page.locator('button[aria-label="Réglages"], header button').last().click().catch(() => {});
    await page.waitForTimeout(800);
    const options2 = await page.$$eval("option", (os) => os.map((o) => o.textContent));
    const ok = [...options, ...options2].includes("Sans porc");
    console.log("5. PROFIL SANS PORC      :", ok ? "option « Sans porc » proposée" : "*** option absente ***");
    await ctx.close();
  }
  {
    const etiquette = /Vegan|Végétarien|Sans porc/;
    console.log(
      "6. SANS ÉTIQUETTE        :",
      listeVegan && ficheBowl && !etiquette.test(listeVegan) && !etiquette.test(ficheBowl)
        ? "aucune étiquette de régime sur la liste ni sur la fiche"
        : `*** liste « ${listeVegan.match(etiquette)} », fiche « ${ficheBowl.match(etiquette)} » ***`
    );
  }
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
