/**
 * Smart Coach (25 octobre 2026), côté application : présence, poids,
 * nutrition, gravité. Fonctions pures d'abord, puis le moteur (envoi
 * injecté, stockage en mémoire).
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

function installerStockage() {
  const d = new Map();
  globalThis.localStorage = {
    getItem: (k) => (d.has(k) ? d.get(k) : null),
    setItem: (k, v) => d.set(k, String(v)),
    removeItem: (k) => d.delete(k),
    key: (i) => [...d.keys()][i] ?? null,
    get length() {
      return d.size;
    }
  };
}
installerStockage();

const { derniereSaisie, decisionPresence, envoyerPresence } = await import("../app/src/lib/presence.js");
const {
  variationPoids,
  stagnationPoids,
  decisionAlertesPoids,
  analyseNutrition,
  decisionAlerteNutrition,
  messageAlerteNutrition,
  MESSAGE_STAGNATION_POIDS
} = await import("../app/src/lib/alertes-smart.js");
const { stagnationPoidsSurveillee, variationPoidsSurveillee } = await import("../app/src/lib/eligibilite-perte.js");
const { niveauAlerte, TABLE_NIVEAUX } = await import("../app/src/lib/gravite-alertes.js");
const { verifierAlertesPoids, verifierAlerteNutrition } = await import("../app/src/lib/moteur-alertes.js");
const { envoyerEvenement, TYPES_EVENEMENTS } = await import("../app/src/lib/synchro-coach.js");
const { CLES_ANNEXES, charger, enregistrer } = await import("../app/src/lib/stockage.js");
const { addDays } = await import("../app/src/lib/dates.js");

const AUJ = "2026-10-25";
const T0 = new Date("2026-10-25T10:00:00Z");
const J = 864e5;
const plus = (jours) => new Date(T0.getTime() + jours * J);

/** Pesées : `poids(k)` pour le jour AUJ - k, aux jours `jours`. */
const pesees = (jours, poids) => jours.map((k) => ({ id: "p" + k, date: addDays(AUJ, -k), weightKg: poids(k) }));
/** Deux pesées par fenêtre de 7 jours sur 3 semaines (21 jours). */
const TROIS_SEMAINES = [0, 3, 7, 10, 14, 17];

const EN_LIGNE_PERTE = { name: "Thomas", coachingMode: "enligne", goal: "perte", age: 36 };

describe("dernière saisie", () => {
  test("la plus récente de repas, séance, pesée et journal", () => {
    const d = derniereSaisie({
      repas: [{ date: "2026-10-20" }],
      seances: [{ date: "2026-10-22" }],
      pesees: [{ date: "2026-10-23", weightKg: 80 }],
      journal: [{ id: "x", date: "2026-10-21", stress: 4 }],
      aujourdhui: AUJ
    });
    assert.equal(d, "2026-10-23");
  });

  test("une pesée vide ou un journal sans rien dedans ne comptent pas", () => {
    const d = derniereSaisie({
      repas: [{ date: "2026-10-18" }],
      pesees: [{ date: "2026-10-24", weightKg: null }],
      journal: [{ id: "x", date: "2026-10-24", note: "", tags: [] }],
      aujourdhui: AUJ
    });
    assert.equal(d, "2026-10-18");
  });

  test("dates futures et mal formées ignorées ; rien saisi : null", () => {
    assert.equal(derniereSaisie({ seances: [{ date: "2026-11-02" }, { date: "hier" }], aujourdhui: AUJ }), null);
    assert.equal(derniereSaisie({ aujourdhui: AUJ }), null);
  });
});

