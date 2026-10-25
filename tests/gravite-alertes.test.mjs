/**
 * Gravité et statut des alertes (Smart Coach, 25 octobre 2026) : le script
 * Google v2.5, avec la doublure des services Google, et la parité de la
 * table des niveaux entre l'application et le script.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import worker from "../worker/coach-neiram-proxy.js";
import { creerScript, SOURCE_SCRIPT } from "./doublure-apps-script.mjs";
import { fauxD1 } from "./faux-d1.mjs";
import { niveauAlerte, TABLE_NIVEAUX } from "../app/src/lib/gravite-alertes.js";

/** L'onglet Alertes du coach au 25 octobre 2026 : cinq colonnes, E = Traité. */
const CLASSEUR_DU_COACH = {
  Alertes: ["Reçu le", "Client", "Type", "Détail", "Traité"]
};

describe("v2.5 : en-tête et autorisations", () => {
  test("@OnlyCurrentDoc en tête de fichier", () => {
    assert.match(SOURCE_SCRIPT.split("\n")[0], /^\/\*\* @OnlyCurrentDoc \*\/$/);
  });

  test("la procédure d'installation est documentée dans l'en-tête", () => {
    const entete = SOURCE_SCRIPT.slice(0, SOURCE_SCRIPT.indexOf("/* ---"));
    for (const etape of [/Version 2\.5/, /COMMENTER EN ENTIER/, /EMAIL_COACH/, /déploiement ACTIF/, /Nouvelle version/, /migrer\(\)/, /AUTORISATION/]) {
      assert.match(entete, etape);
    }
  });
});

describe("v2.5 : onglet Alertes", () => {
  test("migrer() ajoute Niveau et Statut À LA FIN, sans rien décaler", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    // Une ancienne ligne, écrite par la v2.4.
    s.feuilles.get("Alertes").appendRow(["2026-10-20", "Thomas", "alerte_decalages", "3 créneaux", false]);
    s.appeler("migrer");
    const f = s.feuilles.get("Alertes");
    assert.deepEqual(f.cellules[0], ["Reçu le", "Client", "Type", "Détail", "Traité", "Niveau", "Statut"]);
    assert.equal(f.cellules[0][4], "Traité", "E reste « Traité » : le Dashboard actuel continue de compter");
    // L'ancienne ligne garde son statut vide : le Dashboard se rabat sur Traité.
    assert.deepEqual(s.lignes("Alertes")[0], { "Reçu le": "2026-10-20", Client: "Thomas", Type: "alerte_decalages", Détail: "3 créneaux", Traité: false, Niveau: "", Statut: "" });
    // Liste déroulante posée sur toute la colonne Statut (G = 7).
    const v = f.validations.find((x) => x.colonne === 7 && x.ligne === 2);
    assert.ok(v, "validation sur la colonne Statut");
    assert.deepEqual(v.regle.liste, ["nouveau", "vu", "traité", "ignoré"]);
    assert.equal(v.regle.invalideAccepte, false);
    assert.ok(v.nl >= 999);
    // Relancer migrer() n'ajoute rien.
    s.appeler("migrer");
    assert.equal(f.cellules[0].length, 7);
  });

  test("sans migrer() : les colonnes se créent quand même à la fin", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster({ type: "alerte_decalages", client: "Thomas", nbDecalages: 3, niveau: "attention" });
    assert.deepEqual(s.feuilles.get("Alertes").cellules[0], ["Reçu le", "Client", "Type", "Détail", "Traité", "Niveau", "Statut"]);
  });

  test("une alerte s'écrit avec son niveau, statut « nouveau » en liste, Traité décoché", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.appeler("migrer");
    assert.equal(s.poster({ type: "alerte_poids", client: "Thomas", niveau: "info", message: "Poids stable depuis 3 semaines en phase de perte" }).ok, true);
    const [l] = s.lignes("Alertes");
    assert.equal(l.Niveau, "info");
    assert.equal(l.Statut, "nouveau");
    assert.equal(l.Traité, false);
    assert.equal(l.Détail, "Poids stable depuis 3 semaines en phase de perte");
    const v = s.feuilles.get("Alertes").validations.filter((x) => x.ligne === 2 && x.nl === 1 && x.colonne === 7);
    assert.equal(v.length, 1, "validation posée sur la cellule écrite");
  });

  test("sans niveau (application en cache) : celui de la table", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster({ type: "alerte_seances_manquees", client: "Thomas", nbManquees: 3 });
    s.poster({ type: "semaine_difficile", client: "Julie" });
    s.poster({ type: "alerte_decalages", client: "Marc", niveau: "n'importe quoi" });
    assert.deepEqual(s.lignes("Alertes").map((l) => l.Niveau), ["critique", "info", "attention"]);
  });

  test("le Journal ne change pas de forme", () => {
    const s = creerScript();
    s.poster({ type: "alerte_nutrition", client: "Thomas", niveau: "attention", message: "Calories hors cible 5 jours sur 7" });
    const entetes = s.feuilles.get("Journal").cellules[0];
    assert.equal(entetes.includes("Niveau"), false);
    assert.equal(s.lignes("Journal")[0].Type, "alerte_nutrition");
  });
});

