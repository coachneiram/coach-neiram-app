/**
 * Restaurer une sauvegarde des l'ecran de bienvenue.
 *
 * Une cliente qui change de telephone, ou qui reinstalle apres avoir vide
 * son navigateur, tombe sur l'ecran de bienvenue. Jusqu'ici elle devait
 * saisir un profil complet AVANT de pouvoir aller chercher sa sauvegarde
 * dans les reglages — c'est-a-dire recreer a la main ce que le fichier
 * allait de toute facon remplacer, sans savoir que le fichier suffisait.
 *
 * Ces tests couvrent le chemin partage par les deux ecrans, puis verifient
 * que le bouton est reellement branche sur ce chemin.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  restaurerDepuisFichier,
  messageErreurRestauration
} from "../app/src/lib/sauvegarde-fichier.js";
import { construireSauvegarde } from "../app/src/lib/stockage.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const source = (c) => readFileSync(join(ICI, "..", c), "utf8");

/**
 * Doublure de localStorage.
 *
 * Le vrai objet expose ses cles comme proprietes enumerables — c'est ce que
 * lit listerCles(), via Object.keys. Une doublure batie sur une Map seule
 * n'aurait rendu que getItem/setItem, et le test aurait echoue sur sa
 * propre insuffisance plutot que sur le code.
 */
function installerStockage(contenu = {}) {
  const d = new Map(Object.entries(contenu));
  const methodes = {
    getItem: (k) => (d.has(k) ? d.get(k) : null),
    setItem: (k, v) => d.set(k, String(v)),
    removeItem: (k) => d.delete(k),
    key: (i) => [...d.keys()][i]
  };
  globalThis.localStorage = new Proxy(methodes, {
    get: (cible, cle) => (cle === "length" ? d.size : cible[cle]),
    has: (cible, cle) => cle in cible || d.has(cle),
    ownKeys: () => [...d.keys()],
    getOwnPropertyDescriptor: (cible, cle) =>
      d.has(cle) ? { value: d.get(cle), enumerable: true, configurable: true } : undefined
  });
  return d;
}

/** Doublure de FileReader : rend le texte fourni, ou echoue. */
function lecteurQuiRend(texte) {
  return class {
    readAsText() {
      if (texte === null) {
        this.onerror?.();
        return;
      }
      this.result = texte;
      this.onload?.();
    }
  };
}

const restaurer = (texte) => restaurerDepuisFichier({}, lecteurQuiRend(texte));

describe("lire un fichier de sauvegarde", () => {
  beforeEach(() => installerStockage());

  test("une vraie sauvegarde est restaurée", async () => {
    installerStockage({
      coach_profile: JSON.stringify({ firstName: "Sophie", age: 34 }),
      coach_log_entries: JSON.stringify([{ id: "a", calories: 300 }])
    });
    const fichier = JSON.stringify(construireSauvegarde());

    const stockage = installerStockage();
    const ecrites = await restaurer(fichier);
    assert.equal(ecrites, 2);
    assert.equal(JSON.parse(stockage.get("coach_profile")).firstName, "Sophie");
  });

  test("un fichier illisible est refusé, pas avalé", async () => {
    await assert.rejects(restaurer("ceci n'est pas du json"), (e) => e.code === "fichier-non-reconnu");
  });

  test("la sauvegarde d'une autre application est refusée", async () => {
    const etranger = JSON.stringify({ app: "autre-appli", data: { coach_profile: "{}" } });
    await assert.rejects(restaurer(etranger), (e) => e.code === "fichier-non-reconnu");
  });

  test("un fichier au bon format mais sans donnée exploitable est signalé à part", async () => {
    const vide = JSON.stringify({ app: "coach-neiram", version: 1, data: { rien_du_tout: "x" } });
    await assert.rejects(restaurer(vide), (e) => e.code === "sauvegarde-vide");
  });

  test("une panne de lecture est distinguée d'un mauvais fichier", async () => {
    await assert.rejects(restaurer(null), (e) => e.code === "lecture-impossible");
  });

  test("chaque code a sa propre phrase", () => {
    const phrases = ["sauvegarde-vide", "lecture-impossible", "fichier-non-reconnu"].map(
      messageErreurRestauration
    );
    assert.equal(new Set(phrases).size, 3, "trois causes distinctes, trois messages distincts");
    for (const p of phrases) assert.ok(p.length > 20 && !/undefined/.test(p));
  });
});

