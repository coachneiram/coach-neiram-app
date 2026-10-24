/**
 * Worker : communauté « Team Neiram », réservée aux clients du coach
 * (24 octobre 2026).
 *
 * Porté des tests communaute-worker, disciplines-worker et
 * transformations-worker de l'app publique Neiram, adaptés : jeton client
 * obligatoire (même en mode « transition »), identité = client.id, trois
 * accords distincts (profil, disciplines, transformation) dont le retrait
 * efface les données, rien de santé sur le serveur (« perte_eligible »
 * seulement), masquage à 2 signalements, révocation qui efface tout.
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
const C = T.COMMUNAUTE;

const ADMIN = "admin-secret-de-test-0123456789-abcdef";
const ORIGINE = "https://coachneiram.github.io";
const MAINTENANT = Date.parse("2026-10-24T10:00:00Z");
const NOVEMBRE = Date.parse("2026-11-03T10:00:00Z");
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
  const h = { "Content-Type": "application/json", "CF-Connecting-IP": "10.1." + (ip++ % 250) + ".1" };
  if (origine) h.Origin = origine;
  if (jeton) h.Authorization = "Bearer " + jeton;
  return new Request("https://proxy.test" + chemin, { method: "POST", headers: h, body: JSON.stringify(corps ?? {}) });
}
async function appeler(chemin, corps, jeton, e = env) {
  const r = await worker.fetch(requete(chemin, corps, jeton), e);
  return { statut: r.status, corps: await r.json() };
}
const admin = (chemin, corps) => worker.fetch(requete(chemin, corps, ADMIN, null), env).then((r) => r.json());

async function clientActive(libelle) {
  const inv = await admin("/admin/invitations", { libelle });
  const act = await appeler("/auth/activer", { code: inv.code });
  assert.equal(act.corps.ok, true, "activation de " + libelle);
  return { jeton: act.corps.jeton, client: inv.client };
}
const profil = (qui, pseudo, stats = {}) => appeler("/communaute/profil", { pseudo, accord: true, stats }, qui.jeton);
const accord = (qui, type, oui = true) => appeler("/communaute/accord", { type, oui }, qui.jeton);
const stats = (qui, s) => appeler("/communaute/stats", { stats: s }, qui.jeton);
const classement = (qui, categorie, filtres) => appeler("/communaute/classement", { categorie, ...(filtres ? { filtres } : {}) }, qui.jeton);
const ligne = (qui) => env.DB.sqlite.prepare("SELECT * FROM communaute_profils WHERE client_id = ?").get(qui.client);
const compte = (table) => env.DB.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

const ROUTES = [
  "/communaute/etat",
  "/communaute/profil",
  "/communaute/stats",
  "/communaute/accord",
  "/communaute/classement",
  "/communaute/athletes-du-mois",
  "/communaute/signaler",
  "/communaute/supprimer",
  "/communaute/transformations/liste",
  "/communaute/transformations/publier",
  "/communaute/transformations/bravo",
  "/communaute/transformations/supprimer"
];

describe("accès réservé aux clients du coach", () => {
  test("sans jeton : 401 sur toutes les routes, y compris en mode transition", async () => {
    for (const mode of [undefined, "transition"]) {
      const e = { ...env, ACCES_CLIENTS: mode };
      for (const chemin of ROUTES) {
        const r = await appeler(chemin, { pseudo: "Alex", accord: true }, null, e);
        assert.equal(r.statut, 401, `${chemin} (${mode || "obligatoire"})`);
        assert.equal(r.corps.error, "acces-requis");
      }
    }
    assert.equal((await appeler("/communaute/etat", {}, "x".repeat(40))).corps.error, "jeton-invalide");
    assert.equal(compte("communaute_profils"), 0);
  });

  test("sans profil, rien d'autre que l'état, la création et la suppression", async () => {
    const a = await clientActive("Alex D.");
    assert.deepEqual((await appeler("/communaute/etat", {}, a.jeton)).corps, { ok: true, profil: null });
    for (const chemin of ["/communaute/stats", "/communaute/classement", "/communaute/transformations/liste", "/communaute/signaler"]) {
      assert.equal((await appeler(chemin, { categorie: "seances_mois" }, a.jeton)).corps.error, "profil-requis", chemin);
    }
  });

  test(`plafond : ${C.COMMUNAUTE_APPELS_PAR_MINUTE} appels par minute et par client`, async () => {
    const a = await clientActive("Alex D.");
    for (let i = 0; i < C.COMMUNAUTE_APPELS_PAR_MINUTE; i++) assert.equal((await appeler("/communaute/etat", {}, a.jeton)).statut, 200);
    const r = await appeler("/communaute/etat", {}, a.jeton);
    assert.equal(r.statut, 429);
    horloge += 61000;
    assert.equal((await appeler("/communaute/etat", {}, a.jeton)).statut, 200);
  });
});

describe("accord « profil » : pseudo et régularité", () => {
  test("accord explicite exigé, pseudo filtré et unique, identité = client.id", async () => {
    const a = await clientActive("Sabine P.");
    const b = await clientActive("Thomas B.");
    assert.equal((await appeler("/communaute/profil", { pseudo: "Sabine" }, a.jeton)).corps.error, "accord-requis");
    assert.equal((await profil(a, "Coach Neiram")).corps.error, "pseudo-refuse");
    assert.equal((await profil(a, "ab")).corps.error, "pseudo-longueur");
    const r = await profil(a, "Sabine");
    assert.deepEqual(r.corps.profil, { pseudo: "Sabine", masque: false, disciplines: false, transformation: false });
    assert.equal((await profil(b, "sabine")).statut, 409);
    assert.equal(ligne(a).client_id, a.client);
    // Changer de pseudo garde le même profil.
    await profil(a, "Sab");
    assert.equal(compte("communaute_profils"), 1);
    assert.equal(ligne(a).pseudo, "Sab");
  });

  test("classements de régularité : séances du mois et régularité sur 30 jours", async () => {
    const a = await clientActive("Alex D.");
    const b = await clientActive("Bea L.");
    await profil(a, "Alex", { seances_mois: 8, regularite_30: 20, mois: "2026-10" });
    await profil(b, "Bea", { seances_mois: 12, regularite_30: 25, mois: "2026-10" });
    const r = await classement(a, "seances_mois");
    assert.deepEqual(r.corps.lignes.map((l) => [l.rang, l.pseudo, l.valeur, l.moi]), [[1, "Bea", 12, false], [2, "Alex", 8, true]]);
    assert.deepEqual(r.corps.moi, { rang: 2, valeur: 8 });
    // Le mois suivant, les séances d'octobre ne comptent plus.
    horloge = NOVEMBRE;
    assert.equal((await classement(a, "seances_mois")).corps.total, 0);
    // Régularité : fraîche de 3 jours seulement.
    assert.equal((await classement(a, "regularite_30")).corps.total, 0);
    await stats(a, { regularite_30: 18, mois: "2026-11" });
    assert.deepEqual((await classement(a, "regularite_30")).corps.lignes.map((l) => l.pseudo), ["Alex"]);
    assert.equal((await classement(a, "parrainage")).corps.error, "categorie-inconnue");
  });

  test("rien d'autre ne sort : ni libellé, ni identifiant client", async () => {
    const a = await clientActive("Sabine P.");
    await profil(a, "Sabine", { seances_mois: 3 });
    const tout = JSON.stringify([(await classement(a, "seances_mois")).corps, (await appeler("/communaute/etat", {}, a.jeton)).corps]);
    assert.ok(!tout.includes("Sabine P.") && !tout.includes(a.client));
  });
});

describe("accord « disciplines » : sexe et catégorie, jamais le poids", () => {
  test("sans l'accord, les performances, le sexe et la catégorie sont écartés", async () => {
    const a = await clientActive("Alex D.");
    await profil(a, "Alex", { pl_total: 520, sexe: "h", cat_pl: "83", score_force: 75, poids: 82.4, seances_mois: 4 });
    assert.deepEqual(JSON.parse(ligne(a).stats), { seances_mois: 4, mois: "2026-10" });
    assert.equal(compte("communaute_scores_mois"), 0);
    assert.equal((await classement(a, "pl_total")).corps.error, "accord-disciplines-requis");
    await accord(a, "disciplines");
    await stats(a, { pl_total: 520, sexe: "h", cat_pl: "83", score_force: 75, poids: 82.4, seances_mois: 4 });
    const s = JSON.parse(ligne(a).stats);
    assert.deepEqual(s, { seances_mois: 4, pl_total: 520, sexe: "h", cat_pl: "83", score_force: 75, mois: "2026-10" });
    assert.ok(!("poids" in s));
  });

  test("bornes réalistes : au-delà, refusé ; temps plus rapide que le record du monde refusé", () => {
    const s = T.nettoyerStatsCommunaute(
      { course_5k: 700, course_10k: 2400, pl_total: 1400, halt_total: 300, sexe: "h", cat_pl: "83", cat_halt: "999", score_course: 120, score_force: 75.4, mois: "2026-10" },
      MAINTENANT,
      { disc: true }
    );
    assert.deepEqual(s, { halt_total: 300, course_10k: 2400, sexe: "h", cat_pl: "83", score_force: 75.4, mois: "2026-10" });
    // Mois futur ou trop ancien : ramené au mois en cours.
    assert.equal(T.nettoyerStatsCommunaute({ mois: "2027-01" }, MAINTENANT).mois, "2026-10");
    assert.equal(T.nettoyerStatsCommunaute({ mois: "2026-09" }, MAINTENANT).mois, "2026-09");
    assert.equal(T.nettoyerStatsCommunaute({ mois: "2026-01" }, MAINTENANT).mois, "2026-10");
    for (const [k, r] of Object.entries(C.CATEGORIES)) for (const f of r.filtres || []) assert.ok(C.FILTRES[f], k + " " + f);
  });

  test("FFForce : total classé par sexe et catégorie IPF ; filtre inconnu ignoré, pas d'injection", async () => {
    const a = await clientActive("Alex D.");
    const b = await clientActive("Bob M.");
    const c = await clientActive("Cyril K.");
    const d = await clientActive("Dana R.");
    for (const [qui, pseudo, s] of [
      [a, "Alex", { pl_total: 520, pl_gl: 72.1, sexe: "h", cat_pl: "83" }],
      [b, "Bob", { pl_total: 600, pl_gl: 75.3, sexe: "h", cat_pl: "93" }],
      [c, "Cyril", { pl_total: 480, pl_gl: 66, sexe: "h", cat_pl: "83" }],
      [d, "Dana", { pl_total: 380, pl_gl: 80.2, sexe: "f", cat_pl: "63" }]
    ]) {
      await profil(qui, pseudo);
      await accord(qui, "disciplines");
      await stats(qui, s);
    }
    const r = await classement(a, "pl_total", { sexe: "h", cat_pl: "83" });
    assert.deepEqual(r.corps.lignes.map((l) => l.pseudo), ["Alex", "Cyril"]);
    assert.deepEqual(r.corps.moi, { rang: 1, valeur: 520 });
    assert.deepEqual((await classement(a, "pl_gl")).corps.lignes.map((l) => l.pseudo), ["Dana", "Bob", "Alex", "Cyril"]);
    assert.deepEqual((await classement(a, "pl_gl", { sexe: "f" })).corps.lignes.map((l) => l.pseudo), ["Dana"]);
    const injection = await classement(a, "pl_total", { cat_pl: "83') OR 1=1 --", poids: "80" });
    assert.equal(injection.corps.lignes.length, 4);
  });

  test("course : le temps le plus court est premier", async () => {
    const a = await clientActive("Alex D.");
    const b = await clientActive("Bea L.");
    for (const [qui, pseudo, t] of [[a, "Alex", 2700], [b, "Bea", 2580]]) {
      await profil(qui, pseudo);
      await accord(qui, "disciplines");
      await stats(qui, { course_10k: t, sexe: qui === a ? "h" : "f" });
    }
    assert.deepEqual((await classement(a, "course_10k")).corps.lignes.map((l) => l.pseudo), ["Bea", "Alex"]);
  });

  test("athlète du mois et de l'année : meilleur score retenu, titres sur les périodes terminées", async () => {
    const a = await clientActive("Alex D.");
    const b = await clientActive("Bea L.");
    const c = await clientActive("Chris N.");
    for (const [qui, pseudo, s] of [
      [a, "Alex", { score_course: 70, sexe: "h" }],
      [b, "Bea", { score_course: 78.5, sexe: "f" }],
      [c, "Chris", { score_course: 60, score_force: 80, sexe: "h" }]
    ]) {
      await profil(qui, pseudo);
      await accord(qui, "disciplines");
      await stats(qui, { ...s, mois: "2026-10" });
    }
    // Alex publie un score plus faible : le meilleur du mois reste.
    await stats(a, { score_course: 65, sexe: "h", mois: "2026-10" });
    const oct = (await appeler("/communaute/athletes-du-mois", {}, a.jeton)).corps;
    assert.deepEqual(oct.enCours.find((x) => x.discipline === "course").lignes.map((l) => [l.pseudo, l.score, l.moi]), [["Bea", 78.5, false], ["Alex", 70, true], ["Chris", 60, false]]);
    assert.equal(oct.enCours.find((x) => x.discipline === "force").lignes[0].pseudo, "Chris");
    assert.deepEqual(oct.titres, []);
    // Novembre : octobre est terminé, les titres sont attribués.
    horloge = NOVEMBRE;
    await stats(c, { score_course: 99, sexe: "h", mois: "2026-11" });
    const nov = (await appeler("/communaute/athletes-du-mois", {}, b.jeton)).corps;
    assert.equal(nov.moisPrecedent, "2026-10");
    assert.equal(nov.precedent.find((x) => x.discipline === "course").lignes[0].pseudo, "Bea");
    assert.deepEqual(nov.titres, [{ mois: "2026-10", discipline: "course", rang: 1 }]);
    assert.deepEqual((await appeler("/communaute/athletes-du-mois", {}, c.jeton)).corps.titres, [
      { mois: "2026-10", discipline: "course", rang: 3 },
      { mois: "2026-10", discipline: "force", rang: 1 }
    ]);
    // Année : le meilleur score mensuel (Chris 99 en novembre).
    assert.deepEqual(nov.anneeEnCours.find((x) => x.discipline === "course").lignes.map((l) => [l.pseudo, l.score]), [["Chris", 99], ["Bea", 78.5], ["Alex", 70]]);
    horloge = Date.parse("2027-01-10T10:00:00Z");
    const jan = (await appeler("/communaute/athletes-du-mois", {}, c.jeton)).corps;
    assert.equal(jan.annee, "2027");
    assert.equal(jan.anneePrecedente.find((x) => x.discipline === "course").lignes[0].pseudo, "Chris");
    assert.deepEqual(jan.titresAnnee, [
      { annee: "2026", discipline: "course", rang: 1 },
      { annee: "2026", discipline: "force", rang: 1 }
    ]);
  });

  test("retirer l'accord efface performances, sexe, catégorie et scores du mois", async () => {
    const a = await clientActive("Alex D.");
    await profil(a, "Alex");
    await accord(a, "disciplines");
    await stats(a, { pl_total: 520, sexe: "h", cat_pl: "83", score_force: 75, seances_mois: 5 });
    assert.equal(compte("communaute_scores_mois"), 1);
    const r = await accord(a, "disciplines", false);
    assert.equal(r.corps.profil.disciplines, false);
    assert.deepEqual(JSON.parse(ligne(a).stats), { seances_mois: 5, mois: "2026-10" });
    assert.equal(compte("communaute_scores_mois"), 0);
    assert.equal((await appeler("/communaute/athletes-du-mois", {}, a.jeton)).corps.error, "accord-disciplines-requis");
    assert.equal((await accord(a, "salle")).corps.error, "accord-inconnu");
  });
});

describe("accord « transformation » : classements et mur", () => {
  async function avecTransfo(libelle, pseudo) {
    const q = await clientActive(libelle);
    await profil(q, pseudo);
    await accord(q, "transformation");
    return q;
  }

  test("perte de gras : seulement si le téléphone la juge éligible (jamais la raison)", async () => {
    const a = await avecTransfo("Alex D.", "Alex");
    const b = await avecTransfo("Bea L.", "Bea");
    await stats(a, { gras_90: 4.2, muscle_90: 1.1, sexe: "h", perte_eligible: 1 });
    await stats(b, { gras_90: 6, muscle_90: 0.8, sexe: "f", perte_eligible: 0, raison: "tca", age: 16 });
    const sb = JSON.parse(ligne(b).stats);
    assert.deepEqual(sb, { muscle_90: 0.8, sexe: "f", mois: "2026-10" });
    assert.deepEqual((await classement(a, "gras_90")).corps.lignes.map((l) => l.pseudo), ["Alex"]);
    assert.deepEqual((await classement(a, "muscle_90")).corps.lignes.map((l) => l.pseudo), ["Alex", "Bea"]);
    // Plafonds du téléphone repris : au-delà, refusé.
    assert.deepEqual(T.nettoyerStatsCommunaute({ gras_90: 14, muscle_90: 3.4, gras_an: 20, perte_eligible: 1 }, MAINTENANT, { transfo: true }), { gras_an: 20, mois: "2026-10" });
    const tout = JSON.stringify(env.DB.sqlite.prepare("SELECT * FROM communaute_profils").all());
    assert.ok(!/perte_eligible|tca|age|poids/.test(tout));
  });

  test("mur : accord requis, message filtré, une par semaine, Bravo, pas à soi-même", async () => {
    const sans = await clientActive("Zoé F.");
    await profil(sans, "Zoe");
    const pub = { periode: "90", jours: 84, gras: 3.5, muscle: 1.2, perte_eligible: 1, texte: "Merci au coach, on lâche rien !" };
    assert.equal((await appeler("/communaute/transformations/publier", pub, sans.jeton)).corps.error, "accord-transformation-requis");
    const a = await avecTransfo("Alex D.", "Alex");
    const b = await avecTransfo("Bea L.", "Bea");
    assert.equal((await appeler("/communaute/transformations/publier", { ...pub, texte: "écris-moi sur insta.com" }, a.jeton)).corps.error, "message-refuse");
    assert.equal((await appeler("/communaute/transformations/publier", { ...pub, texte: "appelle 06 12 34 56 78" }, a.jeton)).corps.error, "message-refuse");
    assert.equal((await appeler("/communaute/transformations/publier", { ...pub, texte: "bande de connards" }, a.jeton)).corps.error, "message-refuse");
    assert.equal((await appeler("/communaute/transformations/publier", { ...pub, gras: 30 }, a.jeton)).corps.ok, true, "gras hors borne ignoré, muscle gardé");
    horloge += 7 * JOUR;
    // Perte non éligible : la perte n'est pas publiée.
    assert.equal((await appeler("/communaute/transformations/publier", { ...pub, muscle: null, perte_eligible: 0 }, b.jeton)).corps.error, "transformation-vide");
    assert.equal((await appeler("/communaute/transformations/publier", pub, b.jeton)).corps.ok, true);
    assert.equal((await appeler("/communaute/transformations/publier", pub, b.jeton)).corps.error, "une-par-semaine");
    const mur = (await appeler("/communaute/transformations/liste", {}, a.jeton)).corps.transformations;
    assert.deepEqual(mur.map((t) => [t.pseudo, t.gras, t.muscle, t.moi]), [["Bea", 3.5, 1.2, false], ["Alex", null, 1.2, true]]);
    assert.ok(!JSON.stringify(mur).includes(a.client));
    const idBea = mur[0].id;
    assert.equal((await appeler("/communaute/transformations/bravo", { id: mur[1].id }, a.jeton)).corps.error, "pas-a-soi-meme");
    assert.equal((await appeler("/communaute/transformations/bravo", { id: idBea }, a.jeton)).corps.bravo, true);
    let vu = (await appeler("/communaute/transformations/liste", {}, b.jeton)).corps.transformations.find((t) => t.id === idBea);
    assert.equal(vu.bravos, 1);
    assert.equal((await appeler("/communaute/transformations/bravo", { id: idBea }, a.jeton)).corps.bravo, false, "second appui : retiré");
    vu = (await appeler("/communaute/transformations/liste", {}, b.jeton)).corps.transformations.find((t) => t.id === idBea);
    assert.equal(vu.bravos, 0);
    // Supprimer sa publication.
    await appeler("/communaute/transformations/supprimer", { id: idBea }, a.jeton);
    assert.equal(compte("communaute_transformations"), 2, "pas celle d'un autre");
    await appeler("/communaute/transformations/supprimer", { id: idBea }, b.jeton);
    assert.equal(compte("communaute_transformations"), 1);
  });

  test("retirer l'accord efface les chiffres, les publications et leurs bravos", async () => {
    const a = await avecTransfo("Alex D.", "Alex");
    const b = await avecTransfo("Bea L.", "Bea");
    await stats(a, { gras_90: 4.2, muscle_an: 2, sexe: "h", perte_eligible: 1, seances_mois: 3 });
    await appeler("/communaute/transformations/publier", { periode: "an", jours: 200, muscle: 2, texte: "Une année de régularité" }, a.jeton);
    const id = (await appeler("/communaute/transformations/liste", {}, b.jeton)).corps.transformations[0].id;
    await appeler("/communaute/transformations/bravo", { id }, b.jeton);
    await accord(a, "transformation", false);
    assert.deepEqual(JSON.parse(ligne(a).stats), { seances_mois: 3, mois: "2026-10" });
    assert.equal(compte("communaute_transformations"), 0);
    assert.equal(compte("communaute_bravos"), 0);
    assert.equal((await classement(a, "gras_90")).corps.error, "accord-transformation-requis");
  });
});

describe("modération", () => {
  test("signalement : 2 clients différents masquent un profil ; le même client ne compte qu'une fois ; pas soi-même", async () => {
    const a = await clientActive("Alex D.");
    const b = await clientActive("Bea L.");
    const c = await clientActive("Chris N.");
    await profil(a, "Alex", { seances_mois: 4 });
    await profil(b, "Bea", { seances_mois: 6 });
    await profil(c, "Chris", { seances_mois: 2 });
    assert.equal(C.SIGNALEMENTS_POUR_MASQUER, 2);
    assert.equal((await appeler("/communaute/signaler", { type: "profil", cible: "Alex" }, a.jeton)).corps.error, "signalement-invalide");
    assert.equal((await appeler("/communaute/signaler", { type: "profil", cible: "Inconnu" }, a.jeton)).corps.error, "signalement-invalide");
    await appeler("/communaute/signaler", { type: "profil", cible: "Alex", motif: "pseudo" }, b.jeton);
    await appeler("/communaute/signaler", { type: "profil", cible: "Alex", motif: "pseudo" }, b.jeton);
    assert.equal(ligne(a).masque, 0, "un seul client : pas masqué");
    await appeler("/communaute/signaler", { type: "profil", cible: "Alex" }, c.jeton);
    assert.equal(ligne(a).masque, 1);
    assert.deepEqual((await classement(b, "seances_mois")).corps.lignes.map((l) => l.pseudo), ["Bea", "Chris"]);
    // Le profil masqué le sait, et ne peut plus publier sur le mur.
    assert.equal((await appeler("/communaute/etat", {}, a.jeton)).corps.profil.masque, true);
    // Le coach le revoit et le réaffiche.
    const liste = await admin("/admin/communaute", { action: "signalements" });
    assert.deepEqual(liste.masques, ["Alex"]);
    assert.equal(liste.signalements[0].apercu, "Alex");
    assert.equal(liste.signalements[0].cible, null, "pas d'identifiant interne");
    await admin("/admin/communaute", { action: "afficher", cible: "Alex" });
    assert.equal(ligne(a).masque, 0);
    assert.equal((await admin("/admin/communaute", { action: "signalements" })).signalements.length, 0);
  });

  test("transformation signalée deux fois : masquée du mur ; le coach peut masquer ou supprimer", async () => {
    const [a, b, c] = [await clientActive("Alex D."), await clientActive("Bea L."), await clientActive("Chris N.")];
    for (const [q, p] of [[a, "Alex"], [b, "Bea"], [c, "Chris"]]) {
      await profil(q, p);
      await accord(q, "transformation");
    }
    await appeler("/communaute/transformations/publier", { periode: "90", jours: 60, muscle: 1, texte: "Trois mois de boulot" }, a.jeton);
    const id = (await appeler("/communaute/transformations/liste", {}, b.jeton)).corps.transformations[0].id;
    assert.equal((await appeler("/communaute/signaler", { type: "transformation", cible: String(id) }, a.jeton)).corps.error, "signalement-invalide");
    await appeler("/communaute/signaler", { type: "transformation", cible: String(id) }, b.jeton);
    assert.equal((await appeler("/communaute/transformations/liste", {}, c.jeton)).corps.transformations.length, 1);
    await appeler("/communaute/signaler", { type: "transformation", cible: String(id) }, c.jeton);
    assert.equal((await appeler("/communaute/transformations/liste", {}, c.jeton)).corps.transformations.length, 0);
    const liste = await admin("/admin/communaute", { action: "signalements" });
    assert.equal(liste.signalements[0].apercu, "Alex : Trois mois de boulot");
    await admin("/admin/communaute", { action: "afficher-transformation", cible: String(id) });
    assert.equal((await appeler("/communaute/transformations/liste", {}, c.jeton)).corps.transformations.length, 1);
    await admin("/admin/communaute", { action: "masquer-transformation", cible: String(id) });
    assert.equal((await appeler("/communaute/transformations/liste", {}, c.jeton)).corps.transformations.length, 0);
    await admin("/admin/communaute", { action: "supprimer-transformation", cible: String(id) });
    assert.equal(compte("communaute_transformations"), 0);
    // Le coach masque un profil par son pseudo, ou le supprime.
    await admin("/admin/communaute", { action: "masquer", cible: "Bea" });
    assert.equal(ligne(b).masque, 1);
    await admin("/admin/communaute", { action: "supprimer-profil", cible: "Bea" });
    assert.equal(ligne(b), undefined);
    assert.equal((await admin("/admin/communaute", { action: "inconnue" })).error, "action-inconnue");
  });

  test(`${C.COMMUNAUTE_SIGNALEMENTS_PAR_JOUR} signalements par jour et par client`, async () => {
    const a = await clientActive("Alex D.");
    const b = await clientActive("Bea L.");
    await profil(a, "Alex");
    await profil(b, "Bea");
    for (let i = 0; i < C.COMMUNAUTE_SIGNALEMENTS_PAR_JOUR; i++) assert.equal((await appeler("/communaute/signaler", { type: "profil", cible: "Bea" }, a.jeton)).statut, 200);
    assert.equal((await appeler("/communaute/signaler", { type: "profil", cible: "Bea" }, a.jeton)).statut, 429);
  });
});

describe("suppression, révocation, tâche planifiée", () => {
  async function toutRempli(libelle, pseudo) {
    const q = await clientActive(libelle);
    await profil(q, pseudo);
    await accord(q, "disciplines");
    await accord(q, "transformation");
    await stats(q, { seances_mois: 4, score_force: 70, pl_total: 500, sexe: "h", cat_pl: "83", muscle_90: 1 });
    await appeler("/communaute/transformations/publier", { periode: "90", jours: 60, muscle: 1, texte: "Trois mois de boulot" }, q.jeton);
    return q;
  }

  test("« Supprimer mon profil de la communauté » efface tout ce qui le concerne", async () => {
    const a = await toutRempli("Alex D.", "Alex");
    const b = await toutRempli("Bea L.", "Bea");
    const idB = (await appeler("/communaute/transformations/liste", {}, a.jeton)).corps.transformations.find((t) => !t.moi).id;
    await appeler("/communaute/transformations/bravo", { id: idB }, a.jeton);
    await appeler("/communaute/signaler", { type: "profil", cible: "Bea" }, a.jeton);
    const r = await appeler("/communaute/supprimer", {}, a.jeton);
    assert.deepEqual(r.corps, { ok: true, profil: null });
    const reste = JSON.stringify(
      ["communaute_profils", "communaute_scores_mois", "communaute_transformations", "communaute_bravos", "communaute_signalements"].map((t) => env.DB.sqlite.prepare(`SELECT * FROM ${t}`).all())
    );
    assert.ok(!reste.includes(a.client), "plus rien d'Alex");
    assert.ok(reste.includes(b.client), "Bea reste");
    assert.equal(compte("communaute_bravos"), 0);
  });

  test("client révoqué : plus rien ne répond, il disparaît de tout", async () => {
    const a = await toutRempli("Alex D.", "Alex");
    const b = await toutRempli("Bea L.", "Bea");
    await admin("/admin/revoquer", { client: a.client });
    assert.equal((await appeler("/communaute/etat", {}, a.jeton)).statut, 401);
    assert.deepEqual((await classement(b, "seances_mois")).corps.lignes.map((l) => l.pseudo), ["Bea"]);
    assert.equal((await appeler("/communaute/transformations/liste", {}, b.jeton)).corps.transformations.length, 1);
    const reste = JSON.stringify(
      ["communaute_profils", "communaute_scores_mois", "communaute_transformations", "communaute_bravos", "communaute_signalements"].map((t) => env.DB.sqlite.prepare(`SELECT * FROM ${t}`).all())
    );
    assert.ok(!reste.includes(a.client));
  });

  test("ménage : vieux scores, signalements traités et publications masquées de plus de 180 jours", async () => {
    const a = await toutRempli("Alex D.", "Alex");
    env.DB.sqlite.prepare("INSERT INTO communaute_scores_mois (mois, discipline, client_id, score, maj_le) VALUES ('2024-12', 'force', ?, 60, 0)").run(a.client);
    env.DB.sqlite.prepare("INSERT INTO communaute_scores_mois (mois, discipline, client_id, score, maj_le) VALUES ('2025-03', 'force', ?, 60, 0)").run(a.client);
    env.DB.sqlite.prepare("UPDATE communaute_transformations SET masque = 1, cree_le = ?").run(MAINTENANT - 200 * JOUR);
    await worker.scheduled({}, env, null);
    const mois = env.DB.sqlite.prepare("SELECT mois FROM communaute_scores_mois ORDER BY mois").all().map((r) => r.mois);
    assert.deepEqual(mois, ["2025-03", "2026-10"]);
    assert.equal(compte("communaute_transformations"), 0);
  });

  test("tables ajoutées sans toucher aux existantes", async () => {
    await clientActive("Alex D.");
    const tables = env.DB.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'communaute_%' ORDER BY name").all().map((r) => r.name);
    assert.deepEqual(tables, ["communaute_bravos", "communaute_profils", "communaute_scores_mois", "communaute_signalements", "communaute_transformations"]);
  });

  test("filtres de texte : coordonnées refusées", () => {
    assert.ok(T.contientCoordonnees("www.exemple.fr"));
    assert.ok(T.contientCoordonnees("moi@exemple.com"));
    assert.ok(T.contientCoordonnees("+33 6 12 34 56 78"));
    assert.ok(!T.contientCoordonnees("−3,5 % de gras en 12 semaines"));
    assert.equal(T.validerTransformationCommunaute({ periode: "90", jours: 10, muscle: 1, texte: "Bravo à tous" }).erreur, "periode-inconnue");
    assert.equal(T.validerTransformationCommunaute({ periode: "an", jours: 300, muscle: 13.5, texte: "Bravo à tous" }).erreur, "transformation-vide");
  });
});
