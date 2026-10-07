/**
 * Rappels push cote application (7 octobre 2026) : planning des 7 jours,
 * envoi au serveur, activation et service worker.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  CLE_PUSH_ACTIF,
  CLE_PUSH_PLANNING,
  activerPush,
  cleEnOctets,
  desactiverPush,
  planningRappels,
  pushAutorise,
  synchroniserPush
} from "../app/src/lib/push.js";
import { RAPPEL_CRENEAU, RAPPEL_DIMANCHE, messageCreneau } from "../app/src/lib/rappels.js";

const lire = (c) => readFileSync(new URL("../" + c, import.meta.url), "utf8");

// Lundi 5 octobre 2026, 10 h (heure locale).
const LUNDI_10H = new Date(2026, 9, 5, 10, 0);
const PROFIL = {
  name: "Tom",
  coachingMode: "enligne",
  slots: [
    { id: "c1", day: "mon", time: "18:30" },
    { id: "c2", day: "thu", time: "07:00" }
  ]
};
const heure = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

describe("planning des 7 prochains jours", () => {
  test("creneaux 1 h avant et bilan du dimanche a 17 h, dans l'ordre", () => {
    const p = planningRappels({ profil: PROFIL, maintenant: LUNDI_10H });
    assert.deepEqual(p.map((r) => [heure(r.quand), r.tag]), [
      ["2026-10-05 17:30", RAPPEL_CRENEAU.tag],
      ["2026-10-08 06:00", RAPPEL_CRENEAU.tag],
      ["2026-10-11 17:00", RAPPEL_DIMANCHE.tag],
      ["2026-10-12 17:30", RAPPEL_CRENEAU.tag]
    ]);
  });

  test("memes titres et textes que les rappels de l'application ouverte", () => {
    const [lundi, , dimanche] = planningRappels({ profil: PROFIL, maintenant: LUNDI_10H });
    assert.equal(lundi.titre, RAPPEL_CRENEAU.titre);
    assert.equal(lundi.texte, messageCreneau("Lundi", "18:30"));
    assert.equal(dimanche.titre, RAPPEL_DIMANCHE.titre);
    assert.equal(dimanche.texte, RAPPEL_DIMANCHE.message);
  });

  test("une seance deja notee annule le rappel du jour, pas celui de la semaine suivante", () => {
    const p = planningRappels({ profil: PROFIL, seances: [{ date: "2026-10-05", slotId: "c1" }], maintenant: LUNDI_10H });
    assert.ok(!p.some((r) => heure(r.quand) === "2026-10-05 17:30"));
    assert.ok(p.some((r) => heure(r.quand) === "2026-10-12 17:30"));
  });

  test("une seance de maintien compte aussi", () => {
    const p = planningRappels({ profil: PROFIL, seances: [{ date: "2026-10-05", maintenance: true }], maintenant: LUNDI_10H });
    assert.ok(!p.some((r) => heure(r.quand) === "2026-10-05 17:30"));
  });

  test("un rappel deja passe n'est pas planifie", () => {
    const p = planningRappels({ profil: PROFIL, maintenant: new Date(2026, 9, 5, 17, 45) });
    assert.ok(!p.some((r) => heure(r.quand) === "2026-10-05 17:30"));
  });

  test("bilan deja envoye cette semaine : pas de rappel du dimanche", () => {
    const p = planningRappels({ profil: PROFIL, bilanEnvoye: "2026-10-05", maintenant: LUNDI_10H });
    assert.ok(!p.some((r) => r.tag === RAPPEL_DIMANCHE.tag));
  });

  test("les rappels desactives dans les reglages ne sont pas planifies", () => {
    assert.ok(!planningRappels({ profil: { ...PROFIL, creneauReminderEnabled: false }, maintenant: LUNDI_10H }).some((r) => r.tag === RAPPEL_CRENEAU.tag));
    assert.ok(!planningRappels({ profil: { ...PROFIL, reportReminderEnabled: false }, maintenant: LUNDI_10H }).some((r) => r.tag === RAPPEL_DIMANCHE.tag));
  });

  test("sans creneau, seul le dimanche ; sans profil, rien", () => {
    assert.deepEqual(planningRappels({ profil: { name: "Léa" }, maintenant: LUNDI_10H }).map((r) => r.tag), [RAPPEL_DIMANCHE.tag]);
    assert.deepEqual(planningRappels({ profil: null, maintenant: LUNDI_10H }), []);
  });

  test("tout reste dans l'horizon accepte par le serveur (8 jours)", () => {
    const p = planningRappels({ profil: PROFIL, maintenant: LUNDI_10H });
    assert.ok(p.every((r) => r.quand - LUNDI_10H.getTime() < 8 * 24 * 3600e3));
  });
});

/** Environnement de navigateur factice, controle par le test. */
function envFactice({ abonne = true, permission = "granted", statutCle = 200, sansPush = false } = {}) {
  const stock = new Map();
  const appels = [];
  let abonnement = abonne
    ? { endpoint: "https://fcm.googleapis.com/fcm/send/xyz", toJSON() { return { endpoint: this.endpoint, keys: { p256dh: "p", auth: "a" } }; }, unsubscribe: async () => { abonnement = null; return true; } }
    : null;
  const souscriptions = [];
  const pushManager = {
    getSubscription: async () => abonnement,
    subscribe: async (opts) => {
      souscriptions.push(opts);
      abonnement = { endpoint: "https://fcm.googleapis.com/fcm/send/neuf", toJSON() { return { endpoint: this.endpoint, keys: { p256dh: "p", auth: "a" } }; }, unsubscribe: async () => true };
      return abonnement;
    }
  };
  const env = {
    location: { hostname: "coachneiram.github.io" },
    localStorage: { getItem: (k) => (stock.has(k) ? stock.get(k) : null), setItem: (k, v) => stock.set(k, String(v)), removeItem: (k) => stock.delete(k) },
    navigator: { serviceWorker: { getRegistration: async () => ({ pushManager }), ready: Promise.resolve({ pushManager }) } },
    Notification: { permission, requestPermission: async () => permission },
    fetch: async (url, init) => {
      appels.push({ url, corps: JSON.parse(init.body) });
      if (url.endsWith("/push/cle")) return new Response(JSON.stringify(statutCle === 200 ? { ok: true, cle: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8" } : { ok: false }), { status: statutCle });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
  };
  if (!sansPush) env.PushManager = function () {};
  return { env, stock, appels, souscriptions, abonnement: () => abonnement };
}

describe("envoi du planning au serveur", () => {
  test("rien ne part tant que l'option n'est pas activee", async () => {
    const { env, appels } = envFactice();
    assert.equal(await synchroniserPush({ profil: PROFIL, maintenant: LUNDI_10H, env }), false);
    assert.equal(appels.length, 0);
  });

  test("le planning part une fois, puis seulement s'il change ou s'il date d'un jour", async () => {
    const { env, stock, appels } = envFactice();
    stock.set(CLE_PUSH_ACTIF, "1");
    assert.equal(await synchroniserPush({ profil: PROFIL, maintenant: LUNDI_10H, env }), true);
    assert.equal(appels.length, 1);
    assert.match(appels[0].url, /\/push\/abonner$/);
    assert.equal(appels[0].corps.abonnement.endpoint, "https://fcm.googleapis.com/fcm/send/xyz");
    assert.equal(appels[0].corps.rappels.length, 4);
    assert.ok(!JSON.stringify(appels[0].corps).includes("Tom"), "le prenom ne part pas");

    await synchroniserPush({ profil: PROFIL, maintenant: new Date(2026, 9, 5, 11, 0), env });
    assert.equal(appels.length, 1, "inchange : rien ne repart");

    await synchroniserPush({ profil: PROFIL, seances: [{ date: "2026-10-05", slotId: "c1" }], maintenant: new Date(2026, 9, 5, 12, 0), env });
    assert.equal(appels.length, 2, "seance notee : le planning repart");
    assert.equal(appels[1].corps.rappels.length, 3);

    await synchroniserPush({ profil: PROFIL, seances: [{ date: "2026-10-05", slotId: "c1" }], maintenant: new Date(2026, 9, 6, 13, 0), env });
    assert.equal(appels.length, 3, "plus d'un jour : renvoye meme si rien n'a change ailleurs");
    assert.ok(stock.has(CLE_PUSH_PLANNING));
  });

  test("en local, rien ne part vers le vrai serveur sans autorisation", async () => {
    const { env, stock, appels } = envFactice();
    stock.set(CLE_PUSH_ACTIF, "1");
    env.location = { hostname: "localhost" };
    assert.equal(pushAutorise(env), false);
    await synchroniserPush({ profil: PROFIL, maintenant: LUNDI_10H, env });
    assert.equal(appels.length, 0);
    stock.set("cn_push_locale", "1");
    assert.equal(pushAutorise(env), true);
  });
});

describe("activation et desactivation", () => {
  test("activer : abonnement avec la cle du serveur, option memorisee, planning envoye", async () => {
    const f = envFactice({ abonne: false });
    assert.equal(await activerPush({ profil: PROFIL, env: f.env }), "actif");
    assert.equal(f.souscriptions.length, 1);
    assert.equal(f.souscriptions[0].userVisibleOnly, true);
    assert.equal(f.souscriptions[0].applicationServerKey.length, 65);
    assert.equal(f.stock.get(CLE_PUSH_ACTIF), "1");
    assert.ok(f.appels.some((a) => a.url.endsWith("/push/abonner")));
  });

  test("autorisation refusee, telephone incapable, serveur absent", async () => {
    assert.equal(await activerPush({ profil: PROFIL, env: envFactice({ permission: "denied" }).env }), "refuse");
    assert.equal(await activerPush({ profil: PROFIL, env: envFactice({ sansPush: true }).env }), "indisponible");
    const sansServeur = envFactice({ statutCle: 503 });
    assert.equal(await activerPush({ profil: PROFIL, env: sansServeur.env }), "indisponible");
    assert.equal(sansServeur.stock.get(CLE_PUSH_ACTIF), undefined);
  });

  test("desactiver : le serveur oublie le telephone, l'abonnement est coupe", async () => {
    const f = envFactice();
    f.stock.set(CLE_PUSH_ACTIF, "1");
    assert.equal(await desactiverPush(f.env), true);
    assert.ok(f.appels.some((a) => a.url.endsWith("/push/desabonner") && a.corps.endpoint === "https://fcm.googleapis.com/fcm/send/xyz"));
    assert.equal(f.abonnement(), null);
    assert.equal(f.stock.has(CLE_PUSH_ACTIF), false);
  });

  test("la cle publique est convertie en 65 octets", () => {
    const o = cleEnOctets("BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8");
    assert.equal(o.length, 65);
    assert.equal(o[0], 4);
  });
});

describe("service worker et branchements", () => {
  test("un push recu affiche toujours une notification, avec le titre et le texte recus", async () => {
    const ecouteurs = {};
    const montrees = [];
    const bac = {
      console, URL, Promise,
      caches: { open: async () => ({}), keys: async () => [], delete: async () => true, match: async () => null },
      fetch: async () => ({}),
      location: { origin: "https://coachneiram.github.io" },
      skipWaiting: () => {},
      clients: { claim: async () => {} },
      registration: { showNotification: async (t, o) => montrees.push([t, o]) }
    };
    bac.self = bac;
    bac.addEventListener = (nom, fn) => (ecouteurs[nom] = fn);
    vm.createContext(bac);
    vm.runInContext(lire("sw.js"), bac);
    let attente;
    ecouteurs.push({ data: { json: () => ({ titre: "Coach Neiram ⏰", texte: "Ton créneau approche.", tag: "coach-creneau" }) }, waitUntil: (p) => (attente = p) });
    await attente;
    assert.deepEqual(montrees.map(([t, o]) => [t, o.body, o.tag]), [["Coach Neiram ⏰", "Ton créneau approche.", "coach-creneau"]]);

    ecouteurs.push({ data: { json: () => { throw new Error("illisible"); } }, waitUntil: (p) => (attente = p) });
    await attente;
    assert.equal(montrees[1][0], "Coach Neiram", "meme illisible, une notification s'affiche (exige sur iPhone)");
  });

  test("le planning repart a l'ouverture, a chaque seance et apres l'envoi du bilan", () => {
    const app = lire("app/src/App.jsx");
    assert.match(app, /synchroniserPush\(\{ profil: profile, seances: sessions, bilanEnvoye: charger\(CLE_BILAN_ENVOYE, null\) \}\);\n\s*\}, \[pret, profile, sessions\]\);/);
    assert.match(app, /marquerBilanEnvoye\(weekStats\.weekKey\);\n\s*synchroniserPush/);
    assert.match(lire("app/src/ecrans/Reglages.jsx"), /<RappelsAppFermee profil=\{value\} seances=\{seances\}/);
  });
});
