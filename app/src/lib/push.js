/**
 * Rappels push : le rappel de creneau et celui du bilan du dimanche
 * arrivent meme application fermee (7 octobre 2026).
 *
 * L'application calcule les rappels des 7 prochains jours sur le
 * telephone, et n'envoie au Worker que leur heure et leur texte, avec
 * l'adresse de notification du telephone. Le Worker les envoie a l'heure
 * dite (voir worker/coach-neiram-proxy.js, « Notifications push »).
 *
 * Les deux rappels reprennent EXACTEMENT les textes et les etiquettes
 * (tag) des rappels de l'application ouverte : si les deux partent, le
 * telephone remplace l'un par l'autre au lieu d'en afficher deux.
 */

import { PROXY_BASE_URL } from "./config.js";
import { RAPPEL_CRENEAU, RAPPEL_DIMANCHE, messageCreneau } from "./rappels.js";
import { addDays, toLocalISODate } from "./dates.js";
import { dayIdOf, getWeekKey, minutesOf, normaliserCreneaux, slotDayLabel } from "./semaine.js";

export const CLE_PUSH_ACTIF = "cn_push_actif";
export const CLE_PUSH_PLANNING = "cn_push_planning";
export const JOURS_PLANNING = 7;
/** Heure du rappel push du dimanche : le soir, quand le bilan se prepare. */
export const HEURE_PUSH_DIMANCHE = 17;
/** Au-dela, le planning est renvoye meme inchange : le serveur l'aurait epuise. */
const RENVOI_MAX_MS = 24 * 3600 * 1000;

/** Date locale (AAAA-MM-JJ) + minutes depuis minuit → instant en millisecondes. */
function instantLocal(dateISO, minutes) {
  const [a, m, j] = dateISO.split("-").map(Number);
  return new Date(a, m - 1, j, Math.floor(minutes / 60), minutes % 60, 0, 0).getTime();
}

/**
 * Les rappels des 7 prochains jours, du plus proche au plus lointain.
 *
 *   - creneau : 1 h avant chaque creneau, sauf si la seance du jour est
 *     deja notee (meme regle que le rappel de l'application ouverte) ;
 *   - dimanche : a 17 h, sauf si le bilan de cette semaine est deja parti.
 */
export function planningRappels({ profil, seances = [], bilanEnvoye = null, maintenant = new Date() }) {
  if (!profil) return [];
  const rappels = [];
  const t = maintenant.getTime();
  const aujourdhui = toLocalISODate(maintenant);
  const creneaux = normaliserCreneaux(profil);

  for (let k = 0; k <= JOURS_PLANNING; k++) {
    const date = addDays(aujourdhui, k);

    if (profil.creneauReminderEnabled !== false) {
      const creneau = creneaux.find((s) => s.day === dayIdOf(date));
      const minutes = creneau ? minutesOf(creneau.time) : null;
      if (minutes != null) {
        const faite = (seances || []).some((s) => s.date === date && (s.slotId === creneau.id || s.maintenance));
        const quand = instantLocal(date, Math.max(0, minutes - RAPPEL_CRENEAU.avanceMinutes));
        if (!faite && quand > t) {
          rappels.push({
            quand,
            titre: RAPPEL_CRENEAU.titre,
            texte: messageCreneau(slotDayLabel(creneau.day), creneau.time),
            tag: RAPPEL_CRENEAU.tag
          });
        }
      }
    }

    if (profil.reportReminderEnabled !== false && dayIdOf(date) === "sun") {
      const quand = instantLocal(date, HEURE_PUSH_DIMANCHE * 60);
      if (quand > t && bilanEnvoye !== getWeekKey(date)) {
        rappels.push({ quand, titre: RAPPEL_DIMANCHE.titre, texte: RAPPEL_DIMANCHE.message, tag: RAPPEL_DIMANCHE.tag });
      }
    }
  }
  return rappels.sort((a, b) => a.quand - b.quand);
}

/** Cle publique VAPID (base64url) → octets, pour pushManager.subscribe. */
export function cleEnOctets(base64url) {
  const norme = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norme + "===".slice((norme.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * En local (tests de fumee), rien ne part vers le vrai serveur sans
 * autorisation explicite : meme garde-fou que la synchro coach.
 */
export function pushAutorise(env = globalThis) {
  try {
    const hote = env.location && env.location.hostname;
    if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hote || "")) return true;
    return env.localStorage && env.localStorage.getItem("cn_push_locale") === "1";
  } catch (e) {
    return false;
  }
}

/** Le telephone sait-il recevoir des notifications push ? */
export function pushPossible(env = globalThis) {
  const nav = env.navigator;
  return !!(nav && nav.serviceWorker && "PushManager" in env && typeof env.Notification !== "undefined");
}

async function appel(chemin, corps, env = globalThis) {
  const r = await env.fetch(PROXY_BASE_URL + chemin, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps || {})
  });
  let donnees = null;
  try {
    donnees = await r.json();
  } catch (e) {
    donnees = null;
  }
  return { statut: r.status, donnees };
}

