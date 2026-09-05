/**
 * Coach Neiram — proxy Cloudflare Worker
 *
 * Role : servir d'intermediaire entre l'application (page publique) et les
 * services qui demandent un secret. Rien de sensible ne reste dans le
 * navigateur du client.
 *
 * Deux routes :
 *   POST /ai          -> relaie vers Google Gemini avec la cle du coach
 *   POST /coach-sync  -> relaie vers le Google Apps Script avec le secret partage
 *
 * Variables a definir dans Cloudflare (Settings > Variables and Secrets) :
 *   GEMINI_API_KEY      (secret)   cle API Google Gemini
 *   COACH_SYNC_URL      (secret)   URL /exec du Google Apps Script
 *   COACH_SYNC_SECRET   (secret)   mot de passe partage avec le script
 *   ALLOWED_ORIGINS     (variable, optionnel) origines autorisees, separees par des virgules
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
const MAX_PAR_FENETRE = { ai: 20, sync: 30 };
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

    return reponseJson({ ok: false, error: "not-found" }, 404, cors);
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
const TYPES_AUTORISES = [
  "pointage",
  "justification",
  "semaine_difficile",
  "alerte_semaines_difficiles",
  "alerte_seances_manquees"
];

const LONGUEUR_MAX_TEXTE = 500;

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
    dureeMin: Number(evenement.dureeMin) || "",
    rpe: Number(evenement.rpe) || "",
    ecartMin: Number(evenement.ecartMin) || "",
    motif: texteCourt(evenement.motif),
    message: texteCourt(evenement.message),
    note: texteCourt(evenement.note),
    weekKey: texteCourt(evenement.weekKey),
    nbManquees: Number(evenement.nbManquees) || "",
    envoyeLe: texteCourt(evenement.envoyeLe)
  };

  if (Array.isArray(evenement.creneauxManques)) {
    propre.creneauxManques = evenement.creneauxManques.slice(0, 20).map((m) => ({
      jour: texteCourt(m && m.jour),
      heure: texteCourt(m && m.heure),
      date: texteCourt(m && m.date),
      lieu: texteCourt(m && m.lieu)
    }));
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
