# Sécurisation de la clé IA et du webhook coach

> **17 octobre 2026 : codes d'accès clients et synchro signée (v2.2).** La procédure à jour est dans [`SECURITE.md`](SECURITE.md). Elle remplace l'étape « Installer la v2.1 » ci-dessous pour toute nouvelle mise en place. Le reste de ce fichier décrit l'historique.

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

## Défis entre amis (Team Neiram) — ajout du 24 octobre 2026

Routes `POST /defis/creer`, `/defis/rejoindre`, `/defis/progres`, `/defis/quitter`,
dans `coach-neiram-proxy.js` (section « Défis entre amis »). Rien à configurer :
elles utilisent la liaison `DB` déjà en place, et les tables sont créées toutes
seules à la première requête (`CREATE TABLE IF NOT EXISTS`, aucune table
existante n'est touchée) :

```sql
CREATE TABLE IF NOT EXISTS defis (code TEXT PRIMARY KEY, type TEXT NOT NULL, debut TEXT NOT NULL, fin TEXT NOT NULL, createur TEXT NOT NULL, cree_le INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS defis_participants (code TEXT NOT NULL, client_id TEXT NOT NULL, pseudo TEXT NOT NULL, valeur REAL NOT NULL DEFAULT 0, maj_le INTEGER NOT NULL, PRIMARY KEY (code, client_id));
CREATE INDEX IF NOT EXISTS defis_participants_client ON defis_participants (client_id);
```

- Réservé aux clients du coach : jeton client obligatoire, **même en mode
  « transition »**. Un client révoqué (`/admin/revoquer`) sort de ses défis.
- Publié aux autres participants : le pseudo (filtré) et le total, borné
  (pas ≤ 490 000, séances ≤ 21, minutes ≤ 4 200 sur 7 jours). Rien d'autre.
- Plafonds : 5 défis créés par jour et par client, 30 appels par minute et par
  client, 20 participants par défi, 3 défis en cours par client.
- La tâche planifiée (Cron) efface les défis 60 jours après leur fin.
- Tests : `node --test tests/worker-defis.test.mjs`.

## Communauté « Team Neiram » — ajout du 24 octobre 2026

Classements entre clients du coach, athlète du mois et de l'année, mur des
transformations. Routes `POST /communaute/*` dans `coach-neiram-proxy.js`
(section « Communauté Team Neiram »). Rien à configurer : elles utilisent la
liaison `DB` déjà en place, et les tables sont créées toutes seules à la
première requête (`CREATE TABLE IF NOT EXISTS`, aucune table existante n'est
touchée) :

```sql
CREATE TABLE IF NOT EXISTS communaute_profils (client_id TEXT PRIMARY KEY, pseudo TEXT NOT NULL, pseudo_norme TEXT NOT NULL UNIQUE, stats TEXT NOT NULL DEFAULT '{}', accord_disc INTEGER NOT NULL DEFAULT 0, accord_transfo INTEGER NOT NULL DEFAULT 0, maj_le INTEGER NOT NULL, cree_le INTEGER NOT NULL, masque INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS communaute_scores_mois (mois TEXT NOT NULL, discipline TEXT NOT NULL, client_id TEXT NOT NULL, score REAL NOT NULL, maj_le INTEGER NOT NULL, PRIMARY KEY (mois, discipline, client_id));
CREATE INDEX IF NOT EXISTS communaute_scores_client ON communaute_scores_mois (client_id);
CREATE TABLE IF NOT EXISTS communaute_transformations (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, periode TEXT NOT NULL, jours INTEGER NOT NULL, gras REAL, muscle REAL, texte TEXT NOT NULL, cree_le INTEGER NOT NULL, masque INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS communaute_transformations_date ON communaute_transformations (masque, cree_le);
CREATE TABLE IF NOT EXISTS communaute_bravos (transformation INTEGER NOT NULL, client_id TEXT NOT NULL, le INTEGER NOT NULL, PRIMARY KEY (transformation, client_id));
CREATE TABLE IF NOT EXISTS communaute_signalements (id INTEGER PRIMARY KEY AUTOINCREMENT, cible_type TEXT NOT NULL, cible TEXT NOT NULL, motif TEXT, auteur TEXT NOT NULL, cree_le INTEGER NOT NULL, traite INTEGER NOT NULL DEFAULT 0, UNIQUE (cible_type, cible, auteur));
```

| Route | Rôle |
|---|---|
| `/communaute/etat` | mon profil (pseudo, masqué, accords) ou rien |
| `/communaute/profil` | accord « profil » : créer le profil ou changer de pseudo (`accord: true` exigé) |
| `/communaute/stats` | mes chiffres (filtrés par les accords enregistrés côté serveur) |
| `/communaute/accord` | accord « disciplines » ou « transformation », donné ou retiré (retirer efface) |
| `/communaute/classement` | un classement (régularité, discipline, transformation), filtré par sexe et catégorie |
| `/communaute/athletes-du-mois` | podiums du mois, de l'année, mes titres |
| `/communaute/signaler` | signaler un pseudo ou une transformation |
| `/communaute/transformations/liste`, `/publier`, `/bravo`, `/supprimer` | le mur |
| `/communaute/supprimer` | « Supprimer mon profil de la communauté » : efface tout |
| `/admin/communaute` | modération du coach (`ADMIN_SECRET`), voir plus bas |

- Réservé aux clients du coach : jeton client obligatoire sur toutes les routes,
  **même en mode « transition »**. Un client révoqué (`/admin/revoquer`)
  disparaît des classements et du mur, et ses données communauté sont effacées.
- Trois accords distincts dans l'app, retirables à tout moment : profil (pseudo,
  séances du mois, régularité sur 30 jours), disciplines (performances, sexe et
  catégorie de poids, jamais le poids), transformation (gras perdu en %, muscle
  pris en kg, mur). Le serveur ne garde que ce que l'accord enregistré permet.
