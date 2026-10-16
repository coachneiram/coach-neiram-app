/**
 * Bilan hebdomadaire : programme et creneaux (audit P0-2, 17 octobre 2026).
 *
 * Cause demontree : bilanPlanSemaine et bilanSemaine produisent
 * { prevus, faits, manques } et { prevus, honores, manques, decales } ;
 * bilan-ia.js et bilan-html.js lisaient planned, done, honored, missed.
 * Les anciens tests fabriquaient des resumes avec ces faux noms, d'ou
 * l'absence d'alerte.
 *
 * Ici, les resumes viennent des VRAIS producteurs : bilanHebdomadaire sur
 * des donnees de semaine, puis le prompt IA et le fichier du coach.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { bilanHebdomadaire } from "../app/src/lib/bilan.js";
import { bilanPlanSemaine } from "../app/src/lib/plan-semaine.js";
import { bilanSemaine } from "../app/src/lib/creneaux.js";
import { promptBilanHebdo } from "../app/src/lib/bilan-ia.js";
import { construireBilanHTML } from "../app/src/lib/bilan-html.js";
import { lireResumeCreneaux, lireResumeProgramme, texteCreneaux, texteProgramme } from "../app/src/lib/resumes-bilan.js";

// Semaine passee : le bilan la juge a sa fin, sans dependre du jour du test.
const LUNDI = "2026-09-07";
const jour = (k) => `2026-09-${String(7 + k).padStart(2, "0")}`;
const ROUTINES = [{ id: "r1", name: "Haut du corps" }, { id: "r2", name: "Bas du corps" }, { id: "r3", name: "Full body" }];
const PLAN = { mon: "r1", wed: "r2", fri: "r3" };
const CRENEAUX = [
  { id: "c1", day: "mon", time: "18:00" },
  { id: "c2", day: "wed", time: "18:00" },
  { id: "c3", day: "fri", time: "18:00" }
];
const PROFIL = { name: "Test", goal: "perte", dietType: "aucun", allergies: [], weeklyWorkoutTarget: 3, targetSleepHours: 8, slots: CRENEAUX };
const CIBLES = { calories: 2000, protein: 150, carbs: 200, fat: 60 };
const seance = (k, routineId, extra = {}) => ({ id: "s" + k + routineId, date: jour(k), routineId, durationMin: 45, rpe: 7, exercises: [], ...extra });
const vide = { sessions: [], dailyForm: [], bodyLogs: [], logEntries: [], measurements: [], weekPlan: null, routines: [], hardWeeks: {} };

const semaine = (donnees, profil = PROFIL) => bilanHebdomadaire(LUNDI, { ...vide, ...donnees }, profil, CIBLES);
const prompt = (s) => promptBilanHebdo({ weekStats: s, lastWeekStats: null, profile: PROFIL, lastActionsText: null });
const html = (s) => construireBilanHTML({ profile: PROFIL, weekStats: s, report: null, photos: null, targets: CIBLES });

describe("Les vrais resumes arrivent dans le prompt et dans le fichier du coach", () => {
  test("3 seances prevues, 2 faites, 1 creneau manque", () => {
    const s = semaine({ weekPlan: PLAN, routines: ROUTINES, sessions: [seance(0, "r1"), seance(2, "r2")] });
    assert.deepEqual(s.planSummary, { prevus: 3, faits: 2, manques: 1, restants: 0 }, "schema du producteur");
    const p = prompt(s);
    assert.match(p, /Séances : 2 \(programme : 2\/3 respectées, 1 manquée\)/);
    assert.match(p, /Créneaux du profil : 2\/3 tenus, 1 manqué\(s\)/);
    assert.match(p, /Des créneaux ont été manqués/);
    const h = html(s);
    assert.match(h, />2 \(2\/3 programmées\)</);
    assert.match(h, />2\/3 · 1 manqué</);
  });

  test("aucune seance realisee : un vrai zero, affiche comme tel", () => {
    const s = semaine({ weekPlan: PLAN, routines: ROUTINES, sessions: [] });
    assert.match(prompt(s), /Séances : 0 \(programme : 0\/3 respectées, 3 manquées\)/);
    assert.match(prompt(s), /Créneaux du profil : 0\/3 tenus, 3 manqué\(s\)/);
    assert.match(html(s), />0 \(0\/3 programmées\)</);
  });

  test("seances prevues mais pas encore passees : « à venir », jamais « manquées »", () => {
    const lignes = [
      { routine: { id: "r1" }, status: "done" },
      { routine: { id: "r2" }, status: "today" },
      { routine: { id: "r3" }, status: "todo" },
      { routine: null, status: "rest" }
    ];
    const r = bilanPlanSemaine(lignes);
    assert.equal(texteProgramme(r), "1/3 respectées, 2 à venir");
  });

  test("creneau rattrape un autre jour : compte comme tenu ET decale", () => {
    const s = semaine({ sessions: [seance(1, null, { slotId: "c1" }), seance(2, null)] }, PROFIL);
    const c = lireResumeCreneaux(s.slotSummary);
    assert.equal(c.decales, 1);
    assert.match(prompt(s), /Créneaux du profil : 2\/3 tenus, 1 manqué\(s\), 1 décalé\(s\)/);
    assert.match(html(s), />2\/3 · 1 manqué · 1 décalé</);
  });

  test("aucune donnee, ni programme ni creneau : rien n'est invente", () => {
    const s = semaine({}, { ...PROFIL, slots: [] });
    assert.equal(s.planSummary, null);
    assert.equal(s.slotSummary, null);
    const p = prompt(s);
    assert.match(p, /Séances : 0\n/);
    assert.match(p, /aucun programme planifié \(aucune séance ne compte comme manquée\)/);
    assert.ok(!/Créneaux du profil/.test(p));
    assert.ok(!/Des créneaux ont été manqués/.test(p));
    const h = html(s);
    assert.ok(!/programmées/.test(h));
    assert.ok(!/Créneaux tenus/.test(h));
  });
});

describe("Normalisation centralisee", () => {
  test("ancien schema (bilans enregistres par l'ancienne application) : meme lecture", () => {
    assert.deepEqual(lireResumeProgramme({ planned: 6, done: 5, missed: 1 }), { prevus: 6, faits: 5, manques: 1, restants: 0 });
    assert.deepEqual(lireResumeCreneaux({ planned: 3, honored: 2, missed: 1, shifted: 1, pct: 67 }), { prevus: 3, honores: 2, manques: 1, decales: 1, pct: 67 });
    assert.equal(texteProgramme({ planned: 6, done: 5, missed: 1 }), "5/6 respectées, 1 manquée");
    assert.equal(texteCreneaux({ planned: 3, honored: 3, missed: 0 }), "3/3 tenus");
  });

  test("le schema francais prime sur l'ancien", () => {
    assert.equal(lireResumeProgramme({ prevus: 2, planned: 9, faits: 1, done: 9, manques: 0 }).prevus, 2);
  });

  test("champ manquant ou illisible : null, jamais 0", () => {
    assert.deepEqual(lireResumeProgramme({ prevus: 3 }), { prevus: 3, faits: null, manques: null, restants: null });
    assert.equal(texteProgramme({ prevus: 3 }), null, "pas de « 0/3 » sans donnee");
    assert.equal(lireResumeCreneaux({ prevus: "trois", honores: -1 }).prevus, null);
    assert.equal(lireResumeCreneaux({ prevus: 3, honores: -1 }).honores, null);
    assert.equal(texteCreneaux({ prevus: 3 }), null);
  });

  test("resume absent ou mal forme : null", () => {
    for (const x of [null, undefined, "x", 3, []]) {
      assert.equal(lireResumeProgramme(x), null);
      assert.equal(lireResumeCreneaux(x), null);
    }
  });

  test("le resume reel des creneaux a bien les noms lus", () => {
    const r = bilanSemaine([{ status: "tenu" }, { status: "manque" }, { status: "decale" }, { status: "avant" }]);
    assert.deepEqual(lireResumeCreneaux(r), { prevus: 3, honores: 2, manques: 1, decales: 1, pct: 67 });
  });
});

describe("Garde-fou", () => {
  test("plus aucun consommateur ne lit les anciens noms directement", () => {
    const dossier = join(process.cwd(), "app", "src");
    const fichiers = [];
    const parcourir = (d) =>
      readdirSync(d, { withFileTypes: true }).forEach((f) =>
        f.isDirectory() ? parcourir(join(d, f.name)) : /\.(js|jsx)$/.test(f.name) && fichiers.push(join(d, f.name))
      );
    parcourir(dossier);
    // resumes-bilan.js est le seul endroit autorise a connaitre les deux schemas.
    const fautifs = fichiers.filter((f) => !f.endsWith("resumes-bilan.js")).filter((f) =>
      /(planSummary|slotSummary)\s*(\?\.|\.)\s*(planned|done|honored|missed|shifted)\b/.test(readFileSync(f, "utf8"))
    );
    assert.deepEqual(fautifs, []);
  });
});
