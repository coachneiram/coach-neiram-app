/**
 * Les alertes envoyees au coach, sans passer par le client.
 *
 * Portage fidele des trois effets d'alerte (index.html 4770-4900).
 *
 * REGRESSION DE LA BASCULE : aucun des trois n'avait ete porte. Le coach
 * ne recevait donc plus rien — ni les creneaux manques, ni la derive
 * d'horaire, ni le resume hebdomadaire. Il fallait qu'il s'en apercoive
 * tout seul.
 *
 * Ces alertes existent pour une raison precise : un client qui decroche
 * ne le dit pas. Il decale, puis il manque, puis il s'excuse, puis il
 * part. Les deux premieres alertes attrapent le decrochage avant
 * l'abandon — d'ou des seuils bas (2 creneaux manques, 3 decalages) et
 * un delai de carence de 7 jours pour ne pas harceler le coach.
 *
 * La signature evite le doublon : tant que ce sont les MEMES creneaux qui
 * posent probleme, on ne redit rien. Un nouveau creneau manque change la
 * signature et relance l'alerte.
 */

import { SEUIL_ALERTE_MANQUES } from "./creneaux.js";

/** Au-dela, le creneau derive : trois decalages en quatre semaines. */
export const SEUIL_ALERTE_DECALAGES = 3;

/** Delai de carence entre deux alertes de meme nature, en jours. */
export const CARENCE_ALERTE_JOURS = 7;

const MS_PAR_JOUR = 864e5;

/** Vrai si la carence est ecoulee depuis le dernier envoi. */
function carenceEcoulee(etat, maintenant) {
  const dernier = etat && etat.lastAt ? new Date(etat.lastAt).getTime() : 0;
  return maintenant.getTime() - dernier >= CARENCE_ALERTE_JOURS * MS_PAR_JOUR;
}

/**
 * Alerte « creneaux manques » : 2 sur les 14 derniers jours.
 *
 * Le message au coach porte les motifs quand le client en a donne un :
 * « manque 2 fois » et « manque 2 fois, enfant malade » n'appellent pas
 * le meme coup de fil.
 */
export function decisionAlerteManques({ maintenant, manques, etat }) {
  const non = (raison) => ({ alerter: false, raison });
  if (manques.length < SEUIL_ALERTE_MANQUES) return non("sous le seuil");
  if (!carenceEcoulee(etat, maintenant)) return non("carence non ecoulee");

  const signature = manques.map((m) => m.date).join("|");
  if (etat && etat.signature === signature) return non("deja signale pour ces creneaux");

  return { alerter: true, raison: "a signaler", signature };
}

export const messageAlerteManques = (nb) => nb + " créneaux manqués sur les 14 derniers jours.";

export const TOAST_ALERTE_MANQUES =
  "Ton coach a été prévenu que deux créneaux ont été manqués. Il va revenir vers toi pour ajuster.";

/** Alerte « decalages » : 3 creneaux decales ou rattrapes sur 4 semaines. */
export function decisionAlerteDecalages({ maintenant, decalages, etat }) {
  const non = (raison) => ({ alerter: false, raison });
  if (decalages.length < SEUIL_ALERTE_DECALAGES) return non("sous le seuil");
  if (!carenceEcoulee(etat, maintenant)) return non("carence non ecoulee");

  const signature = decalages.map((m) => m.date).join("|");
  if (etat && etat.signature === signature) return non("deja signale pour ces creneaux");

  return { alerter: true, raison: "a signaler", signature };
}

export const messageAlerteDecalages = (nb) =>
  nb + " créneaux décalés ou rattrapés sur les 4 dernières semaines.";

export const TOAST_ALERTE_DECALAGES =
  "Ton coach a été prévenu que ton créneau dérive depuis plusieurs semaines.";

/**
 * Resume hebdomadaire envoye au coach : une fois par semaine, sans toast.
 *
 * Contrairement aux deux alertes, celui-ci est silencieux cote client :
 * c'est une information de suivi, pas un signalement.
 */
export function decisionResumeHebdo({ cleSemaine, tauxRespect, etat }) {
  const non = (raison) => ({ envoyer: false, raison });
  if (etat && etat.lastWeekKey === cleSemaine) return non("deja envoye cette semaine");
  // « tranches » est le nom rendu par tauxRespect() ; l'original appelait ce
  // meme compte « resolved ». Lire l'ancien nom ici donnait undefined, donc
  // un garde qui ne se declenchait jamais : un resume partait meme sans
  // aucun creneau tranche, ce que l'original n'aurait pas fait.
  if (!tauxRespect || tauxRespect.tranches === 0) return non("aucun creneau tranche");
  return { envoyer: true, raison: "a envoyer" };
}

export const messageResumeHebdo = (pct) => "Taux de respect sur 4 semaines : " + pct + "%.";

/** Le motif saisi par le client, attache a chaque creneau manque. */
export function manquesAvecMotifs(manques, creneaux, justifications, libelleJour) {
  return manques.map((m) => {
    const creneau = creneaux.find((sl) => libelleJour(sl.day) === m.jour && (sl.time || "") === m.heure);
    const r = creneau ? (justifications || {})[creneau.id + "|" + m.date] : null;
    return { ...m, motif: r ? r.label : "", precision: r ? r.detail : "" };
  });
}

/**
 * Alerte « sommeil et stress » (24 octobre 2026, demande du coach) :
 * nuits difficiles (12 nuits de qualite 1 ou 2 sur 28 jours) ou stress
 * moyen d'au moins 8/10 sur 14 jours (lib/sommeil.js, signauxAlerte).
 *
 * Un meme episode n'est signale qu'une fois ; s'il dure, on le redit au
 * bout de 28 jours. Un nouveau signal (le stress apres les nuits) change la
 * signature et part tout de suite. Quand plus rien n'est actif, l'etat se
 * remet a zero : l'episode suivant sera signale.
 */
export const RAPPEL_ALERTE_SOMMEIL_JOURS = 28;

export function decisionAlerteSommeilStress({ maintenant, signaux, etat }) {
  const non = (raison, reinitialiser = false) => ({ alerter: false, raison, reinitialiser });
  const actifs = ["nuitsDifficiles", "stressDurable"].filter((k) => signaux && signaux[k]);
  if (!actifs.length) return non("aucun signal", !!(etat && etat.signature));
  const signature = actifs.join("|");
  if (etat && etat.signature === signature && etat.delivered) {
    const dernier = etat.lastAt ? new Date(etat.lastAt).getTime() : 0;
    if (maintenant.getTime() - dernier < RAPPEL_ALERTE_SOMMEIL_JOURS * MS_PAR_JOUR) return non("deja signale");
  }
  return { alerter: true, raison: "a signaler", signature };
}

export function messageAlerteSommeilStress(signaux) {
  const morceaux = [];
  if (signaux.nuitsDifficiles) morceaux.push("Nuits difficiles : au moins 3 par semaine depuis 4 semaines (qualité notée 1 ou 2 sur 5).");
  if (signaux.stressDurable) morceaux.push("Stress très élevé : au moins 8/10 en moyenne sur les 14 derniers jours.");
  return morceaux.join(" ");
}

export const TOAST_ALERTE_SOMMEIL =
  "Ton coach a été prévenu de tes nuits ou de ton stress difficiles. Il va revenir vers toi.";
