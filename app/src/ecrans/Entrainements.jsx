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
 * Le mode « powerlifting » (plOn) s'active sur l'objectif « performance ».
 * Il n'ajoute pas d'ecran : il ouvre des champs supplementaires dans le
 * constructeur de seances (type de serie, %1RM, semaine de deload).
 */

import { enLigne } from "../lib/semaine.js";
import { SEANCE_TEMPLATES } from "../lib/catalogues.js";
import { ConstructeurSeances } from "./ConstructeurSeances.jsx";
import { Seances } from "./Seances.jsx";
import { SeancesCoach } from "./SeancesCoach.jsx";
import { Records } from "./Records.jsx";

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
      <ConstructeurSeances
        routinesApi={routinesApi}
        sessionsApi={sessionsApi}
        plOn={profile?.goal === "performance"}
      />
    </>
  );
}
