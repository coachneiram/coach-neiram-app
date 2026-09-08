/**
 * Import du programme depuis le Google Sheets du coach.
 *
 * Ce module lit un tableau ecrit par un humain, dans un format que
 * personne ne lui a impose. Le risque n'est donc pas la panne — elle se
 * verrait — mais l'IMPORT SILENCIEUSEMENT FAUX : une colonne prise pour
 * une autre, une charge lue comme un nombre de series, un superset
 * rattache au mauvais exercice. Le client s'entrainerait alors sur un
 * programme qui n'est pas le sien, sans que rien ne le signale.
 *
 * D'ou des tests qui portent surtout sur les tableaux mal formes, mal
 * ordonnes ou incomplets, plutot que sur le cas ideal.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  analyserTableau,
  identifiantFeuille,
  modeDepuisTexte,
  premierNombre,
  roleDeColonne,
  roleDeColonneLarge,
  rolesDeColonne,
  valeurDeRoleDouble,
  valeurPlausible,
  seancesDepuisTexte,
  techniqueDepuisTexte,
  telechargerFeuille,
  urlsExportCsv
} from "../app/src/lib/import-seances.js";

const CSV = [
  "Programme Marien — bloc 3",
  "",
  "Séance,Exercice,Séries,Reps,Charge (kg),RPE,Technique,Notes",
  'Haut du corps,Développé couché,4,8-10,60,8,,"Contrôle 3 s, pause en bas"',
  ",Tirage horizontal,4,10,50,8,Superset,",
  ",Élévations latérales,3,15,8,,superset,",
  ",Curl barre EZ,3,12,25,,Dégressive x2 -20%,",
  "Bas du corps,Squat,5,5,90,8,,",
  ",Presse,3,12,120,,,"
].join("\n");

describe("découpage du tableau", () => {
  test("le séparateur est déduit de tout le texte, pas de la première ligne", () => {
    // Le titre libre en tete ne contient ni virgule ni tabulation. Le
    // deduire de cette seule ligne faisait passer un CSV pour un TSV, et
    // l'import entier echouait sur un tableau parfaitement valide.
    const lignes = analyserTableau(CSV);
    assert.equal(lignes[0].length, 1, "le titre libre devrait rester une cellule");
    assert.ok(lignes[1].includes("Exercice"), "l'en-tête n'a pas été découpé");
  });

  test("les guillemets protègent une virgule dans une cellule", () => {
    const lignes = analyserTableau(CSV);
    const ligne = lignes.find((l) => l[1] === "Développé couché");
    assert.equal(ligne[7], "Contrôle 3 s, pause en bas");
  });

  test("un collage en tabulations est accepté tel quel", () => {
    const lignes = analyserTableau("Exercice\tSéries\nSquat\t5\n");
    assert.deepEqual(lignes, [["Exercice", "Séries"], ["Squat", "5"]]);
  });

  test("les lignes vides de mise en page sont écartées", () => {
    assert.equal(analyserTableau("a,b\n,\n\nc,d").length, 2);
  });

  test("un texte vide ne produit aucune ligne", () => {
    assert.deepEqual(analyserTableau(""), []);
    assert.deepEqual(analyserTableau("   \n  "), []);
    assert.deepEqual(analyserTableau(null), []);
  });
});

describe("reconnaissance des colonnes", () => {
  test("les en-têtes usuels tombent sur le bon rôle", () => {
    assert.equal(roleDeColonne("Exercice"), "exercice");
    assert.equal(roleDeColonne("Mouvement"), "exercice");
    assert.equal(roleDeColonne("Séance"), "seance");
    assert.equal(roleDeColonne("Jour"), "seance");
    assert.equal(roleDeColonne("Séries prévues"), "series");
    assert.equal(roleDeColonne("Charge (kg)"), "charge");
    assert.equal(roleDeColonne("RPE"), "rpe");
    assert.equal(roleDeColonne("Technique"), "technique");
  });

  test("un en-tête inconnu ne se rattache à rien plutôt qu'au plus proche", () => {
    assert.equal(roleDeColonne("Groupe musculaire"), null);
    assert.equal(roleDeColonne("Semaine 4"), null);
    assert.equal(roleDeColonne(""), null);
    assert.equal(roleDeColonne(undefined), null);
  });

  test("un en-tête composé tombe sur son premier mot, pas sur un mot du milieu", () => {
    // « Tempo » est reconnu comme une colonne de notes : le coach y ecrit
    // une consigne, pas un chiffre. Le verifier evite qu'un futur ajout de
    // role ne la detourne vers un champ numerique.
    assert.equal(roleDeColonne("Tempo excentrique"), "notes");
  });
});

describe("en-têtes tels que les coachs les écrivent vraiment", () => {
  /*
   * DÉFAUT TROUVÉ SUR UN TABLEAU RÉEL. La reconnaissance exigeait le
   * singulier : « Exercices » ne tombait sur aucun rôle, et l'import
   * échouait entièrement sur un tableau parfaitement bien fait, avec un
   * message qui accusait le tableau.
   *
   * Un coach écrit ses colonnes au pluriel une fois sur deux. Exiger le
   * singulier revenait à lui demander d'écrire comme le code.
   */
  const ATTENDUS = [
    ["Exercice", "exercice"],
    ["EXERCICES", "exercice"],
    ["Exercices", "exercice"],
    ["Mouvements", "exercice"],
    ["Nom de l'exercice", "exercice"],
    ["Exo", "exercice"],
    ["Séance", "seance"],
    ["SEANCES", "seance"],
    ["Jours", "seance"],
    ["Séries", "series"],
    ["Nombre de séries", "series"],
    ["Reps", "reps"],
    ["Répétitions", "reps"],
    ["Charge", "charge"],
    ["Charges", "charge"],
    ["Poids (kg)", "charge"],
    ["RPE", "rpe"],
    ["Technique", "technique"],
    ["Méthode", "technique"],
    ["Notes", "notes"],
    ["Consignes", "notes"],
    // Le temps de repos a son propre rôle : sans cela, « Récupération »
    // — souvent à gauche des consignes — raflait le rôle « notes » et les
    // vraies consignes du coach étaient remplacées par « 1 min 30 ».
    ["Repos", "repos"],
    ["Récupération", "repos"]
  ];

  test("les vingt-deux écritures courantes tombent toutes sur le bon rôle", () => {
    for (const [entete, attendu] of ATTENDUS) {
      const role = roleDeColonne(entete) || roleDeColonneLarge(entete);
      assert.equal(role, attendu, `en-tête « ${entete} »`);
    }
  });

  test("un tableau dont l'en-tête est au pluriel s'importe", () => {
    // Le cas exact qui a échoué en production.
    const tableau = [
      "Séances,Exercices,Séries,Reps,Charges",
      "Haut du corps,Développé couché,4,8,60",
      ",Tirage,4,10,50"
    ].join("\n");
    const { seances, erreur } = seancesDepuisTexte(tableau);
    assert.equal(erreur, null);
    assert.equal(seances.length, 1);
    assert.equal(seances[0].nom, "Haut du corps");
    assert.equal(seances[0].exercises.length, 2);
    assert.equal(seances[0].exercises[0].weight, "60");
  });

  test("la passe stricte garde la priorité sur la passe large", () => {
    // « Notes sur l'exercice » contient « exercice » : la reconnaissance
    // large seule lui donnerait la colonne des exercices, et le vrai nom
    // d'exercice partirait dans les notes.
    const tableau = [
      "Exercice,Notes sur l'exercice",
      "Squat,Contrôle la descente"
    ].join("\n");
    const { seances } = seancesDepuisTexte(tableau);
    assert.equal(seances[0].exercises[0].name, "Squat");
  });

  test("un rôle déjà pourvu n'est pas attribué deux fois", () => {
    const tableau = [
      "Exercice,Détail de l'exercice,Séries",
      "Squat,à la barre,5"
    ].join("\n");
    const { seances } = seancesDepuisTexte(tableau);
    assert.equal(seances[0].exercises[0].name, "Squat");
    assert.equal(seances[0].exercises[0].sets, "5");
  });
});

