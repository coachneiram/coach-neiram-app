/**
 * Fumee : aucun onglet ne deborde sur le cote, meme sur un ecran de 320 px.
 *
 * Constat du 29 septembre 2026 : sur un ecran de 320 px (iPhone SE 1re
 * generation, anciens Galaxy), les champs horaires « Coucher » et « Lever »
 * du Journal poussaient la page a 362 px. Tout le Journal glissait sur le
 * cote et la barre d'onglets sortait de l'ecran : impossible d'atteindre
 * « Tendances ». Defaut herite de index.html.
 *
 * Chaque onglet est ouvert sur l'appareil teste ET sur un ecran de 320 px ;
 * la largeur du contenu ne doit jamais depasser celle de l'ecran.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-largeur-ecran.mjs
 */

import { chromium } from "playwright";
import { appareil } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const T = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const srv = createServer((q, r) => { const c = join(DIST, q.url === "/" ? "index.html" : q.url.split("?")[0]); if (!existsSync(c)) return r.writeHead(404).end(); r.writeHead(200, { "Content-Type": T[extname(c)] || "application/octet-stream" }); r.end(readFileSync(c)); });
await new Promise((r) => srv.listen(4677, r));
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];
const base = appareil("Pixel 7");
const formats = [
  ["appareil testé", base],
  ["écran de 320 px", { ...base, viewport: { width: 320, height: 640 }, screen: { width: 320, height: 640 } }]
];
try {
for (const [nomFormat, contexte] of formats) {
const page = await (await nav.newContext(contexte)).newPage();
page.on("pageerror", (e) => erreurs.push(e.message));
console.log(`— ${nomFormat} (${contexte.viewport.width} px)`);
await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("coach_profile", JSON.stringify({ firstName: "Claire", sex: "femme", age: 35, heightCm: 166, startWeightKg: 64, activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, targetWeightKg: 60, trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: [] }));
});
await page.goto("http://localhost:4677/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
for (const onglet of ["Séances", "Repas", "Nutrition", "Sommeil", "Mesures", "Journal", "Tendances"]) {
  await page.evaluate((o) => [...document.querySelectorAll("button")].find((b) => b.innerText.trim() === o)?.click(), onglet);
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const trop = [...document.querySelectorAll("body *")]
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter(({ e, r }) => r.width > 0 && r.right > vw + 1 && !e.closest(".bottom-nav") && [...e.children].every((c) => c.getBoundingClientRect().right <= vw + 1 || c.getBoundingClientRect().width === 0))
      .map(({ e, r }) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : ""} droite=${Math.round(r.right)} « ${(e.innerText || "").slice(0, 40).replace(/\n/g, " ")} »`);
    return { vw, scroll: document.documentElement.scrollWidth, trop: trop.slice(0, 8) };
  });
  console.log(
    "  " + onglet.padEnd(10),
    r.scroll > r.vw ? `*** DÉBORDE : contenu ${r.scroll} px pour ${r.vw} px ***` : `ok (${r.scroll} px)`
  );
  if (r.scroll > r.vw) r.trop.forEach((t) => console.log("       ", t));
}
}
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}
console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close(); srv.close();
