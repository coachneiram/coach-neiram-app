#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Attendre que la publication AUTOMATIQUE de GitHub Pages soit terminee.
# ─────────────────────────────────────────────────────────────────────
#
# Tant que le reglage « Settings → Pages → Source » reste sur « Deploy from
# a branch », chaque push sur main declenche DEUX publications :
#   - la notre (workflow Deploiement), qui publie la nouvelle application ;
#   - celle de GitHub (« pages build and deployment »), qui publie la
#     racine du depot, c'est-a-dire l'ANCIENNE application.
# La derniere qui finit gagne. Le 29 septembre 2026, l'ancienne a fini deux
# secondes apres la notre : les clients recevaient l'ancienne version (sans
# le bouton « Photographier » sur Android, sans les recettes, etc.).
#
# Ce script fait en sorte que la notre passe TOUJOURS en dernier : il attend
# que toutes les publications automatiques du meme commit soient terminees.
# Si aucune n'apparait (reglage passe sur « GitHub Actions », ou lancement
# manuel du workflow), il n'attend pas davantage.
#
# Variables : DEPOT (owner/nom), SHA, et pour les tests PAUSE, DELAI_APPARITION,
# DELAI_MAX (secondes). Necessite gh (present sur les runners GitHub).

set -euo pipefail

PAUSE="${PAUSE:-10}"
DELAI_APPARITION="${DELAI_APPARITION:-60}"
DELAI_MAX="${DELAI_MAX:-900}"
NOM="pages build and deployment"

debut=$(date +%s)
while :; do
  ecoule=$(( $(date +%s) - debut ))
  etat=$(gh api "repos/${DEPOT}/actions/runs?head_sha=${SHA}&per_page=100" \
    --jq "[.workflow_runs[] | select(.name == \"${NOM}\")] | \"\(length) \(map(select(.status != \"completed\")) | length)\"")
  total=${etat% *}
  en_cours=${etat#* }

  if [ "$total" -gt 0 ] && [ "$en_cours" -eq 0 ]; then
    echo "Publication automatique de GitHub terminee (${total}) : la notre passe en dernier."
    exit 0
  fi
  if [ "$total" -eq 0 ] && [ "$ecoule" -ge "$DELAI_APPARITION" ]; then
    echo "Aucune publication automatique de GitHub pour ce commit : rien a attendre."
    exit 0
  fi
  if [ "$ecoule" -ge "$DELAI_MAX" ]; then
    echo "::warning::Publication automatique de GitHub encore en cours apres ${DELAI_MAX} s. On publie quand meme ; la verification qui suit dira si la bonne version est en ligne."
    exit 0
  fi
  echo "Publication automatique de GitHub : ${total} trouvee(s), ${en_cours} en cours. Nouvel essai dans ${PAUSE} s."
  sleep "$PAUSE"
done