describe("présence : une fois par jour, en ligne seulement", () => {
  beforeEach(installerStockage);

  test("décision", () => {
    assert.equal(decisionPresence({ profil: { coachingMode: "presentiel" }, etat: {}, aujourdhui: AUJ }).envoyer, false);
    assert.equal(decisionPresence({ profil: { coachingMode: "enligne" }, etat: { jour: AUJ }, aujourdhui: AUJ }).envoyer, false);
    assert.equal(decisionPresence({ profil: { coachingMode: "enligne" }, etat: { jour: "2026-10-24" }, aujourdhui: AUJ }).envoyer, true);
  });

  test("envoi : la date seule, une fois ; raté : repart ; sans jeton : rien", async () => {
    const appels = [];
    let reponse = { ok: true, status: 200, json: async () => ({ ok: true }) };
    const envFetch = async (url, init) => (appels.push({ url, corps: JSON.parse(init.body), auth: init.headers.Authorization }), reponse);
    const enTetes = { Authorization: "Bearer jeton-de-test-0123456789" };
    const donnees = { repas: [{ date: "2026-10-23", calories: 600, name: "Pâtes" }], pesees: [{ date: "2026-10-22", weightKg: 81 }] };
    const profil = { coachingMode: "enligne" };

    assert.equal(await envoyerPresence({ profil, donnees, aujourdhui: AUJ, envFetch, enTetes: {} }), false, "sans jeton");
    assert.equal(appels.length, 0);

    reponse = { ok: false, status: 503, json: async () => ({ ok: false }) };
    assert.equal(await envoyerPresence({ profil, donnees, aujourdhui: AUJ, envFetch, enTetes }), false);
    reponse = { ok: true, status: 200, json: async () => ({ ok: true }) };
    assert.equal(await envoyerPresence({ profil, donnees, aujourdhui: AUJ, envFetch, enTetes }), true, "l'échec n'a pas noté le jour");
    assert.equal(await envoyerPresence({ profil, donnees, aujourdhui: AUJ, envFetch, enTetes }), false, "déjà envoyée aujourd'hui");
    assert.equal(appels.length, 2);
    assert.match(appels[1].url, /\/presence$/);
    assert.deepEqual(appels[1].corps, { derniereSaisie: "2026-10-23" }, "rien d'autre que la date");
    assert.equal(charger(CLES_ANNEXES.presence, {}).jour, AUJ);

    assert.equal(await envoyerPresence({ profil, donnees, aujourdhui: "2026-10-26", envFetch, enTetes }), true, "le lendemain");
    assert.equal(await envoyerPresence({ profil: { coachingMode: "presentiel" }, donnees, aujourdhui: "2026-10-27", envFetch, enTetes }), false);
    assert.equal(appels.length, 3);
  });

  test("deux ouvertures simultanées : une seule présence", async () => {
    let n = 0;
    const envFetch = async () => (n++, { ok: true, status: 200, json: async () => ({ ok: true }) });
    const p = { profil: { coachingMode: "enligne" }, donnees: {}, aujourdhui: AUJ, envFetch, enTetes: { Authorization: "Bearer x" } };
    await Promise.all([envoyerPresence(p), envoyerPresence(p)]);
    await envoyerPresence(p);
    assert.equal(n, 1);
  });
});

describe("poids : variation brutale", () => {
  test("plus de 2 % entre les deux fenêtres de 7 jours", () => {
    const p = pesees([0, 3, 7, 10], (k) => (k < 7 ? 82.0 : 80.0));
    const v = variationPoids(p, AUJ);
    assert.ok(v && Math.abs(v.pct - 2.5) < 1e-9);
  });

  test("2 % pile ou moins : rien ; baisse marquée : signe moins", () => {
    assert.equal(variationPoids(pesees([0, 3, 7, 10], (k) => (k < 7 ? 81.6 : 80)), AUJ), null);
    assert.ok(variationPoids(pesees([0, 3, 7, 10], (k) => (k < 7 ? 77 : 80)), AUJ).pct < -2);
  });

  test("pas assez de pesées (une seule dans une fenêtre) : rien", () => {
    assert.equal(variationPoids(pesees([0, 7, 10], (k) => (k < 7 ? 90 : 80)), AUJ), null);
    assert.equal(variationPoids([], AUJ), null);
  });

  test("message : la tendance seule, sans aucune pesée", () => {
    const [a] = decisionAlertesPoids({ pesees: pesees([0, 3, 7, 10], (k) => (k < 7 ? 81.92 : 80)), stagnationSurveillee: false, aujourdhui: AUJ, maintenant: T0, etat: {} });
    assert.equal(a.message, "Variation de +2,4 % en une semaine");
    assert.equal(a.niveau, "attention");
    assert.doesNotMatch(a.message, /81|80|kg/);
  });
});

