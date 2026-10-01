/**
 * Recettes du coach : le catalogue hebdomadaire, filtre pour chaque client.
 *
 * Le catalogue (recettes-coach-catalogue.js) est rempli chaque semaine par
 * la routine « Recettes hebdo » ; ce module decide ce que CHAQUE client en
 * voit, et verifie que chaque recette dit vrai.
 *
 * ─────────────────────────────────────────────────────────────────────
 * LA REGLE QUI NE SE NEGOCIE PAS : LE REGIME ET LES ALLERGIES
 * ─────────────────────────────────────────────────────────────────────
 *
 * Un client vegan ne voit jamais une recette au poulet, un client sans porc
 * jamais une recette aux lardons, un allergique aux arachides jamais une
 * recette au beurre de cacahuete. Ce n'est pas un tri : la recette n'est
 * pas affichee du tout. Les memes regles que pour les aliments (voir
 * regimeOk dans aliments.js) : allergies d'abord, puis restriction.
 *
 * Et parce qu'une etiquette posee a la main peut mentir, `verifierRecette`
 * relit les ingredients eux-memes : une recette etiquetee vegan qui
 * contient du miel, ou sans porc qui contient de la gelatine, est refusee
 * par les tests avant de pouvoir etre fusionnee.
 *
 * ─────────────────────────────────────────────────────────────────────
 * LES PROFILS
 * ─────────────────────────────────────────────────────────────────────
 *
 * Neuf objectifs ou disciplines. « Vegan » et « sans porc » ne sont pas des
 * profils mais des regimes : ils filtrent, ils ne classent pas.
 * « Powerlifter » et « force athletique » designent la meme discipline : un
 * seul profil, « force ».
 */

import { num } from "./dates.js";
import { repartitionDuProfil, restrictionDuProfil } from "./regimes.js";

export const PROFILS_RECETTE = [
  { id: "perte", label: "Perte de poids" },
  { id: "prise", label: "Prise de masse" },
  { id: "maintien", label: "Maintien" },
  { id: "remise-en-forme", label: "Remise en forme" },
  { id: "force", label: "Force athlétique" },
  { id: "bodybuilding", label: "Bodybuilding" },
  { id: "hyrox", label: "Hyrox" },
  { id: "marathon", label: "Marathon" },
  { id: "ironman", label: "Ironman" }
];

export const REGIMES_RECETTE = ["vegan", "vegetarien", "sans-porc"];

export const CATEGORIES_RECETTE = {
  "petit-dejeuner": "Petit-déjeuner",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  collation: "Collation",
  dessert: "Dessert"
};

export const MOMENTS_RECETTE = {
  quotidien: "Au quotidien",
  "avant-entrainement": "Avant l'entraînement",
  "apres-entrainement": "Après l'entraînement",
  "veille-de-course": "Veille de course",
  "pendant-effort": "Pendant l'effort",
  recuperation: "Récupération"
};

/** Allergenes du profil, plus les familles qui portent les regimes. */
export const CONTIENT_RECETTE = [
  "gluten",
  "lactose",
  "arachides",
  "fruits-a-coque",
  "oeufs",
  "poisson",
  "crustaces",
  "soja",
  "viande",
  "volaille",
  "porc",
  "miel"
];

/** Familles exclues par chaque regime de recette. */
const EXCLUES = {
  vegan: ["viande", "volaille", "porc", "poisson", "crustaces", "lactose", "oeufs", "miel"],
  vegetarien: ["viande", "volaille", "porc", "poisson", "crustaces"],
  "sans-porc": ["porc"]
};

/**
 * Mots qui trahissent un ingredient interdit, relus dans les ingredients.
 * Volontairement larges : un faux positif se corrige en reformulant
 * l'ingredient (« lait d'avoine »), un faux negatif sert du porc a quelqu'un
 * qui n'en mange pas.
 */
const mots = (motif) => new RegExp(`(?<!\\p{L})(?:${motif})(?!\\p{L})`, "iu");
const MOTS_PORC = mots(
  "porc|jambon|lardons?|bacon|chorizo|saucisson|saucisses?|rillettes|andouilles?|andouillettes?|boudin|pancetta|coppa|speck|mortadelle|lard|saindoux|g[ée]latine"
);
const MOTS_CHAIR = mots(
  "poulet|dinde|b(?:œ|oe)uf|veau|agneau|canard|viande|merguez|thon|saumon|cabillaud|colin|sardines?|maquereau|crevettes?|poissons?|anchois|surimi"
);
const MOTS_ANIMAL = mots(
  "(?:œ|oe)ufs?|miel|beurre(?! de (?:cacahu[eè]te|cajou|amande|noisette))|fromages?|feta|mozzarella|parmesan|ricotta|yaourts?|skyr|cr[èe]me(?! de coco)|whey|lactos[ée]rum|lait(?! (?:de |d'|d’)?(?:coco|soja|avoine|amande|riz|noisette|cajou))"
);

