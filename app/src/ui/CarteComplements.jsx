/**
 * « Compléments utiles pour toi » (lib/complements.js), repris de l'app
 * Neiram le 24/10/2026 : selon ton objectif, ta discipline (déduite de tes
 * séances), ton âge et ton régime. Tout est inclus dans l'app coach.
 *
 * La grossesse, l'allaitement et la maladie rénale viennent du
 * questionnaire du repère sur mesure (cn_objectifs_sur_mesure, transmis par
 * l'écran Nutrition) et ne partent nulle part : le profil du client n'est pas modifié.
 */

import { useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import { complementsPour, LIBELLES_DISCIPLINE } from "../lib/complements.js";
import { profilPourRepere } from "../lib/nutrition-perso.js";
import { TEXTES_COMPLEMENTS as T } from "../lib/textes-nutrition-perso.js";
import { Card, SectionTitle } from "./primitives.jsx";

const COULEUR_NIVEAU = { A: "good", B: "gold", C: "textFaint" };

const styleIntro = {
  fontSize: 12,
  color: COLORS.textMuted,
  margin: "4px 0 10px",
  lineHeight: 1.5
};
const styleMineur = {
  fontSize: 12,
  color: COLORS.warn,
  lineHeight: 1.5,
  margin: "0 0 8px"
};
const styleBloque = {
  fontSize: 12.5,
  color: COLORS.warn,
  lineHeight: 1.5,
  margin: 0
};
const styleListe = {
  display: "flex",
  flexDirection: "column",
  gap: 8
};
const styleFiche = {
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "9px 11px"
};
const styleBouton = {
  background: "none",
  border: "none",
  padding: 0,
  width: "100%",
  textAlign: "left",
  cursor: "pointer",
  color: COLORS.text,
  fontFamily: "inherit"
};
const styleLigneTitre = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "baseline"
};
const styleNom = {
  fontSize: 13,
  fontWeight: 600
};
const styleEffet = {
  fontSize: 11.5,
  color: COLORS.textMuted,
  marginTop: 2
};
const styleDetail = {
  fontSize: 11.5,
  color: COLORS.text,
  marginTop: 6,
  lineHeight: 1.5
};
const styleResume = {
  fontSize: 12,
  color: COLORS.gold,
  cursor: "pointer"
};
const styleEvite = {
  fontSize: 11.5,
  color: COLORS.textMuted,
  margin: "6px 0 0",
  lineHeight: 1.45
};
const stylePied = {
  fontSize: 10.5,
  color: COLORS.textFaint,
  margin: "8px 0 0",
  lineHeight: 1.45
};

/** `reglages` : les reponses du repere sur mesure (ecran Nutrition). */
export function CarteComplements({ profile, seances, reglages }) {
  const [ouvert, setOuvert] = useState(null);
  const r = useMemo(
    () => complementsPour(profilPourRepere(profile, reglages), { seances, aujourdhui: todayISO() }),
    [profile, seances, reglages]
  );
  return (
    <Card>
      <div data-complements={r.bloque ? "bloque" : r.liste.length}>
        <SectionTitle>{T.titre}</SectionTitle>
        <p style={styleIntro}>
          {T.intro}
          {r.discipline ? T.selection(LIBELLES_DISCIPLINE[r.discipline]) : ""}
        </p>
        {r.mineur && (
          <p data-complements-mineur style={styleMineur}>
            {r.raison}
          </p>
        )}
        {r.bloque ? (
          <p style={styleBloque}>{r.raison}</p>
        ) : (
          <div style={styleListe}>
            {r.liste.map((c) => {
              const niveau = T.niveaux[c.niveau] || T.niveaux.C;
              const couleur = COLORS[COULEUR_NIVEAU[c.niveau] || "textFaint"];
              const deplie = ouvert === c.id;
              return (
                <div key={c.id} data-complement={c.id} data-niveau={c.niveau} style={styleFiche}>
                  <button type="button" onClick={() => setOuvert(deplie ? null : c.id)} style={styleBouton}>
                    <div style={styleLigneTitre}>
                      <span style={styleNom}>{c.nom}</span>
                      <span style={{ fontSize: 10.5, color: couleur, flexShrink: 0 }}>{niveau}</span>
                    </div>
                    <div style={styleEffet}>{c.effet}</div>
                  </button>
                  {deplie && (
                    <div data-complement-detail style={styleDetail}>
                      <div>
                        <b>{T.dose}</b> {c.dose}
                      </div>
                      <div style={{ color: COLORS.warn }}>
                        <b>{T.precautions}</b> {c.precautions}
                      </div>
                      <div style={{ color: COLORS.textFaint }}>{T.source(c.source)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <details data-a-eviter style={{ marginTop: 10 }}>
          <summary style={styleResume}>{T.aEviter}</summary>
          {r.aEviter.map((a) => (
            <p key={a.nom} style={styleEvite}>
              <b>{T.nomEvite(a.nom)}</b>
              {a.raison}
            </p>
          ))}
        </details>
        <p style={stylePied}>{T.pied}</p>
      </div>
    </Card>
  );
}
