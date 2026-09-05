/**
 * Recherche d'un aliment (FoodFinder, index.html 2204-2330).
 *
 * Trois facons d'identifier un aliment, selon ce que le client a sous la
 * main : le chercher par son nom, photographier l'assiette, ou scanner le
 * code-barres de l'emballage.
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

import { useCallback, useEffect, useRef, useState } from "react";
import { COLORS } from "../tokens.js";
import { num, round } from "../lib/dates.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { chercherAliments, chercherParCodeBarres } from "../lib/recherche-aliments.js";
import { mentionEtat } from "../lib/fibres.js";
import { redimensionnerPhoto } from "../lib/images.js";
import { analyserPhotoRepas, lireCodeBarres } from "../lib/photo-aliment.js";
import { messageErreur } from "../lib/ia.js";
import { Btn, Field, NumberInput, TextInput } from "../ui/primitives.jsx";
import { Barcode, Camera, Loader2, Search, Star } from "../ui/icones.jsx";

const CLE_FAVORIS = "cn_food_favorites";

/**
 * Un HEIC d'iPhone ouvert depuis un ordinateur n'est decodable par aucun
 * navigateur de bureau. Le dire explicitement evite au client de croire que
 * l'analyse est en panne.
 */
const MSG_FORMAT_PHOTO =
  "Ce fichier photo n'est pas dans un format lisible par ce navigateur (souvent le cas des photos HEIC d'iPhone ouvertes depuis un ordinateur). Choisis une photo JPEG/PNG, ou utilise Safari sur iPhone.";

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
          {/* TEXTE-NOUVEAU
              Mention « pesé cru » / « pesé cuit », ajoutee apres la bascule.
              Le boulgour affiche 345 kcal cru et 83 kcal cuit : sans cette
              mention, un client qui pese son assiette se trompe d'un facteur
              quatre, et rien ne le signale.
          */}
          {mentionEtat(p.etat) ? (
            <span style={{ color: COLORS.gold, fontSize: 10.5 }}> · {mentionEtat(p.etat)}</span>
          ) : null}
          {/* FIN-TEXTE-NOUVEAU */}
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

