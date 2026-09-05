/**
 * Calculs nutritionnels : objectifs caloriques, macros, calibrage.
 *
 * Ce sont les chiffres que le client voit tous les jours et sur lesquels il
 * regle son alimentation. Une erreur ici est invisible mais lourde de
 * consequences, d'ou des valeurs attendues calculees a la main plutot que
 * recopiees de la sortie du code.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import * as nutrition from "../app/src/lib/nutrition.js";

const app = chargerApp();

const PROFIL = {
  sex: "homme",
  heightCm: 180,
  age: 30,
  startWeightKg: 80,
  activityLevel: "modere",
  jobType: "sedentaire",
  goal: "maintien"
};

describe("computeBMR — metabolisme de base (Mifflin-St Jeor)", () => {
  test("homme : 10*P + 6.25*T - 5*A + 5", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    assert.equal(app.computeBMR({ sex: "homme", weightKg: 80, heightCm: 180, age: 30 }), 1780);
  });

  test("femme : meme base moins 161", () => {
    // 800 + 1125 - 150 - 161 = 1614
    assert.equal(app.computeBMR({ sex: "femme", weightKg: 80, heightCm: 180, age: 30 }), 1614);
  });

  test("l'ecart homme/femme est de 166 kcal a morphologie egale", () => {
    const h = app.computeBMR({ sex: "homme", weightKg: 70, heightCm: 175, age: 40 });
    const f = app.computeBMR({ sex: "femme", weightKg: 70, heightCm: 175, age: 40 });
    assert.equal(h - f, 166);
  });

  test("donnees incompletes : renvoie null plutot qu'un chiffre faux", () => {
    assert.equal(app.computeBMR({ sex: "homme", weightKg: 0, heightCm: 180, age: 30 }), null);
    assert.equal(app.computeBMR({ sex: "homme", weightKg: 80, heightCm: null, age: 30 }), null);
    assert.equal(app.computeBMR({ sex: "homme", weightKg: 80, heightCm: 180, age: undefined }), null);
  });
});

describe("computeTargets — objectifs journaliers", () => {
  test("maintien : TDEE arrondi a la dizaine", () => {
    // BMR 1780 x 1.55 (modere) = 2759 -> arrondi 2760
    const t = app.computeTargets(PROFIL, 80);
    assert.equal(t.calories, 2760);
  });

  test("perte : -20 % sur le TDEE", () => {
    // 2759 x 0.8 = 2207.2 -> 2210
    assert.equal(app.computeTargets({ ...PROFIL, goal: "perte" }, 80).calories, 2210);
  });

  test("prise : +10 %", () => {
    // 2759 x 1.1 = 3034.9 -> 3030
    assert.equal(app.computeTargets({ ...PROFIL, goal: "prise" }, 80).calories, 3030);
  });

  test("performance : +5 %", () => {
    // 2759 x 1.05 = 2896.95 -> 2900
    assert.equal(app.computeTargets({ ...PROFIL, goal: "performance" }, 80).calories, 2900);
  });

  test("proteines : 2 g par kg, quel que soit l'objectif", () => {
    for (const goal of ["maintien", "perte", "prise", "performance"]) {
      assert.equal(app.computeTargets({ ...PROFIL, goal }, 80).protein, 160, "objectif " + goal);
    }
  });

  test("lipides : 1 g/kg, abaisses a 0,6 g/kg en perte", () => {
    assert.equal(app.computeTargets(PROFIL, 80).fat, 80);
    assert.equal(app.computeTargets({ ...PROFIL, goal: "perte" }, 80).fat, 48);
  });

  test("les glucides absorbent le reste des calories", () => {
    const t = app.computeTargets(PROFIL, 80);
    // 2760 - 160*4 - 80*9 = 1400 kcal -> 350 g
    assert.equal(t.carbs, 350);
    const total = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    assert.ok(Math.abs(total - t.calories) <= 4, "somme des macros coherente avec les calories");
  });

  test("le calibrage remplace le TDEE calcule", () => {
    const t = app.computeTargets({ ...PROFIL, calibratedMaintenanceKcal: 2500 }, 80);
    assert.equal(t.calories, 2500);
  });

  test("le poids du jour prime sur le poids de depart", () => {
    const aDepart = app.computeTargets(PROFIL, null);
    const aJour = app.computeTargets(PROFIL, 90);
    assert.notEqual(aDepart.calories, aJour.calories);
    assert.equal(aJour.protein, 180, "proteines recalculees sur 90 kg");
  });

  test("metier physique : majore la depense", () => {
    const bureau = app.computeTargets({ ...PROFIL, jobType: "sedentaire" }, 80);
    const debout = app.computeTargets({ ...PROFIL, jobType: "actif" }, 80);
    const macon = app.computeTargets({ ...PROFIL, jobType: "tres-actif" }, 80);
    assert.ok(debout.calories > bureau.calories, "actif > sedentaire");
    assert.ok(macon.calories > debout.calories, "tres-actif > actif");
  });

  test("le facteur d'activite est plafonne a 2,1", () => {
    // 1.9 (extremement actif) x 1.12 (metier tres actif) = 2.128, doit etre bride
    const t = app.computeTargets(
      { ...PROFIL, activityLevel: "tresactif", jobType: "tres-actif" },
      80
    );
    const plafond = Math.round((1780 * 2.1) / 10) * 10;
    assert.equal(t.calories, plafond);
  });

  test("profil sans taille : pas de chiffre invente", () => {
    const t = app.computeTargets({ ...PROFIL, heightCm: null }, 80);
    assert.equal(t.calories, null);
    assert.equal(t.carbs, null);
  });
});

describe("computeCalibration — maintenance reelle observee", () => {
  const jour = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const journalStable = () =>
    Array.from({ length: 14 }, (_, i) => ({ date: jour(i), calories: 2500 }));

  test("poids stable : la maintenance est la moyenne consommee", () => {
    const bodyLogs = [
      { date: jour(13), weightKg: 80 },
      { date: jour(0), weightKg: 80 }
    ];
    const r = app.computeCalibration(bodyLogs, journalStable(), 28);
    assert.equal(r.estimate, 2500);
  });

  test("perte de poids : la maintenance reelle est superieure au consomme", () => {
    const bodyLogs = [
      { date: jour(13), weightKg: 81 },
      { date: jour(0), weightKg: 80 }
    ];
    const r = app.computeCalibration(bodyLogs, journalStable(), 28);
    assert.ok(r.estimate > 2500, "estimation " + r.estimate + " doit depasser 2500");
    // 1 kg perdu sur 13 jours = 7700/13 = 592 kcal/j de deficit
    assert.equal(r.estimate, Math.round((2500 + 7700 / 13) / 10) * 10);
  });

  test("prise de poids : la maintenance reelle est inferieure", () => {
    const bodyLogs = [
      { date: jour(13), weightKg: 79 },
      { date: jour(0), weightKg: 80 }
    ];
    const r = app.computeCalibration(bodyLogs, journalStable(), 28);
    assert.ok(r.estimate < 2500);
  });

  test("moins de 2 pesees : pas d'estimation", () => {
    const r = app.computeCalibration([{ date: jour(0), weightKg: 80 }], journalStable(), 28);
    assert.equal(r, null);
  });

  test("moins de 7 jours logues : pas d'estimation", () => {
    const bodyLogs = [
      { date: jour(13), weightKg: 81 },
      { date: jour(0), weightKg: 80 }
    ];
    const journalCourt = Array.from({ length: 6 }, (_, i) => ({ date: jour(i), calories: 2500 }));
    assert.equal(app.computeCalibration(bodyLogs, journalCourt, 28), null);
  });

  test("les donnees hors fenetre sont ignorees", () => {
    const bodyLogs = [
      { date: jour(60), weightKg: 95 },
      { date: jour(13), weightKg: 80 },
      { date: jour(0), weightKg: 80 }
    ];
    const r = app.computeCalibration(bodyLogs, journalStable(), 28);
    // La pesee a 60 jours doit etre exclue : sinon l'estimation exploserait.
    assert.equal(r.estimate, 2500);
  });
});

describe("computeRemainingToday — ce qu'il reste a manger", () => {
  const cibles = { calories: 2500, protein: 160, carbs: 300, fat: 70 };

  test("journal vide : tout reste a consommer", () => {
    const r = app.computeRemainingToday([], cibles);
    assert.equal(r.kcal, 2500);
    assert.equal(r.p, 160);
  });

  test("deduit uniquement les entrees du jour", () => {
    const hier = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const r = app.computeRemainingToday(
      [
        { date: aujourdHui, calories: 500, protein: 30, carbs: 50, fat: 10 },
        { date: hier, calories: 9999, protein: 999, carbs: 999, fat: 999 }
      ],
      cibles
    );
    assert.equal(r.kcal, 2000, "l'entree d'hier ne doit pas compter");
    assert.equal(r.p, 130);
  });

  test("depassement : les macros sont bornees a zero, les calories restent signees", () => {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const r = app.computeRemainingToday(
      [{ date: aujourdHui, calories: 4000, protein: 300, carbs: 400, fat: 200 }],
      cibles
    );
    // Choix assume du code : kcal est un solde signe, pas un reste a afficher.
    // Il sert de signal : l'interface ne propose de suggestions qu'au-dessus
    // de 150 kcal restantes, donc ce nombre negatif n'est jamais montre.
    assert.equal(r.kcal, -1500);
    // Les macros, elles, alimentent l'algorithme de suggestion et sont bornees.
    assert.equal(r.p, 0);
    assert.equal(r.c, 0);
    assert.equal(r.f, 0);
  });

  test("le total consomme du jour est conserve a part", () => {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const r = app.computeRemainingToday(
      [
        { date: aujourdHui, calories: 600, protein: 40, carbs: 60, fat: 20 },
        { date: aujourdHui, calories: 400, protein: 20, carbs: 40, fat: 10 }
      ],
      cibles
    );
    // Le spread ramene l'objet dans le realm du test : sans lui, la comparaison
    // stricte echoue sur le prototype, alors que les valeurs sont identiques.
    assert.deepEqual({ ...r.consumed }, { kcal: 1000, p: 60, c: 100, f: 30 });
  });

  test("sans objectifs definis : renvoie null", () => {
    assert.equal(app.computeRemainingToday([], null), null);
    assert.equal(app.computeRemainingToday([], { calories: null }), null);
  });
});

/**
 * Poids de reference des proteines et des lipides.
 *
 * Ces tests pinglent des VALEURS, pas seulement des inegalites. Une premiere
 * version ne verifiait que « les proteines ne montent jamais » : quatre
 * mutations differentes du plafond passaient au travers, dont une qui le
 * desactivait completement. Une inegalite ne suffit pas a decrire une regle.
 */
