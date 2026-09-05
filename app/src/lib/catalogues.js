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

/** Seances sans materiel preparees par le coach. */
export const SEANCE_TEMPLATES = [
  {
    "id": "45a",
    "name": "45-A — Bas du corps et gainage",
    "durationMin": 45,
    "color": "#2DD4BF",
    "description": "45 min · Bas du corps & gainage",
    "note": "Repos 45-60 s selon exercice. RPE 7 maximum les 4 premières semaines.",
    "exercises": [
      {
        "name": "Rotations des épaules, bras tendus",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Cercles de bassin",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Chat / vache au sol",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Fentes marchées sur place",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Squat poids du corps",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Montées de genoux contrôlées",
        "mode": "warmup",
        "sets": 1,
        "reps": 30
      },
      {
        "name": "Squat au poids du corps",
        "mode": "pdc",
        "sets": 4,
        "reps": 12
      },
      {
        "name": "Fentes alternées",
        "mode": "pdc",
        "sets": 3,
        "reps": 10
      },
      {
        "name": "Pont fessier au sol",
        "mode": "pdc",
        "sets": 4,
        "reps": 15
      },
      {
        "name": "Gainage planche",
        "mode": "pdc",
        "sets": 3,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Gainage latéral",
        "mode": "pdc",
        "sets": 3,
        "reps": 20,
        "repUnit": "sec"
      },
      {
        "name": "Superman",
        "mode": "pdc",
        "sets": 3,
        "reps": 12
      }
    ]
  },
  {
    "id": "45b",
    "name": "45-B — Haut du corps et tirage",
    "durationMin": 45,
    "color": "#9F8FEF",
    "description": "45 min · Haut du corps & tirage",
    "note": "Repos 45-60 s selon exercice. RPE 7 maximum les 4 premières semaines.",
    "exercises": [
      {
        "name": "Rotations des épaules, bras tendus",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Cercles de bassin",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Chat / vache au sol",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Fentes marchées sur place",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Squat poids du corps",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Montées de genoux contrôlées",
        "mode": "warmup",
        "sets": 1,
        "reps": 30
      },
      {
        "name": "Pompes",
        "mode": "pdc",
        "sets": 4,
        "reps": 8
      },
      {
        "name": "Rowing sous une table",
        "mode": "pdc",
        "sets": 4,
        "reps": 10
      },
      {
        "name": "Dips sur chaise",
        "mode": "pdc",
        "sets": 3,
        "reps": 10
      },
      {
        "name": "Élévations latérales (bouteilles pleines)",
        "mode": "pdc",
        "sets": 3,
        "reps": 15
      },
      {
        "name": "Gainage bras tendus (touches d'épaule)",
        "mode": "pdc",
        "sets": 3,
        "reps": 20
      },
      {
        "name": "Extension thoracique au mur",
        "mode": "pdc",
        "sets": 2,
        "reps": 10
      }
    ]
  },
  {
    "id": "45c",
    "name": "45-C — Circuit cardio, intensité contrôlée",
    "durationMin": 45,
    "color": "#4ADE80",
    "description": "45 min · Circuit cardio",
    "note": "4 tours, 40 s de travail / 20 s de récupération entre exercices, 90 s entre les tours. RPE 7 maximum.",
    "exercises": [
      {
        "name": "Rotations des épaules, bras tendus",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Cercles de bassin",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Chat / vache au sol",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Fentes marchées sur place",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Squat poids du corps",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Montées de genoux contrôlées",
        "mode": "warmup",
        "sets": 1,
        "reps": 30
      },
      {
        "name": "Montées de genoux",
        "mode": "pdc",
        "sets": 4,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Squat au poids du corps",
        "mode": "pdc",
        "sets": 4,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Pompes",
        "mode": "pdc",
        "sets": 4,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Fentes alternées",
        "mode": "pdc",
        "sets": 4,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Planche dynamique (coudes puis mains)",
        "mode": "pdc",
        "sets": 4,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Step-ups sur une marche",
        "mode": "pdc",
        "sets": 4,
        "reps": 40,
        "repUnit": "sec"
      }
    ]
  },
  {
    "id": "30a",
    "name": "30-A — Corps entier",
    "durationMin": 30,
    "color": "#F0A155",
    "description": "30 min · Corps entier",
    "note": "Repos 45 s. RPE 7 maximum.",
    "exercises": [
      {
        "name": "Rotations des épaules, bras tendus",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Cercles de bassin",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Chat / vache au sol",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Fentes marchées sur place",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Squat poids du corps",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Montées de genoux contrôlées",
        "mode": "warmup",
        "sets": 1,
        "reps": 30
      },
      {
        "name": "Squat au poids du corps",
        "mode": "pdc",
        "sets": 3,
        "reps": 15
      },
      {
        "name": "Pompes",
        "mode": "pdc",
        "sets": 3,
        "reps": 8
      },
      {
        "name": "Pont fessier au sol",
        "mode": "pdc",
        "sets": 3,
        "reps": 15
      },
      {
        "name": "Rowing sous une table",
        "mode": "pdc",
        "sets": 3,
        "reps": 10
      },
      {
        "name": "Gainage planche",
        "mode": "pdc",
        "sets": 3,
        "reps": 30,
        "repUnit": "sec"
      }
    ]
  },
  {
    "id": "30b",
    "name": "30-B — Cardio et dos",
    "durationMin": 30,
    "color": "#5B9FEF",
    "description": "30 min · Cardio & dos",
    "note": "3 tours, 40 s de travail / 20 s de récupération.",
    "exercises": [
      {
        "name": "Rotations des épaules, bras tendus",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Cercles de bassin",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Chat / vache au sol",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Fentes marchées sur place",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Squat poids du corps",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Montées de genoux contrôlées",
        "mode": "warmup",
        "sets": 1,
        "reps": 30
      },
      {
        "name": "Montées de genoux",
        "mode": "pdc",
        "sets": 3,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Fentes alternées",
        "mode": "pdc",
        "sets": 3,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Superman",
        "mode": "pdc",
        "sets": 3,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Squat au poids du corps",
        "mode": "pdc",
        "sets": 3,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Gainage latéral",
        "mode": "pdc",
        "sets": 3,
        "reps": 40,
        "repUnit": "sec"
      }
    ]
  },
  {
    "id": "15a",
    "name": "15-A — Debout, sans se mettre au sol",
    "durationMin": 15,
    "color": "#F0645A",
    "description": "15 min · Maintien, debout",
    "note": "Séance de maintien pour les semaines difficiles. 2 tours, 40 s de travail / 20 s de récupération. RPE 6 maximum, aucune progression.",
    "exercises": [
      {
        "name": "Rotations des épaules, bras tendus",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Cercles de bassin",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Chat / vache au sol",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Fentes marchées sur place",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Squat poids du corps",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Montées de genoux contrôlées",
        "mode": "warmup",
        "sets": 1,
        "reps": 30
      },
      {
        "name": "Squat au poids du corps",
        "mode": "pdc",
        "sets": 2,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Fentes alternées",
        "mode": "pdc",
        "sets": 2,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Pompes (contre un mur ou un plan de travail)",
        "mode": "pdc",
        "sets": 2,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Montées de genoux",
        "mode": "pdc",
        "sets": 2,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Chaise contre le mur",
        "mode": "pdc",
        "sets": 2,
        "reps": 40,
        "repUnit": "sec"
      },
      {
        "name": "Élévations sur pointes de pieds",
        "mode": "pdc",
        "sets": 2,
        "reps": 40,
        "repUnit": "sec"
      }
    ]
  },
  {
    "id": "15b",
    "name": "15-B — Dos et mobilité (mauvais sommeil)",
    "durationMin": 15,
    "color": "#2DD4BF",
    "description": "15 min · Maintien, sommeil",
    "note": "Séance de maintien pour les semaines de mauvais sommeil. Aucune progression, juste tenir le fil.",
    "exercises": [
      {
        "name": "Rotations des épaules, bras tendus",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Cercles de bassin",
        "mode": "warmup",
        "sets": 1,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Chat / vache au sol",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Fentes marchées sur place",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Squat poids du corps",
        "mode": "warmup",
        "sets": 1,
        "reps": 10
      },
      {
        "name": "Montées de genoux contrôlées",
        "mode": "warmup",
        "sets": 1,
        "reps": 30
      },
      {
        "name": "Pont fessier au sol",
        "mode": "pdc",
        "sets": 2,
        "reps": 15
      },
      {
        "name": "Superman",
        "mode": "pdc",
        "sets": 2,
        "reps": 12
      },
      {
        "name": "Gainage planche",
        "mode": "pdc",
        "sets": 2,
        "reps": 30,
        "repUnit": "sec"
      },
      {
        "name": "Étirement fessier allongé",
        "mode": "pdc",
        "sets": 1,
        "reps": 45,
        "repUnit": "sec"
      },
      {
        "name": "Ouverture thoracique au sol",
        "mode": "pdc",
        "sets": 1,
        "reps": 10
      }
    ]
  }
];

