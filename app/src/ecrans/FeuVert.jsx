/**
 * Écran Feu Vert (coaching collectif débutants, 14 novembre 2026).
 *
 * Cinq vues, une à la fois, pour ne pas noyer une débutante : Programme,
 * Passeport, Missions, Check-in, Régularité. Les règles et les calculs sont
 * dans lib/feu-vert.js, le contenu (programme, fiches, missions, modules)
 * dans lib/feu-vert-contenu.js, les phrases dans lib/textes-feu-vert.js.
 *
 * Le Passeport est en LECTURE SEULE : Marien fixe l'état des gestes dans
 * l'Espace coach. Les vidéos de correction partent sur WhatsApp, jamais
 * dans l'application. Aucun poids, aucune photo, aucune promesse de
 * résultat dans cet écran.
 */

import { useEffect, useMemo, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import { nowHHMM } from "../lib/semaine.js";
import { envoyerEvenement } from "../lib/synchro-coach.js";
import { accesActuel } from "../lib/acces.js";
import {
  CONTENU_FEU_VERT,
  ETATS_GESTE,
  MSG_FEU_VERT,
  NB_SEMAINES,
  REGLES_FEU_VERT,
  TEXTES_VIDEO,
  actualiserPasseport,
  chargeBloquee,
  checkinAttendu,
  compteSemaine,
  datesSemaine,
  etatGeste,
  evenementCheckin,
  gesteParId,
  libelleParcours,
  lienVideoWhatsapp,
  ligneRegularite,
  lireFeuVert,
  majFeuVert,
  mesSemaines,
  missionParNumero,
  missionsDeLaSemaine,
  moduleDeLaSemaine,
  niveauPasseport,
  pointagesSemaine,
  pointageFeuVert,
  pointsMax,
  reglagesFeuVert,
  seanceFeuVert,
  seancesDisponibles,
  semaineContenu,
  semaineDuCheckin,
  semaineFeuVert,
  synchroniserTableau,
  videoDeLaSemaine
} from "../lib/feu-vert.js";
import { TEXTES_FEU_VERT as T } from "../lib/textes-feu-vert.js";
import { Btn, Card, Field, Modal, SectionTitle, TextArea, TextInput } from "../ui/primitives.jsx";
import { Send } from "../ui/icones.jsx";
import { Coche, FeuTricolore } from "../ui/icones-feu-vert.jsx";

const COULEUR_ETAT = { rouge: COLORS.bad, orange: COLORS.orange, vert: COLORS.good };
const VUES = ["programme", "passeport", "missions", "checkin", "regularite"];

const sAide = { fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.55, margin: "6px 0 0" };
const sTexte = { ...sAide, color: COLORS.text };
const sPetit = { fontSize: 11.5, color: COLORS.textFaint, lineHeight: 1.5, margin: "6px 0 0" };
const sListe = { margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color: COLORS.text, lineHeight: 1.55 };
const sSousTitre = {
  fontSize: 11.5,
  fontWeight: 700,
  color: COLORS.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  margin: "14px 0 4px"
};
const sEncadre = { border: `1px solid ${COLORS.gold}`, background: `${COLORS.gold}12`, borderRadius: 12, padding: "12px 14px" };
const sChiffre = { fontFamily: POLICES.chiffres, fontWeight: 600 };
const sLigneSeparee = { padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` };
const sDefilant = {
  display: "flex",
  gap: 6,
  overflowX: "auto",
  paddingBottom: 2
};
const sBoutonTexte = {
  background: "none",
  border: "none",
  padding: 0,
  textAlign: "left",
  color: COLORS.text,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit"
};
const sLienWhatsapp = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  textDecoration: "none",
  borderRadius: 10,
  padding: "11px 16px",
  fontWeight: 700,
  fontSize: 14,
  color: COLORS.bg,
  background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.gold})`
};
const sCase = {
  width: 17,
  height: 17,
  accentColor: COLORS.gold,
  flexShrink: 0
};
const sLabelCase = {
  display: "flex",
  alignItems: "flex-start",
  gap: 9,
  marginTop: 12,
  fontSize: 13,
  color: COLORS.text,
  cursor: "pointer",
  lineHeight: 1.45
};
const sBarreGestes = {
  display: "flex",
  gap: 6,
  margin: "12px 0 6px"
};
// Les cinq sections tiennent sur une ligne en 360 px : aucune n'est cachée hors écran.
const sGrilleVues = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 4
};
const sVue = {
  padding: "9px 2px",
  fontSize: 11,
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};
const sLienMarien = {
  ...sEncadre,
  display: "flex",
  alignItems: "center",
  gap: 10,
  textDecoration: "none"
};
const GRILLE_TABLEAU = "minmax(0, 1fr) 50px 50px 50px";

