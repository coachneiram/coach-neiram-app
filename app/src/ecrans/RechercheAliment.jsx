/**
 * Recherche d'un aliment (FoodFinder, index.html 2204-2330).
 *
 * Portage du mode « Recherche » : barre de recherche, liste de resultats,
 * favoris, et choix de la quantite en grammes.
 *
 * Les valeurs affichees sont celles pour 100 g, parce que c'est ce que le
 * client lit sur l'etiquette. Quand la fiche produit indique une portion de
 * reference, elle sert de quantite par defaut.
 *
 * Les favoris sont volontairement stockes hors du prefixe coach_ (cle
 * cn_food_favorites, comme dans l'application actuelle) : ce sont des
 * raccourcis de saisie, pas des donnees de suivi, et ils n'ont rien a faire
 * dans une sauvegarde de journal.
 */

import { useCallback, useEffect, useState } from "react";
import { COLORS } from "../tokens.js";
import { num, round } from "../lib/dates.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { chercherAliments } from "../lib/recherche-aliments.js";
import { Btn, Field, NumberInput, TextInput } from "../ui/primitives.jsx";
import { Loader2, Search, Star } from "../ui/icones.jsx";

const CLE_FAVORIS = "cn_food_favorites";

/** Au-dela, la liste des favoris n'est plus un raccourci mais un catalogue. */
const MAX_FAVORIS = 80;

function useFavorisAliments() {
  const [favoris, setFavoris] = useState([]);

  useEffect(() => {
    const stockes = charger(CLE_FAVORIS, []);
    setFavoris(Array.isArray(stockes) ? stockes : []);
  }, []);

  const estFavori = useCallback((code) => favoris.some((f) => f.code === code), [favoris]);

  const basculer = useCallback((p) => {
    setFavoris((precedents) => {
      const deja = precedents.some((f) => f.code === p.code);
      const suivants = deja
        ? precedents.filter((f) => f.code !== p.code)
        : [
            {
              code: p.code,
              name: p.name,
              brand: p.brand || "",
              kcal100: p.kcal100,
              p100: p.p100 || 0,
              c100: p.c100 || 0,
              f100: p.f100 || 0,
              serving: p.serving || 100
            },
            ...precedents
          ].slice(0, MAX_FAVORIS);
      enregistrer(CLE_FAVORIS, suivants);
      return suivants;
    });
  }, []);

  return { favoris, estFavori, basculer };
}

function EtoileFavori({ actif, onBasculer }) {
  const libelle = actif ? "Retirer des favoris" : "Ajouter aux favoris";
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onBasculer();
      }}
      aria-label={libelle}
      title={libelle}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "6px 4px",
        display: "flex",
        alignItems: "center",
        flexShrink: 0
      }}
    >
      <Star size={15} fill={actif ? COLORS.gold : "none"} color={actif ? COLORS.gold : COLORS.textFaint} />
    </button>
  );
}

function LigneAliment({ p, choisi, onChoisir, estFavori, onBasculerFavori }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        background: choisi ? `${COLORS.gold}14` : COLORS.bgAlt,
        border: `1px solid ${choisi ? COLORS.gold : COLORS.border}`,
        borderRadius: 8,
        paddingRight: 6
      }}
    >
      <button
        onClick={onChoisir}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          borderRadius: 8,
          padding: "9px 11px",
          cursor: "pointer",
          textAlign: "left"
        }}
      >
        <span style={{ fontSize: 12.5, color: COLORS.text, minWidth: 0 }}>
          {p.name}
          {p.brand ? <span style={{ color: COLORS.textFaint }}> — {p.brand}</span> : null}
        </span>
        <span
          style={{ fontSize: 10.5, color: COLORS.textFaint, fontFamily: "IBM Plex Mono", flexShrink: 0 }}
        >
          {p.kcal100} kcal · P{p.p100} G{p.c100} L{p.f100}
        </span>
      </button>
      <EtoileFavori actif={estFavori} onBasculer={onBasculerFavori} />
    </div>
  );
}