/** Portion de reference par role, en grammes. */
export const ROLE_PORTIONS = {
  "proteine": 120,
  "glucide": 70,
  "legume": 200,
  "lipide": 10,
  "fruit": 120
};

/** Libelle affiche de chaque role. */
export const ROLE_LABELS = {
  "proteine": "protéine",
  "glucide": "glucides",
  "legume": "légumes",
  "lipide": "lipides",
  "fruit": "fruit"
};

/** Aliments preferes par role et par objectif, pour composer une idee de repas. */
export const ROLE_PREFS = {
  "proteine": {
    "perte": [
      "Filet de cabillaud / colin",
      "Blanc de poulet",
      "Blanc de dinde",
      "Crevettes",
      "Thon en boîte (eau)",
      "Skyr nature",
      "Tofu ferme",
      "Lentilles cuites (bocal)",
      "Fromage blanc 0%"
    ],
    "prise": [
      "Blanc de poulet",
      "Viande hachée 5%",
      "Saumon",
      "Œufs (bio de préférence)",
      "Tempeh",
      "Pois chiches",
      "Yaourt grec nature"
    ],
    "default": [
      "Blanc de poulet",
      "Saumon",
      "Œufs (bio de préférence)",
      "Tofu ferme",
      "Thon en boîte (eau)",
      "Lentilles cuites (bocal)",
      "Skyr nature"
    ]
  },
  "collation": {
    "default": [
      "Skyr nature",
      "Yaourt grec nature",
      "Fromage blanc 0%",
      "Yaourt nature / lait de coco",
      "Œufs (bio de préférence)"
    ]
  },
  "glucide": {
    "perte": [
      "Patates douces",
      "Quinoa",
      "Lentilles sèches",
      "Riz basmati / complet",
      "Sarrasin"
    ],
    "prise": [
      "Riz basmati / complet",
      "Pâtes complètes",
      "Flocons d'avoine",
      "Pain complet",
      "Semoule"
    ],
    "default": [
      "Riz basmati / complet",
      "Quinoa",
      "Patates douces",
      "Pâtes complètes",
      "Sarrasin"
    ]
  },
  "legume": {
    "default": [
      "Brocolis",
      "Courgettes",
      "Haricots verts",
      "Épinards",
      "Poivrons",
      "Champignons",
      "Tomates"
    ]
  },
  "lipide": {
    "perte": [
      "Huile d'olive vierge extra",
      "Avocats",
      "Olives"
    ],
    "prise": [
      "Amandes non salées",
      "Beurre de cacahuète naturel",
      "Huile d'olive vierge extra",
      "Avocats"
    ],
    "default": [
      "Huile d'olive vierge extra",
      "Avocats",
      "Amandes non salées",
      "Graines de courge"
    ]
  }
};

