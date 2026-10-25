/** @OnlyCurrentDoc */
/**
 * Coach Neiram — synchro et alertes du coaching en ligne
 * Version 2.5 (25 octobre 2026) — Smart Coach : gravité et statut des alertes.
 *
 * La v2.5 :
 *  - trois nouveaux types : « alerte_inactivite » (envoyée par le Worker
 *    lui-même, chaque matin : aucune saisie depuis 4 jours ou plus),
 *    « alerte_poids » (variation brutale ou stagnation en phase de perte,
 *    tendance seulement) et « alerte_nutrition » (5 jours hors cible sur 7) ;
 *  - chaque alerte porte un NIVEAU : info, attention ou critique. Celui
 *    envoyé par l'application fait foi ; sans lui (application encore en
 *    cache), la table niveauParDefaut ci-dessous le donne ;
 *  - onglet Alertes : deux colonnes AJOUTÉES À LA FIN, « Niveau » et
 *    « Statut » (liste : nouveau, vu, traité, ignoré ; « nouveau » à
 *    l'écriture). Rien n'est décalé : la colonne E « Traité » reste, et le
 *    Dashboard actuel continue de compter ;
 *  - mail SEULEMENT pour attention et critique, niveau dans l'objet
 *    (« [Coach] ⚠️ … », « [Coach] 🔴 … ») ; une alerte « info » s'écrit
 *    seulement dans l'onglet. Plafonds et anti-doublon inchangés ;
 *  - « @OnlyCurrentDoc » (première ligne) : le script ne demande plus
 *    l'accès à TOUS tes Google Sheets, seulement à ce classeur.
 * Mise en place (5 minutes) :
 *   1. Extensions > Apps Script : copier l'ancien Code.gs dans un nouveau
 *      fichier « sauvegarde-v2.4 », le COMMENTER EN ENTIER (sélectionner
 *      tout, Ctrl+/) : deux doPost actifs casseraient le script ;
 *   2. coller ce fichier dans Code.gs, ENREGISTRER. La propriété
 *      EMAIL_COACH (v2.4) est déjà en place : rien à ressaisir ;
 *   3. lancer migrer() : Google redemande une AUTORISATION (à cause de
 *      @OnlyCurrentDoc, la portée change : « ce classeur » au lieu de
 *      « tous tes classeurs »). Accepter ; migrer() ajoute « Niveau » et
 *      « Statut » à la fin de l'onglet Alertes, avec la liste déroulante ;
 *   4. Gérer les déploiements > crayon du déploiement ACTIF > Version :
 *      Nouvelle version > Déployer (même adresse /exec : rien à changer
 *      dans Cloudflare) ;
 *   5. lancer verifier() (en-têtes, adresse : propriété), puis testerMail()
 *      (objet « [Coach] ⚠️ … »).
 *   6. Dashboard : formules dans worker/README.md (« Smart Coach »).
 * Revenir en arrière : décommenter la sauvegarde, vider Code.gs, nouvelle
 * version du déploiement. Les colonnes ajoutées peuvent rester.
 *
 * Version 2.4 (24 octobre 2026) — adresse d'alerte dans les propriétés.
 *
 * La v2.4 lit l'adresse qui reçoit les alertes dans la propriété du script
 * EMAIL_COACH (Paramètres du projet > Propriétés du script). Remplacer
 * Code.gs ne la fait donc plus perdre. Sans cette propriété, l'adresse
 * écrite plus bas sert encore (repli). Le secret envoyé en clair est
 * refusé par défaut (coupé chez le coach le 24/10/2026, version 17).
 * Mise en place, une seule fois :
 *   1. Paramètres du projet > Propriétés du script > Ajouter :
 *      EMAIL_COACH = ton adresse ; enregistrer ;
 *   2. sauvegarder l'ancien Code.gs dans un fichier ENTIÈREMENT COMMENTÉ,
 *      coller ce fichier dans Code.gs, ENREGISTRER ;
 *   3. lancer verifier() : il doit afficher « Adresse d'alerte : propriété » ;
 *   4. Gérer les déploiements > crayon du déploiement ACTIF > Nouvelle
 *      version (même adresse /exec), puis testerMail().
 *
 * Version 2.3 (24 octobre 2026) — alerte sommeil et stress.
 *
 * La v2.3 ajoute deux types :
 *  - « alerte_sommeil_stress » (nuits difficiles ou stress très élevé
 *    pendant 2 semaines, détail dans « message ») : une ligne dans Alertes
 *    et un mail ;
 *  - « activite » (autre sport : course, vélo, foot…) : une ligne dans le
 *    Journal (date, durée, RPE, détail), sans mail. Mise en place : coller ce fichier,
 * ENREGISTRER, puis Gérer les déploiements > Modifier > Nouvelle version
 * (même adresse /exec). Rien d'autre ne change.
 *
 * Version 2.2 (17 octobre 2026) — événements signés par le proxy.
 *
 * La v2.2 (audit P0-4) : le proxy ne transmet plus le secret. Il signe
 * chaque événement (HMAC-SHA256 de l'horodatage, d'un nonce et du
 * contenu) ; ce script refuse une signature fausse, un événement modifié,
 * un horodatage de plus de 5 minutes et un nonce déjà vu (rejeu). Un
 * événement refusé n'écrit RIEN, nulle part (pas même dans Erreurs).
 * Le prénom du client est désormais fixé par le proxy d'après le jeton du
 * client, et non plus tapé par le client.
 *
 * Mise en place de la v2.2 (détail dans worker/SECURITE.md) :
 *   a. coller ce fichier, ENREGISTRER, puis Déployer > Nouveau déploiement
 *      (nouvelle adresse /exec : l'ancienne est publique dans l'historique
 *      du dépôt) ;
 *   b. mettre la nouvelle adresse dans Cloudflare (COACH_SYNC_URL), coller
 *      le nouveau Worker ;
 *   c. vérifier qu'un pointage arrive, puis ACCEPTER_SECRET_EN_CLAIR = false,
 *      enregistrer, Gérer les déploiements > Nouvelle version ;
 *   d. archiver l'ANCIEN déploiement (Gérer les déploiements > Archiver) :
 *      c'est ce qui révoque l'ancienne adresse.
 *
 * Historique : version 2.1 (4 octobre 2026) — la v2 installée chez le coach, durcie.
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

/** Adresse de REPLI pour les alertes. Depuis la v2.4, l'adresse se met
 *  dans la propriété du script EMAIL_COACH (voir adresseCoach) : ce fichier
 *  peut alors être remplacé sans rien perdre. Le dépôt garde un exemple. */
