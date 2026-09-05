/**
 * Calculs nutritionnels.
 *
 * Portage fidele de index.html (lignes ~921-968 et ~1901). Ce sont les
 * chiffres sur lesquels le client regle son alimentation : la moindre
 * divergence avec l'ancienne version serait un changement silencieux de ses
 * objectifs. tests/parite.test.mjs compare donc les deux implementations sur
 * des centaines de profils avant toute bascule.
 */

import { addDays, avg, num, parseISO, todayISO } from "./dates.js";

export const GOALS = [
  { id: "perte", label: "Perte de poids" },
  { id: "prise", label: "Prise de masse" },
  { id: "maintien", label: "Maintien" },
  { id: "performance", label: "Performance" }
];

export const ACTIVITY_LEVELS = [
  { id: "sedentaire", label: "Sédentaire (peu ou pas de sport)", mult: 1.2 },
  { id: "leger", label: "Légèrement actif (1-3x/sem)", mult: 1.375 },
  { id: "modere", label: "Modérément actif (3-5x/sem)", mult: 1.55 },
  { id: "actif", label: "Très actif (6-7x/sem)", mult: 1.725 },
  { id: "tresactif", label: "Extrêmement actif (physique)", mult: 1.9 }
];

export const GOAL_CAL_ADJUST = { perte: -0.2, prise: 0.1, maintien: 0, performance: 0.05 };

/**
 * Part minimale des calories venant des lipides.
 *
 * En dessous d'environ 20 %, la production hormonale est affectee — c'est
 * documente, et cela touche d'abord les clientes legeres en deficit, chez
 * qui 0,6 g/kg ne represente que 18 % des calories. Ce plancher ne change
 * rien pour les autres : il ne s'applique que quand la regle au poids
 * descend en dessous.
 */
const PART_LIPIDES_MIN = 0.2;

/**
 * Directions possibles sur l'objectif « performance ».
 *
 * Un pratiquant de force athletique n'est pas seulement en performance : il
 * est en performance ET en train de prendre du poids, ou d'en perdre — pour
 * passer dans une categorie, ou parce qu'il a fini une prise de masse. Ce
 * sont deux besoins caloriques opposes sous un meme objectif.
 *
 * Jusqu'ici il n'avait pas le choix : rester en « performance » (+5 %), ou
 * basculer en « perte » et se retrouver a -20 %, un deficit qui coute de la
 * force a quelqu'un qui essaie precisement d'en garder.
 */
export const PERFORMANCE_DIRECTIONS = [
  { id: "maintien", label: "Maintenir mon poids" },
  { id: "prise", label: "Prendre du poids / du muscle" },
  { id: "perte", label: "Perdre du poids (sèche)" }
];

/**
 * Ajustement calorique par direction, sur l'objectif performance.
 *
 * Les ecarts sont volontairement plus SERRES que sur les objectifs
 * generaux :
 *
 * - EN SECHE, -12 % au lieu de -20 %. Un deficit agressif fait perdre de la
 *   force et de la masse maigre. La reference pour un athlete est une perte
 *   lente, de l'ordre de 0,5 a 0,7 % du poids par semaine — ce qui, pour un
 *   pratiquant de 90 kg, correspond a peu pres a ce deficit.
 * - EN PRISE, +12 %. Au-dela, le surplus part en gras : cela degrade le
 *   rapport force/poids, fait changer de categorie pour de mauvaises
 *   raisons, et rallonge la seche suivante.
 *
 * L'absence de direction vaut « maintien » et conserve exactement le +5 %
 * d'aujourd'hui : aucun client deja en performance ne voit ses chiffres
 * bouger.
 */
const PERFORMANCE_CAL_ADJUST = { maintien: 0.05, prise: 0.12, perte: -0.12 };

/** Proteines, en g/kg du poids de reference. */
const PROTEINES_PAR_KG = 2;

/**
 * En seche de force, on monte a 2,2 g/kg.
 *
 * Plus de proteines en deficit protege la masse maigre, et c'est encore plus
 * vrai chez quelqu'un qui doit garder sa force pendant la seche.
 */
const PROTEINES_PAR_KG_SECHE_FORCE = 2.2;

/** Lipides, en g/kg du poids de reference. */
const LIPIDES_PAR_KG = 1;
const LIPIDES_PAR_KG_PERTE = 0.6;

