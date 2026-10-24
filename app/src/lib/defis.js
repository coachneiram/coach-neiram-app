/**
 * Defis de 30 jours (repris de l'app Neiram, 24 octobre 2026).
 *
 * Un defi = une regle simple, validee chaque jour a partir de ce que le
 * client note deja (pas, eau, sommeil, portions, repas, seances, forme).
 * Rien de nouveau a saisir : le defi donne une raison de noter, et donc au
 * coach des donnees plus completes.
 *
 * ADAPTATION COACHING : pas de jeune (l'app coach n'a pas de minuteur de
 * jeune), pas de partage public ; un defi « Noter ma forme » en plus, utile
 * au suivi.
 *
 * Etat (cle « cn_defis », donc dans la sauvegarde) :
 *   { enCours: { id, debut } | null, termines: [{ id, debut, valides }] }
 *
 * Reussite : DEFI_SEUIL jours valides sur DEFI_JOURS. Exiger 30 sur 30
 * ferait abandonner au premier rhume.
 */

import { addDays } from "./dates.js";
import { fruitsEtLegumes } from "./portions-jour.js";

export const CLE_DEFIS = "cn_defis";
export const DEFI_JOURS = 30;
export const DEFI_SEUIL = 25;
export const TERMINES_MAX = 100;

const nombre = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Chaque defi : valide(jour), jour = { form, entrees, totaux, objectifs, seances } de CE jour-la. */
export const DEFIS = [
  {
    id: "bouger",
    emoji: "🏃",
    titre: "Bouger chaque jour",
    detail: "Une séance notée, ou 6 000 pas.",
    valide: (j) => (j.seances || []).length > 0 || nombre(j.form && j.form.steps) >= 6000
  },
  {
    id: "pas-8000",
    emoji: "🚶",
    titre: "8 000 pas par jour",
    detail: "Note tes pas dans le Journal.",
    valide: (j) => nombre(j.form && j.form.steps) >= 8000
  },
  {
    id: "eau-2l",
    emoji: "💧",
    titre: "2 L d'eau par jour",
    detail: "Touche les verres dans le Journal au fil de la journée.",
    valide: (j) => nombre(j.form && j.form.waterMl) >= 2000
  },
  {
    id: "fruits-legumes-5",
    emoji: "🥦",
    titre: "5 fruits et légumes par jour",
    detail: "Compte tes portions dans le Journal.",
    valide: (j) => fruitsEtLegumes(j.form || {}) >= 5
  },
  {
    id: "sommeil-7h",
    emoji: "😴",
    titre: "7 h de sommeil",
    detail: "Note ton coucher et ton lever dans le Journal.",
    valide: (j) => nombre(j.form && j.form.sleepHours) >= 7
  },
  {
    id: "repas-notes",
    emoji: "📝",
    titre: "Noter tous mes repas",
    detail: "Au moins 3 aliments ou plats notés dans la journée.",
    valide: (j) => (j.entrees || []).length >= 3
  },
  {
    id: "proteines",
    emoji: "🍗",
    titre: "Mon objectif de protéines",
    detail: "Au moins 90 % de tes protéines du jour.",
    valide: (j) => {
      const objectif = nombre(j.objectifs && j.objectifs.protein);
      return objectif > 0 && nombre(j.totaux && j.totaux.protein) >= objectif * 0.9;
    }
  },
  {
    id: "forme-notee",
    emoji: "📊",
    titre: "Noter ma forme chaque jour",
    detail: "Ton sommeil, ton énergie ou ton stress notés dans le Journal : ton coach suit mieux ta récupération.",
    valide: (j) => !!j.form && (nombre(j.form.sleepHours) > 0 || nombre(j.form.energy) > 0 || nombre(j.form.stress) > 0)
  }
];

export const defiParId = (id) => DEFIS.find((d) => d.id === id) || null;

export const etatVide = () => ({ enCours: null, termines: [] });