/** Couleurs proposees pour identifier une seance type. */
export const ROUTINE_COLORS = [
  "#2DD4BF",
  "#9F8FEF",
  "#4ADE80",
  "#F0A155",
  "#5B9FEF",
  "#F0645A"
];

/** Zones de douleur proposees a la fin d'une seance. */
export const PAIN_ZONES = [
  "Cervicales",
  "Épaule droite",
  "Épaule gauche",
  "Coude droit",
  "Coude gauche",
  "Poignet",
  "Dos (haut)",
  "Lombaires",
  "Hanche droite",
  "Hanche gauche",
  "Genou droit",
  "Genou gauche",
  "Cheville",
  "Autre"
];

/** Progression de charge deduite du RPE de la derniere seance. */
export const PROGRESSION_RULES = [
  {
    "maxRpe": 6.5,
    "pct": 0.05,
    "label": "série facile"
  },
  {
    "maxRpe": 7.5,
    "pct": 0.04,
    "label": "marge confortable"
  },
  {
    "maxRpe": 8.5,
    "pct": 0.025,
    "label": "marge correcte"
  },
  {
    "maxRpe": 9.25,
    "pct": 0,
    "label": "proche de la limite"
  },
  {
    "maxRpe": 10,
    "pct": -0.05,
    "label": "à l'échec"
  }
];

/** Champs saisissables pour un exercice cardio. */
export const CARDIO_FIELD_DEFS = {
  "durationMin": {
    "label": "Min",
    "ph": "min"
  },
  "speedKmh": {
    "label": "km/h",
    "ph": "km/h"
  },
  "inclinePct": {
    "label": "Incl. %",
    "ph": "%"
  },
  "level": {
    "label": "Niveau",
    "ph": "niv."
  },
  "distanceM": {
    "label": "Dist. m",
    "ph": "m"
  }
};

/** Champs cardio affiches par defaut. */
export const DEFAULT_CARDIO_FIELDS = [
  "durationMin",
  "speedKmh",
  "inclinePct",
  "level"
];

