# Vérifications au navigateur

Ces scripts ouvrent l'application dans un vrai navigateur et s'en servent :
ils saisissent, enregistrent, puis relisent le stockage pour vérifier que le
geste a laissé une trace.

## Pourquoi ils existent

La suite unitaire compte près d'un millier de tests. Trois pannes de la
migration sont pourtant passées au travers, la suite étant verte au moment
des faits :

| Panne | Ce que voyaient les tests | Ce que voyait la cliente |
|---|---|---|
| Variable lue avant sa déclaration | 870 tests verts | Écran blanc, l'app ne démarrait pas |
| Import manquant | Build OK, 898 tests verts | L'écran plantait à l'ouverture |
| Jeton de couleur inexistant | Tout vert | Texte invisible |

Aucune ne se voit sans ouvrir l'application.

## Lancer la vérification complète

```
cd app && npm run build && cd ..
npm i --no-save playwright
npx playwright install chromium
node scripts-migration/verifier-navigateur.mjs
```

Le lanceur **découvre** les scripts (`fumee-*.mjs` et `etat-des-lieux.mjs`) :
il n'en tient aucune liste. Un nouveau script est pris en compte dès qu'il
est déposé ici, sans rien à câbler.

La chaîne GitHub « Navigateur » lance exactement cette commande à chaque
envoi de code.

## Écrire un nouveau script

Deux règles, et une seule vraiment importante.

**Agis, ne regarde pas.** Un écran qui s'ouvre ne prouve rien — quatre
boutons morts ont été trouvés dans cette migration alors que leur écran
s'affichait parfaitement. Saisis, enregistre, puis relis `localStorage`.

**Signale les absences avec `*** ... ***`.** C'est ce que le juge
(`verdict.mjs`) cherche. Il refuse aussi un code de sortie non nul, une
sortie vide, une ligne `ECHEC :`, et tout `ERREURS JS :` autre qu'`aucune`.

```js
console.log("BOUTON :", present ? "présent" : "*** ABSENT ***");
console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
```

Inutile d'appeler `process.exit` : le juge s'en charge, et c'est lui qui est
testé (`tests/verdict-fumee.test.mjs`) plutôt que chaque script.
