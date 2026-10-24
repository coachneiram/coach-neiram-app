/**
 * Guidage pendant la seance (demande du coach, 24 octobre 2026) : « que
 * ce soit le plus intuitif possible, le plus facile a suivre, et que tout
 * soit comprehensible ».
 *
 * Ce qui manquait, vu sur telephone :
 *   - aucune explication de la marche a suivre (que remplir, que cocher) ;
 *   - la charge proposee s'affichait AVANT le nom de l'exercice, en jargon
 *     (« ↑ 60 → 62.5 kg (marge confortable) ») ;
 *   - rien ne montrait ce qui etait deja fait ;
 *   - « Enregistrer la séance » n'apparaissait qu'apres trois ecrans de
 *     defilement ;
 *   - la duree se tapait a la main, alors que l'appli sait quand la seance a
 *     commence.
 *
 * Ici, les calculs et les textes ; l'ecran (ConstructeurSeances.jsx) ne fait
 * que les afficher.
 */

import { aDesSeries, seriesDe } from "./series.js";

/** En dessous de ce nombre de seances enregistrees, le mode d'emploi s'affiche. */
export const SEANCES_AVEC_GUIDE = 5;

/** Une duree calculee au-dela de 5 h vient d'une seance oubliee ouverte. */
const DUREE_MAX_MIN = 300;

export const afficherGuide = (nombreDeSeances) => (Number(nombreDeSeances) || 0) < SEANCES_AVEC_GUIDE;

/** Series cochees / series prevues, sur les exercices qui se comptent en series. */
export function progressionSeance(exercices) {
  let faites = 0;
  let total = 0;
  for (const ex of Array.isArray(exercices) ? exercices : []) {
    if (!ex || !String(ex.name || "").trim() || !aDesSeries(ex)) continue;
    const series = seriesDe(ex);
    total += series.length;
    faites += series.filter((s) => s && s.fait).length;
  }
  return { faites, total };
}

/** Toutes les series de l'exercice sont cochees. */
export function exerciceTermine(ex) {
  if (!ex || !aDesSeries(ex)) return false;
  const series = seriesDe(ex);
  return series.length > 0 && series.every((s) => s && s.fait);
}

/** Minutes ecoulees depuis le demarrage, ou null si ce n'est pas plausible. */
export function dureeAuto(debutLe, maintenant = Date.now()) {
  const debut = Number(debutLe);
  if (!Number.isFinite(debut) || debut <= 0) return null;
  const min = Math.round((maintenant - debut) / 60000);
  return min >= 1 && min <= DUREE_MAX_MIN ? min : null;
}

const kg = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? String(Math.round(n * 100) / 100).replace(".", ",") : String(v ?? "");
};

/**
 * Phrase de la charge proposee, en clair :
 *   « Charge proposée : 62,5 kg (+2,5 kg) — la dernière fois : marge confortable. »
 */
export function phraseCharge(sug, poids) {
  if (!sug) return "";
  const delta = Number(sug.delta) || 0;
  const ecart = delta > 0 ? ` (+${kg(delta)} kg)` : delta < 0 ? ` (−${kg(-delta)} kg)` : "";
  const pourquoi = sug.reason ? ` — la dernière fois : ${sug.reason}.` : ".";
  if (delta === 0) return `Charge proposée : ${kg(poids)} kg, comme la dernière fois${pourquoi}`;
  return `Charge proposée : ${kg(poids)} kg${ecart}${pourquoi}`;
}

export const TEXTES_GUIDE = {
  titre: "Comment noter ta séance",
  etapes: [
    "Les charges et les répétitions sont déjà remplies : change-les si tu as fait autrement.",
    "Touche ✓ après chaque série : le repos démarre tout seul.",
    "À la fin, touche « Enregistrer la séance » en bas de l'écran."
  ],
  rpe: "RPE (facultatif) = difficulté de la série sur 10. 10 : impossible d'en faire une de plus. 8 : il t'en restait 2. 7 : il t'en restait 3.",
  exercice: (n, total) => `Exercice ${n}/${total}`,
  termine: "✓ Terminé",
  progression: (faites, total) => `${faites}/${total} séries faites`,
  garder: (poids) => `Garder ${kg(poids)} kg`,
  colonneReps: "Reps",
  colonneSecondes: "Secondes",
  compterEn: "Compter en",
  enReps: "Répétitions",
  enSecondes: "Secondes",
  retirer: (nom) => `Retirer « ${nom} » de la séance ?`,
  ariaRetirer: "Retirer l'exercice",
  dureeAuto: (min) => (min ? `auto : ${min} min` : "auto"),
  aideDuree: "Laisse vide : la durée se calcule depuis le démarrage."
};
