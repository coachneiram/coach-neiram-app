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

import { addDays, num, round } from "./dates.js";
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

/** Nombre de jours entre deux dates ISO (b - a). */
function joursEntre(a, b) {
  let n = 0;
  let d = a;
  // Boucle bornee : 10 ans de suivi au plus, largement au-dela du besoin.
  while (d < b && n < 3700) {
    d = addDays(d, 1);
    n++;
  }
  return n;
}

/**
 * Les chiffres de la carte.
 *
 * - debut : premiere date ou le client a note quoi que ce soit ;
 * - semaines : semaines entamees depuis ce debut (1 au minimum) ;
 * - seances : seances enregistrees au total ;
 * - joursNotes : jours distincts avec au moins une saisie ;
 * - serie : jours consecutifs notes jusqu'a aujourd'hui (ou hier, le matin) ;
 * - poids : premiere et derniere pesee, et l'ecart — null sans pesee recente.
 */
export function statistiquesProgres({ profil, seances, pesees, repas, journal, date }) {
  const toutes = [...dates(seances), ...dates(pesees), ...dates(repas), ...dates(journal)].filter((d) => d <= date);
  if (!toutes.length) return null;
  const debut = toutes.reduce((a, b) => (b < a ? b : a));

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
    seances: (seances || []).filter((s) => s && s.date && s.date <= date).length,
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
export const nomFichierCarte = (date) => `progres-coach-neiram-${date}.png`;
