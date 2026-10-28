/**
 * Cohérence des barèmes officiels (28 octobre 2026).
 *
 * Les grilles sont relevées à la main chaque saison. Ce test attrape les
 * fautes de relevé avant qu'elles n'atteignent un client : un seuil qui ne
 * monte pas, une colonne manquante, une catégorie oubliée, un minimum plus
 * lent chez les hommes que chez les femmes. Il tourne à chaque mise à jour
 * des données (docs/baremes-mise-a-jour.md).
 *
 * Il ne dit pas que les valeurs sont celles de la fédération : il dit
 * qu'elles sont cohérentes entre elles.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { GRILLE_FFFORCE, NIVEAUX_FFFORCE, SAISON_FFFORCE } = await import("../app/src/lib/grille-ffforce.js");
const G = await import("../app/src/lib/grilles-sports.js");
const { CATEGORIES_IPF } = await import("../app/src/lib/niveaux.js");

/** Valeurs non nulles strictement croissantes, nulles seulement en queue. */
function verifierSerie(valeurs, nom, longueur) {
  assert.equal(valeurs.length, longueur, `${nom} : ${longueur} valeurs attendues, ${valeurs.length} trouvées`);
  const premierNul = valeurs.indexOf(null);
  if (premierNul >= 0) assert.ok(valeurs.slice(premierNul).every((v) => v === null), `${nom} : une valeur manque au milieu de la série`);
  const reelles = valeurs.filter((v) => v != null);
  assert.ok(reelles.length >= 1, `${nom} : aucune valeur`);
  reelles.forEach((v, i) => {
    assert.ok(typeof v === "number" && Number.isFinite(v) && v > 0, `${nom} : valeur illisible (${v})`);
    if (i) assert.ok(v > reelles[i - 1], `${nom} : le seuil ${v} ne dépasse pas ${reelles[i - 1]}`);
  });
}

describe("FFForce : niveaux de force athlétique", () => {
  const classes = (sexe, jeune) => {
    const base = CATEGORIES_IPF[sexe].filter((c, i) => i > 0 || jeune).map(String);
    return [...base, String(CATEGORIES_IPF[sexe][CATEGORIES_IPF[sexe].length - 1]) + "+"];
  };

  test("sept niveaux par ligne, du plus bas au plus haut", () => {
    assert.equal(NIVEAUX_FFFORCE.length, 7);
    let lignes = 0;
    for (const [disc, sexes] of Object.entries(GRILLE_FFFORCE))
      for (const [sexe, ages] of Object.entries(sexes))
        for (const [age, cats] of Object.entries(ages))
          for (const [poids, seuils] of Object.entries(cats)) {
            verifierSerie(seuils, `FFForce ${disc} ${sexe} ${age} ${poids}`, 7);
            lignes++;
          }
    assert.equal(lignes, 232, `${lignes} lignes relevées (232 attendues : 2 épreuves x 2 sexes x 58 catégories)`);
  });

  test("toutes les catégories de poids de chaque sexe et de chaque âge, ni plus ni moins", () => {
    for (const [disc, sexes] of Object.entries(GRILLE_FFFORCE))
      for (const [sexe, ages] of Object.entries(sexes))
        for (const [age, cats] of Object.entries(ages)) {
          const jeune = age === "subjunior" || age === "junior";
          assert.deepEqual(Object.keys(cats).sort(), classes(sexe, jeune).sort(), `FFForce ${disc} ${sexe} ${age} : catégories de poids`);
        }
  });

  test("Europe et Monde absents seulement en masters et en développé couché subjunior", () => {
    for (const [disc, sexes] of Object.entries(GRILLE_FFFORCE))
      for (const [sexe, ages] of Object.entries(sexes))
        for (const [age, cats] of Object.entries(ages)) {
          const sansInternational = age.startsWith("master") || (disc === "DC" && age === "subjunior");
          for (const [poids, seuils] of Object.entries(cats)) {
            const nul = seuils[5] === null && seuils[6] === null;
            assert.equal(nul, sansInternational, `FFForce ${disc} ${sexe} ${age} ${poids} : colonnes Europe et Monde`);
          }
        }
  });

  test("la saison est renseignée", () => {
    assert.match(SAISON_FFFORCE, /^\d{4}-\d{4}/);
  });
});

