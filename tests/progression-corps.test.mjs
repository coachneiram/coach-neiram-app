/**
 * Progression du corps (poids et mensurations) depuis la premiere mesure.
 * Ajout du 6 octobre 2026 : voir app/src/lib/progression-corps.js.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  GRANDEURS_SUIVIES,
  fmtEcart,
  fmtValeur,
  pointsMiniCourbe,
  progressionCorps
} from "../app/src/lib/progression-corps.js";

const MESURES = [
  { id: "m2", date: "2026-09-10", taille: 92, hanches: 101, brasD: 33.5 },
  { id: "m1", date: "2026-08-12", taille: 96, hanches: 103, brasD: 34, poitrine: 100 },
  { id: "m3", date: "2026-10-05", taille: 90.5, hanches: 100, brasD: 33 }
];
const CORPS = [
  { date: "2026-08-12", weightKg: 88.2 },
  { date: "2026-09-01", weightKg: 86.9, sleepHours: 7 },
  { date: "2026-09-15", sleepHours: 6 },
  { date: "2026-10-05", weightKg: 85.4 }
];

const ligne = (p, id) => p.lignes.find((l) => l.id === id);

describe("progression depuis la premiere mesure", () => {
  test("le poids vient en premier, puis les neuf mensurations dans leur ordre", () => {
    assert.deepEqual(
      GRANDEURS_SUIVIES.map((g) => g.id),
      ["poids", "poitrine", "taille", "hanches", "brasD", "brasG", "cuisseD", "cuisseG", "molletD", "molletG"]
    );
    assert.equal(GRANDEURS_SUIVIES[0].unite, "kg");
    assert.ok(GRANDEURS_SUIVIES.slice(1).every((g) => g.unite === "cm"));
  });

  test("on compare la derniere valeur a la premiere, quel que soit l'ordre de saisie", () => {
    const p = progressionCorps({ mesures: MESURES, corps: CORPS, objectif: "perte" });
    const t = ligne(p, "taille");
    assert.equal(t.depart, 96);
    assert.equal(t.actuel, 90.5);
    assert.equal(t.ecart, -5.5);
    assert.equal(t.dateDepart, "2026-08-12");
    assert.equal(t.dateActuelle, "2026-10-05");
    assert.deepEqual(t.serie.map((s) => s.value), [96, 92, 90.5]);
  });

  test("le poids vient du journal corporel, sans les jours sans pesee", () => {
    const p = progressionCorps({ mesures: MESURES, corps: CORPS, objectif: "perte" });
    const poids = ligne(p, "poids");
    assert.deepEqual(poids.serie.map((s) => s.value), [88.2, 86.9, 85.4]);
    assert.equal(poids.ecart, -2.8);
  });

  test("une grandeur mesuree une seule fois n'a pas de ligne", () => {
    const p = progressionCorps({ mesures: MESURES, corps: CORPS, objectif: "perte" });
    assert.equal(ligne(p, "poitrine"), undefined);
    assert.equal(ligne(p, "cuisseD"), undefined);
  });

  test("deux saisies le meme jour : la derniere l'emporte", () => {
    const p = progressionCorps({
      mesures: [],
      corps: [{ date: "2026-09-01", weightKg: 80 }, { date: "2026-09-01", weightKg: 79 }, { date: "2026-09-08", weightKg: 78 }],
      objectif: "perte"
    });
    assert.deepEqual(ligne(p, "poids").serie.map((s) => s.value), [79, 78]);
  });

  test("jusquA ignore ce qui suit la fin de la periode", () => {
    const p = progressionCorps({ mesures: MESURES, corps: CORPS, objectif: "perte", jusquA: "2026-09-30" });
    assert.equal(ligne(p, "taille").actuel, 92);
    assert.equal(ligne(p, "poids").actuel, 86.9);
    assert.equal(p.nbPrises, 2);
  });

  test("sans donnees : aucune ligne, aucune phrase", () => {
    const p = progressionCorps({});
    assert.deepEqual(p.lignes, []);
    assert.equal(p.titre, null);
    assert.equal(p.depuis, null);
  });

  test("une valeur vide ou illisible est ignoree, pas lue comme zero", () => {
    const p = progressionCorps({
      mesures: [{ date: "2026-09-01", taille: 90 }, { date: "2026-09-08", taille: "" }, { date: "2026-09-15", taille: "abc" }],
      corps: [],
      objectif: "perte"
    });
    assert.equal(ligne(p, "taille"), undefined);
  });
});

describe("le bon sens depend de l'objectif", () => {
  test("en perte, la taille qui baisse est un progres, le bras qui baisse est neutre", () => {
    const p = progressionCorps({ mesures: MESURES, corps: CORPS, objectif: "perte" });
    assert.equal(ligne(p, "taille").sens, "bon");
    assert.equal(ligne(p, "poids").sens, "bon");
    assert.equal(ligne(p, "brasD").sens, "neutre");
  });

  test("en prise de masse, le bras qui baisse est un recul", () => {
    const p = progressionCorps({ mesures: MESURES, corps: CORPS, objectif: "prise" });
    assert.equal(ligne(p, "brasD").sens, "oppose");
    assert.equal(ligne(p, "poids").sens, "oppose");
    assert.equal(ligne(p, "taille").sens, "neutre");
  });

  test("en maintien ou performance, aucun ecart n'est qualifie", () => {
    for (const objectif of ["maintien", "performance", undefined]) {
      const p = progressionCorps({ mesures: MESURES, corps: CORPS, objectif });
      assert.ok(p.lignes.every((l) => l.sens === "neutre"), String(objectif));
    }
  });

  test("un ecart nul est neutre", () => {
    const p = progressionCorps({ mesures: [{ date: "2026-09-01", taille: 90 }, { date: "2026-09-08", taille: 90 }], objectif: "perte" });
    assert.equal(ligne(p, "taille").sens, "neutre");
  });
});

describe("la phrase qui motive", () => {
  test("perte : centimetres des tours qui comptent, plus les kilos", () => {
    const p = progressionCorps({ mesures: MESURES, corps: CORPS, objectif: "perte" });
    // taille −5,5 et hanches −3 ; le bras ne compte pas en perte.
    assert.equal(p.titre, "−8,5 cm au total et −2,8 kg depuis le 12 août 2026. Continue, ça se voit !");
  });

  test("prise : seuls les gains sont celebres", () => {
    const p = progressionCorps({
      mesures: [{ date: "2026-08-01", brasD: 35, brasG: 34.5, taille: 82 }, { date: "2026-09-26", brasD: 36.5, brasG: 35.5, taille: 83 }],
      corps: [{ date: "2026-08-01", weightKg: 70 }, { date: "2026-09-26", weightKg: 72.4 }],
      objectif: "prise"
    });
    assert.equal(p.titre, "+2,5 cm au total et +2,4 kg depuis le 01 août 2026. Continue, ça se voit !");
  });

  test("un recul n'est jamais celebre : la phrase encourage sans mentir", () => {
    const p = progressionCorps({
      mesures: [{ date: "2026-09-01", taille: 90 }, { date: "2026-09-15", taille: 91 }],
      corps: [{ date: "2026-09-01", weightKg: 80 }, { date: "2026-09-15", weightKg: 81 }],
      objectif: "perte"
    });
    assert.ok(!/au total|kg depuis/.test(p.titre), p.titre);
    assert.equal(p.titre, "2 mesures depuis le 01 septembre 2026 : chaque prise rend ta progression plus lisible. Continue !");
  });

  test("perte : les kilos seuls suffisent, sans centimetres", () => {
    const p = progressionCorps({ corps: [{ date: "2026-09-01", weightKg: 80 }, { date: "2026-09-29", weightKg: 78.6 }], objectif: "perte" });
    assert.equal(p.titre, "−1,4 kg depuis le 01 septembre 2026. Continue, ça se voit !");
  });

  test("maintien : un poids stable est un objectif tenu", () => {
    const p = progressionCorps({ corps: [{ date: "2026-09-01", weightKg: 80 }, { date: "2026-09-29", weightKg: 80.6 }], objectif: "maintien" });
    assert.equal(p.titre, "Poids stable (+0,6 kg) depuis le 01 septembre 2026 : objectif tenu.");
  });

  test("le nombre de mesures annonce compte les prises", () => {
    const p = progressionCorps({ mesures: MESURES, corps: [], objectif: "performance" });
    assert.match(p.titre, /^3 mesures depuis le 12 août 2026/);
  });
});

describe("cas limites", () => {
  test("une prise le dernier jour de la periode compte", () => {
    const p = progressionCorps({ mesures: MESURES, corps: CORPS, objectif: "perte", jusquA: "2026-10-05" });
    assert.equal(ligne(p, "taille").actuel, 90.5);
  });

  test("la date de depart est la plus ancienne, poids ou mesure", () => {
    const p = progressionCorps({
      mesures: [{ date: "2026-08-01", taille: 90 }, { date: "2026-09-01", taille: 88 }],
      corps: [{ date: "2026-08-15", weightKg: 80 }, { date: "2026-09-01", weightKg: 79 }],
      objectif: "perte"
    });
    assert.equal(p.depuis, "2026-08-01");
  });

  test("maintien : au-dela d'un kilo, le poids n'est plus dit stable", () => {
    const corps = (fin) => [{ date: "2026-09-01", weightKg: 80 }, { date: "2026-09-29", weightKg: fin }];
    assert.match(progressionCorps({ corps: corps(81), objectif: "maintien" }).titre, /^Poids stable \(\+1 kg\)/);
    assert.match(progressionCorps({ corps: corps(81.5), objectif: "maintien" }).titre, /^2 mesures depuis/);
  });

  test("les pesees comptent dans le nombre de mesures", () => {
    const corps = ["2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22"].map((date, i) => ({ date, weightKg: 80 + i }));
    assert.match(progressionCorps({ corps, objectif: "performance" }).titre, /^4 mesures depuis le 01 septembre 2026/);
  });
});

describe("formats", () => {
  test("ecarts a la francaise, signe explicite", () => {
    assert.equal(fmtEcart(-3.5), "−3,5");
    assert.equal(fmtEcart(1.25), "+1,3");
    assert.equal(fmtEcart(0), "0");
    assert.equal(fmtEcart(null), "");
    assert.equal(fmtValeur(84.5), "84,5");
    assert.equal(fmtValeur(90), "90");
  });

  test("mini-courbe : extremes aux bords, serie plate centree", () => {
    assert.equal(pointsMiniCourbe([10, 5, 0], 100, 28, 2), "2,2 50,14 98,26");
    assert.equal(pointsMiniCourbe([4, 4], 100, 28, 2), "2,14 98,14");
    assert.equal(pointsMiniCourbe([4]), "");
    assert.equal(pointsMiniCourbe([]), "");
  });
});

describe("la progression arrive dans le bilan envoye au coach", async () => {
  const { bilanHebdomadaire } = await import("../app/src/lib/bilan.js");
  const { construireBilanHTML } = await import("../app/src/lib/bilan-html.js");
  const donnees = {
    sessions: [],
    dailyForm: [],
    logEntries: [],
    bodyLogs: CORPS,
    measurements: MESURES
  };

  test("le bilan de la semaine s'arrete a la fin de la semaine", () => {
    // Semaine du 7 au 13 septembre : la prise du 5 octobre n'existe pas encore.
    const b = bilanHebdomadaire("2026-09-07", donnees, { goal: "perte", slots: [] }, { calories: 2000 });
    const taille = b.progressionCorps.lignes.find((l) => l.id === "taille");
    assert.equal(taille.actuel, 92);
    assert.equal(b.progressionCorps.depuis, "2026-08-12");
  });

  test("le document du coach montre la phrase, le tableau et les mini-courbes", () => {
    const b = bilanHebdomadaire("2026-10-05", donnees, { goal: "perte", slots: [] }, { calories: 2000 });
    const html = construireBilanHTML({ profile: { name: "Thomas", goal: "perte" }, weekStats: b, report: null, photos: null, targets: null });
    assert.match(html, /Progression depuis le 12 août 2026/);
    assert.match(html, /−8,5 cm au total et −2,8 kg depuis le 12 août 2026/);
    assert.match(html, /<td style="padding:6px">Taille<\/td><td[^>]*>96 cm<\/td><td[^>]*>90,5 cm<\/td><td[^>]*color:#4ADE80">−5,5<\/td>/);
    assert.equal((html.match(/<polyline /g) || []).length, b.progressionCorps.lignes.length);
  });

  test("sans mesure reprise, le document reste celui d'avant", () => {
    const vide = bilanHebdomadaire("2026-10-05", { ...donnees, bodyLogs: [], measurements: [] }, { goal: "perte", slots: [] }, null);
    const html = construireBilanHTML({ profile: { name: "Thomas", goal: "perte" }, weekStats: vide, report: null, photos: null, targets: null });
    const sans = construireBilanHTML({
      profile: { name: "Thomas", goal: "perte" },
      weekStats: { ...vide, progressionCorps: undefined },
      report: null,
      photos: null,
      targets: null
    });
    assert.ok(!html.includes("Progression depuis"));
    assert.equal(html.replace(/le \d{2}\/\d{2}\/\d{4}/, ""), sans.replace(/le \d{2}\/\d{2}\/\d{4}/, ""));
  });

  test("un texte saisi ne peut pas casser le document", () => {
    const p = progressionCorps({ mesures: MESURES, corps: CORPS, objectif: "perte" });
    p.titre = "<script>alert(1)</script>";
    const html = construireBilanHTML({
      profile: { name: "Thomas", goal: "perte" },
      weekStats: { weekKey: "2026-10-05", start: "2026-10-05", end: "2026-10-11", workoutsCount: 0, loggedDaysCount: 0, adherence: 0, progressionCorps: p },
      report: null,
      photos: null,
      targets: null
    });
    assert.ok(!html.includes("<script>alert"));
  });
});

describe("les ecrans sont branches", () => {
  const lire = (c) => readFileSync(new URL("../" + c, import.meta.url), "utf8");
  test("Mensurations recoit l'objectif et montre la progression, le poids compris", () => {
    assert.match(lire("app/src/App.jsx"), /<Mensurations api=\{measurementsApi\} bodyApi=\{bodyApi\} objectif=\{profil\?\.goal\} \/>/);
    const ecran = lire("app/src/ecrans/Mensurations.jsx");
    assert.match(ecran, /<ProgressionCorps progression=\{progression\}/);
    assert.match(ecran, /GRANDEURS_SUIVIES\.map\(\(f\) => \(\s*<option/);
  });
  test("Tendances montre la progression et l'evolution du mois", () => {
    const ecran = lire("app/src/ecrans/Tendances.jsx");
    assert.match(ecran, /<ProgressionCorps progression=\{progression\} \/>/);
    assert.match(ecran, /<EvolutionDuMois monthStats=\{monthStats\} \/>/);
  });
  test("le bilan de la semaine se recalcule quand une mesure change", () => {
    const app = lire("app/src/App.jsx");
    const bloc = app.slice(app.indexOf("const weekStats = useMemo"), app.indexOf("const monthStats"));
    assert.match(bloc, /measurements\]/);
  });
});
