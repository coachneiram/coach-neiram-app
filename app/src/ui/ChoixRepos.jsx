/**
 * Menu de repos d'un exercice, partage par la seance et par la seance type.
 *
 * Demande du coach (23 octobre 2026) : 5 min maximum ne suffisaient pas.
 * Le menu propose des durees jusqu'a 10 min, « Autre durée… » (champ en
 * minutes, sans plafond) et « Chronomètre » (compte a partir de 0 quand la
 * serie est cochee, jusqu'a « Arrêter »).
 */

import { COLORS } from "../tokens.js";
import {
  CHOIX_AUTRE,
  choisirRepos,
  dureesMenuRepos,
  fmtDuree,
  minutesDeRepos,
  REPOS_CHRONO,
  reposDepuisMinutes,
  TEXTES_SERIES,
  valeurMenuRepos
} from "../lib/series.js";

const champ = {
  background: COLORS.bgAlt,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  color: COLORS.text,
  fontFamily: "Inter",
  fontSize: 13,
  outline: "none",
  padding: "7px 4px",
  flexShrink: 0
};

export function ChoixRepos({ ex, onChange, largeur = 132 }) {
  return (
    <>
      <select
        aria-label={TEXTES_SERIES.ariaRepos}
        value={valeurMenuRepos(ex)}
        onChange={(e) => onChange(choisirRepos(ex, e.target.value))}
        style={{ ...champ, width: largeur }}
      >
        {dureesMenuRepos(ex).map((d) => (
          <option key={d} value={String(d)}>
            {fmtDuree(d)}
          </option>
        ))}
        <option value={CHOIX_AUTRE}>{TEXTES_SERIES.autreDuree}</option>
        <option value={REPOS_CHRONO}>{TEXTES_SERIES.chronometre}</option>
      </select>
      {ex && ex.reposLibre && (
        <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <input
            type="number"
            inputMode="decimal"
            min="0.25"
            step="0.25"
            aria-label={TEXTES_SERIES.ariaMinutes}
            defaultValue={minutesDeRepos(ex)}
            onChange={(e) => {
              const s = reposDepuisMinutes(e.target.value);
              if (s) onChange({ repos: s, reposLibre: true });
            }}
            style={{ ...champ, width: 54, textAlign: "center", padding: "7px 2px" }}
          />
          <span style={{ fontSize: 11, color: COLORS.textFaint }}>{TEXTES_SERIES.minutes}</span>
        </span>
      )}
    </>
  );
}
