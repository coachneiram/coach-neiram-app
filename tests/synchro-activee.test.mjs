/**
 * Synchro coach activee d'office pour le coaching en ligne (4 octobre 2026).
 *
 * Le script Google v2.1 et le secret du proxy sont en place. L'application
 * envoie desormais les evenements des clients en ligne sans « lien de
 * synchro » a recopier ; elle ne connait toujours ni l'adresse du script ni
 * le secret. Une file d'attente ne doit ni perdre ni doubler un pointage.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { creerLocalStorage } from "./harness.mjs";
import * as synchro from "../app/src/lib/synchro-coach.js";
import { PROXY_BASE_URL } from "../app/src/lib/config.js";
import { CLES_ANNEXES, charger, enregistrer } from "../app/src/lib/stockage.js";

const EN_LIGNE = { name: "Thomas", coachingMode: "enligne" };

/** Doublure reseau ; `attente` retarde chaque reponse (envois en cours). */
function reseauSimule({ reponse = () => ({ ok: true }), attente = 0 } = {}) {
  const appels = [];
  globalThis.fetch = async (url, init) => {
    appels.push({ url: String(url), init, corps: JSON.parse(init.body) });
    if (attente) await new Promise((r) => setTimeout(r, attente));
    const r = reponse(appels.length);
    if (r instanceof Error) throw r;
    return { ok: r.status ? r.status < 300 : true, status: r.status || 200, json: async () => r };
  };
  return appels;
}

/** Attend que le premier envoi soit parti (la file a ete lue). */
async function enVol(appels) {
  for (let i = 0; i < 50 && !appels.length; i++) await new Promise((r) => setTimeout(r, 1));
  assert.equal(appels.length, 1, "le premier envoi doit etre en cours");
}

beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

describe("qui est synchronise", () => {
  test("coaching en ligne : actif sans aucun lien a recopier", () => {
    assert.equal(synchro.synchroActive(EN_LIGNE), true);
  });

  test("presentiel ou profil vide : inactif", () => {
    assert.equal(synchro.synchroActive({ name: "X", coachingMode: "presentiel" }), false);
    assert.equal(synchro.synchroActive({ name: "X" }), false);
    assert.equal(synchro.synchroActive(null), false);
  });

  test("ancien lien rempli : toujours reconnu", () => {
    assert.equal(synchro.synchroActive({ name: "X", coachSyncUrl: "https://exemple.test/exec" }), true);
  });
});

