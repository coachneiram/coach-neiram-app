/**
 * Les chaînes d'intégration ne doivent pas diverger.
 *
 * Deux workflows lancent la même suite de tests : « Tests » et l'étape de
 * vérification de « Deploiement ». J'ai corrigé une dépendance manquante
 * dans le premier et oublié le second — le déploiement est resté bloqué,
 * et le site figé sur une version antérieure sans que rien ne le dise
 * autrement qu'une croix rouge parmi d'autres.
 *
 * Ce test verrouille l'invariant : qui lance la suite doit d'abord
 * installer ce dont elle a besoin.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const DOSSIER = join(ICI, "..", ".github", "workflows");

const workflows = readdirSync(DOSSIER)
  .filter((f) => f.endsWith(".yml"))
  .map((f) => ({ nom: f, contenu: readFileSync(join(DOSSIER, f), "utf8") }));

describe("qui lance la suite installe ce qu'elle demande", () => {
  test("il y a bien des workflows à vérifier", () => {
    assert.ok(workflows.length >= 3, "workflows trouvés : " + workflows.map((w) => w.nom).join(", "));
  });

  test("chaque workflow qui lance les tests installe playwright-core", () => {
    const fautifs = workflows
      .filter((w) => /node --test tests/.test(w.contenu))
      .filter((w) => !/playwright/.test(w.contenu))
      .map((w) => w.nom);
    assert.deepEqual(
      fautifs,
      [],
      "ces chaînes lancent la suite sans installer la table des appareils : le fichier de test ne se chargera pas"
    );
  });

  test("la même version partout", () => {
    // Deux versions différentes rendraient une chaîne verte et l'autre
    // rouge sur le même code, pour une raison invisible dans le diff.
    const versions = new Set(
      workflows.flatMap((w) => [...w.contenu.matchAll(/playwright(?:-core)?@([\d.]+)/g)].map((m) => m[1]))
    );
    assert.equal(versions.size, 1, "versions de Playwright trouvées : " + [...versions].join(", "));
  });
});
