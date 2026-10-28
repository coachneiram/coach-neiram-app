/**
 * Communauté Team Neiram côté app (24 octobre 2026) : lib/communaute.js,
 * lib/stats-disciplines.js, lib/palmares.js, lib/eligibilite-perte.js.
 *
 * Porté de tests/stats-disciplines.test.mjs de l'app publique Neiram et
 * adapté : trois accords distincts, rien de santé ne part (seulement
 * « perte_eligible »), pseudo des défis ou prénom du libellé, jeton client
 * joint à chaque appel, catégories identiques à celles du Worker.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { creerLocalStorage } from "./outils-neiram.mjs";

globalThis.localStorage = creerLocalStorage();
globalThis.__COACH_TEST__ = globalThis.__COACH_TEST__ || {};
await import("../worker/coach-neiram-proxy.js");
const W = globalThis.__COACH_TEST__.COMMUNAUTE;
const m = await import("../app/src/lib/communaute.js");
const { statsDisciplines } = await import("../app/src/lib/stats-disciplines.js");
const palmares = await import("../app/src/lib/palmares.js");
const { perteEligible } = await import("../app/src/lib/eligibilite-perte.js");
const { PROXY_BASE_URL } = await import("../app/src/lib/config.js");

beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

const lire = (c) => readFileSync(new URL("../" + c, import.meta.url), "utf8");
const JETON = "j".repeat(40);
const activer = (libelle = "Sabine P.") => localStorage.setItem("acces_neiram", JSON.stringify({ jeton: JETON, libelle, activeLe: "2026-10-20T00:00:00Z" }));
const AUJ = "2026-10-24";
const HOMME = { sex: "homme", age: 30, heightCm: 178, startWeightKg: 84 };
/** Pesées : 84 kg à 20 % le 1er août, 80 kg à 16 % le 20 octobre. */
const CORPS = [
  { date: "2026-08-01", weightKg: 84, bodyFatPct: 20 },
  { date: "2026-10-20", weightKg: 80, bodyFatPct: 16 }
];

describe("chiffres des disciplines : catégorie mais jamais le poids", () => {
  test("force, haltérophilie, course ; score du mois seulement pour une performance du mois", () => {
    const performances = {
      course_10k: { valeur: 2700, date: "2026-10-05" },
      course_5k: { valeur: 1200, date: "2026-08-01" },
      halt_arrache: { valeur: 90, date: "2026-10-10" },
      halt_epj: { valeur: 115, date: "2026-09-10" }
    };
    const maxis = { squat: "180", bench: "120", deadlift: "220", maj: { squat: "2026-10-20" } };
    const s = statsDisciplines({ date: AUJ, profil: { sex: "homme", age: 30 }, poids: 82.4, maxis, seances: [], performances });
    assert.equal(s.sexe, "h");
    assert.equal(s.pl_total, 520);
    assert.equal(s.cat_pl, "83");
    assert.ok(s.pl_gl > 70 && s.pl_gl < 75, String(s.pl_gl));
    assert.equal(s.score_force, s.pl_gl, "squat noté ce mois");
    assert.equal(s.halt_total, 205);
    assert.equal(s.cat_halt, "85");
    assert.ok(s.score_halt > 0);
    assert.equal(s.course_10k, 2700);
    assert.equal(s.score_course, 58.9, "le 5 km d'août ne compte pas");
    assert.ok(!JSON.stringify(s).includes("82.4"), "le poids n'est jamais publié");
    const ancien = statsDisciplines({ date: "2026-11-02", profil: { sex: "femme" }, poids: 60, maxis: { squat: "100", bench: "55", deadlift: "120", maj: { squat: "2026-10-20" } }, seances: [], performances: {} });
    assert.equal(ancien.score_force, undefined);
    assert.equal(ancien.cat_pl, "63");
  });

  test("la date d'un maxi est notée (App.jsx, definirMaxiForce)", () => {
    assert.match(lire("app/src/App.jsx"), /maj: \{ \.\.\.\(maxisForce\.maj \|\| \{\}\), \[mouvement\]: todayISO\(\) \}/);
  });
});

