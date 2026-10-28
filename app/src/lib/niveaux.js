/**
 * Niveau d'une performance face aux grilles officielles, et scores
 * comparables entre disciplines (athlète du mois, worker/communaute.js).
 *
 * Toutes les valeurs viennent de documents officiels, cités à côté de
 * chaque constante. Aucune n'est inventée : quand une grille n'existe pas
 * pour un cas, la fonction rend null et l'écran le dit.
 */

import { num, round } from "./dates.js";
import { GRILLE_FFFORCE, NIVEAUX_FFFORCE, SAISON_FFFORCE } from "./grille-ffforce.js";
import { sourceParId } from "./sources-baremes.js";
import { BAREME_FFA, BASES_WORLD_AQUATICS, CATEGORIES_IWF, GRILLE_FFHM, MINIMA_FRANCE_COURSE, NIVEAUX_FFA, QUALIF_FFN_50, RECORDS_ROUTE, SERIES_FFHM, SINCLAIR } from "./grilles-sports.js";

/* ------------------------------------------------------------------ */
/* Force athlétique                                                     */
/* ------------------------------------------------------------------ */

/**
 * Catégories de poids IPF (IPF Technical Rulebook 2026, appliqué par la
 * FFForce, art. 8.1). Bornes hautes incluses : 66 = 59,01 à 66 kg.
 * -53 kg (hommes) et -43 kg (femmes) : subjuniors et juniors seulement.
 */
export const CATEGORIES_IPF = {
  h: [53, 59, 66, 74, 83, 93, 105, 120],
  f: [43, 47, 52, 57, 63, 69, 76, 84]
};

/**
 * Catégorie d'âge FFForce 2026 (âge atteint dans l'année civile) :
 * subjunior 14-18, junior 19-23, senior 24-39, masters 1 à 4 à partir de
 * 40, 50, 60 et 70 ans.
 */
export function categorieAgeFFForce(age) {
  const a = num(age);
  if (!a) return "senior";
  if (a <= 18) return "subjunior";
  if (a <= 23) return "junior";
  if (a < 40) return "senior";
  if (a < 50) return "master1";
  if (a < 60) return "master2";
  if (a < 70) return "master3";
  return "master4";
}

export const LIBELLES_AGE = {
  subjunior: "subjunior",
  junior: "junior",
  senior: "senior / open",
  master1: "master 1",
  master2: "master 2",
  master3: "master 3",
  master4: "master 4"
};

/** Catégorie de poids IPF : « 83 », « 120+ »… ou null sans poids. */
export function categorieIPF(sexe, poids, age) {
  const p = num(poids);
  if (!(p > 0)) return null;
  const s = sexe === "femme" || sexe === "f" ? "f" : "h";
  const jeune = ["subjunior", "junior"].includes(categorieAgeFFForce(age));
  const classes = CATEGORIES_IPF[s].filter((c, i) => i > 0 || jeune);
  const trouvee = classes.find((c) => p <= c);
  return trouvee ? String(trouvee) : `${classes[classes.length - 1]}+`;
}

/**
 * Points IPF GL (« Goodlift »), formule officielle de l'IPF :
 * GL = résultat × 100 / (A − B·e^(−C·poids)), coefficient arrondi à 6
 * décimales. Source : IPF_GL_Coefficients-2020.pdf
 * (https://www.powerlifting.sport/rules/codes/info/ipf-formula), dernière
 * version publiée par l'IPF au 24/10/2026. Valable à partir de 40 kg
 * (hommes) et 35 kg (femmes).
 */
export const COEFFICIENTS_GL = {
  h: {
    classique: { A: 1199.72839, B: 1025.18162, C: 0.00921 },
    dcClassique: { A: 320.98041, B: 281.40258, C: 0.01008 }
  },
  f: {
    classique: { A: 610.32796, B: 1045.59282, C: 0.03048 },
    dcClassique: { A: 142.40398, B: 442.52671, C: 0.04724 }
  }
};