/**
 * Ce que revele un ingredient, et qui doit donc figurer dans `contient`.
 *
 * Ajoute le 01/10/2026 apres deux oublis de la premiere semaine de la
 * routine (sauce soja et flocons d'avoine sans « gluten ») : un client
 * allergique ne voit pas les recettes qui contiennent son allergene, et un
 * oubli dans `contient` lui en montre une qu'il ne peut pas manger. Les
 * familles viande, volaille et porc portent les regimes (pescetarien, sans
 * porc) ; le miel, lui, est deja controle par la regle vegan.
 */
const REVELE = {
  gluten: mots(
    "bl[ée]|farine(?! (?:de |d'|d’)?(?:riz|pois|sarrasin|ma[ïi]s|coco|amande|ch[âa]taigne|lupin))|p[âa]tes|pain|boulgour|semoule|couscous|avoine|orge|seigle|[ée]peautre|tortillas?|chapelure|seitan|biscottes?|biscuits?|nouilles|wraps?|brioche|sauce soja"
  ),
  lactose: mots(
    "lait(?! (?:de |d'|d’)?(?:coco|soja|avoine|amande|riz|noisette|cajou))|yaourts?|yogourts?|skyr|fromages?|feta|mozzarella|parmesan|ricotta|emmental|comt[ée]|mascarpone|cottage|k[ée]fir|cr[èe]me(?! de coco)|beurre(?! de (?:cacahu[eè]te|cajou|amande|noisette))|whey|lactos[ée]rum|petits?-suisses?"
  ),
  oeufs: mots("(?:œ|oe)ufs?|mayonnaise"),
  arachides: mots("cacahu[eè]tes?|arachides?"),
  "fruits-a-coque": mots("amandes?|noix(?! de (?:coco|muscade))|noisettes?|cajou|pistaches?|p[ée]can|macadamia"),
  soja: mots("soja|tofu|tempeh|edamame|tamari|miso"),
  poisson: mots("thon|saumon|cabillaud|colin|merlu|truite|sardines?|maquereau|anchois|poissons?|surimi|nuoc-m[âa]m"),
  crustaces: mots("crevettes?|crabe|homard|langoustines?|gambas|[ée]crevisses?"),
  viande: mots("b(?:œ|oe)uf|veau|agneau|viande|merguez"),
  volaille: mots("poulet|dinde|canard|pintade|volaille"),
  porc: MOTS_PORC
};

/** Les erreurs d'une recette ; une liste vide veut dire qu'elle est publiable. */
export function verifierRecette(r) {
  const e = [];
  const req = (cond, msg) => {
    if (!cond) e.push(msg);
  };
  req(typeof r.id === "string" && /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(r.id), "id au format AAAA-MM-JJ-nom");
  req(typeof r.nom === "string" && r.nom.trim().length >= 3 && r.nom.length <= 70, "nom (3 à 70 caractères)");
  req(typeof r.description === "string" && r.description.length <= 160, "description (160 caractères max)");
  req(r.categorie in CATEGORIES_RECETTE, "categorie inconnue");
  req(r.moment in MOMENTS_RECETTE, "moment inconnu");
  req(Array.isArray(r.profils) && r.profils.length > 0, "au moins un profil");
  for (const p of r.profils || []) req(PROFILS_RECETTE.some((x) => x.id === p), `profil inconnu : ${p}`);
  for (const g of r.regimes || []) req(REGIMES_RECETTE.includes(g), `regime inconnu : ${g}`);
  for (const c of r.contient || []) req(CONTIENT_RECETTE.includes(c), `contient inconnu : ${c}`);
  req(Number.isInteger(r.portions) && r.portions >= 1 && r.portions <= 12, "portions entre 1 et 12");
  req(Array.isArray(r.ingredients) && r.ingredients.length >= 2, "au moins 2 ingrédients");
  for (const i of r.ingredients || []) req(i && i.nom && i.quantite, "ingrédient sans nom ou sans quantité");
  req(Array.isArray(r.etapes) && r.etapes.length >= 2, "au moins 2 étapes");

  const m = r.parPortion || {};
  for (const k of ["kcal", "p", "c", "f", "fibres"]) req(Number.isFinite(m[k]) && m[k] >= 0, `parPortion.${k} manquant`);
  // Les calories doivent correspondre aux macros (4/4/9), a 10 % pres plus
  // les fibres (environ 2 kcal/g) : sinon une des valeurs est fausse.
  if (Number.isFinite(m.kcal) && m.kcal > 0) {
    const atwater = 4 * num(m.p) + 4 * num(m.c) + 9 * num(m.f);
    req(Math.abs(m.kcal - atwater) <= 0.1 * m.kcal + 2 * num(m.fibres), `calories incohérentes : ${m.kcal} annoncées, ${Math.round(atwater)} d'après les macros`);
  }

  // Les regimes annonces doivent etre vrais, d'apres `contient` ET d'apres
  // les ingredients eux-memes.
  const contient = r.contient || [];
  const texte = (r.ingredients || []).map((i) => i.nom).join(" · ");
  for (const g of r.regimes || []) {
    const interdit = (EXCLUES[g] || []).filter((x) => contient.includes(x));
    req(!interdit.length, `« ${g} » mais contient ${interdit.join(", ")}`);
  }
  const regimes = r.regimes || [];
  if (regimes.includes("vegan")) req(!MOTS_ANIMAL.test(texte) && !MOTS_CHAIR.test(texte) && !MOTS_PORC.test(texte), "« vegan » mais un ingrédient est d'origine animale");
  if (regimes.includes("vegetarien")) req(!MOTS_CHAIR.test(texte) && !MOTS_PORC.test(texte), "« vegetarien » mais un ingrédient est de la viande ou du poisson");
  if (regimes.includes("sans-porc")) req(!MOTS_PORC.test(texte), "« sans-porc » mais un ingrédient contient du porc ou un dérivé");
  // Chaque allergene ou famille revele par un ingredient doit etre declare.
  for (const ing of r.ingredients || []) {
    for (const [famille, motif] of Object.entries(REVELE)) {
      if (ing && motif.test(String(ing.nom)) && !contient.includes(famille)) {
        e.push(`allergène manquant : « ${ing.nom} » → ajouter « ${famille} » à contient`);
      }
    }
  }
  // Et l'inverse : une recette vegetale doit le dire, sinon les clients
  // vegetariens ne la verraient jamais.
  if (regimes.includes("vegan")) req(regimes.includes("vegetarien") && regimes.includes("sans-porc"), "vegan implique vegetarien et sans-porc");
  if (regimes.includes("vegetarien")) req(regimes.includes("sans-porc"), "vegetarien implique sans-porc");
  return e;
}

