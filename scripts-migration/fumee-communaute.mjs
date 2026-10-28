/**
 * Fumée : communauté Team Neiram, entre clients du coach (24 octobre 2026).
 *
 * Le Worker est le VRAI worker/coach-neiram-proxy.js, sur une base D1 en
 * mémoire (tests/faux-d1.mjs) : les appels de l'app à /communaute/* sont
 * interceptés (page.route) et passés à worker.fetch. Rien ne part sur
 * Internet. L'app est servie sous un sous-chemin, comme sur GitHub Pages.
 *
 *   1. ACCORD ET PROFIL : Séances → « Team Neiram » → « Ouvrir la
 *      communauté » ; le pseudo proposé est le prénom (Marc) ; sans la case
 *      cochée, rien ne part ; avec, le profil est créé (séances du mois et
 *      régularité seulement) ;
 *   2. FFFORCE entre deux téléphones (Marc 520 kg, Thomas 600 kg, hommes
 *      −83 kg) : chacun donne l'accord « disciplines » ; le classement
 *      « Total (catégorie) » est le même des deux côtés ; le serveur garde
 *      sexe et catégorie, jamais le poids ;
 *   3. ATHLÈTE DU MOIS (force, points IPF GL) : Thomas 1er, Marc 2e ;
 *   4. TRANSFORMATION : Marc éligible publie sa perte de gras et son muscle
 *      sur le mur ; Léa (enceinte, réponse du questionnaire sur mesure) est
 *      exclue du classement de perte : ni sa perte ni la raison ne partent ;
 *   5. BRAVO : Thomas félicite Marc, Marc voit 👏 1 ;
 *   6. SIGNALEMENT ET MASQUAGE : Thomas puis Léa signalent la publication
 *      de Marc : masquée du mur à 2 clients différents ;
 *   7. RETRAIT D'ACCORD : Thomas « Retirer mes performances » : ses
 *      performances et ses scores sont effacés du serveur ;
 *   8. SUPPRESSION : Marc « Supprimer mon profil de la communauté » : plus
 *      rien de lui sur le serveur, le formulaire de pseudo revient ;
 *   9. SANS CODE D'ACCÈS : la fenêtre renvoie aux Réglages ; le Worker
 *      refuse /communaute/* sans jeton (même en transition) ;
 *  10. ORDRE DES APPELS : la publication du score arrive APRÈS la lecture
 *      du classement (1,5 s de retard simulé) : le client doit quand même se
 *      voir dans la liste, sans rouvrir la fenêtre (28 octobre 2026).
 *
 *   cd app && npm run build && cd ..
 *   node scripts-migration/fumee-communaute.mjs
 */

import { chromium } from "playwright";
import { appareil, nomAppareil, sansAides } from "./appareil.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../worker/coach-neiram-proxy.js";
import { fauxD1 } from "../tests/faux-d1.mjs";

const PORT = 4731;
const SOUS_CHEMIN = "/coach-neiram-app/";
const URL_APP = `http://localhost:${PORT}${SOUS_CHEMIN}`;

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

