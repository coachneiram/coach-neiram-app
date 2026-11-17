/**
 * Reservation Feu Vert (15 novembre 2026) : le questionnaire public de la
 * page coachneiram.github.io/feu-vert.html remplace FormSubmit.
 *
 *   page -> Worker POST /reservation-feu-vert -> coach-sync.gs
 *        -> onglet « Feu Vert – Réservations » + mail court au coach.
 *
 * Verifie : origine exacte, CORS, validation champ par champ, taille,
 * pieges anti-robot, plafonds, rien dans D1 hormis des compteurs, et cote
 * script : ligne ecrite, mail SANS donnee de sante ni coordonnees, rien
 * dans Journal / Alertes / Erreurs, purge a 12 mois.
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fauxD1 } from "./faux-d1.mjs";
import { creerScript } from "./doublure-apps-script.mjs";

globalThis.__COACH_TEST__ = globalThis.__COACH_TEST__ || {};
const { default: worker } = await import("../worker/coach-neiram-proxy.js");
const T = globalThis.__COACH_TEST__;

const SECRET = "secret-de-synchro-de-test-0123456789abcdef";
const ORIGINE = "https://coachneiram.github.io";
const ROUTE = "https://proxy.test/reservation-feu-vert";

function reponsesValides(autres = {}) {
  return {
    prenom: "Julie",
    email: "julie@exemple.fr",
    telephone: "06 12 34 56 78",
    instagram: "@julie",
    niveau: "J'ai arrêté depuis plus d'un an",
    blocage: ["Le regard des autres", "Autre"],
    blocageAutre: "Les machines",
    objectif: "Reprendre une routine",
    objectifAutre: "",
    creneaux: ["Soir (17 h-20 h)"],
    lieu: "En salle, abonnement en cours",
    salle: "Fitness Park",
    contreIndication: "Oui",
    presentiel: false,
    consentement: true,
    tableau: true,
    pseudo: "Juju",
    binome: false,
    site_web: "",
    dureeMs: 95000,
    ...autres
  };
}

let env;
let sortants;
const fetchOrigine = globalThis.fetch;
const logOrigine = console.log;

beforeEach(() => {
  env = { COACH_SYNC_URL: "https://exemple.invalid/exec", COACH_SYNC_SECRET: SECRET, DB: fauxD1() };
  sortants = [];
  globalThis.fetch = async (url, init) => {
    sortants.push({ url: String(url), corps: init.body });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  console.log = () => {};
});
afterEach(() => {
  globalThis.fetch = fetchOrigine;
  console.log = logOrigine;
});

function envoyer(corps, { origine = ORIGINE, methode = "POST", ip = "203.0.113.7", brut = null } = {}) {
  const enTetes = { "Content-Type": "application/json", "CF-Connecting-IP": ip };
  if (origine) enTetes.Origin = origine;
  return worker.fetch(
    new Request(ROUTE, { method: methode, headers: enTetes, body: methode === "POST" ? brut ?? JSON.stringify(corps) : undefined }),
    env
  );
}

const chargeEnvoyee = (i = 0) => JSON.parse(JSON.parse(sortants[i].corps).charge);

describe("Worker : origine et CORS", () => {
  test("preflight depuis le site : 204, origine fixe", async () => {
    const r = await envoyer(null, { methode: "OPTIONS" });
    assert.equal(r.status, 204);
    assert.equal(r.headers.get("Access-Control-Allow-Origin"), ORIGINE);
    assert.match(r.headers.get("Access-Control-Allow-Methods"), /POST/);
  });

  test("autre origine refusee, meme si ALLOWED_ORIGINS l'autoriserait", async () => {
    env.ALLOWED_ORIGINS = "*";
    const r = await envoyer(reponsesValides(), { origine: "https://pirate.example" });
    assert.equal(r.status, 403);
    assert.equal(r.headers.get("Access-Control-Allow-Origin"), ORIGINE);
    assert.equal(sortants.length, 0);
  });

  test("sans en-tete Origin (script hors navigateur) : refuse", async () => {
    const r = await envoyer(reponsesValides(), { origine: null });
    assert.equal(r.status, 403);
    assert.equal(sortants.length, 0);
  });

  test("GET refuse", async () => {
    const r = await envoyer(null, { methode: "GET" });
    assert.equal(r.status, 405);
  });

  test("sans COACH_SYNC_URL : 503 (la page bascule sur le mailto)", async () => {
    delete env.COACH_SYNC_URL;
    const r = await envoyer(reponsesValides());
    assert.equal(r.status, 503);
  });
});

describe("Worker : envoi valide", () => {
  test("relaye au script, signe, avec le parcours indicatif ; ok: true", async () => {
    const r = await envoyer(reponsesValides());
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true });
    assert.equal(sortants.length, 1);
    assert.equal(sortants[0].url, env.COACH_SYNC_URL);
    const env2 = JSON.parse(sortants[0].corps);
    assert.equal(env2.v, 2);
    assert.match(env2.sig, /^[0-9a-f]{64}$/);
    const c = chargeEnvoyee();
    assert.equal(c.type, "reservation_feu_vert");
    assert.equal(c.prenom, "Julie");
    assert.equal(c.parcoursIndicatif, "Reprise");
    assert.equal(c.contreIndication, "Oui");
    assert.equal(c.blocageAutre, "Les machines");
    assert.equal(c.pseudo, "Juju");
    // Les pieges ne partent pas vers Google.
    assert.ok(!("site_web" in c) && !("dureeMs" in c));
  });

  test("le script refuse : 502, la page bascule sur le mailto", async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: false, error: "erreur" }), { status: 200 });
    const r = await envoyer(reponsesValides());
    assert.equal(r.status, 502);
    assert.equal((await r.json()).ok, false);
  });

  test("rien des reponses n'est garde dans D1 (seulement des compteurs)", async () => {
    await envoyer(reponsesValides());
    const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
    for (const { name } of tables.results) {
      const lignes = await env.DB.prepare(`SELECT * FROM ${name}`).all();
      const texte = JSON.stringify(lignes.results);
      assert.ok(!texte.includes("julie@exemple.fr") && !texte.includes("Julie"), `table ${name}`);
    }
    const compteurs = await env.DB.prepare("SELECT cle FROM compteurs").all();
    assert.ok(compteurs.results.every((l) => !l.cle.includes("203.0.113.7")), "adresse IP en clair");
  });

  test("parcours indicatif d'apres la question 2", () => {
    const [jamais, arret, moins6, plus6] = T.RESERVATION_FV.RESA_CHOIX.niveau;
    assert.equal(T.parcoursIndicatif(jamais), "Reprise");
    assert.equal(T.parcoursIndicatif(arret), "Reprise");
    assert.equal(T.parcoursIndicatif(moins6), "Bases+");
    assert.match(T.parcoursIndicatif(plus6), /À étudier/);
  });

  test("textes « Autre » et pseudo ignores si la case n'est pas cochee", async () => {
    await envoyer(reponsesValides({ blocage: ["Mes horaires"], objectifAutre: "x", tableau: false }));
    const c = chargeEnvoyee();
    assert.equal(c.blocageAutre, "");
    assert.equal(c.objectifAutre, "");
    assert.equal(c.pseudo, "");
  });
});

describe("Worker : validation", () => {
  const cas = [
    ["champ inconnu", { _subject: "x" }, "champ-inconnu"],
    ["prenom vide", { prenom: "  " }, "prenom-requis"],
    ["email invalide", { email: "pas-un-email" }, "email-invalide"],
    ["telephone invalide", { telephone: "<script>" }, "telephone-invalide"],
    ["choix hors liste", { niveau: "Expert" }, "choix-invalide"],
    ["question 7 absente", { contreIndication: undefined }, "choix-invalide"],
    ["question 7 hors liste", { contreIndication: "Peut-etre" }, "choix-invalide"],
    ["plus de 3 blocages", { blocage: ["Le regard des autres", "Mes horaires", "Je manque de régularité", "Je ne sais pas quoi faire"] }, "choix-invalide"],
    ["blocage en double", { blocage: ["Mes horaires", "Mes horaires"] }, "choix-invalide"],
    ["creneaux pas un tableau", { creneaux: "Soir (17 h-20 h)" }, "choix-invalide"],
    ["consentement absent", { consentement: false }, "consentement-requis"],
    ["booleen en texte", { binome: "Oui" }, "champ-invalide"],
    ["texte trop long", { salle: "x".repeat(201) }, "texte-trop-long"],
    ["texte de mauvais type", { prenom: { a: 1 } }, "champ-invalide"]
  ];
  for (const [nom, modif, erreur] of cas) {
    test(nom, async () => {
      const r = await envoyer(reponsesValides(modif));
      assert.equal(r.status, 400);
      assert.equal((await r.json()).error, erreur);
      assert.equal(sortants.length, 0);
    });
  }

  test("corps de plus de 8 Ko : 413", async () => {
    const r = await envoyer(null, { brut: JSON.stringify(reponsesValides({ x: "y".repeat(9000) })) });
    assert.equal(r.status, 413);
    assert.equal(sortants.length, 0);
  });

  test("JSON illisible : 400", async () => {
    const r = await envoyer(null, { brut: "{pas du json" });
    assert.equal(r.status, 400);
  });

  test("caracteres de controle retires", async () => {
    await envoyer(reponsesValides({ prenom: "Ju\nlie\u0007" }));
    assert.equal(chargeEnvoyee().prenom, "Ju lie");
  });
});

describe("Worker : anti-spam", () => {
  test("champ piege rempli : ok: true, mais rien ne part", async () => {
    const r = await envoyer(reponsesValides({ site_web: "https://spam.example" }));
    assert.equal(r.status, 200);
    assert.equal((await r.json()).ok, true);
    assert.equal(sortants.length, 0);
  });

  test("rempli en moins de 3 s, ou duree absente : rien ne part", async () => {
    await envoyer(reponsesValides({ dureeMs: 800 }));
    await envoyer(reponsesValides({ dureeMs: undefined }));
    assert.equal(sortants.length, 0);
  });

  test("5 envois par heure et par adresse IP, puis 429", async () => {
    for (let i = 0; i < T.RESERVATION_FV.RESA_PAR_IP_PAR_HEURE; i++) assert.equal((await envoyer(reponsesValides())).status, 200);
    assert.equal((await envoyer(reponsesValides())).status, 429);
    assert.equal((await envoyer(reponsesValides(), { ip: "198.51.100.9" })).status, 200);
  });

  test("plafond global par jour", async () => {
    let dernier;
    for (let i = 0; i <= T.RESERVATION_FV.RESA_PAR_JOUR; i++) dernier = await envoyer(reponsesValides(), { ip: "10.0.0." + i });
    assert.equal(dernier.status, 429);
    assert.equal(sortants.length, T.RESERVATION_FV.RESA_PAR_JOUR);
  });

  test("les autres routes gardent leur fonctionnement (ALLOWED_ORIGINS)", async () => {
    const r = await worker.fetch(new Request("https://proxy.test/inconnue", { method: "POST", headers: { Origin: "https://pirate.example" } }), env);
    assert.equal(r.status, 403);
  });
});

describe("Script Google (coach-sync.gs v2.7) : de bout en bout", () => {
  /** Fait passer une reservation par le Worker puis par le vrai script. */
  async function deBoutEnBout(script, reponses = reponsesValides()) {
    globalThis.fetch = async (url, init) => {
      const sortie = script.poster(init.body);
      return new Response(JSON.stringify(sortie), { status: 200 });
    };
    return envoyer(reponses);
  }

  function nouveauScript(options = {}) {
    return creerScript({ reglages: { EXIGER_SECRET: true }, proprietes: { SECRET_SYNC: SECRET }, ...options });
  }

  test("une ligne dans l'onglet, Statut « nouvelle », toutes les reponses", async () => {
    const s = nouveauScript();
    const r = await deBoutEnBout(s);
    assert.equal(r.status, 200);
    const [l] = s.lignes("Feu Vert – Réservations");
    assert.equal(l["Prénom"], "Julie");
    assert.equal(l["Email"], "julie@exemple.fr");
    assert.equal(l["Parcours indicatif"], "Reprise");
    // Apostrophe : le classeur garde le 0 initial du numero.
    assert.equal(l["Téléphone"], "'06 12 34 56 78");
    assert.equal(l["Contre-indication (oui/non)"], "Oui");
    assert.equal(l["Blocages"], "Le regard des autres ; Autre : Les machines");
    assert.equal(l["Tableau de régularité"], "Oui");
    assert.equal(l["Pseudo"], "Juju");
    assert.equal(l["Statut"], "nouvelle");
    assert.ok(l["Reçu le"] instanceof Date || typeof l["Reçu le"] === "object");
  });

  test("mail : prenom, parcours, lien ; NI email, NI telephone, NI question 7", async () => {
    const s = nouveauScript();
    await deBoutEnBout(s);
    assert.equal(s.mails.length, 1);
    const { a, sujet, corps } = s.mails[0];
    assert.equal(a, "coach@test.fr");
    assert.equal(sujet, "[Feu Vert] Nouvelle réservation : Julie");
    assert.match(corps, /Parcours indicatif : Reprise/);
    assert.match(corps, /CLASSEUR-DE-TEST\/edit#gid=4242/);
    const tout = sujet + corps;
    for (const interdit of ["julie@exemple.fr", "06 12 34 56 78", "@julie", "Contre-indication", "contre-indication", "Fitness Park"]) {
      assert.ok(!tout.includes(interdit), "le mail contient : " + interdit);
    }
  });

  test("rien dans Journal, Alertes ni Erreurs", async () => {
    const s = nouveauScript();
    await deBoutEnBout(s);
    assert.equal(s.lignes("Journal").length, 0);
    assert.equal(s.lignes("Alertes").length, 0);
    assert.equal(s.lignes("Erreurs").length, 0);
  });

  test("mail impossible (quota Gmail) : la ligne reste, ok: true, l'erreur ne contient aucune reponse", async () => {
    const s = nouveauScript({ mailEchoue: true });
    const r = await deBoutEnBout(s);
    assert.equal(r.status, 200);
    assert.equal(s.lignes("Feu Vert – Réservations").length, 1);
    const erreurs = JSON.stringify(s.lignes("Erreurs"));
    assert.match(erreurs, /Notification Feu Vert non envoy/);
    assert.ok(!erreurs.includes("julie@exemple.fr") && !erreurs.includes("Oui"));
  });

  test("plafond de 30 notifications par jour ; les lignes, elles, s'ecrivent", () => {
    const s = nouveauScript();
    // Adresses distinctes : une meme adresse le meme jour n'ecrit qu'une ligne (v2.7).
    for (let i = 0; i < 32; i++) {
      s.contexte.R = { type: "reservation_feu_vert", prenom: "A", email: "a" + i + "@b.fr", consentement: true, niveau: "Je n'ai jamais pratiqué", objectif: "Me renforcer", lieu: "À la maison uniquement", contreIndication: "Non" };
      s.appeler("(function(){ return enregistrerReservationFeuVert(R); })");
    }
    assert.equal(s.lignes("Feu Vert – Réservations").length, 32);
    assert.equal(s.mails.length, 30);
  });

  test("envoi non signe refuse : rien n'est ecrit", () => {
    const s = nouveauScript();
    const sortie = s.poster(reponsesValides({ type: "reservation_feu_vert" }));
    assert.equal(sortie.ok, false);
    assert.equal(s.lignes("Feu Vert – Réservations").length, 0);
    assert.equal(s.mails.length, 0);
  });

  test("le script revalide : question 7 hors liste refusee, sans detail dans Erreurs", () => {
    const s = nouveauScript();
    s.contexte.R = { type: "reservation_feu_vert", prenom: "A", email: "a@b.fr", consentement: true, niveau: "Je n'ai jamais pratiqué", objectif: "Me renforcer", lieu: "À la maison uniquement", contreIndication: "Peut-être" };
    assert.equal(s.appeler("(function(){ return enregistrerReservationFeuVert(R); })"), false);
    assert.equal(s.lignes("Feu Vert – Réservations").length, 0);
    assert.ok(!JSON.stringify(s.lignes("Erreurs")).includes("a@b.fr"));
  });

  test("purge : les reservations de plus de 12 mois sont effacees, les autres gardees", () => {
    const s = nouveauScript({
      entetesExistants: { "Feu Vert – Réservations": ["Reçu le", "Prénom", "Contre-indication (oui/non)"] }
    });
    const f = s.feuilles.get("Feu Vert – Réservations");
    const jour = 86400000;
    f.appendRow([new Date(Date.now() - 400 * jour), "Ancienne", "Oui"]);
    f.appendRow([new Date(Date.now() - 10 * jour), "Recente", "Non"]);
    f.appendRow([new Date(Date.now() - 366 * jour), "Limite", "Non"]);
    f.appendRow([new Date(Date.now() - 300 * jour), "Garder", "Oui"]);
    assert.equal(s.appeler("purgerReservationsFeuVert"), 2);
    assert.deepEqual(s.lignes("Feu Vert – Réservations").map((l) => l["Prénom"]), ["Recente", "Garder"]);
  });

  test("la purge tourne aussi a chaque nouvelle reservation", async () => {
    const s = nouveauScript({
      entetesExistants: { "Feu Vert – Réservations": ["Reçu le", "Prénom"] }
    });
    s.feuilles.get("Feu Vert – Réservations").appendRow([new Date(Date.now() - 500 * 86400000), "Vieille"]);
    await deBoutEnBout(s);
    assert.deepEqual(s.lignes("Feu Vert – Réservations").map((l) => l["Prénom"]), ["Julie"]);
  });

  test("les types de l'application restent identiques (reservation hors liste)", () => {
    const s = nouveauScript();
    assert.ok(!s.contexte.TYPES_AUTORISES.includes("reservation_feu_vert"));
  });
});

