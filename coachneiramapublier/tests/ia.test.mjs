/**
 * Appels IA.
 *
 * Aucun test n'appelle un vrai service : la doublure reseau intercepte tout.
 * On verifie le routage vers le proxy, le repli, et surtout la traduction des
 * erreurs — c'est elle qui determine le message affiche au client.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { chargerApp, creerLocalStorage } from "./harness.mjs";

/** Doublure reseau : enregistre les appels, repond selon un scenario. */
function reseauSimule(reponses) {
  const appels = [];
  const fetchSimule = async (url, init) => {
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
  return { fetchSimule, appels };
}

const reponseGemini = (texte) => ({
  status: 200,
  json: { candidates: [{ content: { parts: [{ text: texte }] } }] }
});

const MESSAGE = [{ role: "user", parts: [{ text: "bonjour" }] }];

describe("routage vers le proxy", () => {
  test("l'appel part vers le proxy, sans cle dans la requete", async () => {
    const { fetchSimule, appels } = reseauSimule([reponseGemini("ok")]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });
    if (!app.PROXY_BASE_URL) return; // rien a verifier si le proxy n'est pas configure

    await app.callGeminiRaw({ model: "gemini-3.6-flash", messages: MESSAGE, maxTokens: 100 });

    assert.ok(appels[0].url.startsWith(app.PROXY_BASE_URL), "url : " + appels[0].url);
    assert.ok(appels[0].url.endsWith("/ai"));

    const entetes = appels[0].init.headers || {};
    const toutesLesValeurs = JSON.stringify({ entetes, corps: appels[0].corps, url: appels[0].url });
    assert.ok(
      !/x-goog-api-key/i.test(toutesLesValeurs),
      "aucune cle ne doit sortir du navigateur"
    );
    assert.ok(!/[?&]key=/.test(appels[0].url), "aucune cle en parametre d'url");
  });

  test("aucune cle personnelle n'est requise quand le proxy est en place", () => {
    const app = chargerApp();
    if (!app.PROXY_BASE_URL) return;
    assert.equal(app.hasAI(""), true, "les fonctions IA doivent rester disponibles sans cle");
    assert.equal(app.hasAI(null), true);
  });

  test("le texte de la reponse est bien extrait", async () => {
    const { fetchSimule } = reseauSimule([reponseGemini("  PROXY OK  ")]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });

    const r = await app.callGeminiRaw({ model: "gemini-3.6-flash", messages: MESSAGE });
    assert.equal(r, "PROXY OK", "le texte doit etre nettoye de ses espaces");
  });
});

describe("traduction des erreurs", () => {
  // Ces libelles pilotent les messages vus par le client :
  // quota -> « Quota IA gratuit du jour atteint »
  // bad-key -> « Cle IA invalide ou inactive »
  test("429 devient « quota »", async () => {
    const { fetchSimule } = reseauSimule([{ status: 429 }]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });
    await assert.rejects(
      () => app.callGeminiRaw({ model: "gemini-3.6-flash", messages: MESSAGE }),
      /quota/
    );
  });

  test("401 devient « bad-key »", async () => {
    const { fetchSimule } = reseauSimule([{ status: 401 }]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });
    await assert.rejects(
      () => app.callGeminiRaw({ model: "gemini-3.6-flash", messages: MESSAGE }),
      /bad-key/
    );
  });

  test("403 devient « bad-key »", async () => {
    const { fetchSimule } = reseauSimule([{ status: 403 }]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });
    await assert.rejects(
      () => app.callGeminiRaw({ model: "gemini-3.6-flash", messages: MESSAGE }),
      /bad-key/
    );
  });

  test("500 remonte une erreur explicite", async () => {
    const { fetchSimule } = reseauSimule([{ status: 500 }]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });
    await assert.rejects(
      () => app.callGeminiRaw({ model: "gemini-3.6-flash", messages: MESSAGE }),
      /500/
    );
  });

  test("reponse vide : signalee au lieu d'afficher du blanc", async () => {
    const { fetchSimule } = reseauSimule([{ status: 200, json: { candidates: [] } }]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });
    await assert.rejects(
      () => app.callGeminiRaw({ model: "gemini-3.6-flash", messages: MESSAGE }),
      /empty/
    );
  });
});