export function RechercheAliment({ onChoisir, habitudePesee }) {
  const [mode, setMode] = useState("search");
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState(null);
  const [choisi, setChoisi] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const champPhoto = useRef(null);
  const champScan = useRef(null);
  const [apercuPhoto, setApercuPhoto] = useState(null);
  const [resultatPhoto, setResultatPhoto] = useState(null);
  const [codeSaisi, setCodeSaisi] = useState("");
  const favApi = useFavorisAliments();

  const changerMode = (m) => {
    setMode(m);
    setErreur(null);
    setChoisi(null);
    setResultats(null);
    setResultatPhoto(null);
    setApercuPhoto(null);
  };

  const chercher = async () => {
    if (!q.trim()) return;
    setEnCours(true);
    setErreur(null);
    setChoisi(null);
    try {
      const r = await chercherAliments(q.trim(), undefined, habitudePesee);
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

  const analyserPhoto = async (fichier) => {
    if (!fichier) return;
    setEnCours(true);
    setErreur(null);
    setResultatPhoto(null);
    try {
      // 800 px suffisent au modele pour reconnaitre une assiette, et
      // divisent par dix le poids envoye depuis un mobile.
      const dataUrl = await redimensionnerPhoto(fichier, 800, 0.78);
      setApercuPhoto(dataUrl);
      setResultatPhoto(await analyserPhotoRepas(dataUrl));
    } catch (e) {
      console.error("[Coach Neiram] Photo repas — erreur:", e);
      setErreur(
        e && e.message === "image-format"
          ? MSG_FORMAT_PHOTO
          : messageErreur(
              e,
              "Analyse impossible. Réessaie avec une photo plus nette (assiette entière, bien éclairée) ou passe en saisie libre."
            )
      );
    } finally {
      setEnCours(false);
    }
  };

  const chercherCode = async (code) => {
    setEnCours(true);
    setErreur(null);
    setChoisi(null);
    try {
      const p = await chercherParCodeBarres(code);
      if (p) setChoisi(p);
      else setErreur(`Code ${code} introuvable dans Open Food Facts. Vérifie le numéro ou passe en saisie libre.`);
    } catch (e) {
      setErreur("Base produits injoignable ici. Utilise la photo IA ou la saisie libre.");
    } finally {
      setEnCours(false);
    }
  };

  const scannerPhoto = async (fichier) => {
    if (!fichier) return;
    setEnCours(true);
    setErreur(null);
    setChoisi(null);
    try {
      // Plus de definition que pour un repas : les barres fines d'un EAN-13
      // deviennent illisibles en dessous.
      const dataUrl = await redimensionnerPhoto(fichier, 1100, 0.82);
      const code = await lireCodeBarres(dataUrl);
      if (!code) {
        setErreur("Code-barres illisible sur la photo. Cadre-le de près, bien à plat, ou tape le numéro.");
      } else {
        setCodeSaisi(code);
        await chercherCode(code);
      }
    } catch (e) {
      setErreur(
        e && e.message === "image-format"
          ? MSG_FORMAT_PHOTO
          : messageErreur(e, "Lecture du code impossible. Tape le numéro sous le code-barres.")
      );
    } finally {
      setEnCours(false);
    }
  };

  const puce = (id, libelle, Icone) => (
    <button
      key={id}
      onClick={() => changerMode(id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 11px",
        borderRadius: 9,
        border: `1px solid ${mode === id ? COLORS.gold : COLORS.border}`,
        background: mode === id ? `${COLORS.gold}1A` : COLORS.bgAlt,
        color: mode === id ? COLORS.gold : COLORS.textMuted,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer"
      }}
    >
      <Icone size={14} />
      {libelle}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
        {puce("search", "Recherche", Search)}
        {puce("photo", "Photo IA", Camera)}
        {puce("scan", "Code-barres", Barcode)}
      </div>

      {mode === "search" && (
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

          {/* TEXTE-NOUVEAU
              Reponse a une question posee par une cliente : « ce qui est
              difficile c'est de savoir si on doit peser cru ou cuit, je
              pense que c'est cru pour tout ». C'est faux, et l'erreur va
              jusqu'a un facteur quatre sur le boulgour. La reponse doit
              etre la, au moment ou elle pese, pas dans un message a part.
          */}
          <p style={{ fontSize: 10.5, color: COLORS.textMuted, marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
            <strong style={{ color: COLORS.gold }}>Cru ou cuit ?</strong> Ce n'est pas cru pour tout : chaque
            aliment le précise. Fie-toi à la mention affichée, et pèse dans cet état-là. Sur le riz ou les
            pâtes, se tromper fausse le calcul d'un facteur trois.
          </p>
          {/* FIN-TEXTE-NOUVEAU */}

          <p style={{ fontSize: 10, color: COLORS.textFaint, marginTop: 10, marginBottom: 0 }}>
            Base ouverte Open Food Facts — valeurs déclarées par les fabricants, très bonne couverture des
            produits français.
          </p>
        </div>
      )}

      {mode === "photo" && (
        <div>
          <input
            type="file"
            accept="image/*"
            ref={champPhoto}
            style={{ display: "none" }}
            onChange={(e) => {
              analyserPhoto(e.target.files[0]);
              // Sans ce vidage, rechoisir la meme photo ne declenche rien.
              e.target.value = "";
            }}
          />
          {!resultatPhoto && (
            <Btn
              variant="ghost"
              icon={enCours ? Loader2 : Camera}
              onClick={() => champPhoto.current?.click()}
              disabled={enCours}
              style={{ width: "100%" }}
            >
              {enCours ? "Analyse de la photo en cours..." : "Prendre / choisir une photo du repas"}
            </Btn>
          )}
          {apercuPhoto && (
            <img
              src={apercuPhoto}
              alt="Repas"
              style={{ width: "100%", maxHeight: 170, objectFit: "cover", borderRadius: 10, marginTop: 10 }}
            />
          )}
          {resultatPhoto && (
            <div
              style={{
                background: COLORS.bgAlt,
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: 10,
                padding: 12,
                marginTop: 10
              }}
            >
              <div style={{ fontSize: 11, color: COLORS.textFaint, marginBottom: 8 }}>
                Estimation IA ({resultatPhoto.confidence})
                {resultatPhoto.portion ? ` · ${resultatPhoto.portion}` : ""} — ajuste les valeurs si besoin.
              </div>
              <Field label="Nom">
                <TextInput
                  value={resultatPhoto.name}
                  onChange={(e) => setResultatPhoto({ ...resultatPhoto, name: e.target.value })}
                />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                <Field label="Kcal">
                  <NumberInput
                    value={resultatPhoto.calories}
                    onChange={(e) => setResultatPhoto({ ...resultatPhoto, calories: e.target.value })}
                  />
                </Field>
                <Field label="P (g)">
                  <NumberInput
                    value={resultatPhoto.protein}
                    onChange={(e) => setResultatPhoto({ ...resultatPhoto, protein: e.target.value })}
                  />
                </Field>
                <Field label="G (g)">
                  <NumberInput
                    value={resultatPhoto.carbs}
                    onChange={(e) => setResultatPhoto({ ...resultatPhoto, carbs: e.target.value })}
                  />
                </Field>
                <Field label="L (g)">
                  <NumberInput
                    value={resultatPhoto.fat}
                    onChange={(e) => setResultatPhoto({ ...resultatPhoto, fat: e.target.value })}
                  />
                </Field>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn
                  variant="ghost"
                  onClick={() => {
                    setResultatPhoto(null);
                    setApercuPhoto(null);
                    champPhoto.current?.click();
                  }}
                  style={{ flex: 1 }}
                >
                  Autre photo
                </Btn>
                <Btn
                  onClick={() =>
                    onChoisir({
                      name: resultatPhoto.name,
                      calories: num(resultatPhoto.calories),
                      protein: num(resultatPhoto.protein),
                      carbs: num(resultatPhoto.carbs),
                      fat: num(resultatPhoto.fat)
                    })
                  }
                  style={{ flex: 1 }}
                >
                  Ajouter
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "scan" && (
        <div>
          <input
            type="file"
            accept="image/*"
            ref={champScan}
            style={{ display: "none" }}
            onChange={(e) => {
              scannerPhoto(e.target.files[0]);
              e.target.value = "";
            }}
          />
          <Btn
            variant="ghost"
            icon={enCours ? Loader2 : Camera}
            onClick={() => champScan.current?.click()}
            disabled={enCours}
            style={{ width: "100%" }}
          >
            {enCours ? "Lecture en cours..." : "Photographier le code-barres"}
          </Btn>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <TextInput
              placeholder="ou tape le numéro (ex : 3017620422003)"
              inputMode="numeric"
              value={codeSaisi}
              onChange={(e) => setCodeSaisi(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && codeSaisi.length >= 8) chercherCode(codeSaisi);
              }}
              style={{ flex: 1 }}
            />
            <Btn
              onClick={() => chercherCode(codeSaisi)}
              disabled={enCours || codeSaisi.length < 8}
              style={{ padding: "10px 14px" }}
            >
              OK
            </Btn>
          </div>
          {choisi && <QuantiteProduit produit={choisi} onChoisir={onChoisir} />}
          <p style={{ fontSize: 10, color: COLORS.textFaint, marginTop: 10, marginBottom: 0 }}>
            Produits reconnus via la base ouverte Open Food Facts.
          </p>
        </div>
      )}

      {erreur && (
        <p style={{ fontSize: 12, color: COLORS.bad, marginTop: 10, marginBottom: 0 }}>{erreur}</p>
      )}
    </div>
  );
}
