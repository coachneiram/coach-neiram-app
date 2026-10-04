/**
 * Script Google de synchro, version 2.1 (4 octobre 2026).
 *
 * Point de depart : la v2 installee chez le coach (lue le 4 octobre). Elle
 * n'exigeait aucun secret, recopiait le corps recu (secret compris) dans la
 * colonne Brut, repondait « statut: erreur » que le proxy lisait comme un
 * succes, attendait des noms de champs que l'application n'envoie pas
 * (l'onglet Adherence ne pouvait jamais se remplir), n'avait pas de plafond
 * d'e-mails et ecrivait les textes tels quels (formules executables).
 * Chaque test ci-dessous verrouille l'une de ces corrections.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { creerScript, SOURCE_SCRIPT } from "./doublure-apps-script.mjs";

/** Les en-tetes du classeur du coach au 4 octobre 2026 (lus dans le Sheet). */
const CLASSEUR_DU_COACH = {
  Journal: ["Reçu le", "Client", "Type", "Date séance", "Créneau", "Lieu", "Heure réelle", "Retard", "Durée", "RPE", "Détail", "Statut", "Motif", "Message", "Brut"],
  Erreurs: ["Recu le", "Erreur", "Donnees brutes"],
  Adherence: ["Reçu le", "Client", "Semaine", "Tenus", "Résolus", "Manqués", "Décalés/Rattrapés", "% respect"],
  Alertes: ["Reçu le", "Client", "Type", "Détail", "Traité"]
};

/** Un pointage tel que le proxy le transmet (secret ajoute par le proxy). */
const pointage = (extra = {}) => ({
  secret: "le-vrai-secret",
  type: "pointage",
  client: "Thomas",
  date: "2026-10-02",
  creneau: "Jeudi 18:30",
  lieu: "Salle",
  heureReelle: "18:40",
  retard: false,
  maintien: false,
  dureeMin: 52,
  rpe: 7,
  note: "Bonne séance",
  ...extra
});

const resume = (client, weekKey, pct, extra = {}) => ({
  secret: "le-vrai-secret",
  type: "resume_hebdo",
  client,
  weekKey,
  honored: 6,
  resolved: 8,
  missed: 2,
  shifted: 1,
  pct,
  message: "Taux de respect sur 4 semaines : " + pct + "%.",
  ...extra
});

describe("1. secret partage", () => {
  test("tant qu'il n'est pas exige, tout passe (installation sans rien casser)", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    assert.equal(s.poster(pointage({ secret: "" })).ok, true);
  });

  test("exige : sans le bon secret, refuse et rien n'est ecrit", () => {
    const s = creerScript({ reglages: { EXIGER_SECRET: true }, proprietes: { SECRET_SYNC: "le-vrai-secret" }, entetesExistants: CLASSEUR_DU_COACH });
    assert.deepEqual(s.poster(pointage({ secret: "faux" })), { ok: false, statut: "erreur", error: "non-autorise" });
    assert.equal(s.poster(pointage({ secret: undefined })).ok, false);
    assert.equal(s.lignes("Journal").length, 0);
    assert.equal(s.poster(pointage()).ok, true);
    assert.equal(s.lignes("Journal").length, 1);
  });

  test("exige mais jamais genere : tout est refuse (pas de secret vide accepte)", () => {
    const s = creerScript({ reglages: { EXIGER_SECRET: true } });
    assert.equal(s.poster(pointage({ secret: "" })).ok, false);
  });

  test("genererSecret cree un secret long, le garde, et ne le change plus", () => {
    const s = creerScript();
    const premier = s.appeler("genererSecret");
    assert.ok(premier.length >= 32);
    assert.equal(s.props.SECRET_SYNC, premier);
    assert.equal(s.appeler("genererSecret"), premier);
  });

  test("le secret n'est ecrit nulle part dans le code", () => {
    assert.doesNotMatch(SOURCE_SCRIPT, /SECRET_PARTAGE|REMPLACE-MOI/);
  });
});

describe("2. le secret n'est jamais recopie dans le classeur", () => {
  test("ni dans la colonne Brut, ni dans aucune cellule, ni dans Erreurs", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster(pointage());
    s.poster({ secret: "le-vrai-secret", type: "type_invente", client: "X" });
    s.poster('{"secret":"le-vrai-secret", pas du json');
    for (const f of s.feuilles.values()) {
      assert.doesNotMatch(JSON.stringify(f.cellules), /le-vrai-secret/, "onglet " + f.nom);
    }
  });
});

