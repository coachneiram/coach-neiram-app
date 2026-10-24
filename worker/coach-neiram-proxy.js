/**
 * Coach Neiram — proxy Cloudflare Worker
 *
 * Role : servir d'intermediaire entre l'application (page publique) et les
 * services qui demandent un secret. Rien de sensible ne reste dans le
 * navigateur du client.
 *
 * Routes :
 *   POST /ai              -> relaie vers Google Gemini avec la cle du coach
 *   POST /coach-sync      -> relaie vers le Google Apps Script, signe (HMAC)
 *   POST /auth/activer    -> echange un code d'invitation contre un jeton client
 *   POST /admin/...       -> invitations et revocations (secret du coach)
 *   POST /push/cle        -> cle publique des notifications push (VAPID)
 *   POST /push/abonner    -> enregistre un telephone et ses rappels a venir
 *   POST /push/desabonner -> l'oublie
 * Et une tache planifiee (Cron Trigger, toutes les 15 minutes) qui envoie
 * les rappels arrives a echeance, meme application fermee.
 *
 * Variables a definir dans Cloudflare (Settings > Variables and Secrets) :
 *   GEMINI_API_KEY      (secret)   cle API Google Gemini
 *   COACH_SYNC_URL      (secret)   URL /exec du Google Apps Script
 *   COACH_SYNC_SECRET   (secret)   cle de signature partagee avec le script
 *   ADMIN_SECRET        (secret)   cle du coach pour les routes /admin
 *                                  (32 caracteres au moins ; sans elle, /admin repond 404)
 *   ACCES_CLIENTS       (variable) « obligatoire » (defaut) ou « transition »
 *   PLAFOND_IA_JOUR     (variable, optionnel) appels IA par jour, tous clients (defaut 800)
 *   ALLOWED_ORIGINS     (variable, optionnel) origines autorisees, separees par des
 *                       virgules ; defaut : https://coachneiram.github.io
 *   DB                  (liaison D1) invitations, jetons et compteurs ;
 *                       sans elle, /ai et /coach-sync repondent 503 en mode obligatoire
 *   PUSH_KV             (liaison KV, pour les rappels push) espace de stockage des
 *                       abonnements ; sans lui, les routes /push repondent 503
 *
 * ACCES DES CLIENTS (17 octobre 2026, audit P0-3 et P0-4)
 *
 * Avant : /ai et /coach-sync acceptaient n'importe quelle requete. N'importe
 * qui pouvait consommer le quota Gemini du coach, ou ecrire de fausses
 * alertes dans son classeur sous le prenom de son choix.
 *
 * Maintenant : chaque client recoit du coach un code d'invitation a usage
 * unique, qu'il saisit une fois dans l'application. Le Worker l'echange
 * contre un JETON aleatoire propre a ce client, dont seule l'empreinte
 * (SHA-256) est gardee dans D1. L'application l'envoie dans l'en-tete
 * Authorization. Le Worker en deduit QUI appelle :
 *   - /ai : plafonds par client (par minute, par jour) et plafond global ;
 *   - /coach-sync : le prenom vient de la fiche client, jamais de la requete.
 * Le coach peut revoquer un client (telephone perdu, fin de suivi).
 *
 * Ce jeton n'est pas un secret partage : il n'ouvre que l'acces de CE
 * client, a son propre quota, et il est revocable. Ce n'est pas une cle
 * embarquee dans le code (aucune cle n'est dans l'application publiee).
 *
 * Mode « transition » : tant que tous les clients n'ont pas saisi leur code,
 * une requete SANS jeton reste acceptee, sous des plafonds anonymes stricts,
 * et ses evenements arrivent marques « (non vérifié) ». Ce mode ne protege
 * PAS l'acces : il borne seulement le cout. Il doit etre quitte des que les
 * codes sont distribues (ACCES_CLIENTS = obligatoire, ou variable supprimee).
 *
 * Note honnete sur ALLOWED_ORIGINS : le controle d'origine n'arrete qu'un
 * navigateur. Un script hors navigateur peut annoncer l'origine qu'il veut.
 * La vraie protection, ce sont les jetons clients, les plafonds et la
 * validation des donnees ci-dessous.
 */

// Modeles autorises : empeche d'utiliser le proxy pour appeler n'importe quoi.
const MODELES_AUTORISES = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest"
];

// Plafonds de taille : une requete plus grosse est refusee sans etre relayee.
const TAILLE_MAX_AI = 8 * 1024 * 1024;   // 8 Mo (les photos de repas sont en base64)
const TAILLE_MAX_SYNC = 16 * 1024;       // 16 Ko : un evenement de pointage est minuscule
const TAILLE_MAX_AUTH = 2 * 1024;

// Forme des requetes /ai : ce que l'application envoie reellement, rien de plus.
const IA_MESSAGES_MAX = 30;
const IA_PARTIES_MAX = 20;
const IA_IMAGES_MAX = 8;               // bilan mensuel : 3 poses x 2 mois
const IA_TEXTE_MAX = 60000;            // tous textes confondus, consigne comprise
const IA_IMAGE_MAX = 6 * 1024 * 1024;  // une image, en base64
const IA_TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp"];
const IA_JETONS_SORTIE_MAX = 4096;
const IA_DELAI_MS = 60000;

// Origines autorisees quand ALLOWED_ORIGINS n'est pas renseignee.
const ORIGINES_PAR_DEFAUT = ["https://coachneiram.github.io"];

/**
 * Plafonds, par client identifie ou pour les requetes anonymes (mode
 * transition). Un appel compte des qu'il est recu, meme s'il echoue
 * ensuite : c'est ce qui empeche de marteler le proxy.
 */
const PLAFONDS = {
  iaParMinute: 8,
  iaParJour: 80,
  iaGlobalParJour: 800,      // remplacable par PLAFOND_IA_JOUR
  iaAnonymeParHeure: 20,     // par adresse IP (empreinte), mode transition
  iaAnonymeParJour: 200,     // toutes adresses confondues, mode transition
  syncParMinute: 20,
  syncParJour: 200,
  syncAnonymeParHeure: 30,
  activationParHeure: 10,    // codes essayes, par adresse IP
  activationGlobaleParHeure: 60,
  adminEchecsParHeure: 10
};

// Codes d'invitation : 8 caracteres sans 0/O ni 1/I, valables 30 jours.
const ALPHABET_CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LONGUEUR_CODE = 8;
const DUREE_CODE_MS = 30 * 24 * 3600 * 1000;

// Limitation de debit "au mieux", en memoire : ne sert plus qu'en mode
// transition SANS base D1 (et aux routes /push). La memoire d'un Worker
// n'est pas partagee entre ses instances : ce n'est pas une garantie.
const FENETRE_MS = 60 * 1000;
const MAX_PAR_FENETRE = { ai: 20, sync: 30, push: 30 };
const compteurs = new Map();

