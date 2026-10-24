/**
 * « Mon année » (repris de l'app Neiram, 24/10/2026) : calendrier des
 * séances (lib/calendrier.js). Un appui sur un jour passé le coche (séance
 * sans détail) ou le décoche ; l'année se partage en image.
 *
 * Dans l'app coach, un jour coché est une séance comme une autre : en
 * coaching en ligne, elle part au Journal du coach (pointage), comme une
 * séance notée dans le constructeur.
 */

import { useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { fmtDateShort, todayISO } from "../lib/dates.js";
import { basculerJour, grilleMois, MOIS, niveauCase, seancesParJour, statsAnnee } from "../lib/calendrier.js";
import { dessinerCalendrier } from "../lib/dessin-calendrier.js";
import { canvasEnPng } from "../lib/dessin-carte.js";
import { partagerCarte } from "../lib/partage-carte.js";
import { TEXTES_SPORTS as T } from "../lib/textes-sports.js";
import { Btn, Card, Modal, SectionTitle } from "./primitives.jsx";
import { X } from "./icones.jsx";

const TEINTES = [COLORS.bgAlt, `${COLORS.gold}66`, `${COLORS.gold}AA`, COLORS.gold];
const enTete = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 };
const ligneTotal = { display: "flex", alignItems: "baseline", margin: "4px 0 10px", gap: 8 };
const grosChiffre = { fontFamily: "Poppins", fontWeight: 800, fontSize: 26, color: COLORS.gold };
const navAnnee = { display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 10, gap: 14 };
const ligneChiffres = { display: "flex", justifyContent: "space-around", textAlign: "center", marginBottom: 14 };
const grilleMoisAnnee = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", marginBottom: 14, gap: 12 };

function Mois({ annee, mois, par, onJour, grand }) {
  const aujourdhui = todayISO();
  const cote = grand ? 30 : 15;
  return (
    <div>
      <div style={{ fontSize: grand ? 12 : 10, fontWeight: 700, color: COLORS.textMuted, marginBottom: 4, textTransform: "uppercase" }}>{MOIS[mois]}</div>
      {grand && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${cote}px)`, gap: 4, marginBottom: 3 }}>
          {T.joursCourts.map((j, i) => (
            <div key={i} style={{ fontSize: 9.5, color: COLORS.textFaint, textAlign: "center" }}>
              {j}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${cote}px)`, gap: grand ? 4 : 2 }}>
        {grilleMois(annee, mois).map((date, i) =>
          date ? (
            <button
              key={date}
              data-jour={date}
              aria-label={T.ariaJour(fmtDateShort(date), par[date] || 0)}
              disabled={date > aujourdhui}
              onClick={() => onJour(date)}
              style={{
                width: cote,
                height: cote,
                padding: 0,
                borderRadius: grand ? 7 : 3,
                border: date === aujourdhui ? `1.5px solid ${COLORS.gold}` : "none",
                background: TEINTES[niveauCase(par[date])],
                color: niveauCase(par[date]) >= 1 ? "#111" : COLORS.textFaint,
                fontSize: 10,
                cursor: date > aujourdhui ? "default" : "pointer",
                opacity: date > aujourdhui ? 0.35 : 1
              }}
            >
              {grand ? Number(date.slice(8)) : ""}
            </button>
          ) : (
            <div key={"v" + i} />
          )
        )}
      </div>
    </div>
  );
}

export function CarteCalendrier({ seances, objectifParSemaine, onAjouter, onRetirer }) {
  const aujourdhui = todayISO();
  const anneeCourante = Number(aujourdhui.slice(0, 4));
  const [ouvert, setOuvert] = useState(false);
  const [annee, setAnnee] = useState(anneeCourante);
  const [info, setInfo] = useState(null);
  const [partage, setPartage] = useState(null);
  const par = useMemo(() => seancesParJour(seances, annee), [seances, annee]);
  const stats = useMemo(() => statsAnnee(seances, annee, { objectifParSemaine }), [seances, annee, objectifParSemaine]);
  const statsCourantes = useMemo(() => statsAnnee(seances, anneeCourante, { objectifParSemaine }), [seances, anneeCourante, objectifParSemaine]);
  const parCourant = useMemo(() => seancesParJour(seances, anneeCourante), [seances, anneeCourante]);

  const surJour = async (date) => {
    const action = basculerJour(seances, date, aujourdhui);
    if (action && action.ajouter) {
      await onAjouter(action.ajouter);
      setInfo(T.cochee(fmtDateShort(date)));
    } else if (action && action.retirer) {
      await onRetirer(action.retirer);
      setInfo(T.decochee(fmtDateShort(date)));
    } else {
      const duJour = (seances || []).filter((s) => s.date === date);
      setInfo(duJour.length ? T.duJour(fmtDateShort(date), duJour.map(T.nomSeance).join(" · ")) : null);
    }
  };

  const partager = async () => {
    setPartage("…");
    try {
      const png = await canvasEnPng(await dessinerCalendrier(seances, stats));
      const r = await partagerCarte(png, `mon-annee-${annee}.png`);
      if (r === "cancelled") return setPartage(null);
      setPartage(r === "downloaded" ? T.imageEnregistree : T.partage);
    } catch (e) {
      setPartage(T.partageRate);
    }
  };

  const moisCourant = Number(aujourdhui.slice(5, 7)) - 1;
  return (
    <Card>
      <div data-calendrier>
        <div style={enTete}>
          <SectionTitle tuto="calendrier-annee">{T.monAnnee(anneeCourante)}</SectionTitle>
          <Btn variant="ghost" onClick={() => setOuvert(true)}>
            {T.voirAnnee}
          </Btn>
        </div>
        <div style={ligneTotal}>
          <span data-total-annee={statsCourantes.total} style={grosChiffre}>
            {statsCourantes.total}
          </span>
          <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>
            {T.seancesAnnee(statsCourantes.total)}
            {statsCourantes.objectifAnnee ? T.objectifAnnee(statsCourantes.objectifAnnee, statsCourantes.pctObjectif) : ""}
          </span>
        </div>
        <Mois annee={anneeCourante} mois={moisCourant} par={parCourant} onJour={surJour} grand />
        <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "8px 0 0" }}>{info || T.toucheJour}</p>
      </div>

      <Modal open={ouvert} onClose={() => setOuvert(false)} title={T.monAnnee(annee).replace("📅 ", "")} iconeFermer={X}>
        <div data-calendrier-annee={annee}>
          <div style={navAnnee}>
            <Btn variant="ghost" onClick={() => setAnnee(annee - 1)}>
              ‹
            </Btn>
            <span style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: 18, color: COLORS.text }}>{annee}</span>
            <Btn variant="ghost" disabled={annee >= anneeCourante} onClick={() => setAnnee(annee + 1)}>
              ›
            </Btn>
          </div>
          <div style={ligneChiffres}>
            {T.chiffresAnnee.map(([cle, l]) => (
              <div key={l}>
                <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: 22, color: COLORS.gold }}>{stats[cle]}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={grilleMoisAnnee}>
            {MOIS.map((_, m) => (
              <Mois key={m} annee={annee} mois={m} par={par} onJour={surJour} />
            ))}
          </div>
          {info && <p style={{ fontSize: 11.5, color: COLORS.textMuted, margin: "0 0 10px" }}>{info}</p>}
          <Btn style={{ width: "100%" }} disabled={!stats.total} onClick={partager}>
            {T.partagerAnnee}
          </Btn>
          {partage && <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>{partage}</p>}
        </div>
      </Modal>
    </Card>
  );
}
