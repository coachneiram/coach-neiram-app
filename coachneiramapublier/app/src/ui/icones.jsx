/**
 * Icones.
 *
 * Portage fidele des icones de index.html (fonction mkIcon, lignes ~47-75).
 * Ce sont des SVG ecrits a la main, sans dependance : aucune bibliotheque
 * d'icones n'est ajoutee, pour que le rendu reste identique au pixel pres
 * et que le poids du bundle ne bouge pas.
 *
 * Seules les icones effectivement utilisees par les ecrans deja migres sont
 * reprises ici. Les autres suivront au fur et a mesure de la migration.
 */

function mkIcon(children) {
  return function Icone({ size = 16, color = "currentColor", fill = "none", style, className }) {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
      >
        {children}
      </svg>
    );
  };
}

export const Moon = mkIcon(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />);

export const Star = mkIcon(
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
);

export const Plus = mkIcon(<path d="M5 12h14M12 5v14" />);

export const X = mkIcon(<path d="M18 6 6 18M6 6l12 12" />);

export const Pencil = mkIcon(<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />);

export const Trash2 = mkIcon(
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </>
);

export const Ruler = mkIcon(
  <>
    <rect x="2" y="8" width="20" height="8" rx="1.5" />
    <path d="M6 8v3M10 8v4M14 8v3M18 8v4" />
  </>
);

export const Dumbbell = mkIcon(
  <>
    <rect x="1.5" y="9" width="2.6" height="6" rx="1" />
    <rect x="5.3" y="7" width="2.8" height="10" rx="1" />
    <line x1="8.1" y1="12" x2="15.9" y2="12" />
    <rect x="15.9" y="7" width="2.8" height="10" rx="1" />
    <rect x="19.9" y="9" width="2.6" height="6" rx="1" />
  </>
);
