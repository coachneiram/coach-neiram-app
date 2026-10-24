/**
 * Activites hors musculation (lib/activites.js) : catalogue, depense,
 * intensite, et bilan « Semaine active » face aux reperes de l'OMS.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVITES,
  activiteParId,
  allure,
  chargeSRPE,
  chercherActivites,
  conseilSedentarite,
  FAMILLES_ACTIVITE,
  intensite,
  kcalActivite,
  metActivite,
  metDepuisVitesse,
  pasMoyens,
  resumeActivite,
  seanceActivite,
  semaineActive
} from "../app/src/lib/activites.js";
import { addDays, todayISO } from "../app/src/lib/dates.js";

describe("catalogue des activités", () => {
  test("identifiants uniques, familles connues, MET croissants et plausibles", () => {
    const ids = ACTIVITES.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
    const familles = new Set(FAMILLES_ACTIVITE.map((f) => f.id));
    for (const a of ACTIVITES) {
      assert.ok(familles.has(a.famille), `famille inconnue : ${a.id}`);
      assert.equal(a.met.length, 3, a.id);
      assert.ok(a.met[0] <= a.met[1] && a.met[1] <= a.met[2], `MET non croissants : ${a.id}`);
      assert.ok(a.met[0] >= 1.5 && a.met[2] <= 16, `MET hors plage : ${a.id}`);
      for (const c of a.champs) assert.ok(["distance", "denivele", "fc"].includes(c), `${a.id}.${c}`);
    }
  });

  test("chaque famille a des sports et les grands sports sont présents", () => {
    for (const f of FAMILLES_ACTIVITE) assert.ok(ACTIVITES.some((a) => a.famille === f.id), f.id);
    for (const id of ["course", "velo", "natation", "football", "tennis", "padel", "boxe", "yoga", "randonnee", "marche", "hiit", "escalade"]) {
      assert.ok(activiteParId(id), id);
    }
  });

  test("la recherche ignore accents et majuscules", () => {
    assert.ok(chercherActivites("equitation").some((a) => a.id === "equitation"));
    assert.ok(chercherActivites("RANDONNÉE").some((a) => a.id === "randonnee"));
    assert.ok(chercherActivites("", "raquette").every((a) => a.famille === "raquette"));
  });
});

describe("dépense et intensité", () => {
  test("course : MET depuis la vitesse (ACSM), 10 km/h ≈ 10 MET", () => {
    const met = metDepuisVitesse("course", 10, 60);
    assert.ok(met > 10 && met < 11, String(met));
  });

  test("le dénivelé positif augmente la dépense", () => {
    assert.ok(metDepuisVitesse("marche", 10, 150, 800) > metDepuisVitesse("marche", 10, 150, 0));
  });

  test("vitesses absurdes rejetées (GPS, faute de frappe)", () => {
    assert.equal(metDepuisVitesse("course", 50, 60), null);
    assert.equal(metDepuisVitesse("velo", 200, 60), null);
  });

  test("le ressenti choisit le niveau quand il n'y a pas de distance", () => {
    assert.equal(metActivite({ id: "football", rpe: 3 }), activiteParId("football").met[0]);
    assert.equal(metActivite({ id: "football" }), activiteParId("football").met[1]);
    assert.equal(metActivite({ id: "football", rpe: 8 }), activiteParId("football").met[2]);
  });

  test("kcal = MET × kg × h, arrondi à 5", () => {
    // Tennis modéré 6,8 MET, 70 kg, 1 h = 476 → 475.
    assert.equal(kcalActivite({ id: "tennis", duree: 60 }, 70), 475);
    assert.equal(kcalActivite({ id: "tennis", duree: 60 }, null), null);
  });

  test("intensité : RPE prioritaire, sinon MET (3 / 6)", () => {
    assert.equal(intensite({ id: "yoga" }), "legere");
    assert.equal(intensite({ id: "marche-rapide" }), "moderee");
    assert.equal(intensite({ id: "course" }), "soutenue");
    assert.equal(intensite({ id: "marche", rpe: 7 }), "soutenue");
  });

  test("allure en min/km pour la course, km/h pour le vélo", () => {
    assert.equal(allure({ id: "course", distanceKm: 10, duree: 50 }), "5'00 /km");
    assert.equal(allure({ id: "velo", distanceKm: 30, duree: 60 }), "30 km/h");
  });

  test("charge sRPE de Foster = durée × RPE", () => {
    assert.equal(chargeSRPE(60, 7), 420);
    assert.equal(chargeSRPE(60, ""), null);
  });
});

describe("enregistrement", () => {
  test("une activité devient une séance sans exercices, avec les seuls champs utiles", () => {
    const s = seanceActivite({ id: "padel", duree: "90", rpe: 6, distanceKm: 3, fcMoy: 140, notes: "match" }, { poidsKg: 80, date: "2026-10-20" });
    assert.equal(s.date, "2026-10-20");
    assert.deepEqual(s.exercises, []);
    assert.equal(s.durationMin, 90);
    assert.equal(s.activite.id, "padel");
    assert.equal(s.activite.distanceKm, undefined, "le padel n'a pas de distance");
    assert.equal(s.activite.fcMoy, 140);
    assert.equal(s.activite.intensite, "moderee");
    assert.ok(s.activite.kcal > 0);
  });

  test("saisie invalide refusée", () => {
    assert.equal(seanceActivite({ id: "padel", duree: "" }), null);
    assert.equal(seanceActivite({ id: "inconnu", duree: 30 }), null);
    assert.equal(seanceActivite({ id: "marche", duree: 3000 }), null);
  });

  test("résumé lisible", () => {
    const r = resumeActivite({ id: "course", duree: 50, distanceKm: 10, denivele: 120, kcal: 700 });
    assert.equal(r, "50 min · 10 km · D+ 120 m · 5'00 /km · ≈ 700 kcal");
  });
});

describe("semaine active (OMS)", () => {
  const J = todayISO();
  const act = (date, id, duree, rpe) => seanceActivite({ id, duree, rpe }, { date });

  test("minutes soutenues comptées double, fenêtre glissante de 7 jours", () => {
    const seances = [act(J, "course", 30, 8), act(addDays(J, -3), "marche-rapide", 40, 5), act(addDays(J, -7), "course", 60, 8)];
    const b = semaineActive(seances, J);
    assert.equal(b.soutenues, 30);
    assert.equal(b.moderees, 40);
    assert.equal(b.equivalent, 100);
    assert.equal(b.manque, 50);
  });

  test("musculation et activités de renfo comptent comme jours de renforcement", () => {
    const muscu = { date: J, exercises: [{ name: "Squat", mode: "muscu", sets: 3 }] };
    const seances = [muscu, act(addDays(J, -2), "pilates", 45), act(addDays(J, -2), "yoga", 5)];
    const b = semaineActive(seances, J);
    assert.equal(b.joursRenfo, 2);
  });

  test("repère atteint : 150 min et 2 jours de renfo", () => {
    const seances = [
      act(J, "velo", 90, 6),
      act(addDays(J, -1), "cross-training", 40, 8),
      { date: addDays(J, -4), exercises: [{ name: "Développé couché", mode: "muscu" }] }
    ];
    const b = semaineActive(seances, J);
    assert.ok(b.atteint, JSON.stringify(b));
  });

  test("pas moyens et conseils", () => {
    const journal = [{ date: J, steps: 4000 }, { date: addDays(J, -1), steps: 6000 }, { date: addDays(J, -9), steps: 20000 }];
    assert.equal(pasMoyens(journal, J), 5000);
    assert.equal(pasMoyens([], J), null);
    assert.match(conseilSedentarite(semaineActive([], J), 3000), /10 minutes/);
    assert.match(conseilSedentarite({ equivalent: 120, manque: 30, joursRenfo: 0 }, 9000), /30 min/);
    assert.match(conseilSedentarite({ equivalent: 200, manque: 0, joursRenfo: 1 }, 9000), /renforcement/);
  });
});
