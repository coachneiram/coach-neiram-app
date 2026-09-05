/**
 * Les consignes envoyees au modele pour rediger un bilan.
 *
 * Portage fidele de callBilanAPI et callBilanMensuelAPI (index.html 1090).
 *
 * Ces textes sont le coeur du produit : c'est ce qui fait qu'un bilan
 * ressemble a un coach et pas a un tableau de chiffres. Ils sont donc
 * repris MOT POUR MOT, y compris les consignes conditionnelles — semaine
 * declaree difficile, creneaux manques, douleurs signalees. Chacune existe
 * parce qu'un bilan sans elle disait quelque chose de faux ou de blessant.
 *
 * En particulier, ne jamais retirer :
 *   - la consigne sur les douleurs (aucun diagnostic, renvoi au medecin) ;
 *   - celle sur les creneaux manques (traiter la cause, sans culpabiliser) ;
 *   - celle sur la semaine difficile (valoriser d'avoir tenu, ne pas charger).
 */

import { fmtDateLong, parseISO } from "./dates.js";
import { fmtL } from "./score-jour.js";
import { ALLERGENS, DIET_TYPES } from "./catalogues.js";
import { GOALS } from "./nutrition.js";
import { genererTexte } from "./ia.js";

/** « septembre 2026 », pour l'en-tete du bilan mensuel. */
export const moisLong = (cleMois) =>
  parseISO(cleMois + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

/** Regime et allergies, ajoutes a la ligne PROFIL quand ils existent. */
export function ligneRegime(profile) {
  const parts = [];
  const d = (profile && profile.dietType) || "aucun";
  if (d !== "aucun") parts.push("régime = " + (DIET_TYPES.find((x) => x.id === d)?.label || d));
  const alg = (profile && profile.allergies) || [];
  if (alg.length) {
    parts.push(
      "allergies/intolérances = " + alg.map((a) => ALLERGENS.find((x) => x.id === a)?.label || a).join(", ")
    );
  }
  return parts.length ? ", " + parts.join(", ") : "";
}

/** Les chiffres d'une semaine, mis en phrases pour le modele. */
function chiffresSemaine(s, profile) {
  if (!s) return "non disponible";
  return [
    "Séances : " +
      s.workoutsCount +
      (s.planSummary && s.planSummary.planned
        ? " (programme : " +
          s.planSummary.done +
          "/" +
          s.planSummary.planned +
          " respectées" +
          (s.planSummary.missed
            ? ", " + s.planSummary.missed + " manquée" + (s.planSummary.missed > 1 ? "s" : "")
            : "") +
          ")"
        : "") +
      (s.deloadCount ? ", dont " + s.deloadCount + " en déload" : ""),
    s.slotSummary && s.slotSummary.planned
      ? "Créneaux du profil : " +
        s.slotSummary.honored +
        "/" +
        s.slotSummary.planned +
        " tenus" +
        (s.slotSummary.missed ? ", " + s.slotSummary.missed + " manqué(s)" : "")
      : null,
    s.hardWeek
      ? "Semaine déclarée difficile par le client (motif : " +
        (s.hardWeekReason || "non précisé") +
        "), programme basculé en format maintien 15-20 min" +
        (s.maintenanceCount
          ? ", " + s.maintenanceCount + " séance(s) maintien réalisée(s)"
          : ", aucune séance maintien réalisée")
      : null,
    s.painLines && s.painLines.length ? "Douleurs signalées : " + s.painLines.join(" ; ") : null,
    `Sommeil moyen : ${s.avgSleepH ?? "—"} h${s.avgSleepQuality != null ? `, qualité ${s.avgSleepQuality}/5` : ""}`,
    s.avgEnergy != null ? `Énergie ${s.avgEnergy}/5, stress ${s.avgStress ?? "—"}/10` : null,
    s.avgWaterMl != null
      ? `Hydratation moyenne : ${fmtL(s.avgWaterMl)}/jour (objectif ${profile.targetWaterL || 2} L)`
      : null,
    s.avgSteps != null
      ? `Pas quotidiens moyens : ${Math.round(s.avgSteps).toLocaleString("fr-FR")} (objectif ${(
          profile.targetSteps || 8e3
        ).toLocaleString("fr-FR")})`
      : null,
    `Calories moyennes : ${s.avgCalories ?? "—"} kcal (jours suivis ${s.loggedDaysCount}/7)`,
    `Macros : P${s.avgProtein ?? "—"} G${s.avgCarbs ?? "—"} L${s.avgFat ?? "—"}`,
    `Poids : ${s.latestWeight ?? "—"} kg${
      s.weightDelta != null ? ` (${s.weightDelta > 0 ? "+" : ""}${s.weightDelta} sur la semaine)` : ""
    }`,
    s.latestFatPct != null
      ? `Masse grasse : ${s.latestFatPct}%${
          s.fatPctDelta != null ? ` (${s.fatPctDelta > 0 ? "+" : ""}${s.fatPctDelta})` : ""
        }`
      : null,
    s.latestMuscle != null
      ? `Muscle : ${s.latestMuscle}kg${
          s.muscleDelta != null ? ` (${s.muscleDelta > 0 ? "+" : ""}${s.muscleDelta})` : ""
        }`
      : null
  ]
    .filter(Boolean)
    .join("\n");
}

export function promptBilanHebdo({ weekStats, lastWeekStats, profile, lastActionsText, thisPhotos, lastPhotos }) {
  const goalLabel = GOALS.find((g) => g.id === profile.goal)?.label || "non défini";
  return `Tu es un coach sportif et nutrition qui rédige un bilan hebdomadaire structuré, factuel et direct pour un(e) client(e), à partir de ses données réelles.

PROFIL : objectif = ${goalLabel}${profile.targetWeightKg ? `, poids objectif = ${profile.targetWeightKg}kg` : ""}${ligneRegime(profile)}
SEMAINE ANALYSÉE : du ${fmtDateLong(weekStats.start)} au ${fmtDateLong(weekStats.end)}

DONNÉES CETTE SEMAINE :
${chiffresSemaine(weekStats, profile)}

DONNÉES SEMAINE PRÉCÉDENTE (pour comparaison) :
${chiffresSemaine(lastWeekStats, profile)}

${
  weekStats.hardWeek
    ? "Le client a déclaré cette semaine comme difficile et basculé en format maintien : n'augmente ni le volume ni les charges, valorise explicitement le fait d'avoir tenu le créneau plutôt que d'avoir tout arrêté, et propose une reprise progressive la semaine suivante.\n"
    : ""
}${
    weekStats.slotSummary && weekStats.slotSummary.missed
      ? "Des créneaux ont été manqués : traite la cause (organisation, fatigue, négociation du créneau) dans A_CORRIGER, sans culpabiliser le client.\n"
      : ""
  }${
    weekStats.painLines && weekStats.painLines.length
      ? "Des douleurs ont été signalées cette semaine : mentionne-les explicitement dans VIGILANCE, propose une adaptation de charge ou de mouvement, et rappelle de consulter un professionnel de santé si la douleur persiste ou s'aggrave. Ne pose aucun diagnostic.\n"
      : ""
  }
NOTES DU CLIENT CETTE SEMAINE (séances d'entraînement, sommeil, stress — à prendre en compte dans l'analyse et les conseils) :
Séances : ${weekStats.sessionNotes && weekStats.sessionNotes.length ? weekStats.sessionNotes.join(" | ") : "aucune note"}
Sommeil/stress : ${weekStats.dayNotes && weekStats.dayNotes.length ? weekStats.dayNotes.join(" | ") : "aucune note"}

ACTIONS RECOMMANDÉES LA SEMAINE DERNIÈRE (évalue si elles ont été suivies, à partir des données ci-dessus) :
${lastActionsText || "aucune"}
${
  thisPhotos && lastPhotos
    ? "\nDes photos de progression de cette semaine et de la semaine précédente sont jointes (face, profil, dos selon disponibilité) — compare brièvement l'aspect visuel dans la section ÉVOLUTION, avec prudence (conditions de prise non garanties identiques)."
    : ""
}

Toute suggestion alimentaire doit respecter le régime et les allergies/intolérances indiqués.

Réponds UNIQUEMENT dans ce format exact, texte simple sans markdown (remplace les <...>, omets une section si elle n'a rien de pertinent sauf RÉSUMÉ, ÉVOLUTION et ACTIONS qui sont obligatoires) :

RÉSUMÉ:
<2 à 3 phrases résumant la semaine>

ÉVOLUTION:
<paragraphe comparant les chiffres clés à la semaine précédente si disponible>

POINTS_FORTS:
- <point positif>

VIGILANCE:
- <point à surveiller>

A_CORRIGER:
- <point à corriger>

ACTIONS:
1. <action concrète pour la semaine prochaine>
2. <action concrète>`;
}

/** Les photos jointes au bilan, etiquetees pour que le modele s'y retrouve. */
export function imagesDuBilan(thisPhotos, lastPhotos) {
  const images = [];
  const ajouter = (photoObj, prefixe) => {
    if (!photoObj) return;
    ["face", "profil", "dos"].forEach((k) => {
      if (photoObj[k]) images.push({ label: `${prefixe} — ${k} :`, dataUrl: photoObj[k] });
    });
  };
  ajouter(thisPhotos, "Photo de cette semaine");
  ajouter(lastPhotos, "Photo de la semaine précédente");
  return images;
}

export function genererBilanHebdo(args) {
  return genererTexte({
    prompt: promptBilanHebdo(args),
    images: imagesDuBilan(args.thisPhotos, args.lastPhotos),
    maxTokens: 1800
  });
}

/** Les chiffres d'un mois. */
function chiffresMois(s, profile) {
  if (!s || !s.hasAnyData) return "non disponible";
  return [
    `Séances : ${s.workoutsCount} (${s.workoutsPerWeek ?? "—"}/semaine)`,
    `Sommeil moyen : ${s.avgSleepH ?? "—"} h${s.avgSleepQuality != null ? `, qualité ${s.avgSleepQuality}/5` : ""}`,
    s.avgEnergy != null ? `Énergie ${s.avgEnergy}/5, stress ${s.avgStress ?? "—"}/10` : null,
    s.avgWaterMl != null
      ? `Hydratation moyenne : ${fmtL(s.avgWaterMl)}/jour (objectif ${profile.targetWaterL || 2} L)`
      : null,
    s.avgSteps != null
      ? `Pas quotidiens moyens : ${Math.round(s.avgSteps).toLocaleString("fr-FR")} (objectif ${(
          profile.targetSteps || 8e3
        ).toLocaleString("fr-FR")})`
      : null,
    `Calories moyennes : ${s.avgCalories ?? "—"} kcal (jours suivis ${s.loggedDaysCount})`,
    `Macros moyennes : P${s.avgProtein ?? "—"} G${s.avgCarbs ?? "—"} L${s.avgFat ?? "—"}`,
    `Poids : ${s.latestWeight ?? "—"} kg${
      s.weightDelta != null ? ` (${s.weightDelta > 0 ? "+" : ""}${s.weightDelta} sur le mois)` : ""
    }`,
    s.latestFatPct != null
      ? `Masse grasse : ${s.latestFatPct}%${
          s.fatPctDelta != null ? ` (${s.fatPctDelta > 0 ? "+" : ""}${s.fatPctDelta})` : ""
        }`
      : null,
    s.latestMuscle != null
      ? `Muscle : ${s.latestMuscle}kg${
          s.muscleDelta != null ? ` (${s.muscleDelta > 0 ? "+" : ""}${s.muscleDelta})` : ""
        }`
      : null
  ]
    .filter(Boolean)
    .join("\n");
}

export function promptBilanMensuel({ monthStats, prevMonthStats, profile, lastActionsText }) {
  const goalLabel = GOALS.find((g) => g.id === profile.goal)?.label || "non défini";
  const mensurations = monthStats.measureDeltas.length
    ? monthStats.measureDeltas
        .map(
          (m) =>
            `${m.label} : ${m.base != null ? m.base + " → " : ""}${m.latest} cm${
              m.delta != null ? ` (${m.delta > 0 ? "+" : ""}${m.delta})` : ""
            }`
        )
        .join("\n")
    : "aucune prise de mensurations ce mois-ci";

  return `Tu es un coach sportif et nutrition qui rédige un BILAN MENSUEL structuré, factuel et direct pour un(e) client(e), à partir de ses données réelles. Prends de la hauteur : tendances de fond du mois, pas le détail jour par jour.

PROFIL : objectif = ${goalLabel}${profile.targetWeightKg ? `, poids objectif = ${profile.targetWeightKg}kg` : ""}${ligneRegime(profile)}
MOIS ANALYSÉ : ${moisLong(monthStats.monthKey)} (du ${fmtDateLong(monthStats.start)} au ${fmtDateLong(monthStats.end)})

DONNÉES DU MOIS :
${chiffresMois(monthStats, profile)}

MENSURATIONS (début de période → dernière prise) :
${mensurations}

MOIS PRÉCÉDENT (pour comparaison) :
${chiffresMois(prevMonthStats, profile)}

ACTIONS RECOMMANDÉES AU DERNIER BILAN MENSUEL (évalue si elles ont été suivies) :
${lastActionsText || "aucune"}

Toute suggestion alimentaire doit respecter le régime et les allergies/intolérances indiqués.

Réponds UNIQUEMENT dans ce format exact, texte simple sans markdown (remplace les <...>, omets une section si rien de pertinent sauf RÉSUMÉ, ÉVOLUTION et ACTIONS qui sont obligatoires) :

RÉSUMÉ:
<2 à 3 phrases résumant le mois>

ÉVOLUTION:
<paragraphe comparant les chiffres clés au mois précédent, mensurations comprises>

POINTS_FORTS:
- <point positif>

VIGILANCE:
- <point à surveiller>

A_CORRIGER:
- <point à corriger>

ACTIONS:
1. <action concrète pour le mois prochain>
2. <action concrète>`;
}

export function genererBilanMensuel(args) {
  return genererTexte({ prompt: promptBilanMensuel(args), maxTokens: 1800 });
}

/** Les actions du bilan precedent, numerotees pour le modele. */
export function actionsPrecedentes(bilan) {
  const actions = bilan?.sections?.actions;
  return actions?.length ? actions.map((a, i) => `${i + 1}. ${a}`).join("\n") : null;
}
