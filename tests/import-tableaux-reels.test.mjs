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

/**
 * Feuille « BLOC 1 » : programme en salle, charges posees EN LARGEUR.
 *
 * Particularites, toutes absentes des deux autres feuilles : les charges
 * vivent dans des colonnes « S1 · S2 · S3 · S4 » — une par semaine du bloc,
 * chacune suivie du RPE reellement realise — un nom d'exercice tient sur
 * trois lignes dans une seule cellule, une journee de cardio pose sa duree
 * dans la colonne des SERIES, et les deux dernieres journees n'ont qu'une
 * banniere et un en-tete, sans aucun exercice.
 */
const BLOC_1 = [
  "RPE = Difficulté,,,,,,,",
  "JOUR 1,,,,,,Charge,",
  "Exercices,Séries,Répétitions,Intensités,Récupération,Consignes,S1,RPE S1",
  "Gainage,3,45 sec,8,1 min 30,,/,6",
  '"V Squat\n+\nChaise",3,"3\n+\n30 sec",8,1 min 30,Enchainer les 2 exercices,0 - 5 - 10,6',
  'Leg extension,3,10 + 2 sec,8,1 min 30,Bloquer 2 sec en haut,"52,5",8',
  "Adducteurs,3,15,8,1 min 30,,10-15,6",
  "Chest press,3,8-12,8,1 min 30,,70-90-110,7",
  'Butterfly,3,12,8,1 min 30,,"2,5-5-5",6',
  "JOUR 4,,,,,,Charge,",
  "Exercices,Séries,Répétitions,Intensité,Récupération,Consignes,S1,RPE S1",
  "Escaliers,15 mins,1,7,,,,",
  "Tapis marche incliné,15 mins,1,7,,Inclinaison = 10%,,",
  "Rameur,15 mins,1,700%,,,,",
  "JOUR 5,,,,,,Charge,",
  "Exercices,Séries,Répétitions,Intensité,Récupération,Consignes,S1,RPE S1"
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

describe("feuille « BLOC 1 » — charges posées en largeur", () => {
  const { seances, erreur } = lire(BLOC_1);

  test("les colonnes « S1 » à « S4 » sont les charges du bloc, semaine par semaine", () => {
    // Aucune ne s'appelle « Charge » : elles ne tombaient sur rien, et le
    // programme s'importait sans une seule charge.
    assert.equal(erreur, null);
    const jour1 = parNom(seances, "JOUR 1");
    assert.equal(exercice(jour1, "Leg extension").weight, "52.5");
    assert.equal(exercice(jour1, "Adducteurs").weight, "10");
  });

  test("c'est la PREMIÈRE semaine qui est retenue, pas une autre", () => {
    // S1 est la charge que le coach prescrit au départ ; S2 à S4 sont ce
    // que le client fera plus tard, et l'application n'a qu'une charge.
    assert.equal(exercice(parNom(seances, "JOUR 1"), "Chest press").weight, "70");
  });

  test("« RPE S1 » ne devient pas une charge", () => {
    // La colonne des charges et celle du RPE réalisé s'alternent : les
    // confondre mettrait un 6 sur la barre.
    assert.equal(exercice(parNom(seances, "JOUR 1"), "Gainage").rpe, "8");
  });

  test("une charge de progression garde sa valeur de départ", () => {
    // « 70-90-110 » sont les trois séries. « 2,5-5-5 » de même.
    assert.equal(exercice(parNom(seances, "JOUR 1"), "Butterfly").weight, "2.5");
  });

  test("une cellule sans charge n'en invente pas", () => {
    // « / » et « 0 - 5 - 10 » : rien à mettre sur la barre.
    assert.equal(exercice(parNom(seances, "JOUR 1"), "Gainage").weight, "");
    assert.equal(exercice(parNom(seances, "JOUR 1"), "V Squat + Chaise").weight, "");
  });

  test("un nom d'exercice sur trois lignes reste un nom", () => {
    // Une cellule de tableur contient des retours à la ligne dès qu'un
    // coach fait tenir « V Squat + Chaise » sur trois lignes.
    const noms = parNom(seances, "JOUR 1").exercises.map((e) => e.name);
    assert.ok(noms.includes("V Squat + Chaise"), noms.join(" | "));
    for (const nom of noms) assert.ok(!/[\n\r]/.test(nom), `retour à la ligne dans « ${nom} »`);
  });

  test("« enchaîner les 2 exercices » est un superset", () => {
    assert.equal(exercice(parNom(seances, "JOUR 1"), "V Squat + Chaise").technique, "superset");
  });

  test("une durée posée dans la colonne des séries reste une durée", () => {
    // « Escaliers · 15 mins · 1 » lu au pied de la lettre donnait
    // « 15×1 » — quinze séries d'une répétition d'escalier.
    const jour4 = parNom(seances, "JOUR 4");
    for (const e of jour4.exercises) {
      assert.equal(e.mode, "cardio", `${e.name} n'est pas un cardio`);
      assert.equal(e.durationMin, "15");
    }
  });

  test("une journée sans aucun exercice n'est pas importée", () => {
    // JOUR 5 n'a qu'une bannière et un en-tête : une séance type vide ne
    // sert à rien et encombre l'écran du client.
    assert.ok(!parNom(seances, "JOUR 5"), "une séance vide a été créée");
    assert.deepEqual(seances.map((s) => s.nom), ["JOUR 1", "JOUR 4"]);
  });

  test("« 700% » saisi dans la colonne d'intensité est écarté", () => {
    assert.equal(exercice(parNom(seances, "JOUR 4"), "Rameur").rpe, undefined);
  });
});

describe("ce que les trois feuilles ont en commun", () => {
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

describe("l'import montre comment il a lu chaque colonne", () => {
  /*
   * UN IMPORT QUI DEVINE DOIT MONTRER CE QU'IL A DEVINÉ.
   *
   * La lecture repose sur des correspondances de mots : « Intensités »
   * vaut RPE, « S1 » vaut une charge, « Récupération » n'est pas une
   * consigne. Quand une correspondance se trompe, le résultat n'est pas
   * une erreur — c'est un programme plausible et faux. Un coach a ainsi
   * vu quatorze séances nommées « 1 », « 3 », « 4 », sans aucun moyen de
   * comprendre d'où venaient ces noms.
   *
   * Ni le client ni le coach ne peuvent diagnostiquer cela : rien à
   * l'écran ne dit d'où vient chaque valeur. Ces tests garantissent que
   * la lecture est rendue visible AVANT l'enregistrement.
   */
  test("chaque colonne reconnue est rendue avec son en-tête d'origine", () => {
    const { colonnes } = lire(BLOC_1);
    const par = (role) => colonnes.find((c) => c.role === role);

    assert.equal(par("Exercice").entete, "Exercices");
    assert.equal(par("Séries").entete, "Séries");
    assert.equal(par("RPE").entete, "Intensités", "la colonne de RPE ne s'appelle pas « RPE »");
    assert.equal(par("Charge").entete, "S1", "la colonne de charge ne s'appelle pas « Charge »");
    assert.equal(par("Repos").entete, "Récupération");
    assert.equal(par("Notes").entete, "Consignes");
  });

  test("une colonne double apparaît sous ses deux rôles", () => {
    const colonnes = lire(BLOC_2).colonnes;
    const doubles = colonnes.filter((c) => c.entete === "RPE/Charge").map((c) => c.role);
    assert.deepEqual(doubles.sort(), ["Charge", "RPE"]);
  });

  test("la lecture est rendue même quand l'import réussit", () => {
    // C'est justement quand l'import « marche » que la mauvaise
    // correspondance passe inaperçue.
    for (const tableau of [BLOC_1, BLOC_2, BLOC_3]) {
      const { erreur, colonnes } = lire(tableau);
      assert.equal(erreur, null);
      assert.ok(colonnes.length >= 4, "trop peu de colonnes rendues : " + colonnes.length);
      for (const c of colonnes) {
        assert.ok(c.role && c.entete, JSON.stringify(c));
      }
    }
  });
});
