# Audit baseline — Coach Neiram (2026-09-01)

Document de référence technique produit lors de la Phase 0 (cadrage), à partir d'une
analyse en lecture seule du dépôt `coachneiram/coach-neiram-app` sur `main`, commit
`bd2255a7a1538153085b7db01e109b5888b6e9c0` (tag `v0-legacy-baseline`).

Ce document alimente le contexte GSD pour toutes les phases de la roadmap. Ne pas
modifier rétroactivement — créer un nouveau document d'audit si une ré-analyse est
nécessaire plus tard.

## Architecture

- PWA mono-fichier : `index.html` (452 Ko, 4891 lignes) contient tout le HTML/CSS/JS
- React 18.3.1 en UMD via CDN (cdnjs), pas de JSX, écrit en `React.createElement` (1296 occurrences)
- Aucun `package.json`, aucun bundler, aucun build
- 3 fichiers catalogue alimentaire (`food-basic-catalog.js`, `food-extended-catalog.js`, `food-staples-catalog.js`, ~56 Ko cumulés), chargés en `<script>` séparés, variables globales
- 10 scripts Python dans `scripts/` : patchs ponctuels par recherche/remplacement de texte dans `index.html` (pas d'outillage de build)
- Un seul commit Git ("Add files via upload", 31/08/2026) — pas d'historique incrémental
- Persistance 100% côté client (`localStorage`, ou `window.storage` en mode `IN_CLAUDE`)

## Fonctionnalités (7 tabs)

Journal, Repas, Nutrition, Sommeil, Mensurations, Entraînements, Tendances (bilans IA).

## Composants React identifiés (61 fonctions)

UI primitives : `Btn`, `Card`, `Modal`, `TextInput`, `NumberInput`, `SelectInput`, `TextArea`, `IconBtn`, `Field`, `EmptyState`, `ProgressRing`, `MiniBar`, `StatChip`, `Icon`.
Graphiques : `BarChartSVG`, `LineChartSVG`, `ChartAxes`, `RpeChartTable`.
Écrans : les 7 tabs + `Onboarding`, `SettingsModal`, `FoodFinder`, `CoachChatSection`, `WeeklyPlanCard`, `RecordsCard`, `PowerliftingPanel`, etc.
Doublon détecté : `EntrainementsTab` et `EntrainementsTabLegacy` coexistent.

## Couche stockage (`index.html:409-451`)

- `rawGet`/`rawSet` : bascule `localStorage` (navigateur) vs `window.storage` (mode `IN_CLAUDE`)
- `loadKey`/`saveKey` : wrapper JSON
- 10 clés dans `STORAGE_KEYS` : `coach_profile`, `coach_dishes`, `coach_log_entries`, `coach_body_logs`, `coach_daily_form`, `coach_routines`, `coach_sessions`, `coach_reports`, `coach_measurements`, `coach_reports_monthly` + `coach_gemini_key`, `cn_coach_outbox`, `WEEK_PLAN_KEY`
- Point de couplage unique et centralisé — bon point pour la migration progressive

## Couche IA

- Point d'entrée unique : `aiGenerate()` (ligne 1362) — bascule Anthropic (`claude-sonnet-4-6`, mode `IN_CLAUDE`) ou Gemini (fallback en cascade `gemini-3.6-flash` → `gemini-3.5-flash-lite` → `gemini-flash-latest`)
- Consommateurs : `callBilanAPI` (bilan hebdo), `callBilanMensuelAPI` (bilan mensuel), `callClaudeVision` (photo repas, code-barres), `callClaudeChat` (chat nutrition)
- **Clé API** : saisie manuelle dans `SettingsModal`, stockée en clair dans `localStorage` (`coach_gemini_key`), envoyée directement depuis le navigateur
- `DEFAULT_GEMINI_KEY` (ligne 1334) est une chaîne **vide** dans le code source — pas de clé secrète committée
- **Données envoyées aux IA** : objectif, poids/masse grasse/muscle, sommeil, énergie/stress, calories/macros, notes texte libres (séances, douleurs), **photos de progression face/profil/dos**
- Modèles : Gemini (`gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-flash-latest`), Anthropic (`claude-sonnet-4-6`, uniquement en mode `IN_CLAUDE`)

## Synchronisation coach

- `DEFAULT_COACH_SYNC_URL` (ligne 248) : URL Google Apps Script codée en dur, surchargeable par `profile.coachSyncUrl`
- `queueCoachEvent()`/`flushCoachOutbox()` : file locale (`cn_coach_outbox`, max 40 événements), `POST` en `mode: "no-cors"` (réponse jamais lisible)
- Données envoyées : prénom client, type d'événement, date, créneau, lieu, heure réelle, écart, retard, motif/message libre, RPE, durée
- **Aucune authentification, aucun chiffrement applicatif, aucune validation visible**

## Dépendances CDN

- `react@18.3.1` et `react-dom@18.3.1` (UMD, cdnjs) — seules dépendances externes JS

## Déploiement

- Pas de `.github/workflows/`, pas de `CNAME`, pas de `.nojekyll`, pas de dossier `/docs`, une seule branche `main`
- Déduction (non confirmée à 100%, pas d'accès aux réglages du dépôt depuis cette session) : GitHub Pages en mode "Deploy from a branch" depuis `main`/racine, sans build

## Risques classés (issus de l'audit complet)

**ÉLEVÉ**
- Clé API IA en clair côté client, envoyée directement depuis le navigateur — pas de contrôle de coût/abus serveur
- Données de santé sensibles envoyées à des tiers IA (Gemini/Anthropic) sans consentement documenté
- Webhook `no-cors` sans authentification vers une URL figée en dur

**MOYEN**
- Absence de service worker malgré `manifest.json` (PWA incomplète)
- Aucune sauvegarde automatique (seul l'export JSON manuel protège l'utilisateur)
- Workflow de patch par scripts Python fragile (marqueurs de texte)
- Composants dupliqués (`EntrainementsTab`/`EntrainementsTabLegacy`)

**FAIBLE**
- Accessibilité limitée (5 `aria-*` dans tout le fichier)
- Pas de mode clair
- Fichier de 452 Ko sans code-splitting

**CRITIQUE** : aucun identifié (pas d'`eval`, pas de `dangerouslySetInnerHTML`, pas de clé secrète committée en clair).

## Décision stratégique retenue

Stratégie B (migration progressive vers Vite/React) plutôt que réécriture complète —
voir `.planning/PROJECT.md` § Key Decisions pour le raisonnement complet.