describe("Haltérophilie : séries FFHM, catégories IWF, Sinclair", () => {
  test("huit séries par ligne, en hausse", () => {
    assert.equal(G.SERIES_FFHM.length, 8);
    for (const [sexe, ages] of Object.entries(G.GRILLE_FFHM))
      for (const [age, cats] of Object.entries(ages)) for (const [poids, seuils] of Object.entries(cats)) verifierSerie(seuils, `FFHM ${sexe} ${age} ${poids}`, 8);
  });

  test("seniors et U20 : exactement les catégories IWF en vigueur", () => {
    for (const sexe of ["h", "f"]) {
      const iwf = G.CATEGORIES_IWF[sexe];
      const attendues = [...iwf.map(String), String(iwf[iwf.length - 1]) + "+"].sort();
      for (const age of ["senior", "u20"]) assert.deepEqual(Object.keys(G.GRILLE_FFHM[sexe][age]).sort(), attendues, `FFHM ${sexe} ${age}`);
      assert.deepEqual([...iwf].sort((a, b) => a - b), iwf, "catégories IWF croissantes");
    }
  });

  test("constantes Sinclair positives", () => {
    for (const sexe of ["h", "f"]) {
      assert.ok(G.SINCLAIR[sexe].A > 0 && G.SINCLAIR[sexe].b > 0);
    }
  });
});

describe("Course à pied : barème FFA, minima des championnats de France, records", () => {
  const DISTANCES = ["course_5k", "course_10k", "course_semi", "course_marathon"];

  test("23 niveaux, de plus en plus lents", () => {
    assert.equal(G.NIVEAUX_FFA.length, 23);
    for (const sexe of ["h", "f"]) for (const d of DISTANCES) verifierSerie(G.BAREME_FFA[sexe][d], `FFA ${sexe} ${d}`, 23);
  });

  test("minima de France : deux temps positifs, hommes plus rapides que femmes", () => {
    for (const d of DISTANCES)
      for (const [cat, [h, f]] of Object.entries(G.MINIMA_FRANCE_COURSE[d])) {
        assert.ok(h > 0 && f > 0, `minima ${d} ${cat} : temps illisible`);
        assert.ok(h < f, `minima ${d} ${cat} : ${h} s (hommes) devrait être plus rapide que ${f} s (femmes)`);
      }
  });

  test("record du monde plus rapide que le meilleur niveau du barème", () => {
    for (const sexe of ["h", "f"]) for (const d of DISTANCES) assert.ok(G.RECORDS_ROUTE[sexe][d] < G.BAREME_FFA[sexe][d][0], `record ${sexe} ${d}`);
  });
});

describe("Natation : qualifications FFN et temps de base World Aquatics", () => {
  test("France Élite plus rapide que Challenge National, hommes plus rapides que femmes", () => {
    for (const id of Object.keys(G.QUALIF_FFN_50.elite)) {
      const [eh, ef] = G.QUALIF_FFN_50.elite[id];
      const [ch, cf] = G.QUALIF_FFN_50.challenge[id];
      assert.ok(eh < ch && ef < cf, `FFN ${id} : Élite doit être plus rapide que Challenge`);
      assert.ok(eh < ef && ch < cf, `FFN ${id} : hommes plus rapides que femmes`);
    }
  });

  test("temps de base : bassin de 25 m plus rapide que bassin de 50 m, hommes plus rapides que femmes", () => {
    for (const [id, base] of Object.entries(G.BASES_WORLD_AQUATICS)) {
      assert.ok(base.h > 0 && base.f > base.h, `base ${id}`);
      if (id.endsWith("_25")) {
        const autre = G.BASES_WORLD_AQUATICS[id.replace(/_25$/, "_50")];
        assert.ok(autre, `base ${id} : pas d'équivalent en 50 m`);
        assert.ok(base.h < autre.h && base.f < autre.f, `base ${id} : le 25 m devrait être plus rapide que le 50 m`);
      }
    }
  });
});
