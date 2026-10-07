# Sécurisation de la clé IA et du webhook coach

Ce dossier contient les deux pièces qui mettent les secrets hors du navigateur :

| Fichier | Rôle | Où il vit une fois installé |
|---|---|---|
| `coach-neiram-proxy.js` | Proxy Cloudflare Worker | Cloudflare (gratuit) |
| `coach-sync.gs` | Script de réception v2.1 (la v2 du coach, durcie) | Google Apps Script, attaché au Sheet « Suivi Coaching en ligne » |

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

## Installer la v2.1 du script Google (octobre 2026)

Le Worker `coach-neiram-proxy` existe déjà et l'application l'utilise
(`app/src/lib/config.js`). Il reste à installer la v2.1 du script et à poser le
même secret des deux côtés. Compte 15 minutes, sur ordinateur.

**Pourquoi l'ordre compte** : si le script exige le secret avant que Cloudflare
l'envoie, tout est refusé. L'application garde alors les pointages en file (40 au
plus) et les renvoie, mais rien n'arrive dans le Sheet tant que ce n'est pas réglé.
On active donc la vérification en dernier.

### Étape 1 — Remplacer le script

1. Ouvre le Sheet « Suivi Coaching en ligne » → **Extensions** → **Apps Script**.
2. Clique sur `Code.gs`, sélectionne tout, supprime, colle l'intégralité de
   `coach-sync.gs`, puis **Enregistrer** (icône disquette).
3. En haut, dans la liste des fonctions, choisis `migrer` → **Exécuter**. Autorise
   l'accès si Google le demande. Il ajoute les colonnes manquantes à la fin du
   Journal, sans rien décaler.

### Étape 2 — Créer le secret

1. Choisis `genererSecret` → **Exécuter**.
2. Le secret s'affiche dans le **Journal d'exécution**, en bas de l'éditeur (ou
   dans une fenêtre du Sheet). Copie-le. Il est aussi rangé dans **Paramètres du
   projet** (roue dentée) → **Propriétés du script** → `SECRET_SYNC`.
3. Ne le colle nulle part ailleurs que dans Cloudflare (étape 3).

### Étape 3 — Le poser dans Cloudflare

1. `dash.cloudflare.com` → **Workers** → `coach-neiram-proxy` → **Settings** →
   **Variables and Secrets**.
2. `COACH_SYNC_SECRET` (type **Secret**) : colle le secret de l'étape 2. Si la
   variable existe déjà, remplace sa valeur.
3. Vérifie `COACH_SYNC_URL` : ce doit être l'adresse `/exec` du déploiement actif
   (Apps Script → **Déployer** → **Gérer les déploiements**).
4. **Deploy**.

### Étape 4 — Publier la nouvelle version du script

Apps Script → **Déployer** → **Gérer les déploiements** → crayon →
**Version : Nouvelle version** → **Déployer**. L'adresse `/exec` ne change pas.

Contrôles :

- [ ] L'adresse `/exec` ouverte dans un navigateur affiche « Synchro Coach Neiram
      active (v2.1) ».
- [ ] La fonction `verifier` affiche « Secret en place : oui · exigé : non ».
- [ ] La fonction `testerMail` t'envoie un e-mail et écrit une ligne TEST dans
      Journal et Alertes (supprime-les ensuite).

### Étape 5 — Vérifier avec un vrai pointage

Une fois la synchro activée dans l'application, pointe un créneau de test :

- [ ] une ligne apparaît dans l'onglet **Journal**, avec l'heure réelle et le statut
      « tenu » ;
- [ ] l'onglet **Erreurs** reste vide ;
- [ ] la colonne **Brut** ne contient pas le secret.

Si l'un de ces points échoue, ne passe pas à l'étape 6 : tant que `EXIGER_SECRET`
vaut `false`, rien n'est perdu.

### Étape 6 — Verrouiller

La copie du dépôt est livrée avec `var EXIGER_SECRET = true;` (état de la
production depuis le 04/10/2026). Sur une nouvelle installation, mets `false` avant
l'étape 4 et garde-le jusqu'à ce que l'étape 5 soit validée.

