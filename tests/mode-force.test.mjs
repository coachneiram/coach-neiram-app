/**
 * Mode « Force » d'un exercice, propose a tous les clients.
 *
 * Retour du coach (3 octobre 2026) : sur un telephone dont le profil n'etait
 * pas en objectif « performance », la liste des modes ne proposait plus
 * « Force » (Muscu, PDC, Cardio, Warm-up seulement), alors qu'un autre
 * telephone la montrait. Le mode ne depend plus de l'objectif.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/src/ecrans/ConstructeurSeances.jsx", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

test("la liste des modes propose Force sans condition", () => {
  const liste = source.match(/<select[^>]*?value=\{mode\}[\s\S]*?<\/select>/);
  assert.ok(liste, "liste des modes introuvable");
  for (const libelle of ["Muscu", "PDC", "Cardio", "Warm-up", "Force"]) {
    assert.match(liste[0], new RegExp(`>${libelle}</option>`));
  }
  assert.match(liste[0], /^\s*<option value="powerlifting">Force<\/option>/m, "Force ne doit dependre d'aucune condition");
  assert.doesNotMatch(liste[0], /plOn/);
});
