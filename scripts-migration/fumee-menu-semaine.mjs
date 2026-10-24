/**
 * Fumée : « Menu de la semaine » (Repas → Menu), repris de l'app Neiram le
 * 24 octobre 2026.
 *
 *   1. le menu annonce les objectifs du coach (computeTargets, même calcul
 *      qu'ici en Node) et se crée : 7 jours, 4 repas, gardé dans
 *      cn_plan_repas, aucune recette aux crustacés pour un profil casher ;
 *   2. « Changer » le dîner : une autre recette, le reste du jour tient ;
 *   3. fiche recette : ingrédients avec quantités ;
 *   4. courses : liste additionnée, « Ajouter à ma liste » range les
 *      articles (origine « menu ») et l'onglet Courses les montre ;
 *   5. « Nouveau menu » : un autre tirage ;
 *   6. profil incomplet : pas de menu sur une cible inventée ;
 *   7. aucun envoi au coach, pas de défilement horizontal.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-menu-semaine.mjs
 */

import { chromium } from "playwright";
import { appareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeTargets } from "../app/src/lib/nutrition.js";
import { RECETTES_COACH } from "../app/src/lib/recettes-coach-catalogue.js";

const PORT = 4726;
const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const serveur = createServer((req, res) => {
  const c = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(PORT, r));

const PROFIL = {
  name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 84,
  activityLevel: "modere", goal: "perte", sessionsPerWeek: 3,
  trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: [], contraintesAlim: ["casher"]
};
const attendues = computeTargets(PROFIL, PROFIL.startWeightKg);
const crustaces = new Set(RECETTES_COACH.filter((r) => (r.contient || []).includes("crustaces")).map((r) => r.id));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ");

const recus = [];
await page.route("**/coach-sync", async (route) => {
  try {
    recus.push(JSON.parse(route.request().postData() || "{}"));
  } catch (e) {
    recus.push({});
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
});

await page.addInitScript((profil) => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("cn_synchro_locale", "1"); // /coach-sync est intercepte ici
  localStorage.setItem("coach_profile", JSON.stringify(profil));
  localStorage.setItem("coach_shopping_custom", JSON.stringify([{ id: "m1", name: "Café moulu" }]));
}, PROFIL);

const panneau = () => page.locator(".modal-panel").last();
const fermer = () => panneau().getByRole("button", { name: "Fermer" }).click();
const lirePlan = () => page.evaluate(() => JSON.parse(localStorage.getItem("cn_plan_repas") || "null"));
const ouvrirMenu = async () => {
  await page.getByRole("button", { name: "Repas", exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.waitForTimeout(400);
};

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const envoisAvant = recus.length;
  await ouvrirMenu();

  // 1. Creation sur les objectifs du coach.
  const intro = net(await page.locator("[data-menu-semaine]").innerText());
  const kcalAffichees = attendues.calories.toLocaleString("fr-FR").replace(/[\u00a0\u202f]/g, " ");
  await page.getByRole("button", { name: "Créer mon menu" }).click();
  await page.waitForTimeout(500);
  const plan = await lirePlan();
  const jours = await page.locator("[data-jour-menu]").count();
  const repas = await page.locator("[data-repas-menu]").count();
  const servis = plan ? plan.jours.flatMap((j) => j.repas.map((x) => x.recetteId).filter(Boolean)) : [];
  const casherOk = servis.every((id) => !crustaces.has(id));
  console.log(
    "1. CRÉATION             :",
    intro.includes(`${kcalAffichees} kcal`) && plan && plan.cibles.calories === attendues.calories && plan.cibles.protein === attendues.protein && jours === 7 && repas === 4 && servis.length > 0 && casherOk
      ? `menu sur ${attendues.calories} kcal / ${attendues.protein} g (objectifs du coach), 7 jours × 4 repas, ${servis.length} repas servis, aucun crustacé (casher)`
      : `*** intro « ${intro.slice(0, 140)} », cibles ${JSON.stringify(plan && plan.cibles)} vs ${attendues.calories}/${attendues.protein}, ${jours} jours, ${repas} repas, casher ${casherOk} ***`
  );

  // 2. Changer le diner du jour affiche.
  const k = Math.max(0, plan.jours.findIndex((j) => j.date === new Date().toISOString().slice(0, 10)));
  const avant = plan.jours[k].repas.find((x) => x.typeRepas === "diner");
  const bouton = page.locator('[data-changer-repas="diner"]');
  let changeOk = false;
  let detail = "";
  if (avant && avant.recetteId && (await bouton.count())) {
    await bouton.click();
    await page.waitForTimeout(400);
    const apres = (await lirePlan()).jours[k].repas.find((x) => x.typeRepas === "diner");
    changeOk = apres.recetteId && apres.recetteId !== avant.recetteId && !crustaces.has(apres.recetteId);
    detail = `« ${avant.nom} » → « ${apres.nom} »`;
  } else detail = "dîner libre ou en restes";
  console.log("2. CHANGER              :", changeOk ? detail : `*** ${detail} ***`);

  // 3. Fiche recette.
  await page.locator("[data-voir-recette]").first().click();
  await page.waitForTimeout(300);
  const fiche = net(await panneau().innerText());
  const ficheOk = /Ingrédients/.test(fiche) && /À cuisiner|Déjà cuisiné/.test(fiche) && /\d+ ?(g|ml|kg)/.test(fiche);
  await fermer();
  await page.waitForTimeout(200);
  console.log("3. FICHE RECETTE        :", ficheOk ? "ingrédients et quantités à cuisiner affichés" : `*** « ${fiche.slice(0, 160)} » ***`);

  // 4. Courses.
  await page.getByRole("button", { name: "🛒 Mes courses" }).click();
  await page.waitForTimeout(300);
  const articles = await panneau().locator("[data-article-menu]").count();
  await panneau().getByRole("button", { name: "Ajouter à ma liste" }).click();
  await page.waitForTimeout(300);
  const msg = net(await panneau().locator("[data-message-courses]").innerText().catch(() => ""));
  const stock = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_shopping_custom") || "[]"));
  const duMenu = stock.filter((x) => x.origine === "menu");
  // Une seconde fois : remplace, n'empile pas.
  await panneau().getByRole("button", { name: "Ajouter à ma liste" }).click();
  await page.waitForTimeout(200);
  const stock2 = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_shopping_custom") || "[]"));
  await fermer();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Courses", exact: true }).click();
  await page.waitForTimeout(600);
  const ecranCourses = net(await page.locator("body").innerText());
  const premier = duMenu[0] && duMenu[0].name;
  console.log(
    "4. COURSES              :",
    articles > 5 && duMenu.length === articles && stock.some((x) => x.name === "Café moulu") && stock2.length === stock.length && premier && ecranCourses.includes(premier) && /ajouté/.test(msg)
      ? `${articles} articles additionnés, rangés dans Courses (origine « menu », « Café moulu » gardé, pas de doublon au 2e ajout)`
      : `*** ${articles} articles, ${duMenu.length} du menu, ${stock.length}/${stock2.length} en stock, « ${premier} » à l'écran ${premier && ecranCourses.includes(premier)}, « ${msg} » ***`
  );

  // 5. Nouveau menu.
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.waitForTimeout(300);
  const graineAvant = (await lirePlan()).graine;
  await page.waitForTimeout(20);
  await page.getByRole("button", { name: "Nouveau menu" }).click();
  await page.waitForTimeout(300);
  const nouveau = await lirePlan();
  console.log(
    "5. NOUVEAU MENU         :",
    nouveau && nouveau.graine !== graineAvant && nouveau.jours.length === 7 ? "nouveau tirage, 7 jours" : `*** graine ${graineAvant} → ${nouveau && nouveau.graine} ***`
  );

  // 7 (avant le rechargement). Aucun envoi, pas de defilement horizontal.
  const largeur = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, ecran: window.innerWidth }));
  const envois = recus.slice(envoisAvant).filter((e) => /menu|plan_repas|repas/i.test(JSON.stringify(e)));
  console.log(
    "7. SANS ENVOI, LARGEUR  :",
    !envois.length && largeur.page <= largeur.ecran ? `rien envoyé au coach, ${largeur.page} px sur ${largeur.ecran}` : `*** ${envois.length} envoi(s), ${largeur.page} px sur ${largeur.ecran} ***`
  );

  // 6. Profil incomplet.
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("coach_profile"));
    delete p.startWeightKg;
    delete p.heightCm;
    localStorage.setItem("coach_profile", JSON.stringify(p));
    localStorage.removeItem("cn_plan_repas");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await ouvrirMenu();
  const sans = await page.locator("[data-menu-sans-objectifs]").count();
  const boutonCreer = await page.getByRole("button", { name: "Créer mon menu" }).count();
  console.log("6. PROFIL INCOMPLET     :", sans === 1 && boutonCreer === 0 ? "pas de menu sans objectifs, le client est renvoyé au profil" : `*** message ${sans}, bouton ${boutonCreer} ***`);
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
