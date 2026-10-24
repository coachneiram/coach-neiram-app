/**
 * « Ta forme du jour » (lib/forme.js), sous « Ta séance du jour » dans
 * l'onglet Séances. N'apparait que si le client a note son sommeil, son
 * energie ou son stress aujourd'hui.
 */

import { COLORS, POLICES } from "../tokens.js";
import { CONSEILS_FORME, scoreForme, TEXTES_FORME } from "../lib/forme.js";
import { Card, SectionTitle } from "./primitives.jsx";

const COULEUR = { pousse: "good", normal: "gold", recupere: "warn" };
const GRILLE_FACTEUR = { display: "grid", gridTemplateColumns: "150px 1fr", gap: 8, alignItems: "center" };
const LIGNE_SCORE = { display: "flex", alignItems: "center", margin: "8px 0", gap: 12 };
const couleurFacteur = (v) => COLORS[v >= 0.66 ? "good" : v >= 0.4 ? "gold" : "warn"];

export function CarteForme({ form, seances, date }) {
  const r = scoreForme({ form: form || {}, seances, date });
  if (!r) return null;
  const c = CONSEILS_FORME[r.niveau];
  return (
    <Card style={{ marginBottom: 20 }}>
      <div data-forme={r.niveau}>
        <SectionTitle>{TEXTES_FORME.titre}</SectionTitle>
        <div style={LIGNE_SCORE}>
          <div style={{ fontFamily: POLICES.chiffres, fontSize: 34, fontWeight: 700, color: COLORS[COULEUR[r.niveau]] }}>{r.score}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>
              {c.emoji} {c.titre}
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.45 }}>{c.texte}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {r.facteurs.map((f) => (
            <div key={f.id} style={GRILLE_FACTEUR}>
              <span style={{ fontSize: 11.5, color: COLORS.textMuted }}>{f.nom}</span>
              <div style={{ height: 6, borderRadius: 3, background: COLORS.bgAlt }}>
                <div style={{ width: `${Math.round(f.valeur * 100)}%`, height: "100%", borderRadius: 3, background: couleurFacteur(f.valeur) }} />
              </div>
            </div>
          ))}
          <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "6px 0 0" }}>{TEXTES_FORME.avertissement}</p>
        </div>
      </div>
    </Card>
  );
}