function tropDeRequetes(cle, categorie) {
  const maintenant = Date.now();
  const entree = compteurs.get(cle);
  if (!entree || maintenant - entree.debut > FENETRE_MS) {
    compteurs.set(cle, { debut: maintenant, n: 1 });
    if (compteurs.size > 5000) compteurs.clear(); // garde-fou memoire
    return false;
  }
  entree.n += 1;
  return entree.n > (MAX_PAR_FENETRE[categorie] || 20);
}

function originesAutorisees(env) {
  const liste = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return liste.length ? liste : ORIGINES_PAR_DEFAUT;
}

/** Une requete sans en-tete Origin ne vient pas d'un navigateur : rien a verifier ici. */
function origineAcceptee(request, env) {
  const origine = request.headers.get("Origin");
  if (!origine) return true;
  const liste = originesAutorisees(env);
  return liste.includes("*") || liste.includes(origine);
}

function enTetesCors(request, env) {
  const origine = request.headers.get("Origin") || "";
  const autorisee = origine && origineAcceptee(request, env);
  return {
    "Access-Control-Allow-Origin": autorisee ? origine : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function reponseJson(donnees, statut, cors) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { "Content-Type": "application/json", ...cors }
  });
}

/**
 * Journal minimal : route, statut, raison, et 8 caracteres de
 * l'identifiant client. Ni contenu, ni prenom, ni adresse IP.
 */
function journal(route, statut, raison, client) {
  try {
    console.log(JSON.stringify({ r: route, s: statut, e: raison || null, c: client ? String(client.id).slice(0, 8) : null }));
  } catch (e) {
    // Un journal ne doit jamais faire echouer une requete.
  }
}

function refus(route, statut, erreur, cors, client) {
  journal(route, statut, erreur, client);
  return reponseJson({ ok: false, error: erreur }, statut, cors);
}

export default {
  async fetch(request, env, ctx) {
    const cors = enTetesCors(request, env);
    const url = new URL(request.url);

    if (!origineAcceptee(request, env)) {
      return refus(url.pathname, 403, "origine-refusee", cors);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return reponseJson({ ok: false, error: "method-not-allowed" }, 405, cors);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "inconnue";

    try {
      if (url.pathname === "/ai") return await relaiIa(request, env, cors, ip);
      if (url.pathname === "/coach-sync") return await relaiCoachSync(request, env, cors, ip);
      if (url.pathname === "/auth/activer") return await activerCode(request, env, cors, ip);
      if (url.pathname.startsWith("/admin/")) return await routeAdmin(url.pathname, request, env, cors, ip);
      if (url.pathname.startsWith("/push/")) return await routePush(url.pathname, request, env, cors, ip);
    } catch (e) {
      // Jamais de detail interne dans la reponse.
      return refus(url.pathname, 500, "erreur-interne", cors);
    }

    return reponseJson({ ok: false, error: "not-found" }, 404, cors);
  },

  /** Cron Trigger : envoie les rappels push arrives a echeance, nettoie les compteurs. */
  async scheduled(evenement, env, ctx) {
    const taches = [];
    if (env.PUSH_KV) taches.push(envoyerRappelsDus(env, Date.now()));
    if (env.PUSH_KV) taches.push(envoyerAnnonces(env, Date.now(), env.ANNONCES_TEST || ANNONCES).catch(() => null));
    if (env.DB) taches.push(nettoyerCompteurs(env, Date.now()).catch(() => null));
    const tout = Promise.all(taches);
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(tout);
    await tout;
  }
};

/* ------------------------------------------------------------------ */
/* Base D1 : invitations, jetons, compteurs                            */
/* ------------------------------------------------------------------ */

// Une instruction par entree : D1 n'execute pas plusieurs instructions
// dans un meme prepare.
const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, libelle TEXT NOT NULL, cree_le INTEGER NOT NULL, revoque_le INTEGER)",
  "CREATE TABLE IF NOT EXISTS invitations (empreinte TEXT PRIMARY KEY, client_id TEXT NOT NULL, cree_le INTEGER NOT NULL, expire_le INTEGER NOT NULL, utilise_le INTEGER)",
  "CREATE TABLE IF NOT EXISTS jetons (empreinte TEXT PRIMARY KEY, client_id TEXT NOT NULL, cree_le INTEGER NOT NULL, revoque_le INTEGER)",
  "CREATE TABLE IF NOT EXISTS compteurs (cle TEXT PRIMARY KEY, n INTEGER NOT NULL, expire_le INTEGER NOT NULL)"
];

// Schema cree une fois par base et par instance du Worker.
const schemasPrets = new WeakMap();

/** La base, schema pret ; null si la liaison DB n'existe pas. */
async function base(env) {
  if (!env.DB) return null;
  let pret = schemasPrets.get(env.DB);
  if (!pret) {
    pret = env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s)));
    schemasPrets.set(env.DB, pret);
    pret.catch(() => schemasPrets.delete(env.DB));
  }
  await pret;
  return env.DB;
}

/** Empreinte SHA-256, en hexadecimal. */
async function hachage(texte) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(texte))));
  return Array.from(h, (o) => o.toString(16).padStart(2, "0")).join("");
}

function aleatoireHex(octets) {
  return Array.from(crypto.getRandomValues(new Uint8Array(octets)), (o) => o.toString(16).padStart(2, "0")).join("");
}

