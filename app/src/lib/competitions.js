/**
 * Mes compétitions (15 novembre 2026, demande d'une cliente : « il n'y a pas
 * d'espace où on peut mettre compétition par compétition »).
 *
 * « Mes performances » ne gardait que le meilleur chiffre de chaque épreuve.
 * Ce journal garde chaque compétition avec sa date, son nom et ses
 * résultats, par discipline :
 *
 *  - force athlétique : squat, développé couché, soulevé de terre (le total
 *    se calcule quand les trois sont notés) ;
 *  - haltérophilie : arraché, épaulé-jeté ;
 *  - course : 5 km, 10 km, semi, marathon ;
 *  - natation : 50, 100 et 400 m nage libre, bassin de 25 m ou de 50 m.
 *
 * Les résultats d'une compétition ne remplacent jamais un meilleur chiffre :
 * ils ne mettent à jour « Mes performances » que s'ils font mieux
 * (recordsBattus). Les bornes sont celles de « Mes performances » : une
 * faute de frappe est refusée, jamais corrigée en silence.
 *
 * Données : localStorage « cn_competitions », donc dans la sauvegarde. Rien
 * ne part automatiquement vers le coach ni vers la communauté ; les
 * dernières compétitions figurent dans le bilan que le client envoie
 * (lib/performances-bilan.js).
 */

import { charger, enregistrer } from "./stockage.js";
import { num, round, todayISO } from "./dates.js";
import { MOUVEMENTS_FORCE } from "./force.js";
import { EPREUVES, enregistrerPerformance, maxisRetenus, valeurEpreuve } from "./performances.js";

export const CLE_COMPETITIONS = "cn_competitions";

/** Au-delà, une faute de manipulation plutôt qu'un historique. */
export const MAX_COMPETITIONS = 200;
export const NOM_MAX = 60;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DISCIPLINES = ["force", "halterophilie", "course", "natation"];

const BORNES_FORCE = { squat: [20, 600], bench: [10, 400], deadlift: [20, 500] };

/** Mouvements de force athlétique, au même format que EPREUVES. */
export const EPREUVES_FORCE = MOUVEMENTS_FORCE.map((m) => ({
  id: m.id,
  discipline: "force",
  label: m.label,
  type: "kg",
  min: BORNES_FORCE[m.id][0],
  max: BORNES_FORCE[m.id][1]
}));

/** Les épreuves qu'on peut noter pour une discipline (et, en natation, un bassin). */
export function epreuvesCompetition(discipline, bassin = 25) {
  if (discipline === "force") return EPREUVES_FORCE;
  return EPREUVES.filter((e) => e.discipline === discipline && (discipline !== "natation" || e.bassin === bassin));
}

const toutesLesEpreuves = () => [...EPREUVES_FORCE, ...EPREUVES];
export const epreuveCompetition = (id) => toutesLesEpreuves().find((e) => e.id === id) || null;

/** Valeur vérifiée d'un résultat (kg ou secondes), ou null. */
export function valeurCompetition(id, brut) {
  const forceMouvement = EPREUVES_FORCE.find((e) => e.id === id);
  if (forceMouvement) {
    const v = num(String(brut ?? "").replace(",", "."));
    return v >= forceMouvement.min && v <= forceMouvement.max ? round(v, 2) : null;
  }
  return valeurEpreuve(id, brut);
}

/** Total force athlétique d'une compétition : seulement si les trois mouvements sont notés. */
export function totalForce(resultats) {
  const r = resultats || {};
  if (!(r.squat > 0 && r.bench > 0 && r.deadlift > 0)) return null;
  return round(r.squat + r.bench + r.deadlift, 1);
}

function proprete(c) {
  if (!c || typeof c !== "object") return null;
  const discipline = DISCIPLINES.includes(c.discipline) ? c.discipline : null;
  const nom = typeof c.nom === "string" ? c.nom.trim().slice(0, NOM_MAX) : "";
  if (!discipline || !nom || typeof c.id !== "string" || !ISO.test(c.date || "")) return null;
  const resultats = {};
  // Natation : les deux bassins se lisent ; la saisie choisit lequel.
  const permises = discipline === "natation" ? EPREUVES.filter((e) => e.discipline === "natation") : epreuvesCompetition(discipline);
  for (const e of permises) {
    const v = c.resultats && valeurCompetition(e.id, c.resultats[e.id]);
    if (v) resultats[e.id] = v;
  }
  if (!Object.keys(resultats).length) return null;
  return { id: c.id, nom, date: c.date, discipline, resultats };
}

