/**
 * Les 14 allergenes a declaration obligatoire dans l'UE (reglement INCO
 * 1169/2011), repris de l'app Neiram le 24/10/2026.
 *
 * POURQUOI UN FICHIER A PART : ALLERGENS (catalogues.js) est la liste de
 * l'application d'origine, verifiee a l'identique contre index.html par
 * tests/reglages.test.mjs. Elle pilote le filtrage des aliments : on n'y
 * touche pas. Les six allergenes manquants s'ajoutent ici, et les ecrans
 * comme les consignes IA lisent la liste complete.
 *
 * Les aliments du catalogue ne portent pas encore ces six etiquettes : ils
 * sont reperes dans les recettes (recettes-coach.js, REVELE), dans les
 * produits Open Food Facts (« Contient » / « Traces ») et dans les
 * reponses du Coach IA (consigne-coach.js, verifierReponse).
 */

import { ALLERGENS } from "./catalogues.js";

/** Les six allergenes UE absents de la liste d'origine. */
export const ALLERGENES_AJOUTES = [
  { id: "sesame", label: "Sésame" },
  { id: "moutarde", label: "Moutarde" },
  { id: "celeri", label: "Céleri" },
  { id: "sulfites", label: "Sulfites" },
  { id: "lupin", label: "Lupin" },
  { id: "mollusques", label: "Mollusques" }
];

/** Les 14 allergenes : ceux d'origine, dans leur ordre, puis les ajouts. */
export const TOUS_LES_ALLERGENES = [...ALLERGENS, ...ALLERGENES_AJOUTES];

/** Libelle d'un allergene ; son identifiant s'il est inconnu. */
export const libelleAllergene = (id) => TOUS_LES_ALLERGENES.find((a) => a.id === id)?.label || id;
