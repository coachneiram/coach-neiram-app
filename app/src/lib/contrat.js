/**
 * Contrat en cours avec le coach : compte a rebours jusqu'a sa fin.
 *
 * Demande du coach (3 octobre 2026). Le client choisit sa formule et la date
 * de debut de son contrat en cours ; l'application calcule la date de fin,
 * les semaines restantes et les seances notees depuis le debut du contrat.
 * Dans les 4 dernieres semaines, un message l'invite a en parler au coach
 * (renouvellement), sans pression commerciale.
 *
 * Formules : grille de memory/offres.md du Business OS (06/09/2026). Les
 * formules mensuelles se reconduisent chaque mois : pas de date de fin, donc
 * pas de compte a rebours. Si la grille change, mettre a jour FORMULES_CONTRAT
 * le meme jour.
 */

import { addDays, todayISO } from "./dates.js";

export const FORMULES_CONTRAT = [
  { id: "hebdo-3", label: "Suivi hebdo · 3 mois", mois: 3 },
  { id: "hebdo-6", label: "Suivi hebdo · 6 mois", mois: 6 },
  { id: "hebdo-12", label: "Suivi hebdo · 12 mois", mois: 12 },
  { id: "enligne-6", label: "Coaching en ligne · 6 mois", mois: 6 },
  { id: "mensuel", label: "Suivi mensuel (sans engagement)", mois: null },
  { id: "distance", label: "Suivi à distance (mensuel)", mois: null }
];

/** Fenetre du message de fin de contrat, en jours. */
export const PREAVIS_JOURS = 28;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function dateValide(v) {
  if (typeof v !== "string" || !ISO.test(v)) return false;
  const [a, m, j] = v.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, j));
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j && v >= "2000-01-01";
}

/**
 * Date ISO + n mois. Un jour absent du mois d'arrivee est ramene a son
 * dernier jour (31 janvier + 1 mois → 28 ou 29 fevrier).
 */
export function ajouterMois(iso, n) {
  const [a, m, j] = iso.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  const annee = Math.floor(total / 12);
  const mois = (total % 12) + 1;
  const dernier = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  return `${annee}-${String(mois).padStart(2, "0")}-${String(Math.min(j, dernier)).padStart(2, "0")}`;
}

/** Jours entre deux dates ISO (b - a), negatif si b est avant a. */
function jours(a, b) {
  const utc = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(b) - utc(a)) / 864e5);
}

/** Le contrat stocke dans le profil, s'il est lisible ; null sinon. */
export function contratDuProfil(profil) {
  const c = profil && profil.contrat;
  if (!c || typeof c !== "object") return null;
  const formule = FORMULES_CONTRAT.find((f) => f.id === c.formule);
  if (!formule || !dateValide(c.debut)) return null;
  return { formule, debut: c.debut };
}

/**
 * Etat du contrat a une date donnee.
 *
 * - fin : dernier jour du contrat (debut + duree, moins un jour) ;
 * - joursRestants / semainesRestantes : jusqu'a la fin incluse ;
 * - bientot : dans les PREAVIS_JOURS derniers jours ;
 * - termine : la date de fin est passee ;
 * - seances : seances notees depuis le debut du contrat ;
 * - sansEngagement : formule mensuelle, pas de date de fin.
 * Rend null sans contrat lisible.
 */
export function etatContrat({ profil, seances, date = todayISO() }) {
  const c = contratDuProfil(profil);
  if (!c) return null;
  const seancesContrat = (seances || []).filter((s) => s && s.date && s.date >= c.debut && s.date <= date).length;
  const base = { formule: c.formule, debut: c.debut, seances: seancesContrat };
  if (!c.formule.mois) return { ...base, sansEngagement: true };

  const fin = addDays(ajouterMois(c.debut, c.formule.mois), -1);
  const joursRestants = Math.max(0, jours(date, fin) + 1);
  const joursTotal = jours(c.debut, fin) + 1;
  return {
    ...base,
    sansEngagement: false,
    fin,
    joursTotal,
    joursEcoules: Math.min(joursTotal, Math.max(0, jours(c.debut, date) + 1)),
    joursRestants,
    semainesRestantes: Math.ceil(joursRestants / 7),
    termine: date > fin,
    bientot: date <= fin && joursRestants <= PREAVIS_JOURS
  };
}

