/**
 * Worker : présence des clients et alerte d'inactivité (Smart Coach,
 * 25 octobre 2026).
 *
 *   - POST /presence : jeton client obligatoire (même en transition),
 *     plafonné, une date AAAA-MM-JJ et rien d'autre ;
 *   - tâche planifiée : une fois par jour entre 8 h et 9 h (heure de
 *     Paris), attention à 4 jours, critique à 7, une seule alerte par
 *     niveau, remise à zéro au retour, clients sans présence ou révoqués
 *     ignorés ;
 *   - /coach-sync relaie niveau et nbJours, et refuse une alerte
 *     d'inactivité venue d'un téléphone ;
 *   - /admin/presence pour l'Espace coach.
 *
 * La base est une vraie SQLite en mémoire (tests/faux-d1.mjs).
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { fauxD1 } from "./faux-d1.mjs";

globalThis.__COACH_TEST__ = globalThis.__COACH_TEST__ || {};
const { default: worker } = await import("../worker/coach-neiram-proxy.js");
const T = globalThis.__COACH_TEST__;

const ADMIN = "admin-secret-de-test-0123456789-abcdef";
const SECRET = "secret-de-synchro-de-test-0123456789abcdef";
const J = 86400000;
// 2 novembre 2026 : heure d'hiver, Paris = UTC+1. 07:30Z = 08:30 à Paris.
const MATIN = Date.parse("2026-11-02T07:30:00Z");

let env;
let horloge;
let sortants;
let reponseScript;
const dateOrigine = Date.now;
const fetchOrigine = globalThis.fetch;
const logOrigine = console.log;

beforeEach(() => {
  env = { ADMIN_SECRET: ADMIN, COACH_SYNC_URL: "https://script.google.com/macros/s/EXEMPLE/exec", COACH_SYNC_SECRET: SECRET, DB: fauxD1() };
  horloge = MATIN;
  Date.now = () => horloge;
  sortants = [];
  reponseScript = () => ({ ok: true });
  globalThis.fetch = async (url, init) => {
    sortants.push({ url: String(url), corps: init.body });
    return new Response(JSON.stringify(reponseScript()), { status: 200 });
  };
  console.log = () => {};
});
afterEach(() => {
  Date.now = dateOrigine;
  globalThis.fetch = fetchOrigine;
  console.log = logOrigine;
});

function requete(chemin, corps, jeton) {
  const h = { "Content-Type": "application/json", Origin: "https://coachneiram.github.io" };
  if (jeton) h.Authorization = "Bearer " + jeton;
  return new Request("https://proxy.test" + chemin, { method: "POST", headers: h, body: typeof corps === "string" ? corps : JSON.stringify(corps ?? {}) });
}
async function appeler(chemin, corps, jeton, e = env) {
  const r = await worker.fetch(requete(chemin, corps, jeton), e);
  return { statut: r.status, corps: await r.json() };
}
const admin = (chemin, corps = {}) => appeler(chemin, corps, ADMIN).then((r) => r.corps);

async function clientActive(libelle) {
  const inv = await admin("/admin/invitations", { libelle });
  const act = await appeler("/auth/activer", { code: inv.code });
  assert.equal(act.corps.ok, true);
  return { jeton: act.corps.jeton, id: inv.client };
}

/** Présence envoyée à un instant donné. */
async function presence(q, derniereSaisie, quand) {
  const avant = horloge;
  horloge = quand;
  try {
    return await appeler("/presence", { derniereSaisie }, q.jeton);
  } finally {
    horloge = avant;
  }
}

const ligne = (id) => env.DB.sqlite.prepare("SELECT * FROM presence WHERE client_id = ?").get(id);

/** Événements partis vers Apps Script, signature vérifiée. */
function evenementsEnvoyes() {
  return sortants.map((s) => {
    const enveloppe = JSON.parse(s.corps);
    const attendue = createHmac("sha256", SECRET).update("v2." + enveloppe.ts + "." + enveloppe.nonce + "." + enveloppe.charge).digest("hex");
    assert.equal(enveloppe.sig, attendue, "enveloppe signée comme /coach-sync");
    assert.equal(s.url, env.COACH_SYNC_URL);
    return JSON.parse(enveloppe.charge);
  });
}

