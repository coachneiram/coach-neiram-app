/**
 * Fumée : suivi en coaching (24 octobre 2026).
 *
 *   1. forme notée aujourd'hui (nuit courte, fatigue, stress) : « Ta forme
 *      du jour » apparaît sous la carte du jour, en « Récupération
 *      faible », sans dire de sauter la séance ;
 *   2. la consigne du coach se règle dans la séance type ;
 *   3. elle s'affiche sous l'exercice quand la séance démarre ;
 *   4. défi 30 jours au Journal : choisi, le jour est validé par la séance
 *      notée aujourd'hui ;
 *   5. abandonné (après confirmation), la carte repropose un défi ;
 *   6. sans forme notée, pas de carte de forme.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-suivi-coaching.mjs
 */

import { chromium } from "playwright";
import { appareil, sansAides } from "./appareil.mjs";
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
await new Promise((r) => serveur.listen(4719, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");

const PROFIL = {
  firstName: "Sabine", name: "Sabine", sex: "femme", age: 40, heightCm: 165, startWeightKg: 62,
  activityLevel: "modere", goal: "forme", sessionsPerWeek: 3,
  trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
};

async function ouvrir(avecForme) {
  const ctx = await nav.newContext(appareil());
  await ctx.addInitScript(sansAides);
  await ctx.addInitScript(
    ({ profil, avecForme }) => {
      if (localStorage.getItem("coach_profile")) return;
      const auj = new Date().toISOString().slice(0, 10);
      localStorage.setItem("coach_profile", JSON.stringify(profil));
      localStorage.setItem("coach_routines", JSON.stringify([{
        id: "r1", name: "Bas du corps", color: "#F5A040", programme: true,
        exercises: [
          { id: "p1", name: "Presse à cuisses", mode: "muscu", sets: "3", reps: "10", consigne: "Pieds largeur bassin" },
          { id: "p2", name: "Fentes", mode: "muscu", sets: "3", reps: "10" }
        ]
      }]));
      localStorage.setItem("coach_sessions", JSON.stringify([
        { id: "s0", date: auj, routineId: "autre", name: "Marche", exercises: [{ id: "e0", name: "Vélo", mode: "cardio" }] }
      ]));
      if (avecForme) localStorage.setItem("coach_daily_form", JSON.stringify([{ date: auj, sleepHours: 5, sleepQuality: 1, energy: 1, stress: 9 }]));
    },
    { profil: PROFIL, avecForme }
  );
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto("http://localhost:4719/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  return { ctx, page };
}

const onglet = async (page, nom) => {
  await page.getByRole("button", { name: nom, exact: true }).last().click();
  await page.waitForTimeout(600);
};

// Position d'un element : selecteur CSS, ou texte (regex) d'une feuille.
const haut = (page, sel) =>
  page.evaluate((s) => {
    const el = s.startsWith("[")
      ? document.querySelector(s)
      : [...document.querySelectorAll("div, span, p, h2, h3")].find((x) => x.childElementCount === 0 && new RegExp(s, "i").test(x.textContent.trim()));
    return el ? el.getBoundingClientRect().top + window.scrollY : -1;
  }, sel);

// Une seance est notee aujourd'hui : la carte du jour s'intitule « Séance faite aujourd'hui ».
const CARTE_DU_JOUR = "^(Ta séance du jour|Séance faite aujourd'hui)";

try {
  const { ctx, page } = await ouvrir(true);
  const cle = await page.evaluate(() => Object.keys(localStorage).filter((k) => /daily|form/i.test(k)));
  await onglet(page, "Séances");

  // 1. Forme du jour.
  const forme = page.locator("[data-forme]");
  const niveau = (await forme.count()) ? await forme.getAttribute("data-forme") : null;
  const texte = niveau ? net(await forme.innerText()) : "";
  const yJour = await haut(page, CARTE_DU_JOUR);
  const yForme = await haut(page, "[data-forme]");
  const yTrophees = await haut(page, "^Mes trophées$");
  console.log(
    "1. FORME DU JOUR        :",
    niveau === "recupere" && /Récupération faible/.test(texte) && /bas de ta fourchette/.test(texte) && !/repos\b|mobilité/i.test(texte) && yJour >= 0 && yJour < yForme && yForme < yTrophees
      ? "« Récupération faible » sous la carte du jour, séance gardée (bas de fourchette)"
      : `*** niveau ${niveau}, « ${texte.slice(0, 160)} », y ${yJour}/${yForme}/${yTrophees}, clés ${cle} ***`
  );

  // 2. Consigne dans la seance type.
  await page.evaluate(() => {
    const titre = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && d.textContent.trim() === "Bas du corps" && d.style.fontSize === "15px");
    const crayon = titre && titre.parentElement && titre.parentElement.querySelector("button");
    if (crayon) crayon.click();
  });
  await page.waitForTimeout(400);
  const champs = page.getByRole("textbox", { name: "Consigne du coach (optionnel)" });
  const nbChamps = await champs.count();
  const premiere = nbChamps ? await champs.first().inputValue() : "";
  if (nbChamps > 1) await champs.nth(1).fill("Genou dans l'axe du pied");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.waitForTimeout(500);
  const stockee = await page.evaluate(() => (JSON.parse(localStorage.getItem("coach_routines") || "[]")[0] || {}).exercises || []);
  console.log(
    "2. CONSIGNE (SÉANCE TYPE):",
    nbChamps === 2 && premiere === "Pieds largeur bassin" && stockee[1] && stockee[1].consigne === "Genou dans l'axe du pied"
      ? "un champ par exercice, consigne ajoutée sur Fentes et enregistrée"
      : `*** ${nbChamps} champ(s), « ${premiere} », ${JSON.stringify(stockee)} ***`
  );

  // 3. Consigne pendant la seance.
  // Une seance est deja notee aujourd'hui : on demarre depuis la carte de la seance type.
  await page.getByText("Bas du corps", { exact: true }).first().click();
  await page.waitForTimeout(500);
  const consignes = await page.locator(".modal-panel [data-consigne]").allInnerTexts();
  console.log(
    "3. CONSIGNE (SÉANCE)    :",
    consignes.length === 2 && /Pieds largeur bassin/.test(consignes[0]) && /Genou dans l'axe du pied/.test(consignes[1])
      ? "affichée sous chaque exercice"
      : `*** ${JSON.stringify(consignes)} ***`
  );
  await page.locator(".modal-panel button[aria-label='Fermer']").last().click();
  await page.waitForTimeout(400);

  // 4. Defi 30 jours.
  await onglet(page, "Journal");
  await page.locator("[data-carte-defi]").getByRole("button", { name: "Choisir un défi" }).click();
  await page.waitForTimeout(300);
  await page.locator('[data-choix-defi="bouger"]').click();
  await page.waitForTimeout(400);
  const enCours = await page.locator('[data-defi-en-cours="bouger"]').count();
  const validesTexte = enCours ? await page.locator("[data-defi-valides]").innerText() : "";
  const cases = await page.locator("[data-case-defi]").count();
  const etat = await page.evaluate(() => JSON.parse(localStorage.getItem("cn_defis") || "null"));
  console.log(
    "4. DÉFI 30 JOURS        :",
    enCours === 1 && validesTexte === "1" && cases === 30 && etat && etat.enCours && etat.enCours.id === "bouger"
      ? "« Bouger chaque jour » commencé, aujourd'hui validé par la séance notée, 30 cases"
      : `*** en cours ${enCours}, validés « ${validesTexte} », ${cases} cases, ${JSON.stringify(etat)} ***`
  );

  // 5. Abandon.
  await page.getByRole("button", { name: "Abandonner le défi" }).click();
  await page.waitForTimeout(400);
  const repropose = (await page.locator("[data-carte-defi]").getByRole("button", { name: "Choisir un défi" }).count()) === 1;
  const vide = await page.evaluate(() => (JSON.parse(localStorage.getItem("cn_defis") || "{}") || {}).enCours === null);
  console.log("5. ABANDON              :", repropose && vide ? "défi abandonné, la carte en repropose un" : `*** reproposé ${repropose}, vide ${vide} ***`);
  await ctx.close();

  // 6. Sans forme notee.
  const sans = await ouvrir(false);
  await onglet(sans.page, "Séances");
  const aucune = (await sans.page.locator("[data-forme]").count()) === 0;
  const seanceDuJour = (await haut(sans.page, CARTE_DU_JOUR)) >= 0;
  console.log("6. SANS FORME NOTÉE     :", aucune && seanceDuJour ? "pas de carte de forme, la carte du jour reste" : `*** carte ${!aucune}, séance du jour ${seanceDuJour} ***`);
  await sans.ctx.close();
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
