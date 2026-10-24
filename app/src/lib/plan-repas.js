/**
 * « Menu de la semaine » (Repas → Menu), repris de l'app Neiram le
 * 24/10/2026 : 7 jours de repas calés sur les calories et les protéines,
 * avec la liste de courses qui va avec. Dans l'app coach, tout est inclus.
 *
 * LES CIBLES SONT CELLES DU COACH : le menu part des `targets` que
 * computeTargets (App.jsx) calcule déjà et passe aux écrans. Rien n'est
 * recalculé ici, et sans calories (profil incomplet) aucun menu n'est
 * proposé plutôt que d'en inventer.
 *
 * Les recettes viennent du catalogue des recettes du coach, filtrées comme
 * partout : régime et allergies d'abord (recettesPourClient), celles de
 * l'objectif en priorité. Le menu ajoute les contraintes halal, casher et
 * sans alcool du profil (regimes.js, CONTRAINTES_ALIM), que l'écran des
 * recettes ne lit pas encore : un menu se mange tel quel, il doit les
 * respecter. Une recette qui ne convient pas n'est jamais proposée, même
 * pour remplir un trou : le repas reste « libre ».
 *
 * Les portions sont ajustées au quart près pour que chaque repas approche
 * sa part des calories du jour (petit-déjeuner 25 %, déjeuner 35 %,
 * collation 10 %, dîner 30 %). Les recettes prévues pour 4 portions ou plus
 * servent deux fois : le dîner cuisiné le soir revient au déjeuner du
 * lendemain (« cuisine une fois, mange deux fois »).
 *
 * Tout est calculé sur le téléphone et gardé dans cn_plan_repas (partie de
 * la sauvegarde, préfixe cn_). Rien n'est envoyé au coach. Le tirage est
 * reproductible (graine) : le même plan revient tant qu'on ne demande pas
 * « Nouveau menu ».
 */

import { addDays, num } from "./dates.js";
import { profilsDuClient, recettesPourClient } from "./recettes-coach.js";
import { exclusionsContraintes } from "./regimes.js";
import { uid } from "./semaine.js";
import { TEXTES_MENU } from "./textes-menu.js";

export const CLE_PLAN_REPAS = "cn_plan_repas";
/** Même clé que la liste de l'onglet Courses (ecrans/Courses.jsx). */
export const CLE_AJOUTS_COURSES = "coach_shopping_custom";

export const REPAS_DU_JOUR = [
  { id: "petit-dejeuner", label: "Petit-déjeuner", part: 0.25, categories: ["petit-dejeuner"] },
  { id: "dejeuner", label: "Déjeuner", part: 0.35, categories: ["dejeuner", "diner"] },
  { id: "collation", label: "Collation", part: 0.1, categories: ["collation", "dessert"] },
  { id: "diner", label: "Dîner", part: 0.3, categories: ["diner", "dejeuner"] }
];

const PARTS_MIN = 0.5;
const PARTS_MAX = 2.5;
/** Une recette n'est pas reprise (hors restes) dans les 2 jours qui suivent. */
const ECART_REPRISE_JOURS = 2;
/** À partir de 4 portions, le dîner sert aussi le déjeuner du lendemain. */
const PORTIONS_POUR_RESTES = 4;

/**
 * Mots qui trahissent de l'alcool dans un ingrédient (contraintes halal et
 * sans alcool). Le vinaigre n'en est pas (la fermentation est achevée) :
 * « vinaigre de vin » est retiré avant de chercher.
 */
const VINAIGRES = /vinaigre(?: de (?:vin|cidre|xérès))?/giu;
const MOTS_ALCOOL = /(?<!\p{L})(?:vins?|bières?|rhum|cognac|calvados|kirsch|porto|madère|liqueurs?|alcool|whisky|vodka|cidre|saké|marsala|amaretto)(?!\p{L})/iu;

/** Familles de `contient` écartées par une contrainte du profil. */
const FAMILLES_CONTRAINTES = ["porc", "crustaces", "mollusques"];

/**
 * Recettes que le menu peut servir : celles de recettesPourClient (régime,
 * allergies, keto ; objectif d'abord), moins celles qu'exclut une
 * contrainte halal, casher ou sans alcool.
 */
export function recettesDuMenu(catalogue, profil) {
  const exclues = exclusionsContraintes(profil);
  const familles = FAMILLES_CONTRAINTES.filter((f) => exclues.includes(f));
  const sansAlcool = exclues.includes("alcool");
  return recettesPourClient(catalogue, profil).filter((r) => {
    if ((r.contient || []).some((x) => familles.includes(x))) return false;
    if (sansAlcool && (r.ingredients || []).some((i) => MOTS_ALCOOL.test(String(i.nom).replace(VINAIGRES, "")))) return false;
    return true;
  });
}