describe("poids : variation exclue pour grossesse et allaitement seulement", () => {
  test("éligibilité : oui pour tous, trouble alimentaire compris ; non si grossesse ou allaitement", () => {
    assert.equal(variationPoidsSurveillee({ profil: EN_LIGNE_PERTE, reglages: {} }), true);
    assert.equal(variationPoidsSurveillee({ profil: { ...EN_LIGNE_PERTE, goal: "maintien" }, reglages: {} }), true);
    assert.equal(variationPoidsSurveillee({ profil: EN_LIGNE_PERTE, reglages: { contraintesSante: ["tca"] } }), true);
    assert.equal(variationPoidsSurveillee({ profil: EN_LIGNE_PERTE, reglages: { situation: "enceinte_t1" } }), false);
    assert.equal(variationPoidsSurveillee({ profil: EN_LIGNE_PERTE, reglages: { situation: "allaitement" } }), false);
  });

  test("décision : variation non surveillée, rien ne part", () => {
    const p = pesees([0, 3, 7, 10], (k) => (k < 7 ? 84 : 80));
    assert.equal(decisionAlertesPoids({ pesees: p, stagnationSurveillee: false, variationSurveillee: false, aujourdhui: AUJ, maintenant: T0, etat: {} }).length, 0);
    assert.equal(decisionAlertesPoids({ pesees: p, stagnationSurveillee: false, variationSurveillee: true, aujourdhui: AUJ, maintenant: T0, etat: {} }).length, 1);
  });
});

describe("poids : stagnation en phase de perte", () => {
  const stables = pesees(TROIS_SEMAINES, (k) => 85 - (21 - k) * 0.005);

  test("2 pesées par fenêtre sur 3 semaines, baisse de 0,2 kg ou moins : stagnation", () => {
    assert.equal(stagnationPoids(stables, AUJ), true);
  });

  test("baisse de plus de 0,2 kg : pas de stagnation", () => {
    assert.equal(stagnationPoids(pesees(TROIS_SEMAINES, (k) => 85 - (21 - k) * 0.05), AUJ), false);
  });

  test("une semaine avec une seule pesée : pas de jugement", () => {
    assert.equal(stagnationPoids(pesees([0, 3, 7, 10, 14], () => 85), AUJ), false);
  });

  test("objectif perte requis ; exclusions de santé et mineurs : jamais", () => {
    assert.equal(stagnationPoidsSurveillee({ profil: EN_LIGNE_PERTE, reglages: {} }), true);
    assert.equal(stagnationPoidsSurveillee({ profil: { ...EN_LIGNE_PERTE, goal: "maintien" }, reglages: {} }), false);
    assert.equal(stagnationPoidsSurveillee({ profil: { ...EN_LIGNE_PERTE, age: 17 }, reglages: {} }), false);
    assert.equal(stagnationPoidsSurveillee({ profil: EN_LIGNE_PERTE, reglages: { situation: "enceinte_t2" } }), false);
    assert.equal(stagnationPoidsSurveillee({ profil: EN_LIGNE_PERTE, reglages: { situation: "allaitement" } }), false);
    assert.equal(stagnationPoidsSurveillee({ profil: EN_LIGNE_PERTE, reglages: { contraintesSante: ["tca"] } }), false);
  });

  test("décision : niveau info, message fixe, rien de la santé", () => {
    const [a] = decisionAlertesPoids({ pesees: stables, stagnationSurveillee: true, aujourdhui: AUJ, maintenant: T0, etat: {} });
    assert.deepEqual(a, { sousType: "stagnation", niveau: "info", message: MESSAGE_STAGNATION_POIDS });
    assert.equal(decisionAlertesPoids({ pesees: stables, stagnationSurveillee: false, aujourdhui: AUJ, maintenant: T0, etat: {} }).length, 0);
  });

  test("anti-répétition : 14 jours par sous-type", () => {
    const etat = { stagnation: { lastAt: T0.toISOString() } };
    const d = (m) => decisionAlertesPoids({ pesees: stables, stagnationSurveillee: true, aujourdhui: AUJ, maintenant: m, etat });
    assert.equal(d(plus(13)).length, 0);
    assert.equal(d(plus(14)).length, 1);
  });
});

