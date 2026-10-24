/**
 * Activites hors musculation : course, velo, natation, sports collectifs,
 * raquettes, combat, cours en salle, plein air, mobilite, vie active.
 *
 * Une activite s'enregistre comme une seance (meme liste, meme sauvegarde)
 * avec un champ `activite` et une liste d'exercices vide. Elle compte donc
 * dans les trophees, la serie de semaines et les classements de regularite,
 * mais pas dans les records, le volume ni les series par muscle, qui ne
 * concernent que la musculation.
 *
 * Depense : kcal = MET x poids (kg) x duree (h). Valeurs MET d'apres le
 * Compendium of Physical Activities (Herrmann et al., 2024 ; Ainsworth et
 * al., 2011), arrondies. Trois niveaux par sport (leger, modere, soutenu),
 * choisis par le ressenti (RPE) quand il est saisi. Pour la course et la
 * marche avec une distance, la vitesse et le denivele positif donnent une
 * valeur plus juste (equations metaboliques de l'ACSM). C'est une
 * estimation de l'energie brute, a +/- 20 % pres : l'app l'affiche « ≈ »
 * et ne l'ajoute pas au budget calorique.
 *
 * Intensite (OMS 2020) : moderee de 3 a 5,9 MET, soutenue a 6 MET et plus.
 * Quand le RPE est saisi, il prime (intensite relative, celle que l'OMS
 * recommande pour un individu) : 5-6 moderee, 7 et plus soutenue.
 */

import { addDays, num, round, todayISO } from "./dates.js";

export const FAMILLES_ACTIVITE = [
  { id: "endurance", label: "Endurance", emoji: "🏃" },
  { id: "salle", label: "Cours & cardio en salle", emoji: "🏋️" },
  { id: "collectif", label: "Sports collectifs", emoji: "⚽" },
  { id: "raquette", label: "Raquettes", emoji: "🎾" },
  { id: "combat", label: "Sports de combat", emoji: "🥊" },
  { id: "pleinair", label: "Plein air & montagne", emoji: "⛰️" },
  { id: "eau", label: "Sports d'eau", emoji: "🌊" },
  { id: "mobilite", label: "Mobilité & bien-être", emoji: "🧘" },
  { id: "quotidien", label: "Vie active", emoji: "🚶" }
];

/**
 * Catalogue. `met` : [leger, modere, soutenu]. `champs` : ce qui a un sens
 * pour ce sport (distance en km, denivele positif en m, frequence cardiaque
 * moyenne). `renfo` : activite de renforcement musculaire au sens de l'OMS.
 * `vitesse` : calcul MET depuis la distance (course, marche, velo).
 */