describe("le bouton est branché, pas seulement affiché", () => {
  const bienvenue = source("app/src/ecrans/Bienvenue.jsx");
  const reglages = source("app/src/ecrans/Reglages.jsx");

  /**
   * Le code est lu SANS ses commentaires.
   *
   * Une premiere version de ces tests cherchait « J'ai déjà une sauvegarde »
   * n'importe ou dans le fichier — et le commentaire d'en-tete, qui cite le
   * libelle pour l'expliquer, suffisait a les rendre verts. Retirer le
   * bouton pour de bon ne declenchait rien.
   */
  const sansCommentaires = (code) =>
    code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const bienvenueCode = sansCommentaires(bienvenue);

  test("l'écran de bienvenue propose la restauration", () => {
    assert.match(
      bienvenueCode,
      /J'ai déjà une sauvegarde\s*<\/Btn>/,
      "le libelle doit etre le contenu d'un bouton, pas seulement un mot dans le fichier"
    );
  });

  test("il passe par le module partagé, pas par une seconde copie", () => {
    // L'import seul ne prouve rien : c'est l'APPEL qui restaure.
    assert.match(bienvenueCode, /await restaurerDepuisFichier\(/);
    assert.doesNotMatch(bienvenueCode, /new FileReader/, "la lecture du fichier ne doit exister qu'a un endroit");
  });

  test("le champ fichier declenche bien la restauration", () => {
    // Un champ present mais branche sur rien laisserait le bouton mort,
    // exactement comme les quatre boutons morts trouves plus tot.
    const champ = bienvenueCode.slice(bienvenueCode.indexOf("<input"));
    assert.match(champ.slice(0, 400), /onChange=\{restaurer\}/);
  });

  test("un champ fichier existe vraiment derrière le bouton", () => {
    const champ = bienvenueCode.slice(bienvenueCode.indexOf("<input"));
    assert.match(champ.slice(0, 400), /type="file"/);
    assert.match(champ.slice(0, 400), /accept=/);
  });

  test("les réglages confirment avant d'écraser, la bienvenue non", () => {
    // Deux ecrans, deux situations : dans les reglages il y a des donnees a
    // perdre, sur l'ecran d'accueil il n'y a rien. Annoncer « tes donnees
    // seront remplacees » a quelqu'un qui n'a rien serait faux et effrayant.
    // Le motif verifie que la confirmation GARDE l'action : « window.confirm »
    // quelque part suffirait a un « if (false && !window.confirm(...)) »,
    // qui restaurerait sans jamais rien demander.
    // Deux confirmations coexistent dans les reglages. Le motif vise CELLE
    // de la restauration, par son texte, et verifie qu'elle GARDE l'action :
    // « window.confirm » quelque part se satisferait d'un
    // « if (false && !window.confirm(...)) », qui restaurerait sans rien
    // demander. C'est exactement le mutant qui avait survecu.
    assert.match(
      sansCommentaires(reglages),
      /if \(!window\.confirm\("Restaurer cette sauvegarde[^"]*seront remplacées/,
      "la confirmation doit conditionner la restauration, et annoncer la conséquence"
    );
    assert.doesNotMatch(bienvenueCode, /window\.confirm\(/, "rien a ecraser au premier lancement");
  });

  test("les réglages utilisent le même module", () => {
    assert.match(reglages, /restaurerDepuisFichier/);
    assert.doesNotMatch(reglages, /new FileReader/, "les deux ecrans doivent partager le meme chemin");
  });

  test("les erreurs affichées viennent du traducteur commun", () => {
    for (const [nom, code] of [["Bienvenue", bienvenue], ["Reglages", reglages]]) {
      assert.match(code, /messageErreurRestauration/, nom + " doit traduire les erreurs, pas les inventer");
    }
  });
});
