/**
 * Repère sur mesure (lib/nutrition-perso.js), repris de l'app Neiram le
 * 24/10/2026, et les garanties propres à l'app coach :
 *  - les objectifs du coach (computeTargets, App.jsx) ne bougent jamais ;
 *  - les réponses du questionnaire vivent hors du profil (cn_…) ;
 *  - les données de santé ne partent ni au coach ni à l'IA.
 */
import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { creerLocalStorage } from "./outils-neiram.mjs";

globalThis.localStorage = creerLocalStorage();
const { computeTargets } = await import("../app/src/lib/nutrition.js");
const {
  CHAMPS_SUR_MESURE,
  CLE_OBJECTIFS_SUR_MESURE,
  ciblesPersonnalisees,
  densiteKg,
  enregistrerReglagesSurMesure,
  explicationCibles,
  lireReglagesSurMesure,
  masseGrasseRecente,
  metabolismeDeBase,
  profilPourRepere
} = await import("../app/src/lib/nutrition-perso.js");
const { regimeOk } = await import("../app/src/lib/aliments.js");
const { conflitsAllergenes, convertirProduitOFF } = await import("../app/src/lib/recherche-aliments.js");
const { construireConsigneCoach } = await import("../app/src/lib/consigne-coach.js");
const { promptBilanHebdo } = await import("../app/src/lib/bilan-ia.js");

const ICI = dirname(fileURLToPath(import.meta.url));
const SRC = join(ICI, "..", "app", "src");
const lire = (chemin) => readFileSync(join(SRC, chemin), "utf8");

const H = { sex: "homme", age: 35, heightCm: 180, startWeightKg: 80, activityLevel: "modere", goal: "maintien", dietType: "aucun", allergies: [] };
const F = { sex: "femme", age: 30, heightCm: 165, startWeightKg: 62, activityLevel: "leger", goal: "perte", dietType: "aucun", allergies: [] };

beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

describe("sans réglage, le repère est égal aux objectifs", () => {
  for (const [nom, p] of [["homme maintien", H], ["femme perte", F], ["prise", { ...H, goal: "prise" }], ["keto", { ...F, repartitionMacros: "keto" }], ["hyperprotéiné", { ...H, repartitionMacros: "hyperproteine" }]]) {
    test(nom, () => {
      const a = computeTargets(p, p.startWeightKg);
      const b = ciblesPersonnalisees(p, p.startWeightKg, { aujourdhui: "2026-10-24" });
      for (const k of ["calories", "protein", "carbs", "fat"]) assert.ok(Math.abs(a[k] - b[k]) <= 2, `${k} : ${a[k]} / ${b[k]}`);
    });
  }
});

describe("précision", () => {
  test("masse grasse : moyenne Mifflin / Katch-McArdle, mesure récente prioritaire", () => {
    const m = metabolismeDeBase(H, 80, 12);
    assert.ok(m.katch > m.mifflin, "un homme mince et musclé brûle plus que Mifflin ne l'estime");
    assert.equal(masseGrasseRecente(H, [{ date: "2026-10-01", bodyFatPct: 18 }, { date: "2026-10-20", bodyFatPct: 15 }], "2026-10-24"), 15);
    assert.equal(masseGrasseRecente(H, [{ date: "2025-01-01", bodyFatPct: 15 }], "2026-10-24"), null, "trop ancienne");
    const sans = ciblesPersonnalisees(H, 80, { aujourdhui: "2026-10-24" });
    const avec = ciblesPersonnalisees(H, 80, { aujourdhui: "2026-10-24", bodyLogs: [{ date: "2026-10-20", bodyFatPct: 12 }] });
    assert.ok(avec.calories > sans.calories);
  });

  test("densité du kg : plus basse quand il y a peu de masse grasse", () => {
    assert.ok(densiteKg(70, 12) < densiteKg(100, 40));
    assert.equal(densiteKg(80, null), 7700);
  });

  test("rythme de perte : 0,5 %/semaine", () => {
    const c = ciblesPersonnalisees({ ...F, rythmePct: 0.5 }, 62, { aujourdhui: "2026-10-24" });
    const attendu = (0.005 * 62 * 7700) / 7;
    assert.ok(Math.abs(c.details.maintenance - c.calories - attendu) <= 10, `${c.details.maintenance - c.calories} vs ${attendu}`);
  });
});

