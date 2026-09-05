/**
 * Message d'encouragement du Journal.
 *
 * Portage fidele de MOTIVATION_VARIANTS et buildMotivation (index.html,
 * lignes ~706 et 737).
 *
 * Le principe tient en une regle : un message doit s'appuyer sur un chiffre
 * reel du jour ou de la semaine. Les messages passe-partout ne sont
 * utilises que si aucun message concret ne s'applique, sinon ils
 * monopolisent l'affichage et masquent les informations utiles.
 *
 * La rotation est calee sur l'heure et non sur le hasard : le message
 * change au fil de la journee, mais reste stable si le client rouvre
 * l'application dans la minute. Un message qui change a chaque affichage
 * donnerait l'impression d'un bandeau publicitaire.
 */

import { round } from "./dates.js";
import { fmtL } from "./score-jour.js";

/** Seuils d'affichage : en deca, le message n'apprend rien. */
const SEUILS = {
  proteinesRestantes: 15,
  heureProteines: 12,
  heureEau: 11,
  joursDeSuite: 3,
  ecartPoidsKg: 0.3
};

export const VARIANTES = {
  sessionsLeft: [
    (v) => `Plus que ${v.left} séance${v.left > 1 ? "s" : ""} pour atteindre ton objectif de la semaine.`,
    (v) => `${v.done}/${v.target} séances cette semaine — il en reste ${v.left}.`,
    (v) => `Encore ${v.left} séance${v.left > 1 ? "s" : ""} et la semaine est bouclée.`
  ],
  sessionsDone: [
    (v) => `Objectif séances atteint : ${v.done}/${v.target} cette semaine.`,
    (v) => `${v.done} séances au compteur, objectif rempli.`,
    (v) => `Semaine complète côté entraînement : ${v.done}/${v.target}.`
  ],
  protein: [
    (v) => `Il te reste ${v.g} g de protéines à couvrir aujourd'hui.`,
    (v) => `Protéines : ${v.done} / ${v.target} g — encore ${v.g} g.`,
    (v) => `${v.g} g de protéines à aller chercher d'ici ce soir.`
  ],
  water: [
    (v) => `Hydratation : il te reste ${v.l} à boire aujourd'hui.`,
    (v) => `${v.l} d'eau à boire pour atteindre ton objectif du jour.`
  ],
  steps: [
    (v) => `Encore ${v.n} pas pour atteindre ton objectif du jour.`,
    (v) => `Pas : ${v.done} / ${v.target} — il en manque ${v.n}.`
  ],
  streak: [
    (v) => `${v.days} jours de suivi d'affilée.`,
    (v) => `${v.days} jours consécutifs renseignés — la régularité paie.`
  ],
  weightGoal: [
    (v) => `${v.kg} kg te séparent de ton poids objectif.`,
    (v) => `Objectif poids : encore ${v.kg} kg.`
  ],
  logToday: [
    () => "Rien de saisi aujourd'hui : renseigne tes repas et ta forme du jour.",
    () => "Journée vide pour l'instant — pense à loguer tes repas."
  ]
};

export function construireMotivation(ctx) {
  const concrets = [];
  const passePartout = [];

  const { target, done, left } = ctx.sessions;
  if (target > 0) {
    if (left > 0) concrets.push({ key: "sessionsLeft", v: { left, done, target } });
    else concrets.push({ key: "sessionsDone", v: { done, target } });
  }

  // Les proteines et l'eau n'apparaissent qu'a partir du milieu de journee :
  // rappeler a 8 h qu'il reste tout a couvrir n'apprend rien.
  if (ctx.proteinLeft != null && ctx.proteinLeft >= SEUILS.proteinesRestantes && ctx.hour >= SEUILS.heureProteines) {
    concrets.push({
      key: "protein",
      v: { g: Math.round(ctx.proteinLeft), done: Math.round(ctx.proteinDone), target: ctx.proteinTarget }
    });
  }

  if (ctx.waterLeftMl != null && ctx.waterLeftMl > 0 && ctx.hour >= SEUILS.heureEau) {
    concrets.push({ key: "water", v: { l: fmtL(ctx.waterLeftMl) } });
  }

  // Les pas ne sont rappeles que si le client en a deja saisi : sinon on
  // reprocherait un objectif a quelqu'un qui ne suit pas ses pas du tout.
  if (ctx.stepsLeft != null && ctx.stepsLeft > 0 && ctx.stepsDone > 0) {
    concrets.push({
      key: "steps",
      v: {
        n: ctx.stepsLeft.toLocaleString("fr-FR"),
        done: ctx.stepsDone.toLocaleString("fr-FR"),
        target: ctx.stepsTarget.toLocaleString("fr-FR")
      }
    });
  }

  if (ctx.streakDays >= SEUILS.joursDeSuite) concrets.push({ key: "streak", v: { days: ctx.streakDays } });

  if (ctx.weightGapKg != null && ctx.weightGapKg > SEUILS.ecartPoidsKg) {
    concrets.push({ key: "weightGoal", v: { kg: round(ctx.weightGapKg, 1) } });
  }

  if (ctx.emptyToday) passePartout.push({ key: "logToday", v: {} });

  const candidats = concrets.length ? concrets : passePartout;
  if (!candidats.length) return null;

  const choisi = candidats[ctx.seed % candidats.length];
  const variantes = VARIANTES[choisi.key] || [];
  if (!variantes.length) return null;

  const rotation = Math.floor(ctx.seed / Math.max(1, candidats.length));
  return variantes[rotation % variantes.length](choisi.v);
}

/**
 * Nombre de jours consecutifs renseignes, en remontant depuis une date.
 *
 * Une seule trace suffit — un repas, une saisie de forme, une seance. La
 * serie s'arrete au premier jour totalement vide.
 */
export function serieDeJours({ date, repas, journal, seances, maximum = 60 }) {
  let jours = 0;
  for (let k = 0; k < maximum; k++) {
    const d = decaler(date, -k);
    const quelqueChose =
      (repas || []).some((e) => e.date === d) ||
      (journal || []).some((f) => f.date === d) ||
      (seances || []).some((s) => s.date === d);
    if (!quelqueChose) break;
    jours++;
  }
  return jours;
}

function decaler(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