function aleatoireB64url(octets) {
  let bin = "";
  crypto.getRandomValues(new Uint8Array(octets)).forEach((o) => (bin += String.fromCharCode(o)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function nouveauCode() {
  // 256 est un multiple de 32 : chaque caractere est equiprobable.
  return Array.from(crypto.getRandomValues(new Uint8Array(LONGUEUR_CODE)), (o) => ALPHABET_CODE[o % ALPHABET_CODE.length]).join("");
}

/** « k7pm-q4xt » ou « K7PM Q4XT » → « K7PMQ4XT ». */
const normaliserCode = (code) => String(code || "").toUpperCase().replace(/[\s-]/g, "");

/** Comparaison en temps constant de deux chaines de meme forme. */
function egaliteConstante(a, b) {
  const x = String(a);
  const y = String(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}

const jourUtc = (maintenant) => new Date(maintenant).toISOString().slice(0, 10);
const heureUtc = (maintenant) => new Date(maintenant).toISOString().slice(0, 13);
const minute = (maintenant) => Math.floor(maintenant / 60000);

/**
 * Incremente des compteurs en une seule transaction et dit si l'un
 * d'eux depasse sa limite. `liste` : [{ cle, limite, dureeMs, raison }].
 * Rend la raison du premier depassement, ou null.
 */
async function depasse(db, liste, maintenant) {
  const sql = "INSERT INTO compteurs (cle, n, expire_le) VALUES (?1, 1, ?2) ON CONFLICT(cle) DO UPDATE SET n = n + 1 RETURNING n";
  const resultats = await db.batch(liste.map((c) => db.prepare(sql).bind(c.cle, maintenant + c.dureeMs)));
  for (let i = 0; i < liste.length; i++) {
    const n = Number(((resultats[i] && resultats[i].results) || [])[0]?.n);
    if (!Number.isFinite(n) || n > liste[i].limite) return liste[i].raison;
  }
  return null;
}

async function nettoyerCompteurs(env, maintenant) {
  const db = await base(env);
  if (db) await db.prepare("DELETE FROM compteurs WHERE expire_le < ?1").bind(maintenant).run();
}

const modeAcces = (env) => (String(env.ACCES_CLIENTS || "").trim() === "transition" ? "transition" : "obligatoire");

/**
 * Qui appelle ? Lit l'en-tete Authorization et cherche l'empreinte du
 * jeton. Rend { client } pour un jeton valide, { client: null } pour une
 * requete anonyme acceptee (mode transition), ou { reponse } pour un refus.
 *
 * Un jeton PRESENT mais inconnu ou revoque est toujours refuse, meme en
 * transition : un client revoque ne doit pas retomber sur l'acces anonyme
 * en gardant son ancien jeton.
 */
async function identifier(route, request, env, cors) {
  let db = null;
  try {
    db = await base(env);
  } catch (e) {
    db = null;
  }
  const entete = request.headers.get("Authorization") || "";

  if (!db) {
    if (modeAcces(env) === "transition" && !entete) return { client: null, db: null };
    return { reponse: refus(route, 503, "acces-non-configure", cors) };
  }
  if (!entete) {
    if (modeAcces(env) === "transition") return { client: null, db };
    return { reponse: refus(route, 401, "acces-requis", cors) };
  }
  const m = /^Bearer ([A-Za-z0-9_-]{20,100})$/.exec(entete);
  if (!m) return { reponse: refus(route, 401, "jeton-invalide", cors) };
  const ligne = await db
    .prepare(
      "SELECT c.id AS id, c.libelle AS libelle FROM jetons j JOIN clients c ON c.id = j.client_id WHERE j.empreinte = ?1 AND j.revoque_le IS NULL AND c.revoque_le IS NULL"
    )
    .bind(await hachage(m[1]))
    .first();
  if (!ligne) return { reponse: refus(route, 401, "jeton-invalide", cors) };
  return { client: { id: ligne.id, libelle: ligne.libelle }, db };
}

/** Lit un corps JSON plafonne ; rend { corps } ou { reponse }. */
async function lireJson(route, request, cors, tailleMax) {
  const longueur = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(longueur) && longueur > tailleMax) return { reponse: refus(route, 413, "requete-trop-grosse", cors) };
  let brut;
  try {
    brut = await request.text();
  } catch (e) {
    return { reponse: refus(route, 400, "json-invalide", cors) };
  }
  if (brut.length > tailleMax) return { reponse: refus(route, 413, "requete-trop-grosse", cors) };
  try {
    const corps = JSON.parse(brut);
    if (!corps || typeof corps !== "object" || Array.isArray(corps)) throw new Error("forme");
    return { corps };
  } catch (e) {
    return { reponse: refus(route, 400, "json-invalide", cors) };
  }
}

/* ------------------------------------------------------------------ */
/* Route /ai : relaie vers Gemini en ajoutant la cle cote serveur       */
/* ------------------------------------------------------------------ */

/**
 * Valide une requete /ai champ par champ. Rend { charge } (ce qui partira
 * chez Gemini) ou { erreur }. Seuls les champs que l'application envoie
 * sont acceptes : model, messages, systemPrompt, maxTokens.
 */
function validerRequeteIa(corps) {
  const permis = ["model", "messages", "systemPrompt", "maxTokens"];
  if (Object.keys(corps).some((k) => !permis.includes(k))) return { erreur: "champ-inconnu" };

  const modele = String(corps.model || "");
  if (!MODELES_AUTORISES.includes(modele)) return { erreur: "modele-non-autorise" };

  const messages = corps.messages;
  if (!Array.isArray(messages) || !messages.length) return { erreur: "messages-manquants" };
  if (messages.length > IA_MESSAGES_MAX) return { erreur: "messages-trop-nombreux" };

  let texteTotal = 0;
  let images = 0;
  const contents = [];
  for (const m of messages) {
    if (!m || typeof m !== "object" || (m.role !== "user" && m.role !== "model")) return { erreur: "message-invalide" };
    if (!Array.isArray(m.parts) || !m.parts.length || m.parts.length > IA_PARTIES_MAX) return { erreur: "message-invalide" };
    const parts = [];
    for (const p of m.parts) {
      if (!p || typeof p !== "object") return { erreur: "message-invalide" };
      if (typeof p.text === "string" && Object.keys(p).length === 1) {
        texteTotal += p.text.length;
        parts.push({ text: p.text });
        continue;
      }
      const img = p.inlineData || p.inline_data;
      if (img && Object.keys(p).length === 1) {
        const type = img.mimeType || img.mime_type;
        if (!IA_TYPES_IMAGE.includes(type)) return { erreur: "image-invalide" };
        if (typeof img.data !== "string" || !img.data || img.data.length > IA_IMAGE_MAX || !/^[A-Za-z0-9+/=]+$/.test(img.data)) {
          return { erreur: "image-invalide" };
        }
        if (++images > IA_IMAGES_MAX) return { erreur: "trop-d-images" };
        parts.push({ inlineData: { mimeType: type, data: img.data } });
        continue;
      }
      return { erreur: "message-invalide" };
    }
    contents.push({ role: m.role, parts });
  }

  if (corps.systemPrompt !== undefined && corps.systemPrompt !== null && typeof corps.systemPrompt !== "string") {
    return { erreur: "consigne-invalide" };
  }
  texteTotal += (corps.systemPrompt || "").length;
  if (texteTotal > IA_TEXTE_MAX) return { erreur: "texte-trop-long" };

  let sortie = 1024;
  if (corps.maxTokens !== undefined && corps.maxTokens !== null) {
    const n = Number(corps.maxTokens);
    if (!Number.isInteger(n) || n < 1) return { erreur: "max-tokens-invalide" };
    sortie = Math.min(n, IA_JETONS_SORTIE_MAX);
  }

  const charge = {
    contents,
    generationConfig: { maxOutputTokens: sortie, thinkingConfig: { thinkingLevel: "low" } }
  };
  if (corps.systemPrompt) charge.systemInstruction = { parts: [{ text: corps.systemPrompt }] };
  return { charge, modele };
}

/** Plafonds a appliquer a un appel /ai, selon qu'on sait qui appelle. */
async function plafondsIa(client, env, ip, maintenant) {
  const jour = jourUtc(maintenant);
  const global = Number(env.PLAFOND_IA_JOUR) > 0 ? Number(env.PLAFOND_IA_JOUR) : PLAFONDS.iaGlobalParJour;
  const liste = client
    ? [
        { cle: `ia:min:${client.id}:${minute(maintenant)}`, limite: PLAFONDS.iaParMinute, dureeMs: 120000, raison: "trop-de-requetes" },
        { cle: `ia:jour:${client.id}:${jour}`, limite: PLAFONDS.iaParJour, dureeMs: 2 * 86400000, raison: "quota-client" }
      ]
    : [
        { cle: `ia:ip:${(await hachage(ip)).slice(0, 16)}:${heureUtc(maintenant)}`, limite: PLAFONDS.iaAnonymeParHeure, dureeMs: 2 * 3600000, raison: "trop-de-requetes" },
        { cle: `ia:anon:${jour}`, limite: PLAFONDS.iaAnonymeParJour, dureeMs: 2 * 86400000, raison: "quota-anonyme" }
      ];
  liste.push({ cle: `ia:global:${jour}`, limite: global, dureeMs: 2 * 86400000, raison: "plafond-global" });
  return liste;
}

async function relaiIa(request, env, cors, ip) {
  const route = "/ai";
  if (!env.GEMINI_API_KEY) return refus(route, 503, "proxy-non-configure", cors);

  const id = await identifier(route, request, env, cors);
  if (id.reponse) return id.reponse;
  const { client, db } = id;
  const maintenant = Date.now();

  if (db) {
    const raison = await depasse(db, await plafondsIa(client, env, ip, maintenant), maintenant);
    if (raison) return refus(route, 429, raison, cors, client);
  } else if (tropDeRequetes("ai:" + ip, "ai")) {
    // Mode transition sans base : le seul frein est celui d'avant.
    return refus(route, 429, "trop-de-requetes", cors);
  }

  const lu = await lireJson(route, request, cors, TAILLE_MAX_AI);
  if (lu.reponse) return lu.reponse;
  const v = validerRequeteIa(lu.corps);
  if (v.erreur) return refus(route, 400, v.erreur, cors, client);

  const cible = "https://generativelanguage.googleapis.com/v1beta/models/" + v.modele + ":generateContent";
  let amont;
  try {
    amont = await fetch(cible, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify(v.charge),
      ...(typeof AbortSignal !== "undefined" && AbortSignal.timeout ? { signal: AbortSignal.timeout(IA_DELAI_MS) } : {})
    });
  } catch (e) {
    return refus(route, 502, "amont-injoignable", cors, client);
  }

  /*
   * Erreurs du fournisseur : un code a nous, jamais le corps de Google
   * (il peut citer le projet, la cle tronquee ou l'adresse du service).
   * 429 reste 429 : l'application l'affiche comme « quota du jour ».
   * 401/403 de Google veut dire que la cle du coach est refusee : 503, et
   * l'application dit au client de prevenir son coach.
   */
  if (!amont.ok) {
    if (amont.status === 429) return refus(route, 429, "quota-fournisseur", cors, client);
    if (amont.status === 401 || amont.status === 403) return refus(route, 503, "fournisseur-refus", cors, client);
    if (amont.status === 400) return refus(route, 502, "requete-refusee-fournisseur", cors, client);
    return refus(route, 502, "fournisseur-indisponible", cors, client);
  }

  let donnees;
  try {
    donnees = await amont.json();
  } catch (e) {
    return refus(route, 502, "fournisseur-indisponible", cors, client);
  }
  journal(route, 200, null, client);
  // Seules les reponses du modele repartent vers le telephone.
  return reponseJson({ candidates: Array.isArray(donnees.candidates) ? donnees.candidates : [] }, 200, cors);
}

/* ------------------------------------------------------------------ */
/* Route /auth/activer : code d'invitation → jeton client               */
/* ------------------------------------------------------------------ */

async function activerCode(request, env, cors, ip) {
  const route = "/auth/activer";
  let db;
  try {
    db = await base(env);
  } catch (e) {
    db = null;
  }
  if (!db) return refus(route, 503, "acces-non-configure", cors);

  const maintenant = Date.now();
  const heure = heureUtc(maintenant);
  const raison = await depasse(
    db,
    [
      { cle: `act:ip:${(await hachage(ip)).slice(0, 16)}:${heure}`, limite: PLAFONDS.activationParHeure, dureeMs: 2 * 3600000, raison: "trop-de-tentatives" },
      { cle: `act:global:${heure}`, limite: PLAFONDS.activationGlobaleParHeure, dureeMs: 2 * 3600000, raison: "trop-de-tentatives" }
    ],
    maintenant
  );
  if (raison) return refus(route, 429, raison, cors);

  const lu = await lireJson(route, request, cors, TAILLE_MAX_AUTH);
  if (lu.reponse) return lu.reponse;
  const code = normaliserCode(lu.corps.code);
  if (code.length !== LONGUEUR_CODE || [...code].some((c) => !ALPHABET_CODE.includes(c))) {
    return refus(route, 400, "code-invalide", cors);
  }

  const empreinte = await hachage("code:" + code);
  // Usage unique, sans course possible : la mise a jour ne touche la ligne
  // que si elle n'est ni utilisee ni expiree.
  const mise = await db
    .prepare("UPDATE invitations SET utilise_le = ?1 WHERE empreinte = ?2 AND utilise_le IS NULL AND expire_le > ?1")
    .bind(maintenant, empreinte)
    .run();
  if (!mise || !mise.meta || mise.meta.changes !== 1) return refus(route, 400, "code-invalide", cors);

  const client = await db
    .prepare("SELECT c.id AS id, c.libelle AS libelle FROM invitations i JOIN clients c ON c.id = i.client_id WHERE i.empreinte = ?1 AND c.revoque_le IS NULL")
    .bind(empreinte)
    .first();
  if (!client) return refus(route, 400, "code-invalide", cors);

  const jeton = aleatoireB64url(32);
  await db
    .prepare("INSERT INTO jetons (empreinte, client_id, cree_le, revoque_le) VALUES (?1, ?2, ?3, NULL)")
    .bind(await hachage(jeton), client.id, maintenant)
    .run();
  journal(route, 200, null, client);
  return reponseJson({ ok: true, jeton, libelle: client.libelle }, 200, cors);
}

/* ------------------------------------------------------------------ */
/* Routes /admin : reservees au coach (ADMIN_SECRET)                    */
/* ------------------------------------------------------------------ */

const LIBELLE_VALIDE = /^[\p{L}\p{N} .'-]{1,40}$/u;

/**
 * Invitations, liste des clients, revocation. Le secret du coach ne vit
 * que dans Cloudflare et sur son ordinateur : jamais dans l'application.
 * Sans ADMIN_SECRET (ou s'il est trop court), ces routes n'existent pas.
 */
async function routeAdmin(chemin, request, env, cors, ip) {
  const route = "/admin";
  const secret = String(env.ADMIN_SECRET || "");
  if (secret.length < 32) return reponseJson({ ok: false, error: "not-found" }, 404, cors);

  let db;
  try {
    db = await base(env);
  } catch (e) {
    db = null;
  }
  if (!db) return refus(route, 503, "acces-non-configure", cors);

  const maintenant = Date.now();
  const fourni = (request.headers.get("Authorization") || "").replace(/^Bearer /, "");
  if (!egaliteConstante(await hachage(fourni), await hachage(secret))) {
    const raison = await depasse(
      db,
      [{ cle: `admin:echec:${(await hachage(ip)).slice(0, 16)}:${heureUtc(maintenant)}`, limite: PLAFONDS.adminEchecsParHeure, dureeMs: 2 * 3600000, raison: "trop-de-tentatives" }],
      maintenant
    );
    return refus(route, raison ? 429 : 401, raison || "non-autorise", cors);
  }

  const lu = await lireJson(route, request, cors, TAILLE_MAX_AUTH);
  if (lu.reponse) return lu.reponse;
  const corps = lu.corps;

  if (chemin === "/admin/invitations") {
    let clientId = corps.client ? String(corps.client) : null;
    let libelle;
    if (clientId) {
      const c = await db.prepare("SELECT libelle FROM clients WHERE id = ?1 AND revoque_le IS NULL").bind(clientId).first();
      if (!c) return refus(route, 404, "client-inconnu", cors);
      libelle = c.libelle;
    } else {
      libelle = String(corps.libelle || "").trim();
      if (!LIBELLE_VALIDE.test(libelle)) return refus(route, 400, "libelle-invalide", cors);
      clientId = aleatoireHex(12);
      await db.prepare("INSERT INTO clients (id, libelle, cree_le, revoque_le) VALUES (?1, ?2, ?3, NULL)").bind(clientId, libelle, maintenant).run();
    }
    const code = nouveauCode();
    const expire = maintenant + DUREE_CODE_MS;
    await db
      .prepare("INSERT INTO invitations (empreinte, client_id, cree_le, expire_le, utilise_le) VALUES (?1, ?2, ?3, ?4, NULL)")
      .bind(await hachage("code:" + code), clientId, maintenant, expire)
      .run();
    return reponseJson({ ok: true, client: clientId, libelle, code: code.slice(0, 4) + "-" + code.slice(4), expireLe: new Date(expire).toISOString() }, 200, cors);
  }

  if (chemin === "/admin/clients") {
    const r = await db
      .prepare(
        "SELECT c.id AS id, c.libelle AS libelle, c.cree_le AS cree_le, c.revoque_le AS revoque_le, (SELECT COUNT(*) FROM jetons j WHERE j.client_id = c.id AND j.revoque_le IS NULL) AS jetons FROM clients c ORDER BY c.cree_le"
      )
      .all();
    return reponseJson({ ok: true, clients: r.results || [] }, 200, cors);
  }

  if (chemin === "/admin/revoquer") {
    const clientId = String(corps.client || "");
    const c = await db.prepare("SELECT id FROM clients WHERE id = ?1").bind(clientId).first();
    if (!c) return refus(route, 404, "client-inconnu", cors);
    await db.batch([
      db.prepare("UPDATE clients SET revoque_le = ?1 WHERE id = ?2 AND revoque_le IS NULL").bind(maintenant, clientId),
      db.prepare("UPDATE jetons SET revoque_le = ?1 WHERE client_id = ?2 AND revoque_le IS NULL").bind(maintenant, clientId)
    ]);
    return reponseJson({ ok: true }, 200, cors);
  }

  return reponseJson({ ok: false, error: "not-found" }, 404, cors);
}

/* ------------------------------------------------------------------ */
/* Route /coach-sync : relaie vers Apps Script, signe (HMAC)            */
/* ------------------------------------------------------------------ */

// Types d'evenements que l'application envoie reellement.
//
// alerte_decalages et resume_hebdo manquaient a cette liste : les deux
// etaient donc rejetes en 400 par le proxy, y compris AVANT la migration.
// Le coach n'a jamais recu ni la derive d'horaire, ni le taux de respect
// hebdomadaire.
const TYPES_AUTORISES = [
  "pointage",
  "justification",
  "semaine_difficile",
  "alerte_semaines_difficiles",
  "alerte_seances_manquees",
  "alerte_decalages",
  "resume_hebdo"
];

const LONGUEUR_MAX_TEXTE = 500;
const MARQUE_NON_VERIFIE = " (non vérifié)";

/**
 * Nombre transmis tel quel, 0 compris ; vide si absent ou illisible.
 * (« Number(x) || "" » effacait les zeros : un resume hebdo a 0 decale
 * arrivait avec une colonne Decales vide dans le classeur du coach.)
 */
function nombreOuVide(valeur) {
  if (valeur === undefined || valeur === null || valeur === "") return "";
  const n = Number(valeur);
  return Number.isFinite(n) ? n : "";
}

function texteCourt(valeur) {
  if (valeur === undefined || valeur === null) return "";
  return String(valeur).slice(0, LONGUEUR_MAX_TEXTE);
}

async function hmacHex(secret, message) {
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(message)));
  return Array.from(sig, (o) => o.toString(16).padStart(2, "0")).join("");
}

/**
 * Enveloppe signee pour Apps Script (v2).
 *
 * Le secret ne voyage plus : seule la signature HMAC-SHA256 de
 * « v2.<horodatage>.<nonce>.<charge> » part avec l'evenement. Le script
 * refuse une signature fausse, un horodatage de plus de 5 minutes, et un
 * nonce deja vu (rejeu). Apps Script ne donne pas acces aux en-tetes HTTP :
 * tout est donc dans le corps.
 */
async function signerEvenement(propre, secret, maintenant = Date.now(), nonce = aleatoireHex(16)) {
  const charge = JSON.stringify(propre);
  const sig = await hmacHex(secret, "v2." + maintenant + "." + nonce + "." + charge);
  return JSON.stringify({ v: 2, ts: maintenant, nonce, charge, sig });
}

async function relaiCoachSync(request, env, cors, ip) {
  const route = "/coach-sync";
  if (!env.COACH_SYNC_URL || !env.COACH_SYNC_SECRET) return refus(route, 503, "proxy-non-configure", cors);

  const id = await identifier(route, request, env, cors);
  if (id.reponse) return id.reponse;
  const { client, db } = id;
  const maintenant = Date.now();

  if (db) {
    const liste = client
      ? [
          { cle: `sync:min:${client.id}:${minute(maintenant)}`, limite: PLAFONDS.syncParMinute, dureeMs: 120000, raison: "trop-de-requetes" },
          { cle: `sync:jour:${client.id}:${jourUtc(maintenant)}`, limite: PLAFONDS.syncParJour, dureeMs: 2 * 86400000, raison: "trop-de-requetes" }
        ]
      : [{ cle: `sync:ip:${(await hachage(ip)).slice(0, 16)}:${heureUtc(maintenant)}`, limite: PLAFONDS.syncAnonymeParHeure, dureeMs: 2 * 3600000, raison: "trop-de-requetes" }];
    const raison = await depasse(db, liste, maintenant);
    if (raison) return refus(route, 429, raison, cors, client);
  } else if (tropDeRequetes("sync:" + ip, "sync")) {
    return refus(route, 429, "trop-de-requetes", cors);
  }

  const lu = await lireJson(route, request, cors, TAILLE_MAX_SYNC);
  if (lu.reponse) return lu.reponse;
  const evenement = lu.corps;

  if (!TYPES_AUTORISES.includes(String(evenement.type || ""))) {
    return refus(route, 400, "type-inconnu", cors, client);
  }

  // On reconstruit l'evenement champ par champ : rien d'inattendu ne passe,
  // et chaque texte est plafonne avant d'atteindre le Google Sheets / les mails.
  //
  // LE PRENOM VIENT DE LA FICHE CLIENT, jamais de la requete : un jeton
  // valide dit qui ecrit. Sans jeton (mode transition), le prenom annonce
  // est garde mais marque « (non vérifié) » dans le classeur du coach.
  const propre = {
    type: texteCourt(evenement.type),
    client: client
      ? texteCourt(client.libelle)
      : texteCourt(evenement.client).slice(0, LONGUEUR_MAX_TEXTE - MARQUE_NON_VERIFIE.length) + MARQUE_NON_VERIFIE,
    date: texteCourt(evenement.date),
    creneau: texteCourt(evenement.creneau),
    lieu: texteCourt(evenement.lieu),
    heureReelle: texteCourt(evenement.heureReelle),
    retard: !!evenement.retard,
    maintien: !!evenement.maintien,
    dureeMin: nombreOuVide(evenement.dureeMin),
    rpe: nombreOuVide(evenement.rpe),
    ecartMin: nombreOuVide(evenement.ecartMin),
    motif: texteCourt(evenement.motif),
    message: texteCourt(evenement.message),
    note: texteCourt(evenement.note),
    weekKey: texteCourt(evenement.weekKey),
    nbManquees: nombreOuVide(evenement.nbManquees),
    // Champs des deux alertes ajoutees tardivement. Sans eux, le type
    // passait la liste blanche mais arrivait vide de chiffres en aval : le
    // proxy reconstruit l'evenement champ par champ, donc tout champ non
    // nomme ici est silencieusement perdu.
    nbDecalages: nombreOuVide(evenement.nbDecalages),
    honored: nombreOuVide(evenement.honored),
    resolved: nombreOuVide(evenement.resolved),
    missed: nombreOuVide(evenement.missed),
    shifted: nombreOuVide(evenement.shifted),
    pct: Number.isFinite(Number(evenement.pct)) ? Number(evenement.pct) : "",
    envoyeLe: texteCourt(evenement.envoyeLe)
  };

  const creneauxPlafonnes = (liste) =>
    liste.slice(0, 20).map((m) => ({
      jour: texteCourt(m && m.jour),
      heure: texteCourt(m && m.heure),
      date: texteCourt(m && m.date),
      lieu: texteCourt(m && m.lieu)
    }));

  if (Array.isArray(evenement.creneauxManques)) {
    propre.creneauxManques = creneauxPlafonnes(evenement.creneauxManques);
  }
  if (Array.isArray(evenement.creneauxDecales)) {
    propre.creneauxDecales = creneauxPlafonnes(evenement.creneauxDecales);
  }

  let amont;
  try {
    amont = await fetch(env.COACH_SYNC_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: await signerEvenement(propre, env.COACH_SYNC_SECRET, maintenant)
    });
  } catch (e) {
    return refus(route, 502, "amont-injoignable", cors, client);
  }

  // Apps Script repond 200 avec { ok: true } ou { ok: false, error }.
  // On transmet la reponse pour que l'application sache si l'evenement est
  // reellement arrive — c'est ce qui evite de perdre un pointage en silence.
  const texte = await amont.text();
  let ok = amont.ok;
  try {
    ok = amont.ok && JSON.parse(texte).ok !== false;
  } catch (e) {
    // Reponse non JSON : on se fie au statut HTTP.
  }
  journal(route, ok ? 200 : 502, ok ? null : "destination-refus", client);
  return reponseJson({ ok, verifie: Boolean(client) }, ok ? 200 : 502, cors);
}

