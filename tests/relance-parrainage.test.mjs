/**
 * Relance du parrainage : la phrase validee par le coach, au bon moment.
 *
 * Regle du coach (2 octobre 2026) : apres un trophee qui vient de se
 * debloquer (sauf « Premier pas »), au plus une fois toutes les 4 semaines, jamais en semaine
 * difficile ni en reprise, fermable.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CLE_RELANCE_PARRAINAGE,
  INTERVALLE_JOURS,
  PHRASE_PARRAINAGE,
  TROPHEES_SANS_RELANCE,
  afficherRelanceParrainage
} from "../app/src/lib/relance-parrainage.js";
import { contexteDuJour, PHRASES } from "../app/src/lib/mot-du-coach.js";
import { estCleClient } from "../app/src/lib/stockage.js";

const AUJ = "2026-10-02";
const NOUVEAU = [{ id: "semaines-4", titre: "1 mois tenu", obtenu: true }];
const base = { nouveaux: NOUVEAU, contexte: "standard", derniere: null, date: AUJ };

describe("La phrase", () => {
  test("mot pour mot la phrase A validee par le coach", () => {
    assert.equal(
      PHRASE_PARRAINAGE,
      "Bravo pour ce trophée ! Tu connais quelqu'un qui aurait besoin du même déclic ? Invite-le, ton prochain mois te coûtera moins cher."
    );
  });

  test("elle n'est pas melee au mot du coach", () => {
    assert.ok(!PHRASES.some((p) => /invite|parrain|ami/i.test(p.texte)));
  });
});

describe("Quand la montrer", () => {
  test("trophee qui vient de se debloquer, semaine normale, jamais montree : oui", () => {
    assert.equal(afficherRelanceParrainage(base), true);
  });

  test("aucun nouveau trophee : non", () => {
    assert.equal(afficherRelanceParrainage({ ...base, nouveaux: [] }), false);
    assert.equal(afficherRelanceParrainage({ ...base, nouveaux: undefined }), false);
  });

  test("« Premier pas » seul ne declenche pas la relance (decision du coach)", () => {
    assert.deepEqual(TROPHEES_SANS_RELANCE, ["seances-1"]);
    const premierPas = { id: "seances-1", titre: "Premier pas", obtenu: true };
    assert.equal(afficherRelanceParrainage({ ...base, nouveaux: [premierPas] }), false);
    // Debloque en meme temps qu'un autre trophee : l'autre declenche.
    assert.equal(afficherRelanceParrainage({ ...base, nouveaux: [premierPas, ...NOUVEAU] }), true);
    assert.equal(
      afficherRelanceParrainage({ ...base, nouveaux: [premierPas, { id: "seances-10", titre: "Lancé", obtenu: true }] }),
      true
    );
  });

  test("semaine difficile ou reprise : non, meme avec un trophee", () => {
    assert.equal(afficherRelanceParrainage({ ...base, contexte: "difficile" }), false);
    assert.equal(afficherRelanceParrainage({ ...base, contexte: "reprise" }), false);
  });

  test("au plus une fois toutes les 4 semaines", () => {
    assert.equal(INTERVALLE_JOURS, 28);
    assert.equal(afficherRelanceParrainage({ ...base, derniere: AUJ }), false);
    assert.equal(afficherRelanceParrainage({ ...base, derniere: "2026-09-05" }), false, "27 jours");
    assert.equal(afficherRelanceParrainage({ ...base, derniere: "2026-09-04" }), true, "28 jours pile");
    assert.equal(afficherRelanceParrainage({ ...base, derniere: "2026-06-01" }), true);
  });

  test("le delai traverse un changement de mois et d'annee", () => {
    assert.equal(afficherRelanceParrainage({ ...base, derniere: "2026-12-10", date: "2027-01-06" }), false);
    assert.equal(afficherRelanceParrainage({ ...base, derniere: "2026-12-10", date: "2027-01-07" }), true);
  });

  test("date memorisee illisible : comptee comme jamais montree", () => {
    for (const derniere of [undefined, "", "hier", 42, {}, "2026-9-4"]) {
      assert.equal(afficherRelanceParrainage({ ...base, derniere }), true, JSON.stringify(derniere));
    }
  });
});

describe("Contexte reel du client (memes regles que le mot du coach)", () => {
  const profil = { weeklyWorkoutTarget: 2 };
  const S = (...dates) => dates.map((date, i) => ({ id: "s" + i, date }));

  test("semaine precedente non tenue et semaine en cours pas encore tenue : reprise, pas de relance", () => {
    const seances = S("2026-09-14", "2026-09-16", "2026-09-28");
    const contexte = contexteDuJour({ seances, profil, semainesDifficiles: {}, date: AUJ });
    assert.equal(contexte, "reprise");
    assert.equal(afficherRelanceParrainage({ ...base, contexte }), false);
  });

  test("semaine declaree difficile : pas de relance", () => {
    const seances = S("2026-09-21", "2026-09-23", "2026-09-28");
    const semainesDifficiles = { "2026-09-28": { active: true, reason: "enfant malade" } };
    const contexte = contexteDuJour({ seances, profil, semainesDifficiles, date: AUJ });
    assert.equal(contexte, "difficile");
    assert.equal(afficherRelanceParrainage({ ...base, contexte }), false);
  });
});

describe("Branchement dans l'ecran des trophees", () => {
  const source = readFileSync(new URL("../app/src/ecrans/Trophees.jsx", import.meta.url), "utf8");

  test("la cle est sauvegardee avec les donnees du client", () => {
    assert.ok(estCleClient(CLE_RELANCE_PARRAINAGE));
  });

  test("decision, contexte, phrase, fermeture et invitation viennent des fonctions testees", () => {
    assert.match(source, /afficherRelanceParrainage\(\{\s*nouveaux,\s*contexte,\s*derniere: derniereRelance,\s*date\s*\}\)/);
    assert.match(source, /contexteDuJour\(/);
    assert.match(source, /\{PHRASE_PARRAINAGE\}/);
    assert.match(source, /enregistrer\(CLE_RELANCE_PARRAINAGE, date\)/);
    assert.match(source, /inviterUnAmi\(messageInvitation\(/);
    assert.match(source, /aria-label="Fermer l'invitation"/);
  });

  test("la relance n'apparait que dans la celebration d'un nouveau trophee", () => {
    const celebration = source.indexOf("{nouveaux.length > 0 && (");
    const relance = source.indexOf("{relance && (");
    const finCelebration = source.indexOf("Super !");
    assert.ok(celebration > 0 && celebration < relance && relance < finCelebration);
  });
});
