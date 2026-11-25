/**
 * Fumée : mode Feu Vert (coaching collectif, 14 novembre 2026), en 390 × 844.
 *
 * Le Worker est le VRAI worker/coach-neiram-proxy.js, sur une base D1 en
 * mémoire (tests/faux-d1.mjs) : /feuvert/* et /coach-sync sont interceptés
 * (page.route) et passés à worker.fetch ; l'adresse du script Google est
 * remplacée par une doublure. Rien ne part sur Internet. Données fictives.
 * Horloge du navigateur fixée au lundi 8 février 2027 (semaine 4).
 *
 *   1. ACCÈS RESTREINT (25/11/2026) : un profil Feu Vert créé AVANT le
 *      changement bascule sans perte : l'onglet Feu Vert SEUL, sans barre du
 *      bas ni menu d'onglets ; le parcours fixé par Marien remplace celui
 *      choisi à la main (/feuvert/etat) ;
 *   2. AUCUN AUTRE ONGLET PAR L'ADRESSE : ?raccourci=eau, seance, repas,
 *      poids, sommeil, bilan → toujours Feu Vert, rien d'écrit ailleurs ;
 *   3. PROGRAMME : semaine 4, lien « Ma séance de la semaine, par Marien »,
 *      règle « charge bloquée », séance A pointée → pointage relayé au coach ;
 *   4. FICHE : critères S/Q, bouton vidéo vers la plateforme Coach Neiram
 *      (message privé à Marien, chemin et légende écrits ; plus de WhatsApp) ;
 *      format du 18/11/2026 : 1 série, 30 s maximum, 1080p, 25 Mo max ;
 *   5. PASSEPORT : états fixés par le coach, niveau 2 (2 verts) ;
 *   6. MISSIONS et module mental de la semaine ;
 *   7. CHECK-IN : bandeau du lundi, envoi → checkin_feu_vert au script ;
 *   8. RÉGULARITÉ : compteur, tableau alphabétique des membres consentants ;
 *   9. HORS LIGNE : Worker injoignable → Passeport de la dernière synchro ;
 *  10. RÉGLAGES en lecture seule (formule, cohorte, début, parcours), prénom
 *      et code d'accès seuls modifiables ; Aide et guide Feu Vert seuls ;
 *      ordinateur : pas de menu d'onglets ;
 *  11. ESPACE COACH : la carte Feu Vert, états modifiables, parcours fixé,
 *      liens vidéo ; le parcours changé arrive chez le membre ;
 *  12. NOUVEAU MEMBRE : plus de choix manuel de la formule ; « J'ai un code
 *      Feu Vert » (code d'un client non inscrit : refusé) → profil Feu Vert
 *      pré-réglé, onglet Feu Vert seul, tuto Feu Vert, parcours choisi UNE
 *      fois ; aucune adresse n'ouvre un autre onglet.
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
// Nouveau membre (code pas encore activé) et client individuel (jamais inscrit).
const invitation = async (libelle) => (await appelWorker("/admin/invitations", { libelle }, { Authorization: "Bearer " + ADMIN })).corps;
const nina = await invitation("Nina E.");
const paul = await invitation("Paul F.");
const anna = await membre("Anna C.");
const zoe = await membre("Zoé A.");
const tom = await membre("Tom D.");
await admin({
  action: "enregistrer",
  client: lea.client,
  cohorte: "1",
  // Fixé par Marien : remplace « Reprise », choisi à la main avant le 25/11/2026.
  parcours: "basesplus",
  passeport: {
    squat: { etat: "vert", date: "2027-02-03" },
    rdl: { etat: "vert", date: "2027-02-03" },
    rowing: { etat: "orange", date: "2027-01-28" },
    developpe: { etat: "orange", date: "2027-01-29" },
    fente: { etat: "rouge", date: "2027-02-05" },
    // Ancien identifiant du geste 8 (avant le 18/11/2026) : doit s'afficher sous « presse ».
    hipthrust: { etat: "orange", date: "2027-02-05" }
  },
  missions: { 1: { semaine: 1 }, 2: { semaine: 3 } }
});
// Nina : inscrite AVANT d'activer son code, parcours pas encore fixé.
await admin({ action: "enregistrer", client: nina.client, cohorte: "1", passeport: {}, missions: {} });
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
await ctx.route("**/auth/activer", versWorker);
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
    // Profil Feu Vert créé AVANT le 25/11/2026 (formule choisie à la main,
    // parcours « Reprise », anciens champs de poids) : il doit basculer seul.
    localStorage.setItem(
      "coach_profile",
      JSON.stringify({
        name: "Léa", sex: "femme", age: 34, heightCm: 165, startWeightKg: 62, activityLevel: "leger", goal: "maintien", trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: [],
        formule: "feuvert", feuVert: { parcours: "reprise", cohorte: "1", debut: "2027-01-18" }
      })
    );
    localStorage.setItem("coach_daily_form", JSON.stringify([{ date: "2027-02-07", waterMl: 500 }]));
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

  // 1. Ouverture : l'onglet Feu Vert seul, profil réglé par Marien.
  const profilStocke = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("coach_profile") || "null"));
  verifier("profil d'avant le changement : écran Feu Vert à l'ouverture", (await page.locator("[data-ecran-feu-vert]").count()) === 1);
  verifier("aucune barre du bas, aucun menu d'onglets", (await page.locator(".bottom-nav").count()) === 0 && (await page.locator(".nav-item").count()) === 0);
  const pLea = await profilStocke(page);
  verifier(
    "parcours fixé par Marien (Bases+) appliqué, rien perdu du profil",
    pLea.formule === "feuvert" && pLea.feuVert.parcours === "basesplus" && pLea.feuVert.parcoursFixe === true && pLea.feuVert.cohorte === "1" && pLea.feuVert.debut === "2027-01-18" && pLea.startWeightKg === 62,
    JSON.stringify(pLea)
  );
  verifier("en-tête : cohorte 1 · parcours Bases+", /Cohorte 1 · parcours Bases\+/.test(await page.locator("[data-ecran-feu-vert]").textContent()));
  await capture(page, "feu-vert-seul");

  // 2. Par l'adresse : raccourcis et notifications n'ouvrent aucun autre onglet.
  for (const q of ["?raccourci=eau&ml=250", "?raccourci=seance", "?raccourci=repas", "?raccourci=poids", "?raccourci=sommeil", "?raccourci=bilan", "?defi=ABCD2345"]) {
    await page.goto(URL_APP + q, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    const ok = (await page.locator("[data-ecran-feu-vert]").count()) === 1 && (await page.locator("[data-filet-ecran], .bottom-nav, .nav-item").count()) === 0;
    verifier("adresse " + q + " : Feu Vert seul", ok);
  }
  const journal = await page.evaluate(() => localStorage.getItem("coach_daily_form"));
  verifier("raccourci « eau » ignoré : Journal intact", JSON.parse(journal)[0].waterMl === 500, journal);
  await page.waitForTimeout(600);

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
  verifier("fiche : critères S et Q, lien vers la vidéo de démonstration", /S1/.test(await fiche.textContent()) && /Q1/.test(await fiche.textContent()) && (await fiche.locator("[data-video-vide]").count()) === 0 && (await fiche.locator('a[href^="https://youtube.com/shorts/"]').count()) === 1);
  await capture(page, "fiche-geste");
  const lien = await page.locator("[data-video-plateforme]").getAttribute("href");
  const textesVideo = await fiche.textContent();
  verifier(
    "bouton vidéo : plateforme Coach Neiram (adresse de l'envoi du bilan), chemin et légende écrits, plus de WhatsApp",
    lien === "https://coach-neiram-os.pelissier-marien.workers.dev" &&
      /Envoyer ma vidéo à Marien sur la plateforme/.test(textesVideo) &&
      /Ouvre la plateforme Coach Neiram > Messages privés > Marien/.test(textesVideo) &&
      /« Feu Vert — vidéo Rowing haltère, semaine 4 »/.test(textesVideo) &&
      !/whatsapp|wa\.me/i.test(textesVideo + (await fiche.innerHTML())),
    lien
  );
  verifier(
    "format vidéo du 18/11/2026 : 1 série, 30 s maximum, 1080p, limite de 25 Mo",
    /1 geste par vidéo, 1 série \(ou ses 5-6 dernières répétitions\), 30 s maximum, téléphone posé, filmé en 1080p \(pas en 4K\)/.test(textesVideo) &&
      /Si la plateforme refuse la vidéo \(25 Mo max\), raccourcis-la\./.test(textesVideo) &&
      !/2 séries consécutives|90 s maximum/.test(textesVideo)
  );
  await page.locator("[data-video-plateforme]").scrollIntoViewIfNeeded();
  await capture(page, "fiche-geste-video-plateforme");
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
  await page.locator('[data-geste="presse"]').click();
  await page.waitForTimeout(400);
  const fichePresse = page.locator("[data-fiche-geste='presse']");
  const textePresse = (await fichePresse.count()) ? await fichePresse.textContent() : "";
  verifier(
    "fiche presse à cuisses (ancien Passeport « hipthrust ») : orange, lien vers la vidéo de démonstration",
    /dossier/.test(textePresse) && /S3/.test(textePresse) && (await fichePresse.locator("[data-video-vide]").count()) === 0 &&
      (await fichePresse.locator('a[href="https://youtube.com/shorts/YuLA9MY2sXg"]').count()) === 1 && (await fichePresse.locator("[data-etat-geste]").first().getAttribute("data-etat-geste")) === "orange",
    textePresse.slice(0, 200)
  );
  await capture(page, "fiche-presse");
  await page.locator(".modal-panel button[aria-label='Fermer']").last().click();
  await page.waitForTimeout(300);

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

  // 10. Réglages réduits, en lecture seule ; Aide et guide Feu Vert.
  await page.locator(".mobile-header button[aria-label='Réglages']").click();
  await page.waitForTimeout(500);
  const reglages = page.locator("[data-reglages-feu-vert]");
  const texteReglages = (await reglages.count()) ? await reglages.textContent() : "";
  verifier(
    "réglages : formule, cohorte, début et parcours en lecture seule",
    /Feu Vert \(collectif\)/.test(await page.locator("[data-lecture-formule]").textContent()) &&
      (await page.locator("[data-lecture-cohorte]").textContent()).endsWith("1") &&
      /lundi 18 janvier 2027/.test(await page.locator("[data-lecture-debut]").textContent()) &&
      /Bases\+/.test(await page.locator("[data-lecture-parcours]").textContent()) &&
      /Fixé par Marien/.test(texteReglages) &&
      (await page.locator("[data-choix-parcours]").count()) === 0,
    texteReglages.slice(0, 300)
  );
  verifier(
    "réglages : seuls le prénom (et le code d'accès) se modifient ; ni formule, ni poids, ni sauvegarde, ni rappels",
    (await reglages.locator("input").count()) === 1 &&
      (await reglages.locator("select, [data-formule], [data-parcours], [data-cohorte], [data-debut-cohorte]").count()) === 0 &&
      (await reglages.locator("[data-carte-acces]").count()) === 1 &&
      !/Exporter mes données|Restaurer|Poids|Objectif|Rappel|Code plateforme|Calories/.test(texteReglages),
    texteReglages.slice(0, 300)
  );
  await capture(page, "reglages-feu-vert-lecture-seule");
  await page.locator("[data-carte-acces]").scrollIntoViewIfNeeded();
  await capture(page, "reglages-feu-vert-acces");
  await page.getByRole("button", { name: "Aide et questions fréquentes" }).click();
  await page.waitForTimeout(400);
  const questions = await page.locator("[data-aide] [data-question]").evaluateAll((l) => l.map((e) => e.dataset.question));
  verifier("aide : seulement les questions Feu Vert", questions.length >= 8 && questions.every((q) => q.startsWith("fv-") || q === "souci"), questions.join(","));
  await page.locator('[data-question="fv-code"] summary').click();
  await capture(page, "aide-feu-vert");
  await page.getByRole("button", { name: "Fermer" }).last().click();
  await page.waitForTimeout(300);
  await page.locator(".mobile-header button[aria-label='Réglages']").click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Guide d'utilisation (tutos)" }).click();
  await page.waitForTimeout(400);
  const guide = await page.locator("[data-guide-tutos] [data-lien-tuto]").evaluateAll((l) => l.map((e) => e.dataset.lienTuto));
  verifier("guide : le seul tuto Feu Vert", guide.join(",") === "feuvert", guide.join(","));
  await page.locator("[data-lien-tuto='feuvert']").click();
  await page.waitForTimeout(300);
  verifier("tuto Feu Vert : 5 étapes", (await page.locator("[data-tuto='feuvert']").count()) === 1);
  await capture(page, "guide-tuto-feu-vert");
  await page.locator(".modal-panel button[aria-label='Fermer']").last().click();
  await page.waitForTimeout(300);

  // Ordinateur : ni barre du bas ni menu d'onglets, le lien des réglages reste.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(400);
  verifier("ordinateur : aucun menu d'onglets, « Mon profil & réglages » présent", (await page.locator(".nav-item").count()) === 0 && (await page.locator(".profile-link").isVisible()));
  await capture(page, "ordinateur-feu-vert-seul");
  await page.setViewportSize({ width: 390, height: 844 });

  // 11. Espace coach (page à part).
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
  verifier("espace coach : parcours de Léa affiché (Bases+)", (await carte.locator("[data-parcours-coach]").inputValue()) === "basesplus");
  await carte.locator('[data-geste-coach="rowing"] [data-poser-etat="vert"]').click();
  await carte.locator("[data-parcours-coach]").selectOption("reprise");
  await carte.locator("[data-enregistrer-passeport]").click();
  await coach.waitForTimeout(800);
  const apres = (await appelWorker("/feuvert/etat", {}, { Authorization: "Bearer " + lea.jeton })).corps;
  verifier("espace coach : rowing passé au vert, lu par le membre", apres.passeport.rowing.etat === "vert");
  verifier("espace coach : parcours passé à Reprise, renvoyé au membre", apres.feuVert && apres.feuVert.parcours === "reprise" && apres.feuVert.debut === "2027-01-18", JSON.stringify(apres.feuVert));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  verifier("téléphone de Léa : parcours suivi à la réouverture", (await profilStocke(page)).feuVert.parcours === "reprise" && /parcours Reprise/.test(await page.locator("[data-ecran-feu-vert]").textContent()));
  verifier("inscription : choix du parcours à côté de la cohorte", (await carte.locator("[data-parcours-inscription]").count()) === 1);
  await carte.locator("[data-fiche-membre]").scrollIntoViewIfNeeded();
  await capture(coach, "espace-coach-passeport");
  await carte.locator("[data-videos-coach]").scrollIntoViewIfNeeded();
  await capture(coach, "espace-coach-videos-semaine");

  // 12. Nouveau membre : « J'ai un code Feu Vert », rien d'autre à régler.
  const neuf = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-FR", timezoneId: "Europe/Paris" });
  await neuf.clock.setFixedTime(new Date("2027-01-12T19:00:00+01:00"));
  await neuf.addInitScript(sansAides);
  for (const motif of ["**/feuvert/**", "**/auth/activer", "**/coach-sync"]) await neuf.route(motif, versWorker);
  for (const motif of ["**/presence", "**/communaute/**", "**/push/**"]) await neuf.route(motif, (r) => r.abort("internetdisconnected"));
  const p2 = await neuf.newPage();
  p2.on("pageerror", (e) => erreurs.push("nouveau membre : " + e.message));
  p2.on("dialog", (d) => d.accept());
  await p2.goto(URL_APP, { waitUntil: "domcontentloaded" });
  await p2.waitForTimeout(1200);
  verifier("accueil : plus de choix manuel de la formule", (await p2.locator("[data-formule]").count()) === 0 && !/Feu Vert \(collectif\)/.test(await p2.locator("body").textContent()));
  await p2.getByRole("button", { name: "J'ai un code Feu Vert" }).click();
  await p2.waitForTimeout(300);
  await capture(p2, "accueil-code-feu-vert");
  // Code d'un client individuel, jamais inscrit : pas de profil Feu Vert.
  await p2.locator("[data-code-feu-vert]").fill(paul.code);
  await p2.getByRole("button", { name: "Activer mon code" }).click();
  await p2.waitForTimeout(1200);
  verifier(
    "code d'un client non inscrit : refusé, pas de profil Feu Vert",
    /pas encore inscrit dans une cohorte Feu Vert/.test(await p2.locator("[data-erreur-code-feu-vert]").textContent()) && (await p2.evaluate(() => localStorage.getItem("coach_profile"))) === null
  );
  await capture(p2, "accueil-code-non-inscrit");
  // Code de Nina, inscrite par Marien.
  await p2.locator("[data-code-feu-vert]").fill(nina.code);
  await p2.locator("[data-prenom-feu-vert]").fill("Nina");
  await p2.getByRole("button", { name: "Activer mon code" }).click();
  await p2.waitForTimeout(1500);
  verifier("code Feu Vert : écran Feu Vert seul, sans barre du bas", (await p2.locator("[data-ecran-feu-vert]").count()) === 1 && (await p2.locator(".bottom-nav, .nav-item").count()) === 0);
  const pNina = await profilStocke(p2);
  verifier(
    "profil pré-réglé : formule, cohorte 1, début 18/01/2027, parcours à choisir, prénom, aucun poids",
    pNina.formule === "feuvert" && pNina.feuVert.cohorte === "1" && pNina.feuVert.debut === "2027-01-18" && !("parcours" in pNina.feuVert) && pNina.name === "Nina" && !pNina.startWeightKg,
    JSON.stringify(pNina)
  );
  verifier("tuto Feu Vert ouvert à la première visite", (await p2.locator("[data-tuto='feuvert']").count()) === 1);
  await capture(p2, "nouveau-membre-tuto");
  await p2.locator(".modal-panel button[aria-label='Fermer']").last().click();
  await p2.waitForTimeout(300);
  verifier("avant le 18 janvier : compte à rebours", /démarre le lundi 18\/01 \(dans 6 jours\)/.test(await p2.locator("[data-etat-cycle]").textContent()));
  await capture(p2, "nouveau-membre-feu-vert");
  // Réglages : parcours choisi une seule fois.
  await p2.locator(".mobile-header button[aria-label='Réglages']").click();
  await p2.waitForTimeout(500);
  verifier("réglages : choix du parcours ouvert (pas encore fixé par Marien)", (await p2.locator("[data-choix-parcours]").count()) === 1);
  await p2.locator("[data-choix-parcours] select").selectOption("basesplus");
  await capture(p2, "nouveau-membre-choix-parcours");
  await p2.getByRole("button", { name: "Choisir ce parcours" }).click();
  await p2.waitForTimeout(500);
  verifier(
    "parcours choisi une fois : verrouillé ensuite",
    (await p2.locator("[data-choix-parcours]").count()) === 0 && /Bases\+/.test(await p2.locator("[data-lecture-parcours]").textContent()) && (await profilStocke(p2)).feuVert.parcours === "basesplus"
  );
  await capture(p2, "nouveau-membre-parcours-verrouille");
  await p2.locator(".modal-panel button[aria-label='Fermer']").last().click();
  await p2.waitForTimeout(300);
  for (const q of ["?raccourci=seance", "?raccourci=bilan"]) {
    await p2.goto(URL_APP + q, { waitUntil: "domcontentloaded" });
    await p2.waitForTimeout(900);
    verifier("nouveau membre, adresse " + q + " : Feu Vert seul", (await p2.locator("[data-ecran-feu-vert]").count()) === 1 && (await p2.locator(".bottom-nav, [data-filet-ecran]").count()) === 0);
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
