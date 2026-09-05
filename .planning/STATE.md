---
gsd_state_version: '1.0'
status: in_progress
progress:
  total_phases: 9
  completed_phases: 5
  total_plans: 27
  completed_plans: 13
  percent: 48
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-01)

**Core value:** Permettre à un client de suivre sa nutrition, ses entraînements et sa
progression au quotidien, et à son coach de recevoir automatiquement les signaux de
suivi, sans jamais casser l'application en production.
**Current focus:** Phases 1, 2, 3, 4 et 6 terminées. Phase 7 préparée, en attente d'activation. Restent les phases 5 (migration écran par écran), 7 (activation), 8 (bascule) et 9 (nettoyage), à faire avec l'utilisateur.

## Current Position

Phases terminées : 1, 2, 3, 4, 6
Phase 7 : préparée, non activée
Restent : 5 (migration écrans), 7 (activation), 8 (bascule), 9 (nettoyage)
Status: Phase complete
Last activity: 2026-09-05 — Phases 3, 4, 6 et 7 (préparation) livrées en autonomie. 165 tests au total. Phase 2 livrée : 87 tests automatisés (63 sur l'application, 24 sur le proxy), sans toucher à index.html. Phase 1 déployée et vérifiée de bout en bout : proxy Cloudflare en service, script Apps Script durci et verrouillé (EXIGER_SECRET = true), `index.html` publié sur `main` (commit 4c0e18a).

Progress: [█████░░░░░] 48%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Sécurité IA + webhook | 3/3 | - | - |
| 2. Tests et infrastructure | 3/3 | - | - |
| 3. Bootstrap Vite | 2/2 | - | - |
| 4. Extraction couches | 3/3 | - | - |
| 6. Mode hors ligne | 2/2 | - | - |
| 7. CI + déploiement | 1/3 | préparée | - |

**Recent Trend:**
- Phase 1 : livrée en une session, validée par tests réels en production
- Phase 2 : livrée dans la foulée, 87 tests au total, aucune modification du code applicatif

## Phase 1 — ce qui a été livré

**Infrastructure**
- Worker Cloudflare `coach-neiram-proxy` (compte gratuit), routes `/ai` et `/coach-sync`
- Secrets côté serveur : `GEMINI_API_KEY`, `COACH_SYNC_SECRET` (type Secret),
  `COACH_SYNC_URL` (type Texte — l'adresse est publique de toute façon, et la
  garder lisible a permis de diagnostiquer une valeur corrompue)

**Application (`index.html`, publié sur `main`)**
- `PROXY_BASE_URL` renseigné ; appels IA routés via le proxy, repli sur clé
  personnelle si le proxy est injoignable
- Synchro coach en requête CORS lisible au lieu de `no-cors` : corrige une perte
  silencieuse de pointages (bug préexistant révélé par l'audit)
- Champ « Clé IA » masqué

**Script Apps Script (`coach-sync.gs`)**
- Secret partagé exigé (`EXIGER_SECRET = true`)
- Types d'événements validés, textes tronqués à 500 caractères
- Plafond d'e-mails : 3 par client et par jour, 20 au total

**Vérifications en conditions réelles**
- 24 tests automatisés sur le proxy (`worker/test-worker.mjs`)
- Photo de repas fonctionnelle dans l'app publiée
- Pointage → ligne dans l'onglet Journal
- Semaine difficile → ligne dans Alertes + e-mail reçu

## Phase 2 — ce qui a été livré

**Harnais (`tests/harness.mjs`)**
- Lit `index.html` tel qu'il est livré, injecte en mémoire une ligne exposant les
  fonctions internes, évalue le tout dans un bac à sable (React, DOM,
  localStorage, fetch doublés). Le fichier de production n'est jamais modifié.
- Les tests portent donc sur le vrai code livré, pas sur une copie qui divergerait.

**63 tests sur l'application**
- `nutrition.test.mjs` (27) : Mifflin-St Jeor, objectifs par objectif, plafond du
  facteur d'activité, calibrage calorique, reste du jour
- `stockage.test.mjs` (10) : aller-retour sur les 10 clés, JSON corrompu,
  stockage indisponible, export complet et restauration
- `synchro-coach.test.mjs` (12) : garanties de non-perte (panne réseau, refus
  serveur, secret rejeté), file plafonnée, routage par le proxy
- `ia.test.mjs` (14) : aucune clé ne sort du navigateur, traduction des erreurs
  (quota / bad-key), repli, cascade des modèles, format des photos

**Choix technique**
- Lanceur `node --test` intégré plutôt que Vitest : zéro dépendance, zéro
  `package.json`, cohérent avec un projet sans build. Les corps de tests restent
  transposables vers Vitest quand la phase 3 introduira Vite.

**Constat au passage**
- Un test a échoué sur `computeRemainingToday` (solde négatif en cas de
  dépassement). Vérification faite : comportement intentionnel, le nombre sert de
  signal interne et n'est jamais affiché. C'est le test qui a été corrigé.

## Phases 3, 4, 6 et 7 — ce qui a été livré

**Phase 3 — bootstrap Vite (`app/`)**
- Vite + React 18.3.1, même version que celle chargée par index.html via CDN
- `base: "./"` : chemins relatifs, condition pour fonctionner dans le
  sous-dossier servi par GitHub Pages
- `tests/build-vite.test.mjs` (5) : pas de chemin absolu, pas de secret dans le
  build

**Phase 4 — extraction des couches (`app/src/lib/`)**
- `dates.js`, `nutrition.js`, `stockage.js`, `config.js`, `ia.js`,
  `synchro-coach.js` — portage fidèle, index.html non modifié
- `tests/parite.test.mjs` (12) : ancienne et nouvelle implémentation confrontées
  sur ~1000 cas générés. Aucune divergence.
- `tests/stockage-compat.test.mjs` (13) : contrat de données verrouillé dans les
  deux sens. C'est le test le plus important de la migration — tout le suivi des
  clients vit dans leur localStorage, sans copie serveur.
- `tests/modules-reseau.test.mjs` (19) : garanties de la phase 1 reprises

**Phase 6 — mode hors ligne**
- `sw.js` : l'application se lance et reste utilisable sans réseau
- index.html toujours servi réseau d'abord : aucun client ne peut rester bloqué
  sur une version cassée
- Aucune requête applicative interceptée : le service worker ne peut pas
  fausser une donnée de suivi
- **Défaut corrigé en cours de route** : React chargé en no-cors donne une
  réponse opaque, non conservable. Sans précache explicite en mode cors, le mode
  hors ligne aurait été inopérant sans erreur visible.
- `tests/service-worker.test.mjs` (23) : verrouille surtout ce qui ne doit
  jamais être intercepté

**Phase 7 — préparée, non activée**
- `.github/workflows/tests.yml` actif : 165 tests à chaque envoi, sans risque
- `.github/workflows/deploy.yml.a-activer` : extension volontaire, GitHub
  l'ignore. Publie d'abord la racine du dépôt (identique à aujourd'hui), pour
  séparer le changement de mécanisme du changement de contenu.
- `DEPLOIEMENT.md` : procédure, fenêtre d'indisponibilité, retour arrière

## Notes et dette résiduelle

- ~~Clé Gemini à faire tourner~~ : fait le 2026-09-05. L'ancienne clé, passée par
  la conversation de mise en place, a été supprimée et remplacée. Tests revalidés
  après rotation.
- **Code non versionné sur GitHub** : `worker/` (proxy, script Apps Script, guide)
  et `tests/` (harnais et 63 tests) n'existent pour l'instant qu'en local et chez
  l'utilisateur. Seul `index.html` est publié. À pousser sur `main`.
- **`.planning/` sur une branche séparée** : `chore/gsd-planning-baseline` porte la
  planification, `main` porte le code. À réunir sur `main`.
- **Limite assumée** : l'adresse du proxy reste publique (page publique sans compte
  utilisateur). Les dégâts sont bornés (validation, plafonds, freinage de débit),
  mais l'accès n'est pas fermé. Une fermeture réelle supposerait des comptes
  utilisateurs — hors périmètre actuel.
- Blocage réseau connu : le proxy de l'environnement Claude Code bloque les
  opérations `git push` et les appels sortants. Les livrables passent par des
  fichiers transmis à l'utilisateur, qui publie lui-même.
