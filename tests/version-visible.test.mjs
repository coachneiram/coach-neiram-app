/**
 * La version construite, affichee dans les Reglages.
 *
 * Sans elle, impossible de savoir ce qu'un telephone execute vraiment.
 * Deux fois pendant la migration, un bug signale comme « toujours la »
 * etait en realite un ancien paquet garde en cache par le navigateur — et
 * a chaque fois il a fallu un aller-retour complet pour s'en apercevoir,
 * pendant lequel on a cherche dans du code deja correct.
 *
 * Ce n'est pas une fonctionnalite pour le client : c'est un outil de
 * diagnostic. D'ou le placement discret en bas des reglages.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (c) => readFileSync(join(ICI, "..", c), "utf8");

const REGLAGES = lire("app/src/ecrans/Reglages.jsx");
const VITE = lire("app/vite.config.js");

describe("la version est injectee a la construction", () => {
  test("vite la calcule depuis git, avec la date", () => {
    assert.match(VITE, /__VERSION_APP__: JSON\.stringify\(versionConstruite\(\)\)/);
    assert.match(VITE, /git rev-parse --short HEAD/);
    assert.match(VITE, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/);
  });

  test("la date NE SUFFIT PAS : le commit doit etre dans la chaine rendue", () => {
    // Deux deploiements le meme jour sont courants — il y en a eu cinq le
    // 5 septembre. Sans le commit, la version ne distingue rien du tout,
    // et l'outil de diagnostic ne diagnostique plus rien.
    assert.match(VITE, /return `\$\{date\} · \$\{court\}`;/);
  });

  test("un dossier sans git ne fait pas echouer la construction", () => {
    // Une archive telechargee, un CI sans historique : la date seule
    // suffit a distinguer deux versions.
    assert.match(VITE, /catch \(e\) \{\s*return date;/);
  });
});

describe("la version est affichee", () => {
  test("elle apparait dans l'ecran Reglages", () => {
    assert.match(REGLAGES, /Version \{VERSION_APP\}/);
  });

  test("les tests Node, qui n'ont pas la constante, ne plantent pas", () => {
    assert.match(
      REGLAGES,
      /typeof __VERSION_APP__ === "string" \? __VERSION_APP__ : "développement"/,
      "sans ce repli, importer l'ecran hors construction leve une ReferenceError"
    );
  });

  test("elle reste discrete : c'est un outil de diagnostic, pas une fonctionnalite", () => {
    const bloc = REGLAGES.slice(REGLAGES.indexOf("Version {VERSION_APP}") - 400, REGLAGES.indexOf("Version {VERSION_APP}"));
    assert.match(bloc, /color: COLORS\.textFaint/);
    assert.match(bloc, /fontSize: 10\.5/);
  });

  test("le bouton Enregistrer reste le dernier element actionnable", () => {
    // La version est posee APRES lui : elle ne doit pas s'intercaler entre
    // les reglages et leur validation.
    assert.ok(
      REGLAGES.indexOf("Enregistrer\n          </Btn>") < REGLAGES.indexOf("Version {VERSION_APP}"),
      "la version doit venir apres le bouton Enregistrer"
    );
  });
});
