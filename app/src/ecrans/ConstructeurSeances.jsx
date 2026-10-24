/**
 * Constructeur de seances.
 *
 * Portage de EntrainementsTabLegacy (index.html 3904-4001) : les seances
 * types, la saisie d'une seance, la bibliotheque d'exercices et
 * l'historique.
 *
 * C'est l'ecran le plus dense de l'application, et le seul ou le client
 * saisit pendant qu'il s'entraine, entre deux series. D'ou les champs
 * compacts et la charge du jour deja pre-remplie : il ne doit rien avoir a
 * calculer avec une barre chargee a cote de lui.
 *
 * Toute la logique — progression, preparation, bibliotheque — vit dans
 * lib/constructeur-seances.js et y est testee.
 */

import { useEffect, useRef, useState } from "react";
import { COLORS } from "../tokens.js";
import { fmtDateShort, num, todayISO } from "../lib/dates.js";
import { uid } from "../lib/semaine.js";
import {
  CARDIO_FIELD_DEFS,
  DEFAULT_CARDIO_FIELDS,
  EXERCISE_LIBRARY,
  PAIN_ZONES,
  ROUTINE_COLORS
} from "../lib/catalogues.js";
import {
  ajouterDepuisBibliotheque,
  CHOIX_TYPE_SERIE,
  cleExercice,
  DEGRESSIVE_PAR_DEFAUT,
  derniereFois,
  exercicePourProgramme,
  filtrerBibliotheque,
  exerciceTape,
  exerciceVide,
  fusionnerExercicesPerso,
  GROUPES_SUPERSET,
  paliersDegressifs,
  preparerSeance,
  resumeExercice,
  TECHNIQUES_SERIE,
  FAMILLES_TECHNIQUE,
  chargeBackoff,
  parametresParDefaut,
  techniqueParId,
  videoExercice
} from "../lib/constructeur-seances.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { envoyerEvenement, pointageDepuisSeance } from "../lib/synchro-coach.js";
import { CHAMP_RPE } from "../lib/force.js";
import {
  aDesSeries,
  avecSeries,
  estChrono,
  finaliserSeries,
  garderCharge,
  MAX_SERIES,
  reposDe,
  resumeDerniereFois,
  seriesDe,
  serieSuivante,
  TEXTES_SERIES
} from "../lib/series.js";
import { MinuteurRepos, preparerSon } from "../ui/MinuteurRepos.jsx";
import { ChoixRepos } from "../ui/ChoixRepos.jsx";
import { OutilsBarre } from "../ui/OutilsBarre.jsx";
import {
  afficherGuide,
  dureeAuto,
  exerciceTermine,
  phraseCharge,
  progressionSeance,
  TEXTES_GUIDE
} from "../lib/guide-seance.js";
import { seancesProgrammeDebutant, TEXTES_DEBUTANT, TEXTES_PROGRAMME } from "../lib/seance-du-jour.js";
import { SeanceDuJour } from "./SeanceDuJour.jsx";
import { ForceAthletique } from "./ForceAthletique.jsx";
import { CalculCharge } from "./CalculCharge.jsx";
import { ZoneDictee } from "../ui/Dictee.jsx";
import { completerSeance } from "../lib/dictee-saisie.js";
import { PlanSemaine } from "./PlanSemaine.jsx";
import {
  Btn,
  Card,
  EmptyState,
  Field,
  IconBtn,
  Modal,
  NumberInput,
  SectionTitle,
  TextArea,
  TextInput
} from "../ui/primitives.jsx";
import { Dumbbell, Pencil, Plus, Search, Trash2, X } from "../ui/icones.jsx";

const CLE_EXERCICES_PERSO = "cn_custom_exercises";

/**
 * Seance en cours de saisie, gardee a chaque frappe.
 *
 * Avec la saisie serie par serie, la fenetre de seance reste ouverte toute
 * la duree de l'entrainement. Un telephone qui recharge l'application apres
 * une longue veille (iOS le fait) aurait tout efface. Hors prefixes
 * « coach_ » et « cn_ » expres : un brouillon n'a rien a faire dans la
 * sauvegarde du client.
 */
const CLE_BROUILLON_SEANCE = "brouillon_seance_neiram";

/** Champ compact : la saisie se fait au telephone, entre deux series. */
const champCompact = {
  width: "100%",
  background: COLORS.bgAlt,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "8px 8px",
  color: COLORS.text,
  fontFamily: "Inter",
  fontSize: 13,
  outline: "none"
};

/** Serie cochee : ses champs passent au vert pale, on voit d'un coup d'oeil ou on en est. */
const champFait = { ...champCompact, border: `1px solid ${COLORS.good}55`, color: COLORS.textMuted };

/** Note sous les champs de technique : elle explique ce qui va etre fait. */
const styleNoteTechnique = {
  fontSize: 10.5,
  color: COLORS.textFaint,
  fontFamily: "IBM Plex Mono",
  margin: "5px 0 0",
  lineHeight: 1.4
};

const styleEtiquette = {
  fontSize: 9,
  color: COLORS.textFaint,
  marginBottom: 3,
  textTransform: "uppercase",
  letterSpacing: 0.4
};

/** Guidage pendant la seance (24 octobre 2026), voir lib/guide-seance.js. */
const styleGuide = {
  background: `${COLORS.gold}10`,
  border: `1px solid ${COLORS.gold}44`,
  borderRadius: 10,
  padding: "10px 12px",
  margin: "0 0 10px"
};
const styleEtapes = { margin: "6px 0 0", paddingLeft: 18, fontSize: 12.5, color: COLORS.text, lineHeight: 1.5 };
const styleEnteteExercice = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 };
const styleLigneUnite = { display: "flex", alignItems: "center", marginBottom: 8, gap: 8 };
const styleTermine = { fontSize: 11, fontWeight: 700, color: COLORS.good };
const styleCharge = { display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 0 2px", gap: 8, fontSize: 12, lineHeight: 1.4 };
const styleBoutonGarder = {
  background: "none",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  color: COLORS.textMuted,
  fontSize: 11.5,
  cursor: "pointer",
  padding: "4px 8px",
  flexShrink: 0
};
const styleBarreEnregistrer = {
  position: "sticky",
  bottom: 0,
  zIndex: 2,
  background: COLORS.surface,
  borderTop: `1px solid ${COLORS.border}`,
  padding: "10px 0 4px",
  marginTop: 8,
  // Couvre la marge du bas de la fenetre : rien ne depasse sous le bouton.
  boxShadow: `0 40px 0 0 ${COLORS.surface}`
};
const styleProgression = { height: 5, borderRadius: 3, background: COLORS.bgAlt, overflow: "hidden", margin: "0 0 8px" };

/** Consigne du coach sous le nom de l'exercice : elle se lit d'un coup d'oeil. */
const styleConsigne = { fontSize: 12, color: COLORS.gold, margin: "6px 0 0", lineHeight: 1.4 };

const styleLienOptions = {
  background: "none",
  border: "none",
  padding: "8px 0 0",
  color: COLORS.textFaint,
  fontSize: 11.5,
  cursor: "pointer",
  textDecoration: "underline"
};

const styleLigneBoutonsSeries = { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 6 };

const styleBoutonPointille = {
  flex: 1,
  background: "none",
  border: `1px dashed ${COLORS.border}`,
  borderRadius: 9,
  padding: 9,
  color: COLORS.gold,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5
};

/** Exercices personnels : ceux que le client a saisis lui-meme. */
function useExercicesPerso() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const stockes = charger(CLE_EXERCICES_PERSO, []);
    setItems(Array.isArray(stockes) ? stockes : []);
  }, []);

  const retenir = (exercices) =>
    setItems((precedents) => {
      const suivants = fusionnerExercicesPerso(precedents, exercices);
      if (suivants !== precedents) enregistrer(CLE_EXERCICES_PERSO, suivants);
      return suivants;
    });

  const oublier = (nom) =>
    setItems((precedents) => {
      const suivants = precedents.filter((x) => cleExercice(x.name) !== cleExercice(nom));
      enregistrer(CLE_EXERCICES_PERSO, suivants);
      return suivants;
    });

  return { items, retenir, oublier };
}

