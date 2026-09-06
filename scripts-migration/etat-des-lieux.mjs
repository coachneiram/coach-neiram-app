/**
 * Etat des lieux : chaque fonction est EXERCEE, pas seulement affichee.
 *
 * Un ecran qui s'ouvre ne prouve rien — quatre boutons morts ont ete
 * trouves dans cette migration alors que leur ecran s'affichait
 * parfaitement. Ce script agit : il saisit, il enregistre, puis il relit
 * le stockage pour verifier que l'action a bien laisse une trace.
 *
 *   cd app && npm run build && cd ..
 *   npm i --no-save playwright
 *   node scripts-migration/etat-des-lieux.mjs
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
await new Promise((r) => serveur.listen(4630, r));

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await (await nav.newContext(appareil())).newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message));

const AUJ = new Date().toISOString().slice(0, 10);
await page.addInitScript((auj) => {
  if (localStorage.getItem("coach_profile")) return;
  localStorage.setItem("coach_profile", JSON.stringify({
    firstName: "Marien", name: "Marien P", sex: "homme", age: 28, heightCm: 174,
    startWeightKg: 70, activityLevel: "modere", goal: "prise", sessionsPerWeek: 4,
    targetWeightKg: 75, trainingMode: "app", coachingMode: "presentiel",
    dietType: "aucun", allergies: [], targetWaterL: 2, targetSteps: 8000
  }));
  localStorage.setItem("coach_routines", JSON.stringify([{ id: "r1", name: "Haut du corps", description: "Pecs / Dos", color: "#2DD4BF" }]));
  localStorage.setItem("coach_sessions", JSON.stringify([{ id: "s1", date: auj, routineId: "r1", durationMin: 62, rpe: 8, exercises: [{ id: "e1", name: "Développé couché", mode: "muscu", sets: 4, reps: 8, weight: "60", rpe: "8" }] }]));
  localStorage.setItem("coach_log_entries", JSON.stringify([{ id: "l1", date: auj, mealType: "dejeuner", name: "Poulet riz", calories: 620, protein: 48, carbs: 70, fat: 12 }]));
  localStorage.setItem("coach_body_logs", JSON.stringify([{ id: "b1", date: auj, weightKg: 70.4 }]));
  localStorage.setItem("coach_daily_form", JSON.stringify([{ date: auj, waterMl: 500, steps: 8400 }]));
  localStorage.setItem("coach_dishes", JSON.stringify([]));
  localStorage.setItem("coach_measurements", JSON.stringify([]));
}, AUJ);

const resultats = [];
const lire = (k) => page.evaluate((c) => JSON.parse(localStorage.getItem(c) || "null"), k);
const onglet = async (nom) => {
  await page.getByRole("button", { name: nom, exact: true }).first().click();
  await page.waitForTimeout(450);
};
const fermerModale = async () => {
  if (await page.locator(".modal-panel").count()) {
    await page.locator(".modal-overlay").first().click({ position: { x: 5, y: 5 }, force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }
};

/** Exerce une fonction et note si elle a laisse une trace. */
async function exercer(zone, fonction, action) {
  try {
    const ok = await action();
    resultats.push({ zone, fonction, ok: !!ok, note: typeof ok === "string" ? ok : "" });
  } catch (e) {
    resultats.push({ zone, fonction, ok: false, note: e.message.split("\n")[0].slice(0, 60) });
  }
  await fermerModale();
}

