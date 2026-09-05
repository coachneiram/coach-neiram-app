/* Coach Neiram — catalogue fruits/légumes bruts, cafés, thés et infusions.
   Macros P/G/L pour 100 g. Ce fichier est chargé en dernier : il enregistre ses
   aliments puis installe le moteur de recherche commun. */
(() => {
  const CAT_BRAND = { brut: 'Aliment brut', boisson: 'Boisson', courant: 'Aliment courant', plat: 'Plat préparé' };
  const CAT_OF = (code) => /^cn-(f|v|fr|p|d|s)-/.test(code) ? 'brut'
    : /^cn-(b|the|infusion|boisson)-/.test(code) ? 'boisson'
    : /^cn-r-/.test(code) ? 'plat' : 'courant';
  const F = (code, name, kcal, p, c, f, aliases) => {
    const cat = CAT_OF(code);
    return {
      code, product_name: name, product_name_fr: name, brands: CAT_BRAND[cat],
      nutriments: {
        'energy-kcal_100g': kcal, 'energy_100g': Math.round(kcal * 4.184),
        'proteins_100g': p, 'carbohydrates_100g': c, 'fat_100g': f
      },
      serving_quantity: 100,
      _cat: cat,
      _aliases: [name, ...(aliases || [])]
    };
  };
  const register = (list) => {
    const store = (window.__CN_FOOD_ITEMS__ = window.__CN_FOOD_ITEMS__ || []);
    const seen = new Set(store.map(x => x.code));
    for (const it of list) if (!seen.has(it.code)) store.push(it);
    return store.length;
  };
  const items = [
    F('cn-fr-banane','Banane',89,1.1,22.8,0.3,['banane','bananes','banane plantain','plantain']),
    F('cn-fr-raisin-blanc','Raisin blanc',69,0.6,16,0.2,['raisin','raisins','raisin blanc','raisin vert','raisin muscat']),
    F('cn-fr-raisin-noir','Raisin noir',69,0.6,16,0.2,['raisin noir','raisin rouge']),
    F('cn-fr-pomme','Pomme',52,0.3,11.4,0.2,['pomme','pommes']),
    F('cn-fr-pomme-golden','Pomme Golden',52,0.3,11.4,0.2,['pomme golden','golden']),
    F('cn-fr-pomme-gala','Pomme Gala',52,0.3,11.4,0.2,['pomme gala','gala']),
    F('cn-fr-pomme-granny','Pomme Granny Smith',52,0.3,11.4,0.2,['pomme granny','granny smith']),
    F('cn-fr-pomme-pink-lady','Pomme Pink Lady',52,0.3,11.4,0.2,['pomme pink lady','pink lady']),
    F('cn-fr-poire','Poire',57,0.4,12.5,0.1,['poire','poires']),
    F('cn-fr-poire-conference','Poire Conférence',57,0.4,12.5,0.1,['poire conference','conference']),
    F('cn-fr-poire-williams','Poire Williams',57,0.4,12.5,0.1,['poire williams','williams']),
    F('cn-fr-orange','Orange',47,0.9,11.8,0.1,['orange','oranges']),
    F('cn-fr-clementine','Clémentine',47,0.9,12,0.2,['clementine','clementines']),
    F('cn-fr-mandarine','Mandarine',53,0.8,13.3,0.3,['mandarine','mandarines']),
    F('cn-fr-citron','Citron',29,1.1,9.3,0.3,['citron','citrons']),
    F('cn-fr-citron-vert','Citron vert',30,0.7,10.5,0.2,['citron vert','lime']),
    F('cn-fr-pomelo','Pomelo / pamplemousse',38,0.8,9.2,0.1,['pomelo','pamplemousse','pamplemousses']),
    F('cn-fr-kiwi','Kiwi vert',61,1.1,14.7,0.5,['kiwi','kiwis','kiwi vert']),
    F('cn-fr-kiwi-gold','Kiwi jaune Gold',63,1.2,15.8,0.3,['kiwi jaune','kiwi gold']),
    F('cn-fr-peche','Pêche',39,0.9,8,0.3,['peche','peches','peche jaune','peche blanche']),
    F('cn-fr-nectarine','Nectarine',44,1.1,9.2,0.3,['nectarine','nectarines']),
    F('cn-fr-abricot','Abricot',48,1.4,9.1,0.4,['abricot','abricots']),
    F('cn-fr-prune','Prune',46,0.7,10,0.3,['prune','prunes','prune rouge','prune jaune']),
    F('cn-fr-cerise','Cerise',63,1.1,16,0.2,['cerise','cerises']),
    F('cn-fr-fraise','Fraise',32,0.7,6,0.3,['fraise','fraises']),
    F('cn-fr-framboise','Framboise',52,1.2,11.9,0.7,['framboise','framboises']),
    F('cn-fr-myrtille','Myrtille',57,0.7,14.5,0.3,['myrtille','myrtilles']),
    F('cn-fr-mure','Mûre',43,1.4,9.6,0.5,['mure','mures']),
    F('cn-fr-groseille','Groseille',56,1.4,13.8,0.2,['groseille','groseilles']),
    F('cn-fr-cassis','Cassis',63,1.4,15.4,0.4,['cassis']),
    F('cn-fr-melon','Melon',34,0.8,7.3,0.2,['melon','melons','melon charentais','cantaloup']),
    F('cn-fr-pasteque','Pastèque',30,0.6,7.2,0.2,['pasteque','pastèque']),
    F('cn-fr-ananas','Ananas',50,0.5,13,0.1,['ananas']),
    F('cn-fr-mangue','Mangue',60,0.8,15,0.4,['mangue','mangues']),
    F('cn-fr-papaye','Papaye',43,0.5,10.8,0.3,['papaye','papayes']),
    F('cn-fr-passion','Fruit de la passion',97,2.2,23,0.7,['fruit de la passion','fruit passion','passion']),
    F('cn-fr-grenade','Grenade',83,1.7,18.7,1.2,['grenade','grenades']),
    F('cn-fr-figue','Figue fraîche',74,0.8,19.2,0.3,['figue','figues','figue fraiche']),
    F('cn-fr-datte-fraiche','Datte fraîche',142,1.8,33,0.2,['datte','datte fraiche','dattes fraiches']),
    F('cn-fr-kaki','Kaki',70,0.6,18.6,0.2,['kaki','kakis']),
    F('cn-fr-litchi','Litchi',66,0.8,16.5,0.4,['litchi','litchis','lychee']),
    F('cn-fr-noix-coco','Noix de coco fraîche',354,3.3,15,33.5,['noix de coco','coco']),
    F('cn-fr-avocat','Avocat',160,2,8.5,14.7,['avocat','avocats']),
    F('cn-fr-coing','Coing',57,0.4,15.3,0.1,['coing','coings']),
    F('cn-fr-carambole','Carambole',31,1,6.7,0.3,['carambole','caramboles']),
    F('cn-fr-figue-barbarie','Figue de Barbarie',41,0.7,9.6,0.5,['figue de barbarie','figues de barbarie']),
    F('cn-fr-tomate','Tomate',18,0.9,3.9,0.2,['tomate','tomates','tomate ronde','tomates rondes']),
    F('cn-fr-tomate-grappe','Tomate grappe',18,0.9,3.9,0.2,['tomate grappe','tomates grappe']),
    F('cn-fr-tomate-cerise','Tomate cerise',18,0.9,3.9,0.2,['tomate cerise','tomates cerises']),
    F('cn-fr-concombre','Concombre',15,0.7,3.6,0.1,['concombre','concombres']),
    F('cn-fr-courgette','Courgette',17,1.2,3.1,0.3,['courgette','courgettes']),
    F('cn-fr-courgette-jaune','Courgette jaune',17,1.2,3.1,0.3,['courgette jaune']),
    F('cn-fr-aubergine','Aubergine',25,1,5.9,0.2,['aubergine','aubergines']),
    F('cn-fr-poivron-rouge','Poivron rouge',31,1,6,0.3,['poivron rouge']),
    F('cn-fr-poivron-vert','Poivron vert',20,0.9,4.6,0.2,['poivron vert']),
    F('cn-fr-poivron-jaune','Poivron jaune',27,1,6.3,0.2,['poivron jaune']),
    F('cn-fr-poivron','Poivron',27,1,6.3,0.2,['poivron','poivrons']),
    F('cn-fr-carotte','Carotte',36,0.9,9.6,0.2,['carotte','carottes','carotte nouvelle']),
    F('cn-fr-betterave','Betterave rouge',43,1.6,9.6,0.2,['betterave','betteraves','betterave rouge']),
    F('cn-fr-radis','Radis',16,0.7,3.4,0.1,['radis','radis rose','radis noir']),
    F('cn-fr-navet','Navet',28,0.9,6.4,0.1,['navet','navets']),
    F('cn-fr-poireau','Poireau',31,1.5,6.3,0.3,['poireau','poireaux']),
    F('cn-fr-oignon','Oignon',40,1.1,9.3,0.1,['oignon','oignons','oignon jaune','oignon rouge','oignon blanc']),
    F('cn-fr-ail','Ail',149,6.4,33,0.5,['ail','gousse ail','gousses ail']),
    F('cn-fr-echalote','Échalote',72,2.5,16.8,0.1,['echalote','echalotes']),
    F('cn-fr-pomme-terre','Pomme de terre',77,2,17,0.1,['pomme de terre','pommes de terre','pdt','pomme de terre nouvelle']),
    F('cn-fr-patate-douce','Patate douce',86,1.6,20,0.1,['patate douce','patates douces']),
    F('cn-fr-butternut','Courge butternut',45,1,11.7,0.1,['butternut','courge butternut']),
    F('cn-fr-potimarron','Potimarron',34,1.2,7.5,0.2,['potimarron','potimarrons']),
    F('cn-fr-potiron','Potiron',26,1,6.5,0.1,['potiron','potirons']),
    F('cn-fr-courge-spaghetti','Courge spaghetti',31,0.6,6.5,0.6,['courge spaghetti']),
    F('cn-fr-brocoli','Brocoli',34,2.8,6.6,0.4,['brocoli','brocolis']),
    F('cn-fr-chou-fleur','Chou-fleur',25,1.9,5,0.3,['chou fleur','chou-fleur','choux fleurs']),
    F('cn-fr-chou-blanc','Chou blanc',25,1.3,5.8,0.1,['chou blanc','chou vert','chou cabus']),
    F('cn-fr-chou-rouge','Chou rouge',31,1.4,7.4,0.2,['chou rouge']),
    F('cn-fr-kale','Chou kale',49,4.3,8.8,0.9,['kale','chou kale']),
    F('cn-fr-choux-bruxelles','Choux de Bruxelles',43,3.4,9,0.3,['chou de bruxelles','choux de bruxelles']),
    F('cn-fr-epinard','Épinards',23,2.9,3.6,0.4,['epinard','epinards','jeunes pousses epinard']),
    F('cn-fr-laitue','Laitue / salade verte',15,1.4,2.9,0.2,['laitue','salade verte','batavia']),
    F('cn-fr-romaine','Salade romaine',17,1.2,3.3,0.3,['romaine','salade romaine']),
    F('cn-fr-mache','Mâche',19,2,3.6,0.4,['mache']),
    F('cn-fr-roquette','Roquette',25,2.6,3.7,0.7,['roquette']),
    F('cn-fr-endive','Endive',17,0.9,3.4,0.1,['endive','endives','chicon']),
    F('cn-fr-fenouil','Fenouil',31,1.2,7.3,0.2,['fenouil','fenouils']),
    F('cn-fr-celeri-branche','Céleri branche',16,0.7,3,0.2,['celeri branche','celeri']),
    F('cn-fr-celeri-rave','Céleri-rave',42,1.5,9.2,0.3,['celeri rave','celeri-rave']),
    F('cn-fr-haricot-vert','Haricot vert',31,1.8,7,0.2,['haricot vert','haricots verts']),
    F('cn-fr-petits-pois','Petits pois frais',81,5.4,14.5,0.4,['petit pois','petits pois','petits pois frais']),
    F('cn-fr-asperge','Asperge',20,2.2,3.9,0.1,['asperge','asperges','asperge verte','asperge blanche']),
    F('cn-fr-artichaut','Artichaut',47,3.3,10.5,0.2,['artichaut','artichauts']),
    F('cn-fr-champignon','Champignon de Paris',22,3.1,3.3,0.3,['champignon de paris','champignons de paris','champignon']),
    F('cn-fr-mais','Maïs frais',86,3.3,19,1.2,['mais','maïs','epi de mais','épi de maïs']),
    F('cn-fr-panais','Panais',75,1.2,18,0.3,['panais']),
    F('cn-fr-topinambour','Topinambour',72,2,17.4,0.1,['topinambour','topinambours']),
    F('cn-fr-rutabaga','Rutabaga',37,1.1,8.6,0.2,['rutabaga']),
    F('cn-fr-blette','Blette',19,1.8,3.7,0.2,['blette','blettes']),
    F('cn-fr-cresson','Cresson',17,2.3,1.3,0.1,['cresson']),
    F('cn-fr-oseille','Oseille',22,2,3.2,0.7,['oseille']),
    F('cn-fr-feve','Fève fraîche',88,7.9,11.7,0.6,['feve','feves','feves fraiches']),
    F('cn-boisson-espresso','Café espresso',2,0.2,0,0,['cafe','café','espresso','expresso','cafe espresso','café espresso']),
    F('cn-boisson-cafe-allonge','Café allongé',2,0.2,0,0,['cafe allonge','café allongé','long black']),
    F('cn-boisson-cafe-filtre','Café filtre',2,0.2,0,0,['cafe filtre','café filtre','cafe filtre maison']),
    F('cn-boisson-cafe-americain','Café américain',2,0.2,0,0,['cafe americain','café américain','americano']),
    F('cn-boisson-cafe-deca','Café décaféiné',2,0.2,0,0,['cafe deca','café déca','cafe decafeine','café décaféiné','decafeine']),
    F('cn-boisson-cafe-soluble','Café soluble',2,0.2,0,0,['cafe soluble','café soluble','cafe instantane','café instantané']),
    F('cn-boisson-cafe-au-lait','Café au lait',30,1.8,2.5,1.5,['cafe au lait','café au lait']),
    F('cn-boisson-cafe-lait','Café avec lait',30,1.8,2.5,1.5,['cafe lait','café lait','cafe avec lait','café avec lait']),
    F('cn-boisson-cappuccino','Cappuccino',45,2.4,3.4,2,['cappuccino','cappucino']),
    F('cn-boisson-latte','Café latte',45,2.5,3.6,2,['latte','cafe latte','café latte','caffe latte']),
    F('cn-boisson-flat-white','Flat white',40,2.4,3.2,1.8,['flat white']),
    F('cn-boisson-macchiato','Café macchiato',25,1.3,1.8,1,['macchiato','cafe macchiato','café macchiato']),
    F('cn-boisson-mocha','Café mocha',70,2.4,9,2.6,['mocha','moka','cafe mocha','café mocha']),
    F('cn-boisson-irish-coffee','Irish coffee',90,0.6,4,4,['irish coffee']),
    F('cn-boisson-cold-brew','Cold brew',2,0.2,0,0,['cold brew','coldbrew']),
    F('cn-boisson-cafe-glace','Café glacé',3,0.2,0.5,0,['cafe glace','café glacé','iced coffee','iced cafe']),
    F('cn-boisson-frappe-cafe','Café frappé',3,0.2,0.5,0,['cafe frappe','café frappé','frappe coffee']),
    F('cn-the-noir','Thé noir',1,0,0.2,0,['the noir','thé noir','black tea','english breakfast','earl grey','earl gray','assam','darjeeling','ceylan']),
    F('cn-the-vert','Thé vert',1,0,0.2,0,['the vert','thé vert','green tea','sencha','matcha','gunpowder']),
    F('cn-the-blanc','Thé blanc',1,0,0.2,0,['the blanc','thé blanc','white tea']),
    F('cn-the-oolong','Thé Oolong',1,0,0.2,0,['oolong','the oolong','thé oolong']),
    F('cn-the-pu-erh','Thé Pu-erh',1,0,0.2,0,['pu erh','pu-erh','the pu erh','thé pu erh']),
    F('cn-the-chai','Thé chai',2,0.2,0.4,0,['chai','the chai','thé chai','masala chai']),
    F('cn-the-matcha','Thé matcha',3,0.3,0.5,0,['matcha','the matcha','thé matcha']),
    F('cn-the-menthe','Thé à la menthe',1,0,0.2,0,['the menthe','thé menthe','the a la menthe','thé à la menthe']),
    F('cn-the-citron','Thé au citron',2,0,0.4,0,['the citron','thé citron','the au citron','thé au citron']),
    F('cn-the-peche','Thé à la pêche',13,0,3.2,0,['the peche','thé pêche','the a la peche','thé à la pêche']),
    F('cn-the-glace','Thé glacé non sucré',1,0,0.2,0,['the glace','thé glacé','the glace sans sucre','thé glacé sans sucre','ice tea sans sucre']),
    F('cn-infusion-menthe','Infusion menthe',1,0,0.2,0,['tisane menthe','tisane à la menthe','infusion menthe','infusion de menthe']),
    F('cn-infusion-verveine','Infusion verveine',1,0,0.2,0,['tisane verveine','infusion verveine','verveine']),
    F('cn-infusion-camomille','Infusion camomille',1,0,0.2,0,['tisane camomille','infusion camomille','camomille']),
    F('cn-infusion-tilleul','Infusion tilleul',1,0,0.2,0,['tisane tilleul','infusion tilleul','tilleul']),
    F('cn-infusion-verveine-menthe','Infusion verveine-menthe',1,0,0.2,0,['verveine menthe','tisane verveine menthe','infusion verveine menthe']),
    F('cn-infusion-gingembre','Infusion gingembre',2,0,0.4,0,['tisane gingembre','infusion gingembre','gingembre infusion']),
    F('cn-infusion-citron','Infusion citron',2,0,0.4,0,['tisane citron','infusion citron','citron infusion']),
    F('cn-infusion-fruits-rouges','Infusion fruits rouges',2,0,0.4,0,['tisane fruits rouges','infusion fruits rouges','fruits rouges infusion']),
    F('cn-infusion-fruits','Infusion fruits',2,0,0.4,0,['tisane fruits','infusion fruits']),
    F('cn-infusion-cannelle','Infusion cannelle',2,0,0.4,0,['tisane cannelle','infusion cannelle','cannelle infusion']),
    F('cn-infusion-hibiscus','Infusion hibiscus',1,0,0.2,0,['tisane hibiscus','infusion hibiscus','hibiscus']),
    F('cn-infusion-fenouil','Infusion fenouil',1,0,0.2,0,['tisane fenouil','infusion fenouil']),
    F('cn-infusion-romarin','Infusion romarin',1,0,0.2,0,['tisane romarin','infusion romarin']),
    F('cn-infusion-lavande','Infusion lavande',1,0,0.2,0,['tisane lavande','infusion lavande']),
    F('cn-infusion-relax','Infusion relaxante',1,0,0.2,0,['tisane relaxante','infusion relaxante','tisane relaxation','infusion sommeil']),
    F('cn-infusion-digestion','Infusion digestion',1,0,0.2,0,['tisane digestion','infusion digestion','tisane digestive','infusion digestive'])
  ];
  window.__COACH_NEIRAM_BASIC_PRODUCE__ = items.length;
  register(items);
})();

