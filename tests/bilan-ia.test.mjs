/**
 * Les consignes envoyees au modele pour rediger un bilan.
 *
 * QUATRIEME REGRESSION DE LA BASCULE, trouvee en cherchant les props
 * declarees mais jamais fournies.
 *
 * Trois pannes empilees dans l'application deployee :
 *   1. « Generer le bilan mensuel » etait affiche et branche sur RIEN ;
 *   2. la generation du bilan hebdo n'avait jamais ete portee ;
 *   3. l'AFFICHAGE du bilan non plus — meme genere, le client ne l'aurait
 *      jamais vu, l'ecran Tendances ne savait pas le rendre.
 *
 * Le prompt est le coeur du produit : c'est ce qui fait qu'un bilan
 * ressemble a un coach et pas a un tableau. Il est donc compare CARACTERE
 * PAR CARACTERE a celui de l'application d'origine, en interceptant
 * l'appel reseau qu'elle emet.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chargerApp } from "./harness.mjs";
import {
  actionsPrecedentes,
  imagesDuBilan,
  ligneRegime,
  moisLong,
  promptBilanHebdo,
  promptBilanMensuel
} from "../app/src/lib/bilan-ia.js";
import { cleMoisPrecedent } from "../app/src/lib/semaine.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (c) => readFileSync(join(ICI, "..", c), "utf8");

/** Intercepte l'appel reseau de l'app d'origine et rend le prompt envoye. */
function promptLegacy(appel) {
  let capture = null;
  const app = chargerApp({
    fetch: async (url, init) => {
      capture = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: "RÉSUMÉ:\nok" }] } }] })
      };
    }
  });
  return appel(app).then(() => {
    const messages = capture.contents || capture.messages;
    const parts = messages[messages.length - 1].parts;
    return {
      texte: parts.filter((p) => p.text).map((p) => p.text).join("\n"),
      parts
    };
  });
}

const PROFIL = {
  name: "Sabine",
  goal: "perte",
  targetWeightKg: 66,
  dietType: "aucun",
  allergies: [],
  targetWaterL: 2,
  targetSteps: 8000
};

const SEMAINE = {
  weekKey: "2026-08-31",
  start: "2026-08-31",
  end: "2026-09-06",
  hasAnyData: true,
  workoutsCount: 6,
  planSummary: { planned: 6, done: 5, missed: 1 },
  slotSummary: { planned: 3, honored: 2, missed: 1 },
  avgSleepH: 7.2,
  avgSleepQuality: 4,
  latestWeight: 71.1,
  weightDelta: -0.4,
  latestFatPct: 28.4,
  fatPctDelta: -0.3,
  latestMuscle: 30.2,
  muscleDelta: 0.1,
  avgCalories: 1520,
  avgProtein: 118,
  avgCarbs: 140,
  avgFat: 52,
  avgSteps: 8420,
  avgWaterMl: 1750,
  avgEnergy: 4,
  avgStress: 5,
  loggedDaysCount: 7,
  adherence: 92,
  painLines: ["Genou droit, squat, 3/10"],
  sessionNotes: ["Bonne séance jambes"],
  dayNotes: ["Nuit courte mercredi"]
};

const SEMAINE_DURE = {
  ...SEMAINE,
  hardWeek: true,
  hardWeekReason: "Sommeil / fatigue",
  maintenanceCount: 2,
  painLines: [],
  slotSummary: { planned: 3, honored: 3, missed: 0 }
};

const MOIS = {
  monthKey: "2026-08",
  start: "2026-08-01",
  end: "2026-08-31",
  hasAnyData: true,
  workoutsCount: 22,
  workoutsPerWeek: 5.5,
  avgSleepH: 7.1,
  avgSleepQuality: 4,
  avgEnergy: 4,
  avgStress: 5,
  avgWaterMl: 1800,
  avgSteps: 8300,
  avgCalories: 1540,
  avgProtein: 120,
  avgCarbs: 145,
  avgFat: 53,
  loggedDaysCount: 28,
  latestWeight: 71.1,
  weightDelta: -1.2,
  latestFatPct: 28.4,
  fatPctDelta: -0.6,
  latestMuscle: 30.2,
  muscleDelta: 0.2,
  measureDeltas: [{ label: "Taille", base: 82, latest: 80.5, delta: -1.5 }]
};

