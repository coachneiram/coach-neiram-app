/**
 * Ecran Sommeil.
 *
 * Portage fidele de SommeilTab (index.html, ligne 2813). Aucun changement
 * d'apparence ni de comportement : la logique de calcul est simplement
 * deplacee dans lib/sommeil.js pour etre testable.
 */

import { COLORS } from "../tokens.js";
import { fmtDateShort, fmtWeekShort, round } from "../lib/dates.js";
import { conseilsSommeil, conseilsStress, moyennes7Jours, notesDeStress, nuitsEnregistrees } from "../lib/sommeil.js";
import { Card, EmptyState, SectionTitle, StatChip } from "../ui/primitives.jsx";
import { Moon, Star } from "../ui/icones.jsx";

function ListeConseils({ conseils }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {conseils.slice(0, 3).map((t, i) => (
        <div key={i} style={{ display: "flex", gap: 8 }}>
          <span style={{ color: COLORS.gold, marginTop: 4, fontSize: 8 }}>●</span>
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: COLORS.text }}>{t}</span>
        </div>
      ))}
    </div>
  );
}

export function Sommeil({ formApi, profile }) {
  const nuits = nuitsEnregistrees(formApi.items);
  const { heures, qualite, stress } = moyennes7Jours(formApi.items);
  const objectif = profile.targetSleepHours || 8;
  const conseilsNuit = conseilsSommeil({ heures, qualite }, objectif);
  const conseilsDetente = conseilsStress(stress);
  const notes = notesDeStress(formApi.items);
  const sousObjectif = heures != null && heures < objectif - 0.5;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatChip
          icon={Moon}
          label="Sommeil moy. 7j"
          value={heures ? `${heures} h` : "—"}
          sub={`obj. ${objectif}h`}
        />
        <StatChip icon={Star} label="Qualité moy." value={qualite ? `${qualite}/5` : "—"} />
      </div>

      <Card style={{ padding: 14 }}>
        <SectionTitle>Mieux dormir — conseils du coach</SectionTitle>
        <div style={{ marginTop: 10 }}>
          <ListeConseils conseils={conseilsNuit} />
        </div>
        {sousObjectif && (
          <p style={{ fontSize: 11, color: COLORS.warn, margin: "10px 0 0" }}>
            Tu dors {round(objectif - heures, 1)} h de moins que ton objectif en moyenne cette semaine.
          </p>
        )}
      </Card>

      <Card style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle>Stress</SectionTitle>
          <span
            style={{
              fontSize: 12,
              color: stress != null && stress >= 6 ? COLORS.warn : COLORS.textMuted,
              fontFamily: "IBM Plex Mono",
              fontWeight: 600
            }}
          >
            {stress != null ? `${stress}/10 (moy. 7j)` : "—"}
          </span>
        </div>

        {notes.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 6
              }}
            >
              Raisons notées récemment
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {notes.map((f) => (
                <div
                  key={f.id}
                  style={{
                    fontSize: 12,
                    color: COLORS.textMuted,
                    background: COLORS.bgAlt,
                    borderRadius: 8,
                    padding: "7px 10px"
                  }}
                >
                  <span style={{ color: COLORS.textFaint }}>
                    {fmtWeekShort(f.date)} · {f.stress != null ? f.stress + "/10" : ""}
                  </span>
                  {" — "}
                  {f.stressNote}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6
            }}
          >
            Réduire le stress
          </div>
          <ListeConseils conseils={conseilsDetente} />
        </div>
      </Card>

      {nuits.length === 0 ? (
        <EmptyState
          icon={Moon}
          message="Aucune nuit enregistrée. Renseigne tes heures de coucher et de lever dans l'onglet Journal : la durée se calcule toute seule."
        />
      ) : (
        <Card style={{ padding: 14 }}>
          <SectionTitle>Historique des nuits</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {nuits.slice(0, 30).map((f) => (
              <div key={f.id} style={{ background: COLORS.bgAlt, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>
                    {fmtDateShort(f.date)}
                    {f.bedTime && f.wakeTime ? (
                      <span style={{ color: COLORS.textFaint, fontSize: 11 }}>
                        {" · "}
                        {f.bedTime} → {f.wakeTime}
                      </span>
                    ) : null}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    {f.sleepHours != null && (
                      <span
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: f.sleepHours >= objectif ? COLORS.good : COLORS.text
                        }}
                      >
                        {f.sleepHours} h
                      </span>
                    )}
                    {f.sleepQuality != null && (
                      <div style={{ display: "flex", gap: 1 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            size={11}
                            fill={i <= f.sleepQuality ? COLORS.gold : "none"}
                            color={i <= f.sleepQuality ? COLORS.gold : COLORS.border}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {f.sleepNote && (
                  <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 6, fontStyle: "italic" }}>
                    « {f.sleepNote} »
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
