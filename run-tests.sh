#!/bin/sh
# Lance toute la suite de tests de Coach Neiram.
#
#   ./run-tests.sh
#
# Aucune installation prealable : tout repose sur le lanceur de tests integre
# a Node (node --test). Aucun test n'appelle un service reel.

set -e
cd "$(dirname "$0")"

echo "── Application (index.html) ─────────────────────────────"
# Un bloc qui plante au chargement affiche « not ok » sans faire echouer
# node --test (code 0, « fail 0 ») : on echoue aussi sur la sortie.
SORTIE=$(mktemp)
set +e
node --test tests/*.test.mjs > "$SORTIE" 2>&1
CODE=$?
set -e
grep -E "^# (tests|pass|fail)" "$SORTIE"
if [ "$CODE" -ne 0 ] || grep -qE "^\s*not ok" "$SORTIE"; then
  grep -E "^\s*not ok" "$SORTIE" || tail -50 "$SORTIE"
  rm -f "$SORTIE"
  exit 1
fi
rm -f "$SORTIE"

echo ""
echo "── Proxy Cloudflare ─────────────────────────────────────"
node worker/test-worker.mjs

echo ""
echo "Tout est vert."
