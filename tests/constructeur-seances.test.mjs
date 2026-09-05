/**
 * Constructeur de seances : logique.
 *
 * Deux calculs comptent vraiment ici, et pour la meme raison : ils
 * decident de ce que le client aura sur la barre.
 *
 * - LA PROGRESSION DE CHARGE, comparee a index.html sur toute la grille des
 *   RPE, des RIR et des charges. Une erreur d'arrondi ne se voit pas a
 *   l'ecran : elle envoie quelqu'un sur 5 kg de trop.
 * - LA PREPARATION D'UNE SEANCE, qui choisit entre reprendre la derniere
 *   seance, partir d'un modele du coach, ou ouvrir une ligne vide. Se
 *   tromper de branche, c'est effacer la progression d'un client.
 *
 * Les identifiants sont generes aleatoirement : ils sont neutralises avant
 * comparaison, et testes separement.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { chargerApp } from "./harness.mjs";
import {
  ajouterDepuisBibliotheque,
  chargeSuivante,
  cleExercice,
  exerciceDepuisBibliotheque,
  exerciceVide,
  exercicesARetenir,
  fusionnerExercicesPerso,
  nomsBibliotheque,
  preparerSeance,
  resumeExercice,
  videoExercice
} from "../app/src/lib/constructeur-seances.js";

let legacy;
before(async () => {
  legacy = await chargerApp();
});

const nu = (v) => JSON.parse(JSON.stringify(v));

/** Remplace tous les identifiants par une valeur fixe. */
const sansId = (v) => {
  const copie = nu(v);
  const parcourir = (o) => {
    if (Array.isArray(o)) return o.forEach(parcourir);
    if (o && typeof o === "object") {
      if ("id" in o && typeof o.id === "string") o.id = "ID";
      Object.values(o).forEach(parcourir);
    }
  };
  parcourir(copie);
  return copie;
};

describe("progression de charge", () => {
  test("identique a index.html sur toute la grille RPE / charge", () => {
    let suggestions = 0;
    for (const poids of ["", "0", "-10", "1", "2.5", "20", "42.5", "60", "77.5", "100", "142.5", "300"]) {
      for (const rpe of ["", null, "5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.25", "9.5", "10", "11"]) {
        const obtenu = chargeSuivante(poids, rpe, "");
        assert.deepEqual(
          nu(obtenu),
          nu(legacy.suggestNextLoad(poids, rpe, "")),
          `poids ${poids}, RPE ${rpe}`
        );
        if (obtenu) suggestions++;
      }
    }
    assert.ok(suggestions > 50, `trop peu de suggestions produites : ${suggestions}`);
  });

  test("identique a index.html quand le ressenti passe par les RIR", () => {
    for (const poids of ["20", "60", "100"]) {
      for (const rir of ["", "0", "1", "2", "3", "4", "5", "6"]) {
        assert.deepEqual(
          nu(chargeSuivante(poids, "", rir)),
          nu(legacy.suggestNextLoad(poids, "", rir)),
          `poids ${poids}, RIR ${rir}`
        );
      }
    }
  });

  test("le RPE saisi prime sur les RIR", () => {
    const parRpe = chargeSuivante("100", "6", "0");
    const parRir = chargeSuivante("100", "", "0");
    assert.notDeepEqual(parRpe, parRir, "les RIR ont ete utilises alors qu'un RPE etait saisi");
  });

  test("sans charge ou sans ressenti, aucune suggestion", () => {
    assert.equal(chargeSuivante("", "7", ""), null);
    assert.equal(chargeSuivante("0", "7", ""), null);
    assert.equal(chargeSuivante("100", "", ""), null);
  });

  test("toute charge suggeree est realisable sur une barre", () => {
    for (let w = 2.5; w <= 250; w += 2.5) {
      for (const rpe of ["6", "7", "8", "9", "10"]) {
        const sug = chargeSuivante(String(w), rpe, "");
        if (!sug) continue;
        assert.equal(
          Math.round(sug.weight * 10) % 25,
          0,
          `charge non realisable : ${sug.weight} kg (depuis ${w} kg, RPE ${rpe})`
        );
      }
    }
  });

  test("une serie facile monte, une serie a l'echec descend", () => {
    assert.ok(chargeSuivante("100", "6", "").delta > 0, "RPE 6 devrait faire monter la charge");
    assert.equal(chargeSuivante("100", "9", "").delta, 0, "RPE 9 devrait stabiliser");
    assert.ok(chargeSuivante("100", "10", "").delta < 0, "RPE 10 devrait faire reculer");
  });

  test("la progression est monotone : plus le RPE monte, moins la charge monte", () => {
    const deltas = ["6", "7", "8", "9", "10"].map((r) => chargeSuivante("200", r, "").delta);
    for (let i = 1; i < deltas.length; i++) {
      assert.ok(deltas[i] <= deltas[i - 1], `RPE croissant mais delta croissant : ${deltas}`);
    }
  });
});

