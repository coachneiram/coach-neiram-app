/**
 * Présence du client, pour l'alerte d'inactivité (Smart Coach, 25 octobre 2026).
 *
 * L'application ne peut pas signaler elle-même un client qui ne l'ouvre
 * plus. Elle dit donc au Worker, au plus une fois par jour et à
 * l'ouverture, « je suis là, et ma dernière saisie date de tel jour ». Le
 * Worker garde ces deux informations, et sa tâche planifiée du matin
 * prévient le coach quand la dernière SAISIE vieillit (4 jours : attention ;
 * 7 jours : critique). Ouvrir l'appli sans rien noter ne remet pas le
 * compteur à zéro (décision du coach du 25 octobre 2026).
 *
 * Ce qui part : une date (AAAA-MM-JJ), rien d'autre. Ni repas, ni poids,
 * ni séance. Coaching en ligne seulement, et seulement si le client a
 * activé son code (sans jeton, le Worker refuserait).
 */

import { PROXY_BASE_URL } from "./config.js";
import { enTetesAcces } from "./acces.js";
import { CLES_ANNEXES, charger, enregistrer } from "./stockage.js";
import { enLigne } from "./semaine.js";
import { synchroActive } from "./synchro-coach.js";
import { num } from "./dates.js";

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Une entrée du journal du jour compte si le client y a écrit quelque chose. */
function journalRempli(f) {
  if (!f) return false;
  return Object.entries(f).some(([k, v]) => {
    if (k === "id" || k === "date") return false;
    if (v === null || v === undefined || v === "" || v === false) return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
}

/**
 * Date de la dernière saisie réelle : repas, séance (activités comprises,
 * ce sont des séances), pesée, journal du jour. Les dates futures sont
 * ignorées. Rend null si le client n'a encore rien saisi.
 */
export function derniereSaisie({ repas = [], seances = [], pesees = [], journal = [], aujourdhui }) {
  const dates = [];
  const ajouter = (d) => {
    if (typeof d === "string" && DATE_ISO.test(d) && (!aujourdhui || d <= aujourdhui)) dates.push(d);
  };
  for (const r of repas || []) if (r) ajouter(r.date);
  for (const s of seances || []) if (s) ajouter(s.date);
  for (const p of pesees || []) if (p && num(p.weightKg) > 0) ajouter(p.date);
  for (const f of journal || []) if (journalRempli(f)) ajouter(f.date);
  return dates.length ? dates.sort().pop() : null;
}

/** Faut-il envoyer la présence aujourd'hui ? */
export function decisionPresence({ profil, etat, aujourdhui }) {
  if (!enLigne(profil)) return { envoyer: false, raison: "pas en coaching en ligne" };
  if (etat && etat.jour === aujourdhui) return { envoyer: false, raison: "deja envoyee aujourd'hui" };
  return { envoyer: true, raison: "a envoyer" };
}

/**
 * Envoie la présence si besoin. Le jour n'est noté qu'après un envoi
 * accepté : un envoi raté (hors ligne) repartira à la prochaine ouverture.
 * Rend true si la présence est partie et a été acceptée.
 */
export function envoyerPresence(parametres) {
  // Un envoi a la fois : deux ouvertures rapprochees (ou un ecran qui se
  // redessine) n'envoient pas deux presences le meme jour.
  if (!envoiEnCours) envoiEnCours = envoyerMaintenant(parametres).finally(() => (envoiEnCours = null));
  return envoiEnCours;
}

let envoiEnCours = null;

async function envoyerMaintenant({ profil, donnees, aujourdhui, envFetch = globalThis.fetch, enTetes = enTetesAcces() }) {
  const d = decisionPresence({ profil, etat: charger(CLES_ANNEXES.presence, {}), aujourdhui });
  if (!d.envoyer) return false;
  // Application servie en local (fumée) : rien ne part, sauf autorisation
  // explicite (même garde que la synchro coach).
  if (!synchroActive(profil)) return false;
  if (!enTetes || !enTetes.Authorization) return false;
  try {
    const r = await envFetch(PROXY_BASE_URL + "/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...enTetes },
      body: JSON.stringify({ derniereSaisie: derniereSaisie({ ...donnees, aujourdhui }) })
    });
    if (!r.ok) return false;
    const corps = await r.json().catch(() => ({}));
    if (corps && corps.ok === false) return false;
    enregistrer(CLES_ANNEXES.presence, { jour: aujourdhui });
    return true;
  } catch (e) {
    return false;
  }
}
