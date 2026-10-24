/**
 * Communauté Team Neiram → « Transformations » (24 octobre 2026), repris
 * de l'app publique Neiram (ui/OngletTransformations.jsx) et réservé aux
 * clients du coach :
 *  - ma transformation sur 90 jours ou sur l'année (gras perdu, muscle
 *    pris), calculée sur le téléphone avec ses garde-fous
 *    (lib/transformation.js) ; la perte de gras n'est partagée que si le
 *    téléphone la juge éligible (âge, grossesse, trouble alimentaire, IMC,
 *    masse grasse très basse) — la raison ne part jamais ;
 *  - accord « transformation » sur demande, puis partage sur le mur
 *    (chiffres et message, ni photo ni poids) ;
 *  - le mur : « Bravo », signaler, supprimer sa publication.
 * Pas de carte avant / après ici : elle reste dans Mesures et Tendances.
 * Textes : lib/communaute.js.
 */

import { useEffect, useState } from "react";
import { COLORS } from "../tokens.js";
import { fmtDateShort, todayISO } from "../lib/dates.js";
import {
  TEXTES_COMMUNAUTE as T,
  bravoTransformation,
  listeTransformations,
  maTransformation,
  messageErreurCommunaute,
  publierTransformation,
  signaler,
  supprimerTransformation
} from "../lib/communaute.js";
import { BlocAccord, STYLE_AIDE, STYLE_DISCRET, STYLE_ERREUR, puce } from "./OngletClassements.jsx";
import { Btn, Card, SectionTitle, TextArea } from "./primitives.jsx";

const STYLE_PERIODES = {
  display: "flex",
  margin: "8px 0 10px",
  gap: 6
};
const STYLE_CHIFFRES = {
  display: "flex",
  flexWrap: "wrap",
  margin: "4px 0",
  gap: 8
};
const STYLE_MUR = {
  display: "flex",
  flexDirection: "column",
  marginTop: 8,
  gap: 12
};
const STYLE_PUBLICATION = {
  borderBottom: `1px solid ${COLORS.border}`,
  paddingBottom: 10
};
const STYLE_AUTEUR = {
  fontSize: 13,
  fontWeight: 700,
  color: COLORS.text
};
const STYLE_QUAND = {
  fontWeight: 400,
  color: COLORS.textFaint,
  fontSize: 11.5
};
const STYLE_MESSAGE = {
  fontSize: 12.5,
  color: COLORS.textMuted,
  lineHeight: 1.5
};
const STYLE_ACTIONS = {
  display: "flex",
  flexWrap: "wrap",
  marginTop: 6,
  gap: 6
};
const STYLE_NOTE = {
  fontSize: 11,
  color: COLORS.textFaint,
  lineHeight: 1.45,
  margin: "8px 0 0"
};
const etiquette = { ...puce(true), cursor: "default", fontSize: 11.5 };

