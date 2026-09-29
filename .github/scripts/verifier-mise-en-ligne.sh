#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Verifier que c'est bien la NOUVELLE application qui est servie.
# ─────────────────────────────────────────────────────────────────────
#
# Un deploiement « vert » ne prouvait rien : la publication automatique de
# GitHub pouvait remettre l'ancienne application juste apres (voir
# attendre-pages-github.sh). Personne ne s'en est apercu pendant des
# semaines. Ce script interroge le site reel :
#   - assets-manifest.json n'existe QUE dans la nouvelle application ;
#   - la page d'accueil doit charger un fichier assets/index-XXXX.js.
# Tant que ce n'est pas le cas, il reessaie (le CDN de GitHub Pages met
# parfois une minute a se mettre a jour), puis echoue en disant pourquoi.
#
# Variables : URL (adresse du site, avec ou sans « / » final), et pour les
# tests ESSAIS, PAUSE, CURL.

set -uo pipefail

ESSAIS="${ESSAIS:-30}"
PAUSE="${PAUSE:-10}"
CURL="${CURL:-curl}"
base="${URL%/}"
# Parametre unique a chaque essai : le CDN ne peut pas repondre depuis son
# cache une version anterieure du fichier.
jeton="${GITHUB_SHA:-local}-${GITHUB_RUN_ATTEMPT:-0}"

for i in $(seq 1 "$ESSAIS"); do
  code=$("$CURL" -s -o /dev/null -w '%{http_code}' "${base}/assets-manifest.json?verif=${jeton}-${i}")
  page=$("$CURL" -s "${base}/?verif=${jeton}-${i}")
  if [ "$code" = "200" ] && printf '%s' "$page" | grep -q 'assets/index-'; then
    echo "Nouvelle application en ligne a ${base} (essai ${i})."
    exit 0
  fi
  echo "Essai ${i}/${ESSAIS} : manifeste HTTP ${code}, page $(printf '%s' "$page" | grep -q 'assets/index-' && echo 'nouvelle' || echo 'ANCIENNE ou vide'). Nouvel essai dans ${PAUSE} s."
  sleep "$PAUSE"
done

echo "::error::Le site ${base} sert toujours l'ANCIENNE application. Cause la plus probable : Settings → Pages → Source est reste sur « Deploy from a branch ». Le passer sur « GitHub Actions » (voir DEPLOIEMENT.md), puis relancer ce workflow."
exit 1
