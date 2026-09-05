# Sécurisation de la clé IA et du webhook coach

Ce dossier contient les deux pièces qui mettent les secrets hors du navigateur :

| Fichier | Rôle | Où il vit une fois installé |
|---|---|---|
| `coach-neiram-proxy.js` | Proxy Cloudflare Worker | Cloudflare (gratuit) |
| `coach-sync.gs` | Script de réception, version durcie | Google Apps Script |

---

## Pourquoi

Avant, l'application appelait Google Gemini **directement depuis le navigateur**, avec
une clé saisie par le client, et postait vers le script Google via une adresse écrite
en clair dans un dépôt public. N'importe qui pouvait donc lire la clé, écrire de
fausses lignes dans le Google Sheets, et déclencher des e-mails jusqu'à épuiser le
quota Gmail du coach.

Après, l'application ne connaît plus aucun secret : elle parle au proxy, et c'est le
proxy qui détient la clé Gemini et le mot de passe du script.

**Ce que ça ne fait pas :** l'adresse du proxy reste publique (l'application est une
page publique, sans compte utilisateur). Quelqu'un peut donc encore l'appeler.
L'objectif atteint est de **limiter les dégâts** : données validées et plafonnées,
e-mails plafonnés, secrets inaccessibles.

---

## ⚠️ L'ordre des étapes est important

L'application ne peut pas savoir qu'un envoi a été refusé tant qu'elle poste en
`no-cors` : un événement rejeté serait **perdu sans message d'erreur**. Il faut donc
mettre à jour l'application **avant** d'activer la vérification côté Google.

L'ordre ci-dessous respecte cette contrainte. Ne le raccourcis pas.

---

## Étape 1 — Créer le Worker sur Cloudflare

1. Va sur `dash.cloudflare.com` et connecte-toi.
2. Menu de gauche : **Compute (Workers)** → **Create** → **Start with Hello World** → **Deploy**.
3. Une fois créé, clique sur **Edit code**.
4. Efface tout le contenu, colle l'intégralité de `coach-neiram-proxy.js`, puis **Deploy**.
5. Note l'adresse affichée, du type `https://mon-worker.mon-compte.workers.dev`.

## Étape 2 — Renseigner les secrets dans Cloudflare

Dans ton Worker : **Settings** → **Variables and Secrets** → **Add**.

Ajoute ces trois entrées, **de type Secret** :

| Nom | Valeur |
|---|---|
| `GEMINI_API_KEY` | ta clé Google Gemini |
| `COACH_SYNC_URL` | l'adresse `/exec` de ton script Google |
| `COACH_SYNC_SECRET` | un long mot de passe aléatoire, inventé maintenant |

Garde ce mot de passe sous la main : il devra être identique à l'étape 4.

Optionnel, en type Variable (pas Secret) : `ALLOWED_ORIGINS` avec l'adresse de ton
site, par exemple `https://coachneiram.github.io`.

**Déploie** après avoir ajouté les variables.

## Étape 3 — Installer la version durcie du script Google (sans encore l'activer)

1. Ouvre ton Google Sheets de suivi → **Extensions** → **Apps Script**.
2. Remplace tout le contenu par `coach-sync.gs`.
3. Dans le fichier, renseigne :
   - `EMAIL_COACH` : ton adresse e-mail (garde celle déjà en place)
   - `SECRET_PARTAGE` : **le même mot de passe** qu'à l'étape 2
   - `EXIGER_SECRET` : **laisse `false` pour l'instant** ← important
4. **Déployer** → **Gérer les déploiements** → crayon → **Version : Nouvelle version** → **Déployer**.

À ce stade, la validation des données et le plafond d'e-mails sont déjà actifs.
L'ancienne application continue de fonctionner normalement.

## Étape 4 — Brancher l'application sur le proxy

Dans `index.html`, ligne 32, remplace :

```js
const PROXY_BASE_URL = "";
```

par ton adresse de Worker, **sans barre oblique à la fin** :

```js
const PROXY_BASE_URL = "https://mon-worker.mon-compte.workers.dev";
```

Publie ensuite cette modification sur `main` (c'est ce qui met le site à jour).

## Étape 5 — Vérifier avant de verrouiller

Sur ton téléphone ou ton navigateur, après avoir rechargé l'application :

- [ ] Pointe un créneau → une nouvelle ligne apparaît dans l'onglet **Journal** du Sheets
- [ ] Le champ « Clé IA » a disparu des réglages
- [ ] Une fonction IA marche (photo de repas, ou bilan hebdo)
- [ ] Déclare une semaine difficile → tu reçois l'e-mail d'alerte

Si l'un de ces points échoue, **ne passe pas à l'étape 6** : dis-le, on diagnostique
d'abord. Tant que `EXIGER_SECRET` vaut `false`, rien n'est perdu.

## Étape 6 — Verrouiller

Une fois les quatre cases cochées, retourne dans Apps Script :

```js
var EXIGER_SECRET = true;
```

Puis **Déployer** → **Gérer les déploiements** → **Nouvelle version**.

À partir de là, seules les requêtes passant par ton proxy sont acceptées.

---

## Comportement de repli

`PROXY_BASE_URL` vide = l'application se comporte exactement comme avant. C'est le
cas tant que l'étape 4 n'est pas faite, ce qui rend la mise en production de ce
changement sans risque.

Pour l'IA, si le proxy est momentanément injoignable, l'application retombe
automatiquement sur la clé personnelle du client si elle en a une. Les erreurs
métier (quota atteint, clé invalide) ne déclenchent pas ce repli : elles sont
transmises telles quelles.

---

## Tests

`test-worker.mjs` couvre les deux routes du proxy : validation, plafonds, ajout des
secrets côté serveur, transmission des erreurs. Il n'appelle aucun service réel.

```
node worker/test-worker.mjs
```

---

## Revenir en arrière

| Problème | Retour arrière |
|---|---|
| Le proxy pose souci | Remettre `PROXY_BASE_URL = ""` et republier : retour au fonctionnement d'avant |
| Le script refuse tout | Repasser `EXIGER_SECRET` à `false` et redéployer |
| Retour complet | Le tag `v0-legacy-baseline` marque l'état de production d'avant cette phase |
