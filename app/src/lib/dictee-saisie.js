/**
 * Dictee vocale : remplir un plat, une recette ou une seance a la voix.
 *
 * Demande du coach du 12 octobre 2026 : « un endroit ou la personne fasse
 * une dictee vocale pour rentrer soit ses plats, soit ses recettes, soit
 * ses entrainements ». La dictee d'un repas existait deja dans le Journal
 * (voir dictee.js et consigneDescription dans photo-aliment.js) ; elle
 * s'etend ici aux trois autres saisies longues de l'application.
 *
 * Le principe ne change pas : la voix (ou le clavier) donne un texte, l'IA
 * le range dans les champs de l'ecran, et le client VERIFIE avant
 * d'enregistrer. Rien n'est enregistre sans son geste : une dictee mal
 * comprise ne doit jamais finir dans l'historique ou le Journal du coach.
 *
 * - Plat : meme estimation qu'un repas decrit (analyserDescriptionRepas).
 * - Recette : nom, nombre de parts et ingredients avec leurs quantites,
 *   chacun avec ses apports, pour la recette ENTIERE.
 * - Seance : exercices, series, repetitions, charges, cardio, duree et
 *   ressenti. Les noms sont rapproches de la bibliotheque : « developpe
 *   couche » devient « Développé couché », et la progression de charge
 *   retrouve l'exercice d'une semaine a l'autre.
 */

import { num } from "./dates.js";
import { uid } from "./semaine.js";
import { genererTexte } from "./ia.js";
import { extraireObjetJson } from "./photo-aliment.js";
import { cleExercice, exerciceDepuisBibliotheque, exerciceTape, nomsBibliotheque } from "./constructeur-seances.js";
import { EXERCISE_LIBRARY } from "./catalogues.js";

/** Attente maximale de l'IA, en millisecondes : une recette est plus longue qu'un repas. */
export const DELAI_DICTEE_IA_MS = 45000;

/** Au-dela, ce n'est plus une recette ni une seance dictee. */
export const LONGUEUR_MAX_DICTEE = 1500;

/** Au-dela, la liste ne se verifie plus d'un coup d'oeil. */
export const MAX_INGREDIENTS = 25;
export const MAX_EXERCICES = 20;

const MODES_SEANCE = ["muscu", "pdc", "cardio"];

const propre = (texte) => String(texte || "").trim().slice(0, LONGUEUR_MAX_DICTEE);

/** Nombre positif arrondi, ou null. */
function positif(valeur, decimales = 0) {
  const n = num(valeur);
  if (!Number.isFinite(n) || n <= 0) return null;
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
}

/** Valeur d'un champ de saisie : les champs de l'application sont des textes. */
const champ = (valeur, decimales = 0) => {
  const n = positif(valeur, decimales);
  return n == null ? "" : String(n);
};

function lireJson(texte, origine) {
  try {
    return JSON.parse(extraireObjetJson(texte));
  } catch (e) {
    // La reponse brute est la seule piste exploitable pour comprendre.
    console.error(`[Coach Neiram] ${origine} — réponse IA non-JSON:`, texte);
    throw e;
  }
}

// ── Recette ─────────────────────────────────────────────────────────

/** Consigne pour une recette dictee. */
export function consigneRecetteDictee(description) {
  return `Un client décrit une recette maison, en français, parfois dictée à la voix donc sans ponctuation :
« ${propre(description)} »
Liste les ingrédients de la recette ENTIÈRE avec leur quantité en grammes (ou millilitres comptés comme des grammes). Quand une quantité n'est pas précisée, prends la quantité habituelle pour ce type de recette. Convertis les unités courantes : 1 œuf = 55 g, 1 cuillère à soupe d'huile = 10 g, 1 pâte brisée = 230 g, 1 verre de lait = 200 g.
Donne les apports de chaque ingrédient POUR LA QUANTITÉ indiquée, pas pour 100 g.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, au format exact :
{"nom":"nom court de la recette","parts":0,"ingredients":[{"nom":"aliment","grammes":0,"calories":0,"protein":0,"carbs":0,"fat":0}],"confidence":"faible|moyenne|haute"}
"parts" : le nombre de parts annoncé, 0 s'il n'est pas dit. Les valeurs sont des nombres entiers (kcal et grammes).`;
}

/**
 * Recette lue dans la reponse de l'IA.
 *
 * Chaque ingredient prend la forme d'un aliment du Journal : le nom porte
 * la quantite, comme les ingredients choisis par la recherche (« Lardons
 * (200 g) »), et `baseName` garde le nom seul.
 */