describe("3. une erreur n'est plus lue comme un succes", () => {
  test("le proxy lit « ok » : false sur erreur, true sur succes", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    assert.equal(s.poster(pointage()).ok, true);
    assert.equal(s.poster("pas du json").ok, false);
    assert.equal(s.poster({ type: "type_invente" }).ok, false);
  });

  test("exception pendant l'ecriture : ok false et trace dans Erreurs", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.contexte.journaliser = () => {
      throw new Error("classeur indisponible");
    };
    assert.equal(s.poster(pointage()).ok, false);
    assert.match(JSON.stringify(s.lignes("Erreurs")), /classeur indisponible/);
    assert.match(JSON.stringify(s.lignes("Erreurs")), /Thomas/, "le corps recu est garde pour diagnostic");
    assert.doesNotMatch(JSON.stringify(s.lignes("Erreurs")), /le-vrai-secret/, "mais sans le secret");
  });

  test("e-mail en echec : l'evenement est enregistre, ok true (pas de double ecriture au renvoi)", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH, mailEchoue: true });
    const r = s.poster({ type: "alerte_seances_manquees", client: "Thomas", nbManquees: 2, message: "2 créneaux manqués." });
    assert.equal(r.ok, true);
    assert.equal(s.lignes("Alertes").length, 1);
    assert.match(JSON.stringify(s.lignes("Erreurs")), /E-mail non envoyé/);
  });
});

describe("4. les champs de l'application arrivent dans les bonnes colonnes", () => {
  test("pointage : heure reelle, duree, RPE, note, statut", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster(pointage());
    const [l] = s.lignes("Journal");
    assert.equal(l.Client, "Thomas");
    assert.equal(l["Date séance"], "2026-10-02");
    assert.equal(l["Heure réelle"], "18:40");
    assert.equal(l["Durée"], 52);
    assert.equal(l.RPE, 7);
    assert.equal(l.Note, "Bonne séance");
    assert.equal(l.Statut, "tenu");
    assert.equal(l.Retard, "");
    // Les 15 colonnes du coach n'ont pas bouge : les nouvelles sont a la fin.
    assert.deepEqual(s.feuilles.get("Journal").cellules[0].slice(0, 15), CLASSEUR_DU_COACH.Journal);
  });

  test("pointage en retard et seance maintien", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster(pointage({ retard: true, maintien: true, note: "" }));
    const [l] = s.lignes("Journal");
    assert.equal(l.Retard, "oui");
    assert.equal(l.Statut, "tenu (maintien)");
    assert.equal(l["Détail"], "séance maintien");
  });

  test("resume hebdo : chiffres en colonnes, onglet Adherence rempli", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster(resume("Thomas", "2026-09-21", 80));
    s.poster(resume("Thomas", "2026-09-28", 75, { honored: 5 }));
    s.poster(resume("Julie", "2026-09-28", 90));
    // Renvoi du meme resume (file de l'application) : le dernier fait foi.
    s.poster(resume("Thomas", "2026-09-28", 75, { honored: 6 }));
    const j = s.lignes("Journal").at(-1);
    assert.equal(j.Semaine, "2026-09-28");
    assert.equal(j.Tenus, 6);
    assert.equal(j["Tranchés"], 8);
    assert.equal(j["% respect (4 sem.)"], 75);
    const a = s.lignes("Adherence");
    assert.deepEqual(
      a.map((l) => [l.Client, l.Semaine, l.Tenus, l["Tranchés"], l["Manqués"], l["Décalés"], l["% respect (4 sem.)"]]),
      [
        ["Thomas", "2026-09-21", 6, 8, 2, 1, 0.8],
        ["Julie", "2026-09-28", 6, 8, 2, 1, 0.9],
        ["Thomas", "2026-09-28", 6, 8, 2, 1, 0.75]
      ]
    );
    assert.deepEqual(s.feuilles.get("Adherence").cellules[0], ["Reçu le", "Client", "Semaine", "Tenus", "Tranchés", "Manqués", "Décalés", "% respect (4 sem.)"]);
  });

  test("semaine convertie en date par le classeur : regroupement intact", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster(resume("Thomas", "2026-09-28", 75));
    s.poster(resume("Thomas", "2026-09-28", 70));
    // Simule la conversion automatique de Google Sheets sur la 1re ligne :
    // les deux resumes portent sur la meme semaine, une seule ligne attendue.
    const f = s.feuilles.get("Journal");
    const col = f.cellules[0].indexOf("Semaine");
    f.cellules[1][col] = runInNewContext('new Date("2026-09-28T00:00:00Z")', s.contexte);
    assert.equal(s.appeler("majAdherence"), 1);
    assert.equal(s.lignes("Adherence")[0]["% respect (4 sem.)"], 0.7);
  });
});

