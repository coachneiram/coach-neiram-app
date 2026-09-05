/**
 * Modules extraits : IA et synchro coach.
 *
 * Aucun appel reel : la doublure reseau intercepte tout. On verifie surtout
 * que les garanties acquises en phase 1 sont bien reprises dans la nouvelle
 * implementation — aucune cle dans le navigateur, aucun pointage perdu.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { chargerApp, creerLocalStorage } from "./harness.mjs";
import * as ia from "../app/src/lib/ia.js";
import * as synchro from "../app/src/lib/synchro-coach.js";
import { PROXY_BASE_URL, GEMINI_MODELS } from "../app/src/lib/config.js";
import { CLES_ANNEXES, charger, enregistrer } from "../app/src/lib/stockage.js";

/** Doublure reseau : enregistre les appels, repond selon un scenario. */
function reseauSimule(reponses) {
  const appels = [];
  globalThis.fetch = async (url, init) => {
    appels.push({ url: String(url), init, corps: init && init.body ? JSON.parse(init.body) : null });
    const suite = reponses.shift();
    if (suite instanceof Error) throw suite;
    const statut = suite.status || 200;
    return {
      ok: statut >= 200 && statut < 300,
      status: statut,
      json: async () => suite.json ?? {},
      text: async () => JSON.stringify(suite.json ?? {})
    };
  };
  return appels;
}

const reponseGemini = (texte) => ({
  status: 200,
  json: { candidates: [{ content: { parts: [{ text: texte }] } }] }
});

describe("configuration : les deux versions visent le meme proxy", () => {
  test("PROXY_BASE_URL concorde avec celle de index.html", () => {
    const ancien = chargerApp();
    assert.equal(
      PROXY_BASE_URL,
      ancien.PROXY_BASE_URL,
      "les deux versions n'ecriraient plus au meme endroit"
    );
  });

  test("la liste des modeles concorde", () => {
    const ancien = chargerApp();
    assert.deepEqual(GEMINI_MODELS, [...ancien.GEMINI_MODELS]);
  });
});

describe("IA : aucune cle ne sort du navigateur", () => {
  test("l'appel part vers le proxy, sans cle nulle part", async () => {
    const appels = reseauSimule([reponseGemini("ok")]);
    await ia.genererTexte({ prompt: "bonjour", maxTokens: 100 });

    assert.equal(appels.length, 1);
    assert.ok(appels[0].url.startsWith(PROXY_BASE_URL));
    assert.ok(appels[0].url.endsWith("/ai"));

    const tout = JSON.stringify(appels[0]);
    assert.ok(!/x-goog-api-key/i.test(tout), "en-tete de cle detecte");
    assert.ok(!/[?&]key=/.test(appels[0].url), "cle en parametre d'url");
    assert.ok(!/apiKey/.test(tout), "champ apiKey transmis");
  });

  test("le texte est extrait et nettoye", async () => {
    reseauSimule([reponseGemini("  PROXY OK  ")]);
    assert.equal(await ia.genererTexte({ prompt: "x", maxTokens: 50 }), "PROXY OK");
  });
});

describe("IA : traduction des erreurs", () => {
  test("429 devient quota, et n'essaie pas les autres modeles a l'infini", async () => {
    // Chaque modele est tente deux fois sur quota (une pause, un nouvel essai).
    const appels = reseauSimule(Array.from({ length: 10 }, () => ({ status: 429 })));
    await assert.rejects(() => ia.genererTexte({ prompt: "x", maxTokens: 50 }), /quota/);
    assert.equal(appels.length, GEMINI_MODELS.length * 2, "nombre d'essais inattendu");
  });

  test("une cle invalide interrompt immediatement", async () => {
    const appels = reseauSimule([{ status: 401 }, reponseGemini("ne doit pas servir")]);
    await assert.rejects(() => ia.genererTexte({ prompt: "x", maxTokens: 50 }), /bad-key/);
    assert.equal(appels.length, 1, "inutile d'insister avec une cle invalide");
  });

  test("les modeles de repli sont essayes dans l'ordre", async () => {
    const appels = reseauSimule([
      { status: 500 },
      { status: 500 },
      reponseGemini("le troisieme a repondu")
    ]);
    assert.equal(await ia.genererTexte({ prompt: "x", maxTokens: 50 }), "le troisieme a repondu");
    assert.deepEqual(appels.map((a) => a.corps.model), GEMINI_MODELS);
  });

  test("les messages affiches au client restent explicites", () => {
    assert.match(ia.messageErreur(new Error("quota")), /Quota/);
    assert.match(ia.messageErreur(new Error("bad-key")), /Clé/);
    assert.match(ia.messageErreur(new Error("inconnu")), /indisponible/);
  });
});

