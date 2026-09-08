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
 * TECHNIQUES D'INTENSIFICATION disponibles sur un exercice.
 *
 * Jusqu'ici, un superset ou une degressive ne pouvait s'ecrire que dans les
 * notes de la seance, en texte libre. Consequence : rien ne remontait dans
 * le resume d'exercice, rien n'etait comparable d'une semaine sur l'autre,
 * et le client devait se rappeler tout seul quelle paire allait ensemble.
 *
 * Deux techniques, parce que ce sont les deux que Coach Neiram programme :
 *
 * - SUPERSET : deux exercices enchaines sans repos. Il ne suffit pas de
 *   marquer l'exercice, il faut dire AVEC QUI : d'ou le groupe (A, B, C...),
 *   partage par les exercices d'un meme enchainement.
 * - DEGRESSIVE : on continue la serie en baissant la charge. Ce qui compte
 *   sous la barre, c'est le nombre de baisses et de combien — pas le mot.
 *   D'ou deux champs chiffres, et des charges calculees d'avance.
 */
export const TECHNIQUES_SERIE = [
  { id: "superset", label: "Superset" },
  { id: "degressive", label: "Dégressive" }
];

/** Groupes de superset : la lettre qui dit quels exercices s'enchainent. */
export const GROUPES_SUPERSET = ["A", "B", "C", "D"];

/** Valeurs de depart d'une degressive, quand le client vient de la cocher. */
export const DEGRESSIVE_PAR_DEFAUT = { paliers: 2, baissePct: 20 };

/**
 * Charges successives d'une serie degressive.
 *
 * Chaque palier retire `baissePct` % de la charge PRECEDENTE, pas de la
 * charge de depart : une degressive est une cascade, pas une soustraction
 * lineaire. Le resultat est arrondi au multiple de 2,5 kg, comme la
 * progression de charge, et pour la meme raison — c'est le plus petit
 * increment realisable avec des disques de salle.
 *
 * Renvoie une liste vide plutot que null quand il n'y a rien a calculer :
 * l'ecran boucle dessus sans avoir a se proteger.
 */
export function paliersDegressifs(poids, paliers, baissePct) {
  const depart = num(poids);
  const n = Math.min(6, Math.floor(num(paliers)));
  const pct = num(baissePct);
  if (!(depart > 0) || !(n > 0) || !(pct > 0) || pct >= 100) return [];

  const charges = [];
  let courante = depart;
  for (let i = 0; i < n; i++) {
    // Plancher a 2,5 kg : une degressive qui tombe a zero n'est plus une
    // serie, et afficher « 0 kg » sous la barre n'aide personne.
    courante = Math.max(2.5, round((courante * (1 - pct / 100)) / 2.5, 0) * 2.5);
    charges.push(courante);
  }
  return charges;
}

/**
 * Technique d'un exercice, telle qu'elle s'ecrit dans un resume.
 *
 * Chaine vide quand aucune technique n'est posee : les exercices d'avant
 * cette fonctionnalite, et l'immense majorite de ceux d'apres, s'affichent
 * exactement comme avant.
 */
export function resumeTechnique(ex) {
  const technique = ex && ex.technique;
  if (technique === "superset") {
    return ` · superset${ex.supersetGroupe ? " " + ex.supersetGroupe : ""}`;
  }
  if (technique === "degressive") {
    const paliers = num(ex.degressivePaliers);
    const pct = num(ex.degressiveBaissePct);
    return ` · dégressive${paliers ? " ×" + paliers : ""}${pct ? " (-" + pct + " %)" : ""}`;
  }
  return "";
}

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
 * 3. AUCUNE SEANCE, aucun modele, mais des EXERCICES PORTES PAR LA SEANCE
 *    TYPE elle-meme : ce sont ceux importes du Google Sheets du coach. Ils
 *    gardent leur charge, contrairement au cas 2 — le coach a ecrit ces
 *    charges POUR CE CLIENT, c'est tout l'interet de son tableau.
 * 4. RIEN DE TOUT CELA : une ligne vide.
 *
 * Le cas 3 est le seul ajout posterieur a la migration. Il ne s'active que
 * sur une seance type qui porte un tableau `exercises`, champ qui n'existe
 * que sur les seances importees : une seance type creee a la main dans
 * l'application se comporte exactement comme avant.
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
  } else if (routine.exercises?.length) {
    // Le ressenti, lui, ne s'importe pas : un RPE est ce que le client a
    // ressenti, pas ce que le coach a prevu.
    exercices = routine.exercises.map((ex) => ({ ...ex, id: uid(), rpe: ex.rpe || "", rir: "" }));
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

  // La technique se lit en queue de resume, apres le ressenti. Vide tant
  // qu'aucune technique n'est posee : les resumes existants ne bougent pas.
  const technique = resumeTechnique(ex);

  if (mode === "powerlifting") {
    const type = (PL_SET_TYPES.find((t) => t.id === ex.setType) || {}).label;
    const pct = ex.pct1rm ? ` · ${ex.pct1rm}% 1RM` : "";
    return `${type ? type + " — " : ""}${ex.sets || "—"}×${ex.reps || "—"}${ex.weight ? ` @ ${ex.weight} kg` : ""}${pct}${rpe}${technique}`;
  }

  // En poids de corps, une charge additionnelle s'ecrit « (+10 kg) ».
  if (mode === "pdc") {
    return `${ex.sets || "—"}×${ex.reps || "—"}${unite} PDC${ex.weight ? ` (+${ex.weight} kg)` : ""}${rpe}${technique}`;
  }

  return `${ex.sets || "—"}×${ex.reps || "—"}${unite}${ex.weight ? ` @ ${ex.weight} kg` : ""}${rpe}${technique}`;
}

/** Video de demonstration d'un exercice, s'il en a une. */
export const videoExercice = (nom) => EXERCISE_VIDEOS[cleExercice(nom)] || null;
