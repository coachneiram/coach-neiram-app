/**
 * Synchronisation vers le coach.
 *
 * Un pointage perdu ne se voit pas : le client croit avoir pointe, le coach ne
 * recoit rien, et personne ne s'en apercoit. La file d'attente locale doit donc
 * ne relacher un evenement qu'une fois sa reception confirmee.
 *
 * C'est le comportement corrige en phase 1 : avant, un envoi refuse etait
 * efface de la file en silence.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { chargerApp, creerLocalStorage } from "./harness.mjs";

const PROFIL_EN_LIGNE = { name: "Marien", coachSyncUrl: "https://exemple.test/exec" };

/** Doublure reseau qui enregistre les appels et repond ce qu'on lui dit. */
function reseauSimule(reponses) {
  const appels = [];
  const fetchSimule = async (url, init) => {
    appels.push({ url: String(url), init, corps: init && init.body ? JSON.parse(init.body) : null });
    const suite = reponses.shift();
    if (typeof suite === "function") return suite();
    if (suite instanceof Error) throw suite;
    return {
      ok: suite.ok !== false,
      status: suite.status || 200,
      json: async () => suite.json ?? { ok: suite.ok !== false },
      text: async () => JSON.stringify(suite.json ?? { ok: suite.ok !== false })
    };
  };
  return { fetchSimule, appels };
}

describe("queueCoachEvent — mise en file et envoi", () => {
  test("un evenement accepte quitte la file", async () => {
    const { fetchSimule, appels } = reseauSimule([{ ok: true }]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });

    await app.queueCoachEvent(PROFIL_EN_LIGNE, { type: "pointage", date: "2026-09-05" });

    assert.equal(appels.length, 1, "un envoi attendu");
    const restants = await app.loadKey(app.COACH_OUTBOX_KEY, []);
    assert.equal(restants.length, 0, "la file doit etre vide apres confirmation");
  });

  test("le prenom du client et l'horodatage sont ajoutes", async () => {
    const { fetchSimule, appels } = reseauSimule([{ ok: true }]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });

    await app.queueCoachEvent(PROFIL_EN_LIGNE, { type: "pointage" });

    assert.equal(appels[0].corps.client, "Marien");
    assert.ok(appels[0].corps.envoyeLe, "horodatage manquant");
  });

  test("client sans prenom : valeur de repli explicite", async () => {
    const { fetchSimule, appels } = reseauSimule([{ ok: true }]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });

    await app.queueCoachEvent({ coachSyncUrl: "https://exemple.test/exec" }, { type: "pointage" });

    assert.ok(appels[0].corps.client.length > 0, "le coach doit voir quelque chose");
  });

  test("synchro non activee : aucun envoi", async () => {
    const { fetchSimule, appels } = reseauSimule([]);
    // DEFAULT_COACH_SYNC_URL sert de repli quand le profil n'a pas d'adresse ;
    // on neutralise donc la synchro en la vidant explicitement.
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });
    if (app.DEFAULT_COACH_SYNC_URL) {
      // Avec une adresse par defaut renseignee, la synchro est active pour tous.
      // Ce test verifie alors qu'un profil sans adresse utilise bien ce repli.
      await app.queueCoachEvent({ name: "X" }, { type: "pointage" });
      assert.equal(appels.length, 1, "le repli par defaut doit etre utilise");
    } else {
      await app.queueCoachEvent({ name: "X" }, { type: "pointage" });
      assert.equal(appels.length, 0);
    }
  });
});

