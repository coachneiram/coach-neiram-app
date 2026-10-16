# Correctifs P0 — rapport (17 octobre 2026)

Suite de `docs/audit-produit.md` (§3, P0-1 à P0-4). Procédure de mise en production : `worker/SECURITE.md`.

## Synthèse

| # | Problème | État |
|---|---|---|
| P0-1 | Coach IA sans régime ni allergies | **Corrigé et testé** : unitaires et navigateur. La mise en ligne attend la fusion du PR. |
| P0-2 | Bilan hebdo : programme et créneaux vides | **Corrigé et testé** : unitaires et navigateur. La mise en ligne attend la fusion du PR. |
| P0-3 | `/ai` ouvert à tout Internet | **Corrigé, non vérifié en production.** Le Worker est à coller ; la base D1, les variables et les codes clients sont à faire (`SECURITE.md`, étapes 1 à 7). |
| P0-4 | `/coach-sync` usurpable | **Corrigé, non vérifié en production.** Script v2.2 à coller, nouveau déploiement, archivage de l'ancienne adresse, rotation du secret (`SECURITE.md`, étapes 3 à 9). |
| P0-5 | Ne pas développer messagerie, analyse de posture, bilan long | **Respecté.** Rien de cela n'existe ni n'a été ajouté. Le bilan hebdo ne pose aujourd'hui aucune question : il est calculé à partir des données saisies. |

## P0-1 — Coach IA : régime et allergies

**Cause racine démontrée.**
- `CoachIA.jsx` envoyait `systemPrompt: construireConsigne?.(…)`.
- `Repas.jsx` relayait cette prop, mais `App.jsx` rendait `<Repas … />` sans `construireConsigne`.
- La consigne valait donc `undefined` : le modèle ne recevait ni régime, ni allergies, ni objectif, ni garde-fou médical.
- L'ancienne application la construisait (`buildCoachSystemPrompt`, `index.html:1948`).

**Fait en écrivant les tests.**
- Dans l'ancienne consigne, les équivalences de lipides sans étiquette (« 10 g huile = 12 g beurre = 30 g crème fraîche », « huile olive/noix/coco ») partaient chez un intolérant au lactose ou un allergique aux fruits à coque.
- Le conseil « Graines de tournesol — Salade, yaourt » partait chez un client vegan.
- Ces fuites sont corrigées.

**Solution.**
- `app/src/lib/consigne-coach.js`, une seule source de vérité : le profil, lu par les fonctions déjà utilisées ailleurs (`restrictionDuProfil`, `repartitionDuProfil`, `regimeOk`).
  - `lireContraintes` distingue trois états des allergies : `ok`, `inconnu` (champ absent ou profil illisible) et `illisible` (champ mal formé). Une allergie hors liste est transmise telle quelle et signalée comme non vérifiable.
  - `construireConsigneCoach` : régime, répartition, allergies explicites, interdiction de citer un allergène, garde-fou médical élargi, et la règle « n'invente rien ».
    - Allergies `inconnu` ou `illisible` : aucune liste d'aliments n'est envoyée. Le modèle a la consigne de ne proposer aucun aliment précis et de demander les allergies.
    - Les listes d'aliments et d'équivalences sont filtrées par `regimeOk`, puis relues par les détecteurs d'ingrédients des recettes du coach : une ligne qui cite un aliment exclu n'est pas envoyée.
  - `verifierReponse` relit chaque réponse du modèle avec ces mêmes détecteurs. L'écran affiche un avertissement sous une réponse qui cite un allergène déclaré ou un aliment exclu, avec la limite : seuls les ingrédients connus sont vérifiés.
- `CoachIA.jsx` importe directement la consigne : plus de prop à faire descendre.
  - Un bandeau s'affiche si les allergies ne sont pas lisibles.
  - L'avertissement apparaît sous chaque réponse concernée.
- `Reglages.jsx` : enregistrer le profil depuis le formulaire, qui montre la liste des allergènes à cocher, transforme un champ `allergies` **absent** en liste vide, c'est-à-dire une déclaration « aucune ». Une valeur présente, même mal formée, n'est jamais modifiée.
- `bilan-ia.js` : les bilans hebdo et mensuel suivent la même règle. Si les allergies sont inconnues, ils ne proposent aucun aliment précis.

