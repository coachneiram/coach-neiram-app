/**
 * Défis entre amis (24 octobre 2026), réservés aux clients du coach.
 *
 * Repris de l'app publique Neiram (lib/defis-amis.js, public/defis.js) avec
 * l'accord du coach. Le serveur est le Worker du coach (routes /defis/*,
 * worker/coach-neiram-proxy.js) : chaque appel porte le jeton du client
 * (lib/acces.js). Sans code d'accès activé, pas de défi : la carte invite
 * à entrer le code du coach dans les Réglages.
 *
 * Ce que le serveur publie aux autres participants d'un défi : le pseudo
 * choisi et le total du défi. Rien d'autre. Le total se calcule ici, sur le
 * téléphone, entre le début et la fin du défi :
 *  - « pas » : somme des pas notés dans le Journal (form.steps) ;
 *  - « seances » : séances et activités notées (une activité est une
 *    séance avec un champ `activite`, voir lib/activites.js) ;
 *  - « minutes » : durée des séances et des activités.
 *
 * Stockage (préfixe cn_ : dans la sauvegarde) :
 *  - « cn_defis_amis » : [{ code, pseudo, gagne }] ;
 *  - « cn_defis_amis_gagnes » : codes des défis gagnés (un trophée gagné ne
 *    se perd pas quand on retire le défi terminé de la carte) ;
 *  - « cn_defis_pseudo » : le dernier pseudo choisi.
 *
 * Lien d'invitation : la page de l'app suivie de « ?defi=CODE ». L'app est
 * servie sous un sous-chemin (GitHub Pages, base « ./ ») : le lien est
 * construit sur l'adresse de la page ouverte, jamais sur une adresse fixe.
 * À l'ouverture, le code est retenu puis l'adresse est nettoyée, comme
 * « ?raccourci= » (lib/reception-raccourcis.js).
 */

import { PROXY_BASE_URL } from "./config.js";
import { accesActuel, enTetesAcces } from "./acces.js";
import { charger, enregistrer } from "./stockage.js";
import { num } from "./dates.js";

export const CLE_DEFIS_AMIS = "cn_defis_amis";
export const CLE_DEFIS_GAGNES = "cn_defis_amis_gagnes";
export const CLE_PSEUDO_DEFIS = "cn_defis_pseudo";
export const PARAMETRE_DEFI = "defi";
export const DEFIS_AMIS_MAX = 30;

export const TYPES_DEFI_AMIS = [
  { id: "pas", label: "Le plus de pas", emoji: "👟", unite: "pas" },
  { id: "seances", label: "Le plus de séances", emoji: "🏋️", unite: "séances" },
  { id: "minutes", label: "Le plus de minutes de sport", emoji: "⏱️", unite: "min" }
];
export const typeDefi = (id) => TYPES_DEFI_AMIS.find((t) => t.id === id) || TYPES_DEFI_AMIS[0];

const dansLaPeriode = (debut, fin) => (d) => typeof d === "string" && d >= debut && d <= fin;

/** Minutes d'une séance ou d'une activité. */
const minutesSeance = (s) => num(s.activite ? s.activite.duree : s.durationMin);

/** Total à envoyer pour un défi [debut, fin], calculé sur le téléphone. */
export function valeurDefi(type, debut, fin, { journal = [], seances = [] } = {}) {
  const dans = dansLaPeriode(debut, fin);
  if (type === "pas") return Math.round((journal || []).filter((f) => f && dans(f.date)).reduce((t, f) => t + num(f.steps), 0));
  const siennes = (seances || []).filter((s) => s && dans(s.date));
  if (type === "seances") return siennes.length;
  return Math.round(siennes.reduce((t, s) => t + minutesSeance(s), 0));
}

/* ------------------------------------------------------------------ */
/* Défis suivis sur ce téléphone                                       */
/* ------------------------------------------------------------------ */

export function lireDefisAmis() {
  const v = charger(CLE_DEFIS_AMIS, null);
  return Array.isArray(v) ? v.filter((d) => d && typeof d.code === "string") : [];
}

export function retenirDefi(code, pseudo) {
  const l = lireDefisAmis();
  const avant = l.find((d) => d.code === code);
  const reste = l.filter((d) => d.code !== code);
  reste.unshift({ code, pseudo, gagne: Boolean(avant && avant.gagne) });
  enregistrer(CLE_DEFIS_AMIS, reste.slice(0, DEFIS_AMIS_MAX));
}

export function oublierDefi(code) {
  enregistrer(CLE_DEFIS_AMIS, lireDefisAmis().filter((d) => d.code !== code));
}