/** Compétitions enregistrées, de la plus récente à la plus ancienne. */
export function lireCompetitions() {
  const v = charger(CLE_COMPETITIONS, null);
  if (!Array.isArray(v)) return [];
  return v
    .map(proprete)
    .filter(Boolean)
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
}

/**
 * Vérifie une saisie sans rien enregistrer.
 *
 *   saisie : { nom, date, discipline, resultats: { idEpreuve: "texte" } }
 *
 * Rend { ok: true, competition } ou { ok: false, erreur, invalides }.
 * erreur : « nom », « date », « discipline », « vide » (aucun résultat) ou
 * « valeur » (un champ rempli n'est pas lisible : `invalides` les nomme).
 */
export function verifierCompetition(saisie, { aujourdhui = todayISO(), id = null } = {}) {
  const s = saisie || {};
  const nom = String(s.nom ?? "").trim().slice(0, NOM_MAX);
  if (!DISCIPLINES.includes(s.discipline)) return { ok: false, erreur: "discipline", invalides: [] };
  if (!nom) return { ok: false, erreur: "nom", invalides: [] };
  if (!ISO.test(s.date || "") || s.date > aujourdhui) return { ok: false, erreur: "date", invalides: [] };

  const resultats = {};
  const invalides = [];
  for (const [epreuve, brut] of Object.entries(s.resultats || {})) {
    if (String(brut ?? "").trim() === "") continue;
    const permise = epreuveCompetition(epreuve);
    const v = permise && permise.discipline === s.discipline ? valeurCompetition(epreuve, brut) : null;
    if (v) resultats[epreuve] = v;
    else invalides.push(epreuve);
  }
  if (invalides.length) return { ok: false, erreur: "valeur", invalides };
  if (!Object.keys(resultats).length) return { ok: false, erreur: "vide", invalides: [] };
  return {
    ok: true,
    competition: { id: id || `comp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, nom, date: s.date, discipline: s.discipline, resultats }
  };
}

/** Ajoute une compétition vérifiée. Rend { ok, erreur, invalides, competition, liste }. */
export function ajouterCompetition(saisie, options) {
  const v = verifierCompetition(saisie, options);
  if (!v.ok) return v;
  const liste = [v.competition, ...lireCompetitions()].slice(0, MAX_COMPETITIONS);
  enregistrer(CLE_COMPETITIONS, liste);
  return { ...v, liste: lireCompetitions() };
}

/** Supprime une compétition ; les meilleures performances ne bougent pas. Rend la liste à jour. */
export function supprimerCompetition(id) {
  const reste = lireCompetitions().filter((c) => c.id !== id);
  enregistrer(CLE_COMPETITIONS, reste);
  return reste;
}

/**
 * Résultats de la compétition qui font mieux que les meilleures
 * performances actuelles (celles de « Mes performances » : maxis déclarés ou
 * estimés en force). Rend [{ id, label, type, ancien (ou null), nouveau }].
 */
export function recordsBattus(competition, { perfs = {}, maxisForce = {}, seances = [] } = {}) {
  const maxis = maxisRetenus(maxisForce, seances);
  const records = [];
  for (const [id, nouveau] of Object.entries((competition && competition.resultats) || {})) {
    const e = epreuveCompetition(id);
    if (!e) continue;
    const ancien = e.discipline === "force" ? num(maxis[id]) || null : perfs[id] ? perfs[id].valeur : null;
    const mieux = ancien == null || (e.type === "temps" ? nouveau < ancien : nouveau > ancien);
    if (mieux) records.push({ id, label: e.label, type: e.type, discipline: e.discipline, ancien, nouveau });
  }
  return records;
}

/**
 * Applique les records battus : les maxis de force passent par la carte
 * Force athlétique (`definirMaxiForce`), le reste par « Mes performances »
 * (marqué comme fait en compétition).
 */
export function appliquerRecords(records, date, definirMaxiForce) {
  for (const r of records) {
    if (r.discipline === "force") {
      if (typeof definirMaxiForce === "function") definirMaxiForce(r.id, String(r.nouveau));
    } else {
      enregistrerPerformance(r.id, r.nouveau, { date, competition: true });
    }
  }
}