describe("trois accords : seul ce qui est accepté part", () => {
  const donnees = {
    date: AUJ,
    seances: [{ date: "2026-10-02" }, { date: "2026-10-20" }, { date: "2026-09-30" }, { date: "2026-10-25" }],
    repas: [{ date: "2026-10-21" }, { date: "2026-10-21" }],
    journal: [{ date: "2026-10-22" }, { date: "2026-09-01" }],
    corps: CORPS,
    profil: HOMME,
    maxis: { squat: 180, bench: 120, deadlift: 220 }
  };

  test("profil seul : séances du mois et régularité sur 30 jours", () => {
    const s = m.statsCommunaute({ ...donnees, accords: {} });
    assert.deepEqual(s, { mois: "2026-10", seances_mois: 2, regularite_30: 5 });
  });

  test("disciplines : performances, sexe et catégorie ; jamais le poids", () => {
    const s = m.statsCommunaute({ ...donnees, accords: { disciplines: true } });
    assert.equal(s.pl_total, 520);
    assert.equal(s.cat_pl, "83");
    assert.ok(!("gras_90" in s));
    assert.ok(!/80|84/.test(JSON.stringify({ ...s, pl_total: 0, pl_gl: 0 })), "ni le poids, ni le poids de départ");
  });

  test("transformation : gras perdu en % et perte_eligible, rien d'autre", () => {
    const s = m.statsCommunaute({ ...donnees, accords: { transformation: true }, reglages: {} });
    assert.equal(s.perte_eligible, 1);
    assert.ok(s.gras_90 > 0 && s.gras_90 <= 13);
    assert.ok(!("pl_total" in s));
    for (const interdit of ["weightKg", "bodyFatPct", "situation", "tca", "age", "heightCm"]) assert.ok(!JSON.stringify(s).includes(interdit), interdit);
  });

  test("exclus du classement de perte : la perte ne part pas, la raison non plus", () => {
    const cas = [
      { profil: { ...HOMME, age: 17 }, reglages: {} },
      { profil: { ...HOMME, sex: "femme" }, reglages: { situation: "enceinte-t2" } },
      { profil: { ...HOMME, sex: "femme" }, reglages: { situation: "allaitement" } },
      { profil: HOMME, reglages: { contraintesSante: ["tca"] } },
      { profil: { ...HOMME, heightCm: 210 }, reglages: {} },
      { profil: HOMME, reglages: {}, corps: [{ date: "2026-08-01", weightKg: 84, bodyFatPct: 12 }, { date: "2026-10-20", weightKg: 80, bodyFatPct: 7 }] }
    ];
    for (const c of cas) {
      const s = m.statsCommunaute({ ...donnees, corps: c.corps || CORPS, profil: c.profil, reglages: c.reglages, accords: { transformation: true } });
      assert.equal(s.perte_eligible, 0, JSON.stringify(c));
      assert.ok(!("gras_90" in s) && !("gras_an" in s), JSON.stringify(c));
      assert.ok(!/enceinte|allaitement|tca|17/.test(JSON.stringify(s)), JSON.stringify(s));
    }
  });

  test("les réponses de santé se lisent dans le questionnaire « sur mesure » (cn_objectifs_sur_mesure)", () => {
    assert.equal(perteEligible({ corps: CORPS, profil: { ...HOMME, sex: "femme" } }), true);
    localStorage.setItem("cn_objectifs_sur_mesure", JSON.stringify({ situation: "enceinte-t1" }));
    assert.equal(perteEligible({ corps: CORPS, profil: { ...HOMME, sex: "femme" } }), false);
    const t = m.maTransformation({ corps: CORPS, profil: { ...HOMME, sex: "femme" }, date: AUJ });
    assert.equal(t.eligible, false);
    assert.equal(t.gras, null, "pas de perte sur le mur");
    // Le profil enregistré n'est pas modifié.
    assert.equal(localStorage.getItem("coach_profile"), null);
  });

  test("ma transformation pour le mur : gras et muscle comptés, plafonnés", () => {
    const t = m.maTransformation({ corps: CORPS, profil: HOMME, date: AUJ, reglages: {} });
    assert.equal(t.eligible, true);
    assert.ok(t.gras > 0);
    assert.equal(t.t.jours, 80);
  });
});

describe("catégories identiques à celles du Worker", () => {
  test("mêmes identifiants, même ordre de tri, mêmes filtres", () => {
    assert.deepEqual(m.CATEGORIES_COMMUNAUTE.map((c) => c.id).sort(), Object.keys(W.CATEGORIES).sort());
    for (const c of m.CATEGORIES_COMMUNAUTE) {
      const w = W.CATEGORIES[c.id];
      assert.equal(c.ordre || "desc", w.ordre || "desc", c.id);
      assert.deepEqual(c.filtres || [], w.filtres || [], c.id);
      const accord = m.GROUPES_DISCIPLINES.includes(c.groupe) ? "disc" : c.groupe === m.GROUPE_TRANSFORMATION ? "transfo" : "profil";
      assert.equal(accord, w.accord, c.id);
    }
    assert.deepEqual(m.GROUPES_COMMUNAUTE, ["Régularité", "Force athlé", "Haltéro", "Course", "Natation", "Transformation"]);
    assert.ok(!m.CATEGORIES_COMMUNAUTE.some((c) => /parrain|salle/.test(c.id)));
  });
});

