/* Coach Neiram — chargeur.
   L'ancien contenu de ce fichier (3e interception fetch, requête Open Food
   Facts supplémentaire pour les fruits/légumes, reclassement redondant) a été
   retiré : le classement aliment brut > courant > plat préparé est désormais
   assuré par le moteur unique de food-basic-catalog.js.
   Ce fichier ne fait plus que charger les outils de la liste de courses. */
(() => {
  if (window.__CN_TOOLS_LOADED__) return;
  window.__CN_TOOLS_LOADED__ = true;
  const load = () => {
    const s = document.createElement('script');
    s.src = 'shopping-list-tools.js';
    s.async = false;
    (document.body || document.documentElement).appendChild(s);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