var EMAIL_COACH = 'ton.adresse@exemple.com';

/** Nom de la propriété du script qui contient l'adresse d'alerte. */
var PROPRIETE_EMAIL = 'EMAIL_COACH';

/** Adresse qui reçoit les alertes : la propriété du script, sinon le repli. */
function adresseCoach() {
  var p = PropertiesService.getScriptProperties().getProperty(PROPRIETE_EMAIL);
  p = p ? String(p).trim() : '';
  return p || EMAIL_COACH;
}

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

/** Secret précédent, accepté pendant une rotation (voir tournerSecret). */
var PROPRIETE_SECRET_PRECEDENT = 'SECRET_SYNC_PRECEDENT';

/** Transition v2.1 → v2.2 : l'ancien proxy envoyait le secret en clair.
 *  false en production depuis le 24 octobre 2026 (version 17, pointages
 *  signés vérifiés). Ne le remettre à true que pour revenir en arrière. */
var ACCEPTER_SECRET_EN_CLAIR = false;

/** Âge maximal d'un événement signé, et durée de mémoire des nonces. */
var FENETRE_SIGNATURE_MS = 5 * 60 * 1000;
var MEMOIRE_NONCE_S = 15 * 60;

/** Types d'événements réellement envoyés par l'application (même liste
 *  que l'application et le proxy ; un test vérifie qu'elles sont égales). */
var TYPES_AUTORISES = [
  'pointage',
  'justification',
  'semaine_difficile',
  'alerte_semaines_difficiles',
  'alerte_seances_manquees',
  'alerte_decalages',
  'resume_hebdo',
  'alerte_sommeil_stress',
  'activite',
  'alerte_inactivite',
  'alerte_poids',
  'alerte_nutrition'
];

/** Gravité des alertes (v2.5). Mail seulement pour attention et critique. */
var NIVEAUX = ['info', 'attention', 'critique'];
var NIVEAUX_AVEC_MAIL = ['attention', 'critique'];

