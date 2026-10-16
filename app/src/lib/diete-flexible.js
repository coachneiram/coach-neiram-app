/**
 * Diete flexible : le budget calorique se lit a la semaine.
 *
 * Demande du coach du 14 octobre 2026 : rassurer le client. Ce qui compte
 * est le total de la journee, pas la repartition par repas ; et mieux
 * encore, le total de la semaine. Un ecart (une raclette en famille) se
 * lisse sur les jours suivants, sans jeuner le lendemain : c'est la
 * frustration qui fait craquer, pas un repas de fete.
 *
 * Garde-fous, parce qu'un lissage mal borne devient une restriction :
 * - un jour « rattrape » ne descend jamais sous PLANCHER de l'objectif ; ce
 *   qui ne tient pas dans la semaine en cours n'est pas reporte sur elle ;
 * - une marge (journees plus legeres) ne pousse pas au-dela de PLAFOND :
 *   manger beaucoup plus pour « rattraper » une sous-alimentation n'a
 *   rien de flexible ;
 * - un jour passe sans saisie compte a l'objectif : on ne sait pas ce qui
 *   a ete mange, et le compter a zero inventerait une grosse marge.
 */

import { addDays, num, round } from "./dates.js";
import { getWeekKey } from "./semaine.js";

export const PLANCHER = 0.8;
export const PLAFOND = 1.15;

/** Une calorie de trop n'est pas du gras : 7 700 kcal font environ 1 kg de graisse. */
export const KCAL_PAR_KG_GRAISSE = 7700;

/** Ecart sous lequel on parle d'une semaine « dans les clous ». */
const TOLERANCE = 0.03;

/**
 * Etat de la semaine en cours (du lundi au dimanche).
 *
 * Rend null sans objectif calorique. Les jours passes comptent ce qui a ete
 * note (ou l'objectif, s'il n'y a rien) ; aujourd'hui et la suite forment
 * les jours restants, sur lesquels l'ecart se repartit.
 */
export function budgetSemaine({ entrees, objectif, aujourdhui }) {
  const cible = Math.round(num(objectif));
  if (!cible) return null;

  const lundi = getWeekKey(aujourdhui);
  const parJour = new Map();
  (entrees || []).forEach((e) => {
    if (!e || !e.date || e.date < lundi || e.date > addDays(lundi, 6)) return;
    parJour.set(e.date, (parJour.get(e.date) || 0) + num(e.calories));
  });

  const jours = [];
  let ecart = 0;
  let joursNotes = 0;
  let joursSansSaisie = 0;
  for (let k = 0; k < 7; k++) {
    const d = addDays(lundi, k);
    const note = parJour.has(d) ? Math.round(parJour.get(d)) : null;
    if (d < aujourdhui) {
      if (note != null) {
        ecart += note - cible;
        joursNotes++;
      } else {
        joursSansSaisie++;
      }
    }
    jours.push({ date: d, kcal: note, passe: d < aujourdhui, aujourdhui: d === aujourdhui });
  }

  const joursRestants = jours.filter((j) => !j.passe).length;
  const brut = cible - ecart / joursRestants;
  const conseilJour = Math.round(Math.min(cible * PLAFOND, Math.max(cible * PLANCHER, brut)) / 10) * 10;
  // Ce qui ne tient pas dans la semaine sans passer sous le plancher.
  const reste = brut < cible * PLANCHER ? Math.round(ecart - cible * (1 - PLANCHER) * joursRestants) : 0;

  let etat = "equilibre";
  if (ecart > cible * TOLERANCE) etat = "surplus";
  else if (ecart < -cible * TOLERANCE) etat = "marge";

  return {
    cible,
    budget: cible * 7,
    jours,
    ecart: Math.round(ecart),
    joursNotes,
    joursSansSaisie,
    joursRestants,
    conseilJour,
    reste,
    etat,
    grasMaxG: ecart > 0 ? Math.round((ecart / KCAL_PAR_KG_GRAISSE) * 1000) : 0
  };
}

const fr = (n) => Math.round(n).toLocaleString("fr-FR");

