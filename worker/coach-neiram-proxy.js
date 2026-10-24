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
 *   POST /defis/...       -> defis entre amis, reserves aux clients du coach
 *                            (jeton client obligatoire, meme en transition)
 *   POST /communaute/...  -> communaute « Team Neiram » entre clients du coach :
 *                            classements, athlete du mois, mur des
 *                            transformations (jeton client obligatoire)
 * Et une tache planifiee (Cron Trigger, toutes les 15 minutes) qui envoie
 * les rappels arrives a echeance, meme application fermee, efface les
 * defis termines depuis plus de 60 jours et fait le menage de la
 * communaute (vieux scores, signalements traites).
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
      if (url.pathname.startsWith("/defis/")) return await routeDefis(url.pathname, request, env, cors);
      if (url.pathname.startsWith("/communaute/")) return await routeCommunaute(url.pathname, request, env, cors);
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
    if (env.DB) taches.push(nettoyerDefis(env, Date.now()).catch(() => null));
    if (env.DB) taches.push(nettoyerCommunaute(env, Date.now()).catch(() => null));
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
  "CREATE TABLE IF NOT EXISTS compteurs (cle TEXT PRIMARY KEY, n INTEGER NOT NULL, expire_le INTEGER NOT NULL)",
  // Defis entre amis (24 octobre 2026) : voir la section dediee plus bas.
  "CREATE TABLE IF NOT EXISTS defis (code TEXT PRIMARY KEY, type TEXT NOT NULL, debut TEXT NOT NULL, fin TEXT NOT NULL, createur TEXT NOT NULL, cree_le INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS defis_participants (code TEXT NOT NULL, client_id TEXT NOT NULL, pseudo TEXT NOT NULL, valeur REAL NOT NULL DEFAULT 0, maj_le INTEGER NOT NULL, PRIMARY KEY (code, client_id))",
  "CREATE INDEX IF NOT EXISTS defis_participants_client ON defis_participants (client_id)",
  // Communaute Team Neiram (24 octobre 2026) : voir la section dediee plus bas.
  "CREATE TABLE IF NOT EXISTS communaute_profils (client_id TEXT PRIMARY KEY, pseudo TEXT NOT NULL, pseudo_norme TEXT NOT NULL UNIQUE, stats TEXT NOT NULL DEFAULT '{}', accord_disc INTEGER NOT NULL DEFAULT 0, accord_transfo INTEGER NOT NULL DEFAULT 0, maj_le INTEGER NOT NULL, cree_le INTEGER NOT NULL, masque INTEGER NOT NULL DEFAULT 0)",
  "CREATE TABLE IF NOT EXISTS communaute_scores_mois (mois TEXT NOT NULL, discipline TEXT NOT NULL, client_id TEXT NOT NULL, score REAL NOT NULL, maj_le INTEGER NOT NULL, PRIMARY KEY (mois, discipline, client_id))",
  "CREATE INDEX IF NOT EXISTS communaute_scores_client ON communaute_scores_mois (client_id)",
  "CREATE TABLE IF NOT EXISTS communaute_transformations (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, periode TEXT NOT NULL, jours INTEGER NOT NULL, gras REAL, muscle REAL, texte TEXT NOT NULL, cree_le INTEGER NOT NULL, masque INTEGER NOT NULL DEFAULT 0)",
  "CREATE INDEX IF NOT EXISTS communaute_transformations_date ON communaute_transformations (masque, cree_le)",
  "CREATE TABLE IF NOT EXISTS communaute_bravos (transformation INTEGER NOT NULL, client_id TEXT NOT NULL, le INTEGER NOT NULL, PRIMARY KEY (transformation, client_id))",
  "CREATE TABLE IF NOT EXISTS communaute_signalements (id INTEGER PRIMARY KEY AUTOINCREMENT, cible_type TEXT NOT NULL, cible TEXT NOT NULL, motif TEXT, auteur TEXT NOT NULL, cree_le INTEGER NOT NULL, traite INTEGER NOT NULL DEFAULT 0, UNIQUE (cible_type, cible, auteur))"
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
      db.prepare("UPDATE jetons SET revoque_le = ?1 WHERE client_id = ?2 AND revoque_le IS NULL").bind(maintenant, clientId),
      // Un client revoque sort de ses defis entre amis : son pseudo et son
      // total disparaissent des classements.
      db.prepare("DELETE FROM defis_participants WHERE client_id = ?1").bind(clientId),
      // ... et de la communaute : profil, scores, transformations, bravos,
      // signalements (requetesEffacementCommunaute, section Communaute).
      ...requetesEffacementCommunaute(db, clientId)
    ]);
    return reponseJson({ ok: true }, 200, cors);
  }

  if (chemin === "/admin/communaute") return reponseJson(await adminCommunaute(db, corps), 200, cors);

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
  "resume_hebdo",
  // Sommeil et stress (24 octobre 2026) : le detail tient dans « message ».
  "alerte_sommeil_stress",
  // Autre sport (24 octobre 2026) : sport, duree, RPE et charge dans « message ».
  "activite"
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
// Annonce des reprises de Neiram (24 octobre 2026), une seule fois par
// telephone, entre 9 h et 20 h (heure de Paris), jusqu'au 1er novembre.
const ANNONCES = [
  {
    id: "2026-10-24-reprises-neiram",
    debut: Date.parse("2026-10-24T07:00:00Z"),
    fin: Date.parse("2026-11-01T19:00:00Z"),
    titre: "Coach Neiram — du nouveau 💪",
    texte: "Ton menu de la semaine, tous tes sports et tes performances, tes habitudes, le sommeil d'après les études, et un « ? » sur chaque carte. Ouvre l'appli pour découvrir.",
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

/* ------------------------------------------------------------------ */
/* Défis entre amis (24 octobre 2026)                                   */
/* ------------------------------------------------------------------ */
/*
 * Repris de l'app publique Neiram (worker/defis.js), accord du coach du
 * 24/10/2026, et RESERVE AUX CLIENTS DU COACH (Team Neiram) :
 *   - chaque route exige un jeton client valide (identifier), y compris en
 *     mode « transition » : pas d'anonyme dans les defis ;
 *   - un participant = client.id (jamais l'adresse IP ni un identifiant de
 *     telephone) ; un client revoque ne voit plus rien (jeton refuse) et
 *     sort de ses defis (/admin/revoquer efface ses participations).
 *
 * Un client lance un defi de 7 jours (le plus de pas, de seances ou de
 * minutes de sport) et partage un code a 6 caracteres. Ce qui est publie
 * aux autres participants du defi : un pseudo (filtre) et un total, borne
 * ici. Rien d'autre : ni le libelle du client, ni poids, ni sante.
 *
 * Plafonds (fonction depasse) : 5 defis crees par jour et par client,
 * 30 appels par minute et par client ; 20 participants par defi ; 3 defis
 * en cours au plus par client. Les defis sont effaces 60 jours apres leur
 * fin, par la tache planifiee.
 */

const DEFIS_TYPES = {
  pas: { max: 7 * 70000 },
  seances: { max: 21 },
  minutes: { max: 7 * 600 }
};
const DEFIS_DUREE_JOURS = 7;
const DEFIS_PARTICIPANTS_MAX = 20;
const DEFIS_PAR_JOUR = 5;
const DEFIS_ACTIFS_MAX = 3;
const DEFIS_APPELS_PAR_MINUTE = 30;
const DEFIS_CONSERVATION_JOURS = 60;
const DEFIS_PROGRES_MAX = 20;
const TAILLE_MAX_DEFIS = 4 * 1024;
// Sans 0/O, 1/I/L : un code se dicte et se recopie sans erreur.
const ALPHABET_DEFI = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LONGUEUR_CODE_DEFI = 6;

const PSEUDO_MIN = 3;
const PSEUDO_MAX = 20;

/**
 * Mots refuses dans un pseudo (insultes, haine, sexe, drogue, usurpation),
 * repris de l'app publique (worker/communaute.js) : liste courte et
 * volontairement large.
 */
const MOTS_INTERDITS = [
  "connard", "connasse", "salope", "salaud", "pute", "putain", "encule", "enculé", "batard", "bâtard", "pd", "pédé", "pede",
  "negre", "nègre", "bougnoul", "youpin", "nazi", "hitler", "fdp", "ntm", "nique", "niquer", "bite", "chatte", "couille",
  "porn", "porno", "sexe", "xxx", "fuck", "shit", "bitch", "dick", "cock", "pussy", "nigger", "nigga", "faggot", "whore",
  "cocaine", "coke", "heroine", "weed", "admin", "neiram", "coachneiram", "moderateur", "modérateur"
];

const normaliserPseudo = (t) =>
  String(t || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s");

function contientMotInterdit(texte) {
  const n = normaliserPseudo(texte);
  return MOTS_INTERDITS.some((m) => {
    const mn = normaliserPseudo(m);
    // Mots tres courts (pd, fdp...) : seulement s'ils sont le pseudo entier
    // ou un mot isole, pour ne pas refuser « Lepdg » ou « Sandpiper ».
    if (mn.length <= 3) return n === mn || new RegExp(`(^|[^a-z0-9])${m}([^a-z0-9]|$)`, "i").test(String(texte || ""));
    return n.includes(mn);
  });
}

/** Pseudo propre, ou { erreur } : longueur, caracteres, mots interdits. */
function validerPseudo(brut) {
  const pseudo = String(brut || "").trim().replace(/\s+/g, " ");
  if (pseudo.length < PSEUDO_MIN || pseudo.length > PSEUDO_MAX) return { erreur: "pseudo-longueur" };
  if (!/^[\p{L}\p{N} _.\-]+$/u.test(pseudo)) return { erreur: "pseudo-caracteres" };
  if (contientMotInterdit(pseudo)) return { erreur: "pseudo-refuse" };
  return { pseudo, norme: normaliserPseudo(pseudo) };
}

/** Pseudo par defaut : le prenom du libelle (« Sabine P. » → « Sabine »). */
function prenomDuLibelle(libelle) {
  return String(libelle || "").trim().split(/\s+/)[0] || "";
}

function genererCodeDefi(aleatoire = () => crypto.getRandomValues(new Uint32Array(1))[0]) {
  let c = "";
  for (let i = 0; i < LONGUEUR_CODE_DEFI; i++) c += ALPHABET_DEFI[aleatoire() % ALPHABET_DEFI.length];
  return c;
}

const codeDefiPropre = (v) =>
  String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, LONGUEUR_CODE_DEFI);

const plusJours = (iso, n) => jourUtc(Date.parse(iso + "T12:00:00Z") + n * 86400000);

/** Total borne et arrondi, ou null s'il est impossible pour ce type. */
function valeurDefiBornee(type, brut) {
  const regle = DEFIS_TYPES[type];
  const v = Number(brut);
  if (!regle || brut === null || brut === undefined || brut === "" || !Number.isFinite(v) || v < 0 || v > regle.max) return null;
  return Math.round(v);
}

/**
 * Etat d'un defi vu par un client : seuls pseudo, total, rang et « moi »
 * sortent. Les participants d'un client revoque sont ecartes (ceinture et
 * bretelles : /admin/revoquer les efface deja).
 */
async function etatDefi(db, code, clientId, maintenant) {
  const d = await db.prepare("SELECT code, type, debut, fin FROM defis WHERE code = ?1").bind(code).first();
  if (!d) return null;
  const { results } = await db
    .prepare(
      "SELECT p.client_id AS client_id, p.pseudo AS pseudo, p.valeur AS valeur FROM defis_participants p JOIN clients c ON c.id = p.client_id WHERE p.code = ?1 AND c.revoque_le IS NULL ORDER BY p.valeur DESC, p.pseudo ASC"
    )
    .bind(code)
    .all();
  const participants = (results || []).map((p, i) => ({ rang: i + 1, pseudo: p.pseudo, valeur: Number(p.valeur), moi: p.client_id === clientId }));
  return { code: d.code, type: d.type, debut: d.debut, fin: d.fin, termine: jourUtc(maintenant) > d.fin, participants };
}

/** Defis encore en cours (pas finis) auxquels le client participe. */
async function defisActifs(db, clientId, maintenant) {
  const r = await db
    .prepare("SELECT COUNT(*) AS n FROM defis_participants p JOIN defis d ON d.code = p.code WHERE p.client_id = ?1 AND d.fin >= ?2")
    .bind(clientId, jourUtc(maintenant))
    .first();
  return Number((r && r.n) || 0);
}

async function routeDefis(chemin, request, env, cors) {
  const route = "/defis";
  const id = await identifier(route, request, env, cors);
  if (id.reponse) return id.reponse;
  const { client, db } = id;
  // Mode transition : identifier accepte une requete sans jeton. Pas ici.
  if (!client) return refus(route, 401, "acces-requis", cors);
  if (!db) return refus(route, 503, "acces-non-configure", cors);

  const maintenant = Date.now();
  const lent = await depasse(
    db,
    [{ cle: `defis:min:${client.id}:${minute(maintenant)}`, limite: DEFIS_APPELS_PAR_MINUTE, dureeMs: 120000, raison: "trop-de-requetes" }],
    maintenant
  );
  if (lent) return refus(route, 429, lent, cors, client);

  const lu = await lireJson(route, request, cors, TAILLE_MAX_DEFIS);
  if (lu.reponse) return lu.reponse;
  const corps = lu.corps;
  const pseudoDemande = (brut) => validerPseudo(brut === undefined || brut === null || brut === "" ? prenomDuLibelle(client.libelle) : brut);

  if (chemin === "/defis/creer") {
    const type = String(corps.type || "");
    if (!DEFIS_TYPES[type]) return refus(route, 400, "type-inconnu", cors, client);
    const v = pseudoDemande(corps.pseudo);
    if (v.erreur) return refus(route, 400, v.erreur, cors, client);
    if ((await defisActifs(db, client.id, maintenant)) >= DEFIS_ACTIFS_MAX) return refus(route, 400, "trop-de-defis-actifs", cors, client);
    const trop = await depasse(
      db,
      [{ cle: `defis:creer:${client.id}:${jourUtc(maintenant)}`, limite: DEFIS_PAR_JOUR, dureeMs: 2 * 86400000, raison: "trop-de-defis" }],
      maintenant
    );
    if (trop) return refus(route, 429, trop, cors, client);
    const debut = jourUtc(maintenant);
    const fin = plusJours(debut, DEFIS_DUREE_JOURS - 1);
    let code = genererCodeDefi();
    for (let i = 0; i < 5 && (await db.prepare("SELECT 1 AS x FROM defis WHERE code = ?1").bind(code).first()); i++) code = genererCodeDefi();
    await db.batch([
      db.prepare("INSERT INTO defis (code, type, debut, fin, createur, cree_le) VALUES (?1, ?2, ?3, ?4, ?5, ?6)").bind(code, type, debut, fin, client.id, maintenant),
      db.prepare("INSERT INTO defis_participants (code, client_id, pseudo, valeur, maj_le) VALUES (?1, ?2, ?3, 0, ?4)").bind(code, client.id, v.pseudo, maintenant)
    ]);
    journal(route, 200, null, client);
    return reponseJson({ ok: true, defi: await etatDefi(db, code, client.id, maintenant) }, 200, cors);
  }

  if (chemin === "/defis/rejoindre") {
    const code = codeDefiPropre(corps.code);
    if (code.length !== LONGUEUR_CODE_DEFI) return refus(route, 404, "defi-inconnu", cors, client);
    const v = pseudoDemande(corps.pseudo);
    if (v.erreur) return refus(route, 400, v.erreur, cors, client);
    const d = await etatDefi(db, code, client.id, maintenant);
    if (!d) return refus(route, 404, "defi-inconnu", cors, client);
    if (d.termine) return refus(route, 400, "defi-termine", cors, client);
    if (!d.participants.some((p) => p.moi)) {
      if (d.participants.length >= DEFIS_PARTICIPANTS_MAX) return refus(route, 400, "defi-complet", cors, client);
      if ((await defisActifs(db, client.id, maintenant)) >= DEFIS_ACTIFS_MAX) return refus(route, 400, "trop-de-defis-actifs", cors, client);
    }
    if (d.participants.some((p) => !p.moi && normaliserPseudo(p.pseudo) === v.norme)) return refus(route, 409, "pseudo-pris", cors, client);
    await db
      .prepare(
        "INSERT INTO defis_participants (code, client_id, pseudo, valeur, maj_le) VALUES (?1, ?2, ?3, 0, ?4) ON CONFLICT(code, client_id) DO UPDATE SET pseudo = ?3, maj_le = ?4"
      )
      .bind(code, client.id, v.pseudo, maintenant)
      .run();
    journal(route, 200, null, client);
    return reponseJson({ ok: true, defi: await etatDefi(db, code, client.id, maintenant) }, 200, cors);
  }

  if (chemin === "/defis/progres") {
    // Plusieurs defis d'un coup : [{ code, valeur }] ; sans valeur, on lit
    // seulement l'etat (premier passage : le telephone ne connait pas
    // encore les dates du defi).
    const liste = Array.isArray(corps.defis) ? corps.defis.slice(0, DEFIS_PROGRES_MAX) : [];
    const sortie = [];
    const vus = new Set();
    for (const x of liste) {
      const code = codeDefiPropre(x && x.code);
      if (code.length !== LONGUEUR_CODE_DEFI || vus.has(code)) continue;
      vus.add(code);
      const d = await db.prepare("SELECT type, fin FROM defis WHERE code = ?1").bind(code).first();
      if (!d) continue;
      const valeur = valeurDefiBornee(d.type, x.valeur);
      // Un defi termine ne bouge plus (un jour de grace pour les pas de la veille).
      if (valeur !== null && jourUtc(maintenant) <= plusJours(d.fin, 1)) {
        await db
          .prepare("UPDATE defis_participants SET valeur = ?3, maj_le = ?4 WHERE code = ?1 AND client_id = ?2")
          .bind(code, client.id, valeur, maintenant)
          .run();
      }
      const etat = await etatDefi(db, code, client.id, maintenant);
      if (etat && etat.participants.some((p) => p.moi)) sortie.push(etat);
    }
    return reponseJson({ ok: true, defis: sortie }, 200, cors);
  }

  if (chemin === "/defis/quitter") {
    // Quitter efface la participation (pseudo et total) ; un defi sans
    // plus personne est efface aussi.
    const code = codeDefiPropre(corps.code);
    await db.batch([
      db.prepare("DELETE FROM defis_participants WHERE code = ?1 AND client_id = ?2").bind(code, client.id),
      db.prepare("DELETE FROM defis WHERE code = ?1 AND NOT EXISTS (SELECT 1 FROM defis_participants WHERE code = ?1)").bind(code)
    ]);
    journal(route, 200, null, client);
    return reponseJson({ ok: true }, 200, cors);
  }

  return reponseJson({ ok: false, error: "not-found" }, 404, cors);
}

/** Tache planifiee : efface les defis finis depuis plus de 60 jours. */
async function nettoyerDefis(env, maintenant) {
  const db = await base(env);
  if (!db) return;
  const limite = plusJours(jourUtc(maintenant), -DEFIS_CONSERVATION_JOURS);
  await db.batch([
    db.prepare("DELETE FROM defis_participants WHERE code IN (SELECT code FROM defis WHERE fin < ?1)").bind(limite),
    db.prepare("DELETE FROM defis WHERE fin < ?1").bind(limite)
  ]);
}

/* ------------------------------------------------------------------ */
/* Communauté Team Neiram (24 octobre 2026)                             */
/* ------------------------------------------------------------------ */
/*
 * Reprise de l'app publique Neiram (worker/communaute.js et
 * worker/transformations.js), accord du coach du 24/10/2026, RESERVEE AUX
 * CLIENTS DU COACH :
 *   - chaque route exige un jeton client valide (identifier), y compris en
 *     mode « transition » ; identite = client.id ;
 *   - un client revoque ne voit plus rien (jeton refuse), disparait de tous
 *     les classements (jointure sur clients) et /admin/revoquer efface ses
 *     donnees (requetesEffacementCommunaute).
 *
 * TROIS ACCORDS DISTINCTS, donnes dans l'app et retirables a tout moment :
 *   - profil : pseudo (filtre par validerPseudo) et classements de
 *     regularite (seances du mois, regularite sur 30 jours) ;
 *   - disciplines (accord_disc) : performances par discipline, sexe et
 *     categorie de poids (jamais le poids exact), athlete du mois ;
 *   - transformation (accord_transfo) : gras perdu (% du poids de depart)
 *     et muscle pris (kg), mur des transformations.
 * Retirer un accord efface cote serveur les donnees correspondantes ;
 * /communaute/supprimer efface tout.
 *
 * RIEN DE SANTE : ni poids, ni mesure, ni masse grasse. Les exclusions du
 * classement de perte (moins de 18 ans, grossesse, allaitement, antecedent
 * de trouble alimentaire, IMC sous 18,5, masse grasse tres basse) se
 * calculent sur le telephone : le serveur recoit « perte_eligible » (1 ou
 * 0), jamais la raison, et ecarte la perte de gras sans ce 1.
 *
 * MODERATION : pseudos et messages filtres (mots interdits, liens, e-mails,
 * numeros), signalement par les autres clients, masquage automatique a 2
 * signalements de clients differents (le groupe est petit), masquage par le
 * coach (/admin/communaute, ADMIN_SECRET) ou a la main dans D1 (requetes
 * dans worker/README.md).
 *
 * Plafonds (depasse) : 30 appels par minute et par client, 100 ecritures
 * (profil, chiffres, accords) par jour, 10 signalements et 100 « Bravo » par
 * jour, une transformation publiee par semaine.
 */

/**
 * Categories de classement : borne haute (et basse pour les temps), accord
 * requis, filtres permis. Memes bornes que l'app publique.
 */
const COMMUNAUTE_CATEGORIES = {
  seances_mois: { max: 62, mensuel: true, accord: "profil" },
  regularite_30: { max: 30, frais: true, accord: "profil" },
  // Force athletique : total des trois maxis et points IPF GL.
  pl_total: { max: 1300, accord: "disc", filtres: ["sexe", "cat_pl"] },
  pl_gl: { max: 140, accord: "disc", filtres: ["sexe"] },
  // Halterophilie : total olympique et points Sinclair.
  halt_total: { max: 500, accord: "disc", filtres: ["sexe", "cat_halt"] },
  halt_sinclair: { max: 560, accord: "disc", filtres: ["sexe"] },
  // Course et natation : secondes, le plus petit gagne ; le minimum refuse
  // un temps plus rapide que le record du monde.
  course_5k: { min: 750, max: 7200, ordre: "asc", accord: "disc", filtres: ["sexe"] },
  course_10k: { min: 1560, max: 14400, ordre: "asc", accord: "disc", filtres: ["sexe"] },
  course_semi: { min: 3360, max: 21600, ordre: "asc", accord: "disc", filtres: ["sexe"] },
  course_marathon: { min: 7140, max: 43200, ordre: "asc", accord: "disc", filtres: ["sexe"] },
  nat_50nl_25: { min: 19, max: 300, ordre: "asc", accord: "disc", filtres: ["sexe"] },
  nat_100nl_25: { min: 44, max: 600, ordre: "asc", accord: "disc", filtres: ["sexe"] },
  nat_400nl_25: { min: 210, max: 1800, ordre: "asc", accord: "disc", filtres: ["sexe"] },
  nat_50nl_50: { min: 20, max: 300, ordre: "asc", accord: "disc", filtres: ["sexe"] },
  nat_100nl_50: { min: 46, max: 600, ordre: "asc", accord: "disc", filtres: ["sexe"] },
  nat_400nl_50: { min: 218, max: 1800, ordre: "asc", accord: "disc", filtres: ["sexe"] },
  // Transformation : plafonds du telephone (1 % du poids par semaine,
  // 0,25 kg de muscle par semaine, lib/transformation.js).
  gras_90: { max: 13, accord: "transfo", perte: true, filtres: ["sexe"] },
  muscle_90: { max: 3.3, accord: "transfo", filtres: ["sexe"] },
  gras_an: { max: 52, accord: "transfo", perte: true, filtres: ["sexe"] },
  muscle_an: { max: 13, accord: "transfo", filtres: ["sexe"] }
};

/** Valeurs permises des filtres (categories IPF et IWF du 01/08/2026). */
const COMMUNAUTE_FILTRES = {
  sexe: ["h", "f"],
  cat_pl: ["43", "47", "52", "57", "63", "69", "76", "84", "84+", "53", "59", "66", "74", "83", "93", "105", "120", "120+"],
  cat_halt: ["45", "49", "53", "57", "61", "69", "77", "77+", "86", "86+", "55", "60", "65", "70", "75", "85", "95", "95+", "110", "110+"]
};
/** Accord qui permet de publier chaque filtre. */
const ACCORD_FILTRE = { sexe: ["disc", "transfo"], cat_pl: ["disc"], cat_halt: ["disc"] };

/**
 * Athlete du mois : un score comparable entre hommes et femmes et entre
 * categories, calcule sur le telephone (lib/stats-disciplines.js) pour une
 * performance notee dans le mois. Chaque publication garde le meilleur
 * score du mois ; l'annee retient le meilleur score mensuel.
 */
const COMMUNAUTE_SCORES_MOIS = {
  force: { cle: "score_force", max: 140 },
  halterophilie: { cle: "score_halt", max: 560 },
  course: { cle: "score_course", max: 100 },
  natation: { cle: "score_natation", max: 1100 }
};

const COMMUNAUTE_PERIODES = { "90": { gras: 13, muscle: 3.3, jours: 90 }, an: { gras: 52, muscle: 13, jours: 366 } };
const SIGNALEMENTS_POUR_MASQUER = 2;
const COMMUNAUTE_TAILLE_CLASSEMENT = 50;
const COMMUNAUTE_TAILLE_PODIUM = 3;
const COMMUNAUTE_FRAIS_MS = 3 * 86400000;
const COMMUNAUTE_APPELS_PAR_MINUTE = 30;
const COMMUNAUTE_ECRITURES_PAR_JOUR = 100;
const COMMUNAUTE_SIGNALEMENTS_PAR_JOUR = 10;
const COMMUNAUTE_BRAVOS_PAR_JOUR = 100;
const DELAI_TRANSFORMATION_MS = 7 * 86400000;
const TEXTE_TRANSFORMATION_MAX = 280;
const MUR_TAILLE = 50;
const TAILLE_MAX_COMMUNAUTE = 8 * 1024;
// Menage (tache planifiee) : scores de plus de deux ans civils,
// signalements traites et transformations masquees de plus de 180 jours.
const COMMUNAUTE_CONSERVATION_MS = 180 * 86400000;

/** Liens, e-mails, numeros de telephone : refuses dans les messages. */
function contientCoordonnees(texte) {
  const t = String(texte || "");
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|fr|net|org|io|be|ch|ca|ly|gg|me)\b)/i.test(t)) return true;
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(t)) return true;
  if (/(\+?\d[\s.-]?){9,}/.test(t)) return true;
  return false;
}

