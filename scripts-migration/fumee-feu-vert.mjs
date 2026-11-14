/**
 * Fumée : mode Feu Vert (coaching collectif, 14 novembre 2026), en 390 × 844.
 *
 * Le Worker est le VRAI worker/coach-neiram-proxy.js, sur une base D1 en
 * mémoire (tests/faux-d1.mjs) : /feuvert/* et /coach-sync sont interceptés
 * (page.route) et passés à worker.fetch ; l'adresse du script Google est
 * remplacée par une doublure. Rien ne part sur Internet. Données fictives.
 * Horloge du navigateur fixée au lundi 8 février 2027 (semaine 4).
 *
 *   1. RÉGLAGES : Formule « Feu Vert (collectif) », parcours, cohorte, début ;
 *   2. ONGLET : Feu Vert en tête de barre, sans Nutrition/Mesures/Tendances ;
 *   3. PROGRAMME : semaine 4, lien « Ma séance de la semaine, par Marien »,
 *      règle « charge bloquée », séance A pointée → pointage relayé au coach ;
 *   4. FICHE : critères S/Q, bouton WhatsApp (wa.me, message pré-rempli) ;
 *   5. PASSEPORT : états fixés par le coach, niveau 2 (2 verts) ;
 *   6. MISSIONS et module mental de la semaine ;
 *   7. CHECK-IN : bandeau du lundi, envoi → checkin_feu_vert au script ;
 *   8. RÉGULARITÉ : compteur, tableau alphabétique des membres consentants ;
 *   9. HORS LIGNE : Worker injoignable → Passeport de la dernière synchro ;
 *  10. ESPACE COACH : la carte Feu Vert, états modifiables, liens vidéo ;
 *  11. NOUVEAU MEMBRE : accueil sans aucun champ de poids, profil enregistré,
 *      chaque onglet de la barre s'ouvre sans plantage.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-feu-vert.mjs
 *   CAPTURES=/chemin/dossier node scripts-migration/fumee-feu-vert.mjs   (garde les PNG)
 */

import { chromium } from "playwright";
import { sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../worker/coach-neiram-proxy.js";
import { fauxD1 } from "../tests/faux-d1.mjs";

const PORT = 4741;
const SOUS_CHEMIN = "/coach-neiram-app/";
const URL_APP = `http://localhost:${PORT}${SOUS_CHEMIN}`;
const CAPTURES = process.env.CAPTURES || null;
if (CAPTURES) mkdirSync(CAPTURES, { recursive: true });

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

// Worker réel, base en mémoire, script Google remplacé par une doublure.
const ADMIN = "admin-secret-de-fumee-0123456789-abcdef";
const SCRIPT = "https://script.exemple.invalid/exec";
const env = { ADMIN_SECRET: ADMIN, DB: fauxD1(), COACH_SYNC_URL: SCRIPT, COACH_SYNC_SECRET: "secret-de-fumee-0123456789abcdef0123", ALLOWED_ORIGINS: `http://localhost:${PORT}` };
const recusParLeScript = [];
const fetchOrigine = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url) === SCRIPT) {
    recusParLeScript.push(JSON.parse(JSON.parse(init.body).charge));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  return fetchOrigine(url, init);
};
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
const admin = (corps) => appelWorker("/admin/feuvert", corps, { Authorization: "Bearer " + ADMIN });
async function membre(libelle) {
  const inv = (await appelWorker("/admin/invitations", { libelle }, { Authorization: "Bearer " + ADMIN })).corps;
  const act = (await appelWorker("/auth/activer", { code: inv.code })).corps;
  return { jeton: act.jeton, libelle: act.libelle, client: inv.client };
}