const ADMIN = "admin-secret-de-fumee-0123456789-abcdef";
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
async function jetonClient(libelle) {
  const inv = (await appelWorker("/admin/invitations", { libelle }, { Authorization: "Bearer " + ADMIN })).corps;
  const act = (await appelWorker("/auth/activer", { code: inv.code })).corps;
  return { jeton: act.jeton, libelle: act.libelle, client: inv.client };
}
const sql = (requete, ...v) => env.DB.sqlite.prepare(requete).all(...v);

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const erreurs = [];
const net = (t) => String(t || "").replace(/[  ]/g, " ").replace(/\s+/g, " ");
const aujourdhui = new Date().toISOString().slice(0, 10);
const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/** Un téléphone : profil, maxis (datés du jour), pesées, réponses de santé. */
async function telephone({ prenom, sexe = "homme", acces, maxis = null, corps = [], sante = null, seances = [], delaiStatsMs = 0 }) {
  const ctx = await nav.newContext(appareil());
  await ctx.addInitScript(sansAides);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.route("**/communaute/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    // Publication des scores ralentie : la lecture du classement passe avant.
    if (delaiStatsMs && url.pathname.endsWith("/communaute/stats")) await new Promise((fin) => setTimeout(fin, delaiStatsMs));
    const r = await silencieux(() =>
      worker.fetch(new Request("https://proxy.test" + url.pathname, { method: req.method(), headers: req.headers(), body: req.method() === "POST" ? req.postData() || "" : undefined }), env)
    );
    const entetes = {};
    r.headers.forEach((v, k) => (entetes[k] = v));
    await route.fulfill({ status: r.status, headers: entetes, body: await r.text() });
  });
  await page.addInitScript(
    ({ prenom, sexe, acces, maxis, corps, sante, seances, jourMaxi }) => {
      if (localStorage.getItem("coach_profile")) return;
      localStorage.setItem(
        "coach_profile",
        JSON.stringify({
          name: prenom, sex: sexe, age: 32, heightCm: 178, startWeightKg: corps.length ? corps[0].weightKg : 82,
          activityLevel: "modere", goal: "performance", sessionsPerWeek: 3,
          trainingMode: "app", coachingMode: "presentiel", dietType: "aucun", allergies: []
        })
      );
      localStorage.setItem("coach_body_logs", JSON.stringify(corps.map((c, i) => ({ id: "b" + i, ...c }))));
      localStorage.setItem("coach_sessions", JSON.stringify(seances.map((d, i) => ({ id: "s" + i, date: d, durationMin: 60, exercises: [] }))));
      if (maxis) localStorage.setItem("cn_pl_1rm", JSON.stringify({ ...maxis, maj: { squat: jourMaxi } }));
      if (sante) localStorage.setItem("cn_objectifs_sur_mesure", JSON.stringify(sante));
      if (acces) localStorage.setItem("acces_neiram", JSON.stringify({ jeton: acces.jeton, libelle: acces.libelle, activeLe: "2026-10-20T08:00:00.000Z" }));
    },
    { prenom, sexe, acces, maxis, corps, sante, seances, jourMaxi: aujourdhui }
  );
  await page.goto(URL_APP, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /^(Séances|Entraînements)$/ }).last().click();
  await page.waitForTimeout(600);
  return { ctx, page };
}

const fenetre = (page) => page.locator(".modal-panel");
async function ouvrirCommunaute(page) {
  const carte = page.locator("[data-carte-communaute]");
  await carte.scrollIntoViewIfNeeded();
  await carte.getByRole("button", { name: "Ouvrir la communauté" }).click();
  await page.waitForTimeout(700);
}
async function rejoindre(page) {
  await fenetre(page).locator("[data-accord-profil]").check();
  await fenetre(page).getByRole("button", { name: "Rejoindre la communauté" }).click();
  await page.waitForTimeout(800);
}
async function accordDisciplines(page) {
  await fenetre(page).locator('[data-groupe="Force athlé"]').click();
  await page.waitForTimeout(300);
  await fenetre(page).locator('[data-accord-communaute="disciplines"] [data-accord-case]').check();
  await fenetre(page).getByRole("button", { name: "Entrer dans les classements par discipline" }).click();
  await page.waitForTimeout(1200);
}
const lignesClassement = (page) =>
  fenetre(page)
    .locator("[data-ligne-classement]")
    .evaluateAll((l) => l.map((e) => `${e.dataset.pseudo}:${e.querySelector("[data-valeur]").textContent.replace(/\s/g, "")}`));
async function ongletTransformations(page) {
  await fenetre(page).locator('[data-onglet-communaute="transformations"]').click();
  await page.waitForTimeout(800);
}
async function fermer(page) {
  await page.locator(".modal-panel button[aria-label='Fermer']").last().click();
  await page.waitForTimeout(300);
}
const idClient = (acces) => acces.client;

const PESEES_MARC = [
  { date: jour(-80), weightKg: 84, bodyFatPct: 20, muscleKg: 38 },
  { date: jour(-2), weightKg: 82, bodyFatPct: 16.5, muscleKg: 39.5 }
];
const PESEES_LEA = [
  { date: jour(-70), weightKg: 66, bodyFatPct: 28, muscleKg: 26 },
  { date: jour(-1), weightKg: 64, bodyFatPct: 26, muscleKg: 26.8 }
];

