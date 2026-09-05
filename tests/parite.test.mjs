/**
 * Parite entre l'ancienne et la nouvelle implementation.
 *
 * Pendant la migration, deux versions du meme calcul coexistent : celle de
 * index.html, en production, et celle de app/src/lib, en construction. Toute
 * divergence signifierait qu'un client verrait ses objectifs changer le jour
 * de la bascule, sans explication.
 *
 * Ces tests confrontent les deux implementations sur des centaines de cas
 * generes, y compris des profils absurdes ou incomplets. Ils doivent rester
 * verts jusqu'a la bascule (phase 8) ; ils deviendront alors inutiles et
 * pourront etre supprimes avec l'ancien code.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import * as neuf from "../app/src/lib/nutrition.js";
import * as dates from "../app/src/lib/dates.js";

const ancien = chargerApp();

/** Ramene un objet du bac a sable dans le realm du test. */
const plat = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));

/** Generateur deterministe : un echec est toujours reproductible. */
function generateur(graine) {
  let etat = graine;
  return () => {
    etat = (etat * 1103515245 + 12345) % 2147483648;
    return etat / 2147483648;
  };
}

const SEXES = ["homme", "femme"];
const OBJECTIFS = ["perte", "prise", "maintien", "performance", "inconnu"];
const ACTIVITES = ["sedentaire", "leger", "modere", "actif", "tresactif", "inexistant"];
const METIERS = ["sedentaire", "actif", "tres-actif", undefined];

function profilAleatoire(hasard) {
  const choisir = (liste) => liste[Math.floor(hasard() * liste.length)];
  return {
    sex: choisir(SEXES),
    heightCm: Math.round(140 + hasard() * 70),
    age: Math.round(16 + hasard() * 60),
    startWeightKg: Math.round(45 + hasard() * 80),
    activityLevel: choisir(ACTIVITES),
    jobType: choisir(METIERS),
    goal: choisir(OBJECTIFS),
    calibratedMaintenanceKcal: hasard() < 0.25 ? Math.round(1500 + hasard() * 1800) : undefined
  };
}

/**
 * computeTargets : DIVERGENCE VOLONTAIRE, decidee apres la bascule.
 *
 * Ce groupe ne verifie plus une egalite, mais l'inverse : que les seules
 * differences avec l'ancienne version sont celles qui ont ete decidees, et
 * qu'aucune autre ne s'est glissee au passage.
 *
 * Deux changements, et deux seulement :
 *
 * 1. UN PLANCHER DE LIPIDES a 20 % des calories. En dessous, la production
 *    hormonale est affectee. L'ancienne regle (0,6 g/kg en deficit) faisait
 *    descendre une cliente de 50 kg a 18 % de ses calories.
 * 2. LES PROTEINES ET LIPIDES SE CALCULENT SUR UN POIDS DE REFERENCE
 *    plafonne pres du poids cible, au lieu du poids actuel. Les besoins
 *    suivent la masse maigre : 2 g/kg d'un client de 110 kg dont l'objectif
 *    est 80 kg donnait 220 g de proteines par jour, que personne ne mange.
 *
 * LES CALORIES NE CHANGENT PAS. C'est le point le plus important de ce
 * fichier : le total energetique de chaque client reste identique au
 * gramme pres. Seule sa repartition bouge.
 */
