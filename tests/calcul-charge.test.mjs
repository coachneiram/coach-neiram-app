/**
 * Mode Force : % 1RM, RIR et calcul de la charge (rebranche le 22/10/2026).
 *
 * L'ancienne application (index.html, PowerliftingFields, l. 4000-4013)
 * proposait deux boutons « appliquer » (table RPE, % du maxi). La migration
 * les avait perdus : chargeFrom1RM n'etait plus appelee nulle part et les
 * maxis saisis dans « Force athletique » ne servaient plus a rien. Ces tests
 * verrouillent le calcul ET le branchement a l'ecran. App coach : sans
 * restriction (pas de Premium).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AIDE_MAXI_MANQUANT, appliquerProposition, fmtNombre, propositionsCharge } from "../app/src/lib/calcul-charge.js";

const MAXIS = { squat: 140, bench: 100, deadlift: 180 };

describe("propositions de charge", () => {
  test("table RPE : 5 reps @ RPE 8 = 81,1 % du maxi", () => {
    const p = propositionsCharge({ name: "Squat barre (compétition)", mode: "powerlifting", reps: "5", rpe: "8" }, MAXIS);
    assert.equal(p.mouvement, "squat");
    assert.equal(p.table.pct, 81.1);
    // 140 × 81,1 % = 113,54 -> arrondi au pas de 2,5 kg
    assert.equal(p.table.charge, 112.5);
    assert.equal(p.table.libelle, "Table RPE : 5 reps @ RPE 8 = 81,1 % = 112,5 kg — appliquer");
  });

  test("le RIR remplace le RPE absent (2 RIR = RPE 8)", () => {
    const p = propositionsCharge({ name: "Squat", reps: "5", rir: "2" }, MAXIS);
    assert.equal(p.table.rpe, 8);
    assert.equal(p.table.pct, 81.1);
  });

  test("le RPE saisi prime sur le RIR", () => {
    const p = propositionsCharge({ name: "Squat", reps: "5", rpe: "9", rir: "2" }, MAXIS);
    assert.equal(p.table.rpe, 9);
  });

  test("les series saisies une a une : la serie de reference fixe reps et RPE", () => {
    const ex = {
      name: "Développé couché",
      series: [
        { weight: "60", reps: "8", rpe: "", fait: true },
        { weight: "80", reps: "3", rpe: "8", fait: false }
      ]
    };
    const p = propositionsCharge(ex, MAXIS);
    assert.equal(p.table.reps, 3);
    assert.equal(p.table.pct, 86.3);
  });

  test("% 1RM saisi : 80 % de 140 kg = 112,5 kg", () => {
    const p = propositionsCharge({ name: "Squat", pct1rm: "80" }, MAXIS);
    assert.deepEqual({ pct: p.depuisPct.pct, charge: p.depuisPct.charge }, { pct: 80, charge: 112.5 });
    assert.equal(p.depuisPct.libelle, "80 % de 140 kg = 112,5 kg — appliquer");
  });

  test("maxi absent : pas de charge, mais le % de la table et l'aide", () => {
    const p = propositionsCharge({ name: "Soulevé de terre", reps: "3", rpe: "8" }, {});
    assert.equal(p.table.charge, null);
    assert.equal(p.table.libelle, "Table RPE : 3 reps @ RPE 8 = 86,3 % — appliquer");
    assert.equal(p.depuisPct, null);
    assert.equal(p.maxiManquant, true);
  });

  test("maxi nul ou illisible : traite comme absent", () => {
    for (const maxi of [0, "", "abc", -50, null]) {
      const p = propositionsCharge({ name: "Squat", pct1rm: "80", reps: "5", rpe: "8" }, { squat: maxi });
      assert.equal(p.maxi, null, String(maxi));
      assert.equal(p.depuisPct, null);
      assert.equal(p.maxiManquant, true);
    }
  });

  test("maxis absents (undefined) : aucune erreur", () => {
    const p = propositionsCharge({ name: "Squat", reps: "5", rpe: "8" }, undefined);
    assert.equal(p.maxiManquant, true);
    assert.equal(p.table.charge, null);
  });

  test("exercice hors competition : aucune aide de maxi, pas de charge depuis le %", () => {
    const p = propositionsCharge({ name: "Squat bulgare", pct1rm: "70", reps: "8", rpe: "8" }, MAXIS);
    assert.equal(p.mouvement, null);
    assert.equal(p.maxiManquant, false);
    assert.equal(p.depuisPct, null);
    assert.ok(p.table, "la table RPE reste utile sans maxi");
  });

  test("hors table (RPE < 6,5 ou plus de 12 reps) : pas de proposition", () => {
    assert.equal(propositionsCharge({ name: "Squat", reps: "15", rpe: "8" }, MAXIS).table, null);
    assert.equal(propositionsCharge({ name: "Squat", reps: "5", rpe: "5" }, MAXIS).table, null);
  });

  test("exercice vide ou abime : aucune proposition, aucune erreur", () => {
    for (const ex of [{}, { name: "" }, { name: "Squat", reps: "", rpe: "" }]) {
      const p = propositionsCharge(ex, MAXIS);
      assert.equal(p.table, null);
      assert.equal(p.depuisPct, null);
    }
  });

  test("nombres a la francaise", () => {
    assert.equal(fmtNombre(112.5), "112,5");
    assert.equal(fmtNombre(80), "80");
    assert.equal(fmtNombre("81.1"), "81,1");
  });
});

describe("appliquer", () => {
  test("la charge va dans les series pas encore faites ; le % est note", () => {
    const ex = {
      name: "Squat",
      series: [
        { weight: "100", reps: "5", rpe: "", fait: true },
        { weight: "100", reps: "5", rpe: "", fait: false },
        { weight: "100", reps: "5", rpe: "", fait: false }
      ]
    };
    const c = appliquerProposition(ex, { pct: 80, charge: 112.5 });
    assert.equal(c.pct1rm, "80");
    assert.deepEqual(c.series.map((s) => s.weight), ["100", "112.5", "112.5"]);
    assert.equal(c.weight, "112.5", "la charge de reference suit");
  });

  test("l'exercice d'origine n'est pas modifie (le correctif est une copie)", () => {
    const ex = { name: "Squat", series: [{ weight: "100", reps: "5", rpe: "", fait: false }] };
    const avant = JSON.stringify(ex);
    appliquerProposition(ex, { pct: 80, charge: 112.5 });
    assert.equal(JSON.stringify(ex), avant);
  });

  test("ancien format (sans series) : les lignes deduites recoivent la charge", () => {
    const c = appliquerProposition({ name: "Squat", sets: "3", reps: "5", weight: "100" }, { pct: 80, charge: 112.5 });
    assert.equal(c.series.length, 3);
    assert.ok(c.series.every((s) => s.weight === "112.5"));
  });

  test("sans charge connue : seul le % est note", () => {
    assert.deepEqual(appliquerProposition({ name: "Squat" }, { pct: 81.1, charge: null }), { pct1rm: "81.1" });
  });
});

describe("branchement a l'ecran", () => {
  const lire = (c) => readFileSync(join(process.cwd(), c), "utf8");

  test("le constructeur affiche le calcul en mode Force, sans restriction", () => {
    const src = lire("app/src/ecrans/ConstructeurSeances.jsx");
    assert.match(src, /import \{ CalculCharge \} from "\.\/CalculCharge\.jsx";/);
    assert.match(src, /mode === "powerlifting" && \(\s*<div[^>]*>\s*<CalculCharge/);
    assert.match(src, /maxis=\{maxisForce\}/);
    assert.match(src, /onModifier=\{\(correctif\) => modifierExercice\(i, correctif\)\}/);
    assert.doesNotMatch(src, /estPremium|VerrouPremium/, "l'app coach n'a pas de Premium");
    // Juste apres le bloc « Type de série ».
    assert.ok(src.indexOf("<CalculCharge") > src.indexOf("Type de série"));
  });

  test("l'ecran propose % 1RM, RIR, les deux boutons et l'aide", () => {
    const src = lire("app/src/ecrans/CalculCharge.jsx");
    for (const motif of [/% 1RM/, /RIR/, /data-appliquer-table/, /data-appliquer-pct/, /AIDE_MAXI_MANQUANT/]) {
      assert.match(src, motif);
    }
    assert.match(AIDE_MAXI_MANQUANT, /Force athlétique/);
  });

  test("les maxis de « Force athletique » arrivent jusqu'au constructeur", () => {
    assert.match(lire("app/src/ecrans/Entrainements.jsx"), /maxisForce=\{maxisForce\}/);
  });
});