try {
  const marc = await jetonClient("Marc D.");
  const thomas = await jetonClient("Thomas B.");
  const lea = await jetonClient("Léa R.");

  // 1. Accord et profil.
  // Deux seances ce mois-ci (le 1er du mois et aujourd'hui).
  const seancesMarc = [...new Set([aujourdhui.slice(0, 8) + "01", aujourdhui])];
  const A = await telephone({ prenom: "Marc", acces: marc, maxis: { squat: 180, bench: 120, deadlift: 220 }, corps: PESEES_MARC, seances: seancesMarc });
  await ouvrirCommunaute(A.page);
  const pseudoA = await fenetre(A.page).locator("[data-pseudo-communaute]").inputValue();
  await fenetre(A.page).getByRole("button", { name: "Rejoindre la communauté" }).click();
  await A.page.waitForTimeout(400);
  const refusSansCase = net(await fenetre(A.page).locator("[data-erreur-communaute]").innerText().catch(() => ""));
  const avant = sql("SELECT COUNT(*) AS n FROM communaute_profils")[0].n;
  await rejoindre(A.page);
  const profilA = sql("SELECT pseudo, stats, accord_disc, accord_transfo FROM communaute_profils WHERE client_id = ?", idClient(marc))[0] || {};
  const actifA = await fenetre(A.page).locator('[data-communaute="actif"]').count();
  console.log(
    "1. ACCORD ET PROFIL     :",
    pseudoA === "Marc" && /Coche la case/.test(refusSansCase) && avant === 0 && profilA.pseudo === "Marc" && actifA === 1 &&
      JSON.stringify(Object.keys(JSON.parse(profilA.stats || "{}")).sort()) === JSON.stringify(["mois", "regularite_30", "seances_mois"]) &&
      JSON.parse(profilA.stats).seances_mois === seancesMarc.length && profilA.accord_disc === 0
      ? `prénom « Marc » proposé, refus sans la case, profil créé : ${profilA.stats} (séances du mois et régularité seulement)`
      : `*** pseudo « ${pseudoA} », refus « ${refusSansCase} », ${avant} profil avant, ${JSON.stringify(profilA)}, actif ${actifA} ***`
  );

  // 2. Classement FFForce entre deux téléphones.
  const B = await telephone({ prenom: "Thomas", acces: thomas, maxis: { squat: 210, bench: 140, deadlift: 250 }, corps: [{ date: jour(-1), weightKg: 81 }] });
  await ouvrirCommunaute(B.page);
  await rejoindre(B.page);
  await accordDisciplines(B.page);
  await accordDisciplines(A.page);
  // Le classement se rafraîchit après l'accord : on attend la deuxième ligne
  // (Marc), au lieu de compter sur 1,2 s qui ne suffit pas quand la machine
  // est chargée (28 octobre 2026).
  await fenetre(A.page).locator("[data-ligne-classement]").nth(1).waitFor({ timeout: 15000 });
  const classeA = await lignesClassement(A.page);
  await B.page.reload({ waitUntil: "domcontentloaded" });
  await B.page.waitForTimeout(1200);
  await B.page.getByRole("button", { name: /^(Séances|Entraînements)$/ }).last().click();
  await B.page.waitForTimeout(500);
  await ouvrirCommunaute(B.page);
  await fenetre(B.page).locator('[data-groupe="Force athlé"]').click();
  await B.page.waitForTimeout(1200);
  const classeB = await lignesClassement(B.page);
  const rangB = net(await fenetre(B.page).locator("[data-mon-rang]").innerText().catch(() => ""));
  const filtre = net(await fenetre(B.page).locator("[data-filtre-categorie]").innerText().catch(() => ""));
  const statsA = JSON.parse(sql("SELECT stats FROM communaute_profils WHERE client_id = ?", idClient(marc))[0].stats);
  console.log(
    "2. FFFORCE              :",
    JSON.stringify(classeA) === JSON.stringify(["Thomas:600kg", "Marc:520kg"]) && JSON.stringify(classeB) === JSON.stringify(classeA) && /1er sur 2/.test(rangB) &&
      /−83 kg/.test(filtre) && statsA.cat_pl === "83" && statsA.sexe === "h" && !/82|84/.test(JSON.stringify({ ...statsA, pl_gl: 0, score_force: 0, pl_total: 0 }))
      ? `Thomas 600 kg, Marc 520 kg, vu des deux téléphones (${filtre}) ; serveur : sexe « h », catégorie « 83 », pas de poids`
      : `*** A ${JSON.stringify(classeA)}, B ${JSON.stringify(classeB)}, « ${rangB} », « ${filtre} », ${JSON.stringify(statsA)} ***`
  );

  // 3. Athlete du mois.
  const podium = await fenetre(B.page)
    .locator('[data-athlete-du-mois="force"] [data-periode="mois"]')
    .evaluateAll((l) => l.map((e) => e.textContent));
  const podiumAnnee = await fenetre(B.page)
    .locator('[data-athlete-du-mois="force"] [data-periode="annee"]')
    .evaluateAll((l) => l.map((e) => e.textContent));
  const scores = sql("SELECT discipline, client_id FROM communaute_scores_mois ORDER BY score DESC");
  console.log(
    "3. ATHLÈTE DU MOIS      :",
    podium.length === 2 && /Thomas/.test(podium[0]) && /Marc/.test(podium[1]) && /pts IPF GL/.test(podium[0]) && JSON.stringify(podiumAnnee) === JSON.stringify(podium) &&
      scores.length === 2 && scores[0].client_id === idClient(thomas)
      ? `podium force du mois (et de l'année) : « ${net(podium[0])} », « ${net(podium[1])} »`
      : `*** mois ${JSON.stringify(podium)}, année ${JSON.stringify(podiumAnnee)}, ${JSON.stringify(scores)} ***`
  );

  // 4. Transformation : Marc eligible, Lea exclue (enceinte).
  await ongletTransformations(A.page);
  const etatTransfoA = await fenetre(A.page).locator("[data-ma-transformation]").getAttribute("data-ma-transformation").catch(() => null);
  await fenetre(A.page).locator('[data-accord-communaute="transformation"] [data-accord-case]').check();
  await fenetre(A.page).getByRole("button", { name: "Entrer dans les classements de transformation" }).click();
  await A.page.waitForTimeout(900);
  await fenetre(A.page).locator("[data-message-transformation]").fill("Merci coach, trois mois de régularité !");
  await fenetre(A.page).getByRole("button", { name: "Partager sur le mur" }).click();
  await A.page.waitForTimeout(900);
  const C = await telephone({ prenom: "Léa", sexe: "femme", acces: lea, corps: PESEES_LEA, sante: { situation: "enceinte-t2" } });
  await ouvrirCommunaute(C.page);
  await rejoindre(C.page);
  await ongletTransformations(C.page);
  const etatTransfoC = await fenetre(C.page).locator("[data-ma-transformation]").getAttribute("data-ma-transformation").catch(() => null);
  const noteC = await fenetre(C.page).locator("[data-perte-exclue]").count();
  await fenetre(C.page).locator('[data-accord-communaute="transformation"] [data-accord-case]').check();
  await fenetre(C.page).getByRole("button", { name: "Entrer dans les classements de transformation" }).click();
  await C.page.waitForTimeout(900);
  await fenetre(C.page).locator("[data-message-transformation]").fill("Je garde le rythme, doucement");
  await fenetre(C.page).getByRole("button", { name: "Partager sur le mur" }).click();
  await C.page.waitForTimeout(900);
  const murBase = sql("SELECT client_id, gras, muscle FROM communaute_transformations ORDER BY id");
  const statsMarc = JSON.parse(sql("SELECT stats FROM communaute_profils WHERE client_id = ?", idClient(marc))[0].stats);
  const statsLea = JSON.parse(sql("SELECT stats FROM communaute_profils WHERE client_id = ?", idClient(lea))[0].stats);
  const toutLea = JSON.stringify(sql("SELECT * FROM communaute_profils WHERE client_id = ?", idClient(lea))) + JSON.stringify(murBase);
  console.log(
    "4. TRANSFORMATION       :",
    etatTransfoA === "eligible" && etatTransfoC === "perte-exclue" && noteC === 1 && murBase.length === 2 &&
      murBase[0].gras > 0 && murBase[0].muscle > 0 && murBase[1].gras === null && murBase[1].muscle > 0 &&
      statsMarc.gras_90 > 0 && !("gras_90" in statsLea) && !("gras_an" in statsLea) && statsLea.muscle_90 > 0 && !/enceinte|allait|perte_eligible|weightKg|bodyFat/.test(toutLea)
      ? `Marc éligible : −${murBase[0].gras} % de gras, +${murBase[0].muscle} kg ; Léa exclue de la perte (ni perte ni raison au serveur), +${murBase[1].muscle} kg publié`
      : `*** A ${etatTransfoA}, C ${etatTransfoC}/${noteC}, mur ${JSON.stringify(murBase)}, Marc ${JSON.stringify(statsMarc)}, Léa ${JSON.stringify(statsLea)} ***`
  );

  // 5. Bravo.
  await ongletTransformations(B.page);
  const idMarc = sql("SELECT id FROM communaute_transformations WHERE client_id = ?", idClient(marc))[0].id;
  await fenetre(B.page).locator(`[data-bravo="${idMarc}"]`).click();
  await B.page.waitForTimeout(800);
  const boutonB = net(await fenetre(B.page).locator(`[data-bravo="${idMarc}"]`).innerText());
  await fenetre(A.page).locator('[data-onglet-communaute="classements"]').click();
  await ongletTransformations(A.page);
  const bravosA = await fenetre(A.page).locator(`[data-transformation="${idMarc}"] [data-bravos]`).getAttribute("data-bravos");
  console.log(
    "5. BRAVO                :",
    /Bravo \(1\)/.test(boutonB) && bravosA === "1" ? `Thomas : « ${boutonB} » ; Marc voit 👏 1 sur sa publication` : `*** « ${boutonB} », Marc ${bravosA} ***`
  );

  // 6. Signalement et masquage (2 clients differents).
  await fenetre(B.page).locator(`[data-signaler-transformation="${idMarc}"]`).click();
  await B.page.waitForTimeout(800);
  const apres1 = sql("SELECT masque FROM communaute_transformations WHERE id = ?", idMarc)[0].masque;
  const notice = net(await fenetre(B.page).locator("[data-notice-communaute]").innerText().catch(() => ""));
  await fenetre(C.page).locator('[data-onglet-communaute="classements"]').click();
  await ongletTransformations(C.page);
  await fenetre(C.page).locator(`[data-signaler-transformation="${idMarc}"]`).click();
  await C.page.waitForTimeout(900);
  const apres2 = sql("SELECT masque FROM communaute_transformations WHERE id = ?", idMarc)[0].masque;
  const visibleC = await fenetre(C.page).locator(`[data-transformation="${idMarc}"]`).count();
  console.log(
    "6. SIGNALER, MASQUER    :",
    apres1 === 0 && apres2 === 1 && visibleC === 0 && /signalement est envoyé/.test(notice)
      ? "1 signalement : visible ; 2 clients différents : publication masquée du mur"
      : `*** après 1 : ${apres1}, après 2 : ${apres2}, visible ${visibleC}, « ${notice} » ***`
  );

  // 7. Retrait d'accord qui efface.
  await fenetre(B.page).getByRole("button", { name: "Retirer mes performances" }).click();
  await B.page.waitForTimeout(900);
  const statsB = JSON.parse(sql("SELECT stats FROM communaute_profils WHERE client_id = ?", idClient(thomas))[0].stats);
  const scoresB = sql("SELECT COUNT(*) AS n FROM communaute_scores_mois WHERE client_id = ?", idClient(thomas))[0].n;
  await fenetre(A.page).locator('[data-onglet-communaute="classements"]').click();
  await A.page.waitForTimeout(300);
  await fenetre(A.page).locator('[data-groupe="Régularité"]').click();
  await A.page.waitForTimeout(300);
  await fenetre(A.page).locator('[data-groupe="Force athlé"]').click();
  await A.page.waitForTimeout(1200);
  const classeA2 = await lignesClassement(A.page);
  await fenetre(B.page).locator('[data-onglet-communaute="classements"]').click();
  await B.page.waitForTimeout(300);
  await fenetre(B.page).locator('[data-groupe="Force athlé"]').click();
  await B.page.waitForTimeout(400);
  const accordB = await fenetre(B.page).locator('[data-accord-communaute="disciplines"]').count();
  console.log(
    "7. RETRAIT D'ACCORD     :",
    !("pl_total" in statsB) && !("cat_pl" in statsB) && !("sexe" in statsB) && scoresB === 0 && JSON.stringify(classeA2) === JSON.stringify(["Marc:520kg"]) && accordB === 1
      ? "performances, sexe, catégorie et scores de Thomas effacés du serveur ; Marc seul au classement ; l'accord est redemandé à Thomas"
      : `*** ${JSON.stringify(statsB)}, ${scoresB} score(s), A ${JSON.stringify(classeA2)} ***`
  );

  // 8. Suppression du profil.
  await fenetre(A.page).getByRole("button", { name: "Supprimer mon profil de la communauté" }).click();
  await A.page.waitForTimeout(900);
  const reste = JSON.stringify(
    ["communaute_profils", "communaute_scores_mois", "communaute_transformations", "communaute_bravos", "communaute_signalements"].map((t) => sql(`SELECT * FROM ${t}`))
  );
  const formulaire = await fenetre(A.page).locator("[data-creation-profil]").count();
  console.log(
    "8. SUPPRIMER LE PROFIL  :",
    !reste.includes(idClient(marc)) && formulaire === 1 && reste.includes(idClient(thomas))
      ? "plus rien de Marc sur le serveur (profil, scores, publication, bravos, signalements) ; le formulaire de pseudo revient"
      : `*** formulaire ${formulaire}, base ${reste.slice(0, 200)} ***`
  );
  // Aucun lien vers l'Espace coach (page du coach, espace-coach.html).
  const lienCoach = /espace-coach|Espace coach|\/admin\//i.test(await A.page.content());
  console.log("8b. ESPACE COACH        :", lienCoach ? "*** lien vers l'Espace coach visible ***" : "aucun lien vers l'Espace coach dans l'app du client");
  await A.ctx.close();
  await B.ctx.close();
  await C.ctx.close();

  // 9. Sans code d'acces.
  const D = await telephone({ prenom: "Nina", sexe: "femme", acces: null });
  const texteCarte = net(await D.page.locator("[data-carte-communaute]").innerText().catch(() => ""));
  await ouvrirCommunaute(D.page);
  const sansAcces = await fenetre(D.page).locator('[data-communaute="sans-acces"]').count();
  await D.ctx.close();
  const anonyme = await silencieux(async () => {
    const r = await worker.fetch(new Request("https://proxy.test/communaute/etat", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }), { ...env, ACCES_CLIENTS: "transition" });
    return r.status;
  });
  console.log(
    "9. SANS CODE D'ACCÈS    :",
    sansAcces === 1 && /Réglages/.test(texteCarte) && anonyme === 401
      ? "la carte et la fenêtre renvoient aux Réglages ; le Worker refuse sans jeton (401, même en transition)"
      : `*** fenêtre ${sansAcces}, « ${texteCarte.slice(0, 80)} », Worker ${anonyme} ***`
  );

  // 10. Ordre des appels : le score est publié 1,5 s après la lecture du classement.
  const lucas = await jetonClient("Lucas T.");
  const E = await telephone({ prenom: "Lucas", acces: lucas, maxis: { squat: 200, bench: 130, deadlift: 230 }, corps: [{ date: jour(-1), weightKg: 80 }], delaiStatsMs: 1500 });
  await ouvrirCommunaute(E.page);
  await rejoindre(E.page);
  await accordDisciplines(E.page);
  const sonLigne = fenetre(E.page).locator('[data-ligne-classement][data-pseudo="Lucas"]');
  const vuTot = await sonLigne.count();
  let vuAvecDelai = true;
  await sonLigne.waitFor({ timeout: 12000 }).catch(() => (vuAvecDelai = false));
  console.log(
    "10. ORDRE DES APPELS    :",
    vuAvecDelai ? `publication 1,5 s après la lecture : le client se voit dans le classement${vuTot ? "" : " (liste rafraîchie après la publication)"}` : "*** le client ne se voit pas dans le classement : la liste lue avant la publication n'a pas été rafraîchie ***"
  );
  await E.ctx.close();
} catch (e) {
  console.log("ECHEC :", e.message.split("\n")[0]);
}

console.log("APPAREIL :", nomAppareil());
console.log("ERREURS JS :", erreurs.length ? JSON.stringify(erreurs) : "aucune");
await nav.close();
serveur.close();
