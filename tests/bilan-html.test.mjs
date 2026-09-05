/**
 * Le document que le client envoie a son coach.
 *
 * TROISIEME REGRESSION DE LA BASCULE, trouvee en auditant les textes
 * affiches plutot que les noms de composants.
 *
 * Dans l'application deployee, le bouton « Envoyer sans bilan IA » de
 * l'ecran Tendances etait branche sur rien : App.jsx ne fournissait ni
 * onPartager, ni onUploadPhoto, et passait photos={{}} en dur. Autrement
 * dit AUCUN client ne pouvait envoyer son bilan hebdomadaire depuis la
 * bascule, ni deposer ses photos — sans le moindre message d'erreur, le
 * bouton ne faisait simplement rien.
 *
 * Le HTML produit est compare a celui de l'application d'origine :
 * c'est un document que le coach archive et relit des mois plus tard.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chargerApp } from "./harness.mjs";
import { construireBilanHTML, echapperHtml, nomFichierBilan } from "../app/src/lib/bilan-html.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (c) => readFileSync(join(ICI, "..", c), "utf8");

let legacy;
before(async () => {
  legacy = await chargerApp();
});

const PROFIL = { name: "Sabine Marchand", goal: "perte" };

const SEMAINE = {
  weekKey: "2026-08-31",
  start: "2026-08-31",
  end: "2026-09-06",
  workoutsCount: 6,
  planSummary: { planned: 6, done: 5 },
  avgSleepH: 7.2,
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

const OBJECTIFS = { calories: 1800, protein: 130, carbs: 160, fat: 60 };

const RAPPORT = {
  sections: {
    resume: "Semaine solide malgré un déficit un peu creusé.",
    evolution: "Poids en baisse régulière.",
    points_forts: ["Assiduité aux séances"],
    vigilance: ["Apport calorique bas"],
    a_corriger: ["Monter les glucides"],
    actions: ["Ajouter 150 kcal par jour"]
  }
};

describe("parite avec l'application d'origine", () => {
  test("le document produit est identique, a la date de generation pres", () => {
    const cas = [
      { profile: PROFIL, weekStats: SEMAINE, report: RAPPORT, photos: null, targets: OBJECTIFS },
      { profile: PROFIL, weekStats: SEMAINE, report: null, photos: null, targets: OBJECTIFS },
      { profile: { name: "Tristan", goal: "prise" }, weekStats: { ...SEMAINE, painLines: [], sessionNotes: [], dayNotes: [] }, report: RAPPORT, photos: null, targets: null },
      {
        profile: PROFIL,
        weekStats: SEMAINE,
        report: RAPPORT,
        photos: { face: "data:image/png;base64,AAA", profil: null, dos: "data:image/png;base64,BBB" },
        targets: OBJECTIFS
      }
    ];

    for (const [i, c] of cas.entries()) {
      const attendu = legacy.buildWeeklyReportHTML(c);
      const obtenu = construireBilanHTML(c);
      assert.equal(obtenu, attendu, `cas ${i}`);
    }
  });

  test("un bilan de debut de suivi ne produit pas un formulaire vide", () => {
    const vide = { weekKey: "2026-08-31", start: "2026-08-31", end: "2026-09-06", workoutsCount: 0, loggedDaysCount: 0, adherence: 0 };
    const c = { profile: PROFIL, weekStats: vide, report: null, photos: null, targets: null };
    assert.equal(construireBilanHTML(c), legacy.buildWeeklyReportHTML(c));
    assert.ok(!construireBilanHTML(c).includes("Sommeil moy."), "une donnee absente disparait, elle n'affiche pas un tiret");
  });

  test("le nom de fichier est celui attendu par le coach", () => {
    assert.equal(nomFichierBilan(PROFIL, SEMAINE), "bilan-2026-08-31-sabine-marchand.html");
    assert.equal(nomFichierBilan(PROFIL, SEMAINE), `bilan-${SEMAINE.weekKey}-${legacy.slugName(PROFIL.name)}.html`);
  });
});

describe("le contenu du client est echappe", () => {
  test("echapperHtml se comporte comme l'original", () => {
    for (const v of ['<script>alert(1)</script>', 'a & b', 'guillemet "double"', null, undefined, 42, "<>&\""]) {
      assert.equal(echapperHtml(v), legacy.escapeHtml(v), String(v));
    }
  });

  test("une note du client ne peut pas casser le document", () => {
    const html = construireBilanHTML({
      profile: { name: '<img src=x onerror=alert(1)>', goal: "perte" },
      weekStats: { ...SEMAINE, dayNotes: ['</div><script>vol()</script>'], sessionNotes: [] },
      report: null,
      photos: null,
      targets: null
    });
    assert.ok(!html.includes("<script>vol()"), "le script du client ne doit pas ressortir tel quel");
    assert.ok(!html.includes("<img src=x"), "l'attribut du client ne doit pas ressortir tel quel");
    assert.match(html, /&lt;img src=x/);
  });
});

describe("branchement de l'envoi", () => {
  const app = lire("app/src/App.jsx");

  test("le bouton « Envoyer » est enfin relie a quelque chose", () => {
    assert.match(app, /onPartager=\{envoyerBilan\}/);
    assert.ok(!/photos=\{\{\}\}/.test(app), "les photos etaient passees vides en dur");
    assert.match(app, /photos=\{photos\}/);
    assert.match(app, /onUploadPhoto=\{choisirPhoto\}/);
  });

  test("les photos du client partent bien avec le bilan", () => {
    // Sans cette assertion, remplacer photos par null dans l'appel a
    // partagerBilan passe inapercu : le coach recoit un bilan sans photos
    // et le client croit les avoir envoyees.
    assert.match(
      app,
      /await partagerBilan\(\{[\s\S]{0,200}?\n\s*photos,\n/,
      "envoyerBilan doit transmettre l'etat photos, pas null"
    );
  });

  test("« bilan envoye » n'est note que si l'envoi a abouti", () => {
    assert.match(app, /if \(resultat === "shared" \|\| resultat === "downloaded"\) \{\s*marquerBilanEnvoye\(weekStats\.weekKey\);/);
  });

  test("les photos sont rangees par semaine, comme dans l'application actuelle", () => {
    assert.match(app, /"coach_photos_" \+ cleSemaineCourante/);
  });

  test("un stockage plein ne perd pas la photo en silence", () => {
    assert.match(app, /if \(!enregistrer\(clePhotos, suivant\)\)/);
  });
});
