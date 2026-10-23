/**
 * Liste depliable de bilans passes (hebdomadaires ou mensuels).
 *
 * Portage de l'ancienne application (index.html, TendancesTab : cartes
 * « Historique des bilans » et « Bilans mensuels précédents »). Le tri est
 * dans lib/historique-bilans.js. App coach : tout l'historique, sans verrou.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { BilanSections } from "./BilanSections.jsx";
import { ChevronDown, ChevronUp } from "./icones.jsx";

export function HistoriqueBilans({ titre, historique, libelle, enTete, tailleChevron = 18 }) {
  const [ouvert, setOuvert] = useState(false);
  const { visibles } = historique;
  if (!visibles.length) return null;
  return (
    <div data-historique-bilans={titre}>
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        aria-expanded={ouvert}
        style={{
          background: "none",
          border: "none",
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          padding: 0
        }}
      >
        {enTete}
        {ouvert ? (
          <ChevronUp size={tailleChevron} color={COLORS.textMuted} />
        ) : (
          <ChevronDown size={tailleChevron} color={COLORS.textMuted} />
        )}
      </button>
      {ouvert && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          {visibles.map((r) => (
            <div key={r.id || r.weekKey || r.monthKey} style={{ paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>{libelle(r)}</div>
              <BilanSections sections={r.sections} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
