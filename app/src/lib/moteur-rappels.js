/**
 * Les minuteurs des rappels client.
 *
 * Meme principe que rappel-dimanche.js : la decision est pure et
 * testable, ce fichier ne fait que la declencher et afficher.
 *
 * Regle commune, reprise de l'original : l'etat n'est ecrit QU'APRES un
 * affichage reussi. Un rappel qu'on n'a pas pu montrer (app en arriere-
 * plan, notifications refusees) doit repasser au tour suivant plutot
 * qu'etre consomme dans le vide.
 */

import { charger, enregistrer } from "./stockage.js";
import { notifier } from "./notifier.js";
import { fmtL } from "./score-jour.js";
import { choisirSuggestions } from "./suggestions.js";
import { dayIdOf, minutesOf, normaliserCreneaux, slotDayLabel } from "./semaine.js";
import { todayISO } from "./dates.js";
import {
  RAPPEL_CRENEAU,
  RAPPEL_HYDRATATION,
  RAPPEL_NUTRITION,
  decisionRappelCreneau,
  decisionRappelHydratation,
  decisionRappelNutrition,
  messageCreneau,
  messageHydratation,
  messageNutrition
} from "./rappels.js";

export const CLE_ETAT_HYDRATATION = "coach_hydration_state";
export const CLE_ETAT_NUTRITION = "coach_nutrition_state";
export const CLE_ETAT_CRENEAU = "coach_creneau_reminder_state";

export function verifierRappelHydratation({
  profile,
  journalDuJour,
  afficherToast,
  maintenant = new Date(),
  montrer = notifier
}) {
  const decision = decisionRappelHydratation({
    maintenant,
    profile,
    journalDuJour,
    dernierEnvoi: charger(CLE_ETAT_HYDRATATION, {}).lastAt
  });
  if (!decision.rappeler) return decision;

  const montre = montrer({
    titre: RAPPEL_HYDRATATION.titre,
    message: messageHydratation(decision, fmtL),
    tag: RAPPEL_HYDRATATION.tag,
    afficherToast
  });
  if (!montre) return { ...decision, rappeler: false, raison: "affichage impossible pour l'instant" };

  enregistrer(CLE_ETAT_HYDRATATION, { lastAt: maintenant.toISOString() });
  return { ...decision, montre: true };
}

export function verifierRappelNutrition({
  profile,
  targets,
  totaux,
  afficherToast,
  maintenant = new Date(),
  montrer = notifier,
  suggerer = choisirSuggestions
}) {
  const decision = decisionRappelNutrition({
    maintenant,
    profile,
    targets,
    totaux,
    dernierEnvoi: charger(CLE_ETAT_NUTRITION, {}).lastAt
  });
  if (!decision.rappeler) return decision;

  const montre = montrer({
    titre: RAPPEL_NUTRITION.titre,
    message: messageNutrition(decision, targets, suggerer(decision.restant, profile, 2)),
    tag: RAPPEL_NUTRITION.tag,
    afficherToast
  });
  if (!montre) return { ...decision, rappeler: false, raison: "affichage impossible pour l'instant" };

  enregistrer(CLE_ETAT_NUTRITION, { lastAt: maintenant.toISOString() });
  return { ...decision, montre: true };
}

export function verifierRappelCreneau({
  profile,
  seances,
  afficherToast,
  maintenant = new Date(),
  montrer = notifier
}) {
  const aujourdhui = todayISO();
  const creneau = normaliserCreneaux(profile).find((s) => s.day === dayIdOf(aujourdhui));
  const seanceFaite =
    !!creneau &&
    (seances || []).some((s) => s.date === aujourdhui && (s.slotId === creneau.id || s.maintenance));

  const decision = decisionRappelCreneau({
    maintenant,
    profile,
    creneauDuJour: creneau ? { ...creneau, minutes: minutesOf(creneau.time) } : null,
    seanceFaite,
    jourDejaRappele: charger(CLE_ETAT_CRENEAU, {}).firedDate,
    aujourdhui
  });
  if (!decision.rappeler) return decision;

  const montre = montrer({
    titre: RAPPEL_CRENEAU.titre,
    message: messageCreneau(slotDayLabel(creneau.day), creneau.time),
    tag: RAPPEL_CRENEAU.tag,
    afficherToast
  });
  if (!montre) return { ...decision, rappeler: false, raison: "affichage impossible pour l'instant" };

  enregistrer(CLE_ETAT_CRENEAU, { firedDate: aujourdhui });
  return { ...decision, montre: true };
}
