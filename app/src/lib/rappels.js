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