describe("nutrition", () => {
  const CIBLES = { calories: 2200, protein: 140 };
  /** Repas sur les jours AUJ - k (k de 1 à 7), deux repas par jour. */
  const repas = (jours, kcal, prot = 140) =>
    jours.flatMap((k) => [
      { date: addDays(AUJ, -k), calories: kcal / 2, protein: prot / 2 },
      { date: addDays(AUJ, -k), calories: kcal / 2, protein: prot / 2 }
    ]);

  test("5 jours sur 7 à plus de 15 % : alerte avec la moyenne et la cible", () => {
    const r = [...repas([1, 2, 3, 4, 5], 2650), ...repas([6, 7], 2200)];
    const d = decisionAlerteNutrition({ repas: r, cibles: CIBLES, aujourdhui: AUJ, maintenant: T0, etat: {} });
    assert.equal(d.alerter, true);
    assert.equal(d.message, "Calories hors cible 5 jours sur 7 (moyenne 2 521 kcal pour 2 200)");
  });

  test("protéines sous 80 % de la cible", () => {
    const d = decisionAlerteNutrition({ repas: repas([1, 2, 3, 4, 5, 6], 2200, 100), cibles: CIBLES, aujourdhui: AUJ, maintenant: T0, etat: {} });
    assert.equal(d.alerter, true);
    assert.equal(d.message, "Protéines sous 80 % de la cible 6 jours sur 6 (moyenne 100 g pour 140)");
  });

  test("aujourd'hui ne compte pas ; jours non notés ignorés ; moins de 5 jours notés : rien", () => {
    const r = [...repas([1, 2, 3, 4], 3000), { date: AUJ, calories: 5000, protein: 0 }];
    const a = analyseNutrition({ repas: r, cibles: CIBLES, aujourdhui: AUJ });
    assert.equal(a.joursNotes, 4);
    assert.equal(decisionAlerteNutrition({ repas: r, cibles: CIBLES, aujourdhui: AUJ, maintenant: T0, etat: {} }).raison, "pas assez de jours notes");
  });

  test("4 jours hors cible sur 7 : rien ; 15 % pile : dans la cible", () => {
    assert.equal(decisionAlerteNutrition({ repas: [...repas([1, 2, 3, 4], 2800), ...repas([5, 6, 7], 2200)], cibles: CIBLES, aujourdhui: AUJ, maintenant: T0, etat: {} }).alerter, false);
    assert.equal(decisionAlerteNutrition({ repas: repas([1, 2, 3, 4, 5, 6, 7], 2530), cibles: CIBLES, aujourdhui: AUJ, maintenant: T0, etat: {} }).alerter, false);
  });

  test("un contrôle par jour, une alerte tous les 7 jours ; sans cible : rien", () => {
    const r = repas([1, 2, 3, 4, 5, 6, 7], 1500);
    assert.equal(decisionAlerteNutrition({ repas: r, cibles: CIBLES, aujourdhui: AUJ, maintenant: T0, etat: { jour: AUJ } }).verifier, false);
    assert.equal(decisionAlerteNutrition({ repas: r, cibles: CIBLES, aujourdhui: AUJ, maintenant: T0, etat: { jour: "2026-10-24", lastAt: plus(-6).toISOString() } }).alerter, false);
    assert.equal(decisionAlerteNutrition({ repas: r, cibles: CIBLES, aujourdhui: AUJ, maintenant: T0, etat: { jour: "2026-10-24", lastAt: plus(-7).toISOString() } }).alerter, true);
    assert.equal(decisionAlerteNutrition({ repas: r, cibles: {}, aujourdhui: AUJ, maintenant: T0, etat: {} }).alerter, false);
  });

  test("message : calories et protéines quand les deux décrochent", () => {
    const m = messageAlerteNutrition({ joursNotes: 7, caloriesHors: 5, proteinesHors: 3, moyenneKcal: 1700, moyenneProteines: 90, cibleKcal: 2200, cibleProteines: 140 });
    assert.equal(m, "Calories hors cible 5 jours sur 7 (moyenne 1 700 kcal pour 2 200) ; Protéines sous 80 % de la cible 3 jours sur 7 (moyenne 90 g pour 140)");
  });
});

