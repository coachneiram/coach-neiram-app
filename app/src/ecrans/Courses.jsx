/**
 * Section « Courses » de l'ecran Repas.
 *
 * Portage de CoursesSection (index.html, ligne 2532).
 *
 * Le comptage des cochages sert a remonter les achats reguliers en tete :
 * quelqu'un qui coche « bananes » toutes les semaines ne devrait pas avoir
 * a la chercher dans le rayon fruits a chaque fois.
 */

import { useEffect, useRef, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { uid } from "../lib/semaine.js";
import { articleCoursesOk } from "../lib/aliments.js";
import { num } from "../lib/dates.js";
import { ROLE_LABELS, SHOPPING_LIST } from "../lib/catalogues.js";
import { articlesAPlat, estimerMacrosLibres, ideeRepasPour } from "../lib/idee-repas.js";
import { redimensionnerPhoto } from "../lib/images.js";
import { analyserPhotoRepas, lireCodeBarres } from "../lib/photo-aliment.js";
import { chercherParCodeBarres } from "../lib/recherche-aliments.js";
import { messageErreur } from "../lib/ia.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { Btn, Card, TextInput } from "../ui/primitives.jsx";
import { Loader2, X } from "../ui/icones.jsx";
import { ChoixPhoto } from "../ui/ChoixPhoto.jsx";

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

const MSG_FORMAT_PHOTO = "Photo illisible par ce navigateur. Choisis une image JPEG ou PNG.";

/** Identifiant stable d'un article : son rayon et son nom. */
const cle = (idRayon, nom) => idRayon + ":" + nom;

export function Courses({ profile }) {
  const [coches, setCoches] = useState({});
  const [ajouts, setAjouts] = useState([]);
  const [brouillon, setBrouillon] = useState("");
  const [frequence, setFrequence] = useState({});
  const [adapter, setAdapter] = useState(true);
  const [idee, setIdee] = useState(null);
  const [outilEnCours, setOutilEnCours] = useState(null);
  const [outilMsg, setOutilMsg] = useState(null);
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

  const basculer = (id, article) => {
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

      // Cocher un aliment en rayon est le moment ou la decision se prend :
      // c'est la, et pas dans un ecran de conseils, qu'une idee d'assiette
      // sert a quelque chose.
      if (article && article.role && article.kcal != null) {
        const proposition = ideeRepasPour(article, profile);
        if (proposition) setIdee(proposition);
      }
    }
  };

  const cocherArticlesIdee = () => {
    if (!idee) return;
    const suivant = { ...coches };
    idee.picks.forEach((p) => {
      suivant[cle(p.item.catId, p.item.n)] = true;
    });
    enregistrerCoches(suivant);
    setIdee(null);
  };

  /** Enregistre les ajouts sans le drapeau d'attente, qui ne survit pas au rechargement. */
  const enregistrerAjouts = (liste) =>
    enregistrer(CLE_AJOUTS, liste.map(({ pending, ...reste }) => reste));

  const ajouter = async (nomImpose) => {
    const brut = typeof nomImpose === "string" ? nomImpose : brouillon;
    const nom = String(brut || "").trim();
    if (!nom) return;

    // L'article apparait tout de suite dans la liste : l'estimation des
    // macros peut prendre plusieurs secondes, et une liste de courses reste
    // utile sans elles.
    const entree = { id: uid(), name: nom, pending: true };
    const suivant = [...ajouts, entree];
    setAjouts(suivant);
    if (typeof nomImpose !== "string") setBrouillon("");
    enregistrerAjouts(suivant);

    const macros = await estimerMacrosLibres(nom);
    setAjouts((courant) => {
      const complete = courant.map((c) =>
        c.id === entree.id
          ? { ...c, pending: false, ...(macros ? { kcal: macros.kcal, p: macros.p, c: macros.c, f: macros.f, source: macros.source } : {}) }
          : c
      );
      enregistrerAjouts(complete);
      return complete;
    });
  };

  /** Ajout dont les macros sont deja connues (photo, code-barres). */
  const ajouterAvecMacros = (nom, macros) => {
    const propre = String(nom || "").trim();
    if (!propre) return;
    setAjouts((courant) => {
      const complete = [...courant, { id: uid(), name: propre, pending: false, ...macros }];
      enregistrerAjouts(complete);
      return complete;
    });
  };

  const photoAliment = async (fichier) => {
    if (!fichier) return;
    setOutilEnCours("photo");
    setOutilMsg("Analyse de la photo…");
    try {
      const dataUrl = await redimensionnerPhoto(fichier, 800, 0.78);
      const r = await analyserPhotoRepas(dataUrl);
      const nom = r && r.name ? String(r.name).trim() : "";
      if (!nom) throw new Error("name");
      ajouterAvecMacros(nom, {
        kcal: num(r.calories) || null,
        p: num(r.protein) || null,
        c: num(r.carbs) || null,
        f: num(r.fat) || null,
        source: "photo"
      });
      setOutilMsg(`Ajouté : ${nom}`);
    } catch (e) {
      console.error("[Coach Neiram] Courses — photo :", e);
      setOutilMsg(
        e && e.message === "image-format"
          ? MSG_FORMAT_PHOTO
          : messageErreur(e, "Aliment non reconnu. Réessaie avec une photo plus nette, ou tape le nom.")
      );
    } finally {
      setOutilEnCours(null);
    }
  };

  const scannerCode = async (fichier) => {
    if (!fichier) return;
    setOutilEnCours("scan");
    setOutilMsg("Lecture du code-barres…");
    try {
      const dataUrl = await redimensionnerPhoto(fichier, 1100, 0.82);
      const code = await lireCodeBarres(dataUrl);
      if (!code) throw new Error("unreadable");
      const p = await chercherParCodeBarres(code);
      if (!p) throw new Error("not-found");
      ajouterAvecMacros(p.name, { kcal: p.kcal100, p: p.p100, c: p.c100, f: p.f100, source: "off" });
      setOutilMsg(`Ajouté : ${p.name}`);
    } catch (e) {
      console.error("[Coach Neiram] Courses — code-barres :", e);
      const m = e && e.message;
      setOutilMsg(
        m === "unreadable"
          ? "Code-barres illisible. Cadre-le de près, bien à plat."
          : m === "not-found"
            ? "Produit introuvable dans Open Food Facts."
            : m === "image-format"
              ? MSG_FORMAT_PHOTO
              : messageErreur(e, "Lecture impossible. Réessaie ou tape le nom.")
      );
    } finally {
      setOutilEnCours(null);
    }
  };

  const retirer = (id) => {
    const suivant = ajouts.filter((c) => c.id !== id);
    setAjouts(suivant);
    enregistrerAjouts(suivant);
    // Sans ce nettoyage, le compteur « X cochés » continuerait de compter un
    // article qui n'existe plus.
    if (coches[id]) {
      const restants = { ...coches };
      delete restants[id];
      enregistrerCoches(restants);
    }
  };

  const toutDecocher = () => {
    enregistrerCoches({});
    setIdee(null);
  };

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
      if (ajout) {
        return { id, item: { n: ajout.name, kcal: ajout.kcal, p: ajout.p, c: ajout.c, f: ajout.f } };
      }
      // Le rayon et le nom sont separes par le PREMIER deux-points : un nom
      // d'article peut en contenir.
      const sep = id.indexOf(":");
      if (sep === -1) return null;
      const trouve = articlesAPlat().find(
        (x) => x.catId === id.slice(0, sep) && x.n === id.slice(sep + 1)
      );
      return trouve ? { id, item: trouve } : null;
    })
    .filter(Boolean)
    .filter((r) => !adapter || r.item.kcal == null || articleCoursesOk(r.item, profile));

  if (!pret) {
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        <Loader2 size={18} className="spin" color={COLORS.gold} />
      </div>
    );
  }

  const Ligne = ({ id, item, onRetirer, enAttente }) => (
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
        onChange={() => basculer(id, item)}
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
        {enAttente && (
          <div style={{ fontSize: 9.5, color: COLORS.textFaint, marginTop: 1 }}>estimation des macros…</div>
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

      {idee && (
        <Card style={{ padding: 14, borderColor: COLORS.gold + "66" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.gold }}>
              🍽️ Idée avec {idee.base.n}
            </div>
            <button
              onClick={() => setIdee(null)}
              style={{
                background: "none",
                border: "none",
                color: COLORS.textFaint,
                cursor: "pointer",
                padding: 2,
                display: "flex"
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
            {idee.picks.map((p) => (
              <div
                key={p.item.n}
                style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}
              >
                <span style={{ color: COLORS.text }}>
                  + {p.item.n}{" "}
                  <span style={{ color: COLORS.textFaint, fontSize: 10.5 }}>
                    ({ROLE_LABELS[p.role]}, ~{p.portion} g)
                  </span>
                </span>
                <span
                  style={{
                    color: COLORS.textFaint,
                    fontFamily: "IBM Plex Mono",
                    fontSize: 10.5,
                    flexShrink: 0
                  }}
                >
                  {Math.round((p.item.kcal * p.portion) / 100)} kcal
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: COLORS.textMuted, margin: "8px 0 10px" }}>
            ≈ {idee.totalKcal} kcal · P {idee.totalP} g — {idee.phrase}, adaptée à ton objectif
            {(profile.dietType && profile.dietType !== "aucun") || (profile.allergies || []).length
              ? " et ton régime"
              : ""}
            .
          </p>
          <Btn variant="ghost" onClick={cocherArticlesIdee} style={{ width: "100%", padding: "8px 12px", fontSize: 12.5 }}>
            Cocher ces articles
          </Btn>
        </Card>
      )}

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
            <Ligne
              key={c.id}
              id={c.id}
              item={{ n: c.name, kcal: c.kcal, p: c.p, c: c.c, f: c.f }}
              enAttente={c.pending}
              onRetirer={() => retirer(c.id)}
            />
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
          <Btn onClick={() => ajouter()} disabled={!brouillon.trim()} style={{ padding: "10px 14px" }}>
            OK
          </Btn>
        </div>

        {/* TEXTE-NOUVEAU
            « Depuis la galerie », « Scanner un code-barres » et les
            messages d'attente accompagnent le choix explicite entre
            appareil photo et photothèque, absent de l'application
            d'origine : sur Android, son champ unique n'exposait pas
            toujours la camera.

            Deux lignes plutot qu'une : quatre boutons cote a cote sur un
            telephone donnent des libelles tronques et des cibles trop
            petites pour le pouce. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <ChoixPhoto
            onFichier={photoAliment}
            enCours={outilEnCours === "photo"}
            icone={Loader2}
            libelleEnCours="Analyse de la photo en cours..."
            libelleAppareil="Photo aliment"
            libelleGalerie="Depuis la galerie"
          />
          <ChoixPhoto
            onFichier={scannerCode}
            enCours={outilEnCours === "scan"}
            icone={Loader2}
            libelleEnCours="Lecture du code en cours..."
            libelleAppareil="Scanner un code-barres"
            libelleGalerie="Depuis la galerie"
          />
        </div>
        {/* FIN-TEXTE-NOUVEAU */}

        {outilMsg && (
          <p style={{ fontSize: 11, color: outilEnCours ? COLORS.textMuted : COLORS.gold, margin: "8px 0 0" }}>
            {outilMsg}
          </p>
        )}
      </Card>

      <p style={{ fontSize: 9.5, color: COLORS.textFaint, margin: "0 2px" }}>
        Macros pour 100 g. « Adapter à mon profil » masque les articles incompatibles avec ton régime et tes
        allergies.
      </p>
    </div>
  );
}