/** Bibliotheque d'exercices, par groupe. */
export const EXERCISE_LIBRARY = [
  {
    "group": "Machines guidées — haut du corps",
    "note": "Bibliothèque Coach Neiram — exercices courants en salle.",
    "items": [
      {
        "name": "Développé poitrine machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Développé incliné machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Pec deck / écarté machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Tirage vertical poitrine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Tirage horizontal assis",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Rowing machine convergente",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Tirage vertical prise neutre",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Pullover machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Développé épaules machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Élévations latérales machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Oiseau machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Curl biceps machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Extension triceps machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Tirage vertical unilatéral prise neutre",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Tirage haut (Technogym)",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Tirage vertical supination",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Tirage vertical unilatéral",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      }
    ]
  },
  {
    "group": "Machines guidées — bas du corps",
    "note": "Amplitude confortable et exécution contrôlée.",
    "items": [
      {
        "name": "Presse à cuisses",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Hack squat machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Leg extension",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Leg curl assis",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Leg curl allongé",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Hip thrust machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Abducteurs machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Adducteurs machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Mollets à la presse",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Mollets debout machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Leg extension unilatéral",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Mollets assis",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Pendulum",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "V Squat",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Presse à cuisses inclinée",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Belt squat",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      }
    ]
  },
  {
    "group": "Haltères / barre",
    "note": "Charge à adapter au niveau du client et à la qualité d'exécution.",
    "items": [
      {
        "name": "Développé couché haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Développé incliné haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Développé couché barre",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 8
        }
      },
      {
        "name": "Développé incliné barre",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 8
        }
      },
      {
        "name": "Développé militaire haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Développé militaire barre",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 8
        }
      },
      {
        "name": "Élévations latérales haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Oiseau haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Rowing haltère un bras",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Rowing barre",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 8
        }
      },
      {
        "name": "Soulevé de terre roumain",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Soulevé de terre trap bar",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 6
        }
      },
      {
        "name": "Squat goblet",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Squat barre",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 8
        }
      },
      {
        "name": "Fentes marchées haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Fentes arrière haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Bulgarian split squat",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 8
        }
      },
      {
        "name": "Hip thrust barre",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Curl biceps haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Curl marteau haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Extension triceps au-dessus de la tête",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Skull crushers barre",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Fentes unilatérales",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Développé épaules debout",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Rowing barre supination",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Rowing barre pronation",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      }
    ]
  },
  {
    "group": "Poulies / câbles",
    "note": "Réglage selon la morphologie et l'objectif.",
    "items": [
      {
        "name": "Chest press à la poulie",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Écarté poulie vis-à-vis",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Tirage vertical poulie",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Rowing poulie basse",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Face pull",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Élévation latérale poulie",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Curl poulie basse",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Curl poulie corde",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Extension triceps corde",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Extension triceps barre",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Pull-over à la poulie haute",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Woodchop à la poulie",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Pallof press",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Kickback fessier à la poulie",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Abduction hanche à la poulie",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Poulie vis-à-vis (position haute)",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Poulie vis-à-vis (position basse)",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Poulie vis-à-vis (position milieu)",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Curl marteau corde",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Tirage horizontal unilatéral (poulie)",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Tirage menton (poulie basse)",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Tirage dos au sol",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      }
    ]
  },
  {
    "group": "Poids du corps / fonctionnel",
    "note": "Réglage des répétitions ou du temps selon le niveau.",
    "items": [
      {
        "name": "Burpees",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Pompes",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Pompes inclinées",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Pompes genoux",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Squats au poids du corps",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Squats tempo",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Fentes alternées",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Fentes arrière",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Step-up",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Squat jump",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Jumping jacks",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 30
        }
      },
      {
        "name": "Mountain climbers",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 30
        }
      },
      {
        "name": "Skater jumps",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Box jumps",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 8
        }
      },
      {
        "name": "Dips sur banc",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Tractions",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 6
        }
      },
      {
        "name": "Tractions assistées",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 8
        }
      },
      {
        "name": "Gainage planche",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 45,
          "repUnit": "sec"
        }
      },
      {
        "name": "Gainage latéral",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 30,
          "repUnit": "sec"
        }
      },
      {
        "name": "Dead bug",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Bird dog",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Glute bridge",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Hip thrust au poids du corps",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Crunchs",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Reverse crunch",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Russian twists",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 20
        }
      },
      {
        "name": "Superman",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Chaise contre le mur",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 45,
          "repUnit": "sec"
        }
      },
      {
        "name": "Dips assistées",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Pompes prise large",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Pompes prise serrée",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Traineau",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Montée sur pointe",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      }
    ]
  },
  {
    "group": "Cardio / Ergomètres",
    "note": "Réglages indicatifs — à adapter au niveau et à l'objectif.",
    "items": [
      {
        "name": "Marche inclinée (tapis)",
        "mode": "cardio",
        "fields": [
          "durationMin",
          "speedKmh",
          "inclinePct"
        ],
        "defaults": {
          "durationMin": 20,
          "speedKmh": 5.5,
          "inclinePct": 10
        }
      },
      {
        "name": "Course sur tapis",
        "mode": "cardio",
        "fields": [
          "durationMin",
          "speedKmh",
          "inclinePct"
        ],
        "defaults": {
          "durationMin": 20,
          "speedKmh": 9,
          "inclinePct": 1
        }
      },
      {
        "name": "Vélo droit / assis",
        "mode": "cardio",
        "fields": [
          "durationMin",
          "level"
        ],
        "defaults": {
          "durationMin": 20,
          "level": 8
        }
      },
      {
        "name": "Vélo RPM / spinning",
        "mode": "cardio",
        "fields": [
          "durationMin",
          "level"
        ],
        "defaults": {
          "durationMin": 30,
          "level": 10
        }
      },
      {
        "name": "Elliptique",
        "mode": "cardio",
        "fields": [
          "durationMin",
          "level"
        ],
        "defaults": {
          "durationMin": 20,
          "level": 8
        }
      },
      {
        "name": "Rameur (Skillrow)",
        "mode": "cardio",
        "fields": [
          "durationMin",
          "level",
          "distanceM"
        ],
        "defaults": {
          "durationMin": 15,
          "level": 5
        }
      },
      {
        "name": "Rameur — distance",
        "mode": "cardio",
        "fields": [
          "distanceM",
          "durationMin"
        ],
        "defaults": {
          "distanceM": 1000,
          "durationMin": 5
        }
      },
      {
        "name": "Escalier (Climb)",
        "mode": "cardio",
        "fields": [
          "durationMin",
          "level"
        ],
        "defaults": {
          "durationMin": 15,
          "level": 7
        }
      },
      {
        "name": "Skillmill (tapis non motorisé)",
        "mode": "cardio",
        "fields": [
          "durationMin",
          "level"
        ],
        "defaults": {
          "durationMin": 10,
          "level": 5
        }
      },
      {
        "name": "Assault bike / Air bike",
        "mode": "cardio",
        "fields": [
          "durationMin",
          "level"
        ],
        "defaults": {
          "durationMin": 10,
          "level": 8
        }
      },
      {
        "name": "Corde à sauter",
        "mode": "cardio",
        "fields": [
          "durationMin"
        ],
        "defaults": {
          "durationMin": 10
        }
      }
    ]
  },
  {
    "group": "Mobilité / activation",
    "note": "Échauffement, récupération ou travail de mobilité selon le besoin.",
    "items": [
      {
        "name": "Mobilité cheville contre mur",
        "mode": "pdc",
        "defaults": {
          "sets": 2,
          "reps": 10
        }
      },
      {
        "name": "90/90 hanches",
        "mode": "pdc",
        "defaults": {
          "sets": 2,
          "reps": 8
        }
      },
      {
        "name": "Rotation thoracique quadrupédie",
        "mode": "pdc",
        "defaults": {
          "sets": 2,
          "reps": 8
        }
      },
      {
        "name": "Cat-cow",
        "mode": "pdc",
        "defaults": {
          "sets": 2,
          "reps": 10
        }
      },
      {
        "name": "Pont fessier activation",
        "mode": "pdc",
        "defaults": {
          "sets": 2,
          "reps": 15
        }
      },
      {
        "name": "Clamshell",
        "mode": "pdc",
        "defaults": {
          "sets": 2,
          "reps": 15
        }
      },
      {
        "name": "Monster walk",
        "mode": "pdc",
        "defaults": {
          "sets": 2,
          "reps": 12
        }
      },
      {
        "name": "Bird dog contrôlé",
        "mode": "pdc",
        "defaults": {
          "sets": 2,
          "reps": 8
        }
      },
      {
        "name": "Planche latérale courte",
        "mode": "pdc",
        "defaults": {
          "sets": 2,
          "reps": 20,
          "repUnit": "sec"
        }
      },
      {
        "name": "Respiration diaphragmatique",
        "mode": "pdc",
        "defaults": {
          "sets": 2,
          "reps": 60,
          "repUnit": "sec"
        }
      }
    ]
  },
  {
    "group": "Échauffement / Warm-up",
    "note": "À placer en début de séance. Général ou spécifique golf avant le travail principal.",
    "items": [
      {
        "name": "Respiration diaphragmatique",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 60,
          "repUnit": "sec"
        }
      },
      {
        "name": "Marche dynamique",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 120,
          "repUnit": "sec"
        }
      },
      {
        "name": "Montées de genoux contrôlées",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 30
        }
      },
      {
        "name": "Talons-fesses contrôlés",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 30
        }
      },
      {
        "name": "Cercles de bras",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 10
        }
      },
      {
        "name": "Cat-cow dynamique",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 8
        }
      },
      {
        "name": "Rotation thoracique debout",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 8
        }
      },
      {
        "name": "Squat poids du corps",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 10
        }
      },
      {
        "name": "Fente arrière dynamique",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 6
        }
      },
      {
        "name": "World's Greatest Stretch dynamique",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 5
        }
      },
      {
        "name": "90/90 dynamique",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 6
        }
      },
      {
        "name": "Mobilité cheville dynamique",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 10
        }
      },
      {
        "name": "Monster walk élastique",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 10
        }
      },
      {
        "name": "Pallof press léger",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 8
        }
      },
      {
        "name": "Rotations des épaules, bras tendus",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 30,
          "repUnit": "sec"
        }
      },
      {
        "name": "Cercles de bassin",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 30,
          "repUnit": "sec"
        }
      },
      {
        "name": "Chat / vache au sol",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 10
        }
      },
      {
        "name": "Fentes marchées sur place",
        "mode": "warmup",
        "defaults": {
          "sets": 1,
          "reps": 10
        }
      }
    ]
  },
  {
    "group": "Sans matériel — Bas du corps & gainage",
    "note": "Coaching en ligne : aucun équipement nécessaire, à faire à la maison.",
    "items": [
      {
        "name": "Pont fessier au sol",
        "mode": "pdc",
        "defaults": {
          "sets": 4,
          "reps": 15
        }
      },
      {
        "name": "Montées de genoux",
        "mode": "pdc",
        "defaults": {
          "sets": 1,
          "reps": 30,
          "repUnit": "sec"
        }
      },
      {
        "name": "Élévations sur pointes de pieds",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Step-ups sur une marche",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Planche dynamique (coudes puis mains)",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 30,
          "repUnit": "sec"
        }
      }
    ]
  },
  {
    "group": "Sans matériel — Haut du corps",
    "note": "Coaching en ligne : aucun équipement nécessaire, à faire à la maison.",
    "items": [
      {
        "name": "Rowing sous une table",
        "mode": "pdc",
        "defaults": {
          "sets": 4,
          "reps": 10
        }
      },
      {
        "name": "Dips sur chaise",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Élévations latérales (bouteilles pleines)",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Gainage bras tendus (touches d'épaule)",
        "mode": "pdc",
        "defaults": {
          "sets": 3,
          "reps": 20
        }
      },
      {
        "name": "Extension thoracique au mur",
        "mode": "pdc",
        "defaults": {
          "sets": 2,
          "reps": 10
        }
      }
    ]
  },
  {
    "group": "Sans matériel — Mobilité & récupération",
    "note": "Coaching en ligne : à utiliser en séance de maintien ou après une mauvaise nuit.",
    "items": [
      {
        "name": "Étirement fessier allongé",
        "mode": "pdc",
        "defaults": {
          "sets": 2,
          "reps": 45,
          "repUnit": "sec"
        }
      },
      {
        "name": "Ouverture thoracique au sol",
        "mode": "pdc",
        "defaults": {
          "sets": 2,
          "reps": 10
        }
      }
    ]
  },
  {
    "group": "Force athlétique / powerlifting",
    "plOnly": true,
    "note": "Mouvements de compétition et variantes. Renseigne tes maxis pour calculer la charge à partir du %1RM.",
    "items": [
      {
        "name": "Squat barre (compétition)",
        "mode": "powerlifting",
        "defaults": {
          "sets": 1,
          "reps": 3,
          "setType": "top",
          "pct1rm": 87
        }
      },
      {
        "name": "Squat pause",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 3,
          "setType": "travail",
          "pct1rm": 70
        }
      },
      {
        "name": "Squat barre haute",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 5,
          "setType": "travail",
          "pct1rm": 70
        }
      },
      {
        "name": "Squat tempo",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 4,
          "setType": "travail",
          "pct1rm": 65
        }
      },
      {
        "name": "Box squat",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 3,
          "setType": "travail",
          "pct1rm": 72
        }
      },
      {
        "name": "Front squat",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 5,
          "setType": "accessoire"
        }
      },
      {
        "name": "Développé couché (compétition)",
        "mode": "powerlifting",
        "defaults": {
          "sets": 1,
          "reps": 3,
          "setType": "top",
          "pct1rm": 87
        }
      },
      {
        "name": "Développé couché pause",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 3,
          "setType": "travail",
          "pct1rm": 75
        }
      },
      {
        "name": "Spoto press",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 5,
          "setType": "travail",
          "pct1rm": 68
        }
      },
      {
        "name": "Développé couché prise serrée",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 6,
          "setType": "accessoire"
        }
      },
      {
        "name": "Développé couché planche (board press)",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 4,
          "setType": "accessoire"
        }
      },
      {
        "name": "Soulevé de terre (compétition)",
        "mode": "powerlifting",
        "defaults": {
          "sets": 1,
          "reps": 2,
          "setType": "top",
          "pct1rm": 87
        }
      },
      {
        "name": "Soulevé de terre sumo",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 3,
          "setType": "travail",
          "pct1rm": 75
        }
      },
      {
        "name": "Deficit deadlift",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 3,
          "setType": "travail",
          "pct1rm": 68
        }
      },
      {
        "name": "Rack pull",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 3,
          "setType": "accessoire",
          "pct1rm": 90
        }
      },
      {
        "name": "Block pull",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 3,
          "setType": "accessoire",
          "pct1rm": 85
        }
      },
      {
        "name": "Soulevé de terre pause sous genou",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 3,
          "setType": "travail",
          "pct1rm": 65
        }
      },
      {
        "name": "Good morning",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 8,
          "setType": "accessoire"
        }
      },
      {
        "name": "Rowing barre (point faible dos)",
        "mode": "powerlifting",
        "defaults": {
          "sets": 4,
          "reps": 8,
          "setType": "accessoire"
        }
      },
      {
        "name": "Dips lestés (point faible triceps)",
        "mode": "powerlifting",
        "defaults": {
          "sets": 3,
          "reps": 8,
          "setType": "accessoire"
        }
      }
    ]
  },
  {
    "group": "Machines à charge libre (Hammer / plate-loaded)",
    "note": "Machines à disques : trajectoire guidée mais résistance libre. Charge par côté, attention à l'équilibrage droite/gauche.",
    "items": [
      {
        "name": "Développé couché convergent",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Développé incliné convergent",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Développé décliné convergent",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Développé épaules convergent",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Tirage vertical convergent",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Tirage horizontal convergent",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Rowing unilatéral appui poitrine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Tirage bûcheron machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Pull-over plate-loaded",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Shrug machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Curl biceps plate-loaded",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Extension triceps plate-loaded",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Soulevé de terre machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 8
        }
      },
      {
        "name": "Chest press convergent",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Chest press debout",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "T bar",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Chest press allongé",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      }
    ]
  },
  {
    "group": "Smith machine / barre guidée",
    "note": "Barre sur rails : utile pour charger lourd en sécurité ou fixer une trajectoire.",
    "items": [
      {
        "name": "Développé couché à la Smith",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Développé incliné à la Smith",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Développé militaire à la Smith",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Squat à la Smith",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Squat bulgare à la Smith",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Fentes à la Smith",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Hip thrust à la Smith",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Rowing à la Smith",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Soulevé de terre roumain à la Smith",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Mollets debout à la Smith",
        "mode": "muscu",
        "defaults": {
          "sets": 4,
          "reps": 15
        }
      },
      {
        "name": "Shrug à la Smith",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      }
    ]
  },
  {
    "group": "Machines guidées — complément",
    "note": "Postes à charge sélectionnable moins courants dans la bibliothèque de base.",
    "items": [
      {
        "name": "Crunch machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Rotation du buste machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Extension lombaires machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Leg curl debout",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Kickback fessier machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Chest press unilatéral",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Butterfly inversé machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Tirage vertical prise large",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Tirage vertical prise serrée",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Dips machine",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      }
    ]
  },
  {
    "group": "Poulies — complément",
    "note": "Variantes de prise et d'angle sur la zone poulies.",
    "items": [
      {
        "name": "Tirage nuque poulie haute",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Crossover poulie haute",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Crossover poulie basse",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Kickback triceps poulie",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Curl unilatéral poulie",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Extension triceps unilatérale poulie",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Crunch à la poulie haute",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Rowing poulie basse prise large",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      }
    ]
  },
  {
    "group": "Haltères & barre — complément",
    "note": "Zone charges libres : barres olympiques, haltères, EZ, landmine.",
    "items": [
      {
        "name": "Développé décliné haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Développé Arnold",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Rowing Yates",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Curl incliné haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Curl concentration",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Curl barre EZ",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Élévations frontales haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Shrugs haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Shrugs barre",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Pull-over haltère",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Good morning barre",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Front squat barre",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 8
        }
      },
      {
        "name": "Soulevé de terre classique",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 6
        }
      },
      {
        "name": "Soulevé de terre sumo",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 6
        }
      },
      {
        "name": "Fentes latérales haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Step-up haltères",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Landmine press",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Landmine row",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Kettlebell swing",
        "mode": "muscu",
        "defaults": {
          "sets": 4,
          "reps": 15
        }
      },
      {
        "name": "Curl biceps rotation",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      }
    ]
  },
  {
    "group": "Élastiques / bandes de résistance",
    "note": "Tension de la bande à adapter au niveau du client ; utile en salle, à domicile ou en déplacement.",
    "items": [
      {
        "name": "Tirage menton élastique",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Curl biceps élastique",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Curl biceps unilatéral élastique",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Développé épaules élastique",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "RDL élastique",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "RDL unilatéral élastique",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Facepull élastique",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 15
        }
      },
      {
        "name": "Rowing pronation élastique",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Rowing supination élastique",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      },
      {
        "name": "Rowing unilatéral élastique",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 10
        }
      },
      {
        "name": "Triceps unilatéral élastique",
        "mode": "muscu",
        "defaults": {
          "sets": 3,
          "reps": 12
        }
      }
    ]
  }
];

