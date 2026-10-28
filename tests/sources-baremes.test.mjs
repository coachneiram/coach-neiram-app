/**
 * Registre des sources de barèmes et veille hebdomadaire (28 octobre 2026) :
 * calendrier, phrases affichées dans l'app, contrôleur testé avec de faux
 * sites, structure du workflow GitHub.
 *
 * Aucun test n'interroge un vrai site : les adresses des fédérations ne
 * sont joignables que depuis GitHub, et un test qui dépend d'un site tiers
 * échoue le jour où le site change. Le contrôleur est donc vérifié contre de
 * fausses réponses ; sa première vraie exécution est celle du workflow.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const R = await import("../app/src/lib/sources-baremes.js");
const V = await import("../scripts-donnees/verifier-sources.mjs");
const { SAISON_FFFORCE } = await import("../app/src/lib/grille-ffforce.js");
const { niveauFFHM } = await import("../app/src/lib/niveaux.js");
const lire = (c) => readFileSync(new URL("../" + c, import.meta.url), "utf8");

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DISCIPLINES = ["force", "halterophilie", "course", "natation"];

describe("registre", () => {
  test("chaque source est complète et ses adresses sont sûres", () => {
    const ids = new Set();
    for (const s of R.SOURCES_BAREMES) {
      assert.ok(!ids.has(s.id), `identifiant en double : ${s.id}`);
      ids.add(s.id);
      assert.ok(DISCIPLINES.includes(s.discipline), `${s.id} : discipline`);
      for (const champ of ["court", "organisme", "libelle", "saison", "echeanceNote"]) assert.ok(typeof s[champ] === "string" && s[champ], `${s.id} : ${champ}`);
      assert.match(s.releveLe, ISO);
      assert.ok(s.echeance ? ISO.test(s.echeance) : s.verifierTousLesJours > 0, `${s.id} : échéance ou cadence de revue`);
      assert.ok(R.echeanceDe(s) >= s.releveLe, `${s.id} : échéance avant le relevé`);
      for (const u of [...s.pages, ...s.documentsConnus]) assert.match(u, /^https:\/\//, `${s.id} : adresse non sécurisée ${u}`);
      for (const sonde of s.sondes) {
        assert.match(sonde.modele, /^https:\/\//);
        assert.match(sonde.modele, /\{an\}/);
      }
    }
  });

  test("chaque discipline de « Mes performances » a au moins une source", () => {
    for (const d of DISCIPLINES) assert.ok(R.SOURCES_BAREMES.some((s) => s.discipline === d), d);
  });

  test("la saison du registre est celle des données", () => {
    assert.equal(R.sourceParId("ffforce-niveaux").saison, SAISON_FFFORCE);
    const n = niveauFFHM({ sexe: "homme", age: 30, poids: 80, valeur: 300 });
    assert.equal(n.saison, R.sourceParId("ffhm-series").saison, "le niveau FFHM affiche la saison du registre");
  });
});

describe("calendrier", () => {
  const source = { id: "x", court: "X", releveLe: "2026-10-24", echeance: "2026-12-31" };
  test("ok, bientôt, périmée", () => {
    assert.equal(R.etatSource(source, "2026-10-28").etat, "ok");
    assert.equal(R.etatSource(source, "2026-11-16").etat, "bientot", "45 jours avant");
    assert.equal(R.etatSource(source, "2026-12-31").etat, "bientot", "le jour même");
    assert.equal(R.etatSource(source, "2027-01-01").etat, "perimee");
    assert.equal(R.etatSource(source, "2027-01-01").joursRestants, -1);
  });
  test("préavis propre à la source", () => {
    assert.equal(R.etatSource(source, "2026-10-02").etat, "ok");
    assert.equal(R.etatSource({ ...source, preavisJours: 90 }, "2026-10-02").etat, "bientot");
  });
  test("sans date de fin : relevé + cadence de revue", () => {
    assert.equal(R.echeanceDe({ releveLe: "2026-10-24", verifierTousLesJours: 90 }), "2027-01-22");
    assert.equal(R.echeanceDe({ releveLe: "2026-10-24", verifierTousLesJours: 365 }), "2027-10-24");
  });
  test("aujourd'hui, 28/10/2026 : tout est valable ; le 16/11, cinq sources entrent dans leur préavis ; la FFForce, revue chaque mois, passe en retard le 24/11", () => {
    assert.deepEqual(R.sourcesATraiter("2026-10-28"), []);
    assert.deepEqual(R.sourcesATraiter("2026-11-15"), []);
    assert.deepEqual(R.sourcesATraiter("2026-11-16").map((x) => x.source.id).sort(), ["ffa-minima-france", "ffforce-niveaux", "ffn-qualifications", "ipf-categories-gl", "world-aquatics-points"]);
    const retard = R.sourcesATraiter("2026-11-24");
    assert.equal(retard[0].source.id, "ffforce-niveaux");
    assert.equal(retard[0].etat, "perimee");
    assert.ok(retard.slice(1).every((x) => x.etat === "bientot"));
  });
  test("à l'approche de 2027, les sources de l'année glissent dans la liste, la plus en retard d'abord", () => {
    const ids = R.sourcesATraiter("2027-01-05").map((x) => x.source.id);
    assert.equal(ids[0], "ffforce-niveaux");
    assert.ok(ids.includes("ffn-qualifications") && ids.includes("world-aquatics-points") && ids.includes("ffa-minima-france") && !ids.includes("ffhm-series"));
  });
  test("sondes : aucune tant que la source est à jour, puis l'année suivante", () => {
    const ffa = R.sourceParId("ffa-minima-france");
    assert.deepEqual(R.sondesDuJour(ffa, "2026-10-28"), []);
    assert.deepEqual(R.sondesDuJour(ffa, "2026-12-01"), ["https://www.athle.fr/Reglement/livret_2027_running.pdf"]);
    const ffhm = R.sourceParId("ffhm-series");
    assert.deepEqual(R.sondesDuJour(ffhm, "2027-05-01"), []);
    const juin = R.sondesDuJour(ffhm, "2027-06-10");
    assert.equal(juin.length, 4);
    assert.ok(juin.every((u) => /2027\/0[6-9]\/Reglement-sport-halterophilie-2027-2028\.pdf$/.test(u)));
  });
});

describe("ce que l'app dit", () => {
  test("source et date de relevé, sans avertissement quand tout est valable", () => {
    const r = R.resumeSourcesDiscipline("halterophilie", "2026-10-28");
    assert.equal(r.texte, "Barèmes relevés le 24/10/2026 : FFHM 2026-2027, IWF 2026 et Sinclair 2025-2028.");
    assert.equal(r.avertissement, null);
  });
  test("relevé trop ancien : avertissement prudent (« a pu paraître »), jamais d'affirmation", () => {
    const r = R.resumeSourcesDiscipline("force", "2026-12-01");
    assert.equal(r.texte, "Barèmes relevés le 24/10/2026 : FFForce 2025-2026 (V03-1) et IPF 2026.");
    assert.equal(r.avertissement, "Une nouvelle édition a pu paraître depuis (FFForce 2025-2026 (V03-1)). Avant une compétition, vérifie sur le site de la fédération.");
    assert.equal(R.resumeSourcesDiscipline("force", "2026-10-28").avertissement, null);
  });
  test("discipline sans source : rien", () => {
    assert.equal(R.resumeSourcesDiscipline("yoga", "2026-10-28"), null);
  });
  test("l'avertissement s'étend quand d'autres échéances passent", () => {
    const r = R.resumeSourcesDiscipline("natation", "2027-01-05");
    assert.match(r.avertissement, /FFN 2026 et World Aquatics 2026/);
  });
});

describe("contrôleur : liens et documents", () => {
  const html = `
    <a href="/medias/Niveaux-2026-2027.pdf">Niveaux 2026-2027</a>
    <a href="https://exemple.fr/doc/Minima%20Force.xlsx?v=2">Minima  <b>Force</b></a>
    <a href="/medias/Planning-stage.pdf">Planning du stage</a>
    <a href="/page.html">Une page</a>
    <a href="/medias/Niveaux-2025-2026.pdf">déjà connu</a>`;
  const source = { motsCles: ["niveau", "minima"], documentsConnus: ["https://exemple.fr/medias/Niveaux-2025-2026.pdf"] };

  test("ne garde que les documents, en adresse absolue", () => {
    const liens = V.liensDocuments(html, "https://exemple.fr/liste");
    assert.deepEqual(liens.map((l) => l.url), [
      "https://exemple.fr/medias/Niveaux-2026-2027.pdf",
      "https://exemple.fr/doc/Minima%20Force.xlsx?v=2",
      "https://exemple.fr/medias/Planning-stage.pdf",
      "https://exemple.fr/medias/Niveaux-2025-2026.pdf"
    ]);
    assert.equal(liens[1].texte, "Minima Force");
  });
  test("candidats : mot-clé trouvé sans tenir compte des accents ni de la casse, document connu écarté", () => {
    const c = V.candidats(V.liensDocuments(html, "https://exemple.fr/liste"), source);
    assert.deepEqual(c.map((l) => l.url), ["https://exemple.fr/medias/Niveaux-2026-2027.pdf", "https://exemple.fr/doc/Minima%20Force.xlsx?v=2"]);
    assert.equal(V.candidats([{ url: "https://x.fr/Réglement.pdf", texte: "" }], { motsCles: ["reglement"], documentsConnus: [] }).length, 1);
  });
});

/** Faux « fetch » : une table adresse -> réponse. */
function fauxSite(table) {
  return async (url, init = {}) => {
    const rep = table[url];
    if (rep === "panne") throw new Error("réseau coupé");
    const r = rep || { status: 404 };
    return {
      status: r.status,
      headers: { get: (n) => (n.toLowerCase() === "last-modified" ? r.modifie || null : null) },
      text: async () => r.corps || "",
      body: { cancel: async () => {} },
      methode: init.method
    };
  };
}