describe("poids de reference — proteines et lipides suivent la masse maigre", () => {
  const CLIENT = {
    sex: "homme",
    age: 40,
    heightCm: 175,
    startWeightKg: 110,
    targetWeightKg: 80,
    activityLevel: "leger",
    goal: "perte",
    jobType: "sedentaire"
  };

  test("la reference est plafonnee a 10 % au-dessus du poids cible", () => {
    // 80 kg de cible -> reference 88 kg, et non 110.
    assert.equal(nutrition.poidsDeReference(CLIENT, 110), 88);
    assert.equal(nutrition.poidsDeReference({ ...CLIENT, targetWeightKg: 60 }, 110), 66);
  });

  test("un client sous ou a son objectif garde son poids reel", () => {
    assert.equal(nutrition.poidsDeReference(CLIENT, 75), 75);
    assert.equal(nutrition.poidsDeReference(CLIENT, 80), 80);
  });

  test("sans poids cible, la reference est le poids reel", () => {
    assert.equal(nutrition.poidsDeReference({ ...CLIENT, targetWeightKg: null }, 110), 110);
    assert.equal(nutrition.poidsDeReference({ ...CLIENT, targetWeightKg: 0 }, 110), 110);
    assert.equal(nutrition.poidsDeReference({ ...CLIENT, targetWeightKg: undefined }, 110), 110);
  });

  test("les proteines sont calculees sur la reference, pas sur le poids actuel", () => {
    // 2 g/kg de 88 kg = 176 g. Sur le poids actuel, ce serait 220 g — soit
    // 2,8 g/kg du poids cible, une quantite que personne ne mange.
    assert.equal(nutrition.computeTargets(CLIENT, 110).protein, 176);
    assert.equal(nutrition.computeTargets({ ...CLIENT, targetWeightKg: null }, 110).protein, 220);
  });

  test("les lipides suivent la meme reference", () => {
    // 0,6 g/kg de 88 kg = 52,8 -> 53 g, si le plancher ne prime pas.
    const t = nutrition.computeTargets(CLIENT, 110);
    const plancher = Math.ceil((t.calories * 0.2) / 9);
    assert.equal(t.fat, Math.max(53, plancher));
  });

  test("les calories, elles, restent calculees sur le poids reel", () => {
    // C'est le corps d'aujourd'hui qui depense, pas celui qu'on vise.
    const avec = nutrition.computeTargets(CLIENT, 110).calories;
    const sans = nutrition.computeTargets({ ...CLIENT, targetWeightKg: null }, 110).calories;
    assert.equal(avec, sans);
  });

  test("les glucides recuperent ce que les proteines liberent", () => {
    const avec = nutrition.computeTargets(CLIENT, 110);
    const sans = nutrition.computeTargets({ ...CLIENT, targetWeightKg: null }, 110);
    assert.equal(avec.calories, sans.calories);
    assert.ok(avec.carbs > sans.carbs, "les calories liberees doivent aller quelque part");
  });
});

