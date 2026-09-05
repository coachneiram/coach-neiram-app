/**
 * Ecritures qui echouent, et sauvegarde complete.
 *
 * DEUX SIGNALEMENTS CLIENTS A L'ORIGINE DE CE FICHIER.
 *
 * « On ne peut meme plus enregistrer de repas. Ca ne fonctionne plus. »
 * Le stockage du navigateur est la SEULE copie des donnees : il n'existe
 * aucune sauvegarde serveur. Une ecriture qui echoue en silence est donc
 * la pire panne possible — le client continue de saisir pendant des jours,
 * tout semble normal, et rien n'est conserve.
 *
 * « J'avais mis du temps a tout faire avec tous mes codes-barres a
 * photographier et a exporter. » L'export ne prenait que les cles
 * « coach_ », alors que l'ecran annonce « le fichier contient tout ton
 * suivi ». Ses repas types et ses favoris, ranges sous « cn_ », n'y
 * etaient pas.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as stockage from "../app/src/lib/stockage.js";

/** localStorage simule, avec un plafond de taille reglable. */
function installerStockage({ plafondOctets = Infinity } = {}) {
  const donnees = new Map();
  const taille = () => [...donnees].reduce((a, [k, v]) => a + k.length + v.length, 0);

  globalThis.localStorage = {
    getItem: (k) => (donnees.has(k) ? donnees.get(k) : null),
    setItem: (k, v) => {
      const futur = taille() - (donnees.get(k) || "").length + String(v).length;
      if (futur > plafondOctets) {
        const e = new Error("quota");
        e.name = "QuotaExceededError";
        throw e;
      }
      donnees.set(k, String(v));
    },
    removeItem: (k) => donnees.delete(k),
    key: (i) => [...donnees.keys()][i],
    get length() {
      return donnees.size;
    }
  };
  // Object.keys(localStorage) doit rendre les cles, comme dans un navigateur.
  globalThis.localStorage = new Proxy(globalThis.localStorage, {
    ownKeys: () => [...donnees.keys()],
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true })
  });
  return donnees;
}

describe("une ecriture qui echoue est signalee", () => {
  beforeEach(() => installerStockage());

  test("un echec previent les abonnes", () => {
    const vus = [];
    const desabonner = stockage.surEchecEcriture((info) => vus.push(info));

    installerStockage({ plafondOctets: 10 });
    stockage.enregistrer("coach_profile", { nom: "une valeur bien trop longue pour le plafond" });

    assert.equal(vus.length, 1, "aucun abonne prevenu");
    assert.equal(vus[0].quota, true, "le depassement de quota doit etre reconnu");
    assert.equal(vus[0].cle, "coach_profile");
    desabonner();
  });

  test("une ecriture qui reussit ne previent personne", () => {
    const vus = [];
    const desabonner = stockage.surEchecEcriture((info) => vus.push(info));
    stockage.enregistrer("coach_profile", { nom: "Sabine" });
    assert.deepEqual(vus, []);
    desabonner();
  });

  test("un abonne fautif n'empeche pas les autres d'etre prevenus", () => {
    const vus = [];
    const d1 = stockage.surEchecEcriture(() => {
      throw new Error("abonne casse");
    });
    const d2 = stockage.surEchecEcriture(() => vus.push(1));

    installerStockage({ plafondOctets: 5 });
    stockage.enregistrer("coach_profile", { x: "trop long" });

    assert.equal(vus.length, 1, "le second abonne n'a pas ete prevenu");
    d1();
    d2();
  });

  test("le desabonnement fonctionne", () => {
    const vus = [];
    stockage.surEchecEcriture((i) => vus.push(i))();
    installerStockage({ plafondOctets: 5 });
    stockage.enregistrer("coach_profile", { x: "trop long" });
    assert.deepEqual(vus, []);
  });
});

describe("la sauvegarde contient tout ce que le client a saisi", () => {
  beforeEach(() => {
    installerStockage();
    localStorage.setItem("coach_log_entries", '[{"a":1}]');
    localStorage.setItem("coach_photos_2026-W01", '"data:image/jpeg;base64,AAAA"');
    localStorage.setItem("cn_meal_presets", '[{"nom":"Petit-dej"}]');
    localStorage.setItem("cn_food_favorites", '[{"code":"123"}]');
    localStorage.setItem("cn_custom_exercises", '[{"name":"Rowing"}]');
    localStorage.setItem("cn_weekly_plan", '{"mon":"r1"}');
    localStorage.setItem("autre_appli", '"a ne pas toucher"');
  });

  test("les repas types et les favoris code-barres y sont", () => {
    // C'est precisement ce qui manquait : la cliente avait scanne ses
    // codes-barres et exporte, en croyant son travail a l'abri.
    const data = stockage.construireSauvegarde().data;
    for (const cle of ["cn_meal_presets", "cn_food_favorites", "cn_custom_exercises", "cn_weekly_plan"]) {
      assert.ok(data[cle], "absent de la sauvegarde : " + cle);
    }
  });

  test("les donnees historiques y sont toujours", () => {
    const data = stockage.construireSauvegarde().data;
    assert.ok(data.coach_log_entries);
    assert.ok(data["coach_photos_2026-W01"]);
  });

  test("les cles d'autres applications ne sont pas emportees", () => {
    assert.equal(stockage.construireSauvegarde().data.autre_appli, undefined);
  });

  test("la restauration remet les deux prefixes", () => {
    const sauvegarde = stockage.construireSauvegarde();
    installerStockage();
    const ecrites = stockage.restaurerSauvegarde(sauvegarde);
    assert.ok(ecrites >= 6, "seulement " + ecrites + " cles restaurees");
    assert.equal(localStorage.getItem("cn_meal_presets"), '[{"nom":"Petit-dej"}]');
  });

  test("la restauration refuse toujours les cles etrangeres", () => {
    // Elargir aux deux prefixes ne doit pas rouvrir la faille : un fichier
    // trafique ne doit pas pouvoir ecrire n'importe quelle cle.
    const ecrites = stockage.restaurerSauvegarde({
      app: "coach-neiram",
      data: { cn_meal_presets: "[]", token_bancaire: '"vole"', __proto__x: '"x"' }
    });
    assert.equal(ecrites, 1);
    assert.equal(localStorage.getItem("token_bancaire"), null);
  });
});

describe("occupation du stockage", () => {
  beforeEach(() => {
    installerStockage();
    localStorage.setItem("coach_photos_2026-W01", "x".repeat(5000));
    localStorage.setItem("coach_photos_2026-W02", "x".repeat(3000));
    localStorage.setItem("coach_log_entries", "y".repeat(100));
  });

  test("les plus lourdes cles viennent en premier", () => {
    const { entrees, total } = stockage.occupationStockage();
    assert.equal(entrees[0].cle, "coach_photos_2026-W01");
    assert.ok(total > 16000, "total : " + total);
  });

  test("les photos sont reconnues comme telles", () => {
    assert.equal(stockage.estCleDePhoto("coach_photos_2026-W01"), true);
    assert.equal(stockage.estCleDePhoto("coach_log_entries"), false);
    assert.equal(stockage.estCleDePhoto("cn_meal_presets"), false);
  });

  test("supprimer les photos libere de la place sans toucher au suivi", () => {
    const liberes = stockage.supprimerPhotos();
    assert.ok(liberes > 15000, "octets liberes : " + liberes);
    assert.equal(localStorage.getItem("coach_photos_2026-W01"), null);
    // Le journal, lui, ne doit surtout pas partir.
    assert.ok(localStorage.getItem("coach_log_entries"));
  });
});