describe("computeTargets : divergences volontaires et rien d'autre", () => {
  const PART_LIPIDES_MIN = 0.2;

  /**
   * TROISIEME DIVERGENCE VOLONTAIRE, ajoutee apres un incident en
   * production : les calibrages caloriques invraisemblables sont desormais
   * ecartes ou ramenes dans une plage plausible.
   *
   * Le calibrage moyenne les calories des jours LOGUES. Un journal
   * incomplet le tire vers le bas, l'objectif descend, le client mange
   * moins, et le calibrage suivant descend encore. Une pratiquante de force
   * a six seances par semaine s'est ainsi vue attribuer 1320 kcal par jour.
   *
   * Les calories ne peuvent donc plus etre identiques a l'ancienne version
   * SUR LES PROFILS CALIBRES. Elles doivent l'etre partout ailleurs, et la
   * correction doit toujours RAPPROCHER de la formule — jamais l'inverse.
   *
   * Ma premiere version de ce test affirmait « l'objectif ne baisse
   * jamais ». C'etait faux : un calibrage trop HAUT est ramene vers le bas,
   * et c'est aussi legitime. Ce qui compte n'est pas le sens du
   * mouvement, c'est qu'il aille vers la valeur plausible.
   */
  test("les calories restent identiques hors calibrage invraisemblable", () => {
    const hasard = generateur(20260905);
    let corriges = 0;
    for (let i = 0; i < 400; i++) {
      const profil = profilAleatoire(hasard);
      const poids = hasard() < 0.3 ? null : Math.round(45 + hasard() * 80);
      const contexte = JSON.stringify({ ...profil, poids });

      const avant = plat(ancien.computeTargets(profil, poids)).calories;
      const apres = neuf.computeTargets(profil, poids).calories;

      if (avant === apres) continue;

      corriges++;
      assert.ok(
        profil.calibratedMaintenanceKcal,
        "calories modifiees sur un profil NON calibre : " + contexte
      );

      // La reference : ce que donnerait la formule seule, sans calibrage.
      const { calibratedMaintenanceKcal, ...sansCalibrage } = profil;
      const formule = neuf.computeTargets(sansCalibrage, poids).calories;

      assert.ok(
        Math.abs(apres - formule) <= Math.abs(avant - formule),
        "la correction eloigne de la formule au lieu de s'en rapprocher : " + contexte
      );
    }
    assert.ok(corriges > 0, "aucun calibrage corrige : le test ne verifie rien");
  });

  test("sans poids cible, seul le plancher de lipides peut differer", () => {
    const hasard = generateur(20260905);
    let planchers = 0;
    for (let i = 0; i < 400; i++) {
      const profil = profilAleatoire(hasard);
      const poids = hasard() < 0.3 ? null : Math.round(45 + hasard() * 80);
      const contexte = JSON.stringify({ ...profil, poids });

      const a = plat(ancien.computeTargets(profil, poids));
      const n = neuf.computeTargets(profil, poids);

      // Sans poids cible, la reference reste le poids actuel : les
      // proteines ne peuvent pas bouger.
      assert.equal(n.protein, a.protein, "proteines modifiees sans poids cible : " + contexte);

      // Un calibrage corrige change les calories, donc les lipides via le
      // plancher : ce cas est couvert par le test precedent.
      if (n.calories !== a.calories) continue;

      if (n.fat !== a.fat) {
        planchers++;
        assert.ok(n.fat > a.fat, "les lipides ont BAISSE : " + contexte);
        assert.ok(
          a.fat * 9 < a.calories * PART_LIPIDES_MIN,
          "lipides modifies alors que l'ancienne valeur respectait deja le plancher : " + contexte
        );
      }
    }
    assert.ok(planchers > 0, "aucun plancher declenche : le test ne verifie rien");
  });

  test("le poids cible ne fait jamais monter les proteines", () => {
    // Le plafond ne peut que reduire la reference, jamais l'augmenter : un
    // client sous son objectif garde exactement ses anciens chiffres.
    const hasard = generateur(20260906);
    for (let i = 0; i < 300; i++) {
      const profil = profilAleatoire(hasard);
      const poids = Math.round(45 + hasard() * 80);
      const cible = Math.round(45 + hasard() * 80);

      const sansCible = neuf.computeTargets(profil, poids);
      const avecCible = neuf.computeTargets({ ...profil, targetWeightKg: cible }, poids);

      assert.ok(
        avecCible.protein <= sansCible.protein,
        `proteines en hausse : ${poids} kg, cible ${cible} kg`
      );
      if (poids <= cible) {
        assert.equal(avecCible.protein, sansCible.protein, "client sous son objectif : rien ne doit bouger");
      }
    }
  });

  test("aucun client ne passe sous le plancher de lipides", () => {
    // La propriete que le changement promet, verifiee exhaustivement.
    let verifies = 0;
    for (const sex of ["homme", "femme"]) {
      for (const goal of ["perte", "prise", "maintien", "performance"]) {
        for (let poids = 35; poids <= 200; poids += 5) {
          for (const cible of [null, 50, 70, 90, 120]) {
            const profil = {
              sex,
              age: 35,
              heightCm: 172,
              startWeightKg: poids,
              targetWeightKg: cible,
              activityLevel: "modere",
              goal,
              jobType: "sedentaire"
            };
            const t = neuf.computeTargets(profil, poids);
            verifies++;
            assert.ok(
              t.fat * 9 >= t.calories * PART_LIPIDES_MIN,
              `sous le plancher : ${sex} ${goal} ${poids} kg cible ${cible} — ` +
                `${t.fat} g de lipides pour ${t.calories} kcal`
            );
            assert.ok(t.carbs >= 0 && t.protein >= 0, "macro negative");
          }
        }
      }
    }
    assert.ok(verifies > 1000, "trop peu de profils : " + verifies);
  });

  test("sur les profils incomplets, ou l'ancien renvoie null", () => {
    const incomplets = [
      { sex: "homme", heightCm: null, age: 30, startWeightKg: 80, goal: "maintien" },
      { sex: "femme", heightCm: 170, age: null, startWeightKg: 60, goal: "perte" },
      { sex: "homme", heightCm: 180, age: 30, startWeightKg: 0, goal: "prise" },
      { sex: "homme", heightCm: 180, age: 30, startWeightKg: 80, goal: undefined }
    ];
    for (const profil of incomplets) {
      assert.deepEqual(
        neuf.computeTargets(profil, null),
        plat(ancien.computeTargets(profil, null)),
        "divergence sur " + JSON.stringify(profil)
      );
    }
  });
});

