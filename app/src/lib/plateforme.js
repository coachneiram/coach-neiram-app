/**
 * Envoi du bilan hebdomadaire vers la plateforme Coach Neiram (16 novembre
 * 2026, demande du coach : « en un clic, depuis l'appli »).
 *
 * C'est un envoi EN PLUS du partage du fichier : il ne remplace rien, ni la
 * synchro des pointages (lib/synchro-coach.js), ni le fichier du bilan
 * (lib/bilan-html.js).
 *
 * Le client colle une seule fois le « code plateforme » reçu dans son
 * invitation (NEIRAM-XXXXXX). L'appli l'envoie dans l'en-tête X-Neiram-Code ;
 * la plateforme en déduit le client et la semaine en cours (aucun champ
 * « week » n'est envoyé).
 *
 * LA CLÉ DU CODE N'A NI LE PRÉFIXE « coach_ » NI « cn_ » : comme le jeton
 * de lib/acces.js, il ne doit jamais partir dans le fichier de sauvegarde,
 * souvent partagé par WhatsApp. Sur un nouveau téléphone, il se recolle une
 * fois.
 *
 * Aucun PDF : l'appli ne génère pas de PDF, seulement un fichier HTML
 * (lib/bilan-html.js). Si un PDF est ajouté un jour, `pdf` est déjà accepté
 * par envoyerBilanPlateforme (et retiré automatiquement si la plateforme
 * répond 413).
 */

import { clamp, round } from "./dates.js";
import { charger, enregistrer } from "./stockage.js";
import { texteCreneaux, texteProgramme } from "./resumes-bilan.js";

export const URL_PLATEFORME = "https://coach-neiram-os.pelissier-marien.workers.dev";
export const ROUTE_BILAN_PLATEFORME = "/api/app/bilan";

export const CLE_CODE_PLATEFORME = "acces_plateforme";
/** { "2026-11-09": "2026-11-15T17:42:00.000Z" } : dernier envoi réussi de chaque semaine. */
export const CLE_ENVOIS_PLATEFORME = "cn_bilans_plateforme";

/** La plateforme coupe le résumé au-delà. */
export const RESUME_MAX = 6000;
/** Au-delà, l'envoi est abandonné plutôt que laissé pendre. */
export const DELAI_ENVOI_MS = 20000;
const SEMAINES_GARDEES = 12;

/* ------------------------------------------------------------------ */
/* Le code                                                             */
/* ------------------------------------------------------------------ */

/**
 * « neiram-ab12cd », « NEIRAM AB12CD » ou « neiramab12cd » → « NEIRAM-AB12CD ».
 * Majuscules, espaces retirés. Rend null si ce n'est pas un code.
 */
export function normaliserCode(texte) {
  const brut = String(texte ?? "").replace(/\s+/g, "").toUpperCase();
  const sansTiret = brut.match(/^NEIRAM-?([A-Z0-9]{6})$/);
  return sansTiret ? `NEIRAM-${sansTiret[1]}` : null;
}

/** Le code enregistré sur ce téléphone, ou null. */
export function lireCodePlateforme(env = globalThis) {
  try {
    return normaliserCode(env.localStorage && env.localStorage.getItem(CLE_CODE_PLATEFORME));
  } catch (e) {
    return null;
  }
}

/** Enregistre le code ; rend { ok, code } ou { ok: false }. Une saisie invalide ne touche à rien. */
export function enregistrerCodePlateforme(texte, env = globalThis) {
  const code = normaliserCode(texte);
  if (!code) return { ok: false };
  try {
    env.localStorage.setItem(CLE_CODE_PLATEFORME, code);
  } catch (e) {
    return { ok: false };
  }
  return { ok: true, code };
}

export function oublierCodePlateforme(env = globalThis) {
  try {
    env.localStorage.removeItem(CLE_CODE_PLATEFORME);
  } catch (e) {
    // Rien à faire : sans stockage, il n'y avait pas de code.
  }
}

/* ------------------------------------------------------------------ */
/* Dernier envoi de chaque semaine                                     */
/* ------------------------------------------------------------------ */

