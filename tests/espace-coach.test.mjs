/**
 * Espace coach (24 octobre 2026) : page à part (app/espace-coach.html)
 * pour les routes /admin du Worker, sans terminal.
 *
 * Vérifie : page séparée et jamais reliée à l'app des clients, secret
 * gardé en mémoire seulement (aucun stockage, cookie, adresse ni console),
 * envoyé uniquement dans l'en-tête Authorization vers le Worker de l'app,
 * erreurs claires (401, 429, 404), et le parcours complet sur le vrai
 * Worker (fausse D1).
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fauxD1 } from "./faux-d1.mjs";

globalThis.__COACH_TEST__ = globalThis.__COACH_TEST__ || {};
const { default: worker } = await import("../worker/coach-neiram-proxy.js");
const E = await import("../app/src/lib/espace-coach.js");
const { PROXY_BASE_URL } = await import("../app/src/lib/config.js");

const RACINE = new URL("../", import.meta.url).pathname;
const lire = (c) => readFileSync(join(RACINE, c), "utf8");
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const FICHIERS = ["app/src/lib/espace-coach.js", "app/src/ui/EspaceCoach.jsx", "app/src/espace-coach.jsx", "app/espace-coach.html"];
const ADMIN = "admin-secret-de-test-0123456789-abcdef";

describe("page à part, jamais reliée à l'app des clients", () => {
  test("seconde page Vite (multi-page), base « ./ » gardée", () => {
    const v = lire("app/vite.config.js");
    assert.match(v, /base: "\.\/"/);
    assert.match(v, /"espace-coach": fileURLToPath\(new URL\("\.\/espace-coach\.html"/);
    assert.match(lire("app/espace-coach.html"), /src="\/src\/espace-coach\.jsx"/);
    assert.match(lire("app/espace-coach.html"), /noindex/);
    assert.ok(!/serviceWorker|manifest/.test(sansCommentaires(lire("app/espace-coach.html")).replace(/<!--[\s\S]*?-->/g, "")));
  });

  test("aucun lien ni bouton vers l'Espace coach dans l'app des clients", () => {
    const fautifs = [];
    const parcourir = (d) => {
      for (const f of readdirSync(join(RACINE, d), { withFileTypes: true })) {
        const c = join(d, f.name);
        if (f.isDirectory()) parcourir(c);
        else if (/\.(jsx?|html|css)$/.test(f.name) && !FICHIERS.includes(c) && /espace-coach|EspaceCoach|\/admin\//.test(lire(c))) fautifs.push(c);
      }
    };
    parcourir("app/src");
    if (/espace-coach/.test(lire("app/index.html"))) fautifs.push("app/index.html");
    assert.deepEqual(fautifs, []);
  });

  test("construite : index.html ne charge pas le code de l'Espace coach", { skip: existsSync(join(RACINE, "app/dist/espace-coach.html")) ? false : "app/dist absent" }, () => {
    const index = lire("app/dist/index.html");
    assert.ok(!/espace-coach/.test(index));
    const entree = /src="\.\/assets\/(espace-coach-[^"]+\.js)"/.exec(lire("app/dist/espace-coach.html"));
    assert.ok(entree, "point d'entrée de l'Espace coach absent");
    assert.ok(!index.includes(entree[1]));
  });
});

describe("le secret reste en mémoire", () => {
  test("ni stockage, ni cookie, ni adresse, ni console dans le code de la page", () => {
    for (const f of FICHIERS) {
      const s = sansCommentaires(lire(f));
      for (const interdit of [/localStorage/, /sessionStorage/, /indexedDB/, /document\.cookie/, /console\./, /history\.(push|replace)State/, /location\.(hash|search)\s*=/, /stockage\.js/]) {
        assert.ok(!interdit.test(s), `${f} : ${interdit}`);
      }
    }
    assert.match(lire("app/src/ui/EspaceCoach.jsx"), /type="password"/);
    assert.equal(E.DELAI_VERROU_MS, 15 * 60000);
  });

  test("le secret part seulement dans l'en-tête Authorization, vers le Worker de l'app", async () => {
    const appels = [];
    const env = {
      fetch: async (url, init) => {
        appels.push({ url, init });
        return { ok: true, status: 200, json: async () => ({ ok: true, clients: [] }) };
      }
    };
    await E.listeClients("mon-secret-tres-long-0123456789abcdef", env);
    assert.equal(appels[0].url, PROXY_BASE_URL + "/admin/clients");
    assert.equal(appels[0].init.headers.Authorization, "Bearer mon-secret-tres-long-0123456789abcdef");
    assert.ok(!appels[0].url.includes("secret") && !appels[0].init.body.includes("secret"));
    assert.equal(appels[0].init.credentials, "omit");
    await assert.rejects(E.listeClients("", env), /401/, "sans secret, rien ne part");
    assert.equal(appels.length, 1);
  });

  test("erreurs claires : secret refusé, trop d'essais, espace non activé, réseau", async () => {
    for (const [statut, attendu] of [[401, /Secret refusé/], [429, /réessaie dans une heure/], [404, /pas activé sur le serveur/]]) {
      const env = { fetch: async () => ({ ok: false, status: statut, json: async () => ({ ok: false }) }) };
      await assert.rejects(E.listeClients("x".repeat(40), env), (e) => attendu.test(E.messageErreurAdmin(e)));
    }
    const horsLigne = { fetch: async () => { throw new Error("hors ligne"); } };
    await assert.rejects(E.listeClients("x".repeat(40), horsLigne), (e) => /Pas de connexion/.test(E.messageErreurAdmin(e)));
  });
});

describe("parcours sur le vrai Worker", () => {
  let env;
  const dateOrigine = Date.now;
  const logOrigine = console.log;
  beforeEach(() => {
    console.log = () => {};
  });
  afterEach(() => {
    Date.now = dateOrigine;
    console.log = logOrigine;
  });
  const vers = (envWorker) => ({
    fetch: async (url, init) => {
      const r = await worker.fetch(new Request(url.replace(PROXY_BASE_URL, "https://proxy.test"), { ...init, headers: { ...init.headers, "CF-Connecting-IP": "10.9.9.9" } }), envWorker);
      return { ok: r.ok, status: r.status, json: () => r.json() };
    }
  });

  test("404 sans ADMIN_SECRET, 401 puis 429 avec un mauvais secret", async () => {
    await assert.rejects(E.listeClients(ADMIN, vers({ DB: fauxD1() })), /404/);
    env = { ADMIN_SECRET: ADMIN, DB: fauxD1() };
    await assert.rejects(E.listeClients("faux-secret-0123456789-0123456789", vers(env)), /401/);
    for (let i = 0; i < 9; i++) await E.listeClients("faux-secret-0123456789-0123456789", vers(env)).catch(() => null);
    await assert.rejects(E.listeClients("faux-secret-0123456789-0123456789", vers(env)), /429/);
  });

  test("créer un code, nouveau code d'un client, liste, révoquer, modérer", async () => {
    env = { ADMIN_SECRET: ADMIN, DB: fauxD1() };
    const f = vers(env);
    await assert.rejects(E.creerCode({ libelle: "<script>" }, ADMIN, f), /libelle-invalide/);
    const c = await E.creerCode({ libelle: "Thomas B." }, ADMIN, f);
    assert.match(c.code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    assert.ok(Date.parse(c.expireLe) > Date.now());
    const liste = (await E.listeClients(ADMIN, f)).clients;
    assert.equal(liste.length, 1);
    assert.equal(E.etatClient(liste[0]), "sans-jeton", "code pas encore activé");
    const autre = await E.creerCode({ client: liste[0].id }, ADMIN, f);
    assert.equal(autre.client, liste[0].id);
    await E.revoquerClient(liste[0].id, ADMIN, f);
    assert.equal(E.etatClient((await E.listeClients(ADMIN, f)).clients[0]), "revoque");
    const m = await E.moderation("signalements", null, ADMIN, f);
    assert.deepEqual(m.signalements, []);
    await assert.rejects(E.moderation("masquer", "Personne", ADMIN, f), (e) => /introuvable/.test(E.messageErreurAdmin(e)));
  });

  test("présence (Smart Coach) : /admin/presence, les plus inactifs d'abord", async () => {
    env = { ADMIN_SECRET: ADMIN, DB: fauxD1() };
    const f = vers(env);
    await E.creerCode({ libelle: "Thomas B." }, ADMIN, f);
    const p = await E.presenceClients(ADMIN, f);
    assert.deepEqual(p.clients.map((c) => [c.libelle, c.jours, c.niveau]), [["Thomas B.", null, null]]);
    await assert.rejects(E.presenceClients("faux-secret-0123456789-0123456789", f), /401/);
    const tri = E.trierPresence([
      { libelle: "Jamais", jours: null, niveau: null },
      { libelle: "Actif", jours: 1, niveau: null },
      { libelle: "Attention", jours: 5, niveau: "attention" },
      { libelle: "Critique", jours: 9, niveau: "critique" },
      { libelle: "Trois", jours: 3, niveau: null }
    ]);
    assert.deepEqual(tri.map((c) => c.libelle), ["Critique", "Attention", "Trois", "Actif", "Jamais"]);
    assert.equal(E.TEXTES_ESPACE_COACH.joursSansSaisie(0), "actif aujourd'hui");
    assert.equal(E.TEXTES_ESPACE_COACH.joursSansSaisie(5), "5 jours sans saisie");
    assert.equal(E.TEXTES_ESPACE_COACH.derniereSaisie("2026-10-21"), "dernière saisie le 21/10/2026");
  });

  test("libellé vérifié avant l'envoi, comme le Worker", () => {
    assert.ok(E.libelleValide("Thomas B."));
    assert.ok(E.libelleValide("Jean-Marc D'A."));
    assert.ok(!E.libelleValide(""));
    assert.ok(!E.libelleValide("x".repeat(41)));
    assert.ok(!E.libelleValide("Thomas <b>"));
  });
});
