/**
 * Ecran Nutrition.
 *
 * Portage fidele de NutritionTab (index.html, ligne 2778).
 *
 * Le calibrage est le point sensible de cet ecran : il compare les calories
 * reellement loguees a l'evolution du poids pour estimer la maintenance
 * reelle du client, plutot que celle qu'une formule predit. L'estimation
 * n'est jamais appliquee toute seule — c'est le client qui decide, via le
 * bouton. Ce comportement est conserve tel quel : appliquer d'office
 * modifierait ses objectifs sans qu'il l'ait demande.
 */

import { useMemo } from "react";
import { COLORS } from "../tokens.js";
import { fmtDateShort } from "../lib/dates.js";
import { computeCalibration, etatCalibrage } from "../lib/nutrition.js";
import { descriptionRegime } from "../lib/regimes.js";
import { objectifFibres, totalFibres } from "../lib/fibres.js";
import { todayISO } from "../lib/dates.js";
import { Btn, Card, MacroTarget, SectionTitle } from "../ui/primitives.jsx";
import { budgetSemaine, messageSemaine, reglesDieteFlexible } from "../lib/diete-flexible.js";

/** Fenetre d'observation du calibrage, en jours. Valeur d'origine. */
const FENETRE_CALIBRAGE = 28;

export function Nutrition({ profile, targets, currentWeight, bodyLogs, logEntries, onApplyCalibration }) {
  const etatCal = etatCalibrage(profile, currentWeight);
  const calibration = useMemo(
    () => computeCalibration(bodyLogs, logEntries, FENETRE_CALIBRAGE),
    [bodyLogs, logEntries]
  );
  const base = profile.calibratedMaintenanceKcal ? "Calibré (données réelles)" : "Formule (Mifflin-St Jeor)";

  /*
   * Fibres du jour.
   *
   * L'objectif suit les calories plutot qu'un « 30 g par jour » fixe, qui
   * serait trop haut pour une cliente a 1500 kcal et trop bas pour un
   * pratiquant a 4000.
   *
   * Le total ne compte QUE les aliments dont la teneur est connue, et se
   * declare partiel des qu'un aliment n'en a pas. Afficher « 12 g » sans
   * dire que deux aliments sur trois ne sont pas comptes ferait croire a un
   * deficit qui n'existe peut-etre pas.
   */
  const fibres = useMemo(() => {
    const duJour = (logEntries || []).filter((e) => e.date === todayISO());
    return { ...totalFibres(duJour), objectif: objectifFibres(targets?.calories) };
  }, [logEntries, targets]);

  // Diete flexible (14 octobre 2026) : le budget calorique se lit a la semaine.
  const semaine = useMemo(
    () => budgetSemaine({ entrees: logEntries, objectif: targets?.calories, aujourdhui: todayISO() }),
    [logEntries, targets]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionTitle>Objectifs journaliers</SectionTitle>
        {targets?.calories ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginTop: 12 }}>
              <MacroTarget label="Calories" value={targets.calories} unit="kcal" />
              <MacroTarget label="Protéines" value={targets.protein} unit="g" />
              <MacroTarget label="Glucides" value={targets.carbs} unit="g" />
              <MacroTarget label="Lipides" value={targets.fat} unit="g" />
            </div>
            {/* TEXTE-NOUVEAU
                Les fibres etaient absentes de l'application d'origine :
                ni objectif, ni suivi, ni valeur au catalogue. Tout ce bloc
                est donc nouveau par nature, et ne peut pas figurer dans
                index.html. Le mot « partiel » est le point important : il
                dit au client que le chiffre affiche est un plancher, pas
                son apport reel. */}
            {fibres.objectif ? (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: `1px solid ${COLORS.borderLight}`,
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 10
                }}
              >
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>Fibres aujourd'hui</span>
                <span style={{ fontFamily: "IBM Plex Mono", fontSize: 13, color: COLORS.text }}>
                  {fibres.connus ? `${fibres.total} g` : "—"} / {fibres.objectif} g
                </span>
              </div>
            ) : null}
            {fibres.objectif && fibres.partiel ? (
              <p style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 6 }}>
                Total partiel : {fibres.inconnus}{" "}
                {fibres.inconnus > 1 ? "aliments n'ont pas" : "aliment n'a pas"} de teneur connue. Ton apport
                réel est plus élevé.
              </p>
            ) : null}
            {/* FIN-TEXTE-NOUVEAU */}
            <p style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 12 }}>
              Base actuelle : {base}. Poids utilisé : {currentWeight ? `${currentWeight} kg` : "non renseigné"}.
            </p>
            {/* TEXTE-NOUVEAU
                C'est ici que le client lit ses macros du jour, et donc ici
                qu'il se demande pourquoi ses glucides sont bas. Répéter la
                règle de son régime à l'endroit où le chiffre le surprend
                évite le seul réflexe vraiment coûteux : conclure à un bug
                et manger au jugé.
            */}
            {descriptionRegime(profile).map((phrase) => (
              <p key={phrase} style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 6, lineHeight: 1.5 }}>
                {phrase}
              </p>
            ))}
            {/* FIN-TEXTE-NOUVEAU */}
          </>
        ) : (
          <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 8 }}>
            Complète ton profil dans les réglages pour calculer tes objectifs.
          </p>
        )}
      </Card>

      <DieteFlexible semaine={semaine} regles={reglesDieteFlexible(targets?.calories)} />

      {calibration && (
        <Card>
          <SectionTitle>Calibrage calorique</SectionTitle>
          <p style={{ fontSize: 13, color: COLORS.text, marginTop: 10, lineHeight: 1.5 }}>
            Sur tes {calibration.days} derniers jours, ta maintenance réelle est estimée à ~
            {calibration.estimate} kcal, à partir de tes calories loguées et de l'évolution de ton poids.
          </p>

          {/* TEXTE-NOUVEAU
              Avertissement de couverture, et bouton de retrait. Ajoutes apres
              un incident reel : une pratiquante de force a six seances par
              semaine s'est retrouvee a 1320 kcal par jour, parce que le
              calibrage moyennait un journal incomplet — et rien ne permettait
              de revenir en arriere une fois l'estimation appliquee.
          */}
          {etatCal && etatCal.statut !== "appliquee" && (
            <p style={{ fontSize: 12, color: COLORS.warn, marginTop: 8, lineHeight: 1.5 }}>
              {etatCal.statut === "ignore"
                ? `Ton calibrage de ${etatCal.declaree} kcal n'est pas appliqué : il s'écarte trop de ce que ton profil laisse attendre (~${etatCal.formule} kcal). L'objectif repart de la formule.`
                : `Ton calibrage de ${etatCal.declaree} kcal est ramené à ${etatCal.retenue} kcal : l'écart avec ton profil (~${etatCal.formule} kcal) est trop grand pour venir du seul métabolisme. Le plus souvent, il manque des calories au journal — vérifie que tu pèses bien tes aliments dans l'état indiqué, cru ou cuit.`}
            </p>
          )}

          {calibration.fiable === false && (
            <p style={{ fontSize: 12, color: COLORS.warn, marginTop: 8, lineHeight: 1.5 }}>
              Journal rempli {Math.round(calibration.couverture * 100)} % des jours seulement. Cette
              estimation part de ce qui a été noté, pas de tout ce qui a été mangé : elle est donc
              trop basse. Complète ton journal avant de l'appliquer.
            </p>
          )}

          <Btn
            onClick={() => onApplyCalibration(calibration.estimate, calibration.couverture)}
            variant={calibration.fiable === false ? "ghost" : "primary"}
            style={{ marginTop: 10 }}
          >
            Appliquer cette estimation
          </Btn>

          {profile.calibratedMaintenanceKcal && (
            <>
              <p style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 10 }}>
                Calibrage actif : {profile.calibratedMaintenanceKcal} kcal, appliqué le{" "}
                {fmtDateShort((profile.calibratedAt || "").slice(0, 10))}.
              </p>
              <Btn variant="ghost" onClick={() => onApplyCalibration(null)} style={{ marginTop: 8 }}>
                Revenir au calcul par formule
              </Btn>
            </>
          )}
          {/* FIN-TEXTE-NOUVEAU */}
        </Card>
      )}
    </div>
  );
}

