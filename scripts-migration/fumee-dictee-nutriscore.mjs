/**
 * Fumee : decrire son repas (tape ou dicte), et badges Nutri-Score / NOVA.
 *
 * Deux ajouts a la recherche d'aliments (Journal → « + ajouter » →
 * Aliments), d'apres MyFitnessPal, Lifesum et Yuka :
 *   1. un produit Open Food Facts affiche son Nutri-Score et son groupe
 *      NOVA en liste, et le sens du groupe NOVA sur la fiche ;
 *   2. « Décrire » : le micro remplit la description (reconnaissance vocale
 *      simulee), l'IA l'estime (proxy simule), la cliente corrige, ajoute ;
 *   3. sans reconnaissance vocale dans le navigateur, pas de bouton micro,
 *      et la description tapee fonctionne quand meme.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-dictee-nutriscore.mjs
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
await new Promise((r) => serveur.listen(4643, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];

const PRODUIT = {
  product_name: "Biscuits fourrés test", brands: "Marque", code: "3000000000017",
  nutriments: { "energy-kcal_100g": 480, proteins_100g: 6, carbohydrates_100g: 68, fat_100g: 20 },
  nutrition_grades: "d", nova_group: 4
};

async function nouvellePage({ dictee }) {
  const ctx = await nav.newContext(appareil("Pixel 7"));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));

  let urlOFF = "";
  await page.route("**/world.openfoodfacts.org/**", (route) => {
    urlOFF = route.request().url();
    const parCode = urlOFF.includes("/product/");
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(parCode ? { product: PRODUIT } : { products: [PRODUIT] })
    });
  });

  const prompts = [];
  await page.route("**/ai", async (route) => {
    prompts.push(JSON.parse(route.request().postData()).messages.at(-1).parts.map((p) => p.text).join(""));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        candidates: [{ content: { parts: [{ text:
          '{"name":"Oeufs brouillés et tartine","portion":"2 oeufs, 1 tranche","calories":320,"protein":18,"carbs":22,"fat":17,"confidence":"moyenne"}'
        }] } }]
      })
    });
  });

  await page.addInitScript((avecDictee) => {
    // Chromium sans interface n'a pas de reconnaissance vocale utilisable :
    // on la simule (ou on la retire) pour tester les deux cas.
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    if (avecDictee) {
      window.__dicteeLangue = null;
      window.webkitSpeechRecognition = class {
        start() {
          window.__dicteeLangue = this.lang;
          setTimeout(() => this.onresult && this.onresult({ results: [[{ transcript: "deux oeufs brouillés" }]] }), 150);
          setTimeout(
            () => this.onresult && this.onresult({ results: [[{ transcript: "deux oeufs brouillés" }], [{ transcript: " et une tartine" }]] }),
            300
          );
        }
        stop() {
          setTimeout(() => this.onend && this.onend(), 20);
        }
      };
    }
    if (localStorage.getItem("coach_profile")) return;
    localStorage.setItem("coach_profile", JSON.stringify({
      firstName: "Claire", sex: "femme", age: 35, heightCm: 166, startWeightKg: 64,
      activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3, targetWeightKg: 62,
      trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
    }));
    localStorage.setItem("coach_log_entries", JSON.stringify([]));
    localStorage.setItem("cn_meal_presets", JSON.stringify([]));
  }, dictee);

  await page.goto("http://localhost:4643/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Journal", exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "+ ajouter", exact: true }).first().click();
  await page.waitForTimeout(400);
  const modale = page.locator(".modal-panel").last();
  await modale.getByRole("button", { name: "Aliments", exact: true }).click();
  await page.waitForTimeout(300);
  return { ctx, page, modale, prompts, urlOFF: () => urlOFF };
}

const lire = (page, cle) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "[]"), cle);

