/**
 * Ecran Repas — coque a sous-onglets.
 *
 * Portage fidele de RepasTab (index.html, ligne 2773).
 *
 * L'onglet « Coach IA » n'apparait que si l'assistant est disponible :
 * afficher un onglet qui repondrait « service indisponible » a chaque
 * question vaut moins que ne pas l'afficher du tout.
 */

import { useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { Aliments } from "./Aliments.jsx";
import { Plats } from "./Plats.jsx";
import { Courses } from "./Courses.jsx";
import { CoachIA } from "./CoachIA.jsx";

/** Sous-onglets, dans l'ordre de l'application actuelle. */
const SOUS_ONGLETS = [
  { id: "plats", label: "Mes plats" },
  { id: "courses", label: "Courses" },
  { id: "aliments", label: "Aliments" },
  { id: "coach", label: "Coach IA", requiertIA: true }
];

export function Repas({ api, profile, targets, logEntries, iaDisponible = true, construireConsigne }) {
  const [sousOnglet, setSousOnglet] = useState("plats");

  const onglets = SOUS_ONGLETS.filter((o) => !o.requiertIA || iaDisponible);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {onglets.map((o) => (
          <button
            key={o.id}
            onClick={() => setSousOnglet(o.id)}
            style={{
              flex: 1,
              padding: "9px 4px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              background: sousOnglet === o.id ? COLORS.gold : COLORS.bgAlt,
              color: sousOnglet === o.id ? "#1A1503" : COLORS.textMuted,
              fontWeight: 700,
              fontSize: 12,
              fontFamily: POLICES.texte
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {sousOnglet === "plats" && <Plats api={api} />}
      {sousOnglet === "courses" && <Courses profile={profile} />}
      {sousOnglet === "aliments" && (
        <Aliments profile={profile} targets={targets} logEntries={logEntries} />
      )}
      {sousOnglet === "coach" && (
        <CoachIA
          profile={profile}
          targets={targets}
          logEntries={logEntries}
          construireConsigne={construireConsigne}
        />
      )}
    </div>
  );
}