export function OngletTransformations({ profil, onAccord, envoi, onToast, donnees }) {
  const [periode, setPeriode] = useState("j90");
  const [liste, setListe] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [texte, setTexte] = useState("");
  const [enCours, setEnCours] = useState(false);
  const m = maTransformation({ corps: donnees.corps, profil: donnees.profil, date: todayISO(), periode });

  const recharger = () =>
    listeTransformations()
      .then((r) => setListe(r.transformations || []))
      .catch((e) => setErreur(messageErreurCommunaute(e)));
  useEffect(() => {
    recharger();
  }, [profil.transformation]);

  const publier = async () => {
    setEnCours(true);
    setErreur(null);
    try {
      await publierTransformation({ periode: periode === "j90" ? "90" : "an", jours: m.t.jours, gras: m.gras, muscle: m.muscle, perte_eligible: m.eligible ? 1 : 0, texte });
      setTexte("");
      if (onToast) onToast(T.partage);
      recharger();
    } catch (e) {
      setErreur(messageErreurCommunaute(e));
    } finally {
      setEnCours(false);
    }
  };

  const aPartager = m.gras != null || m.muscle != null;

  return (
    <div data-onglet-transformations>
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle tuto="transformations">{T.maTransformation}</SectionTitle>
        <p style={STYLE_AIDE}>{T.transfoAccroche}</p>
        <div style={STYLE_PERIODES}>
          {Object.entries(T.periodes).map(([id, libelle]) => (
            <button key={id} type="button" data-periode-communaute={id} aria-pressed={periode === id} onClick={() => setPeriode(id)} style={puce(periode === id)}>
              {libelle}
            </button>
          ))}
        </div>
        {!m.t ? (
          <p style={STYLE_AIDE}>{T.transfoVide}</p>
        ) : (
          <div data-ma-transformation={m.eligible ? "eligible" : "perte-exclue"}>
            <div style={STYLE_CHIFFRES}>
              {m.gras != null && <span style={etiquette}>{T.grasPublie(m.gras)}</span>}
              {m.muscle != null && <span style={etiquette}>{T.musclePublie(m.muscle)}</span>}
              <span style={STYLE_QUAND}>{T.enSemaines(m.t.jours)}</span>
            </div>
            {!aPartager && <p style={STYLE_AIDE}>{T.rienAPartager}</p>}
            {m.t.gras && m.t.gras.compteKg > 0 && !m.eligible && (
              <p data-perte-exclue style={STYLE_NOTE}>
                {T.perteHorsClassement}
              </p>
            )}
          </div>
        )}
        {!profil.transformation ? (
          <BlocAccord type="transformation" envoi={envoi} onAccepte={() => onAccord("transformation", true)} />
        ) : (
          aPartager && (
            <div style={{ marginTop: 12 }}>
              <TextArea data-message-transformation rows={3} maxLength={280} placeholder={T.message} value={texte} onChange={(e) => setTexte(e.target.value)} />
              <Btn onClick={publier} disabled={enCours || texte.trim().length < 3} style={{ width: "100%", marginTop: 8 }}>
                {T.partager}
              </Btn>
              <p style={STYLE_NOTE}>{T.rienNePart}</p>
            </div>
          )
        )}
        {erreur && <p style={STYLE_ERREUR}>{erreur}</p>}
      </Card>

      <Card>
        <SectionTitle tuto="transformations">{T.murTitre}</SectionTitle>
        {liste === null ? (
          <p style={STYLE_DISCRET}>{T.chargement}</p>
        ) : !liste.length ? (
          <p style={STYLE_DISCRET}>{T.murVide}</p>
        ) : (
          <div style={STYLE_MUR}>
            {liste.map((x) => (
              <div key={x.id} data-transformation={x.id} data-auteur={x.pseudo} style={STYLE_PUBLICATION}>
                <div style={STYLE_AUTEUR}>
                  {x.pseudo}
                  <span style={STYLE_QUAND}>
                    {" · "}
                    {T.enSemaines(x.jours)}
                    {" · "}
                    {fmtDateShort(new Date(x.le).toISOString().slice(0, 10))}
                  </span>
                </div>
                <div style={STYLE_CHIFFRES}>
                  {x.gras != null && <span style={etiquette}>{T.grasPublie(x.gras)}</span>}
                  {x.muscle != null && <span style={etiquette}>{T.musclePublie(x.muscle)}</span>}
                </div>
                <div style={STYLE_MESSAGE}>{x.texte}</div>
                <div style={STYLE_ACTIONS}>
                  {x.moi ? (
                    <>
                      <span data-bravos={x.bravos} style={STYLE_QUAND}>
                        {T.bravos(x.bravos)}
                      </span>
                      <button type="button" data-supprimer-publication={x.id} onClick={() => supprimerTransformation(x.id).then(recharger).catch(() => null)} style={{ ...puce(false), fontSize: 11 }}>
                        {T.supprimerPublication}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        data-bravo={x.id}
                        aria-pressed={x.monBravo}
                        onClick={() =>
                          bravoTransformation(x.id)
                            .then(recharger)
                            .catch((e) => setErreur(messageErreurCommunaute(e)))
                        }
                        style={{ ...puce(x.monBravo), fontSize: 11.5 }}
                      >
                        {T.bravo}
                        {x.bravos ? ` (${x.bravos})` : ""}
                      </button>
                      <button
                        type="button"
                        data-signaler-transformation={x.id}
                        onClick={() =>
                          signaler("transformation", x.id, T.motifTransformation)
                            .then(() => {
                              if (onToast) onToast(T.signale);
                              recharger();
                            })
                            .catch((e) => setErreur(messageErreurCommunaute(e)))
                        }
                        style={{ ...puce(false), fontSize: 11 }}
                      >
                        {T.signaler}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
