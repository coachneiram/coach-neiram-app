/**
 * Registre des sources officielles des barèmes et des minima (28 octobre
 * 2026).
 *
 * Pourquoi : les grilles de niveau (lib/grille-ffforce.js,
 * lib/grilles-sports.js, lib/niveaux.js) sont relevées à la main dans des
 * documents de fédérations. Elles changent à des dates différentes selon la
 * fédération (la FFForce a publié quatre fois en douze mois), et personne
 * ne le saurait si le calendrier ne le disait pas. Ce registre tient, pour
 * chaque jeu de données :
 *   - sa saison, sa date de relevé et sa date de fin de validité ;
 *   - les pages et les documents officiels d'où il vient ;
 *   - le calendrier de publication attendu de la prochaine édition.
 *
 * Deux usages :
 *   1. l'app dit sa source, sa saison et sa date de relevé, et prévient
 *      quand une saison a pu changer (ui/NiveauPerformances.jsx) ;
 *   2. scripts-donnees/verifier-sources.mjs, lancé chaque semaine par
 *      .github/workflows/baremes.yml, compare ce registre au calendrier et
 *      aux sites des fédérations, et ouvre une demande sur GitHub quand il
 *      faut mettre les données à jour.
 *
 * Quand on met un jeu de données à jour : changer ses valeurs, puis ici sa
 * saison, `releveLe` et `echeance`, relancer `node --test tests/*.test.mjs`
 * (tests/baremes-integrite.test.mjs vérifie la forme des grilles). La
 * demande GitHub se referme seule à la vérification suivante.
 *
 * `echeance` : jour à partir duquel le jeu de données a pu être remplacé.
 * Quand la fédération ne donne pas de date, c'est la FIN SUPPOSÉE de la
 * saison, choisie au plus tôt plausible : une fausse alerte coûte une
 * vérification, une alerte tardive laisse un barème périmé. Chaque cas
 * supposé le dit dans `echeanceNote`.
 */

import { SAISON_FFFORCE } from "./grille-ffforce.js";

const PAGE_FFFORCE = "https://www.ffforce.fr/fr/force-athletique-ffforce/national-force-athletique/minimas-force-athletique.html";
const NIVEAUX_FFFORCE_V03 = "https://www.ffforce.fr/medias/fichiers/Saison%202026/Force%20Athletique/Niveaux/Niveaux%20-%202025-2026%20V03-1.xlsx";
const IPF_COEFFICIENTS_GL = "https://www.powerlifting.sport/fileadmin/ipf/data/ipf-formula/IPF_GL_Coefficients-2020.pdf";
const IPF_ANNONCE_GL = "https://www.powerlifting.sport/fileadmin/ipf/data/ipf-formula/Announcement_IPF_GL_Formula_2020_1_.pdf";
// Tables de points World Aquatics publiées sur la page « points » (relevé du 28/10/2026).
const WA_TABLES = [
  "https://resources.fina.org/fina/document/2026/03/02/2ff83c61-de9d-4b14-8e66-dafd60974e07/World-Aquatics-Points-LCM_2026_Male-1-.pdf",
  "https://resources.fina.org/fina/document/2026/03/02/ae522afa-e03f-417e-9169-c39e868af9a6/World-Aquatics-Points-LCM_2026_Female-1-.pdf",
  "https://resources.fina.org/fina/document/2026/03/02/e7b71339-5788-493d-802f-7f992c6ea85d/World-Aquatics-Points-LCM_2026_Relay-1-.pdf",
  "https://resources.fina.org/fina/document/2026/09/05/eb72585f-25af-4ac7-b052-d72a3d51ddf0/World-Aquatics-Points-SCM_2026_Male.pdf",
  "https://resources.fina.org/fina/document/2026/09/05/38f8e66d-8c33-45cc-a39c-150bbe69f43d/World-Aquatics-Points-SCM_2026_Female.pdf",
  "https://resources.fina.org/fina/document/2026/09/05/b7fc9f8b-20a1-4470-bd6f-89318e0297b4/World-Aquatics-Points-SCM_2026_Relay.pdf"
];
const LIVRET_FFA_2026 = "https://www.athle.fr/Reglement/livret_2026_running.pdf";
const REGLEMENT_FFHM_2026 = "https://www.ffhaltero.fr/wp-content/uploads/2026/07/Reglement-sport-halterophilie-2026-2027.pdf";
const ANNUEL_FFN_2026 = "https://www.ffnatation.fr/sites/default/files/2026-09/26_VPUB_260907_0.pdf";
const BASES_WA_2026 =
  "https://resources.fina.org/fina/document/2026/09/05/9b48fb98-233c-4ce9-b67b-bc6163319bbd/Points-Base-times-SCM-and-LCM-2026_09.2026.pdf";

