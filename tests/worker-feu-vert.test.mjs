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
  // Deuxième cohorte datée pour les tests (une cohorte sans date est refusée).
  T.FV_DEBUT_COHORTES.set("2", "2027-03-08");
  env = { ADMIN_SECRET: ADMIN, COACH_SYNC_URL: "https://exemple.invalid/exec", COACH_SYNC_SECRET: SECRET, DB: fauxD1() };
  sortants = [];
  globalThis.fetch = async (url, init) => {
    sortants.push({ url: String(url), corps: init.body });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  console.log = () => {};
});
afterEach(() => {
  T.FV_DEBUT_COHORTES.delete("2");
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

  test("geste 8 : « hipthrust » (ancien identifiant) accepté en entrée et rendu en « presse »", async () => {
    const lea = await clientActive("Léa B.");
    // Application pas encore à jour : n'envoie que l'ancien identifiant.
    await admin({ action: "enregistrer", client: lea.id, cohorte: "1", passeport: { hipthrust: { etat: "orange", date: "2027-02-05" } } });
    let r = (await appeler("/feuvert/etat", {}, lea.jeton)).corps;
    assert.deepEqual(r.passeport, { presse: { etat: "orange", date: "2027-02-05" } });
    assert.equal((await admin({ action: "liste" })).corps.membres[0].passeport.presse.etat, "orange");
    // Application à jour : envoie les deux (compatibilité) ; « presse » l'emporte.
    await admin({ action: "enregistrer", client: lea.id, cohorte: "1", passeport: { presse: { etat: "vert", date: "2027-02-12" }, hipthrust: { etat: "orange", date: "2027-02-05" } } });
    r = (await appeler("/feuvert/etat", {}, lea.jeton)).corps;
    assert.deepEqual(r.passeport, { presse: { etat: "vert", date: "2027-02-12" } });
    assert.equal("hipthrust" in r.passeport, false);
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
    // Passeport déjà en base avant le 18/11/2026 : « hipthrust » relu comme « presse ».
    assert.deepEqual(T.passeportPropre({ hipthrust: { etat: "vert", date: "2027-01-20" } }), { presse: { etat: "vert", date: "2027-01-20" } });
    assert.deepEqual(T.passeportPropre({ presse: { etat: "rouge" }, hipthrust: { etat: "vert" } }), { presse: { etat: "rouge", date: "" } });
    assert.deepEqual(T.passeportPropre({ presse: { etat: "violet" }, hipthrust: { etat: "orange" } }), { presse: { etat: "orange", date: "" } });
    assert.deepEqual(T.missionsPropres({ 4: { semaine: 6 }, 5: { semaine: 1 }, 1: { semaine: 0 } }), { 4: { semaine: 6 } });
    assert.deepEqual(T.semainesPropres({ 4: { seances: -3, bonus: 7, checkin: "1" }, 9: { seances: 2 } }), { 4: { seances: 0, bonus: 1, checkin: 1 } });
  });
});

