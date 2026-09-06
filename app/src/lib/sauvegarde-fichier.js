/**
 * Lire un fichier de sauvegarde, et le restaurer.
 *
 * Ce module existe pour une seule raison : deux ecrans proposent desormais
 * de restaurer — les reglages, et l'ecran de bienvenue. Ecrire deux fois la
 * lecture du fichier, c'est se garantir que l'un des deux finira par
 * diverger de l'autre, et que le chemin le moins emprunte sera celui qui
 * casse en silence.
 *
 * La validation, elle, reste dans restaurerSauvegarde() : c'est elle qui
 * refuse un fichier etranger, et elle ne doit exister qu'a un seul endroit.
 */

import { restaurerSauvegarde } from "./stockage.js";

/**
 * Lit le fichier choisi et restaure son contenu.
 *
 * Rend le nombre de cles ecrites. Leve une erreur portant un `code` que
 * l'appelant peut traduire :
 *
 *   lecture-impossible   le navigateur n'a pas su lire le fichier
 *   fichier-non-reconnu  ce n'est pas une sauvegarde Coach Neiram
 *   sauvegarde-vide      c'est le bon format, mais rien d'exploitable
 */
export function restaurerDepuisFichier(fichier, LecteurFichier = FileReader) {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new LecteurFichier();

    lecteur.onerror = () => rejeter(erreur("lecture-impossible"));
    lecteur.onload = () => {
      let contenu;
      try {
        contenu = JSON.parse(String(lecteur.result));
      } catch (e) {
        // Un fichier illisible n'est pas une sauvegarde abimee : c'est le
        // mauvais fichier. Les deux se disent differemment au client.
        return rejeter(erreur("fichier-non-reconnu"));
      }
      try {
        resoudre(restaurerSauvegarde(contenu));
      } catch (e) {
        rejeter(erreur(e.message));
      }
    };

    lecteur.readAsText(fichier);
  });
}

function erreur(code) {
  const e = new Error(code);
  e.code = code;
  return e;
}

/** Traduit un code d'erreur en phrase affichable. */
export function messageErreurRestauration(code) {
  if (code === "sauvegarde-vide") {
    return "Ce fichier est bien une sauvegarde, mais il ne contient aucune donnée Coach Neiram.";
  }
  if (code === "lecture-impossible") {
    return "Le fichier n'a pas pu être lu. Réessaie, ou choisis-le depuis un autre dossier.";
  }
  return "Fichier de sauvegarde invalide.";
}