Dans `Code.gs`, passe `var EXIGER_SECRET = true;`, enregistre, puis **Nouvelle
version** (comme à l'étape 4). À partir de là, seules les requêtes passées par le
proxy, qui ajoute le secret, sont acceptées.

### Ce que la v2.1 change par rapport à la v2

| v2 (installée jusqu'au 04/10/2026) | v2.1 |
|---|---|
| Aucun secret vérifié | Secret partagé avec le proxy, exigé à l'étape 6 |
| Corps reçu recopié dans « Brut », secret compris | « Brut » nettoyé : jamais le secret |
| Erreur renvoyée comme `{statut: "erreur"}`, que le proxy lisait comme un succès : pointage perdu | `{ok: false}` : l'application garde le pointage et le renvoie |
| Champs attendus (`heure`, `duree`, `statut`) que l'application n'envoie pas : Heure réelle, Durée et Adherence vides | Champs réellement envoyés (`heureReelle`, `dureeMin`, `note`, résumé hebdo) ; Adherence calculé depuis le résumé hebdomadaire |
| Anti-doublon seul : de faux prénoms épuisent le quota Gmail | Plafond de 20 e-mails par jour, 3 par client, en plus de l'anti-doublon |
| Texte commençant par `=` exécuté comme formule | Écrit comme du texte |

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

`tests/coach-sync-v21.test.mjs` exécute le vrai `coach-sync.gs` sur un classeur
simulé (`tests/doublure-apps-script.mjs`) qui reprend les en-têtes du Sheet du
coach ; `tests/chaine-coach.test.mjs` fait traverser un événement de bout en bout.

```
node worker/test-worker.mjs
node --test tests/coach-sync-v21.test.mjs tests/chaine-coach.test.mjs
```

---

## Revenir en arrière

| Problème | Retour arrière |
|---|---|
| Le proxy pose souci | Remettre `PROXY_BASE_URL = ""` et republier : retour au fonctionnement d'avant |
| Le script refuse tout | Repasser `EXIGER_SECRET` à `false` et publier une nouvelle version |
| La v2.1 pose souci | Recoller la v2 (copie gardée par le coach) et publier une nouvelle version : l'adresse `/exec` ne change pas |
| Retour complet | Le tag `v0-legacy-baseline` marque l'état de production d'avant cette phase |


## Rappels push (rappels même appli fermée) — ajout du 7 octobre 2026

Le Worker envoie le rappel de créneau (1 h avant) et celui du bilan du dimanche même
quand l'application est fermée. Il garde, par téléphone, l'adresse de notification
(anonyme) et l'heure + le texte des rappels des 7 prochains jours. Aucun nom, aucune
donnée de suivi.

Installation dans Cloudflare (une seule fois, environ 15 minutes) :

1. **Workers & Pages → KV → Create namespace** : nom `coach-neiram-push`.
2. **Workers & Pages → coach-neiram-proxy → Settings → Bindings → Add → KV namespace** :
   nom de variable `PUSH_KV`, namespace `coach-neiram-push`. Deploy.
3. **Settings → Triggers → Cron Triggers → Add** : `*/15 * * * *` (toutes les 15 minutes).
4. **Edit code** : recoller `coach-neiram-proxy.js`, puis Deploy.

Aucun secret à copier : les clés VAPID (qui signent les notifications) sont créées par
le Worker à la première demande et gardées dans le KV (clé `vapid`). Les supprimer
oblige chaque client à réactiver l'option.

Vérifier : dans l'application, Réglages → l'option « Recevoir mes rappels même appli
fermée » apparaît (elle reste cachée tant que `PUSH_KV` n'est pas lié). Après
activation, une clé `ab:…` apparaît dans le namespace KV.

Coût : 0 €. Offre gratuite de KV : 100 000 lectures, 1 000 écritures et 1 000 listes par
jour ; la tâche planifiée fait 96 listes par jour et n'écrit que lorsqu'un rappel part.
