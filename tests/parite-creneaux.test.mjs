/**
 * Parite du calcul des creneaux : ancienne version contre nouvelle.
 *
 * C'est le calcul qui dit au coach si son client a tenu ses rendez-vous.
 * Se tromper ici, c'est reprocher a quelqu'un une seance qu'il a faite, ou
 * laisser passer trois semaines d'absence. Le relire attentivement ne suffit
 * pas : les trois passes de rapprochement se marchent dessus de facons
 * difficiles a tenir en tete.
 *
 * On genere donc des centaines de situations, et on exige que les deux
 * implementations tombent d'accord sur chacune. Les scenarios sont tires au
 * sort mais reproductibles : un echec se rejoue a l'identique.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import {
  bilanSemaine,
  decalagesRecents,
  manquesRecents,
  semaineCreneaux,
  tauxRespect
} from "../app/src/lib/creneaux.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

/** Generateur pseudo-aleatoire deterministe : un echec se rejoue. */
function tirage(graine) {
  let etat = graine >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

const JOURS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
/**
 * Heures choisies pour encadrer la tolerance de 60 min, pas seulement pour
 * varier : 18:00 contre 18:50 (50 min) et contre 19:00 (60 min pile)
 * tombent de part et d'autre du seuil. Sans ces valeurs, une tolerance
 * changee de 60 a 45 passerait inapercue — verifie en la mutant.
 */
const HEURES = ["", "07:00", "12:30", "18:00", "18:30", "18:50", "19:00", "19:01", "20:15"];
const LUNDI = "2026-08-31";

/** Une situation complete : des creneaux, des seances, une date du jour. */
function scenario(alea) {
  const nbCreneaux = Math.floor(alea() * 4);
  const creneaux = Array.from({ length: nbCreneaux }, (_, i) => ({
    id: "c" + i,
    day: JOURS[Math.floor(alea() * 7)],
    time: HEURES[Math.floor(alea() * HEURES.length)],
    place: alea() < 0.5 ? "Salle" : "",
    // Un creneau peut avoir ete cree en cours de route.
    createdAt: alea() < 0.25 ? "2026-09-02" : null
  }));

  const nbSeances = Math.floor(alea() * 5);
  const seances = Array.from({ length: nbSeances }, (_, i) => {
    const jour = Math.floor(alea() * 9) - 1; // parfois hors semaine
    return {
      id: "s" + i,
      date: decaler(LUNDI, jour),
      startTime: HEURES[Math.floor(alea() * HEURES.length)] || null,
      // Parfois rattachee explicitement a un creneau.
      slotId: alea() < 0.35 && nbCreneaux ? "c" + Math.floor(alea() * nbCreneaux) : null,
      maintenance: alea() < 0.15
    };
  });

  const aujourdhui = decaler(LUNDI, Math.floor(alea() * 8));
  return { creneaux, seances, aujourdhui };
}

function decaler(iso, jours) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
}

/**
 * Ramene une valeur venue du bac a sable dans le realm des tests.
 *
 * L'ancienne version s'execute dans un contexte isole : ses tableaux et ses
 * objets n'ont pas les memes prototypes que les notres, et l'egalite stricte
 * echouerait sur des valeurs pourtant identiques.
 */
const memeRealm = (liste) => Array.from(liste, (x) => ({ ...x }));

/** Champs comparables d'une ligne : le reste est de la mise en forme. */
const resumeLigne = (r) => ({
  date: r.date,
  slotId: r.slot.id,
  status: r.status,
  detail: r.detail ?? null,
  sessionId: r.session ? r.session.id : null
});

describe("etat hebdomadaire des creneaux", () => {
  test("les deux versions concordent sur 400 situations tirees au sort", () => {
    const alea = tirage(20260905);

    for (let i = 0; i < 400; i++) {
      const { creneaux, seances, aujourdhui } = scenario(alea);

      const ancien = legacy.computeSlotWeek(creneaux, seances, LUNDI, aujourdhui);
      const nouveau = semaineCreneaux(creneaux, seances, LUNDI, aujourdhui);

      const contexte = "situation " + i + " : " + JSON.stringify({ creneaux, seances, aujourdhui });

      assert.deepEqual(memeRealm(nouveau.lignes.map(resumeLigne)), memeRealm(ancien.rows.map(resumeLigne)), contexte);
      assert.equal(nouveau.bonus, ancien.bonus, "seances bonus — " + contexte);
    }
  });

  test("les bilans de semaine concordent aussi", () => {
    const alea = tirage(777);

    for (let i = 0; i < 200; i++) {
      const { creneaux, seances, aujourdhui } = scenario(alea);

      const ancien = legacy.slotWeekSummary(legacy.computeSlotWeek(creneaux, seances, LUNDI, aujourdhui).rows);
      const nouveau = bilanSemaine(semaineCreneaux(creneaux, seances, LUNDI, aujourdhui).lignes);

      const contexte = "situation " + i;
      assert.equal(nouveau.honores, ancien.honored, "honores — " + contexte);
      assert.equal(nouveau.manques, ancien.missed, "manques — " + contexte);
      assert.equal(nouveau.decales, ancien.shifted, "decales — " + contexte);
      assert.equal(nouveau.prevus, ancien.planned, "prevus — " + contexte);
      assert.equal(nouveau.pct, ancien.pct, "pourcentage — " + contexte);
    }
  });
});

describe("indicateurs sur plusieurs semaines", () => {
  test("le taux de respect sur 8 semaines concorde", () => {
    const alea = tirage(31415);

    for (let i = 0; i < 120; i++) {
      const { creneaux, seances, aujourdhui } = scenario(alea);

      const ancien = legacy.slotAdherence(creneaux, seances, 8, aujourdhui);
      const nouveau = tauxRespect(creneaux, seances, 8, aujourdhui);

      if (ancien === null) {
        assert.equal(nouveau, null, "situation " + i + " : sans creneau, les deux doivent renvoyer null");
        continue;
      }
      assert.equal(nouveau.pct, ancien.pct, "pourcentage — situation " + i);
      assert.equal(nouveau.honores, ancien.honored, "honores — situation " + i);
      assert.equal(nouveau.manques, ancien.missed, "manques — situation " + i);
      assert.equal(nouveau.decales, ancien.shifted, "decales — situation " + i);
    }
  });

  test("les creneaux manques recents concordent", () => {
    const alea = tirage(2718);

    for (let i = 0; i < 120; i++) {
      const { creneaux, seances, aujourdhui } = scenario(alea);
      assert.deepEqual(
        memeRealm(manquesRecents(creneaux, seances, aujourdhui)),
        memeRealm(legacy.recentMissedSlots(creneaux, seances, aujourdhui)),
        "situation " + i
      );
    }
  });

  test("les creneaux decales recents concordent", () => {
    const alea = tirage(16180);

    for (let i = 0; i < 120; i++) {
      const { creneaux, seances, aujourdhui } = scenario(alea);
      assert.deepEqual(
        memeRealm(decalagesRecents(creneaux, seances, aujourdhui)),
        memeRealm(legacy.recentShiftedSlots(creneaux, seances, aujourdhui)),
        "situation " + i
      );
    }
  });
});