describe("computeBMR : parite", () => {
  test("sur 300 morphologies generees", () => {
    const hasard = generateur(1234);
    for (let i = 0; i < 300; i++) {
      const entree = {
        sex: SEXES[Math.floor(hasard() * 2)],
        weightKg: Math.round(40 + hasard() * 90),
        heightCm: Math.round(140 + hasard() * 70),
        age: Math.round(16 + hasard() * 70)
      };
      assert.equal(
        neuf.computeBMR(entree),
        ancien.computeBMR(entree),
        "divergence sur " + JSON.stringify(entree)
      );
    }
  });

  test("sur les entrees vides", () => {
    for (const entree of [
      { sex: "homme", weightKg: 0, heightCm: 180, age: 30 },
      { sex: "homme", weightKg: 80, heightCm: null, age: 30 },
      { sex: "femme", weightKg: 80, heightCm: 180, age: undefined }
    ]) {
      assert.equal(neuf.computeBMR(entree), ancien.computeBMR(entree));
    }
  });
});

describe("computeCalibration : parite", () => {
  const jour = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  /**
   * L'estimation elle-meme est inchangee. Ce qui est AJOUTE, c'est la
   * couverture du journal : sur combien des jours de la fenetre le client
   * a reellement note quelque chose.
   *
   * Sans cette information, il etait impossible de distinguer « cette
   * personne mange peu » de « cette personne note peu ». Les deux donnent
   * la meme moyenne, et seule la seconde est une erreur de mesure.
   */
  test("l'estimation reste identique a l'ancienne version", () => {
    const hasard = generateur(777);
    for (let i = 0; i < 100; i++) {
      const nbJours = Math.floor(hasard() * 20);
      const journal = Array.from({ length: nbJours }, (_, j) => ({
        date: jour(j),
        calories: Math.round(1200 + hasard() * 2000)
      }));
      const pesees = Array.from({ length: Math.floor(hasard() * 5) }, (_, j) => ({
        date: jour(j * 4),
        weightKg: Math.round((60 + hasard() * 40) * 10) / 10
      }));

      const a = plat(ancien.computeCalibration(pesees, journal, 28));
      const n = neuf.computeCalibration(pesees, journal, 28);
      const contexte = "historique de " + nbJours + " jours et " + pesees.length + " pesees";

      if (a === null) {
        assert.equal(n, null, "estimation produite la ou l'ancienne se taisait : " + contexte);
        continue;
      }

      // Champ par champ : les anciens doivent etre intacts.
      for (const champ of ["estimate", "days", "loggedDaysCount"]) {
        assert.equal(n[champ], a[champ], `${champ} a change — ${contexte}`);
      }
      assert.equal(n.couverture, Math.round((n.loggedDaysCount / 28) * 100) / 100, contexte);
      assert.equal(n.fiable, n.couverture >= 0.8, contexte);
    }
  });

  test("un journal a trous se declare non fiable", () => {
    // 10 jours notes sur 28 : la moyenne decrit ce qui a ete note, pas ce
    // qui a ete mange. C'est le mecanisme qui a fait tomber une cliente a
    // 1320 kcal par jour.
    const journal = Array.from({ length: 10 }, (_, j) => ({ date: jour(j), calories: 1500 }));
    const pesees = [
      { date: jour(27), weightKg: 71 },
      { date: jour(0), weightKg: 71 }
    ];
    const r = neuf.computeCalibration(pesees, journal, 28);
    assert.equal(r.fiable, false);
    assert.ok(r.couverture < 0.5, "couverture : " + r.couverture);
  });

  test("un journal complet se declare fiable", () => {
    const journal = Array.from({ length: 26 }, (_, j) => ({ date: jour(j), calories: 2200 }));
    const pesees = [
      { date: jour(27), weightKg: 71 },
      { date: jour(0), weightKg: 71 }
    ];
    assert.equal(neuf.computeCalibration(pesees, journal, 28).fiable, true);
  });
});

