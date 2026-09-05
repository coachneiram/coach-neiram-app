/**
 * Champs du profil client.
 *
 * Portage fidele de ProfileFields (index.html) et CoachingFields.
 *
 * Ces valeurs pilotent tout le reste : les objectifs caloriques, le score
 * du jour, le filtrage des aliments, le bilan hebdomadaire. Un champ mal
 * enregistre ne se voit pas ici — il se voit trois ecrans plus loin, dans
 * un conseil qui ne correspond plus a personne.
 */

import { COLORS } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import { JOURS_SEMAINE, uid } from "../lib/semaine.js";
import { ACTIVITY_LEVELS, GOALS, PERFORMANCE_DIRECTIONS } from "../lib/nutrition.js";
import { ALLERGENS, COACHING_MODES, DIET_TYPES, TRAINING_MODES } from "../lib/catalogues.js";
import { Btn, Field, IconBtn, NumberInput, SelectInput, TextInput } from "../ui/primitives.jsx";
import { Plus, Trash2 } from "../ui/icones.jsx";

/** Types de metier : l'activite professionnelle entre dans la depense. */
const TYPES_METIER = [
  { id: "sedentaire", label: "Sédentaire (bureau, assis)" },
  { id: "actif", label: "Actif (debout, déplacements)" },
  { id: "tres-actif", label: "Très actif (physique, ex. maçon)" }
];

const styleAide = { fontSize: 11, color: COLORS.textFaint, margin: "6px 0 0", lineHeight: 1.45 };

/** Champs propres au coaching en ligne : creneaux et lien de synchro. */
function ChampsCoaching({ value, set }) {
  const enLigne = value.coachingMode === "enligne";
  const creneaux = value.slots || [];

  const majCreneau = (id, modif) =>
    set({ slots: creneaux.map((s) => (s.id === id ? { ...s, ...modif } : s)) });

  // createdAt est pose a la creation : sans lui, un creneau ajoute
  // aujourd'hui serait compte comme manque sur toutes les semaines
  // passees.
  const ajouterCreneau = () =>
    set({ slots: [...creneaux, { id: uid(), day: "mon", time: "18:30", place: "", createdAt: todayISO() }] });

  const supprimerCreneau = (id) => set({ slots: creneaux.filter((s) => s.id !== id) });

  return (
    <>
      <Field label="Type de coaching">
        <SelectInput
          options={COACHING_MODES}
          value={value.coachingMode || "presentiel"}
          onChange={(e) => set({ coachingMode: e.target.value })}
        />
        <p style={styleAide}>
          {enLigne
            ? "Mode en ligne : créneaux, pointage comparé au créneau, bouton semaine difficile et alerte coach activés."
            : "Mode présentiel : l'application fonctionne comme avant."}
        </p>
      </Field>

      {enLigne && (
        <div
          style={{
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 12,
            marginBottom: 14,
            background: COLORS.bgAlt
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 4
            }}
          >
            Mes créneaux d'entraînement
          </div>
          <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "0 0 10px", lineHeight: 1.45 }}>
            Jour, heure et lieu de chaque séance de la semaine. C'est la référence à laquelle ton pointage est
            comparé.
          </p>

          {creneaux.length === 0 && (
            <p style={{ fontSize: 12, color: COLORS.textMuted, margin: "0 0 10px" }}>Aucun créneau pour l'instant.</p>
          )}

          {creneaux.map((s) => (
            <div key={s.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
              <SelectInput
                options={JOURS_SEMAINE.map((d) => ({ id: d.id, label: d.label }))}
                value={s.day}
                onChange={(e) => majCreneau(s.id, { day: e.target.value })}
                style={{ flex: "1 1 96px", minWidth: 0, padding: "9px 8px", fontSize: 13 }}
              />
              <TextInput
                type="time"
                value={s.time || ""}
                onChange={(e) => majCreneau(s.id, { time: e.target.value })}
                style={{ flex: "0 0 104px", padding: "9px 8px", fontSize: 13 }}
              />
              <TextInput
                value={s.place || ""}
                placeholder="Lieu"
                onChange={(e) => majCreneau(s.id, { place: e.target.value })}
                style={{ flex: "1 1 90px", minWidth: 0, padding: "9px 8px", fontSize: 13 }}
              />
              <IconBtn danger onClick={() => supprimerCreneau(s.id)}>
                <Trash2 size={15} />
              </IconBtn>
            </div>
          ))}

          <Btn
            variant="ghost"
            icon={Plus}
            onClick={ajouterCreneau}
            style={{ width: "100%", padding: "9px 12px", fontSize: 13 }}
          >
            Ajouter un créneau
          </Btn>
        </div>
      )}

      {enLigne && (
        <Field label="Lien de synchro coach (fourni par ton coach)">
          <TextInput
            type="url"
            value={value.coachSyncUrl || ""}
            placeholder="https://script.google.com/macros/s/.../exec"
            onChange={(e) => set({ coachSyncUrl: e.target.value.trim() })}
          />
          <p style={styleAide}>
            Envoie tes pointages au tableau de bord du coach et le prévient si deux séances sont manquées. Sans ce
            lien, l'application te propose de le prévenir toi-même.
          </p>
        </Field>
      )}
    </>
  );
}

