/**
 * Progression du corps : poids et mensurations depuis la premiere mesure.
 *
 * Affichee dans Mensurations (une tuile choisit la courbe detaillee) et
 * dans Tendances. Le calcul est dans lib/progression-corps.js ; ce fichier
 * ne fait que montrer.
 */

import { COLORS } from "../tokens.js";
import { fmtEcart, fmtValeur, pointsMiniCourbe } from "../lib/progression-corps.js";
import { Card, SectionTitle } from "./primitives.jsx";

/** Vert quand l'ecart va dans le sens de l'objectif ; or sinon, jamais rouge. */
const couleurDe = (sens) => (sens === "bon" ? COLORS.good : COLORS.gold);

function MiniCourbe({ valeurs, couleur }) {
  const points = pointsMiniCourbe(valeurs, 100, 28, 2);
  if (!points) return null;
  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      style={{
        width: "100%",
        height: 28,
        display: "block"
      }}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={couleur}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Tuile({ ligne, choisie, onChoisir }) {
  const couleur = couleurDe(ligne.sens);
  const style = {
    background: COLORS.bgAlt,
    border: `1px solid ${choisie ? COLORS.gold : COLORS.border}`,
    borderRadius: 10,
    padding: "10px 12px",
    textAlign: "left",
    width: "100%",
    cursor: onChoisir ? "pointer" : "default",
    font: "inherit",
    color: "inherit"
  };
  const contenu = (
    <>
      <div style={{ fontSize: 10.5, color: COLORS.textMuted }}>{ligne.label}</div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginTop: 3,
          flexWrap: "wrap"
        }}
      >
        <span style={{ fontFamily: "Poppins", fontSize: 17, fontWeight: 700, color: COLORS.text }}>
          {fmtValeur(ligne.actuel)}
          <span style={{ fontSize: 10, color: COLORS.textMuted, marginLeft: 2 }}>{ligne.unite}</span>
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: couleur, fontFamily: "IBM Plex Mono" }}>
          {fmtEcart(ligne.ecart)}
        </span>
      </div>
      <div style={{ marginTop: 6 }}>
        <MiniCourbe valeurs={ligne.serie.map((s) => s.value)} couleur={couleur} />
      </div>
    </>
  );
  return onChoisir ? (
    <button type="button" data-tuile-progression={ligne.id} onClick={() => onChoisir(ligne.id)} style={style}>
      {contenu}
    </button>
  ) : (
    <div data-tuile-progression={ligne.id} style={style}>
      {contenu}
    </div>
  );
}

/* TEXTE-NOUVEAU
   Progression du corps (poids et mensurations depuis la premiere mesure,
   mini-courbes et phrase de felicitation), ajoutee a la demande du coach le
   6 octobre 2026 pour que le client voie ses progres dans Mensurations,
   Tendances et le bilan mensuel. Aucun de ces libelles n'existe dans
   index.html. */
export function ProgressionCorps({ progression, choisie, onChoisir }) {
  if (!progression || !progression.lignes.length) return null;
  const qualifie = progression.lignes.some((l) => l.sens !== "neutre");
  return (
    <Card>
      <div data-progression-corps>
        <SectionTitle>Ma progression</SectionTitle>
        <div
          data-titre-progression
          style={{
            marginTop: 12,
            background: `${COLORS.gold}14`,
            border: `1px solid ${COLORS.gold}44`,
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.text,
            lineHeight: 1.45
          }}
        >
          {progression.titre}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))",
            gap: 8,
            marginTop: 12
          }}
        >
          {progression.lignes.map((l) => (
            <Tuile key={l.id} ligne={l} choisie={choisie === l.id} onChoisir={onChoisir} />
          ))}
        </div>
        <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "10px 0 0", lineHeight: 1.5 }}>
          Écart depuis ta première mesure.
          {qualifie ? " En vert : dans le sens de ton objectif." : ""}
          {onChoisir ? " Touche une mesure pour voir sa courbe." : ""}
        </p>
      </div>
    </Card>
  );
}

/** Poids et mensurations du mois, en clair, avant meme le bilan IA. */
export function EvolutionDuMois({ monthStats }) {
  if (!monthStats) return null;
  const lignes = [];
  if (monthStats.latestWeight != null && monthStats.weightDelta != null) {
    lignes.push({ id: "poids", label: "Poids", actuel: monthStats.latestWeight, ecart: monthStats.weightDelta, unite: "kg" });
  }
  (monthStats.measureDeltas || [])
    .filter((m) => m.delta != null)
    .forEach((m) => lignes.push({ id: m.id, label: m.label, actuel: m.latest, ecart: m.delta, unite: "cm" }));
  if (!lignes.length) return null;
  return (
    <div data-evolution-mois style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
        Évolution du mois
      </div>
      {lignes.map((l) => (
        <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "4px 0" }}>
          <span style={{ color: COLORS.textMuted }}>{l.label}</span>
          <span style={{ color: COLORS.text, fontFamily: "IBM Plex Mono" }}>
            {fmtValeur(l.actuel)} {l.unite} <span style={{ color: COLORS.gold }}>({fmtEcart(l.ecart)})</span>
          </span>
        </div>
      ))}
    </div>
  );
}
/* FIN-TEXTE-NOUVEAU */
