/**
 * Fumee : trophees et serie de semaines tenues (onglet Seances).
 *
 *   1. un client regulier (4 semaines tenues a 3 seances, 1 seance cette
 *      semaine) voit sa serie de 4 semaines et ce qu'il reste a faire ;
 *   2. les tuiles obtenues / a venir correspondent a son historique ;
 *   3. les nouveaux trophees sont celebres, « Super ! » les memorise
 *      (cn_trophees_vus) et la banniere ne revient pas au rechargement ;
 *   4. joker : semaines declarees difficiles avec une seule seance, la serie
 *      reste intacte et le message salue la seance maintien.
 * Capture de l'ecran pour controle visuel (TROPHEES_PNG).
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-trophees.mjs
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
await new Promise((r) => serveur.listen(4647, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];

/**
 * Ouvre l'onglet Seances avec un historique construit relativement au lundi
 * de la semaine en cours : `semaines` = { decalage: nombreDeSeances },
 * `difficiles` = decalages declares en semaine difficile.
 */
async function ouvrir({ semaines, difficiles = [] }) {
  const ctx = await nav.newContext(appareil("Pixel 7"));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript(
    ({ semaines, difficiles }) => {
      if (localStorage.getItem("coach_profile")) return;
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const auj = new Date();
      const lundi = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - ((auj.getDay() + 6) % 7));
      const jour = (semaine, j) => iso(new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + semaine * 7 + j));
      localStorage.setItem("coach_profile", JSON.stringify({
        firstName: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 88,
        activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, targetWeightKg: 80,
        trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
      }));
      const seances = [];
      for (const [decalage, n] of Object.entries(semaines)) {
        // Lundi, mercredi, vendredi ; la semaine en cours : lundi seulement.
        for (let i = 0; i < n; i++) seances.push({ id: `s${decalage}_${i}`, date: jour(Number(decalage), i * 2), name: "Séance", exercises: [] });
      }
      localStorage.setItem("coach_sessions", JSON.stringify(seances));
      localStorage.setItem(
        "cn_hard_weeks",
        JSON.stringify(Object.fromEntries(difficiles.map((d) => [jour(d, 0), { active: true, reason: "enfant malade" }])))
      );
    },
    { semaines, difficiles }
  );
  await page.goto("http://localhost:4647/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Séances", exact: true }).first().click();
  await page.waitForTimeout(1200);
  return { ctx, page };
}

const texteDe = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");
const obtenus = (page) =>
  page.$$eval("[data-trophee]", (els) => els.filter((e) => e.dataset.obtenu === "oui").map((e) => e.dataset.trophee));

try {
  // ── Client regulier ─────────────────────────────────────────────
  {
    const { ctx, page } = await ouvrir({ semaines: { "-4": 3, "-3": 3, "-2": 3, "-1": 3, 0: 1 } });
    const serie = await page.locator("[data-serie-semaines]").innerText().catch(() => "absent");
    const texte = await texteDe(page);
    console.log(
      "1. SÉRIE                :",
      serie === "4" && /Mes trophées/i.test(texte) && /Encore 2 séances cette semaine pour porter ta série à 5 semaines/.test(texte)
        ? "4 semaines tenues, « encore 2 séances » pour la 5e"
        : `*** série « ${serie} » ***`
    );

    const ids = await obtenus(page);
    const attendus = ["seances-1", "seances-10", "semaines-2", "semaines-4"];
    const tuiles = await page.locator("[data-trophee]").count();
    console.log(
      "2. TUILES               :",
      tuiles === 12 && JSON.stringify([...ids].sort()) === JSON.stringify([...attendus].sort()) && /13\/25/.test(texte)
        ? "12 tuiles, 4 obtenues, « 13/25 » vers Régulier"
        : `*** ${tuiles} tuiles, obtenus ${JSON.stringify(ids)} ***`
    );

    const banniere = page.locator("[data-nouveau-trophee]");
    const avant = (await banniere.count()) && /4 nouveaux trophées/.test(await banniere.innerText());
    await page.getByRole("button", { name: "Super !" }).click();
    await page.waitForTimeout(400);
    const apres = await banniere.count();
    const vus = await page.evaluate(() => JSON.parse(localStorage.getItem("cn_trophees_vus") || "[]"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Séances", exact: true }).first().click();
    await page.waitForTimeout(1000);
    const auRechargement = await page.locator("[data-nouveau-trophee]").count();
    console.log(
      "3. CÉLÉBRATION          :",
      avant && apres === 0 && auRechargement === 0 && vus.length === 4
        ? "bannière « 4 nouveaux trophées », mémorisée après « Super ! », absente au rechargement"
        : `*** avant ${avant}, après ${apres}, rechargement ${auRechargement}, vus ${JSON.stringify(vus)} ***`
    );
    if (process.env.TROPHEES_PNG) {
      await page.locator("[data-serie-semaines]").scrollIntoViewIfNeeded();
      await page.locator("[data-serie-semaines]").locator("xpath=ancestor::div[.//*[@data-trophee]][1]").screenshot({ path: process.env.TROPHEES_PNG });
    }
    await ctx.close();
  }

  // ── Joker : semaines difficiles ─────────────────────────────────
  {
    const { ctx, page } = await ouvrir({ semaines: { "-3": 3, "-2": 3, "-1": 1, 0: 1 }, difficiles: [-1, 0] });
    const serie = await page.locator("[data-serie-semaines]").innerText().catch(() => "absent");
    const texte = await texteDe(page);
    console.log(
      "4. JOKER                :",
      serie === "4" && /tenue grâce à ta séance maintien/.test(texte) && /semaine difficile/.test(texte)
        ? "2 semaines difficiles à 1 séance : série intacte à 4, séance maintien saluée"
        : `*** série « ${serie} » ***`
    );
    await ctx.close();
  }
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
