/**
 * Appels IA, via le proxy Cloudflare.
 *
 * Aucune cle ne transite par le navigateur : le proxy detient la cle Gemini
 * et l'ajoute cote serveur. Cette version, contrairement a celle de
 * index.html, n'a plus de repli sur une cle personnelle — ce repli n'existait
 * que pour couvrir la periode ou le proxy n'etait pas encore deploye.
 *
 * Les libelles d'erreur sont conserves a l'identique : ce sont eux qui
 * pilotent les messages affiches au client.
 */

import { GEMINI_MODELS, PROXY_BASE_URL } from "./config.js";
import { enTetesAcces } from "./acces.js";

export const MSG_ERREUR = {
  quota: "Quota IA gratuit du jour atteint — les fonctions IA reviennent après 9 h du matin (réinitialisation quotidienne).",
  "bad-key": "Clé IA invalide ou inactive — préviens ton coach.",
  indisponible: "Service IA momentanément indisponible. Réessaie dans un instant.",
  /* TEXTE-NOUVEAU
     L'application d'origine n'avait pas ce message : une coupure réseau y
     tombait dans le repli générique, qui parle de reprendre la photo. La
     cliente refaisait donc des photos d'une assiette parfaitement nette,
     en cherchant un défaut qui n'existait pas. */
  reseau: "Pas de connexion — l'analyse a besoin d'internet. Réessaie une fois le réseau revenu.",
  // Delai depasse (option delaiMs) : sans lui, un reseau qui ne repond pas
  // laissait l'ecran bloque sur « Estimation... » indefiniment.
  delai: "L'IA met trop de temps à répondre. Vérifie ta connexion, puis réessaie.",
  // Acces par jeton client (17 octobre 2026, audit P0-3).
  acces: "L'assistant IA n'est pas activé sur ce téléphone : entre le code d'accès donné par ton coach dans les Réglages.",
  "quota-client": "Tu as utilisé toute ton IA du jour. Elle revient demain.",
  frequence: "Beaucoup de demandes d'affilée : patiente une minute, puis réessaie.",
  // Accord refuse a l'ecran d'accord : rien n'a ete envoye.
  consentement: "Rien n'a été envoyé : cette fonction a besoin de ton accord pour transmettre ces informations au service d'IA."
  /* FIN-TEXTE-NOUVEAU */
};

/**
 * Accord du client avant tout envoi a l'IA (lib/consentement.js, repris de
 * l'app Neiram le 24 octobre 2026). Par defaut (tests), rien n'est bloque ;
 * l'app branche la vraie verification au demarrage (main.jsx).
 */
let verifierConsentement = () => Promise.resolve(true);
export const definirConsentementIa = (f) => {
  verifierConsentement = typeof f === "function" ? f : () => Promise.resolve(true);
};

/** Traduit une erreur technique en message affichable. */
export function messageErreur(erreur, repli) {
  return MSG_ERREUR[erreur && erreur.message] || repli || MSG_ERREUR.indisponible;
}

/**
 * Un seul appel, sur un modele donne.
 *
 * `delaiMs` (facultatif) borne l'attente : au-dela, la requete est annulee
 * et l'erreur « delai » remonte. Sans lui, un reseau qui accepte la requete
 * mais ne repond jamais laissait l'ecran en attente pour toujours.
 */
