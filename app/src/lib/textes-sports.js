/**
 * Autres sports, programmes guidés et « Mon année » (repris de l'app
 * Neiram le 24/10/2026) : textes des écrans, et les règles propres au
 * coaching.
 *
 * RÈGLE DE COACHING (recommandation proposée au coach le 24/10/2026, à
 * confirmer) : une activité hors musculation (course, vélo, foot…) compte
 * pour la semaine active, les trophées et la série de semaines, mais PAS
 * pour les créneaux de coaching ni pour « Ta séance du jour ». Pour
 * changer d'avis, basculer ACTIVITES_COMPTENT_POUR_CRENEAUX.
 */

import { enLigne } from "./semaine.js";
import { chargeSRPE, resumeActivite } from "./activites.js";

export const ACTIVITES_COMPTENT_POUR_CRENEAUX = false;

/** Séances qui peuvent tenir un créneau de coaching. */
export const seancesPourCreneaux = (seances) =>
  ACTIVITES_COMPTENT_POUR_CRENEAUX ? seances || [] : (seances || []).filter((s) => !(s && s.activite));

/**
 * Événement « activite » pour le Journal du coach (coaching en ligne) :
 * sport, durée, RPE et charge sRPE dans « message ». Null hors ligne.
 */
export function evenementActivite(profil, seance) {
  if (!enLigne(profil) || !seance || !seance.activite || !seance.date) return null;
  const a = seance.activite;
  const charge = chargeSRPE(a.duree, a.rpe);
  const morceaux = [`${a.emoji || ""} ${a.label || a.id}`.trim(), resumeActivite(a)];
  if (charge) morceaux.push(`charge sRPE ${charge}`);
  if (String(seance.notes || "").trim()) morceaux.push(String(seance.notes).trim());
  return {
    type: "activite",
    date: seance.date,
    dureeMin: a.duree || seance.durationMin,
    rpe: a.rpe || "",
    message: morceaux.filter(Boolean).join(" · ")
  };
}

export const LIBELLES_RPE = {
  1: "très facile",
  2: "facile",
  3: "léger",
  4: "modéré",
  5: "un peu dur",
  6: "dur",
  7: "très dur",
  8: "très très dur",
  9: "presque maximal",
  10: "maximal"
};

