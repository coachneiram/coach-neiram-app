/**
 * Le mot du coach : liste validee par le coach, une phrase par jour, et
 * choix selon la semaine du client (memes regles que les trophees).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CONTEXTES, PHRASES, contexteDuJour, motDuCoach } from "../app/src/lib/mot-du-coach.js";

// Jeudi 1er octobre 2026 : semaine en cours du lundi 28 septembre.
const AUJ = "2026-10-01";
const S = (...dates) => dates.map((date, i) => ({ id: "s" + i, date }));
const PROFIL = { weeklyWorkoutTarget: 2 };

describe("La liste", () => {
  test("25 phrases validees, lisibles sur un telephone", () => {
    assert.equal(PHRASES.length, 25);
    for (const p of PHRASES) {
      assert.ok(p.texte.length <= 120, `trop longue : ${p.texte}`);
      assert.ok(!/(^|[^-\p{L}])(vous|votre)\b/iu.test(p.texte), `vouvoiement : ${p.texte}`);
    }
  });

  test("chaque phrase a au moins un contexte connu, sans doublon", () => {
    for (const p of PHRASES) {
      assert.ok(p.contextes.length > 0, p.texte);
      for (const c of p.contextes) assert.ok(CONTEXTES.includes(c), `${c} : ${p.texte}`);
    }
    assert.equal(new Set(PHRASES.map((p) => p.texte)).size, PHRASES.length);
  });

  test("les phrases retirees ou corrigees a la relecture ne reviennent pas", () => {
    const tout = PHRASES.map((p) => p.texte).join("\n");
    assert.doesNotMatch(tout, /L'intensité que tu mettras/, "contredit le RPE 7 des debutants");
    assert.doesNotMatch(tout, /prouver que tu es le meilleur/);
    assert.doesNotMatch(tout, /harmonie/);
    assert.doesNotMatch(tout, /que la veille/);
  });

  test("semaine difficile : jamais une phrase qui contredit le joker", () => {
    const difficiles = PHRASES.filter((p) => p.contextes.includes("difficile")).map((p) => p.texte).join("\n");
    assert.doesNotMatch(difficiles, /Reculer devant l'effort/);
    assert.doesNotMatch(difficiles, /meilleur que la semaine dernière/);
    assert.match(difficiles, /20 minutes de maintien/);
  });
});

describe("Une phrase par jour", () => {
  test("la meme toute la journee, une autre le lendemain", () => {
    assert.equal(motDuCoach({ date: AUJ }), motDuCoach({ date: AUJ }));
    assert.notEqual(motDuCoach({ date: AUJ }).texte, motDuCoach({ date: "2026-10-02" }).texte);
  });

  test("toutes les phrases standard passent avant qu'une revienne", () => {
    const standard = PHRASES.filter((p) => p.contextes.includes("standard")).length;
    const vues = new Set();
    for (let k = 0; k < standard; k++) {
      const d = new Date(Date.UTC(2026, 9, 1 + k)).toISOString().slice(0, 10);
      vues.add(motDuCoach({ date: d }).texte);
    }
    assert.equal(vues.size, standard);
  });

  test("le contexte choisit dans la bonne liste", () => {
    for (const c of CONTEXTES) {
      for (let k = 0; k < 10; k++) {
        const d = new Date(Date.UTC(2026, 9, 1 + k)).toISOString().slice(0, 10);
        assert.ok(motDuCoach({ date: d, contexte: c }).contextes.includes(c));
      }
    }
  });
});

describe("La semaine du client", () => {
  test("semaine difficile declaree", () => {
    const c = contexteDuJour({
      seances: S("2026-09-21", "2026-09-23"),
      profil: PROFIL,
      semainesDifficiles: { "2026-09-28": { active: true } },
      date: AUJ
    });
    assert.equal(c, "difficile");
  });

  test("reprise apres une semaine non tenue", () => {
    assert.equal(contexteDuJour({ seances: S("2026-09-15", "2026-09-17", "2026-09-22"), profil: PROFIL, date: AUJ }), "reprise");
  });

  test("la reprise s'arrete des que la semaine en cours est tenue", () => {
    const seances = S("2026-09-15", "2026-09-17", "2026-09-22", "2026-09-28", "2026-09-30");
    assert.equal(contexteDuJour({ seances, profil: PROFIL, date: AUJ }), "standard");
  });

  test("client regulier et nouveau client : standard", () => {
    assert.equal(contexteDuJour({ seances: S("2026-09-22", "2026-09-24"), profil: PROFIL, date: AUJ }), "standard");
    assert.equal(contexteDuJour({ seances: [], profil: PROFIL, date: AUJ }), "standard");
  });
});
