/**
 * Demandes du coach du 2 octobre 2026 :
 *
 * 1. Carte de progres : le client suivi avant l'application (depuis 2022
 *    pour certains) saisit la date de debut de son coaching ; les semaines
 *    de suivi se calculent a partir d'elle.
 * 2. Bibliotheque d'exercices : un exercice absent de la liste s'ajoute
 *    directement depuis la bibliotheque, et reste dans « Mes exercices ».
 * 3. Recettes du coach : plus d'etiquette de regime sur les fiches, mais le
 *    tri par regime et allergies reste en place.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { choixDebut, debutSaisi, joursDansMois, lignesCarte, partiesDate, statistiquesProgres } from "../app/src/lib/carte-progres.js";
import { cleExercice, exerciceTape, exercicesARetenir } from "../app/src/lib/constructeur-seances.js";
import { EXERCISE_LIBRARY } from "../app/src/lib/catalogues.js";
import { RECETTES_COACH } from "../app/src/lib/recettes-coach-catalogue.js";
import { recettesPourClient } from "../app/src/lib/recettes-coach.js";

const AUJ = "2026-10-01";
const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), "utf8");
const vide = { seances: [], pesees: [], repas: [], journal: [], date: AUJ };

describe("1. Debut du coaching saisi par le client", () => {
  test("client suivi depuis janvier 2022 : 248 semaines, sans aucune saisie dans l'app", () => {
    // Du 3 janvier 2022 au 1er octobre 2026 : 1 732 jours (2024 bissextile),
    // donc 1 733 jours comptes, 248 semaines entamees.
    const s = statistiquesProgres({ ...vide, profil: { coachingStartDate: "2022-01-03" } });
    assert.equal(s.debut, "2022-01-03");
    assert.equal(s.semaines, 248);
    assert.deepEqual(lignesCarte(s)[0], { valeur: "248", libelle: "semaines de suivi" });
  });

  test("la date saisie l'emporte sur la premiere saisie dans l'app", () => {
    const s = statistiquesProgres({
      ...vide,
      profil: { coachingStartDate: "2026-09-03" },
      seances: [{ date: "2026-09-24" }]
    });
    assert.equal(s.debut, "2026-09-03");
    assert.equal(s.semaines, 5, "du 3 septembre au 1er octobre : 29 jours, 5 semaines entamees");
    assert.equal(s.seances, 1);
  });

  test("sans date saisie : calcul automatique depuis la premiere saisie, comme avant", () => {
    const s = statistiquesProgres({ ...vide, profil: {}, seances: [{ date: "2026-09-24" }] });
    assert.equal(s.debut, "2026-09-24");
    assert.equal(s.semaines, 2);
  });

  test("date illisible, impossible, future ou avant 2000 : ignoree", () => {
    for (const v of ["", "hier", "2023-02-30", "2026-13-01", "2026-10-02", "1999-12-31", 20220103, null, undefined]) {
      assert.equal(debutSaisi({ coachingStartDate: v }, AUJ), null, String(v));
      const s = statistiquesProgres({ ...vide, profil: { coachingStartDate: v }, seances: [{ date: "2026-09-24" }] });
      assert.equal(s.debut, "2026-09-24", String(v));
    }
    assert.equal(statistiquesProgres({ ...vide, profil: { coachingStartDate: "2027-01-01" } }), null);
  });

  test("bornes acceptees : aujourd'hui, 29 fevrier d'une annee bissextile, 1er janvier 2000", () => {
    assert.equal(debutSaisi({ coachingStartDate: AUJ }, AUJ), AUJ);
    assert.equal(debutSaisi({ coachingStartDate: "2024-02-29" }, AUJ), "2024-02-29");
    assert.equal(debutSaisi({ coachingStartDate: "2000-01-01" }, AUJ), "2000-01-01");
    assert.equal(debutSaisi(null, AUJ), null);
  });

  test("branchement : champ sur la carte, enregistre dans le profil, effacable", () => {
    const carte = lire("../app/src/ecrans/CarteProgres.jsx");
    assert.match(carte, /data-debut-coaching/);
    assert.match(carte, /valeur=\{debutManuel \|\| \(stats && stats\.debut\) \|\| date\}/);
    assert.match(carte, /onChange=\{onDebutCoaching\}/);
    // Trois listes, pas le calendrier natif (inutilisable sur Android).
    assert.doesNotMatch(carte, /type="date"/);
    for (const l of ["Jour de début", "Mois de début", "Année de début"]) assert.match(carte, new RegExp(`aria-label="${l}"`));
    assert.match(carte, /const r = choixDebut\(suivantes, date\);/);
    assert.match(carte, /if \(r\.iso && r\.iso !== valeur\) onChange\(r\.iso\);/);
    assert.match(carte, /onClick=\{\(\) => onChange\(""\)\}/);
    assert.match(lire("../app/src/ecrans/Tendances.jsx"), /<CarteProgres[^>]*onDebutCoaching=\{onDebutCoaching\}/);
    const app = lire("../app/src/App.jsx");
    assert.match(app, /onDebutCoaching=\{\(d\) => \{/);
    assert.match(app, /const \{ coachingStartDate, \.\.\.reste \} = profil;/);
    assert.match(app, /enregistrerProfil\(d \? \{ \.\.\.reste, coachingStartDate: d \} : reste\)/);
  });
});

describe("1 bis. Listes Jour / Mois / Annee (retour Android du coach)", () => {
  test("date complete et passee : enregistrable", () => {
    assert.deepEqual(choixDebut({ jour: 3, mois: 1, annee: 2022 }, AUJ), { iso: "2022-01-03" });
    assert.deepEqual(choixDebut({ jour: 1, mois: 10, annee: 2026 }, AUJ), { iso: AUJ });
  });

  test("31 fevrier : ramene au dernier jour du mois, annees bissextiles comprises", () => {
    assert.deepEqual(choixDebut({ jour: 31, mois: 2, annee: 2023 }, AUJ), { iso: "2023-02-28" });
    assert.deepEqual(choixDebut({ jour: 31, mois: 2, annee: 2024 }, AUJ), { iso: "2024-02-29" });
    assert.deepEqual(choixDebut({ jour: 31, mois: 4, annee: 2025 }, AUJ), { iso: "2025-04-30" });
    assert.equal(joursDansMois(2024, 2), 29);
    assert.equal(joursDansMois(2100, 2), 28);
    assert.equal(joursDansMois(2026, 12), 31);
  });

  test("date dans le futur : signalee, jamais enregistree", () => {
    assert.deepEqual(choixDebut({ jour: 2, mois: 10, annee: 2026 }, AUJ), { futur: true });
    assert.deepEqual(choixDebut({ jour: 1, mois: 12, annee: 2026 }, AUJ), { futur: true });
  });

  test("saisie incomplete ou hors bornes : rien", () => {
    for (const p of [{}, { jour: 1, mois: 13, annee: 2022 }, { jour: 0, mois: 1, annee: 2022 }, { jour: 1, mois: 1, annee: 1999 }, { jour: "x", mois: 1, annee: 2022 }]) {
      assert.deepEqual(choixDebut(p, AUJ), {}, JSON.stringify(p));
    }
  });

  test("aller-retour : les listes reprennent la date affichee", () => {
    assert.deepEqual(partiesDate("2022-01-03"), { jour: 3, mois: 1, annee: 2022 });
    assert.deepEqual(choixDebut(partiesDate("2024-02-29"), AUJ), { iso: "2024-02-29" });
  });
});

describe("2. Exercice absent de la bibliotheque", () => {
  const biblio = EXERCISE_LIBRARY[0].items[0];

  test("nom vide : rien", () => {
    for (const v of ["", "   ", null, undefined, "!!!"]) assert.equal(exerciceTape(v), null, String(v));
  });

  test("nouvel exercice : musculation, nom nettoye", () => {
    assert.deepEqual(exerciceTape("  Tirage   landmine  "), { name: "Tirage landmine", mode: "muscu", defaults: {} });
    assert.equal(exerciceTape("x".repeat(120)).name.length, 80);
  });

  test("nom deja dans la bibliotheque (accents, majuscules) : l'exercice de la bibliotheque, avec ses valeurs", () => {
    const tape = exerciceTape(biblio.name.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
    assert.equal(tape, biblio);
  });

  test("nom deja dans « Mes exercices » : on reprend le sien, pas de doublon", () => {
    const perso = [{ name: "Tirage landmine", mode: "muscu", defaults: { sets: 4, reps: 8 } }];
    assert.equal(exerciceTape("tirage LANDMINE", perso), perso[0]);
  });

  test("le nouvel exercice est retenu dans « Mes exercices », un exercice de la bibliotheque ne l'est pas", () => {
    const nouveau = exerciceTape("Tirage landmine");
    assert.equal(exercicesARetenir([{ name: nouveau.name, mode: nouveau.mode }], []).length, 1);
    assert.equal(exercicesARetenir([{ name: biblio.name, mode: biblio.mode }], []).length, 0);
    assert.equal(cleExercice(exercicesARetenir([{ name: nouveau.name, mode: "muscu" }], [])[0].name), "tirage landmine");
  });

  test("branchement : formulaire dans la bibliotheque, retenu tout de suite et ajoute a la seance", () => {
    const ecran = lire("../app/src/ecrans/ConstructeurSeances.jsx");
    assert.match(ecran, /data-exercice-tape/);
    assert.match(ecran, /const item = exerciceTape\(exerciceLibre, exercicesPerso\.items\);/);
    assert.match(ecran, /exercicesPerso\.retenir\(\[\{ name: item\.name, mode: item\.mode \|\| "muscu" \}\]\);/);
    assert.match(ecran, /ajouterDeLaBibliotheque\(item\);/);
    // Un seul declencheur : le bouton est le bouton d'envoi du formulaire.
    // Un onClick en plus ajouterait l'exercice deux fois.
    assert.doesNotMatch(ecran, /onClick=\{ajouterExerciceTape\}/);
    assert.match(ecran, /onSubmit=\{\(e\) => \{\s*e\.preventDefault\(\);\s*ajouterExerciceTape\(\);/);
  });
});

describe("3. Recettes du coach sans etiquette de regime", () => {
  // Code sans les commentaires : seul ce qui s'affiche compte.
  const ecran = lire("../app/src/ecrans/RecettesCoach.jsx")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  test("aucune etiquette « Vegan », « Vegetarien » ou « Sans porc » a l'ecran", () => {
    assert.doesNotMatch(ecran, /Vegan|Végétarien|Sans porc|REGIME_BADGE|badgeRegime/);
    assert.doesNotMatch(ecran, /ouverte\.regimes/);
  });

  test("le tri par regime et allergies reste en place", () => {
    assert.match(ecran, /recettesPourClient\(catalogue, profile\)/);
    const sansPorc = recettesPourClient(RECETTES_COACH, { dietType: "sans-porc", allergies: [] });
    assert.ok(sansPorc.length > 0);
    assert.ok(sansPorc.every((r) => r.regimes.includes("sans-porc")));
    const vegan = recettesPourClient(RECETTES_COACH, { dietType: "vegetalien", allergies: [] });
    assert.ok(vegan.every((r) => r.regimes.includes("vegan")));
    const gluten = recettesPourClient(RECETTES_COACH, { dietType: "aucun", allergies: ["gluten"] });
    assert.ok(gluten.every((r) => !r.contient.includes("gluten")));
    assert.ok(gluten.length < RECETTES_COACH.length);
  });
});
