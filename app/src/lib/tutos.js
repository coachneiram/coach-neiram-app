/**
 * Tutos : comment utiliser chaque onglet et chaque fonction.
 *
 * Un tuto « principal » par onglet s'ouvre tout seul a la premiere visite
 * de l'onglet (une fois) ; le bouton « ? » de l'en-tete le rouvre ; le
 * guide (Reglages → « Guide d'utilisation ») les liste tous, onglet par
 * onglet, avec les tutos des fonctions.
 *
 * `libelles` : les textes de l'app que les etapes citent. Un test verifie
 * qu'ils existent toujours dans le code (comme lib/aide.js) : si un bouton
 * est renomme, le test echoue et le tuto est corrige avant qu'une personne
 * ne cherche un bouton qui n'existe plus.
 *
 * Repris de l'app Neiram le 24 octobre 2026. Dans l'app coach, aucune
 * fonction n'est reservee : pas de mention d'abonnement.
 *
 * Cle « neiram_ » : etat de l'app sur ce telephone, hors sauvegarde.
 */

import { ONGLETS } from "./onglets.js";
import { TUTOS } from "./tutos-contenu.js";

export { TUTOS };

export const CLE_TUTOS_VUS = "neiram_tutos_vus";

/** Attente avant d'ouvrir le tuto d'un onglet : l'ecran s'affiche d'abord. */
export const DELAI_TUTO_MS = 700;

export const trouverTuto = (id) => TUTOS.find((t) => t.id === id) || null;

/** Le tuto qui presente un onglet (ouvert a la premiere visite). */
export const tutoPrincipal = (onglet) => TUTOS.find((t) => t.onglet === onglet && t.principal) || null;

/** Groupes du guide : les onglets, puis les Reglages. */
export const GROUPES_GUIDE = [...ONGLETS.map((o) => ({ id: o.id, label: o.label })), { id: "reglages", label: "Réglages" }];

/** Tous les tutos, ranges dans l'ordre des onglets, le principal en tete. */
export function tutosParOnglet() {
  return GROUPES_GUIDE.map((o) => ({
    id: o.id,
    label: o.label,
    tutos: TUTOS.filter((t) => t.onglet === o.id).sort((a, b) => Number(!!b.principal) - Number(!!a.principal))
  })).filter((g) => g.tutos.length > 0);
}

export function lireTutosVus(stockage) {
  try {
    const v = JSON.parse(stockage.getItem(CLE_TUTOS_VUS) || "[]");
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

export function marquerTutoVu(stockage, id) {
  try {
    const vus = lireTutosVus(stockage);
    if (!vus.includes(id)) stockage.setItem(CLE_TUTOS_VUS, JSON.stringify([...vus, id]));
  } catch (e) {
    // Sans stockage : le tuto pourra se rouvrir, sans gravite.
  }
}

/**
 * Identifiant du tuto a ouvrir tout seul pour cet onglet, ou null s'il a
 * deja ete vu. Stockage illisible : null (mieux vaut ne rien ouvrir que
 * rouvrir le meme tuto a chaque visite).
 */
export function tutoAProposer({ onglet, stockage }) {
  const t = tutoPrincipal(onglet);
  if (!t) return null;
  try {
    stockage.getItem(CLE_TUTOS_VUS);
  } catch (e) {
    return null;
  }
  return lireTutosVus(stockage).includes(t.id) ? null : t.id;
}

/**
 * Premier lancement de la fonction sur ce telephone (cle absente).
 *
 * Un client qui utilise deja l'app connait ses ecrans : lui ouvrir sept
 * tutos d'affilee serait du bruit. Seul celui de Séances, refait en
 * octobre 2026, reste a lui montrer. Une nouvelle installation (pas encore
 * de profil) les recoit tous, un par onglet, a la premiere visite.
 */
export function initialiserTutos(stockage, { dejaInstalle }) {
  try {
    if (stockage.getItem(CLE_TUTOS_VUS) !== null) return;
    const vus = dejaInstalle ? TUTOS.filter((t) => t.principal && t.onglet !== "entrainements").map((t) => t.id) : [];
    stockage.setItem(CLE_TUTOS_VUS, JSON.stringify(vus));
  } catch (e) {
    // Sans stockage : rien a initialiser.
  }
}

/** Textes de la fenetre des tutos et des boutons qui l'ouvrent. */
export const TEXTES_TUTOS = {
  etape: "Étape",
  sur: "sur",
  precedent: "Précédent",
  suivant: "Suivant",
  compris: "C'est compris",
  voirTous: "Voir tous les tutos",
  guide: "Guide d'utilisation",
  lienGuide: "Guide d'utilisation (tutos)",
  introGuide: "Chaque écran a son tuto. Tu peux aussi le rouvrir à tout moment avec le bouton du livre, en haut de l'écran.",
  aria: "Tuto de cet écran"
};