function lireEnvois() {
  const v = charger(CLE_ENVOIS_PLATEFORME, null);
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

/** Date ISO du dernier envoi réussi de cette semaine, ou null. */
export function envoiDeLaSemaine(cleSemaine) {
  const d = lireEnvois()[cleSemaine];
  return typeof d === "string" && !Number.isNaN(Date.parse(d)) ? d : null;
}

/** Note l'envoi ; ne garde que les dernières semaines. */
export function noterEnvoi(cleSemaine, maintenant = new Date()) {
  const suivant = { ...lireEnvois(), [cleSemaine]: maintenant.toISOString() };
  const cles = Object.keys(suivant).sort();
  while (cles.length > SEMAINES_GARDEES) delete suivant[cles.shift()];
  enregistrer(CLE_ENVOIS_PLATEFORME, suivant);
  return suivant;
}

/* ------------------------------------------------------------------ */
/* Le contenu                                                          */
/* ------------------------------------------------------------------ */

const entierEntre = (v, min, max) => clamp(Math.round(v), min, max);
const positif = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

/** Échelle de 1 à `max` ramenée à 1-5 (la plateforme n'accepte que 1-5). */
export function surCinq(valeur, max) {
  const v = Number(valeur);
  if (valeur == null || !Number.isFinite(v) || v < 1 || !(max >= 1)) return null;
  if (max === 5) return entierEntre(v, 1, 5);
  return entierEntre(1 + ((v - 1) * 4) / (max - 1), 1, 5);
}

/** Dernier tour de taille (cm) noté dans la semaine, ou null. */
function tourDeTaille(mesures, debut, fin) {
  const dansLaSemaine = (mesures || [])
    .filter((m) => m && typeof m.date === "string" && m.date >= debut && m.date <= fin && positif(m.taille))
    .sort((a, b) => a.date.localeCompare(b.date));
  return dansLaSemaine.length ? positif(dansLaSemaine[dansLaSemaine.length - 1].taille) : null;
}

/**
 * Séances faites et prévues, dans le même ordre de précision que la note
 * d'assiduité (lib/bilan.js) : créneaux, puis programme, puis objectif.
 */
function seancesDeLaSemaine(s, profil) {
  const c = s.slotSummary;
  if (c && c.prevus > 0) return { faites: c.honores, prevues: c.prevus };
  const p = s.planSummary;
  if (p && p.prevus > 0) return { faites: p.faits, prevues: p.prevus };
  const objectif = positif(profil && profil.weeklyWorkoutTarget);
  return { faites: s.workoutsCount, prevues: objectif };
}

/**
 * Les champs « data » : seulement ceux que l'appli connaît. victoire,
 * difficulte, objectif et question n'existent pas dans l'appli : ils ne
 * partent pas. `nutrition` (1-5) n'existe pas non plus.
 */
export function donneesPlateforme({ weekStats, profil, mesures }) {
  const s = weekStats || {};
  const d = {};
  const poids = positif(s.latestWeight);
  if (poids) d.poids = round(poids, 1);
  const taille = tourDeTaille(mesures, s.start, s.end);
  if (taille) d.taille = round(taille, 1);
  const seances = seancesDeLaSemaine(s, profil);
  if (Number.isFinite(seances.faites)) d.seances_faites = seances.faites;
  if (Number.isFinite(seances.prevues) && seances.prevues > 0) d.seances_prevues = seances.prevues;
  const pas = positif(s.avgSteps);
  if (pas) d.pas = Math.round(pas);
  const sommeil = surCinq(s.avgSleepQuality, 5);
  if (sommeil) d.sommeil = sommeil;
  const energie = surCinq(s.avgEnergy, 5);
  if (energie) d.energie = energie;
  const stress = surCinq(s.avgStress, 10);
  if (stress) d.stress = stress;
  return d;
}

const jourFr = (iso) => String(iso).split("-").reverse().join("/");
const nombreFr = (v, d = 0) => String(round(v, d)).replace(".", ",");

/** Résumé lisible de la semaine, 6000 caractères au plus. */
export function resumePlateforme({ weekStats, bilan, performances = [] }) {
  const s = weekStats || {};
  const l = [];
  l.push(`Bilan de la semaine du ${jourFr(s.start)} au ${jourFr(s.end)}`);

  const seances = [`${s.workoutsCount} séance${s.workoutsCount > 1 ? "s" : ""}`];
  const programme = texteProgramme(s.planSummary);
  if (programme) seances.push(`programme : ${programme}`);
  const creneaux = texteCreneaux(s.slotSummary);
  if (creneaux) seances.push(`créneaux : ${creneaux}`);
  if (s.maintenanceCount) seances.push(`${s.maintenanceCount} séance(s) de maintien`);
  l.push("Séances : " + seances.join(" · "));
  if (s.hardWeek) l.push("Semaine difficile déclarée" + (s.hardWeekReason ? ` (${s.hardWeekReason})` : ""));
  if (s.deloadCount) l.push(`${s.deloadCount} séance(s) de décharge`);

  const nutrition = [];
  if (s.avgCalories != null) nutrition.push(`${nombreFr(s.avgCalories)} kcal par jour`);
  if (s.avgProtein != null) nutrition.push(`${nombreFr(s.avgProtein)} g de protéines`);
  if (s.avgWaterMl != null) nutrition.push(`eau ${nombreFr(s.avgWaterMl)} ml`);
  if (nutrition.length) l.push(`Nutrition (moyenne sur ${s.loggedDaysCount} jour(s) suivis) : ${nutrition.join(" · ")}`);

  const forme = [];
  if (s.avgSleepH != null) forme.push(`sommeil ${nombreFr(s.avgSleepH, 1)} h`);
  if (s.avgSleepQuality != null) forme.push(`qualité ${nombreFr(s.avgSleepQuality, 1)}/5`);
  if (s.avgEnergy != null) forme.push(`énergie ${nombreFr(s.avgEnergy, 1)}/5`);
  if (s.avgStress != null) forme.push(`stress ${nombreFr(s.avgStress, 1)}/10`);
  if (s.avgSteps != null) forme.push(`${nombreFr(s.avgSteps)} pas par jour`);
  if (forme.length) l.push("Forme : " + forme.join(" · "));

  if (s.latestWeight != null) {
    const delta = s.weightDelta;
    l.push(`Poids : ${nombreFr(s.latestWeight, 1)} kg` + (delta ? ` (${delta > 0 ? "+" : ""}${nombreFr(delta, 1)} kg depuis la mesure précédente)` : ""));
  }
  if (s.latestFatPct != null) l.push(`Masse grasse : ${nombreFr(s.latestFatPct, 1)} %`);
  if (s.painLines && s.painLines.length) l.push("Douleurs : " + s.painLines.join(" ; "));
  if (s.dayNotes && s.dayNotes.length) l.push("Notes du journal : " + s.dayNotes.join(" | "));
  if (s.sessionNotes && s.sessionNotes.length) l.push("Notes de séances : " + s.sessionNotes.join(" | "));
  if (Number.isFinite(s.adherence)) l.push(`Assiduité : ${s.adherence} %`);
  if (s.weeklyStreak) l.push(`Série : ${s.weeklyStreak} semaine(s) tenue(s) d'affilée`);
  if (s.contrat && s.contrat.ligne) l.push(s.contrat.ligne);
  for (const p of performances || []) l.push(p);

  const sections = bilan && bilan.sections;
  if (sections) {
    l.push("");
    l.push("Bilan rédigé par le coach IA :");
    if (sections.resume) l.push(sections.resume);
    if (sections.evolution) l.push("Évolution : " + sections.evolution);
    for (const [cle, titre] of [
      ["points_forts", "Points forts"],
      ["vigilance", "Vigilance"],
      ["a_corriger", "À corriger"],
      ["actions", "Actions pour la semaine prochaine"]
    ]) {
      const lignes = sections[cle] || [];
      if (lignes.length) l.push(`${titre} : ` + lignes.join(" ; "));
    }
  }
  return coupe(l.join("\n"), RESUME_MAX);
}

/** Coupe à la limite, de préférence à la fin d'une ligne, et le dit. */
function coupe(texte, max) {
  if (texte.length <= max) return texte;
  const garde = texte.slice(0, max - 1);
  const finDeLigne = garde.lastIndexOf("\n");
  return (finDeLigne > max * 0.6 ? garde.slice(0, finDeLigne) : garde).trimEnd() + "…";
}

/** Le corps JSON complet : { data, resume } (+ pdf s'il existe un jour). */
export function construirePayloadPlateforme({ weekStats, profil, mesures, bilan, performances, pdf = null }) {
  const corps = { data: donneesPlateforme({ weekStats, profil, mesures }), resume: resumePlateforme({ weekStats, bilan, performances }) };
  if (pdf && pdf.name && pdf.base64) corps.pdf = { name: pdf.name, base64: pdf.base64 };
  return corps;
}

/* ------------------------------------------------------------------ */
/* L'envoi                                                             */
/* ------------------------------------------------------------------ */

export const TEXTES_PLATEFORME = {
  titreReglages: "Code plateforme Coach Neiram",
  aideReglages: "C'est le code reçu dans ton invitation à la plateforme. À coller une seule fois.",
  champCode: "NEIRAM-XXXXXX",
  enregistrerCode: "Valider",
  codeInvalide: "Ce code n'a pas le bon format : il ressemble à NEIRAM-AB12CD.",
  codeEnregistre: "Code enregistré sur ce téléphone.",
  retirerCode: "Retirer le code de ce téléphone",
  confirmationRetrait: "Retirer le code ? Tu ne pourras plus envoyer ton bilan à la plateforme avant d'avoir recollé un code.",
  codeActif: (code) => `Code enregistré : ${code}`,

  bouton: "Envoyer à mon coach",
  envoiEnCours: "Envoi en cours…",
  aide: "Envoie ton bilan de la semaine à la plateforme Coach Neiram : ton coach le reçoit tout de suite.",
  partagerFichier: "Partager le fichier du bilan",
  aideFichier: "Le fichier se partage par WhatsApp ou par mail.",
  sansCode: "Colle d'abord ton code plateforme dans les Réglages : tu le trouveras dans ton invitation.",
  ouvrirReglages: "Ouvrir les Réglages",
  envoye: "Bilan envoyé à ton coach ✔",
  dejaEnvoye: (le) => `Déjà envoyé le ${le}`,
  renvoyer: "Tu peux le renvoyer : la plateforme garde le plus récent.",
  codeIncorrect: "Code plateforme incorrect : vérifie-le dans les réglages.",
  tropLourd: "Le bilan est trop lourd pour la plateforme.",
  limite: "Trop d'envois pour le moment. Réessaie plus tard.",
  echec: "Envoi impossible, réessaie. Ton bilan est conservé."
};

/** « 15/11 à 17 h 42 », à l'heure du téléphone. */
export function dateEnvoi(iso) {
  const d = new Date(iso);
  const jj = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${jj}/${mm} à ${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * POST vers la plateforme. Rend { ok: true, semaine } ou
 * { ok: false, erreur, message } ; erreur parmi « sans-code », « code »
 * (401), « trop-lourd » (413), « limite » (429), « reseau » (le reste).
 *
 * Un 413 avec un PDF est retenté une fois sans le PDF.
 */
export async function envoyerBilanPlateforme({ payload, code, fetchImpl = globalThis.fetch, delaiMs = DELAI_ENVOI_MS }) {
  const T = TEXTES_PLATEFORME;
  const lu = normaliserCode(code);
  if (!lu) return { ok: false, erreur: "sans-code", message: T.sansCode };

  const poster = async (corps) => {
    const controleur = typeof AbortController === "function" ? new AbortController() : null;
    const minuteur = controleur ? setTimeout(() => controleur.abort(), delaiMs) : null;
    try {
      return await fetchImpl(URL_PLATEFORME + ROUTE_BILAN_PLATEFORME, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Neiram-Code": lu },
        body: JSON.stringify(corps),
        signal: controleur ? controleur.signal : undefined
      });
    } finally {
      if (minuteur) clearTimeout(minuteur);
    }
  };

  let corps = payload;
  for (let essai = 0; essai < 2; essai++) {
    let reponse;
    try {
      reponse = await poster(corps);
    } catch (e) {
      return { ok: false, erreur: "reseau", message: T.echec };
    }
    const d = await reponse.json().catch(() => ({}));
    if (reponse.ok && d && d.ok) return { ok: true, semaine: typeof d.week === "string" ? d.week : null };
    if (reponse.status === 401) return { ok: false, erreur: "code", message: T.codeIncorrect };
    if (reponse.status === 413) {
      if (corps.pdf) {
        corps = { data: corps.data, resume: corps.resume };
        continue;
      }
      return { ok: false, erreur: "trop-lourd", message: T.tropLourd };
    }
    if (reponse.status === 429) return { ok: false, erreur: "limite", message: typeof d.error === "string" && d.error ? d.error : T.limite };
    return { ok: false, erreur: "reseau", message: T.echec };
  }
  return { ok: false, erreur: "trop-lourd", message: T.tropLourd };
}
