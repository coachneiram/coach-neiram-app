/**
 * Coque de l'application : menu, en-tete mobile et barre du bas.
 *
 * Portage fidele de la structure de App (index.html, ligne 4940) et de la
 * liste TABS (216).
 *
 * Deux dispositions coexistent plutot qu'une seule adaptee : menu lateral
 * sur ordinateur, barre en bas sur telephone. C'est le CSS qui choisit,
 * a 760 px. Les libelles different eux aussi — « Entraînements » en toutes
 * lettres a gauche, « Séances » dans la barre du bas, ou la place manque.
 */

import { COLORS, POLICES } from "../tokens.js";
import { ONGLETS as LISTE_ONGLETS } from "../lib/onglets.js";
import { Apple, BookOpen, Dumbbell, Moon, Ruler, Settings, TrendingUp, UtensilsCrossed, X } from "./icones.jsx";

/** Icone de chaque onglet. La liste elle-meme vit dans lib/onglets.js. */
const ICONES = {
  entrainements: Dumbbell,
  repas: UtensilsCrossed,
  nutrition: Apple,
  sommeil: Moon,
  mensurations: Ruler,
  journal: BookOpen,
  tendances: TrendingUp
};

export const ONGLETS = LISTE_ONGLETS.map((o) => ({ ...o, icon: ICONES[o.id] }));

function Marque({ taille, tailleTitre, tailleSurtitre }) {
  return (
    <>
      <Dumbbell size={taille} color={COLORS.gold} style={{ transform: "rotate(-20deg)", flexShrink: 0 }} />
      <div>
        <div style={{ fontFamily: POLICES.titre, fontWeight: 800, fontSize: tailleTitre, lineHeight: 1.05 }}>
          Coach Neiram
        </div>
        <div
          style={{
            fontFamily: POLICES.titre,
            fontSize: tailleSurtitre,
            letterSpacing: 2.2,
            color: COLORS.textMuted,
            marginTop: 2,
            fontWeight: 600,
            textTransform: "uppercase"
          }}
        >
          Coaching Sportif
        </div>
      </div>
    </>
  );
}

/** Bandeau de notification passagere (hydratation, enregistrement...). */
export function Toast({ message, onClose, icone: Icone }) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      {Icone && <Icone size={15} color={COLORS.blue} style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        aria-label="Fermer"
        style={{
          background: "none",
          border: "none",
          color: COLORS.textMuted,
          cursor: "pointer",
          padding: 2,
          display: "flex"
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function Coque({ ongletActif, onChangerOnglet, onOuvrirReglages, toast, onFermerToast, iconeToast, children }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: POLICES.texte, color: COLORS.text }}>
      <Toast message={toast} onClose={onFermerToast} icone={iconeToast} />

      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <Marque taille={22} tailleTitre={14.5} tailleSurtitre={7.5} />
          </div>

          <nav className="nav-list">
            {ONGLETS.map((o) => (
              <button
                key={o.id}
                onClick={() => onChangerOnglet(o.id)}
                className={`nav-item ${ongletActif === o.id ? "active" : ""}`}
              >
                <o.icon size={17} />
                <span>{o.label}</span>
              </button>
            ))}
          </nav>

          <button className="profile-link" onClick={onOuvrirReglages}>
            <Settings size={16} />
            <span>Mon profil &amp; réglages</span>
          </button>
        </aside>

        <div style={{ flex: 1, minWidth: 0 }}>
          <header className="mobile-header">
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Marque taille={19} tailleTitre={13} tailleSurtitre={6.5} />
            </div>
            <button
              onClick={onOuvrirReglages}
              aria-label="Réglages"
              style={{
                background: "none",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: 8,
                color: COLORS.textMuted,
                cursor: "pointer",
                display: "flex"
              }}
            >
              <Settings size={17} />
            </button>
          </header>

          <main className="main-content">{children}</main>
        </div>

        <nav className="bottom-nav">
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              onClick={() => onChangerOnglet(o.id)}
              className={ongletActif === o.id ? "active" : ""}
            >
              <o.icon size={19} />
              <span>{o.short}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