describe("garde-fous", () => {
  test("déficit plafonné et plancher de sécurité", () => {
    const c = ciblesPersonnalisees({ ...F, heightCm: 155, startWeightKg: 50, activityLevel: "sedentaire", rythmePct: 1 }, 50, { aujourdhui: "2026-10-24" });
    assert.ok(c.calories >= 1200);
    assert.ok(c.details.alertes.length > 0);
  });

  test("grossesse : pas de déficit, + 260 kcal au 2e trimestre, + 9 g de protéines", () => {
    const c = ciblesPersonnalisees({ ...F, situation: "enceinte-t2" }, 62, { aujourdhui: "2026-10-24" });
    assert.equal(c.calories, Math.round((c.details.maintenance + 260) / 10) * 10);
    assert.match(c.details.alertes.join(" "), /Grossesse/);
  });

  test("IMC < 18,5, moins de 18 ans, antécédent de TCA : pas de perte", () => {
    for (const p of [{ ...F, startWeightKg: 48 }, { ...F, age: 17 }, { ...F, contraintesSante: ["tca"] }]) {
      const c = ciblesPersonnalisees(p, p.startWeightKg, { aujourdhui: "2026-10-24" });
      assert.ok(c.calories >= c.details.maintenance - 10, JSON.stringify(c.details));
    }
  });

  test("maladie rénale : 0,8 g/kg ; après 65 ans : au moins 1,2 g/kg", () => {
    assert.equal(ciblesPersonnalisees({ ...H, contraintesSante: ["renal"] }, 80, {}).protein, 64);
    const senior = ciblesPersonnalisees({ ...H, age: 70, repartitionMacros: "lowcarb" }, 80, {});
    assert.ok(senior.protein >= 96);
  });
});

describe("macros sur mesure (tout inclus dans l'app coach)", () => {
  test("en grammes : les calories en découlent", () => {
    const c = ciblesPersonnalisees({ ...H, macrosPerso: { mode: "grammes", p: 180, g: 250, l: 70 } }, 80, {});
    assert.equal(c.calories, 180 * 4 + 250 * 4 + 70 * 9);
    assert.ok(c.details.manuel);
  });

  test("protéines en g/kg et lipides en %", () => {
    const c = ciblesPersonnalisees({ ...H, macrosPerso: { proteinesGKg: 1.8, lipidesPct: 30 } }, 80, {});
    assert.equal(c.protein, 144);
    assert.ok(Math.abs(c.fat * 9 - c.calories * 0.3) < 10);
  });

  test("jours d'entraînement : plus de glucides, moins au repos", () => {
    const q = { ...H, cyclageGlucides: true, weeklyWorkoutTarget: 3 };
    const base = ciblesPersonnalisees(H, 80, { aujourdhui: "2026-10-24" });
    const entr = ciblesPersonnalisees(q, 80, { aujourdhui: "2026-10-24", seances: [{ date: "2026-10-24" }] });
    const repos = ciblesPersonnalisees(q, 80, { aujourdhui: "2026-10-24" });
    const prevue = ciblesPersonnalisees(q, 80, { aujourdhui: "2026-10-24", seancePrevue: true });
    assert.ok(entr.carbs > base.carbs && repos.carbs < base.carbs);
    assert.equal(prevue.carbs, entr.carbs, "une séance prévue au programme compte comme un jour d'entraînement");
    // Budget de la semaine : 3 jours d'entraînement + 4 de repos ≈ 7 jours normaux.
    assert.ok(Math.abs(3 * entr.carbs + 4 * repos.carbs - 7 * base.carbs) <= 7);
  });

  test("méditerranéen : environ 37 % de lipides dans le repère", () => {
    const c = ciblesPersonnalisees({ ...H, repartitionMacros: "mediterraneen" }, 80, {});
    assert.ok(Math.abs((c.fat * 9) / c.calories - 0.37) < 0.02);
  });

  test("repères et explication", () => {
    const c = ciblesPersonnalisees(H, 80, {});
    assert.equal(c.fibres, Math.max(25, Math.round((c.calories / 1000) * 14)));
    assert.equal(c.eauL, 2);
    assert.ok(explicationCibles(c).length >= 3);
  });
});