export function ChampsProfil({ value, onChange }) {
  const set = (modif) => onChange({ ...value, ...modif });

  /** Un champ vide redevient vide, pas zero : « 0 kg » serait un mensonge. */
  const nombre = (transforme) => (e) => (e.target.value ? transforme(e.target.value) : "");

  return (
    <div>
      <Field label="Prénom (optionnel)">
        <TextInput value={value.name || ""} onChange={(e) => set({ name: e.target.value })} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Sexe">
          <SelectInput
            options={[
              { id: "homme", label: "Homme" },
              { id: "femme", label: "Femme" }
            ]}
            value={value.sex || "homme"}
            onChange={(e) => set({ sex: e.target.value })}
          />
        </Field>
        <Field label="Âge">
          <NumberInput value={value.age || ""} onChange={(e) => set({ age: nombre(parseInt)(e) })} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Taille (cm)">
          <NumberInput value={value.heightCm || ""} onChange={(e) => set({ heightCm: nombre(parseInt)(e) })} />
        </Field>
        <Field label="Poids de départ (kg)">
          <NumberInput
            step="0.1"
            value={value.startWeightKg || ""}
            onChange={(e) => set({ startWeightKg: nombre(parseFloat)(e) })}
          />
        </Field>
      </div>

      <Field label="Activité sportive (hors métier)">
        <SelectInput
          options={ACTIVITY_LEVELS}
          value={value.activityLevel || "leger"}
          onChange={(e) => set({ activityLevel: e.target.value })}
        />
      </Field>

      <Field label="Objectif">
        <SelectInput options={GOALS} value={value.goal || "maintien"} onChange={(e) => set({ goal: e.target.value })} />
      </Field>

      {/* TEXTE-NOUVEAU
          Ajoute apres la bascule, donc absent de index.html : la direction
          de l'objectif « performance ». Un pratiquant de force est en
          performance ET en prise ou en seche ; jusqu'ici il devait choisir
          entre les deux. Ce bloc ne s'affiche que sur cet objectif.
      */}
      {value.goal === "performance" && (
        <Field label="Direction">
          <SelectInput
            options={PERFORMANCE_DIRECTIONS}
            value={value.performanceDirection || "maintien"}
            onChange={(e) => set({ performanceDirection: e.target.value })}
          />
          <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "6px 0 0", lineHeight: 1.45 }}>
            En sèche, le déficit reste volontairement doux et les protéines montent : l'objectif est de
            perdre du poids sans perdre de force.
          </p>
        </Field>
      )}
      {/* FIN-TEXTE-NOUVEAU */}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Poids objectif (kg, optionnel)">
          <NumberInput
            step="0.1"
            value={value.targetWeightKg || ""}
            onChange={(e) => set({ targetWeightKg: nombre(parseFloat)(e) })}
          />
        </Field>
        <Field label="Séances / semaine visées">
          <NumberInput
            value={value.weeklyWorkoutTarget || ""}
            onChange={(e) => set({ weeklyWorkoutTarget: nombre(parseInt)(e) })}
          />
        </Field>
      </div>

      <Field label="Où se passent tes séances">
        <SelectInput
          options={TRAINING_MODES}
          value={value.trainingMode || "app"}
          onChange={(e) => set({ trainingMode: e.target.value })}
        />
        <p style={styleAide}>
          {value.trainingMode === "sheets"
            ? "Ton programme et tes charges se remplissent dans le Google Sheets du coach. L'appli ne garde que le pointage des séances, pour le bilan hebdo."
            : "Tu construis et remplis tes séances directement dans l'application."}
        </p>
      </Field>

      {value.trainingMode === "sheets" && (
        <Field label="Lien Google Sheets de mon programme">
          <TextInput
            value={value.sheetsUrl || ""}
            type="url"
            placeholder="https://docs.google.com/spreadsheets/..."
            onChange={(e) => set({ sheetsUrl: e.target.value.trim() })}
          />
        </Field>
      )}

      <ChampsCoaching value={value} set={set} />

      <Field label="Objectif sommeil (h/nuit)">
        <NumberInput
          step="0.5"
          value={value.targetSleepHours || ""}
          onChange={(e) => set({ targetSleepHours: nombre(parseFloat)(e) })}
        />
      </Field>

      <Field label="Type de métier">
        <SelectInput
          options={TYPES_METIER}
          value={value.jobType || "sedentaire"}
          onChange={(e) => set({ jobType: e.target.value })}
        />
      </Field>

      <Field label="Objectif pas / jour">
        <NumberInput
          step="500"
          value={value.targetSteps || ""}
          onChange={(e) => set({ targetSteps: nombre(parseInt)(e) })}
        />
      </Field>

      <Field label="Objectif hydratation (L / jour)">
        <NumberInput
          step="0.25"
          value={value.targetWaterL || ""}
          onChange={(e) => set({ targetWaterL: nombre(parseFloat)(e) })}
        />
      </Field>

      <Field label="Régime alimentaire">
        <SelectInput
          options={DIET_TYPES}
          value={value.dietType || "aucun"}
          onChange={(e) => set({ dietType: e.target.value })}
        />
      </Field>

      <Field label="Allergies / intolérances">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          {ALLERGENS.map((a) => {
            const coche = (value.allergies || []).includes(a.id);
            return (
              <label
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: COLORS.bgAlt,
                  border: `1px solid ${coche ? COLORS.gold : COLORS.border}`,
                  borderRadius: 9,
                  padding: "8px 10px",
                  cursor: "pointer"
                }}
              >
                <input
                  type="checkbox"
                  checked={coche}
                  onChange={(e) => {
                    const actuelles = value.allergies || [];
                    set({
                      allergies: e.target.checked
                        ? [...actuelles, a.id]
                        : actuelles.filter((x) => x !== a.id)
                    });
                  }}
                  style={{ width: 15, height: 15, accentColor: COLORS.gold }}
                />
                <span style={{ fontSize: 12, color: coche ? COLORS.text : COLORS.textMuted }}>{a.label}</span>
              </label>
            );
          })}
        </div>
      </Field>
    </div>
  );
}
