/**
 * Worker : Feu Vert (coaching collectif, 14 novembre 2026).
 *
 *   - /admin/feuvert (ADMIN_SECRET) : inscrire, fixer le Passeport et les
 *     missions validées, lister, retirer ; données nettoyées champ par champ ;
 *   - /feuvert/etat : le membre LIT son Passeport (jeton obligatoire,
 *     même en transition), rien d'autre ;
 *   - /feuvert/tableau : accord, pseudo, compteurs ; seules les membres de
 *     la MÊME cohorte ayant donné leur accord y figurent, par ordre
 *     alphabétique, sans libellé ni identifiant ;
 *   - révoquer un client efface ses données Feu Vert ;
 *   - /coach-sync relaie le check-in (type checkin_feu_vert).
 *
 * La base est une vraie SQLite en mémoire (tests/faux-d1.mjs).
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fauxD1 } from "./faux-d1.mjs";

globalThis.__COACH_TEST__ = globalThis.__COACH_TEST__ || {};
const { default: worker } = await import("../worker/coach-neiram-proxy.js");
const T = globalThis.__COACH_TEST__;

const ADMIN = "admin-secret-de-test-0123456789-abcdef";
const SECRET = "secret-de-synchro-de-test-0123456789abcdef";

let env;
let sortants;
const fetchOrigine = globalThis.fetch;
const logOrigine = console.log;

beforeEach(() => {
  env = { ADMIN_SECRET: ADMIN, COACH_SYNC_URL: "https://exemple.invalid/exec", COACH_SYNC_SECRET: SECRET, DB: fauxD1() };
  sortants = [];
  globalThis.fetch = async (url, init) => {
    sortants.push({ url: String(url), corps: init.body });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  console.log = () => {};
});
afterEach(() => {
  globalThis.fetch = fetchOrigine;
  console.log = logOrigine;
});

function requete(chemin, corps, jeton) {
  const h = { "Content-Type": "application/json", Origin: "https://coachneiram.github.io" };
  if (jeton) h.Authorization = "Bearer " + jeton;
  return new Request("https://proxy.test" + chemin, { method: "POST", headers: h, body: JSON.stringify(corps ?? {}) });
}
async function appeler(chemin, corps, jeton, e = env) {
  const r = await worker.fetch(requete(chemin, corps, jeton), e);
  return { statut: r.status, corps: await r.json() };
}
const admin = (corps) => appeler("/admin/feuvert", corps, ADMIN);

async function clientActive(libelle) {
  const inv = (await appeler("/admin/invitations", { libelle }, ADMIN)).corps;
  const act = await appeler("/auth/activer", { code: inv.code });
  assert.equal(act.corps.ok, true);
  return { jeton: act.corps.jeton, id: inv.client };
}

describe("Passeport : écrit par le coach, lu par le membre", () => {
  test("non inscrit : réponse claire, sans Passeport", async () => {
    const lea = await clientActive("Léa B.");
    const r = await appeler("/feuvert/etat", {}, lea.jeton);
    assert.equal(r.statut, 200);
    assert.deepEqual(r.corps, { ok: true, inscrit: false });
  });

  test("le coach fixe les états ; le membre les lit ; le reste est filtré", async () => {
    const lea = await clientActive("Léa B.");
    const e = await admin({
      action: "enregistrer",
      client: lea.id,
      cohorte: "1",
      passeport: {
        squat: { etat: "vert", date: "2027-02-01" },
        rdl: { etat: "orange", date: "pas une date" },
        poids: { etat: "vert" },
        rowing: { etat: "violet" }
      },
      missions: { 1: { semaine: 1 }, 2: { semaine: 9 }, 7: { semaine: 2 } }
    });
    assert.equal(e.statut, 200);
    const r = (await appeler("/feuvert/etat", {}, lea.jeton)).corps;
    assert.equal(r.inscrit, true);
    assert.equal(r.cohorte, "1");
    assert.deepEqual(r.passeport, { squat: { etat: "vert", date: "2027-02-01" }, rdl: { etat: "orange", date: "" } });
    assert.deepEqual(r.missions, { 1: { semaine: 1 } });
  });

  test("aucune route client n'écrit le Passeport", async () => {
    const lea = await clientActive("Léa B.");
    await admin({ action: "enregistrer", client: lea.id, cohorte: "1", passeport: {}, missions: {} });
    for (const chemin of ["/feuvert/etat", "/feuvert/tableau", "/feuvert/passeport"]) {
      await appeler(chemin, { passeport: { squat: { etat: "vert" } }, missions: { 1: { semaine: 1 } } }, lea.jeton);
    }
    const r = (await appeler("/feuvert/etat", {}, lea.jeton)).corps;
    assert.deepEqual(r.passeport, {});
    assert.deepEqual(r.missions, {});
    assert.equal((await appeler("/admin/feuvert", { action: "liste" }, lea.jeton)).statut, 401, "le jeton client n'ouvre pas l'admin");
  });

  test("jeton obligatoire, même en mode transition", async () => {
    const r = await appeler("/feuvert/etat", {}, null, { ...env, ACCES_CLIENTS: "transition" });
    assert.equal(r.statut, 401);
  });

  test("admin : cohorte validée, client inconnu refusé, liste et retrait", async () => {
    const lea = await clientActive("Léa B.");
    assert.equal((await admin({ action: "enregistrer", client: lea.id, cohorte: "1; DROP", passeport: {} })).corps.error, "cohorte-invalide");
    assert.equal((await admin({ action: "enregistrer", client: "inconnu", cohorte: "1" })).statut, 404);
    await admin({ action: "enregistrer", client: lea.id, cohorte: "1", passeport: { gainage: { etat: "vert", date: "2027-02-02" } } });
    const l = (await admin({ action: "liste" })).corps.membres;
    assert.equal(l.length, 1);
    assert.equal(l[0].libelle, "Léa B.");
    assert.equal(l[0].passeport.gainage.etat, "vert");
    await admin({ action: "retirer", client: lea.id });
    assert.equal((await admin({ action: "liste" })).corps.membres.length, 0);
    assert.equal((await appeler("/feuvert/etat", {}, lea.jeton)).corps.inscrit, false);
  });
});

describe("Tableau de régularité", () => {
  async function cohorte() {
    const [zoe, anna, ines, autre] = await Promise.all(["Zoé A.", "Anna C.", "Inès D.", "Paul E."].map(clientActive));
    for (const [c, n] of [[zoe, "1"], [anna, "1"], [ines, "1"], [autre, "2"]]) {
      await admin({ action: "enregistrer", client: c.id, cohorte: n, passeport: {}, missions: c === anna ? { 1: { semaine: 1 } } : {} });
    }
    return { zoe, anna, ines, autre };
  }

  test("accord : seules les membres consentantes de la même cohorte, par ordre alphabétique, sans identité", async () => {
    const { zoe, anna, ines, autre } = await cohorte();
    await appeler("/feuvert/tableau", { accord: true, pseudo: "Zoé", semaines: { 1: { seances: 5, bonus: 1, checkin: 1 } } }, zoe.jeton);
    await appeler("/feuvert/tableau", { accord: true, pseudo: "anna", semaines: { 1: { seances: 2, checkin: 1 } } }, anna.jeton);
    await appeler("/feuvert/tableau", { accord: true, pseudo: "Paul", semaines: {} }, autre.jeton);
    // Inès n'a pas donné son accord : elle lit le tableau sans y figurer.
    const r = (await appeler("/feuvert/tableau", {}, ines.jeton)).corps;
    assert.equal(r.accord, false);
    assert.deepEqual(r.tableau.map((l) => l.pseudo), ["anna", "Zoé"]);
    assert.deepEqual(Object.keys(r.tableau[0]).sort(), ["missions", "pseudo", "semaines"]);
    assert.deepEqual(r.tableau[1].semaines, { 1: { seances: 2, bonus: 0, checkin: 1 } }, "bornes : 2 séances max, pas de bonus en S1");
    assert.deepEqual(r.tableau[0].missions, { 1: { semaine: 1 } });
    assert.ok(!JSON.stringify(r).includes("Anna C.") && !JSON.stringify(r).includes(anna.id));
  });

  test("retirer son accord efface sa ligne ; pseudo unique dans la cohorte et filtré", async () => {
    const { zoe, anna } = await cohorte();
    await appeler("/feuvert/tableau", { accord: true, pseudo: "Zoé", semaines: {} }, zoe.jeton);
    assert.equal((await appeler("/feuvert/tableau", { accord: true, pseudo: "zoe", semaines: {} }, anna.jeton)).statut, 409);
    assert.equal((await appeler("/feuvert/tableau", { accord: true, pseudo: "Coach Neiram", semaines: {} }, anna.jeton)).corps.error, "pseudo-refuse");
    const r = (await appeler("/feuvert/tableau", { accord: false }, zoe.jeton)).corps;
    assert.equal(r.accord, false);
    assert.deepEqual(r.tableau, []);
  });

  test("non inscrit : pas de tableau", async () => {
    const x = await clientActive("Marc F.");
    assert.equal((await appeler("/feuvert/tableau", { accord: true, pseudo: "Marc", semaines: {} }, x.jeton)).corps.error, "non-inscrit");
  });

  test("révoquer un client efface Passeport et ligne du tableau", async () => {
    const { zoe } = await cohorte();
    await appeler("/feuvert/tableau", { accord: true, pseudo: "Zoé", semaines: {} }, zoe.jeton);
    await appeler("/admin/revoquer", { client: zoe.id }, ADMIN);
    assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM feuvert WHERE client_id = ?").get(zoe.id).n, 0);
    assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM feuvert_tableau WHERE client_id = ?").get(zoe.id).n, 0);
  });
});

describe("Séance de la semaine filmée par Marien", () => {
  test("lien par cohorte et par semaine, https seulement, servi avec le Passeport", async () => {
    const lea = await clientActive("Léa B.");
    const tom = await clientActive("Tom G.");
    await admin({ action: "enregistrer", client: lea.id, cohorte: "1", passeport: {} });
    await admin({ action: "enregistrer", client: tom.id, cohorte: "2", passeport: {} });
    assert.equal((await admin({ action: "video", cohorte: "1", semaine: 2, url: "https://youtu.be/exemple" })).statut, 200);
    assert.equal((await admin({ action: "video", cohorte: "1", semaine: 3, url: "javascript:alert(1)" })).corps.error, "lien-invalide");
    assert.equal((await admin({ action: "video", cohorte: "1", semaine: 7, url: "https://x.fr" })).corps.error, "semaine-invalide");
    assert.deepEqual((await appeler("/feuvert/etat", {}, lea.jeton)).corps.videos, { 2: "https://youtu.be/exemple" });
    assert.deepEqual((await appeler("/feuvert/etat", {}, tom.jeton)).corps.videos, {}, "autre cohorte : rien");
    assert.deepEqual((await admin({ action: "liste" })).corps.videos["1"], { 2: "https://youtu.be/exemple" });
    await admin({ action: "video", cohorte: "1", semaine: 2, url: "" });
    assert.deepEqual((await appeler("/feuvert/etat", {}, lea.jeton)).corps.videos, {}, "lien vide : retiré");
    assert.equal(T.urlVideoPropre("http://exemple.fr"), "");
    assert.equal(T.urlVideoPropre("https://a:b@exemple.fr"), "");
  });
});

describe("Check-in du lundi", () => {
  test("relayé au script, signé, prénom pris de la fiche client", async () => {
    const lea = await clientActive("Léa B.");
    const r = await appeler(
      "/coach-sync",
      { type: "checkin_feu_vert", client: "Usurpation", weekKey: "2027-01-18", message: "Feu Vert S1 · séances 2/2", note: "Victoire : x", motif: "Blocage : y", niveau: "info" },
      lea.jeton
    );
    assert.equal(r.statut, 200);
    const envoye = JSON.parse(JSON.parse(sortants[0].corps).charge);
    assert.equal(envoye.type, "checkin_feu_vert");
    assert.equal(envoye.client, "Léa B.");
    assert.equal(envoye.weekKey, "2027-01-18");
    assert.equal(envoye.note, "Victoire : x");
    assert.equal(envoye.motif, "Blocage : y");
  });
});

describe("Nettoyage des données", () => {
  test("passeport, missions et compteurs bornés", () => {
    assert.deepEqual(T.passeportPropre({ squat: { etat: "vert", date: "2027-01-01", note: "x" }, autre: { etat: "vert" } }), { squat: { etat: "vert", date: "2027-01-01" } });
    assert.deepEqual(T.missionsPropres({ 4: { semaine: 6 }, 5: { semaine: 1 }, 1: { semaine: 0 } }), { 4: { semaine: 6 } });
    assert.deepEqual(T.semainesPropres({ 4: { seances: -3, bonus: 7, checkin: "1" }, 9: { seances: 2 } }), { 4: { seances: 0, bonus: 1, checkin: 1 } });
  });
});
