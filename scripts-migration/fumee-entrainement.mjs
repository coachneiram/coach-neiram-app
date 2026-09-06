/**
 * Fumee : tout le cote entrainement.
 *
 * C'est la moitie de l'application qu'aucune verification au navigateur ne
 * touchait. Les tests unitaires couvrent les calculs — 1RM, progression des
 * charges, taux de respect — mais personne n'avait jamais verifie que ces
 * chiffres ARRIVENT jusqu'a l'ecran.
 *
 * Le parcours joue : creer un creneau, pointer une seance avec charge et
 * RPE, puis aller lire ce que l'application en deduit dans quatre ecrans
 * differents (records, force athletique, progression, plan de semaine).
 *
 * DEUX PROFILS, PARCE QUE L'ONGLET N'AFFICHE PAS LA MEME CHOSE
 *
 * Trois ecrans sont conditionnes, et la premiere version de ce script s'y
 * est trompee : elle a conclu a des boutons absents alors que le profil
 * amorce ne les activait pas.
 *
 *   - creneaux, semaine difficile et bibliotheque de seances : coaching
 *     « en ligne » seulement ;
 *   - force athletique : objectif « performance » seulement.
 *
 * Le script joue donc les deux profils, et verifie les deux sens : que
 * chaque ecran apparait quand il doit, ET qu'il n'apparait pas chez l'autre
 * cliente. Montrer les creneaux a quelqu'un qui vient en salle serait un
 * defaut aussi reel que de les cacher a quelqu'un a distance.
 *
 * « Semaine difficile » merite l'attention : c'est elle qui declenche une
 * alerte vers le coach, et cette chaine vient d'etre reparee sans que son
 * declencheur cote client soit exerce une seule fois.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-entrainement.mjs
 */

import { chromium } from "playwright";
import { appareil, nomAppareil } from "./appareil.mjs";
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
await new Promise((r) => serveur.listen(4680, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];

const AUJ = new Date().toISOString().slice(0, 10);
const ilYA = (j) => new Date(Date.now() - j * 86400000).toISOString().slice(0, 10);

/** Profil de base ; le mode de coaching et l'objectif varient selon la passe. */
const profil = (coachingMode, goal, creneaux) => ({
  firstName: "Marien", sex: "homme", age: 28, heightCm: 174, startWeightKg: 70,
  activityLevel: "modere", goal, sessionsPerWeek: 4, targetWeightKg: 75,
  trainingMode: "app", coachingMode, dietType: "aucun", allergies: [],
  slots: creneaux || []
});

/**
 * Un historique reel : trois developpes couches, charge croissante. Sans
 * lui, records et progression n'ont rien a montrer et le script ne
 * prouverait rien.
 */
const SEANCES = [
  ["s1", ilYA(21), 60],
  ["s2", ilYA(14), 62.5],
  ["s3", ilYA(7), 65]
].map(([id, date, poids]) => ({
  id, date, routineId: "r1", durationMin: 62, rpe: 8,
  exercises: [{ id: "e" + id, name: "Développé couché", mode: "muscu", sets: 4, reps: 8, weight: String(poids), rpe: "8", repUnit: "reps" }]
}));

const lire = (page, k) => page.evaluate((c) => JSON.parse(localStorage.getItem(c) || "null"), k);
const corps = (page) => page.locator("body").innerText();

/** Cherche une section par son titre et rend les lignes qui suivent. */
async function section(page, titre, lignes = 6) {
  const t = await corps(page);
  const i = t.toUpperCase().indexOf(titre.toUpperCase());
  return i < 0 ? null : t.slice(i, i + 500).split("\n").slice(0, lignes).join(" | ");
}

/** Ouvre l'application avec un profil donne, sur l'onglet entrainement. */
async function ouvrir(unProfil) {
  const page = await (await nav.newContext(appareil())).newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript((d) => {
    localStorage.clear();
    localStorage.setItem("coach_profile", JSON.stringify(d.profil));
    localStorage.setItem("coach_routines", JSON.stringify([{ id: "r1", name: "Haut du corps", description: "Pecs / Dos", color: "#2DD4BF" }]));
    localStorage.setItem("coach_sessions", JSON.stringify(d.seances));
    localStorage.setItem("coach_body_logs", JSON.stringify([{ id: "b1", date: d.auj, weightKg: 70.4 }]));
  }, { profil: unProfil, seances: SEANCES, auj: AUJ });
  await page.goto("http://localhost:4680/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Séances", exact: true }).first().click();
  await page.waitForTimeout(700);
  return page;
}

const marque = (present, attendu) =>
  present === attendu ? (present ? "présent" : "absent, comme attendu") : `*** ${present ? "PRÉSENT À TORT" : "ABSENT"} ***`;