export const ACTIVITES = [
  // Endurance
  { id: "course", label: "Course à pied", emoji: "🏃", famille: "endurance", met: [8, 9.8, 12], champs: ["distance", "denivele", "fc"], vitesse: "course" },
  { id: "trail", label: "Trail", emoji: "⛰️", famille: "endurance", met: [8, 9.3, 12], champs: ["distance", "denivele", "fc"], vitesse: "course" },
  { id: "tapis", label: "Tapis de course", emoji: "🏃", famille: "endurance", met: [5, 8.5, 11], champs: ["distance", "fc"], vitesse: "course" },
  { id: "velo", label: "Vélo de route", emoji: "🚴", famille: "endurance", met: [6.8, 8, 10], champs: ["distance", "denivele", "fc"], vitesse: "velo" },
  { id: "vtt", label: "VTT", emoji: "🚵", famille: "endurance", met: [6.8, 8.5, 14], champs: ["distance", "denivele", "fc"] },
  { id: "natation", label: "Natation", emoji: "🏊", famille: "endurance", met: [5.8, 8, 9.8], champs: ["distance", "fc"] },
  { id: "marche-nordique", label: "Marche nordique", emoji: "🥢", famille: "endurance", met: [4.3, 5.3, 8.8], champs: ["distance", "denivele", "fc"], vitesse: "marche" },
  { id: "triathlon", label: "Triathlon / enchaînement", emoji: "🏅", famille: "endurance", met: [7, 9, 11.5], champs: ["distance", "fc"] },
  { id: "corde", label: "Corde à sauter", emoji: "🪢", famille: "endurance", met: [8.8, 11.8, 12.3], champs: ["fc"] },

  // Salle : cardio et cours collectifs
  { id: "hiit", label: "HIIT / Tabata", emoji: "🔥", famille: "salle", met: [6, 7, 11], champs: ["fc"] },
  { id: "cross-training", label: "Cross-training (CrossFit)", emoji: "🏋️", famille: "salle", met: [6, 7.5, 11], champs: ["fc"], renfo: true },
  { id: "circuit", label: "Circuit training", emoji: "🔁", famille: "salle", met: [4.3, 6, 8], champs: ["fc"], renfo: true },
  { id: "body-pump", label: "Body Pump / renfo en musique", emoji: "💪", famille: "salle", met: [4, 5.8, 7], champs: ["fc"], renfo: true },
  { id: "calisthenics", label: "Street workout / calisthenics", emoji: "🤸", famille: "salle", met: [3.8, 5, 8], champs: ["fc"], renfo: true },
  { id: "hyrox", label: "HYROX / course + stations", emoji: "🏁", famille: "salle", met: [7, 8, 10], champs: ["distance", "fc"], renfo: true },
  { id: "kettlebell", label: "Kettlebell", emoji: "🔔", famille: "salle", met: [5, 7.5, 9.8], champs: ["fc"], renfo: true },
  { id: "spinning", label: "Vélo d'appartement / RPM", emoji: "🚲", famille: "salle", met: [6.8, 9, 10.3], champs: ["distance", "fc"] },
  { id: "rameur", label: "Rameur", emoji: "🚣", famille: "salle", met: [5, 7.5, 11], champs: ["distance", "fc"] },
  { id: "elliptique", label: "Elliptique", emoji: "〰️", famille: "salle", met: [4, 5, 9], champs: ["distance", "fc"] },
  { id: "stepper", label: "Stepper / escalier", emoji: "🪜", famille: "salle", met: [5, 7, 9.3], champs: ["fc"] },
  { id: "aerobic", label: "Step / LIA / aérobic", emoji: "🕺", famille: "salle", met: [6.5, 7.3, 7.8], champs: ["fc"] },
  { id: "zumba", label: "Zumba / danse fitness", emoji: "💃", famille: "salle", met: [5, 6.5, 7.5], champs: ["fc"] },
  { id: "boxe-fitness", label: "Boxe fitness / Body Combat", emoji: "🥊", famille: "salle", met: [6, 7.5, 9.3], champs: ["fc"] },
  { id: "aquagym", label: "Aquagym / aquabike", emoji: "💦", famille: "salle", met: [4, 5.5, 7.5], champs: ["fc"] },

  // Sports collectifs
  { id: "football", label: "Football", emoji: "⚽", famille: "collectif", met: [5, 7, 9.5], champs: ["distance", "fc"] },
  { id: "futsal", label: "Futsal / foot à 5", emoji: "🥅", famille: "collectif", met: [6, 7.8, 9.5], champs: ["fc"] },
  { id: "basket", label: "Basket", emoji: "🏀", famille: "collectif", met: [5, 7.5, 8], champs: ["fc"] },
  { id: "handball", label: "Handball", emoji: "🤾", famille: "collectif", met: [6, 8, 10], champs: ["fc"] },
  { id: "volley", label: "Volley", emoji: "🏐", famille: "collectif", met: [3, 4, 6], champs: ["fc"] },
  { id: "beach-volley", label: "Beach-volley", emoji: "🏖️", famille: "collectif", met: [6, 8, 8], champs: ["fc"] },
  { id: "rugby", label: "Rugby", emoji: "🏉", famille: "collectif", met: [6.3, 8.3, 10], champs: ["fc"] },
  { id: "hockey", label: "Hockey", emoji: "🏑", famille: "collectif", met: [6, 7.8, 10], champs: ["fc"] },
  { id: "ultimate", label: "Ultimate frisbee", emoji: "🥏", famille: "collectif", met: [5, 8, 10], champs: ["fc"] },

  // Raquettes
  { id: "tennis", label: "Tennis", emoji: "🎾", famille: "raquette", met: [4.5, 6.8, 8], champs: ["fc"] },
  { id: "padel", label: "Padel", emoji: "🎾", famille: "raquette", met: [4.5, 6, 7], champs: ["fc"] },
  { id: "badminton", label: "Badminton", emoji: "🏸", famille: "raquette", met: [4.5, 5.5, 7], champs: ["fc"] },
  { id: "squash", label: "Squash", emoji: "🟢", famille: "raquette", met: [6, 7.3, 12], champs: ["fc"] },
  { id: "ping-pong", label: "Tennis de table", emoji: "🏓", famille: "raquette", met: [3, 4, 5.5], champs: ["fc"] },

  // Combat
  { id: "boxe", label: "Boxe anglaise", emoji: "🥊", famille: "combat", met: [5.8, 7.8, 12.3], champs: ["fc"] },
  { id: "kickboxing", label: "Kickboxing / boxe thaï", emoji: "🦵", famille: "combat", met: [5.3, 7.3, 10.3], champs: ["fc"] },
  { id: "mma", label: "MMA", emoji: "🥋", famille: "combat", met: [5.3, 8, 10.3], champs: ["fc"], renfo: true },
  { id: "jjb", label: "Jiu-jitsu brésilien / grappling", emoji: "🥋", famille: "combat", met: [5.3, 7.5, 10.3], champs: ["fc"], renfo: true },
  { id: "judo", label: "Judo / lutte", emoji: "🥋", famille: "combat", met: [5.3, 8, 11.3], champs: ["fc"], renfo: true },
  { id: "karate", label: "Karaté / taekwondo", emoji: "🥋", famille: "combat", met: [5.3, 7.5, 10.3], champs: ["fc"] },
  { id: "escrime", label: "Escrime", emoji: "🤺", famille: "combat", met: [4, 6, 8], champs: ["fc"] },

  // Plein air et montagne
  { id: "randonnee", label: "Randonnée", emoji: "🥾", famille: "pleinair", met: [5.3, 6, 7.8], champs: ["distance", "denivele", "fc"], vitesse: "marche" },
  { id: "escalade", label: "Escalade / bloc", emoji: "🧗", famille: "pleinair", met: [5.8, 7.3, 8.8], champs: ["denivele", "fc"], renfo: true },
  { id: "ski-alpin", label: "Ski alpin / snowboard", emoji: "⛷️", famille: "pleinair", met: [4.3, 6.3, 8], champs: ["denivele", "fc"] },
  { id: "ski-fond", label: "Ski de fond / skating", emoji: "🎿", famille: "pleinair", met: [6.8, 8.5, 13.3], champs: ["distance", "denivele", "fc"] },
  { id: "ski-rando", label: "Ski de randonnée", emoji: "🏔️", famille: "pleinair", met: [6.5, 8.5, 11], champs: ["distance", "denivele", "fc"] },
  { id: "raquettes-neige", label: "Raquettes à neige", emoji: "❄️", famille: "pleinair", met: [5.3, 6.5, 10], champs: ["distance", "denivele", "fc"], vitesse: "marche" },
  { id: "roller", label: "Roller / patin", emoji: "🛼", famille: "pleinair", met: [5, 7, 7.5], champs: ["distance", "fc"] },
  { id: "skate", label: "Skate / trottinette", emoji: "🛹", famille: "pleinair", met: [4, 5, 6], champs: ["distance", "fc"] },
  { id: "golf", label: "Golf (à pied)", emoji: "⛳", famille: "pleinair", met: [3.5, 4.3, 4.5], champs: ["distance"] },
  { id: "equitation", label: "Équitation", emoji: "🏇", famille: "pleinair", met: [3.8, 5.5, 7.3], champs: [] },

  // Sports d'eau
  { id: "surf", label: "Surf / bodyboard", emoji: "🏄", famille: "eau", met: [3, 5, 6.8], champs: [] },
  { id: "kayak", label: "Kayak / canoë", emoji: "🛶", famille: "eau", met: [3.5, 5, 8], champs: ["distance", "fc"] },
  { id: "aviron", label: "Aviron", emoji: "🚣", famille: "eau", met: [4.8, 7, 12], champs: ["distance", "fc"] },
  { id: "paddle", label: "Stand up paddle", emoji: "🏄", famille: "eau", met: [4, 6.5, 8], champs: ["distance"] },
  { id: "voile", label: "Voile / kitesurf / windsurf", emoji: "⛵", famille: "eau", met: [3, 4.5, 11], champs: [] },
  { id: "plongee", label: "Plongée / snorkeling", emoji: "🤿", famille: "eau", met: [3.5, 5, 7], champs: [] },

  // Mobilite et bien-etre
  { id: "yoga", label: "Yoga", emoji: "🧘", famille: "mobilite", met: [2.3, 2.7, 4], champs: [], renfo: true },
  { id: "yoga-dynamique", label: "Yoga dynamique (vinyasa, power)", emoji: "🧘", famille: "mobilite", met: [2.7, 4, 5], champs: ["fc"], renfo: true },
  { id: "pilates", label: "Pilates", emoji: "🤸", famille: "mobilite", met: [2.8, 3, 4], champs: [], renfo: true },
  { id: "etirements", label: "Étirements / mobilité", emoji: "🙆", famille: "mobilite", met: [2, 2.3, 2.8], champs: [] },
  { id: "tai-chi", label: "Tai-chi / qi gong", emoji: "☯️", famille: "mobilite", met: [2.5, 3.3, 4], champs: [] },
  { id: "danse", label: "Danse", emoji: "💃", famille: "mobilite", met: [4.8, 5, 9.8], champs: ["fc"] },
  { id: "gym-douce", label: "Gym douce / renfo seniors", emoji: "🌱", famille: "mobilite", met: [2.5, 3.5, 4.5], champs: [], renfo: true },

  // Vie active (lutte contre la sedentarite)
  { id: "marche", label: "Marche", emoji: "🚶", famille: "quotidien", met: [3, 3.8, 4.8], champs: ["distance", "denivele"], vitesse: "marche" },
  { id: "marche-rapide", label: "Marche rapide", emoji: "🚶", famille: "quotidien", met: [4.8, 5.5, 6.3], champs: ["distance", "denivele"], vitesse: "marche" },
  { id: "velo-taf", label: "Vélo pour se déplacer", emoji: "🚲", famille: "quotidien", met: [5.8, 6.8, 8], champs: ["distance"], vitesse: "velo" },
  { id: "escaliers", label: "Montée d'escaliers", emoji: "🪜", famille: "quotidien", met: [4, 6.8, 8.8], champs: ["denivele"] },
  { id: "jardinage", label: "Jardinage / bricolage", emoji: "🌻", famille: "quotidien", met: [3, 3.8, 5.5], champs: [], renfo: true },
  { id: "menage", label: "Ménage actif", emoji: "🧹", famille: "quotidien", met: [2.5, 3.3, 4.3], champs: [] },
  { id: "jeux-enfants", label: "Jeux actifs avec les enfants", emoji: "🧒", famille: "quotidien", met: [2.8, 4, 5.8], champs: [] },
  { id: "autre", label: "Autre activité", emoji: "✨", famille: "quotidien", met: [3, 5, 7], champs: ["distance", "denivele", "fc"] }
];

