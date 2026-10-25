/**
 * Smart Coach (validé par le coach le 25 octobre 2026) : alertes de poids
 * et de nutrition, calculées sur le téléphone du client.
 *
 * Fonctions pures : aucune lecture de stockage, aucun envoi. Le moteur
 * (lib/moteur-alertes.js) les appelle, en coaching en ligne seulement.
 *
 * CE QUI PART CHEZ LE COACH : une tendance, en une phrase. Jamais la liste
 * des pesées, jamais le détail des repas, jamais le motif d'une exclusion
 * de santé (grossesse, allaitement, trouble alimentaire, âge) : un profil
 * exclu ne déclenche simplement pas l'alerte de stagnation.
 */

import { addDays, avg, num } from "./dates.js";

const MS_PAR_JOUR = 864e5;

/* ------------------------------------------------------------- POIDS */

/** Écart entre la moyenne des 7 derniers jours et celle des 7 précédents. */
export const VARIATION_POIDS_PCT = 2;
/** En phase de perte : baisse minimale attendue en 3 semaines. */
export const STAGNATION_BAISSE_MIN_KG = 0.2;
/** Pesées minimales par fenêtre de 7 jours : en dessous, une moyenne ne dit rien. */
export const PESEES_MIN_PAR_SEMAINE = 2;
/** Au plus une alerte de chaque sorte (variation, stagnation) tous les 14 jours. */
export const CARENCE_ALERTE_POIDS_JOURS = 14;

/** Poids des pesées comprises entre debut et fin (inclus). */
function poidsEntre(pesees, debut, fin) {
  return (pesees || [])
    .filter((p) => p && typeof p.date === "string" && p.date >= debut && p.date <= fin && num(p.weightKg) > 0)
    .map((p) => num(p.weightKg));
}

/**
 * Fenêtre de 7 jours glissants n° k avant aujourd'hui (0 = les 7 derniers
 * jours, aujourd'hui compris ; 1 = les 7 précédents…). Glissante plutôt que
 * calendaire : une pesée du lundi ne change pas de semaine selon le jour
 * où l'on regarde.
 */
const fenetre = (aujourdhui, k) => ({ debut: addDays(aujourdhui, -7 * k - 6), fin: addDays(aujourdhui, -7 * k) });

function moyenneFenetre(pesees, aujourdhui, k) {
  const { debut, fin } = fenetre(aujourdhui, k);
  const poids = poidsEntre(pesees, debut, fin);
  return poids.length >= PESEES_MIN_PAR_SEMAINE ? avg(poids) : null;
}

/**
 * Variation brutale : rend { pct } (signé, en %) quand la moyenne des
 * 7 derniers jours s'écarte de plus de 2 % de celle des 7 précédents,
 * sinon null (pas assez de pesées, ou variation normale).
 */
export function variationPoids(pesees, aujourdhui) {
  const recente = moyenneFenetre(pesees, aujourdhui, 0);
  const precedente = moyenneFenetre(pesees, aujourdhui, 1);
  if (recente == null || precedente == null) return null;
  const pct = ((recente - precedente) / precedente) * 100;
  return Math.abs(pct) > VARIATION_POIDS_PCT ? { pct } : null;
}

/**
 * Stagnation : au moins 2 pesées dans chacune des 3 dernières fenêtres de
 * 7 jours (21 jours), et la moyenne des 7 derniers jours n'a pas baissé de
 * plus de 0,2 kg par rapport à celle de la fenêtre qui commençait il y a
 * 3 semaines. Rend true ou false.
 */
export function stagnationPoids(pesees, aujourdhui) {
  const moyennes = [0, 1, 2].map((k) => moyenneFenetre(pesees, aujourdhui, k));
  if (moyennes.some((m) => m == null)) return false;
  const baisse = moyennes[2] - moyennes[0];
  return baisse <= STAGNATION_BAISSE_MIN_KG;
}

const nombreFr = (n, decimales = 0) =>
  Number(n)
    .toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    .replace(/\s/g, " ");

export const MESSAGE_STAGNATION_POIDS = "Poids stable depuis 3 semaines en phase de perte";

export const messageVariationPoids = (pct) => `Variation de ${pct > 0 ? "+" : "-"}${nombreFr(Math.abs(pct), 1)} % en une semaine`;

function carenceEcoulee(etat, maintenant, jours) {
  const dernier = etat && etat.lastAt ? new Date(etat.lastAt).getTime() : 0;
  return maintenant.getTime() - dernier >= jours * MS_PAR_JOUR;
}

/**
 * Alertes de poids à envoyer maintenant : [{ sousType, niveau, message }].
 * `stagnationSurveillee` : oui ou non, calculé par lib/eligibilite-perte.js
 * (objectif perte, aucune exclusion de santé) — ce fichier ne lit aucune
 * réponse de santé. `etat` : { variation: { lastAt }, stagnation: { lastAt } }.
 */
export function decisionAlertesPoids({ pesees, stagnationSurveillee, aujourdhui, maintenant, etat }) {
  const e = etat || {};
  const alertes = [];
  const variation = variationPoids(pesees, aujourdhui);
  if (variation && carenceEcoulee(e.variation, maintenant, CARENCE_ALERTE_POIDS_JOURS)) {
    alertes.push({ sousType: "variation", niveau: "attention", message: messageVariationPoids(variation.pct) });
  }
  if (stagnationSurveillee && stagnationPoids(pesees, aujourdhui) && carenceEcoulee(e.stagnation, maintenant, CARENCE_ALERTE_POIDS_JOURS)) {
    alertes.push({ sousType: "stagnation", niveau: "info", message: MESSAGE_STAGNATION_POIDS });
  }
  return alertes;
}