// Cohorte 1 fictive : Léa (le téléphone testé), Anna et Zoé (tableau).
const lea = await membre("Léa B.");
const anna = await membre("Anna C.");
const zoe = await membre("Zoé A.");
const tom = await membre("Tom D.");
await admin({
  action: "enregistrer",
  client: lea.client,
  cohorte: "1",
  passeport: {
    squat: { etat: "vert", date: "2027-02-03" },
    rdl: { etat: "vert", date: "2027-02-03" },
    rowing: { etat: "orange", date: "2027-01-28" },
    developpe: { etat: "orange", date: "2027-01-29" },
    fente: { etat: "rouge", date: "2027-02-05" },
    hipthrust: { etat: "orange", date: "2027-02-05" }
  },
  missions: { 1: { semaine: 1 }, 2: { semaine: 3 } }
});
for (const m of [anna, zoe, tom]) await admin({ action: "enregistrer", client: m.client, cohorte: "1", passeport: {}, missions: m === zoe ? { 1: { semaine: 2 } } : {} });
await admin({ action: "video", cohorte: "1", semaine: 4, url: "https://www.youtube.com/watch?v=exemple-semaine-4" });
const semaines = (s) => Object.fromEntries(s.map((n, i) => [String(i + 1), { seances: n, bonus: 0, checkin: 1 }]));
await appelWorker("/feuvert/tableau", { accord: true, pseudo: "Zoé", semaines: semaines([2, 2, 2]) }, { Authorization: "Bearer " + zoe.jeton });
await appelWorker("/feuvert/tableau", { accord: true, pseudo: "anna", semaines: semaines([2, 1, 2]) }, { Authorization: "Bearer " + anna.jeton });
// Tom ne donne pas son accord : il ne doit apparaître nulle part.

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];
const verifs = [];
const verifier = (nom, ok, detail = "") => {
  verifs.push({ nom, ok });
  console.log(`${ok ? "  OK  " : "  ÉCHEC"} ${nom}${!ok && detail ? " — " + detail : ""}`);
};
let numero = 0;
async function capture(page, nom) {
  numero++;
  if (!CAPTURES) return;
  // Notification passagère fermée : elle masquerait le haut de l'écran.
  for (const b of await page.locator(".toast button").all()) await b.click().catch(() => {});
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(CAPTURES, String(numero).padStart(2, "0") + "-" + nom + ".png") });
}

const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-FR", timezoneId: "Europe/Paris" });
await ctx.clock.setFixedTime(new Date("2027-02-08T09:30:00+01:00"));
await ctx.addInitScript(sansAides);
let workerJoignable = true;
const versWorker = async (route) => {
  if (!workerJoignable) return route.abort("internetdisconnected");
  const req = route.request();
  const url = new URL(req.url());
  const r = await silencieux(() => worker.fetch(new Request("https://proxy.test" + url.pathname, { method: req.method(), headers: req.headers(), body: req.method() === "POST" ? req.postData() || "" : undefined }), env));
  const h = {};
  r.headers.forEach((v, k) => (h[k] = v));
  await route.fulfill({ status: r.status, headers: h, body: await r.text() });
};
await ctx.route("**/feuvert/**", versWorker);
await ctx.route("**/coach-sync", versWorker);
await ctx.route("**/admin/**", versWorker);
await ctx.route("**/presence", (r) => r.fulfill({ status: 200, body: '{"ok":true}' }));
await ctx.route("**/communaute/**", (r) => r.fulfill({ status: 200, body: '{"ok":true}' }));
await ctx.route("**/push/**", (r) => r.fulfill({ status: 503, body: '{"ok":false}' }));

const page = await ctx.newPage();
page.on("pageerror", (e) => erreurs.push(e.message));
page.on("dialog", (d) => d.accept());

const seance = (id, date, semaine, lettre) => ({
  id, date, routineId: null, source: "feuvert", startTime: "18:30", durationMin: 50, rpe: "", notes: `Feu Vert S${semaine} · séance ${lettre}`,
  pains: [], exercises: [], feuVert: { semaine, seance: lettre, cohorte: "1", parcours: "reprise" }
});
await page.addInitScript(
  ({ jeton, seances }) => {
    if (localStorage.getItem("coach_profile")) return;
    localStorage.setItem("neiram_tutos_vus", JSON.stringify(["journal", "repas", "nutrition", "sommeil", "mensurations", "entrainements", "tendances", "feuvert"]));
    localStorage.setItem("cn_synchro_locale", "1");
    localStorage.setItem(
      "coach_profile",
      JSON.stringify({ name: "Léa", sex: "femme", age: 34, heightCm: 165, startWeightKg: 62, activityLevel: "leger", goal: "maintien", trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: [] })
    );
    localStorage.setItem("coach_sessions", JSON.stringify(seances));
    localStorage.setItem("acces_neiram", JSON.stringify({ jeton, libelle: "Léa B.", activeLe: "2027-01-15T08:00:00.000Z" }));
    localStorage.setItem(
      "cn_feu_vert",
      JSON.stringify({
        missionsFaites: { 1: "2027-01-20", 2: "2027-02-03" },
        checkins: { 1: { semaine: 1, seances: 2, bonus: 0, victoire: "Séance complète en heure creuse", blocage: "Trouver la poulie", envoyeLe: "2027-01-25T08:10:00.000Z" }, 2: { semaine: 2, seances: 1, bonus: 0, victoire: "Squat plus stable", blocage: "Semaine chargée au travail", envoyeLe: "2027-02-01T08:05:00.000Z" } },
        charges: { squat: "8", rdl: "10", rowing: "8", developpe: "6" },
        tableau: { accord: true, pseudo: "Léa" }
      })
    );
  },
  {
    jeton: lea.jeton,
    seances: [seance("f1", "2027-01-19", 1, "A"), seance("f2", "2027-01-21", 1, "B"), seance("f3", "2027-01-27", 2, "A"), seance("f4", "2027-02-02", 3, "A"), seance("f5", "2027-02-04", 3, "B")]
  }
);

