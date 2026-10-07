/**
 * « Quoi de neuf » : les nouveautes annoncees au client a l'ouverture.
 *
 * Ajout du 7 octobre 2026, a la demande du coach. Une annonce n'apparait
 * qu'une fois par telephone. Toutes les mises a jour n'en meritent pas une :
 * le coach decide, en fusionnant la PR qui ajoute l'entree ci-dessous.
 *
 * Pour annoncer une nouveaute : ajouter une entree EN TETE de NOUVEAUTES,
 * avec un identifiant jamais utilise. Ne jamais reutiliser ni renommer un
 * identifiant : un client qui l'a deja vue la reverrait.
 *
 * Un client qui installe l'application ne recoit pas l'historique : tout
 * lui est neuf, et une liste de « nouveautes » le jour de son arrivee
 * n'aurait aucun sens.
 */

import { enLigne } from "./semaine.js";

export const CLE_NOUVEAUTES = "cn_nouveautes_vues";

/** Au-dela, la fenetre devient une liste qu'on ne lit plus. */
export const NOUVEAUTES_MAX = 5;

/**
 * Les plus recentes d'abord. `onglet` : ecran ouvert par le bouton ;
 * `ouvre: "aide"` : le bouton ouvre l'Aide.
 * `pour: "enligne"` : annonce reservee aux clients du coaching en ligne.
 */
export const NOUVEAUTES = [
  {
    id: "2026-10-07-aide",
    date: "2026-10-07",
    titre: "Une aide dans ton appli",
    texte:
      "Réglages → Aide et questions fréquentes : installer l'appli, recevoir tes rappels, changer de téléphone sans rien perdre, noter tes repas plus vite… Tu peux aussi y tester tes notifications.",
    ouvre: "aide",
    bouton: "Voir l'aide"
  },
  {
    id: "2026-10-06-progression",
    date: "2026-10-06",
    titre: "Ta progression en courbes",
    texte:
      "Dans Mesures : ton poids et tes mensurations depuis ta première mesure, chacun avec sa courbe. Touche une mesure pour la voir en grand. Ta progression apparaît aussi dans Tendances et dans ton bilan.",
    onglet: "mensurations",
    bouton: "Voir mes mesures"
  },
  {
    id: "2026-10-05-recettes",
    date: "2026-10-05",
    titre: "De nouvelles recettes chaque lundi",
    texte:
      "Ton coach ajoute des recettes chaque semaine, adaptées à ton objectif et à ton régime : Repas → Mes plats → Recettes du coach.",
    onglet: "repas",
    bouton: "Voir les recettes"
  },
  {
    id: "2026-10-04-synchro",
    date: "2026-10-04",
    pour: "enligne",
    titre: "Tes séances arrivent chez ton coach",
    texte:
      "Tes séances pointées et ton résumé de la semaine partent automatiquement à ton coach. Deux créneaux manqués ? « Prévenir mon coach » t'aide à le lui dire en un message.",
    onglet: "entrainements",
    bouton: "Voir mes séances"
  },
  {
    id: "2026-10-03-contrat",
    date: "2026-10-03",
    titre: "Ton contrat et tes trophées",
    texte:
      "Dans Séances → Mes trophées : indique ta formule et ta date de début pour suivre le temps restant. Les trophées comptent maintenant jusqu'à 1000 séances et ton ancienneté.",
    onglet: "entrainements",
    bouton: "Voir mes trophées"
  },
  {
    id: "2026-10-01-partage",
    date: "2026-10-01",
    titre: "Partage tes progrès",
    texte:
      "Dans Tendances : une carte de tes progrès à partager en story, et un bouton pour inviter un ami à te rejoindre chez ton coach.",
    onglet: "tendances",
    bouton: "Voir ma carte"
  }
];

/** Annonces que ce client peut recevoir, selon sa formule. */
export function nouveautesPour(profil, liste = NOUVEAUTES) {
  return liste.filter((n) => n.pour !== "enligne" || enLigne(profil));
}

/**
 * Ce qu'il faut montrer a l'ouverture.
 *
 * `vues` vaut null quand le telephone n'a jamais rien enregistre :
 *   - client deja installe (profil existant) : il a connu l'ancienne
 *     application, les nouveautes le concernent ;
 *   - nouvelle installation (pas encore de profil) : rien a montrer, et
 *     tout est marque vu pour ne rien lui annoncer plus tard.
 */
export function nouveautesAMontrer({ vues, profil, liste = NOUVEAUTES, max = NOUVEAUTES_MAX }) {
  if (!profil) return [];
  const dejaVues = new Set(Array.isArray(vues) ? vues : []);
  return nouveautesPour(profil, liste)
    .filter((n) => !dejaVues.has(n.id))
    .slice(0, max);
}

/**
 * En local (tests de fumee, essais sur l'ordinateur), la fenetre ne s'ouvre
 * que sur demande explicite (`cn_nouveautes_locale` = "1") : chaque script
 * de fumee simule un client deja installe, et la fenetre recouvrirait
 * l'ecran qu'il teste. Meme garde-fou que pour la synchro coach.
 */
export function annoncesAutorisees(env = globalThis) {
  try {
    const hote = env.location && env.location.hostname;
    if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hote || "")) return true;
    return env.localStorage && env.localStorage.getItem("cn_nouveautes_locale") === "1";
  } catch (e) {
    return true;
  }
}

export function lireVues(stockage = globalThis.localStorage) {
  try {
    const brut = stockage && stockage.getItem(CLE_NOUVEAUTES);
    if (brut == null) return null;
    const v = JSON.parse(brut);
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

/**
 * Marque vues TOUTES les annonces connues, pas seulement celles affichees :
 * au-dela de NOUVEAUTES_MAX, les plus anciennes ne doivent pas ressortir a
 * l'ouverture suivante comme si elles etaient nouvelles.
 */
export function marquerToutVu(stockage = globalThis.localStorage, liste = NOUVEAUTES) {
  const ids = [...new Set([...(lireVues(stockage) || []), ...liste.map((n) => n.id)])];
  try {
    stockage && stockage.setItem(CLE_NOUVEAUTES, JSON.stringify(ids));
  } catch (e) {
    // Stockage plein ou refuse : la fenetre reviendra, ce n'est pas grave.
  }
  return ids;
}
