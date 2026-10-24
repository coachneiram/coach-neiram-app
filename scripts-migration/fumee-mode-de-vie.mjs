/**
 * Fumée : mode de vie, motivation et trophées (24 octobre 2026, repris de
 * l'app Neiram).
 *
 *   1. Journal, « Mes habitudes » : choisir « Lire 10 pages » et « Pas de
 *      boisson sucrée », cocher la lecture (4 jours déjà cochés avant) :
 *      série de 5 jours, taux sur 30 jours affiché pour tous ;
 *   2. Journal, « La leçon du jour » : leçon 1, lecture, bonne réponse,
 *      action du jour, leçon notée faite (cn_lecons) ;
 *   3. Tendances, « Mes déclics » : à partir de 20 jours de journal, au
 *      moins un déclic (entraînement → énergie) et la mise en garde ;
 *   4. Entraînements, « Mon année Neiram » à côté du calendrier : les écrans
 *      défilent jusqu'au partage en story (image PNG partagée) ;
 *   5. trophées : familles Habitudes, L'école Neiram, Mon année, Multisport
 *      affichées ; les trophées déjà obtenus de ces familles sont vus sans
 *      fête au premier calcul (la bannière ne fête que les anciennes
 *      familles) ;
 *   6. un nouveau palier ensuite (7 jours de lecture → « Habitudes Argent »)
 *      est célébré normalement.
 *
 *   cd app && npm run build && cd ..
 *   CHROMIUM_PATH=/opt/pw-browsers/chromium APPAREIL="Pixel 7" node scripts-migration/fumee-mode-de-vie.mjs
 */

import { chromium } from "playwright";
import { appareil, nomAppareil, sansAides } from "./appareil.mjs";
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
await new Promise((r) => serveur.listen(4725, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await nav.newContext(appareil());
await ctx.addInitScript(sansAides);
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
const net = (t) => t.replace(/[  ]/g, " ").replace(/\s+/g, " ");

// Partage natif simulé : on garde le nom du fichier partagé.
await page.addInitScript(() => {
  Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: async (donnees) => {
      window.__partage = (donnees.files || []).map((f) => `${f.name} ${f.type} ${f.size}`);
    }
  });
});

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  // Mêmes dates que l'application (todayISO : jour UTC).
  const jour = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  localStorage.setItem("coach_profile", JSON.stringify({
    name: "Thomas", sex: "homme", age: 36, heightCm: 180, startWeightKg: 80,
    activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3,
    trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
  }));
  // 20 jours de journal : énergie haute et stress bas les jours d'entraînement.
  const seances = [];
  const journal = [];
  for (let i = 1; i <= 20; i++) {
    const sport = i % 2 === 0;
    journal.push({ id: "f" + i, date: jour(i), energy: sport ? 4.5 : 3, stress: sport ? 3 : 6, sleepHours: 7 });
    if (sport) seances.push({ id: "s" + i, date: jour(i), durationMin: 60, exercises: [{ name: "Squat", sets: "3", reps: "8", weight: "60" }] });
  }
  for (const n of [24, 26, 28]) seances.push({ id: "s" + n, date: jour(n), durationMin: 60, exercises: [{ name: "Squat", sets: "3", reps: "8", weight: "60" }] });
  seances.push({ id: "c1", date: jour(25), durationMin: 45, activite: { id: "course", label: "Course à pied", emoji: "🏃", duree: 45, distanceKm: 8, rpe: 6 }, exercises: [] });
  localStorage.setItem("coach_sessions", JSON.stringify(seances));
  localStorage.setItem("coach_daily_form", JSON.stringify(journal));
  // La lecture a déjà été cochée les 4 jours précédents, avant d'être choisie.
  const coches = {};
  for (let i = 1; i <= 4; i++) coches[jour(i)] = ["lecture"];
  localStorage.setItem("cn_habitudes", JSON.stringify({ choisies: [], perso: [], coches }));
  // Trophées des familles d'avant déjà vus : seule la règle des nouvelles familles joue.
  localStorage.setItem("cn_trophees_vus", JSON.stringify(["seances-1", "seances-10"]));
});

