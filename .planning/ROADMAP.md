# Roadmap: Coach Neiram — Migration progressive vers Vite/React

## Overview

Coach Neiram est aujourd'hui une PWA monolithique (`index.html` de 452 Ko, React en
UMD sans build) déployée en production via GitHub Pages, avec zéro test et une clé API
IA exposée côté client. L'objectif de cette roadmap est de faire évoluer l'application
vers une architecture Vite/React moderne et testée, **sans jamais interrompre le
service** et **sans réécriture complète** — chaque phase ajoute quelque chose à côté de
l'existant, testable isolément, avec un rollback trivial (tag Git). Les deux premières
phases (sécurité, tests) sont volontairement placées avant tout changement d'outillage,
car elles réduisent le risque et donnent un filet de sécurité pour tout ce qui suit.

## Phases

- [x] **Phase 1: Sécurité IA + webhook** - Sécuriser la clé API IA et le webhook coach avant toute autre évolution
- [x] **Phase 2: Tests et infrastructure de développement** - Filet de sécurité (tests) sur les fonctionnalités critiques avant de toucher à l'architecture
- [x] **Phase 3: Bootstrap Vite en parallèle** - Nouvel outillage à côté de l'existant, zéro impact sur la prod
- [x] **Phase 4: Extraction progressive des couches communes** - Stockage, IA, design tokens extraits en modules testés
- [ ] **Phase 5: Migration écran par écran** - Chaque tab migré individuellement, legacy toujours disponible en secours
- [x] **Phase 6: PWA complète** - Service worker et usage offline réel
- [ ] **Phase 7: GitHub Actions + migration GitHub Pages vers le build Vite** - Build automatisé, même geste de déploiement pour l'utilisateur
- [ ] **Phase 8: Bascule définitive** - `index.html` legacy remplacé par l'app Vite en production
- [ ] **Phase 9: Nettoyage et nouvelles fonctionnalités** - Suppression du code legacy, reprise du développement fonctionnel

## Phase Details

