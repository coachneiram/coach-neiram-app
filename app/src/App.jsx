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

import { useEffect, useMemo, useState } from "react";
import { COLORS } from "./tokens.js";
import { todayISO } from "./lib/dates.js";
import { cleMoisPrecedent, getMonthKey, getWeekKey, uid } from "./lib/semaine.js";
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
  marquerBilanEnvoye,
  verifierRappelDimanche
} from "./lib/rappel-dimanche.js";
import {
  verifierRappelCreneau,
  verifierRappelHydratation,
  verifierRappelNutrition
} from "./lib/moteur-rappels.js";
import { verifierAlertesCoach } from "./lib/moteur-alertes.js";
import { totauxDuJour } from "./lib/score-jour.js";
import { Coque } from "./ui/Coque.jsx";
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

/** Duree d'affichage d'une notification passagere, en millisecondes. */
const DUREE_TOAST = 5200;

/**
 * Charge une liste depuis le stockage.
 *
 * Une valeur corrompue renvoie une liste vide plutot que de faire tomber
 * l'application au demarrage : mieux vaut un ecran vide qu'un ecran noir,
 * et les autres donnees restent accessibles.
 */
function listeStockee(cle) {
  const valeur = charger(cle, []);
  return Array.isArray(valeur) ? valeur : [];
}

export default function App() {
  const [pret, setPret] = useState(false);
  const [profile, setProfile] = useState(null);
  const [ongletActif, setOngletActif] = useState("journal");
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const [toast, setToast] = useState(null);

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
    setPret(true);
  }, []);

  const afficherToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), DUREE_TOAST);
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
  const choisirPhoto = (pose) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const fichier = input.files && input.files[0];
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
    input.click();
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
      targets
    });
    if (resultat === "shared" || resultat === "downloaded") {
      marquerBilanEnvoye(weekStats.weekKey);
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
        totaux: totauxDuJour(logEntries.filter((e) => e.date === todayISO())),
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
      afficherToast: (m) => {
        if (!arrete) afficherToast(m);
      }
    });
    return () => {
      arrete = true;
    };
  }, [pret, profile, sessions, raisonsCreneaux]);


  const weekStats = useMemo(
    () => (profile && targets ? bilanHebdomadaire(getWeekKey(todayISO()), donneesCompletes, profile, targets) : null),
    [profile, targets, sessions, dailyForm, bodyLogs, logEntries]
  );

  const monthStats = useMemo(
    () => (profile && targets ? bilanMensuel(getMonthKey(todayISO()), donneesCompletes, profile, targets) : null),
    [profile, targets, sessions, dailyForm, bodyLogs, logEntries, measurements]
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
    const suivant = { ...maxisForce, [mouvement]: valeur };
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
    mensurations: <Mensurations api={measurementsApi} bodyApi={bodyApi} />,
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
        onUploadPhoto={choisirPhoto}
        onPartager={envoyerBilan}
        onGenerate={genererBilan}
        onGenerateMonthly={genererBilanDuMois}
        bilanCourant={bilanCourant}
        bilanMensuelCourant={bilanMensuelCourant}
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
        toast={toast}
        onFermerToast={() => setToast(null)}
        iconeToast={Droplet}
      >
        {ecrans[ongletActif]}
      </Coque>

      <Reglages
        open={reglagesOuverts}
        onClose={() => setReglagesOuverts(false)}
        profile={profil}
        onSave={enregistrerProfil}
      />
    </>
  );
}
