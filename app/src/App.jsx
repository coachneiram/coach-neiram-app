/**
 * Application Coach Neiram.
 *
 * C'est ici que les ecrans migres rencontrent les vraies donnees du
 * client. Tout le reste ne servait a rien tant que ce branchement
 * n'existait pas.
 *
 * Point capital : cette application lit le MEME stockage que la version
 * actuelle, avec les memes cles. Un client qui bascule retrouve ses
 * donnees telles quelles, et peut revenir en arriere sans rien perdre.
 * C'est ce qui rend la bascule reversible, et c'est verifie par
 * tests/stockage-compat.test.mjs.
 */

import { Tutos } from "./ui/Tutos.jsx";
import { EcranConsentementIa } from "./ui/EcranConsentementIa.jsx";
import { DELAI_TUTO_MS, initialiserTutos, marquerTutoVu, tutoAProposer, tutoPrincipal } from "./lib/tutos.js";
import { EVENEMENT_TUTO } from "./ui/ouvrir-tuto.js";
import { reparerCollection } from "./lib/reparer-donnees.js";
import { FiletEcran } from "./ui/FiletErreur.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { COLORS } from "./tokens.js";
import { todayISO } from "./lib/dates.js";
import { cleMoisPrecedent, dayIdOf, getMonthKey, getWeekKey, uid } from "./lib/semaine.js";
import { addDays } from "./lib/dates.js";
import { CLES_ANNEXES, STORAGE_KEYS, charger, enregistrer, surEchecEcriture } from "./lib/stockage.js";
import { collectionApi, journalDuJourApi } from "./lib/collections.js";
import { computeTargets } from "./lib/nutrition.js";
import { bilanHebdomadaire } from "./lib/bilan.js";
import { bilanMensuel } from "./lib/bilan-mensuel.js";
import { partagerBilan } from "./lib/bilan-html.js";
import { actionsPrecedentes, genererBilanHebdo, genererBilanMensuel } from "./lib/bilan-ia.js";
import { lireBilan } from "./lib/rapport.js";
import { messageErreur } from "./lib/ia.js";
import { redimensionnerPhoto } from "./lib/images.js";
import {
  PERIODE_VERIFICATION_MS,
  CLE_BILAN_ENVOYE,
  marquerBilanEnvoye,
  verifierRappelDimanche
} from "./lib/rappel-dimanche.js";
import {
  verifierRappelCreneau,
  totauxPourRappel,
  verifierRappelHydratation,
  verifierRappelNutrition
} from "./lib/moteur-rappels.js";
import { verifierAlerteNutrition, verifierAlertesCoach, verifierAlertesPoids } from "./lib/moteur-alertes.js";
import { derniereSaisie, envoyerPresence } from "./lib/presence.js";
import { TEXTES_PHOTOS_MOIS, etatPhotosMois, semainesPhotographiees } from "./lib/photos-mensuelles.js";
import { lignesPerformancesBilan } from "./lib/performances-bilan.js";
import { lirePerformances } from "./lib/performances.js";
import { lignesHabitudesBilan } from "./lib/habitudes-bilan.js";
import { CLE_HABITUDES } from "./lib/habitudes.js";
import { viderFile } from "./lib/synchro-coach.js";
import { totauxDuJour } from "./lib/score-jour.js";
import { Coque } from "./ui/Coque.jsx";
import { ChoixPhoto } from "./ui/ChoixPhoto.jsx";
import { Modal } from "./ui/primitives.jsx";
import { Droplet, Loader2 } from "./ui/icones.jsx";
import { Journal } from "./ecrans/Journal.jsx";
import { Repas } from "./ecrans/Repas.jsx";
import { Nutrition } from "./ecrans/Nutrition.jsx";
import { Sommeil } from "./ecrans/Sommeil.jsx";
import { Mensurations } from "./ecrans/Mensurations.jsx";
import { Entrainements } from "./ecrans/Entrainements.jsx";
import { Tendances } from "./ecrans/Tendances.jsx";
import { Reglages } from "./ecrans/Reglages.jsx";
import { Bienvenue } from "./ecrans/Bienvenue.jsx";
import { Aide, BandeauInstallation, QuoiDeNeuf } from "./ui/Annonces.jsx";
import { synchroniserPush } from "./lib/push.js";
import { CLE_INSTALLATION, bandeauInstallationVisible, estInstallee, finMasquage, plateformeInstallation } from "./lib/installation.js";
import { NOUVEAUTES_MAX, annoncesAutorisees, lireVues, marquerToutVu, nouveautesAMontrer, nouveautesPour } from "./lib/nouveautes.js";
import { CLE_SPORTS_PERSO, definirSportsPerso } from "./lib/activites.js";
import { messageEau } from "./lib/raccourcis.js";
import { brancherRaccourcis, ecouterRaccourcis, poserIntention } from "./lib/reception-raccourcis.js";
import { brancherInvitationDefi } from "./lib/defis-amis.js";
import { publierSiBesoin, statsCommunaute } from "./lib/communaute.js";

/** Duree d'affichage d'une notification passagere, en millisecondes. */
const DUREE_TOAST = 8000;

/** Attente apres la derniere frappe dans le champ Poids avant l'alerte poids. */
const DELAI_ALERTE_PESEE_MS = 3000;

