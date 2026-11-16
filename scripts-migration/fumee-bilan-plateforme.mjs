/**
 * Fumée : envoyer le bilan de la semaine à la plateforme Coach Neiram
 * (16 novembre 2026). Aucun vrai appel : la plateforme est simulée par
 * l'interception des requêtes du navigateur, avec un faux code.
 *
 *   1. sans code : message qui renvoie aux Réglages, aucune requête partie ;
 *   2. Réglages : le code se normalise, une faute de format est refusée ;
 *   3. mauvais code : la requête porte les bons en-têtes et un JSON valide,
 *      la réponse 401 donne « Code plateforme incorrect » ;
 *   4. sans PDF, 200 : « Bilan envoyé », « Déjà envoyé le », le rappel du
 *      dimanche est éteint ;
 *   5. double appui : une seule requête, bouton désactivé pendant l'envoi ;
 *   6. 429 (message du serveur) et réseau coupé ;
 *   7. le rappel du dimanche (?raccourci=bilan) ouvre Tendances sur le bouton ;
 *   8. le partage du fichier existe toujours.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-bilan-plateforme.mjs
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
  const chemin = req.url.split("?")[0];
  const c = join(DIST, chemin === "/" ? "index.html" : chemin);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4751, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext({ ...appareil(), acceptDownloads: true });
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  const d = new Date();
  const auj = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Sabine", name: "Sabine", sex: "femme", age: 42, heightCm: 165, startWeightKg: 72,
    activityLevel: "actif", goal: "maintien", sessionsPerWeek: 3, trainingMode: "app", coachingMode: "presentiel",
    dietType: "aucun", allergies: [], reportReminderEnabled: false
  }));
  localStorage.setItem("coach_body_logs", JSON.stringify([{ id: "b1", date: auj, weightKg: 71.1 }]));
  localStorage.setItem("coach_log_entries", JSON.stringify([{ id: "l1", date: auj, mealType: "dejeuner", name: "Poulet riz", calories: 620, protein: 48, carbs: 70, fat: 12 }]));
  localStorage.setItem("coach_daily_form", JSON.stringify([{ date: auj, energy: 4, stress: 5, steps: 8400, waterMl: 1750, sleepQuality: 3 }]));
});

// La plateforme simulée : chaque requête est notée, la réponse se règle.
const requetes = [];
let reponse = { status: 200, corps: { ok: true, week: "2026-W47" }, delai: 0 };
await ctx.route("https://coach-neiram-os.pelissier-marien.workers.dev/**", async (route) => {
  const r = route.request();
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-neiram-code" };
  if (r.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
  requetes.push({ url: r.url(), methode: r.method(), entetes: r.headers(), corps: r.postData() });
  if (reponse.reseau) return route.abort("failed");
  if (reponse.delai) await new Promise((ok) => setTimeout(ok, reponse.delai));
  return route.fulfill({ status: reponse.status, contentType: "application/json", headers: cors, body: JSON.stringify(reponse.corps) });
});

const aller = async (chemin = "/") => {
  await page.goto("http://localhost:4751" + chemin, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
};
const versTendances = async () => {
  await page.getByRole("button", { name: "Tendances", exact: true }).last().click();
  await page.waitForTimeout(500);
};
const envoyer = () => page.locator("[data-envoyer-plateforme]");
const message = async () => net(await page.locator("[data-plateforme-message]").innerText().catch(() => ""));

try {
  await aller();
  await versTendances();

  // 1. Sans code.
  await envoyer().click();
  await page.waitForTimeout(300);
  const sansCode = await message();
  console.log(
    "1. SANS CODE            :",
    /Colle d'abord ton code plateforme dans les Réglages/.test(sansCode) && requetes.length === 0 ? "renvoi vers les Réglages, aucune requête" : `*** « ${sansCode} » requêtes ${requetes.length} ***`
  );

  // 2. Réglages.
  await page.getByRole("button", { name: "Ouvrir les Réglages" }).click();
  await page.waitForTimeout(500);
  const aide = net(await page.locator("[data-carte-plateforme]").innerText().catch(() => ""));
  const champ = page.locator("[data-code-plateforme]");
  await champ.fill("pas un code");
  await page.locator("[data-carte-plateforme]").getByRole("button", { name: "Enregistrer", exact: true }).click();
  const refus = net(await page.locator("[data-carte-plateforme]").innerText());
  await champ.fill("  neiram test12 ");
  await page.locator("[data-carte-plateforme]").getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.waitForTimeout(200);
  const accepte = net(await page.locator("[data-carte-plateforme]").innerText());
  const stocke = await page.evaluate(() => localStorage.getItem("acces_plateforme"));
  console.log(
    "2. CODE                 :",
    /C'est le code reçu dans ton invitation à la plateforme\. À coller une seule fois\./.test(aide) &&
      /pas le bon format/.test(refus) &&
      /Code enregistré : NEIRAM-TEST12/.test(accepte) &&
      stocke === "NEIRAM-TEST12"
      ? "aide affichée, format refusé, « neiram test12 » devient NEIRAM-TEST12"
      : `*** aide « ${aide.slice(0, 80)} » refus « ${refus.slice(-60)} » accepté « ${accepte.slice(-50)} » stocké ${stocke} ***`
  );

  // 3. Mauvais code (401) : les en-têtes, le JSON.
  await aller();
  await versTendances();
  reponse = { status: 401, corps: { ok: false, error: "code" }, delai: 0 };
  await envoyer().click();
  await page.waitForTimeout(400);
  const m401 = await message();
  const q = requetes[requetes.length - 1] || {};
  let corps = null;
  try {
    corps = JSON.parse(q.corps);
  } catch (e) {
    corps = null;
  }
  console.log(
    "3. MAUVAIS CODE (401)   :",
    q.url === "https://coach-neiram-os.pelissier-marien.workers.dev/api/app/bilan" &&
      q.methode === "POST" &&
      q.entetes["x-neiram-code"] === "NEIRAM-TEST12" &&
      /application\/json/.test(q.entetes["content-type"]) &&
      corps && corps.data && typeof corps.resume === "string" && !("pdf" in corps) && !("week" in corps) && !("week" in corps.data) &&
      /Code plateforme incorrect : vérifie-le dans les réglages\./.test(m401)
      ? `POST /api/app/bilan, X-Neiram-Code et JSON valides (${Object.keys(corps.data).join(", ")}), sans pdf ni week, message 401`
      : `*** ${q.url} ${q.methode} code ${q.entetes && q.entetes["x-neiram-code"]} corps ${q.corps && q.corps.slice(0, 120)} message « ${m401} » ***`
  );
  console.log("   data envoyée         :", JSON.stringify(corps && corps.data));

  // 4. Succès, sans PDF.
  reponse = { status: 200, corps: { ok: true, week: "2026-W47" }, delai: 0 };
  await envoyer().click();
  await page.waitForTimeout(400);
  const ok = await message();
  const deja = net(await page.locator("[data-plateforme-deja]").first().innerText().catch(() => ""));
  const memo = await page.evaluate(() => ({ envois: JSON.parse(localStorage.getItem("cn_bilans_plateforme") || "{}"), marque: localStorage.getItem("coach_report_last_sent") }));
  console.log(
    "4. ENVOI RÉUSSI (200)   :",
    /Bilan envoyé à ton coach ✔/.test(ok) && /^Déjà envoyé le \d{2}\/\d{2} à \d+ h \d{2}\./.test(deja) && Object.keys(memo.envois).length === 1 && !!memo.marque
      ? `« ${ok} », « ${deja.slice(0, 32)} », semaine mémorisée, rappel du dimanche éteint`
      : `*** « ${ok} » « ${deja} » ${JSON.stringify(memo)} ***`
  );

  // 5. Double appui.
  const avant = requetes.length;
  reponse = { status: 200, corps: { ok: true, week: "2026-W47" }, delai: 700 };
  await envoyer().dblclick();
  await page.waitForTimeout(150);
  const desactive = await envoyer().isDisabled();
  const pendant = net(await envoyer().innerText());
  await page.waitForTimeout(1200);
  const reactive = !(await envoyer().isDisabled());
  console.log(
    "5. DOUBLE APPUI         :",
    requetes.length - avant === 1 && desactive && /Envoi en cours/.test(pendant) && reactive ? "une seule requête, bouton désactivé « Envoi en cours… » puis réactivé (renvoi possible)" : `*** requêtes ${requetes.length - avant}, désactivé ${desactive}, « ${pendant} », réactivé ${reactive} ***`
  );

  // 6. 429 et réseau coupé.
  reponse = { status: 429, corps: { ok: false, error: "Déjà 5 envois aujourd'hui, réessaie demain." }, delai: 0 };
  await envoyer().click();
  await page.waitForTimeout(400);
  const m429 = await message();
  reponse = { reseau: true };
  await envoyer().click();
  await page.waitForTimeout(500);
  const mReseau = await message();
  const reste = !(await envoyer().isDisabled());
  console.log(
    "6. 429 ET RÉSEAU        :",
    /Déjà 5 envois aujourd'hui, réessaie demain\./.test(m429) && /Envoi impossible, réessaie\./.test(mReseau) && reste ? "message du serveur affiché tel quel, « Envoi impossible, réessaie », bouton de nouveau utilisable" : `*** « ${m429} » « ${mReseau} » ***`
  );

  // 7. Le rappel du dimanche amène au bouton.
  await aller("/?raccourci=bilan");
  await page.waitForTimeout(600);
  const surTendances = await page.evaluate(() => !!document.querySelector("[data-bilan-plateforme]"));
  const focus = await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-envoyer-plateforme"));
  console.log("7. RAPPEL DIMANCHE      :", surTendances && focus ? "?raccourci=bilan ouvre Tendances, focus sur « Envoyer à mon coach »" : `*** Tendances ${surTendances}, focus ${focus} ***`);

  // 8. Le fichier se partage toujours.
  const telechargement = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
  await page.getByRole("button", { name: "Partager le fichier du bilan" }).click();
  const dl = await telechargement;
  console.log("8. FICHIER DU BILAN     :", dl && /^bilan-.*\.html$/.test(dl.suggestedFilename()) ? `toujours partagé (${dl.suggestedFilename()})` : "*** aucun fichier ***");
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
