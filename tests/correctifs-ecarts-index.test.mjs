/**
 * Regles de style et petits correctifs retablis le 22/10/2026 (ecarts
 * releves entre l'ancien index.html et app/).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, lstatSync, readlinkSync } from "node:fs";
import { join } from "node:path";
import { moisLong } from "../app/src/lib/bilan-ia.js";
import { fmtPortion } from "../app/src/lib/portions.js";

const lire = (c) => readFileSync(join(process.cwd(), c), "utf8");
const css = lire("app/src/styles.css");

test("selecteurs de date et d'heure en theme sombre", () => {
  assert.match(css, /input\[type="date"\],\s*input\[type="time"\]\s*\{\s*color-scheme: dark;/);
});

test("couleur des textes d'exemple", () => {
  assert.match(css, /input::placeholder,\s*textarea::placeholder\s*\{\s*color: #63635c;/i);
});

test("boutons et champs heritent de la police, definie sur body", () => {
  assert.match(css, /button,\s*input,\s*select,\s*textarea\s*\{\s*font-family: inherit;/);
  assert.match(css, /body \{[^}]*font-family: "Inter"/);
});

test("contour dore au focus clavier", () => {
  assert.match(
    css,
    /button:focus-visible,\s*input:focus-visible,\s*select:focus-visible,\s*textarea:focus-visible\s*\{\s*outline: 2px solid #f8d040;\s*outline-offset: 2px;/i
  );
});

test("titre du bilan mensuel : le mois en toutes lettres", () => {
  assert.equal(moisLong("2026-10"), "octobre 2026");
  const t = lire("app/src/ecrans/Tendances.jsx");
  assert.match(t, /Bilan mensuel — \{moisLong\(monthStats\.monthKey\)\}/);
  assert.doesNotMatch(t, /Bilan mensuel — \{monthStats\.monthKey\}/);
});

test("« Généré le » sous les bilans, et pas de bouton mensuel sans donnees", () => {
  const t = lire("app/src/ecrans/Tendances.jsx");
  assert.equal((t.match(/<GenereLe bilan=/g) || []).length, 2);
  assert.match(t, /<GenereLe bilan=\{bilanCourant\} \/>/);
  assert.match(t, /<GenereLe bilan=\{bilanMensuelCourant\} \/>/);
  assert.match(t, /Généré le \{fmtDateShort\(bilan\.generatedAt\.slice\(0, 10\)\)\}/);
  assert.match(t, /bilanMensuelCourant \|\| monthStats\.hasAnyData/);
  assert.match(t, /Ajoute des données ce mois-ci \(mensurations comprises\) pour débloquer le bilan mensuel\./);
});

test("portion d'un plat a la francaise : ×1,5", () => {
  assert.equal(fmtPortion(1.5), "1,5");
  const j = lire("app/src/ecrans/Journal.jsx");
  assert.match(j, /\(×\$\{fmtPortion\(facteur\)\}\)/);
  assert.doesNotMatch(j, /\(×\$\{facteur\}\)/);
});

test("icone « + » sur les boutons d'ecran vide", () => {
  for (const f of ["Mensurations", "ConstructeurSeances", "Plats"]) {
    assert.match(lire(`app/src/ecrans/${f}.jsx`), /iconeCta=\{Plus\}/, f);
  }
});

test("flamme de la carte de motivation des creneaux", () => {
  assert.match(lire("app/src/ecrans/Creneaux.jsx"), /<MotivationCard text=\{motivation\} icone=\{Flame\} \/>/);
});

test("notification passagere : 8 s, la precedente est annulee", () => {
  const app = lire("app/src/App.jsx");
  assert.match(app, /const DUREE_TOAST = 8000;/);
  assert.match(app, /window\.clearTimeout\(minuteurToast\.current\)/);
  assert.match(app, /minuteurToast\.current = window\.setTimeout\(/);
});

test("mention « pesé cru / pesé cuit » : food-etats.js est servi et charge", () => {
  const lien = join(process.cwd(), "app", "public", "food-etats.js");
  assert.ok(lstatSync(lien).isSymbolicLink());
  assert.equal(readlinkSync(lien), join("..", "..", "food-etats.js"));
  const html = lire("app/index.html");
  assert.ok(html.indexOf('src="./food-etats.js"') > html.indexOf('src="./food-fibres.js"'));
  assert.match(lire("sw.js"), /"\.\/food-etats\.js"/);
});

test("la CI echoue sur une ligne « not ok », meme si node --test rend 0", () => {
  for (const f of [".github/workflows/tests.yml", ".github/workflows/deploy.yml", "run-tests.sh"]) {
    assert.match(lire(f), /grep -qE "\^\\s\*not ok"/, f);
  }
});
