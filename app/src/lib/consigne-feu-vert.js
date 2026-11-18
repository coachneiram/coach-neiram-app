/**
 * Contexte Feu Vert ajouté à la consigne du Coach IA (18 novembre 2026).
 *
 * POURQUOI CE FICHIER
 *
 * L'assistant IA (lib/consigne-coach.js, écran CoachIA.jsx) ne savait rien
 * de Feu Vert : ni la formule, ni la semaine du cycle, ni les 8 gestes, ni
 * le Passeport. Un membre Feu Vert qui l'interrogeait sur son entraînement
 * recevait une réponse générique, qui pouvait contredire le programme
 * (autre exercice, charge augmentée sur un geste rouge) ou valider à la
 * place de Marien un geste qu'il n'a pas vu.
 *
 * CE QUI PART DANS LA CONSIGNE, et seulement si le profil est en formule
 * Feu Vert : parcours, cohorte, semaine du cycle, les 8 gestes dans l'ordre,
 * leur couleur au Passeport (fixée par Marien), les règles du programme.
 *
 * CE QUI N'Y PART JAMAIS : poids, mensurations, photos, check-in, douleurs
 * déclarées, charges, nom ou téléphone. Aucune donnée de santé : seul l'état
 * technique des gestes, qui ne dit rien du corps du membre.
 *
 * Le texte des règles reprend ce qui est vendu (lib/feu-vert.js,
 * REGLES_FEU_VERT et TEXTES_VIDEO ; décision de Marien du 18/11/2026 pour
 * la fente statique et la presse à cuisses). L'IA ne valide jamais un
 * geste ni une couleur : elle renvoie vers Marien.
 */

import { CONTENU_FEU_VERT, ETATS_GESTE, etatGeste, feuVertActif, libelleParcours, NB_SEMAINES, normaliserPasseport, reglagesFeuVert, semaineFeuVert } from "./feu-vert.js";
import { fmtDateLong } from "./dates.js";

/**
 * Noms des 8 gestes tels que l'IA doit les employer, dans l'ordre du
 * programme. Les identifiants sont vérifiés contre CONTENU_FEU_VERT par les
 * tests : un geste renommé dans le contenu sans l'être ici fait échouer la
 * suite, plutôt que de laisser l'IA parler d'un geste qui n'existe plus.
 */
export const GESTES_IA_FEU_VERT = [
  { id: "squat", nom: "squat gobelet" },
  { id: "rdl", nom: "soulevé de terre roumain aux haltères" },
  { id: "rowing", nom: "rowing haltère un bras" },
  { id: "developpe", nom: "développé couché aux haltères" },
  { id: "fente", nom: "fente statique" },
  { id: "gainage", nom: "gainage planche" },
  { id: "tirage", nom: "tirage vertical à la poulie" },
  { id: "presse", nom: "presse à cuisses" }
];

/** Où en est le cycle, en une phrase. */
function ligneSemaine(reglages, aujourdhui) {
  const info = semaineFeuVert(reglages.debut, aujourdhui);
  if (info.etat === "avant") {
    return `Le cycle n'a pas commencé : il démarre le ${fmtDateLong(reglages.debut)} (dans ${info.joursAvant} jour${info.joursAvant > 1 ? "s" : ""}).`;
  }
  if (info.etat === "termine") return `Le cycle de ${NB_SEMAINES} semaines est terminé.`;
  return `Semaine du cycle : ${info.numero} sur ${NB_SEMAINES}.`;
}

/**
 * Bloc de consigne Feu Vert, ou chaîne vide si le profil n'est pas en
 * formule Feu Vert (rien n'est ajouté pour les autres clients).
 *
 * `passeport` : celui que sert le Worker (lireFeuVert().serveur.passeport),
 * normalisé ici (ancien identifiant « hipthrust » compris). Absent : tous
 * les gestes sont rouges, comme à l'écran.
 * `aujourdhui` : date ISO locale (todayISO()).
 */
export function contexteFeuVert(profile, { passeport, aujourdhui } = {}) {
  if (!feuVertActif(profile)) return "";
  const reglages = reglagesFeuVert(profile);
  const p = normaliserPasseport(passeport);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(aujourdhui || "")) ? aujourdhui : reglages.debut;

  const gestes = GESTES_IA_FEU_VERT.map((g, i) => `${i + 1}. ${g.nom}`).join(" ; ");
  const couleurs = GESTES_IA_FEU_VERT.map((g, i) => `${i + 1}. ${g.nom} : ${ETATS_GESTE[etatGeste(p, g.id)].label.toLowerCase()}`).join(" ; ");

  return [
    "",
    "FEU VERT (ce client suit la formule Feu Vert : coaching collectif en ligne pour débutants en salle, cycle de " + NB_SEMAINES + " semaines) :",
    `Parcours : ${libelleParcours(reglages.parcours)}. Cohorte ${reglages.cohorte}.`,
    ligneSemaine(reglages, date),
    "Programme : 2 séances par semaine (séance A et séance B), plus 1 séance bonus facultative à partir de la semaine 4.",
    "Les 8 gestes, dans l'ordre : " + gestes + ".",
    "Passeport (couleurs fixées par Marien après correction vidéo, à citer telles quelles) : " + couleurs + ".",
    "Couleurs : rouge = charge bloquée, version facilitée possible ; orange = charge bloquée, une correction précise de Marien à appliquer ; vert = le geste entre dans la règle de progression. On n'augmente la charge QUE sur un geste vert.",
    "",
    "RÈGLES FEU VERT :",
    "- Les corrections de technique sont faites par Marien, sur les vidéos que le client lui envoie par WhatsApp depuis l'onglet Feu Vert (2 vidéos maximum par semaine). Tu ne valides JAMAIS un geste, une technique ni une couleur, et tu ne dis jamais qu'un geste est prêt à passer à l'orange ou au vert : pour toute question de technique, de correction ou de couleur, renvoie vers Marien.",
    "- Ne propose ni autre exercice, ni autre programme, ni augmentation de charge sur un geste rouge ou orange. Si un poste est pris, renvoie vers le tableau « Machine ou poste occupé ? » de l'onglet Feu Vert.",
    "- Aucune promesse de résultat (poids, silhouette, délai) : Feu Vert mesure la technique, rien d'autre. Ne parle pas de poids corporel.",
    "- Aucun conseil médical : en cas de douleur dans une articulation, vive ou qui augmente, dis d'arrêter l'exercice, de passer à la version facilitée et de le signaler dans le check-in du lundi ; Feu Vert ne remplace pas un avis médical ou kiné."
  ].join("\n");
}

/**
 * Vérification au chargement : la liste ci-dessus suit le contenu livré.
 * Exportée pour les tests.
 */
export const gestesAlignes = () =>
  JSON.stringify(GESTES_IA_FEU_VERT.map((g) => g.id)) === JSON.stringify(CONTENU_FEU_VERT.gestes.map((g) => g.id));
