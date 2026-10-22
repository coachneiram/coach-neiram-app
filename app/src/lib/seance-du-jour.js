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
  vide: "Commence ici : prends le programme débutant du coach, ou crée ta propre séance en choisissant tes exercices.",
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

/**
 * Programme débutant en salle, validé par le coach le 22 octobre 2026.
 *
 * Deux séances full body en alternance : A puis B à deux séances par
 * semaine, A-B-A puis B-A-B à trois. La rotation de « Ta séance du jour »
 * fait l'alternance sans que le client ait à la retenir.
 *
 * Repos : 1 min 30 sur les exercices polyarticulaires, 1 min sur le reste.
 * RPE 7 maximum les 4 premières semaines (règle du coach).
 *
 * Les noms sont ceux de la bibliothèque, à l'identique : c'est ce qui relie
 * la charge d'une séance à la suivante. tests/seance-du-jour.test.mjs le
 * vérifie.
 */
export const PROGRAMME_DEBUTANT_SALLE = [
  {
    id: "salle-debutant-a",
    name: "Full body A",
    color: "#2DD4BF",
    description: "Débutant salle · RPE 7 max les 4 premières semaines",
    exercises: [
      { name: "Presse à cuisses", sets: 3, reps: 10, repos: 90 },
      { name: "Développé poitrine machine", sets: 3, reps: 10, repos: 90 },
      { name: "Tirage vertical poitrine", sets: 3, reps: 10, repos: 90 },
      { name: "Leg curl assis", sets: 2, reps: 12, repos: 60 },
      { name: "Élévations latérales machine", sets: 2, reps: 12, repos: 60 },
      { name: "Gainage planche", sets: 3, reps: 30, repUnit: "sec", repos: 60 }
    ]
  },
  {
    id: "salle-debutant-b",
    name: "Full body B",
    color: "#F0A050",
    description: "Débutant salle · RPE 7 max les 4 premières semaines",
    exercises: [
      { name: "Squat goblet", sets: 3, reps: 10, repos: 90 },
      { name: "Tirage horizontal assis", sets: 3, reps: 10, repos: 90 },
      { name: "Développé épaules machine", sets: 3, reps: 10, repos: 90 },
      { name: "Hip thrust machine", sets: 3, reps: 10, repos: 90 },
      { name: "Crunch machine", sets: 2, reps: 15, repos: 60 },
      { name: "Gainage latéral", sets: 2, reps: 20, repUnit: "sec", repos: 60 }
    ]
  }
];

/**
 * Séances types du programme débutant pas encore ajoutées, prêtes à
 * enregistrer. Reconnues par leur `templateId` : appuyer deux fois ne crée
 * pas de doublon. Le type d'exercice vient de la bibliothèque.
 */
export function seancesProgrammeDebutant(routines, bibliotheque, uid) {
  const deja = new Set((routines || []).map((r) => r.templateId).filter(Boolean));
  const modeDe = (nom) => {
    for (const g of bibliotheque || []) {
      const it = g.items.find((x) => x.name === nom);
      if (it) return it.mode || "muscu";
    }
    return "muscu";
  };
  return PROGRAMME_DEBUTANT_SALLE.filter((p) => !deja.has(p.id)).map((p) => ({
    name: p.name,
    description: p.description,
    color: p.color,
    templateId: p.id,
    programme: true,
    exercises: p.exercises.map((e) => ({
      id: uid(),
      name: e.name,
      mode: modeDe(e.name),
      sets: e.sets,
      reps: e.reps,
      ...(e.repUnit ? { repUnit: e.repUnit } : {}),
      repos: e.repos
    }))
  }));
}

/** Textes de l'offre du programme débutant. */
export const TEXTES_PROGRAMME = {
  prendre: "Prendre le programme débutant du coach",
  detail: "2 séances en salle (Full body A et B) à faire en alternance, prêtes avec séries, répétitions et repos.",
  creerMienne: "Créer ma propre séance",
  ajoute: "Programme ajouté : ta séance du jour est prête.",
  bouton: "Programme débutant du coach"
};
