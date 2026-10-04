/**
 * Fumee : synchro coach activee d'office pour le coaching en ligne
 * (4 octobre 2026).
 *
 * Client en ligne, SANS « lien de synchro » au profil, un pointage en file :
 *   1. a l'ouverture, la file part vers le proxy (/coach-sync) ; le proxy
 *      refuse ({ ok: false }) : le pointage reste en file ;
 *   2. le telephone perd puis retrouve le reseau : la file repart seule, le
 *      proxy accepte, la file est vide ;
 *   3. aucun envoi ne contient de secret ni d'adresse de script Google ;
 *   4. Reglages : le champ « lien de synchro » a disparu, une phrase dit au
 *      client ce qui est envoye a son coach ;
 *   5. une seance enregistree depuis le constructeur part au coach comme
 *      pointage (elle n'arrivait jamais dans son Journal) ;
 *   6. creneaux manques, synchro active : « Prevenir mon coach » reste
 *      propose et ouvre WhatsApp avec le message pre-ecrit ;
 *   7. garde-fou : servie en local SANS autorisation explicite, l'application
 *      n'envoie rien au proxy (un test de fumee ecrivait en production).
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-synchro-auto.mjs
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
await new Promise((r) => serveur.listen(4661, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil("Pixel 7"));
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));

// Le proxy est simule : il refuse tant que `accepter` est faux.
let accepter = false;
const recus = [];
await page.route("**/coach-sync", async (route) => {
  recus.push({ url: route.request().url(), corps: route.request().postData() });
  await route.fulfill({
    status: accepter ? 200 : 502,
    contentType: "application/json",
    body: JSON.stringify({ ok: accepter })
  });
});

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("cn_synchro_locale", "1"); // /coach-sync est intercepte ici
  localStorage.setItem("coach_profile", JSON.stringify({
    name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 80,
    activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_routines", JSON.stringify([{ id: "r1", name: "Haut du corps", description: "Pecs / Dos", color: "#2DD4BF" }]));
  localStorage.setItem("cn_coach_outbox", JSON.stringify([
    { type: "pointage", date: "2026-10-04", creneau: "Samedi 10:00", heureReelle: "10:05", client: "Thomas", envoyeLe: "2026-10-04T08:05:00Z" }
  ]));
});

const file = () => page.evaluate(() => JSON.parse(localStorage.getItem("cn_coach_outbox") || "[]").length);

try {
  await page.goto("http://localhost:4661/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const envoisRefus = recus.length;
  const resteEnFile = await file();
  console.log(
    "1. OUVERTURE, REFUS     :",
    envoisRefus >= 1 && resteEnFile === 1
      ? "la file part vers /coach-sync sans lien au profil ; refus du proxy : le pointage reste en file"
      : `*** envois ${envoisRefus}, en file ${resteEnFile} ***`
  );

  accepter = true;
  await ctx.setOffline(true);
  await page.waitForTimeout(300);
  await ctx.setOffline(false);
  await page.waitForTimeout(1200);
  const apres = await file();
  console.log(
    "2. RETOUR DU RESEAU     :",
    apres === 0 && recus.length > envoisRefus ? "la file repart seule, acceptée : file vide" : `*** en file ${apres}, envois ${recus.length} ***`
  );

  const fuite = recus.some((r) => /secret|script\.google|\/exec/.test(r.corps) || !/\/coach-sync$/.test(r.url));
  console.log(
    "3. CE QUI PART          :",
    !fuite && recus.every((r) => JSON.parse(r.corps).client === "Thomas")
      ? "vers le proxy uniquement, sans secret ni adresse de script"
      : `*** ${JSON.stringify(recus)} ***`
  );

  await page.locator('button[aria-label="Réglages"]').first().click();
  await page.waitForTimeout(600);
  const info = page.locator("[data-synchro-coach]");
  const texte = (await info.count()) ? (await info.first().innerText()).replace(/\s+/g, " ") : "";
  const ancienChamp = await page.locator("input[placeholder*='script.google']").count();
  console.log(
    "4. RÉGLAGES             :",
    /envoyés automatiquement au tableau de bord de ton coach/.test(texte) && ancienChamp === 0
      ? "plus de lien à recopier, le client est informé de ce qui est envoyé"
      : `*** info « ${texte} », ancien champ ${ancienChamp} ***`
  );

  // 5. Seance du constructeur : un pointage part au coach.
  // La fenetre Reglages se ferme par un rechargement (la file est vide).
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const avant = recus.length;
  await page.getByRole("button", { name: "Séances", exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.getByText("Haut du corps").first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Enregistrer la séance" }).click();
  await page.waitForTimeout(1200);
  const pointages = recus.slice(avant).map((r) => JSON.parse(r.corps)).filter((c) => c.type === "pointage");
  console.log(
    "5. SÉANCE CONSTRUCTEUR  :",
    pointages.length === 1 && pointages[0].client === "Thomas" && /^\d{4}-\d{2}-\d{2}$/.test(pointages[0].date)
      ? "la séance enregistrée part au coach comme pointage, une seule fois"
      : `*** ${JSON.stringify(recus.slice(avant))} ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

// 6. Synchro active ET creneaux manques : le bouton WhatsApp reste la.
try {
  const ctx2 = await nav.newContext(appareil("Pixel 7"));
  const page2 = await ctx2.newPage();
  page2.on("pageerror", (e) => erreurs.push(e.message));
  await page2.route("**/coach-sync", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  );
  await page2.addInitScript(() => {
    window.__ouverts = [];
    window.open = (url) => {
      window.__ouverts.push(String(url));
      return null;
    };
    if (localStorage.getItem("coach_profile")) return;
    // Deux creneaux par semaine, crees il y a longtemps, aucune seance :
    // plusieurs creneaux manques sur les 14 derniers jours.
    localStorage.setItem("cn_synchro_locale", "1"); // /coach-sync est intercepte ici
  localStorage.setItem("coach_profile", JSON.stringify({
      name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 80,
      activityLevel: "modere", goal: "maintien", sessionsPerWeek: 2,
      trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: [],
      slots: [
        { id: "c1", day: "mon", time: "18:30", place: "", createdAt: "2026-01-01" },
        { id: "c2", day: "thu", time: "18:30", place: "", createdAt: "2026-01-01" }
      ]
    }));
  });
  await page2.goto("http://localhost:4661/", { waitUntil: "domcontentloaded" });
  await page2.waitForTimeout(1200);
  await page2.getByRole("button", { name: "Séances", exact: true }).first().click();
  await page2.waitForTimeout(600);
  const bouton = page2.getByRole("button", { name: /Prévenir mon coach/ });
  const visible = (await bouton.count()) === 1;
  if (visible) await bouton.click();
  await page2.waitForTimeout(300);
  const ouverts = await page2.evaluate(() => window.__ouverts);
  console.log(
    "6. PRÉVENIR MON COACH   :",
    visible && /^https:\/\/wa\.me\/\d+\?text=.*manqu/.test(ouverts[0] || "")
      ? "bouton présent malgré la synchro, ouvre WhatsApp avec le message pré-écrit"
      : `*** bouton ${visible}, ouverts ${JSON.stringify(ouverts)} ***`
  );
  await ctx2.close();
} catch (e) {
  console.log("ECHEC 6 :", e.message.split("\n")[0]);
}

// 7. Garde-fou : en local, sans « cn_synchro_locale », aucun envoi.
try {
  const ctx3 = await nav.newContext(appareil("Pixel 7"));
  const page3 = await ctx3.newPage();
  const tentatives = [];
  await page3.route("**/coach-sync", (route) => {
    tentatives.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page3.addInitScript(() => {
    if (localStorage.getItem("coach_profile")) return;
    localStorage.setItem("coach_profile", JSON.stringify({
      name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 80,
      activityLevel: "modere", goal: "maintien", sessionsPerWeek: 2,
      trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: [],
      slots: [{ id: "c1", day: "mon", time: "18:30", place: "", createdAt: "2026-01-01" }]
    }));
    localStorage.setItem("cn_coach_outbox", JSON.stringify([{ type: "pointage", date: "2026-10-04", client: "Thomas" }]));
  });
  await page3.goto("http://localhost:4661/", { waitUntil: "domcontentloaded" });
  await page3.waitForTimeout(1500);
  console.log(
    "7. GARDE-FOU LOCAL      :",
    tentatives.length === 0 ? "aucun envoi vers le proxy sans autorisation explicite" : `*** ${tentatives.length} envoi(s) ***`
  );
  await ctx3.close();
} catch (e) {
  console.log("ECHEC 7 :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await ctx.close();
await nav.close();
serveur.close();
