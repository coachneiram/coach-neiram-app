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

export const MSG_ERREUR = {
  quota: "Quota IA gratuit du jour atteint — les fonctions IA reviennent après 9 h du matin (réinitialisation quotidienne).",
  "bad-key": "Clé IA invalide ou inactive — préviens ton coach.",
  indisponible: "Service IA momentanément indisponible. Réessaie dans un instant.",
  /* TEXTE-NOUVEAU
     L'application d'origine n'avait pas ce message : une coupure réseau y
     tombait dans le repli générique, qui parle de reprendre la photo. La
     cliente refaisait donc des photos d'une assiette parfaitement nette,
     en cherchant un défaut qui n'existait pas. */
  reseau: "Pas de connexion — l'analyse a besoin d'internet. Réessaie une fois le réseau revenu."
  /* FIN-TEXTE-NOUVEAU */
};

/** Traduit une erreur technique en message affichable. */
export function messageErreur(erreur, repli) {
  return MSG_ERREUR[erreur && erreur.message] || repli || MSG_ERREUR.indisponible;
}

/** Un seul appel, sur un modele donne. */
async function appelerModele({ model, systemPrompt, messages, maxTokens }) {
  let reponse;
  try {
    reponse = await fetch(PROXY_BASE_URL + "/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, systemPrompt, messages, maxTokens })
    });
  } catch (e) {
    throw new Error("reseau");
  }

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
 * Une cle invalide interrompt tout de suite : reessayer sur un autre modele
 * ne ferait que repeter la meme erreur. Un quota atteint laisse une seconde
 * chance apres une courte pause, comme dans la version d'origine.
 */
export async function genererTexte({ prompt, images, history, systemPrompt, maxTokens }) {
  const messages = construireMessages({ prompt, images, history });
  let derniereErreur = null;

  for (const model of GEMINI_MODELS) {
    try {
      return await appelerModele({ model, systemPrompt, messages, maxTokens });
    } catch (e) {
      derniereErreur = e;
      if (e.message === "bad-key") throw e;
      if (e.message === "quota") {
        await new Promise((r) => setTimeout(r, 1600));
        try {
          return await appelerModele({ model, systemPrompt, messages, maxTokens });
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
    // L'entete « data:image/jpeg;base64, » doit etre retiree.
    parts.push({ inlineData: { mimeType: "image/jpeg", data: (img.dataUrl || img).split(",")[1] } });
  });
  parts.push({ text: prompt });
  return [{ role: "user", parts }];
}