/**
 * Charge une liste depuis le stockage.
 *
 * Une valeur corrompue renvoie une liste vide plutot que de faire tomber
 * l'application au demarrage : mieux vaut un ecran vide qu'un ecran noir,
 * et les autres donnees restent accessibles.
 */
function listeStockee(cle) {
  // Remise en forme des elements abimes (lib/reparer-donnees.js, repris de
  // l'app Neiram le 24 octobre 2026) : rien d'utilisable n'est jete.
  const nom = Object.keys(STORAGE_KEYS).find((k) => STORAGE_KEYS[k] === cle);
  return reparerCollection(nom, charger(cle, []));
}

export default function App() {
  const [pret, setPret] = useState(false);
  const [profile, setProfile] = useState(null);
  const [ongletActif, setOngletActif] = useState("journal");
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const [toast, setToast] = useState(null);
  // « Quoi de neuf » (7 octobre 2026) : annonces non vues, montrees a l'ouverture.
  const [nouveautes, setNouveautes] = useState([]);
  const [aideOuverte, setAideOuverte] = useState(false);
  // Bandeau d'installation (7 octobre 2026) : invitation d'Android a
  // installer, gardee pour le bouton « Installer ».
  const [invitationInstall, setInvitationInstall] = useState(null);
  const [plateforme, setPlateforme] = useState("autre");
  const [installMasqueeJusqua, setInstallMasqueeJusqua] = useState(() => {
    try {
      return localStorage.getItem(CLE_INSTALLATION);
    } catch (e) {
      return null;
    }
  });

  /**
   * Panne d'ecriture du stockage.
   *
   * Elle ne s'efface pas toute seule, contrairement a une notification
   * passagere : tant qu'elle dure, RIEN n'est enregistre. Le client doit la
   * voir a chaque ecran, jusqu'a ce qu'il ait fait de la place.
   */
  const [pannePersistance, setPannePersistance] = useState(null);

  useEffect(() => surEchecEcriture((info) => setPannePersistance(info)), []);

  const [dishes, setDishes] = useState([]);
  const [logEntries, setLogEntries] = useState([]);
  const [bodyLogs, setBodyLogs] = useState([]);
  const [dailyForm, setDailyForm] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [routines, setRoutines] = useState([]);

  /**
   * Justifications de creneaux manques, indexees par « creneau|date ».
   * Elles vivent hors du prefixe coach_, comme dans l'application actuelle.
   */
  const [raisonsCreneaux, setRaisonsCreneaux] = useState({});

  /** Semaines basculees en format maintien, indexees par lundi. */
  const [semainesDifficiles, setSemainesDifficiles] = useState({});

  /** Seance type assignee a chaque jour de la semaine. */
  const [planSemaine, setPlanSemaine] = useState({});

  /** Maxis de reference en force athletique, par mouvement. */
  const [maxisForce, setMaxisForce] = useState({});

  useEffect(() => {
    setProfile(charger(STORAGE_KEYS.profile, null));
    setDishes(listeStockee(STORAGE_KEYS.dishes));
    setLogEntries(listeStockee(STORAGE_KEYS.logEntries));
    setBodyLogs(listeStockee(STORAGE_KEYS.bodyLogs));
    setDailyForm(listeStockee(STORAGE_KEYS.dailyForm));
    setSessions(listeStockee(STORAGE_KEYS.sessions));
    setMeasurements(listeStockee(STORAGE_KEYS.measurements));
    setRoutines(listeStockee(STORAGE_KEYS.routines));
    setRaisonsCreneaux(charger(CLES_ANNEXES.raisonsCreneaux, {}) || {});
    setSemainesDifficiles(charger(CLES_ANNEXES.semainesDifficiles, {}) || {});
    setPlanSemaine(charger(CLES_ANNEXES.planSemaine, {}) || {});
    setMaxisForce(charger(CLES_ANNEXES.maxisForce, {}) || {});
    // Sports crees par le client (autres sports, 24/10/2026).
    definirSportsPerso(charger(CLE_SPORTS_PERSO, []));
    setPret(true);
  }, []);

  // Une seconde notification annule le minuteur de la premiere : sans
  // cela, elle se refermait des que la premiere arrivait a echeance.
  const minuteurToast = useRef(null);
  const afficherToast = (message) => {
    setToast(message);
    window.clearTimeout(minuteurToast.current);
    minuteurToast.current = window.setTimeout(() => setToast(null), DUREE_TOAST);
  };

  /**
   * Photos de progression de la semaine en cours.
   *
   * Elles vivent sous « coach_photos_<semaine> », une cle par semaine :
   * c'est ce que fait l'application d'origine, et c'est aussi ce qui
   * permet de les purger semaine par semaine quand le stockage sature.
   */
  const cleSemaineCourante = getWeekKey(todayISO());
  const clePhotos = "coach_photos_" + cleSemaineCourante;
  const [photos, setPhotos] = useState(() => charger(clePhotos, {}) || {});

  /**
   * Choix d'une photo.
   *
   * L'application d'origine gardait un <input type=file> cache par pose.
   * Ici l'ecran ne connait que la pose et remonte l'intention ; l'input
   * est cree a la volee. Meme resultat pour le client, un champ de moins
   * a maintenir dans l'ecran.
   */
  /**
   * Pose dont on attend une photo.
   *
   * L'application d'origine ouvrait directement le selecteur de fichiers.
   * Sur Android, ce selecteur seul n'expose pas toujours l'appareil photo
   * — des clientes ne pouvaient photographier que depuis leur photothèque.
   * Le choix de la source passe donc par une petite fenetre.
   */
  const [poseAPhotographier, setPoseAPhotographier] = useState(null);

  const traiterPhoto = (pose, fichier) => {
    if (!fichier) return;
    redimensionnerPhoto(fichier, 500, 0.72)
      .then((dataUrl) => {
        const suivant = { ...photos, [pose]: dataUrl };
        setPhotos(suivant);
        if (!enregistrer(clePhotos, suivant)) {
          afficherToast("Stockage plein : la photo n'a pas pu être enregistrée.");
        }
      })
      .catch((e) => {
        afficherToast(
          e && e.message === "image-format"
            ? "Photo illisible dans ce format (souvent les HEIC d'iPhone ouvertes sur ordinateur). Essaie une photo JPEG/PNG."
            : "Photo illisible, réessaie avec une autre."
        );
      });
  };

  /**
   * Envoi du bilan au coach.
   *
   * « Bilan envoye » n'est note que si le partage a abouti : un partage
   * annule doit laisser le rappel du dimanche revenir.
   */
  const envoyerBilan = async () => {
    if (!profile || !weekStats) return;
    const resultat = await partagerBilan({
      profile,
      weekStats,
      report: bilanCourant,
      photos,
      targets,
      // Performances, niveau et transformation (24 octobre 2026).
      performances: lignesPerformancesBilan({
        performances: lirePerformances(),
        maxisForce,
        seances: sessions,
        profil: profile,
        poidsKg: poidsCourant,
        bodyLogs,
        date: todayISO()
      }),
      // Habitudes et déclics (24 octobre 2026).
      habitudes: lignesHabitudesBilan({
        habitudes: charger(CLE_HABITUDES, null),
        journal: dailyForm,
        seances: sessions,
        date: todayISO()
      })
    });
    if (resultat === "shared" || resultat === "downloaded") {
      marquerBilanEnvoye(weekStats.weekKey);
      synchroniserPush({ profil: profile, seances: sessions, bilanEnvoye: weekStats.weekKey });
    }
    if (resultat === "downloaded") {
      afficherToast("Rapport téléchargé — envoie le fichier à ton coach (WhatsApp, mail...).");
    }
  };

  /**
   * Bilans rediges par l'IA, hebdomadaires et mensuels.
   *
   * REGRESSION DE LA BASCULE : la generation n'avait jamais ete portee, et
   * l'affichage non plus. Les deux boutons « Bilan IA » et « Generer le
   * bilan mensuel » etaient donc inertes — le client appuyait, rien ne se
   * passait, sans le moindre message.
   */
  const [reports, setReports] = useState(() => listeStockee(STORAGE_KEYS.reports));
  const [monthlyReports, setMonthlyReports] = useState(() => listeStockee(STORAGE_KEYS.monthlyReports));
  const [enGeneration, setEnGeneration] = useState(false);
  const [enGenerationMensuelle, setEnGenerationMensuelle] = useState(false);
  const [erreurGeneration, setErreurGeneration] = useState(null);
  const [erreurGenerationMensuelle, setErreurGenerationMensuelle] = useState(null);

  const cleMoisCourant = getMonthKey(todayISO());
  const bilanCourant = reports.find((r) => r.weekKey === cleSemaineCourante) || null;
  const bilanMensuelCourant = monthlyReports.find((r) => r.monthKey === cleMoisCourant) || null;

  const genererBilan = async () => {
    if (!weekStats || !profile || enGeneration) return;
    setEnGeneration(true);
    setErreurGeneration(null);
    try {
      // La semaine precedente sert de point de comparaison : sans elle, la
      // section EVOLUTION du bilan n'a rien a comparer et le modele invente.
      const cleSemainePrecedente = addDays(cleSemaineCourante, -7);
      const texte = await genererBilanHebdo({
        weekStats,
        lastWeekStats: bilanHebdomadaire(cleSemainePrecedente, donneesCompletes, profile, targets),
        profile,
        lastActionsText: actionsPrecedentes(reports.find((r) => r.weekKey === cleSemainePrecedente)),
        thisPhotos: photos,
        lastPhotos: charger("coach_photos_" + cleSemainePrecedente, null)
      });
      const suivant = [
        {
          id: uid(),
          weekKey: cleSemaineCourante,
          start: weekStats.start,
          end: weekStats.end,
          stats: weekStats,
          sections: lireBilan(texte),
          generatedAt: new Date().toISOString()
        },
        ...reports.filter((r) => r.weekKey !== cleSemaineCourante)
      ];
      setReports(suivant);
      if (!enregistrer(STORAGE_KEYS.reports, suivant)) {
        setErreurGeneration("Bilan généré mais non enregistré : la mémoire de l'application est pleine.");
      }
    } catch (e) {
      setErreurGeneration(
        messageErreur(e, "Le bilan IA n'a pas pu être généré. Vérifie ta connexion, puis réessaie.")
      );
    } finally {
      setEnGeneration(false);
    }
  };

  const genererBilanDuMois = async () => {
    if (!monthStats || !profile || enGenerationMensuelle) return;
    // Photos du mois obligatoires (26 octobre 2026), sauf exception de santé.
    if (etatPhotosMois({ cleMois: monthStats.monthKey, profil: profile, semaines: semainesPhotographiees() }).bloque) {
      setErreurGenerationMensuelle(TEXTES_PHOTOS_MOIS.bloque);
      return;
    }
    setEnGenerationMensuelle(true);
    setErreurGenerationMensuelle(null);
    try {
      const clePrecedente = cleMoisPrecedent(cleMoisCourant);
      const texte = await genererBilanMensuel({
        monthStats,
        prevMonthStats: bilanMensuel(clePrecedente, donneesCompletes, profile, targets),
        profile,
        lastActionsText: actionsPrecedentes(monthlyReports.find((r) => r.monthKey === clePrecedente))
      });
      const suivant = [
        {
          id: uid(),
          monthKey: cleMoisCourant,
          stats: monthStats,
          sections: lireBilan(texte),
          generatedAt: new Date().toISOString()
        },
        ...monthlyReports.filter((r) => r.monthKey !== cleMoisCourant)
      ];
      setMonthlyReports(suivant);
      if (!enregistrer(STORAGE_KEYS.monthlyReports, suivant)) {
        setErreurGenerationMensuelle(
          "Bilan généré mais non enregistré : la mémoire de l'application est pleine."
        );
      }
    } catch (e) {
      setErreurGenerationMensuelle(
        messageErreur(e, "Le bilan mensuel n'a pas pu être généré. Vérifie ta connexion, puis réessaie.")
      );
    } finally {
      setEnGenerationMensuelle(false);
    }
  };

  const dishesApi = collectionApi(STORAGE_KEYS.dishes, dishes, setDishes);
  const logEntriesApi = collectionApi(STORAGE_KEYS.logEntries, logEntries, setLogEntries);
  const sessionsApi = collectionApi(STORAGE_KEYS.sessions, sessions, setSessions);
  const measurementsApi = collectionApi(STORAGE_KEYS.measurements, measurements, setMeasurements);
  const routinesApi = collectionApi(STORAGE_KEYS.routines, routines, setRoutines);
  const bodyApi = journalDuJourApi(STORAGE_KEYS.bodyLogs, bodyLogs, setBodyLogs);
  const formApi = journalDuJourApi(STORAGE_KEYS.dailyForm, dailyForm, setDailyForm);

  // Raccourcis (appui long sur l'icone, adresse ?raccourci=...) : voir
  // lib/raccourcis.js. Le traitement lit toujours l'etat le plus recent.
  const gererRaccourci = useRef(null);
  gererRaccourci.current = async (action) => {
    setReglagesOuverts(false);
    if (action.id === "eau") {
      const date = todayISO();
      const avant = Number((formApi.getForDate(date) || {}).waterMl) || 0;
      await formApi.upsert(date, { waterMl: avant + action.ml });
      setOngletActif("journal");
      afficherToast(messageEau(action.ml, avant + action.ml));
      return;
    }
    if (action.id === "seance" || action.id === "repas") poserIntention(action.id);
    setOngletActif(action.onglet);
  };
  useEffect(() => {
    brancherRaccourcis();
    // Lien d'invitation a un defi entre amis (?defi=CODE) : code retenu
    // pour la carte du Journal, adresse nettoyee.
    brancherInvitationDefi();
  }, []);
  useEffect(() => {
    if (!pret || !profile) return undefined;
    return ecouterRaccourcis((a) => gererRaccourci.current(a));
  }, [pret, Boolean(profile)]);
  // Communaute Team Neiram (lib/communaute.js) : avec un profil seulement,
  // les chiffres permis par les accords partent au plus toutes les 30 min.
  useEffect(() => {
    if (!pret || !profile) return undefined;
    const minuteur = setTimeout(() => {
      publierSiBesoin({
        stats: statsCommunaute({ date: todayISO(), seances: sessions, repas: logEntries, journal: dailyForm, corps: bodyLogs, profil: profile, maxis: maxisForce })
      });
    }, 3000);
    return () => clearTimeout(minuteur);
  }, [pret, profile, sessions, logEntries, dailyForm, bodyLogs, maxisForce]);

  /**
   * Poids courant : la derniere pesee, a defaut le poids de depart du
   * profil. Sans repli, les objectifs disparaitraient tant que le client
   * ne s'est pas pese une premiere fois.
   */
  const poidsCourant = useMemo(() => {
    const pesees = bodyLogs
      .filter((b) => b.weightKg != null)
      .sort((a, b) => a.date.localeCompare(b.date));
    return pesees.length ? pesees[pesees.length - 1].weightKg : profile?.startWeightKg || null;
  }, [bodyLogs, profile]);

  const targets = useMemo(
    () => (profile ? computeTargets(profile, poidsCourant) : null),
    [profile, poidsCourant]
  );

  const donneesCompletes = { sessions, dailyForm, bodyLogs, logEntries, measurements, weekPlan: planSemaine, routines, hardWeeks: semainesDifficiles };

  /**
   * Le rappel du dimanche.
   *
   * Une verification au montage puis une par minute, comme dans
   * l'application d'origine : le client peut ouvrir l'app a 9 h 58 un
   * dimanche, il faut que le rappel parte a 10 h sans qu'il ait a la
   * relancer. La decision elle-meme est dans lib/rappel-dimanche.js,
   * pour etre testable sans navigateur.
   */
  useEffect(() => {
    if (!pret || !profile) return;
    let arrete = false;
    const verifier = () => {
      if (arrete) return;
      verifierRappelDimanche({ profile, afficherToast });
      verifierRappelHydratation({
        profile,
        journalDuJour: dailyForm.find((f) => f.date === todayISO()),
        afficherToast
      });
      verifierRappelNutrition({
        profile,
        targets,
        totaux: totauxPourRappel(totauxDuJour(logEntries.filter((e) => e.date === todayISO()))),
        afficherToast
      });
      verifierRappelCreneau({ profile, seances: sessions, afficherToast });
    };
    verifier();
    const minuteur = window.setInterval(verifier, PERIODE_VERIFICATION_MS);
    return () => {
      arrete = true;
      window.clearInterval(minuteur);
    };
  }, [pret, profile, targets, dailyForm, logEntries, sessions]);

  /**
   * Les alertes envoyees au coach.
   *
   * Elles ne tournent pas sur minuteur : un changement de seances suffit
   * a les reevaluer. Les envoyer en boucle chaque minute reviendrait a
   * relire la meme situation sans rien de neuf.
   */
  useEffect(() => {
    if (!pret || !profile) return;
    let arrete = false;
    verifierAlertesCoach({
      profile,
      seances: sessions,
      justifications: raisonsCreneaux,
      journal: dailyForm,
      afficherToast: (m) => {
        if (!arrete) afficherToast(m);
      }
    });
    return () => {
      arrete = true;
    };
  }, [pret, profile, sessions, raisonsCreneaux, dailyForm]);

  /**
   * Smart Coach (25 octobre 2026), coaching en ligne seulement ; les
   * decisions sont dans lib/presence.js et lib/alertes-smart.js.
   *
   * 1. Presence : a l'ouverture, une fois par jour, puis quand la date de
   *    la derniere saisie change, cette date part au Worker (alerte
   *    d'inactivite, cote serveur).
   * 2. Nutrition : a l'ouverture, au plus un controle par jour.
   */
  const dateDerniereSaisie = useMemo(
    () => derniereSaisie({ repas: logEntries, seances: sessions, pesees: bodyLogs, journal: dailyForm, aujourdhui: todayISO() }),
    [logEntries, sessions, bodyLogs, dailyForm]
  );
  useEffect(() => {
    if (!pret || !profile) return;
    envoyerPresence({
      profil: profile,
      donnees: { repas: logEntries, seances: sessions, pesees: bodyLogs, journal: dailyForm },
      aujourdhui: todayISO()
    });
    // Relance quand la date de la derniere saisie change (au plus une ou
    // deux fois par jour) : la saisie du jour arrive le jour meme.
  }, [pret, profile, dateDerniereSaisie]);

  useEffect(() => {
    if (!pret || !profile || !targets) return;
    verifierAlerteNutrition({ profile, repas: logEntries, cibles: targets });
  }, [pret, profile, targets]);

  /**
   * 3. Poids : a l'enregistrement d'une pesee. Le champ « Poids » enregistre
   *    a chaque frappe (« 7 », « 78 », « 78,4 ») : on attend que la saisie
   *    soit posee avant d'evaluer, sinon « 7 kg » passerait pour une
   *    variation brutale. Les pesees deja la a l'ouverture ne declenchent
   *    rien.
   */
  const signaturePesees = useMemo(
    () =>
      bodyLogs
        .filter((b) => b && Number(b.weightKg) > 0)
        .map((b) => b.date + ":" + b.weightKg)
        .sort()
        .join("|"),
    [bodyLogs]
  );
  const peseesVues = useRef(null);
  useEffect(() => {
    if (!pret || !profile) return undefined;
    if (peseesVues.current === null) {
      peseesVues.current = signaturePesees;
      return undefined;
    }
    if (peseesVues.current === signaturePesees) return undefined;
    const minuteur = setTimeout(() => {
      peseesVues.current = signaturePesees;
      verifierAlertesPoids({ profile, pesees: bodyLogs });
    }, DELAI_ALERTE_PESEE_MS);
    return () => clearTimeout(minuteur);
  }, [pret, profile, signaturePesees]);

  /**
   * Les envois restes en file (hors ligne, proxy ou script indisponible)
   * repartent a l'ouverture et des que le telephone retrouve le reseau,
   * sans attendre le prochain pointage.
   */
  useEffect(() => {
    if (!pret || !profile) return;
    const relancer = () => {
      viderFile(profile);
    };
    relancer();
    window.addEventListener("online", relancer);
    return () => window.removeEventListener("online", relancer);
  }, [pret, profile]);


  useEffect(() => {
    if (!pret || !annoncesAutorisees()) return;
    const vues = lireVues();
    if (!profile) {
      // Nouvelle installation : tout lui est neuf, rien a annoncer.
      if (vues === null) marquerToutVu();
      return;
    }
    const aMontrer = nouveautesAMontrer({ vues, profil: profile });
    if (aMontrer.length) setNouveautes((deja) => (deja.length ? deja : aMontrer));
  }, [pret, profile]);

  useEffect(() => {
    if (!annoncesAutorisees()) return;
    const calculer = () =>
      setPlateforme(plateformeInstallation({ userAgent: navigator.userAgent, installee: estInstallee() }));
    calculer();
    const surInvitation = (e) => {
      e.preventDefault();
      setInvitationInstall(e);
    };
    const surInstallee = () => {
      setInvitationInstall(null);
      setPlateforme("installee");
    };
    window.addEventListener("beforeinstallprompt", surInvitation);
    window.addEventListener("appinstalled", surInstallee);
    return () => {
      window.removeEventListener("beforeinstallprompt", surInvitation);
      window.removeEventListener("appinstalled", surInstallee);
    };
  }, []);

  const masquerInstallation = () => {
    const fin = finMasquage(todayISO());
    setInstallMasqueeJusqua(fin);
    try {
      localStorage.setItem(CLE_INSTALLATION, fin);
    } catch (e) {
      // Stockage refuse : le bandeau reviendra, sans gravite.
    }
  };

  const installer = async () => {
    if (!invitationInstall) return;
    invitationInstall.prompt();
    try {
      const choix = await invitationInstall.userChoice;
      if (choix && choix.outcome === "accepted") setPlateforme("installee");
    } catch (e) {
      // Fenetre fermee : le bandeau reste.
    }
    setInvitationInstall(null);
  };

  const fermerNouveautes = () => {
    marquerToutVu();
    setNouveautes([]);
  };
  // Tutos (lib/tutos.js, repris de l'app Neiram le 24 octobre 2026) : celui
  // de l'onglet s'ouvre a sa premiere visite, une fois, quand aucune autre
  // fenetre n'est ouverte. Le bouton « ? » le rouvre a tout moment.
  const [vueTutos, setVueTutos] = useState(null);
  // Bouton « ? » d'une carte (ui/ouvrir-tuto.js) : ouvre le tuto de la fonction.
  useEffect(() => {
    const surTuto = (e) => e.detail && setVueTutos({ tuto: e.detail });
    window.addEventListener(EVENEMENT_TUTO, surTuto);
    return () => window.removeEventListener(EVENEMENT_TUTO, surTuto);
  }, []);
  const dejaInstalle = useRef(null);
  useEffect(() => {
    if (!pret || dejaInstalle.current !== null) return;
    dejaInstalle.current = !!profile;
    initialiserTutos(localStorage, { dejaInstalle: !!profile });
  }, [pret, profile]);
  const autreFenetre =
    nouveautes.length > 0 || reglagesOuverts || aideOuverte || !!invitationInstall || !!poseAPhotographier || !!vueTutos;
  useEffect(() => {
    if (!pret || !profile || autreFenetre) return undefined;
    const id = tutoAProposer({ onglet: ongletActif, stockage: localStorage });
    if (!id) return undefined;
    const minuteur = setTimeout(() => {
      marquerTutoVu(localStorage, id);
      setVueTutos({ tuto: id });
    }, DELAI_TUTO_MS);
    return () => clearTimeout(minuteur);
  }, [pret, profile, ongletActif, autreFenetre]);
  const ouvrirTutoOnglet = () => {
    const t = tutoPrincipal(ongletActif);
    if (t) {
      marquerTutoVu(localStorage, t.id);
      setVueTutos({ tuto: t.id });
    }
  };


  // Rappels push (7 octobre 2026) : a chaque ouverture et a chaque seance
  // notee, le planning des 7 prochains jours repart au serveur s'il a change
  // (un creneau pointe n'a plus a etre rappele).
  useEffect(() => {
    if (!pret || !profile) return;
    synchroniserPush({ profil: profile, seances: sessions, bilanEnvoye: charger(CLE_BILAN_ENVOYE, null) });
  }, [pret, profile, sessions]);

  const weekStats = useMemo(
    () => (profile && targets ? bilanHebdomadaire(getWeekKey(todayISO()), donneesCompletes, profile, targets) : null),
    // planSemaine, routines et semainesDifficiles entrent dans le bilan
    // (programme, semaine difficile) : sans eux, le resume du programme
    // restait celui d'avant la derniere modification (audit P0-10).
    [profile, targets, sessions, dailyForm, bodyLogs, logEntries, measurements, planSemaine, routines, semainesDifficiles]
  );

  const monthStats = useMemo(
    () => (profile && targets ? bilanMensuel(getMonthKey(todayISO()), donneesCompletes, profile, targets) : null),
    // planSemaine, routines et semainesDifficiles entrent dans le bilan
    // (programme, semaine difficile) : sans eux, le resume du programme
    // restait celui d'avant la derniere modification (audit P0-10).
    [profile, targets, sessions, dailyForm, bodyLogs, logEntries, measurements, planSemaine, routines, semainesDifficiles]
  );

  const definirRaisonCreneau = (cle, entree) => {
    const suivant = { ...raisonsCreneaux, [cle]: entree };
    setRaisonsCreneaux(suivant);
    enregistrer(CLES_ANNEXES.raisonsCreneaux, suivant);
  };

  const definirSemaineDifficile = (cleSemaine, entree) => {
    const suivant = { ...semainesDifficiles, [cleSemaine]: entree };
    setSemainesDifficiles(suivant);
    enregistrer(CLES_ANNEXES.semainesDifficiles, suivant);
  };

  const assignerJour = (idJour, idRoutine) => {
    const suivant = { ...planSemaine };
    // Un jour sans seance sort du plan plutot que de valoir null : c'est le
    // format qu'ecrit l'application actuelle.
    if (idRoutine) suivant[idJour] = idRoutine;
    else delete suivant[idJour];
    setPlanSemaine(suivant);
    enregistrer(CLES_ANNEXES.planSemaine, suivant);
  };

  const definirMaxiForce = (mouvement, valeur) => {
    // « maj » : date de chaque maxi, pour l'athlete du mois de la
    // communaute (lib/stats-disciplines.js), comme dans l'app Neiram.
    const suivant = { ...maxisForce, [mouvement]: valeur, maj: { ...(maxisForce.maj || {}), [mouvement]: todayISO() } };
    setMaxisForce(suivant);
    enregistrer(CLES_ANNEXES.maxisForce, suivant);
  };

  const enregistrerProfil = (suivant) => {
    setProfile(suivant);
    enregistrer(STORAGE_KEYS.profile, suivant);
  };

  if (!pret) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Loader2 size={26} className="spin" color={COLORS.gold} />
      </div>
    );
  }

  /**
   * Sans profil, rien ne peut etre calcule ni affiche : ni objectifs
   * caloriques, ni bilan, ni score du jour. Un nouveau client passe donc
   * par l'accueil avant de voir l'application.
   */
  if (!profile) return <Bienvenue onSave={enregistrerProfil} />;

  const profil = profile;

  // Suivi avant l'application (date de debut, seances deja faites) : saisi
  // sur la carte de progres (Tendances) ou dans les trophees (Seances), les
  // deux ecrivent les memes champs du profil.
  const definirDebutCoaching = (d) => {
    // Date effacee : retour au calcul automatique (premiere saisie).
    const { coachingStartDate, ...reste } = profil;
    enregistrerProfil(d ? { ...reste, coachingStartDate: d } : reste);
  };
  // Contrat en cours (formule + date de debut) : compte a rebours dans les
  // trophees. null : contrat retire du profil.
  const definirContrat = (c) => {
    const { contrat, ...reste } = profil;
    enregistrerProfil(c ? { ...reste, contrat: c } : reste);
  };
  const definirSeancesAvantApp = (n) => {
    // 0 : plus de seances d'avant l'application, champ retire du profil.
    const { seancesAvantApp, ...reste } = profil;
    enregistrerProfil(n > 0 ? { ...reste, seancesAvantApp: n } : reste);
  };

  const ecrans = {
    journal: (
      <Journal
        logEntriesApi={logEntriesApi}
        dishesApi={dishesApi}
        bodyApi={bodyApi}
        formApi={formApi}
        sessionsApi={sessionsApi}
        targets={targets}
        profile={profil}
        semainesDifficiles={semainesDifficiles}
        routines={routines}
        planSemaine={planSemaine}
        onAller={(onglet, intention) => {
          if (intention) poserIntention(intention);
          setOngletActif(onglet);
        }}
        onToast={afficherToast}
      />
    ),
    repas: <Repas api={dishesApi} profile={profil} targets={targets} logEntries={logEntries} />,
    nutrition: (
      <Nutrition
        profile={profil}
        targets={targets}
        currentWeight={poidsCourant}
        bodyLogs={bodyLogs}
        logEntries={logEntries}
        seances={sessions}
        seancePrevue={!!(planSemaine && planSemaine[dayIdOf(todayISO())])}
        onApplyCalibration={(kcal, couverture) =>
          enregistrerProfil({
            ...profil,
            calibratedMaintenanceKcal: kcal,
            // La couverture du journal est enregistree AVEC l'estimation :
            // sans elle, on ne peut plus savoir, plus tard, si le calibrage
            // reposait sur un journal complet.
            calibratedCoverage: kcal ? (couverture ?? null) : null,
            calibratedAt: kcal ? new Date().toISOString() : null
          })
        }
      />
    ),
    sommeil: <Sommeil formApi={formApi} profile={profil} />,
    mensurations: <Mensurations api={measurementsApi} bodyApi={bodyApi} objectif={profil?.goal} profil={profil} />,
    entrainements: (
      <Entrainements
        routinesApi={routinesApi}
        sessionsApi={sessionsApi}
        profile={profil}
        raisonsCreneaux={raisonsCreneaux}
        onDefinirRaisonCreneau={definirRaisonCreneau}
        semainesDifficiles={semainesDifficiles}
        onDefinirSemaineDifficile={definirSemaineDifficile}
        planSemaine={planSemaine}
        onAssignerJour={assignerJour}
        maxisForce={maxisForce}
        onDefinirMaxiForce={definirMaxiForce}
        onEnregistrerLienSheets={(url) => enregistrerProfil({ ...profil, sheetsUrl: url })}
        onDebutCoaching={definirDebutCoaching}
        onSeancesAvantApp={definirSeancesAvantApp}
        onContrat={definirContrat}
        formDuJour={dailyForm.find((f) => f.date === todayISO())}
        poidsKg={poidsCourant}
        journal={dailyForm}
        corps={bodyLogs}
        repas={logEntries}
      />
    ),
    tendances: weekStats ? (
      <Tendances
        allData={donneesCompletes}
        profile={profil}
        targets={targets}
        weekStats={weekStats}
        monthStats={monthStats}
        photos={photos}
        onUploadPhoto={setPoseAPhotographier}
        onDebutCoaching={definirDebutCoaching}
        onSeancesAvantApp={definirSeancesAvantApp}
        onPartager={envoyerBilan}
        onGenerate={genererBilan}
        onGenerateMonthly={genererBilanDuMois}
        bilanCourant={bilanCourant}
        bilanMensuelCourant={bilanMensuelCourant}
        bilans={reports}
        bilansMensuels={monthlyReports}
        enGeneration={enGeneration}
        enGenerationMensuelle={enGenerationMensuelle}
        erreurGeneration={erreurGeneration}
        erreurGenerationMensuelle={erreurGenerationMensuelle}
      />
    ) : null
  };

  return (
    <>
      {/* TEXTE-NOUVEAU
          Bandeau de panne de stockage. Ajoute apres un signalement client :
          « on ne peut meme plus enregistrer de repas, ca ne fonctionne
          plus ». Le stockage du navigateur etait plein, chaque ecriture
          echouait, et RIEN ne le disait — ni message, ni erreur.
      */}
      {pannePersistance && (
        <div
          role="alert"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 60,
            background: COLORS.bad,
            color: "#fff",
            padding: "10px 14px",
            fontSize: 13,
            lineHeight: 1.45,
            textAlign: "center"
          }}
        >
          <strong>Rien ne s'enregistre.</strong>{" "}
          {pannePersistance.quota
            ? "La mémoire de l'application est pleine. Ouvre « Mon profil & réglages » pour faire de la place — tes saisies récentes ne sont pas conservées tant que ce message est là."
            : "Le navigateur refuse d'écrire. Vérifie que la navigation privée est désactivée, puis rouvre l'application."}
        </div>
      )}
      {/* FIN-TEXTE-NOUVEAU */}

      <Coque
        ongletActif={ongletActif}
        onChangerOnglet={setOngletActif}
        onOuvrirReglages={() => setReglagesOuverts(true)}
        onOuvrirTuto={ouvrirTutoOnglet}
        toast={toast}
        onFermerToast={() => setToast(null)}
        iconeToast={Droplet}
      >
        {bandeauInstallationVisible({ plateforme, masqueJusqua: installMasqueeJusqua, aujourdhui: todayISO() }) && (
          <BandeauInstallation
            plateforme={plateforme}
            peutProposer={!!invitationInstall}
            onInstaller={installer}
            onMasquer={masquerInstallation}
          />
        )}
        {/* Un ecran qui plante n'emporte pas l'app (ui/FiletErreur.jsx). */}
        <FiletEcran key={ongletActif} ecran={ongletActif} onRetourJournal={() => setOngletActif("journal")}>
          {ecrans[ongletActif]}
        </FiletEcran>
      </Coque>

      <Modal
        open={!!poseAPhotographier}
        onClose={() => setPoseAPhotographier(null)}
        title="Photo de progression"
      >
        {poseAPhotographier && (
          <div>
            {/* TEXTE-NOUVEAU
                Le choix explicite « appareil ou photothèque » n'existe pas
                dans l'application d'origine, qui ouvrait directement le
                selecteur de fichiers. Sur Android, celui-ci n'expose pas
                toujours l'appareil photo : des clientes ne pouvaient
                photographier que depuis leur photothèque. */}
            <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "0 0 14px", lineHeight: 1.5 }}>
              Même lieu, même lumière, même tenue que la semaine précédente.
            </p>
            <ChoixPhoto
              onFichier={(fichier) => {
                const pose = poseAPhotographier;
                setPoseAPhotographier(null);
                traiterPhoto(pose, fichier);
              }}
              libelleAppareil="Prendre la photo"
              libelleGalerie="Choisir une photo"
            />
            {/* FIN-TEXTE-NOUVEAU */}
          </div>
        )}
      </Modal>

      <Reglages
        open={reglagesOuverts}
        onClose={() => setReglagesOuverts(false)}
        profile={profil}
        onSave={enregistrerProfil}
        seances={sessions}
        onOuvrirAide={() => {
          setReglagesOuverts(false);
          setAideOuverte(true);
        }}
        onOuvrirGuide={() => {
          setReglagesOuverts(false);
          setVueTutos({ guide: true });
        }}
        onVoirNouveautes={() => {
          setReglagesOuverts(false);
          setNouveautes(nouveautesPour(profil).slice(0, NOUVEAUTES_MAX));
        }}
      />

      <QuoiDeNeuf
        nouveautes={nouveautes}
        onFermer={fermerNouveautes}
        onVoir={(n) => {
          fermerNouveautes();
          if (n.ouvre === "aide") setAideOuverte(true);
          else if (n.ouvre === "guide") setVueTutos({ guide: true });
          else setOngletActif(n.onglet);
        }}
      />

      <Tutos vue={vueTutos} onClose={() => setVueTutos(null)} />
      <EcranConsentementIa />
      <Aide open={aideOuverte} onClose={() => setAideOuverte(false)} objectifCalories={targets?.calories} />
    </>
  );
}
