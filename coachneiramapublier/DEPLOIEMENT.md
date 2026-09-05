# Déploiement

## Comment le site est publié aujourd'hui

GitHub Pages sert directement le contenu de la branche `main`. Tu pousses un
fichier, le site se met à jour tout seul en une à deux minutes. Aucune étape
de construction.

C'est simple et robuste. Ça ne change pas tant que la phase 7 n'a pas été faite.

## Ce qui existe déjà, sans risque

`.github/workflows/tests.yml` lance les 159 tests à chaque envoi de code. Il ne
déploie rien et ne touche pas au site : il affiche seulement une croix rouge
sur le commit si quelque chose est cassé.

## Phase 7 — passer le déploiement sous GitHub Actions

### Pourquoi

Le build Vite (phase 8) produit des fichiers qui n'existent pas dans le dépôt.
Il faut donc une étape de construction avant publication, ce que le mode actuel
ne sait pas faire.

### Le principe de prudence retenu

Changer **le mécanisme** de déploiement et changer **ce qui est déployé** sont
deux risques différents. On les sépare :

1. D'abord basculer sur Actions **en publiant exactement ce qui est servi
   aujourd'hui**. Si ça marche, rien ne bouge pour tes clients — c'est le but.
2. Plus tard seulement, changer ce qui est publié.

Ainsi, si quelque chose se passe mal à l'étape 1, on sait que c'est le
mécanisme, pas le contenu.

### Procédure

**1. Activer le workflow**

Renommer `.github/workflows/deploy.yml.a-activer` en
`.github/workflows/deploy.yml`.

Tant qu'il porte l'autre nom, GitHub l'ignore.

**2. Changer le réglage GitHub Pages**

Dépôt → **Settings** → **Pages** → **Source** : passer de
« Deploy from a branch » à « **GitHub Actions** ».

**3. Lancer le workflow**

Onglet **Actions** → workflow « Déploiement » → **Run workflow**.

**4. Vérifier**

- Le workflow se termine en vert
- L'application s'ouvre normalement à son adresse habituelle
- Le mode hors ligne fonctionne toujours (voir `MODE-HORS-LIGNE.md`)

⚠️ Entre les étapes 2 et 3, le site peut être indisponible une à deux minutes,
le temps du premier déploiement. Fais-le à un moment calme, pas pendant que
tes clients s'entraînent.

### Retour arrière

Settings → Pages → Source → « Deploy from a branch » → `main` / `/ (root)`.

Le site revient immédiatement à son fonctionnement actuel. Le workflow peut
rester en place, il devient simplement sans effet.

## Phase 8 — publier le build Vite

À ne faire qu'une fois la phase 7 validée **et** les écrans migrés (phase 5).

Dans `deploy.yml`, remplacer l'étape « Rassembler les fichiers à publier » par
une construction Vite :

```yaml
- name: Installer les dépendances
  run: npm ci
  working-directory: app

- name: Construire
  run: npm run build
  working-directory: app

- name: Préparer la publication
  run: |
    cp -r app/dist _site
    cp sw.js manifest.json _site/
    cp *.png _site/
```

Points de vigilance :

- `base: "./"` doit rester dans `app/vite.config.js`, sinon la page reste
  blanche dans le sous-dossier de GitHub Pages. Un test le vérifie.
- Le service worker précache des noms de fichiers fixes. Le build Vite produit
  des noms contenant une empreinte (`index-CIWs635Q.js`). Il faudra adapter
  `sw.js`, ou générer sa liste au moment du build.
- Créer un tag avant la bascule, pour pouvoir revenir en arrière :
  `v-avant-bascule-vite`.

## Ce que les tests protègent déjà

- `tests/deploiement.test.mjs` : toute ressource chargée par l'application est
  bien publiée, le service worker aussi, et les tests conditionnent la mise en
  ligne.
- `tests/build-vite.test.mjs` : le build ne contient aucun chemin absolu ni
  aucun secret.
- `tests/parite.test.mjs` : l'ancienne et la nouvelle version calculent la
  même chose.
- `tests/stockage-compat.test.mjs` : les données des clients restent lisibles
  d'une version à l'autre.