/** Tirage pseudo-aléatoire reproductible (mulberry32). */
export function tirage(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Parts arrondies au quart pour approcher `kcalVisees`. */
export function partsPour(kcalVisees, kcalParPortion) {
  const k = num(kcalParPortion);
  if (!(k > 0) || !(kcalVisees > 0)) return 1;
  const brut = Math.round((kcalVisees / k) * 4) / 4;
  return Math.min(PARTS_MAX, Math.max(PARTS_MIN, brut));
}

const apports = (r, parts) => ({
  kcal: Math.round(num(r.parPortion.kcal) * parts),
  p: Math.round(num(r.parPortion.p) * parts),
  c: Math.round(num(r.parPortion.c) * parts),
  f: Math.round(num(r.parPortion.f) * parts)
});

const sommer = (repas) =>
  repas.reduce((t, x) => (x.recetteId ? { kcal: t.kcal + x.kcal, p: t.p + x.p, c: t.c + x.c, f: t.f + x.f } : t), { kcal: 0, p: 0, c: 0, f: 0 });

/**
 * Choisit une recette pour un repas. Plus le score est bas, mieux c'est :
 * pertinence pour l'objectif, densité en protéines proche de la cible,
 * pas reprise récemment, puis un peu de hasard pour varier les menus.
 */
function choisir(candidates, { typeRepas, utilisees, jour, ratioProteines, pertinentes, alea, exclure = [] }) {
  const possibles = candidates.filter((r) => typeRepas.categories.includes(r.categorie) && !exclure.includes(r.id));
  if (!possibles.length) return null;
  const score = (r) => {
    const derniere = utilisees.get(r.id);
    const recente = derniere != null && jour - derniere <= ECART_REPRISE_JOURS ? 3 : derniere != null ? 0.6 : 0;
    const categoriePrincipale = r.categorie === typeRepas.categories[0] ? 0 : 0.8;
    const kcal = num(r.parPortion.kcal);
    const ratio = kcal > 0 ? (num(r.parPortion.p) * 4) / kcal : 0;
    const ecartProteines = ratioProteines ? Math.min(1, Math.abs(ratio - ratioProteines) * 3) : 0;
    return (pertinentes.has(r.id) ? 0 : 1) + recente + categoriePrincipale + ecartProteines + alea() * 0.9;
  };
  return possibles.map((r) => ({ r, s: score(r) })).sort((a, b) => a.s - b.s)[0].r;
}

/**
 * Plan de 7 jours à partir de `debut` (date ISO), sur les `cibles` du coach
 * (targets : { calories, protein }).
 * Rend { debut, graine, cibles, jours: [{ date, repas: [{ typeRepas, recetteId,
 * nom, parts, restes, kcal, p, c, f }], total }], repasVides: [ids] },
 * ou null sans calories : pas de cible inventée.
 */
export function genererPlanRepas({ catalogue, profil, cibles, debut, graine = 1, restes = true, fixes = {} }) {
  const kcalJour = num(cibles && cibles.calories);
  if (!(kcalJour > 0)) return null;
  const proteinesJour = num(cibles && cibles.protein);
  const ratioProteines = proteinesJour > 0 ? (proteinesJour * 4) / kcalJour : null;
  const candidates = recettesDuMenu(catalogue, profil);
  const siens = profilsDuClient(profil);
  const pertinentes = new Set(candidates.filter((r) => (r.profils || []).some((p) => siens.includes(p))).map((r) => r.id));
  const parId = new Map(candidates.map((r) => [r.id, r]));
  const alea = tirage(graine);
  const utilisees = new Map();
  const vides = new Set();
  const jours = [];
  let resteDuSoir = null;

  for (let j = 0; j < 7; j++) {
    const repas = [];
    for (const typeRepas of REPAS_DU_JOUR) {
      const visees = kcalJour * typeRepas.part;
      const cle = `${j}:${typeRepas.id}`;
      let recette = null;
      let estReste = false;
      if (fixes[cle] && parId.has(fixes[cle])) recette = parId.get(fixes[cle]);
      else if (typeRepas.id === "dejeuner" && resteDuSoir) {
        recette = resteDuSoir;
        estReste = true;
      } else recette = choisir(candidates, { typeRepas, utilisees, jour: j, ratioProteines, pertinentes, alea });
      if (!recette) {
        vides.add(typeRepas.id);
        repas.push({ typeRepas: typeRepas.id, recetteId: null, kcalVisees: Math.round(visees) });
        continue;
      }
      if (!estReste) utilisees.set(recette.id, j);
      const parts = partsPour(visees, recette.parPortion.kcal);
      repas.push({ typeRepas: typeRepas.id, recetteId: recette.id, nom: recette.nom, parts, restes: estReste, ...apports(recette, parts) });
    }
    const diner = repas.find((x) => x.typeRepas === "diner");
    const recetteDiner = diner && diner.recetteId ? parId.get(diner.recetteId) : null;
    resteDuSoir = restes && recetteDiner && num(recetteDiner.portions) >= PORTIONS_POUR_RESTES && !diner.restes ? recetteDiner : null;
    jours.push({ date: addDays(debut, j), repas, total: sommer(repas) });
  }
  return { debut, graine, cibles: { calories: kcalJour, protein: proteinesJour || null }, jours, repasVides: [...vides] };
}

/** Remplace un repas par une autre recette compatible, le reste du plan ne bouge pas. */
export function changerRepas(plan, { catalogue, profil, jour, typeRepas }) {
  const candidates = recettesDuMenu(catalogue, profil);
  const def = REPAS_DU_JOUR.find((c) => c.id === typeRepas);
  const actuel = plan.jours[jour].repas.find((x) => x.typeRepas === typeRepas);
  const dejaCetteSemaine = new Map();
  plan.jours.forEach((d, k) => d.repas.forEach((x) => x.recetteId && dejaCetteSemaine.set(x.recetteId, k)));
  const visees = num(plan.cibles.calories) * def.part;
  const ratio = plan.cibles.protein ? (plan.cibles.protein * 4) / plan.cibles.calories : null;
  const siens = profilsDuClient(profil);
  const pertinentes = new Set(candidates.filter((r) => (r.profils || []).some((p) => siens.includes(p))).map((r) => r.id));
  const r = choisir(candidates, {
    typeRepas: def,
    utilisees: dejaCetteSemaine,
    jour,
    ratioProteines: ratio,
    pertinentes,
    alea: tirage((plan.graine || 1) * 31 + jour * 7 + Date.now() % 1000),
    exclure: actuel && actuel.recetteId ? [actuel.recetteId] : []
  });
  if (!r) return plan;
  const parts = partsPour(visees, r.parPortion.kcal);
  const servir = (recette, type, estReste) => {
    const p = partsPour(num(plan.cibles.calories) * REPAS_DU_JOUR.find((c) => c.id === type).part, recette.parPortion.kcal);
    return { typeRepas: type, recetteId: recette.id, nom: recette.nom, parts: p, restes: estReste, ...apports(recette, p) };
  };
  // Écart avec l'app Neiram : un dîner changé dont les restes servaient le
  // déjeuner du lendemain ne laisse pas ces « restes » orphelins. Le
  // nouveau dîner les reprend s'il fait 4 portions ou plus, sinon un autre
  // déjeuner est choisi.
  const demain = plan.jours[jour + 1];
  const dejDemain = demain && demain.repas.find((x) => x.typeRepas === "dejeuner");
  let nouveauDej = null;
  if (typeRepas === "diner" && dejDemain && dejDemain.restes && actuel && dejDemain.recetteId === actuel.recetteId) {
    if (plan.restes !== false && num(r.portions) >= PORTIONS_POUR_RESTES) nouveauDej = servir(r, "dejeuner", true);
    else {
      const defDej = REPAS_DU_JOUR.find((c) => c.id === "dejeuner");
      const autre = choisir(candidates, {
        typeRepas: defDej,
        utilisees: dejaCetteSemaine,
        jour: jour + 1,
        ratioProteines: ratio,
        pertinentes,
        alea: tirage((plan.graine || 1) * 37 + jour * 11 + (Date.now() % 1000)),
        exclure: [r.id]
      });
      nouveauDej = autre ? servir(autre, "dejeuner", false) : { typeRepas: "dejeuner", recetteId: null, kcalVisees: Math.round(num(plan.cibles.calories) * defDej.part) };
    }
  }
  const jours = plan.jours.map((d, k) => {
    let repas = d.repas;
    if (k === jour) repas = repas.map((x) => (x.typeRepas === typeRepas ? { typeRepas, recetteId: r.id, nom: r.nom, parts, restes: false, ...apports(r, parts) } : x));
    else if (k === jour + 1 && nouveauDej) repas = repas.map((x) => (x.typeRepas === "dejeuner" ? nouveauDej : x));
    else return d;
    return { ...d, repas, total: sommer(repas) };
  });
  return { ...plan, jours };
}

// ── Liste de courses ────────────────────────────────────────────────────

const UNITES_MASSE = { g: 1, kg: 1000 };
const UNITES_VOLUME = { ml: 1, cl: 10, l: 1000 };
const nombre = (s) => {
  if (/^\d+\/\d+$/.test(s)) {
    const [a, b] = s.split("/").map(Number);
    return a / b;
  }
  return Number(String(s).replace(",", "."));
};

/**
 * Lit une quantité de recette : grammes ou millilitres quand ils sont
 * donnés (même entre parenthèses), sinon un nombre et son unité
 * (« 2 gousses », « 1 cuillère à soupe », « 1/2 »), sinon « selon goût ».
 */
export function lireQuantite(texte) {
  const t = String(texte || "").trim();
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l)(?![\p{L}])/iu);
  if (m) {
    const u = m[2].toLowerCase();
    if (UNITES_MASSE[u]) return { valeur: nombre(m[1]) * UNITES_MASSE[u], unite: "g" };
    return { valeur: nombre(m[1]) * UNITES_VOLUME[u], unite: "ml" };
  }
  if (/^\d+\s*à\s*\d+/.test(t)) return { valeur: null, unite: null, texte: t };
  // Cuillères sans poids indiqué : 15 g la cuillère à soupe, 5 g la
  // cuillère à café (repères usuels), pour additionner avec les grammes.
  const c = t.match(/^(\d+\/\d+|\d+(?:[.,]\d+)?)\s*(?:cuillères?|c\.)\s*à\s*(soupe|café)/i);
  if (c) return { valeur: nombre(c[1]) * (c[2].toLowerCase() === "soupe" ? 15 : 5), unite: "g" };
  const n = t.match(/^(\d+\/\d+|\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (n) {
    let unite = n[2]
      .toLowerCase()
      .replace(/\(.*\)/, "")
      .replace(/^c\. à/, "cuillère à")
      .replace(/^(cuillère|gousse|tranche)s\b/, "$1")
      .replace(/\b(bombée|grandes?|moyens?|moyennes?|grosses?|petites?)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return { valeur: nombre(n[1]), unite: unite || "pièce" };
  }
  return { valeur: null, unite: null, texte: "selon goût" };
}

const cleIngredient = (nom) =>
  String(nom || "")
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const arrondir = (v, pas) => Math.max(pas, Math.round(v / pas) * pas);

/** Affichage d'une quantité additionnée. */
export function formaterQuantite({ valeur, unite }) {
  if (unite === "g") return valeur >= 1000 ? `${String(Math.round(valeur / 100) / 10).replace(".", ",")} kg` : `${arrondir(valeur, valeur < 50 ? 5 : 10)} g`;
  if (unite === "ml") return valeur >= 1000 ? `${String(Math.round(valeur / 100) / 10).replace(".", ",")} L` : `${arrondir(valeur, 10)} ml`;
  const v = Math.ceil(valeur * 2) / 2;
  const txt = String(v).replace(".", ",");
  if (unite === "pièce") return txt;
  const pluriel = v > 1 && /^(cuillère|gousse|tranche)\b/.test(unite) ? unite.replace(/^(cuillère|gousse|tranche)/, "$1s") : unite;
  return `${txt} ${pluriel}`;
}

/**
 * Ingrédients de la semaine, additionnés. Une recette cuisinée pour le
 * dîner et reprise en restes n'est comptée qu'une fois par part mangée :
 * on additionne les parts, puis on rapporte aux portions de la recette.
 */
export function listeCoursesPlan(plan, catalogue) {
  const parts = new Map();
  for (const j of (plan && plan.jours) || []) for (const x of j.repas) if (x.recetteId) parts.set(x.recetteId, (parts.get(x.recetteId) || 0) + x.parts);
  const parId = new Map((catalogue || []).map((r) => [r.id, r]));
  const lignes = new Map();
  for (const [id, total] of parts) {
    const r = parId.get(id);
    if (!r) continue;
    const facteur = total / (num(r.portions) || 1);
    for (const ing of r.ingredients || []) {
      const cle = cleIngredient(ing.nom);
      const q = lireQuantite(ing.quantite);
      const ligne = lignes.get(cle) || { nom: ing.nom.replace(/\s*\(.*?\)\s*/g, " ").trim(), quantites: new Map(), recettes: new Set() };
      ligne.recettes.add(r.nom);
      if (q.valeur != null) {
        const avant = ligne.quantites.get(q.unite) || 0;
        ligne.quantites.set(q.unite, avant + q.valeur * facteur);
      } else ligne.quantites.set("texte", q.texte);
      lignes.set(cle, ligne);
    }
  }
  return [...lignes.values()]
    .map((l) => {
      const morceaux = [...l.quantites.entries()].filter(([u]) => u !== "texte").map(([unite, valeur]) => formaterQuantite({ valeur, unite }));
      const quantite = morceaux.length ? morceaux.join(" + ") : l.quantites.get("texte") || "";
      // Épices, sel, herbes « selon goût » : rangés à part (le placard).
      return { nom: l.nom, quantite, placard: !morceaux.length, recettes: [...l.recettes] };
    })
    .sort((a, b) => Number(a.placard) - Number(b.placard) || a.nom.localeCompare(b.nom, "fr"));
}

/**
 * Le placard en une liste courte : « Ail, curry, sel » et « Sel, poivre »
 * donnent « ail, curry, poivre, sel », sans doublon.
 */
export function articlesPlacard(liste) {
  const vus = new Map();
  for (const l of liste || []) {
    if (!l.placard) continue;
    for (const brut of l.nom.split(/,|\bet\b/)) {
      const nom = brut
        .replace(/^\s*une pincée de\s*/i, "")
        .trim()
        .toLowerCase();
      if (nom && !vus.has(nom)) vus.set(nom, nom);
    }
  }
  return [...vus.values()].sort((a, b) => a.localeCompare(b, "fr"));
}

/** Quantités d'une recette pour un nombre de parts (affichage de la fiche). */
export function ingredientsPourParts(recette, parts) {
  const facteur = parts / (num(recette.portions) || 1);
  return (recette.ingredients || []).map((ing) => {
    const q = lireQuantite(ing.quantite);
    return { nom: ing.nom, quantite: q.valeur != null ? formaterQuantite({ valeur: q.valeur * facteur, unite: q.unite }) : q.texte || ing.quantite };
  });
}

/** Moyenne des 7 jours face aux cibles. */
export function bilanPlan(plan) {
  const jours = (plan && plan.jours) || [];
  if (!jours.length) return null;
  const moy = (k) => Math.round(jours.reduce((s, j) => s + j.total[k], 0) / jours.length);
  // Les repas sans recette compatible restent libres : on dit combien
  // de calories il reste à y placer, plutôt que de les ignorer.
  const libres = Math.round(jours.reduce((s, j) => s + j.repas.reduce((t, x) => t + (x.recetteId ? 0 : num(x.kcalVisees)), 0), 0) / jours.length);
  return { kcal: moy("kcal"), p: moy("p"), c: moy("c"), f: moy("f"), libresKcal: libres, cibleKcal: plan.cibles.calories, cibleP: plan.cibles.protein };
}

/**
 * Parts à cuisiner pour ce repas : si le dîner sert aussi le déjeuner du
 * lendemain, on cuisine les deux d'un coup.
 */
export function partsCuisinees(plan, jour, repas) {
  if (repas.typeRepas !== "diner") return repas.parts;
  const demain = plan.jours[jour + 1];
  const reste = demain && demain.repas.find((x) => x.typeRepas === "dejeuner" && x.restes && x.recetteId === repas.recetteId);
  return reste ? repas.parts + reste.parts : repas.parts;
}

/**
 * Les objectifs du coach ont-ils bougé depuis le menu (nouvelle pesée,
 * profil modifié) ? Au-delà de 5 % de calories ou de 10 g de protéines,
 * l'écran propose de refaire le menu ; il ne le refait jamais tout seul.
 */
export function ciblesChangees(plan, targets) {
  if (!plan || !plan.cibles || !targets || !(num(targets.calories) > 0)) return false;
  const dk = Math.abs(num(targets.calories) - num(plan.cibles.calories));
  const dp = Math.abs(num(targets.protein) - num(plan.cibles.protein));
  return dk > num(plan.cibles.calories) * 0.05 || dp > 10;
}

/**
 * Range la liste du menu dans celle de l'onglet Courses : les articles d'un
 * menu précédent (origine « menu ») sont remplacés, ceux ajoutés à la main
 * restent. Les épices du placard n'y vont pas.
 */
export function ajouterCoursesMenu(actuels, courses) {
  const gardes = (Array.isArray(actuels) ? actuels : []).filter((x) => x && x.origine !== "menu");
  const nouveaux = (courses || []).filter((l) => !l.placard).map((l) => ({ id: uid(), name: TEXTES_MENU.articleCourses(l), origine: "menu" }));
  return { liste: [...gardes, ...nouveaux], ajoutes: nouveaux.length };
}