describe("cles d'exercices", () => {
  test("identiques a index.html", () => {
    const noms = [
      "Développé couché",
      "  DEVELOPPE   COUCHE  ",
      "Tirage vertical (prise large)",
      "Squat",
      "",
      null,
      "Curl biceps — barre EZ",
      "Épaulé-jeté"
    ];
    for (const n of noms) assert.equal(cleExercice(n), legacy.exKey(n), `nom : ${JSON.stringify(n)}`);
  });

  test("deux ecritures du meme exercice donnent la meme cle", () => {
    assert.equal(cleExercice("Développé couché"), cleExercice("developpe  couche"));
  });

  test("la bibliotheque est identique a celle d'index.html", () => {
    assert.deepEqual([...nomsBibliotheque()].sort(), [...legacy.LIBRARY_NAMES()].sort());
    assert.ok(nomsBibliotheque().size > 100, "bibliotheque anormalement petite");
  });
});

describe("exercices personnels retenus", () => {
  test("un exercice de la bibliotheque n'est jamais retenu", () => {
    const connu = [...nomsBibliotheque()][0];
    // On repart du nom d'origine, pas de la cle : c'est ce que saisit le client.
    const nom = legacy.EXERCISE_LIBRARY[0].items[0].name;
    assert.equal(cleExercice(nom), connu);
    assert.deepEqual(exercicesARetenir([{ name: nom, mode: "muscu" }]), []);
  });

  test("un exercice deja personnel n'est pas duplique", () => {
    const deja = [{ name: "Gainage sur Swiss ball perso", mode: "muscu", defaults: {} }];
    assert.deepEqual(exercicesARetenir([{ name: "gainage sur swiss  ball perso" }], deja), []);
  });

  test("un doublon dans la meme seance n'est retenu qu'une fois", () => {
    const r = exercicesARetenir([{ name: "Gainage sur Swiss ball perso" }, { name: "GAINAGE SUR SWISS BALL PERSO" }]);
    assert.equal(r.length, 1);
  });

  test("un exercice sans nom est ignore", () => {
    assert.deepEqual(exercicesARetenir([{ name: "   " }, { name: null }, {}]), []);
  });

  test("les valeurs saisies deviennent les valeurs par defaut", () => {
    const [r] = exercicesARetenir([
      { name: "Gainage sur Swiss ball perso", mode: "muscu", sets: "4", reps: "8", repUnit: "sec" }
    ]);
    assert.deepEqual(r.defaults, { sets: 4, reps: 8, repUnit: "sec" });
  });

  test("un cardio retient ses champs et leurs valeurs", () => {
    const [r] = exercicesARetenir([
      { name: "Rameur perso", mode: "cardio", durationMin: "20", speedKmh: "", distanceM: "5000" }
    ]);
    assert.deepEqual(r.fields, Array.from(legacy.DEFAULT_CARDIO_FIELDS));
    assert.deepEqual(r.defaults, { durationMin: "20" }, "un champ vide ne doit pas devenir une valeur par defaut");
  });

  test("la liste des exercices personnels est plafonnee", () => {
    let liste = [];
    for (let i = 0; i < 260; i++) liste = fusionnerExercicesPerso(liste, [{ name: "Exercice perso " + i }]);
    assert.equal(liste.length, 200);
    // Les plus recents sont conserves, pas les plus anciens.
    assert.equal(liste[0].name, "Exercice perso 259");
  });

  test("sans nouveauté, la liste precedente est rendue telle quelle", () => {
    const avant = [{ name: "Gainage sur Swiss ball perso", mode: "muscu", defaults: {} }];
    assert.equal(fusionnerExercicesPerso(avant, [{ name: "gainage sur swiss ball perso" }]), avant);
  });
});

