# Accès des clients et synchro signée (17 octobre 2026)

Correctifs P0-3 et P0-4 de l'audit (`docs/audit-produit.md`). Rien de ceci n'est actif tant que les étapes ci-dessous ne sont pas faites dans Cloudflare et dans Apps Script. **Ces gestes sont les tiens** : le dépôt ne déploie ni le Worker ni le script.

## Ce qui change

| | Avant | Après |
|---|---|---|
| `/ai` | ouvert à tout Internet, un seul frein par minute en mémoire | jeton propre à chaque client, plafonds par client (8/min, 80/jour) et global (`PLAFOND_IA_JOUR`, 800/jour par défaut), requête validée champ par champ, erreurs de Google jamais renvoyées |
| `/coach-sync` | n'importe qui écrit sous n'importe quel prénom | le prénom vient de la fiche du client (jeton) ; événement signé HMAC, horodaté, avec nonce |
| Proxy → Apps Script | secret en clair dans le corps | signature seule ; le script refuse signature fausse, contenu modifié, horodatage de plus de 5 min, rejeu |
| Envoi refusé | une ligne dans « Erreurs » (même pour un inconnu) | aucune écriture, nulle part |
| Identité client | prénom tapé dans le profil | code d'invitation à usage unique → jeton révocable |

**Le jeton n'est pas une clé secrète du coach.** Il n'ouvre que l'accès de ce client, à son propre quota, et tu peux le révoquer. Il est rangé sur le téléphone sous une clé que la sauvegarde n'emporte jamais (`acces_neiram`).

## Mise en place, dans l'ordre (≈ 45 minutes, sur ordinateur)

L'ordre évite toute coupure. À chaque étape, l'application continue de marcher pour les clients qui n'ont pas encore de code.

### 1. Créer la base D1

Cloudflare → *Storage & databases* → *D1* → *Create* :
- nom : `coach-neiram-acces` ;
- juridiction : **EU** (« Specify jurisdiction » → *European Union*).

Elle contient les fiches clients (identifiant aléatoire et libellé court, par exemple « Thomas B. »), les empreintes SHA-256 des codes et des jetons, et des compteurs. Aucune donnée de santé. Les tables se créent seules au premier appel.

> Je peux créer cette base pour toi avec le connecteur Cloudflare si tu me le demandes explicitement.

### 2. Réglages du Worker `coach-neiram-proxy`

*Workers & Pages* → `coach-neiram-proxy` → *Settings* :

| Où | Nom | Valeur |
|---|---|---|
| Bindings → D1 | `DB` | `coach-neiram-acces` |
| Bindings → KV (déjà prévu pour le push) | `PUSH_KV` | `coach-neiram-push` |
| Variables → **Secret** | `ADMIN_SECRET` | 43 caractères aléatoires, à générer sur ton ordinateur : `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Garde-le dans ton gestionnaire de mots de passe : il n'apparaît nulle part ailleurs. |
| Variables → Texte | `ACCES_CLIENTS` | `transition` (provisoire, voir l'étape 7) |
| Variables (si présente) | `ALLOWED_ORIGINS` | vide, ou contenant `https://coachneiram.github.io` |
| Triggers → Cron | | `*/15 * * * *` (rappels push et nettoyage des compteurs) |

### 3. Script Google v2.2 (nouvelle adresse)

Classeur « Suivi Coaching en ligne » → *Extensions* → *Apps Script* :
1. remplace tout `Code.gs` par `worker/coach-sync.gs` et **remets ton adresse** dans `EMAIL_COACH` ;
2. enregistre ;
3. *Déployer* → **Nouveau déploiement** → type *Application Web*, exécuter en tant que *moi*, accès *Tout le monde* → copie la nouvelle adresse `/exec`.

**Ne touche pas encore à l'ancien déploiement** : l'ancien Worker l'utilise jusqu'à l'étape 4.

### 4. Nouveau Worker

1. *Settings* → *Variables* → `COACH_SYNC_URL` : colle la nouvelle adresse de l'étape 3.
2. *Edit code* : remplace tout par `worker/coach-neiram-proxy.js` → *Deploy*.

### 5. Vérifier avec ton propre téléphone

1. Sur ton ordinateur : `export ADMIN_SECRET='…'` puis `node worker/invitations.mjs creer "Marien P."`.
2. Sur ton téléphone, dans l'application : *Réglages* → *Accès de ton coach* → saisis le code. Attendu : « Activé pour Marien P. ».
3. Coach IA : pose une question. Attendu : une réponse.
4. Pointe une séance avec un profil « en ligne ». Attendu : une ligne dans *Journal*, avec le client « Marien P. » (et non « … (non vérifié) »).
5. Dans Apps Script, lance `verifier()`. Attendu : « Secret en place : oui · exigé : oui ».

Si un point échoue, arrête-toi et reviens en arrière (voir plus bas).

### 6. Distribuer les codes

Lance `node worker/invitations.mjs creer "Prénom I."` pour chaque client. Puis envoie le code par WhatsApp, par exemple :

> Salut Thomas, petite mise à jour de sécurité de l'appli : ouvre Réglages → « Accès de ton coach » et saisis ce code : K7PM-Q4XT. Il est valable 30 jours et ne sert qu'une fois. Ça active l'assistant IA et l'envoi de tes séances.

`node worker/invitations.mjs liste` montre qui a activé son code (au moins « 1 téléphone(s) actif(s) »). Pour un nouveau téléphone, lance `node worker/invitations.mjs code <id>`.

### 7. Fermer l'accès anonyme

