/**
 * « Quoi de neuf » a l'ouverture, et notifications passees par le service
 * worker (7 octobre 2026).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  CLE_NOUVEAUTES,
  NOUVEAUTES,
  NOUVEAUTES_MAX,
  annoncesAutorisees,
  lireVues,
  marquerToutVu,
  nouveautesAMontrer,
  nouveautesPour
} from "../app/src/lib/nouveautes.js";
import { ONGLETS } from "../app/src/lib/onglets.js";
import { afficherNotification, notifier } from "../app/src/lib/notifier.js";

const lire = (c) => readFileSync(new URL("../" + c, import.meta.url), "utf8");

function stockageFactice(initial = {}) {
  const d = { ...initial };
  return {
    getItem: (k) => (k in d ? d[k] : null),
    setItem: (k, v) => {
      d[k] = String(v);
    },
    d
  };
}

const PRESENTIEL = { name: "Léa", coachingMode: "presentiel" };
const EN_LIGNE = { name: "Tom", coachingMode: "enligne" };

describe("les annonces", () => {
  test("identifiants uniques, les plus recentes d'abord", () => {
    const ids = NOUVEAUTES.map((n) => n.id);
    assert.equal(new Set(ids).size, ids.length);
    const dates = NOUVEAUTES.map((n) => n.date);
    assert.deepEqual(dates, [...dates].sort().reverse());
  });

  test("chaque annonce a un titre, un texte court, un bouton et un ecran qui existe", () => {
    const onglets = new Set(ONGLETS.map((o) => o.id));
    for (const n of NOUVEAUTES) {
      assert.ok(n.titre && n.titre.length <= 45, n.id);
      assert.ok(n.texte && n.texte.length <= 260, n.id + " : texte trop long pour un telephone");
      assert.ok(n.bouton, n.id);
      assert.ok(n.ouvre === "aide" || onglets.has(n.onglet), n.id + " : ecran inconnu " + n.onglet);
    }
  });

  test("les deux dernieres nouveautes : l'aide, puis la progression du corps", () => {
    assert.equal(NOUVEAUTES[0].id, "2026-10-07-aide");
    assert.equal(NOUVEAUTES[0].ouvre, "aide");
    assert.equal(NOUVEAUTES[1].id, "2026-10-06-progression");
    assert.equal(NOUVEAUTES[1].onglet, "mensurations");
  });
});

describe("ce qui s'affiche a l'ouverture", () => {
  test("un client deja installe voit les nouveautes, la plus recente en tete", () => {
    const a = nouveautesAMontrer({ vues: null, profil: EN_LIGNE });
    assert.equal(a[0].id, NOUVEAUTES[0].id);
    assert.ok(a.length <= NOUVEAUTES_MAX);
  });

  test("l'annonce de la synchro n'est faite qu'aux clients en ligne", () => {
    assert.ok(nouveautesAMontrer({ vues: null, profil: EN_LIGNE }).some((n) => n.id === "2026-10-04-synchro"));
    assert.ok(!nouveautesAMontrer({ vues: null, profil: PRESENTIEL }).some((n) => n.id === "2026-10-04-synchro"));
    assert.ok(!nouveautesPour(PRESENTIEL).some((n) => n.pour === "enligne"));
  });

  test("une annonce vue ne revient pas", () => {
    const vues = [NOUVEAUTES[0].id];
    assert.ok(!nouveautesAMontrer({ vues, profil: PRESENTIEL }).some((n) => n.id === NOUVEAUTES[0].id));
    assert.deepEqual(nouveautesAMontrer({ vues: NOUVEAUTES.map((n) => n.id), profil: EN_LIGNE }), []);
  });

  test("a la mise a jour suivante, seule la nouvelle annonce s'affiche", () => {
    // Le client a ferme la fenetre : tout ce qui existait est marque vu.
    const s = stockageFactice();
    marquerToutVu(s);
    const nouvelle = { id: "2026-10-20-test", date: "2026-10-20", titre: "Nouveau", texte: "x", onglet: "journal", bouton: "Voir" };
    const a = nouveautesAMontrer({ vues: lireVues(s), profil: EN_LIGNE, liste: [nouvelle, ...NOUVEAUTES] });
    assert.deepEqual(a.map((n) => n.id), ["2026-10-20-test"]);
  });

  test("sans profil, rien a montrer", () => {
    assert.deepEqual(nouveautesAMontrer({ vues: null, profil: null }), []);
  });

  test("au plus NOUVEAUTES_MAX annonces a la fois", () => {
    const liste = Array.from({ length: 9 }, (_, i) => ({ id: "n" + i, date: "2026-01-0" + (9 - i), titre: "t", texte: "x", onglet: "journal", bouton: "b" }));
    assert.equal(nouveautesAMontrer({ vues: [], profil: PRESENTIEL, liste }).length, NOUVEAUTES_MAX);
  });
});

describe("memoire des annonces vues", () => {
  test("jamais rien enregistre : null, pour distinguer une nouvelle installation", () => {
    assert.equal(lireVues(stockageFactice()), null);
  });

  test("une valeur illisible vaut « rien vu », pas une panne", () => {
    assert.deepEqual(lireVues(stockageFactice({ [CLE_NOUVEAUTES]: "{pas du json" })), []);
  });

  test("fermer marque vues toutes les annonces, au-dela de celles affichees", () => {
    const s = stockageFactice({ [CLE_NOUVEAUTES]: JSON.stringify(["ancienne"]) });
    marquerToutVu(s);
    const vues = lireVues(s);
    assert.ok(vues.includes("ancienne"));
    for (const n of NOUVEAUTES) assert.ok(vues.includes(n.id), n.id);
  });

  test("un stockage plein ne fait pas planter la fermeture", () => {
    const s = { getItem: () => null, setItem: () => { throw new Error("QuotaExceeded"); } };
    assert.doesNotThrow(() => marquerToutVu(s));
  });

  test("en local, la fenetre ne s'ouvre que sur demande ; en ligne, toujours", () => {
    assert.equal(annoncesAutorisees({ location: { hostname: "coachneiram.github.io" } }), true);
    assert.equal(annoncesAutorisees({ location: { hostname: "localhost" }, localStorage: stockageFactice() }), false);
    assert.equal(
      annoncesAutorisees({ location: { hostname: "127.0.0.1" }, localStorage: stockageFactice({ cn_nouveautes_locale: "1" }) }),
      true
    );
  });
});

describe("notifications par le service worker", () => {
  test("le service worker affiche la notification, icone de l'app par defaut", async () => {
    const appels = [];
    const env = {
      navigator: { serviceWorker: { getRegistration: async () => ({ showNotification: async (t, o) => appels.push([t, o]) }) } },
      Notification: function () {
        throw new Error("ne doit pas servir");
      }
    };
    assert.equal(await afficherNotification("Coach Neiram", { body: "b", tag: "x" }, env), true);
    assert.equal(appels.length, 1);
    assert.equal(appels[0][0], "Coach Neiram");
    assert.equal(appels[0][1].icon, "icon-192.png");
    assert.equal(appels[0][1].body, "b");
  });

  test("sans service worker, le constructeur sert de repli", async () => {
    const crees = [];
    const env = { navigator: {}, Notification: function (t, o) { crees.push([t, o]); this.close = () => {}; } };
    assert.equal(await afficherNotification("T", { body: "b" }, env), true);
    assert.equal(crees.length, 1);
  });

  test("Android refuse le constructeur : sans service worker, echec annonce", async () => {
    const env = { navigator: {}, Notification: function () { throw new TypeError("Illegal constructor"); } };
    assert.equal(await afficherNotification("T", {}, env), false);
  });

  test("un service worker en panne n'empeche pas le repli", async () => {
    const crees = [];
    const env = {
      navigator: { serviceWorker: { getRegistration: async () => { throw new Error("panne"); } } },
      Notification: function (t) { crees.push(t); }
    };
    assert.equal(await afficherNotification("T", {}, env), true);
    assert.deepEqual(crees, ["T"]);
  });

  test("un rappel en arriere-plan passe par le service worker", async () => {
    const sauvegarde = { document: globalThis.document, Notification: globalThis.Notification, navigator: globalThis.navigator };
    const appels = [];
    try {
      globalThis.document = { hidden: true };
      globalThis.Notification = Object.assign(function () { throw new TypeError("Illegal constructor"); }, { permission: "granted" });
      Object.defineProperty(globalThis, "navigator", {
        value: { serviceWorker: { getRegistration: async () => ({ showNotification: async (t, o) => appels.push([t, o]) }) } },
        configurable: true,
        writable: true
      });
      const montre = notifier({ titre: "Hydratation", message: "Bois un verre d'eau", tag: "eau", afficherToast: () => {} });
      assert.equal(montre, true);
      await new Promise((r) => setTimeout(r, 0));
      assert.deepEqual(appels.map((a) => [a[0], a[1].body, a[1].tag]), [["Hydratation", "Bois un verre d'eau", "eau"]]);
    } finally {
      globalThis.document = sauvegarde.document;
      globalThis.Notification = sauvegarde.Notification;
      Object.defineProperty(globalThis, "navigator", { value: sauvegarde.navigator, configurable: true, writable: true });
    }
  });

  test("toucher une notification ramene sur l'app ouverte, ou l'ouvre", async () => {
    const charger = (fenetres) => {
      const ecouteurs = {};
      const ouvertes = [];
      const bac = {
        console, URL, Promise,
        caches: { open: async () => ({}), keys: async () => [], delete: async () => true, match: async () => null },
        fetch: async () => ({}),
        location: { origin: "https://coachneiram.github.io" },
        skipWaiting: () => {},
        clients: { claim: async () => {}, matchAll: async () => fenetres, openWindow: async (u) => ouvertes.push(u) },
        registration: { scope: "https://coachneiram.github.io/coach-neiram-app/" }
      };
      bac.self = bac;
      bac.addEventListener = (nom, fn) => (ecouteurs[nom] = fn);
      vm.createContext(bac);
      vm.runInContext(lire("sw.js"), bac);
      return { ecouteurs, ouvertes };
    };
    const clic = async (sw) => {
      let attente;
      let fermee = false;
      sw.ecouteurs.notificationclick({ notification: { close: () => (fermee = true) }, waitUntil: (p) => (attente = p) });
      await attente;
      return fermee;
    };

    let focus = 0;
    const avec = charger([{ focus: async () => focus++ }]);
    assert.equal(await clic(avec), true);
    assert.equal(focus, 1);
    assert.deepEqual(avec.ouvertes, []);

    const sans = charger([]);
    await clic(sans);
    assert.deepEqual(sans.ouvertes, ["https://coachneiram.github.io/coach-neiram-app/"]);
  });
});

describe("branchements", () => {
  test("la fenetre est rendue par App, et rouverte depuis les reglages", () => {
    const app = lire("app/src/App.jsx");
    assert.match(app, /<QuoiDeNeuf\s+nouveautes=\{nouveautes\}/);
    assert.match(app, /if \(!pret \|\| !annoncesAutorisees\(\)\) return;/);
    assert.match(app, /onVoirNouveautes=\{/);
    const reglages = lire("app/src/ecrans/Reglages.jsx");
    assert.match(reglages, /<TestNotifications \/>/);
    assert.match(reglages, /<LienNouveautes onVoir=\{onVoirNouveautes\} \/>/);
  });
});

describe("aide", async () => {
  const { AIDE, toutesLesQuestions } = await import("../app/src/lib/aide.js");
  const { readdirSync } = await import("node:fs");
  const { join } = await import("node:path");
  const racine = new URL("../app/src/", import.meta.url).pathname;
  const sources = [];
  const parcourir = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      if (f.isDirectory()) parcourir(join(d, f.name));
      else if (/\.(jsx?|mjs)$/.test(f.name) && f.name !== "aide.js") sources.push(readFileSync(join(d, f.name), "utf8"));
    }
  };
  parcourir(racine);
  const code = sources.join("\n");

  test("identifiants uniques, reponses non vides", () => {
    const ids = toutesLesQuestions().map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.length >= 20);
    for (const q of toutesLesQuestions()) {
      assert.ok(q.question && q.reponse.length && q.reponse.every((r) => r.length > 20), q.id);
    }
  });

  test("chaque bouton cite par une reponse existe encore dans l'application", () => {
    for (const q of toutesLesQuestions()) {
      for (const l of q.libelles) assert.ok(code.includes(l), `« ${l} » (question ${q.id}) introuvable dans le code`);
    }
  });

  test("les questions des deux guides PDF sont reprises", () => {
    const ids = new Set(toutesLesQuestions().map((q) => q.id));
    for (const id of ["mettre-a-jour", "recette-maison", "reprendre-hier", "portions", "dicter", "nutriscore", "resume-semaine", "routine", "serie", "suivi-coach", "trophees", "partager", "recettes-coach", "exercice-perso", "parrainage", "souci"]) {
      assert.ok(ids.has(id), id);
    }
  });

  test("parrainage et paliers de serie suivent les reglages de l'application", async () => {
    const { PARRAINAGE } = await import("../app/src/lib/carte-progres.js");
    const { PALIERS_SERIE } = await import("../app/src/lib/resume-semaine.js");
    const texte = (id) => toutesLesQuestions().find((q) => q.id === id).reponse.join(" ");
    for (const p of PARRAINAGE.paliers) assert.ok(texte("parrainage").includes(p.gain.toLowerCase()), p.gain);
    assert.ok(texte("serie").includes(`${PALIERS_SERIE[PALIERS_SERIE.length - 1]} jours`));
    assert.equal(AIDE.length, 5);
  });
});

describe("bandeau d'installation", async () => {
  const { plateformeInstallation, estInstallee, bandeauInstallationVisible, finMasquage } = await import("../app/src/lib/installation.js");
  const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1";
  const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36";
  const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";

  test("iPhone, Android, ordinateur, deja installee", () => {
    assert.equal(plateformeInstallation({ userAgent: IPHONE }), "ios");
    assert.equal(plateformeInstallation({ userAgent: ANDROID }), "android");
    assert.equal(plateformeInstallation({ userAgent: MAC }), "autre");
    assert.equal(plateformeInstallation({ userAgent: IPHONE, installee: true }), "installee");
  });

  test("l'app ouverte depuis son icone est reconnue comme installee", () => {
    assert.equal(estInstallee({ navigator: { standalone: true } }), true);
    assert.equal(estInstallee({ navigator: {}, matchMedia: () => ({ matches: true }) }), true);
    assert.equal(estInstallee({ navigator: {}, matchMedia: () => ({ matches: false }) }), false);
  });

  test("visible sur telephone non installe, masquable deux semaines", () => {
    assert.equal(bandeauInstallationVisible({ plateforme: "ios", aujourdhui: "2026-10-07" }), true);
    assert.equal(bandeauInstallationVisible({ plateforme: "installee", aujourdhui: "2026-10-07" }), false);
    assert.equal(bandeauInstallationVisible({ plateforme: "autre", aujourdhui: "2026-10-07" }), false);
    const fin = finMasquage("2026-10-07");
    assert.equal(fin, "2026-10-21");
    assert.equal(bandeauInstallationVisible({ plateforme: "android", masqueJusqua: fin, aujourdhui: "2026-10-20" }), false);
    assert.equal(bandeauInstallationVisible({ plateforme: "android", masqueJusqua: fin, aujourdhui: "2026-10-22" }), true);
  });

  test("l'aide et le bandeau sont branches", () => {
    const app = lire("app/src/App.jsx");
    assert.match(app, /<Aide open=\{aideOuverte\}/);
    assert.match(app, /<BandeauInstallation/);
    assert.match(app, /beforeinstallprompt/);
    assert.match(lire("app/src/ecrans/Reglages.jsx"), /<LienAide onOuvrir=\{onOuvrirAide\} \/>/);
  });
});