/* ------------------------------------------------------------------ */
/* Sports personnels : ceux qui ne sont pas au catalogue               */
/* ------------------------------------------------------------------ */

export const CLE_SPORTS_PERSO = "cn_sports_perso";

/** Intensites proposees pour un sport perso (MET : leger, modere, soutenu). */
export const INTENSITES_PERSO = {
  douce: { label: "Douce (comme le yoga)", met: [2, 2.8, 3.5] },
  moderee: { label: "Modérée (comme la marche rapide)", met: [3.5, 4.5, 6] },
  soutenue: { label: "Soutenue (comme le footing)", met: [6, 8, 10] },
  intense: { label: "Très intense (comme le HIIT)", met: [7, 9.5, 12] }
};

export const EMOJIS_PERSO = ["✨", "🏅", "🤸", "🏃", "🚴", "🏊", "⛹️", "🧗", "🥋", "🏇", "🛶", "⛷️", "🏌️", "🤾", "🎯", "🪂"];

let sportsPerso = [];

/** Sport perso propre, ou null si la saisie est invalide. */
export function creerSportPerso({ label, emoji, famille, intensite: niveau, champs, renfo } = {}, id = null) {
  const nom = String(label || "").trim().slice(0, 40);
  if (nom.length < 2) return null;
  const i = INTENSITES_PERSO[niveau] || INTENSITES_PERSO.moderee;
  return {
    id: id || "perso-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    label: nom,
    emoji: EMOJIS_PERSO.includes(emoji) ? emoji : "✨",
    famille: FAMILLES_ACTIVITE.some((f) => f.id === famille) ? famille : "quotidien",
    intensite: INTENSITES_PERSO[niveau] ? niveau : "moderee",
    met: i.met,
    champs: (Array.isArray(champs) ? champs : []).filter((c) => ["distance", "denivele", "fc"].includes(c)),
    renfo: !!renfo,
    perso: true
  };
}