export const RELEVE_INITIAL = "2026-10-24";

/**
 * `verifierTousLesJours` : sans date de fin officielle, le jeu de données
 * est à revoir à cette cadence ; l'échéance est alors releveLe + ce délai.
 * `sondes` : adresses de la prochaine édition, devinées à partir de celle
 * de cette année (le nom des fichiers suit presque toujours la saison) ;
 * le contrôleur les teste quand l'échéance approche (`preavisJours` avant,
 * 45 par défaut). `decalage` : l'année du fichier cherché est l'année de
 * l'échéance + `decalage` (0 pour une saison qui démarre l'année de
 * l'échéance, 1 pour un millésime de l'année suivante).
 * `references` : adresses citées pour mémoire, jamais lues par la veille (site
 * qui bloque les machines de GitHub). `documentsConnus` : fichiers d'où viennent les valeurs ; un fichier
 * modifié après `releveLe` est à relire. `motsCles` : un lien de page qui
 * en contient un et qui n'est pas connu est signalé comme nouveau document.
 */
export const SOURCES_BAREMES = [
  {
    id: "ffforce-niveaux",
    court: "FFForce 2025-2026 (V03-1)",
    discipline: "force",
    organisme: "FFForce",
    libelle: "Niveaux de force athlétique (total et développé couché)",
    saison: SAISON_FFFORCE,
    releveLe: RELEVE_INITIAL,
    verifierTousLesJours: 30,
    preavisJours: 7,
    echeanceNote:
      "Pas de calendrier fixe : la FFForce publie par morceaux (subjuniors et juniors 02/2025, masters 04/2025, seniors 11/2025, développé couché N1 01/2026), et au relevé du 24/10/2026 la grille 2025-2026 était encore la plus récente. Revue tous les mois ; la page est lue chaque semaine.",
    pages: [PAGE_FFFORCE],
    // Le fichier d'où viennent les valeurs ; la page n'en proposait pas d'autre au 28/10/2026.
    documentsConnus: [NIVEAUX_FFFORCE_V03],
    motsCles: ["niveau", "minima", "minimas", "reglement"],
    sondes: []
  },
  {
    id: "ipf-categories-gl",
    court: "IPF 2026",
    discipline: "force",
    organisme: "IPF",
    libelle: "Catégories de poids IPF et coefficients GL",
    saison: "IPF Technical Rulebook 2026 ; coefficients GL 2020",
    releveLe: RELEVE_INITIAL,
    echeance: "2026-12-31",
    echeanceNote: "Supposée : le règlement technique IPF porte le millésime de l'année ; les coefficients GL n'ont pas changé depuis 2020.",
    pages: ["https://www.powerlifting.sport/rules/codes/info/ipf-formula"],
    documentsConnus: [IPF_COEFFICIENTS_GL, IPF_ANNONCE_GL],
    motsCles: ["gl", "coefficient", "technical", "rulebook"],
    sondes: []
  },
  {
    id: "ffhm-series",
    court: "FFHM 2026-2027",
    discipline: "halterophilie",
    organisme: "FFHM",
    libelle: "Séries de haltérophilie (total olympique minimal)",
    saison: "2026-2027",
    releveLe: RELEVE_INITIAL,
    echeance: "2027-08-31",
    echeanceNote: "Supposée : fin de la saison 2026-2027 ; le règlement 2026-2027 a été mis en ligne en juillet 2026.",
    pages: [],
    documentsConnus: [REGLEMENT_FFHM_2026],
    motsCles: ["reglement", "halterophilie"],
    // Règlement 2026-2027 mis en ligne en juillet 2026 : on sonde de juin à septembre.
    preavisJours: 90,
    sondes: [
      { modele: "https://www.ffhaltero.fr/wp-content/uploads/{an}/{mm}/Reglement-sport-halterophilie-{an}-{an+1}.pdf", decalage: 0, mois: ["06", "07", "08", "09"] }
    ]
  },
  {
    id: "iwf-categories",
    court: "IWF 2026",
    discipline: "halterophilie",
    organisme: "IWF",
    libelle: "Catégories de poids IWF (en vigueur depuis le 01/08/2026)",
    saison: "cycle olympique 2028",
    releveLe: RELEVE_INITIAL,
    verifierTousLesJours: 365,
    echeanceNote: "Pas de date officielle : revue une fois par an. Le site de l'IWF répond 403 aux machines de GitHub (28/10/2026) : l'article est cité en référence, il n'est pas lu par la veille.",
    pages: [],
    references: ["https://iwf.sport/2025/11/03/bodyweight-categories-for-the-2028-olympics-in-los-angeles-are-defined/"],
    documentsConnus: [],
    motsCles: ["categories", "bodyweight"],
    sondes: []
  },
  {
    id: "sinclair",
    court: "Sinclair 2025-2028",
    discipline: "halterophilie",
    organisme: "IWF",
    libelle: "Coefficients Sinclair 2025-2028",
    saison: "2025-2028",
    releveLe: RELEVE_INITIAL,
    echeance: "2028-12-31",
    echeanceNote: "Les coefficients sont publiés pour quatre ans.",
    pages: [],
    documentsConnus: ["https://www.pzpc.pl/download/file/7343", "https://www.pzpc.pl/download/file/7344"],
    motsCles: ["sinclair"],
    sondes: []
  },
  {
    id: "ffa-bareme",
    court: "FFA barème 2010",
    discipline: "course",
    organisme: "FFA",
    libelle: "Barème des niveaux de performance (IA à D7)",
    saison: "barème du 1er janvier 2010",
    releveLe: RELEVE_INITIAL,
    verifierTousLesJours: 365,
    echeanceNote: "Barème inchangé depuis 2010 : revue une fois par an pour constater qu'il n'a pas bougé.",
    pages: [
      "https://www.athle.fr/asp.net/main.html/html.aspx?htmlid=125",
      "https://www.athle.fr/asp.net/main.html/html.aspx?htmlid=122"
    ],
    documentsConnus: [],
    motsCles: ["bareme", "baremes"],
    sondes: []
  },
  {
    id: "ffa-minima-france",
    court: "FFA running 2025-2026",
    discipline: "course",
    organisme: "FFA",
    libelle: "Minima des championnats de France de running",
    saison: "2025-2026",
    releveLe: RELEVE_INITIAL,
    echeance: "2026-12-31",
    echeanceNote:
      "Supposée : le livret porte le millésime 2026 ; au plus tôt plausible, fin 2026. Le livret suivant se devine (livret_2027_running.pdf).",
    pages: [],
    documentsConnus: [LIVRET_FFA_2026],
    motsCles: ["livret", "running", "minima"],
    sondes: [{ modele: "https://www.athle.fr/Reglement/livret_{an}_running.pdf", decalage: 1 }]
  },
  {
    id: "ffa-records",
    court: "records du monde World Athletics",
    discipline: "course",
    organisme: "World Athletics",
    libelle: "Records du monde sur route (5 km, 10 km, semi, marathon)",
    saison: "records ratifiés",
    releveLe: RELEVE_INITIAL,
    verifierTousLesJours: 90,
    echeanceNote: "Un record peut tomber à tout moment : revue tous les trois mois.",
    pages: ["https://worldathletics.org/records/by-category/world-records"],
    documentsConnus: [],
    motsCles: [],
    sondes: []
  },
  {
    id: "ffn-qualifications",
    court: "FFN 2026",
    discipline: "natation",
    organisme: "FFN",
    libelle: "Temps de qualification France Élite et Challenge National (50 m)",
    saison: "2026",
    releveLe: RELEVE_INITIAL,
    echeance: "2026-12-31",
    echeanceNote:
      "Supposée : « Annuel Règlements 2026 », publié en septembre 2026. Si la FFN le rattache à la saison 2026-2027, l'alerte de janvier est une fausse alerte à lever.",
    // Pas de page de liste connue : le document de cette année est suivi, et le calendrier prévient.
    pages: [],
    documentsConnus: [ANNUEL_FFN_2026],
    motsCles: ["reglement", "annuel", "qualification"],
    sondes: []
  },
  {
    id: "world-aquatics-points",
    court: "World Aquatics 2026",
    discipline: "natation",
    organisme: "World Aquatics",
    libelle: "Temps de base des points World Aquatics",
    saison: "2026 (50 m) · 09/2026-08/2027 (25 m)",
    releveLe: RELEVE_INITIAL,
    echeance: "2026-12-31",
    echeanceNote: "Bassin de 50 m : valable du 01/01 au 31/12/2026 ; bassin de 25 m : du 01/09/2026 au 31/08/2027. Les deux sont revus à la première échéance.",
    pages: ["https://www.worldaquatics.com/swimming/points"],
    documentsConnus: [BASES_WA_2026, ...WA_TABLES],
    motsCles: ["points", "base"],
    sondes: []
  }
];

