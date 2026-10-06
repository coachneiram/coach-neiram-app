/**
 * Fumee : progression du corps (poids et mensurations), 6 octobre 2026.
 *
 * Client en perte de poids, trois prises de mesures et trois pesees :
 *   1. Mesures : la carte « Ma progression » annonce les centimetres et les
 *      kilos perdus depuis la premiere mesure, une tuile par grandeur avec
 *      sa mini-courbe, le poids en tete ;
 *   2. Mesures : la derniere prise affiche aussi le poids, en kg ;
 *   3. Mesures : toucher la tuile du poids trace la courbe « Évolution —
 *      Poids » ;
 *   4. Tendances : la meme carte, la meme phrase ;
 *   5. Tendances : le bilan mensuel montre l'evolution du mois en clair ;
 *   6. le bilan envoye au coach contient la progression et ses mini-courbes ;
 *   7. un client sans mesure reprise ne voit aucune carte vide.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-progression-corps.mjs
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
await new Promise((r) => serveur.listen(4692, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];

async function ouvrir(avecMesures) {
  const ctx = await nav.newContext(appareil("Pixel 7"));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript((mesures) => {
    window.__partages = [];
    navigator.canShare = () => true;
    navigator.share = async (d) => {
      const f = d.files && d.files[0];
      window.__partages.push(f ? { fichier: f.name, texte: await f.text() } : { texte: d.text });
    };
    if (localStorage.getItem("coach_profile")) return;
    const auj = new Date();
    const jour = (k) => {
      const d = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - k);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    localStorage.setItem("coach_profile", JSON.stringify({
      name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 88,
      activityLevel: "modere", goal: "perte", sessionsPerWeek: 3,
      trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
    }));
    localStorage.setItem("coach_log_entries", JSON.stringify([{ id: "e1", date: jour(0), mealType: "dejeuner", name: "Repas", calories: 600, protein: 40, carbs: 60, fat: 20 }]));
    if (mesures) {
      localStorage.setItem("coach_measurements", JSON.stringify([
        { id: "m1", date: jour(56), taille: 96, hanches: 103, brasD: 34 },
        { id: "m2", date: jour(28), taille: 93, hanches: 101.5, brasD: 33.5 },
        { id: "m3", date: jour(0), taille: 91, hanches: 100, brasD: 33.5 }
      ]));
      localStorage.setItem("coach_body_logs", JSON.stringify([
        { id: "b1", date: jour(56), weightKg: 88 },
        { id: "b2", date: jour(28), weightKg: 86.4 },
        { id: "b3", date: jour(0), weightKg: 85.1 }
      ]));
    }
  }, avecMesures);
  await page.goto("http://localhost:4692/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  return { ctx, page };
}

const onglet = async (page, nom) => {
  await page.getByRole("button", { name: nom, exact: true }).first().click();
  await page.waitForTimeout(800);
};

try {
  const { ctx, page } = await ouvrir(true);

  // 1. Mesures : la carte de progression.
  await onglet(page, "Mesures");
  const carte = page.locator("[data-progression-corps]");
  const titre = (await carte.count()) ? (await page.locator("[data-titre-progression]").innerText()).trim() : "";
  const tuiles = await page.$$eval("[data-tuile-progression]", (els) =>
    els.map((e) => ({ id: e.dataset.tuileProgression, texte: e.innerText.replace(/\s+/g, " "), courbe: !!e.querySelector("polyline[points]") }))
  );
  console.log(
    "1. CARTE PROGRESSION    :",
    /^−8 cm au total et −2,9 kg depuis le \d{2} \S+ \d{4}\. Continue, ça se voit !$/.test(titre) &&
      tuiles[0]?.id === "poids" &&
      /85,1 ?kg −2,9/.test(tuiles[0].texte) &&
      tuiles.some((t) => t.id === "taille" && /91 ?cm −5/.test(t.texte)) &&
      tuiles.every((t) => t.courbe)
      ? `« ${titre} », ${tuiles.length} tuiles avec mini-courbe, poids en tête`
      : `*** « ${titre} » ${JSON.stringify(tuiles)} ***`
  );

  // 2. Derniere prise : le poids est affiche.
  const corps = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const derniere = corps.slice(corps.indexOf("Dernière prise"), corps.indexOf("Dernière prise") + 300);
  console.log(
    "2. POIDS DE LA PRISE    :",
    /Poids 85\.1kg -1\.3/.test(derniere) ? "poids du jour de la prise, écart avec la précédente" : `*** ${derniere} ***`
  );

  // 3. Toucher la tuile du poids trace sa courbe.
  await page.locator('[data-tuile-progression="poids"]').click();
  await page.waitForTimeout(500);
  const apres = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const choix = await page.locator("select").first().inputValue();
  console.log(
    "3. COURBE DU POIDS      :",
    /Évolution — Poids/i.test(apres) && choix === "poids" ? "« Évolution — Poids » tracée, liste sur Poids" : `*** choix ${choix} ***`
  );

  // 4 et 5. Tendances.
  await onglet(page, "Tendances");
  await page.waitForTimeout(700);
  const titreT = (await page.locator("[data-titre-progression]").count())
    ? (await page.locator("[data-titre-progression]").innerText()).trim()
    : "";
  console.log("4. TENDANCES            :", titreT === titre ? "même carte, même phrase" : `*** « ${titreT} » ***`);
  const mois = (await page.locator("[data-evolution-mois]").count())
    ? (await page.locator("[data-evolution-mois]").innerText()).replace(/\s+/g, " ")
    : "";
  console.log(
    "5. BILAN MENSUEL        :",
    /Évolution du mois/i.test(mois) && /Poids 85,1 kg \(−/.test(mois) && /Taille 91 cm \(−/.test(mois)
      ? "poids et mensurations du mois en clair"
      : `*** « ${mois} » ***`
  );

  // 6. Le bilan envoye au coach.
  await page.getByRole("button", { name: /Envoyer sans bilan IA/ }).click();
  await page.waitForTimeout(1200);
  const envoi = (await page.evaluate(() => window.__partages)).find((p) => p.fichier) || {};
  const html = envoi.texte || "";
  console.log(
    "6. BILAN DU COACH       :",
    /Progression depuis le/.test(html) &&
      /−8 cm au total et −2,9 kg/.test(html) &&
      (html.match(/<polyline /g) || []).length === tuiles.length
      ? `« ${envoi.fichier} » : phrase, tableau et ${tuiles.length} mini-courbes`
      : `*** ${envoi.fichier} ${html.length} caractères ***`
  );
  await ctx.close();

  // 7. Sans mesure : aucune carte vide.
  const sans = await ouvrir(false);
  await onglet(sans.page, "Mesures");
  const a = await sans.page.locator("[data-progression-corps]").count();
  await onglet(sans.page, "Tendances");
  const b = await sans.page.locator("[data-progression-corps]").count();
  const c = await sans.page.locator("[data-evolution-mois]").count();
  console.log("7. SANS MESURE          :", a + b + c === 0 ? "aucune carte vide" : `*** ${a} ${b} ${c} ***`);
  await sans.ctx.close();
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
