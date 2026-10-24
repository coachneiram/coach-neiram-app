/**
 * Historique des bilans hebdomadaires et mensuels (rebranche le 22/10/2026).
 *
 * L'ancienne application (index.html, TendancesTab, l. 4406-4408 et 4438)
 * listait les bilans passes ; la migration avait perdu l'affichage alors que
 * les bilans restaient enregistres (coach_reports, coach_reports_monthly).
 * App coach : tout l'historique est visible, sans limite.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { historiqueHebdo, historiqueMensuel } from "../app/src/lib/historique-bilans.js";
import { STORAGE_KEYS } from "../app/src/lib/stockage.js";

const AUJ = "2026-10-22"; // un jeudi ; semaine en cours : lundi 2026-10-19
// Forme reelle enregistree : l'objet rendu par lireBilan (rapport.js).
const sections = { resume: "ok", points_forts: ["régularité"], actions: ["Boire 2 L"] };
const hebdo = (weekKey) => ({ id: "w" + weekKey, weekKey, start: weekKey, end: null, sections });
const semaines = ["2026-10-19", "2026-10-12", "2026-10-05", "2026-09-28", "2026-09-21", "2026-09-14", "2025-08-04"].map(hebdo);
const mois = ["2026-10", "2026-09", "2026-08", "2025-01"].map((monthKey) => ({ id: "m" + monthKey, monthKey, sections }));

describe("bilans hebdomadaires", () => {
  test("tout l'historique, sans la semaine en cours, du plus recent au plus ancien", () => {
    const h = historiqueHebdo(semaines, { aujourdhui: AUJ });
    assert.deepEqual(
      h.visibles.map((r) => r.weekKey),
      ["2026-10-12", "2026-10-05", "2026-09-28", "2026-09-21", "2026-09-14", "2025-08-04"]
    );
  });

  test("aucune limite de profondeur : un bilan d'il y a plus d'un an reste visible", () => {
    const h = historiqueHebdo(semaines, { aujourdhui: AUJ });
    assert.ok(h.visibles.some((r) => r.weekKey === "2025-08-04"));
  });

  test("la semaine en cours est reconnue quel que soit le jour", () => {
    for (const jour of ["2026-10-19", "2026-10-25"]) {
      const h = historiqueHebdo(semaines, { aujourdhui: jour });
      assert.ok(!h.visibles.some((r) => r.weekKey === "2026-10-19"), jour);
    }
  });

  test("ordre d'enregistrement quelconque et entrees abimees : trie, ignore", () => {
    const melange = [semaines[3], null, { weekKey: "2026-10-12" }, semaines[1], "x", 42, { sections }];
    const h = historiqueHebdo(melange, { aujourdhui: AUJ });
    assert.deepEqual(h.visibles.map((r) => r.weekKey), ["2026-10-12", "2026-09-28"]);
  });

  test("bilan sans sections (generation interrompue) : ignore", () => {
    const h = historiqueHebdo(
      [{ weekKey: "2026-10-12" }, { weekKey: "2026-10-05", sections: null }, { weekKey: "2026-09-28", sections: "texte" }],
      { aujourdhui: AUJ }
    );
    assert.deepEqual(h.visibles, []);
  });

  test("aucun bilan, ou stockage illisible : rien", () => {
    for (const v of [undefined, null, {}, "abc"]) {
      assert.deepEqual(historiqueHebdo(v, { aujourdhui: AUJ }), { visibles: [] });
    }
  });

  test("la liste enregistree n'est ni triee ni modifiee sur place", () => {
    const liste = [semaines[3], semaines[1]];
    const avant = JSON.stringify(liste);
    historiqueHebdo(liste, { aujourdhui: AUJ });
    assert.equal(JSON.stringify(liste), avant);
  });
});

describe("bilans mensuels", () => {
  test("tous les mois passes, sans le mois en cours", () => {
    const h = historiqueMensuel(mois, { aujourdhui: AUJ });
    assert.deepEqual(h.visibles.map((r) => r.monthKey), ["2026-09", "2026-08", "2025-01"]);
  });

  test("entrees abimees ignorees, aucun bilan : rien", () => {
    assert.deepEqual(historiqueMensuel([null, { monthKey: "2026-09" }], { aujourdhui: AUJ }), { visibles: [] });
    assert.deepEqual(historiqueMensuel(undefined, { aujourdhui: AUJ }), { visibles: [] });
  });
});

describe("branchement a l'ecran", () => {
  const lire = (c) => readFileSync(join(process.cwd(), c), "utf8");

  test("les bilans lus sont ceux des cles existantes (aucune migration)", () => {
    assert.equal(STORAGE_KEYS.reports, "coach_reports");
    assert.equal(STORAGE_KEYS.monthlyReports, "coach_reports_monthly");
  });

  test("App transmet les bilans enregistres a Tendances", () => {
    const app = lire("app/src/App.jsx");
    assert.match(app, /bilans=\{reports\}/);
    assert.match(app, /bilansMensuels=\{monthlyReports\}/);
  });

  test("Tendances affiche les deux historiques, complets", () => {
    const t = lire("app/src/ecrans/Tendances.jsx");
    assert.match(t, /historiqueHebdo\(bilans, \{ aujourdhui: todayISO\(\) \}\)/);
    assert.match(t, /historiqueMensuel\(bilansMensuels, \{ aujourdhui: todayISO\(\) \}\)/);
    assert.match(t, /<SectionTitle>Historique des bilans<\/SectionTitle>/);
    assert.match(t, /Bilans mensuels précédents/);
    assert.match(t, /libelle=\{\(r\) => moisLong\(r\.monthKey\)\}/);
    assert.doesNotMatch(t, /premium|VerrouPremium/i, "l'app coach n'a pas de Premium");
  });

  test("la carte « Historique des bilans » suit « Bilan de la semaine »", () => {
    const t = lire("app/src/ecrans/Tendances.jsx");
    // `tuto="…"` : bouton « ? » du titre (tutos des cartes, 24/10/2026).
    const semaine = t.search(/<SectionTitle(?: tuto="[\w-]+")?>Bilan de la semaine<\/SectionTitle>/);
    const historique = t.indexOf("<SectionTitle>Historique des bilans</SectionTitle>");
    const mensuel = t.search(/<SectionTitle(?: tuto="[\w-]+")?>Bilan mensuel/);
    assert.ok(semaine !== -1 && semaine < historique && historique < mensuel);
  });

  test("le composant liste les bilans avec BilanSections, sans verrou", () => {
    const c = lire("app/src/ui/HistoriqueBilans.jsx");
    assert.match(c, /<BilanSections sections=\{r\.sections\} \/>/);
    assert.match(c, /aria-expanded=\{ouvert\}/);
    assert.doesNotMatch(c, /VerrouPremium|texteMasques/);
  });
});
