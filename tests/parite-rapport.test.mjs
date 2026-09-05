/**
 * Parite de la lecture des bilans IA : ancienne version contre nouvelle.
 *
 * Le modele repond en texte libre. Ce decoupage est donc fragile par
 * nature : « RESUME », « Résumé », « ## RÉSUMÉ » et « 1. Resume » doivent
 * tomber sur la meme section. On compare les deux implementations sur des
 * reponses realistes, y compris malformees.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { lireBilan } from "../app/src/lib/rapport.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

/** Compare deux resultats malgre le cloisonnement du bac a sable. */
function memeResultat(texte, quoi) {
  const ancien = legacy.parseBilan(texte);
  const nouveau = lireBilan(texte);
  assert.deepEqual(Object.keys(nouveau).sort(), Array.from(Object.keys(ancien)).sort(), "sections — " + quoi);
  for (const cle of Object.keys(nouveau)) {
    const a = ancien[cle];
    assert.deepEqual(
      Array.isArray(nouveau[cle]) ? Array.from(nouveau[cle]) : nouveau[cle],
      Array.isArray(a) ? Array.from(a) : a,
      `${cle} — ${quoi}`
    );
  }
}

const BILAN_NORMAL = `RESUME
Semaine solide, trois séances tenues sur trois.

EVOLUTION
Poids stable à 78,4 kg.
Tour de taille en baisse de 1 cm.

POINTS FORTS
- Régularité des séances
- Sommeil au-dessus de l'objectif

VIGILANCE
- Apports en protéines encore bas

A CORRIGER
1. Ajouter une source de protéines au petit-déjeuner
2) Coucher avant 23 h

ACTIONS
* Préparer les repas le dimanche
• Reprendre les étirements`;

describe("lecture d'un bilan bien forme", () => {
  test("les deux versions decoupent a l'identique", () => {
    memeResultat(BILAN_NORMAL, "bilan normal");
  });

  test("les puces et les numeros sont retires", () => {
    const s = lireBilan(BILAN_NORMAL);
    assert.deepEqual(s.a_corriger, [
      "Ajouter une source de protéines au petit-déjeuner",
      "Coucher avant 23 h"
    ]);
    assert.deepEqual(s.actions, ["Préparer les repas le dimanche", "Reprendre les étirements"]);
  });

  test("les paragraphes sont recolles sur une seule ligne", () => {
    const s = lireBilan(BILAN_NORMAL);
    assert.equal(s.evolution, "Poids stable à 78,4 kg. Tour de taille en baisse de 1 cm.");
  });
});

describe("variantes de titres que le modele produit vraiment", () => {
  const VARIANTES = [
    "RESUME\nTexte.",
    "Résumé\nTexte.",
    "RÉSUMÉ\nTexte.",
    "## RÉSUMÉ\nTexte.",
    "**Résumé :**\nTexte.",
    "1. Resume\nTexte.",
    "resume\nTexte.",
    "POINTS FORTS\n- Un point",
    "Points forts :\n- Un point",
    "A CORRIGER\n- Une chose",
    "À corriger\n- Une chose"
  ];

  test("chaque variante est lue comme dans l'application actuelle", () => {
    for (const texte of VARIANTES) {
      memeResultat(texte, JSON.stringify(texte));
    }
  });

  test("la limite de longueur d'un titre est franchie au bon endroit", () => {
    /*
     * Ajouter des cas un a un ne prouvait rien : chaque valeur de limite
     * non couverte passait entre les mailles. On balaie donc toutes les
     * longueurs, avec des lignes dont les lettres forment exactement
     * « RESUME » et dont seule la ponctuation varie.
     */
    for (let longueur = 8; longueur <= 60; longueur++) {
      const lettres = "R.E.S.U.M.E";
      if (longueur < lettres.length) continue;
      const ligne = lettres + "-".repeat(longueur - lettres.length);
      assert.equal(ligne.length, longueur);

      const reconnu = lireBilan(ligne + "\nTexte.").resume === "Texte.";
      assert.equal(reconnu, longueur < 40, "longueur " + longueur);
      // Et l'ancienne version doit trancher pareil.
      assert.equal(reconnu, legacy.parseBilan(ligne + "\nTexte.").resume === "Texte.", "longueur " + longueur);
    }
  });

  test("les accents et la ponctuation n'empechent pas la reconnaissance", () => {
    assert.equal(lireBilan("## RÉSUMÉ\nTexte.").resume, "Texte.");
    assert.deepEqual(lireBilan("À corriger\n- Une chose").a_corriger, ["Une chose"]);
  });
});

describe("reponses malformees", () => {
  const CAS = [
    ["texte sans aucun titre", "Le modèle a répondu en une seule phrase sans structure."],
    ["texte vide", ""],
    ["que des espaces", "   \n\n  \n"],
    ["titre seul sans contenu", "RESUME"],
    ["contenu avant le premier titre", "Voici ton bilan :\nRESUME\nLe vrai contenu."],
    // Ce cas-ci ne testait rien : ses lettres ne forment aucun titre connu,
    // donc la longueur n'entrait jamais en jeu. Conserve comme cas normal.
    ["phrase qui ressemble a un titre", "RESUME DE LA SEMAINE ECOULEE POUR LE CLIENT SUIVI\nTexte."],
    // Celui-ci, lui, epuise la regle de longueur : ses lettres forment
    // exactement « RESUME », mais la ligne depasse 40 caracteres. Sans lui,
    // deplacer la limite de 40 a 80 passait inapercu.
    ["titre reconnaissable mais trop long", "R-E-S-U-M-E ------------------------------------\nTexte."],
    ["titre reconnaissable de longueur moyenne", "--- R.E.S.U.M.E -----------\nTexte."],
    ["titre reconnaissable juste sous la limite", "-- R.E.S.U.M.E --\nTexte."],
    ["section repetee", "RESUME\nPremier.\nRESUME\nSecond."],
    ["puces vides", "ACTIONS\n-\n*\n• "],
    ["retours chariot Windows", "RESUME\r\nTexte.\r\nEVOLUTION\r\nSuite."]
  ];

  test("les deux versions se comportent pareil", () => {
    for (const [nom, texte] of CAS) {
      memeResultat(texte, nom);
    }
  });

  test("un texte non structure atterrit dans le resume plutot que nulle part", () => {
    // Un coach prefere un bilan mal decoupe a un ecran blanc.
    const brut = "Le modèle a répondu en une seule phrase sans structure.";
    assert.equal(lireBilan(brut).resume, brut);
  });

  test("un bilan vide ne fabrique pas de fausses sections", () => {
    assert.deepEqual(lireBilan(""), { resume: "" });
  });
});
