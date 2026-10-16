# Audit produit et technique — Coach Neiram

**Date :** 16 octobre 2026 · **Version auditée :** `main` @ `15941aa`, plus les commits non encore publiés `690a566` et `37b6753`.
**Périmètre :**
- l'application client (`coachneiram/coach-neiram-app`) ;
- le proxy Cloudflare (`worker/`) et le script Apps Script (`worker/coach-sync.gs`) ;
- côté coach, le Business OS (`coachneiram/application-coach-neiram`).

**Méthode :**
- Lecture du code : 4 audits parallèles (fonctionnel, sécurité et données, qualité technique, côté coach). Chaque constat majeur a ensuite été revérifié à la main dans le code.
- Exécution des tests :
  - 1 644 tests unitaires : 0 échec ;
  - 38 scripts navigateur sur Pixel 7 : 38 verts ;
  - même passe sur iPhone 13 : en cours au moment de la rédaction.
- Lecture des conditions de l'API Gemini.

**Ce qui n'a pas pu être vérifié depuis le dépôt :**
- la configuration réelle de Cloudflare (`ALLOWED_ORIGINS`, liaisons, Cron) ;
- la version d'Apps Script réellement en production (`EXIGER_SECRET`) ;
- le mode de facturation du projet Gemini ;
- les données réelles des clients (jamais lues).

Légende des statuts :
1. présent et fonctionnel ;
2. présent, à améliorer ;
3. partiel ou à vérifier ;
4. absent ;
5. à écarter.

---

## 0. Résumé pour Marien

**Ce qui est solide.**
- L'app client est riche et fiable : journal, nutrition, séances, créneaux, semaine difficile, bilans IA, Mon évolution, diète flexible, aide, rappels.
- Elle est testée : environ 1 600 tests et 38 parcours navigateur sur 2 téléphones.
- La CI bloque la mise en ligne si un test échoue.
- C'est une très bonne base pour un accompagnement premium. Il ne faut pas la réécrire.

**Le manque principal : toi.** Tu n'as aucun espace coach.
- Les données de chaque client restent sur son téléphone.
- Ce qui te parvient est éclaté :
  - quelques événements (séances pointées, alertes) dans un Google Sheet, et seulement pour le coaching en ligne ;
  - des bilans envoyés en fichier sur WhatsApp ;
  - des programmes dans environ 20 Sheets séparés.
- Dans le Sheet, un client n'est identifié que par son prénom tapé à la main. Deux « Thomas » se mélangent.
- C'est la fondation à construire pour suivre plus de clients sans plus de temps.

**4 problèmes à corriger avant tout le reste (P0)**

1. **Le Coach IA (onglet Repas) répond sans aucune consigne.** Il ne reçoit ni le régime, ni les allergies, ni les objectifs, ni le garde-fou médical. L'ancienne version les envoyait ; la migration les a perdus (`App.jsx:594`, `CoachIA.jsx:63`). Il peut donc proposer un aliment allergène. C'est le seul risque direct pour la santé d'un client.
2. **Le bilan hebdo perd silencieusement le programme et les créneaux.**
   - Ni l'IA ni le fichier envoyé au coach ne voient « 3 séances prévues, 2 faites » ou « 1 créneau manqué ».
   - Cause : `bilan-ia.js` et `bilan-html.js` lisent `planned`, `done`, `honored`, alors que `bilan.js` produit `prevus`, `faits`, `honores`.
   - Les tests utilisent les mêmes faux noms, d'où l'absence d'alerte.
3. **Le proxy `/ai` est ouvert à tout Internet.** N'importe qui peut consommer ton quota Gemini, voire te faire facturer si tu passes à l'offre payante. Le seul frein est une limite par minute gardée en mémoire, qui n'est pas fiable.
4. **N'importe qui peut écrire de faux événements dans ton Sheet** via `/coach-sync`. Le client y est identifié par un prénom libre ; le secret est ajouté par le proxy lui-même.

**Décisions qui t'appartiennent** (détail au §9)
- Photos du bilan mensuel : obligatoires ou facultatives ?
- Architecture de centralisation : je recommande Cloudflare, ton fournisseur actuel, pour 0 € à ta taille.
- Facturation Gemini.
- Coaching en ligne d'abord, ou tous les clients ?

---

## 1. État des lieux de l'architecture