describe("computeRemainingToday : parite", () => {
  test("sur 200 journaux generes, y compris en depassement", () => {
    const hasard = generateur(4242);
    const aujourdHui = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < 200; i++) {
      const entrees = Array.from({ length: Math.floor(hasard() * 8) }, () => ({
        date: hasard() < 0.8 ? aujourdHui : jourPrecedent(),
        calories: Math.round(hasard() * 1200),
        protein: Math.round(hasard() * 80),
        carbs: Math.round(hasard() * 150),
        fat: Math.round(hasard() * 60)
      }));
      const cibles = {
        calories: Math.round(1500 + hasard() * 1500),
        protein: Math.round(100 + hasard() * 100),
        carbs: Math.round(150 + hasard() * 250),
        fat: Math.round(40 + hasard() * 60)
      };

      assert.deepEqual(
        neuf.computeRemainingToday(entrees, cibles),
        plat(ancien.computeRemainingToday(entrees, cibles)),
        "divergence sur " + entrees.length + " entrees"
      );
    }

    function jourPrecedent() {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    }
  });

  test("sans objectifs, les deux renvoient null", () => {
    assert.equal(neuf.computeRemainingToday([], null), ancien.computeRemainingToday([], null));
  });
});

describe("utilitaires de dates : parite", () => {
  test("addDays, y compris a cheval sur les mois et les annees", () => {
    const cas = [
      ["2026-01-31", 1],
      ["2026-12-31", 1],
      ["2026-03-01", -1],
      ["2026-02-28", 1],
      ["2028-02-28", 1], // annee bissextile
      ["2026-09-05", 0],
      ["2026-09-05", -400],
      ["2026-09-05", 400]
    ];
    for (const [date, n] of cas) {
      assert.equal(dates.addDays(date, n), ancien.addDays(date, n), `addDays(${date}, ${n})`);
    }
  });

  test("num et round", () => {
    for (const v of ["12.5", "abc", "", null, undefined, 0, -3.7, "8,5"]) {
      assert.equal(dates.num(v), ancien.num(v), "num(" + JSON.stringify(v) + ")");
    }
    for (const [n, d] of [
      [1.2345, 2],
      [null, 0],
      [-1.5, 0],
      [1000.5, 1]
    ]) {
      assert.equal(dates.round(n, d), ancien.round(n, d), `round(${n}, ${d})`);
    }
  });

  test("avg", () => {
    for (const arr of [[], [1], [1, 2, 3], [-5, 5]]) {
      assert.equal(dates.avg(arr), ancien.avg(arr), "avg(" + JSON.stringify(arr) + ")");
    }
  });
});

describe("les constantes n'ont pas derive", () => {
  test("niveaux d'activite identiques", () => {
    assert.deepEqual(neuf.ACTIVITY_LEVELS.map((a) => [a.id, a.mult]), plat(ancien.ACTIVITY_LEVELS).map((a) => [a.id, a.mult]));
  });

  test("ajustements caloriques par objectif identiques", () => {
    assert.deepEqual(neuf.GOAL_CAL_ADJUST, plat(ancien.GOAL_CAL_ADJUST));
  });
});