describe("ce qui part, et ou", () => {
  test("vers le proxy uniquement, jamais de secret ni d'adresse de script", async () => {
    const appels = reseauSimule();
    await synchro.envoyerEvenement({ ...EN_LIGNE, coachSyncUrl: "https://script.google.com/macros/s/X/exec" }, {
      type: "pointage",
      date: "2026-10-04",
      heureReelle: "18:40"
    });
    assert.equal(appels.length, 1);
    assert.equal(appels[0].url, PROXY_BASE_URL + "/coach-sync");
    assert.ok(!("secret" in appels[0].corps));
    assert.doesNotMatch(JSON.stringify(appels[0].corps), /script\.google|exec/);
    assert.equal(appels[0].corps.client, "Thomas");
  });

  test("prenom pris dans firstName a defaut de name", async () => {
    const appels = reseauSimule();
    await synchro.envoyerEvenement({ firstName: "Julie", coachingMode: "enligne" }, { type: "pointage" });
    assert.equal(appels[0].corps.client, "Julie");
  });

  test("le code de l'application ne contient aucun secret de synchro", () => {
    const source = readFileSync(new URL("../app/src/lib/synchro-coach.js", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(source, /secret\s*:/i);
    assert.doesNotMatch(source, /SECRET_SYNC|COACH_SYNC_SECRET/);
  });
});

describe("file d'attente : ni perte ni doublon", () => {
  test("refus { ok: false } ou panne reseau : l'evenement reste et repart", async () => {
    let n = 0;
    reseauSimule({ reponse: () => (++n === 1 ? { ok: false } : n === 2 ? new Error("hors ligne") : { ok: true }) });
    await synchro.envoyerEvenement(EN_LIGNE, { type: "pointage", date: "2026-10-04" });
    assert.equal(synchro.enAttente(), 1);
    await synchro.viderFile(EN_LIGNE);
    assert.equal(synchro.enAttente(), 1);
    assert.equal(await synchro.viderFile(EN_LIGNE), 1);
    assert.equal(synchro.enAttente(), 0);
  });

  test("deux vidages simultanes : chaque pointage n'est envoye qu'une fois", async () => {
    const appels = reseauSimule({ attente: 5 });
    enregistrer(CLES_ANNEXES.outboxCoach, [
      { type: "pointage", date: "j1" },
      { type: "pointage", date: "j2" }
    ]);
    await Promise.all([synchro.viderFile(EN_LIGNE), synchro.viderFile(EN_LIGNE)]);
    assert.deepEqual(appels.map((a) => a.corps.date), ["j1", "j2"]);
    assert.equal(synchro.enAttente(), 0);
  });

  test("un pointage ajoute pendant un envoi n'est pas efface", async () => {
    const appels = reseauSimule({ attente: 20, reponse: () => new Error("hors ligne") });
    enregistrer(CLES_ANNEXES.outboxCoach, [{ type: "pointage", date: "j1" }]);
    const vidage = synchro.viderFile(EN_LIGNE);
    await enVol(appels);
    // Pendant l'envoi de j1, un nouveau pointage arrive dans la file.
    const file = charger(CLES_ANNEXES.outboxCoach, []);
    enregistrer(CLES_ANNEXES.outboxCoach, [...file, { type: "pointage", date: "j2" }]);
    await vidage;
    assert.deepEqual(charger(CLES_ANNEXES.outboxCoach, []).map((e) => e.date), ["j1", "j2"]);
  });

  test("ajoute pendant un envoi reussi : seul l'envoye quitte la file", async () => {
    const appels = reseauSimule({ attente: 20 });
    enregistrer(CLES_ANNEXES.outboxCoach, [{ type: "pointage", date: "j1" }]);
    const vidage = synchro.viderFile(EN_LIGNE);
    await enVol(appels);
    enregistrer(CLES_ANNEXES.outboxCoach, [...charger(CLES_ANNEXES.outboxCoach, []), { type: "pointage", date: "j2" }]);
    await vidage;
    assert.deepEqual(charger(CLES_ANNEXES.outboxCoach, []).map((e) => e.date), ["j2"]);
  });
});

describe("evenements identiques", () => {
  test("deux fois le meme pointage, un seul remis : l'autre reste en file", async () => {
    let n = 0;
    reseauSimule({ reponse: () => (++n === 1 ? { ok: true } : new Error("coupure")) });
    const meme = { type: "pointage", date: "j1", client: "Thomas" };
    enregistrer(CLES_ANNEXES.outboxCoach, [meme, { ...meme }]);
    assert.equal(await synchro.viderFile(EN_LIGNE), 1);
    assert.equal(synchro.enAttente(), 1);
  });
});

describe("branchement", () => {
  test("la file repart a l'ouverture et au retour du reseau", () => {
    const app = readFileSync(new URL("../app/src/App.jsx", import.meta.url), "utf8");
    assert.match(app, /import \{ viderFile \} from "\.\/lib\/synchro-coach\.js"/);
    assert.match(app, /addEventListener\("online", relancer\)/);
    assert.match(app, /removeEventListener\("online", relancer\)/);
  });

  test("le profil n'a plus de champ « lien de synchro », il informe le client", () => {
    const champs = readFileSync(new URL("../app/src/ecrans/ChampsProfil.jsx", import.meta.url), "utf8");
    assert.doesNotMatch(champs, /coachSyncUrl/);
    assert.match(champs, /data-synchro-coach/);
  });
});
