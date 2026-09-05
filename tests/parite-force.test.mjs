/**
 * Parite de l'estimation de force : ancienne version contre nouvelle.
 *
 * Ces valeurs prescrivent des charges d'entrainement. Une erreur ici ne
 * produit pas un affichage bizarre : elle met du poids en trop sur une
 * barre. Le domaine est donc balaye exhaustivement, bornes comprises, et
 * on verifie surtout que rien n'est extrapole hors de la table connue.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import {
  RPE_CHART,
  chargeFrom1RM,
  epley1RM,
  est1RMFromSet,
  pctFromRPE,
  rpeFromRIR
} from "../app/src/lib/force.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

/** Valeurs valides, limites, et entrees que l'application peut vraiment recevoir. */
const RPE = [null, "", 0, 5, 6, 6.4, 6.5, 6.7, 6.75, 7, 8, 8.2, 8.25, 8.5, 9, 9.5, 10, 10.1, 11, "8", "8.5", "abc"];
const REPS = [null, "", 0, 1, 1.4, 1.5, 2, 5, 8, 12, 12.4, 12.5, 13, 20, "5", "12", "abc"];
const POIDS = [null, "", 0, 20, 42.5, 100, 200, "80", "abc"];
const RIR = [null, "", -1, 0, 0.5, 2, 3, 3.5, 3.6, 4, "2"];

describe("pourcentage selon le RPE", () => {
  test("les deux versions concordent sur tout le domaine", () => {
    let comparaisons = 0;
    for (const rpe of RPE) {
      for (const reps of REPS) {
        assert.equal(pctFromRPE(rpe, reps), legacy.pctFromRPE(rpe, reps), `rpe=${rpe} reps=${reps}`);
        comparaisons++;
      }
    }
    assert.ok(comparaisons > 300, "trop peu de comparaisons : " + comparaisons);
  });

  test("la table n'est jamais extrapolee hors de ses bornes", () => {
    // Au-dela de 12 repetitions ou sous RPE 6,5, aucune valeur de
    // reference n'existe. Inventer un pourcentage la reviendrait a
    // prescrire une charge sortie de nulle part.
    assert.equal(pctFromRPE(10, 13), null);
    assert.equal(pctFromRPE(6, 5), null);
    assert.equal(pctFromRPE(10.5, 5), null);
    assert.notEqual(pctFromRPE(10, 12), null);
    assert.notEqual(pctFromRPE(6.5, 1), null);
  });

  test("aucun RPE hors de la table ne produit de valeur", () => {
    // Invariant qui rend la borne explicite redondante avec la recherche
    // dans la table. Le verifier documente pourquoi deplacer cette borne
    // ne change rien, plutot que de laisser croire qu'elle est sans effet.
    for (let rpe = 0; rpe <= 12; rpe += 0.25) {
      const attendu = RPE_CHART[Math.round(rpe * 2) / 2] !== undefined;
      assert.equal(pctFromRPE(rpe, 5) != null, attendu, "rpe=" + rpe);
    }
  });

  test("la table est identique a celle de l'application actuelle", () => {
    for (const palier of Object.keys(RPE_CHART)) {
      assert.deepEqual(
        Array.from(RPE_CHART[palier]),
        Array.from(legacy.RPE_CHART[palier]),
        "palier RPE " + palier
      );
      assert.equal(RPE_CHART[palier].length, 12, "la table doit couvrir 1 a 12 reps");
    }
  });
});

describe("repetitions en reserve", () => {
  test("les deux versions concordent", () => {
    for (const rir of RIR) {
      assert.equal(rpeFromRIR(rir), legacy.rpeFromRIR(rir), "rir=" + rir);
    }
  });

  test("deux repetitions en reserve valent un RPE de 8", () => {
    assert.equal(rpeFromRIR(2), 8);
  });
});

describe("formule d'Epley", () => {
  test("les deux versions concordent", () => {
    for (const poids of POIDS) {
      for (const reps of REPS) {
        assert.equal(epley1RM(poids, reps), legacy.epley1RM(poids, reps), `poids=${poids} reps=${reps}`);
      }
    }
  });

  test("elle refuse au-dela de 12 repetitions", () => {
    // La formule y devient trop optimiste, et surestimer un maximum se
    // paie en blessure, pas en approximation.
    assert.notEqual(epley1RM(100, 12), null);
    assert.equal(epley1RM(100, 13), null);
  });
});

describe("meilleure estimation pour une serie", () => {
  test("les deux versions concordent sur le domaine complet", () => {
    let comparaisons = 0;
    for (const poids of POIDS) {
      for (const reps of REPS) {
        for (const rpe of [null, "", 7, 8, 8.5, 10, 11]) {
          for (const rir of [null, "", 0, 2, 3.5, 4]) {
            const ancien = legacy.est1RMFromSet(poids, reps, rpe, rir);
            const nouveau = est1RMFromSet(poids, reps, rpe, rir);
            const contexte = `poids=${poids} reps=${reps} rpe=${rpe} rir=${rir}`;
            if (ancien === null || nouveau === null) {
              assert.equal(nouveau, ancien, contexte);
            } else {
              assert.equal(nouveau.value, ancien.value, "valeur — " + contexte);
              assert.equal(nouveau.method, ancien.method, "méthode — " + contexte);
            }
            comparaisons++;
          }
        }
      }
    }
    assert.ok(comparaisons > 2000, "trop peu de comparaisons : " + comparaisons);
  });

  test("le ressenti prime sur la formule quand il est renseigne", () => {
    // La table RPE tient compte de l'effort reel ; Epley ne connait que le
    // nombre de repetitions.
    assert.equal(est1RMFromSet(100, 5, 8, null).method, "RPE");
    assert.equal(est1RMFromSet(100, 5, null, null).method, "Epley");
  });

  test("les repetitions en reserve servent de repli au RPE absent", () => {
    assert.equal(est1RMFromSet(100, 5, null, 2).method, "RPE");
  });
});

describe("charge de travail", () => {
  test("les deux versions concordent", () => {
    for (const pct of [null, "", 0, 50, 65, 72.5, 80, 92.5, 100, "80"]) {
      for (const max of [null, "", 0, 60, 100, 137.5, 200, "100"]) {
        assert.equal(chargeFrom1RM(pct, max), legacy.chargeFrom1RM(pct, max), `pct=${pct} max=${max}`);
      }
    }
  });

  test("la charge tombe toujours sur un multiple de 2,5 kg", () => {
    // C'est le pas des disques : proposer 78,3 kg serait inapplicable.
    for (const pct of [63, 72, 81, 87, 93]) {
      for (const max of [82.5, 100, 137.5]) {
        const charge = chargeFrom1RM(pct, max);
        assert.equal(Math.round(charge * 10) % 25, 0, `${pct}% de ${max} donne ${charge}`);
      }
    }
  });
});
