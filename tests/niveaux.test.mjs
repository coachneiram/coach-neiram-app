import { test } from "node:test";
import assert from "node:assert/strict";
import { categorieAgeFFForce, categorieIPF, niveauFFForce, pointsGL, rangNiveau } from "../app/src/lib/niveaux.js";
import { GRILLE_FFFORCE } from "../app/src/lib/grille-ffforce.js";

test("catégories IPF : bornes hautes incluses, -53/-43 réservées aux jeunes", () => {
  assert.equal(categorieIPF("homme", 83, 30), "83");
  assert.equal(categorieIPF("homme", 83.01, 30), "93");
  assert.equal(categorieIPF("homme", 125, 30), "120+");
  assert.equal(categorieIPF("homme", 52, 30), "59", "senior : pas de -53");
  assert.equal(categorieIPF("homme", 52, 20), "53");
  assert.equal(categorieIPF("femme", 42, 17), "43");
  assert.equal(categorieIPF("femme", 90, 45), "84+");
  assert.equal(categorieIPF("homme", null, 30), null);
});

test("âges FFForce 2026", () => {
  assert.deepEqual([16, 21, 30, 45, 55, 65, 72].map(categorieAgeFFForce), ["subjunior", "junior", "senior", "master1", "master2", "master3", "master4"]);
});

test("grille officielle : valeurs relevées dans le fichier FFForce", () => {
  // Senior/open homme -83 : N2 720, N1 740 ; femme -63 : N2 400, N1 440.
  assert.deepEqual(GRILLE_FFFORCE.FA.h.senior["83"].slice(3, 5), [720, 740]);
  assert.deepEqual(GRILLE_FFFORCE.FA.f.senior["63"].slice(3, 5), [400, 440]);
  // Master 1 homme -93 : N2 492,5, N1 580 ; junior femme -57 : 302,5 / 365.
  assert.deepEqual(GRILLE_FFFORCE.FA.h.master1["93"].slice(3, 5), [492.5, 580]);
  assert.deepEqual(GRILLE_FFFORCE.FA.f.junior["57"].slice(3, 5), [302.5, 365]);
  // Masters : pas de colonnes Europe / Monde.
  assert.deepEqual(GRILLE_FFFORCE.FA.h.master2["83"].slice(5), [null, null]);
});

test("niveau : 520 kg à 82 kg, senior homme", () => {
  const n = niveauFFForce({ sexe: "homme", age: 30, poids: 82, valeur: 520 });
  assert.equal(n.categorie, "83");
  assert.equal(n.atteint, null, "sous R3 (570) : départemental");
  assert.deepEqual(n.prochain, { id: "R3", libelle: "Régional 3", kg: 570, ecart: 50 });
  assert.equal(rangNiveau(n), 0);
  const n2 = niveauFFForce({ sexe: "homme", age: 30, poids: 82, valeur: 725 });
  assert.equal(n2.atteint.id, "N2");
  assert.equal(n2.prochain.ecart, 15);
  assert.equal(rangNiveau(n2), 4);
  assert.equal(n2.qualificationFrance, null, "senior : France Élite par le classement fédéral");
  const m = niveauFFForce({ sexe: "homme", age: 45, poids: 92, valeur: 600 });
  assert.equal(m.atteint.id, "N1");
  assert.equal(m.prochain, null, "masters : pas de niveau Europe/Monde dans la grille");
  assert.equal(m.qualificationFrance.kg, 580);
});

test("développé couché seul (DC)", () => {
  const n = niveauFFForce({ discipline: "DC", sexe: "femme", age: 28, poids: 60, valeur: 80 });
  assert.equal(n.categorie, "63");
  assert.ok(n.paliers.length >= 5);
});

test("points IPF GL : formule officielle", () => {
  // Coefficient homme classique a 83 kg : 100 / (A - B e^(-C.83)).
  const gl = pointsGL(740, 83, "homme");
  assert.ok(gl > 102 && gl < 103, String(gl));
  assert.ok(pointsGL(440, 63, "femme") > 90);
  assert.equal(pointsGL(500, 30, "homme"), null, "hors domaine de la formule");
});

import { categorieIWF, pointsSinclair, niveauFFHM, niveauCourse, rangFFA, scoreCourse, pointsNatation, niveauNatation, categorieAgeFFA } from "../app/src/lib/niveaux.js";

test("haltérophilie : catégories IWF 2026, Sinclair 2025-2028, séries FFHM", () => {
  assert.equal(categorieIWF("homme", 84), "85");
  assert.equal(categorieIWF("homme", 112), "110+");
  assert.equal(categorieIWF("femme", 60), "61");
  // Tables 2025-2028 : homme 60 kg -> 1,561115 ; femme 50 kg -> 1,510938.
  assert.equal(pointsSinclair(100, 60, "homme"), 156.11);
  assert.equal(pointsSinclair(100, 50, "femme"), 151.09);
  assert.equal(pointsSinclair(100, 210, "homme"), 100, "au-delà de b : coefficient 1");
  const n = niveauFFHM({ sexe: "homme", age: 30, poids: 84, valeur: 250 });
  assert.equal(n.categorie, "85");
  assert.equal(n.atteint.id, "HON");
  assert.deepEqual([n.prochain.id, n.prochain.ecart], ["NAT", 21]);
  assert.equal(n.qualificationFrance.id, "NAT");
});

test("course : barème FFA, minima France selon l'âge, % du record du monde", () => {
  // 10 km homme en 35:00 pile : R1 (35'00).
  const n = niveauCourse("course_10k", 2100, "homme", 30);
  assert.equal(n.atteint.id, "R1");
  assert.equal(n.prochain.id, "IR4");
  assert.equal(n.prochain.ecart, 45);
  assert.equal(n.minimaFrance.temps, 2055, "seniors : 34'15");
  assert.equal(n.minimaFrance.atteint, false);
  assert.equal(niveauCourse("course_10k", 2100, "homme", 41).minimaFrance.atteint, true, "M1 : 36'30");
  assert.equal(categorieAgeFFA(41), "M1");
  // Marathon femme en 5h30 : sous D7.
  const lent = niveauCourse("course_marathon", 19800, "femme", 30);
  assert.equal(lent.atteint, null);
  assert.equal(lent.prochain.id, "D7");
  assert.equal(rangFFA(n), 13);
  assert.equal(scoreCourse("course_10k", 3182, "homme"), 50, "26:31 / 53:02");
  assert.equal(scoreCourse("course_10k", 3452, "femme"), 50, "28:46 / 57:32");
});

test("natation : points World Aquatics et repères FFN", () => {
  assert.equal(pointsNatation("nat_50nl_50", 20.91, "homme"), 1000);
  assert.equal(pointsNatation("nat_100nl_25", 49.93 * 2, "femme"), 125);
  const n = niveauNatation("nat_50nl_50", 24, "homme");
  assert.deepEqual(n.reperes.map((r) => [r.id, r.atteint]), [["challenge", true], ["elite", false]]);
  assert.equal(niveauNatation("nat_50nl_25", 30, "homme").reperes.length, 0, "25 m : points seulement");
});
