/**
 * Carte de progres a partager, et invitation d'un ami.
 *
 * Ces tests verrouillent les chiffres de la carte, la confidentialite (le
 * poids n'apparait que sur demande, le prenom jamais sur l'image), le
 * message d'invitation (lien de l'appel decouverte et prenom du parrain),
 * et les deux voies de partage avec leurs replis.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PARRAINAGE,
  lienContactCoach,
  lignesCarte,
  messageInvitation,
  nomFichierCarte,
  nombreFr,
  statistiquesProgres
} from "../app/src/lib/carte-progres.js";
import { inviterUnAmi, partagerCarte } from "../app/src/lib/partage-carte.js";

const AUJ = "2026-10-01";

/** Un client suivi depuis le 1er septembre, avec seances et pesees. */
const DONNEES = {
  profil: { firstName: "Thomas", startWeightKg: 88 },
  seances: [{ date: "2026-09-02" }, { date: "2026-09-09" }, { date: "2026-09-30" }, { date: "2026-10-05" }],
  pesees: [
    { date: "2026-09-01", weightKg: 87.5 },
    { date: "2026-09-29", weightKg: 84.8 },
    { date: "2026-10-03", weightKg: 80 }
  ],
  repas: [{ date: "2026-09-01" }, { date: "2026-09-30" }, { date: "2026-10-01" }],
  journal: [{ date: "2026-09-30" }],
  date: AUJ
};

describe("Chiffres de la carte", () => {
  test("semaines, seances, jours suivis, serie", () => {
    const s = statistiquesProgres(DONNEES);
    assert.equal(s.debut, "2026-09-01");
    assert.equal(s.semaines, 5, "du 1er septembre au 1er octobre : 31 jours, 5 semaines entamees");
    assert.equal(s.seances, 3, "la seance datee du 5 octobre est dans le futur");
    assert.equal(s.joursNotes, 6, "1er, 2, 9, 29 (pesée), 30 septembre et 1er octobre");
    assert.equal(s.serie, 2, "30 septembre et 1er octobre");
  });

  test("poids : depart a l'inscription, actuel a la derniere pesee passee", () => {
    assert.deepEqual(statistiquesProgres(DONNEES).poids, { depart: 88, actuel: 84.8, ecart: -3.2 });
  });

  test("sans poids d'inscription : la premiere pesee sert de depart, s'il y en a au moins deux", () => {
    const sans = { ...DONNEES, profil: { firstName: "Thomas" } };
    assert.deepEqual(statistiquesProgres(sans).poids, { depart: 87.5, actuel: 84.8, ecart: -2.7 });
    const une = { ...sans, pesees: [{ date: "2026-09-29", weightKg: 84.8 }] };
    assert.equal(statistiquesProgres(une).poids, null, "une seule pesee : pas d'evolution a montrer");
  });

  test("aucune saisie : pas de carte", () => {
    assert.equal(statistiquesProgres({ profil: {}, seances: [], pesees: [], repas: [], journal: [], date: AUJ }), null);
  });

  test("un premier jour compte pour une semaine", () => {
    const s = statistiquesProgres({ profil: {}, seances: [{ date: AUJ }], pesees: [], repas: [], journal: [], date: AUJ });
    assert.equal(s.semaines, 1);
    assert.equal(s.seances, 1);
  });
});

describe("Lignes affichees", () => {
  const stats = statistiquesProgres(DONNEES);

  test("par defaut, le poids n'apparait pas", () => {
    const l = lignesCarte(stats);
    assert.deepEqual(l, [
      { valeur: "5", libelle: "semaines de suivi" },
      { valeur: "3", libelle: "séances réalisées" },
      { valeur: "2", libelle: "jours de suite" }
    ]);
    assert.ok(!JSON.stringify(l).includes("kg"));
  });

  test("le poids apparait seulement sur demande, avec un vrai signe moins", () => {
    const l = lignesCarte(stats, { avecPoids: true });
    assert.deepEqual(l[2], { valeur: "−3,2 kg", libelle: "depuis le début" });
  });

  test("une prise de poids s'affiche avec un plus (prise de masse)", () => {
    const l = lignesCarte({ ...stats, poids: { depart: 70, actuel: 72, ecart: 2 } }, { avecPoids: true });
    assert.equal(l[2].valeur, "+2,0 kg");
  });

  test("le prenom ne figure jamais sur la carte", () => {
    assert.ok(!JSON.stringify(lignesCarte(stats, { avecPoids: true })).includes("Thomas"));
  });

  test("les chiffres nuls ne sont pas affiches, et le singulier est respecte", () => {
    const l = lignesCarte({ semaines: 1, seances: 0, joursNotes: 1, serie: 1, poids: null });
    assert.deepEqual(l, [{ valeur: "1", libelle: "semaine de suivi" }]);
    assert.equal(lignesCarte({ semaines: 2, seances: 1, joursNotes: 1, serie: 0, poids: null })[1].libelle, "séance réalisée");
  });

  test("sans serie en cours, les jours suivis prennent la place", () => {
    const l = lignesCarte({ semaines: 3, seances: 4, joursNotes: 12, serie: 0, poids: null });
    assert.deepEqual(l[2], { valeur: "12", libelle: "jours suivis" });
  });

  test("quatre lignes au plus", () => {
    const l = lignesCarte({ semaines: 9, seances: 20, joursNotes: 40, serie: 12, poids: { ecart: -5 } }, { avecPoids: true });
    assert.equal(l.length, 4);
  });

  test("pas de stats, pas de lignes", () => {
    assert.deepEqual(lignesCarte(null), []);
  });

  test("nombres a la francaise", () => {
    assert.equal(nombreFr(1234), "1 234".replace(" ", " "));
    assert.equal(nombreFr(-3.24, 1), "−3,2");
    assert.equal(nombreFr(-0.01, 1), "0,0");
  });
});

