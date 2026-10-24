/**
 * Autres sports dans l'app coach (24 octobre 2026) : les regles propres au
 * coaching, en plus des tests repris de l'app Neiram.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { creerLocalStorage } from "./outils-neiram.mjs";

globalThis.localStorage = creerLocalStorage();
const { seanceActivite } = await import("../app/src/lib/activites.js");
const { ACTIVITES_COMPTENT_POUR_CRENEAUX, evenementActivite, seancesPourCreneaux } = await import("../app/src/lib/textes-sports.js");
const { semaineCreneaux } = await import("../app/src/lib/creneaux.js");
const { seanceDuJour } = await import("../app/src/lib/seance-du-jour.js");
const { collectionApi } = await import("../app/src/lib/collections.js");

const course = { ...seanceActivite({ id: "course", duree: 40, rpe: 6, distanceKm: 7 }, { poidsKg: 75, date: "2026-10-20" }), id: "a1" };
const muscu = { id: "m1", date: "2026-10-20", routineId: "r1", exercises: [{ name: "Squat" }] };

describe("créneaux de coaching", () => {
  const creneaux = [{ id: "c1", day: "tue", time: "18:30" }];
  test("par défaut, une activité ne tient pas un créneau", () => {
    assert.equal(ACTIVITES_COMPTENT_POUR_CRENEAUX, false);
    assert.deepEqual(seancesPourCreneaux([course, muscu]).map((s) => s.id), ["m1"]);
    const avecCourse = semaineCreneaux(creneaux, [course], "2026-10-19", "2026-10-24");
    assert.equal(avecCourse.lignes[0].session, undefined, "la course du mardi ne tient pas le créneau");
    const avecMuscu = semaineCreneaux(creneaux, [course, muscu], "2026-10-19", "2026-10-24");
    assert.equal(avecMuscu.lignes[0].session.id, "m1");
  });
  test("« Ta séance du jour » : une activité ne compte pas comme la séance du coach", () => {
    const routines = [{ id: "r1", name: "Bas du corps" }];
    const jour = seanceDuJour(routines, [{ ...course, date: "2026-10-24" }], {}, "2026-10-24");
    assert.notEqual(jour.etat, "faite");
    assert.equal(seanceDuJour(routines, [{ ...muscu, date: "2026-10-24" }], {}, "2026-10-24").etat, "faite");
  });
});

describe("Journal du coach", () => {
  test("coaching en ligne : sport, durée, RPE et charge sRPE", () => {
    const e = evenementActivite({ name: "Thomas", coachingMode: "enligne" }, { ...course, notes: "Parcours du lac" });
    assert.equal(e.type, "activite");
    assert.equal(e.date, "2026-10-20");
    assert.equal(e.dureeMin, 40);
    assert.equal(e.rpe, 6);
    assert.match(e.message, /Course à pied/);
    assert.match(e.message, /charge sRPE 240/);
    assert.match(e.message, /Parcours du lac/);
  });
  test("présentiel ou séance sans activité : rien", () => {
    assert.equal(evenementActivite({ coachingMode: "presentiel" }, course), null);
    assert.equal(evenementActivite({ coachingMode: "enligne" }, muscu), null);
  });
});

test("collection : removeMany retire plusieurs entrées en une écriture", async () => {
  let items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const api = collectionApi("coach_sessions", items, (s) => (items = s));
  await api.removeMany(["a", "c"]);
  assert.deepEqual(items.map((x) => x.id), ["b"]);
  assert.deepEqual(JSON.parse(localStorage.getItem("coach_sessions")).map((x) => x.id), ["b"]);
});
