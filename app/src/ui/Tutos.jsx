/**
 * Tutos : la fenetre pas a pas d'un tuto, et le guide qui les liste tous.
 *
 * Repris de l'app Neiram (24 octobre 2026). Le contenu est dans lib/tutos.js. Ici, l'affichage seulement :
 *  - un tuto : une etape par ecran, « Suivant » / « Précédent », des
 *    points d'avancement ;
 *  - le guide : tous les tutos, rangés par onglet, ouverts d'un toucher.
 *
 * `vue` : null (ferme), { tuto: id } ou { guide: true }.
 */

import { useEffect, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { Btn, Modal } from "./primitives.jsx";
import { ChevronRight, X } from "./icones.jsx";
import { TEXTES_TUTOS as T, trouverTuto, tutosParOnglet } from "../lib/tutos.js";

const stylePoints = { display: "flex", justifyContent: "center", margin: "12px 0 14px", gap: 6 };

function Etapes({ tuto, onFin, onGuide }) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [tuto.id]);
  const etape = tuto.etapes[i];
  const derniere = i === tuto.etapes.length - 1;

  return (
    <div data-tuto={tuto.id} data-etape-tuto={i + 1}>
      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "0 0 14px", lineHeight: 1.5 }}>{tuto.resume}</p>

      <div
        style={{
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: "14px 14px 16px",
          background: COLORS.bgAlt,
          minHeight: 132
        }}
      >
        <div style={{ fontSize: 11, color: COLORS.textFaint, marginBottom: 6 }}>
          {`${T.etape} ${i + 1} ${T.sur} ${tuto.etapes.length}`}
        </div>
        <div style={{ fontFamily: POLICES.titre, fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>
          {etape.titre}
                  </div>
        <p style={{ fontSize: 13.5, color: COLORS.text, margin: 0, lineHeight: 1.55 }}>{etape.texte}</p>
      </div>

      <div style={stylePoints} aria-hidden="true">
        {tuto.etapes.map((_, n) => (
          <span
            key={n}
            style={{
              width: n === i ? 18 : 7,
              height: 7,
              borderRadius: 999,
              background: n === i ? COLORS.gold : COLORS.border,
              transition: "width .2s"
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {i > 0 && (
          <Btn variant="ghost" onClick={() => setI(i - 1)} style={{ flex: 1 }}>
            {T.precedent}
          </Btn>
        )}
        <Btn onClick={() => (derniere ? onFin() : setI(i + 1))} style={{ flex: 2 }}>
          {derniere ? T.compris : T.suivant}
        </Btn>
      </div>

      {onGuide && (
        <button
          type="button"
          onClick={onGuide}
          style={{
            display: "block",
            margin: "14px auto 0",
            background: "none",
            border: "none",
            color: COLORS.gold,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit"
          }}
        >
          {T.voirTous}
        </button>
      )}
    </div>
  );
}

function Guide({ onChoisir }) {
  return (
    <div data-guide-tutos style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0, lineHeight: 1.5 }}>
        {T.introGuide}
      </p>
      {tutosParOnglet().map((groupe) => (
        <div key={groupe.id}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: COLORS.textFaint,
              marginBottom: 6
            }}
          >
            {groupe.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {groupe.tutos.map((t) => (
              <button
                key={t.id}
                type="button"
                data-lien-tuto={t.id}
                onClick={() => onChoisir(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.bgAlt,
                  color: COLORS.text,
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
              >
                <span style={{ fontSize: 20 }} aria-hidden="true">
                  {t.emoji}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>
                    {t.titre}
                                      </span>
                  <span style={{ display: "block", fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 }}>{t.resume}</span>
                </span>
                <ChevronRight size={16} color={COLORS.textFaint} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Tutos({ vue, onClose }) {
  // Ouvert depuis le guide : on y revient a la fin du tuto.
  const [depuisGuide, setDepuisGuide] = useState(false);
  const [courant, setCourant] = useState(vue);
  useEffect(() => {
    setCourant(vue);
    setDepuisGuide(false);
  }, [vue]);

  if (!courant) return null;
  const tuto = courant.tuto ? trouverTuto(courant.tuto) : null;
  if (courant.tuto && !tuto) return null;

  const fermer = () => {
    setCourant(null);
    onClose();
  };

  return (
    <Modal
      open
      onClose={fermer}
      iconeFermer={X}
      title={tuto ? `${tuto.emoji} ${tuto.titre}` : T.guide}
    >
      {tuto ? (
        <Etapes
          tuto={tuto}
          onFin={() => (depuisGuide ? setCourant({ guide: true }) : fermer())}
          onGuide={() => setCourant({ guide: true })}
        />
      ) : (
        <Guide
          onChoisir={(id) => {
            setDepuisGuide(true);
            setCourant({ tuto: id });
          }}
        />
      )}
    </Modal>
  );
}
