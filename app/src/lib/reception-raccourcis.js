/**
 * Réception des raccourcis (voir lib/raccourcis.js).
 *
 * L'adresse est lue au lancement, avant que les données soient chargées :
 * l'action attend dans une file, puis App.jsx la traite. Les écrans qui
 * doivent réagir (ouvrir la séance du jour, l'ajout d'un aliment) prennent
 * leur « intention » à l'ouverture, ou la reçoivent par l'événement
 * « cn-intention » s'ils sont déjà affichés.
 */

import { adresseNettoyee, lienDepuisAdresse, lireAction } from "./raccourcis.js";

const file = [];
let traiter = null;
const intentions = new Map();
let dernier = { lien: null, a: 0 };

/**
 * Garde-fou anti double comptage : le même lien reçu deux fois en moins de
 * 2 s (double lancement, double montage) ne compte qu'une fois. Un verre
 * d'eau ne doit jamais compter double.
 */
const DOUBLON_MS = 2000;

/**
 * Une intention non prise vite est oubliée : sans écran pour la prendre
 * (mode Google Sheets sans constructeur de séances), elle se déclencherait
 * des heures plus tard, à la prochaine ouverture de l'écran.
 */
const VIE_INTENTION_MS = 15000;

export const EVENEMENT_INTENTION = "cn-intention";

/** Un lien de raccourci arrive. Rend true s'il est accepté. */
export function recevoirLien(lien, maintenant = Date.now()) {
  const action = lireAction(lien);
  if (!action) return false;
  if (dernier.lien === lien && maintenant - dernier.a < DOUBLON_MS) return false;
  dernier = { lien, a: maintenant };
  if (traiter) traiter(action);
  else file.push(action);
  return true;
}

/** App.jsx s'abonne quand les données sont chargées ; rend le désabonnement. */
export function ecouterRaccourcis(fn) {
  traiter = fn;
  while (file.length) fn(file.shift());
  return () => {
    if (traiter === fn) traiter = null;
  };
}

/** Demande à un écran d'agir (« seance », « repas »). */
export function poserIntention(id, maintenant = Date.now()) {
  intentions.set(id, maintenant);
  try {
    window.dispatchEvent(new CustomEvent(EVENEMENT_INTENTION, { detail: id }));
  } catch (e) {
    // Sans événement, l'écran prendra l'intention à son ouverture.
  }
}

/** L'écran prend l'intention une seule fois, si elle est encore fraîche. */
export function prendreIntention(id, maintenant = Date.now()) {
  if (!intentions.has(id)) return false;
  const posee = intentions.get(id);
  intentions.delete(id);
  return maintenant - posee < VIE_INTENTION_MS;
}

/**
 * Lit l'adresse d'ouverture (?raccourci=…) et la nettoie aussitôt
 * (history.replaceState) : recharger la page ne refait pas l'action.
 * `env` est injectable pour les tests.
 */
export function brancherRaccourcis(env = typeof window !== "undefined" ? window : null) {
  if (!env || !env.location) return false;
  const lien = lienDepuisAdresse(env.location.search);
  if (!lien) return false;
  try {
    env.history.replaceState(env.history.state ?? null, "", adresseNettoyee(env.location));
  } catch (e) {
    // Adresse non nettoyée : le garde-fou des 2 s reste en place.
  }
  return recevoirLien(lien);
}
