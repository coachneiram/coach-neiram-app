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
import { fmtRPE, rpeFromRIR } from "./force.js";
import { aSeriesSaisies, appliquerCharge, avecSeries, resumeSeries, serieRemplie } from "./series.js";
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
export const FAMILLES_TECHNIQUE = [
  { id: "temps", label: "Gagner du temps" },
  { id: "charge", label: "Charge et intensité" },
  { id: "controle", label: "Contrôle du mouvement" },
  { id: "special", label: "Méthodes spéciales" }
];

export const TECHNIQUES_SERIE = [
  {
    id: "superset",
    label: "Superset",
    famille: "temps",
    groupe: true,
    description: "Deux exercices enchaînés sans repos, idéalement des muscles opposés (pectoraux/dos). Repos après le bloc.",
    preuve: "B — volume conservé, séance plus courte, effort perçu plus élevé (Zhang et al., Sports Med 2025)."
  },
  {
    id: "triset",
    label: "Tri-set / série géante",
    famille: "temps",
    groupe: true,
    description: "Trois exercices ou plus enchaînés sans repos, puis repos après le bloc.",
    preuve: "C — extrapolé des supersets : gain de temps, fatigue plus marquée."
  },
  {
    id: "circuit",
    label: "Circuit",
    famille: "temps",
    groupe: true,
    description: "Stations enchaînées avec peu de repos, plusieurs tours. Travaille aussi le cardio.",
    preuve: "B — effets modérés sur la force et le VO2max."
  },
  {
    id: "degressive",
    label: "Dégressive (drop set)",
    famille: "temps",
    description: "Après la série, on baisse la charge et on continue sans repos.",
    preuve: "A — même prise de muscle que des séries classiques, en 54 à 70 % de temps en moins (Sødal et al. 2023 ; Coleman et al. 2022)."
  },
  {
    id: "rest-pause",
    label: "Rest-pause",
    famille: "temps",
    description: "Série proche de l'échec, courte pause, puis quelques répétitions de plus, plusieurs fois.",
    preuve: "B — résultats égaux ou légèrement meilleurs, en moins de temps (Prestes 2019 ; Enes 2021).",
    params: [
      { cle: "miniSeries", label: "Mini-séries", min: 1, max: 5, defaut: 2 },
      { cle: "pauseS", label: "Pause (s)", min: 5, max: 60, pas: 5, defaut: 15 }
    ]
  },
  {
    id: "myo-reps",
    label: "Myo-reps",
    famille: "temps",
    description: "Une série d'activation proche de l'échec, puis des mini-séries de 3 à 5 répétitions séparées de 3 à 5 respirations.",
    preuve: "C — pas d'essai dédié ; logique proche du rest-pause.",
    params: [
      { cle: "miniReps", label: "Rép. par mini-série", min: 2, max: 8, defaut: 4 },
      { cle: "miniSeries", label: "Mini-séries", min: 1, max: 6, defaut: 4 }
    ]
  },
  {
    id: "top-set",
    label: "Top set + back-off",
    famille: "charge",
    description: "Une série lourde, puis des séries plus légères avec la charge réduite.",
    preuve: "B — mode d'autorégulation : aussi efficace que les % fixes (Hickmott et al. 2022).",
    params: [
      { cle: "backoff", label: "Séries back-off", min: 1, max: 6, defaut: 3 },
      { cle: "baissePct", label: "Baisse (%)", min: 5, max: 40, pas: 5, defaut: 10 }
    ]
  },
  {
    id: "pyramide",
    label: "Pyramide",
    famille: "charge",
    description: "La charge monte et les répétitions baissent à chaque série (ou l'inverse).",
    preuve: "B — ni meilleure ni moins bonne que des séries à charge fixe (Angleri 2017) : question de préférence.",
    params: [{ cle: "sens", label: "Sens", type: "choix", options: [["montante", "Montante"], ["descendante", "Descendante"]], defaut: "montante" }]
  },
  {
    id: "cluster",
    label: "Cluster",
    famille: "charge",
    description: "Courtes pauses à l'intérieur de la série (ex. 2 répétitions, 20 s, 2 répétitions…).",
    preuve: "A — mêmes gains qu'en séries classiques avec moins de fatigue et une vitesse de barre mieux conservée (Davies et al., Sports Med 2021).",
    params: [
      { cle: "repsBloc", label: "Rép. par bloc", min: 1, max: 6, defaut: 2 },
      { cle: "pauseS", label: "Pause (s)", min: 5, max: 60, pas: 5, defaut: 20 }
    ]
  },
  {
    id: "echec",
    label: "Jusqu'à l'échec",
    famille: "charge",
    description: "Dernière série menée jusqu'à ne plus pouvoir faire une répétition propre.",
    preuve: "A — la prise de muscle augmente près de l'échec ; la force progresse aussi bien à 1-3 répétitions en réserve (Robinson et al. 2024). À réserver aux exercices sûrs.",
    params: []
  },
  {
    id: "amrap",
    label: "AMRAP",
    famille: "charge",
    description: "Autant de répétitions que possible sur la dernière série, ou de tours dans un temps donné.",
    preuve: "C — pratique de terrain ; utile comme test de progression.",
    params: [{ cle: "minutes", label: "Temps (min, 0 = série)", min: 0, max: 60, defaut: 0 }]
  },
  {
    id: "emom",
    label: "EMOM",
    famille: "charge",
    description: "Les répétitions prévues au début de chaque minute, le reste de la minute en repos.",
    preuve: "C — pratique de terrain (cross-training) ; densité de travail élevée.",
    params: [{ cle: "minutes", label: "Minutes", min: 2, max: 60, defaut: 10 }]
  },
  {
    id: "tempo",
    label: "Tempo",
    famille: "controle",
    description: "Durées imposées : descente - pause en bas - montée - pause en haut (ex. 3-1-1-0).",
    preuve: "A — de 0,5 à 8 s par répétition, la prise de muscle est similaire (Schoenfeld 2015) : utile pour la technique, pas indispensable.",
    params: [{ cle: "tempo", label: "Tempo", type: "texte", defaut: "3-1-1-0" }]
  },
  {
    id: "excentrique",
    label: "Excentrique lente / accentuée",
    famille: "controle",
    description: "Descente lente et contrôlée, ou charge plus lourde à la descente qu'à la montée.",
    preuve: "B — gains de force surtout ; réduit le risque de blessure aux ischios (Nordic).",
    params: [{ cle: "descenteS", label: "Descente (s)", min: 2, max: 10, defaut: 4 }]
  },
  {
    id: "isometrie",
    label: "Isométrie (gainage, tenue)",
    famille: "controle",
    description: "Position tenue sans mouvement, à un angle donné.",
    preuve: "A pour la tension artérielle (baisse d'environ 8/4 mmHg, Edwards et al., BJSM 2023) ; B pour la force (Lum & Barbosa 2019).",
    params: [{ cle: "tenueS", label: "Tenue (s)", min: 5, max: 180, pas: 5, defaut: 30 }]
  },
  {
    id: "partielles",
    label: "Partielles en étirement",
    famille: "controle",
    description: "Répétitions partielles dans la partie où le muscle est le plus étiré, seules ou après les répétitions complètes.",
    preuve: "B — l'amplitude complète reste la base ; les partielles en étirement font au moins aussi bien (Wolf et al. 2023).",
    params: [{ cle: "repsPartielles", label: "Partielles ajoutées", min: 0, max: 15, defaut: 5 }]
  },
  {
    id: "bfr",
    label: "Occlusion (BFR)",
    famille: "special",
    description: "Charge légère (20-40 % du max) avec un brassard qui limite le retour veineux. Schéma classique 30-15-15-15 répétitions.",
    preuve: "A — prise de muscle proche des charges lourdes, force un peu moindre (Patterson 2019 ; de Queiros 2024). À éviter en cas de troubles circulatoires ou de grossesse ; avis médical conseillé.",
    params: [{ cle: "pression", label: "Pression (% occlusion)", min: 40, max: 80, pas: 5, defaut: 50 }]
  }
];

