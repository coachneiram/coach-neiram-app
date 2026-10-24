/**
 * « Mon année Neiram » : le bilan de l'année, à la manière des bilans de fin
 * d'année des grandes applis (séances, sports, régularité, records,
 * transformation, sommeil et pas), en quelques écrans et une image à
 * partager en story. Repris de l'app Neiram le 24/10/2026 (app coach :
 * carte dans Entraînements, à côté de « Mon année »).
 *
 * Mis en avant du 1er décembre au 31 janvier (en janvier : l'année qui
 * vient de se terminer) ; le reste de l'année, « ton année jusqu'ici ».
 *
 * Tout est calculé sur le téléphone, rien n'est envoyé.
 */

import { num, round } from "./dates.js";
import { MOIS, statsAnnee, estPointage } from "./calendrier.js";
import { activiteParId, semainesActivesOMS, sportsPratiques } from "./activites.js";
import { construireRecords } from "./records.js";
import { maxisRetenus } from "./performances.js";
import { transformation } from "./transformation.js";

/** Année à montrer : en janvier, l'année écoulée ; sinon l'année en cours. */
export function anneeDuBilan(aujourdhui) {
  const a = Number(aujourdhui.slice(0, 4));
  return aujourdhui.slice(5, 7) === "01" ? a - 1 : a;
}

/** Période où le bilan est mis en avant : décembre et janvier. */
export const saisonDuBilan = (aujourdhui) => ["12", "01"].includes(aujourdhui.slice(5, 7));

const minutesSeance = (s) => num(s.activite ? s.activite.duree : s.durationMin);

/**
 * Bilan d'une année. Rend { annee, ecrans: [{ id, emoji, titre, valeur,
 * detail }], lignesStory: [{ valeur, libelle }] } ; `ecrans` ne contient
 * que ce qui a des données.
 */
export function bilanAnnee({ annee, seances = [], journal = [], corps = [], profil = {}, maxis = {} }) {
  const debut = `${annee}-01-01`;
  const fin = `${annee}-12-31`;
  const dans = (d) => typeof d === "string" && d >= debut && d <= fin;
  const siennes = (seances || []).filter((s) => s && dans(s.date));
  const stats = statsAnnee(seances, annee);
  const ecrans = [];

  // 1. Séances
  const minutes = Math.round(siennes.reduce((t, s) => t + minutesSeance(s), 0));
  if (stats.total) {
    ecrans.push({
      id: "seances",
      emoji: "🏋️",
      titre: "Tes séances",
      valeur: `${stats.total} séance${stats.total > 1 ? "s" : ""}`,
      detail: [
        `${stats.joursActifs} jours actifs`,
        minutes >= 60 ? `${Math.round(minutes / 60)} h d'entraînement` : null,
        stats.meilleurMois != null ? `Ton meilleur mois : ${MOIS[stats.meilleurMois].toLowerCase()} (${stats.parMois[stats.meilleurMois]} séances)` : null
      ].filter(Boolean)
    });
  }

  // 2. Sports
  const parSport = {};
  let km = 0;
  for (const s of siennes) {
    if (estPointage(s)) continue;
    const id = s.activite ? s.activite.id : "musculation";
    parSport[id] = (parSport[id] || 0) + (minutesSeance(s) || 1);
    km += s.activite ? num(s.activite.distanceKm) : 0;
  }
  const favori = Object.entries(parSport).sort((a, b) => b[1] - a[1])[0];
  const nbSports = sportsPratiques(siennes);
  if (favori) {
    const sport = favori[0] === "musculation" ? { label: "Musculation", emoji: "🏋️" } : activiteParId(favori[0]) || { label: "Autre", emoji: "✨" };
    ecrans.push({
      id: "sports",
      emoji: sport.emoji || "🏅",
      titre: "Ton sport de l'année",
      valeur: sport.label,
      detail: [nbSports > 1 ? `${nbSports} sports différents` : null, km >= 1 ? `${String(round(km, 0))} km parcourus` : null].filter(Boolean)
    });
  }

  // 3. Régularité
  const semainesOMS = semainesActivesOMS(siennes);
  if (stats.meilleureSerieSemaines >= 2 || semainesOMS) {
    ecrans.push({
      id: "regularite",
      emoji: "🔥",
      titre: "Ta régularité",
      valeur: `${stats.meilleureSerieSemaines} semaine${stats.meilleureSerieSemaines > 1 ? "s" : ""} d'affilée`,
      detail: [semainesOMS ? `${semainesOMS} semaine${semainesOMS > 1 ? "s" : ""} au repère de l'OMS (150 min)` : null].filter(Boolean)
    });
  }

  // 4. Force : charge la plus lourde de l'année, total des trois maxis.
  const records = construireRecords(siennes).filter((r) => r.weight && r.weight.value > 0);
  const plusLourd = records.sort((a, b) => b.weight.value - a.weight.value)[0];
  const m = maxisRetenus(maxis, seances);
  if (plusLourd || m.total) {
    ecrans.push({
      id: "force",
      emoji: "💪",
      titre: "Ta force",
      valeur: plusLourd ? `${String(plusLourd.weight.value).replace(".", ",")} kg` : `${String(m.total).replace(".", ",")} kg`,
      detail: [plusLourd ? `Ta charge la plus lourde : ${plusLourd.name}` : null, m.total ? `Total squat + développé couché + soulevé de terre : ${String(m.total).replace(".", ",")} kg` : null].filter(
        Boolean
      )
    });
  }

  // 5. Transformation
  const t = transformation({ bodyLogs: corps, profil, debut, fin });
  if (t && ((t.gras && t.gras.perduKg > 0) || (t.muscle && t.muscle.prisKg > 0))) {
    ecrans.push({
      id: "transformation",
      emoji: "✨",
      titre: "Ta transformation",
      valeur: t.gras && t.gras.perduKg > 0 ? `−${String(t.gras.perduKg).replace(".", ",")} kg de gras` : `+${String(t.muscle.prisKg).replace(".", ",")} kg de muscle`,
      detail: [t.gras && t.gras.perduKg > 0 && t.muscle && t.muscle.prisKg > 0 ? `et +${String(t.muscle.prisKg).replace(".", ",")} kg de muscle` : null].filter(Boolean)
    });
  }

  // 6. Pas et sommeil
  const joursAnnee = (journal || []).filter((f) => f && dans(f.date));
  const pas = joursAnnee.reduce((s, f) => s + num(f.steps), 0);
  const nuits = joursAnnee.filter((f) => num(f.sleepHours) > 0);
  const sommeil = nuits.length ? round(nuits.reduce((s, f) => s + num(f.sleepHours), 0) / nuits.length, 1) : null;
  if (pas > 0 || sommeil) {
    ecrans.push({
      id: "quotidien",
      emoji: "👟",
      titre: "Ton quotidien",
      valeur: pas > 0 ? `${Math.round(pas).toLocaleString("fr-FR")} pas` : `${String(sommeil).replace(".", ",")} h de sommeil`,
      detail: [pas > 0 ? `soit environ ${Math.round((pas * 0.75) / 1000).toLocaleString("fr-FR")} km à pied` : null, pas > 0 && sommeil ? `${String(sommeil).replace(".", ",")} h de sommeil en moyenne` : null].filter(
        Boolean
      )
    });
  }

  const lignesStory = ecrans.slice(0, 4).map((e) => ({ valeur: e.valeur, libelle: e.titre.replace(/^Ta |^Ton |^Tes /, "").replace(/^./, (c) => c.toUpperCase()) }));
  return { annee, ecrans, lignesStory };
}
