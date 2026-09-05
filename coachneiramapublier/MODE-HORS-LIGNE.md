# Mode hors ligne

L'application se lance et reste utilisable sans réseau. Utile en salle, où la
connexion passe souvent mal.

## Ce qui fonctionne sans réseau

- Le lancement de l'application
- Le journal, les repas, les entraînements, les mensurations, le sommeil
- Les catalogues alimentaires locaux
- Tout ce qui est déjà enregistré sur l'appareil

## Ce qui ne fonctionne pas sans réseau

Ces fonctions ont besoin d'un serveur, et affichent leur message d'erreur
habituel :

- Photo de repas, chatbot nutrition, lecture de code-barres, bilans IA
- Recherche Open Food Facts
- Envoi des pointages au coach — **ils ne sont pas perdus** : ils restent en
  file d'attente et repartent dès le retour du réseau

## Vérifier que ça marche

1. Ouvre l'application, laisse-la charger complètement, **puis recharge une fois**
   (la mise en cache se fait au premier chargement)
2. Active le mode avion
3. Ferme complètement l'application et rouvre-la

Elle doit se lancer normalement. Sans le mode hors ligne, tu aurais une page
d'erreur du navigateur.

4. Note un repas hors ligne, puis désactive le mode avion : la donnée est là.

## Comment les mises à jour arrivent

`index.html` est **toujours** demandé au réseau en premier. Une correction
publiée est donc prise en compte dès le chargement suivant, sans attendre
l'expiration d'un cache.

C'est le garde-fou principal : aucun client ne peut rester bloqué sur une
version cassée tant qu'il a du réseau.

## Si ça pose problème

Remplace **tout** le contenu de `sw.js` par ceci, puis publie :

```js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys()
      .then((n) => Promise.all(n.map((c) => caches.delete(c))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  )
);
```

Au chargement suivant, chaque appareil désinstalle son mode hors ligne et vide
son cache. L'application revient à son fonctionnement d'avant.

⚠️ **Ne supprime jamais purement et simplement `sw.js`** : les navigateurs
garderaient la version déjà installée sur l'appareil, sans moyen de la déloger.

## Après une modification de l'application

Si tu changes la liste des fichiers de l'application (nouveau catalogue, nouvelle
icône), incrémente `VERSION` en haut de `sw.js` (`"v1"` → `"v2"`). Les anciens
caches sont alors supprimés automatiquement.

Une modification de `index.html` seul ne demande rien : il n'est jamais servi
depuis le cache en priorité.
