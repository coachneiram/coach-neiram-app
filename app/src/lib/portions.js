/**
 * Portions et mise a l'echelle des macronutriments.
 *
 * Portage fidele de index.html : parseGrams (777), stripGrams (783),
 * itemBasis (786), basisMacros (795), toGramBasis (798), sumMacros (804),
 * scaleMacros (807), fmtPortion (813).
 *
 * C'est le calcul qui transforme « 180 g de riz » en calories. Une erreur
 * ici fausse le journal alimentaire du client, donc son bilan, donc les
 * conseils que le coach lui donne.
 *
 * Point de compatibilite important : les entrees creees avant l'ajout du
 * champ « grams » n'ont leur grammage que dans leur libelle, sous la forme
 * « Riz basmati (150 g) ». parseGrams sait le relire, et c'est ce qui
 * permet de modifier la portion d'un repas saisi il y a des mois.
 */

import { num, round } from "./dates.js";

/**
 * Grammage lu dans un libelle du type « ... (150 g) ».
 *
 * La virgule decimale est acceptee : c'est ce que tape un francophone.
 */
export function parseGrams(nom) {
  const trouve = String(nom || "").match(/\((\d+(?:[.,]\d+)?)\s*g\)/i);
  if (!trouve) return null;
  const valeur = parseFloat(trouve[1].replace(",", "."));
  return isNaN(valeur) || valeur <= 0 ? null : valeur;
}

/** Libelle debarrasse de son grammage final. */
export const stripGrams = (nom) =>
  String(nom || "")
    .replace(/\s*\(\d+(?:[.,]\d+)?\s*g\)\s*$/i, "")
    .trim();

/**
 * Ramene un aliment a une quantite modifiable et a ses macros unitaires.
 *
 * Unite « g » quand le grammage est connu — les macros sont alors ramenees
 * au gramme, ce qui permet de changer la quantite librement. Sinon unite
 * « x », et la quantite est un multiplicateur de portion.
 */
export function itemBasis(entree) {
  const grammes =
    entree.grams != null && num(entree.grams) > 0 ? num(entree.grams) : parseGrams(entree.name);
  const macros = {
    kcal: num(entree.calories),
    p: num(entree.protein),
    c: num(entree.carbs),
    f: num(entree.fat)
  };

  if (grammes) {
    return {
      unit: "g",
      qty: grammes,
      label: entree.baseName || stripGrams(entree.name) || entree.name,
      per: {
        kcal: macros.kcal / grammes,
        p: macros.p / grammes,
        c: macros.c / grammes,
        f: macros.f / grammes
      }
    };
  }

  return { unit: "x", qty: 1, label: entree.name, per: macros };
}

/**
 * Macros d'une quantite donnee.
 *
 * Une quantite nulle ou illisible donne zero, pas NaN : un champ vide en
 * cours de saisie ne doit pas afficher « NaN kcal ».
 */
export const basisMacros = (base, quantite) => scaleMacros(base.per, num(quantite) > 0 ? num(quantite) : 0);

/**
 * Convertit une ligne comptee en portions vers une base au gramme, une fois
 * que le client a indique le poids de la portion enregistree.
 */
export const toGramBasis = (base, grammesReference) => {
  const g = num(grammesReference);
  if (base.unit === "g" || !(g > 0)) return base;
  return {
    unit: "g",
    qty: g,
    label: base.label,
    per: { kcal: base.per.kcal / g, p: base.per.p / g, c: base.per.c / g, f: base.per.f / g }
  };
};

/**
 * Mise a l'echelle des macros.
 *
 * Les calories sont arrondies a l'entier, les macros au dixieme de gramme :
 * annoncer « 187,3 kcal » donnerait une fausse impression de precision sur
 * des valeurs deja approximatives.
 */
export const scaleMacros = (macros, facteur) => ({
  kcal: Math.round(num(macros.kcal) * facteur),
  p: round(num(macros.p) * facteur, 1),
  c: round(num(macros.c) * facteur, 1),
  f: round(num(macros.f) * facteur, 1)
});

/** Somme d'une liste de macros, arrondie a chaque etape comme l'original. */
export const sumMacros = (liste) =>
  liste.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      p: round(a.p + m.p, 1),
      c: round(a.c + m.c, 1),
      f: round(a.f + m.f, 1)
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );

/** Multiplicateur affiche : « 1,5 » plutot que « 1.5 ». */
export const fmtPortion = (facteur) => {
  const v = round(facteur, 2);
  return Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
};
