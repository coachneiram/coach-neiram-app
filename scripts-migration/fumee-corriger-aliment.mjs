/**
 * Fumee : corriger un aliment deja inscrit au journal.
 *
 * Le parcours reel d'une cliente : elle photographie son assiette, l'IA
 * estime les macros, et elle sait mieux qu'elle ce qu'il y avait dedans.
 * Jusqu'ici son seul recours etait de supprimer la ligne et de tout
 * ressaisir — ce que personne ne fait. On garde le chiffre approximatif,
 * et le suivi derive doucement.
 *
 * Le script verifie les deux formes de correction :
 *
 *   - une estimation photo, sans poids fiable : on touche aux valeurs ;
 *   - un aliment du catalogue, qui porte ses grammes : changer la quantite
 *     remet les macros a l'echelle toutes seules ;
 *   - un article de la liste de courses, dont les valeurs sont POUR 100 g
 *     et non pour une portion — le meme geste, un autre sens.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-corriger-aliment.mjs
 */

import { chromium } from "playwright";
import { appareil, nomAppareil } from "./appareil.mjs";
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
await new Promise((r) => serveur.listen(4683, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await (await nav.newContext({ ...appareil() })).newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));

const AUJ = new Date().toISOString().slice(0, 10);

await page.addInitScript((auj) => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Sabine", sex: "femme", age: 41, heightCm: 168, startWeightKg: 68,
    activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, targetWeightKg: 63,
    trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_log_entries", JSON.stringify([
    // Telle que l'IA l'inscrit apres une photo : aucun poids fiable.
    { id: "photo1", date: auj, mealType: "dejeuner", name: "Assiette de pâtes",
      calories: 620, protein: 22, carbs: 88, fat: 18 },
    // Telle que le catalogue l'inscrit : elle porte ses grammes.
    { id: "cat1", date: auj, mealType: "dejeuner", name: "Poulet (200 g)", baseName: "Poulet",
      grams: 200, calories: 400, protein: 60, carbs: 0, fat: 16 }
  ]));
}, AUJ);

const lire = () => page.evaluate(() => JSON.parse(localStorage.getItem("coach_log_entries") || "[]"));
const entree = async (id) => (await lire()).find((e) => e.id === id);

