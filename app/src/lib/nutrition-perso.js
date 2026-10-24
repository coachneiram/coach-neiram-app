/**
 * Objectifs nutritionnels sur mesure, repris de l'app Neiram le 24/10/2026.
 *
 * DANS L'APP COACH, C'EST UN REPERE, JAMAIS UN OBJECTIF.
 * Le coach fixe les objectifs de ses clients : ils restent ceux de
 * computeTargets (lib/nutrition.js), calcules par App.jsx sur le profil.
 * Ce module ne les modifie pas :
 *  - ciblesPersonnalisees n'est appelee QUE par la carte « Repère d'après
 *    tes données » (ui/CarteObjectifsSurMesure.jsx), jamais par App.jsx ;
 *  - les reponses du questionnaire (rythme, grossesse, sante, categorie de
 *    poids, macros en g/kg ou en %, glucides des jours d'entrainement)
 *    vivent dans une cle a part, cn_objectifs_sur_mesure, et non dans le
 *    profil : computeTargets ne les voit jamais, et elles ne partent ni
 *    dans la synchro, ni dans le bilan envoye au coach, ni dans les
 *    consignes IA. Les donnees de sante restent sur le telephone.
 * Dans l'app grand public, tout cela est Premium ; ici tout est inclus.
 *
 * Ce que le calcul ajoute, dans l'ordre :
 *  1. METABOLISME : avec une masse grasse mesuree (Mesures), moyenne de
 *     Mifflin-St Jeor et de Katch-McArdle (370 + 21,6 x masse maigre) :
 *     plus juste pour les personnes tres musclees ou tres minces (O'Neill
 *     2023 : Mifflin sous-estime chez les sportifs). La maintenance calibree
 *     sur les vraies donnees, quand elle existe, reste prioritaire.
 *  2. RYTHME : l'objectif en % du poids par semaine (MacroFactor), au lieu
 *     d'un -20 % fixe. Perte 0,25 a 1 %/sem, prise 0,1 a 0,5 %/sem (Helms
 *     2014, Iraki 2019). Le kg de variation ne vaut pas toujours 7700 kcal :
 *     densite selon la masse grasse (Forbes/Hall).
 *  3. GARDE-FOUS : deficit plafonne (25 %, 30 % si IMC >= 30, 1000 kcal),
 *     plancher (metabolisme de base, 1200 F / 1500 H), aucune perte pendant
 *     une grossesse, l'allaitement precoce, sous un IMC de 18,5, avant 18
 *     ans ou avec un antecedent de trouble alimentaire ; grossesse et
 *     allaitement ajoutent les kcal de l'EFSA (+0/+260/+500, +500).
 *  4. MACROS SUR MESURE : proteines en g/kg, lipides en %, ou les trois
 *     macros en grammes ; glucides selon les jours d'entrainement (budget
 *     de la semaine conserve).
 *  5. REPERES : fibres (max de 25 g et 14 g/1000 kcal), eau (EFSA, + sport),
 *     proteines >= 1,2 g/kg apres 65 ans, plafond proteines si maladie
 *     renale.
 *
 * Toujours « des reperes generaux, pas un avis medical ».
 */

import { addDays, num, round, todayISO } from "./dates.js";
import { computeBMR, computeTargets, directionPerformance, GOAL_CAL_ADJUST, PERFORMANCE_CAL_ADJUST, poidsDeReference } from "./nutrition.js";
import { repartitionDuProfil } from "./regimes.js";
import { planCategorie } from "./categorie-poids.js";
import { charger, enregistrer } from "./stockage.js";

/**
 * Reponses du questionnaire, hors du profil (voir l'en-tete). Le prefixe
 * cn_ les fait entrer dans la sauvegarde locale du client.
 */
export const CLE_OBJECTIFS_SUR_MESURE = "cn_objectifs_sur_mesure";

/** Seuls champs du questionnaire ; aucun ne recouvre un champ du profil. */
export const CHAMPS_SUR_MESURE = ["rythmePct", "situation", "contraintesSante", "categoriePoids", "macrosPerso", "cyclageGlucides"];

