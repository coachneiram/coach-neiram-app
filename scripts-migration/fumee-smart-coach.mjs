/**
 * Fumée : Smart Coach (25 octobre 2026), côté application des clients.
 *
 * /coach-sync est un faux, intercepté par page.route (rien ne part au
 * classeur du coach). /presence passe par le VRAI Worker
 * (worker/coach-neiram-proxy.js) sur une base D1 en mémoire
 * (tests/faux-d1.mjs), avec un vrai code d'invitation activé.
 *
 *   1. client en ligne, objectif perte, 3 semaines de pesées stables : il
 *      tape son poids du jour (touche par touche) → une alerte_poids
 *      « info » (stagnation), pas de fausse variation pendant la frappe ;
 *      une seconde pesée ne la renvoie pas ;
 *   2. 7 jours de repas hors cible → alerte_nutrition « attention » ;
 *   3. présence envoyée à l'ouverture, une seule fois dans la journée
 *      (rechargement : rien de plus), date de dernière saisie dans D1 ;
 *   4. client en présentiel, mêmes données : rien ne part ;
 *   5. inactivité (tâche planifiée du vrai Worker, à 8 h 30 heure de Paris) :
 *      seules les saisies comptent. Dernière saisie il y a 5 jours →
 *      « attention » ; le client ouvre l'appli sans rien noter → le niveau
 *      reste, pas de seconde alerte ; il ouvre un téléphone qui a des
 *      saisies récentes → remise à zéro.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-smart-coach.mjs
 */

import { chromium } from "playwright";
import { appareil, nomAppareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
globalThis.__COACH_TEST__ = globalThis.__COACH_TEST__ || {};
const { default: worker } = await import("../worker/coach-neiram-proxy.js");
const { alerterInactivite } = globalThis.__COACH_TEST__;
import { fauxD1 } from "../tests/faux-d1.mjs";

const PORT = 4733;
const URL_APP = `http://localhost:${PORT}/`;
const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(PORT, r));

const ADMIN = "faux-admin-secret-de-fumee-0123456789-abcdef";
const env = { ADMIN_SECRET: ADMIN, DB: fauxD1(), ALLOWED_ORIGINS: `http://localhost:${PORT}` };
const logOrigine = console.log;
const silencieux = async (fn) => {
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = logOrigine;
  }
};
const appelWorker = (chemin, corps, entetes = {}) =>
  silencieux(async () => {
    const r = await worker.fetch(new Request("https://proxy.test" + chemin, { method: "POST", headers: { "Content-Type": "application/json", ...entetes }, body: JSON.stringify(corps) }), env);
    return { statut: r.status, corps: await r.json() };
  });
async function clientActive(libelle) {
  const inv = (await appelWorker("/admin/invitations", { libelle }, { Authorization: "Bearer " + ADMIN })).corps;
  const act = (await appelWorker("/auth/activer", { code: inv.code })).corps;
  return { jeton: act.jeton, client: inv.client, libelle };
}
const sql = (r, ...v) => env.DB.sqlite.prepare(r).all(...v);

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];

