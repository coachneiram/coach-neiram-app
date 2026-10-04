/**
 * Coach Neiram — synchro et alertes du coaching en ligne
 * Version 2.1 (4 octobre 2026) — la v2 installée chez le coach, durcie.
 *
 * La v2 (écriture par en-têtes, anti-doublon, onglets Alertes, Erreurs et
 * Adherence, cases à cocher) est conservée telle quelle. La v2.1 ajoute :
 *   1. Secret partagé avec le proxy Cloudflare (activable en deux temps).
 *   2. Le secret n'est jamais écrit dans le classeur (colonne Brut nettoyée).
 *   3. Réponse { ok: false } en cas d'erreur : le proxy et l'application
 *      gardent l'événement et le renvoient, au lieu de le perdre en silence.
 *   4. Les champs envoyés par l'application (heureReelle, dureeMin, note,
 *      weekKey, chiffres du résumé hebdo) arrivent dans les bonnes colonnes ;
 *      l'onglet Adherence se remplit à partir du résumé hebdomadaire.
 *   5. Plafond d'e-mails par jour (20 au total, 3 par client), en plus de
 *      l'anti-doublon : de faux prénoms ne peuvent plus épuiser le quota.
 *   6. Un texte qui commence par = + - @ est écrit comme du texte, jamais
 *      exécuté comme une formule.
 *
 * INSTALLATION (le guide détaillé est dans worker/README.md)
 * 1. Classeur « Suivi Coaching en ligne » > Extensions > Apps Script.
 * 2. Remplace tout le contenu de Code.gs par ce fichier, enregistre.
 * 3. Lance UNE FOIS migrer() (ajoute les colonnes, ne décale rien).
 * 4. Lance UNE FOIS genererSecret() : il crée le secret et l'affiche.
 *    Recopie-le dans Cloudflare (variable COACH_SYNC_SECRET du Worker).
 * 5. Déployer > Gérer les déploiements > crayon > Version : Nouvelle version
 *    > Déployer. L'adresse /exec ne change pas.
 * 6. Nouvelle installation : mets EXIGER_SECRET = false tant qu'un vrai
 *    pointage n'est pas arrivé dans l'onglet Journal, puis remets true et
 *    redéploie. (En production chez le coach : true depuis le 04/10/2026.)
 */

/* ---------------------------------------------------------------- CONFIG */

/** Adresse qui reçoit les alertes. Le dépôt garde un exemple : remets ton
 *  adresse ici en installant (celle de la v2). */
var EMAIL_COACH = 'ton.adresse@exemple.com';

var F_JOURNAL  = 'Journal';
var F_ALERTES  = 'Alertes';
var F_ERREURS  = 'Erreurs';
var F_ADHERENCE = 'Adherence';

/** true en production depuis le 4 octobre 2026 (version 13 du déploiement,
 *  vérifiée par un pointage réel accepté avec le secret). Sur une NOUVELLE
 *  installation : mettre false le temps de vérifier qu'un vrai pointage
 *  arrive dans le Journal, puis remettre true. */
var EXIGER_SECRET = true;

/** Nom de la propriété du script qui contient le secret. Le secret n'est
 *  jamais écrit dans ce fichier : genererSecret() le crée et le range dans
 *  Paramètres du projet > Propriétés du script. */
var PROPRIETE_SECRET = 'SECRET_SYNC';

/** Types d'événements réellement envoyés par l'application (même liste
 *  que l'application et le proxy ; un test vérifie qu'elles sont égales). */
var TYPES_AUTORISES = [
  'pointage',
  'justification',
  'semaine_difficile',
  'alerte_semaines_difficiles',
  'alerte_seances_manquees',
  'alerte_decalages',
  'resume_hebdo'
];

/** Heures pendant lesquelles on n'envoie pas deux fois la même alerte
 *  pour le même client. Mets 0 pour désactiver l'anti-doublon. */
var ANTI_DOUBLON_HEURES = 12;

/** Plafonds d'e-mails par jour (le quota Gmail est d'environ 100 par jour). */
var MAX_MAILS_PAR_CLIENT_PAR_JOUR = 3;
var MAX_MAILS_TOTAL_PAR_JOUR = 20;

