/**
 * Mensurations : champs suivis et mise a l'echelle des courbes.
 *
 * Repris a l'identique de index.html (MEASUREMENT_FIELDS ligne 348,
 * chartScale ligne 82, fmtTick ligne 95).
 *
 * L'ordre des champs compte : c'est celui dans lequel le client remplit sa
 * fiche depuis le debut. Le changer desorienterait sans rien apporter.
 */

import { round } from "./dates.js";

export const MEASUREMENT_FIELDS = [
  { id: "poitrine", label: "Poitrine" },
  { id: "taille", label: "Taille" },
  { id: "hanches", label: "Hanches" },
  { id: "brasD", label: "Bras droit" },
  { id: "brasG", label: "Bras gauche" },
  { id: "cuisseD", label: "Cuisse droite" },
  { id: "cuisseG", label: "Cuisse gauche" },
  { id: "molletD", label: "Mollet droit" },
  { id: "molletG", label: "Mollet gauche" }
];

/**
 * Bornes verticales d'une courbe, avec 8 % de marge de part et d'autre.
 * Une serie plate obtiendrait une hauteur nulle : on l'elargit d'un point
 * pour que le trace reste visible au lieu de disparaitre sur l'axe.
 */
export function chartScale(vals, refY) {
  let mn = Math.min(...vals);
  let mx = Math.max(...vals);
  if (refY != null) {
    mn = Math.min(mn, refY);
    mx = Math.max(mx, refY);
  }
  if (mn === mx) {
    mn -= 1;
    mx += 1;
  }
  const span = mx - mn;
  return { mn: mn - span * 0.08, mx: mx + span * 0.08 };
}

/** Graduation de l'axe : entiere au-dessus de 100, une decimale en dessous. */
export function fmtTick(v) {
  const a = Math.abs(v);
  return a >= 1e3 || a >= 100 ? Math.round(v).toString() : (Math.round(v * 10) / 10).toString();
}

/** Ecart avec la prise precedente, arrondi au dixieme de centimetre. */
export const ecart = (valeur, precedente) => (precedente != null ? round(valeur - precedente, 1) : null);

/** Prises triees de la plus ancienne a la plus recente. */
export const parDateCroissante = (prises) => [...(prises || [])].sort((a, b) => a.date.localeCompare(b.date));
