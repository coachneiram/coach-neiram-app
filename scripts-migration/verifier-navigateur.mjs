/**
 * Lance tous les scripts de fumee, et rend un verdict.
 *
 * ─────────────────────────────────────────────────────────────────────
 * CE QUE CETTE CHAINE ATTRAPE, ET QUE LES TESTS UNITAIRES NE VOIENT PAS
 * ─────────────────────────────────────────────────────────────────────
 *
 * Trois pannes de cette migration sont passees au travers de la suite
 * unitaire, toutes verte au moment des faits :
 *
 *   - un ecran blanc : 870 tests verts, l'application ne demarrait pas
 *     (une variable lue avant sa declaration) ;
 *   - un import manquant : le build passait, 898 tests verts, l'ecran
 *     plantait a l'ouverture ;
 *   - un jeton de couleur inexistant : texte invisible, aucune erreur.
 *
 * Aucune de ces trois ne se voit sans ouvrir l'application. C'est le seul
 * role de ce lanceur.
 *
 * Les scripts sont DECOUVERTS, jamais listes : une liste en dur finirait
 * par oublier un script, et l'oubli ne se verrait pas — la chaine resterait
 * verte en n'ayant rien verifie.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/verifier-navigateur.mjs
 */

import { execFile } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { juger } from "./verdict.mjs";
import { nomAppareil } from "./appareil.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));

/** Au-dela, un script est considere bloque plutot que lent. */
const DELAI_MAX_MS = 240000;

const scripts = readdirSync(ICI)
  .filter((f) => f.startsWith("fumee-") || f === "etat-des-lieux.mjs")
  .sort();

if (!scripts.length) {
  console.error("Aucun script de fumée trouvé : la chaîne ne vérifierait rien.");
  process.exit(1);
}

/** Lance un script et rend sa sortie complete, sans jamais lever. */
function lancer(fichier) {
  return new Promise((resoudre) => {
    execFile(
      process.execPath,
      [join(ICI, fichier)],
      { timeout: DELAI_MAX_MS, env: process.env, maxBuffer: 8 * 1024 * 1024 },
      (erreur, sortieStandard, sortieErreur) => {
        const sortie = String(sortieStandard || "") + String(sortieErreur || "");
        // Un depassement de delai n'imprime rien d'exploitable : on le dit.
        if (erreur && erreur.killed) {
          resoudre({ sortie: sortie + "\nECHEC : délai dépassé (script bloqué)", code: 1 });
          return;
        }
        resoudre({ sortie, code: erreur ? erreur.code || 1 : 0 });
      }
    );
  });
}

// L'appareil est annonce en tete : sans lui, un journal vert ne dit pas
// QUELLE passe a tourne, et une variable mal transmise passerait pour un
// succes Android alors que l'iPhone a ete teste deux fois.
const surAndroid = process.env.APPAREIL ? ` sur ${nomAppareil()}` : "";
console.log(`Vérification au navigateur${surAndroid} — ${scripts.length} scripts\n`);

const echecs = [];
for (const fichier of scripts) {
  const debut = Date.now();
  const { sortie, code } = await lancer(fichier);
  const verdict = juger(sortie, code);
  const duree = ((Date.now() - debut) / 1000).toFixed(0);

  console.log(`${verdict.ok ? "  ok  " : "  ÉCHEC"} ${fichier.padEnd(34)} ${duree}s`);
  if (!verdict.ok) {
    echecs.push({ fichier, verdict, sortie });
    for (const r of verdict.raisons) console.log(`        ${r}`);
  }
}

if (echecs.length) {
  console.log(`\n${"─".repeat(66)}`);
  console.log(`${echecs.length} script(s) en échec. Sortie complète :\n`);
  for (const e of echecs) {
    console.log(`━━━ ${e.fichier} ━━━`);
    console.log(e.sortie.trim() || "(aucune sortie)");
    console.log();
  }
  process.exit(1);
}

console.log(`\nLes ${scripts.length} scripts passent${surAndroid} : l'application s'ouvre et répond.`);
