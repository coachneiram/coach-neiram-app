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
    "id": "2026-11-16-tartines-avocat-oeuf-mollet-graines",
    "semaine": "2026-11-16",
    "nom": "Tartines avocat, œuf mollet et graines de courge",
    "description": "Du pain complet, de l'avocat écrasé au citron, un œuf mollet et des graines de courge. Un petit-déjeuner salé, rassasiant, prêt en 12 minutes.",
    "categorie": "petit-dejeuner",
    "profils": [
      "maintien",
      "remise-en-forme"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "oeufs"
    ],
    "portions": 2,
    "preparationMin": 7,
    "cuissonMin": 6,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Pain complet",
        "quantite": "120 g (4 tranches)"
      },
      {
        "nom": "Avocat mûr",
        "quantite": "150 g (1 gros)"
      },
      {
        "nom": "Œufs",
        "quantite": "4 (environ 200 g)"
      },
      {
        "nom": "Tomates cerises",
        "quantite": "100 g"
      },
      {
        "nom": "Graines de courge",
        "quantite": "20 g"
      },
      {
        "nom": "Citron, sel, piment d'Espelette",
        "quantite": "1/2 citron et 1 pincée"
      }
    ],
    "etapes": [
      "Plonge les œufs 6 minutes dans l'eau bouillante, puis passe-les sous l'eau froide et écale-les.",
      "Écrase l'avocat à la fourchette avec le jus de citron et une pincée de sel, puis tartine-le sur le pain grillé.",
      "Coupe les tomates cerises en deux, répartis-les sur les tartines avec les œufs coupés en deux et les graines de courge, puis saupoudre de piment."
    ],
    "moment": "quotidien",
    "adaptations": "Remise en forme : garde les quantités indiquées. Maintien : ajoute une tranche de pain complet par portion ou un fruit à côté.",
    "tags": [
      "rapide",
      "economique"
    ],
    "parPortion": {
      "kcal": 488,
      "p": 22,
      "c": 28,
      "f": 32,
      "fibres": 9
    }
  },
  {
    "id": "2026-11-16-minestrone-haricots-blancs-petites-pates",
    "semaine": "2026-11-16",
    "nom": "Minestrone aux haricots blancs et petites pâtes",
    "description": "Une soupe-repas de légumes, de haricots blancs et de petites pâtes, mijotée 25 minutes. Beaucoup de volume et de fibres pour peu de calories.",
    "categorie": "diner",
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
      "gluten"
    ],
    "portions": 4,
    "preparationMin": 15,
    "cuissonMin": 25,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Oignon",
        "quantite": "100 g"
      },
      {
        "nom": "Carottes",
        "quantite": "200 g"
      },
      {
        "nom": "Courgettes",
        "quantite": "250 g"
      },
      {
        "nom": "Haricots blancs (conserve égouttée et rincée)",
        "quantite": "400 g"
      },
      {
        "nom": "Tomates concassées",
        "quantite": "400 g"
      },
      {
        "nom": "Petites pâtes (coquillettes ou macaronis, crues)",
        "quantite": "120 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "20 g (2 cuillères à soupe)"
      },
      {
        "nom": "Bouillon de légumes chaud",
        "quantite": "1 litre"
      },
      {
        "nom": "Basilic, ail, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Coupe l'oignon, les carottes et les courgettes en petits dés et fais-les revenir 5 minutes dans l'huile d'olive.",
      "Ajoute les tomates concassées, les haricots blancs et le bouillon chaud, puis laisse mijoter 15 minutes à feu moyen.",
      "Verse les petites pâtes et poursuis 8 à 10 minutes, jusqu'à ce qu'elles soient tendres.",
      "Termine avec le basilic ciselé, du poivre et rectifie le sel."
    ],
    "moment": "quotidien",
    "adaptations": "Perte : garde les quantités et ajoute des légumes à volonté. Remise en forme : ajoute une tranche de pain complet à côté si tu as faim.",
    "tags": [
      "meal-prep",
      "economique",
      "familial"
    ],
    "parPortion": {
      "kcal": 295,
      "p": 13,
      "c": 45,
      "f": 7,
      "fibres": 11
    }
  },
  {
    "id": "2026-11-16-pates-completes-pesto-cajou-petits-pois",
    "semaine": "2026-11-16",
    "nom": "Pâtes complètes, pesto de basilic-cajou et petits pois",
    "description": "Des pâtes complètes, un pesto maison basilic-cajou, des petits pois et de l'edamame. Un plat 100 % végétal, dense en énergie et en protéines.",
    "categorie": "dejeuner",
    "profils": [
      "force",
      "prise"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "fruits-a-coque",
      "soja"
    ],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 12,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Pâtes complètes (crues)",
        "quantite": "160 g"
      },
      {
        "nom": "Basilic frais",
        "quantite": "30 g (1 gros bouquet)"
      },
      {
        "nom": "Noix de cajou",
        "quantite": "40 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "30 g (3 cuillères à soupe)"
      },
      {
        "nom": "Petits pois surgelés",
        "quantite": "200 g"
      },
      {
        "nom": "Edamame décortiqués (surgelés)",
        "quantite": "160 g"
      },
      {
        "nom": "Ail, citron, sel, poivre",
        "quantite": "1 gousse et 1/2 citron"
      }
    ],
    "etapes": [
      "Fais cuire les pâtes selon le paquet et ajoute les petits pois et l'edamame dans l'eau pour les 3 dernières minutes.",
      "Mixe le basilic avec les noix de cajou, l'huile, l'ail, le jus de citron, le sel, le poivre et 3 cuillères à soupe d'eau de cuisson.",
      "Égoutte les pâtes et les légumes, mélange-les au pesto et sers aussitôt."
    ],
    "moment": "apres-entrainement",
    "adaptations": "Prise de masse : ajoute 40 g de pâtes crues par portion et un filet d'huile d'olive. Force : garde les quantités, c'est un bon repas après la séance.",
    "tags": [
      "rapide",
      "repas-d-effort"
    ],
    "parPortion": {
      "kcal": 675,
      "p": 29,
      "c": 70,
      "f": 31,
      "fibres": 17
    }
  },
  {
    "id": "2026-11-16-curry-poulet-coco-riz-basmati",
    "semaine": "2026-11-16",
    "nom": "Curry de poulet au lait de coco et riz basmati",
    "description": "Du poulet mijoté avec poivrons, tomates et lait de coco, relevé au curry, servi sur du riz basmati. Un plat d'énergie pour les grosses semaines d'entraînement.",
    "categorie": "diner",
    "profils": [
      "ironman",
      "prise"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "volaille"
    ],
    "portions": 4,
    "preparationMin": 15,
    "cuissonMin": 25,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Blanc de poulet",
        "quantite": "560 g"
      },
      {
        "nom": "Lait de coco",
        "quantite": "300 ml"
      },
      {
        "nom": "Oignons",
        "quantite": "150 g"
      },
      {
        "nom": "Poivrons rouges",
        "quantite": "250 g"
      },
      {
        "nom": "Tomates concassées",
        "quantite": "200 g"
      },
      {
        "nom": "Riz basmati (cru)",
        "quantite": "280 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "15 g (1 cuillère à soupe)"
      },
      {
        "nom": "Curry en poudre, gingembre, ail, sel",
        "quantite": "2 cuillères à café de curry"
      }
    ],
    "etapes": [
      "Coupe le poulet en dés et fais-le dorer 5 minutes dans l'huile avec les oignons émincés, puis réserve-le.",
      "Ajoute les poivrons en lanières, le curry, le gingembre et l'ail, et laisse revenir 3 minutes.",
      "Verse les tomates et le lait de coco, remets le poulet et laisse mijoter 15 minutes à feu doux.",
      "Pendant ce temps, fais cuire le riz basmati selon le paquet et sers-le avec le curry."
    ],
    "moment": "apres-entrainement",
    "adaptations": "Ironman : ajoute 30 g de riz cru par portion les jours de longue sortie. Prise de masse : ajoute un filet d'huile d'olive et 50 g de riz cru par portion.",
    "tags": [
      "meal-prep",
      "familial",
      "repas-d-effort"
    ],
    "parPortion": {
      "kcal": 600,
      "p": 40,
      "c": 65,
      "f": 20,
      "fibres": 3
    }
  },
  {
    "id": "2026-11-16-brandade-lieu-noir-pommes-de-terre",
    "semaine": "2026-11-16",
    "nom": "Brandade de lieu noir et pommes de terre",
    "description": "Un gratin de lieu noir effeuillé, de purée de pommes de terre à l'huile d'olive et d'emmental. Doux, économique, riche en protéines maigres.",
    "categorie": "diner",
    "profils": [
      "maintien",
      "remise-en-forme"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "poisson",
      "lactose"
    ],
    "portions": 4,
    "preparationMin": 20,
    "cuissonMin": 35,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Filets de lieu noir",
        "quantite": "500 g"
      },
      {
        "nom": "Pommes de terre",
        "quantite": "700 g"
      },
      {
        "nom": "Lait demi-écrémé",
        "quantite": "200 ml"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "30 g (3 cuillères à soupe)"
      },
      {
        "nom": "Emmental râpé",
        "quantite": "40 g"
      },
      {
        "nom": "Ail, persil, poivre, muscade",
        "quantite": "1 gousse et 1 petit bouquet"
      }
    ],
    "etapes": [
      "Épluche les pommes de terre, coupe-les en morceaux et fais-les cuire 20 minutes à l'eau salée, puis écrase-les en purée avec l'huile d'olive.",
      "Fais chauffer le lait avec l'ail, plonge le lieu noir dedans et laisse pocher 8 minutes à feu doux, puis effeuille-le.",
      "Mélange le poisson, la purée, le persil, le poivre et la muscade, répartis dans un plat, parsème d'emmental et gratine 10 minutes à 200 °C."
    ],
    "moment": "quotidien",
    "adaptations": "Remise en forme : garde les quantités et ajoute des haricots verts à volonté. Maintien : ajoute une salade verte et un fruit.",
    "tags": [
      "economique",
      "familial",
      "meal-prep"
    ],
    "parPortion": {
      "kcal": 360,
      "p": 30,
      "c": 33,
      "f": 12,
      "fibres": 4
    }
  },
  {
    "id": "2026-11-16-pan-bagnat-thon-oeuf-legumes",
    "semaine": "2026-11-16",
    "nom": "Pan bagnat au thon, œuf dur et légumes croquants",
    "description": "Un petit pain rond garni de thon, d'œuf dur, de tomate, de poivron et d'olives, arrosé d'huile d'olive. Facile à préparer la veille et à emporter.",
    "categorie": "dejeuner",
    "profils": [
      "hyrox",
      "marathon"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "poisson",
      "oeufs"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 10,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Petits pains ronds",
        "quantite": "250 g (2 pains)"
      },
      {
        "nom": "Thon au naturel (conserve égouttée)",
        "quantite": "160 g"
      },
      {
        "nom": "Œufs",
        "quantite": "2 (environ 110 g)"
      },
      {
        "nom": "Tomates",
        "quantite": "200 g"
      },
      {
        "nom": "Poivron rouge",
        "quantite": "100 g"
      },
      {
        "nom": "Concombre",
        "quantite": "100 g"
      },
      {
        "nom": "Olives noires dénoyautées",
        "quantite": "30 g"
      },
      {
        "nom": "Oignon rouge",
        "quantite": "40 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "20 g (2 cuillères à soupe)"
      },
      {
        "nom": "Basilic, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais cuire les œufs 10 minutes dans l'eau bouillante, refroidis-les et écale-les.",
      "Coupe les tomates, le poivron, le concombre et l'oignon en fines tranches.",
      "Ouvre les pains en deux, arrose chaque face d'huile d'olive, puis garnis de thon émietté, de légumes, d'œuf en rondelles, d'olives et de basilic.",
      "Referme, presse un peu et emballe : le pain s'imprègne encore mieux si tu attends 30 minutes."
    ],
    "moment": "apres-entrainement",
    "adaptations": "Hyrox : mange-le après une séance mixte, avec un fruit. Marathon : retire l'huile d'olive supplémentaire et ajoute une banane pour plus de glucides avant une sortie.",
    "tags": [
      "meal-prep",
      "repas-d-effort",
      "sans-cuisson"
    ],
    "parPortion": {
      "kcal": 650,
      "p": 38,
      "c": 75,
      "f": 22,
      "fibres": 8
    }
  },
  {
    "id": "2026-11-16-smoothie-mangue-banane-soja",
    "semaine": "2026-11-16",
    "nom": "Smoothie mangue, banane et lait de soja",
    "description": "Un smoothie onctueux mangue-banane monté avec du lait de soja et du tofu soyeux. Des glucides rapides et des protéines végétales pour récupérer après l'effort.",
    "categorie": "collation",
    "profils": [
      "marathon",
      "ironman"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "soja"
    ],
    "portions": 2,
    "preparationMin": 5,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Mangue (fraîche ou surgelée)",
        "quantite": "200 g"
      },
      {
        "nom": "Bananes mûres",
        "quantite": "240 g (2 bananes)"
      },
      {
        "nom": "Lait de soja nature",
        "quantite": "400 ml"
      },
      {
        "nom": "Tofu soyeux",
        "quantite": "150 g"
      },
      {
        "nom": "Jus de citron vert",
        "quantite": "1/2 citron vert"
      }
    ],
    "etapes": [
      "Épluche les bananes et coupe-les en morceaux, avec la mangue.",
      "Mets tous les ingrédients dans un blender et mixe 1 minute, jusqu'à obtenir une texture lisse.",
      "Verse dans deux grands verres et bois dans les 30 minutes qui suivent l'effort."
    ],
    "moment": "recuperation",
    "adaptations": "Marathon : garde les quantités après une sortie longue. Ironman : ajoute 30 g de flocons d'avoine par portion pour plus d'énergie.",
    "tags": [
      "rapide",
      "sans-cuisson",
      "repas-d-effort"
    ],
    "parPortion": {
      "kcal": 279,
      "p": 12,
      "c": 42,
      "f": 7,
      "fibres": 5
    }
  },
  {
    "id": "2026-11-16-crumble-poires-flocons-yaourt-grec",
    "semaine": "2026-11-16",
    "nom": "Crumble de poires aux flocons d'avoine et yaourt grec",
    "description": "Des poires tendres sous un crumble croustillant d'avoine et de cannelle, servi avec du yaourt grec. Un dessert de saison, simple et peu sucré.",
    "categorie": "dessert",
    "profils": [
      "maintien",
      "remise-en-forme"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "lactose"
    ],
    "portions": 4,
    "preparationMin": 15,
    "cuissonMin": 25,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Poires",
        "quantite": "600 g (4 poires)"
      },
      {
        "nom": "Flocons d'avoine",
        "quantite": "80 g"
      },
      {
        "nom": "Beurre",
        "quantite": "40 g"
      },
      {
        "nom": "Sucre roux",
        "quantite": "30 g"
      },
      {
        "nom": "Yaourt grec nature",
        "quantite": "400 g"
      },
      {
        "nom": "Cannelle",
        "quantite": "1 cuillère à café"
      }
    ],
    "etapes": [
      "Préchauffe le four à 180 °C. Épluche les poires, coupe-les en dés et répartis-les dans un plat avec la moitié de la cannelle.",
      "Du bout des doigts, mélange l'avoine, le beurre froid en morceaux, le sucre roux et le reste de cannelle jusqu'à obtenir un sable grossier.",
      "Étale le crumble sur les poires et enfourne 25 minutes, jusqu'à ce que le dessus soit doré.",
      "Sers tiède avec 100 g de yaourt grec par portion."
    ],
    "moment": "recuperation",
    "adaptations": "Remise en forme : supprime le sucre roux, les poires suffisent. Maintien : garde les quantités indiquées.",
    "tags": [
      "economique",
      "familial"
    ],
    "parPortion": {
      "kcal": 306,
      "p": 11,
      "c": 43,
      "f": 10,
      "fibres": 6
    }
  },
  {
    "id": "2026-11-16-tacos-haricots-noirs-mais-guacamole",
    "semaine": "2026-11-16",
    "nom": "Tacos de haricots noirs, maïs et guacamole",
    "description": "Des tortillas garnies de haricots noirs épicés, de maïs, de salade et de guacamole maison. Un repas 100 % végétal, riche en fibres, prêt en 20 minutes.",
    "categorie": "dejeuner",
    "profils": [
      "bodybuilding",
      "hyrox"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 8,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Tortillas de blé",
        "quantite": "4 petites (160 g)"
      },
      {
        "nom": "Haricots noirs (conserve égouttée et rincée)",
        "quantite": "300 g"
      },
      {
        "nom": "Maïs en conserve égoutté",
        "quantite": "80 g"
      },
      {
        "nom": "Avocat mûr",
        "quantite": "150 g (1 gros)"
      },
      {
        "nom": "Tomates",
        "quantite": "150 g"
      },
      {
        "nom": "Oignon rouge",
        "quantite": "50 g"
      },
      {
        "nom": "Salade (laitue ou mâche)",
        "quantite": "60 g"
      },
      {
        "nom": "Citron vert, cumin, paprika, coriandre, sel",
        "quantite": "1 citron vert"
      }
    ],
    "etapes": [
      "Fais chauffer les haricots noirs et le maïs 5 minutes à la poêle avec le cumin, le paprika et une pincée de sel.",
      "Écrase l'avocat avec le jus de citron vert, la moitié de l'oignon haché, la moitié des tomates en dés et la coriandre pour faire le guacamole.",
      "Réchauffe les tortillas 30 secondes par face dans une poêle sèche.",
      "Garnis chaque tortilla de salade, de haricots, de guacamole et du reste de tomates et d'oignon, puis plie-les."
    ],
    "moment": "apres-entrainement",
    "adaptations": "Bodybuilding : ajoute 50 g de haricots noirs par portion en prise de masse, ou retire la moitié de l'avocat en sèche. Hyrox : ajoute une tortilla par portion avant une séance longue.",
    "tags": [
      "rapide",
      "economique"
    ],
    "parPortion": {
      "kcal": 574,
      "p": 21,
      "c": 73,
      "f": 22,
      "fibres": 19
    }
  },
  {
    "id": "2026-11-16-saute-boeuf-oignons-pommes-de-terre-roties",
    "semaine": "2026-11-16",
    "nom": "Sauté de bœuf, champignons et pommes de terre rôties",
    "description": "Des lanières de bœuf saisies avec oignons et champignons, servies avec des pommes de terre rôties au four. Un plat dense en protéines et en glucides.",
    "categorie": "diner",
    "profils": [
      "force",
      "bodybuilding"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "viande"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 30,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Rumsteck de bœuf",
        "quantite": "320 g"
      },
      {
        "nom": "Pommes de terre",
        "quantite": "500 g"
      },
      {
        "nom": "Oignons",
        "quantite": "200 g"
      },
      {
        "nom": "Champignons de Paris",
        "quantite": "200 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "20 g (2 cuillères à soupe)"
      },
      {
        "nom": "Ail, persil, paprika, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 210 °C. Coupe les pommes de terre en quartiers, mélange-les avec la moitié de l'huile, le paprika et le sel, et enfourne 30 minutes en les retournant à mi-cuisson.",
      "Coupe le bœuf en lanières, émince les oignons et les champignons.",
      "Fais saisir le bœuf 2 minutes à feu vif dans le reste d'huile, puis réserve-le.",
      "Fais revenir les oignons et les champignons 6 minutes, remets le bœuf avec l'ail et le persil et sers avec les pommes de terre."
    ],
    "moment": "apres-entrainement",
    "adaptations": "Force : ajoute 100 g de pommes de terre par portion les jours de grosse séance. Bodybuilding : en sèche, réduis les pommes de terre à 150 g par portion et ajoute des haricots verts.",
    "tags": [
      "repas-d-effort",
      "familial"
    ],
    "parPortion": {
      "kcal": 555,
      "p": 43,
      "c": 53,
      "f": 19,
      "fibres": 9
    }
  },
  {
    "id": "2026-11-16-gnocchis-poeles-tomates-mozzarella",
    "semaine": "2026-11-16",
    "nom": "Gnocchis poêlés, tomates cerises et mozzarella",
    "description": "Des gnocchis dorés à la poêle avec des tomates cerises, du basilic et de la mozzarella fondante. Riche en glucides, léger à digérer, prêt en 15 minutes.",
    "categorie": "diner",
    "profils": [
      "marathon",
      "prise"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "lactose"
    ],
    "portions": 3,
    "preparationMin": 5,
    "cuissonMin": 12,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Gnocchis de pommes de terre (frais)",
        "quantite": "600 g"
      },
      {
        "nom": "Tomates cerises",
        "quantite": "300 g"
      },
      {
        "nom": "Mozzarella",
        "quantite": "150 g (1 boule)"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "15 g (1 cuillère à soupe)"
      },
      {
        "nom": "Basilic, ail, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais chauffer l'huile dans une grande poêle et fais dorer les gnocchis 6 à 8 minutes en les remuant.",
      "Ajoute les tomates cerises coupées en deux et l'ail, et laisse cuire 4 minutes.",
      "Coupe la mozzarella en morceaux, ajoute-la hors du feu avec le basilic, et laisse-la fondre 1 minute avant de servir."
    ],
    "moment": "veille-de-course",
    "adaptations": "Veille de course : réduis la mozzarella à 30 g par portion pour une digestion plus légère. Prise de masse : ajoute 100 g de gnocchis par portion.",
    "tags": [
      "rapide",
      "repas-d-effort"
    ],
    "parPortion": {
      "kcal": 475,
      "p": 17,
      "c": 68,
      "f": 15,
      "fibres": 5
    }
  },
  {
    "id": "2026-11-16-cake-sale-courgettes-feta-olives",
    "semaine": "2026-11-16",
    "nom": "Cake salé courgettes, feta et olives",
    "description": "Un cake moelleux aux courgettes, à la feta et aux olives, cuit au four. Il se garde 4 jours au frais : parfait en meal-prep avec une salade verte.",
    "categorie": "dejeuner",
    "profils": [
      "perte",
      "maintien"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "oeufs",
      "lactose"
    ],
    "portions": 4,
    "preparationMin": 15,
    "cuissonMin": 40,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Courgettes",
        "quantite": "400 g"
      },
      {
        "nom": "Œufs",
        "quantite": "3 (environ 165 g)"
      },
      {
        "nom": "Farine de blé",
        "quantite": "120 g"
      },
      {
        "nom": "Yaourt nature",
        "quantite": "125 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "40 g (4 cuillères à soupe)"
      },
      {
        "nom": "Feta",
        "quantite": "120 g"
      },
      {
        "nom": "Olives vertes dénoyautées",
        "quantite": "40 g"
      },
      {
        "nom": "Levure chimique, menthe, sel, poivre",
        "quantite": "1 sachet de levure"
      }
    ],
    "etapes": [
      "Préchauffe le four à 180 °C. Râpe les courgettes, presse-les dans un torchon pour retirer l'eau et émiette la feta.",
      "Fouette les œufs avec le yaourt et l'huile, puis ajoute la farine mélangée à la levure, le sel, le poivre et la menthe.",
      "Incorpore les courgettes, la feta et les olives, verse dans un moule à cake chemisé et enfourne 40 minutes.",
      "Laisse tiédir avant de démouler, coupe en 4 parts et sers avec une salade verte."
    ],
    "moment": "quotidien",
    "adaptations": "Perte : garde les quantités et ajoute une grande salade verte. Maintien : ajoute une tranche de pain complet ou un fruit.",
    "tags": [
      "meal-prep",
      "economique"
    ],
    "parPortion": {
      "kcal": 380,
      "p": 15,
      "c": 26,
      "f": 24,
      "fibres": 2
    }
  },
  {
    "id": "2026-11-09-pudding-chia-mangue-coco",
    "semaine": "2026-11-09",
    "nom": "Pudding de chia, mangue et coco",
    "description": "Un pudding de chia préparé la veille avec du lait de soja et du lait de coco, nappé de mangue et de coco râpée. Sans cuisson, vegan, riche en fibres.",
    "categorie": "petit-dejeuner",
    "profils": [
      "maintien",
      "remise-en-forme"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "soja"
    ],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Graines de chia",
        "quantite": "40 g"
      },
      {
        "nom": "Lait de soja nature non sucré",
        "quantite": "300 ml"
      },
      {
        "nom": "Lait de coco",
        "quantite": "100 ml"
      },
      {
        "nom": "Mangue mûre",
        "quantite": "200 g"
      },
      {
        "nom": "Noix de coco râpée",
        "quantite": "10 g"
      }
    ],
    "etapes": [
      "Mélange les graines de chia avec le lait de soja et le lait de coco dans un bocal. Remue bien, attends 5 minutes, remue encore pour éviter les grumeaux, puis place au frais au moins 4 heures ou toute la nuit.",
      "Le lendemain, coupe la mangue en petits dés. Répartis le pudding dans deux bols, ajoute la mangue et parsème de noix de coco râpée."
    ],
    "parPortion": {
      "kcal": 301,
      "p": 10,
      "c": 18,
      "f": 21,
      "fibres": 10
    },
    "moment": "quotidien",
    "adaptations": "Remise en forme : garde les quantités indiquées. Maintien : ajoute une banane en rondelles ou une poignée de flocons d'avoine par portion si tu as faim avant midi.",
    "tags": [
      "sans-cuisson",
      "meal-prep",
      "rapide"
    ]
  },
  {
    "id": "2026-11-09-tofu-croustillant-quinoa-poivrons",
    "semaine": "2026-11-09",
    "nom": "Tofu croustillant au four, quinoa et poêlée de poivrons",
    "description": "Des cubes de tofu enrobés de fécule et dorés au four, avec du quinoa et une poêlée de poivrons et champignons au tamari. Vegan, très riche en protéines.",
    "categorie": "diner",
    "profils": [
      "bodybuilding",
      "perte"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "soja"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 25,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Tofu ferme",
        "quantite": "300 g"
      },
      {
        "nom": "Fécule de maïs",
        "quantite": "20 g"
      },
      {
        "nom": "Tamari",
        "quantite": "20 g (1 cuillère à soupe, sans gluten)"
      },
      {
        "nom": "Huile de colza",
        "quantite": "15 g (1 cuillère à soupe)"
      },
      {
        "nom": "Quinoa cuit",
        "quantite": "300 g"
      },
      {
        "nom": "Poivrons rouges et jaunes",
        "quantite": "250 g"
      },
      {
        "nom": "Champignons de Paris",
        "quantite": "150 g"
      },
      {
        "nom": "Oignon",
        "quantite": "80 g"
      },
      {
        "nom": "Ail, paprika, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 200 °C. Presse le tofu dans un torchon 10 minutes, coupe-le en cubes, enrobe-le de fécule et de la moitié du tamari, puis dépose-le sur une plaque huilée avec la moitié de l'huile.",
      "Enfourne 25 minutes en retournant les cubes à mi-cuisson, jusqu'à ce qu'ils soient bien dorés.",
      "Pendant ce temps, fais revenir l'oignon, les poivrons en lanières et les champignons émincés 10 minutes dans le reste de l'huile avec l'ail et le paprika, puis ajoute le reste du tamari. Sers avec le quinoa tiède et le tofu."
    ],
    "parPortion": {
      "kcal": 526,
      "p": 30,
      "c": 52,
      "f": 22,
      "fibres": 10
    },
    "moment": "apres-entrainement",
    "adaptations": "Bodybuilding : en prise, ajoute 100 g de quinoa cuit par portion ; en sèche, garde les quantités indiquées. Perte : réduis le quinoa à 100 g par portion et double les légumes.",
    "tags": [
      "repas-d-effort",
      "vegetal"
    ]
  },
  {
    "id": "2026-11-09-galettes-lentilles-corail-patate-douce",
    "semaine": "2026-11-09",
    "nom": "Galettes de lentilles corail et avoine, patate douce rôtie",
    "description": "Des galettes moelleuses de lentilles corail et de flocons d'avoine, poêlées, servies avec de la patate douce rôtie. Un repas végétal dense en énergie.",
    "categorie": "dejeuner",
    "profils": [
      "force",
      "prise"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten"
    ],
    "portions": 3,
    "preparationMin": 20,
    "cuissonMin": 35,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Lentilles corail cuites",
        "quantite": "360 g"
      },
      {
        "nom": "Flocons d'avoine",
        "quantite": "90 g"
      },
      {
        "nom": "Oignon",
        "quantite": "100 g"
      },
      {
        "nom": "Patate douce",
        "quantite": "600 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "25 g (2 cuillères à soupe)"
      },
      {
        "nom": "Concentré de tomate",
        "quantite": "30 g"
      },
      {
        "nom": "Cumin, paprika, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 210 °C. Coupe la patate douce en bâtonnets, mélange-la avec la moitié de l'huile, du sel et du paprika, et enfourne 30 à 35 minutes.",
      "Écrase les lentilles à la fourchette avec l'avoine, l'oignon haché finement, le concentré de tomate et le cumin. Laisse reposer 10 minutes pour que l'avoine gonfle, puis forme 6 galettes.",
      "Fais dorer les galettes 4 minutes par face dans le reste de l'huile et sers-les avec la patate douce."
    ],
    "parPortion": {
      "kcal": 495,
      "p": 17,
      "c": 82,
      "f": 11,
      "fibres": 15
    },
    "moment": "apres-entrainement",
    "adaptations": "Prise de masse : ajoute une cuillère d'huile d'olive et 100 g de patate douce par portion. Force : garde les quantités indiquées les jours de grosse séance.",
    "tags": [
      "meal-prep",
      "economique",
      "repas-d-effort"
    ]
  },
  {
    "id": "2026-11-09-risotto-champignons-petits-pois",
    "semaine": "2026-11-09",
    "nom": "Risotto crémeux aux champignons et petits pois",
    "description": "Un risotto onctueux aux champignons, petits pois et parmesan. Des glucides faciles à digérer, parfait la veille d'une sortie longue ou d'une course.",
    "categorie": "diner",
    "profils": [
      "marathon",
      "ironman"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "lactose"
    ],
    "portions": 3,
    "preparationMin": 15,
    "cuissonMin": 30,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Riz arborio (cru)",
        "quantite": "240 g"
      },
      {
        "nom": "Champignons de Paris",
        "quantite": "300 g"
      },
      {
        "nom": "Petits pois surgelés",
        "quantite": "200 g"
      },
      {
        "nom": "Oignon",
        "quantite": "100 g"
      },
      {
        "nom": "Parmesan râpé",
        "quantite": "40 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "20 g (1 cuillère à soupe et demie)"
      },
      {
        "nom": "Bouillon de légumes chaud",
        "quantite": "800 ml"
      },
      {
        "nom": "Ail, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais revenir l'oignon haché et les champignons émincés 6 minutes dans l'huile, jusqu'à ce que l'eau des champignons s'évapore. Ajoute l'ail et le riz et remue 2 minutes.",
      "Verse le bouillon chaud louche par louche en remuant, en attendant que chaque louche soit absorbée avant la suivante. Compte 18 à 20 minutes.",
      "Ajoute les petits pois les 5 dernières minutes. Hors du feu, incorpore le parmesan et le poivre, couvre 2 minutes et sers."
    ],
    "parPortion": {
      "kcal": 460,
      "p": 17,
      "c": 71,
      "f": 12,
      "fibres": 7
    },
    "moment": "veille-de-course",
    "adaptations": "Veille de sortie longue : ajoute 50 g de riz cru par portion. Ironman : ajoute une cuillère d'huile d'olive par portion. Reste digeste : évite d'ajouter trop de fibres la veille d'une compétition.",
    "tags": [
      "repas-d-effort",
      "familial"
    ]
  },
  {
    "id": "2026-11-09-tagliatelles-saumon-epinards",
    "semaine": "2026-11-09",
    "nom": "Tagliatelles crémeuses au saumon et aux épinards",
    "description": "Des tagliatelles avec du saumon poêlé, des épinards frais et une sauce légère à la crème et au citron. Riche en protéines et en glucides, prêt en 25 minutes.",
    "categorie": "diner",
    "profils": [
      "prise",
      "force"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "poisson",
      "lactose"
    ],
    "portions": 3,
    "preparationMin": 10,
    "cuissonMin": 15,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Tagliatelles (sèches)",
        "quantite": "270 g"
      },
      {
        "nom": "Pavé de saumon sans peau",
        "quantite": "300 g"
      },
      {
        "nom": "Épinards frais",
        "quantite": "250 g"
      },
      {
        "nom": "Crème fraîche légère",
        "quantite": "150 g"
      },
      {
        "nom": "Citron",
        "quantite": "1 (jus et zeste)"
      },
      {
        "nom": "Aneth, ail, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais cuire les tagliatelles selon le paquet et garde un demi-verre d'eau de cuisson. Coupe le saumon en cubes.",
      "Fais saisir le saumon 3 minutes dans une poêle antiadhésive sans matière grasse, ajoute les épinards et laisse-les tomber 2 minutes.",
      "Verse la crème, le jus et le zeste de citron, l'ail et un peu d'eau de cuisson, laisse chauffer 2 minutes, puis mélange avec les pâtes égouttées et l'aneth."
    ],
    "parPortion": {
      "kcal": 606,
      "p": 35,
      "c": 67,
      "f": 22,
      "fibres": 5
    },
    "moment": "apres-entrainement",
    "adaptations": "Prise de masse : ajoute 100 g de pâtes cuites par portion et un filet d'huile d'olive. Force : garde les quantités indiquées avec une salade verte.",
    "tags": [
      "rapide",
      "repas-d-effort"
    ]
  },
  {
    "id": "2026-11-09-boeuf-mijote-carottes-pommes-de-terre",
    "semaine": "2026-11-09",
    "nom": "Bœuf mijoté aux carottes et pommes de terre",
    "description": "Un plat unique de bœuf à braiser mijoté tout doucement avec carottes, oignons et pommes de terre. Se prépare en grande quantité et se réchauffe très bien.",
    "categorie": "diner",
    "profils": [
      "ironman",
      "maintien"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "viande"
    ],
    "portions": 4,
    "preparationMin": 20,
    "cuissonMin": 120,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Bœuf à braiser (paleron ou macreuse)",
        "quantite": "600 g"
      },
      {
        "nom": "Carottes",
        "quantite": "400 g"
      },
      {
        "nom": "Pommes de terre",
        "quantite": "800 g"
      },
      {
        "nom": "Oignons",
        "quantite": "150 g"
      },
      {
        "nom": "Concentré de tomate",
        "quantite": "40 g"
      },
      {
        "nom": "Huile de colza",
        "quantite": "15 g (1 cuillère à soupe)"
      },
      {
        "nom": "Pain complet",
        "quantite": "160 g (4 tranches)"
      },
      {
        "nom": "Thym, laurier, ail, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Coupe le bœuf en gros cubes et fais-le dorer sur toutes les faces dans l'huile, dans une cocotte. Réserve-le.",
      "Fais revenir les oignons émincés 4 minutes, ajoute le concentré de tomate, l'ail, le thym et le laurier, remets le bœuf et couvre d'eau à hauteur. Laisse mijoter 1 h 15 à feu doux, à couvert.",
      "Ajoute les carottes en rondelles et les pommes de terre en gros morceaux, puis poursuis 35 à 40 minutes. Sers avec une tranche de pain complet."
    ],
    "parPortion": {
      "kcal": 552,
      "p": 39,
      "c": 63,
      "f": 16,
      "fibres": 10
    },
    "moment": "recuperation",
    "adaptations": "Ironman : ajoute 100 g de pommes de terre par portion les jours de longue sortie. Maintien : garde les quantités indiquées ou remplace le pain par une salade verte.",
    "tags": [
      "meal-prep",
      "familial",
      "repas-d-effort"
    ]
  },
  {
    "id": "2026-11-09-roti-dinde-puree-butternut-lentilles",
    "semaine": "2026-11-09",
    "nom": "Rôti de dinde au thym, purée de butternut et lentilles",
    "description": "Un rôti de dinde cuit au four sur un lit d'oignons, servi avec une purée de courge butternut à l'huile d'olive et des lentilles vertes. Maigre et rassasiant.",
    "categorie": "dejeuner",
    "profils": [
      "maintien",
      "remise-en-forme"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "volaille"
    ],
    "portions": 4,
    "preparationMin": 20,
    "cuissonMin": 45,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Rôti de dinde",
        "quantite": "500 g"
      },
      {
        "nom": "Courge butternut",
        "quantite": "800 g"
      },
      {
        "nom": "Lentilles vertes cuites",
        "quantite": "300 g"
      },
      {
        "nom": "Oignon",
        "quantite": "100 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "30 g (2 cuillères à soupe)"
      },
      {
        "nom": "Thym, ail, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 190 °C. Dépose le rôti sur les oignons émincés, arrose-le de la moitié de l'huile et parsème de thym, de sel et de poivre. Enfourne 45 minutes en arrosant à mi-cuisson.",
      "Pendant ce temps, épluche la butternut, coupe-la en cubes et fais-la cuire 20 minutes à la vapeur ou à l'eau. Écrase-la avec le reste de l'huile.",
      "Réchauffe les lentilles, laisse reposer le rôti 5 minutes, tranche-le et sers avec la purée et les lentilles."
    ],
    "parPortion": {
      "kcal": 378,
      "p": 37,
      "c": 35,
      "f": 10,
      "fibres": 9
    },
    "moment": "quotidien",
    "adaptations": "Remise en forme : garde les quantités indiquées. Maintien : ajoute une tranche de pain complet ou 50 g de lentilles en plus par portion.",
    "tags": [
      "meal-prep",
      "familial"
    ]
  },
  {
    "id": "2026-11-09-mug-cake-chocolat-banane-avoine",
    "semaine": "2026-11-09",
    "nom": "Mug cake chocolat, banane et avoine",
    "description": "Un gâteau minute au micro-ondes avec banane, avoine, œuf, cacao et fromage blanc, sans sucre ajouté. Un dessert protéiné prêt en 5 minutes.",
    "categorie": "dessert",
    "profils": [
      "bodybuilding",
      "maintien"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "oeufs",
      "lactose"
    ],
    "portions": 1,
    "preparationMin": 5,
    "cuissonMin": 2,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Banane mûre",
        "quantite": "100 g (1 petite)"
      },
      {
        "nom": "Flocons d'avoine",
        "quantite": "30 g"
      },
      {
        "nom": "Œuf",
        "quantite": "1 (60 g)"
      },
      {
        "nom": "Cacao en poudre non sucré",
        "quantite": "8 g (1 cuillère à soupe)"
      },
      {
        "nom": "Fromage blanc 0 %",
        "quantite": "50 g"
      },
      {
        "nom": "Levure chimique",
        "quantite": "1/2 cuillère à café"
      }
    ],
    "etapes": [
      "Écrase la banane à la fourchette dans un grand mug, puis ajoute l'œuf, le fromage blanc, le cacao, l'avoine et la levure. Mélange jusqu'à obtenir une pâte homogène.",
      "Fais cuire 1 minute 30 à 2 minutes au micro-ondes, jusqu'à ce que le gâteau soit pris. Laisse tiédir 1 minute avant de déguster."
    ],
    "parPortion": {
      "kcal": 313,
      "p": 18,
      "c": 40,
      "f": 9,
      "fibres": 7
    },
    "moment": "quotidien",
    "adaptations": "Bodybuilding : ajoute une mesure de whey ou 100 g de fromage blanc en plus en prise de masse. Maintien : garde la recette telle quelle, avec un fruit.",
    "tags": [
      "rapide",
      "micro-ondes",
      "economique"
    ]
  },
  {
    "id": "2026-11-09-houmous-betterave-crudites-pita",
    "semaine": "2026-11-09",
    "nom": "Houmous de betterave, crudités et pain pita",
    "description": "Un houmous rose à la betterave cuite et au tahini, servi avec des bâtonnets de concombre et de carotte et du pain pita. Une collation végétale rassasiante.",
    "categorie": "collation",
    "profils": [
      "perte",
      "maintien"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "sesame",
      "gluten"
    ],
    "portions": 3,
    "preparationMin": 10,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Pois chiches cuits (conserve rincée)",
        "quantite": "240 g"
      },
      {
        "nom": "Betterave cuite",
        "quantite": "150 g"
      },
      {
        "nom": "Purée de sésame (tahini)",
        "quantite": "30 g (2 cuillères à soupe)"
      },
      {
        "nom": "Jus de citron",
        "quantite": "20 g (1/2 citron)"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "10 g (2 cuillères à café)"
      },
      {
        "nom": "Concombre",
        "quantite": "200 g"
      },
      {
        "nom": "Carottes",
        "quantite": "200 g"
      },
      {
        "nom": "Pain pita",
        "quantite": "120 g (2 pitas)"
      },
      {
        "nom": "Ail, cumin, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Mixe les pois chiches avec la betterave, le tahini, le citron, l'huile, l'ail, le cumin et le sel, en ajoutant 2 à 3 cuillères à soupe d'eau, jusqu'à obtenir une texture lisse.",
      "Coupe le concombre et les carottes en bâtonnets, réchauffe les pitas 1 minute et coupe-les en lanières. Sers le houmous dans un bol avec les crudités et le pain."
    ],
    "parPortion": {
      "kcal": 340,
      "p": 13,
      "c": 45,
      "f": 12,
      "fibres": 10
    },
    "moment": "quotidien",
    "adaptations": "Perte : garde une demi-pita par portion et double les crudités. Maintien : garde les quantités indiquées.",
    "tags": [
      "sans-cuisson",
      "rapide",
      "economique"
    ]
  },
  {
    "id": "2026-11-09-porridge-sale-avoine-oeuf-poche-epinards",
    "semaine": "2026-11-09",
    "nom": "Porridge salé à l'avoine, œuf poché et épinards",
    "description": "Un porridge d'avoine cuit au bouillon, avec des épinards, du parmesan et un œuf poché. Un petit-déjeuner salé, chaud et riche en protéines.",
    "categorie": "petit-dejeuner",
    "profils": [
      "bodybuilding",
      "hyrox"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "oeufs",
      "lactose"
    ],
    "portions": 2,
    "preparationMin": 5,
    "cuissonMin": 10,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Flocons d'avoine",
        "quantite": "100 g"
      },
      {
        "nom": "Bouillon de légumes chaud",
        "quantite": "400 ml"
      },
      {
        "nom": "Épinards frais",
        "quantite": "150 g"
      },
      {
        "nom": "Œufs",
        "quantite": "4 (220 g)"
      },
      {
        "nom": "Parmesan râpé",
        "quantite": "20 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "10 g (2 cuillères à café)"
      },
      {
        "nom": "Poivre, piment doux",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais chauffer l'huile, ajoute les épinards et laisse-les tomber 2 minutes. Verse l'avoine et le bouillon chaud, puis cuis 5 minutes à feu doux en remuant, jusqu'à ce que le porridge épaississe.",
      "Pendant ce temps, fais pocher les œufs 3 minutes dans une eau frémissante vinaigrée, ou cuis-les au plat.",
      "Répartis le porridge dans deux bols, pose les œufs dessus, parsème de parmesan, de poivre et de piment doux."
    ],
    "parPortion": {
      "kcal": 431,
      "p": 26,
      "c": 30,
      "f": 23,
      "fibres": 7
    },
    "moment": "avant-entrainement",
    "adaptations": "Bodybuilding : ajoute un œuf par portion en prise, garde les quantités indiquées en sèche. Hyrox : ajoute 30 g d'avoine par portion avant une séance longue.",
    "tags": [
      "rapide",
      "salé"
    ]
  },
  {
    "id": "2026-11-09-soupe-lentilles-corail-carottes-coco",
    "semaine": "2026-11-09",
    "nom": "Soupe de lentilles corail, carottes et lait de coco",
    "description": "Une soupe veloutée de lentilles corail, carottes, cumin et lait de coco, servie avec du pain complet. Vegan, riche en fibres et en protéines végétales.",
    "categorie": "dejeuner",
    "profils": [
      "hyrox",
      "remise-en-forme"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten"
    ],
    "portions": 3,
    "preparationMin": 10,
    "cuissonMin": 25,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Lentilles corail (sèches)",
        "quantite": "200 g"
      },
      {
        "nom": "Carottes",
        "quantite": "300 g"
      },
      {
        "nom": "Oignon",
        "quantite": "100 g"
      },
      {
        "nom": "Lait de coco",
        "quantite": "200 ml"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "10 g (2 cuillères à café)"
      },
      {
        "nom": "Pain complet",
        "quantite": "150 g (3 tranches)"
      },
      {
        "nom": "Eau ou bouillon de légumes",
        "quantite": "900 ml"
      },
      {
        "nom": "Cumin, curcuma, gingembre, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais revenir l'oignon et les carottes en rondelles 5 minutes dans l'huile avec le cumin, le curcuma et le gingembre.",
      "Ajoute les lentilles rincées et l'eau, puis laisse cuire 20 minutes à feu moyen. Verse le lait de coco, mixe la soupe selon la texture voulue et rectifie l'assaisonnement.",
      "Sers bien chaud avec une tranche de pain complet par portion."
    ],
    "parPortion": {
      "kcal": 513,
      "p": 23,
      "c": 67,
      "f": 17,
      "fibres": 14
    },
    "moment": "quotidien",
    "adaptations": "Hyrox : ajoute une tranche de pain et 50 g de lentilles cuites par portion avant une séance. Remise en forme : garde les quantités indiquées.",
    "tags": [
      "meal-prep",
      "economique",
      "vegetal"
    ]
  },
  {
    "id": "2026-11-09-pizzas-tortilla-legumes-mozzarella",
    "semaine": "2026-11-09",
    "nom": "Pizzas-tortilla aux légumes et à la mozzarella",
    "description": "Des tortillas croustillantes garnies de sauce tomate, poivron, champignons et mozzarella, gratinées au four. Un repas d'énergie prêt en 20 minutes.",
    "categorie": "dejeuner",
    "profils": [
      "marathon",
      "ironman"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "lactose"
    ],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 10,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Tortillas de blé",
        "quantite": "4 petites (160 g)"
      },
      {
        "nom": "Passata de tomates",
        "quantite": "150 g"
      },
      {
        "nom": "Mozzarella",
        "quantite": "125 g"
      },
      {
        "nom": "Poivron rouge",
        "quantite": "100 g"
      },
      {
        "nom": "Champignons de Paris",
        "quantite": "100 g"
      },
      {
        "nom": "Oignon rouge",
        "quantite": "50 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "10 g (2 cuillères à café)"
      },
      {
        "nom": "Origan, basilic, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 220 °C. Dépose les tortillas sur une plaque et fais-les cuire 2 minutes pour les raffermir.",
      "Étale la passata assaisonnée d'origan, ajoute les légumes émincés finement et la mozzarella en lamelles, puis arrose d'huile.",
      "Enfourne 8 minutes, jusqu'à ce que le fromage soit doré et les bords croustillants. Parsème de basilic et sers."
    ],
    "parPortion": {
      "kcal": 478,
      "p": 21,
      "c": 49,
      "f": 22,
      "fibres": 6
    },
    "moment": "quotidien",
    "adaptations": "Marathon : ajoute une 5e tortilla à partager la veille d'une sortie longue. Ironman : ajoute un œuf ou 50 g de thon par pizza.",
    "tags": [
      "rapide",
      "familial"
    ]
  },
  {
    "id": "2026-11-02-poke-bowl-thon-edamame-riz",
    "semaine": "2026-11-02",
    "nom": "Poke bowl au thon, edamame et avocat",
    "description": "Un bol façon poke : riz, thon au naturel, edamame, concombre et avocat, relevé de sauce soja. Sans cuisson, prêt en 10 minutes avec du riz déjà cuit.",
    "categorie": "dejeuner",
    "profils": [
      "hyrox",
      "bodybuilding"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "poisson",
      "soja",
      "gluten"
    ],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Riz basmati cuit",
        "quantite": "400 g"
      },
      {
        "nom": "Thon au naturel égoutté",
        "quantite": "280 g"
      },
      {
        "nom": "Edamame décortiqués (surgelés, décongelés)",
        "quantite": "150 g"
      },
      {
        "nom": "Concombre",
        "quantite": "150 g"
      },
      {
        "nom": "Carotte",
        "quantite": "100 g"
      },
      {
        "nom": "Avocat",
        "quantite": "100 g (un demi)"
      },
      {
        "nom": "Sauce soja",
        "quantite": "30 g (2 cuillères à soupe)"
      },
      {
        "nom": "Citron vert, ciboulette",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Répartis le riz tiède ou froid dans deux bols. Émince le concombre, râpe la carotte et coupe l'avocat en lamelles.",
      "Dispose le thon émietté, les edamame, le concombre, la carotte et l'avocat par-dessus le riz.",
      "Arrose de sauce soja et de jus de citron vert, parsème de ciboulette et sers aussitôt."
    ],
    "moment": "apres-entrainement",
    "adaptations": "Hyrox : ajoute 100 g de riz cuit par portion après une séance longue. Bodybuilding en sèche : retire l'avocat et garde 300 g de riz au total.",
    "tags": [
      "rapide",
      "sans-cuisson",
      "repas-d-effort"
    ],
    "parPortion": {
      "kcal": 620,
      "p": 51,
      "c": 68,
      "f": 16,
      "fibres": 9
    }
  },
  {
    "id": "2026-11-02-granola-maison-avoine-noisettes",
    "semaine": "2026-11-02",
    "nom": "Granola maison avoine, noisettes et raisins secs",
    "description": "Un granola croustillant fait au four avec avoine, noisettes, graines de courge et sirop d'érable. À préparer pour la semaine, à manger avec ton lait végétal.",
    "categorie": "petit-dejeuner",
    "profils": [
      "maintien",
      "remise-en-forme"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "fruits-a-coque"
    ],
    "portions": 8,
    "preparationMin": 10,
    "cuissonMin": 25,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Flocons d'avoine",
        "quantite": "240 g"
      },
      {
        "nom": "Noisettes concassées",
        "quantite": "60 g"
      },
      {
        "nom": "Graines de courge",
        "quantite": "40 g"
      },
      {
        "nom": "Sirop d'érable",
        "quantite": "60 g (3 cuillères à soupe)"
      },
      {
        "nom": "Huile de colza",
        "quantite": "30 g (2 cuillères à soupe)"
      },
      {
        "nom": "Raisins secs",
        "quantite": "50 g"
      },
      {
        "nom": "Cannelle",
        "quantite": "1 cuillère à café"
      }
    ],
    "etapes": [
      "Préchauffe le four à 160 °C. Mélange l'avoine, les noisettes, les graines de courge et la cannelle dans un saladier.",
      "Ajoute le sirop d'érable et l'huile, mélange bien, étale sur une plaque tapissée de papier cuisson et enfourne 25 minutes en remuant à mi-cuisson.",
      "Laisse refroidir complètement, ajoute les raisins secs et garde dans un bocal fermé. Compte une portion de 45 g avec du lait végétal ou un fruit."
    ],
    "moment": "quotidien",
    "adaptations": "Remise en forme : une portion avec un fruit frais suffit au petit-déjeuner. Maintien : ajoute un yaourt végétal ou une banane pour plus de volume.",
    "tags": [
      "meal-prep",
      "economique"
    ],
    "parPortion": {
      "kcal": 257,
      "p": 7,
      "c": 28,
      "f": 13,
      "fibres": 4
    }
  },
  {
    "id": "2026-11-02-mafe-patate-douce-cacahuete-riz",
    "semaine": "2026-11-02",
    "nom": "Mafé végétal patate douce, cacahuète et riz",
    "description": "Un mafé sans viande : patate douce, pois chiches et épinards dans une sauce tomate-cacahuète. Dense en énergie, parfait pour les semaines d'endurance.",
    "categorie": "diner",
    "profils": [
      "marathon",
      "ironman",
      "prise"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "arachides"
    ],
    "portions": 4,
    "preparationMin": 15,
    "cuissonMin": 35,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Patate douce",
        "quantite": "600 g"
      },
      {
        "nom": "Pois chiches cuits (conserve rincée)",
        "quantite": "240 g"
      },
      {
        "nom": "Beurre de cacahuète",
        "quantite": "60 g (4 cuillères à soupe)"
      },
      {
        "nom": "Tomates concassées",
        "quantite": "400 g"
      },
      {
        "nom": "Oignon",
        "quantite": "150 g"
      },
      {
        "nom": "Épinards frais",
        "quantite": "200 g"
      },
      {
        "nom": "Riz basmati (sec)",
        "quantite": "240 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "15 g (1 cuillère à soupe)"
      },
      {
        "nom": "Gingembre, ail, piment, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais cuire le riz selon le paquet. Pendant ce temps, épluche la patate douce et coupe-la en cubes de 2 cm.",
      "Fais revenir l'oignon émincé dans l'huile 4 minutes avec le gingembre et l'ail, ajoute les tomates, la patate douce, les pois chiches et 200 ml d'eau, puis laisse mijoter 20 minutes à couvert.",
      "Délaie le beurre de cacahuète avec une louche de sauce, verse-le dans la casserole avec les épinards et cuis 5 minutes de plus. Sers sur le riz."
    ],
    "moment": "veille-de-course",
    "adaptations": "Veille de sortie longue : ajoute 50 g de riz cuit par portion. Prise de masse : ajoute une cuillère de beurre de cacahuète par portion. Sèche : garde la moitié du riz.",
    "tags": [
      "meal-prep",
      "familial",
      "repas-d-effort"
    ],
    "parPortion": {
      "kcal": 574,
      "p": 18,
      "c": 94,
      "f": 14,
      "fibres": 13
    }
  },
  {
    "id": "2026-11-02-salade-pois-chiches-roties-chou-rouge",
    "semaine": "2026-11-02",
    "nom": "Salade de pois chiches rôtis, chou rouge et quinoa",
    "description": "Une salade croquante : pois chiches rôtis au cumin, chou rouge, carottes et quinoa, assaisonnée au citron. Rassasiante et très riche en fibres.",
    "categorie": "dejeuner",
    "profils": [
      "perte",
      "remise-en-forme"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 20,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Pois chiches cuits (conserve rincée)",
        "quantite": "400 g"
      },
      {
        "nom": "Quinoa cuit",
        "quantite": "150 g"
      },
      {
        "nom": "Chou rouge",
        "quantite": "200 g"
      },
      {
        "nom": "Carottes",
        "quantite": "200 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "25 g (2 cuillères à soupe)"
      },
      {
        "nom": "Jus de citron",
        "quantite": "40 g (1 citron)"
      },
      {
        "nom": "Cumin, persil, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 200 °C. Sèche les pois chiches, mélange-les avec la moitié de l'huile, le cumin et le sel, puis enfourne 20 minutes sur une plaque.",
      "Émince finement le chou rouge et râpe les carottes dans un saladier avec le quinoa.",
      "Ajoute les pois chiches tièdes, le reste de l'huile, le citron et le persil, mélange et sers."
    ],
    "moment": "quotidien",
    "adaptations": "Perte : garde les quantités indiquées. Remise en forme : ajoute une tranche de pain complet ou 100 g de quinoa cuit en plus par portion.",
    "tags": [
      "rapide",
      "economique",
      "vegetal"
    ],
    "parPortion": {
      "kcal": 475,
      "p": 20,
      "c": 56,
      "f": 19,
      "fibres": 17
    }
  },
  {
    "id": "2026-11-02-poulet-basquaise-pommes-de-terre",
    "semaine": "2026-11-02",
    "nom": "Poulet basquaise et pommes de terre",
    "description": "Des hauts de cuisse de poulet mijotés avec poivrons, tomates et piment d'Espelette, servis avec des pommes de terre. Un plat complet qui se réchauffe très bien.",
    "categorie": "diner",
    "profils": [
      "maintien",
      "marathon"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "volaille"
    ],
    "portions": 3,
    "preparationMin": 15,
    "cuissonMin": 45,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Hauts de cuisse de poulet sans peau",
        "quantite": "480 g"
      },
      {
        "nom": "Poivrons rouges et verts",
        "quantite": "400 g"
      },
      {
        "nom": "Tomates concassées",
        "quantite": "400 g"
      },
      {
        "nom": "Oignon",
        "quantite": "150 g"
      },
      {
        "nom": "Pommes de terre",
        "quantite": "500 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "20 g (1 cuillère à soupe et demie)"
      },
      {
        "nom": "Ail, piment d'Espelette, thym, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais dorer le poulet 4 minutes par face dans l'huile, puis réserve-le. Épluche les pommes de terre et coupe-les en gros cubes.",
      "Fais revenir l'oignon et les poivrons en lanières 8 minutes dans la même cocotte, ajoute l'ail, le piment, le thym et les tomates.",
      "Remets le poulet avec les pommes de terre, couvre d'un verre d'eau et laisse mijoter 30 minutes à feu doux. Sers bien chaud."
    ],
    "moment": "quotidien",
    "adaptations": "Marathon, veille de sortie longue : ajoute 100 g de pommes de terre par portion. Maintien : garde les quantités indiquées avec une salade verte.",
    "tags": [
      "meal-prep",
      "familial",
      "economique"
    ],
    "parPortion": {
      "kcal": 472,
      "p": 38,
      "c": 44,
      "f": 16,
      "fibres": 9
    }
  },
  {
    "id": "2026-11-02-chili-con-carne-boeuf-riz",
    "semaine": "2026-11-02",
    "nom": "Chili con carne de bœuf et riz",
    "description": "Un chili de bœuf haché 5 %, haricots rouges et poivrons, mijoté à la tomate et servi avec du riz basmati. Se prépare en grande quantité et se congèle.",
    "categorie": "diner",
    "profils": [
      "prise",
      "force"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "viande"
    ],
    "portions": 4,
    "preparationMin": 15,
    "cuissonMin": 40,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Bœuf haché 5 % de matière grasse",
        "quantite": "400 g"
      },
      {
        "nom": "Haricots rouges cuits (conserve rincée)",
        "quantite": "400 g"
      },
      {
        "nom": "Tomates concassées",
        "quantite": "400 g"
      },
      {
        "nom": "Poivron rouge",
        "quantite": "150 g"
      },
      {
        "nom": "Oignon",
        "quantite": "150 g"
      },
      {
        "nom": "Riz basmati (sec)",
        "quantite": "240 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "15 g (1 cuillère à soupe)"
      },
      {
        "nom": "Cumin, paprika, piment, ail, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais revenir l'oignon et le poivron en dés dans l'huile 5 minutes, ajoute le bœuf et émiette-le 5 minutes à feu vif.",
      "Ajoute les épices, les tomates, les haricots rouges et un demi-verre d'eau, puis laisse mijoter 30 minutes à feu doux.",
      "Fais cuire le riz selon le paquet et sers le chili dessus."
    ],
    "moment": "apres-entrainement",
    "adaptations": "Prise de masse : ajoute 100 g de riz cuit par portion et un filet d'huile d'olive. Force : garde les quantités indiquées les jours de grosse séance.",
    "tags": [
      "meal-prep",
      "familial",
      "repas-d-effort"
    ],
    "parPortion": {
      "kcal": 523,
      "p": 36,
      "c": 70,
      "f": 11,
      "fibres": 11
    }
  },
  {
    "id": "2026-11-02-muffins-banane-avoine-pepites-chocolat",
    "semaine": "2026-11-02",
    "nom": "Muffins moelleux banane, avoine et pépites de chocolat",
    "description": "Des muffins sans farine : banane, avoine, œufs et fromage blanc, avec quelques pépites de chocolat. Une collation de prise de masse facile à emporter.",
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
      "oeufs",
      "lactose"
    ],
    "portions": 6,
    "preparationMin": 10,
    "cuissonMin": 22,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Bananes mûres",
        "quantite": "300 g (3 bananes)"
      },
      {
        "nom": "Flocons d'avoine",
        "quantite": "150 g"
      },
      {
        "nom": "Œufs",
        "quantite": "3 (165 g)"
      },
      {
        "nom": "Lait demi-écrémé",
        "quantite": "150 ml"
      },
      {
        "nom": "Fromage blanc 0 %",
        "quantite": "100 g"
      },
      {
        "nom": "Pépites de chocolat noir",
        "quantite": "50 g"
      },
      {
        "nom": "Huile de colza",
        "quantite": "20 g (1 cuillère à soupe et demie)"
      },
      {
        "nom": "Levure chimique",
        "quantite": "1 sachet (11 g)"
      }
    ],
    "etapes": [
      "Préchauffe le four à 180 °C. Écrase les bananes à la fourchette et mélange-les avec les œufs, le lait, le fromage blanc et l'huile.",
      "Ajoute l'avoine, la levure et les pépites de chocolat, puis mélange jusqu'à obtenir une pâte homogène.",
      "Répartis dans 6 moules à muffins et enfourne 22 minutes. Laisse refroidir avant de démouler. Une portion correspond à un muffin."
    ],
    "moment": "recuperation",
    "adaptations": "Prise de masse : mange 2 muffins par portion avec un verre de lait. Ironman : emporte-les en collation de sortie longue.",
    "tags": [
      "meal-prep",
      "economique",
      "transportable"
    ],
    "parPortion": {
      "kcal": 263,
      "p": 10,
      "c": 31,
      "f": 11,
      "fibres": 4
    }
  },
  {
    "id": "2026-11-02-clafoutis-leger-poires-vanille",
    "semaine": "2026-11-02",
    "nom": "Clafoutis léger aux poires et à la vanille",
    "description": "Un clafoutis tendre aux poires, peu sucré, avec un peu de fromage blanc pour les protéines. Un dessert de semaine qui reste léger.",
    "categorie": "dessert",
    "profils": [
      "perte",
      "maintien"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "oeufs",
      "lactose"
    ],
    "portions": 4,
    "preparationMin": 15,
    "cuissonMin": 35,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Poires",
        "quantite": "500 g (3 poires)"
      },
      {
        "nom": "Œufs",
        "quantite": "3 (165 g)"
      },
      {
        "nom": "Lait demi-écrémé",
        "quantite": "250 ml"
      },
      {
        "nom": "Farine de blé",
        "quantite": "50 g"
      },
      {
        "nom": "Sucre",
        "quantite": "30 g"
      },
      {
        "nom": "Fromage blanc 0 %",
        "quantite": "100 g"
      },
      {
        "nom": "Extrait de vanille",
        "quantite": "1 cuillère à café"
      }
    ],
    "etapes": [
      "Préchauffe le four à 180 °C. Épluche les poires, coupe-les en lamelles et dispose-les dans un plat légèrement beurré ou chemisé de papier cuisson.",
      "Fouette les œufs avec le sucre, ajoute la farine, le lait, le fromage blanc et la vanille jusqu'à obtenir une pâte lisse.",
      "Verse la pâte sur les poires et enfourne 35 minutes, jusqu'à ce que le dessus soit doré. Sers tiède ou froid."
    ],
    "moment": "quotidien",
    "adaptations": "Perte : une part par jour, sans sucre ajouté si tes poires sont bien mûres. Maintien : ajoute une cuillère de fromage blanc sur la part.",
    "tags": [
      "economique",
      "familial"
    ],
    "parPortion": {
      "kcal": 250,
      "p": 11,
      "c": 38,
      "f": 6,
      "fibres": 4
    }
  },
  {
    "id": "2026-11-02-boules-de-riz-patate-douce-nori",
    "semaine": "2026-11-02",
    "nom": "Boules de riz patate douce et nori",
    "description": "Des boules de riz façon onigiri mélangées à de la patate douce, enroulées dans du nori. Faciles à manger pendant l'effort, sans fourchette ni couverts.",
    "categorie": "collation",
    "profils": [
      "ironman",
      "marathon"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [],
    "portions": 4,
    "preparationMin": 25,
    "cuissonMin": 10,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Riz rond cuit",
        "quantite": "600 g"
      },
      {
        "nom": "Patate douce cuite à la vapeur",
        "quantite": "250 g"
      },
      {
        "nom": "Feuilles de nori",
        "quantite": "4"
      },
      {
        "nom": "Vinaigre de riz",
        "quantite": "1 cuillère à soupe"
      },
      {
        "nom": "Sel",
        "quantite": "1 pincée"
      }
    ],
    "etapes": [
      "Écrase la patate douce tiède à la fourchette et mélange-la avec le riz, le vinaigre et le sel.",
      "Mouille-toi les mains, forme 8 boules ou petits triangles en pressant bien, puis enroule chacun dans une bande de nori.",
      "Emballe-les dans du papier film ou du papier alu. Compte 2 boules par portion, à manger dans les 24 heures."
    ],
    "moment": "pendant-effort",
    "adaptations": "Sortie longue : 2 à 3 boules par heure d'effort selon ta tolérance. Récupération : ajoute une source de protéines après la séance.",
    "tags": [
      "meal-prep",
      "repas-d-effort",
      "transportable"
    ],
    "parPortion": {
      "kcal": 249,
      "p": 5,
      "c": 55,
      "f": 1,
      "fibres": 2
    }
  },
  {
    "id": "2026-11-02-pates-completes-epinards-ricotta",
    "semaine": "2026-11-02",
    "nom": "Pâtes complètes aux épinards, ricotta et parmesan",
    "description": "Des pâtes complètes avec une sauce crémeuse d'épinards, de ricotta et de parmesan. Prêtes en 20 minutes, riches en protéines et en fibres.",
    "categorie": "diner",
    "profils": [
      "force",
      "remise-en-forme"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "lactose"
    ],
    "portions": 3,
    "preparationMin": 10,
    "cuissonMin": 15,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Pâtes complètes (sèches)",
        "quantite": "240 g"
      },
      {
        "nom": "Épinards frais",
        "quantite": "300 g"
      },
      {
        "nom": "Ricotta",
        "quantite": "250 g"
      },
      {
        "nom": "Parmesan râpé",
        "quantite": "30 g"
      },
      {
        "nom": "Oignon",
        "quantite": "80 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "10 g (2 cuillères à café)"
      },
      {
        "nom": "Ail, noix de muscade, poivre, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais cuire les pâtes selon le paquet et garde un demi-verre d'eau de cuisson.",
      "Fais revenir l'oignon et l'ail dans l'huile 3 minutes, ajoute les épinards et laisse-les tomber 3 minutes.",
      "Mélange la ricotta et un peu d'eau de cuisson avec les épinards pour faire une sauce, ajoute les pâtes, la muscade et le poivre, parsème de parmesan et sers."
    ],
    "moment": "apres-entrainement",
    "adaptations": "Force : ajoute 100 g de pâtes cuites par portion les jours de grosse séance. Remise en forme : garde les quantités indiquées avec une salade.",
    "tags": [
      "rapide",
      "familial"
    ],
    "parPortion": {
      "kcal": 469,
      "p": 24,
      "c": 55,
      "f": 17,
      "fibres": 10
    }
  },
  {
    "id": "2026-11-02-soupe-thai-poulet-coco-nouilles",
    "semaine": "2026-11-02",
    "nom": "Soupe thaï au poulet, lait de coco et nouilles de riz",
    "description": "Une soupe parfumée au lait de coco, citron vert et gingembre, avec du poulet, des champignons et des nouilles de riz. Réconfortante et rapide.",
    "categorie": "diner",
    "profils": [
      "remise-en-forme",
      "maintien"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "volaille"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 15,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Blanc de poulet",
        "quantite": "300 g"
      },
      {
        "nom": "Lait de coco",
        "quantite": "200 ml"
      },
      {
        "nom": "Vermicelles de riz (secs)",
        "quantite": "120 g"
      },
      {
        "nom": "Champignons de Paris",
        "quantite": "200 g"
      },
      {
        "nom": "Carottes",
        "quantite": "100 g"
      },
      {
        "nom": "Bouillon de volaille chaud",
        "quantite": "800 ml"
      },
      {
        "nom": "Citron vert, gingembre, coriandre, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Coupe le poulet en lamelles fines, émince les champignons et les carottes en rondelles.",
      "Porte le bouillon à frémissement avec le gingembre, ajoute le lait de coco, les carottes et les champignons, puis laisse cuire 6 minutes.",
      "Ajoute le poulet et les vermicelles de riz, cuis 5 minutes de plus, puis relève avec le jus d'un citron vert et de la coriandre."
    ],
    "moment": "quotidien",
    "adaptations": "Remise en forme : garde les quantités indiquées. Maintien : ajoute une poignée de pousses de soja ou un œuf mollet.",
    "tags": [
      "rapide",
      "economique"
    ],
    "parPortion": {
      "kcal": 585,
      "p": 42,
      "c": 57,
      "f": 21,
      "fibres": 5
    }
  },
  {
    "id": "2026-11-02-galettes-thon-pommes-de-terre-salade",
    "semaine": "2026-11-02",
    "nom": "Galettes de thon et pommes de terre, salade de haricots verts",
    "description": "Des galettes dorées au thon, pommes de terre et œuf, servies avec une salade de haricots verts et tomates. Riches en protéines pour peu de calories.",
    "categorie": "diner",
    "profils": [
      "bodybuilding",
      "perte"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "poisson",
      "oeufs"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 20,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Thon au naturel égoutté",
        "quantite": "280 g"
      },
      {
        "nom": "Pommes de terre cuites à la vapeur",
        "quantite": "400 g"
      },
      {
        "nom": "Œufs",
        "quantite": "2 (110 g)"
      },
      {
        "nom": "Haricots verts cuits",
        "quantite": "300 g"
      },
      {
        "nom": "Tomates",
        "quantite": "200 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "20 g (1 cuillère à soupe et demie)"
      },
      {
        "nom": "Persil, citron, ail, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Écrase les pommes de terre à la fourchette et mélange-les avec le thon émietté, les œufs, le persil et l'ail pour former une pâte ferme.",
      "Forme 4 galettes et fais-les dorer 4 à 5 minutes par face dans la moitié de l'huile, à feu moyen.",
      "Mélange les haricots verts et les tomates en dés avec le reste de l'huile et du jus de citron, et sers avec les galettes."
    ],
    "moment": "apres-entrainement",
    "adaptations": "Bodybuilding en sèche : retire 100 g de pommes de terre par portion. Perte : garde les quantités indiquées avec davantage de légumes.",
    "tags": [
      "economique",
      "rapide"
    ],
    "parPortion": {
      "kcal": 526,
      "p": 50,
      "c": 41,
      "f": 18,
      "fibres": 10
    }
  },
  {
    "id": "2026-10-26-socca-courgettes-tomates",
    "semaine": "2026-10-26",
    "nom": "Socca aux courgettes et tomates cerises",
    "description": "Des crêpes de farine de pois chiche dorées à la poêle, garnies de courgettes et de tomates. Sans gluten, 100 % végétales, prêtes en 25 minutes.",
    "categorie": "dejeuner",
    "profils": [
      "perte",
      "maintien"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 15,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Farine de pois chiche",
        "quantite": "120 g"
      },
      {
        "nom": "Eau",
        "quantite": "240 ml"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "20 g (1 cuillère à soupe et 1 cuillère à café)"
      },
      {
        "nom": "Courgettes",
        "quantite": "300 g"
      },
      {
        "nom": "Tomates cerises",
        "quantite": "200 g"
      },
      {
        "nom": "Oignon",
        "quantite": "80 g"
      },
      {
        "nom": "Cumin, persil, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Mélange la farine, l'eau, une pincée de sel et de cumin, puis laisse reposer 10 minutes.",
      "Fais revenir l'oignon et les courgettes en rondelles 6 minutes dans la moitié de l'huile, ajoute les tomates coupées en deux 2 minutes et réserve.",
      "Fais cuire 4 socca à la poêle huilée, 2 minutes par face, et garnis-les des légumes et du persil."
    ],
    "parPortion": {
      "kcal": 350,
      "p": 16,
      "c": 40,
      "f": 14,
      "fibres": 10
    },
    "moment": "quotidien",
    "adaptations": "Perte : garde 2 socca par portion avec une salade verte. Maintien : ajoute 100 g de pois chiches rincés par portion.",
    "tags": [
      "rapide",
      "economique",
      "vegetal",
      "sans-gluten"
    ]
  },
  {
    "id": "2026-10-26-riz-saute-oeufs-petits-pois",
    "semaine": "2026-10-26",
    "nom": "Riz sauté aux œufs, petits pois et carottes",
    "description": "Un riz sauté façon cantonais avec des œufs brouillés, des petits pois et des carottes. Un plat d'énergie prêt en 20 minutes, idéal avec du riz de la veille.",
    "categorie": "diner",
    "profils": [
      "remise-en-forme",
      "hyrox"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "oeufs",
      "soja",
      "gluten"
    ],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 10,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Riz basmati cuit (de la veille)",
        "quantite": "400 g"
      },
      {
        "nom": "Œufs",
        "quantite": "4 (220 g)"
      },
      {
        "nom": "Petits pois surgelés",
        "quantite": "150 g"
      },
      {
        "nom": "Carottes",
        "quantite": "150 g"
      },
      {
        "nom": "Oignon",
        "quantite": "60 g"
      },
      {
        "nom": "Sauce soja",
        "quantite": "30 g (2 cuillères à soupe)"
      },
      {
        "nom": "Huile de colza",
        "quantite": "15 g (1 cuillère à soupe)"
      },
      {
        "nom": "Gingembre, ail",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Coupe les carottes en petits dés et fais-les sauter 4 minutes avec l'oignon émincé dans l'huile.",
      "Ajoute les petits pois et le riz froid, puis fais sauter 4 minutes à feu vif en séparant les grains.",
      "Pousse le riz sur le côté, brouille les œufs 2 minutes dans la poêle, mélange le tout avec la sauce soja, le gingembre et l'ail, et sers aussitôt."
    ],
    "parPortion": {
      "kcal": 572,
      "p": 25,
      "c": 73,
      "f": 20,
      "fibres": 8
    },
    "moment": "avant-entrainement",
    "adaptations": "Hyrox : ajoute 100 g de riz cuit par portion 2 à 3 heures avant la séance. Remise en forme : garde les quantités indiquées avec des légumes en plus.",
    "tags": [
      "rapide",
      "economique",
      "meal-prep"
    ]
  },
  {
    "id": "2026-10-26-merlu-tomate-olives-pommes-de-terre",
    "semaine": "2026-10-26",
    "nom": "Merlu à la tomate et aux olives, pommes de terre vapeur",
    "description": "Des filets de merlu mijotés dans une sauce tomate aux olives noires, servis avec des pommes de terre vapeur. Léger, maigre et plein de saveurs du Sud.",
    "categorie": "diner",
    "profils": [
      "perte",
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
    "cuissonMin": 25,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Filets de merlu",
        "quantite": "360 g"
      },
      {
        "nom": "Pommes de terre",
        "quantite": "500 g"
      },
      {
        "nom": "Tomates concassées",
        "quantite": "300 g"
      },
      {
        "nom": "Olives noires dénoyautées",
        "quantite": "40 g"
      },
      {
        "nom": "Oignon",
        "quantite": "100 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "15 g (1 cuillère à soupe)"
      },
      {
        "nom": "Ail, thym, laurier, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Épluche les pommes de terre, coupe-les en gros cubes et fais-les cuire 20 minutes à la vapeur.",
      "Fais revenir l'oignon dans l'huile 3 minutes, ajoute les tomates, l'ail, le thym et le laurier, et laisse mijoter 10 minutes.",
      "Dépose le merlu dans la sauce avec les olives, couvre et cuis 8 minutes à feu doux, puis sers avec les pommes de terre."
    ],
    "parPortion": {
      "kcal": 500,
      "p": 38,
      "c": 51,
      "f": 16,
      "fibres": 8
    },
    "moment": "quotidien",
    "adaptations": "Perte : réduis les pommes de terre à 250 g par portion et ajoute des haricots verts. Maintien : garde les quantités indiquées avec un fruit en dessert.",
    "tags": [
      "economique",
      "sans-friture"
    ]
  },
  {
    "id": "2026-10-26-poulet-yassa-riz",
    "semaine": "2026-10-26",
    "nom": "Poulet yassa au citron et aux oignons, riz basmati",
    "description": "Un classique sénégalais simplifié : poulet mariné au citron et à la moutarde, oignons fondants et riz basmati. Dense en protéines et en glucides.",
    "categorie": "diner",
    "profils": [
      "prise",
      "force"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "volaille",
      "moutarde"
    ],
    "portions": 3,
    "preparationMin": 15,
    "cuissonMin": 35,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Hauts de cuisse de poulet sans peau",
        "quantite": "600 g"
      },
      {
        "nom": "Oignons",
        "quantite": "400 g"
      },
      {
        "nom": "Jus de citron",
        "quantite": "60 g (2 citrons)"
      },
      {
        "nom": "Moutarde",
        "quantite": "15 g (1 cuillère à soupe)"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "30 g (2 cuillères à soupe)"
      },
      {
        "nom": "Riz basmati cuit",
        "quantite": "600 g"
      },
      {
        "nom": "Olives vertes dénoyautées",
        "quantite": "30 g"
      },
      {
        "nom": "Sel, poivre, piment",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Mélange le citron, la moutarde, le sel et le poivre, et laisse mariner le poulet 20 minutes avec la moitié des oignons émincés.",
      "Fais dorer le poulet égoutté 5 minutes par face dans l'huile, puis réserve-le.",
      "Fais revenir le reste des oignons 8 minutes, remets le poulet avec la marinade et les olives, couvre et laisse mijoter 20 minutes, puis sers avec le riz."
    ],
    "parPortion": {
      "kcal": 677,
      "p": 46,
      "c": 67,
      "f": 25,
      "fibres": 4
    },
    "moment": "apres-entrainement",
    "adaptations": "Prise de masse : ajoute 100 g de riz cuit et un filet d'huile par portion. Force : garde les quantités indiquées les jours de grosse séance.",
    "tags": [
      "meal-prep",
      "familial",
      "repas-d-effort"
    ]
  },
  {
    "id": "2026-10-26-penne-complets-haricots-blancs-courgettes",
    "semaine": "2026-10-26",
    "nom": "Penne complètes, haricots blancs et courgettes",
    "description": "Un plat de pâtes végétal et digeste : haricots blancs, courgettes et sauce tomate au basilic. Des glucides lents pour la veille d'une sortie longue.",
    "categorie": "diner",
    "profils": [
      "marathon",
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
    "portions": 4,
    "preparationMin": 15,
    "cuissonMin": 20,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Penne complètes cuites",
        "quantite": "700 g"
      },
      {
        "nom": "Haricots blancs cuits (conserve rincée)",
        "quantite": "400 g"
      },
      {
        "nom": "Courgettes",
        "quantite": "300 g"
      },
      {
        "nom": "Tomates concassées",
        "quantite": "400 g"
      },
      {
        "nom": "Oignon",
        "quantite": "100 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "30 g (2 cuillères à soupe)"
      },
      {
        "nom": "Ail, basilic, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais revenir l'oignon et les courgettes en petits dés 6 minutes dans l'huile.",
      "Ajoute l'ail, les tomates et les haricots blancs, puis laisse mijoter 10 minutes.",
      "Mélange avec les penne chaudes, parsème de basilic et sers."
    ],
    "parPortion": {
      "kcal": 443,
      "p": 18,
      "c": 68,
      "f": 11,
      "fibres": 16
    },
    "moment": "veille-de-course",
    "adaptations": "Veille de sortie longue : ajoute 100 g de penne cuites par portion. Ironman : ajoute une cuillère d'huile d'olive par portion.",
    "tags": [
      "meal-prep",
      "economique",
      "repas-d-effort"
    ]
  },
  {
    "id": "2026-10-26-bolognaise-lentilles-soja-texture",
    "semaine": "2026-10-26",
    "nom": "Bolognaise de lentilles et soja texturé, spaghetti complets",
    "description": "Une bolognaise 100 % végétale très riche en protéines : lentilles vertes, soja texturé et sauce tomate, servie sur des spaghetti complets.",
    "categorie": "diner",
    "profils": [
      "bodybuilding",
      "force"
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
    "portions": 3,
    "preparationMin": 15,
    "cuissonMin": 25,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Soja texturé sec",
        "quantite": "120 g"
      },
      {
        "nom": "Lentilles vertes cuites",
        "quantite": "240 g"
      },
      {
        "nom": "Tomates concassées",
        "quantite": "500 g"
      },
      {
        "nom": "Carottes",
        "quantite": "150 g"
      },
      {
        "nom": "Oignon",
        "quantite": "100 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "15 g (1 cuillère à soupe)"
      },
      {
        "nom": "Spaghetti complets cuits",
        "quantite": "600 g"
      },
      {
        "nom": "Ail, origan, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Réhydrate le soja texturé 10 minutes dans de l'eau chaude, puis égoutte-le en le pressant.",
      "Fais revenir l'oignon et la carotte râpée dans l'huile 5 minutes, ajoute le soja, les lentilles, les tomates et les herbes, et laisse mijoter 15 minutes.",
      "Sers la sauce sur les spaghetti chauds."
    ],
    "parPortion": {
      "kcal": 601,
      "p": 40,
      "c": 90,
      "f": 9,
      "fibres": 24
    },
    "moment": "apres-entrainement",
    "adaptations": "Bodybuilding : garde les quantités en sèche, ajoute 100 g de spaghetti en prise de masse. Force : ajoute une cuillère d'huile d'olive par portion.",
    "tags": [
      "meal-prep",
      "economique",
      "vegetal"
    ]
  },
  {
    "id": "2026-10-26-burger-dinde-pommes-de-terre-rotie",
    "semaine": "2026-10-26",
    "nom": "Burger de dinde maison et pommes de terre rôties",
    "description": "Un burger maison de dinde hachée dans un pain complet, avec sauce au yaourt et pommes de terre rôties au four. Protéines et glucides pour les séances intenses.",
    "categorie": "diner",
    "profils": [
      "hyrox",
      "bodybuilding"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "volaille",
      "gluten",
      "lactose"
    ],
    "portions": 2,
    "preparationMin": 20,
    "cuissonMin": 30,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Haché de dinde",
        "quantite": "360 g"
      },
      {
        "nom": "Pains à burger complets",
        "quantite": "2 (120 g)"
      },
      {
        "nom": "Pommes de terre",
        "quantite": "300 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "20 g (4 cuillères à café)"
      },
      {
        "nom": "Tomate",
        "quantite": "120 g"
      },
      {
        "nom": "Salade verte",
        "quantite": "60 g"
      },
      {
        "nom": "Yaourt nature",
        "quantite": "100 g"
      },
      {
        "nom": "Paprika, ail en poudre, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 220 °C. Coupe les pommes de terre en quartiers, mélange-les avec la moitié de l'huile et enfourne 30 minutes.",
      "Mélange la dinde avec le paprika, l'ail et le sel, forme 2 steaks et fais-les cuire 5 minutes par face dans le reste d'huile.",
      "Mélange le yaourt avec du sel et du poivre, puis monte les burgers avec la salade, la tomate, le steak et la sauce, et sers avec les pommes de terre."
    ],
    "parPortion": {
      "kcal": 600,
      "p": 49,
      "c": 56,
      "f": 20,
      "fibres": 7
    },
    "moment": "apres-entrainement",
    "adaptations": "Hyrox : ajoute 100 g de pommes de terre par portion après une séance longue. Bodybuilding : passe à 200 g de dinde par steak en prise de masse.",
    "tags": [
      "repas-d-effort",
      "familial"
    ]
  },
  {
    "id": "2026-10-26-brownie-haricots-rouges-chocolat",
    "semaine": "2026-10-26",
    "nom": "Brownie moelleux aux haricots rouges et chocolat",
    "description": "Un brownie vegan sans farine : haricots rouges, dattes, cacao, avoine et beurre de cacahuète. Dense en glucides, parfait en collation de récupération.",
    "categorie": "dessert",
    "profils": [
      "ironman",
      "prise"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "arachides"
    ],
    "portions": 6,
    "preparationMin": 15,
    "cuissonMin": 25,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Haricots rouges cuits (conserve rincée)",
        "quantite": "240 g"
      },
      {
        "nom": "Dattes dénoyautées",
        "quantite": "100 g"
      },
      {
        "nom": "Cacao en poudre non sucré",
        "quantite": "30 g"
      },
      {
        "nom": "Flocons d'avoine",
        "quantite": "50 g"
      },
      {
        "nom": "Beurre de cacahuète",
        "quantite": "40 g"
      },
      {
        "nom": "Chocolat noir 70 %",
        "quantite": "40 g"
      },
      {
        "nom": "Levure chimique",
        "quantite": "1 cuillère à café"
      }
    ],
    "etapes": [
      "Préchauffe le four à 180 °C. Mixe les haricots rouges avec les dattes, le beurre de cacahuète et 4 cuillères à soupe d'eau jusqu'à obtenir une pâte lisse.",
      "Ajoute le cacao, l'avoine, la levure et le chocolat en morceaux, et mélange.",
      "Verse dans un moule tapissé de papier cuisson, enfourne 25 minutes, laisse refroidir et coupe en 6 parts."
    ],
    "parPortion": {
      "kcal": 200,
      "p": 7,
      "c": 25,
      "f": 8,
      "fibres": 7
    },
    "moment": "recuperation",
    "adaptations": "Ironman : mange 2 parts après une longue sortie. Prise de masse : accompagne d'un verre de lait de soja.",
    "tags": [
      "meal-prep",
      "economique"
    ]
  },
  {
    "id": "2026-10-26-tartines-saumon-fume-fromage-blanc",
    "semaine": "2026-10-26",
    "nom": "Tartines au saumon fumé, fromage blanc et concombre",
    "description": "Des tartines de pain complet au fromage blanc, saumon fumé et concombre. Une collation salée riche en protéines, sans cuisson, prête en 5 minutes.",
    "categorie": "collation",
    "profils": [
      "force",
      "remise-en-forme"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "poisson",
      "gluten",
      "lactose"
    ],
    "portions": 2,
    "preparationMin": 5,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Pain complet",
        "quantite": "160 g (4 tranches)"
      },
      {
        "nom": "Fromage blanc 0 %",
        "quantite": "200 g"
      },
      {
        "nom": "Saumon fumé",
        "quantite": "100 g"
      },
      {
        "nom": "Concombre",
        "quantite": "150 g"
      },
      {
        "nom": "Citron, ciboulette, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Mélange le fromage blanc avec la ciboulette, le jus de citron et le poivre, puis tartine-le sur les tranches de pain.",
      "Dépose le saumon fumé et le concombre en rondelles sur le dessus et sers aussitôt."
    ],
    "parPortion": {
      "kcal": 357,
      "p": 27,
      "c": 42,
      "f": 9,
      "fibres": 6
    },
    "moment": "apres-entrainement",
    "adaptations": "Force : ajoute 2 œufs durs par portion. Remise en forme : garde les quantités indiquées avec une crudité.",
    "tags": [
      "rapide",
      "sans-cuisson"
    ]
  },
  {
    "id": "2026-10-26-couscous-legumes-pois-chiches",
    "semaine": "2026-10-26",
    "nom": "Couscous de légumes et pois chiches",
    "description": "Un couscous végétal familial : semoule, carottes, courgettes, navets, pois chiches et raisins secs. Des glucides à digestion facile pour les sports d'endurance.",
    "categorie": "diner",
    "profils": [
      "marathon",
      "hyrox",
      "maintien"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten"
    ],
    "portions": 4,
    "preparationMin": 20,
    "cuissonMin": 30,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Semoule moyenne (crue)",
        "quantite": "240 g"
      },
      {
        "nom": "Pois chiches cuits (conserve rincée)",
        "quantite": "480 g"
      },
      {
        "nom": "Carottes",
        "quantite": "300 g"
      },
      {
        "nom": "Courgettes",
        "quantite": "300 g"
      },
      {
        "nom": "Navets",
        "quantite": "200 g"
      },
      {
        "nom": "Oignon",
        "quantite": "100 g"
      },
      {
        "nom": "Raisins secs",
        "quantite": "40 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "30 g (2 cuillères à soupe)"
      },
      {
        "nom": "Ras-el-hanout, cannelle, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais revenir l'oignon dans l'huile avec les épices, ajoute les carottes et les navets en morceaux, couvre d'eau à hauteur et cuis 15 minutes.",
      "Ajoute les courgettes, les pois chiches et les raisins secs, puis poursuis 10 minutes.",
      "Verse la semoule dans un saladier avec un volume d'eau bouillante égal au sien, couvre 5 minutes, égrène-la à la fourchette et sers avec les légumes et le bouillon."
    ],
    "parPortion": {
      "kcal": 508,
      "p": 19,
      "c": 81,
      "f": 12,
      "fibres": 14
    },
    "moment": "veille-de-course",
    "adaptations": "Marathon : ajoute 50 g de semoule crue par portion la veille d'une sortie longue. Hyrox : garde les quantités indiquées avant une séance.",
    "tags": [
      "familial",
      "economique",
      "meal-prep"
    ]
  },
  {
    "id": "2026-10-26-pain-perdu-complet-fromage-blanc",
    "semaine": "2026-10-26",
    "nom": "Pain perdu complet au four et fromage blanc",
    "description": "Un pain perdu complet cuit au four, avec banane et fromage blanc. Un petit-déjeuner protéiné et calorique pour les semaines de prise.",
    "categorie": "petit-dejeuner",
    "profils": [
      "prise",
      "force"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "oeufs",
      "lactose"
    ],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 15,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Pain complet",
        "quantite": "200 g (6 tranches)"
      },
      {
        "nom": "Œufs",
        "quantite": "3 (165 g)"
      },
      {
        "nom": "Lait demi-écrémé",
        "quantite": "250 ml"
      },
      {
        "nom": "Fromage blanc 0 %",
        "quantite": "200 g"
      },
      {
        "nom": "Banane",
        "quantite": "150 g (1)"
      },
      {
        "nom": "Huile de colza",
        "quantite": "10 g (1 cuillère à café)"
      },
      {
        "nom": "Cannelle",
        "quantite": "1 cuillère à café"
      }
    ],
    "etapes": [
      "Préchauffe le four à 200 °C. Bats les œufs avec le lait et la cannelle.",
      "Trempe les tranches de pain 30 secondes de chaque côté, dépose-les sur une plaque huilée et enfourne 15 minutes en les retournant à mi-cuisson.",
      "Sers avec le fromage blanc et la banane en rondelles."
    ],
    "parPortion": {
      "kcal": 583,
      "p": 32,
      "c": 71,
      "f": 19,
      "fibres": 8
    },
    "moment": "quotidien",
    "adaptations": "Prise de masse : ajoute une cuillère de beurre de cacahuète et une seconde banane par portion. Force : garde les quantités indiquées avec un fruit.",
    "tags": [
      "economique",
      "familial"
    ]
  },
  {
    "id": "2026-10-26-salade-lentilles-oeuf-mollet-radis",
    "semaine": "2026-10-26",
    "nom": "Salade de lentilles, œufs mollets et radis",
    "description": "Une salade complète de lentilles vertes, œufs mollets, radis et tomates, avec une vinaigrette moutarde. Rassasiante, riche en fibres et en protéines.",
    "categorie": "dejeuner",
    "profils": [
      "perte",
      "remise-en-forme"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "oeufs",
      "moutarde"
    ],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 6,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Lentilles vertes cuites",
        "quantite": "400 g"
      },
      {
        "nom": "Œufs",
        "quantite": "4 (220 g)"
      },
      {
        "nom": "Radis",
        "quantite": "100 g"
      },
      {
        "nom": "Tomates",
        "quantite": "150 g"
      },
      {
        "nom": "Oignon rouge",
        "quantite": "40 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "20 g (1 cuillère à soupe et 1 cuillère à café)"
      },
      {
        "nom": "Moutarde, vinaigre, persil, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Plonge les œufs 6 minutes dans l'eau bouillante, refroidis-les sous l'eau froide et écale-les.",
      "Mélange la moutarde, le vinaigre et l'huile, puis ajoute les lentilles, les radis en rondelles, les tomates en dés et l'oignon émincé.",
      "Dépose les œufs coupés en deux sur la salade et parsème de persil."
    ],
    "parPortion": {
      "kcal": 494,
      "p": 32,
      "c": 42,
      "f": 22,
      "fibres": 16
    },
    "moment": "quotidien",
    "adaptations": "Perte : garde les quantités indiquées avec une salade verte. Remise en forme : ajoute une tranche de pain complet par portion.",
    "tags": [
      "rapide",
      "economique",
      "meal-prep"
    ]
  },
  {
    "id": "2026-10-12-overnight-chia-soja-framboises",
    "semaine": "2026-10-12",
    "nom": "Overnight chia, avoine, lait de soja et framboises",
    "description": "Un petit-déjeuner froid préparé la veille : chia, avoine, lait de soja et framboises. Zéro cuisson, riche en fibres, 100 % végétal.",
    "categorie": "petit-dejeuner",
    "profils": [
      "remise-en-forme",
      "maintien"
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
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Graines de chia",
        "quantite": "40 g (4 cuillères à soupe)"
      },
      {
        "nom": "Flocons d'avoine",
        "quantite": "40 g"
      },
      {
        "nom": "Lait de soja nature",
        "quantite": "300 ml"
      },
      {
        "nom": "Framboises (fraîches ou surgelées)",
        "quantite": "150 g"
      },
      {
        "nom": "Graines de courge",
        "quantite": "20 g"
      },
      {
        "nom": "Cannelle",
        "quantite": "1 pincée"
      }
    ],
    "etapes": [
      "Mélange le chia, l'avoine, le lait de soja et la cannelle dans un bocal ou un bol.",
      "Ferme et place au frais toute la nuit, au minimum 4 heures.",
      "Le matin, remue, répartis dans deux bols et ajoute les framboises et les graines de courge."
    ],
    "parPortion": {
      "kcal": 271,
      "p": 15,
      "c": 19,
      "f": 15,
      "fibres": 15
    },
    "moment": "quotidien",
    "adaptations": "Remise en forme : garde les quantités indiquées. Maintien : ajoute une banane en rondelles par portion.",
    "tags": [
      "sans-cuisson",
      "rapide",
      "economique",
      "vegetal"
    ]
  },
  {
    "id": "2026-10-12-boulettes-pois-chiches-spaghetti-complets",
    "semaine": "2026-10-12",
    "nom": "Boulettes de pois chiches, sauce tomate et spaghetti complets",
    "description": "Des boulettes végétales dorées au four, nappées de sauce tomate, avec des spaghetti complets. Un plat de glucides pour recharger avant une grosse sortie.",
    "categorie": "diner",
    "profils": [
      "marathon",
      "ironman",
      "prise"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten"
    ],
    "portions": 4,
    "preparationMin": 20,
    "cuissonMin": 25,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Pois chiches cuits (conserve rincée)",
        "quantite": "480 g"
      },
      {
        "nom": "Flocons d'avoine",
        "quantite": "60 g"
      },
      {
        "nom": "Oignon",
        "quantite": "100 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "2 cuillères à soupe (20 g)"
      },
      {
        "nom": "Tomates concassées",
        "quantite": "600 g"
      },
      {
        "nom": "Spaghetti complets cuits",
        "quantite": "600 g"
      },
      {
        "nom": "Ail, cumin, persil, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 200 °C. Mixe grossièrement les pois chiches avec l'avoine, la moitié de l'oignon, l'ail, le cumin et le sel.",
      "Forme 16 boulettes, dépose-les sur une plaque et enfourne 20 minutes en les retournant à mi-cuisson.",
      "Pendant ce temps, fais revenir le reste d'oignon dans l'huile, ajoute les tomates et laisse mijoter 15 minutes.",
      "Sers les boulettes sur les spaghetti cuits, nappés de sauce."
    ],
    "parPortion": {
      "kcal": 471,
      "p": 21,
      "c": 72,
      "f": 11,
      "fibres": 18
    },
    "moment": "veille-de-course",
    "adaptations": "Veille de sortie longue : ajoute 100 g de spaghetti cuits par portion. Prise de masse : ajoute un filet d'huile d'olive et 100 g de pâtes par portion.",
    "tags": [
      "meal-prep",
      "economique",
      "familial"
    ]
  },
  {
    "id": "2026-10-12-bol-edamame-avocat-riz",
    "semaine": "2026-10-12",
    "nom": "Bol d'edamame, avocat, carottes et riz basmati",
    "description": "Un bol vegan façon poke : edamame, avocat, carotte et chou rouge croquants sur du riz basmati, assaisonné soja-citron. Prêt en 15 minutes.",
    "categorie": "dejeuner",
    "profils": [
      "perte",
      "bodybuilding"
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
    "preparationMin": 15,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Edamame décortiqués (surgelés, décongelés)",
        "quantite": "200 g"
      },
      {
        "nom": "Riz basmati cuit",
        "quantite": "280 g"
      },
      {
        "nom": "Avocat",
        "quantite": "100 g (1/2)"
      },
      {
        "nom": "Carotte râpée",
        "quantite": "120 g"
      },
      {
        "nom": "Chou rouge émincé",
        "quantite": "100 g"
      },
      {
        "nom": "Sauce soja",
        "quantite": "2 cuillères à café (20 g)"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à café (10 g)"
      },
      {
        "nom": "Jus de citron",
        "quantite": "1 citron"
      }
    ],
    "etapes": [
      "Mélange la sauce soja, l'huile et le jus de citron dans un petit bol.",
      "Répartis le riz dans deux bols, puis dispose l'edamame, l'avocat en tranches, la carotte et le chou rouge.",
      "Arrose de sauce juste avant de manger."
    ],
    "parPortion": {
      "kcal": 481,
      "p": 19,
      "c": 54,
      "f": 21,
      "fibres": 12
    },
    "moment": "quotidien",
    "adaptations": "Perte : 100 g de riz cuit par portion et légumes à volonté. Bodybuilding : ajoute 50 g d'edamame et 100 g de riz en prise de masse.",
    "tags": [
      "rapide",
      "sans-cuisson",
      "meal-prep"
    ]
  },
  {
    "id": "2026-10-12-brochettes-poulet-citron-semoule",
    "semaine": "2026-10-12",
    "nom": "Brochettes de poulet citron-thym, semoule et courgettes",
    "description": "Des brochettes de poulet marinées au citron et au thym, grillées à la poêle, avec de la semoule et des courgettes. Protéines et glucides pour l'effort.",
    "categorie": "dejeuner",
    "profils": [
      "hyrox",
      "force"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "volaille",
      "gluten"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 12,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Blanc de poulet",
        "quantite": "320 g"
      },
      {
        "nom": "Semoule cuite",
        "quantite": "300 g"
      },
      {
        "nom": "Courgettes",
        "quantite": "300 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Jus de citron",
        "quantite": "1 citron"
      },
      {
        "nom": "Thym, ail, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Coupe le poulet en cubes et fais-le mariner 10 minutes avec le citron, la moitié de l'huile, le thym et l'ail.",
      "Enfile le poulet sur des piques et fais-le dorer 8 à 10 minutes à la poêle en le retournant.",
      "Fais sauter les courgettes en rondelles 5 minutes dans le reste d'huile.",
      "Sers avec la semoule chaude."
    ],
    "parPortion": {
      "kcal": 432,
      "p": 43,
      "c": 38,
      "f": 12,
      "fibres": 4
    },
    "moment": "apres-entrainement",
    "adaptations": "Hyrox : ajoute 100 g de semoule cuite par portion avant une séance longue. Force : passe à 150 g de poulet par portion.",
    "tags": [
      "rapide",
      "repas-d-effort"
    ]
  },
  {
    "id": "2026-10-12-steak-hache-patate-douce-petits-pois",
    "semaine": "2026-10-12",
    "nom": "Steak haché maison, purée de patate douce et petits pois",
    "description": "Des steaks de bœuf maigre faits maison, une purée de patate douce et des petits pois. Un repas dense en protéines, simple et économique.",
    "categorie": "diner",
    "profils": [
      "prise",
      "bodybuilding"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "viande"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 20,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Bœuf haché 5 % de matière grasse",
        "quantite": "300 g"
      },
      {
        "nom": "Patate douce",
        "quantite": "400 g"
      },
      {
        "nom": "Petits pois surgelés",
        "quantite": "200 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à café (10 g)"
      },
      {
        "nom": "Oignon, paprika, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Épluche la patate douce, coupe-la en cubes et fais-la cuire 15 minutes à l'eau, puis écrase-la en purée.",
      "Mélange le bœuf avec l'oignon haché et les épices, forme deux steaks et fais-les cuire 4 minutes par face à la poêle huilée.",
      "Fais cuire les petits pois 5 minutes à l'eau bouillante.",
      "Sers les steaks avec la purée et les petits pois."
    ],
    "parPortion": {
      "kcal": 478,
      "p": 39,
      "c": 49,
      "f": 14,
      "fibres": 12
    },
    "moment": "apres-entrainement",
    "adaptations": "Prise de masse : ajoute 100 g de purée et un filet d'huile d'olive par portion. Sèche : réduis la purée à 150 g par portion.",
    "tags": [
      "economique",
      "familial"
    ]
  },
  {
    "id": "2026-10-12-saumon-four-quinoa-brocoli",
    "semaine": "2026-10-12",
    "nom": "Saumon au four, quinoa et brocoli",
    "description": "Un pavé de saumon rôti au citron, du quinoa et du brocoli vapeur. Riche en oméga-3 et en protéines, prêt en 25 minutes avec très peu de vaisselle.",
    "categorie": "diner",
    "profils": [
      "maintien",
      "perte"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "poisson"
    ],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 15,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Pavés de saumon",
        "quantite": "300 g (2)"
      },
      {
        "nom": "Quinoa cuit",
        "quantite": "300 g"
      },
      {
        "nom": "Brocoli",
        "quantite": "300 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à café (10 g)"
      },
      {
        "nom": "Citron",
        "quantite": "1"
      },
      {
        "nom": "Aneth, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 200 °C. Dépose les pavés sur une plaque avec l'huile, le jus de citron, l'aneth, le sel et le poivre.",
      "Enfourne 12 à 15 minutes selon l'épaisseur.",
      "Fais cuire le brocoli 6 minutes à la vapeur.",
      "Sers le saumon avec le quinoa chaud et le brocoli."
    ],
    "parPortion": {
      "kcal": 526,
      "p": 41,
      "c": 32,
      "f": 26,
      "fibres": 9
    },
    "moment": "quotidien",
    "adaptations": "Perte : 150 g de quinoa cuit par portion et brocoli à volonté. Maintien : garde les quantités indiquées.",
    "tags": [
      "rapide",
      "sans-friture"
    ]
  },
  {
    "id": "2026-10-12-risotto-poulet-champignons",
    "semaine": "2026-10-12",
    "nom": "Risotto au poulet et aux champignons",
    "description": "Un risotto crémeux au poulet et aux champignons, digeste et riche en glucides. Idéal la veille d'une course ou d'une grosse sortie.",
    "categorie": "diner",
    "profils": [
      "marathon",
      "ironman"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "volaille",
      "lactose"
    ],
    "portions": 3,
    "preparationMin": 10,
    "cuissonMin": 25,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Riz rond ou arborio",
        "quantite": "210 g"
      },
      {
        "nom": "Blanc de poulet",
        "quantite": "360 g"
      },
      {
        "nom": "Champignons de Paris",
        "quantite": "300 g"
      },
      {
        "nom": "Oignon",
        "quantite": "80 g"
      },
      {
        "nom": "Parmesan râpé",
        "quantite": "45 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "2 cuillères à soupe (20 g)"
      },
      {
        "nom": "Bouillon de légumes chaud",
        "quantite": "700 ml"
      }
    ],
    "etapes": [
      "Fais dorer le poulet en dés 5 minutes dans l'huile, puis réserve-le.",
      "Fais revenir l'oignon et les champignons 4 minutes, ajoute le riz et remue 1 minute.",
      "Verse le bouillon louche par louche en remuant, pendant 18 minutes environ.",
      "Remets le poulet, ajoute le parmesan, mélange et sers aussitôt."
    ],
    "parPortion": {
      "kcal": 514,
      "p": 39,
      "c": 58,
      "f": 14,
      "fibres": 3
    },
    "moment": "veille-de-course",
    "adaptations": "Veille de course : ajoute 50 g de riz cru par portion et réduis le parmesan pour alléger la digestion. Ironman : ajoute une cuillère d'huile d'olive par portion.",
    "tags": [
      "repas-d-effort",
      "familial"
    ]
  },
  {
    "id": "2026-10-12-sandwichs-banane-miel",
    "semaine": "2026-10-12",
    "nom": "Petits sandwichs banane-miel pour l'effort",
    "description": "Des mini-sandwichs banane-miel faciles à emporter et à digérer pendant une sortie longue ou une course. Des glucides rapides, sans cuisson.",
    "categorie": "collation",
    "profils": [
      "ironman",
      "marathon",
      "hyrox"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "miel"
    ],
    "portions": 4,
    "preparationMin": 10,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Pain de mie complet",
        "quantite": "200 g (8 tranches)"
      },
      {
        "nom": "Bananes mûres",
        "quantite": "360 g (3)"
      },
      {
        "nom": "Miel",
        "quantite": "40 g (2 cuillères à soupe)"
      }
    ],
    "etapes": [
      "Écrase les bananes à la fourchette avec le miel.",
      "Étale la préparation sur quatre tranches, couvre avec les quatre autres et coupe en deux triangles.",
      "Emballe chaque portion dans du papier alu ou un sachet de congélation."
    ],
    "parPortion": {
      "kcal": 230,
      "p": 6,
      "c": 47,
      "f": 2,
      "fibres": 5
    },
    "moment": "pendant-effort",
    "adaptations": "Sortie longue : 1 sandwich par heure d'effort, avec de l'eau. Ironman : ajoute 1 sandwich par portion sur les sorties de plus de 3 heures.",
    "tags": [
      "sans-cuisson",
      "repas-d-effort",
      "rapide",
      "economique"
    ]
  },
  {
    "id": "2026-10-12-pudding-riz-pommes",
    "semaine": "2026-10-12",
    "nom": "Pudding de riz au lait et pommes",
    "description": "Un dessert de riz au lait mijoté avec des pommes et de la cannelle. Doux, économique, pour recharger les glucides après l'entraînement.",
    "categorie": "dessert",
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
    "portions": 4,
    "preparationMin": 10,
    "cuissonMin": 35,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Riz rond",
        "quantite": "160 g"
      },
      {
        "nom": "Lait demi-écrémé",
        "quantite": "800 ml"
      },
      {
        "nom": "Pommes",
        "quantite": "300 g (2)"
      },
      {
        "nom": "Sucre",
        "quantite": "40 g"
      },
      {
        "nom": "Cannelle",
        "quantite": "1 cuillère à café"
      }
    ],
    "etapes": [
      "Fais chauffer le lait avec le sucre et la cannelle, puis verse le riz.",
      "Laisse cuire 25 minutes à feu doux en remuant souvent.",
      "Ajoute les pommes en petits dés et poursuis 8 minutes.",
      "Sers tiède ou froid."
    ],
    "parPortion": {
      "kcal": 320,
      "p": 10,
      "c": 61,
      "f": 4,
      "fibres": 2
    },
    "moment": "recuperation",
    "adaptations": "Remise en forme : une portion en dessert, sans ajout de sucre. Maintien : ajoute un yaourt nature en accompagnement.",
    "tags": [
      "economique",
      "familial",
      "meal-prep"
    ]
  },
  {
    "id": "2026-10-12-bento-poulet-teriyaki-oeuf-riz",
    "semaine": "2026-10-12",
    "nom": "Bento de poulet teriyaki, œufs durs et riz",
    "description": "Un bol complet façon bento : poulet laqué soja-sucre, œufs durs, brocoli et riz. Énergie et protéines pour les séances de force.",
    "categorie": "dejeuner",
    "profils": [
      "force",
      "bodybuilding"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "volaille",
      "oeufs",
      "soja",
      "gluten"
    ],
    "portions": 2,
    "preparationMin": 15,
    "cuissonMin": 15,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Riz blanc cuit",
        "quantite": "400 g"
      },
      {
        "nom": "Blanc de poulet",
        "quantite": "300 g"
      },
      {
        "nom": "Œufs",
        "quantite": "4 (200 g)"
      },
      {
        "nom": "Brocoli",
        "quantite": "200 g"
      },
      {
        "nom": "Sauce soja",
        "quantite": "2 cuillères à soupe (30 g)"
      },
      {
        "nom": "Sucre",
        "quantite": "2 cuillères à café (10 g)"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à café (10 g)"
      },
      {
        "nom": "Gingembre, ail",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Plonge les œufs 9 minutes dans l'eau bouillante, puis refroidis-les et écale-les.",
      "Coupe le poulet en lanières et fais-le dorer 6 minutes dans l'huile.",
      "Ajoute la sauce soja, le sucre, le gingembre et l'ail, et laisse caraméliser 2 minutes.",
      "Fais cuire le brocoli 5 minutes à la vapeur.",
      "Répartis le riz, le poulet, le brocoli et les œufs coupés en deux dans deux boîtes."
    ],
    "parPortion": {
      "kcal": 647,
      "p": 55,
      "c": 64,
      "f": 19,
      "fibres": 4
    },
    "moment": "apres-entrainement",
    "adaptations": "Force : ajoute 100 g de riz cuit par portion les jours de grosse séance. Bodybuilding : garde les quantités, retire un œuf en sèche.",
    "tags": [
      "meal-prep",
      "repas-d-effort"
    ]
  },
  {
    "id": "2026-10-12-pancakes-avoine-fromage-blanc-banane",
    "semaine": "2026-10-12",
    "nom": "Pancakes d'avoine, fromage blanc et banane",
    "description": "Des pancakes moelleux à l'avoine, à la banane et au fromage blanc. Un petit-déjeuner protéiné et calorique, prêt en 15 minutes.",
    "categorie": "petit-dejeuner",
    "profils": [
      "prise",
      "force"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "oeufs",
      "lactose"
    ],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 10,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Flocons d'avoine",
        "quantite": "100 g"
      },
      {
        "nom": "Œufs",
        "quantite": "2 (110 g)"
      },
      {
        "nom": "Fromage blanc 0 %",
        "quantite": "250 g"
      },
      {
        "nom": "Banane mûre",
        "quantite": "150 g (1)"
      },
      {
        "nom": "Huile de colza",
        "quantite": "1 cuillère à café (10 g)"
      },
      {
        "nom": "Levure chimique, cannelle",
        "quantite": "1 cuillère à café"
      }
    ],
    "etapes": [
      "Mixe l'avoine, les œufs, la moitié du fromage blanc, la levure et la moitié de la banane jusqu'à obtenir une pâte lisse.",
      "Fais cuire des petites louches 2 minutes par face dans une poêle huilée.",
      "Sers avec le reste de fromage blanc et la banane en rondelles."
    ],
    "parPortion": {
      "kcal": 422,
      "p": 24,
      "c": 50,
      "f": 14,
      "fibres": 7
    },
    "moment": "quotidien",
    "adaptations": "Prise de masse : ajoute une cuillère de beurre de cacahuète par portion et une seconde banane. Force : garde les quantités et ajoute un fruit.",
    "tags": [
      "rapide",
      "economique"
    ]
  },
  {
    "id": "2026-10-12-houmous-crudites-pita",
    "semaine": "2026-10-12",
    "nom": "Houmous maison, crudités et pita",
    "description": "Un houmous crémeux fait en 10 minutes avec des pois chiches, servi avec des bâtonnets de légumes et du pain pita. Une collation végétale rassasiante.",
    "categorie": "collation",
    "profils": [
      "perte",
      "maintien"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten"
    ],
    "portions": 4,
    "preparationMin": 10,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Pois chiches cuits (conserve rincée)",
        "quantite": "400 g"
      },
      {
        "nom": "Jus de citron",
        "quantite": "2 citrons"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "3 cuillères à soupe (30 g)"
      },
      {
        "nom": "Carottes",
        "quantite": "200 g"
      },
      {
        "nom": "Concombre",
        "quantite": "200 g"
      },
      {
        "nom": "Poivron rouge",
        "quantite": "150 g"
      },
      {
        "nom": "Pain pita",
        "quantite": "120 g (2)"
      },
      {
        "nom": "Ail, cumin, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Mixe les pois chiches avec le jus de citron, l'huile, l'ail, le cumin, le sel et 4 cuillères à soupe d'eau jusqu'à obtenir une crème lisse.",
      "Coupe les carottes, le concombre et le poivron en bâtonnets, et le pita en triangles.",
      "Sers le houmous avec les crudités et le pita."
    ],
    "parPortion": {
      "kcal": 295,
      "p": 11,
      "c": 38,
      "f": 11,
      "fibres": 10
    },
    "moment": "quotidien",
    "adaptations": "Perte : 1/2 pita par portion et crudités à volonté. Maintien : 1 pita entier par portion.",
    "tags": [
      "sans-cuisson",
      "rapide",
      "economique",
      "vegetal"
    ]
  },
  {
    "id": "2026-10-19-porridge-chaud-pomme-cannelle-noix",
    "semaine": "2026-10-19",
    "nom": "Porridge chaud pomme-cannelle et noix",
    "description": "Un porridge d'avoine mijoté au lait avec des dés de pomme, de la cannelle et des noix. Chaud, rassasiant, prêt en 10 minutes.",
    "categorie": "petit-dejeuner",
    "profils": [
      "maintien",
      "remise-en-forme"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "lactose",
      "fruits-a-coque"
    ],
    "portions": 2,
    "preparationMin": 5,
    "cuissonMin": 8,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Flocons d'avoine",
        "quantite": "80 g"
      },
      {
        "nom": "Lait demi-écrémé",
        "quantite": "400 ml"
      },
      {
        "nom": "Pommes",
        "quantite": "250 g (2 pommes)"
      },
      {
        "nom": "Noix",
        "quantite": "30 g"
      },
      {
        "nom": "Cannelle",
        "quantite": "1 cuillère à café"
      }
    ],
    "etapes": [
      "Coupe les pommes en petits dés. Verse l'avoine, le lait et la cannelle dans une casserole.",
      "Fais chauffer 6 à 8 minutes à feu doux en remuant, jusqu'à ce que le porridge épaississe.",
      "Ajoute les pommes les 3 dernières minutes, puis répartis dans deux bols et parsème de noix concassées."
    ],
    "parPortion": {
      "kcal": 400,
      "p": 15,
      "c": 49,
      "f": 16,
      "fibres": 8
    },
    "moment": "quotidien",
    "adaptations": "Remise en forme : garde les quantités indiquées. Maintien : ajoute une banane en rondelles par portion si tu as faim avant midi.",
    "tags": [
      "rapide",
      "economique"
    ]
  },
  {
    "id": "2026-10-19-wraps-falafel-houmous-crudites",
    "semaine": "2026-10-19",
    "nom": "Wraps falafel au four, houmous et crudités",
    "description": "Des falafels de pois chiches dorés au four, roulés dans une tortilla avec houmous, concombre et tomate. Végétal, riche en protéines et en glucides.",
    "categorie": "dejeuner",
    "profils": [
      "hyrox",
      "prise"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "sesame"
    ],
    "portions": 2,
    "preparationMin": 20,
    "cuissonMin": 20,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Pois chiches cuits (conserve rincée)",
        "quantite": "240 g"
      },
      {
        "nom": "Farine de pois chiche",
        "quantite": "30 g"
      },
      {
        "nom": "Oignon",
        "quantite": "60 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Tortillas de blé",
        "quantite": "4 grandes (200 g)"
      },
      {
        "nom": "Houmous",
        "quantite": "100 g"
      },
      {
        "nom": "Concombre",
        "quantite": "120 g"
      },
      {
        "nom": "Tomate",
        "quantite": "120 g"
      },
      {
        "nom": "Cumin, persil, ail, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 200 °C. Mixe grossièrement les pois chiches avec l'oignon, la farine, le cumin, le persil, l'ail et le sel.",
      "Forme 12 petites boulettes aplaties, dépose-les sur une plaque huilée et enfourne 20 minutes en les retournant à mi-cuisson.",
      "Tartine les tortillas de houmous, ajoute les falafels, le concombre et la tomate en dés, puis roule serré."
    ],
    "parPortion": {
      "kcal": 686,
      "p": 27,
      "c": 86,
      "f": 26,
      "fibres": 16
    },
    "moment": "avant-entrainement",
    "adaptations": "Hyrox : ajoute une cuillère de houmous par wrap et mange-le 2 à 3 heures avant la séance. Prise de masse : passe à 3 wraps par portion.",
    "tags": [
      "meal-prep",
      "economique"
    ]
  },
  {
    "id": "2026-10-19-veloute-potiron-pois-chiches-rotis",
    "semaine": "2026-10-19",
    "nom": "Velouté de potiron et pois chiches rôtis",
    "description": "Un velouté de potiron au lait de coco, relevé au curry et garni de pois chiches croustillants. Léger, chaud et rassasiant.",
    "categorie": "diner",
    "profils": [
      "perte",
      "remise-en-forme"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [],
    "portions": 3,
    "preparationMin": 15,
    "cuissonMin": 30,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Potiron (ou butternut)",
        "quantite": "700 g"
      },
      {
        "nom": "Oignon",
        "quantite": "100 g"
      },
      {
        "nom": "Pois chiches cuits (conserve rincée)",
        "quantite": "240 g"
      },
      {
        "nom": "Lait de coco",
        "quantite": "150 ml"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Bouillon de légumes",
        "quantite": "500 ml"
      },
      {
        "nom": "Curry, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 200 °C. Sèche les pois chiches, mélange-les avec la moitié de l'huile et un peu de curry, et fais-les rôtir 20 minutes sur une plaque.",
      "Fais revenir l'oignon dans le reste d'huile, ajoute le potiron en cubes et le bouillon, et laisse cuire 20 minutes.",
      "Mixe avec le lait de coco jusqu'à obtenir une texture lisse, rectifie l'assaisonnement et sers avec les pois chiches croustillants."
    ],
    "parPortion": {
      "kcal": 278,
      "p": 10,
      "c": 28,
      "f": 14,
      "fibres": 8
    },
    "moment": "quotidien",
    "adaptations": "Perte : sers avec une grande salade verte. Remise en forme : ajoute une tranche de pain complet par portion.",
    "tags": [
      "economique",
      "meal-prep",
      "familial"
    ]
  },
  {
    "id": "2026-10-19-nouilles-riz-sautees-tofu-legumes",
    "semaine": "2026-10-19",
    "nom": "Nouilles de riz sautées au tofu et légumes",
    "description": "Des nouilles de riz sautées avec du tofu doré, du brocoli, du poivron et de la carotte, parfumées à la sauce soja et au gingembre.",
    "categorie": "diner",
    "profils": [
      "bodybuilding",
      "perte"
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
    "preparationMin": 15,
    "cuissonMin": 15,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Tofu ferme",
        "quantite": "250 g"
      },
      {
        "nom": "Nouilles de riz (sèches)",
        "quantite": "100 g"
      },
      {
        "nom": "Brocoli",
        "quantite": "200 g"
      },
      {
        "nom": "Poivron rouge",
        "quantite": "100 g"
      },
      {
        "nom": "Carotte",
        "quantite": "100 g"
      },
      {
        "nom": "Sauce soja",
        "quantite": "3 cuillères à soupe (45 g)"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Gingembre, ail",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais tremper les nouilles dans l'eau très chaude selon le paquet, puis égoutte-les. Coupe le tofu en cubes et sèche-le dans un torchon.",
      "Fais dorer le tofu 6 minutes dans l'huile, réserve-le, puis fais sauter le brocoli, le poivron et la carotte 6 minutes avec le gingembre et l'ail.",
      "Ajoute les nouilles, le tofu et la sauce soja, mélange 2 minutes à feu vif et sers aussitôt."
    ],
    "parPortion": {
      "kcal": 465,
      "p": 25,
      "c": 53,
      "f": 17,
      "fibres": 7
    },
    "moment": "apres-entrainement",
    "adaptations": "Perte : réduis les nouilles à 70 g secs et double les légumes. Bodybuilding : ajoute 100 g de tofu en prise de masse.",
    "tags": [
      "rapide",
      "vegetal"
    ]
  },
  {
    "id": "2026-10-19-hachis-parmentier-dinde",
    "semaine": "2026-10-19",
    "nom": "Hachis parmentier de dinde",
    "description": "Un parmentier allégé : dinde hachée aux oignons et aux carottes sous une purée au lait gratinée. Dense en protéines, parfait en meal-prep.",
    "categorie": "diner",
    "profils": [
      "force",
      "prise"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "volaille",
      "lactose"
    ],
    "portions": 4,
    "preparationMin": 25,
    "cuissonMin": 35,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Haché de dinde",
        "quantite": "500 g"
      },
      {
        "nom": "Pommes de terre",
        "quantite": "800 g"
      },
      {
        "nom": "Lait demi-écrémé",
        "quantite": "150 ml"
      },
      {
        "nom": "Oignon",
        "quantite": "120 g"
      },
      {
        "nom": "Carottes",
        "quantite": "150 g"
      },
      {
        "nom": "Tomates concassées",
        "quantite": "200 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Emmental râpé",
        "quantite": "40 g"
      }
    ],
    "etapes": [
      "Fais cuire les pommes de terre épluchées 20 minutes à l'eau, écrase-les avec le lait et un peu de sel pour obtenir une purée.",
      "Pendant ce temps, fais revenir l'oignon et la carotte râpée dans l'huile, ajoute la dinde et fais cuire 8 minutes, puis les tomates et laisse mijoter 5 minutes.",
      "Préchauffe le four à 200 °C. Étale la viande dans un plat, recouvre de purée, parsème d'emmental et enfourne 15 minutes."
    ],
    "parPortion": {
      "kcal": 434,
      "p": 34,
      "c": 43,
      "f": 14,
      "fibres": 6
    },
    "moment": "apres-entrainement",
    "adaptations": "Force : ajoute 100 g de purée par portion les jours de grosse séance. Prise de masse : ajoute 100 g de dinde hachée et un filet d'huile d'olive.",
    "tags": [
      "meal-prep",
      "familial",
      "economique"
    ]
  },
  {
    "id": "2026-10-19-truite-four-grenailles-haricots-verts",
    "semaine": "2026-10-19",
    "nom": "Truite au four, pommes de terre grenaille et haricots verts",
    "description": "Des filets de truite rôtis au citron et à l'aneth, avec des pommes de terre grenaille et des haricots verts. Oméga-3 et glucides, un seul plat au four.",
    "categorie": "diner",
    "profils": [
      "marathon",
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
    "cuissonMin": 25,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Filets de truite",
        "quantite": "280 g (2 filets)"
      },
      {
        "nom": "Pommes de terre grenaille",
        "quantite": "450 g"
      },
      {
        "nom": "Haricots verts cuits",
        "quantite": "250 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Citron, aneth, sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 200 °C. Coupe les pommes de terre en deux, mélange-les avec la moitié de l'huile et enfourne 15 minutes.",
      "Dépose les filets de truite sur la plaque avec le reste d'huile, le jus de citron et l'aneth, puis poursuis 10 minutes.",
      "Réchauffe les haricots verts à la poêle ou au micro-ondes et sers le tout."
    ],
    "parPortion": {
      "kcal": 443,
      "p": 34,
      "c": 43,
      "f": 15,
      "fibres": 8
    },
    "moment": "veille-de-course",
    "adaptations": "Veille de sortie longue : ajoute 100 g de pommes de terre par portion. Maintien : garde les quantités indiquées.",
    "tags": [
      "rapide",
      "sans-friture"
    ]
  },
  {
    "id": "2026-10-19-galettes-sarrasin-oeuf-champignons-emmental",
    "semaine": "2026-10-19",
    "nom": "Galettes de sarrasin, œuf, champignons et emmental",
    "description": "Des galettes de sarrasin maison garnies d'un œuf, de champignons poêlés et d'emmental. Un repas du soir complet, prêt en 25 minutes.",
    "categorie": "diner",
    "profils": [
      "maintien",
      "remise-en-forme"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "oeufs",
      "lactose"
    ],
    "portions": 2,
    "preparationMin": 10,
    "cuissonMin": 20,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Farine de sarrasin",
        "quantite": "100 g"
      },
      {
        "nom": "Eau",
        "quantite": "200 ml"
      },
      {
        "nom": "Œufs",
        "quantite": "2 (110 g)"
      },
      {
        "nom": "Champignons de Paris",
        "quantite": "200 g"
      },
      {
        "nom": "Emmental râpé",
        "quantite": "40 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Mélange la farine, l'eau et une pincée de sel pour obtenir une pâte fluide, puis laisse reposer 10 minutes.",
      "Fais cuire 4 galettes dans une poêle huilée, 2 minutes par face. Fais dorer les champignons émincés dans une autre poêle 6 minutes.",
      "Garnis chaque galette de champignons et d'emmental, casse un œuf au centre sur deux d'entre elles, replie les bords et laisse cuire 3 minutes."
    ],
    "parPortion": {
      "kcal": 421,
      "p": 21,
      "c": 37,
      "f": 21,
      "fibres": 5
    },
    "moment": "quotidien",
    "adaptations": "Remise en forme : garde 2 galettes par portion avec une salade verte. Maintien : ajoute un fruit en dessert.",
    "tags": [
      "rapide",
      "economique"
    ]
  },
  {
    "id": "2026-10-19-barres-avoine-dattes-cacahuete",
    "semaine": "2026-10-19",
    "nom": "Barres d'avoine, dattes et cacahuète",
    "description": "Des barres maison sans cuisson : avoine, dattes mixées et beurre de cacahuète. Faciles à emporter pour les sorties longues et les séances d'endurance.",
    "categorie": "collation",
    "profils": [
      "marathon",
      "ironman",
      "hyrox"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "gluten",
      "arachides"
    ],
    "portions": 6,
    "preparationMin": 15,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Flocons d'avoine",
        "quantite": "150 g"
      },
      {
        "nom": "Dattes dénoyautées",
        "quantite": "180 g"
      },
      {
        "nom": "Beurre de cacahuète",
        "quantite": "60 g"
      },
      {
        "nom": "Raisins secs",
        "quantite": "40 g"
      },
      {
        "nom": "Eau",
        "quantite": "2 cuillères à soupe"
      }
    ],
    "etapes": [
      "Mixe les dattes avec le beurre de cacahuète et l'eau jusqu'à obtenir une pâte collante.",
      "Mélange cette pâte avec l'avoine et les raisins secs dans un saladier, puis tasse le tout dans un moule tapissé de papier cuisson.",
      "Place 1 heure au frais, puis coupe en 6 barres. Emballe-les une à une."
    ],
    "parPortion": {
      "kcal": 251,
      "p": 7,
      "c": 40,
      "f": 7,
      "fibres": 6
    },
    "moment": "pendant-effort",
    "adaptations": "Sortie longue : 1 barre par heure d'effort au-delà de la première heure, avec de l'eau. Hyrox : 1 barre 45 minutes avant la séance.",
    "tags": [
      "sans-cuisson",
      "meal-prep",
      "repas-d-effort"
    ]
  },
  {
    "id": "2026-10-19-paella-poulet-crevettes",
    "semaine": "2026-10-19",
    "nom": "Paella au poulet et aux crevettes",
    "description": "Une paella sans chorizo : riz safrané, poulet, crevettes, petits pois et poivron. Un plat d'énergie pour les semaines de grosse charge d'endurance.",
    "categorie": "diner",
    "profils": [
      "ironman",
      "marathon"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "volaille",
      "crustaces"
    ],
    "portions": 4,
    "preparationMin": 15,
    "cuissonMin": 30,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Riz rond (sec)",
        "quantite": "280 g"
      },
      {
        "nom": "Blanc de poulet",
        "quantite": "360 g"
      },
      {
        "nom": "Crevettes décortiquées cuites",
        "quantite": "240 g"
      },
      {
        "nom": "Petits pois surgelés",
        "quantite": "150 g"
      },
      {
        "nom": "Poivron rouge",
        "quantite": "150 g"
      },
      {
        "nom": "Oignon",
        "quantite": "100 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "2 cuillères à soupe (30 g)"
      },
      {
        "nom": "Bouillon de volaille chaud",
        "quantite": "700 ml"
      },
      {
        "nom": "Safran ou paprika, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Fais dorer le poulet en dés dans l'huile 5 minutes dans une grande poêle, puis réserve-le.",
      "Fais revenir l'oignon et le poivron 4 minutes, ajoute le riz et le safran, remue 1 minute puis verse le bouillon chaud.",
      "Laisse cuire 15 minutes sans remuer, ajoute le poulet et les petits pois, poursuis 8 minutes puis dépose les crevettes sur le dessus 2 minutes avant la fin."
    ],
    "parPortion": {
      "kcal": 507,
      "p": 40,
      "c": 62,
      "f": 11,
      "fibres": 4
    },
    "moment": "veille-de-course",
    "adaptations": "Ironman : ajoute 50 g de riz sec par portion et un filet d'huile d'olive. Marathon, veille de sortie longue : garde les quantités et évite le poivron si ta digestion est sensible.",
    "tags": [
      "meal-prep",
      "familial",
      "repas-d-effort"
    ]
  },
  {
    "id": "2026-10-19-creme-chocolat-tofu-soyeux-banane",
    "semaine": "2026-10-19",
    "nom": "Crème au chocolat, tofu soyeux et banane",
    "description": "Une crème dessert onctueuse au cacao, mixée avec du tofu soyeux et une banane. Végétale, riche en protéines et sans cuisson.",
    "categorie": "dessert",
    "profils": [
      "perte",
      "bodybuilding"
    ],
    "regimes": [
      "vegan",
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "soja"
    ],
    "portions": 3,
    "preparationMin": 10,
    "cuissonMin": 0,
    "difficulte": "facile",
    "ingredients": [
      {
        "nom": "Tofu soyeux",
        "quantite": "300 g"
      },
      {
        "nom": "Banane mûre",
        "quantite": "150 g (1)"
      },
      {
        "nom": "Cacao en poudre non sucré",
        "quantite": "25 g"
      },
      {
        "nom": "Sirop d'érable",
        "quantite": "20 g"
      },
      {
        "nom": "Fruits rouges surgelés",
        "quantite": "120 g"
      }
    ],
    "etapes": [
      "Mixe le tofu soyeux avec la banane, le cacao et le sirop d'érable jusqu'à obtenir une crème bien lisse.",
      "Répartis dans trois verrines et place au frais au moins 1 heure.",
      "Ajoute les fruits rouges décongelés au moment de servir."
    ],
    "parPortion": {
      "kcal": 152,
      "p": 8,
      "c": 21,
      "f": 4,
      "fibres": 5
    },
    "moment": "quotidien",
    "adaptations": "Perte : supprime le sirop d'érable et garde la banane. Bodybuilding : prends 2 verrines en prise de masse.",
    "tags": [
      "sans-cuisson",
      "rapide"
    ]
  },
  {
    "id": "2026-10-19-tortilla-pommes-de-terre-oignons",
    "semaine": "2026-10-19",
    "nom": "Tortilla espagnole aux pommes de terre et oignons",
    "description": "Une omelette épaisse aux pommes de terre et aux oignons, cuite à la poêle. Économique, rassasiante, bonne chaude comme froide.",
    "categorie": "dejeuner",
    "profils": [
      "force",
      "maintien"
    ],
    "regimes": [
      "vegetarien",
      "sans-porc"
    ],
    "contient": [
      "oeufs"
    ],
    "portions": 3,
    "preparationMin": 15,
    "cuissonMin": 25,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Œufs",
        "quantite": "6 (330 g)"
      },
      {
        "nom": "Pommes de terre",
        "quantite": "450 g"
      },
      {
        "nom": "Oignons",
        "quantite": "150 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "2 cuillères à soupe (30 g)"
      },
      {
        "nom": "Sel, poivre",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Épluche les pommes de terre et coupe-les en fines rondelles. Fais-les cuire à feu doux avec les oignons émincés dans l'huile, 15 minutes, en remuant.",
      "Bats les œufs avec le sel, ajoute-y les pommes de terre et les oignons égouttés, et mélange.",
      "Verse dans la poêle huilée, cuis 5 minutes, retourne à l'aide d'une assiette et poursuis 4 minutes."
    ],
    "parPortion": {
      "kcal": 381,
      "p": 18,
      "c": 30,
      "f": 21,
      "fibres": 4
    },
    "moment": "quotidien",
    "adaptations": "Force : accompagne d'une tranche de pain complet et d'un fruit. Maintien : sers avec une salade verte.",
    "tags": [
      "economique",
      "meal-prep",
      "familial"
    ]
  },
  {
    "id": "2026-10-19-kefta-boeuf-four-taboule-yaourt",
    "semaine": "2026-10-19",
    "nom": "Kefta de bœuf au four, taboulé et sauce yaourt",
    "description": "Des kefta de bœuf maigre aux épices, cuites au four, avec un taboulé de boulgour et une sauce au yaourt. Protéines et glucides pour les séances intenses.",
    "categorie": "dejeuner",
    "profils": [
      "hyrox",
      "bodybuilding"
    ],
    "regimes": [
      "sans-porc"
    ],
    "contient": [
      "viande",
      "gluten",
      "lactose"
    ],
    "portions": 3,
    "preparationMin": 20,
    "cuissonMin": 15,
    "difficulte": "moyenne",
    "ingredients": [
      {
        "nom": "Bœuf haché 5 % de matière grasse",
        "quantite": "400 g"
      },
      {
        "nom": "Boulgour (sec)",
        "quantite": "120 g"
      },
      {
        "nom": "Tomates",
        "quantite": "250 g"
      },
      {
        "nom": "Concombre",
        "quantite": "150 g"
      },
      {
        "nom": "Yaourt nature",
        "quantite": "125 g"
      },
      {
        "nom": "Huile d'olive",
        "quantite": "1 cuillère à soupe (15 g)"
      },
      {
        "nom": "Persil, menthe, cumin, paprika, citron, sel",
        "quantite": "selon goût"
      }
    ],
    "etapes": [
      "Préchauffe le four à 220 °C. Mélange le bœuf avec le cumin, le paprika, le persil et le sel, forme 12 kefta allongées et enfourne 12 à 15 minutes.",
      "Verse de l'eau bouillante sur le boulgour (même volume) et laisse gonfler 10 minutes. Mélange avec les tomates et le concombre en dés, l'huile, le citron et la menthe.",
      "Mélange le yaourt avec du persil et du sel, puis sers les kefta avec le taboulé et la sauce."
    ],
    "parPortion": {
      "kcal": 389,
      "p": 36,
      "c": 32,
      "f": 13,
      "fibres": 5
    },
    "moment": "apres-entrainement",
    "adaptations": "Hyrox : ajoute 40 g de boulgour sec par portion avant une séance longue. Bodybuilding : garde les quantités, remplace le yaourt par du fromage blanc 0 % en sèche.",
    "tags": [
      "meal-prep",
      "repas-d-effort"
    ]
  },
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
      "poisson",
      "moutarde"
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
      "porc",
      "moutarde"
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
