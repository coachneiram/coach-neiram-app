/**
 * Constructeur de seances : logique.
 *
 * Portage de suggestNextLoad, exKey, LIBRARY_NAMES et de la preparation
 * d'une seance (index.html 3205-3290 et 3923-3962).
 *
 * Tout ce qui decide du CONTENU d'une seance vit ici plutot que dans
 * l'ecran, parce que c'est ce qui doit etre teste : une erreur d'arrondi
 * dans la progression de charge ne se voit pas a l'ecran, elle envoie juste
 * un client sur une barre trop lourde.
 */

import { num, round, todayISO } from "./dates.js";
import { uid } from "./semaine.js";
import { rpeFromRIR } from "./force.js";
import {
  DEFAULT_CARDIO_FIELDS,
  EXERCISE_LIBRARY,
  EXERCISE_VIDEOS,
  PL_SET_TYPES,
  PROGRESSION_RULES,
  SEANCE_TEMPLATES
} from "./catalogues.js";

/** Un exercice vide, tel qu'il apparait quand on en ajoute un a la main. */
export const exerciceVide = () => ({
  id: uid(),
  name: "",
  mode: "muscu",
  sets: "",
  reps: "",
  weight: "",
  repUnit: "reps",
  rpe: ""
});

/**
 * Charge suggeree pour la prochaine seance, deduite du ressenti.
 *
 * Le RPE saisi prime ; a defaut, il est deduit des repetitions en reserve.
 * Sans charge ou sans ressenti, aucune suggestion : mieux vaut ne rien
 * proposer qu'extrapoler a partir de rien.
 *
 * L'arrondi au multiple de 2,5 kg n'est pas cosmetique : c'est le plus petit
 * increment realisable avec des disques de salle. Suggerer 41,3 kg serait
 * inapplicable.
 */
export function chargeSuivante(poids, rpe, rir) {
  const w = num(poids);
  if (!(w > 0)) return null;

  const rpeEffectif = rpe !== "" && rpe != null ? num(rpe) : rpeFromRIR(rir);
  if (!rpeEffectif) return null;

  const regle = PROGRESSION_RULES.find((r) => rpeEffectif <= r.maxRpe);
  if (!regle) return null;

  const suivante = round((w * (1 + regle.pct)) / 2.5, 0) * 2.5;
  return { weight: suivante, delta: round(suivante - w, 1), pct: regle.pct, reason: regle.label };
}

