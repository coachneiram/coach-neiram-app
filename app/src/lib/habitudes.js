/**
 * Habitudes du quotidien (« mode de vie ») : quelques petites actions
 * choisies, cochees chaque jour dans le Journal, avec leur serie.
 *
 * Pourquoi de petites habitudes : une habitude devient automatique en 66
 * jours en mediane (de 18 a 254, Lally et al. 2010, Eur J Soc Psychol), et
 * un oubli isole ne casse pas le processus. D'ou le JOKER : une journee
 * manquee est pardonnee, un joker gagne tous les 7 jours tenus (2 au plus),
 * comme les « gels » de serie de Duolingo.
 *
 * Repris de l'app Neiram le 24/10/2026. Dans l'app coach, tout est
 * inclus : jusqu'a 10 habitudes, et le taux de reussite sur 30 jours pour
 * tous. Les habitudes suivies partent dans le bilan envoye au coach
 * (lib/habitudes-bilan.js).
 *
 * Etat : « cn_habitudes » = { choisies: [id], perso: [{ id, label, emoji }],
 *   coches: { "2026-10-24": [id] } }.
 */

import { addDays, todayISO } from "./dates.js";

export const CLE_HABITUDES = "cn_habitudes";
export const HABITUDES_MAX = 10;

export const CATEGORIES_HABITUDES = [
  { id: "mouvement", label: "Bouger" },
  { id: "nutrition", label: "Manger" },
  { id: "sommeil", label: "Dormir" },
  { id: "mental", label: "Mental" }
];

