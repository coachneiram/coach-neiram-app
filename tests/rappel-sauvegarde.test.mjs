/**
 * Rappel de sauvegarde du Journal (lib/rappel-sauvegarde.js).
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addDays } from "../app/src/lib/dates.js";
import {
  CLE_DERNIERE_SAUVEGARDE,
  CLE_RAPPEL_REPORTE,
  exportReussi,
  lireEtatSauvegarde,
  marquerSauvegarde,
  premierJourSuivi,
  rappelSauvegarde,
  reporterRappel,
  texteRappel
} from "../app/src/lib/rappel-sauvegarde.js";

const lire = (f) => readFileSync(new URL("../app/src/" + f, import.meta.url), "utf8");
function stockageMemoire() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

describe("quand rappeler de sauvegarder", () => {
  test("pas avant 14 jours de suivi : rien a perdre", () => {
    assert.equal(rappelSauvegarde({ aujourdhui: "2026-11-10", premierJour: "2026-10-30", derniere: null }), null);
    assert.equal(rappelSauvegarde({ aujourdhui: "2026-11-10", premierJour: null, derniere: null }), null);
  });

  test("jamais sauvegarde apres 14 jours : la carte s'affiche", () => {
    const r = rappelSauvegarde({ aujourdhui: "2026-11-13", premierJour: "2026-10-30", derniere: null });
    assert.deepEqual(r, { jamais: true, jours: null });
    assert.match(texteRappel(r), /uniquement sur ce téléphone/);
  });

  test("derniere sauvegarde : rien avant 30 jours, la carte a partir de 30", () => {
    const base = { aujourdhui: "2026-12-30", premierJour: "2026-09-01" };
    assert.equal(rappelSauvegarde({ ...base, derniere: "2026-12-01" }), null);
    const r = rappelSauvegarde({ ...base, derniere: "2026-11-30" });
    assert.deepEqual(r, { jamais: false, jours: 30 });
    assert.match(texteRappel(r), /date de 30 jours/);
  });

  test("« Plus tard » fait taire la carte 7 jours", () => {
    const st = stockageMemoire();
    reporterRappel(st, "2026-11-13", addDays);
    assert.equal(st.getItem(CLE_RAPPEL_REPORTE), "2026-11-20");
    const etat = lireEtatSauvegarde(st);
    const base = { premierJour: "2026-10-01", ...etat };
    assert.equal(rappelSauvegarde({ ...base, aujourdhui: "2026-11-19" }), null);
    assert.ok(rappelSauvegarde({ ...base, aujourdhui: "2026-11-20" }));
  });

  test("un export reussi remet le compteur a zero ; une feuille fermee, non", () => {
    assert.equal(exportReussi("shared"), true);
    assert.equal(exportReussi("downloaded"), true);
    assert.equal(exportReussi("cancelled"), false);
    const st = stockageMemoire();
    marquerSauvegarde(st, "2026-11-13");
    assert.equal(st.getItem(CLE_DERNIERE_SAUVEGARDE), "2026-11-13");
    assert.ok(CLE_DERNIERE_SAUVEGARDE.startsWith("neiram_"), "hors sauvegarde");
  });

  test("premier jour de suivi : la date la plus ancienne, toutes listes confondues", () => {
    assert.equal(
      premierJourSuivi([{ date: "2026-10-05" }], [{ date: "2026-10-02" }], null, [{ date: "pas une date" }, {}]),
      "2026-10-02"
    );
    assert.equal(premierJourSuivi([], undefined), null);
  });

  test("stockage casse : aucune erreur", () => {
    const casse = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
    assert.deepEqual(lireEtatSauvegarde(casse), { derniere: null, reporteJusquAu: null });
    assert.doesNotThrow(() => marquerSauvegarde(casse, "2026-11-13"));
  });

  test("branche dans le Journal (aujourd'hui) et dans l'export des Reglages", () => {
    assert.match(lire("ecrans/Journal.jsx"), /date === todayISO\(\) && \(\s*<CarteSauvegarde/);
    assert.match(lire("ecrans/Reglages.jsx"), /if \(exportReussi\(resultat\)\) marquerSauvegarde\(localStorage, todayISO\(\)\)/);
  });
});
