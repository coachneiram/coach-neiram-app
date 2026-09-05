/**
 * Declenchement des alertes coach.
 *
 * Contrairement aux rappels client, ces alertes ne tournent pas sur
 * minuteur : elles sont reevaluees quand les seances changent. Les
 * relancer chaque minute reviendrait a relire la meme situation.
 *
 * Elles ne partent que si la synchro coach est configuree pour ce client
 * (coaching en ligne). En presentiel, le coach voit son client.
 */

import { charger, enregistrer } from "./stockage.js";
import { CLES_ANNEXES } from "./stockage.js";
import { envoyerEvenement, synchroActive } from "./synchro-coach.js";
import { decalagesRecents, manquesRecents, tauxRespect } from "./creneaux.js";
import { getWeekKey, normaliserCreneaux, slotDayLabel } from "./semaine.js";
import { todayISO } from "./dates.js";
import {
  TOAST_ALERTE_DECALAGES,
  TOAST_ALERTE_MANQUES,
  decisionAlerteDecalages,
  decisionAlerteManques,
  decisionResumeHebdo,
  manquesAvecMotifs,
  messageAlerteDecalages,
  messageAlerteManques,
  messageResumeHebdo
} from "./alertes-coach.js";

/** Nombre de semaines glissantes pour le taux de respect envoye au coach. */
const SEMAINES_RESUME = 4;

/**
 * Evalue les trois alertes. Renvoie ce qui a ete decide, pour les tests.
 *
 * L'etat n'est ecrit qu'apres une remise effective (delivered) : une
 * alerte qui n'a pas pu partir doit repartir au prochain passage plutot
 * que d'etre marquee comme traitee.
 */
export async function verifierAlertesCoach({
  profile,
  seances,
  justifications,
  afficherToast,
  maintenant = new Date(),
  aujourdhui = todayISO(),
  envoyer = envoyerEvenement
}) {
  if (!synchroActive(profile)) return { alertes: [], raison: "synchro coach inactive" };

  const creneaux = normaliserCreneaux(profile);
  if (!creneaux.length) return { alertes: [], raison: "aucun creneau au profil" };

  const resultats = [];

  // 1. Creneaux manques sur 14 jours.
  const manques = manquesRecents(creneaux, seances, aujourdhui);
  const dManques = decisionAlerteManques({
    maintenant,
    manques,
    etat: charger(CLES_ANNEXES.alerteCoach, {})
  });
  if (dManques.alerter) {
    const detailles = manquesAvecMotifs(manques, creneaux, justifications, slotDayLabel);
    const remis = await envoyer(profile, {
      type: "alerte_seances_manquees",
      weekKey: getWeekKey(aujourdhui),
      nbManquees: manques.length,
      nbJustifiees: detailles.filter((m) => m.motif).length,
      creneauxManques: detailles,
      message: messageAlerteManques(manques.length)
    });
    enregistrer(CLES_ANNEXES.alerteCoach, {
      signature: dManques.signature,
      lastAt: maintenant.toISOString(),
      delivered: remis
    });
    if (remis && afficherToast) afficherToast(TOAST_ALERTE_MANQUES);
    resultats.push({ type: "alerte_seances_manquees", remis });
  }

  // 2. Creneaux decales ou rattrapes sur 4 semaines.
  const decalages = decalagesRecents(creneaux, seances, aujourdhui);
  const dDecalages = decisionAlerteDecalages({
    maintenant,
    decalages,
    etat: charger(CLES_ANNEXES.alerteCreneaux, {})
  });
  if (dDecalages.alerter) {
    const remis = await envoyer(profile, {
      type: "alerte_decalages",
      weekKey: getWeekKey(aujourdhui),
      nbDecalages: decalages.length,
      creneauxDecales: decalages,
      message: messageAlerteDecalages(decalages.length)
    });
    enregistrer(CLES_ANNEXES.alerteCreneaux, {
      signature: dDecalages.signature,
      lastAt: maintenant.toISOString(),
      delivered: remis
    });
    if (remis && afficherToast) afficherToast(TOAST_ALERTE_DECALAGES);
    resultats.push({ type: "alerte_decalages", remis });
  }

  // 3. Resume hebdomadaire, silencieux cote client.
  const cleSemaine = getWeekKey(aujourdhui);
  const taux = tauxRespect(creneaux, seances, SEMAINES_RESUME, aujourdhui);
  const dResume = decisionResumeHebdo({
    cleSemaine,
    tauxRespect: taux,
    etat: charger(CLES_ANNEXES.bilanHebdo, {})
  });
  if (dResume.envoyer) {
    const remis = await envoyer(profile, {
      type: "resume_hebdo",
      weekKey: cleSemaine,
      honored: taux.honored,
      resolved: taux.resolved,
      missed: taux.missed,
      shifted: taux.shifted,
      pct: taux.pct,
      message: messageResumeHebdo(taux.pct)
    });
    // Contrairement aux deux alertes, l'etat n'est ecrit QUE si la remise
    // a reussi : un resume perdu doit repartir la semaine suivante.
    if (remis) enregistrer(CLES_ANNEXES.bilanHebdo, { lastWeekKey: cleSemaine });
    resultats.push({ type: "resume_hebdo", remis });
  }

  return { alertes: resultats };
}
