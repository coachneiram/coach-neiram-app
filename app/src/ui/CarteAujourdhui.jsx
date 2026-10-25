/**
 * Carte « Aujourd'hui » : séance, nutrition et bilan du jour, en haut du
 * Journal. Toute la décision vit dans lib/aujourdhui.js et y est testée ;
 * l'écran ne fait qu'afficher les lignes et relayer les boutons.
 */

import { COLORS, POLICES } from "../tokens.js";
import { TEXTES_AUJOURDHUI as T } from "../lib/aujourdhui.js";
import { Btn, Card, SectionTitle } from "./primitives.jsx";

const COULEUR_ETAT = {
  fait: COLORS.good,
  "a-faire": COLORS.gold,
  repos: COLORS.blue,
  vide: COLORS.textFaint,
  "plus-tard": COLORS.textFaint
};

const styleLigne = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 0",
  borderTop: `1px solid ${COLORS.border}`
};

export function CarteAujourdhui({ lignes, onAction }) {
  if (!lignes || !lignes.length) return null;
  return (
    <Card style={{ marginBottom: 16, borderColor: COLORS.borderLight }} data-carte="aujourdhui">
      <SectionTitle>{T.titre}</SectionTitle>
      <div style={{ marginTop: 8 }}>
        {lignes.map((l) => (
          <div key={l.id} style={styleLigne} data-ligne={l.id} data-etat={l.etat}>
            <span
              aria-hidden="true"
              style={{ width: 10, height: 10, borderRadius: 5, background: COULEUR_ETAT[l.etat] || COLORS.textFaint, flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {l.libelle}
              </div>
              <div style={{ fontFamily: POLICES.titre, fontSize: 14.5, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>
                {l.texte}
              </div>
              {l.detail && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 1.4 }}>{l.detail}</div>}
            </div>
            {l.action && (
              <Btn variant="ghost" style={{ padding: "8px 12px", fontSize: 13, flexShrink: 0 }} onClick={() => onAction(l.action)}>
                {l.action.libelle}
              </Btn>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
