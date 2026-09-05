/**
 * Fenetre d'ajout d'un aliment au Journal.
 *
 * Portage du selecteur de repas de JournalTab (index.html, ~2495) et de
 * PortionPicker (2119).
 *
 * Quatre facons d'ajouter, dans l'ordre du plus rapide au plus laborieux :
 * un repas deja enregistre, un plat de la bibliotheque, la recherche dans
 * le catalogue, la saisie libre. L'ordre n'est pas anodin — c'est celui
 * dans lequel un client pressé essaie.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { num } from "../lib/dates.js";
import { fmtPortion, scaleMacros } from "../lib/portions.js";
import { PALIERS_PORTION, multiplicateur, totauxRepasType } from "../lib/repas-types.js";
import { Btn, Field, Modal, NumberInput, TextInput } from "../ui/primitives.jsx";
import { Trash2, X } from "../ui/icones.jsx";
import { RechercheAliment } from "./RechercheAliment.jsx";

const ONGLETS = [
  { id: "presets", label: "Repas" },
  { id: "library", label: "Mes plats" },
  { id: "finder", label: "Aliments" },
  { id: "freehand", label: "Libre" }
];

/** Plats affiches au maximum : au-dela, la liste devient illisible. */
const MAX_PLATS = 30;

const SAISIE_VIDE = { name: "", calories: "", protein: "", carbs: "", fat: "", grams: "" };

/**
 * Choix de la portion consommee.
 *
 * Portage fidele de PortionPicker. Les paliers evitent la saisie au
 * clavier dans le cas courant — une demi-portion, une portion et demie —
 * tout en laissant la saisie libre pour le reste.
 */
