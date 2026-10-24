/**
 * /coach-sync : evenements authentifies et signes (audit P0-4, 17 octobre 2026).
 *
 * Avant :
 *   - le proxy acceptait n'importe quel evenement, sous le prenom de son
 *     choix, et y ajoutait lui-meme le secret : n'importe qui pouvait ecrire
 *     de fausses alertes dans le classeur du coach et declencher ses e-mails ;
 *   - le secret voyageait en clair dans le corps vers Apps Script ;
 *   - un corps invalide envoye a l'adresse /exec ecrivait une ligne dans
 *     l'onglet Erreurs.
 *
 * Maintenant :
 *   - application → proxy : jeton du client, le prenom vient de sa fiche ;
 *   - proxy → Apps Script : HMAC-SHA256 horodate avec nonce ;
 *   - un evenement refuse n'ecrit rien, nulle part.
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { fauxD1 } from "./faux-d1.mjs";
import { creerScript } from "./doublure-apps-script.mjs";

globalThis.__COACH_TEST__ = globalThis.__COACH_TEST__ || {};
const { default: worker } = await import("../worker/coach-neiram-proxy.js");
const { signerEvenement } = globalThis.__COACH_TEST__;

const SECRET = "secret-de-synchro-de-test-0123456789abcdef";
const ADMIN = "admin-secret-de-test-0123456789-abcdef";
const ORIGINE = "https://coachneiram.github.io";
const POINTAGE = { type: "pointage", client: "Usurpateur", date: "2026-10-16", creneau: "lundi 18:00", dureeMin: 45, rpe: 7 };

let env;
let sortants;
let script;
const fetchOrigine = globalThis.fetch;
const logOrigine = console.log;

/** Le proxy parle a la doublure Apps Script, comme en production. */
function brancherSurScript() {
  globalThis.fetch = async (url, init) => {
    sortants.push({ url: String(url), init });
    const r = script.poster(init.body);
    return new Response(JSON.stringify(r), { status: 200 });
  };
}

beforeEach(() => {
  env = { COACH_SYNC_URL: "https://script.google.com/macros/s/EXEMPLE/exec", COACH_SYNC_SECRET: SECRET, ADMIN_SECRET: ADMIN, DB: fauxD1() };
  sortants = [];
  script = creerScript({ reglages: { EXIGER_SECRET: true, ACCEPTER_SECRET_EN_CLAIR: false }, proprietes: { SECRET_SYNC: SECRET } });
  brancherSurScript();
  console.log = () => {};
});
afterEach(() => {
  globalThis.fetch = fetchOrigine;
  console.log = logOrigine;
});

const requete = (chemin, corps, jeton) =>
  new Request("https://proxy.test" + chemin, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGINE, ...(jeton ? { Authorization: "Bearer " + jeton } : {}) },
    body: JSON.stringify(corps)
  });
const appeler = (chemin, corps, jeton) => worker.fetch(requete(chemin, corps, jeton), env);

async function jetonClient(libelle = "Thomas B.") {
  const inv = await (await worker.fetch(new Request("https://proxy.test/admin/invitations", { method: "POST", headers: { Authorization: "Bearer " + ADMIN }, body: JSON.stringify({ libelle }) }), env)).json();
  return (await (await appeler("/auth/activer", { code: inv.code })).json()).jeton;
}

/** Aucune ecriture, aucun e-mail, aucun nonce retenu. */
function rienEcrit() {
  for (const [nom, f] of script.feuilles) assert.equal(f.appends.length, 0, "onglet " + nom);
  assert.equal(script.mails.length, 0);
  assert.deepEqual(Object.keys(script.cache), []);
}

/** Enveloppe v2 signee « a la main », pour fabriquer des cas d'attaque. */
function enveloppe({ charge = JSON.stringify(POINTAGE), ts = Date.now(), nonce = "a".repeat(32), secret = SECRET } = {}) {
  const sig = createHmac("sha256", secret).update(`v2.${ts}.${nonce}.${charge}`, "utf8").digest("hex");
  return { v: 2, ts, nonce, charge, sig };
}

