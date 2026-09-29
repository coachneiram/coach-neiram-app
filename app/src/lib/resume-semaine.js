/**
 * Resume nutrition des 7 derniers jours, et paliers de serie.
 *
 * Ajouts posterieurs a la bascule, d'apres Lifesum, Foodvisor et
 * MyFitnessPal. Le bilan hebdomadaire existant est ecrit pour le coach et
 * ne se regarde qu'une fois par semaine ; ce resume parle au client, a
 * tout moment : ses moyennes, son meilleur jour, et UN axe de travail —
 * un seul, sinon il n'en suit aucun.
 *
 * Fenetre glissante de 7 jours se terminant au jour donne : un mercredi,
 * la semaine calendaire n'aurait que deux jours et des moyennes sans
 * valeur.
 */

import { addDays, avg, num, round } from "./dates.js";
import { moyennesPortions } from "./portions-jour.js";
import { serieDeJours } from "./motivation.js";

/** Un jour est « dans la cible » a 10 % pres de l'objectif calorique. */
export const TOLERANCE_CIBLE = 0.1;

/** En deca, les moyennes ne disent rien : l'axe devient la regularite. */
export const JOURS_MINIMUM = 4;

/** Les 7 dates (ISO) de la fenetre, de la plus ancienne a `fin`. */
export function fenetre(fin, jours = 7) {
  return Array.from({ length: jours }, (_, k) => addDays(fin, k - (jours - 1)));
}

/**
 * Moyennes, jours dans la cible, meilleur jour, et l'axe a travailler.
 *
 * Les moyennes portent sur les jours SAISIS : un jour vide est un jour
 * « non renseigne », pas un jour a 0 kcal — sinon oublier de noter son
 * diner ferait croire a une semaine de restriction.
 */
export function resumeNutritionSemaine({ entrees, journal, objectifs, fin }) {
  const dates = fenetre(fin);
  const dansFenetre = new Set(dates);
  const parJour = {};
  for (const e of entrees || []) {
    if (!dansFenetre.has(e.date)) continue;
    const j = parJour[e.date] || (parJour[e.date] = { kcal: 0, p: 0, c: 0, f: 0 });
    j.kcal += num(e.calories);
    j.p += num(e.protein);
    j.c += num(e.carbs);
    j.f += num(e.fat);
  }
  const joursSaisis = dates.filter((d) => parJour[d]);
  const moyenne = (champ) => (joursSaisis.length ? round(avg(joursSaisis.map((d) => parJour[d][champ]))) : null);
  const moyennes = { kcal: moyenne("kcal"), p: moyenne("p"), c: moyenne("c"), f: moyenne("f") };

  const cible = num(objectifs && objectifs.calories);
  const ecart = (d) => Math.abs(parJour[d].kcal - cible);
  const joursDansLaCible = cible ? joursSaisis.filter((d) => ecart(d) <= cible * TOLERANCE_CIBLE).length : null;
  // Meilleur jour : le plus proche de l'objectif ; a egalite, le plus recent.
  const meilleurJour =
    cible && joursSaisis.length
      ? [...joursSaisis].sort((a, b) => ecart(a) - ecart(b) || b.localeCompare(a))[0]
      : null;

  const portions = moyennesPortions((journal || []).filter((f) => dansFenetre.has(f.date)));

  return {
    debut: dates[0],
    fin,
    joursSaisis: joursSaisis.length,
    moyennes,
    joursDansLaCible,
    meilleurJour: meilleurJour ? { date: meilleurJour, kcal: Math.round(parJour[meilleurJour].kcal) } : null,
    avgFruitsVeg: portions.avgFruitsVeg,
    axe: axeDeTravail({ joursSaisis: joursSaisis.length, moyennes, objectifs, avgFruitsVeg: portions.avgFruitsVeg })
  };
}