function QuantiteProduit({ produit, onChoisir }) {
  const [grammes, setGrammes] = useState(produit.serving || 100);
  const g = Math.max(0, num(grammes));
  const kcal = Math.round(((produit.kcal100 || 0) * g) / 100);
  const pr = round(((produit.p100 || 0) * g) / 100, 1);
  const ca = round(((produit.c100 || 0) * g) / 100, 1);
  const fa = round(((produit.f100 || 0) * g) / 100, 1);

  return (
    <div
      style={{
        background: COLORS.bgAlt,
        border: `1px solid ${COLORS.borderLight}`,
        borderRadius: 10,
        padding: 12,
        marginTop: 10
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>
        {produit.name}
        {produit.brand ? (
          <span style={{ color: COLORS.textMuted, fontWeight: 400 }}> — {produit.brand}</span>
        ) : null}
      </div>
      <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 3, fontFamily: "IBM Plex Mono" }}>
        {produit.kcal100} kcal · P{produit.p100} G{produit.c100} L{produit.f100} / 100 g
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 10 }}>
        <div style={{ width: 110 }}>
          <Field label="Quantité (g)">
            <NumberInput value={grammes} onChange={(e) => setGrammes(e.target.value)} />
          </Field>
        </div>
        <div
          style={{
            flex: 1,
            paddingBottom: 14,
            fontSize: 12,
            color: COLORS.textMuted,
            fontFamily: "IBM Plex Mono"
          }}
        >
          {kcal} kcal · P{pr} G{ca} L{fa}
        </div>
      </div>
      <Btn
        onClick={() =>
          onChoisir({
            name: `${produit.name}${produit.brand ? " — " + produit.brand : ""} (${g} g)`,
            calories: kcal,
            protein: pr,
            carbs: ca,
            fat: fa,
            grams: g,
            baseName: produit.name
          })
        }
        style={{ width: "100%" }}
        disabled={g <= 0}
      >
        Ajouter
      </Btn>
    </div>
  );
}

export function RechercheAliment({ onChoisir }) {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState(null);
  const [choisi, setChoisi] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const favApi = useFavorisAliments();

  /* MIGRATION-EN-COURS
   * Les modes « Photo IA » et « Code-barres » de FoodFinder ne sont pas
   * encore portes : ils dependent de analyzeMealPhoto, readBarcodeFromImage
   * et fetchProductByBarcode, qui restent a migrer. Le selecteur de mode est
   * masque tant qu'ils n'existent pas, plutot que d'afficher des onglets
   * inertes.
   * FIN-MIGRATION-EN-COURS */

  const chercher = async () => {
    if (!q.trim()) return;
    setEnCours(true);
    setErreur(null);
    setChoisi(null);
    try {
      const r = await chercherAliments(q.trim());
      setResultats(r);
      if (!r.length) setErreur("Aucun produit trouvé. Essaie un autre libellé ou la saisie libre.");
    } catch (e) {
      setResultats(null);
      setErreur(
        "Recherche indisponible (connexion à Open Food Facts impossible ici). Utilise la photo IA ou la saisie libre."
      );
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <TextInput
          placeholder="Ex : skyr, riz basmati, Danacol..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") chercher();
          }}
          style={{ flex: 1 }}
        />
        <Btn
          onClick={chercher}
          disabled={enCours || !q.trim()}
          icon={enCours ? Loader2 : Search}
          style={{ padding: "10px 14px" }}
        >
          {enCours ? "" : "Chercher"}
        </Btn>
      </div>

      {resultats && resultats.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 260,
            overflowY: "auto",
            marginTop: 10
          }}
        >
          {resultats.map((p) => (
            <LigneAliment
              key={p.code}
              p={p}
              choisi={choisi?.code === p.code}
              onChoisir={() => setChoisi(p)}
              estFavori={favApi.estFavori(p.code)}
              onBasculerFavori={() => favApi.basculer(p)}
            />
          ))}
        </div>
      )}

      {(!resultats || resultats.length === 0) && favApi.favoris.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10.5,
              fontWeight: 600,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 8
            }}
          >
            <Star size={12} fill={COLORS.gold} color={COLORS.gold} />
            Mes aliments favoris
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}
          >
            {favApi.favoris.map((p) => (
              <LigneAliment
                key={p.code}
                p={p}
                choisi={choisi?.code === p.code}
                onChoisir={() => setChoisi(p)}
                estFavori
                onBasculerFavori={() => favApi.basculer(p)}
              />
            ))}
          </div>
        </div>
      )}

      {choisi && <QuantiteProduit produit={choisi} onChoisir={onChoisir} />}

      <p style={{ fontSize: 10, color: COLORS.textFaint, marginTop: 10, marginBottom: 0 }}>
        Base ouverte Open Food Facts — valeurs déclarées par les fabricants, très bonne couverture des produits
        français.
      </p>

      {erreur && (
        <p style={{ fontSize: 12, color: COLORS.bad, marginTop: 10, marginBottom: 0 }}>{erreur}</p>
      )}
    </div>
  );
}