async function appelerModele({ fonction, model, systemPrompt, messages, maxTokens, delaiMs }) {
  let reponse;
  const annulation = delaiMs && typeof AbortController !== "undefined" ? new AbortController() : null;
  const minuterie = annulation ? setTimeout(() => annulation.abort(), delaiMs) : null;
  try {
    reponse = await fetch(PROXY_BASE_URL + "/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...enTetesAcces() },
      body: JSON.stringify({ fonction, model, systemPrompt, messages, maxTokens }),
      ...(annulation ? { signal: annulation.signal } : {})
    });
  } catch (e) {
    throw new Error(annulation && annulation.signal.aborted ? "delai" : "reseau");
  } finally {
    if (minuterie) clearTimeout(minuterie);
  }

  /*
   * Le proxy du 17 octobre 2026 nomme ses refus (`error` : acces-requis,
   * quota-client...). L'ancien proxy renvoyait le corps de Google, ou
   * `error` est un objet : son interpretation, par statut, est conservee
   * a l'identique pour la periode ou les deux coexistent.
   */
  let code = null;
  if (!reponse.ok) {
    try {
      const d = await reponse.json();
      code = d && typeof d.error === "string" ? d.error : null;
    } catch (e) {
      code = null;
    }
  }
  if (reponse.status === 401 && (code === "acces-requis" || code === "jeton-invalide")) throw new Error("acces");
  if (reponse.status === 503 && code === "acces-non-configure") throw new Error("indisponible");
  if (reponse.status === 503 && code === "fournisseur-refus") throw new Error("bad-key");
  if (reponse.status === 429 && code === "quota-client") throw new Error("quota-client");
  if (reponse.status === 429 && code === "trop-de-requetes") throw new Error("frequence");

  // Statuts conserves a l'identique : l'interface s'appuie dessus.
  if (reponse.status === 429) throw new Error("quota");
  if ([400, 401, 403].includes(reponse.status)) throw new Error("bad-key");

  /*
   * Toute autre panne du service porte desormais un CODE, et non plus un
   * « API error 503 » qu'aucune traduction ne reconnaissait.
   *
   * Sans code, messageErreur() retombait sur le repli fourni par l'ecran —
   * lequel parle de reprendre une photo plus nette. Une panne serveur
   * disait donc a la cliente que SA PHOTO etait mauvaise : elle en refaisait
   * trois, changeait de lumiere, et finissait par croire que son telephone
   * ne convenait pas. Pendant ce temps, personne ne regardait le serveur.
   *
   * Le statut reste dans la console pour le diagnostic.
   */
  if (!reponse.ok) {
    console.error("[Coach Neiram] Service IA — statut " + reponse.status);
    throw new Error("indisponible");
  }

  const donnees = await reponse.json();
  const candidat = (donnees.candidates || [])[0];
  const texte = (((candidat || {}).content || {}).parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();
  if (!texte) throw new Error("empty");
  return texte;
}

/**
 * Genere du texte, en essayant les modeles dans l'ordre.
 *
 * `fonction` (facultatif) nomme l'usage aupres du proxy : seul « programme »
 * existe, il autorise un PDF et une reponse plus longue (worker/).
 *
 * Une cle invalide interrompt tout de suite : reessayer sur un autre modele
 * ne ferait que repeter la meme erreur. Un quota atteint laisse une seconde
 * chance apres une courte pause, comme dans la version d'origine.
 */
export async function genererTexte({ fonction, prompt, images, history, systemPrompt, maxTokens, delaiMs }) {
  // Rien ne part sans l'accord explicite du client.
  if (!(await verifierConsentement())) throw new Error("consentement");
  const messages = construireMessages({ prompt, images, history });
  let derniereErreur = null;

  for (const model of GEMINI_MODELS) {
    try {
      return await appelerModele({ fonction, model, systemPrompt, messages, maxTokens, delaiMs });
    } catch (e) {
      derniereErreur = e;
      // Un delai depasse ne se rattrape pas en essayant le modele suivant :
      // l'attente s'additionnerait, et c'est justement ce qu'on veut borner.
      if (["bad-key", "delai", "acces", "quota-client", "frequence", "consentement"].includes(e.message)) throw e;
      if (e.message === "quota") {
        await new Promise((r) => setTimeout(r, 1600));
        try {
          return await appelerModele({ fonction, model, systemPrompt, messages, maxTokens, delaiMs });
        } catch (e2) {
          derniereErreur = e2;
        }
      }
    }
  }
  throw derniereErreur || new Error("failed");
}

/**
 * Met les entrees au format attendu par Gemini.
 *
 * Deux formes possibles : une conversation (history), ou une consigne unique
 * accompagnee d'images. Gemini attend « model » la ou l'application parle
 * d'« assistant ».
 */
export function construireMessages({ prompt, images, history }) {
  if (history) {
    return history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }]
    }));
  }

  const parts = [];
  (images || []).forEach((img) => {
    if (!img) return;
    if (img.label) parts.push({ text: img.label });
    // L'entete « data:image/jpeg;base64, » doit etre retiree. Son type est
    // conserve : un PDF (programme d'entrainement) part en application/pdf.
    const url = String(img.dataUrl || img);
    const type = /^data:([\w.+-]+\/[\w.+-]+);base64,/.exec(url);
    parts.push({ inlineData: { mimeType: type ? type[1] : "image/jpeg", data: url.split(",")[1] } });
  });
  parts.push({ text: prompt });
  return [{ role: "user", parts }];
}