describe("Invitation d'un ami", () => {
  test("le lien ouvre WhatsApp avec le coach, prenom du parrain deja ecrit", () => {
    const lien = lienContactCoach("Thomas");
    assert.match(lien, /^https:\/\/wa\.me\/33675359069\?text=/);
    assert.equal(
      decodeURIComponent(lien.split("text=")[1]),
      "Bonjour Marien, je viens de la part de Thomas. J'aimerais en savoir plus sur ton coaching."
    );
    const m = messageInvitation({ prenom: "Thomas" });
    assert.ok(m.includes(lien), "le message envoye a l'ami contient ce lien");
    assert.match(m, /WhatsApp/);
    assert.doesNotMatch(m, /calendly/);
  });

  test("sans prenom, pas de formule vide", () => {
    assert.doesNotMatch(decodeURIComponent(lienContactCoach("  ")), /de la part de/);
    assert.doesNotMatch(decodeURIComponent(messageInvitation({ prenom: "" })), /de la part de/);
  });

  test("feuille de partage du telephone quand elle existe", async () => {
    const partages = [];
    const r = await inviterUnAmi("salut", { navigator: { share: async (d) => partages.push(d) } });
    assert.equal(r, "shared");
    assert.deepEqual(partages, [{ text: "salut" }]);
  });

  test("sans feuille de partage : WhatsApp avec le message pre-rempli", async () => {
    const ouverts = [];
    const r = await inviterUnAmi("salut à toi", { navigator: {}, ouvrir: (u) => ouverts.push(u) });
    assert.equal(r, "whatsapp");
    assert.deepEqual(ouverts, ["https://wa.me/?text=salut%20%C3%A0%20toi"]);
  });

  test("feuille fermee par le client : rien d'autre ne s'ouvre", async () => {
    const ouverts = [];
    const abandon = Object.assign(new Error("x"), { name: "AbortError" });
    const r = await inviterUnAmi("salut", {
      navigator: { share: async () => { throw abandon; } },
      ouvrir: (u) => ouverts.push(u)
    });
    assert.equal(r, "cancelled");
    assert.deepEqual(ouverts, []);
  });
});

describe("Partage de l'image", () => {
  class FauxFichier {
    constructor(parts, nom, opts) {
      this.parts = parts;
      this.name = nom;
      this.type = opts.type;
    }
  }

  test("partage natif d'un PNG quand le telephone accepte les fichiers", async () => {
    const partages = [];
    const r = await partagerCarte("PNG", nomFichierCarte(AUJ), {
      File: FauxFichier,
      navigator: { canShare: () => true, share: async (d) => partages.push(d) }
    });
    assert.equal(r, "shared");
    assert.equal(partages[0].files[0].name, "progres-coach-neiram-2026-10-01.png");
    assert.equal(partages[0].files[0].type, "image/png");
  });

  test("sinon, telechargement de l'image", async () => {
    const cliques = [];
    const doc = {
      body: { appendChild() {} },
      createElement: () => ({ click() { cliques.push(this.download); }, remove() {} })
    };
    const r = await partagerCarte("PNG", "carte.png", {
      File: FauxFichier,
      navigator: { canShare: () => false },
      document: doc,
      URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} }
    });
    assert.equal(r, "downloaded");
    assert.deepEqual(cliques, ["carte.png"]);
  });

  test("feuille fermee : annule, sans telechargement", async () => {
    const abandon = Object.assign(new Error("x"), { name: "AbortError" });
    const r = await partagerCarte("PNG", "carte.png", {
      File: FauxFichier,
      navigator: { canShare: () => true, share: async () => { throw abandon; } }
    });
    assert.equal(r, "cancelled");
  });
});

describe("Parrainage affiche dans l'application", () => {
  test("les trois paliers du visuel du coach, sur le mois suivant", () => {
    assert.deepEqual(
      PARRAINAGE.paliers.map((p) => [p.formule, p.gain]),
      [
        ["Suivi hebdo", "Une séance offerte"],
        ["Suivi mensuel", "55 € offerts"],
        ["Coaching en ligne", "−25 %"]
      ]
    );
    assert.equal(PARRAINAGE.precision, "sur ton mois suivant");
    assert.match(PARRAINAGE.condition, /signe un coaching/);
  });

  test("aucun montant fige pour le coaching en ligne (32,50 € = ancien tarif de 130 €)", () => {
    const texte = JSON.stringify(PARRAINAGE);
    assert.doesNotMatch(texte, /32[,.]50/);
    assert.doesNotMatch(texte, /130/);
  });
});