/**
 * En seche de force, 0,8 g/kg plutot que 0,6.
 *
 * Descendre les lipides est la variable d'ajustement habituelle en seche,
 * mais un pratiquant de force a besoin de ses glucides pour s'entrainer :
 * autant ne pas ecraser les lipides jusqu'au plancher hormonal pour
 * gagner quelques grammes de glucides.
 */
const LIPIDES_PAR_KG_SECHE_FORCE = 0.8;

/** Direction retenue sur l'objectif performance. */
export function directionPerformance(profile) {
  if (!profile || profile.goal !== "performance") return null;
  const choisie = profile.performanceDirection;
  return PERFORMANCE_DIRECTIONS.some((d) => d.id === choisie) ? choisie : "maintien";
}

/**
 * Marge au-dessus du poids cible servant de reference aux proteines.
 *
 * Les besoins en proteines suivent la masse maigre, pas la masse totale.
 * Chez un client tres au-dessus de son objectif, 2 g/kg du poids ACTUEL
 * donne des quantites que personne ne mange (220 g par jour pour quelqu'un
 * dont l'objectif est 80 kg), et qui prennent la place du reste de
 * l'assiette. On plafonne donc la reference un peu au-dessus du poids cible.
 */
const MARGE_POIDS_CIBLE = 1.1;

/**
 * Poids servant de base aux proteines et aux lipides.
 *
 * C'est le poids actuel, sauf pour un client sensiblement au-dessus de son
 * objectif : la reference est alors plafonnee pres du poids cible. Les
 * CALORIES, elles, restent calculees sur le poids reel — c'est bien le corps
 * d'aujourd'hui qui depense.
 */
export function poidsDeReference(profile, poidsActuel) {
  const cible = num(profile.targetWeightKg);
  if (!poidsActuel) return poidsActuel;
  // La condition « poidsActuel <= cible » est redondante avec le Math.min
  // ci-dessous — verifie par mutation. Elle est gardee parce qu'elle dit la
  // regle : un client a son objectif, ou en dessous, garde son poids reel.
  if (!cible || cible <= 0 || poidsActuel <= cible) return poidsActuel;
  return Math.min(poidsActuel, cible * MARGE_POIDS_CIBLE);
}

/** Majoration liee au metier, cumulee au niveau d'activite sportive. */
const MAJORATION_METIER = { sedentaire: 0, actif: 0.05, "tres-actif": 0.12 };

/**
 * Plafond du facteur d'activite.
 *
 * Le cumul sport + metier peut depasser les niveaux physiologiquement
 * soutenables. 2,1 est la valeur haute observee hors athletes d'endurance et
 * travailleurs de force.
 */
const PAL_MAX = 2.1;

/** Metabolisme de base, formule de Mifflin-St Jeor. */
export function computeBMR({ sex, weightKg, heightCm, age }) {
  if (!weightKg || !heightCm || !age) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "homme" ? base + 5 : base - 161;
}

