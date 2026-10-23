/**
 * Carnet d'entrainement : saisie serie par serie (22 octobre 2026).
 *
 * POURQUOI. Jusqu'ici, une ligne d'exercice valait N series identiques :
 * « 3 x 8 @ 60 kg ». Des qu'une serie differait (montee en charge, derniere
 * serie a 6 au lieu de 8), le client devait dupliquer la ligne. Une cliente
 * notait ainsi trois fois « Comp Squat » pour une seule seance de squat.
 *
 * LE MODELE. Un exercice peut porter `series` : une ligne par serie
 * reellement faite, `{ weight, reps, rpe, fait }`. Les champs agreges de
 * l'exercice (`sets`, `reps`, `weight`, `rpe`) restent remplis, recalcules a
 * partir des series a chaque saisie. Tout ce qui lisait ces champs (plan de
 * la semaine, progression de charge, exercices personnels, bilans) continue
 * donc de marcher sans rien changer.
 *
 * LES ANCIENNES SEANCES ne sont pas converties. Sans `series`, un exercice
 * s'affiche en lignes deduites de « series x reps @ charge », et rien n'est
 * reecrit tant que le client ne touche pas a une serie.
 */

import { num } from "./dates.js";
import { est1RMFromSet, fmtRPE } from "./force.js";

/** Repos entre deux series quand le client n'a rien regle, en secondes. */
export const REPOS_PAR_DEFAUT = 90;

/**
 * Durees de repos proposees, en secondes.
 *
 * Jusqu'a 10 min depuis le 23 octobre 2026 (demande du coach : 5 min ne
 * suffisaient pas en force). Au-dela, « Autre durée… » accepte n'importe
 * quelle duree, et « Chronomètre » compte sans limite.
 */
export const CHOIX_REPOS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360, 480, 600];

/** Valeur de `repos` qui demande un chronometre (compte a partir de 0, sans fin). */
export const REPOS_CHRONO = "chrono";

/** Valeurs speciales du menu de repos. */
export const CHOIX_AUTRE = "autre";

/** Au-dela, une ligne de series n'est plus lisible au telephone. */
export const MAX_SERIES = 20;

/** Pas des boutons du minuteur, en secondes. */
export const PAS_MINUTEUR = 15;

/**
 * Textes de la saisie serie par serie.
 *
 * Ranges ici plutot qu'ecrits dans l'ecran : ils sont nouveaux par
 * construction (l'ancienne application n'avait ni series ni minuteur) et
 * doivent rester faciles a relire d'un coup d'oeil.
 */
export const TEXTES_SERIES = {
  colonneNumero: "#",
  colonneFait: "Fait",
  ajouter: "+ Série",
  retirer: "− Série",
  repos: "Repos",
  derniereFois: "Dernière fois",
  minuteur: "Repos",
  minuteurFini: "Repos terminé",
  moins: "−15 s",
  plus: "+15 s",
  passer: "Passer",
  quitter: "Quitter la séance sans l'enregistrer ? Les séries cochées seront perdues.",
  ariaFait: "Série faite",
  ariaRepos: "Temps de repos entre les séries",
  autreDuree: "Autre durée",
  chronometre: "Chronomètre",
  minutes: "min",
  ariaMinutes: "Durée du repos en minutes",
  chrono: "Chrono",
  arreter: "Arrêter"
};

