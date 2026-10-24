/**
 * « Programmes guidés » (repris de l'app Neiram, 24/10/2026) : De 0 à 5 km,
 * Marche active, De 5 à 10 km (lib/programmes-sport.js). Tout le programme
 * est inclus. Chaque séance notée part au Journal du coach (activité).
 */

import { COLORS } from "../tokens.js";
import { avancement, PROGRAMMES_SPORT } from "../lib/programmes-sport.js";
import { TEXTES_SPORTS as T } from "../lib/textes-sports.js";
import { Btn, Card, SectionTitle } from "./primitives.jsx";

const cadreProgramme = { border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "10px 12px" };
const enTete = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 };
const lienArreter = { background: "none", border: "none", color: COLORS.textFaint, fontSize: 11.5, cursor: "pointer", textDecoration: "underline" };
const etiquette = { fontSize: 12, fontWeight: 700, color: COLORS.gold, textTransform: "uppercase", letterSpacing: 0.4 };

export function CarteProgrammes({ etat, onDemarrer, onArreter, onNoter }) {
  const a = avancement(etat);

  if (!a) {
    return (
      <Card>
        <div data-programmes>
          <SectionTitle tuto="programmes-guides">{T.programmes}</SectionTitle>
          <p style={{ fontSize: 12, color: COLORS.textMuted, margin: "4px 0 10px", lineHeight: 1.5 }}>{T.programmesIntro}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PROGRAMMES_SPORT.map((p) => (
              <div key={p.id} data-programme={p.id} style={cadreProgramme}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>
                  {p.emoji} {p.titre} <span style={{ fontWeight: 400, fontSize: 11.5, color: COLORS.textFaint }}>{T.nbSemaines(p.semaines.length)}</span>
                </div>
                <p style={{ fontSize: 12, color: COLORS.textMuted, margin: "4px 0 8px", lineHeight: 1.45 }}>{p.resume}</p>
                <Btn variant="ghost" onClick={() => onDemarrer(p.id)}>
                  {T.commencer}
                </Btn>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const { programme: p, prochaine: s } = a;
  return (
    <Card>
      <div data-programme-actif={p.id}>
        <div style={enTete}>
          <SectionTitle tuto="programmes-guides">
            {p.emoji} {p.titre}
          </SectionTitle>
          <button onClick={() => window.confirm(T.confirmerArret) && onArreter()} style={lienArreter}>
            {T.arreter}
          </button>
        </div>
        <div style={{ height: 6, borderRadius: 4, background: COLORS.bgAlt, overflow: "hidden", margin: "6px 0 4px" }}>
          <div style={{ width: `${a.pct}%`, height: "100%", background: COLORS.gold }} />
        </div>
        <div style={{ fontSize: 11, color: COLORS.textFaint, marginBottom: 10 }}>{T.nbFaites(a.faites, a.total)}</div>
        {a.termine ? (
          <p style={{ fontSize: 13, color: COLORS.good, margin: 0, lineHeight: 1.5 }}>{T.termine}</p>
        ) : (
          s && (
            <div data-seance-programme={s.cle}>
              <div style={etiquette}>{T.seanceDe(s)}</div>
              <p style={{ fontSize: 13, color: COLORS.text, margin: "6px 0 10px", lineHeight: 1.5 }}>{s.texte}</p>
              <Btn onClick={() => onNoter(s)}>{T.jeLaiFaite}</Btn>
              <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "8px 0 0", lineHeight: 1.45 }}>{p.conseil}</p>
            </div>
          )
        )}
      </div>
    </Card>
  );
}
