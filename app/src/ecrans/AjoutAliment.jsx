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

import { useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { num, round } from "../lib/dates.js";
import { basisMacros, fmtPortion, itemBasis, scaleMacros, sumMacros, toGramBasis } from "../lib/portions.js";
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

/** Champ numerique compact des lignes d'aliment. */
const champCompact = {
  width: "100%",
  background: COLORS.bgAlt,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "8px 8px",
  color: COLORS.text,
  fontFamily: "Inter",
  fontSize: 13,
  outline: "none"
};

/**
 * Editeur de quantites d'un repas type.
 *
 * Portage de MealPortionEditor (index.html 819-869). MANQUAIT AU PORTAGE :
 * la bascule avait remplace cet ecran par un simple multiplicateur pour
 * tout le repas, alors que le guide client — et l'application d'avant —
 * promettent un champ PAR aliment.
 *
 * La difference compte : un client qui reprend son « déjeuner type » veut
 * passer le poulet de 150 a 200 g sans toucher au riz. Avec un
 * multiplicateur global, il ne peut pas — tout bouge ensemble.
 *
 * Trois details qui viennent de bugs deja corriges dans l'ancienne version,
 * et qu'il ne faut pas reintroduire :
 *
 * 1. TOUS les aliments du repas sont ajoutes, pas seulement le premier.
 * 2. Un aliment enregistre « en portions » peut passer en grammes, et
 *    l'application s'en souvient pour la fois suivante.
 * 3. Un seul champ numerique par ligne. Deux champs cote a cote sur la
 *    meme ligne ont deja produit une saisie a 27 000 kcal.
 */
function EditeurQuantitesRepas({ titre, items, portions, onAjouter, onAnnuler, onMemoriserPoids }) {
  const bruts = useMemo(() => (items || []).map(itemBasis), [items]);

  const [quantites, setQuantites] = useState(() => bruts.map((b) => String(b.qty)));
  const [poidsReference, setPoidsReference] = useState(() => bruts.map(() => ""));
  const [enConversion, setEnConversion] = useState(() => bruts.map(() => false));

  const bases = bruts.map((b, i) => toGramBasis(b, poidsReference[i]));
  const parLigne = bases.map((b, i) => basisMacros(b, String(quantites[i]).replace(",", ".")));
  const total = sumMacros(parLigne);

  const definirQuantite = (i, v) => setQuantites((prev) => prev.map((x, k) => (k === i ? v : x)));
  const multiplierTout = (facteur) =>
    setQuantites(bases.map((b) => String(round(b.qty * facteur, 2))));

  // Recette en plusieurs parts : on divise toutes les lignes par le nombre
  // de portions produites, puis on multiplie par ce qui est reellement mange.
  const parts = Math.max(1, Math.round(num(portions) || 1));
  const [mangees, setMangees] = useState("1");
  const appliquerPortions = (v) => {
    setMangees(v);
    const n = num(String(v).replace(",", "."));
    if (n > 0) multiplierTout(n / parts);
  };

  const ouvrirConversion = (i) => setEnConversion((prev) => prev.map((x, k) => (k === i ? true : x)));
  const fermerConversion = (i) => {
    setEnConversion((prev) => prev.map((x, k) => (k === i ? false : x)));
    setPoidsReference((prev) => prev.map((x, k) => (k === i ? "" : x)));
    definirQuantite(i, "1");
  };

  // Saisir le poids d'une portion bascule la ligne en grammes et pre-remplit
  // la quantite avec ce meme poids : le repas reste identique tant qu'on n'y
  // touche pas.
  const definirPoidsReference = (i, v) => {
    setPoidsReference((prev) => prev.map((x, k) => (k === i ? v : x)));
    const g = num(String(v).replace(",", "."));
    if (g > 0) {
      definirQuantite(i, String(g));
      if (onMemoriserPoids) onMemoriserPoids(i, g);
    } else {
      definirQuantite(i, "1");
    }
  };

  const etiquette = (t) => (
    <div
      style={{
        fontSize: 9,
        color: COLORS.textFaint,
        marginBottom: 3,
        textTransform: "uppercase",
        letterSpacing: 0.4
      }}
    >
      {t}
    </div>
  );

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
      <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>{titre}</div>
      <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "0 0 10px" }}>
        Ajuste la quantité de chaque aliment : les macros suivent.
      </p>

      {parts > 1 && (
        <div
          style={{
            background: `${COLORS.gold}14`,
            border: `1px solid ${COLORS.gold}44`,
            borderRadius: 8,
            padding: 10,
            marginBottom: 10
          }}
        >
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 7 }}>
            Recette pour {parts} portions — tu en manges combien ?
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 82 }}>
              <NumberInput
                step="0.5"
                min="0"
                value={mangees}
                onChange={(e) => appliquerPortions(e.target.value)}
                style={{ padding: "8px 10px" }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[1, 2, parts]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((v) => (
                  <button
                    key={v}
                    onClick={() => appliquerPortions(String(v))}
                    style={{
                      padding: "7px 11px",
                      borderRadius: 8,
                      border: `1px solid ${COLORS.border}`,
                      background: "none",
                      color: COLORS.textMuted,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "IBM Plex Mono"
                    }}
                  >
                    {v}
                    {v > 1 ? " parts" : " part"}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {PALIERS_PORTION.map((s) => (
          <button
            key={s}
            onClick={() => multiplierTout(s)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: "none",
              color: COLORS.textMuted,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "IBM Plex Mono"
            }}
          >
            tout × {fmtPortion(s)}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bases.map((b, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 82px",
              gap: 8,
              alignItems: "center",
              paddingBottom: 8,
              borderBottom: i < bases.length - 1 ? `1px solid ${COLORS.border}` : "none"
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: COLORS.text }}>{b.label}</div>
              <div
                style={{
                  fontSize: 10.5,
                  color: COLORS.textFaint,
                  fontFamily: "IBM Plex Mono",
                  marginTop: 2
                }}
              >
                {parLigne[i].kcal} kcal · P{parLigne[i].p} G{parLigne[i].c} L{parLigne[i].f}
              </div>
            </div>

            {/* UN SEUL champ numerique par ligne. Deux champs cote a cote
                ont deja produit une saisie a 27 000 kcal : le client
                remplissait celui qu'il ne fallait pas. */}
            <div>
              {enConversion[i] ? (
                <>
                  {etiquette("Poids d'1 portion")}
                  <input
                    type="number"
                    step="10"
                    min="0"
                    placeholder="g"
                    autoFocus
                    value={poidsReference[i]}
                    onChange={(e) => definirPoidsReference(i, e.target.value)}
                    style={{ ...champCompact, textAlign: "center", borderColor: COLORS.gold }}
                  />
                </>
              ) : (
                <>
                  {etiquette(b.unit === "g" ? "Grammes" : "Portions")}
                  <input
                    type="number"
                    step={b.unit === "g" ? "10" : "0.25"}
                    min="0"
                    value={quantites[i]}
                    onChange={(e) => definirQuantite(i, e.target.value)}
                    style={{ ...champCompact, textAlign: "center" }}
                  />
                </>
              )}
            </div>

            {bruts[i].unit === "x" && b.unit !== "g" && (
              <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
                {enConversion[i] ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: COLORS.textFaint, flex: 1, lineHeight: 1.4 }}>
                      Indique combien pèse la portion enregistrée. La ligne passera en grammes et l'app s'en
                      souviendra.
                    </span>
                    <button
                      onClick={() => fermerConversion(i)}
                      style={{
                        background: "none",
                        border: "none",
                        color: COLORS.textFaint,
                        fontSize: 11,
                        cursor: "pointer",
                        padding: 2,
                        flexShrink: 0
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => ouvrirConversion(i)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: COLORS.gold,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      borderBottom: `1px dotted ${COLORS.gold}66`
                    }}
                  >
                    Compter en grammes
                  </button>
                )}
              </div>
            )}

            {/* Garde-fou contre la confusion portions / grammes : au-dela de
                20 portions, c'est presque toujours des grammes qui ont ete
                saisis dans le mauvais champ. */}
            {bruts[i].unit === "x" && b.unit !== "g" && num(quantites[i]) > 20 && (
              <p
                style={{
                  gridColumn: "1 / -1",
                  fontSize: 10.5,
                  color: COLORS.warn,
                  margin: "6px 0 0",
                  lineHeight: 1.4
                }}
              >
                {fmtPortion(num(quantites[i]))} portions, soit {parLigne[i].kcal} kcal. Tu voulais peut-être
                saisir des grammes : utilise « Compter en grammes ».
              </p>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${COLORS.borderLight}`
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontWeight: 600
          }}
        >
          Total
        </span>
        <span
          style={{ fontSize: 12.5, color: COLORS.gold, fontFamily: "IBM Plex Mono", fontWeight: 700 }}
        >
          {total.kcal} kcal · P{total.p} G{total.c} L{total.f}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn variant="ghost" onClick={onAnnuler} style={{ flex: 1, padding: "9px 12px", fontSize: 12.5 }}>
          Annuler
        </Btn>
        <Btn
          onClick={() =>
            onAjouter(
              bases.map((b, i) => ({ basis: b, qty: num(String(quantites[i]).replace(",", ".")) }))
            )
          }
          disabled={total.kcal <= 0}
          style={{ flex: 1, padding: "9px 12px", fontSize: 12.5 }}
        >
          Ajouter
        </Btn>
      </div>
    </div>
  );
}

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
  onMemoriserPoidsRepasType,
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
              <EditeurQuantitesRepas
                titre={portionPour.item.name}
                items={portionPour.item.items || []}
                portions={portionPour.item.portions}
                onAjouter={(lignes) => {
                  onAjouterRepasType(portionPour.item, lignes);
                  setPortionPour(null);
                }}
                onMemoriserPoids={(index, grammes) =>
                  onMemoriserPoidsRepasType?.(portionPour.item.id, index, grammes)
                }
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