const moisUtc = (maintenant) => new Date(maintenant).toISOString().slice(0, 7);
const moisAvant = (mois) => {
  const [a, m] = mois.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
};

/**
 * Chiffres envoyes par l'app : seuls les champs connus, bornes, ET permis
 * par les accords enregistres ici (jamais ceux que l'app pretend avoir).
 * `accords` : { disc, transfo } (booleens). La perte de gras exige
 * perte_eligible === 1 (calcule sur le telephone) ; ce drapeau n'est pas
 * garde.
 */
function nettoyerStatsCommunaute(brut, maintenant, accords = {}) {
  const s = brut && typeof brut === "object" && !Array.isArray(brut) ? brut : {};
  const permis = { profil: true, disc: !!accords.disc, transfo: !!accords.transfo };
  const sortie = {};
  for (const [cle, regle] of Object.entries(COMMUNAUTE_CATEGORIES)) {
    if (!permis[regle.accord]) continue;
    if (regle.perte && Number(s.perte_eligible) !== 1) continue;
    const v = Number(s[cle]);
    if (s[cle] !== null && s[cle] !== "" && Number.isFinite(v) && v > 0 && v >= (regle.min || 0) && v <= regle.max) sortie[cle] = Math.round(v * 10) / 10;
  }
  for (const [cle, valeurs] of Object.entries(COMMUNAUTE_FILTRES)) {
    if (ACCORD_FILTRE[cle].some((a) => permis[a]) && valeurs.includes(s[cle])) sortie[cle] = s[cle];
  }
  if (permis.disc) {
    for (const { cle, max } of Object.values(COMMUNAUTE_SCORES_MOIS)) {
      const v = Number(s[cle]);
      if (Number.isFinite(v) && v > 0 && v <= max) sortie[cle] = Math.round(v * 10) / 10;
    }
  }
  // Le mois des chiffres : le mois en cours, ou le precedent (fuseau du
  // telephone en debut de mois). Rien dans le futur ni dans le passe lointain.
  const courant = moisUtc(maintenant);
  sortie.mois = s.mois === courant || s.mois === moisAvant(courant) ? s.mois : courant;
  return sortie;
}