**Limite.** Une consigne ne garantit pas à elle seule une réponse sans allergène, et la relecture ne connaît que les mots de sa liste. Elle signale volontairement trop : « sans lactose » déclenche aussi l'avertissement.

## P0-2 — Bilan hebdo : programme et créneaux

**Cause racine démontrée.**
- Les producteurs écrivent :
  - `bilanPlanSemaine` → `{ prevus, faits, manques, restants }` ;
  - `bilanSemaine` (créneaux) → `{ prevus, honores, manques, decales, … }`.
- `bilan-ia.js` et `bilan-html.js`, portés tels quels depuis `index.html`, lisaient `planned`, `done`, `honored` et `missed`.
- Les tests passaient parce qu'ils fabriquaient leurs données avec ces faux noms.
- `weekStats` et `monthStats` n'étaient pas recalculés quand le programme ou les semaines difficiles changeaient (P0-10).

**Solution.**
- `app/src/lib/resumes-bilan.js` est le seul endroit qui lit ces résumés.
  - Le schéma français fait référence. Les anciens noms sont relus en second, pour les bilans que l'ancienne application a enregistrés dans `coach_reports`.
  - Un résumé absent rend `null` et rien n'est affiché. Un champ absent ou illisible rend `null`, jamais 0. Un 0 est un vrai zéro.
- Prompt IA :
  - « programme : 2/3 respectées, 1 manquée, 1 à venir » ;
  - « Créneaux du profil : 2/3 tenus, 1 manqué(s), 1 décalé(s) » ;
  - sans programme : « aucun programme planifié (aucune séance ne compte comme manquée) ».
- Fichier envoyé au coach : « Séances 2 (2/3 programmées) » et une nouvelle case « Créneaux tenus ».
- `App.jsx` : `planSemaine`, `routines` et `semainesDifficiles` sont ajoutés aux dépendances de `weekStats` et `monthStats`.

## P0-3 — `/ai`

**Cause racine.**
- Aucune authentification.
- Un frein de 20 appels par minute et par adresse IP, gardé dans la mémoire d'une instance, donc ni partagé ni durable.
- Les erreurs de Google étaient renvoyées telles quelles.

**Solution (`worker/coach-neiram-proxy.js`).**
- **Identité.**
  - Code d'invitation à usage unique (8 caractères, 30 jours), créé par le coach.
  - `/auth/activer` l'échange contre un jeton aléatoire de 32 octets propre au client.
  - D1 ne garde que des empreintes SHA-256. Le coach peut révoquer un client.
- **Plafonds**, avec un incrément atomique en D1 :
  - par client : 8 par minute, 80 par jour ;
  - global : `PLAFOND_IA_JOUR`, 800 par jour par défaut.
  - Changer de client ne contourne pas le plafond global.
  - Un jeton présent mais invalide ou révoqué est toujours refusé, même en mode transition.
- **Validation stricte.**
  - Champs autorisés : `model`, `messages`, `systemPrompt`, `maxTokens`. Les rôles sont `user` ou `model`.
  - Une partie est soit du texte, soit une image JPEG, PNG ou WebP en base64.
  - Au plus 8 images, 60 000 caractères de texte et 4 096 jetons de sortie ; corps de 8 Mo au plus.
  - Méthode POST seule. Les origines de navigateur sont limitées à `https://coachneiram.github.io` par défaut.
- **Erreurs.** Un code propre au proxy, jamais le corps de Google : `quota-fournisseur`, `fournisseur-refus`, `fournisseur-indisponible`, `amont-injoignable`. Seuls les `candidates` reviennent au téléphone.
- **Journal minimal** : route, statut, raison et 8 caractères de l'identifiant client. Ni contenu, ni prénom, ni adresse IP.
- **Mode `transition`**, le temps de distribuer les codes : sans jeton, les appels passent sous plafond anonyme (20 par heure et par IP, 200 par jour). **Ce mode ne protège pas l'accès**, il borne seulement le coût.
- **Échec fermé** : sans base D1 en mode obligatoire, la réponse est 503 ; l'accès n'est jamais ouvert.