/** Declare les sports perso (au demarrage et a chaque modification). */
export function definirSportsPerso(liste) {
  sportsPerso = (Array.isArray(liste) ? liste : [])
    .filter((x) => x && typeof x.id === "string" && x.id.startsWith("perso-"))
    .map((x) => creerSportPerso(x, x.id))
    .filter(Boolean);
  return sportsPerso;
}

export const lireSportsPerso = () => sportsPerso;

/** Catalogue complet : sports perso d'abord (ce sont les tiens). */
export const tousLesSports = () => [...sportsPerso, ...ACTIVITES];

export const activiteParId = (id) => tousLesSports().find((a) => a.id === id) || null;

/** Recherche sans accents ni majuscules. */
const normaliser = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function chercherActivites(texte, famille = null) {
  const t = normaliser(texte).trim();
  return tousLesSports().filter((a) => (!famille || a.famille === famille) && (!t || normaliser(a.label).includes(t)));
}

/** Niveau du ressenti (RPE 1-10) : 0 leger, 1 modere, 2 soutenu. */
export function niveauRPE(rpe) {
  const r = num(rpe);
  if (!(r > 0)) return null;
  return r >= 7 ? 2 : r >= 5 ? 1 : 0;
}

/**
 * MET depuis la vitesse et le denivele (ACSM).
 * Course : VO2 = 3,5 + 0,2 v (m/min) ; marche : 3,5 + 0,1 v. Le denivele
 * positif ajoute 0,9 (course) ou 1,8 (marche) ml/kg par metre monte,
 * reparti sur la duree. Velo : paliers de vitesse du Compendium.
 */
export function metDepuisVitesse(type, distanceKm, dureeMin, deniveleM = 0) {
  const d = num(distanceKm);
  const t = num(dureeMin);
  if (!(d > 0) || !(t > 0)) return null;
  const kmh = d / (t / 60);
  if (type === "velo") {
    if (kmh > 60) return null;
    return kmh < 16 ? 4 : kmh < 19 ? 6.8 : kmh < 22 ? 8 : kmh < 25 ? 10 : kmh < 30 ? 12 : 15.8;
  }
  const v = (d * 1000) / t; // m/min
  const dPlus = Math.max(0, num(deniveleM));
  if (type === "course") {
    if (kmh > 30) return null;
    const o2 = (3.5 + 0.2 * v) * t + 0.9 * dPlus;
    return round(o2 / (3.5 * t), 1);
  }
  if (type === "marche") {
    if (kmh > 10) return null;
    const o2 = (3.5 + 0.1 * v) * t + 1.8 * dPlus;
    return round(o2 / (3.5 * t), 1);
  }
  return null;
}

/** MET retenu pour une activite saisie. */
export function metActivite(saisie) {
  const sport = activiteParId(saisie && saisie.id);
  if (!sport) return null;
  if (sport.vitesse) {
    const m = metDepuisVitesse(sport.vitesse, saisie.distanceKm, saisie.duree, saisie.denivele);
    if (m) return m;
  }
  const n = niveauRPE(saisie.rpe);
  return sport.met[n == null ? 1 : n];
}

/** Depense estimee (kcal, arrondie a 5), ou null sans duree ni poids. */
export function kcalActivite(saisie, poidsKg) {
  const met = metActivite(saisie);
  const kg = num(poidsKg);
  const h = num(saisie && saisie.duree) / 60;
  if (!met || !(kg > 0) || !(h > 0)) return null;
  return Math.round((met * kg * h) / 5) * 5;
}

/** Intensite au sens de l'OMS : « legere », « moderee » ou « soutenue ». */
export function intensite(saisie) {
  const n = niveauRPE(saisie && saisie.rpe);
  if (n != null) return ["legere", "moderee", "soutenue"][n];
  const met = metActivite(saisie);
  if (!met) return null;
  return met >= 6 ? "soutenue" : met >= 3 ? "moderee" : "legere";
}

export const LIBELLES_INTENSITE = { legere: "Légère", moderee: "Modérée", soutenue: "Soutenue" };

/** Charge interne (Foster, sRPE) : duree x RPE, en unites arbitraires. */
export function chargeSRPE(dureeMin, rpe) {
  const d = num(dureeMin);
  const r = num(rpe);
  return d > 0 && r > 0 ? Math.round(d * r) : null;
}

