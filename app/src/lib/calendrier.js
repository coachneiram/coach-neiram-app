/**
 * Calendrier de l'annee : chaque jour ou l'on s'est entraine, colore selon
 * le nombre de seances. On peut aussi COCHER un jour a la main (« pointage
 * ») : une seance sans detail, comme dans l'app coach, pour ceux qui ne
 * notent pas leurs series ou qui rattrapent un oubli.
 *
 * Inspire du « Year in Sport » de Strava et du calendrier de Hevy : voir
 * l'annee se remplir motive, et l'image se partage en story.
 */

import { addDays, todayISO } from "./dates.js";

export const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
export const JOURS_COURTS = ["L", "M", "M", "J", "V", "S", "D"];

/** Seance d'un pointage (jour coche dans le calendrier, sans detail). */
export const estPointage = (s) => !!(s && s.pointage);

export const seancePointage = (date) => ({ date, pointage: true, exercises: [], durationMin: "", rpe: "", notes: "" });

/** Nombre de seances par date, pour une annee. */
export function seancesParJour(seances, annee) {
  const par = {};
  const debut = `${annee}-01-01`;
  const fin = `${annee}-12-31`;
  for (const s of seances || []) {
    if (!s || !s.date || s.date < debut || s.date > fin) continue;
    par[s.date] = (par[s.date] || 0) + 1;
  }
  return par;
}

/** Cases d'un mois : null avant le 1er (pour aligner sur lundi), puis les dates. */
export function grilleMois(annee, mois) {
  const premier = new Date(annee, mois, 1);
  const decalage = (premier.getDay() + 6) % 7;
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const cases = Array(decalage).fill(null);
  for (let j = 1; j <= nbJours; j++) cases.push(`${annee}-${String(mois + 1).padStart(2, "0")}-${String(j).padStart(2, "0")}`);
  return cases;
}

const lundiDe = (date) => {
  const j = new Date(date + "T12:00:00");
  return addDays(date, -((j.getDay() + 6) % 7));
};

/** Chiffres de l'annee : seances, jours actifs, meilleur mois, plus longue serie de semaines. */
export function statsAnnee(seances, annee, { objectifParSemaine = 0 } = {}) {
  const par = seancesParJour(seances, annee);
  const dates = Object.keys(par).sort();
  const total = Object.values(par).reduce((a, b) => a + b, 0);
  const parMois = Array(12).fill(0);
  for (const d of dates) parMois[Number(d.slice(5, 7)) - 1] += par[d];
  const max = Math.max(...parMois);
  const meilleurMois = max > 0 ? parMois.indexOf(max) : null;
  // Plus longue serie de semaines consecutives avec au moins une seance.
  const semaines = [...new Set(dates.map(lundiDe))].sort();
  let serie = 0;
  let meilleure = 0;
  let precedente = null;
  for (const l of semaines) {
    serie = precedente && addDays(precedente, 7) === l ? serie + 1 : 1;
    meilleure = Math.max(meilleure, serie);
    precedente = l;
  }
  const objectifAnnee = objectifParSemaine > 0 ? Math.round(objectifParSemaine * 52) : null;
  return {
    annee,
    total,
    joursActifs: dates.length,
    parMois,
    meilleurMois,
    meilleureSerieSemaines: meilleure,
    objectifAnnee,
    pctObjectif: objectifAnnee ? Math.min(100, Math.round((total / objectifAnnee) * 100)) : null
  };
}

/** Intensite de la case (0 a 3) selon le nombre de seances du jour. */
export const niveauCase = (n) => (!n ? 0 : n === 1 ? 1 : n === 2 ? 2 : 3);

/**
 * Cocher / decocher un jour. Rend { ajouter } ou { retirer: [ids] }, ou
 * null : un jour futur ne se coche pas, et un jour qui a de vraies seances
 * ne se decoche pas ici (elles se suppriment dans l'historique).
 */
export function basculerJour(seances, date, aujourdhui = todayISO()) {
  if (!date || date > aujourdhui) return null;
  const duJour = (seances || []).filter((s) => s && s.date === date);
  if (!duJour.length) return { ajouter: seancePointage(date) };
  if (duJour.every(estPointage)) return { retirer: duJour.map((s) => s.id) };
  return null;
}

/** Plus grand nombre de seances dans une meme annee civile (badge). */
export function meilleureAnnee(seances) {
  const par = {};
  for (const s of seances || []) if (s && s.date) par[s.date.slice(0, 4)] = (par[s.date.slice(0, 4)] || 0) + 1;
  return Math.max(0, ...Object.values(par));
}