describe("copie au CRM de l'equipe (16/11/2026)", () => {
  test("sans CRM_LEAD_URL / CRM_LEAD_TOKEN : seul le script est appele", async () => {
    const r = await envoyer(reponsesValides());
    assert.equal(r.status, 200);
    assert.equal(sortants.length, 1);
  });

  test("avec les deux : copie au CRM, jeton en en-tete, SANS la question 7", async () => {
    env.CRM_LEAD_URL = "https://crm.test/api/hooks/lead";
    env.CRM_LEAD_TOKEN = "jeton-crm-de-test";
    const entetes = [];
    globalThis.fetch = async (url, init) => {
      sortants.push({ url: String(url), corps: init.body });
      entetes.push(init.headers || {});
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    const r = await envoyer(reponsesValides());
    assert.equal(r.status, 200);
    assert.equal(sortants.length, 2);
    const crm = sortants[1];
    assert.equal(crm.url, "https://crm.test/api/hooks/lead");
    assert.equal(entetes[1]["x-crm-token"], "jeton-crm-de-test");
    const corps = JSON.parse(crm.corps);
    assert.equal(corps.first_name, "Julie");
    assert.equal(corps.email, "julie@exemple.fr");
    assert.equal(corps.source, "feu-vert");
    assert.equal(corps.blocages, "Le regard des autres, Autre");
    assert.ok(!JSON.stringify(corps).includes("Les machines"), "texte libre jamais envoye");
    assert.match(entetes[1]["Idempotency-Key"], /^fv-[0-9a-f]{32}$/);
    for (const interdit of ["contreIndication", "consentement", "binome", "tableau", "pseudo", "salle"]) assert.ok(!(interdit in corps), interdit);
    assert.ok(!JSON.stringify(corps).includes("Fitness Park"), "texte libre « salle / matériel » jamais envoye");
    assert.ok(!JSON.stringify(corps).includes("contre"), "aucune trace de la question 7");
  });

  test("jeton colle sous forme d'URL du CRM : seul le jeton part en en-tete", async () => {
    env.CRM_LEAD_URL = "https://crm.test/api/hooks/lead";
    env.CRM_LEAD_TOKEN = " https://crm.test/api/hooks/lead?token=abc123DEF456 ";
    const entetes = [];
    globalThis.fetch = async (url, init) => {
      sortants.push({ url: String(url), corps: init.body });
      entetes.push(init.headers || {});
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    const r = await envoyer(reponsesValides());
    assert.equal(r.status, 200);
    assert.equal(entetes[1]["x-crm-token"], "abc123DEF456");
  });

  test("le script refuse : rien n'est copie au CRM", async () => {
    env.CRM_LEAD_URL = "https://crm.test/api/hooks/lead";
    env.CRM_LEAD_TOKEN = "jeton-crm-de-test";
    globalThis.fetch = async (url, init) => {
      sortants.push({ url: String(url), corps: init.body });
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    };
    const r = await envoyer(reponsesValides());
    assert.equal(r.status, 502);
    assert.equal(sortants.length, 1);
  });

  test("CRM en panne : la page recoit quand meme ok: true", async () => {
    env.CRM_LEAD_URL = "https://crm.test/api/hooks/lead";
    env.CRM_LEAD_TOKEN = "jeton-crm-de-test";
    globalThis.fetch = async (url, init) => {
      sortants.push({ url: String(url), corps: init.body });
      if (String(url).startsWith("https://crm.test")) throw new Error("panne");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    const r = await envoyer(reponsesValides());
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true });
  });
});

test("liaison de service CRM utilisee quand elle existe", async () => {
  env.CRM_LEAD_URL = "https://crm.test/api/hooks/lead";
  env.CRM_LEAD_TOKEN = "jeton-crm-de-test";
  const viaLiaison = [];
  env.CRM = { fetch: async (url, init) => { viaLiaison.push(String(url)); return new Response("{}", { status: 200 }); } };
  const r = await envoyer(reponsesValides());
  assert.equal(r.status, 200);
  assert.deepEqual(viaLiaison, ["https://crm.test/api/hooks/lead"]);
  assert.equal(sortants.length, 1);
});

/* ------------------------------------------------------------------ */
/* Robustesse du questionnaire (17 novembre 2026)                      */
/* ------------------------------------------------------------------ */

describe("H1 : le plafond global ne compte que les reservations valides transmises", () => {
  test("des requetes invalides, piegees ou illisibles ne bloquent pas la vraie reservation", async () => {
    // Bien plus que l'ancien plafond (60) : chacune depuis une autre adresse.
    for (let i = 0; i < 70; i++) {
      const ip = "10.1." + Math.floor(i / 250) + "." + (i % 250);
      if (i % 3 === 0) await envoyer(reponsesValides({ email: "pas-un-email" }), { ip });
      else if (i % 3 === 1) await envoyer(reponsesValides({ site_web: "spam" }), { ip });
      else await envoyer(null, { ip, brut: "{pas du json" });
    }
    assert.equal(sortants.length, 0);
    const r = await envoyer(reponsesValides(), { ip: "192.0.2.50" });
    assert.equal(r.status, 200);
    assert.equal(sortants.length, 1);
    const ligne = await env.DB.prepare("SELECT n FROM compteurs WHERE cle LIKE 'resa:jour:%'").first();
    assert.equal(ligne.n, 1, "seule la reservation transmise compte");
  });

  test("un refus du script ne consomme pas le plafond du jour", async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: false }), { status: 200 });
    assert.equal((await envoyer(reponsesValides())).status, 502);
    const ligne = await env.DB.prepare("SELECT n FROM compteurs WHERE cle LIKE 'resa:jour:%'").first();
    assert.equal(ligne.n, 0);
  });

  test("plafond global nettement releve, alerte au journal avant", async () => {
    assert.ok(T.RESERVATION_FV.RESA_PAR_JOUR >= 300, "plafond releve");
    assert.ok(T.RESERVATION_FV.RESA_ALERTE_JOUR < T.RESERVATION_FV.RESA_PAR_JOUR);
    const journaux = [];
    console.log = (...a) => journaux.push(a.join(" "));
    for (let i = 0; i < T.RESERVATION_FV.RESA_ALERTE_JOUR; i++) await envoyer(reponsesValides(), { ip: "10.2.0." + i });
    assert.equal(journaux.filter((l) => l.includes("alerte-volume")).length, 1);
  });

  test("IPv6 : tout le /64 partage le plafond par adresse", async () => {
    const statuts = [];
    for (let i = 1; i <= T.RESERVATION_FV.RESA_PAR_IP_PAR_HEURE + 1; i++) {
      statuts.push((await envoyer(reponsesValides(), { ip: "2001:db8:abcd:12::" + i.toString(16) })).status);
    }
    assert.deepEqual(statuts.slice(0, -1), Array(T.RESERVATION_FV.RESA_PAR_IP_PAR_HEURE).fill(200));
    assert.equal(statuts.at(-1), 429);
    // Un autre /64 n'est pas touche.
    assert.equal((await envoyer(reponsesValides(), { ip: "2001:db8:abcd:13::1" })).status, 200);
  });

  test("prefixe /64 : formes compressees, IPv4 et IPv4 dans IPv6", () => {
    const p = T.ipPourCompteur;
    assert.equal(p("2001:db8:abcd:12::1"), "2001:0db8:abcd:0012::/64");
    assert.equal(p("2001:0DB8:ABCD:0012:ffff:1:2:3"), "2001:0db8:abcd:0012::/64");
    assert.equal(p("2001:db8::1"), "2001:0db8:0000:0000::/64");
    assert.equal(p("::1"), "0000:0000:0000:0000::/64");
    assert.equal(p("fe80::1%eth0"), "fe80:0000:0000:0000::/64");
    assert.equal(p("::ffff:203.0.113.7"), "203.0.113.7");
    assert.equal(p("203.0.113.7"), "203.0.113.7");
    assert.equal(p(null), "inconnue");
  });
});

