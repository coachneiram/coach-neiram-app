/**
 * Les rappels client restants et les alertes coach.
 *
 * DERNIER BLOC NON PORTE de la bascule. L'ecran Reglages proposait les
 * interrupteurs, les horaires, les intervalles — et rien derriere. Ni
 * setInterval, ni Notification, ni alerte coach.
 *
 * Cote coach, c'est pire que cote client : un client qui decroche ne le
 * dit pas. Il decale, puis il manque, puis il s'excuse, puis il part.
 * Les deux alertes de creneaux servent a attraper ca AVANT l'abandon.
 * Sans elles, Marien devait s'en apercevoir tout seul.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  RAPPEL_CRENEAU,
  RAPPEL_HYDRATATION,
  RAPPEL_NUTRITION,
  decisionRappelCreneau,
  decisionRappelHydratation,
  decisionRappelNutrition,
  messageCreneau,
  messageHydratation,
  messageNutrition
} from "../app/src/lib/rappels.js";
import {
  CARENCE_ALERTE_JOURS,
  SEUIL_ALERTE_DECALAGES,
  decisionAlerteDecalages,
  decisionAlerteManques,
  decisionResumeHebdo,
  manquesAvecMotifs
} from "../app/src/lib/alertes-coach.js";
import { SEUIL_ALERTE_MANQUES } from "../app/src/lib/creneaux.js";
import {
  CLE_ETAT_CRENEAU,
  CLE_ETAT_HYDRATATION,
  CLE_ETAT_NUTRITION,
  verifierRappelHydratation,
  verifierRappelNutrition
} from "../app/src/lib/moteur-rappels.js";
import { fmtL } from "../app/src/lib/score-jour.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (c) => readFileSync(join(ICI, "..", c), "utf8");

function installerStockage() {
  const d = new Map();
  globalThis.localStorage = {
    getItem: (k) => (d.has(k) ? d.get(k) : null),
    setItem: (k, v) => d.set(k, String(v)),
    removeItem: (k) => d.delete(k),
    get length() {
      return d.size;
    }
  };
}

const A = (h, min = 0) => new Date(2026, 8, 8, h, min); // mardi 8 sept 2026
const PROFIL_EAU = { hydrationRemindersEnabled: true, targetWaterL: 2 };
const PROFIL_NUT = { nutritionRemindersEnabled: true };
const OBJECTIFS = { calories: 2000, protein: 140, carbs: 220, fat: 70 };

describe("rappel d'hydratation", () => {
  const base = { profile: PROFIL_EAU, journalDuJour: { waterMl: 500 }, dernierEnvoi: null };

  test("dans la plage, on rappelle avec le reste a boire", () => {
    const d = decisionRappelHydratation({ ...base, maintenant: A(14) });
    assert.equal(d.rappeler, true);
    assert.equal(d.reste, 1500);
    assert.equal(messageHydratation(d, fmtL), "Hydratation : 0,5 L / 2 L — il te reste 1,5 L à boire aujourd'hui.");
  });

  test("l'objectif atteint fait taire le rappel", () => {
    // Un rappel qui arrive alors que le travail est fait apprend a les ignorer.
    const d = decisionRappelHydratation({ ...base, journalDuJour: { waterMl: 2000 }, maintenant: A(14) });
    assert.equal(d.rappeler, false);
    assert.equal(d.raison, "objectif deja atteint");
  });

  test("la plage horaire du client est respectee", () => {
    const heures = [];
    for (let h = 0; h < 24; h++) if (decisionRappelHydratation({ ...base, maintenant: A(h) }).rappeler) heures.push(h);
    assert.deepEqual(heures, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], "9 h - 21 h par defaut");

    const perso = { ...PROFIL_EAU, hydrationStartHour: 7, hydrationEndHour: 12 };
    const h2 = [];
    for (let h = 0; h < 24; h++)
      if (decisionRappelHydratation({ ...base, profile: perso, maintenant: A(h) }).rappeler) h2.push(h);
    assert.deepEqual(h2, [7, 8, 9, 10, 11]);
  });

  test("l'intervalle du client est respecte", () => {
    const recent = new Date(A(14).getTime() - 30 * 60000).toISOString();
    assert.equal(decisionRappelHydratation({ ...base, dernierEnvoi: recent, maintenant: A(14) }).rappeler, false);
    const vieux = new Date(A(14).getTime() - 100 * 60000).toISOString();
    assert.equal(decisionRappelHydratation({ ...base, dernierEnvoi: vieux, maintenant: A(14) }).rappeler, true);
  });

  test("l'interrupteur coupe tout", () => {
    const d = decisionRappelHydratation({ ...base, profile: { ...PROFIL_EAU, hydrationRemindersEnabled: false }, maintenant: A(14) });
    assert.equal(d.rappeler, false);
  });
});

describe("rappel nutrition", () => {
  const base = { profile: PROFIL_NUT, targets: OBJECTIFS, totaux: { kcal: 900, p: 60, c: 100, f: 30 }, dernierEnvoi: null };

  test("le message porte le restant et des idees", () => {
    const d = decisionRappelNutrition({ ...base, maintenant: A(15) });
    assert.equal(d.rappeler, true);
    const m = messageNutrition(d, OBJECTIFS, [{ name: "Skyr", kcal: 120 }]);
    assert.equal(
      m,
      "Nutrition : 900 / 2000 kcal — il te reste 1100 kcal (P 80 g · G 120 g · L 40 g) aujourd'hui. Idées : Skyr (120 kcal)."
    );
  });

  test("sans idee disponible, le message reste correct", () => {
    const d = decisionRappelNutrition({ ...base, maintenant: A(15) });
    assert.ok(!messageNutrition(d, OBJECTIFS, []).includes("Idées"));
  });

  test("sous 150 kcal restantes, on se tait", () => {
    // Proposer une collation a quelqu'un qui a presque fini le pousse au
    // depassement : c'est l'inverse du service rendu.
    const d = decisionRappelNutrition({ ...base, totaux: { kcal: 1900, p: 140, c: 220, f: 70 }, maintenant: A(15) });
    assert.equal(d.rappeler, false);
    assert.equal(d.raison, "moins de 150 kcal restantes");
    assert.equal(RAPPEL_NUTRITION.seuilKcal, 150);
  });

  test("un depassement de macro ne donne jamais un restant negatif", () => {
    const d = decisionRappelNutrition({ ...base, totaux: { kcal: 500, p: 200, c: 300, f: 100 }, maintenant: A(15) });
    assert.deepEqual([d.restant.p, d.restant.c, d.restant.f], [0, 0, 0]);
  });

  test("sans objectifs calcules, aucun rappel", () => {
    assert.equal(decisionRappelNutrition({ ...base, targets: null, maintenant: A(15) }).rappeler, false);
  });
});

describe("rappel de creneau", () => {
  const creneau = { id: "c1", day: "mardi", time: "18:30", minutes: 18 * 60 + 30 };
  const base = { profile: { creneauReminderEnabled: true }, creneauDuJour: creneau, seanceFaite: false, jourDejaRappele: null, aujourdhui: "2026-09-08" };

  test("il part dans l'heure qui precede, pas avant", () => {
    assert.equal(decisionRappelCreneau({ ...base, maintenant: A(17, 0) }).rappeler, false, "1 h 30 avant : trop tot");
    assert.equal(decisionRappelCreneau({ ...base, maintenant: A(17, 45) }).rappeler, true, "45 min avant");
    assert.equal(decisionRappelCreneau({ ...base, maintenant: A(18, 29) }).rappeler, true);
    assert.equal(RAPPEL_CRENEAU.avanceMinutes, 60);
  });

  test("une fois le creneau commence, plus de rappel", () => {
    const d = decisionRappelCreneau({ ...base, maintenant: A(18, 30) });
    assert.equal(d.rappeler, false);
    assert.equal(d.raison, "creneau deja commence");
  });

  test("la seance deja faite fait taire le rappel", () => {
    const d = decisionRappelCreneau({ ...base, seanceFaite: true, maintenant: A(18) });
    assert.equal(d.rappeler, false);
    assert.equal(d.raison, "seance deja faite");
  });

  test("une seule fois par jour", () => {
    const d = decisionRappelCreneau({ ...base, jourDejaRappele: "2026-09-08", maintenant: A(18) });
    assert.equal(d.rappeler, false);
  });

  test("le message nomme le jour et l'heure", () => {
    assert.equal(messageCreneau("Mardi", "18:30"), "Ton créneau de mardi à 18:30 approche.");
  });

  test("un jour sans creneau ne declenche rien", () => {
    assert.equal(decisionRappelCreneau({ ...base, creneauDuJour: null, maintenant: A(18) }).rappeler, false);
  });
});

describe("alerte coach : creneaux manques", () => {
  const m = (date) => ({ date, jour: "Mardi", heure: "18:30" });

  test("deux manques suffisent a prevenir le coach", () => {
    assert.equal(SEUIL_ALERTE_MANQUES, 2);
    assert.equal(decisionAlerteManques({ maintenant: A(12), manques: [m("2026-09-01")], etat: {} }).alerter, false);
    const d = decisionAlerteManques({ maintenant: A(12), manques: [m("2026-09-01"), m("2026-09-08")], etat: {} });
    assert.equal(d.alerter, true);
    assert.equal(d.signature, "2026-09-01|2026-09-08");
  });

  test("les memes creneaux ne sont pas signales deux fois", () => {
    const manques = [m("2026-09-01"), m("2026-09-08")];
    const etat = { signature: "2026-09-01|2026-09-08", lastAt: "2026-08-01T00:00:00.000Z" };
    assert.equal(decisionAlerteManques({ maintenant: A(12), manques, etat }).alerter, false);
  });

  test("un nouveau creneau manque relance l'alerte", () => {
    const etat = { signature: "2026-09-01|2026-09-08", lastAt: "2026-08-01T00:00:00.000Z" };
    const d = decisionAlerteManques({ maintenant: A(12), manques: [m("2026-09-01"), m("2026-09-08"), m("2026-09-15")], etat });
    assert.equal(d.alerter, true);
  });

  test("le coach n'est pas harcele : 7 jours de carence", () => {
    assert.equal(CARENCE_ALERTE_JOURS, 7);
    const hier = new Date(A(12).getTime() - 1 * 864e5).toISOString();
    const d = decisionAlerteManques({ maintenant: A(12), manques: [m("a"), m("b")], etat: { lastAt: hier } });
    assert.equal(d.alerter, false);
    assert.equal(d.raison, "carence non ecoulee");

    const vieux = new Date(A(12).getTime() - 8 * 864e5).toISOString();
    assert.equal(decisionAlerteManques({ maintenant: A(12), manques: [m("a"), m("b")], etat: { lastAt: vieux } }).alerter, true);
  });

  test("le motif du client accompagne le creneau manque", () => {
    // « manque 2 fois » et « manque 2 fois, enfant malade » n'appellent
    // pas le meme coup de fil.
    const creneaux = [{ id: "c1", day: "mardi", time: "18:30" }];
    const justifs = { "c1|2026-09-08": { label: "Enfant malade", detail: "garde imprévue" } };
    const [ligne] = manquesAvecMotifs([m("2026-09-08")], creneaux, justifs, () => "Mardi");
    assert.equal(ligne.motif, "Enfant malade");
    assert.equal(ligne.precision, "garde imprévue");
  });

  test("sans justification, les champs restent vides et non undefined", () => {
    const [ligne] = manquesAvecMotifs([m("2026-09-08")], [{ id: "c1", day: "mardi", time: "18:30" }], {}, () => "Mardi");
    assert.equal(ligne.motif, "");
    assert.equal(ligne.precision, "");
  });
});

describe("alerte coach : derive du creneau", () => {
  const d = (date) => ({ date });

  test("trois decalages sur 4 semaines declenchent l'alerte", () => {
    assert.equal(SEUIL_ALERTE_DECALAGES, 3);
    assert.equal(decisionAlerteDecalages({ maintenant: A(12), decalages: [d("a"), d("b")], etat: {} }).alerter, false);
    assert.equal(decisionAlerteDecalages({ maintenant: A(12), decalages: [d("a"), d("b"), d("c")], etat: {} }).alerter, true);
  });
});

describe("resume hebdomadaire au coach", () => {
  test("une fois par semaine", () => {
    const taux = { resolved: 4, honored: 3, missed: 1, shifted: 0, pct: 75 };
    assert.equal(decisionResumeHebdo({ cleSemaine: "2026-09-07", tauxRespect: taux, etat: {} }).envoyer, true);
    assert.equal(
      decisionResumeHebdo({ cleSemaine: "2026-09-07", tauxRespect: taux, etat: { lastWeekKey: "2026-09-07" } }).envoyer,
      false
    );
  });

  test("aucun creneau tranche, aucun resume", () => {
    const d = decisionResumeHebdo({ cleSemaine: "2026-09-07", tauxRespect: { resolved: 0, pct: 0 }, etat: {} });
    assert.equal(d.envoyer, false);
  });
});

describe("declenchement des rappels", () => {
  beforeEach(installerStockage);
  const montrerOk = () => true;

  test("un rappel montre note son heure et ne repart pas tout de suite", () => {
    const opts = { profile: PROFIL_EAU, journalDuJour: { waterMl: 500 }, afficherToast: () => {}, maintenant: A(14), montrer: montrerOk };
    assert.equal(verifierRappelHydratation(opts).montre, true);
    assert.equal(JSON.parse(localStorage.getItem(CLE_ETAT_HYDRATATION)).lastAt, A(14).toISOString());
    assert.equal(verifierRappelHydratation(opts).rappeler, false, "l'intervalle n'est pas ecoule");
  });

  test("un rappel qu'on n'a PAS pu montrer repasse au tour suivant", () => {
    const opts = { profile: PROFIL_NUT, targets: OBJECTIFS, totaux: { kcal: 900, p: 60, c: 100, f: 30 }, afficherToast: () => {}, maintenant: A(15), suggerer: () => [] };
    assert.equal(verifierRappelNutrition({ ...opts, montrer: () => false }).rappeler, false);
    assert.equal(localStorage.getItem(CLE_ETAT_NUTRITION), null, "rien ne doit etre note");
    assert.equal(verifierRappelNutrition({ ...opts, montrer: montrerOk }).montre, true);
  });

  test("les cles de stockage sont celles de l'application actuelle", () => {
    assert.equal(CLE_ETAT_HYDRATATION, "coach_hydration_state");
    assert.equal(CLE_ETAT_NUTRITION, "coach_nutrition_state");
    assert.equal(CLE_ETAT_CRENEAU, "coach_creneau_reminder_state");
  });

  test("les tags de notification evitent les doublons", () => {
    assert.deepEqual(
      [RAPPEL_HYDRATATION.tag, RAPPEL_NUTRITION.tag, RAPPEL_CRENEAU.tag],
      ["coach-hydration", "coach-nutrition", "coach-creneau"]
    );
  });
});

describe("branchement", () => {
  const app = lire("app/src/App.jsx");

  test("les trois rappels tournent sur le meme minuteur", () => {
    for (const f of ["verifierRappelHydratation", "verifierRappelNutrition", "verifierRappelCreneau"]) {
      assert.match(app, new RegExp(f + "\\("), `${f} n'est pas appele`);
    }
    assert.match(app, /window\.setInterval\(verifier, PERIODE_VERIFICATION_MS\)/);
  });

  test("les alertes coach sont reevaluees quand les seances changent", () => {
    assert.match(app, /verifierAlertesCoach\(\{/);
    assert.match(app, /\}, \[pret, profile, sessions, raisonsCreneaux\]\);/);
  });

  test("le proxy accepte enfin les deux types qu'il rejetait", () => {
    // alerte_decalages et resume_hebdo etaient absents de l'allow-list :
    // le proxy les refusait en 400, y compris AVANT la migration.
    const worker = lire("worker/coach-neiram-proxy.js");
    const synchro = lire("app/src/lib/synchro-coach.js");
    for (const t of ["alerte_decalages", "resume_hebdo"]) {
      assert.ok(worker.includes(`"${t}"`), `${t} absent de l'allow-list du proxy`);
      assert.ok(synchro.includes(`"${t}"`), `${t} absent des types cote application`);
    }
  });
});
