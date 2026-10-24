/**
 * « Mon évolution » : explorer chaque donnee saisie au jour, a la semaine,
 * au mois ou a l'annee, comme dans l'application Sante de l'iPhone.
 *
 * Toute la logique (periodes, moyennes, points cles) vit dans
 * lib/explorateur.js et y est testee ; ce fichier ne fait que l'afficher.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { chartScale } from "../lib/mensurations.js";
import { CLE_EXPLORATEUR, explorer, fmtNombre, GROUPES, PERIODES } from "../lib/explorateur.js";
import { ChevronLeft, ChevronRight } from "./icones.jsx";
import { LienTuto, STYLE_ENTETE_TUTO } from "./primitives.jsx";

const W = 340;
const H = 170;
const PAD = { g: 6, d: 40, h: 10, b: 22 };

/** Graduation ronde au-dessus du maximum : 10 000 plutot que 9 137. */
function plafondRond(v) {
  if (!v || v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function Barres({ barres, cible, choisi, onChoisir }) {
  const vals = barres.map((b) => b.valeur).filter((v) => v != null);
  const max = plafondRond(Math.max(...vals, cible || 0, 0) * 1.05);
  const pw = W - PAD.g - PAD.d;
  const ph = H - PAD.h - PAD.b;
  const pas = pw / barres.length;
  const larg = Math.max(2, Math.min(26, pas * 0.62));
  const y = (v) => PAD.h + ph - (v / max) * ph;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img">
      {[0, max / 2, max].map((t, i) => (
        <g key={i}>
          <line x1={PAD.g} x2={W - PAD.d} y1={y(t)} y2={y(t)} stroke={COLORS.border} strokeDasharray={i ? "3 3" : ""} />
          <text x={W - PAD.d + 5} y={y(t) + 3.5} fontSize="9.5" fill={COLORS.textFaint} fontFamily="Inter">
            {fmtNombre(t, t < 10 ? 1 : 0)}
          </text>
        </g>
      ))}
      {cible != null && cible <= max && (
        <line x1={PAD.g} x2={W - PAD.d} y1={y(cible)} y2={y(cible)} stroke={COLORS.good} strokeDasharray="5 4" strokeWidth="1.2" />
      )}
      {barres.map((b, i) => {
        const x = PAD.g + pas * i + (pas - larg) / 2;
        const actif = choisi === i;
        const estompe = choisi != null && !actif;
        return (
          <g key={b.cle} onClick={() => onChoisir(actif ? null : i)} style={{ cursor: "pointer" }} data-barre={b.cle}>
            <rect x={PAD.g + pas * i} y={PAD.h} width={pas} height={ph + PAD.b} fill="transparent" />
            {b.valeur != null && b.valeur > 0 && (
              <rect
                x={x}
                y={y(b.valeur)}
                width={larg}
                height={Math.max(1.5, y(0) - y(b.valeur))}
                rx={Math.min(3, larg / 3)}
                fill={COLORS.gold}
                opacity={estompe ? 0.35 : 1}
              />
            )}
            {b.label && (
              <text
                x={PAD.g + pas * i + pas / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize="9.5"
                fill={actif ? COLORS.gold : COLORS.textFaint}
                fontFamily="Inter"
              >
                {b.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Points({ points, bornes, choisi, onChoisir }) {
  const vals = points.map((p) => p.valeur);
  const { mn, mx } = chartScale(vals);
  const t0 = Date.parse(bornes.debut);
  const t1 = Date.parse(bornes.fin) + 864e5;
  const pw = W - PAD.g - PAD.d;
  const ph = H - PAD.h - PAD.b;
  const x = (d) => PAD.g + ((Date.parse(d) - t0) / (t1 - t0)) * pw;
  const y = (v) => PAD.h + ph - ((v - mn) / (mx - mn)) * ph;
  const trace = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.valeur).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img">
      {[mn, (mn + mx) / 2, mx].map((t, i) => (
        <g key={i}>
          <line x1={PAD.g} x2={W - PAD.d} y1={y(t)} y2={y(t)} stroke={COLORS.border} strokeDasharray="3 3" />
          <text x={W - PAD.d + 5} y={y(t) + 3.5} fontSize="9.5" fill={COLORS.textFaint} fontFamily="Inter">
            {fmtNombre(t, 1)}
          </text>
        </g>
      ))}
      {points.length > 1 && <path d={trace} fill="none" stroke={COLORS.gold} strokeWidth="2" />}
      {points.map((p, i) => (
        <g key={p.date} onClick={() => onChoisir(choisi === i ? null : i)} style={{ cursor: "pointer" }} data-point={p.date}>
          <circle cx={x(p.date)} cy={y(p.valeur)} r="12" fill="transparent" />
          <circle cx={x(p.date)} cy={y(p.valeur)} r={choisi === i ? 5 : 3.5} fill={COLORS.gold} stroke={COLORS.bg} strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

const couleurTon = (ton) => (ton === "bon" ? COLORS.good : ton === "a-surveiller" ? COLORS.warn : COLORS.textMuted);

/* TEXTE-NOUVEAU
   « Mon évolution », demande du coach du 14 octobre 2026 d'apres
   l'application Sante de l'iPhone : chaque donnee saisie (pas, calories,
   sommeil, seances, poids, mensurations...) au jour, a la semaine, au mois
   et a l'annee, avec ses points cles. index.html n'avait que des courbes
   hebdomadaires : aucun de ces libelles n'y existe. */
export function MonEvolution({
  donnees,
  profil,
  objectifs,
  aujourdhui,
  routines = [],
  groupes = null,
  initial = { id: "pas", periode: "S" },
  cleStockage = CLE_EXPLORATEUR,
  idChoisi = null,
  onChoisirId = null
}) {
  // `groupes` restreint la liste (l'ecran Mesures n'affiche que le corps) ;
  // `idChoisi` / `onChoisirId` la synchronisent avec les tuiles de l'ecran.
  const groupesAffiches = groupes ? GROUPES.filter((g) => groupes.includes(g.groupe)) : GROUPES;
  const autorise = (id) => groupesAffiches.some((g) => g.indicateurs.some((i) => i.id === id));
  const [reglage, setReglage] = useState(() => {
    try {
      const r = charger(cleStockage, null);
      return r && r.id && r.periode && autorise(r.id) ? { id: r.id, periode: r.periode } : initial;
    } catch (e) {
      return initial;
    }
  });
  // Une tuile touchee choisit la donnee ; au premier affichage, c'est le
  // dernier choix retenu qui prime.
  const premierRendu = useRef(true);
  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    if (idChoisi && autorise(idChoisi) && idChoisi !== reglage.id) changer({ id: idChoisi });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idChoisi]);
  const [decalage, setDecalage] = useState(0);
  const [choisi, setChoisi] = useState(null);

  useEffect(() => {
    try {
      enregistrer(cleStockage, reglage);
    } catch (e) {
      // Stockage indisponible : le choix ne sera simplement pas retenu.
    }
  }, [reglage]);

  const vue = useMemo(
    () => explorer({ id: reglage.id, periode: reglage.periode, decalage, donnees, profil, objectifs, aujourdhui }),
    [reglage, decalage, donnees, profil, objectifs, aujourdhui]
  );

  function changer(correctif) {
    setReglage((r) => ({ ...r, ...correctif }));
    setDecalage(0);
    setChoisi(null);
    if (correctif.id && onChoisirId) onChoisirId(correctif.id);
  }
  const naviguer = (pas) => {
    setDecalage((d) => Math.min(0, d + pas));
    setChoisi(null);
  };

  const ind = vue.indicateur;
  const unite = ind.unite === "séance" ? (vue.resume.valeur > 1 ? "séances" : "séance") : ind.unite;
  const element = choisi != null ? (vue.barres || vue.points || [])[choisi] : null;
  const valeurAffichee = element ? element.valeur : vue.resume.valeur;
  const legende = element
    ? element.detail
    : vue.resume.date && reglage.periode !== "J"
      ? `${vue.bornes.libelle} · le ${new Date(vue.resume.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
      : vue.bornes.libelle;
  const titre = element ? (ind.genre === "mesure" ? "Mesure" : reglage.periode === "A" ? "Moyenne du mois" : "Ce jour-là") : vue.resume.libelle;
  const aDesBarres = (vue.barres || []).some((b) => b.valeur != null);
  const aDesPoints = (vue.points || []).length > 0;

  // Seances du jour, nommees : un chiffre seul ne dit pas ce qui a ete fait.
  const seancesDuJour =
    reglage.periode === "J" && (ind.id === "seances" || ind.id === "duree" || ind.id === "rpe")
      ? (donnees.sessions || []).filter((s) => s.date === vue.bornes.debut)
      : [];
  const nomSeance = (s) =>
    (routines.find((r) => r.id === s.routineId) || {}).name || (s.maintenance ? "Séance maintien" : "Séance");

  const styleSelect = {
    width: "100%",
    background: COLORS.bgAlt,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "10px 12px",
    color: COLORS.text,
    fontFamily: POLICES.texte,
    fontSize: 14,
    outline: "none"
  };

  return (
    <div
      data-mon-evolution
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 16,
        padding: 18
      }}
    >
      <div style={{ ...STYLE_ENTETE_TUTO, margin: "0 0 12px" }}>
        <h3
          style={{
            fontFamily: POLICES.titre,
            fontSize: 13.5,
            fontWeight: 600,
            color: COLORS.gold,
            textTransform: "uppercase",
            letterSpacing: 1,
            margin: 0
          }}
        >
          Mon évolution
        </h3>
        <LienTuto id="evolution" />
      </div>

      <select
        aria-label="Donnée à afficher"
        value={ind.id}
        onChange={(e) => changer({ id: e.target.value })}
        style={styleSelect}
      >
        {groupesAffiches.map((g) => (
          <optgroup key={g.groupe} label={g.groupe}>
            {g.indicateurs.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <div
        role="tablist"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 4,
          background: COLORS.bgAlt,
          borderRadius: 10,
          padding: 3,
          margin: "10px 0 12px"
        }}
      >
        {PERIODES.map((p) => {
          const actif = reglage.periode === p.id;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={actif}
              aria-label={p.nom}
              onClick={() => changer({ periode: p.id })}
              style={{
                border: "none",
                borderRadius: 8,
                padding: "7px 0",
                fontFamily: POLICES.texte,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background: actif ? COLORS.gold : "transparent",
                color: actif ? COLORS.bg : COLORS.textMuted
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <button
          aria-label="Période précédente"
          onClick={() => naviguer(-1)}
          style={{
            background: "none",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            color: COLORS.text,
            padding: "5px 7px",
            cursor: "pointer"
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div
            style={{
              fontSize: 10.5,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              fontWeight: 600
            }}
          >
            {titre}
          </div>
          <div style={{ fontFamily: POLICES.titre, fontSize: 28, fontWeight: 700, color: COLORS.text, lineHeight: 1.15 }}>
            {fmtNombre(valeurAffichee, ind.decimales)}
            {valeurAffichee != null && (
              <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.textMuted, marginLeft: 5 }}>{unite}</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: COLORS.textFaint }}>{legende}</div>
        </div>
        <button
          aria-label="Période suivante"
          onClick={() => naviguer(1)}
          disabled={!vue.peutAvancer}
          style={{
            background: "none",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            color: vue.peutAvancer ? COLORS.text : COLORS.border,
            padding: "5px 7px",
            cursor: vue.peutAvancer ? "pointer" : "default"
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        {ind.genre === "mesure" && reglage.periode !== "J" && aDesPoints && (
          <Points points={vue.points} bornes={vue.bornes} choisi={choisi} onChoisir={setChoisi} />
        )}
        {ind.genre !== "mesure" && reglage.periode !== "J" && aDesBarres && (
          <Barres barres={vue.barres} cible={vue.cible} choisi={choisi} onChoisir={setChoisi} />
        )}
        {ind.genre !== "mesure" && reglage.periode === "J" && aDesBarres && (
          <>
            <Barres barres={vue.barres} cible={null} choisi={choisi} onChoisir={setChoisi} />
            <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "4px 0 0", textAlign: "center" }}>
              Repas par repas
            </p>
          </>
        )}
        {vue.cible != null && reglage.periode !== "J" && aDesBarres && (
          <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "4px 0 0" }}>
            <span style={{ color: COLORS.good }}>- - -</span> ton objectif : {fmtNombre(vue.cible, ind.decimales)}{" "}
            {unite}
            {reglage.periode === "A" ? " par jour (barres : moyenne de chaque mois)" : ""}
          </p>
        )}
        {seancesDuJour.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            {seancesDuJour.map((s, i) => (
              <div
                key={s.id || i}
                style={{
                  background: COLORS.bgAlt,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: "8px 11px",
                  fontSize: 12.5,
                  color: COLORS.text
                }}
              >
                {nomSeance(s)}
                <span style={{ color: COLORS.textFaint }}>
                  {s.durationMin ? ` · ${s.durationMin} min` : ""}
                  {s.rpe ? ` · RPE ${s.rpe}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
        <div
          style={{
            fontSize: 10.5,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            fontWeight: 600,
            marginBottom: 6
          }}
        >
          Points clés
        </div>
        {vue.phrases.map((p, i) => (
          <p
            key={i}
            style={{
              fontSize: 13,
              color: COLORS.text,
              margin: "0 0 6px",
              lineHeight: 1.45,
              display: "flex",
              gap: 8
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                background: couleurTon(p.ton),
                marginTop: 6,
                flexShrink: 0
              }}
            />
            <span data-point-cle={p.ton}>{p.texte}</span>
          </p>
        ))}
        <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "8px 0 0", lineHeight: 1.45 }}>
          Touche une barre ou un point pour voir sa valeur. Tes données viennent de ce que tu notes dans l'appli : plus
          tu notes de jours, plus ton évolution est fiable.
        </p>
      </div>
    </div>
  );
}
/* FIN-TEXTE-NOUVEAU */
