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

/**
 * Quantites d'une seule portion d'un repas enregistre pour plusieurs parts.
 *
 * L'editeur affiche « Recette pour 6 portions — tu en manges combien ? »
 * avec « 1 » deja saisi. Il ouvrait pourtant les lignes aux quantites de
 * la recette ENTIERE, et ne divisait qu'une fois ce champ modifie : un
 * client qui validait sans y toucher enregistrait la quiche complete,
 * alors que l'ecran lui annoncait une part. Defaut d'origine, deja present
 * dans index.html ; il devient critique des qu'on cree des recettes.
 *
 * Un repas en une seule portion reste tel quel.
 */
export function quantitesDUnePortion(bases, portions) {
  const parts = Math.max(1, Math.round(num(portions) || 1));
  return (bases || []).map((b) => String(parts > 1 ? Math.round((b.qty / parts) * 100) / 100 : b.qty));
}

/**
 * Recettes : les ingredients d'un plat cuisine, pour la recette entiere.
 *
 * Une recette EST un repas type — meme stockage, memes champs — avec un
 * nombre de parts et un marqueur `recette`. Elle se reutilise donc depuis
 * le Journal exactement comme un repas enregistre (« + ajouter » → Repas),
 * avec l'editeur qui demande combien de parts on mange. Rien de nouveau a
 * apprendre de ce cote, et aucun second mecanisme a maintenir.
 *
 * Ce qui manquait, c'etait de pouvoir la COMPOSER sans passer par le
 * journal du jour : saisir 200 g de lardons dans son dejeuner pour ensuite
 * « Enregistrer ce repas » comptait la quiche entiere dans la journee.
 */
export const estRecette = (repas) => Boolean(repas && repas.recette);

export const lireRecettes = () => lireRepasTypes().filter(estRecette);

/** Totaux d'une part : la recette entiere divisee par son nombre de parts. */
export function totauxParPortion(recette) {
  const t = totauxRepasType(recette);
  const parts = Math.max(1, Math.round(num(recette && recette.portions) || 1));
  return { kcal: t.kcal / parts, p: t.p / parts, c: t.c / parts, f: t.f / parts };
}

/**
 * Ce que coutent 1, 2, 3 parts, et la recette entiere.
 *
 * Demande du coach : « si elle prend une part, deux parts, trois parts, ou
 * la quiche entiere », avec calories et macros pour chaque cas, sous les
 * yeux avant de choisir. Les paliers qui depassent la recette sont omis :
 * « 3 parts » d'une recette qui en fait 2 n'existe pas. La derniere ligne
 * est toujours la recette entiere.
 *
 * `total` est celui de la recette ENTIERE. Rien a afficher pour un repas
 * d'une seule portion : il n'y a pas de parts a choisir.
 */
export function lignesParParts(total, portions) {
  const parts = Math.max(1, Math.round(num(portions) || 1));
  if (parts < 2) return [];
  return [...[1, 2, 3].filter((n) => n < parts), parts].map((n) => ({
    parts: n,
    entiere: n === parts,
    kcal: (num(total.kcal) * n) / parts,
    p: (num(total.p) * n) / parts,
    c: (num(total.c) * n) / parts,
    f: (num(total.f) * n) / parts
  }));
}

/**
 * Cree ou met a jour une recette. Renvoie la liste complete des repas types.
 *
 * Une recette modifiee garde sa place et son identifiant : la supprimer
 * puis la recreer la ferait changer de rang dans la liste du Journal.
 * Sans ingredient, rien n'est ecrit — une recette vide n'a rien a ajouter.
 *
 * `origine` (ajout posterieur) : l'identifiant d'une recette du coach
 * reprise par le client, pour ne pas la lui faire ajouter deux fois.
 */
export function enregistrerRecette(liste, { id, nom, ingredients, portions, origine }) {
  const items = (ingredients || []).map((e) => ({
    name: e.name,
    baseName: e.baseName || null,
    grams: e.grams != null ? num(e.grams) : null,
    calories: num(e.calories),
    protein: num(e.protein),
    carbs: num(e.carbs),
    fat: num(e.fat)
  }));
  if (!items.length) return liste;

  const champs = {
    name: String(nom || "").trim() || "Recette",
    items,
    portions: Math.max(1, Math.round(num(portions) || 1)),
    recette: true,
    ...(origine ? { origine } : {})
  };

  const existante = id ? liste.find((r) => r.id === id) : null;
  const suivant = existante
    ? liste.map((r) => (r.id === id ? { ...r, ...champs } : r))
    : [{ id: uid(), mealType: null, createdAt: todayISO(), ...champs }, ...liste].slice(0, MAX_REPAS_TYPES);

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
