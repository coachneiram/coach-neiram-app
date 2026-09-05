/* Coach Neiram — teneur en fibres, en g pour 100 g.

   Fichier SEPARE des catalogues, volontairement. Les catalogues portent les
   macros ; celui-ci ne porte que les fibres, et seulement pour les aliments
   dont la teneur est etablie.

   ─────────────────────────────────────────────────────────────────────
   UN ALIMENT ABSENT DE CETTE TABLE N'A PAS 0 g DE FIBRES : SA TENEUR EST
   INCONNUE.
   ─────────────────────────────────────────────────────────────────────

   Ecrire 0 sur un aliment dont on ignore la teneur, c'est affirmer qu'il
   n'en contient pas. Le client verrait un total du jour faussement bas et
   se croirait en deficit permanent. Une teneur inconnue reste donc absente,
   s'affiche « — », et le total du jour est marque comme partiel.

   C'est aussi pourquoi cette table ne couvre pas les 648 aliments du
   catalogue. Elle couvre ceux qui portent l'essentiel des fibres d'une
   alimentation courante — legumineuses, cereales completes, oleagineux,
   fruits et legumes. Remplir le reste au juge donnerait un chiffre precis
   et faux, ce qui est pire que pas de chiffre du tout.

   Les valeurs sont exprimees pour l'aliment TEL QU'IL EST PESE : cru pour
   un aliment cru, cuit pour un aliment cuit. Confondre les deux fausse
   d'un facteur deux a trois sur les legumineuses et les cereales.

   ─────────────────────────────────────────────────────────────────────
   LES FIBRES S'AJOUTENT AUX GLUCIDES, ELLES N'EN FONT PAS PARTIE
   ─────────────────────────────────────────────────────────────────────

   Le catalogue suit la convention europeenne : les glucides annonces sont
   NETS, fibres exclues. Les graines de chia y figurent a 8 g de glucides
   quand leur teneur totale est d'environ 42 g — la difference, ce sont les
   34 g de fibres.

   Consequence directe : une teneur en fibres peut depasser les glucides
   annonces, et c'est normal. Sous la convention americaine — glucides
   totaux, fibres comprises — ce serait au contraire impossible. Confondre
   les deux conventions ferait compter les fibres deux fois dans les
   glucides du client. */
