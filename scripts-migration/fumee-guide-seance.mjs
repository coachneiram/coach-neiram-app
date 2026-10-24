/**
 * Fumée : une séance facile à suivre (24 octobre 2026).
 *
 *   1. mode d'emploi en 3 étapes, « Exercice 1/2 », charge proposée en clair
 *      sous le nom ; « Enregistrer la séance » visible sans défiler ;
 *   2. « Garder 60 kg » remet la charge de la dernière fois ;
 *   3. les 3 séries du Squat cochées : « ✓ Terminé », « 3/6 séries faites » ;
 *   4. retirer un exercice demande confirmation (refus : il reste) ;
 *   5. l'unité se change dans « Options » (Secondes) ;
 *   6. enregistrée sans durée : la durée est calculée depuis le démarrage.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-guide-seance.mjs
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
await new Promise((r) => serveur.listen(4720, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  const d = new Date();
  d.setDate(d.getDate() - 7);
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Sabine", name: "Sabine", sex: "femme", age: 40, heightCm: 165, startWeightKg: 62,
    activityLevel: "modere", goal: "forme", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  localStorage.setItem("coach_routines", JSON.stringify([{
    id: "r1", name: "Bas du corps", color: "#F5A040", programme: true,
    exercises: [
      { id: "p1", name: "Squat", mode: "muscu", sets: "3", reps: "8" },
      { id: "p2", name: "Gainage planche", mode: "pdc", sets: "3", reps: "30" }
    ]
  }]));
  localStorage.setItem("coach_sessions", JSON.stringify([{
    id: "s1", date: d.toISOString().slice(0, 10), routineId: "r1", durationMin: 60, rpe: 7,
    exercises: [{ id: "e1", name: "Squat", mode: "muscu", sets: "3", reps: "8", weight: "60", rpe: "7" }]
  }]));
});

const carte = (i) => page.locator(`.modal-panel [data-exercice="${i}"]`);

try {
  await page.goto("http://localhost:4720/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /^(Séances|Entraînements)$/ }).last().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Démarrer" }).first().click();
  await page.waitForTimeout(600);

  // 1. Ce qu'on voit en ouvrant.
  const guide = (await page.locator("[data-guide-seance] li").count()) === 3;
  const t0 = net(await carte(0).innerText());
  const charge = net(await carte(0).locator("[data-charge-proposee]").innerText().catch(() => ""));
  const bouton = page.getByRole("button", { name: "Enregistrer la séance" });
  const boite = await bouton.boundingBox();
  const hauteur = page.viewportSize().height;
  const visible = !!boite && boite.y + boite.height <= hauteur + 1;
  console.log(
    "1. À L'OUVERTURE        :",
    guide && /^EXERCICE 1\/2/i.test(t0) && /Charge proposée : 62,5 kg \(\+2,5 kg\)/.test(charge) && visible
      ? "mode d'emploi en 3 étapes, « Exercice 1/2 », charge proposée en clair, « Enregistrer » visible sans défiler"
      : `*** guide ${guide}, « ${t0.slice(0, 60)} », « ${charge} », bouton ${JSON.stringify(boite)} / ${hauteur} ***`
  );

  // 2. Garder la charge.
  await carte(0).getByRole("button", { name: "Garder 60 kg" }).click();
  await page.waitForTimeout(200);
  const charges = await carte(0).locator('input[aria-label="Charge (kg)"]').evaluateAll((l) => l.map((x) => x.value));
  console.log("2. GARDER 60 KG         :", charges.join(",") === "60,60,60" ? "les 3 séries reviennent à 60 kg" : `*** ${charges} ***`);

  // 3. Cocher les 3 series du Squat.
  for (let k = 0; k < 3; k++) {
    await carte(0).locator('[aria-label="Série faite"]').nth(k).click();
    await page.waitForTimeout(150);
    await page.getByRole("button", { name: "Passer" }).click().catch(() => {});
  }
  await page.waitForTimeout(300);
  const termine = (await carte(0).getAttribute("data-termine")) === "oui" && (await carte(0).locator("[data-exercice-termine]").count()) === 1;
  const progression = net(await page.locator("[data-progression-seance]").innerText().catch(() => ""));
  console.log(
    "3. EXERCICE TERMINÉ     :",
    termine && progression === "3/6 séries faites" ? "« ✓ Terminé » sur le Squat, « 3/6 séries faites »" : `*** terminé ${termine}, « ${progression} » ***`
  );

  // 4. Retirer : confirmation.
  page.once("dialog", (d) => d.dismiss());
  await carte(1).getByRole("button", { name: "Retirer l'exercice" }).click();
  await page.waitForTimeout(200);
  const reste = await page.locator(".modal-panel [data-exercice]").count();
  console.log("4. RETIRER (REFUS)      :", reste === 2 ? "confirmation demandée, l'exercice reste" : `*** ${reste} exercice(s) ***`);

  // 5. Unite dans Options.
  await carte(1).getByRole("button", { name: "Options", exact: true }).click();
  await page.waitForTimeout(200);
  await carte(1).getByLabel("Compter en").selectOption("sec");
  await page.waitForTimeout(200);
  const entete = /SECONDES/i.test(net(await carte(1).innerText()));
  console.log("5. UNITÉ (OPTIONS)      :", entete ? "« Compter en : Secondes » change la colonne" : "*** colonne inchangée ***");

  // 6. Duree calculee : la seance a demarre il y a 35 min.
  await page.evaluate(() => {
    const b = JSON.parse(localStorage.getItem("brouillon_seance_neiram"));
    b.debutLe = Date.now() - 35 * 60000;
    localStorage.setItem("brouillon_seance_neiram", JSON.stringify(b));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /^(Séances|Entraînements)$/ }).last().click().catch(() => {});
  await page.waitForTimeout(600);
  const indice = await page.locator(".modal-panel input[placeholder^='auto']").getAttribute("placeholder").catch(() => "");
  await page.getByRole("button", { name: "Enregistrer la séance" }).click();
  await page.waitForTimeout(700);
  const seances = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_sessions") || "[]"));
  const nouvelle = seances.find((s) => s.id !== "s1") || {};
  console.log(
    "6. DURÉE CALCULÉE       :",
    indice === "auto : 35 min" && Number(nouvelle.durationMin) === 35 && !("debutLe" in nouvelle)
      ? "« auto : 35 min » affiché, 35 min enregistrées"
      : `*** « ${indice} », ${JSON.stringify({ duree: nouvelle.durationMin, debutLe: nouvelle.debutLe })} ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
