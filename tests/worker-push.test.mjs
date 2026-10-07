/**
 * Notifications push du Worker (7 octobre 2026) : chiffrement RFC 8291,
 * signature VAPID RFC 8292, abonnements et envoi planifie.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

globalThis.__COACH_TEST__ = {};
const { default: worker } = await import("../worker/coach-neiram-proxy.js");
const { chiffrerWebPush, enTeteVapid, b64url, deB64url } = globalThis.__COACH_TEST__;

/** KV en memoire, avec la meme interface que Cloudflare. */
function kvFactice() {
  const d = new Map();
  return {
    d,
    async get(k, type) {
      const v = d.has(k) ? d.get(k) : null;
      return v != null && type === "json" ? JSON.parse(v) : v;
    },
    async put(k, v) {
      d.set(k, String(v));
    },
    async delete(k) {
      d.delete(k);
    },
    async list({ prefix = "" } = {}) {
      return { keys: [...d.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true };
    }
  };
}

const requete = (chemin, corps) =>
  new Request("https://proxy.test" + chemin, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://coachneiram.github.io" },
    body: JSON.stringify(corps)
  });

/** Un vrai telephone factice : cle de chiffrement et secret d'authentification. */
function telephone(hote = "https://fcm.googleapis.com/fcm/send/abc123") {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const auth = crypto.randomBytes(16);
  return {
    ecdh,
    auth,
    abonnement: { endpoint: hote, keys: { p256dh: b64url(ecdh.getPublicKey()), auth: b64url(auth) } }
  };
}

/** Dechiffre ce que le Worker envoie, comme le ferait le telephone. */
function dechiffrer(tel, corps) {
  const c = Buffer.from(corps);
  const sel = c.subarray(0, 16);
  const cle = c.subarray(21, 86);
  const x = c.subarray(86);
  const hk = (s, k, i, l) => Buffer.from(crypto.hkdfSync("sha256", k, s, i, l));
  const ikm = hk(tel.auth, tel.ecdh.computeSecret(cle), Buffer.concat([Buffer.from("WebPush: info\0"), tel.ecdh.getPublicKey(), cle]), 32);
  const d = crypto.createDecipheriv("aes-128-gcm", hk(sel, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16), hk(sel, ikm, Buffer.from("Content-Encoding: nonce\0"), 12));
  d.setAuthTag(x.subarray(x.length - 16));
  return JSON.parse(Buffer.concat([d.update(x.subarray(0, x.length - 16)), d.final()]).subarray(0, -1).toString());
}

