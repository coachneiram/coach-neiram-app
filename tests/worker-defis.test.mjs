/**
 * Worker : défis entre amis, réservés aux clients du coach (24 octobre 2026).
 *
 * Porté de tests/defis-worker.test.mjs de l'app publique Neiram, adapté :
 * jeton client obligatoire (même en mode « transition »), participant =
 * client.id, client révoqué sorti de ses défis, plafonds par depasse(),
 * effacement 60 jours après la fin par la tâche planifiée.
 *
 * La base est une vraie SQLite en mémoire derrière l'interface D1
 * (tests/faux-d1.mjs).
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fauxD1 } from "./faux-d1.mjs";

globalThis.__COACH_TEST__ = globalThis.__COACH_TEST__ || {};
const { default: worker } = await import("../worker/coach-neiram-proxy.js");
const T = globalThis.__COACH_TEST__;
const { DEFIS_PAR_JOUR, DEFIS_PARTICIPANTS_MAX, DEFIS_ACTIFS_MAX } = T.DEFIS_LIMITES;

const ADMIN = "admin-secret-de-test-0123456789-abcdef";
const ORIGINE = "https://coachneiram.github.io";
const MAINTENANT = Date.parse("2026-10-24T10:00:00Z");
const JOUR = 86400000;

let env;
let horloge;
const dateOrigine = Date.now;
const logOrigine = console.log;
beforeEach(() => {
  env = { ADMIN_SECRET: ADMIN, DB: fauxD1() };
  horloge = MAINTENANT;
  Date.now = () => horloge;
  console.log = () => {};
});
afterEach(() => {
  Date.now = dateOrigine;
  console.log = logOrigine;
});

let ip = 0;
function requete(chemin, corps, jeton, origine = ORIGINE) {
  const h = { "Content-Type": "application/json", "CF-Connecting-IP": "10.0." + (ip++ % 250) + ".1" };
  if (origine) h.Origin = origine;
  if (jeton) h.Authorization = "Bearer " + jeton;
  return new Request("https://proxy.test" + chemin, { method: "POST", headers: h, body: JSON.stringify(corps ?? {}) });
}
async function appeler(chemin, corps, jeton, e = env) {
  const r = await worker.fetch(requete(chemin, corps, jeton), e);
  return { statut: r.status, corps: await r.json() };
}
const admin = (chemin, corps) => worker.fetch(requete(chemin, corps, ADMIN, null), env).then((r) => r.json());

/** Crée un client et active son code : rend { jeton, client }. */
async function clientActive(libelle) {
  const inv = await admin("/admin/invitations", { libelle });
  const act = await appeler("/auth/activer", { code: inv.code });
  assert.equal(act.corps.ok, true, "activation de " + libelle);
  return { jeton: act.corps.jeton, client: inv.client };
}

