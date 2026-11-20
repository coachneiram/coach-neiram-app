/**
 * « Menu sur mesure » (repris de l'app Neiram, PR #76, le 20/11/2026 ;
 * tout inclus dans l'app coach) : le menu de la semaine, à partir des
 * contraintes de la personne — repas à prévoir, budget de courses, style
 * de cuisine, aliments qu'elle n'aime pas, temps et matériel de cuisine.
 *
 * Le catalogue des idées recettes ne suffit pas à couvrir ces contraintes
 * (« asiatique, 20 minutes, une poêle, sans tofu, 30 € ») : l'IA crée les
 * recettes. Tout le reste est calculé sur le téléphone, avec le moteur du
 * menu de la semaine (lib/plan-repas.js) : répartition des calories,
 * portions au quart, restes du dîner, liste de courses.
 *
 * Ce que l'IA rend n'est jamais pris tel quel (lireRecettesIa) :
 * - une recette qui contient un allergène ou un aliment refusé, ou qui ne
 *   respecte pas le régime, est écartée : étiquettes de l'IA relues d'après
 *   les ingrédients (corrigerEtiquettes), puis refusRegime et mots refusés ;
 * - une recette trop longue pour le temps choisi est écartée ;
 * - les calories sont recalculées depuis les macros si elles ne collent pas.
 *
 * LES CIBLES SONT CELLES DU COACH (targets, computeTargets dans App.jsx) :
 * sans calories, aucun menu n'est demandé à l'IA (erreur « sans-objectifs »).
 * Le quota est de 3 menus sur mesure par jour et par client, compté par le
 * Worker du coach (fonction « planrepas »).
 *
 * LE BUDGET EST UNE ESTIMATION. Aucune base de prix fiable des supermarchés
 * n'existe : le coût par portion vient de l'IA (prix moyens en France). Il
 * est affiché comme tel, jamais comme un prix garanti.
 */

import { normaliserRequetePhoto } from "./photos-recettes.js";
import { num } from "./dates.js";
import { genererTexte } from "./ia.js";
import { extraireObjetJson } from "./photo-aliment.js";
import { MOTS_ALCOOL, REPAS_DU_JOUR, VINAIGRES, genererPlanRepas, recettesDuMenu } from "./plan-repas.js";
import { CONTIENT_RECETTE, EXCLUES, MOTS_ANIMAL, MOTS_CHAIR, MOTS_PORC, REVELE, recetteCompatible } from "./recettes-coach.js";
import { CONTRAINTES_ALIM, exclusionsContraintes, resumeRegime } from "./regimes.js";
import { libelleAllergene } from "./allergenes.js";

export const CUISINES = [
  { id: "variee", libelle: "Un peu de tout" },
  { id: "francaise", libelle: "Française" },
  { id: "asiatique", libelle: "Asiatique" },
  { id: "mediterraneenne", libelle: "Méditerranéenne" },
  { id: "mexicaine", libelle: "Mexicaine" },
  { id: "orientale", libelle: "Orientale" },
  { id: "italienne", libelle: "Italienne" }
];

export const MATERIELS_CUISINE = [
  { id: "plaque", libelle: "Plaque" },
  { id: "poele", libelle: "Poêle" },
  { id: "casserole", libelle: "Casserole" },
  { id: "four", libelle: "Four" },
  { id: "micro-ondes", libelle: "Micro-ondes" },
  { id: "airfryer", libelle: "Airfryer" },
  { id: "cuiseur-riz", libelle: "Cuiseur à riz" }
];

export const TEMPS_CUISINE = [10, 15, 20, 30, 45];

export const PREFS_DEFAUT = {
  repas: ["dejeuner", "diner"],
  budget: 40,
  cuisine: "variee",
  aEviter: "",
  tempsMax: 20,
  materiel: ["plaque", "poele", "casserole"]
};

export const BUDGET_MIN = 10;
export const BUDGET_MAX = 300;

/** Nombre de repas planifiés sur la semaine (7 jours × repas choisis). */
export const nombreRepas = (prefs) => 7 * ((prefs && prefs.repas) || []).length;