export const CATALOGUE_HABITUDES = [
  { id: "marche-repas", emoji: "🚶", label: "10 min de marche après un repas", categorie: "mouvement", pourquoi: "Baisse le pic de glycémie après le repas (Buffey 2022)." },
  { id: "lever-heure", emoji: "🧍", label: "Me lever toutes les heures", categorie: "mouvement", pourquoi: "Couper le temps assis améliore glycémie et tension (Duran 2023)." },
  { id: "escaliers", emoji: "🪜", label: "Prendre les escaliers", categorie: "mouvement", pourquoi: "Quelques minutes intenses par jour comptent (Stamatakis 2022)." },
  { id: "pas-7000", emoji: "👟", label: "Faire 7 000 pas", categorie: "mouvement", pourquoi: "Le gros du bénéfice santé arrive vers 7 000 pas (Ding 2025)." },
  { id: "mobilite", emoji: "🙆", label: "5 min d'étirements ou de mobilité", categorie: "mouvement", pourquoi: "Garde l'amplitude des articulations, surtout après une journée assise." },
  { id: "eau-reveil", emoji: "💧", label: "Un grand verre d'eau au réveil", categorie: "nutrition", pourquoi: "Une habitude d'ancrage simple pour mieux s'hydrater." },
  { id: "legumes", emoji: "🥦", label: "Des légumes à chaque repas", categorie: "nutrition", pourquoi: "Fibres et volume : plus de satiété pour moins de calories." },
  { id: "proteines-matin", emoji: "🍳", label: "Des protéines au petit-déjeuner", categorie: "nutrition", pourquoi: "Mieux répartir les protéines aide la satiété et les muscles." },
  { id: "sans-soda", emoji: "🚫", label: "Pas de boisson sucrée", categorie: "nutrition", pourquoi: "Les calories liquides rassasient peu (OMS : sucres libres < 10 %)." },
  { id: "sans-alcool", emoji: "🍃", label: "Journée sans alcool", categorie: "nutrition", pourquoi: "Moins d'alcool : meilleur sommeil et moins de grignotage." },
  { id: "manger-lentement", emoji: "🍽️", label: "Manger sans écran, lentement", categorie: "nutrition", pourquoi: "Manger en pleine conscience aide à sentir la satiété." },
  { id: "coucher-fixe", emoji: "🛏️", label: "Me coucher à heure fixe", categorie: "sommeil", pourquoi: "La régularité du sommeil compte autant que sa durée." },
  { id: "sans-ecran", emoji: "📵", label: "Pas d'écran 30 min avant de dormir", categorie: "sommeil", pourquoi: "Moins de stimulation et de lumière le soir, endormissement plus facile." },
  { id: "lumiere-matin", emoji: "☀️", label: "10 min de lumière du jour le matin", categorie: "sommeil", pourquoi: "La lumière du matin cale l'horloge interne." },
  { id: "respiration", emoji: "🌬️", label: "5 min de respiration calme", categorie: "mental", pourquoi: "Réduit le stress ressenti, une des causes du grignotage." },
  { id: "gratitude", emoji: "✍️", label: "Noter 3 choses positives", categorie: "mental", pourquoi: "Un exercice simple de psychologie positive (Seligman 2005)." },
  { id: "lecture", emoji: "📖", label: "Lire 10 pages", categorie: "mental", pourquoi: "Un moment pour soi, loin des écrans." },
  { id: "nature", emoji: "🌳", label: "Un moment dehors, dans la nature", categorie: "mental", pourquoi: "2 h par semaine dans la nature sont liées à un meilleur bien-être (White 2019)." }
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function normaliserHabitudes(brut) {
  const e = brut && typeof brut === "object" ? brut : {};
  const perso = (Array.isArray(e.perso) ? e.perso : [])
    .filter((p) => p && typeof p.id === "string" && p.id.startsWith("perso-") && typeof p.label === "string" && p.label.trim())
    .map((p) => ({ id: p.id, label: p.label.trim().slice(0, 50), emoji: typeof p.emoji === "string" ? p.emoji.slice(0, 4) : "✨", categorie: "mental" }));
  const connus = new Set([...CATALOGUE_HABITUDES.map((h) => h.id), ...perso.map((p) => p.id)]);
  const choisies = [...new Set((Array.isArray(e.choisies) ? e.choisies : []).filter((id) => connus.has(id)))].slice(0, HABITUDES_MAX);
  const coches = {};
  for (const [d, ids] of Object.entries(e.coches && typeof e.coches === "object" ? e.coches : {})) {
    if (ISO.test(d) && Array.isArray(ids)) coches[d] = [...new Set(ids.filter((id) => typeof id === "string"))];
  }
  return { choisies, perso, coches };
}

export const habitudeParId = (etat, id) =>
  CATALOGUE_HABITUDES.find((h) => h.id === id) || normaliserHabitudes(etat).perso.find((p) => p.id === id) || null;

/** Habitudes actives : toutes les choisies (10 au plus). */
export function habitudesActives(etat) {
  const e = normaliserHabitudes(etat);
  return e.choisies.slice(0, HABITUDES_MAX).map((id) => habitudeParId(e, id)).filter(Boolean);
}

export function peutAjouter(etat) {
  return normaliserHabitudes(etat).choisies.length < HABITUDES_MAX;
}

export function choisir(etat, id, actif) {
  const e = normaliserHabitudes(etat);
  const choisies = actif ? [...new Set([...e.choisies, id])] : e.choisies.filter((x) => x !== id);
  return normaliserHabitudes({ ...e, choisies });
}

export function ajouterPerso(etat, label, emoji = "✨") {
  const e = normaliserHabitudes(etat);
  const nom = String(label || "").trim();
  if (nom.length < 2) return e;
  const id = "perso-" + Date.now().toString(36);
  return normaliserHabitudes({ ...e, perso: [...e.perso, { id, label: nom, emoji }], choisies: [...e.choisies, id] });
}

export const estCochee = (etat, date, id) => (normaliserHabitudes(etat).coches[date] || []).includes(id);

export function basculer(etat, date, id) {
  const e = normaliserHabitudes(etat);
  const jour = e.coches[date] || [];
  const coches = { ...e.coches, [date]: jour.includes(id) ? jour.filter((x) => x !== id) : [...jour, id] };
  if (!coches[date].length) delete coches[date];
  return { ...e, coches };
}

/**
 * Serie d'une habitude au jour `date`, jokers compris. Aujourd'hui pas
 * encore coche ne casse pas la serie (la journee n'est pas finie).
 * Rend { jours, jokersUtilises, jokersDispo }.
 */
export function serie(etat, id, date = todayISO()) {
  const e = normaliserHabitudes(etat);
  const fait = (d) => (e.coches[d] || []).includes(id);
  // On rejoue la periode dans l'ordre pour savoir combien de jokers
  // etaient disponibles a chaque oubli.
  const premier = Object.keys(e.coches).filter((d) => fait(d)).sort()[0];
  if (!premier) return { jours: 0, jokersUtilises: 0, jokersDispo: 0 };
  let jours = 0;
  let jokers = 0;
  let utilises = 0;
  let consecutifs = 0;
  for (let d = premier; d <= date; d = addDays(d, 1)) {
    if (fait(d)) {
      jours++;
      consecutifs++;
      if (consecutifs % 7 === 0) jokers = Math.min(2, jokers + 1);
    } else if (d === date) {
      // aujourd'hui : rien a dire encore
    } else if (jokers > 0) {
      jokers--;
      utilises++;
      consecutifs = 0;
    } else {
      jours = 0;
      utilises = 0;
      consecutifs = 0;
    }
  }
  return { jours, jokersUtilises: utilises, jokersDispo: jokers };
}

/** Taux de reussite sur N jours (aujourd'hui compris). */
export function taux(etat, id, date = todayISO(), n = 30) {
  const e = normaliserHabitudes(etat);
  let faits = 0;
  for (let i = 0; i < n; i++) if ((e.coches[addDays(date, -i)] || []).includes(id)) faits++;
  return Math.round((faits / n) * 100);
}

/** Meilleure serie, toutes habitudes confondues (trophees « Habitudes »). */
export function meilleureSerie(etat, date = todayISO()) {
  const e = normaliserHabitudes(etat);
  const ids = new Set(Object.values(e.coches).flat());
  let best = 0;
  for (const id of ids) {
    // La meilleure serie historique : on la cherche a chaque fin de serie.
    const dates = Object.keys(e.coches).filter((d) => e.coches[d].includes(id)).sort();
    for (const d of dates) best = Math.max(best, serie(e, id, d).jours);
  }
  return best;
}
