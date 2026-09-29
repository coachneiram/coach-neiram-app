/**
 * Portions du jour : fruits, legumes, proteines comptes en un geste.
 *
 * Ces tests verrouillent les compteurs, leur place dans le score du jour,
 * et ce qui remonte au coach dans le bilan de la semaine. Ils verifient
 * aussi l'essentiel pour la compatibilite : tant que le client ne compte
 * rien, score, bilan et prompt restent ceux de l'application d'origine.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PORTIONS,
  ajusterPortion,
  composantesPortions,
  fruitsEtLegumes,
  lirePortion,
  moyennesPortions
} from "../app/src/lib/portions-jour.js";
import { composantesDuScore } from "../app/src/lib/score-jour.js";
import { bilanHebdomadaire } from "../app/src/lib/bilan.js";
import { promptBilanHebdo } from "../app/src/lib/bilan-ia.js";
import { construireBilanHTML } from "../app/src/lib/bilan-html.js";

describe("Compteurs de portions", () => {
  test("trois compteurs : fruits, legumes, proteines", () => {
    assert.deepEqual(PORTIONS.map((p) => p.cle), ["fruits", "vegetables", "proteinPortions"]);
  });

  test("un compteur absent, vide ou invalide vaut 0", () => {
    assert.equal(lirePortion({}, "fruits"), 0);
    assert.equal(lirePortion(null, "fruits"), 0);
    assert.equal(lirePortion({ fruits: "abc" }, "fruits"), 0);
    assert.equal(lirePortion({ fruits: -2 }, "fruits"), 0);
    assert.equal(lirePortion({ fruits: 3 }, "fruits"), 3);
  });

  test("+ et − ajoutent ou retirent une portion, sans passer sous 0 ni au-dessus de 20", () => {
    assert.equal(ajusterPortion(0, 1), 1);
    assert.equal(ajusterPortion(2, -1), 1);
    assert.equal(ajusterPortion(0, -1), 0);
    assert.equal(ajusterPortion(undefined, 1), 1);
    assert.equal(ajusterPortion(20, 1), 20);
  });

  test("fruits et legumes s'additionnent", () => {
    assert.equal(fruitsEtLegumes({ fruits: 2, vegetables: 3, proteinPortions: 4 }), 5);
  });
});

describe("Score du jour", () => {
  test("rien de compte : aucune composante", () => {
    assert.deepEqual(composantesPortions({}), []);
    assert.deepEqual(composantesPortions({ waterMl: 500 }), []);
  });

  test("fruits et legumes rapportes au repere de 5", () => {
    const [fl] = composantesPortions({ fruits: 1, vegetables: 1 });
    assert.equal(fl.key, "fruitsVeg");
    assert.equal(fl.value, 40);
    assert.equal(composantesPortions({ fruits: 4, vegetables: 4 })[0].value, 100, "plafonne a 100");
  });

  test("proteines rapportees a 3 portions, independamment des legumes", () => {
    const c = composantesPortions({ proteinPortions: 2 });
    assert.deepEqual(c.map((x) => x.key), ["proteinPortions"]);
    assert.ok(Math.abs(c[0].value - 200 / 3) < 1e-9);
  });

  test("les portions entrent dans le score du jour", () => {
    const c = composantesDuScore({
      journalDuJour: { fruits: 3, vegetables: 2, proteinPortions: 3 },
      entreesDuJour: [],
      totaux: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      profil: {},
      objectifs: { calories: 2000 },
      seances: [],
      date: "2026-09-02"
    });
    assert.deepEqual(c.map((x) => [x.key, x.value]), [["fruitsVeg", 100], ["proteinPortions", 100]]);
  });

  test("sans portions, le score est exactement celui d'avant", () => {
    const c = composantesDuScore({
      journalDuJour: { waterMl: 1000, steps: 4000 },
      entreesDuJour: [],
      totaux: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      profil: {},
      objectifs: { calories: 2000 },
      seances: [],
      date: "2026-09-02"
    });
    assert.deepEqual(c.map((x) => x.key), ["hydration", "steps"]);
  });
});

describe("Bilan de la semaine envoye au coach", () => {
  test("moyenne sur les jours comptes seulement", () => {
    const journal = [
      { date: "a", fruits: 2, vegetables: 2, proteinPortions: 3 },
      { date: "b", fruits: 1, vegetables: 1 },
      { date: "c", waterMl: 500 }
    ];
    assert.deepEqual(moyennesPortions(journal), { avgFruitsVeg: 3, avgProteinPortions: 3 });
  });

  test("jamais compte : null, pas zero", () => {
    assert.deepEqual(moyennesPortions([{ date: "a", waterMl: 500 }]), { avgFruitsVeg: null, avgProteinPortions: null });
    assert.deepEqual(moyennesPortions(undefined), { avgFruitsVeg: null, avgProteinPortions: null });
  });

  const DONNEES = (journal) => ({
    sessions: [],
    dailyForm: journal,
    bodyLogs: [],
    logEntries: [],
    measurements: [],
    weekPlan: null,
    routines: [],
    hardWeeks: []
  });

  test("les moyennes sont dans le bilan hebdomadaire", () => {
    const s = bilanHebdomadaire(
      "2026-08-31",
      DONNEES([
        { date: "2026-09-01", fruits: 2, vegetables: 3, proteinPortions: 2 },
        { date: "2026-09-02", fruits: 1, vegetables: 2, proteinPortions: 3 },
        { date: "2026-09-10", fruits: 9, vegetables: 9 }
      ]),
      {},
      { calories: 2000 }
    );
    assert.equal(s.avgFruitsVeg, 4);
    assert.equal(s.avgProteinPortions, 2.5);
  });

  const SEMAINE = {
    weekKey: "2026-08-31", start: "2026-08-31", end: "2026-09-06", hasAnyData: true,
    workoutsCount: 2, avgSleepH: 7, loggedDaysCount: 5, adherence: 70,
    avgCalories: 1800, avgProtein: 110, avgCarbs: 180, avgFat: 60,
    painLines: [], sessionNotes: [], dayNotes: []
  };
  const PROFIL = { name: "Test", goal: "perte", dietType: "aucun", allergies: [] };
  const prompt = (s) =>
    promptBilanHebdo({ weekStats: s, lastWeekStats: null, profile: PROFIL, lastActionsText: null, thisPhotos: null, lastPhotos: null });

  test("le prompt du bilan IA cite les portions quand elles existent", () => {
    const p = prompt({ ...SEMAINE, avgFruitsVeg: 3.5, avgProteinPortions: 2 });
    assert.match(p, /Fruits et légumes : 3\.5 portions\/jour en moyenne \(repère : 5\)/);
    assert.match(p, /Portions de protéines : 2\/jour en moyenne/);
  });

  test("et n'en dit rien sinon", () => {
    const p = prompt({ ...SEMAINE, avgFruitsVeg: null, avgProteinPortions: null });
    assert.doesNotMatch(p, /Fruits et légumes|Portions de protéines/);
  });

  test("le rapport envoye au coach les affiche quand elles existent", () => {
    const html = (s) => construireBilanHTML({ profile: PROFIL, weekStats: s, report: null, photos: null, targets: null });
    assert.match(html({ ...SEMAINE, avgFruitsVeg: 4.2, avgProteinPortions: 2.5 }), /4\.2 portions \/ 5/);
    assert.match(html({ ...SEMAINE, avgFruitsVeg: 4.2, avgProteinPortions: 2.5 }), /2\.5 portions \/ 3/);
    assert.doesNotMatch(html(SEMAINE), /Fruits &amp; légumes|Fruits & légumes/);
  });
});
