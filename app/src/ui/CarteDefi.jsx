/**
 * Carte « Défi 30 jours » du Journal (lib/defis.js), reprise de l'app
 * Neiram (24 octobre 2026). Les jours se valident a partir de ce que le
 * client note deja : la carte ne demande rien de plus.
 */

import { useEffect, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { todayISO } from "../lib/dates.js";
import { totauxDuJour } from "../lib/score-jour.js";
import {
  CLE_DEFIS,
  DEFIS,
  DEFI_JOURS,
  TEXTES_DEFIS,
  abandonner,
  avancementDefi,
  cloturerSiFini,
  commencer,
  defiParId,
  defisReussis,
  reparerEtat,
  valideurDuDefi
} from "../lib/defis.js";
import { Btn, Card, Modal, SectionTitle } from "./primitives.jsx";
import { X } from "./icones.jsx";

const lire = () => reparerEtat(charger(CLE_DEFIS, null));

const COULEURS_CASE = {
  valide: { background: COLORS.gold, border: COLORS.gold },
  manque: { background: "transparent", border: COLORS.border },
  aujourdhui: { background: "transparent", border: COLORS.gold },
  avenir: { background: COLORS.bgAlt, border: COLORS.bgAlt }
};
const GRILLE = { display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 5, marginBottom: 10 };
const STYLE_CHOIX = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  textAlign: "left",
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  color: COLORS.text,
  fontFamily: "inherit",
  cursor: "pointer"
};

export function CarteDefi({ journal, repas, seances, objectifs }) {
  const aujourdhui = todayISO();
  const [etatBrut, setEtatBrut] = useState(lire);
  const [choix, setChoix] = useState(false);

  const defi = etatBrut.enCours ? defiParId(etatBrut.enCours.id) : null;
  const estValide = defi ? valideurDuDefi(defi, { journal, repas, seances, objectifs, totauxDuJour }) : () => false;

  // Defi termine (lendemain du 30e jour) : il rejoint les defis termines.
  const etat = cloturerSiFini(etatBrut, aujourdhui, estValide);
  useEffect(() => {
    if (etat === etatBrut) return;
    enregistrer(CLE_DEFIS, etat);
    setEtatBrut(etat);
  }, [etat, etatBrut]);

  const modifier = (fn) => {
    const suivant = fn(lire());
    enregistrer(CLE_DEFIS, suivant);
    setEtatBrut(suivant);
  };

  const a = defi ? avancementDefi(etat.enCours, aujourdhui, estValide) : null;
  const reussis = defisReussis(etat).length;

  return (
    <Card style={{ marginBottom: 16 }}>
      <div data-carte-defi>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <SectionTitle>{TEXTES_DEFIS.titre}</SectionTitle>
          {reussis > 0 && (
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>
              🏆 {reussis} {TEXTES_DEFIS.reussis}
            </span>
          )}
        </div>

        {!defi || !a ? (
          <>
            <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "8px 0 12px", lineHeight: 1.5 }}>{TEXTES_DEFIS.proposer}</p>
            <Btn onClick={() => setChoix(true)} style={{ width: "100%" }}>
              {TEXTES_DEFIS.choisir}
            </Btn>
          </>
        ) : (
          <div data-defi-en-cours={defi.id}>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, margin: "10px 0 2px" }}>
              {defi.emoji} {defi.titre}
            </div>
            <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginBottom: 10 }}>
              {TEXTES_DEFIS.jour} {a.jourNumero}/{DEFI_JOURS} ·{" "}
              <span data-defi-valides style={{ fontFamily: POLICES.chiffres, color: COLORS.gold }}>{a.valides}</span> {TEXTES_DEFIS.valides}
            </div>
            <div role="img" aria-label={TEXTES_DEFIS.aria(a.valides)} style={GRILLE}>
              {a.cases.map((c) => (
                <span
                  key={c.date}
                  data-case-defi={c.etat}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 5,
                    border: `1.5px solid ${COULEURS_CASE[c.etat].border}`,
                    background: COULEURS_CASE[c.etat].background
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 12, color: a.atteignable ? COLORS.textMuted : COLORS.warn, marginBottom: 12, lineHeight: 1.5 }}>
              {a.reussi ? TEXTES_DEFIS.bravo : a.atteignable ? `${TEXTES_DEFIS.objectif} ${defi.detail}` : TEXTES_DEFIS.plusAtteignable}
            </div>
            <Btn
              variant="ghost"
              onClick={() => {
                if (typeof window === "undefined" || window.confirm(TEXTES_DEFIS.confirmerAbandon)) modifier(abandonner);
              }}
            >
              {TEXTES_DEFIS.abandonner}
            </Btn>
          </div>
        )}
      </div>

      <Modal open={choix} onClose={() => setChoix(false)} title={TEXTES_DEFIS.choisir} iconeFermer={X}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DEFIS.map((d) => (
            <button
              key={d.id}
              type="button"
              data-choix-defi={d.id}
              onClick={() => {
                modifier((e) => commencer(e, d.id, aujourdhui));
                setChoix(false);
              }}
              style={STYLE_CHOIX}
            >
              <span style={{ fontSize: 22 }} aria-hidden="true">
                {d.emoji}
              </span>
              <span>
                <span style={{ display: "block", fontWeight: 600, fontSize: 14 }}>{d.titre}</span>
                <span style={{ display: "block", fontSize: 12, color: COLORS.textMuted }}>{d.detail}</span>
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </Card>
  );
}
