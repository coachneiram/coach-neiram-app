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
import { creneauPourDate, enLigne, slotDayLabel } from "./semaine.js";

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

/**
 * Evenements qui decrivent un ETAT de la semaine : un nouvel envoi remplace
 * celui qui attend encore en file pour le meme client et la meme semaine,
 * au lieu de s'y ajouter. Les pointages et justifications, eux, sont des
 * faits distincts et s'accumulent.
 */
const REMPLACABLES = [
  "semaine_difficile",
  "alerte_semaines_difficiles",
  "alerte_seances_manquees",
  "alerte_decalages",
  "resume_hebdo"
];

/**
 * La synchro est-elle active pour ce client ?
 *
 * Activee d'office pour le coaching en ligne (4 octobre 2026) : le script
 * Google v2.1 et le secret du proxy sont en place. L'application ne connait
 * ni l'adresse du script ni le secret : elle poste au proxy, qui ajoute le
 * secret et transmet. L'ancien champ « lien de synchro » du profil reste
 * reconnu pour les clients qui l'avaient rempli.
 */
export function synchroActive(profil) {
  if (enTestLocal() && !synchroLocaleAutorisee()) return false;
  return !!profil && (enLigne(profil) || !!profil.coachSyncUrl);
}

/**
 * Application servie en local (tests de fumee, developpement) : rien ne
 * part vers le vrai proxy, donc rien n'arrive dans le classeur du coach.
 * Constate le 4 octobre 2026 : un test de fumee sans interception postait
 * de fausses alertes « Marien » en production a chaque passage de la CI.
 * Un test qui intercepte /coach-sync l'autorise explicitement avec
 * localStorage « cn_synchro_locale » = « 1 ».
 */
function enTestLocal() {
  try {
    return typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  } catch (e) {
    return false;
  }
}

function synchroLocaleAutorisee() {
  try {
    return globalThis.localStorage && globalThis.localStorage.getItem("cn_synchro_locale") === "1";
  } catch (e) {
    return false;
  }
}

/**
 * Met un evenement en file, puis tente de vider la file.
 * Renvoie false si la synchro n'est pas active pour ce client.
 */
export async function envoyerEvenement(profil, evenement) {
  if (!synchroActive(profil)) return false;

  const charge = {
    ...evenement,
    client: (profil && (profil.name || profil.firstName)) || "Client sans prénom",
    envoyeLe: new Date().toISOString()
  };

  const file = charger(CLES_ANNEXES.outboxCoach, []);
  const remplace = (e) =>
    REMPLACABLES.includes(charge.type) &&
    e && e.type === charge.type && e.weekKey === charge.weekKey && e.client === charge.client;
  const nouvelle = (Array.isArray(file) ? file : [])
    .filter((e) => !remplace(e))
    .concat([charge])
    .slice(-TAILLE_MAX_FILE);
  enregistrer(CLES_ANNEXES.outboxCoach, nouvelle);

  await viderFile(profil);
  return true;
}

/**
 * Tente d'envoyer tout ce qui attend. Ce qui echoue reste en file.
 *
 * Renvoie le nombre d'evenements effectivement remis.
 */
export function viderFile(profil) {
  // Un seul vidage a la fois : deux vidages simultanes (ouverture de
  // l'application et alerte, par exemple) enverraient deux fois le meme
  // pointage au coach.
  const suite = vidageEnCours.then(() => viderFileMaintenant(profil));
  vidageEnCours = suite.catch(() => 0);
  return suite;
}

let vidageEnCours = Promise.resolve(0);

async function viderFileMaintenant(profil) {
  if (!synchroActive(profil)) return 0;

  const file = charger(CLES_ANNEXES.outboxCoach, []);
  if (!Array.isArray(file) || !file.length) return 0;

  const remisCles = [];
  for (const evenement of file) {
    if (await remettre(evenement)) remisCles.push(JSON.stringify(evenement));
  }

  // On relit la file : un evenement ajoute pendant les envois ne doit pas
  // etre efface par la reecriture. Seuls les evenements remis la quittent.
  const aRetirer = {};
  for (const cle of remisCles) aRetirer[cle] = (aRetirer[cle] || 0) + 1;
  const actuelle = charger(CLES_ANNEXES.outboxCoach, []);
  const restants = (Array.isArray(actuelle) ? actuelle : []).filter((evenement) => {
    const cle = JSON.stringify(evenement);
    if (aRetirer[cle] > 0) {
      aRetirer[cle] -= 1;
      return false;
    }
    return true;
  });
  enregistrer(CLES_ANNEXES.outboxCoach, restants);
  return remisCles.length;
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

/**
 * Pointage a envoyer au coach quand un client en ligne enregistre une
 * seance depuis le constructeur (demande du coach du 4 octobre 2026 : ces
 * seances comptaient deja comme creneau tenu dans l'application, mais
 * n'apparaissaient jamais dans le Journal du coach). Null hors coaching en
 * ligne. L'heure reelle n'est connue que pour une seance du jour.
 */
export function pointageDepuisSeance(profil, seance, { aujourdhui, heure } = {}) {
  if (!enLigne(profil) || !seance || !seance.date) return null;
  const creneau = creneauPourDate(profil, seance.date);
  return {
    type: "pointage",
    date: seance.date,
    creneau: creneau ? slotDayLabel(creneau.day) + (creneau.time ? " " + creneau.time : "") : "hors créneau",
    lieu: creneau ? creneau.place || "" : "",
    heureReelle: seance.startTime || (seance.date === aujourdhui && heure ? heure : ""),
    dureeMin: seance.durationMin,
    rpe: seance.rpe,
    note: String(seance.notes || "").trim()
  };
}

/** Nombre d'evenements en attente, pour information. */
export function enAttente() {
  const file = charger(CLES_ANNEXES.outboxCoach, []);
  return Array.isArray(file) ? file.length : 0;
}
