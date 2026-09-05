/**
 * Export et restauration d'une sauvegarde.
 *
 * C'est le seul filet du client : il n'existe aucune copie serveur de ses
 * donnees, son telephone est la seule source. Un export qui echoue en
 * silence, ou une restauration qui ecrase les donnees a partir du mauvais
 * fichier, sont les deux pannes qu'on ne peut pas rattraper.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { creerLocalStorage } from "./harness.mjs";
import { exporterSauvegarde, nomFichierSauvegarde, slugNom } from "../app/src/lib/sauvegarde.js";
import { construireSauvegarde, enregistrer, restaurerSauvegarde } from "../app/src/lib/stockage.js";

beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

/** Navigateur simule : partage natif disponible ou non. */
function navigateurSimule({ partageDispo = false, echec = null } = {}) {
  const appels = { partages: 0, telechargements: [] };
  const nav = {
    canShare: partageDispo ? () => true : undefined,
    share: async () => {
      appels.partages++;
      if (echec) throw echec;
    }
  };
  const doc = {
    body: { appendChild() {} },
    createElement: () => ({
      set download(v) {
        appels.telechargements.push(v);
      },
      get download() {
        return appels.telechargements[appels.telechargements.length - 1];
      },
      click() {},
      remove() {}
    })
  };
  const url = { createObjectURL: () => "blob:test", revokeObjectURL() {} };
  return { env: { navigator: nav, document: doc, URL: url }, appels };
}

describe("nom du fichier", () => {
  test("il porte le prenom du client et la date", () => {
    assert.equal(
      nomFichierSauvegarde("Marien Pélissier", "2026-09-05"),
      "sauvegarde-coach-neiram-marien-pelissier-2026-09-05.json"
    );
  });

  test("les accents et les caracteres speciaux sont neutralises", () => {
    // Un nom de fichier avec des accents se transforme en charabia selon
    // le systeme qui le recoit.
    assert.equal(slugNom("Zoé O'Brien"), "zoe-o-brien");
    assert.equal(slugNom("  Élise  "), "elise");
  });

  test("sans prenom, le fichier reste nommable", () => {
    assert.equal(slugNom(""), "client");
    assert.equal(slugNom(null), "client");
    assert.equal(slugNom("!!!"), "client");
  });
});

describe("livraison de la sauvegarde", () => {
  test("le partage natif est prefere quand il existe", () => {
    // Sur iPhone, le dossier Telechargements est difficile a retrouver :
    // le partage permet d'envoyer directement dans Drive ou un mail.
    const { env, appels } = navigateurSimule({ partageDispo: true });
    return exporterSauvegarde({ app: "coach-neiram", data: {} }, "Marien", env).then((r) => {
      assert.equal(r, "shared");
      assert.equal(appels.partages, 1);
      assert.equal(appels.telechargements.length, 0);
    });
  });

  test("sans partage natif, le fichier est telecharge", async () => {
    const { env, appels } = navigateurSimule({ partageDispo: false });
    const r = await exporterSauvegarde({ app: "coach-neiram", data: {} }, "Marien", env);
    assert.equal(r, "downloaded");
    assert.match(appels.telechargements[0], /^sauvegarde-coach-neiram-marien-/);
  });

  test("un partage annule n'est pas une panne", async () => {
    // Le client a change d'avis. Lui afficher un message d'echec serait
    // faux et l'inquieterait pour rien.
    const abort = Object.assign(new Error("annulé"), { name: "AbortError" });
    const { env } = navigateurSimule({ partageDispo: true, echec: abort });
    assert.equal(await exporterSauvegarde({ app: "coach-neiram", data: {} }, "Marien", env), "cancelled");
  });

  test("un partage en echec bascule sur le telechargement", async () => {
    // Plutot que de laisser le client sans sauvegarde.
    const { env, appels } = navigateurSimule({ partageDispo: true, echec: new Error("panne") });
    assert.equal(await exporterSauvegarde({ app: "coach-neiram", data: {} }, "Marien", env), "downloaded");
    assert.equal(appels.telechargements.length, 1);
  });
});

describe("aller-retour complet", () => {
  test("les donnees survivent a un export puis une restauration", () => {
    enregistrer("coach_profile", { name: "Marien", age: 34 });
    enregistrer("coach_sessions", [{ id: "s1", date: "2026-09-05" }]);

    const sauvegarde = construireSauvegarde();

    globalThis.localStorage = creerLocalStorage(); // nouvel appareil
    const nombre = restaurerSauvegarde(sauvegarde);

    assert.equal(nombre, 2);
    assert.equal(JSON.parse(localStorage.getItem("coach_profile")).name, "Marien");
    assert.equal(JSON.parse(localStorage.getItem("coach_sessions"))[0].id, "s1");
  });
});

describe("la restauration refuse ce qui n'est pas une sauvegarde", () => {
  test("un fichier d'une autre application est rejete", () => {
    assert.throws(() => restaurerSauvegarde({ app: "autre-appli", data: { coach_profile: "{}" } }));
  });

  test("un fichier sans donnees reconnues est rejete", () => {
    // « 0 element restaure » laisserait croire que ca a marche.
    assert.throws(
      () => restaurerSauvegarde({ app: "coach-neiram", data: { autre_cle: "valeur" } }),
      /sauvegarde-vide/
    );
  });

  test("seules les cles de l'application sont ecrites", () => {
    /*
     * Sans ce filtre, un fichier trafique pourrait ecrire n'importe quelle
     * cle dans le stockage du navigateur. Le filtre existait dans
     * l'application d'origine et manquait dans le portage.
     */
    restaurerSauvegarde({
      app: "coach-neiram",
      data: { coach_profile: '{"name":"Marien"}', cle_etrangere: "charge-utile" }
    });
    assert.equal(localStorage.getItem("coach_profile"), '{"name":"Marien"}');
    assert.equal(localStorage.getItem("cle_etrangere"), null, "une clé étrangère a été écrite");
  });

  test("un contenu illisible est rejete proprement", () => {
    for (const mauvais of [null, undefined, {}, { app: "coach-neiram" }, { app: "coach-neiram", data: "texte" }]) {
      assert.throws(() => restaurerSauvegarde(mauvais), JSON.stringify(mauvais));
    }
  });
});
