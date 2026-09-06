/**
 * Ecran Reglages.
 *
 * Deux garanties y sont verifiees, parce qu'elles depassent le simple
 * reglage : la cle IA ne doit jamais reapparaitre dans le navigateur, et
 * la restauration d'une sauvegarde ne doit jamais ecraser les donnees sans
 * confirmation.
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chargerApp } from "./harness.mjs";
import { ALLERGENS, COACHING_MODES, DIET_TYPES, TRAINING_MODES } from "../app/src/lib/catalogues.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");
const REGLAGES = readFileSync(join(RACINE, "app", "src", "ecrans", "Reglages.jsx"), "utf8");
const CHAMPS = readFileSync(join(RACINE, "app", "src", "ecrans", "ChampsProfil.jsx"), "utf8");

let legacy;
before(async () => {
  legacy = await chargerApp();
});

describe("la cle IA reste hors du navigateur", () => {
  test("le champ de saisie n'apparait que sans proxy", () => {
    // La phase 1 a sorti la cle du navigateur. Reafficher ce champ
    // inviterait le client a en coller une, et annulerait tout le travail.
    assert.match(REGLAGES, /!PROXY_BASE_URL/, "le champ n'est pas conditionné à l'absence de proxy");
  });

  test("aucun champ de saisie de cle n'est rendu", () => {
    // Meme sans proxy, l'ecran migre n'offre plus de zone de saisie : il
    // explique seulement a quoi sert la cle.
    const bloc = REGLAGES.slice(REGLAGES.indexOf("Clé IA"), REGLAGES.indexOf("Sauvegarde des données"));
    assert.ok(!/type="password"/.test(bloc), "un champ mot de passe subsiste");
    assert.ok(!/<TextInput/.test(bloc), "un champ de saisie de clé subsiste");
  });

  test("aucune cle n'est ecrite en dur dans l'ecran", () => {
    assert.ok(!/AIza[0-9A-Za-z_-]{20,}/.test(REGLAGES), "clé Google en dur");
  });
});

describe("sauvegarde et restauration", () => {
  test("la restauration demande confirmation", () => {
    // Elle remplace tout, et il n'existe aucune copie serveur pour revenir
    // en arriere.
    assert.match(REGLAGES, /window\.confirm/, "aucune confirmation avant restauration");
    assert.match(REGLAGES, /seront remplacées/, "la conséquence n'est pas annoncée");
  });

  test("un fichier illisible ne casse pas l'ecran", () => {
    // Le message lui-meme a demenage dans lib/sauvegarde-fichier.js, que
    // l'ecran de bienvenue partage desormais. Ce qui compte ici reste que
    // l'ecran RATTRAPE l'erreur et AFFICHE la phrase traduite, au lieu de
    // laisser passer une exception. La phrase exacte est verrouillee dans
    // tests/restaurer-au-demarrage.test.mjs.
    assert.match(REGLAGES, /catch/);
    assert.match(REGLAGES, /setMessage\(messageErreurRestauration\(/);
    assert.match(
      readFileSync(join(ICI, "..", "app", "src", "lib", "sauvegarde-fichier.js"), "utf8"),
      /Fichier de sauvegarde invalide/
    );
  });

  test("les deux actions sont proposees", () => {
    assert.match(REGLAGES, /Exporter mes données/);
    assert.match(REGLAGES, /Restaurer/);
  });

  test("l'export est reellement branche, pas laisse en bouchon", () => {
    /*
     * L'ecran a d'abord delegue l'export a une fonction fournie de
     * l'exterieur, restee vide dans l'apercu : le bouton ne faisait rien.
     * L'export appelle desormais directement la fonction portee.
     */
    assert.match(REGLAGES, /exporterSauvegarde\(construireSauvegarde\(\)/);
  });

  test("un echec d'export est desormais signale — divergence assumee", () => {
    /*
     * L'application d'origine n'affiche RIEN quand l'export echoue. Ce
     * silence a ete conserve pendant toute la migration, pour ne pas
     * melanger portage et amelioration, et ce test verrouillait ce choix.
     *
     * La migration est terminee. Le silence, lui, reste dangereux : le
     * client peut croire qu'il a une sauvegarde alors qu'il n'en a
     * aucune, et c'est son seul filet — il n'existe pas de copie serveur.
     *
     * Le test ne verrouille donc plus le silence, mais la DIVERGENCE
     * VOULUE : le message doit exister, et dire quoi faire.
     */
    // L'assertion vise l'appel COMPLET, pas la simple presence du texte :
    // un « setMessage(null && "...") » laisserait le message dans le
    // source tout en retablissant le silence a l'ecran.
    assert.match(
      REGLAGES,
      /setMessage\(\s*"L'export a échoué : aucune sauvegarde n'a été créée\./,
      "le message doit etre passe tel quel a setMessage"
    );
    // Viser le message lui-meme : « libère de la place » apparait aussi
    // ailleurs dans l'ecran, et une assertion trop large laissait passer
    // un message vide de toute action a faire.
    assert.match(
      REGLAGES,
      /aucune sauvegarde n'a été créée\. Réessaie, " \+\s*"et si ça recommence, libère de la place puis reprends\./,
      "le message doit dire quoi faire, pas seulement que ça a échoué"
    );
  });
});

describe("listes d'options identiques a l'application actuelle", () => {
  const memeRealm = (v) => JSON.parse(JSON.stringify(v));

  test("regimes alimentaires", () => {
    assert.deepEqual(DIET_TYPES, memeRealm(legacy.DIET_TYPES));
  });

  test("allergenes", () => {
    // Cette liste pilote le filtrage des aliments : une entree de travers
    // ecarterait le mauvais aliment.
    assert.deepEqual(ALLERGENS, memeRealm(legacy.ALLERGENS));
  });

  test("modes d'entrainement", () => {
    assert.deepEqual(TRAINING_MODES, memeRealm(legacy.TRAINING_MODES));
  });

  test("modes de coaching", () => {
    assert.deepEqual(COACHING_MODES, memeRealm(legacy.COACHING_MODES));
  });
});

describe("champs du profil", () => {
  test("tous les champs de l'application actuelle sont presents", () => {
    for (const libelle of [
      "Prénom (optionnel)", "Sexe", "Âge", "Taille (cm)", "Poids de départ (kg)",
      "Activité sportive (hors métier)", "Objectif", "Poids objectif (kg, optionnel)",
      "Séances / semaine visées", "Où se passent tes séances", "Objectif sommeil (h/nuit)",
      "Type de métier", "Objectif pas / jour", "Objectif hydratation (L / jour)",
      "Régime alimentaire", "Allergies / intolérances", "Type de coaching"
    ]) {
      assert.ok(CHAMPS.includes(`label="${libelle}"`), "champ manquant : " + libelle);
    }
  });

  test("un creneau ajoute porte sa date de creation", () => {
    // Sans elle, un creneau cree aujourd'hui serait compte comme manque
    // sur toutes les semaines passees du client.
    assert.match(CHAMPS, /createdAt: todayISO\(\)/);
  });

  test("un champ vide redevient vide, pas zero", () => {
    // « 0 kg » ou « 0 an » serait un mensonge, et fausserait tous les
    // calculs qui testent la presence de la donnee.
    assert.match(CHAMPS, /e\.target\.value \? transforme\(e\.target\.value\) : ""/);
  });
});
