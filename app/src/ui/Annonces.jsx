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
import { Btn, Modal } from "./primitives.jsx";

/* TEXTE-NOUVEAU
   Fenetre « Quoi de neuf » et test des notifications, ajoutes a la demande
   du coach le 7 octobre 2026 : annoncer les nouveautes a l'ouverture de
   l'application, et verifier sur le telephone du client que les rappels
   peuvent s'afficher. Aucun de ces libelles n'existe dans index.html. */
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
/* FIN-TEXTE-NOUVEAU */