| Élément | Constat | Preuve |
|---|---|---|
| Type d'app | PWA React 18 + Vite 6, publiée sur GitHub Pages (`app/dist`), service worker « réseau d'abord » pour les pages et mise à jour immédiate | `app/package.json`, `deploy.yml`, `app/public/sw.js` |
| Taille | Environ 33 000 lignes : `lib/` 18 900, `ecrans/` 10 600, `ui/` 2 500. Catalogues figés dans le code (`catalogues.js` 110 Ko, recettes 53 Ko) | `wc` |
| État et navigation | Pas de routeur : un état `ongletActif`. `App.jsx` (770 lignes) porte 31 `useState` et 9 `useEffect`, sans Context ni store | `App.jsx:80,707` |
| Stockage | 100 % localStorage sur le téléphone du client, environ 40 clés `coach_*` et `cn_*`. Aucune copie serveur, pas d'IndexedDB, pas de `storage.persist()` | `lib/stockage.js:7-43` |
| Comptes et identité | Aucun compte, aucune connexion, aucun identifiant client. Le coach distingue ses clients par leur prénom | `lib/synchro-coach.js:92` |
| Serveur | Un Worker Cloudflare : `/ai` vers Gemini avec la clé côté serveur, `/coach-sync` vers Apps Script et Google Sheet, `/push/*` avec stockage KV et Cron toutes les 15 min. Déployé à la main par copier-coller | `worker/coach-neiram-proxy.js` |
| Côté coach | Sheet « Suivi Coaching en ligne » : Journal, Alertes, Adhérence, Dashboard fait à la main, e-mails `[Coach]`. Sheets programme par client, CRM Sheets via `crm.gs`, Business OS Claude Code (agents, `kpi`, `crm`, `renouvellements`) | Business OS `docs/phase-1/architecture.md`, `worker/coach-sync.gs` |
| IA | Gemini (3.6-flash, puis 3.5-flash-lite, puis flash-latest) via le proxy. 9 usages : photo, code-barres, dictée de repas, recette, séance, courses, chat, bilan hebdo, bilan mensuel | `lib/ia.js`, `config.js` |
| Tests | 98 fichiers `node --test` (environ 1 550 tests) : 73 sur la logique, 39 de parité avec l'ancien `index.html`, 31 qui lisent le JSX par expressions régulières. 38 fumées Playwright sur 2 appareils émulés, en Chromium seulement | `tests/`, `scripts-migration/`, `navigateur.yml` |
| Documentation | `worker/README.md` et `docs/recettes-coach.md` à jour. `DEPLOIEMENT.md`, `tests/README.md`, `scripts-migration/README.md` et `.planning/STATE.md` périmés (ils décrivent encore la migration) | — |

---

## 2. Inventaire fonctionnel par rapport à la mission

### 2.1 Centralisation (mission §3)

| Fonctionnalité | Statut | Constat |
|---|---|---|
| Tableau de bord coach (clients, dernière séance, bilans en attente, alertes, renouvellements) | **4** (3 pour le coaching en ligne) | Uniquement l'onglet Dashboard du Sheet en ligne et les alertes e-mail. Les renouvellements sont dans le CRM (`renouvellements.mjs`). |
| Fiche client complète | **4** | Éclatée entre le profil sur le téléphone, le Sheet programme, le CRM et WhatsApp. |
| Notes privées du coach | **4** | Rien. |
| Isolation des données entre clients | **1 par construction** | Chaque téléphone ne voit que ses données. Mais rien n'empêche d'écrire au nom d'un autre dans le Sheet (§4). |
| Synchronisation | **3** | Coaching en ligne seulement. Ne remontent que les pointages, justifications, semaines difficiles, alertes et le résumé hebdo des créneaux. Ni nutrition, ni poids, ni bilan, ni mensurations. |

### 2.2 Bilan hebdomadaire (mission §4)

| Fonctionnalité | Statut | Constat |
|---|---|---|
| Agrégation automatique de la semaine | **2** | `bilan.js` est très complet : séances, plan, créneaux, nutrition, sommeil, énergie, stress, douleurs, poids, contrat, progression. Mais il souffre du bug P0-2. |
| Questionnaire (vécu des séances, courbatures, obstacles, réussite, disponibilités et matériel la semaine suivante) | **4** | Rien. Énergie, stress et sommeil viennent du journal quotidien. |
| Synthèse IA en sections (résumé, évolution, points forts, vigilance, à corriger, actions) | **2** | Bon garde-fou sur les douleurs (« aucun diagnostic »). Ne distingue pas faits, déclarations et hypothèses. Ne dit pas quand les données sont insuffisantes. |
| Envoi au coach | **2** | Fichier HTML partagé à la main. Rien d'archivé ni de comparable côté coach. |
| Validation, modification ou refus des propositions par le coach | **4** | Rien. |

