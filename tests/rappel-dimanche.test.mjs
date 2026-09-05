/**
 * Le rappel du dimanche : « envoie ton bilan a ton coach ».
 *
 * REGRESSION DE LA BASCULE. L'ecran Reglages proposait bien
 * l'interrupteur, l'application demandait meme l'autorisation de
 * notifier — mais il n'y avait ni setInterval ni new Notification nulle
 * part dans app/src. Le moteur n'avait pas ete porte du tout.
 *
 * Personne ne s'en est plaint : un rappel qui n'arrive pas ne se
 * remarque pas, on croit avoir oublie. C'est precisement pour ca qu'il
 * faut un test.
 *
 * La decision est ici une fonction pure : c'est ce qui rend testable ce
 * qui, dans l'application d'origine, etait noye dans un useEffect.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { RAPPEL_DIMANCHE, decisionRappelDimanche } from "../app/src/lib/rappels.js";
import {
  CLE_BILAN_ENVOYE,
  CLE_ETAT_DIMANCHE,
  marquerBilanEnvoye,
  verifierRappelDimanche
} from "../app/src/lib/rappel-dimanche.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (c) => readFileSync(join(ICI, "..", c), "utf8");

function installerStockage() {
  const d = new Map();
  globalThis.localStorage = {
    getItem: (k) => (d.has(k) ? d.get(k) : null),
    setItem: (k, v) => d.set(k, String(v)),
    removeItem: (k) => d.delete(k),
    get length() {
      return d.size;
    }
  };
}

const PROFIL = { name: "Sabine", reportReminderEnabled: true };

/** 6 septembre 2026 est un dimanche. Le lundi de sa semaine : 31 aout. */
const DIMANCHE = (h, min = 0) => new Date(2026, 8, 6, h, min);
const SAMEDI = (h) => new Date(2026, 8, 5, h);

describe("quand rappeler", () => {
  const base = { profile: PROFIL, semaineDejaVue: null, semaineDejaEnvoyee: null };

  test("un dimanche a 10 h, on rappelle", () => {
    const d = decisionRappelDimanche({ ...base, maintenant: DIMANCHE(10) });
    assert.equal(d.rappeler, true);
    assert.equal(d.cleSemaine, "2026-08-31", "la cle est celle du lundi de la semaine");
  });

  test("un samedi, jamais", () => {
    assert.equal(decisionRappelDimanche({ ...base, maintenant: SAMEDI(15) }).rappeler, false);
  });

  test("la plage horaire est 10 h - 21 h, bornes comprises comme dans l'original", () => {
    const heures = [];
    for (let h = 0; h < 24; h++) {
      if (decisionRappelDimanche({ ...base, maintenant: DIMANCHE(h) }).rappeler) heures.push(h);
    }
    assert.deepEqual(heures, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], "9 h trop tot, 21 h trop tard");
    assert.equal(RAPPEL_DIMANCHE.heureDebut, 10);
    assert.equal(RAPPEL_DIMANCHE.heureFin, 21);
  });

  test("le client qui a coupe le rappel n'est pas derange", () => {
    const d = decisionRappelDimanche({
      ...base,
      profile: { ...PROFIL, reportReminderEnabled: false },
      maintenant: DIMANCHE(11)
    });
    assert.equal(d.rappeler, false);
    assert.equal(d.raison, "rappel desactive");
  });

  test("un profil sans reglage explicite recoit le rappel", () => {
    // L'original teste `=== false` : l'absence de reglage vaut actif.
    const d = decisionRappelDimanche({ ...base, profile: { name: "Tristan" }, maintenant: DIMANCHE(11) });
    assert.equal(d.rappeler, true);
  });

  test("on ne rappelle qu'une fois par semaine", () => {
    const d = decisionRappelDimanche({ ...base, semaineDejaVue: "2026-08-31", maintenant: DIMANCHE(15) });
    assert.equal(d.rappeler, false);
    assert.equal(d.raison, "deja rappele cette semaine");
  });

  test("le rappel de la semaine precedente ne bloque pas celui de cette semaine", () => {
    const d = decisionRappelDimanche({ ...base, semaineDejaVue: "2026-08-24", maintenant: DIMANCHE(11) });
    assert.equal(d.rappeler, true);
  });

  test("le client qui a deja envoye son bilan n'est pas relance", () => {
    const d = decisionRappelDimanche({ ...base, semaineDejaEnvoyee: "2026-08-31", maintenant: DIMANCHE(11) });
    assert.equal(d.rappeler, false);
    assert.equal(d.raison, "bilan deja envoye");
  });

  test("sans profil, rien", () => {
    assert.equal(decisionRappelDimanche({ ...base, profile: null, maintenant: DIMANCHE(11) }).rappeler, false);
  });
});