describe("5. plafond d'e-mails", () => {
  test("3 par client et par jour, malgre l'anti-doublon contourne", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH, reglages: { ANTI_DOUBLON_HEURES: 0 } });
    for (let i = 0; i < 5; i++) s.poster({ type: "alerte_seances_manquees", client: "Thomas", nbManquees: 2 });
    assert.equal(s.mails.length, 3);
    assert.equal(s.lignes("Alertes").length, 5, "les alertes restent toutes ecrites");
  });

  test("20 au total : 30 faux prenoms ne passent pas", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    for (let i = 0; i < 30; i++) s.poster({ type: "alerte_decalages", client: "Faux" + i, nbDecalages: 3 });
    assert.equal(s.mails.length, 20);
  });

  test("resume hebdo : e-mail seulement sous 70 %", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster(resume("Thomas", "2026-09-28", 85));
    assert.equal(s.mails.length, 0);
    assert.equal(s.lignes("Alertes").length, 0);
    s.poster(resume("Julie", "2026-09-28", 55));
    assert.equal(s.mails.length, 1);
    assert.match(s.mails[0].sujet, /Julie : taux de respect à 55 %/);
    assert.doesNotMatch(s.mails[0].corps, /undefined|NaN/);
  });
});

describe("6. pas de formule executee", () => {
  test("un texte qui commence par = + - @ reste du texte", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster(pointage({ client: "=IMPORTXML(\"https://x\";\"//a\")", note: "+33 6 00", lieu: "@salle" }));
    const [l] = s.lignes("Journal");
    assert.equal(l.Client, "'=IMPORTXML(\"https://x\";\"//a\")");
    assert.equal(l.Note, "'+33 6 00");
    assert.equal(l.Lieu, "'@salle");
  });
});

describe("ce que la v2 faisait deja reste en place", () => {
  test("anti-doublon : meme client, meme alerte, un seul e-mail", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster({ type: "alerte_seances_manquees", client: "Thomas", nbManquees: 2 });
    s.poster({ type: "alerte_seances_manquees", client: "Thomas", nbManquees: 2 });
    assert.equal(s.mails.length, 1);
  });

  test("les e-mails portent les vrais chiffres et creneaux", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.poster({
      type: "alerte_seances_manquees",
      client: "Thomas",
      nbManquees: 2,
      creneauxManques: [{ jour: "Mardi", heure: "18:00", date: "2026-09-29", lieu: "Salle" }]
    });
    assert.match(s.mails[0].sujet, /Thomas : 2 créneaux manqués/);
    assert.match(s.mails[0].corps, /Mardi 18:00 \(2026-09-29\) — Salle/);
  });

  test("migrer() complete le classeur du coach sans rien decaler", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH });
    s.appeler("migrer");
    const journal = s.feuilles.get("Journal").cellules[0];
    assert.deepEqual(journal.slice(0, 15), CLASSEUR_DU_COACH.Journal);
    assert.deepEqual(journal.slice(15), ["Note", "Semaine", "Tenus", "Tranchés", "Manqués", "Décalés", "% respect (4 sem.)"]);
    assert.equal(s.feuilles.get("Adherence").cellules[0][4], "Tranchés");
  });

  test("adresse d'exemple laissee : aucune alerte envoyee, l'oubli est signale", () => {
    const s = creerScript({ entetesExistants: CLASSEUR_DU_COACH, reglages: { EMAIL_COACH: "ton.adresse@exemple.com" } });
    assert.equal(s.poster({ type: "alerte_seances_manquees", client: "Thomas", nbManquees: 2 }).ok, true);
    assert.equal(s.mails.length, 0);
    assert.match(JSON.stringify(s.lignes("Erreurs")), /EMAIL_COACH non renseigné/);
  });

  test("doGet annonce la version", () => {
    const s = creerScript();
    assert.match(s.appeler("doGet").contenu, /v2\.1/);
  });
});
