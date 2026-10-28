/**
 * Communauté « Team Neiram » (24 octobre 2026), entre clients du coach.
 *
 * Où : une carte dans Séances, juste sous « Mes performances »
 * (ecrans/Entrainements.jsx), qui ouvre cette fenêtre. Pas de nouvel
 * onglet du bas : les sept tiennent déjà tout juste sur un téléphone, et
 * c'est dans Séances que se notent les performances classées et que
 * s'affichent les trophées « Classements » et « Athlète du mois ». Dans
 * l'app publique, la communauté est aussi une fenêtre (icône de l'en-tête),
 * avec ses onglets « Classements » et « Transformations ».
 *
 * La fenêtre charge l'état du serveur (lib/communaute.js), demande
 * l'accord « profil » (pseudo) avant tout, puis montre les deux onglets et
 * le bloc « Mon profil » : changer de pseudo, retirer un accord, supprimer
 * son profil. Sans code d'accès activé, elle invite à entrer le code du
 * coach dans les Réglages.
 */

import { useEffect, useState } from "react";
import { COLORS } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import {
  ERREURS_COMMUNAUTE,
  TEXTES_COMMUNAUTE as T,
  changerAccord,
  communautePossible,
  creerProfil,
  erreurPseudo,
  etatCommunaute,
  lireCommunaute,
  messageErreurCommunaute,
  pseudoPropose,
  publierSiBesoin,
  statsCommunaute,
  supprimerProfil
} from "../lib/communaute.js";
import { OngletClassements, STYLE_AIDE, STYLE_CASE, STYLE_COCHE, STYLE_DISCRET, STYLE_ERREUR } from "./OngletClassements.jsx";
import { OngletTransformations } from "./OngletTransformations.jsx";
import { Btn, Card, Modal, SectionTitle, TextInput } from "./primitives.jsx";

const ONGLETS = [
  { id: "classements", libelle: T.ongletClassements, Composant: OngletClassements },
  { id: "transformations", libelle: T.ongletTransformations, Composant: OngletTransformations }
];

const STYLE_ONGLETS = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  marginBottom: 14,
  gap: 6
};
const STYLE_BOUTONS = {
  display: "flex",
  flexWrap: "wrap",
  marginTop: 10,
  gap: 8
};
const STYLE_NOTICE = {
  fontSize: 12.5,
  color: COLORS.good,
  lineHeight: 1.45,
  margin: "0 0 10px"
};
const STYLE_MASQUE = {
  fontSize: 12,
  color: COLORS.warn,
  lineHeight: 1.45,
  margin: "8px 0 0"
};

function styleOnglet(actif) {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: `1px solid ${actif ? COLORS.gold : COLORS.border}`,
    background: actif ? `${COLORS.gold}22` : "transparent",
    color: actif ? COLORS.gold : COLORS.text,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit"
  };
}

/** Accord « profil » : pseudo et case à cocher. Aussi pour changer de pseudo. */
function CreationProfil({ initial, onCree, onAnnuler, statsActuelles }) {
  const [pseudo, setPseudo] = useState(initial || pseudoPropose());
  const [accord, setAccord] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const valider = async () => {
    const e = erreurPseudo(pseudo) || (!accord ? ERREURS_COMMUNAUTE["accord-requis"] : null);
    if (e) return setErreur(e);
    setEnvoi(true);
    setErreur(null);
    try {
      onCree(await creerProfil({ pseudo: pseudo.trim(), stats: statsActuelles() }));
    } catch (err) {
      setErreur(messageErreurCommunaute(err));
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Card style={{ marginBottom: 14 }}>
      <div data-creation-profil>
        <SectionTitle tuto="classements">{T.profilTitre}</SectionTitle>
        <p style={STYLE_AIDE}>{T.profilAide}</p>
        <TextInput data-pseudo-communaute value={pseudo} maxLength={20} placeholder={T.pseudo} onChange={(e) => setPseudo(e.target.value)} />
        <label style={STYLE_CASE}>
          <input data-accord-profil type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} style={STYLE_COCHE} />
          {T.accordProfil}
        </label>
        <Btn onClick={valider} disabled={envoi} style={{ width: "100%" }}>
          {T.rejoindre}
        </Btn>
        {onAnnuler && (
          <Btn variant="ghost" onClick={onAnnuler} style={{ width: "100%", marginTop: 8 }}>
            {T.annuler}
          </Btn>
        )}
        {erreur && <p data-erreur-communaute style={STYLE_ERREUR}>{erreur}</p>}
      </div>
    </Card>
  );
}

