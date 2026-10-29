/**
 * Tutos des fonctions — Séances : musculation, sports, performances.
 * Format et règles : lib/tutos-contenu.js et lib/tutos.js.
 *
 * Repris de l'app Neiram (PR #55) le 24 octobre 2026 et adapté à l'app
 * coach : libellés de l'app coach, tout est inclus (aucune mention
 * d'abonnement), le coach reste la référence.
 *
 * Chaque tuto s'ouvre depuis sa carte (bouton « ? ») : voir le test
 * « chaque tuto de fonction s'ouvre depuis sa carte » (tests/tutos.test.mjs).
 *
 * Écartés : import des séances de la montre (pas d'Apple Santé ni de
 * Health Connect), défis entre amis, séance générée par l'IA et semaine de
 * décharge (absentes de l'app coach : le programme vient du coach). La
 * voix pendant la séance est portée dans une autre branche : son étape
 * s'ajoutera au tuto « minuteur-repos » à la fusion.
 */

export const TUTOS_SEANCES = [
  {
    id: "importer-programme",
    onglet: "entrainements",
    emoji: "📄",
    titre: "Importer mon programme",
    resume: "Ton programme est sur une photo, un PDF ou dans ta tête : il devient des séances types.",
    etapes: [
      { titre: "Ouvre l'import", texte: "Dans Séances, carte « Importer mon programme », touche « Photo, PDF ou dictée »." },
      { titre: "Donne ton programme", texte: "Photographie chaque page, choisis un PDF dans tes fichiers, ou dicte et tape le texte. Tu peux mélanger, jusqu'à 6 pages." },
      { titre: "Lance la lecture", texte: "Touche « Lire mon programme ». Compte jusqu'à une minute pour un programme de plusieurs séances." },
      { titre: "Vérifie avant d'enregistrer", texte: "Décoche les séances en trop, corrige leur nom, lis les avertissements : rien n'est enregistré avant d'avoir touché le bouton d'ajout, en bas." }
    ],
    libelles: ["Importer mon programme", "Photo, PDF ou dictée", "Lire mon programme", "Garder cette séance"]
  },
  {
    id: "minuteur-repos",
    onglet: "entrainements",
    emoji: "⏱️",
    titre: "Le minuteur de repos",
    resume: "Il démarre tout seul quand tu coches une série, et te prévient quand c'est reparti.",
    etapes: [
      { titre: "Règle le repos", texte: "Dans la séance, à côté de « Repos », choisis la durée de chaque exercice : « Autre durée » pour une valeur à toi, ou « Chronomètre » pour compter le temps sans fin." },
      { titre: "Coche ta série", texte: "Touche la case de la colonne « Fait » : le bandeau du minuteur apparaît en bas de l'écran et décompte ton repos." },
      { titre: "Ajuste en direct", texte: "« −15 s » ou « +15 s » pour raccourcir ou rallonger, « Passer » pour repartir tout de suite. En mode chrono, « Arrêter » le coupe." },
      { titre: "C'est reparti", texte: "« Repos terminé » s'affiche à la fin du décompte : enchaîne ta série suivante." }
    ],
    libelles: ["Repos", "Autre durée", "Chronomètre", "Fait", "−15 s", "+15 s", "Passer", "Arrêter", "Repos terminé"]
  },
  {
    id: "techniques-serie",
    onglet: "entrainements",
    emoji: "🧪",
    titre: "Les techniques de série",
    resume: "Superset, dégressive, rest-pause… chacune avec son niveau de preuve.",
    etapes: [
      { titre: "Ouvre les options", texte: "Pendant la séance, sous un exercice, touche « Options » pour faire apparaître son type et sa technique." },
      { titre: "Choisis la technique", texte: "Dans « Technique », remplace « Série classique » par celle que ton coach t'a demandée : « Superset », « Dégressive (drop set) », « Rest-pause »…" },
      { titre: "Ses réglages sont posés", texte: "Les valeurs les plus courantes sont pré-remplies (nombre de baisses, pause en secondes, mini-séries) : ajuste-les si besoin." },
      { titre: "Pourquoi et avec quelles preuves", texte: "Touche la description sous la technique : « Preuves » indique son niveau et ce que disent les études." }
    ],
    libelles: ["Options", "Technique", "Série classique", "Superset", "Dégressive (drop set)", "Rest-pause", "Preuves"]
  },
  {
    id: "outils-barre",
    onglet: "entrainements",
    emoji: "🧮",
    titre: "Disques et échauffement",
    resume: "Les bons disques et tes séries d'approche, sans calcul de tête.",
    etapes: [
      { titre: "Ta dernière fois", texte: "Sous chaque exercice, « Dernière fois » rappelle les charges et répétitions de ta séance précédente." },
      { titre: "Charge les disques", texte: "Sous un exercice avec charge, touche « Disques & échauffement » : choisis ta barre, et l'app affiche les disques à mettre de chaque côté." },
      { titre: "Sans barre", texte: "Pour des haltères ou une machine, choisis « Sans barre (machine) » : le calcul s'adapte." },
      { titre: "Échauffe-toi juste", texte: "« Échauffement conseillé » détaille tes séries d'approche, charges et répétitions, avant ta charge de travail." }
    ],
    libelles: ["Dernière fois", "Disques & échauffement", "Sans barre (machine)", "Échauffement conseillé"]
  },
  {
    id: "bibliotheque-exercices",
    onglet: "entrainements",
    emoji: "📚",
    titre: "La bibliothèque d'exercices",
    resume: "Trouve un exercice, regarde la démo, ou ajoute le tien.",
    etapes: [
      { titre: "Ouvre la bibliothèque", texte: "Dans une séance ou une séance type, touche « Ajouter un exercice » : la « Bibliothèque d'exercices » s'ouvre, rangée par muscle." },
      { titre: "Cherche", texte: "Tape le nom dans le champ (“développé”, “tirage”…) puis touche l'exercice pour l'ajouter." },
      { titre: "Regarde la démo", texte: "Le bouton « Voir la démo » ouvre la vidéo de l'exercice : la bonne exécution avant la charge." },
      { titre: "Ton exercice n'existe pas ?", texte: "Sous « Ton exercice n'est pas dans la liste ? », tape son nom puis « Ajouter ». Il reste dans « Mes exercices » pour la prochaine fois." }
    ],
    libelles: ["Ajouter un exercice", "Bibliothèque d'exercices", "Voir la démo", "Ton exercice n'est pas dans la liste ?", "Ajouter", "Mes exercices"]
  },
  {
    id: "programme-semaine",
    onglet: "entrainements",
    emoji: "🗓️",
    titre: "Le programme de la semaine",
    resume: "Décide quel jour tu fais quelle séance : c'est ce qui fait passer à l'acte.",
    etapes: [
      { titre: "Organise ta semaine", texte: "Carte « Programme de la semaine », touche « Modifier » : pour chaque jour, choisis une de tes séances types, ou « Repos »." },
      { titre: "Valide", texte: "Touche « Terminé » pour revenir à ta semaine. « Ta séance du jour », en haut de l'onglet, suit ce programme." },
      { titre: "Le jour venu", texte: "« Démarrer » ouvre la séance prévue. Une séance manquée reste démarrable : elle se note à sa date d'origine." },
      { titre: "Ta semaine en un coup d'œil", texte: "La barre compte les séances réalisées, à venir et manquées de la semaine." }
    ],
    libelles: ["Programme de la semaine", "Modifier", "Repos", "Terminé", "Ta séance du jour", "Démarrer"]
  },
  {
    id: "forme-du-jour",
    onglet: "entrainements",
    emoji: "🚦",
    titre: "Ta forme du jour",
    resume: "Pousser ou y aller doucement aujourd'hui, d'après ce que tu notes.",
    etapes: [
      { titre: "Nourris ta forme", texte: "Note ton sommeil, ton « Énergie » et ton « Stress » dans le Journal, carte du sommeil et de la forme. La carte « Ta forme du jour » apparaît dans Séances avec un score sur 100." },
      { titre: "Lis le conseil", texte: "« Feu vert » : jour pour viser le haut de ta fourchette. « Séance normale » : comme prévu. « Récupération faible » : reste dans le bas de ta fourchette." },
      { titre: "Ton coach décide", texte: "C'est indicatif, pas un avis médical. Tu préfères décaler ta séance ? Préviens ton coach." }
    ],
    libelles: ["Énergie", "Stress", "Ta forme du jour", "Feu vert", "Séance normale", "Récupération faible"]
  },
  {
    id: "autres-sports",
    onglet: "entrainements",
    emoji: "🏃",
    titre: "Noter un autre sport",
    resume: "Course, padel, yoga, match, randonnée : plus de 70 sports, ou le tien.",
    etapes: [
      { titre: "Ajoute l'activité", texte: "Onglet Séances, carte « Semaine active » : touche « Activité ». Dans « Quel sport ? », cherche le tien ou reprends-le dans « Récents »." },
      { titre: "Ton sport n'existe pas ?", texte: "Touche « Créer mon sport », donne-lui un nom et une intensité, puis « Créer et noter ». Il reste dans ta liste." },
      { titre: "Les détails", texte: "Indique la « Durée (min) » et l'« Effort ressenti (RPE) », puis la distance ou le dénivelé. Certains sports ont leurs champs, comme « Type de sortie » pour la course." },
      { titre: "Enregistre", texte: "« Enregistrer l'activité » : ton coach la voit dans son suivi. Elle compte pour ta semaine active et tes trophées, pas pour tes créneaux de coaching." },
      { titre: "Refaire en un geste", texte: "Dans « Historique des séances », le bouton ↻ (« Refaire cette activité aujourd'hui ») recopie une sortie habituelle à la date du jour." }
    ],
    libelles: ["Semaine active", "Activité", "Quel sport ?", "Récents", "Créer mon sport", "Créer et noter", "Durée (min)", "Effort ressenti (RPE)", "Type de sortie", "Enregistrer l'activité", "Historique des séances", "Refaire cette activité aujourd'hui"]
  },
  {
    id: "mes-sports",
    onglet: "entrainements",
    emoji: "🏅",
    titre: "Mes sports : temps et records",
    resume: "Où passe ton temps d'entraînement, et tes meilleures sorties.",
    etapes: [
      { titre: "Trouve la carte", texte: "Onglet Séances, carte « Mes sports ». Elle apparaît dès ta première activité notée avec « Activité »." },
      { titre: "Tes 30 derniers jours", texte: "« 30 derniers jours » répartit ton temps par sport : tu vois d'un coup d'œil si tu équilibres bien." },
      { titre: "Tes records", texte: "« Records » garde ta plus longue distance, tes meilleures allures sur 5 et 10 km, ton plus gros dénivelé et ta plus longue séance." }
    ],
    libelles: ["Mes sports", "Activité", "30 derniers jours", "Records"]
  },
  {
    id: "semaine-active",
    onglet: "entrainements",
    emoji: "🌿",
    titre: "Ta semaine active",
    resume: "Tes minutes d'activité face au repère de l'OMS.",
    etapes: [
      { titre: "Le repère", texte: "La carte « Semaine active » compte tes minutes sur 7 jours face aux 150 min d'activité modérée conseillées par l'OMS. Une minute soutenue compte double." },
      { titre: "Ajoute une activité", texte: "Une marche rapide, du vélo, un match : touche « Activité » sur la carte pour la noter." },
      { titre: "Le renforcement", texte: "La ligne « Renforcement » compte tes jours de musculation : 2 par semaine au moins. Tes pas moyens s'affichent aussi." },
      { titre: "Le conseil", texte: "Sous les barres, un conseil te dit quoi faire pour atteindre le repère cette semaine." }
    ],
    libelles: ["Semaine active", "Activité", "Renforcement"]
  },
  {
    id: "programmes-guides",
    onglet: "entrainements",
    emoji: "🎯",
    titre: "Les programmes guidés",
    resume: "Un plan semaine par semaine pour bouger, en plus des séances de ton coach.",
    etapes: [
      { titre: "Choisis ton programme", texte: "Carte « Programmes guidés », touche « Commencer » sous celui qui te correspond." },
      { titre: "Suis la séance", texte: "La carte affiche la prochaine séance (semaine et numéro) avec ce qu'il faut faire." },
      { titre: "Note-la", texte: "Une fois faite, « Je l'ai faite : noter » l'enregistre et passe à la suivante. La barre montre ton avancement." },
      { titre: "Changer de programme", texte: "« Arrêter » met fin au programme en cours : tes séances déjà notées sont gardées." }
    ],
    libelles: ["Programmes guidés", "Commencer", "Je l'ai faite : noter", "Arrêter"]
  },
  {
    id: "calendrier-annee",
    onglet: "entrainements",
    emoji: "📅",
    titre: "Le calendrier de l'année",
    resume: "Toutes tes séances de l'année, d'un coup d'œil.",
    etapes: [
      { titre: "Coche un jour", texte: "Sur la carte « Mon année », touche un jour pour cocher une séance faite, ou la décocher. Pratique pour une séance oubliée." },
      { titre: "Tes chiffres", texte: "Séances, jours actifs, meilleure série de semaines et objectif de l'année s'affichent sous le calendrier." },
      { titre: "Vois plus grand", texte: "« Voir l'année » ouvre le calendrier complet, mois par mois." },
      { titre: "Partage", texte: "« Partager mon année en story » crée l'image de ton année, à publier où tu veux." }
    ],
    libelles: ["Mon année", "Voir l'année", "Partager mon année en story"]
  },
  {
    id: "mon-annee",
    onglet: "entrainements",
    emoji: "🎁",
    titre: "Le bilan de ton année",
    resume: "Ton année en quelques écrans, à partager en story.",
    etapes: [
      { titre: "Ouvre ton bilan", texte: "Carte « Mon année », touche « Voir mon année ». Elle est mise en avant en décembre et janvier, et disponible toute l'année." },
      { titre: "Fais défiler", texte: "« Suivant » passe d'un écran à l'autre : séances, sport favori, régularité, charge la plus lourde, transformation, pas et sommeil." },
      { titre: "Partage", texte: "Au dernier écran, « Partager mon année en story » crée une image à publier. Tout est calculé sur ton téléphone." }
    ],
    libelles: ["Mon année", "Voir mon année", "Suivant", "Partager mon année en story"]
  },
  {
    id: "performances",
    onglet: "entrainements",
    emoji: "🏆",
    titre: "Mes performances et mon niveau",
    resume: "Regarde où tu te situes face aux grilles des fédérations.",
    etapes: [
      { titre: "Choisis ta discipline", texte: "Carte « Mes performances » : « Force athlétique », « Haltérophilie », « Course à pied » ou « Natation »." },
      { titre: "Note tes meilleures perfs", texte: "Tes maxis en kilos (champ « 1RM kg »), ou tes chronos comme “24:35” ou “1:42:10”." },
      { titre: "Ton niveau officiel", texte: "« Ton niveau » te situe sur les grilles FFForce, FFHM, FFA ou FFN, avec ce qu'il te manque pour le niveau suivant." },
      { titre: "Ton coach les voit", texte: "Tes performances et ton niveau partent dans le bilan que tu envoies à ton coach." }
    ],
    libelles: ["Mes performances", "Force athlétique", "Haltérophilie", "Course à pied", "Natation", "1RM kg", "Ton niveau"]
  },
  {
    id: "force-athletique",
    onglet: "entrainements",
    emoji: "🏋️",
    titre: "Force athlétique : % 1RM, RIR et table RPE",
    resume: "Tes charges calculées depuis tes maxis.",
    etapes: [
      { titre: "Note tes maxis", texte: "Avec l'objectif « Performance » (Réglages), la carte « Force athlétique — maxis & progression » apparaît : entre ton 1RM en squat, développé couché et soulevé de terre." },
      { titre: "Passe un exercice en Force", texte: "Dans la séance, « Options », puis choisis « Force » dans le menu du type d'exercice. Le menu « Type de série » apparaît." },
      { titre: "Calcule la charge", texte: "Indique le « % 1RM » ou le « RIR » (répétitions en réserve) : la charge se calcule depuis ton maxi." },
      { titre: "La table RPE", texte: "« Table RPE → % du 1RM » relie répétitions et effort au pourcentage de ton maxi. Ton niveau FFForce s'affiche aussi sur la carte." }
    ],
    libelles: ["Performance", "Force athlétique — maxis & progression", "Options", "Force", "Type de série", "% 1RM", "RIR", "Table RPE → % du 1RM"]
  },
  {
    id: "progression-records",
    onglet: "entrainements",
    emoji: "📈",
    titre: "Progression des charges et records",
    resume: "Tes charges séance après séance, tes records et ton 1RM estimé.",
    etapes: [
      { titre: "Ta progression", texte: "Dans l'onglet Séances, « Progression des charges » montre l'évolution de tes derniers exercices, séance après séance." },
      { titre: "Tes records", texte: "« Records » liste, pour chaque exercice, ta charge la plus lourde, ton meilleur volume et ton 1RM estimé." },
      { titre: "Toujours à jour", texte: "Rien à saisir : tout se calcule à partir des séries que tu coches pendant tes séances." }
    ],
    libelles: ["Progression des charges", "Records"]
  }
];
