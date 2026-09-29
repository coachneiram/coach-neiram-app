/**
 * Recettes : composer un plat cuisine ingredient par ingredient.
 *
 * Demande du coach : la cliente prepare une quiche ou une pizza, entre
 * 200 g de lardons, 100 g de lait, et l'application calcule les calories —
 * de la recette entiere, puis d'une part.
 *
 * Une recette est enregistree comme un repas type (voir enregistrerRecette
 * dans lib/repas-types.js) : elle se reprend depuis le Journal, onglet
 * Repas, avec l'editeur qui demande combien de parts on mange. Cet ecran ne
 * fait que la COMPOSER, sans passer par le journal du jour — c'est ce qui
 * manquait : saisir la quiche entiere dans son dejeuner pour l'enregistrer
 * la comptait dans la journee.
 *
 * Les ingredients passent par le meme selecteur que le Journal : recherche
 * par nom, photo ou code-barres, quantite en grammes.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { num } from "../lib/dates.js";
import {
  enregistrerRecette,
  estRecette,
  lignesParParts,
  lireRecettes,
  lireRepasTypes,
  supprimerRepasType,
  totauxParPortion,
  totauxRepasType
} from "../lib/repas-types.js";
import { Btn, Card, Field, IconBtn, Modal, NumberInput, TextInput } from "../ui/primitives.jsx";
import { BookOpen, Pencil, Plus, Trash2, X } from "../ui/icones.jsx";
import { RechercheAliment } from "./RechercheAliment.jsx";

const macros = (t) => `${Math.round(t.kcal)} kcal · P${Math.round(t.p)} G${Math.round(t.c)} L${Math.round(t.f)}`;

/* TEXTE-NOUVEAU
   Ecran ajoute apres la bascule, a la demande du coach : composer une
   recette (quiche, pizza, gateau) a partir de ses ingredients et de son
   nombre de parts, et voir ce que coutent 1, 2, 3 parts ou la recette
   entiere. Aucun de ces libelles n'existe dans index.html, qui n'avait pas
   cette fonction. Tout le texte des recettes est dans ce bloc, y compris le
   tableau des parts que reprend l'editeur du Journal. */

/**
 * Calories et macros pour 1, 2, 3 parts et la recette entiere.
 *
 * Avec `onChoisir`, chaque ligne se touche pour choisir ce qu'on mange
 * (editeur du Journal) ; sans, c'est un simple tableau (editeur de
 * recette). `choisi` met en valeur la ligne qui correspond a la saisie.
 */
export function TableauParts({ total, parts, choisi, onChoisir }) {
  const lignes = lignesParParts(total, parts);
  if (!lignes.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {lignes.map((l) => {
        const actif = choisi != null && Math.abs(num(choisi) - l.parts) < 1e-9;
        const libelle = l.entiere ? `Recette entière (${l.parts} parts)` : `${l.parts} part${l.parts > 1 ? "s" : ""}`;
        const contenu = (
          <>
            <span style={{ fontWeight: 600, color: actif ? COLORS.gold : COLORS.text }}>{libelle}</span>
            <span style={{ fontFamily: "IBM Plex Mono", color: actif ? COLORS.gold : COLORS.textMuted, textAlign: "right" }}>
              {macros(l)}
            </span>
          </>
        );
        const style = {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          borderRadius: 8,
          fontSize: 11.5,
          border: `1px solid ${actif ? COLORS.gold : COLORS.border}`,
          background: actif ? `${COLORS.gold}1A` : "none",
          width: "100%",
          textAlign: "left"
        };
        return onChoisir ? (
          <button key={l.parts} onClick={() => onChoisir(l.parts)} style={{ ...style, cursor: "pointer" }}>
            {contenu}
          </button>
        ) : (
          <div key={l.parts} style={style}>
            {contenu}
          </div>
        );
      })}
    </div>
  );
}