/** Types de series en force athletique. */
export const PL_SET_TYPES = [
  {
    "id": "rampe",
    "label": "Montée"
  },
  {
    "id": "top",
    "label": "Top set"
  },
  {
    "id": "backoff",
    "label": "Back-off"
  },
  {
    "id": "travail",
    "label": "Travail"
  },
  {
    "id": "accessoire",
    "label": "Accessoire"
  }
];

/** Video de demonstration par exercice, indexee par cle d'exercice. */
export const EXERCISE_VIDEOS = {
  "abducteurs machine": "https://youtube.com/shorts/EqeOEtjAT1Y",
  "adducteurs machine": "https://youtube.com/shorts/IARHerJ1_Ww",
  "pec deck ecarte machine": "https://youtube.com/shorts/Z1AohjrZAQg",
  "chest press convergent": "https://youtube.com/shorts/PESSmrxQSAw",
  "chest press debout": "https://youtube.com/shorts/l-Vk6_V3J6Y",
  "curl marteau corde": "https://youtube.com/shorts/PYvRjPDa-GE",
  "curl marteau halteres": "https://youtube.com/shorts/VysBBkBHNnQ",
  "curl biceps machine": "https://youtube.com/shorts/vmoEP-ME2Hg",
  "developpe epaules machine": "https://youtube.com/shorts/gv4uJjNcEc0",
  "dips assistees": "https://youtube.com/shorts/VkFtPkBOUOg",
  "dips machine": "https://youtube.com/shorts/j4LMR8rdwOg",
  "elevations frontales halteres": "https://youtube.com/shorts/HKBWKsRzcgM",
  "elevations laterales halteres": "https://youtube.com/shorts/wGLidlVqI9s",
  "extension triceps corde": "https://youtube.com/shorts/vkqd9_iTJ3k",
  "face pull": "https://youtube.com/shorts/5Rr1Meo0dLQ",
  "bulgarian split squat": "https://youtube.com/shorts/BYJ3X_rGQkE",
  "fentes unilaterales": "https://youtube.com/shorts/r3aZfPPVmQg",
  "gainage planche": "https://youtube.com/shorts/XLDAZHTMdyE",
  "hip thrust machine": "https://youtube.com/shorts/rA6QacIDBPE",
  "leg curl allonge": "https://youtube.com/shorts/p6geLJ-JRIM",
  "leg curl debout": "https://youtube.com/shorts/4ww4zAN8VaQ",
  "leg extension": "https://youtube.com/shorts/meOJ_9YLPcw",
  "leg extension unilateral": "https://youtube.com/shorts/51TgSnzAxUw",
  "mollets assis": "https://youtube.com/shorts/JVDPgb5hy6k",
  "mountain climbers": "https://youtube.com/shorts/E6kOnrApXfY",
  "pendulum": "https://youtube.com/shorts/vHzfMG3BxB0",
  "pompes": "https://youtube.com/shorts/BZ2QZfLgfsI",
  "pompes prise large": "https://youtube.com/shorts/ue0NiIiID2Y",
  "presse a cuisses": "https://youtube.com/shorts/YuLA9MY2sXg",
  "souleve de terre roumain": "https://youtube.com/shorts/OVYq-Gi0A28",
  "squat barre": "https://youtube.com/shorts/NCDdI_ZzxXY",
  "t bar": "https://youtube.com/shorts/H4j-mSeLa24",
  "tirage horizontal unilateral poulie": "https://youtube.com/shorts/rYSq3nioAYc",
  "tirage haut technogym": "https://youtube.com/shorts/AvPSy_BlzjM",
  "tirage horizontal assis": "https://youtube.com/shorts/IGUfxUfuNBs",
  "tirage menton poulie basse": "https://youtube.com/shorts/Bi32YLvMf1M",
  "tirage vertical poitrine": "https://youtube.com/shorts/JdN64Ad98W8",
  "tirage vertical supination": "https://youtube.com/shorts/rtd3XPQG9EA",
  "tirage vertical unilateral": "https://youtube.com/shorts/uUItT-_l_DA",
  "tractions assistees": "https://youtube.com/shorts/I2jy0artTIQ",
  "developpe epaules convergent": "https://youtube.com/shorts/wwuzkOtrMgw",
  "v squat": "https://youtube.com/shorts/LOfNG1eWSZ8",
  "pompes prise serree": "https://youtube.com/shorts/9NVkVWuCHMw",
  "curl biceps rotation": "https://youtube.com/shorts/K6iGNC1tid0",
  "traineau": "https://youtube.com/shorts/8AgKPiZgNSI",
  "tirage dos au sol": "https://youtube.com/shorts/_LMPOeR_DdA",
  "chaise contre le mur": "https://youtube.com/shorts/ptQeP4hokPc",
  "montee sur pointe": "https://youtube.com/shorts/cf2usMSBeMc",
  "extension lombaires machine": "https://youtube.com/shorts/P8_GzApYDf0",
  "leg curl assis": "https://youtube.com/shorts/8oqpMStSWz0",
  "developpe couche barre": "https://youtube.com/shorts/C3L_5cza3Q0",
  "presse a cuisses inclinee": "https://youtube.com/shorts/fRxbecOYJ3Y",
  "belt squat": "https://youtube.com/shorts/Rg41r2i_ZBU",
  "developpe epaules debout": "https://youtube.com/shorts/CgHTZnOcxVo",
  "elevations laterales machine": "https://youtube.com/shorts/JdFKx_QvXuE",
  "developpe incline convergent": "https://youtube.com/shorts/BxkT0eKWPxw",
  "chest press allonge": "https://youtube.com/shorts/oz6HnDyW8VU",
  "developpe incline halteres": "https://youtube.com/shorts/ImbzBExlwZQ",
  "tirage vertical poulie": "https://youtube.com/shorts/N2DIh8ETS0Q",
  "rowing poulie basse": "https://youtube.com/shorts/brSP-yszxCk",
  "tractions": "https://youtube.com/shorts/6JsOgiFnnfA",
  "rowing barre supination": "https://youtube.com/shorts/ERODBSgTdBQ",
  "rowing barre pronation": "https://youtube.com/shorts/vrvrgu-THt8",
  "dips sur banc": "https://youtube.com/shorts/RpL4sCl1V-M",
  "rowing haltere un bras": "https://youtube.com/shorts/97bGsPyUikA",
  "developpe militaire halteres": "https://youtube.com/shorts/gqJT6D1DbeQ",
  "developpe couche halteres": "https://youtube.com/shorts/nXM5LBIkwCY",
  "curl poulie basse": "https://youtube.com/shorts/FqvatjRUhB4",
  "squat goblet": "https://youtube.com/shorts/Q_5o2CrwiTQ",
  "tirage vertical prise neutre": "https://youtube.com/shorts/cV5pPnnJgBk",
  "chest press unilateral": "https://youtube.com/shorts/bPoAVdjO5gM",
  "pullover machine": "https://youtube.com/shorts/8_aYibIfh4k",
  "curl incline halteres": "https://youtube.com/shorts/b8qHT1FlEpA",
  "tirage vertical unilateral prise neutre": "https://youtube.com/shorts/z_PEkHFay5M",
  "poulie vis a vis position haute": "https://youtube.com/shorts/EIYF4k1Ahs8",
  "poulie vis a vis position basse": "https://youtube.com/shorts/lNaKSmXWEL8",
  "poulie vis a vis position milieu": "https://youtube.com/shorts/YFLe-Ao4paw",
  "tirage menton elastique": "https://youtube.com/shorts/ufmqzF4EHM8",
  "curl biceps elastique": "https://youtube.com/shorts/-6t38BfyypU",
  "curl biceps unilateral elastique": "https://youtube.com/shorts/J-cDY2B36Qw",
  "developpe epaules elastique": "https://youtube.com/shorts/CduPWM2WG4Q",
  "rdl elastique": "https://youtube.com/shorts/6Wdndysosro",
  "rdl unilateral elastique": "https://youtube.com/shorts/2FurGml0pls",
  "facepull elastique": "https://youtube.com/shorts/GlyY0gwgT3Q",
  "rowing pronation elastique": "https://youtube.com/shorts/0b5YZ495Dps",
  "rowing supination elastique": "https://youtube.com/shorts/QkdIIh8TCT8",
  "rowing unilateral elastique": "https://youtube.com/shorts/OElmXDpBXp8",
  "triceps unilateral elastique": "https://youtube.com/shorts/-AnzncmbBt0"
};

/** Motifs proposes pour justifier un creneau manque. */
export const MISSED_REASONS = [
  {
    "id": "imprévu_pro",
    "label": "Imprévu professionnel"
  },
  {
    "id": "famille",
    "label": "Enfants / famille"
  },
  {
    "id": "fatigue",
    "label": "Fatigue / nuit courte"
  },
  {
    "id": "sante",
    "label": "Maladie / douleur"
  },
  {
    "id": "deplacement",
    "label": "Déplacement / voyage"
  },
  {
    "id": "oubli",
    "label": "Oubli"
  },
  {
    "id": "autre",
    "label": "Autre"
  }
];