/** Plafond de glucides par portion pour un client en keto. */
const GLUCIDES_KETO_PAR_PORTION = 15;

/** Cette recette peut-elle etre montree a ce client ? */
export function recetteCompatible(r, profil) {
  const contient = r.contient || [];
  const allergies = (profil && profil.allergies) || [];
  if (contient.some((x) => allergies.includes(x))) return false;

  const regimes = r.regimes || [];
  const restriction = restrictionDuProfil(profil);
  if (restriction === "vegetalien" && !regimes.includes("vegan")) return false;
  if (restriction === "vegetarien" && !regimes.includes("vegetarien")) return false;
  if (restriction === "pescetarien" && contient.some((x) => ["viande", "volaille", "porc"].includes(x))) return false;
  if (restriction === "sans-porc" && !regimes.includes("sans-porc")) return false;

  if (repartitionDuProfil(profil) === "keto" && num(r.parPortion?.c) > GLUCIDES_KETO_PAR_PORTION) return false;
  return true;
}

/** Les profils de recette qui correspondent a l'objectif du client. */
export function profilsDuClient(profil) {
  switch (profil && profil.goal) {
    case "perte":
      return ["perte", "remise-en-forme"];
    case "prise":
      return ["prise", "bodybuilding", "force"];
    case "performance":
      return ["force", "bodybuilding", "hyrox", "marathon", "ironman"];
    default:
      return ["maintien", "remise-en-forme"];
  }
}

/**
 * Les recettes a montrer : compatibles seulement, celles de l'objectif du
 * client d'abord, puis les plus recentes. `filtre` restreint a un profil.
 */
export function recettesPourClient(catalogue, profil, filtre = null) {
  const siens = profilsDuClient(profil);
  const pertinente = (r) => (r.profils || []).some((p) => siens.includes(p));
  return (catalogue || [])
    .filter((r) => recetteCompatible(r, profil))
    .filter((r) => !filtre || (filtre === "pour-toi" ? pertinente(r) : (r.profils || []).includes(filtre)))
    .map((r, i) => ({ r, i }))
    .sort((a, b) => Number(pertinente(b.r)) - Number(pertinente(a.r)) || a.i - b.i)
    .map((x) => x.r);
}

/**
 * La recette au format « Mes recettes » du client (voir enregistrerRecette),
 * pour la retrouver dans le Journal et la noter en une ou plusieurs parts.
 * Un seul ingredient porte les macros de la recette entiere : les quantites
 * du coach sont en texte libre (« 2 gousses »), on ne les redecoupe pas.
 */
export function versRecetteClient(r) {
  const m = r.parPortion;
  const n = r.portions;
  return {
    nom: r.nom,
    portions: n,
    ingredients: [
      {
        name: `${r.nom} (recette du coach)`,
        grams: null,
        calories: Math.round(m.kcal * n),
        protein: Math.round(m.p * n),
        carbs: Math.round(m.c * n),
        fat: Math.round(m.f * n)
      }
    ],
    origine: r.id
  };
}
