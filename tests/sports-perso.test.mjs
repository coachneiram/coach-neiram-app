/**
 * Sports personnels, details par discipline, repartition et records
 * (lib/activites.js).
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  activiteParId,
  allure,
  champsDetails,
  champVisible,
  chercherActivites,
  creerSportPerso,
  definirSportsPerso,
  distanceNatation,
  nettoyerDetails,
  recordsSports,
  repartitionSports,
  resumeDetails,
  seanceActivite,
  semaineActive
} from "../app/src/lib/activites.js";

describe("sports perso", () => {
  test("création : nom obligatoire, valeurs inconnues ramenées à des valeurs sûres", () => {
    assert.equal(creerSportPerso({ label: " " }), null);
    const s = creerSportPerso({ label: "Pole dance", emoji: "💣", famille: "xxx", intensite: "soutenue", champs: ["fc", "vitesse"], renfo: true });
    assert.match(s.id, /^perso-/);
    assert.equal(s.emoji, "✨");
    assert.equal(s.famille, "quotidien");
    assert.deepEqual(s.champs, ["fc"]);
    assert.deepEqual(s.met, [6, 8, 10]);
    assert.ok(s.renfo && s.perso);
  });

  test("déclarés, ils sont trouvables, notables et comptent dans la semaine active", () => {
    const s = creerSportPerso({ label: "Parkour", famille: "pleinair", intensite: "intense", renfo: true });
    definirSportsPerso([s, { id: "pirate", label: "x" }]);
    assert.equal(activiteParId(s.id).label, "Parkour");
    assert.ok(chercherActivites("park").some((a) => a.id === s.id));
    assert.equal(champsDetails(activiteParId(s.id)).length, 0);
    const seance = seanceActivite({ id: s.id, duree: 40, rpe: 8 }, { poidsKg: 70, date: "2026-10-22" });
    assert.ok(seance.activite.perso);
    assert.equal(seance.activite.label, "Parkour");
    const b = semaineActive([seance], "2026-10-22");
    assert.equal(b.soutenues, 40);
    assert.equal(b.joursRenfo, 1);
    definirSportsPerso([]);
    assert.equal(activiteParId(s.id), null, "retiré : plus proposé");
  });
});

describe("détails par discipline", () => {
  test("chaque grande discipline a ses champs", () => {
    const cles = (id) => champsDetails(activiteParId(id)).map((c) => c.cle);
    assert.ok(cles("course").includes("structure"));
    assert.ok(cles("velo").includes("puissance"));
    assert.ok(cles("natation").includes("longueurs"));
    assert.ok(cles("padel").includes("score"));
    assert.ok(cles("boxe").includes("rounds"));
    assert.ok(cles("escalade").includes("cotation"));
    assert.ok(cles("cross-training").includes("format"));
  });

  test("champ conditionnel : le score n'apparaît qu'en match", () => {
    const score = champsDetails(activiteParId("tennis")).find((c) => c.cle === "score");
    assert.equal(champVisible(score, { contexte: "entrainement" }), false);
    assert.equal(champVisible(score, { contexte: "competition" }), true);
  });

  test("nettoyage : option inconnue, nombre hors bornes et champ caché retirés", () => {
    const d = nettoyerDetails(activiteParId("tennis"), { contexte: "match", resultat: "victoire", score: " 6-4 6-3 ", pirate: 1 });
    assert.deepEqual(d, { contexte: "match", resultat: "victoire", score: "6-4 6-3" });
    assert.deepEqual(nettoyerDetails(activiteParId("tennis"), { contexte: "entrainement", score: "6-0" }), { contexte: "entrainement" });
    assert.deepEqual(nettoyerDetails(activiteParId("velo"), { puissance: 5000, cadence: 90 }), { cadence: 90 });
  });

  test("natation : distance depuis les longueurs ; rameur : allure /500 m", () => {
    assert.equal(distanceNatation({ bassin: "25", longueurs: 40 }), 1);
    const s = seanceActivite({ id: "natation", duree: 30, details: { nage: "crawl", bassin: "25", longueurs: 40 } }, { date: "2026-10-22" });
    assert.equal(s.activite.distanceKm, 1);
    assert.equal(allure({ id: "rameur", distanceKm: 2, duree: 8 }), "2'00 /500 m");
  });

  test("résumé lisible", () => {
    assert.equal(resumeDetails({ id: "course", details: { type: "fractionne", structure: "10 × 400 m" } }), "Fractionné · 10 × 400 m");
    assert.equal(resumeDetails({ id: "padel", details: { contexte: "competition", resultat: "victoire", score: "6-4 6-3" } }), "Compétition · Victoire 6-4 6-3");
    assert.equal(resumeDetails({ id: "boxe", details: { contexte: "sparring", rounds: 5, dureeRound: 3 } }), "Sparring · 5 rounds × 3 min");
    assert.equal(resumeDetails({ id: "course", details: {} }), "");
  });
});

describe("mes sports", () => {
  const S = [
    seanceActivite({ id: "course", duree: 50, distanceKm: 10 }, { date: "2026-10-20" }),
    seanceActivite({ id: "course", duree: 24, distanceKm: 5 }, { date: "2026-10-15" }),
    seanceActivite({ id: "course", duree: 130, distanceKm: 21.1, denivele: 300 }, { date: "2026-08-01" }),
    seanceActivite({ id: "padel", duree: 90 }, { date: "2026-10-21" }),
    { date: "2026-10-19", durationMin: 60, exercises: [{ name: "Squat" }] }
  ];

  test("répartition sur 30 jours, musculation comprise", () => {
    const r = repartitionSports(S, "2026-10-22", 30);
    assert.deepEqual(r.map((x) => [x.id, x.minutes, x.seances]), [["padel", 90, 1], ["course", 74, 2], ["musculation", 60, 1]]);
    assert.equal(r.find((x) => x.id === "course").km, 15);
  });

  test("records : distance, dénivelé, durée, meilleures allures", () => {
    const course = recordsSports(S).find((x) => x.id === "course");
    assert.equal(course.records.distance.valeur, 21.1);
    assert.equal(course.records.denivele.valeur, 300);
    assert.equal(course.records.duree.valeur, 130);
    assert.equal(course.records.allure5.date, "2026-10-15", "4'48 /km sur 5 km");
    assert.equal(course.records.allure10.date, "2026-10-20", "5'00 /km sur 10 km");
    assert.equal(course.seances, 3);
  });
});
