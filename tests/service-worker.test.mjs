/**
 * Service worker : regles d'interception.
 *
 * Le risque principal n'est pas qu'il cache trop peu, mais qu'il intercepte
 * ce qu'il ne devrait pas. Une reponse de suivi servie depuis un cache, ou un
 * pointage avale par le service worker, seraient des pannes invisibles.
 *
 * Ces tests verrouillent donc surtout ce qui doit passer AU RESEAU sans
 * interception.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ICI = dirname(fileURLToPath(import.meta.url));
const SW = join(ICI, "..", "sw.js");

/** Evalue sw.js avec un environnement de service worker minimal. */
function chargerServiceWorker() {
  const ecouteurs = {};
  const bacASable = {
    console,
    URL,
    Promise,
    self: null,
    caches: {
      open: async () => ({ add: async () => {}, put: async () => {}, match: async () => null }),
      keys: async () => [],
      delete: async () => true,
      match: async () => null
    },
    fetch: async () => ({ ok: true, clone: () => ({}) }),
    location: { origin: "https://coachneiram.github.io" }
  };
  bacASable.self = bacASable;
  bacASable.addEventListener = (nom, fn) => {
    ecouteurs[nom] = fn;
  };
  bacASable.skipWaiting = () => {};
  bacASable.clients = { claim: async () => {} };
  bacASable.registration = { unregister: async () => {} };

  vm.createContext(bacASable);
  vm.runInContext(readFileSync(SW, "utf8"), bacASable, { filename: "sw.js" });
  return { ...bacASable.__SW_TEST__, ecouteurs, bacASable };
}

const sw = chargerServiceWorker();
const source = readFileSync(SW, "utf8");
const APP = "https://coachneiram.github.io";

const strategie = (url, options = {}) =>
  sw.strategiePour({
    method: options.method || "GET",
    url,
    mode: options.mode,
    origineApp: APP
  });

describe("ce qui ne doit JAMAIS etre intercepte", () => {
  test("les envois de pointage vers le proxy", () => {
    assert.equal(
      strategie("https://coach-neiram-proxy.pelissier-marien.workers.dev/coach-sync", {
        method: "POST"
      }),
      "ignorer"
    );
  });

  test("les appels IA vers le proxy", () => {
    assert.equal(
      strategie("https://coach-neiram-proxy.pelissier-marien.workers.dev/ai", { method: "POST" }),
      "ignorer"
    );
  });

  test("meme en lecture, le proxy n'est pas mis en cache", () => {
    assert.equal(
      strategie("https://coach-neiram-proxy.pelissier-marien.workers.dev/ai"),
      "ignorer",
      "une reponse IA servie depuis un cache serait trompeuse"
    );
  });

  test("Gemini en direct (voie de repli)", () => {
    assert.equal(
      strategie("https://generativelanguage.googleapis.com/v1beta/models/x:generateContent", {
        method: "POST"
      }),
      "ignorer"
    );
  });

  test("le script coach", () => {
    assert.equal(strategie("https://script.google.com/macros/s/ABC/exec", { method: "POST" }), "ignorer");
  });

  test("Open Food Facts : les valeurs nutritionnelles doivent rester fraiches", () => {
    assert.equal(strategie("https://world.openfoodfacts.org/api/v2/product/123.json"), "ignorer");
  });

  test("aucune requete non-GET, quelle que soit la destination", () => {
    for (const methode of ["POST", "PUT", "DELETE", "PATCH"]) {
      assert.equal(strategie(APP + "/index.html", { method: methode }), "ignorer", methode);
    }
  });

  test("une url invalide ne fait pas planter le service worker", () => {
    assert.equal(strategie("pas une url"), "ignorer");
  });
});

describe("la page elle-meme : le reseau prime", () => {
  test("une navigation passe par le reseau d'abord", () => {
    assert.equal(strategie(APP + "/", { mode: "navigate" }), "reseau-d-abord");
  });

  test("index.html passe par le reseau d'abord", () => {
    assert.equal(strategie(APP + "/index.html"), "reseau-d-abord");
  });

  test("c'est ce qui garantit qu'un correctif atteint le client", () => {
    // Regle de conception : jamais de cache d'abord sur le document.
    // Sans cela, un client pourrait rester bloque sur une version cassee.
    assert.notEqual(strategie(APP + "/index.html"), "cache-d-abord");
    assert.notEqual(strategie(APP + "/", { mode: "navigate" }), "cache-d-abord");
  });
});

describe("les fichiers de l'application", () => {
  test("les catalogues alimentaires sont revalides en arriere-plan", () => {
    assert.equal(strategie(APP + "/food-basic-catalog.js"), "revalidation");
    assert.equal(strategie(APP + "/food-extended-catalog.js"), "revalidation");
    assert.equal(strategie(APP + "/food-staples-catalog.js"), "revalidation");
  });

  test("les icones et le manifeste aussi", () => {
    assert.equal(strategie(APP + "/icon-192.png"), "revalidation");
    assert.equal(strategie(APP + "/manifest.json"), "revalidation");
  });
});