export const techniqueParId = (id) => TECHNIQUES_SERIE.find((t) => t.id === id) || null;

/** Reglages par defaut d'une technique (objet vide si aucun). */
export function parametresParDefaut(id) {
  const t = techniqueParId(id);
  const p = {};
  for (const r of (t && t.params) || []) p[r.cle] = r.defaut;
  return p;
}

/**
 * Charges des series back-off apres un top set : une seule baisse depuis
 * la charge du top set, arrondie a 2,5 kg.
 */
export function chargeBackoff(poids, baissePct) {
  const w = num(poids);
  const pct = num(baissePct);
  if (!(w > 0) || !(pct > 0) || pct >= 100) return null;
  return Math.max(2.5, round((w * (1 - pct / 100)) / 2.5, 0) * 2.5);
}

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
  if (!technique || (ex && ex.mode === "cardio")) return "";
  if (technique === "superset" || technique === "triset" || technique === "circuit") {
    const nom = { superset: "superset", triset: "tri-set", circuit: "circuit" }[technique];
    return ` · ${nom}${ex.supersetGroupe ? " " + ex.supersetGroupe : ""}`;
  }
  if (technique === "degressive") {
    const paliers = num(ex.degressivePaliers);
    const pct = num(ex.degressiveBaissePct);
    return ` · dégressive${paliers ? " ×" + paliers : ""}${pct ? " (-" + pct + " %)" : ""}`;
  }
  const p = ex.techniqueParams || {};
  const n = (k) => num(p[k]);
  switch (technique) {
    case "rest-pause":
      return ` · rest-pause${n("miniSeries") ? " +" + n("miniSeries") : ""}${n("pauseS") ? " (" + n("pauseS") + " s)" : ""}`;
    case "myo-reps":
      return ` · myo-reps${n("miniSeries") ? " " + n("miniSeries") + "×" + (n("miniReps") || "?") : ""}`;
    case "top-set": {
      const kg = chargeBackoff(ex.weight, p.baissePct);
      return ` · top set + ${n("backoff") || "?"} back-off${kg ? " @ " + kg + " kg" : n("baissePct") ? " (-" + n("baissePct") + " %)" : ""}`;
    }
    case "pyramide":
      return ` · pyramide ${p.sens === "descendante" ? "descendante" : "montante"}`;
    case "cluster":
      return ` · cluster${n("repsBloc") ? " " + n("repsBloc") + " rép." : ""}${n("pauseS") ? " / " + n("pauseS") + " s" : ""}`;
    case "echec":
      return " · jusqu'à l'échec";
    case "amrap":
      return ` · AMRAP${n("minutes") ? " " + n("minutes") + " min" : ""}`;
    case "emom":
      return ` · EMOM${n("minutes") ? " " + n("minutes") + " min" : ""}`;
    case "tempo": {
      const t = String(p.tempo || "").trim();
      return /^[0-9xX]{1,2}(-[0-9xX]{1,2}){3}$/.test(t) ? ` · tempo ${t}` : " · tempo";
    }
    case "excentrique":
      return ` · excentrique${n("descenteS") ? " " + n("descenteS") + " s" : ""}`;
    case "isometrie":
      return ` · isométrie${n("tenueS") ? " " + n("tenueS") + " s" : ""}`;
    case "partielles":
      return ` · partielles${n("repsPartielles") ? " +" + n("repsPartielles") : ""}`;
    case "bfr":
      return ` · BFR${n("pression") ? " " + n("pression") + " %" : ""}`;
    default:
      return "";
  }
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

