/**
 * Calcul de la charge en mode Force : % 1RM, RIR, table RPE.
 *
 * Fonction de l'ancienne application (index.html, PowerliftingFields,
 * l. 4000-4013) perdue a la migration, et rebranchee ici (22 octobre 2026).
 *
 * Deux propositions, chacune avec son bouton « appliquer » :
 *  1. DEPUIS LA TABLE RPE : repetitions + RPE (ou RIR) de la serie de
 *     reference donnent un % du 1RM (« 5 reps @ RPE 8 = 81,1 % »), puis une
 *     charge si le maxi du mouvement est connu ;
 *  2. DEPUIS LE % 1RM saisi : « 80 % de 140 kg = 112,5 kg ».
 * Sans maxi pour un mouvement de competition, une aide explique ou le
 * renseigner.
 *
 * Les maxis sont ceux de la carte « Force athletique » (cle cn_pl_1rm).
 * Les calculs eux-memes sont dans force.js (pctFromRPE, rpeFromRIR,
 * chargeFrom1RM), deja testes ; ce fichier ne fait que les assembler.
 *
 * Aucune donnee n'est convertie : les champs pct1rm et rir existaient
 * deja dans le format des exercices.
 *
 * Meme fichier que dans l'app grand public (neiram-app-public), pour que
 * les ameliorations se reportent d'une app a l'autre.
 */

import { num } from "./dates.js";
import { chargeFrom1RM, mouvementForce, pctFromRPE, rpeFromRIR } from "./force.js";
import { avecSeries, serieDeReference, seriesDe } from "./series.js";

const vide = (v) => v === "" || v == null;

/** Nombre a la francaise, sans zero inutile : 112,5 · 80 · 81,1. */
export const fmtNombre = (n) => String(Math.round(num(n) * 10) / 10).replace(".", ",");

/**
 * Aide affichee quand le maxi d'un mouvement de competition manque.
 *
 * index.html disait « Maxis & progression » ; la carte s'appelle
 * aujourd'hui « Force athlétique — maxis & progression », et son debut est
 * ce que le client repere en premier. Libelle aligne sur l'app grand public.
 */
export const AIDE_MAXI_MANQUANT =
  "Renseigne le 1RM de ce mouvement dans « Force athlétique » pour calculer la charge automatiquement.";

/**
 * Les propositions de charge pour un exercice en mode Force.
 *
 * Rend { mouvement, maxi, table, depuisPct, maxiManquant } :
 *  - table : { pct, charge, reps, rpe, libelle } ou null ;
 *  - depuisPct : { pct, charge, libelle } ou null ;
 *  - maxiManquant : vrai pour un mouvement de competition sans maxi.
 */
export function propositionsCharge(ex, maxis) {
  const mouvement = mouvementForce(ex && ex.name);
  const maxi = mouvement && num(maxis && maxis[mouvement]) > 0 ? num(maxis[mouvement]) : null;

  // Repetitions et RPE : ceux de la serie de reference (la plus lourde),
  // a defaut ceux de l'exercice. Le RIR ne sert que sans RPE.
  const ref = serieDeReference(seriesDe(ex)) || {};
  const reps = !vide(ref.reps) ? ref.reps : ex && ex.reps;
  const rpeSaisi = !vide(ref.rpe) ? ref.rpe : ex && !vide(ex.rpe) ? ex.rpe : null;
  const rpe = rpeSaisi != null ? Math.round(num(rpeSaisi) * 2) / 2 : rpeFromRIR(ex && ex.rir);

  let table = null;
  const pctTable = rpe != null ? pctFromRPE(rpe, reps) : null;
  if (pctTable != null) {
    const charge = chargeFrom1RM(pctTable, maxi);
    const n = Math.round(num(reps));
    table = {
      pct: pctTable,
      charge,
      reps: n,
      rpe,
      libelle:
        `Table RPE : ${n} rep${n > 1 ? "s" : ""} @ RPE ${fmtNombre(rpe)} = ${fmtNombre(pctTable)} %` +
        (charge != null ? ` = ${fmtNombre(charge)} kg` : "") +
        " — appliquer"
    };
  }

  let depuisPct = null;
  const chargePct = chargeFrom1RM(ex && ex.pct1rm, maxi);
  if (chargePct != null) {
    depuisPct = {
      pct: num(ex.pct1rm),
      charge: chargePct,
      libelle: `${fmtNombre(ex.pct1rm)} % de ${fmtNombre(maxi)} kg = ${fmtNombre(chargePct)} kg — appliquer`
    };
  }

  return { mouvement, maxi, table, depuisPct, maxiManquant: Boolean(mouvement) && maxi == null };
}

/**
 * Correctif a appliquer a l'exercice quand le client touche « appliquer ».
 *
 * Le % 1RM est toujours note. La charge, si elle est connue, va dans
 * toutes les series PAS ENCORE FAITES : une serie deja cochee garde la
 * charge reellement soulevee.
 */
export function appliquerProposition(ex, { pct, charge }) {
  const correctif = { pct1rm: String(pct) };
  if (charge == null) return correctif;
  const series = seriesDe(ex).map((s) => (s.fait ? s : { ...s, weight: String(charge) }));
  return { ...correctif, ...avecSeries(series) };
}