function puce(actif) {
  return {
    flex: "0 0 auto",
    padding: "8px 13px",
    borderRadius: 999,
    border: `1px solid ${actif ? COLORS.gold : COLORS.border}`,
    background: actif ? `${COLORS.gold}22` : "transparent",
    color: actif ? COLORS.gold : COLORS.textMuted,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit"
  };
}

/** Pastille d'état d'un geste : couleur ET mot (jamais la couleur seule). */
export function PastilleEtat({ etat }) {
  const c = COULEUR_ETAT[etat] || COLORS.bad;
  return (
    <span
      data-etat-geste={etat}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11.5,
        fontWeight: 700,
        color: c,
        whiteSpace: "nowrap"
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 99, background: c, flexShrink: 0 }} />
      {ETATS_GESTE[etat]?.label || ETATS_GESTE.rouge.label}
    </span>
  );
}

const nomCourt = (g) => g.nom.split(" (")[0];
/** Majuscule initiale : les documents de livraison commencent souvent en minuscule après « Objectif : ». */
const maj = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

/* ------------------------------------------------------------------ */
/* Fiche d'un geste                                                    */
/* ------------------------------------------------------------------ */

function FicheGeste({ geste, etat, date, semaine, onClose }) {
  const criteres = [...geste.criteres.filter((c) => c.code.startsWith("S")), ...geste.criteres.filter((c) => c.code.startsWith("Q"))];
  return (
    <Modal open onClose={onClose} title={geste.numero + ". " + nomCourt(geste)}>
      <div data-fiche-geste={geste.id}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <PastilleEtat etat={etat} />
          {date && <span style={sPetit}>{T.corrigeLe(date)}</span>}
        </div>
        <p style={sAide}>{ETATS_GESTE[etat].sens}</p>
        <p style={sTexte}>
          <strong>{T.objectif}</strong>
          {maj(geste.objectif)}
        </p>

        {geste.video ? (
          <a href={geste.video} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 10, color: COLORS.gold, fontSize: 13, fontWeight: 600 }}>
            {T.voirVideo}
          </a>
        ) : (
          <p data-video-vide style={sPetit}>
            {TEXTES_VIDEO.pasDeVideo}
          </p>
        )}

        <div style={sSousTitre}>{T.miseEnPlace}</div>
        <ul style={sListe}>
          {geste.miseEnPlace.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div style={sSousTitre}>{T.pointsCles}</div>
        <ol style={sListe}>
          {geste.pointsCles.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
        <div style={sSousTitre}>{T.erreurs}</div>
        <ul style={sListe}>
          {geste.erreurs.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div style={sSousTitre}>{T.criteresTitre}</div>
        <p style={sPetit}>{T.criteresAide}</p>
        <ul style={{ ...sListe, listStyle: "none", paddingLeft: 0 }}>
          {criteres.map((c) => (
            <li key={c.code} style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <span style={{ ...sChiffre, color: c.code.startsWith("S") ? COLORS.bad : COLORS.gold, flexShrink: 0, width: 22 }}>{c.code}</span>
              <span>{maj(c.texte)}</span>
            </li>
          ))}
        </ul>
        <div style={sSousTitre}>{T.filmer}</div>
        <p style={{ ...sTexte, marginTop: 2 }}>{maj(geste.filmer)}</p>
        <div style={sSousTitre}>{T.facilitee}</div>
        <p style={{ ...sTexte, marginTop: 2 }}>{maj(geste.facilitee)}</p>

        <div style={{ ...sEncadre, marginTop: 16 }}>
          <a data-whatsapp-video href={lienVideoWhatsapp(geste, semaine)} target="_blank" rel="noreferrer" style={sLienWhatsapp}>
            <Send size={16} />
            {TEXTES_VIDEO.bouton}
          </a>
          <p style={{ ...sPetit, color: COLORS.textMuted }}>{TEXTES_VIDEO.plafond}</p>
          <p style={sPetit}>{TEXTES_VIDEO.format}</p>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Vue Programme                                                       */
/* ------------------------------------------------------------------ */

function LigneExercice({ e, passeport, charge, onCharge, onFiche }) {
  const g = e.geste ? gesteParId(e.geste) : null;
  const etat = g ? etatGeste(passeport, g.id) : null;
  return (
    <div data-exercice={e.geste || "complement"} style={sLigneSeparee}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        {g ? (
          <button type="button" onClick={() => onFiche(g.id)} style={sBoutonTexte}>
            {g.numero}. {e.libelle} <span style={{ color: COLORS.gold, fontSize: 12 }}>{T.fiche}</span>
          </button>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{e.libelle}</span>
        )}
        {etat && <PastilleEtat etat={etat} />}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 6, fontSize: 12.5, color: COLORS.textMuted }}>
        <span style={{ ...sChiffre, color: COLORS.text }}>{e.series}</span>
        <span>{T.repos(e.repos)}</span>
        <span>{e.consigne}</span>
      </div>
      {g && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <TextInput
            data-charge={g.id}
            inputMode="decimal"
            aria-label={T.chargeAria(g.nom)}
            placeholder={T.chargeUnite}
            value={charge || ""}
            onChange={(ev) => onCharge(g.id, ev.target.value.replace(",", ".").replace(/[^0-9.]/g, "").slice(0, 5))}
            style={{ width: 64, padding: "7px 9px", fontSize: 13 }}
          />
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>{T.chargeUnite}</span>
          <span style={{ fontSize: 11.5, color: chargeBloquee(etat) ? COLORS.warn : COLORS.good, lineHeight: 1.35 }}>
            {chargeBloquee(etat) ? T.chargeBloquee : T.chargeLibre}
          </span>
        </div>
      )}
    </div>
  );
}