/** Statuts proposés dans la colonne Statut de l'onglet Alertes. */
var STATUTS = ['nouveau', 'vu', 'traité', 'ignoré'];

/**
 * Niveau par défaut, quand l'événement n'en porte pas (application encore
 * en cache). COPIE de app/src/lib/gravite-alertes.js (TABLE_NIVEAUX) :
 * tests/gravite-alertes.test.mjs vérifie que les deux rendent la même chose.
 * Première règle qui correspond.
 */
var TABLE_NIVEAUX = [
  { type: 'alerte_inactivite', champ: 'nbJours', min: 7, niveau: 'critique' },
  { type: 'alerte_inactivite', niveau: 'attention' },
  { type: 'alerte_sommeil_stress', niveau: 'critique' },
  { type: 'alerte_seances_manquees', champ: 'nbManquees', min: 3, niveau: 'critique' },
  { type: 'alerte_seances_manquees', niveau: 'attention' },
  { type: 'alerte_poids', champ: 'sousType', egal: 'stagnation', niveau: 'info' },
  { type: 'alerte_poids', niveau: 'attention' },
  { type: 'alerte_nutrition', niveau: 'attention' },
  { type: 'alerte_decalages', niveau: 'attention' },
  { type: 'alerte_semaines_difficiles', niveau: 'attention' },
  { type: 'justification', niveau: 'attention' },
  { type: 'resume_hebdo', niveau: 'attention' },
  { type: 'semaine_difficile', niveau: 'info' }
];

function niveauParDefaut(d) {
  d = d || {};
  if (NIVEAUX.indexOf(d.niveau) !== -1) return d.niveau;
  for (var i = 0; i < TABLE_NIVEAUX.length; i++) {
    var r = TABLE_NIVEAUX[i];
    if (r.type !== d.type) continue;
    if (r.min !== undefined && !(Number(d[r.champ]) >= r.min)) continue;
    if (r.egal !== undefined && d[r.champ] !== r.egal) continue;
    return r.niveau;
  }
  return '';
}

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
var ENTETES_ALERTES = ['Reçu le', 'Client', 'Type', 'Détail', 'Traité', 'Niveau', 'Statut'];
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
    // Authentification AVANT toute écriture : un envoi refusé ne laisse
    // aucune trace dans le classeur (sinon n'importe qui pourrait remplir
    // l'onglet Erreurs avec l'ancienne adresse /exec).
    var auth = authentifier(lireCorps(e));
    if (!auth.ok) return reponse(false, auth.erreur);
    var recu = auth.recu;
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
        var adresse = adresseCoach();
        if (/@exemple\.com$/.test(adresse)) {
          journaliserErreur('EMAIL_COACH non renseigné : alerte non envoyée', JSON.stringify(data));
        } else if (mailSelonNiveau(data) && doitEnvoyerMail(data) && peutEnvoyerMail(data.client)) {
          var m = composerMail(data);
          MailApp.sendEmail(adresse, m.sujet, m.corps);
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
    'Synchro Coach Neiram active (v2.5). Utiliser POST.');
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
  return attendu !== '' && egaliteConstante(String(fourni || ''), attendu);
}

