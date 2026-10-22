/**
 * « Ta séance du jour » : la première chose visible dans l'onglet Séances.
 *
 * Une séance proposée, un bouton. Toute la décision (programme, rotation,
 * repos, déjà faite) vit dans lib/seance-du-jour.js et y est testée.
 */

import { COLORS } from "../tokens.js";
import { fmtDateShort, todayISO } from "../lib/dates.js";
import {
  apercuExercices,
  exercicesAnnonces,
  seanceDuJour,
  TEXTES_DEBUTANT as T,
  TEXTES_PROGRAMME
} from "../lib/seance-du-jour.js";
import { Btn, Card } from "../ui/primitives.jsx";
import { Dumbbell, Plus } from "../ui/icones.jsx";

const styleSurtitre = {
  fontSize: 11,
  fontWeight: 600,
  color: COLORS.gold,
  textTransform: "uppercase",
  letterSpacing: 0.6
};

const styleNom = {
  fontFamily: "Poppins",
  fontSize: 19,
  fontWeight: 700,
  color: COLORS.text,
  textTransform: "uppercase",
  marginTop: 6,
  display: "flex",
  alignItems: "center",
  gap: 8
};

const styleDetail = { fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.5, margin: "6px 0 0" };

const pastille = (couleur) => ({ width: 12, height: 12, borderRadius: 4, background: couleur, flexShrink: 0 });

export function SeanceDuJour({ routines, sessions, plan, onDemarrer, onCreer, onVoirSeances, onPrendreProgramme }) {
  const jour = seanceDuJour(routines, sessions, plan, todayISO());

  if (jour.etat === "vide") {
    return (
      <Card style={{ marginBottom: 20, borderColor: COLORS.gold }}>
        <div style={styleSurtitre}>{T.titre}</div>
        <p style={{ ...styleDetail, color: COLORS.text, fontSize: 14 }}>{T.vide}</p>
        <Btn icon={Dumbbell} style={{ width: "100%", marginTop: 12 }} onClick={onPrendreProgramme}>
          {TEXTES_PROGRAMME.prendre}
        </Btn>
        <p style={{ ...styleDetail, fontSize: 11.5, color: COLORS.textFaint }}>{TEXTES_PROGRAMME.detail}</p>
        <Btn variant="ghost" icon={Plus} style={{ width: "100%", marginTop: 10 }} onClick={onCreer}>
          {TEXTES_PROGRAMME.creerMienne}
        </Btn>
      </Card>
    );
  }

  if (jour.etat === "faite") {
    return (
      <Card style={{ marginBottom: 20 }}>
        <div style={{ ...styleSurtitre, color: COLORS.good }}>{T.faite}</div>
        {jour.routine && (
          <div style={styleNom}>
            <span style={pastille(jour.routine.color)} />
            {jour.routine.name}
          </div>
        )}
        <p style={styleDetail}>{T.faiteDetail}</p>
        <Btn variant="ghost" style={{ width: "100%", marginTop: 10 }} onClick={onVoirSeances}>
          {T.autre}
        </Btn>
      </Card>
    );
  }

  if (jour.etat === "repos") {
    const { routine, jour: nomJour } = jour.prochaine;
    return (
      <Card style={{ marginBottom: 20 }}>
        <div style={styleSurtitre}>{T.repos}</div>
        <p style={styleDetail}>
          {`${T.prochaine} : ${nomJour} — ${routine.name}`}
        </p>
        <Btn variant="ghost" style={{ width: "100%", marginTop: 10 }} onClick={onVoirSeances}>
          {T.quandMeme}
        </Btn>
      </Card>
    );
  }

  // « prevue » ou « rotation » : toute la carte demarre la seance.
  const { routine, derniere } = jour;
  const apercu = apercuExercices(exercicesAnnonces(routine, sessions));
  return (
    <Card
      style={{ marginBottom: 20, borderColor: COLORS.gold, cursor: "pointer" }}
      onClick={() => onDemarrer(routine)}
    >
      <div style={styleSurtitre}>{jour.etat === "prevue" ? T.prevue : T.rotation}</div>
      <div style={styleNom}>
        <span style={pastille(routine.color)} />
        {routine.name}
      </div>
      {apercu && <p style={styleDetail}>{apercu}</p>}
      <p style={{ ...styleDetail, fontSize: 11.5, color: COLORS.textFaint }}>
        {derniere ? `${T.derniereFois} : ${fmtDateShort(derniere)}` : T.jamaisFaite}
      </p>
      <Btn
        icon={Dumbbell}
        style={{ width: "100%", marginTop: 12 }}
        onClick={(e) => {
          e.stopPropagation();
          onDemarrer(routine);
        }}
      >
        {T.demarrer}
      </Btn>
    </Card>
  );
}
