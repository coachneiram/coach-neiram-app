/**
 * « Mon évolution » : toutes les donnees saisies, au jour, a la semaine, au
 * mois ou a l'annee.
 *
 * Demande du coach du 14 octobre 2026, d'apres l'application Sante de
 * l'iPhone : « pour que la personne puisse voir sur la journee, sur la
 * semaine, sur le mois et sur l'annee son evolution », pour les pas, les
 * calories, les mensurations, « toutes les donnees saisies possibles ».
 *
 * Deux familles d'indicateurs, parce qu'elles ne se lisent pas pareil :
 *
 * - les indicateurs QUOTIDIENS (pas, calories, sommeil, seances...) : une
 *   valeur par jour note. Une semaine se lit en 7 barres, un mois en une
 *   barre par jour, une annee en 12 barres mensuelles. Un jour sans saisie
 *   reste vide : le compter comme zero ferait croire a une journee sans un
 *   pas ou sans un repas.
 * - les MESURES (poids, masse grasse, mensurations) : quelques points
 *   espaces. Elles se lisent en courbe, et ce qui compte est l'ecart sur la
 *   periode, pas une moyenne.
 *
 * Le resume d'une periode est une moyenne PAR JOUR NOTE pour ce qui se
 * mesure chaque jour (pas, calories, sommeil), et un TOTAL pour ce qui se
 * cumule (seances, minutes d'entrainement).
 *
 * Aucune donnee de l'application Sante n'est lue : une application web n'y
 * a pas acces. Tout vient de ce que le client a saisi.
 */

import { addDays, num, parseISO, round } from "./dates.js";
import { getWeekKey } from "./semaine.js";
import { MEASUREMENT_FIELDS } from "./mensurations.js";
import { fruitsEtLegumes, lirePortion, OBJECTIF_FRUITS_LEGUMES, OBJECTIF_PORTIONS_PROTEINES } from "./portions-jour.js";

export const CLE_EXPLORATEUR = "cn_explorateur";

export const PERIODES = [
  { id: "J", label: "J", nom: "Jour" },
  { id: "S", label: "S", nom: "Semaine" },
  { id: "M", label: "M", nom: "Mois" },
  { id: "A", label: "A", nom: "Année" }
];

/** Un jour est « dans la cible » des calories a 10 % pres, comme dans le resume de la semaine. */
const TOLERANCE_CIBLE = 0.1;

const REPAS = [
  { id: "petit-dejeuner", label: "Petit-déj." },
  { id: "dejeuner", label: "Déjeuner" },
  { id: "gouter", label: "Collation" },
  { id: "diner", label: "Dîner" }
];

const positif = (v) => (v != null && v !== "" && num(v) > 0 ? num(v) : null);
const present = (v) => (v != null && v !== "" && Number.isFinite(num(v)) ? num(v) : null);

/** Valeur par date d'un champ du journal du jour (dailyForm). */
const duJournal = (lire) => (donnees) => {
  const parDate = new Map();
  (donnees.dailyForm || []).forEach((f) => {
    if (!f || !f.date) return;
    const v = lire(f);
    if (v != null) parDate.set(f.date, v);
  });
  return parDate;
};

/** Somme par date d'un champ des repas notes. */
const desRepas = (champ) => (donnees) => {
  const parDate = new Map();
  (donnees.logEntries || []).forEach((e) => {
    if (!e || !e.date) return;
    parDate.set(e.date, (parDate.get(e.date) || 0) + num(e[champ]));
  });
  parDate.forEach((v, d) => parDate.set(d, round(v)));
  return parDate;
};

/** Agregat par date des seances enregistrees. */
const desSeances = (lire, mode) => (donnees) => {
  const groupes = new Map();
  (donnees.sessions || []).forEach((s) => {
    if (!s || !s.date) return;
    const v = lire(s);
    if (v == null) return;
    const g = groupes.get(s.date) || [];
    g.push(v);
    groupes.set(s.date, g);
  });
  const parDate = new Map();
  groupes.forEach((vals, d) =>
    parDate.set(d, mode === "moyenne" ? round(vals.reduce((a, b) => a + b, 0) / vals.length, 1) : vals.reduce((a, b) => a + b, 0))
  );
  return parDate;
};