describe("ressources externes necessaires au demarrage", () => {
  test("React n'est plus charge depuis un CDN", () => {
    // Il est desormais inclus dans le fichier construit : l'application ne
    // depend plus de la disponibilite de cdnjs pour s'afficher.
    assert.equal(
      strategie("https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"),
      "ignorer"
    );
  });

  test("les polices aussi", () => {
    assert.equal(strategie("https://fonts.googleapis.com/css2?family=Poppins"), "cache-d-abord");
    assert.equal(strategie("https://fonts.gstatic.com/s/poppins/x.woff2"), "cache-d-abord");
  });

  test("fonts.googleapis.com est autorise, generativelanguage.googleapis.com non", () => {
    // Piege classique : une comparaison approximative sur « googleapis.com »
    // mettrait les reponses de Gemini en cache.
    assert.equal(strategie("https://fonts.googleapis.com/css2?family=Inter"), "cache-d-abord");
    assert.equal(strategie("https://generativelanguage.googleapis.com/v1beta/x"), "ignorer");
  });

  test("un domaine ressemblant n'est pas autorise", () => {
    // Piege classique : une comparaison approximative mettrait en cache la
    // reponse d'un domaine controle par un tiers.
    assert.equal(strategie("https://fonts.googleapis.com.attaquant.test/x.css"), "ignorer");
    assert.equal(strategie("https://evil-fonts.googleapis.com/x.css"), "ignorer");
    assert.equal(strategie("https://fonts.gstatic.com.attaquant.test/x.woff2"), "ignorer");
  });
});

describe("liste des ressources et versionnage", () => {
  test("tout ce qui est indispensable au demarrage est precache", () => {
    for (const attendu of [
      "./index.html",
      "./food-basic-catalog.js",
      "./food-extended-catalog.js",
      "./food-staples-catalog.js",
      "./manifest.json"
    ]) {
      assert.ok(
        sw.RESSOURCES_LOCALES.includes(attendu),
        "ressource absente du precache : " + attendu
      );
    }
  });

  test("les chemins sont relatifs : l'app vit dans un sous-dossier", () => {
    for (const r of sw.RESSOURCES_LOCALES) {
      assert.ok(r.startsWith("./"), "chemin non relatif : " + r);
    }
  });

  /**
   * LE POINT LE PLUS FRAGILE DE LA BASCULE.
   *
   * Le code de l'application porte une empreinte qui change a chaque
   * construction (assets/index-CnbfxMEa.js). Il ne peut donc PAS figurer
   * dans une liste ecrite a la main. La construction produit
   * assets-manifest.json, et le service worker le lit a l'installation.
   *
   * Sans ce mecanisme, le precache ne contiendrait pas le code de
   * l'application : le premier lancement hors ligne afficherait une page
   * blanche. Aucune erreur, aucun message — la panne exacte que le mode
   * hors ligne est cense empecher.
   */
  test("le service worker lit le manifeste de construction", () => {
    assert.ok(sw.MANIFESTE_ASSETS, "aucun manifeste declare");
    assert.equal(typeof sw.assetsDuManifeste, "function");
    assert.ok(
      source.includes("RESSOURCES_LOCALES.concat(assets)"),
      "les fichiers du manifeste ne sont pas ajoutes au precache"
    );
  });

  test("un manifeste illisible n'empeche pas l'installation", async () => {
    // Mieux vaut un mode hors ligne degrade qu'un service worker qui refuse
    // de s'installer : l'application resterait alors inutilisable en ligne
    // comme hors ligne.
    const vraiFetch = sw.bacASable.fetch;
    try {
      for (const reponse of [
        () => Promise.reject(new Error("hors ligne")),
        () => Promise.resolve({ ok: false }),
        () => Promise.resolve({ ok: true, json: () => Promise.resolve(null) }),
        () => Promise.resolve({ ok: true, json: () => Promise.resolve({ pas: "un tableau" }) }),
        () => Promise.resolve({ ok: true, json: () => Promise.reject(new Error("json")) })
      ]) {
        sw.bacASable.fetch = reponse;
        assert.deepEqual(Array.from(await sw.assetsDuManifeste()), []);
      }

      // Une entree qui n'est pas une chaine ne doit pas finir dans cache.add.
      sw.bacASable.fetch = () =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(["./a.js", 42, null, "./b.css"]) });
      assert.deepEqual(Array.from(await sw.assetsDuManifeste()), ["./a.js", "./b.css"]);
    } finally {
      sw.bacASable.fetch = vraiFetch;
    }
  });

  test("le manifeste est demande sans passer par le cache HTTP", () => {
    // Un manifeste servi depuis le cache du navigateur listerait les
    // fichiers de la version precedente, qui n'existent plus.
    assert.match(source, /MANIFESTE_ASSETS,\s*\{\s*cache:\s*"no-cache"\s*\}/);
  });

  test("le nom du cache porte la version, pour permettre le nettoyage", () => {
    assert.ok(sw.CACHE.includes(sw.VERSION), "cache : " + sw.CACHE + ", version : " + sw.VERSION);
    assert.ok(sw.CACHE.startsWith("coach-neiram-"));
  });

  test("les trois evenements du cycle de vie sont branches", () => {
    for (const e of ["install", "activate", "fetch"]) {
      assert.equal(typeof sw.ecouteurs[e], "function", "ecouteur manquant : " + e);
    }
  });
});
