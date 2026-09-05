/**
 * Fibres alimentaires.
 *
 * Deux choses sont verrouillees ici, et ce sont les deux qui peuvent
 * tromper un client :
 *
 * 1. UNE TENEUR INCONNUE N'EST PAS UNE TENEUR NULLE. Compter 0 g sur un
 *    aliment dont on ignore la teneur donne un total du jour faussement
 *    bas, et un client qui se croit en deficit permanent.
 * 2. LES FIBRES S'AJOUTENT AUX GLUCIDES, elles n'en font pas partie. Le
 *    catalogue suit la convention europeenne — glucides nets. Confondre
 *    avec la convention americaine ferait compter les fibres deux fois.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FIBRES_PAR_1000_KCAL, fibresPour, mentionEtat, objectifFibres, totalFibres } from "../app/src/lib/fibres.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");

/** Charge les catalogues et la table de fibres dans un faux navigateur. */
function chargerCatalogues() {
  const faux = { fetch: () => {} };
  const contexte = { window: faux, self: faux };
  contexte.window = faux;
  for (const f of [
    "food-extended-catalog.js",
    "food-staples-catalog.js",
    "food-bruts-catalog.js",
    "food-basic-catalog.js",
    "food-fibres.js"
  ]) {
    const source = readFileSync(join(RACINE, f), "utf8");
    new Function("window", "self", source)(faux, faux);
  }
  return { items: faux.__CN_FOOD_ITEMS__ || [], fibres: faux.__CN_FOOD_FIBRES__ || {} };
}

const { items, fibres } = chargerCatalogues();
const parCode = Object.fromEntries(items.map((i) => [i.code, i]));

describe("objectif de fibres", () => {
  test("il suit l'apport calorique, il n'est pas fixe", () => {
    // Un objectif fixe serait trop haut a 1500 kcal et trop bas a 4000.
    assert.ok(objectifFibres(4000) > objectifFibres(1500));
  });

  test("le rapport de reference est respecte dans la plage courante", () => {
    for (const kcal of [1800, 2200, 2600, 3000]) {
      const attendu = Math.round((kcal / 1000) * FIBRES_PAR_1000_KCAL);
      assert.equal(objectifFibres(kcal), attendu, kcal + " kcal");
    }
  });

  test("il reste dans des bornes vivables", () => {
    // Au-dela d'environ 45 g, l'inconfort digestif et la gene a
    // l'absorption des mineraux l'emportent sur le benefice.
    assert.ok(objectifFibres(1000) >= 20, "objectif trop bas pour un petit apport");
    assert.ok(objectifFibres(6000) <= 45, "objectif trop haut pour un gros apport");
  });

  test("sans calories, aucun objectif invente", () => {
    for (const v of [null, 0, undefined, "", -100]) assert.equal(objectifFibres(v), null, String(v));
  });
});

describe("total du jour", () => {
  test("un aliment sans valeur connue ne compte pas pour zero", () => {
    const r = totalFibres([{ fiber: 8 }, { fiber: null }, { fiber: 4 }]);
    assert.equal(r.total, 12);
    assert.equal(r.inconnus, 1);
    assert.equal(r.partiel, true, "le total doit se declarer partiel");
  });

  test("un total complet ne se declare pas partiel", () => {
    const r = totalFibres([{ fiber: 8 }, { fiber: 4 }]);
    assert.equal(r.partiel, false);
    assert.equal(r.connus, 2);
  });

  test("une chaine vide compte comme inconnue, pas comme zero", () => {
    assert.equal(totalFibres([{ fiber: "" }]).inconnus, 1);
    assert.equal(totalFibres([{ fiber: "" }]).total, 0);
    assert.equal(totalFibres([{ fiber: "" }]).partiel, true);
  });

  test("un zero explicite est une information, pas une absence", () => {
    // Une huile contient reellement 0 g de fibres : ce n'est pas la meme
    // chose que de ne pas savoir.
    const r = totalFibres([{ fiber: 0 }, { fiber: 5 }]);
    assert.equal(r.partiel, false);
    assert.equal(r.connus, 2);
    assert.equal(r.total, 5);
  });

  test("une journee vide ne leve pas", () => {
    for (const v of [[], null, undefined]) assert.equal(totalFibres(v).total, 0);
  });
});

