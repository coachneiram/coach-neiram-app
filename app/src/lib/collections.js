/**
 * Acces aux collections de donnees du client.
 *
 * Portage fidele de makeCollectionApi (index.html, ligne 528) et
 * makeDayApi (560).
 *
 * Deux formes de donnees coexistent :
 *  - les COLLECTIONS, ou chaque entree est independante et identifiee
 *    (repas, seances, plats, mensurations) ;
 *  - les JOURNAUX DU JOUR, ou il existe au plus une entree par date
 *    (poids du jour, forme du jour). Les ecrire deux fois pour la meme
 *    date ecraserait la premiere : d'ou l'operation « upsert ».
 *
 * Chaque ecriture met a jour l'etat affiche PUIS le stockage. L'inverse
 * ferait clignoter l'interface le temps de l'ecriture.
 */

import { enregistrer } from "./stockage.js";
import { uid } from "./semaine.js";

/**
 * Collection d'entrees identifiees.
 *
 * `items` est fige au rendu : c'est la raison d'etre de `ajouterPlusieurs`.
 * Appeler `ajouter` en boucle repartirait a chaque fois du meme `items`
 * d'origine, et seule la derniere entree survivrait — panne silencieuse
 * et tres desagreable a diagnostiquer.
 */
export function collectionApi(cle, items, setItems) {
  const ecrire = (suivant) => {
    setItems(suivant);
    enregistrer(cle, suivant);
    return suivant;
  };

  return {
    items,

    add: async (entree) => ecrire([{ ...entree, id: uid() }, ...items]),

    addMany: async (entrees) => {
      const nouvelles = (entrees || []).map((e) => ({ ...e, id: uid() }));
      if (!nouvelles.length) return items;
      return ecrire([...nouvelles, ...items]);
    },

    update: async (id, modifications) =>
      ecrire(items.map((it) => (it.id === id ? { ...it, ...modifications } : it))),

    remove: async (id) => ecrire(items.filter((it) => it.id !== id))
  };
}

/** Journal a une entree par date : poids du jour, forme du jour. */
export function journalDuJourApi(cle, items, setItems) {
  const ecrire = (suivant) => {
    setItems(suivant);
    enregistrer(cle, suivant);
    return suivant;
  };

  return {
    items,

    getForDate: (date) => items.find((it) => it.date === date) || null,

    upsert: async (date, modifications) => {
      const existe = items.some((it) => it.date === date);
      return ecrire(
        existe
          ? items.map((it) => (it.date === date ? { ...it, ...modifications } : it))
          : [...items, { id: uid(), date, ...modifications }]
      );
    },

    remove: async (id) => ecrire(items.filter((it) => it.id !== id))
  };
}
