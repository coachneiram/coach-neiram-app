/**
 * Annonces au client : la fenetre « Quoi de neuf » a l'ouverture, et le
 * test des notifications dans les reglages.
 *
 * Les textes des nouveautes vivent dans lib/nouveautes.js ; ce fichier ne
 * fait que les montrer.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { afficherNotification } from "../lib/notifier.js";
import { AIDE } from "../lib/aide.js";
import { Btn, Modal } from "./primitives.jsx";

/* TEXTE-NOUVEAU
   Fenetre « Quoi de neuf », test des notifications, bandeau d'installation
   et Aide, ajoutes a la demande du coach le 7 octobre 2026 : annoncer les
   nouveautes a l'ouverture, verifier que les rappels peuvent s'afficher,
   guider l'installation sur l'ecran d'accueil et repondre aux questions
   des guides PDF dans l'application. Aucun de ces libelles n'existe dans
   index.html. */
export function QuoiDeNeuf({ nouveautes, onFermer, onVoir }) {
  return (
    <Modal open={nouveautes.length > 0} onClose={onFermer} title="Quoi de neuf">
      <div data-quoi-de-neuf style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {nouveautes.map((n) => (
          <div
            key={n.id}
            data-nouveaute={n.id}
            style={{
              background: COLORS.bgAlt,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: "12px 14px"
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold }}>{n.titre}</div>
            <p style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.5, margin: "6px 0 10px" }}>{n.texte}</p>
            <Btn variant="ghost" onClick={() => onVoir(n)}>
              {n.bouton}
            </Btn>
          </div>
        ))}
        <Btn onClick={onFermer} style={{ width: "100%" }}>
          C'est noté
        </Btn>
      </div>
    </Modal>
  );
}

const MESSAGES_TEST = {
  envoyee:
    "Notification envoyée. Tu ne la vois pas ? Vérifie que les notifications de Coach Neiram sont autorisées dans les réglages de ton téléphone.",
  refusee: "Tu n'as pas autorisé les notifications. Réessaie et choisis « Autoriser ».",
  bloquee:
    "Notifications bloquées. Sur iPhone : Réglages → Notifications → Coach Neiram. Sur Android : appui long sur l'icône de l'app → Infos → Notifications.",
  indisponible:
    "Ton téléphone ne propose pas les notifications ici. Sur iPhone, ajoute d'abord l'app à ton écran d'accueil (Partager → Sur l'écran d'accueil), puis ouvre-la depuis l'icône.",
  echec: "La notification n'a pas pu s'afficher. Ferme et rouvre l'app, puis réessaie."
};

/** Demande l'autorisation si besoin, puis envoie une notification d'essai. */
export function TestNotifications() {
  const [etat, setEtat] = useState(null);
  const tester = async () => {
    if (typeof Notification === "undefined") return setEtat("indisponible");
    let permission = Notification.permission;
    if (permission === "default") {
      try {
        permission = await Notification.requestPermission();
      } catch (e) {
        permission = Notification.permission;
      }
    }
    if (permission === "denied") return setEtat("bloquee");
    if (permission !== "granted") return setEtat("refusee");
    const ok = await afficherNotification("Coach Neiram", {
      body: "Test réussi : tes rappels s'afficheront comme celui-ci.",
      tag: "test-notification"
    });
    setEtat(ok ? "envoyee" : "echec");
  };
  return (
    <div data-test-notifications>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>Notifications</div>
      <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "0 0 10px", lineHeight: 1.5 }}>
        Vérifie que tes rappels peuvent s'afficher sur ce téléphone.
      </p>
      <Btn variant="ghost" onClick={tester}>
        Tester les notifications
      </Btn>
      {etat && (
        <p
          data-resultat-test={etat}
          style={{
            fontSize: 11.5,
            lineHeight: 1.5,
            margin: "8px 0 0",
            color: etat === "envoyee" ? COLORS.good : COLORS.warn
          }}
        >
          {MESSAGES_TEST[etat]}
        </p>
      )}
    </div>
  );
}

/** Rouvre la fenetre « Quoi de neuf » depuis les reglages. */
export function LienNouveautes({ onVoir }) {
  return (
    <Btn variant="ghost" onClick={onVoir}>
      Revoir les nouveautés
    </Btn>
  );
}
/**
 * Bandeau d'installation. Android : le bouton ouvre la fenetre
 * d'installation du telephone quand Chrome la propose ; sinon, et sur
 * iPhone, les etapes a suivre.
 */
export function BandeauInstallation({ plateforme, peutProposer, onInstaller, onMasquer }) {
  return (
    <div
      data-bandeau-installation={plateforme}
      style={{
        background: `${COLORS.gold}14`,
        border: `1px solid ${COLORS.gold}55`,
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 14
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.gold }}>Installe l'appli sur ton écran d'accueil</div>
      <p style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.5, margin: "6px 0 10px" }}>
        {plateforme === "ios"
          ? "Dans Safari, touche le bouton Partager (le carré avec une flèche), puis « Sur l'écran d'accueil » et « Ajouter ». Ouvre ensuite l'appli depuis son icône : c'est indispensable pour recevoir tes rappels."
          : peutProposer
            ? "Elle s'ouvrira comme une vraie appli, en plein écran, et tes rappels arriveront en notification."
            : "Dans Chrome, touche le menu ⋮ puis « Installer l'application » (ou « Ajouter à l'écran d'accueil »). Ouvre ensuite l'appli depuis son icône."}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {plateforme === "android" && peutProposer && <Btn onClick={onInstaller}>Installer</Btn>}
        <Btn variant="ghost" onClick={onMasquer}>
          Plus tard
        </Btn>
      </div>
    </div>
  );
}

/** Aide : les questions frequentes, par theme, ouvertes d'un toucher. */
export function Aide({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Aide">
      <div data-aide style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {AIDE.map((section) => (
          <div key={section.id}>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: COLORS.gold,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 6
              }}
            >
              {section.titre}
            </div>
            {section.questions.map((q) => (
              <details
                key={q.id}
                data-question={q.id}
                style={{ borderTop: `1px solid ${COLORS.border}`, padding: "8px 0" }}
              >
                <summary style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, cursor: "pointer", lineHeight: 1.45 }}>
                  {q.question}
                </summary>
                {q.reponse.map((r, i) => (
                  <p key={i} style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.55, margin: "6px 0 0" }}>
                    {r}
                  </p>
                ))}
              </details>
            ))}
          </div>
        ))}
        <Btn onClick={onClose} style={{ width: "100%" }}>
          Fermer
        </Btn>
      </div>
    </Modal>
  );
}

/** Bouton d'acces a l'Aide, en tete des reglages. */
export function LienAide({ onOuvrir }) {
  return (
    <Btn variant="ghost" onClick={onOuvrir} style={{ width: "100%", marginBottom: 14 }}>
      Aide et questions fréquentes
    </Btn>
  );
}
/* FIN-TEXTE-NOUVEAU */
