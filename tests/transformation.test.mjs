import { test } from "node:test";
import assert from "node:assert/strict";
import { transformation, statsTransformation, exclusionPerte } from "../app/src/lib/transformation.js";

const logs = [
  { date: "2026-08-01", weightKg: 90, bodyFatPct: 25, muscleKg: 36 },
  { date: "2026-08-15", weightKg: 89 },
  { date: "2026-10-20", weightKg: 85, bodyFatPct: 21, muscleKg: 37 }
];
const profil = { sex: "homme", age: 32, heightCm: 180 };

test("gras perdu en kg et en % du poids de départ ; muscle de la balance", () => {
  const t = transformation({ bodyLogs: logs, profil, debut: "2026-07-23", fin: "2026-10-20" });
  assert.equal(t.jours, 80);
  assert.deepEqual([t.gras.avantKg, t.gras.apresKg, t.gras.perduKg], [22.5, 17.9, 4.6]);
  assert.equal(t.gras.pct, 5.2);
  assert.equal(t.gras.plafonne, false);
  assert.deepEqual([t.muscle.prisKg, t.muscle.source], [1, "muscle"]);
  assert.equal(t.exclusionPerte, null);
});

test("garde-fous : perte plafonnée à 1 % du poids par semaine, muscle à 0,25 kg / semaine", () => {
  const vite = [
    { date: "2026-09-01", weightKg: 100, bodyFatPct: 30, muscleKg: 35 },
    { date: "2026-09-29", weightKg: 88, bodyFatPct: 25, muscleKg: 38 }
  ];
  const t = transformation({ bodyLogs: vite, profil, debut: "2026-08-01", fin: "2026-10-01" });
  assert.equal(t.gras.perduKg, 8);
  assert.equal(t.gras.compteKg, 4, "4 semaines × 1 % × 100 kg");
  assert.equal(t.gras.plafonne, true);
  assert.equal(t.muscle.compteKg, 1, "4 semaines × 0,25 kg");
  assert.equal(t.muscle.plafonne, true);
});

test("moins de 21 jours entre deux mesures : rien", () => {
  assert.equal(transformation({ bodyLogs: logs.slice(0, 2), profil, debut: "2026-07-01", fin: "2026-10-30" }), null);
});

test("exclus du classement de perte : mineur, grossesse, TCA, IMC < 18,5, gras trop bas", () => {
  assert.match(exclusionPerte({ age: 17 }), /18 ans/);
  assert.match(exclusionPerte({ situation: "allaitement" }), /allaitement/);
  assert.match(exclusionPerte({ contraintesSante: ["tca"] }), /trouble alimentaire/);
  assert.match(exclusionPerte({ heightCm: 175, sex: "femme" }, { poids: 55, gras: 20 }), /IMC/);
  assert.match(exclusionPerte({ heightCm: 165, sex: "femme" }, { poids: 58, gras: 14 }), /15 %/);
  const s = statsTransformation({ bodyLogs: logs, profil: { ...profil, contraintesSante: ["tca"] }, date: "2026-10-24" });
  assert.equal(s.gras_90, undefined, "pas de perte publiée");
  assert.equal(s.muscle_90, 1, "le muscle reste");
});

test("chiffres publiés : jamais le poids ni la masse grasse", () => {
  const s = statsTransformation({ bodyLogs: logs, profil, date: "2026-10-24" });
  assert.deepEqual(s, { gras_90: 5.2, muscle_90: 1, gras_an: 5.2, muscle_an: 1 });
});
