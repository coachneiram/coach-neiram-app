/**
 * Creneaux : motivation, cles de justification, heure de pointage.
 *
 * Le calcul des creneaux lui-meme (statuts, adherence, manques) est
 * couvert par tests/parite-creneaux.test.mjs. Ce fichier couvre ce qui a
 * ete ajoute pour l'affichage : le message de motivation, la cle qui
 * identifie une justification, et l'heure de pointage.
 *
 * La cle de justification merite un test a elle seule : elle est
 * enregistree dans le stockage du client. Si sa forme changeait, toutes
 * les justifications deja donnees redeviendraient des creneaux « a
 * justifier », et le client se verrait redemander de s'expliquer sur des
 * seances vieilles de plusieurs semaines.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import { META_STATUTS, cleJustification, heureCourante, motivationCreneaux } from "../app/src/lib/creneaux.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});


describe("motivation des creneaux", () => {
  const ligne = (statut, time) => ({ status: statut, slot: { id: "s1", day: "mon", time }, date: "2026-03-09" });

  /*
   * Les champs ont ete renommes en francais au passage de la migration
   * (rows/planned/missed/honored -> lignes/prevus/manques/honores), pour
   * rester coherents avec le reste de la bibliotheque. La comparaison passe
   * donc par une traduction explicite : c'est le RESULTAT qui doit etre
   * identique, pas la forme de l'entree.
   *
   * Ce renommage a d'ailleurs coute un plantage : la carte, portee mot pour
   * mot depuis index.html, lisait encore semaine.rows. D'ou le test de
   * fumee dans un vrai navigateur, qui l'a attrape.
   */
  const versLegacy = (semaine, bilan) => [
    { rows: semaine.lignes },
    { planned: bilan.prevus, missed: bilan.manques, honored: bilan.honores }
  ];

  test("identique a index.html", () => {
    const cas = [
      [{ lignes: [ligne("aujourdhui", "18:30")] }, { prevus: 3, manques: 0, honores: 1 }],
      [{ lignes: [ligne("aujourdhui", "")] }, { prevus: 3, manques: 0, honores: 1 }],
      [{ lignes: [ligne("tenu", "18:30")] }, { prevus: 3, manques: 0, honores: 3 }],
      [{ lignes: [ligne("tenu", "18:30")] }, { prevus: 3, manques: 1, honores: 2 }],
      [{ lignes: [ligne("manque", "18:30")] }, { prevus: 3, manques: 1, honores: 0 }],
      [{ lignes: [] }, { prevus: 0, manques: 0, honores: 0 }],
      [{}, { prevus: 0, manques: 0, honores: 0 }]
    ];
    for (const [semaine, bilan] of cas) {
      assert.equal(
        motivationCreneaux(semaine, bilan),
        legacy.buildCreneauMotivation(...versLegacy(semaine, bilan)),
        `semaine ${JSON.stringify(semaine.lignes)} / bilan ${JSON.stringify(bilan)}`
      );
    }
  });

  test("le creneau du jour prime sur tout le reste", () => {
    const m = motivationCreneaux(
      { lignes: [ligne("tenu", "08:00"), ligne("aujourdhui", "18:30")] },
      { prevus: 2, manques: 0, honores: 2 }
    );
    assert.match(m, /18:30/);
  });

  test("aucune relance quand un creneau a ete manque", () => {
    // Un manque a deja sa carte « a justifier » : le rappeler ici
    // reviendrait a taper deux fois sur quelqu'un qui a rate sa seance.
    assert.equal(
      motivationCreneaux({ lignes: [ligne("manque", "18:30")] }, { prevus: 3, manques: 1, honores: 2 }),
      null
    );
  });

  test("aucun message quand aucun creneau n'est prevu", () => {
    assert.equal(motivationCreneaux({ lignes: [] }, { prevus: 0, manques: 0, honores: 0 }), null);
  });
});

describe("cle de justification", () => {
  test("un meme creneau a deux dates donne deux cles", () => {
    const a = { slot: { id: "s1" }, date: "2026-03-09" };
    const b = { slot: { id: "s1" }, date: "2026-03-16" };
    assert.notEqual(cleJustification(a), cleJustification(b));
  });

  test("identique a la cle d'index.html", () => {
    // reasonKeyOf n'est pas exposable (fonction locale) : la forme est
    // verrouillee ici, et c'est elle qui doit rester stable — une cle qui
    // changerait ferait reapparaitre toutes les justifications deja donnees.
    assert.equal(cleJustification({ slot: { id: "s1" }, date: "2026-03-09" }), "s1|2026-03-09");
  });
});

describe("heure courante", () => {
  test("toujours sur deux chiffres", () => {
    assert.equal(heureCourante(new Date(2026, 2, 9, 7, 5)), "07:05");
    assert.equal(heureCourante(new Date(2026, 2, 9, 18, 30)), "18:30");
    assert.equal(heureCourante(new Date(2026, 2, 9, 0, 0)), "00:00");
  });
});

describe("couleurs des statuts", () => {
  test("chaque statut designe une couleur qui existe vraiment", async () => {
    // META_STATUTS porte des NOMS de couleurs, pour que la bibliotheque
    // reste utilisable hors du navigateur. Un nom mal orthographie ne
    // provoquerait aucune erreur : la pastille du creneau serait
    // simplement invisible, et personne ne le verrait avant un client.
    const { COLORS } = await import("../app/src/tokens.js");
    for (const [statut, meta] of Object.entries(META_STATUTS)) {
      assert.ok(
        COLORS[meta.couleur],
        `statut « ${statut} » : la couleur « ${meta.couleur} » n'existe pas dans les tokens`
      );
    }
  });

  test("les couleurs correspondent a celles d'index.html", async () => {
    const { COLORS } = await import("../app/src/tokens.js");
    for (const [statut, meta] of Object.entries(META_STATUTS)) {
      const attendu = legacy.SLOT_STATUS_META[statut];
      assert.equal(meta.label, attendu.label, `libelle du statut « ${statut} »`);
      assert.equal(COLORS[meta.couleur], attendu.color, `couleur du statut « ${statut} »`);
    }
  });
});
