import { test } from "node:test";
import assert from "node:assert/strict";
import { arrondiCharge, disquesParCote, regrouper, seriesEchauffement } from "../app/src/lib/outils-barre.js";

test("disques par cote", () => {
  assert.deepEqual(disquesParCote(100).parCote, [25, 15]);
  assert.deepEqual(disquesParCote(142.5).parCote, [25, 25, 10, 1.25]);
  assert.equal(disquesParCote(142.5).reste, 0);
  assert.deepEqual(disquesParCote(60, 15).parCote, [20, 2.5]);
  assert.deepEqual(disquesParCote(20).parCote, []);
  const impossible = disquesParCote(101);
  assert.equal(impossible.total, 100);
  assert.equal(impossible.reste, 1);
  assert.deepEqual(disquesParCote(15).parCote, []);
  assert.deepEqual(regrouper([25, 25, 10]), [{ disque: 25, nombre: 2 }, { disque: 10, nombre: 1 }]);
});

test("echauffement : barre vide puis 40, 60, 80 %", () => {
  assert.deepEqual(seriesEchauffement(100), [
    { poids: 20, reps: 10 },
    { poids: 40, reps: 5 },
    { poids: 60, reps: 3 },
    { poids: 80, reps: 2 }
  ]);
  assert.deepEqual(seriesEchauffement(25), []);
  // Charge legere : pas de palier en double ni au-dessus de la charge.
  const leger = seriesEchauffement(40);
  assert.ok(leger.every((s, i) => s.poids < 40 && (i === 0 || s.poids > leger[i - 1].poids)));
  assert.equal(arrondiCharge(61.3), 62.5);
});
