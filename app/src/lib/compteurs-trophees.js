/**
 * Compteurs des trophées « mode de vie et tous sports » (24/10/2026, sur
 * le modèle de lib/extras-badges.js de l'app Neiram) : un seul endroit pour
 * ce qui se lit dans le stockage (programmes terminés, série d'habitudes,
 * leçons faites, performances notées). lib/trophees.js reste pur : il
 * reçoit ces compteurs en paramètre.
 *
 * Le niveau fédéral se calcule à partir des performances notées
 * (lib/performances.js) et des grilles officielles (lib/niveaux.js) : la
 * meilleure marche (1 régional, 2 national, 3 international) toutes
 * disciplines confondues. Pas de palmarès serveur dans l'app coach.
 */

import { charger } from "./stockage.js";
import { todayISO } from "./dates.js";
import { meilleureAnnee } from "./calendrier.js";
import { semainesActivesOMS, sportsPratiques } from "./activites.js";
import { CLE_PROGRAMMES_TERMINES } from "./programmes-sport.js";
import { CLE_HABITUDES, meilleureSerie } from "./habitudes.js";
import { CLE_LECONS, leconsFaites } from "./lecons.js";
import { EPREUVES, lirePerformances, maxisRetenus } from "./performances.js";
import { marcheFederale, niveauCourse, niveauFFForce, niveauFFHM, niveauNatation } from "./niveaux.js";

/**
 * Meilleure marche fédérale atteinte (0 à 3) : force athlétique (total et
 * développé couché, FFForce), haltérophilie (total, FFHM), course (FFA) et
 * natation (FFN). Le poids est celui du dernier relevé ; sans lui, la force
 * et l'haltérophilie n'ont pas de catégorie et ne comptent pas.
 */
export function niveauFederal({ performances = {}, maxisForce = {}, seances = [], profil = {}, poidsKg = null } = {}) {
  const sexe = profil && profil.sex === "femme" ? "femme" : "homme";
  const age = profil ? profil.age : undefined;
  const marches = [0];
  const m = maxisRetenus(maxisForce, seances);
  if (poidsKg) {
    if (m.total) marches.push(marcheFederale("force", niveauFFForce({ discipline: "FA", sexe, age, poids: poidsKg, valeur: m.total })));
    if (m.bench) marches.push(marcheFederale("force", niveauFFForce({ discipline: "DC", sexe, age, poids: poidsKg, valeur: m.bench })));
    const a = performances.halt_arrache;
    const e = performances.halt_epj;
    if (a && e) marches.push(marcheFederale("halterophilie", niveauFFHM({ sexe, age, poids: poidsKg, valeur: a.valeur + e.valeur })));
  }
  for (const ep of EPREUVES) {
    const p = performances[ep.id];
    if (!p) continue;
    if (ep.discipline === "course") marches.push(marcheFederale("course", niveauCourse(ep.id, p.valeur, sexe, age)));
    if (ep.discipline === "natation") marches.push(marcheFederale("natation", niveauNatation(ep.id, p.valeur, sexe)));
  }
  return Math.max(...marches.map((x) => Number(x) || 0));
}

/**
 * Compteurs à passer à trophees({ compteurs }). Les séances, le profil, les
 * maxis et le poids viennent de l'écran ; le reste se lit dans le stockage.
 */
export function compteursTrophees({ seances = [], profil = {}, maxisForce = {}, poidsKg = null, date = todayISO() } = {}) {
  const termines = charger(CLE_PROGRAMMES_TERMINES, []);
  return {
    annee: meilleureAnnee(seances),
    sports: sportsPratiques(seances),
    actif: semainesActivesOMS(seances),
    programmes: Array.isArray(termines) ? termines.length : 0,
    habitudes: meilleureSerie(charger(CLE_HABITUDES, null), date),
    lecons: leconsFaites(charger(CLE_LECONS, null)),
    niveauFederal: niveauFederal({ performances: lirePerformances(), maxisForce, seances, profil, poidsKg })
  };
}
