# Audit et propositions d'amélioration — 28 octobre 2026

**Statut : rapport seul, aucun code modifié.** La partie B (reprises de l'app publique) attend la validation de la liste de la partie A (§8).

**Base lue :** `coach-neiram-app` @ `9c078d2` (main), `neiram-app-public` @ `ae680f7` (PR #68, 28/10), `docs/demande-app-coach-3.md`, `docs/audit-produit.md` (16/10), `AMELIORATIONS.md`, `MODE-HORS-LIGNE.md`, `worker/coach-sync.gs` v2.5, `worker/coach-neiram-proxy.js`, Business OS (`memory/`, `tools/`, skill `programme-4-semaines`).

**Non vérifié :** l'état réel de Cloudflare et d'Apps Script en production, les Sheets eux-mêmes (je n'ai pas ouvert `Programme_CoachNeiram` ni `Suivi Coaching en ligne`), le comportement sur un téléphone réel, le nombre de clients en ligne. Chaque affirmation ci-dessous cite le fichier qui la prouve ; ce qui est une estimation est dit.

Effort : S (moins d'une demi-journée), M (1 à 2 jours), L (3 à 5 jours).

---

## 0. À lire d'abord

1. **Le nombre de clients en ligne n'est écrit nulle part.** `memory/business.md` (06/09) : « aucun revenu identifié » pour l'offre en ligne. Le journal du 16/10 : 14 codes créés, **tous en présentiel** ; le contrôle du 25/10 : 11 clients avec un code actif. Avec 0 à 5 clients en ligne, l'amélioration la plus rentable est probablement **vendre**, pas coder. Tout ce qui suit vaut à partir du premier client en ligne payant ; dis-moi combien tu en as.
2. **Deux sources se contredisent sur la garantie 70 %.** `memory/offres.md` : « Dans l'app : le taux est calculé et exposé ». Le code : `tauxRespect()` (`lib/creneaux.js`) ne calcule que 4 semaines glissantes, et aucun fichier de `app/src` ne calcule 26 semaines, ni les points de maintien à 0,5, ni le plafond de 3 semaines difficiles. Je ne tranche pas : c'est le premier point à régler (§4, idée I3).
3. **Un client en ligne qui active son code mais ne saisit jamais rien n'est jamais alerté.** `worker/coach-neiram-proxy.js:934-939` : l'alerte ne concerne que le client « qui a déjà envoyé une présence avec une date de saisie » ; sans saisie connue, « ni l'un ni l'autre n'est alerté ». C'est le décrochage le plus coûteux (J0 à J7) et c'est le seul qu'aucune alerte ne couvre (§2).

---

## 1. Écart avec l'app publique

Référence : `docs/fonctionnalites.md` (public), `docs/demande-app-coach-2.md` et `-3.md`.

| Bloc public | Dans l'app coaching ? | Preuve | Reste à faire ? |
|---|---|---|---|
| Sommeil et stress d'après les études, performances et niveaux officiels, transformation, sports, programmes guidés, calendrier « Mon année », bilan de l'année | Repris | `lib/sommeil-preuves.js`, `performances.js`, `transformation.js`, `stats-disciplines.js`, `programmes-sport.js`, `calendrier.js`, `bilan-annee.js` | Non |
| Nutrition sur mesure, catégorie de poids, compléments, règle des preuves, habitudes, leçons, déclics | Repris | `nutrition-perso.js`, `categorie-poids.js`, `complements.js`, `preuves.js`, `habitudes.js`, `lecons.js`, `declics.js` | Non |
| Défis entre amis, communauté, classements, transformations | Repris | `defis-amis.js`, `communaute.js`, `ui/EcranCommunaute.jsx` | Non |
| Menu de la semaine (PR #52) | Repris | `lib/plan-repas.js`, `ecrans/MenuSemaine.jsx` | Non |
| Raccourcis (PR #53), appui long sur l'icône | Repris | `lib/raccourcis.js`, `manifest.json` → `shortcuts` | Non |
| Minuteur de repos (PR #54) | Repris. Widget et activité en direct : natifs, ne se reportent pas | `ui/MinuteurRepos.jsx` | Non |
| Tutoriels sur chaque carte (PR #55) | Repris | `lib/tutos*.js`, `ui/Tutos.jsx` | Non |
| **Blocs, minuteur de bloc, éditeur** (PR #65, 28/10) | **Absent** | pas de `blocs.js`, `chrono-bloc.js`, `ChronoBloc.jsx`, `EditeurBloc.jsx`, `CarteBloc.jsx` | À décider (§7) |
| **Catalogue de 91 séances, 240 mouvements** (PR #65) | **Absent** (le coaching a ses propres modèles : `SEANCE_TEMPLATES`, 7 séances de 15, 30 et 45 min) | `lib/catalogues.js:2292` | Écarter |
| **Import de programme par photo ou PDF** (PR #64 Worker, #67 app) | **Absent** | — | Écarter (§7) |
| Abonnement, Premium, parrainage payant, stores, idées et retours | Hors périmètre : les clients du coaching paient autrement | — | Non |

**Conclusion.** Tout ce que ton relevé du 24/10 listait est repris. Ce qui reste, ce sont les trois nouveautés du 28/10 (PR #64, #65, #67), dont aucune ne vise un papa en reprise ni un débutant en salle.

---

## 2. Parcours client, de l'installation à J30 (coaching en ligne)

| Étape | Ce que le client doit faire | Où ça peut casser | Écran / fichier | Détecté aujourd'hui ? |
|---|---|---|---|---|
| J0 · Installer | Ajouter l'icône à l'écran d'accueil | Sans installation sur iPhone, aucun rappel ne s'affiche. Le bandeau se masque 14 jours | `lib/installation.js` | Non |
| J0 · Profil | Remplir le formulaire de profil (calories, macros) puis **choisir lui-même** « Type de coaching : en ligne » | Si le client laisse « présentiel » (valeur par défaut) : pas de créneaux, pas de pointage vers toi, pas d'alerte, pas de présence | `ecrans/Bienvenue.jsx`, `ecrans/ChampsProfil.jsx:81` (`coachingMode` par défaut « presentiel »), `lib/semaine.js:74` (`enLigne`) | **Non.** D1 ne stocke que `libelle` (`coach-neiram-proxy.js:253`) |
| J0 · Créneaux | Déclarer ses créneaux (le premier proposé est « lundi 18:30 ») | Aucun créneau → `evaluerAlertes` rend « aucun creneau au profil » : aucune alerte de manquées ni de décalages. Le client peut aussi les modifier ou les supprimer | `lib/moteur-alertes.js` (`raison: "aucun creneau au profil"`) | Non |
| J0 · Code d'accès | Saisir son code dans Réglages | Sans code : ni IA, ni synchro, ni présence | `lib/acces.js`, `ecrans/Reglages.jsx` | Oui, via l'Espace coach (liste des clients et présence) |
| Premier pointage | Ouvrir l'app, aller dans Séances, section créneaux, « Pointer » | Environ 3 appuis depuis l'ouverture (à chronométrer sur téléphone). La carte « Aujourd'hui » du Journal ouvre la séance mais ne pointe pas un créneau | `ecrans/Creneaux.jsx:164` (`pointer`), `lib/aujourdhui.js:56` | Un pointage arrive dans le Journal du Sheet |
| J1 à J7 · Aucune saisie | — | **Aucune alerte** : pas de date de saisie, donc pas de calcul (`proxy:939`). L'alerte de manquées ne part que si des créneaux existent | `proxy:934-939`, `moteur-alertes.js` | **Non** |
| Première semaine difficile | Déclarer la semaine, choisir un motif, faire une séance de maintien 15 à 20 min | Plusieurs gestes (à compter sur téléphone). Le maintien compte pour un créneau tenu dans l'app | `ecrans/SemaineDifficile.jsx`, `lib/plan-semaine.js:104` | Oui : type `semaine_difficile` (info) ; deux de suite → `alerte_semaines_difficiles` (attention) |
| Premier bilan du dimanche | Tendances → « Envoyer à mon coach » → partage d'un fichier HTML (WhatsApp) | Cinq étapes manuelles. Rappel local de 10 h à 21 h (inutile sur iPhone sans installation) et rappel push à 17 h (journal du 07/10). L'app note « envoyé » dès que le partage ou le téléchargement aboutit (`App.jsx:263`), pas à la réception par toi | `lib/rappels.js:25`, `ecrans/Tendances.jsx:355`, `lib/bilan-html.js:240` | Non : aucun événement `bilan` dans la synchro (`synchro-coach.js:23`) |
| Créneaux manqués | — | 2 manqués sur 14 jours → alerte (attention), 3 → critique. **Calculé sur le téléphone, à l'ouverture** : un client qui n'ouvre plus l'app ne déclenche rien | `creneaux.js:248` (`SEUIL_ALERTE_MANQUES = 2`), `gravite-alertes.js` (`MANQUES_CRITIQUE = 3`) | Oui, partiellement. L'inactivité du Worker (4 jours attention, 7 critique) prend le relais pour qui a déjà saisi |
| J30 | — | Pas de bilan de J30 ni de bilans S1, S13, S24 dans l'app | `docs/audit-produit.md` §2.9 | Non |

**Ce que ton énoncé a de juste :** l'alerte à 2 créneaux sur 14 jours, la séance de maintien, le pointage à l'unité, les paliers d'inactivité existent. **Ce qu'il suppose à tort :** que le client est « en ligne » sans que personne ne le règle. Aujourd'hui c'est le client qui se classe, et rien ne te dit s'il s'est mal classé.

---

## 3. Ton temps de suivi, par semaine

| Tâche manuelle | Ce que l'app donne déjà | Ce qui manque | Données |
|---|---|---|---|
| Lire le bilan du dimanche (fichier HTML reçu sur WhatsApp, un par client) | `bilan.js` calcule tout (séances prévues et faites, maintien, énergie, sommeil, douleurs, poids) | Rien n'arrive dans ton Sheet : seul `resume_hebdo` (taux de respect sur 4 semaines) | Existent dans l'app, absentes du Sheet |
| Repérer qui décroche | Onglet Alertes (niveau et statut, v2.5), mails attention et critique, Espace coach (présence) | Le cas « jamais démarré » (§2) | Présence et activation existent dans D1 |
| Relancer | Alertes avec message | Le texte de la relance est à écrire à chaque fois | Alerte + historique des pointages : existent |
| Reprogrammer un bloc de 4 semaines | Skill `programme-4-semaines` (entrées : charges S1 à S4, RPE S1 à S4, commentaires) | Les charges et RPE par exercice sont **dans l'app du client**, pas dans ton Sheet. Le bilan hebdo ne les contient pas (`bilan.js` donne séances, notes avec RPE, corps) | Existent dans l'app (`séances`, carnet), jamais exportées |
| Mesurer la garantie 70 % | — | Aucun calcul (voir §0) | N par client et date de départ : **absents** ; pointages : existent dans le Journal ; indicateur « maintien » : absent du pointage (`synchro-coach.js:199` ne l'envoie pas) |
| Préparer un renouvellement | `tools/renouvellements.mjs` (CRM seul) | Voir §4 | — |

**Mesure à faire avant de décider quoi que ce soit :** note pendant 2 semaines tes minutes par client en ligne et par tâche. Sans ce chiffre, je ne peux pas estimer le gain.

---

## 4. Renouvellement : ce que tu devrais avoir 30 jours avant l'échéance

`tools/renouvellements.mjs` sait déjà dire **qui** arrive à échéance (colonnes `Date début`, `Durée`, `Date fin`, `Statut` du CRM). Il ne dit pas **comment s'est passée la période**.

Dossier d'une ligne par client, sans rien lire :

| Information | Source | Existe ? |
|---|---|---|
| Date de fin, offre | CRM, onglet Clients | Oui |
| Pointages par semaine depuis le départ | Journal du Sheet (`Type = pointage`, `Date séance`) | Oui |
| Taux sur 4 semaines | Onglet Adhérence | Oui |
| **Taux depuis le départ et garantie 70 %** | À calculer : N par client, date de départ, points (maintien = 0,5), semaines difficiles déclarées (plafond 3) | **Non** : N et départ à saisir ; indicateur « maintien » à ajouter au pointage |
| Alertes ouvertes ou ignorées | Onglet Alertes (Niveau, Statut) | Oui |
| Dernière saisie | D1 `presence` via l'Espace coach | Oui |
| Visios faites (14 prévues), bilans S1, S13, S24 | — | **Non** : à saisir dans le CRM (colonne ou interactions) |
| Motif de départ si le client part | — | **Non** : aucune colonne `Motif` connue dans le CRM |

La clé de rapprochement entre le CRM (`ID`, `Prénom`) et le Sheet en ligne (`Client` = libellé du code) n'existe pas : c'est ton libellé de code qui fait foi. À fixer par une règle (libellé = prénom + initiale, identique partout), pas par du code.

---

## 5. Fiabilité : ce qui peut perdre des données ou casser le suivi

| Risque | Constat | Preuve | Gravité | Correction |
|---|---|---|---|---|
| Aucune copie serveur des données du client | Tout est dans `localStorage`. Téléphone perdu ou changé sans export : carnet de charges, photos, repas perdus. Les pointages restent dans ton Sheet | `AMELIORATIONS.md`, `lib/stockage.js` | Élevée pour un contrat de 6 mois | Rappel de sauvegarde existant (14 jours de suivi puis tous les 30 jours, `rappel-sauvegarde.js`) : le raccourcir à 7 jours pour le coaching en ligne, ou export hebdomadaire joint au bilan du dimanche |
| Pas de stockage persistant demandé | Aucune occurrence de `navigator.storage.persist()` dans `app/src` (recherche faite). Sur iPhone, hors icône installée, Safari peut vider le stockage d'un site non visité pendant une longue période. **Confiance moyenne** (comportement WebKit de mémoire, à tester) | grep | Moyenne | Demander `persist()` à l'ouverture (S) et rendre l'installation obligatoire dans la mise en route en visio |
| Photos dans `localStorage` | Photos de progression en base64, 500 px, qualité 0,72 (`App.jsx:213`), une série par semaine. Je n'ai **pas mesuré** la taille ; ordre de grandeur de quelques dizaines de ko par photo, donc plusieurs Mo sur 6 mois à 3 photos par semaine, face à un plafond d'environ 5 Mo selon le navigateur. Un échec d'écriture est signalé (`surEchecEcriture`), pas silencieux | `lib/images.js`, `lib/stockage.js:101` | À mesurer | Mesurer avec `occupationStockage()` sur un téléphone ayant 8 semaines de photos (S) |
| File d'envoi vers toi | 40 événements au plus, les plus anciens abandonnés ; vidée seulement à l'ouverture de l'app (pas de synchro en arrière-plan). Un pointage fait hors ligne arrive à la prochaine ouverture | `synchro-coach.js:19`, `MODE-HORS-LIGNE.md` | Faible à moyenne | Rien à faire à cette échelle ; surveiller si un client signale un pointage « absent » |
| Alerte de manquées calculée sur le téléphone | Ne part que si l'app s'ouvre | `moteur-alertes.js` | Moyenne | Couverte en partie par l'inactivité du Worker ; le cas « jamais démarré » ne l'est pas (I1) |
| Déploiement manuel Worker et Apps Script | « La production peut différer du dépôt (c'est déjà arrivé) ». Le 25/10, version du Worker relue identique à main ; la version active du script Apps Script restait à confirmer | `docs/audit-produit.md` T-2, journal 25/10 | Moyenne | Garder la relecture après chaque redéploiement ; rien de nouveau à coder |
| Créneaux modifiables par le client | La base de l'alerte (et de la garantie) est déclarée et modifiable par le client | `ChampsProfil.jsx:72-74` | Moyenne | Pour la garantie, N vient de toi, hors app (I3) |

---

## 6. Tableau des idées

Légende de la dernière colonne : **Faire**, **Plus tard** (avec le déclencheur), **Écarter**. Nature : **Retenir/Vendre** (touche l'adhérence, ton temps ou le renouvellement) ou **Construire** (confort ou technique).

| # | Idée | Ce qui change (client / toi) | Données utilisées | Existent-elles ? | Effort | Impact attendu | Nature | Reco |
|---|---|---|---|---|---|---|---|---|
| I1 | Alerte « jamais démarré » : code activé, aucune saisie à J+3 (attention) puis J+5 (critique) | Toi : tu sais qui n'a jamais commencé et tu l'appelles à J+3 au lieu de le découvrir à J+30. Client : un appel au bon moment | `jetons.cree_le` (activation) et `presence.derniere_saisie` null, dans D1 | **Oui** (D1) | S (Worker, à recoller par toi) | Adhérence : fort sur J0 à J7. Confiance moyenne : je n'ai aucune statistique d'abandon | Retenir | **Faire** |
| I2 | Saisir par client : N séances par semaine, date de départ (1re séance), mode (en ligne), nombre de visios et bilans faits, motif de départ | Toi : base de la garantie, des dossiers de renouvellement et de la mesure des abandons | Rien en base | **Non : saisie, pas de code** (colonnes dans le CRM, onglet Clients) | S (15 min par client) | Débloque I3, I4 et l'analyse des abandons | Retenir | **Faire en premier** |
| I3 | Taux de garantie 70 % sur 26 semaines par client, calculé depuis le Journal | Toi : réponse chiffrée à « le client tient-il ses 70 % ? », preuve en cas de litige. Client : rien d'affiché (décision du 01/10) | Pointages du Journal (oui) ; N et départ (I2) ; indicateur maintien (non) ; semaines difficiles (type `semaine_difficile`, oui) | Partiel : ajouter `maintien: true` aux pointages de séance de maintien (`synchro-coach.js:199`, 1 champ) | S côté app, M côté script ou Sheet | Renouvellement et risque contractuel : fort. Sans calcul, la garantie est une promesse que tu ne sais pas vérifier | Retenir | **Faire** (après I2) |
| I4 | Dossier de renouvellement à J-30, une ligne par client (extension de `renouvellements.mjs`) | Toi : tu prépares l'appel sans lire de ligne | CRM + Journal + Adhérence + Alertes + présence | Oui, sauf I2 et I3 | M (Business OS, aucun code dans l'app) | Renouvellement : moyen à fort ; mesurable au premier client arrivé à J-30 | Retenir | **Faire** (après I3) |
| I5 | Bilan du dimanche structuré : ajouter au `resume_hebdo` existant 5 champs de chiffres (séances prévues et faites, maintien, semaine difficile oui/non, énergie moyenne, douleur oui/non) | Toi : une ligne par client dans Adhérence au lieu d'un fichier à ouvrir. Client : rien ne change | `bilan.js` (calculs déjà faits) | Oui côté app ; colonnes à ajouter côté `coach-sync.gs` (`completerEntetes` existe) | M | Ton temps : moyen. Donnée de santé minimale (oui/non, pas de poids ni de photo) : à valider avec toi | Retenir | **Faire**, version minimale |
| I6 | Brouillon de relance généré à partir d'une alerte « nouveau » (agent Réussite client, dans le Business OS) | Toi : tu valides un texte au lieu de l'écrire | Onglet Alertes (Niveau, Statut) | Oui | S (aucun code app) | Ton temps : moyen. Rien n'est envoyé sans ton accord | Retenir | **Faire** |
| I7 | Bouton « Pointer mon créneau » sur la carte Aujourd'hui | Client : de 3 appuis à 1 | Créneau du jour, séances | Oui | S | Adhérence : faible à moyen, non mesuré | Retenir | **Faire** si le chronométrage sur téléphone confirme 3 appuis ou plus |
| I8 | Fiche de fin de bloc : charges et RPE par exercice sur 4 semaines, envoyée avec le bilan de la semaine 4 | Toi : entrée du skill `programme-4-semaines` sans demander au client | Séances du carnet (charges, séries, RPE) | Oui dans l'app, jamais exportées | M | Ton temps de reprogrammation : inconnu. Je ne l'ai pas mesuré | Retenir | **Plus tard** : quand tu auras chronométré une reprogrammation |
| I9 | Mise en route par lien : code d'invitation qui règle aussi le mode en ligne | Toi : plus de client mal classé. Client : 2 étapes de moins | Mode : à ajouter à l'invitation (D1 n'a que `libelle`) | Non | M (app + Worker) | Adhérence J0 : moyen | Retenir | **Plus tard** : à partir de 5 clients en ligne. Avant, tu règles le mode pendant la première visio |
| I10 | Demander le stockage persistant + mesurer l'occupation des photos | Client : moins de risque de perte | `occupationStockage()` | Oui | S | Fiabilité | Retenir | **Faire** |
| I11 | Rappel de sauvegarde à 7 jours pour le coaching en ligne | Client : fichier plus récent en cas de perte | Date de dernière sauvegarde | Oui | S | Fiabilité | Retenir | **Faire** avec I10 |
| I12 | Minuteur de circuit (travail / repos : 40 s / 20 s, tours) sur les séances sans matériel et la séance de maintien | Client : plus besoin de regarder le téléphone pendant un circuit | `repUnit: "sec"` des modèles `45a` à `15b` | Oui | M | Adhérence : **non démontré**. Confiance faible | Construire | **Plus tard**, version réduite aux intervalles (§7) |
| I13 | Blocs complets : EMOM, AMRAP, For time, chipper, éditeur, 240 mouvements, 91 séances | Client : rien pour un papa ni un débutant en salle | — | — | L | Aucun sur ta cible | Construire | **Écarter** |
| I14 | Import de programme par photo ou PDF | Toi : rien, tes programmes sont déjà dans des Sheets que l'app sait lire (`ImportSeancesSheets.jsx`, `import-seances.js`) | — | — | L + redéploiement du Worker | Nul | Construire | **Écarter** |
| I15 | Partage de séances et de recettes entre membres | La communauté existe déjà (classements, défis) | — | — | M | Nul sur l'adhérence | Construire | **Écarter** |
| I16 | Parcours « première séance à la salle » (présentiel) | Client débutant : repères avant la première séance | Aucune donnée sur les abandons | **Non** | M | Inconnu. Le programme débutant salle (Full body A et B) et les tutos existent déjà | Construire | **Écarter** pour l'instant ; réexaminer après 5 départs documentés avec motif (I2) |
| I17 | Copie serveur des données de santé du client | Client : restauration sans fichier | Tout | Non | L + RGPD | Fiabilité | Construire | **Écarter** : RGPD (`docs/audit-produit.md` §8) et inutile à moins de 10 clients |

---

## 7. Les hypothèses à trancher

1. **« Les circuits au poids du corps gagneraient un minuteur de bloc (EMOM, intervalles, tours). »** À moitié vrai. Les séances du Créneau Protégé sont des circuits en temps (`45a` à `15b` : « 2 tours, 40 s de travail / 20 s de récupération ») : un minuteur **d'intervalles** a un sens. EMOM, AMRAP, For time et Hyrox ne servent à aucune de tes deux cibles. Le minuteur existant (`ui/MinuteurRepos.jsx`) ne gère qu'un repos entre deux séries. Je ne trouve aucune donnée montrant qu'un minuteur améliore l'adhérence ; c'est du confort. À faire seulement en version réduite (le genre « intervalles » de `chrono-bloc.js`, 201 lignes plus un écran simplifié), après I1 à I6. Confiance : moyenne sur le périmètre, faible sur l'impact.
2. **« La séance de maintien 15 min pourrait se lancer en un geste avec minuteur. »** Aujourd'hui : déclarer la semaine difficile, choisir un motif, puis enregistrer une séance (`SemaineDifficile.jsx`, `plan-semaine.js:104`). Je n'ai pas compté les appuis sur téléphone. Le geste unique se construit avec I12 ; son effet sur le taux de maintien pointé est mesurable (nombre de pointages `maintien` par semaine difficile). Plus tard.
3. **« Un import par photo ou PDF servirait surtout moi. Mon programme est-il déjà dans un Sheet ? »** Oui : le skill `programme-4-semaines` produit le format du modèle `Programme_CoachNeiram`, et l'app importe déjà ces Sheets (par lien ou par collage). L'import IA ne sert à personne dans ton fonctionnement. **Écarter.** Aucun redéploiement du Worker n'est donc nécessaire.
4. **« Le partage entre clients (salles, recettes) est probablement hors sujet. »** Confirmé. Le public l'utilise pour la croissance ; toi, tu n'as pas besoin de clients qui se partagent des séances.
5. **« Un parcours première séance à la salle réduirait l'abandon des débutants. »** Non démontrable : aucune donnée sur les abandons n'existe (pas de colonne `Motif de départ`). Saisie d'abord (I2), code ensuite. Écarter pour l'instant.

---

## 8. Trois priorités

**1. Combler le trou de démarrage et poser les données du contrat (I2, I1, I3 en partie).**
Ordre :
1. Toi, 15 minutes par client : renseigner dans le CRM N, date de départ, mode, motif de départ s'il y en a un (I2).
2. Moi : alerte « jamais démarré » dans le Worker (I1). Tu recolles le Worker dans Cloudflare : je te le dirai, sans supposer que c'est fait.
3. Moi : champ `maintien` dans le pointage (I3, côté app).
Comment savoir si ça marche : chaque client en ligne avec un code a au moins un pointage avant J+7 (le Journal le montre) ; une alerte arrive à J+3 pour un code activé sans saisie ; tu comptes les clients « jamais démarrés » repérés grâce à elle.

**2. Rendre la garantie et le renouvellement calculables (I3, I4).**
Ordre : calcul du taux depuis le Journal, puis extension de `renouvellements.mjs`.
Comment savoir si ça marche : pour chaque client en ligne, taux cumulé et garantie obtenus en moins d'une minute ; avant le premier renouvellement, le dossier est prêt sans lire de ligne ; ton temps de préparation, chronométré, passe sous 10 minutes.

**3. Moins de lecture et d'écriture chaque semaine (I5, I6).**
Ordre : chiffres du bilan dans `resume_hebdo`, puis brouillons de relance.
Comment savoir si ça marche : minutes de suivi par client et par semaine (à relever 2 semaines avant), part des bilans reçus avant le lundi midi, nombre de relances rédigées sans réécriture.

Hors du top 3, mais petits et utiles : I7, I10, I11.

**Niveau de confiance : moyen.** Il repose sur ce que le code prouve (les trous de détection, l'absence de calcul de garantie, les données disponibles) et non sur des taux d'abandon, que je n'ai pas. Ce qui changerait mon avis :
- 0 à 2 clients en ligne : tout le code ci-dessus est prématuré, la priorité devient la vente.
- Un client en ligne qui ne rencontre aucun problème de démarrage : I1 descend.
- Un chronométrage de reprogrammation supérieur à 30 minutes par client : I8 monte.
- Un test sur téléphone montrant plus de 3 appuis pour pointer : I7 monte.

---

## 9. Partie B : ce que je reprendrais, après ta validation

| Sujet | Contenu | Réponse |
|---|---|---|
| Blocs et minuteur | `lib/blocs.js`, `lib/chrono-bloc.js`, `ui/ChronoBloc.jsx`, `ui/EditeurBloc.jsx`, `ui/CarteBloc.jsx` | **Version réduite seulement** (I12) : intervalles pour les circuits et la séance de maintien. Pas d'éditeur de blocs, pas d'EMOM, d'AMRAP, de For time. Aucun `SiPremium` dans ces fichiers (vérifié). Dépendances manquantes dans l'app coaching : `public/son.js`, `ui/sons-bloc.js` (à reprendre) |
| Catalogue de 91 séances, « Créer ma séance » | — | Écarter : aucun usage client démontré |
| Import de programme ou de recette | Fonctions Worker `programme` et `recette` | Écarter : redéploiement du proxy inutile |
| Partage entre membres | — | Écarter |

**Redéploiement du proxy :** aucune reprise retenue ne l'exige. Les idées I1 (Worker) et I9 le demanderaient : je te le dirai le moment venu.

## 10. Ce que j'attends de toi

1. Combien de clients en ligne as-tu aujourd'hui, et combien ont activé leur code ?
2. Pour chaque idée du §6 : **faire**, **plus tard** ou **écarter** (ma recommandation est dans la dernière colonne).
3. La contradiction du §0 : le taux de garantie est-il censé exister dans l'app aujourd'hui ?
4. Pour I5 : acceptes-tu qu'un indicateur « douleur oui/non » arrive dans ton Sheet ?