describe("teneur pour une quantite", () => {
  test("proportionnelle a la quantite pesee", () => {
    assert.equal(fibresPour(11, 100), 11);
    assert.equal(fibresPour(11, 50), 5.5);
    assert.equal(fibresPour(34, 30), 10.2);
  });

  test("une teneur inconnue le reste, quelle que soit la quantite", () => {
    assert.equal(fibresPour(null, 100), null);
    assert.equal(fibresPour("", 100), null);
  });

  test("sans quantite, aucune valeur inventee", () => {
    assert.equal(fibresPour(11, 0), null);
    assert.equal(fibresPour(11, null), null);
  });
});

describe("table de fibres du catalogue", () => {
  test("chaque code renvoie a un aliment qui existe", () => {
    for (const code of Object.keys(fibres)) {
      assert.ok(parCode[code], "code inconnu du catalogue : " + code);
    }
  });

  test("aucune teneur aberrante", () => {
    for (const [code, g] of Object.entries(fibres)) {
      // Zero est une valeur legitime : un blanc de poulet n'a reellement
      // aucune fibre. C'est l'ABSENCE de la table qui signifie « inconnu ».
      assert.ok(typeof g === "number" && g >= 0, `${code} : teneur invalide (${g})`);
      // Le son de ble, l'aliment le plus dense en fibres, plafonne vers 45 g.
      assert.ok(g <= 50, `${code} : ${g} g pour 100 g, valeur invraisemblable`);
    }
  });

  /**
   * La convention du catalogue est europeenne : glucides NETS, fibres
   * exclues. Une teneur en fibres superieure aux glucides annonces est donc
   * normale — c'est le cas du chia, du lin et du son de ble.
   *
   * Ce test verrouille la convention par l'exemple. S'il tombait, cela
   * voudrait dire que le catalogue est passe aux glucides totaux, et que
   * les fibres seraient desormais comptees deux fois chez le client.
   */
  test("la convention reste « glucides nets, fibres en plus »", () => {
    const chia = parCode["cn-s-x-chia"];
    assert.ok(chia, "graines de chia absentes du catalogue");
    assert.ok(
      fibres["cn-s-x-chia"] > chia.nutriments.carbohydrates_100g,
      "les glucides du chia incluent desormais les fibres : convention changee"
    );
  });

  test("les fibres expliquent l'ecart entre calories annoncees et macros", () => {
    // Sur les aliments tres fibreux, l'ecart doit se refermer en comptant
    // les fibres a 2 kcal/g. Si ce n'etait pas le cas, la teneur inscrite
    // ne correspondrait pas a l'aliment du catalogue.
    for (const code of ["cn-s-x-chia", "cn-s-x-lin", "cn-b-son-ble"]) {
      const n = parCode[code].nutriments;
      const macros = n.proteins_100g * 4 + n.carbohydrates_100g * 4 + n.fat_100g * 9;
      const ecart = n["energy-kcal_100g"] - macros;
      const apportFibres = fibres[code] * 2;
      assert.ok(
        apportFibres > ecart * 0.4,
        `${code} : les fibres (${apportFibres} kcal) n'expliquent pas l'ecart de ${Math.round(ecart)} kcal`
      );
    }
  });

  test("aucun zero explicite n'est pose sur un aliment qui en contient", () => {
    // Un zero est une AFFIRMATION. Le poser a tort ferait disparaitre des
    // fibres reellement consommees du total du jour.
    const zeros = Object.entries(fibres).filter(([, g]) => g === 0);
    assert.ok(zeros.length > 50, "trop peu de zeros explicites : " + zeros.length);
    for (const [code] of zeros) {
      const nom = parCode[code].product_name_fr;
      assert.ok(
        !/legume|lentille|pois|haricot|cereale|pain|fruit|avoine|son |graine|tofu|tempeh|seitan|soja|amande|v[ée]g[ée]tal/i.test(nom),
        `zero pose sur « ${nom} », qui contient des fibres`
      );
    }
  });

  test("une journee de produits animaux n'est pas signalee comme partielle", () => {
    // Sans zeros explicites, poulet - riz - huile serait « partiel » alors
    // que la journee est parfaitement connue, et le signal ne voudrait plus
    // rien dire.
    for (const nom of ["Blanc de poulet", "Huile d’olive", "Yaourt nature"]) {
      const item = items.find((i) => i.product_name_fr === nom);
      assert.ok(item, "absent du catalogue : " + nom);
      assert.equal(fibres[item.code], 0, `${nom} devrait porter un zero explicite`);
    }
  });

  test("la table couvre les aliments qui portent vraiment les fibres", () => {
    for (const code of ["cn-fr-x-lentilles-crues", "cn-fr-x-pois-chiches-crus", "cn-s-x-chia"]) {
      assert.ok(fibres[code], "aliment tres fibreux absent de la table : " + code);
    }
    assert.ok(Object.keys(fibres).length >= 30, "table trop courte pour etre utile");
  });
});

