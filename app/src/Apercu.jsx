/**
 * Page d'apercu des ecrans migres.
 *
 * Elle n'est PAS l'application : elle sert a comparer cote a cote un ecran
 * porte et son equivalent dans index.html, avec des donnees d'exemple.
 * C'est la seule facon de verifier un portage a l'oeil avant de basculer
 * quoi que ce soit en production.
 *
 * Les donnees affichees ici sont inventees et ne touchent jamais au
 * localStorage du client : aucune API d'ecriture reelle n'est branchee.
 */

import { useState } from "react";
import { COLORS, POLICES } from "./tokens.js";
import { addDays, todayISO } from "./lib/dates.js";
import { Sommeil } from "./ecrans/Sommeil.jsx";
import { Mensurations } from "./ecrans/Mensurations.jsx";
import { Nutrition } from "./ecrans/Nutrition.jsx";
import { Seances } from "./ecrans/Seances.jsx";

const jour = (n) => addDays(todayISO(), -n);

const JOURNAL_EXEMPLE = [
  { id: "j1", date: jour(0), sleepHours: 6.5, sleepQuality: 3, stress: 7, bedTime: "00:15", wakeTime: "06:45", stressNote: "Grosse journée de rendez-vous", sleepNote: "Réveillé deux fois" },
  { id: "j2", date: jour(1), sleepHours: 7, sleepQuality: 4, stress: 5, bedTime: "23:30", wakeTime: "06:30" },
  { id: "j3", date: jour(2), sleepHours: 6, sleepQuality: 2, stress: 8, bedTime: "01:00", wakeTime: "07:00", stressNote: "Nuit trop courte" },
  { id: "j4", date: jour(3), sleepHours: 8, sleepQuality: 5, bedTime: "22:45", wakeTime: "06:45" },
  { id: "j5", date: jour(5), sleepHours: 7.5, sleepQuality: 4, stress: 4 }
];

const MESURES_EXEMPLE = [
  { id: "m1", date: jour(60), poitrine: 101, taille: 86, hanches: 99, brasD: 35, brasG: 34.5, cuisseD: 57, cuisseG: 56.5 },
  { id: "m2", date: jour(30), poitrine: 101.5, taille: 84.5, hanches: 98.5, brasD: 35.5, brasG: 35, cuisseD: 57.5, cuisseG: 57 },
  { id: "m3", date: jour(2), poitrine: 102, taille: 83, hanches: 98, brasD: 36, brasG: 35.5, cuisseD: 58, cuisseG: 57.5 }
];

/** API en lecture seule : les ecritures sont volontairement sans effet. */
function apiFactice(items) {
  const sansEffet = async () => {};
  return { items, add: sansEffet, update: sansEffet, remove: sansEffet };
}

const CORPS_FACTICE = { getForDate: () => ({ weightKg: 78.4 }), upsert: async () => {} };

// Journal corporel et calories loguees : de quoi faire apparaitre le
// calibrage, qui ne s'affiche qu'avec assez d'historique.
const CORPS_EXEMPLE = Array.from({ length: 28 }, (_, i) => ({
  date: jour(27 - i),
  weightKg: 79.6 - i * 0.04
}));

const CALORIES_EXEMPLE = Array.from({ length: 28 }, (_, i) => ({
  id: "c" + i,
  date: jour(27 - i),
  kcal: 2250,
  protein: 150,
  carbs: 230,
  fat: 70
}));

const SEANCES_EXEMPLE = [
  { id: "s1", date: jour(1), durationMin: 55, rpe: 8, notes: "Squat plus facile que la semaine dernière" },
  { id: "s2", date: jour(3), durationMin: 45, rpe: 7 }
];

const PROFIL_SEANCES = {
  sheetsUrl: "https://docs.google.com/spreadsheets/d/exemple",
  weeklyWorkoutTarget: 3,
  coachingMode: "presentiel",
  slots: [{ id: "cr1", day: "wed", time: "18:30", place: "Salle Neiram" }]
};

const OBJECTIFS_EXEMPLE = { calories: 2200, protein: 155, carbs: 220, fat: 70 };

const ONGLETS = [
  { id: "sommeil", label: "Sommeil" },
  { id: "mensurations", label: "Mensurations" },
  { id: "nutrition", label: "Nutrition" },
  { id: "seances", label: "Séances" }
];

export default function Apercu() {
  const [onglet, setOnglet] = useState("sommeil");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: POLICES.texte,
        padding: "20px 16px 48px"
      }}
    >
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <p
          style={{
            fontSize: 10,
            letterSpacing: 2.5,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            fontWeight: 600,
            margin: 0
          }}
        >
          Aperçu de migration
        </p>
        <h1 style={{ fontFamily: POLICES.titre, fontSize: 24, margin: "6px 0 4px", color: COLORS.gold }}>
          Coach Neiram
        </h1>
        <p style={{ fontSize: 12, color: COLORS.textFaint, margin: "0 0 18px", lineHeight: 1.6 }}>
          Écrans portés vers la nouvelle architecture, avec des données d'exemple. Ce n'est pas
          l'application : rien n'est enregistré, et le suivi réel reste servi par index.html.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              style={{
                flex: 1,
                background: onglet === o.id ? COLORS.surface : "transparent",
                border: `1px solid ${onglet === o.id ? COLORS.gold : COLORS.border}`,
                color: onglet === o.id ? COLORS.gold : COLORS.textMuted,
                borderRadius: 10,
                padding: "9px 12px",
                fontFamily: POLICES.texte,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        {onglet === "sommeil" && (
          <Sommeil formApi={apiFactice(JOURNAL_EXEMPLE)} profile={{ targetSleepHours: 8 }} />
        )}
        {onglet === "mensurations" && <Mensurations api={apiFactice(MESURES_EXEMPLE)} bodyApi={CORPS_FACTICE} />}
        {onglet === "seances" && (
          <Seances sessionsApi={apiFactice(SEANCES_EXEMPLE)} profile={PROFIL_SEANCES} />
        )}
        {onglet === "nutrition" && (
          <Nutrition
            profile={{}}
            targets={OBJECTIFS_EXEMPLE}
            currentWeight={78.4}
            bodyLogs={CORPS_EXEMPLE}
            logEntries={CALORIES_EXEMPLE}
            onApplyCalibration={() => {}}
          />
        )}
      </div>
    </div>
  );
}
