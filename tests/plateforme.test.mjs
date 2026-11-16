/**
 * Envoi du bilan hebdomadaire vers la plateforme Coach Neiram (16 novembre
 * 2026) : le code, le contenu envoyé, les réponses du serveur, le rappel du
 * dimanche. Aucun vrai code client, aucun vrai appel réseau.
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { creerLocalStorage } from "./outils-neiram.mjs";

globalThis.localStorage = creerLocalStorage();
const P = await import("../app/src/lib/plateforme.js");
const { estCleClient } = await import("../app/src/lib/stockage.js");
const { lireAction, ACTIONS_RACCOURCIS } = await import("../app/src/lib/raccourcis.js");

const lire = (chemin) => readFileSync(new URL("../" + chemin, import.meta.url), "utf8");
const CODE = "NEIRAM-TEST12";

beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

/** Une semaine complète, comme la produit bilanHebdomadaire. */
const semaine = (extra = {}) => ({
  weekKey: "2026-11-09",
  start: "2026-11-09",
  end: "2026-11-15",
  workoutsCount: 3,
  avgCalories: 2310,
  avgProtein: 142,
  avgWaterMl: 2100,
  avgSteps: 8412.6,
  avgSleepH: 7.2,
  avgSleepQuality: 3.6,
  avgEnergy: 4,
  avgStress: 6.5,
  loggedDaysCount: 6,
  latestWeight: 82.4,
  weightDelta: -0.6,
  latestFatPct: 17,
  adherence: 82,
  weeklyStreak: 5,
  maintenanceCount: 1,
  hardWeek: false,
  painLines: ["épaule : 2 séances, intensité max 4/10"],
  dayNotes: [],
  sessionNotes: [],
  planSummary: { prevus: 3, faits: 3, manques: 0, restants: 0 },
  slotSummary: null,
  contrat: null,
  ...extra
});

/* ------------------------------ le code ------------------------------ */

test("le code : majuscules, espaces retirés, tiret rétabli ; le reste est refusé", () => {
  assert.equal(P.normaliserCode("neiram-ab12cd"), "NEIRAM-AB12CD");
  assert.equal(P.normaliserCode("  NEIRAM AB12CD "), "NEIRAM-AB12CD");
  assert.equal(P.normaliserCode("neiramab12cd"), "NEIRAM-AB12CD");
  assert.equal(P.normaliserCode("NEIRAM-AB12C"), null);
  assert.equal(P.normaliserCode("NEIRAM-AB12CDE"), null);
  assert.equal(P.normaliserCode("AB12CD"), null);
  assert.equal(P.normaliserCode(""), null);
  assert.equal(P.normaliserCode(null), null);
});

test("le code s'enregistre normalisé, une saisie invalide ne touche à rien, et il reste hors de la sauvegarde", () => {
  assert.equal(P.lireCodePlateforme(), null);
  assert.equal(P.enregistrerCodePlateforme("neiram test12").ok, true);
  assert.equal(P.lireCodePlateforme(), CODE);
  assert.equal(P.enregistrerCodePlateforme("nimporte quoi").ok, false);
  assert.equal(P.lireCodePlateforme(), CODE, "la faute de frappe n'efface pas le code");
  assert.equal(estCleClient(P.CLE_CODE_PLATEFORME), false, "ni coach_ ni cn_ : le fichier de sauvegarde ne l'emporte pas");
  P.oublierCodePlateforme();
  assert.equal(P.lireCodePlateforme(), null);
});

/* ------------------------------ le contenu ------------------------------ */

test("data : seulement ce que l'appli connaît ; stress ramené de 10 à 5 ; pas de nutrition ni de texte libre", () => {
  const d = P.donneesPlateforme({ weekStats: semaine(), profil: {}, mesures: [{ date: "2026-11-10", taille: 84 }, { date: "2026-11-14", taille: 83.5 }, { date: "2026-11-01", taille: 90 }] });
  assert.deepEqual(d, { poids: 82.4, taille: 83.5, seances_faites: 3, seances_prevues: 3, pas: 8413, sommeil: 4, energie: 4, stress: 3 });
  for (const absent of ["nutrition", "victoire", "difficulte", "objectif", "question", "week"]) assert.ok(!(absent in d), absent);
});

