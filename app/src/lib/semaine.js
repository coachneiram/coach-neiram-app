/**
 * Semaines et creneaux d'entrainement.
 *
 * Repris de index.html : getMonday (ligne 387), getWeekKey (394),
 * WEEK_DAYS (~2892), et les utilitaires de creneaux qui suivent.
 *
 * Convention importante et conservee telle quelle : la semaine commence le
 * LUNDI, pas le dimanche comme le fait getDay() en JavaScript. Un bilan
 * hebdomadaire qui basculerait le dimanche soir couperait le week-end en
 * deux et fausserait tous les comptages de seances.
 */

import { addDays, parseISO, toLocalISODate } from "./dates.js";

export const JOURS_SEMAINE = [
  { id: "mon", short: "L", label: "Lundi" },
  { id: "tue", short: "M", label: "Mardi" },
  { id: "wed", short: "M", label: "Mercredi" },
  { id: "thu", short: "J", label: "Jeudi" },
  { id: "fri", short: "V", label: "Vendredi" },
  { id: "sat", short: "S", label: "Samedi" },
  { id: "sun", short: "D", label: "Dimanche" }
];

/** Lundi de la semaine contenant cette date. */
export function getMonday(dateStr) {
  const d = parseISO(dateStr);
  const jour = d.getDay();
  // getDay() renvoie 0 pour dimanche : il faut alors reculer de six jours,
  // et non avancer d'un.
  const ecart = jour === 0 ? -6 : 1 - jour;
  d.setDate(d.getDate() + ecart);
  return toLocalISODate(d);
}

/** Identifiant d'une semaine : la date de son lundi. */
export const getWeekKey = (dateStr) => getMonday(dateStr);

export const getWeekRange = (weekKey) => ({ start: weekKey, end: addDays(weekKey, 6) });

export const getMonthKey = (dateStr) => dateStr.slice(0, 7);

/** Identifiant de jour de semaine d'une date. */
export const dayIdOf = (dateStr) => JOURS_SEMAINE[(parseISO(dateStr).getDay() + 6) % 7].id;

export const slotDayIndex = (dayId) => Math.max(0, JOURS_SEMAINE.findIndex((d) => d.id === dayId));

export const slotDayLabel = (dayId) => {
  const d = JOURS_SEMAINE.find((x) => x.id === dayId);
  return d ? d.label : "—";
};

export const minutesOf = (hhmm) => {
  if (!hhmm) return null;
  const p = String(hhmm).split(":").map(Number);
  if (p.length < 2 || p.some(isNaN)) return null;
  return p[0] * 60 + p[1];
};

export const nowHHMM = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Le client est-il suivi en ligne (par opposition au presentiel) ? */
export const enLigne = (profil) => !!profil && profil.coachingMode === "enligne";

/**
 * Creneaux du profil, nettoyes.
 *
 * Un creneau sans jour est inexploitable et disparait. Les champs manquants
 * sont completes par des valeurs vides plutot que laisses indefinis : le
 * reste du code compare ces valeurs sans les tester au prealable.
 */
export const normaliserCreneaux = (profil) =>
  ((profil && profil.slots) || [])
    .filter((s) => s && s.day)
    .map((s) => ({
      id: s.id || uid(),
      day: s.day,
      time: s.time || "",
      place: s.place || "",
      createdAt: s.createdAt || null
    }));

/** Creneau correspondant a une date donnee, s'il en existe un. */
export const creneauPourDate = (profil, date) =>
  normaliserCreneaux(profil).find((s) => addDays(getWeekKey(date), slotDayIndex(s.day)) === date) || null;