export function pointsGL(resultat, poids, sexe, epreuve = "classique") {
  const r = num(resultat);
  const p = num(poids);
  const s = sexe === "femme" || sexe === "f" ? "f" : "h";
  if (!(r > 0) || p < (s === "f" ? 35 : 40)) return null;
  const { A, B, C } = COEFFICIENTS_GL[s][epreuve];
  const coef = Math.round((100 / (A - B * Math.exp(-C * p))) * 1e6) / 1e6;
  return round(r * coef, 2);
}

const LIBELLES_NIVEAUX = {
  R3: "Régional 3",
  R2: "Régional 2",
  R1: "Régional 1",
  N2: "National 2",
  N1: "National 1",
  Europe: "Europe",
  Monde: "Monde"
};

/**
 * Niveau FFForce d'un total (FA) ou d'un développé couché (DC).
 *
 * Rend { saison, categorie, categorieAge, atteint, prochain, paliers,
 * qualificationFrance } ou null (pas de poids, pas de grille) :
 *  - atteint : { id, libelle } ou null (niveau départemental) ;
 *  - prochain : { id, libelle, kg, ecart } ou null (tout est atteint) ;
 *  - paliers : [{ id, libelle, kg, atteint }] pour l'affichage ;
 *  - qualificationFrance : le niveau qui qualifie aux championnats de
 *    France pour cet âge (N1 ; le France Élite open passe par le
 *    classement fédéral, réservé aux athlètes au moins N2).
 */
export function niveauFFForce({ discipline = "FA", sexe, age, poids, valeur }) {
  const v = num(valeur);
  const s = sexe === "femme" || sexe === "f" ? "f" : "h";
  const categorie = categorieIPF(s, poids, age);
  if (!categorie || !(v > 0)) return null;
  const categorieAge = categorieAgeFFForce(age);
  const ligne = ((GRILLE_FFFORCE[discipline] || {})[s] || {})[categorieAge];
  const seuils = ligne && ligne[categorie];
  if (!seuils) return null;
  const paliers = NIVEAUX_FFFORCE.map((id, i) => ({ id, libelle: LIBELLES_NIVEAUX[id], kg: seuils[i], atteint: seuils[i] != null && v >= seuils[i] })).filter((p) => p.kg != null);
  // Le plus haut niveau atteint (les seuils peuvent ne pas être croissants
  // d'une catégorie à l'autre, mais ils le sont d'un niveau à l'autre).
  const atteints = paliers.filter((p) => p.atteint);
  const atteint = atteints.length ? atteints[atteints.length - 1] : null;
  const suivant = paliers.find((p) => !p.atteint);
  return {
    saison: SAISON_FFFORCE,
    categorie,
    categorieAge,
    atteint: atteint ? { id: atteint.id, libelle: atteint.libelle } : null,
    prochain: suivant ? { id: suivant.id, libelle: suivant.libelle, kg: suivant.kg, ecart: round(suivant.kg - v, 1) } : null,
    paliers,
    qualificationFrance: categorieAge === "senior" ? null : paliers.find((p) => p.id === "N1") || null
  };
}

/** Rang 0 (départemental) à 7 (Monde) : sert aux badges « Niveau fédéral ». */
export const rangNiveau = (n) => (n && n.atteint ? NIVEAUX_FFFORCE.indexOf(n.atteint.id) + 1 : 0);

/* ------------------------------------------------------------------ */
/* Haltérophilie                                                        */
/* ------------------------------------------------------------------ */

const court = (sexe) => (sexe === "femme" || sexe === "f" ? "f" : "h");

/** Catégorie IWF (depuis le 01/08/2026) : « 85 », « 110+ »… */
export function categorieIWF(sexe, poids) {
  const p = num(poids);
  if (!(p > 0)) return null;
  const classes = CATEGORIES_IWF[court(sexe)];
  const c = classes.find((x) => p <= x);
  return c ? String(c) : `${classes[classes.length - 1]}+`;
}

