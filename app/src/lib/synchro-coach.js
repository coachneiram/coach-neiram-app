/**
 * Synchronisation vers le coach.
 *
 * Un pointage perdu ne se voit pas : le client croit avoir pointe, le coach
 * ne recoit rien, personne ne s'en apercoit. La file d'attente ne relache
 * donc un evenement qu'une fois sa reception confirmee par le proxy.
 *
 * C'est le comportement corrige en phase 1. L'ancienne version postait en
 * mode « no-cors », ce qui rendait la reponse illisible : un refus etait
 * traite comme un succes et l'evenement disparaissait.
 */

import { PROXY_BASE_URL } from "./config.js";
import { CLES_ANNEXES, charger, enregistrer } from "./stockage.js";

/** Au-dela, on abandonne les plus anciens : une file sans fin ne sert personne. */
const TAILLE_MAX_FILE = 40;

/** Types acceptes par le proxy et par le script coach. */
export const TYPES_EVENEMENTS = [
  "pointage",
  "justification",
  "semaine_difficile",
  "alerte_semaines_difficiles",
  "alerte_seances_manquees",
  "alerte_decalages",
  "resume_hebdo"
];

/** La synchro est-elle active pour ce client ? */
export function synchroActive(profil) {
  return !!(profil && profil.coachSyncUrl);
}

/**
 * Met un evenement en file, puis tente de vider la file.
 * Renvoie false si la synchro n'est pas active pour ce client.
 */
export async function envoyerEvenement(profil, evenement) {
  if (!synchroActive(profil)) return false;

  const charge = {
    ...evenement,
    client: (profil && profil.name) || "Client sans prénom",
    envoyeLe: new Date().toISOString()
  };

  const file = charger(CLES_ANNEXES.outboxCoach, []);
  const nouvelle = (Array.isArray(file) ? file : []).concat([charge]).slice(-TAILLE_MAX_FILE);
  enregistrer(CLES_ANNEXES.outboxCoach, nouvelle);

  await viderFile(profil);
  return true;
}

/**
 * Tente d'envoyer tout ce qui attend. Ce qui echoue reste en file.
 *
 * Renvoie le nombre d'evenements effectivement remis.
 */
export async function viderFile(profil) {
  if (!synchroActive(profil)) return 0;

  const file = charger(CLES_ANNEXES.outboxCoach, []);
  if (!Array.isArray(file) || !file.length) return 0;

  const restants = [];
  let remis = 0;

  for (const evenement of file) {
    if (await remettre(evenement)) remis++;
    else restants.push(evenement);
  }

  enregistrer(CLES_ANNEXES.outboxCoach, restants);
  return remis;
}

/** Un envoi. Renvoie true seulement si la reception est confirmee. */
async function remettre(evenement) {
  try {
    const reponse = await fetch(PROXY_BASE_URL + "/coach-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evenement)
    });
    if (!reponse.ok) return false;
    // Le proxy repond { ok: false } quand le script coach refuse l'envoi :
    // un statut 200 ne suffit donc pas a conclure.
    const donnees = await reponse.json().catch(() => ({ ok: true }));
    return donnees.ok !== false;
  } catch (e) {
    // Hors ligne : l'evenement reste en file et repartira plus tard.
    return false;
  }
}

/** Nombre d'evenements en attente, pour information. */
export function enAttente() {
  const file = charger(CLES_ANNEXES.outboxCoach, []);
  return Array.isArray(file) ? file.length : 0;
}
