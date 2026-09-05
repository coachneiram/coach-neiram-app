/**
 * Premier lancement.
 *
 * Portage de Onboarding (index.html 4744). C'est le seul ecran qu'un
 * nouveau client voit avant tout le reste, et le seul dont depend tout le
 * reste : sans age, taille et poids, aucun objectif calorique ne peut etre
 * calcule, et la moitie de l'application n'a rien a afficher.
 *
 * D'ou les trois seuls champs obligatoires : le strict necessaire au calcul.
 * Tout le reste a une valeur par defaut raisonnable et se corrige plus tard
 * dans les reglages — on ne retient pas quelqu'un a la porte pour lui
 * demander son type de metier.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { PROFIL_PAR_DEFAUT } from "../lib/profil.js";
import { ChampsProfil } from "./ChampsProfil.jsx";
import { Btn, Card } from "../ui/primitives.jsx";
import { Dumbbell } from "../ui/icones.jsx";

export function Bienvenue({ onSave }) {
  const [valeur, setValeur] = useState(PROFIL_PAR_DEFAUT);

  // Age, taille et poids : sans eux, computeTargets n'a rien a calculer.
  const peutEnregistrer = valeur.age && valeur.heightCm && valeur.startWeightKg;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      }}
    >
      <Card style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <Dumbbell size={30} color={COLORS.gold} style={{ transform: "rotate(-20deg)" }} />
          <h1
            style={{
              fontFamily: "Poppins",
              fontSize: 24,
              fontWeight: 800,
              color: COLORS.text,
              textTransform: "uppercase",
              margin: "6px 0 0",
              letterSpacing: 0.5
            }}
          >
            Coach Neiram
          </h1>
          <div
            style={{
              fontFamily: "Poppins",
              fontSize: 10,
              letterSpacing: 3.5,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              fontWeight: 600,
              marginTop: 4
            }}
          >
            Coaching Sportif
          </div>
          <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 14 }}>
            Configure ton suivi : ces infos calculent tes objectifs caloriques et macros. Modifiable à tout
            moment.
          </p>
        </div>

        <ChampsProfil value={valeur} onChange={setValeur} />

        <Btn onClick={() => onSave(valeur)} disabled={!peutEnregistrer} style={{ width: "100%", marginTop: 8 }}>
          Commencer le suivi
        </Btn>
      </Card>
    </div>
  );
}
