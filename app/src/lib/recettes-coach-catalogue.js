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
    "contient": ["soja"],
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
    "contient": ["lactose"],
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