Quand **tous** les clients actifs apparaissent avec au moins un téléphone :
1. Cloudflare : supprime `ACCES_CLIENTS` (ou mets `obligatoire`), puis *Deploy*. À partir de là, `/ai` et `/coach-sync` refusent tout appel sans jeton.
2. Apps Script : `var ACCEPTER_SECRET_EN_CLAIR = false;` → enregistre → *Gérer les déploiements* → crayon sur le **nouveau** déploiement → *Version : nouvelle version* → *Déployer* (l'adresse ne change pas).

Un client qui n'a pas saisi son code voit alors : « L'assistant IA n'est pas activé sur ce téléphone : entre le code d'accès donné par ton coach dans les Réglages. » Ses séances attendent dans l'application et partiront après l'activation. **Attention : la file ne garde que les 40 derniers événements.** Au-delà, les plus anciens sont perdus. C'est pour cela qu'il ne faut fermer qu'une fois tous les codes activés.

### 8. Révoquer l'ancienne adresse `/exec`

L'ancienne adresse est publique (`index.html` à la racine du dépôt, et l'historique git). Changer l'adresse dans le code **ne la révoque pas** : il faut l'archiver.

Apps Script → *Déployer* → *Gérer les déploiements* → sélectionne l'**ancien** déploiement → *Archiver*. Vérification : ouvre l'ancienne adresse dans un navigateur. Attendu : une page d'erreur Google, et non « Synchro Coach Neiram active ».

### 9. Changer le secret de synchro (recommandé)

L'ancien secret voyageait dans le corps des requêtes (chiffrées par HTTPS, mais lisibles par le script et ses journaux). Pour le remplacer :
1. Apps Script : lance `tournerSecret()`, puis copie le nouveau secret qui s'affiche ;
2. Cloudflare : remplace `COACH_SYNC_SECRET` par ce nouveau secret, puis *Deploy* ;
3. pointe une séance, et vérifie qu'elle arrive dans *Journal* ;
4. Apps Script : lance `oublierAncienSecret()`.

Pendant l'opération, l'ancien et le nouveau secret sont tous deux acceptés : aucune coupure.

## Révoquer un client

Téléphone perdu, fin de suivi, comportement anormal : `node worker/invitations.mjs revoquer <id>`. Tous ses jetons tombent immédiatement, et ses codes non utilisés aussi.

## Plafonds

| Plafond | Valeur | Où le changer |
|---|---|---|
| IA par client | 8 par minute, 80 par jour (UTC) | `PLAFONDS` dans le Worker |
| IA tous clients | 800 par jour | variable `PLAFOND_IA_JOUR` |
| IA anonyme (mode transition) | 20 par heure et par adresse IP, 200 par jour | `PLAFONDS` |
| Synchro par client | 20 par minute, 200 par jour | `PLAFONDS` |
| Essais de code | 10 par heure et par adresse IP, 60 par heure au total | `PLAFONDS` |

Ces plafonds ne sont actifs **qu'une fois le Worker collé et la base D1 liée**. Un appel compte dès qu'il est reçu, même s'il est refusé ensuite.

**Coût Gemini.** Sans facturation activée, Google applique ses propres limites de quota gratuit et ne facture rien. Si tu actives la facturation, crée une alerte budgétaire dans Google Cloud (*Facturation* → *Budgets et alertes*). Une alerte prévient mais ne coupe pas : le vrai plafond reste `PLAFOND_IA_JOUR`.

## Revenir en arrière

| Problème | Geste |
|---|---|
| L'IA ne répond plus pour personne | Cloudflare : `ACCES_CLIENTS = transition`, puis *Deploy*. Si cela ne suffit pas, *Deployments* → version précédente → *Rollback*. |
| Les pointages n'arrivent plus | Cloudflare : remets l'**ancienne** adresse dans `COACH_SYNC_URL` et reviens à la version précédente du Worker (*Rollback*). L'ancien déploiement Apps Script n'est archivé qu'à l'étape 8 : il est encore là. |
| Le script refuse les événements signés | `verifier()` : le secret est-il en place ? Est-ce le même que `COACH_SYNC_SECRET` ? En dernier recours, `ACCEPTER_SECRET_EN_CLAIR = true` et nouvelle version. |
| Un client a perdu son code | `node worker/invitations.mjs code <id>`. |

Aucune donnée du client n'est supprimée par ces correctifs : le jeton est une clé de plus sur le téléphone, et la file des séances reste en place tant qu'un envoi n'est pas confirmé.

## Limites connues

- **Le mode transition ne protège pas l'accès** : il borne seulement le coût. Il faut en sortir (étape 7).
- **Un jeton volé** (téléphone déverrouillé, sauvegarde système du navigateur) donne l'IA dans le quota de ce client, et la possibilité d'écrire sous son prénom. Parade : la révocation.
- **Contrôle d'origine** : il n'arrête que les navigateurs.
- **Anti-rejeu côté Apps Script** : la mémoire des nonces (`CacheService`) peut être vidée plus tôt par Google. La fenêtre de 5 minutes borne alors le rejeu, qui exige de toute façon d'avoir intercepté un envoi signé.
- **Routes `/push`** : elles restent sans jeton, avec le frein en mémoire d'avant. Le risque se limite à des écritures dans le KV et à des rappels envoyés à un appareil qui s'est abonné lui-même. Ce point est hors du périmètre P0 et sera repris au lot P0-B.
- **Codes d'invitation** : 32⁸ ≈ 10¹² combinaisons. Avec 60 essais par heure au total, en deviner un prendrait des millénaires.
