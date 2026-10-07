/**
 * Coach Neiram — proxy Cloudflare Worker
 *
 * Role : servir d'intermediaire entre l'application (page publique) et les
 * services qui demandent un secret. Rien de sensible ne reste dans le
 * navigateur du client.
 *
 * Routes :
 *   POST /ai              -> relaie vers Google Gemini avec la cle du coach
 *   POST /coach-sync      -> relaie vers le Google Apps Script avec le secret partage
 *   POST /push/cle        -> cle publique des notifications push (VAPID)
 *   POST /push/abonner    -> enregistre un telephone et ses rappels a venir
 *   POST /push/desabonner -> l'oublie
 * Et une tache planifiee (Cron Trigger, toutes les 15 minutes) qui envoie
 * les rappels arrives a echeance, meme application fermee.
 *
 * Variables a definir dans Cloudflare (Settings > Variables and Secrets) :
 *   GEMINI_API_KEY      (secret)   cle API Google Gemini
 *   COACH_SYNC_URL      (secret)   URL /exec du Google Apps Script
 *   COACH_SYNC_SECRET   (secret)   mot de passe partage avec le script
 *   ALLOWED_ORIGINS     (variable, optionnel) origines autorisees, separees par des virgules
 *   PUSH_KV             (liaison KV, pour les rappels push) espace de stockage des
 *                       abonnements ; sans lui, les routes /push repondent 503
 *
 * Note honnete sur ALLOWED_ORIGINS : le controle d'origine n'arrete qu'un
 * navigateur. Un script hors navigateur peut annoncer l'origine qu'il veut.
 * La vraie protection ici, ce sont les secrets cote serveur, la validation
 * des donnees et les plafonds de taille ci-dessous.
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

// Limitation de debit "au mieux" : la memoire d'un Worker n'est pas partagee
// entre toutes les instances, donc ce compteur freine les abus evidents sans
// constituer une garantie stricte. Pour une limite dure, ajouter le binding
// Rate Limiting de Cloudflare (gratuit) — voir wrangler.toml.
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

function enTetesCors(request, env) {
  const origine = request.headers.get("Origin") || "";
  const liste = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const autorisee = liste.length === 0 || liste.includes(origine);
  return {
    "Access-Control-Allow-Origin": autorisee ? (origine || "*") : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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

export default {
  async fetch(request, env, ctx) {
    const cors = enTetesCors(request, env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return reponseJson({ ok: false, error: "method-not-allowed" }, 405, cors);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "inconnue";

    if (url.pathname === "/ai") return relaiIa(request, env, cors, ip);
    if (url.pathname === "/coach-sync") return relaiCoachSync(request, env, cors, ip);
    if (url.pathname.startsWith("/push/")) return routePush(url.pathname, request, env, cors, ip);

    return reponseJson({ ok: false, error: "not-found" }, 404, cors);
  },

  /** Cron Trigger : envoie les rappels push arrives a echeance. */
  async scheduled(evenement, env, ctx) {
    if (!env.PUSH_KV) return;
    const tache = envoyerRappelsDus(env, Date.now());
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(tache);
    await tache;
  }
};

/* ------------------------------------------------------------------ */
/* Route /ai : relaie vers Gemini en ajoutant la cle cote serveur       */
/* ------------------------------------------------------------------ */

async function relaiIa(request, env, cors, ip) {
  if (!env.GEMINI_API_KEY) {
    return reponseJson({ ok: false, error: "proxy-non-configure" }, 503, cors);
  }
  if (tropDeRequetes("ai:" + ip, "ai")) {
    // 429 : l'application l'interprete deja comme "quota atteint".
    return reponseJson({ ok: false, error: "trop-de-requetes" }, 429, cors);
  }

  let corps;
  try {
    const brut = await request.text();
    if (brut.length > TAILLE_MAX_AI) {
      return reponseJson({ ok: false, error: "requete-trop-grosse" }, 413, cors);
    }
    corps = JSON.parse(brut);
  } catch (e) {
    return reponseJson({ ok: false, error: "json-invalide" }, 400, cors);
  }

  const modele = String(corps.model || "");
  if (!MODELES_AUTORISES.includes(modele)) {
    return reponseJson({ ok: false, error: "modele-non-autorise" }, 400, cors);
  }
  if (!Array.isArray(corps.messages) || !corps.messages.length) {
    return reponseJson({ ok: false, error: "messages-manquants" }, 400, cors);
  }

  const charge = {
    contents: corps.messages,
    generationConfig: {
      maxOutputTokens: Math.min(Number(corps.maxTokens) || 1024, 4096),
      thinkingConfig: { thinkingLevel: "low" }
    }
  };
  if (corps.systemPrompt) {
    charge.systemInstruction = { parts: [{ text: String(corps.systemPrompt) }] };
  }

  const cible = "https://generativelanguage.googleapis.com/v1beta/models/" + modele + ":generateContent";
  let amont;
  try {
    amont = await fetch(cible, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify(charge)
    });
  } catch (e) {
    return reponseJson({ ok: false, error: "amont-injoignable" }, 502, cors);
  }

  // On renvoie le corps tel quel : l'application sait deja le lire.
  // Le statut est conserve pour que quota (429) et cle invalide (400/401/403)
  // restent distinguables cote client.
  const texte = await amont.text();
  return new Response(texte, {
    status: amont.status,
    headers: { "Content-Type": "application/json", ...cors }
  });
}

/* ------------------------------------------------------------------ */
/* Route /coach-sync : relaie vers Apps Script en ajoutant le secret    */
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

async function relaiCoachSync(request, env, cors, ip) {
  if (!env.COACH_SYNC_URL) {
    return reponseJson({ ok: false, error: "proxy-non-configure" }, 503, cors);
  }
  if (tropDeRequetes("sync:" + ip, "sync")) {
    return reponseJson({ ok: false, error: "trop-de-requetes" }, 429, cors);
  }

  let evenement;
  try {
    const brut = await request.text();
    if (brut.length > TAILLE_MAX_SYNC) {
      return reponseJson({ ok: false, error: "requete-trop-grosse" }, 413, cors);
    }
    evenement = JSON.parse(brut);
  } catch (e) {
    return reponseJson({ ok: false, error: "json-invalide" }, 400, cors);
  }

  if (!TYPES_AUTORISES.includes(String(evenement.type || ""))) {
    return reponseJson({ ok: false, error: "type-inconnu" }, 400, cors);
  }

  // On reconstruit l'evenement champ par champ : rien d'inattendu ne passe,
  // et chaque texte est plafonne avant d'atteindre le Google Sheets / les mails.
  const propre = {
    secret: env.COACH_SYNC_SECRET || "",
    type: texteCourt(evenement.type),
    client: texteCourt(evenement.client),
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
      body: JSON.stringify(propre)
    });
  } catch (e) {
    return reponseJson({ ok: false, error: "amont-injoignable" }, 502, cors);
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
  return reponseJson({ ok }, ok ? 200 : 502, cors);
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

// Acces des tests aux fonctions internes (sans effet en production).
if (typeof globalThis.__COACH_TEST__ === "object" && globalThis.__COACH_TEST__) {
  Object.assign(globalThis.__COACH_TEST__, { chiffrerWebPush, enTeteVapid, envoyerRappelsDus, abonnementPropre, deB64url, b64url });
}
