/**
 * Worker : acces des clients a /ai (audit P0-3, 17 octobre 2026).
 *
 * Avant : /ai relayait vers Gemini toute requete venue d'Internet, avec un
 * seul frein par minute garde en memoire (non partage entre instances).
 * Ces tests verrouillent : authentification par jeton client, plafonds par
 * client et global, validation stricte, erreurs sans detail interne, cle
 * Gemini jamais renvoyee, et le mode transition.
 *
 * La base est une vraie SQLite en memoire derriere l'interface D1
 * (tests/faux-d1.mjs).
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fauxD1 } from "./faux-d1.mjs";

globalThis.__COACH_TEST__ = globalThis.__COACH_TEST__ || {};
const { default: worker } = await import("../worker/coach-neiram-proxy.js");
const { validerRequeteIa } = globalThis.__COACH_TEST__;

const CLE_GEMINI = "cle-gemini-secrete-de-test-0123456789";
const ADMIN = "admin-secret-de-test-0123456789-abcdef";
const ORIGINE = "https://coachneiram.github.io";

let env;
let sortants;
let reponseAmont;
const fetchOrigine = globalThis.fetch;
const logOrigine = console.log;
let journaux;

beforeEach(() => {
  env = { GEMINI_API_KEY: CLE_GEMINI, ADMIN_SECRET: ADMIN, DB: fauxD1() };
  sortants = [];
  journaux = [];
  reponseAmont = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Réponse" }] } }], usageMetadata: { promptTokenCount: 3 }, modelVersion: "x" }), { status: 200 });
  globalThis.fetch = async (url, init) => {
    sortants.push({ url: String(url), init });
    return reponseAmont();
  };
  console.log = (...a) => journaux.push(a.join(" "));
});
afterEach(() => {
  globalThis.fetch = fetchOrigine;
  console.log = logOrigine;
});

function requete(chemin, corps, { methode = "POST", jeton, entetes = {}, origine = ORIGINE } = {}) {
  const h = { "Content-Type": "application/json", ...entetes };
  if (origine) h.Origin = origine;
  if (jeton) h.Authorization = "Bearer " + jeton;
  return new Request("https://proxy.test" + chemin, {
    method: methode,
    headers: h,
    body: methode === "POST" || methode === "PUT" ? (typeof corps === "string" ? corps : JSON.stringify(corps ?? {})) : undefined
  });
}
const appeler = (chemin, corps, opts) => worker.fetch(requete(chemin, corps, opts), env);
const admin = (chemin, corps) => appeler(chemin, corps, { jeton: ADMIN, origine: null });

/** Cree un client, son invitation, active le code : rend { jeton, client }. */
async function clientActive(libelle = "Thomas B.") {
  const inv = await (await admin("/admin/invitations", { libelle })).json();
  const act = await (await appeler("/auth/activer", { code: inv.code })).json();
  assert.equal(act.ok, true, "activation");
  return { jeton: act.jeton, client: inv.client, code: inv.code };
}

const IA_OK = { model: "gemini-3.6-flash", messages: [{ role: "user", parts: [{ text: "Idée de dîner ?" }] }], systemPrompt: "Consigne", maxTokens: 700 };
const appelsGemini = () => sortants.filter((s) => s.url.includes("generativelanguage.googleapis.com")).length;