/* ------------------------------------------------------------------ */
/* Calendrier                                                          */
/* ------------------------------------------------------------------ */

const MS_JOUR = 864e5;
/** Jours avant l'échéance où le contrôleur commence à sonder la saison suivante. */
export const PREAVIS_JOURS = 45;

const jour = (iso) => Date.parse(iso + "T00:00:00Z");
const enIso = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Échéance d'une source : sa date de fin, ou releveLe + verifierTousLesJours. */
export function echeanceDe(source) {
  if (source.echeance) return source.echeance;
  return enIso(jour(source.releveLe) + (source.verifierTousLesJours || 365) * MS_JOUR);
}

/**
 * État d'une source à une date :
 *   « ok »      : valide, échéance lointaine ;
 *   « bientot » : l'échéance tombe dans le préavis de la source ;
 *   « perimee » : l'échéance est passée, le jeu de données a pu être remplacé.
 */
export function etatSource(source, aujourdhui) {
  const reste = Math.round((jour(echeanceDe(source)) - jour(aujourdhui)) / MS_JOUR);
  const preavis = source.preavisJours == null ? PREAVIS_JOURS : source.preavisJours;
  const etat = reste < 0 ? "perimee" : reste <= preavis ? "bientot" : "ok";
  return { etat, echeance: echeanceDe(source), joursRestants: reste };
}