describe("plancher de lipides", () => {
  const CLIENTE = {
    sex: "femme",
    age: 35,
    heightCm: 165,
    startWeightKg: 50,
    activityLevel: "modere",
    goal: "perte",
    jobType: "sedentaire"
  };

  test("une cliente legere en deficit atteint bien 20 % des calories", () => {
    const t = nutrition.computeTargets(CLIENTE, 50);
    assert.ok(t.fat * 9 >= t.calories * 0.2, `${t.fat} g pour ${t.calories} kcal`);
    // 0,6 g/kg donnait 30 g, soit 18 % : le plancher doit avoir joue.
    assert.ok(t.fat > 30, "le plancher n'a pas joue");
  });

  test("le plancher ne change rien quand la regle au poids suffit deja", () => {
    // En prise de masse, 1 g/kg depasse largement les 20 %.
    const t = nutrition.computeTargets({ ...CLIENTE, goal: "prise" }, 80);
    assert.equal(t.fat, 80);
  });
});

/**
 * Force athletique : direction sur l'objectif performance.
 *
 * Un pratiquant de force n'est pas seulement « en performance » : il est en
 * performance ET en train de prendre ou de perdre du poids. Jusqu'ici il
 * n'avait pas le choix — rester a +5 %, ou basculer en « perte » et se
 * retrouver a -20 %, un deficit qui coute la force qu'il essaie de garder.
 *
 * Le test le plus important de ce groupe est le premier : un client DEJA en
 * performance ne doit voir aucun de ses chiffres bouger.
 */