/** Publication du mur verifiee, ou { erreur }. */
function validerTransformationCommunaute(corps) {
  const periode = String((corps && corps.periode) || "");
  const regle = COMMUNAUTE_PERIODES[periode];
  if (!regle) return { erreur: "periode-inconnue" };
  const jours = Math.round(Number(corps.jours));
  if (!(jours >= 21 && jours <= regle.jours)) return { erreur: "periode-inconnue" };
  const lire = (v, max) => {
    const n = Number(v);
    return v !== null && v !== "" && Number.isFinite(n) && n > 0 && n <= max ? Math.round(n * 10) / 10 : null;
  };
  // Perte de gras : seulement si le telephone l'a jugee eligible.
  const gras = Number(corps.perte_eligible) === 1 ? lire(corps.gras, regle.gras) : null;
  const muscle = lire(corps.muscle, regle.muscle);
  if (gras == null && muscle == null) return { erreur: "transformation-vide" };
  const texte = String(corps.texte == null ? "" : corps.texte)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TEXTE_TRANSFORMATION_MAX);
  if (texte.length < 3) return { erreur: "message-vide" };
  if (contientMotInterdit(texte) || contientCoordonnees(texte)) return { erreur: "message-refuse" };
  return { periode, jours, gras, muscle, texte };
}