test("data : un champ inconnu est omis, jamais envoyé à zéro", () => {
  const d = P.donneesPlateforme({
    weekStats: semaine({ latestWeight: null, avgSteps: null, avgSleepQuality: null, avgEnergy: null, avgStress: null, planSummary: null }),
    profil: {},
    mesures: [{ date: "2026-10-01", taille: 90 }]
  });
  assert.deepEqual(d, { seances_faites: 3 }, "ni prévues sans programme ni objectif, ni taille hors de la semaine");
});

test("séances : créneaux d'abord, puis programme, puis objectif de la semaine", () => {
  const creneaux = P.donneesPlateforme({ weekStats: semaine({ slotSummary: { prevus: 3, honores: 2 } }), profil: {} });
  assert.deepEqual([creneaux.seances_faites, creneaux.seances_prevues], [2, 3]);
  const objectif = P.donneesPlateforme({ weekStats: semaine({ planSummary: null, workoutsCount: 2 }), profil: { weeklyWorkoutTarget: 4 } });
  assert.deepEqual([objectif.seances_faites, objectif.seances_prevues], [2, 4]);
});

test("échelles : 1-5 gardé, 1-10 ramené sur 1-5, hors échelle refusé", () => {
  assert.equal(P.surCinq(4, 5), 4);
  assert.equal(P.surCinq(1, 10), 1);
  assert.equal(P.surCinq(10, 10), 5);
  assert.equal(P.surCinq(5.5, 10), 3);
  assert.equal(P.surCinq(0, 10), null);
  assert.equal(P.surCinq(null, 5), null);
  assert.equal(P.surCinq("abc", 5), null);
});

