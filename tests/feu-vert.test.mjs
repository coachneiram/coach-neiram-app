/**
 * Feu Vert (coaching collectif débutants, 14 novembre 2026).
 *
 * Ce qui est vérifié ici, c'est ce qui est VENDU : 8 gestes avec leur fiche,
 * 6 semaines de séances A et B pour les deux parcours, bonus S4-S6,
 * 4 missions, 6 modules ; niveaux aux seuils 2 / 5 / 8 ; charge bloquée tant
 * que le geste n'est pas vert ; Passeport en lecture seule, gardé hors
 * ligne ; check-in du lundi relayé au coach ; tableau de régularité
 * (points, série, ordre alphabétique) ; jamais de poids ni de photo.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (c) => readFileSync(join(ICI, "..", c), "utf8");

function installerStockage() {
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
  return d;
}
installerStockage();

const FV = await import("../app/src/lib/feu-vert.js");
const { ongletsPour, ONGLETS } = await import("../app/src/lib/onglets.js");
const { TYPES_EVENEMENTS, synchroActive } = await import("../app/src/lib/synchro-coach.js");
const { niveauAlerte } = await import("../app/src/lib/gravite-alertes.js");
const { CLE_ACCES } = await import("../app/src/lib/acces.js");
const { estCleClient } = await import("../app/src/lib/stockage.js");
const { URL_PLATEFORME } = await import("../app/src/lib/plateforme.js");

const C = FV.CONTENU_FEU_VERT;
const PROFIL = { name: "Léa", formule: "feuvert", feuVert: { parcours: "reprise", cohorte: "1", debut: "2027-01-18" } };
const R = FV.reglagesFeuVert(PROFIL);

describe("contenu livré = contenu vendu", () => {
  test("8 gestes, chacun avec fiche complète et champ vidéo", () => {
    assert.deepEqual(
      C.gestes.map((g) => g.id),
      ["squat", "rdl", "rowing", "developpe", "fente", "gainage", "tirage", "presse"]
    );
    for (const g of C.gestes) {
      assert.ok(g.objectif && g.filmer && g.facilitee, g.id);
      assert.ok(g.pointsCles.length >= 4, g.id + " : points clés");
      assert.ok(g.criteres.some((c) => c.code.startsWith("S")) && g.criteres.some((c) => c.code.startsWith("Q")), g.id + " : critères S et Q");
      assert.equal(typeof g.video, "string");
    }
  });

  test("geste 8 = presse à cuisses (décision du 18/11/2026) : textes de la spécification, vidéo fournie par Marien", () => {
    const g = FV.gesteParId("presse");
    assert.equal(g.numero, 8);
    assert.equal(g.nom, "Presse à cuisses");
    assert.equal(g.objectif, "renforcer les cuisses et les fessiers sur une machine guidée, le dos calé contre le dossier.");
    assert.equal(g.miseEnPlace.length, 3);
    assert.equal(g.pointsCles.length, 4);
    assert.equal(g.erreurs.length, 3);
    assert.deepEqual(g.criteres.map((c) => c.code), ["S1", "S2", "S3", "Q1", "Q2", "Q3"]);
    assert.match(g.filmer, /^profil strict \(90°\)/);
    assert.match(g.facilitee, /squat sur banc/);
    assert.equal(g.video, "https://youtube.com/shorts/YuLA9MY2sXg", "presse à deux jambes, même format que les autres gestes");
    assert.equal(FV.gesteParId("hipthrust"), null);
    // Ni la vidéo « presse unilatérale » ni celle du hip thrust.
    const texte = lire("app/src/lib/feu-vert-contenu.js");
    assert.ok(!/fDgGwvcHefI|rA6QacIDBPE/.test(texte));
    assert.ok(!/hip\s*thrust|hipthrust|pont fessier/i.test(texte), "plus aucune mention du hip thrust dans Feu Vert");
    assert.ok(!/leg press/i.test(texte));
    // Même dosage que l'ancien hip thrust, même place (séance B).
    const s1 = C.semaines[0].B.find((e) => e.geste === "presse");
    assert.equal(s1.libelle, "Presse à cuisses (ou squat sur banc)");
    assert.deepEqual([s1.reprise, s1.basesplus, s1.repos, s1.consigne], ["2 × 10", "3 × 10", "90 s", "3-1-1 · effort 5"]);
    for (const s of C.semaines) assert.ok(s.B.some((e) => e.geste === "presse"), "S" + s.numero);
    assert.match(JSON.stringify(C.semaines.map((s) => s.bonus || null)), /rowing haltère → presse à cuisses → gainage/);
  });

  test("geste 5 = fente statique (décision du 18/11/2026) : textes de la spécification, même id, même vidéo, même dosage", () => {
    const g = FV.gesteParId("fente");
    assert.equal(g.numero, 5);
    assert.equal(g.nom, "Fente statique (split squat)");
    assert.equal(g.nom.split(" (")[0], "Fente statique", "nom court des listes et du Passeport");
    assert.equal(g.objectif, "travailler une jambe à la fois et l'équilibre. Utile pour monter des escaliers, porter un enfant, se relever du sol.");
    assert.deepEqual(g.miseEnPlace, [
      "Debout, un haltère dans chaque main le long du corps (ou sans charge).",
      "Fais un grand pas en avant et garde cet écart : pied avant à plat, talon arrière décollé, pieds écartés de la largeur des hanches (comme sur des rails, pas sur une ligne).",
      "Regard devant."
    ]);
    assert.equal(g.pointsCles[0], "Les pieds ne bougent pas pendant toute la série : tu montes et tu descends sur place.");
    assert.equal(g.pointsCles[3], "Tu remontes en poussant dans tout le pied avant, sans verrouiller les genoux. Toutes les répétitions d'un côté, puis l'autre.");
    assert.equal(g.erreurs[1], "L'écart trop court : le talon avant décolle et le genou avant part loin devant.");
    assert.deepEqual(g.criteres.map((c) => c.code), ["S1", "S2", "Q1", "Q2", "Q3"]);
    assert.equal(g.criteres[4].texte, "pieds immobiles d'un bout à l'autre de la série (aucun pas de rattrapage).");
    assert.equal(g.facilitee, "fente statique en tenant un support (poteau, rack) d'une main, amplitude réduite, sans charge.");
    assert.equal(g.video, "https://youtube.com/shorts/r3aZfPPVmQg");
    // Plus aucune fente arrière dans Feu Vert (le catalogue général garde sa « Fente arrière dynamique »).
    assert.ok(!/fente arri/i.test(lire("app/src/lib/feu-vert-contenu.js")));
    assert.ok(!/recules un pied|ramènes le pied/i.test(lire("app/src/lib/feu-vert-contenu.js")));
    assert.match(lire("app/src/lib/catalogues.js"), /Fente arrière dynamique/);
    // Dosage inchangé : semaine 1 avec appui si besoin, / jambe partout.
    const s1 = C.semaines[0].B.find((e) => e.geste === "fente");
    assert.equal(s1.libelle, "Fente statique (avec appui si besoin)");
    assert.deepEqual([s1.reprise, s1.basesplus, s1.repos, s1.consigne], ["2 × 8 / jambe", "3 × 8 / jambe", "90 s", "3-1-1 · effort 5"]);
    for (const s of C.semaines.slice(1)) assert.equal(s.B.find((e) => e.geste === "fente").libelle, "Fente statique", "S" + s.numero);
    assert.match(JSON.stringify(C.semaines.map((s) => s.bonus || null)), /développé haltères → fente statique → tirage poulie/);
    const alt = C.alternatives.find((a) => /^Fente/.test(a.geste));
    assert.deepEqual(alt, { geste: "Fente statique", alt1: "Fente statique au poids du corps, tempo 3-1-1", alt2: "Montée sur banc/step (step-up), 1 jambe à la fois" });
  });

  test("6 semaines : A et B pour les deux parcours, bonus S4 à S6 seulement", () => {
    assert.equal(C.semaines.length, 6);
    for (const s of C.semaines) {
      for (const l of ["A", "B"]) {
        assert.equal(s[l].length, 5, `S${s.numero} ${l} : 4 gestes + complément`);
        for (const e of s[l]) assert.ok(e.reprise && e.basesplus && e.repos, `S${s.numero} ${l} ${e.libelle}`);
      }
      assert.equal(!!s.bonus, s.numero >= 4, "bonus S" + s.numero);
    }
    // Séance A = gestes 1 à 4, séance B = gestes 5 à 8 (dans l'ordre du programme).
    assert.deepEqual(C.semaines[0].A.slice(0, 4).map((e) => e.geste), ["squat", "rdl", "rowing", "developpe"]);
    assert.deepEqual(new Set(C.semaines[0].B.slice(0, 4).map((e) => e.geste)), new Set(["fente", "gainage", "tirage", "presse"]));
    assert.equal(FV.seanceFeuVert(1, "A", "reprise").exercices[0].series, "2 × 10");
    assert.equal(FV.seanceFeuVert(1, "A", "basesplus").exercices[0].series, "3 × 10");
    assert.deepEqual(FV.seancesDisponibles(3), ["A", "B"]);
    assert.deepEqual(FV.seancesDisponibles(4), ["A", "B", "bonus"]);
    assert.equal(FV.seanceFeuVert(4, "bonus", "basesplus").blocs[1].volume, "3 tours");
    assert.match(FV.seanceFeuVert(6, "bonus", "reprise").texte, /construis ta séance/);
  });

  test("4 missions, 6 modules (1 par semaine), avertissement sans promesse", () => {
    assert.equal(C.missions.length, 4);
    assert.equal(C.modules.length, 6);
    for (let n = 1; n <= 6; n++) assert.equal(FV.moduleDeLaSemaine(n).semaine, n);
    assert.match(C.avertissementMental, /ne remplacent pas un accompagnement psychologique/);
    assert.deepEqual(FV.missionsDeLaSemaine(1), [1]);
    assert.deepEqual(FV.missionsDeLaSemaine(2), [1]);
    assert.deepEqual(FV.missionsDeLaSemaine(5), [4]);
    assert.deepEqual(FV.missionsDeLaSemaine(6, { 1: { semaine: 1 }, 3: { semaine: 4 } }), [2, 4]);
  });
});

describe("réglage et onglets", () => {
  test("formule désactivée : barre inchangée ; active : l'onglet Feu Vert seul (25/11/2026)", () => {
    assert.equal(ongletsPour({}), ONGLETS);
    assert.equal(ongletsPour(null), ONGLETS);
    assert.deepEqual(ongletsPour(PROFIL).map((o) => o.id), ["feuvert"]);
  });

  test("valeurs par défaut : cohorte 1, lundi 18 janvier 2027, parcours Reprise", () => {
    assert.deepEqual({ ...FV.reglagesFeuVert({ formule: "feuvert" }) }, { parcours: "reprise", cohorte: "1", debut: "2027-01-18" });
    assert.equal(FV.reglagesFeuVert({ feuVert: { parcours: "basesplus" } }).parcours, "basesplus");
  });

  test("le pointage et le check-in partent au coach en Feu Vert, sans réglage en ligne", () => {
    assert.equal(synchroActive(PROFIL), true);
    assert.equal(synchroActive({ name: "X" }), false);
  });
});

describe("calendrier", () => {
  test("semaine courante calculée depuis la date de début", () => {
    assert.deepEqual({ ...FV.semaineFeuVert("2027-01-18", "2027-01-10") }, { etat: "avant", numero: 1, joursAvant: 8 });
    assert.equal(FV.semaineFeuVert("2027-01-18", "2027-01-18").numero, 1);
    assert.equal(FV.semaineFeuVert("2027-01-18", "2027-01-24").numero, 1);
    assert.equal(FV.semaineFeuVert("2027-01-18", "2027-01-25").numero, 2);
    assert.equal(FV.semaineFeuVert("2027-01-18", "2027-02-28").numero, 6);
    assert.equal(FV.semaineFeuVert("2027-01-18", "2027-03-01").etat, "termine");
    assert.deepEqual({ ...FV.datesSemaine("2027-01-18", 3) }, { du: "2027-02-01", au: "2027-02-07" });
  });

  test("check-in : la semaine écoulée, premier le lundi 25 janvier, dernier le lundi 1er mars", () => {
    assert.equal(FV.semaineDuCheckin("2027-01-18", "2027-01-20"), null);
    assert.equal(FV.semaineDuCheckin("2027-01-18", "2027-01-25"), 1);
    assert.equal(FV.semaineDuCheckin("2027-01-18", "2027-03-01"), 6);
    assert.equal(FV.semaineDuCheckin("2027-01-18", "2027-03-15"), null);
    assert.equal(FV.checkinAttendu("2027-01-18", "2027-01-25", {}), true, "lundi 25 janvier : bandeau");
    assert.equal(FV.checkinAttendu("2027-01-18", "2027-01-26", {}), false, "mardi : pas de bandeau");
    assert.equal(FV.checkinAttendu("2027-01-18", "2027-01-25", { 1: { envoyeLe: "x" } }), false, "déjà envoyé");
  });
});

describe("Passeport", () => {
  test("rouge par défaut, niveaux 0 à 4 aux seuils 2 / 5 / 8", () => {
    assert.equal(FV.etatGeste({}, "squat"), "rouge");
    assert.equal(FV.etatGeste({ squat: { etat: "inconnu" } }, "squat"), "rouge");
    assert.equal(FV.niveauPasseport({}).niveau, 0);
    assert.equal(FV.niveauPasseport({ squat: { etat: "rouge", date: "2027-01-21" } }).niveau, 1, "filmé et corrigé, encore rouge");
    assert.equal(FV.niveauPasseport({ squat: { etat: "orange", date: "" } }).niveau, 1);
    const verts = (n) => Object.fromEntries(C.gestes.slice(0, n).map((g) => [g.id, { etat: "vert", date: "2027-02-01" }]));
    assert.equal(FV.niveauPasseport(verts(1)).niveau, 1);
    assert.equal(FV.niveauPasseport(verts(2)).niveau, 2);
    assert.equal(FV.niveauPasseport(verts(4)).niveau, 2);
    assert.equal(FV.niveauPasseport(verts(5)).niveau, 3);
    assert.equal(FV.niveauPasseport(verts(8)).niveau, 4);
    assert.equal(FV.niveauPasseport(verts(8)).suivant, null);
    assert.equal(FV.niveauPasseport(verts(3)).suivant.manque, 2);
  });

  test("geste 8 : un ancien Passeport avec « hipthrust » s'affiche sous « presse »", () => {
    const ancien = { squat: { etat: "vert", date: "2027-01-25" }, hipthrust: { etat: "orange", date: "2027-02-05" } };
    assert.equal(FV.etatGeste(ancien, "presse"), "orange");
    assert.deepEqual(FV.normaliserPasseport(ancien), { squat: { etat: "vert", date: "2027-01-25" }, presse: { etat: "orange", date: "2027-02-05" } });
    assert.ok("hipthrust" in ancien, "l'objet reçu n'est pas modifié");
    // Les deux présents : le nouvel identifiant l'emporte.
    assert.equal(FV.etatGeste({ presse: { etat: "vert" }, hipthrust: { etat: "rouge" } }, "presse"), "vert");
    // Le niveau compte l'ancien identifiant comme le geste 8.
    const huitVerts = Object.fromEntries(["squat", "rdl", "rowing", "developpe", "fente", "gainage", "tirage", "hipthrust"].map((id) => [id, { etat: "vert", date: "2027-02-20" }]));
    assert.equal(FV.niveauPasseport(huitVerts).niveau, 4);
    assert.deepEqual(FV.normaliserPasseport(null), {});
  });

  test("geste 8 : l'envoi au Worker garde une copie « hipthrust » (Worker pas encore recollé)", async () => {
    const { passeportPourEnvoi } = await import("../app/src/lib/feu-vert-passeport.js");
    assert.deepEqual(passeportPourEnvoi({ presse: { etat: "vert", date: "2027-02-12" } }), { presse: { etat: "vert", date: "2027-02-12" }, hipthrust: { etat: "vert", date: "2027-02-12" } });
    assert.deepEqual(passeportPourEnvoi({ hipthrust: { etat: "orange", date: "" } }), { presse: { etat: "orange", date: "" }, hipthrust: { etat: "orange", date: "" } });
    assert.deepEqual(passeportPourEnvoi({ squat: { etat: "vert", date: "" } }), { squat: { etat: "vert", date: "" } });
    const E = await import("../app/src/lib/espace-coach.js");
    const appels = [];
    const env = { fetch: async (url, init) => (appels.push(JSON.parse(init.body)), { ok: true, status: 200, json: async () => ({ ok: true }) }) };
    await E.feuVertEnregistrer({ client: "c1", cohorte: "1", passeport: { presse: { etat: "vert", date: "2027-02-12" } }, missions: {} }, "secret-de-test-assez-long-0123456789", env);
    assert.equal(appels[0].passeport.presse.etat, "vert");
    assert.equal(appels[0].passeport.hipthrust.etat, "vert");
  });

  test("hors ligne : un Passeport reçu avec « hipthrust » est gardé sous « presse »", async () => {
    installerStockage();
    localStorage.setItem(CLE_ACCES, JSON.stringify({ jeton: "j".repeat(30), libelle: "Léa B." }));
    const reponse = { ok: true, inscrit: true, cohorte: "1", passeport: { hipthrust: { etat: "vert", date: "2027-02-05" } }, missions: {}, majLe: 1 };
    const r = await FV.actualiserPasseport({ localStorage, fetch: async () => ({ ok: true, json: async () => reponse }) });
    assert.deepEqual(r.serveur.passeport, { presse: { etat: "vert", date: "2027-02-05" } });
  });

  test("charge bloquée tant que le geste n'est pas vert", () => {
    assert.equal(FV.chargeBloquee("rouge"), true);
    assert.equal(FV.chargeBloquee("orange"), true);
    assert.equal(FV.chargeBloquee("vert"), false);
    assert.match(FV.REGLES_FEU_VERT.bloquee, /Charge bloquée tant que le geste n'est pas vert/);
  });

  test("lecture seule : l'écran n'écrit jamais l'état d'un geste, seule la route /feuvert/etat le fournit", () => {
    const ecran = lire("app/src/ecrans/FeuVert.jsx");
    const lib = lire("app/src/lib/feu-vert.js");
    assert.ok(!/passeport\s*:/.test(ecran.replace(/\/\*[\s\S]*?\*\//g, "")), "aucune écriture du passeport depuis l'écran");
    assert.ok(!/"\/admin/.test(lib + ecran), "aucune route d'admin depuis l'app des membres");
    assert.match(lib, /"\/feuvert\/etat"/);
  });

  test("hors ligne : la dernière valeur reçue est gardée et resservie, avec l'erreur", async () => {
    installerStockage();
    localStorage.setItem(CLE_ACCES, JSON.stringify({ jeton: "j".repeat(30), libelle: "Léa B." }));
    const reponse = { ok: true, inscrit: true, cohorte: "1", passeport: { squat: { etat: "orange", date: "2027-01-22" } }, missions: { 1: { semaine: 1 } }, majLe: 1 };
    const appels = [];
    const enLigne = { localStorage, fetch: async (url, init) => (appels.push({ url, init }), { ok: true, json: async () => reponse }) };
    const r1 = await FV.actualiserPasseport(enLigne);
    assert.equal(r1.erreur, null);
    assert.match(appels[0].url, /\/feuvert\/etat$/);
    assert.equal(appels[0].init.headers.Authorization, "Bearer " + "j".repeat(30));
    const horsLigne = { localStorage, fetch: async () => { throw new Error("hors ligne"); } };
    const r2 = await FV.actualiserPasseport(horsLigne);
    assert.equal(r2.erreur, "reseau");
    assert.equal(r2.serveur.passeport.squat.etat, "orange");
    assert.ok(estCleClient(FV.CLE_FEU_VERT), "dans la sauvegarde (préfixe cn_)");
  });

  test("sans code d'accès : rien ne part, message pour activer le code", async () => {
    installerStockage();
    let appels = 0;
    const r = await FV.actualiserPasseport({ localStorage, fetch: async () => (appels++, {}) });
    assert.equal(r.erreur, "sans-acces");
    assert.equal(appels, 0);
    assert.match(FV.MSG_FEU_VERT["sans-acces"], /code d'accès/);
  });
});

describe("pointage, check-in, vidéos", () => {
  beforeEach(() => installerStockage());

  test("pointage : même forme que le pointage existant, étiqueté Feu Vert, compté une fois par séance", () => {
    const { seance, evenement } = FV.pointageFeuVert({ date: "2027-01-19", heure: "18:30", semaine: 1, lettre: "A", reglages: R, charges: { squat: "8" } });
    assert.equal(evenement.type, "pointage");
    assert.match(evenement.note, /Feu Vert S1 · séance A · Reprise · charges : Squat gobelet 8 kg/);
    assert.deepEqual({ ...seance.feuVert }, { semaine: 1, seance: "A", cohorte: "1", parcours: "reprise" });
    const b = FV.pointageFeuVert({ date: "2027-01-21", semaine: 1, lettre: "B", reglages: R }).seance;
    const autreCohorte = { ...b, feuVert: { ...b.feuVert, cohorte: "2" } };
    assert.deepEqual({ ...FV.compteSemaine([seance, seance, b, autreCohorte], 1, "1") }, { seances: 2, bonus: 0 });
    const bonus = FV.pointageFeuVert({ date: "2027-02-12", semaine: 4, lettre: "bonus", reglages: R }).seance;
    assert.equal(FV.compteSemaine([bonus], 4, "1").bonus, 1);
  });

  test("check-in : type dédié, connu de l'app, du proxy et du script ; niveau info (pas de mail)", () => {
    const e = FV.evenementCheckin({
      semaine: 4, seances: 2, bonus: 1, victoire: " Zone haltères ! ", blocage: "Le regard des autres",
      missions: [{ numero: 3, faite: true }], reglages: R, aujourdhui: "2027-02-15"
    });
    assert.equal(e.type, "checkin_feu_vert");
    assert.equal(e.weekKey, "2027-02-08");
    assert.equal(e.message, "Feu Vert S4 · séances 2/2 · bonus : oui · Mission 3 : faite");
    assert.equal(e.note, "Victoire : Zone haltères !");
    assert.equal(e.motif, "Blocage : Le regard des autres");
    assert.ok(TYPES_EVENEMENTS.includes("checkin_feu_vert"));
    assert.match(lire("worker/coach-neiram-proxy.js"), /"checkin_feu_vert"/);
    assert.match(lire("worker/coach-sync.gs"), /'checkin_feu_vert'/);
    assert.equal(niveauAlerte(e), "info");
  });

  test("vidéo : en message privé à Marien sur la plateforme Coach Neiram, plus sur WhatsApp (18/11/2026)", () => {
    const g = C.gestes[0];
    assert.equal(FV.LIEN_PLATEFORME_VIDEO, URL_PLATEFORME, "même adresse que l'envoi du bilan");
    assert.equal(FV.legendeVideo(g, 2), "Feu Vert — vidéo Squat gobelet, semaine 2");
    assert.equal(FV.TEXTES_VIDEO.bouton, "Envoyer ma vidéo à Marien sur la plateforme");
    assert.match(FV.TEXTES_VIDEO.chemin, /plateforme Coach Neiram > Messages privés > Marien/);
    assert.match(FV.TEXTES_VIDEO.plafond, /2 vidéos maximum par semaine/);
    assert.match(FV.TEXTES_VIDEO.plafond, /48 h ouvrées, en message privé sur la plateforme Coach Neiram/);
    for (const t of Object.values(FV.TEXTES_VIDEO)) {
      const texte = typeof t === "function" ? t("x") : t;
      assert.doesNotMatch(texte, /whatsapp|wa\.me|discord/i);
      assert.doesNotMatch(texte, /\bOS\b/);
    }
    assert.equal("lienVideoWhatsapp" in FV, false);
    assert.equal(
      FV.TEXTES_VIDEO.format,
      "1 geste par vidéo, 1 série (ou ses 5-6 dernières répétitions), 30 s maximum, téléphone posé, filmé en 1080p (pas en 4K). Légende : Geste n° / Parcours / Charge / Effort (1-10) / 1 question.",
      "format du 18/11/2026 : la plateforme limite les vidéos à 25 Mo"
    );
    assert.equal(FV.TEXTES_VIDEO.tropLourde, "Si la plateforme refuse la vidéo (25 Mo max), raccourcis-la.");
    assert.doesNotMatch(FV.TEXTES_VIDEO.format, /2 séries|90 s/);
    const ecran = lire("app/src/ecrans/FeuVert.jsx");
    assert.ok(!/whatsapp|wa\.me/i.test(ecran), "plus aucun lien WhatsApp dans l'écran Feu Vert");
    assert.ok(!/type="file"|ChoixPhoto|capture=/.test(ecran), "aucun envoi de vidéo ni de photo dans l'app");
    assert.match(ecran, /TEXTES_VIDEO\.format/);
    assert.match(ecran, /TEXTES_VIDEO\.tropLourde/);
  });
});

describe("tableau de régularité", () => {
  test("points : 1 par séance (max 2), bonus S4-S6, check-in, 2 par mission validée", () => {
    assert.equal(FV.pointsSemaine(1, { seances: 3, bonus: 1, checkin: 1 }, {}), 3, "S1 : bonus ignoré, séances plafonnées");
    assert.equal(FV.pointsSemaine(4, { seances: 2, bonus: 1, checkin: 1 }, { 3: { semaine: 4 } }), 6);
    assert.equal(FV.pointsMax(3), 5);
    assert.equal(FV.pointsMax(4), 6);
  });

  test("série : semaines consécutives à 2 séances ; la semaine en cours compte dès qu'elle est pleine", () => {
    const semaines = { 1: { seances: 2 }, 2: { seances: 1 }, 3: { seances: 2 }, 4: { seances: 2 }, 5: { seances: 0 } };
    assert.equal(FV.serie(semaines, 4), 2);
    assert.equal(FV.ligneRegularite({ semaines, missions: {} }, 5).serie, 2, "S5 en cours, incomplète");
    assert.equal(FV.ligneRegularite({ semaines, missions: {} }, 4).serie, 2);
    assert.equal(FV.ligneRegularite({ semaines, missions: { 1: { semaine: 1 } } }, 2).cumul, 2 + 2 + 1);
  });

  test("ordre alphabétique des pseudos, jamais par points", () => {
    const t = FV.trierTableau([{ pseudo: "zoé" }, { pseudo: "Élodie" }, { pseudo: "anna" }]);
    assert.deepEqual(t.map((l) => l.pseudo), ["anna", "Élodie", "zoé"]);
  });

  test("compteurs publiés : séances, bonus, check-in, rien d'autre", () => {
    const s = FV.pointageFeuVert({ date: "2027-01-19", semaine: 1, lettre: "A", reglages: R }).seance;
    const m = FV.mesSemaines({ seances: [s], checkins: { 1: { envoyeLe: "x" } }, reglages: R, jusqua: 2 });
    assert.deepEqual(JSON.parse(JSON.stringify(m)), { 1: { seances: 1, bonus: 0, checkin: 1 }, 2: { seances: 0, bonus: 0, checkin: 0 } });
  });
});

describe("séance de la semaine par Marien", () => {
  test("lien affiché seulement s'il existe (https)", () => {
    const serveur = { videos: { 2: "https://youtu.be/exemple", 3: "javascript:alert(1)" } };
    assert.equal(FV.videoDeLaSemaine(serveur, 2), "https://youtu.be/exemple");
    assert.equal(FV.videoDeLaSemaine(serveur, 3), null);
    assert.equal(FV.videoDeLaSemaine(serveur, 1), null);
    assert.equal(FV.videoDeLaSemaine(null, 1), null);
    assert.match(lire("app/src/ecrans/FeuVert.jsx"), /videoMarien && \(/);
  });
});

describe("garde-fous du mode Feu Vert", () => {
  test("textes neutres : ouvert aux hommes comme aux femmes, sans point médian", () => {
    for (const f of ["app/src/lib/textes-feu-vert.js", "app/src/lib/feu-vert.js"]) {
      const s = lire(f).replace(/\/\*[\s\S]*?\*\//g, "");
      assert.ok(!/participante|cliente|[Ii]nscrite|[Rr]etirée|chacune|·e\b/.test(s), f);
    }
  });

  const fichiers = ["app/src/ecrans/FeuVert.jsx", "app/src/lib/feu-vert.js", "app/src/lib/textes-feu-vert.js", "app/src/lib/feu-vert-contenu.js"];

  test("jamais de poids corporel ni de photo physique", () => {
    for (const f of fichiers) {
      const s = lire(f);
      assert.ok(!/weightKg|bodyLogs|bodyApi|coach_photos|photos?Mois|startWeightKg/.test(s), f);
    }
    // Le seul « poids » autorisé dit qu'il n'est PAS mesuré.
    const textes = lire("app/src/lib/textes-feu-vert.js").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of textes.match(/[^."]*\bpoids\b[^."]*/g) || []) assert.match(m, /rien de ton poids|jamais la charge, le poids/, m);
  });

  test("aucune promesse de résultat", () => {
    for (const f of fichiers) {
      assert.ok(!/garanti|perdre \d|kilos? en moins|résultats? assurés?|transformation/i.test(lire(f).replace(/aucun effet garanti/g, "")), f);
    }
  });

  test("aucun secret ni adresse de script dans l'application", () => {
    for (const f of fichiers.concat(["app/src/ui/FeuVertCoach.jsx"])) {
      assert.ok(!/script\.google\.com|ADMIN_SECRET\s*=|COACH_SYNC_SECRET\s*=/.test(lire(f)), f);
    }
  });
});