/**
 * Tout ce que la communaute garde d'un client, a effacer (suppression du
 * profil, revocation). Une liste d'instructions pour db.batch.
 */
function requetesEffacementCommunaute(db, clientId) {
  return [
    db.prepare("DELETE FROM communaute_bravos WHERE client_id = ?1 OR transformation IN (SELECT id FROM communaute_transformations WHERE client_id = ?1)").bind(clientId),
    db.prepare("DELETE FROM communaute_signalements WHERE auteur = ?1 OR (cible_type = 'profil' AND cible = ?1) OR (cible_type = 'transformation' AND cible IN (SELECT CAST(id AS TEXT) FROM communaute_transformations WHERE client_id = ?1))").bind(clientId),
    db.prepare("DELETE FROM communaute_transformations WHERE client_id = ?1").bind(clientId),
    db.prepare("DELETE FROM communaute_scores_mois WHERE client_id = ?1").bind(clientId),
    db.prepare("DELETE FROM communaute_profils WHERE client_id = ?1").bind(clientId)
  ];
}

/** Garde le meilleur score du mois par discipline (accord « disciplines »). */
async function retenirScoresCommunaute(db, clientId, stats, maintenant) {
  const requetes = [];
  for (const [discipline, { cle }] of Object.entries(COMMUNAUTE_SCORES_MOIS)) {
    if (!(stats[cle] > 0)) continue;
    requetes.push(
      db
        .prepare(
          "INSERT INTO communaute_scores_mois (mois, discipline, client_id, score, maj_le) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(mois, discipline, client_id) DO UPDATE SET score = MAX(score, excluded.score), maj_le = excluded.maj_le"
        )
        .bind(stats.mois, discipline, clientId, stats[cle], maintenant)
    );
  }
  if (requetes.length) await db.batch(requetes);
}

