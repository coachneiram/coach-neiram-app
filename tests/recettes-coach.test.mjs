/**
 * Recettes du coach : le catalogue dit vrai, et chaque client ne voit que
 * ce qu'il peut manger.
 *
 * Ce fichier est le garde-fou de la routine hebdomadaire : toute recette
 * ajoutee au catalogue passe par « chaque recette du catalogue est
 * publiable ». Une recette etiquetee vegan avec du miel, sans porc avec des
 * lardons, ou dont les calories ne collent pas aux macros fait echouer les
 * tests, donc la pull request.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { RECETTES_COACH } from "../app/src/lib/recettes-coach-catalogue.js";
import {
  PROFILS_RECETTE,
  profilsDuClient,
  recetteCompatible,
  recettesPourClient,
  verifierRecette,
  versRecetteClient
} from "../app/src/lib/recettes-coach.js";
import { EXCLUSIONS, RESTRICTIONS, etiquettesArticle, resumeRegime } from "../app/src/lib/regimes.js";
import { articleCoursesOk } from "../app/src/lib/aliments.js";
import { enregistrerRecette, estRecette } from "../app/src/lib/repas-types.js";
import { EQUIV_GLUCIDES, EQUIV_LIPIDES, EQUIV_PROTEINES, EQUIV_FRUITS, SHOPPING_LIST, SUGGESTIONS } from "../app/src/lib/catalogues.js";

const base = RECETTES_COACH[0];
const variante = (modif) => ({ ...base, ...modif });
const erreurs = (r) => verifierRecette(r).join(" | ");

describe("Le catalogue", () => {
  test("chaque recette du catalogue est publiable", () => {
    for (const r of RECETTES_COACH) assert.deepEqual(verifierRecette(r), [], `${r.id} : ${erreurs(r)}`);
  });

  test("identifiants et noms uniques (pas de doublon)", () => {
    assert.equal(new Set(RECETTES_COACH.map((r) => r.id)).size, RECETTES_COACH.length);
    const noms = RECETTES_COACH.map((r) => r.nom.toLowerCase().normalize("NFD").replace(/\p{M}/gu, ""));
    assert.equal(new Set(noms).size, noms.length);
  });

  test("le fichier reste du JSON strict entre les crochets, relisible par un script", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../app/src/lib/recettes-coach-catalogue.js", import.meta.url), "utf8");
    const json = src.slice(src.indexOf("= [") + 2, src.lastIndexOf("]") + 1);
    assert.deepEqual(JSON.parse(json), RECETTES_COACH);
  });
});

describe("Une recette qui ment est refusee", () => {
  test("vegan avec du miel, du beurre, des œufs ou du lait de vache", () => {
    const vegan = { regimes: ["vegan", "vegetarien", "sans-porc"], contient: [] };
    for (const nom of ["Miel", "Beurre doux", "Œufs", "Lait demi-écrémé", "Fromage blanc", "Crème fraîche"]) {
      const r = variante({ ...vegan, ingredients: [...base.ingredients, { nom, quantite: "10 g" }] });
      assert.match(erreurs(r), /vegan/, nom);
    }
  });

  test("les alternatives vegetales ne sont pas des faux positifs", () => {
    const vegan = { regimes: ["vegan", "vegetarien", "sans-porc"], contient: [] };
    for (const nom of ["Lait de coco", "Lait d'avoine", "Lait de soja", "Beurre de cacahuète", "Crème de coco", "Persil haché"]) {
      const r = variante({ ...vegan, ingredients: [...base.ingredients, { nom, quantite: "10 g" }] });
      assert.deepEqual(verifierRecette(r), [], nom);
    }
  });

  test("sans porc avec un derive du porc", () => {
    for (const nom of ["Lardons fumés", "Jambon blanc", "Chorizo", "Gélatine", "Saucisses", "Bacon"]) {
      const r = variante({ regimes: ["sans-porc"], contient: [], ingredients: [...base.ingredients, { nom, quantite: "50 g" }] });
      assert.match(erreurs(r), /sans-porc/, nom);
    }
  });

  test("vegetarien avec de la viande ou du poisson, y compris par l'etiquette", () => {
    const r = variante({ regimes: ["vegetarien", "sans-porc"], ingredients: [...base.ingredients, { nom: "Thon en boîte", quantite: "1" }] });
    assert.match(erreurs(r), /vegetarien/);
    assert.match(erreurs(variante({ regimes: ["vegetarien", "sans-porc"], contient: ["poisson"] })), /contient poisson/);
  });

  test("regimes coherents entre eux : vegan implique vegetarien et sans porc", () => {
    assert.match(erreurs(variante({ regimes: ["vegan"] })), /vegan implique/);
    assert.match(erreurs(variante({ regimes: ["vegetarien"] })), /vegetarien implique/);
  });

  test("calories incoherentes avec les macros", () => {
    assert.match(erreurs(variante({ parPortion: { ...base.parPortion, kcal: 900 } })), /calories incohérentes/);
  });

  test("champs inconnus ou manquants", () => {
    assert.match(erreurs(variante({ profils: ["powerlifter"] })), /profil inconnu/);
    assert.match(erreurs(variante({ categorie: "brunch" })), /categorie/);
    assert.match(erreurs(variante({ etapes: ["Tout mélanger."] })), /2 étapes/);
    assert.match(erreurs(variante({ id: "dahl" })), /id/);
    assert.match(erreurs(variante({ parPortion: { kcal: 500, p: 20, c: 70, f: 12 } })), /fibres/);
  });
});

describe("Ce que voit chaque client", () => {
  const ids = (liste) => liste.map((r) => r.id);
  const DAHL = "2026-10-01-dahl-lentilles-corail-epinards";
  const BOWL = "2026-10-01-bowl-poulet-haricots-rouges";
  const OATS = "2026-10-01-overnight-oats-banane-cacahuete";

  // Les attentes se calculent sur le catalogue reel : la routine ajoute des
  // recettes chaque semaine, un test qui fige le catalogue de depart
  // echouerait a chaque ajout sans rien prouver.
  const triee = (liste) => [...liste].sort();

  test("vegan : seulement le vegan, et tout le vegan", () => {
    const vus = ids(recettesPourClient(RECETTES_COACH, { dietType: "vegetalien", allergies: [] }));
    const vegan = RECETTES_COACH.filter((r) => r.regimes.includes("vegan")).map((r) => r.id);
    assert.ok(vus.includes(DAHL));
    assert.deepEqual(triee(vus), triee(vegan));
  });

  test("vegetarien : pas de poulet", () => {
    assert.ok(!ids(recettesPourClient(RECETTES_COACH, { dietType: "vegetarien", allergies: [] })).includes(BOWL));
  });

  test("sans porc : une recette non declaree sans porc n'apparait pas", () => {
    const porc = variante({ id: "2026-10-01-quiche", nom: "Quiche", regimes: [], contient: ["porc", "oeufs"] });
    const vus = ids(recettesPourClient([...RECETTES_COACH, porc], { dietType: "sans-porc", allergies: [] }));
    assert.ok(!vus.includes("2026-10-01-quiche"));
    assert.ok(vus.includes(BOWL));
  });

  test("les allergies passent avant tout", () => {
    assert.ok(!ids(recettesPourClient(RECETTES_COACH, { allergies: ["arachides"] })).includes(OATS));
    assert.ok(!ids(recettesPourClient(RECETTES_COACH, { allergies: ["gluten"] })).includes(OATS));
  });

  test("pescetarien : pas de volaille", () => {
    assert.ok(!recetteCompatible(RECETTES_COACH.find((r) => r.id === BOWL), { dietType: "pescetarien", allergies: [] }));
  });

  test("keto : pas de recette riche en glucides", () => {
    const vus = recettesPourClient(RECETTES_COACH, { dietType: "keto", allergies: [] });
    assert.ok(vus.every((r) => r.parPortion.c <= 15));
    assert.ok(!ids(vus).includes(DAHL));
    assert.deepEqual(triee(ids(vus)), triee(RECETTES_COACH.filter((r) => r.parPortion.c <= 15).map((r) => r.id)));
  });

  test("l'objectif du client passe en premier, « pour toi » filtre", () => {
    const perf = { goal: "performance", allergies: [] };
    assert.deepEqual(profilsDuClient(perf), ["force", "bodybuilding", "hyrox", "marathon", "ironman"]);
    assert.notEqual(recettesPourClient(RECETTES_COACH, perf)[0].id, DAHL);
    assert.ok(!ids(recettesPourClient(RECETTES_COACH, perf, "pour-toi")).includes(DAHL));
    const marathon = ids(recettesPourClient(RECETTES_COACH, perf, "marathon"));
    assert.ok(marathon.includes(OATS));
    assert.deepEqual(triee(marathon), triee(RECETTES_COACH.filter((r) => r.profils.includes("marathon")).map((r) => r.id)));
  });

  test("profils : neuf objectifs, « force » couvre powerlifting et force athletique", () => {
    assert.equal(PROFILS_RECETTE.length, 9);
    assert.ok(PROFILS_RECETTE.some((p) => p.id === "force"));
  });
});

describe("Ajout aux recettes du client", () => {
  test("macros de la recette entiere, parts = portions, origine retenue", () => {
    const dahl = RECETTES_COACH[0];
    const liste = enregistrerRecette([], versRecetteClient(dahl));
    assert.equal(liste.length, 1);
    const r = liste[0];
    assert.ok(estRecette(r));
    assert.equal(r.portions, 2);
    assert.equal(r.origine, dahl.id);
    assert.equal(r.items[0].calories, dahl.parPortion.kcal * 2);
    assert.equal(r.items[0].protein, dahl.parPortion.p * 2);
  });
});

describe("Regime sans porc dans le profil", () => {
  test("propose, et exclut l'etiquette porc", () => {
    assert.ok(RESTRICTIONS.some((r) => r.id === "sans-porc" && r.label === "Sans porc"));
    assert.deepEqual(EXCLUSIONS["sans-porc"], ["porc"]);
    assert.equal(resumeRegime({ dietType: "sans-porc" }), "Sans porc");
  });

  test("aucune liste filtree ne contient de porc sans l'etiquette « porc »", () => {
    const porc = /(?<!\p{L})(porc|jambon|lardons?|bacon|chorizo|saucisson|saucisses?|rillettes|lard)(?!\p{L})/iu;
    const lignes = [
      ...SUGGESTIONS.map((s) => [s.name, s.contains]),
      ...[EQUIV_GLUCIDES, EQUIV_LIPIDES, EQUIV_PROTEINES, EQUIV_FRUITS].flat().map((r) => [r[0], r[2]]),
      // La liste de courses est figee a l'identique de index.html : ses
      // etiquettes « porc » viennent de ETIQUETTES_AJOUTEES.
      ...SHOPPING_LIST.flatMap((rayon) => (rayon.items || []).map((it) => [it.n, etiquettesArticle(it)]))
    ];
    for (const [nom, contient] of lignes) {
      if (porc.test(String(nom))) assert.ok((contient || []).includes("porc"), `${nom} sans étiquette porc`);
    }
  });

  test("liste de courses et idees de repas : le jambon disparait en sans porc, pas ailleurs", () => {
    const jambon = SHOPPING_LIST.flatMap((r) => r.items).find((it) => it.n === "Jambon blanc découenné");
    assert.equal(articleCoursesOk(jambon, { dietType: "sans-porc", allergies: [] }), false);
    assert.equal(articleCoursesOk(jambon, { dietType: "aucun", allergies: [] }), true);
    assert.equal(articleCoursesOk(jambon, { dietType: "pescetarien", allergies: [] }), false);
  });
});
