# Recettes du coach : format du catalogue

Les recettes affichées dans **Repas → Mes plats → Recettes du coach** viennent d'un seul fichier :
`app/src/lib/recettes-coach-catalogue.js`. La routine hebdomadaire « Recettes hebdo » y ajoute les
recettes de la semaine et ouvre une pull request. Marien relit et fusionne : la mise en ligne suit.

## Règles

- **Ajouter, ne jamais modifier ni supprimer** une recette existante. Les nouvelles recettes vont **en tête** du tableau.
- **JSON strict** entre les crochets (guillemets doubles, pas de virgule finale, pas de commentaire).
- `node --test tests/*.test.mjs` doit passer. `tests/recettes-coach.test.mjs` refuse toute recette qui ment
  (régime, macros, champs).

## Champs (tous obligatoires sauf `adaptations` et `tags`)

| Champ | Valeur |
|---|---|
| `id` | `AAAA-MM-JJ-nom-en-minuscules` (date du lundi de la semaine), unique |
| `semaine` | `AAAA-MM-JJ` (lundi) |
| `nom` | 3 à 70 caractères, unique dans le catalogue |
| `description` | 160 caractères maximum |
| `categorie` | `petit-dejeuner`, `dejeuner`, `diner`, `collation`, `dessert` |
| `profils` | au moins un parmi `perte`, `prise`, `maintien`, `remise-en-forme`, `force` (powerlifting et force athlétique), `bodybuilding`, `hyrox`, `marathon`, `ironman` |
| `regimes` | parmi `vegan`, `vegetarien`, `sans-porc`. `vegan` implique `vegetarien` et `sans-porc` ; `vegetarien` implique `sans-porc` |
| `contient` | familles et allergènes présents : `gluten`, `lactose`, `arachides`, `fruits-a-coque`, `oeufs`, `poisson`, `crustaces`, `soja`, `viande`, `volaille`, `porc`, `miel` |
| `portions` | entier de 1 à 12 |
| `preparationMin`, `cuissonMin` | minutes (0 si sans cuisson) |
| `difficulte` | `facile`, `moyenne` |
| `ingredients` | au moins 2 : `{ "nom": "...", "quantite": "..." }`, quantités pour la recette entière |
| `etapes` | au moins 2 phrases, tutoiement |
| `parPortion` | `{ "kcal", "p", "c", "f", "fibres" }`, entiers, **par portion** |
| `moment` | `quotidien`, `avant-entrainement`, `apres-entrainement`, `veille-de-course`, `pendant-effort`, `recuperation` |
| `adaptations` | texte libre : comment adapter les portions selon l'objectif |
| `tags` | libres : `rapide`, `economique`, `meal-prep`, `familial`, `sans-cuisson`, `repas-d-effort`… |

## Contrôles automatiques (tests)

- **Calories** : `kcal` doit valoir 4 × P + 4 × G + 9 × L, à 10 % près plus 2 kcal par gramme de fibres.
- **Vegan** : aucun ingrédient animal, y compris miel, beurre, lait de vache, crème, fromage, œufs, gélatine.
  Les laits et crèmes végétaux (« lait de coco », « lait d'avoine ») sont acceptés.
- **Sans porc** : aucun porc ni dérivé : jambon, lardons, bacon, chorizo, saucisson, saucisses, lard, saindoux, **gélatine** (utiliser l'agar-agar).
- **Végétarien** : ni viande, ni volaille, ni poisson, ni fruits de mer.
- `contient` doit être cohérent avec `regimes`.

## Qui voit quoi

- Un client ne voit **que** les recettes compatibles avec son régime (profil → « Ce que tu ne manges pas ») et ses allergies.
- En kéto : recettes à 15 g de glucides par portion au plus.
- Ses recettes d'abord, selon son objectif : perte → `perte`, `remise-en-forme` ; prise → `prise`, `bodybuilding`, `force` ;
  performance → `force`, `bodybuilding`, `hyrox`, `marathon`, `ironman` ; maintien → `maintien`, `remise-en-forme`.
- « Ajouter à mes recettes » range la recette dans ses recettes ; il la note ensuite dans le Journal, à la part.
