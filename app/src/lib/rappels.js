/**
 * Rappels : la decision, separee du declenchement.
 *
 * L'application d'origine melangeait les deux dans un useEffect : le
 * calcul de « faut-il rappeler maintenant ? » et l'affichage. Impossible
 * a tester sans navigateur, et de fait jamais teste — c'est une des
 * raisons pour lesquelles la disparition complete des rappels a la
 * bascule n'a rien fait echouer.
 *
 * Ici la decision est une fonction pure : on lui donne l'heure, le
 * profil et ce qui a deja ete fait, elle repond. Le hook n'a plus qu'a
 * l'appeler chaque minute et a afficher.
 */

import { getWeekKey } from "./semaine.js";
import { todayISO } from "./dates.js";

/**
 * Rappel du dimanche : envoyer son bilan hebdo au coach.
 *
 * C'est le rappel qui compte le plus pour le suivi : sans bilan, le coach
 * travaille a l'aveugle. D'ou la fenetre large (10 h - 21 h) et le
 * declenchement au plus tot dans la journee.
 */
export const RAPPEL_DIMANCHE = {
  heureDebut: 10,
  heureFin: 21,
  tag: "coach-report",
  titre: "Coach Neiram 📤",
  message:
    "C'est dimanche : envoie ton bilan de la semaine à ton coach — Tendances → « Envoyer à mon coach ». Pense à tes 3 photos si ce n'est pas fait."
};

/**
 * Faut-il rappeler le bilan du dimanche, maintenant ?
 *
 * @param maintenant       Date courante.
 * @param profile          Profil du client.
 * @param semaineDejaVue   Cle de semaine deja rappelee (etat persistant).
 * @param semaineDejaEnvoyee Cle de semaine dont le bilan a deja ete envoye.
 * @returns {{rappeler: boolean, raison: string, cleSemaine: string|null}}
 */
export function decisionRappelDimanche({ maintenant, profile, semaineDejaVue, semaineDejaEnvoyee }) {
  const non = (raison) => ({ rappeler: false, raison, cleSemaine: null });

  if (!profile) return non("pas de profil");
  if (profile.reportReminderEnabled === false) return non("rappel desactive");
  if (maintenant.getDay() !== 0) return non("pas dimanche");

  const h = maintenant.getHours();
  if (h < RAPPEL_DIMANCHE.heureDebut || h >= RAPPEL_DIMANCHE.heureFin) return non("hors plage horaire");

  const cleSemaine = getWeekKey(todayISO());
  if (semaineDejaVue === cleSemaine) return non("deja rappele cette semaine");

  // Le client qui a deja envoye son bilan n'a rien a faire d'un rappel :
  // c'est le meilleur moyen de lui apprendre a les ignorer.
  if (semaineDejaEnvoyee === cleSemaine) return non("bilan deja envoye");

  return { rappeler: true, raison: "a rappeler", cleSemaine };
}


/**
 * Rappel d'hydratation.
 *
 * Reglages du client : plage horaire et intervalle. On ne rappelle jamais
 * si l'objectif du jour est deja atteint — un rappel qui arrive alors que
 * le travail est fait apprend a ignorer les rappels.
 */
export const RAPPEL_HYDRATATION = {
  tag: "coach-hydration",
  titre: "Coach Neiram 💧",
  heureDebutDefaut: 9,
  heureFinDefaut: 21,
  intervalleDefaut: 90
};

export function decisionRappelHydratation({ maintenant, profile, journalDuJour, dernierEnvoi }) {
  const non = (raison) => ({ rappeler: false, raison });
  if (!profile || !profile.hydrationRemindersEnabled) return non("rappel desactive");

  const h = maintenant.getHours();
  const debut = profile.hydrationStartHour ?? RAPPEL_HYDRATATION.heureDebutDefaut;
  const fin = profile.hydrationEndHour ?? RAPPEL_HYDRATATION.heureFinDefaut;
  if (h < debut || h >= fin) return non("hors plage horaire");

  const intervalle = profile.hydrationIntervalMin || RAPPEL_HYDRATATION.intervalleDefaut;
  const depuis = dernierEnvoi ? new Date(dernierEnvoi).getTime() : 0;
  if (maintenant.getTime() - depuis < intervalle * 60000) return non("intervalle non ecoule");

  const bu = (journalDuJour && journalDuJour.waterMl) || 0;
  const objectif = (profile.targetWaterL || 2) * 1000;
  const reste = objectif - bu;
  if (reste <= 0) return non("objectif deja atteint");

  return { rappeler: true, raison: "a rappeler", bu, objectif, reste };
}

