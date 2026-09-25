/**
 * Sauvetage des installations faites depuis l'ancienne adresse.
 *
 * Une copie de l'application a ete publiee par erreur a /coachneiramapublier/
 * (supprimee par le commit fafcd65). Les clientes qui l'avaient installee
 * gardaient un service worker rattache a cette adresse, qui leur servait
 * l'ancienne application depuis son cache, pour toujours : la 404 de sw.js
 * empechait toute mise a jour. Signale deux fois sur Android (pas de crayon
 * pour corriger un aliment, pas de bouton « Photographier »).
 *
 * Ces tests verrouillent ce qui rend le sauvetage effectif, et ce qui le
 * rendrait silencieusement inoperant.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ICI = dirname(fileURLToPath(import.meta.url));
const DOSSIER = join(ICI, "..", "app", "public", "coachneiramapublier");
const SW = join(DOSSIER, "sw.js");
const PAGE = join(DOSSIER, "index.html");

const PORTEE = "https://coachneiram.github.io/coach-neiram-app/coachneiramapublier/";

/** Evalue le service worker de sauvetage dans un environnement simule, en journalisant chaque appel. */
function chargerSauvetage({ caches: nomsCaches = [], fenetres = 1, fenetreQuiRefuse = false } = {}) {
  const journal = [];
  const ecouteurs = {};
  const bac = {
    console,
    URL,
    Promise,
    caches: {
      keys: async () => [...nomsCaches],
      delete: async (nom) => {
        journal.push(`supprime:${nom}`);
        return true;
      }
    }
  };
  bac.self = bac;
  bac.addEventListener = (nom, fn) => {
    ecouteurs[nom] = fn;
  };
  bac.skipWaiting = () => journal.push("skipWaiting");
  bac.registration = {
    scope: PORTEE,
    unregister: async () => {
      journal.push("desinstalle");
      return true;
    }
  };
  bac.clients = {
    claim: async () => {
      journal.push("prend-le-controle");
    },
    matchAll: async (options) => {
      journal.push(`liste:${JSON.stringify(options)}`);
      return Array.from({ length: fenetres }, (_, i) => ({
        navigate: async (url) => {
          if (fenetreQuiRefuse && i === 0) throw new TypeError("fenetre fermee");
          journal.push(`redirige:${url}`);
        }
      }));
    }
  };

  vm.createContext(bac);
  vm.runInContext(readFileSync(SW, "utf8"), bac, { filename: "coachneiramapublier/sw.js" });

  const activer = async () => {
    let attente;
    ecouteurs.activate({ waitUntil: (p) => (attente = p) });
    await attente;
  };
  return { journal, ecouteurs, activer };
}

describe("le sauvetage est publie a l'ancienne adresse exacte", () => {
  test("le service worker et la page existent dans app/public/coachneiramapublier/", () => {
    // Le nom du dossier n'est pas un choix : c'est l'adresse ou la copie a
    // ete publiee, et ou le navigateur des clientes va chercher sw.js. Un
    // seul caractere de difference, et le sauvetage n'atteint personne.
    assert.ok(existsSync(SW), "sw.js de sauvetage absent : les installations anciennes restent figées");
    assert.ok(existsSync(PAGE), "page de redirection absente");
  });
});

describe("le service worker de sauvetage", () => {
  test("s'installe sans attendre la fermeture des fenetres", () => {
    const { journal, ecouteurs } = chargerSauvetage();
    ecouteurs.install({});
    assert.deepEqual(journal, ["skipWaiting"]);
  });

  test("n'intercepte aucune requete : l'ancien cache ne peut plus rien servir", () => {
    const { ecouteurs } = chargerSauvetage();
    assert.equal(ecouteurs.fetch, undefined, "un écouteur fetch pourrait encore servir l'ancienne version");
  });

  test("vide les caches de l'application, et eux seuls", async () => {
    const { journal, activer } = chargerSauvetage({
      caches: ["coach-neiram-v1", "coach-neiram-v3", "cache-d-un-autre-site"]
    });
    await activer();
    const supprimes = journal.filter((l) => l.startsWith("supprime:"));
    assert.deepEqual(supprimes.sort(), ["supprime:coach-neiram-v1", "supprime:coach-neiram-v3"]);
  });

  test("se desinstalle", async () => {
    const { journal, activer } = chargerSauvetage();
    await activer();
    assert.ok(journal.includes("desinstalle"), "le service worker resterait installé à l'ancienne adresse");
  });

  test("renvoie chaque fenetre vers la vraie application, un dossier plus haut", async () => {
    const { journal, activer } = chargerSauvetage({ fenetres: 2 });
    await activer();
    const redirections = journal.filter((l) => l.startsWith("redirige:"));
    assert.deepEqual(redirections, [
      "redirige:https://coachneiram.github.io/coach-neiram-app/",
      "redirige:https://coachneiram.github.io/coach-neiram-app/"
    ]);
  });

  test("prend le controle AVANT de rediriger", async () => {
    // navigate() ne fonctionne que sur une fenetre que CE service worker
    // controle. Les fenetres de l'ancien lui reviennent d'office (meme
    // inscription) — la fumee navigateur le confirme : elle passe meme
    // sans claim(). Mais une fenetre que l'ancien ne controlait PAS (page
    // chargee pendant qu'il ne repondait plus) n'est rattachee que par
    // claim() : appele apres navigate(), il arriverait trop tard pour elle.
    const { journal, activer } = chargerSauvetage();
    await activer();
    const controle = journal.indexOf("prend-le-controle");
    const redirection = journal.findIndex((l) => l.startsWith("redirige:"));
    assert.ok(controle !== -1, "aucune prise de contrôle");
    assert.ok(redirection !== -1, "aucune redirection");
    assert.ok(controle < redirection, "la redirection précède la prise de contrôle : elle échouerait");
  });

  test("liste aussi les fenetres qu'il ne controle pas encore", async () => {
    const { journal, activer } = chargerSauvetage();
    await activer();
    const liste = journal.find((l) => l.startsWith("liste:"));
    assert.match(liste, /"includeUncontrolled":true/);
    assert.match(liste, /"type":"window"/);
  });

  test("une fenetre qui refuse n'empeche pas les autres d'etre redirigees", async () => {
    const { journal, activer } = chargerSauvetage({ fenetres: 2, fenetreQuiRefuse: true });
    await activer();
    assert.equal(journal.filter((l) => l.startsWith("redirige:")).length, 1);
  });
});

describe("la page de l'ancienne adresse", () => {
  const page = readFileSync(PAGE, "utf8");

  test("redirige vers la vraie application, sans garder l'ancienne adresse dans l'historique", () => {
    assert.match(page, /location\.replace\("\.\.\/"\)/);
  });

  test("redirige meme sans JavaScript", () => {
    assert.match(page, /<meta http-equiv="refresh" content="\d+; url=\.\.\/"/);
  });

  test("desinstalle le service worker de l'ancienne adresse, et lui seul", () => {
    assert.match(page, /getRegistrations\(\)/);
    assert.match(page, /\.unregister\(\)/);
    assert.match(page, /"\/coachneiramapublier\/"/, "filtrer sur l'ancienne adresse, pas désinstaller celui de l'application");
  });
});