describe("pseudo", () => {
  test("celui des défis, sinon le prénom du libellé ; jamais le libellé complet", () => {
    activer("Sabine P.");
    assert.equal(m.pseudoPropose(), "Sabine");
    localStorage.setItem("cn_defis_pseudo", JSON.stringify("Sab la Fusée"));
    assert.equal(m.pseudoPropose(), "Sab la Fusée");
    assert.equal(m.erreurPseudo("ab"), m.ERREURS_COMMUNAUTE["pseudo-longueur"]);
    assert.equal(m.erreurPseudo("Sab<3"), m.ERREURS_COMMUNAUTE["pseudo-caracteres"]);
    assert.equal(m.erreurPseudo("Sabine"), null);
  });
});

describe("appels au Worker du coach", () => {
  function faux(reponses = {}) {
    const appels = [];
    return {
      appels,
      env: {
        localStorage: globalThis.localStorage,
        fetch: async (url, init) => {
          const chemin = url.slice(PROXY_BASE_URL.length);
          appels.push({ chemin, corps: JSON.parse(init.body), auth: init.headers.Authorization });
          const r = reponses[chemin] || { ok: true };
          return { ok: r.ok !== false, json: async () => r };
        }
      }
    };
  }

  test("sans code d'accès, pas de communauté", () => {
    assert.equal(m.communautePossible(), false);
    activer();
    assert.equal(m.communautePossible(), true);
  });

  test("jeton joint ; profil retenu ; accord changé ; suppression", async () => {
    activer();
    const f = faux({
      "/communaute/profil": { ok: true, profil: { pseudo: "Sabine", masque: false, disciplines: false, transformation: false } },
      "/communaute/accord": { ok: true, profil: { pseudo: "Sabine", masque: false, disciplines: true, transformation: false } },
      "/communaute/supprimer": { ok: true, profil: null }
    });
    await m.creerProfil({ pseudo: "Sabine", stats: { seances_mois: 2 } }, f.env);
    assert.equal(f.appels[0].auth, "Bearer " + JETON);
    assert.deepEqual(f.appels[0].corps, { pseudo: "Sabine", accord: true, stats: { seances_mois: 2 } });
    assert.equal(m.lireCommunaute().pseudo, "Sabine");
    await m.changerAccord("disciplines", true, f.env);
    assert.deepEqual(f.appels[1].corps, { type: "disciplines", oui: true });
    assert.equal(m.lireCommunaute().disciplines, true);
    await m.supprimerProfil(f.env);
    assert.equal(m.lireCommunaute().pseudo, null);
    assert.equal(m.lireCommunaute().disciplines, false);
  });

  test("publication : seulement avec un profil, si les chiffres changent, au plus toutes les 30 minutes", async () => {
    activer();
    const f = faux();
    assert.equal(await m.publierSiBesoin({ stats: { a: 1 }, maintenant: 0 }, f.env), false, "pas de profil");
    m.retenirProfil({ pseudo: "Sabine", disciplines: false, transformation: false });
    assert.equal(await m.publierSiBesoin({ stats: { a: 1 }, maintenant: 1000 }, f.env), true);
    assert.equal(await m.publierSiBesoin({ stats: { a: 1 }, maintenant: 1000 + 31 * 60000 }, f.env), false, "inchangés");
    assert.equal(await m.publierSiBesoin({ stats: { a: 2 }, maintenant: 1000 + 60000 }, f.env), false, "trop tôt");
    assert.equal(await m.publierSiBesoin({ stats: { a: 2 }, maintenant: 1000 + 60000, force: true }, f.env), true, "accord donné : tout de suite");
    assert.equal(f.appels.length, 2);
  });

  test("profil effacé ailleurs (supprimé, accès révoqué) : oublié sur le téléphone", async () => {
    activer();
    m.retenirProfil({ pseudo: "Sabine", disciplines: true, transformation: false });
    const f = faux({ "/communaute/stats": { ok: false, error: "profil-requis" } });
    assert.equal(await m.publierSiBesoin({ stats: { a: 3 }, maintenant: 0 }, f.env), false);
    assert.equal(m.lireCommunaute().pseudo, null);
  });
});

