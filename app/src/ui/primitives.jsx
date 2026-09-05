/**
 * Primitives d'interface.
 *
 * Traduction fidele des composants de index.html (lignes ~2062-2118), du
 * format React.createElement vers JSX. Les styles sont repris a l'identique :
 * l'ancienne et la nouvelle version doivent etre indistinguables a l'oeil
 * pendant toute la migration.
 *
 * Toute retouche esthetique attendra la fin de la bascule. Melanger migration
 * et redesign rendrait impossible de dire, devant un affichage inattendu, si
 * c'est un bug de portage ou un choix assume.
 */

import { COLORS, POLICES } from "../tokens.js";
import { addDays, clamp, fmtDateLong, todayISO } from "../lib/dates.js";

export function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: 18,
        ...style
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }) {
  return (
    <h3
      style={{
        fontFamily: POLICES.titre,
        fontSize: 13.5,
        fontWeight: 600,
        color: COLORS.gold,
        textTransform: "uppercase",
        letterSpacing: 1,
        margin: 0
      }}
    >
      {children}
    </h3>
  );
}

export function Btn({ children, onClick, variant = "primary", icon: Icone, style, disabled }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: POLICES.texte,
    fontWeight: 600,
    fontSize: 14,
    borderRadius: 10,
    padding: "10px 16px",
    border: "1px solid transparent",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1
  };
  const variantes = {
    primary: {
      background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.gold})`,
      color: "#0B0B0C",
      fontWeight: 700
    },
    ghost: { background: "transparent", color: COLORS.text, border: `1px solid ${COLORS.border}` },
    danger: { background: "transparent", color: COLORS.bad, border: `1px solid ${COLORS.bad}55` }
  };
  return (
    <button disabled={disabled} onClick={onClick} style={{ ...base, ...variantes[variant], ...style }}>
      {Icone && <Icone size={16} />}
      {children}
    </button>
  );
}

export function IconBtn({ children, onClick, danger, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "none",
        border: "none",
        color: danger ? COLORS.bad : COLORS.textMuted,
        cursor: "pointer",
        padding: 6,
        borderRadius: 8
      }}
    >
      {children}
    </button>
  );
}

const styleChamp = {
  width: "100%",
  background: COLORS.bgAlt,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "10px 12px",
  color: COLORS.text,
  fontFamily: POLICES.texte,
  fontSize: 14,
  outline: "none"
};

export function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
      <label
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.5
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function TextInput(props) {
  return <input {...props} style={{ ...styleChamp, ...(props.style || {}) }} />;
}

export function NumberInput(props) {
  return <input type="number" {...props} style={{ ...styleChamp, ...(props.style || {}) }} />;
}

export function TextArea(props) {
  return (
    <textarea
      rows={props.rows || 3}
      {...props}
      style={{ ...styleChamp, resize: "vertical", ...(props.style || {}) }}
    />
  );
}

export function SelectInput({ options, ...props }) {
  return (
    <select {...props} style={{ ...styleChamp, ...(props.style || {}) }}>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function EmptyState({ icon: Icone, message, ctaLabel, onCta, iconeCta: IconeCta }) {
  return (
    <div style={{ textAlign: "center", padding: "44px 16px", color: COLORS.textMuted }}>
      {Icone && <Icone size={30} style={{ color: COLORS.textFaint, marginBottom: 12 }} />}
      <p style={{ fontSize: 13.5, marginBottom: 16, lineHeight: 1.5 }}>{message}</p>
      {ctaLabel && (
        <Btn onClick={onCta} icon={IconeCta}>
          {ctaLabel}
        </Btn>
      )}
    </div>
  );
}

export function StatChip({ icon: Icone, label, value, sub }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: COLORS.bgAlt,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: "12px 14px"
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: `${COLORS.gold}1F`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        {Icone && <Icone size={17} style={{ color: COLORS.gold }} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: POLICES.titre,
            fontSize: 17,
            fontWeight: 600,
            color: COLORS.text,
            lineHeight: 1.1
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 10.5, color: COLORS.textMuted, marginTop: 2 }}>
          {label}
          {sub ? ` · ${sub}` : ""}
        </div>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = 480, iconeFermer: IconeFermer }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: width }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18
          }}
        >
          <h3
            style={{
              fontFamily: POLICES.titre,
              fontSize: 18,
              fontWeight: 600,
              color: COLORS.text,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              margin: 0
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "none",
              border: "none",
              color: COLORS.textMuted,
              cursor: "pointer",
              padding: 4
            }}
          >
            {IconeFermer ? <IconeFermer size={21} /> : "×"}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Objectif de macronutriment.
 *
 * Repris de MacroTarget (index.html, ligne 2102). Une valeur absente
 * s'affiche en tiret plutot qu'en zero : « 0 g de proteines » serait un
 * objectif, « — » se lit comme une absence de calcul.
 */
export function MacroTarget({ label, value, unit }) {
  return (
    <div
      style={{
        background: COLORS.bgAlt,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: "10px 12px"
      }}
    >
      <div style={{ fontFamily: "Poppins", fontSize: 19, fontWeight: 600, color: COLORS.text }}>
        {value != null ? value : "—"}
        <span style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 4 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 10.5, color: COLORS.textMuted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

/**
 * Barre de progression fine.
 *
 * Repris de MiniBar (index.html, ligne 2105). Le pourcentage est borne :
 * une valeur au-dela de 100 debordrait de son conteneur au lieu d'etre
 * simplement « au-dessus de l'objectif ».
 */
export function MiniBar({ label, pct, valueLabel, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: COLORS.textMuted,
          marginBottom: 4
        }}
      >
        <span>{label}</span>
        <span style={{ color: COLORS.text, fontFamily: "IBM Plex Mono" }}>{valueLabel}</span>
      </div>
      <div style={{ height: 6, background: COLORS.bgAlt, borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${clamp(pct || 0, 0, 100)}%`,
            background: color || COLORS.gold,
            borderRadius: 4,
            transition: "width .4s ease"
          }}
        />
      </div>
    </div>
  );
}