### 2.3 Programmes adaptatifs (mission §5)

| Fonctionnalité | Statut | Constat |
|---|---|---|
| Séances courtes et sans matériel | **3** | 7 modèles (45, 30, 15 min) visibles en coaching en ligne seulement. Pas de variante par exercice. |
| Alternatives par matériel ou par niveau | **4** | La bibliothèque (environ 262 exercices) n'a aucun champ matériel, niveau ou muscle. |
| Semaine difficile | **2** | Très bonne mécanique : motif, séance de maintien, joker de série, alerte si deux semaines d'affilée. Mais réservée au coaching en ligne. |
| Progression de charge | **1** | `chargeSuivante` selon le RPE, arrondie à 2,5 kg. |
| Temps de repos | **4** | Aucun champ (le code le dit : `import-seances.js:94`). |
| Records et stagnation | **2** / **4** | Records présents mais fragiles : deux `cleExercice` différents (accents), les historiques peuvent se scinder. Aucune détection de stagnation. |
| Champs force athlétique (type de série, % 1RM) | **3** | Affichés mais non saisissables. `chargeFrom1RM` n'est jamais appelée. |

### 2.4 Personnalisation (mission §6)

| Fonctionnalité | Statut | Constat |
|---|---|---|
| Objectif, régime, allergies, cibles pas, eau et sommeil | **1** | — |
| Niveau sportif, matériel, exercices préférés ou exclus, contraintes, communication, autonomie | **4** | Absents du profil. |
| Parcours de reprise après une longue interruption | **4** | — |
| Mode parent (séances courtes, souplesse, régularité avant perfection) | **3** | Les briques existent : créneaux, maintien, séances de 15 min, joker, diète flexible. Le parcours n'est pas assemblé. |

### 2.5 Rapport mensuel (mission §7)

| Fonctionnalité | Statut | Constat |
|---|---|---|
| Bilan mensuel IA | **2** | Généré et affiché, sans photos, sans envoi au coach, sans ton commentaire. Une branche locale ajoute photos, envoi et rappel (non publiée, voir la décision D1). |

### 2.6 Communication (mission §8)

| Fonctionnalité | Statut | Constat |
|---|---|---|
| Messagerie, commentaires sur les séances, fichiers | **4** | WhatsApp hors application. |
| Vidéos techniques | **4** | Promises dans l'offre « Le Créneau Protégé », sans outil. |

### 2.7 Nutrition (mission §9)

| Fonctionnalité | Statut | Constat |
|---|---|---|
| Objectifs, calibrage, recherche, code-barres, photo, dictée, recettes avec parts, 30 recettes coach filtrées (régime, allergies, keto), courses, favoris, fibres, diète flexible | **1** | Les estimations IA sont signalées comme telles et corrigeables. |
| Plans de repas, portions famille, recettes économiques, préparation à l'avance, alternatives d'ingrédients | **4** | — |
| Coach IA nutrition | **2** | Bug P0-1. |

### 2.8 IA au service du coach (mission §10)

| Fonctionnalité | Statut | Constat |
|---|---|---|
| Résumer un bilan, repérer les changements, préparer un rapport, suggérer des adaptations, messages de suivi, dossiers à traiter | **4** côté app, **3** côté Business OS | Agents Réussite client et Pilotage, skill `programme-4-semaines`. Mais sans accès aux données des clients, puisqu'elles sont sur les téléphones. |

### 2.9 Parcours sur plusieurs mois (mission §11)

| Fonctionnalité | Statut | Constat |
|---|---|---|
| Contrat, ancienneté, trophées | **2** | Le contrat est déclaré par le client. |
| Bilans S1, S13 et S24, garantie 70 % sur 26 semaines | **3** | Règle écrite dans `memory/regles.md`, mais aucun calcul dans `app/src/lib`. |
| Onboarding, évaluation de départ, réévaluations, bilan 30/60/90 jours | **4** | L'onboarding se limite au profil. |

### 2.10 UX et UI (mission §12)