export function ConstructeurSeances({
  routinesApi,
  sessionsApi,
  profile,
  plOn,
  planSemaine,
  onAssignerJour,
  maxisForce,
  onDefinirMaxiForce,
  avecSeanceDuJour = true,
  children
}) {
  const exercicesPerso = useExercicesPerso();
  const [modaleRoutine, setModaleRoutine] = useState(false);
  const [routineEditee, setRoutineEditee] = useState(null);
  const [modaleSeance, setModaleSeance] = useState(false);
  const [seanceEditee, setSeanceEditee] = useState(null);
  const [bibliothequeOuverte, setBibliothequeOuverte] = useState(false);
  const [exerciceLibre, setExerciceLibre] = useState("");
  const [minuteur, setMinuteur] = useState(null);
  // Ou va l'exercice choisi dans la bibliotheque : la seance en cours, ou
  // le programme de la seance type en cours d'edition.
  const [cibleBibliotheque, setCibleBibliotheque] = useState("seance");
  // Exercices dont le client a deplie les options (type, technique).
  const [optionsOuvertes, setOptionsOuvertes] = useState(() => new Set());
  const refSeancesTypes = useRef(null);

  // Une seance laissee ouverte (application rechargee) se rouvre telle quelle.
  useEffect(() => {
    const brouillon = charger(CLE_BROUILLON_SEANCE, null);
    if (brouillon && Array.isArray(brouillon.exercises)) {
      setSeanceEditee(brouillon);
      setModaleSeance(true);
    }
  }, []);

  useEffect(() => {
    if (modaleSeance && seanceEditee) enregistrer(CLE_BROUILLON_SEANCE, seanceEditee);
  }, [modaleSeance, seanceEditee]);

  const oublierBrouillon = () => {
    try {
      localStorage.removeItem(CLE_BROUILLON_SEANCE);
    } catch (e) {
      // Stockage indisponible : rien a oublier.
    }
  };

  /**
   * Fermer sans enregistrer. Un geste a cote de la fenetre la fermait sans
   * prevenir ; avec des series deja cochees, on demande d'abord.
   */
  const fermerSeance = () => {
    const cochees = (seanceEditee?.exercises || []).some((e) => (e.series || []).some((x) => x.fait));
    if (cochees && !window.confirm(TEXTES_SERIES.quitter)) return;
    oublierBrouillon();
    setMinuteur(null);
    setModaleSeance(false);
  };

  const nouvelleRoutine = () => {
    setRoutineEditee({ id: null, name: "", description: "", color: ROUTINE_COLORS[0], exercises: [] });
    setModaleRoutine(true);
  };

  const enregistrerRoutine = async () => {
    const donnees = { ...routineEditee };
    delete donnees.id;
    // Une seance type qui porte des exercices est programmee : a chaque
    // demarrage, la liste vient du programme (et la charge, de la derniere
    // fois). Sans exercice, elle reprend la derniere seance, comme avant.
    const exercices = (donnees.exercises || []).filter((e) => String(e.name || "").trim());
    if (exercices.length) {
      donnees.exercises = exercices;
      donnees.programme = true;
    } else {
      delete donnees.exercises;
      delete donnees.programme;
    }
    if (routineEditee.id) await routinesApi.update(routineEditee.id, donnees);
    else await routinesApi.add(donnees);
    setModaleRoutine(false);
  };

  // Programme debutant du coach (valide le 22 octobre 2026) : ajoute les
  // seances types manquantes, deja programmees.
  const programmeManquant = seancesProgrammeDebutant(routinesApi.items, EXERCISE_LIBRARY, uid);
  const prendreProgramme = async () => {
    if (programmeManquant.length) await routinesApi.addMany(programmeManquant);
  };

  const supprimerRoutine = async () => {
    if (!routineEditee?.id || !window.confirm(TEXTES_DEBUTANT.confirmerSuppression)) return;
    await routinesApi.remove(routineEditee.id);
    setModaleRoutine(false);
  };

  const modifierExerciceProgramme = (k, correctif) =>
    setRoutineEditee((r) => ({
      ...r,
      exercises: (r.exercises || []).map((e, j) => (j === k ? { ...e, ...correctif } : e))
    }));

  const retirerExerciceProgramme = (k) =>
    setRoutineEditee((r) => ({ ...r, exercises: (r.exercises || []).filter((_, j) => j !== k) }));

  const monterExerciceProgramme = (k) =>
    setRoutineEditee((r) => {
      const liste = [...(r.exercises || [])];
      if (k > 0) [liste[k - 1], liste[k]] = [liste[k], liste[k - 1]];
      return { ...r, exercises: liste };
    });

  const ouvrirBibliotheque = (cible) => {
    setCibleBibliotheque(cible);
    setBibliothequeOuverte(true);
  };

  const voirSeancesTypes = () => {
    if (refSeancesTypes.current) refSeancesTypes.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const basculerOptions = (id) =>
    setOptionsOuvertes((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const demarrerSeance = (routine, dateImposee) => {
    const seance = preparerSeance(routine, sessionsApi.items, dateImposee);
    // Heure de demarrage : la duree se calcule seule si le client la laisse vide.
    setSeanceEditee(seance.date === todayISO() ? { ...seance, debutLe: Date.now() } : seance);
    setModaleSeance(true);
  };

  const modifierSeance = (s) => {
    setSeanceEditee({ ...s, exercises: s.exercises?.length ? s.exercises : [exerciceVide()] });
    setModaleSeance(true);
  };

  const enregistrerSeance = async () => {
    // Un exercice sans nom est une ligne que le client n'a pas remplie :
    // l'enregistrer polluerait son historique.
    const donnees = {
      ...seanceEditee,
      exercises: seanceEditee.exercises.filter((e) => e.name.trim()).map(finaliserSeries)
    };
    delete donnees.id;
    const auto = donnees.date === todayISO() ? dureeAuto(donnees.debutLe) : null;
    if (!String(donnees.durationMin ?? "").trim() && auto) donnees.durationMin = auto;
    delete donnees.debutLe;
    exercicesPerso.retenir(donnees.exercises);
    if (seanceEditee.id) await sessionsApi.update(seanceEditee.id, donnees);
    else {
      await sessionsApi.add(donnees);
      // Client en ligne : la seance part aussi au Journal du coach. Une
      // seance modifiee ensuite ne repart pas (le coach l'a deja recue).
      const maintenant = new Date();
      const pointage = pointageDepuisSeance(profile, donnees, {
        aujourdhui: todayISO(),
        heure: String(maintenant.getHours()).padStart(2, "0") + ":" + String(maintenant.getMinutes()).padStart(2, "0")
      });
      if (pointage) envoyerEvenement(profile, pointage);
    }
    oublierBrouillon();
    setMinuteur(null);
    setModaleSeance(false);
  };

  const modifierExercice = (i, correctif) => {
    const suivants = [...seanceEditee.exercises];
    suivants[i] = { ...suivants[i], ...correctif };
    setSeanceEditee({ ...seanceEditee, exercises: suivants });
  };

  /**
   * Change la technique d'un exercice, en posant ses valeurs de depart.
   *
   * Sans pre-remplissage, cocher « Dégressive » n'affiche rien : le client
   * voit deux champs vides et doit deviner ce qu'on attend. Les valeurs
   * posees sont celles que Coach Neiram programme le plus souvent, et
   * restent modifiables.
   */
  const changerTechnique = (i, technique) => {
    const ex = seanceEditee.exercises[i];
    if (technique === "superset" || technique === "triset" || technique === "circuit") {
      modifierExercice(i, { technique, supersetGroupe: ex.supersetGroupe || GROUPES_SUPERSET[0] });
    } else if (technique && technique !== "degressive") {
      modifierExercice(i, { technique, techniqueParams: { ...parametresParDefaut(technique), ...(ex.technique === technique ? ex.techniqueParams : {}) } });
    } else if (technique === "degressive") {
      modifierExercice(i, {
        technique,
        degressivePaliers: ex.degressivePaliers ?? DEGRESSIVE_PAR_DEFAUT.paliers,
        degressiveBaissePct: ex.degressiveBaissePct ?? DEGRESSIVE_PAR_DEFAUT.baissePct
      });
    } else {
      modifierExercice(i, { technique: "" });
    }
  };

  /** Change une serie ; les champs agreges de l'exercice suivent. */
  const modifierSerie = (i, k, correctif) => {
    const series = seriesDe(seanceEditee.exercises[i]);
    series[k] = { ...series[k], ...correctif };
    modifierExercice(i, avecSeries(series));
  };

  const ajouterSerie = (i) => {
    const series = seriesDe(seanceEditee.exercises[i]);
    if (series.length >= MAX_SERIES) return;
    modifierExercice(i, avecSeries([...series, serieSuivante(series)]));
  };

  const retirerSerie = (i) => {
    const series = seriesDe(seanceEditee.exercises[i]);
    if (series.length <= 1) return;
    modifierExercice(i, avecSeries(series.slice(0, -1)));
  };

  /** Cocher une serie lance le repos de l'exercice. */
  const cocherSerie = (i, k) => {
    const ex = seanceEditee.exercises[i];
    const fait = !seriesDe(ex)[k].fait;
    modifierSerie(i, k, { fait });
    // Derniere serie de l'exercice cochee : l'exercice suivant vient a l'ecran.
    const toutes = seriesDe(ex).every((x, j) => (j === k ? fait : x.fait));
    if (fait && toutes && i + 1 < seanceEditee.exercises.length) {
      setTimeout(() => {
        const suivant = typeof document !== "undefined" && document.querySelector(`.modal-panel [data-exercice="${i + 1}"]`);
        if (suivant && suivant.scrollIntoView) suivant.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
    }
    if (fait) {
      preparerSon();
      if (estChrono(ex)) {
        setMinuteur({ chrono: true, debut: Date.now() });
      } else {
        const duree = reposDe(ex);
        setMinuteur({ fin: Date.now() + duree * 1000, duree });
      }
    }
  };

  const ajusterMinuteur = (secondes) =>
    setMinuteur((m) => (m ? { ...m, fin: m.fin + secondes * 1000, duree: Math.max(1, m.duree + secondes) } : m));

  const retirerExercice = (i) => {
    const nom = String(seanceEditee.exercises[i]?.name || "").trim();
    if (nom && typeof window !== "undefined" && !window.confirm(TEXTES_GUIDE.retirer(nom))) return;
    const restants = seanceEditee.exercises.filter((_, k) => k !== i);
    // La seance garde toujours au moins une ligne : un formulaire vide n'a
    // pas d'endroit ou saisir.
    setSeanceEditee({ ...seanceEditee, exercises: restants.length ? restants : [exerciceVide()] });
  };

  const ajouterDeLaBibliotheque = (item) => {
    // La recherche ne doit pas filtrer la bibliotheque a sa prochaine ouverture.
    setExerciceLibre("");
    if (cibleBibliotheque === "routine") {
      setRoutineEditee((r) => ({ ...r, exercises: [...(r.exercises || []), exercicePourProgramme(item)] }));
      setBibliothequeOuverte(false);
      return;
    }
    setSeanceEditee({
      ...seanceEditee,
      exercises: ajouterDepuisBibliotheque(seanceEditee.exercises, item)
    });
    setBibliothequeOuverte(false);
  };

  // Exercice absent de la bibliotheque : range tout de suite dans « Mes
  // exercices » (sans attendre l'enregistrement de la seance) et ajoute a la
  // seance en cours.
  const ajouterExerciceTape = () => {
    const item = exerciceTape(exerciceLibre, exercicesPerso.items);
    if (!item) return;
    exercicesPerso.retenir([{ name: item.name, mode: item.mode || "muscu" }]);
    setExerciceLibre("");
    ajouterDeLaBibliotheque(item);
  };

  const seancesTriees = [...sessionsApi.items].sort((a, b) => b.date.localeCompare(a.date));

  const groupesBibliotheque = [
    ...(exercicesPerso.items.length
      ? [
          {
            group: "Mes exercices",
            custom: true,
            note: "Exercices que tu as saisis toi-même, conservés pour les réutiliser.",
            items: exercicesPerso.items
          }
        ]
      : []),
    ...EXERCISE_LIBRARY.filter((g) => !g.plOnly || plOn)
  ];

  return (
    <div>
      {avecSeanceDuJour && (
        <SeanceDuJour
          routines={routinesApi.items}
          sessions={sessionsApi.items}
          plan={planSemaine}
          onDemarrer={(r) => demarrerSeance(r)}
          onCreer={nouvelleRoutine}
          onVoirSeances={voirSeancesTypes}
          onPrendreProgramme={prendreProgramme}
        />
      )}
      {children}

      <PlanSemaine
        plan={planSemaine}
        onAssigner={onAssignerJour}
        routines={routinesApi.items}
        sessions={sessionsApi.items}
        onDemarrer={demarrerSeance}
      />

      {plOn && (
        <ForceAthletique
          maxis={maxisForce}
          onDefinirMaxi={onDefinirMaxiForce}
          sessions={sessionsApi.items}
        />
      )}

      <div
        ref={refSeancesTypes}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, scrollMarginTop: 80 }}
      >
        <SectionTitle>Séances types</SectionTitle>
        <Btn variant="ghost" icon={Plus} onClick={nouvelleRoutine}>
          Nouvelle séance type
        </Btn>
      </div>

      {routinesApi.items.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          message="Crée tes séances types (ex. Haut du corps, Circuit cardio) pour les réutiliser à chaque entraînement."
          ctaLabel="Nouvelle séance type"
          onCta={nouvelleRoutine}
          iconeCta={Plus}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))",
            gap: 10,
            marginBottom: 26
          }}
        >
          {routinesApi.items.map((r) => (
            <Card key={r.id} data-seance-type={r.id} style={{ padding: 14, cursor: "pointer" }} onClick={() => demarrerSeance(r)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: r.color }} />
                <button
                  onClick={(e) => {
                    // Sans cela, le clic ouvrirait aussi une nouvelle seance.
                    e.stopPropagation();
                    setRoutineEditee(r);
                    setModaleRoutine(true);
                  }}
                  style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer" }}
                >
                  <Pencil size={13} />
                </button>
              </div>
              <div
                style={{
                  fontFamily: "Poppins",
                  fontSize: 15,
                  fontWeight: 700,
                  color: COLORS.text,
                  marginTop: 8,
                  textTransform: "uppercase"
                }}
              >
                {r.name}
              </div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{r.description}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Programme debutant du coach, propose aux clients qui ont deja une
          ou deux seances types a eux mais ne l'ont pas encore pris. */}
      {routinesApi.items.length > 0 && routinesApi.items.length < 3 && programmeManquant.length === 2 && (
        <Btn variant="ghost" icon={Plus} style={{ width: "100%", marginBottom: 26 }} onClick={prendreProgramme}>
          {TEXTES_PROGRAMME.bouton}
        </Btn>
      )}

      <SectionTitle>Historique des séances</SectionTitle>
      {seancesTriees.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 10 }}>
          Aucune séance loguée. Choisis une séance type ci-dessus pour démarrer.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {seancesTriees.map((s) => {
            const routine = routinesApi.items.find((r) => r.id === s.routineId);
            return (
              <Card key={s.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted }}>{fmtDateShort(s.date)}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      {routine && (
                        <div style={{ width: 9, height: 9, borderRadius: 3, background: routine.color }} />
                      )}
                      <span
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 15,
                          fontWeight: 700,
                          color: COLORS.text,
                          textTransform: "uppercase"
                        }}
                      >
                        {routine?.name || "Séance"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <IconBtn onClick={() => modifierSeance(s)}>
                      <Pencil size={14} />
                    </IconBtn>
                    <IconBtn danger onClick={() => sessionsApi.remove(s.id)}>
                      <Trash2 size={14} />
                    </IconBtn>
                  </div>
                </div>

                {s.exercises?.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                    {s.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          fontSize: 13,
                          color: COLORS.textMuted
                        }}
                      >
                        <span style={{ minWidth: 0 }}>
                          {(ex.mode || "muscu") === "cardio" ? "🏃 " : ""}
                          {ex.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "IBM Plex Mono",
                            color: COLORS.text,
                            flexShrink: 0,
                            fontSize: 12
                          }}
                        >
                          {resumeExercice(ex)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    marginTop: 8,
                    fontSize: 12,
                    color: COLORS.textFaint,
                    flexWrap: "wrap"
                  }}
                >
                  {s.durationMin && <span>{s.durationMin} min</span>}
                  {s.rpe && <span>RPE {s.rpe}/10</span>}
                  {s.deload && <span style={{ color: COLORS.gold }}>déload</span>}
                  {(s.pains || []).length > 0 && (
                    <span style={{ color: COLORS.warn }}>
                      ⚠ {s.pains.map((pn) => `${pn.zone} ${num(pn.level)}/10`).join(", ")}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modaleRoutine}
        onClose={() => setModaleRoutine(false)}
        title={routineEditee?.id ? "Modifier" : "Nouvelle séance type"}
      >
        {routineEditee && (
          <div>
            <Field label="Nom">
              <TextInput
                placeholder="Haut du corps, Circuit cardio..."
                value={routineEditee.name}
                onChange={(e) => setRoutineEditee({ ...routineEditee, name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <TextInput
                placeholder="Pecs / Dos..."
                value={routineEditee.description}
                onChange={(e) => setRoutineEditee({ ...routineEditee, description: e.target.value })}
              />
            </Field>
            <Field label="Couleur">
              <div style={{ display: "flex", gap: 8 }}>
                {ROUTINE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setRoutineEditee({ ...routineEditee, color: c })}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: c,
                      border: routineEditee.color === c ? `2px solid ${COLORS.text}` : "2px solid transparent",
                      cursor: "pointer"
                    }}
                  />
                ))}
              </div>
            </Field>
            <Field label={TEXTES_DEBUTANT.exercicesRoutine}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(routineEditee.exercises || []).length === 0 && (
                  <p style={{ ...styleNoteTechnique, marginTop: 0 }}>{TEXTES_DEBUTANT.routineSansExercice}</p>
                )}
                {(routineEditee.exercises || []).map((ex, k) => (
                  <div
                    key={ex.id || k}
                    style={{
                      background: COLORS.bgAlt,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      padding: 8
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "IBM Plex Mono", fontSize: 11, color: COLORS.textFaint, width: 16 }}>
                        {k + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: COLORS.text, minWidth: 0 }}>
                        {ex.name}
                      </span>
                      {k > 0 && (
                        <button
                          aria-label={TEXTES_DEBUTANT.monter}
                          onClick={() => monterExerciceProgramme(k)}
                          style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer", fontSize: 14 }}
                        >
                          ↑
                        </button>
                      )}
                      <button
                        aria-label={TEXTES_DEBUTANT.retirer}
                        onClick={() => retirerExerciceProgramme(k)}
                        style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer", display: "flex" }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                    {(ex.mode || "muscu") !== "cardio" && (
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 6, paddingLeft: 22 }}>
                        <input
                          type="number"
                          inputMode="numeric"
                          aria-label="Séries"
                          value={ex.sets ?? ""}
                          onChange={(e) => modifierExerciceProgramme(k, { sets: e.target.value })}
                          style={{ ...champCompact, width: 48, textAlign: "center" }}
                        />
                        <span style={{ fontSize: 12, color: COLORS.textMuted }}>{TEXTES_DEBUTANT.seriesReps}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          aria-label={(ex.repUnit || "reps") === "sec" ? "Secondes" : "Répétitions"}
                          value={ex.reps ?? ""}
                          onChange={(e) => modifierExerciceProgramme(k, { reps: e.target.value })}
                          style={{ ...champCompact, width: 48, textAlign: "center" }}
                        />
                        <span style={{ fontSize: 12, color: COLORS.textMuted, flex: 1 }}>
                          {(ex.repUnit || "reps") === "sec" ? "s" : "reps"}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ ...styleEtiquette, marginBottom: 0 }}>{TEXTES_SERIES.repos}</span>
                          <ChoixRepos ex={ex} onChange={(c) => modifierExerciceProgramme(k, c)} largeur={124} />
                        </span>
                      </div>
                    )}
                    <input
                      aria-label={TEXTES_DEBUTANT.consigne}
                      placeholder={TEXTES_DEBUTANT.exempleConsigne}
                      maxLength={140}
                      value={ex.consigne ?? ""}
                      onChange={(e) => modifierExerciceProgramme(k, { consigne: e.target.value })}
                      style={{ ...champCompact, marginTop: 6, marginLeft: 22, width: "calc(100% - 22px)" }}
                    />
                  </div>
                ))}
                <button onClick={() => ouvrirBibliotheque("routine")} style={styleBoutonPointille}>
                  <Plus size={14} /> {TEXTES_DEBUTANT.ajouterExercice}
                </button>
              </div>
            </Field>
            <Btn onClick={enregistrerRoutine} style={{ width: "100%", marginTop: 8 }}>
              Enregistrer
            </Btn>
            {routineEditee.id && (
              <button
                onClick={supprimerRoutine}
                style={{
                  width: "100%",
                  marginTop: 10,
                  background: "none",
                  border: "none",
                  color: COLORS.bad,
                  fontSize: 12.5,
                  cursor: "pointer",
                  padding: 8
                }}
              >
                {TEXTES_DEBUTANT.supprimerRoutine}
              </button>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={modaleSeance}
        onClose={fermerSeance}
        title={routinesApi.items.find((r) => r.id === seanceEditee?.routineId)?.name || "Séance"}
      >
        {seanceEditee && (
          <div>
            <Field label="Exercices">
              {afficherGuide(sessionsApi.items.length) && (
                <div data-guide-seance style={styleGuide}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.gold }}>{TEXTES_GUIDE.titre}</div>
                  <ol style={styleEtapes}>
                    {TEXTES_GUIDE.etapes.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ol>
                </div>
              )}
              <p style={{ fontSize: 11.5, color: COLORS.textFaint, lineHeight: 1.45, margin: "0 0 8px" }}>
                {TEXTES_GUIDE.rpe}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {seanceEditee.exercises.map((ex, i) => {
                  const mode = ex.mode || "muscu";
                  const champsCardio =
                    mode === "cardio" ? (ex.fields?.length ? ex.fields : DEFAULT_CARDIO_FIELDS) : [];
                  const sug = ex.suggested;
                  const series = aDesSeries(ex) ? seriesDe(ex) : [];
                  const precedent = aDesSeries(ex) ? derniereFois(sessionsApi.items, ex.name, seanceEditee) : null;
                  const seriesPrecedentes = precedent ? seriesDe(precedent.exercice) : [];
                  const resumePrecedent = precedent ? resumeDerniereFois(precedent.exercice) : "";
                  const avecCharge = mode !== "pdc" && mode !== "warmup";
                  // Mode simple : type d'exercice et technique restent replies
                  // tant que le client ne s'en sert pas. Ouverts d'office en
                  // mode Force ou quand une technique est deja posee.
                  const optionsForcees = mode === "powerlifting" || !!ex.technique;
                  const optionsVisibles = optionsForcees || optionsOuvertes.has(ex.id);
                  const colonnes = avecCharge ? "20px 1fr 1fr 0.8fr 40px" : "20px 1fr 0.8fr 40px";
                  const termine = exerciceTermine(ex);

                  return (
                    <div
                      key={ex.id}
                      data-exercice={i}
                      data-termine={termine ? "oui" : undefined}
                      style={{
                        background: COLORS.bgAlt,
                        border: `1px solid ${termine ? COLORS.good : COLORS.border}`,
                        borderRadius: 10,
                        padding: 10
                      }}
                    >
                      <div style={styleEnteteExercice}>
                        <span style={{ ...styleEtiquette, marginBottom: 0 }}>
                          {TEXTES_GUIDE.exercice(i + 1, seanceEditee.exercises.length)}
                        </span>
                        {termine && <span data-exercice-termine style={styleTermine}>{TEXTES_GUIDE.termine}</span>}
                      </div>

                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          placeholder="Exercice"
                          value={ex.name}
                          onChange={(e) => modifierExercice(i, { name: e.target.value })}
                          style={{ ...champCompact, flex: 1, minWidth: 0 }}
                        />
                        <button
                          onClick={() => retirerExercice(i)}
                          aria-label={TEXTES_GUIDE.ariaRetirer}
                          style={{
                            background: "none",
                            border: "none",
                            color: COLORS.textFaint,
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "center",
                            flexShrink: 0
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      {String(ex.consigne || "").trim() && (
                        <p data-consigne style={styleConsigne}>
                          {`💬 ${ex.consigne}`}
                        </p>
                      )}
                      {sug && (
                        <div data-charge-proposee style={styleCharge}>
                          <span style={{ color: sug.delta > 0 ? COLORS.good : sug.delta < 0 ? COLORS.warn : COLORS.textMuted }}>
                            {phraseCharge(sug, ex.weight)}
                          </span>
                          {num(sug.from) > 0 && num(sug.from) !== num(ex.weight) && (
                            <button onClick={() => modifierExercice(i, garderCharge(ex))} style={styleBoutonGarder}>
                              {TEXTES_GUIDE.garder(sug.from)}
                            </button>
                          )}
                        </div>
                      )}

                      <div style={{ marginTop: 8 }}>
                        {mode === "cardio" ? (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: `repeat(${champsCardio.length}, 1fr)`,
                              gap: 6
                            }}
                          >
                            {champsCardio.map((f) => (
                              <div key={f}>
                                <div style={styleEtiquette}>{CARDIO_FIELD_DEFS[f].label}</div>
                                <input
                                  type="number"
                                  step="0.5"
                                  placeholder={CARDIO_FIELD_DEFS[f].ph}
                                  value={ex[f] ?? ""}
                                  onChange={(e) =>
                                    modifierExercice(i, {
                                      [f]: e.target.value === "" ? null : parseFloat(e.target.value)
                                    })
                                  }
                                  style={champCompact}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                          {resumePrecedent && (
                            <div
                              data-derniere-fois
                              style={{
                                fontSize: 11.5,
                                color: COLORS.textMuted,
                                marginBottom: 6,
                                lineHeight: 1.4
                              }}
                            >
                              {`${TEXTES_SERIES.derniereFois} (${fmtDateShort(precedent.date)}) : ${resumePrecedent}`}
                            </div>
                          )}
                          {avecCharge && (
                            <OutilsBarre
                              charge={series.reduce((m, s) => Math.max(m, Number(String(s.weight || "").replace(",", ".")) || 0), 0) || ex.weight}
                            />
                          )}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: colonnes,
                              gap: 6,
                              alignItems: "end"
                            }}
                          >
                            <div style={styleEtiquette}>{TEXTES_SERIES.colonneNumero}</div>
                            {avecCharge && <div style={styleEtiquette}>Charge (kg)</div>}
                            {/* L'unite (repetitions ou secondes) se change dans « Options » :
                                l'etiquette-bouton se touchait par erreur (24 octobre 2026). */}
                            <div style={styleEtiquette}>
                              {(ex.repUnit || "reps") === "sec" ? TEXTES_GUIDE.colonneSecondes : TEXTES_GUIDE.colonneReps}
                            </div>
                            <div style={styleEtiquette}>RPE</div>
                            <div style={{ ...styleEtiquette, textAlign: "center" }}>{TEXTES_SERIES.colonneFait}</div>

                            {series.map((serie, k) => {
                              const avant = seriesPrecedentes[k] || {};
                              return [
                                <div
                                  key={`n${k}`}
                                  style={{
                                    fontFamily: "IBM Plex Mono",
                                    fontSize: 12,
                                    color: serie.fait ? COLORS.good : COLORS.textFaint,
                                    alignSelf: "center"
                                  }}
                                >
                                  {k + 1}
                                </div>,
                                avecCharge && (
                                  <input
                                    key={`w${k}`}
                                    aria-label="Charge (kg)"
                                    type="number"
                                    step="0.5"
                                    inputMode="decimal"
                                    placeholder={avant.weight ? String(avant.weight) : ""}
                                    value={serie.weight ?? ""}
                                    onChange={(e) => modifierSerie(i, k, { weight: e.target.value })}
                                    style={serie.fait ? champFait : champCompact}
                                  />
                                ),
                                <input
                                  key={`r${k}`}
                                  type="number"
                                  inputMode="numeric"
                                  placeholder={avant.reps ? String(avant.reps) : ""}
                                  value={serie.reps ?? ""}
                                  onChange={(e) => modifierSerie(i, k, { reps: e.target.value })}
                                  style={serie.fait ? champFait : champCompact}
                                />,
                                <input
                                  key={`p${k}`}
                                  {...CHAMP_RPE}
                                  inputMode="decimal"
                                  value={serie.rpe ?? ""}
                                  onChange={(e) => modifierSerie(i, k, { rpe: e.target.value })}
                                  style={serie.fait ? champFait : champCompact}
                                />,
                                <button
                                  key={`f${k}`}
                                  aria-label={TEXTES_SERIES.ariaFait}
                                  aria-pressed={!!serie.fait}
                                  onClick={() => cocherSerie(i, k)}
                                  style={{
                                    height: 34,
                                    borderRadius: 9,
                                    border: `1px solid ${serie.fait ? COLORS.good : COLORS.border}`,
                                    background: serie.fait ? `${COLORS.good}22` : "none",
                                    color: serie.fait ? COLORS.good : COLORS.textFaint,
                                    fontSize: 15,
                                    fontWeight: 700,
                                    cursor: "pointer"
                                  }}
                                >
                                  ✓
                                </button>
                              ];
                            })}
                          </div>
                          <div style={styleLigneBoutonsSeries}>
                            <button onClick={() => ajouterSerie(i)} style={{ ...styleBoutonPointille, flex: "none", padding: "7px 10px" }}>
                              {TEXTES_SERIES.ajouter}
                            </button>
                            {series.length > 1 && (
                              <button
                                onClick={() => retirerSerie(i)}
                                style={{ ...styleBoutonPointille, flex: "none", padding: "7px 10px", color: COLORS.textFaint }}
                              >
                                {TEXTES_SERIES.retirer}
                              </button>
                            )}
                            <div style={{ flex: 1 }} />
                            <span style={{ ...styleEtiquette, marginBottom: 0 }}>{TEXTES_SERIES.repos}</span>
                            <ChoixRepos ex={ex} onChange={(c) => modifierExercice(i, c)} />
                          </div>
                          </>
                        )}
                      </div>

                      {!optionsForcees && (
                        <button onClick={() => basculerOptions(ex.id)} style={styleLienOptions}>
                          {optionsVisibles ? TEXTES_DEBUTANT.masquerOptions : TEXTES_DEBUTANT.options}
                        </button>
                      )}
                      {optionsVisibles && (
                        <div style={{ marginTop: 8 }}>
                          {mode !== "cardio" && (
                            <label style={styleLigneUnite}>
                              <span style={{ ...styleEtiquette, marginBottom: 0 }}>{TEXTES_GUIDE.compterEn}</span>
                              <select
                                aria-label={TEXTES_GUIDE.compterEn}
                                value={(ex.repUnit || "reps") === "sec" ? "sec" : "reps"}
                                onChange={(e) => modifierExercice(i, { repUnit: e.target.value })}
                                style={{ ...champCompact, padding: "8px 4px", flex: 1 }}
                              >
                                <option value="reps">{TEXTES_GUIDE.enReps}</option>
                                <option value="sec">{TEXTES_GUIDE.enSecondes}</option>
                              </select>
                            </label>
                          )}
                          <select
                            value={mode}
                            onChange={(e) => modifierExercice(i, { mode: e.target.value })}
                            style={{ ...champCompact, padding: "8px 4px", width: "100%" }}
                          >
                            <option value="muscu">Muscu</option>
                            <option value="pdc">PDC</option>
                            <option value="cardio">Cardio</option>
                            <option value="warmup">Warm-up</option>
                            {/* Force proposee a tous (coach, 3 octobre 2026) : elle
                                n'apparaissait qu'avec l'objectif « performance ». */}
                            <option value="powerlifting">Force</option>
                          </select>
                          {mode === "powerlifting" && (
                            <div style={{ marginTop: 8 }}>
                              <div style={styleEtiquette}>Type de série</div>
                              <select
                                value={ex.setType || ""}
                                onChange={(e) => modifierExercice(i, { setType: e.target.value || undefined })}
                                style={{ ...champCompact, padding: "8px 4px", width: "100%" }}
                              >
                                {CHOIX_TYPE_SERIE.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {/* Rebranche le 22 octobre 2026 (index.html, PowerliftingFields) :
                              les maxis de « Force athletique » servent de nouveau a
                              calculer la charge. Sans restriction dans l'app coach. */}
                          {mode === "powerlifting" && (
                            <div style={{ marginTop: 8 }}>
                              <CalculCharge
                                ex={ex}
                                maxis={maxisForce}
                                onModifier={(correctif) => modifierExercice(i, correctif)}
                                champ={champCompact}
                                etiquette={styleEtiquette}
                              />
                            </div>
                          )}
                      {/* TEXTE-NOUVEAU
                          Superset et dégressive n'existaient nulle part dans
                          l'application : ils ne pouvaient s'écrire que dans les
                          notes libres de la séance, donc rien n'en remontait au
                          coach ni d'une semaine sur l'autre. Ces libellés sont
                          nouveaux par construction, aucun n'a d'équivalent dans
                          index.html.
                      */}
                      {mode !== "cardio" && (
                        <div style={{ marginTop: 8 }}>
                          <div style={styleEtiquette}>Technique</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            <select
                              value={ex.technique || ""}
                              onChange={(e) => changerTechnique(i, e.target.value)}
                              style={{ ...champCompact, padding: "8px 4px", flex: 1, minWidth: 130 }}
                            >
                              <option value="">Série classique</option>
                              {FAMILLES_TECHNIQUE.map((f) => (
                                <optgroup key={f.id} label={f.label}>
                                  {TECHNIQUES_SERIE.filter((t) => t.famille === f.id).map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>

                            {(techniqueParId(ex.technique)?.params || []).map((r) =>
                              r.type === "choix" ? (
                                <select
                                  key={r.cle}
                                  aria-label={r.label}
                                  value={ex.techniqueParams?.[r.cle] ?? r.defaut}
                                  onChange={(e) => modifierExercice(i, { techniqueParams: { ...ex.techniqueParams, [r.cle]: e.target.value } })}
                                  style={{ ...champCompact, padding: "8px 4px", width: 120, flexShrink: 0 }}
                                >
                                  {r.options.map(([v, l]) => (
                                    <option key={v} value={v}>
                                      {l}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <label key={r.cle} style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                                  <span style={{ ...styleEtiquette, marginBottom: 2 }}>{r.label}</span>
                                  <input
                                    type={r.type === "texte" ? "text" : "number"}
                                    data-param-technique={r.cle}
                                    min={r.min}
                                    max={r.max}
                                    step={r.pas || 1}
                                    placeholder={String(r.defaut)}
                                    value={ex.techniqueParams?.[r.cle] ?? ""}
                                    onChange={(e) => modifierExercice(i, { techniqueParams: { ...ex.techniqueParams, [r.cle]: e.target.value } })}
                                    style={{ ...champCompact, width: r.type === "texte" ? 84 : 70, textAlign: "center" }}
                                  />
                                </label>
                              )
                            )}

                            {["superset", "triset", "circuit"].includes(ex.technique) && (
                              <select
                                aria-label="Groupe de superset"
                                value={ex.supersetGroupe || GROUPES_SUPERSET[0]}
                                onChange={(e) => modifierExercice(i, { supersetGroupe: e.target.value })}
                                style={{ ...champCompact, padding: "8px 4px", width: 96, flexShrink: 0 }}
                              >
                                {GROUPES_SUPERSET.map((g) => (
                                  <option key={g} value={g}>
                                    Groupe {g}
                                  </option>
                                ))}
                              </select>
                            )}

                            {ex.technique === "degressive" && (
                              <>
                                <input
                                  type="number"
                                  min="1"
                                  max="6"
                                  aria-label="Nombre de baisses"
                                  placeholder="2"
                                  value={ex.degressivePaliers ?? ""}
                                  onChange={(e) => modifierExercice(i, { degressivePaliers: e.target.value })}
                                  style={{ ...champCompact, width: 62, flexShrink: 0, textAlign: "center" }}
                                />
                                <input
                                  type="number"
                                  min="5"
                                  max="90"
                                  step="5"
                                  aria-label="Baisse de charge en pourcentage"
                                  placeholder="20"
                                  value={ex.degressiveBaissePct ?? ""}
                                  onChange={(e) => modifierExercice(i, { degressiveBaissePct: e.target.value })}
                                  style={{ ...champCompact, width: 70, flexShrink: 0, textAlign: "center" }}
                                />
                                <span style={{ fontSize: 11, color: COLORS.textFaint, flexShrink: 0 }}>
                                  baisses de %
                                </span>
                              </>
                            )}
                          </div>

                          {["superset", "triset", "circuit"].includes(ex.technique) && (
                            <p style={styleNoteTechnique}>
                              Enchaîné sans repos avec les autres exercices marqués groupe{" "}
                              {ex.supersetGroupe || GROUPES_SUPERSET[0]}.
                            </p>
                          )}

                          {ex.technique === "top-set" && chargeBackoff(ex.weight, ex.techniqueParams?.baissePct) && (
                            <p style={styleNoteTechnique}>
                              Back-off : {ex.techniqueParams?.backoff || "?"} séries à{" "}
                              {chargeBackoff(ex.weight, ex.techniqueParams?.baissePct)} kg.
                            </p>
                          )}

                          {techniqueParId(ex.technique) && (
                            <details data-preuve-technique={ex.technique} style={{ marginTop: 4 }}>
                              <summary style={{ ...styleNoteTechnique, cursor: "pointer", margin: 0 }}>
                                {techniqueParId(ex.technique).description}
                              </summary>
                              <p style={styleNoteTechnique}>Preuves : {techniqueParId(ex.technique).preuve}</p>
                            </details>
                          )}

                          {ex.technique === "degressive" &&
                            (paliersDegressifs(ex.weight, ex.degressivePaliers, ex.degressiveBaissePct).length ? (
                              <p style={styleNoteTechnique}>
                                Après la série :{" "}
                                {paliersDegressifs(ex.weight, ex.degressivePaliers, ex.degressiveBaissePct)
                                  .map((kg) => kg + " kg")
                                  .join(" puis ")}
                                , sans repos.
                              </p>
                            ) : (
                              <p style={styleNoteTechnique}>
                                Saisis la charge de départ pour voir les charges de chaque baisse.
                              </p>
                            ))}
                        </div>
                      )}
                      {/* FIN-TEXTE-NOUVEAU */}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={() =>
                    setSeanceEditee({
                      ...seanceEditee,
                      exercises: [...seanceEditee.exercises, exerciceVide()]
                    })
                  }
                  style={styleBoutonPointille}
                >
                  <Plus size={14} /> Exercice libre
                </button>
                <button onClick={() => ouvrirBibliotheque("seance")} style={styleBoutonPointille}>
                  <Search size={14} /> {TEXTES_DEBUTANT.ajouterExercice}
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                <ZoneDictee
                  type="seance"
                  exercicesPerso={exercicesPerso.items}
                  onResultat={(dictee) => setSeanceEditee((sx) => completerSeance(sx, dictee))}
                />
              </div>
            </Field>

            <div style={{ ...styleEtiquette, fontSize: 11, margin: "6px 0 10px" }}>{TEXTES_DEBUTANT.details}</div>
            <Field label="Date">
              <TextInput
                type="date"
                value={seanceEditee.date}
                onChange={(e) => setSeanceEditee({ ...seanceEditee, date: e.target.value })}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Durée (min)">
                <NumberInput
                  placeholder={seanceEditee.debutLe ? TEXTES_GUIDE.dureeAuto(dureeAuto(seanceEditee.debutLe)) : undefined}
                  value={seanceEditee.durationMin}
                  onChange={(e) => setSeanceEditee({ ...seanceEditee, durationMin: e.target.value })}
                />
              </Field>
              <Field label="RPE (1-10)">
                <NumberInput
                  {...CHAMP_RPE}
                  value={seanceEditee.rpe}
                  onChange={(e) => setSeanceEditee({ ...seanceEditee, rpe: e.target.value })}
                />
              </Field>
            </div>

            <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 11, marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: (seanceEditee.pains || []).length ? 9 : 0
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: COLORS.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  }}
                >
                  Douleurs ressenties
                </span>
                <button
                  onClick={() =>
                    setSeanceEditee({
                      ...seanceEditee,
                      pains: [...(seanceEditee.pains || []), { id: uid(), zone: PAIN_ZONES[0], level: 3, note: "" }]
                    })
                  }
                  style={{
                    background: "none",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    padding: "4px 10px",
                    color: COLORS.gold,
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  + ajouter
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(seanceEditee.pains || []).map((pn, pi) => (
                  <div
                    key={pn.id}
                    style={{ display: "grid", gridTemplateColumns: "1fr 74px 26px", gap: 6, alignItems: "center" }}
                  >
                    <select
                      value={pn.zone}
                      onChange={(e) =>
                        setSeanceEditee({
                          ...seanceEditee,
                          pains: seanceEditee.pains.map((x, k) =>
                            k === pi ? { ...x, zone: e.target.value } : x
                          )
                        })
                      }
                      style={{ ...champCompact, padding: "8px 4px" }}
                    >
                      {PAIN_ZONES.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      placeholder="/10"
                      value={pn.level}
                      onChange={(e) =>
                        setSeanceEditee({
                          ...seanceEditee,
                          pains: seanceEditee.pains.map((x, k) =>
                            k === pi ? { ...x, level: e.target.value } : x
                          )
                        })
                      }
                      style={{ ...champCompact, textAlign: "center" }}
                    />
                    <button
                      onClick={() =>
                        setSeanceEditee({
                          ...seanceEditee,
                          pains: seanceEditee.pains.filter((_, k) => k !== pi)
                        })
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: COLORS.textFaint,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "center"
                      }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {!(seanceEditee.pains || []).length && (
                <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "6px 0 0" }}>
                  Aucune douleur signalée. Ajoute une zone si quelque chose a gêné pendant la séance.
                </p>
              )}
            </div>

            {plOn && (
              <button
                onClick={() => setSeanceEditee({ ...seanceEditee, deload: !seanceEditee.deload })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  background: seanceEditee.deload ? `${COLORS.gold}14` : "none",
                  border: `1px solid ${seanceEditee.deload ? COLORS.gold : COLORS.border}`,
                  borderRadius: 9,
                  padding: "9px 11px",
                  color: seanceEditee.deload ? COLORS.gold : COLORS.textMuted,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 12
                }}
              >
                <span style={{ fontFamily: "IBM Plex Mono" }}>{seanceEditee.deload ? "■" : "□"}</span>
                Semaine de déload
              </button>
            )}

            <Field label="Notes">
              <TextArea
                value={seanceEditee.notes}
                onChange={(e) => setSeanceEditee({ ...seanceEditee, notes: e.target.value })}
              />
            </Field>

            {/* Barre collee en bas (24 octobre 2026) : l'avancement et
                « Enregistrer » restent a portee de pouce, sans tout faire defiler. */}
            <div data-barre-enregistrer style={styleBarreEnregistrer}>
              {(() => {
                const { faites, total } = progressionSeance(seanceEditee.exercises);
                if (!total) return null;
                return (
                  <>
                    <div data-progression-seance style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 5 }}>
                      {TEXTES_GUIDE.progression(faites, total)}
                    </div>
                    <div style={styleProgression}>
                      <div style={{ width: `${Math.round((faites / total) * 100)}%`, height: "100%", background: faites === total ? COLORS.good : COLORS.gold }} />
                    </div>
                  </>
                );
              })()}
              <Btn onClick={enregistrerSeance} style={{ width: "100%" }}>
                Enregistrer la séance
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {modaleSeance && minuteur && (
        <MinuteurRepos
          chrono={!!minuteur.chrono}
          debut={minuteur.debut}
          fin={minuteur.fin}
          duree={minuteur.duree}
          onAjuster={ajusterMinuteur}
          onFermer={() => setMinuteur(null)}
        />
      )}

      <Modal
        open={bibliothequeOuverte}
        onClose={() => setBibliothequeOuverte(false)}
        title="Bibliothèque d'exercices"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* TEXTE-NOUVEAU
              Ajout d'un exercice absent de la bibliotheque directement depuis
              celle-ci, demande du coach du 2 octobre 2026 ; avant, il fallait
              passer par « Exercice libre » puis enregistrer la seance. Aucun
              de ces libelles n'existe dans index.html. */}
          <form
            data-exercice-tape=""
            onSubmit={(e) => {
              e.preventDefault();
              ajouterExerciceTape();
            }}
            style={{ border: `1px dashed ${COLORS.border}`, borderRadius: 10, padding: 11 }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>
              Ton exercice n'est pas dans la liste ?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <TextInput
                aria-label="Nom de ton exercice"
                placeholder={TEXTES_DEBUTANT.chercher}
                value={exerciceLibre}
                maxLength={80}
                onChange={(e) => setExerciceLibre(e.target.value)}
                style={{ flex: 1, minWidth: 0 }}
              />
              <Btn icon={Plus} disabled={!exerciceLibre.trim()} style={{ flexShrink: 0 }}>
                Ajouter
              </Btn>
            </div>
            <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "6px 0 0", lineHeight: 1.45 }}>
              Il s'ajoute à ta séance et reste dans « Mes exercices » pour la prochaine fois.
            </p>
          </form>
          {/* FIN-TEXTE-NOUVEAU */}
          {exerciceLibre.trim() && !filtrerBibliotheque(groupesBibliotheque, exerciceLibre).length && (
            <p style={{ ...styleNoteTechnique, margin: 0 }}>{TEXTES_DEBUTANT.rienTrouve}</p>
          )}
          {filtrerBibliotheque(groupesBibliotheque, exerciceLibre).map((groupe) => (
            <div key={groupe.group}>
              <div
                style={{
                  fontFamily: "Poppins",
                  fontSize: 12,
                  fontWeight: 700,
                  color: COLORS.gold,
                  textTransform: "uppercase",
                  letterSpacing: 0.6
                }}
              >
                {groupe.group}
              </div>
              {groupe.note && (
                <p style={{ fontSize: 10, color: COLORS.textFaint, margin: "3px 0 8px" }}>{groupe.note}</p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {groupe.items.map((item) => {
                  const detail =
                    item.mode === "cardio"
                      ? (item.fields || []).map((f) => CARDIO_FIELD_DEFS[f].label).join(" · ")
                      : // Exercice perso sans repetitions connues : pas de « 3× » orphelin.
                        item.defaults?.reps
                        ? `${item.defaults?.sets || 3}×${item.defaults.reps}${item.defaults?.repUnit === "sec" ? " s" : ""}`
                        : "";
                  const video = videoExercice(item.name);

                  const choisir = (
                    <button
                      onClick={() => ajouterDeLaBibliotheque(item)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        background: "none",
                        border: "none",
                        borderRadius: 8,
                        padding: "9px 11px",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%"
                      }}
                    >
                      <span style={{ fontSize: 13, color: COLORS.text }}>{item.name}</span>
                      <span
                        style={{
                          fontSize: 10,
                          color: COLORS.textFaint,
                          fontFamily: "IBM Plex Mono",
                          flexShrink: 0
                        }}
                      >
                        {detail}
                      </span>
                    </button>
                  );

                  return (
                    <div
                      key={item.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        background: COLORS.bgAlt,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 8,
                        paddingRight: groupe.custom ? 6 : video ? 4 : 0
                      }}
                    >
                      {choisir}
                      {groupe.custom ? (
                        <button
                          onClick={() => exercicesPerso.oublier(item.name)}
                          aria-label="Oublier cet exercice"
                          style={{
                            background: "none",
                            border: "none",
                            color: COLORS.textFaint,
                            cursor: "pointer",
                            padding: 6,
                            display: "flex",
                            flexShrink: 0
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : video ? (
                        <button
                          onClick={() => window.open(video, "_blank", "noopener")}
                          aria-label="Voir la démo"
                          style={{
                            background: "none",
                            border: "none",
                            color: COLORS.gold,
                            cursor: "pointer",
                            padding: 6,
                            display: "flex",
                            flexShrink: 0,
                            fontSize: 13
                          }}
                        >
                          ▶
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
