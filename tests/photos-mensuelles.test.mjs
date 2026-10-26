/**
 * Photos du bilan mensuel (décision du coach du 26 octobre 2026) : les 3
 * photos du mois sont obligatoires pour générer le bilan, sauf exception
 * de santé ; chaque pose est comparée à celle du mois précédent.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const P = await import("../app/src/lib/photos-mensuelles.js");
const { photosMoisObligatoires } = await import("../app/src/lib/eligibilite-perte.js");

const sem = (lundi, poses) => ({ lundi, photos: Object.fromEntries(poses.map((p) => [p, `data:image/jpeg;base64,${p}-${lundi}`])) });
const TOUTES = ["face", "profil", "dos"];

/** Faux stockage local : clés et valeurs JSON. */
function fauxStockage(entrees) {
  const m = new Map(Object.entries(entrees).map(([k, v]) => [k, JSON.stringify(v)]));
  return { get length() { return m.size; }, key: (i) => [...m.keys()][i], getItem: (k) => (m.has(k) ? m.get(k) : null) };
}

describe("photos du mois et comparaison", () => {
  test("pose du mois : la plus récente ; comparée à la plus récente du mois d'avant", () => {
    const semaines = [sem("2026-09-07", TOUTES), sem("2026-09-21", TOUTES), sem("2026-10-05", TOUTES), sem("2026-10-19", ["face"])];
    const [face, profil, dos] = P.photosDuMois("2026-10", semaines);
    assert.equal(face.actuelle.lundi, "2026-10-19");
    assert.equal(face.precedente.lundi, "2026-09-21");
    assert.equal(profil.actuelle.lundi, "2026-10-05");
    assert.equal(dos.precedente.image, "data:image/jpeg;base64,dos-2026-09-21");
  });

  test("une semaine à cheval compte pour les deux mois, sans se comparer à elle-même", () => {
    // Lundi 27 octobre : la semaine touche novembre (1er et 2 novembre).
    const semaines = [sem("2026-10-06", TOUTES), sem("2026-10-27", TOUTES)];
    const nov = P.photosDuMois("2026-11", semaines);
    assert.equal(nov[0].actuelle.lundi, "2026-10-27");
    assert.equal(nov[0].precedente.lundi, "2026-10-06");
    const oct = P.photosDuMois("2026-10", semaines);
    assert.equal(oct[0].actuelle.lundi, "2026-10-27");
    assert.equal(oct[0].precedente, null, "rien avant octobre");
  });

  test("sans photo le mois d'avant : la plus récente d'avant ; jamais rien : null", () => {
    const semaines = [sem("2026-07-06", ["face"]), sem("2026-10-12", ["face"])];
    const [face, profil] = P.photosDuMois("2026-10", semaines);
    assert.equal(face.precedente.lundi, "2026-07-06");
    assert.equal(profil.actuelle, null);
    assert.equal(profil.precedente, null);
  });

  test("lecture du stockage : seules les clés de photos, triées", () => {
    const s = fauxStockage({ coach_photos_2026_x: null, "coach_photos_2026-10-12": { face: "a" }, "coach_photos_2026-09-07": { dos: "b" }, coach_profile: { name: "X" } });
    assert.deepEqual(P.semainesPhotographiees(s).map((x) => x.lundi), ["2026-09-07", "2026-10-12"]);
    assert.deepEqual(P.semainesPhotographiees(null), []);
  });
});

describe("obligatoires, sauf exception de santé", () => {
  const profil = { age: 34, sex: "homme", goal: "perte" };
  test("obligatoires par défaut, quel que soit l'objectif", () => {
    assert.equal(photosMoisObligatoires({ profil, reglages: {} }), true);
    assert.equal(photosMoisObligatoires({ profil: { ...profil, goal: "prise" }, reglages: {} }), true);
  });
  test("facultatives : moins de 18 ans, grossesse, allaitement, antécédent de trouble alimentaire", () => {
    assert.equal(photosMoisObligatoires({ profil: { ...profil, age: 16 }, reglages: {} }), false);
    assert.equal(photosMoisObligatoires({ profil, reglages: { situation: "enceinte_t1" } }), false);
    assert.equal(photosMoisObligatoires({ profil, reglages: { situation: "allaitement" } }), false);
    assert.equal(photosMoisObligatoires({ profil, reglages: { contraintesSante: ["tca"] } }), false);
  });
  test("état : bloqué seulement si obligatoires et incomplètes", () => {
    const incompletes = [sem("2026-10-12", ["face", "profil"])];
    const e = P.etatPhotosMois({ cleMois: "2026-10", profil, reglages: {}, semaines: incompletes });
    assert.deepEqual(e.manquantes, ["dos"]);
    assert.equal(e.bloque, true);
    assert.equal(P.etatPhotosMois({ cleMois: "2026-10", profil, reglages: { contraintesSante: ["tca"] }, semaines: incompletes }).bloque, false);
    assert.equal(P.etatPhotosMois({ cleMois: "2026-10", profil, reglages: {}, semaines: [sem("2026-10-12", TOUTES)] }).bloque, false);
  });
  test("textes : nombre de photos manquantes accordé", () => {
    assert.equal(P.TEXTES_PHOTOS_MOIS.manquantes(1), "Il manque 1 photo pour débloquer ton bilan mensuel.");
    assert.equal(P.TEXTES_PHOTOS_MOIS.manquantes(3), "Il manque 3 photos pour débloquer ton bilan mensuel.");
  });
});

describe("branchement", () => {
  test("Tendances bloque le bouton, App refuse aussi la génération", () => {
    const t = readFileSync(new URL("../app/src/ecrans/Tendances.jsx", import.meta.url), "utf8");
    assert.match(t, /<PhotosDuMois etat=\{photosMois\} onPrendre=\{onUploadPhoto\} \/>/);
    assert.match(t, /disabled=\{enGenerationMensuelle \|\| bloqueParPhotos\}/);
    const a = readFileSync(new URL("../app/src/App.jsx", import.meta.url), "utf8");
    assert.match(a, /\.bloque\) \{\s*setErreurGenerationMensuelle\(TEXTES_PHOTOS_MOIS\.bloque\);\s*return;/);
  });
});
