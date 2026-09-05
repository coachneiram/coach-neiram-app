/**
 * Reconnaissance d'un aliment par photo ou code-barres.
 *
 * L'appel au modele n'est pas testable : il depend d'un service distant et
 * la reponse n'est pas deterministe. Ce qui l'est, et ce qui casse en
 * pratique, c'est TOUT CE QUI ENTOURE l'appel :
 *
 * - l'extraction du JSON d'une reponse bavarde,
 * - la normalisation du resultat (valeurs manquantes, texte a la place d'un
 *   nombre),
 * - l'extraction du code-barres d'une reponse en texte libre,
 * - le repli du lecteur natif vers l'IA.
 *
 * Ce sont ces quatre points que ce fichier verrouille, en comparant, quand
 * c'est possible, au comportement de index.html.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import {
  analyserPhotoRepas,
  extraireObjetJson,
  lireCodeBarres,
  retirerBalisesJson
} from "../app/src/lib/photo-aliment.js";
import { chercherParCodeBarres } from "../app/src/lib/recherche-aliments.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

/** Reponses reellement rencontrees, plus quelques formes limites. */
const REPONSES = [
  '{"name":"Poulet riz","calories":520}',
  '```json\n{"name":"Poulet riz","calories":520}\n```',
  'Voici l\'analyse : {"name":"Poulet riz","calories":520} J\'espere que cela aide.',
  '```\n{"a":1}\n```',
  "aucun objet ici",
  "{",
  "}{",
  '{"imbrique":{"a":1}} et du texte',
  "",
  '   {"a":1}   '
];

describe("extraction du JSON d'une reponse IA", () => {
  test("identique a index.html sur toutes les formes", () => {
    for (const r of REPONSES) {
      assert.equal(extraireObjetJson(r), legacy.extractJsonObject(r), `reponse : ${JSON.stringify(r)}`);
      assert.equal(retirerBalisesJson(r), legacy.stripJsonFences(r), `reponse : ${JSON.stringify(r)}`);
    }
  });

  test("une reponse bavarde reste analysable", () => {
    const brut = 'Bien sur ! {"name":"Salade","calories":210} Bon appetit.';
    assert.deepEqual(JSON.parse(extraireObjetJson(brut)), { name: "Salade", calories: 210 });
  });

  test("sans accolade, le texte est rendu tel quel plutot que perdu", () => {
    assert.equal(extraireObjetJson("NONE"), "NONE");
  });
});

/** Remplace l'appel au modele par une reponse fixee. */
function avecReponseIA(texte, fn) {
  return import("../app/src/lib/ia.js").then(async (ia) => {
    const vrai = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: texte }] } }] })
    });
    try {
      return await fn(ia);
    } finally {
      globalThis.fetch = vrai;
    }
  });
}

describe("analyse d'une photo de repas", () => {
  test("un resultat complet est repris tel quel", async () => {
    await avecReponseIA(
      '{"name":"Poulet riz brocolis","portion":"une assiette","calories":520,"protein":42,"carbs":58,"fat":11,"confidence":"moyenne"}',
      async () => {
        const r = await analyserPhotoRepas("data:image/jpeg;base64,AAAA");
        assert.deepEqual(r, {
          name: "Poulet riz brocolis",
          portion: "une assiette",
          calories: 520,
          protein: 42,
          carbs: 58,
          fat: 11,
          confidence: "moyenne"
        });
      }
    );
  });

  test("les champs manquants prennent des valeurs affichables, jamais undefined", async () => {
    await avecReponseIA("{}", async () => {
      const r = await analyserPhotoRepas("data:image/jpeg;base64,AAAA");
      assert.equal(r.name, "Repas (photo)");
      assert.equal(r.portion, "");
      assert.equal(r.confidence, "moyenne");
      for (const k of ["calories", "protein", "carbs", "fat"]) {
        assert.equal(r[k], 0, `${k} doit valoir 0 et non NaN`);
      }
    });
  });

  test("un nombre rendu en texte est converti, pas propage en NaN", async () => {
    await avecReponseIA('{"calories":"520","protein":"42.4"}', async () => {
      const r = await analyserPhotoRepas("data:image/jpeg;base64,AAAA");
      assert.equal(r.calories, 520);
      // Les grammes sont arrondis a l'entier, comme dans index.html.
      assert.equal(r.protein, 42);
    });
  });

  test("une reponse qui n'est pas du JSON leve, plutot que d'inventer un repas", async () => {
    await avecReponseIA("Je ne peux pas analyser cette image.", async () => {
      await assert.rejects(() => analyserPhotoRepas("data:image/jpeg;base64,AAAA"));
    });
  });
});

