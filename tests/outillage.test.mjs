/**
 * Outillage du depot.
 *
 * L'application a longtemps ete modifiee par des scripts Python qui
 * patchaient index.html par recherche/remplacement de texte. Ils ont fait
 * leur travail, mais ils sont exactement ce que cette migration cherchait a
 * remplacer :
 *
 * - une chaine cherchee qui n'existe plus, et le patch ne s'applique pas —
 *   silencieusement, sans erreur ;
 * - une chaine qui apparait deux fois, et le patch touche la mauvaise ;
 * - aucune verification derriere, donc une modification fausse partait en
 *   production sans que rien ne la signale.
 *
 * Le risque n'est pas theorique : ces scripts ecrivent dans index.html, le
 * fichier que les clients utilisent en ce moment meme. Ce test empeche leur
 * retour et impose que toute nouvelle generation de code passe par
 * scripts-migration/, ou les sorties sont verifiees par la suite de tests.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");

/** Tous les fichiers du depot, hors dossiers de dependances et de build. */
function fichiersDuDepot(dossier = RACINE, accumulateur = []) {
  for (const entree of readdirSync(dossier)) {
    if ([".git", "node_modules", "dist"].includes(entree)) continue;
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) fichiersDuDepot(chemin, accumulateur);
    else accumulateur.push(chemin);
  }
  return accumulateur;
}

describe("outillage du depot", () => {
  const fichiers = fichiersDuDepot();

  test("plus aucun script de patch Python", () => {
    const python = fichiers.filter((f) => f.endsWith(".py")).map((f) => f.slice(RACINE.length + 1));
    assert.deepEqual(python, [], "des scripts Python sont revenus dans le depot");
  });

  test("le dossier scripts/ n'existe plus", () => {
    assert.ok(!existsSync(join(RACINE, "scripts")), "le dossier scripts/ est reapparu");
  });

  /**
   * La difference entre les deux outillages tient a ce garde-fou : un
   * script qui ecrit dans index.html modifie l'application des clients ;
   * un script qui ecrit dans app/src/lib produit du code dont la suite
   * verifie la conformite a l'original.
   */
  test("aucun outil du depot n'ecrit dans index.html", () => {
    const outils = fichiers.filter(
      (f) => f.includes("scripts-migration") && (f.endsWith(".mjs") || f.endsWith(".js"))
    );
    assert.ok(outils.length > 0, "aucun outil de migration trouve : le test ne verifie rien");

    for (const outil of outils) {
      const source = readFileSync(outil, "utf8");
      const ecritures = [...source.matchAll(/writeFileSync\(\s*([^,]+),/g)].map((m) => m[1].trim());
      for (const cible of ecritures) {
        assert.ok(
          !/index\.html/.test(cible),
          `${outil.slice(RACINE.length + 1)} ecrit dans index.html : c'est l'application des clients`
        );
      }
    }
  });

  test("l'outillage de migration est en JavaScript, comme le reste du projet", () => {
    // Un seul langage : les outils peuvent alors charger les memes modules
    // que l'application et etre couverts par la meme suite de tests.
    const outils = readdirSync(join(RACINE, "scripts-migration"));
    for (const outil of outils) {
      assert.ok(/\.(mjs|js|md)$/.test(outil), `outil dans un autre langage : ${outil}`);
    }
  });
});
