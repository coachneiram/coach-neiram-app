/* Coach Neiram — etat de l'aliment : pese cru, ou pese cuit.

   ─────────────────────────────────────────────────────────────────────
   POURQUOI CE FICHIER EXISTE
   ─────────────────────────────────────────────────────────────────────

   C'est la plus grosse source d'erreur du journal alimentaire, et elle est
   invisible. Le boulgour affiche 345 kcal cru et 83 kcal cuit : un client
   qui pese son assiette et choisit la fiche « cru » se trompe d'un facteur
   QUATRE. Sur du quinoa, un facteur trois. Sur du blanc de poulet, un
   facteur 1,4 dans l'autre sens.

   Aucune de ces erreurs ne se voit. Le total du jour reste plausible, les
   macros aussi, et le client comme le coach cherchent ailleurs pourquoi la
   progression ne suit pas.

   ─────────────────────────────────────────────────────────────────────
   CONVENTION
   ─────────────────────────────────────────────────────────────────────

   Les tables nutritionnelles donnent les viandes, poissons et feculents a
   l'etat CRU. C'est la convention des donnees de ce catalogue, et c'est
   contre-intuitif pour le client, qui pese son assiette apres cuisson.

   Trois etats possibles :
     "cru"      la valeur vaut pour l'aliment cru, avant cuisson
     "cuit"     la valeur vaut pour l'aliment cuit, tel qu'il est dans
                l'assiette
     "telquel"  l'etat ne change rien (huile, fruit cru, boisson, yaourt)

   Un aliment ABSENT de cette table n'a pas d'etat suppose : l'interface ne
   dit alors rien plutot que d'affirmer quelque chose de faux. */
(() => {
  /* Feculents et legumineuses : le nom porte deja l'etat, on le reprend
     tel quel pour que l'interface n'ait pas a l'analyser. */
  const PAR_NOM = [
    [/\bcuit(e|s|es)?\b/i, "cuit"],
    [/\bcru(e|s|es)?\b/i, "cru"]
  ];

  /* Viandes, poissons et oeufs : valeurs CRUES, par convention des tables
     nutritionnelles. C'est le piege principal — le client pese apres
     cuisson, et une viande perd 20 a 30 % de son poids en eau. */
  const CRUS = [
    "cn-p-chicken-breast",
    "cn-p-chicken-escalope",
    "cn-p-turkey",
    "cn-p-turkey-mince",
    "cn-p-veal",
    "cn-p-beef-steak",
    "cn-p-beef-steak-15",
    "cn-b-boeuf-hache-20",
    "cn-p-beef",
    "cn-p-pork",
    "cn-p-x-filet-mignon",
    "cn-p-salmon",
    "cn-p-cod"
  ];

  /* Aliments dont l'etat ne change rien : ils se pesent comme ils se
     mangent. Un fruit cru, une huile, un yaourt, une conserve. */
  const TEL_QUEL = [
    "cn-p-tuna",
    "cn-p-x-saumon-fume",
    "cn-p-egg",
    "cn-v-green-beans",
    "cn-fr-haricot-vert",
    "cn-b-haricot-beurre",
    "cn-b-haricot-plat"
  ];

  /* Deja cuits, meme si le nom ne le dit pas.

     Une cliente a resume le probleme mieux que moi : « ce qui est difficile
     c'est de savoir si on doit peser cru ou cuit, je pense que c'est cru
     pour tout ». C'est faux, et c'est justement le piege : un plat cuisine
     ou une viande rotie se pesent dans l'assiette, un blanc de poulet ou du
     riz se pesent avant cuisson. Sans mention, personne ne peut deviner
     lequel est lequel. */
  const CUITS = [
    "cn-p-x-oeuf-dur",
    "cn-p-x-oeuf-plat",
    "cn-p-x-oeufs-brouilles",
    "cn-p-x-thon-frais",
    "cn-fr-x-pdt-four",
    "cn-r-steak-fries",
    "cn-r-carbonara",
    "cn-r-bolognese",
    "cn-p-chicken-roast",
    "cn-fr-x-pdt-vapeur",
    "cn-fr-x-pdt-rissolees"
  ];

  /* Aliments crus supplementaires, moins evidents que les viandes. */
  const CRUS_SUPPLEMENTAIRES = ["cn-p-chicken-mince", "cn-v-potato", "cn-fr-pomme-terre"];

  /* Facteur de conversion cru -> cuit, en poids.
     100 g de riz cru donnent environ 250 g de riz cuit ; 100 g de poulet
     cru donnent environ 70 g de poulet cuit. Il sert a proposer au client
     l'equivalent dans l'autre etat plutot qu'a le laisser deviner. */
  const RENDEMENT = {
    riz: 2.5,
    pates: 2.4,
    semoule: 2.5,
    quinoa: 3,
    boulgour: 2.8,
    lentilles: 2.4,
    "pois chiches": 2.2,
    haricots: 2.3,
    viande: 0.7,
    poisson: 0.8
  };

  const etats = window.__CN_FOOD_ETATS__ || {};

  for (const item of window.__CN_FOOD_ITEMS__ || []) {
    if (etats[item.code] !== undefined) continue;
    const trouve = PAR_NOM.find(([re]) => re.test(item.product_name_fr));
    if (trouve) etats[item.code] = trouve[1];
  }
  for (const code of CRUS.concat(CRUS_SUPPLEMENTAIRES)) etats[code] = "cru";
  for (const code of CUITS) etats[code] = "cuit";
  for (const code of TEL_QUEL) etats[code] = "telquel";

  window.__CN_FOOD_ETATS__ = etats;
  window.__CN_FOOD_RENDEMENT__ = Object.assign(window.__CN_FOOD_RENDEMENT__ || {}, RENDEMENT);
})();
