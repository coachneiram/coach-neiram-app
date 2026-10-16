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

Ouverte le 2026-10-16 par la mission « Audit et évolution de Coach Neiram ».
Source et justification : `docs/audit-produit.md` (§3 risques, §7 feuille de route).

### Fiabilité (REL) — P0

- [ ] **REL-01**: Le Coach IA reçoit une consigne système (régime, allergies, garde-fou médical) ; test que `Repas` la transmet (P0-1)
- [ ] **REL-02**: Le bilan hebdomadaire lit les bons champs de `bilanPlanSemaine` et `resumeCreneaux`, testés avec de vrais objets (P0-2)
- [ ] **REL-03**: Une erreur de rendu affiche un écran de secours avec export des données
- [ ] **REL-04**: `navigator.storage.persist()` demandé ; photos du bilan HTML échappées ; dépendances de `weekStats` complètes
- [ ] **REL-05**: Le proxy `/ai` a un plafond quotidien, une validation des prompts et un freinage de débit (P0-3, à recoller par Marien)
- [ ] **REL-06**: `/coach-sync` n'accepte plus d'événement usurpé : nouveau déploiement Apps Script et `EXIGER_SECRET` (P0-4, action Marien)

### Données personnelles (RGPD) — P0

- [ ] **RGPD-01**: Aucune photo ni donnée de santé n'est envoyée à l'IA sans consentement explicite et révocable
- [ ] **RGPD-02**: Le client peut supprimer toutes ses données (`coach_*`, `cn_*`) et se désabonner du push depuis l'application

### Centralisation (CENT) — P1, après décision D2

- [ ] **CENT-01**: Socle serveur retenu (recommandation : Cloudflare D1 + R2 + Access), codes d'invitation, sauvegarde quotidienne, tests de permissions
- [ ] **CENT-02**: Double écriture sans suppression locale, retour arrière documenté et testé
- [ ] **CENT-03**: Bilan hebdo court (5 questions au plus, pré-rempli), synthèse IA séparant faits, déclarations et hypothèses
- [ ] **CENT-04**: Espace coach « Dossiers à traiter » (attention requise / suivi ordinaire / progrès à valoriser), fiche client, notes privées
- [ ] **CENT-05**: Toute proposition IA est acceptée, modifiée ou refusée par le coach ; aucun envoi ni modification de programme sans son clic

### Personnalisation et parcours (PERSO) — P2

- [ ] **PERSO-01**: Profil enrichi déclaratif (niveau, matériel, exclusions, contraintes, temps disponible)
- [ ] **PERSO-02**: Variantes d'exercices par matériel et niveau, versions 15 et 30 minutes des séances types
- [ ] **PERSO-03**: Rapport mensuel partageable avec comparaison au mois précédent (photos selon D1)
- [ ] **PERSO-04**: Parcours « Reprise » sur plusieurs mois (bilans J30, J60, J90)

### Différenciation (DIFF) — P3

- [ ] **DIFF-01**: Assistant IA du coach : résumés et brouillons, jamais envoyés sans validation
- [ ] **DIFF-02**: Dépôt de vidéos techniques avec retour du coach (pas d'analyse IA)
- [ ] **DIFF-03**: Accessibilité AA et découpage du bundle

### Reportées de la v1

- **FEAT-02**: Amélioration de l'accessibilité (aria, navigation clavier) — fenêtre modale reprise dans P0-A, le reste dans DIFF-03
- **FEAT-03**: Mode clair

## Out of Scope

| Feature | Reason |
|---------|--------|
| Réécriture complète de l'application | Risque de régression trop élevé sur un outil en production — stratégie de migration progressive retenue |
| Changement d'hébergeur (hors GitHub Pages) | Décision explicite de l'utilisateur de rester sur GitHub Pages |
| Backend base de données complet (remplacement de `localStorage`) | Hors périmètre de la v1. **Réexaminé le 2026-10-16** : la mission demande la centralisation ; options comparées dans `docs/audit-produit.md` §6, décision D2 de Marien en attente. `localStorage` reste la source tant que la migration n'est pas vérifiée |

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
| REL-01 à REL-04, RGPD-01, RGPD-02 | Phase 10 | À faire |
| REL-05, REL-06 | Phase 10 (Worker et Apps Script, gestes de Marien) | À faire |
| CENT-01 à CENT-05 | Phase 11 | Attend D2 |
| PERSO-01 à PERSO-04 | Phase 12 | À faire |
| DIFF-01 à DIFF-03 | Phase 13 | À faire |
