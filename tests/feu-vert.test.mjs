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
const { lienWhatsappCoach } = await import("../app/src/lib/config.js");

const C = FV.CONTENU_FEU_VERT;
const PROFIL = { name: "Léa", formule: "feuvert", feuVert: { parcours: "reprise", cohorte: "1", debut: "2027-01-18" } };
const R = FV.reglagesFeuVert(PROFIL);

describe("contenu livré = contenu vendu", () => {
  test("8 gestes, chacun avec fiche complète et champ vidéo", () => {
    assert.deepEqual(
      C.gestes.map((g) => g.id),
      ["squat", "rdl", "rowing", "developpe", "fente", "gainage", "tirage", "hipthrust"]
    );
    for (const g of C.gestes) {
      assert.ok(g.objectif && g.filmer && g.facilitee, g.id);
      assert.ok(g.pointsCles.length >= 4, g.id + " : points clés");
      assert.ok(g.criteres.some((c) => c.code.startsWith("S")) && g.criteres.some((c) => c.code.startsWith("Q")), g.id + " : critères S et Q");
      assert.equal(typeof g.video, "string");
    }
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
    assert.deepEqual(new Set(C.semaines[0].B.slice(0, 4).map((e) => e.geste)), new Set(["fente", "gainage", "tirage", "hipthrust"]));
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
  test("formule désactivée : barre inchangée ; active : Feu Vert en tête, sans nutrition, mensurations ni tendances", () => {
    assert.equal(ongletsPour({}), ONGLETS);
    assert.equal(ongletsPour(null), ONGLETS);
    const ids = ongletsPour(PROFIL).map((o) => o.id);
    assert.equal(ids[0], "feuvert");
    assert.deepEqual(ids, ["feuvert", "entrainements", "sommeil", "journal"]);
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

  test("vidéo : WhatsApp vers le numéro pro de la configuration, message pré-rempli, plafond rappelé", () => {
    const g = C.gestes[0];
    assert.equal(FV.lienVideoWhatsapp(g, 2), lienWhatsappCoach("Feu Vert — vidéo Squat gobelet, semaine 2"));
    assert.match(FV.lienVideoWhatsapp(g, 2), /^https:\/\/wa\.me\/\d+\?text=/);
    assert.match(FV.TEXTES_VIDEO.plafond, /2 vidéos maximum par semaine/);
    const ecran = lire("app/src/ecrans/FeuVert.jsx");
    assert.ok(!/type="file"|ChoixPhoto|capture=/.test(ecran), "aucun envoi de vidéo ni de photo dans l'app");
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
