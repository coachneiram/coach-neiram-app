/**
 * Semaines, creneaux et pointage de seances.
 *
 * C'est le calcul le plus consequent de l'application : il decide de ce que
 * le coach voit dans le bilan hebdomadaire de son client. Une erreur de
 * bornes de semaine ne se voit pas — elle deplace juste une seance d'une
 * semaine a l'autre, et les deux bilans deviennent faux.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  JOURS_SEMAINE,
  creneauPourDate,
  dayIdOf,
  enLigne,
  getMonday,
  getMonthKey,
  getWeekKey,
  getWeekRange,
  minutesOf,
  normaliserCreneaux,
  slotDayIndex,
  slotDayLabel
} from "../app/src/lib/semaine.js";
import { resumeSeance, seancesDeLaSemaine } from "../app/src/lib/seances.js";

describe("la semaine commence le lundi", () => {
  test("un mercredi renvoie le lundi qui precede", () => {
    // 2026-09-02 est un mercredi.
    assert.equal(getMonday("2026-09-02"), "2026-08-31");
  });

  test("un lundi est son propre debut de semaine", () => {
    assert.equal(getMonday("2026-08-31"), "2026-08-31");
  });

  test("un dimanche appartient a la semaine qui s'acheve, pas a la suivante", () => {
    // Le piege classique : getDay() renvoie 0 pour dimanche. Sans traitement
    // particulier, le bilan basculerait le dimanche soir et couperait le
    // week-end en deux.
    assert.equal(getMonday("2026-09-06"), "2026-08-31");
  });

  test("le passage d'un mois a l'autre ne casse rien", () => {
    assert.equal(getMonday("2026-03-01"), "2026-02-23");
  });

  test("une semaine couvre bien sept jours", () => {
    assert.deepEqual(getWeekRange("2026-08-31"), { start: "2026-08-31", end: "2026-09-06" });
  });

  test("la cle de mois est le mois calendaire", () => {
    assert.equal(getMonthKey("2026-09-06"), "2026-09");
  });
});

describe("jours et creneaux", () => {
  test("chaque jour de la semaine se retrouve depuis une date", () => {
    assert.equal(dayIdOf("2026-08-31"), "mon");
    assert.equal(dayIdOf("2026-09-06"), "sun");
  });

  test("l'index d'un jour suit l'ordre lundi-dimanche", () => {
    assert.equal(slotDayIndex("mon"), 0);
    assert.equal(slotDayIndex("sun"), 6);
  });

  test("un jour inconnu retombe sur lundi plutot que sur -1", () => {
    // -1 ferait reculer d'un jour toutes les dates calculees a partir de la.
    assert.equal(slotDayIndex("inexistant"), 0);
  });

  test("un jour inconnu s'affiche en tiret", () => {
    assert.equal(slotDayLabel("inexistant"), "—");
    assert.equal(slotDayLabel("wed"), "Mercredi");
  });

  test("les sept jours sont la, dans l'ordre", () => {
    assert.deepEqual(JOURS_SEMAINE.map((j) => j.id), ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  });

  test("une heure se convertit en minutes", () => {
    assert.equal(minutesOf("07:30"), 450);
  });

  test("une heure absente ou illisible ne vaut pas zero", () => {
    // Zero se lirait « minuit » et classerait le creneau en tete de journee.
    assert.equal(minutesOf(""), null);
    assert.equal(minutesOf("plus tard"), null);
  });
});

describe("normalisation des creneaux", () => {
  test("un creneau sans jour est ecarte", () => {
    const c = normaliserCreneaux({ slots: [{ time: "18:00" }, { day: "mon" }] });
    assert.equal(c.length, 1);
    assert.equal(c[0].day, "mon");
  });

  test("les champs manquants deviennent des chaines vides, pas des indefinis", () => {
    const c = normaliserCreneaux({ slots: [{ day: "tue" }] });
    assert.equal(c[0].time, "");
    assert.equal(c[0].place, "");
    assert.equal(c[0].createdAt, null);
  });

  test("un creneau sans identifiant en recoit un", () => {
    const c = normaliserCreneaux({ slots: [{ day: "tue" }] });
    assert.ok(c[0].id && c[0].id.length > 4);
  });

  test("un profil sans creneau ne fait pas tomber le calcul", () => {
    assert.deepEqual(normaliserCreneaux(null), []);
    assert.deepEqual(normaliserCreneaux({}), []);
  });

  test("le creneau du jour est retrouve a partir de la date", () => {
    const profil = { slots: [{ id: "s1", day: "wed", time: "18:00", place: "Salle" }] };
    // 2026-09-02 est le mercredi de la semaine du 31 aout.
    assert.equal(creneauPourDate(profil, "2026-09-02").id, "s1");
  });

  test("un jour sans creneau ne renvoie rien", () => {
    const profil = { slots: [{ id: "s1", day: "wed" }] };
    assert.equal(creneauPourDate(profil, "2026-09-03"), null);
  });
});

describe("mode de coaching", () => {
  test("seul le mode « enligne » active la synchro coach", () => {
    assert.equal(enLigne({ coachingMode: "enligne" }), true);
    assert.equal(enLigne({ coachingMode: "presentiel" }), false);
    assert.equal(enLigne(null), false);
  });
});

describe("seances de la semaine", () => {
  const seances = [
    { id: "a", date: "2026-08-31" },
    { id: "b", date: "2026-09-02" },
    { id: "c", date: "2026-09-06" },
    // Semaine precedente : ne doit pas compter dans le bilan en cours.
    { id: "vieux", date: "2026-08-30" }
  ];

  test("seules les seances de la semaine en cours comptent", () => {
    const s = seancesDeLaSemaine(seances, "2026-09-02");
    assert.deepEqual(s.map((x) => x.id), ["c", "b", "a"]);
  });

  test("la plus recente apparait en premier", () => {
    assert.equal(seancesDeLaSemaine(seances, "2026-09-02")[0].id, "c");
  });

  test("une seance sans date est ignoree plutot que de faire tomber l'ecran", () => {
    const s = seancesDeLaSemaine([{ id: "x" }, { id: "a", date: "2026-09-02" }], "2026-09-02");
    assert.deepEqual(s.map((x) => x.id), ["a"]);
  });

  test("aucune seance enregistree ne pose pas de probleme", () => {
    assert.deepEqual(seancesDeLaSemaine(null, "2026-09-02"), []);
  });
});

describe("resume d'une seance", () => {
  test("duree et RPE sont affiches ensemble", () => {
    assert.equal(resumeSeance({ durationMin: 60, rpe: 8 }), "60 min · RPE 8");
  });

  test("une seule information suffit", () => {
    assert.equal(resumeSeance({ durationMin: 45 }), "45 min");
    assert.equal(resumeSeance({ rpe: 7 }), "RPE 7");
  });

  test("une seance pointee sans detail affiche un tiret", () => {
    // Le pointage seul est valable : le client a pu ne rien vouloir saisir.
    assert.equal(resumeSeance({}), "—");
  });
});
