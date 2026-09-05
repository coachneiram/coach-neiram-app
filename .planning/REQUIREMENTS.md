# Requirements: Coach Neiram — Migration progressive Vite/React

**Defined:** 2026-09-01
**Core Value:** Permettre à un client de suivre sa nutrition, ses entraînements et sa
progression au quotidien, et à son coach de recevoir automatiquement les signaux de
suivi, sans jamais casser l'application en production.

## v1 Requirements

Requirements pour la migration progressive. Chaque item correspond à une phase de la roadmap.

### Sécurité (SEC)

- [ ] **SEC-01**: La clé API IA n'est plus stockée en clair côté client sans protection
- [ ] **SEC-02**: Les appels aux API IA (Gemini/Anthropic) transitent par un backend proxy, pas directement depuis le navigateur avec une clé exposée
- [ ] **SEC-03**: Le webhook coach dispose d'une forme d'authentification/validation
- [ ] **SEC-04**: Les données de santé sensibles (photos, poids, douleurs) envoyées aux IA sont documentées et minimisées

### Tests et infrastructure (TEST)

- [x] **TEST-01**: Tests unitaires sur le calcul des objectifs nutritionnels/macros
- [x] **TEST-02**: Tests unitaires sur le calibrage calorique adaptatif
- [x] **TEST-03**: Tests sur la couche de stockage (round-trip `saveKey`/`loadKey`)
- [x] **TEST-04**: Tests sur l'export/import JSON (non-perte de données)
- [x] **TEST-05**: Tests avec mocks sur les appels IA (pas de dépendance réseau réelle dans les tests)
- [x] **TEST-06**: Tests sur la file d'attente de synchronisation coach (`queueCoachEvent`/`flushCoachOutbox`)

### Migration technique (MIG)

- [ ] **MIG-01**: Bootstrap Vite en parallèle de l'app existante, sans impact sur `index.html`
- [ ] **MIG-02**: Extraction des design tokens et composants UI primitifs vers des modules ES
- [ ] **MIG-03**: Extraction de la couche stockage (`rawGet`/`rawSet`/`loadKey`/`saveKey`) en module testé
- [ ] **MIG-04**: Extraction de la couche IA (`aiGenerate`, `callGeminiRaw`, `callClaudeVision`, `callClaudeChat`) avec bascule vers le backend proxy
- [ ] **MIG-05**: Migration de chaque écran (tab) un par un, avec l'app legacy toujours fonctionnelle en parallèle
- [ ] **MIG-06**: Service worker fonctionnel (usage offline réel de la PWA)
- [ ] **MIG-07**: GitHub Action de build Vite déployant vers GitHub Pages, sans changer le geste "push sur `main` = site à jour"
- [ ] **MIG-08**: Bascule finale de `index.html` legacy vers la nouvelle app Vite

### Nettoyage (CLEAN)

- [ ] **CLEAN-01**: Suppression des scripts Python de patch devenus obsolètes après migration
- [ ] **CLEAN-02**: Suppression/clarification des composants dupliqués (`EntrainementsTab`/`EntrainementsTabLegacy`)

## v2 Requirements

Différé après la migration — hors périmètre de la roadmap actuelle.

### Nouvelles fonctionnalités

- **FEAT-01**: Nouvelles fonctionnalités demandées par le coach (à définir après stabilisation)
- **FEAT-02**: Amélioration de l'accessibilité (aria, navigation clavier)
- **FEAT-03**: Mode clair

## Out of Scope

| Feature | Reason |
|---------|--------|
| Réécriture complète de l'application | Risque de régression trop élevé sur un outil en production — stratégie de migration progressive retenue |
| Changement d'hébergeur (hors GitHub Pages) | Décision explicite de l'utilisateur de rester sur GitHub Pages |
| Backend base de données complet (remplacement de `localStorage`) | Hors périmètre de cette migration — le stockage reste client tant que ce n'est pas explicitement demandé |

## Traceability

Which phases cover which requirements. Mis à jour lors de la création de la roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01, SEC-02, SEC-03, SEC-04 | Phase 1 | Pending |
| TEST-01 à TEST-06 | Phase 2 | Fait |
| MIG-01 | Phase 3 | Pending |
| MIG-02, MIG-03, MIG-04 | Phase 4 | Pending |
| MIG-05 | Phase 5 | Pending |
| MIG-06 | Phase 6 | Pending |
| MIG-07 | Phase 7 | Pending |
| MIG-08 | Phase 8 | Pending |
| CLEAN-01, CLEAN-02 | Phase 9 | Pending |
