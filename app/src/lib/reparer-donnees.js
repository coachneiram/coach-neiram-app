/**
 * Reparation douce des donnees au chargement.
 *
 * Une sauvegarde ancienne (app coach comprise, restauree ici telle quelle),
 * une saisie interrompue ou un fichier edite a la main peuvent contenir un
 * element de forme inattendue : une seance dont « exercises » n'est pas une
 * liste, un nom qui est un nombre. Un seul de ces elements faisait planter
 * l'ecran entier (ui/FiletErreur.jsx limite desormais les degats, ceci en
 * supprime la cause).
 *
 * Regle : on remet en forme, on ne jette rien d'utilisable. Seuls sont
 * retires les elements qui ne sont pas des objets (null, texte isole) :
 * ils ne contiennent aucune donnee exploitable.
 */

const estObjet = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const texte = (v) => (v == null ? "" : typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const liste = (v) => (Array.isArray(v) ? v.filter(estObjet) : []);

function reparerExercice(ex) {
  const r = { ...ex, name: texte(ex.name) };
  if ("series" in ex && !Array.isArray(ex.series)) delete r.series;
  return r;
}

/** Une seance, ou une seance type : exercices en liste, noms en texte. */
function reparerAvecExercices(s) {
  const r = { ...s };
  if ("exercises" in s || "routineId" in s) r.exercises = liste(s.exercises).map(reparerExercice);
  if ("name" in s) r.name = texte(s.name);
  return r;
}

/** Un element nomme (repas note, plat) : le nom en texte. */
function reparerNomme(e) {
  return "name" in e ? { ...e, name: texte(e.name) } : e;
}

const REPARATIONS = {
  sessions: reparerAvecExercices,
  routines: reparerAvecExercices,
  logEntries: reparerNomme,
  dishes: reparerNomme
};

/**
 * Rend la liste reparee pour la collection `nom` (cle de STORAGE_KEYS).
 * Une valeur qui n'est pas une liste donne une liste vide.
 */
export function reparerCollection(nom, valeur) {
  const elements = liste(valeur);
  const reparer = REPARATIONS[nom];
  return reparer ? elements.map(reparer) : elements;
}
