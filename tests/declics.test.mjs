/** Mes déclics (lib/declics.js), repris de l'app Neiram le 24/10/2026. */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { addDays } from "../app/src/lib/dates.js";
import { declics, ecart } from "../app/src/lib/declics.js";

const J = "2026-10-24";

describe("déclics", () => {
  test("pas assez de jours : rien", () => {
    const m = { lire: (f) => f.energy };
    assert.equal(ecart([{ form: { energy: 4 } }, { form: { energy: 2 } }], (j) => j.form.energy > 3, m), null);
  });

  test("entraînement et énergie : l'écart est trouvé et formulé prudemment", () => {
    const journal = [];
    const seances = [];
    for (let i = 0; i < 20; i++) {
      const d = addDays(J, -i);
      const sport = i % 2 === 0;
      journal.push({ date: d, energy: sport ? 4.5 : 3, stress: sport ? 3 : 6, sleepHours: 7 });
      if (sport) seances.push({ date: d, exercises: [] });
    }
    const l = declics({ journal, seances, habitudes: null, date: J });
    assert.ok(l.length >= 2);
    assert.ok(l.some((d) => /entraînes, ton énergie est plus haut de 1,5 point/.test(d.phrase)), l.map((d) => d.phrase).join(" | "));
    assert.ok(l.some((d) => /stress est plus bas/.test(d.phrase) && d.mieux));
  });

  test("habitude cochée et sommeil de la nuit suivante", () => {
    const journal = [];
    const coches = {};
    for (let i = 0; i < 20; i++) {
      const d = addDays(J, -i);
      journal.push({ date: d, sleepHours: i % 2 === 1 ? 8 : 6.5 });
      if (i % 2 === 0) coches[d] = ["sans-ecran"];
    }
    const l = declics({ journal, seances: [], habitudes: { choisies: ["sans-ecran"], coches }, date: J });
    assert.ok(l.some((d) => /sans-ecran|Pas d'écran/.test(d.phrase) && /dors 1,5 h de plus/.test(d.phrase)), l.map((d) => d.phrase).join(" | "));
  });
});
