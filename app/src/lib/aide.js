/**
 * Aide et questions frequentes, dans Reglages.
 *
 * Ajout du 7 octobre 2026, a la demande du coach : reprise des deux guides
 * PDF envoyes aux clients (« Nouveautes de ton appli », septembre et
 * octobre 2026), plus l'installation, les rappels, le changement de
 * telephone et la confidentialite.
 *
 * `libelles` : les textes de l'application que la reponse cite. Un test
 * verifie qu'ils existent toujours dans le code : si un bouton est renomme,
 * le test echoue et la reponse est corrigee avant que le client ne cherche
 * un bouton qui n'existe plus.
 */

import { PARRAINAGE } from "./carte-progres.js";
import { PALIERS_SERIE } from "./resume-semaine.js";

const listePaliers = (p) => `${p.slice(0, -1).join(", ")} et ${p[p.length - 1]}`;

export const AIDE = [
  {
    id: "installer",
    titre: "Installer et mettre à jour",
    questions: [
      {
        id: "installer-app",
        question: "Comment installer l'appli sur mon téléphone ?",
        reponse: [
          "Sur iPhone : ouvre le lien de l'appli dans Safari, touche le bouton Partager (le carré avec une flèche), puis « Sur l'écran d'accueil » et « Ajouter ».",
          "Sur Android : dans Chrome, touche « Installer » dans le bandeau de l'appli, ou le menu ⋮ puis « Installer l'application ».",
          "Ensuite, ouvre toujours l'appli depuis son icône : c'est indispensable pour recevoir les rappels sur iPhone."
        ],
        libelles: []
      },
      {
        id: "mettre-a-jour",
        question: "Je ne vois pas les nouveautés : comment mettre l'appli à jour ?",
        reponse: [
          "Ferme complètement l'appli (fais-la glisser hors de tes applis ouvertes), puis rouvre-la avec une connexion internet. Si tu ne vois pas encore les nouveautés, recommence une fois.",
          "Tes données restent sur ton téléphone : rien n'est perdu."
        ],
        libelles: []
      },
      {
        id: "rappels",
        question: "Je ne reçois pas les rappels",
        reponse: [
          "Ouvre Réglages et touche « Tester les notifications » : l'appli te dit ce qui bloque.",
          "Sur iPhone : l'appli doit être installée sur l'écran d'accueil et ouverte depuis son icône. Vérifie aussi Réglages de l'iPhone → Notifications → Coach Neiram : « Bannières » et « Centre de notifications » doivent être cochés.",
          "Les rappels sont calculés par l'appli elle-même : ils partent quand elle est ouverte ou en arrière-plan depuis peu, pas quand elle est complètement fermée."
        ],
        libelles: ["Tester les notifications"]
      },
      {
        id: "changer-telephone",
        question: "Je change de téléphone : comment garder mes données ?",
        reponse: [
          "Tes données sont enregistrées uniquement sur ton téléphone. Avant de changer : Réglages → Sauvegarde des données → « Exporter mes données », et garde le fichier (Drive, mail…).",
          "Sur le nouveau téléphone : installe l'appli, puis Réglages → « Restaurer » et choisis ce fichier. Pense à exporter régulièrement, c'est ton seul filet."
        ],
        libelles: ["Sauvegarde des données", "Exporter mes données", "Restaurer"]
      }
    ]
  },
  {
    id: "repas",
    titre: "Noter tes repas",
    questions: [
      {
        id: "routine",
        question: "Ma routine en 30 secondes par jour",
        reponse: [
          "Le matin : même petit-déjeuner qu'hier ? « Reprendre celui d'hier ».",
          "À chaque repas : un « + » par fruit, légumes et protéines. Plat maison ? Ta recette, à la part.",
          "Pas le temps : « Décrire », une phrase dictée, l'IA estime, tu valides.",
          "Le dimanche : regarde ton résumé dans Tendances, puis envoie ton bilan à ton coach."
        ],
        libelles: ["Reprendre celui", "Décrire"]
      },
      {
        id: "recette-maison",
        question: "Comment créer une recette maison, part par part ?",
        reponse: [
          "Va dans Repas → Mes plats → « Nouvelle recette ». Donne-lui un nom et indique le nombre de parts que tu coupes vraiment (ex. 6).",
          "Ajoute chaque ingrédient avec la quantité utilisée pour toute la recette (recherche, photo ou code-barres). Le tableau affiche ce que coûtent 1, 2, 3 parts et la recette entière. Touche « Enregistrer la recette ».",
          "Pour en manger : dans le Journal, touche « + ajouter » sur ton repas, onglet Repas, puis ta recette et le nombre de parts (1,5 pour une part et demie). Recette modifiée ? Touche le crayon à côté d'elle dans Mes plats."
        ],
        libelles: ["Nouvelle recette", "Enregistrer la recette", "Mes plats"]
      },
      {
        id: "reprendre-hier",
        question: "Comment reprendre les repas d'hier ?",
        reponse: [
          "Toute la journée : quand rien n'est encore noté aujourd'hui, touche « Reprendre toute la journée d'hier », sous ton total de calories.",
          "Un seul repas : sous un repas vide, touche « Reprendre celui d'hier ».",
          "La copie est indépendante : corriger une quantité aujourd'hui ne change pas hier. Tu peux retirer un aliment copié avec la corbeille."
        ],
        libelles: ["Reprendre toute la journée", "Reprendre celui"]
      },
      {
        id: "portions",
        question: "Comment compter mes portions de fruits, légumes et protéines ?",
        reponse: [
          "Dans le Journal, carte « Portions du jour » : un appui sur « + » par portion, « − » pour en retirer une.",
          "1 portion de fruit : 1 pomme, 1 banane, 1 poignée de fruits rouges. De légumes : 1 poignée, crus ou cuits, ou un bol de soupe. De protéines : 1 paume de main de viande ou de poisson, 2 œufs, 1 portion de tofu.",
          "Tes repères : 5 fruits et légumes par jour, 3 portions de protéines (une à chaque repas)."
        ],
        libelles: ["Portions du jour"]
      },
      {
        id: "dicter",
        question: "Comment décrire mon repas à la voix ?",
        reponse: [
          "Dans le Journal, touche « + ajouter », onglet Aliments, puis « Décrire ». Touche « Dicter » et parle, ou tape ta description, puis « Estimer avec l'IA ». Vérifie les valeurs avant d'ajouter.",
          "Donne des quantités dès que tu les connais (« 150 g de riz », « 2 œufs ») : l'estimation sera plus juste.",
          "Pas de bouton « Dicter » ? Sur certains téléphones (surtout iPhone, appli installée), touche le micro de ton clavier dans le champ de texte : ça marche pareil."
        ],
        libelles: ["Décrire", "Dicter", "Estimer avec l'IA"]
      },
      {
        id: "nutriscore",
        question: "Que veulent dire le Nutri-Score et NOVA ?",
        reponse: [
          "Nutri-Score : la qualité nutritionnelle, de A (la meilleure) à E (la moins bonne).",
          "NOVA : le degré de transformation, de 1 (brut : fruits, légumes, viande, œufs) à 4 (ultra-transformé : biscuits, sodas, plats industriels).",
          "Pas besoin de bannir les D ou les NOVA 4 : entre deux produits, prends la meilleure lettre et le chiffre NOVA le plus bas. Tes calories et tes protéines comptent en premier."
        ],
        libelles: []
      },
      {
        id: "recettes-coach",
        question: "Où trouver les recettes du coach ?",
        reponse: [
          "Repas → Mes plats → Recettes du coach. De nouvelles recettes chaque semaine, triées selon ton objectif, filtrées selon ton régime et tes allergies (à renseigner dans ton profil).",
          "« Ajouter à mes recettes » te permet ensuite de la noter dans ton journal en un geste."
        ],
        libelles: ["Recettes du coach", "Ajouter à mes recettes"]
      }
    ]
  },
  {
    id: "seances",
    titre: "Séances et trophées",
    questions: [
      {
        id: "suivi-coach",
        question: "Comment indiquer depuis quand je suis suivi(e) ?",
        reponse: [
          "Séances → Mes trophées → « Ton suivi avec le coach » → Ajouter. Indique la date de ton premier rendez-vous et le nombre total de séances faites ensemble. Tu ne connais pas le jour exact ? Mets le 1er du mois.",
          "Ensuite, chaque séance que tu notes s'ajoute toute seule au total."
        ],
        libelles: ["Mes trophées", "Ton suivi avec le coach"]
      },
      {
        id: "trophees",
        question: "Comment fonctionnent les trophées ?",
        reponse: [
          "Séances → Mes trophées. Trois familles : tes séances (de la première jusqu'au Club des 1000), tes semaines tenues d'affilée, et ton ancienneté (de 1 mois à 5 ans de suivi).",
          "Tout ton historique compte : si tu es suivi(e) depuis 2022, tu débloques tout de suite les trophées gagnés."
        ],
        libelles: ["Mes trophées", "Club des 1000"]
      },
      {
        id: "exercice-perso",
        question: "Un exercice manque dans la liste ?",
        reponse: [
          "Dans ta séance, ouvre la Bibliothèque puis « Ton exercice n'est pas dans la liste ? ». Tape son nom : il s'ajoute à ta séance et reste dans « Mes exercices » pour la prochaine fois."
        ],
        libelles: ["Bibliothèque", "Ton exercice n'est pas dans la liste", "Mes exercices"]
      }
    ]
  },
  {
    id: "progres",
    titre: "Tes progrès",
    questions: [
      {
        id: "mesures",
        question: "Comment suivre mes mensurations et mon poids ?",
        reponse: [
          "Mesures → « Nouvelle prise » : tes tours (taille, hanches, bras…) et ton poids. Dès la deuxième prise, « Ma progression » affiche l'écart depuis ta première mesure et une courbe pour chacun. Touche une mesure pour la voir en grand.",
          "Mesure-toi au même moment de la journée, idéalement toutes les 2 à 4 semaines."
        ],
        libelles: ["Nouvelle prise", "Ma progression"]
      },
      {
        id: "resume-semaine",
        question: "Où voir le résumé de ma semaine ?",
        reponse: [
          "Tendances, carte « Ma nutrition — 7 derniers jours » : jours notés, jours dans ta cible, moyennes par jour, ton meilleur jour et le point à travailler.",
          "Les moyennes ne comptent que les jours où tu as noté tes repas : note au moins 4 jours sur 7."
        ],
        libelles: ["Ma nutrition — 7 derniers jours"]
      },
      {
        id: "serie",
        question: "C'est quoi la série de jours ?",
        reponse: [
          `En haut du Journal, les jours notés d'affilée (un repas, ton eau, ta forme ou une séance). Des paliers sont fêtés à ${listePaliers(PALIERS_SERIE)} jours.`
        ],
        libelles: ["jours notés d'affilée"]
      },
      {
        id: "partager",
        question: "Comment partager mes progrès ?",
        reponse: [
          "Tendances → « Partager mes progrès » : une image prête pour ta story Instagram ou WhatsApp, avec tes semaines de suivi et tes séances. Ton poids n'y apparaît que si tu le choisis."
        ],
        libelles: ["Partager mes progrès"]
      }
    ]
  },
  {
    id: "coach",
    titre: "Ton coach",
    questions: [
      {
        id: "bilan",
        question: "Comment envoyer mon bilan de la semaine ?",
        reponse: [
          "Le dimanche, dans Tendances, carte « Bilan de la semaine » : ajoute tes photos si tu veux, puis « Envoyer sans bilan IA » (ou génère d'abord le bilan IA). Choisis WhatsApp ou ton mail."
        ],
        libelles: ["Bilan de la semaine", "Envoyer sans bilan IA"]
      },
      {
        id: "parrainage",
        question: "Comment fonctionne le parrainage ?",
        reponse: [
          `Tendances → Parrainage → « Inviter un ami ». ${PARRAINAGE.condition} Tu gagnes alors, ${PARRAINAGE.precision} : ${PARRAINAGE.paliers
            .map((p) => `${p.formule.toLowerCase()} : ${p.gain.toLowerCase()}`)
            .join(" ; ")}.`
        ],
        libelles: ["Parrainage", "Inviter un ami"]
      },
      {
        id: "donnees",
        question: "Qui voit mes données ?",
        reponse: [
          "Ton suivi est enregistré sur ton téléphone, nulle part ailleurs. Ton coach reçoit ce que tu lui envoies : ton bilan, et en coaching en ligne tes séances pointées, ton résumé de la semaine et les alertes de séances manquées.",
          "Les fonctions IA (photo de repas, description, bilan IA) reçoivent ce que tu leur donnes, le temps de l'analyse."
        ],
        libelles: []
      },
      {
        id: "souci",
        question: "Un souci, une idée ?",
        reponse: [
          "Écris directement à ton coach sur WhatsApp, avec une capture d'écran si tu peux : il corrige vite. Indique aussi la version affichée en bas des Réglages."
        ],
        libelles: []
      }
    ]
  }
];

/** Toutes les questions, a plat. */
export const toutesLesQuestions = () => AIDE.flatMap((s) => s.questions);
