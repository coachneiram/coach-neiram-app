/**
 * Outils de test partages (repris du harnais de l'app coach, sans le
 * chargement de l'ancien index.html).
 */

/**
 * localStorage en memoire, avec la meme surface que celle du navigateur.
 *
 * Subtilite : l'application inventorie les donnees via `Object.keys(localStorage)`.
 * Un objet ordinaire renverrait ses methodes au lieu des cles stockees. Un Proxy
 * reproduit fidelement le comportement du navigateur, ou les cles sont exposees
 * comme des proprietes enumerables.
 */
export function creerLocalStorage(initial = {}) {
  const donnees = new Map(Object.entries(initial));
  const api = {
    getItem: (k) => (donnees.has(k) ? donnees.get(k) : null),
    setItem: (k, v) => donnees.set(k, String(v)),
    removeItem: (k) => donnees.delete(k),
    clear: () => donnees.clear(),
    key: (i) => Array.from(donnees.keys())[i] ?? null,
    get length() {
      return donnees.size;
    },
    __donnees: donnees
  };
  return new Proxy(api, {
    get: (cible, prop) =>
      prop in cible ? cible[prop] : donnees.has(prop) ? donnees.get(prop) : undefined,
    has: (cible, prop) => prop in cible || donnees.has(prop),
    ownKeys: () => Array.from(donnees.keys()),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true })
  });
}
