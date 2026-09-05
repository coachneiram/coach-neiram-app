/**
 * Section « Courses » de l'ecran Repas.
 *
 * Portage de CoursesSection (index.html, ligne 2531), sans les outils de
 * reconnaissance par photo et code-barres ni la suggestion de repas, qui
 * suivront.
 *
 * Le comptage des cochages sert a remonter les achats reguliers en tete :
 * quelqu'un qui coche « bananes » toutes les semaines ne devrait pas avoir
 * a la chercher dans le rayon fruits a chaque fois.
 */

import { useEffect, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { uid } from "../lib/semaine.js";
import { articleCoursesOk } from "../lib/aliments.js";
import { SHOPPING_LIST } from "../lib/catalogues.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { Btn, Card, TextInput } from "../ui/primitives.jsx";
import { Loader2, X } from "../ui/icones.jsx";

const CLE_COCHES = "coach_shopping_checked";
const CLE_AJOUTS = "coach_shopping_custom";
const CLE_FREQUENCE = "coach_shopping_freq";

/** A partir de combien de cochages un article devient « regulier ». */
const SEUIL_REGULIER = 2;
const MAX_REGULIERS = 10;

const styleTitreRayon = {
  fontFamily: POLICES.titre,
  fontSize: 12.5,
  fontWeight: 700,
  color: COLORS.gold,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  marginBottom: 10
};

/** Identifiant stable d'un article : son rayon et son nom. */
const cle = (idRayon, nom) => idRayon + ":" + nom;

export function Courses({ profile }) {
  const [coches, setCoches] = useState({});
  const [ajouts, setAjouts] = useState([]);
  const [brouillon, setBrouillon] = useState("");
  const [frequence, setFrequence] = useState({});
  const [adapter, setAdapter] = useState(true);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    setCoches(charger(CLE_COCHES, {}) || {});
    setAjouts(charger(CLE_AJOUTS, []) || []);
    setFrequence(charger(CLE_FREQUENCE, {}) || {});
    setPret(true);
  }, []);

  const enregistrerCoches = (suivant) => {
    setCoches(suivant);
    enregistrer(CLE_COCHES, suivant);
  };

  const basculer = (id) => {
    const cocher = !coches[id];
    const suivant = { ...coches, [id]: cocher };
    // Un article decoche disparait de l'objet plutot que de valoir false :
    // sinon le compteur « X cochés » gonflerait avec l'historique.
    if (!cocher) delete suivant[id];
    enregistrerCoches(suivant);

    if (cocher) {
      const suite = { ...frequence, [id]: (frequence[id] || 0) + 1 };
      setFrequence(suite);
      enregistrer(CLE_FREQUENCE, suite);
    }
  };

  const ajouter = () => {
    const nom = brouillon.trim();
    if (!nom) return;
    const suivant = [...ajouts, { id: uid(), name: nom }];
    setAjouts(suivant);
    setBrouillon("");
    enregistrer(CLE_AJOUTS, suivant);
  };

  const retirer = (id) => {
    const suivant = ajouts.filter((c) => c.id !== id);
    setAjouts(suivant);
    enregistrer(CLE_AJOUTS, suivant);
  };

  const toutDecocher = () => enregistrerCoches({});

  /**
   * Articles visibles d'un rayon.
   *
   * Un article sans valeur nutritionnelle reste toujours visible : c'est le
   * cas des produits d'entretien et des epices, qu'aucun regime n'exclut.
   */
  const articlesVisibles = (rayon) =>
    adapter ? rayon.items.filter((it) => it.kcal == null || articleCoursesOk(it, profile)) : rayon.items;

  const totalArticles =
    SHOPPING_LIST.reduce((total, rayon) => total + articlesVisibles(rayon).length, 0) + ajouts.length;
  const totalCoches = Object.keys(coches).length;

  const reguliers = Object.entries(frequence)
    .filter(([, n]) => n >= SEUIL_REGULIER)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_REGULIERS)
    .map(([id]) => {
      const ajout = ajouts.find((c) => c.id === id);
      if (ajout) return { id, item: { n: ajout.name } };
      for (const rayon of SHOPPING_LIST) {
        const trouve = rayon.items.find((it) => cle(rayon.id, it.n) === id);
        if (trouve) return { id, item: trouve };
      }
      return null;
    })
    .filter(Boolean);

  if (!pret) {
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        <Loader2 size={18} className="spin" color={COLORS.gold} />
      </div>
    );
  }

  const Ligne = ({ id, item, onRetirer }) => (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        background: COLORS.bgAlt,
        borderRadius: 8,
        cursor: "pointer"
      }}
    >
      <input
        type="checkbox"
        checked={!!coches[id]}
        onChange={() => basculer(id)}
        style={{ width: 16, height: 16, accentColor: COLORS.gold, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: coches[id] ? COLORS.textFaint : COLORS.text,
            textDecoration: coches[id] ? "line-through" : "none"
          }}
        >
          {item.n}
        </div>
        {item.kcal != null && (
          <div style={{ fontSize: 9.5, color: COLORS.textFaint, fontFamily: "IBM Plex Mono", marginTop: 1 }}>
            {item.kcal} kcal · P{item.p} G{item.c} L{item.f} /100g
          </div>
        )}
      </div>
      {onRetirer && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onRetirer();
          }}
          style={{
            background: "none",
            border: "none",
            color: COLORS.textFaint,
            cursor: "pointer",
            padding: 2,
            display: "flex"
          }}
        >
          <X size={13} />
        </button>
      )}
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: COLORS.textMuted }}>
          {totalCoches} coché{totalCoches > 1 ? "s" : ""} · {totalArticles} article{totalArticles > 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: COLORS.textMuted, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={adapter}
              onChange={(e) => setAdapter(e.target.checked)}
              style={{ width: 14, height: 14, accentColor: COLORS.gold }}
            />
            Adapter à mon profil
          </label>
          <Btn variant="ghost" onClick={toutDecocher} style={{ padding: "7px 12px", fontSize: 12 }}>
            Réinitialiser
          </Btn>
        </div>
      </div>

      {reguliers.length > 0 && (
        <Card style={{ padding: 14 }}>
          <div style={{ ...styleTitreRayon, marginBottom: 4 }}>⭐ Achats réguliers</div>
          <p style={{ fontSize: 10, color: COLORS.textFaint, margin: "0 0 10px" }}>
            Tes articles les plus cochés — pour faire tes courses plus vite.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {reguliers.map((r) => (
              <Ligne key={r.id} id={r.id} item={r.item} />
            ))}
          </div>
        </Card>
      )}

      {SHOPPING_LIST.map((rayon) => {
        const articles = articlesVisibles(rayon);
        if (!articles.length) return null;
        return (
          <Card key={rayon.id} style={{ padding: 14 }}>
            <div style={styleTitreRayon}>{rayon.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {articles.map((it) => (
                <Ligne key={it.n} id={cle(rayon.id, it.n)} item={it} />
              ))}
            </div>
          </Card>
        );
      })}

      <Card style={{ padding: 14 }}>
        <div style={styleTitreRayon}>➕ Mes ajouts</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
          {ajouts.map((c) => (
            <Ligne key={c.id} id={c.id} item={{ n: c.name }} onRetirer={() => retirer(c.id)} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <TextInput
            placeholder="Ajouter un article..."
            value={brouillon}
            onChange={(e) => setBrouillon(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ajouter();
            }}
            style={{ flex: 1 }}
          />
          <Btn onClick={ajouter} disabled={!brouillon.trim()} style={{ padding: "10px 14px" }}>
            OK
          </Btn>
        </div>
      </Card>

      <p style={{ fontSize: 9.5, color: COLORS.textFaint, margin: "0 2px" }}>
        Macros pour 100 g. « Adapter à mon profil » masque les articles incompatibles avec ton régime et tes
        allergies.
      </p>
    </div>
  );
}
