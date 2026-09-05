/**
 * Section « Aliments » de l'ecran Repas.
 *
 * Portage fidele de AlimentsSection (index.html, ligne 2704).
 *
 * L'ecran suggere quoi manger selon ce qu'il reste a couvrir dans la
 * journee. Toutes les listes sont filtrees par regimeOk : un aliment
 * incompatible avec les allergies du client ne doit apparaitre nulle part,
 * ni dans les familles, ni dans les equivalences.
 */

import { useMemo, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { computeRemainingToday } from "../lib/nutrition.js";
import { ordreRecommandation, regimeOk, trierPourObjectif } from "../lib/aliments.js";
import { EQUIV_FRUITS, EQUIV_GLUCIDES, EQUIV_LIPIDES, EQUIV_PROTEINES, FOOD_CATS, FOOD_DB, GOAL_FOOD_NOTES } from "../lib/catalogues.js";
import { Card } from "../ui/primitives.jsx";
import { ChevronDown, ChevronUp } from "../ui/icones.jsx";

/** Nombre d'aliments proposes par famille. Au-dela, la liste n'est plus lue. */
const PAR_FAMILLE = 6;

const styleEnTete = {
  fontSize: 11.5,
  fontWeight: 600,
  color: COLORS.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6
};

function TableEquivalences({ titre, lignes, profil }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={styleEnTete}>{titre}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {lignes
          // Les equivalences passent par le meme filtre que les aliments :
          // proposer « 2 œufs » a quelqu'un d'allergique aux œufs serait
          // exactement l'erreur que le filtre existe pour empecher.
          .filter((r) => regimeOk({ contains: r[2] || [], c: 0 }, profil))
          .map(([aliment, quantite], i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                background: COLORS.bgAlt,
                borderRadius: 8,
                padding: "8px 10px"
              }}
            >
              <span style={{ fontSize: 12.5, color: COLORS.text }}>{aliment}</span>
              <span
                style={{
                  fontSize: 12,
                  color: COLORS.gold,
                  fontFamily: "IBM Plex Mono",
                  textAlign: "right",
                  flexShrink: 0
                }}
              >
                {quantite}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

export function Aliments({ profile, targets, logEntries }) {
  const restant = useMemo(() => computeRemainingToday(logEntries, targets), [logEntries, targets]);
  const { ordre, accroche } = useMemo(() => ordreRecommandation(restant, targets), [restant, targets]);
  const [equivalencesOuvertes, setEquivalencesOuvertes] = useState(false);

  const alimentsDe = (idFamille) =>
    trierPourObjectif(
      FOOD_DB.filter((f) => f.cat === idFamille && regimeOk(f, profile)),
      idFamille,
      profile.goal
    ).slice(0, PAR_FAMILLE);

  const conseilObjectif = GOAL_FOOD_NOTES[profile.goal];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {(accroche || conseilObjectif) && (
        <Card style={{ padding: 14, borderColor: COLORS.gold + "55" }}>
          {accroche && <p style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.gold, margin: 0 }}>{accroche}</p>}
          {conseilObjectif && (
            <p
              style={{
                fontSize: 12,
                color: COLORS.textMuted,
                margin: accroche ? "8px 0 0" : 0,
                lineHeight: 1.5
              }}
            >
              {conseilObjectif}
            </p>
          )}
        </Card>
      )}

      {ordre.map((idFamille, rang) => {
        const famille = FOOD_CATS.find((c) => c.id === idFamille);
        const aliments = alimentsDe(idFamille);
        if (!aliments.length) return null;

        return (
          <Card key={idFamille} style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span
                style={{
                  fontFamily: POLICES.titre,
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: COLORS[famille.color],
                  textTransform: "uppercase",
                  letterSpacing: 0.6
                }}
              >
                {famille.label} — à privilégier
              </span>
              {rang === 0 && accroche && (
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    background: `${COLORS.gold}22`,
                    color: COLORS.gold,
                    borderRadius: 6,
                    padding: "3px 7px",
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  }}
                >
                  Priorité
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {aliments.map((f) => (
                <div
                  key={f.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    background: COLORS.bgAlt,
                    borderRadius: 8,
                    padding: "8px 10px"
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: COLORS.text }}>{f.name}</div>
                    <div style={{ fontSize: 9.5, color: COLORS.textFaint }}>{f.conseil}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      color: COLORS.textMuted,
                      fontFamily: "IBM Plex Mono",
                      flexShrink: 0
                    }}
                  >
                    P{f.p} G{f.c} L{f.f} · {f.kcal}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <p style={{ fontSize: 9.5, color: COLORS.textFaint, margin: "0 2px" }}>
        Valeurs pour 100 g. Listes filtrées selon ton régime et tes allergies.
      </p>

      <Card style={{ padding: 14 }}>
        <button
          onClick={() => setEquivalencesOuvertes(!equivalencesOuvertes)}
          style={{
            background: "none",
            border: "none",
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            padding: 0
          }}
        >
          <span
            style={{
              fontFamily: POLICES.titre,
              fontSize: 12.5,
              fontWeight: 700,
              color: COLORS.gold,
              textTransform: "uppercase",
              letterSpacing: 0.6
            }}
          >
            ⚖️ Équivalences pour varier
          </span>
          {equivalencesOuvertes ? (
            <ChevronUp size={16} color={COLORS.textMuted} />
          ) : (
            <ChevronDown size={16} color={COLORS.textMuted} />
          )}
        </button>

        {equivalencesOuvertes && (
          <div style={{ marginTop: 14 }}>
            <TableEquivalences
              titre="Glucides — pour une portion de 150 g cuits"
              lignes={EQUIV_GLUCIDES}
              profil={profile}
            />
            <TableEquivalences titre="Fruits — 1 portion" lignes={EQUIV_FRUITS} profil={profile} />
            <TableEquivalences
              titre="Protéines — portion équivalente à ~120 g de viande/poisson"
              lignes={EQUIV_PROTEINES}
              profil={profile}
            />
            <TableEquivalences titre="Lipides — matières grasses" lignes={EQUIV_LIPIDES} profil={profile} />
            <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: 0 }}>
              Rappel : protéines 4 kcal/g · glucides 4 kcal/g · lipides 9 kcal/g · alcool 7 kcal/g.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