/* ------------------------------------------------------------------ */
/* Notifications push (7 octobre 2026)                                  */
/* ------------------------------------------------------------------ */
/*
 * Les rappels de l'application ne partent que quand elle est ouverte : un
 * telephone met une application web en pause des qu'on la quitte. Pour
 * qu'un rappel de creneau arrive application fermee, il faut qu'un serveur
 * l'envoie a l'heure dite. C'est ce que fait cette partie.
 *
 * Ce qui est stocke, par telephone (cle « ab: » + empreinte de l'adresse) :
 *   - l'adresse de notification fournie par Apple ou Google (anonyme) ;
 *   - les rappels des 7 prochains jours : heure, titre, texte.
 * Aucun nom, aucune donnee de suivi : l'application calcule les rappels
 * sur le telephone et n'envoie que leur texte.
 *
 * Les cles VAPID (qui prouvent aux services d'Apple et Google que les
 * notifications viennent bien de nous) sont creees par le Worker lui-meme
 * a la premiere demande et gardees dans le KV : personne n'a de secret a
 * copier.
 */

const PUSH_RAPPELS_MAX = 60;
const PUSH_HORIZON_MS = 8 * 24 * 3600 * 1000;
const PUSH_TAILLE_MAX = 32 * 1024;
const PUSH_TEXTE_MAX = 200;
const PUSH_SUJET_VAPID = "https://coachneiram.github.io/coach-neiram-app/";

