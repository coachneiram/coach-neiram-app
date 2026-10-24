/**
 * Fumée : nutrition reprise de l'app Neiram (24 octobre 2026).
 *
 *   1. Nutrition → « Repère d'après tes données » : affiché comme un repère,
 *      avec la phrase qui dit que les objectifs du coach comptent ;
 *   2. questionnaire : rythme 1 %/semaine et santé → le repère change,
 *      les objectifs du coach (targets) et coach_profile ne bougent pas ;
 *      les réponses vont dans cn_objectifs_sur_mesure ;
 *   3. catégorie de poids (-74 kg, IPF, pesée dans 7 semaines) : plan de
 *      perte, sans protocole de déshydratation ;
 *   4. compléments : créatine (force), dose, précautions, source,
 *      « À éviter » ;
 *   5. après rechargement : objectifs du coach identiques, réponses gardées.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-nutrition-perso.mjs
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
await new Promise((r) => serveur.listen(4723, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");

const PROFIL = {
  firstName: "Thomas", name: "Thomas", sex: "homme", age: 28, heightCm: 178, startWeightKg: 79,
  activityLevel: "actif", goal: "perte", sessionsPerWeek: 4,
  trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
};

await page.addInitScript((profil) => {
  if (localStorage.getItem("coach_profile")) return;
  const jour = (k) => {
    const d = new Date();
    d.setDate(d.getDate() - k);
    return d.toISOString().slice(0, 10);
  };
  localStorage.setItem("coach_profile", JSON.stringify(profil));
  localStorage.setItem("coach_body_logs", JSON.stringify([{ id: "b1", date: jour(1), weightKg: 79 }]));
  localStorage.setItem("coach_sessions", JSON.stringify([3, 6, 10].map((k) => ({
    id: "s" + k, date: jour(k), routineName: "Force", rpe: 8,
    exercises: [{ id: "e" + k, name: "Squat", mode: "powerlifting", sets: [{ reps: 5, weight: 140, done: true }] }]
  }))));
}, PROFIL);

const ouvrirNutrition = async () => {
  await page.getByRole("button", { name: /^Nutrition$/ }).last().click();
  await page.waitForTimeout(600);
};
const objectifsCoach = async () => net(await page.locator("[data-objectifs-coach]").innerText().catch(() => ""));
const chiffres = (t) => (t.match(/\d+/g) || []).join(",");
const enDate = (k) => {
  const d = new Date();
  d.setDate(d.getDate() + k);
  return d.toISOString().slice(0, 10);
};

try {
  await page.goto("http://localhost:4723/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await ouvrirNutrition();

  // 1. Le repère s'affiche comme un repère.
  const avant = await objectifsCoach();
  const carte = page.locator("[data-objectifs-sur-mesure]");
  const t1 = net(await carte.innerText().catch(() => ""));
  const repere0 = Number(await carte.locator("[data-repere-calories]").getAttribute("data-repere-calories").catch(() => 0));
  const kcalCoach = Number((avant.match(/(\d{3,5})\s*kcal/) || [])[1]);
  console.log(
    "1. REPÈRE AFFICHÉ       :",
    /Repère d'après tes données/i.test(t1) && /objectifs fixés par ton coach restent ceux qui comptent/.test(t1) && kcalCoach > 0 && Math.abs(repere0 - kcalCoach) <= 10
      ? `repère ${repere0} kcal = objectifs du coach ${kcalCoach} kcal sans réponse`
      : `*** « ${t1.slice(0, 160)} », repère ${repere0}, coach ${kcalCoach} ***`
  );

  // 2. Questionnaire : rythme 1 %/semaine et santé.
  await carte.getByRole("button", { name: "Mes réponses" }).click();
  await page.waitForTimeout(300);
  await carte.locator("[data-rythme]").selectOption("1");
  await carte.locator('[data-sante="hypertension"]').check();
  await page.waitForTimeout(300);
  const repere1 = Number(await carte.locator("[data-repere-calories]").getAttribute("data-repere-calories"));
  const apres = await objectifsCoach();
  const stock = await page.evaluate(() => ({
    profil: localStorage.getItem("coach_profile"),
    reponses: JSON.parse(localStorage.getItem("cn_objectifs_sur_mesure") || "{}")
  }));
  const profilIntact = JSON.stringify(JSON.parse(stock.profil)) === JSON.stringify(PROFIL);
  console.log(
    "2. OBJECTIFS DU COACH   :",
    repere1 && repere1 !== repere0 && chiffres(apres) === chiffres(avant) && profilIntact && stock.reponses.rythmePct === 1 && stock.reponses.contraintesSante?.includes("hypertension")
      ? `repère ${repere0} → ${repere1} kcal, objectifs du coach inchangés (${kcalCoach} kcal), profil intact, réponses dans cn_objectifs_sur_mesure`
      : `*** repère ${repere0} → ${repere1}, coach « ${avant} » → « ${apres} », profil intact ${profilIntact}, réponses ${JSON.stringify(stock.reponses)} ***`
  );

  // 3. Catégorie de poids.
  const bloc = carte.locator("[data-categorie-poids]");
  await bloc.locator("[data-categorie-case]").check();
  await page.waitForTimeout(200);
  await bloc.locator("[data-federation]").selectOption("ipf");
  await page.waitForTimeout(200);
  await bloc.locator("[data-limite-kg]").selectOption("74");
  await bloc.locator("[data-date-pesee]").fill(enDate(49));
  await page.waitForTimeout(400);
  const plan = bloc.locator("[data-plan-categorie]");
  const statut = await plan.getAttribute("data-plan-categorie").catch(() => null);
  const t3 = net(await plan.innerText().catch(() => ""));
  const apresCat = await objectifsCoach();
  console.log(
    "3. CATÉGORIE DE POIDS   :",
    statut === "perte" && /Jamais de sauna/.test(t3) && /sans toucher à l'eau/.test(t3) && /Après la pesée/.test(t3) && chiffres(apresCat) === chiffres(avant)
      ? `plan « perte » pour -74 kg, aucun protocole de déshydratation, objectifs du coach inchangés`
      : `*** statut ${statut}, « ${t3.slice(0, 200)} », coach « ${apresCat} » ***`
  );

  // 4. Compléments.
  const comp = page.locator("[data-complements]");
  const nb = Number(await comp.getAttribute("data-complements").catch(() => 0));
  const creatine = comp.locator('[data-complement="creatine"]');
  await creatine.locator("button").click();
  await page.waitForTimeout(200);
  const t4 = net(await creatine.innerText().catch(() => ""));
  await comp.locator("[data-a-eviter] summary").click();
  await page.waitForTimeout(200);
  const evite = net(await comp.locator("[data-a-eviter]").innerText().catch(() => ""));
  const intro = net(await comp.innerText().catch(() => ""));
  console.log(
    "4. COMPLÉMENTS          :",
    nb > 0 && /Preuves solides/.test(t4) && /Dose : 3 à 5 g/.test(t4) && /Précautions :/.test(t4) && /Source : ISSN 2017/.test(t4) && /Ashwagandha/.test(evite) && /force athlétique/.test(intro)
      ? `${nb} compléments pour la force athlétique, créatine avec dose, précautions et source, liste « à éviter »`
      : `*** ${nb} compléments, « ${t4.slice(0, 200)} », à éviter « ${evite.slice(0, 80)} » ***`
  );

  // 5. Rechargement.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await ouvrirNutrition();
  const recharge = await objectifsCoach();
  const repere2 = Number(await page.locator("[data-repere-calories]").getAttribute("data-repere-calories").catch(() => 0));
  const profilFin = await page.evaluate(() => localStorage.getItem("coach_profile"));
  console.log(
    "5. APRÈS RECHARGEMENT   :",
    chiffres(recharge) === chiffres(avant) && repere2 > 0 && repere2 < kcalCoach && JSON.stringify(JSON.parse(profilFin)) === JSON.stringify(PROFIL)
      ? `objectifs du coach toujours ${kcalCoach} kcal, repère gardé (${repere2} kcal)`
      : `*** coach « ${recharge} », repère ${repere2}, profil ${profilFin} ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
