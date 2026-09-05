/**
 * Stockage local et sauvegarde.
 *
 * Toutes les donnees du client vivent dans le navigateur : journal, poids,
 * seances, mensurations, bilans. Il n'y a pas de serveur pour rattraper une
 * perte. La sauvegarde exportee est le seul filet.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { chargerApp, creerLocalStorage } from "./harness.mjs";

describe("saveKey / loadKey — aller-retour", () => {
  test("chaque cle de STORAGE_KEYS survit a un aller-retour", async () => {
    const app = chargerApp();
    const cles = Object.values(app.STORAGE_KEYS);
    assert.ok(cles.length >= 10, "10 cles attendues au minimum, trouvees : " + cles.length);

    for (const cle of cles) {
      const valeur = { marqueur: cle, liste: [1, 2, 3], imbrique: { ok: true } };
      await app.saveKey(cle, valeur);
      const relu = await app.loadKey(cle, null);
      assert.deepEqual({ ...relu }, valeur, "aller-retour casse sur " + cle);
    }
  });

  test("cle absente : renvoie la valeur de repli", async () => {
    const app = chargerApp();
    assert.equal(await app.loadKey("cle_inexistante", "repli"), "repli");
    assert.deepEqual([...(await app.loadKey("autre_absente", []))], []);
  });

  test("contenu corrompu : renvoie le repli au lieu de planter", async () => {
    const stockage = creerLocalStorage({ coach_profile: "{ceci n'est pas du JSON" });
    const app = chargerApp({ localStorage: stockage });
    // Un fichier abime ne doit pas bloquer le demarrage de l'application.
    assert.equal(await app.loadKey("coach_profile", "repli"), "repli");
  });

  test("les types sont preserves, pas seulement les valeurs", async () => {
    const app = chargerApp();
    await app.saveKey("test_types", { nombre: 42, texte: "a", vrai: true, nul: null, tableau: [] });
    const r = await app.loadKey("test_types", null);
    assert.equal(typeof r.nombre, "number");
    assert.equal(typeof r.texte, "string");
    assert.equal(typeof r.vrai, "boolean");
    assert.equal(r.nul, null);
    assert.ok(Array.isArray(r.tableau));
  });

  test("stockage indisponible : l'application ne plante pas", async () => {
    // Navigation privee, quota plein, cookies bloques : getItem/setItem levent.
    const stockageCasse = {
      getItem: () => {
        throw new Error("acces refuse");
      },
      setItem: () => {
        throw new Error("acces refuse");
      }
    };
    const app = chargerApp({ localStorage: stockageCasse });
    await assert.doesNotReject(() => app.saveKey("coach_profile", { a: 1 }));
    assert.equal(await app.loadKey("coach_profile", "repli"), "repli");
  });
});

describe("rawListKeys — inventaire des donnees", () => {
  test("ne remonte que les cles de l'application", async () => {
    const stockage = creerLocalStorage({
      coach_profile: '{"nom":"Marien"}',
      coach_sessions: "[]",
      autre_appli_donnees: "a ignorer",
      theme: "sombre"
    });
    const app = chargerApp({ localStorage: stockage });
    const cles = await app.rawListKeys();
    assert.ok(cles.includes("coach_profile"));
    assert.ok(cles.includes("coach_sessions"));
    assert.ok(!cles.includes("autre_appli_donnees"), "cle etrangere remontee");
    assert.ok(!cles.includes("theme"));
  });
});

describe("exportAllData — la sauvegarde du client", () => {
  const donneesCompletes = {
    coach_profile: JSON.stringify({ name: "Marien", goal: "perte" }),
    coach_log_entries: JSON.stringify([{ date: "2026-09-01", calories: 500 }]),
    coach_body_logs: JSON.stringify([{ date: "2026-09-01", weightKg: 80 }]),
    coach_sessions: JSON.stringify([{ id: "s1", date: "2026-09-01" }]),
    coach_measurements: JSON.stringify([{ date: "2026-09-01", taille: 80 }]),
    coach_reports: JSON.stringify([{ weekKey: "2026-S35" }])
  };

  test("aucune donnee n'est oubliee dans la sauvegarde", async () => {
    const app = chargerApp({ localStorage: creerLocalStorage(donneesCompletes) });
    await app.exportAllData("Marien");

    const blob = app.__captures.dernierBlob;
    assert.ok(blob, "aucun fichier produit");
    const sauvegarde = JSON.parse(blob.contenu);

    for (const cle of Object.keys(donneesCompletes)) {
      assert.ok(cle in sauvegarde.data, "cle absente de la sauvegarde : " + cle);
      assert.equal(sauvegarde.data[cle], donneesCompletes[cle], "contenu altere pour " + cle);
    }
  });

  test("la sauvegarde est identifiable et datee", async () => {
    const app = chargerApp({ localStorage: creerLocalStorage(donneesCompletes) });
    await app.exportAllData("Marien");
    const sauvegarde = JSON.parse(app.__captures.dernierBlob.contenu);

    assert.equal(sauvegarde.app, "coach-neiram");
    assert.equal(sauvegarde.version, 1);
    assert.ok(sauvegarde.exportedAt, "date d'export manquante");
    assert.ok(
      !Number.isNaN(Date.parse(sauvegarde.exportedAt)),
      "date d'export illisible : " + sauvegarde.exportedAt
    );
  });

  test("le nom du fichier contient le prenom et la date", async () => {
    const app = chargerApp({ localStorage: creerLocalStorage(donneesCompletes) });
    await app.exportAllData("Marien");
    const nom = app.__captures.dernierNomFichier;
    assert.ok(nom, "nom de fichier non defini");
    assert.ok(nom.includes("marien"), "prenom absent du nom : " + nom);
    assert.ok(/\d{4}-\d{2}-\d{2}/.test(nom), "date absente du nom : " + nom);
    assert.ok(nom.endsWith(".json"));
  });

  test("une sauvegarde reimportee restitue exactement les memes cles", async () => {
    // Simule le parcours reel : export sur un telephone, import sur un autre.
    const app = chargerApp({ localStorage: creerLocalStorage(donneesCompletes) });
    await app.exportAllData("Marien");
    const sauvegarde = JSON.parse(app.__captures.dernierBlob.contenu);

    const appNeuve = chargerApp({ localStorage: creerLocalStorage() });
    for (const [cle, valeur] of Object.entries(sauvegarde.data)) {
      await appNeuve.rawSet(cle, valeur);
    }

    for (const cle of Object.keys(donneesCompletes)) {
      const original = JSON.parse(donneesCompletes[cle]);
      const restaure = await appNeuve.loadKey(cle, null);
      assert.deepEqual(
        JSON.parse(JSON.stringify(restaure)),
        original,
        "donnee perdue ou alteree apres restauration : " + cle
      );
    }
  });
});