describe("moteur : en ligne seulement, une fois", () => {
  beforeEach(installerStockage);
  const capture = () => {
    const envois = [];
    return { envois, envoyer: async (p, e) => (envois.push(e), true) };
  };
  const surveiller = () => true;

  test("stagnation : alerte_poids info envoyée une fois", async () => {
    const { envois, envoyer } = capture();
    const p = pesees(TROIS_SEMAINES, () => 85);
    const args = { profile: EN_LIGNE_PERTE, pesees: p, surveillerStagnation: surveiller, maintenant: T0, aujourdhui: AUJ, envoyer };
    await verifierAlertesPoids(args);
    await verifierAlertesPoids(args);
    await verifierAlertesPoids({ ...args, maintenant: plus(3) });
    assert.equal(envois.length, 1);
    assert.equal(envois[0].type, "alerte_poids");
    assert.equal(envois[0].niveau, "info");
    assert.equal(envois[0].message, MESSAGE_STAGNATION_POIDS);
    assert.equal(JSON.stringify(envois[0]).includes("85"), false, "aucune pesée ne part");
  });

  test("le vrai calcul d'éligibilité : grossesse dans le questionnaire, rien ne part, ni motif", async () => {
    enregistrer("cn_objectifs_sur_mesure", { situation: "enceinte_t2" });
    const { envois, envoyer } = capture();
    await verifierAlertesPoids({ profile: EN_LIGNE_PERTE, pesees: pesees(TROIS_SEMAINES, () => 85), maintenant: T0, aujourdhui: AUJ, envoyer });
    assert.equal(envois.length, 0);
  });

  test("le vrai calcul : allaitement, pas de variation ; trouble alimentaire, variation sans motif", async () => {
    const brutale = pesees([0, 3, 7, 10], (k) => (k < 7 ? 84 : 80));
    const profil = { ...EN_LIGNE_PERTE, goal: "maintien" };
    enregistrer("cn_objectifs_sur_mesure", { situation: "allaitement" });
    const a = capture();
    await verifierAlertesPoids({ profile: profil, pesees: brutale, maintenant: T0, aujourdhui: AUJ, envoyer: a.envoyer });
    assert.equal(a.envois.length, 0);
    installerStockage();
    enregistrer("cn_objectifs_sur_mesure", { contraintesSante: ["tca"] });
    const b = capture();
    await verifierAlertesPoids({ profile: profil, pesees: brutale, maintenant: T0, aujourdhui: AUJ, envoyer: b.envoyer });
    assert.deepEqual(b.envois.map((e) => [e.type, e.niveau, e.message]), [["alerte_poids", "attention", "Variation de +5,0 % en une semaine"]]);
    assert.doesNotMatch(JSON.stringify(b.envois[0]), /tca|trouble|alimentaire|santé|sante/i);
  });

  test("présentiel : ni poids ni nutrition", async () => {
    const { envois, envoyer } = capture();
    const presentiel = { ...EN_LIGNE_PERTE, coachingMode: "presentiel" };
    await verifierAlertesPoids({ profile: presentiel, pesees: pesees([0, 3, 7, 10], (k) => (k < 7 ? 90 : 80)), surveillerStagnation: surveiller, maintenant: T0, aujourdhui: AUJ, envoyer });
    await verifierAlerteNutrition({ profile: presentiel, repas: [], cibles: { calories: 2000 }, maintenant: T0, aujourdhui: AUJ, envoyer });
    assert.equal(envois.length, 0);
    assert.equal(charger(CLES_ANNEXES.alerteNutrition, null), null, "aucun état écrit en présentiel");
  });

  test("nutrition : une alerte, puis plus rien le même jour ni la semaine", async () => {
    const { envois, envoyer } = capture();
    const r = [1, 2, 3, 4, 5, 6, 7].map((k) => ({ date: addDays(AUJ, -k), calories: 3000, protein: 150 }));
    const args = { profile: EN_LIGNE_PERTE, repas: r, cibles: { calories: 2200, protein: 140 }, maintenant: T0, aujourdhui: AUJ, envoyer };
    await verifierAlerteNutrition(args);
    await verifierAlerteNutrition(args);
    await verifierAlerteNutrition({ ...args, aujourdhui: "2026-10-28", maintenant: plus(3) });
    assert.equal(envois.length, 1);
    assert.equal(envois[0].type, "alerte_nutrition");
    assert.equal(envois[0].niveau, "attention");
    assert.match(envois[0].message, /^Calories hors cible 7 jours sur 7 \(moyenne 3 000 kcal pour 2 200\)$/);
    assert.equal(charger(CLES_ANNEXES.alerteNutrition, {}).jour, "2026-10-28");
  });
});

