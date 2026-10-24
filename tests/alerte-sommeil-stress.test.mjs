/**
 * Alerte « sommeil et stress » envoyee au coach (24 octobre 2026).
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function installerStockage() {
  const d = new Map();
  globalThis.localStorage = {
    getItem: (k) => (d.has(k) ? d.get(k) : null),
    setItem: (k, v) => d.set(k, String(v)),
    removeItem: (k) => d.delete(k),
    get length() {
      return d.size;
    }
  };
}
installerStockage();

const { decisionAlerteSommeilStress, messageAlerteSommeilStress, RAPPEL_ALERTE_SOMMEIL_JOURS } = await import("../app/src/lib/alertes-coach.js");
const { verifierAlertesCoach } = await import("../app/src/lib/moteur-alertes.js");
const { CLES_ANNEXES, charger } = await import("../app/src/lib/stockage.js");

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (c) => readFileSync(join(ICI, "..", c), "utf8");
const J = 864e5;

describe("decision", () => {
  const t0 = new Date("2026-10-24T10:00:00Z");
  test("aucun signal : rien, et l'etat se remet a zero s'il y en avait un", () => {
    assert.equal(decisionAlerteSommeilStress({ maintenant: t0, signaux: {}, etat: {} }).alerter, false);
    assert.equal(decisionAlerteSommeilStress({ maintenant: t0, signaux: {}, etat: { signature: "stressDurable" } }).reinitialiser, true);
  });
  test("un signal neuf part ; le meme episode ne repart qu'au bout de 28 jours", () => {
    const signaux = { stressDurable: true };
    assert.equal(decisionAlerteSommeilStress({ maintenant: t0, signaux, etat: {} }).alerter, true);
    const etat = { signature: "stressDurable", lastAt: t0.toISOString(), delivered: true };
    assert.equal(decisionAlerteSommeilStress({ maintenant: new Date(t0.getTime() + 3 * J), signaux, etat }).alerter, false);
    assert.equal(decisionAlerteSommeilStress({ maintenant: new Date(t0.getTime() + RAPPEL_ALERTE_SOMMEIL_JOURS * J), signaux, etat }).alerter, true);
  });
  test("un nouveau signal ou un envoi rate repart tout de suite", () => {
    const etat = { signature: "stressDurable", lastAt: t0.toISOString(), delivered: true };
    assert.equal(decisionAlerteSommeilStress({ maintenant: t0, signaux: { stressDurable: true, nuitsDifficiles: true }, etat }).alerter, true);
    assert.equal(decisionAlerteSommeilStress({ maintenant: t0, signaux: { stressDurable: true }, etat: { ...etat, delivered: false } }).alerter, true);
  });
  test("message : ce qui est actif, sans chiffre de sante inutile", () => {
    assert.match(messageAlerteSommeilStress({ nuitsDifficiles: true }), /Nuits difficiles/);
    assert.match(messageAlerteSommeilStress({ stressDurable: true }), /Stress très élevé/);
  });
});

describe("moteur", () => {
  beforeEach(installerStockage);
  const stress = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${18 + i}`, stress: 9 }));
  const evaluer = (profile, envoyer, journal = stress) =>
    verifierAlertesCoach({
      profile,
      seances: [],
      justifications: {},
      journal,
      maintenant: new Date("2026-10-24T10:00:00Z"),
      aujourdhui: "2026-10-24",
      envoyer
    });

  test("client en ligne sans creneau : l'alerte part quand meme, une seule fois", async () => {
    const envois = [];
    const envoyer = async (p, e) => (envois.push(e), true);
    const PROFIL = { name: "Thomas", coachingMode: "enligne" };
    const r = await evaluer(PROFIL, envoyer);
    await evaluer(PROFIL, envoyer);
    assert.deepEqual(envois.map((e) => e.type), ["alerte_sommeil_stress"]);
    assert.match(envois[0].message, /Stress très élevé/);
    assert.equal(r.alertes[0].type, "alerte_sommeil_stress");
    assert.equal(charger(CLES_ANNEXES.alerteSommeil, {}).delivered, true);
  });

  test("presentiel : rien ne part", async () => {
    const envois = [];
    await evaluer({ name: "Léa", coachingMode: "presentiel" }, async (p, e) => (envois.push(e), true));
    assert.equal(envois.length, 0);
  });
});

describe("chaine", () => {
  test("le type est connu de l'appli, du proxy et du script Google, avec un mail dedie", () => {
    for (const f of ["app/src/lib/synchro-coach.js", "worker/coach-neiram-proxy.js"]) assert.ok(lire(f).includes('"alerte_sommeil_stress"'), f);
    const gs = lire("worker/coach-sync.gs");
    assert.ok(gs.includes("'alerte_sommeil_stress'"));
    assert.match(gs, /t === 'alerte_sommeil_stress'/);
  });
});