/** Le résumé hebdomadaire s'écrit toujours dans le classeur, mais ne
 *  déclenche une alerte et un e-mail que sous ce taux de respect. */
var SEUIL_RESPECT_MAIL_PCT = 70;

var LONGUEUR_MAX_TEXTE = 500;

/** Colonnes attendues. Si elles manquent, migrer() les ajoute à la FIN,
 *  sans jamais décaler celles qui existent déjà. */
var ENTETES_JOURNAL = ['Reçu le', 'Client', 'Type', 'Date séance', 'Créneau',
                       'Lieu', 'Heure réelle', 'Retard', 'Durée', 'RPE',
                       'Détail', 'Statut', 'Motif', 'Message', 'Brut',
                       'Note', 'Semaine', 'Tenus', 'Tranchés', 'Manqués',
                       'Décalés', '% respect (4 sem.)'];
var ENTETES_ALERTES = ['Reçu le', 'Client', 'Type', 'Détail', 'Traité'];
var ENTETES_ERREURS = ['Recu le', 'Erreur', 'Donnees brutes'];
var ENTETES_ADHERENCE = ['Reçu le', 'Client', 'Semaine', 'Tenus', 'Tranchés',
                         'Manqués', 'Décalés', '% respect (4 sem.)'];

/** Correspondance entre les champs envoyés par l'application (après
 *  nettoyage) et les en-têtes du Journal. */
var CHAMPS = {
  client:      'Client',
  type:        'Type',
  date:        'Date séance',
  creneau:     'Créneau',
  lieu:        'Lieu',
  heureReelle: 'Heure réelle',
  retard:      'Retard',
  dureeMin:    'Durée',
  rpe:         'RPE',
  motif:       'Motif',
  message:     'Message',
  note:        'Note',
  weekKey:     'Semaine',
  honored:     'Tenus',
  resolved:    'Tranchés',
  missed:      'Manqués',
  shifted:     'Décalés',
  pct:         '% respect (4 sem.)'
};

/* ------------------------------------------------------------ POINT D'ENTRÉE */

