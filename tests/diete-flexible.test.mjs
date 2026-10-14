/**
 * Diete flexible (demande du coach du 14 octobre 2026) : le budget se lit a
 * la semaine, un ecart se lisse sur les jours suivants sans jeuner.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { budgetSemaine, messageSemaine, PLANCHER } from "../app/src/lib/diete-flexible.js";

const AUJ = "2026-10-14"; // mercredi : lundi et mardi sont passes, 5 jours restent
const repas = (date, calories) => ({ date, calories });
const net = (t) => t.replace(/[  ]/g, " ");

describe("Budget de la semaine", () => {
  test("une raclette a 4 000 kcal pour 3 000 vises : 200 kcal de moins sur les 5 jours restants", () => {
    const b = budgetSemaine({
      entrees: [repas("2026-10-12", 3000), repas("2026-10-13", 2500), repas("2026-10-13", 1500)],
      objectif: 3000,
      aujourdhui: AUJ
    });
    assert.equal(b.budget, 21000);
    assert.equal(b.ecart, 1000);
    assert.equal(b.joursRestants, 5);
    assert.equal(b.conseilJour, 2800);
    assert.equal(b.reste, 0);
    assert.equal(b.etat, "surplus");
    assert.equal(b.grasMaxG, 130, "1 000 kcal de trop font au plus 130 g de graisse");
    const m = net(messageSemaine(b));
    assert.match(m, /1 000 kcal d'avance/);
    assert.match(m, /Pas besoin de jeûner : vise environ 2 800 kcal par jour sur les 5 jours qui restent/);
    assert.doesNotMatch(m, /semaine prochaine/);
  });

  test("jamais sous 80 % de l'objectif : le reste passe a la semaine suivante", () => {
    const b = budgetSemaine({
      entrees: [repas("2026-10-17", 5000)],
      objectif: 2000,
      aujourdhui: "2026-10-18" // dimanche : il ne reste qu'aujourd'hui
    });
    assert.equal(b.joursRestants, 1);
    assert.equal(b.conseilJour, 2000 * PLANCHER);
    assert.equal(b.reste, 3000 - 400);
    assert.match(net(messageSemaine(b)), /Le reste \(2 600 kcal\) se lisse la semaine prochaine : environ 371 kcal de moins par jour, jamais sous 1 600\./);
  });

  test("une marge ne pousse pas au-dela de 115 % de l'objectif", () => {
    const b = budgetSemaine({ entrees: [repas("2026-10-12", 1000), repas("2026-10-13", 1000)], objectif: 2000, aujourdhui: AUJ });
    assert.equal(b.etat, "marge");
    assert.equal(b.ecart, -2000);
    assert.equal(b.conseilJour, 2300);
    assert.match(net(messageSemaine(b)), /2 000 kcal de marge/);
  });

  test("un jour passe sans saisie compte a l'objectif, pas a zero", () => {
    const b = budgetSemaine({ entrees: [repas("2026-10-13", 2000)], objectif: 2000, aujourdhui: AUJ });
    assert.equal(b.joursSansSaisie, 1);
    assert.equal(b.joursNotes, 1);
    assert.equal(b.ecart, 0);
    assert.equal(b.etat, "equilibre");
    assert.match(net(messageSemaine(b)), /dans les clous : continue autour de 2 000 kcal/);
  });

  test("ce qui est mange aujourd'hui ne compte pas encore dans l'ecart", () => {
    const b = budgetSemaine({ entrees: [repas(AUJ, 3500)], objectif: 2000, aujourdhui: AUJ });
    assert.equal(b.ecart, 0);
    assert.equal(b.jours.find((j) => j.aujourdhui).kcal, 3500);
  });

  test("les repas d'une autre semaine sont ignores ; sans objectif, rien", () => {
    const b = budgetSemaine({ entrees: [repas("2026-10-11", 9000), repas("2026-10-19", 9000)], objectif: 2000, aujourdhui: AUJ });
    assert.equal(b.ecart, 0);
    assert.equal(budgetSemaine({ entrees: [], objectif: null, aujourdhui: AUJ }), null);
    assert.equal(messageSemaine(null), null);
  });
});
