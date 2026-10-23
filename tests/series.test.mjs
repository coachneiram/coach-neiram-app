/**
 * Carnet d'entrainement : saisie serie par serie (22 octobre 2026).
 *
 * Ce qui doit tenir :
 * - une ANCIENNE seance (sans `series`) se lit, se resume et compte dans
 *   les records exactement comme avant, sans etre reecrite ;
 * - une seance notee serie par serie garde ses champs agreges a jour, pour
 *   tout ce qui les lit deja (progression de charge, plan de la semaine) ;
 * - records, progression et maxis comptent CHAQUE serie, pas la seule
 *   ligne agregee ;
 * - la seance suivante reprend les series, charge proposee posee sur les
 *   series lourdes seulement.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  aSeriesSaisies,
  avecSeries,
  CHOIX_REPOS,
  ecrireSeries,
  finaliserSeries,
  fmtChrono,
  fmtDuree,
  garderCharge,
  REPOS_PAR_DEFAUT,
  reposDe,
  resumeDerniereFois,
  serieDeReference,
  seriesDe,
  serieSuivante
} from "../app/src/lib/series.js";
import { derniereFois, preparerSeance, resumeExercice } from "../app/src/lib/constructeur-seances.js";
import { construireRecords, progressionParExercice } from "../app/src/lib/records.js";
import { meilleursMaxis } from "../app/src/lib/force.js";
import { completerSeance } from "../app/src/lib/dictee-saisie.js";

const ancien = { id: "e1", name: "Squat", mode: "muscu", sets: "3", reps: "8", weight: "60", rpe: "8" };
const S = (weight, reps, rpe = "") => ({ weight: String(weight), reps: String(reps), rpe: String(rpe) });

/** Exercice note serie par serie, champs agreges a jour. */
const enSeries = (base, series) => ({ ...base, ...avecSeries(series) });

describe("anciennes seances : lues sans etre converties", () => {
  test("3×8 @ 60 s'affiche en trois lignes, le RPE sur la derniere", () => {
    assert.deepEqual(seriesDe(ancien), [
      { weight: "60", reps: "8", rpe: "", fait: false },
      { weight: "60", reps: "8", rpe: "", fait: false },
      { weight: "60", reps: "8", rpe: "8", fait: false }
    ]);
  });

  test("relire les lignes deduites redonne exactement l'exercice d'origine", () => {
    const { series, ...agregats } = avecSeries(seriesDe(ancien));
    assert.equal(series.length, 3);
    assert.deepEqual(agregats, { sets: "3", reps: "8", weight: "60", rpe: "8" });
  });

  test("un exercice neuf (sans nombre de series) s'ouvre sur une ligne", () => {
    assert.equal(seriesDe({ name: "", mode: "muscu", sets: "", reps: "", weight: "" }).length, 1);
  });

  test("le cardio n'a pas de series", () => {
    assert.deepEqual(seriesDe({ mode: "cardio", durationMin: 20 }), []);
  });

  test("le resume d'un ancien exercice ne bouge pas", () => {
    assert.equal(resumeExercice(ancien), "3×8 @ 60 kg · RPE 8");
    assert.equal(aSeriesSaisies(ancien), false);
    assert.equal(finaliserSeries(ancien), ancien, "rien n'est reecrit a l'enregistrement");
  });
});

describe("champs agreges", () => {
  test("serie de reference : la plus lourde, a charge egale la derniere", () => {
    assert.deepEqual(serieDeReference([S(60, 8, 7), S(62.5, 8, 8), S(62.5, 6, 9), S(50, 10)]), S(62.5, 6, 9));
  });

  test("series differentes : charge, reps et RPE de la serie de reference", () => {
    const { series, ...agregats } = avecSeries([S(60, 8, 7), S(62.5, 8, 8), S(62.5, 6, 9)]);
    assert.deepEqual(agregats, { sets: "3", reps: "6", weight: "62.5", rpe: "9" });
  });

  test("une ligne vide ne compte pas comme une serie", () => {
    assert.equal(avecSeries([S(60, 8), { weight: "", reps: "", rpe: "" }]).sets, "1");
    assert.deepEqual(avecSeries([]), { series: [], sets: "", reps: "", weight: "", rpe: "" });
  });

  test("nouvelle serie : copie de la precedente, non cochee, sans RPE", () => {
    assert.deepEqual(serieSuivante([{ ...S(62.5, 6, 9), fait: true }]), { weight: "62.5", reps: "6", rpe: "", fait: false });
    assert.deepEqual(serieSuivante([]), { weight: "", reps: "", rpe: "", fait: false });
  });
});

