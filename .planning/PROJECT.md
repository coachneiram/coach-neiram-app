# Coach Neiram

## What This Is

Coach Neiram est une application web (PWA) de suivi sportif et nutritionnel pour un
coaching sportif en ligne : journal alimentaire, entraînements, mensurations, sommeil,
bilans hebdo/mensuels générés par IA, et synchronisation d'événements de suivi vers le
coach. Utilisée en production par le coach et ses clients, déployée via GitHub Pages
depuis le dépôt `coachneiram/coach-neiram-app`.

## Core Value

Permettre à un client de suivre sa nutrition, ses entraînements et sa progression au
quotidien, et à son coach de recevoir automatiquement les signaux de suivi (présence,
adhérence, difficultés) sans action manuelle du client.

## Business Context

- **Customer**: Le coach (propriétaire de l'app) et ses clients de coaching sportif
- **Revenue model**: Coaching sportif en ligne (l'app est un outil de suivi, pas un produit vendu séparément)
- **Success metric**: Adhérence des clients à leur suivi (créneaux tenus, données loguées) et fiabilité de l'app en production
- **Strategy notes**: —

## Requirements

### Validated

- ✓ Journal nutrition/entraînement/mensurations/sommeil quotidien — en production
- ✓ Génération de bilans hebdo/mensuels par IA (Gemini/Anthropic) — en production
- ✓ Synchronisation d'événements vers le coach (webhook Google Apps Script) — en production
- ✓ Export/import JSON des données — en production
- ✓ Recherche d'aliments (catalogue local + Open Food Facts, photo, code-barres) — en production

### Active

- [ ] Sécuriser la gestion de la clé API IA (actuellement en clair côté client)
- [ ] Sécuriser/authentifier le webhook coach
- [ ] Mettre en place une infrastructure de tests (actuellement aucun test)
- [ ] Migrer progressivement vers une architecture Vite/React modulaire, sans réécriture complète
- [ ] Compléter la PWA (service worker manquant malgré `manifest.json`)

### Out of Scope

- Réécriture complète de l'application — risque de régression trop élevé sur un outil en production ; stratégie de migration progressive retenue à la place
- Changement de mode de déploiement (rester sur GitHub Pages) — décision explicite de l'utilisateur, pas de migration vers un autre hébergeur pour l'instant

## Context

- **Historique Git** : un seul commit ("Add files via upload", 31/08/2026) sur `main` — aucun historique de développement incrémental exploitable avant cette date
- **Architecture actuelle** : un unique `index.html` (452 Ko, 4891 lignes), React 18.3.1 en UMD via CDN, sans build ni JSX — tout le code applicatif dans un seul fichier
- **Outillage d'évolution actuel** : scripts Python ponctuels dans `scripts/` qui patchent `index.html` par recherche/remplacement de texte — fragile, aucun garde-fou automatisé
- **Déploiement** : GitHub Pages, très probablement en mode "Deploy from branch" depuis `main` (racine), aucune GitHub Action présente
- **Stockage** : 100% côté client (`localStorage`, ou `window.storage` en mode `IN_CLAUDE`) — aucun backend, aucune base de données serveur
- **Audit de sécurité déjà réalisé** (voir `.planning/codebase/`) : clé API IA stockée en clair et exposée côté client (risque ÉLEVÉ), données de santé sensibles (photos, poids, douleurs) envoyées à des tiers IA (risque ÉLEVÉ), webhook coach sans authentification (risque ÉLEVÉ)

## Constraints

- **Déploiement**: Doit rester compatible avec GitHub Pages (via `main`, sans changer l'expérience "je pousse sur GitHub, le site se met à jour") — toute migration Vite devra ajouter une étape de build (GitHub Action) sans changer ce geste utilisateur
- **Continuité fonctionnelle**: L'application est en usage réel (coach + clients) — aucune régression fonctionnelle tolérée pendant la migration
- **Pas de réécriture complète**: Stratégie de migration progressive uniquement (stranger fig pattern), décision explicite de l'utilisateur
- **Sécurité des données de santé**: Les données envoyées aux API IA (photos, poids, douleurs, notes) sont sensibles — toute évolution doit réduire, pas augmenter, l'exposition de ces données

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Migration progressive (stratégie B) plutôt que réécriture complète | Le code est déjà bien découpé fonctionnellement (composants nommés, couche stockage centralisée en 2 fonctions, couche IA centralisée en 1 fonction) — permet une extraction progressive à faible risque | — Pending |
| Tag `v0-legacy-baseline` créé sur `bd2255a` avant toute modification | Point de restauration garanti de l'état de production actuel | ✓ Bon |
| GSD initialisé sur une branche dédiée (`chore/gsd-planning-baseline`), pas sur `main` | Isoler la planification du code de production, aucune modification de `main` pendant la Phase 0 | ✓ Bon |

---
*Last updated: 2026-09-01 après Phase 0 (baseline et planification)*
