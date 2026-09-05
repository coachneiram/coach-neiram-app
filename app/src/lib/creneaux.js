/**
 * Creneaux d'entrainement : suivi hebdomadaire et taux de respect.
 *
 * Portage fidele de index.html : computeSlotWeek (2944), slotWeekSummary
 * (3028), slotAdherence (3037), recentMissedSlots (3051),
 * recentShiftedSlots (3065).
 *
 * C'est le calcul le plus delicat de l'application, et le plus lourd de
 * consequences : c'est lui qui dit au coach si son client a tenu ses
 * rendez-vous. Se tromper ici, c'est reprocher a quelqu'un une seance qu'il
 * a faite, ou laisser passer trois semaines d'absence.
 *
 * Principe : on rapproche les creneaux declares dans le profil des seances
 * reellement pointees, en trois passes de plus en plus permissives. Une
 * seance ne peut servir qu'une fois — d'ou l'ensemble des seances deja
 * consommees.
 */

import { addDays, fmtDateShort } from "./dates.js";
import { getWeekKey, minutesOf, slotDayIndex, slotDayLabel } from "./semaine.js";

/** Ecart tolere entre l'heure prevue et l'heure reelle, en minutes. */
export const TOLERANCE_HORAIRE_MIN = 60;

/** Delai pendant lequel une seance manquee reste rattrapable, en jours. */
export const DELAI_RATTRAPAGE_JOURS = 2;

/** Fenetre d'observation des creneaux manques, en jours. */
export const FENETRE_MANQUES_JOURS = 14;

/** Fenetre d'observation des creneaux decales, en jours. */
export const FENETRE_DECALAGES_JOURS = 28;

export const META_STATUTS = {
  tenu: { label: "Tenu", couleur: "good" },
  decale: { label: "Décalé", couleur: "blue" },
  rattrape: { label: "Rattrapé", couleur: "blue" },
  aujourdhui: { label: "Aujourd'hui", couleur: "gold" },
  attente: { label: "À rattraper", couleur: "warn" },
  todo: { label: "À venir", couleur: "textMuted" },
  avant: { label: "Non suivi", couleur: "textFaint" },
  manque: { label: "Manqué", couleur: "bad" }
};

/** Statuts comptes comme un creneau honore. */
export const STATUTS_HONORES = ["tenu", "decale", "rattrape"];

/**
 * Etat de chaque creneau d'une semaine donnee.
 *
 * Les trois passes de rapprochement, dans l'ordre :
 *  1. la seance designe explicitement le creneau (slotId) ;
 *  2. la seance tombe le bon jour ;
 *  3. n'importe quelle seance passee de la semaine, comptee en rattrapage.
 *
 * Un creneau anterieur a sa propre date de creation est marque « avant » :
 * on ne reproche pas au client des semaines ou le creneau n'existait pas
 * encore.
 */
export function semaineCreneaux(creneaux, seances, cleSemaine, aujourdhui) {
  const consommees = new Set();

  const lignes = (creneaux || [])
    .map((s) => ({ slot: s, date: addDays(cleSemaine, slotDayIndex(s.day)) }))
    .map((r) => (r.slot.createdAt && r.date < r.slot.createdAt ? { ...r, avantCreation: true } : r))
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.slot.time).localeCompare(String(b.slot.time)));

  const seancesSemaine = (seances || []).filter((x) => x.date && getWeekKey(x.date) === cleSemaine);

  // Passe 1 : rattachement explicite.
  lignes.forEach((r) => {
    if (r.avantCreation) return;
    const directe = seancesSemaine.find((x) => x.slotId && x.slotId === r.slot.id && !consommees.has(x.id));
    if (directe) {
      consommees.add(directe.id);
      r.session = directe;
      if (directe.date !== r.date) r.rattrapee = true;
    }
  });

  // Passe 2 : meme jour.
  lignes.forEach((r) => {
    if (r.session || r.avantCreation) return;
    const memeJour = seancesSemaine.find((x) => x.date === r.date && !consommees.has(x.id));
    if (memeJour) {
      consommees.add(memeJour.id);
      r.session = memeJour;
    }
  });

  // Passe 3 : rattrapage sur un autre jour deja passe.
  lignes.forEach((r) => {
    if (r.session || r.avantCreation || r.date > aujourdhui) return;
    const autre = seancesSemaine.find((x) => !consommees.has(x.id) && x.date <= aujourdhui);
    if (autre) {
      consommees.add(autre.id);
      r.session = autre;
      r.rattrapee = true;
    }
  });

  lignes.forEach((r) => {
    if (r.avantCreation) {
      r.status = "avant";
      r.detail = "Avant la mise en place du créneau";
      return;
    }

    if (r.session) {
      if (r.rattrapee) {
        r.status = "rattrape";
        r.detail = "Rattrapée le " + fmtDateShort(r.session.date);
        return;
      }
      if (r.session.maintenance) {
        r.status = "tenu";
        r.detail = "Séance maintien (semaine difficile)";
        return;
      }
      const prevue = minutesOf(r.slot.time);
      const reelle = minutesOf(r.session.startTime);
      if (prevue != null && reelle != null && Math.abs(reelle - prevue) > TOLERANCE_HORAIRE_MIN) {
        r.status = "decale";
        r.detail = "Faite à " + r.session.startTime + " au lieu de " + r.slot.time;
      } else {
        r.status = "tenu";
        r.detail = r.session.startTime ? "Faite à " + r.session.startTime : "Pointée";
      }
      return;
    }

    if (r.date > aujourdhui) {
      r.status = "todo";
      r.detail = null;
    } else if (r.date === aujourdhui) {
      r.status = "aujourdhui";
      r.detail = "C'est aujourd'hui";
    } else if (aujourdhui < addDays(r.date, DELAI_RATTRAPAGE_JOURS)) {
      r.status = "attente";
      r.detail = "Encore rattrapable";
    } else {
      r.status = "manque";
      r.detail = "Manqué";
    }
  });

  return { lignes, bonus: seancesSemaine.filter((x) => !consommees.has(x.id)).length };
}

