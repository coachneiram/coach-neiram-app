/**
 * Bloc « Photos du mois » de la carte du bilan mensuel (26 octobre 2026) :
 * chaque pose du mois à côté de celle d'avant, et ce qui manque. La
 * décision (obligatoire, manquantes, comparaison) vit dans
 * lib/photos-mensuelles.js.
 */

import { COLORS } from "../tokens.js";
import { fmtWeekShort } from "../lib/dates.js";
import { TEXTES_PHOTOS_MOIS as T } from "../lib/photos-mensuelles.js";
import { Camera } from "./icones.jsx";

const vignette = (image) => ({
  width: "100%",
  aspectRatio: "3/4",
  borderRadius: 8,
  border: `1px ${image ? "solid" : "dashed"} ${COLORS.border}`,
  background: image ? `url(${image}) center/cover` : COLORS.bgAlt,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
});

const legende = { fontSize: 10, color: COLORS.textFaint, textAlign: "center", marginTop: 3 };

export function PhotosDuMois({ etat, onPrendre }) {
  if (!etat) return null;
  const { obligatoires, poses, manquantes } = etat;
  const message = manquantes.length === 0 ? T.completes : obligatoires ? T.manquantes(manquantes.length) : T.facultatives;
  return (
    <div data-photos-mois={manquantes.length ? "incomplet" : "complet"} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>{T.titre}</div>
      <p
        style={{
          fontSize: 12.5,
          margin: "0 0 10px",
          color: manquantes.length && obligatoires ? COLORS.warn : COLORS.textMuted
        }}
      >
        {message}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        {poses.map((p) => (
          <div key={p.pose} data-pose={p.pose}>
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textAlign: "center", marginBottom: 4 }}>{p.label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              <div>
                <div style={vignette(p.precedente && p.precedente.image)} />
                <div style={legende}>{p.precedente ? fmtWeekShort(p.precedente.lundi) : T.moisPrecedent}</div>
              </div>
              <div>
                {p.actuelle ? (
                  <div style={vignette(p.actuelle.image)} />
                ) : (
                  <button
                    aria-label={`${T.prendre} : ${p.label}`}
                    onClick={() => onPrendre && onPrendre(p.pose)}
                    style={{ ...vignette(null), cursor: "pointer", borderColor: obligatoires ? COLORS.warn : COLORS.border }}
                  >
                    <Camera size={16} color={obligatoires ? COLORS.warn : COLORS.textFaint} />
                  </button>
                )}
                <div style={legende}>{T.ceMois}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "8px 0 0" }}>{T.conseil}</p>
    </div>
  );
}