describe("Authentification", () => {
  test("sans authentification : 401 « acces-requis », Gemini n'est pas appele", async () => {
    const r = await appeler("/ai", IA_OK);
    assert.equal(r.status, 401);
    assert.deepEqual(await r.json(), { ok: false, error: "acces-requis" });
    assert.equal(appelsGemini(), 0);
  });

  test("jeton invalide, mal forme ou d'un autre schema : 401 « jeton-invalide »", async () => {
    for (const entete of ["Bearer " + "x".repeat(43), "Bearer court", "Basic dXNlcjpwYXNz", ADMIN]) {
      const r = await worker.fetch(requete("/ai", IA_OK, { entetes: { Authorization: entete } }), env);
      assert.equal(r.status, 401, entete);
      assert.equal((await r.json()).error, "jeton-invalide");
    }
    assert.equal(appelsGemini(), 0);
  });

  test("requete legitime : relayee avec la cle cote serveur, seule la reponse du modele revient", async () => {
    const { jeton } = await clientActive();
    const r = await appeler("/ai", IA_OK, { jeton });
    assert.equal(r.status, 200);
    const corps = await r.json();
    assert.deepEqual(Object.keys(corps), ["candidates"]);
    assert.equal(appelsGemini(), 1);
    const envoye = sortants[0];
    assert.equal(envoye.init.headers["x-goog-api-key"], CLE_GEMINI);
    const charge = JSON.parse(envoye.init.body);
    assert.equal(charge.systemInstruction.parts[0].text, "Consigne");
    assert.equal(charge.generationConfig.maxOutputTokens, 700);
  });

  test("client revoque : son jeton ne passe plus", async () => {
    const { jeton, client } = await clientActive();
    assert.equal((await appeler("/ai", IA_OK, { jeton })).status, 200);
    assert.equal((await admin("/admin/revoquer", { client })).status, 200);
    const r = await appeler("/ai", IA_OK, { jeton });
    assert.equal(r.status, 401);
  });

  test("base absente ou en panne en mode obligatoire : 503, jamais d'acces ouvert", async () => {
    for (const DB of [undefined, fauxD1({ panne: true })]) {
      const r = await worker.fetch(requete("/ai", IA_OK, { jeton: "y".repeat(43) }), { ...env, DB });
      assert.equal(r.status, 503);
      assert.equal((await r.json()).error, "acces-non-configure");
    }
    assert.equal(appelsGemini(), 0);
  });
});

describe("Plafonds", () => {
  test("frequence : au-dela de 8 appels par minute, 429 sans appeler Gemini", async () => {
    const { jeton } = await clientActive();
    const statuts = [];
    for (let i = 0; i < 10; i++) statuts.push((await appeler("/ai", IA_OK, { jeton })).status);
    assert.deepEqual(statuts, [200, 200, 200, 200, 200, 200, 200, 200, 429, 429]);
    assert.equal(appelsGemini(), 8);
    const r = await appeler("/ai", IA_OK, { jeton });
    assert.equal((await r.json()).error, "trop-de-requetes");
  });

  test("volume par jour : « quota-client » une fois les 80 appels du jour atteints", async () => {
    const { jeton, client } = await clientActive();
    const jour = new Date().toISOString().slice(0, 10);
    env.DB.sqlite.prepare("INSERT INTO compteurs (cle, n, expire_le) VALUES (?, 80, ?)").run(`ia:jour:${client}:${jour}`, Date.now() + 86400000);
    const r = await appeler("/ai", IA_OK, { jeton });
    assert.equal(r.status, 429);
    assert.equal((await r.json()).error, "quota-client");
    assert.equal(appelsGemini(), 0);
  });

  test("changer de client ne contourne pas le plafond global (PLAFOND_IA_JOUR)", async () => {
    env.PLAFOND_IA_JOUR = "3";
    const a = await clientActive("Alice");
    const b = await clientActive("Bruno");
    const c = await clientActive("Chloé");
    const statuts = [];
    for (const { jeton } of [a, b, c, a, b]) statuts.push((await appeler("/ai", IA_OK, { jeton })).status);
    assert.deepEqual(statuts, [200, 200, 200, 429, 429]);
    assert.equal(appelsGemini(), 3);
  });

  test("les compteurs sont par client : le plafond de l'un ne bloque pas l'autre", async () => {
    const a = await clientActive("Alice");
    const b = await clientActive("Bruno");
    for (let i = 0; i < 9; i++) await appeler("/ai", IA_OK, { jeton: a.jeton });
    assert.equal((await appeler("/ai", IA_OK, { jeton: a.jeton })).status, 429);
    assert.equal((await appeler("/ai", IA_OK, { jeton: b.jeton })).status, 200);
  });
});

