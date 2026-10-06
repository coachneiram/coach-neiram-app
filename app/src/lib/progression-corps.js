/**
 * Progression du corps depuis la premiere mesure : poids et mensurations.
 *
 * Ajout du 6 octobre 2026, a la demande du coach : le client qui saisit ses
 * mensurations doit VOIR qu'il progresse, en un coup d'oeil, dans
 * Mensurations, dans Tendances et dans le bilan envoye au coach.
 *
 * Trois regles :
 *   - on compare la derniere valeur a la PREMIERE, pas a la precedente :
 *     d'une prise a l'autre, un tour de taille bouge de quelques
 *     millimetres, ce qui ne motive personne et se lit mal ;
 *   - le « bon sens » d'un ecart depend de l'objectif du client : -3 cm de
 *     tour de bras est un recul en prise de masse, pas en perte de poids.
 *     Sans objectif tranche (maintien, performance), aucun ecart n'est
 *     qualifie ;
 *   - la phrase de felicitation ne celebre jamais un ecart dans le mauvais
 *     sens : a defaut de progres, elle encourage sans mentir.
 */

import { fmtDateLong, round } from "./dates.js";
import { MEASUREMENT_FIELDS } from "./mensurations.js";

/** Le poids d'abord : c'est le chiffre que le client regarde en premier. */
export const GRANDEURS_SUIVIES = [
  { id: "poids", label: "Poids", unite: "kg" },
  ...MEASUREMENT_FIELDS.map((f) => ({ ...f, unite: "cm" }))
];

/** -1 : on veut voir baisser ; +1 : on veut voir monter ; absent : neutre. */
const SENS_SOUHAITE = {
  perte: { poids: -1, taille: -1, hanches: -1, poitrine: -1, cuisseD: -1, cuisseG: -1 },
  prise: { poids: 1, poitrine: 1, brasD: 1, brasG: 1, cuisseD: 1, cuisseG: 1, molletD: 1, molletG: 1 }
};

/** Nombre a la francaise, signe explicite : « +1,5 », « −3 », « 0 ». */
export function fmtEcart(v) {
  if (v == null) return "";
  const abs = String(round(Math.abs(v), 1)).replace(".", ",");
  return v > 0 ? `+${abs}` : v < 0 ? `−${abs}` : "0";
}

/** Nombre a la francaise sans signe : « 84,5 ». */
export const fmtValeur = (v) => (v == null ? "" : String(round(v, 1)).replace(".", ","));

/**
 * Serie chronologique d'une grandeur, une valeur par date. Deux saisies le
 * meme jour : la derniere l'emporte, comme dans le journal corporel.
 */
function serieDe(id, mesures, corps, jusquA) {
  const source = id === "poids" ? corps : mesures;
  const champ = id === "poids" ? "weightKg" : id;
  const parDate = new Map();
  (source || [])
    .filter((x) => x && x.date && x[champ] != null && x[champ] !== "" && !Number.isNaN(Number(x[champ])))
    .filter((x) => !jusquA || x.date <= jusquA)
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((x) => parDate.set(x.date, Number(x[champ])));
  return [...parDate].map(([date, value]) => ({ date, value }));
}

/**
 * Progression de chaque grandeur suivie, de la premiere a la derniere
 * valeur connue (au plus tard `jusquA`, pour un bilan de semaine passee).
 * Une grandeur mesuree une seule fois n'a pas de progression : elle est
 * absente plutot qu'affichee avec un ecart nul trompeur.
 */
export function progressionCorps({ mesures, corps, objectif, jusquA = null } = {}) {
  const sens = SENS_SOUHAITE[objectif] || {};
  const lignes = GRANDEURS_SUIVIES.map((g) => {
    const serie = serieDe(g.id, mesures, corps, jusquA);
    if (serie.length < 2) return null;
    const depart = serie[0];
    const actuel = serie[serie.length - 1];
    const ecart = round(actuel.value - depart.value, 1);
    const voulu = sens[g.id];
    return {
      id: g.id,
      label: g.label,
      unite: g.unite,
      depart: depart.value,
      dateDepart: depart.date,
      actuel: actuel.value,
      dateActuelle: actuel.date,
      ecart,
      sens: !voulu || ecart === 0 ? "neutre" : ecart * voulu > 0 ? "bon" : "oppose",
      serie
    };
  }).filter(Boolean);

  const depuis = lignes.length ? lignes.map((l) => l.dateDepart).sort()[0] : null;
  const datesPrises = new Set((mesures || []).filter((m) => !jusquA || m.date <= jusquA).map((m) => m.date));

  return { lignes, depuis, nbPrises: datesPrises.size, titre: phrase(lignes, objectif, depuis, datesPrises.size) };
}

/**
 * La phrase en tete de carte. Elle additionne les centimetres des seuls
 * tours qui comptent pour l'objectif : en perte, taille, hanches, poitrine
 * et cuisses ; en prise, bras, poitrine, cuisses et mollets.
 */
function phrase(lignes, objectif, depuis, nbPrises) {
  if (!lignes.length) return null;
  const date = fmtDateLong(depuis);
  const voulu = SENS_SOUHAITE[objectif];
  const poids = lignes.find((l) => l.id === "poids");

  if (voulu) {
    const s = objectif === "perte" ? -1 : 1;
    const tours = lignes.filter((l) => l.unite === "cm" && voulu[l.id] === s);
    const totalCm = round(tours.reduce((t, l) => t + l.ecart, 0), 1);
    const morceaux = [];
    if (totalCm * s > 0) morceaux.push(`${fmtEcart(totalCm)} cm au total`);
    if (poids && poids.sens === "bon") morceaux.push(`${fmtEcart(poids.ecart)} kg`);
    if (morceaux.length) return `${morceaux.join(" et ")} depuis le ${date}. Continue, ça se voit !`;
  }

  if (objectif === "maintien" && poids && Math.abs(poids.ecart) <= 1) {
    return `Poids stable (${fmtEcart(poids.ecart)} kg) depuis le ${date} : objectif tenu.`;
  }

  // Les pesees comptent aussi : un client qui ne prend que son poids a
  // quand meme plusieurs mesures a son actif.
  const n = Math.max(nbPrises, ...lignes.map((l) => l.serie.length));
  return `${n} mesures depuis le ${date} : chaque prise rend ta progression plus lisible. Continue !`;
}

/**
 * Points d'une mini-courbe (attribut `points` d'une polyline SVG), tracee
 * dans un cadre largeur x hauteur avec une marge pour l'epaisseur du trait.
 * Une serie plate est centree plutot que collee au bord.
 */
export function pointsMiniCourbe(valeurs, largeur = 100, hauteur = 28, marge = 2) {
  const v = (valeurs || []).filter((x) => x != null);
  if (v.length < 2) return "";
  const mn = Math.min(...v);
  const mx = Math.max(...v);
  const h = hauteur - 2 * marge;
  const w = largeur - 2 * marge;
  const y = (x) => (mx === mn ? hauteur / 2 : marge + (1 - (x - mn) / (mx - mn)) * h);
  return v.map((x, i) => `${round(marge + (i / (v.length - 1)) * w, 1)},${round(y(x), 1)}`).join(" ");
}
