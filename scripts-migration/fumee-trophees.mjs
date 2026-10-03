/**
 * Fumee : trophees et serie de semaines tenues (onglet Seances).
 *
 *   1. un client regulier (4 semaines tenues a 3 seances, 1 seance cette
 *      semaine) voit sa serie de 4 semaines et ce qu'il reste a faire ;
 *   2. les tuiles obtenues / a venir correspondent a son historique ;
 *   3. les nouveaux trophees sont celebres, « Super ! » les memorise
 *      (cn_trophees_vus) et la banniere ne revient pas au rechargement ;
 *   4. joker : semaines declarees difficiles avec une seule seance, la serie
 *      reste intacte et le message salue la seance maintien ;
 *   5. relance du parrainage dans la celebration : la phrase du coach, la
 *      croix la ferme sans fermer la celebration et memorise la date ;
 *   6. « Inviter un ami » ouvre le partage avec le message d'invitation ;
 *      un nouveau trophee moins de 4 semaines apres : celebre, sans relance ;
 *   7. semaine difficile, reprise, ou « Premier pas » seul (1re seance) :
 *      celebration, jamais de relance ;
 *   8. client suivi depuis 2022 (date de debut et seances d'avant
 *      l'application saisies) : « Club des 750 » et « 3 ans de suivi »
 *      obtenus, prochains paliers « Club des 1000 » (980/1000) et « 5 ans de
 *      suivi » ; seuls les obtenus et le prochain de chaque famille sont
 *      affiches.
 *   9. saisie du suivi depuis les trophees : « Ajouter » ouvre la date de
 *      debut et le total de seances ; 03/01/2022 et 980 debloquent « Club
 *      des 750 » et « 3 ans de suivi », le resume s'affiche, et la carte de
 *      progres (Tendances) reprend la meme date.
 *  10. contrat en cours : formule « Suivi hebdo · 3 mois » dont la fin tombe
 *      dans 3 semaines → compte a rebours et message de fin de contrat,
 *      trophees « Contrat lancé » et « Mi-parcours » obtenus, « Contrat
 *      bouclé » a venir ; fin le lendemain → echeance en jours ;
 *      formule mensuelle → plus de message ; « Choisis ta formule » → contrat
 *      retire du profil.
 * Les tuiles attendues sont calculees avec lib/trophees.js sur le meme
 * historique : l'anciennete depend de la date du jour.
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
import { trophees, tropheesAffiches } from "../app/src/lib/trophees.js";
import { ajouterMois, etatContrat, messageFinContrat } from "../app/src/lib/contrat.js";
import { addDays } from "../app/src/lib/dates.js";

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
let difficileSansRelance = false;

/**
 * Ouvre l'onglet Seances avec un historique construit relativement au lundi
 * de la semaine en cours : `semaines` = { decalage: nombreDeSeances },
 * `difficiles` = decalages declares en semaine difficile.
 */
/** Meme historique que celui pose dans la page (voir ouvrir). */
function historique(semaines) {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const auj = new Date();
  const lundi = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - ((auj.getDay() + 6) % 7));
  const jour = (semaine, j) => iso(new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + semaine * 7 + j));
  const seances = [];
  for (const [decalage, n] of Object.entries(semaines)) {
    for (let i = 0; i < n; i++) seances.push({ id: `s${decalage}_${i}`, date: jour(Number(decalage), i * 2) });
  }
  return seances;
}
const tuilesAttendues = (semaines, profil = {}) =>
  tropheesAffiches(
    trophees({ seances: historique(semaines), profil: { sessionsPerWeek: 3, ...profil }, semainesDifficiles: {}, date: new Date().toISOString().slice(0, 10) }).liste
  ).flatMap((f) => f.tuiles);

