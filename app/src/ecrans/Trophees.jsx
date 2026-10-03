/**
 * Mes trophees : serie de semaines tenues et paliers de seances.
 *
 * Voir lib/trophees.js pour les regles (series hebdomadaires facon Peloton,
 * paliers facon Orangetheory, joker facon Duolingo pour les semaines
 * difficiles, regle « ne jamais rater deux fois »).
 *
 * Le joker n'est explique qu'au client en ligne (avecJoker) : lui seul peut
 * declarer une semaine difficile.
 *
 * Un trophee nouvellement gagne est celebre une fois, puis memorise comme
 * vu (cle cn_trophees_vus, incluse dans les sauvegardes).
 *
 * La celebration porte aussi, au plus une fois toutes les 4 semaines, la
 * relance du parrainage (lib/relance-parrainage.js).
 */

import { useMemo, useState } from "react";
import { Send } from "../ui/icones.jsx";
import { COLORS, POLICES } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { messageSemaine, nouveauxTrophees, trophees, tropheesAffiches } from "../lib/trophees.js";
import { debutSaisi, seancesAvant } from "../lib/carte-progres.js";
import { DebutCoaching, LIBELLE_CHAMP, ListesDate, SeancesTotales } from "./CarteProgres.jsx";
import { FORMULES_CONTRAT, contratDuProfil, dateCourte, echeanceContrat, etatContrat, messageFinContrat } from "../lib/contrat.js";
import { SelectInput } from "../ui/primitives.jsx";
import { contexteDuJour } from "../lib/mot-du-coach.js";
import { messageInvitation } from "../lib/carte-progres.js";
import { inviterUnAmi } from "../lib/partage-carte.js";
import { CLE_RELANCE_PARRAINAGE, PHRASE_PARRAINAGE, afficherRelanceParrainage } from "../lib/relance-parrainage.js";
import { Btn, Card, MiniBar, SectionTitle } from "../ui/primitives.jsx";

const CLE_VUS = "cn_trophees_vus";
const ICONES_FAMILLE = { seances: "🏅", semaines: "🔥", anciennete: "🎖️", contrat: "🤝" };

/* TEXTE-NOUVEAU
   Trophees et serie de semaines tenues, ajoutes a la demande du coach pour
   que les clients restent actifs, d'apres Peloton, Orangetheory et Duolingo.
   Aucun de ces libelles n'existe dans index.html. */