// Seuls les services de notification des navigateurs sont joignables :
// sans cette liste, le proxy pourrait etre utilise pour appeler n'importe
// quelle adresse a intervalle regulier.
const PUSH_HOTES_AUTORISES = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^web\.push\.apple\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9.-]+\.notify\.windows\.com$/
];

function b64url(octets) {
  let bin = "";
  const t = new Uint8Array(octets);
  for (let i = 0; i < t.length; i++) bin += String.fromCharCode(t[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deB64url(texte) {
  const norme = String(texte).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norme + "===".slice((norme.length + 3) % 4));
  const t = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) t[i] = bin.charCodeAt(i);
  return t;
}

function concat(...parties) {
  const total = parties.reduce((n, p) => n + p.length, 0);
  const t = new Uint8Array(total);
  let i = 0;
  for (const p of parties) {
    t.set(p, i);
    i += p.length;
  }
  return t;
}

const texteEnOctets = (t) => new TextEncoder().encode(t);

async function hkdf(sel, ikm, info, longueur) {
  const cle = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: sel, info }, cle, longueur * 8);
  return new Uint8Array(bits);
}

/** Cle privee P-256 a partir de d (32 octets) et du point public (65 octets). */
function jwkPrive(d, publique) {
  return { kty: "EC", crv: "P-256", d: b64url(d), x: b64url(publique.slice(1, 33)), y: b64url(publique.slice(33, 65)), ext: true };
}

