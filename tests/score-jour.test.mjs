/**
 * Score du jour.
 *
 * AVERTISSEMENT sur la methode : contrairement aux autres portages, celui-ci
 * n'est PAS verifie par parite. Dans l'application actuelle, ce calcul est
 * ecrit a l'interieur du composant d'affichage et non dans une fonction
 * appelable : il n'y a rien a comparer automatiquement.
 *
 * Chaque regle est donc verifiee separement, avec des valeurs calculees a
 * la main a partir du code d'origine. C'est moins solide qu'une parite, et
 * ce fichier merite une relecture attentive avant la bascule.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  composantesDuScore,
  fmtL,
  libelleDuScore,
  scoreDuJour,
  totauxDuJour
} from "../app/src/lib/score-jour.js";

const DATE = "2026-09-02"; // un mercredi
const LUNDI = "2026-08-31";

/** Contexte minimal, que chaque test enrichit de ce qui l'interesse. */
const contexte = (extra = {}) => ({
  journalDuJour: {},
  entreesDuJour: [],
  totaux: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  profil: {},
  objectifs: { calories: 2000 },
  seances: [],
  date: DATE,
  ...extra
});

const valeurDe = (composantes, cle) => composantes.find((c) => c.key === cle)?.value;

describe("totaux du jour", () => {
  test("les entrees s'additionnent", () => {
    const t = totauxDuJour([
      { calories: 500, protein: 30, carbs: 50, fat: 15 },
      { calories: 300, protein: 20, carbs: 30, fat: 10 }
    ]);
    assert.deepEqual(t, { calories: 800, protein: 50, carbs: 80, fat: 25 });
  });

  test("une valeur manquante ou illisible compte pour zero, sans tout casser", () => {
    const t = totauxDuJour([{ calories: 500 }, { calories: "abc", protein: "20" }]);
    assert.equal(t.calories, 500);
    assert.equal(t.protein, 20);
  });

  test("aucune entree donne des totaux a zero, pas une erreur", () => {
    assert.deepEqual(totauxDuJour([]), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    assert.deepEqual(totauxDuJour(null), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe("ce qui n'est pas renseigne ne compte pas", () => {
  test("une journee vide n'a pas de score du tout", () => {
    // Zero se lirait comme un echec. L'absence de score dit la verite :
    // le client n'a rien saisi.
    const c = composantesDuScore(contexte());
    assert.deepEqual(c, []);
    assert.equal(scoreDuJour(c), null);
    assert.equal(libelleDuScore(null), "");
  });

  test("les pas non saisis ne font pas chuter le score", () => {
    const avecPas = composantesDuScore(contexte({ journalDuJour: { steps: 8000, energy: 5 } }));
    const sansPas = composantesDuScore(contexte({ journalDuJour: { energy: 5 } }));
    assert.equal(scoreDuJour(avecPas), 100);
    assert.equal(scoreDuJour(sansPas), 100, "l'absence de pas ne doit pas pénaliser");
    assert.equal(valeurDe(sansPas, "steps"), undefined);
  });

  test("zero pas saisi est traite comme non saisi", () => {
    const c = composantesDuScore(contexte({ journalDuJour: { steps: 0, waterMl: 0 } }));
    assert.equal(valeurDe(c, "steps"), undefined);
    assert.equal(valeurDe(c, "hydration"), undefined);
  });
});

describe("bien-etre", () => {
  test("le sommeil est rapporte a l'objectif du profil", () => {
    const c = composantesDuScore(contexte({ journalDuJour: { sleepHours: 4 }, profil: { targetSleepHours: 8 } }));
    assert.equal(valeurDe(c, "wellbeing"), 50);
  });

  test("dormir plus que l'objectif ne depasse pas 100", () => {
    const c = composantesDuScore(contexte({ journalDuJour: { sleepHours: 12 }, profil: { targetSleepHours: 8 } }));
    assert.equal(valeurDe(c, "wellbeing"), 100);
  });

  test("le stress est inverse : beaucoup de stress fait baisser", () => {
    const calme = composantesDuScore(contexte({ journalDuJour: { stress: 2 } }));
    const tendu = composantesDuScore(contexte({ journalDuJour: { stress: 8 } }));
    assert.equal(valeurDe(calme, "wellbeing"), 80);
    assert.equal(valeurDe(tendu, "wellbeing"), 20);
  });

  test("l'energie est notee sur cinq", () => {
    assert.equal(valeurDe(composantesDuScore(contexte({ journalDuJour: { energy: 5 } })), "wellbeing"), 100);
    assert.equal(valeurDe(composantesDuScore(contexte({ journalDuJour: { energy: 1 } })), "wellbeing"), 20);
  });

  test("seules les composantes renseignees entrent dans la moyenne", () => {
    // Sommeil 8/8 = 100, stress 5 → 50. Moyenne 75, l'energie absente ne
    // tirant pas vers le bas.
    const c = composantesDuScore(contexte({ journalDuJour: { sleepHours: 8, stress: 5 } }));
    assert.equal(valeurDe(c, "wellbeing"), 75);
  });

  test("l'objectif de sommeil par defaut est de huit heures", () => {
    assert.equal(valeurDe(composantesDuScore(contexte({ journalDuJour: { sleepHours: 8 } })), "wellbeing"), 100);
  });
});

describe("hydratation et pas", () => {
  test("l'eau est rapportee a l'objectif en litres du profil", () => {
    const c = composantesDuScore(contexte({ journalDuJour: { waterMl: 1000 }, profil: { targetWaterL: 2 } }));
    assert.equal(valeurDe(c, "hydration"), 50);
  });

  test("boire plus que l'objectif ne depasse pas 100", () => {
    const c = composantesDuScore(contexte({ journalDuJour: { waterMl: 5000 }, profil: { targetWaterL: 2 } }));
    assert.equal(valeurDe(c, "hydration"), 100);
  });

  test("les objectifs par defaut sont deux litres et huit mille pas", () => {
    assert.equal(valeurDe(composantesDuScore(contexte({ journalDuJour: { waterMl: 2000 } })), "hydration"), 100);
    assert.equal(valeurDe(composantesDuScore(contexte({ journalDuJour: { steps: 8000 } })), "steps"), 100);
  });
});

describe("nutrition", () => {
  test("c'est l'ecart a l'objectif qui compte, pas le total", () => {
    // Manger 3000 kcal quand on en vise 2000 est aussi loin de la cible
    // que d'en manger 1000.
    const base = { entreesDuJour: [{ calories: 1 }], objectifs: { calories: 2000 } };
    const pile = composantesDuScore(contexte({ ...base, totaux: { calories: 2000 } }));
    const trop = composantesDuScore(contexte({ ...base, totaux: { calories: 3000 } }));
    const pasAssez = composantesDuScore(contexte({ ...base, totaux: { calories: 1000 } }));

    assert.equal(valeurDe(pile, "nutrition"), 100);
    assert.equal(valeurDe(trop, "nutrition"), valeurDe(pasAssez, "nutrition"));
    assert.equal(valeurDe(trop, "nutrition"), 50);
  });

  test("sans repas saisi, la nutrition n'est pas notee", () => {
    const c = composantesDuScore(contexte({ entreesDuJour: [], totaux: { calories: 0 } }));
    assert.equal(valeurDe(c, "nutrition"), undefined);
  });

  test("sans objectif calorique, la nutrition n'est pas notee", () => {
    const c = composantesDuScore(contexte({ entreesDuJour: [{ calories: 1 }], objectifs: {} }));
    assert.equal(valeurDe(c, "nutrition"), undefined);
  });

  test("un ecart enorme plancher a zero et ne devient jamais negatif", () => {
    const c = composantesDuScore(
      contexte({ entreesDuJour: [{ calories: 1 }], totaux: { calories: 9000 }, objectifs: { calories: 2000 } })
    );
    assert.equal(valeurDe(c, "nutrition"), 0);
  });
});

describe("entrainement", () => {
  const profil = { weeklyWorkoutTarget: 3 };

  test("seules les seances de la semaine en cours comptent", () => {
    const c = composantesDuScore(
      contexte({
        profil,
        seances: [
          { date: LUNDI },
          { date: "2026-09-01" },
          { date: "2026-08-30" } // semaine précédente
        ]
      })
    );
    // Deux seances sur trois : la composante n'est pas arrondie, seul le
    // score global l'est.
    assert.equal(valeurDe(c, "training"), (2 / 3) * 100);
  });

  test("les seances posterieures a la date consultee ne comptent pas", () => {
    // Consulter mercredi ne doit pas creediter une seance de vendredi.
    const c = composantesDuScore(contexte({ profil, seances: [{ date: "2026-09-04" }] }));
    assert.equal(valeurDe(c, "training"), 0);
  });

  test("sans objectif hebdomadaire, l'entrainement n'est pas note", () => {
    const c = composantesDuScore(contexte({ profil: {}, seances: [{ date: LUNDI }] }));
    assert.equal(valeurDe(c, "training"), undefined);
  });

  test("depasser l'objectif ne depasse pas 100", () => {
    const c = composantesDuScore(
      contexte({ profil, seances: [{ date: LUNDI }, { date: "2026-09-01" }, { date: "2026-09-02" }, { date: "2026-09-02" }] })
    );
    assert.equal(valeurDe(c, "training"), 100);
  });
});

describe("score global et appreciation", () => {
  test("le score est la moyenne des composantes, arrondie", () => {
    const c = [{ value: 100 }, { value: 50 }, { value: 75 }];
    assert.equal(scoreDuJour(c), 75);
  });

  test("les paliers d'appreciation sont ceux de l'application actuelle", () => {
    assert.equal(libelleDuScore(100), "Optimal");
    assert.equal(libelleDuScore(90), "Optimal");
    assert.equal(libelleDuScore(89), "Bon");
    assert.equal(libelleDuScore(70), "Bon");
    assert.equal(libelleDuScore(69), "Correct");
    assert.equal(libelleDuScore(40), "Correct");
    assert.equal(libelleDuScore(39), "Faible");
    assert.equal(libelleDuScore(0), "Faible");
  });
});

describe("affichage des volumes", () => {
  test("les litres sont formates a la francaise", () => {
    assert.equal(fmtL(1500), "1,5 L");
    assert.equal(fmtL(2000), "2 L");
    assert.equal(fmtL(0), "0 L");
    assert.equal(fmtL(null), "0 L");
  });

  test("au plus deux decimales", () => {
    assert.equal(fmtL(1234), "1,23 L");
  });
});