export function lireRecetteDictee(texte) {
  const r = lireJson(texte, "Recette dictée");
  const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : [])
    .map((i) => {
      const nom = String((i && (i.nom || i.name)) || "").trim().slice(0, 80);
      if (!nom) return null;
      const grammes = positif(i.grammes ?? i.grams);
      return {
        name: grammes ? `${nom} (${grammes} g)` : nom,
        baseName: nom,
        grams: grammes,
        calories: Math.round(num(i.calories)),
        protein: Math.round(num(i.protein)),
        carbs: Math.round(num(i.carbs)),
        fat: Math.round(num(i.fat))
      };
    })
    .filter(Boolean)
    .slice(0, MAX_INGREDIENTS);
  if (!ingredients.length) throw new Error("dictee-vide");
  return {
    nom: String(r.nom || r.name || "").trim().slice(0, 80),
    portions: positif(r.parts ?? r.portions) || null,
    ingredients,
    confidence: String(r.confidence || "moyenne")
  };
}

/** Recette dictee : texte → nom, parts et ingredients a verifier. */
export async function analyserRecetteDictee(description) {
  if (!String(description || "").trim()) throw new Error("description-vide");
  const texte = await genererTexte({
    prompt: consigneRecetteDictee(description),
    maxTokens: 2000,
    delaiMs: DELAI_DICTEE_IA_MS
  });
  return lireRecetteDictee(texte);
}

/**
 * Ajoute une recette dictee a celle en cours d'edition.
 *
 * Les ingredients s'ajoutent a ceux deja saisis ; le nom et le nombre de
 * parts ne remplacent jamais ce que le client a deja ecrit lui-meme.
 */
export function completerRecette(edition, dictee) {
  return {
    ...edition,
    nom: String(edition.nom || "").trim() ? edition.nom : dictee.nom || edition.nom,
    portions: String(edition.portions || "").trim() ? edition.portions : dictee.portions ? String(dictee.portions) : "",
    ingredients: [...(edition.ingredients || []), ...dictee.ingredients]
  };
}

// ── Seance ──────────────────────────────────────────────────────────

/**
 * Noms d'exercices proposes a l'IA : ceux du client d'abord, puis la
 * bibliotheque. Sans cette liste, « developpe couche » devenait un
 * exercice « Développé couché » a cote de « Développé couché barre », et
 * la progression de charge ne retrouvait plus la semaine precedente.
 */
export function nomsProposes(perso = []) {
  const vus = new Set();
  const noms = [];
  const ajouter = (nom) => {
    const k = cleExercice(nom);
    if (k && !vus.has(k)) {
      vus.add(k);
      noms.push(String(nom).trim());
    }
  };
  (perso || []).forEach((x) => x && ajouter(x.name));
  EXERCISE_LIBRARY.forEach((g) => g.items.forEach((it) => ajouter(it.name)));
  return noms;
}

/** Consigne pour une seance dictee. */
export function consigneSeanceDictee(description, perso = []) {
  return `Un client décrit la séance de sport qu'il vient de faire, en français, parfois dictée à la voix donc sans ponctuation :
« ${propre(description)} »
Range-la exercice par exercice, dans l'ordre. Quand un exercice correspond à un nom de cette liste, recopie ce nom exactement ; sinon, écris son nom usuel en français, avec majuscule et accents.
Liste : ${nomsProposes(perso).join(" ; ")}
"type" : "muscu" pour un exercice avec charge, "pdc" au poids du corps (pompes, tractions, gainage...), "cardio" pour tapis, vélo, rameur, course, corde à sauter...
Si les répétitions ou la charge changent d'une série à l'autre, donne la charge la plus lourde et les répétitions faites à cette charge. Un exercice tenu en secondes (gainage) : "unite":"sec" et la durée dans "reps".
Ne devine rien qui n'est pas dit : mets 0 pour une valeur absente. Ce qui ne rentre dans aucun champ (douleur, sensation, détail des séries) va dans "notes", en une phrase courte.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, au format exact :
{"exercices":[{"nom":"","type":"muscu|pdc|cardio","series":0,"reps":0,"unite":"reps|sec","charge_kg":0,"rpe":0,"duree_min":0,"distance_m":0,"vitesse_kmh":0}],"duree_min":0,"rpe":0,"notes":""}`;
}

/**
 * Seance lue dans la reponse de l'IA.
 *
 * `perso` : les exercices que le client a deja saisis lui-meme, pour
 * reprendre leur nom exact plutot que d'en creer un doublon.
 */
