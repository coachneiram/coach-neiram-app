/**
 * Force athletique — maxis & progression.
 *
 * Portage de PowerliftingPanel et RpeChartTable (index.html 4009-4075).
 * Ne s'affiche que sur l'objectif « performance ».
 *
 * Le client saisit ses maxis de reference ; l'application les utilise pour
 * calculer les charges a partir d'un pourcentage. En face, elle affiche le
 * 1RM ESTIME depuis ses vraies series : c'est ce qui permet de reperer un
 * maxi devenu obsolete, dans un sens comme dans l'autre.
 *
 * La table RPE est repliee par defaut. Elle sert de reference lors des
 * seances, mais l'ouvrir en permanence noierait la carte.
 */

import { useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { fmtWeekShort, round } from "../lib/dates.js";
import { MOUVEMENTS_FORCE, PALIERS_RPE, RPE_CHART, meilleursMaxis, totalForce } from "../lib/force.js";
import { Card, SectionTitle } from "../ui/primitives.jsx";

/** Nombre de repetitions couvertes par la table. */
const MAX_REPS_TABLE = 12;

/**
 * Couleur d'une case de la table.
 *
 * Le degrade n'est pas decoratif : au-dela de 90 % du maxi, une serie
 * n'est plus un exercice d'entrainement mais une tentative. Le rouge le
 * dit avant que le client ne charge la barre.
 */
const couleurCase = (p) => (p >= 90 ? "#E5484D" : p >= 82 ? "#E8A33D" : p >= 74 ? "#D6C13A" : "#4FA86B");

const champCompact = {
  width: "100%",
  background: COLORS.bgAlt,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "8px 8px",
  color: COLORS.text,
  fontFamily: "Inter",
  fontSize: 13,
  outline: "none",
  textAlign: "center"
};

function TableRPE() {
  const [ouverte, setOuverte] = useState(false);

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
      <button
        onClick={() => setOuverte(!ouverte)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: COLORS.gold,
          fontSize: 11.5,
          fontWeight: 600,
          cursor: "pointer",
          textTransform: "uppercase",
          letterSpacing: 0.5
        }}
      >
        {ouverte ? "▾" : "▸"} Table RPE → % du 1RM
      </button>

      {ouverte && (
        <div style={{ overflowX: "auto", marginTop: 10, WebkitOverflowScrolling: "touch" }}>
          <table style={{ borderCollapse: "collapse", fontFamily: "IBM Plex Mono", fontSize: 10 }}>
            <thead>
              <tr>
                {/* La colonne RPE reste visible pendant le defilement
                    horizontal : sans elle, les pourcentages ne veulent
                    plus rien dire. */}
                <th
                  style={{
                    padding: "4px 6px",
                    color: COLORS.textFaint,
                    fontWeight: 600,
                    textAlign: "left",
                    position: "sticky",
                    left: 0,
                    background: COLORS.bg
                  }}
                >
                  RPE
                </th>
                {Array.from({ length: MAX_REPS_TABLE }, (_, k) => (
                  <th key={k} style={{ padding: "4px 6px", color: COLORS.textFaint, fontWeight: 600 }}>
                    {k + 1}
                    {k === 0 ? " rep" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PALIERS_RPE.map((s) => (
                <tr key={s}>
                  <td
                    style={{
                      padding: "4px 6px",
                      color: COLORS.text,
                      fontWeight: 700,
                      position: "sticky",
                      left: 0,
                      background: COLORS.bg
                    }}
                  >
                    {s}
                  </td>
                  {RPE_CHART[s].map((p, k) => (
                    <td key={k} style={{ padding: "4px 6px", textAlign: "right", color: couleurCase(p) }}>
                      {p}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ouverte && (
        <p style={{ fontSize: 10, color: COLORS.textFaint, margin: "8px 0 0" }}>
          Lecture : 5 répétitions à RPE 8 correspondent à 81,1 % du 1RM. Utilisée pour proposer la charge et
          pour estimer le 1RM à partir des séries réalisées.
        </p>
      )}
    </div>
  );
}

export function ForceAthletique({ maxis, onDefinirMaxi, sessions }) {
  const meilleurs = useMemo(() => meilleursMaxis(sessions), [sessions]);
  const total = totalForce(maxis);

  return (
    <Card style={{ marginBottom: 16 }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}
      >
        <SectionTitle>Force athlétique — maxis & progression</SectionTitle>
        {total > 0 && (
          <span style={{ fontFamily: "IBM Plex Mono", fontSize: 12, fontWeight: 700, color: COLORS.gold }}>
            Total {round(total, 1)} kg
          </span>
        )}
      </div>

      <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "0 0 12px" }}>
        Maxis de référence utilisés pour calculer les charges à partir du %1RM.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MOUVEMENTS_FORCE.map((l) => {
          const b = meilleurs[l.id];
          return (
            <div
              key={l.id}
              style={{ display: "grid", gridTemplateColumns: "1fr 92px", gap: 10, alignItems: "center" }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: COLORS.text, fontWeight: 600 }}>{l.label}</div>
                {b ? (
                  <div
                    style={{
                      fontSize: 10.5,
                      color: COLORS.textFaint,
                      fontFamily: "IBM Plex Mono",
                      marginTop: 2
                    }}
                  >
                    Meilleure série : {b.weight} kg × {b.reps} → 1RM estimé {b.est} kg · {b.method} (
                    {fmtWeekShort(b.date)})
                  </div>
                ) : (
                  <div style={{ fontSize: 10.5, color: COLORS.textFaint, marginTop: 2 }}>
                    Aucune série enregistrée pour l'instant.
                  </div>
                )}
              </div>
              <input
                type="number"
                step="0.5"
                placeholder="1RM kg"
                value={(maxis || {})[l.id] ?? ""}
                onChange={(e) => onDefinirMaxi(l.id, e.target.value)}
                style={champCompact}
              />
            </div>
          );
        })}
      </div>

      <TableRPE />
    </Card>
  );
}