export function Recettes({ habitudePesee }) {
  const [recettes, setRecettes] = useState(() => lireRecettes());
  const [edition, setEdition] = useState(null);
  const [choixIngredient, setChoixIngredient] = useState(false);

  const ouvrir = (recette) => {
    setEdition(
      recette
        ? { id: recette.id, nom: recette.name, portions: String(recette.portions || 1), ingredients: recette.items || [] }
        : { id: null, nom: "", portions: "", ingredients: [] }
    );
    // Une recette neuve n'a encore rien : autant ouvrir directement la
    // recherche du premier ingredient.
    setChoixIngredient(!recette);
  };

  const fermer = () => {
    setEdition(null);
    setChoixIngredient(false);
  };

  const ajouterIngredient = (aliment) => {
    setEdition((e) => ({ ...e, ingredients: [...e.ingredients, aliment] }));
    setChoixIngredient(false);
  };

  const retirerIngredient = (index) =>
    setEdition((e) => ({ ...e, ingredients: e.ingredients.filter((_, k) => k !== index) }));

  const enregistrer = () => {
    const liste = enregistrerRecette(lireRepasTypes(), {
      id: edition.id,
      nom: edition.nom,
      ingredients: edition.ingredients,
      portions: edition.portions
    });
    setRecettes(liste.filter(estRecette));
    fermer();
  };

  const supprimer = (recette) => {
    if (!window.confirm(`Supprimer la recette « ${recette.name} » ?`)) return;
    setRecettes(supprimerRepasType(lireRepasTypes(), recette.id).filter(estRecette));
  };

  const parts = edition ? Math.max(1, Math.round(num(edition.portions) || 1)) : 1;
  const total = edition ? totauxRepasType({ items: edition.ingredients }) : null;
  const valide = Boolean(edition && edition.nom.trim() && edition.ingredients.length && num(edition.portions) >= 1);

  return (
    <div style={{ marginBottom: 16 }}>
      <Btn variant="ghost" icon={BookOpen} onClick={() => ouvrir(null)} style={{ width: "100%" }}>
        Nouvelle recette — ingrédients et nombre de parts
      </Btn>

      {recettes.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 8
            }}
          >
            Mes recettes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recettes.map((r) => (
              <Card
                key={r.id}
                style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: COLORS.text, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: "IBM Plex Mono" }}>
                    {macros(totauxParPortion(r))} par part · {r.portions} part{r.portions > 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <IconBtn libelle="Modifier la recette" onClick={() => ouvrir(r)}>
                    <Pencil size={15} />
                  </IconBtn>
                  <IconBtn danger libelle="Supprimer la recette" onClick={() => supprimer(r)}>
                    <Trash2 size={15} />
                  </IconBtn>
                </div>
              </Card>
            ))}
          </div>
          <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "8px 0 0", lineHeight: 1.45 }}>
            Pour en manger : dans le Journal, « + ajouter » puis l'onglet Repas. L'app te demande combien de parts.
          </p>
        </div>
      )}

      <Modal
        open={!!edition}
        onClose={fermer}
        title={edition?.id ? "Modifier la recette" : "Nouvelle recette"}
        iconeFermer={X}
      >
        {edition && (
          <div>
            <Field label="Nom de la recette">
              <TextInput
                placeholder="Ex : Quiche lorraine, pizza maison..."
                value={edition.nom}
                onChange={(e) => setEdition({ ...edition, nom: e.target.value })}
              />
            </Field>
            <Field label="Nombre de parts">
              <NumberInput
                min="1"
                step="1"
                placeholder="Ex : 6"
                value={edition.portions}
                onChange={(e) => setEdition({ ...edition, portions: e.target.value })}
              />
              <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "6px 0 0", lineHeight: 1.45 }}>
                Combien de parts donne la recette entière ? L'app divisera pour toi.
              </p>
            </Field>

            <div
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8
              }}
            >
              Ingrédients de la recette entière
            </div>

            {edition.ingredients.length === 0 ? (
              <p style={{ fontSize: 12, color: COLORS.textFaint, margin: "0 0 10px", lineHeight: 1.5 }}>
                Ajoute chaque ingrédient avec la quantité utilisée pour TOUTE la recette : 200 g de lardons, 100 g
                de lait...
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {edition.ingredients.map((it, i) => (
                  <div
                    key={i}
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
                      <div style={{ fontSize: 12.5, color: COLORS.text }}>{it.name}</div>
                      <div style={{ fontSize: 10, color: COLORS.textFaint, fontFamily: "IBM Plex Mono" }}>
                        {macros({ kcal: num(it.calories), p: num(it.protein), c: num(it.carbs), f: num(it.fat) })}
                      </div>
                    </div>
                    <IconBtn danger libelle="Retirer l'ingrédient" onClick={() => retirerIngredient(i)}>
                      <Trash2 size={14} />
                    </IconBtn>
                  </div>
                ))}
              </div>
            )}

            {choixIngredient ? (
              <div
                style={{
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 12
                }}
              >
                <RechercheAliment onChoisir={ajouterIngredient} habitudePesee={habitudePesee} />
                <Btn
                  variant="ghost"
                  onClick={() => setChoixIngredient(false)}
                  style={{ width: "100%", marginTop: 10 }}
                >
                  Annuler cet ingrédient
                </Btn>
              </div>
            ) : (
              <Btn variant="ghost" icon={Plus} onClick={() => setChoixIngredient(true)} style={{ width: "100%" }}>
                Ajouter un ingrédient
              </Btn>
            )}

            {edition.ingredients.length > 0 && (
              <div
                style={{
                  background: `${COLORS.gold}14`,
                  border: `1px solid ${COLORS.gold}44`,
                  borderRadius: 10,
                  padding: 12,
                  marginTop: 12,
                  fontSize: 12
                }}
              >
                {parts > 1 ? (
                  <TableauParts total={total} parts={parts} />
                ) : (
                  <div style={{ color: COLORS.textMuted, fontFamily: "IBM Plex Mono" }}>Recette entière : {macros(total)}</div>
                )}
              </div>
            )}

            <Btn onClick={enregistrer} disabled={!valide} style={{ width: "100%", marginTop: 12 }}>
              Enregistrer la recette
            </Btn>
          </div>
        )}
      </Modal>
    </div>
  );
  /* FIN-TEXTE-NOUVEAU */
}
