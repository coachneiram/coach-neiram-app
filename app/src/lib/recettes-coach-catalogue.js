/**
 * Catalogue des recettes du coach.
 *
 * CE FICHIER EST ALIMENTE CHAQUE SEMAINE par la routine « Recettes hebdo »
 * (dossier Drive « Recettes – À intégrer » → pull request). Le format est
 * decrit dans docs/recettes-coach.md et verifie, recette par recette, par
 * tests/recettes-coach.test.mjs : regimes reellement respectes, macros
 * coherentes, champs complets. Une recette qui ne passe pas ces controles
 * ne peut pas etre fusionnee.
 *
 * Syntaxe JSON stricte entre les crochets (guillemets doubles, pas de
 * virgule finale) : le fichier doit pouvoir etre relu par un script.
 * Les recettes les plus recentes en premier.
 */

export const RECETTES_COACH = [
  {
    "id": "2026-10-05-tofu-brouille-legumes-pain-complet",
    "semaine": "2026-10-05",
    "nom": "Tofu brouillé aux légumes et pain complet",
    "description": "Un petit-déjeuner salé 100 % végétal : tofu doré aux épices, champignons, poivron et épinards, servi sur du pain complet grillé.",
    "categorie": "petit-dejeuner",
    "profils": [
      "perte",
      "remise-en-forme"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "soja",
      "gluten"
    ],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 10,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Tofu ferme",
        "quantite": "250 g"
      },
      {
        "nom": "Pain complet",
        "quantite": "100 g (4 tranches)"
      },
      {
        "nom": "Champignons de Paris",
        "quantite": "150 g"
      },
      {
        "nom": "Poivron rouge",
        "quantite": "100 g"
      },
      {
        "nom": "Épinards frais",
        "quantite": "100 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (10 g)"
      },
      {
        "nom": "Sauce soja",
        "quantite": "1 cuillère à soupe (10 g)"
      },
      {
        "nom": "Curcuma, paprika, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Émiette le tofu à la fourchette et fais revenir les champignons et le poivron en dés 5 minutes dans l'huile.",
      "Ajoute le tofu, le curcuma, le paprika et la sauce soja, puis cuis 4 minutes en remuant.",
      "Incorpore les épinards 1 minute jusqu'à ce qu'ils tombent.",
      "Grille le pain complet et sers le tofu brouillé dessus."
    ],
    "parPortion": {
      "kcal": 348,
      "p": 24,
      "c": 27,
      "f": 16,
      "fibres": 8
    },
    "moment": "quotidien",
    "adaptations": "Perte : 2 tranches de pain par portion, légumes à volonté. Prise de masse : 3 tranches de pain et un filet d'huile en plus.",
    "tags": [
      "rapide",
      "economique",
      "vegetal"
    ]
  },
  {
    "id": "2026-10-05-chili-sin-carne-haricots-riz-complet",
    "semaine": "2026-10-05",
    "nom": "Chili sin carne, haricots et riz complet",
    "description": "Un chili végétal épicé et rassasiant, parfait en meal-prep : haricots, maïs, poivron, tomates et riz complet pour recharger les réserves.",
    "categorie": "diner",
    "profils": [
      "marathon",
      "ironman",
      "remise-en-forme"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [],
    "portions": 4,
    "preparationMin": 15,
    "cuissonMin": 30,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Haricots rouges cuits (conserve rincée)",
        "quantite": "400 g"
      },
      {
        "nom": "Haricots noirs cuits (conserve rincée)",
        "quantite": "240 g"
      },
      {
        "nom": "Maïs doux",
        "quantite": "150 g"
      },
      {
        "nom": "Tomates concassées",
        "quantite": "800 g"
      },
      {
        "nom": "Poivron rouge",
        "quantite": "200 g"
      },
      {
        "nom": "Oignon",
        "quantite": "150 g"
      },
      {
        "nom": "Riz complet cuit",
        "quantite": "600 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "2 cuillères à soupe (20 g)"
      },
      {
        "nom": "Ail, cumin, piment doux, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais revenir l'oignon et le poivron en dés 5 minutes dans l'huile avec l'ail et les épices.",
      "Ajoute les tomates concassées, les haricots et le maïs, puis laisse mijoter 25 minutes à feu doux.",
      "Réchauffe le riz complet et sers-le avec le chili.",
      "Garde les portions au frais jusqu'à 4 jours dans des boîtes hermétiques."
    ],
    "parPortion": {
      "kcal": 521,
      "p": 22,
      "c": 88,
      "f": 9,
      "fibres": 19
    },
    "moment": "veille-de-course",
    "adaptations": "Veille de sortie longue : ajoute 100 g de riz cuit par portion. Remise en forme : garde les quantités indiquées avec une salade verte.",
    "tags": [
      "meal-prep",
      "economique",
      "familial"
    ]
  },
  {
    "id": "2026-10-05-cookies-avoine-banane-chocolat-vegan",
    "semaine": "2026-10-05",
    "nom": "Cookies vegan avoine, banane et chocolat",
    "description": "Des cookies moelleux sans œuf ni beurre, faciles à emporter pour une sortie longue ou un entraînement. Cuits en 12 minutes.",
    "categorie": "collation",
    "profils": [
      "marathon",
      "hyrox",
      "ironman"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten"
    ],
    "portions": 6,
    "preparationMin": 10,
    "cuissonMin": 12,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Flocons d'avoine",
        "quantite": "150 g"
      },
      {
        "nom": "Bananes mûres",
        "quantite": "240 g (2)"
      },
      {
        "nom": "Chocolat noir 70 % (vegan)",
        "quantite": "50 g"
      },
      {
        "nom": "Farine de blé",
        "quantite": "30 g"
      },
      {
        "nom": "Huile de colza",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Levure chimique, cannelle",
        "quantite": "1 cuillère à café"
      }
    ],
    "etapes": [
      "Préchauffe le four à 180 °C. Écrase les bananes à la fourchette.",
      "Mélange la banane, les flocons, la farine, l'huile, la levure et la cannelle, puis ajoute le chocolat en morceaux.",
      "Forme 12 petits tas sur une plaque recouverte de papier cuisson et aplatis-les légèrement.",
      "Enfourne 12 minutes, puis laisse refroidir avant de les ranger dans une boîte."
    ],
    "parPortion": {
      "kcal": 212,
      "p": 5,
      "c": 30,
      "f": 8,
      "fibres": 4
    },
    "moment": "pendant-effort",
    "adaptations": "Sortie longue : 2 cookies par heure d'effort. Version plus légère : 30 g de chocolat.",
    "tags": [
      "meal-prep",
      "repas-d-effort",
      "economique"
    ]
  },
  {
    "id": "2026-10-05-poulet-tandoori-riz-basmati-concombre",
    "semaine": "2026-10-05",
    "nom": "Poulet tandoori, riz basmati et concombre au yaourt",
    "description": "Du poulet mariné au yaourt et aux épices, grillé à la poêle, avec du riz basmati et une salade de concombre fraîche. Riche en protéines.",
    "categorie": "dejeuner",
    "profils": [
      "force",
      "bodybuilding",
      "prise"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "volaille",
      "lactose"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 12,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Blanc de poulet",
        "quantite": "350 g"
      },
      {
        "nom": "Yaourt nature",
        "quantite": "125 g"
      },
      {
        "nom": "Riz basmati cuit",
        "quantite": "350 g"
      },
      {
        "nom": "Concombre",
        "quantite": "150 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à café bombée (10 g)"
      },
      {
        "nom": "Tandoori masala, citron, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Coupe le poulet en cubes et mélange-le avec la moitié du yaourt, le masala et le jus de citron. Laisse mariner 30 minutes si tu peux.",
      "Fais dorer le poulet 10 à 12 minutes dans l'huile en le retournant.",
      "Coupe le concombre en dés et mélange-le avec le reste du yaourt, du sel et du citron.",
      "Sers le poulet sur le riz basmati chaud avec le concombre au yaourt."
    ],
    "parPortion": {
      "kcal": 498,
      "p": 48,
      "c": 54,
      "f": 10,
      "fibres": 1
    },
    "moment": "apres-entrainement",
    "adaptations": "Sèche : 200 g de riz cuit pour 2 personnes. Prise de masse : 450 g de riz cuit et une cuillère d'huile en plus.",
    "tags": [
      "rapide",
      "repas-d-effort"
    ]
  },
  {
    "id": "2026-10-05-salade-pommes-de-terre-sardines-haricots-verts",
    "semaine": "2026-10-05",
    "nom": "Salade tiède pommes de terre, sardines et haricots verts",
    "description": "Une salade complète façon niçoise : pommes de terre, haricots verts et sardines en boîte, relevées d'une vinaigrette à la moutarde.",
    "categorie": "dejeuner",
    "profils": [
      "hyrox",
      "maintien"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "poisson"
    ],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 20,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Pommes de terre",
        "quantite": "400 g"
      },
      {
        "nom": "Haricots verts",
        "quantite": "250 g"
      },
      {
        "nom": "Sardines au naturel (boîtes égouttées)",
        "quantite": "190 g"
      },
      {
        "nom": "Salade verte",
        "quantite": "60 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Moutarde",
        "quantite": "1 cuillère à café (5 g)"
      },
      {
        "nom": "Échalote, vinaigre, persil, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais cuire les pommes de terre en morceaux 15 minutes à l'eau salée, ajoute les haricots verts pour les 8 dernières minutes, puis égoutte.",
      "Prépare la vinaigrette avec l'huile, la moutarde, le vinaigre et l'échalote hachée.",
      "Mélange les légumes tièdes avec la vinaigrette et la salade verte.",
      "Ajoute les sardines émiettées et le persil, puis sers."
    ],
    "parPortion": {
      "kcal": 425,
      "p": 28,
      "c": 40,
      "f": 17,
      "fibres": 8
    },
    "moment": "quotidien",
    "adaptations": "Pour plus d'énergie : ajoute 100 g de pommes de terre par portion. Sèche : réduis l'huile à 1 cuillère à café.",
    "tags": [
      "economique",
      "rapide",
      "omega-3"
    ]
  },
  {
    "id": "2026-10-05-boeuf-saute-thai-nouilles-de-riz",
    "semaine": "2026-10-05",
    "nom": "Bœuf sauté façon thaï et nouilles de riz",
    "description": "Un wok express : lanières de bœuf, légumes croquants et nouilles de riz, le tout parfumé au gingembre et à la sauce soja.",
    "categorie": "diner",
    "profils": [
      "bodybuilding",
      "force"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "viande",
      "soja",
      "gluten"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 10,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Bœuf (rumsteck ou bavette)",
        "quantite": "300 g"
      },
      {
        "nom": "Nouilles de riz cuites",
        "quantite": "300 g"
      },
      {
        "nom": "Poivron rouge",
        "quantite": "150 g"
      },
      {
        "nom": "Carotte",
        "quantite": "100 g"
      },
      {
        "nom": "Brocoli",
        "quantite": "150 g"
      },
      {
        "nom": "Sauce soja",
        "quantite": "25 g (environ 2 cuillères à soupe)"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à café bombée (10 g)"
      },
      {
        "nom": "Gingembre, ail",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Coupe le bœuf en fines lanières et les légumes en petits morceaux.",
      "Fais chauffer l'huile dans un wok ou une grande poêle, saisis le bœuf 2 minutes à feu vif et réserve-le.",
      "Fais sauter les légumes 5 minutes avec le gingembre et l'ail.",
      "Remets le bœuf, ajoute les nouilles et la sauce soja, mélange 2 minutes et sers aussitôt."
    ],
    "parPortion": {
      "kcal": 470,
      "p": 38,
      "c": 48,
      "f": 14,
      "fibres": 6
    },
    "moment": "apres-entrainement",
    "adaptations": "Sèche : 200 g de nouilles pour 2 personnes. Prise de masse : 450 g de nouilles et une cuillère d'huile en plus.",
    "tags": [
      "rapide",
      "repas-d-effort"
    ]
  },
  {
    "id": "2026-10-05-shake-prise-banane-avoine-cacahuete",
    "semaine": "2026-10-05",
    "nom": "Shake de prise banane, avoine et cacahuète",
    "description": "Un shake dense à boire après la séance : lait, banane, avoine, beurre de cacahuète et cacao. Environ 700 kcal sans effort de mastication.",
    "categorie": "collation",
    "profils": [
      "prise",
      "ironman"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "lactose",
      "arachides"
    ],
    "portions": 1,
    "preparationMin": 5,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Lait demi-écrémé",
        "quantite": "400 ml"
      },
      {
        "nom": "Banane",
        "quantite": "120 g (1)"
      },
      {
        "nom": "Flocons d'avoine",
        "quantite": "60 g"
      },
      {
        "nom": "Beurre de cacahuète",
        "quantite": "30 g"
      },
      {
        "nom": "Cacao maigre en poudre",
        "quantite": "10 g"
      }
    ],
    "etapes": [
      "Mets tous les ingrédients dans un blender.",
      "Mixe 1 minute jusqu'à obtenir une texture lisse.",
      "Bois-le dans les 30 minutes qui suivent la séance."
    ],
    "parPortion": {
      "kcal": 707,
      "p": 32,
      "c": 84,
      "f": 27,
      "fibres": 13
    },
    "moment": "apres-entrainement",
    "adaptations": "Prise de masse difficile : ajoute 20 g de beurre de cacahuète. Version plus légère : lait écrémé et 40 g d'avoine.",
    "tags": [
      "rapide",
      "sans-cuisson",
      "prise-de-masse"
    ]
  },
  {
    "id": "2026-10-05-salade-quinoa-feta-concombre-pois-chiches",
    "semaine": "2026-10-05",
    "nom": "Salade de quinoa, feta, concombre et pois chiches",
    "description": "Une salade complète à la grecque, végétarienne et rassasiante, qui se prépare à l'avance pour le déjeuner du bureau.",
    "categorie": "dejeuner",
    "profils": [
      "maintien",
      "remise-en-forme"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "lactose"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Quinoa cuit",
        "quantite": "300 g"
      },
      {
        "nom": "Feta",
        "quantite": "80 g"
      },
      {
        "nom": "Concombre",
        "quantite": "200 g"
      },
      {
        "nom": "Tomates cerises",
        "quantite": "150 g"
      },
      {
        "nom": "Pois chiches cuits (conserve rincée)",
        "quantite": "160 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Citron, menthe, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Coupe le concombre, les tomates cerises et la feta en dés.",
      "Mélange le quinoa, les pois chiches et les légumes dans un saladier.",
      "Assaisonne avec l'huile, le citron, la menthe et le sel, puis ajoute la feta.",
      "Mets au frais 15 minutes avant de servir."
    ],
    "parPortion": {
      "kcal": 461,
      "p": 20,
      "c": 48,
      "f": 21,
      "fibres": 11
    },
    "moment": "quotidien",
    "adaptations": "Pour perdre du poids : 200 g de quinoa cuit pour 2 personnes. Pour plus d'énergie : 450 g de quinoa cuit.",
    "tags": [
      "meal-prep",
      "sans-cuisson",
      "economique"
    ]
  },
  {
    "id": "2026-10-05-pates-bolognaise-boeuf-allegee",
    "semaine": "2026-10-05",
    "nom": "Pâtes à la bolognaise allégée",
    "description": "Une bolognaise maison au bœuf 5 % et aux légumes, servie sur des pâtes : le plat d'énergie par excellence avant ou après une séance lourde.",
    "categorie": "diner",
    "profils": [
      "force",
      "prise"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "viande",
      "gluten",
      "lactose"
    ],
    "portions": 4,
    "preparationMin": 15,
    "cuissonMin": 30,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Pâtes cuites",
        "quantite": "800 g"
      },
      {
        "nom": "Bœuf haché 5 % de matière grasse",
        "quantite": "500 g"
      },
      {
        "nom": "Tomates concassées",
        "quantite": "600 g"
      },
      {
        "nom": "Carotte",
        "quantite": "150 g"
      },
      {
        "nom": "Oignon",
        "quantite": "150 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Emmental râpé",
        "quantite": "40 g"
      },
      {
        "nom": "Ail, basilic, origan, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais revenir l'oignon et la carotte râpée 5 minutes dans l'huile.",
      "Ajoute le bœuf haché et fais-le dorer 5 minutes en l'émiettant.",
      "Verse les tomates concassées, ajoute les herbes et laisse mijoter 20 minutes.",
      "Sers sur les pâtes chaudes avec l'emmental râpé."
    ],
    "parPortion": {
      "kcal": 596,
      "p": 43,
      "c": 70,
      "f": 16,
      "fibres": 8
    },
    "moment": "avant-entrainement",
    "adaptations": "Sèche : 150 g de pâtes cuites par portion. Prise de masse : 300 g de pâtes cuites par portion.",
    "tags": [
      "meal-prep",
      "familial",
      "economique"
    ]
  },
  {
    "id": "2026-10-05-tajine-poulet-pois-chiches-abricots-semoule",
    "semaine": "2026-10-05",
    "nom": "Tajine de poulet, pois chiches et abricots secs",
    "description": "Un plat mijoté sucré-salé du Maghreb : poulet tendre, pois chiches, carottes et abricots secs, avec de la semoule. Idéal en batch.",
    "categorie": "diner",
    "profils": [
      "marathon",
      "hyrox",
      "maintien"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "volaille",
      "gluten"
    ],
    "portions": 4,
    "preparationMin": 15,
    "cuissonMin": 40,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Cuisses de poulet désossées sans peau",
        "quantite": "600 g"
      },
      {
        "nom": "Pois chiches cuits (conserve rincée)",
        "quantite": "400 g"
      },
      {
        "nom": "Abricots secs",
        "quantite": "80 g"
      },
      {
        "nom": "Oignon",
        "quantite": "200 g"
      },
      {
        "nom": "Carotte",
        "quantite": "250 g"
      },
      {
        "nom": "Semoule cuite",
        "quantite": "600 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Cannelle, gingembre, cumin, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais dorer le poulet en morceaux 5 minutes dans l'huile, puis réserve-le.",
      "Fais revenir l'oignon et les carottes en rondelles 5 minutes avec les épices.",
      "Remets le poulet, ajoute les pois chiches, les abricots et un grand verre d'eau, puis laisse mijoter 30 minutes à couvert.",
      "Sers sur la semoule chaude."
    ],
    "parPortion": {
      "kcal": 600,
      "p": 44,
      "c": 70,
      "f": 16,
      "fibres": 13
    },
    "moment": "veille-de-course",
    "adaptations": "Veille de course : 200 g de semoule cuite par portion. Sèche : 100 g de semoule cuite par portion.",
    "tags": [
      "meal-prep",
      "familial",
      "repas-d-effort"
    ]
  },
  {
    "id": "2026-10-05-colin-ratatouille-riz-complet",
    "semaine": "2026-10-05",
    "nom": "Colin d'Alaska, ratatouille et riz complet",
    "description": "Un dîner léger et riche en fibres : poisson blanc maigre poêlé, ratatouille maison et riz complet. Parfait en phase de perte de poids.",
    "categorie": "diner",
    "profils": [
      "perte",
      "bodybuilding"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "poisson"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 30,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Filets de colin d'Alaska",
        "quantite": "300 g"
      },
      {
        "nom": "Courgette",
        "quantite": "250 g"
      },
      {
        "nom": "Aubergine",
        "quantite": "200 g"
      },
      {
        "nom": "Poivron rouge",
        "quantite": "150 g"
      },
      {
        "nom": "Tomates concassées",
        "quantite": "300 g"
      },
      {
        "nom": "Oignon",
        "quantite": "100 g"
      },
      {
        "nom": "Riz complet cuit",
        "quantite": "250 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Herbes de Provence, ail, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Coupe tous les légumes en dés et fais-les revenir 8 minutes dans la moitié de l'huile.",
      "Ajoute les tomates concassées et les herbes, puis laisse mijoter 20 minutes.",
      "Poêle le colin 3 minutes par face avec le reste d'huile, du sel et du poivre.",
      "Sers le poisson sur la ratatouille, avec le riz complet."
    ],
    "parPortion": {
      "kcal": 447,
      "p": 34,
      "c": 53,
      "f": 11,
      "fibres": 10
    },
    "moment": "quotidien",
    "adaptations": "Sèche : 150 g de riz complet cuit pour 2 personnes. Maintien : 350 g de riz complet cuit.",
    "tags": [
      "economique",
      "meal-prep"
    ]
  },
  {
    "id": "2026-10-05-bol-fromage-blanc-kiwi-pomme-noix",
    "semaine": "2026-10-05",
    "nom": "Bol de fromage blanc, kiwi, pomme et noix",
    "description": "Un dessert ou une collation protéinée de 5 minutes : fromage blanc 0 %, fruits frais, flocons d'avoine et noix.",
    "categorie": "dessert",
    "profils": [
      "perte",
      "bodybuilding",
      "maintien"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "lactose",
      "gluten",
      "fruits-a-coque"
    ],
    "portions": 1,
    "preparationMin": 5,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Fromage blanc 0 %",
        "quantite": "250 g"
      },
      {
        "nom": "Kiwi",
        "quantite": "100 g (1)"
      },
      {
        "nom": "Pomme",
        "quantite": "100 g (1/2)"
      },
      {
        "nom": "Flocons d'avoine",
        "quantite": "25 g"
      },
      {
        "nom": "Noix",
        "quantite": "10 g"
      },
      {
        "nom": "Cannelle",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Verse le fromage blanc dans un bol et saupoudre de cannelle.",
      "Coupe le kiwi et la pomme en dés et dispose-les par-dessus.",
      "Termine avec les flocons d'avoine et les noix concassées."
    ],
    "parPortion": {
      "kcal": 385,
      "p": 26,
      "c": 50,
      "f": 9,
      "fibres": 8
    },
    "moment": "quotidien",
    "adaptations": "Sèche : sans flocons d'avoine. Prise : double les flocons et ajoute 10 g de noix.",
    "tags": [
      "rapide",
      "sans-cuisson",
      "riche-en-proteines"
    ]
  },
  {
    "id": "2026-09-28-filet-mignon-porc-pommes-de-terre-haricots",
    "semaine": "2026-09-28",
    "nom": "Filet mignon de porc, pommes de terre et haricots verts",
    "description": "Un plat familial du dimanche, simple et protéiné : filet mignon à la moutarde, pommes de terre rôties au thym et haricots verts.",
    "categorie": "diner",
    "profils": [
      "maintien",
      "remise-en-forme",
      "prise"
    ],
    "regimes": [],
    "contient": [
      "porc"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 30,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Filet mignon de porc",
        "quantite": "400 g"
      },
      {
        "nom": "Pommes de terre",
        "quantite": "500 g"
      },
      {
        "nom": "Haricots verts (frais ou surgelés)",
        "quantite": "300 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 c. à soupe (15 g)"
      },
      {
        "nom": "Moutarde à l'ancienne",
        "quantite": "1 c. à soupe"
      },
      {
        "nom": "Ail",
        "quantite": "2 gousses"
      },
      {
        "nom": "Thym, sel, poivre",
        "quantite": "selon ton goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 200 °C. Coupe les pommes de terre en quartiers, mélange-les avec la moitié de l'huile, l'ail écrasé et le thym, puis enfourne 30 minutes.",
      "Badigeonne le filet mignon de moutarde et saisis-le 2 minutes sur chaque face dans une poêle avec le reste de l'huile.",
      "Pose-le sur les pommes de terre pour les 20 dernières minutes : il doit rester légèrement rosé à cœur.",
      "Pendant ce temps, cuis les haricots verts 8 minutes à l'eau bouillante salée. Tranche le filet et sers."
    ],
    "parPortion": {
      "kcal": 555,
      "p": 50,
      "c": 49,
      "f": 16,
      "fibres": 10
    },
    "moment": "quotidien",
    "adaptations": "Perte : 150 g de pommes de terre par personne et double portion de haricots verts. Prise : 350 g de pommes de terre par personne.",
    "tags": [
      "familial",
      "meal-prep"
    ]
  },
  {
    "id": "2026-09-28-omelette-jambon-champignons-pain-complet",
    "semaine": "2026-09-28",
    "nom": "Omelette jambon et champignons, pain complet",
    "description": "Un petit-déjeuner salé prêt en 10 minutes, avec 44 g de protéines pour tenir jusqu'au déjeuner.",
    "categorie": "petit-dejeuner",
    "profils": [
      "force",
      "bodybuilding",
      "maintien"
    ],
    "regimes": [],
    "contient": [
      "oeufs",
      "porc",
      "gluten"
    ],
    "portions": 1,
    "preparationMin": 5,
    "cuissonMin": 7,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Œufs",
        "quantite": "3"
      },
      {
        "nom": "Jambon blanc découenné",
        "quantite": "2 tranches (80 g)"
      },
      {
        "nom": "Champignons de Paris",
        "quantite": "100 g"
      },
      {
        "nom": "Pain complet",
        "quantite": "2 tranches (60 g)"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 c. à café (5 g)"
      },
      {
        "nom": "Sel, poivre, ciboulette",
        "quantite": "selon ton goût"
      }
    ],
    "etapes": [
      "Émince les champignons et fais-les revenir 4 minutes dans l'huile.",
      "Bats les œufs, ajoute le jambon coupé en lanières, verse sur les champignons et laisse prendre 3 minutes à feu moyen.",
      "Plie l'omelette et sers-la avec le pain complet grillé."
    ],
    "parPortion": {
      "kcal": 512,
      "p": 44,
      "c": 28,
      "f": 25,
      "fibres": 6
    },
    "moment": "quotidien",
    "adaptations": "Perte : 1 tranche de pain, 2 œufs entiers et 1 blanc. Prise : ajoute un fruit et un verre de lait.",
    "tags": [
      "rapide"
    ]
  },
  {
    "id": "2026-09-28-lentilles-vertes-saucisse-fumee-carottes",
    "semaine": "2026-09-28",
    "nom": "Lentilles vertes du Puy, saucisse fumée et carottes",
    "description": "Le classique auvergnat en version équilibrée : beaucoup de lentilles et de fibres, la saucisse pour le goût. Se réchauffe très bien.",
    "categorie": "dejeuner",
    "profils": [
      "maintien",
      "hyrox",
      "remise-en-forme"
    ],
    "regimes": [],
    "contient": [
      "porc"
    ],
    "portions": 4,
    "preparationMin": 10,
    "cuissonMin": 40,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Lentilles vertes du Puy (sèches)",
        "quantite": "300 g"
      },
      {
        "nom": "Saucisse fumée (type Morteau)",
        "quantite": "300 g"
      },
      {
        "nom": "Carottes",
        "quantite": "300 g"
      },
      {
        "nom": "Oignon",
        "quantite": "1"
      },
      {
        "nom": "Bouquet garni, sel, poivre",
        "quantite": "1"
      }
    ],
    "etapes": [
      "Rince les lentilles. Mets-les dans une grande casserole avec l'oignon émincé, les carottes en rondelles et le bouquet garni, et couvre de trois fois leur volume d'eau froide.",
      "Porte à frémissement, ajoute la saucisse piquée à la fourchette et laisse cuire 35 à 40 minutes à petit feu, sans saler.",
      "Sale en fin de cuisson, coupe la saucisse en rondelles et sers bien chaud."
    ],
    "parPortion": {
      "kcal": 534,
      "p": 31,
      "c": 44,
      "f": 22,
      "fibres": 15
    },
    "moment": "quotidien",
    "adaptations": "Perte : 50 g de saucisse par personne et une salade verte en entrée. Prise : ajoute 100 g de pain complet.",
    "tags": [
      "familial",
      "economique",
      "meal-prep"
    ]
  },
  {
    "id": "2026-09-28-curry-pois-chiches-epinards-coco",
    "semaine": "2026-09-28",
    "nom": "Curry de pois chiches, épinards et coco",
    "description": "Un curry végétal onctueux, riche en fibres et en protéines végétales, prêt en 25 minutes avec des produits de placard.",
    "categorie": "dejeuner",
    "profils": ["perte", "remise-en-forme"],
    "regimes": ["vegan", "vegetarien", "sans-porc"],
    "contient": [],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 15,
    "difficulte": "facile",
    "ingredients": [
      { "nom": "Pois chiches cuits (conserve rincée)", "quantite": "480 g" },
      { "nom": "Tomates concassées", "quantite": "400 g" },
      { "nom": "Épinards frais", "quantite": "200 g" },
      { "nom": "Oignon", "quantite": "1 (100 g)" },
      { "nom": "Lait de coco (conserve)", "quantite": "100 g" },
      { "nom": "Riz basmati cuit", "quantite": "160 g" },
      { "nom": "Ail, curry, curcuma, sel", "quantite": "selon goût" }
    ],
    "etapes": [
      "Fais revenir l'oignon émincé et l'ail 3 minutes avec les épices et un filet d'eau.",
      "Ajoute les tomates concassées et les pois chiches, laisse mijoter 10 minutes.",
      "Incorpore le lait de coco et les épinards, remue 2 minutes jusqu'à ce qu'ils tombent.",
      "Sers avec le riz basmati chaud."
    ],
    "parPortion": { "kcal": 578, "p": 28, "c": 76, "f": 18, "fibres": 21 },
    "moment": "quotidien",
    "adaptations": "Perte de poids : 100 g de riz cuit par portion. Remise en forme : garde la quantité indiquée et ajoute un fruit en dessert.",
    "tags": ["economique", "meal-prep", "familial"]
  },
  {
    "id": "2026-09-28-cabillaud-papillote-courgettes-boulgour",
    "semaine": "2026-09-28",
    "nom": "Cabillaud en papillote, courgettes et boulgour",
    "description": "Un dîner léger et rassasiant : poisson maigre, légumes fondants et boulgour riche en fibres. Cuisson au four, vaisselle minimale.",
    "categorie": "diner",
    "profils": ["perte", "maintien"],
    "regimes": ["sans-porc"],
    "contient": ["poisson", "gluten"],
    "portions": 1,
    "preparationMin": 10,
    "cuissonMin": 15,
    "difficulte": "facile",
    "ingredients": [
      { "nom": "Filet de cabillaud", "quantite": "180 g" },
      { "nom": "Courgette", "quantite": "1 moyenne (200 g)" },
      { "nom": "Tomates cerises", "quantite": "100 g" },
      { "nom": "Boulgour cuit", "quantite": "150 g" },
      { "nom": "Huile d'olive", "quantite": "1 cuillère à café bombée" },
      { "nom": "Citron", "quantite": "1/2" },
      { "nom": "Aneth, sel, poivre", "quantite": "selon goût" }
    ],
    "etapes": [
      "Préchauffe le four à 200 °C. Coupe la courgette en rondelles et les tomates cerises en deux.",
      "Dépose légumes et cabillaud sur une feuille de papier cuisson, arrose d'huile et de citron, assaisonne puis ferme la papillote.",
      "Enfourne 15 minutes.",
      "Sers avec le boulgour cuit."
    ],
    "parPortion": { "kcal": 398, "p": 40, "c": 37, "f": 10, "fibres": 10 },
    "moment": "quotidien",
    "adaptations": "Sèche : 100 g de boulgour cuit. Prise de masse : 250 g de boulgour cuit et une cuillère d'huile en plus.",
    "tags": ["rapide", "sans-friture"]
  },
  {
    "id": "2026-09-28-burrito-boeuf-haricots-rouges",
    "semaine": "2026-09-28",
    "nom": "Burritos de bœuf, haricots rouges et riz",
    "description": "Des wraps généreux, calorie-denses et faciles à emporter : bœuf haché, haricots, riz et poivron. Idéal pour la prise de masse.",
    "categorie": "dejeuner",
    "profils": ["prise", "bodybuilding"],
    "regimes": ["sans-porc"],
    "contient": ["gluten", "viande"],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 15,
    "difficulte": "facile",
    "ingredients": [
      { "nom": "Bœuf haché 5 % de matière grasse", "quantite": "300 g" },
      { "nom": "Tortillas de blé", "quantite": "3 grandes (120 g)" },
      { "nom": "Haricots rouges cuits (conserve rincée)", "quantite": "200 g" },
      { "nom": "Riz blanc cuit", "quantite": "250 g" },
      { "nom": "Poivron rouge", "quantite": "1 (150 g)" },
      { "nom": "Oignon", "quantite": "1 (80 g)" },
      { "nom": "Huile d'olive", "quantite": "1 cuillère à soupe" },
      { "nom": "Paprika, cumin, sel", "quantite": "selon goût" }
    ],
    "etapes": [
      "Fais revenir l'oignon et le poivron en lamelles 4 minutes dans l'huile.",
      "Ajoute le bœuf haché et les épices, cuis 6 minutes en émiettant.",
      "Incorpore les haricots rouges et réchauffe 2 minutes.",
      "Garnis les tortillas de riz et de la préparation, roule-les serrées."
    ],
    "parPortion": { "kcal": 702, "p": 49, "c": 86, "f": 18, "fibres": 11 },
    "moment": "apres-entrainement",
    "adaptations": "Sèche : 1 tortilla et 150 g de riz par portion. Prise de masse : ajoute 100 g de riz par portion et une cuillère d'huile.",
    "tags": ["meal-prep", "repas-d-effort"]
  },
  {
    "id": "2026-09-28-bol-tempeh-quinoa-patate-douce",
    "semaine": "2026-09-28",
    "nom": "Bol de tempeh, quinoa et patate douce rôtie",
    "description": "Un bol vegan dense en protéines et en énergie, parfait après une séance de force. Tempeh grillé, patate douce rôtie, quinoa.",
    "categorie": "diner",
    "profils": ["force", "bodybuilding"],
    "regimes": ["vegan", "vegetarien", "sans-porc"],
    "contient": ["gluten", "soja"],
    "portions": 1,
    "preparationMin": 10,
    "cuissonMin": 25,
    "difficulte": "moyenne",
    "ingredients": [
      { "nom": "Tempeh", "quantite": "150 g" },
      { "nom": "Quinoa cuit", "quantite": "200 g" },
      { "nom": "Patate douce", "quantite": "250 g" },
      { "nom": "Brocoli", "quantite": "150 g" },
      { "nom": "Huile d'olive", "quantite": "1 cuillère à soupe" },
      { "nom": "Sauce soja", "quantite": "1 cuillère à soupe" },
      { "nom": "Paprika, ail en poudre", "quantite": "selon goût" }
    ],
    "etapes": [
      "Coupe la patate douce en dés et enfourne-la 25 minutes à 200 °C avec la moitié de l'huile et du paprika.",
      "Fais cuire le brocoli 5 minutes à la vapeur.",
      "Coupe le tempeh en tranches et fais-le dorer 4 minutes par face avec le reste d'huile, puis arrose de sauce soja.",
      "Dresse le quinoa, la patate douce, le brocoli et le tempeh dans un bol."
    ],
    "parPortion": { "kcal": 895, "p": 47, "c": 107, "f": 31, "fibres": 25 },
    "moment": "apres-entrainement",
    "adaptations": "Sèche : 150 g de quinoa cuit et 150 g de patate douce. Prise de masse : 300 g de quinoa cuit.",
    "tags": ["repas-d-effort", "vegetal"]
  },
  {
    "id": "2026-09-28-escalope-dinde-quinoa-haricots-verts",
    "semaine": "2026-09-28",
    "nom": "Escalope de dinde, quinoa et haricots verts",
    "description": "Un repas de musculation sobre et précis : protéines maigres, glucides complexes et légumes. Facile à peser et à multiplier.",
    "categorie": "dejeuner",
    "profils": ["bodybuilding", "perte"],
    "regimes": ["sans-porc"],
    "contient": ["volaille"],
    "portions": 1,
    "preparationMin": 5,
    "cuissonMin": 12,
    "difficulte": "facile",
    "ingredients": [
      { "nom": "Escalope de dinde", "quantite": "200 g" },
      { "nom": "Quinoa cuit", "quantite": "200 g" },
      { "nom": "Haricots verts", "quantite": "200 g" },
      { "nom": "Huile d'olive", "quantite": "1 cuillère à café bombée" },
      { "nom": "Citron", "quantite": "1/2" },
      { "nom": "Thym, sel, poivre", "quantite": "selon goût" }
    ],
    "etapes": [
      "Aplatis l'escalope, assaisonne-la de thym, sel et poivre.",
      "Cuis les haricots verts 8 minutes à l'eau bouillante salée, égoutte-les.",
      "Fais dorer l'escalope 5 à 6 minutes dans l'huile, en la retournant à mi-cuisson.",
      "Sers avec le quinoa et un jus de citron."
    ],
    "parPortion": { "kcal": 551, "p": 57, "c": 47, "f": 15, "fibres": 12 },
    "moment": "quotidien",
    "adaptations": "Sèche : 120 g de quinoa cuit. Prise : 300 g de quinoa cuit et 15 g d'huile.",
    "tags": ["meal-prep", "rapide"]
  },
  {
    "id": "2026-09-28-pates-completes-thon-tomates-olives",
    "semaine": "2026-09-28",
    "nom": "Pâtes complètes au thon, tomates et olives",
    "description": "Un plat d'avant-effort simple : glucides complexes, thon pour les protéines et tomates. Se prépare en 15 minutes.",
    "categorie": "dejeuner",
    "profils": ["hyrox", "marathon"],
    "regimes": ["sans-porc"],
    "contient": ["gluten", "poisson"],
    "portions": 1,
    "preparationMin": 5,
    "cuissonMin": 12,
    "difficulte": "facile",
    "ingredients": [
      { "nom": "Pâtes complètes cuites", "quantite": "300 g" },
      { "nom": "Thon au naturel (boîte égouttée)", "quantite": "110 g" },
      { "nom": "Tomates concassées", "quantite": "200 g" },
      { "nom": "Olives noires dénoyautées", "quantite": "25 g" },
      { "nom": "Huile d'olive", "quantite": "1 cuillère à café bombée" },
      { "nom": "Ail, basilic, sel", "quantite": "selon goût" }
    ],
    "etapes": [
      "Fais cuire les pâtes selon le paquet puis égoutte-les.",
      "Réchauffe les tomates concassées avec l'ail et l'huile 5 minutes.",
      "Ajoute le thon émietté et les olives, mélange avec les pâtes et sers avec du basilic."
    ],
    "parPortion": { "kcal": 670, "p": 46, "c": 81, "f": 18, "fibres": 15 },
    "moment": "veille-de-course",
    "adaptations": "Veille de sortie longue : 400 g de pâtes cuites. Sèche : 200 g de pâtes cuites.",
    "tags": ["rapide", "economique", "repas-d-effort"]
  },
  {
    "id": "2026-09-28-pancakes-avoine-banane-vegan",
    "semaine": "2026-09-28",
    "nom": "Pancakes vegan d'avoine et banane",
    "description": "Des pancakes moelleux sans œuf ni lait de vache, riches en glucides : le petit-déjeuner idéal avant une longue sortie.",
    "categorie": "petit-dejeuner",
    "profils": ["marathon", "ironman"],
    "regimes": ["vegan", "vegetarien", "sans-porc"],
    "contient": ["gluten"],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 10,
    "difficulte": "facile",
    "ingredients": [
      { "nom": "Flocons d'avoine", "quantite": "100 g" },
      { "nom": "Bananes mûres", "quantite": "2 (240 g)" },
      { "nom": "Lait d'avoine", "quantite": "200 ml" },
      { "nom": "Farine de blé complète", "quantite": "50 g" },
      { "nom": "Huile de colza", "quantite": "1 cuillère à café" },
      { "nom": "Fruits rouges", "quantite": "120 g" },
      { "nom": "Levure chimique, cannelle", "quantite": "1 cuillère à café" }
    ],
    "etapes": [
      "Écrase les bananes, ajoute le lait d'avoine, les flocons, la farine, la levure et la cannelle, puis mélange en pâte épaisse.",
      "Laisse reposer 5 minutes.",
      "Fais cuire des petits pancakes 2 à 3 minutes par face dans une poêle antiadhésive huilée.",
      "Sers avec les fruits rouges."
    ],
    "parPortion": { "kcal": 453, "p": 11, "c": 82, "f": 9, "fibres": 12 },
    "moment": "veille-de-course",
    "adaptations": "Jour de course : ajoute 1 cuillère à soupe de sirop d'érable. Version légère : 70 g de flocons par portion.",
    "tags": ["repas-d-effort", "petit-budget"]
  },
  {
    "id": "2026-09-28-parmentier-patate-douce-saumon",
    "semaine": "2026-09-28",
    "nom": "Parmentier de patate douce au saumon",
    "description": "Un plat de récupération en batch : saumon, épinards et purée de patate douce et pomme de terre. Se garde 3 jours au frais.",
    "categorie": "diner",
    "profils": ["ironman", "remise-en-forme"],
    "regimes": ["sans-porc"],
    "contient": ["poisson"],
    "portions": 4,
    "preparationMin": 20,
    "cuissonMin": 35,
    "difficulte": "moyenne",
    "ingredients": [
      { "nom": "Pavés de saumon", "quantite": "500 g" },
      { "nom": "Patate douce", "quantite": "500 g" },
      { "nom": "Pommes de terre", "quantite": "500 g" },
      { "nom": "Épinards frais", "quantite": "300 g" },
      { "nom": "Poireaux", "quantite": "2 moyens (200 g)" },
      { "nom": "Huile d'olive", "quantite": "2 cuillères à soupe" },
      { "nom": "Muscade, sel, poivre", "quantite": "selon goût" }
    ],
    "etapes": [
      "Épluche et fais cuire la patate douce et les pommes de terre 20 minutes à l'eau, écrase-les avec la moitié de l'huile, du sel et de la muscade.",
      "Fais revenir les poireaux émincés et les épinards 5 minutes, puis ajoute le saumon coupé en dés et cuis encore 3 minutes.",
      "Dans un plat, étale le saumon aux légumes puis recouvre de purée.",
      "Enfourne 15 minutes à 200 °C."
    ],
    "parPortion": { "kcal": 526, "p": 32, "c": 50, "f": 22, "fibres": 9 },
    "moment": "recuperation",
    "adaptations": "Veille de longue sortie : double la portion de purée. Remise en forme : sers-le avec une grosse salade verte.",
    "tags": ["meal-prep", "familial"]
  },
  {
    "id": "2026-09-28-shakshuka-oeufs-pois-chiches",
    "semaine": "2026-09-28",
    "nom": "Shakshuka aux œufs et pois chiches",
    "description": "Des œufs pochés dans une sauce tomate épicée avec des pois chiches : complet, économique et plein de goût.",
    "categorie": "diner",
    "profils": ["maintien", "remise-en-forme"],
    "regimes": ["vegetarien", "sans-porc"],
    "contient": ["oeufs"],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 20,
    "difficulte": "facile",
    "ingredients": [
      { "nom": "Œufs", "quantite": "4 (240 g)" },
      { "nom": "Tomates concassées", "quantite": "500 g" },
      { "nom": "Pois chiches cuits (conserve rincée)", "quantite": "240 g" },
      { "nom": "Poivron rouge", "quantite": "1 (150 g)" },
      { "nom": "Oignon", "quantite": "1 (100 g)" },
      { "nom": "Huile d'olive", "quantite": "1 cuillère à soupe" },
      { "nom": "Paprika, cumin, sel", "quantite": "selon goût" }
    ],
    "etapes": [
      "Fais revenir l'oignon et le poivron émincés dans l'huile 5 minutes avec les épices.",
      "Ajoute les tomates et les pois chiches, laisse mijoter 10 minutes.",
      "Creuse 4 puits dans la sauce, casse un œuf dans chacun, couvre et cuis 5 minutes.",
      "Sers directement dans la poêle."
    ],
    "parPortion": { "kcal": 445, "p": 28, "c": 36, "f": 21, "fibres": 13 },
    "moment": "quotidien",
    "adaptations": "Plus léger : 3 œufs pour 2 personnes. Plus copieux : ajoute 100 g de pain complet par portion.",
    "tags": ["economique", "familial", "rapide"]
  },
  {
    "id": "2026-09-28-poelee-crevettes-courgettes-riz",
    "semaine": "2026-09-28",
    "nom": "Poêlée de crevettes, courgettes et riz",
    "description": "Un repas express du soir : crevettes cuites, courgettes tendres, riz et un trait de citron. Prêt en 12 minutes.",
    "categorie": "diner",
    "profils": ["remise-en-forme", "perte"],
    "regimes": ["sans-porc"],
    "contient": ["crustaces"],
    "portions": 1,
    "preparationMin": 5,
    "cuissonMin": 8,
    "difficulte": "facile",
    "ingredients": [
      { "nom": "Crevettes cuites décortiquées", "quantite": "150 g" },
      { "nom": "Courgette", "quantite": "1 grosse (250 g)" },
      { "nom": "Riz basmati cuit", "quantite": "150 g" },
      { "nom": "Huile d'olive", "quantite": "1 cuillère à café bombée" },
      { "nom": "Citron", "quantite": "1/2" },
      { "nom": "Ail, persil, sel", "quantite": "selon goût" }
    ],
    "etapes": [
      "Coupe la courgette en demi-rondelles et fais-la dorer 5 minutes dans l'huile avec l'ail.",
      "Ajoute les crevettes et réchauffe 2 minutes.",
      "Sers sur le riz avec le jus de citron et le persil."
    ],
    "parPortion": { "kcal": 447, "p": 38, "c": 49, "f": 11, "fibres": 4 },
    "moment": "quotidien",
    "adaptations": "Perte : 100 g de riz cuit. Remise en forme : garde 150 g de riz.",
    "tags": ["rapide", "economique"]
  },
  {
    "id": "2026-09-28-energy-balls-dattes-cacao-amande",
    "semaine": "2026-09-28",
    "nom": "Energy balls dattes, cacao et amande",
    "description": "Des boules d'énergie sans cuisson, faciles à glisser dans la poche pendant l'effort. Sucres rapides et un peu de gras.",
    "categorie": "collation",
    "profils": ["hyrox", "marathon", "ironman"],
    "regimes": ["vegan", "vegetarien", "sans-porc"],
    "contient": ["fruits-a-coque", "gluten"],
    "portions": 4,
    "preparationMin": 15,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      { "nom": "Dattes dénoyautées", "quantite": "200 g" },
      { "nom": "Flocons d'avoine", "quantite": "60 g" },
      { "nom": "Purée d'amande", "quantite": "40 g" },
      { "nom": "Cacao maigre en poudre", "quantite": "15 g" },
      { "nom": "Une pincée de sel, eau", "quantite": "1 à 2 cuillères à soupe" }
    ],
    "etapes": [
      "Mixe les dattes avec la purée d'amande, le cacao, le sel et un peu d'eau jusqu'à obtenir une pâte collante.",
      "Ajoute les flocons d'avoine et mélange.",
      "Forme 8 boules, garde-les au réfrigérateur jusqu'à 5 jours."
    ],
    "parPortion": { "kcal": 259, "p": 6, "c": 43, "f": 7, "fibres": 7 },
    "moment": "pendant-effort",
    "adaptations": "Sortie longue : 2 boules par heure d'effort. Version plus riche en protéines : ajoute 15 g de protéine de pois.",
    "tags": ["sans-cuisson", "repas-d-effort", "meal-prep"]
  },
  {
    "id": "2026-09-28-mousse-skyr-cacao-fruits-rouges",
    "semaine": "2026-09-28",
    "nom": "Mousse de skyr cacao et fruits rouges",
    "description": "Un dessert protéiné de 5 minutes, gourmand et léger : skyr, cacao et fruits rouges. Sans cuisson ni sucre ajouté.",
    "categorie": "dessert",
    "profils": ["perte", "maintien"],
    "regimes": ["vegetarien", "sans-porc"],
    "contient": ["gluten", "lactose"],
    "portions": 1,
    "preparationMin": 5,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      { "nom": "Skyr nature", "quantite": "250 g" },
      { "nom": "Cacao maigre en poudre", "quantite": "10 g" },
      { "nom": "Fruits rouges", "quantite": "120 g" },
      { "nom": "Flocons d'avoine", "quantite": "15 g" },
      { "nom": "Édulcorant ou une cuillère de sirop d'agave", "quantite": "à la demande" }
    ],
    "etapes": [
      "Fouette le skyr avec le cacao jusqu'à obtenir une crème lisse.",
      "Dispose dans un verre avec les fruits rouges et les flocons d'avoine."
    ],
    "parPortion": { "kcal": 271, "p": 32, "c": 29, "f": 3, "fibres": 6 },
    "moment": "quotidien",
    "adaptations": "Sèche : sans flocons d'avoine. Prise : double la portion et ajoute 15 g de purée d'amande.",
    "tags": ["rapide", "sans-cuisson", "riche-en-proteines"]
  },
  {
    "id": "2026-10-01-dahl-lentilles-corail-epinards",
    "semaine": "2026-10-01",
    "nom": "Dahl de lentilles corail aux épinards",
    "description": "Un plat complet et végétal, prêt en 30 minutes, qui se réchauffe très bien.",
    "categorie": "dejeuner",
    "profils": ["remise-en-forme", "maintien"],
    "regimes": ["vegan", "vegetarien", "sans-porc"],
    "contient": [],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 20,
    "difficulte": "facile",
    "ingredients": [
      { "nom": "Lentilles corail sèches", "quantite": "140 g" },
      { "nom": "Lait de coco (conserve)", "quantite": "100 g" },
      { "nom": "Tomates", "quantite": "250 g" },
      { "nom": "Épinards frais", "quantite": "150 g" },
      { "nom": "Oignon", "quantite": "1 (100 g)" },
      { "nom": "Ail", "quantite": "2 gousses" },
      { "nom": "Curry en poudre, cumin, sel", "quantite": "selon goût" },
      { "nom": "Riz basmati cuit", "quantite": "200 g" }
    ],
    "etapes": [
      "Émince l'oignon et l'ail, fais-les revenir 3 minutes à feu moyen avec 2 cuillères d'eau et les épices.",
      "Ajoute les lentilles rincées, les tomates coupées en dés et 400 ml d'eau. Laisse cuire 15 minutes en remuant.",
      "Ajoute le lait de coco et les épinards, mélange 2 minutes jusqu'à ce qu'ils tombent.",
      "Sers sur le riz basmati."
    ],
    "parPortion": { "kcal": 527, "p": 25, "c": 78, "f": 11, "fibres": 13 },
    "moment": "quotidien",
    "adaptations": "Perte de poids : 50 g de riz cuit par portion au lieu de 100 g. Prise de masse : 200 g de riz cuit par portion.",
    "tags": ["batch-cooking", "economique", "familial"]
  },
  {
    "id": "2026-10-01-bowl-poulet-haricots-rouges",
    "semaine": "2026-10-01",
    "nom": "Bowl poulet, riz et haricots rouges",
    "description": "Le repas d'après-séance : beaucoup de protéines et de glucides, à préparer à l'avance.",
    "categorie": "dejeuner",
    "profils": ["prise", "force", "bodybuilding", "hyrox"],
    "regimes": ["sans-porc"],
    "contient": ["volaille"],
    "portions": 1,
    "preparationMin": 10,
    "cuissonMin": 15,
    "difficulte": "facile",
    "ingredients": [
      { "nom": "Blanc de poulet", "quantite": "150 g" },
      { "nom": "Riz blanc cuit", "quantite": "200 g" },
      { "nom": "Haricots rouges cuits (conserve rincée)", "quantite": "120 g" },
      { "nom": "Maïs doux", "quantite": "60 g" },
      { "nom": "Poivron rouge", "quantite": "100 g" },
      { "nom": "Huile d'olive", "quantite": "8 g (1 cuillère à café bombée)" },
      { "nom": "Paprika, cumin, citron vert, sel", "quantite": "selon goût" }
    ],
    "etapes": [
      "Coupe le poulet en lanières, assaisonne-le de paprika et de cumin.",
      "Fais-le dorer 6 à 8 minutes dans l'huile d'olive, avec le poivron en lamelles.",
      "Réchauffe les haricots rouges et le maïs 2 minutes dans la même poêle.",
      "Dresse le riz, le poulet et les légumes dans un bol, arrose de citron vert."
    ],
    "parPortion": { "kcal": 747, "p": 53, "c": 101, "f": 14, "fibres": 12 },
    "moment": "apres-entrainement",
    "adaptations": "Sèche : 120 g de riz cuit, poivron doublé. Prise de masse : 300 g de riz cuit et 1 cuillère d'huile en plus.",
    "tags": ["meal-prep", "rapide"]
  },
  {
    "id": "2026-10-01-overnight-oats-banane-cacahuete",
    "semaine": "2026-10-01",
    "nom": "Porridge de nuit banane et beurre de cacahuète",
    "description": "Préparé la veille au soir, prêt au réveil : l'énergie d'une sortie longue sans rien cuisiner.",
    "categorie": "petit-dejeuner",
    "profils": ["marathon", "ironman", "hyrox", "prise"],
    "regimes": ["vegetarien", "sans-porc"],
    "contient": ["gluten", "lactose", "arachides"],
    "portions": 1,
    "preparationMin": 5,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      { "nom": "Flocons d'avoine", "quantite": "80 g" },
      { "nom": "Lait demi-écrémé", "quantite": "200 ml" },
      { "nom": "Banane", "quantite": "1 (120 g)" },
      { "nom": "Beurre de cacahuète", "quantite": "15 g" },
      { "nom": "Miel", "quantite": "10 g" }
    ],
    "etapes": [
      "La veille, mélange les flocons d'avoine et le lait dans un bocal, ferme et mets au réfrigérateur.",
      "Le matin, ajoute la banane en rondelles, le beurre de cacahuète et le miel."
    ],
    "parPortion": { "kcal": 629, "p": 23, "c": 95, "f": 16, "fibres": 12 },
    "moment": "avant-entrainement",
    "adaptations": "Veille de course : mange-le 2 à 3 heures avant le départ. Version légère : 50 g d'avoine et sans miel.",
    "tags": ["rapide", "sans-cuisson", "repas-d-effort"]
  }
];
