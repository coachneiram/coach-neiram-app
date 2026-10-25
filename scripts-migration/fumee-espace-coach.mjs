/**
 * Fumée : Espace coach (24 octobre 2026), page à part espace-coach.html.
 *
 * Le Worker est le VRAI worker/coach-neiram-proxy.js, sur une base D1 en
 * mémoire (tests/faux-d1.mjs), avec un faux ADMIN_SECRET de test : les
 * appels de la page à /admin/* sont interceptés (page.route) et passés à
 * worker.fetch. Rien ne part sur Internet. L'app est servie sous un
 * sous-chemin, comme sur GitHub Pages.
 *
 *   1. mauvais secret → « Secret refusé » ;
 *   2. bon secret → liste des clients, « code pas encore activé » en évidence ;
 *   2b. bloc « Présence » (Smart Coach, 25/10/2026) : le plus inactif en
 *      tête (critique), date de dernière saisie et jours, client sans
 *      présence à la fin ;
 *   3. créer un code → affiché une fois, avec « Copier » et l'expiration ;
 *   4. révoquer (confirmation qui cite défis et communauté) → le client
 *      disparaît de la communauté ;
 *   5. masquer une publication signalée ;
 *   6. verrouiller → le secret est oublié (champ vide, page sans secret) ;
 *   7. aucun localStorage, sessionStorage ni cookie écrit par la page ;
 *   8. l'app des clients ne montre aucun lien vers l'Espace coach.
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-espace-coach.mjs
 */

import { chromium } from "playwright";
import { appareil, nomAppareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../worker/coach-neiram-proxy.js";
import { fauxD1 } from "../tests/faux-d1.mjs";

const PORT = 4732;
const SOUS_CHEMIN = "/coach-neiram-app/";
const URL_APP = `http://localhost:${PORT}${SOUS_CHEMIN}`;
const URL_ESPACE = `${URL_APP}espace-coach.html`;

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const serveur = createServer((req, res) => {
  const chemin = req.url.split("?")[0];
  if (!chemin.startsWith(SOUS_CHEMIN)) return res.writeHead(404).end();
  const relatif = chemin.slice(SOUS_CHEMIN.length);
  const c = join(DIST, relatif === "" ? "index.html" : relatif);
  if (!existsSync(c)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(c)] || "application/octet-stream" });
  res.end(readFileSync(c));
});
await new Promise((r) => serveur.listen(PORT, r));

const ADMIN = "faux-admin-secret-de-fumee-0123456789-abcdef";
const env = { ADMIN_SECRET: ADMIN, DB: fauxD1(), ALLOWED_ORIGINS: `http://localhost:${PORT}` };
const logOrigine = console.log;
const silencieux = async (fn) => {
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = logOrigine;
  }
};
const appelWorker = (chemin, corps, entetes = {}) =>
  silencieux(async () => {
    const r = await worker.fetch(new Request("https://proxy.test" + chemin, { method: "POST", headers: { "Content-Type": "application/json", ...entetes }, body: JSON.stringify(corps) }), env);
    return { statut: r.status, corps: await r.json() };
  });
async function clientActive(libelle) {
  const inv = (await appelWorker("/admin/invitations", { libelle }, { Authorization: "Bearer " + ADMIN })).corps;
  const act = (await appelWorker("/auth/activer", { code: inv.code })).corps;
  return { jeton: act.jeton, client: inv.client };
}
const commeClient = (q, chemin, corps) => appelWorker(chemin, corps, { Authorization: "Bearer " + q.jeton });
const sql = (r, ...v) => env.DB.sqlite.prepare(r).all(...v);

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];
const net = (t) => String(t || "").replace(/[  ]/g, " ").replace(/\s+/g, " ");