/** Note les défis gagnés : terminés, 1er, total > 0, au moins 2 participants. */
const lireGagnes = () => {
  const v = charger(CLE_DEFIS_GAGNES, null);
  return Array.isArray(v) ? v.filter((c) => typeof c === "string") : [];
};

export function noterVictoires(etats) {
  const l = lireDefisAmis();
  const gagnes = new Set(lireGagnes());
  const avant = gagnes.size;
  let change = false;
  for (const e of etats || []) {
    const moi = (e.participants || []).find((p) => p.moi);
    const gagne = e.termine && moi && moi.rang === 1 && moi.valeur > 0 && e.participants.length >= 2;
    const d = l.find((x) => x.code === e.code);
    if (d && gagne && !d.gagne) {
      d.gagne = true;
      change = true;
    }
    if (d && gagne) gagnes.add(e.code);
  }
  if (change) enregistrer(CLE_DEFIS_AMIS, l);
  if (gagnes.size !== avant) enregistrer(CLE_DEFIS_GAGNES, [...gagnes].slice(-500));
  return l;
}

/** Compteur du trophée « Défis entre amis » (lib/compteurs-trophees.js). */
export const defisGagnes = () => lireGagnes().length;

/* ------------------------------------------------------------------ */
/* Pseudo                                                              */
/* ------------------------------------------------------------------ */

/** Prénom du libellé du client (« Sabine P. » → « Sabine »). */
export function prenomDuLibelle(libelle) {
  return String(libelle || "").trim().split(/\s+/)[0] || "";
}

/** Pseudo proposé : le dernier choisi, sinon le prénom de l'accès. */
export function pseudoParDefaut(env) {
  const garde = charger(CLE_PSEUDO_DEFIS, "");
  if (typeof garde === "string" && garde.trim()) return garde.trim();
  const a = accesActuel(env);
  return a ? prenomDuLibelle(a.libelle) : "";
}

export const retenirPseudo = (pseudo) => enregistrer(CLE_PSEUDO_DEFIS, String(pseudo || "").trim().slice(0, 20));

/* ------------------------------------------------------------------ */
/* Lien d'invitation (?defi=CODE)                                      */
/* ------------------------------------------------------------------ */

export const codeDefiPropre = (v) =>
  String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

/** Lien vers la page ouverte, avec « ?defi=CODE » (sous-chemin gardé). */
export function lienInvitation(code, adresse = typeof window !== "undefined" ? window.location : null) {
  const a = adresse || {};
  return `${a.origin || ""}${a.pathname || ""}?${PARAMETRE_DEFI}=${encodeURIComponent(code)}`;
}

export function texteInvitation(code, type, adresse) {
  const t = typeDefi(type);
  return {
    titre: "Défi Team Neiram",
    texte: `Je te défie : ${t.label.toLowerCase()} en 7 jours ! Ouvre le lien dans l'app Coach Neiram, ou entre le code ${code} dans la carte « Défis entre amis » du Journal.`,
    url: lienInvitation(code, adresse)
  };
}

/** Code lu dans l'adresse (« ?defi=abc234 » → « ABC234 »), ou null. */
export function codeDepuisAdresse(recherche) {
  const code = codeDefiPropre(new URLSearchParams(recherche || "").get(PARAMETRE_DEFI));
  return code.length === 6 ? code : null;
}

/** L'adresse sans « defi » ; les autres paramètres et l'ancre restent. */
export function adresseSansDefi({ pathname = "", search = "", hash = "" } = {}) {
  const p = new URLSearchParams(search || "");
  p.delete(PARAMETRE_DEFI);
  const reste = p.toString();
  return `${pathname}${reste ? "?" + reste : ""}${hash || ""}`;
}

let codeRecu = null;

/**
 * Lit l'adresse d'ouverture (?defi=…), retient le code et nettoie
 * l'adresse (history.replaceState) : recharger ne le reprend pas. Appelé
 * par App.jsx au lancement et par la carte (les effets d'un enfant passent
 * avant ceux du parent). `env` est injectable pour les tests.
 */
export function brancherInvitationDefi(env = typeof window !== "undefined" ? window : null) {
  if (!env || !env.location || !String(env.location.search || "").includes(PARAMETRE_DEFI + "=")) return codeRecu;
  const code = codeDepuisAdresse(env.location.search);
  try {
    env.history.replaceState(env.history.state ?? null, "", adresseSansDefi(env.location));
  } catch (e) {
    // Adresse non nettoyée : le code reste pré-rempli, sans effet de bord.
  }
  if (code) codeRecu = code;
  return codeRecu;
}