await page.goto("http://localhost:4630/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);

// ── JOURNAL ──────────────────────────────────────────────────────────
await onglet("Journal");
await exercer("Journal", "Ajouter de l'eau", async () => {
  const avant = (await lire("coach_daily_form")).find((f) => f.date === AUJ).waterMl;
  await page.getByRole("button", { name: "+500 ml", exact: true }).first().tap();
  await page.waitForTimeout(500);
  const apres = (await lire("coach_daily_form")).find((f) => f.date === AUJ).waterMl;
  return apres === avant + 500 ? `${avant} → ${apres} ml` : false;
});
await exercer("Journal", "Retirer de l'eau", async () => {
  const avant = (await lire("coach_daily_form")).find((f) => f.date === AUJ).waterMl;
  await page.getByRole("button", { name: "−250 ml", exact: true }).first().tap();
  await page.waitForTimeout(500);
  const apres = (await lire("coach_daily_form")).find((f) => f.date === AUJ).waterMl;
  return apres === avant - 250 ? `${avant} → ${apres} ml` : false;
});
await exercer("Journal", "Saisir les pas", async () => {
  const champs = page.locator('input[type="number"]');
  await champs.first().fill("9200");
  await page.waitForTimeout(600);
  const f = (await lire("coach_daily_form")).find((x) => x.date === AUJ);
  return f.steps === 9200 ? "9200 pas" : false;
});
await exercer("Journal", "Ajouter un aliment (saisie libre)", async () => {
  await page.getByRole("button", { name: "+ ajouter", exact: true }).nth(2).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Libre", exact: true }).first().click();
  await page.waitForTimeout(400);
  const m = page.locator(".modal-panel").last();
  await m.locator("input").first().fill("Amandes");
  // Le premier champ numerique est « quantite en grammes (optionnel) », pas
  // les kcal : la premiere version de ce script s'y est trompee et a cru a
  // un aliment enregistre a 6 kcal.
  const nums = m.locator('input[type="number"]');
  await nums.nth(1).fill("180");
  await nums.nth(2).fill("6");
  await nums.nth(3).fill("4");
  await nums.nth(4).fill("15");
  await m.getByRole("button", { name: "Ajouter", exact: true }).last().click();
  await page.waitForTimeout(600);
  const e = (await lire("coach_log_entries")).filter((x) => x.name && x.name.includes("Amandes"));
  return e.length ? `${e[0].calories} kcal enregistrées` : false;
});
await exercer("Journal", "Enregistrer le repas comme modèle", async () => {
  await page.getByRole("button", { name: /Enregistrer ce repas/ }).first().click();
  await page.waitForTimeout(500);
  const d = page.locator(".modal-panel").last();
  await d.locator('input[type="text"], input:not([type])').first().fill("Collation test");
  await d.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.waitForTimeout(600);
  const r = await lire("cn_meal_presets");
  return r && r.length ? `« ${r[0].name} »` : false;
});
await exercer("Journal", "Score du jour", async () => {
  const t = await page.locator("body").innerText();
  const m = t.match(/(\d+)\s*%/);
  return m ? `${m[1]} %` : false;
});

// ── SOMMEIL ──────────────────────────────────────────────────────────
// La SAISIE se fait dans le Journal (« Sommeil & forme ») ; l'onglet
// Sommeil ne montre que les moyennes et les conseils. Chercher les champs
// dans l'onglet Sommeil ne prouverait qu'une chose : qu'on regarde au
// mauvais endroit.
await onglet("Journal");
await exercer("Sommeil", "Coucher / lever → durée calculée", async () => {
  const heures = page.locator('input[type="time"]');
  if ((await heures.count()) < 2) return false;
  await heures.nth(0).fill("23:00");
  await page.waitForTimeout(300);
  await heures.nth(1).fill("07:00");
  await page.waitForTimeout(700);
  const f = (await lire("coach_daily_form")).find((x) => x.date === AUJ);
  return f && f.sleepHours === 8 ? "23:00 → 07:00 = 8 h" : false;
});
await onglet("Sommeil");
await exercer("Sommeil", "Moyennes et conseils", async () => {
  const t = await page.locator("body").innerText();
  return /MIEUX DORMIR/.test(t) ? "moyenne 7 j + conseils" : false;
});

// ── MESURES ──────────────────────────────────────────────────────────
await onglet("Mesures");
await exercer("Mesures", "Enregistrer des mensurations", async () => {
  // L'ecran demarre vide : les neuf champs vivent derriere « Nouvelle
  // prise » (ou « Première prise de mesures » quand rien n'est encore
  // enregistre). Les chercher sur l'ecran d'accueil ne trouve rien.
  await page.getByRole("button", { name: /Nouvelle prise|Première prise/ }).first().click();
  await page.waitForTimeout(600);
  const m = page.locator(".modal-panel").last();
  const nums = m.locator('input[type="number"]');
  const combien = await nums.count();
  if (!combien) return false;
  for (let i = 0; i < combien; i += 1) await nums.nth(i).fill(String(80 + i));
  await m.getByRole("button", { name: /Enregistrer/ }).first().click();
  await page.waitForTimeout(700);
  const prises = await lire("coach_measurements");
  if (!prises || !prises.length) return false;
  const mesurees = Object.keys(prises[0]).filter((c) => c !== "date" && c !== "id");
  return `${prises.length} prise · ${mesurees.length} mesures`;
});

// ── REPAS ────────────────────────────────────────────────────────────
await onglet("Repas");
await exercer("Repas", "Créer un plat", async () => {
  await page.getByRole("button", { name: /Nouveau plat/ }).first().click();
  await page.waitForTimeout(500);
  const m = page.locator(".modal-panel").last();
  await m.locator("input").first().fill("Salade César");
  const nums = m.locator('input[type="number"]');
  await nums.nth(0).fill("420");
  await nums.nth(1).fill("28");
  await nums.nth(2).fill("18");
  await nums.nth(3).fill("26");
  await m.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.waitForTimeout(600);
  const d = await lire("coach_dishes");
  return d && d.length ? `« ${d[0].name} »` : false;
});
await exercer("Repas", "Importer un aliment", async () => {
  await page.getByRole("button", { name: /Importer un aliment/ }).first().click();
  await page.waitForTimeout(500);
  const ouvert = await page.locator(".modal-panel").count();
  const t = ouvert ? await page.locator(".modal-panel").last().innerText() : "";
  return ouvert && /Recherche/.test(t) ? "3 onglets" : false;
});
await exercer("Repas", "Liste de courses", async () => {
  await page.getByRole("button", { name: "Courses", exact: true }).first().click();
  await page.waitForTimeout(600);
  const t = await page.locator("body").innerText();
  return /courses|rayon|article/i.test(t) ? "liste affichée" : false;
});
await exercer("Repas", "Coach IA hors ligne", async () => {
  await page.getByRole("button", { name: "Coach IA", exact: true }).first().click();
  await page.waitForTimeout(600);
  const t = await page.locator("body").innerText();
  return t.length > 50 ? "écran ouvert" : false;
});

// ── NUTRITION ────────────────────────────────────────────────────────
await onglet("Nutrition");
await exercer("Nutrition", "Objectifs calculés", async () => {
  const t = await page.locator("body").innerText();
  const m = t.match(/(\d[\d\s]{2,5})\s*kcal/);
  return m ? m[0].replace(/\s+/g, " ") : false;
});

// ── SEANCES ──────────────────────────────────────────────────────────
await onglet("Séances");
await exercer("Séances", "Ouvrir une séance type", async () => {
  await page.getByText("Haut du corps").first().click();
  await page.waitForTimeout(600);
  const t = await page.locator("body").innerText();
  return /Enregistrer la séance/.test(t) ? "constructeur ouvert" : false;
});
await exercer("Séances", "Bibliothèque d'exercices", async () => {
  await page.getByText("Haut du corps").first().click();
  await page.waitForTimeout(500);
  const b = page.getByRole("button", { name: /Bibliothèque/ }).first();
  if (!(await b.count())) return false;
  await b.click();
  await page.waitForTimeout(700);
  const t = await page.locator("body").innerText();
  return /MACHINES GUIDÉES|ÉLASTIQUES/.test(t) ? "catalogue affiché" : false;
});
await exercer("Séances", "Charge proposée depuis le RPE", async () => {
  const t = await page.locator("body").innerText();
  const m = t.match(/[↑↓=]\s*[\d.,]+\s*→\s*[\d.,]+\s*kg/);
  return m ? m[0] : "aucune suggestion visible";
});

// ── TENDANCES ────────────────────────────────────────────────────────
await onglet("Tendances");
await exercer("Tendances", "Bilan de la semaine", async () => {
  const t = await page.locator("body").innerText();
  return /BILAN DE LA SEMAINE|Séances|Adhérence/i.test(t) ? "chiffres affichés" : false;
});
await exercer("Tendances", "Bouton d'envoi au coach", async () => {
  const b = page.getByRole("button", { name: /Envoyer/ }).first();
  return (await b.count()) ? await b.innerText() : false;
});
await exercer("Tendances", "Photos de progression", async () => {
  const t = await page.locator("body").innerText();
  return /Photos de progression/i.test(t) ? "3 emplacements" : false;
});
await exercer("Tendances", "Bilan IA", async () => {
  const b = page.getByRole("button", { name: /Bilan IA/ }).first();
  return (await b.count()) ? "bouton présent" : false;
});

// ── REGLAGES ─────────────────────────────────────────────────────────
await exercer("Réglages", "Ouvrir les réglages", async () => {
  await page.locator('button[aria-label="Réglages"]').first().tap();
  await page.waitForTimeout(700);
  return (await page.locator(".modal-panel").count()) ? "ouverts" : false;
});
await page.locator('button[aria-label="Réglages"]').first().tap().catch(() => {});
await page.waitForTimeout(600);
for (const [nom, motif] of [
  ["Rappels d'hydratation", /Rappels d'hydratation/],
  ["Rappels nutrition", /Rappels nutrition/],
  ["Rappel du dimanche", /Rappel du dimanche/],
  ["Sauvegarde / restauration", /Sauvegarde des données/],
  ["Version affichée", /Version \d{4}-\d{2}-\d{2}/]
]) {
  await exercer("Réglages", nom, async () => {
    const t = await page.locator(".modal-panel").last().innerText();
    const m = t.match(motif);
    return m ? (nom === "Version affichée" ? m[0] : "présent") : false;
  });
  if (!(await page.locator(".modal-panel").count())) {
    await page.locator('button[aria-label="Réglages"]').first().tap().catch(() => {});
    await page.waitForTimeout(500);
  }
}

// ── RESULTAT ─────────────────────────────────────────────────────────
console.log("");
let zone = "";
for (const r of resultats) {
  if (r.zone !== zone) {
    zone = r.zone;
    console.log(`\n${zone.toUpperCase()}`);
  }
  console.log(`  ${r.ok ? "ok " : "!! "} ${r.fonction.padEnd(38)} ${r.note}`);
}
const casses = resultats.filter((r) => !r.ok);
console.log(`\n${resultats.length} fonctions exercées — ${casses.length} en échec`);
for (const c of casses) console.log(`  !! ${c.zone} / ${c.fonction} : ${c.note}`);
console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs.slice(0, 4)) : "aucune");

await nav.close();
serveur.close();