function doPost(e) {
  var verrou = LockService.getScriptLock();
  try {
    verrou.waitLock(20000);
  } catch (err) {
    // Trop d'envois simultanés : l'application renverra l'événement.
    return reponse(false, 'occupe');
  }
  try {
    var recu = lireCorps(e);
    if (!recu) {
      journaliserErreur('Corps vide ou JSON invalide', brutSansSecret(e));
      return reponse(false, 'json-invalide');
    }
    if (EXIGER_SECRET && !secretValide(recu.secret)) {
      return reponse(false, 'non-autorise');
    }
    if (TYPES_AUTORISES.indexOf(String(recu.type || '')) === -1) {
      journaliserErreur('Type inconnu : ' + court(recu.type), JSON.stringify(nettoyer(recu)));
      return reponse(false, 'type-inconnu');
    }

    var data = nettoyer(recu);
    journaliser(data);
    if (data.type === 'resume_hebdo') {
      try { majAdherence(); } catch (err) { journaliserErreur('Adherence : ' + err, ''); }
    }

    if (doitAlerter(data)) {
      consignerAlerte(data);
      // L'événement est enregistré : un échec d'e-mail ne doit pas le faire
      // renvoyer par l'application, sinon il serait écrit deux fois.
      try {
        if (/@exemple\.com$/.test(EMAIL_COACH)) {
          journaliserErreur('EMAIL_COACH non renseigné : alerte non envoyée', JSON.stringify(data));
        } else if (doitEnvoyerMail(data) && peutEnvoyerMail(data.client)) {
          var m = composerMail(data);
          MailApp.sendEmail(EMAIL_COACH, m.sujet, m.corps);
          marquerEnvoi(data);
        }
      } catch (err) {
        journaliserErreur('E-mail non envoyé : ' + err, JSON.stringify(data));
      }
    }
    return reponse(true);

  } catch (err) {
    journaliserErreur(String(err), brutSansSecret(e));
    // ok: false → le proxy répond une erreur, l'application garde
    // l'événement en file et le renverra.
    return reponse(false, 'erreur');
  } finally {
    verrou.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput(
    'Synchro Coach Neiram active (v2.1). Utiliser POST.');
}

/* ------------------------------------------------------------------ LECTURE */

function lireCorps(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  try {
    var d = JSON.parse(e.postData.contents);
    return d && typeof d === 'object' ? d : null;
  } catch (err) { return null; }
}

/** Le corps reçu, sans le secret, pour l'onglet Erreurs. */
function brutSansSecret(e) {
  try {
    var contenu = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    try {
      var d = JSON.parse(contenu);
      if (d && typeof d === 'object') { delete d.secret; return JSON.stringify(d).slice(0, 2000); }
    } catch (err) { /* pas du JSON : on masque ce qui ressemble au secret */ }
    return String(contenu).replace(/"secret"\s*:\s*"[^"]*"/g, '"secret":"***"').slice(0, 2000);
  } catch (err) { return ''; }
}

/* ------------------------------------------------------------------ SECRET */

function secretAttendu() {
  return PropertiesService.getScriptProperties().getProperty(PROPRIETE_SECRET) || '';
}

function secretValide(fourni) {
  var attendu = secretAttendu();
  return attendu !== '' && String(fourni || '') === attendu;
}

/**
 * À lancer UNE FOIS : crée un secret aléatoire, le range dans les
 * propriétés du script et l'affiche pour que tu le recopies dans Cloudflare.
 * Si un secret existe déjà, il est seulement réaffiché (rien ne change).
 */
function genererSecret() {
  var props = PropertiesService.getScriptProperties();
  var actuel = props.getProperty(PROPRIETE_SECRET);
  if (!actuel) {
    actuel = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty(PROPRIETE_SECRET, actuel);
  }
  afficher('Secret de synchro (à coller dans Cloudflare, variable COACH_SYNC_SECRET) :\n\n' + actuel);
  return actuel;
}

/* ---------------------------------------------------------------- NETTOYAGE */

/** Recopie champ par champ en plafonnant chaque texte : le secret et tout
 *  champ inattendu restent dehors. */
function nettoyer(d) {
  var propre = {
    type: court(d.type),
    client: court(d.client) || 'Client sans prénom',
    date: court(d.date),
    creneau: court(d.creneau),
    lieu: court(d.lieu),
    heureReelle: court(d.heureReelle),
    retard: d.retard === true || d.retard === 'true' ? 'oui' : '',
    maintien: d.maintien === true || d.maintien === 'true',
    dureeMin: nombre(d.dureeMin),
    rpe: nombre(d.rpe),
    ecartMin: nombre(d.ecartMin),
    motif: court(d.motif),
    message: court(d.message),
    note: court(d.note),
    weekKey: court(d.weekKey),
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

function court(v) {
  if (v === undefined || v === null) return '';
  return String(v).slice(0, LONGUEUR_MAX_TEXTE);
}

function nombre(v) {
  if (v === undefined || v === null || v === '') return '';
  var n = Number(v);
  return isNaN(n) ? '' : n;
}

/** Renvoie [] quand ce n'est pas un tableau. */
function creneauxCourts(liste) {
  if (Object.prototype.toString.call(liste) !== '[object Array]') return [];
  return liste.slice(0, 20).map(function (m) {
    m = m || {};
    return { jour: court(m.jour), heure: court(m.heure), date: court(m.date), lieu: court(m.lieu) };
  });
}

/** Un texte qui commence par = + - @ serait lu comme une formule par le
 *  classeur : on le préfixe d'une apostrophe pour qu'il reste du texte. */
function sansFormule(v) {
  if (typeof v !== 'string') return v;
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

/* --------------------------------------------------------- FEUILLES & ÉCRITURE */

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

/** Lit la ligne 1 et renvoie { 'Nom de colonne': index0 } */
function indexEntetes(sh) {
  var derniere = Math.max(sh.getLastColumn(), 1);
  var row = sh.getRange(1, 1, 1, derniere).getValues()[0];
  var map = {};
  for (var i = 0; i < row.length; i++) {
    var k = String(row[i]).trim();
    if (k) map[k] = i;
  }
  return map;
}

/**
 * Écrit une ligne en se repérant sur les EN-TÊTES, jamais sur des positions.
 * Une colonne absente est créée à la fin de la feuille.
 */
function ecrireParEntetes(sh, valeurs) {
  var map = indexEntetes(sh);

  for (var nom in valeurs) {
    if (!(nom in map)) {
      var col = sh.getLastColumn() + 1;
      sh.getRange(1, col).setValue(nom).setFontWeight('bold');
      map[nom] = col - 1;
    }
  }

  var largeur = sh.getLastColumn();
  var ligne = new Array(largeur);
  for (var i = 0; i < largeur; i++) ligne[i] = '';
  for (var cle in valeurs) ligne[map[cle]] = sansFormule(valeurs[cle]);

  sh.appendRow(ligne);
  return sh.getLastRow();
}

/* ---------------------------------------------------------------- JOURNAL */

function journaliser(d) {
  var sh = feuille(F_JOURNAL, ENTETES_JOURNAL);
  var v = { 'Reçu le': new Date(), 'Brut': JSON.stringify(d).slice(0, 5000) };

  for (var champ in CHAMPS) {
    if (d[champ] !== undefined && d[champ] !== null && d[champ] !== '') {
      v[CHAMPS[champ]] = d[champ];
    }
  }
  // Un pointage est une séance tenue ; une séance maintien le dit.
  if (d.type === 'pointage') v['Statut'] = d.maintien ? 'tenu (maintien)' : 'tenu';
  // Colonne Détail lisible d'un coup d'œil.
  var detail = d.message || d.note || d.motif || (d.maintien ? 'séance maintien' : '');
  if (detail) v['Détail'] = detail;

  ecrireParEntetes(sh, v);
}

function journaliserErreur(message, donneesBrutes) {
  try {
    var sh = feuille(F_ERREURS, ENTETES_ERREURS);
    ecrireParEntetes(sh, {
      'Recu le': new Date(),
      'Erreur': String(message).slice(0, LONGUEUR_MAX_TEXTE),
      'Donnees brutes': donneesBrutes || ''
    });
  } catch (e) { /* dernier recours : on ne casse pas la réponse */ }
}

/* ---------------------------------------------------------------- ALERTES */

function doitAlerter(d) {
  var t = String(d.type || '');
  if (t === 'resume_hebdo') return d.pct !== '' && d.pct < SEUIL_RESPECT_MAIL_PCT;
  return t.indexOf('alerte') === 0 ||
         t === 'semaine_difficile' ||
         t === 'justification';
}

function consignerAlerte(d) {
  var sh = feuille(F_ALERTES, ENTETES_ALERTES);
  var ligne = ecrireParEntetes(sh, {
    'Reçu le': new Date(),
    'Client': d.client || '',
    'Type': d.type || '',
    'Détail': d.message || d.motif || '',
    'Traité': false
  });

  // Case à cocher, pour que tu puisses pointer ce que tu as traité.
  var map = indexEntetes(sh);
  if ('Traité' in map) {
    sh.getRange(ligne, map['Traité'] + 1)
      .insertCheckboxes()
      .setValue(false);
  }
}

/* ------------------------------------------------------------ ANTI-DOUBLON */

function cleDoublon(d) {
  return 'ALERTE::' + String(d.client || '?') + '::' + String(d.type || '?');
}

/**
 * Une alerte de créneaux manqués est un ÉTAT, pas un événement : tant que
 * la condition reste vraie, l'application peut la renvoyer.
 */
function doitEnvoyerMail(d) {
  if (!ANTI_DOUBLON_HEURES) return true;
  var props = PropertiesService.getScriptProperties();
  var dernier = props.getProperty(cleDoublon(d));
  if (!dernier) return true;
  var ecoule = (new Date().getTime() - Number(dernier)) / 3600000;
  return ecoule >= ANTI_DOUBLON_HEURES;
}

function marquerEnvoi(d) {
  PropertiesService.getScriptProperties()
    .setProperty(cleDoublon(d), String(new Date().getTime()));
}

/** À lancer si tu veux forcer le renvoi immédiat de toutes les alertes. */
function reinitialiserAntiDoublon() {
  var props = PropertiesService.getScriptProperties();
  var toutes = props.getProperties();
  var n = 0;
  for (var k in toutes) {
    if (k.indexOf('ALERTE::') === 0) { props.deleteProperty(k); n++; }
  }
  afficher(n + ' verrou(s) anti-doublon supprimé(s).');
}

/* ---------------------------------------------------------- PLAFOND D'E-MAILS */

/**
 * Compteur d'e-mails du jour, rangé dans les propriétés du script.
 * Renvoie false quand un plafond est atteint : l'alerte reste écrite dans
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

/* ------------------------------------------------------------------- MAILS */

function listeCreneaux(liste) {
  return (liste || []).map(function (m) {
    return '  - ' + m.jour + ' ' + m.heure + (m.date ? ' (' + m.date + ')' : '') + (m.lieu ? ' — ' + m.lieu : '');
  }).join('\n');
}

function composerMail(d) {
  var client = d.client || 'Un client';
  var detail = d.message || d.motif || '';
  var t = String(d.type || '');
  var sujet, corps;

  if (t === 'alerte_seances_manquees') {
    var n = d.nbManquees || (d.creneauxManques || []).length || 2;
    sujet = '[Coach] ' + client + ' : ' + n + ' créneaux manqués';
    corps = client + ' a manqué ' + n + ' créneaux sur les 14 derniers jours.\n\n' +
      (d.creneauxManques && d.creneauxManques.length ? listeCreneaux(d.creneauxManques) + '\n\n' : '') +
      'Reprends contact aujourd\'hui, pas la semaine prochaine. ' +
      'Le sujet à traiter est le créneau, pas le programme.';

  } else if (t === 'alerte_decalages') {
    var nd = d.nbDecalages || (d.creneauxDecales || []).length;
    sujet = '[Coach] ' + client + ' : ' + nd + ' créneaux décalés';
    corps = client + ' a décalé ou rattrapé ' + nd + ' créneaux sur les 4 dernières semaines.\n\n' +
      (d.creneauxDecales && d.creneauxDecales.length ? listeCreneaux(d.creneauxDecales) + '\n\n' : '') +
      'Les séances ont bien eu lieu : c\'est l\'horaire qui ne tient plus. ' +
      'Reprends la cartographie de sa semaine au lieu d\'ajuster le programme.';

  } else if (t === 'resume_hebdo') {
    sujet = '[Coach] ' + client + ' : taux de respect à ' + d.pct + ' %';
    corps = client + ' est à ' + d.pct + ' % de respect de ses créneaux sur 4 semaines (' +
      d.honored + ' tenus sur ' + d.resolved + ' tranchés, ' + d.missed + ' manqués, ' +
      d.shifted + ' décalés).\n\n' +
      'Sous ' + SEUIL_RESPECT_MAIL_PCT + ' %, le créneau lui-même est en cause plus souvent que la motivation.';

  } else if (t === 'alerte_semaines_difficiles') {
    sujet = '[Coach] ' + client + ' : 2 semaines maintien d\'affilée';
    corps = client + ' est passé en mode maintien deux semaines consécutives' +
      (d.motif ? ' (motif : ' + d.motif + ')' : '') + '.\n\n' +
      'Le créneau actuel ne tient plus. Propose-lui d\'en changer ' +
      'plutôt que de réduire encore le volume.';

  } else if (t === 'justification') {
    sujet = '[Coach] ' + client + ' : créneau manqué justifié';
    corps = client + ' a signalé lui-même un créneau manqué.\n\n' +
      (detail ? detail + '\n\n' : '') +
      'Il a fait la démarche : réponds vite et sans reproche. ' +
      'Un accusé de réception en deux lignes suffit à garder la chaîne.';

  } else if (t === 'semaine_difficile') {
    sujet = '[Coach] ' + client + ' : semaine basculée en maintien';
    corps = client + ' a basculé sa semaine en format maintien' +
      (d.motif ? ' (motif : ' + d.motif + ')' : '') + '.\n\n' +
      'Rien à corriger : c\'est le protocole qui fonctionne. ' +
      'Un message court pour le confirmer, et on remonte la semaine prochaine.';

  } else {
    sujet = '[Coach] ' + client + ' : ' + (t || 'événement');
    corps = 'Événement reçu depuis l\'application.\n\n' +
      'Client : ' + client + '\n' +
      'Type : ' + t + '\n\n' + detail;
  }

  corps += '\n\n—\nOnglet Alertes du classeur, colonne Traité : coche la ligne ' +
           'une fois que tu as écrit au client.';

  return { sujet: sujet, corps: corps };
}

/* --------------------------------------------------------------- ADHERENCE */

/**
 * Recalcule l'onglet Adherence à partir des résumés hebdomadaires du
 * Journal : une ligne par client et par semaine, le dernier résumé reçu
 * faisant foi. Les chiffres portent sur les 4 dernières semaines (c'est ce
 * que calcule l'application). Renvoie le nombre de lignes écrites.
 */
function majAdherence() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var j = ss.getSheetByName(F_JOURNAL);
  if (!j || j.getLastRow() < 2) return 0;

  var map = indexEntetes(j);
  var requis = ['Reçu le', 'Client', 'Type', 'Semaine', 'Tenus', 'Tranchés', 'Manqués', 'Décalés', '% respect (4 sem.)'];
  for (var q = 0; q < requis.length; q++) if (!(requis[q] in map)) return 0;

  var lignes = j.getRange(2, 1, j.getLastRow() - 1, j.getLastColumn()).getValues();
  var dernier = {}, ordre = [];
  for (var r = 0; r < lignes.length; r++) {
    var l = lignes[r];
    if (String(l[map['Type']]) !== 'resume_hebdo') continue;
    var client = String(l[map['Client']] == null ? '' : l[map['Client']]).trim();
    var sem = texteSemaine(l[map['Semaine']]);
    if (!client || !sem) continue;
    var cle = client + '|' + sem;
    if (!dernier[cle]) ordre.push(cle);
    dernier[cle] = l; // le plus récent l'emporte (le Journal est chronologique)
  }

  ordre.sort(function (a, b) {
    var sa = a.split('|')[1], sb = b.split('|')[1];
    if (sa !== sb) return sa < sb ? -1 : 1;
    return a < b ? -1 : (a > b ? 1 : 0);
  });

  var sortie = ordre.map(function (cle) {
    var l = dernier[cle];
    var pct = l[map['% respect (4 sem.)']];
    return [l[map['Reçu le']], l[map['Client']], l[map['Semaine']],
            l[map['Tenus']], l[map['Tranchés']], l[map['Manqués']], l[map['Décalés']],
            pct === '' ? '' : Number(pct) / 100];
  });

  var sh = feuille(F_ADHERENCE, ENTETES_ADHERENCE);
  // En-têtes remis à jour à chaque calcul (la v2 avait « Résolus »).
  sh.getRange(1, 1, 1, ENTETES_ADHERENCE.length).setValues([ENTETES_ADHERENCE]).setFontWeight('bold');
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, ENTETES_ADHERENCE.length).clearContent();
  }
  if (sortie.length) {
    sh.getRange(2, 1, sortie.length, ENTETES_ADHERENCE.length).setValues(sortie);
    sh.getRange(2, 8, sortie.length, 1).setNumberFormat('0%');
  }
  return sortie.length;
}

/** Le classeur transforme « 2026-09-07 » en date : on revient au texte
 *  ISO pour regrouper et trier les semaines correctement. */
function texteSemaine(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v == null ? '' : v).trim();
}

