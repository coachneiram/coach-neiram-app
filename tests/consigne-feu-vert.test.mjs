/**
 * Coach IA et Feu Vert (18 novembre 2026).
 *
 * Avant : la consigne du Coach IA ne disait rien de Feu Vert. Ces tests
 * verrouillent :
 *   - rien d'ajouté hors formule Feu Vert ;
 *   - pour un membre Feu Vert : formule, parcours, semaine du cycle, les 8
 *     gestes dans l'ordre (fente statique, presse à cuisses), couleurs du
 *     Passeport, 2 séances + bonus dès la semaine 4, charge au vert seulement ;
 *   - les garde-fous : l'IA ne valide jamais un geste ni une couleur, renvoie
 *     vers Marien, aucune promesse de résultat, aucun conseil médical ;
 *   - aucune donnée de santé ni de poids dans le bloc ;
 *   - le branchement de l'écran CoachIA.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const d = new Map();
globalThis.localStorage = {
  getItem: (k) => (d.has(k) ? d.get(k) : null),
  setItem: (k, v) => d.set(k, String(v)),
  removeItem: (k) => d.delete(k),
  key: (i) => [...d.keys()][i] ?? null,
  get length() {
    return d.size;
  }
};

const { contexteFeuVert, GESTES_IA_FEU_VERT, gestesAlignes } = await import("../app/src/lib/consigne-feu-vert.js");
const { construireConsigneCoach } = await import("../app/src/lib/consigne-coach.js");

const base = {
  sex: "homme", age: 34, heightCm: 178, startWeightKg: 80, currentWeightKg: 78, activityLevel: "modere",
  goal: "perte", dietType: "aucun", allergies: ["arachides"]
};
const membre = { ...base, formule: "feuvert", feuVert: { parcours: "basesplus", cohorte: "1", debut: "2027-01-18" } };
const passeport = { squat: { etat: "vert", date: "2027-01-25" }, fente: { etat: "orange", date: "2027-01-28" }, hipthrust: { etat: "vert", date: "2027-01-29" } };

describe("Contexte Feu Vert de la consigne", () => {
  test("hors formule Feu Vert : rien n'est ajouté", () => {
    assert.equal(contexteFeuVert(base, { aujourdhui: "2027-02-01" }), "");
    assert.equal(contexteFeuVert(null), "");
    assert.equal(construireConsigneCoach(base, null, null, contexteFeuVert(base)), construireConsigneCoach(base, null, null));
    assert.doesNotMatch(construireConsigneCoach(base, null, null), /Feu Vert/);
  });

  test("les 8 gestes dans l'ordre du contenu livré, avec la fente statique et la presse à cuisses", () => {
    assert.ok(gestesAlignes());
    const c = contexteFeuVert(membre, { passeport, aujourdhui: "2027-02-01" });
    assert.match(
      c,
      /Les 8 gestes, dans l'ordre : 1\. squat gobelet ; 2\. soulevé de terre roumain aux haltères ; 3\. rowing haltère un bras ; 4\. développé couché aux haltères ; 5\. fente statique ; 6\. gainage planche ; 7\. tirage vertical à la poulie ; 8\. presse à cuisses\./
    );
    assert.equal(GESTES_IA_FEU_VERT.length, 8);
    assert.doesNotMatch(c, /hip\s*thrust|fente arrière|leg press/i);
  });

  test("formule, parcours, semaine du cycle, programme", () => {
    const c = contexteFeuVert(membre, { passeport, aujourdhui: "2027-02-01" });
    assert.match(c, /formule Feu Vert/);
    assert.match(c, /Parcours : Bases\+\. Cohorte 1\./);
    assert.match(c, /Semaine du cycle : 3 sur 6\./);
    assert.match(c, /2 séances par semaine \(séance A et séance B\), plus 1 séance bonus facultative à partir de la semaine 4\./);
    assert.match(contexteFeuVert(membre, { aujourdhui: "2027-01-11" }), /n'a pas commencé : il démarre le .*18 janvier 2027.* \(dans 7 jours\)/);
    assert.match(contexteFeuVert(membre, { aujourdhui: "2027-03-15" }), /cycle de 6 semaines est terminé/);
  });

  test("couleurs du Passeport : celles de Marien, ancien « hipthrust » relu en presse, rouge par défaut", () => {
    const c = contexteFeuVert(membre, { passeport, aujourdhui: "2027-02-01" });
    assert.match(c, /1\. squat gobelet : vert/);
    assert.match(c, /5\. fente statique : orange/);
    assert.match(c, /8\. presse à cuisses : vert/);
    assert.match(c, /2\. soulevé de terre roumain aux haltères : rouge/);
    assert.match(contexteFeuVert(membre, { aujourdhui: "2027-02-01" }), /8\. presse à cuisses : rouge/);
    assert.match(c, /On n'augmente la charge QUE sur un geste vert\./);
  });

  test("garde-fous : jamais de validation à la place de Marien, pas de promesse, pas de conseil médical", () => {
    const c = contexteFeuVert(membre, { passeport, aujourdhui: "2027-02-01" });
    assert.match(c, /corrections vidéo sont faites par Marien sur la plateforme Coach Neiram \(message privé\)/);
    assert.match(c, /Ne parle jamais de WhatsApp pour Feu Vert/);
    assert.doesNotMatch(c.replace("Ne parle jamais de WhatsApp pour Feu Vert", ""), /WhatsApp/i);
    assert.match(c, /Tu ne valides JAMAIS un geste, une technique ni une couleur/);
    assert.match(c, /renvoie vers Marien/);
    assert.match(c, /Aucune promesse de résultat/);
    assert.match(c, /Aucun conseil médical/);
    assert.match(c, /ne remplace pas un avis médical ou kiné/);
  });

  test("aucune donnée de santé, de poids ni d'identité dans le bloc Feu Vert", () => {
    const c = contexteFeuVert({ ...membre, name: "Léa Martin", phone: "0600000000", sante: "asthme" }, { passeport, aujourdhui: "2027-02-01" });
    assert.doesNotMatch(c, /78|80 ?kg|178|34 ans|Léa|0600000000|asthme|arachide/i);
  });

  test("dans la consigne complète : après la fiche client, en mode prudent comme en mode normal", () => {
    const bloc = contexteFeuVert(membre, { passeport, aujourdhui: "2027-02-01" });
    const normal = construireConsigneCoach(membre, null, null, bloc);
    assert.ok(normal.includes(bloc));
    assert.ok(normal.indexOf("CLIENT :") < normal.indexOf("FEU VERT"));
    // Garde-fous existants intacts.
    assert.match(normal, /Tu n'es pas médecin/);
    assert.match(normal, /Allergies et intolérances déclarées : Arachides/);
    const prudent = construireConsigneCoach({ ...membre, allergies: undefined }, null, null, bloc);
    assert.ok(prudent.includes(bloc));
    assert.match(prudent, /NE SONT PAS CONNUES DE FAÇON FIABLE/);
  });

  test("l'écran Coach IA passe le contexte Feu Vert (Passeport du serveur, date du jour)", () => {
    const ecran = readFileSync(new URL("../app/src/ecrans/CoachIA.jsx", import.meta.url), "utf8");
    assert.match(ecran, /import \{ contexteFeuVert \} from "\.\.\/lib\/consigne-feu-vert\.js"/);
    assert.match(ecran, /contexteFeuVert\(profile, \{ passeport: serveurFeuVert && serveurFeuVert\.passeport, aujourdhui: todayISO\(\) \}\)/);
    assert.match(ecran, /construireConsigneCoach\(profile, targets, restant, feuVert\)/);
  });
});
