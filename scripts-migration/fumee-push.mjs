/**
 * Fumee : rappels push de bout en bout (7 octobre 2026).
 *
 * L'application tourne dans Chromium ; derriere elle, le VRAI code du
 * Worker (worker/coach-neiram-proxy.js) tourne ici, avec un stockage KV en
 * memoire. Seul le service de notification d'Apple ou de Google est
 * simule : le telephone factice a de vraies cles de chiffrement, et l'on
 * dechiffre ce que le Worker lui envoie.
 *
 *   1. le serveur est pret : Reglages propose « Recevoir mes rappels meme
 *      appli fermee » ;
 *   2. l'activer abonne le telephone et envoie le planning : creneau de
 *      demain 1 h avant, bilan du dimanche ; le prenom ne part pas ;
 *   3. a l'heure dite, le Worker envoie un message chiffre que le
 *      telephone dechiffre : bon titre, bon texte ;
 *   4. une seance notee pour demain annule le rappel de demain, au
 *      chargement suivant ;
 *   5. desactiver fait oublier le telephone au serveur ;
 *   6. serveur absent : l'option n'apparait pas.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-push.mjs
 */

import { chromium } from "playwright";
import { appareil } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const ICI = dirname(fileURLToPath(import.meta.url));
const DIST = join(ICI, "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4698, r));

const { default: worker } = await import(join(ICI, "..", "worker", "coach-neiram-proxy.js"));

function kvFactice() {
  const d = new Map();
  return {
    d,
    async get(k, type) {
      const v = d.has(k) ? d.get(k) : null;
      return v != null && type === "json" ? JSON.parse(v) : v;
    },
    async put(k, v) {
      d.set(k, String(v));
    },
    async delete(k) {
      d.delete(k);
    },
    async list({ prefix = "" } = {}) {
      return { keys: [...d.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true };
    }
  };
}
const fiches = (kv) => [...kv.d.entries()].filter(([k]) => k.startsWith("ab:")).map(([, v]) => JSON.parse(v));

// Le telephone factice : vraies cles, comme celles qu'un navigateur fournit.
const b64 = (b) => Buffer.from(b).toString("base64url");
const ecdh = crypto.createECDH("prime256v1");
ecdh.generateKeys();
const auth = crypto.randomBytes(16);
const ABONNEMENT = { endpoint: "https://fcm.googleapis.com/fcm/send/fumee", keys: { p256dh: b64(ecdh.getPublicKey()), auth: b64(auth) } };

function dechiffrer(corps) {
  const c = Buffer.from(corps);
  const sel = c.subarray(0, 16);
  const cle = c.subarray(21, 86);
  const x = c.subarray(86);
  const hk = (s, k, i, l) => Buffer.from(crypto.hkdfSync("sha256", k, s, i, l));
  const ikm = hk(auth, ecdh.computeSecret(cle), Buffer.concat([Buffer.from("WebPush: info\0"), ecdh.getPublicKey(), cle]), 32);
  const d = crypto.createDecipheriv("aes-128-gcm", hk(sel, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16), hk(sel, ikm, Buffer.from("Content-Encoding: nonce\0"), 12));
  d.setAuthTag(x.subarray(x.length - 16));
  return JSON.parse(Buffer.concat([d.update(x.subarray(0, x.length - 16)), d.final()]).subarray(0, -1).toString());
}

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];

async function ouvrir({ env, serveurPret = true }) {
  const ctx = await nav.newContext(appareil("Pixel 7"));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.route("**/push/**", async (route) => {
    const r = route.request();
    if (!serveurPret) return route.fulfill({ status: 404, contentType: "application/json", body: '{"ok":false}' });
    const reponse = await worker.fetch(
      new Request("https://proxy.test" + new URL(r.url()).pathname, { method: "POST", headers: { "Content-Type": "application/json" }, body: r.postData() || "{}" }),
      env
    );
    await route.fulfill({ status: reponse.status, contentType: "application/json", body: await reponse.text() });
  });
  await page.addInitScript((abonnement) => {
    localStorage.setItem("cn_push_locale", "1");
    // Service de notification simule : l'abonnement porte les cles du test.
    let courant = JSON.parse(localStorage.getItem("__abonnement") || "null");
    const enObjet = (a) => a && { endpoint: a.endpoint, toJSON: () => a, unsubscribe: async () => { localStorage.removeItem("__abonnement"); return true; } };
    const gestionnaire = {
      getSubscription: async () => enObjet(JSON.parse(localStorage.getItem("__abonnement") || "null")),
      subscribe: async () => {
        localStorage.setItem("__abonnement", JSON.stringify(abonnement));
        return enObjet(abonnement);
      }
    };
    if (window.ServiceWorkerRegistration) {
      Object.defineProperty(ServiceWorkerRegistration.prototype, "pushManager", { get: () => gestionnaire, configurable: true });
    }
    if (!window.PushManager) window.PushManager = function () {};
    if (window.Notification) Object.defineProperty(Notification, "permission", { get: () => "granted", configurable: true });
    void courant;
    if (localStorage.getItem("coach_profile")) return;
    const demain = new Date();
    demain.setDate(demain.getDate() + 1);
    const jour = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][demain.getDay()];
    localStorage.setItem("__demain", `${demain.getFullYear()}-${String(demain.getMonth() + 1).padStart(2, "0")}-${String(demain.getDate()).padStart(2, "0")}`);
    localStorage.setItem("coach_profile", JSON.stringify({
      name: "Tom", sex: "homme", age: 36, heightCm: 180, startWeightKg: 80,
      activityLevel: "modere", goal: "maintien", sessionsPerWeek: 2,
      trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: [],
      slots: [{ id: "c1", day: jour, time: "18:30", place: "Salle", createdAt: "2026-01-01" }]
    }));
  }, ABONNEMENT);
  await page.goto("http://localhost:4698/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  return { ctx, page };
}

const reglages = async (page) => {
  await page.locator('button[aria-label="Réglages"]').first().click();
  await page.waitForTimeout(900);
};

try {
  const env = { PUSH_KV: kvFactice() };
  const { ctx, page } = await ouvrir({ env });

  // 1. L'option apparait.
  await reglages(page);
  const option = page.getByRole("checkbox", { name: /Recevoir mes rappels même appli fermée/ });
  console.log("1. OPTION PROPOSÉE      :", (await option.count()) === 1 ? "serveur prêt, l'option est dans Réglages" : "*** OPTION ABSENTE ***");

  // 2. Activation.
  await option.check();
  await page.waitForTimeout(1500);
  const resultat = await page.locator("[data-resultat-push]").getAttribute("data-resultat-push").catch(() => null);
  const [fiche] = fiches(env.PUSH_KV);
  const demain = await page.evaluate(() => localStorage.getItem("__demain"));
  const rappelDemain = fiche && fiche.rappels.find((r) => r.tag === "coach-creneau" && new Date(r.quand).getDate() === Number(demain.slice(8)));
  const h = rappelDemain && new Date(rappelDemain.quand);
  console.log(
    "2. ACTIVATION           :",
    resultat === "actif" && fiche && fiche.abonnement.endpoint === ABONNEMENT.endpoint && h && h.getHours() === 17 && h.getMinutes() === 30 &&
      fiche.rappels.some((r) => r.tag === "coach-report") && !JSON.stringify(fiche).includes("Tom")
      ? `abonné, ${fiche.rappels.length} rappels enregistrés (créneau de demain à 17:30, dimanche), sans le prénom`
      : `*** ${resultat} ${JSON.stringify(fiche)} ***`
  );

  // 3. Envoi a l'heure : le Worker chiffre, le telephone dechiffre.
  const envois = [];
  const fetchOrigine = globalThis.fetch;
  const nowOrigine = Date.now;
  globalThis.fetch = async (url, init) => {
    envois.push({ url: String(url), init });
    return new Response(null, { status: 201 });
  };
  Date.now = () => rappelDemain.quand + 60e3;
  try {
    await worker.scheduled({}, env, { waitUntil() {} });
  } finally {
    globalThis.fetch = fetchOrigine;
    Date.now = nowOrigine;
  }
  const recu = envois[0] ? dechiffrer(envois[0].init.body) : null;
  console.log(
    "3. ENVOI À L'HEURE      :",
    envois.length >= 1 && envois[0].url === ABONNEMENT.endpoint && recu && recu.titre === "Coach Neiram ⏰" && /Ton créneau de .+ à 18:30 approche\./.test(recu.texte)
      ? `message chiffré reçu et déchiffré : « ${recu.titre} — ${recu.texte} »`
      : `*** ${envois.length} envoi(s), ${JSON.stringify(recu)} ***`
  );

  // 4. Une seance notee pour demain annule le rappel de demain.
  await page.evaluate(() => {
    const d = localStorage.getItem("__demain");
    localStorage.setItem("coach_sessions", JSON.stringify([{ id: "s1", date: d, slotId: "c1", name: "Séance", exercises: [] }]));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const [apres] = fiches(env.PUSH_KV);
  const encore = apres && apres.rappels.some((r) => r.tag === "coach-creneau" && new Date(r.quand).getDate() === Number(demain.slice(8)));
  console.log("4. SÉANCE NOTÉE         :", apres && !encore ? "le rappel de demain est retiré du serveur" : `*** ${JSON.stringify(apres && apres.rappels)} ***`);

  // 5. Desactivation.
  await reglages(page);
  await page.getByRole("checkbox", { name: /Recevoir mes rappels même appli fermée/ }).uncheck();
  await page.waitForTimeout(1000);
  console.log("5. DÉSACTIVATION        :", fiches(env.PUSH_KV).length === 0 ? "le serveur a oublié le téléphone" : "*** TÉLÉPHONE TOUJOURS ENREGISTRÉ ***");
  await ctx.close();

  // 6. Serveur absent : pas d'option.
  const absent = await ouvrir({ env: { PUSH_KV: kvFactice() }, serveurPret: false });
  await reglages(absent.page);
  const n = await absent.page.getByRole("checkbox", { name: /Recevoir mes rappels même appli fermée/ }).count();
  console.log("6. SERVEUR ABSENT       :", n === 0 ? "l'option n'apparaît pas" : "*** OPTION AFFICHÉE SANS SERVEUR ***");
  await absent.ctx.close();
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