/** Allure (min/km) pour la course et la marche, vitesse (km/h) sinon. */
export function allure(saisie) {
  const sport = activiteParId(saisie && saisie.id);
  const d = num(saisie && saisie.distanceKm);
  const t = num(saisie && saisie.duree);
  if (!sport || !(d > 0) || !(t > 0)) return null;
  if (sport.id === "rameur") {
    const sec500 = (t * 60) / (d * 2);
    return `${Math.floor(sec500 / 60)}'${String(Math.round(sec500 % 60)).padStart(2, "0")} /500 m`;
  }
  if (sport.vitesse === "course" || sport.vitesse === "marche") {
    const minKm = t / d;
    const m = Math.floor(minKm);
    const s = Math.round((minKm - m) * 60);
    return s === 60 ? `${m + 1}'00 /km` : `${m}'${String(s).padStart(2, "0")} /km`;
  }
  return `${round(d / (t / 60), 1)} km/h`.replace(".", ",");
}

/**
 * Seance a enregistrer depuis le formulaire. Rend null si la saisie est
 * invalide (pas de sport, pas de duree).
 */
export function seanceActivite(saisie, { poidsKg, date = todayISO(), id } = {}) {
  const sport = activiteParId(saisie && saisie.id);
  const duree = Math.round(num(saisie && saisie.duree));
  if (!sport || !(duree > 0) || duree > 24 * 60) return null;
  const propre = { id: sport.id, label: sport.label, emoji: sport.emoji, duree };
  const rpe = num(saisie.rpe);
  if (rpe >= 1 && rpe <= 10) propre.rpe = rpe;
  if (sport.champs.includes("distance") && num(saisie.distanceKm) > 0) propre.distanceKm = round(num(saisie.distanceKm), 2);
  if (sport.champs.includes("denivele") && num(saisie.denivele) > 0) propre.denivele = Math.round(num(saisie.denivele));
  if (sport.champs.includes("fc") && num(saisie.fcMoy) >= 40 && num(saisie.fcMoy) <= 230) propre.fcMoy = Math.round(num(saisie.fcMoy));
  const details = nettoyerDetails(sport, saisie.details);
  if (Object.keys(details).length) propre.details = details;
  if (sport.id === "natation" && !propre.distanceKm && distanceNatation(details)) propre.distanceKm = distanceNatation(details);
  if (sport.perso) propre.perso = true;
  const kcal = kcalActivite(propre, poidsKg);
  if (kcal) propre.kcal = kcal;
  propre.intensite = intensite(propre);
  const seance = {
    date,
    activite: propre,
    durationMin: duree,
    rpe: propre.rpe || "",
    notes: String(saisie.notes || "").slice(0, 500),
    exercises: []
  };
  if (id) seance.id = id;
  return seance;
}

/** Resume affiche dans l'historique. */
export function resumeActivite(a) {
  if (!a) return "";
  return [
    a.duree ? a.duree + " min" : null,
    a.distanceKm ? String(a.distanceKm).replace(".", ",") + " km" : null,
    a.denivele ? "D+ " + a.denivele + " m" : null,
    allure(a),
    a.fcMoy ? a.fcMoy + " bpm" : null,
    a.kcal ? "≈ " + a.kcal + " kcal" : null
  ]
    .filter(Boolean)
    .join(" · ");
}

/* ------------------------------------------------------------------ */
/* Semaine active : reperes OMS 2020 et sedentarite                    */
/* ------------------------------------------------------------------ */

/**
 * OMS 2020 (adultes de 18 a 64 ans) : 150 a 300 min d'activite d'intensite
 * moderee par semaine, ou 75 a 150 min soutenue, ou un melange (une minute
 * soutenue vaut deux minutes moderees) ; et du renforcement musculaire au
 * moins 2 jours par semaine. Au-dela de 300 min, benefices supplementaires.
 */
export const REPERES_OMS = { minutes: 150, minutesHaut: 300, joursRenfo: 2 };

/** Seance de musculation (exercices hors cardio) ? */
const estMusculation = (s) => (s.exercises || []).some((ex) => ex && ex.mode !== "cardio" && ex.mode !== "warmup");

/**
 * Bilan des 7 derniers jours (aujourd'hui compris), glissant pour ne pas
 * retomber a zero chaque lundi.
 */
export function semaineActive(seances, date = todayISO()) {
  const debut = addDays(date, -6);
  let moderees = 0;
  let soutenues = 0;
  const joursRenfo = new Set();
  const parJour = {};
  for (const s of seances || []) {
    if (!s || !s.date || s.date < debut || s.date > date) continue;
    if (s.activite) {
      const a = s.activite;
      const i = a.intensite || intensite(a);
      const d = num(a.duree || s.durationMin);
      if (i === "soutenue") soutenues += d;
      else if (i === "moderee") moderees += d;
      if (activiteParId(a.id)?.renfo && d >= 10) joursRenfo.add(s.date);
      parJour[s.date] = (parJour[s.date] || 0) + (i === "soutenue" ? 2 * d : i === "moderee" ? d : 0);
    } else {
      if (estMusculation(s)) joursRenfo.add(s.date);
      // Les blocs cardio d'une seance de muscu comptent comme du modere.
      for (const ex of s.exercises || []) {
        if (ex && ex.mode === "cardio" && num(ex.durationMin) > 0) {
          moderees += num(ex.durationMin);
          parJour[s.date] = (parJour[s.date] || 0) + num(ex.durationMin);
        }
      }
    }
  }
  const equivalent = Math.round(moderees + 2 * soutenues);
  const renfo = joursRenfo.size;
  return {
    moderees: Math.round(moderees),
    soutenues: Math.round(soutenues),
    equivalent,
    pct: Math.min(100, Math.round((equivalent / REPERES_OMS.minutes) * 100)),
    joursRenfo: renfo,
    parJour,
    atteint: equivalent >= REPERES_OMS.minutes && renfo >= REPERES_OMS.joursRenfo,
    manque: Math.max(0, REPERES_OMS.minutes - equivalent)
  };
}

