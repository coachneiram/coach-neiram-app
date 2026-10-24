/**
 * « Mes déclics » (lib/declics.js), repris de l'app Neiram le 24/10/2026 :
 * ce qui va avec une meilleure journée dans TES données. Inclus pour tous
 * dans l'app coach. Rien n'est affirmé tant qu'il n'y a pas assez de jours
 * pour comparer.
 */

import { useMemo } from "react";
import { COLORS } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import { CLE_HABITUDES, declics } from "../lib/declics.js";
import { charger } from "../lib/stockage.js";
import { TEXTES_DECLICS as T } from "../lib/textes-mode-de-vie.js";
import { Card, SectionTitle } from "./primitives.jsx";

const TEXTE_VIDE = {
  fontSize: 12.5,
  color: COLORS.textMuted,
  margin: "6px 0 0",
  lineHeight: 1.5
};
const LISTE = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 8
};
const PHRASE = {
  fontSize: 13,
  color: COLORS.text,
  lineHeight: 1.45
};
const DETAIL = {
  fontSize: 10.5,
  color: COLORS.textFaint
};
const PRUDENCE = {
  fontSize: 10.5,
  color: COLORS.textFaint,
  margin: "4px 0 0"
};

export function CarteDeclics({ journal, seances }) {
  const liste = useMemo(
    () => declics({ journal, seances, habitudes: charger(CLE_HABITUDES, null), date: todayISO() }),
    [journal, seances]
  );
  return (
    <Card>
      <div data-declics={liste.length}>
        <SectionTitle>{T.titre}</SectionTitle>
        {!liste.length ? (
          <p style={TEXTE_VIDE}>{T.vide}</p>
        ) : (
          <div style={LISTE}>
            {liste.map((d) => (
              <div key={d.phrase} data-declic="">
                <div style={PHRASE}>{T.phrase(d)}</div>
                <div style={DETAIL}>{d.detail}</div>
              </div>
            ))}
            <p style={PRUDENCE}>{T.prudence}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
