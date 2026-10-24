/**
 * Fumée : onglet Séances pour débutant (22 octobre 2026).
 *
 *   1. un nouveau client voit « Ta séance du jour » EN TÊTE, avant les
 *      trophées, avec « Créer ma première séance » ;
 *   2. il programme sa séance type : recherche dans la bibliothèque,
 *      exercices ajoutés, séries modifiées ;
 *   3. la carte propose cette séance, avec ses exercices ;
 *   4. « Démarrer » ouvre la séance au nom de la séance type, les séries
 *      du programme prêtes, le type d'exercice replié dans « Options », la
 *      date sous les exercices ;
 *   5. enregistrée, la carte passe à « Séance faite aujourd'hui » ;
 *   6. la séance type se supprime (après confirmation) ;
 *   7. sur un téléphone neuf, « Prendre le programme débutant du coach »
 *      ajoute Full body A et B et propose A, prête à démarrer.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-debutant.mjs
 */

import { chromium } from "playwright";
import { appareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(4716, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
page.on("dialog", (d) => d.accept());
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");
const corps = async () => net(await page.locator("body").innerText());

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Léa", name: "Léa", sex: "femme", age: 30, heightCm: 165, startWeightKg: 62,
    activityLevel: "modere", goal: "perte", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
});

const haut = (texte) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll("div, span, p, h2, h3")].find((x) => x.childElementCount === 0 && x.textContent.trim() === t);
    return el ? el.getBoundingClientRect().top + window.scrollY : -1;
  }, texte);