describe("Validation de la requete", () => {
  test("charge trop volumineuse : 413, rien n'est relaye", async () => {
    const { jeton } = await clientActive();
    const gros = { ...IA_OK, messages: [{ role: "user", parts: [{ text: "a".repeat(9 * 1024 * 1024) }] }] };
    const r = await appeler("/ai", gros, { jeton });
    assert.equal(r.status, 413);
    assert.equal(appelsGemini(), 0);
  });

  test("parametres invalides : 400 avec un code, rien n'est relaye", async () => {
    const { jeton } = await clientActive();
    const image = (mimeType, data = "QUJD") => ({ inlineData: { mimeType, data } });
    const cas = {
      "champ-inconnu": { ...IA_OK, generationConfig: { temperature: 2 } },
      "modele-non-autorise": { ...IA_OK, model: "gemini-ultra-pirate" },
      "messages-manquants": { ...IA_OK, messages: [] },
      "message-invalide": { ...IA_OK, messages: [{ role: "system", parts: [{ text: "x" }] }] },
      "image-invalide": { ...IA_OK, messages: [{ role: "user", parts: [image("application/pdf")] }] },
      "trop-d-images": { ...IA_OK, messages: [{ role: "user", parts: Array.from({ length: 9 }, () => image("image/jpeg")) }] },
      "consigne-invalide": { ...IA_OK, systemPrompt: { texte: "x" } },
      "max-tokens-invalide": { ...IA_OK, maxTokens: -5 },
      "texte-trop-long": { ...IA_OK, systemPrompt: "x".repeat(61000) },
      "json-invalide": "{pas du json"
    };
    for (const [attendu, corps] of Object.entries(cas)) {
      // Une requete invalide compte dans le plafond (voulu : elle ne doit
      // pas permettre de marteler le proxy) ; on repart de zero a chaque cas.
      env.DB.sqlite.exec("DELETE FROM compteurs");
      const r = await appeler("/ai", corps, { jeton });
      assert.equal(r.status, 400, attendu);
      assert.equal((await r.json()).error, attendu);
    }
    assert.equal(appelsGemini(), 0);
  });

  test("ce que l'application envoie reellement passe la validation (texte, photo, conversation)", async () => {
    const { construireMessages } = await import("../app/src/lib/ia.js");
    const photo = construireMessages({ prompt: "Analyse", images: [{ label: "Repas :", dataUrl: "data:image/jpeg;base64,QUJDRA==" }] });
    const conversation = construireMessages({ history: [{ role: "user", text: "a" }, { role: "assistant", text: "b" }, { role: "user", text: "c" }] });
    for (const messages of [photo, conversation]) {
      const v = validerRequeteIa({ model: "gemini-3.6-flash", messages, systemPrompt: "s", maxTokens: 512 });
      assert.equal(v.erreur, undefined, JSON.stringify(v));
    }
  });

  test("methode non autorisee : 405", async () => {
    for (const methode of ["GET", "PUT", "DELETE"]) {
      const r = await appeler("/ai", IA_OK, { methode });
      assert.equal(r.status, 405, methode);
    }
  });

  test("origine de navigateur non autorisee : 403 ; sans en-tete Origin, pas de controle CORS", async () => {
    const r = await appeler("/ai", IA_OK, { origine: "https://site-pirate.example" });
    assert.equal(r.status, 403);
    assert.equal((await r.json()).error, "origine-refusee");
    const sansOrigine = await appeler("/ai", IA_OK, { origine: null });
    assert.equal(sansOrigine.status, 401, "le jeton reste exige");
    const pre = await appeler("/ai", null, { methode: "OPTIONS" });
    assert.equal(pre.status, 204);
    assert.match(pre.headers.get("Access-Control-Allow-Headers"), /Authorization/);
    assert.equal(pre.headers.get("Access-Control-Allow-Origin"), ORIGINE);
  });
});

describe("Erreurs du fournisseur", () => {
  const CAS = [
    [429, 429, "quota-fournisseur"],
    [403, 503, "fournisseur-refus"],
    [401, 503, "fournisseur-refus"],
    [400, 502, "requete-refusee-fournisseur"],
    [500, 502, "fournisseur-indisponible"],
    [503, 502, "fournisseur-indisponible"]
  ];
  for (const [amont, attendu, code] of CAS) {
    test(`Gemini ${amont} → ${attendu} « ${code} », sans le corps de Google`, async () => {
      const { jeton } = await clientActive();
      reponseAmont = () => new Response(JSON.stringify({ error: { message: "API key AIzaFUITE not valid for project 1234" } }), { status: amont });
      const r = await appeler("/ai", IA_OK, { jeton });
      assert.equal(r.status, attendu);
      const texte = await r.text();
      assert.deepEqual(JSON.parse(texte), { ok: false, error: code });
      assert.ok(!/AIza|project/.test(texte));
    });
  }

  test("Gemini injoignable : 502 « amont-injoignable »", async () => {
    const { jeton } = await clientActive();
    globalThis.fetch = async () => {
      throw new Error("ECONNRESET vers 142.250.0.1");
    };
    const r = await appeler("/ai", IA_OK, { jeton });
    assert.equal(r.status, 502);
    assert.deepEqual(await r.json(), { ok: false, error: "amont-injoignable" });
  });

  test("cle Gemini absente : 503, avant toute autre chose", async () => {
    delete env.GEMINI_API_KEY;
    const r = await appeler("/ai", IA_OK);
    assert.equal(r.status, 503);
    assert.equal((await r.json()).error, "proxy-non-configure");
  });
});

