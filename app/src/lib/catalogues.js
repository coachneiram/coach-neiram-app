/**
 * Catalogues alimentaires.
 *
 * FICHIER GENERE — ne pas modifier a la main.
 *
 * Extrait de index.html par scripts-migration/extraire-catalogues.mjs.
 * Ces tables comptent des centaines de valeurs nutritionnelles : les
 * recopier a la main garantirait une faute de frappe quelque part, et une
 * faute de frappe ici est un conseil faux donne a un client.
 *
 * tests/catalogues.test.mjs verifie que ce fichier correspond exactement
 * a la source. Pour le regenerer :
 *   node scripts-migration/extraire-catalogues.mjs
 */

/** Catalogue nutritionnel, valeurs pour 100 g. */
export const FOOD_DB = [
  {
    "name": "Protéine en poudre (whey)",
    "cat": "proteines",
    "p": 90,
    "c": 4,
    "f": 3,
    "kcal": 403,
    "contains": [
      "lactose"
    ],
    "conseil": "Post-entraînement, 1 scoop"
  },
  {
    "name": "Emmental",
    "cat": "proteines",
    "p": 28,
    "c": 0,
    "f": 30,
    "kcal": 382,
    "contains": [
      "lactose"
    ],
    "conseil": "Collation, à doser"
  },
  {
    "name": "Bœuf (steak)",
    "cat": "proteines",
    "p": 25,
    "c": 0,
    "f": 17,
    "kcal": 253,
    "contains": [
      "viande"
    ],
    "conseil": "Max 1x/semaine"
  },
  {
    "name": "Dinde (blanc)",
    "cat": "proteines",
    "p": 25,
    "c": 0,
    "f": 1,
    "kcal": 109,
    "contains": [
      "volaille"
    ],
    "conseil": "Idéal maigre"
  },
  {
    "name": "Poulet (blanc)",
    "cat": "proteines",
    "p": 24,
    "c": 0,
    "f": 2,
    "kcal": 114,
    "contains": [
      "volaille"
    ],
    "conseil": "Source principale"
  },
  {
    "name": "Maquereau",
    "cat": "proteines",
    "p": 24,
    "c": 0,
    "f": 18,
    "kcal": 258,
    "contains": [
      "poisson"
    ],
    "conseil": "Riche en oméga-3"
  },
  {
    "name": "Thon (en boîte)",
    "cat": "proteines",
    "p": 28,
    "c": 0,
    "f": 3,
    "kcal": 139,
    "contains": [
      "poisson"
    ],
    "conseil": "Pratique, à doser au sel"
  },
  {
    "name": "Saumon",
    "cat": "proteines",
    "p": 21,
    "c": 0,
    "f": 10,
    "kcal": 174,
    "contains": [
      "poisson"
    ],
    "conseil": "2x/semaine minimum"
  },
  {
    "name": "Colin",
    "cat": "proteines",
    "p": 20,
    "c": 0,
    "f": 1,
    "kcal": 89,
    "contains": [
      "poisson"
    ],
    "conseil": "Faible en lipides"
  },
  {
    "name": "Sardines",
    "cat": "proteines",
    "p": 21,
    "c": 0,
    "f": 10,
    "kcal": 174,
    "contains": [
      "poisson"
    ],
    "conseil": "Oméga-3, calcium"
  },
  {
    "name": "Crevettes",
    "cat": "proteines",
    "p": 22,
    "c": 1,
    "f": 1,
    "kcal": 101,
    "contains": [
      "crustaces"
    ],
    "conseil": "Très faible en calories"
  },
  {
    "name": "Hareng",
    "cat": "proteines",
    "p": 15,
    "c": 0,
    "f": 15,
    "kcal": 195,
    "contains": [
      "poisson"
    ],
    "conseil": "Riche en oméga-3"
  },
  {
    "name": "Œufs entiers",
    "cat": "proteines",
    "p": 13,
    "c": 1,
    "f": 9,
    "kcal": 137,
    "contains": [
      "oeufs"
    ],
    "conseil": "Consommation quotidienne OK"
  },
  {
    "name": "Yaourt grec",
    "cat": "proteines",
    "p": 16,
    "c": 3,
    "f": 3,
    "kcal": 103,
    "contains": [
      "lactose"
    ],
    "conseil": "Collation idéale"
  },
  {
    "name": "Fromage blanc",
    "cat": "proteines",
    "p": 8,
    "c": 4,
    "f": 3,
    "kcal": 75,
    "contains": [
      "lactose"
    ],
    "conseil": "Faible en calories"
  },
  {
    "name": "Lentilles",
    "cat": "proteines",
    "p": 22,
    "c": 50,
    "f": 1,
    "kcal": 297,
    "contains": [],
    "conseil": "Protéines végétales"
  },
  {
    "name": "Soja",
    "cat": "proteines",
    "p": 22,
    "c": 9,
    "f": 9,
    "kcal": 205,
    "contains": [
      "soja"
    ],
    "conseil": "Protéines végétales complètes"
  },
  {
    "name": "Tofu",
    "cat": "proteines",
    "p": 12,
    "c": 2,
    "f": 3,
    "kcal": 83,
    "contains": [
      "soja"
    ],
    "conseil": "Végétarien/vegan"
  },
  {
    "name": "Tempeh",
    "cat": "proteines",
    "p": 19,
    "c": 9,
    "f": 8,
    "kcal": 184,
    "contains": [
      "soja"
    ],
    "conseil": "Végétarien/vegan, fermenté"
  },
  {
    "name": "Seitan",
    "cat": "proteines",
    "p": 25,
    "c": 4,
    "f": 1,
    "kcal": 125,
    "contains": [
      "gluten"
    ],
    "conseil": "Alternative végétale"
  },
  {
    "name": "Cabillaud",
    "cat": "proteines",
    "p": 15,
    "c": 0,
    "f": 1,
    "kcal": 69,
    "contains": [
      "poisson"
    ],
    "conseil": "Très faible en calories"
  },
  {
    "name": "Riz blanc (cru)",
    "cat": "glucides",
    "p": 7,
    "c": 78,
    "f": 1,
    "kcal": 349,
    "contains": [],
    "conseil": "70-80 g cru par portion"
  },
  {
    "name": "Pâtes (crues)",
    "cat": "glucides",
    "p": 12,
    "c": 75,
    "f": 2,
    "kcal": 366,
    "contains": [
      "gluten"
    ],
    "conseil": "40 g cru = 100 g cuit"
  },
  {
    "name": "Semoule (crue)",
    "cat": "glucides",
    "p": 12,
    "c": 73,
    "f": 1,
    "kcal": 349,
    "contains": [
      "gluten"
    ],
    "conseil": "Couscous, taboulé"
  },
  {
    "name": "Sarrasin",
    "cat": "glucides",
    "p": 13,
    "c": 64,
    "f": 3,
    "kcal": 335,
    "contains": [],
    "conseil": "Sans gluten"
  },
  {
    "name": "Épautre",
    "cat": "glucides",
    "p": 15,
    "c": 63,
    "f": 2,
    "kcal": 330,
    "contains": [
      "gluten"
    ],
    "conseil": "Alternative au blé"
  },
  {
    "name": "Avoine (flocons)",
    "cat": "glucides",
    "p": 13,
    "c": 60,
    "f": 7,
    "kcal": 355,
    "contains": [
      "gluten"
    ],
    "conseil": "Petit-déjeuner idéal"
  },
  {
    "name": "Quinoa (cru)",
    "cat": "glucides",
    "p": 14,
    "c": 68,
    "f": 6,
    "kcal": 382,
    "contains": [],
    "conseil": "50 g cru = 150 g cuit"
  },
  {
    "name": "Patate douce (crue)",
    "cat": "glucides",
    "p": 2,
    "c": 23,
    "f": 0,
    "kcal": 100,
    "contains": [],
    "conseil": "150 g cru = 1 portion"
  },
  {
    "name": "Pomme de terre (crue)",
    "cat": "glucides",
    "p": 2,
    "c": 20,
    "f": 0,
    "kcal": 88,
    "contains": [],
    "conseil": "250 g cru = 1 portion"
  },
  {
    "name": "Boulgour (cru)",
    "cat": "glucides",
    "p": 12,
    "c": 76,
    "f": 2,
    "kcal": 370,
    "contains": [
      "gluten"
    ],
    "conseil": "40 g cru = 110 g cuit"
  },
  {
    "name": "Pois cassés",
    "cat": "glucides",
    "p": 25,
    "c": 45,
    "f": 1,
    "kcal": 289,
    "contains": [],
    "conseil": "Indice glycémique bas"
  },
  {
    "name": "Banane",
    "cat": "glucides",
    "p": 1,
    "c": 20,
    "f": 0,
    "kcal": 84,
    "contains": [],
    "conseil": "Pré-entraînement"
  },
  {
    "name": "Dattes séchées",
    "cat": "glucides",
    "p": 2,
    "c": 70,
    "f": 1,
    "kcal": 297,
    "contains": [],
    "conseil": "Énergie rapide"
  },
  {
    "name": "Raisins secs",
    "cat": "glucides",
    "p": 3,
    "c": 80,
    "f": 1,
    "kcal": 341,
    "contains": [],
    "conseil": "À doser"
  },
  {
    "name": "Abricots secs",
    "cat": "glucides",
    "p": 4,
    "c": 53,
    "f": 1,
    "kcal": 237,
    "contains": [],
    "conseil": "Collation sportive"
  },
  {
    "name": "Figues sèches",
    "cat": "glucides",
    "p": 3,
    "c": 60,
    "f": 1,
    "kcal": 261,
    "contains": [],
    "conseil": "Riche en fibres"
  },
  {
    "name": "Huile de coco",
    "cat": "lipides",
    "p": 0,
    "c": 0,
    "f": 100,
    "kcal": 900,
    "contains": [],
    "conseil": "Cuisson uniquement"
  },
  {
    "name": "Huile d'olive",
    "cat": "lipides",
    "p": 0,
    "c": 0,
    "f": 90,
    "kcal": 810,
    "contains": [],
    "conseil": "1 CàS max/repas"
  },
  {
    "name": "Beurre",
    "cat": "lipides",
    "p": 1,
    "c": 1,
    "f": 82,
    "kcal": 746,
    "contains": [
      "lactose"
    ],
    "conseil": "À doser"
  },
  {
    "name": "Noix de pécan",
    "cat": "lipides",
    "p": 9,
    "c": 14,
    "f": 72,
    "kcal": 740,
    "contains": [
      "fruits-a-coque"
    ],
    "conseil": "Collation, 20-30 g"
  },
  {
    "name": "Noix du Brésil",
    "cat": "lipides",
    "p": 14,
    "c": 12,
    "f": 66,
    "kcal": 698,
    "contains": [
      "fruits-a-coque"
    ],
    "conseil": "2-3 noix/jour max"
  },
  {
    "name": "Noix",
    "cat": "lipides",
    "p": 15,
    "c": 14,
    "f": 60,
    "kcal": 656,
    "contains": [
      "fruits-a-coque"
    ],
    "conseil": "20-30 g/jour"
  },
  {
    "name": "Graines de tournesol",
    "cat": "lipides",
    "p": 21,
    "c": 12,
    "f": 55,
    "kcal": 627,
    "contains": [],
    "conseil": "Salade, yaourt"
  },
  {
    "name": "Graines de sésame",
    "cat": "lipides",
    "p": 18,
    "c": 12,
    "f": 55,
    "kcal": 615,
    "contains": [],
    "conseil": "Tahini, cuisine"
  },
  {
    "name": "Pistaches",
    "cat": "lipides",
    "p": 20,
    "c": 12,
    "f": 53,
    "kcal": 605,
    "contains": [
      "fruits-a-coque"
    ],
    "conseil": "20-30 g/collation"
  },
  {
    "name": "Amandes",
    "cat": "lipides",
    "p": 21,
    "c": 20,
    "f": 50,
    "kcal": 614,
    "contains": [
      "fruits-a-coque"
    ],
    "conseil": "20-30 g/collation"
  },
  {
    "name": "Noix de cajou",
    "cat": "lipides",
    "p": 18,
    "c": 30,
    "f": 42,
    "kcal": 570,
    "contains": [
      "fruits-a-coque"
    ],
    "conseil": "En modération"
  },
  {
    "name": "Graines de lin",
    "cat": "lipides",
    "p": 18,
    "c": 29,
    "f": 42,
    "kcal": 566,
    "contains": [],
    "conseil": "Moudre avant consommation"
  },
  {
    "name": "Graines de chia",
    "cat": "lipides",
    "p": 17,
    "c": 42,
    "f": 33,
    "kcal": 533,
    "contains": [],
    "conseil": "Pudding, smoothie"
  },
  {
    "name": "Avocat",
    "cat": "lipides",
    "p": 2,
    "c": 9,
    "f": 15,
    "kcal": 179,
    "contains": [],
    "conseil": "½ avocat = 1 portion"
  }
];