**Côté application.**
- `app/src/lib/acces.js` : activation du code et garde du jeton sous `acces_neiram`. Cette clé est hors des préfixes sauvegardés, donc jamais dans un export et jamais écrasée par une restauration.
- `ia.js` et `synchro-coach.js` envoient `Authorization: Bearer …`.
- Messages clairs pour l'accès non activé, le quota du client et la fréquence. L'interprétation des réponses de l'ancien proxy est conservée pendant la coexistence.
- Réglages : carte « Accès de ton coach ».
- Outil du coach : `worker/invitations.mjs`, avec les commandes `creer`, `code`, `liste` et `revoquer`.

**Pourquoi D1 et pas KV.** L'offre gratuite de KV est limitée à 1 000 écritures par jour et KV n'a pas d'incrément atomique. Avec un compteur écrit à chaque appel, la limite serait atteinte. D1 ne contient aucune donnée de santé.

## P0-4 — `/coach-sync`

**Flux.** Application → `POST /coach-sync` (Worker) → `POST /exec` (Apps Script) → onglets Journal, Alertes et Adherence → e-mail au coach. Événements acceptés : `pointage`, `justification`, `semaine_difficile`, `alerte_semaines_difficiles`, `alerte_seances_manquees`, `alerte_decalages`, `resume_hebdo`.

**Cause racine.**
- Le Worker acceptait tout, prenait le prénom dans la requête et ajoutait lui-même le secret avant de transmettre.
- Le secret voyageait en clair dans le corps.
- L'ancienne adresse `/exec` est publique (`index.html:267`, historique git).
- Un corps invalide envoyé à `/exec` écrivait une ligne dans « Erreurs ».

**Solution.**
- **Worker.**
  - Jeton client exigé ; le prénom vient de la fiche client.
  - En mode transition, un appel sans jeton arrive marqué « (non vérifié) ».
  - L'événement est reconstruit champ par champ, puis signé : `HMAC-SHA256(secret, "v2.ts.nonce.charge")`.
  - Le secret ne voyage plus.
  - Sans secret de signature, la réponse est 503.
- **Apps Script v2.2 (`worker/coach-sync.gs`).**
  - L'authentification passe **avant toute écriture** : contrôle de forme, signature (secret actuel ou précédent), fraîcheur (5 minutes), puis nonce jamais vu, mémorisé 15 minutes après validation.
  - Un événement refusé n'écrit rien, ni ligne, ni e-mail, ni nonce.
  - `tournerSecret()` et `oublierAncienSecret()` permettent une rotation sans coupure.
  - `ACCEPTER_SECRET_EN_CLAIR` couvre la transition depuis le Worker actuel.
- **Révocation de l'ancienne adresse** : il faut archiver l'ancien déploiement dans Apps Script. Remplacer l'adresse dans le code ne la révoque pas.
- **Changement d'adresse** : l'application ne connaît pas l'adresse du script, seul le Worker la connaît. Aucune mise à jour de l'application n'est nécessaire, et les séances en attente repartent par le Worker.

## Fichiers modifiés

- **Application**
  - `app/src/App.jsx`
  - `app/src/ecrans/CoachIA.jsx`, `Repas.jsx`, `Reglages.jsx`
  - `app/src/lib/bilan-ia.js`, `bilan-html.js`, `ia.js`, `synchro-coach.js`, `recettes-coach.js` (export du détecteur `REVELE`)
  - Nouveaux : `app/src/lib/consigne-coach.js`, `resumes-bilan.js`, `acces.js`
- **Worker et script**
  - `worker/coach-neiram-proxy.js`, `coach-sync.gs`, `test-worker.mjs`, `README.md`
  - Nouveaux : `worker/SECURITE.md`, `worker/invitations.mjs`
- **Tests**
  - Nouveaux : `tests/consigne-coach.test.mjs`, `resumes-bilan.test.mjs`, `worker-acces.test.mjs`, `coach-sync-signature.test.mjs`, `acces-client.test.mjs`, `faux-d1.mjs`
  - Adaptés : `tests/chaine-coach.test.mjs`, `coach-sync-v21.test.mjs`, `doublure-apps-script.mjs`, `progression-corps.test.mjs`
