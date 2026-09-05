/**
 * Stockage local.
 *
 * ─────────────────────────────────────────────────────────────────────
 * CONTRAINTE ABSOLUE : COMPATIBILITE DES DONNEES
 * ─────────────────────────────────────────────────────────────────────
 * Les clients utilisent l'application depuis des mois. Tout leur suivi vit
 * dans le localStorage de leur navigateur : journal, poids, seances,
 * mensurations, bilans. Il n'existe aucune copie serveur.
 *
 * La nouvelle version doit donc lire et ecrire EXACTEMENT les memes cles,
 * dans EXACTEMENT le meme format. Renommer une cle ou changer un format
 * reviendrait a effacer l'historique du client le jour de la bascule, sans
 * message d'erreur et sans retour possible.
 *
 * Les noms ci-dessous sont repris de index.html (ligne ~177) et ne doivent
 * pas etre modifies. tests/stockage-compat.test.mjs verrouille ce contrat.
 */

export const STORAGE_KEYS = {
  profile: "coach_profile",
  dishes: "coach_dishes",
  logEntries: "coach_log_entries",
  bodyLogs: "coach_body_logs",
  dailyForm: "coach_daily_form",
  routines: "coach_routines",
  sessions: "coach_sessions",
  reports: "coach_reports",
  measurements: "coach_measurements",
  monthlyReports: "coach_reports_monthly"
};

/** Cles hors STORAGE_KEYS, mais tout aussi indispensables a preserver. */
export const CLES_ANNEXES = {
  outboxCoach: "cn_coach_outbox",
  alerteCoach: "cn_coach_alert_state",
  alerteCreneaux: "cn_coach_shift_alert_state",
  raisonsCreneaux: "cn_slot_reasons",
  semainesDifficiles: "cn_hard_weeks",
  planSemaine: "cn_weekly_plan",
  maxisForce: "cn_pl_1rm",
  bilanHebdo: "cn_coach_weekly_state"
};

/** Prefixe historique des donnees de suivi. */
export const PREFIXE = "coach_";

/**
 * Second prefixe des donnees du client.
 *
 * Les fonctionnalites ajoutees apres coup ont utilise « cn_ » : repas
 * types, favoris code-barres, exercices personnels, plan de la semaine,
 * maxis de force, semaines maintien, justifications de creneaux.
 *
 * ELLES N'ETAIENT PAS SAUVEGARDEES. L'export ne prenait que « coach_ »,
 * alors que l'ecran annonce « le fichier contient tout ton suivi ». Une
 * cliente a passe du temps a scanner ses codes-barres et a exporter, en
 * croyant son travail a l'abri.
 *
 * Ce sont des donnees que le client a saisies lui-meme et qu'il ne peut
 * pas reconstituer : elles doivent partir dans la sauvegarde.
 */
export const PREFIXE_RECENT = "cn_";

/** Une cle appartient-elle aux donnees du client ? */
export const estCleClient = (cle) =>
  typeof cle === "string" && (cle.startsWith(PREFIXE) || cle.startsWith(PREFIXE_RECENT));

function lireBrut(cle) {
  try {
    return localStorage.getItem(cle);
  } catch (e) {
    // Navigation privee, quota plein, cookies bloques : ne jamais faire
    // echouer l'application pour autant.
    return null;
  }
}

/**
 * Abonnes prevenus quand une ecriture echoue.
 *
 * Le stockage du navigateur est la SEULE copie des donnees du client : il
 * n'existe aucune sauvegarde serveur. Une ecriture qui echoue en silence
 * est donc la pire panne possible — le client continue de saisir ses repas
 * pendant des jours, tout semble normal, et rien n'est conserve.
 *
 * C'est arrive : une cliente a signale « on ne peut meme plus enregistrer
 * de repas, ca ne fonctionne plus », sans qu'aucun message ne le lui ait
 * jamais dit.
 */
const abonnesEchec = new Set();

/** S'abonner aux echecs d'ecriture. Rend la fonction de desabonnement. */
export function surEchecEcriture(fn) {
  abonnesEchec.add(fn);
  return () => abonnesEchec.delete(fn);
}

/** Un quota depasse ne se presente pas pareil selon les navigateurs. */
function estQuotaDepasse(e) {
  if (!e) return false;
  return (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.code === 22 ||
    e.code === 1014
  );
}

function ecrireBrut(cle, valeur) {
  try {
    localStorage.setItem(cle, valeur);
    return true;
  } catch (e) {
    // Prevenir, toujours. Un echec silencieux ferait perdre au client des
    // jours de saisie sans qu'il s'en apercoive.
    for (const fn of abonnesEchec) {
      try {
        fn({ cle, quota: estQuotaDepasse(e), erreur: e });
      } catch (interne) {
        // Un abonne fautif ne doit pas empecher les autres d'etre prevenus.
      }
    }
    return false;
  }
}