/** Familles d'aliments et leur couleur. */
export const FOOD_CATS = [
  {
    "id": "proteines",
    "label": "🥩 Protéines",
    "color": "gold"
  },
  {
    "id": "glucides",
    "label": "🍚 Glucides",
    "color": "blue"
  },
  {
    "id": "lipides",
    "label": "🥑 Lipides",
    "color": "orange"
  }
];

/** Equivalences glucidiques, pour une portion de 150 g cuits. */
export const EQUIV_GLUCIDES = [
  [
    "Pomme de terre",
    "150 g cru = 150 g cuits"
  ],
  [
    "Patate douce",
    "150 g cru"
  ],
  [
    "Quinoa",
    "50 g cru"
  ],
  [
    "Boulgour",
    "40 g cru",
    [
      "gluten"
    ]
  ],
  [
    "Pâtes",
    "40 g cru",
    [
      "gluten"
    ]
  ],
  [
    "Riz",
    "30 g cru"
  ]
];

/** Equivalences de fruits, pour une portion. */
export const EQUIV_FRUITS = [
  [
    "Pomme / Poire / Orange / Pêche",
    "1 fruit entier"
  ],
  [
    "Banane",
    "1 petite (ou ½ grosse)"
  ],
  [
    "Clémentines / Prunes / Kiwis",
    "2 fruits"
  ],
  [
    "Pamplemousse / Melon / Mangue",
    "½ fruit"
  ],
  [
    "Abricots / Rondelles d'ananas",
    "3 pièces"
  ],
  [
    "Cerises / Cassis / Mûres",
    "150 g"
  ],
  [
    "Fraises",
    "200 g"
  ],
  [
    "Framboises",
    "300 g"
  ]
];

