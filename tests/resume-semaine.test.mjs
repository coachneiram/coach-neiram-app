/**
 * Resume nutrition des 7 derniers jours, et paliers de serie.
 *
 * Le resume parle au client : ses moyennes, son meilleur jour, et un seul
 * axe de travail. Ces tests verrouillent la fenetre, les moyennes (sur les
 * jours saisis seulement), le choix de l'axe, et les paliers de serie.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  JOURS_MINIMUM,
  PALIERS_SERIE,
  axeDeTravail,
  etatPaliers,
  fenetre,
  resumeNutritionSemaine,
  serieDuJour
} from "../app/src/lib/resume-semaine.js";

const FIN = "2026-09-29";
const OBJ = { calories: 2000, protein: 120, carbs: 220, fat: 70 };
const repas = (date, calories, protein = 120, carbs = 220, fat = 70) => ({ date, calories, protein, carbs, fat });

describe("Fenetre de 7 jours", () => {
  test("les 7 jours se terminant au jour donne, dans l'ordre", () => {
    assert.deepEqual(fenetre(FIN), [
      "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29"
    ]);
    assert.equal(fenetre("2026-03-02")[0], "2026-02-24");
  });
});

describe("Resume de la semaine", () => {
  test("moyennes par jour saisi, plusieurs repas par jour additionnes", () => {
    const r = resumeNutritionSemaine({
      entrees: [
        repas("2026-09-29", 1200, 60, 100, 40), repas("2026-09-29", 800, 60, 100, 30),
        repas("2026-09-28", 2200, 100, 250, 80),
        repas("2026-09-20", 9000) // hors fenetre
      ],
      journal: [],
      objectifs: OBJ,
      fin: FIN
    });
    assert.equal(r.joursSaisis, 2);
    assert.deepEqual(r.moyennes, { kcal: 2100, p: 110, c: 225, f: 75 });
    assert.equal(r.debut, "2026-09-23");
  });

  test("un jour vide ne compte pas pour zero", () => {
    const r = resumeNutritionSemaine({ entrees: [repas("2026-09-29", 1800)], journal: [], objectifs: OBJ, fin: FIN });
    assert.equal(r.moyennes.kcal, 1800);
  });

  test("jours dans la cible a 10 % pres, et meilleur jour le plus proche", () => {
    const r = resumeNutritionSemaine({
      entrees: [repas("2026-09-24", 2150), repas("2026-09-25", 1990), repas("2026-09-26", 2600), repas("2026-09-27", 1790)],
      journal: [],
      objectifs: OBJ,
      fin: FIN
    });
    assert.equal(r.joursDansLaCible, 2);
    assert.deepEqual(r.meilleurJour, { date: "2026-09-25", kcal: 1990 });
  });

  test("a egalite, le meilleur jour est le plus recent", () => {
    const r = resumeNutritionSemaine({
      entrees: [repas("2026-09-24", 1900), repas("2026-09-28", 2100)],
      journal: [],
      objectifs: OBJ,
      fin: FIN
    });
    assert.equal(r.meilleurJour.date, "2026-09-28");
  });

  test("sans objectif calorique : ni cible ni meilleur jour", () => {
    const r = resumeNutritionSemaine({ entrees: [repas(FIN, 2000)], journal: [], objectifs: {}, fin: FIN });
    assert.equal(r.joursDansLaCible, null);
    assert.equal(r.meilleurJour, null);
  });

  test("aucune saisie : moyennes nulles, sans erreur", () => {
    const r = resumeNutritionSemaine({ entrees: [], journal: undefined, objectifs: OBJ, fin: FIN });
    assert.equal(r.joursSaisis, 0);
    assert.deepEqual(r.moyennes, { kcal: null, p: null, c: null, f: null });
    assert.equal(r.axe.cle, "regularite");
  });

  test("les portions de fruits et legumes de la fenetre sont reprises", () => {
    const r = resumeNutritionSemaine({
      entrees: [],
      journal: [{ date: FIN, fruits: 2, vegetables: 1 }, { date: "2026-09-10", fruits: 9 }],
      objectifs: OBJ,
      fin: FIN
    });
    assert.equal(r.avgFruitsVeg, 3);
  });
});

describe("Axe de travail : un seul, par ordre de priorite", () => {
  const base = { joursSaisis: 6, moyennes: { kcal: 2000, p: 120, c: 220, f: 70 }, objectifs: OBJ, avgFruitsVeg: null };

  test("trop peu de jours notes passe avant tout", () => {
    const a = axeDeTravail({ ...base, joursSaisis: JOURS_MINIMUM - 1, moyennes: { kcal: 3000, p: 20 } });
    assert.equal(a.cle, "regularite");
    assert.match(a.texte, /3 jours notés sur 7/);
    assert.match(axeDeTravail({ ...base, joursSaisis: 1 }).texte, /1 jour noté sur 7/);
  });

  test("puis les proteines sous 85 % de l'objectif", () => {
    const a = axeDeTravail({ ...base, moyennes: { ...base.moyennes, p: 90, kcal: 2600 } });
    assert.equal(a.cle, "proteines");
    assert.match(a.texte, /90 g par jour pour 120 g/);
    assert.notEqual(axeDeTravail({ ...base, moyennes: { ...base.moyennes, p: 103 } }).cle, "proteines");
    // Borne : 100 g pour 120 visés, c'est 83 % — sous le seuil de 85 %.
    assert.equal(axeDeTravail({ ...base, moyennes: { ...base.moyennes, p: 100 } }).cle, "proteines");
  });

  test("puis les calories trop hautes, puis trop basses", () => {
    assert.equal(axeDeTravail({ ...base, moyennes: { ...base.moyennes, kcal: 2250 } }).cle, "calories-hautes");
    assert.equal(axeDeTravail({ ...base, moyennes: { ...base.moyennes, kcal: 2150 } }).cle, "cap");
    assert.equal(axeDeTravail({ ...base, moyennes: { ...base.moyennes, kcal: 1650 } }).cle, "calories-basses");
    assert.equal(axeDeTravail({ ...base, moyennes: { ...base.moyennes, kcal: 1750 } }).cle, "cap");
  });

  test("puis les fruits et legumes, seulement s'ils sont comptes", () => {
    assert.equal(axeDeTravail({ ...base, avgFruitsVeg: 3 }).cle, "fruits-legumes");
    assert.equal(axeDeTravail({ ...base, avgFruitsVeg: 5 }).cle, "cap");
    assert.equal(axeDeTravail({ ...base, avgFruitsVeg: null }).cle, "cap");
  });
});

describe("Paliers de serie", () => {
  test("paliers 7, 14, 30, 60, 100", () => {
    assert.deepEqual(PALIERS_SERIE, [7, 14, 30, 60, 100]);
  });

  test("prochain palier et jours restants", () => {
    assert.deepEqual(etatPaliers(5), { jours: 5, atteint: null, prochain: 7, reste: 2 });
    assert.deepEqual(etatPaliers(8), { jours: 8, atteint: null, prochain: 14, reste: 6 });
    assert.deepEqual(etatPaliers(0), { jours: 0, atteint: null, prochain: 7, reste: 7 });
  });

  test("le palier n'est celebre que le jour ou il tombe", () => {
    assert.equal(etatPaliers(7).atteint, 7);
    assert.equal(etatPaliers(30).atteint, 30);
    assert.equal(etatPaliers(31).atteint, null);
  });

  test("au-dela du dernier palier, plus de prochain", () => {
    assert.deepEqual(etatPaliers(100), { jours: 100, atteint: 100, prochain: null, reste: null });
    assert.deepEqual(etatPaliers(115), { jours: 115, atteint: null, prochain: null, reste: null });
  });
});

describe("Serie affichee le jour meme", () => {
  const jours = (n, depuis) =>
    Array.from({ length: n }, (_, k) => {
      const d = new Date(depuis + "T12:00:00");
      d.setDate(d.getDate() - k);
      return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` };
    });

  test("aujourd'hui note : la serie le compte", () => {
    const s = serieDuJour({ date: FIN, repas: jours(7, FIN), journal: [], seances: [] });
    assert.equal(s.jours, 7);
    assert.equal(s.atteint, 7);
    assert.equal(s.aujourdhuiNote, true);
  });

  test("le matin, rien encore note : la serie d'hier, sans celebration", () => {
    const s = serieDuJour({ date: FIN, repas: jours(7, "2026-09-28"), journal: [], seances: [] });
    assert.equal(s.jours, 7);
    assert.equal(s.atteint, null);
    assert.equal(s.aujourdhuiNote, false);
  });

  test("les paliers au-dela de 60 jours sont atteignables", () => {
    assert.equal(serieDuJour({ date: FIN, repas: jours(100, FIN), journal: [], seances: [] }).atteint, 100);
  });
});