describe("accès réservé aux clients du coach", () => {
  test("sans jeton : 401, y compris en mode transition", async () => {
    for (const mode of [undefined, "transition"]) {
      const e = { ...env, ACCES_CLIENTS: mode };
      for (const chemin of ["/defis/creer", "/defis/rejoindre", "/defis/progres", "/defis/quitter"]) {
        const r = await appeler(chemin, { type: "pas", pseudo: "Alex" }, null, e);
        assert.equal(r.statut, 401, `${chemin} (${mode || "obligatoire"})`);
        assert.equal(r.corps.error, "acces-requis");
      }
    }
    assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM defis").get().n, 0);
  });

  test("jeton inconnu : 401 ; sans base en transition : 401 aussi", async () => {
    assert.equal((await appeler("/defis/creer", { type: "pas" }, "x".repeat(40))).corps.error, "jeton-invalide");
    const r = await appeler("/defis/creer", { type: "pas" }, null, { ACCES_CLIENTS: "transition" });
    assert.equal(r.statut, 401);
  });

  test("participant = client.id ; pseudo par défaut = prénom du libellé", async () => {
    const sabine = await clientActive("Sabine P.");
    const r = await appeler("/defis/creer", { type: "pas" }, sabine.jeton);
    assert.equal(r.statut, 200);
    assert.deepEqual(r.corps.defi.participants, [{ rang: 1, pseudo: "Sabine", valeur: 0, moi: true }]);
    const ligne = env.DB.sqlite.prepare("SELECT client_id, pseudo FROM defis_participants").get();
    assert.deepEqual({ ...ligne }, { client_id: sabine.client, pseudo: "Sabine" });
    const defi = env.DB.sqlite.prepare("SELECT createur FROM defis").get();
    assert.equal(defi.createur, sabine.client);
  });

  test("rien d'autre ne sort : ni libellé complet, ni identifiant client", async () => {
    const a = await clientActive("Thomas Bernard");
    const b = await clientActive("Lucie M.");
    const code = (await appeler("/defis/creer", { type: "minutes", pseudo: "Tom" }, a.jeton)).corps.defi.code;
    const texte = JSON.stringify((await appeler("/defis/rejoindre", { code }, b.jeton)).corps);
    for (const interdit of ["Bernard", "Lucie M.", a.client, b.client]) assert.ok(!texte.includes(interdit), interdit);
    assert.match(texte, /"pseudo":"Lucie"/);
  });

  test("client révoqué : plus rien ne répond et il sort de ses défis", async () => {
    const a = await clientActive("Alex D.");
    const b = await clientActive("Béa R.");
    const code = (await appeler("/defis/creer", { type: "pas" }, a.jeton)).corps.defi.code;
    await appeler("/defis/rejoindre", { code }, b.jeton);
    await appeler("/defis/progres", { defis: [{ code, valeur: 9000 }] }, b.jeton);
    await admin("/admin/revoquer", { client: b.client });
    assert.equal((await appeler("/defis/progres", { defis: [{ code }] }, b.jeton)).statut, 401);
    const d = (await appeler("/defis/progres", { defis: [{ code }] }, a.jeton)).corps.defis[0];
    assert.deepEqual(d.participants.map((p) => p.pseudo), ["Alex"]);
    assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM defis_participants WHERE client_id = ?").get(b.client).n, 0);
  });
});

describe("défi : créer, rejoindre, progresser, classement", () => {
  test("code à 6 caractères sans 0, O, 1, I, L", () => {
    for (let i = 0; i < 50; i++) assert.match(T.genererCodeDefi(), /^[A-HJKMNP-Z2-9]{6}$/);
  });

  test("7 jours, rejoindre en minuscules, pseudo pris, défi inconnu, classement", async () => {
    const a = await clientActive("Alex D.");
    const b = await clientActive("Béa R.");
    const c = await clientActive("Chris L.");
    const cree = await appeler("/defis/creer", { type: "pas", pseudo: "Alex" }, a.jeton);
    const code = cree.corps.defi.code;
    assert.deepEqual([cree.corps.defi.debut, cree.corps.defi.fin], ["2026-10-24", "2026-10-30"]);
    assert.equal((await appeler("/defis/rejoindre", { code: code.toLowerCase(), pseudo: "Bea" }, b.jeton)).statut, 200);
    assert.equal((await appeler("/defis/rejoindre", { code, pseudo: "alex" }, c.jeton)).corps.error, "pseudo-pris");
    assert.equal((await appeler("/defis/rejoindre", { code, pseudo: "Al3x" }, c.jeton)).corps.error, "pseudo-pris", "variante de chiffres");
    assert.equal((await appeler("/defis/rejoindre", { code: "ZZZZZZ", pseudo: "Chris" }, c.jeton)).corps.error, "defi-inconnu");
    await appeler("/defis/progres", { defis: [{ code, valeur: 32000 }] }, a.jeton);
    const r = await appeler("/defis/progres", { defis: [{ code, valeur: 41000.4 }] }, b.jeton);
    assert.deepEqual(
      r.corps.defis[0].participants.map((p) => [p.rang, p.pseudo, p.valeur, p.moi]),
      [[1, "Bea", 41000, true], [2, "Alex", 32000, false]]
    );
    // Rejoindre à nouveau change seulement le pseudo.
    assert.equal((await appeler("/defis/rejoindre", { code, pseudo: "Béatrice" }, b.jeton)).corps.defi.participants[0].pseudo, "Béatrice");
  });

  test("bornes : total impossible ignoré, défi terminé figé, pseudo et type filtrés", async () => {
    const a = await clientActive("Alex D.");
    const b = await clientActive("Béa R.");
    const code = (await appeler("/defis/creer", { type: "seances", pseudo: "Alex" }, a.jeton)).corps.defi.code;
    await appeler("/defis/progres", { defis: [{ code, valeur: 4 }] }, a.jeton);
    await appeler("/defis/progres", { defis: [{ code, valeur: 99 }] }, a.jeton);
    await appeler("/defis/progres", { defis: [{ code, valeur: "beaucoup" }] }, a.jeton);
    let d = (await appeler("/defis/progres", { defis: [{ code, valeur: -1 }] }, a.jeton)).corps.defis[0];
    assert.equal(d.participants[0].valeur, 4);
    horloge = MAINTENANT + 10 * JOUR;
    d = (await appeler("/defis/progres", { defis: [{ code, valeur: 6 }] }, a.jeton)).corps.defis[0];
    assert.equal(d.termine, true);
    assert.equal(d.participants[0].valeur, 4, "après la fin (et le jour de grâce) : figé");
    assert.equal((await appeler("/defis/rejoindre", { code, pseudo: "Bea" }, b.jeton)).corps.error, "defi-termine");
    assert.equal((await appeler("/defis/creer", { type: "pas", pseudo: "Gros Connard" }, b.jeton)).corps.error, "pseudo-refuse");
    assert.equal((await appeler("/defis/creer", { type: "pas", pseudo: "Bé<a>" }, b.jeton)).corps.error, "pseudo-caracteres");
    assert.equal((await appeler("/defis/creer", { type: "pas", pseudo: "Bé" }, b.jeton)).corps.error, "pseudo-longueur");
    assert.equal((await appeler("/defis/creer", { type: "calories", pseudo: "Bea" }, b.jeton)).corps.error, "type-inconnu");
    assert.equal((await appeler("/defis/creer", { type: "poids", pseudo: "Bea" }, b.jeton)).corps.error, "type-inconnu");
  });

  test("progrès : un défi dont on n'est pas membre ne sort pas, et n'est pas modifié", async () => {
    const a = await clientActive("Alex D.");
    const b = await clientActive("Béa R.");
    const code = (await appeler("/defis/creer", { type: "pas" }, a.jeton)).corps.defi.code;
    const r = await appeler("/defis/progres", { defis: [{ code, valeur: 5000 }] }, b.jeton);
    assert.deepEqual(r.corps.defis, []);
    assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM defis_participants").get().n, 1);
  });
});

