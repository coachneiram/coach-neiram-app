/**
 * Fumee : keto, import Google Sheets, superset et degressive.
 *
 * Les trois ajouts se verifient tres bien en test unitaire — et c'est
 * precisement pour cela que ce script existe. Un calcul juste qui
 * n'arrive pas a l'ecran est indiscernable, depuis les tests, d'un calcul
 * juste qui y arrive. Les deux defauts les plus couteux de ce depot
 * (aucune police chargee, page blanche hors ligne) etaient de cette
 * famille : verts partout, invisibles jusqu'a ce qu'on regarde la page.
 *
 * Trois parcours, dans un vrai navigateur :
 *
 *  1. KETO. Un client coche « Kéto » dans son profil ; on lit ses objectifs
 *     dans l'ecran Nutrition et on verifie que les glucides sont bas.
 *  2. IMPORT SHEETS. Un client en mode « Google Sheets » colle son tableau
 *     et retrouve ses seances types, avec leurs charges.
 *  3. TECHNIQUES. On marque un exercice en superset, un autre en
 *     degressive, et on verifie que les charges de chaque baisse
 *     s'affichent.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-keto-sheets-techniques.mjs
 */

import { chromium } from "playwright";
import { appareil } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4684, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];
let defauts = 0;

const verifier = (libelle, ok, detail = "") => {
  if (!ok) defauts++;
  console.log(`  ${libelle.padEnd(34)}: ${ok ? "ok" : "*** DÉFAUT ***"}${detail ? "  " + detail : ""}`);
};

const PROFIL = {
  firstName: "Marien", sex: "homme", age: 38, heightCm: 180, startWeightKg: 90,
  activityLevel: "modere", goal: "perte", targetWeightKg: 82, weeklyWorkoutTarget: 4,
  jobType: "sedentaire", trainingMode: "app", coachingMode: "presentiel",
  dietType: "aucun", allergies: [], slots: []
};

const TABLEAU_COLLE = [
  "Programme Marien — bloc 3",
  "Séance\tExercice\tSéries\tReps\tCharge\tRPE\tTechnique",
  "Haut du corps\tDéveloppé couché\t4\t8\t60\t8\t",
  "\tTirage horizontal\t4\t10\t50\t8\tSuperset",
  "\tÉlévations latérales\t3\t15\t8\t\tsuperset",
  "Bas du corps\tSquat\t5\t5\t90\t8\t"
].join("\n");

async function ouvrir(profil, onglet) {
  const page = await (await nav.newContext(appareil())).newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript((p) => {
    localStorage.clear();
    localStorage.setItem("coach_profile", JSON.stringify(p));
  }, profil);
  await page.goto("http://localhost:4684/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  if (onglet) {
    await page.getByRole("button", { name: onglet, exact: true }).first().click();
    await page.waitForTimeout(700);
  }
  return page;
}

const corps = (page) => page.locator("body").innerText();

/**
 * Valeur d'une macro dans l'ecran Nutrition.
 *
 * La valeur precede son libelle (« 29g » puis « Glucides ») : chercher
 * apres le libelle ramenait la macro SUIVANTE, ce que la premiere version
 * de ce script a fait sans que rien ne le signale.
 */
function macroAffichee(texte, libelle) {
  const m = texte.match(new RegExp("(\\d+)\\s*g\\s*\\n\\s*" + libelle, "i"));
  return m ? Number(m[1]) : null;
}