/** À lancer à la main depuis l'éditeur pour vérifier. */
function testerAdherence() {
  var n = majAdherence();
  afficher('Adherence : ' + n + ' ligne(s) recalculée(s)');
}

/* ------------------------------------------------------- OUTILS À LANCER À LA MAIN */

/**
 * À lancer UNE FOIS après installation.
 * Crée les onglets manquants, complète les en-têtes sans rien décaler,
 * et transforme la colonne Traité en cases à cocher.
 */
function migrer() {
  var rapport = [];

  var j = feuille(F_JOURNAL, ENTETES_JOURNAL);
  rapport.push('Journal : ' + completerEntetes(j, ENTETES_JOURNAL) + ' colonne(s) ajoutée(s)');

  var a = feuille(F_ALERTES, ENTETES_ALERTES);
  rapport.push('Alertes : ' + completerEntetes(a, ENTETES_ALERTES) + ' colonne(s) ajoutée(s)');

  var er = feuille(F_ERREURS, ENTETES_ERREURS);
  rapport.push('Erreurs : ' + completerEntetes(er, ENTETES_ERREURS) + ' colonne(s) ajoutée(s)');

  var ad = feuille(F_ADHERENCE, ENTETES_ADHERENCE);
  ad.getRange(1, 1, 1, ENTETES_ADHERENCE.length).setValues([ENTETES_ADHERENCE]);
  rapport.push('Adherence : en-têtes mis à jour');

  var map = indexEntetes(a);
  if ('Traité' in map && a.getLastRow() > 1) {
    var plage = a.getRange(2, map['Traité'] + 1, a.getLastRow() - 1, 1);
    plage.insertCheckboxes();
    var vals = plage.getValues();
    for (var i = 0; i < vals.length; i++) {
      if (vals[i][0] === '' || vals[i][0] === null) vals[i][0] = false;
    }
    plage.setValues(vals);
    rapport.push('Alertes : colonne Traité passée en cases à cocher');
  }

  [j, a, er, ad].forEach(function (sh) {
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold');
  });

  afficher('Migration terminée\n\n' + rapport.join('\n'));
}

