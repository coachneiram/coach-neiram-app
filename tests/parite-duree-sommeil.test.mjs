/**
 * Parite du calcul de la duree de sommeil.
 *
 * Le passage de minuit est la subtilite : un coucher a 23 h 30 et un lever
 * a 6 h 45 donnent un ecart negatif. La donnee alimente ensuite le score du
 * jour et le bilan hebdomadaire — une nuit comptee de travers se propage
 * partout.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { dureeDeSommeil } from "../app/src/lib/sommeil.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

/*
 * « ab:cd » et « 12:xx » comptent : ils ont bien deux parties, donc seul le
 * controle isNaN les ecarte. Sans eux, supprimer ce controle ne changeait
 * rien au resultat et la mutation passait inapercue — « abc » etait deja
 * ecarte par le controle de longueur.
 */
const HEURES = [
  "", null, undefined,
  "22:00", "23:30", "00:00", "00:15", "06:45", "07:00", "12:00",
  "abc", "25:99", "7", "ab:cd", "12:xx", ":", "::"
];

describe("duree de sommeil", () => {
  test("les deux versions concordent sur toutes les combinaisons", () => {
    let comparaisons = 0;
    for (const coucher of HEURES) {
      for (const lever of HEURES) {
        assert.equal(
          dureeDeSommeil(coucher, lever),
          legacy.computeSleepHours(coucher, lever),
          `coucher ${coucher} / lever ${lever}`
        );
        comparaisons++;
      }
    }
    assert.ok(comparaisons > 150, "trop peu de comparaisons");
  });

  test("le passage de minuit est compte correctement", () => {
    assert.equal(dureeDeSommeil("23:30", "06:45"), 7.3);
    assert.equal(dureeDeSommeil("22:00", "07:00"), 9);
    assert.equal(dureeDeSommeil("00:30", "08:00"), 7.5);
  });

  test("une sieste dans la journee reste possible", () => {
    assert.equal(dureeDeSommeil("14:00", "15:30"), 1.5);
  });

  test("deux heures identiques ne valent pas vingt-quatre heures", () => {
    // Cela veut dire que le client n'a rien saisi de coherent, pas qu'il a
    // dormi une journee entiere. Compter 24 h fausserait toutes ses
    // moyennes pendant des semaines.
    assert.equal(dureeDeSommeil("23:00", "23:00"), null);
  });

  test("une heure absente ou illisible ne donne pas de duree", () => {
    for (const mauvaise of ["", null, undefined, "abc", "7", "ab:cd", "12:xx"]) {
      assert.equal(dureeDeSommeil(mauvaise, "07:00"), null, "coucher " + mauvaise);
      assert.equal(dureeDeSommeil("23:00", mauvaise), null, "lever " + mauvaise);
    }
  });
});
