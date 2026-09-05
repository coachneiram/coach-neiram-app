/**
 * Records et progression par exercice.
 *
 * Portage fidele de buildRecords (index.html, ligne 3820), isFreshPR
 * (3842) et du calcul de TrainingPerformanceCard (3869).
 *
 * C'est ce qui dit au client qu'il progresse. Se tromper ici, c'est soit
 * annoncer un record qui n'existe pas, soit taire celui qu'il vient de
 * battre — et dans un suivi d'entrainement, le second est plus grave.
 *
 * Le cardio est exclu partout : une charge n'a pas de sens sur un tapis, et
 * l'y inclure produirait des records absurdes.
 */

import { num, round } from "./dates.js";
import { est1RMFromSet } from "./force.js";

/** Cle de regroupement : le nom, insensible a la casse et aux espaces. */
const cleExercice = (nom) => nom.trim().toLocaleLowerCase("fr");

/**
 * Records par exercice : charge maximale, volume maximal, 1RM estime.
 *
 * Le volume tombe sur charge x repetitions quand le nombre de series
 * manque, plutot que de valoir zero : une serie saisie a moitie vaut mieux
 * qu'un record efface.
 */
export function construireRecords(seances) {
  const par = {};

  [...(seances || [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((seance) => {
      (seance.exercises || []).forEach((ex) => {
        if (!ex.name || ex.mode === "cardio") return;

        const charge = num(ex.weight);
        const series = num(ex.sets);
        const reps = num(ex.reps);
        if (!(charge > 0) || !(reps > 0)) return;

        const cle = cleExercice(ex.name);
        const estimation = est1RMFromSet(ex.weight, ex.reps, ex.rpe, ex.rir);
        const volume = series > 0 ? round(charge * series * reps) : round(charge * reps);

        const r =
          par[cle] ||
          (par[cle] = { name: ex.name.trim(), sessions: 0, weight: null, volume: null, oneRM: null, last: null });

        r.sessions++;
        r.last = { date: seance.date, weight: charge, reps };
        if (!r.weight || charge > r.weight.value) r.weight = { value: charge, reps, date: seance.date };
        if (!r.volume || volume > r.volume.value) r.volume = { value: volume, date: seance.date };
        if (estimation && (!r.oneRM || estimation.value > r.oneRM.value)) {
          r.oneRM = { value: estimation.value, method: estimation.method, date: seance.date };
        }
      });
    });

  return Object.values(par);
}

/**
 * Un record est « nouveau » s'il a ete etabli lors de la derniere seance ou
 * l'exercice a ete travaille.
 *
 * La condition « plus d'une seance » evite de feliciter quelqu'un pour son
 * tout premier essai : a la premiere seance, tout est forcement un record.
 */
export const estRecordRecent = (r) =>
  !!(r.last && r.weight && r.weight.date === r.last.date && r.sessions > 1);

/**
 * Progression par exercice : derniere charge, ecart avec la precedente, et
 * si cette seance a battu le record de charge ou de volume.
 *
 * Contrairement aux records, le nombre de series est ici obligatoire :
 * comparer un volume calcule de deux facons differentes n'aurait pas de
 * sens.
 */
export function progressionParExercice(seances) {
  const par = {};

  [...(seances || [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((seance) => {
      (seance.exercises || []).forEach((ex) => {
        if (!ex.name || ex.mode === "cardio") return;

        const charge = num(ex.weight);
        const series = num(ex.sets);
        const reps = num(ex.reps);
        if (!(charge > 0) || !(series > 0) || !(reps > 0)) return;

        const cle = cleExercice(ex.name);
        (par[cle] = par[cle] || []).push({
          name: ex.name.trim(),
          date: seance.date,
          weight: charge,
          volume: round(charge * series * reps)
        });
      });
    });

  return Object.values(par).map((historique) => {
    const derniere = historique[historique.length - 1];
    const precedente = historique.length > 1 ? historique[historique.length - 2] : null;
    const meilleureCharge = Math.max(...historique.map((x) => x.weight));
    const meilleurVolume = Math.max(...historique.map((x) => x.volume));

    return {
      ...derniere,
      previousWeight: precedente ? precedente.weight : null,
      weightDelta: precedente ? round(derniere.weight - precedente.weight, 1) : null,
      isWeightPB: derniere.weight === meilleureCharge,
      isVolumePB: derniere.volume === meilleurVolume
    };
  });
}
