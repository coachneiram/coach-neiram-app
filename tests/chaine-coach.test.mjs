/**
 * La chaine complete : telephone -> proxy Cloudflare -> script Google.
 *
 * Chaque maillon avait sa propre liste de types autorises et sa propre
 * reconstruction champ par champ. Les tests existants verifiaient chaque
 * maillon isolement, et tous etaient verts pendant que la chaine, elle,
 * etait coupee en deux endroits : le script Google refusait les deux types
 * ajoutes tardivement, et le proxy laissait tomber les chiffres qu'ils
 * transportaient.
 *
 * Ce fichier fait passer un evenement de bout en bout : rien ici ne peut
 * etre vert si un maillon perd le type ou les nombres.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import worker from "../worker/coach-neiram-proxy.js";
import { creerScript } from "./doublure-apps-script.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");

const ENV = {
  GEMINI_API_KEY: "cle-de-test",
  COACH_SYNC_URL: "https://script.google.com/macros/s/FAUX/exec",
  COACH_SYNC_SECRET: "secret-de-test",
  ALLOWED_ORIGINS: ""
};

/** Fait traverser le proxy a un evenement et rend ce qui part vers Google. */
async function traverserLeProxy(evenement) {
  let recu = null;
  globalThis.fetch = async (url, init) => {
    recu = JSON.parse(init.body);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const reponse = await worker.fetch(
    new Request("https://proxy.test/coach-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evenement)
    }),
    ENV
  );
  return { statut: reponse.status, versGoogle: recu };
}

/**
 * Execute le vrai script Apps Script dans un bac a sable, avec des doublures
 * pour les services Google (tests/doublure-apps-script.mjs). Rend la
 * reponse, les lignes du Journal et les mails envoyes.
 */
function executerScriptGoogle(charge) {
  // Configuration de production : secret exige, le meme des deux cotes.
  const script = creerScript({
    reglages: { EXIGER_SECRET: true },
    proprietes: { SECRET_SYNC: ENV.COACH_SYNC_SECRET }
  });
  const reponse = script.poster(charge);
  return { reponse, lignes: script.lignes("Journal"), mails: script.mails };
}

/** Un evenement tel que l'application le construit vraiment. */
const resumeHebdo = (pct, tranches = 8) => ({
  type: "resume_hebdo",
  client: "Sophie",
  weekKey: "2026-09-07",
  honored: Math.round((pct / 100) * tranches),
  resolved: tranches,
  missed: tranches - Math.round((pct / 100) * tranches),
  shifted: 1,
  pct,
  message: "Taux de respect sur 4 semaines : " + pct + "%."
});

const alerteDecalages = () => ({
  type: "alerte_decalages",
  client: "Sophie",
  weekKey: "2026-09-07",
  nbDecalages: 3,
  creneauxDecales: [
    { jour: "Lundi", heure: "18:00", date: "2026-08-24", lieu: "Salle" },
    { jour: "Jeudi", heure: "19:00", date: "2026-08-27", lieu: "Salle" },
    { jour: "Lundi", heure: "18:00", date: "2026-09-01", lieu: "Parc" }
  ],
  message: "3 créneaux décalés sur 4 semaines."
});

describe("les deux types ajoutes tardivement traversent le proxy", () => {
  for (const evenement of [resumeHebdo(55), alerteDecalages()]) {
    test(evenement.type + " est accepte, pas refuse en type-inconnu", async () => {
      const { statut, versGoogle } = await traverserLeProxy(evenement);
      assert.equal(statut, 200);
      assert.equal(versGoogle.type, evenement.type);
    });
  }

  test("le proxy conserve les chiffres du resume", async () => {
    const { versGoogle } = await traverserLeProxy(resumeHebdo(55));
    for (const champ of ["honored", "resolved", "missed", "shifted", "pct"]) {
      assert.equal(typeof versGoogle[champ], "number", champ + " doit survivre a la traversee");
    }
    assert.equal(versGoogle.pct, 55);
  });

  test("le proxy garde les zeros (0 decale n'est pas une case vide)", async () => {
    const { versGoogle } = await traverserLeProxy({ ...resumeHebdo(100, 4), shifted: 0, missed: 0 });
    assert.equal(versGoogle.shifted, 0);
    assert.equal(versGoogle.missed, 0);
    const vide = await traverserLeProxy({ type: "pointage", client: "Sophie", dureeMin: "", rpe: "abc" });
    assert.equal(vide.versGoogle.dureeMin, "");
    assert.equal(vide.versGoogle.rpe, "");
  });

  test("le proxy conserve les creneaux decales", async () => {
    const { versGoogle } = await traverserLeProxy(alerteDecalages());
    assert.equal(versGoogle.nbDecalages, 3);
    assert.equal(versGoogle.creneauxDecales.length, 3);
    assert.equal(versGoogle.creneauxDecales[0].jour, "Lundi");
  });
});

