/**
 * Recherche d'aliments.
 *
 * Portage de searchOpenFoodFacts et mapOFFProduct (index.html, 1470-1500).
 *
 * Deux sources se combinent, et l'ordre compte :
 *
 * 1. LE CATALOGUE LOCAL, installe par food-basic-catalog.js dans
 *    window.__CN_FOOD_SEARCH__. Il contient 649 aliments bruts, disponibles
 *    hors ligne et immediatement.
 * 2. OPEN FOOD FACTS pour les produits de marque, quand le reseau repond.
 *
 * Le catalogue local passe en premier volontairement : ses valeurs sont
 * verifiees, la ou Open Food Facts est alimente par ses contributeurs et
 * contient des fiches incompletes ou fausses. Chercher « riz » doit donner
 * du riz, pas une preparation de riz au lait d'une marque quelconque.
 *
 * Une panne d'Open Food Facts n'empeche jamais la recherche : le catalogue
 * local suffit a saisir un repas.
 */

import { round } from "./dates.js";
import { trierSelonPesee } from "./fibres.js";

/** Champs demandes a Open Food Facts. */
const CHAMPS_OFF = "code,product_name,product_name_fr,brands,nutriments,serving_quantity";

const URL_OFF = "https://world.openfoodfacts.org/cgi/search.pl";

/** Ramene une fiche Open Food Facts au format de l'application. */
export function convertirProduitOFF(p) {
  const n = p.nutriments || {};
  let kcal100 = n["energy-kcal_100g"];
  // Certaines fiches ne donnent que des kilojoules.
  if (kcal100 == null && n["energy_100g"] != null) kcal100 = n["energy_100g"] / 4.184;

  return {
    code: p.code,
    name: p.product_name_fr || p.product_name || "Produit",
    brand: (p.brands || "").split(",")[0].trim(),
    kcal100: kcal100 != null ? Math.round(kcal100) : null,
    p100: n.proteins_100g != null ? round(n.proteins_100g, 1) : 0,
    c100: n.carbohydrates_100g != null ? round(n.carbohydrates_100g, 1) : 0,
    f100: n.fat_100g != null ? round(n.fat_100g, 1) : 0,
    // Les fibres restent NULLES quand la fiche ne les donne pas : la
    // plupart des fiches Open Food Facts ne les renseignent pas, et
    // ecrire 0 affirmerait que le produit n'en contient aucune.
    fibres100: n.fiber_100g != null ? round(n.fiber_100g, 1) : null,
    serving: p.serving_quantity ? parseFloat(p.serving_quantity) : null
  };
}

/** Resultats du catalogue local, s'il est installe. */
export function chercherLocalement(requete, env = globalThis) {
  const moteur = env.__CN_FOOD_SEARCH__;
  if (typeof moteur !== "function") return [];
  const fibres = env.__CN_FOOD_FIBRES__ || {};
  const etats = env.__CN_FOOD_ETATS__ || {};
  try {
    return (moteur(requete) || []).map((r) => {
      const brut = r.item || r;
      const produit = convertirProduitOFF(brut);
      // La table de fibres est indexee par code d'aliment. Un aliment
      // absent garde fibres100 a null : teneur inconnue, pas teneur nulle.
      const teneur = fibres[brut.code];
      return {
        ...produit,
        fibres100: teneur != null ? teneur : produit.fibres100,
        // « cru » ou « cuit » : c'est la plus grosse source d'erreur du
        // journal, et elle est invisible sans cette mention.
        etat: etats[brut.code] || null
      };
    });
  } catch (e) {
    // Un moteur en panne ne doit pas empecher la recherche en ligne.
    return [];
  }
}

/**
 * Recherche complete : catalogue local d'abord, Open Food Facts ensuite.
 *
 * Les doublons sont ecartes sur le nom normalise : un aliment present dans
 * les deux sources n'apparait qu'une fois, dans sa version locale.
 */
export async function chercherAliments(requete, env = globalThis, habitudePesee = null) {
  const texte = String(requete || "").trim();
  if (!texte) return [];

  const locaux = chercherLocalement(texte, env);

  let distants = [];
  try {
    const url =
      URL_OFF +
      "?search_terms=" +
      encodeURIComponent(texte) +
      "&search_simple=1&action=process&json=1&page_size=12&fields=" +
      CHAMPS_OFF;
    const reponse = await (env.fetch || fetch)(url);
    if (reponse.ok) {
      const donnees = await reponse.json();
      distants = (donnees.products || []).map(convertirProduitOFF);
    }
  } catch (e) {
    // Hors ligne, ou Open Food Facts indisponible : le catalogue local
    // suffit a saisir un repas.
  }

  const normaliser = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();

  const vus = new Set();
  const resultats = [...locaux, ...distants]
    .filter((p) => p.kcal100 != null)
    .filter((p) => {
      const cle = normaliser(p.name);
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    });

  // Le client pese-t-il ses feculents crus ou cuits ? Les fiches qui
  // correspondent a son habitude remontent : sans cela, il prend le
  // premier resultat, et l'ordre du catalogue decide a sa place.
  return trierSelonPesee(resultats, habitudePesee);
}

/**
 * Fiche produit a partir d'un code-barres.
 *
 * Rend null si le code est inconnu, ou si la fiche existe mais n'a pas de
 * valeur energetique : une fiche sans calories ne sert a rien dans un
 * journal alimentaire, autant dire au client que le produit est introuvable
 * que de lui ajouter une ligne a 0 kcal.
 */
export async function chercherParCodeBarres(code, env = globalThis) {
  const url =
    "https://world.openfoodfacts.org/api/v2/product/" +
    encodeURIComponent(code) +
    ".json?fields=" +
    CHAMPS_OFF;
  const reponse = await (env.fetch || fetch)(url);
  if (!reponse.ok) return null;
  const donnees = await reponse.json();
  if (!donnees.product) return null;
  const produit = convertirProduitOFF(donnees.product);
  return produit.kcal100 != null ? produit : null;
}
