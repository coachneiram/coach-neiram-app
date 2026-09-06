/**
 * Coach Neiram — synchro coaching en ligne (version sécurisée)
 * Reçoit les pointages et les alertes envoyés par l'application client.
 *
 * ─────────────────────────────────────────────────────────────────────
 * CE QUI CHANGE PAR RAPPORT À LA VERSION PRÉCÉDENTE
 * ─────────────────────────────────────────────────────────────────────
 * 1. Secret partagé : seules les requêtes venant du proxy Cloudflare sont
 *    acceptées (une fois EXIGER_SECRET passé à true).
 * 2. Validation stricte : type d'événement connu, textes plafonnés.
 *    Plus personne ne peut écrire ce qu'il veut dans le classeur.
 * 3. Plafond d'e-mails : même en cas d'abus, ton quota Gmail est protégé
 *    et tes vraies alertes continuent de partir.
 *
 * ─────────────────────────────────────────────────────────────────────
 * ORDRE DE MISE EN PLACE — IMPORTANT
 * ─────────────────────────────────────────────────────────────────────
 * L'application ne peut pas savoir si un envoi a été refusé : un événement
 * rejeté serait perdu sans message d'erreur. Il faut donc respecter cet ordre :
 *
 *   Étape 1. Coller ce fichier, garder EXIGER_SECRET = false, redéployer.
 *            (le script accepte encore l'ancienne app : rien ne casse)
 *   Étape 2. Mettre l'application à jour et vérifier qu'un pointage arrive.
 *   Étape 3. Seulement ensuite : passer EXIGER_SECRET à true et redéployer.
 *
 * ─────────────────────────────────────────────────────────────────────
 * INSTALLATION
 * ─────────────────────────────────────────────────────────────────────
 * 1. Remplace EMAIL_COACH par ton adresse (garde celle déjà en place).
 * 2. Remplace SECRET_PARTAGE par un long mot de passe aléatoire, et mets
 *    exactement le même dans Cloudflare (variable COACH_SYNC_SECRET).
 * 3. Déployer > Gérer les déploiements > modifier > Nouvelle version.
 *    - Exécuter en tant que : moi
 *    - Qui a accès : tout le monde  (nécessaire : c'est le proxy qui poste)
 */

var EMAIL_COACH = 'ton.adresse@exemple.com';
var ONGLET_JOURNAL = 'Journal';
var ONGLET_ALERTES = 'Alertes';

// Mot de passe partagé avec le proxy Cloudflare. Il n'apparaît jamais dans
// l'application : il ne circule qu'entre Cloudflare et ce script.
var SECRET_PARTAGE = 'REMPLACE-MOI-PAR-UN-LONG-MOT-DE-PASSE-ALEATOIRE';

// Passer à true UNIQUEMENT après l'étape 2 ci-dessus.
var EXIGER_SECRET = false;

// Plafonds d'e-mails par jour (protection du quota Gmail, ~100/jour).
var MAX_MAILS_PAR_CLIENT_PAR_JOUR = 3;
var MAX_MAILS_TOTAL_PAR_JOUR = 20;

// Types d'événements réellement envoyés par l'application.
var TYPES_AUTORISES = [
  'pointage',
  'justification',
  'semaine_difficile',
  'alerte_semaines_difficiles',
  'alerte_seances_manquees',
  'alerte_decalages',
  'resume_hebdo'
];

// Le resume hebdomadaire s'ecrit toujours dans le classeur, mais ne
// declenche un e-mail que sous ce taux : au-dessus, le recapitulatif du
// lundi 8h suffit, et un mail hebdomadaire qui dit « tout va bien » finit
// par ne plus etre lu.
var SEUIL_RESPECT_MAIL_PCT = 70;

