/** Changer ses habitudes ne réécrit pas les jours passés (signalé le 27/11/2026). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, todayISO } from "../app/src/lib/dates.js";
import { basculer, choisir, habitudesActives, normaliserHabitudes, serie, taux } from "../app/src/lib/habitudes.js";

const ids = (liste) => liste.map((h) => h.id).sort();
const auj = todayISO();
const hier = addDays(auj, -1);
const avantHier = addDays(auj, -2);

test("état d'avant le correctif : la liste actuelle vaut pour tous les jours", () => {
  const e = normaliserHabitudes({ choisies: ["eau-reveil", "coucher-fixe"], coches: {} });
  assert.deepEqual(ids(habitudesActives(e, avantHier)), ["coucher-fixe", "eau-reveil"]);
  assert.deepEqual(ids(habitudesActives(e)), ["coucher-fixe", "eau-reveil"]);
});

test("modifier ses habitudes aujourd'hui garde la liste d'avant sur les jours passés", () => {
  let e = normaliserHabitudes({ choisies: ["eau-reveil", "coucher-fixe", "lever-heure"], coches: {} });
  e = basculer(e, hier, "lever-heure");
  e = choisir(e, "lever-heure", false, auj);
  e = choisir(e, "lecture", true, auj);
  e = choisir(e, "pas-7000", true, auj);
  assert.deepEqual(ids(habitudesActives(e)), ["coucher-fixe", "eau-reveil", "lecture", "pas-7000"]);
  assert.deepEqual(ids(habitudesActives(e, auj)), ["coucher-fixe", "eau-reveil", "lecture", "pas-7000"]);
  assert.deepEqual(ids(habitudesActives(e, hier)), ["coucher-fixe", "eau-reveil", "lever-heure"]);
  assert.deepEqual(ids(habitudesActives(e, avantHier)), ["coucher-fixe", "eau-reveil", "lever-heure"]);
  // plusieurs changements le même jour : une seule entrée pour aujourd'hui
  assert.equal(e.historique.filter((h) => h.depuis === auj).length, 1);
  // les coches et séries d'avant restent intactes
  assert.ok((e.coches[hier] || []).includes("lever-heure"));
  assert.equal(serie(e, "lever-heure", hier).jours, 1);
  assert.ok(taux(e, "lever-heure", hier) > 0);
});

test("un jour passé montre aussi une habitude cochée ce jour-là", () => {
  let e = normaliserHabitudes({ choisies: ["eau-reveil"], coches: { [hier]: ["sans-soda"] } });
  assert.deepEqual(ids(habitudesActives(e, hier)), ["eau-reveil", "sans-soda"]);
  assert.deepEqual(ids(habitudesActives(e)), ["eau-reveil"]);
});

test("l'historique survit à la normalisation et ignore les entrées invalides", () => {
  let e = choisir(normaliserHabitudes({ choisies: ["eau-reveil"] }), "lecture", true, auj);
  const relu = normaliserHabitudes(JSON.parse(JSON.stringify({ ...e, historique: [...e.historique, { depuis: "n'importe", choisies: ["x"] }, null] })));
  assert.deepEqual(relu.historique, e.historique);
  assert.deepEqual(ids(habitudesActives(relu, hier)), ["eau-reveil"]);
});
