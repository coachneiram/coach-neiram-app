/** Compléments (lib/complements.js), repris de l'app Neiram le 24/10/2026. */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { A_EVITER, COMPLEMENTS, complementsPour, disciplinePrincipale } from "../app/src/lib/complements.js";

const J = "2026-10-24";
const base = { sex: "homme", age: 30, goal: "prise", dietType: "aucun" };
const muscu = (date) => ({ date, exercises: [{ name: "Squat", mode: "muscu" }] });
// L'app coach n'a pas encore le module « Tous les sports » : une activité
// porte sa famille elle-même.
const course = (date) => ({ date, activite: { id: "course", famille: "endurance" }, exercises: [] });
const force = (date) => ({ date, exercises: [{ name: "Squat", mode: "powerlifting" }] });

describe("compléments", () => {
  test("chaque fiche : niveau, dose, précautions, source", () => {
    assert.equal(new Set(COMPLEMENTS.map((c) => c.id)).size, COMPLEMENTS.length);
    for (const c of COMPLEMENTS) {
      assert.match(c.niveau, /^[ABC]$/);
      assert.ok(c.dose && c.effet && c.precautions && c.source && c.pour.length, c.id);
    }
    assert.ok(A_EVITER.some((a) => /Ashwagandha/.test(a.nom)));
  });

  test("discipline déduite des 60 derniers jours", () => {
    assert.equal(disciplinePrincipale([muscu("2026-10-20"), muscu("2026-10-21"), course("2026-10-22")], J), "muscu");
    assert.equal(disciplinePrincipale([course("2026-10-20"), course("2026-10-21"), muscu("2026-06-01")], J), "endurance");
  });

  test("musculation : créatine et protéines en tête ; endurance : glucides et nitrates", () => {
    const m = complementsPour(base, { seances: [muscu("2026-10-20")], aujourdhui: J }).liste.map((c) => c.id);
    assert.ok(m.includes("creatine") && m.includes("proteines"));
    assert.ok(!m.includes("glucides-effort"));
    const e = complementsPour(base, { seances: [course("2026-10-20")], aujourdhui: J }).liste.map((c) => c.id);
    assert.ok(e.includes("glucides-effort") && e.includes("nitrate") && e.includes("cafeine"));
  });

  test("végétalien : B12 ; maladie rénale : ni créatine ni protéines en poudre", () => {
    assert.ok(complementsPour({ ...base, dietType: "vegetalien" }, { seances: [] }).liste.some((c) => c.id === "b12"));
    assert.ok(!complementsPour(base, { seances: [] }).liste.some((c) => c.id === "b12"));
    const r = complementsPour({ ...base, contraintesSante: ["renal"] }, { seances: [muscu("2026-10-20")], aujourdhui: J }).liste.map((c) => c.id);
    assert.ok(!r.includes("creatine") && !r.includes("proteines"));
  });

  test("moins de 18 ans : aliments du sport seulement ; grossesse : aucune recommandation", () => {
    const ado = complementsPour({ ...base, age: 16 }, { seances: [muscu("2026-10-20")], aujourdhui: J });
    assert.ok(ado.mineur);
    assert.deepEqual(ado.liste.map((c) => c.id).sort(), ["electrolytes", "glucides-effort", "proteines"]);
    assert.ok(complementsPour({ ...base, sex: "femme", situation: "enceinte-t2" }).bloque);
  });

  test("force athlétique d'après les exercices ; activité sans famille ignorée", () => {
    assert.equal(disciplinePrincipale([force("2026-10-20"), force("2026-10-21"), muscu("2026-10-22")], J), "force");
    assert.equal(disciplinePrincipale([{ date: "2026-10-20", activite: { id: "inconnue" }, exercises: [] }], J), null);
  });

  test("à éviter : chaque entrée a sa raison ; fiches A avant B", () => {
    for (const a of A_EVITER) assert.ok(a.nom && a.raison.length > 20, a.nom);
    const l = complementsPour(base, { seances: [muscu("2026-10-20")], aujourdhui: J }).liste.map((c) => c.niveau);
    assert.deepEqual([...l].sort(), l);
  });
});
