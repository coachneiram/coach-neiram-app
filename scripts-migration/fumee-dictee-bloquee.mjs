/**
 * Fumee : la dictee ne bloque jamais l'ecran.
 *
 * Signalement du 29 septembre 2026 : « j'ai teste la dictee, ca a freeze
 * mon appli ». Certains navigateurs exposent la reconnaissance vocale mais
 * ne repondent jamais (ni resultat, ni erreur, ni fin) : l'ecran restait sur
 * « Je t'ecoute... » et « Arreter » n'y faisait rien. Et une estimation IA
 * sans reponse du serveur laissait « Estimation... » pour toujours.
 *
 *   1. moteur muet, « Arreter » touche : l'ecran se debloque en 2 s ;
 *   2. moteur muet, on ne touche a rien : message clair apres 15 s ;
 *   3. serveur IA qui ne repond jamais : message apres 30 s, bouton rendu ;
 *   4. l'app reste utilisable : on tape une description et on l'estime.
 *
 * Ancien en-tete, conserve pour la structure :
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
await new Promise((r) => serveur.listen(4645, r));

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
  let iaMuette = false;
  const rendreIaMuette = (v) => (iaMuette = v);
  await page.route("**/ai", async (route) => {
    if (iaMuette) return; // ni reponse ni erreur : le serveur « pend »
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
        start() {}
        stop() {}
        abort() {
          window.__abandon = (window.__abandon || 0) + 1;
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

  await page.goto("http://localhost:4645/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Journal", exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "+ ajouter", exact: true }).first().click();
  await page.waitForTimeout(400);
  const modale = page.locator(".modal-panel").last();
  await modale.getByRole("button", { name: "Aliments", exact: true }).click();
  await page.waitForTimeout(300);
  return { ctx, page, modale, prompts, urlOFF: () => urlOFF, rendreIaMuette };
}

const texteModale = async (m) => (await m.innerText()).replace(/\s+/g, " ");

try {
  const { ctx, page, modale, rendreIaMuette } = await nouvellePage({ dictee: true });
  await modale.getByRole("button", { name: "Décrire", exact: true }).click();
  await page.waitForTimeout(300);

  // ── 1. Moteur muet, « Arreter » ─────────────────────────────────
  await modale.getByRole("button", { name: /Dicter/ }).click();
  await page.waitForTimeout(300);
  const pendant = await texteModale(modale);
  await modale.getByRole("button", { name: /Arrêter/ }).click();
  await page.waitForTimeout(2600);
  let apres = await texteModale(modale);
  console.log(
    "1. ARRÊTER SANS RÉPONSE :",
    /Je t'écoute/.test(pendant) && /Dicter/.test(apres) && !/Je t'écoute/.test(apres)
      ? "écran débloqué en moins de 3 s, bouton « Dicter » rendu"
      : `*** TOUJOURS BLOQUÉ : « ${apres.slice(0, 120)} » ***`
  );

  // ── 2. Moteur muet, on attend ───────────────────────────────────
  await modale.getByRole("button", { name: /Dicter/ }).click();
  await page.waitForTimeout(15800);
  apres = await texteModale(modale);
  console.log(
    "2. DICTÉE MUETTE        :",
    /La dictée ne répond pas sur ce navigateur/.test(apres) && /Dicter/.test(apres) && !/Je t'écoute/.test(apres)
      ? "message « micro du clavier » après 15 s, écran débloqué"
      : `*** « ${apres.slice(0, 160)} » ***`
  );

  // ── 3. Serveur IA qui ne repond jamais ──────────────────────────
  rendreIaMuette(true);
  await modale.locator("textarea").fill("deux oeufs et une tartine");
  await modale.getByRole("button", { name: /Estimer avec l'IA/ }).click();
  await page.waitForTimeout(1000);
  const attente = await texteModale(modale);
  await page.waitForTimeout(31000);
  apres = await texteModale(modale);
  console.log(
    "3. IA SANS RÉPONSE      :",
    /Estimation\.\.\./.test(attente) && /trop de temps/.test(apres) && /Estimer avec l'IA/.test(apres)
      ? "« L'IA met trop de temps à répondre » après 30 s, bouton rendu"
      : `*** « ${apres.slice(0, 160)} » ***`
  );

  // ── 4. L'app reste utilisable ───────────────────────────────────
  rendreIaMuette(false);
  await modale.getByRole("button", { name: /Estimer avec l'IA/ }).click();
  await page.waitForTimeout(1000);
  apres = await texteModale(modale);
  console.log("4. ENSUITE              :", /Estimation IA \(moyenne\)/.test(apres) ? "l'estimation fonctionne à nouveau" : "*** APP INUTILISABLE ***");
  await ctx.close();
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
