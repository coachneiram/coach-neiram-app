/**
 * Fumee : le tour complet sauvegarde -> telephone vierge -> restauration.
 *
 * C'est le parcours le plus a risque de l'application, decrit page 9 du
 * guide client, et il n'avait jamais ete verifie de bout en bout. Le
 * stockage du navigateur est la SEULE copie des donnees : s'il se perd
 * et que la restauration ne rend pas tout, le suivi est perdu pour de
 * bon. C'est exactement ce qui est arrive a une cliente.
 *
 * Le script verifie que l'export emporte aussi les cles « cn_ » — repas
 * types, favoris code-barres, plan de semaine, maxis de force — qui en
 * etaient absentes avant la PR #10.
 *
 *   cd app && npm run build && cd ..
 *   npm i --no-save playwright
 *   node scripts-migration/fumee-sauvegarde-restauration.mjs
 */

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const T = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json" };
const srv = createServer((req,res)=>{const c=join(DIST, req.url==="/"?"index.html":req.url.split("?")[0]);
  if(!existsSync(c))return res.writeHead(404).end();
  res.writeHead(200,{"Content-Type":T[extname(c)]||"application/octet-stream"}); res.end(readFileSync(c));});
await new Promise(r=>srv.listen(4608,r));
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await nav.newPage({ acceptDownloads: true });
const err=[]; page.on("pageerror",e=>err.push(e.message));

// Un client avec TOUT : profil, journal, seances, repas types, favoris,
// exercices perso, plan de semaine, maxis de force.
await page.addInitScript(() => {
  localStorage.setItem("coach_profile", JSON.stringify({ firstName:"Sabine", name:"Sabine Marchand", sex:"femme", age:42, heightCm:165, startWeightKg:72, activityLevel:"actif", goal:"perte", sessionsPerWeek:6, targetWeightKg:66, trainingMode:"app", coachingMode:"presentiel", dietType:"aucun", allergies:[] }));
  localStorage.setItem("coach_log_entries", JSON.stringify([{ id:"l1", date:"2026-09-05", mealType:"dejeuner", name:"Poulet riz", calories:620, protein:48, carbs:70, fat:12 }]));
  localStorage.setItem("coach_body_logs", JSON.stringify([{ id:"b1", date:"2026-09-05", weightKg:71.1 }]));
  localStorage.setItem("coach_sessions", JSON.stringify([{ id:"s1", date:"2026-09-04", durationMin:62, rpe:8, exercises:[] }]));
  // Les donnees « cn_ » : celles que l'export oubliait avant la PR #10.
  localStorage.setItem("cn_meal_presets", JSON.stringify([{ id:"r1", name:"Petit-déj protéiné", portions:1, items:[{ name:"Flocons", calories:300, protein:10, carbs:52, fat:6 }] }]));
  localStorage.setItem("cn_food_favorites", JSON.stringify(["3017620425035"]));
  localStorage.setItem("cn_weekly_plan", JSON.stringify({ mon:"r1" }));
  localStorage.setItem("cn_pl_1rm", JSON.stringify({ squat:105 }));
});
await page.goto("http://localhost:4608/", { waitUntil: "networkidle" });
await page.waitForTimeout(500);

const avant = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith("coach_")||k.startsWith("cn_")).map(k=>[k, localStorage.getItem(k)])));
console.log("AVANT :", Object.keys(avant).length, "cles");

await page.getByRole("button", { name: /Mon profil/ }).first().click();
await page.waitForTimeout(400);
const dl = page.waitForEvent("download", { timeout: 8000 }).catch(()=>null);
await page.getByRole("button", { name: /Exporter mes données/ }).click();
const fichier = await dl;
console.log("EXPORT :", fichier ? fichier.suggestedFilename() : "*** AUCUN FICHIER ***");
if (!fichier) { await nav.close(); srv.close(); process.exit(1); }
const sauvegarde = JSON.parse(readFileSync(await fichier.path(), "utf8"));
const clesExportees = Object.keys(sauvegarde.data || {});
console.log("  contient :", clesExportees.length, "cles");
const manquantes = Object.keys(avant).filter(k => !clesExportees.includes(k));
console.log("  MANQUANTES :", manquantes.length ? manquantes.join(", ") : "aucune");

// Nouveau telephone : tout est vide.
const page2 = await nav.newPage();
page2.on("pageerror", e => err.push(e.message));
await page2.goto("http://localhost:4608/", { waitUntil: "networkidle" });
await page2.evaluate(() => localStorage.clear());
await page2.reload({ waitUntil: "networkidle" });
await page2.waitForTimeout(400);
console.log("NOUVEAU TEL :", (await page2.evaluate(() => Object.keys(localStorage).length)), "cles — ecran :", (await page2.locator("body").innerText()).split("\n").find(Boolean));

// Sur un telephone vierge, l'app demande d'abord de creer un profil :
// il faut passer l'onboarding avant de pouvoir atteindre les reglages.
page2.on("dialog", (d) => d.accept());
const boutons = (await page2.locator("button").allInnerTexts()).filter(Boolean);
console.log("ONBOARDING — boutons :", JSON.stringify(boutons.slice(0, 8)));
console.log("  reprise de sauvegarde proposee ?", boutons.some((b) => /sauvegarde|restaur/i.test(b)) ? "OUI" : "NON");
// Age, taille et poids sont obligatoires pour debloquer le bouton.
const champs = page2.locator('input[type="number"]');
for (const [i, v] of [[0, "42"], [1, "165"], [2, "72"]]) {
  if (await champs.nth(i).count()) await champs.nth(i).fill(v);
}
await page2.waitForTimeout(300);
await page2.getByRole("button", { name: "Commencer le suivi" }).click();
await page2.waitForTimeout(600);
await page2.getByRole("button", { name: /Mon profil/ }).first().click();
await page2.waitForTimeout(400);
await page2.locator('input[type="file"][accept*="json"]').setInputFiles(await fichier.path());
await page2.waitForTimeout(2000);

const apres = await page2.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith("coach_")||k.startsWith("cn_")).map(k=>[k, localStorage.getItem(k)])));
console.log("APRES RESTAURATION :", Object.keys(apres).length, "cles");
const perdues = Object.keys(avant).filter((k) => apres[k] !== avant[k]);
console.log("  PERDUES OU ALTEREES :", perdues.length ? perdues.join(", ") : "aucune");
console.log("  repas type :", JSON.parse(apres.cn_meal_presets || "[]")[0]?.name || "*** PERDU ***");
console.log("  favori code-barres :", JSON.parse(apres.cn_food_favorites || "[]")[0] || "*** PERDU ***");
console.log("  maxi squat :", JSON.parse(apres.cn_pl_1rm || "{}").squat ?? "*** PERDU ***");
await page2.waitForTimeout(1200);
console.log("ECRAN APRES :", (await page2.locator("body").innerText()).split("\n").filter(Boolean).slice(0,3).join(" | "));
console.log("ERREURS", err.length ? JSON.stringify(err) : "aucune");
await nav.close(); srv.close();
