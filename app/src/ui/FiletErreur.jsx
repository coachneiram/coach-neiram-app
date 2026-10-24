/**
 * Filets contre les plantages d'affichage.
 *
 * Sans eux, une seule donnee abimee (sauvegarde ancienne, saisie mal
 * enregistree) qui fait planter un ecran demonte TOUTE l'app : ecran noir,
 * plus aucun moyen d'exporter son suivi. Or les donnees n'existent que sur
 * le telephone.
 *
 * Deux niveaux :
 *  - FiletEcran, autour de chaque onglet : l'onglet affiche un message,
 *    la barre d'onglets reste utilisable ;
 *  - FiletApp, autour de toute l'app : dernier recours, plein ecran.
 * Les deux proposent d'abord de sauvegarder les donnees.
 *
 * Rien n'est envoye nulle part : l'erreur va seulement dans la console.
 */

import { Component, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { construireSauvegarde } from "../lib/stockage.js";
import { exporterSauvegarde } from "../lib/sauvegarde.js";
import { TEXTES_FILET } from "../lib/textes-filet.js";

const T = TEXTES_FILET;

/** Bouton « Sauvegarder mes données », utilisable meme app en panne. */
function BoutonSauvegarde() {
  const [etat, setEtat] = useState(null);
  const sauvegarder = async () => {
    try {
      const r = await exporterSauvegarde(construireSauvegarde(), null);
      setEtat(r === "cancelled" ? null : "ok");
    } catch (e) {
      setEtat("echec");
    }
  };
  return (
    <>
      <button type="button" onClick={sauvegarder} style={styleBouton(true)}>
        {T.sauvegarder}
      </button>
      {etat === "ok" && <p style={styleNote}>{T.sauvegardeFaite}</p>}
      {etat === "echec" && <p style={styleNote}>{T.sauvegardeEchec}</p>}
    </>
  );
}

const styleBouton = (principal) => ({
  display: "block",
  width: "100%",
  padding: "12px 16px",
  marginTop: 10,
  borderRadius: 10,
  border: principal ? "none" : `1px solid ${COLORS.border}`,
  background: principal ? COLORS.gold : "transparent",
  color: principal ? "#1A1503" : COLORS.text,
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer"
});
const styleEcran = { maxWidth: 420, margin: "0 auto", padding: "24px 4px" };
const styleNote = { fontSize: 12.5, color: COLORS.textMuted, margin: "8px 0 0", lineHeight: 1.5 };

class Filet extends Component {
  constructor(props) {
    super(props);
    this.state = { erreur: null };
  }

  static getDerivedStateFromError(erreur) {
    return { erreur };
  }

  componentDidCatch(erreur, info) {
    console.error(T.journal, erreur, info && info.componentStack);
  }

  render() {
    if (!this.state.erreur) return this.props.children;
    return this.props.secours({ reessayer: () => this.setState({ erreur: null }) });
  }
}

/** Autour d'un onglet. `onRetourJournal` : revenir au Journal. */
export function FiletEcran({ children, onRetourJournal, ecran }) {
  return (
    <Filet
      secours={({ reessayer }) => (
        <div data-filet-ecran={ecran} style={styleEcran}>
          <h2 style={{ fontFamily: POLICES.titre, fontSize: 18, color: COLORS.text, margin: "0 0 8px" }}>{T.titreEcran}</h2>
          <p style={{ fontSize: 13.5, color: COLORS.textMuted, margin: 0, lineHeight: 1.55 }}>
            {T.texteEcran}
          </p>
          <BoutonSauvegarde />
          <button type="button" onClick={reessayer} style={styleBouton(false)}>
            {T.reessayer}
          </button>
          {onRetourJournal && ecran !== "journal" && (
            <button type="button" onClick={onRetourJournal} style={styleBouton(false)}>
              {T.retourJournal}
            </button>
          )}
        </div>
      )}
    >
      {children}
    </Filet>
  );
}

/** Autour de toute l'app : dernier recours. */
export function FiletApp({ children, relancer = () => window.location.reload() }) {
  return (
    <Filet
      secours={() => (
        <div
          data-filet-app
          style={{
            minHeight: "100vh",
            background: COLORS.bg,
            color: COLORS.text,
            fontFamily: POLICES.texte,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px max(16px, env(safe-area-inset-left, 0px))"
          }}
        >
          <div style={{ maxWidth: 400, width: "100%" }}>
            <h1 style={{ fontFamily: POLICES.titre, fontSize: 21, margin: "0 0 10px" }}>{T.titreApp}</h1>
            <p style={{ fontSize: 14, color: COLORS.textMuted, margin: 0, lineHeight: 1.55 }}>
              {T.texteApp}
            </p>
            <BoutonSauvegarde />
            <button type="button" onClick={relancer} style={styleBouton(false)}>
              {T.relancer}
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </Filet>
  );
}

export { Filet as FiletPourTests };