const estJour = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function reparerEtat(brut) {
  const e = brut && typeof brut === "object" && !Array.isArray(brut) ? brut : {};
  const enCours = e.enCours && defiParId(e.enCours.id) && estJour(e.enCours.debut) ? { id: e.enCours.id, debut: e.enCours.debut } : null;
  const termines = (Array.isArray(e.termines) ? e.termines : [])
    .filter((t) => t && defiParId(t.id) && estJour(t.debut) && Number.isFinite(Number(t.valides)))
    .map((t) => ({ id: t.id, debut: t.debut, valides: Math.max(0, Math.min(DEFI_JOURS, Math.round(Number(t.valides)))) }))
    .slice(-TERMINES_MAX);
  return { enCours, termines };
}

/** Les 30 jours du defi. */
export const joursDuDefi = (debut) => Array.from({ length: DEFI_JOURS }, (_, i) => addDays(debut, i));

export function commencer(etat, id, aujourdhui) {
  if (!defiParId(id)) return etat;
  return { ...etat, enCours: { id, debut: aujourdhui } };
}

export const abandonner = (etat) => ({ ...etat, enCours: null });

/** Avancement du defi en cours ; `estValide(date)` dit si un jour est valide. */
export function avancementDefi(enCours, aujourdhui, estValide) {
  if (!enCours) return null;
  const jours = joursDuDefi(enCours.debut);
  const cases = jours.map((date) => {
    if (date > aujourdhui) return { date, etat: "avenir" };
    const ok = !!estValide(date);
    if (date === aujourdhui) return { date, etat: ok ? "valide" : "aujourdhui" };
    return { date, etat: ok ? "valide" : "manque" };
  });
  const valides = cases.filter((c) => c.etat === "valide").length;
  const jourNumero = Math.min(DEFI_JOURS, jours.filter((d) => d <= aujourdhui).length);
  const manques = cases.filter((c) => c.etat === "manque").length;
  return {
    cases,
    valides,
    jourNumero,
    termine: aujourdhui > jours[DEFI_JOURS - 1],
    reussi: valides >= DEFI_SEUIL,
    // Encore atteignable : pas plus de 5 jours manques.
    atteignable: manques <= DEFI_JOURS - DEFI_SEUIL
  };
}

/** Cloture le defi le lendemain du 30e jour : il part dans les termines. */
export function cloturerSiFini(etat, aujourdhui, estValide) {
  const a = avancementDefi(etat.enCours, aujourdhui, estValide);
  if (!a || !a.termine) return etat;
  const termine = { id: etat.enCours.id, debut: etat.enCours.debut, valides: a.valides };
  return { enCours: null, termines: [...etat.termines, termine].slice(-TERMINES_MAX) };
}

export const defisReussis = (etat) => etat.termines.filter((t) => t.valides >= DEFI_SEUIL);

/** Valideur d'un jour pour un defi, a partir des donnees de l'app. */
export function valideurDuDefi(defi, { journal, repas, seances, objectifs, totauxDuJour }) {
  return (date) => {
    const entrees = (repas || []).filter((e) => e && e.date === date);
    return defi.valide({
      form: (journal || []).find((f) => f && f.date === date) || {},
      entrees,
      totaux: totauxDuJour ? totauxDuJour(entrees) : {},
      objectifs,
      seances: (seances || []).filter((s) => s && s.date === date)
    });
  };
}

export const TEXTES_DEFIS = {
  titre: "Défi 30 jours",
  proposer: "Relève un défi de 30 jours : une règle simple, validée chaque jour avec ce que tu notes déjà.",
  choisir: "Choisir un défi",
  abandonner: "Abandonner le défi",
  confirmerAbandon: "Abandonner ce défi ? Ton avancement sera perdu.",
  jour: "Jour",
  valides: "jours validés",
  objectif: `Objectif : ${DEFI_SEUIL} jours validés sur ${DEFI_JOURS}.`,
  bravo: "Défi réussi 🏆",
  plusAtteignable: "L'objectif n'est plus atteignable, mais chaque jour compte. Tu peux finir ou recommencer.",
  reussis: "défis réussis",
  aria: (valides) => `${valides} jours validés sur ${DEFI_JOURS}`
};
