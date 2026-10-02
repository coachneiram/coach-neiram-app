/**
 * Trophees et serie de semaines tenues.
 *
 * Ces tests verrouillent les regles : semaine tenue a l'objectif, joker de
 * la semaine difficile, semaine en cours qui ne casse jamais la serie,
 * meilleure serie conservee (un trophee ne se perd pas), paliers de
 * seances, message « ne jamais rater deux fois », et la remontee au coach.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PALIERS_ANCIENNETE,
  PALIERS_SEANCES,
  PALIERS_SEMAINES,
  debutDuSuivi,
  moisEcoules,
  tropheesAffiches,
  etatSemaine,
  messageSemaine,
  nouveauxTrophees,
  objectifHebdo,
  seriesSemaines,
  trophees
} from "../app/src/lib/trophees.js";
import { bilanHebdomadaire } from "../app/src/lib/bilan.js";
import { promptBilanHebdo } from "../app/src/lib/bilan-ia.js";

// Jeudi 1er octobre 2026 : semaine en cours du lundi 28 septembre.
const AUJ = "2026-10-01";
const S = (...dates) => dates.map((date, i) => ({ id: "s" + i, date }));
const PROFIL = { weeklyWorkoutTarget: 2 };

describe("Objectif et semaine tenue", () => {
  test("objectif du profil, 2 a defaut", () => {
    assert.equal(objectifHebdo({ weeklyWorkoutTarget: 3 }), 3);
    assert.equal(objectifHebdo({ sessionsPerWeek: 4 }), 4);
    assert.equal(objectifHebdo({}), 2);
    assert.equal(objectifHebdo(null), 2);
  });

  test("tenue a l'objectif, du lundi au dimanche inclus", () => {
    const e = etatSemaine({ seances: S("2026-09-21", "2026-09-27", "2026-09-28"), cleSemaine: "2026-09-21", objectif: 2 });
    assert.equal(e.faites, 2);
    assert.equal(e.tenue, true);
    assert.equal(e.joker, false);
  });

  test("joker : semaine difficile declaree, une seule seance suffit", () => {
    const difficiles = { "2026-09-21": { active: true, reason: "malade" } };
    const e = etatSemaine({ seances: S("2026-09-23"), cleSemaine: "2026-09-21", objectif: 3, semainesDifficiles: difficiles });
    assert.equal(e.tenue, true);
    assert.equal(e.joker, true);
    const vide = etatSemaine({ seances: [], cleSemaine: "2026-09-21", objectif: 3, semainesDifficiles: difficiles });
    assert.equal(vide.tenue, false, "le joker demande quand meme une seance");
    const inactive = etatSemaine({
      seances: S("2026-09-23"), cleSemaine: "2026-09-21", objectif: 3,
      semainesDifficiles: { "2026-09-21": { active: false } }
    });
    assert.equal(inactive.tenue, false);
  });
});

describe("Serie de semaines", () => {
  test("semaines terminees tenues d'affilee", () => {
    const s = seriesSemaines({
      seances: S("2026-09-08", "2026-09-10", "2026-09-15", "2026-09-17", "2026-09-22", "2026-09-24"),
      profil: PROFIL, date: AUJ
    });
    assert.equal(s.serie, 3);
    assert.equal(s.enCours.faites, 0);
  });

  test("la semaine en cours ne casse pas la serie, et s'y ajoute une fois tenue", () => {
    const base = S("2026-09-15", "2026-09-17", "2026-09-22", "2026-09-24");
    assert.equal(seriesSemaines({ seances: base, profil: PROFIL, date: AUJ }).serie, 2);
    const plus = [...base, ...S("2026-09-28", "2026-09-30")];
    assert.equal(seriesSemaines({ seances: plus, profil: PROFIL, date: AUJ }).serie, 3);
  });

  test("une semaine non tenue casse la serie ; la meilleure serie reste", () => {
    const seances = S(
      "2026-08-31", "2026-09-02", "2026-09-07", "2026-09-09", "2026-09-14", "2026-09-16", // 3 semaines tenues
      "2026-09-22" // semaine du 21 : 1/2
    );
    const s = seriesSemaines({ seances, profil: PROFIL, date: AUJ });
    assert.equal(s.serie, 0);
    assert.equal(s.meilleure, 3);
    assert.equal(s.semainePrecedente.tenue, false);
    assert.equal(s.aDejaCommence, true);
  });

  test("le joker garde la serie intacte", () => {
    const s = seriesSemaines({
      seances: S("2026-09-15", "2026-09-17", "2026-09-23"),
      profil: PROFIL,
      semainesDifficiles: { "2026-09-21": { active: true } },
      date: AUJ
    });
    assert.equal(s.serie, 2);
  });

  test("nouveau client : rien a reprocher", () => {
    const s = seriesSemaines({ seances: S(AUJ), profil: PROFIL, date: AUJ });
    assert.equal(s.aDejaCommence, false);
    assert.equal(s.serie, 0);
  });
});

describe("Trophees", () => {
  test("paliers de seances et de semaines", () => {
    // Jusqu'a 1 000 depuis la demande du coach du 2 octobre 2026 (clients
    // suivis depuis 2022).
    assert.deepEqual(PALIERS_SEANCES.map((p) => p.n), [1, 10, 25, 50, 100, 200, 300, 500, 750, 1000]);
    assert.deepEqual(PALIERS_SEMAINES.map((p) => p.n), [2, 4, 8, 12, 26, 52]);
  });

  test("obtenus selon le total de seances passees, avec la progression", () => {
    const seances = S(...Array.from({ length: 12 }, (_, i) => `2026-09-${String(10 + i).padStart(2, "0")}`), "2026-12-01");
    const t = trophees({ seances, profil: PROFIL, date: AUJ });
    assert.equal(t.total, 12, "la seance du 1er decembre est dans le futur");
    const parId = Object.fromEntries(t.liste.map((x) => [x.id, x]));
    assert.equal(parId["seances-1"].obtenu, true);
    assert.equal(parId["seances-10"].obtenu, true);
    assert.equal(parId["seances-25"].obtenu, false);
    assert.equal(parId["seances-25"].progression, "12/25");
  });

  test("les trophees de semaines suivent la MEILLEURE serie : un trophee ne se perd pas", () => {
    const seances = S("2026-08-31", "2026-09-02", "2026-09-07", "2026-09-09", "2026-09-22");
    const t = trophees({ seances, profil: PROFIL, date: AUJ });
    const deux = t.liste.find((x) => x.id === "semaines-2");
    assert.equal(t.series.serie, 0);
    assert.equal(deux.obtenu, true);
  });

  test("nouveaux trophees : obtenus et pas encore vus", () => {
    const liste = [{ id: "a", obtenu: true }, { id: "b", obtenu: true }, { id: "c", obtenu: false }];
    assert.deepEqual(nouveauxTrophees(liste, ["a"]).map((t) => t.id), ["b"]);
    assert.deepEqual(nouveauxTrophees(liste, undefined).map((t) => t.id), ["a", "b"]);
  });
});

describe("Seances d'avant l'application et anciennete (demande du 2 octobre 2026)", () => {
  const app = S("2026-09-22", "2026-09-24", "2026-09-28", "2026-09-30");
  const ancien = { ...PROFIL, coachingStartDate: "2022-01-03", seancesAvantApp: 976 };

  test("paliers d'anciennete en mois", () => {
    assert.deepEqual(PALIERS_ANCIENNETE.map((p) => p.n), [1, 3, 6, 12, 24, 36, 60]);
  });

  test("les seances d'avant l'application comptent pour les paliers de seances", () => {
    const t = trophees({ seances: app, profil: ancien, date: AUJ });
    assert.equal(t.totalApp, 4);
    assert.equal(t.total, 980);
    const parId = Object.fromEntries(t.liste.map((x) => [x.id, x]));
    assert.equal(parId["seances-750"].obtenu, true);
    assert.equal(parId["seances-1000"].obtenu, false);
    assert.equal(parId["seances-1000"].progression, "980/1000");
  });

  test("anciennete depuis la date saisie : 3 janvier 2022 → 56 mois au 1er octobre 2026", () => {
    const t = trophees({ seances: app, profil: ancien, date: AUJ });
    assert.equal(t.mois, 56);
    const parId = Object.fromEntries(t.liste.map((x) => [x.id, x]));
    assert.equal(parId["anciennete-36"].obtenu, true);
    assert.equal(parId["anciennete-36"].detail, "Suivi depuis 3 ans");
    assert.equal(parId["anciennete-12"].detail, "Suivi depuis 1 an");
    assert.equal(parId["anciennete-6"].detail, "Suivi depuis 6 mois");
    assert.equal(parId["anciennete-60"].obtenu, false);
    assert.equal(parId["anciennete-60"].progression, "56/60 mois");
  });

  test("sans date saisie : anciennete depuis la premiere seance notee ; sans rien : aucune", () => {
    assert.equal(debutDuSuivi({ seances: app, profil: PROFIL, date: AUJ }), "2026-09-22");
    assert.equal(debutDuSuivi({ seances: S("2026-12-01"), profil: PROFIL, date: AUJ }), null, "seance future ignoree");
    const t = trophees({ seances: [], profil: PROFIL, date: AUJ });
    assert.ok(t.liste.filter((x) => x.famille === "anciennete").every((x) => !x.obtenu));
  });

  test("mois entiers : un mois commence le meme jour du mois suivant", () => {
    assert.equal(moisEcoules("2026-03-15", "2026-03-15"), 0);
    assert.equal(moisEcoules("2026-03-15", "2026-04-14"), 0);
    assert.equal(moisEcoules("2026-03-15", "2026-04-15"), 1);
    assert.equal(moisEcoules("2026-01-31", "2026-02-28"), 0);
    assert.equal(moisEcoules("2026-01-31", "2026-03-01"), 1);
    assert.equal(moisEcoules("2025-10-01", "2026-10-01"), 12);
    assert.equal(moisEcoules("2026-10-02", "2026-10-01"), 0, "jamais negatif");
  });

  test("affichage : par famille, les obtenus puis le seul prochain", () => {
    const t = trophees({ seances: app, profil: ancien, date: AUJ });
    const f = Object.fromEntries(tropheesAffiches(t.liste).map((x) => [x.id, x.tuiles.map((u) => u.id)]));
    assert.deepEqual(Object.keys(f), ["seances", "semaines", "anciennete"]);
    assert.deepEqual(f.seances.slice(-2), ["seances-750", "seances-1000"]);
    assert.equal(f.seances.length, 10);
    assert.deepEqual(f.anciennete, ["anciennete-1", "anciennete-3", "anciennete-6", "anciennete-12", "anciennete-24", "anciennete-36", "anciennete-60"]);
    const debutant = tropheesAffiches(trophees({ seances: [], profil: PROFIL, date: AUJ }).liste);
    assert.deepEqual(debutant.map((x) => x.tuiles.map((u) => u.id)), [["seances-1"], ["semaines-2"], ["anciennete-1"]]);
    const tout = tropheesAffiches([{ id: "x", famille: "seances", obtenu: true }]);
    assert.deepEqual(tout.map((x) => x.tuiles.map((u) => u.id)), [["x"]], "tout obtenu : pas de prochain, famille vide masquee");
  });

  test("l'ecran affiche les tuiles par famille", () => {
    const ecran = readFileSync(new URL("../app/src/ecrans/Trophees.jsx", import.meta.url), "utf8");
    assert.match(ecran, /tropheesAffiches\(etat\.liste\)\.map/);
    assert.match(ecran, /data-famille-trophees=\{famille\.id\}/);
    assert.doesNotMatch(ecran, /etat\.liste\.map\(/);
  });
});

describe("Message de la semaine", () => {
  const enCours = (faites, extra = {}) => ({ faites, objectif: 3, tenue: faites >= 3, joker: false, ...extra });

  test("ce qu'il reste pour prolonger la serie", () => {
    assert.equal(
      messageSemaine({ serie: 4, enCours: enCours(1), semainePrecedente: { tenue: true }, aDejaCommence: true }),
      "Encore 2 séances cette semaine pour porter ta série à 5 semaines."
    );
  });

  test("ne jamais rater deux fois, apres une semaine non tenue", () => {
    const m = messageSemaine({ serie: 0, enCours: enCours(0), semainePrecedente: { tenue: false, faites: 0 }, aDejaCommence: true });
    assert.match(m, /ne jamais rater deux semaines de suite/);
    assert.match(m, /Encore 3 séances/);
  });

  test("pas de reproche a un nouveau client", () => {
    const m = messageSemaine({ serie: 0, enCours: enCours(0), semainePrecedente: { tenue: false }, aDejaCommence: false });
    assert.equal(m, "Encore 3 séances cette semaine pour lancer ta série.");
  });

  test("semaine tenue, et semaine tenue grace au joker", () => {
    assert.match(messageSemaine({ serie: 5, enCours: enCours(3), aDejaCommence: true }), /Semaine tenue : 3\/3 séances. Ta série passe à 5 semaines/);
    assert.match(messageSemaine({ serie: 2, enCours: enCours(1, { tenue: true, joker: true }), aDejaCommence: true }), /séance maintien/);
  });
});

describe("Remontee au coach", () => {
  const donnees = (sessions) => ({
    sessions, dailyForm: [], bodyLogs: [], logEntries: [], measurements: [], weekPlan: null, routines: [], hardWeeks: {}
  });

  test("la serie figure dans le bilan de la semaine analysee", () => {
    const s = bilanHebdomadaire(
      "2026-09-21",
      donnees(S("2026-09-15", "2026-09-17", "2026-09-22", "2026-09-24")),
      PROFIL,
      { calories: 2000 }
    );
    assert.equal(s.weeklyStreak, 2);
    assert.equal(s.weeklyStreakBest, 2);
  });

  test("et dans le prompt du bilan IA ; absente, le prompt reste celui d'origine", () => {
    const semaine = {
      weekKey: "2026-09-21", start: "2026-09-21", end: "2026-09-27", hasAnyData: true, workoutsCount: 2,
      loggedDaysCount: 2, adherence: 80, painLines: [], sessionNotes: [], dayNotes: []
    };
    const profil = { goal: "perte", dietType: "aucun", allergies: [] };
    const p = (s) => promptBilanHebdo({ weekStats: s, lastWeekStats: null, profile: profil, lastActionsText: null });
    assert.match(p({ ...semaine, weeklyStreak: 4, weeklyStreakBest: 6 }), /Série : 4 semaine\(s\) d'affilée avec l'objectif de séances tenu \(record 6\)/);
    assert.doesNotMatch(p(semaine), /Série :/);
  });
});
