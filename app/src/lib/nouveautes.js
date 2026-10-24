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
 * `ouvre: "aide"` : le bouton ouvre l'Aide ; `ouvre: "guide"` : le guide des tutos.
 * `pour: "enligne"` : annonce reservee aux clients du coaching en ligne.
 */
export const NOUVEAUTES = [
  {
    id: "2026-10-24-communaute",
    date: "2026-10-24",
    titre: "La communauté Team Neiram",
    texte:
      "Dans Séances, carte « Team Neiram » : classements entre clients du coach (régularité, force, course, natation), athlète du mois et mur des transformations. Tu n'y apparais que si tu le choisis, et tu peux tout retirer.",
    onglet: "entrainements",
    bouton: "Voir la communauté"
  },
  {
    id: "2026-10-24-defis-amis",
    date: "2026-10-24",
    titre: "Défis entre amis",
    texte:
      "Dans le Journal : lance un défi de 7 jours avec d'autres clients du coach (pas, séances ou minutes de sport), envoie le lien ou le code et suis le classement. Seuls ton pseudo et ton total sont visibles.",
    onglet: "journal",
    bouton: "Lancer un défi"
  },
  {
    id: "2026-10-24-tutos-raccourcis",
    date: "2026-10-24",
    titre: "Un « ? » sur chaque carte",
    texte:
      "Touche le « ? » à côté d'un titre : le mode d'emploi de la fonction s'ouvre. Sur Android, garde le doigt sur l'icône de l'appli pour ajouter un verre d'eau, lancer ta séance ou noter un repas.",
    ouvre: "guide",
    bouton: "Voir le guide"
  },
  {
    id: "2026-10-24-menu-nutrition",
    date: "2026-10-24",
    titre: "Ton menu de la semaine",
    texte:
      "Repas → « Menu » : 7 jours calés sur tes objectifs, avec la liste de courses. En Nutrition : un repère d'après tes données (tes objectifs restent ceux de ton coach), les 14 allergènes, la catégorie de poids et les compléments utiles.",
    onglet: "repas",
    bouton: "Voir mon menu"
  },
  {
    id: "2026-10-24-tous-sports",
    date: "2026-10-24",
    titre: "Tous tes sports, tes performances",
    texte:
      "Course, vélo, foot, yoga… : note tous tes sports (« Activité »), suis un programme guidé, vois ton année se remplir. Note tes maxis et tes chronos pour ton niveau officiel ; ta transformation et tes photos avant / après. Ton coach le voit.",
    onglet: "entrainements",
    bouton: "Voir mes séances"
  },
  {
    id: "2026-10-24-habitudes",
    date: "2026-10-24",
    titre: "Habitudes, leçons et déclics",
    texte:
      "Dans le Journal : coche tes petites habitudes (série et joker), lis la leçon du jour en 2 minutes. Dans Tendances, « Mes déclics » montre ce qui va avec tes meilleures journées. Et de nouveaux trophées.",
    onglet: "journal",
    bouton: "Voir mon journal"
  },
  {
    id: "2026-10-24-sommeil-stress",
    date: "2026-10-24",
    titre: "Sommeil et stress d'après les études",
    texte:
      "Conseils revus d'après les études, 5 minutes de respiration guidée, la régularité de ton lever et « Quand en parler à un médecin ». Chaque conseil a sa source.",
    onglet: "sommeil",
    bouton: "Voir le sommeil"
  },
  {
    id: "2026-10-24-seance-guidee",
    date: "2026-10-24",
    titre: "Une séance plus facile à suivre",
    texte:
      "Chaque exercice est numéroté et passe au vert quand il est fini. La charge proposée est expliquée, tes séries faites et « Enregistrer » restent en bas de l'écran, et la durée se calcule toute seule.",
    onglet: "entrainements",
    bouton: "Voir mes séances"
  },
  {
    id: "2026-10-24-forme-consignes",
    date: "2026-10-24",
    titre: "Ta forme du jour et les consignes",
    texte:
      "Note ton sommeil, ton énergie et ton stress dans le Journal : l'onglet Séances te dit comment aborder ta séance du jour. Les consignes de ton coach s'affichent sous chaque exercice.",
    onglet: "entrainements",
    bouton: "Voir mes séances"
  },
  {
    id: "2026-10-24-defis",
    date: "2026-10-24",
    titre: "Un défi de 30 jours",
    texte:
      "Dans le Journal, relève un défi : bouger chaque jour, 2 L d'eau, 7 h de sommeil, noter tes repas… Il se valide tout seul avec ce que tu notes déjà.",
    onglet: "journal",
    bouton: "Voir le défi"
  },
  {
    id: "2026-10-24-tutos",
    date: "2026-10-24",
    titre: "Un tuto pour chaque écran",
    texte:
      "Touche le livre en haut de l'écran : un tuto pas à pas t'explique l'écran où tu es. Tous les tutos sont aussi dans Réglages → « Guide d'utilisation (tutos) ».",
    ouvre: "guide",
    bouton: "Voir le guide"
  },
  {
    id: "2026-10-24-repos-barre",
    date: "2026-10-24",
    titre: "Repos libre, disques et échauffement",
    texte:
      "Dans tes séances : un repos jusqu'à 10 min, en durée libre ou en chronomètre. Sous chaque exercice, « Disques & échauffement » te dit quoi mettre sur la barre et comment t'échauffer. Et 17 techniques dans « Options ».",
    onglet: "entrainements",
    bouton: "Voir mes séances"
  },
  {
    // Texte valide par le coach le 22 octobre 2026.
    id: "2026-10-22-carnet-series",
    date: "2026-10-22",
    titre: "Ton carnet d'entraînement",
    texte:
      "Note tes séries une par une : charge, reps, RPE. Tu vois ce que tu as fait la dernière fois, et le repos se lance tout seul quand tu coches une série.",
    onglet: "entrainements",
    bouton: "Ouvrir mes séances"
  },
  {
    id: "2026-10-14-diete-flexible",
    date: "2026-10-14",
    titre: "Ta semaine compte plus que ta journée",
    texte:
      "Onglet Nutrition : ton budget de la semaine, jour par jour. Un écart (raclette, resto) ? Pas de jeûne : l'appli te dit combien viser les jours suivants pour lisser. Et garde 7 à 10 % de tes calories pour un plaisir prévu.",
    onglet: "nutrition",
    bouton: "Voir ma semaine"
  },
  {
    id: "2026-10-14-evolution",
    date: "2026-10-14",
    titre: "Ton évolution, jour après jour",
    texte:
      "Tendances → Mon évolution : tes pas, tes calories, ton sommeil, tes séances, ton poids et tes mensurations, au jour, à la semaine, au mois ou à l'année. Touche une barre pour voir le détail, et lis tes points clés.",
    onglet: "tendances",
    bouton: "Voir mon évolution"
  },
  {
    id: "2026-10-12-dictee",
    date: "2026-10-12",
    titre: "Dicte tes plats, recettes et séances",
    texte:
      "Plus besoin de tout taper : dans Repas, « Dicter un plat » ou « Dicter toute la recette » ; dans une séance, « Dicter ma séance ». Tu parles, l'IA remplit, tu vérifies avant d'enregistrer.",
    onglet: "repas",
    bouton: "Essayer"
  },
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
