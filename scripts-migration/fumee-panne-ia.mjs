/**
 * Fumee : ce que la cliente voit quand l'IA tombe en panne.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI CE SCRIPT EXISTE
 * ─────────────────────────────────────────────────────────────────────
 *
 * Un jour, l'analyse photo a cesse de fonctionner en production. Diagnostiquer
 * a pris une heure — et la question qui aurait tranche en deux minutes
 * etait : « quel message exact s'affiche ? ». Personne ne savait le dire,
 * parce que rien n'avait jamais verifie que le bon message sort pour la
 * bonne panne.
 *
 * La traduction erreur -> phrase etait testee, mais seulement au niveau de
 * la fonction. Entre elle et l'ecran, rien.
 *
 * Chaque cas ci-dessous coupe le proxy d'une facon differente et lit ce qui
 * s'affiche. Un message juste ne repare rien, mais il transforme une heure
 * d'enquete en un coup d'oeil.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-panne-ia.mjs
 */

import { chromium } from "playwright";
import { appareil, nomAppareil } from "./appareil.mjs";
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
await new Promise((r) => serveur.listen(4690, r));

// Une vraie image : le redimensionnement doit reussir, sinon on testerait
// le message « format non reconnu » au lieu de la panne du proxy.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAKUlEQVQoU2NkYGD4z0AEYBxVSFJCjIyM/xkYGBiIUYjPYIZRhSQpxKcQAFprBQXQnjIhAAAAAElFTkSuQmCC",
  "base64"
);
writeFileSync("/tmp/assiette.png", PNG);

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

/**
 * Chaque panne, et la phrase que la cliente doit lire.
 *
 * Les motifs visent ce qui DISTINGUE le message : un quota n'appelle pas le
 * meme geste qu'une cle morte, et confondre les deux fait perdre du temps
 * au coach comme a la cliente.
 */
const PANNES = [
  {
    nom: "quota atteint (429)",
    reponse: { statut: 429, corps: { ok: false, error: "trop-de-requetes" } },
    attendu: /quota/i,
    pourquoi: "elle doit comprendre qu'il faut revenir demain, pas réessayer en boucle"
  },
  {
    nom: "clé refusée (403)",
    reponse: { statut: 403, corps: { ok: false, error: "cle-invalide" } },
    attendu: /clé.*(invalide|inactive)|préviens ton coach/i,
    pourquoi: "elle doit prévenir le coach : elle ne peut rien y faire seule"
  },
  {
    nom: "service en panne (503)",
    reponse: { statut: 503, corps: { ok: false, error: "proxy-non-configure" } },
    attendu: /service .* indisponible/i,
    // Le motif exclut volontairement le repli « photo plus nette » : c'est
    // exactement ce que l'application affichait, et il envoyait la cliente
    // refaire des photos d'une assiette qui n'avait rien.
    interdit: /photo plus nette/i,
    pourquoi: "la panne est du côté du service, pas de sa photo"
  },
  {
    nom: "pas de connexion",
    reponse: null,
    attendu: /pas de connexion|internet/i,
    interdit: /photo plus nette/i,
    pourquoi: "réseau coupé : le message ne doit accuser ni elle, ni sa photo"
  }
];

const erreurs = [];
let echecs = 0;

console.log("Appareil émulé :", nomAppareil(), "\n");

for (const panne of PANNES) {
  const page = await (await nav.newContext({ ...appareil() })).newPage();
  page.on("pageerror", (e) => erreurs.push(panne.nom + " : " + e.message));

  await page.addInitScript(() => {
    localStorage.setItem("coach_profile", JSON.stringify({
      firstName: "Sabine", sex: "femme", age: 41, heightCm: 168, startWeightKg: 68,
      activityLevel: "modere", goal: "perte", sessionsPerWeek: 3, targetWeightKg: 63,
      trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: []
    }));
    localStorage.setItem("coach_log_entries", JSON.stringify([]));
  });

  // Le proxy est coupe de la facon voulue, sans rien changer a l'application.
  await page.route("**/coach-neiram-proxy*/**", async (route) => {
    if (!panne.reponse) return route.abort("failed");
    await route.fulfill({
      status: panne.reponse.statut,
      contentType: "application/json",
      body: JSON.stringify(panne.reponse.corps)
    });
  });

  try {
    await page.goto("http://localhost:4690/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Journal", exact: true }).first().click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "+ ajouter", exact: true }).nth(1).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Aliments", exact: true }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Photo IA", exact: true }).first().click();
    await page.waitForTimeout(500);

    await page.setInputFiles('input[type="file"]', "/tmp/assiette.png");
    await page.waitForTimeout(6000);

    const texte = await page.locator(".modal-panel").last().innerText();
    const ligne = texte.split("\n").find((l) => panne.attendu.test(l));
    // Un message peut etre present ET faux en meme temps : le repli
    // generique contient « réessaie », ce qui suffisait a satisfaire des
    // motifs trop larges. On refuse donc aussi ce qui ne doit PAS s'y
    // trouver.
    const fautif = panne.interdit && panne.interdit.test(texte);
    if (fautif) {
      echecs += 1;
      console.log(`  *** ${panne.nom.padEnd(26)} MESSAGE TROMPEUR ***`);
      console.log(`       ${panne.pourquoi}`);
      console.log(`       à l'écran : ${texte.split("\n").find((l) => panne.interdit.test(l)).trim().slice(0, 90)}`);
    } else if (ligne) {
      console.log(`  ok   ${panne.nom.padEnd(26)} « ${ligne.trim().slice(0, 70)} »`);
    } else {
      echecs += 1;
      console.log(`  *** ${panne.nom.padEnd(26)} MESSAGE ATTENDU ABSENT ***`);
      console.log(`       ${panne.pourquoi}`);
      console.log(`       à l'écran : ${texte.split("\n").slice(-4).join(" | ").slice(0, 140)}`);
    }
  } catch (e) {
    echecs += 1;
    console.log(`  *** ${panne.nom.padEnd(26)} ECHEC : ${e.message.split("\n")[0].slice(0, 60)} ***`);
  }
  await page.context().close();
}

console.log(`\n${PANNES.length} pannes rejouées — ${echecs} sans message clair`);
console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