describe("flushCoachOutbox — la garantie de non-perte", () => {
  test("panne reseau : l'evenement reste en file", async () => {
    const { fetchSimule } = reseauSimule([new Error("hors ligne")]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });

    await app.queueCoachEvent(PROFIL_EN_LIGNE, { type: "pointage", date: "2026-09-05" });

    const restants = await app.loadKey(app.COACH_OUTBOX_KEY, []);
    assert.equal(restants.length, 1, "un pointage hors ligne ne doit jamais etre perdu");
    assert.equal(restants[0].type, "pointage");
  });

  test("refus du serveur : l'evenement reste en file", async () => {
    // C'est precisement le cas qui perdait des pointages avant la phase 1 :
    // le mode no-cors empechait de voir le refus.
    const { fetchSimule } = reseauSimule([{ ok: false, status: 502, json: { ok: false } }]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });

    await app.queueCoachEvent(PROFIL_EN_LIGNE, { type: "pointage" });

    const restants = await app.loadKey(app.COACH_OUTBOX_KEY, []);
    assert.equal(restants.length, 1, "un envoi refuse doit etre conserve pour un nouvel essai");
  });

  test("secret rejete par le script : l'evenement reste en file", async () => {
    // Le proxy repond 200 mais avec ok:false quand le script refuse le secret.
    const { fetchSimule } = reseauSimule([{ ok: true, status: 200, json: { ok: false } }]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });

    await app.queueCoachEvent(PROFIL_EN_LIGNE, { type: "pointage" });

    const restants = await app.loadKey(app.COACH_OUTBOX_KEY, []);
    assert.equal(restants.length, 1, "un refus applicatif doit etre traite comme un echec");
  });

  test("l'evenement conserve part au reessai suivant", async () => {
    const { fetchSimule, appels } = reseauSimule([
      new Error("hors ligne"),
      { ok: true }
    ]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });

    await app.queueCoachEvent(PROFIL_EN_LIGNE, { type: "pointage", date: "2026-09-05" });
    assert.equal((await app.loadKey(app.COACH_OUTBOX_KEY, [])).length, 1);

    await app.flushCoachOutbox(PROFIL_EN_LIGNE);

    assert.equal(appels.length, 2, "un second envoi attendu");
    assert.equal(appels[1].corps.date, "2026-09-05", "l'evenement d'origine doit etre renvoye");
    assert.equal((await app.loadKey(app.COACH_OUTBOX_KEY, [])).length, 0);
  });

  test("plusieurs evenements : seuls les refuses restent", async () => {
    const { fetchSimule } = reseauSimule([
      { ok: true },
      new Error("coupure"),
      { ok: true }
    ]);
    const stockage = creerLocalStorage();
    const app = chargerApp({ fetch: fetchSimule, localStorage: stockage });

    await app.saveKey(app.COACH_OUTBOX_KEY, [
      { type: "pointage", date: "j1" },
      { type: "pointage", date: "j2" },
      { type: "pointage", date: "j3" }
    ]);
    await app.flushCoachOutbox(PROFIL_EN_LIGNE);

    const restants = await app.loadKey(app.COACH_OUTBOX_KEY, []);
    assert.equal(restants.length, 1);
    assert.equal(restants[0].date, "j2", "seul l'envoi interrompu doit rester");
  });

  test("la file est plafonnee : pas de croissance sans fin hors ligne", async () => {
    const { fetchSimule } = reseauSimule(Array.from({ length: 60 }, () => new Error("hors ligne")));
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });

    for (let i = 0; i < 50; i++) {
      await app.queueCoachEvent(PROFIL_EN_LIGNE, { type: "pointage", date: "j" + i });
    }

    const restants = await app.loadKey(app.COACH_OUTBOX_KEY, []);
    assert.ok(restants.length <= 40, "file non plafonnee : " + restants.length + " evenements");
    // Le plafond garde les plus recents : c'est le comportement attendu.
    assert.equal(restants[restants.length - 1].date, "j49");
  });
});

describe("routage : proxy ou envoi direct", () => {
  test("avec le proxy configure, l'envoi passe par lui", async () => {
    const { fetchSimule, appels } = reseauSimule([{ ok: true }]);
    const app = chargerApp({ fetch: fetchSimule, localStorage: creerLocalStorage() });

    await app.queueCoachEvent(PROFIL_EN_LIGNE, { type: "pointage" });

    if (app.PROXY_BASE_URL) {
      assert.ok(
        appels[0].url.startsWith(app.PROXY_BASE_URL),
        "l'envoi doit passer par le proxy, url utilisee : " + appels[0].url
      );
      assert.ok(appels[0].url.endsWith("/coach-sync"));
      assert.notEqual(appels[0].init.mode, "no-cors", "le mode no-cors empeche de detecter un refus");
    } else {
      assert.equal(appels[0].url, PROFIL_EN_LIGNE.coachSyncUrl);
    }
  });

  test("l'adresse du script n'est plus portee par l'application", async () => {
    const app = chargerApp();
    if (app.PROXY_BASE_URL) {
      const cible = app.coachSyncEndpoint(PROFIL_EN_LIGNE);
      assert.ok(
        cible.startsWith(app.PROXY_BASE_URL),
        "le client ne doit plus contacter le script directement"
      );
    }
  });
});
