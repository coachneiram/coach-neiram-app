/**
 * Photos des recettes (repris de l'app Neiram, PR #76, le 20/11/2026) :
 * choix fixes du catalogue, recherche par le Worker du coach, relais des
 * images sans jamais exposer le telephone a Pexels. Garde-fous : 60
 * recherches par IP et par jour, 800 au total, cache D1 30 jours, cle de
 * cache normalisee, types d'image stricts, identifiant numerique, origine
 * controlee ; sans base ni cle : 503 propre, jamais 500.
 */

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
globalThis.__COACH_TEST__ = globalThis.__COACH_TEST__ || {};
const { default: worker } = await import("../worker/coach-neiram-proxy.js");
const { normaliserRequetePhoto: normWorker, adresseImagePexels, PHOTOS } = globalThis.__COACH_TEST__;
const { PHOTOS_PAR_IP_JOUR, PHOTOS_PAR_JOUR } = PHOTOS;
import {
  CLE_PHOTOS_RECETTES,
  PHOTOS_RECETTES_COACH,
  adresseImage,
  chercherPhoto,
  normaliserRequetePhoto,
  photoConnue,
  recherchePhoto
} from "../app/src/lib/photos-recettes.js";
import { RECETTES_COACH } from "../app/src/lib/recettes-coach-catalogue.js";
import { lireRecettesIa, preferencesValides } from "../app/src/lib/menu-sur-mesure.js";
import { fauxD1 } from "./faux-d1.mjs";

const memoire = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoire.has(k) ? memoire.get(k) : null),
  setItem: (k, v) => memoire.set(k, String(v)),
  removeItem: (k) => memoire.delete(k),
  key: (i) => [...memoire.keys()][i] ?? null,
  get length() {
    return memoire.size;
  }
};

const fetchOrigine = globalThis.fetch;
let appels;
let env;
beforeEach(() => {
  memoire.clear();
  appels = [];
  env = { DB: fauxD1(), PEXELS_API_KEY: "cle-pexels" };
  globalThis.fetch = async (u, o = {}) => {
    const url = String(u);
    appels.push({ url, auth: o.headers && o.headers.Authorization });
    if (url.startsWith("https://api.pexels.com/")) {
      return new Response(JSON.stringify({ photos: [{ id: 123, photographer: "Ana", src: { medium: "https://images.pexels.com/photos/123/pexels-photo-123.png?h=350" } }] }), { status: 200 });
    }
    if (url.startsWith("https://images.pexels.com/")) return new Response("IMG", { status: 200, headers: { "Content-Type": "image/png" } });
    return new Response("{}", { status: 404 });
  };
});
afterEach(() => {
  globalThis.fetch = fetchOrigine;
});

let ipSuivante = 0;
/** Une requête différente à chaque appel (sinon la base répond sans compter). */
const lettres = (n) => n.toString(26).split("").map((c) => String.fromCharCode(97 + parseInt(c, 26))).join("");
const get = (chemin, ip = "9.9." + (ipSuivante++ % 250) + "." + Math.floor(ipSuivante / 250)) =>
  worker.fetch(new Request("https://proxy.test" + chemin, { headers: { Origin: "https://coachneiram.github.io", "CF-Connecting-IP": ip } }), env, {});

test("catalogue : chaque photo fixe vise une recette existante du coach, au bon format", () => {
  const ids = new Set(RECETTES_COACH.map((r) => r.id));
  for (const [id, p] of Object.entries(PHOTOS_RECETTES_COACH)) {
    assert.ok(ids.has(id), id);
    assert.ok(Number.isInteger(p.id) && /^(jpeg|png)$/.test(p.ext) && p.auteur, id);
  }
  // Les 30 recettes communes avec l'app Neiram ; les plus recentes du
  // coach sont cherchees par leur nom.
  assert.equal(Object.keys(PHOTOS_RECETTES_COACH).length, 30);
  const sansPhoto = RECETTES_COACH.find((r) => !PHOTOS_RECETTES_COACH[r.id]);
  if (sansPhoto) assert.deepEqual(recherchePhoto(sansPhoto), { q: normaliserRequetePhoto(sansPhoto.nom), fr: true });
});

test("requête : mots simples, accents et œ retirés ; même règle côté app et Worker", () => {
  for (const t of ["Bœuf sauté façon thaï", "Beef STIR-fry 2x!", "ab", "  curry   de   pois  "]) assert.equal(normaliserRequetePhoto(t), normWorker(t), t);
  assert.equal(normaliserRequetePhoto("Bœuf sauté façon thaï"), "boeuf saute facon thai");
  assert.equal(normaliserRequetePhoto("ab"), null);
  assert.deepEqual(recherchePhoto({ nom: "Curry", photo: "Chickpea curry" }), { q: "chickpea curry", fr: false });
  assert.deepEqual(recherchePhoto({ nom: "Curry de pois chiches" }), { q: "curry de pois chiches", fr: true });
});

