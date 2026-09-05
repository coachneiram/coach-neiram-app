/**
 * Styles globaux de l'application migree.
 *
 * Deux defauts ont echappe a 209 tests : l'application Vite ne chargeait
 * aucune police, et la regle « box-sizing: border-box » de GLOBAL_CSS
 * n'avait pas ete reprise. Aucun des deux ne casse un calcul — ils rendent
 * seulement l'ecran meconnaissable. Il a fallu regarder la page pour les
 * voir.
 *
 * Ces tests ferment la porte a cette famille d'oublis : ils comparent les
 * polices chargees, les regles globales, et verifient qu'aucune classe CSS
 * utilisee par les composants n'est restee sans definition.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");

const LEGACY = readFileSync(join(RACINE, "index.html"), "utf8");
const PAGE_APP = readFileSync(join(RACINE, "app", "index.html"), "utf8");
const CSS_APP = readFileSync(join(RACINE, "app", "src", "styles.css"), "utf8");

/** Familles et graisses demandees a Google Fonts dans une source donnee. */
function policesDemandees(source) {
  const m = source.match(/fonts\.googleapis\.com\/css2\?([^"')]+)/);
  if (!m) return null;
  return new Set(
    m[1]
      .split("&")
      .filter((p) => p.startsWith("family="))
      .map((p) => decodeURIComponent(p.slice("family=".length)))
  );
}

describe("les polices sont les memes que dans l'application actuelle", () => {
  test("l'application migree charge bien des polices", () => {
    // Sans elles, tout retombe sur la police du systeme : rien ne casse,
    // mais l'ecran ne ressemble plus a ce que le client connait.
    assert.notEqual(policesDemandees(PAGE_APP), null, "aucune police chargee dans app/index.html");
  });

  test("memes familles et memes graisses que index.html", () => {
    assert.deepEqual(
      [...policesDemandees(PAGE_APP)].sort(),
      [...policesDemandees(LEGACY)].sort(),
      "les polices demandees different de celles de l'application actuelle"
    );
  });

  test("les trois familles utilisees dans le code sont bien chargees", () => {
    const jetons = readFileSync(join(RACINE, "app", "src", "tokens.js"), "utf8");
    const demandees = [...policesDemandees(PAGE_APP)].join(" ");
    for (const famille of ["Poppins", "Inter", "IBM Plex Mono"]) {
      assert.ok(jetons.includes(famille), "famille absente des jetons : " + famille);
      assert.ok(
        demandees.includes(famille.replace(/ /g, "+")) || demandees.includes(famille),
        "famille utilisée mais jamais chargée : " + famille
      );
    }
  });
});

/**
 * Une classe est definie si son nom apparait en entier dans une regle.
 *
 * La verification naive par sous-chaine se laisse berner : « .modal-panel »
 * se retrouve dans « .modal-panel-renomme », si bien qu'un renommage
 * passait pour une definition valide.
 */
function estDefinie(classe) {
  const echappe = classe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("\\." + echappe + "(?![\\w-])").test(CSS_APP);
}

describe("les regles globales de GLOBAL_CSS sont reprises", () => {
  test("box-sizing: border-box s'applique a tout", () => {
    // Sans cette regle, chaque padding s'ajoute a la largeur declaree et
    // tous les espacements se decalent par rapport a l'original.
    assert.match(CSS_APP, /\*\s*\{[^}]*box-sizing:\s*border-box/);
  });

  test("le fond de page est peint explicitement", () => {
    assert.match(CSS_APP, /body\s*\{[^}]*background/s);
  });

  test("les classes de fenetre modale existent", () => {
    for (const classe of ["modal-overlay", "modal-panel"]) {
      assert.ok(estDefinie(classe), "classe manquante : " + classe);
    }
  });

  test("les animations referencees sont definies", () => {
    for (const animation of [...CSS_APP.matchAll(/animation:\s*([A-Za-z][\w-]*)/g)].map((m) => m[1])) {
      assert.ok(
        CSS_APP.includes("@keyframes " + animation),
        "animation utilisee mais jamais definie : " + animation
      );
    }
  });
});

describe("aucune classe CSS n'est utilisee sans etre definie", () => {
  /** Fichiers de composants de l'application migree. */
  function sourcesJsx(dossier) {
    const out = [];
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, entree.name);
      if (entree.isDirectory()) out.push(...sourcesJsx(chemin));
      else if (entree.name.endsWith(".jsx")) out.push(chemin);
    }
    return out;
  }

  test("chaque className des composants a une regle correspondante", () => {
    const manquantes = new Set();
    for (const fichier of sourcesJsx(join(RACINE, "app", "src"))) {
      const source = readFileSync(fichier, "utf8");
      for (const m of source.matchAll(/className="([^"{}]+)"/g)) {
        for (const classe of m[1].trim().split(/\s+/)) {
          if (classe && !estDefinie(classe)) manquantes.add(classe);
        }
      }
    }
    assert.deepEqual([...manquantes], [], "classes utilisees mais absentes de styles.css");
  });
});
