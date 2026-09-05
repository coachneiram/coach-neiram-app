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
import { getMonthKey, getWeekKey } from "./lib/semaine.js";
import { STORAGE_KEYS, charger, enregistrer } from "./lib/stockage.js";
import { collectionApi, journalDuJourApi } from "./lib/collections.js";
import { computeTargets } from "./lib/nutrition.js";
import { bilanHebdomadaire } from "./lib/bilan.js";
import { bilanMensuel } from "./lib/bilan-mensuel.js";
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

  const [dishes, setDishes] = useState([]);
  const [logEntries, setLogEntries] = useState([]);
  const [bodyLogs, setBodyLogs] = useState([]);
  const [dailyForm, setDailyForm] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [routines, setRoutines] = useState([]);

  useEffect(() => {
    setProfile(charger(STORAGE_KEYS.profile, null));
    setDishes(listeStockee(STORAGE_KEYS.dishes));
    setLogEntries(listeStockee(STORAGE_KEYS.logEntries));
    setBodyLogs(listeStockee(STORAGE_KEYS.bodyLogs));
    setDailyForm(listeStockee(STORAGE_KEYS.dailyForm));
    setSessions(listeStockee(STORAGE_KEYS.sessions));
    setMeasurements(listeStockee(STORAGE_KEYS.measurements));
    setRoutines(listeStockee(STORAGE_KEYS.routines));
    setPret(true);
  }, []);

  const afficherToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), DUREE_TOAST);
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

  const donneesCompletes = { sessions, dailyForm, bodyLogs, logEntries, measurements, weekPlan: null, routines, hardWeeks: null };

  const weekStats = useMemo(
    () => (profile && targets ? bilanHebdomadaire(getWeekKey(todayISO()), donneesCompletes, profile, targets) : null),
    [profile, targets, sessions, dailyForm, bodyLogs, logEntries]
  );

  const monthStats = useMemo(
    () => (profile && targets ? bilanMensuel(getMonthKey(todayISO()), donneesCompletes, profile, targets) : null),
    [profile, targets, sessions, dailyForm, bodyLogs, logEntries, measurements]
  );

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
        onApplyCalibration={(kcal) =>
          enregistrerProfil({ ...profil, calibratedMaintenanceKcal: kcal, calibratedAt: new Date().toISOString() })
        }
      />
    ),
    sommeil: <Sommeil formApi={formApi} profile={profil} />,
    mensurations: <Mensurations api={measurementsApi} bodyApi={bodyApi} />,
    entrainements: <Entrainements routinesApi={routinesApi} sessionsApi={sessionsApi} profile={profil} />,
    tendances: weekStats ? (
      <Tendances
        allData={donneesCompletes}
        profile={profil}
        targets={targets}
        weekStats={weekStats}
        monthStats={monthStats}
        photos={{}}
      />
    ) : null
  };

  return (
    <>
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
