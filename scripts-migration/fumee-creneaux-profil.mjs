/**
 * Fumee : creer ses creneaux depuis le profil.
 *
 * C'est l'entree de toute la mecanique d'alertes du coach. Un creneau
 * declare est la reference a laquelle le pointage est compare : sans lui,
 * aucun manque n'est detectable, aucune alerte ne part, et le taux de
 * respect n'existe pas.
 *
 * Rien n'avait jamais exerce ce chemin. La chaine d'alertes vient pourtant
 * d'etre reparee de bout en bout — en partant du principe que les creneaux
 * arrivent bien jusqu'au stockage.
 *
 * Le script cree un creneau au jour d'hier, sans le pointer, et verifie une
 * regle facile a casser sans s'en rendre compte : un creneau ne compte
 * QU'A PARTIR du jour ou il a ete declare. Une date anterieure s'affiche
 * « Avant la mise en place du creneau · Non suivi », et ne pese ni sur le
 * taux de respect ni sur les alertes.
 *
 * Sans cette regle, une cliente qui declare ses creneaux au bout de trois
 * semaines de suivi verrait aussitot une volee de seances manquees qu'elle
 * n'a jamais ratees — et son coach recevrait une alerte pour rien.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-creneaux-profil.mjs
 */

import { chromium, devices } from "playwright";
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
await new Promise((r) => serveur.listen(4681, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await (await nav.newContext({ ...devices["iPhone 13"] })).newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));

// Hier, pour que le creneau cree soit deja passe : un creneau a venir ne
// prouverait rien, puisqu'il n'est ni tenu ni manque.
//
// Les jours sont des identifiants TEXTE (« mon » a « sun »), pas des
// numeros. Semer un numero passe silencieusement : le creneau existe, mais
// son jour s'affiche « — » et ne correspond a aucune date.
const JOURS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const JOUR_HIER = JOURS[new Date(Date.now() - 86400000).getDay()];

await page.addInitScript(() => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Sophie", sex: "femme", age: 34, heightCm: 165, startWeightKg: 62,
    activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, targetWeightKg: 58,
    // « en ligne » : c'est le mode ou les creneaux existent.
    trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: [], slots: []
  }));
  localStorage.setItem("coach_sessions", JSON.stringify([]));
});

const lire = (k) => page.evaluate((c) => JSON.parse(localStorage.getItem(c) || "null"), k);
const corps = () => page.locator("body").innerText();

try {
  await page.goto("http://localhost:4681/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  // ── 1. Créer un créneau depuis les réglages ──────────────────────
  await page.locator('button[aria-label="Réglages"]').first().tap();
  await page.waitForTimeout(800);
  const modale = page.locator(".modal-panel").last();

  const ajouter = modale.getByRole("button", { name: /ajouter un créneau/i }).first();
  console.log("1. BOUTON D'AJOUT     :", (await ajouter.count()) ? "présent" : "*** ABSENT ***");
  if (!(await ajouter.count())) throw new Error("sans ce bouton, aucun créneau n'est créable");

  await ajouter.click();
  await page.waitForTimeout(500);

  // La ligne creee : un jour, une heure, un lieu.
  //
  // Le selecteur de jour n'est PAS le dernier du formulaire : niveau
  // d'activite et regime le suivent dans le DOM. On le reconnait a son
  // contenu, seul repere stable si l'ordre des champs change un jour.
  const listeJours = modale.locator("select").filter({ has: page.locator('option[value="mon"]') }).last();
  if (!(await listeJours.count())) throw new Error("aucun sélecteur de jour dans la ligne de créneau");
  await listeJours.selectOption(JOUR_HIER);
  const heures = modale.locator('input[type="time"]');
  await heures.last().fill("18:30");
  const lieux = modale.getByPlaceholder("Lieu");
  await lieux.last().fill("Parc");
  await page.waitForTimeout(400);

  await modale.getByRole("button", { name: "Enregistrer", exact: true }).first().click();
  await page.waitForTimeout(900);

  const profil = await lire("coach_profile");
  const creneaux = (profil && profil.slots) || [];
  console.log("2. CRÉNEAU ENREGISTRÉ :", creneaux.length
    ? `jour ${creneaux[0].day} · ${creneaux[0].time} · ${creneaux[0].place}`
    : "*** AUCUN — la saisie n'atteint pas le stockage ***");

  // ── 3. Survit-il au redémarrage ? ────────────────────────────────
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const apres = ((await lire("coach_profile")) || {}).slots || [];
  console.log("3. APRÈS REDÉMARRAGE  :", apres.length ? `${apres.length} créneau conservé` : "*** PERDU ***");

  // ── 4. L'application le compte-t-elle comme manqué ? ─────────────
  //
  // C'est ce comptage qui declenche, plus tard, l'alerte au coach. Un
  // creneau enregistre mais jamais compare au pointage ne servirait a rien.
  await page.getByRole("button", { name: "Séances", exact: true }).first().click();
  await page.waitForTimeout(900);
  const t = await corps();
  const i = t.toUpperCase().indexOf("MES CRÉNEAUX CETTE SEMAINE");
  const bloc = i < 0 ? "" : t.slice(i, i + 320).replace(/\n+/g, " | ");
  console.log("4. DANS LA SEMAINE    :", bloc ? bloc.slice(0, 150) : "*** SECTION ABSENTE ***");
  console.log("   le créneau apparaît :", /18:30/.test(bloc) && /Parc/.test(bloc) ? "avec son heure et son lieu" : "*** INCOMPLET ***");

  // Le jour affiche doit correspondre a celui choisi. Un identifiant non
  // reconnu s'afficherait « — » sans autre signe.
  const JOURS_FR = { mon: "Lundi", tue: "Mardi", wed: "Mercredi", thu: "Jeudi", fri: "Vendredi", sat: "Samedi", sun: "Dimanche" };
  console.log("   jour affiché       :", bloc.includes(JOURS_FR[JOUR_HIER]) ? JOURS_FR[JOUR_HIER] : `*** ATTENDU ${JOURS_FR[JOUR_HIER]} ***`);

  // ── 5. La règle : pas de reproche rétroactif ─────────────────────
  const retroactif = /Avant la mise en place du créneau/i.test(bloc) && /Non suivi/i.test(bloc);
  console.log("5. PAS DE REPROCHE    :", retroactif
    ? "la date antérieure est « Non suivi », comme il se doit"
    : "*** LA DATE ANTÉRIEURE EST COMPTÉE CONTRE LA CLIENTE ***");
  console.log("   taux de respect    :", bloc.match(/\d+\/\d+ honorés/)?.[0] || "*** ABSENT ***",
    /0\/0 honorés/.test(bloc) ? "— rien à honorer encore, correct" : "");
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
