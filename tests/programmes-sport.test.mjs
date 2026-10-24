/** Programmes guides (lib/programmes-sport.js). */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { activiteDeSeance, avancement, demarrer, marquerFaite, normaliserEtat, PROGRAMMES_SPORT, programmeParId, seancesDu, SEMAINES_GRATUITES } from "../app/src/lib/programmes-sport.js";
import { activiteParId, seanceActivite } from "../app/src/lib/activites.js";

describe("programmes guidés", () => {
  test("chaque programme : sport connu, semaines non vides, durées plausibles", () => {
    for (const p of PROGRAMMES_SPORT) {
      assert.ok(activiteParId(p.sport), p.id);
      assert.ok(p.semaines.length >= 6, p.id);
      for (const s of seancesDu(p)) {
        assert.ok(s.texte.length > 10, s.cle);
        assert.ok(s.duree >= 10 && s.duree <= 90, `${p.id} ${s.cle}`);
      }
    }
  });

  test("0 à 5 km : progression sans saut brutal de durée d'une semaine à l'autre", () => {
    const p = programmeParId("0-5km");
    const moyennes = p.semaines.map((sem) => sem.reduce((a, s) => a + s.duree, 0) / sem.length);
    for (let i = 1; i < moyennes.length; i++) assert.ok(moyennes[i] <= moyennes[i - 1] * 1.3, `semaine ${i + 1}`);
  });

  test("marche active : 150 min la dernière semaine (repère OMS)", () => {
    const der = programmeParId("marche-active").semaines.at(-1);
    assert.equal(der.reduce((a, s) => a + s.duree, 0), 150);
  });

  test("avancement : prochaine séance, gratuité des 2 premières semaines, fin", () => {
    let e = demarrer("0-5km", "2026-10-24");
    let a = avancement(e);
    assert.equal(a.prochaine.cle, "1-1");
    assert.ok(a.gratuite);
    for (const s of seancesDu(programmeParId("0-5km")).filter((x) => x.semaine <= SEMAINES_GRATUITES)) e = marquerFaite(e, s.cle);
    a = avancement(e);
    assert.equal(a.prochaine.cle, "3-1");
    assert.equal(a.gratuite, false);
    for (const s of seancesDu(programmeParId("0-5km"))) e = marquerFaite(e, s.cle);
    a = avancement(e);
    assert.ok(a.termine);
    assert.equal(a.pct, 100);
    assert.equal(marquerFaite(e, "1-1").faites.length, e.faites.length, "pas de doublon");
  });

  test("état invalide ignoré", () => {
    assert.equal(normaliserEtat({ id: "inconnu" }), null);
    assert.equal(avancement(null), null);
    assert.equal(demarrer("inconnu"), null);
  });

  test("la séance se note comme une activité, fractionné reconnu", () => {
    const p = programmeParId("0-5km");
    const a = activiteDeSeance(p, seancesDu(p)[0]);
    assert.equal(a.details.type, "fractionne");
    assert.match(a.details.structure, /^8 fois/);
    const s = seanceActivite(a, { date: "2026-10-24" });
    assert.equal(s.activite.details.type, "fractionne");
    assert.equal(activiteDeSeance(p, seancesDu(p).at(-1)).details.type, "footing");
  });
});