/** Points d'une mesure, dans l'ordre chronologique. */
const desMesures = (source, champ) => (donnees) =>
  (donnees[source] || [])
    .filter((m) => m && m.date && present(m[champ]) != null)
    .map((m) => ({ date: m.date, valeur: present(m[champ]) }))
    .sort((a, b) => a.date.localeCompare(b.date));

/** Sens souhaite des mesures selon l'objectif, comme la progression du corps. */
function sensMesure(id, objectif) {
  if (id === "masseGrasse") return -1;
  if (id === "muscle") return 1;
  const perte = { poids: -1, taille: -1, hanches: -1, poitrine: -1, cuisseD: -1, cuisseG: -1 };
  const prise = { poids: 1, poitrine: 1, brasD: 1, brasG: 1, cuisseD: 1, cuisseG: 1, molletD: 1, molletG: 1 };
  return ((objectif === "perte" ? perte : objectif === "prise" ? prise : {})[id]) || 0;
}

/**
 * Les indicateurs, par groupe.
 *
 * `cible(profil, objectifs)` : la valeur visee par jour, ou null. `sens` :
 * +1 quand plus est mieux, -1 quand moins est mieux, 0 quand c'est la
 * cible qui compte (calories, glucides, lipides).
 */
export const INDICATEURS = [
  { id: "pas", groupe: "Activité", label: "Pas", unite: "pas", genre: "jour", agregat: "moyenne", sens: 1, valeurs: duJournal((f) => positif(f.steps)), cible: (p) => num(p && p.targetSteps) || 8000 },
  { id: "seances", groupe: "Activité", label: "Séances", unite: "séance", genre: "jour", agregat: "total", sens: 1, valeurs: desSeances(() => 1), cible: () => null },
  { id: "duree", groupe: "Activité", label: "Temps d'entraînement", unite: "min", genre: "jour", agregat: "total", sens: 1, valeurs: desSeances((s) => positif(s.durationMin)), cible: () => null },
  { id: "rpe", groupe: "Activité", label: "Effort ressenti (RPE)", unite: "/10", genre: "jour", agregat: "moyenne", decimales: 1, sens: 0, valeurs: desSeances((s) => positif(s.rpe), "moyenne"), cible: () => null },

  { id: "calories", groupe: "Nutrition", label: "Calories", unite: "kcal", genre: "jour", agregat: "moyenne", sens: 0, repas: "calories", valeurs: desRepas("calories"), cible: (p, o) => num(o && o.calories) || null },
  { id: "proteines", groupe: "Nutrition", label: "Protéines", unite: "g", genre: "jour", agregat: "moyenne", sens: 1, repas: "protein", valeurs: desRepas("protein"), cible: (p, o) => num(o && o.protein) || null },
  { id: "glucides", groupe: "Nutrition", label: "Glucides", unite: "g", genre: "jour", agregat: "moyenne", sens: 0, repas: "carbs", valeurs: desRepas("carbs"), cible: (p, o) => num(o && o.carbs) || null },
  { id: "lipides", groupe: "Nutrition", label: "Lipides", unite: "g", genre: "jour", agregat: "moyenne", sens: 0, repas: "fat", valeurs: desRepas("fat"), cible: (p, o) => num(o && o.fat) || null },
  { id: "eau", groupe: "Nutrition", label: "Eau", unite: "L", genre: "jour", agregat: "moyenne", decimales: 1, sens: 1, valeurs: duJournal((f) => (positif(f.waterMl) != null ? round(num(f.waterMl) / 1000, 2) : null)), cible: (p) => num(p && p.targetWaterL) || 2 },
  { id: "fruitsLegumes", groupe: "Nutrition", label: "Fruits et légumes", unite: "portions", genre: "jour", agregat: "moyenne", decimales: 1, sens: 1, valeurs: duJournal((f) => fruitsEtLegumes(f) || null), cible: () => OBJECTIF_FRUITS_LEGUMES },
  { id: "portionsProteines", groupe: "Nutrition", label: "Portions de protéines", unite: "portions", genre: "jour", agregat: "moyenne", decimales: 1, sens: 1, valeurs: duJournal((f) => lirePortion(f, "proteinPortions") || null), cible: () => OBJECTIF_PORTIONS_PROTEINES },

  { id: "sommeil", groupe: "Sommeil et forme", label: "Sommeil", unite: "h", genre: "jour", agregat: "moyenne", decimales: 1, sens: 1, valeurs: duJournal((f) => positif(f.sleepHours)), cible: (p) => num(p && p.targetSleepHours) || 8 },
  { id: "qualiteSommeil", groupe: "Sommeil et forme", label: "Qualité du sommeil", unite: "/5", genre: "jour", agregat: "moyenne", decimales: 1, sens: 1, valeurs: duJournal((f) => positif(f.sleepQuality)), cible: () => null },
  { id: "energie", groupe: "Sommeil et forme", label: "Énergie", unite: "/5", genre: "jour", agregat: "moyenne", decimales: 1, sens: 1, valeurs: duJournal((f) => positif(f.energy)), cible: () => null },
  { id: "stress", groupe: "Sommeil et forme", label: "Stress", unite: "/10", genre: "jour", agregat: "moyenne", decimales: 1, sens: -1, valeurs: duJournal((f) => positif(f.stress)), cible: () => null },

  { id: "poids", groupe: "Corps", label: "Poids", unite: "kg", genre: "mesure", decimales: 1, points: desMesures("bodyLogs", "weightKg") },
  { id: "masseGrasse", groupe: "Corps", label: "Masse grasse", unite: "%", genre: "mesure", decimales: 1, points: desMesures("bodyLogs", "bodyFatPct") },
  { id: "muscle", groupe: "Corps", label: "Masse musculaire", unite: "kg", genre: "mesure", decimales: 1, points: desMesures("bodyLogs", "muscleKg") },
  ...MEASUREMENT_FIELDS.map((f) => ({ id: f.id, groupe: "Mensurations", label: f.label, unite: "cm", genre: "mesure", decimales: 1, points: desMesures("measurements", f.id) }))
].map((i) => ({ decimales: 0, ...i }));

