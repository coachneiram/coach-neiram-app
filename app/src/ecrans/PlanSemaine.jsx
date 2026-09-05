/**
 * Programme de la semaine.
 *
 * Portage de WeeklyPlanCard (index.html 3141-3163).
 *
 * Chaque jour recoit une seance type, ou rien. C'est le seul endroit ou le
 * client voit sa semaine en entier plutot que la seance du jour : c'est ce
 * qui rend visible qu'il en a deja fait trois sur quatre, ou qu'il en a
 * manque une lundi.
 *
 * La carte disparait tant qu'aucune seance type n'existe : programmer des
 * jours vides n'aurait aucun sens.
 */

import { useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { clamp, todayISO } from "../lib/dates.js";
import { META_PLAN, bilanPlanSemaine, etatPlanSemaine } from "../lib/plan-semaine.js";
import { Card, SectionTitle } from "../ui/primitives.jsx";

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

export function PlanSemaine({ plan, onAssigner, routines, sessions, onDemarrer }) {
  const [modification, setModification] = useState(false);
  const aujourdhui = todayISO();

  const lignes = useMemo(
    () => etatPlanSemaine(plan, routines, sessions, aujourdhui),
    [plan, routines, sessions, aujourdhui]
  );
  const bilan = bilanPlanSemaine(lignes);

  if (!routines.length) return null;

  return (
    <Card style={{ marginBottom: 22 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 4
        }}
      >
        <SectionTitle>Programme de la semaine</SectionTitle>
        <button
          onClick={() => setModification(!modification)}
          style={{
            background: "none",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: "5px 11px",
            color: COLORS.gold,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          {modification ? "Terminé" : "Modifier"}
        </button>
      </div>

      {bilan.prevus > 0 ? (
        <>
          <p style={{ fontSize: 11.5, color: COLORS.textMuted, margin: "0 0 10px" }}>
            {bilan.faits}/{bilan.prevus} séance{bilan.prevus > 1 ? "s" : ""} réalisée
            {bilan.faits > 1 ? "s" : ""}
            {bilan.restants > 0 ? ` · ${bilan.restants} à venir` : ""}
            {bilan.manques > 0 ? ` · ${bilan.manques} manquée${bilan.manques > 1 ? "s" : ""}` : ""}
          </p>
          <div
            style={{
              height: 6,
              background: COLORS.bgAlt,
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 14
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${clamp(bilan.prevus ? (bilan.faits / bilan.prevus) * 100 : 0, 0, 100)}%`,
                background: COLORS.gold,
                borderRadius: 4,
                transition: "width .4s ease"
              }}
            />
          </div>
        </>
      ) : (
        <p style={{ fontSize: 11.5, color: COLORS.textFaint, margin: "0 0 12px", lineHeight: 1.5 }}>
          Aucune séance programmée. Appuie sur Modifier pour attribuer tes séances types aux jours de la
          semaine.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {lignes.map((r) => {
          const st = META_PLAN[r.status];
          return (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: modification ? "34px 1fr" : "34px 1fr auto",
                gap: 9,
                alignItems: "center",
                background: r.isToday ? `${COLORS.gold}0E` : "transparent",
                border: `1px solid ${r.isToday ? COLORS.gold + "44" : "transparent"}`,
                borderRadius: 8,
                padding: "5px 7px"
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: COLORS.bgAlt,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: r.isToday ? COLORS.gold : COLORS.textMuted
                }}
              >
                {r.short}
              </div>

              {modification ? (
                <select
                  value={r.routine ? r.routine.id : ""}
                  onChange={(e) => onAssigner(r.id, e.target.value || null)}
                  style={champCompact}
                >
                  <option value="">Repos</option>
                  {routines.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {r.routine && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 3,
                            background: r.routine.color,
                            flexShrink: 0
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontSize: 12.5,
                          color: r.routine ? COLORS.text : COLORS.textFaint,
                          fontWeight: r.routine ? 600 : 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {r.routine ? r.routine.name : "Repos"}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: COLORS[st.couleur], marginTop: 2 }}>
                      {st.marque} {st.texte}
                    </div>
                  </div>

                  {/* Une seance manquee reste demarrable : elle se pointe a
                      sa date d'origine, pas a celle du jour. */}
                  {(r.status === "today" || r.status === "missed") && r.routine && (
                    <button
                      onClick={() => onDemarrer(r.routine, r.date)}
                      style={{
                        background: "none",
                        border: `1px solid ${COLORS.gold}66`,
                        borderRadius: 8,
                        padding: "6px 11px",
                        color: COLORS.gold,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        flexShrink: 0
                      }}
                    >
                      Démarrer
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