describe("IA : construction des requetes", () => {
  test("une photo est transmise en donnees integrees", () => {
    const messages = ia.construireMessages({
      prompt: "Analyse ce plat",
      images: [{ label: "Photo :", dataUrl: "data:image/jpeg;base64,AAAA" }]
    });
    const parts = messages[0].parts;
    const image = parts.find((p) => p.inlineData);
    assert.ok(image, "image absente");
    assert.equal(image.inlineData.data, "AAAA", "l'entete data: doit etre retiree");
    assert.ok(parts.some((p) => p.text === "Analyse ce plat"));
  });

  test("une conversation convertit le role assistant en model", () => {
    const messages = ia.construireMessages({
      history: [
        { role: "user", text: "salut" },
        { role: "assistant", text: "bonjour" }
      ]
    });
    assert.equal(messages[0].role, "user");
    assert.equal(messages[1].role, "model");
  });
});

describe("synchro coach : aucun pointage perdu", () => {
  const PROFIL = { name: "Marien", coachSyncUrl: "https://exemple.test/exec" };

  beforeEach(() => {
    globalThis.localStorage = creerLocalStorage();
  });

  test("un evenement confirme quitte la file", async () => {
    reseauSimule([{ status: 200, json: { ok: true } }]);
    await synchro.envoyerEvenement(PROFIL, { type: "pointage", date: "2026-09-05" });
    assert.equal(synchro.enAttente(), 0);
  });

  test("panne reseau : l'evenement reste en file", async () => {
    reseauSimule([new Error("hors ligne")]);
    await synchro.envoyerEvenement(PROFIL, { type: "pointage" });
    assert.equal(synchro.enAttente(), 1);
  });

  test("refus du serveur : l'evenement reste en file", async () => {
    reseauSimule([{ status: 502, json: { ok: false } }]);
    await synchro.envoyerEvenement(PROFIL, { type: "pointage" });
    assert.equal(synchro.enAttente(), 1);
  });

  test("secret rejete (200 mais ok:false) : traite comme un echec", async () => {
    // Le piege exact que corrigeait la phase 1 : un statut 200 ne suffit pas.
    reseauSimule([{ status: 200, json: { ok: false } }]);
    await synchro.envoyerEvenement(PROFIL, { type: "pointage" });
    assert.equal(synchro.enAttente(), 1, "un refus applicatif doit conserver l'evenement");
  });

  test("l'evenement conserve repart au reessai suivant", async () => {
    const appels = reseauSimule([new Error("hors ligne"), { status: 200, json: { ok: true } }]);
    await synchro.envoyerEvenement(PROFIL, { type: "pointage", date: "2026-09-05" });
    assert.equal(synchro.enAttente(), 1);

    const remis = await synchro.viderFile(PROFIL);
    assert.equal(remis, 1);
    assert.equal(synchro.enAttente(), 0);
    assert.equal(appels[1].corps.date, "2026-09-05", "l'evenement d'origine doit repartir");
  });

  test("seuls les envois echoues restent en file", async () => {
    reseauSimule([
      { status: 200, json: { ok: true } },
      new Error("coupure"),
      { status: 200, json: { ok: true } }
    ]);
    enregistrer(CLES_ANNEXES.outboxCoach, [
      { type: "pointage", date: "j1" },
      { type: "pointage", date: "j2" },
      { type: "pointage", date: "j3" }
    ]);
    await synchro.viderFile(PROFIL);
    const restants = charger(CLES_ANNEXES.outboxCoach, []);
    assert.equal(restants.length, 1);
    assert.equal(restants[0].date, "j2");
  });

  test("la file est plafonnee : pas de croissance sans fin hors ligne", async () => {
    reseauSimule(Array.from({ length: 200 }, () => new Error("hors ligne")));
    for (let i = 0; i < 50; i++) {
      await synchro.envoyerEvenement(PROFIL, { type: "pointage", date: "j" + i });
    }
    assert.ok(synchro.enAttente() <= 40, "file non plafonnee : " + synchro.enAttente());
    const restants = charger(CLES_ANNEXES.outboxCoach, []);
    assert.equal(restants[restants.length - 1].date, "j49", "les plus recents sont conserves");
  });

  test("le prenom et l'horodatage sont ajoutes", async () => {
    const appels = reseauSimule([{ status: 200, json: { ok: true } }]);
    await synchro.envoyerEvenement(PROFIL, { type: "pointage" });
    assert.equal(appels[0].corps.client, "Marien");
    assert.ok(appels[0].corps.envoyeLe);
  });

  test("synchro non activee : aucun envoi", async () => {
    const appels = reseauSimule([]);
    const resultat = await synchro.envoyerEvenement({ name: "X" }, { type: "pointage" });
    assert.equal(resultat, false);
    assert.equal(appels.length, 0);
  });
});
