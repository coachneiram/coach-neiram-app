/**
 * Carte des records.
 *
 * Portage fidele de RecordsCard (index.html, ligne 3861).
 *
 * Les cinq premiers records sont affiches, le reste se deplie. Une liste
 * de quarante exercices repousserait tout le contenu utile hors de
 * l'ecran, et c'est le haut de la liste qu'on regarde.
 */

import { useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { fmtWeekShort } from "../lib/dates.js";
import { construireRecords, estRecordRecent } from "../lib/records.js";
import { Card, SectionTitle } from "../ui/primitives.jsx";

/** Records affiches avant de devoir deplier. */
const VISIBLES = 5;

export function Records({ sessions }) {
  const [deplie, setDeplie] = useState(false);

  // Tries par 1RM estime : c'est l'indicateur qui compare le mieux des
  // exercices differents entre eux.
  const records = useMemo(
    () => construireRecords(sessions).sort((a, b) => (b.oneRM ? b.oneRM.value : 0) - (a.oneRM ? a.oneRM.value : 0)),
    [sessions]
  );

  if (!records.length) return null;

  const recents = records.filter(estRecordRecent);
  const affiches = deplie ? records : records.slice(0, VISIBLES);

  return (
    <Card style={{ marginBottom: 22 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 4
        }}
      >
        <SectionTitle>Records</SectionTitle>
        {recents.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.good }}>
            {recents.length} nouveau{recents.length > 1 ? "x" : ""} record{recents.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "0 0 12px" }}>
        {records.length} exercice{records.length > 1 ? "s" : ""} suivi{records.length > 1 ? "s" : ""} · charge
        maximale, volume et 1RM estimé.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {affiches.map((r) => (
          <div
            key={r.name}
            style={{
              background: COLORS.bgAlt,
              border: `1px solid ${estRecordRecent(r) ? COLORS.good + "66" : COLORS.border}`,
              borderRadius: 9,
              padding: "9px 11px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: COLORS.text,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {r.name}
              </span>
              {estRecordRecent(r) && (
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    background: `${COLORS.good}22`,
                    color: COLORS.good,
                    borderRadius: 6,
                    padding: "3px 7px",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                    flexShrink: 0
                  }}
                >
                  Record
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: 10.5,
                color: COLORS.textFaint,
                fontFamily: "IBM Plex Mono",
                marginTop: 4,
                lineHeight: 1.5
              }}
            >
              {r.weight ? `Charge max ${r.weight.value} kg × ${r.weight.reps} (${fmtWeekShort(r.weight.date)})` : ""}
              {r.oneRM ? ` · 1RM estimé ${r.oneRM.value} kg` : ""}
              {r.volume ? ` · volume max ${r.volume.value} kg` : ""}
            </div>
          </div>
        ))}
      </div>

      {records.length > VISIBLES && (
        <button
          onClick={() => setDeplie(!deplie)}
          style={{
            background: "none",
            border: "none",
            padding: "10px 0 0",
            color: COLORS.gold,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          {deplie ? "Replier" : `Voir les ${records.length - VISIBLES} autres`}
        </button>
      )}
    </Card>
  );
}