describe("Pré-réglage de l'application (25/11/2026)", () => {
  const invitation = async (libelle) => (await appeler("/admin/invitations", { libelle }, ADMIN)).corps;

  test("/auth/activer : réglages Feu Vert pour un membre inscrit, rien pour un autre client", async () => {
    const nina = await invitation("Nina E.");
    const paul = await invitation("Paul F.");
    // Inscrite AVANT l'activation de son code, parcours fixé.
    assert.equal((await admin({ action: "enregistrer", client: nina.client, cohorte: "1", parcours: "basesplus", passeport: { squat: { etat: "vert" } } })).statut, 200);
    const a = (await appeler("/auth/activer", { code: nina.code })).corps;
    assert.equal(a.ok, true);
    assert.deepEqual(a.feuVert, { cohorte: "1", parcours: "basesplus", debut: "2027-01-18" });
    assert.equal("passeport" in a || "missions" in a, false, "ni Passeport ni missions à l'activation");
    const b = (await appeler("/auth/activer", { code: paul.code })).corps;
    assert.equal(b.ok, true);
    assert.equal("feuVert" in b, false, "client individuel : aucun réglage Feu Vert");
  });

  test("jamais les données d'un autre membre ; chaque cohorte a sa date", async () => {
    const anna = await invitation("Anna C.");
    const zoe = await invitation("Zoé A.");
    await admin({ action: "enregistrer", client: anna.client, cohorte: "1", parcours: "reprise" });
    await admin({ action: "enregistrer", client: zoe.client, cohorte: "2" });
    const a = (await appeler("/auth/activer", { code: anna.code })).corps;
    const z = (await appeler("/auth/activer", { code: zoe.code })).corps;
    assert.deepEqual(a.feuVert, { cohorte: "1", parcours: "reprise", debut: "2027-01-18" });
    assert.deepEqual(z.feuVert, { cohorte: "2", parcours: null, debut: "2027-03-08" });
    const etatZ = (await appeler("/feuvert/etat", {}, z.jeton)).corps;
    assert.deepEqual(etatZ.feuVert, { cohorte: "2", parcours: null, debut: "2027-03-08" });
    assert.ok(!JSON.stringify(etatZ).includes("Anna") && !JSON.stringify(etatZ).includes(anna.client));
  });

  test("/feuvert/etat suit le coach ; un membre ne peut changer ni sa cohorte ni son parcours", async () => {
    const lea = await clientActive("Léa B.");
    await admin({ action: "enregistrer", client: lea.id, cohorte: "1", parcours: "reprise" });
    for (const chemin of ["/feuvert/etat", "/feuvert/tableau", "/feuvert/reglages", "/feuvert/parcours"]) {
      await appeler(chemin, { cohorte: "9", parcours: "basesplus", feuVert: { cohorte: "9", parcours: "basesplus" }, accord: false }, lea.jeton);
    }
    assert.equal((await appeler("/admin/feuvert", { action: "enregistrer", client: lea.id, cohorte: "9", parcours: "basesplus" }, lea.jeton)).statut, 401);
    let r = (await appeler("/feuvert/etat", {}, lea.jeton)).corps;
    assert.deepEqual(r.feuVert, { cohorte: "1", parcours: "reprise", debut: "2027-01-18" });
    assert.equal(r.cohorte, "1");
    // Le coach change le parcours : le membre le lit.
    await admin({ action: "enregistrer", client: lea.id, cohorte: "1", parcours: "basesplus" });
    r = (await appeler("/feuvert/etat", {}, lea.jeton)).corps;
    assert.equal(r.feuVert.parcours, "basesplus");
  });

  test("/admin/feuvert : parcours validé strictement ; absent = inchangé ; vide = retiré", async () => {
    const lea = await clientActive("Léa B.");
    for (const mauvais of ["expert", "Reprise", 1, true, ["reprise"], { id: "reprise" }, "reprise "]) {
      const e = await admin({ action: "enregistrer", client: lea.id, cohorte: "1", parcours: mauvais });
      assert.equal(e.statut, 400, JSON.stringify(mauvais));
      assert.equal(e.corps.error, "parcours-invalide");
    }
    assert.equal((await admin({ action: "liste" })).corps.membres.length, 0, "rien d'écrit sur un refus");
    assert.equal((await admin({ action: "enregistrer", client: lea.id, cohorte: "1", parcours: "basesplus" })).corps.parcours, "basesplus");
    assert.equal((await admin({ action: "enregistrer", client: lea.id, cohorte: "1", passeport: {} })).corps.parcours, "basesplus", "absent : inchangé");
    assert.equal((await admin({ action: "liste" })).corps.membres[0].parcours, "basesplus");
    assert.equal((await admin({ action: "enregistrer", client: lea.id, cohorte: "1", parcours: "" })).corps.parcours, null);
    assert.equal((await admin({ action: "enregistrer", client: lea.id, cohorte: "1", parcours: "reprise" })).corps.parcours, "reprise");
    assert.equal((await admin({ action: "enregistrer", client: lea.id, cohorte: "1", parcours: null })).corps.parcours, null);
  });

  test("migration sans perte : ancienne table feuvert (sans parcours) complétée, une seule fois", async () => {
    const db = env.DB;
    // Base de production d'avant le 25/11/2026 : table sans colonne parcours, une membre inscrite.
    db.sqlite.exec("CREATE TABLE feuvert (client_id TEXT PRIMARY KEY, cohorte TEXT NOT NULL, passeport TEXT NOT NULL DEFAULT '{}', missions TEXT NOT NULL DEFAULT '{}', maj_le INTEGER NOT NULL)");
    db.sqlite.exec(`INSERT INTO feuvert VALUES ('ancienne', '1', '{"squat":{"etat":"vert","date":"2027-01-20"}}', '{"1":{"semaine":1}}', 1)`);
    const lea = await clientActive("Léa B."); // premier appel : schéma, puis migrations
    const colonnes = db.sqlite.prepare("SELECT name FROM pragma_table_info('feuvert')").all().map((c) => c.name);
    assert.ok(colonnes.includes("parcours"));
    const ligne = db.sqlite.prepare("SELECT * FROM feuvert WHERE client_id = 'ancienne'").get();
    assert.equal(ligne.cohorte, "1");
    assert.equal(JSON.parse(ligne.passeport).squat.etat, "vert");
    assert.equal(JSON.parse(ligne.missions)["1"].semaine, 1);
    assert.equal(ligne.parcours, null);
    // Rejouée (autre instance du Worker, ou colonne déjà là) : sans erreur, sans doublon.
    await T.migrer(db);
    await T.migrer(db);
    assert.equal(db.sqlite.prepare("SELECT name FROM pragma_table_info('feuvert')").all().filter((c) => c.name === "parcours").length, 1);
    assert.ok(T.MIGRATIONS.every((m) => /^ALTER TABLE \w+ ADD COLUMN /.test(m.sql)), "jamais de DROP ni de réécriture");
    // Et la route marche sur la table migrée.
    await admin({ action: "enregistrer", client: lea.id, cohorte: "1", parcours: "reprise" });
    assert.equal((await appeler("/feuvert/etat", {}, lea.jeton)).corps.feuVert.parcours, "reprise");
  });

  test("/admin/feuvert : cohorte sans date de début refusée (400 cohorte-sans-date), rien d'écrit", async () => {
    const lea = await clientActive("Léa B.");
    const r = await admin({ action: "enregistrer", client: lea.id, cohorte: "3", parcours: "reprise" });
    assert.equal(r.statut, 400);
    assert.equal(r.corps.error, "cohorte-sans-date");
    assert.equal((await admin({ action: "liste" })).corps.membres.length, 0);
    assert.equal((await appeler("/feuvert/etat", {}, lea.jeton)).corps.inscrit, false);
    // Ligne ancienne d'une cohorte sans date (écrite avant ce contrôle) : début null, l'app garde le sien.
    env.DB.sqlite.prepare("INSERT INTO feuvert (client_id, cohorte, passeport, missions, maj_le) VALUES (?, '9', '{}', '{}', 1)").run(lea.id);
    assert.deepEqual((await appeler("/feuvert/etat", {}, lea.jeton)).corps.feuVert, { cohorte: "9", parcours: null, debut: null });
  });

  test("colonne déjà ajoutée par une autre instance : l'erreur « duplicate column » est ignorée", async () => {
    let alter = 0;
    const faux = {
      prepare: (sql) => ({
        all: async () => {
          throw new Error("pragma refusé");
        },
        run: async () => {
          alter++;
          throw new Error("duplicate column name: parcours");
        }
      })
    };
    assert.equal(await T.migrer(faux), true);
    assert.equal(alter, T.MIGRATIONS.length);
    // Autre panne : journalisée, sans exception ; la base reste servie et la migration sera retentée.
    const casse = { prepare: () => ({ all: async () => ({ results: [] }), run: async () => { throw new Error("disk I/O error"); } }) };
    assert.equal(await T.migrer(casse), false);
  });

  test("migration en panne : les autres routes répondent, et elle est retentée ensuite", async () => {
    const db = env.DB;
    const prepareOrigine = db.prepare;
    let pannes = 1;
    db.prepare = (sql) => {
      const i = prepareOrigine(sql);
      if (/^ALTER TABLE/.test(sql) && pannes-- > 0) return { ...i, run: async () => { throw new Error("disk I/O error"); } };
      return i;
    };
    const lea = await clientActive("Léa B."); // invitations et activation : servies malgré la panne
    assert.ok(lea.jeton);
    await appeler("/feuvert/etat", {}, lea.jeton); // requête suivante : migration retentée
    db.prepare = prepareOrigine;
    assert.ok(db.sqlite.prepare("SELECT name FROM pragma_table_info('feuvert')").all().some((c) => c.name === "parcours"));
  });
});