/** Octets occupes par cle, du plus lourd au plus leger. */
export function occupationStockage() {
  try {
    const entrees = Object.keys(localStorage).map((cle) => {
      const valeur = localStorage.getItem(cle) || "";
      // Deux octets par caractere : le stockage du navigateur est en UTF-16.
      return { cle, octets: (cle.length + valeur.length) * 2 };
    });
    entrees.sort((a, b) => b.octets - a.octets);
    return { entrees, total: entrees.reduce((a, e) => a + e.octets, 0) };
  } catch (e) {
    return { entrees: [], total: 0 };
  }
}

/**
 * Cles de photos de progression.
 *
 * Ce sont, de tres loin, les plus lourdes : une photo redimensionnee pese
 * environ 180 Ko une fois encodee, et le navigateur plafonne l'ensemble du
 * stockage vers 5 Mo. Une trentaine de photos suffit a tout bloquer.
 */
export const estCleDePhoto = (cle) => /^coach_photos_/.test(cle);

/** Supprime toutes les photos de progression. Rend les octets liberes. */
export function supprimerPhotos() {
  let liberes = 0;
  for (const { cle, octets } of occupationStockage().entrees) {
    if (!estCleDePhoto(cle)) continue;
    try {
      localStorage.removeItem(cle);
      liberes += octets;
    } catch (e) {
      // Une cle recalcitrante ne doit pas interrompre le nettoyage.
    }
  }
  return liberes;
}

/** Lit une valeur JSON. Renvoie `repli` si absente ou illisible. */
export function charger(cle, repli) {
  const brut = lireBrut(cle);
  if (brut == null) return repli;
  try {
    return JSON.parse(brut);
  } catch (e) {
    // Donnee corrompue : mieux vaut repartir du repli que bloquer le demarrage.
    return repli;
  }
}

/** Ecrit une valeur JSON. Renvoie false si le stockage refuse. */
export function enregistrer(cle, valeur) {
  return ecrireBrut(cle, JSON.stringify(valeur));
}

/** Liste les cles de l'application presentes sur l'appareil. */
export function listerCles() {
  try {
    return Object.keys(localStorage).filter(estCleClient);
  } catch (e) {
    return [];
  }
}

/**
 * Construit la sauvegarde complete, au format attendu par l'import existant.
 *
 * Le format ({ app, version, exportedAt, data }) est celui produit par
 * index.html : une sauvegarde faite avec l'ancienne version doit rester
 * restaurable avec la nouvelle, et reciproquement.
 */
export function construireSauvegarde() {
  const data = {};
  for (const cle of listerCles()) {
    const valeur = lireBrut(cle);
    if (valeur != null) data[cle] = valeur;
  }
  return {
    app: "coach-neiram",
    version: 1,
    exportedAt: new Date().toISOString(),
    data
  };
}

/**
 * Restaure une sauvegarde. Renvoie le nombre de cles ecrites.
 *
 * Rejette ce qui ne ressemble pas a une sauvegarde Coach Neiram plutot que
 * d'ecraser les donnees du client avec n'importe quel fichier.
 */
export function restaurerSauvegarde(sauvegarde) {
  if (!sauvegarde || sauvegarde.app !== "coach-neiram" || typeof sauvegarde.data !== "object" || !sauvegarde.data) {
    throw new Error("fichier-non-reconnu");
  }

  /*
   * Seules les cles de l'application sont restaurees.
   *
   * Sans ce filtre, un fichier trafique — ou simplement une sauvegarde
   * d'une autre application portant le meme nom — pourrait ecrire
   * n'importe quelle cle dans le stockage du navigateur. Le filtre etait
   * present dans l'application d'origine et manquait ici.
   *
   * Il couvre les deux prefixes de l'application, et RIEN d'autre : elargir
   * a « toute cle du fichier » rouvrirait la faille.
   */
  const entrees = Object.entries(sauvegarde.data).filter(
    ([cle, valeur]) => estCleClient(cle) && typeof valeur === "string"
  );

  // Un fichier sans aucune donnee reconnue n'est pas une sauvegarde vide :
  // c'est le mauvais fichier. Le dire plutot que d'annoncer « 0 element
  // restaure » et laisser le client croire que ca a marche.
  if (!entrees.length) throw new Error("sauvegarde-vide");

  let ecrites = 0;
  for (const [cle, valeur] of entrees) {
    if (ecrireBrut(cle, valeur)) ecrites++;
  }
  return ecrites;
}
