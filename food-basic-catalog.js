/* Coach Neiram — catalogue local fruits/légumes bruts + boissons chaudes.
   Complément non propriétaire à Open Food Facts : conçu pour les recherches simples
   de supermarché et restaurant. */
(() => {
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ").replace(/[-_/]/g, " ").replace(/\s+/g, " ").trim();
  const F = (code, name, kcal, aliases) => ({ code, product_name: name, product_name_fr: name, brands: "Aliment brut", nutriments: { "energy-kcal_100g": kcal }, serving_quantity: 100, _aliases: aliases });
  const items = [
    F("cn-fr-banane", "Banane", 89, ["banane","bananes","banane plantain","plantain"]),
    F("cn-fr-raisin-blanc", "Raisin blanc", 69, ["raisin","raisins","raisin blanc","raisin vert","raisin muscat"]),
    F("cn-fr-raisin-noir", "Raisin noir", 69, ["raisin noir","raisin rouge"]),
    F("cn-fr-pomme", "Pomme", 52, ["pomme","pommes"]),
    F("cn-fr-pomme-golden", "Pomme Golden", 52, ["pomme golden","golden"]),
    F("cn-fr-pomme-gala", "Pomme Gala", 52, ["pomme gala","gala"]),
    F("cn-fr-pomme-granny", "Pomme Granny Smith", 52, ["pomme granny","granny smith"]),
    F("cn-fr-pomme-pink-lady", "Pomme Pink Lady", 52, ["pomme pink lady","pink lady"]),
    F("cn-fr-poire", "Poire", 57, ["poire","poires"]),
    F("cn-fr-poire-conference", "Poire Conférence", 57, ["poire conference","conference"]),
    F("cn-fr-poire-williams", "Poire Williams", 57, ["poire williams","williams"]),
    F("cn-fr-orange", "Orange", 47, ["orange","oranges"]),
    F("cn-fr-clementine", "Clémentine", 47, ["clementine","clementines"]),
    F("cn-fr-mandarine", "Mandarine", 53, ["mandarine","mandarines"]),
    F("cn-fr-citron", "Citron", 29, ["citron","citrons"]),
    F("cn-fr-citron-vert", "Citron vert", 30, ["citron vert","lime"]),
    F("cn-fr-pomelo", "Pomelo / pamplemousse", 38, ["pomelo","pamplemousse","pamplemousses"]),
    F("cn-fr-kiwi", "Kiwi vert", 61, ["kiwi","kiwis","kiwi vert"]),
    F("cn-fr-kiwi-gold", "Kiwi jaune Gold", 63, ["kiwi jaune","kiwi gold"]),
    F("cn-fr-peche", "Pêche", 39, ["peche","peches","peche jaune","peche blanche"]),
    F("cn-fr-nectarine", "Nectarine", 44, ["nectarine","nectarines"]),
    F("cn-fr-abricot", "Abricot", 48, ["abricot","abricots"]),
    F("cn-fr-prune", "Prune", 46, ["prune","prunes","prune rouge","prune jaune"]),
    F("cn-fr-cerise", "Cerise", 63, ["cerise","cerises"]),
    F("cn-fr-fraise", "Fraise", 32, ["fraise","fraises"]),
    F("cn-fr-framboise", "Framboise", 52, ["framboise","framboises"]),
    F("cn-fr-myrtille", "Myrtille", 57, ["myrtille","myrtilles"]),
    F("cn-fr-mure", "Mûre", 43, ["mure","mures"]),
    F("cn-fr-groseille", "Groseille", 56, ["groseille","groseilles"]),
    F("cn-fr-cassis", "Cassis", 63, ["cassis"]),
    F("cn-fr-melon", "Melon", 34, ["melon","melons","melon charentais","cantaloup"]),
    F("cn-fr-pasteque", "Pastèque", 30, ["pasteque","pastèque"]),
    F("cn-fr-ananas", "Ananas", 50, ["ananas"]),
    F("cn-fr-mangue", "Mangue", 60, ["mangue","mangues"]),
    F("cn-fr-papaye", "Papaye", 43, ["papaye","papayes"]),
    F("cn-fr-passion", "Fruit de la passion", 97, ["fruit de la passion","fruit passion","passion"]),
    F("cn-fr-grenade", "Grenade", 83, ["grenade","grenades"]),
    F("cn-fr-figue", "Figue fraîche", 74, ["figue","figues","figue fraiche"]),
    F("cn-fr-datte-fraiche", "Datte fraîche", 142, ["datte","datte fraiche","dattes fraiches"]),
    F("cn-fr-kaki", "Kaki", 70, ["kaki","kakis"]),
    F("cn-fr-litchi", "Litchi", 66, ["litchi","litchis","lychee"]),
    F("cn-fr-noix-coco", "Noix de coco fraîche", 354, ["noix de coco","coco"]),
    F("cn-fr-avocat", "Avocat", 160, ["avocat","avocats"]),
    F("cn-fr-coing", "Coing", 57, ["coing","coings"]),
    F("cn-fr-carambole", "Carambole", 31, ["carambole","caramboles"]),
    F("cn-fr-figue-barbarie", "Figue de Barbarie", 41, ["figue de barbarie","figues de barbarie"]),
    F("cn-fr-tomate", "Tomate", 18, ["tomate","tomates","tomate ronde","tomates rondes"]),
    F("cn-fr-tomate-grappe", "Tomate grappe", 18, ["tomate grappe","tomates grappe"]),
    F("cn-fr-tomate-cerise", "Tomate cerise", 18, ["tomate cerise","tomates cerises"]),
    F("cn-fr-concombre", "Concombre", 15, ["concombre","concombres"]),
    F("cn-fr-courgette", "Courgette", 17, ["courgette","courgettes"]),
    F("cn-fr-courgette-jaune", "Courgette jaune", 17, ["courgette jaune"]),
    F("cn-fr-aubergine", "Aubergine", 25, ["aubergine","aubergines"]),
    F("cn-fr-poivron-rouge", "Poivron rouge", 31, ["poivron rouge"]),
    F("cn-fr-poivron-vert", "Poivron vert", 20, ["poivron vert"]),
    F("cn-fr-poivron-jaune", "Poivron jaune", 27, ["poivron jaune"]),
    F("cn-fr-poivron", "Poivron", 27, ["poivron","poivrons"]),
    F("cn-fr-carotte", "Carotte", 36, ["carotte","carottes","carotte nouvelle"]),
    F("cn-fr-betterave", "Betterave rouge", 43, ["betterave","betteraves","betterave rouge"]),
    F("cn-fr-radis", "Radis", 16, ["radis","radis rose","radis noir"]),
    F("cn-fr-navet", "Navet", 28, ["navet","navets"]),
    F("cn-fr-poireau", "Poireau", 31, ["poireau","poireaux"]),
    F("cn-fr-oignon", "Oignon", 40, ["oignon","oignons","oignon jaune","oignon rouge","oignon blanc"]),
    F("cn-fr-ail", "Ail", 149, ["ail","gousse ail","gousses ail"]),
    F("cn-fr-echalote", "Échalote", 72, ["echalote","echalotes"]),
    F("cn-fr-pomme-terre", "Pomme de terre", 77, ["pomme de terre","pommes de terre","pdt","pomme de terre nouvelle"]),
    F("cn-fr-patate-douce", "Patate douce", 86, ["patate douce","patates douces"]),
    F("cn-fr-butternut", "Courge butternut", 45, ["butternut","courge butternut"]),
    F("cn-fr-potimarron", "Potimarron", 34, ["potimarron","potimarrons"]),
    F("cn-fr-potiron", "Potiron", 26, ["potiron","potirons"]),
    F("cn-fr-courge-spaghetti", "Courge spaghetti", 31, ["courge spaghetti"]),
    F("cn-fr-brocoli", "Brocoli", 34, ["brocoli","brocolis"]),
    F("cn-fr-chou-fleur", "Chou-fleur", 25, ["chou fleur","chou-fleur","choux fleurs"]),
    F("cn-fr-chou-blanc", "Chou blanc", 25, ["chou blanc","chou vert","chou cabus"]),
    F("cn-fr-chou-rouge", "Chou rouge", 31, ["chou rouge"]),
    F("cn-fr-kale", "Chou kale", 49, ["kale","chou kale"]),
    F("cn-fr-choux-bruxelles", "Choux de Bruxelles", 43, ["chou de bruxelles","choux de bruxelles"]),
    F("cn-fr-epinard", "Épinards", 23, ["epinard","epinards","jeunes pousses epinard"]),
    F("cn-fr-laitue", "Laitue / salade verte", 15, ["laitue","salade verte","batavia"]),
    F("cn-fr-romaine", "Salade romaine", 17, ["romaine","salade romaine"]),
    F("cn-fr-mache", "Mâche", 19, ["mache"]),
    F("cn-fr-roquette", "Roquette", 25, ["roquette"]),
    F("cn-fr-endive", "Endive", 17, ["endive","endives","chicon"]),
    F("cn-fr-fenouil", "Fenouil", 31, ["fenouil","fenouils"]),
    F("cn-fr-celeri-branche", "Céleri branche", 16, ["celeri branche","celeri"]),
    F("cn-fr-celeri-rave", "Céleri-rave", 42, ["celeri rave","celeri-rave"]),
    F("cn-fr-haricot-vert", "Haricot vert", 31, ["haricot vert","haricots verts"]),
    F("cn-fr-petits-pois", "Petits pois frais", 81, ["petit pois","petits pois","petits pois frais"]),
    F("cn-fr-asperge", "Asperge", 20, ["asperge","asperges","asperge verte","asperge blanche"]),
    F("cn-fr-artichaut", "Artichaut", 47, ["artichaut","artichauts"]),
    F("cn-fr-champignon", "Champignon de Paris", 22, ["champignon de paris","champignons de paris","champignon"]),
    F("cn-fr-mais", "Maïs frais", 86, ["mais","maïs","epi de mais","épi de maïs"]),
    F("cn-fr-panais", "Panais", 75, ["panais"]),
    F("cn-fr-topinambour", "Topinambour", 72, ["topinambour","topinambours"]),
    F("cn-fr-rutabaga", "Rutabaga", 37, ["rutabaga"]),
    F("cn-fr-blette", "Blette", 19, ["blette","blettes"]),
    F("cn-fr-cresson", "Cresson", 17, ["cresson"]),
    F("cn-fr-oseille", "Oseille", 22, ["oseille"]),
    F("cn-fr-feve", "Fève fraîche", 88, ["feve","feves","feves fraiches"]),

    // CAFÉS
    F("cn-boisson-espresso", "Café espresso", 2, ["cafe","café","espresso","expresso","cafe espresso","café espresso"]),
    F("cn-boisson-cafe-allonge", "Café allongé", 2, ["cafe allonge","café allongé","long black"]),
    F("cn-boisson-cafe-filtre", "Café filtre", 2, ["cafe filtre","café filtre","cafe filtre maison"]),
    F("cn-boisson-cafe-americain", "Café américain", 2, ["cafe americain","café américain","americano"]),
    F("cn-boisson-cafe-deca", "Café décaféiné", 2, ["cafe deca","café déca","cafe decafeine","café décaféiné","decafeine"]),
    F("cn-boisson-cafe-soluble", "Café soluble", 2, ["cafe soluble","café soluble","cafe instantane","café instantané"]),
    F("cn-boisson-cafe-au-lait", "Café au lait", 30, ["cafe au lait","café au lait"]),
    F("cn-boisson-cafe-lait", "Café avec lait", 30, ["cafe lait","café lait","cafe avec lait","café avec lait"]),
    F("cn-boisson-cappuccino", "Cappuccino", 45, ["cappuccino","cappucino"]),
    F("cn-boisson-latte", "Café latte", 45, ["latte","cafe latte","café latte","caffe latte"]),
    F("cn-boisson-flat-white", "Flat white", 40, ["flat white"]),
    F("cn-boisson-macchiato", "Café macchiato", 25, ["macchiato","cafe macchiato","café macchiato"]),
    F("cn-boisson-mocha", "Café mocha", 70, ["mocha","moka","cafe mocha","café mocha"]),
    F("cn-boisson-irish-coffee", "Irish coffee", 90, ["irish coffee"]),
    F("cn-boisson-cold-brew", "Cold brew", 2, ["cold brew","coldbrew"]),
    F("cn-boisson-cafe-glace", "Café glacé", 3, ["cafe glace","café glacé","iced coffee","iced cafe"]),
    F("cn-boisson-frappe-cafe", "Café frappé", 3, ["cafe frappe","café frappé","frappe coffee"]),

    // THÉS
    F("cn-the-noir", "Thé noir", 1, ["the noir","thé noir","black tea","english breakfast","earl grey","earl gray","assam","darjeeling","ceylan"]),
    F("cn-the-vert", "Thé vert", 1, ["the vert","thé vert","green tea","sencha","matcha","gunpowder"]),
    F("cn-the-blanc", "Thé blanc", 1, ["the blanc","thé blanc","white tea"]),
    F("cn-the-oolong", "Thé Oolong", 1, ["oolong","the oolong","thé oolong"]),
    F("cn-the-pu-erh", "Thé Pu-erh", 1, ["pu erh","pu-erh","the pu erh","thé pu erh"]),
    F("cn-the-chai", "Thé chai", 2, ["chai","the chai","thé chai","masala chai"]),
    F("cn-the-matcha", "Thé matcha", 3, ["matcha","the matcha","thé matcha"]),
    F("cn-the-menthe", "Thé à la menthe", 1, ["the menthe","thé menthe","the a la menthe","thé à la menthe"]),
    F("cn-the-citron", "Thé au citron", 2, ["the citron","thé citron","the au citron","thé au citron"]),
    F("cn-the-peche", "Thé à la pêche", 13, ["the peche","thé pêche","the a la peche","thé à la pêche"]),
    F("cn-the-glace", "Thé glacé non sucré", 1, ["the glace","thé glacé","the glace sans sucre","thé glacé sans sucre","ice tea sans sucre"]),

    // TISANES / INFUSIONS
    F("cn-infusion-menthe", "Infusion menthe", 1, ["tisane menthe","tisane à la menthe","infusion menthe","infusion de menthe"]),
    F("cn-infusion-verveine", "Infusion verveine", 1, ["tisane verveine","infusion verveine","verveine"]),
    F("cn-infusion-camomille", "Infusion camomille", 1, ["tisane camomille","infusion camomille","camomille"]),
    F("cn-infusion-tilleul", "Infusion tilleul", 1, ["tisane tilleul","infusion tilleul","tilleul"]),
    F("cn-infusion-verveine-menthe", "Infusion verveine-menthe", 1, ["verveine menthe","tisane verveine menthe","infusion verveine menthe"]),
    F("cn-infusion-gingembre", "Infusion gingembre", 2, ["tisane gingembre","infusion gingembre","gingembre infusion"]),
    F("cn-infusion-citron", "Infusion citron", 2, ["tisane citron","infusion citron","citron infusion"]),
    F("cn-infusion-fruits-rouges", "Infusion fruits rouges", 2, ["tisane fruits rouges","infusion fruits rouges","fruits rouges infusion"]),
    F("cn-infusion-fruits", "Infusion fruits", 2, ["tisane fruits","infusion fruits"]),
    F("cn-infusion-cannelle", "Infusion cannelle", 2, ["tisane cannelle","infusion cannelle","cannelle infusion"]),
    F("cn-infusion-hibiscus", "Infusion hibiscus", 1, ["tisane hibiscus","infusion hibiscus","hibiscus"]),
    F("cn-infusion-fenouil", "Infusion fenouil", 1, ["tisane fenouil","infusion fenouil"]),
    F("cn-infusion-romarin", "Infusion romarin", 1, ["tisane romarin","infusion romarin"]),
    F("cn-infusion-lavande", "Infusion lavande", 1, ["tisane lavande","infusion lavande"]),
    F("cn-infusion-relax", "Infusion relaxante", 1, ["tisane relaxante","infusion relaxante","tisane relaxation","infusion sommeil"]),
    F("cn-infusion-digestion", "Infusion digestion", 1, ["tisane digestion","infusion digestion","tisane digestive","infusion digestive"])
  ];
  const lookup = new Map();
  for (const p of items) for (const a of p._aliases) lookup.set(norm(a), p);
  const badForProduce = /(muesli|c[eé]r[eé]ales?|barre|biscuit|cookie|g[aâ]teau|cake|glace|dessert|yaourt|compote|confiture|jus|nectar|sirop|boisson|smoothie|sorbet|p[aâ]tisserie|chips|sauce)/i;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    try {
      const url = typeof input === "string" ? input : input && input.url;
      if (url && /world\.openfoodfacts\.org\/cgi\/search\.pl/i.test(url)) {
        const u = new URL(url, window.location.href);
        const q = norm(u.searchParams.get("search_terms") || "");
        const local = lookup.get(q);
        if (local) {
          const related = items.filter(p => p._aliases.some(a => norm(a) === q)).map(({_aliases, ...p}) => p);
          const r = await originalFetch(input, init);
          let data = { products: [] };
          if (r.ok) { try { data = await r.json(); } catch {} }
          const isDrink = /^(cafe|café|espresso|the|thé|tisane|infusion|chai|matcha|latte|cappuccino|macchiato|mocha|cold brew|irish coffee)/i.test(q);
          const apiProducts = (data.products || []).filter(p => !isDrink || !/(glace|ice cream|dessert|yaourt|biscuit|gateau|gâteau|chocolat)/i.test(`${p.product_name_fr || ""} ${p.product_name || ""}`)).filter(p => !badForProduce.test(`${p.product_name_fr || ""} ${p.product_name || ""}`) || isDrink);
          return new Response(JSON.stringify({ ...data, products: [...related, ...apiProducts].slice(0, 12) }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
      }
    } catch (e) {}
    return originalFetch(input, init);
  };
  window.__COACH_NEIRAM_BASIC_PRODUCE__ = items.length;
})();
