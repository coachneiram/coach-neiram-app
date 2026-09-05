/**
 * Verifie le resultat du build Vite.
 *
 * Ces tests ne construisent rien : ils inspectent `app/dist` s'il existe.
 * Lance `npm run build` dans `app/` au prealable, sinon ils sont ignores.
 *
 * L'enjeu principal est le prefixe des chemins. GitHub Pages sert le site
 * depuis un sous-dossier (/coach-neiram-app/). Un build produisant des chemins
 * absolus donnerait une page blanche en production — panne silencieuse et
 * deroutante, que ce test attrape avant la bascule.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const DIST = join(ICI, "..", "app", "dist");
const INDEX_DIST = join(DIST, "index.html");

const buildPresent = existsSync(INDEX_DIST);

describe("build Vite", { skip: buildPresent ? false : "app/dist absent — lancer `npm run build` dans app/" }, () => {
  const html = buildPresent ? readFileSync(INDEX_DIST, "utf8") : "";

  test("aucun chemin absolu : indispensable pour un sous-dossier GitHub Pages", () => {
    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(refs.length > 0, "aucune ressource referencee dans le build");
    for (const ref of refs) {
      assert.ok(
        !ref.startsWith("/"),
        "chemin absolu detecte, l'application afficherait une page blanche : " + ref
      );
    }
  });

  test("les ressources referencees existent reellement", () => {
    const refs = [...html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map((m) => m[1]);
    for (const ref of refs) {
      assert.ok(existsSync(join(DIST, ref)), "ressource manquante dans le build : " + ref);
    }
  });

  test("le point de montage React est present", () => {
    assert.ok(html.includes('id="root"'), "div#root absent : rien ne s'afficherait");
  });

  test("le build embarque bien React", () => {
    const assets = readdirSync(join(DIST, "assets"));
    const js = assets.filter((f) => f.endsWith(".js"));
    assert.ok(js.length > 0, "aucun fichier JavaScript produit");
    const contenu = js.map((f) => readFileSync(join(DIST, "assets", f), "utf8")).join("");
    assert.ok(contenu.length > 50_000, "bundle suspicieusement petit : React est-il inclus ?");
  });

  test("aucun secret n'a fui dans le build", () => {
    const assets = readdirSync(join(DIST, "assets"));
    const contenu = assets
      .map((f) => readFileSync(join(DIST, "assets", f), "utf8"))
      .join("")
      .concat(html);
    // Motifs des cles Google, anciennes et nouvelles.
    assert.ok(!/AIzaSy[A-Za-z0-9_\-]{20,}/.test(contenu), "cle API Google detectee dans le build");
    assert.ok(!/AQ\.[A-Za-z0-9_\-]{30,}/.test(contenu), "cle API Google detectee dans le build");
    assert.ok(
      !/script\.google\.com\/macros\/s\/[A-Za-z0-9_\-]{40,}/.test(contenu),
      "adresse du script coach detectee dans le build"
    );
  });
});
