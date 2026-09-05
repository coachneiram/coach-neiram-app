/**
 * Progression des charges.
 *
 * Portage de TrainingPerformanceCard (index.html 3164-3196).
 *
 * Cinq exercices, les derniers enregistres. C'est deliberement court : la
 * carte repond a une seule question, « est-ce que je progresse ? », et une
 * liste de trente lignes n'y repond plus.
 *
 * L'ecart affiche se compare a la DERNIERE seance, pas au record. Un client
 * qui passe de 60 a 62,5 kg voit « +2,5 kg » meme s'il a deja fait 70 : ce
 * qui compte au quotidien, c'est le sens de la marche.
 */

import { useMemo } from "react";
import { COLORS } from "../tokens.js";
import { fmtDateShort } from "../lib/dates.js";
import { progressionParExercice } from "../lib/records.js";
import { Card, SectionTitle } from "../ui/primitives.jsx";

/** Au-dela, la carte ne repond plus a la question qu'elle pose. */
const MAX_LIGNES = 5;

export function ProgressionCharges({ sessions }) {
  const progression = useMemo(
    () =>
      progressionParExercice(sessions)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, MAX_LIGNES),
    [sessions]
  );

  if (!progression.length) {
    return (
      <Card style={{ marginBottom: 22 }}>
        <SectionTitle>Progression des charges</SectionTitle>
        <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "9px 0 0", lineHeight: 1.45 }}>
          Enregistre séries, répétitions et charge dans tes séances : tes records et ta progression
          apparaîtront ici.
        </p>
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: 22 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap"
        }}
      >
        <SectionTitle>Progression des charges</SectionTitle>
        <span style={{ fontSize: 10.5, color: COLORS.textFaint }}>5 derniers exercices enregistrés</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10 }}>
        {progression.map((item) => (
          <div
            key={item.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              padding: "9px 10px",
              background: COLORS.bgAlt,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 9
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: COLORS.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {item.name}
              </div>
              <div style={{ fontSize: 10.5, color: COLORS.textFaint, marginTop: 2 }}>
                {fmtDateShort(item.date)} · volume {item.volume} kg
              </div>
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div
                style={{
                  fontFamily: "IBM Plex Mono",
                  fontWeight: 600,
                  fontSize: 12.5,
                  color: item.isWeightPB ? COLORS.gold : COLORS.text
                }}
              >
                {item.weight} kg{item.isWeightPB ? " · record" : ""}
              </div>
              {item.weightDelta != null && (
                <div
                  style={{
                    fontSize: 10.5,
                    color:
                      item.weightDelta > 0
                        ? COLORS.good
                        : item.weightDelta < 0
                          ? COLORS.warn
                          : COLORS.textFaint,
                    marginTop: 2
                  }}
                >
                  {item.weightDelta > 0 ? "+" : ""}
                  {item.weightDelta} kg vs dernière séance
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
