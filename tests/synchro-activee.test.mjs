/**
 * Synchro coach activee d'office pour le coaching en ligne (4 octobre 2026).
 *
 * Le script Google v2.1 et le secret du proxy sont en place. L'application
 * envoie desormais les evenements des clients en ligne sans « lien de
 * synchro » a recopier ; elle ne connait toujours ni l'adresse du script ni
 * le secret. Une file d'attente ne doit ni perdre ni doubler un pointage.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { creerLocalStorage } from "./harness.mjs";
import * as synchro from "../app/src/lib/synchro-coach.js";
import { verifierAlertesCoach } from "../app/src/lib/moteur-alertes.js";
import { PROXY_BASE_URL } from "../app/src/lib/config.js";
import { CLES_ANNEXES, charger, enregistrer } from "../app/src/lib/stockage.js";

const EN_LIGNE = { name: "Thomas", coachingMode: "enligne" };

/** Doublure reseau ; `attente` retarde chaque reponse (envois en cours). */
function reseauSimule({ reponse = () => ({ ok: true }), attente = 0 } = {}) {
  const appels = [];
  globalThis.fetch = async (url, init) => {
    appels.push({ url: String(url), init, corps: JSON.parse(init.body) });
    if (attente) await new Promise((r) => setTimeout(r, attente));
    const r = reponse(appels.length);
    if (r instanceof Error) throw r;
    return { ok: r.status ? r.status < 300 : true, status: r.status || 200, json: async () => r };
  };
  return appels;
}

/** Attend que le premier envoi soit parti (la file a ete lue). */
async function enVol(appels) {
  for (let i = 0; i < 50 && !appels.length; i++) await new Promise((r) => setTimeout(r, 1));
  assert.equal(appels.length, 1, "le premier envoi doit etre en cours");
}

beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

describe("qui est synchronise", () => {
  test("coaching en ligne : actif sans aucun lien a recopier", () => {
    assert.equal(synchro.synchroActive(EN_LIGNE), true);
  });

  test("presentiel ou profil vide : inactif", () => {
    assert.equal(synchro.synchroActive({ name: "X", coachingMode: "presentiel" }), false);
    assert.equal(synchro.synchroActive({ name: "X" }), false);
    assert.equal(synchro.synchroActive(null), false);
  });

  test("ancien lien rempli : toujours reconnu", () => {
    assert.equal(synchro.synchroActive({ name: "X", coachSyncUrl: "https://exemple.test/exec" }), true);
  });
});