test("résumé : chiffres clés lisibles, bilan IA joint, 6000 caractères au plus", () => {
  const r = P.resumePlateforme({
    weekStats: semaine(),
    performances: ["Force athlétique : total 327,5 kg"],
    bilan: { sections: { resume: "Belle semaine.", points_forts: ["Régularité"], actions: ["Dormir plus"] } }
  });
  assert.match(r, /^Bilan de la semaine du 09\/11\/2026 au 15\/11\/2026/);
  assert.match(r, /Séances : 3 séances · programme : 3\/3 respectées · 1 séance\(s\) de maintien/);
  assert.match(r, /Nutrition .*2310 kcal par jour/);
  assert.match(r, /Poids : 82,4 kg \(-0,6 kg/);
  assert.match(r, /Force athlétique : total 327,5 kg/);
  assert.match(r, /Points forts : Régularité/);
  const long = P.resumePlateforme({ weekStats: semaine({ sessionNotes: Array.from({ length: 50 }, () => "x".repeat(300)) }) });
  assert.ok(long.length <= P.RESUME_MAX);
  const enorme = P.resumePlateforme({ weekStats: semaine(), bilan: { sections: { resume: "mot ".repeat(5000) } } });
  assert.ok(enorme.length <= P.RESUME_MAX && enorme.endsWith("…"));
});

test("corps : data et resume, pas de week, pas de pdf (l'appli n'en génère pas)", () => {
  const c = P.construirePayloadPlateforme({ weekStats: semaine(), profil: {}, mesures: [] });
  assert.deepEqual(Object.keys(c).sort(), ["data", "resume"]);
  assert.ok(!("week" in c) && !("week" in c.data));
});

/* ------------------------------ l'envoi ------------------------------ */

const reponse = (status, corps) => ({ ok: status >= 200 && status < 300, status, json: async () => corps });

function faussePlateforme(reponses) {
  const appels = [];
  const f = async (url, options) => {
    appels.push({ url, options });
    const r = reponses[Math.min(appels.length - 1, reponses.length - 1)];
    if (r instanceof Error) throw r;
    return r;
  };
  return { f, appels };
}

const payload = () => P.construirePayloadPlateforme({ weekStats: semaine(), profil: {}, mesures: [] });

test("la requête : bonne adresse, POST, les deux en-têtes, un JSON valide", async () => {
  const { f, appels } = faussePlateforme([reponse(200, { ok: true, week: "2026-W46" })]);
  const r = await P.envoyerBilanPlateforme({ payload: payload(), code: "neiram test12", fetchImpl: f });
  assert.deepEqual(r, { ok: true, semaine: "2026-W46" });
  assert.equal(appels.length, 1);
  assert.equal(appels[0].url, "https://coach-neiram-os.pelissier-marien.workers.dev/api/app/bilan");
  assert.equal(appels[0].options.method, "POST");
  assert.deepEqual(appels[0].options.headers, { "Content-Type": "application/json", "X-Neiram-Code": CODE });
  const corps = JSON.parse(appels[0].options.body);
  assert.deepEqual(Object.keys(corps).sort(), ["data", "resume"]);
  assert.equal(corps.data.seances_faites, 3);
});

test("sans code : aucun appel réseau, renvoi vers les réglages", async () => {
  const { f, appels } = faussePlateforme([reponse(200, { ok: true })]);
  const r = await P.envoyerBilanPlateforme({ payload: payload(), code: null, fetchImpl: f });
  assert.equal(r.ok, false);
  assert.equal(r.erreur, "sans-code");
  assert.match(r.message, /Réglages/);
  assert.equal(appels.length, 0);
});

test("401 : code incorrect", async () => {
  const { f } = faussePlateforme([reponse(401, { error: "code" })]);
  const r = await P.envoyerBilanPlateforme({ payload: payload(), code: CODE, fetchImpl: f });
  assert.deepEqual([r.ok, r.erreur], [false, "code"]);
  assert.equal(r.message, "Code plateforme incorrect : vérifie-le dans les réglages.");
});

test("413 : le PDF est retiré et l'envoi retenté une fois ; sans PDF, message clair", async () => {
  const avecPdf = { ...payload(), pdf: { name: "Bilan semaine 46.pdf", base64: "AAAA" } };
  const { f, appels } = faussePlateforme([reponse(413, { error: "trop gros" }), reponse(200, { ok: true, week: "2026-W46" })]);
  const r = await P.envoyerBilanPlateforme({ payload: avecPdf, code: CODE, fetchImpl: f });
  assert.equal(r.ok, true);
  assert.equal(appels.length, 2);
  assert.ok("pdf" in JSON.parse(appels[0].options.body));
  assert.ok(!("pdf" in JSON.parse(appels[1].options.body)));
  const seul = faussePlateforme([reponse(413, {})]);
  const r2 = await P.envoyerBilanPlateforme({ payload: payload(), code: CODE, fetchImpl: seul.f });
  assert.deepEqual([r2.ok, r2.erreur, seul.appels.length], [false, "trop-lourd", 1]);
});

test("429 : le message du serveur s'affiche tel quel ; sans message, un texte par défaut", async () => {
  const a = await P.envoyerBilanPlateforme({ payload: payload(), code: CODE, fetchImpl: faussePlateforme([reponse(429, { error: "Déjà 5 envois aujourd'hui." })]).f });
  assert.deepEqual([a.erreur, a.message], ["limite", "Déjà 5 envois aujourd'hui."]);
  const b = await P.envoyerBilanPlateforme({ payload: payload(), code: CODE, fetchImpl: faussePlateforme([reponse(429, {})]).f });
  assert.equal(b.message, P.TEXTES_PLATEFORME.limite);
});

test("réseau coupé, erreur serveur, réponse illisible : « Envoi impossible », rien n'est perdu", async () => {
  for (const r of [new Error("Failed to fetch"), reponse(500, {}), { ok: true, status: 200, json: async () => { throw new Error("pas du json"); } }]) {
    const sortie = await P.envoyerBilanPlateforme({ payload: payload(), code: CODE, fetchImpl: faussePlateforme([r]).f });
    assert.deepEqual([sortie.ok, sortie.erreur, sortie.message], [false, "reseau", "Envoi impossible, réessaie. Ton bilan est conservé."]);
  }
});

test("un envoi qui traîne est abandonné au délai", async () => {
  const lent = (url, options) => new Promise((_, rejeter) => options.signal.addEventListener("abort", () => rejeter(new Error("abort"))));
  const r = await P.envoyerBilanPlateforme({ payload: payload(), code: CODE, fetchImpl: lent, delaiMs: 20 });
  assert.deepEqual([r.ok, r.erreur], [false, "reseau"]);
});

/* ------------------------- date d'envoi, rappel ------------------------- */

test("le dernier envoi de chaque semaine est mémorisé, les plus anciennes oubliées", () => {
  assert.equal(P.envoiDeLaSemaine("2026-11-09"), null);
  P.noterEnvoi("2026-11-09", new Date("2026-11-15T16:42:00Z"));
  assert.equal(P.envoiDeLaSemaine("2026-11-09"), "2026-11-15T16:42:00.000Z");
  for (let i = 0; i < 15; i++) P.noterEnvoi(`2026-0${(i % 9) + 1}-${String(10 + i).padStart(2, "0")}`);
  assert.ok(Object.keys(JSON.parse(globalThis.localStorage.getItem(P.CLE_ENVOIS_PLATEFORME))).length <= 12);
  assert.ok(P.CLE_ENVOIS_PLATEFORME.startsWith("cn_"), "l'historique des envois va, lui, dans la sauvegarde");
});

test("le rappel du dimanche ouvre le bilan : lien interne, absent du manifeste, géré par le service worker", () => {
  assert.deepEqual(lireAction("raccourci://bilan"), { id: "bilan", onglet: "tendances" });
  assert.ok(!ACTIONS_RACCOURCIS.some((a) => a.id === "bilan"), "Android n'affiche que quatre raccourcis sur l'icône");
  const sw = lire("app/public/sw.js");
  assert.match(sw, /"coach-report": "bilan"/);
  assert.match(sw, /postMessage\(\{ type: "cn-lien"/);
  assert.match(sw, /\?raccourci="/);
  const rappels = lire("app/src/lib/rappels.js");
  assert.match(rappels, /tag: "coach-report"/);
});

test("câblage : bouton dans Tendances, code dans Réglages, envoi marqué côté App, fichier gardé", () => {
  const tend = lire("app/src/ecrans/Tendances.jsx");
  assert.match(tend, /<BilanPlateforme[\s\S]*?construire=\{onConstruirePlateforme\}/);
  assert.match(tend, /onClick=\{onPartager\}/, "le partage du fichier existe toujours");
  assert.match(lire("app/src/ecrans/Reglages.jsx"), /<CartePlateforme \/>/);
  const app = lire("app/src/App.jsx");
  assert.match(app, /onConstruirePlateforme=\{construirePlateforme\}/);
  assert.match(app, /onEnvoyePlateforme=\{bilanEnvoyePlateforme\}/);
  assert.match(app, /action\.id === "bilan"/);
  const bouton = lire("app/src/ui/BilanPlateforme.jsx");
  assert.match(bouton, /disabled=\{envoiEnCours\}/, "bouton désactivé pendant l'envoi");
  assert.match(bouton, /if \(enCours\.current\) return/, "garde contre le double appui");
});

test("aucun code ni clé en dur dans les sources de l'envoi", () => {
  for (const f of ["app/src/lib/plateforme.js", "app/src/ui/BilanPlateforme.jsx"]) {
    const t = lire(f);
    assert.ok(!/NEIRAM-[A-Z0-9]{6}/.test(t.replace(/NEIRAM-XXXXXX/g, "").replace(/NEIRAM-AB12CD/g, "")), f);
  }
});
