/**
 * Carte de progres a partager, et invitation d'un ami.
 *
 * Demande du coach (1er octobre 2026) : se demarquer des applications grand
 * public non pas par une fonction de plus, mais par ce qu'elles n'ont pas —
 * un coach. Un client qui poste « 6 semaines, 18 seances » en story parle a
 * des gens qui lui ressemblent (jeunes papas, debutants) ; le bouton
 * « Inviter un ami » relie ce moment au parrainage existant (reduction sur
 * le mois suivant du parrain si le filleul signe).
 *
 * Ce module ne fait que des calculs : le dessin de l'image est dans
 * dessin-carte.js, le partage dans partage-carte.js.
 *
 * Confidentialite : le poids est une donnee de sante. Il n'apparait sur la
 * carte que si le client le demande explicitement (option desactivee par
 * defaut), et le prenom n'y figure jamais.
 */

import { num, round } from "./dates.js";
import { serieDuJour } from "./resume-semaine.js";
import { lienWhatsappCoach } from "./config.js";

/**
 * Lien que l'ami recoit : il ouvre une conversation WhatsApp avec le coach,
 * message deja ecrit avec le prenom du parrain. Choix du coach (1er octobre
 * 2026) : etre contacte directement plutot que par une prise de rendez-vous
 * — et le parrainage est identifie des le premier message.
 */
export function lienContactCoach(prenomParrain) {
  const qui = String(prenomParrain || "").trim();
  return lienWhatsappCoach(
    qui
      ? `Bonjour Marien, je viens de la part de ${qui}. J'aimerais en savoir plus sur ton coaching.`
      : "Bonjour Marien, j'aimerais en savoir plus sur ton coaching."
  );
}

/** Compte Instagram affiche en pied de carte. */
export const COMPTE_INSTAGRAM = "@coachneiram";

const dates = (liste) => (liste || []).map((x) => x && x.date).filter(Boolean);