try {
  console.log("Appareil émulé :", nomAppareil());
  await page.goto("http://localhost:4683/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Journal", exact: true }).first().click();
  await page.waitForTimeout(700);

  // ── 1. Le crayon existe-t-il sur chaque ligne ? ──────────────────
  const crayons = page.getByRole("button", { name: "Corriger" });
  console.log("1. CRAYONS            :", await crayons.count(), "ligne(s) corrigeable(s)");
  if ((await crayons.count()) < 2) throw new Error("*** CRAYON ABSENT sur une ligne du journal");

  // ── 2. Corriger une estimation photo ─────────────────────────────
  await crayons.first().click();
  await page.waitForTimeout(600);
  const m = page.locator(".modal-panel").last();
  const texte = await m.innerText();
  console.log("2. MODALE OUVERTE     :", /Corriger l'aliment/i.test(texte) ? "« Corriger l'aliment »" : "*** TITRE INATTENDU ***");
  console.log("   quantité proposée  :", /quantité en grammes/i.test(texte)
    ? "*** OUI — or cette entrée n'a pas de poids fiable ***"
    : "non, comme il se doit");

  const nums = m.locator('input[type="number"]');
  await nums.nth(0).fill("480");
  await nums.nth(3).fill("9");
  await m.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.waitForTimeout(800);

  const photo = await entree("photo1");
  console.log("3. APRÈS CORRECTION   :", photo ? `${photo.calories} kcal · P${photo.protein} G${photo.carbs} L${photo.fat}` : "*** ENTRÉE PERDUE ***");
  console.log("   valeurs non touchées:", photo && photo.protein === 22 && photo.carbs === 88
    ? "conservées (P22 G88)" : "*** ÉCRASÉES ***");

  // ── 4. Corriger la quantité d'un aliment du catalogue ────────────
  await page.getByRole("button", { name: "Corriger" }).nth(1).click();
  await page.waitForTimeout(600);
  const m2 = page.locator(".modal-panel").last();
  const texte2 = await m2.innerText();
  console.log("4. ALIMENT PESÉ       :", /quantité en grammes/i.test(texte2) ? "la quantité est proposée" : "*** QUANTITÉ ABSENTE ***");

  const nums2 = m2.locator('input[type="number"]');
  await nums2.first().fill("150");
  await page.waitForTimeout(500);
  const recalcul = await nums2.nth(1).inputValue();
  console.log("   recalcul en direct :", recalcul === "300" ? "200 g → 150 g donne 300 kcal" : `*** ${recalcul} kcal, attendu 300 ***`);

  await m2.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.waitForTimeout(800);
  const cat = await entree("cat1");
  console.log("5. ENREGISTRÉ         :", cat ? `${cat.grams} g · ${cat.calories} kcal · P${cat.protein}` : "*** PERDU ***");
  console.log("   lien au catalogue  :", cat && cat.baseName === "Poulet" ? "conservé" : "*** PERDU ***");

  // ── 6. Survit au redémarrage ─────────────────────────────────────
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const apres = await entree("photo1");
  console.log("6. APRÈS REDÉMARRAGE  :", apres && apres.calories === 480 ? "480 kcal conservés" : "*** CORRECTION PERDUE ***");

  // ── 7. La suppression reste possible ─────────────────────────────
  await page.getByRole("button", { name: "Journal", exact: true }).first().click();
  await page.waitForTimeout(600);
  console.log("7. SUPPRIMER          :", (await page.getByRole("button", { name: "Supprimer" }).count()) ? "toujours proposé" : "*** DISPARU ***");
  // ══ LISTE DE COURSES : meme geste, autre sens ═════════════════════
  //
  // Ici les valeurs sont POUR 100 g. Un ecran qui ne le dirait pas
  // inviterait a saisir celles de son assiette.
  await page.evaluate(() => {
    localStorage.setItem("coach_shopping_custom", JSON.stringify([
      { id: "art1", name: "Skyr", kcal: 63, p: 11, c: 4, f: 0.2, source: "photo", pending: false }
    ]));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Repas", exact: true }).first().click();
  await page.waitForTimeout(600);
  // L'onglet s'appelle « Courses », pas « Liste de courses » : viser le
  // libelle affiche, jamais celui qu'on croit se rappeler.
  await page.getByRole("button", { name: "Courses", exact: true }).first().click();
  await page.waitForTimeout(1000);

  const crayonCourses = page.getByRole("button", { name: "Corriger" });
  console.log("8. COURSES — CRAYON   :", (await crayonCourses.count()) ? "présent sur l'ajout perso" : "*** ABSENT ***");
  if (await crayonCourses.count()) {
    await crayonCourses.last().click();
    await page.waitForTimeout(700);
    const mc = page.locator(".modal-panel").last();
    const tc = await mc.innerText();
    // Les libelles de champ sont rendus en MAJUSCULES par la feuille de
    // style : la comparaison doit ignorer la casse.
    console.log("   libellés           :", /\/100 ?g/i.test(tc) ? "disent « /100 g »" : "*** NE DISENT PAS LA QUANTITÉ ***");
    console.log("   pas de quantité    :", /quantité en grammes/i.test(tc) ? "*** PROPOSÉE À TORT ***" : "correct");
    await mc.locator('input[type="number"]').first().fill("58");
    await mc.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await page.waitForTimeout(800);
    const art = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_shopping_custom") || "[]")[0]);
    console.log("9. ARTICLE CORRIGÉ    :", art ? `${art.kcal} kcal/100 g · P${art.p}` : "*** PERDU ***");
    console.log("   provenance         :", art && art.source === "photo" ? "conservée" : "*** PERDUE ***");
  }
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