/** Equivalences proteiques, pour ~120 g de viande ou poisson. */
export const EQUIV_PROTEINES = [
  [
    "Légumineuses (lentilles, pois...)",
    "200 g cuites"
  ],
  [
    "Tofu",
    "140-150 g",
    [
      "soja"
    ]
  ],
  [
    "Tempeh",
    "120-130 g",
    [
      "soja"
    ]
  ],
  [
    "Seitan",
    "110-120 g",
    [
      "gluten"
    ]
  ],
  [
    "Poisson (tous types)",
    "120 g",
    [
      "poisson"
    ]
  ],
  [
    "Viande blanche ou rouge",
    "110 g",
    [
      "viande",
      "volaille"
    ]
  ],
  [
    "Œufs entiers",
    "3 œufs (≈165 g)",
    [
      "oeufs"
    ]
  ]
];

/** Equivalences de matieres grasses. */
export const EQUIV_LIPIDES = [
  [
    "Huile (1 CàS = 10 g)",
    "10 g huile = 12 g beurre = 30 g crème fraîche"
  ],
  [
    "Cuisson : huile olive/noix/coco",
    "1 CàS max par repas"
  ],
  [
    "Assaisonnement : colza/lin/noix",
    "Conserver au réfrigérateur"
  ],
  [
    "Avocat",
    "½ fruit = ~15 g lipides"
  ],
  [
    "Amandes / Noix",
    "20-30 g = 1 portion",
    [
      "fruits-a-coque"
    ]
  ],
  [
    "Beurre de cacahuète",
    "1 CàS = ~10 g lipides",
    [
      "arachides"
    ]
  ],
  [
    "Graines (chia/lin)",
    "10-15 g = 1 portion"
  ]
];

/** Conseil affiche selon l'objectif du client. */
export const GOAL_FOOD_NOTES = {
  "perte": "Perte de poids : privilégie les sources protéinées peu caloriques (colin, cabillaud, crevettes, blanc de volaille, fromage blanc) et le volume avec les légumes. Lipides à doser précisément.",
  "prise": "Prise de masse : la densité calorique est ton alliée — féculents à chaque repas, oléagineux en collation, protéines complètes.",
  "maintien": "Maintien : équilibre les trois familles à chaque repas, varie les sources dans chaque tableau.",
  "performance": "Performance : glucides autour des entraînements (banane, riz, avoine), protéines réparties sur la journée, oméga-3 réguliers."
};

