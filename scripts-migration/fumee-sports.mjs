/**
 * Fumée : autres sports, programmes guidés et « Mon année » (24 octobre 2026).
 *
 *   1. client en ligne : « Activité » → Course à pied, 40 min, 7 km, RPE 6 ;
 *      la séance part au Journal du coach (« activite »), l'historique
 *      l'affiche, la semaine active compte ses minutes ;
 *   2. « Mon année » : un jour passé coché devient une séance sans détail,
 *      envoyée au coach (pointage) ;
 *   3. programme guidé « De 0 à 5 km » : la séance notée fait avancer le
 *      programme ;
 *   4. « Mes sports » apparaît avec la course.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-sports.mjs
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
await new Promise((r) => serveur.listen(4724, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");

const recus = [];
await page.route("**/coach-sync", async (route) => {
  try {
    recus.push(JSON.parse(route.request().postData() || "{}"));
  } catch (e) {
    recus.push({});
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
});

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("cn_synchro_locale", "1"); // /coach-sync est intercepte ici
  localStorage.setItem("coach_profile", JSON.stringify({
    name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 80,
    activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_routines", JSON.stringify([{ id: "r1", name: "Bas du corps", color: "#F5A040" }]));
});

const panneau = () => page.locator(".modal-panel").last();

try {
  await page.goto("http://localhost:4724/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /^(Séances|Entraînements)$/ }).last().click();
  await page.waitForTimeout(600);

  // 1. Activite.
  await page.locator("[data-semaine-active]").getByRole("button", { name: "Activité" }).click();
  await page.waitForTimeout(300);
  await panneau().getByPlaceholder("Course, padel, yoga, randonnée…").fill("course");
  await page.waitForTimeout(200);
  await panneau().locator('[data-activite="course"]').click();
  await page.waitForTimeout(200);
  await panneau().locator('[data-champ="duree"]').fill("40");
  await panneau().locator('[data-champ="distance"]').fill("7");
  await panneau().getByRole("button", { name: "6", exact: true }).click();
  const apercu = net(await panneau().locator("[data-apercu-activite]").innerText().catch(() => ""));
  await panneau().getByRole("button", { name: "Enregistrer l'activité" }).click();
  await page.waitForTimeout(900);
  const activite = recus.find((e) => e.type === "activite");
  const historique = /Course à pied/.test(net(await page.locator("body").innerText()));
  const minutes = Number(await page.locator("[data-semaine-active]").getAttribute("data-semaine-active"));
  console.log(
    "1. ACTIVITÉ             :",
    activite && /Course à pied/.test(activite.message) && /charge sRPE 240/.test(activite.message) && activite.dureeMin === 40 && historique && minutes >= 40 && /charge 240/.test(apercu)
      ? `« ${activite.message} » envoyée au coach, dans l'historique, ${minutes} min de semaine active`
      : `*** ${JSON.stringify(activite)} · historique ${historique} · ${minutes} min · « ${apercu} » ***`
  );

  // 2. Mon annee : cocher un jour passe du mois.
  const jours = await page.locator("[data-calendrier] [data-jour]").evaluateAll((l) => l.filter((b) => !b.disabled).map((b) => b.getAttribute("data-jour")));
  const vide = await page.evaluate((js) => {
    const pris = new Set(JSON.parse(localStorage.getItem("coach_sessions") || "[]").map((s) => s.date));
    return js.filter((j) => !pris.has(j)).sort()[0] || null;
  }, jours);
  const avant = recus.filter((e) => e.type === "pointage").length;
  if (vide) await page.locator(`[data-calendrier] [data-jour="${vide}"]`).click();
  await page.waitForTimeout(800);
  const cochee = await page.evaluate((d) => JSON.parse(localStorage.getItem("coach_sessions") || "[]").some((s) => s.date === d && s.pointage), vide);
  const pointages = recus.filter((e) => e.type === "pointage").length - avant;
  console.log(
    "2. MON ANNÉE            :",
    vide && cochee && pointages === 1 ? `${vide} coché : séance sans détail, envoyée au coach` : `*** jour ${vide}, cochée ${cochee}, ${pointages} pointage(s) ***`
  );

  // 3. Programme guide.
  await page.locator('[data-programme="0-5km"]').getByRole("button", { name: "Commencer" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Je l'ai faite : noter" }).click();
  await page.waitForTimeout(300);
  const prerempli = (await panneau().locator('[data-saisie-activite="course"]').count()) === 1;
  await panneau().getByRole("button", { name: "Enregistrer l'activité" }).click();
  await page.waitForTimeout(800);
  const etat = await page.evaluate(() => JSON.parse(localStorage.getItem("cn_programme_sport") || "null"));
  const note = recus.filter((e) => e.type === "activite").pop();
  console.log(
    "3. PROGRAMME GUIDÉ      :",
    prerempli && etat && etat.faites.length === 1 && note && /semaine 1, séance 1/.test(note.message)
      ? "séance 1 notée (course pré-remplie), programme à 1 séance, note envoyée au coach"
      : `*** pré-rempli ${prerempli}, ${JSON.stringify(etat)}, « ${note && note.message} » ***`
  );

  // 4. Mes sports.
  const mesSports = net(await page.locator("[data-mes-sports]").innerText().catch(() => ""));
  console.log("4. MES SPORTS           :", /Course à pied/.test(mesSports) ? "carte affichée avec la course" : `*** « ${mesSports.slice(0, 120)} » ***`);
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
