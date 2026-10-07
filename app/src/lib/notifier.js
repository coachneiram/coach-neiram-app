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
    afficherNotification(titre, { body: message, tag });
    return true;
  }

  afficherToast(message);
  return true;
}

/**
 * Montre une notification systeme. Rend une promesse : true si elle a ete
 * remise au telephone.
 *
 * Correctif du 7 octobre 2026. Les rappels passaient par
 * « new Notification() », que Chrome sur Android refuse toujours
 * (« Illegal constructor ») et qu'une application installee sur l'ecran
 * d'accueil d'un iPhone n'accepte pas non plus : sur telephone, aucun
 * rappel en arriere-plan ne s'affichait. Le service worker, lui, sait
 * notifier partout ; le constructeur ne reste qu'en repli (ordinateur,
 * premiere ouverture avant l'installation du service worker).
 */
export async function afficherNotification(titre, options = {}, env = globalThis) {
  const sw = env.navigator && env.navigator.serviceWorker;
  try {
    const enregistrement = sw && typeof sw.getRegistration === "function" ? await sw.getRegistration() : null;
    if (enregistrement && typeof enregistrement.showNotification === "function") {
      await enregistrement.showNotification(titre, { icon: "icon-192.png", badge: "icon-192.png", ...options });
      return true;
    }
  } catch (e) {
    // On tente le constructeur ci-dessous.
  }
  try {
    const n = new env.Notification(titre, options);
    n.onclick = () => {
      env.focus && env.focus();
      n.close();
    };
    return true;
  } catch (e) {
    return false;
  }
}