describe("colonne double : « RPE/Charge »", () => {
  /*
   * DEUXIÈME DÉFAUT TROUVÉ SUR LE MÊME TABLEAU RÉEL. Un coach économise
   * une colonne en écrivant « RPE/Charge » et, en dessous, « 8 / 60 ».
   * L'en-tête tombait sur « rpe », la cellule rendait son premier nombre,
   * et LA CHARGE ÉTAIT PERDUE — c'est-à-dire la donnée pour laquelle on
   * importe le tableau.
   */
  test("l'en-tête déclare ses deux rôles, dans l'ordre", () => {
    assert.deepEqual(rolesDeColonne("RPE/Charge"), ["rpe", "charge"]);
    assert.deepEqual(rolesDeColonne("Charge / RPE"), ["charge", "rpe"]);
    assert.deepEqual(rolesDeColonne("Séries x Reps".replace(" x ", " et ")), ["series", "reps"]);
  });

  test("deux fois le même rôle n'est pas une colonne double", () => {
    // « Poids / Charge » nomme deux fois la même chose.
    assert.deepEqual(rolesDeColonne("Poids / Charge"), ["charge"]);
    assert.deepEqual(rolesDeColonne("Exercices"), ["exercice"]);
  });

  test("la cellule est découpée comme son en-tête", () => {
    assert.equal(valeurDeRoleDouble("8 / 60", 0, 2), "8");
    assert.equal(valeurDeRoleDouble("8 / 60", 1, 2), "60");
  });

  test("sans séparateur, les nombres sont pris dans l'ordre annoncé", () => {
    assert.equal(valeurDeRoleDouble("RPE 8 — 60 kg", 0, 2), "8");
    assert.equal(valeurDeRoleDouble("RPE 8 — 60 kg", 1, 2), "60");
  });

  test("une valeur solitaire n'est pas attribuée au hasard", () => {
    // Attribuer un nombre seul au mauvais rôle est pire que ne rien
    // attribuer : on ne sait pas si « 60 » est un RPE impossible ou une
    // charge dont le RPE manque.
    assert.equal(valeurDeRoleDouble("60", 0, 2), "60");
    assert.equal(valeurDeRoleDouble("60", 1, 2), "");
    assert.equal(valeurDeRoleDouble("", 0, 2), "");
  });

  test("le tableau réel se lit avec sa charge ET son RPE", () => {
    const tableau = [
      "Exercices\tSéries\tReps\tRPE/Charge\tRemarques",
      "Développé couché\t4\t8-10\t8 / 60\tContrôle la descente",
      "Tirage horizontal\t4\t10\t7 / 50\t",
      "Gainage\t3\t45\t\tsur les coudes"
    ].join("\n");

    const { seances, erreur } = seancesDepuisTexte(tableau);
    assert.equal(erreur, null);
    const [dc, tirage, gainage] = seances[0].exercises;

    assert.equal(dc.name, "Développé couché");
    assert.equal(dc.sets, "4");
    assert.equal(dc.reps, "8", "une fourchette est ramenée à sa valeur basse");
    assert.equal(dc.weight, "60", "la charge était perdue avant cette correction");
    assert.equal(dc.rpe, "8");

    assert.equal(tirage.weight, "50");
    assert.equal(tirage.rpe, "7");

    // Cellule vide : ni charge ni RPE inventés.
    assert.equal(gainage.weight, "");
    assert.equal(gainage.rpe, "");
  });
});