describe("le script Google accepte et traite les deux types", () => {
  test("le resume est enregistre dans le classeur", async () => {
    const { versGoogle } = await traverserLeProxy(resumeHebdo(85));
    const { reponse, lignes } = executerScriptGoogle(versGoogle);
    assert.equal(reponse.ok, true, "le script ne doit plus repondre type-inconnu");
    const donnee = lignes[lignes.length - 1];
    assert.equal(donnee.Type, "resume_hebdo");
    assert.match(Object.values(donnee).join(" | "), /Taux de respect/);
  });

  test("au-dessus du seuil : aucun e-mail, le recap du lundi suffit", async () => {
    const { versGoogle } = await traverserLeProxy(resumeHebdo(85));
    const { mails } = executerScriptGoogle(versGoogle);
    assert.equal(mails.length, 0);
  });

  test("sous le seuil : un e-mail qui porte les vrais chiffres", async () => {
    const { versGoogle } = await traverserLeProxy(resumeHebdo(50));
    const { mails } = executerScriptGoogle(versGoogle);
    assert.equal(mails.length, 1);
    assert.match(mails[0].sujet, /Sophie.*50 %/);
    assert.doesNotMatch(mails[0].corps, /undefined|NaN/);
  });

  test("l'alerte decalages a son propre texte, pas celui d'une autre", async () => {
    const { versGoogle } = await traverserLeProxy(alerteDecalages());
    const { mails } = executerScriptGoogle(versGoogle);
    assert.equal(mails.length, 1);
    assert.match(mails[0].sujet, /3 créneaux décalés/);
    // Le piege d'origine : un « else » fourre-tout donnait a toute alerte
    // inconnue le texte de la semaine difficile.
    assert.doesNotMatch(mails[0].corps, /semaine difficile|format maintien/);
    assert.match(mails[0].corps, /Jeudi 19:00/);
  });
});

describe("les trois listes blanches ne peuvent plus diverger", () => {
  // La chaine comporte trois filtres successifs, chacun avec sa propre
  // liste : l'application, le proxy, puis le script Google. Un type present
  // dans l'un et absent d'un autre coupe la chaine sans message d'erreur —
  // c'est exactement ce qui privait le coach de ses deux alertes.
  const typesDe = (chemin, motif) => {
    const source = readFileSync(join(RACINE, ...chemin), "utf8");
    const bloc = source.slice(source.indexOf(motif));
    return (bloc.slice(0, bloc.indexOf("]")).match(/['"]([a-z_]+)['"]/g) || [])
      .map((t) => t.slice(1, -1))
      .sort();
  };

  const listes = {
    application: typesDe(["app", "src", "lib", "synchro-coach.js"], "export const TYPES_EVENEMENTS"),
    proxy: typesDe(["worker", "coach-neiram-proxy.js"], "const TYPES_AUTORISES"),
    scriptGoogle: typesDe(["worker", "coach-sync.gs"], "var TYPES_AUTORISES")
  };

  test("les trois listes sont non vides", () => {
    for (const [nom, liste] of Object.entries(listes)) {
      assert.ok(liste.length >= 5, nom + " : liste introuvable ou tronquee (" + liste.length + ")");
    }
  });

  test("application, proxy et script Google autorisent les memes types", () => {
    assert.deepEqual(listes.proxy, listes.application, "proxy vs application");
    assert.deepEqual(listes.scriptGoogle, listes.application, "script Google vs application");
  });
});