/** Un téléphone : profil, 3 semaines de pesées, 7 jours de repas trop riches. */
async function telephone(q, coachingMode, { vide = false } = {}) {
  const ctx = await nav.newContext(appareil());
  await ctx.addInitScript(sansAides);
  await ctx.addInitScript(
    ({ jeton, libelle, coachingMode, vide }) => {
      if (localStorage.getItem("coach_profile")) return;
      const auj = new Date().toISOString().slice(0, 10);
      const jour = (k) => {
        const d = new Date(auj + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() - k);
        return d.toISOString().slice(0, 10);
      };
      localStorage.setItem("cn_synchro_locale", "1"); // /coach-sync et /presence interceptés
      localStorage.setItem("acces_neiram", JSON.stringify({ jeton, libelle, activeLe: new Date().toISOString() }));
      localStorage.setItem(
        "coach_profile",
        JSON.stringify({ name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 85, activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, trainingMode: "app", coachingMode, dietType: "aucun", allergies: [] })
      );
      if (vide) return; // aucune saisie sur ce téléphone
      // Deux pesées par semaine sur 3 semaines, toutes à 85 kg (hier compris).
      localStorage.setItem("coach_body_logs", JSON.stringify([1, 4, 8, 11, 15, 18].map((k) => ({ id: "b" + k, date: jour(k), weightKg: 85 }))));
      // 7 jours complets à 4 000 kcal (cible autour de 2 300).
      localStorage.setItem(
        "coach_log_entries",
        JSON.stringify([1, 2, 3, 4, 5, 6, 7].flatMap((k) => [
          { id: "m" + k + "a", date: jour(k), mealType: "dejeuner", name: "Burger frites", calories: 2000, protein: 80, carbs: 200, fat: 90 },
          { id: "m" + k + "b", date: jour(k), mealType: "diner", name: "Pizza", calories: 2000, protein: 80, carbs: 220, fat: 80 }
        ]))
      );
    },
    { jeton: q.jeton, libelle: q.libelle, coachingMode, vide }
  );
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  const recus = [];
  const presences = [];
  await page.route("**/coach-sync", async (route) => {
    try {
      recus.push(JSON.parse(route.request().postData() || "{}"));
    } catch (e) {
      recus.push({});
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.route("**/presence", async (route) => {
    const req = route.request();
    presences.push(JSON.parse(req.postData() || "{}"));
    const r = await silencieux(() => worker.fetch(new Request("https://proxy.test/presence", { method: "POST", headers: req.headers(), body: req.postData() || "" }), env));
    await route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() });
  });
  return { ctx, page, recus, presences };
}

const alertes = (recus, type) => recus.filter((e) => e.type === type);
const champPoids = (page) => page.locator('xpath=//label[normalize-space()="Poids (kg)"]/following-sibling::input').first();

try {
  const thomas = await clientActive("Thomas B.");
  const { ctx, page, recus, presences } = await telephone(thomas, "enligne");
  await page.goto(URL_APP, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // 2. Nutrition (à l'ouverture).
  const nutrition = alertes(recus, "alerte_nutrition");
  console.log(
    "2. NUTRITION            :",
    nutrition.length === 1 && nutrition[0].niveau === "attention" && /^Calories hors cible 7 jours sur 7 \(moyenne 4 000 kcal pour [\d ]+\)$/.test(nutrition[0].message)
      ? `« ${nutrition[0].message} » (attention)`
      : `*** ${JSON.stringify(nutrition)} ***`
  );

  // 1. Poids : frappe touche par touche dans le champ du jour.
  const avantPoids = alertes(recus, "alerte_poids").length;
  await champPoids(page).scrollIntoViewIfNeeded();
  await champPoids(page).click();
  await champPoids(page).pressSequentially("85", { delay: 250 });
  await page.waitForTimeout(4500);
  const poids = alertes(recus, "alerte_poids");
  const charge = JSON.stringify(poids[0] || {});
  // Seconde pesée (correction à 85,1) : pas de nouvelle alerte avant 14 jours.
  await champPoids(page).fill("85.1");
  await page.waitForTimeout(4500);
  const poidsApres = alertes(recus, "alerte_poids").length;
  console.log(
    "1. POIDS                :",
    avantPoids === 0 && poids.length === 1 && poids[0].niveau === "info" && poids[0].message === "Poids stable depuis 3 semaines en phase de perte" && !/"8"|85|weightKg|pesees/.test(charge.replace(/"envoyeLe":"[^"]*"/, "")) && poidsApres === 1
      ? "une alerte_poids « info » (stagnation), aucune pesée dans l'envoi, rien pendant la frappe, pas de renvoi à la pesée suivante"
      : `*** avant ${avantPoids}, ${JSON.stringify(poids)}, après ${poidsApres} ***`
  );

  // 3. Présence : une à l'ouverture, aucune au rechargement.
  const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const ligne1 = sql("SELECT derniere_saisie, niveau FROM presence WHERE client_id = ?", thomas.client)[0];
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const nutritionApres = alertes(recus, "alerte_nutrition").length;
  console.log(
    "3. PRÉSENCE             :",
    presences.length === 1 && JSON.stringify(presences[0]) === JSON.stringify({ derniereSaisie: hier }) && ligne1 && ligne1.derniere_saisie === hier && nutritionApres === 1
      ? `une présence { derniereSaisie: "${hier}" } (rien d'autre), enregistrée dans D1 ; rechargement : ni présence ni alerte nutrition de plus`
      : `*** ${presences.length} présence(s) ${JSON.stringify(presences)}, D1 ${JSON.stringify(ligne1)}, nutrition ${nutritionApres} ***`
  );
  const niveaux = recus.filter((e) => /^alerte_/.test(e.type)).map((e) => e.type + ":" + e.niveau);
  console.log("   ALERTES REÇUES       :", JSON.stringify(niveaux));
  await ctx.close();

  // 4. Présentiel : mêmes données, rien ne part.
  const lea = await clientActive("Léa R.");
  const p = await telephone(lea, "presentiel");
  await p.page.goto(URL_APP, { waitUntil: "domcontentloaded" });
  await p.page.waitForTimeout(2500);
  await champPoids(p.page).scrollIntoViewIfNeeded();
  await champPoids(p.page).pressSequentially("85", { delay: 250 });
  await p.page.waitForTimeout(4500);
  const smart = p.recus.filter((e) => /^alerte_(poids|nutrition|inactivite)$/.test(e.type));
  console.log(
    "4. PRÉSENTIEL           :",
    smart.length === 0 && p.presences.length === 0 && sql("SELECT COUNT(*) AS n FROM presence WHERE client_id = ?", lea.client)[0].n === 0
      ? "aucune alerte poids ni nutrition, aucune présence envoyée"
      : `*** ${JSON.stringify(smart)}, ${p.presences.length} présence(s) ***`
  );
  await p.ctx.close();

  // 5. Inactivite : la tache planifiee du vrai Worker, signee vers un faux script.
  env.COACH_SYNC_URL = "https://script.google.com/macros/s/FAUX/exec";
  env.COACH_SYNC_SECRET = "faux-secret-de-synchro-de-fumee-0123456789";
  const versScript = [];
  const fetchOrigine = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    versScript.push(JSON.parse(JSON.parse(init.body).charge));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  // 8 h 30 a Paris aujourd'hui (le Worker compte en dates de Paris).
  const auj = new Date().toISOString().slice(0, 10);
  const matin = [6, 7].map((h) => Date.parse(`${auj}T0${h}:30:00Z`)).find((t) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric" }).format(new Date(t)).startsWith("08"));
  const ilYa5 = new Date(Date.parse(auj + "T12:00:00Z") - 5 * 86400000).toISOString().slice(0, 10);
  sql("UPDATE presence SET derniere_saisie = ?, niveau = NULL, alerte_le = NULL WHERE client_id = ?", ilYa5, thomas.client);
  const b1 = await silencieux(() => alerterInactivite(env, matin));
  const niveau1 = sql("SELECT niveau FROM presence WHERE client_id = ?", thomas.client)[0].niveau;
  // Il ouvre l'appli sur un telephone sans saisie : presence, mais rien de neuf.
  const v = await telephone(thomas, "enligne", { vide: true });
  await v.page.goto(URL_APP, { waitUntil: "domcontentloaded" });
  await v.page.waitForTimeout(2500);
  await v.ctx.close();
  const apresOuverture = sql("SELECT niveau, derniere_saisie FROM presence WHERE client_id = ?", thomas.client)[0];
  const b2 = await silencieux(() => alerterInactivite(env, matin + 86400000));
  // Il ouvre son telephone habituel (saisies jusqu'a hier) : la saisie avance.
  const r = await telephone(thomas, "enligne");
  await r.page.goto(URL_APP, { waitUntil: "domcontentloaded" });
  await r.page.waitForTimeout(2500);
  await r.ctx.close();
  const apresSaisie = sql("SELECT niveau, derniere_saisie FROM presence WHERE client_id = ?", thomas.client)[0];
  globalThis.fetch = fetchOrigine;
  const ev = versScript[0] || {};
  console.log(
    "5. INACTIVITÉ           :",
    b1.envoyees === 1 && versScript.length === 1 && ev.type === "alerte_inactivite" && ev.client === "Thomas B." && ev.niveau === "attention" && ev.nbJours === 5 && ev.message === "Aucune saisie depuis 5 jours" &&
      niveau1 === "attention" && v.presences.length === 1 && v.presences[0].derniereSaisie === null && apresOuverture.niveau === "attention" && apresOuverture.derniere_saisie === ilYa5 &&
      b2.envoyees === 0 && apresSaisie.niveau === null && apresSaisie.derniere_saisie === hier
      ? `« ${ev.message} » (attention) ; ouverture sans saisie : niveau gardé, pas de seconde alerte ; saisie du ${hier} : remise à zéro`
      : `*** ${JSON.stringify(b1)} ${JSON.stringify(versScript)} ${niveau1} ${JSON.stringify(v.presences)} ${JSON.stringify(apresOuverture)} ${JSON.stringify(b2)} ${JSON.stringify(apresSaisie)} ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("APPAREIL :", nomAppareil());
console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
