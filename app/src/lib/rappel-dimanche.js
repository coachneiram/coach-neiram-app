/**
 * Le minuteur du rappel du dimanche.
 *
 * Separe du hook React pour rester testable : on lui passe une horloge
 * et un afficheur, il rend une fonction a appeler chaque minute.
 */

import { charger, enregistrer } from "./stockage.js";
import { decisionRappelDimanche, RAPPEL_DIMANCHE } from "./rappels.js";
import { notifier } from "./notifier.js";

export const CLE_ETAT_DIMANCHE = "coach_sunday_state";
export const CLE_BILAN_ENVOYE = "coach_report_last_sent";

/** Note qu'un bilan vient d'etre envoye, pour ne plus le rappeler. */
export function marquerBilanEnvoye(cleSemaine) {
  enregistrer(CLE_BILAN_ENVOYE, cleSemaine);
}

/**
 * Un tour de verification. Renvoie la decision prise, pour les tests.
 *
 * L'etat n'est ecrit QU'APRES un affichage reussi : un rappel qu'on n'a
 * pas pu montrer (notification refusee, app en arriere-plan) doit
 * repasser au tour suivant, pas etre consomme dans le vide.
 */
export function verifierRappelDimanche({ profile, afficherToast, maintenant = new Date(), montrer = notifier }) {
  const decision = decisionRappelDimanche({
    maintenant,
    profile,
    semaineDejaVue: charger(CLE_ETAT_DIMANCHE, {}).firedWeekKey,
    semaineDejaEnvoyee: charger(CLE_BILAN_ENVOYE, null)
  });
  if (!decision.rappeler) return decision;

  const montre = montrer({
    titre: RAPPEL_DIMANCHE.titre,
    message: RAPPEL_DIMANCHE.message,
    tag: RAPPEL_DIMANCHE.tag,
    afficherToast
  });
  if (!montre) return { ...decision, rappeler: false, raison: "affichage impossible pour l'instant" };

  enregistrer(CLE_ETAT_DIMANCHE, { firedWeekKey: decision.cleSemaine });
  return { ...decision, montre: true };
}

/** Intervalle de verification, en millisecondes. */
export const PERIODE_VERIFICATION_MS = 60000;