try {
  // ══ 1. KETO ══════════════════════════════════════════════════════
  console.log("── PROFIL KÉTO ──");
  let page = await ouvrir({ ...PROFIL, dietType: "keto" }, "Nutrition");
  let texte = await corps(page);

  const glucides = macroAffichee(texte, "Glucides");
  const lipides = macroAffichee(texte, "Lipides");
  const proteines = macroAffichee(texte, "Protéines");

  console.log(`  macros lues                       : P ${proteines} / G ${glucides} / L ${lipides}`);
  verifier("glucides bas (20 à 50 g)", glucides >= 20 && glucides <= 50, `${glucides} g`);
  verifier("lipides devenus majoritaires", lipides > glucides * 2, `${lipides} g`);
  await page.context().close();

  console.log("\n── LE MÊME PROFIL SANS KÉTO ──");
  page = await ouvrir({ ...PROFIL, dietType: "aucun" }, "Nutrition");
  texte = await corps(page);
  const glucidesNormal = macroAffichee(texte, "Glucides");
  const proteinesNormal = macroAffichee(texte, "Protéines");
  console.log(`  glucides sans kéto                : ${glucidesNormal} g`);
  verifier("le cas normal n'a pas bougé", glucidesNormal > 100, `${glucidesNormal} g`);
  verifier("les protéines sont les mêmes", proteines === proteinesNormal, `${proteines} vs ${proteinesNormal}`);
  await page.context().close();

  // ══ 2. IMPORT DU GOOGLE SHEETS ═══════════════════════════════════
  console.log("\n── IMPORT DU PROGRAMME (mode Google Sheets) ──");
  page = await ouvrir({ ...PROFIL, trainingMode: "sheets" }, "Séances");
  texte = await corps(page);
  verifier("la carte d'import est présente", /importer mes séances/i.test(texte));
  verifier("le pointage est toujours là", /pointer une séance/i.test(texte));

  await page.getByRole("button", { name: /Mon Sheets est privé/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole("textbox").last().fill(TABLEAU_COLLE);
  await page.getByRole("button", { name: "Analyser ce tableau" }).click();
  await page.waitForTimeout(500);

  texte = await corps(page);
  verifier("aperçu : les deux séances lues", /HAUT DU CORPS/i.test(texte) && /BAS DU CORPS/i.test(texte));
  verifier("aperçu : les charges du coach", /60 kg/.test(texte));
  verifier("aperçu : le superset reconnu", /superset A/i.test(texte));

  await page.getByRole("button", { name: "Enregistrer ces séances" }).click();
  await page.waitForTimeout(600);

  const routines = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_routines") || "[]"));
  verifier("2 séances types enregistrées", routines.length === 2, routines.map((r) => r.name).join(", "));
  verifier(
    "les exercices sont dans la séance type",
    routines.some((r) => r.exercises?.length === 3),
    JSON.stringify(routines.map((r) => r.exercises?.length))
  );

  texte = await corps(page);
  verifier("le constructeur apparaît après import", /séances types/i.test(texte));

  // On demarre la seance importee : c'est le seul moyen de prouver que les
  // charges du coach arrivent bien dans le formulaire de saisie.
  // Le nom est mis en capitales par le style, pas dans le DOM.
  await page.getByText("Haut du corps", { exact: true }).last().click();
  await page.waitForTimeout(600);
  const charges = await page.locator('input[type="number"]').evaluateAll((n) => n.map((x) => x.value));
  verifier("les charges du Sheets pré-remplissent la séance", charges.includes("60"), charges.join(","));
  await page.context().close();

  // ══ 3. SUPERSET ET DÉGRESSIVE ════════════════════════════════════
  console.log("\n── SUPERSET ET DÉGRESSIVE ──");
  page = await ouvrir(PROFIL, "Séances");
  await page.getByRole("button", { name: /Nouvelle séance type/i }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("textbox").first().fill("Test");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByText("Test", { exact: true }).last().click();
  await page.waitForTimeout(600);

  texte = await corps(page);
  verifier("le champ Technique est proposé", /technique/i.test(texte));

  // Un exercice sans nom est ecarte a l'enregistrement — c'est voulu, et
  // c'est ce qui a fait echouer la premiere version de ce script.
  await page.getByPlaceholder("Exercice").first().fill("Curl barre EZ");

  const selectTechnique = page.locator("select").filter({ hasText: "Série classique" }).first();
  await selectTechnique.selectOption("superset");
  await page.waitForTimeout(300);
  texte = await corps(page);
  verifier("superset : le groupe est expliqué", /enchaîné sans repos/i.test(texte));

  await selectTechnique.selectOption("degressive");
  await page.waitForTimeout(300);
  // La charge de depart est necessaire pour que les paliers se calculent.
  await page.getByLabel("Charge (kg)").fill("60").catch(async () => {
    const champs = page.locator('input[type="number"]');
    await champs.nth(3).fill("60");
  });
  await page.waitForTimeout(400);
  texte = await corps(page);
  verifier("dégressive : les charges sont calculées", /47[.,]5 kg puis 37[.,]5 kg/.test(texte), texte.match(/Après la série[^\n]*/)?.[0] || "");

  await page.getByRole("button", { name: "Enregistrer la séance" }).click();
  await page.waitForTimeout(600);
  texte = await corps(page);
  verifier("la technique remonte dans l'historique", /dégressive ×2/.test(texte));
  await page.context().close();

  console.log("\n" + (erreurs.length ? "ERREURS JS : " + erreurs.join(" | ") : "aucune erreur JavaScript"));
  console.log(defauts ? `\nVERDICT : ${defauts} défaut(s).` : "\nVERDICT : tout est vert.");
} finally {
  await nav.close();
  serveur.close();
}
process.exit(defauts || erreurs.length ? 1 : 0);