describe("v2.5 : mail selon le niveau", () => {
  test("info : écrite, pas de mail ; attention ⚠️ ; critique 🔴", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster({ type: "alerte_poids", client: "Thomas", niveau: "info", message: "Poids stable depuis 3 semaines en phase de perte" });
    s.poster({ type: "semaine_difficile", client: "Julie", motif: "boulot" });
    assert.equal(s.mails.length, 0);
    assert.equal(s.lignes("Alertes").length, 2);

    s.poster({ type: "alerte_nutrition", client: "Thomas", niveau: "attention", message: "Calories hors cible 5 jours sur 7 (moyenne 2 650 kcal pour 2 200)" });
    s.poster({ type: "alerte_inactivite", client: "Marc D.", niveau: "critique", nbJours: 8, message: "Aucune saisie depuis 8 jours" });
    assert.deepEqual(s.mails.map((m) => m.sujet), ["[Coach] ⚠️ Thomas : nutrition hors cible", "[Coach] 🔴 Marc D. : aucune saisie depuis 8 jours"]);
    assert.match(s.mails[0].corps, /2 650 kcal pour 2 200/);
    assert.match(s.mails[1].corps, /depuis 8 jours/);
    for (const m of s.mails) assert.doesNotMatch(m.corps, /undefined|NaN/);
  });

  test("les anciennes alertes gardent leur objet, préfixé du niveau", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster({ type: "alerte_seances_manquees", client: "Thomas", nbManquees: 2 });
    s.poster({ type: "alerte_sommeil_stress", client: "Julie", message: "Stress très élevé" });
    assert.deepEqual(s.mails.map((m) => m.sujet), ["[Coach] ⚠️ Thomas : 2 créneaux manqués", "[Coach] 🔴 Julie : sommeil ou stress à surveiller"]);
  });

  test("mêmes plafonds et anti-doublon qu'avant", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster({ type: "alerte_poids", client: "Thomas", niveau: "attention", message: "Variation de +2,4 % en une semaine" });
    s.poster({ type: "alerte_poids", client: "Thomas", niveau: "attention", message: "Variation de +2,6 % en une semaine" });
    assert.equal(s.mails.length, 1, "anti-doublon 12 h");
    const t = creerScript({ entetesExistants: CLASSEUR_DU_COACH, reglages: { ANTI_DOUBLON_HEURES: 0 } });
    for (let i = 0; i < 5; i++) t.poster({ type: "alerte_inactivite", client: "Marc", niveau: "critique", nbJours: 7 + i });
    assert.equal(t.mails.length, 3, "3 par client et par jour");
    assert.equal(t.lignes("Alertes").length, 5);
  });

  test("testerMail() : une alerte attention, l'objet le dit", () => {
    const s = creerScript();
    s.appeler("testerMail");
    assert.match(s.mails[0].sujet, /^\[Coach\] ⚠️ TEST/);
    assert.equal(s.lignes("Alertes")[0].Niveau, "attention");
  });
});