describe("preparation d'une seance", () => {
  const routine = { id: "r1", name: "Haut du corps" };
  const AUJOURD_HUI = "2026-03-10";

  test("sans historique ni modele : une ligne vide", () => {
    const s = preparerSeance(routine, [], AUJOURD_HUI);
    assert.equal(s.exercises.length, 1);
    assert.equal(s.exercises[0].name, "");
    assert.equal(s.date, AUJOURD_HUI);
    assert.equal(s.routineId, "r1");
    assert.equal(s.id, null);
  });

  test("un modele du coach fournit les exercices, sans charge", () => {
    const modele = legacy.SEANCE_TEMPLATES[0];
    const s = preparerSeance({ ...routine, templateId: modele.id }, [], AUJOURD_HUI);
    assert.equal(s.exercises.length, modele.exercises.length);
    assert.equal(s.durationMin, modele.durationMin);
    assert.equal(s.notes, modele.note);
    for (const ex of s.exercises) {
      assert.equal(ex.weight, "", "un modele ne connait pas le niveau du client");
      assert.equal(ex.rpe, "");
    }
  });

  test("la derniere seance prime sur le modele", () => {
    const modele = legacy.SEANCE_TEMPLATES[0];
    const seances = [
      { id: "s1", routineId: "r1", date: "2026-03-03", exercises: [{ id: "x", name: "Squat", mode: "muscu", weight: "100", rpe: "6" }] }
    ];
    const s = preparerSeance({ ...routine, templateId: modele.id }, seances, AUJOURD_HUI);
    assert.equal(s.exercises.length, 1);
    assert.equal(s.exercises[0].name, "Squat");
    // Le modele ne doit pas non plus imposer sa duree ni ses notes : le
    // client a deja fait cette seance, c'est la sienne qui fait foi.
    assert.equal(s.durationMin, "");
    assert.equal(s.notes, "");
  });

  test("la seance la plus recente est reprise, pas la premiere trouvee", () => {
    const seances = [
      { routineId: "r1", date: "2026-01-05", exercises: [{ name: "Ancien", mode: "muscu", weight: "50" }] },
      { routineId: "r1", date: "2026-03-03", exercises: [{ name: "Recent", mode: "muscu", weight: "50" }] },
      { routineId: "r1", date: "2026-02-01", exercises: [{ name: "Milieu", mode: "muscu", weight: "50" }] }
    ];
    assert.equal(preparerSeance(routine, seances, AUJOURD_HUI).exercises[0].name, "Recent");
  });

  test("les seances d'une autre routine sont ignorees", () => {
    const seances = [
      { routineId: "AUTRE", date: "2026-03-09", exercises: [{ name: "Pas la mienne", mode: "muscu" }] }
    ];
    assert.equal(preparerSeance(routine, seances, AUJOURD_HUI).exercises[0].name, "");
  });

  test("la charge est ajustee et le bandeau indique d'ou l'on vient", () => {
    const seances = [
      { routineId: "r1", date: "2026-03-03", exercises: [{ name: "Squat", mode: "muscu", weight: "100", rpe: "6" }] }
    ];
    const ex = preparerSeance(routine, seances, AUJOURD_HUI).exercises[0];
    const attendu = chargeSuivante("100", "6", "");
    assert.equal(ex.weight, String(attendu.weight));
    assert.deepEqual(ex.suggested, { from: 100, delta: attendu.delta, reason: attendu.reason });
  });

  test("le ressenti de la seance precedente n'est jamais recopie", () => {
    const seances = [
      { routineId: "r1", date: "2026-03-03", exercises: [{ name: "Squat", mode: "muscu", weight: "100", rpe: "9", rir: "1" }] }
    ];
    const ex = preparerSeance(routine, seances, AUJOURD_HUI).exercises[0];
    assert.equal(ex.rpe, "", "un RPE recopie proposerait deux fois la meme progression");
    assert.equal(ex.rir, "");
  });

  test("un cardio ne recoit aucune suggestion de charge", () => {
    const seances = [
      { routineId: "r1", date: "2026-03-03", exercises: [{ name: "Rameur", mode: "cardio", weight: "100", rpe: "6" }] }
    ];
    const ex = preparerSeance(routine, seances, AUJOURD_HUI).exercises[0];
    assert.equal(ex.suggested, null);
    assert.equal(ex.weight, "100", "la charge d'un cardio ne doit pas etre modifiee");
  });

  test("chaque exercice repris recoit un identifiant neuf", () => {
    const seances = [
      { routineId: "r1", date: "2026-03-03", exercises: [{ id: "ANCIEN", name: "Squat", mode: "muscu", weight: "100", rpe: "6" }] }
    ];
    assert.notEqual(preparerSeance(routine, seances, AUJOURD_HUI).exercises[0].id, "ANCIEN");
  });

  /**
   * LIMITE ASSUMEE : preparerSeance n'a pas d'equivalent comparable dans
   * index.html. La logique y vit dans le corps de startSession, a
   * l'interieur d'un composant React — elle n'est pas extractible sans la
   * reecrire, et une reecriture comparee a elle-meme ne prouve rien.
   *
   * Ce qu'elle contient de calculatoire (chargeSuivante) est compare a
   * index.html plus haut, exhaustivement. Le reste — quelle branche prendre,
   * quels champs reinitialiser — est verrouille par les tests de
   * comportement ci-dessus, et chacun a ete verifie par mutation.
   */
});

