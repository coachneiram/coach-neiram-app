/**
 * Icônes de Feu Vert (14 novembre 2026).
 *
 * Hors de icones.jsx, qui ne contient que les dessins repris à l'identique
 * de l'application d'origine (tests/icones.test.mjs) : celles-ci n'y ont
 * jamais existé. Même grille 24 × 24, même trait que mkIcon.
 */

function icone(contenu) {
  return function Icone({ size = 16, color = "currentColor", style }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
        {contenu}
      </svg>
    );
  };
}

/** Feu tricolore : onglet Feu Vert. */
export const FeuTricolore = icone(
  <>
    <rect x="7" y="2" width="10" height="20" rx="3" />
    <circle cx="12" cy="7" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="17" r="1.6" />
  </>
);

/** Coche : séance pointée. */
export const Coche = icone(<path d="M20 6 9 17l-5-5" />);