/**
 * Bilan d'une semaine.
 *
 * Les creneaux « avant » sont exclus : les compter ferait chuter le taux
 * d'un client qui vient d'ajouter un creneau, sans qu'il y soit pour rien.
 * Le pourcentage ne porte que sur ce qui est tranche (tenu ou manque) : un
 * creneau encore rattrapable n'est ni un succes ni un echec.
 */
export function bilanSemaine(lignes) {
  const vivantes = lignes.filter((r) => r.status !== "avant");
  const honores = vivantes.filter((r) => STATUTS_HONORES.indexOf(r.status) >= 0).length;
  const manques = vivantes.filter((r) => r.status === "manque").length;
  const decales = vivantes.filter((r) => r.status === "decale" || r.status === "rattrape").length;
  return {
    prevus: vivantes.length,
    honores,
    manques,
    decales,
    tranches: honores + manques,
    pct: honores + manques ? Math.round((honores / (honores + manques)) * 100) : null
  };
}

/**
 * Taux de respect du creneau sur N semaines glissantes.
 *
 * C'est le vrai indicateur de retention en coaching a distance : un client
 * qui decale sans cesse decroche souvent avant celui qui manque franchement.
 */
export function tauxRespect(creneaux, seances, nbSemaines, aujourdhui) {
  if (!(creneaux || []).length) return null;
  let honores = 0;
  let tranches = 0;
  let manques = 0;
  let decales = 0;
  const lundi = getWeekKey(aujourdhui);
  for (let i = 0; i < nbSemaines; i++) {
    const b = bilanSemaine(semaineCreneaux(creneaux, seances, addDays(lundi, -7 * i), aujourdhui).lignes);
    honores += b.honores;
    tranches += b.tranches;
    manques += b.manques;
    decales += b.decales;
  }
  return { honores, tranches, manques, decales, pct: tranches ? Math.round((honores / tranches) * 100) : null };
}

/** Creneaux manques sur la fenetre qui declenche l'alerte coach. */
export function manquesRecents(creneaux, seances, aujourdhui) {
  if (!(creneaux || []).length) return [];
  const depuis = addDays(aujourdhui, -FENETRE_MANQUES_JOURS);
  const lundi = getWeekKey(aujourdhui);
  const sortie = [];
  [lundi, addDays(lundi, -7), addDays(lundi, -14)].forEach((semaine) => {
    semaineCreneaux(creneaux, seances, semaine, aujourdhui).lignes.forEach((r) => {
      if (r.status === "manque" && r.date > depuis && r.date <= aujourdhui) {
        sortie.push({
          date: r.date,
          jour: slotDayLabel(r.slot.day),
          heure: r.slot.time || "",
          lieu: r.slot.place || ""
        });
      }
    });
  });
  return sortie.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Creneaux decales ou rattrapes — jamais manques — sur la fenetre longue.
 *
 * Signal d'un horaire qui ne tient plus, reperable avant que ca devienne
 * des absences.
 */
export function decalagesRecents(creneaux, seances, aujourdhui) {
  if (!(creneaux || []).length) return [];
  const depuis = addDays(aujourdhui, -FENETRE_DECALAGES_JOURS);
  const lundi = getWeekKey(aujourdhui);
  const sortie = [];
  [0, -7, -14, -21, -28].forEach((decalage) => {
    semaineCreneaux(creneaux, seances, addDays(lundi, decalage), aujourdhui).lignes.forEach((r) => {
      if ((r.status === "decale" || r.status === "rattrape") && r.date > depuis && r.date <= aujourdhui) {
        sortie.push({
          date: r.date,
          jour: slotDayLabel(r.slot.day),
          heure: r.slot.time || "",
          lieu: r.slot.place || "",
          detail: r.detail || ""
        });
      }
    });
  });
  return sortie.sort((a, b) => a.date.localeCompare(b.date));
}