describe("Membre Feu Vert : routes du coaching individuel refusées (25/11/2026)", () => {
  async function deux() {
    const lea = await clientActive("Léa B.");
    const paul = await clientActive("Paul F.");
    await admin({ action: "enregistrer", client: lea.id, cohorte: "1", parcours: "reprise" });
    return { lea, paul };
  }
  const iaEnv = () => ({ ...env, GEMINI_API_KEY: "cle-de-test" });

  test("/ai : 403 reserve-coaching-individuel pour un membre Feu Vert, servi pour un client individuel", async () => {
    const { lea, paul } = await deux();
    const corps = { fonction: "chat", contents: [{ role: "user", parts: [{ text: "Bonjour" }] }] };
    const r = await appeler("/ai", corps, lea.jeton, iaEnv());
    assert.equal(r.statut, 403);
    assert.equal(r.corps.error, "reserve-coaching-individuel");
    assert.equal(sortants.length, 0, "rien n'est parti vers l'IA");
    const p = await appeler("/ai", corps, paul.jeton, iaEnv());
    assert.notEqual(p.statut, 403, "client individuel : pas de refus Feu Vert");
  });

  test("/defis et /communaute : 403 pour un membre Feu Vert", async () => {
    const { lea, paul } = await deux();
    for (const chemin of ["/defis/mes", "/defis/creer", "/communaute/profil", "/communaute/classement"]) {
      const r = await appeler(chemin, {}, lea.jeton);
      assert.equal(r.statut, 403, chemin);
      assert.equal(r.corps.error, "reserve-coaching-individuel", chemin);
      assert.notEqual((await appeler(chemin, {}, paul.jeton)).corps.error, "reserve-coaching-individuel", chemin + " (individuel)");
    }
  });

  test("/coach-sync : pointage et check-in Feu Vert passent, tout autre type est refusé", async () => {
    const { lea, paul } = await deux();
    const base = { date: "2027-01-19", weekKey: "2027-01-18", message: "x", note: "x" };
    assert.equal((await appeler("/coach-sync", { ...base, type: "pointage", creneau: "Feu Vert" }, lea.jeton)).statut, 200);
    assert.equal((await appeler("/coach-sync", { ...base, type: "checkin_feu_vert" }, lea.jeton)).statut, 200);
    for (const type of ["alerte_seances_manquees", "resume_hebdo", "activite", "alerte_poids", "alerte_nutrition", "justification"]) {
      const r = await appeler("/coach-sync", { ...base, type }, lea.jeton);
      assert.equal(r.statut, 403, type);
      assert.equal(r.corps.error, "reserve-coaching-individuel");
    }
    assert.equal(sortants.length, 2, "seuls pointage et check-in sont relayés");
    assert.equal((await appeler("/coach-sync", { ...base, type: "resume_hebdo" }, paul.jeton)).statut, 200, "individuel : inchangé");
  });

  test("/feuvert/*, /presence et /auth/activer restent ouverts ; retiré de Feu Vert : tout se rouvre", async () => {
    const { lea } = await deux();
    assert.equal((await appeler("/feuvert/etat", {}, lea.jeton)).statut, 200);
    assert.equal((await appeler("/feuvert/tableau", {}, lea.jeton)).statut, 200);
    assert.notEqual((await appeler("/presence", { derniereSaisie: "2027-01-19" }, lea.jeton)).corps.error, "reserve-coaching-individuel");
    await admin({ action: "retirer", client: lea.id });
    assert.notEqual((await appeler("/defis/mes", {}, lea.jeton)).corps.error, "reserve-coaching-individuel");
  });
});
