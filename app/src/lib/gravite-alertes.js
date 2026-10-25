/**
 * Gravité des alertes envoyées au coach (Smart Coach, 25 octobre 2026).
 *
 * Chaque alerte porte un niveau : « info », « attention » ou « critique ».
 * Le script Google n'envoie un mail que pour attention et critique ; info
 * s'écrit seulement dans l'onglet Alertes.
 *
 * LA TABLE CI-DESSOUS EST LA SEULE SOURCE. worker/coach-sync.gs en garde
 * une copie (niveauParDefaut) pour les téléphones dont l'application, encore
 * en cache, n'envoie pas de niveau ; tests/gravite-alertes.test.mjs vérifie
 * que les deux rendent la même chose. Le Worker, lui, fixe le niveau de
 * l'alerte d'inactivité qu'il produit (mêmes seuils : 4 et 7 jours).
 *
 * Règles lues dans l'ordre : la première qui correspond l'emporte.
 * Pourquoi chaque ligne :
 *  - inactivité 7 jours et plus, sommeil et stress, 3 créneaux manqués ou
 *    plus : le client décroche ou va mal, il faut l'appeler aujourd'hui ;
 *  - inactivité 4 à 6 jours, variation de poids, nutrition, décalages,
 *    2 créneaux manqués, 2 semaines difficiles d'affilée : signal net, une
 *    action du coach dans la semaine ;
 *  - justification d'un créneau manqué : attention, pour garder le mail
 *    qui partait déjà (le client a fait la démarche, il attend une réponse) ;
 *  - résumé hebdomadaire : attention (il ne devient une alerte, côté script,
 *    que sous 70 % de respect) ;
 *  - stagnation du poids, semaine difficile isolée : information, le
 *    protocole fonctionne, rien d'urgent.
 */

export const NIVEAUX = ["info", "attention", "critique"];

/** Jours sans saisie ni ouverture (calculés par le Worker). */
export const INACTIVITE_ATTENTION_JOURS = 4;
export const INACTIVITE_CRITIQUE_JOURS = 7;

/** Créneaux manqués sur 14 jours à partir desquels l'alerte est critique. */
export const MANQUES_CRITIQUE = 3;

/**
 * { type, niveau } ou { type, champ, min, niveau } (champ >= min)
 * ou { type, champ, egal, niveau } (champ === egal).
 */
export const TABLE_NIVEAUX = [
  { type: "alerte_inactivite", champ: "nbJours", min: INACTIVITE_CRITIQUE_JOURS, niveau: "critique" },
  { type: "alerte_inactivite", niveau: "attention" },
  { type: "alerte_sommeil_stress", niveau: "critique" },
  { type: "alerte_seances_manquees", champ: "nbManquees", min: MANQUES_CRITIQUE, niveau: "critique" },
  { type: "alerte_seances_manquees", niveau: "attention" },
  { type: "alerte_poids", champ: "sousType", egal: "stagnation", niveau: "info" },
  { type: "alerte_poids", niveau: "attention" },
  { type: "alerte_nutrition", niveau: "attention" },
  { type: "alerte_decalages", niveau: "attention" },
  { type: "alerte_semaines_difficiles", niveau: "attention" },
  { type: "justification", niveau: "attention" },
  { type: "resume_hebdo", niveau: "attention" },
  { type: "semaine_difficile", niveau: "info" }
];

/**
 * Niveau par défaut d'un événement, ou null si ce n'est pas une alerte
 * (pointage, activité). Un niveau valide déjà présent est gardé.
 */
export function niveauAlerte(evenement) {
  const e = evenement || {};
  if (NIVEAUX.includes(e.niveau)) return e.niveau;
  for (const r of TABLE_NIVEAUX) {
    if (r.type !== e.type) continue;
    if (r.min !== undefined && !(Number(e[r.champ]) >= r.min)) continue;
    if (r.egal !== undefined && e[r.champ] !== r.egal) continue;
    return r.niveau;
  }
  return null;
}
