/**
 * « Mes déclics » : ce qui va avec une meilleure journée, d'après tes
 * propres données (inspiré des « Behavior Insights » de Whoop et des tags
 * d'Oura). Pour chaque comportement, on compare la moyenne d'une mesure les
 * jours AVEC et les jours SANS, sur 90 jours.
 *
 * Prudence statistique : au moins 5 jours de chaque côté, un écart
 * minimal pour en parler, et toujours la formule « va avec » : c'est une
 * association dans TES données, pas une preuve de cause.
 *
 * Repris de l'app Neiram le 24/10/2026, inclus pour tous dans l'app coach.
 * Les principaux declics partent dans le bilan envoye au coach.
 */

import { addDays, num, round, todayISO } from "./dates.js";
import { CLE_HABITUDES, habitudeParId, normaliserHabitudes } from "./habitudes.js";

export const JOURS_MIN = 5;
export const FENETRE = 90;

const MESURES = [
  { id: "energy", label: "ton énergie", unite: "/5", seuil: 0.4, sens: 1, lire: (f) => (num(f.energy) > 0 ? num(f.energy) : null) },
  { id: "stress", label: "ton stress", unite: "/10", seuil: 0.8, sens: -1, lire: (f) => (f.stress != null && f.stress !== "" ? num(f.stress) : null) },
  { id: "sleepHours", label: "ton sommeil", unite: " h", seuil: 0.3, sens: 1, lire: (f) => (num(f.sleepHours) > 0 ? num(f.sleepHours) : null) }
];

/** Ecart de moyenne d'une mesure entre jours avec / sans un comportement. */
export function ecart(jours, avec, mesure) {
  const a = [];
  const s = [];
  for (const j of jours) {
    const v = mesure.lire(j.form || {});
    if (v == null) continue;
    (avec(j) ? a : s).push(v);
  }
  if (a.length < JOURS_MIN || s.length < JOURS_MIN) return null;
  const moy = (l) => l.reduce((x, y) => x + y, 0) / l.length;
  return { avec: round(moy(a), 1), sans: round(moy(s), 1), diff: round(moy(a) - moy(s), 1), nAvec: a.length, nSans: s.length };
}

/**
 * Jours des 90 derniers jours : { date, form, seance, pas, habitudes }.
 * Le sommeil d'une date est celui de la nuit qui la precede : il va donc
 * avec la journee d'avant pour « je m'entraine → je dors mieux ».
 */
export function joursAnalyses({ journal = [], seances = [], habitudes = null, date = todayISO() }) {
  const parDate = new Map((journal || []).filter((f) => f && f.date).map((f) => [f.date, f]));
  const seancesParDate = new Set((seances || []).filter((s) => s && s.date).map((s) => s.date));
  const h = normaliserHabitudes(habitudes);
  const jours = [];
  for (let i = 0; i < FENETRE; i++) {
    const d = addDays(date, -i);
    const form = parDate.get(d);
    if (!form) continue;
    const lendemain = parDate.get(addDays(d, 1));
    jours.push({ date: d, form, nuitSuivante: lendemain || null, seance: seancesParDate.has(d), pas: num(form.steps), habitudes: h.coches[d] || [] });
  }
  return jours;
}

const fmt = (x) => String(Math.abs(x)).replace(".", ",");

/** Les declics les plus nets, en phrases. */
export function declics({ journal, seances, habitudes, date = todayISO() }, max = 4) {
  const jours = joursAnalyses({ journal, seances, habitudes, date });
  const comportements = [
    { label: "Les jours où tu t'entraînes", avec: (j) => j.seance },
    { label: "Les jours à 7 000 pas et plus", avec: (j) => j.pas >= 7000, filtre: (j) => j.pas > 0 },
    { label: "Après une nuit de 7 h et plus", avec: (j) => num(j.form.sleepHours) >= 7, filtre: (j) => num(j.form.sleepHours) > 0, sauf: "sleepHours" },
    ...normaliserHabitudes(habitudes).choisies.map((id) => {
      const hab = habitudeParId(habitudes, id);
      return { label: `Les jours où tu coches « ${hab ? hab.label : id} »`, avec: (j) => j.habitudes.includes(id) };
    })
  ];
  const trouves = [];
  for (const c of comportements) {
    const base = c.filtre ? jours.filter(c.filtre) : jours;
    for (const m of MESURES) {
      if (c.sauf === m.id) continue;
      // Le sommeil d'un comportement se lit la nuit suivante.
      const liste = m.id === "sleepHours" ? base.filter((j) => j.nuitSuivante).map((j) => ({ ...j, form: j.nuitSuivante })) : base;
      const e = ecart(liste, c.avec, m);
      if (!e || Math.abs(e.diff) < m.seuil) continue;
      const mieux = e.diff * m.sens > 0;
      const quoi = m.id === "sleepHours" ? "tu dors" : m.label;
      const phrase =
        m.id === "sleepHours"
          ? `${c.label}, ${quoi} ${fmt(e.diff)} h de ${e.diff > 0 ? "plus" : "moins"} la nuit suivante.`
          : `${c.label}, ${m.label} est ${e.diff > 0 ? "plus haut" : "plus bas"} de ${fmt(e.diff)} point${Math.abs(e.diff) >= 2 ? "s" : ""}.`;
      trouves.push({ phrase, mieux, force: Math.abs(e.diff) / m.seuil, detail: `${e.nAvec} jours avec, ${e.nSans} sans` });
    }
  }
  return trouves.sort((a, b) => b.force - a.force).slice(0, max);
}

export { CLE_HABITUDES };
