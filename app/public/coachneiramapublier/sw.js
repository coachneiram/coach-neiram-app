/**
 * Service worker de SAUVETAGE — ancienne adresse /coachneiramapublier/.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI CE DOSSIER EXISTE
 * ─────────────────────────────────────────────────────────────────────
 * Avant le 5 septembre 2026, un envoi par l'interface GitHub a publie une
 * COPIE de l'application a cette adresse, avec son propre service worker
 * (commit fafcd65, qui l'a supprimee). Des clientes ont installe l'appli
 * depuis ce lien-la.
 *
 * Leur telephone garde donc un service worker rattache a CETTE adresse.
 * Une fois la copie supprimee, il ne trouvait plus jamais de mise a jour :
 * le navigateur recevait une 404 pour sw.js, et une 404 ne desinstalle pas
 * un service worker — il reste en place et continue de servir l'ancienne
 * application depuis son cache. Indefiniment : fermer, rouvrir, attendre
 * n'y change rien, et aucun correctif publie a la bonne adresse ne les
 * atteint. Signale deux fois sur Android : pas de crayon pour corriger un
 * aliment, pas de bouton « Photographier » — deux fonctions qui
 * n'existaient pas dans l'ancienne application.
 *
 * ─────────────────────────────────────────────────────────────────────
 * CE QU'IL FAIT
 * ─────────────────────────────────────────────────────────────────────
 * Le navigateur verifie sw.js a chaque lancement. Il trouve desormais ce
 * fichier, au contenu different : il l'installe a la place de l'ancien,
 * sans intervention de la cliente. A l'activation :
 *
 *   1. il prend le controle des fenetres ouvertes. Celles que l'ancien
 *      controlait lui reviennent d'office ; claim() rattache les AUTRES
 *      (une page chargee pendant que l'ancien ne repondait plus), qu'il
 *      ne pourrait pas rediriger sinon — navigate() refuse une fenetre
 *      qu'on ne controle pas ;
 *   2. il vide les caches de l'application, qui contiennent l'ancienne
 *      version ;
 *   3. il se desinstalle ;
 *   4. il renvoie chaque fenetre vers la vraie application, un dossier
 *      plus haut.
 *
 * Il n'intercepte AUCUNE requete (pas d'ecouteur « fetch ») : plus rien ne
 * peut etre servi depuis l'ancien cache, meme si une etape echoue.
 *
 * Supprimer ce dossier referait le piege. Il doit rester publie tant
 * qu'une installation ancienne peut exister.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

/**
 * Les caches portent tous ce prefixe (voir sw.js a la racine). Le stockage
 * des caches est commun a tout le site, pas a une adresse : vider ceux-ci
 * vide aussi celui de l'application actuelle, qui se reremplit tout seul au
 * prochain chargement en ligne. C'est le prix d'une purge sure — viser une
 * version precise obligerait a tenir deux fichiers synchronises.
 */
const PREFIXE_CACHES = "coach-neiram-";

async function sauver() {
  await self.clients.claim();

  const noms = await caches.keys();
  await Promise.all(noms.filter((nom) => nom.startsWith(PREFIXE_CACHES)).map((nom) => caches.delete(nom)));

  await self.registration.unregister();

  // « ../ » depuis l'ancienne adresse : la racine de l'application actuelle.
  const destination = new URL("../", self.registration.scope).href;
  const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(
    fenetres.map((fenetre) =>
      // Une fenetre qui refuse (onglet deja ferme) ne doit pas empecher
      // les autres d'etre redirigees.
      fenetre.navigate(destination).catch(() => {})
    )
  );
}

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(sauver());
});

// Expose la logique pour les tests. Sans effet en production.
self.__SAUVETAGE_TEST__ = { sauver, PREFIXE_CACHES };