describe("palmarès et trophées", () => {
  test("rang noté à partir de 5 classés (groupe d'une quinzaine) ; titres ajoutés, jamais perdus", () => {
    assert.equal(palmares.CLASSES_MINIMUM_TOP, 5);
    palmares.noterRang(1, 4);
    assert.equal(palmares.lirePalmares().meilleurTop, 0, "moins de 5 classés : rien");
    palmares.noterRang(2, 5);
    assert.equal(palmares.lirePalmares().meilleurTop, 60, "2e sur 5 : top 40 %");
    palmares.noterRang(3, 40);
    assert.equal(palmares.lirePalmares().meilleurTop, 92, "top 8 %");
    palmares.noterRang(30, 40);
    assert.equal(palmares.lirePalmares().meilleurTop, 92, "on garde le meilleur");
    palmares.retenirTitres([{ mois: "2026-09", discipline: "course", rang: 1 }, { mois: "2026-10", discipline: "force", rang: 3 }, { mois: "x", discipline: "y", rang: 9 }], [{ annee: "2025", discipline: "force", rang: 1 }]);
    // Accord « disciplines » retiré : le serveur ne renvoie plus rien, les titres restent.
    palmares.retenirTitres([], []);
    assert.deepEqual(palmares.compteursPalmares(), { topClassement: 92, podiums: 2, athleteMois: 1, athleteAnnee: 1 });
  });
});

describe("écran : accès depuis Séances, textes en constantes", () => {
  test("carte « Team Neiram » sous « Mes performances », données passées", () => {
    const e = lire("app/src/ecrans/Entrainements.jsx");
    assert.match(e, /<CarteCommunaute seances=\{sessionsApi\.items\} repas=\{repas \|\| \[\]\} journal=\{journal \|\| \[\]\} corps=\{corps \|\| \[\]\} profil=\{profile\} maxis=\{maxisForce\} \/>/);
    assert.match(lire("app/src/App.jsx"), /repas=\{logEntries\}/);
  });

  test("trois accords séparés, retirables, et la suppression totale", () => {
    const ui = lire("app/src/ui/EcranCommunaute.jsx") + lire("app/src/ui/OngletClassements.jsx") + lire("app/src/ui/OngletTransformations.jsx");
    for (const motif of [/data-accord-profil/, /type="disciplines"|typeAccord/, /type="transformation"/, /accorder\("disciplines", false\)/, /accorder\("transformation", false\)/, /supprimerProfil\(\)/]) assert.match(ui, motif);
    assert.equal(m.TEXTES_COMMUNAUTE.supprimer, "Supprimer mon profil de la communauté");
  });

  test("pas de photo, pas de poids envoyés par le mur", () => {
    const ui = lire("app/src/ui/OngletTransformations.jsx");
    assert.ok(!/photo|canvas|weightKg/i.test(ui.replace(/\/\*[\s\S]*?\*\//g, "")));
    assert.match(ui, /publierTransformation\(\{ periode: periode === "j90" \? "90" : "an", jours: m\.t\.jours, gras: m\.gras, muscle: m\.muscle, perte_eligible: m\.eligible \? 1 : 0, texte \}\)/);
  });

  test("clé de stockage cn_ (dans la sauvegarde), pas de secret", () => {
    assert.equal(m.CLE_COMMUNAUTE, "cn_communaute");
    assert.equal(palmares.CLE_PALMARES, "cn_palmares");
    assert.ok(!/ADMIN_SECRET|Bearer [A-Za-z0-9]/.test(lire("app/src/lib/communaute.js")));
  });
});

describe("classement relu après la publication d'un score (28 octobre 2026)", () => {
  // Le client qui rejoint un classement publie son score ; la liste lue avant
  // (ou pendant) la publication ne le contenait pas, et restait ainsi.
  // La fumée fumee-communaute (étape 10) le vérifie dans un navigateur, avec
  // une publication retardée de 1,5 s.
  test("l'écran compte les publications et les passe aux onglets", () => {
    const ecran = lire("app/src/ui/EcranCommunaute.jsx");
    assert.match(ecran, /setVersionScores\(\(v\) => v \+ 1\)/);
    assert.match(ecran, /versionScores=\{versionScores\}/);
    assert.match(ecran, /if \(await publierSiBesoin\(\{ stats: statsActuelles\(\), force: true \}\)\) setVersionScores/, "accord donné");
    assert.match(ecran, /publierSiBesoin\(\{ stats: statsActuelles\(\) \}\)\.then\(\(publie\) => \{/, "ouverture de la fenêtre");
  });

  test("le classement et le podium sont relus quand le compteur change", () => {
    const onglet = lire("app/src/ui/OngletClassements.jsx");
    assert.match(onglet, /\}, \[categorie, cleFiltres, accord, versionScores\]\);/);
    assert.match(onglet, /if \(versionScores\) setPodiums\(null\);/);
  });
});
