/**
 * Objectif « catégorie de poids » : force athlétique, haltérophilie,
 * sports de combat (boxe, MMA, judo, lutte, taekwondo, JJB), aviron poids
 * léger… La personne donne la limite de sa catégorie, la date de la pesée
 * et son délai avant la compétition ; l'appli calcule le rythme de perte
 * (ou de prise) à tenir et règle ses objectifs nutritionnels dessus.
 *
 * Principes (consensus ACSM : Burke et al. 2021, Curr Sports Med Rep ;
 * Reale et al. 2017, IJSPP et EJSS ; Renner et al. 2025, JISSN ;
 * consensus CIO REDs 2023) :
 *  - l'essentiel se perd LENTEMENT (perte chronique, ~0,5 à 1 % du poids
 *    par semaine) en gardant protéines hautes et entraînement de force ;
 *  - seule une petite marge se gère dans les derniers jours (résidus
 *    digestifs, glycogène, un peu d'eau), d'autant plus petite que la
 *    pesée est proche du combat ;
 *  - jamais de sauna, combinaison de sudation, diurétiques ou
 *    déshydratation sévère : l'appli ne donne AUCUN protocole de
 *    déshydratation et recommande un encadrement.
 */

import { addDays, num, round, todayISO } from "./dates.js";

export const CLE_CATEGORIE = "categoriePoids";

/** Catégories officielles connues (le reste se saisit à la main). */
export const FEDERATIONS = [
  {
    id: "ipf",
    label: "Force athlétique (IPF / FFForce)",
    sport: "force",
    homme: [59, 66, 74, 83, 93, 105, 120],
    femme: [47, 52, 57, 63, 69, 76, 84]
  },
  {
    id: "iwf",
    label: "Haltérophilie (IWF, depuis le 1er août 2026)",
    sport: "force",
    homme: [60, 65, 70, 75, 85, 95, 110],
    femme: [49, 53, 57, 61, 69, 77, 86]
  },
  {
    id: "ijf",
    label: "Judo (IJF)",
    sport: "combat",
    homme: [60, 66, 73, 81, 90, 100],
    femme: [48, 52, 57, 63, 70, 78]
  },
  { id: "libre", label: "Autre sport ou fédération (saisie libre)", sport: "combat", homme: [], femme: [] }
];

export const PESEES = [
  { id: "veille", label: "La veille (environ 24 h avant)" },
  { id: "jour", label: "Le jour même (environ 2 h avant)" }
];

/**
 * Marge geree la derniere semaine SANS manipuler l'eau : contenu digestif
 * (alimentation pauvre en fibres, < 1 %) et glycogene (< 2 % au total),
 * d'apres Renner et al. 2025. Le consensus tolere davantage (jusqu'a 3 %
 * pour une pesee 2 h avant, 5 % pour une pesee la veille) seulement avec
 * un encadrement experimente : l'appli l'indique sans jamais le planifier.
 * Avant 18 ans : 1 % (ACSM 2021).
 */
export const MARGE_FINALE = { veille: 0.02, jour: 0.02 };
export const MARGE_MINEUR = 0.01;
export const MAXIMUM_ENCADRE = { veille: 0.05, jour: 0.03 };

/** Rythme de perte chronique : conseillé, maximum tolérable. */
export const RYTHME_CONSEILLE = 0.75;
export const RYTHME_MAX = 1.0;

const joursEntre = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);

/**
 * Plan pour atteindre la catégorie. Rend null sans données suffisantes.
 *
 * { statut: "dans" | "perte" | "trop-rapide" | "passee", ecartKg, semaines,
 *   rythmePct (perte chronique conseillée, % / semaine), cibleChroniqueKg,
 *   margeKg, messages: [] }
 */
