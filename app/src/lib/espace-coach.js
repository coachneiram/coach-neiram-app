/**
 * Espace coach (24 octobre 2026) : les routes /admin du Worker, sans
 * terminal. Page à part (app/espace-coach.html), sans aucun lien depuis
 * l'application des clients.
 *
 * LE SECRET (ADMIN_SECRET) : tapé par le coach à chaque ouverture, gardé
 * dans une variable de la page et nulle part ailleurs — ni localStorage,
 * ni sessionStorage, ni cookie, ni adresse, ni console. Il ne part que dans
 * l'en-tête « Authorization: Bearer » vers le Worker déjà utilisé par
 * l'app (PROXY_BASE_URL). « Verrouiller » l'oublie ; 15 minutes sans
 * action aussi. Ce fichier n'importe pas lib/stockage.js.
 *
 * Erreurs du Worker (routeAdmin) : 401 secret refusé, 429 trop d'essais
 * (10 échecs par heure et par adresse), 404 ADMIN_SECRET absent ou trop
 * court côté serveur.
 */

import { PROXY_BASE_URL } from "./config.js";

/** Oubli automatique du secret sans action. */
export const DELAI_VERROU_MS = 15 * 60000;

export const ERREURS_ESPACE_COACH = {
  401: "Secret refusé : vérifie ADMIN_SECRET (celui de Cloudflare).",
  429: "Trop d'essais : réessaie dans une heure.",
  404: "L'espace coach n'est pas activé sur le serveur (ADMIN_SECRET absent ou trop court dans Cloudflare).",
  "libelle-invalide": "Libellé refusé : prénom et initiale, 40 caractères au plus (ex. « Thomas B. »).",
  "client-inconnu": "Client inconnu ou révoqué.",
  introuvable: "Pseudo ou publication introuvable.",
  reseau: "Pas de connexion au serveur : réessaie.",
  indisponible: "Le serveur ne répond pas comme prévu : réessaie plus tard."
};

/** Message lisible d'une erreur levée par appelerAdmin. */
export function messageErreurAdmin(e) {
  const m = e && e.message;
  return ERREURS_ESPACE_COACH[m] || ERREURS_ESPACE_COACH.indisponible;
}

/**
 * POST vers une route /admin, secret dans l'en-tête seulement. Rend la
 * réponse ; lève une Error dont le message est le statut (« 401 »…), le
 * code d'erreur du Worker ou « reseau ».
 */
export async function appelerAdmin(chemin, corps, secret, env = globalThis) {
  if (!secret) throw new Error("401");
  let r;
  try {
    r = await env.fetch(PROXY_BASE_URL + chemin, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + secret },
      body: JSON.stringify(corps || {}),
      credentials: "omit",
      referrerPolicy: "no-referrer"
    });
  } catch (e) {
    throw new Error("reseau");
  }
  if (r.status === 401 || r.status === 429 || r.status === 404) throw new Error(String(r.status));
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d || d.ok === false) throw new Error((d && d.error) || "indisponible");
  return d;
}

export const listeClients = (secret, env) => appelerAdmin("/admin/clients", {}, secret, env);
export const creerCode = ({ libelle, client }, secret, env) => appelerAdmin("/admin/invitations", client ? { client } : { libelle }, secret, env);
export const revoquerClient = (client, secret, env) => appelerAdmin("/admin/revoquer", { client }, secret, env);
export const moderation = (action, cible, secret, env) => appelerAdmin("/admin/communaute", { action, ...(cible != null ? { cible: String(cible) } : {}) }, secret, env);

/** Libellé attendu par le Worker (LIBELLE_VALIDE) : on prévient avant l'envoi. */
export const libelleValide = (l) => /^[\p{L}\p{N} .'-]{1,40}$/u.test(String(l || "").trim());

const dateCourte = (ms) => (ms ? new Date(Number(ms)).toLocaleDateString("fr-FR") : "");

/** État d'un client pour la liste. */
export function etatClient(c) {
  if (c.revoque_le) return "revoque";
  return Number(c.jetons) > 0 ? "actif" : "sans-jeton";
}

export const TEXTES_ESPACE_COACH = {
  titre: "Espace coach",
  intro: "Réservé au coach. Ton secret (ADMIN_SECRET) reste dans cette page le temps de la visite : il n'est enregistré nulle part et s'oublie après 15 minutes sans action.",
  secret: "ADMIN_SECRET",
  ouvrir: "Ouvrir l'espace coach",
  verrouiller: "Verrouiller",
  verrouille: "Espace verrouillé : le secret est oublié.",
  verrouAuto: "15 minutes sans action : espace verrouillé, le secret est oublié.",
  chargement: "Chargement…",
  actualiser: "Actualiser",
  // Clients.
  clientsTitre: "Clients",
  aucunClient: "Aucun client pour l'instant.",
  creeLe: (ms) => `créé le ${dateCourte(ms)}`,
  revoqueLe: (ms) => `révoqué le ${dateCourte(ms)}`,
  jetons: (n) => `${n} téléphone${n > 1 ? "s" : ""} actif${n > 1 ? "s" : ""}`,
  sansJeton: "code pas encore activé",
  nouveauCodeClient: "Nouveau code",
  revoquer: "Révoquer",
  confirmerRevoquer: (l) =>
    `Révoquer ${l} ? Ses téléphones perdent l'accès (IA, synchro), et il sort aussi des défis entre amis et de la communauté : profil, chiffres et publications effacés.`,
  revoqueOk: (l) => `${l} est révoqué.`,
  // Codes.
  codeTitre: "Créer un code d'accès",
  codeAide: "Pour un nouveau client : prénom et initiale (« Thomas B. »). Pour un client qui a perdu son code ou changé de téléphone : « Nouveau code » dans la liste.",
  libelle: "Prénom N.",
  creerCode: "Créer le code",
  codePour: (l) => `Code pour ${l}`,
  expire: (iso) => `Usage unique, valable jusqu'au ${new Date(iso).toLocaleDateString("fr-FR")}. Il ne sera plus affiché : copie-le maintenant.`,
  copier: "Copier",
  copie: "Copié",
  masquerCode: "J'ai noté le code",
  // Modération.
  moderationTitre: "Modération de la communauté",
  aucunSignalement: "Aucun signalement en attente.",
  signalement: (type, n) => `${type === "profil" ? "Profil" : "Publication"} · ${n} signalement${n > 1 ? "s" : ""}`,
  motifs: (m) => `Motifs : ${m}`,
  publication: (n, apercu) => `n° ${n} — ${apercu || ""}`,
  masquer: "Masquer",
  afficher: "Afficher",
  supprimer: "Supprimer",
  confirmerSupprimer: "Supprimer définitivement ? Ce qui est supprimé ne revient pas.",
  masques: "Profils masqués",
  profilTitre: "Agir sur un profil",
  pseudo: "Pseudo",
  publicationTitre: "Agir sur une publication",
  numero: "Numéro de la publication",
  fait: "C'est fait."
};
