/**
 * Coherence du deploiement.
 *
 * Depuis la bascule, ce qui est mis en ligne n'est plus la racine du depot
 * mais la CONSTRUCTION (app/dist). Le risque a change de nature :
 *
 * - avant, une ressource oubliee dans la liste de copie donnait une page
 *   cassee en production alors que tout marchait en local ;
 * - maintenant, c'est une etape de construction absente, ou un fichier que
 *   la construction ne produit pas, qui donne le meme resultat.
 *
 * Ces tests verifient donc trois choses : que le workflow construit avant de
 * publier, qu'il publie bien la construction, et que la construction contient
 * tout ce que l'application et le service worker demandent.
 *
 * Le dernier groupe est ignore si app/dist n'existe pas : lancer
 * `npm run build` dans app/ le reactive.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");
const DIST = join(RACINE, "app", "dist");

const CHEMIN_DEPLOY = join(RACINE, ".github", "workflows", "deploy.yml");
const workflowPresent = existsSync(CHEMIN_DEPLOY);
const workflow = workflowPresent ? readFileSync(CHEMIN_DEPLOY, "utf8") : "";

/** Ressources locales chargees par un document HTML. */
function ressourcesDe(html) {
  return [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((r) => !r.startsWith("http") && !r.startsWith("data:") && !r.includes("${"))
    .map((r) => r.replace(/^\.\//, ""));
}

describe("le workflow construit avant de publier", { skip: workflowPresent ? false : "workflow absent" }, () => {
  test("la construction est lancee", () => {
    assert.match(workflow, /npm ci/, "les dependances ne sont pas installees");
    assert.match(workflow, /npm run build/, "l'application n'est pas construite");
  });

  test("c'est la construction qui est publiee, pas la racine", () => {
    assert.match(workflow, /app\/dist/, "app/dist n'est pas publie");
    // L'ancienne application reste dans le depot pour un retour en arriere,
    // mais elle ne doit plus etre celle qui part en ligne.
    assert.ok(
      !/cp index\.html/.test(workflow),
      "l'ancienne application est encore publiee : la bascule serait sans effet"
    );
  });

  test("la version de Node est figee", () => {
    // Sans cela, la construction utiliserait la version par defaut du
    // runner, qui peut changer sans prevenir.
    assert.match(workflow, /setup-node/);
    assert.match(workflow, /node-version: "22"/);
  });

  test("la construction est verifiee avant publication", () => {
    for (const attendu of ["assets-manifest.json", "sw.js", "manifest.json"]) {
      assert.ok(
        workflow.includes(attendu),
        "la verification de construction ne controle pas : " + attendu
      );
    }
  });

  test("les tests conditionnent la mise en ligne", () => {
    assert.match(
      workflow,
      /needs: tests/,
      "le deploiement doit dependre des tests, sinon une regression part en production"
    );
  });

  test("les dossiers de developpement ne sont pas mis en ligne", () => {
    for (const dossier of ["tests/", "app/src", ".planning/"]) {
      assert.ok(
        !workflow.includes("cp -r " + dossier) && !workflow.includes("cp " + dossier),
        "dossier de developpement publie : " + dossier
      );
    }
  });
});

describe(
  "la construction contient tout ce qui est demande",
  { skip: existsSync(DIST) ? false : "app/dist absent — lancer `npm run build` dans app/" },
  () => {
    const html = readFileSync(join(DIST, "index.html"), "utf8");

    test("chaque ressource chargee par la page existe dans la construction", () => {
      const ressources = ressourcesDe(html);
      assert.ok(ressources.length > 4, "trop peu de ressources : le test ne verifie rien");
      for (const ressource of ressources) {
        assert.ok(existsSync(join(DIST, ressource)), "chargee mais absente de la construction : " + ressource);
      }
    });

    test("le service worker est construit : sans lui, le mode hors ligne disparait", () => {
      assert.ok(existsSync(join(DIST, "sw.js")), "sw.js absent de la construction");
      assert.match(html, /serviceWorker/, "la page n'enregistre pas le service worker");
    });

    test("les ressources PWA sont la : sans elles, l'application n'est plus installable", () => {
      for (const f of ["manifest.json", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]) {
        assert.ok(existsSync(join(DIST, f)), "absent de la construction : " + f);
      }
      assert.match(html, /rel="manifest"/, "la page ne declare pas de manifeste");
    });

    test("tout ce que le service worker precache existe dans la construction", () => {
      const sw = readFileSync(join(DIST, "sw.js"), "utf8");
      // La liste ecrite a la main : « ./ » designe la page elle-meme.
      const precache = [...sw.matchAll(/"\.\/([^"]+)"/g)].map((m) => m[1]);
      for (const ressource of precache) {
        if (ressource === "assets-manifest.json") continue; // verifie ci-dessous
        assert.ok(
          existsSync(join(DIST, ressource)),
          "precachee par le service worker mais absente : " + ressource
        );
      }
    });

    /**
     * Le point qui a failli faire echouer la bascule.
     *
     * Le code de l'application porte une empreinte qui change a chaque
     * construction : il ne peut pas figurer dans une liste ecrite a la main.
     * Sans ce manifeste, le precache ne contiendrait pas le code de
     * l'application, et le premier lancement hors ligne afficherait une page
     * blanche — sans erreur, sans message.
     */
    test("le manifeste liste exactement les fichiers construits", () => {
      const manifeste = JSON.parse(readFileSync(join(DIST, "assets-manifest.json"), "utf8"));
      assert.ok(manifeste.length >= 2, "manifeste anormalement court : " + JSON.stringify(manifeste));

      for (const f of manifeste) {
        assert.ok(existsSync(join(DIST, f.replace(/^\.\//, ""))), "annonce mais absent : " + f);
      }

      // Et l'inverse : le code charge par la page doit etre dans le manifeste.
      for (const ressource of ressourcesDe(html)) {
        if (!/\.(js|css)$/.test(ressource) || ressource.startsWith("food-")) continue;
        assert.ok(
          manifeste.includes("./" + ressource),
          "charge par la page mais absent du manifeste, donc non precache : " + ressource
        );
      }
    });

    test("aucun chemin absolu : l'application vit dans un sous-dossier", () => {
      for (const ressource of [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])) {
        assert.ok(!ressource.startsWith("/"), "chemin absolu, page blanche en production : " + ressource);
      }
    });
  }
);