describe("H2 : seule une reponse JSON { ok: true } du script vaut succes", () => {
  const cas = [
    ["page HTML en 200 (connexion Google, script retire)", () => new Response("<!DOCTYPE html><html><body>Connexion</body></html>", { status: 200, headers: { "Content-Type": "text/html" } })],
    ["JSON sans ok", () => new Response(JSON.stringify({ statut: "ok" }), { status: 200 })],
    ["ok: \"true\" (texte)", () => new Response(JSON.stringify({ ok: "true" }), { status: 200 })],
    ["corps vide", () => new Response("", { status: 200 })],
    ["500 avec ok: true", () => new Response(JSON.stringify({ ok: true }), { status: 500 })]
  ];
  for (const [nom, reponse] of cas) {
    test(nom + " : 502, la page bascule sur son repli, rien au CRM", async () => {
      env.CRM_LEAD_URL = "https://crm.test/api/hooks/lead";
      env.CRM_LEAD_TOKEN = "jeton-crm-de-test";
      globalThis.fetch = async (url, init) => {
        sortants.push({ url: String(url), corps: init.body });
        return reponse();
      };
      const r = await envoyer(reponsesValides());
      assert.equal(r.status, 502);
      assert.equal((await r.json()).ok, false);
      assert.equal(sortants.length, 1, "aucune copie au CRM");
    });
  }
});

