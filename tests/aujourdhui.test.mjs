/**
 * Carte « Aujourd'hui » du Journal (25 octobre 2026, idée reprise de Fallen).
 * Vérifie les trois lignes : entraînement (prévue, faite, repos, créneau
 * avec le coach, suggestion, vide), nutrition (rien noté, reste, atteint,
 * sans objectif) et bilan (envoyé, dimanche, dans N jours).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const A = await import("../app/src/lib/aujourdhui.js");

// 2026-10-26 est un lundi, 2026-11-01 un dimanche.
const LUNDI = "2026-10-26";
const MARDI = "2026-10-27";
const DIMANCHE = "2026-11-01";
const routines = [
  { id: "r1", name: "Push", exercises: [] },
  { id: "r2", name: "Legs", exercises: [] }
];

describe("ligne entraînement", () => {
  test("séance prévue au plan : son nom et « Commencer » qui ouvre la séance", () => {
    const l = A.ligneEntrainement({ routines, seances: [], plan: { mon: "r1" }, profil: {}, date: LUNDI });
    assert.equal(l.etat, "a-faire");
    assert.equal(l.texte, "Push");
    assert.equal(l.detail, null, "prévue au plan, pas une suggestion");
    assert.deepEqual(l.action, { libelle: "Commencer", onglet: "entrainements", intention: "seance" });
  });

  test("séance faite aujourd'hui : plus de bouton", () => {
    const l = A.ligneEntrainement({ routines, seances: [{ id: "s", date: LUNDI, routineId: "r1" }], plan: { mon: "r1" }, profil: {}, date: LUNDI });
    assert.equal(l.etat, "fait");
    assert.equal(l.action, null);
    assert.equal(l.detail, "Push");
  });

  test("une autre activité (course) ne compte pas comme la séance", () => {
    const l = A.ligneEntrainement({ routines, seances: [{ id: "s", date: LUNDI, activite: "course" }], plan: { mon: "r1" }, profil: {}, date: LUNDI });
    assert.equal(l.etat, "a-faire");
  });

  test("jour de repos : la prochaine séance du plan", () => {
    const l = A.ligneEntrainement({ routines, seances: [], plan: { wed: "r2" }, profil: {}, date: LUNDI });
    assert.equal(l.etat, "repos");
    assert.equal(l.detail, "Prochaine : Mercredi — Legs");
    assert.equal(l.action, null);
  });

  test("créneau avec le coach : heure et lieu, même un jour de repos du plan", () => {
    const profil = { slots: [{ day: "mon", time: "18:30", place: "Fitness Park" }] };
    const repos = A.ligneEntrainement({ routines, seances: [], plan: { wed: "r2" }, profil, date: LUNDI });
    assert.equal(repos.etat, "a-faire");
    assert.equal(repos.texte, "Séance avec ton coach à 18:30 · Fitness Park");
    const prevue = A.ligneEntrainement({ routines, seances: [], plan: { mon: "r1" }, profil, date: LUNDI });
    assert.equal(prevue.texte, "Push");
    assert.equal(prevue.detail, "Séance avec ton coach à 18:30 · Fitness Park");
    const autreJour = A.ligneEntrainement({ routines, seances: [], plan: { mon: "r1" }, profil, date: MARDI });
    assert.notEqual(autreJour.texte, repos.texte);
  });

  test("sans plan : suggestion par rotation ; sans séance du tout : choisir un programme", () => {
    const rot = A.ligneEntrainement({ routines, seances: [], plan: {}, profil: {}, date: LUNDI });
    assert.equal(rot.detail, "Suggestion");
    assert.equal(rot.action.intention, "seance");
    const vide = A.ligneEntrainement({ routines: [], seances: [], plan: {}, profil: {}, date: LUNDI });
    assert.equal(vide.etat, "vide");
    assert.deepEqual(vide.action, { libelle: "Choisir un programme", onglet: "entrainements" });
  });
});

describe("ligne nutrition", () => {
  const objectifs = { calories: 2200, protein: 150 };
  test("sans objectif calorique : pas de ligne", () => {
    assert.equal(A.ligneNutrition({ totaux: { calories: 500 }, objectifs: {} }), null);
    assert.equal(A.ligneNutrition({ totaux: null, objectifs: null }), null);
  });
  test("rien noté : bouton « Noter un repas » (intention repas, sans changer d'onglet)", () => {
    const l = A.ligneNutrition({ totaux: { calories: 0, protein: 0 }, objectifs });
    assert.equal(l.etat, "vide");
    assert.equal(l.detail, "Objectif : 2200 kcal");
    assert.deepEqual(l.action, { libelle: "Noter un repas", intention: "repas" });
  });
  test("en cours : calories et protéines restantes", () => {
    const l = A.ligneNutrition({ totaux: { calories: 1400.4, protein: 90 }, objectifs });
    assert.equal(l.texte, "Encore 800 kcal et 60 g de protéines");
    assert.equal(l.detail, "1400 kcal notées");
  });
  test("protéines déjà atteintes : seulement les calories", () => {
    assert.equal(A.ligneNutrition({ totaux: { calories: 2000, protein: 160 }, objectifs }).texte, "Encore 200 kcal");
  });
  test("objectif atteint ou dépassé : pas de reproche, pas de bouton", () => {
    const l = A.ligneNutrition({ totaux: { calories: 2600, protein: 100 }, objectifs });
    assert.equal(l.etat, "fait");
    assert.equal(l.texte, "Objectif du jour atteint");
    assert.equal(l.action, null);
  });
});

describe("ligne bilan", () => {
  test("bilan de la semaine déjà envoyé", () => {
    assert.equal(A.ligneBilan({ date: DIMANCHE, bilanEnvoye: LUNDI }).etat, "fait");
    assert.equal(A.ligneBilan({ date: MARDI, bilanEnvoye: LUNDI }).texte, "Bilan envoyé, merci");
  });
  test("dimanche : à envoyer, bouton vers Tendances", () => {
    const l = A.ligneBilan({ date: DIMANCHE, bilanEnvoye: "2026-10-19" });
    assert.equal(l.texte, "À envoyer aujourd'hui");
    assert.deepEqual(l.action, { libelle: "Envoyer mon bilan", onglet: "tendances" });
  });
  test("en semaine : dans N jours", () => {
    assert.equal(A.ligneBilan({ date: LUNDI, bilanEnvoye: null }).texte, "Dimanche, dans 6 jours");
    assert.equal(A.ligneBilan({ date: "2026-10-31", bilanEnvoye: null }).texte, "Dimanche, dans 1 jour");
  });
});

describe("carte complète et branchement", () => {
  test("trois lignes dans l'ordre, deux sans objectif calorique", () => {
    const base = { routines, seances: [], plan: { mon: "r1" }, profil: {}, totaux: { calories: 0 }, bilanEnvoye: null, date: LUNDI };
    assert.deepEqual(A.lignesAujourdhui({ ...base, objectifs: { calories: 2000 } }).map((l) => l.id), ["entrainement", "nutrition", "bilan"]);
    assert.deepEqual(A.lignesAujourdhui({ ...base, objectifs: null }).map((l) => l.id), ["entrainement", "bilan"]);
  });
  test("le Journal affiche la carte le jour même, en tête, et l'app lui passe routines et plan", () => {
    const j = readFileSync(new URL("../app/src/ecrans/Journal.jsx", import.meta.url), "utf8");
    assert.match(j, /date === todayISO\(\) && \(\s*<CarteAujourdhui/);
    assert.ok(j.indexOf("<CarteAujourdhui") < j.indexOf("<MotDuCoach"));
    const app = readFileSync(new URL("../app/src/App.jsx", import.meta.url), "utf8");
    assert.match(app, /routines=\{routines\}\s*planSemaine=\{planSemaine\}\s*onAller=/);
  });
});