// Profils d'un client non revoque (alias p). PROFILS_VISIBLES pour un FROM ;
// joindreProfils(colonne) pour rattacher une table a son profil visible.
const PROFILS_VISIBLES = "communaute_profils p JOIN clients c ON c.id = p.client_id AND c.revoque_le IS NULL";
const joindreProfils = (colonne, { masques = false } = {}) =>
  `JOIN communaute_profils p ON p.client_id = ${colonne}${masques ? "" : " AND p.masque = 0"} JOIN clients c ON c.id = p.client_id AND c.revoque_le IS NULL`;

async function profilCommunaute(db, clientId) {
  const p = await db
    .prepare("SELECT pseudo, stats, accord_disc, accord_transfo, masque FROM communaute_profils WHERE client_id = ?1")
    .bind(clientId)
    .first();
  if (!p) return null;
  return { pseudo: p.pseudo, masque: Number(p.masque) === 1, disciplines: Number(p.accord_disc) === 1, transformation: Number(p.accord_transfo) === 1, stats: p.stats };
}
const profilPublic = (p) => (p ? { pseudo: p.pseudo, masque: p.masque, disciplines: p.disciplines, transformation: p.transformation } : null);

/** Classement d'une categorie : { lignes: [{ rang, pseudo, valeur, moi }], moi, total }. */
async function classementCommunaute(db, categorie, { clientId, maintenant, filtres = {} }) {
  const regle = COMMUNAUTE_CATEGORIES[categorie];
  // La categorie entre dans le SQL : seules les cles connues passent.
  if (!regle || !Object.prototype.hasOwnProperty.call(COMMUNAUTE_CATEGORIES, categorie)) throw new Error("categorie-inconnue");
  const valeurs = [];
  const param = (v) => {
    valeurs.push(v);
    return `?${valeurs.length}`;
  };
  const conditions = ["p.masque = 0", `json_extract(p.stats, '$.${categorie}') > 0`];
  for (const cle of regle.filtres || []) {
    const v = filtres[cle];
    if (v != null && COMMUNAUTE_FILTRES[cle].includes(v)) conditions.push(`json_extract(p.stats, '$.${cle}') = ${param(v)}`);
  }
  if (regle.mensuel) conditions.push(`json_extract(p.stats, '$.mois') = ${param(moisUtc(maintenant))}`);
  if (regle.frais) conditions.push(`p.maj_le >= ${param(maintenant - COMMUNAUTE_FRAIS_MS)}`);
  const { results } = await db
    .prepare(
      `SELECT p.client_id AS client_id, p.pseudo AS pseudo, json_extract(p.stats, '$.${categorie}') AS valeur FROM ${PROFILS_VISIBLES} WHERE ${conditions.join(" AND ")} ORDER BY valeur ${regle.ordre === "asc" ? "ASC" : "DESC"}, p.pseudo ASC`
    )
    .bind(...valeurs)
    .all();
  const toutes = (results || []).map((r, i) => ({ rang: i + 1, pseudo: r.pseudo, valeur: Number(r.valeur), moi: r.client_id === clientId }));
  const moi = toutes.find((l) => l.moi) || null;
  return { lignes: toutes.slice(0, COMMUNAUTE_TAILLE_CLASSEMENT), moi: moi ? { rang: moi.rang, valeur: moi.valeur } : null, total: toutes.length };
}

/** Podiums par discipline d'un mois (« AAAA-MM ») ou d'une annee (« AAAA »). */
async function podiumsCommunaute(db, periode, clientId) {
  const annee = periode.length === 4;
  const { results } = await db
    .prepare(
      `SELECT s.discipline AS discipline, MAX(s.score) AS score, s.client_id AS client_id, p.pseudo AS pseudo
       FROM communaute_scores_mois s ${joindreProfils("s.client_id")}
       WHERE ${annee ? "substr(s.mois, 1, 4)" : "s.mois"} = ?1
       GROUP BY s.discipline, s.client_id ORDER BY s.discipline, score DESC, p.pseudo ASC`
    )
    .bind(periode)
    .all();
  const par = {};
  for (const r of results || []) {
    const l = (par[r.discipline] = par[r.discipline] || []);
    if (l.length < COMMUNAUTE_TAILLE_PODIUM) l.push({ rang: l.length + 1, pseudo: r.pseudo, score: Number(r.score), moi: r.client_id === clientId });
  }
  return Object.keys(COMMUNAUTE_SCORES_MOIS).map((d) => ({ discipline: d, lignes: par[d] || [] }));
}

