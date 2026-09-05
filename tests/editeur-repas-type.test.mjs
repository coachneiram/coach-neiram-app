/**
 * Editeur de quantites d'un repas type.
 *
 * REGRESSION DE LA BASCULE, trouvee en relisant le guide client.
 *
 * L'application d'origine ouvre un editeur avec UN CHAMP PAR ALIMENT :
 * le client passe son poulet de 150 a 200 g sans toucher au riz. Mon
 * portage l'avait remplace par un simple multiplicateur applique a tout le
 * repas — et n'ajoutait qu'UNE SEULE LIGNE au journal au lieu d'une par
 * aliment.
 *
 * Le guide client, page 5, decrit le comportement d'origine. Les clients
 * lisaient donc des instructions pour un ecran qui n'existait plus.
 *
 * Trois pieges deja corriges dans l'ancienne version, qu'il ne faut pas
 * reintroduire :
 *   1. tous les aliments sont ajoutes, pas seulement le premier ;
 *   2. un aliment en « portions » peut passer en grammes, et l'app s'en
 *      souvient ;
 *   3. un seul champ numerique par ligne — deux champs cote a cote ont
 *      deja produit une saisie a 27 000 kcal.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { basisMacros, fmtPortion, itemBasis, sumMacros, toGramBasis } from "../app/src/lib/portions.js";
import { definirPoidsAliment } from "../app/src/lib/repas-types.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");
const lire = (c) => readFileSync(join(RACINE, c), "utf8");

function installerStockage() {
  const d = new Map();
  globalThis.localStorage = {
    getItem: (k) => (d.has(k) ? d.get(k) : null),
    setItem: (k, v) => d.set(k, String(v)),
    removeItem: (k) => d.delete(k),
    get length() {
      return d.size;
    }
  };
}

/** Un repas type realiste : poulet en portions, riz et huile en grammes. */
const REPAS = {
  id: "r1",
  name: "Déjeuner type",
  portions: 1,
  items: [
    { name: "Blanc de poulet", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    { name: "Riz basmati cuit (150 g)", grams: 150, baseName: "Riz basmati cuit", calories: 195, protein: 4, carbs: 42, fat: 0.5 },
    { name: "Huile d'olive (10 g)", grams: 10, baseName: "Huile d'olive", calories: 88, protein: 0, carbs: 0, fat: 10 }
  ]
};

describe("un champ par aliment", () => {
  test("chaque aliment a sa propre base de calcul", () => {
    const bases = REPAS.items.map(itemBasis);
    assert.equal(bases.length, 3);
    assert.equal(bases[0].unit, "x", "le poulet est enregistre en portions");
    assert.equal(bases[1].unit, "g", "le riz est enregistre en grammes");
  });

  test("changer un aliment ne touche pas les autres", () => {
    const bases = REPAS.items.map(itemBasis);
    // Le poulet passe de 1 a 1,5 portion ; le riz ne bouge pas.
    const avant = bases.map((b, i) => basisMacros(b, b.qty));
    const apres = bases.map((b, i) => basisMacros(b, i === 0 ? 1.5 : b.qty));
    assert.ok(apres[0].kcal > avant[0].kcal, "le poulet devrait avoir change");
    assert.equal(apres[1].kcal, avant[1].kcal, "le riz a bouge alors qu'on n'y a pas touche");
    assert.equal(apres[2].kcal, avant[2].kcal, "l'huile a bouge alors qu'on n'y a pas touche");
  });

  test("le total est la somme des lignes, pas un multiplicateur global", () => {
    const bases = REPAS.items.map(itemBasis);
    const lignes = bases.map((b, i) => basisMacros(b, i === 0 ? 2 : b.qty));
    const total = sumMacros(lignes);
    assert.equal(total.kcal, lignes.reduce((a, l) => a + l.kcal, 0));
  });

  test("un aliment mis a zero est retire du total", () => {
    const bases = REPAS.items.map(itemBasis);
    const lignes = bases.map((b, i) => basisMacros(b, i === 2 ? 0 : b.qty));
    assert.equal(lignes[2].kcal, 0, "l'huile mise a 0 doit compter pour rien");
  });
});

describe("passer une ligne en grammes", () => {
  beforeEach(installerStockage);

  test("le poids d'une portion est retenu pour la fois suivante", () => {
    const suivant = definirPoidsAliment([REPAS], "r1", 0, 150);
    assert.equal(suivant[0].items[0].grams, 150);
    assert.equal(suivant[0].items[0].baseName, "Blanc de poulet", "le nom d'origine doit etre conserve");
  });

  test("le poids est enregistre, pas seulement garde en memoire", () => {
    definirPoidsAliment([REPAS], "r1", 0, 150);
    const stocke = JSON.parse(localStorage.getItem("cn_meal_presets"));
    assert.equal(stocke[0].items[0].grams, 150);
  });

  test("un poids invalide ne modifie rien", () => {
    for (const v of [0, -10, null, "", "abc"]) {
      const avant = [REPAS];
      const suivant = definirPoidsAliment(avant, "r1", 0, v);
      assert.equal(suivant, avant, `poids ${String(v)} : la liste doit etre rendue telle quelle`);
      assert.equal(suivant[0].items[0].grams, undefined, `poids ${String(v)} : aucun poids ne doit etre pose`);
      assert.equal(
        localStorage.getItem("cn_meal_presets"),
        null,
        `poids ${String(v)} : rien ne doit etre enregistre`
      );
    }
  });

  test("les autres repas types ne sont pas touches", () => {
    const autre = { id: "r2", name: "Dîner", items: [{ name: "Saumon", calories: 200 }] };
    const suivant = definirPoidsAliment([REPAS, autre], "r1", 0, 150);
    assert.deepEqual(suivant[1], autre);
  });

  test("la bascule en grammes recalcule bien la ligne", () => {
    const base = itemBasis(REPAS.items[0]);
    const enGrammes = toGramBasis(base, 150);
    assert.equal(enGrammes.unit, "g");
    // 165 kcal pour une portion de 150 g -> 110 kcal aux 100 g.
    assert.equal(basisMacros(enGrammes, 150).kcal, 165);
    assert.equal(basisMacros(enGrammes, 300).kcal, 330, "doubler le poids doit doubler les calories");
  });
});

describe("branchement de l'ecran", () => {
  const ajout = lire("app/src/ecrans/AjoutAliment.jsx");
  const journal = lire("app/src/ecrans/Journal.jsx");

  test("le repas type ouvre l'editeur par aliment, pas le multiplicateur global", () => {
    assert.match(ajout, /genre === "repas"[\s\S]{0,120}<EditeurQuantitesRepas/);
    assert.ok(
      !/genre === "repas"[\s\S]{0,120}<ChoixPortion/.test(ajout),
      "le multiplicateur global est encore branche sur les repas types"
    );
  });

  test("« Compter en grammes » est present a l'ecran", () => {
    assert.match(ajout, /Compter en grammes/);
  });

  test("le journal recoit UNE ENTREE PAR ALIMENT", () => {
    // C'est le premier des trois bugs que le guide dit corriges.
    assert.match(journal, /logEntriesApi\.addMany\(entrees\)/);
    assert.match(journal, /for \(const \{ basis, qty \} of lignes/);
  });

  test("le poids memorise remonte jusqu'au stockage", () => {
    assert.match(ajout, /onMemoriserPoids=\{/);
    assert.match(journal, /definirPoidsAliment\(repasTypes, idRepas, index, grammes\)/);
    assert.match(journal, /onMemoriserPoidsRepasType=\{memoriserPoidsRepasType\}/);
  });

  test("un seul champ numerique par ligne", () => {
    // Deux champs cote a cote ont deja produit une saisie a 27 000 kcal :
    // le client remplissait celui qu'il ne fallait pas.
    const bloc = ajout.slice(ajout.indexOf("EditeurQuantitesRepas"), ajout.indexOf("Choix de la portion consommee"));
    const lignesGrille = bloc.match(/gridTemplateColumns: "1fr 82px"/g) || [];
    assert.equal(lignesGrille.length, 1, "la grille des lignes d'aliment a change");
    assert.match(bloc, /enConversion\[i\] \? \([\s\S]{0,600}\) : \(/, "les deux champs doivent s'exclure");
  });
});