describe("Application → proxy", () => {
  test("sans authentification : 401, rien n'est relaye", async () => {
    const r = await appeler("/coach-sync", POINTAGE);
    assert.equal(r.status, 401);
    assert.equal(sortants.length, 0);
    rienEcrit();
  });

  test("evenement legitime : le prenom vient de la fiche client, jamais de la requete", async () => {
    const jeton = await jetonClient("Thomas B.");
    const r = await appeler("/coach-sync", POINTAGE, jeton);
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true, verifie: true });
    const lignes = script.lignes("Journal");
    assert.equal(lignes.length, 1);
    assert.equal(lignes[0]["Client"], "Thomas B.");
    assert.ok(!JSON.stringify(lignes).includes("Usurpateur"));
  });

  test("le secret ne voyage plus : seule une signature part vers Apps Script", async () => {
    const jeton = await jetonClient();
    await appeler("/coach-sync", POINTAGE, jeton);
    const corps = sortants[0].init.body;
    assert.ok(!corps.includes(SECRET));
    const e = JSON.parse(corps);
    assert.deepEqual(Object.keys(e).sort(), ["charge", "nonce", "sig", "ts", "v"]);
    assert.equal(JSON.parse(e.charge).secret, undefined);
  });

  test("schema invalide (type inconnu) : 400 au proxy, rien n'atteint le classeur", async () => {
    const jeton = await jetonClient();
    const r = await appeler("/coach-sync", { ...POINTAGE, type: "supprimer_tout" }, jeton);
    assert.equal(r.status, 400);
    assert.equal(sortants.length, 0);
    rienEcrit();
  });

  test("echec de la destination : 502, l'application garde l'evenement", async () => {
    const jeton = await jetonClient();
    globalThis.fetch = async () => {
      throw new Error("script.google.com injoignable");
    };
    const r1 = await appeler("/coach-sync", POINTAGE, jeton);
    assert.equal(r1.status, 502);
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: false, error: "occupe" }), { status: 200 });
    const r2 = await appeler("/coach-sync", POINTAGE, jeton);
    assert.equal(r2.status, 502);
    assert.equal((await r2.json()).ok, false);
  });

  test("cle de signature absente : 503 plutot qu'un envoi non signe", async () => {
    delete env.COACH_SYNC_SECRET;
    const r = await appeler("/coach-sync", POINTAGE, await jetonClient());
    assert.equal(r.status, 503);
    assert.equal(sortants.length, 0);
  });

  test("mode transition : sans jeton, accepte mais marque « (non vérifié) »", async () => {
    env.ACCES_CLIENTS = "transition";
    const r = await appeler("/coach-sync", POINTAGE);
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true, verifie: false });
    assert.equal(script.lignes("Journal")[0]["Client"], "Usurpateur (non vérifié)");
  });
});

