/**
 * Défis entre amis côté app (app/src/lib/defis-amis.js), 24 octobre 2026.
 *
 * Porté de tests/defis-amis.test.mjs de l'app publique Neiram, adapté à
 * l'app de coaching : jeton client obligatoire (acces_neiram), Worker du
 * coach, lien ?defi=CODE relatif à la page ouverte, pseudo par défaut tiré
 * du libellé du client, carte du Journal, textes en constantes.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { creerLocalStorage } from "./outils-neiram.mjs";

globalThis.localStorage = creerLocalStorage();
const m = await import("../app/src/lib/defis-amis.js");
const { PROXY_BASE_URL } = await import("../app/src/lib/config.js");
beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

const lire = (c) => readFileSync(new URL("../" + c, import.meta.url), "utf8");
const JETON = "j".repeat(40);
const activer = (libelle = "Sabine P.") => localStorage.setItem("acces_neiram", JSON.stringify({ jeton: JETON, libelle, activeLe: "2026-10-20T00:00:00Z" }));

describe("total calculé sur le téléphone", () => {
  const journal = [{ date: "2026-10-23", steps: 9000 }, { date: "2026-10-24", steps: 8000 }, { date: "2026-10-26", steps: "12000" }, { date: "2026-10-27" }];
  const seances = [
    { date: "2026-10-24", durationMin: 60, exercises: [] },
    { date: "2026-10-25", activite: { id: "course", duree: 35 }, durationMin: 35, exercises: [] },
    { date: "2026-10-26", pointage: true, durationMin: "", exercises: [] },
    { date: "2026-11-02", durationMin: 50, exercises: [] }
  ];
  const ctx = { journal, seances };

  test("pas : les pas notés dans le Journal (form.steps), pendant le défi seulement", () => {
    assert.equal(m.valeurDefi("pas", "2026-10-24", "2026-10-30", ctx), 20000);
  });
  test("séances : séances, activités et pointages de la période", () => {
    assert.equal(m.valeurDefi("seances", "2026-10-24", "2026-10-30", ctx), 3);
  });
  test("minutes : durées des séances et des activités", () => {
    assert.equal(m.valeurDefi("minutes", "2026-10-24", "2026-10-30", ctx), 95);
  });
  test("rien de noté : 0", () => {
    assert.equal(m.valeurDefi("minutes", "2026-10-24", "2026-10-30"), 0);
  });
});

describe("défis suivis et victoires", () => {
  test("victoires : terminé, premier, au moins deux participants ; une seule fois ; gardées après retrait", () => {
    m.retenirDefi("ABC234", "Alex");
    m.retenirDefi("XYZ789", "Alex");
    const etats = [
      { code: "ABC234", termine: true, participants: [{ rang: 1, moi: true, valeur: 30000 }, { rang: 2, moi: false, valeur: 1 }] },
      { code: "XYZ789", termine: true, participants: [{ rang: 1, moi: true, valeur: 5 }] }
    ];
    m.noterVictoires(etats);
    m.noterVictoires(etats);
    assert.equal(m.defisGagnes(), 1);
    m.oublierDefi("ABC234");
    assert.equal(m.defisGagnes(), 1, "un trophée gagné ne se perd pas");
    assert.deepEqual(m.lireDefisAmis().map((d) => d.code), ["XYZ789"]);
  });

  test("clés sauvegardées : préfixe cn_ ; le jeton reste hors sauvegarde", () => {
    m.retenirDefi("ABC234", "Alex");
    m.retenirPseudo("Alex");
    for (const cle of [m.CLE_DEFIS_AMIS, m.CLE_DEFIS_GAGNES, m.CLE_PSEUDO_DEFIS]) assert.match(cle, /^cn_/);
    assert.equal(localStorage.getItem("cn_defis_pseudo"), '"Alex"');
  });
});

describe("pseudo par défaut", () => {
  test("le prénom tiré du libellé du client, sinon le dernier choisi", () => {
    assert.equal(m.prenomDuLibelle("Sabine P."), "Sabine");
    assert.equal(m.pseudoParDefaut(), "");
    activer("Sabine P.");
    assert.equal(m.pseudoParDefaut(), "Sabine");
    m.retenirPseudo("Sab63");
    assert.equal(m.pseudoParDefaut(), "Sab63");
  });
});

describe("lien d'invitation ?defi=CODE", () => {
  const PAGE = { origin: "https://coachneiram.github.io", pathname: "/coach-neiram-app/", search: "", hash: "" };

  test("construit sur la page ouverte (sous-chemin GitHub Pages gardé)", () => {
    assert.equal(m.lienInvitation("ABC234", PAGE), "https://coachneiram.github.io/coach-neiram-app/?defi=ABC234");
    const t = m.texteInvitation("ABC234", "seances", PAGE);
    assert.match(t.texte, /le plus de séances en 7 jours/);
    assert.match(t.texte, /ABC234/);
    assert.equal(t.url, "https://coachneiram.github.io/coach-neiram-app/?defi=ABC234");
  });

  test("lecture et nettoyage de l'adresse, autres paramètres gardés", () => {
    assert.equal(m.codeDepuisAdresse("?defi=abc234"), "ABC234");
    assert.equal(m.codeDepuisAdresse("?defi=abc"), null);
    assert.equal(m.adresseSansDefi({ pathname: "/coach-neiram-app/", search: "?defi=ABC234&x=1", hash: "#j" }), "/coach-neiram-app/?x=1#j");
    const remplacements = [];
    const env = {
      location: { ...PAGE, search: "?defi=abc234" },
      history: { state: null, replaceState: (_e, _t, url) => remplacements.push(url) }
    };
    assert.equal(m.brancherInvitationDefi(env), "ABC234");
    assert.deepEqual(remplacements, ["/coach-neiram-app/"]);
    assert.equal(m.prendreCodeInvitation({ location: PAGE }), "ABC234");
    assert.equal(m.prendreCodeInvitation({ location: PAGE }), null, "pris une seule fois");
  });
});

describe("appels au Worker du coach", () => {
  test("sans code d'accès activé : pas de défi possible", () => {
    assert.equal(m.defisPossibles(), false);
    activer();
    assert.equal(m.defisPossibles(), true);
  });

  test("POST /defis/... avec le jeton, erreur du Worker remontée telle quelle", async () => {
    activer();
    const appels = [];
    const env = {
      localStorage: globalThis.localStorage,
      fetch: async (url, init) => {
        appels.push({ url, init });
        if (url.endsWith("/defis/rejoindre")) return new Response(JSON.stringify({ ok: false, error: "pseudo-pris" }), { status: 409 });
        return new Response(JSON.stringify({ ok: true, defi: { code: "ABC234" } }), { status: 200 });
      }
    };
    const r = await m.creerDefi("pas", "Sabine", env);
    assert.equal(r.defi.code, "ABC234");
    assert.equal(appels[0].url, PROXY_BASE_URL + "/defis/creer");
    assert.equal(appels[0].init.headers.Authorization, "Bearer " + JETON);
    assert.deepEqual(JSON.parse(appels[0].init.body), { type: "pas", pseudo: "Sabine" });
    await assert.rejects(m.rejoindreDefi("ABC234", "Sabine", env), /pseudo-pris/);
    await assert.rejects(m.quitterDefi("ABC234", { localStorage: globalThis.localStorage, fetch: async () => { throw new Error("hors ligne"); } }), /reseau/);
    assert.equal(m.messageErreurDefi(new Error("pseudo-pris")), "Ce pseudo est déjà pris dans ce défi.");
    assert.equal(m.messageErreurDefi(new Error("??")), "Service indisponible pour l'instant.");
  });
});

describe("branchements dans l'app", () => {
  test("carte dans le Journal, près du défi de 30 jours, avec son tuto", () => {
    const journal = lire("app/src/ecrans/Journal.jsx");
    const i30 = journal.indexOf("<CarteDefi\n");
    const iAmis = journal.indexOf("<CarteDefisAmis");
    assert.ok(i30 > 0 && iAmis > i30 && iAmis - i30 < 600, "juste après la carte « Défi 30 jours »");
    assert.match(lire("app/src/ui/CarteDefisAmis.jsx"), /<SectionTitle tuto="defis-amis">/);
    assert.match(lire("app/src/App.jsx"), /brancherInvitationDefi\(\)/);
  });

  test("accord explicite avant de créer ou de rejoindre", () => {
    assert.equal(m.TEXTES_DEFIS_AMIS.accord, "Ton pseudo et ton total sont visibles des autres participants de ce défi");
    const carte = lire("app/src/ui/CarteDefisAmis.jsx");
    assert.match(carte, /onClick=\{\(\) => setAccord\("creer"\)\}/);
    assert.match(carte, /onClick=\{\(\) => setAccord\("rejoindre"\)\}/);
    assert.match(carte, /onClick=\{\(\) => agir\(accord\)\}/);
  });
});
