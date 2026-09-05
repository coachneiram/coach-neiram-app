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
node --test tests/*.test.mjs

echo ""
echo "── Proxy Cloudflare ─────────────────────────────────────"
node worker/test-worker.mjs

echo ""
echo "Tout est vert."
