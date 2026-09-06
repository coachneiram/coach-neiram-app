/**
 * Le juge des scripts de fumée doit lui-même être jugé.
 *
 * Une chaine d'integration qui laisse tout passer est pire qu'aucune
 * chaine : elle inspire une confiance qu'elle ne merite pas. Ces tests
 * emploient donc de VRAIES sorties, copiees des scripts existants — y
 * compris celles des trois pannes reellement rencontrees pendant la
 * migration : l'ecran blanc, l'import manquant, le bouton mort.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { juger } from "../scripts-migration/verdict.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = join(ICI, "..", "scripts-migration");

describe("une sortie saine passe", () => {
  test("un script nominal", () => {
    const sortie = [
      "1. TABLE CHARGEE     : 145 aliments",
      "2. ALIMENT AJOUTE    : Lentilles crues — Aliment brut (100 g)",
      "   FIBRES ENREGISTREES: 11 g",
      "ERREURS JS : aucune"
    ].join("\n");
    assert.equal(juger(sortie, 0).ok, true);
  });

  test("l'état des lieux sans échec", () => {
    assert.equal(juger("27 fonctions exercées — 0 en échec\nERREURS JS : aucune", 0).ok, true);
  });
});

describe("les trois pannes réellement rencontrées sont attrapées", () => {
  test("l'écran blanc : une erreur JavaScript au démarrage", () => {
    // PR #16 : 870 tests unitaires verts, et l'application ne demarrait pas.
    const v = juger('ECRAN : vide\nERREURS JS : ["Cannot access \'targets\' before initialization"]', 0);
    assert.equal(v.ok, false);
    assert.match(v.raisons.join(" "), /targets/);
  });

  test("l'import manquant : l'écran plante à l'ouverture", () => {
    // PR #19 : le build passait, 898 tests verts, l'ecran crashait.
    const v = juger('ECHEC : ChoixPhoto is not defined\nERREURS : aucune', 0);
    assert.equal(v.ok, false);
    assert.match(v.raisons.join(" "), /ChoixPhoto/);
  });

  test("le bouton mort : présent à l'écran, branché sur rien", () => {
    const v = juger("   BOUTON RESTAURER    : *** ABSENT ***\nERREURS JS : aucune", 0);
    assert.equal(v.ok, false);
    assert.match(v.raisons.join(" "), /ABSENT/);
  });
});

describe("les façons de tricher sont fermées", () => {
  test("un script muet ne passe pas pour un succès", () => {
    // Une commande introuvable, un plantage avant le premier affichage :
    // les deux rendent une sortie vide. Ce n'est pas « rien a signaler ».
    assert.equal(juger("", 0).ok, false);
    assert.equal(juger("   \n  ", 0).ok, false);
  });

  test("un code de sortie non nul suffit", () => {
    assert.equal(juger("tout va bien\nERREURS JS : aucune", 1).ok, false);
  });

  test("l'état des lieux avec des échecs ne passe pas", () => {
    const v = juger("27 fonctions exercées — 2 en échec\nERREURS JS : aucune", 0);
    assert.equal(v.ok, false);
    assert.match(v.raisons.join(" "), /2 fonction/);
  });

  test("« ERREURS » suivi d'autre chose qu'« aucune »", () => {
    assert.equal(juger("ERREURS : []", 0).ok, false, "un tableau vide imprimé reste suspect");
    assert.equal(juger("ERREURS JS : aucune", 0).ok, true);
  });

  test("plusieurs causes sont toutes rapportées", () => {
    const v = juger("A : *** ABSENT ***\nB : *** MASQUE ***\nERREURS JS : [\"boum\"]", 3);
    assert.equal(v.ok, false);
    assert.ok(v.raisons.length >= 4, "chaque cause doit être nommée : " + JSON.stringify(v.raisons));
  });
});

describe("le juge couvre les marqueurs réellement employés", () => {
  test("tous les marqueurs des scripts sont reconnus", () => {
    // Si un script invente un nouveau marqueur que le juge ignore, sa panne
    // passerait inapercue. On verifie donc que chaque marqueur present dans
    // les scripts declenche bien un verdict negatif.
    const marqueurs = new Set();
    for (const f of readdirSync(SCRIPTS).filter((x) => x.endsWith(".mjs"))) {
      const s = readFileSync(join(SCRIPTS, f), "utf8");
      for (const m of s.matchAll(/"(\*\*\*[^"]*\*\*\*)"/g)) marqueurs.add(m[1]);
      for (const m of s.matchAll(/\*\*\* ([A-ZÉÈ' ]+) \*\*\*/g)) marqueurs.add("*** " + m[1] + " ***");
    }
    assert.ok(marqueurs.size >= 8, "les marqueurs devraient être trouvés : " + marqueurs.size);
    for (const m of marqueurs) {
      assert.equal(juger("RESULTAT : " + m, 0).ok, false, "marqueur non reconnu : " + m);
    }
  });

  test("le lanceur exerce bien tous les scripts du dossier", () => {
    const lanceur = readFileSync(join(SCRIPTS, "verifier-navigateur.mjs"), "utf8");
    // Le lanceur doit DECOUVRIR les scripts, pas en tenir une liste figée :
    // une liste oubliée laisserait un nouveau script hors de la chaîne.
    assert.match(lanceur, /readdirSync/, "les scripts doivent être découverts automatiquement");
    assert.doesNotMatch(lanceur, /fumee-version\.mjs["']/, "aucune liste de scripts en dur");
  });
});
