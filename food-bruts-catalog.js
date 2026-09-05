/* Coach Neiram — complement d'aliments bruts.
   Macros P/G/L pour 100 g. Ce fichier ne fait qu'alimenter
   window.__CN_FOOD_ITEMS__ : la recherche est assuree par le moteur unique
   de food-basic-catalog.js.

   Valeurs de reference issues des tables nutritionnelles publiques
   (Ciqual / ANSES pour la France, USDA FoodData Central). Ce ne sont pas
   des donnees copiees d'une application concurrente : la composition d'un
   aliment brut est un fait mesure, publie et librement reutilisable.

   Les feculents et legumineuses secs sont donnes CRUS quand c'est ainsi
   qu'on les pese, et CUITS quand c'est ainsi qu'on les sert. Melanger les
   deux est la premiere source d'erreur d'un journal alimentaire : 100 g de
   lentilles crues et 100 g de lentilles cuites n'ont rien a voir.

   tests/catalogue-bruts.test.mjs verifie la coherence de chaque ligne. */
(() => {
  const CAT_BRAND = { brut: 'Aliment brut', boisson: 'Boisson', courant: 'Aliment courant', plat: 'Plat préparé' };
  const F = (code, name, kcal, p, c, f, aliases) => ({
    code, product_name: name, product_name_fr: name, brands: CAT_BRAND.brut,
    nutriments: {
      'energy-kcal_100g': kcal, 'energy_100g': Math.round(kcal * 4.184),
      'proteins_100g': p, 'carbohydrates_100g': c, 'fat_100g': f
    },
    serving_quantity: 100,
    _cat: 'brut',
    _aliases: [name, ...(aliases || [])]
  });
  const register = (list) => {
    const store = (window.__CN_FOOD_ITEMS__ = window.__CN_FOOD_ITEMS__ || []);
    const seen = new Set(store.map(x => x.code));
    for (const it of list) if (!seen.has(it.code)) store.push(it);
    return store.length;
  };

  const items = [
    // ---- Viandes et abats ----
    F('cn-b-boeuf-hache-20','Steak haché 20% MG',250,17.0,0.0,20.0,['steak hache 20','boeuf hache 20']),
    F('cn-b-onglet','Onglet de bœuf',175,26.0,0.0,8.0,['onglet','onglet grille']),
    F('cn-b-paleron','Paleron de bœuf',185,26.0,0.0,9.0,['paleron','boeuf braise']),
    F('cn-b-joue-boeuf','Joue de bœuf',160,27.0,0.0,6.0,['joue de boeuf']),
    F('cn-b-cotelette-agneau','Côtelette d’agneau',245,24.0,0.0,16.0,['cotelette agneau']),
    F('cn-b-epaule-agneau','Épaule d’agneau',235,25.0,0.0,15.0,['epaule agneau']),
    F('cn-b-foie-volaille','Foie de volaille',125,20.0,1.0,4.5,['foie de poulet','foies de volaille']),
    F('cn-b-gesier','Gésier de volaille',115,20.0,0.0,4.0,['gesier','gesiers']),
    F('cn-b-coeur-boeuf','Cœur de bœuf',110,17.0,0.0,4.5,['coeur de boeuf']),
    F('cn-b-rognon-veau','Rognon de veau',105,17.0,0.0,4.0,['rognon','rognons']),
    F('cn-b-pintade','Pintade (blanc)',110,24.0,0.0,1.5,['pintade']),
    F('cn-b-caille','Caille',135,22.0,0.0,5.0,['caille','cailles']),
    F('cn-b-cuisse-canard','Cuisse de canard',200,20.0,0.0,13.0,['cuisse canard']),
    F('cn-b-boudin-noir','Boudin noir',320,14.0,3.0,28.0,['boudin']),

    // ---- Poissons et fruits de mer ----
    F('cn-b-lieu-noir','Lieu noir',80,18.0,0.0,1.0,['lieu noir']),
    F('cn-b-eglefin','Églefin',75,17.0,0.0,0.6,['eglefin','haddock frais']),
    F('cn-b-fletan','Flétan',105,20.0,0.0,2.5,['fletan']),
    F('cn-b-raie','Raie',90,20.0,0.0,1.0,['aile de raie']),
    F('cn-b-rouget','Rouget',105,19.0,0.0,3.0,['rouget barbet']),
    F('cn-b-tilapia','Tilapia',96,20.0,0.0,1.7,['tilapia']),
    F('cn-b-espadon','Espadon',145,20.0,0.0,7.0,['espadon']),
    F('cn-b-thon-rouge','Thon rouge cru',145,23.0,0.0,5.5,['thon rouge','sashimi thon']),
    F('cn-b-poulpe','Poulpe',82,15.0,2.2,1.0,['poulpe','pieuvre']),
    F('cn-b-seiche','Seiche',80,16.0,0.7,0.7,['seiche','encornet']),
    F('cn-b-bulot','Bulot',90,18.0,2.0,0.5,['bulot','bulots']),
    F('cn-b-palourde','Palourde',75,13.0,2.5,1.0,['palourde','palourdes']),
    F('cn-b-langoustine','Langoustine',90,19.0,0.0,1.5,['langoustine','langoustines']),
    F('cn-b-homard','Homard',90,19.0,0.5,1.0,['homard']),

    // ---- Legumineuses ----
    F('cn-b-flageolets-cuits','Flageolets cuits',115,7.5,16.0,0.6,['flageolet','flageolets']),
    F('cn-b-coco-blanc-cuits','Haricots coco cuits',120,8.0,17.0,0.7,['haricot coco','cocos']),
    F('cn-b-azuki-cuits','Haricots azuki cuits',128,7.5,20.0,0.2,['azuki','haricot azuki']),
    F('cn-b-lentilles-vertes-crues','Lentilles vertes crues',335,25.0,45.0,1.5,['lentille verte crue']),
    F('cn-b-lentilles-beluga-cuites','Lentilles beluga cuites',140,10.0,20.0,0.7,['beluga','lentille noire']),
    F('cn-b-pois-casses-crus','Pois cassés crus',340,24.0,50.0,1.5,['pois casse cru']),
    F('cn-b-lupin','Graines de lupin',120,16.0,4.0,3.0,['lupin']),

    // ---- Cereales et graines ----
    F('cn-b-epeautre-cuit','Épeautre cuit',130,5.5,25.0,0.9,['epeautre']),
    F('cn-b-petit-epeautre-cuit','Petit épeautre cuit',125,5.0,24.0,0.8,['petit epeautre','engrain']),
    F('cn-b-millet-cuit','Millet cuit',120,3.5,23.0,1.0,['millet']),
    F('cn-b-orge-perle-cuit','Orge perlé cuit',123,2.3,28.0,0.4,['orge perle','orge']),
    F('cn-b-seigle-grain','Seigle en grains',335,10.0,69.0,1.6,['seigle']),
    F('cn-b-amarante-cuite','Amarante cuite',102,3.8,19.0,1.6,['amarante']),
    F('cn-b-teff','Teff cru',365,13.0,70.0,2.4,['teff']),
    F('cn-b-avoine-crue','Avoine crue (grain)',380,13.0,60.0,7.0,['avoine','gruau avoine']),
    F('cn-b-son-ble','Son de blé',215,16.0,22.0,4.3,['son de ble']),
    F('cn-b-germe-ble','Germe de blé',360,27.0,40.0,10.0,['germe de ble']),
    F('cn-b-sarrasin-cru','Sarrasin cru',345,13.0,62.0,3.4,['sarrasin cru','ble noir']),
    F('cn-b-quinoa-rouge-cuit','Quinoa rouge cuit',120,4.4,21.0,1.9,['quinoa rouge']),
    F('cn-b-graines-pavot','Graines de pavot',525,18.0,8.5,42.0,['pavot']),
    F('cn-b-graines-chanvre','Graines de chanvre décortiquées',553,32.0,8.0,49.0,['chanvre','graines de chanvre']),

    // ---- Fruits ----
    F('cn-b-goyave','Goyave',68,2.6,14.0,1.0,['goyave']),
    F('cn-b-physalis','Physalis',53,1.9,11.0,0.7,['physalis','amour en cage']),
    F('cn-b-canneberge','Canneberge fraîche',46,0.4,12.0,0.1,['canneberge','cranberry fraiche']),
    F('cn-b-airelle','Airelle',46,0.5,11.0,0.3,['airelle','airelles']),
    F('cn-b-kumquat','Kumquat',71,1.9,16.0,0.9,['kumquat']),
    F('cn-b-nefle','Nèfle du Japon',47,0.4,12.0,0.2,['nefle','bibace']),
    F('cn-b-mirabelle','Mirabelle',64,0.8,15.0,0.2,['mirabelle','mirabelles']),
    F('cn-b-quetsche','Quetsche',52,0.7,12.0,0.2,['quetsche','quetsches']),
    F('cn-b-reine-claude','Reine-claude',56,0.8,13.0,0.2,['reine claude']),
    F('cn-b-brugnon','Brugnon',44,1.1,9.0,0.3,['brugnon']),
    F('cn-b-griotte','Cerise griotte',50,1.0,11.0,0.3,['griotte','cerise acide']),
    F('cn-b-banane-plantain','Banane plantain crue',122,1.3,32.0,0.4,['plantain','banane plantain']),
    F('cn-b-mangue-sechee','Mangue séchée',315,2.5,74.0,1.2,['mangue sechee']),
    F('cn-b-pomme-sechee','Pomme séchée',245,1.0,60.0,0.6,['pomme sechee']),
    F('cn-b-poire-sechee','Poire séchée',260,1.9,63.0,0.6,['poire sechee']),

    // ---- Legumes ----
    F('cn-b-patisson','Pâtisson',20,1.2,3.0,0.2,['patisson']),
    F('cn-b-chou-chinois','Chou chinois',13,1.2,1.2,0.2,['chou chinois','pe tsai']),
    F('cn-b-pak-choi','Pak choï',13,1.5,1.2,0.2,['pak choi','bok choy']),
    F('cn-b-chou-rave','Chou-rave',27,1.7,4.0,0.1,['chou rave','kohlrabi']),
    F('cn-b-chou-milan','Chou de Milan',28,2.0,4.0,0.2,['chou milan','chou frise vert']),
    F('cn-b-salsifis','Salsifis',73,3.0,13.0,0.2,['salsifis','scorsonere']),
    F('cn-b-crosne','Crosne',75,2.5,15.0,0.2,['crosne','crosnes']),
    F('cn-b-cardon','Cardon',17,0.7,2.7,0.1,['cardon']),
    F('cn-b-pourpier','Pourpier',16,1.3,1.5,0.4,['pourpier']),
    F('cn-b-pissenlit','Pissenlit (feuilles)',45,2.7,5.7,0.7,['pissenlit']),
    F('cn-b-asperge-blanche','Asperge blanche',22,2.2,2.0,0.2,['asperge blanche']),
    F('cn-b-haricot-beurre','Haricot beurre',31,1.9,4.5,0.2,['haricot beurre','haricot jaune']),
    F('cn-b-haricot-plat','Haricot plat',33,2.0,4.8,0.2,['haricot plat','haricot coco plat']),
    F('cn-b-courge-musquee','Courge musquée',26,1.0,5.5,0.1,['courge musquee','doubeurre']),
    F('cn-b-igname','Igname',118,1.5,27.0,0.2,['igname']),
    F('cn-b-manioc','Manioc',160,1.4,38.0,0.3,['manioc','cassave']),
    F('cn-b-chataigne','Châtaigne cuite',180,2.5,38.0,1.4,['chataigne','marron']),

    // ---- Produits laitiers ----
    F('cn-b-fromage-brebis','Fromage de brebis',370,24.0,1.0,30.0,['brebis','ossau iraty']),
    F('cn-b-yaourt-brebis','Yaourt de brebis nature',95,5.0,5.0,6.0,['yaourt brebis']),
    F('cn-b-yaourt-chevre','Yaourt de chèvre nature',70,4.0,4.5,4.0,['yaourt chevre']),
    F('cn-b-lait-chevre','Lait de chèvre',68,3.4,4.5,4.1,['lait de chevre']),
    F('cn-b-lait-brebis','Lait de brebis',105,5.6,5.0,6.5,['lait de brebis']),
    F('cn-b-tomme','Tomme de Savoie',345,25.0,1.0,27.0,['tomme']),
    F('cn-b-reblochon','Reblochon',330,20.0,1.0,27.0,['reblochon']),
    F('cn-b-munster','Munster',330,20.0,1.0,27.0,['munster']),
    F('cn-b-saint-nectaire','Saint-Nectaire',340,23.0,1.0,27.0,['saint nectaire']),
    F('cn-b-morbier','Morbier',350,23.0,1.0,28.0,['morbier']),
    F('cn-b-raclette','Fromage à raclette',355,23.0,1.0,29.0,['raclette']),
    F('cn-b-mimolette','Mimolette',360,25.0,1.0,28.0,['mimolette']),
    F('cn-b-gouda','Gouda',360,25.0,2.0,28.0,['gouda']),
    F('cn-b-edam','Edam',330,26.0,1.0,25.0,['edam']),

    /* ---- Divers ----
       Spiruline et psyllium ont ete ecartes : leur valeur energetique
       publiee ne se deduit pas de leurs macronutriments (fibres non
       assimilees pour l'un, facteurs de conversion specifiques pour
       l'autre). Le catalogue n'a pas de champ « fibres » : les inscrire
       obligerait soit a afficher une valeur incoherente, soit a inventer
       des macros pour retomber sur le bon total. Ni l'un ni l'autre. */
    F('cn-b-levure-nutritionnelle','Levure nutritionnelle',350,45.0,20.0,5.0,['levure maltee','levure nutritionnelle']),
    F('cn-b-cacao-degraisse','Cacao en poudre non sucré',230,20.0,15.0,11.0,['cacao','cacao non sucre']),
    F('cn-b-caroube','Caroube en poudre',220,4.6,49.0,0.7,['caroube']),
    F('cn-b-agar-agar','Agar-agar',26,0.5,6.0,0.0,['agar agar']),
    F('cn-b-graines-germees','Graines germées (mélange)',30,3.0,3.0,0.5,['graines germees','pousses'])
  ];

  register(items);
})();
