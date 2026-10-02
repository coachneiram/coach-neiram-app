/**
 * Recettes du coach, en tete de Repas → Mes plats.
 *
 * Voir lib/recettes-coach.js : le client ne voit que les recettes
 * compatibles avec son regime et ses allergies, celles de son objectif
 * d'abord. « Ajouter a mes recettes » la range dans ses recettes : il la
 * note ensuite dans le Journal, a la part, comme les siennes.
 */

import { useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { RECETTES_COACH } from "../lib/recettes-coach-catalogue.js";
import {
  CATEGORIES_RECETTE,
  MOMENTS_RECETTE,
  PROFILS_RECETTE,
  recettesPourClient,
  versRecetteClient
} from "../lib/recettes-coach.js";
import { enregistrerRecette, lireRepasTypes } from "../lib/repas-types.js";
import { Btn, Card, Modal, SectionTitle } from "../ui/primitives.jsx";
import { Plus, X } from "../ui/icones.jsx";

const puce = (actif) => ({
  padding: "6px 11px",
  borderRadius: 20,
  border: `1px solid ${actif ? COLORS.gold : COLORS.border}`,
  background: actif ? `${COLORS.gold}22` : "transparent",
  color: actif ? COLORS.gold : COLORS.textMuted,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap"
});

// Pas d'etiquette de regime (« Vegan », « Sans porc »...) sur les fiches,
// choix du coach du 2 octobre 2026 : une recette se presente pour tout le
// monde. Le tri, lui, reste : un client ne voit que les recettes compatibles
// avec son regime et ses allergies (recettesPourClient).

/* TEXTE-NOUVEAU
   Recettes du coach : catalogue hebdomadaire alimente par la routine du
   coach (Drive puis pull request), ajoute a sa demande. Aucun de ces
   libelles n'existe dans index.html. */
export function RecettesCoach({ profile, onAjoutee, catalogue = RECETTES_COACH }) {
  const [filtre, setFiltre] = useState("pour-toi");
  const [ouverte, setOuverte] = useState(null);
  const [dejaAjoutees, setDejaAjoutees] = useState(
    () => new Set(lireRepasTypes().map((r) => r.origine).filter(Boolean))
  );

  const compatibles = useMemo(() => recettesPourClient(catalogue, profile), [catalogue, profile]);
  const pourToi = useMemo(() => recettesPourClient(catalogue, profile, "pour-toi"), [catalogue, profile]);
  // « Pour toi » vide (aucune recette de son objectif cette semaine) : on
  // montre tout ce qui est compatible plutot qu'une liste vide.
  const filtreEffectif = filtre === "pour-toi" && !pourToi.length ? null : filtre;
  const liste = useMemo(
    () => recettesPourClient(catalogue, profile, filtreEffectif),
    [catalogue, profile, filtreEffectif]
  );
  const profilsPresents = PROFILS_RECETTE.filter((p) => compatibles.some((r) => r.profils.includes(p.id)));

  const ajouter = (r) => {
    enregistrerRecette(lireRepasTypes(), versRecetteClient(r));
    setDejaAjoutees(new Set([...dejaAjoutees, r.id]));
    if (onAjoutee) onAjoutee(r);
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div data-recettes-coach="">
        <SectionTitle>Recettes du coach</SectionTitle>
        <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "8px 0 12px", lineHeight: 1.5 }}>
          De nouvelles recettes chaque semaine, triées pour ton objectif et ton régime.
        </p>

        {!compatibles.length ? (
          <p style={{ fontSize: 12.5, color: COLORS.textFaint, margin: 0 }}>
            Pas encore de recette adaptée à ton régime. Les nouvelles arrivent chaque lundi.
          </p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 8 }}>
              {pourToi.length > 0 && (
                <button data-filtre="pour-toi" onClick={() => setFiltre("pour-toi")} style={puce(filtre === "pour-toi")}>
                  Pour toi
                </button>
              )}
              <button data-filtre="toutes" onClick={() => setFiltre(null)} style={puce(filtreEffectif === null)}>
                Toutes
              </button>
              {profilsPresents.map((p) => (
                <button key={p.id} data-filtre={p.id} onClick={() => setFiltre(p.id)} style={puce(filtre === p.id)}>
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {liste.map((r) => {
                return (
                  <button
                    key={r.id}
                    data-recette-coach={r.id}
                    onClick={() => setOuverte(r)}
                    style={{
                      textAlign: "left",
                      background: COLORS.bgAlt,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.text }}>{r.nom}</div>
                    <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 3 }}>
                      {CATEGORIES_RECETTE[r.categorie]} · {r.preparationMin + r.cuissonMin} min · {r.parPortion.kcal} kcal ·
                      P{r.parPortion.p} G{r.parPortion.c} L{r.parPortion.f} par portion
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Modal open={!!ouverte} onClose={() => setOuverte(null)} title={ouverte?.nom || ""} iconeFermer={X}>
        {ouverte && (
          <div data-recette-detail={ouverte.id} style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>
            <p style={{ margin: "0 0 10px", color: COLORS.textMuted }}>{ouverte.description}</p>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>
              {MOMENTS_RECETTE[ouverte.moment]} · {ouverte.portions} portion{ouverte.portions > 1 ? "s" : ""} ·
              préparation {ouverte.preparationMin} min{ouverte.cuissonMin ? ` · cuisson ${ouverte.cuissonMin} min` : ""}
            </div>

            <div
              data-macros-portion=""
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: 4,
                textAlign: "center",
                background: COLORS.bgAlt,
                borderRadius: 10,
                padding: "8px 4px",
                marginBottom: 14
              }}
            >
              {[
                ["kcal", ouverte.parPortion.kcal, ""],
                ["Prot.", ouverte.parPortion.p, " g"],
                ["Gluc.", ouverte.parPortion.c, " g"],
                ["Lip.", ouverte.parPortion.f, " g"],
                ["Fibres", ouverte.parPortion.fibres, " g"]
              ].map(([l, v, u]) => (
                <div key={l}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold }}>
                    {v}
                    {u}
                  </div>
                  <div style={{ fontSize: 10, color: COLORS.textFaint }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "-10px 0 12px", textAlign: "center" }}>
              par portion
            </div>

            <div style={{ fontWeight: 700, marginBottom: 4 }}>Ingrédients ({ouverte.portions} portion{ouverte.portions > 1 ? "s" : ""})</div>
            <ul style={{ margin: "0 0 12px", paddingLeft: 18 }}>
              {ouverte.ingredients.map((i, k) => (
                <li key={k}>
                  {i.nom} : {i.quantite}
                </li>
              ))}
            </ul>

            <div style={{ fontWeight: 700, marginBottom: 4 }}>Préparation</div>
            <ol style={{ margin: "0 0 12px", paddingLeft: 18 }}>
              {ouverte.etapes.map((e, k) => (
                <li key={k} style={{ marginBottom: 4 }}>
                  {e}
                </li>
              ))}
            </ol>

            {ouverte.adaptations && (
              <p style={{ fontSize: 12, color: COLORS.textMuted, margin: "0 0 14px" }}>
                <strong>Adapter les portions : </strong>
                {ouverte.adaptations}
              </p>
            )}

            {dejaAjoutees.has(ouverte.id) ? (
              <Btn variant="ghost" disabled style={{ width: "100%" }}>
                Dans mes recettes : à noter depuis le Journal
              </Btn>
            ) : (
              <Btn icon={Plus} onClick={() => ajouter(ouverte)} style={{ width: "100%" }}>
                Ajouter à mes recettes
              </Btn>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}
/* FIN-TEXTE-NOUVEAU */
