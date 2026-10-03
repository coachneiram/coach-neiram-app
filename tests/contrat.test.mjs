/**
 * Contrat en cours : compte a rebours jusqu'a la fin (demande du coach du
 * 3 octobre 2026). Formule + date de debut saisies par le client ; fin
 * calculee ; message dans les 4 dernieres semaines ; seances notees depuis
 * le debut du contrat.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  FORMULES_CONTRAT,
  PREAVIS_JOURS,
  ajouterMois,
  contratDuProfil,
  etatContrat,
  ligneContratCoach,
  messageFinContrat,
  tropheesContrat
} from "../app/src/lib/contrat.js";
import { trophees, tropheesAffiches } from "../app/src/lib/trophees.js";
import { bilanHebdomadaire } from "../app/src/lib/bilan.js";
import { construireBilanHTML } from "../app/src/lib/bilan-html.js";
import { promptBilanHebdo } from "../app/src/lib/bilan-ia.js";

const AUJ = "2026-10-03";
const profil = (formule, debut) => ({ contrat: { formule, debut } });
const S = (...dates) => dates.map((date, i) => ({ id: "s" + i, date }));

describe("Formules", () => {
  test("grille de memory/offres.md : hebdo 3, 6, 12 mois, en ligne 6 mois, mensuels sans fin", () => {
    assert.deepEqual(
      FORMULES_CONTRAT.map((f) => [f.id, f.mois]),
      [["hebdo-3", 3], ["hebdo-6", 6], ["hebdo-12", 12], ["enligne-6", 6], ["mensuel", null], ["distance", null]]
    );
    assert.equal(PREAVIS_JOURS, 28);
  });
});

describe("Date de fin", () => {
  test("debut + duree, moins un jour", () => {
    const e = etatContrat({ profil: profil("hebdo-6", "2026-09-01"), seances: [], date: AUJ });
    assert.equal(e.fin, "2027-02-28");
    assert.equal(etatContrat({ profil: profil("hebdo-3", "2026-09-15"), seances: [], date: AUJ }).fin, "2026-12-14");
    assert.equal(etatContrat({ profil: profil("hebdo-12", "2026-01-01"), seances: [], date: AUJ }).fin, "2026-12-31");
  });

  test("ajout de mois : fin de mois ramenee, annees bissextiles", () => {
    assert.equal(ajouterMois("2026-01-31", 1), "2026-02-28");
    assert.equal(ajouterMois("2028-01-31", 1), "2028-02-29");
    assert.equal(ajouterMois("2026-08-31", 6), "2027-02-28");
    assert.equal(ajouterMois("2026-11-15", 3), "2027-02-15");
    assert.equal(ajouterMois("2026-12-01", 12), "2027-12-01");
  });
});

describe("Compte a rebours", () => {
  test("semaines restantes jusqu'a la fin incluse", () => {
    const e = etatContrat({ profil: profil("hebdo-6", "2026-09-01"), seances: [], date: AUJ });
    // Du 3 octobre au 28 fevrier inclus : 149 jours, 22 semaines entamees.
    assert.equal(e.joursRestants, 149);
    assert.equal(e.semainesRestantes, 22);
    assert.equal(e.bientot, false);
    assert.equal(e.termine, false);
    assert.equal(messageFinContrat(e), null);
  });

  test("dans les 4 dernieres semaines : message de fin, puis « cette semaine »", () => {
    // Fin le 30/10/2026 : 28 jours restants le 3 octobre.
    const juste = etatContrat({ profil: profil("hebdo-3", "2026-07-31"), seances: [], date: AUJ });
    assert.equal(juste.fin, "2026-10-30");
    assert.equal(juste.joursRestants, 28);
    assert.equal(juste.bientot, true);
    assert.equal(messageFinContrat(juste), "Ton contrat se termine dans 4 semaines : parles-en à Marien à ta prochaine séance.");
    const avant = etatContrat({ profil: profil("hebdo-3", "2026-08-01"), seances: [], date: AUJ });
    assert.equal(avant.joursRestants, 29);
    assert.equal(avant.bientot, false, "29 jours : pas encore");
    const derniere = etatContrat({ profil: profil("hebdo-3", "2026-07-06"), seances: [], date: AUJ });
    assert.equal(derniere.fin, "2026-10-05");
    assert.equal(messageFinContrat(derniere), "Ton contrat se termine cette semaine : parles-en à Marien à ta prochaine séance.");
    const dernierJour = etatContrat({ profil: profil("hebdo-3", "2026-07-04"), seances: [], date: AUJ });
    assert.equal(dernierJour.fin, AUJ);
    assert.equal(dernierJour.joursRestants, 1);
    assert.equal(dernierJour.termine, false);
  });

  test("contrat termine : date de fin rappelee", () => {
    const e = etatContrat({ profil: profil("hebdo-3", "2026-06-01"), seances: [], date: AUJ });
    assert.equal(e.termine, true);
    assert.equal(e.joursRestants, 0);
    assert.equal(messageFinContrat(e), "Ton contrat est arrivé à son terme le 31/08/2026 : parles-en à Marien pour la suite.");
  });

  test("formule mensuelle : pas de fin, pas de message", () => {
    const e = etatContrat({ profil: profil("mensuel", "2026-09-01"), seances: [], date: AUJ });
    assert.equal(e.sansEngagement, true);
    assert.equal(e.fin, undefined);
    assert.equal(messageFinContrat(e), null);
  });
});

describe("Seances depuis le debut du contrat", () => {
  test("seulement celles notees entre le debut et aujourd'hui", () => {
    const seances = S("2026-08-30", "2026-09-01", "2026-09-15", "2026-10-03", "2026-10-10");
    const e = etatContrat({ profil: profil("hebdo-6", "2026-09-01"), seances, date: AUJ });
    assert.equal(e.seances, 3);
  });
});

describe("Saisie illisible", () => {
  test("sans contrat, formule inconnue ou date invalide : rien", () => {
    for (const p of [{}, null, { contrat: "x" }, profil("inconnue", "2026-09-01"), profil("hebdo-6", "2026-02-30"), profil("hebdo-6", "hier"), profil("hebdo-6", "1999-12-31")]) {
      assert.equal(contratDuProfil(p), null, JSON.stringify(p));
      assert.equal(etatContrat({ profil: p, seances: [], date: AUJ }), null);
    }
    assert.equal(messageFinContrat(null), null);
  });
});

describe("Trophees du contrat", () => {
  test("lance, mi-parcours a la moitie, boucle le dernier jour ; id lie au contrat", () => {
    // Contrat de 3 mois du 1er aout au 31 octobre 2026 : 92 jours, moitie 46.
    const p = profil("hebdo-3", "2026-08-01");
    const au = (date) => Object.fromEntries(tropheesContrat(etatContrat({ profil: p, seances: [], date })).map((t) => [t.id.split("-").slice(4).join("-"), t]));
    const debut = au("2026-08-01");
    assert.deepEqual(Object.keys(debut), ["lance", "mi-parcours", "boucle"]);
    assert.equal(tropheesContrat(etatContrat({ profil: p, seances: [], date: AUJ }))[0].id, "contrat-2026-08-01-lance");
    assert.equal(debut.lance.obtenu, true);
    assert.equal(debut["mi-parcours"].obtenu, false);
    assert.equal(au("2026-09-14")["mi-parcours"].obtenu, false, "45e jour");
    assert.equal(au("2026-09-15")["mi-parcours"].obtenu, true, "46e jour");
    assert.equal(au("2026-10-30").boucle.obtenu, false);
    assert.equal(au("2026-10-31").boucle.obtenu, true, "dernier jour");
    assert.equal(au("2026-12-01").boucle.obtenu, true);
    assert.equal(au(AUJ).boucle.progression, "9/13 sem.");
  });

  test("dans les trophees : famille « Contrat en cours », absente sans contrat ou en mensuel", () => {
    const avec = tropheesAffiches(trophees({ seances: [], profil: { weeklyWorkoutTarget: 2, ...profil("hebdo-6", "2026-09-01") }, date: AUJ }).liste);
    const famille = avec.find((f) => f.id === "contrat");
    assert.equal(famille.titre, "Contrat en cours");
    assert.deepEqual(famille.tuiles.map((t) => t.titre), ["Contrat lancé", "Mi-parcours"]);
    for (const p of [{}, profil("mensuel", "2026-09-01")]) {
      const f = tropheesAffiches(trophees({ seances: [], profil: { weeklyWorkoutTarget: 2, ...p }, date: AUJ }).liste);
      assert.ok(!f.some((x) => x.id === "contrat"), JSON.stringify(p));
    }
  });
});

describe("Fin de contrat dans le bilan du coach", () => {
  const donnees = (sessions) => ({ sessions, dailyForm: [], bodyLogs: [], logEntries: [], hardWeeks: {} });

  test("ligne du coach : en cours, fin proche, terminee, sans engagement", () => {
    const e = (f, d, s = []) => etatContrat({ profil: profil(f, d), seances: s, date: AUJ });
    assert.equal(
      ligneContratCoach(e("hebdo-6", "2026-09-01", S("2026-09-02", "2026-09-09"))),
      "Suivi hebdo · 6 mois, depuis le 01/09/2026, jusqu'au 28/02/2027 (encore 22 semaines) · 2 séances notées depuis le début du contrat"
    );
    assert.equal(
      ligneContratCoach(e("hebdo-3", "2026-07-31")),
      "FIN DE CONTRAT dans 4 semaines (le 30/10/2026) : à renouveler · Suivi hebdo · 3 mois, depuis le 31/07/2026 · 0 séance notée depuis le début du contrat"
    );
    assert.match(ligneContratCoach(e("hebdo-3", "2026-06-01")), /^CONTRAT TERMINÉ le 31\/08\/2026 : à renouveler/);
    assert.match(ligneContratCoach(e("mensuel", "2026-09-01")), /\(sans engagement\)/);
    assert.equal(ligneContratCoach(null), null);
  });

  test("le bilan hebdo porte le contrat, signale quand la fin approche", () => {
    const b = bilanHebdomadaire("2026-09-28", donnees([]), { weeklyWorkoutTarget: 2, ...profil("hebdo-3", "2026-07-31") }, {});
    assert.equal(b.contrat.bientot, true);
    assert.match(b.contrat.ligne, /^FIN DE CONTRAT/);
    assert.equal(bilanHebdomadaire("2026-09-28", donnees([]), { weeklyWorkoutTarget: 2 }, {}).contrat, null);
  });

  test("bilan d'une semaine passee : contrat lu a la fin de cette semaine-la", () => {
    // Semaine du 31/08 au 06/09 : fin le 14/09, encore 9 jours ce dimanche-la
    // (aujourd'hui, le contrat serait termine) ; la seance du 10/09 ne compte pas.
    const b = bilanHebdomadaire("2026-08-31", donnees(S("2026-08-01", "2026-09-02", "2026-09-10")), { weeklyWorkoutTarget: 2, ...profil("hebdo-3", "2026-06-15") }, {});
    assert.match(b.contrat.ligne, /^FIN DE CONTRAT dans 2 semaines \(le 14\/09\/2026\)/);
    assert.match(b.contrat.ligne, /2 séances notées/);
    assert.equal(b.contrat.termine, false);
  });

  test("document envoye au coach et rapport IA : la ligne contrat y figure", () => {
    const b = bilanHebdomadaire("2026-09-28", donnees([]), { weeklyWorkoutTarget: 2, ...profil("hebdo-3", "2026-07-31") }, {});
    const html = construireBilanHTML({ profile: { name: "Client test", goal: "perte" }, weekStats: b, report: null, photos: null, targets: {} });
    assert.match(html, /data-contrat-bilan/);
    assert.match(html, /FIN DE CONTRAT dans 4 semaines/);
    // En or quand la fin approche, neutre sinon.
    assert.match(html, /data-contrat-bilan style="background:#F8D0401A;border:1px solid #F8D040/);
    const calme = bilanHebdomadaire("2026-09-28", donnees([]), { weeklyWorkoutTarget: 2, ...profil("hebdo-12", "2026-09-01") }, {});
    const htmlCalme = construireBilanHTML({ profile: { name: "Client test", goal: "perte" }, weekStats: calme, report: null, photos: null, targets: {} });
    assert.match(htmlCalme, /data-contrat-bilan style="background:#141416;border:1px solid #28282D/);
    const prompt = promptBilanHebdo({ weekStats: b, lastWeekStats: null, profile: { name: "Client test", goal: "perte" }, lastActionsText: "", thisPhotos: null, lastPhotos: null });
    assert.match(prompt, /Contrat : FIN DE CONTRAT dans 4 semaines/);
  });
});

describe("Branchement", () => {
  const trophees = readFileSync(new URL("../app/src/ecrans/Trophees.jsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../app/src/App.jsx", import.meta.url), "utf8");

  test("saisie, compte a rebours et message dans « Mes trophees »", () => {
    assert.match(trophees, /data-contrat-saisie/);
    assert.match(trophees, /aria-label="Formule du contrat"/);
    assert.match(trophees, /const etatDuContrat = etatContrat\(\{ profil: profile, seances, date \}\);/);
    assert.match(trophees, /const finContrat = messageFinContrat\(etatDuContrat\);/);
    assert.match(trophees, /data-fin-contrat/);
    assert.match(trophees, /onContrat\(\{ formule: contrat\.formule\.id, debut: d \}\)/);
  });

  test("enregistre dans le profil, retire si aucune formule", () => {
    assert.match(app, /const \{ contrat, \.\.\.reste \} = profil;/);
    assert.match(app, /enregistrerProfil\(c \? \{ \.\.\.reste, contrat: c \} : reste\)/);
    assert.match(app, /onContrat=\{definirContrat\}/);
    assert.match(readFileSync(new URL("../app/src/ecrans/Entrainements.jsx", import.meta.url), "utf8"), /onContrat=\{onContrat\}/);
  });
});
