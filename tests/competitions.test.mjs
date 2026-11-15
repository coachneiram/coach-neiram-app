/**
 * Mes compétitions (15 novembre 2026) : un journal compétition par
 * compétition, sans jamais écraser un meilleur chiffre.
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { creerLocalStorage } from "./outils-neiram.mjs";

globalThis.localStorage = creerLocalStorage();
const comp = await import("../app/src/lib/competitions.js");
const perf = await import("../app/src/lib/performances.js");
const { lignesPerformancesBilan } = await import("../app/src/lib/performances-bilan.js");
const { TEXTES_COMP: T } = await import("../app/src/lib/textes-performances.js");

const AUJOURDHUI = "2026-11-15";
const sasie = (extra = {}) => ({ nom: "Championnat régional", date: "2026-10-12", discipline: "force", resultats: { squat: "110", bench: "70", deadlift: "147,5" }, ...extra });

beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

test("la clé entre dans la sauvegarde et une saisie valide s'enregistre, virgule comprise", () => {
  assert.ok(comp.CLE_COMPETITIONS.startsWith("cn_"));
  const r = comp.ajouterCompetition(sasie(), { aujourdhui: AUJOURDHUI });
  assert.equal(r.ok, true);
  assert.deepEqual(r.competition.resultats, { squat: 110, bench: 70, deadlift: 147.5 });
  assert.equal(comp.totalForce(r.competition.resultats), 327.5);
  assert.equal(comp.lireCompetitions().length, 1);
  assert.ok(globalThis.localStorage.getItem("cn_competitions"));
});

test("refus nets : nom, date future, aucun résultat, résultat illisible ; rien n'est enregistré", () => {
  const essai = (saisie) => comp.ajouterCompetition(saisie, { aujourdhui: AUJOURDHUI });
  assert.equal(essai(sasie({ nom: "  " })).erreur, "nom");
  assert.equal(essai(sasie({ date: "2026-11-16" })).erreur, "date");
  assert.equal(essai(sasie({ date: "demain" })).erreur, "date");
  assert.equal(essai(sasie({ resultats: { squat: "", bench: "" } })).erreur, "vide");
  const faute = essai(sasie({ resultats: { squat: "110", bench: "7o" } }));
  assert.equal(faute.erreur, "valeur");
  assert.deepEqual(faute.invalides, ["bench"]);
  assert.equal(essai(sasie({ resultats: { squat: "900" } })).erreur, "valeur", "au-dessus de la borne");
  assert.equal(essai(sasie({ discipline: "golf" })).erreur, "discipline");
  assert.equal(essai(sasie({ resultats: { course_5k: "20:00" } })).erreur, "valeur", "une épreuve d'une autre discipline");
  assert.equal(comp.lireCompetitions().length, 0);
});

test("le total n'existe que si les trois mouvements sont notés", () => {
  assert.equal(comp.totalForce({ squat: 110, bench: 70 }), null);
  assert.equal(comp.totalForce({ squat: 110, bench: 70, deadlift: 147.5 }), 327.5);
});

test("la liste va de la plus récente à la plus ancienne et une suppression ne touche pas aux records", () => {
  comp.ajouterCompetition(sasie({ nom: "A", date: "2026-03-01" }), { aujourdhui: AUJOURDHUI });
  comp.ajouterCompetition(sasie({ nom: "B", date: "2026-10-12" }), { aujourdhui: AUJOURDHUI });
  comp.ajouterCompetition(sasie({ nom: "C", date: "2026-06-01" }), { aujourdhui: AUJOURDHUI });
  assert.deepEqual(comp.lireCompetitions().map((c) => c.nom), ["B", "C", "A"]);
  perf.enregistrerPerformance("course_10k", "45:00");
  const reste = comp.supprimerCompetition(comp.lireCompetitions()[0].id);
  assert.equal(reste.length, 2);
  assert.equal(perf.lirePerformances().course_10k.valeur, 2700);
});

test("une valeur stockée abîmée est ignorée au lieu de casser l'écran", () => {
  globalThis.localStorage.setItem("cn_competitions", JSON.stringify([{ id: "x", nom: "Ok", date: "2026-10-01", discipline: "course", resultats: { course_10k: 2700 } }, { id: "y", nom: "", date: "2026-10-01", discipline: "course", resultats: { course_10k: 2700 } }, { nom: "Sans id" }, "bizarre", { id: "z", nom: "Vide", date: "2026-10-01", discipline: "force", resultats: {} }]));
  assert.deepEqual(comp.lireCompetitions().map((c) => c.nom), ["Ok"]);
  globalThis.localStorage.setItem("cn_competitions", "pas du json");
  assert.deepEqual(comp.lireCompetitions(), []);
});

test("records battus : seulement ce qui fait mieux, charges vers le haut, temps vers le bas", () => {
  const c = comp.verifierCompetition(
    { nom: "Meeting", date: "2026-10-12", discipline: "force", resultats: { squat: "115", bench: "70", deadlift: "140" } },
    { aujourdhui: AUJOURDHUI }
  ).competition;
  const records = comp.recordsBattus(c, { maxisForce: { squat: "110", bench: "70", deadlift: "147.5" } });
  assert.deepEqual(records.map((r) => [r.id, r.ancien, r.nouveau]), [["squat", 110, 115]], "égalité et moins bien ne comptent pas");
  // Sans maxi déclaré, le résultat de compétition devient le maxi.
  assert.equal(comp.recordsBattus(c, { maxisForce: {} }).length, 3);

  const course = comp.verifierCompetition({ nom: "10 km de Paris", date: "2026-10-12", discipline: "course", resultats: { course_10k: "44:10", course_5k: "23:00" } }, { aujourdhui: AUJOURDHUI }).competition;
  const rc = comp.recordsBattus(course, { perfs: { course_10k: { valeur: 2700 }, course_5k: { valeur: 1300 } } });
  assert.deepEqual(rc.map((r) => r.id), ["course_10k"], "44:10 bat 45:00 ; 23:00 ne bat pas 21:40");
});

test("appliquer les records : force par la carte Force athlétique, le reste par Mes performances (marqué compétition)", () => {
  const appels = [];
  const records = [
    { id: "squat", discipline: "force", nouveau: 115 },
    { id: "course_10k", discipline: "course", nouveau: 2650 }
  ];
  comp.appliquerRecords(records, "2026-10-12", (id, v) => appels.push([id, v]));
  assert.deepEqual(appels, [["squat", "115"]]);
  const p = perf.lirePerformances().course_10k;
  assert.equal(p.valeur, 2650);
  assert.equal(p.date, "2026-10-12");
  assert.equal(p.competition, true);
});

test("natation : le bassin se garde dans l'épreuve, les deux se relisent", () => {
  const r = comp.ajouterCompetition({ nom: "Open", date: "2026-10-01", discipline: "natation", resultats: { nat_100nl_25: "1:05,2", nat_100nl_50: "1:08,9" } }, { aujourdhui: AUJOURDHUI });
  assert.equal(r.ok, true);
  assert.equal(comp.lireCompetitions()[0].resultats.nat_100nl_50, 68.9);
  assert.deepEqual(comp.epreuvesCompetition("natation", 50).map((e) => e.id), ["nat_50nl_50", "nat_100nl_50", "nat_400nl_50"]);
});

test("textes : mise à jour des records et ligne du bilan", () => {
  assert.equal(
    T.recordsMaj([{ label: "Squat", type: "kg", ancien: 110, nouveau: 115 }, { label: "Arraché", type: "kg", ancien: null, nouveau: 60 }]),
    "Meilleures performances mises à jour : Squat 110 kg → 115 kg, Arraché 60 kg."
  );
  const c = comp.verifierCompetition(sasie(), { aujourdhui: AUJOURDHUI }).competition;
  const lignes = lignesPerformancesBilan({ competitions: [c], date: AUJOURDHUI });
  assert.equal(lignes.length, 1);
  assert.match(lignes[0], /^Compétition du 12\/10\/2026, Championnat régional : Squat 110 kg, Développé couché 70 kg, Soulevé de terre 147,5 kg · total 327,5 kg$/);
});

test("le bilan ne reprend que les trois compétitions les plus récentes", () => {
  const faire = (n, date) => comp.verifierCompetition(sasie({ nom: n, date }), { aujourdhui: AUJOURDHUI }).competition;
  const liste = [faire("A", "2026-11-01"), faire("B", "2026-10-01"), faire("C", "2026-09-01"), faire("D", "2026-08-01")];
  const lignes = lignesPerformancesBilan({ competitions: liste, date: AUJOURDHUI });
  assert.equal(lignes.length, 3);
  assert.ok(!lignes.some((l) => /, D :/.test(l)));
});

test("câblage : la carte est sous « Mes performances » et le bilan reçoit les compétitions", () => {
  const carte = readFileSync(new URL("../app/src/ui/CartePerformances.jsx", import.meta.url), "utf8");
  assert.match(carte, /<CarteCompetitions[\s\S]*?discipline=\{discipline\}/);
  assert.match(carte, /onDefinirMaxiForce=\{onDefinirMaxiForce\}/);
  const app = readFileSync(new URL("../app/src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /competitions: lireCompetitions\(\)/);
});