function VueProgramme({ reglages, info, passeport, serveur, seances, local, onPointer, onCharge, onFiche }) {
  const [semaine, setSemaine] = useState(info.numero);
  const [lettre, setLettre] = useState("A");
  const [alternatives, setAlternatives] = useState(false);
  const contenu = semaineContenu(semaine);
  const dispo = seancesDisponibles(semaine);
  const lettreAffichee = dispo.includes(lettre) ? lettre : "A";
  const seance = seanceFeuVert(semaine, lettreAffichee, reglages.parcours);
  const pointees = pointagesSemaine(seances, semaine, reglages.cohorte);
  const deja = pointees[lettreAffichee];
  const dates = datesSemaine(reglages.debut, semaine);
  const pointable = info.etat !== "avant" && (info.etat === "termine" || semaine <= info.numero);
  const videoMarien = videoDeLaSemaine(serveur, semaine);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={sDefilant}>
        {Array.from({ length: NB_SEMAINES }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" data-semaine={n} onClick={() => setSemaine(n)} style={puce(n === semaine)}>
            S{n}
          </button>
        ))}
      </div>

      {videoMarien && (
        <a data-seance-marien href={videoMarien} target="_blank" rel="noreferrer" style={sLienMarien}>
          <FeuTricolore size={20} color={COLORS.gold} />
          <span>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: COLORS.gold }}>{T.seanceDeMarien}</span>
            <span style={{ display: "block", fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{T.seanceDeMarienAide}</span>
          </span>
        </a>
      )}

      <Card data-carte-semaine={semaine}>
        <div style={sPetit}>{T.semaineDates(semaine, dates.du, dates.au, semaine === info.numero && info.etat === "en-cours")}</div>
        <SectionTitle>{contenu.titre}</SectionTitle>
        <p style={sAide}>{maj(contenu.objectif)}</p>
        <p style={{ ...sPetit, color: COLORS.gold }}>{contenu.mission}</p>
      </Card>

      <div style={sEncadre} data-regle-charge>
        <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: 13.5 }}>{REGLES_FEU_VERT.bloquee}</div>
        <p style={sTexte}>{REGLES_FEU_VERT.rougeOrange}</p>
        <p style={sTexte}>{REGLES_FEU_VERT.vert}</p>
        {semaine === 1 && <p style={sAide}>{REGLES_FEU_VERT.chargeDepart}</p>}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {dispo.map((l) => (
          <button key={l} type="button" data-seance={l} onClick={() => setLettre(l)} style={{ ...puce(l === lettreAffichee), flex: 1 }}>
            {T.ongletSeance(l, !!pointees[l])}
          </button>
        ))}
      </div>

      <Card>
        <SectionTitle>{seance.titre}</SectionTitle>
        <p style={sPetit}>{T.structure(libelleParcours(reglages.parcours))}</p>
        {(seance.exercices || []).map((e) => (
          <LigneExercice key={e.libelle} e={e} passeport={passeport} charge={e.geste && local.charges[e.geste]} onCharge={onCharge} onFiche={onFiche} />
        ))}
        {(seance.blocs || []).map((b) => (
          <div key={b.bloc} style={{ ...sLigneSeparee, display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.45 }}>{b.bloc}</span>
            <span style={{ ...sChiffre, fontSize: 12.5, color: COLORS.gold, whiteSpace: "nowrap" }}>{b.volume}</span>
          </div>
        ))}
        {seance.texte && <p style={sTexte}>{seance.texte}</p>}

        <div style={{ marginTop: 14 }}>
          {deja ? (
            <p data-seance-faite style={{ fontSize: 13, color: COLORS.good, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <Coche size={15} />
              {T.pointee(deja.date)}
            </p>
          ) : (
            <Btn disabled={!pointable} onClick={() => onPointer(semaine, lettreAffichee)} style={{ width: "100%" }}>
              <span data-pointer>{T.pointer(lettreAffichee)}</span>
            </Btn>
          )}
          {!pointable && !deja && <p style={sPetit}>{T.pasEncore(semaine)}</p>}
        </div>
      </Card>

      <Card>
        <button type="button" onClick={() => setAlternatives(!alternatives)} style={{ ...sBoutonTexte, width: "100%" }}>
          {T.alternativesTitre(alternatives)}
        </button>
        {alternatives && (
          <div data-alternatives>
            <p style={sPetit}>{T.alternativesAide}</p>
            {CONTENU_FEU_VERT.alternatives.map((a) => (
              <div key={a.geste} style={{ padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{a.geste}</div>
                <div style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.5 }}>1. {a.alt1}</div>
                <div style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.5 }}>2. {a.alt2}</div>
              </div>
            ))}
          </div>
        )}
        <p style={sPetit}>{REGLES_FEU_VERT.effort + " " + REGLES_FEU_VERT.tempo}</p>
        <p style={sPetit}>{REGLES_FEU_VERT.douleur}</p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vue Passeport                                                       */