/** Ne garde que les champs du questionnaire. */
export function nettoyerReglages(brut) {
  const r = {};
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return r;
  for (const k of CHAMPS_SUR_MESURE) if (brut[k] !== undefined) r[k] = brut[k];
  return r;
}

export function lireReglagesSurMesure() {
  return nettoyerReglages(charger(CLE_OBJECTIFS_SUR_MESURE, {}));
}

export function enregistrerReglagesSurMesure(reglages) {
  const propres = nettoyerReglages(reglages);
  enregistrer(CLE_OBJECTIFS_SUR_MESURE, propres);
  return propres;
}

/**
 * Profil du calcul de repere : une COPIE du profil, completee des reponses
 * du questionnaire. Le profil enregistre n'est jamais modifie.
 */
export function profilPourRepere(profile, reglages) {
  return { ...(profile || {}), ...nettoyerReglages(reglages) };
}

/** Rythmes proposes, en % du poids par semaine. */
export const RYTHMES = {
  perte: [
    { id: 0.25, label: "Doux : 0,25 %/semaine" },
    { id: 0.5, label: "Recommandé : 0,5 %/semaine" },
    { id: 0.75, label: "Soutenu : 0,75 %/semaine" },
    { id: 1, label: "Rapide : 1 %/semaine" }
  ],
  prise: [
    { id: 0.1, label: "Prise propre : 0,1 %/semaine" },
    { id: 0.25, label: "Recommandé : 0,25 %/semaine" },
    { id: 0.5, label: "Rapide : 0,5 %/semaine" }
  ]
};

export const SITUATIONS = [
  { id: "", label: "Aucune" },
  { id: "enceinte-t1", label: "Enceinte, 1er trimestre" },
  { id: "enceinte-t2", label: "Enceinte, 2e trimestre" },
  { id: "enceinte-t3", label: "Enceinte, 3e trimestre" },
  { id: "allaitement", label: "J'allaite" }
];

/** Kcal en plus (EFSA 2013). Le 1er trimestre : +70, en pratique rien. */
const KCAL_SITUATION = { "enceinte-t1": 70, "enceinte-t2": 260, "enceinte-t3": 500, allaitement: 500 };
/** Proteines en plus, g/jour (EFSA 2012). */
const PROTEINES_SITUATION = { "enceinte-t1": 1, "enceinte-t2": 9, "enceinte-t3": 28, allaitement: 19 };

export const CONTRAINTES_SANTE = [
  { id: "tca", label: "Antécédent de trouble alimentaire", detail: "Aucun déficit calorique ne sera proposé ; parles-en à un professionnel." },
  { id: "renal", label: "Maladie rénale", detail: "Protéines limitées à 0,8 g/kg (sauf avis médical contraire)." },
  { id: "diabete", label: "Diabète de type 2", detail: "Glucides répartis sur les repas ; prudence avec le low carb sous insuline ou sulfamides." },
  { id: "hypertension", label: "Hypertension", detail: "Repère sel : moins de 5 g/jour ; le modèle DASH est conseillé." }
];

const PLANCHER = { femme: 1200, homme: 1500 };

/**
 * Modeles alimentaires (axe « repartition », lib/regimes.js) : part des
 * lipides et plancher de proteines. Mediterraneen : L 35-40 % (huile
 * d'olive) ; DASH : L ~27 %, P ~18 % ; paleo : L ~35 %.
 */
const MODELES = {
  mediterraneen: { lipides: 0.37 },
  dash: { lipides: 0.27, proteinesMin: 0.18 },
  paleo: { lipides: 0.35, proteinesMin: 0.22 }
};

/** Derniere masse grasse mesuree (moins de 90 jours), ou celle du profil. */
export function masseGrasseRecente(profile, bodyLogs, aujourdhui = todayISO()) {
  const depuis = addDays(aujourdhui, -90);
  const mesures = (bodyLogs || [])
    .filter((b) => b && b.date >= depuis && num(b.bodyFatPct) >= 3 && num(b.bodyFatPct) <= 60)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (mesures.length) return num(mesures[mesures.length - 1].bodyFatPct);
  const p = num(profile && profile.bodyFatPct);
  return p >= 3 && p <= 60 ? p : null;
}