/**
 * Chiffrement d'une notification, RFC 8291 (aes128gcm, un seul bloc).
 * `ephemere` et `sel` ne sont fournis que par les tests (vecteurs du RFC) ;
 * en usage normal ils sont tires au hasard a chaque envoi.
 */
async function chiffrerWebPush({ texte, p256dh, auth, ephemere = null, sel = null }) {
  const cleClient = deB64url(p256dh);
  const secretAuth = deB64url(auth);
  const salt = sel || crypto.getRandomValues(new Uint8Array(16));

  let privee;
  let publique;
  if (ephemere) {
    publique = deB64url(ephemere.publique);
    privee = await crypto.subtle.importKey("jwk", jwkPrive(deB64url(ephemere.privee), publique), { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  } else {
    const paire = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    privee = paire.privateKey;
    publique = new Uint8Array(await crypto.subtle.exportKey("raw", paire.publicKey));
  }

  const publiqueClient = await crypto.subtle.importKey("raw", cleClient, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const secretEcdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: publiqueClient }, privee, 256));

  const ikm = await hkdf(secretAuth, secretEcdh, concat(texteEnOctets("WebPush: info\0"), cleClient, publique), 32);
  const cek = await hkdf(salt, ikm, texteEnOctets("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, texteEnOctets("Content-Encoding: nonce\0"), 12);

  const cleAes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const clair = concat(texteEnOctets(texte), new Uint8Array([2]));
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cleAes, clair));

  const taille = new Uint8Array([0, 0, 16, 0]); // rs = 4096
  return concat(salt, taille, new Uint8Array([publique.length]), publique, chiffre);
}

