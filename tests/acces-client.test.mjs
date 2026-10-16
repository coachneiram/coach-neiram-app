/**
 * Application : code d'acces du coach et jeton client (audit P0-3 et P0-4,
 * 17 octobre 2026).
 *
 * Verrouille :
 *   - l'activation du code et la garde du jeton ;
 *   - l'envoi du jeton a /ai et /coach-sync ;
 *   - la traduction des refus du nouveau proxy, sans casser celle de
 *     l'ancien (les deux coexistent tant que Marien n'a pas colle le Worker) ;
 *   - un pointage refuse faute de jeton reste en file ;
 *   - le jeton ne part jamais dans une sauvegarde.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { creerLocalStorage } from "./harness.mjs";

// La doublure du harnais repond aussi a Object.keys(localStorage), comme un navigateur.
globalThis.localStorage = creerLocalStorage();
const magasin = { clear: () => globalThis.localStorage.clear() };

const acces = await import("../app/src/lib/acces.js");
const ia = await import("../app/src/lib/ia.js");
const synchro = await import("../app/src/lib/synchro-coach.js");
const { construireSauvegarde, restaurerSauvegarde, CLES_ANNEXES, charger } = await import("../app/src/lib/stockage.js");

let appels;
function reseau(reponses) {
  appels = [];
  globalThis.fetch = async (url, init) => {
    appels.push({ url: String(url), init });
    const r = reponses.shift();
    if (r instanceof Error) throw r;
    return new Response(JSON.stringify(r.json ?? {}), { status: r.status || 200 });
  };
}
const JETON = "J".repeat(43);

beforeEach(() => magasin.clear());

describe("Activation du code", () => {
  test("code valide : le jeton est garde, le libelle rendu", async () => {
    reseau([{ json: { ok: true, jeton: JETON, libelle: "Thomas B." } }]);
    const r = await acces.activerCode(" k7pm-q4xt ");
    assert.deepEqual(r, { ok: true, libelle: "Thomas B." });
    assert.equal(JSON.parse(appels[0].init.body).code, "K7PMQ4XT");
    assert.equal(acces.accesActuel().jeton, JETON);
    assert.deepEqual(acces.enTetesAcces(), { Authorization: "Bearer " + JETON });
  });

  test("code mal forme : refuse sans appel reseau", async () => {
    reseau([]);
    for (const c of ["", "ABC", "K7PM-Q4X0", "IIIIOOOO"]) assert.equal((await acces.activerCode(c)).erreur, "code-invalide", c);
    assert.equal(appels.length, 0);
  });

  test("refus du proxy et panne reseau : un message, aucun jeton garde", async () => {
    reseau([{ status: 400, json: { ok: false, error: "code-invalide" } }, { status: 429, json: { ok: false, error: "trop-de-tentatives" } }, new Error("hors ligne"), { status: 500, json: {} }]);
    assert.equal((await acces.activerCode("K7PMQ4XT")).erreur, "code-invalide");
    assert.equal((await acces.activerCode("K7PMQ4XT")).erreur, "trop-de-tentatives");
    assert.equal((await acces.activerCode("K7PMQ4XT")).erreur, "reseau");
    assert.equal((await acces.activerCode("K7PMQ4XT")).erreur, "indisponible");
    assert.equal(acces.accesActuel(), null);
    for (const k of ["code-invalide", "trop-de-tentatives", "reseau", "indisponible"]) assert.ok(acces.MSG_ACTIVATION[k]);
  });

  test("retirer l'acces oublie le jeton", () => {
    localStorage.setItem(acces.CLE_ACCES, JSON.stringify({ jeton: JETON }));
    acces.oublierAcces();
    assert.deepEqual(acces.enTetesAcces(), {});
  });
});

describe("Le jeton part avec chaque appel", () => {
  const ok = { json: { candidates: [{ content: { parts: [{ text: "ok" }] } }] } };

  test("/ai : en-tete Authorization quand le client a active son code, rien sinon", async () => {
    reseau([ok]);
    await ia.genererTexte({ prompt: "x" });
    assert.equal(appels[0].init.headers.Authorization, undefined);
    localStorage.setItem(acces.CLE_ACCES, JSON.stringify({ jeton: JETON }));
    reseau([ok]);
    await ia.genererTexte({ prompt: "x" });
    assert.equal(appels[0].init.headers.Authorization, "Bearer " + JETON);
  });

  test("/coach-sync : jeton joint ; refuse faute de jeton, l'evenement reste en file", async () => {
    const profil = { name: "Thomas", coachingMode: "enligne", slots: [{ day: "mon", time: "18:00" }] };
    reseau([{ status: 401, json: { ok: false, error: "acces-requis" } }]);
    await synchro.envoyerEvenement(profil, { type: "pointage", date: "2026-10-16" });
    assert.equal(appels.length, 1);
    assert.equal(charger(CLES_ANNEXES.outboxCoach, []).length, 1, "garde en file");

    localStorage.setItem(acces.CLE_ACCES, JSON.stringify({ jeton: JETON }));
    reseau([{ json: { ok: true, verifie: true } }]);
    assert.equal(await synchro.viderFile(profil), 1);
    assert.equal(appels[0].init.headers.Authorization, "Bearer " + JETON);
    assert.equal(charger(CLES_ANNEXES.outboxCoach, []).length, 0);
  });
});

describe("Refus du proxy traduits pour le client", () => {
  const cas = [
    [{ status: 401, json: { ok: false, error: "acces-requis" } }, "acces"],
    [{ status: 401, json: { ok: false, error: "jeton-invalide" } }, "acces"],
    [{ status: 429, json: { ok: false, error: "quota-client" } }, "quota-client"],
    [{ status: 429, json: { ok: false, error: "trop-de-requetes" } }, "frequence"],
    [{ status: 503, json: { ok: false, error: "fournisseur-refus" } }, "bad-key"],
    [{ status: 503, json: { ok: false, error: "acces-non-configure" } }, "indisponible"]
  ];
  for (const [reponse, attendu] of cas) {
    test(`${reponse.status} « ${reponse.json.error} » → « ${attendu} », sans essayer les autres modeles`, async () => {
      reseau([reponse, reponse, reponse, reponse, reponse, reponse]);
      await assert.rejects(() => ia.genererTexte({ prompt: "x" }), new RegExp("^Error: " + attendu + "$"));
      if (attendu !== "indisponible") assert.equal(appels.length, 1);
      assert.ok(ia.MSG_ERREUR[attendu], "message affichable");
    });
  }

  test("ancien proxy (corps de Google) : interpretation d'origine conservee", async () => {
    reseau([{ status: 401, json: { error: { code: 401, message: "API key not valid" } } }]);
    await assert.rejects(() => ia.genererTexte({ prompt: "x" }), /bad-key/);
  });

  test("le message d'acces dit quoi faire", () => {
    assert.match(ia.messageErreur(new Error("acces")), /code d'accès donné par ton coach dans les Réglages/);
  });
});

describe("Sauvegarde", () => {
  test("le jeton ne part jamais dans une sauvegarde, et une restauration ne l'ecrase pas", () => {
    localStorage.setItem(acces.CLE_ACCES, JSON.stringify({ jeton: JETON, libelle: "Thomas" }));
    localStorage.setItem("coach_profile", JSON.stringify({ name: "Thomas" }));
    const s = construireSauvegarde();
    assert.ok(!JSON.stringify(s).includes(JETON));
    assert.ok("coach_profile" in s.data);
    restaurerSauvegarde({ ...s, data: { ...s.data, [acces.CLE_ACCES]: JSON.stringify({ jeton: "AUTRE".repeat(9) }) } });
    assert.equal(acces.accesActuel().jeton, JETON);
  });
});