try {
  await page.goto("http://localhost:4716/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^(Séances|Entraînements)$/ }).last().click();
  await page.waitForTimeout(600);

  // 1. Carte en tête.
  const yCarte = await haut("Ta séance du jour");
  const yTrophees = await haut("Mes trophées");
  const creer = page.getByRole("button", { name: "Créer ma propre séance" });
  console.log(
    "1. SÉANCE DU JOUR       :",
    yCarte >= 0 && yTrophees > yCarte && (await creer.count()) === 1
      ? "en tête, avant les trophées, « Créer ma propre séance »"
      : `*** carte ${yCarte}, trophées ${yTrophees}, bouton ${await creer.count()} ***`
  );

  // 2. Programmer la séance type.
  await creer.click();
  await page.waitForTimeout(300);
  await page.getByPlaceholder("Haut du corps, Circuit cardio...").fill("Full body A");
  const recherche = page.getByRole("textbox", { name: "Nom de ton exercice" });
  await page.getByRole("button", { name: "Ajouter un exercice" }).last().click();
  await page.waitForTimeout(300);
  const avant = await page.locator(".modal-panel").last().locator("button").count();
  await recherche.fill("presse cuisses");
  await page.waitForTimeout(200);
  const apres = await page.locator(".modal-panel").last().locator("button").count();
  await page.getByRole("button", { name: /^Presse à cuisses/ }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Ajouter un exercice" }).last().click();
  await page.waitForTimeout(300);
  await recherche.fill("dev poitrine machine");
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /^Développé poitrine machine/ }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole("spinbutton", { name: "Séries" }).first().fill("4");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.waitForTimeout(500);
  const routines = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_routines") || "[]"));
  const r = routines[0] || {};
  console.log(
    "2. PROGRAMME            :",
    apres < avant / 3 && r.programme === true && (r.exercises || []).map((e) => e.name).join(",") === "Presse à cuisses,Développé poitrine machine" && String(r.exercises[0].sets) === "4"
      ? `recherche (${avant} → ${apres} boutons), 2 exercices, 4 séries de presse`
      : `*** ${avant} → ${apres}, ${JSON.stringify(r)} ***`
  );

  // 3. La carte propose la séance.
  const t3 = await corps();
  console.log(
    "3. CARTE                :",
    /À faire aujourd'hui Full body A Presse à cuisses · Développé poitrine machine Jamais faite/i.test(t3)
      ? "« Full body A », ses exercices, jamais faite"
      : `*** ${t3.slice(0, 260)} ***`
  );

  // 4. Démarrer.
  await page.getByRole("button", { name: "Démarrer" }).click();
  await page.waitForTimeout(500);
  const panneau = page.locator(".modal-panel").last();
  const titre = net(await panneau.locator("h3").first().innerText());
  const lignes = await panneau.locator('[data-exercice="0"] [aria-label="Série faite"]').count();
  const modesVisibles = await panneau.locator("select").filter({ has: page.locator("option[value='warmup']") }).count();
  const options = await panneau.getByRole("button", { name: "Options", exact: true }).count();
  const ordre = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".modal-panel")].pop();
    const ex = p.querySelector('[data-exercice="0"]').getBoundingClientRect().top;
    const date = p.querySelector('input[type="date"]').getBoundingClientRect().top;
    return date > ex;
  });
  console.log(
    "4. SÉANCE OUVERTE       :",
    /full body a/i.test(titre) && lignes === 4 && modesVisibles === 0 && options === 2 && ordre
      ? "titre de la séance type, 4 séries prêtes, type replié dans « Options », date sous les exercices"
      : `*** titre « ${titre} », ${lignes} séries, ${modesVisibles} menu(s) de type, ${options} « Options », date après : ${ordre} ***`
  );

  // 5. Enregistrer.
  await panneau.locator('[data-exercice="0"] input[aria-label="Charge (kg)"]').first().fill("60");
  await page.getByRole("button", { name: /^Enregistrer la séance$/ }).click();
  await page.waitForTimeout(600);
  const t5 = await corps();
  console.log(
    "5. APRÈS LA SÉANCE      :",
    /Séance faite aujourd'hui ✓/i.test(t5) ? "« Séance faite aujourd'hui »" : `*** ${t5.slice(0, 200)} ***`
  );

  // 6. Supprimer la séance type.
  await page.evaluate(() => {
    const titre = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && d.textContent.trim() === "Full body A" && d.style.fontSize === "15px");
    const carte = titre && titre.parentElement;
    const crayon = carte && carte.querySelector("button");
    if (crayon) crayon.click();
  });
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Supprimer cette séance type" }).click();
  await page.waitForTimeout(500);
  const restantes = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_routines") || "[]").length);
  const seances = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_sessions") || "[]").length);
  console.log(
    "6. SUPPRESSION          :",
    restantes === 0 && seances === 1 ? "séance type supprimée, la séance faite reste" : `*** ${restantes} séance(s) type, ${seances} séance(s) ***`
  );

  // 7. Programme débutant du coach, sur un téléphone neuf.
  const ctx2 = await nav.newContext(appareil());
  await ctx2.addInitScript(sansAides);
  const p2 = await ctx2.newPage();
  p2.on("pageerror", (e) => erreurs.push(e.message));
  await p2.addInitScript(() => {
    if (localStorage.getItem("coach_profile")) return;
    localStorage.setItem("coach_profile", JSON.stringify({
      firstName: "Tom", name: "Tom", sex: "homme", age: 35, heightCm: 178, startWeightKg: 80,
      activityLevel: "modere", goal: "perte", sessionsPerWeek: 2,
      trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
    }));
  });
  await p2.goto("http://localhost:4716/", { waitUntil: "domcontentloaded" });
  await p2.waitForTimeout(900);
  await p2.getByRole("button", { name: /^(Séances|Entraînements)$/ }).last().click();
  await p2.waitForTimeout(500);
  await p2.getByRole("button", { name: "Prendre le programme débutant du coach" }).click();
  await p2.waitForTimeout(500);
  const t7 = net(await p2.locator("body").innerText());
  const r7 = await p2.evaluate(() => JSON.parse(localStorage.getItem("coach_routines") || "[]"));
  await p2.getByRole("button", { name: "Démarrer" }).click();
  await p2.waitForTimeout(500);
  const exos = await p2.locator(".modal-panel [data-exercice]").count();
  console.log(
    "7. PROGRAMME DU COACH   :",
    r7.map((r) => r.name).join(",") === "Full body A,Full body B" &&
      /À faire aujourd'hui Full body A Presse à cuisses · Développé poitrine machine · Tirage vertical poitrine · \+3/i.test(t7) &&
      exos === 6
      ? "Full body A et B ajoutées, A proposée, 6 exercices prêts au démarrage"
      : `*** ${r7.map((r) => r.name)} · ${exos} exercices · ${t7.slice(0, 220)} ***`
  );
  await ctx2.close();
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