describe("M1 : rien du texte libre « salle / matériel » au CRM", () => {
  test("chargeCrm ignore salle, meme rempli", () => {
    const v = T.validerReservation(reponsesValides({ salle: "Kiné pour mon genou opéré" }));
    const c = T.chargeCrm(v.reponse);
    assert.ok(!("salle" in c));
    assert.ok(!JSON.stringify(c).includes("genou"));
  });
});

describe("M5 : delai maximal sur l'appel au script Google", () => {
  test("le fetch vers le script porte un signal d'abandon de 15 s", async () => {
    let signal = null;
    globalThis.fetch = async (url, init) => {
      signal = init.signal;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    assert.equal((await envoyer(reponsesValides())).status, 200);
    assert.ok(signal && typeof signal.aborted === "boolean", "signal transmis");
    assert.equal(T.DELAI_SCRIPT_MS, 15000);
  });

  test("delai depasse (AbortError) : 502 propre, pas d'exception", async () => {
    globalThis.fetch = async () => {
      throw new DOMException("delai depasse", "TimeoutError");
    };
    const r = await envoyer(reponsesValides());
    assert.equal(r.status, 502);
    assert.equal((await r.json()).ok, false);
  });
});

describe("M3 : une seule ligne par email et par jour (coach-sync.gs v2.7)", () => {
  function nouveauScript() {
    return creerScript({ reglages: { EXIGER_SECRET: true }, proprietes: { SECRET_SYNC: SECRET } });
  }
  const R = { type: "reservation_feu_vert", prenom: "Léa", email: "Lea@Exemple.fr", consentement: true, niveau: "Je n'ai jamais pratiqué", objectif: "Me renforcer", lieu: "À la maison uniquement", contreIndication: "Non" };

  test("double envoi : une ligne, un mail, ok: true les deux fois", () => {
    const s = nouveauScript();
    s.contexte.R = R;
    assert.equal(s.appeler("(function(){ return enregistrerReservationFeuVert(R); })"), true);
    s.contexte.R = { ...R, email: " lea@exemple.FR " };
    assert.equal(s.appeler("(function(){ return enregistrerReservationFeuVert(R); })"), true);
    assert.equal(s.lignes("Feu Vert – Réservations").length, 1);
    assert.equal(s.mails.length, 1);
    // L'email n'est jamais garde en clair dans les proprietes.
    assert.ok(!JSON.stringify(s.props).toLowerCase().includes("lea@exemple.fr"));
  });

  test("le lendemain, la meme adresse peut reserver de nouveau", () => {
    const s = nouveauScript();
    s.contexte.R = R;
    s.appeler("(function(){ return enregistrerReservationFeuVert(R); })");
    const etat = JSON.parse(s.props.resa_fv_empreintes);
    s.props.resa_fv_empreintes = JSON.stringify({ ...etat, jour: "2000-01-01" });
    s.appeler("(function(){ return enregistrerReservationFeuVert(R); })");
    assert.equal(s.lignes("Feu Vert – Réservations").length, 2);
  });

  test("un envoi invalide ne marque pas l'adresse", () => {
    const s = nouveauScript();
    s.contexte.R = { ...R, contreIndication: "Peut-être" };
    assert.equal(s.appeler("(function(){ return enregistrerReservationFeuVert(R); })"), false);
    s.contexte.R = R;
    assert.equal(s.appeler("(function(){ return enregistrerReservationFeuVert(R); })"), true);
    assert.equal(s.lignes("Feu Vert – Réservations").length, 1);
  });
});

describe("B2 : aucun lien dans le prenom du mail (coach-sync.gs v2.7)", () => {
  const s = creerScript();
  const p = (x) => s.appeler("(function(){ return prenomPourMail(" + JSON.stringify(x) + "); })");

  test("prenoms ordinaires inchanges", () => {
    assert.equal(p("Julie"), "Julie");
    assert.equal(p("Jean-Éric"), "Jean-Éric");
    assert.equal(p("Anne Sophie"), "Anne Sophie");
  });

  test("liens et morceaux d'URL retires", () => {
    for (const x of ["https://pirate.example/x", "Julie http://a.b", "www.pirate.example", "Julie www.x.fr", "evil://chose", "a://b"]) {
      const t = p(x);
      assert.ok(!/http|www|:\/\/|\./i.test(t), x + " -> " + t);
    }
    assert.equal(p("Julie https://pirate.example"), "Julie");
  });

  test("le sujet et le corps du mail utilisent le prenom neutralise", () => {
    const s2 = creerScript();
    s2.contexte.R = { type: "reservation_feu_vert", prenom: "Promo www.pirate.example", email: "x@y.fr", consentement: true, niveau: "Je n'ai jamais pratiqué", objectif: "Me renforcer", lieu: "À la maison uniquement", contreIndication: "Non" };
    s2.appeler("(function(){ return enregistrerReservationFeuVert(R); })");
    assert.equal(s2.mails.length, 1);
    const { sujet, corps } = s2.mails[0];
    assert.equal(sujet, "[Feu Vert] Nouvelle réservation : Promo");
    assert.ok(!(sujet + corps).includes("pirate"));
  });
});