test("l'IA fournit les mots de la photo, nettoyés", () => {
  const prefs = preferencesValides({});
  const r = {
    nom: "Poulet riz",
    categorie: "diner",
    portions: 4,
    preparationMin: 10,
    cuissonMin: 10,
    ingredients: [{ nom: "Riz", quantite: "300 g" }, { nom: "Poulet", quantite: "500 g" }],
    etapes: ["Cuire.", "Servir."],
    parPortion: { kcal: 600, p: 40, c: 70, f: 15 },
    coutPortion: 2,
    photo: "Chicken & Rice <b>bowl</b>",
    contient: ["volaille"],
    regimes: ["sans-porc"]
  };
  const { recettes } = lireRecettesIa(JSON.stringify({ recettes: [r] }), { profil: { goal: "prise" }, prefs });
  assert.equal(recettes[0].photo, "chicken rice b bowl b");
});

test("adresse de l'image : toujours le Worker, jamais Pexels", () => {
  assert.equal(adresseImage({ id: 5, ext: "jpeg" }, "https://w.test"), "https://w.test/photo/img/5.jpeg");
  assert.equal(adresseImage({ id: "5;x", ext: "jpeg" }, "https://w.test"), null);
  assert.equal(adresseImage({ id: 5, ext: "jpeg" }, ""), null);
  const fixe = Object.entries(PHOTOS_RECETTES_COACH)[0];
  assert.deepEqual(photoConnue({ id: fixe[0], nom: "x" }), fixe[1]);
});

test("Worker /photo : recherche Pexels avec la clé, réponse réduite, plafond du jour", async () => {
  const r = await get("/photo?q=Chicken%20curry");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://coachneiram.github.io");
  assert.deepEqual((await r.json()).photo, { id: 123, ext: "png", auteur: "Ana" });
  assert.equal(appels[0].auth, "cle-pexels");
  assert.match(appels[0].url, /query=chicken\+curry/);
  assert.equal((await get("/photo?q=x")).status, 400);
  delete env.PEXELS_API_KEY;
  assert.equal((await get("/photo?q=chicken")).status, 503);
  env.PEXELS_API_KEY = "cle";
  for (let i = 1; i < PHOTOS_PAR_JOUR; i++) await get("/photo?q=chicken%20" + lettres(i));
  assert.equal((await (await get("/photo?q=chicken%20zzzz")).json()).error, "service-sature");
  assert.equal((await get("/photo?q=chicken%20curry")).status, 200, "déjà en base : servi sans compter");
});

test("Worker /photo : une seule adresse IP ne peut pas épuiser le plafond commun", async () => {
  for (let i = 0; i < PHOTOS_PAR_IP_JOUR; i++) assert.equal((await get("/photo?q=beef%20" + lettres(i), "5.5.5.5")).status, 200);
  assert.equal((await (await get("/photo?q=beef%20zzzz", "5.5.5.5")).json()).error, "trop-de-requetes");
  assert.equal((await get("/photo?q=beef%20zzzz", "6.6.6.6")).status, 200);
});

test("Worker /photo : origine étrangère refusée ; image non JPEG/PNG/WebP refusée", async () => {
  const r = await worker.fetch(new Request("https://proxy.test/photo?q=chicken", { headers: { Origin: "https://pirate.example" } }), env, {});
  assert.equal(r.status, 403);
  globalThis.fetch = async () => new Response("<svg/>", { status: 200, headers: { "Content-Type": "image/svg+xml" } });
  assert.equal((await get("/photo/img/1.png")).status, 404);
});

test("Worker /photo/img : relaie seulement une image Pexels par identifiant numérique", async () => {
  const r = await get("/photo/img/123.png");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("Content-Type"), "image/png");
  assert.equal(await r.text(), "IMG");
  assert.equal(appels[0].url, adresseImagePexels("123", "png"));
  assert.equal((await get("/photo/img/123.gif")).status, 404);
  assert.equal((await get("/photo/img/..%2Fevil.png")).status, 404);
  assert.equal(appels.length, 1);
});

