/**
 * Fumée : défis entre amis, réservés aux clients du coach (24 octobre 2026).
 *
 * Le Worker est le VRAI worker/coach-neiram-proxy.js, sur une base D1 en
 * mémoire (tests/faux-d1.mjs) : les appels de l'app à /defis/* sont
 * interceptés (page.route) et passés à worker.fetch. Rien ne part sur
 * Internet. L'app est servie sous un sous-chemin, comme sur GitHub Pages.
 *
 *   1. téléphone de Sabine (code d'accès activé) : la carte « Défis entre
 *      amis » du Journal propose « Sabine » comme pseudo ; « Lancer un
 *      défi » demande l'accord, puis affiche le code et le lien ?defi=CODE
 *      (sous-chemin gardé) ; son total = les pas notés aujourd'hui ;
 *   2. téléphone de Thomas : le lien ouvre l'app, le code est pré-rempli,
 *      l'adresse est nettoyée ; il rejoint après l'accord ;
 *   3. classement : Thomas 1er (12 000 pas), Sabine 2e, vu des deux côtés ;
 *   4. Thomas quitte : sa participation est effacée côté serveur ;
 *   5. téléphone sans code d'accès : la carte renvoie aux Réglages, et le
 *      Worker refuse /defis/* sans jeton (même en mode transition).
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-defis-amis.mjs
 */

import { chromium } from "playwright";
import { appareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../worker/coach-neiram-proxy.js";
import { fauxD1 } from "../tests/faux-d1.mjs";

const PORT = 4730;
const SOUS_CHEMIN = "/coach-neiram-app/";
const URL_APP = `http://localhost:${PORT}${SOUS_CHEMIN}`;

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const serveur = createServer((req, res) => {
  const chemin = req.url.split("?")[0];
  if (!chemin.startsWith(SOUS_CHEMIN)) return res.writeHead(404).end();
  const relatif = chemin.slice(SOUS_CHEMIN.length);
  const c = join(DIST, relatif === "" ? "index.html" : relatif);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(PORT, r));

// Le Worker du coach, sur une base en memoire. Origines : la page locale.
const ADMIN = "admin-secret-de-fumee-0123456789-abcdef";
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

async function jetonClient(libelle) {
  const inv = (await appelWorker("/admin/invitations", { libelle }, { Authorization: "Bearer " + ADMIN })).corps;
  const act = (await appelWorker("/auth/activer", { code: inv.code })).corps;
  return { jeton: act.jeton, libelle: act.libelle };
}

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];
const net = (t) => String(t || "").replace(/[  ]/g, " ").replace(/\s+/g, " ");
const aujourdhui = new Date().toISOString().slice(0, 10);

async function telephone({ prenom, acces, pas }) {
  const ctx = await nav.newContext(appareil());
  await ctx.addInitScript(sansAides);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("dialog", (d) => d.accept());
  // Les appels au Worker du coach passent par le vrai Worker, en memoire.
  await page.route("**/defis/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const r = await silencieux(() =>
      worker.fetch(new Request("https://proxy.test" + url.pathname, { method: req.method(), headers: req.headers(), body: req.method() === "POST" ? req.postData() || "" : undefined }), env)
    );
    const entetes = {};
    r.headers.forEach((v, k) => (entetes[k] = v));
    await route.fulfill({ status: r.status, headers: entetes, body: await r.text() });
  });
  await page.addInitScript(
    ({ prenom, acces, pas, jour }) => {
      if (localStorage.getItem("coach_profile")) return;
      localStorage.setItem(
        "coach_profile",
        JSON.stringify({
          name: prenom, sex: "homme", age: 35, heightCm: 178, startWeightKg: 80,
          activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3,
          trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
        })
      );
      localStorage.setItem("coach_daily_form", JSON.stringify(pas ? [{ date: jour, steps: pas }] : []));
      if (acces) localStorage.setItem("acces_neiram", JSON.stringify({ jeton: acces.jeton, libelle: acces.libelle, activeLe: "2026-10-20T08:00:00.000Z" }));
    },
    { prenom, acces, pas, jour: aujourdhui }
  );
  return { ctx, page };
}

const carte = (page) => page.locator("[data-defis-amis]");
const classement = (page) =>
  page.locator("[data-defi-ami] [data-participant]").evaluateAll((l) => l.map((e) => `${e.dataset.participant}:${e.querySelector("[data-total]").textContent.replace(/\D/g, "")}${e.dataset.moi === "1" ? "*" : ""}`));