describe("parité de la table des niveaux : application et script", () => {
  const script = creerScript();
  const parDefautScript = (e) => {
    script.contexte.EV = e;
    return runInNewContext("niveauParDefaut(EV)", script.contexte);
  };

  test("même table, règle pour règle", () => {
    const tableScript = JSON.parse(JSON.stringify(runInNewContext("TABLE_NIVEAUX", script.contexte)));
    assert.deepEqual(tableScript, JSON.parse(JSON.stringify(TABLE_NIVEAUX)));
  });

  test("mêmes réponses sur des cas limites", () => {
    const cas = [
      ...["alerte_inactivite"].flatMap((type) => [0, 3, 4, 6, 7, 30, "", "7"].map((nbJours) => ({ type, nbJours }))),
      ...[0, 1, 2, 3, 5, ""].map((nbManquees) => ({ type: "alerte_seances_manquees", nbManquees })),
      { type: "alerte_poids" },
      { type: "alerte_poids", sousType: "stagnation" },
      { type: "alerte_poids", sousType: "variation" },
      ...["alerte_nutrition", "alerte_sommeil_stress", "alerte_decalages", "alerte_semaines_difficiles", "semaine_difficile", "justification", "resume_hebdo", "pointage", "activite", "inconnu"].map((type) => ({ type })),
      { type: "semaine_difficile", niveau: "critique" },
      { type: "alerte_decalages", niveau: "bidon" }
    ];
    for (const e of cas) assert.equal(parDefautScript(e), niveauAlerte(e) || "", JSON.stringify(e));
  });
});

describe("chaîne complète : téléphone → proxy → script v2.5", () => {
  test("le niveau envoyé par l'application arrive dans l'onglet Alertes", async () => {
    const SECRET = "secret-de-synchro-de-test-0123456789abcdef";
    const ADMIN = "admin-secret-de-test-0123456789-abcdef";
    const env = { COACH_SYNC_URL: "https://script.google.com/macros/s/EXEMPLE/exec", COACH_SYNC_SECRET: SECRET, ADMIN_SECRET: ADMIN, DB: fauxD1() };
    const s = creerScript({ reglages: { EXIGER_SECRET: true }, proprietes: { SECRET_SYNC: SECRET }, entetesExistants: CLASSEUR_DU_COACH });
    const fetchOrigine = globalThis.fetch;
    const logOrigine = console.log;
    console.log = () => {};
    try {
      const post = (chemin, corps, jeton) =>
        worker.fetch(new Request("https://proxy.test" + chemin, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + jeton }, body: JSON.stringify(corps) }), env).then((r) => r.json());
      const inv = await post("/admin/invitations", { libelle: "Sophie L." }, ADMIN);
      const { jeton } = await post("/auth/activer", { code: inv.code }, "");
      globalThis.fetch = async (url, init) => new Response(JSON.stringify(s.poster(init.body)), { status: 200 });
      const r = await post("/coach-sync", { type: "alerte_nutrition", niveau: "attention", message: "Protéines sous 80 % de la cible 6 jours sur 6 (moyenne 100 g pour 140)" }, jeton);
      assert.equal(r.ok, true);
    } finally {
      globalThis.fetch = fetchOrigine;
      console.log = logOrigine;
    }
    const [l] = s.lignes("Alertes");
    assert.equal(l.Client, "Sophie L.");
    assert.equal(l.Niveau, "attention");
    assert.equal(l.Statut, "nouveau");
    assert.equal(s.mails.length, 1);
    assert.match(s.mails[0].sujet, /^\[Coach\] ⚠️ Sophie L\. : nutrition hors cible$/);
  });
});
