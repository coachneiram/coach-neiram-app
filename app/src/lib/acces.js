/**
 * Acces du client aux services du coach (IA et synchronisation).
 *
 * Depuis le 17 octobre 2026 (audit P0-3 et P0-4), le proxy exige un jeton
 * propre a chaque client. Le coach donne un code d'invitation a usage
 * unique ; le client le saisit une fois dans les Reglages ; le proxy
 * l'echange contre un jeton, garde ici et joint a chaque appel.
 *
 * Ce jeton n'ouvre que l'acces de CE client (son propre quota IA, ses
 * propres evenements), et le coach peut le revoquer. Ce n'est pas une cle
 * privilegiee : aucune cle du coach n'est dans l'application.
 *
 * LA CLE DE STOCKAGE N'A NI LE PREFIXE « coach_ » NI « cn_ » : la
 * sauvegarde et le partage du fichier de sauvegarde (souvent envoye par
 * WhatsApp) ne doivent jamais emporter le jeton, et une restauration ne
 * doit pas le remplacer par celui d'un autre telephone.
 */

import { PROXY_BASE_URL } from "./config.js";

export const CLE_ACCES = "acces_neiram";

function lire(env = globalThis) {
  try {
    const brut = env.localStorage && env.localStorage.getItem(CLE_ACCES);
    const a = brut ? JSON.parse(brut) : null;
    return a && typeof a.jeton === "string" && a.jeton.length >= 20 ? a : null;
  } catch (e) {
    return null;
  }
}

/** { jeton, libelle, activeLe } ou null. */
export const accesActuel = (env) => lire(env);

/** En-tetes a joindre aux appels du proxy (vide sans jeton). */
export function enTetesAcces(env) {
  const a = lire(env);
  return a ? { Authorization: "Bearer " + a.jeton } : {};
}

/** Oublie le jeton de ce telephone (le coach peut aussi le revoquer). */
export function oublierAcces(env = globalThis) {
  try {
    env.localStorage.removeItem(CLE_ACCES);
  } catch (e) {
    // Rien a faire : sans stockage, il n'y avait pas de jeton.
  }
}

/** Erreurs d'activation, en phrases pour le client. */
export const MSG_ACTIVATION = {
  "code-invalide": "Code invalide, expiré ou déjà utilisé. Demande un nouveau code à ton coach.",
  "trop-de-tentatives": "Trop d'essais. Réessaie dans une heure.",
  reseau: "Pas de connexion. Réessaie une fois le réseau revenu.",
  indisponible: "Activation momentanément impossible. Réessaie plus tard ou préviens ton coach."
};

/**
 * Echange le code du coach contre un jeton, et le garde.
 * Rend { ok: true, libelle } ou { ok: false, erreur } (cle de MSG_ACTIVATION).
 */
export async function activerCode(code, env = globalThis) {
  const propre = String(code || "").toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(propre)) return { ok: false, erreur: "code-invalide" };
  let r;
  try {
    r = await env.fetch(PROXY_BASE_URL + "/auth/activer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: propre })
    });
  } catch (e) {
    return { ok: false, erreur: "reseau" };
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok || typeof d.jeton !== "string") {
    return { ok: false, erreur: MSG_ACTIVATION[d.error] ? d.error : "indisponible" };
  }
  try {
    env.localStorage.setItem(CLE_ACCES, JSON.stringify({ jeton: d.jeton, libelle: d.libelle || "", activeLe: new Date().toISOString() }));
  } catch (e) {
    return { ok: false, erreur: "indisponible" };
  }
  return { ok: true, libelle: d.libelle || "" };
}

/** Textes de la carte « Accès de ton coach » (Reglages). */
export const TEXTES_ACCES = {
  titre: "Accès de ton coach",
  explication:
    "Ton coach t'a donné un code à 8 caractères. Il active l'assistant IA et l'envoi automatique de tes séances. À saisir une seule fois sur ce téléphone.",
  actif: (libelle) => `Activé${libelle ? " pour " + libelle : ""}. L'IA et l'envoi au coach fonctionnent sur ce téléphone.`,
  champ: "Code d'accès (ex. K7PM-Q4XT)",
  bouton: "Activer",
  retirer: "Retirer l'accès de ce téléphone",
  confirmationRetrait: "Retirer l'accès ? L'IA et l'envoi au coach s'arrêteront sur ce téléphone jusqu'à un nouveau code."
};