/**
 * Exercice tape par le client dans la bibliotheque (« Ton exercice n'est pas
 * dans la liste ? »), demande du coach du 2 octobre 2026.
 *
 * Si le nom correspond deja a un exercice de la bibliotheque ou a un de ses
 * exercices personnels (accents et majuscules ignores), c'est celui-la qui
 * est repris, avec ses valeurs par defaut : pas de doublon « squat » a cote
 * de « Squat ». Sinon, un exercice de musculation a son nom. Rend null pour
 * un nom vide.
 */
export function exerciceTape(nom, perso = []) {
  const propre = String(nom || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const k = cleExercice(propre);
  if (!k) return null;
  for (const g of EXERCISE_LIBRARY) {
    const trouve = g.items.find((it) => cleExercice(it.name) === k);
    if (trouve) return trouve;
  }
  const connu = (perso || []).find((x) => x && cleExercice(x.name) === k);
  if (connu) return connu;
  return { name: propre, mode: "muscu", defaults: {} };
}

/**
 * Bibliotheque filtree par ce que le client tape (22 octobre 2026).
 *
 * Dix-huit groupes a faire defiler au telephone : le champ « Nom de ton
 * exercice » sert aussi de recherche. Chaque mot tape doit apparaitre dans
 * le nom, accents et majuscules ignores (« dev couche » trouve « Développé
 * couché barre »). Les groupes vides disparaissent.
 */
export function filtrerBibliotheque(groupes, recherche) {
  const mots = cleExercice(recherche).split(" ").filter(Boolean);
  if (!mots.length) return groupes;
  return groupes
    .map((g) => ({ ...g, items: g.items.filter((it) => mots.every((m) => cleExercice(it.name).includes(m))) }))
    .filter((g) => g.items.length);
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

  const date = typeof dateImposee === "string" ? dateImposee : todayISO();

  let exercices;
  if (routine.programme && routine.exercises?.length) {
    // Seance type programmee par le client (22 octobre 2026) : la liste
    // d'exercices est celle du programme, pas celle de la derniere fois.
    exercices = routine.exercises.map((p) => exerciceProgramme(p, seances, date));
  } else if (precedente?.exercises?.length) {
    exercices = precedente.exercises.map((ex) => {
      // Une suggestion de charge n'a pas de sens en cardio.
      const sug = ex.mode === "cardio" ? null : chargeSuivante(ex.weight, ex.rpe, ex.rir);
      const repris = {
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
      if (!aSeriesSaisies(ex)) return repris;
      // Series reprises une a une, a refaire : non cochees, sans ressenti,
      // et la charge proposee posee sur les series faites a la charge de
      // reference. Les champs agreges suivent, sauf le ressenti (vide).
      const series = ex.series
        .filter(serieRemplie)
        .map((s) => ({ weight: s.weight ?? "", reps: s.reps ?? "", rpe: "", fait: false }));
      const ajustees = sug ? appliquerCharge(series, ex.weight, sug.weight) : series;
      return { ...repris, ...avecSeries(ajustees), rpe: "" };
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
    date,
    routineId: routine.id,
    durationMin: modele ? modele.durationMin : "",
    rpe: "",
    notes: modele ? modele.note : "",
    pains: [],
    exercises: exercices
  };
}

/**
 * Exercice d'une seance type programmee, pret a faire.
 *
 * Series et repetitions viennent du programme. La charge vient de la
 * derniere fois que l'exercice a ete fait, quelle que soit la seance type
 * (un squat reste un squat), ajustee selon le ressenti : c'est la meme
 * progression que pour une seance reprise. Jamais fait : la charge du
 * programme s'il en porte une (import du coach), sinon rien.
 */
export function exerciceProgramme(p, seances, date) {
  const { series, ...prog } = p;
  const base = { ...prog, id: uid(), rpe: "", rir: "", suggested: null };
  if ((p.mode || "muscu") === "cardio") return base;
  const precedent = derniereFois(seances, p.name, { date });
  if (!precedent) return base;
  const ex = precedent.exercice;
  const sug = chargeSuivante(ex.weight, ex.rpe, ex.rir);
  if (sug) {
    return { ...base, weight: String(sug.weight), suggested: { from: num(ex.weight), delta: sug.delta, reason: sug.reason } };
  }
  return num(ex.weight) > 0 ? { ...base, weight: String(ex.weight) } : base;
}

/**
 * Exercice tel qu'il se range dans le programme d'une seance type : ce qui
 * se prevoit (nom, type, series, repetitions, repos), rien de ce qui se
 * mesure pendant la seance.
 */
export function exercicePourProgramme(item) {
  const ex = exerciceDepuisBibliotheque(item);
  const garde = { id: ex.id, name: ex.name, mode: ex.mode || "muscu", sets: ex.sets || "", reps: ex.reps || "" };
  if (ex.repUnit) garde.repUnit = ex.repUnit;
  if (ex.fields) garde.fields = ex.fields;
  if (ex.mode === "cardio") {
    for (const f of ex.fields || DEFAULT_CARDIO_FIELDS) if (ex[f] != null && ex[f] !== "") garde[f] = ex[f];
  }
  return garde;
}

/**
 * Types de serie proposes en mode Force, « Aucun type » en tete.
 *
 * Retour d'une cliente du 18 octobre 2026 : « Top set » et « Back-off »
 * s'affichaient sur ses exercices sans qu'elle les ait choisis, et rien ne
 * permettait de les retirer. L'ancienne application avait un menu « Type de
 * série » que la migration n'avait pas repris. Le menu revient, avec un
 * choix vide.
 */
export const CHOIX_TYPE_SERIE = [{ id: "", label: "Aucun type" }, ...PL_SET_TYPES];

/**
 * Exercice cree en le choisissant dans la bibliotheque.
 *
 * Le type de serie de la bibliotheque n'est PAS repris (decision du coach,
 * 18 octobre 2026) : un « Top set » pose d'office se lisait comme un choix
 * du client. Il le choisit lui-meme, dans le menu « Type de série ».
 */
export function exerciceDepuisBibliotheque(item) {
  const { setType, ...defauts } = item.defaults || {};
  return {
    id: uid(),
    name: item.name,
    mode: item.mode,
    sets: "",
    reps: "",
    weight: "",
    ...(item.fields ? { fields: item.fields } : {}),
    ...defauts
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
  const rpe = ex.rpe ? ` · RPE ${fmtRPE(ex.rpe)}` : ex.rir !== "" && ex.rir != null ? ` · RIR ${ex.rir}` : "";

  // La technique se lit en queue de resume, apres le ressenti. Vide tant
  // qu'aucune technique n'est posee : les resumes existants ne bougent pas.
  const technique = resumeTechnique(ex);

  // Series notees une a une et differentes entre elles : elles s'ecrivent
  // une a une. Identiques, ou a l'ancien format, le resume reste « 3×8 ».
  const series = resumeSeries(ex);
  if (series) {
    const type = mode === "powerlifting" ? (PL_SET_TYPES.find((t) => t.id === ex.setType) || {}).label : "";
    const pct = mode === "powerlifting" && ex.pct1rm ? ` · ${ex.pct1rm}% 1RM` : "";
    return `${type ? type + " — " : ""}${series}${pct}${rpe}${technique}`;
  }

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

/**
 * « Dernière fois » : le meme exercice dans la seance la plus recente qui
 * le contient, hors seance en cours et hors seances posterieures.
 *
 * Toutes les seances comptent, pas seulement la meme seance type : un
 * squat fait le lundi en « Bas du corps » est la reference du squat du
 * jeudi en « Full body ». Rend null quand l'exercice n'a jamais ete fait.
 */
export function derniereFois(seances, nom, seanceCourante = {}) {
  const k = cleExercice(nom);
  if (!k) return null;
  const date = seanceCourante.date || "9999-12-31";
  const candidates = (seances || [])
    .filter((s) => s && s.id !== seanceCourante.id && s.date && s.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const s of candidates) {
    const ex = (s.exercises || []).find((e) => e && e.mode !== "cardio" && cleExercice(e.name) === k);
    if (ex) return { date: s.date, exercice: ex };
  }
  return null;
}

/** Video de demonstration d'un exercice, s'il en a une. */
export const videoExercice = (nom) => EXERCISE_VIDEOS[cleExercice(nom)] || null;
