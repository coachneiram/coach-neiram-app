/** Calendrier de l'annee (lib/calendrier.js). */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { basculerJour, grilleMois, meilleureAnnee, niveauCase, seancesParJour, statsAnnee } from "../app/src/lib/calendrier.js";
import { seanceActivite, semainesActivesOMS, sportsPratiques } from "../app/src/lib/activites.js";
import { ajouterTermine } from "../app/src/lib/programmes-sport.js";

const muscu = (date) => ({ id: "m" + date, date, exercises: [{ name: "Squat", mode: "muscu" }] });

describe("calendrier", () => {
  test("grille : octobre 2026 commence un jeudi (3 cases vides), 31 jours", () => {
    const g = grilleMois(2026, 9);
    assert.equal(g.filter((x) => x === null).length, 3);
    assert.equal(g.filter(Boolean).length, 31);
    assert.equal(g[3], "2026-10-01");
  });

  test("par jour et statistiques de l'année", () => {
    const S = [muscu("2026-01-05"), muscu("2026-01-06"), muscu("2026-01-13"), muscu("2026-01-13"), muscu("2026-03-02"), muscu("2025-12-31")];
    assert.deepEqual(seancesParJour(S, 2026), { "2026-01-05": 1, "2026-01-06": 1, "2026-01-13": 2, "2026-03-02": 1 });
    const st = statsAnnee(S, 2026, { objectifParSemaine: 3 });
    assert.equal(st.total, 5);
    assert.equal(st.joursActifs, 4);
    assert.equal(st.meilleurMois, 0);
    assert.equal(st.meilleureSerieSemaines, 2, "semaines du 5 et du 12 janvier");
    assert.equal(st.objectifAnnee, 156);
    assert.equal(niveauCase(0), 0);
    assert.equal(niveauCase(5), 3);
  });

  test("cocher : jour vide → pointage ; décocher un pointage ; jamais une vraie séance ni le futur", () => {
    assert.deepEqual(basculerJour([], "2026-10-20", "2026-10-23").ajouter, { date: "2026-10-20", pointage: true, exercises: [], durationMin: "", rpe: "", notes: "" });
    assert.deepEqual(basculerJour([{ id: "p", date: "2026-10-20", pointage: true }], "2026-10-20", "2026-10-23"), { retirer: ["p"] });
    assert.equal(basculerJour([muscu("2026-10-20")], "2026-10-20", "2026-10-23"), null);
    assert.equal(basculerJour([], "2026-10-24", "2026-10-23"), null);
  });

  test("meilleure année", () => {
    assert.equal(meilleureAnnee([muscu("2025-01-01"), muscu("2026-01-01"), muscu("2026-02-01")]), 2);
    assert.equal(meilleureAnnee([]), 0);
  });
});

// Badges d'entrainement : repris a l'etape 5 (badges), avec lib/badges.js.