/* TEXTE-NOUVEAU
   Diete flexible, demandee par le coach le 14 octobre 2026 : rassurer le
   client (le total de la journee compte, pas la repartition par repas ; la
   semaine compte plus que la journee ; un plaisir prevu evite de craquer ;
   un ecart se lisse sans jeuner). index.html n'avait rien de tel. */
const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

// Les regles sont chiffrees sur l'objectif du client (lib/diete-flexible.js) :
// un exemple a 3 000 kcal ne parle pas a une cliente a 1 500.

function DieteFlexible({ semaine, regles }) {
  const couleur = semaine ? (semaine.etat === "surplus" ? COLORS.warn : semaine.etat === "marge" ? COLORS.blue : COLORS.good) : COLORS.textMuted;
  return (
    <Card>
      <SectionTitle>Ta semaine compte plus que ta journée</SectionTitle>
      {semaine && (
        <div data-diete-flexible style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {semaine.jours.map((j, i) => (
              <div
                key={j.date}
                style={{
                  textAlign: "center",
                  borderRadius: 8,
                  padding: "6px 0",
                  background: j.aujourdhui ? `${COLORS.gold}1A` : COLORS.bgAlt,
                  border: `1px solid ${j.aujourdhui ? COLORS.gold : COLORS.border}`
                }}
              >
                <div style={{ fontSize: 10.5, color: j.aujourdhui ? COLORS.gold : COLORS.textFaint, fontWeight: 600 }}>
                  {JOURS[i]}
                </div>
                <div style={{ fontSize: 11, color: j.kcal != null ? COLORS.text : COLORS.textFaint, fontFamily: "IBM Plex Mono" }}>
                  {j.kcal != null ? j.kcal : "—"}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: COLORS.textMuted, margin: "8px 0 0" }}>
            Budget de la semaine : {semaine.budget.toLocaleString("fr-FR")} kcal ({semaine.cible.toLocaleString("fr-FR")}{" "}
            × 7)
            {semaine.joursSansSaisie > 0
              ? ` · ${semaine.joursSansSaisie} jour${semaine.joursSansSaisie > 1 ? "s" : ""} sans saisie compté${semaine.joursSansSaisie > 1 ? "s" : ""} à l'objectif`
              : ""}
          </p>
          <p
            style={{
              fontSize: 13,
              color: COLORS.text,
              margin: "10px 0 0",
              lineHeight: 1.5,
              borderLeft: `3px solid ${couleur}`,
              paddingLeft: 10
            }}
          >
            {messageSemaine(semaine)}
          </p>
          {semaine.grasMaxG > 0 && (
            <p style={{ fontSize: 12, color: COLORS.textMuted, margin: "8px 0 0", lineHeight: 1.5 }}>
              La balance monte après un écart ? C'est surtout de l'eau et du sel. {semaine.ecart.toLocaleString("fr-FR")} kcal
              de trop, c'est au plus {semaine.grasMaxG} g de graisse.
            </p>
          )}
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <div
          style={{
            fontSize: 10.5,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            fontWeight: 600,
            marginBottom: 6
          }}
        >
          Les règles de ta diète flexible
        </div>
        {regles.map(([titre, texte], i) => (
          <p key={i} style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "0 0 8px", lineHeight: 1.5 }}>
            <b style={{ color: COLORS.text }}>{titre}</b> {texte}
          </p>
        ))}
      </div>
    </Card>
  );
}
/* FIN-TEXTE-NOUVEAU */