/** Nombre de jours entre deux dates ISO (b - a), sans limite de duree. */
function joursEntre(a, b) {
  const utc = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.max(0, Math.round((utc(b) - utc(a)) / 864e5));
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Date de debut du coaching saisie par le client (profil.coachingStartDate).
 *
 * Demande du coach (2 octobre 2026) : des clients sont suivis depuis 2022,
 * bien avant l'application. Ils saisissent la date de leur premier rendez-
 * vous et les semaines de suivi se calculent seules a partir d'elle. Rend
 * null si la date est absente, illisible, dans le futur, ou avant 2000.
 */
export function debutSaisi(profil, date) {
  const v = profil && profil.coachingStartDate;
  if (typeof v !== "string" || !ISO.test(v)) return null;
  const [y, m, d] = v.split("-").map(Number);
  const reelle = new Date(Date.UTC(y, m - 1, d));
  if (reelle.getUTCFullYear() !== y || reelle.getUTCMonth() !== m - 1 || reelle.getUTCDate() !== d) return null;
  if (v < "2000-01-01" || v > date) return null;
  return v;
}

export const MOIS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

/** Nombre de jours d'un mois (mois de 1 a 12). */
export function joursDansMois(annee, mois) {
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}

/** Jour, mois et annee (nombres) d'une date ISO. */
export function partiesDate(iso) {
  const [annee, mois, jour] = String(iso).split("-").map(Number);
  return { jour, mois, annee };
}

/**
 * Date de debut choisie avec les trois listes Jour / Mois / Annee.
 *
 * Remplace le calendrier natif, inutilisable sur Android pour remonter a
 * 2022 (retour du coach du 2 octobre 2026) : les listes se comportent pareil
 * partout. Un jour trop grand pour le mois (31 fevrier) est ramene au
 * dernier jour du mois. Rend { iso } si la date est utilisable, sinon
 * { futur: true } (date apres aujourd'hui) ou {} (saisie incomplete).
 */
export function choixDebut({ jour, mois, annee }, date) {
  const a = Number(annee);
  const m = Number(mois);
  const j = Number(jour);
  if (!Number.isInteger(a) || !Number.isInteger(m) || !Number.isInteger(j) || a < 2000 || m < 1 || m > 12 || j < 1) return {};
  const jj = Math.min(j, joursDansMois(a, m));
  const iso = `${a}-${String(m).padStart(2, "0")}-${String(jj).padStart(2, "0")}`;
  if (iso > date) return { futur: true };
  return { iso };
}

/** Plus grand total de seances accepte (20 ans a 5 seances par semaine). */
export const SEANCES_MAX = 6000;

/**
 * Seances faites avant l'application (profil.seancesAvantApp).
 *
 * Demande du coach (2 octobre 2026) : des clients suivis depuis 2022, une a
 * quatre fois par semaine, approchent les 1 000 seances. Le client saisit
 * son total a ce jour ; l'application en retient la part faite avant elle,
 * et chaque nouvelle seance notee s'y ajoute. Rend 0 si la valeur est
 * absente ou illisible.
 */
export function seancesAvant(profil) {
  const v = profil && profil.seancesAvantApp;
  return Number.isInteger(v) && v > 0 && v <= SEANCES_MAX ? v : 0;
}

/**
 * Total saisi par le client (texte du champ) → seances a retenir comme
 * faites avant l'application. Rend null si la saisie n'est pas un nombre
 * entier entre 0 et SEANCES_MAX ; espaces et points de milliers acceptes
 * (« 1 000 », « 1.000 »). Un total inferieur aux seances deja notees dans
 * l'application donne 0 : elles comptent quoi qu'il arrive.
 */
export function seancesAvantDepuisTotal(texte, seancesApp) {
  const propre = String(texte == null ? "" : texte).replace(/[\s.\u202f\u00a0]/g, "");
  if (!/^\d{1,5}$/.test(propre)) return null;
  const total = Number(propre);
  if (total > SEANCES_MAX) return null;
  return Math.max(0, total - Math.max(0, Number(seancesApp) || 0));
}

/**
 * Les chiffres de la carte.
 *
 * - debut : la date de debut du coaching saisie par le client s'il l'a
 *   donnee (debutSaisi), sinon la premiere date ou il a note quoi que ce
 *   soit ;
 * - semaines : semaines entamees depuis ce debut (1 au minimum) ;
 * - seances : seances au total, celles d'avant l'application (seancesAvant)
 *   comprises ; seancesApp : celles notees dans l'application ;
 * - joursNotes : jours distincts avec au moins une saisie ;
 * - serie : jours consecutifs notes jusqu'a aujourd'hui (ou hier, le matin) ;
 * - poids : premiere et derniere pesee, et l'ecart — null sans pesee recente.
 */
export function statistiquesProgres({ profil, seances, pesees, repas, journal, date }) {
  const toutes = [...dates(seances), ...dates(pesees), ...dates(repas), ...dates(journal)].filter((d) => d <= date);
  const saisi = debutSaisi(profil, date);
  if (!toutes.length && !saisi) return null;
  const debut = saisi || toutes.reduce((a, b) => (b < a ? b : a));
  const seancesApp = (seances || []).filter((s) => s && s.date && s.date <= date).length;

  // Depart : le poids saisi a l'inscription s'il existe — c'est le vrai
  // debut du suivi —, sinon la premiere pesee. Actuel : la derniere pesee.
  const triees = (pesees || [])
    .filter((p) => p && p.date && p.date <= date && num(p.weightKg) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const inscription = num(profil && profil.startWeightKg);
  const depart = inscription > 0 ? inscription : triees.length > 1 ? num(triees[0].weightKg) : null;
  const actuel = triees.length ? num(triees[triees.length - 1].weightKg) : null;
  const poids = depart && actuel ? { depart, actuel, ecart: round(actuel - depart, 1) } : null;

  return {
    debut,
    semaines: Math.max(1, Math.ceil((joursEntre(debut, date) + 1) / 7)),
    seancesApp,
    seances: seancesApp + seancesAvant(profil),
    joursNotes: new Set(toutes).size,
    serie: serieDuJour({ date, repas, journal, seances }).jours,
    poids
  };
}

/** Nombre a la francaise : virgule decimale, vrai signe moins. */
export function nombreFr(n, decimales = 0) {
  const v = round(Math.abs(num(n)), decimales);
  const texte = v.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  return (num(n) < 0 && v !== 0 ? "−" : "") + texte;
}

const pluriel = (n, mot, motPluriel = mot + "s") => (n > 1 ? motPluriel : mot);

/**
 * Les lignes affichees sur la carte, dans l'ordre, quatre au plus.
 *
 * Un chiffre nul n'est pas affiche : « 0 seance » n'encourage personne.
 * L'ecart de poids n'apparait qu'avec `avecPoids`, et seulement s'il est
 * non nul ; son signe est affiche tel quel (« −3,2 kg » ou « +2 kg ») — une
 * prise de masse se celebre aussi.
 */
export function lignesCarte(stats, { avecPoids = false } = {}) {
  if (!stats) return [];
  const lignes = [
    { valeur: nombreFr(stats.semaines), libelle: pluriel(stats.semaines, "semaine") + " de suivi" }
  ];
  if (stats.seances > 0) {
    lignes.push({ valeur: nombreFr(stats.seances), libelle: pluriel(stats.seances, "séance réalisée", "séances réalisées") });
  }
  if (avecPoids && stats.poids && stats.poids.ecart !== 0) {
    lignes.push({
      valeur: (stats.poids.ecart > 0 ? "+" : "") + nombreFr(stats.poids.ecart, 1) + " kg",
      libelle: "depuis le début"
    });
  }
  if (stats.serie >= 2) {
    lignes.push({ valeur: nombreFr(stats.serie), libelle: "jours de suite" });
  } else if (stats.joursNotes > 1) {
    lignes.push({ valeur: nombreFr(stats.joursNotes), libelle: "jours suivis" });
  }
  return lignes.slice(0, 4);
}

/**
 * Message d'invitation, pret a envoyer par WhatsApp ou SMS.
 *
 * Le lien ouvre une conversation avec le coach ou le prenom du parrain est
 * deja ecrit : c'est ce qui permet d'appliquer la reduction de parrainage
 * quand l'ami signe, sans compter sur sa memoire.
 */
export function messageInvitation({ prenom }) {
  return (
    "J'ai repris le sport avec Coach Neiram, coach sportif à Clermont-Ferrand et en ligne. " +
    "Si tu veux t'y mettre toi aussi, écris-lui directement sur WhatsApp : " +
    lienContactCoach(prenom)
  );
}

/** Nom du fichier image partage. */
/**
 * Conditions du parrainage, affichees dans l'application (visuel du coach
 * du 01/10/2026). Source de verite : memory/offres.md du Business OS
 * (« Parrainage »). Si les conditions changent, mettre a jour ici le meme
 * jour. Le montant en euros du coaching en ligne n'est volontairement pas
 * affiche : il depend du tarif du client.
 */
export const PARRAINAGE = {
  accroche: "Fais profiter un proche, gagne sur ton coaching",
  explication: "Chaque personne que tu amènes et qui démarre un coaching te fait gagner une réduction sur ton mois suivant.",
  paliers: [
    { formule: "Suivi hebdo", gain: "Une séance offerte" },
    { formule: "Suivi mensuel", gain: "55 € offerts" },
    { formule: "Coaching en ligne", gain: "−25 %" }
  ],
  precision: "sur ton mois suivant",
  condition: "Valable dès que la personne recommandée signe un coaching."
};

export const nomFichierCarte = (date) => `progres-coach-neiram-${date}.png`;
