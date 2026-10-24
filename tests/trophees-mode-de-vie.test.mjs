/**
 * Trophées « mode de vie et tous sports » (24 octobre 2026), repris des
 * badges de l'app Neiram avec les mêmes paliers : Mon année, Multisport,
 * Semaines actives, Programmes guidés, Habitudes, L'école Neiram, Niveau
 * fédéral. Compteurs : lib/compteurs-trophees.js ; trophees() reste pur.
 */

import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { creerLocalStorage } from "./outils-neiram.mjs";

globalThis.localStorage = creerLocalStorage();
const {
  COMPTEURS_VIDES,
  FAMILLES_MODE_DE_VIE,
  MARQUE_MODE_DE_VIE,
  nouveauxTrophees,
  trophees,
  tropheesAffiches,
  tropheesModeDeVie,
  vusAvecModeDeVie
} = await import("../app/src/lib/trophees.js");
const { compteursTrophees, niveauFederal } = await import("../app/src/lib/compteurs-trophees.js");
const { addDays } = await import("../app/src/lib/dates.js");

const AUJ = "2026-10-24";
const PROFIL = { sessionsPerWeek: 2, sex: "homme", age: 30 };
const muscu = (date) => ({ date, exercises: [{ name: "Squat", sets: "3", reps: "5", weight: "60" }] });

beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

describe("familles et paliers", () => {
  test("mêmes paliers que FAMILLES_BADGES de l'app Neiram", () => {
    const paliers = Object.fromEntries(FAMILLES_MODE_DE_VIE.map((f) => [f.id, f.paliers]));
    assert.deepEqual(paliers, {
      annee: [12, 26, 52, 100, 150, 200, 250],
      sports: [2, 3, 5, 8, 12],
      actif: [1, 4, 12, 26, 52],
      programmes: [1, 2, 3],
      habitudes: [3, 7, 21, 66, 100, 365],
      lecons: [1, 7, 14, 28],
      niveauFederal: [1, 2, 3]
    });
  });

  test("pas de classements, podiums, athlète du mois ni défis entre amis (serveur)", () => {
    const ids = FAMILLES_MODE_DE_VIE.map((f) => f.id);
    for (const id of ["topClassement", "podiums", "athleteMois", "athleteAnnee", "duels", "stories"]) assert.ok(!ids.includes(id), id);
  });

  test("tuiles : titre par niveau, détail, progression", () => {
    const l = tropheesModeDeVie({ ...COMPTEURS_VIDES, lecons: 9, niveauFederal: 2 });
    const par = Object.fromEntries(l.map((t) => [t.id, t]));
    assert.equal(par["lecons-7"].titre, "L'école Neiram Argent");
    assert.equal(par["lecons-7"].obtenu, true);
    assert.equal(par["lecons-14"].progression, "9/14");
    assert.equal(par["lecons-1"].detail, "1 leçon");
    assert.equal(par["niveauFederal-2"].detail, "Niveau national dans une discipline");
    assert.ok(par["niveauFederal-2"].obtenu && !par["niveauFederal-3"].obtenu);
    assert.equal(par["actif-1"].detail, "1 semaine à 150 min (OMS)");
    assert.equal(par["programmes-2"].detail, "2 programmes terminés");
  });
});

describe("trophees() reste pur et compatible", () => {
  test("sans compteurs : les nouvelles familles valent 0 et ne s'affichent pas", () => {
    const t = trophees({ seances: [], profil: PROFIL, date: AUJ });
    assert.ok(t.liste.some((x) => x.famille === "lecons"), "présentes dans la liste");
    assert.ok(t.liste.filter((x) => x.famille === "lecons").every((x) => !x.obtenu));
    assert.deepEqual(tropheesAffiches(t.liste).map((f) => f.id), ["seances", "semaines", "anciennete"]);
  });

  test("avec compteurs : une famille commencée s'affiche (obtenus puis le prochain)", () => {
    const t = trophees({ seances: [], profil: PROFIL, date: AUJ, compteurs: { lecons: 8, sports: 1 } });
    const f = Object.fromEntries(tropheesAffiches(t.liste).map((x) => [x.id, x.tuiles.map((u) => u.id)]));
    assert.deepEqual(f.lecons, ["lecons-1", "lecons-7", "lecons-14"]);
    assert.deepEqual(f.sports, ["sports-2"], "commencée (1 sport) : le prochain palier");
    assert.equal(f.niveauFederal, undefined, "à zéro : masquée");
  });

  test("compteurs partiels ou abîmés : 0 par défaut", () => {
    const t = trophees({ seances: [], profil: PROFIL, date: AUJ, compteurs: { lecons: "x", habitudes: -4 } });
    assert.ok(t.liste.filter((x) => ["lecons", "habitudes"].includes(x.famille)).every((x) => x.valeur === 0 && !x.obtenu));
  });
});