/**
 * Pas moyens sur les 7 derniers jours renseignes. Reperes : le risque de
 * mortalite baisse nettement jusqu'a 7 000 pas par jour environ (Ding et
 * al., Lancet Public Health 2025 ; Paluch et al., 2022), avec un plateau
 * vers 6 000-8 000 apres 60 ans et 8 000-10 000 avant.
 */
export function pasMoyens(journal, date = todayISO()) {
  const debut = addDays(date, -6);
  const valeurs = (journal || [])
    .filter((f) => f && f.date >= debut && f.date <= date && num(f.steps) > 0)
    .map((f) => num(f.steps));
  if (!valeurs.length) return null;
  return Math.round(valeurs.reduce((a, b) => a + b, 0) / valeurs.length);
}

export const REPERE_PAS = 7000;

/** Conseil du jour pour bouger plus, selon le bilan. */
export function conseilSedentarite(bilan, pas) {
  if (!bilan) return null;
  if (bilan.equivalent < 60 && (pas == null || pas < 5000)) {
    return "Commence petit : 10 minutes de marche après un repas comptent déjà. Chaque minute active réduit les effets de la sédentarité.";
  }
  if (bilan.manque > 0) {
    return `Encore ${bilan.manque} min d'activité modérée pour atteindre le repère de l'OMS sur 7 jours (une minute intense compte double).`;
  }
  if (bilan.joursRenfo < REPERES_OMS.joursRenfo) {
    return "Ton cardio est au niveau. Ajoute une séance de renforcement musculaire : l'OMS en recommande au moins 2 par semaine.";
  }
  if (pas != null && pas < REPERE_PAS) {
    return "Repère OMS atteint. Pour le reste de la journée, vise environ 7 000 pas : se lever toutes les 30 à 60 minutes limite les effets du temps assis.";
  }
  return "Repères OMS atteints : activité d'endurance et renforcement. Continue ainsi, au-delà de 300 min les bénéfices augmentent encore.";
}

/* ------------------------------------------------------------------ */
/* Details propres a chaque discipline                                 */
/* ------------------------------------------------------------------ */

const TYPES_ENDURANCE = [
  ["footing", "Footing / endurance"],
  ["fractionne", "Fractionné"],
  ["seuil", "Seuil / tempo"],
  ["longue", "Sortie longue"],
  ["cotes", "Côtes"],
  ["competition", "Course / compétition"],
  ["recup", "Récupération"]
];

const CONTEXTE_MATCH = [
  ["entrainement", "Entraînement"],
  ["match", "Match amical"],
  ["competition", "Compétition"]
];

const RESULTATS = [
  ["victoire", "Victoire"],
  ["nul", "Nul"],
  ["defaite", "Défaite"]
];

const SI_MATCH = { contexte: ["match", "competition"] };

/**
 * Champs supplementaires par discipline. `si` : le champ n'apparait que
 * si un autre champ a l'une de ces valeurs.
 */