export function planCategorie(objectif, poidsActuel, aujourdhui = todayISO(), personne = {}) {
  const o = objectif || {};
  if (Array.isArray(personne.contraintesSante) && personne.contraintesSante.includes("tca")) {
    return { statut: "bloque", messages: ["Avec un antécédent de trouble alimentaire, la préparation d'une pesée doit se faire avec un professionnel de santé : l'appli ne calcule pas de plan."] };
  }
  const mineur = Number(personne.age) > 0 && Number(personne.age) < 18;
  const limite = num(o.limiteKg);
  const poids = num(poidsActuel);
  if (!(limite > 25) || !(poids > 25) || !o.date) return null;
  const jours = joursEntre(aujourdhui, o.date);
  if (jours < 0) return { statut: "passee", messages: ["La date de pesée est passée : mets-la à jour pour ta prochaine compétition."] };
  const pesee = o.pesee === "jour" ? "jour" : "veille";
  const margeKg = round(limite * (mineur ? MARGE_MINEUR : MARGE_FINALE[pesee]), 1);
  const rythmeMax = mineur ? 0.5 : RYTHME_MAX;
  const ecartKg = round(poids - limite, 1);
  const semaines = Math.max(0, round(jours / 7, 1));

  if (ecartKg <= 0) {
    return {
      statut: "dans",
      ecartKg,
      semaines,
      margeKg,
      rythmePct: null,
      messages: [
        `Tu es dans ta catégorie (${limite} kg) avec ${round(-ecartKg, 1)} kg de marge. Mange à ta maintenance et garde ton poids stable jusqu'à la pesée.`
      ]
    };
  }

  // Ce qu'il faut perdre lentement : tout, sauf la petite marge finale.
  // Il faut avoir fini la perte chronique une semaine avant la pesée.
  const cibleChroniqueKg = round(limite + margeKg, 1);
  const aPerdre = Math.max(0, poids - cibleChroniqueKg);
  const semainesUtiles = Math.max(0.5, semaines - 1);
  const rythmeNecessaire = aPerdre > 0 ? round(((aPerdre / poids) * 100) / semainesUtiles, 2) : 0;

  const messages = [];
  let statut = "perte";
  let rythmePct = rythmeNecessaire > 0 ? Math.max(0.25, Math.min(rythmeMax, rythmeNecessaire)) : null;
  if (rythmeNecessaire > rythmeMax || (ecartKg / poids) * 100 > 10) {
    statut = "trop-rapide";
    const semainesNecessaires = Math.ceil(((aPerdre / poids) * 100) / RYTHME_CONSEILLE) + 1;
    messages.push(
      `Infaisable sans risque : il faudrait perdre ${String(rythmeNecessaire).replace(".", ",")} % de ton poids par semaine${mineur ? " (0,5 % au plus avant 18 ans)" : ""}. Au-delà de 1 %, tu perds force et muscle (Garthe 2011). Vise la catégorie au-dessus, ou une compétition dans ${semainesNecessaires} semaines ou plus.`
    );
  } else if (rythmeNecessaire > RYTHME_CONSEILLE) {
    messages.push(`Rythme exigeant (${String(rythmeNecessaire).replace(".", ",")} %/semaine) : protéines hautes, sommeil et entraînement de force maintenus.`);
  }
  if (aPerdre > 0) {
    messages.push(
      `Objectif : ${String(cibleChroniqueKg).replace(".", ",")} kg une semaine avant la pesée (le ${addDays(o.date, -7).split("-").reverse().join("/")}), en perdant environ ${String(round((poids * (rythmePct || 0)) / 100, 2)).replace(".", ",")} kg par semaine.`
    );
  }
  messages.push(
    `Les derniers ${String(margeKg).replace(".", ",")} kg au plus se gèrent la dernière semaine sans toucher à l'eau : alimentation pauvre en fibres (moins de 10 g/j) les 3 à 4 derniers jours, et glucides réduits les 2 à 3 derniers. Le consensus tolère jusqu'à ${Math.round(MAXIMUM_ENCADRE[pesee] * 100)} % de perte aiguë seulement avec un encadrement expérimenté (ACSM 2021).`,
    "Jamais de sauna, de combinaison de sudation, de laxatifs ni de diurétiques (interdits par l'Agence mondiale antidopage)."
  );
  return { statut, ecartKg, semaines, margeKg, cibleChroniqueKg, rythmePct, rythmeNecessaire, messages };
}

/** Récupération après la pesée (repères de consensus, sans protocole extrême). */
export function apresPesee(pesee) {
  const commun =
    "Après la pesée (ACSM 2021) : boire 125 à 150 % du poids perdu, en commençant par environ 10 ml/kg puis par petites prises, avec du sel (boisson de réhydratation) ; environ 1 g de glucides par kg et par heure au début, 20 à 25 g de protéines par prise, peu de fibres et de graisses.";
  return pesee === "jour" ? commun + " Avec 2 h seulement, la part due à la déshydratation ne doit pas dépasser environ 2 kg." : commun + " Sur 24 h : 5 à 10 g de glucides par kg.";
}

export function categoriesPour(federation, sexe) {
  const f = FEDERATIONS.find((x) => x.id === federation);
  return f ? (sexe === "homme" ? f.homme : f.femme) : [];
}