/** Objectifs journaliers : calories et macros. */
export function computeTargets(profile, currentWeightKg) {
  const weight = currentWeightKg || profile.startWeightKg;
  let tdee;

  if (profile.calibratedMaintenanceKcal) {
    // Une maintenance mesuree sur les donnees reelles prime sur toute formule.
    tdee = profile.calibratedMaintenanceKcal;
  } else {
    const bmr = computeBMR({
      sex: profile.sex,
      weightKg: weight,
      heightCm: profile.heightCm,
      age: profile.age
    });
    const activity =
      ACTIVITY_LEVELS.find((a) => a.id === profile.activityLevel) || ACTIVITY_LEVELS[1];
    const jobMult = MAJORATION_METIER[profile.jobType] || 0;
    const pal = Math.min(PAL_MAX, activity.mult * (1 + jobMult));
    tdee = bmr ? bmr * pal : null;
  }

  const direction = directionPerformance(profile);
  const adjust = direction ? PERFORMANCE_CAL_ADJUST[direction] : (GOAL_CAL_ADJUST[profile.goal] ?? 0);
  const calories = tdee ? (Math.round((tdee * (1 + adjust)) / 10) * 10) : null;

  const secheDeForce = direction === "perte";

  const proteinPerKg = secheDeForce ? PROTEINES_PAR_KG_SECHE_FORCE : PROTEINES_PAR_KG;
  const fatPerKg = secheDeForce
    ? LIPIDES_PAR_KG_SECHE_FORCE
    : profile.goal === "perte"
      ? LIPIDES_PAR_KG_PERTE
      : LIPIDES_PAR_KG;

  // Proteines et lipides suivent la masse maigre ; les calories suivent le
  // corps reel. D'ou deux poids differents dans le meme calcul.
  const reference = poidsDeReference(profile, weight);

  const protein = reference ? Math.round(reference * proteinPerKg) : null;

  const lipidesAuPoids = reference ? reference * fatPerKg : null;
  const lipidesPlancher = calories != null ? (calories * PART_LIPIDES_MIN) / 9 : null;

  // Le plancher est arrondi vers le HAUT, la regle au poids vers le plus
  // proche. Arrondir le plancher vers le bas le ferait repasser sous les
  // 20 %, et il ne tiendrait pas ce qu'il promet — y compris dans le cas
  // limite ou les deux valeurs sont a un dixieme de gramme l'une de l'autre.
  const fat =
    lipidesAuPoids != null
      ? Math.max(
          Math.round(lipidesAuPoids),
          lipidesPlancher != null ? Math.ceil(lipidesPlancher) : 0
        )
      : null;

  // Les glucides absorbent ce qui reste une fois proteines et lipides poses.
  const remainingKcal =
    calories != null && protein != null && fat != null
      ? Math.max(0, calories - protein * 4 - fat * 9)
      : null;
  const carbs = remainingKcal != null ? Math.round(remainingKcal / 4) : null;

  return { calories, protein, carbs, fat };
}

/**
 * Maintenance reelle, deduite du poids observe et des calories loguees.
 *
 * Plus fiable qu'une formule : elle tient compte du metabolisme reel du
 * client. Renvoie null tant que les donnees sont trop maigres pour conclure.
 */
export function computeCalibration(bodyLogs, logEntries, windowDays) {
  const since = addDays(todayISO(), -windowDays);

  const weights = bodyLogs
    .filter((b) => b.date >= since && b.weightKg != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (weights.length < 2) return null;

  const dayTotals = {};
  logEntries
    .filter((e) => e.date >= since)
    .forEach((e) => {
      dayTotals[e.date] = (dayTotals[e.date] || 0) + num(e.calories);
    });

  const loggedDays = Object.keys(dayTotals);
  if (loggedDays.length < 7) return null;

  const avgCal = avg(loggedDays.map((d) => dayTotals[d]));
  const weightChange = weights[weights.length - 1].weightKg - weights[0].weightKg;
  const daysSpan = Math.max(
    1,
    (parseISO(weights[weights.length - 1].date) - parseISO(weights[0].date)) / 864e5
  );

  // 7700 kcal ~ 1 kg de masse corporelle.
  const estimate = Math.round((avgCal - (weightChange * 7700) / daysSpan) / 10) * 10;
  return { estimate, days: windowDays, loggedDaysCount: loggedDays.length };
}

/**
 * Ce qu'il reste a consommer aujourd'hui.
 *
 * kcal est un solde SIGNE : il devient negatif en cas de depassement et sert
 * de signal (l'interface ne propose de suggestions qu'au-dessus de 150 kcal
 * restantes). Les macros, elles, alimentent l'algorithme de suggestion et
 * sont bornees a zero. Comportement volontaire, verifie par les tests.
 */
export function computeRemainingToday(logEntries, targets) {
  if (!targets || !targets.calories) return null;
  const today = todayISO();

  const totals = logEntries
    .filter((e) => e.date === today)
    .reduce(
      (a, e) => ({
        kcal: a.kcal + num(e.calories),
        p: a.p + num(e.protein),
        c: a.c + num(e.carbs),
        f: a.f + num(e.fat)
      }),
      { kcal: 0, p: 0, c: 0, f: 0 }
    );

  return {
    consumed: totals,
    kcal: targets.calories - totals.kcal,
    p: Math.max(0, (targets.protein || 0) - totals.p),
    c: Math.max(0, (targets.carbs || 0) - totals.c),
    f: Math.max(0, (targets.fat || 0) - totals.f)
  };
}