/** Collations et petits repas proposes pour combler la journee. */
export const SUGGESTIONS = [
  {
    "name": "Skyr nature (150 g)",
    "kcal": 90,
    "p": 16,
    "c": 6,
    "f": 0,
    "contains": [
      "lactose"
    ]
  },
  {
    "name": "Fromage blanc 0% + miel (200 g)",
    "kcal": 140,
    "p": 16,
    "c": 17,
    "f": 0,
    "contains": [
      "lactose"
    ]
  },
  {
    "name": "Yaourt grec + myrtilles",
    "kcal": 160,
    "p": 12,
    "c": 14,
    "f": 6,
    "contains": [
      "lactose"
    ]
  },
  {
    "name": "2 œufs durs",
    "kcal": 140,
    "p": 12,
    "c": 1,
    "f": 10,
    "contains": [
      "oeufs"
    ]
  },
  {
    "name": "Omelette 3 œufs",
    "kcal": 210,
    "p": 18,
    "c": 2,
    "f": 15,
    "contains": [
      "oeufs"
    ]
  },
  {
    "name": "Avocat ½ + œuf mollet",
    "kcal": 200,
    "p": 8,
    "c": 6,
    "f": 16,
    "contains": [
      "oeufs"
    ]
  },
  {
    "name": "Blanc de poulet (120 g)",
    "kcal": 130,
    "p": 26,
    "c": 0,
    "f": 2,
    "contains": [
      "volaille"
    ]
  },
  {
    "name": "Thon au naturel (1 boîte)",
    "kcal": 110,
    "p": 25,
    "c": 0,
    "f": 1,
    "contains": [
      "poisson"
    ]
  },
  {
    "name": "Sardines à l'huile (1 boîte)",
    "kcal": 200,
    "p": 22,
    "c": 0,
    "f": 13,
    "contains": [
      "poisson"
    ]
  },
  {
    "name": "Tofu ferme sauté (150 g)",
    "kcal": 180,
    "p": 18,
    "c": 4,
    "f": 11,
    "contains": [
      "soja"
    ]
  },
  {
    "name": "Shaker whey + eau",
    "kcal": 120,
    "p": 24,
    "c": 3,
    "f": 2,
    "contains": [
      "lactose"
    ]
  },
  {
    "name": "Shaker protéine végétale (pois)",
    "kcal": 120,
    "p": 22,
    "c": 4,
    "f": 2,
    "contains": []
  },
  {
    "name": "Banane",
    "kcal": 90,
    "p": 1,
    "c": 23,
    "f": 0,
    "contains": []
  },
  {
    "name": "Pomme + amandes (20 g)",
    "kcal": 200,
    "p": 5,
    "c": 22,
    "f": 11,
    "contains": [
      "fruits-a-coque"
    ]
  },
  {
    "name": "Pain complet + beurre de cacahuète (30 g)",
    "kcal": 260,
    "p": 10,
    "c": 24,
    "f": 14,
    "contains": [
      "arachides",
      "gluten"
    ]
  },
  {
    "name": "Bol flocons d'avoine + lait (60 g)",
    "kcal": 330,
    "p": 13,
    "c": 48,
    "f": 7,
    "contains": [
      "gluten",
      "lactose"
    ]
  },
  {
    "name": "Riz basmati cuit (150 g)",
    "kcal": 195,
    "p": 4,
    "c": 42,
    "f": 0,
    "contains": []
  },
  {
    "name": "Patate douce rôtie (200 g)",
    "kcal": 180,
    "p": 3,
    "c": 40,
    "f": 0,
    "contains": []
  },
  {
    "name": "Pain complet + blanc de dinde",
    "kcal": 220,
    "p": 16,
    "c": 30,
    "f": 3,
    "contains": [
      "gluten",
      "volaille"
    ]
  },
  {
    "name": "Poignée de noix (30 g)",
    "kcal": 200,
    "p": 5,
    "c": 4,
    "f": 19,
    "contains": [
      "fruits-a-coque"
    ]
  },
  {
    "name": "Chocolat noir 85% (20 g)",
    "kcal": 120,
    "p": 2,
    "c": 6,
    "f": 9,
    "contains": []
  },
  {
    "name": "Assiette poulet, riz & brocoli",
    "kcal": 520,
    "p": 42,
    "c": 55,
    "f": 12,
    "contains": [
      "volaille"
    ]
  },
  {
    "name": "Saumon, patate douce & haricots verts",
    "kcal": 550,
    "p": 35,
    "c": 45,
    "f": 22,
    "contains": [
      "poisson"
    ]
  },
  {
    "name": "Steak haché 5% + pâtes complètes",
    "kcal": 560,
    "p": 40,
    "c": 60,
    "f": 13,
    "contains": [
      "viande",
      "gluten"
    ]
  },
  {
    "name": "Tofu sauté, riz & légumes",
    "kcal": 480,
    "p": 25,
    "c": 62,
    "f": 13,
    "contains": [
      "soja"
    ]
  },
  {
    "name": "Salade quinoa, pois chiches & feta",
    "kcal": 430,
    "p": 17,
    "c": 52,
    "f": 16,
    "contains": [
      "lactose"
    ]
  },
  {
    "name": "Dahl de lentilles corail + riz",
    "kcal": 450,
    "p": 20,
    "c": 70,
    "f": 7,
    "contains": []
  }
];

/** Regimes alimentaires proposes dans le profil. */
export const DIET_TYPES = [
  {
    "id": "aucun",
    "label": "Aucun régime particulier"
  },
  {
    "id": "vegetarien",
    "label": "Végétarien"
  },
  {
    "id": "vegetalien",
    "label": "Végétalien / vegan"
  },
  {
    "id": "keto",
    "label": "Kéto (faible en glucides)"
  }
];

