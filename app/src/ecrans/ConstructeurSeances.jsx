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

import { useEffect, useState } from "react";
import { COLORS } from "../tokens.js";
import { fmtDateShort, num } from "../lib/dates.js";
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
  cleExercice,
  exerciceVide,
  fusionnerExercicesPerso,
  preparerSeance,
  resumeExercice,
  videoExercice
} from "../lib/constructeur-seances.js";
import { charger, enregistrer } from "../lib/stockage.js";
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

const styleEtiquette = {
  fontSize: 9,
  color: COLORS.textFaint,
  marginBottom: 3,
  textTransform: "uppercase",
  letterSpacing: 0.4
};

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

export function ConstructeurSeances({ routinesApi, sessionsApi, plOn }) {
  const exercicesPerso = useExercicesPerso();
  const [modaleRoutine, setModaleRoutine] = useState(false);
  const [routineEditee, setRoutineEditee] = useState(null);
  const [modaleSeance, setModaleSeance] = useState(false);
  const [seanceEditee, setSeanceEditee] = useState(null);
  const [bibliothequeOuverte, setBibliothequeOuverte] = useState(false);

  const nouvelleRoutine = () => {
    setRoutineEditee({ id: null, name: "", description: "", color: ROUTINE_COLORS[0] });
    setModaleRoutine(true);
  };

  const enregistrerRoutine = async () => {
    const donnees = { ...routineEditee };
    delete donnees.id;
    if (routineEditee.id) await routinesApi.update(routineEditee.id, donnees);
    else await routinesApi.add(donnees);
    setModaleRoutine(false);
  };

  const demarrerSeance = (routine, dateImposee) => {
    setSeanceEditee(preparerSeance(routine, sessionsApi.items, dateImposee));
    setModaleSeance(true);
  };

  const modifierSeance = (s) => {
    setSeanceEditee({ ...s, exercises: s.exercises?.length ? s.exercises : [exerciceVide()] });
    setModaleSeance(true);
  };

  const enregistrerSeance = async () => {
    // Un exercice sans nom est une ligne que le client n'a pas remplie :
    // l'enregistrer polluerait son historique.
    const donnees = { ...seanceEditee, exercises: seanceEditee.exercises.filter((e) => e.name.trim()) };
    delete donnees.id;
    exercicesPerso.retenir(donnees.exercises);
    if (seanceEditee.id) await sessionsApi.update(seanceEditee.id, donnees);
    else await sessionsApi.add(donnees);
    setModaleSeance(false);
  };

  const modifierExercice = (i, correctif) => {
    const suivants = [...seanceEditee.exercises];
    suivants[i] = { ...suivants[i], ...correctif };
    setSeanceEditee({ ...seanceEditee, exercises: suivants });
  };

  const retirerExercice = (i) => {
    const restants = seanceEditee.exercises.filter((_, k) => k !== i);
    // La seance garde toujours au moins une ligne : un formulaire vide n'a
    // pas d'endroit ou saisir.
    setSeanceEditee({ ...seanceEditee, exercises: restants.length ? restants : [exerciceVide()] });
  };

  const ajouterDeLaBibliotheque = (item) => {
    setSeanceEditee({
      ...seanceEditee,
      exercises: ajouterDepuisBibliotheque(seanceEditee.exercises, item)
    });
    setBibliothequeOuverte(false);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
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
            <Card key={r.id} style={{ padding: 14, cursor: "pointer" }} onClick={() => demarrerSeance(r)}>
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
            <Btn onClick={enregistrerRoutine} style={{ width: "100%", marginTop: 8 }}>
              Enregistrer
            </Btn>
          </div>
        )}
      </Modal>

      <Modal open={modaleSeance} onClose={() => setModaleSeance(false)} title="Séance">
        {seanceEditee && (
          <div>
            <Field label="Date">
              <TextInput
                type="date"
                value={seanceEditee.date}
                onChange={(e) => setSeanceEditee({ ...seanceEditee, date: e.target.value })}
              />
            </Field>

            <Field label="Exercices">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {seanceEditee.exercises.map((ex, i) => {
                  const mode = ex.mode || "muscu";
                  const champsCardio =
                    mode === "cardio" ? (ex.fields?.length ? ex.fields : DEFAULT_CARDIO_FIELDS) : [];
                  const sug = ex.suggested;

                  return (
                    <div
                      key={ex.id}
                      style={{
                        background: COLORS.bgAlt,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 10,
                        padding: 10
                      }}
                    >
                      {sug && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            marginBottom: 8,
                            fontSize: 10.5,
                            color:
                              sug.delta > 0 ? COLORS.good : sug.delta < 0 ? COLORS.warn : COLORS.textFaint,
                            fontFamily: "IBM Plex Mono"
                          }}
                        >
                          <span>
                            {sug.delta > 0 ? "↑ " : sug.delta < 0 ? "↓ " : "= "}
                            {sug.from} → {ex.weight} kg ({sug.reason})
                          </span>
                          <button
                            onClick={() => modifierExercice(i, { weight: String(sug.from), suggested: null })}
                            style={{
                              background: "none",
                              border: "none",
                              color: COLORS.textFaint,
                              fontSize: 10.5,
                              cursor: "pointer",
                              padding: 2,
                              flexShrink: 0
                            }}
                          >
                            Garder {sug.from}
                          </button>
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <input
                          placeholder="Exercice"
                          value={ex.name}
                          onChange={(e) => modifierExercice(i, { name: e.target.value })}
                          style={{ ...champCompact, width: "100%" }}
                        />
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <select
                            value={mode}
                            onChange={(e) => modifierExercice(i, { mode: e.target.value })}
                            style={{ ...champCompact, padding: "8px 4px", flex: 1 }}
                          >
                            <option value="muscu">Muscu</option>
                            <option value="pdc">PDC</option>
                            <option value="cardio">Cardio</option>
                            <option value="warmup">Warm-up</option>
                            {(plOn || mode === "powerlifting") && <option value="powerlifting">Force</option>}
                          </select>
                          <button
                            onClick={() => retirerExercice(i)}
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
                      </div>

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
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                mode === "pdc" || mode === "warmup" ? "1fr 1fr 1fr" : "1fr 1fr 0.8fr 1fr",
                              gap: 6
                            }}
                          >
                            <div>
                              <div style={styleEtiquette}>Séries</div>
                              <input
                                type="number"
                                value={ex.sets ?? ""}
                                onChange={(e) => modifierExercice(i, { sets: e.target.value })}
                                style={champCompact}
                              />
                            </div>
                            <div>
                              {/* L'etiquette est un bouton : certains exercices se comptent
                                  en secondes (gainage), et basculer doit se faire d'un geste. */}
                              <button
                                onClick={() =>
                                  modifierExercice(i, {
                                    repUnit: (ex.repUnit || "reps") === "sec" ? "reps" : "sec"
                                  })
                                }
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  marginBottom: 3,
                                  fontSize: 9,
                                  color: COLORS.gold,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.4,
                                  cursor: "pointer",
                                  borderBottom: `1px dotted ${COLORS.gold}66`,
                                  display: "block"
                                }}
                              >
                                {(ex.repUnit || "reps") === "sec" ? "Secondes ⇄" : "Répétitions ⇄"}
                              </button>
                              <input
                                type="number"
                                value={ex.reps ?? ""}
                                onChange={(e) => modifierExercice(i, { reps: e.target.value })}
                                style={champCompact}
                              />
                            </div>
                            <div>
                              <div style={styleEtiquette}>RPE</div>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={ex.rpe ?? ""}
                                onChange={(e) => modifierExercice(i, { rpe: e.target.value })}
                                style={champCompact}
                              />
                            </div>
                            {mode !== "pdc" && mode !== "warmup" && (
                              <div>
                                <div style={styleEtiquette}>Charge (kg)</div>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={ex.weight ?? ""}
                                  onChange={(e) => modifierExercice(i, { weight: e.target.value })}
                                  style={champCompact}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
                <button onClick={() => setBibliothequeOuverte(true)} style={styleBoutonPointille}>
                  <Search size={14} /> Bibliothèque
                </button>
              </div>
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Durée (min)">
                <NumberInput
                  value={seanceEditee.durationMin}
                  onChange={(e) => setSeanceEditee({ ...seanceEditee, durationMin: e.target.value })}
                />
              </Field>
              <Field label="RPE (1-10)">
                <NumberInput
                  min={1}
                  max={10}
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

            <Btn onClick={enregistrerSeance} style={{ width: "100%", marginTop: 4 }}>
              Enregistrer la séance
            </Btn>
          </div>
        )}
      </Modal>

      <Modal
        open={bibliothequeOuverte}
        onClose={() => setBibliothequeOuverte(false)}
        title="Bibliothèque d'exercices"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {groupesBibliotheque.map((groupe) => (
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
                      : `${item.defaults?.sets || 3}×${item.defaults?.reps || ""}${
                          item.defaults?.repUnit === "sec" ? " s" : ""
                        }`;
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