/** Total Sinclair 2025-2028 (total × coefficient). */
export function pointsSinclair(total, poids, sexe) {
  const t = num(total);
  const p = num(poids);
  if (!(t > 0) || !(p > 0)) return null;
  const { A, b } = SINCLAIR[court(sexe)];
  const coef = p > b ? 1 : Math.pow(10, A * Math.pow(Math.log10(p / b), 2));
  return round(t * coef, 2);
}

/** Âge FFHM 2026-2027 : U15 14-15, U17 16-17, U20 18-20, senior 21+. */
export const categorieAgeFFHM = (age) => {
  const a = num(age);
  if (!a || a >= 21) return "senior";
  if (a >= 18) return "u20";
  if (a >= 16) return "u17";
  return "u15";
};

const LIBELLES_FFHM = { DEB: "Débutant", DPT: "Départemental", PROVINCE: "Province", LIGUE: "Ligue", HON: "Honneur", NAT: "National", EUR: "Européen", MONDE: "Monde" };

/** Série FFHM d'un total : même forme que niveauFFForce. */
export function niveauFFHM({ sexe, age, poids, valeur }) {
  const v = num(valeur);
  const s = court(sexe);
  const categorie = categorieIWF(s, poids);
  if (!categorie || !(v > 0)) return null;
  const categorieAge = categorieAgeFFHM(age);
  const seuils = (GRILLE_FFHM[s][categorieAge] || {})[categorie];
  if (!seuils) return { categorie, categorieAge, horsGrille: true };
  const paliers = SERIES_FFHM.map((id, i) => ({ id, libelle: LIBELLES_FFHM[id], kg: seuils[i], atteint: seuils[i] != null && v >= seuils[i] })).filter((p) => p.kg != null);
  const atteints = paliers.filter((p) => p.atteint);
  const atteint = atteints.length ? atteints[atteints.length - 1] : null;
  const suivant = paliers.find((p) => !p.atteint);
  return {
    saison: sourceParId("ffhm-series").saison,
    categorie,
    categorieAge,
    atteint: atteint ? { id: atteint.id, libelle: atteint.libelle } : null,
    prochain: suivant ? { id: suivant.id, libelle: suivant.libelle, kg: suivant.kg, ecart: round(suivant.kg - v, 1) } : null,
    paliers,
    qualificationFrance: paliers.find((p) => p.id === (categorieAge === "senior" ? "NAT" : "HON")) || null
  };
}

/* ------------------------------------------------------------------ */
/* Course à pied                                                        */
/* ------------------------------------------------------------------ */

/** Catégorie d'âge FFA : U18 16-17, U20 18-19, U23 20-22, seniors 23-34, M0 35-39, puis par 5 ans jusqu'à M10 (85+). */
export function categorieAgeFFA(age) {
  const a = num(age);
  if (!a) return "Seniors";
  if (a < 18) return "U18";
  if (a < 20) return "U20";
  if (a < 23) return "U23";
  if (a < 35) return "Seniors";
  const m = Math.min(10, Math.floor((a - 35) / 5));
  return m >= 10 ? "M10+" : `M${m}`;
}

/**
 * Niveau FFA d'un chrono (barème IA à D7) et minima des championnats de
 * France pour l'âge. Rend { atteint, prochain: { id, temps, ecart },
 * minimaFrance: { temps, atteint } | null } ou null.
 */
export function niveauCourse(id, secondes, sexe, age) {
  const t = num(secondes);
  const s = court(sexe);
  const grille = BAREME_FFA[s][id];
  if (!grille || !(t > 0)) return null;
  // Le barème va du meilleur (IA) au plus lent (D7).
  const i = grille.findIndex((seuil) => t <= seuil);
  const atteint = i >= 0 ? { id: NIVEAUX_FFA[i] } : null;
  const j = i < 0 ? grille.length - 1 : i - 1;
  const prochain = j >= 0 ? { id: NIVEAUX_FFA[j], temps: grille[j], ecart: round(t - grille[j], 2) } : null;
  const cat = categorieAgeFFA(age);
  const mini = (MINIMA_FRANCE_COURSE[id] || {})[cat];
  return {
    atteint,
    prochain,
    categorieAge: cat,
    minimaFrance: mini ? { temps: mini[s === "f" ? 1 : 0], atteint: t <= mini[s === "f" ? 1 : 0] } : null
  };
}

