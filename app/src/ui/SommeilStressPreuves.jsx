/**
 * Sommeil et stress, au-delà des trois conseils du jour (repris de l'app
 * Neiram, 24 octobre 2026 ; tout est inclus dans l'app coach) :
 *  - RespirationGuidee : 5 minutes de soupir cyclique guidé (Balban 2023 ;
 *    Fincham 2023) ;
 *  - AlertesSommeilStress (toujours affichée) : quand en parler à un
 *    médecin, et le 3114. En coaching en ligne, le coach est prévenu quand
 *    une alerte s'active (lib/moteur-alertes.js) ;
 *  - RegulariteSommeil : variation de l'heure de lever ;
 *  - BibliothequePreuves : tous les conseils avec leur source, leur niveau
 *    de preuve et l'effet mesuré (lib/sommeil-preuves.js).
 */

import { useEffect, useRef, useState } from "react";
import { COLORS } from "../tokens.js";
import { DUREE_RESPIRATION_S, PREUVES_SOMMEIL_STRESS, TEXTES_SOMMEIL_STRESS as T, THEMES_PREUVES, preuveParId } from "../lib/sommeil-preuves.js";
import { regulariteLever, signauxAlerte } from "../lib/sommeil.js";
import { Btn, Card, SectionTitle } from "./primitives.jsx";

const texteDoux = { fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 };
const styleTheme = (actif) => ({
  padding: "6px 10px",
  borderRadius: 999,
  border: `1px solid ${actif ? COLORS.gold : COLORS.border}`,
  background: actif ? `${COLORS.gold}22` : "transparent",
  color: actif ? COLORS.gold : COLORS.text,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontFamily: "inherit"
});
const styleThemes = { display: "flex", overflowX: "auto", padding: "8px 0", gap: 6 };
const styleConseil = {
  background: "none",
  border: "none",
  padding: 0,
  textAlign: "left",
  color: COLORS.text,
  fontSize: 12.5,
  lineHeight: 1.5,
  cursor: "pointer",
  fontFamily: "inherit"
};

export function RespirationGuidee() {
  const [actif, setActif] = useState(false);
  const [ecoule, setEcoule] = useState(0);
  const minuterie = useRef(null);
  useEffect(() => {
    if (!actif) return undefined;
    minuterie.current = setInterval(() => setEcoule((e) => e + 1), 1000);
    return () => clearInterval(minuterie.current);
  }, [actif]);
  useEffect(() => {
    if (ecoule >= DUREE_RESPIRATION_S) setActif(false);
  }, [ecoule]);
  const cycle = T.phases.reduce((t, p) => t + p.secondes, 0);
  let t = ecoule % cycle;
  const phase = T.phases.find((p) => (t -= p.secondes) < 0) || T.phases[0];
  const reste = DUREE_RESPIRATION_S - ecoule;
  const fini = ecoule >= DUREE_RESPIRATION_S;
  return (
    <Card style={{ padding: 14 }}>
      <div data-respiration>
        <SectionTitle tuto="sommeil-stress">{T.respirationTitre}</SectionTitle>
        <p style={{ ...texteDoux, margin: "6px 0 10px" }}>{T.respirationIntro}</p>
        {actif && (
          <div style={{ textAlign: "center", margin: "8px 0 12px" }}>
            <div data-phase-respiration style={{ fontSize: 17, fontWeight: 700, color: COLORS.gold }}>
              {phase.texte}
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 4 }}>
              {Math.floor(reste / 60)}:{String(reste % 60).padStart(2, "0")}
            </div>
          </div>
        )}
        {fini && !actif && <p style={{ fontSize: 12.5, color: COLORS.good, margin: "0 0 10px" }}>{T.respirationBravo}</p>}
        <Btn
          variant={actif ? "ghost" : "primary"}
          onClick={() => {
            if (actif) setActif(false);
            else {
              setEcoule(0);
              setActif(true);
            }
          }}
          style={{ width: "100%" }}
        >
          {actif ? T.arreter : fini ? T.recommencer : T.commencer}
        </Btn>
      </div>
    </Card>
  );
}

