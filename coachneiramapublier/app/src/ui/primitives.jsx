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
