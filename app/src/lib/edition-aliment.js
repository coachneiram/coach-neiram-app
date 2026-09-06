/**
 * Corriger un aliment deja inscrit au journal.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI
 * ─────────────────────────────────────────────────────────────────────
 *
 * Jusqu'ici une ligne du journal ne pouvait qu'etre SUPPRIMEE. Pour
 * corriger une valeur, il fallait l'effacer et tout ressaisir — nom,
 * calories et trois macros — ce que personne ne fait. On garde donc le
 * chiffre approximatif, et le suivi derive doucement.
 *
 * Le cas qui a fait remonter le manque : l'estimation par photo. L'IA
 * annonce un ordre de grandeur honnete, et la cliente sait souvent mieux
 * qu'elle — « c'etait une petite portion », « il n'y avait pas d'huile ».
 * Sans correction possible, son seul choix est d'accepter un chiffre faux
 * ou de perdre la ligne.
 *
 * ─────────────────────────────────────────────────────────────────────
 * DEUX FACONS DE CORRIGER, SELON CE QUE L'ENTREE SAIT D'ELLE-MEME
 * ─────────────────────────────────────────────────────────────────────
 *
 * Une entree venue du catalogue porte sa quantite en grammes : corriger,
 * c'est le plus souvent dire « 150 g et non 200 ». Les macros suivent
 * alors proportionnellement, puisque le rapport au poids est connu.
 *
 * Une entree venue d'une photo ou d'une saisie libre ne porte pas de
 * quantite fiable. La corriger, c'est toucher directement aux valeurs.
 *
 * Le champ « quantite » n'apparait donc que quand il veut dire quelque
 * chose. L'afficher partout inviterait a redimensionner une assiette dont
 * personne ne connait le poids.
 */

import { num, round } from "./dates.js";

/** Les quatre valeurs qu'une ligne de journal porte toujours. */
export const CHAMPS_MACROS = ["calories", "protein", "carbs", "fat"];

/** Une entree sait-elle a quel poids ses valeurs correspondent ? */
export function porteUneQuantite(entree) {
  return !!entree && num(entree.grams) > 0;
}

/**
 * Remet les macros a l'echelle d'une nouvelle quantite.
 *
 * Le rapport vient de l'entree elle-meme — ses valeurs pour ses grammes —
 * et non d'une table exterieure : c'est vrai aussi bien pour un aliment du
 * catalogue que pour une estimation photo a laquelle un poids a ete donne.
 *
 * Rend null quand la mise a l'echelle n'a pas de sens, plutot que des
 * zeros : une quantite nulle ou absente n'est pas « zero calorie ».
 */
export function ajusterQuantite(entree, nouvellesGrammes) {
  if (!porteUneQuantite(entree)) return null;
  const g = num(nouvellesGrammes);
  if (!(g > 0)) return null;

  const facteur = g / num(entree.grams);
  const sortie = { grams: g };
  for (const champ of CHAMPS_MACROS) {
    sortie[champ] = round(num(entree[champ]) * facteur, 1);
  }
  return sortie;
}

/**
 * Construit l'entree corrigee a partir de la saisie de l'ecran.
 *
 * Une valeur laissee vide n'est PAS zero : elle veut dire « je n'ai pas
 * touche a celle-la ». Ecrire zero a la place effacerait silencieusement
 * une macro que la cliente n'a jamais voulu changer.
 */
export function entreeCorrigee(entree, saisie) {
  const sortie = { ...entree };

  const nom = String(saisie.name ?? "").trim();
  if (nom) sortie.name = nom;

  for (const champ of CHAMPS_MACROS) {
    const brut = saisie[champ];
    if (brut === "" || brut === null || brut === undefined) continue;
    sortie[champ] = num(brut);
  }

  if (porteUneQuantite(entree) && saisie.grams !== "" && saisie.grams != null) {
    sortie.grams = num(saisie.grams);
  }

  return sortie;
}

/**
 * La saisie est-elle acceptable ?
 *
 * On refuse le vide total et les valeurs negatives. On n'impose rien de
 * plus : un aliment a 0 kcal existe (une tisane), et interdire une valeur
 * inhabituelle ferait perdre du temps a quelqu'un qui a raison.
 */
export function saisieValide(saisie) {
  if (!String(saisie.name ?? "").trim()) return { ok: false, raison: "Donne un nom à cet aliment." };
  for (const champ of [...CHAMPS_MACROS, "grams"]) {
    const brut = saisie[champ];
    if (brut === "" || brut === null || brut === undefined) continue;
    if (!Number.isFinite(Number(brut)) || Number(brut) < 0) {
      return { ok: false, raison: "Les valeurs doivent être des nombres positifs." };
    }
  }
  return { ok: true };
}

/** La saisie initiale du formulaire, a partir d'une entree existante. */
export function saisieDepuis(entree) {
  const s = { name: entree.name ?? "" };
  for (const champ of CHAMPS_MACROS) s[champ] = String(num(entree[champ]) || "");
  if (porteUneQuantite(entree)) s.grams = String(num(entree.grams));
  return s;
}