function completerEntetes(sh, attendus) {
  var map = indexEntetes(sh);
  var ajoutes = 0;
  for (var i = 0; i < attendus.length; i++) {
    if (!(attendus[i] in map)) {
      var col = sh.getLastColumn() + 1;
      sh.getRange(1, col).setValue(attendus[i]).setFontWeight('bold');
      map[attendus[i]] = col - 1;
      ajoutes++;
    }
  }
  return ajoutes;
}

/** Envoie un mail de test et écrit une ligne d'essai dans les deux onglets. */
function testerMail() {
  var faux = nettoyer({
    client: 'TEST — ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss'),
    type: 'alerte_seances_manquees',
    nbManquees: 2,
    message: '2 créneaux manqués sur les 14 derniers jours.'
  });
  journaliser(faux);
  consignerAlerte(faux);
  var m = composerMail(faux);
  MailApp.sendEmail(EMAIL_COACH, m.sujet, m.corps);
  afficher('Mail de test envoyé à ' + EMAIL_COACH);
}

/** Affiche les en-têtes réellement présents, onglet par onglet. */
function verifier() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lignes = [];
  ss.getSheets().forEach(function (sh) {
    var n = sh.getLastColumn();
    var e = n ? sh.getRange(1, 1, 1, n).getValues()[0].join(' | ') : '(vide)';
    lignes.push(sh.getName() + '\n   ' + e);
  });
  lignes.push('Secret en place : ' + (secretAttendu() ? 'oui' : 'NON') +
              ' · exigé : ' + (EXIGER_SECRET ? 'oui' : 'non'));
  afficher(lignes.join('\n\n'));
}

/* ---------------------------------------------------------------- RÉPONSE */

/** { ok } est ce que lit le proxy : ok: false garde l'événement en file. */
function reponse(ok, erreur) {
  var corps = { ok: !!ok, statut: ok ? 'ok' : 'erreur' };
  if (erreur) corps.error = erreur;
  return ContentService
    .createTextOutput(JSON.stringify(corps))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Fenêtre dans le classeur si possible, sinon journal d'exécution. */
function afficher(message) {
  try { SpreadsheetApp.getUi().alert(message); }
  catch (err) { Logger.log(message); }
}
