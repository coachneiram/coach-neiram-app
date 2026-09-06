/**
 * Juger la sortie d'un script de fumee.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER EXISTE
 * ─────────────────────────────────────────────────────────────────────
 *
 * Quatorze des quinze scripts de fumee sortent en code 0 QUOI QU'IL ARRIVE.
 * Ils ont ete ecrits pour etre lus par un humain : ils impriment
 * « *** ABSENT *** » et s'arretent la. Les brancher tels quels sur une
 * integration continue donnerait une chaine toujours verte — c'est-a-dire
 * pire que pas de chaine du tout, puisqu'elle inspirerait confiance.
 *
 * Ce module traduit leur sortie en verdict. Il est SEPARE du lanceur pour
 * une raison : le juge lui-meme doit etre teste. Un juge qui laisse tout
 * passer est exactement le defaut qu'on cherche a corriger, et il ne se
 * verrait jamais depuis une chaine verte.
 */

/** Les marqueurs que les scripts emploient pour signaler une absence. */
const MARQUEUR_ABSENCE = /\*\*\*/;

/** Une exception attrapee par le script, imprimee au lieu d'etre levee. */
const EXCEPTION = /^ECHEC\b/m;

/** « ERREURS JS : ... » ou « ERREURS : ... ». Seul « aucune » est acceptable. */
const ERREURS_JS = /^ *ERREURS(?: JS)? *: *(.+)$/m;

/** L'etat des lieux compte lui-meme ses echecs. */
const COMPTE_ECHECS = /(\d+) *en échec/;

export function juger(sortie, codeSortie = 0) {
  const raisons = [];
  const texte = String(sortie || "");

  // Un script muet n'a rien verifie. C'est un echec, pas un succes :
  // une commande absente ou un plantage precoce sortent tous deux vides.
  if (!texte.trim()) raisons.push("aucune sortie : le script n'a rien exécuté");

  if (codeSortie !== 0) raisons.push(`sortie en code ${codeSortie}`);

  if (MARQUEUR_ABSENCE.test(texte)) {
    const lignes = texte.split("\n").filter((l) => MARQUEUR_ABSENCE.test(l));
    raisons.push(...lignes.map((l) => l.trim()));
  }

  if (EXCEPTION.test(texte)) {
    raisons.push(texte.split("\n").find((l) => /^ECHEC\b/.test(l)).trim());
  }

  const erreurs = texte.match(ERREURS_JS);
  if (erreurs && erreurs[1].trim() !== "aucune") {
    raisons.push(`erreurs JavaScript : ${erreurs[1].trim()}`);
  }

  const compte = texte.match(COMPTE_ECHECS);
  if (compte && Number(compte[1]) > 0) {
    raisons.push(`${compte[1]} fonction(s) en échec`);
  }

  return { ok: raisons.length === 0, raisons };
}
