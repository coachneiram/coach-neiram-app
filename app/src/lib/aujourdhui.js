/**
 * Carte « Aujourd'hui », en haut du Journal (25 octobre 2026).
 *
 * Idée reprise de l'app client de Fallen : en ouvrant l'application, le
 * client voit d'un coup d'œil ce que sa journée attend de lui. Jusqu'ici,
 * la séance du jour vivait dans Séances, le reste à manger plus bas dans
 * le Journal, et le bilan du dimanche n'existait qu'en rappel.
 *
 * Trois lignes, chacune avec au plus un bouton :
 *   - entraînement : séance prévue, faite, repos, ou créneau avec le coach ;
 *   - nutrition : ce qui reste pour atteindre l'objectif du jour ;
 *   - bilan hebdomadaire : envoyé, à envoyer aujourd'hui, ou dans N jours.
 *
 * Rien n'est calculé de nouveau : la séance vient de seanceDuJour (la même
 * décision que la carte de l'onglet Séances), le créneau de
 * creneauPourDate, le bilan envoyé de la clé du rappel du dimanche. La
 * carte ne peut donc pas contredire les autres écrans.
 *
 * Les textes vivent ici, et non dans l'écran, pour être testés.
 */

import { seanceDuJour } from "./seance-du-jour.js";
import { creneauPourDate, getWeekKey } from "./semaine.js";
import { parseISO } from "./dates.js";

export const TEXTES_AUJOURDHUI = {
  titre: "Aujourd'hui",
  entrainement: "Entraînement",
  nutrition: "Nutrition",
  bilan: "Bilan de la semaine",
  commencer: "Commencer",
  voirSeances: "Voir mes séances",
  choisirProgramme: "Choisir un programme",
  noterRepas: "Noter un repas",
  envoyerBilan: "Envoyer mon bilan",
  faite: "Séance faite, bravo",
  repos: "Jour de repos",
  suggestion: "Suggestion",
  aucunProgramme: "Aucune séance prévue pour l'instant",
  creneau: "Séance avec ton coach",
  rienNote: "Rien de noté pour l'instant",
  objectifAtteint: "Objectif du jour atteint",
  encore: "Encore",
  bilanEnvoye: "Bilan envoyé, merci",
  bilanAujourdhui: "À envoyer aujourd'hui",
  bilanDimanche: "Dimanche"
};
const T = TEXTES_AUJOURDHUI;

/** « dans 1 jour », « dans 3 jours ». */
const dansNJours = (n) => `dans ${n} jour${n > 1 ? "s" : ""}`;

/** Ligne entraînement : la séance du jour, et le créneau avec le coach s'il y en a un. */
export function ligneEntrainement({ routines, seances, plan, profil, date }) {
  const jour = seanceDuJour(routines, seances, plan, date);
  const creneau = creneauPourDate(profil, date);
  const avecCoach = creneau
    ? [T.creneau, creneau.time ? `à ${creneau.time}` : "", creneau.place ? `· ${creneau.place}` : ""]
        .filter(Boolean)
        .join(" ")
    : null;
  const ligne = (etat, texte, detail, action) => ({
    id: "entrainement",
    libelle: T.entrainement,
    etat,
    texte,
    detail: [detail, avecCoach].filter(Boolean).join(" — ") || null,
    action
  });
  const ouvrirSeance = { libelle: T.commencer, onglet: "entrainements", intention: "seance" };

  if (jour.etat === "faite") return ligne("fait", T.faite, jour.routine ? jour.routine.name : null, null);
  if (jour.etat === "prevue") return ligne("a-faire", jour.routine.name, null, ouvrirSeance);
  if (jour.etat === "repos") {
    const p = jour.prochaine;
    // Un créneau avec le coach un jour de repos du plan reste une séance.
    if (avecCoach) return ligne("a-faire", avecCoach, null, { libelle: T.voirSeances, onglet: "entrainements" });
    return ligne("repos", T.repos, `Prochaine : ${p.jour} — ${p.routine.name}`, null);
  }
  if (jour.etat === "rotation") return ligne("a-faire", jour.routine.name, T.suggestion, ouvrirSeance);
  if (avecCoach) return ligne("a-faire", avecCoach, null, { libelle: T.voirSeances, onglet: "entrainements" });
  return ligne("vide", T.aucunProgramme, null, { libelle: T.choisirProgramme, onglet: "entrainements" });
}

/**
 * Ligne nutrition : ce qui reste à manger. Sans objectif calorique, pas de
 * ligne (null) : on n'invente pas de cible.
 */
export function ligneNutrition({ totaux, objectifs }) {
  if (!objectifs || !objectifs.calories) return null;
  const noter = { libelle: T.noterRepas, intention: "repas" };
  const base = { id: "nutrition", libelle: T.nutrition };
  const kcal = Math.round((totaux && totaux.calories) || 0);
  if (kcal <= 0) return { ...base, etat: "vide", texte: T.rienNote, detail: `Objectif : ${Math.round(objectifs.calories)} kcal`, action: noter };

  const resteKcal = Math.round(objectifs.calories - kcal);
  const resteP = objectifs.protein ? Math.max(0, Math.round(objectifs.protein - ((totaux && totaux.protein) || 0))) : 0;
  // L'objectif est atteint dès que les calories le sont : un dépassement
  // n'est pas commenté ici, le détail reste dans la carte Nutrition.
  if (resteKcal <= 0) return { ...base, etat: "fait", texte: T.objectifAtteint, detail: `${kcal} kcal notées`, action: null };
  const detail = resteP > 0 ? `${resteKcal} kcal et ${resteP} g de protéines` : `${resteKcal} kcal`;
  return { ...base, etat: "a-faire", texte: `${T.encore} ${detail}`, detail: `${kcal} kcal notées`, action: noter };
}

/**
 * Ligne bilan : la semaine va du lundi au dimanche (lib/semaine.js), le
 * bilan s'envoie le dimanche. `bilanEnvoye` : clé de la dernière semaine
 * envoyée (CLE_BILAN_ENVOYE).
 */
export function ligneBilan({ date, bilanEnvoye }) {
  const base = { id: "bilan", libelle: T.bilan };
  if (bilanEnvoye && bilanEnvoye === getWeekKey(date)) return { ...base, etat: "fait", texte: T.bilanEnvoye, detail: null, action: null };
  // 0 = lundi ... 6 = dimanche.
  const rang = (parseISO(date).getDay() + 6) % 7;
  if (rang === 6) return { ...base, etat: "a-faire", texte: T.bilanAujourdhui, detail: null, action: { libelle: T.envoyerBilan, onglet: "tendances" } };
  return { ...base, etat: "plus-tard", texte: `${T.bilanDimanche}, ${dansNJours(6 - rang)}`, detail: null, action: null };
}

/** Les lignes de la carte, dans l'ordre d'affichage. */
export function lignesAujourdhui({ routines, seances, plan, profil, totaux, objectifs, bilanEnvoye, date }) {
  return [
    ligneEntrainement({ routines, seances, plan, profil, date }),
    ligneNutrition({ totaux, objectifs }),
    ligneBilan({ date, bilanEnvoye })
  ].filter(Boolean);
}