/** Metabolisme de base : Mifflin, ou moyenne Mifflin / Katch-McArdle avec la masse grasse. */
export function metabolismeDeBase(profile, poids, masseGrasse) {
  const mifflin = computeBMR({ sex: profile.sex, weightKg: poids, heightCm: profile.heightCm, age: profile.age });
  if (!mifflin) return { bmr: null, mifflin: null, methode: null };
  if (masseGrasse == null) return { bmr: mifflin, mifflin, methode: "Mifflin-St Jeor" };
  const masseMaigre = poids * (1 - masseGrasse / 100);
  const katch = 370 + 21.6 * masseMaigre;
  return { bmr: (mifflin + katch) / 2, mifflin, katch, masseMaigre, methode: "Mifflin-St Jeor et Katch-McArdle (masse grasse)" };
}

/** Densite energetique d'un kg de variation de poids (Forbes/Hall). */
export function densiteKg(poids, masseGrasse) {
  if (masseGrasse == null || !(poids > 0)) return 7700;
  const mg = (poids * masseGrasse) / 100;
  const pMaigre = 10.4 / (10.4 + mg);
  return Math.round(pMaigre * 1800 + (1 - pMaigre) * 9400);
}

const ajustementObjectif = (profile) => {
  const direction = directionPerformance(profile);
  return direction ? PERFORMANCE_CAL_ADJUST[direction] : GOAL_CAL_ADJUST[profile.goal] ?? 0;
};

const sensObjectif = (profile) => {
  const direction = directionPerformance(profile);
  if (direction) return direction === "perte" ? "perte" : direction === "prise" ? "prise" : null;
  return profile.goal === "perte" ? "perte" : profile.goal === "prise" ? "prise" : null;
};

/**
 * Repere sur mesure. `contexte` : { bodyLogs, seances, aujourdhui,
 * seancePrevue }. Rend { calories, protein, carbs, fat, fibres, eauL,
 * details }. Ne sert qu'a l'affichage du repere : ce ne sont pas les
 * objectifs du client.
 */
