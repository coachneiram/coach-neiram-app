/**
 * L'ecole Neiram : une micro-lecon par jour (contenu : lib/lecons-contenu.js).
 *
 * Inspire de Noom (lecons de psychologie du changement) : un essai
 * randomise finance par Noom montre une perte moyenne de 4 % a 68 semaines
 * contre une legere prise sans programme (chiffre de l'editeur). L'interet
 * pour Neiram : expliquer le POURQUOI des habitudes, en 2 minutes par jour.
 *
 * Repris de l'app Neiram le 24/10/2026. Dans l'app coach, les 28 lecons
 * sont incluses.
 * Etat : « cn_lecons » = { faites: { id: date }, reponses: { id: index } }.
 */

import { todayISO } from "./dates.js";
import { LECONS } from "./lecons-contenu.js";

export const CLE_LECONS = "cn_lecons";
export { LECONS };

export function normaliserLecons(brut) {
  const e = brut && typeof brut === "object" ? brut : {};
  const ids = new Set(LECONS.map((l) => l.id));
  const faites = {};
  for (const [id, d] of Object.entries(e.faites && typeof e.faites === "object" ? e.faites : {})) if (ids.has(id) && typeof d === "string") faites[id] = d;
  const reponses = {};
  for (const [id, r] of Object.entries(e.reponses && typeof e.reponses === "object" ? e.reponses : {})) if (ids.has(id) && Number.isInteger(r)) reponses[id] = r;
  return { faites, reponses };
}

export const leconsFaites = (etat) => Object.keys(normaliserLecons(etat).faites).length;

/**
 * Lecon du jour : la premiere non faite, une seule nouvelle par jour (on ne
 * devore pas le programme en une soiree, l'habitude compte plus que le
 * contenu). Si la lecon du jour est deja faite, elle reste affichee.
 */
export function leconDuJour(etat, aujourdhui = todayISO()) {
  const e = normaliserLecons(etat);
  const faiteAujourdhui = LECONS.find((l) => e.faites[l.id] === aujourdhui);
  if (faiteAujourdhui) return { lecon: faiteAujourdhui, faite: true };
  const prochaine = LECONS.find((l) => !e.faites[l.id]);
  return prochaine ? { lecon: prochaine, faite: false } : { lecon: null, faite: true, termine: true };
}

export function repondre(etat, id, index, aujourdhui = todayISO()) {
  const e = normaliserLecons(etat);
  return { faites: { ...e.faites, [id]: e.faites[id] || aujourdhui }, reponses: { ...e.reponses, [id]: index } };
}
