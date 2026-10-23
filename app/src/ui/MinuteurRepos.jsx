/**
 * Minuteur de repos entre deux series.
 *
 * Il demarre quand le client coche une serie. La fin est une HEURE, pas un
 * compte de secondes : un telephone qui met l'application en veille
 * suspend les minuteries JavaScript, et un decompte fait a la main
 * prendrait du retard. A la reprise, l'ecran affiche le vrai temps restant.
 *
 * A la fin : vibration (Android) et trois bips. iOS n'expose pas la
 * vibration aux sites web, et ne joue un son que si le contexte audio a ete
 * ouvert pendant un geste du client : d'ou `preparerSon`, appele au moment
 * ou il coche la serie.
 */

import { useEffect, useRef, useState } from "react";
import { COLORS } from "../tokens.js";
import { fmtChrono, fmtEcoule, PAS_MINUTEUR, TEXTES_SERIES } from "../lib/series.js";

let contexteAudio = null;

/** A appeler dans un geste du client (clic) : debloque le son sur iOS. */
export function preparerSon() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!contexteAudio) contexteAudio = new Ctx();
    if (contexteAudio.state === "suspended") contexteAudio.resume();
  } catch (e) {
    // Pas de son : le minuteur s'affiche quand meme.
  }
}

function signalerFin() {
  try {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } catch (e) {
    // Vibration refusee : sans consequence.
  }
  try {
    if (!contexteAudio) return;
    const t0 = contexteAudio.currentTime;
    [0, 0.25, 0.5].forEach((decalage) => {
      const osc = contexteAudio.createOscillator();
      const gain = contexteAudio.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t0 + decalage);
      gain.gain.exponentialRampToValueAtTime(0.3, t0 + decalage + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decalage + 0.18);
      osc.connect(gain).connect(contexteAudio.destination);
      osc.start(t0 + decalage);
      osc.stop(t0 + decalage + 0.2);
    });
  } catch (e) {
    // Pas de son : la vibration et l'affichage suffisent.
  }
}

/** Au-dela de ce retard, l'application revient de veille : pas de bip tardif. */
const RETARD_MAX_SIGNAL_MS = 5000;

/** Duree d'affichage de « Repos terminé » avant que le bandeau disparaisse. */
const AFFICHAGE_FIN_MS = 5000;

const styleBouton = {
  background: "none",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 9,
  padding: "8px 10px",
  color: COLORS.text,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  flexShrink: 0
};

/**
 * `chrono` : chronometre (23 octobre 2026). Il compte a partir de `debut`,
 * sans fin ni signal, jusqu'a ce que le client l'arrete ou coche la serie
 * suivante.
 */
export function MinuteurRepos({ chrono = false, debut, fin, duree, onAjuster, onFermer }) {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const signale = useRef(false);

  useEffect(() => {
    signale.current = false;
  }, [fin]);

  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const resteMs = chrono ? Infinity : fin - maintenant;
  const termine = !chrono && resteMs <= 0;

  useEffect(() => {
    if (!termine || signale.current) return;
    signale.current = true;
    if (-resteMs < RETARD_MAX_SIGNAL_MS) signalerFin();
    const t = setTimeout(onFermer, AFFICHAGE_FIN_MS);
    return () => clearTimeout(t);
  }, [termine]);

  const part = chrono ? 1 : duree > 0 ? Math.min(1, Math.max(0, resteMs / (duree * 1000))) : 0;
  const affiche = chrono ? fmtEcoule((maintenant - debut) / 1000) : fmtChrono(resteMs / 1000);

  return (
    <div
      role="timer"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
        maxWidth: 456,
        margin: "0 auto",
        zIndex: 60,
        background: "#111114",
        border: `1px solid ${termine ? COLORS.good : COLORS.gold}`,
        borderRadius: 14,
        padding: "10px 12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              color: termine ? COLORS.good : COLORS.textFaint,
              textTransform: "uppercase",
              letterSpacing: 0.5
            }}
          >
            {chrono ? TEXTES_SERIES.chrono : termine ? TEXTES_SERIES.minuteurFini : TEXTES_SERIES.minuteur}
          </div>
          <div
            style={{
              fontFamily: "IBM Plex Mono",
              fontSize: 26,
              fontWeight: 600,
              color: termine ? COLORS.good : COLORS.text,
              lineHeight: 1.1
            }}
          >
            {affiche}
          </div>
        </div>
        {!termine && !chrono && (
          <>
            <button onClick={() => onAjuster(-PAS_MINUTEUR)} style={styleBouton}>
              {TEXTES_SERIES.moins}
            </button>
            <button onClick={() => onAjuster(PAS_MINUTEUR)} style={styleBouton}>
              {TEXTES_SERIES.plus}
            </button>
          </>
        )}
        <button onClick={onFermer} style={{ ...styleBouton, color: COLORS.gold, borderColor: COLORS.gold }}>
          {chrono ? TEXTES_SERIES.arreter : TEXTES_SERIES.passer}
        </button>
      </div>
      <div style={{ height: 3, background: COLORS.border, borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${part * 100}%`, background: COLORS.gold, transition: "width 0.25s linear" }} />
      </div>
    </div>
  );
}