/**
 * Etat de l'aliment : pese cru, ou pese cuit.
 *
 * C'est la plus grosse source d'erreur du journal alimentaire, et la plus
 * silencieuse : le total reste plausible, les macros aussi, et on cherche
 * ailleurs pourquoi la progression ne suit pas.
 */
describe("etat cru / cuit", () => {
  const { etats } = (() => {
    const faux = { fetch: () => {} };
    for (const f of [
      "food-extended-catalog.js",
      "food-staples-catalog.js",
      "food-bruts-catalog.js",
      "food-basic-catalog.js",
      "food-etats.js"
    ]) {
      new Function("window", "self", readFileSync(join(RACINE, f), "utf8"))(faux, faux);
    }
    return { etats: faux.__CN_FOOD_ETATS__ || {} };
  })();

  test("chaque code renvoie a un aliment qui existe", () => {
    for (const code of Object.keys(etats)) {
      assert.ok(parCode[code], "code inconnu du catalogue : " + code);
    }
  });

  test("seuls trois etats existent", () => {
    for (const [code, e] of Object.entries(etats)) {
      assert.ok(["cru", "cuit", "telquel"].includes(e), `${code} : etat « ${e} » inconnu`);
    }
  });

  test("un nom qui dit « cuit » ne peut pas etre marque « cru »", () => {
    for (const [code, e] of Object.entries(etats)) {
      const nom = parCode[code].product_name_fr;
      if (/\bcuit(e|s|es)?\b/i.test(nom)) assert.equal(e, "cuit", nom);
      if (/\bcru(e|s|es)?\b/i.test(nom)) assert.equal(e, "cru", nom);
    }
  });

  /**
   * Le test qui compte. Quand les deux formes d'un meme aliment existent,
   * la forme crue DOIT etre plus calorique que la cuite — la cuisson
   * ajoute de l'eau. Un etat inverse enverrait le client sur un facteur
   * trois dans le mauvais sens.
   */
  test("le cru est toujours plus dense que le cuit", () => {
    const base = (s) =>
      s
        .toLowerCase()
        .replace(/\b(cru|crue|crus|cuit|cuite|cuits|cuites)\b/g, "")
        .replace(/[^a-zà-ÿ ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const parBase = {};
    for (const [code, e] of Object.entries(etats)) {
      const it = parCode[code];
      const b = base(it.product_name_fr);
      (parBase[b] = parBase[b] || []).push({ it, e });
    }

    let paires = 0;
    for (const [nom, liste] of Object.entries(parBase)) {
      const cru = liste.find((x) => x.e === "cru");
      const cuit = liste.find((x) => x.e === "cuit");
      if (!cru || !cuit) continue;
      paires++;
      assert.ok(
        cru.it.nutriments["energy-kcal_100g"] > cuit.it.nutriments["energy-kcal_100g"],
        `« ${nom} » : le cru (${cru.it.nutriments["energy-kcal_100g"]} kcal) devrait ` +
          `depasser le cuit (${cuit.it.nutriments["energy-kcal_100g"]} kcal)`
      );
    }
    assert.ok(paires >= 4, "trop peu de paires cru/cuit comparees : " + paires);
  });

  test("les viandes portent bien la mention, c'est le piege principal", () => {
    // Le client pese apres cuisson ; une viande perd 20 a 30 % de son poids.
    for (const nom of ["Blanc de poulet", "Steak haché 5% MG", "Filet de porc"]) {
      const item = items.find((i) => i.product_name_fr === nom);
      assert.ok(item, "absent du catalogue : " + nom);
      assert.equal(etats[item.code], "cru", nom + " devrait etre marque « cru »");
    }
  });

  test("la mention n'est affichee que quand elle evite une erreur", () => {
    assert.equal(mentionEtat("cru"), "pesé cru");
    assert.equal(mentionEtat("cuit"), "pesé cuit");
    // Pour une huile ou un yaourt, la question ne se pose pas : afficher
    // quelque chose ajouterait du bruit la ou il n'y a aucun risque.
    assert.equal(mentionEtat("telquel"), null);
    assert.equal(mentionEtat(null), null);
    assert.equal(mentionEtat(undefined), null);
  });
});