describe("contraintes alimentaires et allergènes", () => {
  test("halal et casher excluent les bons aliments", () => {
    assert.equal(regimeOk({ contains: ["porc"] }, { contraintesAlim: ["halal"] }), false);
    assert.equal(regimeOk({ contains: ["crustaces"] }, { contraintesAlim: ["casher"] }), false);
    assert.equal(regimeOk({ contains: ["crustaces"] }, { contraintesAlim: ["halal"] }), true);
  });

  test("Open Food Facts : allergènes et traces du profil signalés", () => {
    const prod = convertirProduitOFF({ code: "1", product_name: "Pain", nutriments: {}, allergens_tags: ["en:gluten", "en:sesame-seeds"], traces_tags: ["en:nuts"] });
    assert.deepEqual(prod.allergenes, ["gluten", "sesame"]);
    assert.deepEqual(conflitsAllergenes(prod, ["sesame", "fruits-a-coque"]), { contient: ["sesame"], traces: ["fruits-a-coque"] });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   GARANTIES DE L'APP COACH
   ══════════════════════════════════════════════════════════════════════ */

/** Toutes les réponses possibles du questionnaire, d'un coup. */
const TOUT_REMPLI = {
  rythmePct: 1,
  situation: "enceinte-t3",
  contraintesSante: ["tca", "renal", "diabete", "hypertension"],
  categoriePoids: { actif: true, federation: "ipf", limiteKg: 74, date: "2026-12-12", pesee: "veille" },
  macrosPerso: { mode: "grammes", p: 200, g: 100, l: 50 },
  cyclageGlucides: true
};

describe("app coach : les objectifs du coach ne bougent jamais", () => {
  test("computeTargets ignore chaque champ du questionnaire", () => {
    for (const p of [H, F, { ...H, goal: "prise" }, { ...F, goal: "performance", performanceDirection: "perte" }]) {
      const reference = computeTargets(p, 75);
      assert.deepEqual(computeTargets(profilPourRepere(p, TOUT_REMPLI), 75), reference, JSON.stringify(p));
      for (const champ of CHAMPS_SUR_MESURE) {
        assert.deepEqual(computeTargets({ ...p, [champ]: TOUT_REMPLI[champ] }, 75), reference, champ);
      }
    }
  });

  test("le repère change, les objectifs non", () => {
    const repere = ciblesPersonnalisees(profilPourRepere(F, { rythmePct: 1 }), 62, { aujourdhui: "2026-10-24" });
    assert.notEqual(repere.calories, computeTargets(F, 62).calories, "le repère suit les réponses");
    assert.deepEqual(computeTargets(F, 62), computeTargets(F, 62));
  });

  test("le profil n'est jamais modifié : copie, champs filtrés", () => {
    const profil = { ...H };
    const fige = JSON.stringify(profil);
    const copie = profilPourRepere(profil, { ...TOUT_REMPLI, goal: "perte", startWeightKg: 50, heightCm: 120 });
    assert.equal(JSON.stringify(profil), fige);
    assert.equal(copie.goal, "maintien", "un champ du profil ne peut pas être écrasé par le questionnaire");
    assert.equal(copie.startWeightKg, 80);
    assert.equal(copie.situation, "enceinte-t3");
  });

  test("les réponses vont dans une clé cn_ à part, jamais dans coach_profile", () => {
    assert.ok(CLE_OBJECTIFS_SUR_MESURE.startsWith("cn_"));
    localStorage.setItem("coach_profile", JSON.stringify(H));
    enregistrerReglagesSurMesure({ ...TOUT_REMPLI, goal: "perte" });
    assert.deepEqual(JSON.parse(localStorage.getItem("coach_profile")), H);
    const lu = lireReglagesSurMesure();
    assert.equal(lu.goal, undefined, "seuls les champs du questionnaire sont gardés");
    assert.deepEqual(lu.contraintesSante, TOUT_REMPLI.contraintesSante);
    assert.deepEqual(JSON.parse(localStorage.getItem(CLE_OBJECTIFS_SUR_MESURE)), lu);
  });

  test("une clé corrompue ne casse rien", () => {
    localStorage.setItem(CLE_OBJECTIFS_SUR_MESURE, "{pas du json");
    assert.deepEqual(lireReglagesSurMesure(), {});
    localStorage.setItem(CLE_OBJECTIFS_SUR_MESURE, "[1,2]");
    assert.deepEqual(lireReglagesSurMesure(), {});
  });

  test("App.jsx calcule les objectifs avec computeTargets, sans le repère", () => {
    const app = lire("App.jsx");
    assert.match(app, /computeTargets\(profile, poidsCourant\)/);
    assert.ok(!/nutrition-perso|ciblesPersonnalisees/.test(app), "App.jsx ne doit pas utiliser le repère pour les objectifs");
  });

  test("la carte n'a aucun bouton qui applique le repère, et n'écrit pas le profil", () => {
    const carte = lire("ui/CarteObjectifsSurMesure.jsx");
    for (const interdit of [/onSave\b/, /onSaveProfile/, /enregistrerProfil/, /STORAGE_KEYS/, /coach_profile/, /appliquer/i]) {
      assert.ok(!interdit.test(carte.replace(/\/\*[\s\S]*?\*\//g, "")), `trouvé : ${interdit}`);
    }
    const nutrition = lire("ecrans/Nutrition.jsx");
    assert.match(nutrition, /<CarteObjectifsSurMesure/);
    assert.ok(!/onSaveProfile/.test(nutrition));
  });
});

describe("app coach : les données de santé restent sur le téléphone", () => {
  /** Fichiers autorisés à lire les réponses de santé : le calcul et son affichage, rien d'autre. */
  const AUTORISES = new Set([
    "lib/nutrition-perso.js",
    "lib/categorie-poids.js",
    "lib/complements.js",
    "lib/textes-nutrition-perso.js",
    "ui/CarteObjectifsSurMesure.jsx",
    "ui/CarteComplements.jsx",
    "ecrans/Nutrition.jsx"
  ]);

  const fichiers = (dossier) =>
    readdirSync(join(SRC, dossier))
      .filter((f) => /\.(js|jsx)$/.test(f))
      .map((f) => `${dossier}/${f}`);

  const tous = () => [...fichiers("lib"), ...fichiers("ui"), ...fichiers("ecrans"), "App.jsx"];

  test("aucun autre fichier ne lit les réponses du questionnaire", () => {
    const motifs = /CLE_OBJECTIFS_SUR_MESURE|cn_objectifs_sur_mesure|lireReglagesSurMesure|reglagesSurMesure|profilPourRepere/;
    const fautifs = tous().filter((f) => !AUTORISES.has(f) && motifs.test(lire(f)));
    assert.deepEqual(fautifs, [], "ces fichiers lisent des données de santé : synchro, bilan ou IA risqueraient de les envoyer");
  });

  test("aucun autre fichier ne cherche grossesse, santé ou catégorie de poids dans le profil", () => {
    // Exception : lib/transformation.js (étape précédente) lit
    // profil.situation et profil.contraintesSante pour exclure du
    // classement de perte. Il reçoit le PROFIL, où ces champs n'existent
    // jamais dans l'app coach : lui passer les réponses enverrait la
    // grossesse dans le bilan du coach (performances-bilan.js).
    const exceptions = new Set(["lib/transformation.js"]);
    const motifs = /contraintesSante|\.situation\b|categoriePoids/;
    const fautifs = tous().filter((f) => !AUTORISES.has(f) && !exceptions.has(f) && motifs.test(lire(f)));
    assert.deepEqual(fautifs, []);
    assert.ok(!/reglages|cn_objectifs/i.test(lire("lib/transformation.js")));
  });

  test("ni la consigne du Coach IA ni le bilan n'en parlent, même si le profil en contenait", () => {
    const profil = profilPourRepere(F, TOUT_REMPLI);
    const cibles = computeTargets(F, 62);
    const consigne = construireConsigneCoach(profil, cibles, null);
    const semaine = { start: "2026-10-19", end: "2026-10-25", hasAnyData: false, sessionNotes: [], dayNotes: [], painLines: [] };
    const bilan = promptBilanHebdo({ weekStats: semaine, lastWeekStats: null, profile: profil, lastActionsText: null });
    for (const texte of [consigne, bilan]) {
      for (const mot of [/enceinte/i, /3e trimestre/i, /rénale/i, /diabète/i, /hypertension/i, /trouble alimentaire/i, /pesée le/i]) {
        assert.ok(!mot.test(texte), `${mot} trouvé dans un texte envoyé`);
      }
    }
  });
});