/** Budget par repas planifié, en euros. */
export function budgetParRepas(prefs) {
  const n = nombreRepas(prefs);
  const b = num(prefs && prefs.budget);
  return n > 0 && b > 0 ? b / n : 0;
}

/** « tofu, épinards et olives » → ["tofu", "epinards", "olives"] (sans accents, minuscules). */
export function motsAEviter(texte) {
  return String(texte || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/,|;|\n|\bet\b|\bni\b|\//)
    .map((m) => m.replace(/[^a-z0-9 -]/g, " ").replace(/\s+/g, " ").trim())
    .filter((m) => m.length >= 3)
    .slice(0, 20);
}

const normaliser = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Pluriel simple : « olive » trouve « olives », « épinards » trouve « épinard ». */
const racine = (mot) => mot.replace(/(s|x)$/, "");

const echapper = (m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/*
 * Revue du 20/11/2026 (app coach) : les étiquettes de l'IA ne font jamais
 * foi, et les motifs du catalogue (REVELE, écrits pour des recettes
 * relues à la main) ne suffisent pas pour des recettes inventées. Ces
 * compléments ne servent qu'aux recettes de l'IA : le catalogue du coach
 * et sa vérification ne changent pas. Un faux positif écarte une recette
 * en trop ; un faux négatif sert un allergène.
 */
const motif = (m) => new RegExp(`(?<!\\p{L})(?:${m})(?!\\p{L})`, "iu");
const REVELE_IA = {
  gluten: motif(
    "spaghettis?|tagliatelles?|lasagnes?|penne|fusilli|farfalle|linguine|macaronis?|coquillettes|vermicelles?|raviolis?|gnocchis?|udon|ramen|soba|panko|naan|pitas?|baguette|crackers?|cro[uû]tons?|chapatis?|pizzas?|p[âa]te (?:feuillet[ée]e|bris[ée]e|sabl[ée]e|[àa] pizza)|bi[eè]res?|bulgur|fregola|orzo"
  ),
  lactose: motif(
    "gruy[eè]re|cheddar|ch[eè]vre|burrata|b[ée]chamel|raclette|reblochon|camembert|brie|roquefort|gorgonzola|halloumi|paneer|ghee|labneh|tzatziki|quark|pecorino|grana padano|stracciatella|cancoillotte|crème fraîche"
  ),
  poisson: motif(
    "dorade|daurade|lieu (?:noir|jaune)|merlan|tilapia|fl[ée]tan|hareng|haddock|[ée]glefin|perche|espadon|limande|lotte|rouget|sole|bar|worcestershire|fumet de poisson|sauce (?:de )?poisson|nuoc"
  ),
  crustaces: motif("fruits de mer|langoustes?|tourteaux?|araign[ée]es? de mer|krill"),
  mollusques: motif("fruits de mer|p[ée]toncles?|ormeaux?|sauce (?:d'|d’)?hu[iî]tre"),
  soja: motif("teriyaki|hoisin|natto|shoyu|sauce soja"),
  oeufs: motif("omelettes?|meringues?|a[iï]oli|carbonara"),
  "fruits-a-coque": motif("pesto|pralin[ée]?s?|nougats?|frangipane|massepain|gianduja"),
  arachides: motif("satay|sat[ée]"),
  viande: motif(
    "steaks?|steak hach[ée]|viande hach[ée]e|lapin|gibier|chevreuil|sanglier|cerf|gigot|magret|foie gras|kefta|escalopes?|bresaola|pastrami|bouillon de b(?:œ|oe)uf|fond de veau|carpaccio|rosbif|entrec[ôo]te|bavette"
  ),
  volaille: motif("cailles?|faisans?|oies?|pigeons?|poules?|chapons?|bouillon de (?:poulet|volaille)")
};
/** Chair animale, pour relire « végétarien » et « vegan » sur une recette de l'IA. */
const CHAIR_IA = motif("lapin|gibier|chevreuil|sanglier|cerf|steaks?|gigot|magret|foie gras|kefta|escalopes?|cailles?|faisans?|oies?|pigeons?|bouillon de (?:poulet|volaille|b(?:œ|oe)uf)|fond de veau");
/** Les mollusques ne sont pas végétariens : ajoutés aux exclusions, pour l'IA seulement. */
const EXCLUES_IA = {
  vegan: [...EXCLUES.vegan, "mollusques"],
  vegetarien: [...EXCLUES.vegetarien, "mollusques"],
  "sans-porc": [...EXCLUES["sans-porc"]]
};

/**
 * Tout le texte d'une recette de l'IA : nom, ingrédients, et aussi
 * description et étapes (« parsemer de cacahuètes » n'est pas toujours un
 * ingrédient). « sans gluten », « sans lait » : le mot qui suit « sans »
 * est retiré des phrases (jamais des ingrédients), sinon une recette qui
 * précise ce qu'elle n'a pas serait écartée pour cela.
 */
function textesRecette(recette) {
  const sansNegation = (t) => String(t || "").replace(/(?<!\p{L})sans\s+\p{L}+(?:\s+ni\s+\p{L}+)*/giu, " ");
  return [
    recette.nom,
    ...(recette.ingredients || []).map((i) => i.nom),
    sansNegation(recette.description),
    ...(recette.etapes || []).map(sansNegation)
  ].map((t) => String(t || ""));
}

/**
 * La recette contient-elle un aliment refusé (nom, ingrédients) ? Mot
 * entier, pluriel accepté : « pois » n'écarte ni « poivre » ni « poisson »,
 * « ail » n'écarte pas « volaille ».
 */
export function contientMotRefuse(recette, mots) {
  if (!mots.length) return false;
  const texte = normaliser(textesRecette(recette).join(" | "));
  return mots.some((m) => new RegExp(`(?<![a-z0-9])${echapper(racine(m))}(?:s|x)?(?![a-z0-9])`).test(texte));
}

/** Alcool en cuisine (halal, sans alcool) : la liste de plan-repas.js, vinaigres mis à part. */
const contientAlcool = (texte) => MOTS_ALCOOL.test(String(texte).replace(VINAIGRES, " "));

/**
 * Relit une recette de l'IA sans se fier à ses étiquettes : complète
 * `contient` d'après les ingrédients (mêmes motifs que la vérification du
 * catalogue) et retire les régimes que les ingrédients contredisent.
 */
export function corrigerEtiquettes(recette) {
  const textes = textesRecette(recette);
  const contient = new Set((recette.contient || []).filter((c) => CONTIENT_RECETTE.includes(c)));
  for (const [famille, m] of Object.entries(REVELE)) if (textes.some((t) => m.test(t))) contient.add(famille);
  for (const [famille, m] of Object.entries(REVELE_IA)) if (textes.some((t) => m.test(t))) contient.add(famille);
  const texte = textes.join(" · ");
  const chair = (t) => MOTS_CHAIR.test(t) || CHAIR_IA.test(t) || MOTS_PORC.test(t);
  const valide = (g) => {
    if ((EXCLUES_IA[g] || []).some((x) => contient.has(x))) return false;
    if (g === "vegan") return !MOTS_ANIMAL.test(texte) && !chair(texte);
    if (g === "vegetarien") return !chair(texte);
    if (g === "sans-porc") return !MOTS_PORC.test(texte);
    return false;
  };
  return { ...recette, contient: [...contient], regimes: (recette.regimes || []).filter(valide) };
}

/** Pourquoi cette recette est interdite à ce profil (régime, allergies, halal, casher, alcool) ; null si permise. */
export function refusRegime(recette, profil) {
  if (!recetteCompatible(recette, profil)) return "régime ou allergies";
  const exclues = exclusionsContraintes(profil);
  if (exclues.some((x) => (recette.contient || []).includes(x))) return "régime ou allergies";
  const texte = textesRecette(recette).join(" · ");
  if (exclues.includes("alcool") && contientAlcool(texte)) return "régime ou allergies";
  if (exclues.includes("porc") && MOTS_PORC.test(texte)) return "régime ou allergies";
  return null;
}

/** Combien de recettes demander : assez pour varier, sans tout cuisiner chaque jour. */
export function nombreRecettesDemandees(prefs) {
  const types = (prefs && prefs.repas) || [];
  let n = 0;
  if (types.includes("petit-dejeuner")) n += 3;
  if (types.includes("collation")) n += 3;
  const principaux = types.filter((t) => t === "dejeuner" || t === "diner").length;
  if (principaux) n += principaux === 2 ? 7 : 5;
  return Math.min(14, Math.max(3, n));
}

const CATEGORIES_PAR_REPAS = {
  "petit-dejeuner": "petit-dejeuner",
  dejeuner: "dejeuner",
  collation: "collation",
  diner: "diner"
};

const OBJECTIFS = {
  perte: "perte de gras (rassasiant, riche en protéines et en légumes)",
  prise: "prise de masse (dense en calories et en protéines, féculents généreux)",
  performance: "performance sportive (glucides autour de l'effort, protéines suffisantes)",
  maintien: "maintien et équilibre"
};

/**
 * La consigne envoyée à l'IA. Les calories par portion visées découlent
 * des cibles du profil : l'app ajuste ensuite les portions au quart près.
 */
export function consigneMenu({ profil = {}, cibles = {}, prefs = PREFS_DEFAUT }) {
  const kcalJour = num(cibles.calories);
  const proteinesJour = num(cibles.protein);
  const types = REPAS_DU_JOUR.filter((t) => prefs.repas.includes(t.id));
  const allergies = (profil.allergies || []).map(libelleAllergene);
  const regime = resumeRegime(profil);
  const mots = motsAEviter(prefs.aEviter);
  const cuisine = (CUISINES.find((c) => c.id === prefs.cuisine) || CUISINES[0]).libelle;
  const materiel = MATERIELS_CUISINE.filter((m) => (prefs.materiel || []).includes(m.id)).map((m) => m.libelle.toLowerCase());
  const parRepas = budgetParRepas(prefs);
  const n = nombreRecettesDemandees(prefs);

  const repartition = types
    .map((t) => `${t.label.toLowerCase()} environ ${Math.round(kcalJour * t.part)} kcal`)
    .join(", ");

  const lignes = [
    `Tu es diététicien et cuisinier. Crée ${n} recettes en français pour composer le menu d'une semaine.`,
    `Objectif : ${OBJECTIFS[profil.goal] || OBJECTIFS.maintien}. Besoins : ${Math.round(kcalJour)} kcal par jour${proteinesJour ? ` et ${Math.round(proteinesJour)} g de protéines` : ""}.`,
    `Repas à prévoir chaque jour : ${repartition}. Répartis les recettes entre ces repas (champ categorie).`,
    `Style de cuisine : ${cuisine}.`,
    `Temps maximum par recette, préparation et cuisson comprises : ${prefs.tempsMax} minutes.`,
    `Matériel disponible, et rien d'autre : ${materiel.length ? materiel.join(", ") : "plaque et poêle"}.`,
    `Budget de courses pour la semaine : ${Math.round(num(prefs.budget))} € pour ${nombreRepas(prefs)} repas, soit environ ${parRepas.toFixed(2).replace(".", ",")} € par repas. Ingrédients simples de supermarché, réutilisés d'une recette à l'autre pour limiter le gaspillage et le coût.`
  ];
  if (regime) lignes.push(`Régime à respecter strictement : ${regime}.`);
  const contraintes = CONTRAINTES_ALIM.filter((c) => (profil.contraintesAlim || []).includes(c.id) && c.exclut.length).map((c) => c.label);
  if (contraintes.length) lignes.push(`Contraintes à respecter strictement : ${contraintes.join(", ")}.`);
  if (allergies.length) lignes.push(`ALLERGIES, à exclure totalement (même en trace ou en option) : ${allergies.join(", ")}.`);
  if (mots.length) lignes.push(`Aliments que la personne n'aime pas, à ne jamais utiliser : ${mots.join(", ")}.`);
  lignes.push(
    "Les recettes de déjeuner et de dîner sont pour 4 portions (cuisiner une fois, manger deux fois) ; petit-déjeuner et collation pour 1 ou 2 portions.",
    "Quantités des ingrédients en grammes ou en millilitres pour toutes les portions de la recette (ex. « 300 g », « 20 ml »), sauf épices et sel (« selon goût »).",
    "coutPortion : coût estimé d'UNE portion en euros, aux prix moyens 2026 d'un supermarché en France (marques distributeur). Sois réaliste, ne sous-estime pas.",
    `contient : liste de ce que la recette contient parmi ${CONTIENT_RECETTE.join(", ")} (les 14 allergènes réglementaires et les familles viande, volaille, porc, miel).`,
    "regimes : liste parmi vegan, vegetarien, sans-porc, quand la recette les respecte.",
    "parPortion : valeurs nutritionnelles d'une portion (kcal, protéines p, glucides c, lipides f en grammes).",
    "photo : 2 à 5 mots EN ANGLAIS décrivant le plat servi, pour trouver sa photo (ex. « beef stir fry rice noodles »).",
    "Réponds UNIQUEMENT avec un objet JSON valide, sans markdown :",
    '{"recettes":[{"nom":"","description":"une phrase","categorie":"dejeuner","portions":4,"preparationMin":10,"cuissonMin":10,"ingredients":[{"nom":"Riz basmati","quantite":"300 g"}],"etapes":["étape courte"],"parPortion":{"kcal":0,"p":0,"c":0,"f":0},"coutPortion":0,"photo":"","contient":[],"regimes":[]}]}',
    "categorie : une de petit-dejeuner, dejeuner, diner, collation. Entre 3 et 8 étapes courtes. 15 ingrédients au plus."
  );
  return lignes.join("\n");
}

const borne = (v, min, max, defaut) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut;
};

const listeTexte = (v, max, longueur) =>
  (Array.isArray(v) ? v : [])
    .filter((x) => typeof x === "string" && x.trim())
    .slice(0, max)
    .map((x) => x.trim().slice(0, longueur));

/**
 * Lit et contrôle les recettes rendues par l'IA. Rend { recettes, ecartees }.
 * Une recette écartée ne revient jamais par une autre porte.
 */
export function lireRecettesIa(texte, { profil = {}, prefs = PREFS_DEFAUT, graine = 1 } = {}) {
  const brut = JSON.parse(extraireObjetJson(texte));
  const liste = Array.isArray(brut && brut.recettes) ? brut.recettes : [];
  const mots = motsAEviter(prefs.aEviter);
  const categoriesVoulues = new Set((prefs.repas || []).map((t) => CATEGORIES_PAR_REPAS[t]));
  const recettes = [];
  const ecartees = [];

  liste.slice(0, 20).forEach((r, i) => {
    if (!r || typeof r !== "object" || !r.nom) return;
    const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : [])
      .filter((x) => x && x.nom)
      .slice(0, 15)
      .map((x) => ({ nom: String(x.nom).trim().slice(0, 60), quantite: String(x.quantite || "selon goût").trim().slice(0, 40) }));
    const pp = r.parPortion || {};
    const p = borne(pp.p, 0, 150, 0);
    const c = borne(pp.c, 0, 300, 0);
    const f = borne(pp.f, 0, 120, 0);
    const calculees = Math.round(p * 4 + c * 4 + f * 9);
    let kcal = borne(pp.kcal, 0, 2500, 0);
    // Des calories qui ne collent pas aux macros (écart de plus de 20 %) :
    // on se fie aux macros, plus faciles à vérifier.
    if (calculees > 0 && (kcal <= 0 || Math.abs(kcal - calculees) > calculees * 0.2)) kcal = calculees;
    const categorie = CATEGORIES_PAR_REPAS[r.categorie] || (r.categorie === "dessert" ? "collation" : "dejeuner");
    const recette = corrigerEtiquettes({
      id: `ia-${graine}-${i}`,
      nom: String(r.nom).trim().slice(0, 80),
      description: String(r.description || "").trim().slice(0, 200),
      categorie,
      profils: [profil.goal === "prise" ? "prise" : profil.goal === "perte" ? "perte" : profil.goal === "performance" ? "force" : "maintien"],
      regimes: listeTexte(r.regimes, 3, 20).filter((x) => ["vegan", "vegetarien", "sans-porc"].includes(x)),
      contient: listeTexte(r.contient, 12, 20).map(normaliser),
      portions: Math.round(borne(r.portions, 1, 8, 2)),
      preparationMin: Math.round(borne(r.preparationMin, 0, 180, 10)),
      cuissonMin: Math.round(borne(r.cuissonMin, 0, 240, 0)),
      difficulte: "facile",
      ingredients,
      etapes: listeTexte(r.etapes, 8, 220),
      parPortion: { kcal, p: Math.round(p), c: Math.round(c), f: Math.round(f) },
      coutPortion: Math.round(borne(r.coutPortion, 0, 30, 0) * 100) / 100,
      photo: normaliserRequetePhoto(r.photo) || "",
      surMesure: true
    });

    let raison = null;
    if (!ingredients.length || !recette.etapes.length || !(kcal > 0)) raison = "incomplète";
    else if (refusRegime(recette, profil)) raison = refusRegime(recette, profil);
    else if (contientMotRefuse(recette, mots)) raison = "aliment refusé";
    // Cinq minutes de tolérance : « 20 minutes » annoncé pour 22 reste réaliste.
    else if (recette.preparationMin + recette.cuissonMin > num(prefs.tempsMax) + 5) raison = "trop longue";
    else if (!categoriesVoulues.has(categorie) && !(categorie === "diner" && categoriesVoulues.has("dejeuner")) && !(categorie === "dejeuner" && categoriesVoulues.has("diner")))
      raison = "repas non demandé";
    if (raison) ecartees.push({ nom: recette.nom, raison });
    else recettes.push(recette);
  });
  return { recettes, ecartees };
}

