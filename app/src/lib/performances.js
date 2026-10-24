/**
 * Mes performances : les chiffres de référence de la personne, par
 * discipline, saisis par elle (repris de l'app Neiram le 24/10/2026 ; tout
 * est inclus dans l'app coach).
 *
 *  - Force athlétique : les maxis de la carte « Force athlétique »
 *    (cn_pl_1rm) ou, à défaut, le meilleur 1RM estimé des séries notées en
 *    mode force (lib/force.js).
 *  - Haltérophilie : arraché et épaulé-jeté.
 *  - Course à pied : 5 km, 10 km, semi-marathon, marathon (h:mm:ss).
 *  - Natation : 50, 100 et 400 m nage libre, en bassin de 25 m et de 50 m.
 *
 * Le niveau face aux minimas et les points : lib/niveaux.js. Pas de
 * classement entre clients dans l'app coach (pas de serveur communautaire).
 *
 * Pourquoi pas de détection automatique des chronos : les activités
 * notent la durée à la minute près, ce qui fausse un 5 km de 30 secondes.
 * Un chrono officiel ou de montre se saisit à la seconde.
 */

import { charger, enregistrer } from "./stockage.js";
import { num, round, todayISO } from "./dates.js";
import { MOUVEMENTS_FORCE, meilleursMaxis } from "./force.js";

export const CLE_PERFORMANCES = "cn_performances";

export const DISCIPLINES_PERF = [
  { id: "force", label: "Force athlétique", emoji: "🏋️" },
  { id: "halterophilie", label: "Haltérophilie", emoji: "🥇" },
  { id: "course", label: "Course à pied", emoji: "🏃" },
  { id: "natation", label: "Natation", emoji: "🏊" }
];

/**
 * Épreuves saisissables. `type` : "kg" (charge, le plus grand gagne) ou
 * "temps" (secondes, le plus petit gagne). Les bornes refusent une faute
 * de frappe (et un temps plus rapide que le record du monde) ; ce sont
 * les mêmes que celles du serveur (worker/communaute.js).
 */
export const EPREUVES = [
  { id: "halt_arrache", discipline: "halterophilie", label: "Arraché", type: "kg", min: 10, max: 230 },
  { id: "halt_epj", discipline: "halterophilie", label: "Épaulé-jeté", type: "kg", min: 10, max: 280 },
  { id: "course_5k", discipline: "course", label: "5 km", type: "temps", min: 750, max: 7200, km: 5 },
  { id: "course_10k", discipline: "course", label: "10 km", type: "temps", min: 1560, max: 14400, km: 10 },
  { id: "course_semi", discipline: "course", label: "Semi-marathon", type: "temps", min: 3360, max: 21600, km: 21.0975 },
  { id: "course_marathon", discipline: "course", label: "Marathon", type: "temps", min: 7140, max: 43200, km: 42.195 },
  { id: "nat_50nl_25", discipline: "natation", label: "50 m nage libre", bassin: 25, type: "temps", min: 19, max: 300, m: 50 },
  { id: "nat_100nl_25", discipline: "natation", label: "100 m nage libre", bassin: 25, type: "temps", min: 44, max: 600, m: 100 },
  { id: "nat_400nl_25", discipline: "natation", label: "400 m nage libre", bassin: 25, type: "temps", min: 210, max: 1800, m: 400 },
  { id: "nat_50nl_50", discipline: "natation", label: "50 m nage libre", bassin: 50, type: "temps", min: 20, max: 300, m: 50 },
  { id: "nat_100nl_50", discipline: "natation", label: "100 m nage libre", bassin: 50, type: "temps", min: 46, max: 600, m: 100 },
  { id: "nat_400nl_50", discipline: "natation", label: "400 m nage libre", bassin: 50, type: "temps", min: 218, max: 1800, m: 400 }
];

export const epreuveParId = (id) => EPREUVES.find((e) => e.id === id) || null;