/* ------------------------------------------------------------------ */

function VuePasseport({ passeport, serveur, erreur, enCours, onActualiser, onFiche }) {
  const niv = niveauPasseport(passeport);
  const etatSynchro = erreur ? MSG_FEU_VERT[erreur] || MSG_FEU_VERT.indisponible : serveur?.recuLe ? T.aJour(serveur.recuLe) : "";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card data-niveau={niv.niveau}>
        <div style={sPetit}>{T.passeportSurtitre}</div>
        <div style={{ fontFamily: POLICES.titre, fontSize: 22, fontWeight: 800, color: COLORS.gold, marginTop: 4 }}>{T.niveau(niv.niveau, niv.nom)}</div>
        <div style={sBarreGestes} role="img" aria-label={T.vertsAria(niv.verts)}>
          {CONTENU_FEU_VERT.gestes.map((g) => {
            const etat = etatGeste(passeport, g.id);
            return <span key={g.id} style={{ flex: 1, height: 8, borderRadius: 99, background: COULEUR_ETAT[etat], opacity: etat === "rouge" ? 0.55 : 1 }} />;
          })}
        </div>
        <div style={{ ...sChiffre, fontSize: 13, color: COLORS.text }}>{T.verts(niv.verts)}</div>
        {niv.suivant && <p style={sAide}>{T.prochain(niv.suivant)}</p>}
        <p style={sPetit}>{T.niveauHonnete}</p>
      </Card>

      <Card>
        <SectionTitle>{T.mesGestes}</SectionTitle>
        <p style={sPetit}>{T.mesGestesAide}</p>
        {CONTENU_FEU_VERT.gestes.map((g) => {
          const date = passeport[g.id]?.date;
          return (
            <button
              key={g.id}
              type="button"
              data-geste={g.id}
              onClick={() => onFiche(g.id)}
              style={{
                ...sBoutonTexte,
                ...sLigneSeparee,
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                borderBottom: `1px solid ${COLORS.border}`
              }}
            >
              <span>
                <span style={{ display: "block" }}>
                  {g.numero}. {nomCourt(g)}
                </span>
                <span style={{ display: "block", fontSize: 11.5, fontWeight: 400, color: COLORS.textFaint, marginTop: 2 }}>{date ? T.corrigeLe(date) : T.pasCorrige}</span>
              </span>
              <PastilleEtat etat={etatGeste(passeport, g.id)} />
            </button>
          );
        })}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 12 }}>
          <span data-synchro-passeport style={{ ...sPetit, margin: 0 }}>
            {etatSynchro}
          </span>
          <Btn variant="ghost" disabled={enCours} onClick={onActualiser} style={{ padding: "7px 12px", fontSize: 12.5, flexShrink: 0 }}>
            {T.actualiser}
          </Btn>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vue Missions                                                        */
/* ------------------------------------------------------------------ */