const cron = (quand) => T.alerterInactivite(env, quand);

describe("POST /presence", () => {
  test("sans jeton : 401, y compris en mode transition ; jeton inconnu : 401", async () => {
    for (const mode of [undefined, "transition"]) {
      const r = await appeler("/presence", { derniereSaisie: "2026-11-01" }, null, { ...env, ACCES_CLIENTS: mode });
      assert.equal(r.statut, 401, mode || "obligatoire");
    }
    assert.equal((await appeler("/presence", {}, "x".repeat(40))).corps.error, "jeton-invalide");
    assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM presence").get().n, 0);
  });

  test("avec jeton : vu_le et derniere_saisie gardés, la date ne recule pas", async () => {
    const a = await clientActive("Alex D.");
    assert.deepEqual((await presence(a, "2026-10-30", MATIN)).corps, { ok: true });
    assert.deepEqual({ ...ligne(a.id) }, { client_id: a.id, vu_le: MATIN, derniere_saisie: "2026-10-30", alerte_le: null, niveau: null });
    await presence(a, "2026-10-28", MATIN + 1000);
    assert.equal(ligne(a.id).derniere_saisie, "2026-10-30");
    await presence(a, null, MATIN + 2000);
    assert.equal(ligne(a.id).derniere_saisie, "2026-10-30");
    assert.equal(ligne(a.id).vu_le, MATIN + 2000);
  });

  test("date mal formée, irréelle ou future : 400 ; sans saisie : accepté", async () => {
    const a = await clientActive("Alex D.");
    for (const d of ["hier", "2026-13-01", "2026-02-30", "2026-11-05", 20261101]) {
      assert.equal((await appeler("/presence", { derniereSaisie: d }, a.jeton)).corps.error, "date-invalide", String(d));
    }
    assert.equal((await appeler("/presence", {}, a.jeton)).statut, 200);
    assert.equal(ligne(a.id).derniere_saisie, null);
  });

  test("plafond : quelques appels par jour", async () => {
    const a = await clientActive("Alex D.");
    const max = T.INACTIVITE.PRESENCE_PAR_JOUR;
    for (let i = 0; i < max; i++) assert.equal((await appeler("/presence", {}, a.jeton)).statut, 200);
    assert.equal((await appeler("/presence", {}, a.jeton)).statut, 429);
  });
});

