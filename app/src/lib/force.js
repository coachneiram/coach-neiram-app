/**
 * Estimation de la force maximale (1RM).
 *
 * Portage fidele de index.html : RPE_CHART (~3316), pctFromRPE (3326),
 * rpeFromRIR (3337), epley1RM (3343), est1RMFromSet (3348),
 * chargeFrom1RM (3357).
 *
 * Ces valeurs servent a prescrire des charges d'entrainement. Une erreur
 * ne produit pas un affichage bizarre : elle met du poids en trop sur une
 * barre. Les bornes sont donc volontairement strictes, et tout ce qui sort
 * du domaine connu renvoie null plutot qu'une extrapolation.
 */

import { num, round } from "./dates.js";

/**
 * Pourcentage du maximum selon le RPE et le nombre de repetitions.
 *
 * Table de reference du powerlifting (RPE de 6,5 a 10, de 1 a 12 reps).
 * Elle n'est pas extrapolable : au-dela, l'estimation devient fantaisiste.
 */
/** Lignes de la table RPE, du plus dur au plus facile. */
export const PALIERS_RPE = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5];

export const RPE_CHART = {
  10: [100, 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68],
  9.5: [97.8, 93.9, 90.7, 87.8, 85, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7],
  9: [95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68, 65.3],
  8.5: [93.9, 90.7, 87.8, 85, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64],
  8: [92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68, 65.3, 62.6],
  7.5: [90.7, 87.8, 85, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64, 61.3],
  7: [89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68, 65.3, 62.6, 59.9],
  6.5: [87.8, 85, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64, 61.3, 58.6]
};

/** Le RPE est arrondi au demi-point : la table n'a pas d'autre granularite. */
export function pctFromRPE(rpe, reps) {
  if (rpe == null || rpe === "" || reps == null || reps === "") return null;
  const rp = num(rpe);
  const r = num(reps);
  if (!rp || !r) return null;
  if (r < 1 || r > 12) return null;

  const pas = Math.round(rp * 2) / 2;
  // Cette borne fait doublon avec la recherche dans la table, qui echoue
  // deja pour tout palier absent. Elle est conservee parce qu'elle dit
  // explicitement quel domaine la table couvre — l'echec silencieux d'une
  // recherche ne le dit pas.
  if (pas < 6.5 || pas > 10) return null;

  const ligne = RPE_CHART[pas];
  if (!ligne) return null;
  return ligne[Math.round(r) - 1];
}

/** Repetitions en reserve converties en RPE : 2 RIR = RPE 8. */
export function rpeFromRIR(rir) {
  if (rir == null || rir === "") return null;
  const v = num(rir);
  if (v < 0 || v > 3.5) return null;
  return round(10 - v, 1);
}

/**
 * Formule d'Epley.
 *
 * Refuse au-dela de 12 repetitions : la formule y devient trop optimiste,
 * et surestimer un maximum se paie en blessure, pas en approximation.
 */
export function epley1RM(poids, reps) {
  const w = num(poids);
  const r = num(reps);
  if (!w || !r || r > 12) return null;
  return round(w * (1 + r / 30), 1);
}

/**
 * Meilleure estimation disponible pour une serie.
 *
 * La table RPE est preferee a Epley quand le ressenti est renseigne :
 * elle tient compte de l'effort reel, la ou Epley ne connait que le nombre
 * de repetitions.
 */
export function est1RMFromSet(poids, reps, rpe, rir) {
  const w = num(poids);
  if (!w) return null;

  const rpeEffectif = rpe != null && rpe !== "" ? num(rpe) : rpeFromRIR(rir);
  const pct = pctFromRPE(rpeEffectif, reps);
  if (pct) return { value: round(w / (pct / 100), 1), method: "RPE" };

  const e = epley1RM(poids, reps);
  return e != null ? { value: e, method: "Epley" } : null;
}

/** Charge de travail, arrondie au pas de 2,5 kg des disques disponibles. */
export function chargeFrom1RM(pct, max) {
  const p = num(pct);
  const m = num(max);
  if (!p || !m) return null;
  return round(((m * p) / 100 / 2.5), 0) * 2.5;
}

/**
 * Les trois mouvements de force athletique.
 *
 * Les motifs sont volontairement larges : le meme mouvement s'ecrit
 * « developpe couche », « bench » ou « spoto press » selon les clients, et
 * tous doivent compter pour le meme maxi.
 */
export const MOUVEMENTS_FORCE = [
  { id: "squat", label: "Squat", motif: /squat/ },
  { id: "bench", label: "Développé couché", motif: /(developpe couche|bench|spoto|pause bench)/ },
  {
    id: "deadlift",
    label: "Soulevé de terre",
    motif: /(souleve de terre|deadlift|rack pull|block pull|deficit)/
  }
];

/**
 * Variantes a NE PAS compter comme le mouvement de competition.
 *
 * Un squat bulgare n'est pas un squat : compter ses charges dans le maxi
 * ferait chuter le 1RM estime du client, et lui proposerait ensuite des
 * charges trop legeres sur son vrai squat.
 */
const VARIANTES_EXCLUES = /(squat bulgare|bulgarian|split squat|goblet|hack squat|squat jump)/;

const sansAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Mouvement de force correspondant a un nom d'exercice, ou null. */
export function mouvementForce(nom) {
  const s = sansAccents(String(nom || "").toLowerCase());
  if (VARIANTES_EXCLUES.test(s)) return null;
  const trouve = MOUVEMENTS_FORCE.find((l) => l.motif.test(s));
  return trouve ? trouve.id : null;
}

/**
 * Meilleur 1RM estime par mouvement, a partir de l'historique.
 *
 * Seules les series enregistrees en mode « force » comptent : une serie de
 * squat faite en fin de seance de jambes n'est pas une reference de maxi.
 */
export function meilleursMaxis(seances) {
  const sortie = {};
  for (const s of seances || []) {
    for (const ex of s.exercises || []) {
      if ((ex.mode || "") !== "powerlifting") continue;
      const mouvement = mouvementForce(ex.name);
      if (!mouvement) continue;
      const estimation = est1RMFromSet(ex.weight, ex.reps, ex.rpe, ex.rir);
      if (estimation == null) continue;
      if (!sortie[mouvement] || estimation.value > sortie[mouvement].est) {
        sortie[mouvement] = {
          est: estimation.value,
          method: estimation.method,
          date: s.date,
          weight: num(ex.weight),
          reps: num(ex.reps)
        };
      }
    }
  }
  return sortie;
}

/** Total des trois maxis declares. */
export const totalForce = (maxis) =>
  MOUVEMENTS_FORCE.reduce((acc, l) => {
    const v = num((maxis || {})[l.id]);
    return v ? acc + v : acc;
  }, 0);
