/**
 * Ecran Entrainements.
 *
 * Portage de EntrainementsTab (index.html, ligne 4386) : c'est un
 * aiguillage, pas un ecran a lui seul. Ce qu'il affiche depend de deux
 * reglages du profil :
 *
 *  - le MODE D'ENTRAINEMENT : « sheets » quand le programme vit dans un
 *    Google Sheets prepare par le coach, « app » quand le client construit
 *    ses seances dans l'application ;
 *  - le MODE DE COACHING : en ligne ou en presentiel. Le coaching en ligne
 *    ajoute les creneaux, la semaine difficile et la bibliotheque de
 *    seances sans materiel.
 *
 * Le constructeur de seances du mode « app » n'est pas encore porte : il
 * represente a lui seul plus de code que tous les autres ecrans reunis.
 * L'aiguillage le signale plutot que d'afficher une page vide.
 */

import { COLORS } from "../tokens.js";
import { enLigne } from "../lib/semaine.js";
import { SEANCE_TEMPLATES } from "../lib/catalogues.js";
import { Seances } from "./Seances.jsx";
import { SeancesCoach } from "./SeancesCoach.jsx";
import { Records } from "./Records.jsx";
import { Card, SectionTitle } from "../ui/primitives.jsx";

export function Entrainements({ routinesApi, sessionsApi, profile }) {
  const enTete = enLigne(profile) ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 20 }}>
      <SeancesCoach routinesApi={routinesApi} modeles={SEANCE_TEMPLATES} />
    </div>
  ) : null;

  // Mode « Google Sheets » : le programme vit ailleurs, l'application ne
  // garde que le pointage.
  if (profile?.trainingMode === "sheets") {
    return (
      <>
        {enTete}
        <Seances sessionsApi={sessionsApi} profile={profile} />
      </>
    );
  }

  return (
    <>
      {enTete}
      <Records sessions={sessionsApi.items} />
      {/* MIGRATION-EN-COURS */}
      <Card>
        <SectionTitle>Mes séances</SectionTitle>
        <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.55, margin: "10px 0 0" }}>
          Le constructeur de séances n'est pas encore migré. Il reste servi normalement par l'application actuelle.
        </p>
      </Card>
      {/* FIN-MIGRATION-EN-COURS */}
    </>
  );
}
