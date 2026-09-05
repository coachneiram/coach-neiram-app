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

  /*
   * Les blocs marques « MIGRATION-EN-COURS » sont exclus.
   *
   * Ils annoncent au client qu'une partie n'est pas encore portee et
   * reste servie par l'application actuelle. Leur texte n'existe donc pas
   * dans index.html, et c'est normal. Le marquage doit rester explicite :
   * un test compte ces blocs pour qu'ils ne se multiplient pas en silence.
   */
  source = source.replace(/\/\* MIGRATION-EN-COURS \*\/[\s\S]*?\/\* FIN-MIGRATION-EN-COURS \*\//g, "");

  /*
   * Les blocs marques « TEXTE-NOUVEAU » sont exclus eux aussi.
   *
   * La migration est finie : l'application evolue maintenant, et un
   * texte ajoute apres la bascule n'a par definition aucune chance
   * d'exister dans index.html. Sans cette echappatoire, ce test
   * interdirait toute nouvelle fonctionnalite — il passerait de garde-fou
   * a frein.
   *
   * Le marquage reste explicite et inventorie par un test dedie : ce qui
   * doit rester impossible, c'est de reformuler un texte PORTE sans s'en
   * apercevoir. Ajouter du texte assume, non.
   */
  source = source.replace(/\/\* TEXTE-NOUVEAU[\s\S]*?\/\* FIN-TEXTE-NOUVEAU \*\//g, "");

  /**
   * Un fragment n'est du texte que s'il ne contient aucune trace de code.
   * Sans ce filtre, le `>` d'une fleche ou d'une comparaison ouvrirait un
   * faux fragment courant sur plusieurs lignes de JavaScript.
   */
  const estDuTexte = (t) =>
    !/[={}`;\\|]|\/\/|\/>|:\/\/|&&|\|\|/.test(t) &&
    // Un acces a une propriete (« seance.rpe ») trahit du code, pas du texte :
    // en francais, un point est toujours suivi d'une espace.
    !/\w\.\w/.test(t) &&
    // Un double tiret bas marque une constante injectee a la construction
    // (« __VERSION_APP__ »). Aucun texte affiche en francais n'en contient.
    !/__/.test(t) &&
    // Un identifiant colle a une parenthese ouvrante (« setBrouillon( ») est
    // un appel de fonction. En francais, une parenthese ouvrante est toujours
    // precedee d'une espace, donc aucune phrase affichee ne ressemble a cela.
    !/\w\(/.test(t) &&
    // Une parenthese fermante en tete, ou ouvrante en fin, est une bordure
    // d'expression JSX (« ) : video ? ( »). Aucune phrase affichee ne
    // commence par une parenthese fermante.
    !/^\)/.test(t) &&
    !/\($/.test(t) &&
    // Au moins trois lettres : sans cela, une queue d'expression comme
    // « 0 ? ( » passait pour du texte affiche.
    (t.match(/[A-Za-zÀ-ÿ]/g) || []).length >= 3;

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
  /*
   * L'ouverture est « > » OU « } » : dans « ...{n} phrases restantes</p> »,
   * la phrase suit une expression JSX et non une balise. Ne reconnaitre que
   * « > » laissait passer sans controle toute phrase precedee d'une valeur
   * calculee — un cas frequent, et jamais signale.
   */
  for (const m of source.matchAll(/[>}]([^<>{}]{4,})</g)) {
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

describe("les ajouts posterieurs a la bascule restent visibles", () => {
  test("chaque bloc de texte nouveau est delimite et justifie", () => {
    let blocs = 0;
    for (const { nom, chemin } of fichiers) {
      const source = readFileSync(chemin, "utf8");
      const ouverts = (source.match(/\/\* TEXTE-NOUVEAU/g) || []).length;
      const fermes = (source.match(/\/\* FIN-TEXTE-NOUVEAU \*\//g) || []).length;
      assert.equal(ouverts, fermes, `bloc de texte nouveau non ferme dans ${nom}`);

      for (const bloc of source.matchAll(/\/\* TEXTE-NOUVEAU([\s\S]*?)\*\//g)) {
        blocs++;
        // Une justification, pas seulement un marqueur : sans elle,
        // « TEXTE-NOUVEAU » deviendrait un moyen commode de contourner le
        // controle de fidelite.
        const justification = bloc[1].trim();
        assert.ok(
          justification.length > 60,
          `bloc de texte nouveau sans justification suffisante dans ${nom}`
        );
      }
    }
    // Le compte est volontairement affiche : il doit rester lisible d'un
    // coup d'oeil combien de textes ne sont plus couverts par le controle.
    assert.ok(blocs < 25, `${blocs} blocs de texte nouveau : la couverture se dilue`);
  });
});

describe("les blocs non encore migres restent rares et marques", () => {
  test("chaque bloc en attente est explicitement delimite", () => {
    let blocs = 0;
    for (const { nom, chemin } of fichiers) {
      const source = readFileSync(chemin, "utf8");
      const ouverts = (source.match(/\/\* MIGRATION-EN-COURS \*\//g) || []).length;
      const fermes = (source.match(/\/\* FIN-MIGRATION-EN-COURS \*\//g) || []).length;
      assert.equal(ouverts, fermes, "bloc non refermé dans " + nom);
      blocs += ouverts;
    }
    // Le seuil n'est pas arbitraire : il force a constater la derive si
    // les zones non migrees se multiplient au lieu de se resorber.
    assert.ok(blocs <= 3, "trop de blocs en attente de migration : " + blocs);
  });
});

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