export function lireSeanceDictee(texte, perso = []) {
  const r = lireJson(texte, "Séance dictée");
  const bibliotheque = nomsBibliotheque();
  const dejaConnu = (nom) =>
    bibliotheque.has(cleExercice(nom)) || (perso || []).some((x) => x && cleExercice(x.name) === cleExercice(nom));
  const exercices = (Array.isArray(r.exercices) ? r.exercices : [])
    .map((e) => {
      const connu = exerciceTape(e && (e.nom || e.name), perso);
      if (!connu) return null;
      const dicte = String((e && e.type) || "").toLowerCase();
      // Le mode d'un exercice deja connu prime : il decide des champs
      // affiches. Pour un exercice nouveau, c'est celui que l'IA a reconnu.
      const mode = dejaConnu(connu.name)
        ? connu.mode || "muscu"
        : MODES_SEANCE.includes(dicte)
          ? dicte
          : "muscu";
      // Les valeurs par defaut de la bibliotheque (3 x 10) sont un modele,
      // pas ce que le client a fait : seules les valeurs dictees comptent.
      const base = { ...exerciceDepuisBibliotheque({ ...connu, mode, defaults: {} }), id: uid() };
      if (mode === "cardio") {
        return {
          ...base,
          durationMin: champ(e.duree_min, 1),
          distanceM: champ(e.distance_m),
          speedKmh: champ(e.vitesse_kmh, 1)
        };
      }
      return {
        ...base,
        sets: champ(e.series) || "",
        reps: champ(e.reps) || "",
        repUnit: e.unite === "sec" ? "sec" : "reps",
        weight: champ(e.charge_kg, 1),
        rpe: champ(e.rpe, 1)
      };
    })
    .filter(Boolean)
    .slice(0, MAX_EXERCICES);
  if (!exercices.length) throw new Error("dictee-vide");
  const rpe = positif(r.rpe, 1);
  return {
    exercices,
    durationMin: champ(r.duree_min),
    rpe: rpe && rpe <= 10 ? String(rpe) : "",
    notes: String(r.notes || "").trim().slice(0, 300)
  };
}

/** Seance dictee : texte → exercices, duree et ressenti a verifier. */
export async function analyserSeanceDictee(description, perso = []) {
  if (!String(description || "").trim()) throw new Error("description-vide");
  const texte = await genererTexte({
    prompt: consigneSeanceDictee(description, perso),
    maxTokens: 2000,
    delaiMs: DELAI_DICTEE_IA_MS
  });
  return lireSeanceDictee(texte, perso);
}

/**
 * Ajoute une seance dictee a celle en cours de saisie.
 *
 * Une seance type demarree arrive deja remplie avec les exercices de la
 * derniere fois : un exercice dicte qui y figure deja met A JOUR sa ligne
 * (series, repetitions, charge dites) au lieu d'en creer une seconde. Les
 * autres s'ajoutent a la suite. Les lignes laissees vides par le
 * formulaire disparaissent. La duree et le ressenti ne remplacent pas ce
 * que le client a deja saisi ; les notes s'ajoutent.
 */
export function completerSeance(seance, dictee) {
  const exercices = (seance.exercises || []).filter((e) => String(e.name || "").trim());
  const misAJour = new Set();
  const ajouts = [];
  for (const d of dictee.exercices) {
    const i = exercices.findIndex((e, k) => !misAJour.has(k) && cleExercice(e.name) === cleExercice(d.name));
    if (i < 0) {
      ajouts.push(d);
      continue;
    }
    misAJour.add(i);
    const dits = Object.fromEntries(
      ["sets", "reps", "weight", "rpe", "durationMin", "distanceM", "speedKmh"]
        .filter((f) => d[f] !== "" && d[f] != null)
        .map((f) => [f, d[f]])
    );
    if (d.repUnit === "sec") dits.repUnit = "sec";
    // La charge proposee d'apres la derniere seance n'a plus lieu d'etre
    // affichee quand le client dit celle qu'il a vraiment faite.
    if (dits.weight) dits.suggested = null;
    // Series, repetitions ou charge dites : elles remplacent les series
    // notees une a une, qui ne correspondraient plus a ce qui a ete fait.
    if (dits.sets || dits.reps || dits.weight) dits.series = undefined;
    exercices[i] = { ...exercices[i], ...dits };
    if (exercices[i].series === undefined) delete exercices[i].series;
  }
  const notes = [String(seance.notes || "").trim(), dictee.notes].filter(Boolean).join("\n");
  return {
    ...seance,
    exercises: [...exercices, ...ajouts],
    durationMin: String(seance.durationMin ?? "").trim() ? seance.durationMin : dictee.durationMin,
    rpe: String(seance.rpe ?? "").trim() ? seance.rpe : dictee.rpe,
    notes
  };
}

// ── Plat ────────────────────────────────────────────────────────────

/** Un repas estime devient la fiche d'un plat a verifier, sans identifiant. */
export function platDepuisEstimation(estimation) {
  return {
    id: null,
    name: String(estimation.name || "").trim(),
    calories: estimation.calories,
    protein: estimation.protein,
    carbs: estimation.carbs,
    fat: estimation.fat
  };
}
