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
