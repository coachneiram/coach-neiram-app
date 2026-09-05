/**
 * Lecture des bilans rediges par l'IA.
 *
 * Portage fidele de parseBilan (index.html, ligne 1190).
 *
 * Le modele repond en texte libre, avec des titres de sections. Ce
 * decoupage est donc par nature fragile : le modele peut ecrire « RESUME »,
 * « Résumé », « ## RÉSUMÉ » ou « 1. Resume ». La normalisation retire
 * accents et ponctuation pour que ces variantes tombent toutes sur la meme
 * section.
 *
 * Regle de securite conservee telle quelle : si rien n'a pu etre reconnu,
 * le texte brut est place dans le resume plutot que d'afficher un bilan
 * vide. Un coach prefere un bilan mal decoupe a un ecran blanc.
 */

/** Titres reconnus, une fois accents et ponctuation retires. */
const SECTIONS = {
  RESUME: "resume",
  EVOLUTION: "evolution",
  POINTSFORTS: "points_forts",
  VIGILANCE: "vigilance",
  ACORRIGER: "a_corriger",
  ACTIONS: "actions"
};

/** Sections rendues en paragraphe ; les autres sont des listes. */
const PARAGRAPHES = ["resume", "evolution"];

/** Au-dela, une ligne est du contenu, pas un titre. */
const LONGUEUR_MAX_TITRE = 40;

const sansAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function lireBilan(texte) {
  const sections = {};
  let courante = null;

  texte.split("\n").forEach((brut) => {
    const ligne = brut.trim();
    if (!ligne) return;

    const normalisee = sansAccents(ligne).toUpperCase().replace(/[^A-Z]/g, "");
    if (SECTIONS[normalisee] && ligne.length < LONGUEUR_MAX_TITRE) {
      courante = SECTIONS[normalisee];
      if (!(courante in sections)) sections[courante] = PARAGRAPHES.includes(courante) ? "" : [];
      return;
    }

    // Tout ce qui precede le premier titre est ignore : c'est en general
    // une phrase d'introduction du modele, pas du contenu de bilan.
    if (!courante) return;

    if (PARAGRAPHES.includes(courante)) {
      sections[courante] = (sections[courante] ? sections[courante] + " " : "") + ligne;
    } else {
      const nettoyee = ligne.replace(/^[-•*]\s*/, "").replace(/^\d+[.)]\s*/, "");
      if (nettoyee) sections[courante].push(nettoyee);
    }
  });

  const rienDeReconnu =
    !sections.resume &&
    !sections.evolution &&
    !(sections.points_forts || []).length &&
    !(sections.actions || []).length;

  if (rienDeReconnu) sections.resume = texte.trim();

  return sections;
}