describe("bornes de bon sens sur ce qui sort du tableau", () => {
  /*
   * Le RPE alimente la progression de charge. Un « 60 » lu par erreur dans
   * une colonne mal ordonnée ne produirait pas un affichage bizarre : il
   * enverrait le client sur une barre calculée à partir d'un ressenti qui
   * n'existe pas.
   */
  test("un RPE hors de 1-10 est écarté, pas ramené dans la plage", () => {
    assert.equal(valeurPlausible("rpe", "60"), "");
    assert.equal(valeurPlausible("rpe", "0"), "");
    assert.equal(valeurPlausible("rpe", "8"), "8");
    assert.equal(valeurPlausible("rpe", "9.5"), "9.5");
  });

  test("séries, reps et charges absurdes sont écartées de la même façon", () => {
    assert.equal(valeurPlausible("sets", "0"), "");
    assert.equal(valeurPlausible("sets", "40"), "");
    assert.equal(valeurPlausible("weight", "-10"), "");
    assert.equal(valeurPlausible("weight", "600"), "");
    assert.equal(valeurPlausible("weight", "60"), "60");
  });

  test("une colonne inversée ne contamine pas la progression de charge", () => {
    // « Charge/RPE » annoncé, mais le coach a écrit « 60 / 8 » : les deux
    // valeurs tombent au bon endroit. Si l'ordre est vraiment faux, la
    // borne écarte le RPE impossible plutôt que de le laisser passer.
    const tableau = "Exercices,RPE/Charge\nSquat,\"60 / 8\"";
    const ex = seancesDepuisTexte(tableau).seances[0].exercises[0];
    assert.equal(ex.rpe, "", "un RPE de 60 ne doit jamais atteindre la progression de charge");
    assert.equal(ex.weight, "8");
  });

  test("une valeur absente reste absente, elle ne devient pas zéro", () => {
    assert.equal(valeurPlausible("weight", ""), "");
    assert.equal(valeurPlausible("rpe", null), "");
  });
});

