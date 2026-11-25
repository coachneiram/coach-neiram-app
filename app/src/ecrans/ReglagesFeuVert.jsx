/**
 * Réglages d'un membre Feu Vert (demande de Marien du 25 novembre 2026).
 *
 * « Dans les réglages, tout est déjà pré-réglé pour eux. » Formule, cohorte,
 * début du cycle et parcours viennent de l'inscription faite par Marien
 * (proxy : /auth/activer et /feuvert/etat) et sont affichés en LECTURE
 * SEULE. Restent modifiables : le prénom et le code d'accès. Le parcours se
 * choisit une seule fois, tant que Marien ne l'a pas fixé.
 *
 * Pas de poids, d'objectifs, de nutrition, de rappels, de sauvegarde ni de
 * sections hors Feu Vert : un membre Feu Vert n'a que son onglet. Restent
 * l'aide et le guide Feu Vert, et la version de l'application.
 *
 * Ce verrouillage est un confort : la cohorte et le parcours qui comptent
 * sont ceux du proxy, qu'aucune route client ne peut modifier.
 *
 * Profil Feu Vert sans inscription (créé à la main avant le 25/11/2026) :
 * si le proxy dit « non inscrit » (ou s'il n'y a pas de code d'accès), le
 * bouton « Revenir au coaching individuel » remet la formule à vide, sans
 * rien effacer. Jamais proposé à un membre inscrit, ni sans réseau.
 */

import { useEffect, useState } from "react";
import { COLORS } from "../tokens.js";
import { PROXY_BASE_URL } from "../lib/config.js";
import { CarteAcces } from "./Reglages.jsx";
import { Btn, Field, Modal, SelectInput, TextInput } from "../ui/primitives.jsx";
import { LienAide } from "../ui/Annonces.jsx";
import { X } from "../ui/icones.jsx";
import { TEXTES_TUTOS } from "../lib/tutos.js";
import { PARCOURS_FEU_VERT, choisirParcours, feuVertAJour, libelleParcours, peutChoisirParcours, reglagesDuServeur, reglagesFeuVert, statutInscription } from "../lib/feu-vert.js";
import { TEXTES_FEU_VERT as TFV, TEXTES_REGLAGES_FEU_VERT as T } from "../lib/textes-feu-vert.js";

const VERSION_APP = typeof __VERSION_APP__ === "string" ? __VERSION_APP__ : "développement";

const styleSection = { borderTop: "1px solid " + COLORS.border, paddingTop: 14, marginBottom: 14 };
const styleAide = { fontSize: 10.5, color: COLORS.textFaint, margin: 0, lineHeight: 1.5 };
const styleLigne = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 13,
  padding: "6px 0",
  borderBottom: "1px solid " + COLORS.border
};
const styleCle = { color: COLORS.textMuted };
const styleValeur = { color: COLORS.text, fontWeight: 600, textAlign: "right" };

const dateLongue = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function Ligne({ cle, valeur, attribut }) {
  return (
    <div style={styleLigne} {...{ [attribut]: "" }}>
      <span style={styleCle}>{cle}</span>
      <span style={styleValeur}>{valeur}</span>
    </div>
  );
}

