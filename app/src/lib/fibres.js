/**
 * Fibres alimentaires.
 *
 * Elles manquaient completement : ni objectif, ni suivi, ni valeur au
 * catalogue. Le catalogue le signalait d'ailleurs tout seul — les graines de
 * chia annoncent 490 kcal quand proteines, glucides et lipides n'en donnent
 * que 379. L'ecart, ce sont les fibres.
 *
 * ─────────────────────────────────────────────────────────────────────
 * UNE VALEUR ABSENTE N'EST PAS UNE VALEUR NULLE
 * ─────────────────────────────────────────────────────────────────────
 *
 * C'est la regle centrale de ce module. Ecrire 0 g de fibres sur un aliment
 * dont on ne connait pas la teneur, c'est AFFIRMER qu'il n'en contient pas.
 * Le client verrait un total du jour faussement bas et mangerait des fibres
 * dont il n'a pas besoin — ou, pire, se croirait en deficit permanent.
 *
 * Une teneur inconnue vaut donc `null`, s'affiche « — », et ne compte pas
 * dans le total. Le total du jour est explicitement marque comme PARTIEL
 * tant qu'un aliment sans valeur y figure.
 *
 * C'est aussi pour cela que les valeurs ci-dessous ne couvrent pas les 648
 * aliments du catalogue : elles couvrent ceux dont la teneur est etablie et
 * verifiable. Remplir le reste au juge donnerait un chiffre precis et faux,
 * ce qui est pire que pas de chiffre du tout.
 */

import { num, round } from "./dates.js";

/**
 * Objectif de fibres, en grammes par 1000 kcal.
 *
 * Une valeur fixe (« 30 g par jour ») ne convient pas : elle est trop haute
 * pour une cliente a 1500 kcal et trop basse pour un pratiquant a 4000. La
 * reference usuelle rapporte les fibres a l'apport energetique, ce qui suit
 * naturellement le volume de nourriture ingere.
 */
export const FIBRES_PAR_1000_KCAL = 14;

/** Bornes de bon sens, en grammes par jour. */
const FIBRES_MIN = 20;
const FIBRES_MAX = 45;

/**
 * Objectif journalier de fibres.
 *
 * Borne haut et bas : au-dela d'environ 45 g par jour, l'inconfort digestif
 * et la gene a l'absorption des mineraux l'emportent sur le benefice, meme
 * chez quelqu'un qui mange beaucoup.
 */
export function objectifFibres(calories) {
  const kcal = num(calories);
  if (!(kcal > 0)) return null;
  const brut = (kcal / 1000) * FIBRES_PAR_1000_KCAL;
  return Math.round(Math.min(FIBRES_MAX, Math.max(FIBRES_MIN, brut)));
}

/**
 * Total des fibres d'une journee.
 *
 * Rend aussi ce que le total ne dit pas : combien d'aliments n'ont pas de
 * valeur connue. Un total de 12 g calcule sur trois aliments dont deux sont
 * inconnus ne veut rien dire, et l'interface doit pouvoir le signaler.
 */
export function totalFibres(entrees) {
  let total = 0;
  let connus = 0;
  let inconnus = 0;

  for (const e of entrees || []) {
    if (e.fiber == null || e.fiber === "") {
      inconnus++;
      continue;
    }
    total += num(e.fiber);
    connus++;
  }

  return { total: round(total, 1), connus, inconnus, partiel: inconnus > 0 };
}

/** Teneur en fibres pour une quantite donnee, en grammes. */
export function fibresPour(pour100g, grammes) {
  if (pour100g == null || pour100g === "") return null;
  const g = num(grammes);
  if (!(g > 0)) return null;
  return round((num(pour100g) * g) / 100, 1);
}


/**
 * Mention affichee a cote d'un aliment : « cru » ou « cuit ».
 *
 * C'est la plus grosse source d'erreur du journal alimentaire, et la plus
 * silencieuse. Le boulgour affiche 345 kcal cru et 83 kcal cuit : un client
 * qui pese son assiette et choisit la fiche « cru » se trompe d'un facteur
 * quatre, sans que rien ne le signale — le total reste plausible, et on
 * cherche ailleurs pourquoi la progression ne suit pas.
 *
 * « telquel » ne s'affiche pas : pour une huile, un fruit ou un yaourt, la
 * question ne se pose pas, et l'afficher ajouterait du bruit la ou il n'y a
 * pas de risque.
 */
export function mentionEtat(etat) {
  if (etat === "cru") return "pesé cru";
  if (etat === "cuit") return "pesé cuit";
  return null;
}
