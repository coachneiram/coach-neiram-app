/**
 * « Mon évolution » (demande du coach du 14 octobre 2026) : chaque donnee
 * saisie au jour, a la semaine, au mois et a l'annee.
 *
 * Ces tests verrouillent :
 * - les bornes des periodes (semaine du lundi au dimanche, mois et annee
 *   calendaires, jamais dans le futur) ;
 * - un jour sans saisie reste vide, jamais compte comme zero ;
 * - moyenne par jour note pour ce qui se mesure chaque jour, total pour ce
 *   qui se cumule (seances, minutes) ;
 * - les points cles : comparaison a la periode d'avant, jours a l'objectif,
 *   sens souhaite (le stress doit baisser, le poids selon l'objectif) ;
 * - le francais des phrases.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { bornesPeriode, explorer, GROUPES, indicateur, INDICATEURS, tonEcart } from "../app/src/lib/explorateur.js";

const AUJ = "2026-10-14"; // un mercredi

const donnees = {
  dailyForm: [
    { date: "2026-10-12", steps: 8200, sleepHours: 7, stress: 3 },
    { date: "2026-10-13", steps: 3000, sleepHours: 6.5, stress: 6 },
    { date: "2026-10-14", steps: 4957 },
    { date: "2026-10-06", steps: 6000, stress: 7 },
    { date: "2026-10-07", steps: 0 }
  ],
  logEntries: [
    { date: "2026-10-14", mealType: "petit-dejeuner", calories: 300, protein: 20 },
    { date: "2026-10-14", mealType: "dejeuner", calories: 650, protein: 40 },
    { date: "2026-10-13", mealType: "diner", calories: 2100, protein: 120 },
    { date: "2026-10-12", mealType: "diner", calories: 1500, protein: 90 }
  ],
  sessions: [
    { date: "2026-10-12", durationMin: 45, rpe: 7, routineId: "r1" },
    { date: "2026-10-13", durationMin: 30, rpe: 8 },
    { date: "2026-10-06", durationMin: 50, rpe: 6 }
  ],
  bodyLogs: [
    { date: "2026-09-01", weightKg: 86 },
    { date: "2026-10-01", weightKg: 84.5 },
    { date: "2026-10-12", weightKg: 84 }
  ],
  measurements: [
    { date: "2026-09-10", taille: 95, brasD: 34 },
    { date: "2026-10-10", taille: 93, brasD: 34.5 }
  ]
};
const profil = { goal: "perte", targetSteps: 8000, sessionsPerWeek: 3 };
const objectifs = { calories: 2000, protein: 130 };
const voir = (id, periode, decalage = 0, extra = {}) =>
  explorer({ id, periode, decalage, donnees, profil, objectifs, aujourdhui: AUJ, ...extra });
// Les nombres a la francaise sont separes par une espace fine insecable.
const textes = (v) => v.phrases.map((p) => p.texte).join(" | ").replace(/[\u202f\u00a0]/g, " ");

describe("Periodes", () => {
  test("semaine du lundi au dimanche, mois et annee calendaires", () => {
    assert.deepEqual(
      [bornesPeriode("S", 0, AUJ).debut, bornesPeriode("S", 0, AUJ).fin],
      ["2026-10-12", "2026-10-18"]
    );
    assert.deepEqual([bornesPeriode("M", 0, AUJ).debut, bornesPeriode("M", 0, AUJ).fin], ["2026-10-01", "2026-10-31"]);
    assert.equal(bornesPeriode("M", 0, AUJ).libelle, "octobre 2026");
    assert.deepEqual([bornesPeriode("A", 0, AUJ).debut, bornesPeriode("A", 0, AUJ).fin], ["2026-01-01", "2026-12-31"]);
    assert.equal(bornesPeriode("J", -1, AUJ).debut, "2026-10-13");
  });

  test("on recule d'une periode, jamais dans le futur", () => {
    assert.equal(bornesPeriode("S", -1, AUJ).debut, "2026-10-05");
    assert.equal(bornesPeriode("M", -10, AUJ).debut, "2025-12-01", "changement d'annee");
    assert.equal(bornesPeriode("M", -10, AUJ).fin, "2025-12-31");
    assert.equal(bornesPeriode("A", -1, AUJ).libelle, "2025");
    assert.equal(bornesPeriode("S", 3, AUJ).debut, "2026-10-12", "un decalage positif est ramene a la periode en cours");
    assert.equal(bornesPeriode("M", -9, "2026-03-31").debut, "2025-06-01", "fin de mois sans debordement");
  });

  test("tous les indicateurs sont rattaches a un groupe et ont une unite", () => {
    assert.ok(INDICATEURS.length >= 25);
    for (const i of INDICATEURS) assert.ok(i.groupe && i.label && i.unite, i.id);
    assert.deepEqual(GROUPES.map((g) => g.groupe), ["Activité", "Nutrition", "Sommeil et forme", "Corps", "Mensurations"]);
    assert.equal(indicateur("inconnu").id, "pas", "un identifiant inconnu retombe sur les pas");
  });
});

describe("Indicateurs quotidiens", () => {
  test("semaine : 7 barres, jours sans saisie et jours futurs vides", () => {
    const v = voir("pas", "S");
    assert.equal(v.barres.length, 7);
    assert.deepEqual(v.barres.map((b) => b.valeur), [8200, 3000, 4957, null, null, null, null]);
    assert.equal(v.resume.valeur, 5386, "moyenne des 3 jours notes");
    assert.equal(v.resume.nbJours, 3);
    assert.equal(v.cible, 8000);
  });

  test("un 0 saisi n'est pas un jour note pour les pas", () => {
    const v = voir("pas", "S", -1);
    assert.equal(v.resume.valeur, 6000);
    assert.equal(v.resume.nbJours, 1);
  });

  test("mois : une barre par jour ; annee : 12 moyennes mensuelles", () => {
    assert.equal(voir("pas", "M").barres.length, 31);
    const a = voir("pas", "A");
    assert.equal(a.barres.length, 12);
    assert.equal(a.barres[9].valeur, Math.round((8200 + 3000 + 4957 + 6000) / 4));
    assert.equal(a.barres[10].valeur, null, "novembre est dans le futur");
  });

  test("seances et minutes : un total, sans ligne d'objectif journaliere", () => {
    const s = voir("seances", "S");
    assert.equal(s.resume.valeur, 2);
    assert.equal(s.resume.libelle, "Total");
    assert.equal(s.cible, null);
    assert.match(textes(s), /2 séances cette semaine, \+1 par rapport à la semaine dernière/);
    assert.match(textes(s), /Objectif : 3 séances par semaine, encore 1 à faire/);
    assert.equal(voir("duree", "S").resume.valeur, 75);
  });

  test("jour : la nutrition se detaille repas par repas", () => {
    const j = voir("calories", "J");
    assert.equal(j.resume.valeur, 950);
    assert.equal(j.resume.libelle, "Total du jour");
    assert.deepEqual(j.barres.map((b) => [b.label, b.valeur]), [
      ["Petit-déj.", 300],
      ["Déjeuner", 650],
      ["Collation", null],
      ["Dîner", null]
    ]);
    assert.match(textes(j), /48 % de ton objectif \(2 000 kcal\)/);
  });

  test("jour : comparaison a la moyenne des 7 jours precedents", () => {
    const j = voir("pas", "J");
    assert.equal(j.resume.valeur, 4957);
    assert.match(textes(j), /−643 pas par rapport à ta moyenne des 7 jours précédents \(5 600 pas\)/);
    assert.equal(j.phrases[1].ton, "a-surveiller");
  });

  test("calories : jours dans la cible a 10 % pres", () => {
    const v = voir("calories", "S");
    // 950, 2 100 et 1 500 kcal : seul 2 100 est a 10 % de 2 000.
    assert.match(textes(v), /1 jour sur 3 notés dans ta cible de 2 000 kcal \(à 10 % près\)\./);
  });

  test("le stress doit baisser : une hausse est a surveiller", () => {
    const v = voir("stress", "S");
    assert.match(textes(v), /4,5\/10 par jour en moyenne cette semaine, −2,5\/10 par rapport à la semaine dernière/);
    assert.equal(v.phrases[0].ton, "bon");
    assert.equal(tonEcart(2, -1), "a-surveiller");
    assert.equal(tonEcart(0, 1), "neutre");
  });

  test("francais : « au mois dernier », periode passee « cette semaine-là »", () => {
    const m = explorer({ id: "pas", periode: "M", decalage: 0, donnees: { dailyForm: [{ date: "2026-09-10", steps: 5000 }, { date: "2026-10-10", steps: 6000 }] }, profil, objectifs, aujourdhui: AUJ });
    assert.match(textes(m), /par rapport au mois dernier/);
    assert.doesNotMatch(textes(m), /à le /);
    const passe = voir("pas", "S", -1);
    assert.match(textes(passe), /cette semaine-là/);
    assert.equal(passe.peutAvancer, true);
    assert.equal(voir("pas", "S").peutAvancer, false);
  });

  test("periode vide : une phrase, pas de moyenne inventee", () => {
    const v = voir("eau", "S");
    assert.equal(v.resume.valeur, null);
    assert.deepEqual(textes(v), "Rien de noté cette semaine.");
  });

  test("moins de 4 jours notes dans la semaine : prudence signalee", () => {
    assert.match(textes(voir("pas", "S")), /Seulement 3 jours notés/);
  });
});

describe("Mesures", () => {
  test("poids : derniere mesure et ecart depuis la mesure d'avant la periode", () => {
    const v = voir("poids", "M");
    assert.equal(v.resume.valeur, 84);
    assert.equal(v.resume.libelle, "Dernière mesure");
    assert.deepEqual(v.points.map((p) => p.date), ["2026-10-01", "2026-10-12"]);
    assert.equal(v.ecart, -2);
    assert.match(textes(v), /^−2 kg depuis le 1 sept\.$/);
    assert.equal(v.phrases[0].ton, "bon", "en perte, le poids qui baisse est une bonne nouvelle");
  });

  test("le sens suit l'objectif : en prise, le tour de bras qui monte est bon", () => {
    const perte = voir("brasD", "A");
    const prise = explorer({ id: "brasD", periode: "A", decalage: 0, donnees, profil: { goal: "prise" }, objectifs, aujourdhui: AUJ });
    assert.equal(perte.ecart, 0.5);
    assert.equal(perte.phrases[0].ton, "neutre");
    assert.equal(prise.phrases[0].ton, "bon");
  });

  test("pas de nouvelle mesure dans la periode : on le dit, sans perdre la derniere", () => {
    const v = voir("taille", "S");
    assert.equal(v.resume.valeur, 93);
    assert.equal(v.points.length, 0);
    assert.match(textes(v), /Pas de nouvelle mesure cette semaine/);
  });

  test("aucune mesure du tout", () => {
    assert.match(textes(voir("molletG", "A")), /Aucune mesure de mollet gauche pour l'instant/);
  });
});