describe("Proxy → Apps Script : la signature", () => {
  test("evenement sans authentification (ancien format sans secret) : refuse, rien d'ecrit", () => {
    assert.deepEqual(script.poster(POINTAGE), { ok: false, statut: "erreur", error: "non-autorise" });
    rienEcrit();
  });

  test("corps qui n'est pas du JSON : refuse sans trace dans Erreurs", () => {
    assert.equal(script.poster("{pas du json").error, "json-invalide");
    rienEcrit();
  });

  test("signature absente ou mal formee : refuse", () => {
    const { sig, ...sansSig } = enveloppe();
    assert.equal(script.poster(sansSig).error, "signature-invalide");
    assert.equal(script.poster({ ...enveloppe(), sig: "zz" }).error, "signature-invalide");
    rienEcrit();
  });

  test("signature avec un autre secret : refuse", () => {
    assert.equal(script.poster(enveloppe({ secret: "un-autre-secret" })).error, "signature-invalide");
    rienEcrit();
  });

  test("evenement modifie apres signature : refuse", () => {
    const e = enveloppe();
    const triche = { ...e, charge: e.charge.replace("Usurpateur", "Marien") };
    assert.equal(script.poster(triche).error, "signature-invalide");
    assert.equal(script.poster({ ...e, ts: e.ts + 1 }).error, "signature-invalide", "horodatage change");
    rienEcrit();
  });

  test("horodatage expire (plus de 5 minutes) : refuse", () => {
    assert.equal(script.poster(enveloppe({ ts: Date.now() - 6 * 60 * 1000 })).error, "horodatage-expire");
    assert.equal(script.poster(enveloppe({ ts: Date.now() + 6 * 60 * 1000 })).error, "horodatage-expire");
    rienEcrit();
  });

  test("rejeu d'un evenement deja accepte : refuse, une seule ligne", () => {
    const e = enveloppe();
    assert.equal(script.poster(e).ok, true);
    assert.deepEqual(script.poster(e), { ok: false, statut: "erreur", error: "rejeu" });
    assert.equal(script.lignes("Journal").length, 1);
  });

  test("charge signee mais illisible : refusee", () => {
    assert.equal(script.poster(enveloppe({ charge: "{tronque" })).error, "json-invalide");
    assert.equal(script.lignes("Journal").length, 0);
  });

  test("evenement legitime signe par le proxy : verifie par le script (meme algorithme des deux cotes)", async () => {
    const corps = await signerEvenement({ ...POINTAGE, client: "Léa" }, SECRET);
    assert.equal(script.poster(corps).ok, true);
    assert.equal(script.lignes("Journal")[0]["Client"], "Léa");
  });

  test("transition : l'ancien format (secret en clair) n'est accepte que si on le permet encore", () => {
    assert.equal(script.poster({ ...POINTAGE, secret: SECRET }).error, "non-autorise");
    const ancien = creerScript({ reglages: { EXIGER_SECRET: true, ACCEPTER_SECRET_EN_CLAIR: true }, proprietes: { SECRET_SYNC: SECRET } });
    assert.equal(ancien.poster({ ...POINTAGE, secret: SECRET }).ok, true);
    assert.equal(ancien.poster({ ...POINTAGE, secret: "faux" }).error, "non-autorise");
  });

  // Transition fermee chez le coach le 24/10/2026 (version 17) : le depot
  // livre desormais le secret en clair refuse.
  test("le depot livre la transition fermee (le proxy en production signe)", () => {
    const s = creerScript({ reglages: { EXIGER_SECRET: true } });
    assert.equal(s.contexte.ACCEPTER_SECRET_EN_CLAIR, false);
    assert.equal(s.poster({ ...POINTAGE, secret: SECRET }).error, "non-autorise");
    assert.equal(s.contexte.FENETRE_SIGNATURE_MS, 300000);
  });
});

describe("Rotation du secret", () => {
  test("pendant la rotation l'ancien et le nouveau passent ; apres, seul le nouveau", () => {
    script.contexte.afficher = () => {};
    const nouveau = script.appeler("tournerSecret");
    assert.notEqual(nouveau, SECRET);
    assert.equal(script.poster(enveloppe({ nonce: "1".repeat(32) })).ok, true, "ancien secret encore accepte");
    assert.equal(script.poster(enveloppe({ nonce: "2".repeat(32), secret: nouveau })).ok, true);
    script.appeler("oublierAncienSecret");
    assert.equal(script.poster(enveloppe({ nonce: "3".repeat(32) })).error, "signature-invalide");
    assert.equal(script.poster(enveloppe({ nonce: "4".repeat(32), secret: nouveau })).ok, true);
  });

  test("sans aucun secret enregistre : tout est refuse", () => {
    const s = creerScript({ reglages: { EXIGER_SECRET: true, ACCEPTER_SECRET_EN_CLAIR: false } });
    assert.equal(s.poster(enveloppe()).error, "non-autorise");
  });
});
