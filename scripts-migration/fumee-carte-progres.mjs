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
 *   7. « Debut de ton coaching » (listes Jour / Mois / Annee) : pre-rempli
 *      avec la premiere saisie ; le 03/01/2022 est enregistre dans le
 *      profil, redessine la carte et reste au rechargement ; une date
 *      future est signalee et refusee ; « Revenir au calcul automatique »
 *      efface la date ;
 *   8. « Seances faites au total » : pre-rempli avec les seances notees ;
 *      980 retient 968 seances d'avant l'application (12 deja notees),
 *      redessine la carte et reste au rechargement ; une saisie illisible
 *      est signalee sans rien changer ; vider le champ revient aux seances
 *      notees.
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

    // Debut du coaching saisi a la main, avec les trois listes (le
    // calendrier natif etait inutilisable sur Android).
    const jour = page.getByRole("combobox", { name: "Jour de début" });
    const mois = page.getByRole("combobox", { name: "Mois de début" });
    const annee = page.getByRole("combobox", { name: "Année de début" });
    const lire = async () => `${await annee.inputValue()}-${String(await mois.inputValue()).padStart(2, "0")}-${String(await jour.inputValue()).padStart(2, "0")}`;
    const profilDebut = () => page.evaluate(() => JSON.parse(localStorage.getItem("coach_profile")).coachingStartDate);
    const auto = await lire();
    const premiere = await page.evaluate(() => {
      const ds = ["coach_sessions", "coach_body_logs", "coach_log_entries"].flatMap((k) =>
        JSON.parse(localStorage.getItem(k) || "[]").map((x) => x.date)
      );
      return ds.sort()[0];
    });
    const avant = await apercu.getAttribute("src");
    await annee.selectOption("2022");
    await mois.selectOption("1");
    await jour.selectOption("3");
    await page.waitForTimeout(900);
    const profilSaisi = await profilDebut();
    const redessinee = (await apercu.getAttribute("src")) !== avant;
    if (process.env.DEBUT_COACHING_PNG) {
      await page.locator("[data-debut-coaching]").locator("xpath=ancestor::div[.//*[@data-carte-apercu]][1]").screenshot({ path: process.env.DEBUT_COACHING_PNG });
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Tendances", exact: true }).first().click();
    await page.waitForTimeout(1200);
    const apresRechargement = await lire();
    // Date future : signalee, rien d'enregistre.
    const anneeCourante = new Date().getFullYear();
    await annee.selectOption(String(anneeCourante));
    await mois.selectOption("12");
    await jour.selectOption("31");
    await page.waitForTimeout(500);
    const futurSignale = (await page.locator("[data-debut-futur]").count()) === 1;
    const futurEnregistre = (await profilDebut()) > new Date().toISOString().slice(0, 10);
    await page.getByRole("button", { name: "Revenir au calcul automatique" }).click();
    await page.waitForTimeout(600);
    const efface = await page.evaluate(() => "coachingStartDate" in JSON.parse(localStorage.getItem("coach_profile")));
    const retourAuto = await lire();
    console.log(
      "7. DÉBUT DU COACHING    :",
      auto === premiere && profilSaisi === "2022-01-03" && redessinee && apresRechargement === "2022-01-03" && futurSignale && !futurEnregistre && !efface && retourAuto === premiere
        ? `listes au ${premiere}, 03/01/2022 enregistré et redessiné, gardé au rechargement, date future refusée, retour au calcul automatique`
        : `*** auto ${auto}/${premiere}, profil ${profilSaisi}, redessinée ${redessinee}, rechargement ${apresRechargement}, futur signalé ${futurSignale}, futur enregistré ${futurEnregistre}, effacé ${!efface}, retour ${retourAuto} ***`
    );

    // Nombre total de seances, celles d'avant l'application comprises.
    const total = page.getByRole("textbox", { name: "Séances faites au total" });
    const avantApp = () => page.evaluate(() => JSON.parse(localStorage.getItem("coach_profile")).seancesAvantApp);
    const initial = await total.inputValue();
    const image1 = await apercu.getAttribute("src");
    await total.fill("980");
    await total.evaluate((e) => e.blur());
    await page.waitForTimeout(900);
    const retenu = await avantApp();
    const redessinee2 = (await apercu.getAttribute("src")) !== image1;
    if (process.env.SEANCES_PNG) {
      await page.locator("[data-seances-totales]").locator("xpath=ancestor::div[.//*[@data-carte-apercu]][1]").screenshot({ path: process.env.SEANCES_PNG });
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Tendances", exact: true }).first().click();
    await page.waitForTimeout(1200);
    const garde = await total.inputValue();
    await total.fill("abc");
    await page.locator("[data-seances-totales]").getByRole("button", { name: "OK" }).click();
    await page.waitForTimeout(400);
    const erreurVue = (await page.locator("[data-seances-erreur]").count()) === 1;
    const inchange = (await avantApp()) === 968;
    await total.fill("");
    await total.evaluate((e) => e.blur());
    await page.waitForTimeout(600);
    const retire = await page.evaluate(() => !("seancesAvantApp" in JSON.parse(localStorage.getItem("coach_profile"))));
    const retour = await total.inputValue();
    console.log(
      "8. SÉANCES AU TOTAL     :",
      initial === "12" && retenu === 968 && redessinee2 && garde === "980" && erreurVue && inchange && retire && retour === "12"
        ? "pré-rempli à 12, 980 → 968 d'avant l'app, carte redessinée, gardé au rechargement, saisie illisible refusée, champ vidé → 12"
        : `*** initial ${initial}, retenu ${retenu}, redessinée ${redessinee2}, rechargement ${garde}, erreur ${erreurVue}, inchangé ${inchange}, retiré ${retire}, retour ${retour} ***`
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
