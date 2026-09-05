/**
 * Ecran Seances (clients suivis via Google Sheets).
 *
 * Portage fidele de SeancesSheetsTab (index.html, ligne 4221).
 *
 * Cet ecran est le plus sensible de tous : c'est par lui que passe le
 * pointage, et un pointage perdu est une seance que le coach ne verra
 * jamais. L'ordre des operations est donc conserve strictement — la seance
 * est d'abord enregistree en local, et seulement ensuite mise en file pour
 * le coach. Si l'envoi echoue, la seance existe quand meme, et la file la
 * reemettra plus tard.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { fmtDateShort, todayISO } from "../lib/dates.js";
import { creneauPourDate, enLigne, getWeekKey, nowHHMM, slotDayLabel } from "../lib/semaine.js";
import { envoyerEvenement } from "../lib/synchro-coach.js";
import { resumeSeance, seancesDeLaSemaine } from "../lib/seances.js";
import { Btn, Card, Field, IconBtn, NumberInput, SectionTitle, TextArea, TextInput } from "../ui/primitives.jsx";
import { Dumbbell, Plus, Trash2 } from "../ui/icones.jsx";

/** Duree d'affichage du message de confirmation, en millisecondes. */
const DUREE_CONFIRMATION = 2600;

export function Seances({ sessionsApi, profile }) {
  const url = profile?.sheetsUrl || "";
  const [date, setDate] = useState(todayISO());
  const [duree, setDuree] = useState("");
  const [rpe, setRpe] = useState("");
  const [heureDebut, setHeureDebut] = useState(nowHHMM());
  const [notes, setNotes] = useState("");
  const [confirme, setConfirme] = useState(false);

  const objectif = profile?.weeklyWorkoutTarget || 0;
  const semaine = seancesDeLaSemaine(sessionsApi.items);
  const dejaPointeeCeJour = semaine.some((x) => x.date === date);

  const enregistrer = async () => {
    const creneau = creneauPourDate(profile, date);

    await sessionsApi.add({
      date,
      routineId: null,
      source: "sheets",
      slotId: creneau ? creneau.id : null,
      startTime: heureDebut,
      place: creneau ? creneau.place || "" : "",
      durationMin: duree === "" ? "" : parseInt(duree),
      rpe: rpe === "" ? "" : parseFloat(rpe),
      notes: notes.trim(),
      pains: [],
      exercises: []
    });

    if (enLigne(profile)) {
      await envoyerEvenement(profile, {
        type: "pointage",
        date,
        creneau: creneau ? slotDayLabel(creneau.day) + (creneau.time ? " " + creneau.time : "") : "hors créneau",
        lieu: creneau ? creneau.place || "" : "",
        heureReelle: heureDebut,
        dureeMin: duree,
        rpe,
        note: notes.trim()
      });
    }

    setDuree("");
    setRpe("");
    setNotes("");
    setConfirme(true);
    window.setTimeout(() => setConfirme(false), DUREE_CONFIRMATION);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <SectionTitle>Ma séance du jour</SectionTitle>
        <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.55, margin: "10px 0 14px" }}>
          Ton programme, tes charges et tes RPE se remplissent dans le Google Sheets préparé par ton coach.
          Ici, tu pointes simplement la séance pour qu'elle compte dans ton bilan hebdomadaire.
        </p>
        {url ? (
          <Btn icon={Dumbbell} style={{ width: "100%" }} onClick={() => window.open(url, "_blank", "noopener")}>
            Ouvrir mon programme
          </Btn>
        ) : (
          <div
            style={{
              background: COLORS.bgAlt,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 13,
              color: COLORS.textMuted,
              lineHeight: 1.5
            }}
          >
            Aucun lien enregistré. Ouvre <strong style={{ color: COLORS.gold }}>Mon profil &amp; réglages</strong> et
            colle le lien Google Sheets que ton coach t'a envoyé.
          </div>
        )}
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SectionTitle>Pointer une séance</SectionTitle>
          {objectif ? (
            <span
              style={{
                fontFamily: "IBM Plex Mono",
                fontSize: 12.5,
                color: semaine.length >= objectif ? COLORS.good : COLORS.textMuted
              }}
            >
              {semaine.length}/{objectif} cette semaine
            </span>
          ) : null}
        </div>

        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Heure de début">
            <TextInput type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} />
          </Field>
          <Field label="Durée (min)">
            <NumberInput value={duree} placeholder="60" onChange={(e) => setDuree(e.target.value)} />
          </Field>
          <Field label="RPE (1-10)">
            <NumberInput step="0.5" min="1" max="10" value={rpe} placeholder="8" onChange={(e) => setRpe(e.target.value)} />
          </Field>
        </div>

        <Field label="Ressenti / note pour le coach">
          <TextArea
            rows={2}
            value={notes}
            placeholder="Ex : jambes lourdes, squat plus facile qu'en semaine 2..."
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        {dejaPointeeCeJour && (
          <p style={{ fontSize: 11.5, color: COLORS.warn, margin: "0 0 10px" }}>
            Une séance est déjà pointée à cette date.
          </p>
        )}

        <Btn icon={Plus} style={{ width: "100%" }} onClick={enregistrer}>
          Séance faite
        </Btn>

        {confirme && (
          <p style={{ fontSize: 12, color: COLORS.good, textAlign: "center", margin: "10px 0 0" }}>
            Séance enregistrée.
          </p>
        )}
      </Card>

      <Card>
        <SectionTitle>Cette semaine</SectionTitle>
        <div style={{ marginTop: 14 }}>
          {semaine.length === 0 ? (
            <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>Aucune séance pointée pour l'instant.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {semaine.map((x) => (
                <div
                  key={x.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: COLORS.bgAlt,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    padding: "10px 12px"
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{fmtDateShort(x.date)}</div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: COLORS.textFaint,
                        fontFamily: "IBM Plex Mono",
                        marginTop: 2
                      }}
                    >
                      {resumeSeance(x)}
                    </div>
                    {x.notes ? (
                      <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 1.45 }}>
                        {x.notes}
                      </div>
                    ) : null}
                  </div>
                  <IconBtn danger onClick={() => sessionsApi.remove(x.id)}>
                    <Trash2 size={15} />
                  </IconBtn>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