/** Rang FFA de 0 (sous D7) à 23 (IA). */
export const rangFFA = (n) => (n && n.atteint ? NIVEAUX_FFA.length - NIVEAUX_FFA.indexOf(n.atteint.id) : 0);

/**
 * Score « athlète du mois » en course : pourcentage du record du monde
 * (record / chrono × 100), comparable entre distances et entre sexes.
 */
export function scoreCourse(id, secondes, sexe) {
  const rec = RECORDS_ROUTE[court(sexe)][id];
  const t = num(secondes);
  if (!rec || !(t > 0)) return null;
  return Math.min(100, round((rec / t) * 100, 1));
}

/* ------------------------------------------------------------------ */
/* Natation                                                             */
/* ------------------------------------------------------------------ */

/** Points World Aquatics (tronqués à l'entier). */
export function pointsNatation(id, secondes, sexe) {
  const base = (BASES_WORLD_AQUATICS[id] || {})[court(sexe)];
  const t = num(secondes);
  if (!base || !(t > 0)) return null;
  return Math.floor(1000 * Math.pow(base / t, 3));
}

export const scoreNatation = pointsNatation;

/** Repères FFN 2026 en bassin de 50 m : Challenge National et France Élite. */
export function niveauNatation(id, secondes, sexe) {
  const t = num(secondes);
  const k = court(sexe) === "f" ? 1 : 0;
  const points = pointsNatation(id, t, sexe);
  if (points == null) return null;
  const reperes = [
    { id: "challenge", libelle: "Challenge National (FFN)", temps: (QUALIF_FFN_50.challenge[id] || [])[k] },
    { id: "elite", libelle: "France Élite (FFN)", temps: (QUALIF_FFN_50.elite[id] || [])[k] }
  ]
    .filter((r) => r.temps)
    .map((r) => ({ ...r, atteint: t <= r.temps, ecart: round(t - r.temps, 2) }));
  return { points, reperes };
}

/* ------------------------------------------------------------------ */
/* Badge « Niveau fédéral » : trois marches communes à tous les sports  */
/* ------------------------------------------------------------------ */

/**
 * 1 = régional, 2 = national, 3 = international. Correspondance :
 *  - FFForce : R3 à R1 → régional ; N2, N1 → national ; Europe, Monde →
 *    international ;
 *  - FFHM : LIGUE → régional ; HON, NAT (France Honneur et Élite) →
 *    national ; EUR, MONDE → international ;
 *  - FFA : R6 à IR1 → régional ; N4 à N1, ou minima des championnats de
 *    France atteints → national ; IB, IA → international ;
 *  - FFN : Challenge National → régional ; France Élite → national.
 */
export function marcheFederale(discipline, n) {
  if (!n) return 0;
  if (discipline === "force") {
    const r = rangNiveau(n);
    return r >= 6 ? 3 : r >= 4 ? 2 : r >= 1 ? 1 : 0;
  }
  if (discipline === "halterophilie") {
    const id = n.atteint && n.atteint.id;
    return ["EUR", "MONDE"].includes(id) ? 3 : ["HON", "NAT"].includes(id) ? 2 : id === "LIGUE" ? 1 : 0;
  }
  if (discipline === "course") {
    const id = n.atteint && n.atteint.id;
    const base = ["IA", "IB"].includes(id) ? 3 : /^N\d$/.test(id || "") ? 2 : /^(IR|R)\d$/.test(id || "") ? 1 : 0;
    return Math.max(base, n.minimaFrance && n.minimaFrance.atteint ? 2 : 0);
  }
  if (discipline === "natation") {
    const r = (n.reperes || []).filter((x) => x.atteint).map((x) => x.id);
    return r.includes("elite") ? 2 : r.includes("challenge") ? 1 : 0;
  }
  return 0;
}
