/**
 * Fumee : une cliente installee depuis l'ancienne adresse retrouve la
 * vraie application, sans rien faire.
 *
 * Signale deux fois sur Android (Samsung S25 pour la seconde) : pas de
 * crayon pour corriger un aliment, pas de bouton « Photographier ». Les
 * captures montraient l'ANCIENNE application — « Prendre / choisir une
 * photo du repas », un seul bouton, un libelle qui n'existe plus que dans
 * l'index.html d'origine a la racine du depot.
 *
 * La cause : une copie de l'application a ete publiee par erreur a
 * /coachneiramapublier/, avec son propre service worker, puis supprimee
 * (commit fafcd65). Les installations faites depuis ce lien gardaient ce
 * service worker ; sw.js y rendant une 404, il ne pouvait plus etre ni mis
 * a jour ni retire, et servait l'ancienne application depuis son cache.
 *
 * Le script rejoue les trois epoques avec un VRAI service worker :
 *
 *   1. « installation » : la copie est en ligne, la cliente l'installe ;
 *   2. « suppression »  : la copie a disparu (404) — la panne : la cliente
 *                          reste sur l'ancienne version, mise a jour
 *                          impossible ;
 *   3. « sauvetage »    : le sauvetage est publie a l'ancienne adresse — la
 *                          cliente doit arriver sur la vraie application.
 *
 * L'ancien service worker est remplace par une doublure qui sert la page
 * depuis son cache : c'est le comportement observe chez les clientes, et
 * le seul qui compte ici. L'ancienne page, elle, depend de React charge
 * depuis un CDN injoignable dans la chaine d'integration ; une page
 * marquee la remplace.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-sauvetage-ancienne-adresse.mjs
 */

import { chromium } from "playwright";
import { appareil } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const ANCIENNE = "/coachneiramapublier/";
const MARQUE = "ANCIENNE-VERSION";
const ALIMENT_ANCIEN = "Filet de dinde saisi dans l'ancienne version";

const ANCIENNE_PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Coach Neiram</title></head>
<body><h1>${MARQUE}</h1><p>Prendre / choisir une photo du repas</p>
<script>navigator.serviceWorker.register("sw.js");</script></body></html>`;

const ANCIEN_SW = `
const CACHE = "coach-neiram-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});`;

let epoque = "installation";

const serveur = createServer((req, res) => {
  const chemin = req.url.split("?")[0];

  if (chemin.startsWith(ANCIENNE) && epoque !== "sauvetage") {
    if (epoque === "suppression") return res.writeHead(404).end("introuvable");
    if (chemin.endsWith("sw.js")) {
      res.writeHead(200, { "Content-Type": "text/javascript" });
      return res.end(ANCIEN_SW);
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(ANCIENNE_PAGE);
  }

  const fichier = chemin.endsWith("/") ? chemin + "index.html" : chemin;
  const c = join(DIST, fichier);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4633, r));
const ORIGINE = "http://localhost:4633";

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];

const inscriptionsAncienne = (page) =>
  page.evaluate(async (ancienne) => {
    const toutes = await navigator.serviceWorker.getRegistrations();
    return toutes.filter((i) => i.scope.includes(ancienne)).length;
  }, ANCIENNE);