/** Allergenes et intolerances proposes dans le profil. */
export const ALLERGENS = [
  {
    "id": "gluten",
    "label": "Gluten"
  },
  {
    "id": "lactose",
    "label": "Lactose / produits laitiers"
  },
  {
    "id": "arachides",
    "label": "Arachides"
  },
  {
    "id": "fruits-a-coque",
    "label": "Fruits à coque"
  },
  {
    "id": "oeufs",
    "label": "Œufs"
  },
  {
    "id": "poisson",
    "label": "Poisson"
  },
  {
    "id": "crustaces",
    "label": "Crustacés"
  },
  {
    "id": "soja",
    "label": "Soja"
  }
];

/** Ou le client fait ses seances. */
export const TRAINING_MODES = [
  {
    "id": "app",
    "label": "Dans l'application"
  },
  {
    "id": "sheets",
    "label": "Sur mon Google Sheets (programme du coach)"
  }
];

/** Presentiel ou coaching a distance. */
export const COACHING_MODES = [
  {
    "id": "presentiel",
    "label": "Presentiel (salle, avec le coach)"
  },
  {
    "id": "enligne",
    "label": "En ligne (coaching a distance)"
  }
];

/** Liste de courses par rayon. */
export const SHOPPING_LIST = [
  {
    "id": "fruits",
    "label": "🍎 Fruits",
    "role": "fruit",
    "items": [
      {
        "n": "Bananes",
        "kcal": 89,
        "p": 1,
        "c": 23,
        "f": 0
      },
      {
        "n": "Pommes",
        "kcal": 52,
        "p": 0,
        "c": 14,
        "f": 0
      },
      {
        "n": "Citrons",
        "kcal": 29,
        "p": 1,
        "c": 9,
        "f": 0
      },
      {
        "n": "Baies fraîches ou congelées",
        "kcal": 45,
        "p": 1,
        "c": 10,
        "f": 0
      },
      {
        "n": "Kiwis",
        "kcal": 61,
        "p": 1,
        "c": 15,
        "f": 0
      },
      {
        "n": "Oranges",
        "kcal": 47,
        "p": 1,
        "c": 12,
        "f": 0
      },
      {
        "n": "Myrtilles",
        "kcal": 57,
        "p": 1,
        "c": 14,
        "f": 0
      },
      {
        "n": "Fraises",
        "kcal": 32,
        "p": 1,
        "c": 8,
        "f": 0
      },
      {
        "n": "Framboises",
        "kcal": 52,
        "p": 1,
        "c": 12,
        "f": 1
      },
      {
        "n": "Poires",
        "kcal": 57,
        "p": 0,
        "c": 15,
        "f": 0
      },
      {
        "n": "Raisin",
        "kcal": 69,
        "p": 1,
        "c": 18,
        "f": 0
      },
      {
        "n": "Pêches / Nectarines",
        "kcal": 39,
        "p": 1,
        "c": 10,
        "f": 0
      },
      {
        "n": "Ananas",
        "kcal": 50,
        "p": 1,
        "c": 13,
        "f": 0
      },
      {
        "n": "Mangue",
        "kcal": 60,
        "p": 1,
        "c": 15,
        "f": 0
      },
      {
        "n": "Clémentines",
        "kcal": 47,
        "p": 1,
        "c": 12,
        "f": 0
      },
      {
        "n": "Melon",
        "kcal": 34,
        "p": 1,
        "c": 8,
        "f": 0
      },
      {
        "n": "Abricots",
        "kcal": 48,
        "p": 1,
        "c": 11,
        "f": 0
      },
      {
        "n": "Cerises",
        "kcal": 63,
        "p": 1,
        "c": 16,
        "f": 0
      }
    ]
  },
  {
    "id": "legumes",
    "label": "🥦 Légumes",
    "role": "legume",
    "items": [
      {
        "n": "Oignons",
        "kcal": 40,
        "p": 1,
        "c": 9,
        "f": 0
      },
      {
        "n": "Ail",
        "kcal": 149,
        "p": 6,
        "c": 33,
        "f": 1
      },
      {
        "n": "Courgettes",
        "kcal": 17,
        "p": 1,
        "c": 3,
        "f": 0
      },
      {
        "n": "Poivrons",
        "kcal": 31,
        "p": 1,
        "c": 6,
        "f": 0
      },
      {
        "n": "Concombres",
        "kcal": 15,
        "p": 1,
        "c": 4,
        "f": 0
      },
      {
        "n": "Carottes",
        "kcal": 41,
        "p": 1,
        "c": 10,
        "f": 0
      },
      {
        "n": "Champignons",
        "kcal": 22,
        "p": 3,
        "c": 3,
        "f": 0
      },
      {
        "n": "Brocolis",
        "kcal": 34,
        "p": 3,
        "c": 7,
        "f": 0
      },
      {
        "n": "Haricots verts",
        "kcal": 31,
        "p": 2,
        "c": 7,
        "f": 0
      },
      {
        "n": "Tomates",
        "kcal": 18,
        "p": 1,
        "c": 4,
        "f": 0
      },
      {
        "n": "Laitue / Roquette",
        "kcal": 17,
        "p": 1,
        "c": 3,
        "f": 0
      },
      {
        "n": "Épinards",
        "kcal": 23,
        "p": 3,
        "c": 4,
        "f": 0
      },
      {
        "n": "Aubergines",
        "kcal": 25,
        "p": 1,
        "c": 6,
        "f": 0
      },
      {
        "n": "Chou-fleur",
        "kcal": 25,
        "p": 2,
        "c": 5,
        "f": 0
      },
      {
        "n": "Poireaux",
        "kcal": 61,
        "p": 1,
        "c": 14,
        "f": 0
      },
      {
        "n": "Céleri",
        "kcal": 16,
        "p": 1,
        "c": 3,
        "f": 0
      },
      {
        "n": "Betteraves",
        "kcal": 43,
        "p": 2,
        "c": 10,
        "f": 0
      },
      {
        "n": "Endives",
        "kcal": 17,
        "p": 1,
        "c": 3,
        "f": 0
      },
      {
        "n": "Asperges",
        "kcal": 20,
        "p": 2,
        "c": 4,
        "f": 0
      },
      {
        "n": "Chou kale",
        "kcal": 49,
        "p": 4,
        "c": 9,
        "f": 1
      },
      {
        "n": "Butternut / Potiron",
        "kcal": 45,
        "p": 1,
        "c": 12,
        "f": 0
      },
      {
        "n": "Petits pois (frais ou surgelés)",
        "kcal": 81,
        "p": 5,
        "c": 14,
        "f": 0
      }
    ]
  },
  {
    "id": "proteines",
    "label": "🥩 Protéines",
    "role": "proteine",
    "items": [
      {
        "n": "Œufs (bio de préférence)",
        "kcal": 137,
        "p": 13,
        "c": 1,
        "f": 9,
        "contains": [
          "oeufs"
        ]
      },
      {
        "n": "Viande hachée 5%",
        "kcal": 125,
        "p": 21,
        "c": 0,
        "f": 5,
        "contains": [
          "viande"
        ]
      },
      {
        "n": "Blanc de poulet",
        "kcal": 114,
        "p": 24,
        "c": 0,
        "f": 2,
        "contains": [
          "volaille"
        ]
      },
      {
        "n": "Blanc de dinde",
        "kcal": 109,
        "p": 25,
        "c": 0,
        "f": 1,
        "contains": [
          "volaille"
        ]
      },
      {
        "n": "Poisson frais (régional)",
        "kcal": 100,
        "p": 20,
        "c": 0,
        "f": 2,
        "contains": [
          "poisson"
        ]
      },
      {
        "n": "Filet de cabillaud / colin",
        "kcal": 82,
        "p": 18,
        "c": 0,
        "f": 1,
        "contains": [
          "poisson"
        ]
      },
      {
        "n": "Thon en boîte (eau)",
        "kcal": 116,
        "p": 26,
        "c": 0,
        "f": 1,
        "contains": [
          "poisson"
        ]
      },
      {
        "n": "Sardines en boîte",
        "kcal": 174,
        "p": 21,
        "c": 0,
        "f": 10,
        "contains": [
          "poisson"
        ]
      },
      {
        "n": "Saumon",
        "kcal": 174,
        "p": 21,
        "c": 0,
        "f": 10,
        "contains": [
          "poisson"
        ]
      },
      {
        "n": "Saumon fumé",
        "kcal": 180,
        "p": 23,
        "c": 0,
        "f": 10,
        "contains": [
          "poisson"
        ]
      },
      {
        "n": "Crevettes",
        "kcal": 101,
        "p": 22,
        "c": 1,
        "f": 1,
        "contains": [
          "crustaces"
        ]
      },
      {
        "n": "Jambon blanc découenné",
        "kcal": 110,
        "p": 20,
        "c": 1,
        "f": 3,
        "contains": [
          "viande"
        ]
      },
      {
        "n": "Viande des Grisons",
        "kcal": 175,
        "p": 38,
        "c": 1,
        "f": 3,
        "contains": [
          "viande"
        ]
      },
      {
        "n": "Tofu ferme",
        "kcal": 83,
        "p": 12,
        "c": 2,
        "f": 3,
        "contains": [
          "soja"
        ]
      },
      {
        "n": "Tempeh",
        "kcal": 184,
        "p": 19,
        "c": 9,
        "f": 8,
        "contains": [
          "soja"
        ]
      },
      {
        "n": "Protéine en poudre (whey ou végétale)",
        "kcal": 400,
        "p": 80,
        "c": 6,
        "f": 5
      },
      {
        "n": "Yaourt grec nature",
        "kcal": 103,
        "p": 16,
        "c": 3,
        "f": 3,
        "contains": [
          "lactose"
        ]
      },
      {
        "n": "Fromage blanc 0%",
        "kcal": 47,
        "p": 8,
        "c": 4,
        "f": 0,
        "contains": [
          "lactose"
        ]
      },
      {
        "n": "Fromage blanc entier",
        "kcal": 98,
        "p": 7,
        "c": 4,
        "f": 6,
        "contains": [
          "lactose"
        ]
      }
    ]
  },
  {
    "id": "laitiers",
    "label": "🥛 Produits laitiers / végétaux",
    "role": "proteine",
    "items": [
      {
        "n": "Lait (végétal si besoin)",
        "kcal": 47,
        "p": 3,
        "c": 5,
        "f": 2
      },
      {
        "n": "Fromage blanc (cottage)",
        "kcal": 98,
        "p": 11,
        "c": 3,
        "f": 4,
        "contains": [
          "lactose"
        ]
      },
      {
        "n": "Fromage frais",
        "kcal": 250,
        "p": 8,
        "c": 3,
        "f": 24,
        "contains": [
          "lactose"
        ]
      },
      {
        "n": "Yaourt nature / lait de coco",
        "kcal": 60,
        "p": 4,
        "c": 5,
        "f": 3
      },
      {
        "n": "Skyr nature",
        "kcal": 57,
        "p": 10,
        "c": 4,
        "f": 0,
        "contains": [
          "lactose"
        ]
      },
      {
        "n": "Kéfir",
        "kcal": 55,
        "p": 3,
        "c": 4,
        "f": 3,
        "contains": [
          "lactose"
        ]
      },
      {
        "n": "Feta",
        "kcal": 264,
        "p": 14,
        "c": 4,
        "f": 21,
        "contains": [
          "lactose"
        ]
      },
      {
        "n": "Mozzarella",
        "kcal": 253,
        "p": 18,
        "c": 3,
        "f": 19,
        "contains": [
          "lactose"
        ]
      },
      {
        "n": "Parmesan",
        "kcal": 392,
        "p": 36,
        "c": 0,
        "f": 28,
        "contains": [
          "lactose"
        ]
      },
      {
        "n": "Fromage de chèvre frais",
        "kcal": 210,
        "p": 13,
        "c": 3,
        "f": 17,
        "contains": [
          "lactose"
        ]
      },
      {
        "n": "Boisson végétale (amande, avoine, soja)",
        "kcal": 30,
        "p": 1,
        "c": 3,
        "f": 1
      }
    ]
  },
  {
    "id": "glucides",
    "label": "🍚 Glucides / Féculents",
    "role": "glucide",
    "items": [
      {
        "n": "Flocons d'avoine",
        "kcal": 355,
        "p": 13,
        "c": 60,
        "f": 7,
        "contains": [
          "gluten"
        ]
      },
      {
        "n": "Riz basmati / complet",
        "kcal": 349,
        "p": 7,
        "c": 78,
        "f": 1
      },
      {
        "n": "Pâtes complètes",
        "kcal": 350,
        "p": 13,
        "c": 65,
        "f": 3,
        "contains": [
          "gluten"
        ]
      },
      {
        "n": "Quinoa",
        "kcal": 382,
        "p": 14,
        "c": 68,
        "f": 6
      },
      {
        "n": "Patates douces",
        "kcal": 100,
        "p": 2,
        "c": 23,
        "f": 0
      },
      {
        "n": "Pommes de terre",
        "kcal": 88,
        "p": 2,
        "c": 20,
        "f": 0
      },
      {
        "n": "Pain complet",
        "kcal": 250,
        "p": 9,
        "c": 45,
        "f": 3,
        "contains": [
          "gluten"
        ]
      },
      {
        "n": "Semoule",
        "kcal": 349,
        "p": 12,
        "c": 73,
        "f": 1,
        "contains": [
          "gluten"
        ]
      },
      {
        "n": "Boulgour",
        "kcal": 370,
        "p": 12,
        "c": 76,
        "f": 2,
        "contains": [
          "gluten"
        ]
      },
      {
        "n": "Farine complète",
        "kcal": 340,
        "p": 12,
        "c": 70,
        "f": 2,
        "contains": [
          "gluten"
        ]
      },
      {
        "n": "Lentilles sèches",
        "kcal": 297,
        "p": 22,
        "c": 50,
        "f": 1
      },
      {
        "n": "Sarrasin",
        "kcal": 335,
        "p": 13,
        "c": 64,
        "f": 3
      },
      {
        "n": "Galettes de riz",
        "kcal": 387,
        "p": 8,
        "c": 82,
        "f": 3
      },
      {
        "n": "Tortillas / wraps complets",
        "kcal": 300,
        "p": 8,
        "c": 50,
        "f": 7,
        "contains": [
          "gluten"
        ]
      },
      {
        "n": "Muesli sans sucre ajouté",
        "kcal": 360,
        "p": 10,
        "c": 60,
        "f": 8,
        "contains": [
          "gluten",
          "fruits-a-coque"
        ]
      },
      {
        "n": "Polenta",
        "kcal": 358,
        "p": 8,
        "c": 77,
        "f": 2
      },
      {
        "n": "Vermicelles de riz",
        "kcal": 360,
        "p": 6,
        "c": 82,
        "f": 1
      }
    ]
  },
  {
    "id": "lipides",
    "label": "🥑 Lipides / Graisses",
    "role": "lipide",
    "items": [
      {
        "n": "Huile d'olive vierge extra",
        "kcal": 810,
        "p": 0,
        "c": 0,
        "f": 90
      },
      {
        "n": "Huile de lin (frigo)",
        "kcal": 900,
        "p": 0,
        "c": 0,
        "f": 100
      },
      {
        "n": "Huile de coco",
        "kcal": 900,
        "p": 0,
        "c": 0,
        "f": 100
      },
      {
        "n": "Huile de colza",
        "kcal": 900,
        "p": 0,
        "c": 0,
        "f": 100
      },
      {
        "n": "Avocats",
        "kcal": 179,
        "p": 2,
        "c": 9,
        "f": 15
      },
      {
        "n": "Amandes non salées",
        "kcal": 614,
        "p": 21,
        "c": 20,
        "f": 50,
        "contains": [
          "fruits-a-coque"
        ]
      },
      {
        "n": "Noix",
        "kcal": 656,
        "p": 15,
        "c": 14,
        "f": 60,
        "contains": [
          "fruits-a-coque"
        ]
      },
      {
        "n": "Noisettes",
        "kcal": 646,
        "p": 15,
        "c": 10,
        "f": 61,
        "contains": [
          "fruits-a-coque"
        ]
      },
      {
        "n": "Noix de cajou",
        "kcal": 570,
        "p": 18,
        "c": 30,
        "f": 42,
        "contains": [
          "fruits-a-coque"
        ]
      },
      {
        "n": "Graines de chia",
        "kcal": 533,
        "p": 17,
        "c": 42,
        "f": 33
      },
      {
        "n": "Graines de lin moulues",
        "kcal": 566,
        "p": 18,
        "c": 29,
        "f": 42
      },
      {
        "n": "Graines de courge",
        "kcal": 560,
        "p": 30,
        "c": 11,
        "f": 46
      },
      {
        "n": "Tahini (purée de sésame)",
        "kcal": 600,
        "p": 20,
        "c": 12,
        "f": 54
      },
      {
        "n": "Purée d'amandes",
        "kcal": 620,
        "p": 21,
        "c": 12,
        "f": 55,
        "contains": [
          "fruits-a-coque"
        ]
      },
      {
        "n": "Beurre de cacahuète naturel",
        "kcal": 600,
        "p": 25,
        "c": 15,
        "f": 50,
        "contains": [
          "arachides"
        ]
      },
      {
        "n": "Olives",
        "kcal": 145,
        "p": 1,
        "c": 3,
        "f": 14
      },
      {
        "n": "Beurre doux",
        "kcal": 746,
        "p": 1,
        "c": 1,
        "f": 82,
        "contains": [
          "lactose"
        ]
      }
    ]
  },
  {
    "id": "conserves",
    "label": "🥫 En boîte / Conserves",
    "role": null,
    "items": [
      {
        "n": "Haricots rouges",
        "kcal": 95,
        "p": 8,
        "c": 15,
        "f": 1,
        "role": "proteine"
      },
      {
        "n": "Pois chiches",
        "kcal": 120,
        "p": 7,
        "c": 18,
        "f": 2,
        "role": "proteine"
      },
      {
        "n": "Lentilles cuites (bocal)",
        "kcal": 116,
        "p": 9,
        "c": 17,
        "f": 0,
        "role": "proteine"
      },
      {
        "n": "Maïs (sans sel ajouté)",
        "kcal": 80,
        "p": 3,
        "c": 16,
        "f": 1,
        "role": "glucide"
      },
      {
        "n": "Thon au naturel",
        "kcal": 116,
        "p": 26,
        "c": 0,
        "f": 1,
        "contains": [
          "poisson"
        ],
        "role": "proteine"
      },
      {
        "n": "Sardines à l'huile d'olive",
        "kcal": 210,
        "p": 23,
        "c": 0,
        "f": 13,
        "contains": [
          "poisson"
        ],
        "role": "proteine"
      },
      {
        "n": "Maquereau en boîte",
        "kcal": 220,
        "p": 20,
        "c": 0,
        "f": 15,
        "contains": [
          "poisson"
        ],
        "role": "proteine"
      },
      {
        "n": "Tomates pelées",
        "kcal": 20,
        "p": 1,
        "c": 4,
        "f": 0,
        "role": "legume"
      },
      {
        "n": "Passata / sauce tomate nature",
        "kcal": 35,
        "p": 2,
        "c": 6,
        "f": 0,
        "role": "legume"
      },
      {
        "n": "Ratatouille",
        "kcal": 45,
        "p": 1,
        "c": 6,
        "f": 2,
        "role": "legume"
      },
      {
        "n": "Soupe de légumes",
        "kcal": 35,
        "p": 1,
        "c": 6,
        "f": 1,
        "role": "legume"
      },
      {
        "n": "Lait de coco",
        "kcal": 180,
        "p": 2,
        "c": 3,
        "f": 18,
        "role": "lipide"
      },
      {
        "n": "Compote sans sucre ajouté",
        "kcal": 55,
        "p": 0,
        "c": 13,
        "f": 0,
        "role": "fruit"
      }
    ]
  },
  {
    "id": "epices",
    "label": "🌿 Herbes & épices",
    "role": null,
    "items": [
      {
        "n": "Basilic"
      },
      {
        "n": "Coriandre"
      },
      {
        "n": "Persil"
      },
      {
        "n": "Romarin"
      },
      {
        "n": "Thym"
      },
      {
        "n": "Origan"
      },
      {
        "n": "Paprika"
      },
      {
        "n": "Cannelle"
      },
      {
        "n": "Curry"
      },
      {
        "n": "Cumin"
      },
      {
        "n": "Curcuma"
      },
      {
        "n": "Gingembre"
      },
      {
        "n": "Poivre noir"
      },
      {
        "n": "Herbes de Provence"
      },
      {
        "n": "Ail en poudre"
      }
    ]
  },
  {
    "id": "divers",
    "label": "🍫 Réserve / Divers",
    "role": null,
    "items": [
      {
        "n": "Chocolat noir (>70%)",
        "kcal": 560,
        "p": 8,
        "c": 30,
        "f": 42
      },
      {
        "n": "Miel ou sirop d'érable",
        "kcal": 320,
        "p": 0,
        "c": 80,
        "f": 0
      },
      {
        "n": "Dattes séchées",
        "kcal": 297,
        "p": 2,
        "c": 70,
        "f": 1
      },
      {
        "n": "Raisins secs",
        "kcal": 341,
        "p": 3,
        "c": 80,
        "f": 1
      },
      {
        "n": "Abricots secs",
        "kcal": 237,
        "p": 4,
        "c": 53,
        "f": 1
      },
      {
        "n": "Cacao en poudre non sucré",
        "kcal": 340,
        "p": 22,
        "c": 14,
        "f": 21
      },
      {
        "n": "Levure nutritionnelle",
        "kcal": 350,
        "p": 50,
        "c": 25,
        "f": 5
      },
      {
        "n": "Vinaigre balsamique",
        "kcal": 90,
        "p": 0,
        "c": 17,
        "f": 0
      },
      {
        "n": "Sauce soja (sans gluten)",
        "kcal": 55,
        "p": 8,
        "c": 5,
        "f": 0,
        "contains": [
          "soja"
        ]
      },
      {
        "n": "Moutarde",
        "kcal": 100,
        "p": 6,
        "c": 6,
        "f": 6
      },
      {
        "n": "Cornichons",
        "kcal": 15,
        "p": 1,
        "c": 2,
        "f": 0
      },
      {
        "n": "Thé / Tisanes"
      },
      {
        "n": "Café"
      },
      {
        "n": "Eau gazeuse"
      }
    ]
  }
];