try {
  // ══ PASSE 1 : cliente en salle, objectif prise de masse ═══════════
  console.log("── PROFIL EN SALLE (présentiel, prise de masse) ──");
  let page = await ouvrir(profil("presentiel", "prise"));

  const rec = await section(page, "Records", 8);
  console.log("  Records            :", rec ? rec.slice(0, 120) : "*** SECTION ABSENTE ***");
  console.log("   charge max 65 kg  :", /65/.test(rec || "") ? "présente" : "*** ABSENTE ***");

  const prog = await section(page, "Progression des charges", 5);
  console.log("  Progression        :", prog ? prog.slice(0, 120) : "*** SECTION ABSENTE ***");

  const plan = await section(page, "Programme de la semaine", 4);
  console.log("  Plan de semaine    :", plan ? "affiché" : "*** SECTION ABSENTE ***");

  // Ces trois-la ne doivent PAS apparaitre pour une cliente en salle.
  let t = await corps(page);
  console.log("  Créneaux           :", marque(/mes créneaux/i.test(t), false));
  console.log("  Semaine difficile  :", marque(/semaine difficile/i.test(t), false));
  console.log("  Force athlétique   :", marque(/force athlétique/i.test(t), false));
  await page.context().close();

  // ══ PASSE 2 : cliente a distance, objectif performance ════════════
  console.log("\n── PROFIL À DISTANCE (en ligne, performance) ──");
  // Le jour est un identifiant texte (« mon » a « sun »). Un numero est
  // accepte sans broncher mais s'affiche « — » : la premiere version de ce
  // script semait « 1 », et le tiret dans sa sortie etait le seul indice.
  const lundi = "mon";
  const creneaux = [{ id: "c1", day: lundi, time: "18:00", place: "Salle" }];
  page = await ouvrir(profil("enligne", "performance", creneaux));
  t = await corps(page);
  console.log("  Créneaux           :", marque(/mes créneaux/i.test(t), true));
  console.log("  Semaine difficile  :", marque(/semaine difficile/i.test(t), true));
  console.log("  Force athlétique   :", marque(/force athlétique/i.test(t), true));

  // ── Force athletique : saisir un maxi, verifier qu'il est retenu ──
  const champMaxi = page.getByPlaceholder("1RM kg").first();
  if (!(await champMaxi.count())) {
    console.log("  Maxi 1RM           : *** CHAMP ABSENT ***");
  } else {
    await champMaxi.fill("100");
    await page.waitForTimeout(800);
    const maxis = await lire(page, "cn_pl_1rm");
    console.log("  Maxi 1RM           :", maxis && Object.keys(maxis).length ? JSON.stringify(maxis).slice(0, 80) : "*** NON ENREGISTRÉ ***");
  }

  // ── Semaine difficile : le declencheur d'alerte coach ─────────────
  const bouton = page.getByRole("button", { name: /passer en mode maintien/i }).first();
  if (!(await bouton.count())) {
    console.log("  Mode maintien      : *** BOUTON ABSENT ***");
  } else {
    await bouton.click();
    await page.waitForTimeout(900);
    const apres = await corps(page);
    const memoire = await lire(page, "cn_hard_weeks");
    console.log("  Mode maintien      :", /mode maintien activé/i.test(apres) ? "activé" : "*** PAS ACTIVÉ ***");
    console.log("   en mémoire        :", memoire && Object.keys(memoire).length ? JSON.stringify(memoire).slice(0, 100) : "*** RIEN ENREGISTRÉ ***");
    console.log("   séance proposée   :", /min/i.test(apres) ? "affichée" : "*** ABSENTE ***");

    // Pointer la seance maintien : sans ce pointage, le mode ne compte pas
    // comme creneau tenu et toute la mecanique ne sert a rien.
    const pointer = page.getByRole("button", { name: /séance maintien faite/i }).first();
    if (!(await pointer.count())) {
      console.log("   pointage          : *** BOUTON ABSENT ***");
    } else {
      const avant = ((await lire(page, "coach_sessions")) || []).length;
      await pointer.click();
      await page.waitForTimeout(1000);
      const apresN = ((await lire(page, "coach_sessions")) || []).length;
      console.log("   pointage          :", apresN > avant ? `${avant} → ${apresN} séances` : "*** NON ENREGISTRÉ ***");
    }
  }

  // ── Le maintien compte-t-il vraiment comme un creneau tenu ? ──────
  //
  // C'est la promesse faite au client, mot pour mot : « une seance maintien
  // compte comme un creneau tenu ». Sans elle, basculer en maintien ferait
  // baisser son taux de respect — soit exactement l'inverse de ce que le
  // bouton propose, et le decouragement au pire moment.
  const cre = await section(page, "Mes créneaux cette semaine", 6);
  console.log("  Semaine des créneaux:", cre ? cre.slice(0, 130) : "*** SECTION ABSENTE ***");
  console.log("   maintien = créneau tenu :", /1\/1 honorés/.test(cre || "") ? "oui, le créneau manqué est rattrapé" : "*** NON — le taux de respect ne suit pas ***");
  await page.context().close();
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("\nERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
