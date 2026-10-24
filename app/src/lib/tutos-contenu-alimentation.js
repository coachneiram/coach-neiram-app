/**
 * Tutos des fonctions — Repas, Nutrition et habitudes du Journal.
 * Format et règles : lib/tutos-contenu.js et lib/tutos.js.
 *
 * Repris de l'app Neiram (PR #55) le 24 octobre 2026 et adapté à l'app
 * coach : les objectifs fixés par le coach restent ceux qui comptent, tout
 * est inclus (aucune mention d'abonnement).
 *
 * Écartés : étiquette et carte du restaurant photographiées par l'IA,
 * additifs et meilleure alternative, cycle, jeûne intermittent et suivi
 * GLP-1 (absents de l'app coach).
 */

export const TUTOS_ALIMENTATION = [
  /* ---------------------------------------------------------------- */
  /* Repas                                                              */
  /* ---------------------------------------------------------------- */
  {
    id: "menu-semaine",
    onglet: "repas",
    emoji: "🗓️",
    titre: "Menu de la semaine",
    resume: "7 jours de repas calés sur les objectifs fixés avec ton coach, avec la liste de courses.",
    etapes: [
      { titre: "Ouvre le menu", texte: "Repas → « Menu ». Coche « Cuisiner une fois, manger deux fois » si tu veux que le dîner serve aussi de déjeuner le lendemain, puis touche « Créer mon menu »." },
      { titre: "Parcours ta semaine", texte: "Touche un jour en haut : tu vois ses 4 repas, la portion à manger, les calories et les protéines. Les recettes respectent ton régime, tes allergies et tes contraintes (halal, casher, sans alcool)." },
      { titre: "Cuisine", texte: "« Voir la recette » donne les ingrédients pour la quantité à cuisiner, restes du lendemain compris, puis « Ajouter à mes recettes » pour la noter ensuite dans le Journal." },
      { titre: "Change ce qui ne te plaît pas", texte: "« 🔄 Changer » remplace un seul repas. « Nouveau menu » refait toute la semaine, par exemple quand ton coach change tes objectifs." },
      { titre: "Fais tes courses", texte: "« 🛒 Mes courses » additionne les ingrédients de la semaine. « Ajouter à ma liste » les range dans Courses, « Partager » les envoie où tu veux." }
    ],
    libelles: ["Menu", "Cuisiner une fois, manger deux fois", "Créer mon menu", "Voir la recette", "Ajouter à mes recettes", "🔄 Changer", "Nouveau menu", "🛒 Mes courses", "Ajouter à ma liste", "Partager"]
  },
  {
    id: "idees-aliments",
    onglet: "repas",
    emoji: "🥗",
    titre: "Idées d'aliments",
    resume: "Quoi manger pour compléter ce qu'il te reste aujourd'hui.",
    etapes: [
      { titre: "Ouvre les idées", texte: "Repas → « Aliments ». En tête, la famille qui te manque le plus aujourd'hui (protéines, glucides, lipides) porte la mention « Priorité »." },
      { titre: "Choisis dans la liste", texte: "Chaque famille propose quelques aliments compatibles avec ton régime et tes allergies, avec leurs macros pour 100 g." },
      { titre: "Varie", texte: "« ⚖️ Équivalences pour varier » montre ce qui remplace quoi : riz ou pâtes, poulet ou tofu, à portion équivalente." },
      { titre: "Aussi dans le Journal", texte: "Sous tes repas du jour, « Pour compléter ta journée » propose des idées selon les calories et protéines qu'il te reste." }
    ],
    libelles: ["Aliments", "Priorité", "⚖️ Équivalences pour varier", "Pour compléter ta journée"]
  },
  {
    id: "idees-recettes",
    onglet: "repas",
    emoji: "💡",
    titre: "Les recettes du coach",
    resume: "De nouvelles recettes chaque semaine, triées pour ton objectif et ton régime.",
    etapes: [
      { titre: "Ouvre les recettes", texte: "Repas → « Mes plats » : la carte « Recettes du coach » est en haut." },
      { titre: "Filtre", texte: "« Pour toi » garde celles qui collent à ton objectif, « Toutes » montre toutes celles compatibles avec ton régime et tes allergies." },
      { titre: "Garde celles qui te plaisent", texte: "Ouvre une recette puis « Ajouter à mes recettes » : elle se note ensuite depuis le Journal, comme tes recettes maison." }
    ],
    libelles: ["Mes plats", "Recettes du coach", "Pour toi", "Toutes", "Ajouter à mes recettes"]
  },

  /* ---------------------------------------------------------------- */
  /* Nutrition                                                          */
  /* ---------------------------------------------------------------- */
  {
    id: "regimes-allergies",
    onglet: "nutrition",
    emoji: "🥦",
    titre: "Régime, allergies et contraintes",
    resume: "Ce que tu ne manges pas filtre les aliments, les recettes et le Coach IA.",
    etapes: [
      { titre: "Ouvre ton profil", texte: "Réglages (en haut à droite), dans ton profil : « Régime alimentaire » (végétarien, végétalien, pescétarien, sans porc…)." },
      { titre: "Ta répartition", texte: "« Répartition des macros » : standard, low carb, kéto, hyperprotéiné… Ton total de calories ne change pas, seule la part de chaque macro bouge." },
      { titre: "Tes allergies", texte: "Coche tes « Allergies / intolérances » parmi les 14 allergènes. Un produit scanné qui en contient s'affiche « ⛔ Contient », un risque de traces « ⚠️ Traces possibles »." },
      { titre: "Tes contraintes", texte: "« Contraintes alimentaires » : halal, casher, sans alcool, flexitarien… cumulables avec ton régime. Touche « Enregistrer » en bas des Réglages." }
    ],
    libelles: ["Régime alimentaire", "Répartition des macros", "Allergies / intolérances", "⛔ Contient", "⚠️ Traces possibles", "Contraintes alimentaires", "Enregistrer"]
  },
  {
    id: "objectifs-sur-mesure",
    onglet: "nutrition",
    emoji: "🎯",
    titre: "Ton repère sur mesure",
    resume: "Un repère calculé d'après ta situation, pour en parler avec ton coach.",
    etapes: [
      { titre: "Ouvre la carte", texte: "Nutrition → « 🎯 Repère d'après tes données » → « Mes réponses ». Les objectifs fixés par ton coach restent ceux qui comptent : ce repère ne les modifie pas." },
      { titre: "Ton rythme", texte: "« Rythme de perte » ou « Rythme de prise » en % du poids par semaine. Un rythme modéré se tient mieux sur la durée." },
      { titre: "Ta situation et ta santé", texte: "« Situation » pour la grossesse et l'allaitement ; « Santé » pour un antécédent de trouble alimentaire, un problème rénal, un diabète ou une tension. Ces réponses restent sur ton téléphone." },
      { titre: "Tes macros à toi", texte: "« Protéines (g/kg) », « Lipides (% des kcal) », ou le mode « Je saisis mes macros en grammes ». « Plus de glucides les jours d'entraînement » garde le même budget sur la semaine." },
      { titre: "Compare avec ton coach", texte: "La carte affiche l'écart avec les objectifs de ton coach. « Comment c'est calculé » détaille chaque chiffre : parles-en avec lui avant de changer quoi que ce soit." }
    ],
    libelles: ["🎯 Repère d'après tes données", "Mes réponses", "Rythme de perte", "Rythme de prise", "Situation", "Santé", "Protéines (g/kg)", "Lipides (% des kcal)", "Je saisis mes macros en grammes", "Plus de glucides les jours d'entraînement", "Comment c'est calculé"]
  },
  {
    id: "categorie-poids",
    onglet: "nutrition",
    emoji: "🏋️",
    titre: "Objectif catégorie de poids",
    resume: "Être dans ta catégorie le jour de la pesée, sans mettre ta santé en jeu.",
    etapes: [
      { titre: "Active-le", texte: "Nutrition → « 🎯 Repère d'après tes données » → « Mes réponses », puis coche « Je prépare une compétition dans une catégorie de poids »." },
      { titre: "Ta compétition", texte: "Choisis « Sport / fédération », la « Limite de la catégorie (kg) », la « Date de la pesée » et le type de « Pesée » (veille ou jour même)." },
      { titre: "Lis ton plan", texte: "L'app calcule le rythme jusqu'à la pesée. Au-delà de 1 % du poids par semaine, le plan est jugé trop rapide : vise la catégorie au-dessus, et parles-en à ton coach." },
      { titre: "Jamais de déshydratation", texte: "Aucun protocole de déshydratation n'est proposé. Après la pesée, suis les repères de réhydratation et de repas affichés." }
    ],
    libelles: ["🎯 Repère d'après tes données", "Mes réponses", "Je prépare une compétition dans une catégorie de poids", "Sport / fédération", "Limite de la catégorie (kg)", "Date de la pesée", "Pesée"]
  },
  {
    id: "complements",
    onglet: "nutrition",
    emoji: "💊",
    titre: "Compléments utiles pour toi",
    resume: "Ceux qui ont des preuves pour ton objectif et ton sport, et ceux à éviter.",
    etapes: [
      { titre: "Ouvre la carte", texte: "Nutrition → « 💊 Compléments utiles pour toi ». La sélection suit ton objectif et le sport déduit de tes séances." },
      { titre: "Regarde le niveau de preuve", texte: "« Preuves solides », « Preuves émergentes » ou « Preuves insuffisantes » : commence par les preuves solides." },
      { titre: "Déplie un complément", texte: "Touche-le pour voir la dose, les précautions et la source de l'étude." },
      { titre: "Ce qu'on évite", texte: "« À éviter » liste les produits sans intérêt ou risqués. Traitement, grossesse ou maladie : demande d'abord l'avis de ton médecin, et parles-en à ton coach." }
    ],
    libelles: ["💊 Compléments utiles pour toi", "Preuves solides", "Preuves émergentes", "Preuves insuffisantes", "À éviter"]
  },
  {
    id: "diete-flexible",
    onglet: "nutrition",
    emoji: "📆",
    titre: "Ta semaine compte plus que ta journée",
    resume: "Ton budget de calories sur 7 jours, pour un écart sans culpabilité.",
    etapes: [
      { titre: "Ouvre la carte", texte: "Nutrition → « Ta semaine compte plus que ta journée » : tes calories de la semaine, jour par jour, face à ton « Budget de la semaine »." },
      { titre: "Lis ton solde", texte: "La carte dit si ta semaine est dans le budget, en marge ou en surplus. Un jour au-dessus se compense sur les suivants." },
      { titre: "Prévois tes plaisirs", texte: "Un repas plaisir prévu se garde de la place : quelques dizaines de kcal en moins les autres jours suffisent, sans jeûner." }
    ],
    libelles: ["Ta semaine compte plus que ta journée", "Budget de la semaine"]
  },

  /* ---------------------------------------------------------------- */
  /* Journal                                                            */
  /* ---------------------------------------------------------------- */
  {
    id: "portions",
    onglet: "journal",
    emoji: "🍎",
    titre: "Portions du jour",
    resume: "Fruits, légumes et protéines comptés à la main, sans peser.",
    etapes: [
      { titre: "Trouve la carte", texte: "Dans le Journal, carte « Portions du jour »." },
      { titre: "Compte avec ta main", texte: "Un fruit, une poignée de légumes, une paume de viande, de poisson, d'œufs ou de tofu : 1 portion. Touche + ou − à chaque fois." },
      { titre: "Suis tes barres", texte: "Les barres montrent où tu en es pour les fruits et légumes, et pour les protéines (une portion par repas)." }
    ],
    libelles: ["Portions du jour"]
  },
  {
    id: "habitudes",
    onglet: "journal",
    emoji: "🌱",
    titre: "Mes habitudes",
    resume: "1 à 3 petites habitudes à cocher chaque jour, avec ta série.",
    etapes: [
      { titre: "Choisis-les", texte: "Journal → « 🌱 Mes habitudes » → « Choisir ». Coche 1 à 3 habitudes (bouger, manger, dormir, mental), ou écris la tienne puis « Ajouter »." },
      { titre: "Lance-toi", texte: "« C'est parti » : elles apparaissent dans le Journal. Coche chaque habitude le jour où tu la tiens." },
      { titre: "Ta série et tes jokers", texte: "🔥 compte tes jours d'affilée. Tous les 7 jours tenus, tu gagnes un joker 🛡️ qui pardonne un oubli." },
      { titre: "Ton coach suit tes progrès", texte: "Jusqu'à 10 habitudes, avec ton taux de réussite sur 30 jours pour chacune. Elles figurent dans le bilan que tu envoies à ton coach." }
    ],
    libelles: ["🌱 Mes habitudes", "Choisir", "Ajouter", "C'est parti"]
  },
  {
    id: "lecons",
    onglet: "journal",
    emoji: "🎓",
    titre: "La leçon du jour",
    resume: "Une micro-leçon de 2 minutes par jour : une idée, une question, une action.",
    etapes: [
      { titre: "Ta leçon du jour", texte: "Dans le Journal, carte « 🎓 La leçon du jour » : habitudes, nutrition, mouvement, sommeil ou mental." },
      { titre: "Lis-la", texte: "« Lire (2 min) », puis retiens la phrase « À retenir »." },
      { titre: "Réponds", texte: "Touche ta réponse à la question : l'explication et la source s'affichent." },
      { titre: "Passe à l'action", texte: "« Ton action du jour » te donne une chose simple à faire aujourd'hui. Une nouvelle leçon arrive demain." }
    ],
    libelles: ["🎓 La leçon du jour", "Lire (2 min)", "À retenir", "Ton action du jour"]
  },
  {
    id: "defis",
    onglet: "journal",
    emoji: "🏆",
    titre: "Les défis de 30 jours",
    resume: "Une règle simple chaque jour pendant 30 jours.",
    etapes: [
      { titre: "Choisis ton défi", texte: "Dans le Journal, carte « Défi 30 jours » → « Choisir un défi » : 8 000 pas, 2 L d'eau, 5 fruits et légumes, 7 h de sommeil, tes protéines…" },
      { titre: "Rien de plus à noter", texte: "Chaque jour se valide tout seul avec ce que tu notes déjà. Une case dorée par jour réussi. Objectif : 25 jours sur 30." },
      { titre: "Recommence", texte: "Un défi réussi s'ajoute à tes « défis réussis ». « Abandonner le défi » te laisse en choisir un autre." }
    ],
    libelles: ["Défi 30 jours", "Choisir un défi", "défis réussis", "Abandonner le défi"]
  }
];
