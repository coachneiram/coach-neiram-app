/**
 * Dictee d'un plat, d'une recette ou d'une seance (demande du coach du
 * 12 octobre 2026).
 *
 * Ces tests verrouillent ce que l'IA renvoie et ce que l'ecran en fait :
 * - une recette devient des ingredients du Journal, quantite dans le nom,
 *   sans ecraser le nom ni les parts deja saisis ;
 * - une seance devient des exercices de l'application, rapproches de la
 *   bibliotheque, sans valeur inventee ;
 * - un exercice deja present dans la seance est mis a jour, pas double ;
 * - une reponse vide ou illisible est une erreur, jamais un formulaire vide.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  analyserRecetteDictee,
  analyserSeanceDictee,
  completerRecette,
  completerSeance,
  consigneRecetteDictee,
  consigneSeanceDictee,
  LONGUEUR_MAX_DICTEE,
  lireRecetteDictee,
  lireSeanceDictee,
  MAX_INGREDIENTS,
  platDepuisEstimation
} from "../app/src/lib/dictee-saisie.js";

/** Remplace l'appel au modele par une reponse fixee, et garde la requete. */
async function avecReponseIA(texte, fn) {
  const vrai = globalThis.fetch;
  const requetes = [];
  globalThis.fetch = async (url, options) => {
    requetes.push({ url, corps: JSON.parse(options.body) });
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

const promptDe = (requete) => requete.corps.messages.at(-1).parts.map((p) => p.text || "").join("");

const RECETTE = JSON.stringify({
  nom: "Quiche lorraine",
  parts: 6,
  ingredients: [
    { nom: "Pâte brisée", grammes: 230, calories: 1000, protein: 13, carbs: 105, fat: 58 },
    { nom: "Lardons", grammes: 200, calories: 540, protein: 30, carbs: 1, fat: 46 },
    { nom: "Œufs", grammes: 165, calories: 236, protein: 21, carbs: 1, fat: 16 },
    { nom: "", grammes: 10, calories: 5 }
  ],
  confidence: "moyenne"
});

describe("Recette dictee", () => {
  test("la consigne porte la description, bornee, et demande la recette entiere", () => {
    const c = consigneRecetteDictee("quiche pour 6 lardons 200 g");
    assert.match(c, /quiche pour 6 lardons 200 g/);
    assert.match(c, /ENTIÈRE/);
    assert.match(c, /POUR LA QUANTITÉ/);
    const longue = consigneRecetteDictee("x".repeat(LONGUEUR_MAX_DICTEE + 500));
    assert.ok(!longue.includes("x".repeat(LONGUEUR_MAX_DICTEE + 1)));
  });

  test("les ingredients prennent la forme du Journal, quantite dans le nom", () => {
    const r = lireRecetteDictee("```json\n" + RECETTE + "\n```");
    assert.equal(r.nom, "Quiche lorraine");
    assert.equal(r.portions, 6);
    assert.equal(r.ingredients.length, 3, "un ingredient sans nom est ecarte");
    assert.deepEqual(r.ingredients[1], {
      name: "Lardons (200 g)",
      baseName: "Lardons",
      grams: 200,
      calories: 540,
      protein: 30,
      carbs: 1,
      fat: 46
    });
  });

  test("parts non dites : rien n'est invente", () => {
    const r = lireRecetteDictee('{"nom":"Gâteau","parts":0,"ingredients":[{"nom":"Farine","grammes":0,"calories":360}]}');
    assert.equal(r.portions, null);
    assert.equal(r.ingredients[0].name, "Farine");
    assert.equal(r.ingredients[0].grams, null);
  });

  test("trop d'ingredients : la liste est bornee", () => {
    const ingredients = Array.from({ length: MAX_INGREDIENTS + 10 }, (_, i) => ({ nom: `I${i}`, grammes: 10, calories: 1 }));
    assert.equal(lireRecetteDictee(JSON.stringify({ nom: "X", ingredients })).ingredients.length, MAX_INGREDIENTS);
  });

  test("aucun ingredient ou reponse illisible : erreur", () => {
    assert.throws(() => lireRecetteDictee('{"nom":"X","ingredients":[]}'), /dictee-vide/);
    assert.throws(() => lireRecetteDictee("je ne sais pas"));
  });

  test("la recette dictee complete l'edition sans ecraser ce qui est saisi", () => {
    const dictee = lireRecetteDictee(RECETTE);
    const vide = completerRecette({ id: null, nom: "", portions: "", ingredients: [] }, dictee);
    assert.equal(vide.nom, "Quiche lorraine");
    assert.equal(vide.portions, "6");
    assert.equal(vide.ingredients.length, 3);

    const deja = completerRecette(
      { id: "r1", nom: "Ma quiche", portions: "8", ingredients: [{ name: "Crème (200 g)", calories: 600 }] },
      dictee
    );
    assert.equal(deja.nom, "Ma quiche");
    assert.equal(deja.portions, "8");
    assert.equal(deja.ingredients.length, 4);
    assert.equal(deja.ingredients[0].name, "Crème (200 g)");
  });

  test("l'analyse passe par le proxy /ai avec la description", async () => {
    await avecReponseIA(RECETTE, async (requetes) => {
      const r = await analyserRecetteDictee("quiche lorraine pour 6");
      assert.equal(r.ingredients.length, 3);
      assert.match(requetes[0].url, /\/ai$/);
      assert.match(promptDe(requetes[0]), /quiche lorraine pour 6/);
    });
    await assert.rejects(analyserRecetteDictee("   "), /description-vide/);
  });
});

const SEANCE = JSON.stringify({
  exercices: [
    { nom: "developpe couche barre", type: "muscu", series: 4, reps: 8, unite: "reps", charge_kg: 62.5, rpe: 8 },
    { nom: "Pompes", type: "pdc", series: 3, reps: 15, unite: "reps", charge_kg: 0, rpe: 0 },
    { nom: "Gainage planche", type: "pdc", series: 3, reps: 45, unite: "sec" },
    { nom: "Vélo elliptique maison", type: "cardio", duree_min: 15, distance_m: 0, vitesse_kmh: 0 },
    { nom: "", type: "muscu", series: 3 }
  ],
  duree_min: 50,
  rpe: 7,
  notes: "Légère gêne à l'épaule droite"
});

describe("Seance dictee", () => {
  test("la consigne porte la description, la bibliotheque et interdit d'inventer", () => {
    const c = consigneSeanceDictee("squat 4 fois 8 a 60", [{ name: "Tirage bûcheron" }, { name: "squat barre" }]);
    assert.match(c, /squat 4 fois 8 a 60/);
    assert.match(c, /Liste : Tirage bûcheron ; squat barre ;/, "les exercices du client d'abord");
    assert.match(c, /Développé couché barre/);
    const liste = c.split("Liste : ")[1].split("\n")[0].split(" ; ");
    assert.equal(liste.filter((n) => n.toLowerCase() === "squat barre").length, 1, "pas de doublon avec la bibliotheque");
    assert.match(c, /Ne devine rien/);
    assert.match(c, /"type":"muscu\|pdc\|cardio"/);
  });

  test("les exercices sont rapproches de la bibliotheque et gardent les valeurs dites", () => {
    const s = lireSeanceDictee(SEANCE);
    assert.equal(s.exercices.length, 4, "un exercice sans nom est ecarte");
    const [dc, pompes, gainage, velo] = s.exercices;

    assert.equal(dc.name, "Développé couché barre", "nom de la bibliotheque, accents compris");
    assert.equal(dc.sets, "4");
    assert.equal(dc.reps, "8");
    assert.equal(dc.weight, "62.5");
    assert.equal(dc.rpe, "8");
    assert.ok(dc.id);

    assert.equal(pompes.weight, "", "charge 0 : champ vide");
    assert.equal(pompes.rpe, "");

    assert.equal(gainage.repUnit, "sec");
    assert.equal(gainage.reps, "45");

    assert.equal(velo.mode, "cardio", "exercice inconnu : le type dit par l'IA");
    assert.equal(velo.durationMin, "15");
    assert.equal(velo.distanceM, "");

    assert.equal(s.durationMin, "50");
    assert.equal(s.rpe, "7");
    assert.equal(s.notes, "Légère gêne à l'épaule droite");
  });

  test("valeurs non dites : pas de 3 x 10 de la bibliotheque", () => {
    const s = lireSeanceDictee('{"exercices":[{"nom":"Squat","type":"muscu"}]}');
    assert.equal(s.exercices[0].sets, "");
    assert.equal(s.exercices[0].reps, "");
  });

  test("un exercice personnel garde son nom exact", () => {
    const s = lireSeanceDictee('{"exercices":[{"nom":"tirage bucheron","type":"muscu","series":3}]}', [
      { name: "Tirage bûcheron", mode: "muscu" }
    ]);
    assert.equal(s.exercices[0].name, "Tirage bûcheron");
  });

  test("RPE hors echelle ignore, aucun exercice : erreur", () => {
    assert.equal(lireSeanceDictee('{"exercices":[{"nom":"Squat","series":3}],"rpe":42}').rpe, "");
    assert.throws(() => lireSeanceDictee('{"exercices":[]}'), /dictee-vide/);
  });

  test("un exercice deja dans la seance est mis a jour, pas double", () => {
    const seance = {
      id: null,
      date: "2026-10-12",
      routineId: "r1",
      durationMin: "",
      rpe: "",
      notes: "Échauffement 10 min",
      exercises: [
        { id: "a", name: "Développé couché barre", mode: "muscu", sets: "3", reps: "10", weight: "60", rpe: "", technique: "degressive", suggested: { from: 57.5, delta: 2.5, reason: "x" } },
        { id: "b", name: "Rowing barre", mode: "muscu", sets: "3", reps: "10", weight: "50", rpe: "" },
        { id: "c", name: "", mode: "muscu", sets: "", reps: "", weight: "", rpe: "" }
      ]
    };
    const s = completerSeance(seance, lireSeanceDictee(SEANCE));
    const noms = s.exercises.map((e) => e.name);
    assert.deepEqual(noms.slice(0, 2), ["Développé couché barre", "Rowing barre"]);
    assert.equal(noms.filter((n) => n === "Développé couché barre").length, 1);
    assert.ok(!noms.includes(""), "la ligne vide disparait");

    const dc = s.exercises[0];
    assert.equal(dc.id, "a", "la ligne garde son identite");
    assert.equal(dc.sets, "4");
    assert.equal(dc.weight, "62.5");
    assert.equal(dc.technique, "degressive", "ce qui n'est pas dit est conserve");
    assert.equal(dc.suggested, null, "la charge proposee s'efface devant la charge dite");
    assert.equal(s.exercises[1].weight, "50", "un exercice non dicte reste tel quel");
    assert.equal(s.exercises.length, 5);

    assert.equal(s.durationMin, "50");
    assert.equal(s.notes, "Échauffement 10 min\nLégère gêne à l'épaule droite");
  });

  test("duree et RPE deja saisis ne sont pas remplaces", () => {
    const s = completerSeance(
      { durationMin: "40", rpe: "6", notes: "", exercises: [] },
      lireSeanceDictee(SEANCE)
    );
    assert.equal(s.durationMin, "40");
    assert.equal(s.rpe, "6");
  });

  test("l'analyse passe par le proxy /ai", async () => {
    await avecReponseIA(SEANCE, async (requetes) => {
      const s = await analyserSeanceDictee("développé couché 4 fois 8");
      assert.equal(s.exercices.length, 4);
      assert.match(promptDe(requetes[0]), /développé couché 4 fois 8/);
    });
  });
});

describe("Plat dicte", () => {
  test("l'estimation devient une fiche de plat a verifier", () => {
    assert.deepEqual(
      platDepuisEstimation({ name: " Bol du matin ", portion: "x", calories: 450, protein: 30, carbs: 55, fat: 10, confidence: "haute" }),
      { id: null, name: "Bol du matin", calories: 450, protein: 30, carbs: 55, fat: 10 }
    );
  });
});
