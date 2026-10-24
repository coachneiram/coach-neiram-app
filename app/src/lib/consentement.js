/**
 * Accord explicite avant d'envoyer des donnees a l'IA.
 *
 * Regle Apple 5.1.2 (i) : dire clairement quand des donnees personnelles
 * partent chez un tiers, IA comprise, et obtenir une permission explicite
 * AVANT. Le RGPD demande la meme transparence. Ce qui part : la photo, le
 * texte saisi, ou le resume de la semaine (moyennes de poids, calories,
 * pas, sommeil...) pour un bilan. Destinataire : Google (Gemini), via le
 * proxy de Coach Neiram, qui ne garde rien. Repris de l'app Neiram le 24
 * octobre 2026 : des donnees de sante (poids, sommeil, douleurs) peuvent
 * partir, et le RGPD (art. 9) demande un accord explicite pour cela.
 *
 * Fonctionnement : au premier appel IA, l'ecran d'accord s'ouvre
 * (EcranConsentementIa). Accepte : l'appel part, et l'accord est garde
 * (cle cn_, donc dans la sauvegarde). Refuse : l'appel n'a pas lieu, et la
 * question sera reposee a la prochaine utilisation. L'accord se retire a
 * tout moment dans les Reglages.
 *
 * VERSION : a incrementer si ce qui part change de nature (nouveau
 * destinataire, nouvelle donnee) : l'accord sera redemande.
 */

import { definirConsentementIa } from "./ia.js";

export const CLE = "cn_consentement_ia";
export const VERSION = 1;

function lire(stockage = globalThis.localStorage) {
  try {
    const v = JSON.parse(stockage.getItem(CLE) || "null");
    return v && typeof v === "object" ? v : null;
  } catch (e) {
    return null;
  }
}

/** L'accord en vigueur : { le } ou null. */
export function accordDonne(stockage) {
  const v = lire(stockage);
  return v && v.accepte === true && v.version === VERSION ? { le: v.le } : null;
}

export function enregistrerAccord(accepte, stockage = globalThis.localStorage, maintenant = new Date()) {
  try {
    if (accepte) stockage.setItem(CLE, JSON.stringify({ accepte: true, version: VERSION, le: maintenant.toISOString() }));
    else stockage.removeItem(CLE);
  } catch (e) {
    // Sans stockage, l'accord sera simplement redemande.
  }
}

/* Ouverture de l'ecran : une seule demande a la fois, partagee. */
let demandeEnCours = null;
const ecouteurs = new Set();

export function surDemandeAccord(f) {
  ecouteurs.add(f);
  return () => ecouteurs.delete(f);
}

/** Appele par l'ecran quand la personne repond. */
let repondre = null;
export function repondreAccord(accepte) {
  enregistrerAccord(accepte);
  if (repondre) repondre(Boolean(accepte));
  repondre = null;
  demandeEnCours = null;
}

/** Rend une promesse : true si l'appel IA peut partir. */
export function verifierAccord() {
  if (accordDonne()) return Promise.resolve(true);
  // Aucun ecran pour demander (tests, ecran pas encore monte) : on refuse.
  if (!ecouteurs.size) return Promise.resolve(false);
  if (!demandeEnCours) {
    demandeEnCours = new Promise((resoudre) => {
      repondre = resoudre;
    });
    ecouteurs.forEach((f) => f());
  }
  return demandeEnCours;
}

/** A appeler une fois au demarrage (main.jsx). */
export function brancherConsentement() {
  definirConsentementIa(verifierAccord);
}

/** Textes de l'ecran d'accord et du bloc des Reglages. */
export const TEXTES_ACCORD = {
  titre: "Ton accord pour l'IA",
  intro: "Pour te répondre, cette fonction envoie au service d'IA de Google (Gemini) :",
  envoye: [
    "la photo ou le texte que tu soumets (repas, recette, séance, question) ;",
    "pour un bilan : le résumé chiffré de ta semaine ou de ton mois (poids, calories, séances, pas, sommeil…) ;",
    "ton profil utile à la réponse (objectif, régime, allergies)."
  ],
  conditions:
    "L'envoi passe par le serveur de Coach Neiram, sans ton nom ni ton e-mail, et ce serveur ne garde rien après la réponse. Google traite ces informations selon les conditions de son service Gemini. Rien ne part sans cet accord, et tu peux le retirer à tout moment dans les Réglages.",
  refuser: "Refuser",
  accepter: "J'accepte",
  blocTitre: "Fonctions IA",
  blocTexte: (date) =>
    `Accord donné le ${date} pour envoyer tes photos, textes et résumés au service d'IA. Sans cet accord, rien n'est envoyé : l'accord te sera redemandé à la prochaine utilisation.`,
  retirer: "Retirer mon accord"
};
