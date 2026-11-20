/**
 * Photos des recettes du Menu de la semaine, tirees de la banque d'images
 * libre Pexels (licence gratuite, attribution affichee par courtoisie).
 * Reprises de l'app Neiram (PR #76, 20/11/2026).
 *
 * - Recettes du coach : photo choisie a la main ci-dessous (verifiee sur
 *   une planche dans l'app Neiram). Les recettes ajoutees ensuite par la
 *   routine « Recettes hebdo » en recoivent une par recherche, a partir de
 *   leur nom.
 * - Recettes du menu sur mesure : l'IA fournit quelques mots en anglais
 *   (champ `photo`), cherches par le Worker.
 *
 * Le telephone ne parle qu'au Worker du coach (routes GET /photo et
 * /photo/img/…, worker/coach-neiram-proxy.js) : ni Pexels ni personne ne
 * voit qui regarde. Les resultats sont gardes sur le telephone
 * (cn_photos_recettes, dans la sauvegarde ; rien de personnel).
 */

import { PROXY_BASE_URL } from "./config.js";
import { charger, enregistrer } from "./stockage.js";

export const CLE_PHOTOS_RECETTES = "cn_photos_recettes";
const MAX_GARDEES = 300;

/**
 * Recettes du coach (lib/recettes-coach-catalogue.js) → photo Pexels.
 * Memes identifiants que dans l'app Neiram (verifie par
 * tests/photos-recettes.test.mjs).
 */
export const PHOTOS_RECETTES_COACH = {
  "2026-10-05-tofu-brouille-legumes-pain-complet": { id: 6327660, ext: "jpeg", auteur: "Tima Miroshnichenko" },
  "2026-10-05-chili-sin-carne-haricots-riz-complet": { id: 28286173, ext: "jpeg", auteur: "Nic Wood" },
  "2026-10-05-cookies-avoine-banane-chocolat-vegan": { id: 13184915, ext: "jpeg", auteur: "Angela Khebou" },
  "2026-10-05-poulet-tandoori-riz-basmati-concombre": { id: 31860139, ext: "jpeg", auteur: "shubham howal" },
  "2026-10-05-salade-pommes-de-terre-sardines-haricots-verts": { id: 5670958, ext: "jpeg", auteur: "douglas  miller" },
  "2026-10-05-boeuf-saute-thai-nouilles-de-riz": { id: 34723310, ext: "jpeg", auteur: "UNDO KIM" },
  "2026-10-05-shake-prise-banane-avoine-cacahuete": { id: 18142614, ext: "jpeg", auteur: "Denys Gromov" },
  "2026-10-05-salade-quinoa-feta-concombre-pois-chiches": { id: 5639353, ext: "jpeg", auteur: "Shameel mukkath" },
  "2026-10-05-pates-bolognaise-boeuf-allegee": { id: 30406652, ext: "jpeg", auteur: "Ruslan Kruglov" },
  "2026-10-05-tajine-poulet-pois-chiches-abricots-semoule": { id: 18496584, ext: "jpeg", auteur: "Sateesh Polkam" },
  "2026-10-05-colin-ratatouille-riz-complet": { id: 36040965, ext: "jpeg", auteur: "Edita Brus" },
  "2026-10-05-bol-fromage-blanc-kiwi-pomme-noix": { id: 20175008, ext: "jpeg", auteur: "Pervane Mustafa27" },
  "2026-09-28-filet-mignon-porc-pommes-de-terre-haricots": { id: 12317993, ext: "jpeg", auteur: "Jordan Rushton" },
  "2026-09-28-omelette-jambon-champignons-pain-complet": { id: 5840304, ext: "jpeg", auteur: "ROMAN ODINTSOV" },
  "2026-09-28-lentilles-vertes-saucisse-fumee-carottes": { id: 36865008, ext: "jpeg", auteur: "Patrick Nizan" },
  "2026-09-28-curry-pois-chiches-epinards-coco": { id: 10999800, ext: "jpeg", auteur: "Qnula" },
  "2026-09-28-cabillaud-papillote-courgettes-boulgour": { id: 11044248, ext: "jpeg", auteur: "Sylwester Ficek" },
  "2026-09-28-burrito-boeuf-haricots-rouges": { id: 14866628, ext: "jpeg", auteur: "Nadin Sh" },
  "2026-09-28-bol-tempeh-quinoa-patate-douce": { id: 6978186, ext: "jpeg", auteur: "Heather Brock" },
  "2026-09-28-escalope-dinde-quinoa-haricots-verts": { id: 25315523, ext: "jpeg", auteur: "Nadin Sh" },
  "2026-09-28-pates-completes-thon-tomates-olives": { id: 35123972, ext: "jpeg", auteur: "Milton Das" },
  "2026-09-28-pancakes-avoine-banane-vegan": { id: 30882594, ext: "jpeg", auteur: "Gamze Nur" },
  "2026-09-28-parmentier-patate-douce-saumon": { id: 20182290, ext: "jpeg", auteur: "Valeria Boltneva" },
  "2026-09-28-shakshuka-oeufs-pois-chiches": { id: 39833278, ext: "jpeg", auteur: "Jahra Tasfia Reza" },
  "2026-09-28-poelee-crevettes-courgettes-riz": { id: 15615007, ext: "jpeg", auteur: "FOX ^.ᆽ.^= ∫" },
  "2026-09-28-energy-balls-dattes-cacao-amande": { id: 27850074, ext: "jpeg", auteur: "Livilla Latini" },
  "2026-09-28-mousse-skyr-cacao-fruits-rouges": { id: 3810779, ext: "jpeg", auteur: "Vladimir Srajber" },
  "2026-10-01-dahl-lentilles-corail-epinards": { id: 33430562, ext: "jpeg", auteur: "Anil  Sharma" },
  "2026-10-01-bowl-poulet-haricots-rouges": { id: 30635708, ext: "jpeg", auteur: "IARA MELO" },
  "2026-10-01-overnight-oats-banane-cacahuete": { id: 6050721, ext: "jpeg", auteur: "Vegan Liftz" }
};