/** Nom d'exercice reduit a sa forme comparable (sans accents ni ponctuation). */
export const cleExercice = (nom) =>
  String(nom || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Cles de tous les exercices de la bibliotheque fournie. */
export function nomsBibliotheque() {
  const s = new Set();
  EXERCISE_LIBRARY.forEach((g) => g.items.forEach((it) => s.add(cleExercice(it.name))));
  return s;
}

/** Au-dela, la liste des exercices personnels n'est plus consultable. */
const MAX_EXERCICES_PERSO = 200;

/**
 * Exercices personnels a retenir apres une seance.
 *
 * Un exercice n'est retenu que s'il n'existe ni dans la bibliotheque fournie
 * ni deja dans les exercices personnels : sinon la liste se remplirait de
 * doublons a chaque seance.
 *
 * Les valeurs saisies deviennent les valeurs par defaut de l'exercice : le
 * client qui a fait 3x10 la premiere fois les retrouve pre-remplies.
 */
export function exercicesARetenir(exercices, dejaConnus = []) {
  const biblio = nomsBibliotheque();
  const connus = new Set(dejaConnus.map((x) => cleExercice(x.name)));
  const ajouts = [];

  for (const ex of exercices || []) {
    const nom = String(ex.name || "").trim();
    const k = cleExercice(nom);
    if (!k || biblio.has(k) || connus.has(k)) continue;
    connus.add(k);

    const mode = ex.mode || "muscu";
    const entree = { name: nom, mode, defaults: {} };

    if (mode === "cardio") {
      entree.fields = ex.fields && ex.fields.length ? ex.fields : DEFAULT_CARDIO_FIELDS;
      entree.fields.forEach((f) => {
        if (ex[f] != null && ex[f] !== "") entree.defaults[f] = ex[f];
      });
    } else {
      // `|| undefined` volontaire : une saisie a 0 series n'a pas de sens
      // comme valeur par defaut.
      if (ex.sets !== "" && ex.sets != null) entree.defaults.sets = num(ex.sets) || undefined;
      if (ex.reps !== "" && ex.reps != null) entree.defaults.reps = num(ex.reps) || undefined;
      if (ex.repUnit === "sec") entree.defaults.repUnit = "sec";
      if (mode === "powerlifting" && ex.setType) entree.defaults.setType = ex.setType;
    }
    ajouts.push(entree);
  }
  return ajouts;
}

/** Fusionne les nouveaux exercices personnels avec ceux deja enregistres. */
export function fusionnerExercicesPerso(precedents, exercices) {
  const ajouts = exercicesARetenir(exercices, precedents);
  return ajouts.length ? [...ajouts, ...precedents].slice(0, MAX_EXERCICES_PERSO) : precedents;
}

/**
 * Prepare la seance qui s'ouvre quand le client demarre une seance type.
 *
 * Trois cas, dans cet ordre :
 *
 * 1. UNE SEANCE PRECEDENTE existe : on la reprend, avec les charges
 *    ajustees selon le ressenti de la derniere fois. C'est le coeur de la
 *    progression : le client n'a rien a decider, il retrouve sa seance avec
 *    la charge du jour deja proposee.
 * 2. AUCUNE SEANCE mais un modele du coach : on part de ses exercices, sans
 *    charge (le coach ne connait pas le niveau du client).
 * 3. NI L'UN NI L'AUTRE : une ligne vide.
 */
export function preparerSeance(routine, seances, dateImposee) {
  const precedente = (seances || [])
    .filter((s) => s.routineId === routine.id)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  const modele =
    !precedente && routine.templateId
      ? SEANCE_TEMPLATES.find((t) => t.id === routine.templateId)
      : null;

  let exercices;
  if (precedente?.exercises?.length) {
    exercices = precedente.exercises.map((ex) => {
      // Une suggestion de charge n'a pas de sens en cardio.
      const sug = ex.mode === "cardio" ? null : chargeSuivante(ex.weight, ex.rpe, ex.rir);
      return {
        ...ex,
        id: uid(),
        // Le ressenti se resaisit a chaque seance : le reprendre reviendrait
        // a proposer deux fois la meme progression.
        rpe: "",
        rir: "",
        suggested: null,
        ...(sug
          ? { weight: String(sug.weight), suggested: { from: num(ex.weight), delta: sug.delta, reason: sug.reason } }
          : {})
      };
    });
  } else if (modele) {
    exercices = modele.exercises.map((ex) => ({
      id: uid(),
      name: ex.name,
      mode: ex.mode,
      sets: ex.sets,
      reps: ex.reps,
      weight: "",
      repUnit: ex.repUnit || "reps",
      rpe: ""
    }));
  } else {
    exercices = [exerciceVide()];
  }

  return {
    id: null,
    date: typeof dateImposee === "string" ? dateImposee : todayISO(),
    routineId: routine.id,
    durationMin: modele ? modele.durationMin : "",
    rpe: "",
    notes: modele ? modele.note : "",
    pains: [],
    exercises: exercices
  };
}

/** Exercice cree en le choisissant dans la bibliotheque. */
export function exerciceDepuisBibliotheque(item) {
  return {
    id: uid(),
    name: item.name,
    mode: item.mode,
    sets: "",
    reps: "",
    weight: "",
    ...(item.fields ? { fields: item.fields } : {}),
    ...(item.defaults || {})
  };
}

/**
 * Insere un exercice de la bibliotheque dans la seance en cours.
 *
 * La ligne vide laissee par le formulaire est remplacee plutot que
 * conservee : sinon chaque ajout depuis la bibliotheque laisserait un
 * exercice sans nom au milieu de la seance.
 */
export function ajouterDepuisBibliotheque(exercices, item) {
  const derniere = exercices[exercices.length - 1];
  const conserves = exercices.filter(
    (e) => e.name.trim() || e !== derniere || exercices.length > 1
  );
  return [...conserves, exerciceDepuisBibliotheque(item)];
}

/**
 * Resume d'un exercice, tel qu'il apparait dans l'historique.
 *
 * Portage de fmtExercise (index.html 3800). Chaque mode a sa notation :
 * un cardio se lit en minutes et en vitesse, une serie de musculation en
 * series x repetitions, un mouvement de force avec son type de serie et son
 * pourcentage du maxi.
 */
export function resumeExercice(ex) {
  const mode = ex.mode || "muscu";

  if (mode === "cardio") {
    const morceaux = [];
    if (ex.durationMin) morceaux.push(`${ex.durationMin} min`);
    if (ex.speedKmh) morceaux.push(`${ex.speedKmh} km/h`);
    if (ex.inclinePct) morceaux.push(`${ex.inclinePct} %`);
    if (ex.level) morceaux.push(`niv. ${ex.level}`);
    if (ex.distanceM) morceaux.push(`${ex.distanceM} m`);
    return morceaux.join(" · ") || "—";
  }

  const unite = ex.repUnit === "sec" ? " s" : "";
  // Le RPE prime ; les RIR ne s'affichent qu'en son absence.
  const rpe = ex.rpe ? ` · RPE ${ex.rpe}` : ex.rir !== "" && ex.rir != null ? ` · RIR ${ex.rir}` : "";

  if (mode === "powerlifting") {
    const type = (PL_SET_TYPES.find((t) => t.id === ex.setType) || {}).label;
    const pct = ex.pct1rm ? ` · ${ex.pct1rm}% 1RM` : "";
    return `${type ? type + " — " : ""}${ex.sets || "—"}×${ex.reps || "—"}${ex.weight ? ` @ ${ex.weight} kg` : ""}${pct}${rpe}`;
  }

  // En poids de corps, une charge additionnelle s'ecrit « (+10 kg) ».
  if (mode === "pdc") {
    return `${ex.sets || "—"}×${ex.reps || "—"}${unite} PDC${ex.weight ? ` (+${ex.weight} kg)` : ""}${rpe}`;
  }

  return `${ex.sets || "—"}×${ex.reps || "—"}${unite}${ex.weight ? ` @ ${ex.weight} kg` : ""}${rpe}`;
}

/** Video de demonstration d'un exercice, s'il en a une. */
export const videoExercice = (nom) => EXERCISE_VIDEOS[cleExercice(nom)] || null;
