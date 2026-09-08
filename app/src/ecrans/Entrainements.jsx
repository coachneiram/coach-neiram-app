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
import { ImportSeancesSheets } from "./ImportSeancesSheets.jsx";
import { Seances } from "./Seances.jsx";
import { Creneaux } from "./Creneaux.jsx";
import { SemaineDifficile } from "./SemaineDifficile.jsx";
import { SeancesCoach } from "./SeancesCoach.jsx";
import { ProgressionCharges } from "./ProgressionCharges.jsx";
import { Records } from "./Records.jsx";

export function Entrainements({
  routinesApi,
  sessionsApi,
  profile,
  raisonsCreneaux,
  onDefinirRaisonCreneau,
  semainesDifficiles,
  onDefinirSemaineDifficile,
  planSemaine,
  onAssignerJour,
  maxisForce,
  onDefinirMaxiForce,
  onEnregistrerLienSheets
}) {
  const enTete = enLigne(profile) ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 20 }}>
      <Creneaux
        profile={profile}
        sessionsApi={sessionsApi}
        raisons={raisonsCreneaux}
        onDefinirRaison={onDefinirRaisonCreneau}
      />
      <SemaineDifficile
        profile={profile}
        sessionsApi={sessionsApi}
        semainesDifficiles={semainesDifficiles}
        onDefinirSemaineDifficile={onDefinirSemaineDifficile}
        routines={routinesApi.items}
        planSemaine={planSemaine}
      />
      <SeancesCoach routinesApi={routinesApi} modeles={SEANCE_TEMPLATES} />
    </div>
  ) : null;

  // Mode « Google Sheets » : le programme vit ailleurs, l'application ne
  // garde que le pointage.
  //
  // AJOUT POSTERIEUR A LA MIGRATION : le client peut desormais IMPORTER ce
  // programme depuis son tableau, au lieu de le recopier exercice par
  // exercice. Le pointage reste ce qu'il etait, et reste affiche en
  // premier : c'est le geste quotidien. Le constructeur n'apparait qu'une
  // fois des seances importees — sans import, l'ecran est identique a
  // celui d'avant, a la carte d'import pres.
  if (profile?.trainingMode === "sheets") {
    const importees = routinesApi.items.some((r) => r.source === "sheets");
    return (
      <>
        {enTete}
        <Seances sessionsApi={sessionsApi} profile={profile} />
        <div style={{ marginTop: 20 }}>
          <ImportSeancesSheets
            routinesApi={routinesApi}
            profile={profile}
            onEnregistrerLien={onEnregistrerLienSheets}
          />
        </div>
        {importees && (
          <div style={{ marginTop: 20 }}>
            <ProgressionCharges sessions={sessionsApi.items} />
            <Records sessions={sessionsApi.items} />
            <ConstructeurSeances
              routinesApi={routinesApi}
              sessionsApi={sessionsApi}
              plOn={profile?.goal === "performance"}
              planSemaine={planSemaine}
              onAssignerJour={onAssignerJour}
              maxisForce={maxisForce}
              onDefinirMaxiForce={onDefinirMaxiForce}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {enTete}
      <ProgressionCharges sessions={sessionsApi.items} />
      <Records sessions={sessionsApi.items} />
      <ConstructeurSeances
        routinesApi={routinesApi}
        sessionsApi={sessionsApi}
        plOn={profile?.goal === "performance"}
        planSemaine={planSemaine}
        onAssignerJour={onAssignerJour}
        maxisForce={maxisForce}
        onDefinirMaxiForce={onDefinirMaxiForce}
      />
    </>
  );
}
