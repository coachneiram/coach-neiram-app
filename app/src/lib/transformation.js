/**
 * Transformation : gras perdu et muscle pris sur une période, à partir des
 * pesées du Journal (poids, % de masse grasse, masse musculaire).
 *
 * Repris de l'app Neiram le 24/10/2026. Dans l'app coach : la carte « Ma
 * transformation » (Mesures) et le bilan envoyé au coach. Pas de
 * classement entre clients (les garde-fous de perte restent appliqués).
 *
 * GARDE-FOUS (un classement de perte ne doit jamais pousser à maigrir
 * dangereusement — consensus ACSM sur la perte de poids, CIO sur les
 * déficits énergétiques relatifs, REDs 2023) :
 *  - la perte comptée est plafonnée à 1 % du poids de départ par
 *    semaine : au-delà, aller plus vite ne fait pas gagner de place ;
 *  - la prise de muscle comptée est plafonnée à 0,25 kg par semaine : au-
 *    delà, c'est surtout de l'eau, du glycogène ou l'imprécision de la
 *    balance (impédancemètre) ;
 *  - exclus du classement de perte : moins de 18 ans, grossesse ou
 *    allaitement, antécédent de trouble alimentaire, IMC final sous 18,5,
 *    masse grasse finale sous 8 % (hommes) ou 15 % (femmes) ;
 *  - au moins 21 jours entre la première et la dernière mesure, pour ne
 *    pas classer des variations d'eau d'un jour à l'autre.
 *
 * Précision : un impédancemètre se trompe de plusieurs points de masse
 * grasse d'une mesure à l'autre ; l'app le dit et conseille de se peser
 * dans les mêmes conditions (le matin, à jeun, après être allé aux
 * toilettes).
 */

import { addDays, num, round } from "./dates.js";

export const PLAFOND_PERTE_SEMAINE = 0.01;
export const PLAFOND_MUSCLE_SEMAINE = 0.25;
export const ECART_MINIMUM_JOURS = 21;
export const GRAS_MINIMUM = { homme: 8, femme: 15 };

const joursEntre = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);

