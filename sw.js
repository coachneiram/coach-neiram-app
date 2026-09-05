/**
 * Coach Neiram — service worker.
 *
 * Objectif : que l'application se lance et reste utilisable sans reseau.
 * Les clients s'en servent en salle, ou la connexion passe souvent mal.
 *
 * ─────────────────────────────────────────────────────────────────────
 * PRINCIPE DE PRUDENCE
 * ─────────────────────────────────────────────────────────────────────
 * Un service worker s'installe durablement sur l'appareil du client. Mal
 * concu, il peut le bloquer sur une version cassee, a distance et sans
 * recours simple. Trois garde-fous ici :
 *
 * 1. index.html passe TOUJOURS par le reseau en premier. Une version
 *    corrigee est donc prise en compte des le chargement suivant, sans
 *    attendre l'expiration d'un cache.
 * 2. Aucune requete applicative n'est interceptee : proxy, Gemini, script
 *    coach, Open Food Facts passent directement au reseau. Le service
 *    worker ne peut donc pas fausser une donnee de suivi.
 * 3. Un interrupteur d'arret est documente en fin de fichier.
 *
 * ─────────────────────────────────────────────────────────────────────
 * MISE A JOUR
 * ─────────────────────────────────────────────────────────────────────
 * Incremente VERSION a chaque changement de la liste des ressources. Les
 * anciens caches sont supprimes automatiquement a l'activation.
 */

const VERSION = "v2";
const CACHE = "coach-neiram-" + VERSION;

/**
 * Ressources indispensables au demarrage, mises en cache a l'installation.
 *
 * Cette liste ne contient QUE les fichiers dont le nom est stable. Le code
 * de l'application, lui, porte une empreinte qui change a chaque
 * construction (assets/index-CnbfxMEa.js) : il est impossible de l'ecrire
 * ici, et c'est justement le piege — une liste figee laisserait le code de
 * l'application hors du cache, et le premier lancement hors ligne
 * afficherait une page blanche, sans erreur.
 *
 * Ces fichiers-la sont donc lus dans MANIFESTE_ASSETS, produit par la
 * construction.
 */
const RESSOURCES_LOCALES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./food-basic-catalog.js",
  "./food-bruts-catalog.js",
  "./food-extended-catalog.js",
  "./food-staples-catalog.js",
  "./favicon.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png"
];

/** Liste des fichiers empreintes, ecrite par la construction. */
const MANIFESTE_ASSETS = "./assets-manifest.json";

/**
 * Fichiers de l'application a mettre en cache, lus dans le manifeste.
 *
 * Un manifeste absent ou illisible ne doit pas faire echouer l'installation :
 * l'application reste utilisable en ligne, et la strategie de revalidation
 * remplira le cache au premier passage. Mieux vaut un mode hors ligne
 * degrade qu'un service worker qui refuse de s'installer.
 */
async function assetsDuManifeste() {
  try {
    const reponse = await fetch(MANIFESTE_ASSETS, { cache: "no-cache" });
    if (!reponse.ok) return [];
    const liste = await reponse.json();
    return Array.isArray(liste) ? liste.filter((x) => typeof x === "string") : [];
  } catch (e) {
    return [];
  }
}

/**
 * Origines externes figees : les polices.
 *
 * React n'y figure plus. L'application le chargeait depuis cdnjs par une
 * balise <script> ; il est desormais inclus dans le fichier construit, donc
 * couvert par le manifeste et disponible hors ligne sans dependre d'un CDN.
 *
 * Les urls de polices contiennent une empreinte : leur contenu ne change
 * jamais, un cache d'abord est sur.
 */
const ORIGINES_CACHABLES = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

/**
 * Decide quoi faire d'une requete.
 *
 * Fonction pure, isolee volontairement : c'est elle qui est testee, sans
 * avoir a simuler tout l'environnement d'un service worker.
 *
 * @returns {"ignorer"|"reseau-d-abord"|"revalidation"|"cache-d-abord"}
 */
