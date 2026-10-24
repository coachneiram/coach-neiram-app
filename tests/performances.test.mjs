/**
 * Mes performances (repris de l'app Neiram, 24 octobre 2026) et leur
 * passage dans le bilan envoye au coach.
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { creerLocalStorage } from "./outils-neiram.mjs";

globalThis.localStorage = creerLocalStorage();
const perf = await import("../app/src/lib/performances.js");
const { lignesPerformancesBilan } = await import("../app/src/lib/performances-bilan.js");
const { construireBilanHTML } = await import("../app/src/lib/bilan-html.js");

beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

test("saisie des temps : formats acceptés, record du monde et fautes refusés", () => {
  assert.equal(perf.lireTemps("24:35"), 1475);
  assert.equal(perf.lireTemps("1:42:10"), 6130);
  assert.equal(perf.lireTemps("1h42'10"), 6130);
  assert.equal(perf.lireTemps("58,40"), 58.4);
  assert.equal(perf.lireTemps("24:75"), null);
  assert.equal(perf.valeurEpreuve("course_5k", "11:00"), null, "plus vite que le record du monde");
  assert.equal(perf.fmtTemps(6130), "1:42:10");
  assert.equal(perf.fmtTemps(26.84), "26,84");
});

test("une faute de frappe n'efface pas un record ; un champ vidé, si ; la clé entre dans la sauvegarde", () => {
  perf.enregistrerPerformance("course_10k", "45:00", { date: "2026-10-02" });
  perf.enregistrerPerformance("course_10k", "45:9x");
  assert.equal(perf.lirePerformances().course_10k.valeur, 2700);
  assert.ok(perf.CLE_PERFORMANCES.startsWith("cn_"));
  perf.enregistrerPerformance("course_10k", "");
  assert.equal(perf.lirePerformances().course_10k, undefined);
});

test("bilan au coach : force et niveau, course, transformation sur 90 jours", () => {
  const lignes = lignesPerformancesBilan({
    performances: { course_10k: { valeur: 2700, date: "2026-10-05" } },
    maxisForce: { squat: "180", bench: "120", deadlift: "220" },
    seances: [],
    profil: { sex: "homme", age: 30, heightCm: 180 },
    poidsKg: 82.4,
    bodyLogs: [
      { date: "2026-08-01", weightKg: 86, bodyFatPct: 20 },
      { date: "2026-10-20", weightKg: 83, bodyFatPct: 17 }
    ],
    date: "2026-10-24"
  });
  assert.match(lignes[0], /^Force athlétique : total 520 kg/);
  assert.match(lignes[0], /FFForce/);
  assert.match(lignes[0], /pts IPF GL/);
  assert.ok(lignes.some((l) => /^Course 10 km : 45:00 · FFA/.test(l)));
  assert.ok(lignes.some((l) => /^Transformation sur 80 jours : 3,1 kg de gras perdus/.test(l)), JSON.stringify(lignes));
});

test("rien de noté : aucune ligne, et le bilan HTML ne change pas", () => {
  assert.deepEqual(lignesPerformancesBilan({ date: "2026-10-24" }), []);
  const base = { profile: { name: "Thomas", goal: "perte" }, weekStats: { start: "2026-10-19", end: "2026-10-25", workoutsCount: 2, loggedDaysCount: 5, adherence: 80 }, report: null, photos: null, targets: null };
  const sans = construireBilanHTML(base);
  const avec = construireBilanHTML({ ...base, performances: ["Course 10 km : 45:00"] });
  assert.ok(!/Performances et transformation/.test(sans));
  assert.match(avec, /Performances et transformation/);
  assert.match(avec, /Course 10 km : 45:00/);
});