describe("force athletique — direction sur l'objectif performance", () => {
  const LIFTER = {
    sex: "homme",
    age: 30,
    heightCm: 178,
    startWeightKg: 90,
    activityLevel: "actif",
    goal: "performance",
    jobType: "sedentaire"
  };

  const cible = (direction) =>
    nutrition.computeTargets({ ...LIFTER, performanceDirection: direction }, 90);

  test("un client deja en performance ne voit rien changer", () => {
    // Sans direction enregistree, le comportement doit etre celui d'avant.
    assert.deepEqual(cible(undefined), cible("maintien"));
    assert.deepEqual(cible(null), cible("maintien"));
    assert.deepEqual(cible("valeur-inconnue"), cible("maintien"));
  });

  test("la direction ne s'applique qu'a l'objectif performance", () => {
    for (const goal of ["perte", "prise", "maintien"]) {
      assert.equal(nutrition.directionPerformance({ ...LIFTER, goal }), null, "objectif " + goal);
      assert.deepEqual(
        nutrition.computeTargets({ ...LIFTER, goal, performanceDirection: "prise" }, 90),
        nutrition.computeTargets({ ...LIFTER, goal }, 90),
        "la direction a fuite sur l'objectif " + goal
      );
    }
  });

  test("prise et seche encadrent le maintien", () => {
    assert.ok(cible("prise").calories > cible("maintien").calories);
    assert.ok(cible("perte").calories < cible("maintien").calories);
  });

  test("la seche de force est plus douce que l'objectif perte general", () => {
    // C'est tout l'interet : -12 % au lieu de -20 %. Un deficit agressif
    // fait perdre la force qu'on essaie de conserver.
    const general = nutrition.computeTargets({ ...LIFTER, goal: "perte" }, 90);
    assert.ok(
      cible("perte").calories > general.calories,
      `seche de force ${cible("perte").calories} kcal vs perte generale ${general.calories} kcal`
    );
  });

  test("la prise de force reste mesuree", () => {
    // Au-dela d'environ 15 %, le surplus part en gras : mauvais rapport
    // force/poids, et seche suivante plus longue.
    const surplus = cible("prise").calories / cible("maintien").calories - 1;
    assert.ok(surplus > 0.03 && surplus < 0.15, "surplus de " + Math.round(surplus * 100) + " %");
  });

  test("les proteines montent en seche, pour proteger la masse maigre", () => {
    assert.ok(cible("perte").protein > cible("maintien").protein);
    assert.equal(cible("perte").protein, Math.round(90 * 2.2));
    assert.equal(cible("maintien").protein, Math.round(90 * 2));
  });

  test("les lipides de seche restent au-dessus de la regle generale", () => {
    // 0,8 g/kg et non 0,6 : ecraser les lipides jusqu'au plancher pour
    // gagner quelques grammes de glucides n'a pas de sens ici.
    assert.equal(cible("perte").fat, Math.round(90 * 0.8));
    assert.ok(cible("perte").fat > nutrition.computeTargets({ ...LIFTER, goal: "perte" }, 90).fat);
  });

  test("les glucides restent suffisants pour s'entrainer, meme en seche", () => {
    // Sous 3 g/kg, l'entrainement de force en volume devient difficile.
    const gParKg = cible("perte").carbs / 90;
    assert.ok(gParKg >= 3, gParKg.toFixed(1) + " g/kg de glucides en seche");
  });

  test("le plancher de lipides tient aussi sur les trois directions", () => {
    let verifies = 0;
    for (const direction of ["maintien", "prise", "perte"]) {
      for (let poids = 45; poids <= 160; poids += 5) {
        for (const act of ["leger", "modere", "actif", "tresactif"]) {
          const t = nutrition.computeTargets(
            { ...LIFTER, startWeightKg: poids, activityLevel: act, performanceDirection: direction },
            poids
          );
          verifies++;
          assert.ok(
            t.fat * 9 >= t.calories * 0.2,
            `${direction} ${poids} kg ${act} : ${t.fat} g pour ${t.calories} kcal`
          );
          assert.ok(t.carbs > 0, "glucides nuls");
        }
      }
    }
    assert.ok(verifies > 200, "trop peu de profils : " + verifies);
  });

  test("la seche de force se combine au poids de reference", () => {
    // Un pratiquant tres au-dessus de son objectif de categorie garde les
    // deux regles : 2,2 g/kg, mais du poids de reference.
    const t = nutrition.computeTargets(
      { ...LIFTER, targetWeightKg: 83, performanceDirection: "perte" },
      100
    );
    assert.equal(t.protein, Math.round(Math.min(100, 83 * 1.1) * 2.2));
  });

  test("les trois directions sont proposees, et « maintien » est la premiere", () => {
    assert.deepEqual(
      nutrition.PERFORMANCE_DIRECTIONS.map((d) => d.id),
      ["maintien", "prise", "perte"]
    );
    for (const d of nutrition.PERFORMANCE_DIRECTIONS) assert.ok(d.label, "direction sans libelle");
  });
});
