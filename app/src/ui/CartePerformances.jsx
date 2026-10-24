/**
 * « Mes performances » (Séances), repris de l'app Neiram le 24/10/2026 :
 * par discipline, la saisie des meilleures performances et le niveau face
 * aux grilles officielles. Tout est inclus dans l'app coach ; pas de
 * classement entre clients. Les performances partent dans le bilan envoyé
 * au coach (lib/bilan-html.js).
 *
 * Force athlétique : les maxis sont ceux de la carte « Force athlétique »
 * (même stockage, cn_pl_1rm) ; à défaut, le meilleur 1RM estimé.
 */

import { useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { DISCIPLINES_PERF, EPREUVES, enregistrerPerformance, fmtTemps, lirePerformances, maxisRetenus, valeurEpreuve } from "../lib/performances.js";
import { MOUVEMENTS_FORCE } from "../lib/force.js";
import { TEXTES_PERF as T } from "../lib/textes-performances.js";
import { Card, SectionTitle } from "./primitives.jsx";
import { NiveauCourse, NiveauForce, NiveauHalterophilie, NiveauNatation } from "./NiveauPerformances.jsx";

const champ = {
  width: "100%",
  background: COLORS.bgAlt,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "8px 10px",
  color: COLORS.text,
  fontFamily: POLICES.chiffres,
  fontSize: 13,
  outline: "none",
  textAlign: "center",
  boxSizing: "border-box"
};
const grille = { display: "grid", gridTemplateColumns: "1fr 110px", alignItems: "center", gap: 10 };
const styleNiveau = { fontSize: 11.5, fontWeight: 700, color: COLORS.gold, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 };

function puce(actif) {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${actif ? COLORS.gold : COLORS.border}`,
    background: actif ? `${COLORS.gold}22` : "transparent",
    color: actif ? COLORS.gold : COLORS.text,
    fontSize: 12.5,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap"
  };
}

const placeholderTemps = (e) => (e.km >= 21 ? "h:mm:ss" : e.m ? "mm:ss,cc" : "mm:ss");

/** Champ d'une épreuve : la saisie part à la sortie du champ. */
function ChampEpreuve({ epreuve, perf, onChange }) {
  const affiche = perf ? (epreuve.type === "temps" ? fmtTemps(perf.valeur) : String(perf.valeur).replace(".", ",")) : "";
  const [texte, setTexte] = useState(affiche);
  const [erreur, setErreur] = useState(false);
  const valider = () => {
    if (texte.trim() === affiche) return;
    const r = onChange(epreuve.id, texte);
    setErreur(!(texte.trim() === "" || (r[epreuve.id] && valeurEpreuve(epreuve.id, texte) != null)));
  };
  return (
    <div style={grille}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>{epreuve.label}</div>
        {erreur && <div style={{ fontSize: 10.5, color: COLORS.warn }}>{epreuve.type === "temps" ? T.erreurTemps : T.erreurCharge}</div>}
      </div>
      <input
        data-perf={epreuve.id}
        inputMode={epreuve.type === "temps" ? "text" : "decimal"}
        placeholder={epreuve.type === "temps" ? placeholderTemps(epreuve) : "kg"}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onBlur={valider}
        style={champ}
      />
    </div>
  );
}

function ListeNiveaux({ epreuves, perfs, profil, Niveau, vide }) {
  const notees = epreuves.filter((e) => perfs[e.id]);
  if (!notees.length) return <div style={{ fontSize: 12, color: COLORS.textMuted }}>{vide}</div>;
  return notees.map((e) => (
    <div key={e.id} style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{T.perfEn(e.label, perfs[e.id].valeur)}</div>
      <Niveau id={e.id} secondes={perfs[e.id].valeur} profil={profil} />
    </div>
  ));
}

export function CartePerformances({ profil = {}, poidsKg, maxisForce, onDefinirMaxiForce, seances }) {
  const [discipline, setDiscipline] = useState("force");
  const [perfs, setPerfs] = useState(lirePerformances);
  const [bassin, setBassin] = useState(25);
  const enregistrer = (id, texte) => {
    const r = enregistrerPerformance(id, texte);
    setPerfs(r);
    return r;
  };
  const maxis = maxisRetenus(maxisForce, seances);
  const epreuves = EPREUVES.filter((e) => e.discipline === discipline && (discipline !== "natation" || e.bassin === bassin));

  return (
    <Card style={{ marginBottom: 20 }}>
      <div data-carte-performances>
        <SectionTitle tuto="performances">{T.titre}</SectionTitle>
        <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "4px 0 10px", lineHeight: 1.5 }}>{T.intro}</p>
        <div style={{ display: "flex", overflowX: "auto", paddingBottom: 6, marginBottom: 8, gap: 6 }}>
          {DISCIPLINES_PERF.map((d) => (
            <button key={d.id} type="button" data-discipline-perf={d.id} aria-pressed={discipline === d.id} onClick={() => setDiscipline(d.id)} style={puce(discipline === d.id)}>
              {d.emoji} {d.label}
            </button>
          ))}
        </div>

        {discipline === "force" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {MOUVEMENTS_FORCE.map((l) => (
              <div key={l.id} style={grille}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>{l.label}</div>
                  {maxis.source[l.id] === "estime" && <div style={{ fontSize: 10.5, color: COLORS.textFaint }}>{T.unRmEstime(maxis[l.id])}</div>}
                </div>
                <input
                  data-perf={`pl_${l.id}`}
                  type="number"
                  step="0.5"
                  inputMode="decimal"
                  placeholder={T.placeholderRm}
                  value={(maxisForce || {})[l.id] ?? ""}
                  onChange={(e) => onDefinirMaxiForce(l.id, e.target.value)}
                  style={champ}
                />
              </div>
            ))}
            {maxis.total > 0 && <div style={{ fontSize: 12.5, color: COLORS.gold, fontFamily: POLICES.chiffres, textAlign: "right" }}>{T.total(maxis.total)}</div>}
          </div>
        )}

        {discipline === "natation" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[25, 50].map((b) => (
              <button key={b} type="button" data-bassin={b} aria-pressed={bassin === b} onClick={() => setBassin(b)} style={puce(bassin === b)}>
                {T.bassin(b)}
              </button>
            ))}
          </div>
        )}

        {discipline !== "force" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {epreuves.map((e) => (
              <ChampEpreuve key={e.id} epreuve={e} perf={perfs[e.id]} onChange={enregistrer} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
          <div style={styleNiveau}>{T.tonNiveau}</div>
          {discipline === "force" && <NiveauForce total={maxis.total} bench={maxis.bench} profil={profil} poidsKg={poidsKg} />}
          {discipline === "halterophilie" && (
            <NiveauHalterophilie total={perfs.halt_arrache && perfs.halt_epj ? perfs.halt_arrache.valeur + perfs.halt_epj.valeur : 0} profil={profil} poidsKg={poidsKg} />
          )}
          {discipline === "course" && <ListeNiveaux epreuves={epreuves} perfs={perfs} profil={profil} Niveau={NiveauCourse} vide={T.courseVide} />}
          {discipline === "natation" && <ListeNiveaux epreuves={epreuves} perfs={perfs} profil={profil} Niveau={NiveauNatation} vide={T.natationVide} />}
        </div>
      </div>
    </Card>
  );
}
