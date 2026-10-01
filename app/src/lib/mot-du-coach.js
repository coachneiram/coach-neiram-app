/**
 * Le mot du coach : une phrase par jour, en haut du Journal.
 *
 * Demande du coach (1er octobre 2026) : ses phrases de motivation,
 * relues et validees par lui une a une (tutoiement, longueur lisible sur
 * un telephone, coherence avec sa methode).
 *
 * Deux regles :
 *
 * 1. LA PHRASE NE CHANGE QU'UNE FOIS PAR JOUR. Rouvrir l'application dans
 *    la journee montre la meme ; le lendemain, la suivante.
 * 2. LA PHRASE DEPEND DE LA SEMAINE DU CLIENT, avec les memes regles que
 *    les trophees (lib/trophees.js) :
 *    - semaine declaree difficile : une phrase qui protege le creneau, et
 *      jamais « Reculer devant l'effort... », qui contredirait le joker ;
 *    - semaine precedente non tenue : une phrase de reprise ;
 *    - sinon : la liste standard.
 *
 * Pour ajouter une phrase : l'ajouter a PHRASES, avec ses contextes. Une
 * phrase sans contexte n'est jamais affichee (verifie par les tests).
 */

import { seriesSemaines } from "./trophees.js";

export const CONTEXTES = ["standard", "reprise", "difficile"];

const S = ["standard"];

export const PHRASES = [
  { texte: "Crois en ton potentiel.", contextes: S },
  { texte: "Ne cesse jamais d'y croire.", contextes: ["standard", "reprise", "difficile"] },
  {
    texte: "Inspire-toi des personnes qui te tirent vers le haut, et la réussite te tendra les bras.",
    contextes: S
  },
  { texte: "Tu créeras le bonheur par ton courage.", contextes: S },
  { texte: "Tu créeras la victoire par ta persévérance et ta détermination.", contextes: S },
  { texte: "Reculer devant l'effort, c'est renoncer au succès.", contextes: S },
  {
    texte: "La force ne vient pas d'une capacité physique, mais d'une volonté.",
    auteur: "Gandhi",
    contextes: S
  },
  { texte: "Tu ne peux pas vivre une vie positive avec un esprit négatif.", contextes: S },
  { texte: "Seul le travail révèle le talent.", contextes: S },
  { texte: "La détermination est le facteur le plus important de la réussite.", contextes: S },
  {
    texte: "Aie de l'ambition, rêve de l'irréalisable. Crois en toi, et pense à ce qui adviendra quand tu l'auras réalisé !",
    contextes: S
  },
  { texte: "Ils parleront de chance pour expliquer ton succès : sois ton seul juge.", contextes: S },
  { texte: "Sois un peu meilleur que la semaine dernière.", contextes: S },
  {
    texte: "Avancer, renouveler sa détermination, apprendre la patience : trois clés pour réussir.",
    contextes: ["standard", "reprise"]
  },
  { texte: "Baraque ou pas, tu peux le faire.", contextes: S },
  {
    texte: "La régularité que tu mettras dans ton entraînement comptera plus que les exercices que tu feras.",
    contextes: S
  },
  { texte: "Tu ne feras pas la différence en faisant comme tous les autres.", contextes: S },
  {
    texte: "Un objectif clair, tenu malgré les difficultés : c'est là que naît la vraie fierté.",
    contextes: S
  },
  {
    texte: "Quand la vie te met à genoux, à toi de choisir de te relever.",
    contextes: ["standard", "reprise", "difficile"]
  },
  {
    texte: "Le succès est l'addition de petits efforts répétés jour après jour.",
    contextes: ["standard", "reprise", "difficile"]
  },
  { texte: "La réussite est savoureuse quand tu pars de rien !", contextes: S },
  { texte: "Semaine chargée ? 20 minutes de maintien gardent ta série en vie.", contextes: ["difficile"] },
  { texte: "Une petite séance faite vaut mieux qu'une grosse séance prévue.", contextes: ["difficile"] },
  {
    texte: "Une semaine ratée arrive à tout le monde. Ce qui compte : reprendre dès cette semaine.",
    contextes: ["reprise"]
  },
  {
    texte: "Protège ton créneau comme un rendez-vous important.",
    contextes: ["standard", "reprise", "difficile"]
  }
];

/**
 * La situation du client cette semaine, d'apres les memes regles que les
 * trophees : semaine difficile declaree, reprise apres une semaine non
 * tenue, ou cas standard. Un nouveau client est toujours en standard.
 */
export function contexteDuJour({ seances, profil, semainesDifficiles, date }) {
  const s = seriesSemaines({ seances, profil, semainesDifficiles, date });
  if (s.enCours.difficile) return "difficile";
  if (s.aDejaCommence && s.semainePrecedente && !s.semainePrecedente.tenue && !s.enCours.tenue) return "reprise";
  return "standard";
}

/** Numero du jour, independant du fuseau : la phrase change a minuit local. */
function numeroDuJour(date) {
  const [a, m, j] = String(date).split("-").map(Number);
  return Math.round(Date.UTC(a, m - 1, j) / 864e5);
}

/** La phrase du jour pour un contexte donne. */
export function motDuCoach({ date, contexte = "standard" }) {
  const liste = PHRASES.filter((p) => p.contextes.includes(contexte));
  const pool = liste.length ? liste : PHRASES.filter((p) => p.contextes.includes("standard"));
  return pool[((numeroDuJour(date) % pool.length) + pool.length) % pool.length];
}