export function ciblesPersonnalisees(profile, poidsActuel, contexte = {}) {
  if (!profile) return null;
  const base = computeTargets(profile, poidsActuel);
  const poids = num(poidsActuel || profile.startWeightKg);
  if (!base || base.calories == null || !(poids > 0)) return base;
  const { bodyLogs = [], seances = [], aujourdhui = todayISO() } = contexte;
  const alertes = [];
  const sexe = profile.sex === "homme" ? "homme" : "femme";
  const age = num(profile.age);
  const taille = num(profile.heightCm) / 100;
  const imc = taille > 0 ? poids / (taille * taille) : null;

  // 1. Maintenance : on la deduit du calcul partage, puis on corrige le
  // metabolisme si la masse grasse est connue (sauf maintenance calibree).
  const adj = ajustementObjectif(profile);
  let maintenance = base.calories / (1 + adj);
  const mg = masseGrasseRecente(profile, bodyLogs, aujourdhui);
  const m = metabolismeDeBase(profile, poids, mg);
  const calibree = num(profile.calibratedMaintenanceKcal) > 0 && !(profile.calibratedCoverage != null && profile.calibratedCoverage < 0.8);
  if (m.bmr && m.katch && !calibree) maintenance = maintenance * (m.bmr / m.mifflin);
  const bmr = m.bmr;

  // 2. Rythme : celui de la categorie de poids, sinon celui choisi, sinon
  // l'ajustement d'origine.
  const categorie = profile.categoriePoids && profile.categoriePoids.actif ? planCategorie(profile.categoriePoids, poids, aujourdhui, profile) : null;
  let sens = sensObjectif(profile);
  let rythme = sens && RYTHMES[sens].some((r) => r.id === num(profile.rythmePct)) ? num(profile.rythmePct) : null;
  let ajustement = adj;
  if (categorie && (categorie.statut === "perte" || categorie.statut === "trop-rapide") && categorie.rythmePct) {
    sens = "perte";
    rythme = categorie.rythmePct;
  } else if (categorie && categorie.statut === "dans") {
    sens = null;
    rythme = null;
    ajustement = 0;
  }
  let calories = rythme ? maintenance + (sens === "perte" ? -1 : 1) * ((rythme / 100) * poids * densiteKg(poids, mg)) / 7 : maintenance * (1 + ajustement);

  // 3. Garde-fous.
  const situation = KCAL_SITUATION[profile.situation] != null ? profile.situation : "";
  const contraintes = Array.isArray(profile.contraintesSante) ? profile.contraintesSante : [];
  const pasDePerte =
    !!situation ||
    contraintes.includes("tca") ||
    (imc != null && imc < 18.5) ||
    (age > 0 && age < 18);
  if (calories < maintenance && pasDePerte) {
    calories = maintenance;
    alertes.push(
      situation
        ? "Grossesse ou allaitement : pas de déficit calorique. Ton objectif est ta maintenance, avec les apports en plus recommandés."
        : imc != null && imc < 18.5
          ? "Ton IMC est sous 18,5 : l'appli ne propose pas de perte de poids. Parles-en à un professionnel de santé."
          : age > 0 && age < 18
            ? "Avant 18 ans, pas de régime : ton objectif est ta maintenance, pour bien grandir."
            : "Tu as signalé un antécédent de trouble alimentaire : pas de déficit proposé. Un professionnel peut t'accompagner."
    );
  }
  if (situation) calories += KCAL_SITUATION[situation] === 70 ? 0 : KCAL_SITUATION[situation];
  if (calories < maintenance) {
    const deficitMax = Math.min(1000, maintenance * (imc != null && imc >= 30 ? 0.3 : 0.25));
    if (maintenance - calories > deficitMax) {
      calories = maintenance - deficitMax;
      alertes.push("Rythme limité : un déficit plus grand ferait perdre du muscle et serait difficile à tenir.");
    }
    const plancher = Math.max(PLANCHER[sexe], bmr ? bmr : 0);
    if (calories < plancher) {
      calories = Math.min(maintenance, plancher);
      alertes.push(`Plancher de sécurité : pas moins de ${Math.round(plancher)} kcal par jour.`);
    }
  }
  calories = Math.round(calories / 10) * 10;

  // 4. Macros. Point de depart : la repartition du calcul partage, remise a
  // l'echelle des calories retenues.
  const facteur = calories / base.calories;
  let protein = base.protein;
  let fat = Math.round(base.fat * facteur);
  const glucidesPoses = repartitionDuProfil(profile) === "keto" || repartitionDuProfil(profile) === "lowcarb";
  let carbs = glucidesPoses ? base.carbs : null;

  const reference = poidsDeReference(profile, poids) || poids;
  // Sportif qui fait sa categorie en deficit : proteines hautes pour garder
  // le muscle (Helms 2014 : 2,3 a 3,1 g/kg de masse maigre).
  if (categorie && sens === "perte") protein = Math.max(protein, Math.round(2.2 * reference));
  if (age >= 65 && protein < 1.2 * poids) protein = Math.round(1.2 * poids);
  if (situation) protein += PROTEINES_SITUATION[situation];
  if (contraintes.includes("renal") && protein > 0.8 * poids) {
    protein = Math.round(0.8 * poids);
    alertes.push("Maladie rénale : protéines limitées à 0,8 g/kg. Suis l'avis de ton néphrologue.");
  }

  const perso = profile.macrosPerso || {};
  const manuel = perso.mode === "grammes" && num(perso.p) > 0 && num(perso.g) >= 0 && num(perso.l) > 0;
  if (manuel) {
    protein = Math.round(num(perso.p));
    carbs = Math.round(num(perso.g));
    fat = Math.round(num(perso.l));
    calories = protein * 4 + carbs * 4 + fat * 9;
  } else {
    if (num(perso.proteinesGKg) >= 0.8 && num(perso.proteinesGKg) <= 3 && !contraintes.includes("renal")) {
      protein = Math.round(num(perso.proteinesGKg) * reference);
    }
    // Modeles alimentaires : lipides et glucides en part des calories.
    const modele = MODELES[repartitionDuProfil(profile)];
    if (modele && !num(perso.lipidesPct)) fat = Math.round((calories * modele.lipides) / 9);
    if (modele && modele.proteinesMin) protein = Math.max(protein, Math.round((calories * modele.proteinesMin) / 4));
    const pctL = num(perso.lipidesPct);
    if (pctL >= 20 && pctL <= 45 && !glucidesPoses) fat = Math.round((calories * pctL) / 100 / 9);
    fat = Math.max(fat, Math.ceil((calories * 0.2) / 9), Math.round(0.5 * reference));
    // Plafond des proteines choisies a la main : 35 % des calories.
    if (num(perso.proteinesGKg) > 0) protein = Math.min(protein, Math.floor((calories * 0.35) / 4));
    if (glucidesPoses) {
      fat = Math.max(fat, Math.round((calories - protein * 4 - carbs * 4) / 9));
    } else {
      carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
    }
  }

  // Glucides selon les jours d'entrainement : +20 % les jours
  // d'entrainement, et moins les jours de repos, a budget hebdo constant.
  let jourEntrainement = null;
  if (profile.cyclageGlucides && !glucidesPoses && !manuel) {
    const parSemaine = Math.min(6, Math.max(1, num(profile.weeklyWorkoutTarget) || 3));
    jourEntrainement = (seances || []).some((s) => s && s.date === aujourdhui) || !!contexte.seancePrevue;
    const hausse = 0.2;
    const baisse = (hausse * parSemaine) / (7 - parSemaine);
    const delta = Math.round(carbs * (jourEntrainement ? hausse : -baisse));
    carbs = Math.max(0, carbs + delta);
    calories += delta * 4;
  }

  // 5. Reperes.
  const fibres = Math.max(25, Math.round((calories / 1000) * 14));
  const eauL = round((sexe === "homme" ? 2.5 : 2) * 0.8 + (situation === "allaitement" ? 0.7 : situation ? 0.3 : 0), 1);

  return {
    calories: Math.round(calories),
    protein,
    carbs,
    fat,
    fibres,
    eauL,
    details: {
      maintenance: Math.round(maintenance),
      bmr: bmr ? Math.round(bmr) : null,
      methode: m.methode,
      masseGrasse: mg,
      rythme,
      sens,
      densite: densiteKg(poids, mg),
      imc: imc ? round(imc, 1) : null,
      manuel,
      jourEntrainement,
      categorie,
      alertes
    }
  };
}

