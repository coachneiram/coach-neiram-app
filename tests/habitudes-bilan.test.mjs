/**
 * « Habitudes et déclics » dans le bilan envoyé au coach (24 octobre
 * 2026) : habitudes suivies (taux sur 30 jours, série) et 3 déclics au
 * plus. Sans données, le document reste identique au caractère près.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addDays } from "../app/src/lib/dates.js";
import { lignesHabitudesBilan } from "../app/src/lib/habitudes-bilan.js";
import { construireBilanHTML } from "../app/src/lib/bilan-html.js";

const J = "2026-10-24";
const base = {
  profile: { name: "Thomas", goal: "perte" },
  weekStats: { start: "2026-10-19", end: "2026-10-25", workoutsCount: 2, loggedDaysCount: 5, adherence: 80 },
  report: null,
  photos: null,
  targets: null
};
const sansDate = (html) => html.replace(/le \d{2}\/\d{2}\/\d{4}/, "le …");

test("sans habitude ni déclic : aucune ligne, et un bilan strictement identique", () => {
  assert.deepEqual(lignesHabitudesBilan({ habitudes: null, journal: [], seances: [], date: J }), []);
  const avant = construireBilanHTML(base);
  assert.equal(construireBilanHTML({ ...base, habitudes: [] }), avant);
  assert.equal(construireBilanHTML({ ...base, habitudes: undefined, performances: [] }), avant);
  assert.ok(!/Habitudes et déclics/.test(avant));
});

test("habitudes suivies : taux sur 30 jours et série", () => {
  const coches = {};
  for (let i = 0; i < 15; i++) coches[addDays(J, -i)] = ["lecture"];
  const l = lignesHabitudesBilan({ habitudes: { choisies: ["lecture", "sans-soda"], coches }, date: J });
  assert.deepEqual(l, [
    "📖 Lire 10 pages : 50 % des jours sur 30 jours · série de 15 jours",
    "🚫 Pas de boisson sucrée : 0 % des jours sur 30 jours · pas de série en cours"
  ]);
});

test("déclics : 3 au plus, à la suite des habitudes, dans la liste du bilan", () => {
  const journal = [];
  const seances = [];
  const coches = {};
  for (let i = 0; i < 30; i++) {
    const d = addDays(J, -i);
    const sport = i % 2 === 0;
    journal.push({ date: d, energy: sport ? 4.5 : 3, stress: sport ? 3 : 6, sleepHours: i % 3 === 0 ? 8 : 6, steps: sport ? 9000 : 4000 });
    if (sport) seances.push({ date: d, exercises: [] });
    if (sport) coches[d] = ["sans-ecran"];
  }
  const l = lignesHabitudesBilan({ habitudes: { choisies: ["sans-ecran"], coches }, journal, seances, date: J });
  const declics = l.filter((x) => x.startsWith("Déclic : "));
  assert.equal(l[0].startsWith("📵 Pas d'écran 30 min avant de dormir : 50 %"), true, l[0]);
  assert.equal(declics.length, 3);
  assert.match(declics[0], /\(\d+ jours avec, \d+ sans\)$/);

  const html = construireBilanHTML({ ...base, habitudes: l });
  assert.match(html, /Habitudes et déclics/);
  assert.match(html, /Pas d&#39;écran|Pas d'écran/);
  // Même ligne que la liste précédente : rien d'autre ne bouge dans le document.
  const avec = sansDate(html);
  const sans = sansDate(construireBilanHTML(base));
  const debut = avec.indexOf('<h2 style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#4ADE80;margin:18px 0 8px">Habitudes');
  assert.ok(debut > 0);
  const fin = avec.indexOf("</ul>", debut) + "</ul>".length;
  assert.equal(avec.slice(0, debut) + avec.slice(fin), sans);
});

test("App.jsx passe la liste au bilan, par le même mécanisme que les performances", () => {
  const app = readFileSync(new URL("../app/src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /habitudes: lignesHabitudesBilan\(\{/);
  const bilan = readFileSync(new URL("../app/src/lib/bilan-html.js", import.meta.url), "utf8");
  assert.match(bilan, /\$\{liste\("Performances et transformation", performances, "#F8D040"\)\}\$\{liste\("Habitudes et déclics", habitudes, "#4ADE80"\)\}\$\{blocDouleurs\}/);
});