const DETAILS_SPORT = [
  {
    pour: (a) => ["course", "trail", "tapis", "marche-nordique"].includes(a.id),
    champs: [
      { cle: "type", label: "Type de séance", type: "choix", options: TYPES_ENDURANCE },
      { cle: "structure", label: "Contenu", type: "texte", placeholder: "10 × 400 m, récup 1'30", si: { type: ["fractionne", "cotes", "seuil"] } },
      { cle: "fcMax", label: "FC max (bpm)", type: "nombre", min: 80, max: 230 }
    ]
  },
  {
    pour: (a) => ["velo", "vtt", "spinning", "velo-taf", "triathlon"].includes(a.id),
    champs: [
      { cle: "type", label: "Type de sortie", type: "choix", options: [["endurance", "Endurance"], ["fractionne", "Fractionné"], ["seuil", "Seuil / tempo"], ["longue", "Sortie longue"], ["competition", "Course / compétition"], ["balade", "Balade"]] },
      { cle: "structure", label: "Contenu", type: "texte", placeholder: "3 × 10 min au seuil", si: { type: ["fractionne", "seuil"] } },
      { cle: "puissance", label: "Puissance moy. (W)", type: "nombre", min: 20, max: 2000 },
      { cle: "cadence", label: "Cadence (tr/min)", type: "nombre", min: 20, max: 200 }
    ]
  },
  {
    pour: (a) => a.id === "natation",
    champs: [
      { cle: "nage", label: "Nage", type: "choix", options: [["crawl", "Crawl"], ["brasse", "Brasse"], ["dos", "Dos"], ["papillon", "Papillon"], ["4nages", "4 nages"], ["mixte", "Mixte"]] },
      { cle: "bassin", label: "Bassin", type: "choix", options: [["25", "25 m"], ["50", "50 m"], ["eau-libre", "Eau libre"]] },
      { cle: "longueurs", label: "Longueurs", type: "nombre", min: 1, max: 1000, si: { bassin: ["25", "50"] } },
      { cle: "structure", label: "Contenu", type: "texte", placeholder: "8 × 100 m, récup 20 s" }
    ]
  },
  {
    pour: (a) => a.id === "rameur" || a.id === "aviron" || a.id === "kayak",
    champs: [
      { cle: "puissance", label: "Puissance moy. (W)", type: "nombre", min: 20, max: 1500 },
      { cle: "cadence", label: "Coups / min", type: "nombre", min: 10, max: 60 },
      { cle: "structure", label: "Contenu", type: "texte", placeholder: "4 × 1000 m, récup 2 min" }
    ]
  },
  {
    pour: (a) => a.famille === "collectif" || a.famille === "raquette",
    champs: [
      { cle: "contexte", label: "Séance", type: "choix", options: CONTEXTE_MATCH },
      { cle: "resultat", label: "Résultat", type: "choix", options: RESULTATS, si: SI_MATCH },
      { cle: "score", label: "Score", type: "texte", placeholder: "6-4 6-3, 3-1…", si: SI_MATCH }
    ]
  },
  {
    pour: (a) => a.famille === "combat" || a.id === "boxe-fitness",
    champs: [
      { cle: "contexte", label: "Séance", type: "choix", options: [["technique", "Technique"], ["sparring", "Sparring"], ["combat", "Combat / compétition"], ["physique", "Préparation physique"]] },
      { cle: "rounds", label: "Rounds", type: "nombre", min: 1, max: 50 },
      { cle: "dureeRound", label: "Durée d'un round (min)", type: "nombre", min: 1, max: 15 },
      { cle: "resultat", label: "Résultat", type: "choix", options: RESULTATS, si: { contexte: ["combat"] } }
    ]
  },
  {
    pour: (a) => a.id === "escalade",
    champs: [
      { cle: "type", label: "Type", type: "choix", options: [["bloc", "Bloc"], ["voie", "Voie (salle)"], ["falaise", "Falaise"], ["grande-voie", "Grande voie"]] },
      { cle: "voies", label: "Voies / blocs", type: "nombre", min: 1, max: 200 },
      { cle: "cotation", label: "Cotation max", type: "texte", placeholder: "6b+, V4…" }
    ]
  },
  {
    pour: (a) => ["hiit", "cross-training", "circuit", "hyrox", "kettlebell", "calisthenics", "body-pump"].includes(a.id),
    champs: [
      { cle: "format", label: "Format", type: "choix", options: [["amrap", "AMRAP"], ["emom", "EMOM"], ["fortime", "For time"], ["tabata", "Tabata"], ["intervalles", "Intervalles"], ["circuit", "Circuit"], ["cours", "Cours collectif"]] },
      { cle: "structure", label: "Contenu (WOD)", type: "texte", placeholder: "21-15-9 thrusters, tractions" },
      { cle: "score", label: "Score / temps", type: "texte", placeholder: "12 tours + 5, 8:42…" }
    ]
  },
  {
    pour: (a) => a.id === "ski-alpin",
    champs: [{ cle: "descentes", label: "Descentes", type: "nombre", min: 1, max: 200 }]
  },
  {
    pour: (a) => a.id === "golf",
    champs: [
      { cle: "trous", label: "Trous", type: "choix", options: [["9", "9 trous"], ["18", "18 trous"], ["practice", "Practice"]] },
      { cle: "score", label: "Score", type: "texte", placeholder: "86, +14…" }
    ]
  },
  {
    pour: (a) => ["yoga", "yoga-dynamique", "pilates", "danse", "zumba", "aerobic"].includes(a.id),
    champs: [{ cle: "style", label: "Style / cours", type: "texte", placeholder: "Hatha, Reformer, salsa…" }]
  }
];

/** Champs de details a proposer pour un sport (vide pour un sport perso). */
export function champsDetails(sport) {
  if (!sport || sport.perso) return [];
  return DETAILS_SPORT.filter((d) => d.pour(sport)).flatMap((d) => d.champs);
}

/** Un champ conditionnel est-il visible avec ces details ? */
export function champVisible(champ, details) {
  if (!champ.si) return true;
  return Object.entries(champ.si).every(([cle, valeurs]) => valeurs.includes(String((details || {})[cle] ?? "")));
}

/** Details valides seulement : options connues, nombres bornes, textes courts. */
export function nettoyerDetails(sport, details) {
  const propre = {};
  const brut = details || {};
  for (const c of champsDetails(sport)) {
    const v = brut[c.cle];
    if (v == null || v === "") continue;
    if (c.type === "choix") {
      if (c.options.some(([id]) => id === String(v))) propre[c.cle] = String(v);
    } else if (c.type === "nombre") {
      const n = num(v);
      if (n >= c.min && n <= c.max) propre[c.cle] = round(n, 1);
    } else {
      const t = String(v).trim().slice(0, 80);
      if (t) propre[c.cle] = t;
    }
  }
  // Les champs conditionnels caches ne sont pas gardes.
  for (const c of champsDetails(sport)) if (propre[c.cle] != null && !champVisible(c, propre)) delete propre[c.cle];
  return propre;
}

/** Distance de natation depuis les longueurs, quand elle n'est pas saisie. */
export function distanceNatation(details) {
  const d = details || {};
  const bassin = num(d.bassin);
  const longueurs = num(d.longueurs);
  return bassin > 0 && longueurs > 0 ? round((bassin * longueurs) / 1000, 2) : null;
}

const libelleOption = (sport, cle, valeur) => {
  const c = champsDetails(sport).find((x) => x.cle === cle);
  const o = c && c.options && c.options.find(([id]) => id === valeur);
  return o ? o[1] : null;
};

