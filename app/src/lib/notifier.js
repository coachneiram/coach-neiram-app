/**
 * Afficher un rappel : notification systeme ou banniere dans l'app.
 *
 * La regle d'origine, conservee telle quelle : si l'application est au
 * premier plan, une banniere suffit et vaut mieux qu'une notification
 * (le client regarde deja l'ecran). Si elle est en arriere-plan, il faut
 * une notification systeme — et si le navigateur ne l'autorise pas, on
 * ne montre RIEN plutot que d'empiler des bannieres que personne ne verra
 * et qui auront disparu au retour.
 */

/** @returns true si le rappel a effectivement ete montre. */
export function notifier({ titre, message, tag, afficherToast }) {
  const peutNotifier = typeof Notification !== "undefined" && Notification.permission === "granted";
  const enArrierePlan = typeof document !== "undefined" && document.hidden;

  if (enArrierePlan && !peutNotifier) return false;

  if (enArrierePlan && peutNotifier) {
    try {
      const n = new Notification(titre, { body: message, tag });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      return true;
    } catch (e) {
      return false;
    }
  }

  afficherToast(message);
  return true;
}
