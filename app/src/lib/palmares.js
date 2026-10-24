/**
 * Palmarès : ce que le client a gagné dans les classements de la
 * communauté Team Neiram (worker/coach-neiram-proxy.js). Repris de l'app
 * publique Neiram (lib/palmares.js) le 24 octobre 2026. Sert aux trophées
 * « Classements », « Podiums du mois », « Athlète du mois » et « Athlète de
 * l'année » (lib/trophees.js, via lib/compteurs-trophees.js). Le niveau
 * fédéral, lui, se calcule sur le téléphone (compteurs-trophees.js).
 *
 * « cn_palmares » (dans la sauvegarde) : { titres: [{ mois, discipline,
 * rang }], titresAnnee: [{ annee, discipline, rang }], meilleurTop }.
 */

import { charger, enregistrer } from "./stockage.js";
import { num } from "./dates.js";

export const CLE_PALMARES = "cn_palmares";

/** En dessous de ce nombre de classés, un rang ne dit rien (seul = 1er). */
export const CLASSES_MINIMUM_TOP = 10;

export function lirePalmares() {
  const v = charger(CLE_PALMARES, null);
  const o = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  const titres = Array.isArray(o.titres)
    ? o.titres.filter((t) => t && /^\d{4}-\d{2}$/.test(t.mois) && typeof t.discipline === "string" && num(t.rang) >= 1 && num(t.rang) <= 3)
    : [];
  const titresAnnee = Array.isArray(o.titresAnnee)
    ? o.titresAnnee.filter((t) => t && /^\d{4}$/.test(t.annee) && typeof t.discipline === "string" && num(t.rang) >= 1 && num(t.rang) <= 3)
    : [];
  return { titres, titresAnnee, meilleurTop: Math.min(100, Math.max(0, num(o.meilleurTop))) };
}

const ecrire = (p) => {
  enregistrer(CLE_PALMARES, p);
  return p;
};

/**
 * Titres renvoyés par le serveur (mois et années terminés) : ils
 * s'AJOUTENT à ceux déjà gagnés. Un titre gagné ne se perd pas si le
 * client retire ensuite son accord « disciplines » (le serveur efface
 * alors ses scores).
 */
export function retenirTitres(titres, titresAnnee) {
  const p = lirePalmares();
  const cleM = (t) => `${t.mois}|${t.discipline}`;
  const cleA = (t) => `${t.annee}|${t.discipline}`;
  const mois = new Map(p.titres.map((t) => [cleM(t), t]));
  for (const t of titres || []) {
    if (t && /^\d{4}-\d{2}$/.test(t.mois) && typeof t.discipline === "string" && num(t.rang) >= 1 && num(t.rang) <= 3) mois.set(cleM(t), { mois: t.mois, discipline: t.discipline, rang: num(t.rang) });
  }
  const annees = new Map(p.titresAnnee.map((t) => [cleA(t), t]));
  for (const t of titresAnnee || []) {
    if (t && /^\d{4}$/.test(String(t.annee)) && typeof t.discipline === "string" && num(t.rang) >= 1 && num(t.rang) <= 3) {
      annees.set(cleA({ ...t, annee: String(t.annee) }), { annee: String(t.annee), discipline: t.discipline, rang: num(t.rang) });
    }
  }
  return ecrire({ ...p, titres: [...mois.values()], titresAnnee: [...annees.values()] });
}

/**
 * « Top X % » : 100 − X, gardé au meilleur. Rang 1 sur 40 → top 3 % → 97.
 * Rien sous CLASSES_MINIMUM_TOP classés.
 */
export function noterRang(rang, total) {
  const p = lirePalmares();
  if (!(num(total) >= CLASSES_MINIMUM_TOP) || !(num(rang) >= 1)) return p;
  const top = Math.max(1, Math.ceil((num(rang) / num(total)) * 100));
  const score = 100 - top;
  return score > p.meilleurTop ? ecrire({ ...p, meilleurTop: score }) : p;
}

/** Compteurs des trophées de compétition (lib/trophees.js). */
export function compteursPalmares(p = lirePalmares()) {
  return {
    topClassement: p.meilleurTop,
    podiums: p.titres.length,
    athleteMois: p.titres.filter((t) => t.rang === 1).length,
    athleteAnnee: p.titresAnnee.filter((t) => t.rang === 1).length
  };
}
