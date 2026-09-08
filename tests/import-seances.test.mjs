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