export const indicateur = (id) => INDICATEURS.find((i) => i.id === id) || INDICATEURS[0];

/** Groupes dans l'ordre d'affichage, avec leurs indicateurs. */
export const GROUPES = [...new Set(INDICATEURS.map((i) => i.groupe))].map((g) => ({
  groupe: g,
  indicateurs: INDICATEURS.filter((i) => i.groupe === g)
}));

// ── Dates ──────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, "0");
const isoDe = (a, m, j) => `${a}-${pad(m)}-${pad(j)}`;
const joursDansLeMois = (a, m) => new Date(a, m, 0).getDate();
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURTS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const JOURS_COURTS = ["L", "M", "M", "J", "V", "S", "D"];

const fmtJour = (d) => parseISO(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtJourCourt = (d) => parseISO(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/**
 * Bornes d'une periode.
 *
 * `decalage` : 0 pour la periode en cours, -1 pour la precedente... Jamais
 * dans le futur : il n'y a rien a y voir.
 */
export function bornesPeriode(periode, decalage, aujourdhui) {
  const d = Math.min(0, Math.round(num(decalage)));
  const [a, m] = aujourdhui.split("-").map(Number);
  if (periode === "J") {
    const jour = addDays(aujourdhui, d);
    return { debut: jour, fin: jour, libelle: fmtJour(jour) };
  }
  if (periode === "S") {
    const lundi = addDays(getWeekKey(aujourdhui), 7 * d);
    const dimanche = addDays(lundi, 6);
    return { debut: lundi, fin: dimanche, libelle: `${fmtJourCourt(lundi)} – ${fmtJourCourt(dimanche)} ${dimanche.slice(0, 4)}` };
  }
  if (periode === "M") {
    const total = a * 12 + (m - 1) + d;
    const an = Math.floor(total / 12);
    const mois = (total % 12) + 1;
    return { debut: isoDe(an, mois, 1), fin: isoDe(an, mois, joursDansLeMois(an, mois)), libelle: `${MOIS[mois - 1]} ${an}` };
  }
  const an = a + d;
  return { debut: `${an}-01-01`, fin: `${an}-12-31`, libelle: String(an) };
}

const joursEntre = (debut, fin) => {
  const jours = [];
  for (let j = debut; j <= fin; j = addDays(j, 1)) jours.push(j);
  return jours;
};

// ── Calculs ────────────────────────────────────────────────────────

const moyenne = (vals) => (vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null);

/** Resume d'un indicateur quotidien sur [debut, fin], borne a aujourd'hui. */
function resumeQuotidien(ind, parDate, debut, fin, aujourdhui) {
  const dernier = fin < aujourdhui ? fin : aujourdhui;
  const vals = [];
  parDate.forEach((v, d) => {
    if (d >= debut && d <= dernier) vals.push(v);
  });
  if (!vals.length) return { valeur: null, nbJours: 0 };
  const valeur = ind.agregat === "total" ? vals.reduce((x, y) => x + y, 0) : moyenne(vals);
  return { valeur: round(valeur, ind.decimales), nbJours: vals.length };
}

/** Derniere mesure a la date donnee, ou avant. */
const derniereAvant = (points, date) => {
  let r = null;
  points.forEach((p) => {
    if (p.date <= date) r = p;
  });
  return r;
};

/**
 * Tout ce qu'affiche l'explorateur pour un indicateur et une periode.
 *
 * Rend : `barres` (indicateurs quotidiens) ou `points` (mesures), le
 * `resume` de la periode, la `cible`, et `phrases` : les points cles.
 */
export function explorer({ id, periode = "S", decalage = 0, donnees, profil, objectifs, aujourdhui }) {
  const ind = indicateur(id);
  const bornes = bornesPeriode(periode, decalage, aujourdhui);
  const precedentes = bornesPeriode(periode, Math.min(0, Math.round(num(decalage))) - 1, aujourdhui);
  const enCours = Math.min(0, Math.round(num(decalage))) === 0;
  const base = { indicateur: ind, periode, bornes, enCours, peutAvancer: !enCours };

  if (ind.genre === "mesure") return { ...base, ...explorerMesure(ind, periode, bornes, precedentes, donnees, profil, aujourdhui, enCours) };

  const parDate = ind.valeurs(donnees || {});
  const cible = ind.cible(profil || {}, objectifs || {});
  const resume = resumeQuotidien(ind, parDate, bornes.debut, bornes.fin, aujourdhui);
  const avant = resumeQuotidien(ind, parDate, precedentes.debut, precedentes.fin, aujourdhui);

  let barres = [];
  if (periode === "J") {
    // Le detail d'une journee : repas par repas pour la nutrition.
    if (ind.repas) {
      barres = REPAS.map((r) => {
        const total = (donnees.logEntries || [])
          .filter((e) => e && e.date === bornes.debut && (e.mealType || e.meal) === r.id)
          .reduce((s, e) => s + num(e[ind.repas]), 0);
        return { cle: r.id, label: r.label, valeur: total ? round(total) : null, detail: r.label };
      });
    }
  } else if (periode === "A") {
    const an = Number(bornes.debut.slice(0, 4));
    barres = MOIS_COURTS.map((lettre, k) => {
      const debut = isoDe(an, k + 1, 1);
      const fin = isoDe(an, k + 1, joursDansLeMois(an, k + 1));
      const r = debut > aujourdhui ? { valeur: null } : resumeQuotidien(ind, parDate, debut, fin, aujourdhui);
      return { cle: debut, label: lettre, valeur: r.valeur, detail: `${MOIS[k]} ${an}` };
    });
  } else {
    barres = joursEntre(bornes.debut, bornes.fin).map((d, k) => ({
      cle: d,
      label: periode === "S" ? JOURS_COURTS[k] : [1, 8, 15, 22, 29].includes(k + 1) ? String(k + 1) : "",
      valeur: d > aujourdhui ? null : parDate.has(d) ? parDate.get(d) : null,
      detail: fmtJour(d)
    }));
  }

  // Pour un jour, la moyenne des 7 jours precedents sert de repere.
  const repere = periode === "J" ? resumeQuotidien({ ...ind, agregat: ind.agregat === "total" ? "total" : "moyenne" }, parDate, addDays(bornes.debut, -7), addDays(bornes.debut, -1), aujourdhui) : null;

  return {
    ...base,
    barres,
    // Une cible est journaliere : elle ne s'applique pas a un total.
    cible: ind.agregat === "total" ? null : cible,
    resume: { ...resume, libelle: libelleResume(ind, periode) },
    phrases: phrasesQuotidien({ ind, periode, resume, avant, repere, cible, parDate, bornes, aujourdhui, enCours, profil })
  };
}

/** Ce qui s'additionne dans la journee : son resume du jour est un total. */
const CUMULS = new Set(["pas", "seances", "duree", "calories", "proteines", "glucides", "lipides", "eau", "fruitsLegumes", "portionsProteines"]);

function libelleResume(ind, periode) {
  if (periode === "J") return CUMULS.has(ind.id) ? "Total du jour" : "Ce jour-là";
  return ind.agregat === "total" ? "Total" : "Moyenne par jour noté";
}

function explorerMesure(ind, periode, bornes, precedentes, donnees, profil, aujourdhui, enCours) {
  const tous = ind.points(donnees || {});
  const dedans = tous.filter((p) => p.date >= bornes.debut && p.date <= bornes.fin);
  const derniere = derniereAvant(tous, bornes.fin < aujourdhui ? bornes.fin : aujourdhui);
  const reference = derniereAvant(tous, addDays(bornes.debut, -1)) || dedans[0] || null;
  const ecart = derniere && reference && derniere.date !== reference.date ? round(derniere.valeur - reference.valeur, 1) : null;
  const sens = sensMesure(ind.id, profil && profil.goal);
  return {
    points: dedans.map((p) => ({ ...p, detail: fmtJour(p.date) })),
    cible: null,
    resume: { valeur: derniere ? derniere.valeur : null, date: derniere ? derniere.date : null, libelle: "Dernière mesure", nbJours: dedans.length },
    ecart,
    phrases: phrasesMesure({ ind, periode, ecart, sens, derniere, reference, dedans, enCours })
  };
}

// ── Points cles ────────────────────────────────────────────────────

/** Nombre a la francaise, avec ses decimales. */
export function fmtNombre(v, decimales = 0) {
  if (v == null) return "—";
  return round(v, decimales).toLocaleString("fr-FR", { maximumFractionDigits: decimales, minimumFractionDigits: 0 });
}

/** Termine une phrase par un point, sans doubler celui d'une abreviation (« sept. »). */
const point = (t) => (t.endsWith(".") ? t : t + ".");

const signe = (v, d) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmtNombre(Math.abs(v), d);

// « avant » porte sa preposition : « au mois dernier », pas « a le mois dernier ».
const NOMS = {
  J: { ici: "ce jour-là", aujourdhui: "aujourd'hui", avant: "à la veille" },
  S: { ici: "cette semaine-là", aujourdhui: "cette semaine", avant: "à la semaine d'avant", avantEnCours: "à la semaine dernière" },
  M: { ici: "ce mois-là", aujourdhui: "ce mois-ci", avant: "au mois d'avant", avantEnCours: "au mois dernier" },
  A: { ici: "cette année-là", aujourdhui: "cette année", avant: "à l'année d'avant", avantEnCours: "à l'année dernière" }
};
const nomPeriode = (p, enCours) => (enCours ? NOMS[p].aujourdhui : NOMS[p].ici);
const nomAvant = (p, enCours) => (enCours && NOMS[p].avantEnCours ? NOMS[p].avantEnCours : NOMS[p].avant);

/** Ton d'un ecart : "bon", "a-surveiller" ou "neutre", selon le sens souhaite. */
export const tonEcart = (ecart, sens) => (!ecart || !sens ? "neutre" : ecart * sens > 0 ? "bon" : "a-surveiller");

function phrasesQuotidien({ ind, periode, resume, avant, repere, cible, parDate, bornes, aujourdhui, enCours, profil }) {
  const unite = ind.unite === "séance" ? "" : ind.unite.startsWith("/") ? ind.unite : ` ${ind.unite}`;
  const d = ind.decimales;
  const phrases = [];
  if (resume.valeur == null) {
    phrases.push({ texte: `Rien de noté ${nomPeriode(periode, enCours)}.`, ton: "neutre" });
    return phrases;
  }

  if (periode === "J") {
    if (cible) {
      const pct = Math.round((resume.valeur / cible) * 100);
      phrases.push({ texte: `${pct} % de ton objectif (${fmtNombre(cible, d)}${unite}).`, ton: ind.sens > 0 ? (pct >= 100 ? "bon" : "neutre") : Math.abs(pct - 100) <= 10 ? "bon" : "neutre" });
    }
    if (repere && repere.valeur != null) {
      const e = round(resume.valeur - repere.valeur, d);
      const base = ind.agregat === "total" ? "le total des 7 jours précédents" : "ta moyenne des 7 jours précédents";
      phrases.push({ texte: `${signe(e, d)}${unite} par rapport à ${base} (${fmtNombre(repere.valeur, d)}${unite}).`, ton: tonEcart(e, ind.sens) });
    }
    return phrases;
  }

  const quoi = ind.agregat === "total"
    ? `${fmtNombre(resume.valeur, d)}${ind.unite === "séance" ? ` séance${resume.valeur > 1 ? "s" : ""}` : unite} ${nomPeriode(periode, enCours)}`
    : `${fmtNombre(resume.valeur, d)}${unite} par jour en moyenne ${nomPeriode(periode, enCours)}`;
  if (avant.valeur != null) {
    const e = round(resume.valeur - avant.valeur, d);
    const comparaison = e === 0 ? `autant que ${nomAvant(periode, enCours).replace(/^au /, "le ").replace(/^à /, "")}` : `${signe(e, d)}${unite} par rapport ${nomAvant(periode, enCours)}`;
    phrases.push({ texte: `${quoi}, ${comparaison}.`, ton: tonEcart(e, ind.sens) });
  } else {
    phrases.push({ texte: `${quoi}.`, ton: "neutre" });
  }

  // Seances de la semaine face a l'objectif du profil.
  if (ind.id === "seances" && periode === "S" && num(profil && profil.sessionsPerWeek) > 0) {
    const vise = num(profil.sessionsPerWeek);
    phrases.push({
      texte: `Objectif : ${vise} séance${vise > 1 ? "s" : ""} par semaine${resume.valeur >= vise ? ", atteint." : `, encore ${vise - resume.valeur} à faire.`}`,
      ton: resume.valeur >= vise ? "bon" : "neutre"
    });
  }

  // Jours dans l'objectif, sur les jours notes de la periode.
  if (cible && ind.agregat !== "total" && periode !== "A") {
    const dernier = bornes.fin < aujourdhui ? bornes.fin : aujourdhui;
    const notes = [];
    parDate.forEach((v, j) => {
      if (j >= bornes.debut && j <= dernier) notes.push(v);
    });
    const atteints = ind.sens > 0
      ? notes.filter((v) => v >= cible).length
      : notes.filter((v) => Math.abs(v - cible) <= cible * TOLERANCE_CIBLE).length;
    const quoiCible =
      ind.sens > 0
        ? `à ton objectif ou au-dessus (${fmtNombre(cible, d)}${unite})`
        : `dans ta cible de ${fmtNombre(cible, d)}${unite} (à 10 % près)`;
    phrases.push({
      texte: `${atteints} jour${atteints > 1 ? "s" : ""} sur ${notes.length} noté${notes.length > 1 ? "s" : ""} ${quoiCible}.`,
      ton: atteints * 2 >= notes.length ? "bon" : "neutre"
    });
  }
  if (periode !== "J" && resume.nbJours && ind.agregat !== "total") {
    const total = periode === "S" ? 7 : null;
    if (total && resume.nbJours < 4) {
      phrases.push({ texte: `Seulement ${resume.nbJours} jour${resume.nbJours > 1 ? "s" : ""} noté${resume.nbJours > 1 ? "s" : ""} : la moyenne est à prendre avec prudence.`, ton: "neutre" });
    }
  }
  return phrases;
}

function phrasesMesure({ ind, periode, ecart, sens, derniere, reference, dedans, enCours }) {
  if (!derniere) return [{ texte: `Aucune mesure de ${ind.label.toLowerCase()} pour l'instant.`, ton: "neutre" }];
  const phrases = [];
  if (ecart != null) {
    const depuis = reference ? ` depuis le ${fmtJourCourt(reference.date)}` : "";
    phrases.push({
      texte: ecart === 0 ? `Stable${depuis} : ${fmtNombre(derniere.valeur, ind.decimales)} ${ind.unite}.` : point(`${signe(ecart, ind.decimales)} ${ind.unite}${depuis}`),
      ton: tonEcart(ecart, sens)
    });
  } else {
    phrases.push({ texte: point(`Dernière mesure : ${fmtNombre(derniere.valeur, ind.decimales)} ${ind.unite} le ${fmtJourCourt(derniere.date)}`), ton: "neutre" });
  }
  if (periode !== "J" && !dedans.length) {
    phrases.push({ texte: `Pas de nouvelle mesure ${nomPeriode(periode, enCours)}.`, ton: "neutre" });
  }
  return phrases;
}
