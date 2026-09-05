/**
 * Acces aux collections de donnees.
 *
 * C'est la couche qui ecrit reellement les donnees du client. Tout ce qui
 * s'y perd est perdu pour de bon : il n'existe aucune copie serveur, le
 * telephone est la seule source.
 *
 * Le piege principal est teste explicitement : `items` est fige au rendu.
 * Ajouter plusieurs entrees en appelant `add` en boucle ne conserverait que
 * la derniere — panne silencieuse, sans message, et le client croit avoir
 * enregistre son repas complet.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { creerLocalStorage } from "./harness.mjs";
import { collectionApi, journalDuJourApi } from "../app/src/lib/collections.js";
import { charger } from "../app/src/lib/stockage.js";

const CLE = "coach_test_collection";

beforeEach(() => {
  globalThis.localStorage = creerLocalStorage();
});

/** Simule le couple etat React / setter, en gardant l'etat fige entre rendus. */
function etatSimule(initial = []) {
  const boite = { valeur: initial };
  return {
    get items() {
      return boite.valeur;
    },
    setItems: (v) => {
      boite.valeur = v;
    }
  };
}

describe("collection d'entrees", () => {
  test("une entree ajoutee recoit un identifiant et arrive en tete", () => {
    const etat = etatSimule([{ id: "ancien", name: "Riz" }]);
    const api = collectionApi(CLE, etat.items, etat.setItems);
    api.add({ name: "Poulet" });

    assert.equal(etat.items.length, 2);
    assert.equal(etat.items[0].name, "Poulet");
    assert.ok(etat.items[0].id, "identifiant manquant");
  });

  test("l'ajout est ecrit dans le stockage, pas seulement a l'ecran", () => {
    // Sans cette ecriture, le repas disparait au rechargement de la page.
    const etat = etatSimule();
    collectionApi(CLE, etat.items, etat.setItems).add({ name: "Poulet" });
    assert.equal(charger(CLE, [])[0].name, "Poulet");
  });

  test("ajouter plusieurs entrees les conserve toutes", () => {
    /*
     * Le piege : `items` est fige au rendu. Appeler add() en boucle
     * repartirait a chaque fois du meme tableau d'origine, et seule la
     * derniere entree survivrait. C'est la raison d'etre de addMany.
     */
    const etat = etatSimule();
    const api = collectionApi(CLE, etat.items, etat.setItems);
    api.addMany([{ name: "Riz" }, { name: "Poulet" }, { name: "Brocoli" }]);

    assert.equal(etat.items.length, 3);
    assert.deepEqual(charger(CLE, []).map((x) => x.name), ["Riz", "Poulet", "Brocoli"]);
  });

  test("chaque entree ajoutee en lot a son propre identifiant", () => {
    const etat = etatSimule();
    collectionApi(CLE, etat.items, etat.setItems).addMany([{ name: "A" }, { name: "B" }, { name: "C" }]);
    const ids = etat.items.map((x) => x.id);
    assert.equal(new Set(ids).size, 3, "identifiants dupliqués");
  });

  test("un lot vide ne touche a rien", () => {
    const etat = etatSimule([{ id: "a", name: "Riz" }]);
    collectionApi(CLE, etat.items, etat.setItems).addMany([]);
    assert.equal(etat.items.length, 1);
  });

  test("la boucle naive perdrait bien les entrees", () => {
    // Verifie que le piege est reel, et pas une precaution imaginaire.
    const etat = etatSimule();
    const api = collectionApi(CLE, etat.items, etat.setItems);
    api.add({ name: "Riz" });
    api.add({ name: "Poulet" }); // même api, donc même `items` figé
    assert.equal(etat.items.length, 1, "le piège n'existe plus, ce test doit être revu");
    assert.equal(etat.items[0].name, "Poulet");
  });

  test("une modification ne touche que l'entree visee", () => {
    const etat = etatSimule([
      { id: "a", name: "Riz", calories: 195 },
      { id: "b", name: "Poulet", calories: 200 }
    ]);
    collectionApi(CLE, etat.items, etat.setItems).update("a", { calories: 250 });

    assert.equal(etat.items[0].calories, 250);
    assert.equal(etat.items[1].calories, 200);
  });

  test("modifier une entree inexistante ne casse rien", () => {
    const etat = etatSimule([{ id: "a", name: "Riz" }]);
    collectionApi(CLE, etat.items, etat.setItems).update("fantome", { calories: 1 });
    assert.equal(etat.items.length, 1);
  });

  test("une suppression retire uniquement l'entree visee", () => {
    const etat = etatSimule([{ id: "a" }, { id: "b" }, { id: "c" }]);
    collectionApi(CLE, etat.items, etat.setItems).remove("b");
    assert.deepEqual(etat.items.map((x) => x.id), ["a", "c"]);
  });

  test("la suppression est ecrite dans le stockage", () => {
    // Sinon l'entree supprimee reapparait au rechargement.
    const etat = etatSimule([{ id: "a" }, { id: "b" }]);
    collectionApi(CLE, etat.items, etat.setItems).remove("a");
    assert.deepEqual(charger(CLE, []).map((x) => x.id), ["b"]);
  });
});

describe("journal a une entree par date", () => {
  test("une premiere saisie cree l'entree du jour", () => {
    const etat = etatSimule();
    journalDuJourApi(CLE, etat.items, etat.setItems).upsert("2026-09-05", { weightKg: 78.4 });

    assert.equal(etat.items.length, 1);
    assert.equal(etat.items[0].date, "2026-09-05");
    assert.equal(etat.items[0].weightKg, 78.4);
  });

  test("une seconde saisie complete la premiere au lieu de la doubler", async () => {
    /*
     * Sans cela, se peser puis noter son sommeil creerait deux entrees pour
     * le meme jour, et tous les calculs qui cherchent « l'entree du jour »
     * n'en verraient qu'une.
     */
    const etat = etatSimule();
    const cree = journalDuJourApi(CLE, etat.items, etat.setItems);
    // Les operations sont asynchrones, comme dans l'application d'origine :
    // sans « await », on recupere une promesse et non le tableau suivant.
    const apres = await cree.upsert("2026-09-05", { weightKg: 78.4 });
    await journalDuJourApi(CLE, apres, etat.setItems).upsert("2026-09-05", { sleepHours: 7.5 });

    assert.equal(etat.items.length, 1, "deux entrées créées pour la même date");
    assert.equal(etat.items[0].weightKg, 78.4, "la première valeur a été perdue");
    assert.equal(etat.items[0].sleepHours, 7.5);
  });

  test("deux dates differentes restent deux entrees", async () => {
    const etat = etatSimule();
    const api = journalDuJourApi(CLE, etat.items, etat.setItems);
    const apres = await api.upsert("2026-09-05", { weightKg: 78 });
    await journalDuJourApi(CLE, apres, etat.setItems).upsert("2026-09-06", { weightKg: 78.2 });

    assert.equal(etat.items.length, 2);
  });

  test("l'entree du jour se retrouve par sa date", () => {
    const items = [{ id: "a", date: "2026-09-04" }, { id: "b", date: "2026-09-05" }];
    const api = journalDuJourApi(CLE, items, () => {});
    assert.equal(api.getForDate("2026-09-05").id, "b");
    assert.equal(api.getForDate("2026-01-01"), null, "une date sans entrée doit renvoyer null");
  });

  test("la saisie est ecrite dans le stockage", () => {
    const etat = etatSimule();
    journalDuJourApi(CLE, etat.items, etat.setItems).upsert("2026-09-05", { weightKg: 78.4 });
    assert.equal(charger(CLE, [])[0].weightKg, 78.4);
  });
});
