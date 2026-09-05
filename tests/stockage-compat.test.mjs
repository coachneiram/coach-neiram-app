/**
 * Compatibilite des donnees entre l'ancienne et la nouvelle version.
 *
 * C'est le test le plus important de la migration. Tout le suivi des clients
 * vit dans le localStorage de leur navigateur, sans aucune copie serveur. Si
 * la nouvelle version lisait d'autres cles, ou un autre format, la bascule
 * effacerait des mois d'historique — sans message d'erreur, et sans retour
 * possible.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { chargerApp, creerLocalStorage } from "./harness.mjs";
import * as stockage from "../app/src/lib/stockage.js";

const ancien = chargerApp();

/** Installe un localStorage simule accessible aux deux implementations. */
function installerStockage(initial = {}) {
  const faux = creerLocalStorage(initial);
  globalThis.localStorage = faux;
  return faux;
}

describe("les noms de cles sont identiques", () => {
  test("les 10 cles de STORAGE_KEYS concordent, une par une", () => {
    const anciennes = JSON.parse(JSON.stringify(ancien.STORAGE_KEYS));
    assert.deepEqual(
      stockage.STORAGE_KEYS,
      anciennes,
      "un nom de cle a change : les donnees des clients seraient perdues"
    );
  });

  test("aucune cle n'a ete oubliee au passage", () => {
    const anciennes = Object.values(JSON.parse(JSON.stringify(ancien.STORAGE_KEYS)));
    const nouvelles = Object.values(stockage.STORAGE_KEYS);
    for (const cle of anciennes) {
      assert.ok(nouvelles.includes(cle), "cle perdue dans la nouvelle version : " + cle);
    }
  });

  /**
   * Les cles hors prefixe coach_ sont les plus dangereuses : elles
   * n'apparaissent dans AUCUN export, donc une faute de frappe ne se
   * rattrape pas depuis une sauvegarde. Le client perd ses justifications
   * de creneaux, ses semaines maintien ou son plan de la semaine, en
   * silence, et rien ne le signale.
   *
   * Cette table a d'ailleurs deja pris une faute : j'avais ecrit
   * « cn_week_plan » la ou l'application utilise « cn_weekly_plan ».
   */
  test("chaque cle annexe porte exactement le nom d'index.html", () => {
    const attendues = {
      outboxCoach: ancien.COACH_OUTBOX_KEY,
      raisonsCreneaux: ancien.SLOT_REASON_KEY,
      semainesDifficiles: ancien.HARD_WEEK_KEY,
      planSemaine: ancien.WEEK_PLAN_KEY,
      maxisForce: ancien.PL_1RM_KEY
    };
    for (const [nom, attendue] of Object.entries(attendues)) {
      assert.ok(attendue, `${nom} : cle introuvable dans index.html`);
      assert.equal(stockage.CLES_ANNEXES[nom], attendue, `cle annexe « ${nom} »`);
    }
  });

  test("aucune cle annexe ne porte le prefixe des sauvegardes", () => {
    // Une cle en coach_ partirait dans les exports et reviendrait dans les
    // restaurations : ce ne sont pas des donnees de suivi.
    for (const [nom, cle] of Object.entries(stockage.CLES_ANNEXES)) {
      assert.ok(!cle.startsWith(stockage.PREFIXE), `${nom} (${cle}) serait exportee a tort`);
    }
  });

  test("le prefixe d'inventaire est le meme", () => {
    // rawListKeys de l'ancienne version filtre sur « coach_ ».
    assert.equal(stockage.PREFIXE, "coach_");
  });
});