/**
 * Titres du client sur les periodes TERMINEES (rang 1 a 3) : mois
 * (« Podiums du mois », « Athlète du mois ») ou annees (« Athlète de
 * l'année »).
 */
async function titresCommunaute(db, clientId, { annee, avant }) {
  const colonne = annee ? "substr(s.mois, 1, 4)" : "s.mois";
  const { results } = await db
    .prepare(
      `SELECT periode, discipline, rang FROM (
         SELECT periode, discipline, client_id, ROW_NUMBER() OVER (PARTITION BY periode, discipline ORDER BY score DESC, pseudo ASC) AS rang
         FROM (SELECT ${colonne} AS periode, s.discipline AS discipline, s.client_id AS client_id, MAX(s.score) AS score, p.pseudo AS pseudo
               FROM communaute_scores_mois s ${joindreProfils("s.client_id")}
               WHERE ${colonne} < ?2 GROUP BY periode, s.discipline, s.client_id)
       ) WHERE client_id = ?1 AND rang <= ${COMMUNAUTE_TAILLE_PODIUM} ORDER BY periode, discipline`
    )
    .bind(clientId, avant)
    .all();
  return (results || []).map((r) => (annee ? { annee: r.periode, discipline: r.discipline, rang: Number(r.rang) } : { mois: r.periode, discipline: r.discipline, rang: Number(r.rang) }));
}

/** Masque la cible a partir de SIGNALEMENTS_POUR_MASQUER clients differents. */
async function masquerSiSignale(db, type, cible) {
  const n = await db
    .prepare(
      "SELECT COUNT(DISTINCT s.auteur) AS n FROM communaute_signalements s JOIN clients c ON c.id = s.auteur AND c.revoque_le IS NULL WHERE s.cible_type = ?1 AND s.cible = ?2 AND s.traite = 0"
    )
    .bind(type, cible)
    .first();
  if (Number((n && n.n) || 0) < SIGNALEMENTS_POUR_MASQUER) return false;
  if (type === "profil") await db.prepare("UPDATE communaute_profils SET masque = 1 WHERE client_id = ?1").bind(cible).run();
  else await db.prepare("UPDATE communaute_transformations SET masque = 1 WHERE id = ?1").bind(Number(cible)).run();
  return true;
}

