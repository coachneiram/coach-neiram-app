/**
 * Ecrans Sommeil et Mensurations : logique portee vers l'application Vite.
 *
 * Ces deux ecrans sont les premiers migres. Ils ont ete choisis parce qu'ils
 * ne dependent d'aucun autre : si le portage introduit un ecart, il se voit
 * ici et pas trois ecrans plus loin.
 *
 * Deux choses sont verifiees :
 *  - le calcul donne le meme resultat que l'ancienne version ;
 *  - les textes de conseils sont mot pour mot ceux de index.html. Ce sont
 *    les conseils que le coach donne a ses clients : une reformulation
 *    involontaire au passage d'une migration serait une regression.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  CONSEILS_SOMMEIL,
  CONSEILS_STRESS,
  conseilsSommeil,
  conseilsStress,
  moyennes7Jours,
  notesDeStress,
  nuitsEnregistrees
} from "../app/src/lib/sommeil.js";
import { MEASUREMENT_FIELDS, chartScale, ecart, fmtTick, parDateCroissante } from "../app/src/lib/mensurations.js";
import { fmtDateShort, fmtWeekShort } from "../app/src/lib/dates.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const SOURCE_LEGACY = readFileSync(join(ICI, "..", "index.html"), "utf8")
  // index.html est minifie : les accents y sont echappes en \xNN / \uNNNN.
  .replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  // Les emojis sont echappes avec des accolades : \u{1F4AA}. Sans ce
  // decodage, tout texte en contenant un paraissait absent de l'original.
  .replace(/\\u\{([0-9A-Fa-f]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));

describe("les conseils sont repris mot pour mot de l'application actuelle", () => {
  const tous = [
    ...CONSEILS_SOMMEIL.duree,
    ...CONSEILS_SOMMEIL.qualite,
    ...CONSEILS_SOMMEIL.general,
    ...CONSEILS_STRESS.eleve,
    ...CONSEILS_STRESS.general
  ];

  test("chaque conseil existe a l'identique dans index.html", () => {
    for (const conseil of tous) {
      assert.ok(SOURCE_LEGACY.includes(conseil), "conseil reformule ou absent de l'original : " + conseil);
    }
  });

  test("aucun conseil n'a ete perdu en route", () => {
    assert.equal(CONSEILS_SOMMEIL.duree.length, 3);
    assert.equal(CONSEILS_SOMMEIL.qualite.length, 4);
    assert.equal(CONSEILS_SOMMEIL.general.length, 3);
    assert.equal(CONSEILS_STRESS.eleve.length, 3);
    assert.equal(CONSEILS_STRESS.general.length, 3);
  });
});

describe("moyennes sur sept jours", () => {
  const entrees = [
    { date: "2026-01-10", sleepHours: 6, sleepQuality: 3, stress: 7 },
    { date: "2026-01-11", sleepHours: 7, sleepQuality: 4, stress: 5 },
    // Hors fenetre : plus de six jours avant la date de reference.
    { date: "2026-01-01", sleepHours: 12, sleepQuality: 5, stress: 1 }
  ];

  test("seules les sept derniers jours comptent", () => {
    const m = moyennes7Jours(entrees, "2026-01-11");
    assert.equal(m.heures, 6.5);
    assert.equal(m.qualite, 3.5);
    assert.equal(m.stress, 6);
  });

  test("sans donnee, la moyenne vaut null plutot que zero", () => {
    // Zero se lirait « il n'a pas dormi » ; null se lit « on ne sait pas ».
    const m = moyennes7Jours([], "2026-01-11");
    assert.equal(m.heures, null);
    assert.equal(m.qualite, null);
    assert.equal(m.stress, null);
  });

  test("une nuit non renseignee ne tire pas la moyenne vers le bas", () => {
    const m = moyennes7Jours(
      [
        { date: "2026-01-10", sleepHours: 8 },
        { date: "2026-01-11", sleepQuality: 4 }
      ],
      "2026-01-11"
    );
    assert.equal(m.heures, 8);
    assert.equal(m.qualite, 4);
  });
});

describe("conseils sommeil", () => {
  test("toujours trois conseils, jamais plus", () => {
    assert.equal(conseilsSommeil({ heures: 5, qualite: 2 }, 8).length >= 3, true);
    assert.equal(conseilsSommeil({ heures: null, qualite: null }, 8).length, 3);
  });

  test("dormir nettement moins que l'objectif declenche les conseils de duree", () => {
    const c = conseilsSommeil({ heures: 6, qualite: null }, 8);
    assert.equal(c[0], CONSEILS_SOMMEIL.duree[0]);
  });

  test("un demi-quart d'heure sous l'objectif ne declenche rien", () => {
    // Le seuil est a -0,5 h : sinon l'application alerterait en permanence.
    const c = conseilsSommeil({ heures: 7.6, qualite: null }, 8);
    assert.equal(c[0], CONSEILS_SOMMEIL.general[0]);
  });

  test("une mauvaise qualite declenche les conseils de qualite", () => {
    const c = conseilsSommeil({ heures: null, qualite: 3 }, 8);
    assert.equal(c[0], CONSEILS_SOMMEIL.qualite[0]);
  });
});

describe("conseils stress", () => {
  test("au-dela de 6/10, les conseils cibles remplacent les generaux", () => {
    assert.deepEqual(conseilsStress(7), CONSEILS_STRESS.eleve);
  });

  test("en dessous du seuil, un conseil cible et deux generaux", () => {
    const c = conseilsStress(3);
    assert.equal(c[0], CONSEILS_STRESS.eleve[0]);
    assert.equal(c[1], CONSEILS_STRESS.general[0]);
    assert.equal(c.length, 3);
  });

  test("sans mesure de stress, on reste sur le mode calme", () => {
    assert.deepEqual(conseilsStress(null), conseilsStress(3));
  });

  test("le seuil de 6 est inclusif", () => {
    assert.deepEqual(conseilsStress(6), CONSEILS_STRESS.eleve);
  });
});

describe("historique des nuits", () => {
  test("une entree sans aucune donnee de sommeil n'apparait pas", () => {
    const nuits = nuitsEnregistrees([
      { id: "a", date: "2026-01-10", sleepHours: 7 },
      { id: "b", date: "2026-01-11", poids: 80 }
    ]);
    assert.deepEqual(nuits.map((n) => n.id), ["a"]);
  });

  test("une heure de coucher seule suffit a compter la nuit", () => {
    const nuits = nuitsEnregistrees([{ id: "a", date: "2026-01-10", bedTime: "23:15" }]);
    assert.equal(nuits.length, 1);
  });

  test("la plus recente vient en premier", () => {
    const nuits = nuitsEnregistrees([
      { id: "vieux", date: "2026-01-01", sleepHours: 7 },
      { id: "recent", date: "2026-01-11", sleepHours: 8 }
    ]);
    assert.equal(nuits[0].id, "recent");
  });

  test("au plus cinq raisons de stress affichees", () => {
    const entrees = Array.from({ length: 9 }, (_, i) => ({
      id: "n" + i,
      date: `2026-01-0${i + 1}`,
      stressNote: "note " + i
    }));
    assert.equal(notesDeStress(entrees).length, 5);
  });
});

describe("mensurations", () => {
  test("les neuf champs suivis sont conserves, dans le meme ordre", () => {
    assert.deepEqual(
      MEASUREMENT_FIELDS.map((f) => f.id),
      ["poitrine", "taille", "hanches", "brasD", "brasG", "cuisseD", "cuisseG", "molletD", "molletG"]
    );
  });

  test("chaque champ existe dans l'application actuelle", () => {
    for (const f of MEASUREMENT_FIELDS) {
      assert.ok(SOURCE_LEGACY.includes(`id: "${f.id}", label: "${f.label}"`), "champ modifie : " + f.id);
    }
  });

  test("l'ecart avec la prise precedente est arrondi au dixieme", () => {
    assert.equal(ecart(84.2, 85.14), -0.9);
  });

  test("un demi-dixieme pile est arrondi vers le haut, comme dans l'original", () => {
    // Math.round arrondit vers +l'infini sur les valeurs pile au milieu :
    // -0,85 donne donc -0,8 et non -0,9. Comportement repris tel quel de
    // l'application actuelle, pour que les historiques deja affiches ne
    // changent pas d'un chiffre apres la bascule.
    assert.equal(ecart(84.25, 85.1), -0.8);
  });

  test("sans prise precedente, il n'y a pas d'ecart a afficher", () => {
    assert.equal(ecart(84, null), null);
  });

  test("les prises sont triees de la plus ancienne a la plus recente", () => {
    const t = parDateCroissante([{ date: "2026-03-01" }, { date: "2026-01-01" }]);
    assert.equal(t[0].date, "2026-01-01");
  });

  test("le tri ne modifie pas le tableau d'origine", () => {
    const source = [{ date: "2026-03-01" }, { date: "2026-01-01" }];
    parDateCroissante(source);
    assert.equal(source[0].date, "2026-03-01");
  });
});

describe("echelle des courbes", () => {
  test("une marge de 8 % evite que la courbe touche les bords", () => {
    const { mn, mx } = chartScale([80, 90]);
    assert.ok(mn < 80 && mx > 90);
  });

  test("une serie plate garde une hauteur non nulle", () => {
    // Sinon la division par (mx - mn) donnerait une courbe invisible.
    const { mn, mx } = chartScale([80, 80]);
    assert.ok(mx - mn > 0);
  });

  test("la ligne de reference entre dans le cadrage", () => {
    const { mn } = chartScale([80, 90], 70);
    assert.ok(mn < 70);
  });

  test("les graduations restent lisibles", () => {
    assert.equal(fmtTick(84.26), "84.3");
    assert.equal(fmtTick(184.26), "184");
  });
});

describe("formats de date", () => {
  test("l'historique affiche jour, date et mois", () => {
    assert.equal(fmtDateShort("2026-01-12"), "lun. 12 janv.");
  });

  test("les libelles de courbe restent courts", () => {
    assert.equal(fmtWeekShort("2026-01-12"), "12 janv.");
  });

  test("une date absente ne casse pas l'affichage", () => {
    assert.equal(fmtDateShort(""), "");
  });
});
