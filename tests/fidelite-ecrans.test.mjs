/**
 * Fidelite des ecrans migres.
 *
 * Pendant toute la migration, la regle est qu'un ecran porte doit etre
 * indistinguable de l'original. Le risque n'est pas le gros bug — il se
 * verrait — mais la derive silencieuse : un mot reformule, un seuil arrondi,
 * une unite changee. Trois ecrans plus loin, plus personne ne sait quelle
 * version fait foi.
 *
 * Ce test relit chaque fichier d'ecran migre, en extrait les textes affiches
 * a l'utilisateur, et verifie que chacun existe mot pour mot dans
 * index.html. Il couvre automatiquement les ecrans a venir : il suffit de
 * les ajouter au dossier ecrans/.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");
const DOSSIER_ECRANS = join(RACINE, "app", "src", "ecrans");

/** index.html est minifie : les accents y sont echappes en \xNN / \uNNNN. */
const LEGACY = readFileSync(join(RACINE, "index.html"), "utf8")
  .replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

/**
 * Phrases affichees a l'utilisateur dans un fichier JSX.
 *
 * On ne retient que les textes assez longs et contenant une espace : les
 * fragments courts (« h », « cm », « — ») sont trop ambigus pour qu'une
 * correspondance prouve quoi que ce soit, et generent du bruit.
 */
function phrasesAffichees(source) {
  const phrases = new Set();

  /**
   * Un fragment n'est du texte que s'il ne contient aucune trace de code.
   * Sans ce filtre, le `>` d'une fleche ou d'une comparaison ouvrirait un
   * faux fragment courant sur plusieurs lignes de JavaScript.
   */
  const estDuTexte = (t) =>
    t.includes(" ") &&
    t.length >= 15 &&
    !/[={}`;\\|]|\/\/|\/>|:\/\//.test(t) &&
    // Un acces a une propriete (« seance.rpe ») trahit du code, pas du texte :
    // en francais, un point est toujours suivi d'une espace.
    !/\w\.\w/.test(t);

  /**
   * Prettier repartit un paragraphe JSX sur plusieurs lignes ; index.html
   * le garde sur une seule. On ramene donc tout a une espace unique avant
   * de comparer, sinon aucun texte un peu long ne serait jamais verifie.
   */
  const aplatir = (t) => t.replace(/\s+/g, " ").trim();

  for (const m of source.matchAll(/>([^<>{}]{15,})</g)) {
    const t = aplatir(m[1]);
    if (estDuTexte(t)) phrases.add(t);
  }
  for (const m of source.matchAll(/"([^"\\\n]{15,})"/g)) {
    const t = aplatir(m[1]);
    if (estDuTexte(t)) phrases.add(t);
  }
  return [...phrases];
}

const ecrans = readdirSync(DOSSIER_ECRANS).filter((f) => f.endsWith(".jsx"));

describe("chaque ecran migre reprend les textes de l'application actuelle", () => {
  test("au moins un ecran est migre", () => {
    assert.ok(ecrans.length > 0, "aucun ecran dans app/src/ecrans/");
  });

  for (const fichier of ecrans) {
    test(fichier, () => {
      const source = readFileSync(join(DOSSIER_ECRANS, fichier), "utf8");
      const phrases = phrasesAffichees(source);
      assert.ok(phrases.length > 0, "aucun texte detecte dans " + fichier);

      const derives = phrases.filter((p) => !LEGACY.includes(p));
      assert.deepEqual(
        derives,
        [],
        "textes absents de index.html (reformules au passage de la migration ?) dans " + fichier
      );
    });
  }
});