var LONGUEUR_MAX_TEXTE = 500;

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (EXIGER_SECRET && String(data.secret || '') !== SECRET_PARTAGE) {
      return json({ ok: false, error: 'non-autorise' });
    }
    if (TYPES_AUTORISES.indexOf(String(data.type || '')) === -1) {
      return json({ ok: false, error: 'type-inconnu' });
    }

    var propre = nettoyer(data);
    enregistrer(propre);

    if (String(propre.type).indexOf('alerte') === 0 || propre.type === 'semaine_difficile') {
      notifier(propre);
    } else if (propre.type === 'resume_hebdo' && meriteMail(propre)) {
      notifier(propre);
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Recopie champ par champ en plafonnant chaque texte. Rien d'inattendu
 * n'atteint le classeur ni les e-mails.
 */
function nettoyer(d) {
  var propre = {
    type: court(d.type),
    client: court(d.client) || 'Client sans prénom',
    date: court(d.date),
    creneau: court(d.creneau),
    lieu: court(d.lieu),
    heureReelle: court(d.heureReelle),
    retard: !!d.retard,
    maintien: !!d.maintien,
    dureeMin: nombre(d.dureeMin),
    rpe: nombre(d.rpe),
    motif: court(d.motif),
    message: court(d.message),
    note: court(d.note),
    nbManquees: nombre(d.nbManquees),
    nbDecalages: nombre(d.nbDecalages),
    honored: nombre(d.honored),
    resolved: nombre(d.resolved),
    missed: nombre(d.missed),
    shifted: nombre(d.shifted),
    pct: nombre(d.pct)
  };
  propre.creneauxManques = creneauxCourts(d.creneauxManques);
  propre.creneauxDecales = creneauxCourts(d.creneauxDecales);
  return propre;
}

/** Renvoie [] quand ce n'est pas un tableau : les appelants n'ont plus a tester. */
function creneauxCourts(liste) {
  if (Object.prototype.toString.call(liste) !== '[object Array]') return [];
  return liste.slice(0, 20).map(function (m) {
    m = m || {};
    return { jour: court(m.jour), heure: court(m.heure), date: court(m.date), lieu: court(m.lieu) };
  });
}

/**
 * Le resume hebdomadaire ne merite un e-mail que si le taux a decroche.
 * Un pct vide (aucun creneau tranche) ne declenche rien.
 */
function meriteMail(d) {
  return d.pct !== '' && d.pct < SEUIL_RESPECT_MAIL_PCT;
}

function court(v) {
  if (v === undefined || v === null) return '';
  return String(v).slice(0, LONGUEUR_MAX_TEXTE);
}

function nombre(v) {
  var n = Number(v);
  return isNaN(n) ? '' : n;
}

function feuille(nom, entetes) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nom);
  if (!sh) {
    sh = ss.insertSheet(nom);
    sh.appendRow(entetes);
    sh.getRange(1, 1, 1, entetes.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function enregistrer(d) {
  var sh = feuille(ONGLET_JOURNAL, ['Reçu le', 'Client', 'Type', 'Date séance', 'Créneau', 'Lieu', 'Heure réelle', 'Retard', 'Durée', 'RPE', 'Détail']);
  sh.appendRow([
    new Date(),
    d.client,
    d.type,
    d.date,
    d.creneau,
    d.lieu,
    d.heureReelle,
    d.retard ? 'oui' : '',
    d.dureeMin,
    d.rpe,
    d.message || d.note || d.motif || (d.maintien ? 'séance maintien' : '')
  ]);
}

/**
 * Compteur d'e-mails du jour, stocké dans les propriétés du script.
 * Renvoie false quand le plafond est atteint : la ligne reste écrite dans
 * l'onglet Alertes, seul l'e-mail est supprimé.
 */
function peutEnvoyerMail(client) {
  var props = PropertiesService.getScriptProperties();
  var aujourdHui = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var etat;
  try {
    etat = JSON.parse(props.getProperty('quota_mails') || '{}');
  } catch (err) {
    etat = {};
  }
  if (etat.jour !== aujourdHui) etat = { jour: aujourdHui, total: 0, clients: {} };

  var parClient = etat.clients[client] || 0;
  if (etat.total >= MAX_MAILS_TOTAL_PAR_JOUR) return false;
  if (parClient >= MAX_MAILS_PAR_CLIENT_PAR_JOUR) return false;

  etat.total += 1;
  etat.clients[client] = parClient + 1;
  props.setProperty('quota_mails', JSON.stringify(etat));
  return true;
}

function notifier(d) {
  var sh = feuille(ONGLET_ALERTES, ['Reçu le', 'Client', 'Type', 'Détail', 'Traité']);
  sh.appendRow([new Date(), d.client, d.type, d.message || d.motif || '', '']);

  if (!peutEnvoyerMail(d.client)) return;

  var sujet, corps;
  if (d.type === 'alerte_seances_manquees') {
    var lignes = (d.creneauxManques || []).map(function (m) {
      return '  - ' + m.jour + ' ' + m.heure + ' (' + m.date + ')' + (m.lieu ? ' — ' + m.lieu : '');
    }).join('\n');
    sujet = '[Coach] ' + d.client + ' : ' + d.nbManquees + ' séances manquées';
    corps = d.client + ' a manqué ' + d.nbManquees + ' créneaux sur les 14 derniers jours :\n\n' + lignes +
      '\n\nAppelle-le avant la prochaine séance. Le sujet à traiter est le créneau, pas le programme.';
  } else if (d.type === 'alerte_decalages') {
    var decales = (d.creneauxDecales || []).map(function (m) {
      return '  - ' + m.jour + ' ' + m.heure + ' (' + m.date + ')' + (m.lieu ? ' — ' + m.lieu : '');
    }).join('\n');
    sujet = '[Coach] ' + d.client + ' : ' + d.nbDecalages + ' créneaux décalés';
    corps = d.client + ' a décalé ou rattrapé ' + d.nbDecalages + ' créneaux sur les 4 dernières semaines :\n\n' + decales +
      '\n\nLes séances ont bien eu lieu — c\'est l\'horaire qui ne tient plus. À revoir avec elle.';
  } else if (d.type === 'resume_hebdo') {
    sujet = '[Coach] ' + d.client + ' : taux de respect à ' + d.pct + ' %';
    corps = d.client + ' est à ' + d.pct + ' % de respect de ses créneaux sur 4 semaines ' +
      '(' + d.honored + ' tenus sur ' + d.resolved + ' tranchés, ' + d.missed + ' manqués, ' + d.shifted + ' décalés).\n\n' +
      'Sous ' + SEUIL_RESPECT_MAIL_PCT + ' %, le créneau lui-même est en cause plus souvent que la motivation.';
  } else if (d.type === 'alerte_semaines_difficiles') {
    sujet = '[Coach] ' + d.client + ' : 2e semaine maintien d\'affilée';
    corps = d.client + ' a basculé en format maintien deux semaines de suite (motif : ' + (d.motif || 'non précisé') + ').\n\n' +
      'Le bouton fait son travail, mais deux semaines de suite = le créneau ne tient plus. À renégocier.';
  } else {
    sujet = '[Coach] ' + d.client + ' : semaine difficile déclarée';
    corps = d.client + ' a basculé sa semaine en format maintien 15-20 min (motif : ' + (d.motif || 'non précisé') + ').\n\n' +
      'Aucune action requise pour l\'instant. Surveille si ça se répète la semaine prochaine.';
  }
  MailApp.sendEmail(EMAIL_COACH, sujet, corps);
}

/**
 * Optionnel : récapitulatif hebdomadaire par client.
 * Déclencheurs > Ajouter un déclencheur > resumeHebdo > Horaire > Semaine > lundi 8h.
 */
function resumeHebdo() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_JOURNAL);
  if (!sh || sh.getLastRow() < 2) return;
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues();
  var depuis = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  var parClient = {};
  rows.forEach(function (r) {
    if (!(r[0] instanceof Date) || r[0] < depuis) return;
    var c = r[1] || 'Inconnu';
    parClient[c] = parClient[c] || { pointages: 0, alertes: 0 };
    if (r[2] === 'pointage') parClient[c].pointages++;
    else parClient[c].alertes++;
  });
  var lignes = Object.keys(parClient).sort().map(function (c) {
    return c + ' : ' + parClient[c].pointages + ' séance(s) pointée(s)' + (parClient[c].alertes ? ', ' + parClient[c].alertes + ' alerte(s)' : '');
  });
  if (!lignes.length) return;
  MailApp.sendEmail(EMAIL_COACH, '[Coach] Semaine écoulée — coaching en ligne', lignes.join('\n'));
}