/** Cles VAPID du Worker : creees une fois, puis relues dans le KV. */
async function clesVapid(env) {
  const stockees = await env.PUSH_KV.get("vapid", "json");
  if (stockees && stockees.jwk && stockees.publique) return stockees;
  const paire = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", paire.privateKey);
  const publique = b64url(await crypto.subtle.exportKey("raw", paire.publicKey));
  await env.PUSH_KV.put("vapid", JSON.stringify({ jwk, publique }));
  // Relecture : si deux demandes ont cree une paire au meme moment, tout le
  // monde utilise celle qui est restee dans le KV.
  return (await env.PUSH_KV.get("vapid", "json")) || { jwk, publique };
}

async function enTeteVapid(adresse, vapid, maintenant) {
  const aud = new URL(adresse).origin;
  const entete = b64url(texteEnOctets(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const contenu = b64url(texteEnOctets(JSON.stringify({ aud, exp: Math.floor(maintenant / 1000) + 12 * 3600, sub: PUSH_SUJET_VAPID })));
  const cle = await crypto.subtle.importKey("jwk", vapid.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cle, texteEnOctets(entete + "." + contenu));
  return `vapid t=${entete}.${contenu}.${b64url(signature)}, k=${vapid.publique}`;
}

/** Envoie une notification ; rend le statut HTTP du service (0 si injoignable). */
async function envoyerPush(abonnement, message, vapid, maintenant) {
  const corps = await chiffrerWebPush({ texte: JSON.stringify(message), p256dh: abonnement.keys.p256dh, auth: abonnement.keys.auth });
  try {
    const r = await fetch(abonnement.endpoint, {
      method: "POST",
      headers: {
        Authorization: await enTeteVapid(abonnement.endpoint, vapid, maintenant),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "3600",
        Urgency: "high"
      },
      body: corps
    });
    return r.status;
  } catch (e) {
    return 0;
  }
}

function adresseAutorisee(adresse) {
  try {
    const u = new URL(adresse);
    return u.protocol === "https:" && PUSH_HOTES_AUTORISES.some((m) => m.test(u.hostname));
  } catch (e) {
    return false;
  }
}

async function empreinte(texte) {
  const h = await crypto.subtle.digest("SHA-256", texteEnOctets(texte));
  return b64url(h).slice(0, 32);
}

/** Abonnement et rappels nettoyes ; null si quelque chose ne va pas. */
function abonnementPropre(brut, maintenant) {
  const ab = brut && brut.abonnement;
  if (!ab || typeof ab.endpoint !== "string" || !adresseAutorisee(ab.endpoint)) return null;
  const cles = ab.keys || {};
  if (typeof cles.p256dh !== "string" || typeof cles.auth !== "string") return null;
  if (cles.p256dh.length > 120 || cles.auth.length > 40) return null;
  const rappels = (Array.isArray(brut.rappels) ? brut.rappels : [])
    .map((r) => ({
      quand: Number(r && r.quand),
      titre: String((r && r.titre) || "").slice(0, PUSH_TEXTE_MAX),
      texte: String((r && r.texte) || "").slice(0, PUSH_TEXTE_MAX),
      tag: String((r && r.tag) || "").slice(0, 60)
    }))
    .filter((r) => Number.isFinite(r.quand) && r.quand > maintenant - 15 * 60 * 1000 && r.quand < maintenant + PUSH_HORIZON_MS && r.titre)
    .sort((a, b) => a.quand - b.quand)
    .slice(0, PUSH_RAPPELS_MAX);
  return { abonnement: { endpoint: ab.endpoint, keys: { p256dh: cles.p256dh, auth: cles.auth } }, rappels, majLe: maintenant };
}

async function routePush(chemin, request, env, cors, ip) {
  if (!env.PUSH_KV) return reponseJson({ ok: false, error: "push-non-configure" }, 503, cors);
  if (tropDeRequetes("push:" + ip, "push")) return reponseJson({ ok: false, error: "trop-de-requetes" }, 429, cors);

  let corps = {};
  try {
    const brut = await request.text();
    if (brut.length > PUSH_TAILLE_MAX) return reponseJson({ ok: false, error: "requete-trop-grosse" }, 413, cors);
    corps = brut ? JSON.parse(brut) : {};
  } catch (e) {
    return reponseJson({ ok: false, error: "json-invalide" }, 400, cors);
  }

  if (chemin === "/push/cle") {
    const vapid = await clesVapid(env);
    return reponseJson({ ok: true, cle: vapid.publique }, 200, cors);
  }

  if (chemin === "/push/abonner") {
    const propre = abonnementPropre(corps, Date.now());
    if (!propre) return reponseJson({ ok: false, error: "abonnement-invalide" }, 400, cors);
    await env.PUSH_KV.put("ab:" + (await empreinte(propre.abonnement.endpoint)), JSON.stringify(propre));
    return reponseJson({ ok: true, rappels: propre.rappels.length }, 200, cors);
  }

  if (chemin === "/push/desabonner") {
    if (typeof corps.endpoint !== "string") return reponseJson({ ok: false, error: "abonnement-invalide" }, 400, cors);
    await env.PUSH_KV.delete("ab:" + (await empreinte(corps.endpoint)));
    return reponseJson({ ok: true }, 200, cors);
  }

  return reponseJson({ ok: false, error: "not-found" }, 404, cors);
}

/**
 * Tache planifiee. Pour chaque telephone : envoie les rappels dont l'heure
 * est passee, les retire, et oublie le telephone si le service repond que
 * l'abonnement n'existe plus (404 ou 410 : application desinstallee,
 * notifications coupees). Un rappel en retard de plus d'une heure n'est
 * pas envoye : « ton creneau commence dans 1 h » deux heures apres n'aide
 * personne.
 */
async function envoyerRappelsDus(env, maintenant) {
  const bilan = { envoyes: 0, perimes: 0, oublies: 0 };
  let vapid = null;
  let curseur;
  do {
    const page = await env.PUSH_KV.list({ prefix: "ab:", cursor: curseur });
    for (const { name } of page.keys) {
      const fiche = await env.PUSH_KV.get(name, "json");
      if (!fiche || !Array.isArray(fiche.rappels)) continue;
      const dus = fiche.rappels.filter((r) => r.quand <= maintenant);
      if (!dus.length) continue;
      const restants = fiche.rappels.filter((r) => r.quand > maintenant);
      let oublier = false;
      for (const r of dus) {
        if (maintenant - r.quand > 3600 * 1000) {
          bilan.perimes++;
          continue;
        }
        vapid = vapid || (await clesVapid(env));
        const statut = await envoyerPush(fiche.abonnement, { titre: r.titre, texte: r.texte, tag: r.tag }, vapid, maintenant);
        if (statut === 404 || statut === 410) {
          oublier = true;
          break;
        }
        if (statut >= 200 && statut < 300) bilan.envoyes++;
      }
      if (oublier) {
        await env.PUSH_KV.delete(name);
        bilan.oublies++;
      } else {
        await env.PUSH_KV.put(name, JSON.stringify({ ...fiche, rappels: restants }));
      }
    }
    curseur = page.list_complete ? undefined : page.cursor;
  } while (curseur);
  return bilan;
}

/**
 * Annonces a tous les telephones abonnes aux notifications (24 octobre
 * 2026, demande du coach : prevenir les clients des nouveautes).
 *
 * Chaque annonce part UNE fois par telephone, entre `debut` et `fin`, et
 * seulement entre 9 h et 20 h (heure de Paris) : jamais de notification la
 * nuit. Le « deja envoye » est garde a part (cle « annonce:<id>:<telephone> »)
 * parce que la fiche du telephone est reecrite a chaque mise a jour de ses
 * rappels. Pour une nouvelle annonce : ajouter une entree, redeployer.
 */
const ANNONCES = [
  {
    id: "2026-10-24-nouveautes",
    debut: Date.parse("2026-10-24T07:00:00Z"),
    fin: Date.parse("2026-10-28T19:00:00Z"),
    titre: "Coach Neiram — du nouveau 💪",
    texte: "Chronomètre de repos, disques et échauffement sous chaque exercice, et un tuto pour chaque écran. Ouvre l'appli pour découvrir.",
    tag: "nouveautes-2026-10-24"
  }
];
const HEURE_ANNONCE_MIN = 9;
const HEURE_ANNONCE_MAX = 20;

/** Heure (0 a 23) a Paris pour un instant donne. */
function heureParis(maintenant) {
  const h = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hour12: false }).format(new Date(maintenant));
  return Number.parseInt(h, 10) % 24;
}

