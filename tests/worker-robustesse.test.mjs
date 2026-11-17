/**
 * Robustesse du proxy (17 novembre 2026), hors questionnaire Feu Vert
 * (celui-ci est couvert dans worker-reservation-feu-vert.test.mjs) :
 *
 *   H1  /auth/activer : le plafond GLOBAL ne compte que les codes bien
 *       formes ; le plafond par adresse regroupe une IPv6 par /64.
 *   H2  /coach-sync : une page HTML servie en 200 par Google n'est plus
 *       prise pour un succes (seul un JSON { ok: true } compte).
 *   M5  /coach-sync : l'appel au script porte un delai maximal (15 s).
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fauxD1 } from "./faux-d1.mjs";

globalThis.__COACH_TEST__ = globalThis.__COACH_TEST__ || {};
const { default: worker } = await import("../worker/coach-neiram-proxy.js");
const T = globalThis.__COACH_TEST__;

const ADMIN = "admin-secret-de-test-0123456789-abcdef";
const SECRET = "secret-de-synchro-de-test-0123456789abcdef";
const ORIGINE = "https://coachneiram.github.io";

let env;
let sortants;
let reponseAmont;
const fetchOrigine = globalThis.fetch;
const logOrigine = console.log;

beforeEach(() => {
  env = { ADMIN_SECRET: ADMIN, COACH_SYNC_URL: "https://exemple.invalid/exec", COACH_SYNC_SECRET: SECRET, DB: fauxD1() };
  sortants = [];
  reponseAmont = () => new Response(JSON.stringify({ ok: true }), { status: 200 });
  globalThis.fetch = async (url, init) => {
    sortants.push({ url: String(url), init });
    return reponseAmont();
  };
  console.log = () => {};
});
afterEach(() => {
  globalThis.fetch = fetchOrigine;
  console.log = logOrigine;
});

function appeler(chemin, corps, { jeton, ip = "203.0.113.7", origine = ORIGINE, brut = null } = {}) {
  const h = { "Content-Type": "application/json", "CF-Connecting-IP": ip };
  if (origine) h.Origin = origine;
  if (jeton) h.Authorization = "Bearer " + jeton;
  return worker.fetch(new Request("https://proxy.test" + chemin, { method: "POST", headers: h, body: brut ?? JSON.stringify(corps ?? {}) }), env);
}
const admin = (chemin, corps) => appeler(chemin, corps, { jeton: ADMIN, origine: null });

async function clientActive(libelle = "Thomas B.") {
  const inv = await (await admin("/admin/invitations", { libelle })).json();
  const act = await (await appeler("/auth/activer", { code: inv.code }, { ip: "198.51.100.1" })).json();
  assert.equal(act.ok, true, "activation");
  return act.jeton;
}

describe("H1 : /auth/activer", () => {
  test("des requetes mal formees ne consomment pas le plafond global", async () => {
    // Bien plus que le plafond global, depuis des adresses toutes differentes.
    const n = T.PLAFONDS.activationGlobaleParHeure + 20;
    for (let i = 0; i < n; i++) {
      const ip = "10.3." + Math.floor(i / 250) + "." + (i % 250);
      if (i % 2) await appeler("/auth/activer", null, { ip, brut: "{illisible" });
      else await appeler("/auth/activer", { code: "trop-court" }, { ip });
    }
    const inv = await (await admin("/admin/invitations", { libelle: "Vrai client" })).json();
    const r = await appeler("/auth/activer", { code: inv.code }, { ip: "192.0.2.80" });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).ok, true);
  });

  test("le plafond global existe toujours pour les codes bien formes, et il est releve", async () => {
    assert.ok(T.PLAFONDS.activationGlobaleParHeure >= 200);
    const limite = T.PLAFONDS.activationGlobaleParHeure;
    let dernier;
    for (let i = 0; i <= limite; i++) {
      dernier = await appeler("/auth/activer", { code: "AAAAAAAA" }, { ip: "10.4." + Math.floor(i / 250) + "." + (i % 250) });
    }
    assert.equal(dernier.status, 429);
  });

  test("IPv6 : les adresses d'un meme /64 partagent le plafond par adresse", async () => {
    const statuts = [];
    for (let i = 1; i <= T.PLAFONDS.activationParHeure + 1; i++) {
      statuts.push((await appeler("/auth/activer", { code: "AAAAAAAA" }, { ip: "2001:db8:1:2:" + i.toString(16) + "::9" })).status);
    }
    assert.deepEqual(statuts.slice(0, -1), Array(T.PLAFONDS.activationParHeure).fill(400));
    assert.equal(statuts.at(-1), 429);
    assert.equal((await appeler("/auth/activer", { code: "AAAAAAAA" }, { ip: "2001:db8:1:3::9" })).status, 400);
  });
});

describe("H2 : /coach-sync n'accepte que { ok: true } en JSON", () => {
  test("JSON { ok: true } : 200", async () => {
    const jeton = await clientActive();
    const r = await appeler("/coach-sync", { type: "pointage", client: "X" }, { jeton });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).ok, true);
  });

  const cas = [
    ["page HTML en 200", () => new Response("<!DOCTYPE html><html><title>Connexion - Comptes Google</title></html>", { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } })],
    ["JSON sans champ ok", () => new Response(JSON.stringify({ statut: "ok" }), { status: 200 })],
    ["ok non booleen", () => new Response(JSON.stringify({ ok: 1 }), { status: 200 })],
    ["corps vide", () => new Response("", { status: 200 })]
  ];
  for (const [nom, reponse] of cas) {
    test(nom + " : 502, l'application garde l'evenement en file", async () => {
      const jeton = await clientActive();
      reponseAmont = reponse;
      const r = await appeler("/coach-sync", { type: "pointage", client: "X" }, { jeton });
      assert.equal(r.status, 502);
      assert.equal((await r.json()).ok, false);
    });
  }

  test("reponseScriptOk : uniquement statut 2xx et ok === true", async () => {
    assert.equal(await T.reponseScriptOk(new Response('{"ok":true}', { status: 200 })), true);
    assert.equal(await T.reponseScriptOk(new Response('{"ok":true}', { status: 302 })), false);
    assert.equal(await T.reponseScriptOk(new Response("ok", { status: 200 })), false);
    assert.equal(await T.reponseScriptOk(new Response("null", { status: 200 })), false);
  });
});

describe("M5 : delai maximal vers le script Google", () => {
  test("/coach-sync transmet un signal d'abandon", async () => {
    const jeton = await clientActive();
    sortants = [];
    await appeler("/coach-sync", { type: "pointage", client: "X" }, { jeton });
    const appel = sortants.find((s) => s.url === env.COACH_SYNC_URL);
    assert.ok(appel, "script appele");
    assert.ok(appel.init.signal && typeof appel.init.signal.aborted === "boolean", "signal present");
  });

  test("delai depasse : 502 « amont-injoignable »", async () => {
    const jeton = await clientActive();
    globalThis.fetch = async () => {
      throw new DOMException("delai depasse", "TimeoutError");
    };
    const r = await appeler("/coach-sync", { type: "pointage", client: "X" }, { jeton });
    assert.equal(r.status, 502);
    assert.equal((await r.json()).error, "amont-injoignable");
  });
});