export function EcranCommunaute({ open, onClose, ongletInitial, onToast: toastExterne, donnees }) {
  const possible = communautePossible();
  // Sans toast de l'app (Séances n'en a pas), le message s'affiche en tête.
  const [notice, setNotice] = useState(null);
  const onToast = toastExterne || setNotice;
  const [actif, setActif] = useState(ongletInitial || "classements");
  const [profil, setProfil] = useState(undefined);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [changer, setChanger] = useState(false);
  // Compte les publications de scores : le classement se relit après chacune.
  // Sans cela, la liste lue en même temps que la publication (ou avant elle)
  // restait sans le client qui venait de rejoindre un classement (28 octobre 2026).
  const [versionScores, setVersionScores] = useState(0);

  const statsActuelles = () => statsCommunaute({ date: todayISO(), ...donnees, accords: lireCommunaute() });

  useEffect(() => {
    if (!open || !possible) return undefined;
    let vivant = true;
    setErreur(null);
    etatCommunaute()
      .then((r) => {
        if (!vivant) return;
        setProfil(r.profil);
        if (r.profil) {
          publierSiBesoin({ stats: statsActuelles() }).then((publie) => {
            if (publie && vivant) setVersionScores((v) => v + 1);
          });
        }
      })
      .catch((e) => vivant && setErreur(messageErreurCommunaute(e)));
    return () => {
      vivant = false;
    };
  }, [open, possible]);
  useEffect(() => {
    if (open && ongletInitial) setActif(ongletInitial);
  }, [open, ongletInitial]);

  const accorder = async (type, oui) => {
    setEnvoi(true);
    setErreur(null);
    try {
      const p = await changerAccord(type, oui);
      setProfil(p);
      // Chiffres de l'accord donné : publiés tout de suite.
      if (oui) {
        if (await publierSiBesoin({ stats: statsActuelles(), force: true })) setVersionScores((v) => v + 1);
      } else if (onToast) onToast(type === "disciplines" ? T.disciplinesRetirees : T.transformationRetiree);
    } catch (e) {
      setErreur(messageErreurCommunaute(e));
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = async () => {
    if (typeof window !== "undefined" && !window.confirm(T.confirmerSupprimer)) return;
    try {
      await supprimerProfil();
      setProfil(null);
      if (onToast) onToast(T.supprime);
    } catch (e) {
      setErreur(messageErreurCommunaute(e));
    }
  };

  let contenu;
  if (!possible) {
    contenu = (
      <div data-communaute="sans-acces">
        <p style={STYLE_AIDE}>{T.sansAcces}</p>
      </div>
    );
  } else if (profil === undefined) {
    contenu = erreur ? <p style={STYLE_ERREUR}>{erreur}</p> : <p style={STYLE_DISCRET}>{T.chargement}</p>;
  } else if (!profil || changer) {
    contenu = (
      <CreationProfil
        initial={profil && profil.pseudo}
        statsActuelles={statsActuelles}
        onAnnuler={profil ? () => setChanger(false) : null}
        onCree={(p) => {
          setChanger(false);
          setProfil(p);
        }}
      />
    );
  } else {
    const onglet = ONGLETS.find((o) => o.id === actif) || ONGLETS[0];
    const Composant = onglet.Composant;
    contenu = (
      <div data-communaute="actif">
        {notice && (
          <p data-notice-communaute style={STYLE_NOTICE}>
            {notice}
          </p>
        )}
        <div role="tablist" style={STYLE_ONGLETS}>
          {ONGLETS.map((o) => (
            <button key={o.id} type="button" role="tab" data-onglet-communaute={o.id} aria-selected={o.id === onglet.id} onClick={() => setActif(o.id)} style={styleOnglet(o.id === onglet.id)}>
              {o.libelle}
            </button>
          ))}
        </div>
        <Composant profil={profil} onAccord={accorder} envoi={envoi} onToast={onToast} donnees={donnees} versionScores={versionScores} />
        <Card style={{ marginTop: 14 }}>
          <div data-mon-profil-communaute style={STYLE_DISCRET}>
            {T.tonPseudo} <strong style={{ color: COLORS.text }}>{profil.pseudo}</strong>
          </div>
          {profil.masque && <p style={STYLE_MASQUE}>{T.masque}</p>}
          <div style={STYLE_BOUTONS}>
            <Btn variant="ghost" onClick={() => setChanger(true)} style={{ flex: 1, fontSize: 12.5 }}>
              {T.changerPseudo}
            </Btn>
            {profil.disciplines && (
              <Btn variant="ghost" onClick={() => accorder("disciplines", false)} disabled={envoi} style={{ flex: 1, fontSize: 12.5 }}>
                {T.disciplinesQuitter}
              </Btn>
            )}
            {profil.transformation && (
              <Btn variant="ghost" onClick={() => accorder("transformation", false)} disabled={envoi} style={{ flex: 1, fontSize: 12.5 }}>
                {T.transformationQuitter}
              </Btn>
            )}
            <Btn variant="ghost" onClick={supprimer} style={{ flex: 1, fontSize: 12.5 }}>
              {T.supprimer}
            </Btn>
          </div>
          {erreur && <p style={STYLE_ERREUR}>{erreur}</p>}
        </Card>
      </div>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={T.titre}>
      {contenu}
    </Modal>
  );
}

/** Carte de Séances qui ouvre la communauté. */
export function CarteCommunaute({ onToast, ...donnees }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <div data-carte-communaute>
          <SectionTitle tuto="classements">{T.carteTitre}</SectionTitle>
          <p style={STYLE_AIDE}>{communautePossible() ? T.carteIntro : T.sansAcces}</p>
          <Btn onClick={() => setOuvert(true)} style={{ width: "100%" }}>
            {T.ouvrir}
          </Btn>
        </div>
      </Card>
      <EcranCommunaute open={ouvert} onClose={() => setOuvert(false)} onToast={onToast} donnees={donnees} />
    </>
  );
}