describe("resume dans l'historique", () => {
  test("series differentes : ecrites une a une", () => {
    const ex = enSeries(ancien, [S(60, 8), S(62.5, 8), S(62.5, 6, 9)]);
    assert.equal(resumeExercice(ex), "60×8 · 62.5×8 · 62.5×6 kg · RPE 9");
  });

  test("series identiques : la notation d'avant", () => {
    const ex = enSeries(ancien, [S(60, 8), S(60, 8), S(60, 8, 8)]);
    assert.equal(resumeExercice(ex), "3×8 @ 60 kg · RPE 8");
  });

  test("poids de corps et secondes", () => {
    assert.equal(ecrireSeries([S("", 12), S("", 10), S(10, 8)], "pdc", "reps"), "12 · 10 · 8 (+10 kg) PDC");
    assert.equal(ecrireSeries([S("", 45), S("", 30)], "muscu", "sec"), "45 s · 30 s");
  });

  test("force : le type de serie reste en tete", () => {
    const ex = enSeries({ name: "Comp Squat", mode: "powerlifting", setType: "top" }, [S(100, 3, 8), S(105, 1, 9)]);
    assert.equal(resumeExercice(ex), "Top set — 100×3 · 105×1 kg · RPE 9");
  });

  test("« Dernière fois » : series et dernier RPE note", () => {
    assert.equal(resumeDerniereFois(enSeries(ancien, [S(60, 8, 7), S(62.5, 6, 9)])), "60×8 · 62.5×6 kg · RPE 9");
    assert.equal(resumeDerniereFois(ancien), "60×8 · 60×8 · 60×8 kg · RPE 8");
  });
});

describe("enregistrement", () => {
  test("lignes vides retirees, coches oubliees, agregats recalcules", () => {
    const ex = enSeries(ancien, [{ ...S(60, 8), fait: true }, { weight: "", reps: "", rpe: "" }, { ...S(65, 5, 9), fait: true }]);
    const fini = finaliserSeries(ex);
    assert.deepEqual(fini.series, [S(60, 8), S(65, 5, 9)]);
    assert.equal(fini.sets, "2");
    assert.equal(fini.weight, "65");
  });

  test("un RPE saisi seul n'est pas efface", () => {
    const fini = finaliserSeries(enSeries(ancien, [{ weight: "", reps: "", rpe: "7.5" }]));
    assert.equal(fini.series.length, 1);
    assert.equal(fini.rpe, "7.5");
  });

  test("toutes les lignes vides : l'exercice repasse sans series", () => {
    const fini = finaliserSeries(enSeries(ancien, [{ weight: "", reps: "", rpe: "" }]));
    assert.equal("series" in fini, false);
    assert.equal(fini.sets, "");
  });
});