describe("tâche planifiée : inactivité", () => {
  test("attention à 4 jours, critique à 7 ; sans présence, révoqué, actif : rien", async () => {
    const quatre = await clientActive("Alex D.");
    const sept = await clientActive("Bea R.");
    const actif = await clientActive("Chloe M.");
    const revoque = await clientActive("Dan P.");
    await admin("/admin/invitations", { libelle: "Eve S." }); // code jamais activé
    const sansPresence = await clientActive("Fred L."); // activé, jamais de présence

    await presence(quatre, "2026-10-29", MATIN - 4 * J);
    await presence(sept, "2026-10-20", MATIN - 9 * J);
    await presence(actif, "2026-10-31", MATIN - J);
    await presence(revoque, "2026-10-10", MATIN - 20 * J);
    await admin("/admin/revoquer", { client: revoque.id });

    const bilan = await cron(MATIN);
    assert.deepEqual(bilan, { envoyees: 2, echecs: 0, remises: 0 });
    const ev = evenementsEnvoyes().sort((x, y) => x.client.localeCompare(y.client));
    assert.deepEqual(
      ev.map((e) => [e.type, e.client, e.nbJours, e.niveau, e.message]),
      [
        ["alerte_inactivite", "Alex D.", 4, "attention", "Aucune saisie depuis 4 jours"],
        ["alerte_inactivite", "Bea R.", 9, "critique", "Aucune saisie depuis 9 jours"]
      ]
    );
    assert.equal(ligne(quatre.id).niveau, "attention");
    assert.equal(ligne(sept.id).niveau, "critique");
    assert.equal(ligne(sansPresence.id), undefined);
    // Ce qui part : le libellé, des jours, un niveau, rien d'autre de rempli.
    const rempli = Object.entries(ev[0]).filter(([, v]) => v !== "" && v !== false).map(([k]) => k).sort();
    assert.deepEqual(rempli, ["client", "envoyeLe", "message", "nbJours", "niveau", "type"]);
  });

  test("la date d'ouverture compte aussi : ouvert hier sans rien noter, pas d'alerte", async () => {
    const a = await clientActive("Alex D.");
    await presence(a, "2026-10-15", MATIN - J);
    assert.deepEqual(await cron(MATIN), { envoyees: 0, echecs: 0, remises: 0 });
  });

  test("une fois par jour : 8 h - 9 h à Paris, et plus de 20 h après la précédente", async () => {
    const a = await clientActive("Alex D.");
    await presence(a, "2026-10-28", MATIN - 5 * J);
    // 09:30 à Paris (08:30Z en hiver) : trop tard. 07:30 à Paris : trop tôt.
    assert.equal((await cron(Date.parse("2026-11-02T08:30:00Z"))).raison, "hors-horaire");
    assert.equal((await cron(Date.parse("2026-11-02T06:30:00Z"))).raison, "hors-horaire");
    assert.equal((await cron(Date.parse("2026-11-02T07:00:00Z"))).envoyees, 1);
    assert.equal((await cron(Date.parse("2026-11-02T07:59:00Z"))).raison, "deja-faite");
    assert.equal(sortants.length, 1);
  });

  test("heure de Paris en été : 06:30Z = 08:30 à Paris", async () => {
    assert.equal(T.heureParis(Date.parse("2026-07-01T06:30:00Z")), 8);
    assert.equal(T.heureParis(Date.parse("2026-12-01T06:30:00Z")), 7);
    assert.equal(T.dateParis(Date.parse("2026-11-01T23:30:00Z")), "2026-11-02");
  });

  test("pas de double alerte ; critique ensuite ; retour : remise à zéro", async () => {
    const a = await clientActive("Alex D.");
    await presence(a, "2026-10-29", MATIN - 4 * J);
    assert.equal((await cron(MATIN)).envoyees, 1); // 4 jours : attention
    assert.equal((await cron(MATIN + J)).envoyees, 0); // 5 jours : déjà dit
    assert.equal((await cron(MATIN + 2 * J)).envoyees, 0); // 6 jours
    assert.equal((await cron(MATIN + 3 * J)).envoyees, 1); // 7 jours : critique
    assert.equal((await cron(MATIN + 4 * J)).envoyees, 0); // 8 jours : déjà dit
    assert.deepEqual(evenementsEnvoyes().map((e) => [e.niveau, e.nbJours]), [["attention", 4], ["critique", 7]]);

    // Il revient : tout repart de zéro, et il faudra 4 nouveaux jours.
    await presence(a, "2026-11-06", MATIN + 4 * J + 3600000);
    assert.equal(ligne(a.id).niveau, null);
    assert.equal(ligne(a.id).alerte_le, null);
    assert.equal((await cron(MATIN + 5 * J)).envoyees, 0);
    assert.equal((await cron(MATIN + 8 * J)).envoyees, 1);
    assert.deepEqual(evenementsEnvoyes().pop().niveau, "attention");
  });

  test("script indisponible : rien n'est noté, l'alerte repart le lendemain", async () => {
    const a = await clientActive("Alex D.");
    await presence(a, "2026-10-28", MATIN - 5 * J);
    reponseScript = () => ({ ok: false, error: "occupe" });
    assert.deepEqual(await cron(MATIN), { envoyees: 0, echecs: 1, remises: 0 });
    assert.equal(ligne(a.id).niveau, null);
    reponseScript = () => ({ ok: true });
    assert.equal((await cron(MATIN + J)).envoyees, 1);
  });

  test("sans adresse du script : la tâche ne tourne pas", async () => {
    assert.equal((await T.alerterInactivite({ DB: env.DB }, MATIN)).raison, "non-configure");
  });

  test("scheduled() lance la tâche avec les autres", async () => {
    const a = await clientActive("Alex D.");
    await presence(a, "2026-10-20", MATIN - 8 * J);
    await worker.scheduled({}, env, { waitUntil() {} });
    assert.equal(ligne(a.id).niveau, "critique");
  });

  test("le schéma ajoute la table presence, telle que demandée", async () => {
    await clientActive("Alex D.");
    const sql = env.DB.sqlite.prepare("SELECT sql FROM sqlite_master WHERE name = 'presence'").get().sql;
    assert.equal(sql, "CREATE TABLE presence (client_id TEXT PRIMARY KEY, vu_le INTEGER NOT NULL, derniere_saisie TEXT, alerte_le INTEGER, niveau TEXT)");
  });
});

