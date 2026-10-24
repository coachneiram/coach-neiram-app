/**
 * Programmes guides pour se (re)mettre en mouvement, inspires de Runna,
 * Nike Run Club et surtout du programme public « Couch to 5K » du NHS :
 * progression tres graduelle, alternance course / marche, 3 seances par
 * semaine avec un jour de repos entre deux.
 *
 * Pourquoi c'est la bonne approche pour un public sedentaire : l'abandon
 * d'un programme de course vient surtout d'une charge qui monte trop vite
 * (douleurs, decouragement). Les semaines courtes et repetables limitent ce
 * risque ; la recommandation classique est de ne pas augmenter le volume de
 * plus de 10 % environ par semaine (repere de terrain, preuves modestes :
 * Nielsen et al. 2014 suggerent plutot de surveiller les hausses de plus de
 * 30 % en 2 semaines).
 *
 * « Marche active » vise directement le repere de l'OMS (150 min par
 * semaine) en 6 semaines.
 *
 * Etat : « cn_programme_sport » = { id, debut, faites: ["1-1", "1-2", …] }.
 * Repris de l'app Neiram le 24/10/2026 : dans l'app coach, tout le
 * programme est inclus (SEMAINES_GRATUITES n'y sert plus).
 */

import { todayISO } from "./dates.js";

export const CLE_PROGRAMME_SPORT = "cn_programme_sport";
/** Programmes termines : [{ id, date }] (badge « Programmes guides »). */
export const CLE_PROGRAMMES_TERMINES = "cn_programmes_termines";

export function ajouterTermine(liste, id, date = todayISO()) {
  const l = Array.isArray(liste) ? liste.filter((x) => x && x.id) : [];
  return [...l, { id, date }];
}
export const SEMAINES_GRATUITES = 2;

const ECHAUFFEMENT = "5 min de marche rapide, puis ";
const RETOUR = ", et 5 min de marche pour finir.";

const course = (texte, duree) => ({ texte: ECHAUFFEMENT + texte + RETOUR, duree });

export const PROGRAMMES_SPORT = [
  {
    id: "0-5km",
    titre: "De 0 à 5 km",
    emoji: "🏃",
    sport: "course",
    resume: "Courir 30 minutes sans t'arrêter en 9 semaines, en alternant course et marche. 3 séances par semaine.",
    conseil: "Cours lentement : tu dois pouvoir parler. Une semaine trop dure ? Refais-la avant de passer à la suivante.",
    semaines: [
      Array(3).fill(course("8 fois : 1 min de course, 1 min 30 de marche", 30)),
      Array(3).fill(course("6 fois : 1 min 30 de course, 2 min de marche", 31)),
      Array(3).fill(course("2 fois : 1 min 30 de course, 1 min 30 de marche, 3 min de course, 3 min de marche", 28)),
      Array(3).fill(course("3 min de course, 1 min 30 de marche, 5 min de course, 2 min 30 de marche, 3 min de course, 1 min 30 de marche, 5 min de course", 32)),
      [course("3 fois : 5 min de course, 3 min de marche", 34), course("2 fois : 8 min de course, 5 min de marche", 36), course("20 min de course sans marcher", 30)],
      [course("5 min de course, 3 min de marche, 8 min de course, 3 min de marche, 5 min de course", 34), course("2 fois : 10 min de course, 3 min de marche", 36), course("25 min de course", 35)],
      Array(3).fill(course("25 min de course", 35)),
      Array(3).fill(course("28 min de course", 38)),
      Array(3).fill(course("30 min de course : tu y es !", 40))
    ]
  },
  {
    id: "marche-active",
    titre: "Marche active",
    emoji: "🚶",
    sport: "marche-rapide",
    resume: "Atteindre 150 minutes d'activité par semaine, le repère de l'OMS, en 6 semaines de marche rapide.",
    conseil: "Marche rapide = tu peux parler mais pas chanter. Après un repas, 10 minutes comptent déjà.",
    semaines: [
      Array(3).fill({ texte: "15 min de marche à bon rythme.", duree: 15 }),
      Array(3).fill({ texte: "20 min de marche à bon rythme.", duree: 20 }),
      Array(4).fill({ texte: "20 min de marche rapide.", duree: 20 }),
      Array(4).fill({ texte: "25 min de marche rapide, dont 5 min en côte ou en escaliers si possible.", duree: 25 }),
      Array(5).fill({ texte: "25 min de marche rapide.", duree: 25 }),
      Array(5).fill({ texte: "30 min de marche rapide : 150 min cette semaine, repère OMS atteint !", duree: 30 })
    ]
  },
  {
    id: "5-10km",
    titre: "De 5 à 10 km",
    emoji: "🏅",
    sport: "course",
    resume: "Tu cours 30 min ? Passe à 10 km en 8 semaines : footing, fractionné court et sortie longue.",
    conseil: "80 % de tes séances doivent rester faciles. Le fractionné se fait à une allure soutenue mais tenable.",
    semaines: [
      [{ texte: "Footing facile 30 min.", duree: 30 }, { texte: "Fractionné : 15 min de footing, 6 × 1 min rapide / 1 min lente, 5 min de retour au calme.", duree: 32, fractionne: true }, { texte: "Sortie longue facile 40 min.", duree: 40 }],
      [{ texte: "Footing facile 30 min.", duree: 30 }, { texte: "Fractionné : 15 min de footing, 8 × 1 min rapide / 1 min lente, 5 min de retour au calme.", duree: 36, fractionne: true }, { texte: "Sortie longue facile 45 min.", duree: 45 }],
      [{ texte: "Footing facile 35 min.", duree: 35 }, { texte: "Fractionné : 15 min de footing, 5 × 2 min rapide / 1 min 30 lente, 5 min de retour au calme.", duree: 38, fractionne: true }, { texte: "Sortie longue facile 50 min.", duree: 50 }],
      [{ texte: "Footing facile 30 min (semaine allégée).", duree: 30 }, { texte: "Footing facile 30 min avec 4 accélérations de 20 s.", duree: 30 }, { texte: "Sortie longue facile 45 min.", duree: 45 }],
      [{ texte: "Footing facile 35 min.", duree: 35 }, { texte: "Fractionné : 15 min de footing, 4 × 4 min au seuil / 2 min lente, 5 min de retour au calme.", duree: 44, fractionne: true }, { texte: "Sortie longue facile 55 min.", duree: 55 }],
      [{ texte: "Footing facile 40 min.", duree: 40 }, { texte: "Fractionné : 15 min de footing, 3 × 6 min au seuil / 2 min lente, 5 min de retour au calme.", duree: 44, fractionne: true }, { texte: "Sortie longue facile 60 min.", duree: 60 }],
      [{ texte: "Footing facile 35 min.", duree: 35 }, { texte: "Fractionné : 15 min de footing, 2 × 10 min à l'allure visée sur 10 km / 3 min lente.", duree: 43, fractionne: true }, { texte: "Sortie longue facile 50 min.", duree: 50 }],
      [{ texte: "Footing facile 25 min.", duree: 25 }, { texte: "Footing 20 min avec 4 accélérations de 20 s.", duree: 20 }, { texte: "Ton 10 km ! Pars prudemment, accélère sur la fin.", duree: 60, competition: true }]
    ]
  }
];