function CarteMission({ m, validee, faite, cetteSemaine, onMission }) {
  return (
    <Card data-mission={m.numero} style={cetteSemaine ? { border: `1px solid ${COLORS.gold}` } : undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <div>
          <div style={sPetit}>{T.missionSurtitre(m.numero, m.semaines, cetteSemaine)}</div>
          <SectionTitle>{m.titre}</SectionTitle>
        </div>
        {validee && (
          <span data-mission-validee style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.good, whiteSpace: "nowrap", marginTop: 4 }}>
            {T.missionValidee}
          </span>
        )}
      </div>
      <p style={sTexte}>{maj(m.but)}</p>
      {(cetteSemaine || !validee) && (
        <>
          <ol style={sListe}>
            {m.etapes.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          <p style={sAide}>
            <strong style={{ color: COLORS.text }}>{T.reussieSi}</strong>
            {maj(m.critere)}
          </p>
          <p style={sAide}>
            <strong style={{ color: COLORS.text }}>{T.planB}</strong>
            {maj(m.planB)}
          </p>
        </>
      )}
      {!validee && (
        <label style={sLabelCase}>
          <input type="checkbox" data-mission-faite={m.numero} checked={!!faite} onChange={(e) => onMission(m.numero, e.target.checked)} style={sCase} />
          {T.jeLaiFaite}
        </label>
      )}
    </Card>
  );
}

