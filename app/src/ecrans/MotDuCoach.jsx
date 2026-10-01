/**
 * Le mot du coach, en haut du Journal. Voir lib/mot-du-coach.js.
 */

import { COLORS } from "../tokens.js";

/* TEXTE-NOUVEAU
   Le mot du coach : phrases de motivation du coach, ajoutees a sa demande et
   validees par lui. Les phrases vivent dans lib/mot-du-coach.js ; seul le
   titre est ici. Aucun de ces libelles n'existe dans index.html. */
export function MotDuCoach({ mot, contexte }) {
  if (!mot) return null;
  return (
    <div
      data-mot-du-coach=""
      data-contexte={contexte}
      style={{
        borderLeft: `3px solid ${COLORS.gold}`,
        padding: "4px 0 4px 12px",
        marginBottom: 16
      }}
    >
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, color: COLORS.gold, textTransform: "uppercase" }}>
        Le mot du coach
      </div>
      <div style={{ fontSize: 14, fontStyle: "italic", color: COLORS.text, lineHeight: 1.45, marginTop: 4 }}>
        {mot.auteur ? `« ${mot.texte} »` : mot.texte}
        {mot.auteur && <span style={{ fontStyle: "normal", color: COLORS.textMuted }}> — {mot.auteur}</span>}
      </div>
    </div>
  );
}
/* FIN-TEXTE-NOUVEAU */