try {
  // ── Le sauvetage est-il seulement publie ? ─────────────────────────
  const publie = existsSync(join(DIST, "coachneiramapublier", "sw.js"));
  console.log("0. SAUVETAGE PUBLIÉ   :", publie ? "oui, dans app/dist" : "*** ABSENT DE LA CONSTRUCTION ***");

  const ctx = await nav.newContext(appareil("Pixel 7"));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));

  // ── 1. La cliente installe l'application depuis l'ancienne adresse ──
  await page.goto(ORIGINE + ANCIENNE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: "domcontentloaded" });
  const controlee = await page.evaluate(() => !!navigator.serviceWorker.controller);
  console.log("1. INSTALLATION       :", controlee ? "ancien service worker en place" : "*** AUCUN SERVICE WORKER ***");

  // Des semaines de suivi saisies dans l'ancienne application. Le stockage
  // local est commun a tout le site, pas a une adresse : l'application
  // actuelle lit les memes cles, et doit les retrouver.
  await page.evaluate((aliment) => {
    localStorage.setItem("coach_profile", JSON.stringify({
      firstName: "Nadia", sex: "femme", age: 38, heightCm: 164, startWeightKg: 68,
      activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, targetWeightKg: 62,
      trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
    }));
    localStorage.setItem("coach_log_entries", JSON.stringify([
      { id: "h1", date: new Date().toISOString().slice(0, 10), mealType: "dejeuner", name: aliment,
        calories: 310, protein: 42, carbs: 8, fat: 12 }
    ]));
  }, ALIMENT_ANCIEN);

  // ── 2. La copie disparait : la panne ───────────────────────────────
  epoque = "suppression";
  await page.reload({ waitUntil: "domcontentloaded" });
  const figee = (await page.content()).includes(MARQUE);
  const miseAJour = await page.evaluate(async () => {
    const i = await navigator.serviceWorker.getRegistration();
    try {
      await i.update();
      return "acceptée";
    } catch (e) {
      return "refusée";
    }
  });
  console.log(
    "2. PANNE REPRODUITE   :",
    figee && miseAJour === "refusée"
      ? "ancienne version servie depuis le cache, mise à jour refusée (404)"
      : `*** NON REPRODUITE (ancienne page : ${figee}, mise à jour : ${miseAJour}) ***`
  );

  // ── 3. Le sauvetage est publie a l'ancienne adresse ────────────────
  //
  // Le navigateur verifie sw.js a chaque lancement ; update() declenche
  // exactement cette verification, sans attendre son propre calendrier.
  epoque = "sauvetage";
  const arrivee = page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 15000 });
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((i) => i.update()));
  await arrivee;
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);

  const surApp = (await page.getByRole("button", { name: "Journal", exact: true }).count()) > 0;
  const encoreAncienne = (await page.content()).includes(MARQUE);
  console.log(
    "3. SAUVETAGE          :",
    surApp && !encoreAncienne
      ? `redirigée vers ${new URL(page.url()).pathname} — application actuelle affichée`
      : `*** TOUJOURS BLOQUÉE (adresse ${page.url()}, ancienne page : ${encoreAncienne}) ***`
  );

  if (surApp) {
    await page.getByRole("button", { name: "Journal", exact: true }).first().click();
    await page.waitForTimeout(600);
  }
  const retrouve = (await page.locator("body").innerText()).includes(ALIMENT_ANCIEN);
  console.log("   données conservées  :", retrouve ? "le journal saisi avant est là" : "*** JOURNAL PERDU ***");

  const restantes = await inscriptionsAncienne(page);
  console.log("   ancien SW retiré    :", restantes === 0 ? "oui" : `*** ${restantes} INSCRIPTION(S) RESTANTE(S) ***`);

  const caches = await page.evaluate(() => caches.keys());
  console.log(
    "   ancien cache vidé   :",
    caches.includes("coach-neiram-v1") ? "*** coach-neiram-v1 TOUJOURS LÀ ***" : "oui"
  );

  // ── 4. Et le jour suivant ? ────────────────────────────────────────
  //
  // L'icone installee pointe toujours vers l'ancienne adresse. Sans
  // service worker, c'est la page de redirection qui doit prendre le
  // relais, a chaque lancement.
  await page.goto(ORIGINE + ANCIENNE, { waitUntil: "domcontentloaded" });
  await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 10000 }).catch(() => {});
  console.log(
    "4. LANCEMENT SUIVANT  :",
    new URL(page.url()).pathname === "/"
      ? "l'ancienne icône mène à l'application actuelle"
      : `*** RESTE SUR ${new URL(page.url()).pathname} ***`
  );

  await ctx.close();
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
