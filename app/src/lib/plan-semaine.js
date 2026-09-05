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

import { addDays, num } from "./dates.js";
import { JOURS_SEMAINE, dayIdOf, getMonday } from "./semaine.js";
import { MAINTIEN_SLEEP, MAINTIEN_STANDING } from "./catalogues.js";

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

/**
 * Marque, couleur et libelle de chaque statut du programme.
 *
 * La marque compte autant que la couleur : sur un ecran de telephone en
 * plein soleil, un rond gris et un rond vert se ressemblent. La couleur est
 * un NOM de token, pas une valeur, pour que cette table reste utilisable
 * hors du navigateur.
 */
export const META_PLAN = {
  done: { couleur: "good", marque: "✓", texte: "Fait" },
  today: { couleur: "gold", marque: "●", texte: "Aujourd'hui" },
  todo: { couleur: "textMuted", marque: "○", texte: "À venir" },
  missed: { couleur: "bad", marque: "✕", texte: "Manquée" },
  rest: { couleur: "textFaint", marque: "–", texte: "Repos" },
  bonus: { couleur: "blue", marque: "+", texte: "Hors programme" }
};

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

/**
 * Seance maintien d'une semaine difficile.
 *
 * Portage de buildMaintien (index.html 3070).
 *
 * L'idee n'est pas de proposer une bonne seance : c'est de proposer une
 * seance FAISABLE un jour ou le client aurait sinon tout sauté. Moitie du
 * volume, charge inchangee, aucune progression. Sauter une semaine coute
 * bien plus qu'une semaine allegee.
 *
 * Le contenu part de la derniere vraie seance du client sur la routine du
 * jour : des mouvements qu'il connait deja, pas une liste generique. A
 * defaut d'historique, on retombe sur une seance sans materiel.
 */
export function seanceMaintien(routines, seances, plan, aujourdhui, motif) {
  const idRoutine = (plan || {})[dayIdOf(aujourdhui)] || null;

  const candidates = (seances || [])
    .filter(
      (s) =>
        (idRoutine ? s.routineId === idRoutine : true) &&
        (s.exercises || []).length &&
        // Une seance maintien ne sert pas de modele a la suivante.
        !s.maintenance
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const derniere = candidates[0];
  const routine = idRoutine ? (routines || []).find((r) => r.id === idRoutine) : null;

  // Apres une nuit courte, du sol et de la mobilite plutot que du debout.
  const sansMateriel = motif === "sommeil" ? MAINTIEN_SLEEP : MAINTIEN_STANDING;

  const repli = {
    title: motif === "sommeil" ? "Dos et mobilité — 15 à 20 min" : "Circuit maintien — 15 à 20 min",
    items: sansMateriel,
    note:
      motif === "sommeil"
        ? "Aucun matériel nécessaire. RPE 6 maximum. Pensé pour les nuits courtes."
        : "Aucun matériel nécessaire. 45 s de récupération entre les tours, RPE 6 maximum."
  };

  if (!derniere) return repli;

  const items = (derniere.exercises || [])
    .filter((e) => e.name && e.mode !== "cardio")
    .slice(0, 3)
    .map((e) => {
      const reps = num(e.reps);
      // Une seance de force a 3 repetitions n'est pas un format maintien :
      // on repasse en series longues et on allege la charge.
      const lourd = reps > 0 && reps < 6;
      const charge = num(e.weight);
      return {
        name: e.name,
        detail: lourd
          ? "2 séries × 8" +
            (charge ? " · " + Math.round((charge * 0.6) / 2.5) * 2.5 + " kg (charge allégée)" : "") +
            " · RPE 6 max"
          : "2 séries × " +
            (e.reps || "8-10") +
            (e.weight ? " · " + e.weight + " kg (charge inchangée)" : "") +
            " · RPE 6 max"
      };
    });

  if (!items.length) return repli;

  // Moins de 3 exercices dans l'historique : on complete au poids du corps
  // pour tenir les 15 a 20 min annoncees.
  while (items.length < 3) items.push(sansMateriel[items.length]);

  return {
    title: "Maintien" + (routine ? " — " + routine.name : "") + " — 15 à 20 min",
    items,
    note: "Moitié du volume habituel, charge inchangée, aucune progression cette semaine. 60 s de récupération."
  };
}