async function ouvrir({ semaines, difficiles = [], profil = {} }) {
  const ctx = await nav.newContext(appareil("Pixel 7"));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  // Partage natif simule : on garde le texte partage pour le verifier.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (donnees) => {
        window.__partage = donnees;
      }
    });
  });
  await page.addInitScript(
    ({ semaines, difficiles, profil }) => {
      if (localStorage.getItem("coach_profile")) return;
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const auj = new Date();
      const lundi = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - ((auj.getDay() + 6) % 7));
      const jour = (semaine, j) => iso(new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + semaine * 7 + j));
      localStorage.setItem("coach_profile", JSON.stringify({
        firstName: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 88,
        activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, targetWeightKg: 80,
        trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: [], ...profil
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
    { semaines, difficiles, profil }
  );
  await page.goto("http://localhost:4647/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Séances", exact: true }).first().click();
  await page.waitForTimeout(1200);
  return { ctx, page };
}

const texteDe = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");
const PHRASE = "Bravo pour ce trophée ! Tu connais quelqu'un qui aurait besoin du même déclic ? Invite-le, ton prochain mois te coûtera moins cher.";
const relanceDe = (page) => page.locator("[data-relance-parrainage]");
const aujourdhui = (page) => page.evaluate(() => new Date().toISOString().slice(0, 10));
const memorisee = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("cn_parrainage_relance") || "null"));
async function recharger(page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Séances", exact: true }).first().click();
  await page.waitForTimeout(1000);
}
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
    const affichees = await page.$$eval("[data-trophee]", (els) => els.map((e) => e.dataset.trophee));
    const attendues = tuilesAttendues({ "-4": 3, "-3": 3, "-2": 3, "-1": 3, 0: 1 });
    const attendus = attendues.filter((t) => t.obtenu).map((t) => t.id);
    console.log(
      "2. TUILES               :",
      JSON.stringify(affichees) === JSON.stringify(attendues.map((t) => t.id)) &&
        JSON.stringify([...ids].sort()) === JSON.stringify([...attendus].sort()) &&
        ["seances-1", "seances-10", "semaines-2", "semaines-4"].every((id) => ids.includes(id)) &&
        affichees.includes("seances-25") && !affichees.includes("seances-50") &&
        /13\/25/.test(texte)
        ? `${affichees.length} tuiles (obtenus + prochain par famille), ${ids.length} obtenues, « 13/25 » vers Régulier`
        : `*** affichées ${JSON.stringify(affichees)}, attendues ${JSON.stringify(attendues.map((t) => t.id))}, obtenus ${JSON.stringify(ids)} ***`
    );

    const banniere = page.locator("[data-nouveau-trophee]");
    const avant = (await banniere.count()) && new RegExp(`${attendus.length} nouveaux trophées`).test(await banniere.innerText());

    // Relance du parrainage : dans la celebration, fermee par la croix.
    const phraseVue = (await relanceDe(page).count()) === 1 && (await relanceDe(page).innerText()).replace(/\s+/g, " ").includes(PHRASE);
    if (process.env.PARRAINAGE_RELANCE_PNG) await banniere.screenshot({ path: process.env.PARRAINAGE_RELANCE_PNG });
    await page.getByRole("button", { name: "Fermer l'invitation" }).click();
    await page.waitForTimeout(300);
    const fermee = (await relanceDe(page).count()) === 0;
    const celebrationRestee = (await banniere.count()) === 1;
    const date = await memorisee(page);
    console.log(
      "5. RELANCE PARRAINAGE   :",
      phraseVue && fermee && celebrationRestee && date === (await aujourdhui(page))
        ? "phrase du coach dans la célébration, la croix la ferme, date mémorisée"
        : `*** phrase ${phraseVue}, fermée ${fermee}, célébration ${celebrationRestee}, date ${date} ***`
    );

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
      avant && apres === 0 && auRechargement === 0 && vus.length === attendus.length
        ? `bannière « ${attendus.length} nouveaux trophées », mémorisée après « Super ! », absente au rechargement`
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
    difficileSansRelance =
      (await page.locator("[data-nouveau-trophee]").count()) === 1 && (await relanceDe(page).count()) === 0;
    await ctx.close();
  }

  // ── Inviter un ami depuis la relance ────────────────────────────
  {
    const { ctx, page } = await ouvrir({ semaines: { "-4": 3, "-3": 3, "-2": 3, "-1": 3, 0: 1 } });
    await relanceDe(page).getByRole("button", { name: /Inviter un ami/ }).click();
    await page.waitForTimeout(400);
    const partage = await page.evaluate(() => window.__partage || null);
    const fermee = (await relanceDe(page).count()) === 0;
    const date = await memorisee(page);
    // Un trophee pas encore celebre, moins de 4 semaines apres : celebration
    // seule, sans relance.
    await page.evaluate(() => localStorage.setItem("cn_trophees_vus", JSON.stringify(["seances-1", "seances-10", "semaines-2"])));
    await recharger(page);
    const celebre = (await page.locator("[data-nouveau-trophee]").count()) === 1;
    const sansRelance = (await relanceDe(page).count()) === 0;
    console.log(
      "6. INVITER UN AMI       :",
      partage && /Coach Neiram/.test(partage.text || "") && /wa\.me/.test(partage.text || "") && fermee && date === (await aujourdhui(page)) && celebre && sansRelance
        ? "partage du message d'invitation, relance fermée ; trophée suivant célébré sans relance (< 4 semaines)"
        : `*** partage ${JSON.stringify(partage)}, fermée ${fermee}, date ${date}, célébré ${celebre}, sans relance ${sansRelance} ***`
    );
    await ctx.close();
  }

  // ── Reprise : semaine precedente ratee ──────────────────────────
  {
    const { ctx, page } = await ouvrir({ semaines: { "-4": 3, "-3": 3, "-2": 3, 0: 1 } });
    const repriseSansRelance =
      (await page.locator("[data-nouveau-trophee]").count()) === 1 && (await relanceDe(page).count()) === 0;
    await ctx.close();

    // Nouveau client, premiere seance : « Premier pas » celebre, sans relance.
    const neuf = await ouvrir({ semaines: { 0: 1 } });
    const banniere = neuf.page.locator("[data-nouveau-trophee]");
    const premierPasSansRelance =
      (await banniere.count()) === 1 &&
      /Nouveau trophée/.test(await banniere.innerText()) &&
      /Premier pas/.test(await banniere.innerText()) &&
      (await relanceDe(neuf.page).count()) === 0;
    console.log(
      "7. PAS DE RELANCE       :",
      difficileSansRelance && repriseSansRelance && premierPasSansRelance
        ? "semaine difficile, reprise, « Premier pas » seul : trophées célébrés, aucune relance"
        : `*** difficile ${difficileSansRelance}, reprise ${repriseSansRelance}, premier pas ${premierPasSansRelance} ***`
    );
    await neuf.ctx.close();
  }

  // ── Client suivi depuis 2022 ────────────────────────────────────
  {
    const semaines = { "-1": 3, 0: 1 };
    const profil = { coachingStartDate: "2022-01-03", seancesAvantApp: 976 };
    const { ctx, page } = await ouvrir({ semaines, profil });
    const affichees = await page.$$eval("[data-trophee]", (els) => els.map((e) => [e.dataset.trophee, e.dataset.obtenu, e.innerText.replace(/\s+/g, " ")]));
    const parId = Object.fromEntries(affichees.map(([id, ob, t]) => [id, { ob, t }]));
    const attendues = tuilesAttendues(semaines, profil).map((t) => t.id);
    const familles = await page.$$eval("[data-famille-trophees]", (els) => els.map((e) => e.dataset.familleTrophees));
    if (process.env.TROPHEES_ANCIENS_PNG) {
      await page.locator("[data-serie-semaines]").locator("xpath=ancestor::div[.//*[@data-trophee]][1]").screenshot({ path: process.env.TROPHEES_ANCIENS_PNG });
    }
    console.log(
      "8. SUIVI DEPUIS 2022    :",
      JSON.stringify(affichees.map((a) => a[0])) === JSON.stringify(attendues) &&
        JSON.stringify(familles) === JSON.stringify(["seances", "semaines", "anciennete"]) &&
        parId["seances-750"]?.ob === "oui" &&
        parId["seances-1000"]?.ob === "non" && /980\/1000/.test(parId["seances-1000"].t) &&
        parId["anciennete-36"]?.ob === "oui" &&
        parId["anciennete-60"]?.ob === "non" && /\/60 mois/.test(parId["anciennete-60"].t)
        ? "Club des 750 et 3 ans de suivi obtenus ; prochains : Club des 1000 (980/1000) et 5 ans de suivi"
        : `*** ${JSON.stringify(affichees)} ***`
    );
    await ctx.close();
  }

  // ── Saisie du suivi depuis les trophees ─────────────────────────
  {
    const { ctx, page } = await ouvrir({ semaines: { "-1": 3, 0: 1 } });
    const bloc = page.locator("[data-suivi-coach]");
    const invitation = /Ajoute ton temps de suivi/.test(await bloc.innerText());
    await bloc.getByRole("button", { name: "Ajouter" }).click();
    await page.waitForTimeout(300);
    await bloc.getByRole("combobox", { name: "Année de début" }).selectOption("2022");
    await bloc.getByRole("combobox", { name: "Mois de début" }).selectOption("1");
    await bloc.getByRole("combobox", { name: "Jour de début" }).selectOption("3");
    const total = bloc.getByRole("textbox", { name: "Séances faites au total" });
    await total.fill("980");
    await total.evaluate((e) => e.blur());
    await page.waitForTimeout(800);
    const profil = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_profile")));
    const obtenusApres = await obtenus(page);
    if (process.env.SUIVI_TROPHEES_PNG) await bloc.screenshot({ path: process.env.SUIVI_TROPHEES_PNG });
    await bloc.getByRole("button", { name: "Fermer" }).click();
    await page.waitForTimeout(300);
    const resume = (await bloc.innerText()).replace(/\s+/g, " ");
    await page.getByRole("button", { name: "Tendances", exact: true }).first().click();
    await page.waitForTimeout(1200);
    const anneeCarte = await page.locator("[data-debut-coaching]").first().getByRole("combobox", { name: "Année de début" }).inputValue();
    const totalCarte = await page.getByRole("textbox", { name: "Séances faites au total" }).inputValue();
    console.log(
      "9. SAISIE DEPUIS TROPHÉES:",
      invitation &&
        profil.coachingStartDate === "2022-01-03" &&
        profil.seancesAvantApp === 976 &&
        obtenusApres.includes("seances-750") &&
        obtenusApres.includes("anciennete-36") &&
        /depuis le 03\/01\/2022 · 980 séances/.test(resume) &&
        anneeCarte === "2022" &&
        totalCarte === "980"
        ? "03/01/2022 et 980 séances saisis dans Séances : Club des 750 et 3 ans de suivi débloqués, même suivi dans Tendances"
        : `*** invitation ${invitation}, profil ${JSON.stringify({ d: profil.coachingStartDate, a: profil.seancesAvantApp })}, obtenus ${JSON.stringify(obtenusApres)}, résumé « ${resume.slice(0, 120)} », carte ${anneeCarte}/${totalCarte} ***`
    );
    await ctx.close();
  }

  // ── Contrat en cours : compte a rebours ─────────────────────────
  {
    const auj = new Date().toISOString().slice(0, 10);
    const debut = ajouterMois(addDays(auj, 21), -3);
    const attendu = messageFinContrat(etatContrat({ profil: { contrat: { formule: "hebdo-3", debut } }, seances: [], date: auj }));
    const [a, m, j] = debut.split("-").map(Number);
    const { ctx, page } = await ouvrir({ semaines: { "-1": 3, 0: 1 } });
    const bloc = page.locator("[data-suivi-coach]");
    await bloc.getByRole("button", { name: "Ajouter" }).click();
    await page.waitForTimeout(300);
    await bloc.getByRole("combobox", { name: "Formule du contrat" }).selectOption("hebdo-3");
    await page.waitForTimeout(300);
    await bloc.getByRole("combobox", { name: "Année de début du contrat" }).selectOption(String(a));
    await bloc.getByRole("combobox", { name: "Mois de début du contrat" }).selectOption(String(m));
    await bloc.getByRole("combobox", { name: "Jour de début du contrat" }).selectOption(String(j));
    await page.waitForTimeout(500);
    const contrat = await page.evaluate(() => JSON.parse(localStorage.getItem("coach_profile")).contrat);
    const resume = (await page.locator("[data-contrat]").innerText().catch(() => "")).replace(/\s+/g, " ");
    const message = (await page.locator("[data-fin-contrat]").innerText().catch(() => "")).replace(/\s+/g, " ");
    const tuilesContrat = await page.$$eval("[data-famille-trophees='contrat'] [data-trophee]", (els) =>
      els.map((e) => `${e.dataset.trophee.replace(/^contrat-\d{4}-\d{2}-\d{2}-/, "")}:${e.dataset.obtenu}`)
    );
    const tuilesOk = JSON.stringify(tuilesContrat) === JSON.stringify(["lance:oui", "mi-parcours:oui", "boucle:non"]);
    if (process.env.CONTRAT_PNG) await bloc.screenshot({ path: process.env.CONTRAT_PNG });
    // Derniere semaine : l'echeance passe en jours (fin demain).
    const debutProche = ajouterMois(addDays(auj, 2), -3);
    const attenduProche = messageFinContrat(etatContrat({ profil: { contrat: { formule: "hebdo-3", debut: debutProche } }, seances: [], date: auj }));
    const [a2, m2, j2] = debutProche.split("-").map(Number);
    await bloc.getByRole("combobox", { name: "Année de début du contrat" }).selectOption(String(a2));
    await bloc.getByRole("combobox", { name: "Mois de début du contrat" }).selectOption(String(m2));
    await bloc.getByRole("combobox", { name: "Jour de début du contrat" }).selectOption(String(j2));
    await page.waitForTimeout(400);
    const messageProche = (await page.locator("[data-fin-contrat]").innerText().catch(() => "")).replace(/\s+/g, " ");
    const resumeProche = (await page.locator("[data-contrat]").innerText().catch(() => "")).replace(/\s+/g, " ");
    const enJours =
      /se termine (demain|aujourd'hui|dans \d jours) :/.test(messageProche) && messageProche === attenduProche && /fin (demain|aujourd'hui|dans \d jours)/.test(resumeProche);
    await bloc.getByRole("combobox", { name: "Formule du contrat" }).selectOption("mensuel");
    await page.waitForTimeout(400);
    const mensuelSansMessage = (await page.locator("[data-fin-contrat]").count()) === 0 && /sans engagement/.test(await page.locator("[data-contrat]").innerText());
    await bloc.getByRole("combobox", { name: "Formule du contrat" }).selectOption("");
    await page.waitForTimeout(400);
    const retire = await page.evaluate(() => !("contrat" in JSON.parse(localStorage.getItem("coach_profile"))));
    console.log(
      "10. CONTRAT             :",
      contrat && contrat.formule === "hebdo-3" && contrat.debut === debut &&
        /Suivi hebdo · 3 mois · jusqu'au \d{2}\/\d{2}\/\d{4} · fin dans 3 semaines/.test(resume) &&
        attendu && message === attendu &&
        tuilesOk && enJours && mensuelSansMessage && retire
        ? `fin dans 3 semaines : « ${message} » ; trophées lancé + mi-parcours obtenus, bouclé à venir ; dernière semaine en jours : « ${messageProche} » ; mensuel sans message ; formule retirée → contrat effacé`
        : `*** contrat ${JSON.stringify(contrat)} (attendu ${debut}), résumé « ${resume} », message « ${message} » (attendu « ${attendu} »), tuiles ${JSON.stringify(tuilesContrat)}, proche « ${messageProche} » / « ${resumeProche} » (attendu « ${attenduProche} »), mensuel ${mensuelSansMessage}, retiré ${retire} ***`
    );
    await ctx.close();
  }
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
