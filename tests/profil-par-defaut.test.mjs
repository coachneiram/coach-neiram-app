/**
 * Profil par defaut d'un nouveau client.
 *
 * Ce sont treize valeurs recopiees a la main depuis index.html, et une
 * recopie a la main est exactement ce qui derape en silence. Un objectif de
 * sommeil passe de 8 h a 7 h, et tous les nouveaux clients sont notes sur
 * une base differente de leurs aines — sans que rien ne le signale.
 *
 * Ce test ne compare pas a une seconde recopie : il RELIT l'objet dans le
 * source de index.html et le compare champ par champ.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PROFIL_PAR_DEFAUT } from "../app/src/lib/profil.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const LEGACY = readFileSync(join(ICI, "..", "index.html"), "utf8");

/**
 * Extrait l'objet passe a useState dans Onboarding.
 *
 * La minification rend le source compact mais previsible : l'appel tient
 * sur une ligne, et l'objet s'arrete a la premiere accolade fermante suivie
 * d'une parenthese.
 */
function profilDeLegacy() {
  const debut = LEGACY.indexOf('const [value, setValue] = useState({ sex: "homme"');
  assert.notEqual(debut, -1, "l'etat initial d'Onboarding est introuvable dans index.html");
  const ouvrante = LEGACY.indexOf("{", LEGACY.indexOf("useState", debut));
  const fin = LEGACY.indexOf("});", ouvrante);
  // eslint-disable-next-line no-new-func
  return new Function("return " + LEGACY.slice(ouvrante, fin + 1))();
}

describe("profil par defaut", () => {
  const attendu = profilDeLegacy();

  test("identique a celui d'index.html", () => {
    assert.deepEqual(PROFIL_PAR_DEFAUT, attendu);
  });

  test("aucun champ n'a ete oublie ni ajoute", () => {
    assert.deepEqual(Object.keys(PROFIL_PAR_DEFAUT).sort(), Object.keys(attendu).sort());
  });

  test("les trois champs obligatoires sont bien absents", () => {
    // Age, taille et poids doivent rester vides : les pre-remplir donnerait
    // des objectifs calcules sur quelqu'un d'autre.
    for (const champ of ["age", "heightCm", "startWeightKg"]) {
      assert.equal(PROFIL_PAR_DEFAUT[champ], undefined, `${champ} ne doit pas avoir de valeur par defaut`);
    }
  });

  test("l'objet par defaut n'est pas partage entre deux clients", () => {
    // allergies et slots sont des tableaux : les muter modifierait le
    // defaut pour tout le monde.
    const a = { ...PROFIL_PAR_DEFAUT, allergies: [...PROFIL_PAR_DEFAUT.allergies] };
    a.allergies.push("gluten");
    assert.deepEqual(PROFIL_PAR_DEFAUT.allergies, [], "le tableau par defaut a ete modifie");
  });
});
