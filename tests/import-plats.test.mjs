/**
 * Importer un aliment dans « Mes plats ».
 *
 * REGRESSION DE LA BASCULE, remontee par Marien avec une capture :
 * « Je ne peux plus importer mes aliments ».
 *
 * Le bouton « Importer un aliment — recherche, photo IA ou code-barres »
 * etait bien affiche, avec son libelle complet, mais n'ouvrait RIEN :
 * mon portage l'avait laisse en attente derriere une prop onImporter que
 * personne ne fournissait. Un bouton qui annonce trois fonctionnalites et
 * n'en fait aucune est pire qu'un bouton absent.
 *
 * L'application d'origine ouvre une modale « Importer un aliment »
 * contenant le meme selecteur que le Journal, et ajoute l'aliment choisi
 * aux plats.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (c) => readFileSync(join(ICI, "..", c), "utf8");

const plats = lire("app/src/ecrans/Plats.jsx");
const repas = lire("app/src/ecrans/Repas.jsx");
const legacy = lire("index.html");

describe("le bouton ouvre enfin quelque chose", () => {
  test("il n'est plus branche sur une prop que personne ne fournit", () => {
    assert.ok(!/onClick=\{onImporter\}/.test(plats), "onImporter n'etait jamais fourni");
    assert.match(plats, /onClick=\{\(\) => setImportOuvert\(true\)\}/);
  });

  test("le libelle est celui de l'application d'origine", () => {
    const texte = "Importer un aliment — recherche, photo IA ou code-barres";
    assert.ok(plats.includes(texte), "le libelle du bouton a change");
    assert.ok(legacy.includes("Importer un aliment \\u2014 recherche, photo IA ou code-barres"));
  });

  test("la modale porte le titre d'origine et contient le selecteur", () => {
    assert.match(plats, /title="Importer un aliment"/);
    assert.match(plats, /<RechercheAliment onChoisir=\{importer\}/);
    assert.ok(legacy.includes('title: "Importer un aliment"'));
  });

  test("les trois voies annoncees sont bien celles du selecteur", () => {
    // Le bouton promet recherche, photo IA et code-barres : le selecteur
    // doit reellement les proposer, sinon le libelle ment.
    const selecteur = lire("app/src/ecrans/RechercheAliment.jsx");
    assert.match(selecteur, /"Recherche"/);
    assert.match(selecteur, /"Photo IA"/);
    assert.match(selecteur, /"Code-barres"/);
  });
});

describe("ce qui est enregistre", () => {
  test("l'aliment est repris tel quel, comme dans l'original", () => {
    // L'original fait `await api.add(item)` sans rien filtrer. Le nom porte
    // deja la quantite (« Riz basmati (100 g) ») et le champ grams va avec :
    // en retirer un seul rend le plat incoherent avec son propre libelle.
    assert.match(plats, /const importer = async \(aliment\) => \{\s*await api\.add\(aliment\);/);
    assert.ok(legacy.includes("await api.add(item);"), "l'original ajoute bien l'objet entier");
  });

  test("la modale se referme apres l'import", () => {
    assert.match(plats, /await api\.add\(aliment\);\s*setImportOuvert\(false\);/);
  });
});

describe("branchement depuis l'ecran Repas", () => {
  test("l'habitude de pesee du client est transmise au selecteur", () => {
    // Sans elle, un client qui pese cru voit d'abord les fiches « cuit ».
    assert.match(repas, /<Plats api=\{api\} habitudePesee=\{profile\?\.weighsStaples\} \/>/);
    assert.match(plats, /habitudePesee=\{habitudePesee\}/);
  });
});
