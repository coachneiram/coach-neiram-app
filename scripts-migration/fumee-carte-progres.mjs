/**
 * Fumee : carte de progres a partager, et invitation d'un ami.
 *
 * Tendances → « Partager mes progres » :
 *   1. l'apercu est une vraie image 1080 x 1920 (format story) ;
 *   2. le poids n'y figure pas par defaut ; cocher l'option change l'image ;
 *   3. « Partager ma carte » envoie un PNG a la feuille de partage ;
 *   4. « Inviter un ami » envoie un lien WhatsApp vers le coach, prenom du
 *      parrain deja ecrit ;
 *   5. sans feuille de partage : l'image se telecharge, l'invitation part
 *      par WhatsApp ;
 *   6. la carte « Parrainage » montre les trois paliers du coach ;
 *   7. « Debut de ton coaching » : pre-rempli avec la premiere saisie ; une
 *      date de 2022 est enregistree dans le profil, redessine la carte et
 *      reste au rechargement ; l'effacer revient au calcul automatique.
 * L'image produite est enregistree pour controle visuel (CARTE_PNG).
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-carte-progres.mjs
 */

import { chromium } from "playwright";
import { appareil } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
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
await new Promise((r) => serveur.listen(4646, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];

async function ouvrir({ partage }) {
  const ctx = await nav.newContext({ ...appareil("Pixel 7"), acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript((avecPartage) => {
    window.__partages = [];
    window.__ouverts = [];
    window.open = (u) => {
      window.__ouverts.push(u);
      return null;
    };
    if (avecPartage) {
      navigator.canShare = () => true;
      navigator.share = async (d) => {
        const f = d.files && d.files[0];
        window.__partages.push(
          f
            ? { fichier: f.name, type: f.type, taille: f.size, donnees: await new Promise((r) => { const l = new FileReader(); l.onload = () => r(l.result); l.readAsDataURL(f); }) }
            : { texte: d.text }
        );
      };
    } else {
      delete Navigator.prototype.share;
      delete Navigator.prototype.canShare;
    }
    if (localStorage.getItem("coach_profile")) return;
    const auj = new Date().toISOString().slice(0, 10);
    const jour = (k) => {
      const d = new Date(auj + "T00:00:00");
      d.setDate(d.getDate() - k);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    localStorage.setItem("coach_profile", JSON.stringify({
      firstName: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 88,
      activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, targetWeightKg: 80,
      trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
    }));
    localStorage.setItem("coach_sessions", JSON.stringify([0, 2, 5, 9, 12, 16, 20, 23, 27, 30, 34, 37].map((k, i) => ({ id: "s" + i, date: jour(k), name: "Séance", exercises: [] }))));
    localStorage.setItem("coach_body_logs", JSON.stringify([{ id: "b1", date: jour(35), weightKg: 87.6 }, { id: "b2", date: jour(1), weightKg: 84.8 }]));
    localStorage.setItem("coach_log_entries", JSON.stringify([0, 1, 2, 3, 4].map((k) => ({ id: "e" + k, date: jour(k), mealType: "dejeuner", name: "Repas", calories: 600, protein: 40, carbs: 60, fat: 20 }))));
  }, partage);
  await page.goto("http://localhost:4646/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Tendances", exact: true }).first().click();
  await page.waitForTimeout(1500);
  return { ctx, page };
}

/** Dimensions d'une image data:URL, decodee dans la page. */
const dimensions = (page, src) =>
  page.evaluate(
    (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(`${i.naturalWidth}x${i.naturalHeight}`); i.onerror = () => r("illisible"); i.src = s; }),
    src
  );

try {
  // ── Avec feuille de partage ─────────────────────────────────────
  {
    const { ctx, page } = await ouvrir({ partage: true });
    const texte = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const apercu = page.locator("[data-carte-apercu]");
    const src1 = (await apercu.count()) ? await apercu.getAttribute("src") : null;
    console.log(
      "1. APERÇU               :",
      /Partager mes progrès/i.test(texte) && src1 && (await dimensions(page, src1)) === "1080x1920"
        ? "carte affichée, image 1080x1920"
        : `*** ${src1 ? await dimensions(page, src1) : "pas d'aperçu"} ***`
    );

    const case_ = page.getByRole("checkbox", { name: /évolution de mon poids/ });
    const decochee = (await case_.count()) && !(await case_.isChecked());
    await case_.check();
    await page.waitForTimeout(800);
    const src2 = await apercu.getAttribute("src");
    console.log(
      "2. POIDS                :",
      decochee && src2 && src2 !== src1 ? "absent par défaut, l'option redessine la carte" : "*** OPTION POIDS SANS EFFET ***"
    );

    await page.getByRole("button", { name: /Partager ma carte/ }).click();
    await page.waitForTimeout(1500);
    const p = (await page.evaluate(() => window.__partages))[0] || {};
    const dims = p.donnees ? await dimensions(page, p.donnees) : "aucune";
    if (p.donnees && process.env.CARTE_PNG) writeFileSync(process.env.CARTE_PNG, Buffer.from(p.donnees.split(",")[1], "base64"));
    console.log(
      "3. PARTAGE IMAGE        :",
      p.type === "image/png" && /^progres-coach-neiram-\d{4}-\d{2}-\d{2}\.png$/.test(p.fichier) && p.taille > 20000 && dims === "1080x1920"
        ? `PNG ${Math.round(p.taille / 1024)} Ko, 1080x1920, « ${p.fichier} »`
        : `*** ${JSON.stringify({ ...p, donnees: undefined })} ${dims} ***`
    );

    await page.getByRole("button", { name: /Inviter un ami/ }).click();
    await page.waitForTimeout(500);
    const inv = (await page.evaluate(() => window.__partages)).find((x) => x.texte) || {};
    console.log(
      "4. INVITATION           :",
      /https:\/\/wa\.me\/33675359069\?text=/.test(inv.texte || "") && /de la part de Thomas/.test(decodeURIComponent(inv.texte || ""))
        ? "lien WhatsApp du coach, « de la part de Thomas » pré-écrit"
        : `*** « ${inv.texte} » ***`
    );
    const parrainage = page.locator("[data-parrainage]");
    const paliers = await page.$$eval("[data-palier-parrainage]", (els) => els.map((e) => e.innerText.replace(/\s+/g, " ")));
    if (process.env.PARRAINAGE_PNG) {
      await parrainage.scrollIntoViewIfNeeded();
      await parrainage.screenshot({ path: process.env.PARRAINAGE_PNG });
    }
    console.log(
      "6. PARRAINAGE           :",
      (await parrainage.count()) === 1 &&
        paliers.length === 3 &&
        /Une séance offerte/i.test(paliers[0]) &&
        /55 € offerts/i.test(paliers[1]) &&
        /−25 %/.test(paliers[2]) &&
        !/32,50/.test(paliers.join(" "))
        ? "carte affichée, 3 paliers du coach, sans montant périmé"
        : `*** ${JSON.stringify(paliers)} ***`
    );

    // Debut du coaching saisi a la main.
    const champ = page.getByRole("textbox", { name: "Début de ton coaching" });
    const auto = await champ.inputValue();
    const premiere = await page.evaluate(() => {
      const ds = ["coach_sessions", "coach_body_logs", "coach_log_entries"].flatMap((k) =>
        JSON.parse(localStorage.getItem(k) || "[]").map((x) => x.date)
      );
      return ds.sort()[0];
    });
    const avant = await apercu.getAttribute("src");
    await champ.fill("2022-01-03");
    await page.waitForTimeout(900);
    const profilSaisi = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_profile")).coachingStartDate);
    const redessinee = (await apercu.getAttribute("src")) !== avant;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Tendances", exact: true }).first().click();
    await page.waitForTimeout(1200);
    const apresRechargement = await page.getByRole("textbox", { name: "Début de ton coaching" }).inputValue();
    await page.getByRole("textbox", { name: "Début de ton coaching" }).fill("");
    await page.waitForTimeout(600);
    const efface = await page.evaluate(() => "coachingStartDate" in JSON.parse(localStorage.getItem("coach_profile")));
    const retourAuto = await page.getByRole("textbox", { name: "Début de ton coaching" }).inputValue();
    if (process.env.DEBUT_COACHING_PNG) {
      await page.getByRole("textbox", { name: "Début de ton coaching" }).fill("2022-01-03");
      await page.waitForTimeout(900);
      await page.locator("[data-debut-coaching]").locator("xpath=ancestor::div[.//*[@data-carte-apercu]][1]").screenshot({ path: process.env.DEBUT_COACHING_PNG });
    }
    console.log(
      "7. DÉBUT DU COACHING    :",
      auto === premiere && profilSaisi === "2022-01-03" && redessinee && apresRechargement === "2022-01-03" && !efface && retourAuto === premiere
        ? `pré-rempli au ${premiere}, 2022-01-03 enregistré et redessiné, gardé au rechargement, effacé → automatique`
        : `*** auto ${auto}/${premiere}, profil ${profilSaisi}, redessinée ${redessinee}, rechargement ${apresRechargement}, effacé ${!efface}, retour ${retourAuto} ***`
    );
    await ctx.close();
  }

  // ── Sans feuille de partage ─────────────────────────────────────
  {
    const { ctx, page } = await ouvrir({ partage: false });
    const telechargement = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
    await page.getByRole("button", { name: /Partager ma carte/ }).click();
    const t = await telechargement;
    await page.waitForTimeout(500);
    const msg = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    await page.getByRole("button", { name: /Inviter un ami/ }).click();
    await page.waitForTimeout(500);
    const ouverts = await page.evaluate(() => window.__ouverts);
    console.log(
      "5. SANS PARTAGE NATIF   :",
      t && /\.png$/.test(t.suggestedFilename()) && /Image enregistrée/.test(msg) && /^https:\/\/wa\.me\/\?text=.*33675359069/.test(ouverts[0] || "")
        ? "image téléchargée, invitation par WhatsApp"
        : `*** téléchargement ${t ? t.suggestedFilename() : "aucun"}, ouverts ${JSON.stringify(ouverts)} ***`
    );
    await ctx.close();
  }
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