export const sourceParId = (id, sources = SOURCES_BAREMES) => sources.find((s) => s.id === id) || null;

/** Les sources à traiter à cette date (échéance proche ou passée), la plus en retard d'abord. */
export function sourcesATraiter(aujourdhui, sources = SOURCES_BAREMES) {
  return sources
    .map((s) => ({ source: s, ...etatSource(s, aujourdhui) }))
    .filter((x) => x.etat !== "ok")
    .sort((a, b) => a.joursRestants - b.joursRestants);
}

/**
 * Adresses de la prochaine édition à sonder à cette date : aucune tant que
 * la source est « ok ». Un modèle accepte {an}, {an+1} et {mm} ; {an} est
 * l'année de l'échéance + `decalage`.
 */
export function sondesDuJour(source, aujourdhui) {
  if (etatSource(source, aujourdhui).etat === "ok") return [];
  const urls = [];
  for (const sonde of source.sondes || []) {
    const an = Number(echeanceDe(source).slice(0, 4)) + (sonde.decalage || 0);
    for (const mm of sonde.mois || [""]) {
      urls.push(sonde.modele.replace(/\{an\+1\}/g, String(an + 1)).replace(/\{an\}/g, String(an)).replace(/\{mm\}/g, mm));
    }
  }
  return urls;
}

/* ------------------------------------------------------------------ */
/* Ce que l'app dit à son utilisateur                                   */
/* ------------------------------------------------------------------ */

const frDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const liste = (l) => (l.length > 1 ? `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}` : l[0] || "");

/**
 * Les phrases de source d'une discipline (« force », « halterophilie »,
 * « course », « natation »), sous « Ton niveau » :
 *   texte         : d'où viennent les barèmes et quand ils ont été relevés ;
 *   avertissement : seulement si l'échéance d'une source est passée. Le
 *                   texte dit « a pu paraître » : on ne sait pas qu'une
 *                   nouvelle édition existe, on sait que la saison est finie.
 * Rend null pour une discipline sans source.
 */
export function resumeSourcesDiscipline(discipline, aujourdhui, sources = SOURCES_BAREMES) {
  const liees = sources.filter((s) => s.discipline === discipline);
  if (!liees.length) return null;
  const releve = liees.map((s) => s.releveLe).sort()[0];
  const perimees = liees.filter((s) => etatSource(s, aujourdhui).etat === "perimee");
  return {
    texte: `Barèmes relevés le ${frDate(releve)} : ${liste(liees.map((s) => s.court))}.`,
    avertissement: perimees.length
      ? `Une nouvelle édition a pu paraître depuis (${liste(perimees.map((s) => s.court))}). Avant une compétition, vérifie sur le site de la fédération.`
      : null
  };
}
