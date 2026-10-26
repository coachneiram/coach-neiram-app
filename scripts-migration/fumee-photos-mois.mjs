/**
 * Fumée : photos du bilan mensuel (décision du coach du 26 octobre 2026).
 *
 *   1. sans photo du mois : bloc « Photos du mois » incomplet, 3 boutons
 *      appareil, « Générer le bilan mensuel » désactivé ;
 *   2. un bouton appareil ouvre le choix de la source (photo de la pose) ;
 *   3. avec les 3 photos de la semaine et celles du mois d'avant : bloc
 *      complet, 6 vignettes, bouton actif ;
 *   4. antécédent de trouble alimentaire : photos facultatives, bouton actif.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-photos-mois.mjs
 */

import { chromium } from "playwright";
import { appareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4735;
const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const serveur = createServer((req, res) => {
  const chemin = req.url.split("?")[0];
  const c = join(DIST, chemin === "/" ? "index.html" : chemin);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(PORT, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];
// Petite image valide (1 pixel PNG), pour les vignettes.
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function ouvrir({ reglages = null, photos = false } = {}) {
  const ctx = await nav.newContext(appareil());
  await ctx.addInitScript(sansAides);
  await ctx.addInitScript(({ reglages, photos, PIXEL }) => {
    if (localStorage.getItem("coach_profile")) return;
    const auj = new Date().toISOString().slice(0, 10);
    localStorage.setItem("cn_synchro_locale", "1");
    localStorage.setItem("coach_profile", JSON.stringify({
      name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 82,
      activityLevel: "modere", goal: "perte", sessionsPerWeek: 3,
      trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
    }));
    localStorage.setItem("coach_body_logs", JSON.stringify([{ id: "b1", date: auj, weightKg: 81 }]));
    if (reglages) localStorage.setItem("cn_objectifs_sur_mesure", JSON.stringify(reglages));
    if (photos) {
      const d = new Date(auj + "T00:00:00");
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
      const lundi = iso(d);
      const avant = new Date(d);
      avant.setDate(avant.getDate() - 35);
      const tout = { face: PIXEL, profil: PIXEL, dos: PIXEL };
      localStorage.setItem("coach_photos_" + lundi, JSON.stringify(tout));
      localStorage.setItem("coach_photos_" + iso(avant), JSON.stringify(tout));
    }
  }, { reglages, photos, PIXEL });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /^Tendances$/ }).last().click();
  await page.waitForTimeout(800);
  return { ctx, page };
}

const etatBloc = async (page) => {
  const bloc = page.locator("[data-photos-mois]");
  const etat = await bloc.getAttribute("data-photos-mois").catch(() => null);
  const texte = (await bloc.innerText().catch(() => "")).replace(/\s+/g, " ");
  const bouton = page.getByRole("button", { name: /Générer le bilan mensuel/ });
  const actif = (await bouton.count()) ? await bouton.isEnabled() : null;
  const appareils = await bloc.locator('button[aria-label^="Prendre la photo"]').count();
  return { etat, texte, actif, appareils };
};

try {
  // 1. Sans photo.
  {
    const { ctx, page } = await ouvrir();
    const e = await etatBloc(page);
    console.log(
      "1. SANS PHOTO           :",
      e.etat === "incomplet" && /Il manque 3 photos/.test(e.texte) && e.actif === false && e.appareils === 3
        ? "3 photos manquantes, bouton du bilan mensuel désactivé"
        : `*** ${JSON.stringify(e)} ***`
    );
    // 2. Bouton appareil : choix de la source.
    await page.locator('[data-photos-mois] button[aria-label="Prendre la photo : Dos"]').click();
    await page.waitForTimeout(500);
    const choix = (await page.locator(".modal-panel").last().innerText().catch(() => "")).replace(/\s+/g, " ");
    console.log("2. PRENDRE LA PHOTO     :", /photo|appareil|galerie/i.test(choix) ? "choix de la source ouvert" : `*** « ${choix.slice(0, 80)} » ***`);
    await ctx.close();
  }
  // 3. Photos du mois et d'avant.
  {
    const { ctx, page } = await ouvrir({ photos: true });
    const e = await etatBloc(page);
    const vignettes = await page.locator("[data-photos-mois] [data-pose] div[style*='url(']").count();
    console.log(
      "3. PHOTOS COMPLÈTES     :",
      e.etat === "complet" && e.actif === true && vignettes === 6 && e.appareils === 0
        ? "3 poses du mois à côté de celles d'avant (6 vignettes), bouton actif"
        : `*** ${JSON.stringify(e)}, ${vignettes} vignette(s) ***`
    );
    await ctx.close();
  }
  // 4. Exception de santé.
  {
    const { ctx, page } = await ouvrir({ reglages: { contraintesSante: ["tca"] } });
    const e = await etatBloc(page);
    console.log(
      "4. EXCEPTION DE SANTÉ   :",
      e.etat === "incomplet" && /facultatives/.test(e.texte) && e.actif === true
        ? "photos facultatives, bilan mensuel non bloqué"
        : `*** ${JSON.stringify(e)} ***`
    );
    await ctx.close();
  }
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