/** La phrase qui accompagne l'etat de la semaine. */
export function messageSemaine(b) {
  if (!b) return null;
  const restants = `${b.joursRestants} jour${b.joursRestants > 1 ? "s" : ""}`;
  if (b.etat === "surplus") {
    const base = `Tu as ${fr(b.ecart)} kcal d'avance sur ta semaine. Pas besoin de jeûner : vise environ ${fr(b.conseilJour)} kcal par jour sur les ${restants} qui restent, et garde tes protéines.`;
    return b.reste > 0
      ? `${base} Le reste (${fr(b.reste)} kcal) se lisse la semaine prochaine : environ ${fr(b.reste / 7)} kcal de moins par jour, jamais sous ${fr(b.cible * PLANCHER)}.`
      : base;
  }
  if (b.etat === "marge") {
    return `Tu as ${fr(-b.ecart)} kcal de marge sur ta semaine : tu peux viser jusqu'à ${fr(b.conseilJour)} kcal par jour sur les ${restants} qui restent, un repas plus généreux compris.`;
  }
  return `Ta semaine est dans les clous : continue autour de ${fr(b.cible)} kcal par jour.`;
}

/*
 * Les regles de la diete flexible, chiffrees sur l'objectif du client.
 *
 * Retour du coach du 16 octobre 2026 : l'exemple ecrit sur ses 3 000 kcal
 * (« 6 repas de 500 », « 4 000 au lieu de 3 000 ») ne parlait pas a une
 * cliente a 1 500 kcal. Les proportions sont celles de l'exemple du coach :
 * - un ecart de fete d'environ un tiers de la journee (1 000 sur 3 000),
 *   lisse sur les 5 jours suivants ;
 * - un plaisir prevu de 7 a 10 % de la journee (200 a 300 sur 3 000) ;
 * - environ 5 kcal par gramme de M&M's (480 a 500 kcal pour 100 g).
 */

/** Objectif pris pour les exemples quand le profil n'en donne pas. */
export const OBJECTIF_EXEMPLE = 3000;
export const PART_ECART = 1 / 3;
export const PART_PLAISIR = [0.07, 0.1];
const KCAL_PAR_G_MMS = 5;

const arrondi = (v, pas) => Math.round(v / pas) * pas;

/** Les chiffres des exemples, pour un objectif donne. */
export function chiffresExemples(objectif) {
  const cible = arrondi(num(objectif) > 0 ? num(objectif) : OBJECTIF_EXEMPLE, 10);
  const ecart = Math.max(100, arrondi(cible * PART_ECART, 100));
  const plaisirMin = Math.max(50, arrondi(cible * PART_PLAISIR[0], 50));
  const plaisirMax = Math.max(plaisirMin, arrondi(cible * PART_PLAISIR[1], 50));
  const plaisirMilieu = (plaisirMin + plaisirMax) / 2;
  return {
    cible,
    sixRepas: arrondi(cible / 6, 10),
    troisRepas: arrondi(cible / 3, 10),
    ecart,
    ecartParJour: arrondi(ecart / 5, 10),
    plaisirMin,
    plaisirMax,
    mmsGrammes: Math.max(10, arrondi(plaisirMilieu / KCAL_PAR_G_MMS, 5)),
    mmsKcal: arrondi(Math.max(10, arrondi(plaisirMilieu / KCAL_PAR_G_MMS, 5)) * KCAL_PAR_G_MMS, 10)
  };
}

/** Les 5 regles, [titre, texte], avec les chiffres du client. */
export function reglesDieteFlexible(objectif) {
  const c = chiffresExemples(objectif);
  const plaisir = c.plaisirMin === c.plaisirMax ? `environ ${fr(c.plaisirMin)} kcal` : `${fr(c.plaisirMin)} à ${fr(c.plaisirMax)} kcal`;
  return [
    [
      "Ton total de la journée compte, pas la répartition.",
      `Tes ${fr(c.cible)} kcal en 6 repas de ${fr(c.sixRepas)} ou en 3 repas de ${fr(c.troisRepas)}, c'est pareil. Mange au rythme qui te va.`
    ],
    [
      "Mieux encore : lisse sur la semaine.",
      "Un jour un peu au-dessus, un autre un peu en dessous : c'est ta moyenne de la semaine qui fait le résultat."
    ],
    [
      "Prévois ton plaisir.",
      `Garde ${plaisir} par jour pour ce qui te fait envie, par exemple ${fr(c.mmsGrammes)} g de M&M's (environ ${fr(c.mmsKcal)} kcal). Un plaisir prévu évite de craquer.`
    ],
    [
      "Un écart ? Pas de jeûne le lendemain.",
      `Raclette en famille, resto, anniversaire : répartis le surplus sur les jours suivants. ${fr(c.cible + c.ecart)} kcal au lieu de ${fr(c.cible)}, c'est ${fr(c.ecartParJour)} kcal de moins sur les 5 jours d'après, pas une journée sans manger.`
    ],
    [
      "Garde tes protéines chaque jour,",
      "même quand tu lisses : ce sont elles qui protègent tes muscles et ta satiété."
    ]
  ];
}