describe("quand la lecture échoue, l'application dit ce qu'elle a lu", () => {
  /*
   * Un message qui annonce « aucune colonne Exercice » sans montrer la
   * première ligne laisse le client sans moyen de savoir laquelle des deux
   * causes réelles s'applique : un en-tête écrit autrement, ou le mauvais
   * onglet du classeur — l'export sans numéro d'onglet rend toujours le
   * premier, souvent une page de garde.
   */
  test("les en-têtes réellement lus sont rendus avec l'erreur", () => {
    const { erreur, entetesLus } = seancesDepuisTexte("Client,Semaine,Objectif\nSabine,3,Sèche");
    assert.equal(erreur, "entete-absent");
    assert.deepEqual(entetesLus, ["Client", "Semaine", "Objectif"]);
  });

  test("un tableau vide ne fait pas tomber la restitution", () => {
    const { erreur, entetesLus } = seancesDepuisTexte("");
    assert.equal(erreur, "entete-absent");
    assert.deepEqual(entetesLus, []);
  });
});

describe("lecture des cellules", () => {
  test("une fourchette de reps est ramenée à sa valeur basse", () => {
    assert.equal(premierNombre("8-10"), "8");
    assert.equal(premierNombre("60 kg"), "60");
    assert.equal(premierNombre("12,5"), "12.5");
    assert.equal(premierNombre("PDC"), "");
    assert.equal(premierNombre(""), "");
  });

  test("le mode est déduit du vocabulaire du coach", () => {
    assert.equal(modeDepuisTexte("Cardio"), "cardio");
    assert.equal(modeDepuisTexte("Poids de corps"), "pdc");
    assert.equal(modeDepuisTexte("Force"), "powerlifting");
    assert.equal(modeDepuisTexte("Échauffement"), "warmup");
    assert.equal(modeDepuisTexte("Bras"), null, "un groupe musculaire n'est pas un mode");
  });
});