export function Trophees({ seances, profile, semainesDifficiles, avecJoker, onDebutCoaching, onSeancesAvantApp, onContrat }) {
  const date = todayISO();
  const etat = useMemo(
    () => trophees({ seances, profil: profile, semainesDifficiles, date }),
    [seances, profile, semainesDifficiles, date]
  );
  const [vus, setVus] = useState(() => {
    const v = charger(CLE_VUS, []);
    return Array.isArray(v) ? v : [];
  });
  const nouveaux = nouveauxTrophees(etat.liste, vus);
  const { serie, meilleure, enCours } = etat.series;
  const message = messageSemaine(etat.series);

  const [derniereRelance, setDerniereRelance] = useState(() => charger(CLE_RELANCE_PARRAINAGE, null));
  const contexte = contexteDuJour({ seances, profil: profile, semainesDifficiles, date });
  const relance = afficherRelanceParrainage({ nouveaux, contexte, derniere: derniereRelance, date });
  const fermerRelance = () => {
    setDerniereRelance(date);
    enregistrer(CLE_RELANCE_PARRAINAGE, date);
  };
  const inviter = () => {
    fermerRelance();
    inviterUnAmi(messageInvitation({ prenom: profile && (profile.firstName || profile.name) }));
  };

  const [suiviOuvert, setSuiviOuvert] = useState(false);
  const debutManuel = debutSaisi(profile, date);
  const avantApp = seancesAvant(profile);
  const historiqueSaisi = Boolean(debutManuel || avantApp || contratDuProfil(profile));
  const [aa, mm, jj] = (debutManuel || "").split("-");
  const contrat = contratDuProfil(profile);
  const etatDuContrat = etatContrat({ profil: profile, seances, date });
  const finContrat = messageFinContrat(etatDuContrat);

  const marquerVus = () => {
    const suivant = [...new Set([...vus, ...nouveaux.map((t) => t.id)])];
    setVus(suivant);
    enregistrer(CLE_VUS, suivant);
  };

  return (
    <Card>
      <SectionTitle>Mes trophées</SectionTitle>

      {nouveaux.length > 0 && (
        <div
          data-nouveau-trophee=""
          style={{
            marginTop: 12,
            padding: "12px 14px",
            borderRadius: 10,
            border: `1px solid ${COLORS.gold}`,
            background: `${COLORS.gold}1A`
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold }}>
            🎉 {nouveaux.length > 1 ? `${nouveaux.length} nouveaux trophées !` : "Nouveau trophée !"}
          </div>
          <div style={{ fontSize: 13, color: COLORS.text, margin: "4px 0 10px" }}>
            {nouveaux.map((t) => t.titre).join(" · ")}
          </div>
          {relance && (
            <div
              data-relance-parrainage=""
              style={{
                position: "relative",
                margin: "0 0 10px",
                padding: "10px 34px 10px 12px",
                borderRadius: 8,
                background: COLORS.bgAlt,
                border: `1px solid ${COLORS.border}`
              }}
            >
              <button
                type="button"
                aria-label="Fermer l'invitation"
                onClick={fermerRelance}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 28,
                  height: 28,
                  border: "none",
                  background: "transparent",
                  color: COLORS.textMuted,
                  fontSize: 16,
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
              <p style={{ fontSize: 13, color: COLORS.text, margin: "0 0 8px", lineHeight: 1.45 }}>{PHRASE_PARRAINAGE}</p>
              <Btn variant="ghost" icon={Send} onClick={inviter} style={{ padding: "7px 12px" }}>
                Inviter un ami
              </Btn>
            </div>
          )}
          <Btn onClick={marquerVus} style={{ padding: "8px 14px" }}>
            Super !
          </Btn>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 14 }}>
        <span style={{ fontSize: 26 }}>🔥</span>
        <span data-serie-semaines="" style={{ fontFamily: POLICES.titre, fontSize: 28, fontWeight: 700, color: COLORS.text }}>
          {serie}
        </span>
        <span style={{ fontSize: 13, color: COLORS.textMuted }}>
          semaine{serie > 1 ? "s" : ""} tenue{serie > 1 ? "s" : ""} d'affilée
          {meilleure > serie ? ` · record ${meilleure}` : ""}
        </span>
      </div>

      <div style={{ marginTop: 10 }}>
        <MiniBar
          label={`Cette semaine${enCours.difficile ? " (semaine difficile)" : ""}`}
          pct={(Math.min(enCours.faites, enCours.objectif) / enCours.objectif) * 100}
          valueLabel={`${enCours.faites}/${enCours.objectif} séances`}
          color={COLORS.gold}
        />
      </div>
      {message && <p style={{ fontSize: 12.5, color: COLORS.text, margin: "0 0 12px", lineHeight: 1.5 }}>{message}</p>}

      {tropheesAffiches(etat.liste).map((famille) => (
        <div key={famille.id} data-famille-trophees={famille.id} style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
            {famille.titre}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {famille.tuiles.map((t) => (
              <div
                key={t.id}
                data-trophee={t.id}
                data-obtenu={t.obtenu ? "oui" : "non"}
                title={t.detail}
                style={{
                  padding: "10px 6px",
                  borderRadius: 10,
                  textAlign: "center",
                  border: `1px solid ${t.obtenu ? COLORS.gold : COLORS.border}`,
                  background: t.obtenu ? `${COLORS.gold}14` : COLORS.bgAlt,
                  opacity: t.obtenu ? 1 : 0.55
                }}
              >
                <div style={{ fontSize: 22, filter: t.obtenu ? "none" : "grayscale(1)" }}>
                  {ICONES_FAMILLE[t.famille]}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: t.obtenu ? COLORS.gold : COLORS.textMuted, marginTop: 4 }}>
                  {t.titre}
                </div>
                <div style={{ fontSize: 10, color: COLORS.textFaint, marginTop: 2 }}>{t.obtenu ? t.detail : t.progression}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {onDebutCoaching && onSeancesAvantApp && (
        <div data-suivi-coach="" style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, border: `1px dashed ${COLORS.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.45 }}>
              {historiqueSaisi ? (
                <>
                  Ton suivi avec le coach : {debutManuel ? `depuis le ${jj}/${mm}/${aa}` : "date de début non renseignée"}
                  {" · "}
                  {etat.total} séance{etat.total > 1 ? "s" : ""}
                </>
              ) : (
                "Suivi(e) par le coach avant l'application ? Ajoute ton temps de suivi et tes séances : tes trophées en tiennent compte."
              )}
            </div>
            <Btn variant="ghost" onClick={() => setSuiviOuvert(!suiviOuvert)} style={{ padding: "7px 12px", flexShrink: 0 }}>
              {suiviOuvert ? "Fermer" : historiqueSaisi ? "Modifier" : "Ajouter"}
            </Btn>
          </div>
          {suiviOuvert && (
            <div style={{ marginTop: 12 }}>
              <DebutCoaching
                valeur={debutManuel || etat.debut || date}
                manuel={Boolean(debutManuel)}
                date={date}
                onChange={onDebutCoaching}
              />
              <SeancesTotales total={etat.total} seancesApp={etat.totalApp} avant={avantApp} onChange={onSeancesAvantApp} />
              {onContrat && (
                <div data-contrat-saisie="">
                  <div style={{ ...LIBELLE_CHAMP, marginBottom: 6 }}>Ton contrat en cours</div>
                  <SelectInput
                    aria-label="Formule du contrat"
                    value={contrat ? contrat.formule.id : ""}
                    onChange={(e) =>
                      onContrat(e.target.value ? { formule: e.target.value, debut: contrat ? contrat.debut : date } : null)
                    }
                    options={[{ id: "", label: "Choisis ta formule" }, ...FORMULES_CONTRAT]}
                  />
                  {contrat && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Début du contrat en cours</div>
                      <ListesDate
                        valeur={contrat.debut}
                        date={date}
                        onChange={(d) => onContrat({ formule: contrat.formule.id, debut: d })}
                        etiquettes={{ jour: "Jour de début du contrat", mois: "Mois de début du contrat", annee: "Année de début du contrat" }}
                        messageFutur="Cette date est dans le futur : choisis le jour où ton contrat actuel a commencé."
                      />
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "6px 0 0", lineHeight: 1.45 }}>
                    En cas de renouvellement, mets la date de début du nouveau contrat.
                  </p>
                </div>
              )}
            </div>
          )}

          {etatDuContrat && (
            <div data-contrat="" style={{ marginTop: 10, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
              Contrat {etatDuContrat.formule.label}
              {etatDuContrat.sansEngagement
                ? ""
                : etatDuContrat.termine
                  ? ` · terminé le ${dateCourte(etatDuContrat.fin)}`
                  : ` · jusqu'au ${dateCourte(etatDuContrat.fin)} · fin ${echeanceContrat(etatDuContrat)}`}
              {" · "}
              {etatDuContrat.seances} séance{etatDuContrat.seances > 1 ? "s" : ""} notée{etatDuContrat.seances > 1 ? "s" : ""} depuis le début du contrat
            </div>
          )}
          {finContrat && (
            <div
              data-fin-contrat=""
              style={{
                marginTop: 8,
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${COLORS.gold}`,
                background: `${COLORS.gold}14`,
                fontSize: 12.5,
                color: COLORS.text,
                lineHeight: 1.45
              }}
            >
              {finContrat}
            </div>
          )}
        </div>
      )}

      <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "10px 0 0", lineHeight: 1.45 }}>
        Une semaine est tenue quand tu atteins ton objectif de séances. Tes séances d'avant l'application et ta
        date de début comptent pour les trophées de séances et d'ancienneté.
        {avecJoker && " Semaine difficile déclarée : une seule séance maintien suffit, ta série est protégée."}
      </p>
    </Card>
  );
}
/* FIN-TEXTE-NOUVEAU */