try {
  // ── 1. Badges Nutri-Score / NOVA ────────────────────────────────
  {
    const { ctx, page, modale, urlOFF } = await nouvellePage({ dictee: true });
    await modale.getByPlaceholder(/skyr, riz basmati/).fill("biscuits fourrés test");
    await modale.getByRole("button", { name: "Chercher", exact: true }).click();
    await page.waitForTimeout(900);
    const ligne = modale.locator("button", { hasText: "Biscuits fourrés test" }).first();
    const texteLigne = await ligne.innerText();
    console.log(
      "1. BADGES EN LISTE     :",
      /Nutri-Score D/.test(texteLigne) && /NOVA 4/.test(texteLigne) ? "« Nutri-Score D » et « NOVA 4 »" : `*** ${texteLigne.replace(/\n/g, " | ")} ***`
    );
    console.log("   champs demandés     :", /nutrition_grades/.test(urlOFF()) && /nova_group/.test(urlOFF()) ? "nutrition_grades et nova_group" : "*** CHAMPS NON DEMANDÉS ***");
    await ligne.click();
    await page.waitForTimeout(300);
    const fiche = await modale.innerText();
    console.log("   sur la fiche        :", /ultra-transformé/.test(fiche) ? "« NOVA 4 · ultra-transformé »" : "*** SENS NOVA ABSENT ***");

    // Scan (numero tape) : meme badge.
    await modale.getByRole("button", { name: "Code-barres", exact: true }).click();
    await page.waitForTimeout(200);
    await modale.getByPlaceholder(/tape le numéro/).fill("3000000000017");
    await modale.getByRole("button", { name: "OK", exact: true }).click();
    await page.waitForTimeout(700);
    const scan = await modale.innerText();
    console.log("   après scan          :", /Nutri-Score D/.test(scan) && /ultra-transformé/.test(scan) ? "badges affichés" : "*** BADGES ABSENTS AU SCAN ***");
    await ctx.close();
  }

  // ── 2. Décrire à la voix, estimer, ajouter ──────────────────────
  {
    const { ctx, page, modale, prompts } = await nouvellePage({ dictee: true });
    await modale.getByRole("button", { name: "Décrire", exact: true }).click();
    await page.waitForTimeout(300);
    const micro = modale.getByRole("button", { name: /Dicter/ });
    console.log("2. BOUTON MICRO        :", (await micro.count()) ? "« 🎤 Dicter » affiché" : "*** ABSENT ***");
    await micro.click();
    await page.waitForTimeout(500);
    const pendant = await modale.innerText();
    const saisi = await modale.locator("textarea").inputValue();
    console.log(
      "   dictée              :",
      saisi === "deux oeufs brouillés et une tartine" && /Je t'écoute/.test(pendant) && (await page.evaluate(() => window.__dicteeLangue)) === "fr-FR"
        ? "texte reconnu en français, « Je t'écoute… » affiché"
        : `*** « ${saisi} » ***`
    );
    await modale.getByRole("button", { name: /Arrêter/ }).click();
    await page.waitForTimeout(200);
    await modale.getByRole("button", { name: /Estimer avec l'IA/ }).click();
    await page.waitForTimeout(800);
    const resultat = await modale.innerText();
    console.log(
      "   estimation IA       :",
      /Estimation IA \(moyenne\)/.test(resultat) && prompts.some((p) => p.includes("deux oeufs brouillés et une tartine"))
        ? "description envoyée, estimation affichée"
        : "*** PAS D'ESTIMATION ***"
    );
    await modale.locator('input[type="number"]').first().fill("300");
    await modale.getByRole("button", { name: "Ajouter", exact: true }).last().click();
    await page.waitForTimeout(500);
    const journal = await lire(page, "coach_log_entries");
    console.log(
      "   ajouté au journal   :",
      journal.length === 1 && journal[0].name === "Oeufs brouillés et tartine" && journal[0].calories === 300 && journal[0].protein === 18
        ? "1 ligne, 300 kcal (corrigées), P18"
        : `*** ${JSON.stringify(journal).slice(0, 160)} ***`
    );
    await ctx.close();
  }

  // ── 3. Navigateur sans dictée ───────────────────────────────────
  {
    const { ctx, page, modale } = await nouvellePage({ dictee: false });
    await modale.getByRole("button", { name: "Décrire", exact: true }).click();
    await page.waitForTimeout(300);
    const micro = await modale.getByRole("button", { name: /Dicter/ }).count();
    await modale.locator("textarea").fill("une assiette de pâtes bolognaise");
    await modale.getByRole("button", { name: /Estimer avec l'IA/ }).click();
    await page.waitForTimeout(800);
    const r = await modale.innerText();
    console.log(
      "3. SANS DICTÉE         :",
      micro === 0 && /Estimation IA/.test(r) ? "pas de bouton micro, description tapée estimée" : `*** micro ${micro}, estimation ${/Estimation IA/.test(r)} ***`
    );
    await ctx.close();
  }
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
