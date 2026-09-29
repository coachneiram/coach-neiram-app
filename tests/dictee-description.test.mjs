/**
 * Repas decrit en mots (tape ou dicte), et badges Nutri-Score / NOVA.
 *
 * Deux ajouts de la recherche d'aliments, d'apres MyFitnessPal, Lifesum et
 * Yuka. Ces tests verrouillent :
 * - la dictee : francais, texte reconnu au fil de la parole, erreurs
 *   traduites, et rien du tout quand le navigateur ne sait pas dicter ;
 * - l'estimation IA d'une description : meme format et memes garde-fous
 *   que la photo ;
 * - la lecture du Nutri-Score et du groupe NOVA : jamais de badge invente.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  completerTexte,
  demarrerDictee,
  messageErreurDictee,
  moteurDictee,
  transcription
} from "../app/src/lib/dictee.js";
import {
  LONGUEUR_MAX_DESCRIPTION,
  analyserDescriptionRepas,
  consigneDescription
} from "../app/src/lib/photo-aliment.js";
import {
  chercherAliments,
  chercherParCodeBarres,
  convertirProduitOFF,
  novaDe,
  nutriScoreDe
} from "../app/src/lib/recherche-aliments.js";

/** Faux moteur de reconnaissance vocale, pilotable depuis le test. */
function fauxMoteur() {
  const instances = [];
  class Moteur {
    constructor() {
      this.demarre = false;
      this.arrete = false;
      instances.push(this);
    }
    start() {
      this.demarre = true;
    }
    stop() {
      this.arrete = true;
      this.onend && this.onend();
    }
  }
  return { Moteur, instances };
}

const resultat = (...segments) => segments.map((t) => [{ transcript: t }]);

describe("Dictee vocale", () => {
  test("le moteur standard ou prefixe webkit est reconnu ; sinon aucun", () => {
    const A = function () {};
    const B = function () {};
    assert.equal(moteurDictee({ SpeechRecognition: A }), A);
    assert.equal(moteurDictee({ webkitSpeechRecognition: B }), B);
    assert.equal(moteurDictee({}), null);
    assert.equal(moteurDictee(undefined), null);
  });

  test("sans moteur, rien ne demarre", () => {
    assert.equal(demarrerDictee({ surTexte() {} }, {}), null);
  });

  test("ecoute en francais, avec le texte au fil de la parole", () => {
    const { Moteur, instances } = fauxMoteur();
    const recus = [];
    const arreter = demarrerDictee({ surTexte: (t) => recus.push(t) }, { webkitSpeechRecognition: Moteur });
    const reco = instances[0];
    assert.equal(typeof arreter, "function");
    assert.equal(reco.lang, "fr-FR");
    assert.equal(reco.interimResults, true);
    assert.equal(reco.demarre, true);
    reco.onresult({ results: resultat("deux oeufs") });
    reco.onresult({ results: resultat("deux oeufs", " et une tartine ") });
    assert.deepEqual(recus, ["deux oeufs", "deux oeufs et une tartine"]);
  });

  test("arreter coupe le micro et previent la fin", () => {
    const { Moteur, instances } = fauxMoteur();
    let fini = 0;
    const arreter = demarrerDictee({ surFin: () => fini++ }, { SpeechRecognition: Moteur });
    arreter();
    assert.equal(instances[0].arrete, true);
    assert.equal(fini, 1);
  });

  test("une erreur est traduite ; un arret volontaire ne l'est pas", () => {
    const { Moteur, instances } = fauxMoteur();
    const erreurs = [];
    demarrerDictee({ surErreur: (m) => erreurs.push(m) }, { SpeechRecognition: Moteur });
    instances[0].onerror({ error: "not-allowed" });
    instances[0].onerror({ error: "aborted" });
    assert.equal(erreurs.length, 1);
    assert.match(erreurs[0], /Micro refusé/);
  });

  test("messages d'erreur", () => {
    assert.match(messageErreurDictee("no-speech"), /rien entendu/);
    assert.match(messageErreurDictee("audio-capture"), /Aucun micro/);
    assert.match(messageErreurDictee("network"), /sans connexion/);
    assert.match(messageErreurDictee("autre-chose"), /Dictée indisponible/);
    assert.equal(messageErreurDictee("aborted"), null);
  });

  test("un demarrage refuse par le navigateur ne laisse pas le bouton bloque", () => {
    class Refuse {
      start() {
        throw new Error("InvalidStateError");
      }
    }
    let fini = 0;
    assert.equal(demarrerDictee({ surFin: () => fini++ }, { SpeechRecognition: Refuse }), null);
    assert.equal(fini, 1);
  });

  test("transcription : meilleure hypothese de chaque segment, espaces nettoyes", () => {
    assert.equal(transcription(resultat(" riz ", "poulet")), "riz poulet");
    assert.equal(transcription([]), "");
    assert.equal(transcription(undefined), "");
  });

  test("la dictee complete ce qui etait deja ecrit, sans l'effacer", () => {
    assert.equal(completerTexte("Salade", "et du pain"), "Salade et du pain");
    assert.equal(completerTexte("", "du riz"), "du riz");
    assert.equal(completerTexte("Salade", ""), "Salade");
  });
});