try {
  // La communauté avant : Marc publie, Thomas le signale une fois ; Léa a
  // un code créé mais pas encore activé.
  const marc = await clientActive("Marc D.");
  const thomas = await clientActive("Thomas B.");
  for (const [q, p] of [[marc, "Marc"], [thomas, "Thomas"]]) {
    await commeClient(q, "/communaute/profil", { pseudo: p, accord: true, stats: { seances_mois: 3 } });
    await commeClient(q, "/communaute/accord", { type: "transformation", oui: true });
  }
  await commeClient(marc, "/communaute/transformations/publier", { periode: "90", jours: 60, muscle: 1.2, texte: "Trois mois de boulot, merci la team" });
  const idPub = sql("SELECT id FROM communaute_transformations")[0].id;
  await commeClient(thomas, "/communaute/signaler", { type: "transformation", cible: String(idPub), motif: "test" });
  await appelWorker("/admin/invitations", { libelle: "Léa R." }, { Authorization: "Bearer " + ADMIN });
  // Présence : Marc a ouvert l'appli aujourd'hui ; Thomas n'a rien fait
  // depuis 8 jours (ligne vieillie à la main) ; Léa n'a pas de présence.
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const ilYa8 = new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10);
  await commeClient(marc, "/presence", { derniereSaisie: aujourdhui });
  await commeClient(thomas, "/presence", { derniereSaisie: ilYa8 });
  sql("UPDATE presence SET vu_le = ? WHERE client_id = ?", Date.now() - 8 * 86400000, thomas.client);

  const ctx = await nav.newContext({ ...appareil(), permissions: ["clipboard-read", "clipboard-write"] });
  // Toute ecriture de stockage par la page est comptee.
  await ctx.addInitScript(() => {
    window.__ecritures = [];
    const origine = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      window.__ecritures.push(k);
      return origine.call(this, k, v);
    };
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  const consoleSecret = [];
  page.on("console", (m) => m.text().includes(ADMIN) && consoleSecret.push(m.text()));
  const dialogues = [];
  page.on("dialog", (d) => {
    dialogues.push(d.message());
    d.accept();
  });
  const enTetes = [];
  await page.route("**/admin/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    enTetes.push({ url: req.url(), auth: req.headers().authorization || "", corps: req.postData() || "" });
    const r = await silencieux(() =>
      worker.fetch(new Request("https://proxy.test" + url.pathname, { method: req.method(), headers: req.headers(), body: req.method() === "POST" ? req.postData() || "" : undefined }), env)
    );
    const h = {};
    r.headers.forEach((v, k) => (h[k] = v));
    await route.fulfill({ status: r.status, headers: h, body: await r.text() });
  });
  await page.goto(URL_ESPACE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  // 1. Mauvais secret.
  await page.locator("[data-secret]").fill("mauvais-secret-0123456789-0123456789");
  await page.getByRole("button", { name: "Ouvrir l'espace coach" }).click();
  await page.waitForTimeout(600);
  const msg1 = net(await page.locator("[data-erreur-espace]").innerText().catch(() => ""));
  const type = await page.locator("[data-secret]").getAttribute("type");
  console.log(
    "1. MAUVAIS SECRET       :",
    /Secret refusé/.test(msg1) && type === "password" && (await page.locator('[data-espace-coach="verrouille"]').count()) === 1
      ? `« ${msg1} » (champ de type mot de passe)`
      : `*** « ${msg1} », type ${type} ***`
  );

  // 2. Bon secret : liste.
  await page.locator("[data-secret]").fill(ADMIN);
  await page.getByRole("button", { name: "Ouvrir l'espace coach" }).click();
  await page.waitForTimeout(900);
  const clients = await page.locator("[data-client]").evaluateAll((l) => l.map((e) => `${e.dataset.client}:${e.dataset.etat}`));
  const lea = net(await page.locator('[data-client="Léa R."]').innerText().catch(() => ""));
  console.log(
    "2. BON SECRET           :",
    JSON.stringify(clients) === JSON.stringify(["Marc D.:actif", "Thomas B.:actif", "Léa R.:sans-jeton"]) && /code pas encore activé/.test(lea)
      ? `3 clients ; Léa R. : « code pas encore activé »`
      : `*** ${JSON.stringify(clients)} « ${lea} » ***`
  );

  // 2b. Presence.
  const blocs = await page.locator("[data-presence]").evaluateAll((l) => l.map((e) => `${e.dataset.presence}:${e.dataset.niveau}:${e.dataset.jours}`));
  const ligneThomas = net(await page.locator('[data-presence="Thomas B."]').innerText().catch(() => ""));
  const ligneLea = net(await page.locator('[data-presence="Léa R."]').innerText().catch(() => ""));
  const dateFr = ilYa8.split("-").reverse().join("/");
  console.log(
    "2b. PRÉSENCE            :",
    JSON.stringify(blocs) === JSON.stringify(["Thomas B.:critique:8", "Marc D.:ok:0", "Léa R.:jamais:"]) &&
      ligneThomas.includes("dernière saisie le " + dateFr) && /critique/.test(ligneThomas) && /8 jours sans saisie/.test(ligneThomas) && /aucune présence reçue/.test(ligneLea)
      ? `Thomas B. en tête (🔴 critique, 8 jours, dernière saisie le ${dateFr}), Marc à jour, Léa sans présence`
      : `*** ${JSON.stringify(blocs)} « ${ligneThomas} » « ${ligneLea} » ***`
  );

  // 3. Créer un code.
  await page.locator("[data-libelle]").fill("Nina K.");
  await page.getByRole("button", { name: "Créer le code" }).click();
  await page.waitForTimeout(900);
  const code = net(await page.locator("[data-code]").innerText().catch(() => ""));
  const encadre = net(await page.locator("[data-nouveau-code]").innerText().catch(() => ""));
  await page.locator("[data-copier]").click();
  await page.waitForTimeout(300);
  const copie = net(await page.locator("[data-copier]").innerText());
  const presse = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  await page.getByRole("button", { name: "J'ai noté le code" }).click();
  await page.waitForTimeout(200);
  const encoreAffiche = await page.locator("[data-code]").count();
  const nina = await page.locator('[data-client="Nina K."]').getAttribute("data-etat").catch(() => null);
  console.log(
    "3. CRÉER UN CODE        :",
    /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code) && /valable jusqu'au \d{2}\/\d{2}\/\d{4}/.test(encadre) && copie === "Copié" && presse === code && encoreAffiche === 0 && nina === "sans-jeton"
      ? `code ${code} pour Nina K. (${encadre.match(/valable jusqu'au [\d/]+/)[0]}), copié, plus affiché après « J'ai noté le code »`
      : `*** code « ${code} », « ${encadre.slice(0, 120)} », « ${copie} », presse-papiers « ${presse} », affiché ${encoreAffiche}, Nina ${nina} ***`
  );

  // 4. Revoquer Thomas : il sort de la communaute.
  await page.locator('[data-revoquer="Thomas B."]').click();
  await page.waitForTimeout(900);
  const etatThomas = await page.locator('[data-client="Thomas B."]').getAttribute("data-etat");
  const profilsRestants = sql("SELECT pseudo FROM communaute_profils").map((r) => r.pseudo);
  const vuParMarc = (await commeClient(marc, "/communaute/classement", { categorie: "seances_mois" })).corps.lignes.map((l) => l.pseudo);
  console.log(
    "4. RÉVOQUER             :",
    etatThomas === "revoque" && /défis entre amis et de la communauté/.test(dialogues[0] || "") && JSON.stringify(profilsRestants) === JSON.stringify(["Marc"]) && JSON.stringify(vuParMarc) === JSON.stringify(["Marc"])
      ? "confirmation qui cite défis et communauté ; Thomas révoqué, son profil effacé, Marc seul au classement"
      : `*** ${etatThomas}, « ${dialogues[0]} », profils ${JSON.stringify(profilsRestants)}, Marc voit ${JSON.stringify(vuParMarc)} ***`
  );

  // 5. Masquer la publication signalee. Le signalement de Thomas est parti
  // avec lui : Lea (activée ici) le signale à son tour.
  const leaActive = await clientActive("Léa B.");
  await commeClient(leaActive, "/communaute/profil", { pseudo: "Lea", accord: true, stats: {} });
  await commeClient(leaActive, "/communaute/signaler", { type: "transformation", cible: String(idPub), motif: "message" });
  await page.getByRole("button", { name: "Actualiser" }).click();
  await page.waitForTimeout(900);
  const signal = net(await page.locator('[data-signalement="transformation"]').innerText().catch(() => ""));
  await page.locator(`[data-signalement="transformation"][data-cible="${idPub}"] [data-moderer="masquer"]`).click();
  await page.waitForTimeout(900);
  const masque = sql("SELECT masque FROM communaute_transformations WHERE id = ?", idPub)[0].masque;
  const mur = (await commeClient(leaActive, "/communaute/transformations/liste", {})).corps.transformations.length;
  const resteSignal = await page.locator('[data-signalement="transformation"]').count();
  console.log(
    "5. MASQUER              :",
    /Publication · 1 signalement/.test(signal) && /Marc : Trois mois de boulot/.test(signal) && masque === 1 && mur === 0 && resteSignal === 0
      ? `« ${signal.slice(0, 60)}… » masquée par le coach : absente du mur, signalement traité`
      : `*** « ${signal} », masque ${masque}, mur ${mur}, reste ${resteSignal} ***`
  );

  // 6. Verrouiller.
  await page.locator("[data-verrouiller]").click();
  await page.waitForTimeout(300);
  const verrouille = await page.locator('[data-espace-coach="verrouille"]').count();
  const champ = await page.locator("[data-secret]").inputValue();
  const html = await page.content();
  const avant = enTetes.length;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const apresRechargement = await page.locator('[data-espace-coach="verrouille"]').count();
  const secretAilleurs = enTetes.filter((e) => e.url.includes(ADMIN) || e.corps.includes(ADMIN));
  const authOk = enTetes.every((e) => e.auth === "Bearer " + ADMIN || e.auth === "Bearer mauvais-secret-0123456789-0123456789");
  console.log(
    "6. VERROUILLER          :",
    verrouille === 1 && champ === "" && !html.includes(ADMIN) && apresRechargement === 1 && enTetes.length === avant && secretAilleurs.length === 0 && authOk && consoleSecret.length === 0
      ? `secret oublié (champ vide, absent de la page, redemandé après rechargement) ; ${avant} appels, secret seulement dans « Authorization: Bearer »`
      : `*** verrou ${verrouille}, champ « ${champ} », dans la page ${html.includes(ADMIN)}, rechargé ${apresRechargement}, URL/corps ${secretAilleurs.length}, auth ${authOk}, console ${consoleSecret.length} ***`
  );

  // 7. Aucun stockage.
  const stockage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, ecritures: window.__ecritures.length, cookie: document.cookie }));
  console.log(
    "7. AUCUN STOCKAGE       :",
    stockage.local === 0 && stockage.session === 0 && stockage.ecritures === 0 && stockage.cookie === ""
      ? "localStorage et sessionStorage vides, aucune écriture, aucun cookie"
      : `*** ${JSON.stringify(stockage)} ***`
  );
  await ctx.close();

  // 6 bis. Oubli automatique apres 15 minutes sans action (horloge simulee).
  const ctxH = await nav.newContext(appareil());
  const pageH = await ctxH.newPage();
  await pageH.clock.install();
  await pageH.route("**/admin/**", async (route) => {
    const req = route.request();
    const r = await silencieux(() => worker.fetch(new Request("https://proxy.test" + new URL(req.url()).pathname, { method: "POST", headers: req.headers(), body: req.postData() || "" }), env));
    await route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() });
  });
  await pageH.goto(URL_ESPACE, { waitUntil: "domcontentloaded" });
  await pageH.locator("[data-secret]").fill(ADMIN);
  await pageH.getByRole("button", { name: "Ouvrir l'espace coach" }).click();
  await pageH.locator('[data-espace-coach="ouvert"]').waitFor();
  await pageH.clock.fastForward(14 * 60000);
  const ouvert14 = await pageH.locator('[data-espace-coach="ouvert"]').count();
  await pageH.clock.fastForward(61000);
  await pageH.waitForTimeout(200);
  const auto = net(await pageH.locator('[data-espace-coach="verrouille"]').innerText().catch(() => ""));
  await ctxH.close();
  console.log(
    "6b. VERROU AUTOMATIQUE  :",
    ouvert14 === 1 && /15 minutes sans action/.test(auto) ? "encore ouvert à 14 min, verrouillé à 15 min sans action, secret oublié" : `*** 14 min : ${ouvert14}, « ${auto.slice(0, 80)} » ***`
  );

  // 8. L'app des clients : aucun lien vers l'Espace coach.
  const ctxC = await nav.newContext(appareil());
  await ctxC.addInitScript(sansAides);
  await ctxC.addInitScript(() => {
    if (localStorage.getItem("coach_profile")) return;
    localStorage.setItem(
      "coach_profile",
      JSON.stringify({ name: "Nina", sex: "femme", age: 30, heightCm: 165, startWeightKg: 60, activityLevel: "modere", goal: "maintien", sessionsPerWeek: 3, trainingMode: "app", coachingMode: "enligne", dietType: "aucun", allergies: [] })
    );
  });
  const client = await ctxC.newPage();
  client.on("pageerror", (e) => erreurs.push(e.message));
  await client.goto(URL_APP, { waitUntil: "domcontentloaded" });
  await client.waitForTimeout(1200);
  const vus = [];
  let visites = 0;
  for (const nom of ["Journal", "Repas", "Nutrition", "Sommeil", "Mesures", "Tendances", "Séances"]) {
    const b = client.getByRole("button", { name: nom, exact: true }).last();
    if (await b.count()) {
      await b.click();
      visites++;
      await client.waitForTimeout(400);
      const h = await client.content();
      if (/espace-coach|Espace coach|\/admin\//i.test(h)) vus.push(nom);
    }
  }
  await client.locator('button[aria-label="Réglages"]').first().click();
  await client.waitForTimeout(600);
  if (/espace-coach|Espace coach|\/admin\//i.test(await client.content())) vus.push("Réglages");
  await ctxC.close();
  console.log("8. APP DES CLIENTS      :", vus.length === 0 && visites === 7 ? "aucun lien ni bouton vers l'Espace coach (7 onglets et Réglages)" : `*** vu dans ${vus.join(", ")} ***`);
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("APPAREIL :", nomAppareil());
console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
