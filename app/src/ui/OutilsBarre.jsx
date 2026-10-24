/**
 * « 🧮 Disques & échauffement » sous un exercice a charge
 * (lib/outils-barre.js) : quoi mettre de chaque cote de la barre, et les
 * series d'echauffement avant la charge de travail.
 *
 * Repris de l'app Neiram (24 octobre 2026), sans verrou : un client du
 * coach a acces a tout.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { BARRES, disquesParCote, fmtKg, regrouper, seriesEchauffement, TEXTES_BARRE as T } from "../lib/outils-barre.js";
import { LienTuto, STYLE_LIEN_TUTO_PETIT, STYLE_LIGNE_TUTO } from "./primitives.jsx";

const CLE_BARRE = "cn_barre";
const COULEURS_DISQUES = { 25: "#E63E11", 20: "#2F6FDB", 15: "#F5B942", 10: "#4ADE80", 5: "#F5F5F2", 2.5: "#9C9C94", 1.25: "#9C9C94" };

const styleBouton = { background: "none", border: "none", padding: 0, color: COLORS.gold, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" };
const styleSelect = { width: "100%", padding: "6px 8px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.bgAlt, color: COLORS.text, fontFamily: "inherit", fontSize: 12 };
const styleLegende = { fontSize: 11.5, color: COLORS.textMuted, margin: "8px 0 4px" };

export function OutilsBarre({ charge }) {
  const [ouvert, setOuvert] = useState(false);
  const [barre, setBarre] = useState(() => {
    const b = Number(charger(CLE_BARRE, 20));
    return BARRES.some((x) => x.poids === b) ? b : 20;
  });
  const c = Number(String(charge || "").replace(",", "."));
  if (!(c > 0)) return null;
  const d = disquesParCote(c, barre);
  const echauffement = seriesEchauffement(c, barre);
  return (
    <div data-outils-barre style={{ marginBottom: 6 }}>
      <div style={STYLE_LIGNE_TUTO}>
        <button type="button" onClick={() => setOuvert(!ouvert)} style={styleBouton}>
          {`${T.ouvrir} ${fmtKg(c)} ${ouvert ? "▲" : "▼"}`}
        </button>
        <LienTuto id="outils-barre" style={STYLE_LIEN_TUTO_PETIT} />
      </div>
      {ouvert && (
        <div style={{ marginTop: 6, padding: "8px 10px", borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
          <select
            aria-label={T.barre}
            value={barre}
            onChange={(e) => {
              const b = Number(e.target.value);
              setBarre(b);
              enregistrer(CLE_BARRE, b);
            }}
            style={styleSelect}
          >
            {BARRES.map((b) => (
              <option key={b.poids} value={b.poids}>
                {b.libelle}
              </option>
            ))}
          </select>
          <div style={styleLegende}>{barre ? T.chaqueCoteBarre : T.chaqueCote}</div>
          {d.parCote.length ? (
            <div data-disques style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {regrouper(d.parCote).map(({ disque, nombre }) => (
                <span
                  key={disque}
                  style={{ fontSize: 12, fontWeight: 700, padding: "4px 8px", borderRadius: 8, border: `2px solid ${COULEURS_DISQUES[disque] || COLORS.border}`, color: COLORS.text }}
                >
                  {`${nombre > 1 ? nombre + " × " : ""}${fmtKg(disque)}`}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: COLORS.text }}>{T.barreSeule}</div>
          )}
          {d.reste !== 0 && (
            <div style={{ fontSize: 11, color: COLORS.warn, marginTop: 4 }}>
              {`${fmtKg(c)} ${T.pasFaisable} ${fmtKg(d.total)} ${T.avecDisques}`}
            </div>
          )}
          {echauffement.length > 0 && (
            <>
              <div style={{ ...styleLegende, marginTop: 10 }}>{T.echauffement}</div>
              <ol data-echauffement style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: COLORS.text, lineHeight: 1.6 }}>
                {echauffement.map((s, i) => (
                  <li key={i}>{`${fmtKg(s.poids)} × ${s.reps}`}</li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}