const OBJECTIFS = { calories: 1800, protein: 130, carbs: 160, fat: 60 };

describe("parite du prompt hebdomadaire", () => {
  const cas = [
    { nom: "semaine complete avec douleurs et creneaux manques", weekStats: SEMAINE, lastWeekStats: { ...SEMAINE, workoutsCount: 4 } },
    { nom: "semaine declaree difficile", weekStats: SEMAINE_DURE, lastWeekStats: null },
    { nom: "premiere semaine, rien a comparer", weekStats: { ...SEMAINE, painLines: [], sessionNotes: [], dayNotes: [], slotSummary: null }, lastWeekStats: null }
  ];

  for (const c of cas) {
    test(`identique a l'original — ${c.nom}`, async () => {
      const args = {
        weekStats: c.weekStats,
        lastWeekStats: c.lastWeekStats,
        profile: PROFIL,
        targets: OBJECTIFS,
        lastActionsText: "1. Monter les glucides\n2. Coucher avant 23h",
        thisPhotos: null,
        lastPhotos: null
      };
      const attendu = await promptLegacy((app) => app.callBilanAPI({ ...args, apiKey: "k" }));
      assert.equal(promptBilanHebdo(args), attendu.texte);
    });
  }

  test("un regime et des allergies remontent dans la ligne PROFIL", async () => {
    const profil = { ...PROFIL, dietType: "vegetarien", allergies: ["lactose", "gluten"] };
    const args = { weekStats: SEMAINE, lastWeekStats: null, profile: profil, targets: OBJECTIFS, lastActionsText: null, thisPhotos: null, lastPhotos: null };
    const attendu = await promptLegacy((app) => app.callBilanAPI({ ...args, apiKey: "k" }));
    assert.equal(promptBilanHebdo(args), attendu.texte);
    assert.match(promptBilanHebdo(args), /régime = |allergies\/intolérances = /);
  });

  test("les consignes de securite ne peuvent pas disparaitre", () => {
    const p = promptBilanHebdo({ weekStats: SEMAINE, lastWeekStats: null, profile: PROFIL, targets: OBJECTIFS, lastActionsText: null, thisPhotos: null, lastPhotos: null });
    assert.match(p, /Ne pose aucun diagnostic/, "douleurs : jamais de diagnostic");
    assert.match(p, /consulter un professionnel de santé/);
    assert.match(p, /sans culpabiliser le client/, "creneaux manques : ne pas culpabiliser");
    assert.match(p, /respecter le régime et les allergies/);
  });

  test("une semaine difficile interdit d'augmenter la charge", () => {
    const p = promptBilanHebdo({ weekStats: SEMAINE_DURE, lastWeekStats: null, profile: PROFIL, targets: OBJECTIFS, lastActionsText: null, thisPhotos: null, lastPhotos: null });
    assert.match(p, /n'augmente ni le volume ni les charges/);
    assert.match(p, /valorise explicitement le fait d'avoir tenu/);
  });

  test("les photos sont jointes et etiquetees comme dans l'original", () => {
    const images = imagesDuBilan({ face: "d1", dos: "d3" }, { profil: "d2" });
    assert.deepEqual(images, [
      { label: "Photo de cette semaine — face :", dataUrl: "d1" },
      { label: "Photo de cette semaine — dos :", dataUrl: "d3" },
      { label: "Photo de la semaine précédente — profil :", dataUrl: "d2" }
    ]);
    assert.deepEqual(imagesDuBilan(null, null), [], "aucune photo, aucune image jointe");
  });
});

describe("parite du prompt mensuel", () => {
  test("identique a l'original", async () => {
    const args = { monthStats: MOIS, prevMonthStats: { ...MOIS, workoutsCount: 18 }, profile: PROFIL, targets: OBJECTIFS, lastActionsText: "1. Tenir 3 seances" };
    const attendu = await promptLegacy((app) => app.callBilanMensuelAPI({ ...args, apiKey: "k" }));
    assert.equal(promptBilanMensuel(args), attendu.texte);
  });

  test("un mois sans mensurations le dit, au lieu d'un blanc", async () => {
    const args = { monthStats: { ...MOIS, measureDeltas: [] }, prevMonthStats: null, profile: PROFIL, targets: OBJECTIFS, lastActionsText: null };
    const attendu = await promptLegacy((app) => app.callBilanMensuelAPI({ ...args, apiKey: "k" }));
    assert.equal(promptBilanMensuel(args), attendu.texte);
    assert.match(promptBilanMensuel(args), /aucune prise de mensurations ce mois-ci/);
  });
});

describe("aides", () => {
  let legacy;
  before(() => {
    legacy = chargerApp();
  });

  test("ligneRegime se comporte comme dietProfileLine", () => {
    for (const p of [
      { dietType: "aucun", allergies: [] },
      { dietType: "vegetarien", allergies: [] },
      { dietType: "aucun", allergies: ["lactose"] },
      { dietType: "vegan", allergies: ["gluten", "fruits_coque"] },
      {}
    ]) {
      assert.equal(ligneRegime(p), legacy.dietProfileLine(p), JSON.stringify(p));
    }
  });

  test("moisLong et cleMoisPrecedent comme l'original", () => {
    for (const m of ["2026-01", "2026-08", "2026-12"]) {
      assert.equal(moisLong(m), legacy.fmtMonthLong(m), m);
      assert.equal(cleMoisPrecedent(m), legacy.prevMonthKeyOf(m), m);
    }
    assert.equal(cleMoisPrecedent("2026-01"), "2025-12", "janvier renvoie au decembre precedent");
  });

  test("actionsPrecedentes numerote comme l'original", () => {
    assert.equal(actionsPrecedentes({ sections: { actions: ["A", "B"] } }), "1. A\n2. B");
    assert.equal(actionsPrecedentes({ sections: { actions: [] } }), null);
    assert.equal(actionsPrecedentes(undefined), null);
  });
});

describe("branchement de l'ecran", () => {
  const app = lire("app/src/App.jsx");
  const tendances = lire("app/src/ecrans/Tendances.jsx");

  test("les deux boutons sont enfin relies", () => {
    assert.match(app, /onGenerate=\{genererBilan\}/);
    assert.match(app, /onGenerateMonthly=\{genererBilanDuMois\}/);
    assert.ok(!/iaDisponible=\{false\}/.test(app), "le bouton IA n'a plus besoin d'etre masque");
  });

  test("le bilan genere est AFFICHE, pas seulement stocke", () => {
    assert.match(tendances, /<BilanSections sections=\{bilanCourant\.sections\}/);
    assert.match(tendances, /<BilanSections sections=\{bilanMensuelCourant\.sections\}/);
  });

  test("le bilan mensuel ne s'affiche plus si l'IA n'est pas disponible", () => {
    // Un bouton mort est pire que pas de bouton : celui du mensuel etait
    // rendu sans condition, contrairement a celui de la semaine.
    assert.match(tendances, /\{iaDisponible && \([\s\S]{0,400}Générer le bilan mensuel/);
  });

  test("la semaine precedente sert de comparaison", () => {
    assert.match(app, /lastWeekStats: bilanHebdomadaire\(cleSemainePrecedente/);
    assert.match(app, /lastPhotos: charger\("coach_photos_" \+ cleSemainePrecedente/);
  });

  test("le bilan genere part avec l'envoi au coach", () => {
    assert.match(app, /report: bilanCourant/);
    assert.ok(!/report: null/.test(app), "le bilan IA etait jete a l'envoi");
  });

  test("un stockage plein ne fait pas croire que le bilan est perdu en silence", () => {
    assert.match(app, /if \(!enregistrer\(STORAGE_KEYS\.reports, suivant\)\)/);
    assert.match(app, /if \(!enregistrer\(STORAGE_KEYS\.monthlyReports, suivant\)\)/);
  });

  test("les cles de stockage sont celles de l'application actuelle", () => {
    const stockage = lire("app/src/lib/stockage.js");
    assert.match(stockage, /reports: "coach_reports"/);
    assert.match(stockage, /monthlyReports: "coach_reports_monthly"/);
  });
});
