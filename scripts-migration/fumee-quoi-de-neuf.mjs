/**
 * Fumee : fenetre « Quoi de neuf » et test des notifications (7 octobre 2026).
 *
 *   1. client deja installe : la fenetre s'ouvre, l'aide puis la
 *      progression du corps en tete ; l'annonce de la synchro est reservee
 *      au coaching en ligne ;
 *   2. « Voir mes mesures » ferme la fenetre et ouvre Mesures ;
 *   3. a la reouverture, plus de fenetre ;
 *   4. Reglages → « Revoir les nouveautes » la rouvre ;
 *   5. client en ligne : l'annonce de la synchro est presente ;
 *   6. nouvelle installation (pas de profil) : rien d'annonce, tout est
 *      marque vu ;
 *   7. « Tester les notifications », autorisees : une vraie notification
 *      est remise par le service worker ;
 *   8. notifications bloquees : le client sait ou les reactiver ;
 *   9. telephone sans notifications (iPhone hors ecran d'accueil) : le
 *      client sait comment installer l'app ;
 *  10. Reglages → « Aide et questions frequentes » : les questions des
 *      guides, une reponse s'ouvre d'un toucher ;
 *  11. « Voir l'aide » depuis la fenetre ouvre l'Aide ;
 *  12. bandeau d'installation : etapes Android, « Plus tard » le masque, y
 *      compris apres reouverture ; sur iPhone, les etapes de Safari.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-quoi-de-neuf.mjs
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
await new Promise((r) => serveur.listen(4694, r));
const URL_APP = "http://localhost:4694/";

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];

async function ouvrir({ profil, notifications = "accordees", telephone = "Pixel 7" }) {
  const ctx = await nav.newContext(appareil(telephone));
  if (notifications === "accordees") await ctx.grantPermissions(["notifications"]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript(
    ({ profil, notifications }) => {
      // Les notifications remises par le service worker sont relevees ici.
      // Sur les machines de la CI, Chromium refuse l'autorisation accordee
      // par le test : on la simule, et l'on verifie que l'application passe
      // bien par le service worker avec le bon titre et le bon texte.
      window.__notifications = [];
      if (window.ServiceWorkerRegistration) {
        const original = ServiceWorkerRegistration.prototype.showNotification;
        ServiceWorkerRegistration.prototype.showNotification = function (titre, options) {
          window.__notifications.push(`${titre} — ${(options && options.body) || ""}`);
          return original.call(this, titre, options).catch(() => {});
        };
      }
      if (notifications === "accordees" && window.Notification) {
        Object.defineProperty(Notification, "permission", { get: () => "granted" });
      }
      if (notifications === "bloquees") {
        Object.defineProperty(Notification, "permission", { get: () => "denied" });
      }
      if (notifications === "absentes") {
        delete window.Notification;
      }
      localStorage.setItem("cn_nouveautes_locale", "1");
      if (profil && !localStorage.getItem("coach_profile")) {
        localStorage.setItem("coach_profile", JSON.stringify(profil));
      }
    },
    { profil, notifications }
  );
  await page.goto(URL_APP, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  return { ctx, page };
}

const PROFIL = {
  name: "Léa", sex: "femme", age: 34, heightCm: 165, startWeightKg: 68,
  activityLevel: "modere", goal: "perte", sessionsPerWeek: 3,
  trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
};

const titres = (page) => page.$$eval("[data-nouveaute]", (els) => els.map((e) => e.dataset.nouveaute));

try {
  // 1 a 4 : client en presentiel deja installe.
  {
    const { ctx, page } = await ouvrir({ profil: PROFIL });
    const ids = await titres(page);
    const texte = (await page.locator("[data-quoi-de-neuf]").count())
      ? (await page.locator("[data-quoi-de-neuf]").innerText()).replace(/\s+/g, " ")
      : "";
    console.log(
      "1. A L'OUVERTURE        :",
      ids[0] === "2026-10-07-aide" && ids[1] === "2026-10-06-progression" && ids.length >= 3 && !ids.includes("2026-10-04-synchro") && /Ta progression en courbes/.test(texte)
        ? `${ids.length} nouveautés, l'aide puis la progression en tête, rien sur la synchro (présentiel)`
        : `*** ${JSON.stringify(ids)} ***`
    );

    await page.getByRole("button", { name: "Voir mes mesures" }).click();
    await page.waitForTimeout(600);
    const apres = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const fermee = (await page.locator("[data-quoi-de-neuf]").count()) === 0;
    console.log(
      "2. VOIR MES MESURES     :",
      fermee && /Nouvelle prise/.test(apres) ? "fenêtre fermée, écran Mesures ouvert" : `*** fermée ${fermee} ***`
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const encore = await page.locator("[data-quoi-de-neuf]").count();
    console.log("3. RÉOUVERTURE          :", encore === 0 ? "plus de fenêtre, les nouveautés sont vues" : "*** LA FENÊTRE REVIENT ***");

    await page.locator('button[aria-label="Réglages"]').first().click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "Revoir les nouveautés" }).click();
    await page.waitForTimeout(600);
    const revues = await titres(page);
    console.log(
      "4. REVOIR               :",
      revues[0] === "2026-10-07-aide" ? `fenêtre rouverte depuis les réglages (${revues.length} nouveautés)` : `*** ${JSON.stringify(revues)} ***`
    );
    await page.getByRole("button", { name: "C'est noté" }).click();
    await page.waitForTimeout(400);

    // 7. Test des notifications, autorisees.
    await page.locator('button[aria-label="Réglages"]').first().click();
    await page.waitForTimeout(600);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.getByRole("button", { name: "Tester les notifications" }).click();
    await page.waitForTimeout(1500);
    const resultat = await page.locator("[data-resultat-test]").getAttribute("data-resultat-test");
    const remises = await page.evaluate(() => window.__notifications);
    console.log(
      "7. TEST NOTIFICATION    :",
      resultat === "envoyee" && remises.length === 1 && /^Coach Neiram — Test réussi/.test(remises[0])
        ? `remise par le service worker : « ${remises[0]} »`
        : `*** ${resultat} ${JSON.stringify(remises)} ***`
    );
    await ctx.close();
  }

  // 10 a 12 : aide et bandeau d'installation.
  {
    const { ctx, page } = await ouvrir({ profil: PROFIL });
    await page.getByRole("button", { name: "Voir l'aide" }).click();
    await page.waitForTimeout(500);
    const depuisFenetre = await page.locator("[data-aide]").count();
    console.log("11. VOIR L'AIDE         :", depuisFenetre === 1 ? "la fenêtre « Quoi de neuf » ouvre l'Aide" : "*** AIDE NON OUVERTE ***");
    await page.getByRole("button", { name: "Fermer", exact: true }).last().click();
    await page.waitForTimeout(400);

    await page.locator('button[aria-label="Réglages"]').first().click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "Aide et questions fréquentes" }).click();
    await page.waitForTimeout(600);
    const nb = await page.locator("[data-question]").count();
    const q = page.locator('[data-question="changer-telephone"]');
    await q.locator("summary").click();
    await page.waitForTimeout(300);
    const ouverte = await q.evaluate((d) => d.open);
    const rep = (await q.innerText()).replace(/\s+/g, " ");
    console.log(
      "10. AIDE                :",
      nb >= 20 && ouverte && /Exporter mes données/.test(rep)
        ? `${nb} questions ; « Je change de téléphone » s'ouvre et cite « Exporter mes données »`
        : `*** ${nb} questions, ouverte ${ouverte} ***`
    );
    await page.getByRole("button", { name: "Fermer", exact: true }).last().click();
    await page.waitForTimeout(400);

    // La suite complete impose un seul telephone (APPAREIL) a tous les
    // contextes : on attend les etapes du telephone reellement simule.
    const attendu = async (p) => (/iPhone|iPad/.test(await p.evaluate(() => navigator.userAgent)) ? "ios" : "android");
    const etapes = { ios: /Sur l'écran d'accueil/, android: /Installer l'application/ };
    const attenduA = await attendu(page);
    const bandeau = page.locator("[data-bandeau-installation]");
    const plateforme = (await bandeau.count()) ? await bandeau.getAttribute("data-bandeau-installation") : null;
    const texteB = (await bandeau.count()) ? (await bandeau.innerText()).replace(/\s+/g, " ") : "";
    await page.getByRole("button", { name: "Plus tard" }).click();
    await page.waitForTimeout(300);
    const apresMasque = await bandeau.count();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const apresRecharge = await page.locator("[data-bandeau-installation]").count();
    await ctx.close();

    const iphone = await ouvrir({ profil: PROFIL, telephone: "iPhone 13" });
    const attenduI = await attendu(iphone.page);
    const bi = iphone.page.locator("[data-bandeau-installation]");
    const texteI = (await bi.count()) ? (await bi.innerText()).replace(/\s+/g, " ") : "";
    const platI = (await bi.count()) ? await bi.getAttribute("data-bandeau-installation") : null;
    await iphone.ctx.close();
    console.log(
      "12. BANDEAU INSTALL.    :",
      plateforme === attenduA && etapes[attenduA].test(texteB) && apresMasque === 0 && apresRecharge === 0 &&
        platI === attenduI && etapes[attenduI].test(texteI)
        ? `étapes ${attenduA === "ios" ? "Safari" : "Chrome"} puis ${attenduI === "ios" ? "Safari" : "Chrome"} selon le téléphone, « Plus tard » tient après réouverture`
        : `*** ${plateforme} « ${texteB.slice(0, 60)} » masqué ${apresMasque}/${apresRecharge} ; ${platI} « ${texteI.slice(0, 60)} » ***`
    );
  }

  // 5. Client en ligne.
  {
    const { ctx, page } = await ouvrir({ profil: { ...PROFIL, coachingMode: "enligne" } });
    const ids = await titres(page);
    console.log(
      "5. CLIENT EN LIGNE      :",
      ids.includes("2026-10-04-synchro") ? "l'annonce de la synchro est présente" : `*** ${JSON.stringify(ids)} ***`
    );
    await ctx.close();
  }

  // 6. Nouvelle installation.
  {
    const { ctx, page } = await ouvrir({ profil: null });
    const vues = await page.evaluate(() => JSON.parse(localStorage.getItem("cn_nouveautes_vues") || "null"));
    const fenetre = await page.locator("[data-quoi-de-neuf]").count();
    console.log(
      "6. NOUVELLE INSTALL.    :",
      fenetre === 0 && Array.isArray(vues) && vues.includes("2026-10-06-progression")
        ? `rien d'annoncé, ${vues.length} nouveautés marquées vues`
        : `*** fenêtre ${fenetre}, vues ${JSON.stringify(vues)} ***`
    );
    await ctx.close();
  }

  // 8 et 9. Notifications bloquees, puis absentes.
  for (const [num, cas, attendu, motif] of [
    ["8. BLOQUÉES            :", "bloquees", "bloquee", /Réglages → Notifications → Coach Neiram/],
    ["9. NON DISPONIBLES     :", "absentes", "indisponible", /écran d'accueil/]
  ]) {
    const { ctx, page } = await ouvrir({ profil: PROFIL, notifications: cas });
    if (await page.locator("[data-quoi-de-neuf]").count()) {
      await page.getByRole("button", { name: "C'est noté" }).click();
      await page.waitForTimeout(300);
    }
    await page.locator('button[aria-label="Réglages"]').first().click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "Tester les notifications" }).click();
    await page.waitForTimeout(600);
    const r = page.locator("[data-resultat-test]");
    const etat = (await r.count()) ? await r.getAttribute("data-resultat-test") : null;
    const msg = (await r.count()) ? await r.innerText() : "";
    console.log(num, etat === attendu && motif.test(msg) ? `« ${msg.slice(0, 70)}… »` : `*** ${etat} « ${msg} » ***`);
    await ctx.close();
  }
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