/** Duree lisible : « 45 s », « 1 min », « 1 min 30 ». */
export function fmtDuree(secondes) {
  const s = Math.max(0, Math.round(num(secondes)));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h} h${mm ? " " + String(mm).padStart(2, "0") : ""}`;
  }
  return r ? `${m} min ${String(r).padStart(2, "0")}` : `${m} min`;
}

/** Compte a rebours : « 1:05 » ; au-dela d'une heure « 1:02:05 ». */
export function fmtChrono(secondes) {
  const s = Math.max(0, Math.ceil(num(secondes)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

/** Chronometre : temps ecoule, arrondi a la seconde inferieure. */
export const fmtEcoule = (secondes) => fmtChrono(Math.floor(Math.max(0, num(secondes))));

/** Repos de l'exercice en secondes, ou celui par defaut (chronometre compris). */
export const reposDe = (ex) => (num(ex && ex.repos) > 0 ? num(ex.repos) : REPOS_PAR_DEFAUT);

/** Le repos de cet exercice se compte-t-il au chronometre ? */
export const estChrono = (ex) => !!ex && ex.repos === REPOS_CHRONO;

/**
 * Valeur affichee par le menu de repos : une duree, « autre » quand le
 * client a tape sa propre duree, ou « chrono ».
 */
export function valeurMenuRepos(ex) {
  if (estChrono(ex)) return REPOS_CHRONO;
  if (ex && ex.reposLibre) return CHOIX_AUTRE;
  return String(reposDe(ex));
}

/** Durees du menu, avec celle de l'exercice si elle n'y est pas. */
export function dureesMenuRepos(ex) {
  const d = reposDe(ex);
  return CHOIX_REPOS.includes(d) || (ex && ex.reposLibre) ? CHOIX_REPOS : [...CHOIX_REPOS, d].sort((a, b) => a - b);
}

/** Correctif a appliquer quand le client choisit dans le menu de repos. */
export function choisirRepos(ex, valeur) {
  if (valeur === REPOS_CHRONO) return { repos: REPOS_CHRONO, reposLibre: false };
  if (valeur === CHOIX_AUTRE) return { repos: reposDe(ex), reposLibre: true };
  return { repos: num(valeur) > 0 ? num(valeur) : REPOS_PAR_DEFAUT, reposLibre: false };
}

/**
 * Duree tapee en minutes (« 7 », « 6,5 ») convertie en secondes. Sans
 * plafond : un repos de 15 min se respecte. Rend null pour une saisie vide
 * ou nulle, que l'ecran ignore.
 */
export function reposDepuisMinutes(texte) {
  const m = num(String(texte ?? "").replace(",", "."));
  return m > 0 ? Math.max(1, Math.round(m * 60)) : null;
}

/** Minutes affichees dans le champ « Autre durée… » (« 7 », « 6.5 »). */
export const minutesDeRepos = (ex) => String(Math.round((reposDe(ex) / 60) * 100) / 100);

/** Le cardio n'a pas de series : il se note en duree et en distance. */
export const aDesSeries = (ex) => !!ex && (ex.mode || "muscu") !== "cardio";

const vide = (v) => v === "" || v == null;

/**
 * Une serie compte des qu'elle porte une charge, des repetitions ou un
 * ressenti. Le ressenti seul compte aussi : l'ancienne grille gardait un RPE
 * saisi sans charge, la nouvelle ne doit pas l'effacer en silence.
 */
export const serieRemplie = (s) => !!s && (!vide(s.weight) || !vide(s.reps) || !vide(s.rpe));

/** L'exercice porte-t-il deja une saisie serie par serie ? */
export const aSeriesSaisies = (ex) => aDesSeries(ex) && Array.isArray(ex.series) && ex.series.length > 0;

/**
 * Series d'un exercice, telles qu'elles s'affichent.
 *
 * Avec `series` : celles-ci. Sans : les lignes deduites de l'ancien format,
 * le RPE sur la derniere seulement (c'etait le ressenti de l'exercice, donc
 * de la serie la plus dure). Un exercice sans nombre de series s'ouvre sur
 * une ligne, pour avoir ou saisir.
 */
export function seriesDe(ex) {
  if (!aDesSeries(ex)) return [];
  if (aSeriesSaisies(ex)) return ex.series.map((s) => ({ ...s }));
  const n = Math.min(MAX_SERIES, Math.max(1, Math.floor(num(ex.sets))));
  const weight = vide(ex.weight) ? "" : String(ex.weight);
  const reps = vide(ex.reps) ? "" : String(ex.reps);
  return Array.from({ length: n }, (_, k) => ({
    weight,
    reps,
    rpe: k === n - 1 && !vide(ex.rpe) ? String(ex.rpe) : "",
    fait: false
  }));
}

/**
 * Serie de reference : la plus lourde, et a charge egale la derniere.
 *
 * C'est elle qui fixe la charge, les repetitions et le ressenti de
 * l'exercice, donc la charge proposee la fois suivante. « A charge egale la
 * derniere » parce que c'est la plus fatiguee : son RPE est le plus honnete.
 */
export function serieDeReference(series) {
  let ref = null;
  for (const s of series || []) {
    if (!serieRemplie(s)) continue;
    if (!ref || num(s.weight) >= num(ref.weight)) ref = s;
  }
  return ref;
}

/**
 * Correctif a appliquer a un exercice pour lui donner ces series.
 *
 * Les champs agreges suivent : nombre de series remplies, et charge,
 * repetitions et RPE de la serie de reference.
 */
export function avecSeries(series) {
  const lignes = (series || []).slice(0, MAX_SERIES).map((s) => ({
    weight: vide(s.weight) ? "" : String(s.weight),
    reps: vide(s.reps) ? "" : String(s.reps),
    rpe: vide(s.rpe) ? "" : String(s.rpe),
    fait: !!s.fait
  }));
  const remplies = lignes.filter(serieRemplie);
  const ref = serieDeReference(lignes);
  return {
    series: lignes,
    sets: remplies.length ? String(remplies.length) : "",
    reps: ref ? ref.reps : "",
    weight: ref ? ref.weight : "",
    rpe: ref ? ref.rpe : ""
  };
}

/** Nouvelle serie : la copie de la precedente, non cochee, sans ressenti. */
export function serieSuivante(series) {
  const derniere = (series || [])[series.length - 1];
  return derniere ? { weight: derniere.weight, reps: derniere.reps, rpe: "", fait: false } : { weight: "", reps: "", rpe: "", fait: false };
}

/**
 * Exercice tel qu'il s'enregistre : series vides retirees, coches oubliees.
 *
 * La coche ne sert que pendant la seance (elle declenche le repos). La
 * garder dans l'historique n'apprendrait rien : une serie enregistree est
 * une serie faite. Un exercice sans `series` ressort tel quel.
 */
export function finaliserSeries(ex) {
  if (!aSeriesSaisies(ex)) return ex;
  const remplies = ex.series.filter(serieRemplie);
  if (!remplies.length) {
    const { series, ...reste } = ex;
    return { ...reste, ...agregatsVides() };
  }
  const agregats = avecSeries(remplies);
  return { ...ex, ...agregats, series: agregats.series.map(({ fait, ...s }) => s) };
}

const agregatsVides = () => ({ sets: "", reps: "", weight: "", rpe: "" });

/**
 * Series a prendre en compte dans les calculs (records, progression,
 * maxis), ou null pour un exercice a l'ancien format.
 */
export function seriesPourCalcul(ex) {
  if (!aSeriesSaisies(ex)) return null;
  const remplies = ex.series.filter((s) => num(s.weight) > 0 && num(s.reps) > 0);
  return remplies.length ? remplies : null;
}

/** Meilleur 1RM estime parmi des series, avec la serie qui le donne. */
export function meilleureEstimation(series, rir) {
  let meilleure = null;
  for (const s of series || []) {
    const e = est1RMFromSet(s.weight, s.reps, s.rpe, vide(s.rpe) ? rir : "");
    if (e && (!meilleure || e.value > meilleure.estimation.value)) meilleure = { estimation: e, serie: s };
  }
  return meilleure;
}

/** Toutes les series sont-elles identiques (charge et repetitions) ? */
function seriesIdentiques(series) {
  return series.every((s) => num(s.weight) === num(series[0].weight) && String(s.reps) === String(series[0].reps));
}

/**
 * Series ecrites une a une : « 60×8 · 62.5×8 · 62.5×6 kg ».
 *
 * Rend une chaine vide quand il n'y a rien de remarquable a dire : series
 * toutes identiques, ou exercice a l'ancien format. Le resume reste alors
 * celui d'avant, « 3×8 @ 60 kg ».
 */
export function resumeSeries(ex) {
  if (!aSeriesSaisies(ex)) return "";
  const remplies = ex.series.filter(serieRemplie);
  if (!remplies.length || seriesIdentiques(remplies)) return "";
  return ecrireSeries(remplies, ex.mode || "muscu", ex.repUnit);
}

/** Notation commune au resume et a « Dernière fois ». */
export function ecrireSeries(series, mode, repUnit) {
  const unite = repUnit === "sec" ? " s" : "";
  const sansCharge = mode === "pdc" || mode === "warmup";
  const avecCharge = series.some((s) => num(s.weight) > 0);
  const morceaux = series.map((s) => {
    const reps = vide(s.reps) ? "—" : String(s.reps) + unite;
    if (sansCharge) return num(s.weight) > 0 ? `${reps} (+${s.weight} kg)` : reps;
    return avecCharge ? `${vide(s.weight) ? "—" : s.weight}×${reps}` : reps;
  });
  const suffixe = mode === "pdc" ? " PDC" : !sansCharge && avecCharge ? " kg" : "";
  return morceaux.join(" · ") + suffixe;
}

/** « Dernière fois » : les series d'une seance passee, en une ligne. */
export function resumeDerniereFois(ex) {
  const remplies = seriesDe(ex).filter(serieRemplie);
  if (!remplies.length) return "";
  const rpe = remplies.map((s) => s.rpe).filter((v) => !vide(v));
  const ressenti = rpe.length ? ` · RPE ${fmtRPE(rpe[rpe.length - 1])}` : "";
  return ecrireSeries(remplies, ex.mode || "muscu", ex.repUnit) + ressenti;
}

/**
 * Charge proposee appliquee aux series reprises de la derniere seance.
 *
 * Seules les series faites a la charge de reference montent (ou baissent) :
 * une serie d'echauffement a 40 kg ne devient pas une serie a 62,5 kg parce
 * que la serie lourde a ete facile.
 */
export function appliquerCharge(series, depuis, vers) {
  return (series || []).map((s) =>
    num(s.weight) > 0 && num(s.weight) === num(depuis) ? { ...s, weight: String(vers) } : s
  );
}

/**
 * Bouton « Garder 60 » : on revient a la charge de la derniere fois.
 *
 * Correctif a appliquer a l'exercice. Sans series, seule la charge change,
 * comme avant.
 */
export function garderCharge(ex) {
  const sug = ex && ex.suggested;
  if (!sug) return {};
  if (!aSeriesSaisies(ex)) return { weight: String(sug.from), suggested: null };
  return { ...avecSeries(appliquerCharge(ex.series, ex.weight, sug.from)), suggested: null };
}