function VueMissions({ info, validees, local, onMission }) {
  const duJour = missionsDeLaSemaine(info.numero, validees);
  const module = moduleDeLaSemaine(info.numero);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {CONTENU_FEU_VERT.missions.map((m) => (
        <CarteMission
          key={m.numero}
          m={m}
          validee={!!validees[String(m.numero)]}
          faite={!!local.missionsFaites[String(m.numero)]}
          cetteSemaine={duJour.includes(m.numero)}
          onMission={onMission}
        />
      ))}

      {module && (
        <Card data-module={module.numero}>
          <div style={sPetit}>{T.moduleSurtitre(module.semaine)}</div>
          <SectionTitle>{module.titre}</SectionTitle>
          <p style={sTexte}>
            <strong>{T.pourquoi}</strong>
            {maj(module.pourquoi)}
          </p>
          <div style={sSousTitre}>{module.exercice}</div>
          <ol style={sListe}>
            {module.etapes.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          {module.complement.map((t) => (
            <p key={t} style={sAide}>
              {t}
            </p>
          ))}
          <p style={{ ...sAide, color: COLORS.gold }}>{module.lien}</p>
          <p style={sPetit}>{CONTENU_FEU_VERT.avertissementMental}</p>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vue Check-in                                                        */
/* ------------------------------------------------------------------ */

function CheckinEnvoye({ semaine, deja, onCorriger }) {
  return (
    <Card data-checkin-envoye={semaine}>
      <SectionTitle>{T.checkinEnvoyeTitre(semaine)}</SectionTitle>
      <p style={sAide}>{T.checkinEnvoyeLe(deja.envoyeLe)}</p>
      <p style={sTexte}>{T.resumeSeances(deja.seances, semaine, deja.bonus)}</p>
      <p style={sTexte}>{T.resumeVictoire(deja.victoire)}</p>
      <p style={sTexte}>{T.resumeBlocage(deja.blocage)}</p>
      <Btn variant="ghost" onClick={onCorriger} style={{ marginTop: 12 }}>
        {T.corriger}
      </Btn>
    </Card>
  );
}

function FormulaireCheckin({ semaine, reglages, propose, deja, missions, onEnvoyer }) {
  const [nb, setNb] = useState(String(deja ? deja.seances : propose.seances));
  const [bonus, setBonus] = useState(deja ? !!deja.bonus : !!propose.bonus);
  const [victoire, setVictoire] = useState(deja ? deja.victoire : "");
  const [blocage, setBlocage] = useState(deja ? deja.blocage : "");
  const pret = victoire.trim() && blocage.trim();
  const dates = datesSemaine(reglages.debut, semaine);
  return (
    <Card data-checkin={semaine}>
      <SectionTitle>{T.checkinFormTitre(semaine)}</SectionTitle>
      <p style={sPetit}>{T.checkinPeriode(dates.du, dates.au)}</p>
      <Field label={T.champSeances}>
        <div style={{ display: "flex", gap: 6 }}>
          {["0", "1", "2"].map((v) => (
            <button key={v} type="button" data-nb-seances={v} onClick={() => setNb(v)} style={{ ...puce(nb === v), flex: 1 }}>
              {T.sur2(v)}
            </button>
          ))}
        </div>
        <p style={sPetit}>{T.propose(propose.seances, semaine, propose.bonus)}</p>
      </Field>
      {semaine >= 4 && (
        <label style={{ ...sLabelCase, margin: "-4px 0 14px" }}>
          <input type="checkbox" checked={bonus} onChange={(e) => setBonus(e.target.checked)} style={sCase} />
          {T.bonusFait}
        </label>
      )}
      <Field label={T.champVictoire}>
        <TextArea data-victoire rows={2} maxLength={240} value={victoire} placeholder={T.exempleVictoire} onChange={(e) => setVictoire(e.target.value)} />
      </Field>
      <Field label={T.champBlocage}>
        <TextArea data-blocage rows={2} maxLength={240} value={blocage} placeholder={T.exempleBlocage} onChange={(e) => setBlocage(e.target.value)} />
      </Field>
      {missions.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {missions.map((m) => (
            <div key={m.numero} style={{ fontSize: 13, color: COLORS.text, marginTop: 4 }}>
              {T.ligneMission(m.numero, m.titre)}
              <strong style={{ color: m.faite ? COLORS.good : COLORS.textMuted }}>{T.faite(m.faite)}</strong>
            </div>
          ))}
          <p style={sPetit}>{T.aCocher}</p>
        </div>
      )}
      <Btn
        icon={Send}
        disabled={!pret}
        style={{ width: "100%" }}
        onClick={() => onEnvoyer({ semaine, seances: Number(nb), bonus: semaine >= 4 && bonus ? 1 : 0, victoire: victoire.trim(), blocage: blocage.trim(), missions })}
      >
        <span data-envoyer-checkin>{T.envoyer}</span>
      </Btn>
      {!pret && <p style={sPetit}>{T.incomplet}</p>}
      <p style={sPetit}>{T.horsLigne}</p>
    </Card>
  );
}

function VueCheckin({ reglages, seances, local, validees, onEnvoyer }) {
  const [modif, setModif] = useState(false);
  const semaine = semaineDuCheckin(reglages.debut, todayISO());
  const deja = semaine ? local.checkins[String(semaine)] : null;
  const vue = !semaine ? "a-venir" : deja && !modif ? "envoye" : "formulaire";
  const missions = semaine
    ? missionsDeLaSemaine(semaine, validees).map((n) => ({ numero: n, titre: missionParNumero(n).titre, faite: !!local.missionsFaites[String(n)] }))
    : [];
  return vue === "a-venir" ? (
    <Card>
      <SectionTitle>{T.checkinTitre}</SectionTitle>
      <p style={sAide}>{T.checkinAVenir(datesSemaine(reglages.debut, 2).du)}</p>
    </Card>
  ) : vue === "envoye" ? (
    <CheckinEnvoye semaine={semaine} deja={deja} onCorriger={() => setModif(true)} />
  ) : (
    <FormulaireCheckin
      key={semaine + (deja ? deja.envoyeLe : "")}
      semaine={semaine}
      reglages={reglages}
      propose={compteSemaine(seances, semaine, reglages.cohorte)}
      deja={deja}
      missions={missions}
      onEnvoyer={(c) => {
        onEnvoyer(c);
        setModif(false);
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Vue Régularité                                                      */
/* ------------------------------------------------------------------ */

function TableauCohorte({ lignes, moi, n }) {
  const entete = {
    display: "grid",
    gridTemplateColumns: GRILLE_TABLEAU,
    gap: 6,
    fontSize: 10.5,
    color: COLORS.textFaint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingBottom: 6,
    borderBottom: `1px solid ${COLORS.border}`
  };
  return (
    <>
      <div style={entete}>
        {T.colonnes.map((c, i) => (
          <span key={c} style={i ? { textAlign: "right" } : undefined}>
            {c}
          </span>
        ))}
      </div>
      {lignes.map((l) => {
        const r = ligneRegularite(l, Math.max(1, n));
        const estMoi = l.pseudo === moi;
        return (
          <div
            key={l.pseudo}
            data-ligne-tableau={l.pseudo}
            style={{
              display: "grid",
              gridTemplateColumns: GRILLE_TABLEAU,
              gap: 6,
              padding: "9px 0",
              borderBottom: `1px solid ${COLORS.border}`,
              fontSize: 13,
              color: COLORS.text
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: estMoi ? 700 : 400, color: estMoi ? COLORS.gold : COLORS.text }}>{l.pseudo}</span>
            {[r.semaine, r.cumul, r.serie].map((v, i) => (
              <span key={i} style={{ ...sChiffre, textAlign: "right" }}>
                {v}
              </span>
            ))}
          </div>
        );
      })}
    </>
  );
}

function VueRegularite({ info, mesCompteurs, validees, local, tableau, erreurTableau, onAccord }) {
  const [accord, setAccord] = useState(!!local.tableau.accord);
  const [pseudo, setPseudo] = useState(local.tableau.pseudo || "");
  const n = info.etat === "avant" ? 0 : info.numero;
  const moi = n ? ligneRegularite({ semaines: mesCompteurs, missions: validees }, n) : { semaine: 0, cumul: 0, serie: 0 };
  const lignes = (tableau && tableau.lignes) || [];
  const libelleBouton = accord ? T.enregistrer : local.tableau.accord ? T.meRetirer : T.enregistrerChoix;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card data-mon-compteur>
        <SectionTitle>{T.compteurTitre}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
          {T.compteurCases(moi.semaine, n ? pointsMax(n) : 0, moi.cumul, moi.serie).map(([l, v]) => (
            <div key={l} style={{ background: COLORS.bgAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ ...sChiffre, fontSize: 18, color: COLORS.gold }}>{v}</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
        <p style={sPetit}>{T.bareme}</p>
      </Card>

      <Card>
        <SectionTitle>{T.tableauTitre}</SectionTitle>
        <p style={sAide}>{T.tableauAide}</p>
        <label style={sLabelCase}>
          <input type="checkbox" data-accord-tableau checked={accord} onChange={(e) => setAccord(e.target.checked)} style={{ ...sCase, marginTop: 1 }} />
          {T.accord}
        </label>
        {accord && (
          <div style={{ marginTop: 12 }}>
            <Field label={T.champPseudo}>
              <TextInput data-pseudo-tableau maxLength={20} value={pseudo} placeholder={T.exemplePseudo} onChange={(e) => setPseudo(e.target.value)} />
            </Field>
          </div>
        )}
        <Btn variant="ghost" disabled={accord && pseudo.trim().length < 2} onClick={() => onAccord(accord, pseudo.trim())} style={{ marginTop: accord ? 0 : 12 }}>
          {libelleBouton}
        </Btn>
        {erreurTableau && (
          <p data-erreur-tableau style={{ ...sPetit, color: COLORS.warn }}>
            {MSG_FEU_VERT[erreurTableau] || MSG_FEU_VERT.indisponible}
          </p>
        )}
        <div style={{ marginTop: 16 }} data-tableau>
          {lignes.length ? <TableauCohorte lignes={lignes} moi={tableau.pseudo} n={n} /> : <p style={sPetit}>{T.tableauVide}</p>}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Écran                                                               */
/* ------------------------------------------------------------------ */

export function FeuVert({ profile, sessionsApi, onToast, onOuvrirReglages }) {
  const reglages = reglagesFeuVert(profile);
  const aujourdhui = todayISO();
  const info = semaineFeuVert(reglages.debut, aujourdhui);
  const [vue, setVue] = useState("programme");
  const [local, setLocal] = useState(() => lireFeuVert());
  const [erreur, setErreur] = useState(null);
  const [erreurTableau, setErreurTableau] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [fiche, setFiche] = useState(null);
  const seances = sessionsApi.items;

  const passeport = (local.serveur && local.serveur.passeport) || {};
  const validees = (local.serveur && local.serveur.missions) || {};
  const jusqua = info.etat === "avant" ? 0 : info.numero;
  const mesCompteurs = useMemo(() => mesSemaines({ seances, checkins: local.checkins, reglages, jusqua }), [seances, local.checkins, reglages.cohorte, jusqua]);

  const actualiser = async () => {
    setEnCours(true);
    const r = await actualiserPasseport();
    setErreur(r.erreur);
    setLocal(lireFeuVert());
    setEnCours(false);
  };
  const synchroTableau = async (accord) => {
    const l = lireFeuVert();
    const r = await synchroniserTableau({ accord, pseudo: l.tableau.pseudo, semaines: mesSemaines({ seances: sessionsApi.items, checkins: l.checkins, reglages, jusqua }) });
    setErreurTableau(r.erreur === "sans-acces" || r.erreur === "non-inscrit" ? null : r.erreur);
    setLocal(lireFeuVert());
    return r;
  };

  // A l'ouverture : Passeport (derniere valeur connue deja affichee), puis
  // tableau (republie ses compteurs si accord).
  useEffect(() => {
    if (!accesActuel()) {
      setErreur("sans-acces");
      return;
    }
    actualiser().then(() => synchroTableau(lireFeuVert().tableau.accord ? true : null));
  }, []);

  const pointer = async (semaine, lettre) => {
    const { seance, evenement } = pointageFeuVert({ date: aujourdhui, heure: nowHHMM(), semaine, lettre, reglages, charges: local.charges });
    // D'abord enregistree ici, ensuite mise en file pour le coach.
    await sessionsApi.add(seance);
    await envoyerEvenement(profile, evenement);
    if (onToast) onToast(T.toastPointage(lettre));
    if (lireFeuVert().tableau.accord) synchroTableau(true);
  };
  const changerCharge = (id, valeur) => setLocal(majFeuVert({ charges: { ...lireFeuVert().charges, [id]: valeur } }));
  const changerMission = (n, faite) => {
    const m = { ...lireFeuVert().missionsFaites };
    if (faite) m[String(n)] = aujourdhui;
    else delete m[String(n)];
    setLocal(majFeuVert({ missionsFaites: m }));
  };
  const envoyerCheckin = async (c) => {
    // Note locale d'abord : le check-in compte meme s'il attend le reseau.
    const { missions, ...trace } = c;
    setLocal(majFeuVert({ checkins: { ...lireFeuVert().checkins, [String(c.semaine)]: { ...trace, envoyeLe: new Date().toISOString() } } }));
    await envoyerEvenement(profile, evenementCheckin({ ...c, reglages, aujourdhui }));
    if (onToast) onToast(T.toastCheckin);
    if (lireFeuVert().tableau.accord) synchroTableau(true);
  };
  const changerAccord = async (accord, pseudo) => {
    majFeuVert({ tableau: { accord, pseudo } });
    const r = await synchroTableau(accord);
    if (!r.erreur && onToast) onToast(T.toastAccord(accord));
  };

  const geste = fiche ? gesteParId(fiche) : null;
  const etatCycle = info.etat === "avant" ? T.avant(reglages.debut, info.joursAvant) : info.etat === "termine" ? T.termine : T.enCours(info.numero, semaineContenu(info.numero).titre);

  return (
    <div data-ecran-feu-vert style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ background: `linear-gradient(160deg, ${COLORS.surface}, ${COLORS.bgAlt})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FeuTricolore size={26} color={COLORS.gold} />
          <div>
            <div style={{ fontFamily: POLICES.titre, fontSize: 19, fontWeight: 800, color: COLORS.text, lineHeight: 1.1 }}>{T.titre}</div>
            <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 }}>{T.sousTitre(reglages.cohorte, libelleParcours(reglages.parcours))}</div>
          </div>
        </div>
        <p data-etat-cycle={info.etat} style={{ ...sTexte, marginTop: 12 }}>
          {etatCycle}
        </p>
      </Card>

      {checkinAttendu(reglages.debut, aujourdhui, local.checkins) && vue !== "checkin" && (
        <button
          type="button"
          data-bandeau-checkin
          onClick={() => setVue("checkin")}
          style={{ ...sEncadre, textAlign: "left", cursor: "pointer", color: COLORS.text, fontSize: 13.5, fontFamily: "inherit", fontWeight: 600 }}
        >
          {T.bandeauLundi(semaineDuCheckin(reglages.debut, aujourdhui))}
        </button>
      )}

      {erreur === "sans-acces" && (
        <div style={{ ...sEncadre, borderColor: COLORS.border, background: COLORS.bgAlt }}>
          <p style={{ ...sTexte, marginTop: 0 }}>{MSG_FEU_VERT["sans-acces"]}</p>
          <Btn variant="ghost" onClick={onOuvrirReglages} style={{ marginTop: 10 }}>
            {T.ouvrirReglages}
          </Btn>
        </div>
      )}

      <nav aria-label={T.navigation} style={sGrilleVues}>
        {VUES.map((id) => (
          <button key={id} type="button" data-vue={id} aria-current={vue === id ? "page" : undefined} onClick={() => setVue(id)} style={{ ...puce(vue === id), ...sVue }}>
            {T.vues[id]}
          </button>
        ))}
      </nav>

      {vue === "programme" && (
        <VueProgramme reglages={reglages} info={info} passeport={passeport} serveur={local.serveur} seances={seances} local={local} onPointer={pointer} onCharge={changerCharge} onFiche={setFiche} />
      )}
      {vue === "passeport" && <VuePasseport passeport={passeport} serveur={local.serveur} erreur={erreur} enCours={enCours} onActualiser={actualiser} onFiche={setFiche} />}
      {vue === "missions" && <VueMissions info={info} validees={validees} local={local} onMission={changerMission} />}
      {vue === "checkin" && <VueCheckin reglages={reglages} seances={seances} local={local} validees={validees} onEnvoyer={envoyerCheckin} />}
      {vue === "regularite" && (
        <VueRegularite info={info} mesCompteurs={mesCompteurs} validees={validees} local={local} tableau={local.tableauServeur} erreurTableau={erreurTableau} onAccord={changerAccord} />
      )}

      {geste && <FicheGeste geste={geste} etat={etatGeste(passeport, geste.id)} date={passeport[geste.id]?.date} semaine={info.numero} onClose={() => setFiche(null)} />}
    </div>
  );
}