/**
 * Coût estimé du menu : chaque part mangée coûte sa part de recette.
 * Les restes du dîner comptent une fois, au repas où on les mange.
 */
export function coutPlan(plan, recettes) {
  const parId = new Map((recettes || []).map((r) => [r.id, r]));
  let total = 0;
  let inconnus = 0;
  for (const j of (plan && plan.jours) || [])
    for (const x of j.repas) {
      if (!x.recetteId) continue;
      const r = parId.get(x.recetteId);
      const c = r ? num(r.coutPortion) : 0;
      if (c > 0) total += c * x.parts;
      else inconnus += 1;
    }
  return { total: Math.round(total * 100) / 100, repasSansPrix: inconnus };
}

/** Assemble le menu à partir des recettes contrôlées. */
export function construireMenuSurMesure({ recettes: toutes, profil, cibles, prefs, debut, graine = 1, restes = true }) {
  // Le profil a pu changer depuis la création (halal, allergie) : on relit.
  const recettes = (toutes || []).map(corrigerEtiquettes).filter((r) => !refusRegime(r, profil));
  // Sans les objectifs du coach (profil incomplet), pas de menu inventé.
  const plan = genererPlanRepas({
    catalogue: recettes,
    profil,
    cibles,
    debut,
    graine,
    restes,
    typesRepas: prefs.repas,
    budgetRepas: budgetParRepas(prefs)
  });
  if (!plan) return null;
  const cout = coutPlan(plan, recettes);
  return {
    ...plan,
    restes,
    surMesure: { ...prefs },
    budgetRepas: budgetParRepas(prefs),
    recettes,
    cout: { ...cout, budget: num(prefs.budget), depasse: cout.total > num(prefs.budget) }
  };
}

