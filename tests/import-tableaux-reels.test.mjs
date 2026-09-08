/**
 * Import : les tableaux du coach, tels qu'ils existent vraiment.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER EST SEPARE DES AUTRES TESTS D'IMPORT
 * ─────────────────────────────────────────────────────────────────────
 *
 * tests/import-seances.test.mjs verifie des REGLES, sur des tableaux
 * fabriques pour les exercer. Ce fichier-ci verifie des TABLEAUX, copies
 * de ceux de Coach Neiram, et rien d'autre.
 *
 * La distinction n'est pas cosmetique. Les regles ont ete ecrites a
 * partir d'une idee de ce a quoi ressemble un tableau de programme ; les
 * deux fichiers reels ont montre que cette idee etait fausse sur six
 * points a la fois. Un tableau de coach n'est pas UN tableau : c'est une
 * suite de blocs, chacun avec sa banniere, sa propre ligne d'en-tete, ses
 * lignes vides de mise en page, et un vocabulaire qui n'est pas celui du
 * code.
 *
 * Ces fixtures ne doivent donc pas etre « simplifiees » : leur desordre
 * EST ce qu'elles testent.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { seancesDepuisTexte } from "../app/src/lib/import-seances.js";

/**
 * Feuille « BLOC 3 » : programme en salle, trois journees.
 *
 * Particularites : une legende en tete du fichier, une banniere « JOUR n »
 * AU-DESSUS de chaque en-tete, l'en-tete repete a chaque journee, la
 * colonne de RPE appelee « Intensités », des durees en secondes et en
 * minutes.
 */
const BLOC_3 = [
  "RPE = Difficulté,,,,,",
  "RPE 5 : très facile,,,,,",
  "JOUR 1,,,,,",
  "Exercices,Séries,Répétitions,Intensités,Récupération,Consignes",
  "Gainage,3,30 sec,7,1 min 30,",
  "Presse à cuisses,4,10,7,1 min 30,",
  "Leg curl,3,10,7,1 min 30,Siege 5 / pied 2",
  "Marche inclinée,1,15-30 mins,,,Inclinaison = 10%",
  "JOUR 2,,,,,",
  "Exercices,Séries,Répétitions,Intensités,Récupération,Consignes",
  "Gainage,3,30 sec,7,1 min 30,",
  "Pompes,3,10-12,7,1 min 30,Sur les genoux"
].join("\n");

/**
 * Feuille « BLOC 2 » : force athletique, plusieurs semaines en largeur.
 *
 * Particularites : la banniere de journee porte AUSSI les sous-titres des
 * colonnes de droite, une colonne double « RPE/Charge », des cellules de
 * consigne (« 7+0,5/sem », « -10 % ») dans cette meme colonne, et une
 * faute de saisie reelle — un 65 dans la colonne du RPE.
 */
const BLOC_2 = [
  "JOUR 1 - SQUAT / BENCH - LUNDI,,,,,Charge estimée,Charge utilisée,W1",
  "Exercices,Séries,Reps,RPE/Charge,Remarques,,,RPE",
  "Paused Squat 3CT,1,4,6,Focus depth + tension,77.5,77.5,5",
  "Paused Squat 3CT,1,4,8,,87.5,87.5,7",
  "Gainage,3,1 min,7,,,,6",
  "JOUR 2 - BENCH / DEADLIFT - MARDI,,,,,Charge estimée,Charge utilisée,W1",
  "Exercices,Séries,Reps,RPE/Charge,Remarques,,,RPE",
  "Larsen 4/2/0,3,4,7,,55,55,7",
  "JOUR 4 - SBD - VENDREDI,,,,,Charge estimée,Charge utilisée,W1",
  "Exercices,Séries,Reps,RPE/Charge,Remarques,,,RPE",
  "Comp Squat,1,1,7+0.5/sem,,100,100,7",
  "Comp Squat,3,3,-10 %,,,90,7",
  "Bench 2CT,1,1,65,,,65,7"
].join("\n");

const lire = (tableau) => seancesDepuisTexte(tableau);
const parNom = (seances, nom) => seances.find((s) => s.nom.startsWith(nom));
const exercice = (seance, nom) => seance.exercises.find((e) => e.name === nom);

