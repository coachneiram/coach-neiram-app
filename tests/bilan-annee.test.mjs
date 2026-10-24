/** « Mon année Neiram » (lib/bilan-annee.js), repris de l'app Neiram le 24/10/2026. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { anneeDuBilan, bilanAnnee, saisonDuBilan } from "../app/src/lib/bilan-annee.js";

test("année du bilan et saison de mise en avant", () => {
  assert.equal(anneeDuBilan("2027-01-10"), 2026, "en janvier : l'année écoulée");
  assert.equal(anneeDuBilan("2026-12-05"), 2026);
  assert.equal(anneeDuBilan("2026-10-24"), 2026);
  assert.deepEqual(["2026-12-01", "2027-01-31", "2026-11-30"].map(saisonDuBilan), [true, true, false]);
});

test("bilan : séances, sport favori, régularité, force, transformation, quotidien ; rien hors de l'année", () => {
  const seances = [
    { date: "2026-03-02", durationMin: 60, exercises: [{ name: "Squat", sets: "3", reps: "5", weight: "140", mode: "powerlifting" }] },
    { date: "2026-03-09", durationMin: 60, exercises: [{ name: "Squat", sets: "3", reps: "5", weight: "130" }] },
    { date: "2026-03-16", activite: { id: "course", label: "Course à pied", emoji: "🏃", duree: 50, distanceKm: 10 }, exercises: [] },
    { date: "2026-03-23", activite: { id: "course", label: "Course à pied", emoji: "🏃", duree: 100, distanceKm: 20 }, exercises: [] },
    { date: "2025-12-30", durationMin: 600, exercises: [] }
  ];
  const journal = [
    { date: "2026-05-01", steps: 10000, sleepHours: 7 },
    { date: "2026-05-02", steps: 6000, sleepHours: 8 }
  ];
  const corps = [
    { date: "2026-02-01", weightKg: 80, bodyFatPct: 20 },
    { date: "2026-06-01", weightKg: 77, bodyFatPct: 17 }
  ];
  const b = bilanAnnee({ annee: 2026, seances, journal, corps, profil: { sex: "homme", age: 30 }, maxis: {} });
  const par = Object.fromEntries(b.ecrans.map((e) => [e.id, e]));
  assert.equal(par.seances.valeur, "4 séances");
  assert.ok(par.seances.detail.includes("5 h d'entraînement"), par.seances.detail.join(" | "));
  assert.equal(par.sports.valeur, "Course à pied", "150 min de course contre 120 de musculation");
  assert.ok(par.sports.detail.includes("30 km parcourus"));
  assert.equal(par.regularite.valeur, "4 semaines d'affilée");
  assert.equal(par.force.valeur, "140 kg");
  assert.match(par.transformation.valeur, /de gras/);
  assert.match(par.quotidien.valeur, /^16\s000 pas$/);
  assert.equal(b.lignesStory.length, 4);
});

test("année vide : aucun écran", () => {
  assert.deepEqual(bilanAnnee({ annee: 2026 }).ecrans, []);
});

test("la carte ne dépend ni des badges, ni du palmarès, ni des partages de l'app Neiram", async () => {
  const { readFileSync } = await import("node:fs");
  for (const f of ["../app/src/lib/bilan-annee.js", "../app/src/ui/CarteBilanAnnee.jsx"]) {
    const source = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.doesNotMatch(source, /badges|palmares|partages\.js|SiPremium|usePremium/, f);
  }
  const ecran = readFileSync(new URL("../app/src/ecrans/Entrainements.jsx", import.meta.url), "utf8");
  const sports = ecran.slice(ecran.indexOf("const sports = ("), ecran.indexOf("const actionsActivite"));
  assert.match(sports, /<CarteCalendrier[\s\S]*<CarteBilanAnnee/, "à côté du calendrier");
});