describe("/coach-sync : niveau et nbJours relayés", () => {
  const relayer = async (q, ev) => {
    sortants = [];
    const r = await appeler("/coach-sync", ev, q.jeton);
    return { statut: r.statut, corps: r.corps, ev: sortants.length ? JSON.parse(JSON.parse(sortants[0].corps).charge) : null };
  };

  test("alerte_poids et alerte_nutrition passent, avec leur niveau", async () => {
    const a = await clientActive("Alex D.");
    const p = await relayer(a, { type: "alerte_poids", niveau: "info", message: "Poids stable depuis 3 semaines en phase de perte", sousType: "stagnation", pesees: [80, 80] });
    assert.equal(p.statut, 200);
    assert.equal(p.ev.niveau, "info");
    assert.equal(p.ev.client, "Alex D.");
    assert.equal("pesees" in p.ev || "sousType" in p.ev, false, "un champ non nommé ne passe pas");
    const n = await relayer(a, { type: "alerte_nutrition", niveau: "attention", nbJours: 7, message: "Calories hors cible" });
    assert.equal(n.ev.niveau, "attention");
    assert.equal(n.ev.nbJours, 7);
  });

  test("niveau inconnu : vide (le script prendra sa table)", async () => {
    const a = await clientActive("Alex D.");
    assert.equal((await relayer(a, { type: "alerte_decalages", niveau: "urgentissime" })).ev.niveau, "");
  });

  test("une alerte d'inactivité venue d'un téléphone est refusée", async () => {
    const a = await clientActive("Alex D.");
    const r = await relayer(a, { type: "alerte_inactivite", nbJours: 30, niveau: "critique" });
    assert.equal(r.statut, 400);
    assert.equal(r.corps.error, "type-reserve");
    assert.equal(r.ev, null);
  });
});

describe("/admin/presence", () => {
  test("secret requis ; clients non révoqués, jours et niveau du jour", async () => {
    assert.equal((await appeler("/admin/presence", {}, "mauvais-secret-0123456789-0123456789")).statut, 401);
    const a = await clientActive("Alex D.");
    const b = await clientActive("Bea R.");
    await admin("/admin/invitations", { libelle: "Eve S." });
    const c = await clientActive("Chloe M.");
    await presence(a, "2026-10-26", MATIN - 7 * J);
    await presence(b, "2026-11-01", MATIN - J);
    await presence(c, "2026-11-01", MATIN - J);
    await admin("/admin/revoquer", { client: c.id });
    await cron(MATIN);
    const r = await admin("/admin/presence");
    assert.equal(r.ok, true);
    assert.deepEqual(
      r.clients.map((l) => [l.libelle, l.derniereSaisie, l.jours, l.niveau, l.alerteEnvoyee]),
      [
        ["Alex D.", "2026-10-26", 7, "critique", "critique"],
        ["Bea R.", "2026-11-01", 1, null, null],
        ["Eve S.", null, null, null, null]
      ]
    );
  });
});