### Phase 1: Sécurité IA + webhook
**Goal**: Réduire l'exposition de la clé API IA et sécuriser le webhook coach, sans changer l'architecture ni l'outillage.
**Depends on**: Nothing (première phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04
**Fichiers concernés**: `index.html` (fonctions `aiGenerate`, `callGeminiRaw`, `callClaudeVision`, `callClaudeChat`, `coachSyncUrl`, `queueCoachEvent`, `flushCoachOutbox`) ; nouveau backend proxy (hors dépôt ou dans un dossier séparé, ex. Cloudflare Worker)
**Dépendances**: Aucune — peut démarrer immédiatement après la Phase 0
**Risques**:
- Élevé si le proxy backend introduit une latence ou un point de panne unique sur les fonctions IA
- Rupture silencieuse si le format d'appel change sans adapter tous les points d'appel (4 fonctions consommatrices)
**Tests nécessaires**: Test manuel de chaque fonctionnalité IA (bilan hebdo, bilan mensuel, photo repas, scan code-barres, chat nutrition) avant/après bascule vers le proxy ; test du webhook avec et sans authentification
**Critères de validation**:
  1. Aucune clé API n'est plus visible en clair dans le code source ou le trafic réseau sortant du navigateur
  2. Toutes les fonctionnalités IA existantes produisent un résultat identique à avant
  3. Le webhook coach rejette les requêtes non authentifiées (si l'authentification est ajoutée côté script)
**Plans**: TBD

Plans:
- [ ] 01-01: Mise en place du backend proxy (fonction serverless) pour les appels Gemini/Anthropic
- [ ] 01-02: Bascule des 4 fonctions consommatrices IA vers le proxy
- [ ] 01-03: Sécurisation du webhook coach (authentification/validation)

**Stratégie de rollback**: Chaque sous-étape committée séparément ; retour à `v0-legacy-baseline` possible à tout moment tant que Phase 1 n'est pas mergée sur `main` en production.

---

### Phase 2: Tests et infrastructure de développement
**Goal**: Mettre en place un filet de tests sur les fonctionnalités critiques avant de toucher à l'architecture.
**Depends on**: Phase 1 (teste aussi les changements de sécurité)
**Requirements**: TEST-01 à TEST-06
**Fichiers concernés**: Nouveau dossier de tests (ex. `tests/`), aucune modification de `index.html`
**Dépendances**: Phase 1 recommandée mais pas strictement bloquante — peut être menée en parallèle
**Risques**:
- Faible — les tests n'affectent pas le code de production
- Risque indirect : des tests mal calibrés (faux positifs/négatifs) donneraient une fausse confiance pour la suite
**Tests nécessaires**: (c'est l'objet de la phase) — Vitest + mocks manuels sur `fetch` (IA, Open Food Facts, webhook)
**Critères de validation**:
  1. Chaque fonction métier critique de l'audit (macros, calibrage, adhérence) a un test unitaire qui passe
  2. Le round-trip stockage (`saveKey`/`loadKey`) est testé pour chaque clé de `STORAGE_KEYS`
  3. L'export/import JSON est testé pour non-perte de données
**Plans**: TBD

Plans:
- [ ] 02-01: Setup Vitest et structure de test, sans dépendance à Vite (peut tourner sur le code legacy directement)
- [ ] 02-02: Tests nutrition/macros/calibrage
- [ ] 02-03: Tests stockage, import/export, synchronisation coach

**Stratégie de rollback**: Suppression du dossier de tests si l'approche ne convient pas — aucun impact sur l'app.

---

### Phase 3: Bootstrap Vite en parallèle
**Goal**: Poser les fondations Vite/React à côté de l'application existante, sans aucun impact sur la production.
**Depends on**: Phase 2 (les tests doivent pouvoir être portés vers le nouvel outillage)
**Requirements**: MIG-01
**Fichiers concernés**: Nouveau dossier (ex. `app/`), aucune modification de `index.html`, `manifest.json`, ou des catalogues
**Dépendances**: Phase 2
**Risques**: Nul à faible — nouveau dossier isolé, rien n'est branché à l'existant
**Tests nécessaires**: Le build Vite compile et affiche une page de test
**Critères de validation**:
  1. `npm run build` (Vite) produit un `dist/` valide
  2. Aucun fichier existant n'est modifié
  3. L'app legacy (`index.html`) continue de fonctionner à l'identique
**Plans**: TBD

Plans:
- [ ] 03-01: Scaffold Vite + React dans un nouveau dossier
- [ ] 03-02: Configuration du build, vérification qu'il compile

**Stratégie de rollback**: Suppression du dossier `app/` — aucun impact sur l'existant.

---

### Phase 4: Extraction progressive des couches communes
**Goal**: Extraire les couches transverses (design tokens/UI, stockage, IA) en modules testés, réutilisables par les deux architectures (legacy et Vite) pendant la transition.
**Depends on**: Phase 3
**Requirements**: MIG-02, MIG-03, MIG-04
**Fichiers concernés**: Nouveaux modules (`storage.js`, `ai.js`, tokens/composants UI) ; lecture seule de `index.html` comme référence, pas de modification
**Dépendances**: Phase 3 (besoin de l'outillage Vite pour ces modules) et Phase 1 (la couche IA extraite doit déjà pointer vers le proxy sécurisé)
**Risques**:
- Moyen à élevé sur l'extraction de la couche stockage — dépendance transverse à toutes les fonctionnalités
- Élevé sur la couche IA si le comportement de fallback (Gemini → 3 modèles) n'est pas reproduit fidèlement
**Tests nécessaires**: Tests unitaires exhaustifs sur chaque module extrait, comparés au comportement de l'original
**Critères de validation**:
  1. Le module stockage extrait passe tous les tests de la Phase 2
  2. Le module IA extrait reproduit le comportement de fallback et de gestion d'erreur (`missing-key`, `quota`, `bad-key`)
  3. Les composants UI extraits sont visuellement identiques (comparaison manuelle ou Storybook)
**Plans**: TBD

Plans:
- [ ] 04-01: Extraction design tokens + composants UI primitifs
- [ ] 04-02: Extraction et test de la couche stockage
- [ ] 04-03: Extraction et test de la couche IA (déjà sécurisée en Phase 1)

**Stratégie de rollback**: Modules non branchés à l'app legacy tant que non validés — suppression sans impact si un module ne convient pas.

---

### Phase 5: Migration écran par écran
**Goal**: Migrer chaque tab (Sommeil, Mensurations, Repas, Nutrition, Journal, Entraînements, Tendances) individuellement vers Vite/React, dans l'ordre du plus simple au plus critique.
**Depends on**: Phase 4
**Requirements**: MIG-05
**Fichiers concernés**: Un tab à la fois — nouveaux composants Vite, `index.html` legacy non modifié tant que la bascule finale (Phase 8) n'a pas lieu
**Dépendances**: Phase 4 (les couches communes doivent être prêtes)
**Risques**:
- Moyen par tab isolé (Sommeil, Mensurations en premier)
- Élevé sur Journal et Tendances (forte dépendance IA et données quotidiennes) — à migrer en dernier
**Tests nécessaires**: Test manuel du tab migré + non-régression sur les tabs encore servis par l'app legacy ; pour Journal/Tendances, double-run (ancien/nouveau en parallèle, comparaison des résultats) avant bascule
**Critères de validation**:
  1. Chaque tab migré reproduit à l'identique le comportement observé dans l'audit fonctionnel
  2. Les tabs non encore migrés restent inchangés et fonctionnels dans `index.html`
  3. Aucune perte de données lors du passage d'un tab à l'autre
**Plans**: TBD

Plans:
- [ ] 05-01: Migration Sommeil + Mensurations (tabs les plus isolés)
- [ ] 05-02: Migration Repas + Nutrition
- [ ] 05-03: Migration Entraînements
- [ ] 05-04: Migration Journal (avec feature flag de bascule)
- [ ] 05-05: Migration Tendances (bilans IA, photos)

**Stratégie de rollback**: Feature flag par tab — retour au tab legacy en un changement de configuration si le tab migré échoue.

---

### Phase 6: PWA complète
**Goal**: Ajouter un service worker fonctionnel pour tenir la promesse PWA (usage offline réel), actuellement absente malgré `manifest.json`.
**Depends on**: Phase 5 (le service worker doit couvrir la nouvelle architecture, pas l'ancienne)
**Requirements**: MIG-06
**Fichiers concernés**: Nouveau service worker (généré par plugin Vite PWA ou écrit à la main), `manifest.json` (vérification de cohérence, pas de modification fonctionnelle)
**Dépendances**: Phase 5 largement avancée (le service worker doit cacher la bonne version des assets)
**Risques**: Moyen — un service worker mal configuré peut servir une version obsolète en cache et bloquer les mises à jour
**Tests nécessaires**: Test manuel du mode avion (chargement offline), test de mise à jour du cache après déploiement
**Critères de validation**:
  1. L'app se charge et reste utilisable hors ligne pour les données déjà synchronisées
  2. Une nouvelle version déployée est bien détectée et proposée à l'utilisateur (pas de cache figé indéfiniment)
**Plans**: TBD

Plans:
- [ ] 06-01: Mise en place du service worker (stratégie de cache)
- [ ] 06-02: Test et validation du comportement offline/mise à jour

**Stratégie de rollback**: Désactivation du service worker (retour à zéro cache) sans impact sur le reste de l'app.

---

### Phase 7: GitHub Actions + migration GitHub Pages vers le build Vite
**Goal**: Automatiser le build Vite via une GitHub Action à chaque push sur `main`, en conservant exactement le même geste utilisateur ("je pousse, le site se met à jour").
**Depends on**: Phase 6 (l'app Vite doit être fonctionnellement complète avant d'automatiser son déploiement)
**Requirements**: MIG-07
**Fichiers concernés**: Nouveau `.github/workflows/deploy.yml` ; changement de réglage GitHub (Settings → Pages : "Deploy from a branch" → "GitHub Actions")
**Dépendances**: Phase 6
**Risques**:
- Élevé sur le changement de réglage GitHub Pages — à ne faire qu'une fois l'Action testée et validée
- Risque de downtime si le premier déploiement via Action échoue après le changement de réglage
**Tests nécessaires**: Test de l'Action sur une branche/PR avant de changer le réglage de production ; vérification que le build `dist/` contient bien tous les assets (icônes, manifest, catalogues)
**Critères de validation**:
  1. L'Action build et déploie correctement sur un environnement de test (ex. Pages de preview ou branche de test)
  2. Le changement de réglage GitHub Pages est effectué seulement après validation complète de l'Action
  3. L'URL de production reste identique
**Plans**: TBD

Plans:
- [ ] 07-01: Écriture et test de la GitHub Action de build (sans changer le réglage Pages)
- [ ] 07-02: Validation du build produit (assets, manifest, icônes)
- [ ] 07-03: Changement du réglage GitHub Pages vers "GitHub Actions"

**Stratégie de rollback**: Réglage GitHub Pages remis sur "Deploy from a branch" si l'Action échoue ; l'ancien `index.html` reste servable tant qu'il n'est pas supprimé (Phase 8/9).

---

### Phase 8: Bascule définitive
**Goal**: Remplacer `index.html` legacy par l'application Vite comme point d'entrée de production.
**Depends on**: Phase 7
**Requirements**: MIG-08
**Fichiers concernés**: `index.html` (remplacement), archivage de l'ancien fichier
**Dépendances**: Phase 7 validée en production
**Risques**: Élevé (bascule globale, tous les utilisateurs basculent en même temps)
**Tests nécessaires**: Suite de tests complète (Phase 2 + tests ajoutés en Phase 4/5) + validation manuelle de chaque tab en conditions réelles
**Critères de validation**:
  1. Toutes les fonctionnalités listées dans l'audit fonctionnel (Phase 0) sont présentes et fonctionnelles dans la nouvelle app
  2. Aucune perte de données pour les utilisateurs existants (localStorage préservé)
  3. Un tag Git pré-bascule (`v-pre-bascule-vite`) existe et permet une restauration immédiate
**Plans**: TBD

Plans:
- [ ] 08-01: Tag de sécurité pré-bascule
- [ ] 08-02: Remplacement du point d'entrée de production
- [ ] 08-03: Surveillance post-bascule et validation en conditions réelles

**Stratégie de rollback**: Restauration immédiate via le tag pré-bascule + retour du réglage GitHub Pages si nécessaire.

---

### Phase 9: Nettoyage et nouvelles fonctionnalités
**Goal**: Supprimer le code devenu obsolète et rouvrir la voie aux nouvelles fonctionnalités sur une base saine.
**Depends on**: Phase 8
**Requirements**: CLEAN-01, CLEAN-02
**Fichiers concernés**: `scripts/*.py` (scripts de patch obsolètes), composants dupliqués (`EntrainementsTabLegacy`), ancien `index.html` (archivé, pas supprimé du repo pour l'historique)
**Dépendances**: Phase 8 stable depuis un délai raisonnable (pas de régression détectée)
**Risques**: Faible — nettoyage de code déjà remplacé et validé
**Tests nécessaires**: Vérification que rien ne référence encore le code supprimé
**Critères de validation**:
  1. Plus aucun script Python de patch dans le dépôt actif
  2. Plus de composants dupliqués
  3. La roadmap v2 (nouvelles fonctionnalités) peut démarrer sur une base propre et testée
**Plans**: TBD

Plans:
- [ ] 09-01: Suppression des scripts Python obsolètes
- [ ] 09-02: Nettoyage des composants dupliqués
- [ ] 09-03: Ouverture du backlog v2 (nouvelles fonctionnalités)

**Stratégie de rollback**: Historique Git conservé — tout fichier supprimé reste récupérable via l'historique ou les tags.

## Progress

**Execution Order:**
Phases 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Sécurité IA + webhook | 3/3 | Terminée | 2026-09-05 |
| 2. Tests et infrastructure | 3/3 | Terminée | 2026-09-05 |
| 3. Bootstrap Vite en parallèle | 2/2 | Terminée | 2026-09-05 |
| 4. Extraction couches communes | 3/3 | Terminée | 2026-09-05 |
| 5. Migration écran par écran | 0/5 | Not started | - |
| 6. PWA complète | 2/2 | Terminée | 2026-09-05 |
| 7. GitHub Actions + Pages | 1/3 | Préparée, en attente d'activation | - |
| 8. Bascule définitive | 0/3 | Not started | - |
| 9. Nettoyage + nouvelles features | 0/3 | Not started | - |