describe("contrôleur : une source", () => {
  const base = { id: "t", court: "Test 2026", releveLe: "2026-10-24", echeance: "2027-08-31", echeanceNote: "n", pages: [], documentsConnus: [], motsCles: ["niveau"], sondes: [] };
  const jour = "2026-11-02";

  test("document inchangé depuis le relevé : rien à faire", async () => {
    const s = { ...base, documentsConnus: ["https://f.fr/a.pdf"] };
    const r = await V.verifierSource(s, { aujourdhui: jour, fetchImpl: fauxSite({ "https://f.fr/a.pdf": { status: 200, modifie: "Mon, 05 Oct 2026 08:00:00 GMT" } }) });
    assert.deepEqual(r.actions, []);
    assert.equal(r.incomplet, false);
  });
  test("document modifié après le relevé : à relire", async () => {
    const s = { ...base, documentsConnus: ["https://f.fr/a.pdf"] };
    const r = await V.verifierSource(s, { aujourdhui: jour, fetchImpl: fauxSite({ "https://f.fr/a.pdf": { status: 200, modifie: "Fri, 30 Oct 2026 08:00:00 GMT" } }) });
    assert.equal(r.actions.length, 1);
    assert.match(r.actions[0], /Document modifié le 30\/10\/2026, après le relevé du 24\/10\/2026/);
  });
  test("document disparu de son adresse (404)", async () => {
    const s = { ...base, documentsConnus: ["https://f.fr/a.pdf"] };
    const r = await V.verifierSource(s, { aujourdhui: jour, fetchImpl: fauxSite({}) });
    assert.match(r.actions[0], /n'est plus à cette adresse \(404\)/);
  });
  test("HEAD refusé (405) : repli sur GET", async () => {
    const appels = [];
    const f = async (url, init) => {
      appels.push(init.method);
      return init.method === "HEAD" ? { status: 405, headers: { get: () => null } } : { status: 200, headers: { get: () => null }, body: { cancel: async () => {} } };
    };
    const e = await V.etatDocument(f, "https://f.fr/a.pdf");
    assert.equal(e.statut, "ok");
    assert.deepEqual(appels, ["HEAD", "GET"]);
  });
  test("site en panne : « non vérifié », jamais « rien à faire » en silence", async () => {
    const s = { ...base, documentsConnus: ["https://f.fr/a.pdf"], pages: ["https://f.fr/liste"] };
    const r = await V.verifierSource(s, { aujourdhui: jour, fetchImpl: fauxSite({ "https://f.fr/a.pdf": "panne", "https://f.fr/liste": { status: 403 } }) });
    assert.equal(r.incomplet, true);
    assert.deepEqual(r.actions, []);
  });
  test("nouveau document sur la page de la fédération", async () => {
    const s = { ...base, pages: ["https://f.fr/liste"], documentsConnus: ["https://f.fr/medias/ancien.pdf"] };
    const corps = '<a href="/medias/Niveaux-2026-2027.pdf">Niveaux 2026-2027</a><a href="/medias/ancien.pdf">Niveaux</a><a href="/medias/autre.pdf">Stage</a>';
    const r = await V.verifierSource(s, { aujourdhui: jour, fetchImpl: fauxSite({ "https://f.fr/liste": { status: 200, corps }, "https://f.fr/medias/ancien.pdf": { status: 200 } }) });
    assert.equal(r.actions.length, 1);
    assert.match(r.actions[0], /Nouveau document sur https:\/\/f\.fr\/liste : « Niveaux 2026-2027 » https:\/\/f\.fr\/medias\/Niveaux-2026-2027\.pdf/);
  });
  test("saison finie : action de calendrier, et sonde de la nouvelle édition", async () => {
    const s = { ...base, echeance: "2026-10-01", sondes: [{ modele: "https://f.fr/livret_{an}.pdf", decalage: 1 }] };
    const r = await V.verifierSource(s, { aujourdhui: jour, fetchImpl: fauxSite({ "https://f.fr/livret_2027.pdf": { status: 200 } }) });
    assert.match(r.actions[0], /L'échéance du 01\/10\/2026 est passée/);
    assert.match(r.actions[1], /Nouvelle édition trouvée : https:\/\/f\.fr\/livret_2027\.pdf/);
  });
  test("hors ligne : calendrier seul, aucune requête", async () => {
    const f = async () => assert.fail("aucune requête attendue");
    const s = { ...base, echeance: "2026-10-01", documentsConnus: ["https://f.fr/a.pdf"] };
    const r = await V.verifierSource(s, { aujourdhui: jour, fetchImpl: f, enLigne: false });
    assert.equal(r.actions.length, 1);
  });
});

describe("contrôleur : rapport", () => {
  test("rien à faire : phrase claire, drapeaux éteints", async () => {
    const rs = await V.verifierSources({ aujourdhui: "2026-10-28", enLigne: false });
    const r = V.construireRapport(rs, "2026-10-28", { enLigne: false });
    assert.equal(r.aAgir, false);
    assert.equal(r.incomplet, false);
    assert.match(r.markdown, /Rien à faire : tous les barèmes sont à jour/);
    assert.match(r.markdown, /Contrôle hors ligne/);
  });
  test("le 24/11/2026 avec le vrai registre : la FFForce en retard et quatre échéances proches, tableau de toutes les sources", async () => {
    const rs = await V.verifierSources({ aujourdhui: "2026-11-24", enLigne: false });
    const r = V.construireRapport(rs, "2026-11-24", { enLigne: false });
    assert.equal(r.aAgir, true);
    assert.match(r.markdown, /\*\*5 jeux de données à vérifier ou à mettre à jour\.\*\*/);
    assert.match(r.markdown, /Échéance le 31\/12\/2026 \(dans 37 jours\) : la nouvelle édition est attendue\./);
    assert.match(r.markdown, /## FFForce 2025-2026 \(V03-1\)\n\n- \[ \] L'échéance du 23\/11\/2026 est passée/);
    assert.equal((r.markdown.match(/^\| /gm) || []).length, R.SOURCES_BAREMES.length + 1, "une ligne par source et l'en-tête");
  });
  test("sites inaccessibles sans autre changement : la demande s'ouvre quand même, avec la raison", async () => {
    const source = { ...R.SOURCES_BAREMES.find((s) => s.id === "ffhm-series") };
    const rs = await V.verifierSources({ aujourdhui: "2026-10-28", sources: [source], fetchImpl: fauxSite({ [source.documentsConnus[0]]: { status: 503 } }) });
    const r = V.construireRapport(rs, "2026-10-28");
    assert.equal(r.aAgir, false);
    assert.equal(r.incomplet, true);
    assert.match(r.markdown, /Aucun changement détecté, mais 1 source n'ont pas pu être consultées/);
    assert.match(r.markdown, /## Non vérifiés \(site inaccessible\)\n\n- FFHM 2026-2027 : .*\(503\)/);
  });
});

describe("workflow de veille", () => {
  const yml = lire(".github/workflows/baremes.yml");
  test("hebdomadaire, lançable à la main, droits minimaux", () => {
    assert.match(yml, /schedule:\s*\n\s*#[^\n]*\n\s*- cron: "17 5 \* \* 1"/);
    assert.match(yml, /workflow_dispatch:/);
    assert.match(yml, /permissions:\s*\n\s*contents: read\s*\n\s*issues: write/);
    assert.ok(!/secrets\./.test(yml), "aucun secret nécessaire");
  });
  test("lance le contrôleur et gère la demande : ouvrir, mettre à jour, fermer", () => {
    assert.match(yml, /node scripts-donnees\/verifier-sources\.mjs --rapport rapport-baremes\.md/);
    for (const cmd of ["gh issue create", "gh issue edit", "gh issue close"]) assert.ok(yml.includes(cmd), cmd);
    assert.match(yml, /OUVRIR: \$\{\{ steps\.veille\.outputs\.ouvrir \}\}/);
  });
  test("le contrôleur écrit les sorties lues par le workflow", () => {
    const src = lire("scripts-donnees/verifier-sources.mjs");
    for (const sortie of ["a_agir=", "incomplet=", "ouvrir="]) assert.ok(src.includes(sortie), sortie);
  });
});