| Fonctionnalité | Statut | Constat |
|---|---|---|
| Identité visuelle sombre et or, cohérente | **1** | À conserver. |
| Police des fenêtres | **2** | Bug confirmé : Aide, Réglages, Quoi de neuf et la fenêtre Photo s'affichent en Times. Aucune `font-family` sur `body` (`styles.css`), et ces fenêtres sont rendues hors de `<Coque>`. |
| Accessibilité | **2** | La fenêtre modale n'a ni `role="dialog"`, ni touche Échap, ni gestion du focus. 5 boutons-icônes sans libellé. `textFaint` contraste à 3,25:1 (sous le seuil AA de 4,5) et sert 135 fois. 90 tailles de police à 10,5 px ou moins. |
| Robustesse | **2** | Pas d'Error Boundary : une exception dans un écran donne un écran blanc. |
| Doublons | **2** | Les 6 anciens graphiques hebdo de Tendances font doublon avec Mon évolution. |

### 2.11 À écarter ou à repousser (statut 5)

| Idée | Raison |
|---|---|
| Messagerie complète dans l'app | Gros chantier : temps réel, notifications, modération, conservation. WhatsApp fait déjà le travail. Mieux vaut des commentaires structurés rattachés à un bilan ou une séance (P2). |
| Analyse des vidéos techniques par IA | Peu fiable, et risque de faux sentiment de sécurité. Garder un dépôt de vidéo et ton retour humain (P3). |
| Lecture de l'app Santé, application native App Store | Coût (99 $/an, validation Apple, double maintenance) sans rapport avec le gain actuel. À revoir au-delà de 50 clients. |
| Modification automatique des programmes par l'IA | Contraire à ton positionnement. L'IA propose, tu valides. |
| Jugement du physique par l'IA à partir des photos | Peu fiable (lumière, distance) et risqué pour la relation client. L'IA peut seulement décrire une évolution, avec prudence. |

---

## 3. Problèmes et risques classés

