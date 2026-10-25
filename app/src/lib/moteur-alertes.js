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
import { enLigne, getWeekKey, normaliserCreneaux, slotDayLabel } from "./semaine.js";
import { decisionAlerteNutrition, decisionAlertesPoids } from "./alertes-smart.js";
import { stagnationPoidsSurveillee, variationPoidsSurveillee } from "./eligibilite-perte.js";
import { todayISO } from "./dates.js";
import { signauxAlerte } from "./sommeil.js";
import {
  TOAST_ALERTE_DECALAGES,
  TOAST_ALERTE_MANQUES,
  decisionAlerteDecalages,
  decisionAlerteManques,
  decisionAlerteSommeilStress,
  decisionResumeHebdo,
  manquesAvecMotifs,
  messageAlerteSommeilStress,
  TOAST_ALERTE_SOMMEIL,
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
export function verifierAlertesCoach(parametres) {
  // Une evaluation a la fois. L'ecran relance l'evaluation a chaque
  // changement de profil ou de seances ; sans cette file, une deuxieme
  // evaluation demarrait avant que la premiere ait note l'alerte comme
  // envoyee, et le coach recevait la meme alerte plusieurs fois (constate
  // le 4 octobre 2026 : 4 fois la meme en 25 secondes).
  const suite = evaluationEnCours.then(() => evaluerAlertes(parametres));
  evaluationEnCours = suite.catch(() => null);
  return suite;
}

let evaluationEnCours = Promise.resolve(null);

async function evaluerAlertes({
  profile,
  seances,
  justifications,
  journal,
  afficherToast,
  maintenant = new Date(),
  aujourdhui = todayISO(),
  envoyer = envoyerEvenement
}) {
  if (!synchroActive(profile)) return { alertes: [], raison: "synchro coach inactive" };

  const resultats = [];

  // 0. Sommeil et stress (24 octobre 2026) : ne depend pas des creneaux.
  if (Array.isArray(journal)) {
    const signaux = signauxAlerte(journal, aujourdhui);
    const etatSommeil = charger(CLES_ANNEXES.alerteSommeil, {});
    const dSommeil = decisionAlerteSommeilStress({ maintenant, signaux, etat: etatSommeil });
    if (dSommeil.reinitialiser) enregistrer(CLES_ANNEXES.alerteSommeil, {});
    if (dSommeil.alerter) {
      const remis = await envoyer(profile, {
        type: "alerte_sommeil_stress",
        weekKey: getWeekKey(aujourdhui),
        message: messageAlerteSommeilStress(signaux)
      });
      enregistrer(CLES_ANNEXES.alerteSommeil, {
        signature: dSommeil.signature,
        lastAt: maintenant.toISOString(),
        delivered: remis
      });
      if (remis && afficherToast) afficherToast(TOAST_ALERTE_SOMMEIL);
      resultats.push({ type: "alerte_sommeil_stress", remis });
    }
  }

  const creneaux = normaliserCreneaux(profile);
  if (!creneaux.length) return { alertes: resultats, raison: "aucun creneau au profil" };

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
      // Les CLES restent en anglais : c'est ce que le classeur du coach
      // attend depuis toujours. Ce sont les LECTURES qui etaient fausses —
      // tauxRespect() rend des noms francais, et lire taux.honored donnait
      // undefined. Le coach recevait donc un resume sans aucun chiffre.
      honored: taux.honores,
      resolved: taux.tranches,
      missed: taux.manques,
      shifted: taux.decales,
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

/* ------------------------------------------------------------------ */
/* Smart Coach (25 octobre 2026) : poids et nutrition                  */
/* ------------------------------------------------------------------ */

/**
 * Meme file que les autres alertes : une evaluation a la fois, pour qu'une
 * deuxieme ne parte pas avant que la premiere ait note son envoi.
 */
function enFile(fn) {
  const suite = evaluationEnCours.then(fn);
  evaluationEnCours = suite.catch(() => null);
  return suite;
}

/** Coaching en ligne avec synchro active : sinon, rien ne part. */
const smartActif = (profile) => enLigne(profile) && synchroActive(profile);

/**
 * Alertes de poids, a l'enregistrement d'une pesee : variation brutale
 * (attention, sauf grossesse ou allaitement) et stagnation en phase de
 * perte (info). Au plus une de
 * chaque sorte tous les 14 jours (CLES_ANNEXES.alertePoids).
 */
export function verifierAlertesPoids({
  profile,
  pesees,
  surveillerStagnation = stagnationPoidsSurveillee,
  surveillerVariation = variationPoidsSurveillee,
  maintenant = new Date(),
  aujourdhui = todayISO(),
  envoyer = envoyerEvenement
}) {
  return enFile(async () => {
    if (!smartActif(profile)) return { alertes: [], raison: "pas en coaching en ligne" };
    const etat = charger(CLES_ANNEXES.alertePoids, {}) || {};
    const aEnvoyer = decisionAlertesPoids({
      pesees,
      stagnationSurveillee: surveillerStagnation({ profil: profile }),
      variationSurveillee: surveillerVariation({ profil: profile }),
      aujourdhui,
      maintenant,
      etat
    });
    const resultats = [];
    for (const a of aEnvoyer) {
      const remis = await envoyer(profile, {
        type: "alerte_poids",
        sousType: a.sousType,
        niveau: a.niveau,
        weekKey: getWeekKey(aujourdhui),
        message: a.message
      });
      if (remis) {
        const actuel = charger(CLES_ANNEXES.alertePoids, {}) || {};
        enregistrer(CLES_ANNEXES.alertePoids, { ...actuel, [a.sousType]: { lastAt: maintenant.toISOString() } });
      }
      resultats.push({ type: "alerte_poids", sousType: a.sousType, niveau: a.niveau, remis });
    }
    return { alertes: resultats };
  });
}

/**
 * Alerte nutrition, a l'ouverture, au plus une fois par jour : 5 jours ou
 * plus hors cible sur les 7 derniers jours complets (CLES_ANNEXES.alerteNutrition).
 */
export function verifierAlerteNutrition({
  profile,
  repas,
  cibles,
  maintenant = new Date(),
  aujourdhui = todayISO(),
  envoyer = envoyerEvenement
}) {
  return enFile(async () => {
    if (!smartActif(profile)) return { alertes: [], raison: "pas en coaching en ligne" };
    const etat = charger(CLES_ANNEXES.alerteNutrition, {}) || {};
    const d = decisionAlerteNutrition({ repas, cibles, aujourdhui, maintenant, etat });
    if (!d.verifier) return { alertes: [], raison: d.raison };
    let lastAt = etat.lastAt || null;
    const resultats = [];
    if (d.alerter) {
      const remis = await envoyer(profile, {
        type: "alerte_nutrition",
        niveau: "attention",
        weekKey: getWeekKey(aujourdhui),
        message: d.message
      });
      if (remis) lastAt = maintenant.toISOString();
      resultats.push({ type: "alerte_nutrition", remis });
    }
    enregistrer(CLES_ANNEXES.alerteNutrition, { jour: aujourdhui, lastAt });
    return { alertes: resultats, raison: d.raison };
  });
}
