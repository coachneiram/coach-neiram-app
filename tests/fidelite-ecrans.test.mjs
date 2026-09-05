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
 *
 * LIMITE CONNUE : la comparaison cherche chaque phrase comme sous-chaine du
 * fichier d'origine. Elle attrape donc toute reformulation, mais pas une
 * TRONCATURE qui laisse un debut valide — retirer l'emoji final de
 * « Objectif atteint 💪 » passe inapercu, puisque « Objectif atteint »
 * figure bien dans l'original. Verifie en le mutant.
 *
 * Rendre la comparaison exacte demanderait de reconstruire les chaines de
 * index.html telles que le moteur JavaScript les evalue, ce que sa
 * minification rend peu fiable. Le compromis est assume : le risque
 * couvert (une reformulation involontaire) est bien plus probable qu'une
 * troncature exactement alignee sur un debut de phrase.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");
/**
 * Les primitives portent elles aussi du texte visible (« Points forts »,
 * « Actions pour la semaine prochaine »). Les laisser hors du controle
 * revenait a proteger les ecrans et pas ce qu'ils affichent.
 */
const DOSSIERS_SURVEILLES = [
  join(RACINE, "app", "src", "ecrans"),
  join(RACINE, "app", "src", "ui")
];

/** index.html est minifie : les accents y sont echappes en \xNN / \uNNNN. */
const LEGACY = readFileSync(join(RACINE, "index.html"), "utf8")
  .replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  // Les emojis sont echappes avec des accolades : \u{1F4AA}. Sans ce
  // decodage, tout texte en contenant un paraissait absent de l'original.
  .replace(/\\u\{([0-9A-Fa-f]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));

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
    !/[={}`;\\|]|\/\/|\/>|:\/\/|&&|\|\|/.test(t) &&
    // Un acces a une propriete (« seance.rpe ») trahit du code, pas du texte :
    // en francais, un point est toujours suivi d'une espace.
    !/\w\.\w/.test(t);

  /**
   * Prettier repartit un paragraphe JSX sur plusieurs lignes ; index.html
   * le garde sur une seule. On ramene donc tout a une espace unique avant
   * de comparer, sinon aucun texte un peu long ne serait jamais verifie.
   */
  const aplatir = (t) => t.replace(/\s+/g, " ").trim();

  /*
   * Texte libre entre balises JSX, meme court : « Aujourd'hui » ou
   * « Points forts » sont des libelles que le client lit tous les jours.
   * Un seuil de longueur les laissait passer.
   */
  for (const m of source.matchAll(/>([^<>{}]{4,})</g)) {
    const t = aplatir(m[1]);
    if (t && estDuTexte(t)) phrases.add(t);
  }

  /*
   * Chaines longues : messages et phrases completes.
   */
  for (const m of source.matchAll(/"([^"\\\n]{15,})"/g)) {
    const t = aplatir(m[1]);
    if (t.includes(" ") && estDuTexte(t)) phrases.add(t);
  }

  /*
   * Chaines courtes portees par une cle qui designe explicitement du texte
   * affiche. Les viser nommement evite d'avoir a deviner, a partir de sa
   * seule forme, si « center » est un libelle ou une valeur de style.
   */
  for (const m of source.matchAll(/\b(?:titre|label|title|message|ctaLabel|placeholder)\s*:\s*"([^"\\\n]{4,})"/g)) {
    const t = aplatir(m[1]);
    if (estDuTexte(t)) phrases.add(t);
  }

  return [...phrases];
}

const fichiers = DOSSIERS_SURVEILLES.flatMap((dossier) =>
  readdirSync(dossier)
    .filter((f) => f.endsWith(".jsx"))
    .map((f) => ({ nom: f, chemin: join(dossier, f) }))
);

describe("chaque ecran migre reprend les textes de l'application actuelle", () => {
  test("au moins un ecran est migre", () => {
    assert.ok(fichiers.length > 0, "aucun fichier surveillé");
  });

  for (const { nom, chemin } of fichiers) {
    test(nom, () => {
      const source = readFileSync(chemin, "utf8");
      const phrases = phrasesAffichees(source);
      if (!phrases.length) return; // fichier purement structurel

      const derives = phrases.filter((p) => !LEGACY.includes(p));
      assert.deepEqual(
        derives,
        [],
        "textes absents de index.html (reformules au passage de la migration ?) dans " + nom
      );
    });
  }
});