describe("La cle Gemini reste cote serveur", () => {
  test("aucune reponse ni aucun journal ne la contient", async () => {
    const { jeton } = await clientActive();
    const textes = [];
    for (const corps of [IA_OK, { ...IA_OK, model: "x" }]) textes.push(await (await appeler("/ai", corps, { jeton })).text());
    reponseAmont = () => new Response("{}", { status: 403 });
    textes.push(await (await appeler("/ai", IA_OK, { jeton })).text());
    for (const t of [...textes, ...journaux]) assert.ok(!t.includes(CLE_GEMINI), t);
  });

  test("le journal ne contient ni le contenu ni le prenom du client", async () => {
    const { jeton } = await clientActive("Thomas B.");
    await appeler("/ai", IA_OK, { jeton });
    assert.ok(journaux.length > 0);
    for (const j of journaux) {
      assert.ok(!/dîner|Thomas|Consigne/.test(j), j);
    }
  });

  test("ni le code de l'application ni sa configuration ne portent de cle", () => {
    const fichiers = [];
    const parcourir = (d) =>
      readdirSync(d, { withFileTypes: true }).forEach((f) =>
        f.isDirectory() ? parcourir(join(d, f.name)) : /\.(js|jsx)$/.test(f.name) && fichiers.push(join(d, f.name))
      );
    parcourir(join(process.cwd(), "app", "src"));
    for (const f of fichiers) {
      const t = readFileSync(f, "utf8");
      assert.ok(!/x-goog-api-key|AIza[0-9A-Za-z_-]{20,}|generativelanguage\.googleapis\.com/.test(t), f);
    }
  });
});

