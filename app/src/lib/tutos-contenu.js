/**
 * Contenu des tutos (voir lib/tutos.js pour les regles).
 *
 * Repris de l'app Neiram le 24 octobre 2026 et adapte a l'app coach :
 * Coach IA au lieu de l'assistant, pas d'import Apple Sante, ecran Seances
 * de l'app coach, aucune mention d'abonnement (tout est ouvert aux
 * clients du coach).
 *
 * Ecriture : « tu », une action par etape, les boutons entre « » tels
 * qu'ils apparaissent (verifies par tests/tutos.test.mjs) ; les exemples de
 * saisie entre “ ”. Aucune promesse de resultat.
 */

export const TUTOS = [
  {
    id: "journal",
    onglet: "journal",
    principal: true,
    emoji: "📓",
    titre: "Le Journal",
    resume: "Ta journée en un écran : repas, eau, pas, poids et sommeil.",
    etapes: [
      {
        titre: "Tout s'enregistre tout seul",
        texte: "Chaque saisie est gardée dès que tu la fais, sans bouton à valider. Les flèches en haut changent de jour, pour compléter la veille par exemple."
      },
      {
        titre: "Note tes repas",
        texte: "Sous chaque repas, touche « + ajouter » : recherche, code-barres, photo, ou un plat que tu as déjà enregistré."
      },
      {
        titre: "Eau, portions et pas",
        texte: "Dans « Hydratation », un appui sur +250 ml par verre. « Portions du jour » compte tes fruits, légumes et protéines. Tes pas vont dans « Activité — pas du jour »."
      },
      {
        titre: "Poids et sommeil",
        texte: "Ton poids se note dans « Corps & composition », champ « Poids (kg) ». Plus bas, indique tes heures de « Coucher » et de « Lever » : la durée se calcule toute seule."
      },
      {
        titre: "Ton score du jour",
        texte: "L'anneau en haut résume ta journée : nutrition, entraînement, hydratation, pas et bien-être. Il se remplit au fil de tes saisies."
      }
    ],
    libelles: [
      "+ ajouter",
      "Hydratation",
      "Portions du jour",
      "Activité — pas du jour",
      "Corps & composition",
      "Poids (kg)",
      "Coucher",
      "Lever"
    ]
  },
  {
    id: "ajouter-aliment",
    onglet: "journal",
    emoji: "🔎",
    titre: "Ajouter un aliment",
    resume: "Chercher un aliment, choisir la quantité, l'ajouter au bon repas.",
    etapes: [
      {
        titre: "Ouvre le bon repas",
        texte: "Dans le Journal, touche « + ajouter » à droite du repas concerné (petit-déjeuner, déjeuner, collation ou dîner)."
      },
      {
        titre: "Cherche l'aliment",
        texte: "Onglet « Aliments », mode « Recherche » : tape le nom (“skyr”, “riz basmati”…) puis « Chercher »."
      },
      {
        titre: "Indique la quantité",
        texte: "Choisis le bon résultat, entre la quantité en grammes, puis touche « Ajouter ». Les calories et macros se calculent pour toi."
      },
      {
        titre: "Garde tes habitués",
        texte: "L'étoile « Ajouter aux favoris » met un aliment de côté : il apparaît ensuite en tête, sans le chercher."
      },
      {
        titre: "Tu connais déjà les valeurs ?",
        texte: "Onglet « Libre » : un nom, les kcal et les macros, puis « Ajouter »."
      }
    ],
    libelles: [
      "+ ajouter",
      "Aliments",
      "Recherche",
      "Chercher",
      "Ajouter",
      "Ajouter aux favoris",
      "Libre"
    ]
  },
  {
    id: "code-barres",
    onglet: "journal",
    emoji: "🏷️",
    titre: "Scanner un code-barres",
    resume: "Un produit emballé, ses valeurs en un geste.",
    etapes: [
      {
        titre: "Ouvre le scanner",
        texte: "« + ajouter » sous un repas, puis le mode « Code-barres »."
      },
      {
        titre: "Photographie le code",
        texte: "Touche « Photographier le code-barres » et cadre-le de près, bien à plat. L'app lit le numéro sur la photo."
      },
      {
        titre: "Ou tape le numéro",
        texte: "La photo ne passe pas ? Tape les chiffres écrits sous le code-barres."
      },
      {
        titre: "Ajoute",
        texte: "Indique la « Quantité (g) » et touche « Ajouter »."
      }
    ],
    libelles: [
      "+ ajouter",
      "Code-barres",
      "Photographier le code-barres",
      "Quantité (g)",
      "Ajouter"
    ]
  },
  {
    id: "photo-ia",
    onglet: "journal",
    emoji: "📸",
    titre: "Photo de repas analysée",
    resume: "Une photo de ton assiette, l'IA estime calories et macros.",
    etapes: [
      {
        titre: "Choisis « Photo IA »",
        texte: "« + ajouter » sous un repas, onglet « Aliments », puis le mode « Photo IA »."
      },
      {
        titre: "Prends la photo",
        texte: "« Photographier » ou « Choisir une photo ». Toute l'assiette dans le cadre, vue de dessus, avec une bonne lumière : l'estimation sera plus juste."
      },
      {
        titre: "Vérifie, puis ajoute",
        texte: "Corrige le nom ou les valeurs si besoin, puis « Ajouter ». C'est une estimation : ajuste les quantités que tu connais."
      }
    ],
    libelles: [
      "Photo IA",
      "Photographier",
      "Choisir une photo",
      "Ajouter"
    ]
  },
  {
    id: "decrire",
    onglet: "journal",
    emoji: "🎤",
    titre: "Décrire un repas en mots",
    resume: "Une phrase, tapée ou dictée, et l'IA estime le repas.",
    etapes: [
      {
        titre: "Choisis « Décrire »",
        texte: "« + ajouter » sous un repas, onglet « Aliments », puis le mode « Décrire »."
      },
      {
        titre: "Raconte ton repas",
        texte: "Tape ta description ou touche « Dicter » et parle. Donne les quantités que tu connais : “150 g de riz, 2 œufs, une pomme”."
      },
      {
        titre: "Estime et vérifie",
        texte: "Touche « Estimer avec l'IA », vérifie les valeurs, puis « Ajouter »."
      }
    ],
    libelles: [
      "Décrire",
      "Dicter",
      "Estimer avec l'IA",
      "Ajouter"
    ]
  },
  {
    id: "reprendre",
    onglet: "journal",
    emoji: "🔁",
    titre: "Reprendre et enregistrer un repas",
    resume: "Tes repas qui reviennent, notés en un appui.",
    etapes: [
      {
        titre: "Même journée qu'hier ?",
        texte: "Quand rien n'est encore noté aujourd'hui, « Reprendre toute la journée » apparaît sous ton total de calories."
      },
      {
        titre: "Même repas qu'hier ?",
        texte: "Sous un repas vide, touche « Reprendre celui » d'hier. La copie est indépendante : modifier aujourd'hui ne change pas hier."
      },
      {
        titre: "Garde un repas type",
        texte: "Sous un repas rempli, « Enregistrer ce repas » le garde avec un nom (“Petit-déj du matin”)."
      },
      {
        titre: "Retrouve-le",
        texte: "« + ajouter », onglet « Repas » : tes repas enregistrés et tes recettes sont là, à ajouter d'un toucher."
      }
    ],
    libelles: [
      "Reprendre toute la journée",
      "Reprendre celui",
      "Enregistrer ce repas",
      "+ ajouter",
      "Repas"
    ]
  },
  {
    id: "repas",
    onglet: "repas",
    principal: true,
    emoji: "🍽️",
    titre: "L'onglet Repas",
    resume: "Tes plats, tes recettes, tes courses et le Coach IA.",
    etapes: [
      {
        titre: "Quatre espaces",
        texte: "En haut : « Mes plats », « Courses », « Aliments » et « Coach IA »."
      },
      {
        titre: "Tes plats habituels",
        texte: "« Nouveau plat » : un nom, les kcal et les macros d'une portion. Tu peux aussi « Importer un aliment » depuis la recherche, une photo ou un code-barres."
      },
      {
        titre: "Tes recettes maison",
        texte: "« Nouvelle recette » : le nombre de parts et les ingrédients de toute la recette. L'app calcule ce que coûte une part."
      },
      {
        titre: "Pour en manger",
        texte: "Dans le Journal, « + ajouter » sous le repas : tes recettes sont dans l'onglet « Repas », tes plats dans « Mes plats »."
      }
    ],
    libelles: [
      "Mes plats",
      "Courses",
      "Aliments",
      "Coach IA",
      "Nouveau plat",
      "Importer un aliment",
      "Nouvelle recette",
      "+ ajouter"
    ]
  },
  {
    id: "recette-maison",
    onglet: "repas",
    emoji: "🥘",
    titre: "Créer une recette maison",
    resume: "Une recette, ses parts, et une part notée en un toucher.",
    etapes: [
      {
        titre: "Nouvelle recette",
        texte: "Repas → « Mes plats » → « Nouvelle recette ». Remplis « Nom de la recette » et le « Nombre de parts » que tu coupes vraiment."
      },
      {
        titre: "Les ingrédients",
        texte: "« Ajouter un ingrédient » pour chacun, avec la quantité utilisée pour TOUTE la recette (recherche, photo ou code-barres)."
      },
      {
        titre: "Enregistre",
        texte: "Le tableau montre ce que valent 1, 2, 3 parts et la recette entière. Touche « Enregistrer la recette »."
      },
      {
        titre: "Mange-en une part",
        texte: "Journal → « + ajouter » → onglet « Repas » → ta recette, puis le nombre de parts (1,5 pour une part et demie)."
      },
      {
        titre: "Pressé ?",
        texte: "« Dicter toute la recette » : dis le nom, les parts et les ingrédients, l'IA remplit la fiche. Tu vérifies avant d'enregistrer."
      }
    ],
    libelles: [
      "Mes plats",
      "Nouvelle recette",
      "Nom de la recette",
      "Nombre de parts",
      "Ajouter un ingrédient",
      "Enregistrer la recette",
      "+ ajouter",
      "Dicter toute la recette"
    ]
  },
  {
    id: "courses",
    onglet: "repas",
    emoji: "🛒",
    titre: "Liste de courses",
    resume: "Une liste prête, rayon par rayon, à cocher au magasin.",
    etapes: [
      {
        titre: "Ouvre la liste",
        texte: "Repas → « Courses ». Les articles sont rangés par rayon."
      },
      {
        titre: "Adaptée à toi",
        texte: "« Adapter à mon profil » masque les articles incompatibles avec ton régime et tes allergies."
      },
      {
        titre: "Ajoute tes articles",
        texte: "Dans « Mes ajouts », tape un article puis « OK », ou « Scanner un code-barres »."
      },
      {
        titre: "Au magasin",
        texte: "Coche au fur et à mesure. Pour les courses suivantes, « Réinitialiser » décoche tout."
      }
    ],
    libelles: [
      "Courses",
      "Adapter à mon profil",
      "Mes ajouts",
      "OK",
      "Scanner un code-barres",
      "Réinitialiser"
    ]
  },
  {
    id: "dictee",
    onglet: "repas",
    emoji: "🎙️",
    titre: "Saisir à la voix",
    resume: "Dicte un plat, une recette ou une séance : l'IA range tout.",
    etapes: [
      {
        titre: "Où dicter",
        texte: "« Dicter un plat » dans Mes plats, « Dicter toute la recette » dans une nouvelle recette, « Dicter ma séance » pendant une séance."
      },
      {
        titre: "Parle naturellement",
        texte: "Donne les quantités, les séries, les répétitions et les charges : “développé couché, 4 séries de 8 à 60 kilos”."
      },
      {
        titre: "Remplis et vérifie",
        texte: "« Remplir avec l'IA » range ta dictée dans les champs. Rien n'est enregistré tant que tu n'as pas validé."
      }
    ],
    libelles: [
      "Dicter un plat",
      "Dicter toute la recette",
      "Dicter ma séance",
      "Remplir avec l'IA"
    ]
  },
  {
    id: "assistant",
    onglet: "repas",
    emoji: "💬",
    titre: "Coach IA",
    resume: "Tes questions, avec tes objectifs et ce qu'il te reste à manger.",
    etapes: [
      {
        titre: "Ouvre l'assistant",
        texte: "Repas → « Coach IA ». Il s'active avec le code d'accès donné par ton coach (Réglages → « Accès de ton coach »)."
      },
      {
        titre: "Pose ta question",
        texte: "Touche une suggestion ou écris la tienne (“je suis à 40 g de protéines, quoi manger ce soir ?”), puis « Envoyer »."
      },
      {
        titre: "Il connaît ta journée",
        texte: "Ses réponses tiennent compte de tes objectifs, de ce que tu as déjà mangé, de ton régime et de tes allergies."
      },
      {
        titre: "Nouvelle conversation",
        texte: "« Effacer la conversation » repart de zéro."
      }
    ],
    libelles: [
      "Coach IA",
      "Envoyer",
      "Effacer la conversation"
    ]
  },
  {
    id: "nutrition",
    onglet: "nutrition",
    principal: true,
    emoji: "🎯",
    titre: "L'onglet Nutrition",
    resume: "Tes objectifs du jour et ta semaine en un coup d'œil.",
    etapes: [
      {
        titre: "Tes objectifs",
        texte: "« Objectifs journaliers » : calories, protéines, glucides et lipides, calculés depuis ton profil. Change ton poids, ton activité ou ton objectif dans les Réglages : ils se recalculent."
      },
      {
        titre: "L'ordre qui compte",
        texte: "Les calories et les protéines d'abord. Les glucides et les lipides peuvent varier d'un jour à l'autre."
      },
      {
        titre: "Ta semaine compte plus que ta journée",
        texte: "Après un écart (resto, fête), cette carte te dit combien viser les jours suivants pour lisser, sans jamais descendre trop bas."
      },
      {
        titre: "Calibrage calorique",
        texte: "Avec assez de pesées et de repas notés, l'app estime ta vraie dépense. « Appliquer cette estimation » met tes objectifs à jour."
      }
    ],
    libelles: [
      "Objectifs journaliers",
      "Ta semaine compte plus que ta journée",
      "Calibrage calorique",
      "Appliquer cette estimation"
    ]
  },
  {
    id: "sommeil",
    onglet: "sommeil",
    principal: true,
    emoji: "🌙",
    titre: "L'onglet Sommeil",
    resume: "Tes nuits, ton stress, et des conseils pour mieux récupérer.",
    etapes: [
      {
        titre: "Tes nuits se notent dans le Journal",
        texte: "Chaque matin, dans le Journal : « Coucher », « Lever » et « Qualité du sommeil ». Cet onglet les analyse."
      },
      {
        titre: "Tes moyennes",
        texte: "En haut, ta durée et ta qualité moyennes sur 7 jours. « Historique des nuits » reprend chaque nuit."
      },
      {
        titre: "Conseils et stress",
        texte: "« Mieux dormir — conseils » donne des repères simples. La carte « Stress » reprend les raisons que tu as notées et des pistes pour le réduire."
      }
    ],
    libelles: [
      "Coucher",
      "Lever",
      "Qualité du sommeil",
      "Historique des nuits",
      "Mieux dormir — conseils",
      "Stress"
    ]
  },
  {
    id: "mensurations",
    onglet: "mensurations",
    principal: true,
    emoji: "📏",
    titre: "L'onglet Mesures",
    resume: "Tes tours de taille, de hanches, de bras… et leur évolution.",
    etapes: [
      {
        titre: "Prends tes mesures",
        texte: "« Nouvelle prise » : poitrine, taille, hanches, bras, cuisses, mollets, au mètre ruban. Même moment de la journée à chaque fois, le matin à jeun de préférence."
      },
      {
        titre: "Ton poids avec",
        texte: "Ajoute ton « Poids (kg) » dans la même prise, puis « Enregistrer »."
      },
      {
        titre: "Ta progression",
        texte: "« Ma progression » montre l'écart depuis ta première mesure. Touche une mesure pour voir sa courbe."
      },
      {
        titre: "Sur la durée",
        texte: "« Mon évolution » affiche chaque donnée au jour, à la semaine, au mois ou à l'année (« J », « S », « M », « A »)."
      },
      {
        titre: "Une erreur ?",
        texte: "Dans « Historique », le crayon corrige une prise, la corbeille la supprime."
      }
    ],
    libelles: [
      "Nouvelle prise",
      "Poids (kg)",
      "Enregistrer",
      "Ma progression",
      "Mon évolution",
      "Historique"
    ]
  },
  {
    id: "entrainements",
    onglet: "entrainements",
    principal: true,
    emoji: "🏋️",
    titre: "L'onglet Séances",
    resume: "Ta séance du jour en tête, tes séances types, ta semaine, chaque série notée.",
    etapes: [
      {
        titre: "Ta séance du jour",
        texte: "En haut, « Ta séance du jour » te dit quoi faire aujourd'hui : « Démarrer », repos ou séance faite. Pour débuter, « Prendre le programme débutant du coach » ajoute 2 séances en salle prêtes."
      },
      {
        titre: "Tes séances types",
        texte: "« Nouvelle séance type » : un nom (“Haut du corps”), tes exercices avec « Ajouter un exercice », séries × reps et repos, puis « Enregistrer »."
      },
      {
        titre: "Ta semaine",
        texte: "« Programme de la semaine » → « Modifier » : une séance type par jour, ou repos. La séance du jour suit ce programme."
      },
      {
        titre: "Tes progrès",
        texte: "« Progression des charges » et les records suivent tes charges séance après séance. « Mes trophées » compte tes semaines tenues."
      }
    ],
    libelles: [
      "Ta séance du jour",
      "Démarrer",
      "Prendre le programme débutant du coach",
      "Nouvelle séance type",
      "Ajouter un exercice",
      "Enregistrer",
      "Programme de la semaine",
      "Modifier",
      "Progression des charges",
      "Mes trophées"
    ]
  },
  {
    id: "noter-seance",
    onglet: "entrainements",
    emoji: "📝",
    titre: "Noter une séance",
    resume: "Exercices, séries, charges et ressenti, en quelques touchers.",
    etapes: [
      {
        titre: "Lance la séance",
        texte: "« Démarrer » dans « Ta séance du jour », ou touche une séance type."
      },
      {
        titre: "Ajoute tes exercices",
        texte: "« Ajouter un exercice » ouvre la liste : tape le nom pour le trouver. Le tien n'y est pas ? Tape-le et touche « Ajouter »."
      },
      {
        titre: "Note chaque série",
        texte: "Charges et répétitions sont déjà remplies : change-les si tu as fait autrement, puis touche ✓ : le repos se lance tout seul. Un exercice fini passe au vert et le suivant arrive à l'écran. « Dernière fois » rappelle ce que tu avais fait."
      },
      {
        titre: "Termine",
        texte: "« Enregistrer la séance » reste en bas de l'écran, avec tes séries faites. Laisse la « Durée (min) » vide : elle se calcule depuis le démarrage. Ton effort ressenti (« RPE (1-10) ») est facultatif."
      }
    ],
    libelles: [
      "Démarrer",
      "Ta séance du jour",
      "Ajouter un exercice",
      "Ajouter",
      "+ Série",
      "Dernière fois",
      "Durée (min)",
      "RPE (1-10)",
      "Enregistrer la séance"
    ]
  },
  {
    id: "seances-sans-materiel",
    onglet: "entrainements",
    emoji: "🏠",
    titre: "Séances sans matériel",
    resume: "45, 30 ou 15 minutes, à la maison, prêtes à lancer.",
    etapes: [
      {
        titre: "Trouve la bibliothèque",
        texte: "Onglet Séances, carte « Bibliothèque de séances (sans matériel) »."
      },
      {
        titre: "Ajoute-les",
        texte: "Le bouton en bas de la carte les copie dans tes séances types, à côté des tiennes."
      },
      {
        titre: "Lance-en une",
        texte: "Elles se lancent et se notent comme n'importe quelle séance type."
      }
    ],
    libelles: [
      "Bibliothèque de séances (sans matériel)",
      " à mes séances types"
    ]
  },
  {
    id: "semaine-difficile",
    onglet: "entrainements",
    emoji: "🛟",
    titre: "Semaine difficile",
    resume: "Un plan de maintien quand la semaine déraille.",
    etapes: [
      {
        titre: "Active le mode maintien",
        texte: "Carte « Semaine difficile ? », un motif si tu veux, puis « Passer en mode maintien cette semaine »."
      },
      {
        titre: "Le minimum qui compte",
        texte: "Une séance courte suffit à garder le rythme : « Séance maintien faite » quand c'est fait."
      },
      {
        titre: "Reprends",
        texte: "« Revenir au programme normal » dès que ça va mieux."
      }
    ],
    libelles: [
      "Semaine difficile ?",
      "Passer en mode maintien cette semaine",
      "Séance maintien faite",
      "Revenir au programme normal"
    ]
  },
  {
    id: "tendances",
    onglet: "tendances",
    principal: true,
    emoji: "📊",
    titre: "L'onglet Tendances",
    resume: "Tes bilans, tes photos de progression et ta carte à partager.",
    etapes: [
      {
        titre: "Tes 7 derniers jours",
        texte: "« Ma nutrition — 7 derniers jours » : tes moyennes, ton meilleur jour et le point à travailler."
      },
      {
        titre: "Ton bilan de la semaine",
        texte: "« Bilan de la semaine » : adhérence, séances, sommeil, poids, calories, pas et eau. Les semaines passées sont dans « Historique des bilans »."
      },
      {
        titre: "Tes photos",
        texte: "« Photos de progression » : face, profil et dos, une fois par semaine. Rien de plus parlant que la comparaison."
      },
      {
        titre: "Un bilan rédigé pour toi",
        texte: "« Bilan IA (optionnel) » analyse ta semaine et propose des actions concrètes."
      },
      {
        titre: "Partage",
        texte: "« Partager mes progrès » crée une carte de tes progrès, à envoyer où tu veux."
      }
    ],
    libelles: [
      "Ma nutrition — 7 derniers jours",
      "Bilan de la semaine",
      "Historique des bilans",
      "Photos de progression",
      "Bilan IA (optionnel)",
      "Partager mes progrès"
    ]
  },
  {
    id: "photos-progression",
    onglet: "tendances",
    emoji: "📷",
    titre: "Photos de progression",
    resume: "Trois photos par semaine, comparables d'une semaine à l'autre.",
    etapes: [
      {
        titre: "Trouve les photos",
        texte: "Tendances → « Bilan de la semaine » → « Photos de progression »."
      },
      {
        titre: "Trois poses",
        texte: "Touche « Face », « Profil » ou « Dos », puis « Prendre la photo » (ou « Choisir une photo »)."
      },
      {
        titre: "Toujours pareil",
        texte: "Même lieu, même lumière, même tenue, même jour de la semaine : c'est ce qui rend la comparaison juste."
      },
      {
        titre: "Elles restent chez toi",
        texte: "Tes photos restent sur ton téléphone. Pense à exporter tes données (Réglages) avant de changer de téléphone."
      }
    ],
    libelles: [
      "Bilan de la semaine",
      "Photos de progression",
      "Face",
      "Profil",
      "Dos",
      "Prendre la photo",
      "Choisir une photo"
    ]
  },
  {
    id: "bilan-ia",
    onglet: "tendances",
    emoji: "📝",
    titre: "Bilans rédigés par l'IA",
    resume: "Ta semaine et ton mois analysés, avec des actions concrètes.",
    etapes: [
      {
        titre: "Bilan de la semaine",
        texte: "Tendances → « Bilan de la semaine » → « Bilan IA (optionnel) ». Il analyse les données de ta semaine."
      },
      {
        titre: "À refaire",
        texte: "Tu as complété ta semaine ? « Régénérer » relance l'analyse avec tes nouvelles données."
      },
      {
        titre: "Bilan du mois",
        texte: "Plus bas, « Générer le bilan mensuel » fait le point sur ton mois."
      }
    ],
    libelles: [
      "Bilan de la semaine",
      "Bilan IA (optionnel)",
      "Régénérer",
      "Générer le bilan mensuel"
    ]
  },
  {
    id: "partager",
    onglet: "tendances",
    emoji: "📤",
    titre: "Partager mes progrès",
    resume: "Une carte de tes progrès, prête à envoyer.",
    etapes: [
      {
        titre: "Trouve la carte",
        texte: "Tendances → « Partager mes progrès »."
      },
      {
        titre: "Choisis ce qui apparaît",
        texte: "Ton poids n'y figure que si tu coches « Afficher l'évolution de mon poids »."
      },
      {
        titre: "Envoie",
        texte: "« Partager ma carte » ouvre le partage de ton téléphone : messages, réseaux, ce que tu veux."
      }
    ],
    libelles: [
      "Partager mes progrès",
      "Afficher l'évolution de mon poids",
      "Partager ma carte"
    ]
  },
  {
    id: "rappels",
    onglet: "reglages",
    emoji: "🔔",
    titre: "Tes rappels",
    resume: "Le bon coup de pouce, au bon moment.",
    etapes: [
      {
        titre: "Choisis tes rappels",
        texte: "Réglages (en haut à droite) : « Rappels d'hydratation » et « Rappels nutrition (calories & macros restantes) ». Coche ceux qui t'aident, puis règle l'intervalle et les heures."
      },
      {
        titre: "Le bilan du dimanche",
        texte: "« Rappel du dimanche — envoyer mon bilan au coach » te prévient le dimanche, entre 10 h et 21 h. En coaching en ligne, « Rappel de créneau (coaching en ligne) » te prévient 1 h avant ton créneau."
      },
      {
        titre: "Rien ne s'affiche ?",
        texte: "« Tester les notifications » te dit ce qui bloque. Vérifie aussi que les notifications de Coach Neiram sont autorisées dans les réglages du téléphone."
      }
    ],
    libelles: [
      "Rappels d'hydratation",
      "Rappels nutrition (calories & macros restantes)",
      "Rappel du dimanche — envoyer mon bilan au coach",
      "Rappel de créneau (coaching en ligne)",
      "Tester les notifications"
    ]
  },
  {
    id: "sauvegarde",
    onglet: "reglages",
    emoji: "💾",
    titre: "Sauvegarder tes données",
    resume: "Ton suivi reste sur ton téléphone : garde-en une copie.",
    etapes: [
      {
        titre: "Exporte",
        texte: "Réglages → « Sauvegarde des données » → « Exporter mes données ». Garde le fichier (Drive, mail…)."
      },
      {
        titre: "Régulièrement",
        texte: "Une fois par mois, et toujours avant de changer de téléphone : c'est ton seul filet."
      },
      {
        titre: "Restaure",
        texte: "Sur le nouveau téléphone, installe l'app puis Réglages → « Restaurer » et choisis le fichier."
      }
    ],
    libelles: [
      "Sauvegarde des données",
      "Exporter mes données",
      "Restaurer"
    ]
  }
];
