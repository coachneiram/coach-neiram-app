/**
 * Mode Force : % 1RM, RIR et calcul de la charge.
 *
 * Rebranche la fonction de l'ancienne application (index.html,
 * PowerliftingFields, l. 4000-4013). Les calculs sont dans
 * lib/calcul-charge.js.
 *
 * App coach : sans restriction. (Dans l'app grand public, qui partage ce
 * fichier, le constructeur affiche un verrou Premium a la place.)
 */

import { COLORS } from "../tokens.js";
import { AIDE_MAXI_MANQUANT, appliquerProposition, propositionsCharge } from "../lib/calcul-charge.js";

const styleBouton = {
  marginTop: 7,
  borderRadius: 8,
  padding: "6px 9px",
  color: COLORS.gold,
  fontSize: 11,
  fontFamily: "IBM Plex Mono",
  cursor: "pointer",
  width: "100%",
  textAlign: "left"
};

export function CalculCharge({ ex, maxis, onModifier, champ, etiquette }) {
  const p = propositionsCharge(ex, maxis);
  return (
    <div data-calcul-charge="" style={{ marginBottom: 6 }}>
      {/* TEXTE-NOUVEAU
          Les deux libelles d'accessibilite (lus par un lecteur d'ecran) sont
          nouveaux : dans index.html, les champs « % 1RM » et « RIR » n'en
          avaient aucun. Les etiquettes visibles, elles, sont celles d'origine.
      */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div>
          <div style={etiquette}>% 1RM</div>
          <input
            type="number"
            min="1"
            max="110"
            inputMode="decimal"
            aria-label="Pourcentage du 1RM"
            value={ex.pct1rm ?? ""}
            onChange={(e) => onModifier({ pct1rm: e.target.value })}
            style={champ}
          />
        </div>
        <div>
          <div style={etiquette}>RIR</div>
          <input
            type="number"
            min="0"
            max="6"
            step="0.5"
            inputMode="decimal"
            aria-label="Répétitions en réserve"
            value={ex.rir ?? ""}
            onChange={(e) => onModifier({ rir: e.target.value })}
            style={champ}
          />
        </div>
      </div>
      {/* FIN-TEXTE-NOUVEAU */}

      {p.table && (
        <button
          type="button"
          data-appliquer-table=""
          onClick={() => onModifier(appliquerProposition(ex, p.table))}
          style={{ ...styleBouton, background: `${COLORS.gold}0F`, border: `1px solid ${COLORS.gold}55` }}
        >
          {p.table.libelle}
        </button>
      )}
      {p.depuisPct && (
        <button
          type="button"
          data-appliquer-pct=""
          onClick={() => onModifier(appliquerProposition(ex, p.depuisPct))}
          style={{ ...styleBouton, background: "none", border: `1px dashed ${COLORS.gold}66` }}
        >
          {p.depuisPct.libelle}
        </button>
      )}
      {p.maxiManquant && (
        <p data-maxi-manquant="" style={{ fontSize: 10, color: COLORS.textFaint, margin: "6px 0 0" }}>
          {AIDE_MAXI_MANQUANT}
        </p>
      )}
    </div>
  );
}
