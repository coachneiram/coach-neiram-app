---
gsd_state_version: '1.0'
status: planning
progress:
  total_phases: 9
  completed_phases: 0
  total_plans: 27
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-01)

**Core value:** Permettre à un client de suivre sa nutrition, ses entraînements et sa
progression au quotidien, et à son coach de recevoir automatiquement les signaux de
suivi, sans jamais casser l'application en production.
**Current focus:** Phase 0 terminée (baseline + planification). En attente d'autorisation pour démarrer la Phase 1.

## Current Position

Phase: 0 of 9 (Baseline et planification — terminée)
Plan: - (Phase 0 hors roadmap numérotée, travail de cadrage uniquement)
Status: Ready to plan (Phase 1 prête à être planifiée sur autorisation utilisateur)
Last activity: 2026-09-01 — Audit complet du dépôt `coachneiram/coach-neiram-app`, tag `v0-legacy-baseline` créé localement sur `bd2255a`, branche `chore/gsd-planning-baseline` créée, fichiers `.planning/` générés.

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -

## Notes

- Le dépôt de production réel est `coachneiram/coach-neiram-app` (pas `Application-coach-neiram`, qui est un dépôt vide sans rapport).
- Déploiement actuel : très probablement GitHub Pages en mode "Deploy from a branch" depuis `main` (racine), sans GitHub Action — à confirmer avec certitude via les réglages du dépôt (non consultables depuis cette session en lecture/écriture git seule).
- Blocage réseau connu : le proxy de cet environnement Claude Code bloque actuellement les opérations `git push` (HTTP 403) vers `github.com` pour cette session — le tag et la branche de planification restent locaux tant que ce blocage n'est pas levé. Voir section "Commandes à exécuter depuis votre poste" communiquée à l'utilisateur en fin de Phase 0.
- Aucune modification de `index.html`, des catalogues alimentaires, des scripts Python, des clés API ou du webhook n'a été effectuée pendant cette phase de planification.