/** Normalise ce que l'écran envoie (valeurs hors bornes, champs manquants). */
export function preferencesValides(prefs = {}) {
  const repas = REPAS_DU_JOUR.map((t) => t.id).filter((id) => (prefs.repas || []).includes(id));
  return {
    repas: repas.length ? repas : [...PREFS_DEFAUT.repas],
    budget: Math.round(borne(prefs.budget, BUDGET_MIN, BUDGET_MAX, PREFS_DEFAUT.budget)),
    cuisine: CUISINES.some((c) => c.id === prefs.cuisine) ? prefs.cuisine : "variee",
    aEviter: String(prefs.aEviter || "").slice(0, 200),
    tempsMax: TEMPS_CUISINE.includes(Number(prefs.tempsMax)) ? Number(prefs.tempsMax) : PREFS_DEFAUT.tempsMax,
    materiel: MATERIELS_CUISINE.map((m) => m.id).filter((id) => (prefs.materiel || []).includes(id))
  };
}

/**
 * Demande les recettes à l'IA puis assemble le menu. Rend le plan, ou lève
 * une erreur (« peu-de-recettes » si trop de recettes ont été écartées).
 */
export async function genererMenuSurMesure({ profil, cibles, prefs: brutes, debut, restes = true }) {
  const prefs = preferencesValides(brutes);
  // Pas d'appel à l'IA (ni de quota consommé) sans les objectifs du coach.
  if (!(num(cibles && cibles.calories) > 0)) throw new Error("sans-objectifs");
  const graine = (Date.now() % 100000) + 1;
  const texte = await genererTexte({ fonction: "planrepas", prompt: consigneMenu({ profil, cibles, prefs }), maxTokens: 8192, delaiMs: 120000 });
  const { recettes, ecartees } = lireRecettesIa(texte, { profil, prefs, graine });
  // Chaque repas choisi doit avoir au moins une recette, sinon le menu
  // serait à moitié vide : mieux vaut le dire et laisser réessayer.
  const couverts = prefs.repas.every((t) =>
    recettes.some((r) => r.categorie === CATEGORIES_PAR_REPAS[t] || ((t === "dejeuner" || t === "diner") && (r.categorie === "dejeuner" || r.categorie === "diner")))
  );
  if (!couverts) {
    const e = new Error("peu-de-recettes");
    e.ecartees = ecartees;
    throw e;
  }
  return { ...construireMenuSurMesure({ recettes, profil, cibles, prefs, debut, graine, restes }), ecartees };
}

