/**
 * Espace coach — Feu Vert (14 novembre 2026).
 *
 * C'est ICI, et nulle part ailleurs, que l'état des gestes est fixé :
 * rouge / orange / vert après lecture de la vidéo (reçue sur WhatsApp), et
 * les missions validées après le check-in. Le membre le lit dans son
 * onglet Feu Vert (POST /feuvert/etat). Route : POST /admin/feuvert.
 */

import { useEffect, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import { feuVertEnregistrer, feuVertListe, feuVertRetirer, feuVertVideo } from "../lib/espace-coach.js";
import { CONTENU_FEU_VERT } from "../lib/feu-vert-contenu.js";
import { ETATS_GESTE, niveauPasseport } from "../lib/feu-vert-passeport.js";
import { Btn, Card, SectionTitle, TextInput } from "./primitives.jsx";
import { TEXTES_FEU_VERT_COACH as T } from "../lib/textes-feu-vert.js";

const COULEUR = { rouge: COLORS.bad, orange: COLORS.orange, vert: COLORS.good };
const sDetail = { fontSize: 11.5, color: COLORS.textMuted, lineHeight: 1.45 };
const sLigne = { padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` };

function bouton(actif, couleur) {
  return {
    padding: "5px 9px",
    borderRadius: 999,
    border: `1px solid ${actif ? couleur : COLORS.border}`,
    background: actif ? `${couleur}33` : "transparent",
    color: actif ? couleur : COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit"
  };
}

/** Fiche éditable d'une membre. */
function FicheMembre({ membre, onEnregistrer, onRetirer }) {
  const [passeport, setPasseport] = useState(membre.passeport || {});
  const [missions, setMissions] = useState(membre.missions || {});
  const [cohorte, setCohorte] = useState(membre.cohorte || "1");
  const poser = (id, etat) => setPasseport({ ...passeport, [id]: { etat, date: todayISO() } });
  const niv = niveauPasseport(passeport);
  return (
    <div data-fiche-membre={membre.libelle} style={{ ...sLigne, paddingBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{membre.libelle}</div>
          <div style={sDetail}>
            {T.detail(niv, membre.pseudo)}
          </div>
        </div>
        <label style={{ ...sDetail, display: "flex", alignItems: "center", gap: 6 }}>
          {T.cohorte}
          <TextInput value={cohorte} maxLength={12} onChange={(e) => setCohorte(e.target.value.replace(/[^A-Za-z0-9-]/g, ""))} style={{ width: 54, padding: "5px 7px", fontSize: 12.5 }} />
        </label>
      </div>
      {CONTENU_FEU_VERT.gestes.map((g) => {
        const etat = passeport[g.id]?.etat || null;
        return (
          <div key={g.id} data-geste-coach={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 12.5, color: COLORS.text, minWidth: 0 }}>
              {g.numero}. {g.nom.split(" (")[0]}
              {passeport[g.id]?.date && <span style={{ ...sDetail, display: "block" }}>{T.le(passeport[g.id].date)}</span>}
            </span>
            <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {Object.keys(ETATS_GESTE).map((e) => (
                <button key={e} type="button" data-poser-etat={e} onClick={() => poser(g.id, e)} style={bouton(etat === e, COULEUR[e])}>
                  {ETATS_GESTE[e].label}
                </button>
              ))}
            </span>
          </div>
        );
      })}
      <div style={{ ...sDetail, marginTop: 12, fontWeight: 700 }}>{T.missionsTitre}</div>
      {CONTENU_FEU_VERT.missions.map((m) => (
        <div key={m.numero} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 12.5, color: COLORS.text }}>
            {m.numero}. {m.titre}
          </span>
          <select
            data-mission-coach={m.numero}
            value={missions[String(m.numero)]?.semaine || ""}
            onChange={(e) => {
              const suivant = { ...missions };
              if (e.target.value) suivant[String(m.numero)] = { semaine: Number(e.target.value) };
              else delete suivant[String(m.numero)];
              setMissions(suivant);
            }}
            style={{ background: COLORS.bgAlt, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "5px 6px", fontSize: 12 }}
          >
            <option value="">{T.nonValidee}</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {T.valideeS(n)}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn onClick={() => onEnregistrer({ client: membre.id, cohorte, passeport, missions })} style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}>
          <span data-enregistrer-passeport>{T.enregistrer}</span>
        </Btn>
        <Btn variant="danger" onClick={() => onRetirer(membre)} style={{ padding: "8px 12px", fontSize: 13 }}>
          {T.retirer}
        </Btn>
      </div>
    </div>
  );
}

/** Liens « Ma séance de la semaine, par Marien », par cohorte et par semaine. */
function VideosSemaine({ cohorte, videos, onEnregistrer }) {
  const [liens, setLiens] = useState(() => ({ ...(videos || {}) }));
  useEffect(() => setLiens({ ...(videos || {}) }), [cohorte, JSON.stringify(videos || {})]);
  return (
    <div data-videos-coach style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
      <div style={{ ...sDetail, fontWeight: 700, color: COLORS.text }}>{T.videosTitre(cohorte)}</div>
      <p style={{ ...sDetail, margin: "2px 0 6px" }}>{T.videosAide}</p>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <TextInput
          key={n}
          data-video-semaine={n}
          type="url"
          maxLength={300}
          value={liens[String(n)] || ""}
          placeholder={T.videoPlaceholder(n)}
          onChange={(e) => setLiens({ ...liens, [String(n)]: e.target.value.trim() })}
          style={{ marginTop: 6, padding: "7px 9px", fontSize: 12.5 }}
        />
      ))}
      <Btn variant="ghost" onClick={() => onEnregistrer(liens)} style={{ marginTop: 8, padding: "8px 12px", fontSize: 13 }}>
        {T.enregistrerVideos}
      </Btn>
    </div>
  );
}

export function CarteFeuVertCoach({ secret, clients, agir }) {
  const [videos, setVideos] = useState({});
  const [membres, setMembres] = useState(null);
  const [ouverte, setOuverte] = useState(null);
  const [aInscrire, setAInscrire] = useState("");
  const [cohorte, setCohorte] = useState("1");

  const charger = async () => {
    const r = await agir(() => feuVertListe(secret));
    if (r) {
      setMembres(r.membres || []);
      setVideos(r.videos || {});
    }
  };
  useEffect(() => {
    charger();
  }, [secret]);

  const enregistrer = async (fiche, message = T.enregistre) => {
    if (await agir(() => feuVertEnregistrer(fiche, secret), message)) charger();
  };
  const retirer = async (m) => {
    if (!window.confirm(T.confirmerRetrait(m.libelle))) return;
    if (await agir(() => feuVertRetirer(m.id, secret), T.retire)) {
      setOuverte(null);
      charger();
    }
  };
  const enregistrerVideos = async (liens) => {
    const avant = videos[cohorte] || {};
    for (let n = 1; n <= 6; n++) {
      const url = liens[String(n)] || "";
      if (url === (avant[String(n)] || "")) continue;
      const r = await agir(() => feuVertVideo({ cohorte, semaine: n, url }, secret));
      if (!r) return;
      setVideos((v) => ({ ...v, [cohorte]: r.videos || {} }));
    }
    await agir(async () => true, T.videosOk);
  };
  const inscrits = new Set((membres || []).map((m) => m.id));
  const candidats = (clients || []).filter((c) => !c.revoque_le && !inscrits.has(c.id));

  return (
    <Card data-carte-feu-vert-coach>
      <SectionTitle>{T.titre}</SectionTitle>
      <p style={{ ...sDetail, margin: "4px 0 10px" }}>
        {T.aide}
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <select data-inscrire value={aInscrire} onChange={(e) => setAInscrire(e.target.value)} style={{ flex: "1 1 160px", background: COLORS.bgAlt, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "8px 10px", fontSize: 13 }}>
          <option value="">{T.choisir}</option>
          {candidats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.libelle}
            </option>
          ))}
        </select>
        <TextInput value={cohorte} maxLength={12} aria-label={T.cohorte} onChange={(e) => setCohorte(e.target.value.replace(/[^A-Za-z0-9-]/g, ""))} style={{ width: 60 }} />
        <Btn disabled={!aInscrire || !cohorte} onClick={() => enregistrer({ client: aInscrire, cohorte, passeport: {}, missions: {} }, T.inscrit(cohorte)).then(() => setAInscrire(""))}>
          {T.inscrire}
        </Btn>
      </div>
      {cohorte && <VideosSemaine cohorte={cohorte} videos={videos[cohorte]} onEnregistrer={enregistrerVideos} />}
      <div style={{ marginTop: 10 }}>
        {!membres ? (
          <p style={sDetail}>{T.chargement}</p>
        ) : !membres.length ? (
          <p style={sDetail}>{T.aucun}</p>
        ) : (
          membres.map((m) =>
            ouverte === m.id ? (
              <FicheMembre key={m.id} membre={m} onEnregistrer={enregistrer} onRetirer={retirer} />
            ) : (
              <button key={m.id} type="button" data-membre={m.libelle} onClick={() => setOuverte(m.id)} style={{ ...sLigne, display: "flex", width: "100%", justifyContent: "space-between", background: "none", border: "none", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>{m.libelle}</span>
                <span style={{ ...sDetail, fontFamily: POLICES.chiffres }}>
                  {T.resume(m.cohorte, niveauPasseport(m.passeport).verts, Object.keys(m.missions || {}).length)}
                </span>
              </button>
            )
          )
        )}
      </div>
    </Card>
  );
}
