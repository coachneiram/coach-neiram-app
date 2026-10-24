/**
 * Accord explicite avant tout envoi a l'IA (lib/consentement.js), repris de
 * l'app Neiram le 24 octobre 2026. Des donnees de sante (poids, sommeil,
 * douleurs) peuvent partir vers Google : le RGPD (art. 9) demande un accord
 * explicite, et rien ne doit partir sans lui.
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  accordDonne,
  enregistrerAccord,
  verifierAccord,
  repondreAccord,
  surDemandeAccord,
  CLE,
  VERSION,
  TEXTES_ACCORD
} from "../app/src/lib/consentement.js";
import { genererTexte, definirConsentementIa, messageErreur } from "../app/src/lib/ia.js";

function creerLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k)
  };
}

beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

describe("accord pour l'IA", () => {
  test("aucun accord au depart ; accorde puis retire", () => {
    assert.equal(accordDonne(), null);
    enregistrerAccord(true, localStorage, new Date("2026-10-24T10:00:00Z"));
    assert.deepEqual(accordDonne(), { le: "2026-10-24T10:00:00.000Z" });
    enregistrerAccord(false);
    assert.equal(accordDonne(), null);
  });

  test("un accord d'une ancienne version ne vaut plus", () => {
    localStorage.setItem(CLE, JSON.stringify({ accepte: true, version: VERSION - 1, le: "2026-01-01" }));
    assert.equal(accordDonne(), null);
  });

  test("garde dans la sauvegarde (cle cn_)", () => {
    assert.ok(CLE.startsWith("cn_"));
  });

  test("sans ecran pour demander : refus, jamais d'envoi silencieux", async () => {
    assert.equal(await verifierAccord(), false);
  });

  test("une seule fenetre pour des demandes simultanees ; refus : redemande la fois suivante", async () => {
    let ouvertures = 0;
    const stop = surDemandeAccord(() => ouvertures++);
    const a = verifierAccord();
    const b = verifierAccord();
    assert.equal(ouvertures, 1);
    repondreAccord(false);
    assert.deepEqual(await Promise.all([a, b]), [false, false]);
    const c = verifierAccord();
    assert.equal(ouvertures, 2);
    repondreAccord(true);
    assert.equal(await c, true);
    assert.equal(await verifierAccord(), true);
    assert.equal(ouvertures, 2);
    stop();
  });
});

describe("genererTexte respecte l'accord", () => {
  const fetchOrigine = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = fetchOrigine;
    definirConsentementIa(null);
  });

  test("refus : aucune requete n'est envoyee, message clair", async () => {
    let appels = 0;
    globalThis.fetch = async () => {
      appels++;
      return new Response("{}");
    };
    definirConsentementIa(() => Promise.resolve(false));
    await assert.rejects(genererTexte({ prompt: "x" }), { message: "consentement" });
    assert.equal(appels, 0);
    assert.match(messageErreur(new Error("consentement")), /Rien n'a été envoyé/);
  });
});

describe("textes", () => {
  test("l'ecran dit ce qui part, a qui, et qu'on peut refuser ou retirer", () => {
    const tout = JSON.stringify(TEXTES_ACCORD);
    for (const motif of [/Google \(Gemini\)/, /résumé chiffré/, /ne garde rien/, /Refuser/, /retirer à tout moment/]) assert.match(tout, motif);
    const ecran = readFileSync(new URL("../app/src/ui/EcranConsentementIa.jsx", import.meta.url), "utf8");
    assert.match(ecran, /repondreAccord\(accepte\)/);
  });

  test("branche au demarrage et monte dans l'app", () => {
    assert.match(readFileSync(new URL("../app/src/main.jsx", import.meta.url), "utf8"), /brancherConsentement\(\);/);
    assert.match(readFileSync(new URL("../app/src/App.jsx", import.meta.url), "utf8"), /<EcranConsentementIa \/>/);
  });
});