/** Meme regle que le Worker : quelques mots en minuscules, sans accents. */
export function normaliserRequetePhoto(texte) {
  const q = String(texte || "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .trim();
  return q.length >= 3 ? q : null;
}

/** Ce qu'il faut chercher pour une recette : { q, fr } ou null. */
export function recherchePhoto(recette) {
  if (!recette) return null;
  const en = normaliserRequetePhoto(recette.photo);
  if (en) return { q: en, fr: false };
  const fr = normaliserRequetePhoto(recette.nom);
  return fr ? { q: fr, fr: true } : null;
}

const cleRecherche = (r) => (r.fr ? "fr:" : "en:") + r.q;

/** Photo deja connue (catalogue ou recherche gardee) ; undefined si a chercher, null si aucune. */
export function photoConnue(recette) {
  if (!recette) return null;
  const fixe = PHOTOS_RECETTES_COACH[recette.id];
  if (fixe) return fixe;
  const r = recherchePhoto(recette);
  if (!r) return null;
  const gardees = charger(CLE_PHOTOS_RECETTES, {}) || {};
  return Object.prototype.hasOwnProperty.call(gardees, cleRecherche(r)) ? gardees[cleRecherche(r)] : undefined;
}

export function adresseImage(photo, base = PROXY_BASE_URL) {
  if (!base || !photo || !Number.isInteger(photo.id) || !/^(jpeg|png)$/.test(photo.ext)) return null;
  return `${base}/photo/img/${photo.id}.${photo.ext}`;
}

const enCours = new Map();

/**
 * Cherche la photo d'une recette par le Worker et la garde. Rend la photo,
 * null s'il n'y en a pas, ou undefined si le service ne repond pas (on
 * reessaiera plus tard).
 */
export async function chercherPhoto(recette, { base = PROXY_BASE_URL, fetchFn = (...a) => fetch(...a) } = {}) {
  const deja = photoConnue(recette);
  if (deja !== undefined) return deja;
  const r = recherchePhoto(recette);
  if (!r || !base) return undefined;
  const cle = cleRecherche(r);
  if (!enCours.has(cle)) {
    const tache = (async () => {
      try {
        const rep = await fetchFn(`${base}/photo?q=${encodeURIComponent(r.q)}${r.fr ? "&fr=1" : ""}`);
        if (!rep.ok) return undefined;
        const d = await rep.json();
        const p = d && d.photo;
        const photo = p && Number.isInteger(p.id) && /^(jpeg|png)$/.test(p.ext) ? { id: p.id, ext: p.ext, auteur: String(p.auteur || "").slice(0, 60) } : null;
        const gardees = charger(CLE_PHOTOS_RECETTES, {}) || {};
        const cles = Object.keys(gardees);
        if (cles.length >= MAX_GARDEES) for (const c of cles.slice(0, cles.length - MAX_GARDEES + 1)) delete gardees[c];
        gardees[cle] = photo;
        enregistrer(CLE_PHOTOS_RECETTES, gardees);
        return photo;
      } catch (e) {
        return undefined;
      } finally {
        enCours.delete(cle);
      }
    })();
    enCours.set(cle, tache);
  }
  return enCours.get(cle);
}