(() => {
  const FIBRES = {
    // ── Legumineuses ────────────────────────────────────────────────
    // Ce sont, de loin, les plus denses en fibres.
    "cn-fr-x-lentilles-crues": 11,
    "cn-b-lentilles-vertes-crues": 11,
    "cn-fr-x-lentilles-corail": 3.5,
    "cn-b-lentilles-beluga-cuites": 4,
    "cn-fr-x-pois-chiches-crus": 12,
    "cn-fr-x-pois-casses": 5,
    "cn-b-pois-casses-crus": 12,
    "cn-fr-x-haricots-noirs": 6,
    "cn-b-flageolets-cuits": 5,
    "cn-b-azuki-cuits": 5,
    "cn-v-x-feves-cuites": 5,
    "cn-fr-feve": 4,
    "cn-p-x-pst": 15,

    // ── Cereales et feculents ───────────────────────────────────────
    "cn-fr-x-son-avoine": 15,
    "cn-b-son-ble": 42,
    "cn-b-avoine-crue": 10,
    "cn-b-germe-ble": 13,
    "cn-fr-x-quinoa-cru": 7,
    "cn-s-quinoa": 2.8,
    "cn-b-quinoa-rouge-cuit": 2.8,
    "cn-b-sarrasin-cru": 10,
    "cn-c-x-farine-sarrasin": 10,
    "cn-c-x-farine-avoine": 9,
    "cn-fr-x-boulgour-cru": 12,
    "cn-b-epeautre-cuit": 3.5,
    "cn-b-petit-epeautre-cuit": 3.5,
    "cn-c-x-pain-mie": 2.5,
    "cn-fr-x-riz-cru": 1.3,
    "cn-fr-x-pates-crues": 3,
    "cn-fr-x-semoule-crue": 3.5,
    "cn-fr-x-nouilles-riz": 1,

    // ── Graines et oleagineux ───────────────────────────────────────
    // L'ecart entre calories annoncees et macros vient d'ici.
    "cn-s-x-chia": 34,
    "cn-s-x-lin": 27,
    "cn-b-levure-nutritionnelle": 20,

    // ── Legumineuses et cereales CUITES ─────────────────────────────
    // Ce sont celles que le client pese reellement dans son assiette. La
    // cuisson absorbe de l'eau : la teneur pour 100 g tombe d'un facteur
    // deux a trois par rapport au produit cru.
    "cn-s-lentils": 4,
    "cn-s-chickpeas": 7,
    "cn-s-red-beans": 6.5,
    "cn-s-white-beans": 6,
    "cn-b-coco-blanc-cuits": 6,
    "cn-s-rice-brown": 1.8,
    "cn-s-rice-white": 0.4,
    "cn-s-rice-basmati": 0.4,
    "cn-s-bulgur": 4.5,

    // ── Legumes ─────────────────────────────────────────────────────
    "cn-fr-haricot-vert": 3,
    "cn-b-haricot-beurre": 3,
    "cn-b-haricot-plat": 3,
    "cn-fr-blette": 2
  };

  /* Aliments SANS fibres — un fait, pas une absence d'information.

     Viandes, poissons, oeufs, produits laitiers nature et corps gras ne
     contiennent aucune fibre alimentaire : ce sont des produits animaux ou
     des lipides purs. Inscrire explicitement 0 n'est donc pas une
     approximation, c'est la valeur reelle.

     Cela compte pour le client : sans ces zeros, une journee poulet - riz -
     huile d'olive serait signalee « total partiel » alors qu'elle est
     parfaitement connue. Le signal « partiel » ne doit se declencher que
     quand il apporte une information.

     ATTENTION AUX PREFIXES. Les rayons « proteines » et « laitiers » ne
     contiennent pas QUE des produits animaux : le tofu, le tempeh, le
     seitan et les boissons vegetales y figurent aussi, et tous contiennent
     des fibres. Une premiere version de cette regle leur avait attribue 0 g
     — c'est le test qui l'a rattrape. Les exceptions sont donc listees
     explicitement plutot que devinees. */
  const PREFIXES_SANS_FIBRES = [/^cn-p-/, /^cn-d-/];

  /* Produits vegetaux, ou contenant un ingredient vegetal, ranges dans ces
     rayons : ils ont des fibres, et leur teneur reste a etablir. Ils
     restent donc INCONNUS plutot que ramenes a zero.

     « Skyr aux fruits » entre dans ce cas : la preparation de fruits en
     apporte une petite quantite. Peu, mais pas zero — et zero serait une
     affirmation fausse. */
  const EXCEPTIONS_VEGETALES =
    /tofu|tempeh|seitan|soja|avoine|amande|noisette|v[ée]g[ée]tal|pois|lentille|prot[ée]ine de|fruit|c[ée]r[ée]al|muesli|granola/i;
  const CODES_SANS_FIBRES = [
    "cn-c-olive-oil",
    "cn-c-rapeseed-oil",
    "cn-c-sunflower-oil",
    "cn-s-x-huile-coco",
    "cn-s-x-huile-sesame",
    "cn-s-x-margarine"
  ];

  // Le moteur de recherche lit cette table ; l'interface s'en sert pour
  // completer une entree de journal ajoutee depuis le catalogue.
  const table = Object.assign(window.__CN_FOOD_FIBRES__ || {}, FIBRES);

  for (const item of window.__CN_FOOD_ITEMS__ || []) {
    if (table[item.code] !== undefined) continue;
    if (EXCEPTIONS_VEGETALES.test(item.product_name_fr)) continue;
    if (PREFIXES_SANS_FIBRES.some((re) => re.test(item.code))) table[item.code] = 0;
  }
  for (const code of CODES_SANS_FIBRES) if (table[code] === undefined) table[code] = 0;

  window.__CN_FOOD_FIBRES__ = table;
})();
