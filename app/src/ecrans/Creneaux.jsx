/**
 * Mes creneaux de la semaine.
 *
 * Portage de CreneauxCard et SlotRow (index.html 4076-4172). Reserve au
 * coaching en ligne : le client declare ses creneaux dans son profil, et
 * cette carte lui montre ou il en est.
 *
 * Le pointage est volontairement un seul bouton. Un client qui sort de
 * seance ne remplit pas un formulaire ; s'il faut plus de cinq secondes,
 * il ne pointera pas, et le coach perdra le signal qui lui sert justement
 * a ajuster.
 *
 * Un creneau manque demande une justification en une ligne. Ce n'est pas un
 * controle : c'est ce qui permet de distinguer « le creneau ne va plus » de
 * « la motivation baisse », deux problemes aux reponses opposees.
 */

import { useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { fmtDateShort, todayISO } from "../lib/dates.js";
import { getWeekKey, minutesOf, normaliserCreneaux, slotDayLabel } from "../lib/semaine.js";
import {
  META_STATUTS,
  SEUIL_ALERTE_MANQUES,
  TOLERANCE_HORAIRE_MIN,
  bilanSemaine,
  cleJustification,
  heureCourante,
  manquesRecents,
  motivationCreneaux,
  semaineCreneaux,
  tauxRespect
} from "../lib/creneaux.js";
import { lienWhatsappCoach } from "../lib/config.js";
import { MISSED_REASONS } from "../lib/catalogues.js";
import { envoyerEvenement, synchroActive } from "../lib/synchro-coach.js";
import {
  Btn,
  Card,
  Field,
  MiniBar,
  MotivationCard,
  SectionTitle,
  SelectInput,
  TextArea
} from "../ui/primitives.jsx";
import { Send } from "../ui/icones.jsx";

/** Duree d'affichage d'un message de confirmation, en millisecondes. */
const DUREE_MESSAGE = 2600;

/** Au-dela, ce n'est plus la regularite du client qu'il faut revoir, c'est l'horaire. */
const SEUIL_DECALAGES = 3;

/** Adherence en dessous de laquelle le creneau est en difficulte. */
const SEUIL_BON = 80;
const SEUIL_MOYEN = 60;

function LigneCreneau({ ligne, onPointer, pointable, action }) {
  const meta = META_STATUTS[ligne.status] || META_STATUTS.todo;
  // META_STATUTS porte un NOM de couleur, pas une valeur : la bibliotheque
  // reste ainsi utilisable hors du navigateur, dans les tests.
  const couleur = COLORS[meta.couleur];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: COLORS.bgAlt,
        border: `1px solid ${ligne.status === "manque" ? COLORS.bad + "55" : COLORS.border}`,
        borderRadius: 10,
        padding: "10px 12px"
      }}
    >
      <div
        style={{
          width: 5,
          alignSelf: "stretch",
          minHeight: 30,
          borderRadius: 3,
          background: couleur,
          flexShrink: 0
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>
          {slotDayLabel(ligne.slot.day)}
          {ligne.slot.time ? " · " + ligne.slot.time : ""}
        </div>
        <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 2 }}>
          {[ligne.slot.place || null, fmtDateShort(ligne.date), ligne.detail].filter(Boolean).join(" · ")}
        </div>
      </div>
      {action ||
        (pointable ? (
          <Btn
            variant="ghost"
            onClick={() => onPointer(ligne)}
            style={{ padding: "7px 11px", fontSize: 12, flexShrink: 0 }}
          >
            Pointer
          </Btn>
        ) : (
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: couleur,
              whiteSpace: "nowrap",
              flexShrink: 0
            }}
          >
            {meta.label}
          </span>
        ))}
    </div>
  );
}

