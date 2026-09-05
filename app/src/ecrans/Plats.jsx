/**
 * Section « Mes plats » de l'ecran Repas.
 *
 * Portage fidele de PlatsSection (index.html, ligne 2505).
 *
 * Ces plats sont les repas habituels du client, enregistres une fois pour
 * etre re-saisis en un geste depuis le Journal. C'est ce qui fait qu'un
 * suivi alimentaire tient dans la duree : personne ne retape les macros de
 * son petit-dejeuner tous les matins.
 *
 * L'import ouvre le meme selecteur d'aliments que le Journal : recherche
 * par nom, photo de l'assiette, ou code-barres. C'est ce qui evite de
 * retaper les macros d'une etiquette a la main.
 *
 * REGRESSION DE LA BASCULE : ce bouton avait ete laisse en attente, sans
 * rien derriere. Il annoncait « recherche, photo IA ou code-barres » et
 * n'ouvrait rien du tout.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { num } from "../lib/dates.js";
import {
  Btn,
  Card,
  EmptyState,
  Field,
  IconBtn,
  Modal,
  NumberInput,
  TextInput
} from "../ui/primitives.jsx";
import { Camera, Pencil, Plus, Trash2, UtensilsCrossed, X } from "../ui/icones.jsx";
import { RechercheAliment } from "./RechercheAliment.jsx";

export function Plats({ api, habitudePesee }) {
  const [modalOuverte, setModalOuverte] = useState(false);
  const [importOuvert, setImportOuvert] = useState(false);
  const [edition, setEdition] = useState(null);
  const [recherche, setRecherche] = useState("");

  /**
   * Un aliment choisi devient un plat.
   *
   * L'aliment est repris TEL QUEL, comme dans l'application d'origine :
   * le nom porte deja la quantite (« Riz basmati (100 g) ») et le champ
   * grams va avec. J'avais d'abord retire grams en pensant bien faire —
   * ca laissait un plat dont le nom annonce 100 g sans que l'app le
   * sache, donc impossible a re-echelonner ensuite.
   */
  const importer = async (aliment) => {
    await api.add(aliment);
    setImportOuvert(false);
  };

  const nouveau = () => {
    setEdition({ id: null, name: "", calories: "", protein: "", carbs: "", fat: "" });
    setModalOuverte(true);
  };

  const modifier = (plat) => {
    setEdition(plat);
    setModalOuverte(true);
  };

  const enregistrer = async () => {
    const payload = {
      ...edition,
      calories: num(edition.calories),
      protein: num(edition.protein),
      carbs: num(edition.carbs),
      fat: num(edition.fat)
    };
    delete payload.id;
    if (edition.id) await api.update(edition.id, payload);
    else await api.add(payload);
    setModalOuverte(false);
  };

  // Tri alphabetique avec localeCompare : sans lui, « Œufs » et « Épinards »
  // se retrouveraient apres « Zucchini ».
  const plats = [...api.items]
    .filter((d) => d.name.toLowerCase().includes(recherche.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <TextInput
          placeholder="Rechercher..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          style={{ flex: 1 }}
        />
        <Btn icon={Plus} onClick={nouveau}>
          Nouveau plat
        </Btn>
      </div>

      <Btn
        variant="ghost"
        icon={Camera}
        onClick={() => setImportOuvert(true)}
        style={{ width: "100%", marginBottom: 16 }}
      >
        Importer un aliment — recherche, photo IA ou code-barres
      </Btn>

      {plats.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          message="Aucun plat enregistré. Ajoute tes plats habituels pour les retrouver rapidement dans ton journal."
          ctaLabel="Nouveau plat"
          onCta={nouveau}
          iconeCta={Plus}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {plats.map((d) => (
            <Card
              key={d.id}
              style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <div>
                <div style={{ fontSize: 14, color: COLORS.text, fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: "IBM Plex Mono" }}>
                  {d.calories} kcal · P{d.protein} G{d.carbs} L{d.fat}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <IconBtn onClick={() => modifier(d)}>
                  <Pencil size={15} />
                </IconBtn>
                <IconBtn danger onClick={() => api.remove(d.id)}>
                  <Trash2 size={15} />
                </IconBtn>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={importOuvert}
        onClose={() => setImportOuvert(false)}
        title="Importer un aliment"
        iconeFermer={X}
      >
        <RechercheAliment onChoisir={importer} habitudePesee={habitudePesee} />
      </Modal>

      <Modal
        open={modalOuverte}
        onClose={() => setModalOuverte(false)}
        title={edition?.id ? "Modifier le plat" : "Nouveau plat"}
        iconeFermer={X}
      >
        {edition && (
          <div>
            <Field label="Nom">
              <TextInput value={edition.name} onChange={(e) => setEdition({ ...edition, name: e.target.value })} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              <Field label="Kcal">
                <NumberInput
                  value={edition.calories}
                  onChange={(e) => setEdition({ ...edition, calories: e.target.value })}
                />
              </Field>
              <Field label="P (g)">
                <NumberInput
                  value={edition.protein}
                  onChange={(e) => setEdition({ ...edition, protein: e.target.value })}
                />
              </Field>
              <Field label="G (g)">
                <NumberInput value={edition.carbs} onChange={(e) => setEdition({ ...edition, carbs: e.target.value })} />
              </Field>
              <Field label="L (g)">
                <NumberInput value={edition.fat} onChange={(e) => setEdition({ ...edition, fat: e.target.value })} />
              </Field>
            </div>
            <Btn onClick={enregistrer} style={{ width: "100%", marginTop: 8 }}>
              Enregistrer
            </Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}