function strategiePour({ method, url, mode, origineApp }) {
  // Tout ce qui n'est pas une lecture part au reseau sans interception :
  // c'est le cas des pointages envoyes au proxy.
  if (method !== "GET") return "ignorer";

  let cible;
  try {
    cible = new URL(url);
  } catch (e) {
    return "ignorer";
  }

  const memeOrigine = cible.origin === origineApp;

  if (memeOrigine) {
    // La page elle-meme : toujours le reseau d'abord, pour qu'un correctif
    // parvienne au client des le chargement suivant.
    if (mode === "navigate" || cible.pathname.endsWith(".html") || cible.pathname === "/") {
      return "reseau-d-abord";
    }
    // Le reste des fichiers de l'application : affichage immediat depuis le
    // cache, mise a jour en arriere-plan.
    return "revalidation";
  }

  // Ressources externes figees (React, polices) : cache d'abord.
  if (ORIGINES_CACHABLES.includes(cible.origin)) return "cache-d-abord";

  // Tout le reste — proxy, Gemini, script coach, Open Food Facts, YouTube —
  // n'est jamais intercepte.
  return "ignorer";
}

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    Promise.all([caches.open(CACHE), assetsDuManifeste()]).then(([cache, assets]) =>
      // addAll echoue en bloc si une seule ressource manque : on ajoute donc
      // une par une, pour qu'une icone absente n'empeche pas l'installation.
      Promise.all(
        RESSOURCES_LOCALES.concat(assets).map((ressource) =>
          cache.add(ressource).catch(() => {
            /* ressource indisponible : on continue sans elle */
          })
        )
      )
    )
  );
  // Prend la main sans attendre la fermeture des onglets ouverts : combine
  // au reseau d'abord sur index.html, cela rend les correctifs immediats.
  self.skipWaiting();
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all(
          noms
            .filter((nom) => nom.startsWith("coach-neiram-") && nom !== CACHE)
            .map((nom) => caches.delete(nom))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  const strategie = strategiePour({
    method: requete.method,
    url: requete.url,
    mode: requete.mode,
    origineApp: self.location.origin
  });

  if (strategie === "ignorer") return;

  if (strategie === "reseau-d-abord") {
    evenement.respondWith(
      fetch(requete)
        .then((reponse) => {
          if (reponse && reponse.ok) {
            const copie = reponse.clone();
            caches.open(CACHE).then((cache) => cache.put(requete, copie));
          }
          return reponse;
        })
        .catch(() =>
          caches.match(requete).then((cache) => cache || caches.match("./index.html"))
        )
    );
    return;
  }

  if (strategie === "cache-d-abord") {
    evenement.respondWith(
      caches.match(requete).then(
        (cache) =>
          cache ||
          fetch(requete).then((reponse) => {
            if (reponse && reponse.ok) {
              const copie = reponse.clone();
              caches.open(CACHE).then((c) => c.put(requete, copie));
            }
            return reponse;
          })
      )
    );
    return;
  }

  // revalidation : on sert le cache tout de suite et on rafraichit derriere.
  evenement.respondWith(
    caches.match(requete).then((cache) => {
      const reseau = fetch(requete)
        .then((reponse) => {
          if (reponse && reponse.ok) {
            const copie = reponse.clone();
            caches.open(CACHE).then((c) => c.put(requete, copie));
          }
          return reponse;
        })
        .catch(() => cache);
      return cache || reseau;
    })
  );
});

/**
 * ─────────────────────────────────────────────────────────────────────
 * INTERRUPTEUR D'ARRET
 * ─────────────────────────────────────────────────────────────────────
 * Si le mode hors ligne pose probleme, remplacer TOUT le contenu de ce
 * fichier par les quatre lignes ci-dessous, puis publier. Au chargement
 * suivant, chaque client desinstallera son service worker et videra ses
 * caches, et l'application reviendra a son fonctionnement d'origine.
 *
 *   self.addEventListener("install", () => self.skipWaiting());
 *   self.addEventListener("activate", (e) => e.waitUntil(
 *     caches.keys().then((n) => Promise.all(n.map((c) => caches.delete(c))))
 *       .then(() => self.registration.unregister())
 *       .then(() => self.clients.claim())));
 *
 * Ne jamais supprimer purement et simplement sw.js : les navigateurs
 * garderaient l'ancienne version deja installee.
 */

// Expose la logique de routage pour les tests. Sans effet en production.
if (typeof self !== "undefined") {
  self.__SW_TEST__ = { strategiePour, assetsDuManifeste, VERSION, CACHE, RESSOURCES_LOCALES, MANIFESTE_ASSETS, ORIGINES_CACHABLES };
}