/* --------------------------------------------------------- NUTRITION */

/** Jours complets regardés : les 7 derniers, sans aujourd'hui. */
export const NUTRITION_JOURS = 7;
/** Jours notés (au moins un repas) nécessaires pour juger. */
export const NUTRITION_JOURS_NOTES_MIN = 5;
/** Jours hors cible qui déclenchent l'alerte. */
export const NUTRITION_JOURS_HORS_CIBLE = 5;
/** Calories : hors cible au-delà de 15 % (au-dessus ou en dessous). */
export const ECART_CALORIES = 0.15;
/** Protéines : hors cible sous 80 % de la cible. */
export const PROTEINES_MIN = 0.8;
/** Au plus une alerte tous les 7 jours. */
export const CARENCE_ALERTE_NUTRITION_JOURS = 7;

/**
 * Bilan des 7 derniers jours complets, jours notés seulement. Les cibles
 * sont celles que l'application affiche (computeTargets), sans recalcul.
 * Rend null sans cible de calories ni de protéines.
 */
export function analyseNutrition({ repas, cibles, aujourdhui }) {
  const cibleKcal = num(cibles && cibles.calories);
  const cibleProt = num(cibles && cibles.protein);
  if (!(cibleKcal > 0) && !(cibleProt > 0)) return null;
  const debut = addDays(aujourdhui, -NUTRITION_JOURS);
  const fin = addDays(aujourdhui, -1);
  const parJour = new Map();
  for (const r of repas || []) {
    if (!r || typeof r.date !== "string" || r.date < debut || r.date > fin) continue;
    const t = parJour.get(r.date) || { calories: 0, protein: 0 };
    t.calories += num(r.calories);
    t.protein += num(r.protein);
    parJour.set(r.date, t);
  }
  const jours = [...parJour.values()];
  let horsCible = 0;
  let caloriesHors = 0;
  let proteinesHors = 0;
  for (const j of jours) {
    const kcal = cibleKcal > 0 && Math.abs(j.calories - cibleKcal) / cibleKcal > ECART_CALORIES;
    const prot = cibleProt > 0 && j.protein < PROTEINES_MIN * cibleProt;
    if (kcal) caloriesHors++;
    if (prot) proteinesHors++;
    if (kcal || prot) horsCible++;
  }
  return {
    joursNotes: jours.length,
    horsCible,
    caloriesHors,
    proteinesHors,
    moyenneKcal: jours.length ? avg(jours.map((j) => j.calories)) : null,
    moyenneProteines: jours.length ? avg(jours.map((j) => j.protein)) : null,
    cibleKcal: cibleKcal > 0 ? cibleKcal : null,
    cibleProteines: cibleProt > 0 ? cibleProt : null
  };
}

/** Une phrase par écart marqué (au moins 3 jours), la plus fréquente d'abord. */
export function messageAlerteNutrition(a) {
  const parties = [];
  if (a.caloriesHors > 0 && a.cibleKcal) {
    parties.push({ n: a.caloriesHors, texte: `Calories hors cible ${a.caloriesHors} jours sur ${a.joursNotes} (moyenne ${nombreFr(Math.round(a.moyenneKcal))} kcal pour ${nombreFr(Math.round(a.cibleKcal))})` });
  }
  if (a.proteinesHors > 0 && a.cibleProteines) {
    parties.push({ n: a.proteinesHors, texte: `Protéines sous 80 % de la cible ${a.proteinesHors} jours sur ${a.joursNotes} (moyenne ${nombreFr(Math.round(a.moyenneProteines))} g pour ${nombreFr(Math.round(a.cibleProteines))})` });
  }
  parties.sort((x, y) => y.n - x.n);
  return parties.filter((p, i) => i === 0 || p.n >= 3).map((p) => p.texte).join(" ; ");
}

/**
 * Faut-il alerter ? Au plus un contrôle par jour (etat.jour), au plus une
 * alerte tous les 7 jours (etat.lastAt). Rend { verifier, alerter, message, raison } :
 * `verifier` dit si le contrôle du jour a eu lieu (le moteur note alors le jour).
 */
export function decisionAlerteNutrition({ repas, cibles, aujourdhui, maintenant, etat }) {
  const non = (raison, verifier = true) => ({ verifier, alerter: false, raison });
  if (etat && etat.jour === aujourdhui) return non("deja verifie aujourd'hui", false);
  const a = analyseNutrition({ repas, cibles, aujourdhui });
  if (!a) return non("pas de cible");
  if (a.joursNotes < NUTRITION_JOURS_NOTES_MIN) return non("pas assez de jours notes");
  if (a.horsCible < NUTRITION_JOURS_HORS_CIBLE) return non("dans la cible");
  if (!carenceEcoulee(etat, maintenant, CARENCE_ALERTE_NUTRITION_JOURS)) return non("carence non ecoulee");
  return { verifier: true, alerter: true, raison: "a signaler", message: messageAlerteNutrition(a) };
}
