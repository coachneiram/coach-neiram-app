/**
 * « Ta forme du jour » (repris de l'app Neiram, 24 octobre 2026).
 *
 * Score de 0 a 100 tire de ce que le client note deja dans le Journal
 * (sommeil, qualite, energie, stress) et de sa charge des 2 derniers jours
 * comparee a sa moyenne sur 28 jours. Pas de montre, pas de donnee en plus.
 *
 * ADAPTATION COACHING : dans l'app Neiram, un score bas conseillait
 * « mobilité ou repos ». Ici le programme vient du coach : le conseil ne
 * remplace jamais la seance, il dit comment la faire (haut ou bas de la
 * fourchette) et renvoie vers le coach pour la decaler.
 *
 * Indicatif, pas medical.
 */

import { addDays, num } from "./dates.js";
import { seriesPourCalcul } from "./series.js";

const borne = (v) => Math.max(0, Math.min(1, v));

function seriesDuJour(seances, date) {
  let n = 0;
  for (const s of seances || []) {
    if (!s || s.date !== date) continue;
    for (const ex of Array.isArray(s.exercises) ? s.exercises : []) {
      if (!ex || ex.mode === "cardio") continue;
      const series = seriesPourCalcul(ex);
      n += series ? series.length : num(ex.sets) || 1;
    }
  }
  return n;
}

/** Charge des 2 derniers jours (hier, avant-hier) / moyenne journaliere sur 28 jours. */
export function chargeRecente(seances, date) {
  const recent = seriesDuJour(seances, addDays(date, -1)) + seriesDuJour(seances, addDays(date, -2));
  let total = 0;
  for (let i = 1; i <= 28; i++) total += seriesDuJour(seances, addDays(date, -i));
  const moyenne2j = (total / 28) * 2;
  if (moyenne2j <= 0) return recent > 0 ? 1.5 : 1;
  return recent / moyenne2j;
}

/**
 * null si rien n'est note aujourd'hui (pas de score invente), sinon
 * { score (0-100), niveau: « pousse » | « normal » | « recupere »,
 *   facteurs: [{ id, nom, valeur (0-1) }] }.
 */
export function scoreForme({ form = {}, seances = [], date }) {
  const f = form || {};
  const facteurs = [];
  const h = num(f.sleepHours);
  if (h > 0) facteurs.push({ id: "sommeil", nom: "Sommeil", valeur: borne(1 - Math.abs(h - 8) / 3), poids: 0.3 });
  if (num(f.sleepQuality) > 0) facteurs.push({ id: "qualite", nom: "Qualité du sommeil", valeur: borne((num(f.sleepQuality) - 1) / 4), poids: 0.15 });
  if (num(f.energy) > 0) facteurs.push({ id: "energie", nom: "Énergie", valeur: borne((num(f.energy) - 1) / 4), poids: 0.25 });
  if (num(f.stress) > 0) facteurs.push({ id: "stress", nom: "Stress", valeur: borne(1 - (num(f.stress) - 1) / 9), poids: 0.15 });
  if (!facteurs.length) return null;
  const charge = chargeRecente(seances, date);
  // 1 = charge habituelle ; au-dela de 1,5 fois, la recuperation baisse.
  facteurs.push({ id: "charge", nom: "Charge des 2 derniers jours", valeur: borne(1 - (charge - 1) / 1.5), poids: 0.15 });
  const poids = facteurs.reduce((a, x) => a + x.poids, 0);
  const score = Math.round((facteurs.reduce((a, x) => a + x.valeur * x.poids, 0) / poids) * 100);
  return {
    score,
    niveau: score >= 75 ? "pousse" : score >= 50 ? "normal" : "recupere",
    facteurs: facteurs.map(({ id, nom, valeur }) => ({ id, nom, valeur }))
  };
}

export const CONSEILS_FORME = {
  pousse: {
    emoji: "🟢",
    titre: "Feu vert",
    texte: "Bonne récupération : fais ta séance comme prévu, tu peux viser le haut de ta fourchette."
  },
  normal: {
    emoji: "🟡",
    titre: "Séance normale",
    texte: "Fais ta séance comme prévu, sans dépasser ce que ton coach a programmé."
  },
  recupere: {
    emoji: "🔴",
    titre: "Récupération faible",
    texte: "Fais ta séance en restant dans le bas de ta fourchette, sans aller à l'échec. Si tu préfères la décaler, préviens ton coach."
  }
};

export const TEXTES_FORME = {
  titre: "Ta forme du jour",
  avertissement: "Indicatif, à partir de ce que tu notes dans le Journal : ce n'est pas un avis médical."
};
