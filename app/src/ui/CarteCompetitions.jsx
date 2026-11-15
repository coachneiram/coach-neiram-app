/**
 * « Mes compétitions » : le journal des compétitions d'une discipline, sous
 * la saisie des meilleures performances (15 novembre 2026). Voir
 * lib/competitions.js pour les règles.
 */

import { useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import { lirePerformances } from "../lib/performances.js";
import {
  ajouterCompetition,
  appliquerRecords,
  epreuveCompetition,
  epreuvesCompetition,
  lireCompetitions,
  recordsBattus,
  supprimerCompetition,
  totalForce
} from "../lib/competitions.js";
import { TEXTES_COMP as T } from "../lib/textes-performances.js";
import { Btn } from "./primitives.jsx";

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
  boxSizing: "border-box"
};
const etiquette = { fontSize: 11.5, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 };
const placeholderTemps = (e) => (e.km >= 21 ? "h:mm:ss" : e.m ? "mm:ss,cc" : "mm:ss");

const ERREURS = { nom: T.erreurNom, date: T.erreurDate, vide: T.erreurVide, valeur: T.erreurValeur };

export function CarteCompetitions({ discipline, bassin, maxisForce, seances, onDefinirMaxiForce, onMisAJour }) {
  const [liste, setListe] = useState(lireCompetitions);
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [date, setDate] = useState(todayISO());
  const [resultats, setResultats] = useState({});
  const [erreur, setErreur] = useState(null);
  const [invalides, setInvalides] = useState([]);
  const [message, setMessage] = useState(null);
  const [aConfirmer, setAConfirmer] = useState(null);

  const epreuves = epreuvesCompetition(discipline, bassin);
  const affichees = liste.filter((c) => c.discipline === discipline);

  const fermer = () => {
    setOuvert(false);
    setNom("");
    setDate(todayISO());
    setResultats({});
    setErreur(null);
    setInvalides([]);
  };

  const enregistrer = () => {
    const garde = {};
    for (const e of epreuves) garde[e.id] = resultats[e.id] ?? "";
    const r = ajouterCompetition({ nom, date, discipline, resultats: garde });
    if (!r.ok) {
      setErreur(r.erreur);
      setInvalides(r.invalides || []);
      return;
    }
    // Les meilleures performances ne bougent que si la compétition fait mieux.
    const records = recordsBattus(r.competition, { perfs: lirePerformances(), maxisForce, seances });
    appliquerRecords(records, r.competition.date, onDefinirMaxiForce);
    setListe(r.liste);
    onMisAJour();
    setMessage(T.enregistree + " " + (records.length ? T.recordsMaj(records) : T.aucunRecord));
    fermer();
  };

  const supprimer = (id) => {
    if (aConfirmer !== id) {
      setAConfirmer(id);
      return;
    }
    setListe(supprimerCompetition(id));
    setAConfirmer(null);
  };

  return (
    <div data-competitions style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.gold, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{T.titre}</div>
      <p style={{ fontSize: 12, color: COLORS.textMuted, margin: "0 0 8px", lineHeight: 1.5 }}>{T.intro}</p>

      {message && (
        <div data-comp-message style={{ fontSize: 12, color: COLORS.good, margin: "0 0 8px", lineHeight: 1.5 }}>
          {message}
        </div>
      )}

      {affichees.length === 0 && !ouvert && <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>{T.vide}</div>}

      {affichees.map((c) => {
        const total = c.discipline === "force" ? totalForce(c.resultats) : null;
        const morceaux = Object.entries(c.resultats).map(([id, v]) => {
          const e = epreuveCompetition(id);
          return T.resultat(e.label + (e.bassin ? ` (${e.bassin} m)` : ""), e.type, v);
        });
        return (
          <div key={c.id} data-comp-ligne style={{ background: COLORS.bgAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "8px 10px", marginBottom: 6 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>{T.ligne(c)}</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: POLICES.chiffres, marginTop: 2 }}>{morceaux.join(" · ")}</div>
            {total && <div style={{ fontSize: 12, color: COLORS.gold, fontFamily: POLICES.chiffres, marginTop: 2 }}>{T.total(total)}</div>}
            <div style={{ marginTop: 6 }}>
              <button
                type="button"
                data-comp-supprimer={c.id}
                onClick={() => supprimer(c.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: aConfirmer === c.id ? COLORS.bad : COLORS.textMuted,
                  fontSize: 11.5,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "inherit"
                }}
              >
                {aConfirmer === c.id ? T.confirmerSuppression : T.supprimer}
              </button>
            </div>
          </div>
        );
      })}

      {!ouvert && (
        <Btn variant="ghost" onClick={() => { setMessage(null); setOuvert(true); }} style={{ width: "100%" }}>
          {T.ajouter}
        </Btn>
      )}

      {ouvert && (
        <div data-comp-formulaire style={{ background: COLORS.bgAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10 }}>
          <div style={etiquette}>{T.nom}</div>
          <input data-comp-nom value={nom} maxLength={60} placeholder={T.nomPlaceholder} onChange={(e) => setNom(e.target.value)} style={{ ...champ, marginBottom: 8 }} />
          <div style={etiquette}>{T.date}</div>
          <input data-comp-date type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} style={{ ...champ, marginBottom: 8 }} />
          <div style={etiquette}>{T.resultats}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            {epreuves.map((e) => (
              <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: invalides.includes(e.id) ? COLORS.warn : COLORS.text }}>{e.label}</div>
                <input
                  data-comp-champ={e.id}
                  inputMode={e.type === "temps" ? "text" : "decimal"}
                  placeholder={e.type === "temps" ? placeholderTemps(e) : T.placeholderKg}
                  value={resultats[e.id] ?? ""}
                  onChange={(ev) => setResultats({ ...resultats, [e.id]: ev.target.value })}
                  style={{ ...champ, textAlign: "center", borderColor: invalides.includes(e.id) ? COLORS.warn : COLORS.border }}
                />
              </div>
            ))}
          </div>
          {erreur && (
            <div data-comp-erreur style={{ fontSize: 12, color: COLORS.warn, marginBottom: 8 }}>
              {ERREURS[erreur]}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={enregistrer} style={{ flex: 1 }}>
              {T.enregistrer}
            </Btn>
            <Btn variant="ghost" onClick={fermer}>
              {T.annuler}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