describe("records, progression, maxis : chaque serie compte", () => {
  const seances = [
    { id: "a", date: "2026-10-01", exercises: [{ ...ancien }] },
    {
      id: "b",
      date: "2026-10-08",
      exercises: [enSeries(ancien, [S(60, 8), S(65, 6), S(70, 3, 9)])]
    }
  ];

  test("records : charge max de la serie la plus lourde, volume somme des series", () => {
    const [r] = construireRecords(seances);
    assert.equal(r.weight.value, 70);
    assert.equal(r.weight.reps, 3);
    // 60×8 + 65×6 + 70×3 = 480 + 390 + 210, sous le 3×8×60 = 1440 de la seance d'avant.
    assert.equal(r.volume.value, 1440);
    assert.equal(r.sessions, 2);
  });

  test("progression : derniere charge et volume reels", () => {
    const [p] = progressionParExercice(seances);
    assert.equal(p.weight, 70);
    assert.equal(p.volume, 1080);
    assert.equal(p.previousWeight, 60);
    assert.equal(p.isWeightPB, true);
    assert.equal(p.isVolumePB, false);
  });

  test("le meilleur 1RM vient de la meilleure serie, pas de la ligne agregee", () => {
    // Ligne agregee = la plus lourde, 105×1 @10 → 105 kg. Mais 100×5 @9
    // donne 100 / 0,837 = 119,5 kg : c'est elle qui compte.
    const ex = enSeries({ name: "Comp Squat", mode: "powerlifting" }, [S(100, 5, 9), S(105, 1, 10)]);
    assert.equal(ex.weight, "105");
    const maxis = meilleursMaxis([{ date: "2026-10-08", exercises: [ex] }]);
    assert.equal(maxis.squat.est, 119.5);
    assert.equal(maxis.squat.weight, 100);
    assert.equal(maxis.squat.reps, 5);
    assert.equal(construireRecords([{ date: "2026-10-08", exercises: [ex] }])[0].oneRM.value, 119.5);
  });

  test("ancien format : records d'avant, inchanges", () => {
    const [r] = construireRecords([seances[0]]);
    assert.equal(r.weight.value, 60);
    assert.equal(r.volume.value, 1440);
  });
});

describe("seance suivante", () => {
  const routine = { id: "r1", name: "Bas du corps" };

  test("series reprises, decochees, sans RPE ; la charge proposee sur les series lourdes", () => {
    const precedente = {
      id: "s1",
      date: "2026-10-08",
      routineId: "r1",
      exercises: [enSeries({ ...ancien, id: "x" }, [S(40, 10), S(60, 8), S(60, 8, 7)])]
    };
    const s = preparerSeance(routine, [precedente], "2026-10-15");
    const ex = s.exercises[0];
    // RPE 7 sur 60 kg : +2,5 % → 61,5 → arrondi a 62,5.
    assert.equal(ex.weight, "62.5");
    assert.deepEqual(ex.suggested.from, 60);
    assert.deepEqual(
      ex.series.map((x) => [x.weight, x.reps, x.rpe, x.fait]),
      [
        ["40", "10", "", false],
        ["62.5", "8", "", false],
        ["62.5", "8", "", false]
      ]
    );
    assert.equal(ex.rpe, "");

    // « Garder 60 » : les series lourdes reviennent a 60, l'echauffement ne bouge pas.
    const garde = { ...ex, ...garderCharge(ex) };
    assert.deepEqual(garde.series.map((x) => x.weight), ["40", "60", "60"]);
    assert.equal(garde.weight, "60");
    assert.equal(garde.suggested, null);
  });

  test("ancien format : preparation d'avant, sans series", () => {
    const s = preparerSeance(routine, [{ id: "s1", date: "2026-10-08", routineId: "r1", exercises: [{ ...ancien, rpe: "7" }] }]);
    assert.equal(s.exercises[0].weight, "62.5");
    assert.equal("series" in s.exercises[0], false);
    assert.deepEqual(garderCharge(s.exercises[0]), { weight: "60", suggested: null });
  });
});

describe("« Dernière fois »", () => {
  const seances = [
    { id: "a", date: "2026-10-01", exercises: [{ ...ancien, weight: "55" }] },
    { id: "b", date: "2026-10-08", exercises: [{ name: "squat ", mode: "muscu", sets: "3", reps: "8", weight: "60" }] },
    { id: "c", date: "2026-10-20", exercises: [{ name: "Squat", mode: "muscu", sets: "3", reps: "8", weight: "65" }] }
  ];

  test("la seance la plus recente avant celle en cours, nom compare sans casse", () => {
    const d = derniereFois(seances, "SQUAT", { id: null, date: "2026-10-15" });
    assert.equal(d.date, "2026-10-08");
    assert.equal(d.exercice.weight, "60");
  });

  test("la seance en cours ne se cite pas elle-meme", () => {
    assert.equal(derniereFois(seances, "Squat", { id: "c", date: "2026-10-20" }).date, "2026-10-08");
  });

  test("jamais fait : rien", () => {
    assert.equal(derniereFois(seances, "Fentes", { date: "2026-10-22" }), null);
    assert.equal(derniereFois(seances, "", {}), null);
  });
});