describe("célébration des nouvelles familles", () => {
  const liste = [
    { id: "seances-1", famille: "seances", obtenu: true },
    { id: "annee-12", famille: "annee", obtenu: true },
    { id: "annee-26", famille: "annee", obtenu: true },
    { id: "lecons-1", famille: "lecons", obtenu: false }
  ];

  test("premier calcul : les trophées déjà obtenus des nouvelles familles sont vus sans fête", () => {
    const vus = vusAvecModeDeVie(liste, []);
    assert.ok(vus.includes("annee-12") && vus.includes("annee-26") && vus.includes(MARQUE_MODE_DE_VIE));
    assert.deepEqual(nouveauxTrophees(liste, vus).map((t) => t.id), ["seances-1"], "les familles d'avant restent célébrées");
  });

  test("ensuite : rien ne change, et un nouveau palier est célébré", () => {
    const vus = vusAvecModeDeVie(liste, []);
    assert.equal(vusAvecModeDeVie(liste, vus), null);
    const apres = liste.map((t) => (t.id === "lecons-1" ? { ...t, obtenu: true } : t));
    assert.deepEqual(nouveauxTrophees(apres, [...vus, "seances-1"]).map((t) => t.id), ["lecons-1"]);
  });

  test("l'écran applique la règle et passe les compteurs", () => {
    const ecran = readFileSync(new URL("../app/src/ecrans/Trophees.jsx", import.meta.url), "utf8");
    assert.match(ecran, /vusAvecModeDeVie\(etat\.liste/);
    assert.match(ecran, /compteurs: compteursTrophees\(/);
  });
});

describe("compteurs lus dans le stockage", () => {
  test("rien noté : tout à 0", () => {
    assert.deepEqual(compteursTrophees({ seances: [], date: AUJ }), COMPTEURS_VIDES);
  });

  test("séances, sports, semaines actives, programmes, habitudes, leçons", () => {
    const seances = [muscu("2026-10-05"), muscu("2026-10-06"), { date: "2026-10-07", activite: { id: "course", duree: 160 }, exercises: [] }];
    const coches = {};
    for (let i = 0; i < 8; i++) coches[addDays(AUJ, -i)] = ["lecture"];
    localStorage.setItem("cn_programmes_termines", JSON.stringify([{ id: "0-5km", date: "2026-09-01" }]));
    localStorage.setItem("cn_habitudes", JSON.stringify({ choisies: ["lecture"], coches }));
    localStorage.setItem("cn_lecons", JSON.stringify({ faites: { "l01-pourquoi": "2026-10-20" }, reponses: {} }));
    const c = compteursTrophees({ seances, profil: PROFIL, date: AUJ });
    assert.equal(c.annee, 3);
    assert.equal(c.sports, 2);
    assert.equal(c.actif, 1);
    assert.equal(c.programmes, 1);
    assert.equal(c.habitudes, 8);
    assert.equal(c.lecons, 1);
    assert.equal(c.niveauFederal, 0);
  });

  test("niveau fédéral : meilleure marche, toutes disciplines (performances notées et maxis)", () => {
    assert.equal(niveauFederal({ performances: { course_10k: { valeur: 2100 } }, profil: PROFIL }), 1, "10 km en 35:00 : régional");
    assert.equal(niveauFederal({ maxisForce: { squat: 280, bench: 200, deadlift: 320 }, profil: PROFIL, poidsKg: 80 }), 3, "800 kg à 80 kg : international");
    assert.equal(niveauFederal({ maxisForce: { squat: 280, bench: 200, deadlift: 320 }, profil: PROFIL }), 0, "sans poids, pas de catégorie");
    localStorage.setItem("cn_performances", JSON.stringify({ course_10k: { valeur: 2100, date: "2026-10-01" } }));
    assert.equal(compteursTrophees({ seances: [], profil: PROFIL, date: AUJ }).niveauFederal, 1);
  });
});