/**
 * « 24:35 », « 1:42:10 », « 58,4 » ou « 1'05''2 » → secondes. Rend null si
 * la saisie n'est pas un temps.
 */
export function lireTemps(texte) {
  const t = String(texte ?? "")
    .trim()
    .replace(/''|"/g, ".")
    .replace(/[h']/g, ":")
    .replace(",", ".")
    .replace(/\s+/g, "");
  if (!t) return null;
  if (!/^\d+(:\d{1,2})*(\.\d+)?$/.test(t)) return null;
  const parties = t.split(":");
  if (parties.length > 3) return null;
  let total = 0;
  for (let i = 0; i < parties.length; i++) {
    const v = Number(parties[i]);
    if (!Number.isFinite(v)) return null;
    if (i > 0 && v >= 60) return null;
    total = total * 60 + v;
  }
  return total > 0 ? round(total, 2) : null;
}

/** Secondes → « 24:35 », « 1:42:10 » ou « 58,40 » (natation, moins d'une minute). */
export function fmtTemps(sec) {
  const v = num(sec);
  if (!(v > 0)) return "";
  const centiemes = Math.round(v * 100) % 100;
  const entier = Math.floor(Math.round(v * 100) / 100);
  const h = Math.floor(entier / 3600);
  const m = Math.floor((entier % 3600) / 60);
  const s = entier % 60;
  const cc = centiemes ? "," + String(centiemes).padStart(2, "0") : "";
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  if (m) return `${m}:${String(s).padStart(2, "0")}${cc}`;
  return `${s}${cc || ",00"}`;
}

/** Valeur d'une épreuve vérifiée, ou null. */
export function valeurEpreuve(id, brut) {
  const e = epreuveParId(id);
  if (!e) return null;
  const v = e.type === "temps" ? (typeof brut === "number" ? brut : lireTemps(brut)) : num(String(brut ?? "").replace(",", "."));
  return v >= e.min && v <= e.max ? round(v, 2) : null;
}

export function lirePerformances() {
  const v = charger(CLE_PERFORMANCES, null);
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const propre = {};
  for (const [id, x] of Object.entries(v)) {
    const valeur = x && valeurEpreuve(id, x.valeur);
    if (valeur) propre[id] = { valeur, date: typeof x.date === "string" ? x.date : todayISO(), competition: !!x.competition };
  }
  return propre;
}

/**
 * Enregistre une performance ; une saisie vide l'efface ; une saisie
 * invalide ne touche à rien (une faute de frappe n'efface pas un record).
 * Rend la liste à jour.
 */
export function enregistrerPerformance(id, brut, { date = todayISO(), competition = false } = {}) {
  const toutes = lirePerformances();
  const valeur = valeurEpreuve(id, brut);
  if (valeur) toutes[id] = { valeur, date, competition: !!competition };
  else if (String(brut ?? "").trim() === "") delete toutes[id];
  else return toutes;
  enregistrer(CLE_PERFORMANCES, toutes);
  return toutes;
}

/**
 * Maxis de force retenus : ceux déclarés dans la carte Force athlétique,
 * sinon le meilleur 1RM estimé des séances. Rend { squat, bench, deadlift,
 * total, source } (total seulement si les trois existent).
 */
export function maxisRetenus(maxisDeclares, seances) {
  const estimes = meilleursMaxis(seances || []);
  const sortie = { source: {} };
  for (const l of MOUVEMENTS_FORCE) {
    const d = num((maxisDeclares || {})[l.id]);
    const e = estimes[l.id] ? num(estimes[l.id].est) : 0;
    if (d > 0) {
      sortie[l.id] = d;
      sortie.source[l.id] = "declare";
    } else if (e > 0) {
      sortie[l.id] = e;
      sortie.source[l.id] = "estime";
    }
  }
  if (sortie.squat && sortie.bench && sortie.deadlift) sortie.total = round(sortie.squat + sortie.bench + sortie.deadlift, 1);
  return sortie;
}