describe("gravité", () => {
  test("table : niveaux attendus", () => {
    const n = (e) => niveauAlerte(e);
    assert.equal(n({ type: "alerte_inactivite", nbJours: 4 }), "attention");
    assert.equal(n({ type: "alerte_inactivite", nbJours: 7 }), "critique");
    assert.equal(n({ type: "alerte_sommeil_stress" }), "critique");
    assert.equal(n({ type: "alerte_seances_manquees", nbManquees: 2 }), "attention");
    assert.equal(n({ type: "alerte_seances_manquees", nbManquees: 3 }), "critique");
    assert.equal(n({ type: "alerte_poids", sousType: "variation" }), "attention");
    assert.equal(n({ type: "alerte_poids", sousType: "stagnation" }), "info");
    assert.equal(n({ type: "alerte_nutrition" }), "attention");
    assert.equal(n({ type: "alerte_decalages" }), "attention");
    assert.equal(n({ type: "alerte_semaines_difficiles" }), "attention");
    assert.equal(n({ type: "semaine_difficile" }), "info");
    assert.equal(n({ type: "justification" }), "attention");
    assert.equal(n({ type: "pointage" }), null);
    assert.equal(n({ type: "activite" }), null);
    assert.equal(n({ type: "semaine_difficile", niveau: "critique" }), "critique", "un niveau valide est gardé");
    assert.equal(n({ type: "semaine_difficile", niveau: "urgent" }), "info", "un niveau inconnu est remplacé");
  });

  test("chaque type d'alerte de la liste a une ligne dans la table", () => {
    const alertes = TYPES_EVENEMENTS.filter((t) => t !== "pointage" && t !== "activite");
    for (const t of alertes) assert.ok(TABLE_NIVEAUX.some((r) => r.type === t), t);
  });

  test("envoyerEvenement ajoute le niveau à toute alerte, pas aux pointages", async () => {
    installerStockage();
    globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
    const profil = { name: "Thomas", coachingMode: "enligne" };
    await envoyerEvenement(profil, { type: "alerte_seances_manquees", weekKey: "2026-10-19", nbManquees: 3 });
    await envoyerEvenement(profil, { type: "semaine_difficile", weekKey: "2026-10-19" });
    await envoyerEvenement(profil, { type: "pointage", date: AUJ });
    const file = charger(CLES_ANNEXES.outboxCoach, []);
    assert.deepEqual(file.map((e) => [e.type, e.niveau]), [["alerte_seances_manquees", "critique"], ["semaine_difficile", "info"], ["pointage", undefined]]);
  });
});
