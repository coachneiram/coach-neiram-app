# Nutrition sur mesure : calcul, garde-fous et sources

Repris de l'app Neiram le 24 octobre 2026. Tout est inclus pour les clients du coach (aucun verrou Premium).

## Dans l'app coach : un repère, jamais un objectif

Le coach fixe les objectifs de ses clients. Ils restent ceux de `computeTargets` (`lib/nutrition.js`), calculés par `App.jsx` sur le profil. Le calcul sur mesure (`lib/nutrition-perso.js`, `ciblesPersonnalisees`) ne les remplace pas :

- il ne s'affiche que dans la carte **« Repère d'après tes données »** de l'onglet Nutrition (`ui/CarteObjectifsSurMesure.jsx`), sous les objectifs du coach, avec l'écart en kcal et la phrase « Les objectifs fixés par ton coach restent ceux qui comptent » ;
- la carte n'a **aucun bouton pour appliquer** le repère ;
- les réponses du questionnaire (rythme, grossesse, santé, catégorie de poids, macros, glucides des jours d'entraînement) vont dans la clé `cn_objectifs_sur_mesure`, **jamais dans le profil**. `computeTargets` ne les lit donc pas, et elles entrent dans la sauvegarde locale ;
- les **données de santé restent sur le téléphone** : elles ne partent ni dans la synchro du coach, ni dans le bilan HTML, ni dans les consignes IA. `tests/nutrition-perso.test.mjs` vérifie qu'aucun autre fichier ne lit cette clé.

Sans aucune réponse, le repère est égal aux objectifs du coach : un test le vérifie.

## Calcul

1. **Métabolisme de base**
   - Calcul par défaut : Mifflin-St Jeor.
   - Avec une masse grasse mesurée de moins de 90 jours (Mesures) : moyenne de Mifflin et de Katch-McArdle (370 + 21,6 × masse maigre).
   - Source : O'Neill 2023, méta-analyse sur les sportifs. Mifflin y sous-estime ; Cunningham et Katch sont plus justes.
   - Une maintenance calibrée sur les vraies données reste prioritaire.
2. **Rythme** en % du poids par semaine, à la manière de MacroFactor.
   - Perte : 0,25 / 0,5 / 0,75 / 1 % (Helms 2014).
   - Prise : 0,1 / 0,25 / 0,5 % (Iraki 2019).
   - Un kg de variation ne vaut pas toujours 7700 kcal : la densité dépend de la masse grasse (modèle de Forbes et Hall).
3. **Garde-fous**
   - Déficit maximal : 25 % de la maintenance (30 % si l'IMC est de 30 ou plus), et jamais plus de 1000 kcal.
   - Plancher : le plus haut du métabolisme de base et de 1200 kcal (femme) ou 1500 kcal (homme).
   - **Aucune perte proposée** pendant une grossesse ou l'allaitement, sous un IMC de 18,5, avant 18 ans, ou avec un antécédent de trouble alimentaire déclaré.
   - Apports EFSA ajoutés :
     - grossesse : +0 kcal au 1er trimestre, +260 au 2e, +500 au 3e ;
     - allaitement : +500 kcal ;
     - protéines : +1, +9, +28 et +19 g.
   - Maladie rénale : protéines limitées à 0,8 g/kg.
   - Après 65 ans : protéines d'au moins 1,2 g/kg (PROT-AGE).
4. **Macros sur mesure**
   - Protéines de 0,8 à 3 g/kg (plafond à 35 % des calories), lipides de 20 à 45 %, ou les trois macros en grammes.
   - Lipides jamais en dessous de 20 % des calories ni de 0,5 g/kg.
   - Glucides selon les jours : +20 % les jours d'entraînement, et la baisse correspondante les jours de repos. Le budget de la semaine reste le même.
5. **Modèles alimentaires** (dans l'app coach, ils ne changent que le repère : les objectifs du coach les traitent comme le standard)
   - Méditerranéen : 37 % de lipides.
   - DASH : 27 % de lipides et au moins 18 % de protéines.
   - Paléo : 35 % de lipides et au moins 22 % de protéines.
   - Les régimes kéto et low carb gardent leurs règles d'origine.
6. **Repères**
   - Fibres : le plus haut de 25 g et de 14 g pour 1000 kcal (EFSA et IOM).
   - Boissons : 80 % de l'apport total en eau de l'EFSA, soit 2,0 L pour une femme et 2,5 L pour un homme. +0,3 L pendant la grossesse, +0,7 L pendant l'allaitement.

## Contraintes et allergènes

- **Halal** (ni porc ni alcool), **casher** (ni porc, ni crustacés, ni mollusques), **sans alcool** et **flexitarien** se cumulent avec le régime.
- Ces contraintes filtrent les aliments proposés et la consigne du Coach IA. Elles ne changent aucun objectif.
- **14 allergènes de l'UE** (règlement INCO). Les six ajoutés (`lib/allergenes.js`) sont le sésame, la moutarde, le céleri, les sulfites, le lupin et les mollusques. La liste d'origine (`ALLERGENS`) reste intacte. Ils sont repérés dans les recettes et vérifiés dans les réponses de l'IA.
- Un produit Open Food Facts affiche « Contient » ou « Traces » pour les allergies du profil.

## Catégorie de poids et compléments

- **Catégorie de poids** (`lib/categorie-poids.js`) : force athlétique (IPF / FFForce), haltérophilie (catégories IWF du 1er août 2026), judo, et saisie libre pour les autres sports de combat. Rythme calculé jusqu'à la pesée ; plan jugé infaisable au-delà de 1 %/semaine (0,5 % avant 18 ans) ; repères après la pesée ; **aucun protocole de déshydratation**. Le plan règle le repère, pas les objectifs du coach.
- **Compléments** (`lib/complements.js`, `ui/CarteComplements.jsx`) : niveau de preuve, dose, précautions et source de chaque complément, liste « À éviter ». Avant 18 ans : aliments du sport seulement. Grossesse ou allaitement : aucune recommandation.

## IA fondée sur les preuves

`lib/preuves.js` (`REGLE_PREUVES`) est ajoutée à la consigne du Coach IA (`lib/consigne-coach.js`) et aux bilans hebdomadaire et mensuel (`lib/bilan-ia.js`, juste avant le format de réponse). La consigne du Coach IA interdit aussi tout protocole de déshydratation.

## Écartés volontairement

- **Régime carnivore** : aucune fibre, graisses saturées élevées, aucune preuve d'intérêt.
- **Pauvre en FODMAP** : il demande un diagnostic du côlon irritable et un suivi par un diététicien, en 3 phases. Il pourra venir plus tard, sous forme de module guidé avec minuteur de phase.

## Sources

- O'Neill 2023 (métabolisme de base chez les sportifs) : https://pubmed.ncbi.nlm.nih.gov/37632665/
- Helms 2014 : https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4033492/
- Iraki 2019 : https://pubmed.ncbi.nlm.nih.gov/31247944/
- Morton 2018 (protéines) : https://bjsm.bmj.com/content/52/6/376
- Hall, Body Weight Planner : https://www.niddk.nih.gov/research-funding/at-niddk/labs-branches/laboratory-biological-modeling/integrative-physiology-section/research/body-weight-planner
- MacroFactor, algorithmes : https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/
- EFSA énergie : https://efsa.europa.eu/en/efsajournal/pub/3005
- EFSA eau et fibres : https://www.efsa.europa.eu/en/press/news/nda100326
- PROT-AGE : https://researchexperts.utmb.edu/en/publications/evidence-based-recommendations-for-optimal-dietary-protein-intake/
- Thomas, Erdman et Burke 2016 (glucides du sportif) : https://pubmed.ncbi.nlm.nih.gov/26917108/
