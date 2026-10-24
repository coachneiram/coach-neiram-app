/** L'école Neiram (lib/lecons.js, lib/lecons-contenu.js), reprise de l'app Neiram le 24/10/2026. */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { leconDuJour, LECONS, leconsFaites, normaliserLecons, repondre } from "../app/src/lib/lecons.js";

describe("école Neiram", () => {
  test("28 leçons complètes, jours 1 à 28, une seule bonne réponse valide", () => {
    assert.equal(LECONS.length, 28);
    assert.deepEqual(LECONS.map((l) => l.jour), Array.from({ length: 28 }, (_, i) => i + 1));
    for (const l of LECONS) {
      assert.equal(l.texte.length, 3, l.id);
      assert.equal(l.question.options.length, 3, l.id);
      assert.ok(l.question.bonne >= 0 && l.question.bonne < 3, l.id);
      assert.ok(l.aRetenir && l.action && l.source && l.titre, l.id);
    }
  });

  test("une nouvelle leçon par jour, la leçon faite reste affichée", () => {
    let e = null;
    assert.equal(leconDuJour(e, "2026-10-24").lecon.jour, 1);
    e = repondre(e, LECONS[0].id, 1, "2026-10-24");
    const memeJour = leconDuJour(e, "2026-10-24");
    assert.equal(memeJour.lecon.jour, 1);
    assert.ok(memeJour.faite);
    assert.equal(leconDuJour(e, "2026-10-25").lecon.jour, 2);
    assert.equal(leconsFaites(e), 1);
  });

  test("app coach : les 28 leçons sont incluses, sans verrou Premium", () => {
    for (const f of ["../app/src/lib/lecons.js", "../app/src/ui/CarteLecon.jsx"]) {
      const source = readFileSync(new URL(f, import.meta.url), "utf8");
      assert.doesNotMatch(source, /SiPremium|usePremium|fonctions-premium|estGratuite|GRATUIT/i, f);
    }
    let e = null;
    for (let i = 0; i < 28; i++) e = repondre(e, LECONS[i].id, 0, `2026-11-${String(i + 1).padStart(2, "0")}`);
    assert.equal(leconsFaites(e), 28);
    assert.ok(leconDuJour(e, "2026-12-30").termine, "programme terminé");
  });

  test("état abîmé : identifiants inconnus et réponses non entières ignorés", () => {
    const e = normaliserLecons({ faites: { inconnue: "2026-10-01", [LECONS[0].id]: "2026-10-01" }, reponses: { [LECONS[0].id]: "1" } });
    assert.deepEqual(Object.keys(e.faites), [LECONS[0].id]);
    assert.deepEqual(e.reponses, {});
  });
});
