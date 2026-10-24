/**
 * L'ecole Neiram : 28 micro-lecons, une par jour (contenu).
 * Logique et ecran : lib/lecons.js, ui/CarteLecon.jsx.
 * Sources principales citees dans chaque lecon (champ `source`).
 *
 * Champs : id (stable, prefixe lNN-), jour (1 a 28), theme (habitudes,
 * nutrition, mouvement, sommeil, mental), titre, texte (3 paragraphes,
 * 110 a 170 mots au total), aRetenir, question { q, options (3), bonne
 * (index 0..2), explication }, action (le geste du jour), source.
 *
 * Ecriture : « tu », ton chaleureux et sans culpabilite, aucune promesse
 * de resultat, aucune allegation medicale.
 */
export const LECONS = [
  /* ---------------------------------------------------------------- */
  /* Semaine 1 : les fondations                                         */
  /* ---------------------------------------------------------------- */
  {
    id: "l01-pourquoi",
    jour: 1,
    theme: "habitudes",
    titre: "Ton pourquoi, et qui tu deviens",
    texte: [
      "Bienvenue dans l'école Neiram. Chaque jour, une leçon de deux minutes, une question et une petite action. Pas de règles impossibles : des idées simples, tirées de la recherche, que tu adaptes à ta vie.",
      "Commence par ton « pourquoi ». Avoir de l'énergie pour tes enfants, mieux dormir, te sentir bien dans ton corps : un motif qui compte vraiment pour toi tient mieux qu'un chiffre imposé de l'extérieur. Pense ensuite en identité plutôt qu'en résultat : « je deviens quelqu'un qui bouge chaque jour » plutôt que « je dois perdre cinq kilos ».",
      "Chaque petite action est un vote pour cette personne. Et laisse-toi du temps : dans une étude de référence, il a fallu en moyenne 66 jours pour qu'un nouveau geste devienne automatique, avec de grandes différences d'une personne à l'autre."
    ],
    aRetenir: "Un pourquoi qui te ressemble et une identité à construire tiennent plus longtemps qu'un chiffre.",
    question: {
      q: "En moyenne, combien de temps a-t-il fallu pour qu'une nouvelle habitude devienne automatique ?",
      options: ["21 jours, comme on le dit souvent", "Environ 66 jours", "Au moins un an"],
      bonne: 1,
      explication: "La moyenne était de 66 jours, de 18 à 254 selon les personnes et les gestes. Les « 21 jours » ne reposent sur aucune étude solide."
    },
    action: "Écris en une phrase ton pourquoi et la personne que tu veux devenir, et garde-la sous les yeux.",
    source: "Lally 2010, Eur J Soc Psychol"
  },
  {
    id: "l02-quand-ou",
    jour: 2,
    theme: "habitudes",
    titre: "Petit, précis : quand et où",
    texte: [
      "La motivation monte et descend, c'est normal. Pour ne pas en dépendre, rends ta nouvelle habitude très facile : deux minutes de marche, un verre d'eau, dix squats. Une fois le geste installé, tu pourras l'agrandir.",
      "Décide ensuite à l'avance quand et où tu le feras, sous la forme « quand… alors… » : « Quand je pose mon café le matin, alors je fais dix squats. » Accrocher le nouveau geste à une habitude existante lui donne un déclencheur clair.",
      "Ces « intentions de mise en œuvre » ont été testées dans près d'une centaine d'études : elles augmentent nettement les chances de passer à l'acte. Le flou (« je ferai du sport cette semaine ») laisse la décision au hasard. La précision la prend à ta place."
    ],
    aRetenir: "Une habitude minuscule, accrochée à un moment et un lieu précis, se lance presque toute seule.",
    question: {
      q: "Laquelle de ces intentions a le plus de chances d'être tenue ?",
      options: [
        "Je vais faire plus de sport cette semaine.",
        "Lundi, je m'y mets à fond.",
        "Mardi à 18 h, en rentrant du travail, je marche 15 minutes dans mon quartier."
      ],
      bonne: 2,
      explication: "Le moment et le lieu créent un déclencheur. Le cerveau n'a plus à décider : il reconnaît la situation et lance l'action."
    },
    action: "Programme ta prochaine séance avec l'heure et le lieu, sous la forme « quand… alors… ».",
    source: "Gollwitzer & Sheeran 2006, Adv Exp Soc Psychol"
  },
  {
    id: "l03-observer",
    jour: 3,
    theme: "habitudes",
    titre: "Observer sans te juger",
    texte: [
      "Avant de changer quoi que ce soit, regarde ce qui se passe vraiment. Noter ce que tu manges, tes pas ou ton sommeil, c'est allumer la lumière : tu découvres ce que ta mémoire oublie, comme le grignotage de 16 h ou les soirs où tu dors peu.",
      "Les études sont constantes : les personnes qui se suivent régulièrement atteignent plus souvent leurs objectifs. Pas besoin de perfection. Noter approximativement chaque jour vaut mieux que tout peser une semaine sur deux.",
      "Le plus important, c'est l'état d'esprit. Tu n'es pas devant un juge : tu observes tes données comme un scientifique curieux. Un repas copieux n'est ni « bien » ni « mal », c'est une information. Remplace « j'ai craqué » par « tiens, que s'est-il passé ? »."
    ],
    aRetenir: "Noter, c'est observer, pas se juger : la régularité compte plus que la précision.",
    question: {
      q: "Quelle attitude aide le plus quand tu notes tes repas ?",
      options: [
        "Noter seulement les bons jours",
        "Noter même approximativement, avec curiosité et sans jugement",
        "Tout peser au gramme près, ou ne rien noter du tout"
      ],
      bonne: 1,
      explication: "La régularité compte plus que la précision. Noter aussi les journées difficiles t'apprend le plus sur ce qui les déclenche."
    },
    action: "Note ton petit-déjeuner dans Repas, même approximativement, sans le juger.",
    source: "Burke 2011, J Am Diet Assoc"
  },
  {
    id: "l04-proteines",
    jour: 4,
    theme: "nutrition",
    titre: "Les protéines, alliées de la satiété",
    texte: [
      "À calories égales, les protéines sont le nutriment qui rassasie le plus. Elles aident aussi à préserver tes muscles quand tu perds du poids, surtout si tu fais du renforcement musculaire.",
      "Pas besoin de poudres ni de régime hyperprotéiné. L'idée simple : une source de protéines à chaque repas. Œufs, yaourt nature ou fromage blanc, poisson, volaille, tofu, lentilles, pois chiches, haricots… Les légumineuses comptent double : protéines et fibres.",
      "Chez les personnes qui font de la musculation, les études montrent qu'au-delà d'environ 1,6 g par kilo de poids et par jour, le bénéfice supplémentaire devient très faible. Pour la plupart des gens, des apports variés répartis sur la journée suffisent. Si tu as un problème de santé, notamment rénal, demande conseil à un professionnel."
    ],
    aRetenir: "Une source de protéines à chaque repas aide à tenir jusqu'au suivant et à garder tes muscles.",
    question: {
      q: "Lequel de ces repas contient une vraie source de protéines ?",
      options: [
        "Pâtes à la sauce tomate",
        "Tartine de confiture et jus d'orange",
        "Salade de lentilles avec un œuf"
      ],
      bonne: 2,
      explication: "Lentilles et œuf apportent tous deux des protéines. Des pâtes nature ou une tartine sucrée en contiennent peu et rassasient moins longtemps."
    },
    action: "Dans Repas, vérifie que ton prochain repas contient une source de protéines.",
    source: "Leidy 2015, Am J Clin Nutr ; Morton 2018, Br J Sports Med"
  },
  {
    id: "l05-marcher",
    jour: 5,
    theme: "mouvement",
    titre: "Marcher, le super-pouvoir discret",
    texte: [
      "Le sport ne représente qu'une petite partie de ta dépense d'énergie. Le reste vient des mouvements du quotidien : marcher, monter les escaliers, faire le ménage, jouer avec les enfants. C'est souvent là que se cache la plus grande marge de progrès.",
      "Bonne nouvelle : chaque pas compte. De grandes analyses montrent que les bénéfices pour la santé augmentent avec le nombre de pas, jusqu'à un plateau vers 6 000 à 8 000 pas par jour après 60 ans, et 8 000 à 10 000 avant. Si tu pars de 3 000, viser 4 000 est déjà une victoire.",
      "Une astuce simple : marcher après les repas. Même deux à cinq minutes de marche légère atténuent la montée du sucre dans le sang, comparé au fait de rester assis. Dix minutes après le dîner, c'est un rituel facile à installer."
    ],
    aRetenir: "Chaque pas compte, et quelques minutes de marche après le repas font une vraie différence.",
    question: {
      q: "Selon les études, que fait une courte marche après un repas ?",
      options: [
        "Elle atténue la hausse du sucre sanguin, comparé au fait de rester assis",
        "Elle gêne la digestion",
        "Elle n'a d'effet qu'au-delà d'une heure de marche"
      ],
      bonne: 0,
      explication: "Une analyse de 2022 montre que même 2 à 5 minutes de marche légère après un repas atténuent la hausse de la glycémie, comparé à la position assise."
    },
    action: "Après ton prochain repas, marche 10 minutes, puis ajoute-la dans Séances → Activité.",
    source: "Buffey 2022, Sports Med ; Paluch 2022, Lancet Public Health"
  },
  {
    id: "l06-sommeil-regulier",
    jour: 6,
    theme: "sommeil",
    titre: "Dormir à heures régulières",
    texte: [
      "Le sommeil influence ta faim, ton humeur, tes envies de sucre et ta récupération. Les sociétés savantes recommandent au moins 7 heures par nuit aux adultes. Après une nuit courte, on a souvent plus faim et moins d'énergie pour bouger : ce n'est pas un manque de volonté.",
      "La régularité compte au moins autant que la durée. Ton horloge interne aime la routine : te coucher et surtout te lever à peu près à la même heure, week-end compris, t'aide à t'endormir plus facilement et à mieux récupérer.",
      "Commence par l'heure du lever, plus facile à maîtriser. Si tu manques de sommeil, avance ensuite ton coucher par pas de 15 minutes. Une petite routine du soir (lumière tamisée, lecture, douche tiède) signale à ton corps que la journée se termine."
    ],
    aRetenir: "Au moins 7 heures, et surtout des horaires réguliers : ton horloge interne adore la routine.",
    question: {
      q: "Quel repère aide le plus à stabiliser ton horloge interne ?",
      options: [
        "Rattraper ton sommeil le dimanche jusqu'à midi",
        "Boire un café en fin de journée pour tenir",
        "Te lever à peu près à la même heure chaque jour"
      ],
      bonne: 2,
      explication: "Une heure de lever stable ancre ton horloge. Les très longues grasses matinées décalent ton rythme, un peu comme un petit décalage horaire."
    },
    action: "Note tes heures de coucher et de lever dans Sommeil, et choisis une heure de lever fixe.",
    source: "Watson 2015, Sleep (AASM/SRS) ; Windred 2024, Sleep"
  },
  {
    id: "l07-tout-ou-rien",
    jour: 7,
    theme: "mental",
    titre: "Sortir du tout ou rien",
    texte: [
      "« J'ai mangé un croissant, ma journée est fichue. » « J'ai raté ma séance, autant arrêter. » Ce raisonnement en noir et blanc est l'un des pièges les plus fréquents quand on change ses habitudes.",
      "Les études montrent que penser en tout ou rien est associé à une reprise de poids plus fréquente après un régime. À l'inverse, oublier une fois ton habitude ne freine pas vraiment sa mise en place : ce qui compte, c'est de reprendre vite.",
      "Remplace le tout ou rien par le « quelque chose ». Pas le temps pour ta séance d'une heure ? Fais-en dix minutes. Un dîner copieux ? Le petit-déjeuner suivant est une nouvelle occasion. Une règle simple t'aidera : ne jamais manquer deux fois de suite."
    ],
    aRetenir: "Un écart n'efface rien. Fais quelque chose plutôt que rien, et ne manque jamais deux fois de suite.",
    question: {
      q: "Tu as raté ta séance de mardi. Quelle est la réaction la plus utile ?",
      options: [
        "Attendre lundi prochain pour repartir de zéro",
        "Faire une version courte dès que possible",
        "Doubler la séance suivante pour compenser"
      ],
      bonne: 1,
      explication: "Une version courte garde l'habitude vivante. Attendre lundi ou te punir avec une double séance entretient le tout ou rien."
    },
    action: "Choisis ta version de secours de 10 minutes pour les jours chargés, et note-la.",
    source: "Palascha 2015, J Health Psychol ; Lally 2010, Eur J Soc Psychol"
  },

  /* ---------------------------------------------------------------- */
  /* Semaine 2 : comprendre ce que tu manges                           */
  /* ---------------------------------------------------------------- */
  {
    id: "l08-balance-energetique",
    jour: 8,
    theme: "nutrition",
    titre: "Balance énergétique, eau et paliers",
    texte: [
      "Pour perdre de la graisse, ton corps doit dépenser un peu plus d'énergie qu'il n'en reçoit, sur la durée. Mais la balance ne mesure pas que la graisse : l'eau, le sel, le contenu digestif, les réserves de glucides des muscles (qui retiennent de l'eau) et le cycle menstruel la font varier de 1 à 2 kg d'un jour à l'autre.",
      "Un repas salé ou une grosse séance peut donc afficher un kilo de plus le lendemain, sans un gramme de graisse en plus. Regarde plutôt la tendance sur deux à trois semaines, en te pesant dans les mêmes conditions : le matin, après les toilettes, avant de manger.",
      "Les paliers sont normaux. Quand tu perds du poids, ton corps dépense un peu moins, et la perte ralentit. Ce n'est ni un échec ni un métabolisme « cassé » : c'est le signal pour revoir tes habitudes, pas pour manger encore moins."
    ],
    aRetenir: "Le poids du jour fluctue. Fie-toi à la tendance sur plusieurs semaines, pas au chiffre du matin.",
    question: {
      q: "Tu as pris 1 kg en une nuit après un repas au restaurant. Le plus probable ?",
      options: [
        "Surtout de l'eau et du contenu digestif",
        "Un kilo de graisse",
        "Un métabolisme qui s'est bloqué"
      ],
      bonne: 0,
      explication: "Stocker 1 kg de graisse demanderait un excès d'environ 7 700 kcal. Le sel et les glucides retiennent de l'eau, qui repart en quelques jours."
    },
    action: "Pèse-toi dans les mêmes conditions et suis ta moyenne dans Tendances, pas le chiffre du jour.",
    source: "Hall 2011, Lancet"
  },
  {
    id: "l09-fibres",
    jour: 9,
    theme: "nutrition",
    titre: "Fibres et légumes, l'atout satiété",
    texte: [
      "Les fibres se trouvent dans les légumes, les fruits, les légumineuses, les céréales complètes et les oléagineux. Elles donnent du volume à ton assiette, ralentissent la digestion et nourrissent les bactéries utiles de ton intestin.",
      "L'ANSES recommande environ 30 g de fibres par jour, et la plupart des adultes en France en mangent nettement moins. Une grande analyse publiée dans The Lancet associe 25 à 29 g par jour à moins de maladies cardiovasculaires et de diabète de type 2.",
      "Pas besoin de tout changer : ajoute plutôt que d'enlever. Une poignée d'épinards dans l'omelette, des lentilles dans la salade, du pain complet à la place du blanc, un fruit au goûter. Augmente progressivement et bois de l'eau, pour laisser à ton intestin le temps de s'habituer."
    ],
    aRetenir: "Ajouter des légumes et des légumineuses rassasie mieux que retirer des aliments.",
    question: {
      q: "Lequel de ces aliments est le plus riche en fibres ?",
      options: ["Pain de mie blanc", "Riz blanc", "Pois chiches"],
      bonne: 2,
      explication: "Les légumineuses comme les pois chiches sont parmi les aliments les plus riches en fibres, et elles apportent aussi des protéines."
    },
    action: "Ajoute une portion de légumes à un repas et coche-la dans Portions du jour, dans le Journal.",
    source: "Reynolds 2019, Lancet ; ANSES 2016"
  },
  {
    id: "l10-ultra-transformes",
    jour: 10,
    theme: "nutrition",
    titre: "Ultra-transformés : lire l'étiquette",
    texte: [
      "Dans une étude de 2019, des volontaires ont mangé à volonté pendant deux semaines une alimentation ultra-transformée, puis deux semaines une alimentation peu transformée. Avec la première, ils ont mangé environ 500 kcal de plus par jour, plus vite, et pris du poids.",
      "Deux repères existent. Le Nutri-Score, de A à E, évalue la composition nutritionnelle d'un produit : sucre, sel, graisses saturées, fibres, protéines. La classification NOVA mesure le degré de transformation : les produits ultra-transformés contiennent des ingrédients qu'on n'utilise pas en cuisine, comme des arômes, des émulsifiants ou du sirop de glucose.",
      "Les deux se complètent. Pas question de tout bannir : vise une base d'aliments bruts ou peu transformés, et garde le reste pour le plaisir. Une liste d'ingrédients courte et compréhensible est souvent bon signe."
    ],
    aRetenir: "Une base d'aliments peu transformés aide à manger à ta faim sans excès, sans rien t'interdire.",
    question: {
      q: "Que mesure le Nutri-Score ?",
      options: [
        "La qualité nutritionnelle globale d'un produit",
        "Le degré de transformation d'un produit",
        "Uniquement la présence d'additifs"
      ],
      bonne: 0,
      explication: "Le Nutri-Score note la composition nutritionnelle. Le degré de transformation relève de la classification NOVA. Les deux repères se complètent."
    },
    action: "En ajoutant un aliment dans Repas, compare le Nutri-Score de deux produits que tu achètes souvent.",
    source: "Hall 2019, Cell Metab ; Santé publique France (Nutri-Score)"
  },
  {
    id: "l11-faim-envie",
    jour: 11,
    theme: "mental",
    titre: "Faim ou envie ?",
    texte: [
      "La faim physique monte progressivement, se fait sentir dans le ventre et peut être calmée par n'importe quel aliment. L'envie, elle, arrive souvent d'un coup, vise un aliment précis et naît d'une émotion, d'une habitude ou d'une publicité.",
      "Les deux sont humaines, et aucune n'est une faute. L'idée est de les reconnaître. Avant de manger, fais une pause de trente secondes : de 1 à 10, quelle est ta faim ? Si c'est une envie, tu peux choisir d'attendre quelques minutes : elle monte, atteint un pic puis redescend, comme une vague.",
      "Manger en pleine conscience aide aussi : poser les couverts entre deux bouchées, éviter les écrans, savourer. Tu repères mieux le moment où la faim s'éteint, et tu profites davantage de ce que tu manges."
    ],
    aRetenir: "Avant de manger, une question : faim ou envie ? Les deux sont permises, choisir en conscience change tout.",
    question: {
      q: "Quel signe évoque plutôt une envie qu'une faim physique ?",
      options: [
        "Elle monte doucement depuis plusieurs heures",
        "N'importe quel aliment te conviendrait",
        "Elle surgit d'un coup et vise un aliment précis"
      ],
      bonne: 2,
      explication: "L'envie est soudaine et ciblée, souvent liée à une émotion ou un contexte. La faim physique est progressive et accepte des aliments variés."
    },
    action: "Avant ton prochain en-cas, note ta faim de 1 à 10 et ce que tu ressens.",
    source: "Warren 2017, Nutr Res Rev"
  },
  {
    id: "l12-planifier",
    jour: 12,
    theme: "nutrition",
    titre: "Planifier ses repas et ses courses",
    texte: [
      "À 19 h, avec la fatigue et la faim, on décide rarement au mieux. Planifier, c'est prendre les décisions quand tu as l'esprit clair. Une grande étude française, NutriNet-Santé, associe la planification des repas à une alimentation plus variée et de meilleure qualité.",
      "Pas besoin d'un menu parfait sur sept jours. Commence par trois dîners pour la semaine, avec une protéine, des légumes et un féculent. Prévois des restes pour le lendemain midi, et un plan de secours rapide : omelette, soupe et pain complet, lentilles en conserve.",
      "Écris ta liste de courses à partir de ce plan, et évite de faire les courses le ventre vide. Garde quelques basiques dans tes placards : légumineuses en conserve, légumes surgelés, œufs, flocons d'avoine, poisson en conserve."
    ],
    aRetenir: "Décider à l'avance, l'esprit clair, protège tes choix des soirs de fatigue.",
    question: {
      q: "Par où commencer pour planifier sans t'épuiser ?",
      options: [
        "Prévoir trois dîners et la liste de courses qui va avec",
        "Peser à l'avance tous les repas de la semaine",
        "Cuisiner sept jours de repas le dimanche"
      ],
      bonne: 0,
      explication: "Commencer petit rend la planification tenable. Trois dîners prévus évitent déjà plusieurs décisions prises dans la fatigue."
    },
    action: "Prévois tes trois prochains dîners et écris la liste de courses qui va avec.",
    source: "Ducrot 2017, Int J Behav Nutr Phys Act"
  },
  {
    id: "l13-repas-partages",
    jour: 13,
    theme: "nutrition",
    titre: "Restaurant et repas entre amis",
    texte: [
      "Les repas partagés font partie de la vie, et ils sont précieux. On mange pourtant en général davantage à plusieurs que seul, surtout entre amis : les conversations allongent le repas et on suit, sans s'en rendre compte, le rythme des autres.",
      "Pas besoin de refuser les invitations ni de « compenser » le lendemain. Quelques stratégies suffisent : regarder la carte à l'avance, choisir un plat avec des légumes et une protéine, demander une carafe d'eau, partager un dessert si tu en as envie.",
      "Tu as le droit de dire « non merci » avec le sourire, sans te justifier. Et si tu manges plus que prévu, ce n'est pas grave : un repas ne définit pas ta semaine. Reprends simplement tes habitudes au repas suivant, sans te priver."
    ],
    aRetenir: "Profite des repas partagés : un peu d'anticipation suffit, et aucun repas n'est à compenser.",
    question: {
      q: "Pourquoi mange-t-on souvent plus à plusieurs ?",
      options: [
        "Parce qu'on manque de volonté",
        "Parce que les repas durent plus longtemps et qu'on suit le rythme des autres",
        "Parce que le corps dépense moins en compagnie"
      ],
      bonne: 1,
      explication: "C'est la facilitation sociale : repas plus longs, imitation des autres. Ce n'est pas un manque de volonté, juste un phénomène à connaître."
    },
    action: "Pour ton prochain repas dehors, choisis à l'avance un plat avec des légumes et une protéine.",
    source: "Ruddock 2019, Am J Clin Nutr"
  },
  {
    id: "l14-alcool",
    jour: 14,
    theme: "nutrition",
    titre: "L'alcool, ce qu'il faut savoir",
    texte: [
      "L'alcool apporte 7 kcal par gramme, presque autant que les graisses, sans rassasier. Un verre standard (10 g d'alcool pur : un verre de vin, un demi de bière ou un apéritif servi au bar) représente environ 70 kcal, sans compter le sucre des cocktails.",
      "Il relâche aussi l'attention portée à ce qu'on mange et perturbe la seconde moitié de la nuit : on s'endort parfois plus vite, mais on dort moins bien. Le lendemain, fatigue et envies de sucre s'invitent plus facilement.",
      "Santé publique France propose des repères : pas plus de 10 verres standard par semaine, pas plus de 2 par jour, et des jours sans alcool chaque semaine. Pour la santé, moins c'est mieux. Alterner avec de l'eau pétillante ou prévoir des soirées sans alcool sont de bons premiers pas."
    ],
    aRetenir: "L'alcool apporte des calories sans rassasier et abîme le sommeil. Moins, c'est mieux.",
    question: {
      q: "Quels sont les repères de consommation d'alcool en France ?",
      options: [
        "Un verre de vin par jour protège le cœur",
        "Au maximum 2 verres par jour, 10 par semaine, et des jours sans",
        "Aucune limite si on ne boit que le week-end"
      ],
      bonne: 1,
      explication: "Ce sont les repères de Santé publique France depuis 2017. Ce ne sont pas des objectifs : pour la santé, moins on boit, mieux c'est."
    },
    action: "Choisis deux jours sans alcool cette semaine et prévois une boisson plaisir pour les remplacer.",
    source: "Santé publique France 2017 (repères alcool)"
  },

  /* ---------------------------------------------------------------- */
  /* Semaine 3 : le corps en mouvement                                  */
  /* ---------------------------------------------------------------- */
  {
    id: "l15-renforcement",
    jour: 15,
    theme: "mouvement",
    titre: "La musculation, c'est pour tout le monde",
    texte: [
      "L'OMS recommande à tous les adultes des activités de renforcement musculaire au moins deux jours par semaine. Après 65 ans, elle conseille aussi de travailler l'équilibre, pour garder ton autonomie et limiter le risque de chute.",
      "Le muscle n'est pas qu'une question d'apparence. Il aide à préserver la force, les os et la mobilité, et soutient ta dépense d'énergie. Quand tu perds du poids, il aide à ce que ce soit surtout de la graisse qui parte.",
      "Une idée reçue tenace : les femmes « gonfleraient ». En réalité, prendre beaucoup de volume demande des années d'entraînement ciblé et une alimentation adaptée. Pour commencer, pas besoin de salle : squats sur une chaise, pompes contre un mur, fentes, gainage. Deux séances de 20 minutes par semaine, c'est déjà un vrai début."
    ],
    aRetenir: "Le renforcement musculaire, deux fois par semaine, est utile à tout âge et pour tout le monde.",
    question: {
      q: "Combien de jours de renforcement musculaire l'OMS recommande-t-elle aux adultes ?",
      options: ["Au moins 2 jours par semaine", "Seulement après 40 ans", "Uniquement pour les sportifs"],
      bonne: 0,
      explication: "L'OMS recommande au moins 2 jours par semaine de renforcement des grands groupes musculaires, pour tous les adultes, y compris après 65 ans."
    },
    action: "Fais 2 séries de squats sur une chaise et de pompes contre un mur, puis note-les dans Séances.",
    source: "OMS 2020 ; Westcott 2012, Curr Sports Med Rep"
  },
  {
    id: "l16-progression",
    jour: 16,
    theme: "mouvement",
    titre: "Progresser pas à pas",
    texte: [
      "Ton corps s'adapte à ce que tu lui demandes. Pour continuer à progresser, il faut augmenter peu à peu la difficulté : c'est la surcharge progressive. Ajouter une répétition, un peu de poids, une série, ou ralentir le mouvement.",
      "Un repère simple : choisis une fourchette de répétitions, par exemple 8 à 12. Quand tu réussis 12 répétitions propres sur toutes tes séries, augmente légèrement la charge (de l'ordre de 2 à 10 %) et repars vers 8. Garde une à trois répétitions en réserve : tu finis la série en sentant que tu pourrais en faire encore une ou deux.",
      "Noter tes séances est indispensable : sans trace, impossible de savoir si tu progresses. La technique passe avant la charge, et progresser lentement, c'est toujours progresser."
    ],
    aRetenir: "Un peu plus que la dernière fois, avec une bonne technique : c'est ainsi que tu progresses.",
    question: {
      q: "Tu fais 12 répétitions propres sur toutes tes séries depuis deux séances. Que faire ?",
      options: [
        "Rester à ce poids pour toujours",
        "Doubler la charge d'un coup",
        "Augmenter un peu la charge et viser 8 répétitions"
      ],
      bonne: 2,
      explication: "C'est la double progression : d'abord les répétitions, puis la charge, par petites étapes. Doubler d'un coup expose à la blessure."
    },
    action: "Dans Séances, note tes charges et répétitions, et vise une répétition de plus la prochaine fois.",
    source: "ACSM 2009, Med Sci Sports Exerc ; Helms 2016, Strength Cond J"
  },
  {
    id: "l17-recuperation",
    jour: 17,
    theme: "mouvement",
    titre: "Récupérer et comprendre les courbatures",
    texte: [
      "Les courbatures apparaissent souvent 24 à 72 heures après un effort nouveau ou inhabituel, puis disparaissent en quelques jours. Elles ne prouvent pas qu'une séance était efficace : avec la régularité, ton corps s'habitue et elles diminuent, alors que tu continues de progresser.",
      "C'est pendant la récupération que le corps se renforce. Les piliers : un sommeil suffisant, assez de protéines et un peu de mouvement doux. Marcher ou pédaler tranquillement soulage souvent mieux que l'immobilité complète.",
      "Laisse en général 48 heures entre deux séances intenses pour un même groupe musculaire. Apprends à distinguer une gêne musculaire diffuse, normale, d'une douleur vive, localisée ou articulaire : dans ce cas, arrête et demande l'avis d'un professionnel de santé."
    ],
    aRetenir: "Les courbatures ne mesurent pas l'efficacité. Sommeil, protéines et repos te font progresser.",
    question: {
      q: "Pas de courbatures après ta séance : qu'en conclure ?",
      options: [
        "La séance ne servait à rien",
        "Rien de particulier : les courbatures ne mesurent pas l'efficacité",
        "Il faut doubler l'intensité la prochaine fois"
      ],
      bonne: 1,
      explication: "Les courbatures reflètent surtout la nouveauté de l'effort. On peut progresser sans en avoir, et elles diminuent quand le corps s'habitue."
    },
    action: "Après ta prochaine séance, prévois une marche tranquille de 15 minutes le lendemain.",
    source: "Cheung 2003, Sports Med ; Schoenfeld 2013, Strength Cond J"
  },
  {
    id: "l18-temps-assis",
    jour: 18,
    theme: "mouvement",
    titre: "Casser le temps assis",
    texte: [
      "Beaucoup d'entre nous passent huit heures ou plus assis chaque jour. Même avec une séance de sport, rester assis de longues heures sans interruption n'est pas idéal. L'OMS recommande de limiter le temps sédentaire et de le remplacer par n'importe quelle activité, même légère.",
      "Dans une étude, interrompre la position assise toutes les 20 minutes par deux minutes de marche légère a réduit la hausse du sucre et de l'insuline après le repas, comparé au fait de rester assis sans bouger.",
      "L'idée : bouger un peu, souvent. Te lever à chaque appel téléphonique, remplir ta gourde plus loin, prendre l'escalier, faire quelques pas pendant les publicités. Au début, une alarme toutes les 30 à 60 minutes peut servir de rappel."
    ],
    aRetenir: "Bouger un peu, souvent : chaque pause compte, même deux minutes.",
    question: {
      q: "Qu'a montré l'étude sur les pauses actives ?",
      options: [
        "Deux minutes de marche toutes les 20 minutes aident à réguler le sucre après un repas",
        "Seul le sport intense a un effet",
        "Rester debout sans bouger compense tout"
      ],
      bonne: 0,
      explication: "Des pauses courtes et fréquentes ont réduit la hausse de la glycémie et de l'insuline après le repas, comparé à une position assise prolongée."
    },
    action: "Aujourd'hui, lève-toi deux minutes toutes les heures, et suis tes pas dans le Journal.",
    source: "Dunstan 2012, Diabetes Care ; OMS 2020"
  },
  {
    id: "l19-test-parole",
    jour: 19,
    theme: "mouvement",
    titre: "Cardio : le test de la parole",
    texte: [
      "L'OMS recommande aux adultes 150 à 300 minutes d'activité d'intensité modérée par semaine, ou 75 à 150 minutes d'intensité soutenue, ou un mélange des deux. Mais comment savoir à quelle intensité tu es, sans cardiofréquencemètre ?",
      "Le test de la parole : à intensité modérée, tu peux parler en phrases complètes mais pas chanter. À intensité soutenue, tu ne peux dire que quelques mots avant de reprendre ton souffle. Ce test simple correspond bien aux seuils mesurés en laboratoire.",
      "L'essentiel de ton cardio peut se faire à intensité modérée : marche rapide, vélo, natation tranquille. C'est confortable, durable et efficace. Ajoute de temps en temps des passages plus soutenus si tu en as envie, sans aucune obligation de souffrir."
    ],
    aRetenir: "Parler sans pouvoir chanter : c'est l'intensité modérée, idéale pour la plupart de tes séances.",
    question: {
      q: "Pendant ta marche rapide, tu peux parler mais pas chanter. Quelle est ton intensité ?",
      options: ["Légère", "Modérée", "Maximale"],
      bonne: 1,
      explication: "Parler en phrases sans pouvoir chanter correspond à une intensité modérée, celle des 150 minutes hebdomadaires recommandées par l'OMS."
    },
    action: "Fais 20 minutes de marche rapide avec le test de la parole et ajoute-la dans Séances → Activité.",
    source: "OMS 2020 ; Persinger 2004, Med Sci Sports Exerc"
  },
  {
    id: "l20-regularite",
    jour: 20,
    theme: "habitudes",
    titre: "La régularité bat l'intensité",
    texte: [
      "Une séance héroïque suivie de trois semaines d'arrêt fait moins qu'une séance modeste chaque semaine. Ce qui transforme ton corps et ta santé, c'est l'accumulation : des mois de petites actions répétées.",
      "Une étude auprès de nouveaux inscrits en salle a montré que la fréquence des séances était le facteur décisif pour que l'exercice devienne une habitude : au moins quatre séances par semaine pendant six semaines, dans ce groupe. Et une séance plaisante donne envie de revenir, quand une séance épuisante donne envie d'abandonner.",
      "Choisis un niveau d'effort que tu pourrais tenir même pendant une semaine chargée. Mieux vaut trois séances de 20 minutes que tu fais vraiment qu'une heure que tu repousses sans cesse. Tu pourras toujours augmenter plus tard."
    ],
    aRetenir: "Fréquent et faisable vaut mieux que rare et héroïque.",
    question: {
      q: "Qu'est-ce qui construit le mieux une habitude sportive ?",
      options: [
        "Des séances extrêmes une fois par mois",
        "Attendre que la motivation arrive",
        "Des séances raisonnables et fréquentes"
      ],
      bonne: 2,
      explication: "La fréquence répète le lien entre un contexte et une action. Des séances raisonnables se tiennent dans la durée, sans épuiser ta motivation."
    },
    action: "Programme trois séances courtes cette semaine dans Séances, avec l'heure et le lieu.",
    source: "Kaushal & Rhodes 2015, J Behav Med"
  },
  {
    id: "l21-mobilite",
    jour: 21,
    theme: "mouvement",
    titre: "Souplesse, mobilité et équilibre",
    texte: [
      "Te baisser sans gêne, lacer tes chaussures facilement, tourner la tête en voiture : la mobilité est précieuse au quotidien. Les recommandations conseillent des exercices de souplesse au moins deux à trois fois par semaine, en tenant chaque étirement 10 à 30 secondes, jusqu'à une légère tension, jamais une douleur.",
      "Avant une séance, privilégie un échauffement dynamique : rotations d'épaules, montées de genoux, squats sans charge. Des étirements statiques courts ne posent pas de problème, mais de longs étirements immobiles juste avant un effort de force ou de vitesse sont peu utiles.",
      "Après 65 ans, l'OMS recommande aussi des exercices d'équilibre plusieurs fois par semaine. Tenir sur un pied en te brossant les dents, près d'un appui, est un bon début. Quelques minutes régulières, au réveil ou devant la télévision, font déjà une différence."
    ],
    aRetenir: "Échauffement dynamique avant l'effort, étirements doux quand tu veux, et un peu d'équilibre chaque jour.",
    question: {
      q: "Quel échauffement convient le mieux avant une séance de musculation ?",
      options: [
        "De longs étirements immobiles, deux minutes par muscle",
        "Aucun échauffement",
        "Des mouvements dynamiques et progressifs"
      ],
      bonne: 2,
      explication: "Un échauffement dynamique prépare muscles et articulations. De longs étirements statiques juste avant l'effort peuvent légèrement réduire la force."
    },
    action: "Ce soir, fais 5 minutes d'étirements doux, en tenant chaque position 20 à 30 secondes.",
    source: "Garber 2011, Med Sci Sports Exerc (ACSM) ; Behm 2016, Appl Physiol Nutr Metab"
  },

  /* ---------------------------------------------------------------- */
  /* Semaine 4 : le mental et le long terme                            */
  /* ---------------------------------------------------------------- */
  {
    id: "l22-stress-emotions",
    jour: 22,
    theme: "mental",
    titre: "Stress et alimentation émotionnelle",
    texte: [
      "Manger pour se réconforter est profondément humain. Chez beaucoup de personnes, le stress augmente l'attirance pour les aliments gras et sucrés, qui apaisent sur le moment. Le souci n'est pas de manger une émotion de temps en temps, mais quand cela devient la seule solution.",
      "Première étape : nommer ce que tu ressens. Fatigue, ennui, colère, solitude ? Mettre un mot sur l'émotion crée un espace entre elle et ta réaction. Demande-toi ensuite de quoi tu as vraiment besoin : de repos, de parler, de bouger, de pleurer, ou de manger.",
      "Prépare une petite liste d'alternatives : respirer lentement deux minutes, sortir marcher, appeler un proche, prendre une douche chaude. Et si tu choisis de manger, fais-le assis, en savourant, sans culpabilité. Si la nourriture te semble souvent hors de contrôle, parles-en à un professionnel de santé."
    ],
    aRetenir: "Nomme l'émotion, cherche le vrai besoin, puis choisis : manger reste permis.",
    question: {
      q: "Quelle première étape aide face à une envie de manger liée au stress ?",
      options: ["Nommer l'émotion que tu ressens", "Te l'interdire complètement", "Sauter le repas suivant"],
      bonne: 0,
      explication: "Nommer l'émotion crée un temps d'arrêt et t'aide à choisir. Interdire ou compenser entretient souvent le cycle restriction puis excès."
    },
    action: "Écris trois activités qui t'apaisent, autres que manger, à essayer la prochaine fois.",
    source: "Adam & Epel 2007, Physiol Behav"
  },
  {
    id: "l23-autocompassion",
    jour: 23,
    theme: "mental",
    titre: "Après un écart, la bienveillance",
    texte: [
      "Les chercheurs Polivy et Herman ont décrit l'effet « au point où j'en suis » : après un petit écart, les personnes qui suivent un régime strict ont tendance à lâcher toute retenue et à manger bien plus. La culpabilité nourrit l'excès.",
      "Dans une expérience, des participantes venaient de manger un beignet. Certaines recevaient un message bienveillant : tout le monde mange parfois ce genre d'aliment, inutile de s'en vouloir. Chez celles qui se restreignaient le plus, ce message a réduit la quantité de bonbons mangés ensuite. L'autocompassion n'est pas de la complaisance : c'est ce qui permet de repartir.",
      "La prochaine fois, parle-toi comme à un ami : « C'est humain. Que s'est-il passé ? Que puis-je faire maintenant ? » Puis fais une seule chose utile, comme boire un verre d'eau ou reprendre normalement au repas suivant."
    ],
    aRetenir: "Un écart n'est pas un échec. Parle-toi comme à un ami et reprends au prochain repas.",
    question: {
      q: "Après un écart, quelle réaction aide le plus à reprendre le cap ?",
      options: [
        "Considérer que la semaine est fichue",
        "Te punir en sautant un repas",
        "Te parler avec bienveillance, puis reprendre au repas suivant"
      ],
      bonne: 2,
      explication: "La bienveillance désamorce l'effet « au point où j'en suis ». Se punir entretient le cycle restriction puis excès."
    },
    action: "Écris la phrase bienveillante que tu te diras après ton prochain écart.",
    source: "Adams & Leary 2007, J Soc Clin Psychol ; Polivy & Herman 1985, Am Psychol"
  },
  {
    id: "l24-environnement",
    jour: 24,
    theme: "habitudes",
    titre: "Façonner ton environnement",
    texte: [
      "Une grande partie de nos gestes quotidiens sont déclenchés par l'environnement, pas par une décision consciente. Ce que tu vois, ce qui est à portée de main, la taille de ton assiette : tout cela influence ce que tu fais, souvent sans que tu t'en rendes compte.",
      "Les études montrent par exemple que des portions et des contenants plus grands font manger davantage. Plutôt que de compter sur ta volonté, organise ton environnement pour que le bon choix soit le plus facile : fruits visibles sur la table, biscuits rangés en hauteur, gourde remplie sur le bureau.",
      "Cela marche aussi pour bouger : tenue de sport préparée la veille, tapis déroulé dans le salon, baskets près de la porte. Ajoute de la friction aux habitudes que tu veux réduire, et enlève-la de celles que tu veux construire."
    ],
    aRetenir: "Rends le bon choix facile et visible : ton environnement travaille pour toi.",
    question: {
      q: "Quelle stratégie aide le plus à grignoter moins ?",
      options: [
        "Laisser les biscuits sur la table pour tester ta volonté",
        "Ranger les biscuits hors de vue et laisser des fruits visibles",
        "T'interdire d'en acheter pour toujours"
      ],
      bonne: 1,
      explication: "Rendre le bon choix visible et facile, et l'autre moins accessible, demande moins d'effort que la volonté seule, sans rien interdire."
    },
    action: "Prépare ce soir ta tenue de sport ou ta gourde pour demain, bien en vue.",
    source: "Wood & Rünger 2016, Annu Rev Psychol ; Hollands 2015, Cochrane"
  },
  {
    id: "l25-soutien",
    jour: 25,
    theme: "habitudes",
    titre: "La force du soutien social",
    texte: [
      "Changer seul, c'est possible, mais plus difficile. Dans une étude, les personnes venues avec des amis et soutenues par un groupe ont été bien plus nombreuses à aller au bout du programme, puis à maintenir leur perte de poids dix mois plus tard, que celles venues seules.",
      "Le soutien prend plusieurs formes : quelqu'un avec qui marcher, un proche qui t'encourage, un collègue avec qui partager tes progrès. Dis clairement ce qui t'aide (« demande-moi comment s'est passée ma séance ») et ce qui ne t'aide pas, comme les commentaires sur ton assiette.",
      "Et si ton entourage ne suit pas, ce n'est pas grave. Tu n'as pas à convaincre tout le monde. Une seule personne bienveillante suffit souvent à faire la différence."
    ],
    aRetenir: "Une personne bienveillante à tes côtés augmente nettement tes chances de tenir.",
    question: {
      q: "Quelle demande aide le plus un proche à te soutenir ?",
      options: [
        "« Surveille ce que je mange. »",
        "« N'en parlons jamais. »",
        "« Demande-moi comment s'est passée ma marche. »"
      ],
      bonne: 2,
      explication: "Un soutien précis et encourageant motive. La surveillance de l'assiette crée souvent tension et culpabilité."
    },
    action: "Propose à un proche une marche ensemble cette semaine, avec le jour et l'heure.",
    source: "Wing & Jeffery 1999, J Consult Clin Psychol"
  },
  {
    id: "l26-ecrans-lumiere",
    jour: 26,
    theme: "sommeil",
    titre: "Écrans, lumière et sommeil",
    texte: [
      "Ton horloge interne se règle surtout grâce à la lumière. Le matin, la lumière du jour lui indique que la journée commence : passer quelques minutes dehors, même par temps gris, t'aide à trouver le sommeil plus facilement le soir.",
      "Le soir, c'est l'inverse. Dans une étude, lire sur une tablette lumineuse avant de dormir a retardé la mélatonine, l'endormissement et l'horloge interne, et laissé les participants moins alertes le lendemain, comparé à un livre papier. Le contenu compte aussi : messages et vidéos sans fin tiennent le cerveau en éveil.",
      "Essaie de poser les écrans 30 à 60 minutes avant le coucher, de baisser les lumières et de laisser le téléphone hors de la chambre. Pense aussi à la caféine : même prise six heures avant le coucher, elle peut raccourcir ta nuit."
    ],
    aRetenir: "De la lumière le matin, de la pénombre le soir : ton sommeil suit ce rythme.",
    question: {
      q: "Quel geste aide le plus ton horloge interne ?",
      options: [
        "Passer quelques minutes à la lumière du jour le matin",
        "Regarder des vidéos au lit pour te détendre",
        "Boire un café vers 17 h"
      ],
      bonne: 0,
      explication: "La lumière du matin cale ton horloge et favorise l'endormissement le soir. Les écrans au lit et le café tardif ont plutôt l'effet inverse."
    },
    action: "Ce soir, pose ton téléphone 30 minutes avant de dormir, puis note ta nuit dans Sommeil.",
    source: "Chang 2015, PNAS ; Drake 2013, J Clin Sleep Med"
  },
  {
    id: "l27-progres",
    jour: 27,
    theme: "habitudes",
    titre: "Mesurer tes progrès autrement",
    texte: [
      "La balance est un outil parmi d'autres, et pas le plus fiable au jour le jour. Quand tu fais du renforcement musculaire, tu peux perdre de la graisse et gagner du muscle : ton poids bouge peu, alors que ton corps change.",
      "Le tour de taille est un repère simple, recommandé par un consensus international d'experts. Mesure-le le matin, à mi-chemin entre la dernière côte et le haut de la hanche, toutes les deux à quatre semaines. Ajoute des photos dans la même tenue et la même lumière, et observe comment tombent tes vêtements.",
      "Note aussi les victoires invisibles : monter les escaliers sans t'essouffler, soulever une charge plus lourde, mieux dormir, avoir plus d'énergie, manger avec plus de sérénité. Ce sont souvent les premiers signes que tes habitudes fonctionnent."
    ],
    aRetenir: "Ton poids n'est qu'un chiffre parmi d'autres : mesures, photos et énergie racontent la vraie histoire.",
    question: {
      q: "Tu fais du renforcement et ton poids stagne depuis trois semaines. Que regarder ?",
      options: [
        "Rien : c'est la preuve que rien ne marche",
        "Ton tour de taille, tes photos et tes performances",
        "Le prix d'une nouvelle balance"
      ],
      bonne: 1,
      explication: "Le poids ne distingue pas la graisse du muscle. Tour de taille, photos et charges soulevées montrent des progrès que la balance cache."
    },
    action: "Prends tes mensurations dans Mesures, dont ton tour de taille, et note une victoire invisible.",
    source: "Ross 2020, Nat Rev Endocrinol"
  },
  {
    id: "l28-durer",
    jour: 28,
    theme: "mental",
    titre: "Durer : la suite commence ici",
    texte: [
      "Bravo, tu as terminé les 28 leçons. Ce n'est pas une ligne d'arrivée : le plus important est de garder ce que tu as construit. Les personnes qui maintiennent leurs résultats pendant des années partagent souvent les mêmes habitudes : bouger chaque jour, se suivre régulièrement, garder des repas assez réguliers.",
      "Le maintien n'est pas un régime qui s'arrête, c'est une façon de vivre qui te convient. Garde les habitudes qui te paraissent faciles aujourd'hui : ce sont elles qui dureront. Pour les autres, reviens aux bases : petit, précis, quand et où.",
      "Il y aura des semaines moins bonnes, c'est certain. Ce qui compte, c'est ta capacité à revenir, avec bienveillance. Pas besoin de perfection, seulement de constance. Tu es déjà en train de devenir la personne que tu voulais être."
    ],
    aRetenir: "Le maintien se construit avec des habitudes que tu aimes assez pour les garder.",
    question: {
      q: "Qu'est-ce qui aide le plus à garder tes résultats sur la durée ?",
      options: [
        "Enchaîner les régimes stricts",
        "Des habitudes simples, gardées longtemps",
        "Arrêter de te suivre une fois l'objectif atteint"
      ],
      bonne: 1,
      explication: "Les personnes qui maintiennent leurs résultats gardent souvent leurs habitudes : activité quotidienne, suivi régulier, repas réguliers."
    },
    action: "Choisis trois habitudes à garder et programme-les cette semaine avec l'heure et le lieu.",
    source: "Wing & Phelan 2005, Am J Clin Nutr"
  }
];
