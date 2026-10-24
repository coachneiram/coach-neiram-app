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
import { Trophees } from "./Trophees.jsx";
import { Creneaux } from "./Creneaux.jsx";
import { SemaineDifficile } from "./SemaineDifficile.jsx";
import { SeancesCoach } from "./SeancesCoach.jsx";
import { ProgressionCharges } from "./ProgressionCharges.jsx";
import { Records } from "./Records.jsx";
import { CarteForme } from "../ui/CarteForme.jsx";
import { CartePerformances } from "../ui/CartePerformances.jsx";
import { todayISO } from "../lib/dates.js";
import { useState } from "react";
import { ModaleActivite } from "./ModaleActivite.jsx";
import { CarteActivite } from "../ui/CarteActivite.jsx";
import { CarteMesSports } from "../ui/CarteMesSports.jsx";
import { CarteProgrammes } from "../ui/CarteProgrammes.jsx";
import { CarteCalendrier } from "../ui/CarteCalendrier.jsx";
import { CarteBilanAnnee } from "../ui/CarteBilanAnnee.jsx";
import {
  activiteDeSeance,
  ajouterTermine,
  avancement,
  CLE_PROGRAMME_SPORT,
  CLE_PROGRAMMES_TERMINES,
  demarrer,
  marquerFaite,
  normaliserEtat,
  programmeParId
} from "../lib/programmes-sport.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { envoyerEvenement, pointageDepuisSeance } from "../lib/synchro-coach.js";
import { evenementActivite, TEXTES_SPORTS } from "../lib/textes-sports.js";

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
  onEnregistrerLienSheets,
  onDebutCoaching,
  onSeancesAvantApp,
  onContrat,
  formDuJour,
  poidsKg,
  journal,
  corps
}) {
  // Autres sports, programmes guides et « Mon annee » (repris de l'app
  // Neiram, 24/10/2026). Une activite est une seance avec un champ
  // `activite` ; elle part au Journal du coach (coaching en ligne).
  const [activite, setActivite] = useState({ ouverte: false, seance: null });
  const ouvrirActivite = (seance = null) => setActivite({ ouverte: true, seance });
  const [programme, setProgramme] = useState(() => normaliserEtat(charger(CLE_PROGRAMME_SPORT, null)));
  const changerProgramme = (suivant) => {
    setProgramme(suivant);
    enregistrer(CLE_PROGRAMME_SPORT, suivant);
  };
  const enregistrerActivite = async (donnees) => {
    const cle = activite.seance && activite.seance.programmeCle;
    if (cle) {
      const suivant = marquerFaite(programme, cle);
      changerProgramme(suivant);
      if (avancement(suivant)?.termine && !avancement(programme)?.termine) {
        enregistrer(CLE_PROGRAMMES_TERMINES, ajouterTermine(charger(CLE_PROGRAMMES_TERMINES, []), suivant.id));
      }
    }
    if (donnees.id) {
      const { id, ...reste } = donnees;
      await sessionsApi.update(id, reste);
      return;
    }
    await sessionsApi.add(donnees);
    // Nouvelle activite seulement : une modification ne repart pas.
    const evenement = evenementActivite(profile, donnees);
    if (evenement) envoyerEvenement(profile, evenement);
  };
  // Jour coche dans « Mon annee » : une seance sans detail, comme une seance
  // notee dans le constructeur (elle part au Journal du coach en ligne).
  const cocherJour = async (seance) => {
    await sessionsApi.add(seance);
    const pointage = pointageDepuisSeance(profile, seance, { aujourdhui: todayISO() });
    if (pointage) envoyerEvenement(profile, pointage);
  };
  const sports = (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 20 }}>
      <ModaleActivite
        open={activite.ouverte}
        seance={activite.seance}
        seances={sessionsApi.items}
        poidsKg={poidsKg}
        onClose={() => setActivite({ ouverte: false, seance: null })}
        onEnregistrer={enregistrerActivite}
      />
      <CarteCalendrier
        seances={sessionsApi.items}
        objectifParSemaine={Number(profile?.sessionsPerWeek) || 0}
        onAjouter={cocherJour}
        onRetirer={(ids) => sessionsApi.removeMany(ids)}
      />
      {/* « Mon année Neiram » (repris de l'app Neiram, 24/10/2026) : le
          bilan de l'année en quelques écrans, à côté du calendrier. */}
      <CarteBilanAnnee seances={sessionsApi.items} journal={journal} corps={corps} profil={profile} maxis={maxisForce} />
      <CarteActivite seances={sessionsApi.items} journal={journal} onAjouter={() => ouvrirActivite()} />
      <CarteProgrammes
        etat={programme}
        onDemarrer={(id) => changerProgramme(demarrer(id))}
        onArreter={() => changerProgramme(null)}
        onNoter={(s) => {
          const p = programmeParId(programme.id);
          ouvrirActivite({ date: todayISO(), activite: activiteDeSeance(p, s), notes: TEXTES_SPORTS.noteProgramme(p.titre, s), programmeCle: s.cle });
        }}
      />
      {sessionsApi.items.some((s) => s.activite) && <CarteMesSports seances={sessionsApi.items} />}
    </div>
  );
  const actionsActivite = {
    onModifierActivite: (s) => ouvrirActivite(s),
    onRefaireActivite: (s) => ouvrirActivite({ date: todayISO(), activite: s.activite, notes: s.notes })
  };
  // Mes performances et niveau officiel (repris de l'app Neiram, 24/10/2026).
  const performances = (
    <CartePerformances profil={profile} poidsKg={poidsKg} maxisForce={maxisForce} onDefinirMaxiForce={onDefinirMaxiForce} seances={sessionsApi.items} />
  );
  // Forme du jour (reprise de l'app Neiram, 24 octobre 2026) : sous « Ta
  // séance du jour », seulement si le client a note sa forme aujourd'hui.
  const forme = <CarteForme form={formDuJour} seances={sessionsApi.items} date={todayISO()} />;

  // Trophees et serie de semaines : ajout posterieur a la bascule, affiche
  // dans les deux modes. En ligne, juste apres les creneaux ; sinon, en tete.
  const trophees = (
    <Trophees
      seances={sessionsApi.items}
      profile={profile}
      semainesDifficiles={semainesDifficiles}
      avecJoker={enLigne(profile)}
      onDebutCoaching={onDebutCoaching}
      onSeancesAvantApp={onSeancesAvantApp}
      onContrat={onContrat}
      maxisForce={maxisForce}
      poidsKg={poidsKg}
    />
  );

  const enTete = enLigne(profile) ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 20 }}>
      <Creneaux
        profile={profile}
        sessionsApi={sessionsApi}
        raisons={raisonsCreneaux}
        onDefinirRaison={onDefinirRaisonCreneau}
      />
      {trophees}
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
  ) : (
    <div style={{ marginBottom: 20 }}>{trophees}</div>
  );

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
        {forme}
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
            {performances}
            {sports}
            <ConstructeurSeances
              {...actionsActivite}
              routinesApi={routinesApi}
              sessionsApi={sessionsApi}
              profile={profile}
              plOn={profile?.goal === "performance"}
              planSemaine={planSemaine}
              onAssignerJour={onAssignerJour}
              maxisForce={maxisForce}
              onDefinirMaxiForce={onDefinirMaxiForce}
              avecSeanceDuJour={false}
              poidsKg={poidsKg}
            />
          </div>
        )}
      </>
    );
  }

  // « Ta séance du jour » en tete (demande du coach, 22 octobre 2026) : le
  // constructeur l'affiche d'abord, puis ce qui etait avant lui (creneaux,
  // trophees, progression, records), puis le reste de l'ecran.
  return (
    <ConstructeurSeances
      routinesApi={routinesApi}
      sessionsApi={sessionsApi}
      profile={profile}
      plOn={profile?.goal === "performance"}
      planSemaine={planSemaine}
      onAssignerJour={onAssignerJour}
      maxisForce={maxisForce}
      onDefinirMaxiForce={onDefinirMaxiForce}
      poidsKg={poidsKg}
      {...actionsActivite}
    >
      {forme}
      {enTete}
      {sports}
      <ProgressionCharges sessions={sessionsApi.items} />
      <Records sessions={sessionsApi.items} />
      {performances}
    </ConstructeurSeances>
  );
}
