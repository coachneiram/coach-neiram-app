/**
 * Repas types : composer une fois, resaisir en un geste.
 *
 * Portage fidele de useMealPresets (index.html, ligne 876) et presetTotals
 * (929).
 *
 * C'est ce qui fait qu'un suivi alimentaire tient dans la duree. Personne
 * ne retape les macros de son petit-dejeuner tous les matins ; si l'appli
 * l'exige, elle est abandonnee en deux semaines.
 */

import { num, todayISO } from "./dates.js";
import { uid } from "./semaine.js";
import { charger, enregistrer } from "./stockage.js";

export const CLE_REPAS_TYPES = "cn_meal_presets";

/** Au-dela, la liste devient impraticable a faire defiler sur telephone. */
const MAX_REPAS_TYPES = 60;

/** Paliers de portion proposes en un geste. */
export const PALIERS_PORTION = [0.5, 0.75, 1, 1.5, 2];

/** Totaux d'un repas type. */
export const totauxRepasType = (repas) =>
  (repas.items || []).reduce(
    (a, it) => ({
      kcal: a.kcal + num(it.calories),
      p: a.p + num(it.protein),
      c: a.c + num(it.carbs),
      f: a.f + num(it.fat)
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );

/** Lit les repas types enregistres sur l'appareil. */
export function lireRepasTypes() {
  const valeur = charger(CLE_REPAS_TYPES, []);
  return Array.isArray(valeur) ? valeur : [];
}

/**
 * Enregistre un repas a partir des entrees du jour.
 *
 * Le nombre de portions permet d'enregistrer une recette entiere : huit
 * pancakes saisis d'un coup se reutilisent ensuite a l'unite. Il vaut au
 * minimum 1 — zero portion rendrait le repas inutilisable, et une portion
 * fractionnaire n'a pas de sens.
 */
export function enregistrerRepasType(liste, { nom, mealType, entrees, portions }) {
  const items = (entrees || []).map((e) => ({
    name: e.name,
    baseName: e.baseName || null,
    grams: e.grams != null ? num(e.grams) : null,
    calories: num(e.calories),
    protein: num(e.protein),
    carbs: num(e.carbs),
    fat: num(e.fat)
  }));
  if (!items.length) return liste;

  const parts = Math.max(1, Math.round(num(portions) || 1));
  const suivant = [
    {
      id: uid(),
      name: String(nom || "Repas").trim() || "Repas",
      mealType,
      items,
      portions: parts,
      createdAt: todayISO()
    },
    ...liste
  ].slice(0, MAX_REPAS_TYPES);

  enregistrer(CLE_REPAS_TYPES, suivant);
  return suivant;
}

export function supprimerRepasType(liste, id) {
  const suivant = liste.filter((p) => p.id !== id);
  enregistrer(CLE_REPAS_TYPES, suivant);
  return suivant;
}

/**
 * Retient le poids d'une portion une fois qu'il a ete renseigne.
 *
 * Sans cela, le client devrait re-indiquer « ma part de gateau fait 80 g »
 * a chaque reutilisation du repas.
 */
export function memoriserGrammage(liste, idRepas, index, grammes) {
  const g = num(grammes);
  if (!(g > 0)) return liste;

  const suivant = liste.map((p) => {
    if (p.id !== idRepas) return p;
    return {
      ...p,
      items: (p.items || []).map((it, k) =>
        k === index ? { ...it, grams: g, baseName: it.baseName || it.name } : it
      )
    };
  });
  enregistrer(CLE_REPAS_TYPES, suivant);
  return suivant;
}

/** Multiplicateur saisi, borne et tolerant a la virgule francaise. */
export function multiplicateur(saisie) {
  const v = parseFloat(String(saisie).replace(",", "."));
  // Zero signifie « saisie invalide » et desactive le bouton d'ajout ;
  // le plafond a 20 evite qu'une faute de frappe ajoute 20 000 kcal.
  return isNaN(v) || v <= 0 ? 0 : Math.min(20, v);
}

/**
 * Retient le poids d'une portion d'un aliment d'un repas type.
 *
 * Portage de setItemGrams (index.html 1049). Quand le client indique une
 * fois que sa portion de poulet pese 150 g, la ligne bascule en grammes et
 * l'application ne le redemande plus.
 *
 * `baseName` conserve le nom d'origine : le libelle affiche devient
 * « Blanc de poulet (150 g) », mais la ligne doit rester rattachable a
 * l'aliment de depart.
 */
export function definirPoidsAliment(repasTypes, idRepas, index, grammes) {
  const g = num(grammes);
  if (!(g > 0)) return repasTypes;

  const suivant = (repasTypes || []).map((r) => {
    if (r.id !== idRepas) return r;
    const items = (r.items || []).map((it, k) =>
      k === index ? { ...it, grams: g, baseName: it.baseName || it.name } : it
    );
    return { ...r, items };
  });

  enregistrer(CLE_REPAS_TYPES, suivant);
  return suivant;
}