- **Fumées** : `scripts-migration/fumee-correctifs-p0.mjs` (nouvelle) ; `fumee-panne-ia.mjs` (quota du client, fréquence, code non activé)

## Tests exécutés

| Contrôle | Résultat |
|---|---|
| `node --test tests/*.test.mjs` | 1 749 réussis, 0 échec |
| `node worker/test-worker.mjs` | tous les tests passent |
| `cd app && npm run build` | OK |
| `fumee-correctifs-p0.mjs` (Pixel 7) | 5 contrôles sur 5, aucune erreur JS |
| Suites navigateur complètes | iPhone 13 : 39 scripts sur 39. Pixel 7 : 38 sur 39 au premier passage. L'échec venait de `fumee-panne-ia`, qui attendait l'ancien sens du code « trop-de-requetes » : la fumée a été mise à jour avec les 4 refus du nouveau proxy (7 pannes sur 7). Second passage complet : 39 sur 39. |
| Tests de mutation | Chaque sabotage (signature, rejeu, prénom imposé, jeton exigé, plafonds) fait échouer des tests. Fichiers restaurés et vérifiés identiques. |

Les cas obligatoires demandés sont tous couverts :

| Correctif | Cas couverts |
|---|---|
| P0-1 | sans restriction, végétarien, végane, une allergie, plusieurs allergies, profil incomplet, données absentes ou mal formées, contraintes présentes dans la requête au modèle, vue dans le navigateur |
| P0-2 | prévues et réalisées, aucune réalisée, prévues pas encore passées, créneaux manqués, aucune donnée, ancien schéma, affichage réel dans le prompt et le fichier du coach |
| P0-3 | sans authentification, authentification invalide, requête légitime, fréquence, volume, charge trop grosse, paramètres invalides, méthode, erreurs Gemini, clé Gemini jamais renvoyée |
| P0-4 | sans authentification, signature absente ou invalide, contenu modifié, horodatage expiré, rejeu, schéma invalide, événement légitime, échec de la destination, aucun effet de bord d'un refus |

## Risques résiduels

- **Rien n'est actif en production** tant que le Worker et le script ne sont pas collés, et le PR fusionné pour la partie application.
- **Mode transition** : l'accès reste ouvert sous plafond. Il faut en sortir à l'étape 7.
- **Jeton volé** : il donne l'accès de ce client, dans son quota. Parade : la révocation.
- **File de l'application** : 40 événements au plus. Si l'accès est fermé avant que les codes soient activés, les plus anciens peuvent se perdre.
- **Mémoire des nonces** (`CacheService`) vidable par Google : le rejeu reste borné à 5 minutes.
- **Routes `/push`** sans jeton : hors périmètre P0, prévu au lot P0-B.
- **Facturation Gemini** : une alerte budgétaire Google ne coupe rien. Le plafond réel est `PLAFOND_IA_JOUR`.

## Actions manuelles (Marien)

Dans l'ordre de `worker/SECURITE.md` :
1. Créer la base D1 `coach-neiram-acces` en juridiction EU.
2. Réglages du Worker : `DB`, `PUSH_KV`, `ADMIN_SECRET`, `ACCES_CLIENTS=transition`, Cron.
3. Script v2.2 et **nouveau** déploiement.
4. Mettre la nouvelle adresse dans `COACH_SYNC_URL`, puis coller le Worker.
5. Vérifier avec ton téléphone.
6. Distribuer les codes.
7. Fermer l'accès anonyme et passer `ACCEPTER_SECRET_EN_CLAIR=false`.
8. Archiver l'ancien déploiement.
9. Faire tourner le secret.

## Vérifications avant la mise en production

- Fusion du PR, workflow « Déploiement » vert, `assets-manifest.json` identique au site en ligne.
- Étape 5 de `SECURITE.md` réussie : code activé, une réponse IA, un pointage arrivé sous le bon prénom.
- `node worker/invitations.mjs liste` : tous les clients actifs ont un téléphone avant l'étape 7.
- Après l'étape 7 : un appel sans jeton à `/ai` répond 401. Après l'étape 8 : l'ancienne adresse `/exec` ne répond plus.
