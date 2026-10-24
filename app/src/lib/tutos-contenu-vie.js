/**
 * Tutos des fonctions — Sommeil, Mesures, Tendances et Réglages.
 * Format et règles : lib/tutos-contenu.js et lib/tutos.js.
 *
 * Repris de l'app Neiram (PR #55) le 24 octobre 2026 et adapté à l'app
 * coach : tout est inclus (aucune mention d'abonnement), le coach reçoit
 * le bilan que tu lui envoies.
 *
 * Écartés : la communauté (classements, mur des transformations, défis
 * entre amis, stories, parrainage, récompenses, code secret des stories,
 * idées), les badges, Apple Santé et Health Connect, Siri et le widget,
 * l'abonnement. Raccourcis : seulement la partie web (appui long sur
 * l'icône Android, adresse en favori), sans Siri ni widget.
 */

export const TUTOS_VIE = [
  /* ---------------------------------------------------------------- */
  /* Sommeil                                                            */
  /* ---------------------------------------------------------------- */
  {
    id: "sommeil-stress",
    onglet: "sommeil",
    emoji: "🌬️",
    titre: "Sommeil et stress : respirer, savoir quand consulter",
    resume: "5 minutes de respiration guidée, les signaux qui doivent t'amener chez le médecin, et les études derrière chaque conseil.",
    etapes: [
      {
        titre: "Souffle 5 minutes",
        texte: "Onglet Sommeil, carte « 5 minutes pour souffler » : touche « Commencer (5 min) » et suis le rythme affiché. Deux inspirations par le nez, une longue expiration par la bouche."
      },
      {
        titre: "Les signaux d'alerte",
        texte: "La carte « Quand en parler à un médecin » s'allume après plusieurs semaines de nuits difficiles ou de stress très élevé. En coaching en ligne, ton coach est prévenu. Le 3114 y reste toujours visible."
      },
      {
        titre: "Ta régularité",
        texte: "« Régularité de ton sommeil » mesure de combien ton heure de lever varie sur 14 jours. Note ton lever dans le Journal au moins 5 fois pour la voir."
      },
      {
        titre: "Les conseils et leurs preuves",
        texte: "« Ce que disent les études » : choisis un thème (« Mieux dormir », « Réduire le stress »…) puis touche un conseil. Tu vois pourquoi il marche, l'effet mesuré, le niveau de preuve et les sources."
      }
    ],
    libelles: ["5 minutes pour souffler", "Commencer (5 min)", "Quand en parler à un médecin", "Régularité de ton sommeil", "Ce que disent les études", "Mieux dormir", "Réduire le stress"]
  },

  /* ---------------------------------------------------------------- */
  /* Mesures                                                            */
  /* ---------------------------------------------------------------- */
  {
    id: "progression-mesures",
    onglet: "mensurations",
    emoji: "📏",
    titre: "Ma progression",
    resume: "Ton poids et tes mensurations depuis ta première mesure, en un coup d'œil.",
    etapes: [
      { titre: "Prends une mesure", texte: "Onglet Mesures, « Nouvelle prise » : tour de taille, hanches, bras… et ton poids. Une prise toutes les 2 à 4 semaines suffit." },
      { titre: "Lis ta progression", texte: "La carte « Ma progression » compare chaque mesure à ta toute première, avec une phrase qui résume le chemin parcouru." },
      { titre: "Vois la courbe", texte: "Dans Mesures, touche une tuile de « Ma progression » : la courbe de cette mesure s'affiche en dessous." },
      { titre: "Aussi dans Tendances", texte: "La même carte apparaît dans Tendances, à côté de ton bilan de la semaine." }
    ],
    libelles: ["Nouvelle prise", "Ma progression"]
  },
  {
    id: "transformations",
    onglet: "mensurations",
    emoji: "🔥",
    titre: "Ma transformation",
    resume: "Le gras perdu et le muscle pris, calculés sur tes pesées.",
    etapes: [
      { titre: "Ta transformation", texte: "Onglet Mesures, carte « Ma transformation » : gras perdu et muscle pris sur les « 90 jours » écoulés ou « Cette année », d'après tes pesées et ta masse grasse." },
      { titre: "Des garde-fous", texte: "La perte comptée est plafonnée à 1 % du poids par semaine, le muscle à 0,25 kg par semaine : au-delà, c'est surtout de l'eau ou l'imprécision de la balance." },
      { titre: "Pèse-toi pareil", texte: "Le matin, à jeun, après être allé aux toilettes : ce sont les mêmes conditions qui rendent la comparaison juste." }
    ],
    libelles: ["Ma transformation", "90 jours", "Cette année"]
  },

  /* ---------------------------------------------------------------- */
  /* Tendances                                                          */
  /* ---------------------------------------------------------------- */
  {
    id: "comparateur",
    onglet: "tendances",
    emoji: "↔️",
    titre: "Comparateur avant / après",
    resume: "Deux photos de la même pose, un curseur pour passer de l'une à l'autre.",
    etapes: [
      { titre: "Prends tes photos", texte: "Tendances → « Bilan de la semaine » → « Photos de progression » : une photo par pose, chaque semaine." },
      { titre: "Ouvre le comparateur", texte: "Dès que tu as 2 semaines de photos d'une même pose, « Avant / après » apparaît sous tes photos." },
      { titre: "Choisis", texte: "Sélectionne la pose, puis la semaine « Avant » et la semaine « Après »." },
      { titre: "Glisse", texte: "Fais glisser le curseur sur la photo : tu passes de l'avant à l'après. Les photos ne quittent jamais ton téléphone." }
    ],
    libelles: ["Bilan de la semaine", "Photos de progression", "Avant / après", "Avant", "Après"]
  },
  {
    id: "evolution",
    onglet: "tendances",
    emoji: "📈",
    titre: "Mon évolution et les courbes",
    resume: "Chaque donnée que tu notes, au jour, à la semaine, au mois et à l'année.",
    etapes: [
      { titre: "Choisis une donnée", texte: "En haut de Tendances (et dans Mesures), carte « Mon évolution » : choisis dans la liste ce que tu veux suivre (poids, calories, protéines, pas, sommeil, séances…)." },
      { titre: "Change d'échelle", texte: "Les boutons J, S, M et A affichent la donnée au jour, à la semaine, au mois ou à l'année. Les flèches passent à la période précédente ou suivante." },
      { titre: "Lis le détail", texte: "Touche une barre ou un point : sa valeur s'affiche en grand, avec sa date. Touche à nouveau pour revenir au résumé de la période." },
      { titre: "Les courbes de la durée", texte: "Plus bas dans Tendances, « Calories moyennes / semaine », sommeil, eau, pas, poids et « Muscle (masse maigre) » montrent la tendance semaine après semaine." }
    ],
    libelles: ["Mon évolution", "Calories moyennes / semaine", "Muscle (masse maigre)"]
  },
  {
    id: "historique-bilans",
    onglet: "tendances",
    emoji: "🗂️",
    titre: "Historique des bilans",
    resume: "Relis tes bilans des semaines passées.",
    etapes: [
      { titre: "Ouvre l'historique", texte: "Tendances, sous ton bilan de la semaine : touche « Historique des bilans » pour le déplier." },
      { titre: "Relis une semaine", texte: "Chaque bilan garde ses chiffres et son analyse, avec ses dates. Compare ce que tu faisais il y a un mois." },
      { titre: "Tout ton historique", texte: "Tous tes bilans restent consultables, sans limite de durée. Les bilans du mois sont dans « Bilans mensuels précédents »." }
    ],
    libelles: ["Historique des bilans", "Bilans mensuels précédents"]
  },
  {
    id: "bilan-mensuel",
    onglet: "tendances",
    emoji: "🗓️",
    titre: "Bilan du mois",
    resume: "Ton poids et tes mesures, mois après mois, et un bilan rédigé si tu le veux.",
    etapes: [
      { titre: "Trouve-le", texte: "Tendances, carte « Bilan mensuel » : le nom du mois en cours et ton nombre de séances." },
      { titre: "Ton évolution du mois", texte: "Poids et mensurations du début à la fin du mois. Pense à une « Nouvelle prise » dans Mesures chaque mois pour le nourrir." },
      { titre: "Un bilan rédigé", texte: "« Générer le bilan mensuel » analyse ton mois et propose des actions concrètes." },
      { titre: "Les mois passés", texte: "« Bilans mensuels précédents » garde tes bilans des mois d'avant." }
    ],
    libelles: ["Bilan mensuel", "Nouvelle prise", "Générer le bilan mensuel", "Bilans mensuels précédents"]
  },
  {
    id: "declics",
    onglet: "tendances",
    emoji: "💡",
    titre: "Mes déclics",
    resume: "Ce qui va avec tes meilleures journées, d'après tes propres données.",
    etapes: [
      { titre: "Nourris-le", texte: "Note ton énergie, ton stress et ton sommeil dans le Journal pendant 2 à 3 semaines, en plus de tes séances, pas et habitudes." },
      { titre: "Lis tes déclics", texte: "Tendances → « 💡 Mes déclics » : ✅ ce qui va avec tes meilleures journées, ⚠️ ce qui va avec les moins bonnes. Les principaux partent dans le bilan envoyé à ton coach." },
      { titre: "Reste prudent", texte: "Ce sont des liens observés dans tes données, pas des preuves de cause à effet. Teste une piste à la fois et regarde si elle se confirme." }
    ],
    libelles: ["💡 Mes déclics"]
  },

  /* ---------------------------------------------------------------- */
  /* Réglages                                                           */
  /* ---------------------------------------------------------------- */
  {
    id: "profil-objectifs",
    onglet: "reglages",
    emoji: "🎯",
    titre: "Ton profil et tes objectifs",
    resume: "Tes calories, tes macros et tes repères du jour se calculent depuis ton profil.",
    etapes: [
      { titre: "Ouvre ton profil", texte: "Réglages (en haut à droite) : « Sexe », « Âge », « Taille (cm) » et « Poids de départ (kg) »." },
      { titre: "Ton objectif", texte: "« Objectif », « Activité sportive (hors métier) » et « Type de métier » fixent tes calories du jour." },
      { titre: "Ton alimentation", texte: "« Régime alimentaire », « Contraintes alimentaires » et « Allergies / intolérances » filtrent les aliments, les recettes et le Coach IA." },
      { titre: "Tes repères", texte: "« Objectif sommeil (h/nuit) », « Objectif pas / jour » et « Objectif hydratation (L / jour) » servent à ton score du jour." },
      { titre: "Enregistre", texte: "Touche « Enregistrer » en bas des Réglages : tes objectifs sont recalculés tout de suite." }
    ],
    libelles: [
      "Sexe",
      "Âge",
      "Taille (cm)",
      "Poids de départ (kg)",
      "Objectif",
      "Activité sportive (hors métier)",
      "Type de métier",
      "Régime alimentaire",
      "Contraintes alimentaires",
      "Allergies / intolérances",
      "Objectif sommeil (h/nuit)",
      "Objectif pas / jour",
      "Objectif hydratation (L / jour)",
      "Enregistrer"
    ]
  },
  {
    id: "donnees-ia",
    onglet: "reglages",
    emoji: "🔒",
    titre: "Tes données et l'IA",
    resume: "Ce qui reste sur ton téléphone, ce qui part à l'IA, et comment retirer ton accord.",
    etapes: [
      { titre: "Sur ton téléphone", texte: "Ton suivi est gardé sur ton téléphone : la sauvegarde, c'est toi qui la fais. Pense à « Exporter mes données » de temps en temps, et avant de changer de téléphone." },
      { titre: "L'accord pour l'IA", texte: "Photo de repas, Coach IA, bilans : l'app te demande ton accord avant le premier envoi. Sans accord, rien ne part, et ni ton nom ni ton e-mail ne sont envoyés." },
      { titre: "Retire ton accord", texte: "Réglages → « Fonctions IA » → « Retirer mon accord ». Il te sera redemandé à la prochaine utilisation." }
    ],
    libelles: ["Exporter mes données", "Fonctions IA", "Retirer mon accord"]
  },
  {
    id: "raccourcis",
    onglet: "reglages",
    emoji: "⚡",
    titre: "Raccourcis de l'app",
    resume: "Note de l'eau, lance ta séance ou ouvre un repas en un geste.",
    etapes: [
      { titre: "Sur Android", texte: "Installe l'app sur l'écran d'accueil, puis garde le doigt sur son icône : « Ajouter un verre d'eau », « Lancer ma séance », « Noter un repas », « Noter mon poids » ou « Noter mon sommeil »." },
      { titre: "Ce que fait chaque raccourci", texte: "« Ajouter un verre d'eau » ajoute 250 ml au jour même. « Lancer ma séance » ouvre ta séance du jour (programme de la semaine, sinon la suivante de ta rotation). Les autres ouvrent le bon écran." },
      { titre: "Sur iPhone", texte: "L'appui long sur l'icône d'une app web ne propose pas de raccourcis : demande à ton coach le lien d'un raccourci et garde-le en favori." }
    ],
    libelles: ["Ajouter un verre d'eau", "Lancer ma séance", "Noter un repas", "Noter mon poids", "Noter mon sommeil"]
  }
];