/**
 * L'axe prioritaire, dans cet ordre : noter assez de jours, puis les
 * proteines (ce qui protege le muscle et cale la faim), puis l'ecart
 * calorique, puis les fruits et legumes s'ils sont comptes.
 */
export function axeDeTravail({ joursSaisis, moyennes, objectifs, avgFruitsVeg }) {
  const o = objectifs || {};
  if (joursSaisis < JOURS_MINIMUM) {
    return {
      cle: "regularite",
      texte: `${joursSaisis} jour${joursSaisis > 1 ? "s" : ""} noté${joursSaisis > 1 ? "s" : ""} sur 7. Vise au moins ${JOURS_MINIMUM} : en dessous, les moyennes ne veulent rien dire.`
    };
  }
  if (o.protein && moyennes.p != null && moyennes.p < o.protein * 0.85) {
    return {
      cle: "proteines",
      texte: `Protéines : ${moyennes.p} g par jour pour ${o.protein} g visés. Ajoute une source de protéines à chaque repas (œufs, skyr, viande, poisson, légumineuses).`
    };
  }
  if (o.calories && moyennes.kcal != null && moyennes.kcal > o.calories * (1 + TOLERANCE_CIBLE)) {
    return {
      cle: "calories-hautes",
      texte: `Calories : ${moyennes.kcal} kcal par jour pour ${o.calories} visées. Repère le repas ou la collation qui fait dépasser, et commence par lui.`
    };
  }
  if (o.calories && moyennes.kcal != null && moyennes.kcal < o.calories * (1 - 1.5 * TOLERANCE_CIBLE)) {
    return {
      cle: "calories-basses",
      texte: `Calories : ${moyennes.kcal} kcal par jour pour ${o.calories} visées. Manger trop peu fait craquer et coûte du muscle : vérifie que tout est bien noté, puis ajoute une collation.`
    };
  }
  if (avgFruitsVeg != null && avgFruitsVeg < 5) {
    return {
      cle: "fruits-legumes",
      texte: `Fruits et légumes : ${avgFruitsVeg} portions par jour. Vise 5 : un fruit au petit-déjeuner et des légumes à chaque repas.`
    };
  }
  return { cle: "cap", texte: "Semaine régulière et proche de tes objectifs : garde le cap." };
}

/** Paliers de serie celebres, en jours consecutifs. */
export const PALIERS_SERIE = [7, 14, 30, 60, 100];

/**
 * Ou en est la serie par rapport aux paliers.
 *
 * `atteint` n'est renseigne que LE jour ou le palier tombe : feliciter pour
 * « 7 jours » pendant toute la deuxieme semaine perdrait son sens.
 */
export function etatPaliers(jours) {
  const n = Math.max(0, Math.floor(num(jours)));
  const prochain = PALIERS_SERIE.find((p) => p > n) || null;
  return {
    jours: n,
    atteint: PALIERS_SERIE.includes(n) ? n : null,
    prochain,
    reste: prochain ? prochain - n : null
  };
}

/** Au-dela du dernier palier, compter plus loin ne change plus rien. */
const MAXIMUM_SERIE = 120;

/**
 * Serie a afficher le jour `date`.
 *
 * Le matin, avant toute saisie, la serie « depuis aujourd'hui » vaut 0 :
 * afficher 0 a quelqu'un qui tient depuis trois semaines serait faux et
 * decourageant. On montre alors la serie arretee a hier, en signalant
 * qu'il reste a noter aujourd'hui pour la prolonger.
 */
export function serieDuJour({ date, repas, journal, seances }) {
  const depuis = (d) => serieDeJours({ date: d, repas, journal, seances, maximum: MAXIMUM_SERIE });
  const aujourdhui = depuis(date);
  if (aujourdhui > 0) return { ...etatPaliers(aujourdhui), aujourdhuiNote: true };
  return { ...etatPaliers(depuis(addDays(date, -1))), atteint: null, aujourdhuiNote: false };
}