describe("lecture d'un code-barres", () => {
  const faireEnv = (detecte) => ({
    BarcodeDetector: class {
      async detect() {
        if (detecte === "erreur") throw new Error("detector");
        return detecte ? [{ rawValue: detecte }] : [];
      }
    },
    Image: class {
      set src(_v) {
        setTimeout(() => this.onload && this.onload(), 0);
      }
    }
  });

  test("le lecteur natif est prefere quand il trouve", async () => {
    let appelIA = false;
    globalThis.fetch = async () => {
      appelIA = true;
      throw new Error("l'IA ne doit pas etre appelee");
    };
    const code = await lireCodeBarres("data:image/jpeg;base64,AAAA", faireEnv("3017620422003"));
    assert.equal(code, "3017620422003");
    assert.equal(appelIA, false, "un lecteur natif qui trouve rend l'appel IA inutile");
  });

  test("un lecteur natif en echec bascule sur l'IA au lieu d'abandonner", async () => {
    await avecReponseIA("Le code est 3017620422003.", async () => {
      const code = await lireCodeBarres("data:image/jpeg;base64,AAAA", faireEnv("erreur"));
      assert.equal(code, "3017620422003");
    });
  });

  test("les chiffres sont extraits d'une reponse en texte libre", async () => {
    await avecReponseIA("  30 176 204 220 03  ", async () => {
      const code = await lireCodeBarres("data:image/jpeg;base64,AAAA", faireEnv(null));
      assert.equal(code, "3017620422003");
    });
  });

  test("un code illisible rend null, jamais une chaine bidon", async () => {
    await avecReponseIA("NONE", async () => {
      const code = await lireCodeBarres("data:image/jpeg;base64,AAAA", faireEnv(null));
      assert.equal(code, null);
    });
  });

  test("une suite de moins de 8 chiffres n'est pas un code-barres", async () => {
    await avecReponseIA("1234567", async () => {
      assert.equal(await lireCodeBarres("data:image/jpeg;base64,AAAA", faireEnv(null)), null);
    });
  });
});

describe("fiche produit par code-barres", () => {
  const fiche = {
    code: "3017620422003",
    product_name_fr: "Pâte à tartiner",
    brands: "Nutella,Ferrero",
    nutriments: { "energy-kcal_100g": 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 },
    serving_quantity: "15"
  };
  const env = (reponse) => ({ fetch: async () => reponse });

  test("la fiche est convertie comme dans index.html", async () => {
    const r = await chercherParCodeBarres(
      "3017620422003",
      env({ ok: true, json: async () => ({ product: fiche }) })
    );
    assert.deepEqual(r, JSON.parse(JSON.stringify(legacy.mapOFFProduct(fiche))));
  });

  test("un code inconnu rend null", async () => {
    assert.equal(await chercherParCodeBarres("0", env({ ok: true, json: async () => ({}) })), null);
    assert.equal(await chercherParCodeBarres("0", env({ ok: false })), null);
  });

  test("une fiche sans calories est refusee plutot qu'ajoutee a 0 kcal", async () => {
    const sansKcal = { ...fiche, nutriments: { proteins_100g: 6.3 } };
    assert.equal(
      await chercherParCodeBarres("x", env({ ok: true, json: async () => ({ product: sansKcal }) })),
      null
    );
  });

  test("le code est echappe dans l'URL", async () => {
    let vue = "";
    await chercherParCodeBarres("a/b?c", {
      fetch: async (u) => {
        vue = u;
        return { ok: true, json: async () => ({}) };
      }
    });
    assert.ok(vue.includes("a%2Fb%3Fc"), `URL non echappee : ${vue}`);
  });
});
