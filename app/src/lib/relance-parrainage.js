/**
 * Relance du parrainage : « pense a inviter un ami », au bon moment.
 *
 * Demande du coach (2 octobre 2026), phrase et regle validees par lui :
 *
 * 1. APRES UN TROPHEE QUI VIENT DE SE DEBLOQUER. C'est le moment ou le
 *    client constate un resultat, donc celui ou il en parle. Les 4 semaines
 *    tenues d'affilee sont deja le trophee « 1 mois tenu ». Sauf « Premier
 *    pas » (1re seance, exclu par le coach le 2 octobre 2026) : un client
 *    tout neuf n'a encore aucun resultat a recommander.
 * 2. AU PLUS UNE FOIS TOUTES LES 4 SEMAINES. Une relance quotidienne
 *    agacerait un client qui paie deja ; elle n'est pas non plus melee au
 *    « mot du coach », pour ne pas affaiblir ses phrases de motivation.
 * 3. JAMAIS EN SEMAINE DIFFICILE NI EN REPRISE (memes regles que le mot du
 *    coach, lib/mot-du-coach.js) : on ne demande pas un service a quelqu'un
 *    qui galere.
 * 4. FERMABLE. Fermer la relance ou inviter un ami compte comme « montree » :
 *    la prochaine ne vient pas avant 4 semaines.
 */

import { addDays } from "./dates.js";

export const PHRASE_PARRAINAGE =
  "Bravo pour ce trophée ! Tu connais quelqu'un qui aurait besoin du même déclic ? Invite-le, ton prochain mois te coûtera moins cher.";

/** Delai minimal entre deux relances. */
export const INTERVALLE_JOURS = 28;

/** Date de la derniere relance fermee ou suivie (sauvegardee avec le reste). */
export const CLE_RELANCE_PARRAINAGE = "cn_parrainage_relance";

/** Trophees qui ne declenchent jamais la relance. */
export const TROPHEES_SANS_RELANCE = ["seances-1"];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Faut-il montrer la relance aujourd'hui ?
 *
 * `nouveaux` : trophees obtenus pas encore celebres (« Premier pas » seul ne
 * suffit pas) ; `contexte` : celui de
 * contexteDuJour ; `derniere` : date ISO de la derniere relance, ou rien.
 * Une date illisible compte comme « jamais » : mieux vaut une relance de
 * trop qu'une relance bloquee pour toujours.
 */
export function afficherRelanceParrainage({ nouveaux, contexte, derniere, date }) {
  if (!Array.isArray(nouveaux)) return false;
  if (!nouveaux.some((t) => t && !TROPHEES_SANS_RELANCE.includes(t.id))) return false;
  if (contexte !== "standard") return false;
  if (typeof derniere !== "string" || !ISO.test(derniere)) return true;
  return date >= addDays(derniere, INTERVALLE_JOURS);
}
