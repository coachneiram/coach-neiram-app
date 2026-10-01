# Provenance des skills tiers

Copiés tels quels, après lecture, depuis un dépôt public. Aucune mise à jour automatique : toute mise à jour se fait à la main, après relecture.

| Skills | Source | Commit lu | Licence |
|---|---|---|---|
| `web-quality-audit`, `performance`, `core-web-vitals`, `accessibility`, `best-practices`, `seo` | github.com/addyosmani/web-quality-skills | afa8da9 | MIT (`_sources/LICENSE-web-quality-skills`) |

Le script `web-quality-audit/scripts/analyze.sh` est en lecture seule : aucun accès réseau, aucune écriture.

## Lus et volontairement non installés

- `mattiasgeniar/offline-first-pwa` : sa règle n° 1 (« navigations en cache d'abord, jamais réseau d'abord ») contredit le principe n° 1 de `sw.js` (`index.html` toujours réseau d'abord, pour ne jamais bloquer un client sur une version cassée). Une contradiction se tranche à la main, pas par un skill qui se déclenche tout seul sur `sw.js`. Voir la décision à prendre dans le compte rendu de la session du 2026-10-01.
