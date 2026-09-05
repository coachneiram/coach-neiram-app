/**
 * Configuration partagee.
 *
 * PROXY_BASE_URL doit rester identique a celle de index.html tant que les
 * deux versions coexistent. Un test verrouille cette concordance : si l'une
 * pointait vers un autre proxy, les deux versions n'ecriraient plus au meme
 * endroit et les pointages se disperseraient entre deux destinations.
 */

export const PROXY_BASE_URL = "https://coach-neiram-proxy.pelissier-marien.workers.dev";

/**
 * Modeles Gemini, essayes dans cet ordre.
 * Doit rester aligne avec la liste autorisee par le proxy : un modele absent
 * de sa liste blanche est refuse avec une erreur 400.
 */
export const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest"
];