export function Creneaux({ profile, sessionsApi, raisons, onDefinirRaison }) {
  const aujourdhui = todayISO();
  const cleSemaine = getWeekKey(aujourdhui);

  const [message, setMessage] = useState(null);
  const [justificationOuverte, setJustificationOuverte] = useState(null);
  const [motif, setMotif] = useState("imprévu_pro");
  const [precision, setPrecision] = useState("");

  const creneaux = useMemo(() => normaliserCreneaux(profile), [profile]);
  const semaine = useMemo(
    () => semaineCreneaux(creneaux, sessionsApi.items, cleSemaine, aujourdhui),
    [creneaux, sessionsApi.items, cleSemaine, aujourdhui]
  );
  const quatreSemaines = useMemo(
    () => tauxRespect(creneaux, sessionsApi.items, 4, aujourdhui),
    [creneaux, sessionsApi.items, aujourdhui]
  );
  const manques = useMemo(
    () => manquesRecents(creneaux, sessionsApi.items, aujourdhui),
    [creneaux, sessionsApi.items, aujourdhui]
  );

  if (!creneaux.length) {
    return (
      <Card>
        <SectionTitle>Mes créneaux</SectionTitle>
        <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.55, margin: "10px 0 0" }}>
          Aucun créneau enregistré. Ouvre <strong style={{ color: COLORS.gold }}>Mon profil & réglages</strong>{" "}
          et note le jour, l'heure et le lieu de chaque séance de la semaine.
        </p>
      </Card>
    );
  }

  const bilan = bilanSemaine(semaine.lignes);
  const motivation = motivationCreneaux(semaine, bilan);

  const afficher = (texte) => {
    setMessage(texte);
    window.setTimeout(() => setMessage(null), DUREE_MESSAGE);
  };

  const pointer = async (ligne) => {
    const cEstAujourdhui = ligne.date === aujourdhui;
    const heureReelle = cEstAujourdhui ? heureCourante() : ligne.slot.time || "";

    await sessionsApi.add({
      date: ligne.date,
      slotId: ligne.slot.id,
      startTime: heureReelle,
      place: ligne.slot.place || "",
      source: "creneau",
      routineId: null,
      durationMin: "",
      rpe: "",
      notes: cEstAujourdhui ? "" : "Pointée après coup",
      pains: [],
      exercises: []
    });

    const prevue = minutesOf(ligne.slot.time);
    const reelle = minutesOf(heureReelle);
    const ecart = prevue != null && reelle != null ? Math.abs(reelle - prevue) : 0;

    envoyerEvenement(profile, {
      type: "pointage",
      date: ligne.date,
      creneau: slotDayLabel(ligne.slot.day) + (ligne.slot.time ? " " + ligne.slot.time : ""),
      lieu: ligne.slot.place || "",
      heureReelle,
      ecartMin: ecart,
      // Un pointage apres coup compte comme un retard, meme si l'heure
      // declaree tombe juste : elle n'a pas ete constatee sur le moment.
      retard: !cEstAujourdhui || ecart > TOLERANCE_HORAIRE_MIN
    });

    afficher("Séance pointée sur le créneau de " + slotDayLabel(ligne.slot.day).toLowerCase() + ".");
  };

  const raisonDe = (ligne) => (raisons || {})[cleJustification(ligne)] || null;
  const aJustifier = semaine.lignes.filter((r) => r.status === "manque" && !raisonDe(r));

  const envoyerJustification = async (ligne) => {
    const libelle = (MISSED_REASONS.find((m) => m.id === motif) || {}).label || motif;

    await onDefinirRaison(cleJustification(ligne), {
      motif,
      label: libelle,
      detail: precision.trim(),
      at: new Date().toISOString()
    });

    envoyerEvenement(profile, {
      type: "justification",
      date: ligne.date,
      creneau: slotDayLabel(ligne.slot.day) + (ligne.slot.time ? " " + ligne.slot.time : ""),
      lieu: ligne.slot.place || "",
      motif: libelle,
      message: precision.trim()
    });

    setJustificationOuverte(null);
    setPrecision("");
    afficher("Justification envoyée à ton coach.");
  };

  const alerte = manques.length >= SEUIL_ALERTE_MANQUES;
  const sansSynchro = !synchroActive(profile);

  return (
    <Card>
      <MotivationCard text={motivation} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 10,
          flexWrap: "wrap"
        }}
      >
        <SectionTitle>Mes créneaux cette semaine</SectionTitle>
        <span
          style={{
            fontFamily: "IBM Plex Mono",
            fontSize: 12.5,
            color: bilan.manques ? COLORS.warn : COLORS.textMuted
          }}
        >
          {bilan.honores}/{bilan.prevus} honorés
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {semaine.lignes.map((r, i) => {
          const raison = raisonDe(r);
          // Une fois justifie, le creneau garde son statut mais affiche le
          // motif : le client voit que sa reponse est bien arrivee.
          const ligne = raison
            ? { ...r, detail: "Manqué · " + raison.label + (raison.detail ? " : " + raison.detail : "") }
            : r;
          const aJust = r.status === "manque" && !raison;
          const cle = cleJustification(r);

          return (
            <div key={r.slot.id + "-" + i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <LigneCreneau
                ligne={ligne}
                onPointer={pointer}
                pointable={r.status === "aujourdhui" || r.status === "attente"}
                action={
                  aJust ? (
                    <Btn
                      variant="ghost"
                      onClick={() => setJustificationOuverte(justificationOuverte === cle ? null : cle)}
                      style={{
                        padding: "7px 11px",
                        fontSize: 12,
                        flexShrink: 0,
                        borderColor: COLORS.warn,
                        color: COLORS.warn
                      }}
                    >
                      Justifier
                    </Btn>
                  ) : null
                }
              />

              {justificationOuverte === cle && (
                <div
                  style={{
                    background: COLORS.bgAlt,
                    border: `1px solid ${COLORS.warn}55`,
                    borderRadius: 10,
                    padding: 12
                  }}
                >
                  <Field label="Pourquoi ce créneau n'a pas été tenu ?">
                    <SelectInput
                      options={MISSED_REASONS}
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                    />
                  </Field>
                  <Field label="Précision (optionnel)">
                    <TextArea
                      rows={2}
                      value={precision}
                      placeholder="Ce qui s'est passé, en une phrase"
                      onChange={(e) => setPrecision(e.target.value)}
                    />
                  </Field>
                  <Btn style={{ width: "100%" }} onClick={() => envoyerJustification(r)}>
                    Envoyer à mon coach
                  </Btn>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {aJustifier.length > 0 && (
        <p style={{ fontSize: 12, color: COLORS.warn, margin: "10px 0 0", lineHeight: 1.5 }}>
          {aJustifier.length === 1
            ? "1 créneau manqué à justifier."
            : aJustifier.length + " créneaux manqués à justifier."}{" "}
          Une ligne suffit : c'est ce qui me permet d'ajuster le créneau plutôt que le programme.
        </p>
      )}

      {semaine.bonus > 0 && (
        <p style={{ fontSize: 11.5, color: COLORS.textFaint, margin: "10px 0 0" }}>
          {semaine.bonus} séance{semaine.bonus > 1 ? "s" : ""} en plus des créneaux cette semaine.
        </p>
      )}

      {message && <p style={{ fontSize: 12, color: COLORS.good, margin: "10px 0 0" }}>{message}</p>}

      {quatreSemaines && quatreSemaines.pct != null && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
          <MiniBar
            label="Respect du créneau (4 dernières semaines)"
            pct={quatreSemaines.pct}
            valueLabel={quatreSemaines.pct + " %"}
            color={
              quatreSemaines.pct >= SEUIL_BON
                ? COLORS.good
                : quatreSemaines.pct >= SEUIL_MOYEN
                  ? COLORS.warn
                  : COLORS.bad
            }
          />
          <p style={{ fontSize: 11, color: COLORS.textFaint, margin: 0 }}>
            {quatreSemaines.honores} créneau{quatreSemaines.honores > 1 ? "x" : ""} honoré
            {quatreSemaines.honores > 1 ? "s" : ""} sur {quatreSemaines.tranches} arrivé
            {quatreSemaines.tranches > 1 ? "s" : ""} à terme
            {quatreSemaines.decales ? ", dont " + quatreSemaines.decales + " hors du créneau prévu" : ""}.
          </p>
          {quatreSemaines.decales >= SEUIL_DECALAGES ? (
            <p style={{ fontSize: 11.5, color: COLORS.warn, margin: "6px 0 0", lineHeight: 1.5 }}>
              Les séances se font, mais rarement à l'heure prévue. C'est le créneau qu'il faut revoir avec ton
              coach, pas ta régularité.
            </p>
          ) : null}
        </div>
      )}

      {/* Sans synchronisation, le coach ne verra rien : le client garde au
          moins un moyen direct de le prevenir. */}
      {alerte && sansSynchro && (
        <div
          style={{
            marginTop: 14,
            background: `${COLORS.bad}14`,
            border: `1px solid ${COLORS.bad}55`,
            borderRadius: 10,
            padding: "12px 14px"
          }}
        >
          <p style={{ fontSize: 13, color: COLORS.text, margin: "0 0 10px", lineHeight: 1.5 }}>
            {manques.length} créneaux manqués sur les 14 derniers jours. Prends 30 secondes pour le dire à ton
            coach : c'est là qu'on ajuste, pas quand tout va bien.
          </p>
          <Btn
            icon={Send}
            style={{ width: "100%" }}
            onClick={() =>
              window.open(
                lienWhatsappCoach(
                  "Salut Marien, j'ai manqué " +
                    manques.length +
                    " séances ces deux dernières semaines. On en parle ?"
                ),
                "_blank",
                "noopener"
              )
            }
          >
            Prévenir mon coach
          </Btn>
        </div>
      )}
    </Card>
  );
}