describe("repli quand le proxy est injoignable", () => {
  test("panne du proxy + cle personnelle : bascule sur l'appel direct", async () => {
    const { fetchSimule, appels } = reseauSimule([
      new Error("proxy hors service"),
      reponseGemini("repondu en direct")
    ]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });
    if (!app.PROXY_BASE_URL) return;

    const r = await app.callGeminiRaw({
      model: "gemini-3.6-flash",
      messages: MESSAGE,
      apiKey: "cle-perso"
    });

    assert.equal(r, "repondu en direct");
    assert.equal(appels.length, 2, "un repli attendu apres l'echec du proxy");
    assert.ok(
      appels[1].url.includes("generativelanguage.googleapis.com"),
      "le repli doit viser Google directement"
    );
  });

  test("panne du proxy sans cle personnelle : erreur claire", async () => {
    const { fetchSimule } = reseauSimule([new Error("proxy hors service")]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });
    if (!app.PROXY_BASE_URL) return;

    await assert.rejects(
      () => app.callGeminiRaw({ model: "gemini-3.6-flash", messages: MESSAGE }),
      /missing-key/
    );
  });

  test("une erreur metier ne declenche pas le repli", async () => {
    // Un quota atteint est une reponse, pas une panne : rebasculer sur la cle
    // personnelle du client masquerait le probleme et consommerait son quota.
    const { fetchSimule, appels } = reseauSimule([{ status: 429 }, reponseGemini("ne doit pas servir")]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });
    if (!app.PROXY_BASE_URL) return;

    await assert.rejects(
      () => app.callGeminiRaw({ model: "gemini-3.6-flash", messages: MESSAGE, apiKey: "cle-perso" }),
      /quota/
    );
    assert.equal(appels.length, 1, "aucun repli ne doit avoir lieu");
  });
});

describe("aiGenerate — construction des requetes", () => {
  test("une photo est transmise en donnees integrees", async () => {
    const { fetchSimule, appels } = reseauSimule([reponseGemini("120 kcal")]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });

    await app.aiGenerate({
      prompt: "Analyse ce plat",
      images: [{ label: "Photo :", dataUrl: "data:image/jpeg;base64,AAAA" }],
      maxTokens: 200
    });

    const parts = appels[0].corps.messages[0].parts;
    const partieImage = parts.find((p) => p.inlineData);
    assert.ok(partieImage, "aucune image transmise");
    assert.equal(partieImage.inlineData.data, "AAAA", "l'entete data: doit etre retire");
    assert.ok(parts.some((p) => p.text === "Analyse ce plat"), "consigne absente");
  });

  test("une conversation conserve les roles", async () => {
    const { fetchSimule, appels } = reseauSimule([reponseGemini("reponse")]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });

    await app.aiGenerate({
      history: [
        { role: "user", text: "salut" },
        { role: "assistant", text: "bonjour" },
        { role: "user", text: "et pour le diner ?" }
      ],
      systemPrompt: "Tu es coach.",
      maxTokens: 300
    });

    const messages = appels[0].corps.messages;
    assert.equal(messages.length, 3);
    assert.equal(messages[0].role, "user");
    // Gemini attend « model » la ou l'application parle d'« assistant ».
    assert.equal(messages[1].role, "model", "role assistant non converti");
    assert.equal(appels[0].corps.systemPrompt, "Tu es coach.");
  });

  test("les modeles de repli sont essayes dans l'ordre", async () => {
    const { fetchSimule, appels } = reseauSimule([
      { status: 500 },
      { status: 500 },
      reponseGemini("le troisieme a repondu")
    ]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });

    const r = await app.aiGenerate({ prompt: "test", maxTokens: 50 });

    assert.equal(r, "le troisieme a repondu");
    assert.equal(appels.length, 3, "les trois modeles doivent avoir ete tentes");
    assert.deepEqual(
      appels.map((a) => a.corps.model),
      [...app.GEMINI_MODELS],
      "ordre des modeles non respecte"
    );
  });
});
