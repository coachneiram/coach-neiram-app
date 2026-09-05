/**
 * Idee de repas et estimation d'un aliment libre.
 *
 * L'idee de repas est entierement deterministe : meme article coche, meme
 * profil, meme assiette. Elle se compare donc article par article a
 * index.html — et c'est ce que fait ce fichier, sur les ~200 articles de la
 * liste croises avec une dizaine de profils (objectifs, regimes, allergies).
 *
 * L'estimation d'un aliment libre, elle, depend de trois sources externes.
 * Ce qui est teste ici est l'ORDRE de ces sources et le comportement quand
 * elles echouent : c'est la que se joue la difference entre « une valeur
 * verifiee » et « une valeur inventee par un modele ».
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { articlesAPlat, estimerMacrosLibres, ideeRepasPour } from "../app/src/lib/idee-repas.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

/** Profils couvrant les objectifs, les regimes et les allergies. */
const PROFILS = [
  { goal: "perte" },
  { goal: "prise" },
  { goal: "maintien" },
  {},
  { goal: "perte", dietType: "vegetarien" },
  { goal: "prise", dietType: "vegetarien" },
  { goal: "maintien", dietType: "vegan" },
  { goal: "prise", dietType: "vegan" },
  { goal: "perte", dietType: "sans_gluten" },
  { goal: "prise", allergies: ["lactose"] },
  { goal: "perte", allergies: ["gluten", "lactose"] },
  { goal: "prise", dietType: "vegan", allergies: ["fruits_a_coque"] }
];

const nu = (v) => JSON.parse(JSON.stringify(v));

describe("liste de courses a plat", () => {
  test("identique a index.html", () => {
    assert.deepEqual(articlesAPlat(), nu(legacy.shoppingFlat()));
  });

  test("chaque article porte un rayon et herite d'un role", () => {
    const aPlat = articlesAPlat();
    assert.ok(aPlat.length > 100, `liste anormalement courte : ${aPlat.length}`);
    for (const it of aPlat) assert.ok(it.catId, `article sans rayon : ${it.n}`);
  });
});

describe("idee de repas", () => {
  test("identique a index.html pour chaque article et chaque profil", () => {
    let comparees = 0;
    let nonNulles = 0;
    for (const profil of PROFILS) {
      for (const article of articlesAPlat()) {
        const attendu = legacy.mealIdeaFor(article, profil);
        const obtenu = ideeRepasPour(article, profil);
        assert.deepEqual(
          nu(obtenu),
          nu(attendu),
          `article « ${article.n} », profil ${JSON.stringify(profil)}`
        );
        comparees++;
        if (obtenu) nonNulles++;
      }
    }
    // Sans ce garde-fou, deux fonctions qui rendraient toujours null
    // passeraient le test en silence.
    assert.ok(comparees > 1000, `trop peu de comparaisons : ${comparees}`);
    assert.ok(nonNulles > 300, `trop peu d'idees non nulles : ${nonNulles}`);
  });

  test("un article sans role ni valeurs ne donne pas d'idee", () => {
    assert.equal(ideeRepasPour({ n: "Liquide vaisselle" }, { goal: "perte" }), null);
    assert.equal(ideeRepasPour({ n: "Poulet", role: "proteine" }, { goal: "perte" }), null);
    assert.equal(ideeRepasPour(null, { goal: "perte" }), null);
  });

  /**
   * Le garde-fou « it.n !== articleBase.n » de ideeRepasPour est aujourd'hui
   * INATTEIGNABLE : les roles cherches excluent deja celui de l'article coche,
   * et aucun nom de la liste ne porte deux roles. Le supprimer ne change donc
   * rien — verifie par mutation.
   *
   * Ce test ne valide pas le garde-fou, il verrouille la condition qui le rend
   * inutile. Le jour ou un meme aliment apparaitra dans deux rayons avec deux
   * roles, ce test tombera, et le garde-fou reprendra son sens.
   */
  test("aucun nom d'article ne porte deux roles differents", () => {
    const parNom = new Map();
    for (const it of articlesAPlat()) {
      if (!parNom.has(it.n)) parNom.set(it.n, new Set());
      parNom.get(it.n).add(it.role);
    }
    const doubles = [...parNom].filter(([, roles]) => roles.size > 1);
    assert.deepEqual(doubles, [], "un nom porte plusieurs roles : le garde-fou devient necessaire");
  });

  test("l'article coche n'est jamais propose en complement de lui-meme", () => {
    for (const profil of PROFILS) {
      for (const article of articlesAPlat()) {
        const idee = ideeRepasPour(article, profil);
        if (!idee) continue;
        assert.ok(
          !idee.picks.some((p) => p.item.n === article.n),
          `« ${article.n} » se propose lui-meme`
        );
      }
    }
  });

  test("un fruit donne une collation, pas une assiette complete", () => {
    const fruit = articlesAPlat().find((it) => it.role === "fruit" && it.kcal != null);
    const idee = ideeRepasPour(fruit, { goal: "maintien" });
    assert.ok(idee, "aucune idee pour un fruit");
    assert.equal(idee.isSnack, true);
    assert.equal(idee.phrase, "collation équilibrée");
    assert.ok(idee.picks.length <= 2, "une collation ne compte pas quatre composants");
  });

  test("les objectifs donnent des formulations distinctes", () => {
    const base = articlesAPlat().find((it) => it.role === "proteine" && it.kcal != null);
    const phrases = ["perte", "prise", "maintien"].map((goal) => ideeRepasPour(base, { goal }).phrase);
    assert.equal(new Set(phrases).size, 3, `phrases identiques : ${phrases}`);
  });

  test("aucun complement incompatible avec le regime du client", () => {
    const profil = { goal: "prise", dietType: "vegan" };
    for (const article of articlesAPlat()) {
      const idee = ideeRepasPour(article, profil);
      if (!idee) continue;
      for (const p of idee.picks) {
        assert.ok(
          legacy.shoppingDietOk(p.item, profil),
          `« ${p.item.n} » propose a un client vegan (via « ${article.n} »)`
        );
      }
    }
  });

  test("le total annonce correspond aux portions listees", () => {
    const base = articlesAPlat().find((it) => it.role === "proteine" && it.kcal != null);
    const idee = ideeRepasPour(base, { goal: "prise" });
    const attendu = Math.round(
      [{ item: base, portion: legacy.ROLE_PORTIONS[base.role] }, ...idee.picks].reduce(
        (a, x) => a + (x.item.kcal * x.portion) / 100,
        0
      )
    );
    assert.equal(idee.totalKcal, attendu);
  });
});