async function envoyerAnnonces(env, maintenant, annonces = ANNONCES) {
  const bilan = { envoyees: 0, oublies: 0 };
  const actives = annonces.filter((a) => maintenant >= a.debut && maintenant <= a.fin);
  if (!actives.length) return bilan;
  const h = heureParis(maintenant);
  if (h < HEURE_ANNONCE_MIN || h >= HEURE_ANNONCE_MAX) return bilan;
  let vapid = null;
  let curseur;
  do {
    const page = await env.PUSH_KV.list({ prefix: "ab:", cursor: curseur });
    for (const { name } of page.keys) {
      const fiche = await env.PUSH_KV.get(name, "json");
      if (!fiche || !fiche.abonnement) continue;
      for (const a of actives) {
        const marque = "annonce:" + a.id + ":" + name;
        if (await env.PUSH_KV.get(marque)) continue;
        vapid = vapid || (await clesVapid(env));
        const statut = await envoyerPush(fiche.abonnement, { titre: a.titre, texte: a.texte, tag: a.tag }, vapid, maintenant);
        if (statut === 404 || statut === 410) {
          await env.PUSH_KV.delete(name);
          bilan.oublies++;
          break;
        }
        if (statut >= 200 && statut < 300) {
          // Garde la marque un peu au-dela de la fin de l'annonce, puis elle s'efface seule.
          await env.PUSH_KV.put(marque, "1", { expirationTtl: 30 * 24 * 3600 });
          bilan.envoyees++;
        }
      }
    }
    curseur = page.list_complete ? undefined : page.cursor;
  } while (curseur);
  return bilan;
}

// Acces des tests aux fonctions internes (sans effet en production).
if (typeof globalThis.__COACH_TEST__ === "object" && globalThis.__COACH_TEST__) {
  Object.assign(globalThis.__COACH_TEST__, { chiffrerWebPush, enTeteVapid, envoyerRappelsDus, envoyerAnnonces, heureParis, abonnementPropre, deB64url, b64url, validerRequeteIa, signerEvenement });
}