/** Comparaison en temps constant. */
function egaliteConstante(a, b) {
  var diff = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function hmacHex(secret, message) {
  var octets = Utilities.computeHmacSha256Signature(message, secret, Utilities.Charset.UTF_8);
  return octets.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

/**
 * Qui a envoyé cet événement ? Rend { ok: true, recu } ou { ok: false, erreur }.
 *
 * Format v2 (proxy v2.2) : { v: 2, ts, nonce, charge, sig } où
 * sig = HMAC-SHA256(secret, 'v2.' + ts + '.' + nonce + '.' + charge).
 * Contrôles, dans cet ordre : forme, signature (secret actuel ou
 * précédent), fraîcheur, nonce jamais vu. Le nonce n'est mémorisé
 * qu'après une signature valide : un inconnu ne peut pas remplir la mémoire.
 *
 * Limite connue : la mémoire des nonces (CacheService) peut être vidée
 * plus tôt par Google. La fenêtre de 5 minutes borne alors le rejeu.
 */
function authentifier(corps) {
  if (!corps) return { ok: false, erreur: 'json-invalide' };

  if (corps.v === 2) {
    if (typeof corps.ts !== 'number' || !/^[0-9a-f]{32}$/.test(String(corps.nonce)) ||
        typeof corps.charge !== 'string' || corps.charge.length > 20000 ||
        !/^[0-9a-f]{64}$/.test(String(corps.sig))) {
      return { ok: false, erreur: 'signature-invalide' };
    }
    var message = 'v2.' + corps.ts + '.' + corps.nonce + '.' + corps.charge;
    var props = PropertiesService.getScriptProperties();
    var secrets = [props.getProperty(PROPRIETE_SECRET), props.getProperty(PROPRIETE_SECRET_PRECEDENT)]
      .filter(function (s) { return s; });
    if (!secrets.length) return { ok: false, erreur: 'non-autorise' };
    var signe = secrets.some(function (s) { return egaliteConstante(hmacHex(s, message), corps.sig); });
    if (!signe) return { ok: false, erreur: 'signature-invalide' };
    if (Math.abs(Date.now() - corps.ts) > FENETRE_SIGNATURE_MS) return { ok: false, erreur: 'horodatage-expire' };
    var cache = CacheService.getScriptCache();
    if (cache.get('nonce:' + corps.nonce)) return { ok: false, erreur: 'rejeu' };
    cache.put('nonce:' + corps.nonce, '1', MEMOIRE_NONCE_S);
    var recu;
    try { recu = JSON.parse(corps.charge); } catch (err) { return { ok: false, erreur: 'json-invalide' }; }
    if (!recu || typeof recu !== 'object') return { ok: false, erreur: 'json-invalide' };
    return { ok: true, recu: recu };
  }

  // Ancien format (proxy v2.1) : secret en clair dans le corps.
  if (!EXIGER_SECRET) return { ok: true, recu: corps };
  if (ACCEPTER_SECRET_EN_CLAIR && secretValide(corps.secret)) return { ok: true, recu: corps };
  return { ok: false, erreur: 'non-autorise' };
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

/**
 * Rotation du secret, sans coupure :
 *   1. lancer tournerSecret() : un nouveau secret est créé et affiché,
 *      l'ancien reste accepté ;
 *   2. le coller dans Cloudflare (COACH_SYNC_SECRET) ;
 *   3. vérifier qu'un pointage arrive, puis lancer oublierAncienSecret().
 * À faire si le secret a pu être vu, et au moins une fois par an.
 */
function tournerSecret() {
  var props = PropertiesService.getScriptProperties();
  var actuel = props.getProperty(PROPRIETE_SECRET);
  if (actuel) props.setProperty(PROPRIETE_SECRET_PRECEDENT, actuel);
  var nouveau = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  props.setProperty(PROPRIETE_SECRET, nouveau);
  afficher('Nouveau secret (à coller dans Cloudflare, COACH_SYNC_SECRET). L\'ancien reste accepté jusqu\'à oublierAncienSecret() :\n\n' + nouveau);
  return nouveau;
}

function oublierAncienSecret() {
  PropertiesService.getScriptProperties().deleteProperty(PROPRIETE_SECRET_PRECEDENT);
  afficher('Ancien secret oublié : seul le secret actuel est accepté.');
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
    pct: nombre(d.pct),
    nbJours: nombre(d.nbJours)
  };
  propre.creneauxManques = creneauxCourts(d.creneauxManques);
  propre.creneauxDecales = creneauxCourts(d.creneauxDecales);
  // v2.5 : le niveau reçu s'il est valide, sinon celui de la table.
  propre.niveau = niveauParDefaut({ type: propre.type, niveau: court(d.niveau),
                                    nbJours: propre.nbJours, nbManquees: propre.nbManquees });
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
  // Par en-têtes : sur l'onglet du coach (5 colonnes), « Niveau » et
  // « Statut » se créent à la fin si migrer() n'a pas encore tourné.
  var ligne = ecrireParEntetes(sh, {
    'Reçu le': new Date(),
    'Client': d.client || '',
    'Type': d.type || '',
    'Détail': d.message || d.motif || '',
    'Traité': false,
    'Niveau': d.niveau || '',
    'Statut': 'nouveau'
  });

  // Case à cocher, pour que tu puisses pointer ce que tu as traité.
  var map = indexEntetes(sh);
  if ('Traité' in map) {
    sh.getRange(ligne, map['Traité'] + 1)
      .insertCheckboxes()
      .setValue(false);
  }
  if ('Statut' in map) {
    sh.getRange(ligne, map['Statut'] + 1).setDataValidation(regleStatut());
  }
}

/** Liste déroulante de la colonne Statut. */
function regleStatut() {
  return SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUTS, true)
    .setAllowInvalid(false)
    .build();
}

/** v2.5 : un mail seulement pour une alerte attention ou critique. */
function mailSelonNiveau(d) {
  return NIVEAUX_AVEC_MAIL.indexOf(String(d.niveau || '')) !== -1;
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

  } else if (t === 'alerte_sommeil_stress') {
    sujet = '[Coach] ' + client + ' : sommeil ou stress à surveiller';
    corps = client + ' : signal d\'alerte dans son suivi sommeil et stress.\n\n' +
      (detail ? detail + '\n\n' : '') +
      'L\'appli lui a conseillé d\'en parler à son médecin si ça continue. ' +
      'De ton côté : un message bienveillant, et une charge allégée cette semaine si besoin.';

  } else if (t === 'alerte_inactivite') {
    var nj = d.nbJours || '';
    sujet = '[Coach] ' + client + ' : aucune saisie depuis ' + nj + ' jours';
    corps = client + ' n\'a rien noté dans l\'appli (repas, séance, pesée, journal) ' +
      'et ne l\'a pas ouverte depuis ' + nj + ' jours.\n\n' +
      'Un message court et sans reproche aujourd\'hui : demande-lui comment se passe sa semaine, ' +
      'pas pourquoi il ne note plus.';

  } else if (t === 'alerte_poids') {
    sujet = '[Coach] ' + client + ' : tendance du poids';
    corps = client + ' : ' + (detail || 'tendance du poids à regarder') + '.\n\n' +
      'Regarde la courbe dans son prochain bilan avant de toucher aux calories : ' +
      'eau, sel, cycle et sommeil font bouger la balance d\'une semaine à l\'autre.';

  } else if (t === 'alerte_nutrition') {
    sujet = '[Coach] ' + client + ' : nutrition hors cible';
    corps = client + ' : ' + (detail || 'nutrition hors cible plusieurs jours') + '.\n\n' +
      'Une question simple d\'abord : la cible lui paraît-elle tenable ? ' +
      'Ajuster un repas type vaut mieux qu\'un sermon.';

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

  corps += '\n\n—\nOnglet Alertes du classeur, colonne Statut : passe la ligne à ' +
           '« vu », puis « traité » une fois que tu as écrit au client (ou coche Traité).';

  // v2.5 : le niveau dans l'objet, juste après « [Coach] ».
  var marque = d.niveau === 'critique' ? '🔴 ' : (d.niveau === 'attention' ? '⚠️ ' : '');
  if (marque && sujet.indexOf('[Coach] ') === 0) sujet = '[Coach] ' + marque + sujet.slice(8);

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
  // v2.5 : liste déroulante sur toute la colonne Statut. Les anciennes
  // lignes restent SANS statut : le Dashboard se rabat sur « Traité ».
  if ('Statut' in map && a.getMaxRows() > 1) {
    a.getRange(2, map['Statut'] + 1, a.getMaxRows() - 1, 1).setDataValidation(regleStatut());
    rapport.push('Alertes : liste déroulante posée sur la colonne Statut');
  }
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
  var adresse = adresseCoach();
  MailApp.sendEmail(adresse, m.sujet, m.corps);
  afficher('Mail de test envoyé à ' + adresse);
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
  var propriete = PropertiesService.getScriptProperties().getProperty(PROPRIETE_EMAIL);
  lignes.push('Adresse d\'alerte : ' + (propriete && String(propriete).trim() ? 'propriété' :
              (/@exemple\.com$/.test(EMAIL_COACH) ? 'NON RENSEIGNÉE' : 'repli dans le code')));
  lignes.push('Secret en place : ' + (secretAttendu() ? 'oui' : 'NON') +
              ' · exigé : ' + (EXIGER_SECRET ? 'oui' : 'non') +
              ' · ancien format (secret en clair) accepté : ' + (ACCEPTER_SECRET_EN_CLAIR ? 'OUI, à couper' : 'non') +
              ' · ancien secret encore accepté : ' +
              (PropertiesService.getScriptProperties().getProperty(PROPRIETE_SECRET_PRECEDENT) ? 'oui' : 'non'));
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
