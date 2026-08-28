# -*- coding: utf-8 -*-
"""Genere food-staples-catalog.js : aliments bruts et ingredients de base manquants.

Corrige aussi deux points de food-basic-catalog.js :
  - "puree" ne renvoyait que "Puree d'amandes" (614 kcal), aucune puree de
    pommes de terre n'existait dans le catalogue ;
  - le filtre COMPOSITE ecartait "puree de " des resultats Open Food Facts.
"""
import io
import os
import re
import unicodedata

ROOT = '/home/claude/chk5/coach-neiram-app-main'

# (code, nom, kcal, P, G, L, alias) pour 100 g
DATA = [
    # --- purees et pommes de terre -------------------------------------
    ('cn-fr-x-puree-maison', 'Purée de pommes de terre', 105, 2.0, 15.0, 4.0,
     ['puree', 'puree pommes de terre', 'puree maison', 'ecrase de pommes de terre']),
    ('cn-fr-x-puree-flocons', 'Purée en flocons préparée', 85, 2.0, 13.0, 2.5,
     ['puree flocons', 'puree mousline', 'puree instantanee']),
    ('cn-fr-x-pdt-vapeur', 'Pommes de terre vapeur', 87, 2.0, 19.0, 0.1, ['pomme de terre vapeur', 'pdt vapeur']),
    ('cn-fr-x-pdt-four', 'Pomme de terre au four', 93, 2.5, 20.0, 0.1, ['pdt four', 'patate au four']),
    ('cn-fr-x-pdt-rissolees', 'Pommes de terre rissolées', 145, 2.5, 22.0, 5.5, ['pdt rissolees', 'pommes sautees']),
    ('cn-fr-x-patate-douce-cuite', 'Patate douce cuite', 90, 2.0, 20.0, 0.1, ['patate douce vapeur']),
    ('cn-fr-x-gnocchi', 'Gnocchi cuits', 130, 3.5, 26.0, 1.0, ['gnocchis']),
    ('cn-v-x-puree-carotte', 'Purée de carottes', 55, 1.0, 8.0, 2.0, ['puree carottes']),
    ('cn-v-x-puree-courgette', 'Purée de courgettes', 40, 1.3, 3.5, 2.0, ['puree courgettes']),
    ('cn-v-x-puree-brocoli', 'Purée de brocolis', 50, 2.5, 4.5, 2.5, ['puree brocolis']),
    ('cn-fr-x-puree-patate-douce', 'Purée de patate douce', 95, 1.7, 20.0, 1.0, ['puree patate douce']),

    # --- oeufs ---------------------------------------------------------
    ('cn-p-x-oeuf-dur', 'Œuf dur', 145, 13.0, 0.6, 10.0, ['oeuf dur', 'oeufs durs']),
    ('cn-p-x-oeuf-plat', 'Œuf au plat', 190, 13.0, 0.8, 15.0, ['oeuf au plat', 'oeuf sur le plat']),
    ('cn-p-x-oeufs-brouilles', 'Œufs brouillés', 165, 11.0, 1.5, 12.0, ['oeufs brouilles']),
    ('cn-p-x-omelette', 'Omelette nature', 155, 11.0, 1.0, 12.0, ['omelette']),
    ('cn-p-x-jaune-oeuf', 'Jaune d’œuf', 322, 16.0, 0.6, 28.0, ['jaune d oeuf', 'jaune oeuf']),

    # --- viandes -------------------------------------------------------
    ('cn-p-x-rumsteck', 'Rumsteck grillé', 175, 30.0, 0.0, 6.0, ['rumsteak', 'rumsteck']),
    ('cn-p-x-entrecote', 'Entrecôte grillée', 265, 26.0, 0.0, 18.0, ['entrecote']),
    ('cn-p-x-bavette', 'Bavette grillée', 210, 28.0, 0.0, 11.0, ['bavette']),
    ('cn-p-x-filet-mignon', 'Filet mignon de porc', 155, 28.0, 0.0, 4.5, ['filet mignon']),
    ('cn-p-x-cote-porc', 'Côte de porc grillée', 230, 27.0, 0.0, 13.0, ['cote de porc']),
    ('cn-p-x-lardons', 'Lardons fumés', 280, 15.0, 0.5, 24.0, ['lardons']),
    ('cn-p-x-saucisse-toulouse', 'Saucisse de Toulouse', 300, 16.0, 1.0, 26.0, ['saucisse']),
    ('cn-p-x-merguez', 'Merguez', 290, 15.0, 1.0, 25.0, ['merguez']),
    ('cn-p-x-chipolata', 'Chipolata', 285, 15.0, 1.0, 24.0, ['chipolata', 'chipolatas']),
    ('cn-p-x-jambon-cru', 'Jambon cru', 240, 27.0, 0.5, 14.0, ['jambon cru', 'jambon de pays']),
    ('cn-p-x-roti-veau', 'Rôti de veau', 145, 28.0, 0.0, 3.5, ['roti de veau']),
    ('cn-p-x-gigot-agneau', 'Gigot d’agneau', 210, 27.0, 0.0, 11.0, ['gigot d agneau', 'agneau']),
    ('cn-p-x-magret', 'Magret de canard', 200, 25.0, 0.0, 11.0, ['magret', 'canard']),
    ('cn-p-x-cuisse-poulet-sans-peau', 'Cuisse de poulet sans peau', 145, 24.0, 0.0, 5.5, ['haut de cuisse poulet']),
    ('cn-p-x-aiguillettes', 'Aiguillettes de poulet', 110, 23.0, 0.0, 1.5, ['aiguillettes']),
    ('cn-p-x-foie-veau', 'Foie de veau', 135, 20.0, 3.0, 4.5, ['foie de veau']),
    ('cn-p-x-lapin', 'Lapin', 145, 27.0, 0.0, 4.0, ['lapin']),

    # --- poissons et fruits de mer -------------------------------------
    ('cn-p-x-saumon-fume', 'Saumon fumé', 180, 22.0, 0.5, 10.0, ['saumon fume']),
    ('cn-p-x-truite-fumee', 'Truite fumée', 160, 23.0, 0.5, 7.5, ['truite fumee']),
    ('cn-p-x-thon-frais', 'Thon frais grillé', 145, 30.0, 0.0, 2.5, ['thon frais', 'steak de thon']),
    ('cn-p-x-sole', 'Sole', 85, 18.0, 0.0, 1.2, ['sole']),
    ('cn-p-x-hareng', 'Hareng fumé', 210, 20.0, 0.0, 14.0, ['hareng']),
    ('cn-p-x-anchois', 'Anchois à l’huile', 210, 24.0, 0.0, 12.0, ['anchois']),
    ('cn-p-x-calamar', 'Calamar', 90, 16.0, 3.0, 1.5, ['calamar', 'encornet']),
    ('cn-p-x-st-jacques', 'Coquilles Saint-Jacques', 90, 17.0, 3.0, 0.8, ['saint jacques', 'noix de saint jacques']),
    ('cn-p-x-huitres', 'Huîtres', 70, 9.0, 4.0, 2.0, ['huitres']),
    ('cn-p-x-crabe', 'Crabe', 85, 18.0, 0.0, 1.0, ['crabe']),

    # --- feculents crus (pesee avant cuisson) --------------------------
    ('cn-fr-x-pates-crues', 'Pâtes crues', 360, 12.5, 71.0, 1.5, ['pates crues', 'pates seches']),
    ('cn-fr-x-riz-cru', 'Riz cru', 350, 7.0, 78.0, 0.6, ['riz cru', 'riz sec']),
    ('cn-fr-x-semoule-crue', 'Semoule crue', 350, 12.0, 72.0, 1.5, ['semoule crue']),
    ('cn-fr-x-quinoa-cru', 'Quinoa cru', 370, 14.0, 59.0, 6.0, ['quinoa cru']),
    ('cn-fr-x-lentilles-crues', 'Lentilles crues', 340, 25.0, 50.0, 1.5, ['lentilles crues', 'lentilles seches']),
    ('cn-fr-x-pois-chiches-crus', 'Pois chiches crus', 350, 20.0, 52.0, 5.5, ['pois chiches crus']),
    ('cn-fr-x-boulgour-cru', 'Boulgour cru', 345, 12.0, 70.0, 1.5, ['boulgour cru']),
    ('cn-fr-x-polenta', 'Polenta cuite', 70, 1.5, 15.0, 0.3, ['polenta']),
    ('cn-fr-x-ebly', 'Blé précuit cuit', 125, 4.5, 25.0, 0.5, ['ebly', 'ble precuit']),
    ('cn-fr-x-vermicelles', 'Vermicelles cuits', 130, 4.5, 26.0, 0.5, ['vermicelles']),
    ('cn-fr-x-nouilles-riz', 'Nouilles de riz cuites', 110, 2.0, 25.0, 0.2, ['nouilles de riz']),
    ('cn-fr-x-son-avoine', 'Son d’avoine', 350, 17.0, 50.0, 7.0, ['son d avoine', 'son avoine']),
    ('cn-fr-x-muesli', 'Muesli sans sucre', 370, 11.0, 60.0, 8.0, ['muesli']),

    # --- pains et pates a derouler -------------------------------------
    ('cn-c-x-pain-mie', 'Pain de mie', 270, 8.0, 47.0, 5.0, ['pain de mie']),
    ('cn-c-x-baguette', 'Baguette', 275, 9.0, 55.0, 1.5, ['baguette', 'pain baguette']),
    ('cn-c-x-pita', 'Pain pita', 275, 9.0, 55.0, 1.2, ['pita']),
    ('cn-c-x-biscotte', 'Biscotte', 390, 12.0, 73.0, 5.0, ['biscotte', 'biscottes']),
    ('cn-c-x-pain-burger', 'Pain burger', 280, 9.0, 48.0, 5.5, ['pain burger', 'buns']),
    ('cn-c-x-pate-feuilletee', 'Pâte feuilletée', 400, 5.5, 38.0, 25.0, ['pate feuilletee']),
    ('cn-c-x-pate-brisee', 'Pâte brisée', 415, 6.0, 45.0, 23.0, ['pate brisee']),

    # --- legumineuses --------------------------------------------------
    ('cn-fr-x-lentilles-corail', 'Lentilles corail cuites', 115, 8.0, 18.0, 0.5, ['lentilles corail']),
    ('cn-fr-x-pois-casses', 'Pois cassés cuits', 115, 8.0, 18.0, 0.4, ['pois casses']),
    ('cn-fr-x-haricots-noirs', 'Haricots noirs cuits', 130, 8.5, 20.0, 0.5, ['haricots noirs']),
    ('cn-v-x-edamame', 'Edamame', 125, 11.0, 9.0, 5.0, ['edamame']),
    ('cn-v-x-feves-cuites', 'Fèves cuites', 90, 7.0, 12.0, 0.5, ['feves cuites']),

    # --- produits laitiers ---------------------------------------------
    ('cn-d-x-fromage-blanc-3', 'Fromage blanc 3%', 75, 7.5, 4.0, 3.0, ['fromage blanc 3']),
    ('cn-d-x-yaourt-grec-0', 'Yaourt grec 0%', 60, 10.0, 4.0, 0.2, ['yaourt grec 0']),
    ('cn-d-x-petit-suisse', 'Petit-suisse 0%', 55, 9.0, 4.0, 0.2, ['petit suisse']),
    ('cn-d-x-ricotta', 'Ricotta', 145, 11.0, 3.0, 10.0, ['ricotta']),
    ('cn-d-x-feta', 'Feta', 265, 14.0, 1.5, 22.0, ['feta']),
    ('cn-d-x-cheddar', 'Cheddar', 400, 25.0, 1.3, 33.0, ['cheddar']),
    ('cn-d-x-gruyere', 'Gruyère', 390, 27.0, 0.5, 31.0, ['gruyere']),
    ('cn-d-x-camembert', 'Camembert', 300, 20.0, 0.5, 24.0, ['camembert']),
    ('cn-d-x-brie', 'Brie', 335, 19.0, 0.5, 28.0, ['brie']),
    ('cn-d-x-bleu', 'Bleu / roquefort', 355, 20.0, 2.0, 30.0, ['roquefort', 'bleu']),
    ('cn-d-x-creme-30', 'Crème fraîche 30%', 290, 2.4, 3.0, 30.0, ['creme fraiche 30', 'creme entiere']),
    ('cn-d-x-creme-legere', 'Crème liquide légère 15%', 160, 2.5, 4.0, 15.0, ['creme legere', 'creme liquide']),
    ('cn-d-x-kefir', 'Kéfir nature', 55, 3.3, 4.5, 2.5, ['kefir']),
    ('cn-d-x-skyr-fruits', 'Skyr aux fruits', 70, 10.0, 7.0, 0.2, ['skyr fruits']),
    ('cn-d-x-faisselle', 'Faisselle', 75, 8.0, 3.5, 3.0, ['faisselle']),
    ('cn-d-x-mascarpone', 'Mascarpone', 355, 4.5, 4.0, 36.0, ['mascarpone']),

    # --- matieres grasses, graines, oleagineux -------------------------
    ('cn-s-x-huile-coco', 'Huile de coco', 900, 0.0, 0.0, 100.0, ['huile de coco']),
    ('cn-s-x-huile-sesame', 'Huile de sésame', 900, 0.0, 0.0, 100.0, ['huile de sesame']),
    ('cn-s-x-margarine', 'Margarine', 720, 0.2, 0.5, 80.0, ['margarine']),
    ('cn-s-x-puree-noisette', 'Purée de noisette', 640, 15.0, 12.0, 60.0, ['puree de noisette']),
    ('cn-s-x-tahini', 'Tahini', 600, 17.0, 10.0, 54.0, ['tahini', 'puree de sesame']),
    ('cn-s-x-chia', 'Graines de chia', 490, 17.0, 8.0, 31.0, ['chia']),
    ('cn-s-x-lin', 'Graines de lin', 530, 18.0, 3.0, 42.0, ['graines de lin']),
    ('cn-s-x-courge', 'Graines de courge', 560, 30.0, 11.0, 45.0, ['graines de courge']),
    ('cn-s-x-tournesol', 'Graines de tournesol', 585, 21.0, 12.0, 51.0, ['graines de tournesol']),
    ('cn-s-x-sesame', 'Graines de sésame', 570, 18.0, 12.0, 50.0, ['graines de sesame']),
    ('cn-s-x-bresil', 'Noix du Brésil', 660, 14.0, 4.0, 66.0, ['noix du bresil']),
    ('cn-s-x-pecan', 'Noix de pécan', 690, 9.0, 4.5, 72.0, ['noix de pecan']),
    ('cn-s-x-macadamia', 'Noix de macadamia', 720, 8.0, 5.5, 76.0, ['macadamia']),

    # --- fruits secs ---------------------------------------------------
    ('cn-f-x-raisins-secs', 'Raisins secs', 300, 3.0, 71.0, 0.5, ['raisins secs']),
    ('cn-f-x-abricots-secs', 'Abricots secs', 240, 3.5, 53.0, 0.5, ['abricots secs']),
    ('cn-f-x-pruneaux', 'Pruneaux', 240, 2.2, 57.0, 0.4, ['pruneaux']),
    ('cn-f-x-dattes-sechees', 'Dattes séchées', 285, 2.5, 68.0, 0.4, ['dattes sechees', 'dattes']),
    ('cn-f-x-figues-sechees', 'Figues séchées', 250, 3.5, 55.0, 1.0, ['figues sechees']),
    ('cn-f-x-cranberries', 'Cranberries séchées', 310, 0.2, 78.0, 1.0, ['cranberries']),
    ('cn-f-x-banane-sechee', 'Banane séchée', 340, 3.5, 74.0, 1.8, ['banane sechee']),
    ('cn-f-x-compote-ssa', 'Compote de pommes sans sucre', 50, 0.3, 11.0, 0.1,
     ['compote sans sucre', 'compote pomme']),

    # --- patisserie et ingredients de recette --------------------------
    ('cn-c-x-farine-t55', 'Farine de blé T55', 345, 10.0, 71.0, 1.2, ['farine', 'farine de ble']),
    ('cn-c-x-farine-complete', 'Farine complète T110', 330, 12.0, 63.0, 2.0, ['farine complete']),
    ('cn-c-x-farine-avoine', 'Farine d’avoine', 380, 13.0, 60.0, 7.0, ['farine d avoine', 'farine avoine']),
    ('cn-c-x-farine-sarrasin', 'Farine de sarrasin', 345, 12.0, 65.0, 3.0, ['farine de sarrasin']),
    ('cn-c-x-maizena', 'Maïzena / fécule de maïs', 345, 0.3, 85.0, 0.1, ['maizena', 'fecule de mais']),
    ('cn-c-x-levure', 'Levure chimique', 120, 0.5, 28.0, 0.0, ['levure chimique', 'levure']),
    ('cn-c-x-sucre', 'Sucre blanc', 400, 0.0, 100.0, 0.0, ['sucre']),
    ('cn-c-x-cassonade', 'Cassonade', 390, 0.0, 97.0, 0.0, ['cassonade', 'sucre roux']),
    ('cn-c-x-agave', 'Sirop d’agave', 310, 0.0, 76.0, 0.0, ['sirop d agave']),
    ('cn-c-x-erable', 'Sirop d’érable', 260, 0.0, 67.0, 0.0, ['sirop d erable']),
    ('cn-c-x-cacao', 'Cacao en poudre non sucré', 355, 20.0, 14.0, 21.0, ['cacao', 'cacao non sucre']),
    ('cn-c-x-choco-patissier', 'Chocolat pâtissier noir', 520, 6.0, 46.0, 33.0, ['chocolat patissier']),
    ('cn-c-x-pepites-choco', 'Pépites de chocolat', 500, 5.0, 60.0, 27.0, ['pepites de chocolat']),

    # --- vegetal -------------------------------------------------------
    ('cn-p-x-seitan', 'Seitan', 145, 25.0, 6.0, 2.0, ['seitan']),
    ('cn-p-x-pst', 'Protéine de soja texturée', 340, 50.0, 20.0, 1.5, ['proteine de soja texturee', 'pst']),
    ('cn-c-x-houmous', 'Houmous', 235, 7.5, 14.0, 17.0, ['houmous', 'hummus']),
    ('cn-c-x-falafel', 'Falafel', 330, 13.0, 32.0, 18.0, ['falafel', 'falafels']),
    ('cn-p-x-tofu-fume', 'Tofu fumé', 145, 17.0, 2.0, 8.0, ['tofu fume']),
    ('cn-p-x-tofu-soyeux', 'Tofu soyeux', 55, 5.5, 2.0, 3.0, ['tofu soyeux']),

    # --- bases de cuisine ----------------------------------------------
    ('cn-c-x-sauce-tomate', 'Sauce tomate cuisinée', 55, 1.5, 8.0, 1.8, ['sauce tomate']),
    ('cn-c-x-coulis-tomate', 'Coulis de tomate', 30, 1.3, 5.5, 0.2, ['coulis de tomate', 'passata']),
    ('cn-c-x-concentre-tomate', 'Concentré de tomate', 80, 4.0, 15.0, 0.5, ['concentre de tomate']),
    ('cn-c-x-lait-coco', 'Lait de coco (conserve)', 190, 2.0, 3.0, 19.0, ['lait de coco']),
    ('cn-c-x-creme-coco', 'Crème de coco', 330, 3.0, 6.0, 33.0, ['creme de coco']),
    ('cn-v-x-olives-vertes', 'Olives vertes', 145, 1.0, 1.0, 15.0, ['olives vertes', 'olives']),
    ('cn-v-x-olives-noires', 'Olives noires', 165, 1.5, 1.5, 17.0, ['olives noires']),
    ('cn-v-x-cornichons', 'Cornichons', 15, 0.7, 1.5, 0.2, ['cornichons']),
    ('cn-c-x-bouillon', 'Bouillon de volaille', 5, 0.5, 0.5, 0.1, ['bouillon', 'bouillon cube']),
    ('cn-c-x-vinaigrette', 'Vinaigrette', 450, 0.5, 3.0, 48.0, ['vinaigrette']),
]