/** La carte prend le code reçu une seule fois. */
export function prendreCodeInvitation(env) {
  brancherInvitationDefi(env);
  const c = codeRecu;
  codeRecu = null;
  return c;
}

/* ------------------------------------------------------------------ */
/* Appels au Worker du coach                                           */
/* ------------------------------------------------------------------ */

/** Un jeton client est-il activé sur ce téléphone ? */
export const defisPossibles = (env) => Boolean(accesActuel(env));

/**
 * POST au Worker, jeton joint. Rend la réponse ; lève une Error dont le
 * message est le code d'erreur du Worker (« pseudo-pris »…) ou « reseau ».
 */
export async function appelerDefis(chemin, corps, env = globalThis) {
  let r;
  try {
    r = await env.fetch(PROXY_BASE_URL + chemin, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...enTetesAcces(env) },
      body: JSON.stringify(corps || {})
    });
  } catch (e) {
    throw new Error("reseau");
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d || d.ok === false) throw new Error((d && d.error) || "indisponible");
  return d;
}

export const creerDefi = (type, pseudo, env) => appelerDefis("/defis/creer", { type, pseudo }, env);
export const rejoindreDefi = (code, pseudo, env) => appelerDefis("/defis/rejoindre", { code, pseudo }, env);
export const progresDefis = (defis, env) => appelerDefis("/defis/progres", { defis }, env);
export const quitterDefi = (code, env) => appelerDefis("/defis/quitter", { code }, env);

/* ------------------------------------------------------------------ */
/* Textes de la carte (ui/CarteDefisAmis.jsx)                          */
/* ------------------------------------------------------------------ */

export const ERREURS_DEFIS_AMIS = {
  "pseudo-longueur": "Ton pseudo doit faire entre 3 et 20 caractères.",
  "pseudo-caracteres": "Lettres, chiffres, espaces, points, tirets et _ seulement.",
  "pseudo-refuse": "Ce pseudo n'est pas accepté.",
  "pseudo-pris": "Ce pseudo est déjà pris dans ce défi.",
  "defi-inconnu": "Aucun défi avec ce code.",
  "defi-termine": "Ce défi est terminé.",
  "defi-complet": "Ce défi est complet (20 participants).",
  "trop-de-defis": "Tu as lancé beaucoup de défis aujourd'hui : réessaie demain.",
  "trop-de-defis-actifs": "Tu as déjà 3 défis en cours : quittes-en un ou attends la fin.",
  "trop-de-requetes": "Doucement : réessaie dans une minute.",
  "acces-requis": "Entre le code de ton coach dans les Réglages pour lancer un défi.",
  "jeton-invalide": "Ton accès n'est plus actif : demande un nouveau code à ton coach.",
  reseau: "Pas de connexion : réessaie une fois le réseau revenu."
};
export const messageErreurDefi = (e) => ERREURS_DEFIS_AMIS[e && e.message] || "Service indisponible pour l'instant.";

export const TEXTES_DEFIS_AMIS = {
  titre: "⚔️ Défis entre amis",
  intro: "Lance un défi de 7 jours entre clients du coach : le plus de pas, de séances ou de minutes de sport gagne.",
  sansAcces: "Les défis sont réservés aux clients du coach. Entre le code d'accès de ton coach dans les Réglages (« Accès de ton coach ») pour y participer.",
  accord: "Ton pseudo et ton total sont visibles des autres participants de ce défi",
  accordDetail: "Rien d'autre : ni ton nom, ni ton poids, ni tes données de santé. Tu peux quitter le défi à tout moment : ta participation est alors effacée.",
  boutonAccord: "J'ai compris, continuer",
  pseudo: "Ton pseudo (ex. ton prénom)",
  lancer: "Lancer un défi",
  code: "Code reçu",
  rejoindre: "Rejoindre",
  codeRecu: "Invitation reçue : vérifie ton pseudo puis touche « Rejoindre ».",
  inviter: "Inviter",
  lienCopie: "Lien d'invitation",
  codeDuDefi: "Code du défi",
  quitter: "Quitter",
  retirer: "Retirer",
  confirmerQuitter: "Quitter ce défi ? Ton pseudo et ton total en seront effacés.",
  seul: "Envoie le lien ou le code à un autre client du coach pour lancer la bataille.",
  dernierJour: "Dernier jour",
  encore: (j) => `Encore ${j} j`,
  termineLe: (date) => `Terminé le ${date}`,
  gagnes: (n) => `🏆 ${n} gagné${n > 1 ? "s" : ""}`
};
