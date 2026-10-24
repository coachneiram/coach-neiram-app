/**
 * « Mes sports » (repris de l'app Neiram, 24/10/2026) : temps par sport sur
 * 30 jours et records par discipline (plus longue distance, plus longue
 * durée, plus gros dénivelé, meilleure allure en course). Tout inclus.
 */

import { COLORS } from "../tokens.js";
import { fmtDateShort, todayISO } from "../lib/dates.js";
import { fmtAllureSec, recordsSports, repartitionSports } from "../lib/activites.js";
import { TEXTES_SPORTS as T } from "../lib/textes-sports.js";
import { Card, SectionTitle } from "./primitives.jsx";

const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`);
const km = (v) => String(v).replace(".", ",") + " km";
const ligneSport = { display: "grid", gridTemplateColumns: "1fr auto", fontSize: 12.5, gap: 4 };
const chiffre = { color: COLORS.textMuted, fontFamily: "IBM Plex Mono", fontSize: 11.5 };
const piste = { gridColumn: "1 / -1", height: 5, borderRadius: 3, background: COLORS.bgAlt, overflow: "hidden" };

export function CarteMesSports({ seances }) {
  const repartition = repartitionSports(seances, todayISO(), 30);
  const records = recordsSports(seances).slice(0, 6);
  if (!repartition.length && !records.length) return null;
  const max = Math.max(1, ...repartition.map((r) => r.minutes));

  return (
    <Card>
      <div data-mes-sports>
        <SectionTitle tuto="mes-sports">{T.mesSports}</SectionTitle>
        {repartition.length > 0 && (
          <>
            <div style={{ fontSize: 11.5, color: COLORS.textMuted, margin: "4px 0 8px" }}>{T.trenteJours}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {repartition.slice(0, 6).map((r) => (
                <div key={r.id} style={ligneSport}>
                  <span style={{ color: COLORS.text }}>
                    {r.emoji} {r.label}
                  </span>
                  <span style={chiffre}>
                    {r.minutes ? fmtMin(r.minutes) : T.nbSeances(r.seances)}
                    {r.km ? " · " + km(r.km) : ""}
                  </span>
                  <div style={piste}>
                    <div style={{ width: `${Math.max(4, (r.minutes / max) * 100)}%`, height: "100%", background: COLORS.gold }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {records.length > 0 && (
          <>
            <div style={{ fontSize: 11.5, color: COLORS.textMuted, margin: "14px 0 6px" }}>{T.records}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {records.map((r) => {
                const lignes = [
                  r.records.allure10 && T.allure10(fmtAllureSec(r.records.allure10.valeur), fmtDateShort(r.records.allure10.date)),
                  r.records.allure5 && T.allure5(fmtAllureSec(r.records.allure5.valeur), fmtDateShort(r.records.allure5.date)),
                  r.records.distance && T.plusLongueDistance(km(r.records.distance.valeur)),
                  r.records.denivele && T.plusGrosDenivele(r.records.denivele.valeur),
                  r.records.duree && T.plusLongueSeance(fmtMin(r.records.duree.valeur))
                ].filter(Boolean);
                return (
                  <div key={r.id} data-record-sport={r.id}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                      {r.emoji} {r.label}
                      <span style={{ fontWeight: 400, color: COLORS.textFaint, fontSize: 11.5 }}>
                        {" · "}
                        {T.nbSeances(r.seances)}
                        {r.km ? T.auTotal(km(r.km)) : ""}
                      </span>
                    </div>
                    {lignes.slice(0, 3).map((l) => (
                      <div key={l} style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 }}>
                        {l}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
