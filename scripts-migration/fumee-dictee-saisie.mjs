/**
 * Fumee : dicter un plat, une recette ou une seance (demande du coach du
 * 12 octobre 2026).
 *
 *   1. Repas → « Dicter un plat » : le micro (simule) remplit le texte,
 *      l'IA (proxy simule) estime, la fiche du plat s'ouvre remplie, le
 *      client corrige et enregistre ;
 *   2. Repas → Nouvelle recette → « Dicter toute la recette » : nom, parts
 *      et ingredients remplis, tableau des parts, recette enregistree ;
 *   3. Seances → seance type → « Dicter ma séance » : l'exercice deja
 *      present est mis a jour (pas double), le nouveau s'ajoute, la duree,
 *      le RPE et les notes sont remplis, la seance s'enregistre ;
 *   4. navigateur sans reconnaissance vocale : pas de bouton micro, le
 *      texte tape (micro du clavier) passe quand meme.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-dictee-saisie.mjs
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
await new Promise((r) => serveur.listen(4702, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];

const REPONSES = {
  plat: { name: "Bol du matin", portion: "50 g d'avoine, 200 g de skyr, 1 banane", calories: 480, protein: 30, carbs: 70, fat: 7, confidence: "moyenne" },
  recette: {
    nom: "Quiche lorraine",
    parts: 6,
    ingredients: [
      { nom: "Pâte brisée", grammes: 230, calories: 1000, protein: 13, carbs: 105, fat: 58 },
      { nom: "Lardons", grammes: 200, calories: 540, protein: 30, carbs: 1, fat: 46 },
      { nom: "Œufs", grammes: 165, calories: 236, protein: 21, carbs: 1, fat: 16 }
    ],
    confidence: "moyenne"
  },
  seance: {
    exercices: [
      { nom: "Développé couché", type: "muscu", series: 4, reps: 8, unite: "reps", charge_kg: 62.5, rpe: 8 },
      { nom: "Rowing barre", type: "muscu", series: 3, reps: 10, unite: "reps", charge_kg: 50, rpe: 0 }
    ],
    duree_min: 55,
    rpe: 7,
    notes: "Épaule droite un peu raide"
  }
};

const DICTE = "squat quatre séries de huit";

async function nouvellePage({ dictee }) {
  const ctx = await nav.newContext(appareil("Pixel 7"));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("dialog", (d) => d.accept());

  const prompts = [];
  await page.route("**/ai", async (route) => {
    const prompt = JSON.parse(route.request().postData()).messages.at(-1).parts.map((p) => p.text || "").join("");
    prompts.push(prompt);
    const type = /recette maison/.test(prompt) ? "recette" : /séance de sport/.test(prompt) ? "seance" : "plat";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(REPONSES[type]) }] } }] })
    });
  });
  await page.route("**/world.openfoodfacts.org/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [] }) })
  );

  await page.addInitScript(
    ({ avecDictee, dicte }) => {
      delete window.SpeechRecognition;
      delete window.webkitSpeechRecognition;
      if (avecDictee) {
        window.webkitSpeechRecognition = class {
          start() {
            setTimeout(() => this.onresult && this.onresult({ results: [[{ transcript: dicte }]] }), 150);
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
        trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
      }));
      localStorage.setItem("coach_log_entries", JSON.stringify([]));
      localStorage.setItem("cn_meal_presets", JSON.stringify([]));
      localStorage.setItem("coach_dishes", JSON.stringify([]));
      localStorage.setItem("coach_routines", JSON.stringify([
        { id: "r1", name: "Haut du corps", description: "Pecs / Dos", color: "#2DD4BF" }
      ]));
      localStorage.setItem("coach_sessions", JSON.stringify([
        { id: "s1", date: "2026-09-03", routineId: "r1", durationMin: 62, rpe: 8,
          exercises: [{ id: "e1", name: "Développé couché", mode: "muscu", sets: 4, reps: 8, weight: "60", rpe: "6" }] }
      ]));
    },
    { avecDictee: dictee, dicte: DICTE }
  );

  await page.goto("http://localhost:4702/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  return { ctx, page, prompts };
}