export function ReglagesFeuVert({ open, onClose, profile, onSave, onOuvrirAide, onOuvrirGuide }) {
  const [prenom, setPrenom] = useState(profile?.name || "");
  const [parcours, setParcours] = useState("reprise");
  useEffect(() => setPrenom(profile?.name || ""), [profile, open]);
  // Inscription vérifiée à chaque ouverture : « inscrit », « non-inscrit » ou « inconnu ».
  const [inscription, setInscription] = useState("inconnu");
  const [verification, setVerification] = useState(0);
  useEffect(() => {
    if (!open) return undefined;
    let actif = true;
    statutInscription().then((r) => actif && setInscription(r.statut));
    return () => {
      actif = false;
    };
  }, [open, verification]);

  if (!profile) return null;
  const r = reglagesFeuVert(profile);
  const choixOuvert = peutChoisirParcours(profile);
  const fixe = !!(profile.feuVert && profile.feuVert.parcoursFixe);

  const validerParcours = () => {
    if (!window.confirm(T.confirmerParcours(libelleParcours(parcours)))) return;
    onSave({ ...choisirParcours(profile, parcours), name: prenom });
  };

  // Nouveau code activé ici : la réponse porte les réglages de l'inscription.
  const accesActive = (reponse) => {
    const suivant = feuVertAJour(profile, reglagesDuServeur(reponse));
    if (suivant) onSave({ ...suivant, name: prenom });
    setVerification((n) => n + 1);
  };
  const revenirIndividuel = () => {
    if (!window.confirm(T.confirmerRevenir)) return;
    // Formule vide : l'application complète revient. feuVert reste (rien n'est effacé).
    onSave({ ...profile, name: prenom, formule: "" });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={T.titre} iconeFermer={X}>
      <div data-reglages-feu-vert>
        {onOuvrirAide && <LienAide onOuvrir={onOuvrirAide} />}
        {onOuvrirGuide && (
          <Btn variant="ghost" onClick={onOuvrirGuide} style={{ width: "100%", marginBottom: 14 }}>
            {TEXTES_TUTOS.lienGuide}
          </Btn>
        )}

        <Field label={T.prenom}>
          <TextInput data-prenom value={prenom} maxLength={40} onChange={(e) => setPrenom(e.target.value)} />
        </Field>

        <div data-inscription-feu-vert style={styleSection}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>{T.monInscription}</div>
          <p style={{ ...styleAide, marginBottom: 8 }}>{T.inscriptionAide}</p>
          <Ligne cle={TFV.formule} valeur={T.formuleValeur} attribut="data-lecture-formule" />
          <Ligne cle={TFV.cohorte} valeur={r.cohorte} attribut="data-lecture-cohorte" />
          <Ligne cle={TFV.debut} valeur={dateLongue(r.debut)} attribut="data-lecture-debut" />
          {choixOuvert ? (
            <div data-choix-parcours style={{ marginTop: 12 }}>
              <Field label={TFV.parcours}>
                <SelectInput options={PARCOURS_FEU_VERT} value={parcours} onChange={(e) => setParcours(e.target.value)} />
              </Field>
              <p style={{ ...styleAide, margin: "-6px 0 10px" }}>
                {T.parcoursDefaut((PARCOURS_FEU_VERT.find((p) => p.id === parcours) || {}).aide || "")}
              </p>
              <Btn variant="ghost" onClick={validerParcours} style={{ width: "100%" }}>
                {T.choisirParcours}
              </Btn>
            </div>
          ) : (
            <>
              <Ligne cle={TFV.parcours} valeur={libelleParcours(r.parcours)} attribut="data-lecture-parcours" />
              {fixe && <p style={{ ...styleAide, marginTop: 6 }}>{T.parcoursFixe}</p>}
            </>
          )}
        </div>

        {PROXY_BASE_URL && <CarteAcces textes={T.acces} onActive={accesActive} />}

        {inscription === "non-inscrit" && (
          <div data-non-inscrit-feu-vert style={styleSection}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>{T.nonInscritTitre}</div>
            <p style={{ ...styleAide, marginBottom: 10 }}>{T.nonInscritAide}</p>
            <Btn variant="ghost" onClick={revenirIndividuel} style={{ width: "100%" }}>
              {T.revenirIndividuel}
            </Btn>
          </div>
        )}

        <Btn
          onClick={() => {
            onSave({ ...profile, name: prenom });
            onClose();
          }}
          style={{ width: "100%" }}
        >
          {T.enregistrer}
        </Btn>

        <p style={{ fontSize: 10.5, color: COLORS.textFaint, textAlign: "center", fontFamily: "IBM Plex Mono", margin: "14px 0 0" }}>
          {T.version(VERSION_APP)}
        </p>
      </div>
    </Modal>
  );
}