- Rien de santé : ni poids, ni mesure. Les exclusions du classement de perte
  (moins de 18 ans, grossesse, allaitement, trouble alimentaire, IMC sous 18,5,
  masse grasse très basse) se calculent sur le téléphone ; le serveur reçoit
  seulement `perte_eligible` (1 ou 0), jamais la raison, et ne la garde pas.
- Bornes : celles de l'app publique (total de force athlétique ≤ 1 300 kg, 5 km ≥ 12:30, gras
  perdu ≤ 13 % en 90 jours, muscle ≤ 3,3 kg en 90 jours…) : au-delà, refusé.
- Plafonds : 30 appels par minute et par client ; 100 écritures (profil,
  chiffres, accords), 10 signalements et 100 « Bravo » par jour et par client ;
  une transformation publiée par semaine ; message de 280 caractères au plus.
- Modération : pseudos et messages filtrés (insultes, liens, e-mails, numéros),
  **masquage automatique à 2 signalements de clients différents**.
- La tâche planifiée (Cron) efface les scores mensuels de plus de deux années
  civiles, les signalements traités et les publications masquées de plus de
  180 jours.
- Tests : `node --test tests/worker-communaute.test.mjs`.

### Modérer depuis l'Espace coach

Le plus simple : la page **Espace coach** (`espace-coach.html` à côté de l'app,
voir `SECURITE.md`, « L'Espace coach »), section « Modération de la
communauté ». Elle appelle les routes ci-dessous avec le secret tapé à
l'ouverture, jamais enregistré.

### Modérer avec `ADMIN_SECRET` (requêtes)

```
POST /admin/communaute   Authorization: Bearer <ADMIN_SECRET>
{ "action": "signalements" }                                  → à traiter, et profils masqués
{ "action": "masquer", "cible": "Pseudo" }                     → masque un profil
{ "action": "afficher", "cible": "Pseudo" }                    → le réaffiche (signalements traités)
{ "action": "masquer-transformation", "cible": "12" }          → masque une publication du mur
{ "action": "afficher-transformation", "cible": "12" }
{ "action": "supprimer-transformation", "cible": "12" }
{ "action": "supprimer-profil", "cible": "Pseudo" }            → efface tout ce que la communauté en garde
```

### Modérer à la main dans D1 (tant que `ADMIN_SECRET` n'est pas réparé)

Cloudflare → **Storage & Databases → D1** → la base liée en `DB` → **Console**.
Remplace `Pseudo` et `12` par les vraies valeurs.

```sql
-- Ce qui a été signalé (pseudo du profil, ou texte de la publication) :
SELECT s.cible_type, COUNT(*) AS nombre, GROUP_CONCAT(COALESCE(s.motif, ''), ' | ') AS motifs,
       COALESCE((SELECT p.pseudo FROM communaute_profils p WHERE s.cible_type = 'profil' AND p.client_id = s.cible),
                (SELECT t.id || ' — ' || t.texte FROM communaute_transformations t WHERE s.cible_type = 'transformation' AND t.id = CAST(s.cible AS INTEGER))) AS apercu
FROM communaute_signalements s WHERE s.traite = 0 GROUP BY s.cible_type, s.cible;

-- Masquer un profil (il disparaît des classements, des podiums et du mur) :
UPDATE communaute_profils SET masque = 1 WHERE pseudo = 'Pseudo';
-- Le réafficher et classer ses signalements :
UPDATE communaute_profils SET masque = 0 WHERE pseudo = 'Pseudo';
UPDATE communaute_signalements SET traite = 1 WHERE cible_type = 'profil' AND cible = (SELECT client_id FROM communaute_profils WHERE pseudo = 'Pseudo');

-- Masquer une publication du mur (son numéro est dans l'aperçu ci-dessus) :
UPDATE communaute_transformations SET masque = 1 WHERE id = 12;
-- La réafficher :
UPDATE communaute_transformations SET masque = 0 WHERE id = 12;
UPDATE communaute_signalements SET traite = 1 WHERE cible_type = 'transformation' AND cible = '12';
```

## Smart Coach : gravité, statut et inactivité — ajout du 25 octobre 2026

Validé par le coach le 25/10/2026. Trois nouvelles alertes, un niveau sur
toutes les alertes, un statut dans l'onglet Alertes.

| Alerte | D'où | Quand | Niveau |
|---|---|---|---|
| `alerte_inactivite` | Worker (tâche planifiée) | aucune saisie ni ouverture depuis 4 à 6 jours / 7 jours et plus | attention / critique |
| `alerte_poids` | appli, à l'enregistrement d'une pesée | moyenne des 7 derniers jours à plus de 2 % des 7 précédents | attention |
| `alerte_poids` | appli | objectif perte, 2 pesées par semaine sur 3 semaines, baisse ≤ 0,2 kg | info |
| `alerte_nutrition` | appli, à l'ouverture (1 fois/jour) | 5 jours ou plus hors cible sur les 7 derniers jours notés (au moins 5) | attention |

Coaching en ligne seulement. Rien ne change en présentiel. Table complète des
niveaux : `app/src/lib/gravite-alertes.js` (copie dans `coach-sync.gs`,
`niveauParDefaut`, vérifiée par `tests/gravite-alertes.test.mjs`).

Ce qui part chez le coach : le libellé du client, une phrase de tendance
(« Poids stable depuis 3 semaines en phase de perte », « Variation de +2,4 % en
une semaine », « Calories hors cible 5 jours sur 7 (moyenne 2 650 kcal pour
2 200) », « Aucune saisie depuis 5 jours »), un nombre de jours et le niveau.
Jamais la liste des pesées, jamais le détail des repas, jamais le motif d'une
exclusion (grossesse, allaitement, trouble alimentaire, moins de 18 ans : pas
d'alerte de stagnation, c'est tout).

### Worker : présence et inactivité

- `POST /presence` `{ derniereSaisie: "AAAA-MM-JJ" }` : jeton client
  obligatoire, même en mode « transition » ; 6 appels par jour et par client
  au plus (l'appli en envoie un par jour, à l'ouverture). Table créée toute
  seule (`SCHEMA`), aucune table existante modifiée :

  ```sql
  CREATE TABLE IF NOT EXISTS presence (client_id TEXT PRIMARY KEY, vu_le INTEGER NOT NULL, derniere_saisie TEXT, alerte_le INTEGER, niveau TEXT);
  ```

- Tâche planifiée (même Cron `*/15 * * * *`) : entre 8 h et 9 h, heure de
  Paris, une seule fois par jour (dernière exécution gardée dans `compteurs`,
  clé `tache:inactivite`, réservée atomiquement : plus de 20 h d'écart
  exigées). Jours = jours depuis le plus récent de `derniere_saisie` et du
  jour de `vu_le`. Une seule alerte par niveau tant que le client ne revient
  pas ; sa présence suivante remet tout à zéro. Un client qui n'a jamais
  envoyé de présence (code pas activé) ou révoqué n'est jamais alerté.
- L'alerte part à `COACH_SYNC_URL`, signée comme `/coach-sync`. Un téléphone
  ne peut pas en envoyer (`/coach-sync` répond `400 type-reserve`).
- `POST /admin/presence` (`ADMIN_SECRET`) : bloc « Présence » de l'Espace coach.
- Rien à configurer dans Cloudflare : recoller le Worker, Deploy.
- Tests : `node --test tests/worker-presence.test.mjs`.

### Script Google v2.5

Procédure (aussi dans l'en-tête de `coach-sync.gs`) :

1. Extensions > Apps Script : copier l'ancien `Code.gs` dans un fichier
   `sauvegarde-v2.4`, **entièrement commenté**.
2. Coller `coach-sync.gs` dans `Code.gs`, enregistrer. La propriété
   `EMAIL_COACH` (v2.4) est déjà en place.
3. Lancer `migrer()`. **Google redemande une autorisation** : la première
   ligne `/** @OnlyCurrentDoc */` limite le script à ce classeur au lieu de
   tous tes Google Sheets, la portée change donc. Accepter. `migrer()` ajoute
   « Niveau » et « Statut » à la fin de l'onglet Alertes (liste : nouveau, vu,
   traité, ignoré). La colonne E « Traité » ne bouge pas.
4. Gérer les déploiements > crayon du déploiement **actif** > Nouvelle version
   > Déployer (même adresse /exec).
5. `verifier()`, puis `testerMail()` : objet « [Coach] ⚠️ TEST … ».

Mails : seulement attention (« [Coach] ⚠️ … ») et critique (« [Coach] 🔴 … »).
Une alerte info (stagnation, semaine difficile isolée) s'écrit dans l'onglet
sans mail. Plafonds (3 mails par client et par jour, 20 au total) et
anti-doublon (12 h par client et par type) inchangés.

### Dashboard : formules à poser (le classeur n'est pas modifié par le dépôt)

Hypothèse : l'onglet Alertes a les colonnes A à E du coach, donc `migrer()`
met **Niveau en F** et **Statut en G**. Vérifie avec `verifier()` avant de
coller ; si les lettres diffèrent, remplace F et G. Séparateur `;` (classeur
en français), à poser en ligne 2 puis tirer vers le bas, `Dashboard!A` =
libellé client.

« Alertes non traitées » (remplace la formule actuelle de `Dashboard!D`) : une
ligne compte si son statut est « nouveau » ou « vu », ou, pour les anciennes
lignes sans statut, si « Traité » n'est pas coché. Cocher « Traité » sur une
ligne neuve la sort aussi du compte (pas de double saisie) :

```
=COUNTIFS(Alertes!$B$2:$B;$A2;Alertes!$G$2:$G;"nouveau";Alertes!$E$2:$E;FALSE)+COUNTIFS(Alertes!$B$2:$B;$A2;Alertes!$G$2:$G;"vu";Alertes!$E$2:$E;FALSE)+COUNTIFS(Alertes!$B$2:$B;$A2;Alertes!$G$2:$G;"";Alertes!$E$2:$E;FALSE)
```

« Alerte la plus grave » (nouvelle colonne, par exemple `Dashboard!E`), parmi
les non traitées, critique > attention > info ; vide s'il n'y en a aucune :

```
=IFERROR(LET(n;FILTER(Alertes!$F$2:$F;Alertes!$B$2:$B=$A2;Alertes!$E$2:$E<>TRUE;(Alertes!$G$2:$G="nouveau")+(Alertes!$G$2:$G="vu")+(Alertes!$G$2:$G=""));IFS(COUNTIF(n;"critique")>0;"🔴 critique";COUNTIF(n;"attention")>0;"⚠️ attention";COUNTIF(n;"info")>0;"info";TRUE;""));"")
```

Les anciennes lignes n'ont pas de niveau : elles comptent dans « non
traitées » mais pas dans « la plus grave ». Mise en forme conseillée :
Format > Mise en forme conditionnelle sur la colonne, texte contenant
« critique » en rouge, « attention » en orange.
