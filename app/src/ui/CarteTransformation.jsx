/**
 * « Ma transformation » (Mesures), reprise de l'app Neiram le 24/10/2026 :
 * gras perdu et muscle pris sur 90 jours ou sur l'année, avec les
 * garde-fous de lib/transformation.js. Les mêmes chiffres partent dans le
 * bilan envoyé au coach.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { fmtDateShort } from "../lib/dates.js";
import { periodes, transformation } from "../lib/transformation.js";
import { TEXTES_TRANSFORMATION as T } from "../lib/textes-performances.js";
import { Card, SectionTitle } from "./primitives.jsx";

const stylePeriodes = { display: "flex", margin: "8px 0", gap: 6 };
const styleLigne = { fontSize: 13, color: COLORS.text, lineHeight: 1.5, marginTop: 4 };
const styleNote = { fontSize: 11, color: COLORS.textFaint, lineHeight: 1.45, margin: "8px 0 0" };
const puce = (actif) => ({
  padding: "6px 10px",
  borderRadius: 999,
  border: `1px solid ${actif ? COLORS.gold : COLORS.border}`,
  background: actif ? `${COLORS.gold}22` : "transparent",
  color: actif ? COLORS.gold : COLORS.text,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit"
});

export function CarteTransformation({ bodyLogs, profil, date }) {
  const [cle, setCle] = useState("j90");
  const t = transformation({ bodyLogs: bodyLogs || [], profil: profil || {}, ...periodes(date)[cle] });
  return (
    <Card style={{ padding: 14 }}>
      <div data-carte-transformation>
        <SectionTitle>{T.titre}</SectionTitle>
        <div style={stylePeriodes}>
          {Object.entries(T.periodes).map(([id, label]) => (
            <button key={id} type="button" data-periode-transformation={id} aria-pressed={cle === id} onClick={() => setCle(id)} style={puce(cle === id)}>
              {label}
            </button>
          ))}
        </div>
        {!t ? (
          <p style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.5, margin: 0 }}>{T.vide}</p>
        ) : (
          <>
            <div style={styleLigne}>{T.poids(t.poids.avant, t.poids.apres)}</div>
            {t.gras && (
              <div data-gras-perdu style={{ ...styleLigne, color: t.gras.perduKg > 0 ? COLORS.good : COLORS.text }}>
                {t.gras.perduKg >= 0 ? T.gras(t.gras) : T.grasPris(t.gras)}
              </div>
            )}
            {t.muscle && (
              <div data-muscle-pris style={{ ...styleLigne, color: t.muscle.prisKg > 0 ? COLORS.good : COLORS.text }}>
                {T.muscle(t.muscle)}
              </div>
            )}
            {((t.gras && t.gras.plafonne) || (t.muscle && t.muscle.plafonne)) && <p style={styleNote}>{T.plafonne}</p>}
            <p style={styleNote}>{T.periode(fmtDateShort(t.debut), fmtDateShort(t.fin), t.jours)}</p>
            <p style={styleNote}>{T.precision}</p>
          </>
        )}
      </div>
    </Card>
  );
}
