/**
 * Defis de 30 jours (app/src/lib/defis.js), repris de l'app Neiram et
 * adaptes au coaching : pas de jeune, pas de partage, « Noter ma forme ».
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  DEFIS,
  DEFI_SEUIL,
  abandonner,
  avancementDefi,
  cloturerSiFini,
  commencer,
  defiParId,
  defisReussis,
  etatVide,
  joursDuDefi,
  reparerEtat,
  valideurDuDefi
} from "../app/src/lib/defis.js";

const valides = (ensemble) => (date) => ensemble.has(date);

describe("regles de validation", () => {
  const regle = (id) => defiParId(id).valide;
  test("pas, eau, fruits et legumes, sommeil", () => {
    assert.equal(regle("pas-8000")({ form: { steps: 8000 } }), true);
    assert.equal(regle("pas-8000")({ form: { steps: 7999 } }), false);
    assert.equal(regle("eau-2l")({ form: { waterMl: 2000 } }), true);
    assert.equal(regle("fruits-legumes-5")({ form: { fruits: 2, vegetables: 3 } }), true);
    assert.equal(regle("fruits-legumes-5")({ form: { fruits: 4 } }), false);
    assert.equal(regle("sommeil-7h")({ form: { sleepHours: 7.5 } }), true);
    assert.equal(regle("sommeil-7h")({ form: {} }), false);
  });
  test("repas, proteines, bouger, forme notee", () => {
    assert.equal(regle("repas-notes")({ entrees: [1, 2, 3] }), true);
    assert.equal(regle("proteines")({ totaux: { protein: 90 }, objectifs: { protein: 100 } }), true);
    assert.equal(regle("proteines")({ totaux: { protein: 80 }, objectifs: { protein: 100 } }), false);
    assert.equal(regle("proteines")({ totaux: { protein: 80 }, objectifs: {} }), false);
    assert.equal(regle("bouger")({ seances: [{}], form: {} }), true);
    assert.equal(regle("bouger")({ seances: [], form: { steps: 6500 } }), true);
    assert.equal(regle("forme-notee")({ form: { energy: 3 } }), true);
    assert.equal(regle("forme-notee")({ form: { waterMl: 500 } }), false);
  });
  test("pas de defi jeune dans l'app coach", () => {
    assert.equal(defiParId("jeune-14h"), null);
  });
  test("donnees absentes : jamais d'erreur, jamais valide", () => {
    for (const d of DEFIS) assert.equal(d.valide({}), false, d.id);
  });
});

describe("avancement", () => {
  test("30 cases, jour courant, valides, manques", () => {
    const e = commencer(etatVide(), "pas-8000", "2026-10-01");
    const ok = new Set(["2026-10-01", "2026-10-02", "2026-10-04"]);
    const a = avancementDefi(e.enCours, "2026-10-05", valides(ok));
    assert.equal(a.cases.length, 30);
    assert.equal(a.jourNumero, 5);
    assert.equal(a.valides, 3);
    assert.deepEqual(a.cases.slice(0, 6).map((c) => c.etat), ["valide", "valide", "manque", "valide", "aujourdhui", "avenir"]);
    assert.equal(a.termine, false);
    assert.equal(a.atteignable, true);
  });

  test("plus de 5 jours manques : plus atteignable", () => {
    const e = commencer(etatVide(), "eau-2l", "2026-10-01");
    const a = avancementDefi(e.enCours, "2026-10-08", () => false);
    assert.equal(a.atteignable, false);
  });

  test("cloture le lendemain du 30e jour, reussi a partir du seuil", () => {
    const e = commencer(etatVide(), "eau-2l", "2026-10-01");
    const ok = new Set(joursDuDefi("2026-10-01").slice(0, DEFI_SEUIL));
    assert.equal(cloturerSiFini(e, "2026-10-30", valides(ok)), e);
    const fini = cloturerSiFini(e, "2026-10-31", valides(ok));
    assert.equal(fini.enCours, null);
    assert.deepEqual(fini.termines[0], { id: "eau-2l", debut: "2026-10-01", valides: DEFI_SEUIL });
    assert.equal(defisReussis(fini).length, 1);
  });

  test("abandonner efface le defi en cours, pas les termines", () => {
    const e = { enCours: { id: "eau-2l", debut: "2026-10-01" }, termines: [{ id: "bouger", debut: "2026-09-01", valides: 28 }] };
    const a = abandonner(e);
    assert.equal(a.enCours, null);
    assert.equal(a.termines.length, 1);
  });
});

describe("robustesse", () => {
  test("valideur : le journal, les repas et les seances du jour seulement", () => {
    const totaux = (entrees) => ({ protein: entrees.reduce((a, e) => a + e.protein, 0) });
    const donnees = {
      journal: [{ date: "2026-10-02", steps: 9000 }, null],
      repas: [{ date: "2026-10-02", protein: 60 }, { date: "2026-10-02", protein: 40 }, { date: "2026-10-03", protein: 200 }],
      seances: [{ date: "2026-10-03" }],
      objectifs: { protein: 100 },
      totauxDuJour: totaux
    };
    assert.equal(valideurDuDefi(defiParId("pas-8000"), donnees)("2026-10-02"), true);
    assert.equal(valideurDuDefi(defiParId("pas-8000"), donnees)("2026-10-03"), false);
    assert.equal(valideurDuDefi(defiParId("proteines"), donnees)("2026-10-02"), true);
    assert.equal(valideurDuDefi(defiParId("bouger"), donnees)("2026-10-03"), true);
    assert.equal(valideurDuDefi(defiParId("bouger"), {})("2026-10-03"), false);
  });

  test("etat abime remis en forme", () => {
    const e = reparerEtat({ enCours: { id: "inconnu", debut: "2026-10-01" }, termines: [null, { id: "eau-2l", debut: "2026-10-01", valides: "40" }] });
    assert.equal(e.enCours, null);
    assert.deepEqual(e.termines, [{ id: "eau-2l", debut: "2026-10-01", valides: 30 }]);
    assert.deepEqual(reparerEtat(42), etatVide());
  });

  test("commencer un defi inconnu ne change rien", () => {
    const e = etatVide();
    assert.equal(commencer(e, "rien", "2026-10-01"), e);
  });
});
