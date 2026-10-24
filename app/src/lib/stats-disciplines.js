/**
 * Chiffres publiés dans les classements par discipline et l'athlète du
 * mois de la communauté Team Neiram (worker/coach-neiram-proxy.js, section
 * « Communauté », les borne). Repris de l'app publique Neiram
 * (lib/stats-disciplines.js) le 24 octobre 2026.
 *
 * Envoyés SEULEMENT avec l'accord « disciplines » (lib/communaute.js) :
 * performances, sexe et catégorie de poids — jamais le poids exact.
 *
 * Scores de l'athlète du mois (comparables entre hommes et femmes et entre
 * catégories) : seulement pour une performance NOTÉE DANS LE MOIS, sinon
 * personne ne pourrait détrôner un record ancien. Pour la force, la date
 * d'un maxi est dans « maj » (App.jsx, definirMaxiForce).
 */

import { num } from "./dates.js";
import { lirePerformances, maxisRetenus } from "./performances.js";
import { categorieIPF, pointsGL, scoreCourse, scoreNatation, categorieIWF, pointsSinclair } from "./niveaux.js";

const sexeCourt = (profil) => (profil && profil.sex === "femme" ? "f" : "h");

/** Une date « AAAA-MM-JJ » tombe-t-elle dans le mois « AAAA-MM » ? */
const duMois = (d, mois) => typeof d === "string" && d.startsWith(mois);

export function statsDisciplines({ date, profil = {}, poids, maxis = {}, seances = [], performances = lirePerformances() }) {
  const mois = date.slice(0, 7);
  const sexe = sexeCourt(profil);
  const sortie = { sexe };
  const age = num(profil.age) || null;

  // Force athlétique : total des trois maxis retenus.
  const m = maxisRetenus(maxis, seances);
  const catPL = categorieIPF(sexe, poids, age);
  if (m.total) {
    sortie.pl_total = m.total;
    if (catPL) sortie.cat_pl = catPL;
    const gl = pointsGL(m.total, poids, sexe);
    if (gl) {
      sortie.pl_gl = gl;
      const maj = (maxis && maxis.maj) || {};
      if (["squat", "bench", "deadlift"].some((l) => duMois(maj[l], mois))) sortie.score_force = gl;
    }
  }

  // Haltérophilie : total arraché + épaulé-jeté.
  const ar = performances.halt_arrache;
  const ej = performances.halt_epj;
  if (ar && ej) {
    const total = ar.valeur + ej.valeur;
    sortie.halt_total = total;
    const catH = categorieIWF(sexe, poids);
    if (catH) sortie.cat_halt = catH;
    const sinclair = pointsSinclair(total, poids, sexe);
    if (sinclair) {
      sortie.halt_sinclair = sinclair;
      if (duMois(ar.date, mois) || duMois(ej.date, mois)) sortie.score_halt = sinclair;
    }
  }

  // Course et natation : chaque chrono, et le meilleur score du mois.
  let course = 0;
  let natation = 0;
  for (const [id, p] of Object.entries(performances)) {
    if (id.startsWith("course_")) {
      sortie[id] = p.valeur;
      const sc = duMois(p.date, mois) ? scoreCourse(id, p.valeur, sexe) : null;
      if (sc > course) course = sc;
    } else if (id.startsWith("nat_")) {
      sortie[id] = p.valeur;
      const sc = duMois(p.date, mois) ? scoreNatation(id, p.valeur, sexe) : null;
      if (sc > natation) natation = sc;
    }
  }
  if (course) sortie.score_course = course;
  if (natation) sortie.score_natation = natation;
  return sortie;
}
