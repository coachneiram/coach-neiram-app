/**
 * Fumee : composer une recette, puis en manger une part.
 *
 * Demande du coach : « la personne prepare une quiche, elle met 200 g de
 * lardons, 100 g de lait... » et l'application calcule les calories.
 *
 * Le parcours complet, tel qu'une cliente le fait :
 *   1. Repas → Mes plats → Nouvelle recette ;
 *   2. nom, nombre de parts, ingredients cherches par leur nom ;
 *   3. enregistrement, puis modification du nombre de parts ;
 *   4. Journal → « + ajouter » → Repas : la recette s'ouvre a UNE part,
 *      et c'est une part qui arrive dans la journee — pas la quiche ;
 *      puis « 2 parts » touche dans le tableau ajoute deux parts ;
 *   5. la recette survit au redemarrage, puis se supprime.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-recettes.mjs
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
await new Promise((r) => serveur.listen(4641, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil("Pixel 7"));
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
page.on("dialog", (d) => d.accept());

// Open Food Facts est injoignable ici : une reponse stable, pour que la
// recherche aboutisse toujours (le catalogue local repond souvent avant).
await page.route("**/world.openfoodfacts.org/**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      products: [{
        product_name: "Produit de test", brands: "Marque", code: "3000000000001",
        nutriments: { "energy-kcal_100g": 100, proteins_100g: 5, carbs_100g: 10, fat_100g: 4 }
      }]
    })
  })
);

const AUJ = new Date().toISOString().slice(0, 10);
await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Claire", sex: "femme", age: 35, heightCm: 166, startWeightKg: 64,
    activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3, targetWeightKg: 62,
    trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_log_entries", JSON.stringify([]));
  localStorage.setItem("cn_meal_presets", JSON.stringify([]));
  localStorage.setItem("coach_dishes", JSON.stringify([]));
});

const lire = (cle) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "[]"), cle);
const modale = () => page.locator(".modal-panel").last();

/** Cherche un ingredient, prend le premier resultat, a la quantite donnee. */
async function ajouterIngredient(terme, grammes) {
  const m = modale();
  await m.getByPlaceholder(/skyr, riz basmati/).fill(terme);
  await m.getByRole("button", { name: "Chercher", exact: true }).click();
  await page.waitForTimeout(900);
  // Le premier resultat : son bouton porte le nom de l'aliment, pas un libelle fixe.
  await m.locator("button:has(span)").filter({ hasText: /kcal/ }).first().click();
  await page.waitForTimeout(300);
  await m.locator('input[type="number"]').last().fill(String(grammes));
  await m.getByRole("button", { name: "Ajouter", exact: true }).click();
  await page.waitForTimeout(400);
}