describe("techniques écrites en texte libre", () => {
  test("les écritures courantes du superset sont reconnues", () => {
    for (const texte of ["Superset", "super set", "SS", "bi-set", "superset avec le suivant"]) {
      assert.equal(techniqueDepuisTexte(texte)?.technique, "superset", texte);
    }
  });

  test("un groupe nommé par le coach est conservé", () => {
    assert.equal(techniqueDepuisTexte("Superset B").supersetGroupe, "B");
    assert.equal(techniqueDepuisTexte("SS c").supersetGroupe, "C");
    assert.equal(techniqueDepuisTexte("Superset").supersetGroupe, null);
  });

  test("la dégressive emporte ses paliers et son pourcentage", () => {
    assert.deepEqual(techniqueDepuisTexte("Dégressive x3 -25%"), {
      technique: "degressive",
      degressivePaliers: 3,
      degressiveBaissePct: 25
    });
    // Sans chiffres, des valeurs de depart plutot qu'un refus : le coach a
    // bien demande une degressive, seule sa forme manque.
    assert.deepEqual(techniqueDepuisTexte("drop set"), {
      technique: "degressive",
      degressivePaliers: 2,
      degressiveBaissePct: 20
    });
  });

  test("une note qui n'est pas une technique reste une note", () => {
    assert.equal(techniqueDepuisTexte("Contrôle 3 s en descente"), null);
    assert.equal(techniqueDepuisTexte(""), null);
    assert.equal(techniqueDepuisTexte(null), null);
  });
});

describe("séances déduites d'un tableau", () => {
  const { seances, erreur } = seancesDepuisTexte(CSV);

  test("le titre libre en tête n'empêche pas de trouver l'en-tête", () => {
    assert.equal(erreur, null);
    assert.equal(seances.length, 2);
  });

  test("une colonne de séance vide prolonge la séance précédente", () => {
    assert.equal(seances[0].nom, "Haut du corps");
    assert.equal(seances[0].exercises.length, 4);
    assert.equal(seances[1].nom, "Bas du corps");
    assert.equal(seances[1].exercises.length, 2);
  });

  test("séries, reps et charges arrivent dans les bons champs", () => {
    const dc = seances[0].exercises[0];
    assert.equal(dc.name, "Développé couché");
    assert.equal(dc.sets, "4");
    assert.equal(dc.reps, "8");
    assert.equal(dc.weight, "60");
    assert.equal(dc.rpe, "8");
    assert.equal(dc.mode, "muscu");
  });

  test("deux supersets qui se suivent forment un seul groupe", () => {
    const [, tirage, elevations, curl] = seances[0].exercises;
    assert.equal(tirage.technique, "superset");
    assert.equal(elevations.technique, "superset");
    assert.equal(tirage.supersetGroupe, elevations.supersetGroupe);
    assert.equal(curl.technique, "degressive");
  });

  test("un exercice normal referme le groupe : le suivant en ouvre un autre", () => {
    const tableau = [
      "Séance,Exercice,Technique",
      "A,Un,Superset",
      ",Deux,Superset",
      ",Trois,",
      ",Quatre,Superset",
      ",Cinq,Superset"
    ].join("\n");
    const ex = seancesDepuisTexte(tableau).seances[0].exercises;
    assert.equal(ex[0].supersetGroupe, ex[1].supersetGroupe);
    assert.equal(ex[3].supersetGroupe, ex[4].supersetGroupe);
    assert.notEqual(ex[0].supersetGroupe, ex[3].supersetGroupe);
  });

  test("une technique écrite dans la colonne Notes est quand même lue", () => {
    const tableau = "Exercice,Notes\nPresse,superset avec les fentes";
    assert.equal(seancesDepuisTexte(tableau).seances[0].exercises[0].technique, "superset");
  });

  test("sans colonne de séance, tout tombe dans une séance unique et nommée", () => {
    const { seances: s } = seancesDepuisTexte("Exercice,Séries\nSquat,5\nPresse,3");
    assert.equal(s.length, 1);
    assert.equal(s[0].exercises.length, 2);
    assert.ok(s[0].nom, "la séance doit porter un nom, sinon elle est inutilisable");
  });

  test("sans colonne d'exercices, l'import refuse plutôt que de deviner", () => {
    const { seances: s, erreur: e } = seancesDepuisTexte("Jour,Durée\nLundi,60");
    assert.deepEqual(s, []);
    assert.equal(e, "entete-absent");
  });

  test("un en-tête sans aucune ligne en dessous est signalé à part", () => {
    const { erreur: e } = seancesDepuisTexte("Séance,Exercice,Séries");
    assert.equal(e, "aucun-exercice");
  });

  test("une ligne sans nom d'exercice ne crée pas d'exercice fantôme", () => {
    const { seances: s } = seancesDepuisTexte("Séance,Exercice,Séries\nA,Squat,5\nA,,3\nA,Presse,4");
    assert.equal(s[0].exercises.length, 2);
  });
});