/**
 * Echelle de notation de 1 a N.
 *
 * Repris de ScaleField (index.html, ligne 2107). Des boutons plutot qu'un
 * curseur : sur telephone, viser une valeur precise sur un curseur est
 * penible, et ces notes sont saisies tous les jours.
 */
export function ScaleField({ label, max, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 6
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${value === n ? COLORS.gold : COLORS.border}`,
              background: value === n ? `${COLORS.gold}33` : COLORS.bgAlt,
              color: value === n ? COLORS.gold : COLORS.textMuted,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer"
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Anneau de progression.
 *
 * Repris de ProgressRing (index.html, ligne 2116). Le trace part du haut
 * (rotation de -90°) : un anneau qui demarrerait a 3 heures se lit mal.
 */
export function ProgressRing({ value, size = 110, stroke = 10, label }) {
  const rayon = (size - stroke) / 2;
  const circonference = 2 * Math.PI * rayon;
  const pct = clamp(value, 0, 100);
  const decalage = circonference * (1 - pct / 100);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={COLORS.amber} />
            <stop offset="100%" stopColor={COLORS.gold} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={rayon} fill="none" stroke={COLORS.bgAlt} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={rayon}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circonference}
          strokeDashoffset={decalage}
          style={{ transition: "stroke-dashoffset .8s ease-out" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <span
          style={{
            fontFamily: POLICES.titre,
            fontSize: size * 0.26,
            fontWeight: 600,
            color: COLORS.text,
            lineHeight: 1
          }}
        >
          {Math.round(pct)}
        </span>
        {label && (
          <span
            style={{
              fontSize: 10,
              letterSpacing: 1,
              color: COLORS.textMuted,
              marginTop: 4,
              textTransform: "uppercase"
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Navigation de jour en jour.
 *
 * Repris de DateNav (index.html, ligne 2122). Le bouton « Aujourd'hui »
 * n'apparait que lorsqu'on s'est eloigne : toujours visible, il occuperait
 * de la place sans rien proposer.
 */
export function DateNav({ date, onChange, iconePrecedent: Precedent, iconeSuivant: Suivant }) {
  const cEstAujourdhui = date === todayISO();
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
      <IconBtn onClick={() => onChange(addDays(date, -1))}>
        {Precedent ? <Precedent size={18} /> : "‹"}
      </IconBtn>
      <div
        style={{
          flex: 1,
          textAlign: "center",
          background: COLORS.bgAlt,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 13.5,
          color: COLORS.text,
          fontWeight: 600,
          minWidth: 140
        }}
      >
        {fmtDateLong(date)}
      </div>
      <IconBtn onClick={() => onChange(addDays(date, 1))}>{Suivant ? <Suivant size={18} /> : "›"}</IconBtn>
      {!cEstAujourdhui && (
        <Btn variant="ghost" onClick={() => onChange(todayISO())} style={{ padding: "8px 12px", fontSize: 12 }}>
          Aujourd'hui
        </Btn>
      )}
    </div>
  );
}

/**
 * Bilan IA mis en forme par sections.
 *
 * Repris de SectionedBilan (index.html, ligne 2127). Les couleurs portent
 * le sens : vert pour ce qui va, orange pour ce qui merite attention,
 * rouge pour ce qui doit changer. Les actions sont numerotees, pas a
 * puces — ce sont des consignes ordonnees, pas une liste d'idees.
 */
export function SectionedBilan({ sections }) {
  if (!sections) return null;

  const groupes = [
    { cle: "points_forts", titre: "Points forts", couleur: COLORS.good },
    { cle: "vigilance", titre: "Vigilance", couleur: COLORS.warn },
    { cle: "a_corriger", titre: "À corriger", couleur: COLORS.bad }
  ];

  const enTete = (couleur) => ({
    fontSize: 11,
    fontWeight: 600,
    color: couleur,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sections.resume && (
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: COLORS.text, margin: 0 }}>{sections.resume}</p>
      )}

      {sections.evolution && (
        <div>
          <div style={enTete(COLORS.textMuted)}>Évolution</div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: COLORS.textMuted, margin: 0 }}>{sections.evolution}</p>
        </div>
      )}

      {groupes.map(
        (g) =>
          (sections[g.cle] || []).length > 0 && (
            <div key={g.cle}>
              <div style={enTete(g.couleur)}>{g.titre}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {sections[g.cle].map((ligne, i) => (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: g.couleur, marginTop: 5, fontSize: 8 }}>●</span>
                    <span style={{ fontSize: 13, lineHeight: 1.5, color: COLORS.text }}>{ligne}</span>
                  </div>
                ))}
              </div>
            </div>
          )
      )}

      {(sections.actions || []).length > 0 && (
        <div>
          <div style={enTete(COLORS.gold)}>Actions pour la semaine prochaine</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sections.actions.map((ligne, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <span style={{ color: COLORS.gold, fontFamily: "IBM Plex Mono", fontSize: 12, fontWeight: 600 }}>
                  {i + 1}.
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.5, color: COLORS.text }}>{ligne}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