| # | Gravité | Constat | Preuve | Correction |
|---|---|---|---|---|
| P0-1 | **Critique (santé)** | Coach IA sans consigne système : ni allergies, ni régime, ni garde-fou médical | `App.jsx:594` ne passe pas `construireConsigne` ; l'ancienne version avait `buildCoachSystemPrompt` (`index.html:1948`) | Reprendre la consigne dans `lib/`, la brancher, la tester |
| P0-2 | **Élevé (qualité de suivi)** | Le bilan hebdo perd le programme et les créneaux : prompt IA et fichier du coach | `bilan-ia.js:52-70,166`, `bilan-html.js:48` contre `plan-semaine.js:68`, `creneaux.js:193` | Lire les vrais champs, corriger les données de test |
| P0-3 | **Critique (coût et abus)** | `/ai` sans authentification : relais Gemini gratuit pour n'importe qui | `coach-neiram-proxy.js:96,137,144-153` | Plafond quotidien global (KV), binding Rate Limiting Cloudflare, prompts validés. À recoller dans Cloudflare par Marien |
| P0-4 | **Élevé (intégrité)** | `/coach-sync` accepte n'importe quel prénom : fausses alertes, faux e-mails | `coach-neiram-proxy.js:234-243` | Identifiant client aléatoire et jeton par client (voir l'architecture cible, §6) |
| P0-5 | Moyen | Ancienne adresse Apps Script `/exec` en clair dans le dépôt **public** (racine `index.html:267` et historique git) | Dépôt public (vérifié) | Marien : publier un nouveau déploiement Apps Script (nouvelle adresse), confirmer `EXIGER_SECRET = true` |
| P0-6 | Moyen (RGPD) | Données de santé (poids, douleurs, sommeil, stress) et photos de corps envoyées à Gemini, sans consentement explicite et sans information complète | `bilan-ia.js:208-229`, `aide.js:271` | Écran de consentement révocable, photos exclues par défaut, texte d'information exact |
| P0-7 | Moyen (perte de données) | Pas de `navigator.storage.persist()` : sur iPhone, le stockage peut être effacé après une longue période sans ouverture. La seule protection est l'export manuel | `stockage.js` | `persist()`, rappel d'export, puis copie serveur (P1) |
| P0-8 | Moyen (RGPD) | Aucun bouton « supprimer toutes mes données ». Le KV push n'expire jamais. Le Journal du Sheet n'a aucune durée de conservation | `Reglages.jsx`, `coach-neiram-proxy.js:521` | Bouton de suppression complète (désabonnement push compris), durée de vie dans le KV |
| P0-9 | Faible | Source d'image non échappée dans le bilan HTML : une sauvegarde trafiquée pourrait injecter du HTML chez le coach | `bilan-html.js:96` | Échapper la valeur et exiger un `data:image/` |
| P0-10 | Faible | `weekStats` et `monthStats` non recalculés quand le plan ou les semaines difficiles changent | `App.jsx:492-500` | Compléter les dépendances |
| T-1 | Dette | Le test de fidélité de l'ancien `index.html` impose un bloc balisé et un plafond pour chaque nouveau texte. Il est à 38 blocs, relevé 9 fois. La migration est finie | `tests/fidelite-ecrans.test.mjs:203` | Retirer le plafond et figer la liste des textes d'origine, ou retirer le test |
| T-2 | Dette | Le Worker et Apps Script sont déployés à la main : la production peut différer du dépôt (c'est déjà arrivé) | `worker/README.md` | Déploiement du Worker par la CI (wrangler et un jeton Cloudflare créé par Marien) |
| T-3 | Dette | Aucune Content Security Policy, polices Google chargées depuis un CDN (adresse IP transmise à Google) | `app/index.html` | Polices hébergées sur le site, CSP en balise meta |

**Note sur Gemini.**
- Les conditions officielles, lues le 16/10/2026, disent qu'en principe les données envoyées à l'offre gratuite servent à améliorer les produits Google et peuvent être lues par des personnes.
- **Mais pour un utilisateur établi dans l'Espace économique européen, ce sont les règles de l'offre payante qui s'appliquent même au quota gratuit** : aucune réutilisation pour l'entraînement, et un accord de traitement des données (sous-traitant).
- Il reste un stockage temporaire possible hors de l'UE.
- Le risque est donc moyen, pas critique. À confirmer avec le compte réellement utilisé.

---

## 4. Ce qui est réutilisable tel quel

- **Moteur de bilan :** `bilan.js`, `bilan-mensuel.js`, `bilan-ia.js` (sections et lecture des réponses par `lireBilan`). C'est la base du bilan intelligent et du rapport du coach.
- **Créneaux, semaine difficile, plan de semaine, trophées, joker :** le cœur du mode « jeune papa ». Il suffit de l'ouvrir au présentiel si tu le décides.
- **File d'envoi vers le coach :** `synchro-coach.js`, avec accusé de réception et reprise hors ligne. On peut y brancher un nouveau serveur sans changer l'app.
- **Explorateur :** `explorateur.js` (25 indicateurs). Il fonctionnera tel quel côté coach sur des données centralisées.
- **Import Google Sheets des programmes :** `import-seances.js`, pont avec tes Sheets actuels.
- **Proxy Cloudflare et KV :** le socle naturel d'une API coach.
- **Business OS :** agents, CRM, `renouvellements.mjs`. Le pilotage commercial reste là ; l'espace coach couvre le suivi sportif.

---

## 5. Recommandations, en remettant en question certaines demandes

1. **Commencer par le coaching en ligne.**
   - Tes 16 clients en présentiel te voient chaque semaine : un tableau de bord leur apporte peu.
   - L'offre en ligne (1 500 € pour 6 mois, garantie 70 %) a besoin de preuves de suivi et ne peut pas grandir sans centralisation.
   - Ouvrir ensuite au présentiel si l'outil fait ses preuves.
2. **Centraliser des synthèses, pas tout le journal.**
   - Le bilan de la semaine (chiffres déjà calculés, réponses au questionnaire, synthèse IA) suffit à piloter.
   - Recopier chaque repas sur un serveur multiplie le risque RGPD sans t'apporter grand-chose.
3. **Un bilan hebdo court, adaptatif, de 5 questions au maximum.**
   - Tout ce que le journal connaît déjà (sommeil, énergie, séances) est pré-rempli et seulement confirmé.
   - Restent :
     - le vécu des séances ;
     - les courbatures et la récupération ;
     - l'obstacle principal ;
     - la réussite de la semaine ;
     - le temps et le matériel disponibles la semaine suivante.
4. **La fiche « dossier à traiter » avant le tableau de bord exhaustif.**
   - Le plus rentable, c'est une liste triée sur le principe « qui a besoin de moi cette semaine, et pourquoi », avec les faits.
   - La fiche complète vient ensuite.
5. **Garder WhatsApp pour la conversation.**
   - Ajouter dans l'app ton commentaire sur chaque bilan : le client le lit dans l'app.
   - Il n'y a pas besoin d'une messagerie.

---

## 6. Architecture cible pour la centralisation

### 6.1 Options comparées

| Critère | A. Sheets + Apps Script (actuel, étendu) | **B. Cloudflare D1 + R2 + Access (sur le Worker actuel)** | C. Supabase (Postgres, authentification, stockage) | D. Firebase |
|---|---|---|---|---|
| Coût à ta taille (moins de 50 clients) | 0 € | **0 €** (offres gratuites, à revérifier à la mise en place) | 0 € (le projet se met en pause après une semaine d'inactivité) puis 25 $/mois | 0 € puis à l'usage |
| Ce qui existe déjà | Tout, mais `Code.gs` ne passe que par toi | **Worker, KV, Cron, plugin Cloudflare déjà connecté** | Rien | Rien |
| Authentification coach | Compte Google sur le Sheet | **Cloudflare Access : code par e-mail, aucun code de connexion à écrire** | Connexion par lien magique intégrée | Firebase Auth |
| Identité et isolation des clients | Prénom : faible | Code d'invitation par client (jeton aléatoire), vérifié par le Worker | Règles d'accès au niveau des lignes (RLS), puissantes mais faciles à mal configurer | Règles de sécurité |
| Photos et vidéos | Non | **R2, avec stockage dans l'UE possible** | Supabase Storage | Cloud Storage |
| Localisation des données | Google | Indice de localisation Europe pour D1, R2 dans l'UE (à confirmer au moment de la création) | Région Francfort | Région Europe possible |
| Dépendance ajoutée à l'app | Aucune | **Aucune (`fetch`)** | `supabase-js` (environ 50 Ko) | SDK Firebase (environ 100 Ko) |
| Évolutivité | Faible (le Sheet n'est pas une base de données) | Bonne (SQL) | Très bonne | Bonne |
| Risque principal | Fragilité, quotas Apps Script | Authentification client à écrire soi-même (périmètre réduit : jeton) | Nouveau fournisseur, mise en pause en gratuit | Verrouillage chez Google, modèle NoSQL |

**Recommandation : B.**
- Elle prolonge ce qui tourne déjà, coûte 0 € et n'ajoute aucune dépendance à l'app.
- L'espace coach est protégé par Cloudflare Access sans écrire une ligne d'authentification.
- On garde le Sheet en parallèle tant que le nouveau circuit n'est pas vérifié.
- Mon niveau de confiance est moyen-élevé. Ce qui me ferait changer d'avis : si tu veux que tes clients se connectent avec e-mail et mot de passe sur plusieurs appareils, Supabase devient préférable.

### 6.2 Modèle de données cible (D1)

- `clients` (id aléatoire, prénom, statut actif/pause/terminé, formule, mode, début, fin, objectif, niveau) : lisible par le coach.
- `jetons_client` (empreinte du jeton, client_id, créé, révoqué) : le jeton en clair n'est jamais stocké.
- `bilans_hebdo` (client_id, semaine, chiffres calculés en JSON, réponses au questionnaire, synthèse IA, statut : reçu / vu / traité).
- `propositions` (bilan_id, texte, origine ia/coach, décision acceptée/modifiée/refusée, décidé le) : la trace de tes validations.
- `notes_coach` (client_id, texte, date) : **jamais servies par une route client**.
- `commentaires_coach` (bilan_id, texte visible du client).
- `evenements` (les 7 types actuels de la synchro, rattachés à client_id).
- `photos` (client_id, clé R2, pose, mois, consentement_le) : phase ultérieure, seulement avec consentement.
- `journal_acces` (qui a lu ou écrit quoi, et quand) : traçabilité RGPD.

### 6.3 Règles d'accès

- **Routes client** (`/v2/client/*`) : jeton `Authorization: Bearer`, d'où le Worker déduit `client_id`. Le client ne peut qu'**écrire** ses bilans et événements, et **lire** ses propres commentaires du coach. Aucune route ne liste d'autres clients.
- **Routes coach** (`/v2/coach/*` et la page de l'espace coach) : derrière Cloudflare Access (ton adresse uniquement). Le Worker vérifie le jeton d'identité d'Access à chaque requête, pas seulement l'interface.
- **Tests de permissions obligatoires** :
  - un jeton A ne lit ni n'écrit B ;
  - aucune route client n'expose les notes ;
  - une route coach sans Access renvoie 403.

### 6.4 Migration, sauvegardes, retour arrière

1. **Double écriture :** l'app continue d'écrire en local (la source de vérité côté client) et envoie en plus ses bilans au nouveau serveur. Le Sheet continue de recevoir les mêmes événements.
2. **Activation client par client :** tu génères un code d'invitation, le client le colle dans Réglages. Sans code, l'app se comporte exactement comme aujourd'hui.
3. **Aucune donnée locale n'est supprimée.** Retour arrière : désactiver la route v2, l'app retombe sur le circuit actuel.
4. **Sauvegardes :** export D1 quotidien par le Cron vers R2, plus la restauration à une date antérieure de D1 (*Time Travel*, à confirmer selon l'offre).
5. **Données existantes :** les 4 dernières semaines de bilans peuvent être envoyées à l'activation, depuis le téléphone, avec accord du client.

### 6.5 Coût prévisible

- 0 € d'hébergement à moins de 50 clients, sur les offres gratuites Cloudflare (Workers, D1, R2, Access jusqu'à 50 utilisateurs) : chiffres à revérifier au moment de la création.
- IA : Gemini gratuit, ou quelques euros par mois en payant. À mesurer avec le compteur du point P0-3.

---

## 7. Feuille de route priorisée

Effort : S (moins d'une demi-journée), M (1 à 2 jours), L (3 à 5 jours), XL (plus d'une semaine).
Valeur client, gain coach et fidélisation : de 1 à 3.

### P0 — Fiabilité et fondations (à faire maintenant)

| Lot | Contenu | Valeur client | Gain coach | Fidélisation | Effort | Risque | Dépend de |
|---|---|---|---|---|---|---|---|
| **P0-A** (app, sans dépendance) | Consigne du Coach IA (P0-1), champs du bilan (P0-2), police des fenêtres, dépendances `weekStats`, échappement des photos du bilan, Error Boundary avec export de secours, `storage.persist()`, bouton « supprimer toutes mes données », consentement IA (photos et santé) révocable, accessibilité de base de la fenêtre modale (dialog, Échap) | 3 | 2 | 2 | M | Faible | — |
| **P0-B** (Worker, à recoller par Marien) | Plafond quotidien sur `/ai`, validation des prompts, liaison Rate Limiting, durée de vie des fiches push, refus CORS en 403 | 1 | 2 | 1 | S | Faible | Marien : recoller le Worker (déjà prévu pour le push) |
| **P0-C** (Marien) | Nouveau déploiement Apps Script (nouvelle adresse) et `EXIGER_SECRET`, facturation Gemini décidée, jeton Cloudflare pour le déploiement par la CI | — | 1 | — | S | — | — |
| **P0-D** (dette) | Test de fidélité : retirer le plafond. Documentation périmée (`DEPLOIEMENT`, `STATE`, READMEs) | — | 1 | — | S | Faible | — |

**Critères d'acceptation P0-A :**
- Le chat reçoit le régime et les allergies (test unitaire de la consigne, et test que `Repas` la transmet).
- Le bilan contient « séances prévues / faites » et « créneaux manqués » (tests avec de vrais objets `bilanPlanSemaine` et `resumeCreneaux`).
- Aucune donnée n'est envoyée à l'IA avant consentement (fumée).
- La suppression complète vide toutes les clés `coach_*` et `cn_*` et désabonne du push (fumée).
- Une erreur de rendu affiche un écran de secours avec export (fumée).
- 38 sur 38 fumées vertes sur les 2 appareils.

### P1 — Centralisation et suivi (après validation de l'architecture, D2)

| Lot | Contenu | Valeur client | Gain coach | Fidélisation | Effort | Risque |
|---|---|---|---|---|---|---|
| P1-A | Socle : D1, codes d'invitation, routes client v2, Access, tests de permissions, sauvegarde quotidienne | — | 2 | 1 | L | Moyen |
| P1-B | Bilan hebdo intelligent : questionnaire adaptatif de 5 questions maximum, pré-rempli. Envoi au serveur avec la synthèse IA séparant **faits, déclarations et hypothèses**, et signalant les données insuffisantes | 3 | 3 | 3 | L | Faible |
| P1-C | Espace coach v1 : « Dossiers à traiter », trois colonnes (attention requise / suivi ordinaire / progrès à valoriser), une donnée manquante affichée « non renseigné » et jamais comme un échec. Fiche client : bilans, séances, mensurations, notes privées | 1 | 3 | 2 | L | Moyen |
| P1-D | Validation par le coach : propositions IA acceptées, modifiées ou refusées. Ton commentaire visible du client dans l'app | 3 | 2 | 3 | M | Faible |

**Indicateurs :** taux de bilans reçus, délai entre bilan et réponse du coach, minutes passées par client et par semaine (à mesurer avant et après), alertes traitées.

### P2 — Personnalisation et valeur visible

- **Profil enrichi** (M) : niveau, matériel, exercices exclus ou préférés, contraintes déclarées, temps disponible, préférence de communication. Tous déclaratifs et modifiables.
- **Variantes par exercice** (L) : matériel et niveau dans la bibliothèque (environ 262 exercices), versions 15 et 30 minutes des séances types.
- **Semaine difficile ouverte au présentiel** (S, si tu le veux), avec reprise progressive.
- **Progression** (M) : temps de repos, détection de stagnation sur 3 séances, records fiabilisés (clé d'exercice unique).
- **Rapport mensuel partageable** (M) : la branche locale existante, plus ton commentaire et les objectifs du mois suivant. Photos selon la décision D1.
- **Parcours « Reprise » et mode parent** (M) : assemblage des briques existantes, bilans J30, J60, J90, calcul de la garantie 70 % sur 26 semaines.

### P3 — Différenciation et automatisation

- **Assistant IA du coach** (M) dans l'espace coach : résumé de la semaine de tous les clients, brouillons de messages **jamais envoyés sans ton clic**, préparation de réévaluation.
- **Dépôt de vidéos techniques** (L) sur R2, avec ton retour écrit ou vocal. Pas d'analyse IA.
- **Nutrition** (L) : portions famille, plans de repas, recettes économiques, alternatives d'ingrédients.
- **Accessibilité et performance** (M) : contrastes AA, tailles de police, découpage du bundle (634 Ko).

---

## 8. RGPD et points à faire valider par un spécialiste

Je signale ces points sans affirmer de conformité.

- **Nature des données.** Poids, masse grasse, mensurations, douleurs, sommeil, stress et photos du corps, collectés pour un suivi sportif, relèvent **probablement de données de santé** au sens de l'article 9 du RGPD. Cela impose un consentement explicite (ou une autre base valable) et une information claire. À valider.
- **Hébergement de données de santé (HDS).** La certification vise les données collectées dans une activité de prévention, de diagnostic ou de soins. Le coaching sportif n'en relève probablement pas. **À faire confirmer avant de centraliser** (confiance faible).
- **Sous-traitants.** Google (Gemini, Sheets, polices), Cloudflare (Worker, D1, R2), GitHub (hébergement du code de l'app, aucune donnée client). Tenir un registre des traitements et une politique de confidentialité accessible dans l'app.
- **Photos.** Le consentement exigé par l'article 9 doit être libre. Une photo « obligatoire » pour bénéficier du service fragilise ce consentement. D'où la décision D1.
- **Durées de conservation à fixer :** bilans, événements, photos, et fin d'accompagnement suivie d'une suppression ou d'une anonymisation.
- **Droits :** l'export existe ; la suppression locale arrive en P0-A ; la suppression côté serveur arrive avec P1.

---

## 9. Décisions attendues de Marien

| # | Décision | Options | Ma recommandation |
|---|---|---|---|
| D1 | Photos du bilan mensuel | (a) obligatoires, comme demandé le 16/10 ; (b) **bilan obligatoire, photos fortement encouragées mais facultatives, avec consentement explicite et révocable** | **(b)** : même valeur pour la comparaison, sans fragiliser le consentement. La branche est prête dans les deux cas. |
| D2 | Architecture de centralisation | A Sheets, **B Cloudflare**, C Supabase, D Firebase | **B** |
| D3 | Gemini | rester sur le quota gratuit (règles UE de l'offre payante) ou activer la facturation | Gratuit tant que le plafond de P0-B tient, avec un réexamen à 20 clients en ligne |
| D4 | Périmètre de l'espace coach | coaching en ligne d'abord, ou tous les clients | **En ligne d'abord** |
| D5 | Test de fidélité à l'ancien `index.html` | retirer le plafond, ou retirer le test | Retirer le plafond et garder la liste des textes d'origine |

---

## 10. Prochaine étape

- **P0-A** sur une branche, livré en PR, avec tests unitaires, fumées et suites complètes sur les 2 appareils.
- **En parallèle, sans engagement :** préparation du Worker de P0-B, à recoller en même temps que le push.
- **P1** démarre après tes réponses aux décisions D1 à D4.