function ChoixPortion({ titre, sousTitre, base, onAjouter, onAnnuler }) {
  const [saisie, setSaisie] = useState("1");
  const facteur = multiplicateur(saisie);
  const total = scaleMacros(base, facteur);

  return (
    <div
      style={{
        background: COLORS.bgAlt,
        border: `1px solid ${COLORS.gold}66`,
        borderRadius: 10,
        padding: 12,
        marginTop: 10
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>{titre}</div>
      {sousTitre && (
        <div style={{ fontSize: 10.5, color: COLORS.textFaint, fontFamily: "IBM Plex Mono", marginTop: 3 }}>
          {sousTitre}
        </div>
      )}

      <div
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          margin: "12px 0 6px"
        }}
      >
        Portion consommée
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {PALIERS_PORTION.map((palier) => (
          <button
            key={palier}
            onClick={() => setSaisie(String(palier))}
            style={{
              padding: "7px 11px",
              borderRadius: 8,
              border: `1px solid ${facteur === palier ? COLORS.gold : COLORS.border}`,
              background: facteur === palier ? `${COLORS.gold}1A` : "none",
              color: facteur === palier ? COLORS.gold : COLORS.textMuted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "IBM Plex Mono"
            }}
          >
            ×{fmtPortion(palier)}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 96 }}>
          <NumberInput
            step="0.25"
            min="0"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            style={{ padding: "9px 10px" }}
          />
        </div>
        <div
          style={{
            flex: 1,
            fontSize: 12.5,
            color: facteur ? COLORS.gold : COLORS.textFaint,
            fontFamily: "IBM Plex Mono",
            fontWeight: 600
          }}
        >
          {total.kcal} kcal · P{total.p} G{total.c} L{total.f}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn variant="ghost" onClick={onAnnuler} style={{ flex: 1, padding: "9px 12px", fontSize: 12.5 }}>
          Annuler
        </Btn>
        {/* Une saisie invalide desactive l'ajout plutot que d'enregistrer zero. */}
        <Btn
          onClick={() => onAjouter(facteur)}
          disabled={!facteur}
          style={{ flex: 1, padding: "9px 12px", fontSize: 12.5 }}
        >
          Ajouter
        </Btn>
      </div>
    </div>
  );
}

export function AjoutAliment({
  open,
  onClose,
  titreRepas,
  repasTypes,
  plats,
  onAjouterRepasType,
  onSupprimerRepasType,
  onAjouterPlat,
  onAjouterLibre,
  habitudePesee
}) {
  // Le premier onglet depend de ce que le client possede : lui ouvrir
  // « Repas » sur une liste vide lui ferait croire que la fenetre est vide.
  const [onglet, setOnglet] = useState(repasTypes.length ? "presets" : "library");
  const [recherche, setRecherche] = useState("");
  const [portionPour, setPortionPour] = useState(null);
  const [saisie, setSaisie] = useState(SAISIE_VIDE);

  const platsFiltres = plats
    .filter((d) => d.name.toLowerCase().includes(recherche.toLowerCase()))
    .slice(0, MAX_PLATS);

  const ajouterLibre = () => {
    if (!saisie.name.trim()) return;
    const grammes = num(saisie.grams);
    onAjouterLibre({
      // Le grammage est inscrit dans le libelle ET dans le champ : le
      // libelle reste lisible, le champ permet de re-porter la quantite.
      name: grammes > 0 ? `${saisie.name} (${fmtPortion(grammes)} g)` : saisie.name,
      calories: num(saisie.calories),
      protein: num(saisie.protein),
      carbs: num(saisie.carbs),
      fat: num(saisie.fat),
      ...(grammes > 0 ? { grams: grammes, baseName: saisie.name } : {})
    });
    setSaisie(SAISIE_VIDE);
  };

  return (
    <Modal open={open} onClose={onClose} title={titreRepas ? `Ajouter — ${titreRepas}` : ""} iconeFermer={X}>
      <div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setPortionPour(null);
                setOnglet(o.id);
              }}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: onglet === o.id ? COLORS.gold : COLORS.bgAlt,
                color: onglet === o.id ? "#1A1503" : COLORS.textMuted,
                fontWeight: 600,
                fontSize: 12.5
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        {onglet === "presets" && (
          <div>
            {repasTypes.length === 0 ? (
              <p style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.5, margin: 0 }}>
                Aucun repas enregistré. Compose un repas dans le Journal, puis appuie sur « Enregistrer ce repas »
                pour le réutiliser en un clic.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
                {repasTypes.map((p) => {
                  const t = totauxRepasType(p);
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        background: COLORS.bgAlt,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 8,
                        paddingRight: 6
                      }}
                    >
                      <button
                        onClick={() => setPortionPour({ genre: "repas", item: p })}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          background: "none",
                          border: "none",
                          borderRadius: 8,
                          padding: "10px 12px",
                          cursor: "pointer",
                          textAlign: "left"
                        }}
                      >
                        <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{p.name}</div>
                        <div
                          style={{
                            fontSize: 10.5,
                            color: COLORS.textFaint,
                            fontFamily: "IBM Plex Mono",
                            marginTop: 2
                          }}
                        >
                          {Math.round(t.kcal)} kcal · P{Math.round(t.p)} G{Math.round(t.c)} L{Math.round(t.f)} ·{" "}
                          {(p.items || []).length} aliment{(p.items || []).length > 1 ? "s" : ""}
                          {(p.portions || 1) > 1 ? ` · ${p.portions} portions` : ""}
                        </div>
                      </button>
                      <button
                        onClick={() => onSupprimerRepasType(p.id)}
                        aria-label="Supprimer"
                        style={{
                          background: "none",
                          border: "none",
                          color: COLORS.textFaint,
                          cursor: "pointer",
                          padding: 6,
                          display: "flex",
                          flexShrink: 0
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {portionPour?.genre === "repas" && (
              <ChoixPortion
                titre={portionPour.item.name}
                base={totauxRepasType(portionPour.item)}
                onAjouter={(facteur) => {
                  onAjouterRepasType(portionPour.item, facteur);
                  setPortionPour(null);
                }}
                onAnnuler={() => setPortionPour(null)}
              />
            )}
          </div>
        )}

        {onglet === "library" && (
          <div>
            <TextInput
              placeholder="Rechercher un plat..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
              {platsFiltres.length === 0 && (
                <p style={{ fontSize: 13, color: COLORS.textMuted }}>Aucun plat. Ajoute-en dans l'onglet Repas.</p>
              )}
              {platsFiltres.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setPortionPour({ genre: "plat", item: d })}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: COLORS.bgAlt,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%"
                  }}
                >
                  <span style={{ fontSize: 13, color: COLORS.text }}>{d.name}</span>
                  <span style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: "IBM Plex Mono" }}>
                    {d.calories} kcal
                  </span>
                </button>
              ))}
            </div>

            {portionPour?.genre === "plat" && (
              <ChoixPortion
                titre={portionPour.item.name}
                sousTitre={`Portion enregistrée : ${portionPour.item.calories} kcal · P${portionPour.item.protein} G${portionPour.item.carbs} L${portionPour.item.fat}`}
                base={{
                  kcal: portionPour.item.calories,
                  p: portionPour.item.protein,
                  c: portionPour.item.carbs,
                  f: portionPour.item.fat
                }}
                onAjouter={(facteur) => {
                  onAjouterPlat(portionPour.item, facteur);
                  setPortionPour(null);
                }}
                onAnnuler={() => setPortionPour(null)}
              />
            )}
          </div>
        )}

        {onglet === "finder" && (
          <RechercheAliment onChoisir={onAjouterLibre} habitudePesee={habitudePesee} />
        )}

        {onglet === "freehand" && (
          <div>
            <Field label="Nom">
              <TextInput value={saisie.name} onChange={(e) => setSaisie({ ...saisie, name: e.target.value })} />
            </Field>
            <Field label="Quantité en grammes (optionnel)">
              <NumberInput
                step="10"
                min="0"
                placeholder="Permet d'ajuster la quantité plus tard"
                value={saisie.grams}
                onChange={(e) => setSaisie({ ...saisie, grams: e.target.value })}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              <Field label="Kcal">
                <NumberInput
                  value={saisie.calories}
                  onChange={(e) => setSaisie({ ...saisie, calories: e.target.value })}
                />
              </Field>
              <Field label="P (g)">
                <NumberInput
                  value={saisie.protein}
                  onChange={(e) => setSaisie({ ...saisie, protein: e.target.value })}
                />
              </Field>
              <Field label="G (g)">
                <NumberInput value={saisie.carbs} onChange={(e) => setSaisie({ ...saisie, carbs: e.target.value })} />
              </Field>
              <Field label="L (g)">
                <NumberInput value={saisie.fat} onChange={(e) => setSaisie({ ...saisie, fat: e.target.value })} />
              </Field>
            </div>
            <Btn onClick={ajouterLibre} style={{ width: "100%", marginTop: 8 }}>
              Ajouter
            </Btn>
          </div>
        )}
      </div>
    </Modal>
  );
}