test("app : la photo cherchée est gardée sur le téléphone, une seule requête", async () => {
  const recette = { id: "ia-1-0", nom: "Wok", photo: "shrimp wok" };
  assert.equal(photoConnue(recette), undefined);
  const fetchFn = async (u) => {
    appels.push({ url: u });
    return new Response(JSON.stringify({ ok: true, photo: { id: 9, ext: "jpeg", auteur: "Bo" } }), { status: 200 });
  };
  const [a, b] = await Promise.all([chercherPhoto(recette, { base: "https://w.test", fetchFn }), chercherPhoto(recette, { base: "https://w.test", fetchFn })]);
  assert.deepEqual(a, { id: 9, ext: "jpeg", auteur: "Bo" });
  assert.deepEqual(b, a);
  assert.equal(appels.length, 1);
  assert.equal(appels[0].url, "https://w.test/photo?q=shrimp%20wok");
  assert.deepEqual(photoConnue(recette), a);
  assert.ok(memoire.get(CLE_PHOTOS_RECETTES));
  const enPanne = await chercherPhoto({ id: "z", nom: "Autre plat" }, { base: "https://w.test", fetchFn: async () => new Response("", { status: 503 }) });
  assert.equal(enPanne, undefined, "service absent : on réessaiera");
});

test("Worker /photo : aucun résultat → photo null, gardée en base, Pexels appelé une fois", async () => {
  globalThis.fetch = async (u) => {
    appels.push({ url: String(u) });
    return new Response(JSON.stringify({ photos: [] }), { status: 200 });
  };
  const r = await get("/photo?q=plat%20introuvable");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).photo, null);
  const r2 = await get("/photo?q=PLAT%20introuvable&x=1");
  assert.equal((await r2.json()).photo, null);
  assert.equal(appels.length, 1, "la deuxième recherche vient de la base");
});

test("Worker /photo/img : nosniff et type exact ; une balise <img> sans en-tete Origin passe", async () => {
  const r = await worker.fetch(new Request("https://proxy.test/photo/img/77.jpg"), env, {});
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(appels[0].url, adresseImagePexels("77", "jpeg"));
});

test("mode transition sans base D1 : /photo repond 503 proprement, jamais 500", async () => {
  delete env.DB;
  const r = await get("/photo?q=chicken%20curry");
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error, "service-sature");
  assert.ok(!appels.some((a) => a.url.startsWith("https://api.pexels.com/")), "aucune recherche sans plafond");
  globalThis.fetch = async () => {
    throw new Error("reseau coupe");
  };
  assert.equal((await get("/photo/img/5.jpeg")).status, 503);
  env.DB = fauxD1({ panne: true });
  assert.equal((await get("/photo?q=chicken%20curry")).status, 503);
});

test("les autres routes ne changent pas : GET /ai reste refuse (405), POST /photo aussi", async () => {
  assert.equal((await get("/ai")).status, 405);
  const r = await worker.fetch(new Request("https://proxy.test/photo?q=chicken", { method: "POST", headers: { Origin: "https://coachneiram.github.io" }, body: "{}" }), env, {});
  assert.equal(r.status, 404);
});

test("schéma : une seule table ajoutée, photos_recherches, sans donnée personnelle ; ménage du cron", async () => {
  await get("/photo?q=chicken%20curry");
  const colonnes = env.DB.sqlite.prepare("PRAGMA table_info(photos_recherches)").all().map((c) => c.name);
  assert.deepEqual(colonnes, ["cle", "photo", "expire_le"]);
  env.DB.sqlite.prepare("UPDATE photos_recherches SET expire_le = 1").run();
  await worker.scheduled({}, env, null);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM photos_recherches").get().n, 0);
});

test("plafond par IP : une IPv6 compte pour son bloc /64 (changer d'adresse ne contourne rien)", async () => {
  for (let i = 0; i < PHOTOS_PAR_IP_JOUR; i++) assert.equal((await get("/photo?q=rice%20" + lettres(i), `2001:db8:1:2::${(i + 1).toString(16)}`)).status, 200);
  assert.equal((await (await get("/photo?q=rice%20zzzz", "2001:db8:1:2::ffff")).json()).error, "trop-de-requetes");
  assert.equal((await get("/photo?q=rice%20zzzz", "2001:db8:9:9::1")).status, 200);
});

test("images relayées : plafond par IP et par jour, le Worker n'est pas un relais illimité", async () => {
  const { IMAGES_PAR_IP_JOUR } = PHOTOS;
  for (let i = 0; i < IMAGES_PAR_IP_JOUR; i++) await get("/photo/img/" + (i + 1) + ".jpeg", "7.7.7.7");
  assert.equal((await get("/photo/img/999999.jpeg", "7.7.7.7")).status, 429);
  assert.equal((await get("/photo/img/999999.jpeg", "8.8.8.8")).status, 200);
});