async function routeCommunaute(chemin, request, env, cors) {
  const route = "/communaute";
  const id = await identifier(route, request, env, cors);
  if (id.reponse) return id.reponse;
  const { client, db } = id;
  // Mode transition : identifier accepte une requete sans jeton. Pas ici.
  if (!client) return refus(route, 401, "acces-requis", cors);
  if (!db) return refus(route, 503, "acces-non-configure", cors);

  const maintenant = Date.now();
  const lent = await depasse(
    db,
    [{ cle: `communaute:min:${client.id}:${minute(maintenant)}`, limite: COMMUNAUTE_APPELS_PAR_MINUTE, dureeMs: 120000, raison: "trop-de-requetes" }],
    maintenant
  );
  if (lent) return refus(route, 429, lent, cors, client);

  const lu = await lireJson(route, request, cors, TAILLE_MAX_COMMUNAUTE);
  if (lu.reponse) return lu.reponse;
  const corps = lu.corps;
  const ok = (donnees) => reponseJson({ ok: true, ...donnees }, 200, cors);
  const plafond = async (type, limite) =>
    depasse(db, [{ cle: `communaute:${type}:${client.id}:${jourUtc(maintenant)}`, limite, dureeMs: 2 * 86400000, raison: "trop-de-requetes" }], maintenant);

  const profil = await profilCommunaute(db, client.id);

  if (chemin === "/communaute/etat") return ok({ profil: profilPublic(profil) });

  if (chemin === "/communaute/supprimer") {
    // Suppression totale : profil, chiffres, scores, transformations,
    // bravos, signalements faits ou recus.
    await db.batch(requetesEffacementCommunaute(db, client.id));
    journal(route, 200, null, client);
    return ok({ profil: null });
  }

  if (chemin === "/communaute/profil") {
    // Accord « profil » : creation, ou changement de pseudo.
    if (corps.accord !== true) return refus(route, 400, "accord-requis", cors, client);
    const v = validerPseudo(corps.pseudo);
    if (v.erreur) return refus(route, 400, v.erreur, cors, client);
    if (await plafond("ecritures", COMMUNAUTE_ECRITURES_PAR_JOUR)) return refus(route, 429, "trop-de-requetes", cors, client);
    const pris = await db.prepare("SELECT client_id FROM communaute_profils WHERE pseudo_norme = ?1").bind(v.norme).first();
    if (pris && pris.client_id !== client.id) return refus(route, 409, "pseudo-pris", cors, client);
    const accords = { disc: profil && profil.disciplines, transfo: profil && profil.transformation };
    const stats = nettoyerStatsCommunaute(corps.stats, maintenant, accords);
    await db
      .prepare(
        "INSERT INTO communaute_profils (client_id, pseudo, pseudo_norme, stats, maj_le, cree_le) VALUES (?1, ?2, ?3, ?4, ?5, ?5) ON CONFLICT(client_id) DO UPDATE SET pseudo = ?2, pseudo_norme = ?3, stats = ?4, maj_le = ?5"
      )
      .bind(client.id, v.pseudo, v.norme, JSON.stringify(stats), maintenant)
      .run();
    if (accords.disc) await retenirScoresCommunaute(db, client.id, stats, maintenant);
    journal(route, 200, null, client);
    return ok({ profil: profilPublic(await profilCommunaute(db, client.id)) });
  }

  // Toutes les autres routes demandent un profil (accord « profil »).
  if (!profil) return refus(route, 403, "profil-requis", cors, client);

  if (chemin === "/communaute/stats") {
    if (await plafond("ecritures", COMMUNAUTE_ECRITURES_PAR_JOUR)) return refus(route, 429, "trop-de-requetes", cors, client);
    const stats = nettoyerStatsCommunaute(corps.stats, maintenant, { disc: profil.disciplines, transfo: profil.transformation });
    await db.prepare("UPDATE communaute_profils SET stats = ?2, maj_le = ?3 WHERE client_id = ?1").bind(client.id, JSON.stringify(stats), maintenant).run();
    if (profil.disciplines) await retenirScoresCommunaute(db, client.id, stats, maintenant);
    return ok({ profil: profilPublic(profil) });
  }

  if (chemin === "/communaute/accord") {
    // Accords « disciplines » et « transformation » : donner ou retirer.
    // Retirer efface les donnees correspondantes.
    const type = String(corps.type || "");
    if (type !== "disciplines" && type !== "transformation") return refus(route, 400, "accord-inconnu", cors, client);
    if (await plafond("ecritures", COMMUNAUTE_ECRITURES_PAR_JOUR)) return refus(route, 429, "trop-de-requetes", cors, client);
    const oui = corps.oui === true;
    const accords = { disc: type === "disciplines" ? oui : profil.disciplines, transfo: type === "transformation" ? oui : profil.transformation };
    let anciennes = {};
    try {
      anciennes = JSON.parse(profil.stats || "{}");
    } catch (e) {
      anciennes = {};
    }
    // Les chiffres gardes repassent par le filtre des nouveaux accords.
    const stats = nettoyerStatsCommunaute({ ...anciennes, perte_eligible: 1 }, maintenant, accords);
    const requetes = [
      db
        .prepare("UPDATE communaute_profils SET accord_disc = ?2, accord_transfo = ?3, stats = ?4, maj_le = ?5 WHERE client_id = ?1")
        .bind(client.id, accords.disc ? 1 : 0, accords.transfo ? 1 : 0, JSON.stringify(stats), maintenant)
    ];
    if (!accords.disc) requetes.push(db.prepare("DELETE FROM communaute_scores_mois WHERE client_id = ?1").bind(client.id));
    if (!accords.transfo) {
      requetes.push(db.prepare("DELETE FROM communaute_bravos WHERE transformation IN (SELECT id FROM communaute_transformations WHERE client_id = ?1)").bind(client.id));
      requetes.push(db.prepare("DELETE FROM communaute_transformations WHERE client_id = ?1").bind(client.id));
    }
    await db.batch(requetes);
    journal(route, 200, null, client);
    return ok({ profil: profilPublic(await profilCommunaute(db, client.id)) });
  }

  if (chemin === "/communaute/classement") {
    const categorie = String(corps.categorie || "");
    const regle = Object.prototype.hasOwnProperty.call(COMMUNAUTE_CATEGORIES, categorie) ? COMMUNAUTE_CATEGORIES[categorie] : null;
    if (!regle) return refus(route, 400, "categorie-inconnue", cors, client);
    // Reciprocite : on voit un classement par discipline ou de
    // transformation seulement en y participant soi-meme.
    if (regle.accord === "disc" && !profil.disciplines) return refus(route, 403, "accord-disciplines-requis", cors, client);
    if (regle.accord === "transfo" && !profil.transformation) return refus(route, 403, "accord-transformation-requis", cors, client);
    const filtres = corps.filtres && typeof corps.filtres === "object" ? corps.filtres : {};
    return ok(await classementCommunaute(db, categorie, { clientId: client.id, maintenant, filtres }));
  }

  if (chemin === "/communaute/athletes-du-mois") {
    if (!profil.disciplines) return refus(route, 403, "accord-disciplines-requis", cors, client);
    const mois = moisUtc(maintenant);
    const annee = mois.slice(0, 4);
    return ok({
      mois,
      moisPrecedent: moisAvant(mois),
      enCours: await podiumsCommunaute(db, mois, client.id),
      precedent: await podiumsCommunaute(db, moisAvant(mois), client.id),
      titres: await titresCommunaute(db, client.id, { annee: false, avant: mois }),
      annee,
      anneeEnCours: await podiumsCommunaute(db, annee, client.id),
      anneePrecedente: await podiumsCommunaute(db, String(Number(annee) - 1), client.id),
      titresAnnee: await titresCommunaute(db, client.id, { annee: true, avant: annee })
    });
  }

  if (chemin === "/communaute/signaler") {
    const type = String(corps.type || "");
    if (type !== "profil" && type !== "transformation") return refus(route, 400, "signalement-invalide", cors, client);
    if (await plafond("signalements", COMMUNAUTE_SIGNALEMENTS_PAR_JOUR)) return refus(route, 429, "trop-de-requetes", cors, client);
    // La cible est resolue ici : un profil par son pseudo (gardé en
    // client_id, jamais renvoye), une transformation par son numero.
    let cible = null;
    if (type === "profil") {
      const p = await db.prepare("SELECT client_id FROM communaute_profils WHERE pseudo = ?1").bind(String(corps.cible || "").slice(0, 40)).first();
      cible = p && p.client_id !== client.id ? p.client_id : null;
    } else {
      const t = await db.prepare("SELECT id, client_id FROM communaute_transformations WHERE id = ?1").bind(Number(corps.cible) || 0).first();
      cible = t && t.client_id !== client.id ? String(t.id) : null;
    }
    // Inconnu ou soi-meme : refuse.
    if (!cible) return refus(route, 400, "signalement-invalide", cors, client);
    const motif = String(corps.motif || "").replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, 200) || null;
    await db
      .prepare("INSERT INTO communaute_signalements (cible_type, cible, motif, auteur, cree_le) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT DO NOTHING")
      .bind(type, cible, motif, client.id, maintenant)
      .run();
    await masquerSiSignale(db, type, cible);
    journal(route, 200, null, client);
    return ok({});
  }

  if (chemin === "/communaute/transformations/liste") {
    const { results } = await db
      .prepare(
        `SELECT t.id AS id, t.client_id AS client_id, p.pseudo AS pseudo, t.periode AS periode, t.jours AS jours, t.gras AS gras, t.muscle AS muscle, t.texte AS texte, t.cree_le AS cree_le,
                (SELECT COUNT(*) FROM communaute_bravos b JOIN clients cb ON cb.id = b.client_id AND cb.revoque_le IS NULL WHERE b.transformation = t.id) AS bravos,
                (SELECT COUNT(*) FROM communaute_bravos b WHERE b.transformation = t.id AND b.client_id = ?1) AS mon_bravo
         FROM communaute_transformations t ${joindreProfils("t.client_id", { masques: true })}
         WHERE t.masque = 0 AND (p.masque = 0 OR p.client_id = ?1) ORDER BY t.cree_le DESC LIMIT ${MUR_TAILLE}`
      )
      .bind(client.id)
      .all();
    const transformations = (results || []).map((t) => ({
      id: Number(t.id),
      pseudo: t.pseudo,
      periode: t.periode,
      jours: Number(t.jours),
      gras: t.gras == null ? null : Number(t.gras),
      muscle: t.muscle == null ? null : Number(t.muscle),
      texte: t.texte,
      le: Number(t.cree_le),
      bravos: Number(t.bravos || 0),
      monBravo: Number(t.mon_bravo || 0) > 0,
      moi: t.client_id === client.id
    }));
    return ok({ transformations });
  }

  if (chemin === "/communaute/transformations/publier") {
    if (!profil.transformation) return refus(route, 403, "accord-transformation-requis", cors, client);
    if (profil.masque) return refus(route, 403, "profil-masque", cors, client);
    const v = validerTransformationCommunaute(corps);
    if (v.erreur) return refus(route, 400, v.erreur, cors, client);
    const derniere = await db.prepare("SELECT MAX(cree_le) AS le FROM communaute_transformations WHERE client_id = ?1").bind(client.id).first();
    if (derniere && derniere.le && maintenant - Number(derniere.le) < DELAI_TRANSFORMATION_MS) return refus(route, 429, "une-par-semaine", cors, client);
    await db
      .prepare("INSERT INTO communaute_transformations (client_id, periode, jours, gras, muscle, texte, cree_le) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)")
      .bind(client.id, v.periode, v.jours, v.gras, v.muscle, v.texte, maintenant)
      .run();
    journal(route, 200, null, client);
    return ok({});
  }

  if (chemin === "/communaute/transformations/bravo") {
    const idT = Number(corps.id) || 0;
    const t = await db.prepare("SELECT id, client_id FROM communaute_transformations WHERE id = ?1 AND masque = 0").bind(idT).first();
    if (!t) return refus(route, 404, "introuvable", cors, client);
    if (t.client_id === client.id) return refus(route, 400, "pas-a-soi-meme", cors, client);
    if (await plafond("bravos", COMMUNAUTE_BRAVOS_PAR_JOUR)) return refus(route, 429, "trop-de-requetes", cors, client);
    const deja = await db.prepare("SELECT 1 AS x FROM communaute_bravos WHERE transformation = ?1 AND client_id = ?2").bind(idT, client.id).first();
    if (deja) await db.prepare("DELETE FROM communaute_bravos WHERE transformation = ?1 AND client_id = ?2").bind(idT, client.id).run();
    else await db.prepare("INSERT INTO communaute_bravos (transformation, client_id, le) VALUES (?1, ?2, ?3)").bind(idT, client.id, maintenant).run();
    return ok({ bravo: !deja });
  }

  if (chemin === "/communaute/transformations/supprimer") {
    // Sa propre publication seulement, effacee (avec ses bravos).
    const idT = Number(corps.id) || 0;
    await db.batch([
      db.prepare("DELETE FROM communaute_bravos WHERE transformation = (SELECT id FROM communaute_transformations WHERE id = ?1 AND client_id = ?2)").bind(idT, client.id),
      db.prepare("DELETE FROM communaute_transformations WHERE id = ?1 AND client_id = ?2").bind(idT, client.id)
    ]);
    return ok({});
  }

  return reponseJson({ ok: false, error: "not-found" }, 404, cors);
}