describe("declenchement", () => {
  beforeEach(installerStockage);

  const montrerOk = () => true;

  test("le rappel affiche le message attendu", () => {
    const vus = [];
    verifierRappelDimanche({
      profile: PROFIL,
      afficherToast: () => {},
      maintenant: DIMANCHE(11),
      montrer: (arg) => {
        vus.push(arg);
        return true;
      }
    });
    assert.equal(vus.length, 1);
    assert.equal(vus[0].message, RAPPEL_DIMANCHE.message);
    assert.match(vus[0].message, /C'est dimanche/);
    assert.match(vus[0].message, /Envoyer à mon coach/);
    assert.match(vus[0].message, /3 photos/);
    assert.equal(vus[0].tag, "coach-report", "le tag evite les doublons de notification");
  });

  test("apres un rappel montre, le suivant ne repart pas", () => {
    const opts = { profile: PROFIL, afficherToast: () => {}, maintenant: DIMANCHE(11), montrer: montrerOk };
    assert.equal(verifierRappelDimanche(opts).montre, true);
    assert.equal(verifierRappelDimanche(opts).rappeler, false);
    assert.deepEqual(JSON.parse(localStorage.getItem(CLE_ETAT_DIMANCHE)), { firedWeekKey: "2026-08-31" });
  });

  test("un rappel qu'on n'a PAS pu montrer repasse au tour suivant", () => {
    // Le cas reel : app en arriere-plan, notifications refusees. Consommer
    // l'etat la reviendrait a sauter la semaine sans que rien ne s'affiche.
    const opts = { profile: PROFIL, afficherToast: () => {}, maintenant: DIMANCHE(11) };
    const premier = verifierRappelDimanche({ ...opts, montrer: () => false });
    assert.equal(premier.rappeler, false);
    assert.equal(localStorage.getItem(CLE_ETAT_DIMANCHE), null, "rien ne doit etre note");

    const second = verifierRappelDimanche({ ...opts, montrer: montrerOk });
    assert.equal(second.montre, true, "le rappel doit revenir des que l'affichage redevient possible");
  });

  test("envoyer son bilan eteint le rappel de la semaine", () => {
    marquerBilanEnvoye("2026-08-31");
    assert.equal(JSON.parse(localStorage.getItem(CLE_BILAN_ENVOYE)), "2026-08-31");
    const d = verifierRappelDimanche({
      profile: PROFIL,
      afficherToast: () => {},
      maintenant: DIMANCHE(11),
      montrer: montrerOk
    });
    assert.equal(d.rappeler, false);
    assert.equal(d.raison, "bilan deja envoye");
  });

  test("les cles de stockage sont celles de l'application actuelle", () => {
    // Un client qui bascule ne doit pas recevoir un rappel deja traite.
    assert.equal(CLE_ETAT_DIMANCHE, "coach_sunday_state");
    assert.equal(CLE_BILAN_ENVOYE, "coach_report_last_sent");
  });
});

describe("branchement du minuteur", () => {
  const app = lire("app/src/App.jsx");

  test("la verification tourne vraiment, et se nettoie", () => {
    assert.match(app, /verifierRappelDimanche\(\{ profile, afficherToast \}\)/);
    assert.match(app, /window\.setInterval\(verifier, PERIODE_VERIFICATION_MS\)/);
    assert.match(app, /window\.clearInterval\(minuteur\)/);
  });

  test("une premiere verification a lieu sans attendre la minute", () => {
    assert.match(app, /verifier\(\);\s*\n\s*const minuteur = window\.setInterval/);
  });
});
