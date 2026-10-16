/**
 * Lecture des resumes « programme » et « creneaux » du bilan hebdomadaire.
 *
 * POURQUOI CE FICHIER (17 octobre 2026, audit P0-2)
 *
 * Les producteurs parlent francais depuis la migration :
 *   - bilanPlanSemaine (plan-semaine.js) → { prevus, faits, manques, restants }
 *   - bilanSemaine (creneaux.js)         → { prevus, honores, manques, decales, tranches, pct }
 * bilanHebdomadaire (bilan.js) les range dans `planSummary` et `slotSummary`.
 *
 * Les consommateurs, portes tels quels depuis index.html, lisaient les noms
 * d'origine : `planned`, `done`, `honored`, `missed`. `s.planSummary.planned`
 * valait donc toujours undefined : ni l'IA ni le fichier envoye au coach ne
 * voyaient « 2 séances faites sur 3 » ou « 1 créneau manqué ». Les tests
 * passaient parce qu'ils fabriquaient leurs donnees avec les memes faux
 * noms.
 *
 * Toute lecture de ces deux resumes passe desormais par ici. Le schema
 * francais est la reference ; les noms d'origine restent lus en second,
 * pour un bilan enregistre par l'ancienne application (`coach_reports`
 * garde `stats` tel qu'il etait au moment de la generation).
 *
 * ZERO, MANQUANT, INDISPONIBLE :
 *   - resume absent (null) : pas de programme ou pas de creneaux ce
 *     client-la → la fonction rend null, rien n'est affiche ;
 *   - champ absent ou illisible : null, jamais 0 ;
 *   - 0 : un vrai zero, compte par le producteur.
 */

/** Nombre entier >= 0, ou null s'il est absent ou illisible. */
function compte(...valeurs) {
  for (const v of valeurs) {
    if (v === undefined || v === null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
    return null;
  }
  return null;
}

const estObjet = (x) => x && typeof x === "object" && !Array.isArray(x);

/**
 * Resume du programme de la semaine.
 * Rend { prevus, faits, manques, restants } (chaque champ nombre ou null),
 * ou null si aucun resume n'existe.
 */
export function lireResumeProgramme(r) {
  if (!estObjet(r)) return null;
  const prevus = compte(r.prevus, r.planned);
  const faits = compte(r.faits, r.done);
  const manques = compte(r.manques, r.missed);
  let restants = compte(r.restants);
  if (restants === null && prevus !== null && faits !== null && manques !== null) {
    restants = Math.max(0, prevus - faits - manques);
  }
  return { prevus, faits, manques, restants };
}

/**
 * Resume des creneaux (coaching en ligne).
 * Rend { prevus, honores, manques, decales, pct } ou null.
 */
export function lireResumeCreneaux(r) {
  if (!estObjet(r)) return null;
  const pct = r.pct === null || r.pct === undefined ? null : compte(r.pct);
  return {
    prevus: compte(r.prevus, r.planned),
    honores: compte(r.honores, r.honored),
    manques: compte(r.manques, r.missed),
    decales: compte(r.decales, r.shifted),
    pct
  };
}

const pluriel = (n, mot) => n + " " + mot + (n > 1 ? "s" : "");

/**
 * « 2/3 respectées, 1 manquée, 1 à venir » — morceau de phrase du prompt
 * IA. null si rien n'est planifie ou si les chiffres manquent.
 */
export function texteProgramme(r) {
  const p = lireResumeProgramme(r);
  if (!p || !p.prevus || p.faits === null) return null;
  return (
    p.faits +
    "/" +
    p.prevus +
    " respectées" +
    (p.manques ? ", " + pluriel(p.manques, "manquée") : "") +
    (p.restants ? ", " + p.restants + " à venir" : "")
  );
}

/** « 2/3 tenus, 1 manqué(s), 1 décalé(s) » ; null si aucun creneau. */
export function texteCreneaux(r) {
  const c = lireResumeCreneaux(r);
  if (!c || !c.prevus || c.honores === null) return null;
  return (
    c.honores +
    "/" +
    c.prevus +
    " tenus" +
    (c.manques ? ", " + c.manques + " manqué(s)" : "") +
    (c.decales ? ", " + c.decales + " décalé(s)" : "")
  );
}

/** Des creneaux ont-ils ete manques cette semaine ? (inconnu = non) */
export const creneauxManques = (r) => Boolean(lireResumeCreneaux(r)?.manques);