/** Reponse IA fixee, reseau OFF coupe. */
function avecIA(texte, fn, { offRepond = null } = {}) {
  const vrai = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("openfoodfacts")) {
      if (!offRepond) throw new Error("hors ligne");
      return { ok: true, json: async () => offRepond };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: texte }] } }] })
    };
  };
  return Promise.resolve(fn()).finally(() => {
    globalThis.fetch = vrai;
  });
}

describe("estimation d'un aliment ajoute a la main", () => {
  test("le catalogue local passe avant tout appel reseau", async () => {
    let reseau = false;
    globalThis.fetch = async () => {
      reseau = true;
      throw new Error("le reseau ne doit pas etre sollicite");
    };
    const r = await estimerMacrosLibres("Blanc de poulet");
    assert.equal(r.source, "local");
    assert.equal(reseau, false, "un aliment connu localement ne doit declencher aucun appel");
  });

  test("la correspondance locale marche dans les deux sens", async () => {
    globalThis.fetch = async () => {
      throw new Error("hors ligne");
    };
    for (const saisie of ["poulet", "Blanc de poulet fermier"]) {
      const r = await estimerMacrosLibres(saisie);
      assert.equal(r && r.source, "local", `« ${saisie} » aurait du etre reconnu localement`);
    }
  });

  test("moins de trois lettres ne declenche pas la recherche locale", async () => {
    await avecIA('{"kcal":null}', async () => {
      assert.equal(await estimerMacrosLibres("ri"), null);
    });
  });

  test("un aliment inconnu localement passe par Open Food Facts", async () => {
    const off = {
      products: [
        {
          code: "1",
          product_name_fr: "Zwiebelmettwurst",
          nutriments: { "energy-kcal_100g": 310, proteins_100g: 14, carbohydrates_100g: 2, fat_100g: 27 }
        }
      ]
    };
    await avecIA(
      '{"kcal":999}',
      async () => {
        const r = await estimerMacrosLibres("Zwiebelmettwurst");
        assert.equal(r.source, "off", "Open Food Facts doit primer sur l'IA");
        assert.equal(r.kcal, 310);
      },
      { offRepond: off }
    );
  });

  test("l'IA n'intervient qu'en dernier, et sa source est marquee", async () => {
    await avecIA('{"kcal":123,"p":4.44,"c":5.55,"f":6.66}', async () => {
      const r = await estimerMacrosLibres("Zwiebelmettwurst");
      assert.equal(r.source, "ia");
      assert.equal(r.kcal, 123);
      // Arrondis conserves : kcal a l'entier, macros au dixieme.
      assert.equal(r.p, 4.4);
      assert.equal(r.c, 5.6);
      assert.equal(r.f, 6.7);
    });
  });

  test("« ce n'est pas un aliment » rend null, jamais des valeurs inventees", async () => {
    await avecIA('{"kcal":null}', async () => {
      assert.equal(await estimerMacrosLibres("Zwiebelmettwurst"), null);
    });
  });

  test("toutes les sources muettes rendent null sans lever", async () => {
    globalThis.fetch = async () => {
      throw new Error("hors ligne");
    };
    assert.equal(await estimerMacrosLibres("Zwiebelmettwurst"), null);
  });
});
