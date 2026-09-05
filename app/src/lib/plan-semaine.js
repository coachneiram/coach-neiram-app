/**
 * Programme de la semaine et semaines difficiles.
 *
 * Portage fidele de index.html : weekPlanStatus (~2905), weekPlanSummary
 * (~2925), hardWeekOf et isHardWeek (3077).
 *
 * La notion de « semaine difficile » est une soupape assumee : le client
 * declare que la semaine a ete compliquee (maladie, charge de travail,
 * enfants), et le bilan cesse de lui reprocher ses seances manquees. Sans
 * elle, l'application devient punitive exactement quand il faudrait qu'elle
 * ne le soit pas.
 */

import { addDays } from "./dates.js";
import { JOURS_SEMAINE, getMonday } from "./semaine.js";

export const RAISONS_SEMAINE_DIFFICILE = [
  { id: "sommeil", label: "Sommeil / fatigue" },
  { id: "travail", label: "Charge de travail" },
  { id: "famille", label: "Enfants / famille" },
  { id: "sante", label: "Maladie / douleur" },
  { id: "autre", label: "Autre" }
];

/**
 * Etat de chaque jour de la semaine, en croisant le programme prevu et les
 * seances reellement enregistrees.
 *
 * Une seance faite un jour de repos n'est pas une erreur : elle compte en
 * « bonus ». Et un jour prevu n'est « manque » qu'une fois passe — pas le
 * jour meme, ou il reste toute la journee pour s'y mettre.
 */
export function etatPlanSemaine(plan, routines, seances, aujourdhui) {
  const lundi = getMonday(aujourdhui);
  return JOURS_SEMAINE.map((j, k) => {
    const date = addDays(lundi, k);
    const idRoutine = (plan || {})[j.id] || null;
    const routine = idRoutine ? (routines || []).find((r) => r.id === idRoutine) || null : null;
    const faites = (seances || []).filter((s) => s.date === date);
    const correspondante = idRoutine ? faites.find((s) => s.routineId === idRoutine) : null;

    let status;
    if (!routine) status = faites.length ? "bonus" : "rest";
    else if (correspondante) status = "done";
    else if (date < aujourdhui) status = "missed";
    else if (date === aujourdhui) status = "today";
    else status = "todo";

    return { ...j, date, routine, status, extra: faites.length, isToday: date === aujourdhui };
  });
}

/**
 * Compte des jours prevus, faits, manques et restants.
 *
 * Le Math.max(0, ...) est defensif et, en l'etat, inatteignable : « done »
 * et « missed » ne sont attribues qu'a des jours ayant une routine, donc
 * leur somme ne peut pas depasser le nombre de jours prevus. Il est
 * conserve tel quel — c'est ce que fait l'application actuelle, et le
 * retirer economiserait sept caracteres contre le risque d'afficher un
 * nombre negatif le jour ou les statuts evolueront.
 */
export function bilanPlanSemaine(lignes) {
  const prevus = lignes.filter((r) => r.routine).length;
  const faits = lignes.filter((r) => r.status === "done").length;
  const manques = lignes.filter((r) => r.status === "missed").length;
  return { prevus, faits, manques, restants: Math.max(0, prevus - faits - manques) };
}

export const semaineDifficileDe = (semainesDifficiles, cleSemaine) =>
  (semainesDifficiles && semainesDifficiles[cleSemaine]) || null;

export const estSemaineDifficile = (semainesDifficiles, cleSemaine) => {
  const e = semaineDifficileDe(semainesDifficiles, cleSemaine);
  return !!(e && e.active);
};

/** Libelle lisible de la raison declaree, ou la valeur brute a defaut. */
export function raisonSemaineDifficile(entree) {
  if (!entree || !entree.active) return null;
  const trouvee = RAISONS_SEMAINE_DIFFICILE.find((r) => r.id === entree.reason);
  return (trouvee && trouvee.label) || entree.reason || null;
}
