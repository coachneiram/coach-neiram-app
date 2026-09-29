/**
 * Reconnaissance d'un aliment par photo ou code-barres.
 *
 * Portage de stripJsonFences, extractJsonObject, readBarcodeFromImage et
 * analyzeMealPhoto (index.html 1463-1553).
 *
 * Deux usages distincts :
 *
 * - LE CODE-BARRES sert a identifier un produit emballe. Le lecteur natif du
 *   navigateur passe en premier : il est instantane, gratuit, et fonctionne
 *   hors ligne. L'IA n'intervient qu'en secours, sur les navigateurs qui
 *   n'ont pas BarcodeDetector (Safari, notamment).
 * - LA PHOTO DE REPAS sert a estimer une assiette qui n'a pas d'etiquette.
 *   Le resultat est une estimation, jamais une mesure : l'interface le dit,
 *   et laisse le client corriger les valeurs avant d'ajouter.
 */

import { num } from "./dates.js";
import { genererTexte } from "./ia.js";

/** Retire les balises de bloc de code dont les modeles entourent leur JSON. */
export function retirerBalisesJson(texte) {
  return String(texte).replace(/```json|```/g, "").trim();
}

/**
 * Isole l'objet JSON d'une reponse bavarde.
 *
 * Un modele repond regulierement « Voici l'analyse : {...} J'espere que
 * cela aide. » Plutot que d'echouer, on garde ce qui se trouve entre la
 * premiere accolade ouvrante et la derniere fermante.
 */
export function extraireObjetJson(texte) {
  const propre = retirerBalisesJson(texte);
  const debut = propre.indexOf("{");
  const fin = propre.lastIndexOf("}");
  if (debut === -1 || fin === -1 || fin < debut) return propre;
  return propre.slice(debut, fin + 1);
}

const FORMATS_CODE = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

const CONSIGNE_CODE =
  "Lis le code-barres (EAN/UPC) visible sur cette photo, y compris les chiffres imprimés dessous. " +
  "Réponds UNIQUEMENT avec les chiffres du code, rien d'autre. Si aucun code n'est lisible, réponds NONE.";

/**
 * Lit un code-barres sur une photo. Rend null si rien n'est lisible.
 *
 * L'appel IA est encadre a 60 jetons : la reponse attendue tient en une
 * dizaine de chiffres, et un modele qui part en explication ne sert a rien
 * ici.
 */
export async function lireCodeBarres(dataUrl, env = typeof window !== "undefined" ? window : undefined) {
  if (env && "BarcodeDetector" in env) {
    try {
      const img = new env.Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = dataUrl;
      });
      const lecteur = new env.BarcodeDetector({ formats: FORMATS_CODE });
      const trouves = await lecteur.detect(img);
      if (trouves && trouves.length) return trouves[0].rawValue;
    } catch (e) {
      // Lecteur natif en echec : on retombe sur l'IA plus bas.
    }
  }

  const texte = await genererTexte({
    prompt: CONSIGNE_CODE,
    images: [dataUrl],
    maxTokens: 512
  });

  // Les codes-barres alimentaires font 8 a 14 chiffres (EAN-8 a GTIN-14).
  const trouve = texte.replace(/\s/g, "").match(/\d{8,14}/);
  return trouve ? trouve[0] : null;
}

const CONSIGNE_REPAS = `Analyse cette photo de repas. Estime la portion visible et ses apports nutritionnels.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, au format exact :
{"name":"nom court du plat en français","portion":"description courte de la portion estimée","calories":0,"protein":0,"carbs":0,"fat":0,"confidence":"faible|moyenne|haute"}
Les valeurs sont des nombres entiers (kcal et grammes) correspondant à la portion visible sur la photo.`;

/**
 * Lit l'estimation JSON rendue par le modele. Commun a la photo et a la
 * description : memes champs, memes valeurs de repli, meme refus de
 * continuer sur une reponse qui n'est pas du JSON.
 */
function lireEstimation(texte, nomParDefaut, origine) {
  let analyse;
  try {
    analyse = JSON.parse(extraireObjetJson(texte));
  } catch (e) {
    // La reponse brute est la seule piste exploitable pour comprendre.
    console.error(`[Coach Neiram] ${origine} — réponse IA non-JSON:`, texte);
    throw e;
  }

  return {
    name: String(analyse.name || nomParDefaut),
    portion: String(analyse.portion || ""),
    calories: Math.round(num(analyse.calories)),
    protein: Math.round(num(analyse.protein)),
    carbs: Math.round(num(analyse.carbs)),
    fat: Math.round(num(analyse.fat)),
    confidence: String(analyse.confidence || "moyenne")
  };
}

/** Estime les apports d'une assiette photographiee. */
export async function analyserPhotoRepas(dataUrl) {
  const texte = await genererTexte({
    prompt: CONSIGNE_REPAS,
    images: [dataUrl],
    maxTokens: 900
  });
  return lireEstimation(texte, "Repas (photo)", "Photo repas");
}

/** Attente maximale de l'estimation d'une description, en millisecondes. */
export const DELAI_DESCRIPTION_MS = 30000;

/** Au-dela, ce n'est plus la description d'un repas. */
export const LONGUEUR_MAX_DESCRIPTION = 600;

/**
 * Consigne pour un repas decrit en mots, tape ou dicte.
 *
 * Ajout posterieur a la bascule, d'apres MyFitnessPal et Lifesum (saisie
 * vocale) : « deux oeufs brouilles, une tartine de pain complet, un cafe »
 * suffit, sans chercher chaque aliment. Une dictee arrive souvent sans
 * ponctuation ni majuscules : la consigne le dit au modele. Les quantites
 * absentes sont estimees en portions courantes, ce que le client verifie
 * ensuite, comme pour la photo.
 */
export function consigneDescription(description) {
  const texte = String(description || "").trim().slice(0, LONGUEUR_MAX_DESCRIPTION);
  return `Un client décrit ce qu'il a mangé, en français, parfois dicté à la voix donc sans ponctuation :
« ${texte} »
Estime les apports nutritionnels de l'ensemble de ce repas. Quand une quantité n'est pas précisée, prends une portion courante pour un adulte.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, au format exact :
{"name":"nom court du repas en français","portion":"quantités retenues, en bref","calories":0,"protein":0,"carbs":0,"fat":0,"confidence":"faible|moyenne|haute"}
Les valeurs sont des nombres entiers (kcal et grammes) pour tout ce qui est décrit.`;
}

/** Estime les apports d'un repas decrit en mots. */
export async function analyserDescriptionRepas(description) {
  if (!String(description || "").trim()) throw new Error("description-vide");
  const texte = await genererTexte({
    prompt: consigneDescription(description),
    maxTokens: 900,
    delaiMs: DELAI_DESCRIPTION_MS
  });
  return lireEstimation(texte, "Repas (description)", "Description repas");
}
