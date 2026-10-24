/**
 * Comparateur avant / après (Tendances → Photos de progression), repris de
 * l'app Neiram le 24/10/2026 : deux photos d'une même pose superposées, un
 * curseur fait glisser la limite. Tout reste sur le téléphone ; le coach
 * peut s'en servir pendant ses bilans avec le client.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { fmtDateShort } from "../lib/dates.js";
import { semainesAvecPhoto } from "../lib/comparateur-photos.js";
import { TEXTES_COMPARATEUR as T } from "../lib/textes-performances.js";
import { LienTuto, STYLE_ENTETE_TUTO } from "./primitives.jsx";

const choix = { background: COLORS.bgAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 12, padding: "6px 8px", fontFamily: "inherit" };
const cadre = {
  position: "relative",
  width: "100%",
  aspectRatio: "3/4",
  borderRadius: 12,
  overflow: "hidden",
  background: COLORS.bgAlt
};
const plein = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover"
};
const voile = (curseur) => ({
  position: "absolute",
  inset: 0,
  clipPath: `inset(0 ${100 - curseur}% 0 0)`
});
const limite = (curseur) => ({
  position: "absolute",
  top: 0,
  bottom: 0,
  left: `${curseur}%`,
  width: 2,
  background: COLORS.gold,
  transform: "translateX(-1px)"
});
const etiquette = (cote) => ({
  position: "absolute",
  top: 8,
  [cote]: 8,
  fontSize: 11,
  fontWeight: 700,
  color: "#000",
  background: COLORS.gold,
  borderRadius: 6,
  padding: "2px 6px"
});
const ligneChoix = { display: "flex", flexWrap: "wrap", marginBottom: 8, gap: 6 };

export function ComparateurPhotos({ version = "" }) {
  const [pose, setPose] = useState("face");
  const [avant, setAvant] = useState(null);
  const [apres, setApres] = useState(null);
  const [curseur, setCurseur] = useState(50);
  const semaines = semainesAvecPhoto(pose);
  if (semaines.length < 2) {
    return (
      <p data-comparateur-vide style={{ fontSize: 11.5, color: COLORS.textFaint, margin: "10px 0 0" }}>
        {T.vide}
      </p>
    );
  }
  const a = semaines.find((s) => s.semaine === avant) || semaines[0];
  const b = semaines.find((s) => s.semaine === apres) || semaines[semaines.length - 1];
  return (
    <div data-comparateur key={version} style={{ marginTop: 14 }}>
      <div style={{ ...STYLE_ENTETE_TUTO, marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.gold }}>{T.titre}</div>
        <LienTuto id="comparateur" />
      </div>
      <div style={ligneChoix}>
        <select aria-label={T.pose} value={pose} onChange={(e) => setPose(e.target.value)} style={choix}>
          {T.poses.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select aria-label={T.avant} data-choix-avant value={a.semaine} onChange={(e) => setAvant(e.target.value)} style={choix}>
          {semaines.map((s) => (
            <option key={s.semaine} value={s.semaine}>
              {T.avantLe(fmtDateShort(s.semaine))}
            </option>
          ))}
        </select>
        <select aria-label={T.apres} data-choix-apres value={b.semaine} onChange={(e) => setApres(e.target.value)} style={choix}>
          {semaines.map((s) => (
            <option key={s.semaine} value={s.semaine}>
              {T.apresLe(fmtDateShort(s.semaine))}
            </option>
          ))}
        </select>
      </div>
      <div style={cadre}>
        <img src={b.image} alt={T.apres} style={plein} />
        <div style={voile(curseur)}>
          <img src={a.image} alt={T.avant} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={limite(curseur)} />
        <span style={etiquette("left")}>{T.etiquetteAvant}</span>
        <span style={etiquette("right")}>{T.etiquetteApres}</span>
      </div>
      <input
        data-curseur-comparateur
        type="range"
        min="0"
        max="100"
        value={curseur}
        onChange={(e) => setCurseur(Number(e.target.value))}
        aria-label={T.curseur}
        style={{ width: "100%", marginTop: 8, accentColor: COLORS.gold }}
      />
    </div>
  );
}