describe("le format des donnees est interchangeable", () => {
  beforeEach(() => installerStockage());

  test("ce que l'ancienne version ecrit, la nouvelle le relit", async () => {
    const app = chargerApp({ localStorage: globalThis.localStorage });
    const donnees = {
      profil: { name: "Marien", goal: "perte", startWeightKg: 80 },
      journal: [{ date: "2026-09-01", calories: 500, protein: 30 }],
      seances: [{ id: "s1", exercices: [{ nom: "squat", series: 4 }] }]
    };

    await app.saveKey(app.STORAGE_KEYS.profile, donnees.profil);
    await app.saveKey(app.STORAGE_KEYS.logEntries, donnees.journal);
    await app.saveKey(app.STORAGE_KEYS.sessions, donnees.seances);

    assert.deepEqual(stockage.charger(stockage.STORAGE_KEYS.profile, null), donnees.profil);
    assert.deepEqual(stockage.charger(stockage.STORAGE_KEYS.logEntries, null), donnees.journal);
    assert.deepEqual(stockage.charger(stockage.STORAGE_KEYS.sessions, null), donnees.seances);
  });

  test("ce que la nouvelle version ecrit, l'ancienne le relit", async () => {
    const app = chargerApp({ localStorage: globalThis.localStorage });
    const mensurations = [{ date: "2026-09-01", taille: 80, poitrine: 100 }];

    stockage.enregistrer(stockage.STORAGE_KEYS.measurements, mensurations);

    const relu = await app.loadKey(app.STORAGE_KEYS.measurements, null);
    assert.deepEqual(JSON.parse(JSON.stringify(relu)), mensurations);
  });

  test("un aller-retour croise ne perd ni type ni valeur", async () => {
    const app = chargerApp({ localStorage: globalThis.localStorage });
    const complexe = {
      nombre: 42.5,
      texte: "accentué : é à ü",
      vrai: true,
      nul: null,
      tableau: [1, "deux", { trois: 3 }],
      imbrique: { a: { b: { c: "profond" } } }
    };

    await app.saveKey("coach_test_croise", complexe);
    const parLeNeuf = stockage.charger("coach_test_croise", null);
    assert.deepEqual(parLeNeuf, complexe);

    stockage.enregistrer("coach_test_croise_2", complexe);
    const parLAncien = await app.loadKey("coach_test_croise_2", null);
    assert.deepEqual(JSON.parse(JSON.stringify(parLAncien)), complexe);
  });
});

describe("sauvegarde et restauration", () => {
  const donneesClient = {
    coach_profile: JSON.stringify({ name: "Marien" }),
    coach_log_entries: JSON.stringify([{ date: "2026-09-01", calories: 500 }]),
    coach_sessions: JSON.stringify([{ id: "s1" }]),
    autre_appli: "a ignorer"
  };

  test("la sauvegarde produite a le meme format que l'ancienne", async () => {
    installerStockage(donneesClient);
    const app = chargerApp({ localStorage: globalThis.localStorage });
    await app.exportAllData("Marien");
    const parLAncien = JSON.parse(app.__captures.dernierBlob.contenu);

    const parLeNeuf = stockage.construireSauvegarde();

    assert.equal(parLeNeuf.app, parLAncien.app);
    assert.equal(parLeNeuf.version, parLAncien.version);
    assert.deepEqual(
      Object.keys(parLeNeuf.data).sort(),
      Object.keys(parLAncien.data).sort(),
      "les deux versions ne sauvegardent pas les memes cles"
    );
    assert.deepEqual(parLeNeuf.data, parLAncien.data);
  });

  test("les donnees etrangeres a l'application ne sont pas emportees", () => {
    installerStockage(donneesClient);
    const sauvegarde = stockage.construireSauvegarde();
    assert.ok(!("autre_appli" in sauvegarde.data));
  });

  test("une sauvegarde faite par l'ancienne version est restaurable par la nouvelle", async () => {
    installerStockage(donneesClient);
    const app = chargerApp({ localStorage: globalThis.localStorage });
    await app.exportAllData("Marien");
    const sauvegarde = JSON.parse(app.__captures.dernierBlob.contenu);

    installerStockage(); // appareil neuf
    const ecrites = stockage.restaurerSauvegarde(sauvegarde);

    assert.ok(ecrites >= 3, "seulement " + ecrites + " cles restaurees");
    assert.deepEqual(stockage.charger("coach_profile", null), { name: "Marien" });
    assert.deepEqual(stockage.charger("coach_log_entries", null), [
      { date: "2026-09-01", calories: 500 }
    ]);
  });

  test("un fichier etranger est refuse plutot que d'ecraser le suivi", () => {
    installerStockage(donneesClient);
    assert.throws(() => stockage.restaurerSauvegarde({ app: "autre-chose", data: {} }));
    assert.throws(() => stockage.restaurerSauvegarde(null));
    assert.throws(() => stockage.restaurerSauvegarde({ app: "coach-neiram" }));
    // Le suivi existant est intact.
    assert.deepEqual(stockage.charger("coach_profile", null), { name: "Marien" });
  });
});

describe("robustesse", () => {
  test("donnee corrompue : on repart du repli sans planter", () => {
    installerStockage({ coach_profile: "{ceci n'est pas du JSON" });
    assert.equal(stockage.charger("coach_profile", "repli"), "repli");
  });

  test("stockage indisponible : aucune exception ne remonte", () => {
    globalThis.localStorage = {
      getItem: () => {
        throw new Error("acces refuse");
      },
      setItem: () => {
        throw new Error("acces refuse");
      }
    };
    assert.equal(stockage.charger("coach_profile", "repli"), "repli");
    assert.equal(stockage.enregistrer("coach_profile", { a: 1 }), false);
    assert.deepEqual(stockage.listerCles(), []);
  });
});
