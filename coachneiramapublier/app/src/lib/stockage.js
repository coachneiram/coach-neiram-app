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
  bilanHebdo: "cn_coach_weekly_state"
};

/** Prefixe commun aux donnees de l'application, utilise pour l'export. */
export const PREFIXE = "coach_";

function lireBrut(cle) {
  try {
    return localStorage.getItem(cle);
  } catch (e) {
    // Navigation privee, quota plein, cookies bloques : ne jamais faire
    // echouer l'application pour autant.
    return null;
  }
}

function ecrireBrut(cle, valeur) {
  try {
    localStorage.setItem(cle, valeur);
    return true;
  } catch (e) {
    return false;
  }
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
    return Object.keys(localStorage).filter((k) => k.startsWith(PREFIXE));
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
  if (!sauvegarde || sauvegarde.app !== "coach-neiram" || !sauvegarde.data) {
    throw new Error("fichier-non-reconnu");
  }
  let ecrites = 0;
  for (const [cle, valeur] of Object.entries(sauvegarde.data)) {
    if (typeof valeur !== "string") continue;
    if (ecrireBrut(cle, valeur)) ecrites++;
  }
  return ecrites;
}
