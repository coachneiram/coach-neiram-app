/**
 * Feu Vert : accès restreint et pré-réglage (demande de Marien du 25/11/2026).
 *
 * « Ceux qui ont accès à l'application Feu Vert : uniquement l'onglet Feu
 * Vert, réglages pré-réglés, pas accès aux autres fonctionnalités. »
 *
 * Vérifié ici, sans navigateur : un seul onglet et le garde-fou central ;
 * aucun point d'entrée vers un autre écran (raccourcis, notifications,
 * « Quoi de neuf », filet d'erreur, rappels) ; réglages verrouillés (parcours
 * choisi une fois tant que Marien ne l'a pas fixé) ; profil créé par le code
 * d'un membre inscrit seulement ; Aide et guide Feu Vert seuls. Le parcours
 * complet dans un navigateur : scripts-migration/fumee-feu-vert.mjs.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (c) => readFileSync(join(ICI, "..", c), "utf8");
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const magasin = new Map();
globalThis.localStorage = {
  getItem: (k) => (magasin.has(k) ? magasin.get(k) : null),
  setItem: (k, v) => magasin.set(k, String(v)),
  removeItem: (k) => magasin.delete(k),
  key: (i) => [...magasin.keys()][i] ?? null,
  get length() {
    return magasin.size;
  }
};

const FV = await import("../app/src/lib/feu-vert.js");
const { ONGLETS, ongletsPour, ongletPermis } = await import("../app/src/lib/onglets.js");
const { CLE_ACCES } = await import("../app/src/lib/acces.js");
const { nouveautesPour, NOUVEAUTES } = await import("../app/src/lib/nouveautes.js");
const { planningRappels } = await import("../app/src/lib/push.js");
const { TUTOS, tutosParOnglet, tutoPrincipal } = await import("../app/src/lib/tutos.js");
const { AIDE_FEU_VERT, aidePersonnalisee } = await import("../app/src/lib/aide.js");

const JETON = "j".repeat(43);
const FEU_VERT = { name: "Léa", formule: "feuvert", feuVert: { cohorte: "1" } };

let appels;
function reseau(reponses) {
  appels = [];
  globalThis.fetch = async (url, init) => {
    appels.push({ url: String(url), corps: JSON.parse(init.body || "{}") });
    const r = reponses.shift();
    if (r instanceof Error) throw r;
    return { ok: (r.status || 200) < 400, status: r.status || 200, json: async () => r.json };
  };
}
beforeEach(() => magasin.clear());

describe("un seul onglet, et le garde-fou central", () => {
  test("Feu Vert : l'onglet « feuvert » seul ; les autres formules gardent leurs 7 onglets", () => {
    assert.deepEqual(ongletsPour(FEU_VERT).map((o) => o.id), ["feuvert"]);
    assert.equal(ongletsPour({ formule: "" }), ONGLETS);
    assert.equal(ONGLETS.length, 7);
  });

  test("tout onglet demandé par un profil Feu Vert ramène à « feuvert »", () => {
    for (const o of [...ONGLETS.map((x) => x.id), "feuvert", "coachia", "inconnu", undefined, null]) {
      assert.equal(ongletPermis(FEU_VERT, o), "feuvert", String(o));
    }
    assert.equal(ongletPermis({}, "repas"), "repas");
    assert.equal(ongletPermis({}, "feuvert"), "entrainements", "un client individuel n'ouvre pas Feu Vert");
  });

  test("App.jsx : l'onglet affiché passe par ongletPermis, l'état y est ramené", () => {
    const app = lire("app/src/App.jsx");
    assert.match(app, /const ongletActif = ongletPermis\(profile, ongletChoisi\);/);
    assert.match(app, /if \(ongletChoisi !== ongletActif\) setOngletActif\(ongletActif\);/);
  });

  test("la coque n'affiche ni barre du bas ni menu d'onglets pour un seul onglet", () => {
    const coque = lire("app/src/ui/Coque.jsx");
    assert.match(coque, /const plusieurs = onglets\.length > 1;/);
    assert.match(coque, /\{plusieurs && \(\s*<nav className="bottom-nav">/);
    assert.match(coque, /\{plusieurs && onglets\.map/);
    assert.match(lire("app/src/styles.css"), /\.app-shell\.onglet-unique \.main-content\s*\{[^}]*safe-area-inset-bottom/);
  });
});

describe("aucun autre point d'entrée", () => {
  const app = sansCommentaires(lire("app/src/App.jsx"));

  test("raccourcis et notifications (?raccourci=…, clic sur une notification) : ignorés", () => {
    assert.match(app, /gererRaccourci\.current = async \(action\) => \{\s*if \(feuVertActif\(profile\)\) return;/);
  });

  test("rappels, alertes, communauté : coupés en Feu Vert", () => {
    const gardes = app.match(/!profile \|\| feuVertActif\(profile\)\)/g) || [];
    assert.ok(gardes.length >= 4, "rappels, alertes coach, pesées, communauté : " + gardes.length);
    assert.match(app, /!targets \|\| feuVertActif\(profile\)\) return;\s*verifierAlerteNutrition/);
  });

  test("le filet d'erreur ne propose pas le Journal ; les réglages et le guide sont ceux de Feu Vert", () => {
    assert.match(app, /onRetourJournal=\{feuVert \? undefined :/);
    assert.match(app, /\{feuVert \? \(\s*<ReglagesFeuVert/);
    assert.match(app, /<Tutos vue=\{vueTutos\} onClose=\{\(\) => setVueTutos\(null\)\} feuVert=\{feuVert\} \/>/);
  });

  test("« Quoi de neuf » : aucune annonce ; push : aucun rappel programmé", () => {
    assert.deepEqual(nouveautesPour(FEU_VERT), []);
    assert.ok(nouveautesPour({}).length > 0 && nouveautesPour({}).length <= NOUVEAUTES.length);
    const profil = { ...FEU_VERT, slots: [{ id: "s1", day: "mon", time: "18:00" }], coachingMode: "enligne" };
    assert.deepEqual(planningRappels({ profil, maintenant: new Date("2027-01-17T08:00:00Z") }), []);
  });

  test("l'écran Feu Vert ne renvoie vers aucun autre onglet", () => {
    const ecran = sansCommentaires(lire("app/src/ecrans/FeuVert.jsx"));
    assert.ok(!/onAller|setOngletActif|poserIntention|raccourci=/.test(ecran));
    assert.ok(!/LienTuto id=/.test(ecran), "aucun tuto d'un autre écran");
  });

  test("guide : le tuto Feu Vert seul pour un membre, jamais pour les autres", () => {
    assert.equal(tutoPrincipal("feuvert").id, "feuvert");
    assert.deepEqual(tutosParOnglet({ feuVert: true }).flatMap((g) => g.tutos.map((t) => t.id)), ["feuvert"]);
    assert.ok(!tutosParOnglet({ feuVert: false }).some((g) => g.id === "feuvert"));
    assert.equal(tutosParOnglet().flatMap((g) => g.tutos).length, TUTOS.length);
  });

  test("Aide : seulement les questions Feu Vert, chaque bouton cité existe", () => {
    assert.equal(aidePersonnalisee({ feuVert: true, objectifCalories: 2000 }), AIDE_FEU_VERT);
    const questions = AIDE_FEU_VERT.flatMap((s) => s.questions);
    assert.equal(new Set(questions.map((q) => q.id)).size, questions.length);
    const tout = JSON.stringify(AIDE_FEU_VERT);
    for (const interdit of ["Nutrition", "Tendances", "Mes plats", "kcal", "WhatsApp", "Exporter mes données"]) assert.ok(!tout.includes(interdit), interdit);
    const sources = ["app/src/lib/textes-feu-vert.js", "app/src/lib/feu-vert.js", "app/src/lib/acces.js", "app/src/ecrans/Reglages.jsx"].map(lire).join("\n");
    for (const q of questions) for (const l of q.libelles) assert.ok(sources.includes(l), `« ${l} » (${q.id})`);
  });
});

describe("réglages pré-réglés et verrouillés", () => {
  const reglages = sansCommentaires(lire("app/src/ecrans/ReglagesFeuVert.jsx"));

  test("lecture seule : ni formule, ni cohorte, ni date, ni poids, ni sauvegarde, ni rappels", () => {
    assert.ok(!/ChampsProfil|data-formule|data-cohorte|data-debut-cohorte|type="date"|exporterSauvegarde|restaurer|BlocRappel|startWeightKg|CartePlateforme/.test(reglages));
    for (const a of ["data-lecture-formule", "data-lecture-cohorte", "data-lecture-debut", "data-lecture-parcours"]) assert.ok(reglages.includes(a), a);
    // Champs modifiables : le prénom (et le code d'accès, dans CarteAcces).
    assert.equal((reglages.match(/<TextInput/g) || []).length, 1);
    assert.match(reglages, /<CarteAcces textes=\{T\.acces\} onActive=\{accesActive\} \/>/);
  });

  test("parcours : choisi une fois tant que Marien ne l'a pas fixé", () => {
    const neuf = FV.profilFeuVert({}, { cohorte: "1", parcours: null, debut: "2027-01-18" });
    assert.equal(FV.peutChoisirParcours(neuf), true);
    assert.equal(FV.reglagesFeuVert(neuf).parcours, "reprise", "Reprise par défaut");
    const choisi = FV.choisirParcours(neuf, "basesplus");
    assert.equal(choisi.feuVert.parcours, "basesplus");
    assert.equal(FV.peutChoisirParcours(choisi), false);
    assert.equal(FV.choisirParcours(choisi, "reprise"), choisi, "pas de second choix");
    assert.equal(FV.choisirParcours(neuf, "expert"), neuf, "valeur inconnue refusée");
    const fixe = FV.profilFeuVert({}, { cohorte: "1", parcours: "reprise", debut: null });
    assert.equal(FV.peutChoisirParcours(fixe), false);
    assert.equal(FV.choisirParcours(fixe, "basesplus"), fixe);
    assert.equal(FV.peutChoisirParcours({ formule: "" }), false);
  });
});

describe("profil créé par le code d'un membre inscrit", () => {
  test("réglages du serveur : cohorte, parcours, début ; le reste est filtré", () => {
    assert.deepEqual(FV.reglagesDuServeur({ feuVert: { cohorte: "1", parcours: "basesplus", debut: "2027-01-18" } }), { cohorte: "1", parcours: "basesplus", debut: "2027-01-18" });
    assert.deepEqual(FV.reglagesDuServeur({ feuVert: { cohorte: "2", parcours: "expert", debut: "demain" } }), { cohorte: "2", parcours: null, debut: null });
    assert.deepEqual(FV.reglagesDuServeur({ ok: true, inscrit: true, cohorte: "1" }), { cohorte: "1", parcours: null, debut: null }, "proxy pas encore à jour");
    assert.equal(FV.reglagesDuServeur({ ok: true, inscrit: false }), null);
    assert.equal(FV.reglagesDuServeur({ feuVert: { cohorte: "1; DROP" } }), null);
    assert.equal(FV.reglagesDuServeur(null), null);
  });

  test("profil pré-réglé ; début inconnu : l'app garde le 18 janvier 2027", () => {
    const p = FV.profilFeuVert({ name: "Nina" }, { cohorte: "1", parcours: "basesplus", debut: "2027-01-18" });
    assert.deepEqual(p, { name: "Nina", formule: "feuvert", feuVert: { cohorte: "1", parcours: "basesplus", parcoursFixe: true, debut: "2027-01-18" } });
    const sansDate = FV.profilFeuVert({}, { cohorte: "7", parcours: null, debut: null });
    assert.equal(FV.reglagesFeuVert(sansDate).debut, FV.DEBUT_COHORTE_1);
  });

  test("Marien change cohorte ou parcours : le profil suit ; rien de neuf : rien ne bouge ; sans perte", () => {
    const ancien = { name: "Léa", startWeightKg: 62, formule: "feuvert", feuVert: { parcours: "reprise", cohorte: "1", debut: "2027-01-18" } };
    const suivant = FV.feuVertAJour(ancien, { cohorte: "1", parcours: "basesplus", debut: "2027-01-18" });
    assert.equal(suivant.feuVert.parcours, "basesplus");
    assert.equal(suivant.startWeightKg, 62, "rien n'est effacé");
    assert.equal(FV.feuVertAJour(suivant, { cohorte: "1", parcours: "basesplus", debut: "2027-01-18" }), null);
    assert.equal(FV.feuVertAJour(suivant, { cohorte: "2", parcours: "basesplus", debut: null }).feuVert.cohorte, "2");
    // Marien retire le parcours : le choix déjà fait reste (verrouillé).
    const retire = FV.feuVertAJour(suivant, { cohorte: "1", parcours: null, debut: "2027-01-18" });
    assert.equal(retire.feuVert.parcours, "basesplus");
    assert.equal(FV.peutChoisirParcours(retire), false);
    assert.equal(FV.feuVertAJour({ formule: "" }, { cohorte: "1" }), null, "un client individuel ne bascule jamais");
  });

  test("rejoindreFeuVert : réglages renvoyés à l'activation", async () => {
    reseau([{ json: { ok: true, jeton: JETON, libelle: "Nina E.", feuVert: { cohorte: "1", parcours: null, debut: "2027-01-18" } } }]);
    assert.deepEqual(await FV.rejoindreFeuVert("K7PM-Q4XT"), { ok: true, reglages: { cohorte: "1", parcours: null, debut: "2027-01-18" } });
    assert.equal(appels.length, 1);
    assert.ok(appels[0].url.endsWith("/auth/activer"));
  });

  test("rejoindreFeuVert : proxy pas encore à jour → /feuvert/etat ; non inscrit → refus, pas de profil", async () => {
    reseau([{ json: { ok: true, jeton: JETON, libelle: "Nina E." } }, { json: { ok: true, inscrit: true, cohorte: "1" } }]);
    assert.deepEqual(await FV.rejoindreFeuVert("K7PMQ4XT"), { ok: true, reglages: { cohorte: "1", parcours: null, debut: null } });
    assert.ok(appels[1].url.endsWith("/feuvert/etat"));
    reseau([{ json: { ok: true, jeton: JETON, libelle: "Paul F." } }, { json: { ok: true, inscrit: false } }]);
    assert.deepEqual(await FV.rejoindreFeuVert("K7PMQ4XT"), { ok: false, erreur: "non-inscrit" });
    assert.ok(FV.MSG_REJOINDRE["non-inscrit"].includes("Réessayer"));
  });

  test("rejoindreFeuVert : code refusé, réseau coupé, réessai sans code", async () => {
    reseau([{ status: 400, json: { ok: false, error: "code-invalide" } }]);
    assert.deepEqual(await FV.rejoindreFeuVert("K7PMQ4XT"), { ok: false, erreur: "code-invalide" });
    reseau([]);
    assert.deepEqual(await FV.rejoindreFeuVert(null), { ok: false, erreur: "code-invalide" }, "sans code ni accès");
    assert.equal(appels.length, 0);
    localStorage.setItem(CLE_ACCES, JSON.stringify({ jeton: JETON }));
    reseau([new Error("hors ligne")]);
    assert.deepEqual(await FV.rejoindreFeuVert(null), { ok: false, erreur: "reseau" });
    reseau([{ json: { ok: true, inscrit: true, cohorte: "1", feuVert: { cohorte: "1", parcours: "reprise", debut: "2027-01-18" } } }]);
    assert.equal((await FV.rejoindreFeuVert(null)).reglages.parcours, "reprise");
  });

  test("accueil : plus de choix manuel de la formule ; profil Feu Vert seulement par le code", () => {
    const champs = lire("app/src/ecrans/ChampsProfil.jsx");
    const accueil = sansCommentaires(lire("app/src/ecrans/Bienvenue.jsx"));
    assert.ok(!/FORMULES|data-formule|ChampsFormule/.test(champs));
    assert.ok(!("FORMULES" in FV));
    assert.ok(!/formule === "feuvert"/.test(accueil), "le formulaire individuel ne crée pas de Feu Vert");
    assert.match(accueil, /onSave\(profilFeuVert\(/);
    assert.match(accueil, /rejoindreFeuVert\(/);
  });

  test("l'écran Feu Vert transmet les réglages reçus du serveur à l'app", () => {
    assert.match(lire("app/src/ecrans/FeuVert.jsx"), /if \(r\.reglages && onReglagesServeur\) onReglagesServeur\(r\.reglages\);/);
    assert.match(lire("app/src/App.jsx"), /onReglagesServeur=\{reglagesFeuVertRecus\}/);
  });
});

describe("contournement fermé : code Feu Vert entré dans un profil individuel (revue du 25/11/2026)", () => {
  test("profilApresActivation : bascule en Feu Vert verrouillé pour un inscrit, rien sinon, sans rien effacer", () => {
    const individuel = { name: "Léa", startWeightKg: 62, goal: "perte", formule: "" };
    const p = FV.profilApresActivation(individuel, { ok: true, libelle: "Léa B.", feuVert: { cohorte: "1", parcours: "reprise", debut: "2027-01-18" } });
    assert.equal(p.formule, "feuvert");
    assert.deepEqual(p.feuVert, { cohorte: "1", parcours: "reprise", parcoursFixe: true, debut: "2027-01-18" });
    assert.equal(p.startWeightKg, 62);
    assert.deepEqual(ongletsPour(p).map((o) => o.id), ["feuvert"]);
    assert.equal(FV.profilApresActivation(individuel, { ok: true, libelle: "Paul F." }), null);
  });

  test("Réglages (« Accès de ton coach ») : la réponse de l'activation est appliquée", () => {
    const reglages = lire("app/src/ecrans/Reglages.jsx");
    assert.match(reglages, /<CarteAcces\s+onActive=\{\(r\) => \{\s*const suivant = profilApresActivation\(profile, r\);\s*if \(suivant\) onSave\(suivant\);/);
    // Aucune autre activation de code sans pré-réglage.
    assert.equal((reglages.match(/<CarteAcces\b/g) || []).length, 1);
    assert.match(lire("app/src/ecrans/ReglagesFeuVert.jsx"), /<CarteAcces textes=\{T\.acces\} onActive=\{accesActive\} \/>/);
  });

  test("au lancement, un profil individuel avec le code d'un inscrit bascule en Feu Vert", () => {
    const app = lire("app/src/App.jsx");
    assert.match(app, /if \(!pret \|\| !profile \|\| feuVertActif\(profile\) \|\| inscriptionVerifiee\.current \|\| !accesActuel\(\)\) return;/);
    assert.match(app, /if \(r\.statut === "inscrit" && p && !feuVertActif\(p\)\) enregistrerProfil\(profilFeuVert\(p, r\.reglages\)\);/);
  });

  test("message « non inscrit » : plus d'invitation à créer un profil individuel", () => {
    assert.ok(!/profil plus bas|accès est déjà actif|coaching individuel/i.test(FV.MSG_REJOINDRE["non-inscrit"]));
  });

  test("statutInscription : inscrit, non inscrit (ou sans code), inconnu sans réseau", async () => {
    assert.deepEqual(await FV.statutInscription(), { statut: "non-inscrit", reglages: null }, "sans code d'accès");
    localStorage.setItem(CLE_ACCES, JSON.stringify({ jeton: JETON }));
    reseau([{ json: { ok: true, inscrit: false } }]);
    assert.equal((await FV.statutInscription()).statut, "non-inscrit");
    reseau([{ json: { ok: true, inscrit: true, cohorte: "1", feuVert: { cohorte: "1", parcours: null, debut: "2027-01-18" } } }]);
    assert.deepEqual(await FV.statutInscription(), { statut: "inscrit", reglages: { cohorte: "1", parcours: null, debut: "2027-01-18" } });
    reseau([new Error("hors ligne")]);
    assert.equal((await FV.statutInscription()).statut, "inconnu");
    reseau([{ status: 503, json: { ok: false } }]);
    assert.equal((await FV.statutInscription()).statut, "inconnu");
  });

  test("Réglages Feu Vert : « Revenir au coaching individuel » seulement si non inscrit, formule vide, rien effacé", () => {
    const r = sansCommentaires(lire("app/src/ecrans/ReglagesFeuVert.jsx"));
    assert.match(r, /\{inscription === "non-inscrit" && \(/);
    assert.match(r, /onSave\(\{ \.\.\.profile, name: prenom, formule: "" \}\);/);
    assert.ok(!/feuVert: undefined|delete .*feuVert/.test(r));
  });

  test("synchro : un événement refusé au membre Feu Vert (403 reserve-coaching-individuel) sort de la file", () => {
    assert.match(lire("app/src/lib/synchro-coach.js"), /if \(refus && refus\.error === "reserve-coaching-individuel"\) return true;/);
  });

  test("Aide Feu Vert : textes propres (pas de rappels), aucune réponse empruntée par index", () => {
    const aide = lire("app/src/lib/aide.js");
    assert.ok(!/AIDE\[\d\]/.test(aide));
    assert.ok(!/rappel/i.test(JSON.stringify(AIDE_FEU_VERT)));
  });

  test("bandeau « Rien ne s'enregistre » : en Feu Vert, pas de renvoi vers les réglages", () => {
    assert.match(lire("app/src/App.jsx"), /\? feuVert\s*\? "La mémoire du navigateur est pleine : libère de la place sur ton téléphone/);
  });
});