describe("feuille « BLOC 3 » — programme en salle", () => {
  const { seances, erreur } = lire(BLOC_3);

  test("chaque bannière « JOUR n » ouvre sa séance", () => {
    assert.equal(erreur, null);
    assert.deepEqual(seances.map((s) => s.nom), ["JOUR 1", "JOUR 2"]);
  });

  test("la bannière de la première séance est lue, bien qu'elle soit AU-DESSUS de l'en-tête", () => {
    // Les séances suivantes se lisent seules — leur bannière tombe dans le
    // flux de données. La première serait perdue sans remontée explicite,
    // et son bloc atterrirait dans une séance sans nom.
    assert.equal(seances[0].nom, "JOUR 1");
  });

  test("les en-têtes répétés ne deviennent pas des exercices", () => {
    // « Exercices » et « JOUR 2 » se retrouvaient dans le programme du
    // client comme des exercices à faire.
    const noms = seances.flatMap((s) => s.exercises.map((e) => e.name));
    for (const intrus of ["Exercices", "JOUR 1", "JOUR 2", "RPE = Difficulté"]) {
      assert.ok(!noms.includes(intrus), `« ${intrus} » importé comme exercice`);
    }
  });

  test("la colonne « Intensités » est le RPE du client", () => {
    // La légende du fichier dit mot pour mot « RPE = Difficulté ».
    assert.equal(exercice(parNom(seances, "JOUR 1"), "Presse à cuisses").rpe, "7");
  });

  test("« 30 sec » est une durée, pas trente répétitions", () => {
    const gainage = exercice(parNom(seances, "JOUR 1"), "Gainage");
    assert.equal(gainage.reps, "30");
    assert.equal(gainage.repUnit, "sec");
    assert.equal(gainage.sets, "3");
  });

  test("« 15-30 mins » sur une seule série est un cardio", () => {
    const marche = exercice(parNom(seances, "JOUR 1"), "Marche inclinée");
    assert.equal(marche.mode, "cardio");
    assert.equal(marche.durationMin, "15");
  });

  test("une fourchette de répétitions garde sa valeur basse", () => {
    assert.equal(exercice(parNom(seances, "JOUR 2"), "Pompes").reps, "10");
  });
});

describe("feuille « BLOC 2 » — force athlétique", () => {
  const { seances, erreur } = lire(BLOC_2);

  test("les trois journées sont séparées", () => {
    assert.equal(erreur, null);
    assert.equal(seances.length, 3);
  });

  test("une bannière qui porte aussi des sous-titres de colonnes reste une bannière", () => {
    // Elle ressemble à un en-tête répété. La traiter comme tel l'ignorait,
    // et les trois journées s'entassaient en une seule.
    assert.ok(parNom(seances, "JOUR 2"), "la deuxième journée a été absorbée");
    assert.ok(parNom(seances, "JOUR 4"), "la troisième journée a été absorbée");
  });

  test("la colonne double « RPE/Charge » ne contenant qu'un RPE ne fabrique pas de charge", () => {
    const squat = parNom(seances, "JOUR 1").exercises[0];
    assert.equal(squat.rpe, "6");
    assert.equal(squat.weight, "");
  });

  test("« 7+0,5/sem » est une consigne de progression, pas une charge de 0,5 kg", () => {
    // Le « + » veut dire « plus », pas « ou » : le découper faisait entrer
    // 0,5 dans la colonne des charges. Un squat à 0,5 kg n'a jamais existé.
    const comp = parNom(seances, "JOUR 4").exercises[0];
    assert.equal(comp.rpe, "7");
    assert.equal(comp.weight, "");
  });

  test("« -10 % » ne produit ni RPE ni charge", () => {
    const backoff = parNom(seances, "JOUR 4").exercises[1];
    assert.equal(backoff.rpe, "");
    assert.equal(backoff.weight, "");
  });

  test("une faute de saisie réelle du tableau est écartée", () => {
    // Un 65 dans la colonne du RPE, surligné en rouge dans le fichier du
    // coach. Le laisser passer enverrait le client sur une barre calculée
    // à partir d'un ressenti qui n'existe pas.
    const bench = parNom(seances, "JOUR 4").exercises[2];
    assert.equal(bench.rpe, "");
  });

  test("« 1 min » sur trois séries est une série chronométrée, pas un cardio", () => {
    // Répéter un effort, c'est en faire des séries ; le tenir une fois,
    // c'est une durée. La noter en cardio lui ferait perdre ses séries.
    const gainage = exercice(parNom(seances, "JOUR 1"), "Gainage");
    assert.equal(gainage.mode, "muscu");
    assert.equal(gainage.sets, "3");
    assert.equal(gainage.reps, "60");
    assert.equal(gainage.repUnit, "sec");
  });
});

describe("ce que les deux feuilles ont en commun", () => {
  test("aucun exercice importé n'est vide de sens", () => {
    for (const tableau of [BLOC_3, BLOC_2]) {
      for (const seance of lire(tableau).seances) {
        assert.ok(seance.nom.trim(), "séance sans nom");
        assert.ok(seance.exercises.length > 0, `séance vide : ${seance.nom}`);
        for (const e of seance.exercises) {
          assert.ok(e.name.trim(), "exercice sans nom");
          assert.ok(e.mode, `mode manquant pour ${e.name}`);
        }
      }
    }
  });

  test("aucune valeur chiffrée absurde ne franchit l'import", () => {
    for (const tableau of [BLOC_3, BLOC_2]) {
      for (const seance of lire(tableau).seances) {
        for (const e of seance.exercises) {
          if (e.rpe) assert.ok(Number(e.rpe) >= 1 && Number(e.rpe) <= 10, `RPE ${e.rpe} sur ${e.name}`);
          if (e.weight) assert.ok(Number(e.weight) > 0, `charge ${e.weight} sur ${e.name}`);
          if (e.sets) assert.ok(Number(e.sets) > 0, `séries ${e.sets} sur ${e.name}`);
        }
      }
    }
  });
});