export const TEXTES_SPORTS = {
  // Modale « Ajouter une activité ».
  titreAjouter: "Ajouter une activité",
  titreModifier: "Modifier l'activité",
  quelSport: "Quel sport ?",
  placeholderRecherche: "Course, padel, yoga, randonnée…",
  recents: "Récents",
  tous: "Tous",
  aucunSport: "Aucun sport trouvé. Crée-le ci-dessous : il sera gardé pour la prochaine fois.",
  creerSport: "➕ Créer mon sport",
  nomSport: "Nom du sport",
  placeholderNomSport: "Pole dance, parkour, hockey sur glace…",
  icone: (e) => `Icône ${e}`,
  famille: "Famille",
  intensiteHabituelle: "Intensité habituelle",
  champsPerso: [
    ["distance", "Distance"],
    ["denivele", "Dénivelé"],
    ["fc", "Fréquence cardiaque"]
  ],
  renforce: "Renforce les muscles",
  annuler: "Annuler",
  creerEtNoter: "Créer et noter",
  confirmerRetrait: (label) => `Retirer « ${label} » de tes sports ? Les séances déjà notées sont gardées.`,
  retirer: "Retirer",
  changer: "Changer",
  date: "Date",
  duree: "Durée (min)",
  distance: "Distance (km)",
  denivele: "Dénivelé + (m)",
  fc: "FC moyenne (bpm)",
  rpe: "Effort ressenti (RPE)",
  rpeLibelle: (n) => `${n}/10 : ${LIBELLES_RPE[n]}`,
  notes: "Notes",
  placeholderNotes: "Parcours, sensations, partenaires…",
  intensite: (l) => "Intensité " + l.toLowerCase(),
  kcal: (n) => "≈ " + n + " kcal",
  charge: (n) => "charge " + n,
  enregistrer: "Enregistrer l'activité",
  indiqueDuree: "Indique la durée",
  compendium: "Dépense estimée d'après le Compendium des activités physiques (2024), à ±20 % près. Elle n'est pas ajoutée à ton budget calorique.",
  pourCoach: "Ton coach la voit dans son suivi. Elle compte pour ta semaine active et tes trophées, pas pour tes créneaux de coaching.",

  // Semaine active.
  semaineActive: "🌿 Semaine active",
  boutonActivite: "Activité",
  surSeptJours: (n) => `/ ${n} min sur 7 jours`,
  moderee: (n) => `Modérée : ${n} min`,
  soutenue: (n) => `Soutenue : ${n} min (×2)`,
  renfo: (n, m) => `Renforcement : ${n}/${m} jours`,
  pas: (n) => `Pas : ${n.toLocaleString("fr-FR")}/j`,
  reperesOms: "Repères OMS 2020 pour les adultes : 150 à 300 min d'activité modérée par semaine et du renforcement musculaire au moins 2 jours.",
  joursCourts: ["L", "M", "M", "J", "V", "S", "D"],

  // Mes sports.
  mesSports: "🏅 Mes sports",
  trenteJours: "30 derniers jours",
  records: "Records",
  nbSeances: (n) => n + " séance" + (n > 1 ? "s" : ""),
  auTotal: (km) => " · " + km + " au total",
  allure10: (v, d) => `Meilleure allure (10 km et +) : ${v}, le ${d}`,
  allure5: (v, d) => `Meilleure allure (5 km et +) : ${v}, le ${d}`,
  plusLongueDistance: (km) => `Plus longue distance : ${km}`,
  plusGrosDenivele: (m) => `Plus gros dénivelé : ${m} m`,
  plusLongueSeance: (d) => `Plus longue séance : ${d}`,

  // Programmes guidés.
  programmes: "🎯 Programmes guidés",
  programmesIntro: "Un plan semaine par semaine pour te (re)mettre en mouvement, en plus des séances de ton coach.",
  nbSemaines: (n) => `· ${n} semaines`,
  commencer: "Commencer",
  seanceDe: (s) => `Semaine ${s.semaine} · séance ${s.numero}/${s.parSemaine}`,
  jeLaiFaite: "Je l'ai faite : noter",
  arreter: "Arrêter",
  confirmerArret: "Arrêter ce programme ? Tes séances déjà notées sont gardées.",
  nbFaites: (a, b) => `${a}/${b} séances`,
  termine: "🎉 Programme terminé ! Choisis-en un autre avec « Arrêter », ou continue à ton rythme.",
  noteProgramme: (titre, s) => `${titre} · semaine ${s.semaine}, séance ${s.numero}`,

  // Mon année.
  monAnnee: (a) => `📅 Mon année ${a}`,
  voirAnnee: "Voir l'année",
  seancesAnnee: (n) => `séance${n > 1 ? "s" : ""} cette année`,
  objectifAnnee: (o, p) => ` · objectif ${o} (${p} %)`,
  toucheJour: "Touche un jour pour cocher une séance faite (ou la décocher).",
  cochee: (d) => `${d} : séance cochée ✓`,
  decochee: (d) => `${d} : décochée`,
  duJour: (d, noms) => `${d} : ${noms} (à modifier dans l'historique)`,
  ariaJour: (d, n) => `${d} : ${n} séance${n > 1 ? "s" : ""}`,
  chiffresAnnee: [
    ["total", "séances"],
    ["joursActifs", "jours actifs"],
    ["meilleureSerieSemaines", "semaines d'affilée"]
  ],
  partagerAnnee: "📣 Partager mon année en story",
  imageEnregistree: "Image enregistrée : publie-la en story.",
  partage: "Partagé ! Merci 🙌",
  partageRate: "Le partage n'a pas fonctionné, réessaie.",
  nomSeance: (s) => (s.activite ? s.activite.label : s.pointage ? "Séance cochée" : "Musculation"),

  // Historique.
  ajouterActivite: "Autre sport",
  refaire: "Refaire cette activité aujourd'hui"
};
