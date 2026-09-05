/**
 * Semaine difficile : bascule en format maintien.
 *
 * Portage de SemaineDifficileCard (index.html 4172-4221). Reserve au
 * coaching en ligne.
 *
 * C'est la fonctionnalite qui evite le decrochage. Un client qui a mal
 * dormi, ou qui enchaine une semaine chargee, saute sa semaine — puis la
 * suivante, parce qu'il a « perdu le fil ». Lui proposer 15 a 20 minutes
 * qui COMPTENT COMME UN CRENEAU TENU casse cet enchainement.
 *
 * Deux basculements d'affilee previennent le coach, une seule fois. Ce
 * n'est pas un signalement de mauvais eleve : c'est le signal qu'il faut
 * revoir le creneau avec le client.
 */

import { useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { addDays, todayISO } from "../lib/dates.js";
import { getWeekKey, normaliserCreneaux, slotDayIndex, slotDayLabel } from "../lib/semaine.js";
import { heureCourante } from "../lib/creneaux.js";
import {
  RAISONS_SEMAINE_DIFFICILE,
  estSemaineDifficile,
  seanceMaintien,
  semaineDifficileDe
} from "../lib/plan-semaine.js";
import { envoyerEvenement } from "../lib/synchro-coach.js";
import { Btn, Card, Field, SectionTitle, SelectInput } from "../ui/primitives.jsx";
import { Plus } from "../ui/icones.jsx";

const DUREE_MESSAGE = 2600;

/** Duree et intensite d'une seance maintien, identiques a l'application actuelle. */
const DUREE_MAINTIEN_MIN = 18;
const RPE_MAINTIEN = 5;

export function SemaineDifficile({
  profile,
  sessionsApi,
  semainesDifficiles,
  onDefinirSemaineDifficile,
  routines,
  planSemaine
}) {
  const aujourdhui = todayISO();
  const cleSemaine = getWeekKey(aujourdhui);
  const entree = semaineDifficileDe(semainesDifficiles, cleSemaine);
  const active = !!(entree && entree.active);

  const [motif, setMotif] = useState((entree && entree.reason) || "sommeil");
  const [enregistre, setEnregistre] = useState(false);

  const maintien = useMemo(
    () =>
      seanceMaintien(routines, sessionsApi.items, planSemaine, aujourdhui, (entree && entree.reason) || motif),
    [routines, sessionsApi.items, planSemaine, aujourdhui, entree, motif]
  );

  const deuxDAffilee = active && estSemaineDifficile(semainesDifficiles, addDays(cleSemaine, -7));
  const dejaFaitAujourdhui = (sessionsApi.items || []).some((s) => s.date === aujourdhui && s.maintenance);

  const activer = async () => {
    // Le coach n'est prevenu qu'une fois par semaine : rebasculer le
    // bouton ne doit pas lui envoyer trois notifications.
    const dejaPrevenu = !!(entree && entree.notified);

    await onDefinirSemaineDifficile(cleSemaine, {
      active: true,
      reason: motif,
      at: new Date().toISOString(),
      notified: true
    });

    if (!dejaPrevenu) {
      envoyerEvenement(profile, {
        type: deuxDAffilee ? "alerte_semaines_difficiles" : "semaine_difficile",
        weekKey: cleSemaine,
        motif: (RAISONS_SEMAINE_DIFFICILE.find((r) => r.id === motif) || {}).label || motif,
        message: "Semaine basculée en format maintien 15-20 min."
      });
    }
  };

  const desactiver = () =>
    onDefinirSemaineDifficile(cleSemaine, {
      active: false,
      reason: motif,
      at: new Date().toISOString(),
      notified: !!(entree && entree.notified)
    });

  const pointerMaintien = async () => {
    const creneau =
      normaliserCreneaux(profile).find((s) => addDays(cleSemaine, slotDayIndex(s.day)) === aujourdhui) || null;

    await sessionsApi.add({
      date: aujourdhui,
      slotId: creneau ? creneau.id : null,
      startTime: heureCourante(),
      place: creneau ? creneau.place || "" : "",
      source: "maintien",
      // C'est ce drapeau qui fait compter la seance comme un creneau tenu,
      // et qui l'empeche de servir de modele a la semaine suivante.
      maintenance: true,
      routineId: null,
      durationMin: DUREE_MAINTIEN_MIN,
      rpe: RPE_MAINTIEN,
      notes: "Séance maintien (semaine difficile)",
      pains: [],
      exercises: []
    });

    envoyerEvenement(profile, {
      type: "pointage",
      date: aujourdhui,
      creneau: creneau
        ? slotDayLabel(creneau.day) + (creneau.time ? " " + creneau.time : "")
        : "hors créneau",
      lieu: creneau ? creneau.place || "" : "",
      heureReelle: heureCourante(),
      maintien: true
    });

    setEnregistre(true);
    window.setTimeout(() => setEnregistre(false), DUREE_MESSAGE);
  };

  if (!active) {
    return (
      <Card>
        <SectionTitle>Semaine difficile ?</SectionTitle>
        <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.55, margin: "10px 0 14px" }}>
          Nuit courte, semaine chargée, enfant malade : bascule ton programme en format maintien de 15 à 20 min
          plutôt que de sauter la semaine. Une séance maintien compte comme un créneau tenu.
        </p>
        <Field label="Motif">
          <SelectInput
            options={RAISONS_SEMAINE_DIFFICILE}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
          />
        </Field>
        <Btn variant="ghost" style={{ width: "100%" }} onClick={activer}>
          Passer en mode maintien cette semaine
        </Btn>
      </Card>
    );
  }

  return (
    <Card style={{ borderColor: `${COLORS.gold}55` }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          gap: 10,
          flexWrap: "wrap"
        }}
      >
        <SectionTitle>Mode maintien activé</SectionTitle>
        <span style={{ fontSize: 11.5, color: COLORS.textFaint }}>
          {(RAISONS_SEMAINE_DIFFICILE.find((r) => r.id === (entree.reason || motif)) || {}).label || ""}
        </span>
      </div>

      <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>
        {maintien.title}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {maintien.items.map((it, i) => (
          <div
            key={i}
            style={{
              background: COLORS.bgAlt,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: "9px 12px"
            }}
          >
            <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{it.name}</div>
            <div
              style={{
                fontSize: 11.5,
                color: COLORS.textFaint,
                fontFamily: "IBM Plex Mono",
                marginTop: 2
              }}
            >
              {it.detail}
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11.5, color: COLORS.textMuted, lineHeight: 1.5, margin: "10px 0 14px" }}>
        {maintien.note}
      </p>

      {deuxDAffilee && (
        <p style={{ fontSize: 12, color: COLORS.warn, lineHeight: 1.5, margin: "0 0 12px" }}>
          Deuxième semaine maintien d'affilée : ton coach est prévenu. Ce n'est pas un reproche, c'est le signal
          qu'il faut revoir le créneau avec toi.
        </p>
      )}

      <Btn icon={Plus} style={{ width: "100%" }} onClick={pointerMaintien} disabled={dejaFaitAujourdhui}>
        {dejaFaitAujourdhui ? "Séance maintien déjà pointée aujourd'hui" : "Séance maintien faite"}
      </Btn>

      {enregistre && (
        <p style={{ fontSize: 12, color: COLORS.good, textAlign: "center", margin: "10px 0 0" }}>
          Séance enregistrée.
        </p>
      )}

      <Btn variant="ghost" style={{ width: "100%", marginTop: 8 }} onClick={desactiver}>
        Revenir au programme normal
      </Btn>
    </Card>
  );
}