describe("plafonds", () => {
  test(`${DEFIS_ACTIFS_MAX} défis en cours au plus, ${DEFIS_PAR_JOUR} créés par jour`, async () => {
    const a = await clientActive("Alex D.");
    const codes = [];
    for (let i = 0; i < DEFIS_ACTIFS_MAX; i++) codes.push((await appeler("/defis/creer", { type: "minutes" }, a.jeton)).corps.defi.code);
    assert.equal((await appeler("/defis/creer", { type: "minutes" }, a.jeton)).corps.error, "trop-de-defis-actifs");
    for (const code of codes) await appeler("/defis/quitter", { code }, a.jeton);
    assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM defis").get().n, 0, "défi vide effacé");
    for (let i = DEFIS_ACTIFS_MAX; i < DEFIS_PAR_JOUR; i++) assert.equal((await appeler("/defis/creer", { type: "minutes" }, a.jeton)).statut, 200);
    for (const c of env.DB.sqlite.prepare("SELECT code FROM defis").all()) await appeler("/defis/quitter", { code: c.code }, a.jeton);
    const trop = await appeler("/defis/creer", { type: "minutes" }, a.jeton);
    assert.equal(trop.statut, 429);
    assert.equal(trop.corps.error, "trop-de-defis");
    horloge = MAINTENANT + JOUR;
    assert.equal((await appeler("/defis/creer", { type: "minutes" }, a.jeton)).statut, 200, "le lendemain");
  });

  test("rejoindre compte aussi dans les défis en cours", async () => {
    const createurs = [];
    for (const nom of ["Ana B.", "Bob C.", "Cléo D.", "Dan E."]) createurs.push(await clientActive(nom));
    const moi = await clientActive("Moi F.");
    const codes = [];
    for (const c of createurs) codes.push((await appeler("/defis/creer", { type: "pas" }, c.jeton)).corps.defi.code);
    for (let i = 0; i < DEFIS_ACTIFS_MAX; i++) assert.equal((await appeler("/defis/rejoindre", { code: codes[i] }, moi.jeton)).statut, 200);
    assert.equal((await appeler("/defis/rejoindre", { code: codes[3] }, moi.jeton)).corps.error, "trop-de-defis-actifs");
    // Un défi terminé ne compte plus.
    horloge = MAINTENANT + 8 * JOUR;
    const nouveau = (await appeler("/defis/creer", { type: "pas" }, createurs[3].jeton)).corps.defi.code;
    assert.equal((await appeler("/defis/rejoindre", { code: nouveau }, moi.jeton)).statut, 200);
  });

  test(`${DEFIS_PARTICIPANTS_MAX} participants par défi ; quitter libère la place et efface la participation`, async () => {
    const createur = await clientActive("Bea R.");
    const code = (await appeler("/defis/creer", { type: "pas" }, createur.jeton)).corps.defi.code;
    const amis = [];
    for (let i = 1; i < DEFIS_PARTICIPANTS_MAX; i++) {
      const ami = await clientActive("Ami" + String.fromCharCode(64 + i));
      amis.push(ami);
      assert.equal((await appeler("/defis/rejoindre", { code }, ami.jeton)).statut, 200, "ami " + i);
    }
    const zoe = await clientActive("Zoé");
    assert.equal((await appeler("/defis/rejoindre", { code }, zoe.jeton)).corps.error, "defi-complet");
    await appeler("/defis/progres", { defis: [{ code, valeur: 1234 }] }, amis[0].jeton);
    await appeler("/defis/quitter", { code }, amis[0].jeton);
    assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM defis_participants WHERE client_id = ?").get(amis[0].client).n, 0);
    assert.equal((await appeler("/defis/rejoindre", { code }, zoe.jeton)).statut, 200);
  });
});