/** Remplace l'appel au modele par une reponse fixee, et garde la requete. */
async function avecReponseIA(texte, fn) {
  const vrai = globalThis.fetch;
  const requetes = [];
  globalThis.fetch = async (url, options) => {
    requetes.push(JSON.parse(options.body));
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: texte }] } }] })
    };
  };
  try {
    return await fn(requetes);
  } finally {
    globalThis.fetch = vrai;
  }
}

describe("Estimation d'un repas decrit en mots", () => {
  test("la description est transmise au modele, sans image", async () => {
    await avecReponseIA(
      '{"name":"Oeufs et tartine","portion":"2 oeufs, 1 tranche","calories":310,"protein":17,"carbs":20,"fat":18,"confidence":"moyenne"}',
      async (requetes) => {
        const r = await analyserDescriptionRepas("deux oeufs brouilles et une tartine");
        assert.deepEqual(r, {
          name: "Oeufs et tartine",
          portion: "2 oeufs, 1 tranche",
          calories: 310,
          protein: 17,
          carbs: 20,
          fat: 18,
          confidence: "moyenne"
        });
        const envoye = JSON.stringify(requetes[0]);
        assert.match(envoye, /deux oeufs brouilles et une tartine/);
        assert.doesNotMatch(envoye, /inline_data|inlineData/);
      }
    );
  });

  test("valeurs manquantes : un nom par defaut et des zeros, jamais undefined", async () => {
    await avecReponseIA("{}", async () => {
      const r = await analyserDescriptionRepas("un truc");
      assert.equal(r.name, "Repas (description)");
      for (const k of ["calories", "protein", "carbs", "fat"]) assert.equal(r[k], 0);
    });
  });

  test("une reponse qui n'est pas du JSON leve, plutot que d'inventer un repas", async () => {
    await avecReponseIA("Je ne sais pas.", async () => {
      await assert.rejects(() => analyserDescriptionRepas("un repas"));
    });
  });

  test("une description vide n'appelle pas le modele", async () => {
    await avecReponseIA("{}", async (requetes) => {
      await assert.rejects(() => analyserDescriptionRepas("   "), /description-vide/);
      assert.equal(requetes.length, 0);
    });
  });

  test("la consigne signale la dictee et borne la longueur", () => {
    const c = consigneDescription("x".repeat(LONGUEUR_MAX_DESCRIPTION + 200));
    assert.match(c, /dicté à la voix/);
    assert.match(c, /portion courante/);
    assert.ok(c.includes("x".repeat(LONGUEUR_MAX_DESCRIPTION)));
    assert.ok(!c.includes("x".repeat(LONGUEUR_MAX_DESCRIPTION + 1)));
  });
});

describe("Nutri-Score et NOVA", () => {
  test("les lettres a a e, quelle que soit la casse", () => {
    assert.equal(nutriScoreDe({ nutrition_grades: "b" }), "b");
    assert.equal(nutriScoreDe({ nutrition_grades: "E" }), "e");
    assert.equal(nutriScoreDe({ nutriscore_grade: "c" }), "c");
  });

  test("pas de lettre inventee", () => {
    for (const v of ["unknown", "not-applicable", "", "f", null, undefined, "ab"]) {
      assert.equal(nutriScoreDe({ nutrition_grades: v }), null, String(v));
    }
    assert.equal(nutriScoreDe(null), null);
  });

  test("groupes NOVA 1 a 4 seulement", () => {
    assert.equal(novaDe({ nova_group: 4 }), 4);
    assert.equal(novaDe({ nova_group: "1" }), 1);
    for (const v of [0, 5, 2.5, "x", null, undefined]) assert.equal(novaDe({ nova_group: v }), null, String(v));
  });

  test("la conversion d'une fiche les reprend", () => {
    const p = convertirProduitOFF({
      code: "1",
      product_name: "Biscuits",
      nutriments: { "energy-kcal_100g": 480 },
      nutrition_grades: "d",
      nova_group: 4
    });
    assert.equal(p.nutriscore, "d");
    assert.equal(p.nova, 4);
  });

  test("Open Food Facts est interroge avec ces champs, en recherche comme au scan", async () => {
    // Sans eux dans la requete, la fiche ne les renvoie pas et aucun badge
    // n'apparait jamais, sans la moindre erreur.
    const urls = [];
    const fiche = {
      code: "3000000000001",
      product_name: "Biscuits",
      nutriments: { "energy-kcal_100g": 480 },
      nutrition_grades: "d",
      nova_group: 4
    };
    const env = {
      fetch: async (url) => {
        urls.push(url);
        return { ok: true, json: async () => (url.includes("/product/") ? { product: fiche } : { products: [fiche] }) };
      }
    };
    const [trouve] = await chercherAliments("biscuits", env);
    const scanne = await chercherParCodeBarres("3000000000001", env);
    for (const url of urls) assert.match(url, /nutrition_grades/, url);
    for (const url of urls) assert.match(url, /nova_group/, url);
    assert.equal(trouve.nutriscore, "d");
    assert.equal(scanne.nova, 4);
  });
});
