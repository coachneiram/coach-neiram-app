/**
 * Photos du bilan mensuel (décision du coach du 26 octobre 2026).
 *
 * Le bilan mensuel exige les trois photos du mois (face, profil, dos) :
 * sans elles, pas de comparaison possible d'un mois à l'autre. La carte du
 * bilan mensuel montre les photos manquantes, bloque la génération tant
 * qu'il en manque, et met chaque pose à côté de celle du mois précédent.
 *
 * Les photos ne changent pas de place : ce sont celles de la carte
 * « Photos de progression », rangées par semaine (« coach_photos_<lundi> »).
 * Une semaine compte pour un mois dès qu'un de ses jours tombe dans ce
 * mois : les photos prises le jeudi 30 octobre, semaine du lundi 27,
 * valent aussi pour novembre. Sans cela, un client qui fait ses photos en
 * début de mois, dans une semaine commencée le mois d'avant, resterait
 * bloqué.
 *
 * Exception de santé : photos facultatives (le bilan n'est pas bloqué)
 * pour les moins de 18 ans, la grossesse ou l'allaitement, et un antécédent
 * de trouble alimentaire. Imposer des photos du corps à ces profils fait
 * plus de mal que de bien. La règle vit dans lib/eligibilite-perte.js,
 * seul fichier autorisé à lire les réponses de santé ; elle ne rend qu'un
 * oui ou un non, et rien ne quitte le téléphone.
 */

import { addDays } from "./dates.js";
import { cleMoisPrecedent, getMonthRange } from "./semaine.js";
import { estCleDePhoto } from "./stockage.js";
import { photosMoisObligatoires } from "./eligibilite-perte.js";

export const POSES_MOIS = [
  { id: "face", label: "Face" },
  { id: "profil", label: "Profil" },
  { id: "dos", label: "Dos" }
];

export const TEXTES_PHOTOS_MOIS = {
  titre: "Photos du mois",
  completes: "Tes 3 photos du mois sont prêtes.",
  manquantes: (n) => `Il manque ${n} photo${n > 1 ? "s" : ""} pour débloquer ton bilan mensuel.`,
  bloque: "Ajoute d'abord tes 3 photos du mois (face, profil, dos) : le bilan mensuel les compare au mois précédent.",
  facultatives: "Photos facultatives pour toi : ton bilan mensuel n'en dépend pas.",
  prendre: "Prendre la photo",
  ceMois: "Ce mois",
  moisPrecedent: "Avant",
  aucunePrecedente: "Pas encore de photo avant ce mois",
  conseil: "Même lumière, même tenue, même endroit : la comparaison n'a de sens qu'à l'identique."
};

/** Les semaines photographiées (lundi → photos), de la plus ancienne à la plus récente. */
export function semainesPhotographiees(stockage = globalThis.localStorage) {
  if (!stockage) return [];
  const l = [];
  for (let i = 0; i < stockage.length; i++) {
    const cle = stockage.key(i);
    if (!estCleDePhoto(cle)) continue;
    let photos = null;
    try {
      photos = JSON.parse(stockage.getItem(cle));
    } catch (e) {
      photos = null; // valeur illisible : semaine ignorée
    }
    if (photos && typeof photos === "object") l.push({ lundi: cle.replace("coach_photos_", ""), photos });
  }
  return l.sort((a, b) => (a.lundi < b.lundi ? -1 : 1));
}

/** La semaine qui commence ce lundi touche-t-elle ce mois ? */
function semaineDansMois(lundi, cleMois) {
  const { start, end } = getMonthRange(cleMois);
  return lundi <= end && addDays(lundi, 6) >= start;
}

const aLaPose = (s, pose) => typeof s.photos[pose] === "string" && s.photos[pose] !== "";

/**
 * Pour chaque pose : la photo la plus récente du mois (ou null), et celle
 * à laquelle la comparer (la plus récente du mois précédent, à défaut la
 * plus récente d'avant, prise une autre semaine).
 */
export function photosDuMois(cleMois, semaines) {
  const precedent = cleMoisPrecedent(cleMois);
  const { start } = getMonthRange(cleMois);
  return POSES_MOIS.map(({ id, label }) => {
    const avec = semaines.filter((s) => aLaPose(s, id));
    const duMois = avec.filter((s) => semaineDansMois(s.lundi, cleMois));
    const actuelle = duMois.length ? duMois[duMois.length - 1] : null;
    const avant = avec.filter((s) => s.lundi < start && (!actuelle || s.lundi !== actuelle.lundi));
    const duPrecedent = avant.filter((s) => semaineDansMois(s.lundi, precedent));
    const reference = duPrecedent.length ? duPrecedent[duPrecedent.length - 1] : avant.length ? avant[avant.length - 1] : null;
    return {
      pose: id,
      label,
      actuelle: actuelle ? { lundi: actuelle.lundi, image: actuelle.photos[id] } : null,
      precedente: reference ? { lundi: reference.lundi, image: reference.photos[id] } : null
    };
  });
}

/**
 * État pour la carte du bilan mensuel :
 * { obligatoires, poses, manquantes, bloque }.
 * `bloque` : la génération du bilan attend les photos.
 */
export function etatPhotosMois({ cleMois, profil, reglages, semaines }) {
  const poses = photosDuMois(cleMois, semaines);
  const manquantes = poses.filter((p) => !p.actuelle).map((p) => p.pose);
  const obligatoires = photosMoisObligatoires(reglages === undefined ? { profil } : { profil, reglages });
  return { obligatoires, poses, manquantes, bloque: obligatoires && manquantes.length > 0 };
}