export const programmeParId = (id) => PROGRAMMES_SPORT.find((p) => p.id === id) || null;

/** Etat propre (programme connu, liste de seances faites). */
export function normaliserEtat(brut) {
  if (!brut || !programmeParId(brut.id)) return null;
  return {
    id: brut.id,
    debut: typeof brut.debut === "string" ? brut.debut : todayISO(),
    faites: Array.isArray(brut.faites) ? brut.faites.filter((x) => typeof x === "string") : []
  };
}

export const demarrer = (id, aujourdhui = todayISO()) => (programmeParId(id) ? { id, debut: aujourdhui, faites: [] } : null);

/** Liste a plat des seances : { cle: "3-2", semaine, numero, texte, duree }. */
export function seancesDu(programme) {
  const sortie = [];
  (programme ? programme.semaines : []).forEach((sem, i) =>
    sem.forEach((s, j) => sortie.push({ ...s, cle: `${i + 1}-${j + 1}`, semaine: i + 1, numero: j + 1, parSemaine: sem.length }))
  );
  return sortie;
}

/** Prochaine seance a faire, avancement, et fin du programme. */
export function avancement(etat) {
  const e = normaliserEtat(etat);
  if (!e) return null;
  const p = programmeParId(e.id);
  const toutes = seancesDu(p);
  const faites = new Set(e.faites);
  const prochaine = toutes.find((s) => !faites.has(s.cle)) || null;
  const nbFaites = toutes.filter((s) => faites.has(s.cle)).length;
  return {
    programme: p,
    prochaine,
    faites: nbFaites,
    total: toutes.length,
    pct: Math.round((nbFaites / toutes.length) * 100),
    termine: !prochaine,
    gratuite: !prochaine || prochaine.semaine <= SEMAINES_GRATUITES
  };
}

export function marquerFaite(etat, cle) {
  const e = normaliserEtat(etat);
  if (!e || e.faites.includes(cle)) return e;
  return { ...e, faites: [...e.faites, cle] };
}

/** Activite pre-remplie pour noter la seance (lib/activites.js). */
export function activiteDeSeance(programme, seance) {
  const details = {};
  if (programme.sport === "course") {
    details.type = seance.competition ? "competition" : seance.fractionne || /fois/.test(seance.texte) ? "fractionne" : "footing";
    if (details.type === "fractionne") details.structure = seance.texte.replace(ECHAUFFEMENT, "").replace(RETOUR, "").slice(0, 80);
  }
  return { id: programme.sport, duree: seance.duree, details };
}
