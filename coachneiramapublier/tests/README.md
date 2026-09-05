# Tests

```
./run-tests.sh
```

Rien à installer. Tout repose sur le lanceur intégré à Node (`node --test`),
disponible depuis Node 18. Aucun test n'appelle un service réel : ni Gemini, ni
Google Apps Script, ni Open Food Facts.

## Ce qui est couvert

| Fichier | Ce qu'il protège |
|---|---|
| `nutrition.test.mjs` | Objectifs caloriques, macros, calibrage, reste du jour |
| `stockage.test.mjs` | Aller-retour des données, export/import, stockage indisponible |
| `synchro-coach.test.mjs` | File d'attente : aucun pointage perdu |
| `ia.test.mjs` | Routage vers le proxy, repli, traduction des erreurs |
| `../worker/test-worker.mjs` | Proxy Cloudflare : validation, plafonds, secrets |

## Comment ça marche

L'application est un unique `index.html` dont tout le code vit dans une fonction
anonyme immédiatement appelée. Rien n'en sort, donc rien n'est testable de
l'extérieur — c'était le principal obstacle.

`harness.mjs` contourne le problème sans toucher au fichier :

1. il lit `index.html` tel qu'il est livré ;
2. il repère la fermeture de la fonction anonyme et y injecte, **au vol et en
   mémoire seulement**, une ligne qui expose les fonctions voulues ;
3. il évalue le tout dans un bac à sable muni de doublures minimales (React,
   DOM, `localStorage`, `fetch`).

Conséquence importante : **les tests portent sur le vrai code livré**, pas sur
une copie qui pourrait diverger. Si `index.html` change, les tests suivent
automatiquement. Et le fichier de production n'est jamais modifié — c'est
vérifiable avec `git status` après une exécution.

## Ajouter une fonction à tester

Ajoute son nom dans la liste `A_EXPOSER` de `harness.mjs`. Un nom absent du
fichier ressort en `undefined` au lieu de faire échouer le chargement, donc la
liste tolère les erreurs de frappe et les fonctions renommées.

## Deux pièges à connaître

**Comparaison d'objets.** Les valeurs renvoyées viennent du bac à sable, donc
d'un autre *realm* JavaScript. Leur prototype diffère de celui du fichier de
test et `assert.deepEqual` échoue sur ce seul motif, valeurs identiques ou non.
Ramène l'objet dans le realm du test avant de comparer :

```js
assert.deepEqual({ ...resultat }, { attendu: 1 });
```

**Appels réseau.** Par défaut, toute requête lève une erreur explicite. Un test
qui a besoin du réseau doit fournir sa propre doublure :

```js
chargerApp({ fetch: maDoublure });
```

C'est volontaire : un test qui joindrait Internet serait lent, instable, et
consommerait le quota Gemini.

## Quand un test échoue

Un échec ne signifie pas forcément que le code est faux. Pendant l'écriture de
cette suite, un test a échoué sur `computeRemainingToday`, qui renvoie un solde
calorique négatif en cas de dépassement. Vérification faite, c'est intentionnel :
ce nombre sert de signal interne et l'interface ne l'affiche jamais. C'est
l'attente du test qui était mal calibrée, pas le code.

Avant de corriger l'application, vérifie donc toujours l'intention réelle.
