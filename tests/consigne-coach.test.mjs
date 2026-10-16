/**
 * Coach nutrition IA : regime et allergies dans la consigne (audit P0-1,
 * 17 octobre 2026).
 *
 * Cause demontree : App.jsx rendait <Repas> sans `construireConsigne`,
 * donc CoachIA envoyait `systemPrompt: undefined` au proxy. Ces tests
 * verrouillent :
 *   - le contexte REELLEMENT construit pour chaque profil type ;
 *   - le mode prudent quand les allergies sont inconnues ou illisibles ;
 *   - la presence des contraintes dans la requete envoyee au proxy ;
 *   - le branchement de l'ecran (plus de prop a faire descendre) ;
 *   - la relecture deterministe des reponses.
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  avecAllergiesDeclarees,
  conseilsAlimentairesSurs,
  construireConsigneCoach,
  lireContraintes,
  verifierReponse
} from "../app/src/lib/consigne-coach.js";

const base = {
  sex: "homme", age: 34, heightCm: 178, startWeightKg: 80, activityLevel: "modere",
  goal: "perte", dietType: "aucun", allergies: []
};
const cibles = { calories: 2200, protein: 160, carbs: 220, fat: 70 };
const restant = { kcal: 900, p: 60, c: 90, f: 25, consumed: { kcal: 1300 } };

const lignePrivilegier = (consigne, famille) =>
  (consigne.split("\n").find((l) => l.startsWith(famille + " : ")) || "");

describe("La consigne construite pour chaque profil", () => {
  test("sans restriction : objectif, macros du jour, aliments du coach, garde-fou medical", () => {
    const c = construireConsigneCoach(base, cibles, restant);
    assert.match(c, /Objectif : Perte de poids\./);
    assert.match(c, /Régime : aucune restriction déclarée\./);
    assert.match(c, /Allergies et intolérances : aucune déclarée\./);
    assert.match(c, /Objectifs journaliers : 2200 kcal, P 160 g, G 220 g, L 70 g\./);
    assert.match(c, /il reste 900 kcal \(P 60 g, G 90 g, L 25 g\)/);
    assert.match(c, /Tu n'es pas médecin/);
    assert.match(c, /ALIMENTS À PRIVILÉGIER/);
    assert.match(lignePrivilegier(c, "Protéines"), /Blanc de poulet|poulet/i);
    assert.ok(!/NE SONT PAS CONNUES/.test(c));
  });

  test("vegetarien : regime nomme, ni viande ni poisson dans les aliments proposes", () => {
    const c = construireConsigneCoach({ ...base, dietType: "vegetarien" }, cibles, restant);
    assert.match(c, /Régime : Végétarien\./);
    const prot = lignePrivilegier(c, "Protéines");
    assert.ok(prot.length > 20, "il reste des proteines vegetariennes");
    assert.ok(!/poulet|dinde|b(œ|oe)uf|thon|saumon|cabillaud|colin|crevette/i.test(prot), prot);
  });

  test("vegane : ni produit animal ni oeuf ni laitage dans les aliments proposes", () => {
    const c = construireConsigneCoach({ ...base, dietType: "vegetalien" }, cibles, restant);
    assert.match(c, /Régime : Végétalien \/ vegan\./);
    const tout = ["Protéines", "Glucides", "Lipides"].map((f) => lignePrivilegier(c, f)).join(" ");
    assert.ok(!/whey|fromage|skyr|yaourt|(œ|oe)uf|poulet|thon|saumon/i.test(tout), tout);
  });

  test("une allergie declaree : nommee, et l'allergene absent des listes", () => {
    const c = construireConsigneCoach({ ...base, allergies: ["arachides"] }, cibles, restant);
    assert.match(c, /Allergies et intolérances déclarées : Arachides\./);
    assert.match(c, /Ne propose JAMAIS un aliment, une recette ou un ingrédient qui contient un allergène déclaré/);
    const listes = c.slice(c.indexOf("ALIMENTS À PRIVILÉGIER"));
    assert.ok(!/cacahu|arachide/i.test(listes), "aucun aliment a l'arachide propose");
  });

  test("plusieurs allergies : toutes nommees, aucune dans les listes", () => {
    const c = construireConsigneCoach({ ...base, allergies: ["lactose", "oeufs", "fruits-a-coque"] }, cibles, restant);
    assert.match(c, /Allergies et intolérances déclarées : Lactose \/ produits laitiers, Œufs, Fruits à coque\./);
    const listes = c.slice(c.indexOf("ALIMENTS À PRIVILÉGIER"), c.indexOf("Rappel énergie"));
    assert.ok(!/whey|skyr|fromage|yaourt|beurre(?! de cacahu)|crème|(?<!\p{L})(œ|oe)ufs?|amandes?|noix(?! de coco)|noisettes?|cajou/iu.test(listes), listes);
  });

  test("aucun profil type ne recoit un aliment exclu dans les listes, equivalences comprises", () => {
    // Relu avec les detecteurs de l'application : ce qui a ete trouve en
    // ecrivant ce test (beurre et crème fraîche dans les equivalences des
    // lipides, sans etiquette) ne peut plus revenir.
    const profils = [
      { dietType: "vegetarien" }, { dietType: "vegetalien" }, { dietType: "pescetarien" }, { dietType: "sans-porc" },
      ...["gluten", "lactose", "arachides", "fruits-a-coque", "oeufs", "poisson", "crustaces", "soja"].map((a) => ({ allergies: [a] })),
      { allergies: ["lactose", "oeufs", "fruits-a-coque", "soja", "gluten"], dietType: "vegetalien" }
    ];
    for (const extra of profils) {
      const p = { ...base, ...extra };
      const c = construireConsigneCoach(p, cibles, null);
      // Seul le contenu des lignes compte : leurs titres (« portion
      // équivalente à ~120 g de viande/poisson ») sont des unites de mesure.
      const listes = c
        .slice(c.indexOf("ALIMENTS À PRIVILÉGIER"), c.indexOf("Rappel énergie"))
        .split("\n")
        .filter((l) => l.includes(" : "))
        .map((l) => l.slice(l.indexOf(" : ") + 3))
        .join("\n");
      assert.deepEqual(verifierReponse(listes, p).alertes.map((a) => a.mot), [], JSON.stringify(extra));
    }
  });

  test("regime et repartition sont deux informations distinctes", () => {
    const c = construireConsigneCoach({ ...base, dietType: "pescetarien", repartitionMacros: "lowcarb" }, cibles, null);
    assert.match(c, /Régime : Pescétarien/);
    assert.match(c, /Répartition des macros : Pauvre en glucides/);
  });
});

describe("Profil incomplet ou donnees illisibles : jamais de conseil alimentaire precis", () => {
  const prudent = (c) => {
    assert.match(c, /NE SONT PAS CONNUES DE FAÇON FIABLE/);
    assert.match(c, /Ne propose AUCUN aliment, repas, recette ou quantité précis/);
    assert.ok(!c.includes("ALIMENTS À PRIVILÉGIER"), "les listes d'aliments ne sont pas envoyees");
    assert.ok(!c.includes("ÉQUIVALENCES"));
  };

  test("champ allergies absent : inconnu, et le modele doit le demander", () => {
    const { allergies, ...sans } = base;
    const k = lireContraintes(sans);
    assert.equal(k.etat, "inconnu");
    assert.equal(conseilsAlimentairesSurs(k), false);
    const c = construireConsigneCoach(sans, cibles, restant);
    assert.match(c, /Allergies et intolérances : INCONNUES/);
    prudent(c);
  });

  test("profil absent (null, tableau, texte) : inconnu, aucune exception", () => {
    for (const p of [null, undefined, [], "profil"]) {
      const c = construireConsigneCoach(p, null, null);
      assert.match(c, /Objectif : non défini\./);
      prudent(c);
    }
  });

  test("allergies mal formees : illisible, la valeur brute est transmise sans etre interpretee", () => {
    const k = lireContraintes({ ...base, allergies: "arachides, gluten" });
    assert.equal(k.etat, "illisible");
    const c = construireConsigneCoach({ ...base, allergies: "arachides, gluten" }, cibles, null);
    assert.match(c, /INFORMATION ILLISIBLE.*« arachides, gluten »/);
    prudent(c);
  });

  test("tableau melange : les valeurs lisibles sont gardees, le reste rend le profil illisible", () => {
    const k = lireContraintes({ ...base, allergies: ["gluten", 42, null] });
    assert.equal(k.etat, "illisible");
    assert.deepEqual(k.allergies, ["gluten"]);
    const c = construireConsigneCoach({ ...base, allergies: ["gluten", 42] }, cibles, null);
    assert.match(c, /valeurs lisibles : Gluten/);
    prudent(c);
  });

  test("allergie hors liste : transmise telle quelle, conseils permis, mais signalee non verifiable", () => {
    const p = { ...base, allergies: ["sesame"] };
    const k = lireContraintes(p);
    assert.equal(k.etat, "ok");
    assert.deepEqual(k.horsListe, ["sesame"]);
    assert.match(construireConsigneCoach(p, cibles, null), /déclarées : sesame\./);
    assert.deepEqual(verifierReponse("Un bol de riz.", p).nonVerifiables, ["sesame"]);
  });

  test("enregistrer le formulaire declare « aucune » si le champ manquait, sans toucher une valeur presente", () => {
    const { allergies, ...sans } = base;
    assert.deepEqual(avecAllergiesDeclarees(sans).allergies, []);
    assert.equal(avecAllergiesDeclarees({ ...base, allergies: "arachides" }).allergies, "arachides");
    assert.deepEqual(avecAllergiesDeclarees({ ...base, allergies: ["soja"] }).allergies, ["soja"]);
  });
});

describe("Relecture deterministe des reponses", () => {
  test("allergene declare cite dans la reponse : alerte", () => {
    const r = verifierReponse("Prends 30 g de beurre de cacahuète sur ton pain.", { ...base, allergies: ["arachides"] });
    assert.deepEqual(r.alertes.map((a) => [a.famille, a.motif]), [["arachides", "allergie"]]);
    assert.match(r.alertes[0].mot, /cacahuète/i);
  });

  test("plusieurs allergies, une seule citee : une seule alerte", () => {
    const r = verifierReponse("Un skyr nature avec des fruits rouges.", { ...base, allergies: ["lactose", "oeufs"] });
    assert.deepEqual(r.alertes.map((a) => a.famille), ["lactose"]);
  });

  test("regime : du poulet propose a un vegetarien, du miel a un vegan", () => {
    assert.deepEqual(verifierReponse("150 g de poulet grillé.", { ...base, dietType: "vegetarien" }).alertes.map((a) => [a.famille, a.motif]), [["volaille", "regime"]]);
    assert.deepEqual(verifierReponse("Un filet de miel.", { ...base, dietType: "vegetalien" }).alertes.map((a) => a.famille), ["miel"]);
  });

  test("reponse propre : rien a signaler", () => {
    const r = verifierReponse("200 g de lentilles corail et du riz basmati.", { ...base, allergies: ["arachides", "lactose"], dietType: "vegetalien" });
    assert.deepEqual(r, { alertes: [], nonVerifiables: [] });
  });

  test("le lait d'amande alerte un allergique aux fruits a coque, pas un intolerant au lactose", () => {
    assert.deepEqual(verifierReponse("Un verre de lait d'amande.", { ...base, allergies: ["fruits-a-coque"] }).alertes.map((a) => a.famille), ["fruits-a-coque"]);
    assert.deepEqual(verifierReponse("Un verre de lait d'amande.", { ...base, allergies: ["lactose"] }).alertes, []);
  });

  test("texte vide ou absent : aucune exception", () => {
    assert.deepEqual(verifierReponse(undefined, base).alertes, []);
    assert.deepEqual(verifierReponse("", null).alertes, []);
  });
});

describe("La requete envoyee au modele contient les contraintes", () => {
  let corps = null;
  const fetchOrigine = globalThis.fetch;
  beforeEach(() => {
    corps = null;
    globalThis.fetch = async (url, init) => {
      corps = JSON.parse(init.body);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), { status: 200 });
    };
  });
  afterEach(() => {
    globalThis.fetch = fetchOrigine;
  });

  test("systemPrompt du corps envoye au proxy : allergies et regime presents", async () => {
    const { genererTexte } = await import("../app/src/lib/ia.js");
    const profil = { ...base, dietType: "vegetarien", allergies: ["soja", "gluten"] };
    await genererTexte({
      history: [{ role: "user", text: "Idée de dîner ?" }],
      systemPrompt: construireConsigneCoach(profil, cibles, restant),
      maxTokens: 700
    });
    assert.ok(corps && typeof corps.systemPrompt === "string", "un systemPrompt est envoye");
    assert.match(corps.systemPrompt, /Allergies et intolérances déclarées : Soja, Gluten\./);
    assert.match(corps.systemPrompt, /Régime : Végétarien\./);
  });
});

describe("Branchement de l'ecran", () => {
  const coach = readFileSync(new URL("../app/src/ecrans/CoachIA.jsx", import.meta.url), "utf8");
  const repas = readFileSync(new URL("../app/src/ecrans/Repas.jsx", import.meta.url), "utf8");

  test("CoachIA construit lui-meme la consigne et relit chaque reponse", () => {
    assert.match(coach, /systemPrompt: construireConsigneCoach\(profile, targets, restant\)/);
    assert.match(coach, /verifierReponse\(texte, profile\)/);
  });

  test("plus aucune prop de consigne a faire descendre (la cause du P0-1)", () => {
    assert.ok(!/construireConsigne[^C]/.test(coach), "CoachIA n'attend plus de prop");
    assert.ok(!/construireConsigne/.test(repas), "Repas ne relaie plus de prop");
  });
});

describe("Les bilans IA suivent la meme regle", () => {
  test("allergies connues : phrase d'origine ; inconnues : aucun aliment precis", async () => {
    const { promptBilanHebdo, regleAlimentaire } = await import("../app/src/lib/bilan-ia.js");
    assert.equal(regleAlimentaire(base), "Toute suggestion alimentaire doit respecter le régime et les allergies/intolérances indiqués.");
    const { allergies, ...sans } = base;
    assert.match(regleAlimentaire(sans), /ne propose aucun aliment, repas ni recette précis/);
    const semaine = { start: "2026-10-05", end: "2026-10-11" };
    assert.match(promptBilanHebdo({ weekStats: semaine, lastWeekStats: null, profile: sans, lastActionsText: null }), /ne propose aucun aliment, repas ni recette précis/);
  });
});
