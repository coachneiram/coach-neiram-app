/**
 * Filets contre les plantages d'affichage (ui/FiletErreur.jsx), repris de
 * l'app Neiram le 24 octobre 2026. Les donnees n'existent que sur le
 * telephone : un ecran qui plante ne doit ni emporter toute l'app, ni
 * empecher d'exporter son suivi.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lire = (f) => readFileSync(new URL("../app/src/" + f, import.meta.url), "utf8");

test("toute l'app est sous un filet de dernier recours", () => {
  assert.match(lire("main.jsx"), /<FiletApp>\s*<App \/>\s*<\/FiletApp>/);
});

test("chaque onglet a son filet, remis a zero quand on change d'onglet", () => {
  assert.match(
    lire("App.jsx"),
    /<FiletEcran key=\{ongletActif\} ecran=\{ongletActif\} onRetourJournal=\{\(\) => setOngletActif\("journal"\)\}>\s*\{ecrans\[ongletActif\]\}\s*<\/FiletEcran>/
  );
});

test("le filet attrape l'erreur, propose d'abord la sauvegarde, et ne l'envoie nulle part", () => {
  const filet = lire("ui/FiletErreur.jsx");
  assert.match(filet, /static getDerivedStateFromError\(erreur\)/);
  assert.match(filet, /componentDidCatch/);
  assert.match(filet, /exporterSauvegarde\(construireSauvegarde\(\)/);
  assert.ok(!/fetch\(|sendBeacon|XMLHttpRequest/.test(filet), "aucun envoi reseau depuis le filet");
  assert.ok(filet.indexOf("<BoutonSauvegarde />") < filet.indexOf("{T.reessayer}"));
});

test("les listes stockees passent par la reparation douce", () => {
  assert.match(lire("App.jsx"), /return reparerCollection\(nom, charger\(cle, \[\]\)\);/);
});