describe("dictee sur une seance notee serie par serie", () => {
  test("series dites : elles remplacent les series notees", () => {
    const seance = { exercises: [enSeries(ancien, [S(60, 8), S(62.5, 6)])], notes: "" };
    const r = completerSeance(seance, { exercices: [{ name: "Squat", sets: "4", reps: "5", weight: "70" }], notes: "" });
    assert.equal("series" in r.exercises[0], false);
    assert.equal(r.exercises[0].weight, "70");
  });

  test("seul le RPE dit : les series restent", () => {
    const seance = { exercises: [enSeries(ancien, [S(60, 8), S(62.5, 6)])], notes: "" };
    const r = completerSeance(seance, { exercices: [{ name: "Squat", rpe: "8" }], notes: "" });
    assert.equal(r.exercises[0].series.length, 2);
  });
});

describe("repos", () => {
  test("90 s par defaut, reglable par exercice", () => {
    assert.equal(REPOS_PAR_DEFAUT, 90);
    assert.ok(CHOIX_REPOS.includes(90));
    assert.equal(reposDe({}), 90);
    assert.equal(reposDe({ repos: 120 }), 120);
    assert.equal(reposDe({ repos: "" }), 90);
  });

  test("affichage des durees", () => {
    assert.equal(fmtDuree(45), "45 s");
    assert.equal(fmtDuree(90), "1 min 30");
    assert.equal(fmtDuree(120), "2 min");
    assert.equal(fmtChrono(65), "1:05");
    assert.equal(fmtChrono(0.2), "0:01");
    assert.equal(fmtChrono(-3), "0:00");
  });
});

describe("repos au-delà de 5 min, durée libre, chronomètre (23 octobre 2026)", async () => {
  const m = await import("../app/src/lib/series.js");

  test("le menu va jusqu'à 10 min", () => {
    assert.ok(m.CHOIX_REPOS.includes(360) && m.CHOIX_REPOS.includes(480) && m.CHOIX_REPOS.includes(600));
    assert.equal(m.fmtDuree(480), "8 min");
    assert.equal(m.fmtDuree(3900), "1 h 05");
  });

  test("« Autre durée… » : la durée en cours est gardée, puis n'importe quelle durée en minutes", () => {
    const c = m.choisirRepos({ repos: 120 }, m.CHOIX_AUTRE);
    assert.deepEqual(c, { repos: 120, reposLibre: true });
    assert.equal(m.valeurMenuRepos(c), "autre");
    assert.equal(m.reposDepuisMinutes("7"), 420);
    assert.equal(m.reposDepuisMinutes("6,5"), 390);
    assert.equal(m.reposDepuisMinutes("20"), 1200, "pas de plafond");
    assert.equal(m.reposDepuisMinutes(""), null);
    assert.equal(m.reposDepuisMinutes("0"), null);
    assert.equal(m.minutesDeRepos({ repos: 390 }), "6.5");
  });

  test("« Chronomètre » : repérable, et le repos chiffré retombe sur 90 s s'il le faut", () => {
    const c = m.choisirRepos({ repos: 120 }, m.REPOS_CHRONO);
    assert.deepEqual(c, { repos: "chrono", reposLibre: false });
    assert.equal(m.estChrono(c), true);
    assert.equal(m.valeurMenuRepos(c), "chrono");
    assert.equal(m.reposDe(c), 90);
    assert.equal(m.estChrono({ repos: 90 }), false);
  });

  test("revenir à une durée du menu efface la durée libre", () => {
    assert.deepEqual(m.choisirRepos({ repos: 420, reposLibre: true }, "180"), { repos: 180, reposLibre: false });
  });

  test("une durée hors menu (ancienne saisie) reste affichée dans le menu", () => {
    assert.ok(m.dureesMenuRepos({ repos: 200 }).includes(200));
    assert.equal(m.valeurMenuRepos({ repos: 200 }), "200");
  });

  test("affichage du chronomètre et des longs comptes à rebours", () => {
    assert.equal(m.fmtEcoule(65.9), "1:05");
    assert.equal(m.fmtChrono(3725), "1:02:05");
  });
});