try {
  await page.goto("http://localhost:4641/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  // ── 1. Repas → Mes plats → Nouvelle recette ──────────────────────
  await page.getByRole("button", { name: "Repas", exact: true }).first().click();
  await page.waitForTimeout(500);
  const bouton = page.getByRole("button", { name: /Nouvelle recette/ });
  console.log("1. BOUTON              :", (await bouton.count()) ? "« Nouvelle recette » dans Mes plats" : "*** ABSENT ***");
  await bouton.first().click();
  await page.waitForTimeout(500);

  // ── 2. Nom, parts, deux ingredients ──────────────────────────────
  await modale().getByPlaceholder(/Quiche lorraine/).fill("Quiche lorraine");
  await modale().getByPlaceholder("Ex : 6").fill("6");
  await ajouterIngredient("lardons", 200);
  await modale().getByRole("button", { name: "Ajouter un ingrédient", exact: true }).click();
  await page.waitForTimeout(400);
  await ajouterIngredient("lait", 100);

  const texteEditeur = await modale().innerText();
  const lignes = (texteEditeur.match(/\((200|100) g\)/g) || []).length;
  console.log("2. INGRÉDIENTS         :", lignes === 2 ? "200 g et 100 g listés" : `*** ${lignes} LIGNE(S) SUR 2 ***`);
  // Le tableau des parts : 1, 2, 3 parts et la recette entiere, chacune
  // avec ses calories et ses macros.
  const paliers = ["1 part", "2 parts", "3 parts", "Recette entière (6 parts)"];
  const manquants = paliers.filter(
    (p) => !new RegExp(p.replace(/[()]/g, "\\$&") + "\\s*\\d+ kcal · P\\d+ G\\d+ L\\d+").test(texteEditeur)
  );
  console.log(
    "   tableau des parts   :",
    manquants.length ? `*** MANQUE : ${manquants.join(", ")} ***` : "1, 2, 3 parts et recette entière, kcal et macros"
  );

  await modale().getByRole("button", { name: "Enregistrer la recette", exact: true }).click();
  await page.waitForTimeout(600);

  let presets = await lire("cn_meal_presets");
  const r = presets[0];
  const ok =
    presets.length === 1 && r.recette === true && r.portions === 6 && r.items.length === 2 &&
    r.items.map((i) => i.grams).join("+") === "200+100";
  console.log(
    "3. ENREGISTRÉE         :",
    ok ? "1 recette, 6 parts, 200 g + 100 g" : `*** STOCKAGE INATTENDU : ${JSON.stringify(presets).slice(0, 160)} ***`
  );
  const totalRecette = r ? r.items.reduce((s, i) => s + i.calories, 0) : 0;
  const liste = await page.locator("body").innerText();
  console.log("   dans la liste       :", /Quiche lorraine/.test(liste) && /6 parts/.test(liste) ? "oui, avec « 6 parts »" : "*** ABSENTE ***");

  // ── 3bis. Modifier : 8 parts au lieu de 6 ────────────────────────
  await page.getByRole("button", { name: "Modifier la recette" }).first().click();
  await page.waitForTimeout(400);
  await modale().getByPlaceholder("Ex : 6").fill("8");
  await modale().getByRole("button", { name: "Enregistrer la recette", exact: true }).click();
  await page.waitForTimeout(500);
  presets = await lire("cn_meal_presets");
  console.log(
    "   modifiée            :",
    presets.length === 1 && presets[0].id === r.id && presets[0].portions === 8
      ? "même recette, passée à 8 parts"
      : `*** ${presets.length} RECETTE(S), parts ${presets[0]?.portions} ***`
  );

  // ── 4. Journal : en manger UNE part ──────────────────────────────
  await page.getByRole("button", { name: "Journal", exact: true }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "+ ajouter", exact: true }).nth(1).click();
  await page.waitForTimeout(500);
  await modale().getByRole("button", { name: /Quiche lorraine/ }).first().click();
  await page.waitForTimeout(500);
  const editeur = await modale().innerText();
  console.log("4. DANS LE JOURNAL     :", /Recette pour 8 portions/.test(editeur) ? "« Recette pour 8 portions »" : "*** RECETTE NON PROPOSÉE ***");
  console.log(
    "   tableau des parts   :",
    /Recette entière \(8 parts\)/.test(editeur) && /3 parts/.test(editeur) ? "1, 2, 3 parts et recette entière (8)" : "*** TABLEAU ABSENT ***"
  );
  await modale().getByRole("button", { name: "Ajouter", exact: true }).last().click();
  await page.waitForTimeout(600);

  let journal = (await lire("coach_log_entries")).filter((e) => e.date === AUJ);
  let kcal = journal.reduce((s, e) => s + e.calories, 0);
  const attendu = totalRecette / 8;
  console.log(
    "   une part ajoutée    :",
    journal.length === 2 && Math.abs(kcal - attendu) <= 2
      ? `2 lignes, ${Math.round(kcal)} kcal (recette ${Math.round(totalRecette)} kcal ÷ 8)`
      : `*** ${journal.length} LIGNE(S), ${Math.round(kcal)} kcal AU LIEU DE ~${Math.round(attendu)} ***`
  );

  // ── 4bis. Toucher « 2 parts » dans le tableau ────────────────────
  await page.getByRole("button", { name: "+ ajouter", exact: true }).nth(1).click();
  await page.waitForTimeout(500);
  await modale().getByRole("button", { name: /Quiche lorraine/ }).first().click();
  await page.waitForTimeout(500);
  await modale().getByRole("button", { name: /^2 parts/ }).click();
  await page.waitForTimeout(300);
  const saisie = await modale().locator('input[type="number"]').first().inputValue();
  await modale().getByRole("button", { name: "Ajouter", exact: true }).last().click();
  await page.waitForTimeout(600);
  journal = (await lire("coach_log_entries")).filter((e) => e.date === AUJ);
  // Difference de total : l'ordre des lignes dans le journal n'importe pas.
  const ajout = journal.reduce((s, e) => s + e.calories, 0) - kcal;
  console.log(
    "   2 parts choisies    :",
    saisie === "2" && journal.length === 4 && Math.abs(ajout - 2 * attendu) <= 3
      ? `champ à 2, ${Math.round(ajout)} kcal ajoutées (2 × ${Math.round(attendu)})`
      : `*** champ « ${saisie} », ${journal.length} LIGNE(S), ${Math.round(ajout)} kcal AU LIEU DE ~${Math.round(2 * attendu)} ***`
  );

  // ── 5. Survit au redemarrage, puis se supprime ───────────────────
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Repas", exact: true }).first().click();
  await page.waitForTimeout(500);
  const apres = await page.locator("body").innerText();
  console.log("5. APRÈS REDÉMARRAGE   :", /Quiche lorraine/.test(apres) ? "la recette est toujours là" : "*** RECETTE PERDUE ***");

  await page.getByRole("button", { name: "Supprimer la recette" }).first().click();
  await page.waitForTimeout(500);
  presets = await lire("cn_meal_presets");
  console.log("   supprimée           :", presets.length === 0 ? "oui" : `*** ${presets.length} RESTANTE(S) ***`);
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