describe("chiffrement et signature", () => {
  test("le chiffrement reproduit l'exemple du RFC 8291 au bit pres", async () => {
    const sortie = await chiffrerWebPush({
      texte: "When I grow up, I want to be a watermelon",
      p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
      auth: "BTBZMqHH6r4Tts7J_aSIgg",
      ephemere: {
        privee: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
        publique: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8"
      },
      sel: deB64url("DGv6ra1nlYgDCS1FRnbzlw")
    });
    assert.equal(
      b64url(sortie),
      "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN"
    );
  });

  test("un message chiffre au hasard se dechiffre chez le telephone", async () => {
    const tel = telephone();
    const sortie = await chiffrerWebPush({ texte: JSON.stringify({ titre: "Créneau à 18:00" }), ...tel.abonnement.keys });
    assert.deepEqual(dechiffrer(tel, sortie), { titre: "Créneau à 18:00" });
  });

  test("l'en-tete VAPID est signe par la cle publique annoncee", async () => {
    const paire = await crypto.webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const vapid = {
      jwk: await crypto.webcrypto.subtle.exportKey("jwk", paire.privateKey),
      publique: b64url(await crypto.webcrypto.subtle.exportKey("raw", paire.publicKey))
    };
    const maintenant = Date.UTC(2026, 9, 7, 12);
    const entete = await enTeteVapid("https://web.push.apple.com/abc", vapid, maintenant);
    const m = entete.match(/^vapid t=([^,]+), k=(.+)$/);
    assert.ok(m, entete);
    assert.equal(m[2], vapid.publique);
    const [h, c, sig] = m[1].split(".");
    assert.deepEqual(JSON.parse(Buffer.from(deB64url(h)).toString()), { typ: "JWT", alg: "ES256" });
    const contenu = JSON.parse(Buffer.from(deB64url(c)).toString());
    assert.equal(contenu.aud, "https://web.push.apple.com");
    assert.match(contenu.sub, /^https:\/\//);
    assert.ok(contenu.exp > maintenant / 1000 && contenu.exp <= maintenant / 1000 + 24 * 3600);
    const cleVerif = crypto.createPublicKey({ key: { kty: "EC", crv: "P-256", x: vapid.jwk.x, y: vapid.jwk.y }, format: "jwk" });
    assert.ok(crypto.verify("sha256", Buffer.from(h + "." + c), { key: cleVerif, dsaEncoding: "ieee-p1363" }, Buffer.from(deB64url(sig))));
  });
});

describe("routes /push", () => {
  let env;
  beforeEach(() => {
    env = { PUSH_KV: kvFactice(), ALLOWED_ORIGINS: "" };
  });

  test("sans stockage configure, les routes repondent 503 sans planter", async () => {
    const r = await worker.fetch(requete("/push/cle", {}), {});
    assert.equal(r.status, 503);
  });

  test("la cle publique est creee une fois, puis toujours la meme", async () => {
    const a = await (await worker.fetch(requete("/push/cle", {}), env)).json();
    const b = await (await worker.fetch(requete("/push/cle", {}), env)).json();
    assert.equal(a.ok, true);
    assert.equal(deB64url(a.cle).length, 65);
    assert.equal(a.cle, b.cle);
    assert.ok(env.PUSH_KV.d.has("vapid"));
  });

  test("un abonnement est enregistre avec ses rappels a venir, nettoyes", async () => {
    const tel = telephone();
    const maintenant = Date.now();
    const rappels = [
      { quand: maintenant + 3600e3, titre: "Créneau", texte: "x".repeat(500), tag: "creneau" },
      { quand: maintenant - 2 * 3600e3, titre: "Trop vieux", texte: "", tag: "" },
      { quand: maintenant + 30 * 24 * 3600e3, titre: "Trop loin", texte: "", tag: "" },
      { quand: "pas une date", titre: "Illisible" },
      ...Array.from({ length: 80 }, (_, i) => ({ quand: maintenant + (i + 2) * 3600e3, titre: "R" + i }))
    ];
    const r = await (await worker.fetch(requete("/push/abonner", { abonnement: tel.abonnement, rappels }), env)).json();
    assert.equal(r.ok, true);
    assert.equal(r.rappels, 60, "au plus 60 rappels gardes");
    const [cle] = [...env.PUSH_KV.d.keys()].filter((k) => k.startsWith("ab:"));
    const fiche = JSON.parse(env.PUSH_KV.d.get(cle));
    assert.equal(fiche.rappels[0].titre, "Créneau");
    assert.equal(fiche.rappels[0].texte.length, 200);
    assert.ok(!fiche.rappels.some((x) => /Trop|Illisible/.test(x.titre)));
    assert.deepEqual(Object.keys(fiche.abonnement.keys).sort(), ["auth", "p256dh"]);
  });

  test("seuls les services de notification des navigateurs sont acceptes", async () => {
    for (const adresse of ["https://evil.example/push", "http://fcm.googleapis.com/x", "https://fcm.googleapis.com.evil.example/x", "pas une url"]) {
      const tel = telephone(adresse);
      const r = await worker.fetch(requete("/push/abonner", { abonnement: tel.abonnement, rappels: [] }), env);
      assert.equal(r.status, 400, adresse);
    }
    for (const adresse of ["https://web.push.apple.com/QGt", "https://updates.push.services.mozilla.com/wpush/v2/x", "https://wns2-par02p.notify.windows.com/w/?token=x"]) {
      const r = await worker.fetch(requete("/push/abonner", { abonnement: telephone(adresse).abonnement, rappels: [] }), env);
      assert.equal(r.status, 200, adresse);
    }
  });

  test("se desabonner efface le telephone", async () => {
    const tel = telephone();
    await worker.fetch(requete("/push/abonner", { abonnement: tel.abonnement, rappels: [] }), env);
    assert.equal([...env.PUSH_KV.d.keys()].filter((k) => k.startsWith("ab:")).length, 1);
    await worker.fetch(requete("/push/desabonner", { endpoint: tel.abonnement.endpoint }), env);
    assert.equal([...env.PUSH_KV.d.keys()].filter((k) => k.startsWith("ab:")).length, 0);
  });
});

describe("envoi planifie", () => {
  const fetchOrigine = globalThis.fetch;

  async function preparer(rappels, reponse = 201) {
    const env = { PUSH_KV: kvFactice() };
    const tel = telephone();
    await worker.fetch(requete("/push/abonner", { abonnement: tel.abonnement, rappels }), env);
    const envois = [];
    globalThis.fetch = async (url, init) => {
      envois.push({ url: String(url), init });
      return new Response(null, { status: reponse });
    };
    return { env, tel, envois };
  }

  test("un rappel arrive a echeance est envoye, chiffre, puis retire ; les suivants restent", async () => {
    const t0 = Date.now();
    const { env, tel, envois } = await preparer([
      { quand: t0 + 60e3, titre: "Ton créneau dans 1 h", texte: "Lundi 18:00", tag: "creneau-lun" },
      { quand: t0 + 5 * 3600e3, titre: "Plus tard", texte: "", tag: "x" }
    ]);
    try {
      await worker.scheduled({}, env, { waitUntil() {} });
      assert.equal(envois.length, 0, "rien n'est du avant l'heure");

      const realNow = Date.now;
      Date.now = () => t0 + 5 * 60e3;
      try {
        await worker.scheduled({}, env, { waitUntil() {} });
      } finally {
        Date.now = realNow;
      }
      assert.equal(envois.length, 1);
      const e = envois[0];
      assert.equal(e.url, tel.abonnement.endpoint);
      assert.equal(e.init.headers["Content-Encoding"], "aes128gcm");
      assert.match(e.init.headers.Authorization, /^vapid t=.+, k=.+$/);
      assert.deepEqual(dechiffrer(tel, e.init.body), { titre: "Ton créneau dans 1 h", texte: "Lundi 18:00", tag: "creneau-lun" });
      const fiche = JSON.parse([...env.PUSH_KV.d.entries()].find(([k]) => k.startsWith("ab:"))[1]);
      assert.deepEqual(fiche.rappels.map((r) => r.titre), ["Plus tard"]);
    } finally {
      globalThis.fetch = fetchOrigine;
    }
  });

  test("un rappel en retard de plus d'une heure n'est pas envoye", async () => {
    const t0 = Date.now();
    const { env, envois } = await preparer([{ quand: t0 + 60e3, titre: "Créneau", texte: "", tag: "c" }]);
    const realNow = Date.now;
    Date.now = () => t0 + 3 * 3600e3;
    try {
      await worker.scheduled({}, env, { waitUntil() {} });
    } finally {
      Date.now = realNow;
      globalThis.fetch = fetchOrigine;
    }
    assert.equal(envois.length, 0);
  });

  test("un telephone desinstalle (410) est oublie", async () => {
    const t0 = Date.now();
    const { env, envois } = await preparer([{ quand: t0 + 60e3, titre: "Créneau", texte: "", tag: "c" }], 410);
    const realNow = Date.now;
    Date.now = () => t0 + 5 * 60e3;
    try {
      await worker.scheduled({}, env, { waitUntil() {} });
    } finally {
      Date.now = realNow;
      globalThis.fetch = fetchOrigine;
    }
    assert.equal(envois.length, 1);
    assert.equal([...env.PUSH_KV.d.keys()].filter((k) => k.startsWith("ab:")).length, 0);
  });

  test("sans stockage, la tache planifiee ne fait rien", async () => {
    await worker.scheduled({}, {}, { waitUntil() {} });
  });
});
