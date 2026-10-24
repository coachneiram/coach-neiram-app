/**
 * Ecran d'accord avant le premier envoi a l'IA (lib/consentement.js).
 * Il dit ce qui part, a qui, pour combien de temps, et laisse refuser.
 */

import { useEffect, useState } from "react";
import { COLORS } from "../tokens.js";
import { Btn, Modal } from "../ui/primitives.jsx";
import { repondreAccord, surDemandeAccord, TEXTES_ACCORD as T } from "../lib/consentement.js";


export function EcranConsentementIa() {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => surDemandeAccord(() => setOuvert(true)), []);
  const reponse = (accepte) => {
    setOuvert(false);
    repondreAccord(accepte);
  };
  return (
    <Modal open={ouvert} onClose={() => reponse(false)} title={T.titre}>
      <div data-ecran-consentement style={{ fontSize: 13, lineHeight: 1.55, color: COLORS.text }}>
        <p style={{ marginTop: 0 }}>{T.intro}</p>
        <ul style={{ paddingLeft: 18, margin: "0 0 10px", color: COLORS.textMuted }}>
          {T.envoye.map((t) => (
            <li key={t} style={{ marginBottom: 4 }}>
              {t}
            </li>
          ))}
        </ul>
        <p style={{ color: COLORS.textMuted }}>
          {T.conditions}
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Btn variant="ghost" onClick={() => reponse(false)} style={{ flex: 1 }}>
            {T.refuser}
          </Btn>
          <Btn onClick={() => reponse(true)} style={{ flex: 1 }}>
            {T.accepter}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