describe("ce qui part, et ou", () => {
  test("vers le proxy uniquement, jamais de secret ni d'adresse de script", async () => {
    const appels = reseauSimule();
    await synchro.envoyerEvenement({ ...EN_LIGNE, coachSyncUrl: "https://script.google.com/macros/s/X/exec" }, {
      type: "pointage",
      date: "2026-10-04",
      heureReelle: "18:40"
    });
    assert.equal(appels.length, 1);
    assert.equal(appels[0].url, PROXY_BASE_URL + "/coach-sync");
    assert.ok(!("secret" in appels[0].corps));
    assert.doesNotMatch(JSON.stringify(appels[0].corps), /script\.google|exec/);
    assert.equal(appels[0].corps.client, "Thomas");
  });

  test("prenom pris dans firstName a defaut de name", async () => {
    const appels = reseauSimule();
    await synchro.envoyerEvenement({ firstName: "Julie", coachingMode: "enligne" }, { type: "pointage" });
    assert.equal(appels[0].corps.client, "Julie");
  });

  test("le code de l'application ne contient aucun secret de synchro", () => {
    const source = readFileSync(new URL("../app/src/lib/synchro-coach.js", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(source, /secret\s*:/i);
    assert.doesNotMatch(source, /SECRET_SYNC|COACH_SYNC_SECRET/);
  });
});

describe("file d'attente : ni perte ni doublon", () => {
  test("refus { ok: false } ou panne reseau : l'evenement reste et repart", async () => {
    let n = 0;
    reseauSimule({ reponse: () => (++n === 1 ? { ok: false } : n === 2 ? new Error("hors ligne") : { ok: true }) });
    await synchro.envoyerEvenement(EN_LIGNE, { type: "pointage", date: "2026-10-04" });
    assert.equal(synchro.enAttente(), 1);
    await synchro.viderFile(EN_LIGNE);
    assert.equal(synchro.enAttente(), 1);
    assert.equal(await synchro.viderFile(EN_LIGNE), 1);
    assert.equal(synchro.enAttente(), 0);
  });

  test("deux vidages simultanes : chaque pointage n'est envoye qu'une fois", async () => {
    const appels = reseauSimule({ attente: 5 });
    enregistrer(CLES_ANNEXES.outboxCoach, [
      { type: "pointage", date: "j1" },
      { type: "pointage", date: "j2" }
    ]);
    await Promise.all([synchro.viderFile(EN_LIGNE), synchro.viderFile(EN_LIGNE)]);
    assert.deepEqual(appels.map((a) => a.corps.date), ["j1", "j2"]);
    assert.equal(synchro.enAttente(), 0);
  });

  test("un pointage ajoute pendant un envoi n'est pas efface", async () => {
    const appels = reseauSimule({ attente: 20, reponse: () => new Error("hors ligne") });
    enregistrer(CLES_ANNEXES.outboxCoach, [{ type: "pointage", date: "j1" }]);
    const vidage = synchro.viderFile(EN_LIGNE);
    await enVol(appels);
    // Pendant l'envoi de j1, un nouveau pointage arrive dans la file.
    const file = charger(CLES_ANNEXES.outboxCoach, []);
    enregistrer(CLES_ANNEXES.outboxCoach, [...file, { type: "pointage", date: "j2" }]);
    await vidage;
    assert.deepEqual(charger(CLES_ANNEXES.outboxCoach, []).map((e) => e.date), ["j1", "j2"]);
  });

  test("ajoute pendant un envoi reussi : seul l'envoye quitte la file", async () => {
    const appels = reseauSimule({ attente: 20 });
    enregistrer(CLES_ANNEXES.outboxCoach, [{ type: "pointage", date: "j1" }]);
    const vidage = synchro.viderFile(EN_LIGNE);
    await enVol(appels);
    enregistrer(CLES_ANNEXES.outboxCoach, [...charger(CLES_ANNEXES.outboxCoach, []), { type: "pointage", date: "j2" }]);
    await vidage;
    assert.deepEqual(charger(CLES_ANNEXES.outboxCoach, []).map((e) => e.date), ["j2"]);
  });
});

describe("evenements identiques", () => {
  test("deux fois le meme pointage, un seul remis : l'autre reste en file", async () => {
    let n = 0;
    reseauSimule({ reponse: () => (++n === 1 ? { ok: true } : new Error("coupure")) });
    const meme = { type: "pointage", date: "j1", client: "Thomas" };
    enregistrer(CLES_ANNEXES.outboxCoach, [meme, { ...meme }]);
    assert.equal(await synchro.viderFile(EN_LIGNE), 1);
    assert.equal(synchro.enAttente(), 1);
  });
});

describe("pas de doublon d'alerte (constate le 4 octobre 2026)", () => {
  // Le Journal du coach a recu la meme alerte « 3 creneaux decales » 4 fois
  // en 25 secondes : chaque rafraichissement de l'ecran relancait
  // l'evaluation avant que la precedente ait note l'alerte comme envoyee.
  const PROFIL = {
    name: "Thomas",
    coachingMode: "enligne",
    slots: [
      { id: "c1", day: "tue", time: "18:30" },
      { id: "c2", day: "fri", time: "18:30" }
    ]
  };
  const evaluer = (envoyer) =>
    verifierAlertesCoach({
      profile: PROFIL,
      seances: [],
      justifications: {},
      maintenant: new Date(2026, 8, 8, 14, 0, 0),
      aujourdhui: "2026-09-08",
      envoyer
    });

  test("trois evaluations simultanees : l'alerte part une seule fois", async () => {
    const envois = [];
    const envoyer = async (profil, evenement) => {
      envois.push(evenement.type);
      await new Promise((r) => setTimeout(r, 10));
      return true;
    };
    await Promise.all([evaluer(envoyer), evaluer(envoyer), evaluer(envoyer)]);
    assert.equal(envois.filter((t) => t === "alerte_seances_manquees").length, 1, JSON.stringify(envois));
  });

  test("hors ligne : la meme alerte de la meme semaine n'est gardee qu'une fois en file", async () => {
    reseauSimule({ reponse: () => new Error("hors ligne") });
    const alerte = { type: "alerte_decalages", weekKey: "2026-09-28", nbDecalages: 3 };
    await synchro.envoyerEvenement(EN_LIGNE, alerte);
    await synchro.envoyerEvenement(EN_LIGNE, { ...alerte, nbDecalages: 4 });
    const file = charger(CLES_ANNEXES.outboxCoach, []);
    assert.equal(file.length, 1);
    assert.equal(file[0].nbDecalages, 4, "la plus recente remplace l'ancienne");
  });

  test("autre semaine, autre type ou pointage : rien n'est remplace", async () => {
    reseauSimule({ reponse: () => new Error("hors ligne") });
    await synchro.envoyerEvenement(EN_LIGNE, { type: "alerte_decalages", weekKey: "2026-09-21" });
    await synchro.envoyerEvenement(EN_LIGNE, { type: "alerte_decalages", weekKey: "2026-09-28" });
    await synchro.envoyerEvenement(EN_LIGNE, { type: "resume_hebdo", weekKey: "2026-09-28" });
    await synchro.envoyerEvenement(EN_LIGNE, { type: "pointage", date: "2026-10-04" });
    await synchro.envoyerEvenement(EN_LIGNE, { type: "pointage", date: "2026-10-04" });
    assert.equal(synchro.enAttente(), 5);
  });
});

describe("seance du constructeur : pointage pour le coach", () => {
  const PROFIL = { name: "Thomas", coachingMode: "enligne", slots: [{ id: "c1", day: "sun", time: "10:00", place: "Salle" }] };
  const seance = { date: "2026-10-04", durationMin: "55", rpe: "7", notes: " Bonne séance ", exercises: [] };

  test("client en ligne : pointage complet, rattache au creneau du jour", () => {
    assert.deepEqual(synchro.pointageDepuisSeance(PROFIL, seance, { aujourdhui: "2026-10-04", heure: "10:12" }), {
      type: "pointage",
      date: "2026-10-04",
      creneau: "Dimanche 10:00",
      lieu: "Salle",
      heureReelle: "10:12",
      dureeMin: "55",
      rpe: "7",
      note: "Bonne séance"
    });
  });

  test("seance d'un autre jour : hors creneau, sans heure inventee", () => {
    const p = synchro.pointageDepuisSeance(PROFIL, { ...seance, date: "2026-10-01" }, { aujourdhui: "2026-10-04", heure: "10:12" });
    assert.equal(p.creneau, "hors créneau");
    assert.equal(p.heureReelle, "");
  });

  test("presentiel ou seance sans date : rien", () => {
    assert.equal(synchro.pointageDepuisSeance({ ...PROFIL, coachingMode: "presentiel" }, seance), null);
    assert.equal(synchro.pointageDepuisSeance(PROFIL, { ...seance, date: "" }), null);
  });

  test("branche dans le constructeur, a la creation seulement", () => {
    const src = readFileSync(new URL("../app/src/ecrans/ConstructeurSeances.jsx", import.meta.url), "utf8");
    assert.match(src, /else \{\s*await sessionsApi\.add\(donnees\);[\s\S]*?pointageDepuisSeance\(profile, donnees/);
    const ent = readFileSync(new URL("../app/src/ecrans/Entrainements.jsx", import.meta.url), "utf8");
    assert.equal((ent.match(/<ConstructeurSeances[\s\S]*?profile=\{profile\}/g) || []).length, 2);
  });
});

describe("branchement", () => {
  test("la file repart a l'ouverture et au retour du reseau", () => {
    const app = readFileSync(new URL("../app/src/App.jsx", import.meta.url), "utf8");
    assert.match(app, /import \{ viderFile \} from "\.\/lib\/synchro-coach\.js"/);
    assert.match(app, /addEventListener\("online", relancer\)/);
    assert.match(app, /removeEventListener\("online", relancer\)/);
  });

  test("le profil n'a plus de champ « lien de synchro », il informe le client", () => {
    const champs = readFileSync(new URL("../app/src/ecrans/ChampsProfil.jsx", import.meta.url), "utf8");
    assert.doesNotMatch(champs, /coachSyncUrl/);
    assert.match(champs, /data-synchro-coach/);
  });
});
