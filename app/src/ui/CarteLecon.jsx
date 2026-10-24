/**
 * « La leçon du jour » (L'école Neiram, lib/lecons.js), reprise de l'app
 * Neiram le 24/10/2026 : 2 minutes de lecture, une question, une action.
 * Une nouvelle leçon par jour ; les 28 leçons sont incluses dans l'app
 * coach. Affichée dans le Journal, le jour même seulement.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { CLE_LECONS, leconDuJour, LECONS, normaliserLecons, repondre } from "../lib/lecons.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { TEXTES_LECONS as T } from "../lib/textes-mode-de-vie.js";
import { Btn, Card, SectionTitle } from "./primitives.jsx";

const CARTE = {
  marginBottom: 16
};
const EN_TETE = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8
};
const POSITION = {
  fontSize: 11,
  color: COLORS.textFaint
};
const TITRE = {
  fontSize: 14.5,
  fontWeight: 700,
  color: COLORS.text,
  margin: "6px 0 8px"
};
const BRAVO = {
  fontSize: 12.5,
  color: COLORS.good,
  margin: "6px 0 0"
};
const PARAGRAPHE = {
  fontSize: 13,
  color: COLORS.text,
  lineHeight: 1.6,
  margin: "0 0 10px"
};
const A_RETENIR = {
  fontSize: 12.5,
  color: COLORS.gold,
  fontWeight: 600,
  margin: "0 0 12px"
};
const QUESTION = {
  fontSize: 12.5,
  fontWeight: 700,
  color: COLORS.text,
  marginBottom: 8
};
const OPTIONS = {
  display: "flex",
  flexDirection: "column",
  gap: 6
};
const RETOUR = {
  marginTop: 10
};
const ACTION = {
  fontSize: 12.5,
  color: COLORS.text,
  margin: "0 0 4px"
};
const SOURCE = {
  fontSize: 10.5,
  color: COLORS.textFaint,
  margin: 0
};

const styleOption = (couleur, fond, repondu) => ({
  textAlign: "left",
  padding: "9px 11px",
  borderRadius: 10,
  border: `1.5px solid ${couleur}`,
  background: fond,
  color: COLORS.text,
  fontSize: 12.5,
  fontFamily: "inherit",
  cursor: repondu ? "default" : "pointer"
});
const styleVerdict = (bonne) => ({
  fontSize: 12.5,
  color: bonne ? COLORS.good : COLORS.warn,
  margin: "0 0 6px",
  fontWeight: 600
});

export function CarteLecon() {
  const [etat, setEtat] = useState(() => normaliserLecons(charger(CLE_LECONS, null)));
  const [ouverte, setOuverte] = useState(false);
  const { lecon, faite, termine } = leconDuJour(etat);
  if (termine || !lecon) {
    return (
      <Card style={CARTE}>
        <div data-lecon-fin>
          <SectionTitle tuto="lecons">{T.titreFin}</SectionTitle>
          <p style={BRAVO}>{T.bravo(LECONS.length)}</p>
        </div>
      </Card>
    );
  }
  const reponse = etat.reponses[lecon.id];
  const repondu = reponse != null;
  const choisir = (i) => {
    const suivant = repondre(etat, lecon.id, i);
    setEtat(suivant);
    enregistrer(CLE_LECONS, suivant);
  };

  return (
    <Card style={CARTE}>
      <div data-lecon={lecon.id} data-lecon-faite={faite ? "oui" : "non"}>
        <div style={EN_TETE}>
          <SectionTitle tuto="lecons">{T.titre}</SectionTitle>
          <span style={POSITION}>{T.position(lecon.jour, LECONS.length, T.themes[lecon.theme] || lecon.theme)}</span>
        </div>
        <div style={TITRE}>{T.titreLecon(lecon.titre, faite)}</div>
        {!ouverte ? (
          <Btn variant="ghost" onClick={() => setOuverte(true)}>
            {faite ? T.relire : T.lire}
          </Btn>
        ) : (
          <div data-lecon-contenu>
            {lecon.texte.map((p) => (
              <p key={p} style={PARAGRAPHE}>
                {p}
              </p>
            ))}
            <p style={A_RETENIR}>{T.aRetenir(lecon.aRetenir)}</p>
            <div style={QUESTION}>{lecon.question.q}</div>
            <div style={OPTIONS}>
              {lecon.question.options.map((o, i) => {
                const bonne = i === lecon.question.bonne;
                const couleur = repondu ? (bonne ? COLORS.good : i === reponse ? COLORS.bad : COLORS.border) : COLORS.border;
                const fond = repondu && bonne ? `${COLORS.good}18` : COLORS.bgAlt;
                return (
                  <button key={o} data-option={i} disabled={repondu} onClick={() => choisir(i)} style={styleOption(couleur, fond, repondu)}>
                    {o}
                  </button>
                );
              })}
            </div>
            {repondu && (
              <div data-lecon-feedback style={RETOUR}>
                <p style={styleVerdict(reponse === lecon.question.bonne)}>{T.retour(reponse === lecon.question.bonne, lecon.question.explication)}</p>
                <p style={ACTION}>
                  <b>{T.action}</b> {lecon.action}
                </p>
                <p style={SOURCE}>{T.source(lecon.source)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
