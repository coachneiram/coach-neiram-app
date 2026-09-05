import { COLORS, POLICES } from "./tokens.js";

/**
 * Page temoin de la phase 3.
 *
 * Elle ne fait rien d'utile : son seul role est de prouver que la chaine
 * Vite + React fonctionne et que les jetons de design sont bien appliques.
 * Les ecrans reels arriveront un par un a la phase 5, sans jamais interrompre
 * l'application actuelle.
 */
export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: POLICES.texte,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <p
          style={{
            fontSize: 10,
            letterSpacing: 2.5,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            fontWeight: 600,
            margin: 0
          }}
        >
          Coaching sportif
        </p>
        <h1
          style={{
            fontFamily: POLICES.titre,
            fontSize: 28,
            margin: "6px 0 18px",
            color: COLORS.gold
          }}
        >
          Coach Neiram
        </h1>

        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 18
          }}
        >
          <p style={{ margin: 0, lineHeight: 1.6, fontSize: 14 }}>
            Nouvelle architecture, en construction.
          </p>
          <p
            style={{
              margin: "10px 0 0",
              lineHeight: 1.6,
              fontSize: 13,
              color: COLORS.textMuted
            }}
          >
            Cette page n'est pas l'application. Le suivi reste servi par{" "}
            <span style={{ fontFamily: POLICES.chiffres, color: COLORS.text }}>index.html</span>,
            inchange et pleinement fonctionnel. Les ecrans seront migres un par un,
            sans interruption de service.
          </p>
        </div>

        <p
          style={{
            marginTop: 14,
            fontSize: 11.5,
            color: COLORS.textFaint,
            fontFamily: POLICES.chiffres
          }}
        >
          Phase 3 — bootstrap Vite
        </p>
      </div>
    </div>
  );
}