describe("ajout depuis la bibliotheque", () => {
  const item = { name: "Squat barre", mode: "muscu", defaults: { sets: 3, reps: 8 } };

  test("les valeurs par defaut de la bibliotheque sont reprises", () => {
    const e = exerciceDepuisBibliotheque(item);
    assert.equal(e.name, "Squat barre");
    assert.equal(e.sets, 3);
    assert.equal(e.reps, 8);
    assert.equal(e.weight, "");
  });

  test("la seule ligne vide est remplacee, pas conservee", () => {
    const suivant = ajouterDepuisBibliotheque([exerciceVide()], item);
    assert.equal(suivant.length, 1);
    assert.equal(suivant[0].name, "Squat barre");
  });

  test("les exercices deja remplis sont conserves", () => {
    const depart = [{ ...exerciceVide(), name: "Squat" }];
    const suivant = ajouterDepuisBibliotheque(depart, item);
    assert.deepEqual(suivant.map((e) => e.name), ["Squat", "Squat barre"]);
  });

  test("une ligne vide au milieu d'exercices remplis est conservee", () => {
    const depart = [{ ...exerciceVide(), name: "Squat" }, exerciceVide()];
    const suivant = ajouterDepuisBibliotheque(depart, item);
    assert.deepEqual(suivant.map((e) => e.name), ["Squat", "", "Squat barre"]);
  });

  test("un cardio de la bibliotheque emporte ses champs", () => {
    const cardio = { name: "Tapis", mode: "cardio", fields: ["durationMin", "speedKmh"] };
    assert.deepEqual(exerciceDepuisBibliotheque(cardio).fields, ["durationMin", "speedKmh"]);
  });
});

describe("resume d'un exercice", () => {
  /** Un exercice de chaque mode, avec les cas limites de chaque champ. */
  const CAS = [
    { mode: "muscu", sets: 4, reps: 8, weight: 60, rpe: 8 },
    { mode: "muscu", sets: 4, reps: 8, weight: 60, rir: 2 },
    { mode: "muscu", sets: 4, reps: 8, weight: 60, rpe: 8, rir: 2 },
    { mode: "muscu", sets: "", reps: "", weight: "" },
    { mode: "muscu", sets: 3, reps: 45, repUnit: "sec" },
    { mode: "pdc", sets: 3, reps: 12 },
    { mode: "pdc", sets: 3, reps: 12, weight: 10 },
    { mode: "pdc", sets: 3, reps: 30, repUnit: "sec", rir: 0 },
    { mode: "warmup", sets: 1, reps: 10 },
    { mode: "cardio", durationMin: 20, speedKmh: 10, inclinePct: 2, level: 5, distanceM: 3000 },
    { mode: "cardio", durationMin: 20 },
    { mode: "cardio" },
    { mode: "powerlifting", setType: "top", sets: 1, reps: 3, weight: 140, pct1rm: 90, rpe: 9 },
    { mode: "powerlifting", setType: "inconnu", sets: 5, reps: 5 },
    { mode: "powerlifting" },
    { sets: 3, reps: 10, weight: 40 },
    {}
  ];

  test("identique a index.html sur tous les modes", () => {
    for (const ex of CAS) {
      assert.equal(resumeExercice(ex), legacy.fmtExercise(ex), `exercice ${JSON.stringify(ex)}`);
    }
  });

  test("le RPE prime sur les RIR", () => {
    assert.ok(resumeExercice({ mode: "muscu", sets: 4, reps: 8, rpe: 8, rir: 2 }).includes("RPE 8"));
    assert.ok(!resumeExercice({ mode: "muscu", sets: 4, reps: 8, rpe: 8, rir: 2 }).includes("RIR"));
  });

  test("un RIR de 0 s'affiche, il ne disparait pas comme une valeur vide", () => {
    assert.ok(resumeExercice({ mode: "muscu", sets: 4, reps: 8, rir: 0 }).includes("RIR 0"));
  });

  test("un cardio sans rien saisi rend un tiret, pas une chaine vide", () => {
    assert.equal(resumeExercice({ mode: "cardio" }), "—");
  });
});

describe("videos de demonstration", () => {
  test("identiques a index.html", () => {
    const noms = [
      ...legacy.EXERCISE_LIBRARY.flatMap((g) => Array.from(g.items).map((i) => i.name)),
      "Exercice qui n'existe pas"
    ];
    let avecVideo = 0;
    for (const n of noms) {
      assert.equal(videoExercice(n), legacy.videoFor(n), `exercice ${n}`);
      if (videoExercice(n)) avecVideo++;
    }
    assert.ok(avecVideo > 20, `trop peu de videos trouvees : ${avecVideo}`);
  });

  test("l'ecriture du nom n'empeche pas de trouver la video", () => {
    const avecVideo = legacy.EXERCISE_LIBRARY.flatMap((g) => Array.from(g.items)).find((i) =>
      videoExercice(i.name)
    );
    assert.equal(videoExercice(avecVideo.name.toUpperCase()), videoExercice(avecVideo.name));
  });
});
