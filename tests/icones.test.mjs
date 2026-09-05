/**
 * Icones.
 *
 * Les icones sont recopiees a la main depuis index.html, ou elles sont
 * ecrites en React.createElement. Une coordonnee de travers passe
 * facilement inapercue : le dessin reste plausible, simplement il n'est
 * plus tout a fait le meme.
 *
 * Ce test a ete ajoute apres avoir constate qu'un chevron avait ete porte
 * avec ses points dans l'ordre inverse. Visuellement identique cette
 * fois-la, mais rien ne garantissait que la suivante le soit.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");

const LEGACY = readFileSync(join(RACINE, "index.html"), "utf8");
const ICONES = readFileSync(join(RACINE, "app", "src", "ui", "icones.jsx"), "utf8");

/** Attributs geometriques d'une icone migree, dans l'ordre du fichier. */
function geometrieMigree(source) {
  const par = {};
  /*
   * Chaque definition est bornee par la suivante. Un motif non gourmand
   * jusqu'a « \n); » ne suffit pas : les icones tenant sur une seule ligne
   * n'ont pas cette fermeture, si bien qu'une definition avalait les
   * suivantes et leurs traces se melangeaient — c'est ce qui faisait
   * echouer Moon et Plus alors qu'ils etaient corrects.
   */
  const blocs = source.split(/^export const /m).slice(1);
  for (const bloc of blocs) {
    const nom = bloc.match(/^(\w+)/)[1];
    const corps = bloc;
    par[nom] = [...corps.matchAll(/\b(d|points|x|y|cx|cy|r|x1|y1|x2|y2|width|height|rx)="([^"]+)"/g)].map(
      (a) => a[1] + "=" + a[2]
    );
  }
  return par;
}

/** Meme extraction, cote index.html. */
function geometrieOrigine(nom) {
  const debut = LEGACY.indexOf(`const ${nom} = mkIcon(`);
  if (debut === -1) return null;
  const fin = LEGACY.indexOf("\n", debut);
  const bloc = LEGACY.slice(debut, fin);
  return [...bloc.matchAll(/\b(d|points|x|y|cx|cy|r|x1|y1|x2|y2|width|height|rx):\s*"([^"]+)"/g)].map(
    (a) => a[1] + "=" + a[2]
  );
}

const migrees = geometrieMigree(ICONES);

describe("chaque icone migree est le dessin exact de l'originale", () => {
  test("au moins une icone est migree", () => {
    assert.ok(Object.keys(migrees).length > 0, "aucune icône détectée dans icones.jsx");
  });

  for (const [nom, geometrie] of Object.entries(migrees)) {
    test(nom, () => {
      const origine = geometrieOrigine(nom);
      assert.notEqual(origine, null, `icône « ${nom} » absente de index.html`);
      assert.deepEqual(geometrie, origine, `le dessin de « ${nom} » diffère de l'original`);
    });
  }
});

describe("forme des icones", () => {
  test("chacune porte au moins un trace", () => {
    for (const [nom, geometrie] of Object.entries(migrees)) {
      assert.ok(geometrie.length > 0, `« ${nom} » ne dessine rien`);
    }
  });

  test("toutes passent par mkIcon, donc partagent la meme grille", () => {
    // Une icone dessinee hors de mkIcon aurait sa propre viewBox et
    // paraitrait plus grande ou plus petite que ses voisines.
    const exportees = [...ICONES.matchAll(/export const (\w+) =/g)].map((m) => m[1]);
    for (const nom of exportees) {
      assert.ok(migrees[nom], `« ${nom} » est exportée sans passer par mkIcon`);
    }
  });
});