/**
 * Un menu gardé sur le téléphone, relu avec le profil ACTUEL (revue du
 * 20/11/2026) : si le client a ajouté une allergie, est passé végétarien
 * ou halal depuis, les repas devenus interdits sont retirés de l'écran, de
 * la liste de courses et des restes, sans attendre « Nouveau menu ».
 * Menu sur mesure : ses recettes relues (corrigerEtiquettes, refusRegime) ;
 * menu du catalogue : les recettes que recettesDuMenu sert encore.
 * Rend { plan, retires } ; le plan d'origine est rendu tel quel si rien
 * n'est retiré.
 */
export function retirerInterdits(plan, { profil, catalogue = [] } = {}) {
  if (!plan || !Array.isArray(plan.jours)) return { plan, retires: 0 };
  const surMesure = Array.isArray(plan.recettes);
  const permises = surMesure
    ? plan.recettes.map(corrigerEtiquettes).filter((r) => !refusRegime(r, profil))
    : recettesDuMenu(catalogue, profil);
  const ids = new Set(permises.map((r) => r.id));
  let retires = 0;
  const kcalJour = num(plan.cibles && plan.cibles.calories);
  const jours = plan.jours.map((j) => {
    let change = false;
    const repas = j.repas.map((x) => {
      if (!x.recetteId || ids.has(x.recetteId)) return x;
      change = true;
      retires += 1;
      const def = REPAS_DU_JOUR.find((t) => t.id === x.typeRepas);
      return { typeRepas: x.typeRepas, recetteId: null, kcalVisees: Math.round(kcalJour * (def ? def.part : 0)), retire: true };
    });
    if (!change) return j;
    const total = repas.reduce((t, x) => (x.recetteId ? { kcal: t.kcal + x.kcal, p: t.p + x.p, c: t.c + x.c, f: t.f + x.f } : t), { kcal: 0, p: 0, c: 0, f: 0 });
    return { ...j, repas, total };
  });
  if (!retires) return { plan, retires: 0 };
  const suivant = { ...plan, jours };
  if (surMesure) {
    suivant.recettes = permises;
    if (plan.surMesure) {
      const cout = coutPlan(suivant, permises);
      const budget = num(plan.surMesure.budget);
      suivant.cout = { ...cout, budget, depasse: cout.total > budget };
    }
  }
  return { plan: suivant, retires };
}