/** Resume des details : « Fractionné · 10 × 400 m », « Victoire 6-4 6-3 »… */
export function resumeDetails(a) {
  const sport = activiteParId(a && a.id);
  const d = (a && a.details) || {};
  if (!sport || !Object.keys(d).length) return "";
  const morceaux = [];
  for (const cle of ["type", "format", "contexte", "nage", "style"]) {
    if (d[cle] && !(cle === "contexte" && d[cle] === "entrainement") && !(cle === "type" && d[cle] === "footing")) {
      morceaux.push(libelleOption(sport, cle, d[cle]) || d[cle]);
    }
  }
  if (d.structure) morceaux.push(d.structure);
  if (d.resultat) morceaux.push((libelleOption(sport, "resultat", d.resultat) || d.resultat) + (d.score ? " " + d.score : ""));
  else if (d.score) morceaux.push(d.score);
  if (d.rounds) morceaux.push(`${d.rounds} rounds${d.dureeRound ? " × " + d.dureeRound + " min" : ""}`);
  if (d.puissance) morceaux.push(d.puissance + " W");
  if (d.longueurs && d.bassin) morceaux.push(`${d.longueurs} × ${d.bassin} m`);
  if (d.voies) morceaux.push(d.voies + (d.type === "bloc" ? " blocs" : " voies"));
  if (d.cotation) morceaux.push("max " + d.cotation);
  if (d.descentes) morceaux.push(d.descentes + " descentes");
  if (d.trous) morceaux.push(libelleOption(sport, "trous", d.trous) || d.trous);
  return morceaux.join(" · ");
}

/* ------------------------------------------------------------------ */
/* Mes sports : repartition et records                                 */
/* ------------------------------------------------------------------ */

/**
 * Temps par sport sur les `jours` derniers jours. La musculation compte
 * avec sa duree saisie (sinon 0 min, mais la seance est comptee).
 */
export function repartitionSports(seances, date = todayISO(), jours = 30) {
  const debut = addDays(date, -(jours - 1));
  const par = new Map();
  for (const s of seances || []) {
    if (!s || !s.date || s.date < debut || s.date > date) continue;
    const a = s.activite;
    const cle = a ? a.id : "musculation";
    const e = par.get(cle) || { id: cle, label: a ? a.label : "Musculation", emoji: a ? a.emoji || "✨" : "🏋️", minutes: 0, seances: 0, km: 0 };
    e.minutes += num(a ? a.duree : s.durationMin);
    e.seances += 1;
    e.km += a ? num(a.distanceKm) : 0;
    par.set(cle, e);
  }
  return [...par.values()]
    .map((e) => ({ ...e, minutes: Math.round(e.minutes), km: round(e.km, 1) }))
    .sort((a, b) => b.minutes - a.minutes || b.seances - a.seances);
}

/** Allure en secondes par km. */
const allureSec = (a) => (num(a.distanceKm) > 0 && num(a.duree) > 0 ? (num(a.duree) * 60) / num(a.distanceKm) : null);

export const fmtAllureSec = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s === 60 ? `${m + 1}'00 /km` : `${m}'${String(s).padStart(2, "0")} /km`;
};

/**
 * Records par sport : plus longue distance, plus longue duree, plus gros
 * denivele, et pour la course la meilleure allure sur 5 km et 10 km ou plus.
 */
export function recordsSports(seances) {
  const par = new Map();
  for (const s of seances || []) {
    const a = s && s.activite;
    if (!a || !a.id) continue;
    const e = par.get(a.id) || { id: a.id, label: a.label, emoji: a.emoji || "✨", seances: 0, minutes: 0, km: 0, records: {} };
    e.seances += 1;
    e.minutes += num(a.duree);
    e.km += num(a.distanceKm);
    const r = e.records;
    const garder = (cle, valeur, mieux) => {
      if (!(valeur > 0)) return;
      if (!r[cle] || mieux(valeur, r[cle].valeur)) r[cle] = { valeur, date: s.date };
    };
    garder("distance", num(a.distanceKm), (x, y) => x > y);
    garder("duree", num(a.duree), (x, y) => x > y);
    garder("denivele", num(a.denivele), (x, y) => x > y);
    const sport = activiteParId(a.id);
    if (sport && sport.vitesse === "course") {
      const p = allureSec(a);
      if (p && num(a.distanceKm) >= 5) garder("allure5", p, (x, y) => x < y);
      if (p && num(a.distanceKm) >= 10) garder("allure10", p, (x, y) => x < y);
    }
    par.set(a.id, e);
  }
  return [...par.values()]
    .map((e) => ({ ...e, minutes: Math.round(e.minutes), km: round(e.km, 1) }))
    .sort((a, b) => b.seances - a.seances);
}

/** Nombre de sports differents pratiques (musculation comprise). */
export function sportsPratiques(seances) {
  const ids = new Set();
  for (const s of seances || []) {
    if (!s) continue;
    if (s.activite && s.activite.id) ids.add(s.activite.id);
    else if ((s.exercises || []).some((ex) => ex && ex.mode !== "cardio")) ids.add("musculation");
  }
  return ids.size;
}

/** Semaines civiles (lundi-dimanche) ou le repere OMS de 150 min est atteint. */
export function semainesActivesOMS(seances) {
  const lundis = new Set();
  for (const s of seances || []) {
    if (!s || !s.date) continue;
    const j = new Date(s.date + "T12:00:00");
    lundis.add(addDays(s.date, -((j.getDay() + 6) % 7)));
  }
  let n = 0;
  for (const l of lundis) if (semaineActive(seances, addDays(l, 6)).equivalent >= REPERES_OMS.minutes) n++;
  return n;
}
