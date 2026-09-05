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

const VERSION = "v1";
const CACHE = "coach-neiram-" + VERSION;

/** Ressources indispensables au demarrage, mises en cache a l'installation. */
const RESSOURCES_LOCALES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./food-basic-catalog.js",
  "./food-extended-catalog.js",
  "./food-staples-catalog.js",
  "./favicon.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png"
];

/**
 * React, precache explicitement.
 *
 * Sans lui, rien ne s'affiche : l'application entiere en depend. Le precache
 * est indispensable ici, et pas seulement souhaitable. Une balise <script src>
 * emet une requete « no-cors » dont la reponse est opaque ; le service worker
 * ne peut ni la valider ni la conserver sereinement. En passant par cache.add
 * a l'installation, la requete part en mode « cors » — cdnjs l'autorise — et
 * la reponse obtenue est une vraie reponse, verifiable et rejouable hors ligne.
 *
 * Ces urls contiennent le numero de version : leur contenu ne change jamais.
 * Elles doivent rester alignees avec les balises <script> de index.html.
 */
const RESSOURCES_REACT = [
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"
];

/**
 * Origines externes necessaires au fonctionnement : React et les polices.
 * Leurs urls contiennent un numero de version, donc leur contenu ne change
 * jamais : un cache d'abord est sur.
 */
const ORIGINES_CACHABLES = [
  "https://cdnjs.cloudflare.com",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com"
];

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
    caches.open(CACHE).then((cache) =>
      // addAll echoue en bloc si une seule ressource manque : on ajoute donc
      // une par une, pour qu'une icone absente n'empeche pas l'installation.
      Promise.all(
        RESSOURCES_LOCALES.concat(RESSOURCES_REACT).map((ressource) =>
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
  self.__SW_TEST__ = { strategiePour, VERSION, CACHE, RESSOURCES_LOCALES, RESSOURCES_REACT, ORIGINES_CACHABLES };
}