const lire = (page, cle) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "[]"), cle);
const modale = (page) => page.locator(".modal-panel").last();

/** Dicte dans la zone ouverte, puis « Remplir avec l'IA ». */
async function dicterEtRemplir(page, zone) {
  await zone.getByRole("button", { name: "🎤 Dicter", exact: true }).click();
  await page.waitForTimeout(400);
  const saisi = await zone.locator("textarea").inputValue();
  await zone.getByRole("button", { name: /Arrêter/ }).click();
  await page.waitForTimeout(200);
  await zone.getByRole("button", { name: /Remplir avec l'IA/ }).click();
  await page.waitForTimeout(900);
  return saisi;
}

try {
  // ── 1. Plat dicté ────────────────────────────────────────────────
  {
    const { ctx, page, prompts } = await nouvellePage({ dictee: true });
    await page.getByRole("button", { name: "Repas", exact: true }).first().click();
    await page.waitForTimeout(500);
    const ouvrir = page.getByRole("button", { name: /Dicter un plat/ });
    console.log("1. PLAT — BOUTON       :", (await ouvrir.count()) ? "« 🎤 Dicter un plat » dans Mes plats" : "*** ABSENT ***");
    await ouvrir.click();
    await page.waitForTimeout(300);
    const saisi = await dicterEtRemplir(page, page.locator('[data-dictee="plat"]'));
    const fiche = modale(page);
    const nom = await fiche.locator("input").first().inputValue();
    const kcal = await fiche.locator('input[type="number"]').first().inputValue();
    console.log(
      "   fiche remplie       :",
      saisi === DICTE && prompts.some((p) => p.includes(DICTE)) && nom === "Bol du matin" && kcal === "480"
        ? "texte dicté envoyé, « Bol du matin » 480 kcal à vérifier"
        : `*** saisi « ${saisi} », nom « ${nom} », kcal ${kcal} ***`
    );
    await fiche.locator('input[type="number"]').first().fill("450");
    await fiche.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await page.waitForTimeout(400);
    const plats = await lire(page, "coach_dishes");
    console.log(
      "   enregistré          :",
      plats.length === 1 && plats[0].name === "Bol du matin" && plats[0].calories === 450 && plats[0].protein === 30
        ? "1 plat, 450 kcal (corrigées), P30"
        : `*** ${JSON.stringify(plats).slice(0, 160)} ***`
    );
    await ctx.close();
  }

  // ── 2. Recette dictée ────────────────────────────────────────────
  {
    const { ctx, page } = await nouvellePage({ dictee: true });
    await page.getByRole("button", { name: "Repas", exact: true }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /Nouvelle recette/ }).first().click();
    await page.waitForTimeout(500);
    const m = modale(page);
    const ouvrir = m.getByRole("button", { name: /Dicter toute la recette/ });
    console.log("2. RECETTE — BOUTON    :", (await ouvrir.count()) ? "« 🎤 Dicter toute la recette » dans l'éditeur" : "*** ABSENT ***");
    await ouvrir.click();
    await page.waitForTimeout(300);
    await dicterEtRemplir(page, m.locator('[data-dictee="recette"]'));
    const nom = await m.getByPlaceholder(/Quiche lorraine/).inputValue();
    const parts = await m.getByPlaceholder("Ex : 6").inputValue();
    const texte = await m.innerText();
    const lignes = ["Pâte brisée (230 g)", "Lardons (200 g)", "Œufs (165 g)"].filter((l) => texte.includes(l)).length;
    console.log(
      "   éditeur rempli      :",
      nom === "Quiche lorraine" && parts === "6" && lignes === 3 && /Recette entière \(6 parts\)/.test(texte)
        ? "nom, 6 parts, 3 ingrédients, tableau des parts"
        : `*** nom « ${nom} », parts ${parts}, ${lignes} ingrédient(s) ***`
    );
    // Le client retire un ingredient avant d'enregistrer.
    await m.getByRole("button", { name: "Retirer l'ingrédient" }).last().click();
    await page.waitForTimeout(200);
    await m.getByRole("button", { name: "Enregistrer la recette", exact: true }).click();
    await page.waitForTimeout(400);
    const recettes = (await lire(page, "cn_meal_presets")).filter((r) => r.recette);
    console.log(
      "   enregistrée         :",
      recettes.length === 1 && recettes[0].name === "Quiche lorraine" && recettes[0].portions === 6 && recettes[0].items.length === 2 && recettes[0].items[1].grams === 200
        ? "6 parts, 2 ingrédients (1 retiré), 200 g de lardons"
        : `*** ${JSON.stringify(recettes).slice(0, 200)} ***`
    );
    await ctx.close();
  }

  // ── 3. Séance dictée ─────────────────────────────────────────────
  {
    const { ctx, page } = await nouvellePage({ dictee: true });
    await page.getByRole("button", { name: /^(Séances|Entraînements)$/ }).first().click();
    await page.waitForTimeout(400);
    await page.getByText("Haut du corps").first().click();
    await page.waitForTimeout(400);
    const m = modale(page);
    const ouvrir = m.getByRole("button", { name: /Dicter ma séance/ });
    console.log("3. SÉANCE — BOUTON     :", (await ouvrir.count()) ? "« 🎤 Dicter ma séance » sous les exercices" : "*** ABSENT ***");
    await ouvrir.click();
    await page.waitForTimeout(300);
    await dicterEtRemplir(page, m.locator('[data-dictee="seance"]'));
    const champs = await m.locator("input").evaluateAll((els) => els.map((e) => e.value));
    const notes = await m.locator("textarea").last().inputValue();
    console.log(
      "   séance remplie      :",
      champs.includes("62.5") && champs.includes("50") && champs.includes("55") && champs.includes("Rowing barre") && /Épaule droite/.test(notes)
        ? "62,5 kg au développé, rowing ajouté, 55 min, notes"
        : `*** champs ${JSON.stringify(champs)}, notes « ${notes} » ***`
    );
    await m.getByRole("button", { name: "Enregistrer la séance", exact: true }).click();
    await page.waitForTimeout(500);
    const seances = await lire(page, "coach_sessions");
    const nouvelle = seances.find((s) => s.id !== "s1");
    const noms = (nouvelle?.exercises || []).map((e) => e.name);
    const dc = (nouvelle?.exercises || []).find((e) => e.name === "Développé couché");
    console.log(
      "   enregistrée         :",
      nouvelle && noms.length === 2 && noms[1] === "Rowing barre" && dc?.weight === "62.5" && dc?.sets === "4" && String(nouvelle.rpe) === "7"
        ? "développé mis à jour (pas doublé), rowing ajouté, RPE 7"
        : `*** ${JSON.stringify(nouvelle).slice(0, 220)} ***`
    );
    await ctx.close();
  }

  // ── 4. Sans reconnaissance vocale ───────────────────────────────
  {
    const { ctx, page } = await nouvellePage({ dictee: false });
    await page.getByRole("button", { name: "Repas", exact: true }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /Dicter un plat/ }).click();
    await page.waitForTimeout(300);
    const zone = page.locator('[data-dictee="plat"]');
    const micro = await zone.getByRole("button", { name: "🎤 Dicter", exact: true }).count();
    const aide = await zone.innerText();
    await zone.locator("textarea").fill("un bol de skyr et une banane");
    await zone.getByRole("button", { name: /Remplir avec l'IA/ }).click();
    await page.waitForTimeout(900);
    const nom = await modale(page).locator("input").first().inputValue();
    console.log(
      "4. SANS DICTÉE         :",
      micro === 0 && /micro de ton clavier/.test(aide) && nom === "Bol du matin"
        ? "pas de bouton micro, renvoi au micro du clavier, texte tapé estimé"
        : `*** micro ${micro}, nom « ${nom} » ***`
    );
    await ctx.close();
  }
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