try {
  const sabine = await jetonClient("Sabine P.");
  const thomas = await jetonClient("Thomas B.");

  // 1. Sabine lance un defi.
  const A = await telephone({ prenom: "Sabine", acces: sabine, pas: 8500 });
  await A.page.goto(URL_APP, { waitUntil: "domcontentloaded" });
  await A.page.waitForTimeout(1200);
  await carte(A.page).scrollIntoViewIfNeeded();
  const pseudoA = await A.page.locator("[data-pseudo-defi]").inputValue();
  await A.page.locator('[data-type-defi="pas"]').click();
  await carte(A.page).getByRole("button", { name: "Lancer un défi" }).click();
  await A.page.waitForTimeout(200);
  const accordA = net(await A.page.locator('[data-accord-defi="creer"]').innerText().catch(() => ""));
  const avantAccord = env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM defis").get().n;
  await carte(A.page).getByRole("button", { name: "J'ai compris, continuer" }).click();
  await A.page.waitForTimeout(800);
  const code = await A.page.locator("[data-code-defi-ami]").first().textContent().catch(() => "");
  const lien = await A.page.locator("[data-lien-defi]").first().getAttribute("data-lien-defi").catch(() => "");
  const classeA1 = await classement(A.page);
  console.log(
    "1. LANCER (SABINE)      :",
    pseudoA === "Sabine" && /Ton pseudo et ton total sont visibles des autres participants de ce défi/.test(accordA) && avantAccord === 0 &&
      /^[A-HJKMNP-Z2-9]{6}$/.test(code) && lien === `${URL_APP}?defi=${code}` && JSON.stringify(classeA1) === JSON.stringify(["Sabine:8500*"])
      ? `pseudo « Sabine » proposé, accord demandé, code ${code}, lien ${lien.replace(/^http:\/\/localhost:\d+/, "")}, total 8 500 pas`
      : `*** pseudo « ${pseudoA} », accord « ${accordA.slice(0, 60)} » (${avantAccord} défi avant), code « ${code} », lien « ${lien} », ${JSON.stringify(classeA1)} ***`
  );

  // 2. Thomas ouvre le lien.
  const B = await telephone({ prenom: "Thomas", acces: thomas, pas: 12000 });
  await B.page.goto(lien, { waitUntil: "domcontentloaded" });
  await B.page.waitForTimeout(1200);
  const adresseB = B.page.url();
  await carte(B.page).scrollIntoViewIfNeeded();
  const codeB = await B.page.locator("[data-code-defi]").inputValue();
  const pseudoB = await B.page.locator("[data-pseudo-defi]").inputValue();
  await carte(B.page).getByRole("button", { name: "Rejoindre", exact: true }).click();
  await B.page.waitForTimeout(200);
  const accordB = await B.page.locator('[data-accord-defi="rejoindre"]').count();
  await carte(B.page).getByRole("button", { name: "J'ai compris, continuer" }).click();
  await B.page.waitForTimeout(800);
  console.log(
    "2. REJOINDRE (THOMAS)   :",
    adresseB === URL_APP && codeB === code && pseudoB === "Thomas" && accordB === 1
      ? `lien ouvert, code ${codeB} pré-rempli, adresse nettoyée (${adresseB.replace(/^http:\/\/localhost:\d+/, "")}), accord demandé`
      : `*** adresse ${adresseB}, code « ${codeB} », pseudo « ${pseudoB} », accord ${accordB} ***`
  );

  // 3. Classement des deux cotes.
  const classeB = await classement(B.page);
  await A.page.reload({ waitUntil: "domcontentloaded" });
  await A.page.waitForTimeout(1200);
  const classeA = await classement(A.page);
  const publie = JSON.stringify(env.DB.sqlite.prepare("SELECT * FROM defis_participants").all());
  console.log(
    "3. CLASSEMENT           :",
    JSON.stringify(classeB) === JSON.stringify(["Thomas:12000*", "Sabine:8500"]) && JSON.stringify(classeA) === JSON.stringify(["Thomas:12000", "Sabine:8500*"]) && !/Sabine P\.|Thomas B\./.test(publie)
      ? "Thomas 1er (12 000 pas), Sabine 2e, vu des deux téléphones ; serveur : pseudo et total seulement"
      : `*** B ${JSON.stringify(classeB)}, A ${JSON.stringify(classeA)}, base ${publie.slice(0, 200)} ***`
  );

  // 4. Thomas quitte.
  await B.page.locator(`[data-quitter="${code}"]`).click();
  await B.page.waitForTimeout(800);
  const resteB = await B.page.locator("[data-defi-ami]").count();
  const lignes = env.DB.sqlite.prepare("SELECT pseudo FROM defis_participants WHERE code = ?").all(code).map((r) => r.pseudo);
  await A.page.reload({ waitUntil: "domcontentloaded" });
  await A.page.waitForTimeout(1200);
  const classeA2 = await classement(A.page);
  console.log(
    "4. QUITTER              :",
    resteB === 0 && JSON.stringify(lignes) === JSON.stringify(["Sabine"]) && JSON.stringify(classeA2) === JSON.stringify(["Sabine:8500*"])
      ? "participation de Thomas effacée côté serveur, Sabine seule au classement"
      : `*** carte B ${resteB}, base ${JSON.stringify(lignes)}, A ${JSON.stringify(classeA2)} ***`
  );
  await B.ctx.close();
  await A.ctx.close();

  // 5. Sans code d'acces.
  const C = await telephone({ prenom: "Léa", acces: null, pas: 4000 });
  await C.page.goto(URL_APP, { waitUntil: "domcontentloaded" });
  await C.page.waitForTimeout(1200);
  const etatC = await carte(C.page).getAttribute("data-defis-amis").catch(() => null);
  const texteC = net(await carte(C.page).innerText().catch(() => ""));
  const boutons = await carte(C.page).getByRole("button", { name: "Lancer un défi" }).count();
  await C.ctx.close();
  const anonyme = await silencieux(async () => {
    const r = await worker.fetch(
      new Request("https://proxy.test/defis/creer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "pas", pseudo: "Anonyme" }) }),
      { ...env, ACCES_CLIENTS: "transition" }
    );
    return r.status;
  });
  console.log(
    "5. SANS CODE D'ACCÈS    :",
    etatC === "sans-acces" && /Réglages/.test(texteC) && boutons === 0 && anonyme === 401
      ? "la carte renvoie aux Réglages, le Worker refuse sans jeton (401, même en transition)"
      : `*** état ${etatC}, « ${texteC.slice(0, 80)} », ${boutons} bouton(s), Worker ${anonyme} ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