def norm(x):
    x = ''.join(c for c in unicodedata.normalize('NFD', x)
                if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', ' ', x.lower().replace('\u2019', "'")).strip()


# --- collisions avec l'existant ------------------------------------------
existing_names = set()
existing_codes = set()
for fn in ('food-extended-catalog.js', 'food-basic-catalog.js'):
    src = io.open(os.path.join(ROOT, fn), encoding='utf-8').read()
    for m in re.finditer(r"F\('([^']+)','((?:[^']|\\')+)'", src):
        existing_codes.add(m.group(1))
        existing_names.add(norm(m.group(2)))

rows, skipped = [], []
for code, name, kcal, p, c, f, al in DATA:
    if code in existing_codes or norm(name) in existing_names:
        skipped.append(name)
        continue
    existing_codes.add(code)
    existing_names.add(norm(name))
    alias = ','.join("'%s'" % a.replace("'", "\\'") for a in al)
    rows.append("    F('%s','%s',%s,%s,%s,%s,[%s])"
                % (code, name.replace("'", "\\'"), kcal, p, c, f, alias))

HEADER = """/* Coach Neiram — aliments bruts et ingrédients de base.
   Macros P/G/L pour 100 g. Chargé entre le catalogue étendu et le moteur de
   recherche : il ne fait qu'alimenter window.__CN_FOOD_ITEMS__.
   Les féculents secs (pâtes, riz, semoule) sont volontairement présents en
   version crue : c'est ainsi qu'on les pèse avant cuisson. */
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
"""

FOOTER = """
  ];
  window.__COACH_NEIRAM_STAPLES_FOOD_CATALOG__ = items.length;
  register(items);
})();
"""

out = os.path.join(ROOT, 'food-staples-catalog.js')
io.open(out, 'w', encoding='utf-8').write(HEADER + ',\n'.join(rows) + FOOTER)

# --- branchement dans index.html -----------------------------------------
idx = os.path.join(ROOT, 'index.html')
s = io.open(idx, encoding='utf-8').read()
tag = '<script src="food-extended-catalog.js"></script>'
assert s.count(tag) == 1
if 'food-staples-catalog.js' not in s:
    s = s.replace(tag, tag + '\n<script src="food-staples-catalog.js"></script>', 1)

# --- correctif du filtre COMPOSITE ---------------------------------------
basic = os.path.join(ROOT, 'food-basic-catalog.js')
b = io.open(basic, encoding='utf-8').read()
old = 'veloute|puree de |crumble'
assert b.count(old) == 1
b = b.replace(old, 'veloute|crumble', 1)
io.open(basic, 'w', encoding='utf-8').write(b)

s = s.replace('2026-08-28.03-machines-salle', '2026-08-28.04-aliments-bruts', 1)
io.open(idx, 'w', encoding='utf-8').write(s)

print('aliments ajoutes :', len(rows))
print('ignores (deja la):', len(skipped), skipped)