describe("adresses de téléchargement", () => {
  test("l'identifiant est extrait des deux formes d'URL", () => {
    assert.deepEqual(identifiantFeuille("https://docs.google.com/spreadsheets/d/ABC123/edit#gid=42"), {
      id: "ABC123",
      publie: false,
      gid: "42"
    });
    assert.deepEqual(
      identifiantFeuille("https://docs.google.com/spreadsheets/d/e/2PACX-xyz/pubhtml?gid=7"),
      { id: "2PACX-xyz", publie: true, gid: "7" }
    );
  });

  test("une adresse qui n'est pas un Google Sheets est refusée", () => {
    assert.equal(identifiantFeuille("https://exemple.fr/programme.xlsx"), null);
    assert.equal(identifiantFeuille(""), null);
    assert.equal(identifiantFeuille(null), null);
    assert.deepEqual(urlsExportCsv("https://exemple.fr"), []);
  });

  test("plusieurs points d'export sont tentés, pas un seul", () => {
    const urls = urlsExportCsv("https://docs.google.com/spreadsheets/d/ABC123/edit#gid=42");
    assert.equal(urls.length, 2);
    assert.ok(urls.every((u) => u.includes("ABC123") && u.includes("gid=42")));
  });
});

describe("téléchargement : un échec n'est jamais une exception", () => {
  const reponse = (texte, ok = true) => ({ ok, text: async () => texte });

  test("une adresse invalide est signalée sans appeler le réseau", async () => {
    let appels = 0;
    const r = await telechargerFeuille("https://exemple.fr", {
      fetchImpl: async () => {
        appels++;
        return reponse("");
      }
    });
    assert.deepEqual(r, { ok: false, raison: "url-invalide" });
    assert.equal(appels, 0);
  });

  test("une page de connexion Google est un document privé, pas un CSV", async () => {
    const r = await telechargerFeuille("https://docs.google.com/spreadsheets/d/ABC/edit", {
      fetchImpl: async () => reponse("<!DOCTYPE html><html><head>...")
    });
    assert.deepEqual(r, { ok: false, raison: "inaccessible" });
  });

  test("le second point d'export est tenté quand le premier échoue", async () => {
    let n = 0;
    const r = await telechargerFeuille("https://docs.google.com/spreadsheets/d/ABC/edit", {
      fetchImpl: async () => {
        n++;
        return n === 1 ? reponse("", false) : reponse("Exercice,Séries\nSquat,5");
      }
    });
    assert.equal(n, 2);
    assert.equal(r.ok, true);
    assert.ok(r.texte.includes("Squat"));
  });

  test("un blocage du navigateur est rendu comme un problème réseau", async () => {
    const r = await telechargerFeuille("https://docs.google.com/spreadsheets/d/ABC/edit", {
      fetchImpl: async () => {
        throw new TypeError("Failed to fetch");
      }
    });
    assert.deepEqual(r, { ok: false, raison: "reseau" });
  });
});