describe("Codes d'invitation", () => {
  test("un code ne sert qu'une fois ; la saisie tolere minuscules, espaces et tiret", async () => {
    const inv = await (await admin("/admin/invitations", { libelle: "Léa" })).json();
    assert.match(inv.code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    const premier = await appeler("/auth/activer", { code: " " + inv.code.toLowerCase().replace("-", " ") + " " });
    assert.equal(premier.status, 200);
    const second = await appeler("/auth/activer", { code: inv.code });
    assert.equal(second.status, 400);
    assert.equal((await second.json()).error, "code-invalide");
  });

  test("un code expire ou d'un client revoque ne donne rien", async () => {
    const inv = await (await admin("/admin/invitations", { libelle: "Marc" })).json();
    env.DB.sqlite.prepare("UPDATE invitations SET expire_le = 1").run();
    assert.equal((await appeler("/auth/activer", { code: inv.code })).status, 400);
    const inv2 = await (await admin("/admin/invitations", { libelle: "Nina" })).json();
    await admin("/admin/revoquer", { client: inv2.client });
    assert.equal((await appeler("/auth/activer", { code: inv2.code })).status, 400);
  });

  test("essais de codes au hasard : bloques apres 10 par heure et par adresse", async () => {
    const statuts = [];
    for (let i = 0; i < 12; i++) statuts.push((await appeler("/auth/activer", { code: "AAAA-AAA" + "BCDEFGHJKLMN"[i] })).status);
    assert.deepEqual(statuts.slice(0, 10), Array(10).fill(400));
    assert.deepEqual(statuts.slice(10), [429, 429]);
  });

  test("nouveau telephone : une nouvelle invitation pour le meme client, l'ancien jeton reste valide", async () => {
    const a = await clientActive("Paul");
    const inv = await (await admin("/admin/invitations", { client: a.client })).json();
    const act = await (await appeler("/auth/activer", { code: inv.code })).json();
    assert.equal(act.libelle, "Paul");
    assert.equal((await appeler("/ai", IA_OK, { jeton: act.jeton })).status, 200);
    assert.equal((await appeler("/ai", IA_OK, { jeton: a.jeton })).status, 200);
  });

  test("la base ne garde que des empreintes : ni code ni jeton en clair", async () => {
    const { jeton, code } = await clientActive();
    const tout = JSON.stringify([
      env.DB.sqlite.prepare("SELECT * FROM invitations").all(),
      env.DB.sqlite.prepare("SELECT * FROM jetons").all()
    ]);
    assert.ok(!tout.includes(jeton));
    assert.ok(!tout.includes(code.replace("-", "")));
  });
});

describe("Routes du coach", () => {
  test("sans ADMIN_SECRET configure (ou trop court) : les routes n'existent pas", async () => {
    for (const ADMIN_SECRET of [undefined, "court"]) {
      const r = await worker.fetch(requete("/admin/invitations", { libelle: "X" }, { jeton: "court", origine: null }), { ...env, ADMIN_SECRET });
      assert.equal(r.status, 404);
    }
  });

  test("mauvais secret : 401, puis 429 apres 10 essais", async () => {
    const statuts = [];
    for (let i = 0; i < 11; i++) statuts.push((await appeler("/admin/clients", {}, { jeton: "faux-" + i + "-".repeat(30), origine: null })).status);
    assert.deepEqual(statuts.slice(0, 10), Array(10).fill(401));
    assert.equal(statuts[10], 429);
  });

  test("libelle valide exige ; liste des clients sans aucun jeton", async () => {
    assert.equal((await admin("/admin/invitations", { libelle: "<script>" })).status, 400);
    await clientActive("Zoé");
    const liste = await (await admin("/admin/clients", {})).json();
    assert.equal(liste.clients.length, 1);
    assert.deepEqual(Object.keys(liste.clients[0]).sort(), ["cree_le", "id", "jetons", "libelle", "revoque_le"]);
    assert.equal(liste.clients[0].jetons, 1);
  });
});

describe("Mode transition (le temps de distribuer les codes)", () => {
  beforeEach(() => {
    env.ACCES_CLIENTS = "transition";
  });

  test("sans jeton : accepte sous plafond anonyme (20 par heure et par adresse)", async () => {
    const statuts = [];
    for (let i = 0; i < 22; i++) {
      const r = await worker.fetch(requete("/ai", IA_OK, { entetes: { "CF-Connecting-IP": "203.0.113.7" } }), env);
      statuts.push(r.status);
      if (r.status !== 200) assert.equal((await r.json()).error, "trop-de-requetes");
    }
    // Le frein par minute ne vaut que pour un client identifie ; ici, la limite horaire anonyme.
    assert.equal(statuts.filter((s) => s === 200).length, 20);
  });

  test("un jeton present mais invalide reste refuse", async () => {
    const r = await appeler("/ai", IA_OK, { jeton: "z".repeat(43) });
    assert.equal(r.status, 401);
  });

  test("sans base D1, le comportement d'avant (frein en memoire) plutot qu'un arret", async () => {
    delete env.DB;
    const r = await worker.fetch(requete("/ai", IA_OK, { entetes: { "CF-Connecting-IP": "198.51.100.9" } }), env);
    assert.equal(r.status, 200);
  });
});

describe("Outil du coach (worker/invitations.mjs)", () => {
  test("creer, nouveau code, liste, revoquer : de bout en bout contre le Worker", async () => {
    const { commande } = await import("../worker/invitations.mjs");
    const f = (url, init) => worker.fetch(new Request(url, init), env);
    const o = { secret: ADMIN, fetch: f, base: "https://proxy.test" };
    const cree = await commande(["creer", "Thomas B."], o);
    const id = cree.match(/id ([0-9a-f]{24})/)[1];
    assert.match(cree, /Code : [A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}/);
    assert.match(await commande(["code", id], o), /Nouveau code pour « Thomas B. »/);
    assert.match(await commande(["liste"], o), /Thomas B\.\s+0 téléphone/);
    assert.match(await commande(["revoquer", id], o), /révoqués/);
    assert.match(await commande(["liste"], o), /RÉVOQUÉ/);
    await assert.rejects(() => commande(["liste"], { ...o, secret: "faux".repeat(10) }), /refus du proxy \(401\)/);
    await assert.rejects(() => commande(["liste"], { ...o, secret: "" }), /ADMIN_SECRET manquant/);
    await assert.rejects(() => commande(["inconnue"], o), /Usage/);
  });
});
