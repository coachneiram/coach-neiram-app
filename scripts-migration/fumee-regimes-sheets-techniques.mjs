/**
 * Fumee : regimes alimentaires, import Google Sheets, superset et degressive.
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
 *  1. REGIMES. Chaque combinaison des deux axes — ce que le client ne
 *     mange pas, comment il repartit ses macros — est posee dans le profil,
 *     et on lit les objectifs obtenus dans l'ecran Nutrition. On verifie
 *     AUSSI que les deux menus existent vraiment : un calibrage juste que
 *     personne ne peut choisir ne sert a rien. Et qu'un profil enregistre
 *     AVANT la scission des deux axes ne voit rien changer.
 *  2. IMPORT SHEETS. Un client en mode « Google Sheets » colle son tableau
 *     et retrouve ses seances types, avec leurs charges.
 *  3. TECHNIQUES. On marque un exercice en superset, un autre en
 *     degressive, et on verifie que les charges de chaque baisse
 *     s'affichent.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-regimes-sheets-techniques.mjs
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

/*
 * EN-TETES AU PLURIEL, deliberement.
 *
 * C'est l'ecriture qui a fait echouer un import reel : la reconnaissance
 * exigeait le singulier, « Exercices » ne tombait sur aucun role, et le
 * message accusait le tableau du client. Le parcours de fumee porte donc
 * desormais sur cette ecriture-la, qui est au moins aussi frequente que
 * l'autre — et le singulier reste couvert par les tests unitaires.
 */
const TABLEAU_COLLE = [
  "Programme Marien — bloc 3",
  // Colonne DOUBLE « RPE/Charge », comme dans le tableau reel qui a fait
  // echouer l'import : l'en-tete tombait sur le RPE seul et la charge
  // etait perdue. Le parcours de fumee porte donc sur cette ecriture.
  "Séances\tExercices\tSéries\tReps\tRPE/Charge\tTechnique",
  "Haut du corps\tDéveloppé couché\t4\t8\t8 / 60\t",
  "\tTirage horizontal\t4\t10\t8 / 50\tSuperset",
  "\tÉlévations latérales\t3\t15\t7 / 8\tsuperset",
  "Bas du corps\tSquat\t5\t5\t8 / 90\t"
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
  // L'unite change d'une ligne a l'autre : « 2280kcal » pour les calories,
  // « 180g » pour les macros. L'exiger en grammes rendait null sur les
  // calories, et tous les rapports calcules a partir d'elles devenaient
  // NaN — donc silencieusement « ok ».
  const m = texte.match(new RegExp("(\\d+)\\s*(?:kcal|g)\\s*\\n\\s*" + libelle, "i"));
  return m ? Number(m[1]) : null;
}

/** Lit les quatre objectifs du jour dans l'ecran Nutrition. */
async function macrosDuProfil(profil) {
  const page = await ouvrir(profil, "Nutrition");
  const texte = await corps(page);
  const lu = {
    kcal: macroAffichee(texte, "Calories"),
    p: macroAffichee(texte, "Protéines"),
    g: macroAffichee(texte, "Glucides"),
    l: macroAffichee(texte, "Lipides"),
    explication: (texte.match(/Base actuelle[^\n]*\n+([^\n]+)/) || [])[1] || ""
  };
  await page.context().close();
  return lu;
}

