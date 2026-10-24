/**
 * Classement de perte de gras de la communauté Team Neiram : ce client
 * peut-il y entrer ? (24 octobre 2026)
 *
 * Le SEUL fichier de la communauté qui lit les réponses de santé du
 * questionnaire « sur mesure » (grossesse, allaitement, antécédent de
 * trouble alimentaire : lib/nutrition-perso.js). Il ne rend qu'un oui ou
 * un non : c'est tout ce que le serveur du coach reçoit (« perte_eligible »),
 * jamais la raison.
 *
 * Exclus (lib/transformation.js, exclusionPerte) : moins de 18 ans,
 * grossesse ou allaitement, antécédent de trouble alimentaire, IMC sous
 * 18,5, masse grasse sous 8 % (hommes) ou 15 % (femmes) à la dernière
 * pesée.
 */

import { num } from "./dates.js";
import { exclusionPerte } from "./transformation.js";
import { lireReglagesSurMesure, profilPourRepere } from "./nutrition-perso.js";

export function perteEligible({ corps, profil, reglages = lireReglagesSurMesure() }) {
  const sante = profilPourRepere(profil || {}, reglages);
  const pesees = (corps || []).filter((b) => b && b.date && num(b.weightKg) > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
  const d = pesees[pesees.length - 1];
  const finale = d ? { poids: num(d.weightKg), gras: num(d.bodyFatPct) >= 3 && num(d.bodyFatPct) <= 60 ? num(d.bodyFatPct) : null } : null;
  return !exclusionPerte(sante, finale);
}
