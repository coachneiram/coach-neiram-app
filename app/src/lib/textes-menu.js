/**
 * « Menu de la semaine » (repris de l'app Neiram le 24/10/2026) : textes de
 * l'écran (ecrans/MenuSemaine.jsx), qui ne fait que les afficher. Les
 * calculs sont dans lib/plan-repas.js.
 *
 * Dans l'app coach, tout est inclus, et les cibles sont celles de ton
 * coach : le texte le dit plutôt que « ton profil ».
 */

import { restrictionDuProfil } from "./regimes.js";

const fmt = (n) => Math.round(num0(n)).toLocaleString("fr-FR");
const num0 = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const virgule = (v) => String(v).replace(".", ",");

/** « 1,5 portions », « 0,75 portion ». */
export const fmtParts = (p) => `${virgule(p)} portion${p > 1 ? "s" : ""}`;

/** Jours courts, dans l'ordre de Date#getDay. */
export const JOURS_COURTS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/** Sources de protéines suggérées quand le menu en manque, par restriction. */
const SOURCES_PROTEINES = {
  vegetalien: "tofu ferme, tempeh, seitan, lentilles, protéine de pois",
  vegetarien: "skyr, fromage blanc, œufs, tofu, lentilles",
  pescetarien: "skyr, fromage blanc, œufs, thon, saumon",
  aucun: "skyr, fromage blanc, œufs, poulet, thon"
};

export const sourcesProteines = (profil) => SOURCES_PROTEINES[restrictionDuProfil(profil)] || SOURCES_PROTEINES.aucun;

export const TEXTES_MENU = {
  onglet: "Menu",
  titre: "🗓️ Menu de la semaine",
  intro: (targets) =>
    `7 jours de repas calés sur tes ${fmt(targets.calories)} kcal${targets.protein ? ` et tes ${fmt(targets.protein)} g de protéines` : ""} (les objectifs de ton coach), selon ton régime et tes allergies. Les portions sont ajustées pour toi, et la liste de courses se fait toute seule.`,
  sansObjectifs:
    "Le menu part de tes objectifs de calories et de protéines. Complète ton profil (poids, taille, âge, activité) dans Réglages pour qu'ils soient calculés.",
  restesLong: "Cuisiner une fois, manger deux fois (le dîner revient au déjeuner du lendemain)",
  restesCourt: "Cuisiner une fois, manger deux fois",
  creer: "Créer mon menu",
  moyenne: (b) =>
    `Moyenne par jour : ${fmt(b.kcal)} kcal${b.cibleKcal ? ` sur ${fmt(b.cibleKcal)}` : ""} · protéines ${fmt(b.p)} g${b.cibleP ? ` sur ${fmt(b.cibleP)}` : ""}`,
  libres: (kcal) =>
    `Repas libres : environ ${fmt(kcal)} kcal par jour à placer toi-même (aucune recette compatible pour ce repas pour l'instant).`,
  manqueProteines: (g, profil) =>
    `Il manque environ ${g} g de protéines par jour : ajoute une source à un repas (${sourcesProteines(profil)}).`,
  termine: "Ce menu est terminé : crée celui des 7 prochains jours.",
  ciblesChangees: "Tes objectifs ont changé depuis ce menu : « Nouveau menu » le recale dessus.",
  restesHier: "♻️ Restes d'hier soir",
  ligneRepas: (x) => `${fmtParts(x.parts)} · ${fmt(x.kcal)} kcal · P${x.p} G${x.c} L${x.f}`,
  voirRecette: "Voir la recette",
  changer: "🔄 Changer",
  repasLibre: (kcal) => `Repas libre : vise environ ${fmt(kcal)} kcal.`,
  totalJour: (t) => `Total du jour : ${fmt(t.kcal)} kcal · P${t.p} g`,
  nouveauMenu: "Nouveau menu",
  mesCourses: "🛒 Mes courses",
  reperes:
    "Repères : petit-déjeuner 25 %, déjeuner 35 %, collation 10 %, dîner 30 % de tes calories. Les portions sont ajustées au quart. Un menu ne remplace pas un suivi médical ou diététique.",

  // Fiche recette
  infosRecette: (categorie, r) =>
    `${categorie} · préparation ${r.preparationMin} min${r.cuissonMin ? ` · cuisson ${r.cuissonMin} min` : ""}`,
  dejaCuisine: (parts) => `Déjà cuisiné hier soir : réchauffe ${fmtParts(parts)}.`,
  aCuisiner: (aCuisiner, parts) => {
    const pourDemain = Math.round((aCuisiner - parts) * 100) / 100;
    return `À cuisiner : ${fmtParts(aCuisiner)}${aCuisiner > parts ? ` (dont ${fmtParts(pourDemain)} pour demain midi)` : ""}.`;
  },
  ingredients: "Ingrédients",
  ligneIngredient: (i) => `${i.nom} : ${i.quantite}`,
  preparation: "Préparation",
  taPart: (x) => `Ta part : ${fmt(x.kcal)} kcal · P${x.p} G${x.c} L${x.f}.`,
  dansMesRecettes: "Dans mes recettes : à noter depuis le Journal",
  ajouterRecette: "Ajouter à mes recettes",

  // Courses
  titreCourses: "Mes courses de la semaine",
  pourLesJours: (n) => `Pour les ${n} jours du menu, restes compris.`,
  auPlacard: "Au placard :",
  listePlacard: (articles) => ` ${articles.join(", ")}.`,
  ajouterListe: "Ajouter à ma liste",
  partager: "Partager",
  ajoutes: (n) => `${n} article${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""} à ta liste de courses (onglet Courses).`,
  partage: {
    shared: "Liste partagée.",
    copied: "Liste copiée : colle-la où tu veux.",
    cancelled: null,
    failed: "Partage impossible sur ce téléphone : utilise « Ajouter à ma liste »."
  },
  texteCourses: (courses, placard) =>
    [
      "Mes courses de la semaine (Coach Neiram)",
      ...courses.filter((l) => !l.placard).map((l) => `- ${l.nom} : ${l.quantite}`),
      ...(placard.length ? [`Au placard : ${placard.join(", ")}`] : [])
    ].join("\n"),
  /** Libellé d'un article de la liste Courses (onglet Courses). */
  articleCourses: (l) => `${l.nom} (${l.quantite})`
};