/** Le serveur de rappels est-il en place ? (sinon l'option reste cachee) */
export async function serveurPushPret(env = globalThis) {
  if (!pushAutorise(env) || !pushPossible(env)) return false;
  try {
    const { statut, donnees } = await appel("/push/cle", {}, env);
    return statut === 200 && !!(donnees && donnees.ok && donnees.cle);
  } catch (e) {
    return false;
  }
}

export const pushActif = (env = globalThis) => {
  try {
    return env.localStorage.getItem(CLE_PUSH_ACTIF) === "1";
  } catch (e) {
    return false;
  }
};

/**
 * Envoie le planning au serveur, s'il a change ou date de plus d'un jour.
 * Rend true si le serveur l'a accepte (ou s'il n'y avait rien a renvoyer).
 */
export async function synchroniserPush({ profil, seances, bilanEnvoye, maintenant = new Date(), env = globalThis }) {
  if (!pushActif(env) || !pushAutorise(env) || !pushPossible(env)) return false;
  try {
    const reg = await env.navigator.serviceWorker.getRegistration();
    const abonnement = reg && (await reg.pushManager.getSubscription());
    if (!abonnement) return false;
    const rappels = planningRappels({ profil, seances, bilanEnvoye, maintenant });
    const empreinte = JSON.stringify({ e: abonnement.endpoint, r: rappels.map((r) => [r.quand, r.tag]) });
    let precedent = null;
    try {
      precedent = JSON.parse(env.localStorage.getItem(CLE_PUSH_PLANNING) || "null");
    } catch (e) {
      precedent = null;
    }
    if (precedent && precedent.empreinte === empreinte && maintenant.getTime() - precedent.le < RENVOI_MAX_MS) return true;
    const { statut } = await appel("/push/abonner", { abonnement: abonnement.toJSON(), rappels }, env);
    if (statut !== 200) return false;
    env.localStorage.setItem(CLE_PUSH_PLANNING, JSON.stringify({ empreinte, le: maintenant.getTime() }));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Active les rappels app fermee. Rend "actif", "refuse" (autorisation
 * non donnee), "indisponible" (telephone ou serveur incapable) ou "erreur".
 */
export async function activerPush({ profil, seances, bilanEnvoye, env = globalThis }) {
  if (!pushAutorise(env) || !pushPossible(env)) return "indisponible";
  let permission = env.Notification.permission;
  if (permission === "default") {
    try {
      permission = await env.Notification.requestPermission();
    } catch (e) {
      permission = env.Notification.permission;
    }
  }
  if (permission !== "granted") return "refuse";
  try {
    const { statut, donnees } = await appel("/push/cle", {}, env);
    if (statut !== 200 || !donnees || !donnees.cle) return "indisponible";
    const reg = await env.navigator.serviceWorker.ready;
    let abonnement = await reg.pushManager.getSubscription();
    if (!abonnement) {
      abonnement = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleEnOctets(donnees.cle) });
    }
    env.localStorage.setItem(CLE_PUSH_ACTIF, "1");
    env.localStorage.removeItem(CLE_PUSH_PLANNING);
    const ok = await synchroniserPush({ profil, seances, bilanEnvoye, env });
    return ok ? "actif" : "erreur";
  } catch (e) {
    return "erreur";
  }
}

/** Coupe les rappels app fermee et oublie le telephone cote serveur. */
export async function desactiverPush(env = globalThis) {
  try {
    env.localStorage.removeItem(CLE_PUSH_ACTIF);
    env.localStorage.removeItem(CLE_PUSH_PLANNING);
  } catch (e) {
    // Stockage refuse : rien a effacer.
  }
  try {
    const reg = env.navigator.serviceWorker && (await env.navigator.serviceWorker.getRegistration());
    const abonnement = reg && (await reg.pushManager.getSubscription());
    if (!abonnement) return true;
    await appel("/push/desabonner", { endpoint: abonnement.endpoint }, env);
    await abonnement.unsubscribe();
    return true;
  } catch (e) {
    return false;
  }
}