/** Explication lisible du calcul (ecran « Comment c'est calcule »). */
export function explicationCibles(c) {
  if (!c || !c.details) return [];
  const d = c.details;
  const lignes = [];
  if (d.bmr) lignes.push(`Métabolisme de base : ${d.bmr} kcal (${d.methode}${d.masseGrasse != null ? `, ${d.masseGrasse} % de masse grasse` : ""}).`);
  lignes.push(`Maintenance estimée : ${d.maintenance} kcal (activité, métier, et tes vraies données quand elles sont calibrées).`);
  if (d.rythme) {
    lignes.push(`Rythme choisi : ${d.sens === "perte" ? "perte" : "prise"} de ${String(d.rythme).replace(".", ",")} % de ton poids par semaine (1 kg ≈ ${d.densite} kcal pour toi).`);
  }
  if (d.categorie) lignes.push(...d.categorie.messages);
  if (d.manuel) lignes.push("Macros saisies à la main : les calories en découlent.");
  if (d.jourEntrainement != null) lignes.push(d.jourEntrainement ? "Jour d'entraînement : glucides en hausse." : "Jour de repos : glucides en baisse, budget de la semaine inchangé.");
  lignes.push(`Repères : ${c.fibres} g de fibres et environ ${String(c.eauL).replace(".", ",")} L de boissons par jour.`);
  return [...lignes, ...d.alertes];
}