describe("tâche planifiée et schéma", () => {
  test("défis effacés 60 jours après leur fin, les autres gardés", async () => {
    const a = await clientActive("Alex D.");
    const ancien = (await appeler("/defis/creer", { type: "pas" }, a.jeton)).corps.defi.code;
    horloge = MAINTENANT + 30 * JOUR;
    const recent = (await appeler("/defis/creer", { type: "pas" }, a.jeton)).corps.defi.code;
    // Fin de l'ancien : 30/10 ; le 29/12 (60 jours après), il reste ; le 30/12, il part.
    await worker.scheduled({}, { ...env }, null);
    horloge = Date.parse("2026-12-29T10:00:00Z");
    await worker.scheduled({}, env, null);
    assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM defis WHERE code = ?").get(ancien).n, 1);
    horloge = Date.parse("2026-12-30T10:00:00Z");
    await worker.scheduled({}, env, null);
    const restants = env.DB.sqlite.prepare("SELECT code FROM defis").all().map((r) => r.code);
    assert.deepEqual(restants, [recent]);
    assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM defis_participants WHERE code = ?").get(ancien).n, 0);
  });

  test("les tables existantes restent intactes", async () => {
    await clientActive("Alex D.");
    // Les tables de la communaute (24 octobre 2026) ont leur propre test
    // (tests/worker-communaute.test.mjs) ; sqlite_sequence vient de leurs
    // cles AUTOINCREMENT.
    const tables = env.DB.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'communaute_%' ORDER BY name")
      .all()
      .map((r) => r.name);
    assert.deepEqual(tables, ["clients", "compteurs", "defis", "defis_participants", "invitations", "jetons", "sqlite_sequence"]);
  });

  test("pseudo : filtre et prénom par défaut", () => {
    assert.equal(T.prenomDuLibelle("Sabine P."), "Sabine");
    assert.equal(T.prenomDuLibelle("  Jean-Marc  D. "), "Jean-Marc");
    assert.equal(T.validerPseudo("  Léa   B ").pseudo, "Léa B");
    assert.equal(T.validerPseudo("Lepdg").pseudo, "Lepdg");
    assert.equal(T.validerPseudo("pd").erreur, "pseudo-longueur");
    assert.equal(T.validerPseudo("Coach Neiram").erreur, "pseudo-refuse");
    assert.equal(T.valeurDefiBornee("pas", 490000), 490000);
    assert.equal(T.valeurDefiBornee("pas", 490001), null);
    assert.equal(T.valeurDefiBornee("seances", null), null);
  });
});
