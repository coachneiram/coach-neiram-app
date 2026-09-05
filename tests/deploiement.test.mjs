/**
 * Coherence du deploiement.
 *
 * Le workflow de publication copie une liste de fichiers. Si l'application
 * se met a charger une ressource absente de cette liste, la page tombera en
 * production alors que tout fonctionne en local — panne classique et
 * particulierement desagreable a diagnostiquer.
 *
 * Ces tests comparent ce que l'application demande a ce que le workflow
 * publie reellement.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");

const CHEMIN_DEPLOY = join(RACINE, ".github", "workflows", "deploy.yml.a-activer");
const CHEMIN_DEPLOY_ACTIF = join(RACINE, ".github", "workflows", "deploy.yml");

// Le workflow peut etre en attente d'activation ou deja actif.
const chemin = existsSync(CHEMIN_DEPLOY_ACTIF) ? CHEMIN_DEPLOY_ACTIF : CHEMIN_DEPLOY;
const workflowPresent = existsSync(chemin);

/** Ressources locales reellement chargees par l'application. */
function ressourcesDemandees() {
  const html = readFileSync(join(RACINE, "index.html"), "utf8");
  return [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((r) => !r.startsWith("http") && !r.startsWith("data:") && !r.includes("${"))
    .map((r) => r.replace(/^\.\//, ""));
}

describe("le workflow publie tout ce que l'application demande", { skip: workflowPresent ? false : "workflow de deploiement absent" }, () => {
  const workflow = workflowPresent ? readFileSync(chemin, "utf8") : "";

  test("chaque ressource chargee par index.html est bien publiee", () => {
    for (const ressource of ressourcesDemandees()) {
      const couverte =
        workflow.includes(ressource) ||
        // Les copies groupees couvrent des familles entieres de fichiers.
        (ressource.endsWith(".png") && workflow.includes("*.png")) ||
        (ressource.startsWith("food-") && workflow.includes("food-*.js"));
      assert.ok(
        couverte,
        "ressource chargee par l'application mais absente de la publication : " + ressource
      );
    }
  });

  test("le service worker est publie : sans lui, le mode hors ligne disparait", () => {
    assert.ok(workflow.includes("sw.js"), "sw.js absent de la liste publiee");
  });

  test("les fichiers publies existent tous dans le depot", () => {
    for (const ressource of ressourcesDemandees()) {
      assert.ok(existsSync(join(RACINE, ressource)), "fichier reference mais absent : " + ressource);
    }
  });

  test("les dossiers de developpement ne sont pas mis en ligne", () => {
    // Ils ne contiennent aucun secret, mais n'ont rien a faire sur le site.
    for (const dossier of ["tests/", "app/src", ".planning/", "scripts/"]) {
      assert.ok(
        !workflow.includes("cp -r " + dossier) && !workflow.includes("cp " + dossier),
        "dossier de developpement publie : " + dossier
      );
    }
  });

  test("les tests conditionnent la mise en ligne", () => {
    assert.ok(
      workflow.includes("needs: tests"),
      "le deploiement doit dependre des tests, sinon une regression part en production"
    );
  });
});

describe("le service worker et le workflow restent alignes", { skip: workflowPresent ? false : "workflow absent" }, () => {
  const workflow = workflowPresent ? readFileSync(chemin, "utf8") : "";

  test("tout ce que le service worker precache est publie", () => {
    const sw = readFileSync(join(RACINE, "sw.js"), "utf8");
    const precache = [...sw.matchAll(/"\.\/([^"]*)"/g)].map((m) => m[1]).filter(Boolean);

    for (const ressource of precache) {
      if (ressource === "index.html") continue; // couvert explicitement
      const couverte =
        workflow.includes(ressource) ||
        (ressource.endsWith(".png") && workflow.includes("*.png")) ||
        (ressource.startsWith("food-") && workflow.includes("food-*.js"));
      assert.ok(
        couverte,
        "ressource precachee par le service worker mais non publiee : " + ressource
      );
    }
  });
});
