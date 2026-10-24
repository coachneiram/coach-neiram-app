/**
 * Carte « Mets ton suivi à l'abri » du Journal (lib/rappel-sauvegarde.js).
 *
 * Le bouton exporte directement, sans passer par les Reglages : un geste
 * de moins, c'est une sauvegarde de plus.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { addDays, todayISO } from "../lib/dates.js";
import { construireSauvegarde } from "../lib/stockage.js";
import { exporterSauvegarde } from "../lib/sauvegarde.js";
import {
  exportReussi,
  lireEtatSauvegarde,
  marquerSauvegarde,
  rappelSauvegarde,
  reporterRappel,
  texteRappel,
  TEXTES_RAPPEL_SAUVEGARDE as T
} from "../lib/rappel-sauvegarde.js";
import { Btn, Card, SectionTitle } from "./primitives.jsx";
import { Download } from "./icones.jsx";

export function CarteSauvegarde({ premierJour, nomProfil, stockage = globalThis.localStorage }) {
  const [etat, setEtat] = useState(() => lireEtatSauvegarde(stockage));
  const [message, setMessage] = useState(null);
  const aujourdhui = todayISO();
  const rappel = rappelSauvegarde({ aujourdhui, premierJour, ...etat });

  // Une fois sauvegarde, la carte reste le temps de lire la confirmation.
  if (!rappel && !message) return null;

  const sauvegarder = async () => {
    try {
      const resultat = await exporterSauvegarde(construireSauvegarde(), nomProfil);
      if (!exportReussi(resultat)) return;
      marquerSauvegarde(stockage, aujourdhui);
      setMessage(T.faite);
      setEtat(lireEtatSauvegarde(stockage));
    } catch (e) {
      setMessage(T.echec);
    }
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div data-rappel-sauvegarde>
        <SectionTitle>{T.titre}</SectionTitle>
        {rappel && <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "8px 0 12px", lineHeight: 1.5 }}>{texteRappel(rappel)}</p>}
        {message && (
          <p data-message-sauvegarde style={{ fontSize: 13, color: COLORS.text, margin: "8px 0 12px", lineHeight: 1.5 }}>
            {message}
          </p>
        )}
        {rappel && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn icon={Download} onClick={sauvegarder}>
              {T.sauvegarder}
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => {
                reporterRappel(stockage, aujourdhui, addDays);
                setEtat(lireEtatSauvegarde(stockage));
              }}
            >
              {T.plusTard}
            </Btn>
          </div>
        )}
      </div>
    </Card>
  );
}
