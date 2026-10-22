/**
 * « Ta séance du jour » et séance type programmée (22 octobre 2026).
 *
 * Demande du coach : rendre l'onglet Séances évident pour un débutant.
 * En ouvrant l'onglet, un débutant tombait sur un écran entier de
 * trophées, et le geste du jour (commencer sa séance) était deux écrans
 * plus bas. Il doit être la première chose visible, avec UNE séance
 * proposée, pas une liste à choisir.
 */

import { JOURS_SEMAINE, dayIdOf } from "./semaine.js";
import { addDays } from "./dates.js";

/**
 * Séance à proposer aujourd'hui.
 *
 * Dans l'ordre :
 * 1. une séance déjà faite aujourd'hui → « faite » (on ne pousse pas à en
 *    refaire une) ;
 * 2. une séance type prévue aujourd'hui dans le programme → « prevue » ;
 * 3. un programme existe mais rien n'est prévu aujourd'hui → « repos »,
 *    avec la prochaine séance prévue ;
 * 4. des séances types sans programme → « rotation » : celle qui n'a pas
 *    été faite depuis le plus longtemps (jamais faite d'abord, dans l'ordre
 *    de la liste). Un débutant qui alterne A et B n'a rien à retenir ;
 * 5. aucune séance type → « vide ».
 */
export function seanceDuJour(routines, seances, plan, aujourdhui) {
  const liste = routines || [];
  const toutes = seances || [];
  const parId = (id) => liste.find((r) => r.id === id) || null;

  const prevue = parId((plan || {})[dayIdOf(aujourdhui)]);
  const faitesAujourdhui = toutes.filter((s) => s.date === aujourdhui);
  if (faitesAujourdhui.length) {
    const seance = (prevue && faitesAujourdhui.find((s) => s.routineId === prevue.id)) || faitesAujourdhui[0];
    return { etat: "faite", routine: parId(seance.routineId), seance };
  }
  if (prevue) return { etat: "prevue", routine: prevue, derniere: derniereDate(toutes, prevue.id) };

  const programme = Object.values(plan || {}).some((id) => parId(id));
  if (programme) {
    for (let k = 1; k <= 7; k++) {
      const date = addDays(aujourdhui, k);
      const r = parId(plan[dayIdOf(date)]);
      if (r) {
        const jour = JOURS_SEMAINE.find((j) => j.id === dayIdOf(date));
        return { etat: "repos", prochaine: { routine: r, jour: jour ? jour.label : "", date } };
      }
    }
  }

  if (!liste.length) return { etat: "vide" };

  let choisie = null;
  let plusAncienne = null;
  for (const r of liste) {
    const d = derniereDate(toutes, r.id);
    if (!d) return { etat: "rotation", routine: r, derniere: null };
    if (plusAncienne === null || d < plusAncienne) {
      plusAncienne = d;
      choisie = r;
    }
  }
  return { etat: "rotation", routine: choisie, derniere: plusAncienne };
}

/** Date de la dernière séance faite sur cette séance type, ou null. */
export function derniereDate(seances, idRoutine) {
  let d = null;
  for (const s of seances || []) if (s.routineId === idRoutine && s.date && (!d || s.date > d)) d = s.date;
  return d;
}

/**
 * Exercices annoncés d'une séance type : ceux programmés, sinon ceux de la
 * dernière séance faite. Liste de noms, pour un aperçu.
 */
export function exercicesAnnonces(routine, seances) {
  if (!routine) return [];
  if (Array.isArray(routine.exercises) && routine.exercises.length) {
    return routine.exercises.map((e) => e.name).filter(Boolean);
  }
  const derniere = (seances || [])
    .filter((s) => s.routineId === routine.id)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return ((derniere && derniere.exercises) || []).map((e) => e.name).filter(Boolean);
}

/** Aperçu court : « Squat · Développé couché · Rowing · +2 ». */
export function apercuExercices(noms, max = 3) {
  if (!noms.length) return "";
  const reste = noms.length - max;
  return noms.slice(0, max).join(" · ") + (reste > 0 ? ` · +${reste}` : "");
}

/**
 * Textes de la carte et du mode simple.
 *
 * Rangés ici plutôt qu'écrits dans l'écran : ils sont nouveaux par
 * construction (l'ancienne application n'avait ni séance du jour ni
 * séance type programmable).
 */
export const TEXTES_DEBUTANT = {
  titre: "Ta séance du jour",
  prevue: "Prévue aujourd'hui",
  rotation: "À faire aujourd'hui",
  derniereFois: "Dernière fois",
  jamaisFaite: "Jamais faite : c'est parti",
  demarrer: "Démarrer",
  faite: "Séance faite aujourd'hui ✓",
  faiteDetail: "Récupère bien. Tu peux la modifier dans ton historique, plus bas.",
  autre: "Faire une autre séance",
  repos: "Repos aujourd'hui",
  prochaine: "Prochaine séance",
  quandMeme: "M'entraîner quand même",
  vide: "Commence ici : crée ta première séance en choisissant tes exercices. Tu les retrouveras prêts à chaque entraînement.",
  creer: "Créer ma première séance",
  // Séance type programmée.
  exercicesRoutine: "Exercices de la séance",
  routineSansExercice: "Ajoute les exercices que tu feras à chaque fois. Les charges se notent pendant la séance.",
  ajouterExercice: "Ajouter un exercice",
  seriesReps: "séries ×",
  supprimerRoutine: "Supprimer cette séance type",
  confirmerSuppression: "Supprimer cette séance type ? Tes séances déjà faites restent dans l'historique.",
  monter: "Monter",
  retirer: "Retirer",
  // Mode simple dans la séance.
  options: "Options",
  masquerOptions: "Masquer les options",
  aideRpe: "RPE = difficulté de la série sur 10. 10 : impossible d'en faire une de plus. 8 : il t'en restait 2. 7 : il t'en restait 3.",
  details: "Détails de la séance",
  chercher: "Cherche ou tape ton exercice",
  rienTrouve: "Aucun exercice de la liste ne correspond : appuie sur Ajouter pour le créer."
};