/**
 * Trophees du contrat en cours (demande du coach du 3 octobre 2026) :
 * « Contrat lancé », « Mi-parcours » (la moitie de la duree passee),
 * « Contrat bouclé » (dernier jour atteint). Les identifiants portent la
 * date de debut : un renouvellement ouvre une nouvelle serie a celebrer.
 * Rien pour une formule sans engagement (pas de fin).
 */
export function tropheesContrat(etat) {
  if (!etat || etat.sansEngagement) return [];
  const sem = (j) => Math.floor(j / 7);
  const moitie = Math.ceil(etat.joursTotal / 2);
  const id = (k) => `contrat-${etat.debut}-${k}`;
  const detail = etat.formule.label;
  return [
    { id: id("lance"), famille: "contrat", titre: "Contrat lancé", detail, obtenu: etat.joursEcoules >= 1, progression: "à venir" },
    {
      id: id("mi-parcours"),
      famille: "contrat",
      titre: "Mi-parcours",
      detail,
      obtenu: etat.joursEcoules >= moitie,
      progression: `${sem(etat.joursEcoules)}/${sem(moitie)} sem.`
    },
    {
      id: id("boucle"),
      famille: "contrat",
      titre: "Contrat bouclé",
      detail,
      obtenu: etat.joursEcoules >= etat.joursTotal,
      progression: `${sem(etat.joursEcoules)}/${sem(etat.joursTotal)} sem.`
    }
  ];
}

/**
 * Ligne du contrat pour le coach (bilan hebdo et rapport IA), ou null sans
 * contrat. Les fins proches et passees sont signalees en tete de ligne pour
 * sauter aux yeux.
 */
export function ligneContratCoach(etat) {
  if (!etat) return null;
  const seances = `${etat.seances} séance${etat.seances > 1 ? "s" : ""} notée${etat.seances > 1 ? "s" : ""} depuis le début du contrat`;
  const periode = `${etat.formule.label}, depuis le ${dateCourte(etat.debut)}`;
  if (etat.sansEngagement) return `${periode} (sans engagement) · ${seances}`;
  if (etat.termine) return `CONTRAT TERMINÉ le ${dateCourte(etat.fin)} : à renouveler · ${periode} · ${seances}`;
  if (etat.bientot) {
    return `FIN DE CONTRAT dans ${etat.semainesRestantes} semaine${etat.semainesRestantes > 1 ? "s" : ""} (le ${dateCourte(etat.fin)}) : à renouveler · ${periode} · ${seances}`;
  }
  return `${periode}, jusqu'au ${dateCourte(etat.fin)} (encore ${etat.semainesRestantes} semaines) · ${seances}`;
}

/** Date ISO → « 28/02/2027 ». */
export const dateCourte = (iso) => iso.split("-").reverse().join("/");

/**
 * Message de fin de contrat, ou null s'il n'y a rien a dire. Texte propose
 * au coach le 3 octobre 2026 (option « Oui, a 4 semaines »).
 */
export function messageFinContrat(etat) {
  if (!etat || etat.sansEngagement) return null;
  if (etat.termine) {
    return `Ton contrat est arrivé à son terme le ${dateCourte(etat.fin)} : parles-en à Marien pour la suite.`;
  }
  if (!etat.bientot) return null;
  if (etat.semainesRestantes <= 1) {
    return "Ton contrat se termine cette semaine : parles-en à Marien à ta prochaine séance.";
  }
  return `Ton contrat se termine dans ${etat.semainesRestantes} semaines : parles-en à Marien à ta prochaine séance.`;
}