export const messageHydratation = ({ bu, objectif, reste }, fmtL) =>
  `Hydratation : ${fmtL(bu)} / ${fmtL(objectif)} — il te reste ${fmtL(reste)} à boire aujourd'hui.`;

/**
 * Rappel nutrition.
 *
 * Sous 150 kcal restantes, on se tait : proposer une collation a quelqu'un
 * qui a presque atteint son objectif le pousse au depassement.
 */
export const RAPPEL_NUTRITION = {
  tag: "coach-nutrition",
  titre: "Coach Neiram 🍽️",
  heureDebutDefaut: 10,
  heureFinDefaut: 21,
  intervalleDefaut: 180,
  seuilKcal: 150
};

export function decisionRappelNutrition({ maintenant, profile, targets, totaux, dernierEnvoi }) {
  const non = (raison) => ({ rappeler: false, raison });
  if (!profile || !profile.nutritionRemindersEnabled) return non("rappel desactive");
  if (!targets || !targets.calories) return non("objectifs non calcules");

  const h = maintenant.getHours();
  const debut = profile.nutritionStartHour ?? RAPPEL_NUTRITION.heureDebutDefaut;
  const fin = profile.nutritionEndHour ?? RAPPEL_NUTRITION.heureFinDefaut;
  if (h < debut || h >= fin) return non("hors plage horaire");

  const intervalle = profile.nutritionIntervalMin || RAPPEL_NUTRITION.intervalleDefaut;
  const depuis = dernierEnvoi ? new Date(dernierEnvoi).getTime() : 0;
  if (maintenant.getTime() - depuis < intervalle * 60000) return non("intervalle non ecoule");

  const restant = {
    kcal: targets.calories - totaux.kcal,
    p: Math.max(0, (targets.protein || 0) - totaux.p),
    c: Math.max(0, (targets.carbs || 0) - totaux.c),
    f: Math.max(0, (targets.fat || 0) - totaux.f)
  };
  if (restant.kcal < RAPPEL_NUTRITION.seuilKcal) return non("moins de 150 kcal restantes");

  return { rappeler: true, raison: "a rappeler", totaux, restant };
}

export function messageNutrition({ totaux, restant }, targets, suggestions) {
  const idees = suggestions && suggestions.length
    ? ` Idées : ${suggestions.map((s) => `${s.name} (${s.kcal} kcal)`).join(", ")}.`
    : "";
  return (
    `Nutrition : ${Math.round(totaux.kcal)} / ${targets.calories} kcal — il te reste ` +
    `${Math.round(restant.kcal)} kcal (P ${Math.round(restant.p)} g · G ${Math.round(restant.c)} g · ` +
    `L ${Math.round(restant.f)} g) aujourd'hui.${idees}`
  );
}

/**
 * Rappel de creneau (coaching en ligne uniquement).
 *
 * Une seule notification, dans l'heure qui precede le creneau, et jamais
 * si la seance est deja faite.
 */
export const RAPPEL_CRENEAU = {
  tag: "coach-creneau",
  titre: "Coach Neiram ⏰",
  avanceMinutes: 60
};

export function decisionRappelCreneau({ maintenant, profile, creneauDuJour, seanceFaite, jourDejaRappele, aujourdhui }) {
  const non = (raison) => ({ rappeler: false, raison });
  if (!profile || profile.creneauReminderEnabled === false) return non("rappel desactive");
  if (!creneauDuJour || !creneauDuJour.time) return non("aucun creneau aujourd'hui");
  if (seanceFaite) return non("seance deja faite");

  const minutesCreneau = creneauDuJour.minutes;
  if (minutesCreneau == null) return non("heure de creneau illisible");

  const minutesCourantes = maintenant.getHours() * 60 + maintenant.getMinutes();
  if (minutesCourantes < minutesCreneau - RAPPEL_CRENEAU.avanceMinutes) return non("trop tot");
  if (minutesCourantes >= minutesCreneau) return non("creneau deja commence");

  if (jourDejaRappele === aujourdhui) return non("deja rappele aujourd'hui");

  return { rappeler: true, raison: "a rappeler" };
}

export const messageCreneau = (libelleJour, heure) =>
  `Ton créneau de ${libelleJour.toLowerCase()} à ${heure} approche.`;