try {
  await page.goto(URL_APP, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // 1. Réglages : la formule (le profil fictif part en coaching individuel).
  await page.getByRole("button", { name: "Réglages" }).click();
  await page.waitForTimeout(400);
  const formule = page.locator("[data-formule]");
  await formule.scrollIntoViewIfNeeded();
  await formule.selectOption("feuvert");
  await page.waitForTimeout(300);
  verifier("réglages : parcours, cohorte et début apparaissent", (await page.locator("[data-parcours]").count()) === 1 && (await page.locator("[data-debut-cohorte]").inputValue()) === "2027-01-18");
  await page.locator("[data-parcours]").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector("[data-formule]").scrollIntoView({ block: "center" }));
  await capture(page, "reglages-formule-feu-vert");
  await page.getByRole("button", { name: /Enregistrer/ }).last().click();
  await page.waitForTimeout(800);
  if (await page.locator(".modal-panel").count()) await page.locator(".modal-panel button[aria-label='Fermer']").last().click();
  await page.waitForTimeout(400);

  // 2. Onglets.
  const barre = await page.locator(".bottom-nav button span").allTextContents();
  verifier("barre du bas : Feu Vert en tête, sans Nutrition, Mesures ni Tendances", barre[0] === "Feu Vert" && !barre.some((t) => /Nutrition|Mesures|Tendances/.test(t)), barre.join(","));
  await page.locator(".bottom-nav button", { hasText: "Feu Vert" }).click();
  await page.waitForTimeout(1200);

  // 3. Programme.
  verifier("semaine courante : S4 (lundi 8 février 2027)", /Semaine 4 sur 6/.test(await page.locator("[data-etat-cycle]").textContent()));
  verifier("bandeau du lundi : check-in de la semaine 3", (await page.locator("[data-bandeau-checkin]").count()) === 1);
  await capture(page, "feu-vert-accueil");
  verifier("lien « Ma séance de la semaine, par Marien »", (await page.locator("[data-seance-marien]").getAttribute("href")) === "https://www.youtube.com/watch?v=exemple-semaine-4");
  verifier("règle visible : charge bloquée tant que le geste n'est pas vert", /Charge bloquée tant que le geste n'est pas vert/.test(await page.locator("[data-regle-charge]").textContent()));
  await page.locator('[data-exercice="squat"]').first().scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -160));
  await capture(page, "programme-seance-a");
  verifier("squat vert : progression autorisée ; rowing orange : charge bloquée", /double progression/.test(await page.locator('[data-exercice="squat"]').textContent()) && /Charge bloquée/.test(await page.locator('[data-exercice="rowing"]').textContent()));
  await page.locator("[data-seance='bonus']").click();
  await page.waitForTimeout(300);
  await page.locator("[data-pointer]").scrollIntoViewIfNeeded();
  await capture(page, "programme-seance-bonus");
  await page.locator("[data-seance='A']").click();
  await page.waitForTimeout(300);
  const avant = recusParLeScript.length;
  await page.locator("[data-pointer]").click();
  await page.waitForTimeout(1200);
  verifier("séance A pointée : affichée faite", (await page.locator("[data-seance-faite]").count()) === 1);
  const pointage = recusParLeScript.slice(avant).find((e) => e.type === "pointage");
  verifier("pointage relayé au classeur du coach (Léa B., Feu Vert S4)", !!pointage && pointage.client === "Léa B." && /Feu Vert S4 · séance A/.test(pointage.note), JSON.stringify(recusParLeScript.slice(avant)));

  // 4. Fiche d'un geste.
  await page.locator('[data-exercice="rowing"] button').first().click();
  await page.waitForTimeout(400);
  const fiche = page.locator("[data-fiche-geste='rowing']");
  verifier("fiche : critères S et Q, vidéo de démo « bientôt »", /S1/.test(await fiche.textContent()) && /Q1/.test(await fiche.textContent()) && (await fiche.locator("[data-video-vide]").count()) === 1);
  await capture(page, "fiche-geste");
  const lien = await page.locator("[data-whatsapp-video]").getAttribute("href");
  verifier("bouton WhatsApp : numéro de la configuration, message pré-rempli", /^https:\/\/wa\.me\/\d+\?text=/.test(lien) && decodeURIComponent(lien.split("text=")[1]) === "Feu Vert — vidéo Rowing haltère, semaine 4", lien);
  await page.locator("[data-whatsapp-video]").scrollIntoViewIfNeeded();
  await capture(page, "fiche-geste-video-whatsapp");
  await page.locator(".modal-panel button[aria-label='Fermer']").last().click();
  await page.waitForTimeout(300);

  // 5. Passeport.
  await page.locator("[data-vue='passeport']").click();
  await page.waitForTimeout(400);
  verifier("passeport : niveau 2 (Bases), 2 gestes verts", (await page.locator("[data-niveau]").getAttribute("data-niveau")) === "2" && /2\/8 gestes au vert/.test(await page.locator("[data-niveau]").textContent()));
  const etats = await page.locator("[data-geste] [data-etat-geste]").evaluateAll((l) => l.map((e) => e.dataset.etatGeste));
  verifier("passeport : états fixés par le coach, rouge par défaut", etats.join(",") === "vert,vert,orange,orange,rouge,rouge,rouge,orange", etats.join(","));
  verifier("passeport : aucun contrôle pour changer un état", (await page.locator("[data-ecran-feu-vert] [data-poser-etat], [data-ecran-feu-vert] select").count()) === 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture(page, "passeport-niveau");
  await page.locator('[data-geste="fente"]').scrollIntoViewIfNeeded();
  await capture(page, "passeport-gestes");

  // 6. Missions.
  await page.locator("[data-vue='missions']").click();
  await page.waitForTimeout(400);
  verifier("missions : 1 et 2 validées par Marien, mission 3 de la semaine", (await page.locator("[data-mission-validee]").count()) === 2 && /cette semaine/.test(await page.locator("[data-mission='3']").textContent()));
  await page.locator("[data-mission='3']").scrollIntoViewIfNeeded();
  await capture(page, "missions");
  await page.locator("[data-mission-faite='3']").check();
  await page.locator("[data-module]").scrollIntoViewIfNeeded();
  verifier("module mental de la semaine 4", (await page.locator("[data-module]").getAttribute("data-module")) === "4");
  await capture(page, "module-mental");

  // 7. Check-in.
  await page.locator("[data-vue='checkin']").click();
  await page.waitForTimeout(400);
  verifier("check-in semaine 3 : séances proposées d'après les pointages (2/2)", (await page.locator("[data-checkin]").getAttribute("data-checkin")) === "3" && /Proposé d'après tes pointages : 2\/2/.test(await page.locator("[data-checkin]").textContent()));
  await page.locator("[data-victoire]").fill("J'ai fait 3 gestes dans la zone haltères");
  await page.locator("[data-blocage]").fill("Le banc plat est souvent pris à 18 h");
  await capture(page, "check-in");
  const avantCheckin = recusParLeScript.length;
  await page.locator("[data-envoyer-checkin]").click();
  await page.waitForTimeout(1200);
  const checkin = recusParLeScript.slice(avantCheckin).find((e) => e.type === "checkin_feu_vert");
  verifier(
    "check-in relayé au classeur (checkin_feu_vert, semaine du 1er février)",
    !!checkin && checkin.weekKey === "2027-02-01" && /séances 2\/2 · Mission 2 : faite/.test(checkin.message) && /zone haltères/.test(checkin.note) && checkin.niveau === "info",
    JSON.stringify(checkin)
  );
  verifier("bandeau du lundi : disparu une fois le check-in envoyé", (await page.locator("[data-bandeau-checkin]").count()) === 0);

  // 8. Régularité.
  await page.locator("[data-vue='regularite']").click();
  await page.waitForTimeout(1500);
  const lignes = await page.locator("[data-ligne-tableau]").evaluateAll((l) => l.map((e) => e.dataset.ligneTableau));
  verifier("tableau : membres consentants, ordre alphabétique, Tom absent", lignes.join(",") === "anna,Léa,Zoé", lignes.join(","));
  await page.locator("[data-mon-compteur]").scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("[data-mon-compteur]").scrollIntoViewIfNeeded();
  await capture(page, "regularite-compteur");
  await page.locator("[data-tableau]").scrollIntoViewIfNeeded();
  await capture(page, "regularite-tableau");

  // 9. Hors ligne : Worker injoignable, l'écran garde la dernière synchro.
  workerJoignable = false;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.locator("[data-vue='passeport']").click();
  await page.waitForTimeout(400);
  const etatsHorsLigne = await page.locator("[data-geste] [data-etat-geste]").evaluateAll((l) => l.map((e) => e.dataset.etatGeste));
  verifier("hors ligne : Passeport de la dernière synchro, message clair", etatsHorsLigne.join(",") === etats.join(",") && /Pas de connexion/.test(await page.locator("[data-synchro-passeport]").textContent()));
  await page.locator("[data-synchro-passeport]").scrollIntoViewIfNeeded();
  await capture(page, "passeport-hors-ligne");
  workerJoignable = true;

  // 10. Espace coach (page à part).
  const coach = await ctx.newPage();
  coach.on("pageerror", (e) => erreurs.push(e.message));
  coach.on("dialog", (d) => d.accept());
  await coach.goto(URL_APP + "espace-coach.html", { waitUntil: "domcontentloaded" });
  await coach.locator("[data-secret]").fill(ADMIN);
  await coach.getByRole("button", { name: "Ouvrir l'espace coach" }).click();
  await coach.waitForTimeout(1200);
  const carte = coach.locator("[data-carte-feu-vert-coach]");
  await carte.scrollIntoViewIfNeeded();
  await carte.locator('[data-membre="Léa B."]').click();
  await coach.waitForTimeout(300);
  await carte.locator('[data-geste-coach="rowing"] [data-poser-etat="vert"]').click();
  await carte.locator("[data-enregistrer-passeport]").click();
  await coach.waitForTimeout(800);
  const apres = (await appelWorker("/feuvert/etat", {}, { Authorization: "Bearer " + lea.jeton })).corps;
  verifier("espace coach : rowing passé au vert, lu par le membre", apres.passeport.rowing.etat === "vert");
  await carte.locator("[data-fiche-membre]").scrollIntoViewIfNeeded();
  await capture(coach, "espace-coach-passeport");
  await carte.locator("[data-videos-coach]").scrollIntoViewIfNeeded();
  await capture(coach, "espace-coach-videos-semaine");

  // 11. Nouveau membre : accueil sans poids, puis chaque onglet.
  const neuf = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-FR", timezoneId: "Europe/Paris" });
  await neuf.clock.setFixedTime(new Date("2027-01-12T19:00:00+01:00"));
  await neuf.addInitScript(sansAides);
  for (const motif of ["**/feuvert/**", "**/presence", "**/communaute/**", "**/push/**"]) await neuf.route(motif, (r) => r.abort("internetdisconnected"));
  const p2 = await neuf.newPage();
  p2.on("pageerror", (e) => erreurs.push("nouveau membre : " + e.message));
  await p2.goto(URL_APP, { waitUntil: "domcontentloaded" });
  await p2.waitForTimeout(1200);
  await p2.locator("[data-formule]").selectOption("feuvert");
  await p2.waitForTimeout(300);
  verifier("accueil Feu Vert : aucun champ de poids", !(await p2.locator("label, div").filter({ hasText: /^Poids/ }).count()));
  await p2.locator("[data-formule]").scrollIntoViewIfNeeded();
  await capture(p2, "accueil-nouveau-membre");
  await p2.getByRole("button", { name: "Commencer le suivi" }).click();
  await p2.waitForTimeout(1200);
  verifier("accueil : profil enregistré sans poids, ouverture sur Feu Vert", (await p2.locator("[data-ecran-feu-vert]").count()) === 1);
  verifier("avant le 18 janvier : compte à rebours", /démarre le lundi 18\/01 \(dans 6 jours\)/.test(await p2.locator("[data-etat-cycle]").textContent()));
  for (const onglet of ["Séances", "Sommeil", "Journal", "Feu Vert"]) {
    await p2.locator(".bottom-nav button", { hasText: onglet }).click();
    await p2.waitForTimeout(700);
    verifier("onglet « " + onglet + " » sans poids : pas de plantage", (await p2.locator("[data-filet-ecran]").count()) === 0);
  }
  await neuf.close();
} catch (e) {
  erreurs.push("script : " + e.message);
}

verifier("aucune erreur JavaScript", erreurs.length === 0, erreurs.join(" | "));
await nav.close();
serveur.close();
globalThis.fetch = fetchOrigine;
const echecs = verifs.filter((v) => !v.ok).length;
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : "\nFeu Vert : tout est vert.");
process.exit(echecs ? 1 : 0);