/** Mesures utilisables d'une période, triées par date. */
function mesures(bodyLogs, debut, fin) {
  return (bodyLogs || [])
    .filter((b) => b && b.date >= debut && b.date <= fin && num(b.weightKg) > 0)
    .map((b) => ({
      date: b.date,
      poids: num(b.weightKg),
      gras: num(b.bodyFatPct) >= 3 && num(b.bodyFatPct) <= 60 ? num(b.bodyFatPct) : null,
      muscle: num(b.muscleKg) > 0 && num(b.muscleKg) < num(b.weightKg) ? num(b.muscleKg) : null
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Raison d'exclure du classement de perte, ou null. */
export function exclusionPerte(profil = {}, finale = null) {
  if (num(profil.age) && num(profil.age) < 18) return "Moins de 18 ans : pas de classement de perte.";
  if (String(profil.situation || "").startsWith("enceinte") || profil.situation === "allaitement") return "Grossesse ou allaitement : pas de classement de perte.";
  if ((profil.contraintesSante || []).includes("tca")) return "Antécédent de trouble alimentaire : pas de classement de perte.";
  if (finale) {
    const taille = num(profil.heightCm) / 100;
    if (taille > 0 && finale.poids / (taille * taille) < 18.5) return "IMC sous 18,5 : pas de classement de perte.";
    const mini = GRAS_MINIMUM[profil.sex === "femme" ? "femme" : "homme"];
    if (finale.gras != null && finale.gras < mini) return `Masse grasse sous ${mini} % : pas de classement de perte.`;
  }
  return null;
}

/**
 * Transformation sur [debut, fin]. Rend null sans deux mesures assez
 * espacées, sinon :
 *  { debut, fin, jours, poids: {avant, apres}, gras: {avantKg, apresKg,
 *    perduKg, compteKg, pct, plafonne} | null, muscle: {avant, apres,
 *    prisKg, compteKg, source: "muscle"|"maigre", plafonne} | null,
 *    exclusionPerte }
 */
export function transformation({ bodyLogs, profil = {}, debut, fin }) {
  const l = mesures(bodyLogs, debut, fin);
  if (l.length < 2) return null;
  const a = l[0];
  const b = l[l.length - 1];
  const jours = joursEntre(a.date, b.date);
  if (jours < ECART_MINIMUM_JOURS) return null;
  const semaines = jours / 7;
  const sortie = { debut: a.date, fin: b.date, jours, poids: { avant: a.poids, apres: b.poids }, gras: null, muscle: null };

  // Gras : première et dernière mesure qui ont un % de masse grasse.
  const avecGras = l.filter((x) => x.gras != null);
  const ga = avecGras[0];
  const gb = avecGras[avecGras.length - 1];
  if (ga && gb && ga !== gb && joursEntre(ga.date, gb.date) >= ECART_MINIMUM_JOURS) {
    const avantKg = (ga.poids * ga.gras) / 100;
    const apresKg = (gb.poids * gb.gras) / 100;
    const perduKg = avantKg - apresKg;
    const plafond = PLAFOND_PERTE_SEMAINE * ga.poids * (joursEntre(ga.date, gb.date) / 7);
    const compteKg = Math.max(0, Math.min(perduKg, plafond));
    sortie.gras = {
      avantKg: round(avantKg, 1),
      apresKg: round(apresKg, 1),
      perduKg: round(perduKg, 1),
      compteKg: round(compteKg, 1),
      pct: round((compteKg / ga.poids) * 100, 1),
      plafonne: perduKg > plafond
    };
  }

  // Muscle : la masse musculaire de la balance si elle est notée aux deux
  // bouts, sinon la masse maigre (poids − gras).
  const avecMuscle = l.filter((x) => x.muscle != null);
  let ma = avecMuscle[0];
  let mb = avecMuscle[avecMuscle.length - 1];
  let source = "muscle";
  let va = ma && ma.muscle;
  let vb = mb && mb.muscle;
  if (!(ma && mb && ma !== mb && joursEntre(ma.date, mb.date) >= ECART_MINIMUM_JOURS)) {
    ma = ga;
    mb = gb;
    source = "maigre";
    va = ma && ma.poids * (1 - ma.gras / 100);
    vb = mb && mb.poids * (1 - mb.gras / 100);
  }
  if (ma && mb && ma !== mb && joursEntre(ma.date, mb.date) >= ECART_MINIMUM_JOURS) {
    const prisKg = vb - va;
    const plafond = PLAFOND_MUSCLE_SEMAINE * (joursEntre(ma.date, mb.date) / 7);
    sortie.muscle = {
      avant: round(va, 1),
      apres: round(vb, 1),
      prisKg: round(prisKg, 1),
      compteKg: round(Math.max(0, Math.min(prisKg, plafond)), 1),
      source,
      plafonne: prisKg > plafond
    };
  }
  sortie.exclusionPerte = exclusionPerte(profil, gb || b);
  return sortie;
}

/** Les deux périodes des classements : 90 jours glissants, et l'année civile. */
export function periodes(date) {
  return {
    j90: { debut: addDays(date, -89), fin: date },
    annee: { debut: `${date.slice(0, 4)}-01-01`, fin: date }
  };
}

/**
 * Chiffres publiés (accord « transformation ») : gras perdu en % du poids
 * de départ et muscle pris en kg, sur 90 jours et sur l'année. Jamais le
 * poids, ni la masse grasse elle-même.
 */
export function statsTransformation({ bodyLogs, profil, date }) {
  const sortie = {};
  const p = periodes(date);
  for (const [cle, per] of Object.entries(p)) {
    const t = transformation({ bodyLogs, profil, ...per });
    if (!t) continue;
    const suffixe = cle === "j90" ? "90" : "an";
    if (t.gras && !t.exclusionPerte && t.gras.pct > 0) sortie[`gras_${suffixe}`] = t.gras.pct;
    if (t.muscle && t.muscle.compteKg > 0) sortie[`muscle_${suffixe}`] = t.muscle.compteKg;
  }
  return sortie;
}