/**
 * Moderation par le coach (POST /admin/communaute, ADMIN_SECRET), corps.action :
 *  - « signalements » : signalements a traiter (avec pseudo et apercu) et profils masques ;
 *  - « masquer » / « afficher » un profil (cible : pseudo) ;
 *  - « masquer-transformation » / « afficher-transformation » (cible : numero) ;
 *  - « supprimer-profil » (cible : pseudo) : tout ce que la communaute en garde ;
 *  - « supprimer-transformation » (cible : numero).
 * « afficher » vaut aussi « signalements traites » pour cette cible.
 */
async function adminCommunaute(db, corps) {
  const action = String(corps.action || "");
  const cible = String(corps.cible || "");
  if (action === "signalements") {
    const { results } = await db
      .prepare(
        `SELECT s.cible_type AS type, s.cible AS cible, COUNT(*) AS nombre, MAX(s.cree_le) AS dernier, GROUP_CONCAT(COALESCE(s.motif, ''), ' | ') AS motifs,
                COALESCE((SELECT p.pseudo FROM communaute_profils p WHERE s.cible_type = 'profil' AND p.client_id = s.cible),
                         (SELECT p.pseudo || ' : ' || t.texte FROM communaute_transformations t JOIN communaute_profils p ON p.client_id = t.client_id WHERE s.cible_type = 'transformation' AND t.id = CAST(s.cible AS INTEGER))) AS apercu
         FROM communaute_signalements s WHERE s.traite = 0 GROUP BY s.cible_type, s.cible ORDER BY nombre DESC, dernier DESC LIMIT 200`
      )
      .all();
    const { results: masques } = await db.prepare("SELECT pseudo FROM communaute_profils WHERE masque = 1 ORDER BY pseudo").all();
    // L'identifiant interne d'un profil ne sort pas : le coach agit par pseudo.
    const signalements = (results || []).map((r) => ({ ...r, cible: r.type === "profil" ? null : r.cible }));
    return { ok: true, signalements, masques: (masques || []).map((m) => m.pseudo) };
  }
  if (action === "masquer" || action === "afficher") {
    const p = await db.prepare("SELECT client_id FROM communaute_profils WHERE pseudo = ?1").bind(cible).first();
    if (!p) return { ok: false, error: "introuvable" };
    await db.batch([
      db.prepare("UPDATE communaute_profils SET masque = ?2 WHERE client_id = ?1").bind(p.client_id, action === "masquer" ? 1 : 0),
      db.prepare("UPDATE communaute_signalements SET traite = 1 WHERE cible_type = 'profil' AND cible = ?1").bind(p.client_id)
    ]);
    return { ok: true };
  }
  if (action === "masquer-transformation" || action === "afficher-transformation") {
    await db.batch([
      db.prepare("UPDATE communaute_transformations SET masque = ?2 WHERE id = ?1").bind(Number(cible) || 0, action === "masquer-transformation" ? 1 : 0),
      db.prepare("UPDATE communaute_signalements SET traite = 1 WHERE cible_type = 'transformation' AND cible = ?1").bind(String(Number(cible) || 0))
    ]);
    return { ok: true };
  }
  if (action === "supprimer-profil") {
    const p = await db.prepare("SELECT client_id FROM communaute_profils WHERE pseudo = ?1").bind(cible).first();
    if (!p) return { ok: false, error: "introuvable" };
    await db.batch(requetesEffacementCommunaute(db, p.client_id));
    return { ok: true };
  }
  if (action === "supprimer-transformation") {
    const n = Number(cible) || 0;
    await db.batch([
      db.prepare("DELETE FROM communaute_bravos WHERE transformation = ?1").bind(n),
      db.prepare("DELETE FROM communaute_transformations WHERE id = ?1").bind(n),
      db.prepare("DELETE FROM communaute_signalements WHERE cible_type = 'transformation' AND cible = ?1").bind(String(n))
    ]);
    return { ok: true };
  }
  return { ok: false, error: "action-inconnue" };
}

/**
 * Tache planifiee : scores mensuels de plus de deux annees civiles (l'annee
 * passee reste pour l'athlete de l'annee), signalements traites et
 * transformations masquees de plus de 180 jours, bravos orphelins.
 */
async function nettoyerCommunaute(env, maintenant) {
  const db = await base(env);
  if (!db) return;
  const anneeLimite = String(Number(new Date(maintenant).toISOString().slice(0, 4)) - 1);
  const limite = maintenant - COMMUNAUTE_CONSERVATION_MS;
  await db.batch([
    db.prepare("DELETE FROM communaute_scores_mois WHERE substr(mois, 1, 4) < ?1").bind(anneeLimite),
    db.prepare("DELETE FROM communaute_signalements WHERE traite = 1 AND cree_le < ?1").bind(limite),
    db.prepare("DELETE FROM communaute_transformations WHERE masque = 1 AND cree_le < ?1").bind(limite),
    db.prepare("DELETE FROM communaute_bravos WHERE transformation NOT IN (SELECT id FROM communaute_transformations)")
  ]);
}

// Acces des tests aux fonctions internes (sans effet en production).
if (typeof globalThis.__COACH_TEST__ === "object" && globalThis.__COACH_TEST__) {
  Object.assign(globalThis.__COACH_TEST__, { chiffrerWebPush, enTeteVapid, envoyerRappelsDus, envoyerAnnonces, heureParis, abonnementPropre, deB64url, b64url, validerRequeteIa, signerEvenement, validerPseudo, prenomDuLibelle, genererCodeDefi, valeurDefiBornee, nettoyerDefis, DEFIS_LIMITES: { DEFIS_PAR_JOUR, DEFIS_PARTICIPANTS_MAX, DEFIS_ACTIFS_MAX, DEFIS_CONSERVATION_JOURS } });
  Object.assign(globalThis.__COACH_TEST__, {
    nettoyerStatsCommunaute,
    validerTransformationCommunaute,
    contientCoordonnees,
    nettoyerCommunaute,
    COMMUNAUTE: { CATEGORIES: COMMUNAUTE_CATEGORIES, FILTRES: COMMUNAUTE_FILTRES, SCORES_MOIS: COMMUNAUTE_SCORES_MOIS, PERIODES: COMMUNAUTE_PERIODES, SIGNALEMENTS_POUR_MASQUER, COMMUNAUTE_APPELS_PAR_MINUTE, COMMUNAUTE_ECRITURES_PAR_JOUR, COMMUNAUTE_SIGNALEMENTS_PAR_JOUR, COMMUNAUTE_BRAVOS_PAR_JOUR, DELAI_TRANSFORMATION_MS }
  });
}