function Alerte({ id, children }) {
  const p = preuveParId(id);
  return (
    <div data-alerte={id} style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.5, marginTop: 6 }}>
      ⚠️ {p ? p.conseil : null} {children}
    </div>
  );
}

/** Signaux d'alerte personnalisés ; le 3114 reste toujours visible. */
export function AlertesSommeilStress({ entrees, coachPrevenu = false }) {
  const s = signauxAlerte(entrees);
  const alerte = s.nuitsDifficiles || s.stressDurable;
  return (
    <Card style={alerte ? { padding: 14, borderColor: COLORS.warn } : { padding: 14 }}>
      <div data-alertes-sommeil-stress>
        <SectionTitle tuto="sommeil-stress">{T.alertesTitre}</SectionTitle>
        {s.nuitsDifficiles && <Alerte id="R01">{T.alerteNuits}</Alerte>}
        {s.stressDurable && <Alerte id="R03">{T.alerteStress}</Alerte>}
        {alerte && coachPrevenu && <p style={{ ...texteDoux, margin: "6px 0 0" }}>{T.alerteCoach}</p>}
        {!alerte && <p style={{ ...texteDoux, margin: "6px 0 0" }}>{T.alertesSans}</p>}
        <p data-numero-3114 style={{ ...texteDoux, margin: "8px 0 0" }}>
          {T.numero3114} <strong style={{ color: COLORS.text }}>3114</strong>
          {T.numero3114Suite}
        </p>
      </div>
    </Card>
  );
}

/** Variation de l'heure de lever sur 14 jours. */
export function RegulariteSommeil({ entrees }) {
  const r = regulariteLever(entrees);
  const morceaux = r ? T.regularite(r.ecartMin, r.nuits) : null;
  return (
    <Card style={{ padding: 14 }}>
      <div data-regularite-sommeil>
        <SectionTitle tuto="sommeil-stress">{T.regulariteTitre}</SectionTitle>
        {!r ? (
          <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "6px 0 0", lineHeight: 1.5 }}>{T.regulariteVide}</p>
        ) : (
          <>
            <div style={{ fontSize: 13, color: COLORS.text, marginTop: 6 }}>
              {morceaux[0]}
              <strong style={{ color: r.ecartMin > 60 ? COLORS.warn : COLORS.gold }}>{morceaux[1]}</strong>
              {morceaux[2]}
            </div>
            <p style={{ ...texteDoux, margin: "6px 0 0" }}>{r.ecartMin > 60 ? T.regulariteIrreguliere : T.regulariteBonne}</p>
          </>
        )}
      </div>
    </Card>
  );
}

/** Tous les conseils, avec leurs preuves. */
export function BibliothequePreuves() {
  const [theme, setTheme] = useState("sommeil");
  const [ouvert, setOuvert] = useState(null);
  return (
    <Card style={{ padding: 14 }}>
      <div data-bibliotheque-preuves>
        <SectionTitle tuto="sommeil-stress">{T.bibliothequeTitre}</SectionTitle>
        <div style={styleThemes}>
          {THEMES_PREUVES.map((th) => (
            <button
              key={th.id}
              type="button"
              data-theme-preuves={th.id}
              aria-pressed={theme === th.id}
              onClick={() => setTheme(th.id)}
              style={styleTheme(theme === th.id)}
            >
              {th.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PREUVES_SOMMEIL_STRESS.filter((p) => p.theme === theme).map((p) => (
            <div key={p.id} data-preuve={p.id} style={{ background: COLORS.bgAlt, borderRadius: 10, padding: "10px 12px" }}>
              <button type="button" onClick={() => setOuvert(ouvert === p.id ? null : p.id)} style={styleConseil}>
                {ouvert === p.id ? "▾" : "▸"} {p.conseil}
              </button>
              {ouvert === p.id && (
                <div style={{ fontSize: 11.5, color: COLORS.textMuted, lineHeight: 1.5, marginTop: 6 }}>
                  <div>{p.pourquoi}</div>
                  {p.effet && <div style={{ marginTop: 4 }}>{T.effet + p.effet}</div>}
                  <div style={{ marginTop: 4 }}>{T.niveau + p.niveau}</div>
                  <div style={{ marginTop: 4, color: COLORS.textFaint }}>{T.sources + p.sources.join(" ; ")}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