/* Coach Neiram — moteur de recherche alimentaire local.
   Chargé en dernier : consomme window.__CN_FOOD_ITEMS__ alimenté par les
   catalogues, installe UNE seule interception fetch (au lieu de deux
   imbriquées) et classe les résultats aliment brut > courant > plat. */
(() => {
  const items = window.__CN_FOOD_ITEMS__ || [];
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ')
    .replace(/[-_/]/g, ' ').replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  // pluriel simple : brocolis -> brocoli, raisins -> raisin, choux -> chou
  const stem = (t) => t.length > 3 && /(s|x)$/.test(t) ? t.slice(0, -1) : t;
  const stemAll = (s) => norm(s).split(' ').map(stem).join(' ');

  const CAT_SCORE = { brut: 60, boisson: 55, courant: 25, plat: 0 };

  const index = items.map(it => ({
    item: it,
    keys: (it._aliases || []).map(a => ({ raw: norm(a), stem: stemAll(a) }))
  }));

  function scoreOne(entry, qn, qs, qTokens) {
    let best = 0;
    for (const k of entry.keys) {
      let s = 0;
      if (k.raw === qn || k.stem === qs) s = 1000;
      else if (k.stem.startsWith(qs + ' ')) s = 820 - Math.min(120, k.stem.length - qs.length);
      else if (k.stem.startsWith(qs)) s = 780 - Math.min(120, k.stem.length - qs.length);
      else {
        const kt = k.stem.split(' ');
        let hit = 0;
        for (const t of qTokens) if (kt.some(x => x === t || x.startsWith(t))) hit++;
        if (hit === qTokens.length) s = 620 - Math.min(140, k.stem.length - qs.length);
        else if (hit > 0) s = Math.round(320 * hit / qTokens.length);
      }
      if (s > best) best = s;
    }
    return best ? best + (CAT_SCORE[entry.item._cat] || 0) : 0;
  }

  function searchLocal(q) {
    const qn = norm(q);
    if (!qn) return [];
    const qs = stemAll(q);
    const qTokens = qs.split(' ').filter(Boolean);
    const out = [];
    for (const e of index) {
      const s = scoreOne(e, qn, qs, qTokens);
      if (s >= 280) out.push({ s, item: e.item });
    }
    out.sort((a, b) => b.s - a.s || a.item.product_name.length - b.item.product_name.length);
    const seen = new Set(), res = [];
    for (const r of out) {
      const key = stemAll(r.item.product_name);
      if (seen.has(key)) continue;
      seen.add(key);
      res.push(r);
      if (res.length >= 12) break;
    }
    return res;
  }

  // Produits Open Food Facts à écarter quand la requête vise un aliment simple
  const COMPOSITE = /(cordon bleu|nugget|pane|panne|farci|recette|plat |bolognaise|lasagne|quiche|tarte|gratin|pizza|burger|sandwich|wrap |salade compos|assiette|bowl|surgele|preparation|barre|biscuit|gateau|gaufre|cookie|dessert|compote|confiture|sirop|nectar|smoothie|chips|sauce|soupe|veloute|crumble|muesli|cereales)/i;

  const clean = (p) => { const { _aliases, _cat, ...rest } = p; return rest; };

  const previousFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    let url = '';
    try { url = typeof input === 'string' ? input : (input && input.url) || ''; } catch (e) {}
    if (!url || !/world\.openfoodfacts\.org\/cgi\/search\.pl/i.test(url)) {
      return previousFetch(input, init);
    }
    let q = '';
    try { q = new URL(url, window.location.href).searchParams.get('search_terms') || ''; } catch (e) {}
    let local = [];
    try { local = searchLocal(q); } catch (e) { local = []; }

    const strong = local.filter(r => r.s >= 780);
    const topIsSimple = local.length > 0 && local[0].item._cat !== 'plat';

    // Assez de bons résultats locaux : on répond sans appel réseau (plus rapide)
    if (strong.length >= 4) {
      return new Response(JSON.stringify({
        count: local.length, page: 1, page_count: 1, page_size: local.length,
        products: local.map(r => clean(r.item))
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    let apiProducts = [];
    try {
      const r = await previousFetch(input, init);
      if (r.ok) {
        const data = await r.json();
        apiProducts = data.products || [];
      }
    } catch (e) { apiProducts = []; }

    if (topIsSimple) {
      const filtered = apiProducts.filter(p =>
        !COMPOSITE.test(`${p.product_name_fr || ''} ${p.product_name || ''}`));
      if (filtered.length) apiProducts = filtered;
    }

    const seen = new Set(local.map(r => stemAll(r.item.product_name)));
    const rest = apiProducts.filter(p => {
      const k = stemAll(p.product_name_fr || p.product_name || '');
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const products = [...local.map(r => clean(r.item)), ...rest].slice(0, 15);
    if (!products.length) {
      return new Response(JSON.stringify({ count: 0, page: 1, page_count: 1, page_size: 0, products: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      count: products.length, page: 1, page_count: 1, page_size: products.length, products
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  window.__CN_FOOD_SEARCH__ = searchLocal;
  window.__CN_FOOD_TOTAL__ = items.length;
})();
