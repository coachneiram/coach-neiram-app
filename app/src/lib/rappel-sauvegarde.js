/**
 * Rappel de sauvegarde, dans le Journal.
 *
 * Les donnees ne vivent que sur le telephone (aucun compte, aucun
 * serveur). Un telephone perdu, casse ou change sans export, et tout le
 * suivi disparait : c'est le risque le plus lourd de l'app, et la source
 * d'avis a une etoile la plus previsible. D'ou une carte, gratuite :
 *  - jamais avant 14 jours de suivi (rien a perdre avant) ;
 *  - si aucune sauvegarde n'a ete faite, ou si la derniere date de
 *    30 jours ou plus ;
 *  - « Plus tard » la fait taire 7 jours.
 *
 * Cles « neiram_ » : hors sauvegarde. Apres une restauration sur un
 * nouveau telephone, le compteur repart donc de zero, ce qui est voulu.
 */

import { parseISO } from "./dates.js";

export const CLE_DERNIERE_SAUVEGARDE = "neiram_derniere_sauvegarde";
export const CLE_RAPPEL_REPORTE = "neiram_rappel_sauvegarde_reporte";
export const JOURS_SUIVI_MIN = 14;
export const JOURS_ENTRE_SAUVEGARDES = 30;
export const JOURS_REPORT = 7;

const ecartJours = (de, a) => Math.round((parseISO(a) - parseISO(de)) / 86400000);
const estJour = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Premier jour ou quelque chose a ete note (repas, journal, seance, poids, mesure). */
export function premierJourSuivi(...listes) {
  let premier = null;
  for (const liste of listes) {
    for (const e of liste || []) {
      const d = e && e.date;
      if (estJour(d) && (premier === null || d < premier)) premier = d;
    }
  }
  return premier;
}

/**
 * La carte doit-elle s'afficher ? Rend null, ou { jamais, jours } :
 * jamais = aucune sauvegarde ; jours = anciennete de la derniere.
 */
export function rappelSauvegarde({ aujourdhui, premierJour, derniere, reporteJusquAu }) {
  if (!estJour(aujourdhui) || !estJour(premierJour)) return null;
  if (ecartJours(premierJour, aujourdhui) < JOURS_SUIVI_MIN) return null;
  if (estJour(reporteJusquAu) && aujourdhui < reporteJusquAu) return null;
  if (!estJour(derniere)) return { jamais: true, jours: null };
  const jours = ecartJours(derniere, aujourdhui);
  return jours >= JOURS_ENTRE_SAUVEGARDES ? { jamais: false, jours } : null;
}

/** Phrase de la carte. */
export function texteRappel({ jamais, jours }) {
  return jamais
    ? "Ton suivi est enregistré uniquement sur ce téléphone. Une sauvegarde te permet de tout retrouver si tu le perds ou en changes."
    : `Ta dernière sauvegarde date de ${jours} jours. Ton suivi est enregistré uniquement sur ce téléphone.`;
}

function lire(stockage, cle) {
  try {
    return stockage.getItem(cle);
  } catch (e) {
    return null;
  }
}

function ecrire(stockage, cle, valeur) {
  try {
    stockage.setItem(cle, valeur);
  } catch (e) {
    // Sans stockage : la carte reviendra, sans gravite.
  }
}

export const lireEtatSauvegarde = (stockage) => ({
  derniere: lire(stockage, CLE_DERNIERE_SAUVEGARDE),
  reporteJusquAu: lire(stockage, CLE_RAPPEL_REPORTE)
});

/** A appeler apres un export reussi (partage ou telechargement). */
export function marquerSauvegarde(stockage, jour) {
  ecrire(stockage, CLE_DERNIERE_SAUVEGARDE, jour);
}

/** « Plus tard » : la carte se tait JOURS_REPORT jours. */
export function reporterRappel(stockage, jour, addDays) {
  ecrire(stockage, CLE_RAPPEL_REPORTE, addDays(jour, JOURS_REPORT));
}

/** Un export a-t-il vraiment produit un fichier ? (« cancelled » : non) */
export const exportReussi = (resultat) => resultat === "shared" || resultat === "downloaded";

/** Textes de la carte (repris de l'app Neiram le 24 octobre 2026). */
export const TEXTES_RAPPEL_SAUVEGARDE = {
  titre: "Mets ton suivi à l'abri",
  sauvegarder: "Sauvegarder maintenant",
  plusTard: "Plus tard",
  faite: "Sauvegarde faite. Garde ce fichier en lieu sûr (Drive, mail…).",
  echec: "La sauvegarde n'a pas abouti. Réessaie depuis Réglages → Sauvegarde des données."
};