try {
  // ══ 1. RÉGIMES ═══════════════════════════════════════════════════
  console.log("── LES DEUX AXES, OBJECTIF PERTE ──");
  const reference = await macrosDuProfil({ ...PROFIL });
  console.log(`  aucun réglage                     : ${reference.kcal} kcal · P ${reference.p} G ${reference.g} L ${reference.l}`);
  verifier("le cas normal n'a pas bougé", reference.g > 200, `${reference.g} g de glucides`);

  const CAS = [
    // [restriction, répartition, contrôle]
    ["aucun", "keto", (m) => m.g >= 20 && m.g <= 50 && m.l > m.g * 2],
    ["aucun", "lowcarb", (m) => m.g > 50 && m.g < reference.g * 0.7 && m.l > reference.l],
    ["aucun", "hyperproteine", (m) => m.p > reference.p * 1.2 && m.l === reference.l],
    ["pescetarien", "standard", (m) => m.p === reference.p && m.g === reference.g],
    // La combinaison qui n'existait pas avant la scission des deux axes.
    ["vegetarien", "hyperproteine", (m) => m.p > reference.p * 1.3],
    ["vegetalien", "lowcarb", (m) => m.p > reference.p && m.g < reference.g * 0.7]
  ];

  for (const [restriction, repartition, controle] of CAS) {
    const m = await macrosDuProfil({ ...PROFIL, dietType: restriction, repartitionMacros: repartition });
    console.log(`  ${(restriction + " + " + repartition).padEnd(34)}: ${m.kcal} kcal · P ${m.p} G ${m.g} L ${m.l}`);
    verifier(`${restriction}+${repartition} : calories inchangées`, m.kcal === reference.kcal, `${m.kcal}`);
    verifier(`${restriction}+${repartition} : répartition attendue`, controle(m));
  }

  console.log("\n── UN PROFIL ENREGISTRÉ AVANT LA SCISSION ──");
  // Le vrai risque de la refonte : un client passé en kéto avant qu'elle
  // existe n'a pas de champ repartitionMacros. Il ne doit rien voir changer.
  const ancien = await macrosDuProfil({ ...PROFIL, dietType: "keto" });
  const nouveau = await macrosDuProfil({ ...PROFIL, dietType: "aucun", repartitionMacros: "keto" });
  console.log(`  ancien profil kéto                : P ${ancien.p} G ${ancien.g} L ${ancien.l}`);
  verifier(
    "il garde exactement ses macros kéto",
    ancien.p === nouveau.p && ancien.g === nouveau.g && ancien.l === nouveau.l,
    `${ancien.p}/${ancien.g}/${ancien.l} vs ${nouveau.p}/${nouveau.g}/${nouveau.l}`
  );

  console.log("\n── LE MÊME RÉGIME SELON L'OBJECTIF ──");
  for (const id of ["lowcarb", "hyperproteine"]) {
    const seche = await macrosDuProfil({ ...PROFIL, goal: "perte", repartitionMacros: id });
    const prise = await macrosDuProfil({ ...PROFIL, goal: "prise", repartitionMacros: id });
    const bouge = id === "lowcarb"
      ? seche.g * 4 / seche.kcal < prise.g * 4 / prise.kcal
      : seche.p > prise.p;
    console.log(`  ${id.padEnd(34)}: sèche P ${seche.p} G ${seche.g} · prise P ${prise.p} G ${prise.g}`);
    verifier(`${id} : le calibrage suit l'objectif`, bouge);
  }

  console.log("\n── LES DEUX MENUS DU PROFIL ──");
  let page = await ouvrir(PROFIL, null);
  await page.getByLabel("Réglages").first().click();
  await page.waitForTimeout(700);

  const optionsDe = async (mot) =>
    page.locator("select").filter({ hasText: mot }).first().locator("option").allTextContents();
  const restrictions = await optionsDe("Végétarien");
  const repartitions = await optionsDe("Standard");
  console.log("  restrictions                      :", restrictions.join(" · "));
  console.log("  répartitions                      :", repartitions.join(" · "));
  verifier("« Pescétarien » proposé", restrictions.some((o) => o.includes("Pescétarien")));
  verifier("le kéto a quitté les restrictions", !restrictions.some((o) => o.includes("Kéto")));
  for (const attendu of ["Standard", "low carb", "Kéto", "protéiné"]) {
    verifier(`« ${attendu} » en répartition`, repartitions.some((o) => o.includes(attendu)));
  }

  // L'avertissement sur une combinaison difficile, et son chiffre.
  await page.locator("select").filter({ hasText: "Végétarien" }).first().selectOption("vegetalien");
  await page.locator("select").filter({ hasText: "Standard" }).first().selectOption("keto");
  await page.waitForTimeout(400);
  const texteProfil = await corps(page);
  const compte = (texteProfil.match(/(\d+) sources de protéines/) || [])[1];
  verifier("végétalien + kéto : le client est averti", !!compte, `${compte} sources annoncées`);
  verifier("l'avertissement ne bloque pas l'enregistrement",
    await page.getByRole("button", { name: /Enregistrer/i }).first().isEnabled());
  await page.context().close();

  let texte;
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