const panneau = () => page.locator(".modal-panel").last();
const onglet = async (nom) => {
  await page.getByRole("button", { name: nom }).last().click();
  await page.waitForTimeout(700);
};

try {
  await page.goto("http://localhost:4725/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await onglet(/^Journal$/);

  // 1. Habitudes.
  const carte = page.locator("[data-habitudes]");
  await carte.getByRole("button", { name: "Choisir" }).click();
  await page.waitForTimeout(300);
  await panneau().locator('[data-choix-habitude="lecture"]').check();
  await panneau().locator('[data-choix-habitude="sans-soda"]').check();
  await panneau().getByRole("button", { name: "C'est parti" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Cocher : Lire 10 pages" }).click();
  await page.waitForTimeout(300);
  const ligne = page.locator('[data-habitude="lecture"]');
  const serie = Number(await ligne.getAttribute("data-serie-habitude"));
  const texteLigne = net(await ligne.innerText());
  const presse = await ligne.getByRole("button").getAttribute("aria-pressed");
  const etatHab = await page.evaluate(() => JSON.parse(localStorage.getItem("cn_habitudes") || "null"));
  const auj = await page.evaluate(() => new Date().toISOString().slice(0, 10));
  console.log(
    "1. MES HABITUDES        :",
    Number(await carte.getAttribute("data-habitudes")) === 2 && serie === 5 && presse === "true" && /🔥 5 jours/.test(texteLigne) && /% sur 30 jours/.test(texteLigne) && (etatHab.coches[auj] || []).includes("lecture")
      ? `2 habitudes choisies, lecture cochée : « ${texteLigne} »`
      : `*** ${await carte.getAttribute("data-habitudes")} habitude(s), série ${serie}, pressé ${presse}, « ${texteLigne} » ***`
  );

  // 2. Leçon du jour.
  const lecon = page.locator("[data-lecon]");
  const id = await lecon.getAttribute("data-lecon");
  await lecon.getByRole("button", { name: "Lire (2 min)" }).click();
  await page.waitForTimeout(200);
  await lecon.locator('[data-option="1"]').click();
  await page.waitForTimeout(300);
  const retour = net(await lecon.locator("[data-lecon-feedback]").innerText().catch(() => ""));
  const lecons = await page.evaluate(() => JSON.parse(localStorage.getItem("cn_lecons") || "null"));
  const leconOk = id === "l01-pourquoi" && /Exact !/.test(retour) && /Ton action du jour/.test(retour) && lecons && lecons.faites[id] === auj;
  console.log(
    "2. LEÇON DU JOUR        :",
    leconOk ? `leçon 1 lue, bonne réponse, action du jour, notée faite (${/La leçon du jour/i.test(await lecon.innerText()) ? "titre ok" : "titre ?"})` : `*** ${id} « ${retour.slice(0, 120)} » ${JSON.stringify(lecons)} ***`
  );

  // 3. Déclics.
  await onglet(/^Tendances$/);
  const declics = page.locator("[data-declics]");
  const nb = Number(await declics.getAttribute("data-declics").catch(() => "0"));
  const texteDeclics = net(await declics.innerText().catch(() => ""));
  console.log(
    "3. MES DÉCLICS          :",
    nb >= 1 && /Les jours où tu t'entraînes, ton énergie est plus haut/.test(texteDeclics) && /pas des preuves de cause à effet/.test(texteDeclics)
      ? `${nb} déclic(s), dont « entraînement → énergie », avec la mise en garde`
      : `*** ${nb} déclic(s) : « ${texteDeclics.slice(0, 160)} » ***`
  );

  // 4. Mon année Neiram.
  await onglet(/^(Séances|Entraînements)$/);
  const bilan = page.locator("[data-bilan-annee]");
  const titreBilan = net(await bilan.innerText().catch(() => ""));
  const ordre = await page.evaluate(() => {
    const cal = document.querySelector("[data-calendrier]");
    const b = document.querySelector("[data-bilan-annee]");
    return !!(cal && b && cal.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  await bilan.getByRole("button", { name: "Voir mon année" }).click();
  await page.waitForTimeout(300);
  const ecrans = [];
  for (let k = 0; k < 8; k++) {
    ecrans.push(await panneau().locator("[data-ecran-bilan]").getAttribute("data-ecran-bilan"));
    const suivant = panneau().getByRole("button", { name: "Suivant" });
    if (!(await suivant.count())) break;
    await suivant.click();
    await page.waitForTimeout(150);
  }
  await panneau().getByRole("button", { name: "📣 Partager mon année en story" }).click();
  await page.waitForTimeout(1500);
  const partage = await page.evaluate(() => window.__partage || null);
  const infoPartage = net(await panneau().innerText());
  console.log(
    "4. MON ANNÉE NEIRAM     :",
    /Mon année Neiram/i.test(titreBilan) && ordre && ecrans[0] === "seances" && ecrans.includes("sports") && ecrans.includes("regularite") && partage && /^mon-annee-neiram-\d{4}\.png image\/png [1-9]/.test(partage[0]) && /Partagé/.test(infoPartage)
      ? `après le calendrier, écrans ${ecrans.join(" → ")}, story partagée (${partage[0].split(" ")[0]})`
      : `*** « ${titreBilan.slice(0, 80)} », après calendrier ${ordre}, écrans ${JSON.stringify(ecrans)}, partage ${JSON.stringify(partage)} ***`
  );
  await panneau().getByRole("button").first().click();
  await page.waitForTimeout(300);

  // 5. Trophées : nouvelles familles affichées, sans avalanche de fête.
  const familles = await page.$$eval("[data-famille-trophees]", (els) => els.map((e) => e.dataset.familleTrophees));
  const obtenus = await page.$$eval("[data-trophee]", (els) => els.filter((e) => e.dataset.obtenu === "oui").map((e) => e.dataset.trophee));
  const banniere = net(await page.locator("[data-nouveau-trophee]").innerText().catch(() => ""));
  const vus = await page.evaluate(() => JSON.parse(localStorage.getItem("cn_trophees_vus") || "[]"));
  const attendues = ["habitudes", "lecons", "annee", "sports"];
  const nouveauxVus = ["habitudes-3", "lecons-1", "annee-12", "sports-2"];
  console.log(
    "5. NOUVEAUX TROPHÉES    :",
    attendues.every((f) => familles.includes(f)) &&
      nouveauxVus.every((t) => obtenus.includes(t) && vus.includes(t)) &&
      vus.includes("familles-mode-de-vie") &&
      !/Habitudes|école|Mon année|Multisport/.test(banniere)
      ? `familles ${familles.join(", ")} ; ${nouveauxVus.join(", ")} obtenus et vus sans fête${banniere ? ` (bannière : « ${banniere.slice(0, 60)} »)` : ""}`
      : `*** familles ${JSON.stringify(familles)}, obtenus ${JSON.stringify(obtenus)}, vus ${JSON.stringify(vus)}, bannière « ${banniere} » ***`
  );

  // Les anciennes familles fêtées (« Bien parti »…) sont mémorisées.
  if (banniere) await page.getByRole("button", { name: "Super !" }).click();
  await page.waitForTimeout(300);

  // 6. Un nouveau palier ensuite : célébré, seul.
  await page.evaluate(() => {
    const e = JSON.parse(localStorage.getItem("cn_habitudes"));
    for (let i = 0; i <= 6; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      e.coches[d] = [...new Set([...(e.coches[d] || []), "lecture"])];
    }
    localStorage.setItem("cn_habitudes", JSON.stringify(e));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await onglet(/^(Séances|Entraînements)$/);
  const fete = net(await page.locator("[data-nouveau-trophee]").innerText().catch(() => ""));
  console.log(
    "6. PALIER SUIVANT FÊTÉ  :",
    /Nouveau trophée/.test(fete) && /Habitudes Argent/.test(fete) && (await page.locator('[data-trophee="habitudes-7"][data-obtenu="oui"]').count()) === 1
      ? `7 jours de lecture : « ${fete.slice(0, 80)} »`
      : `*** bannière « ${fete} » ***`
  );
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log(`APPAREIL : ${nomAppareil()}`);
console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
