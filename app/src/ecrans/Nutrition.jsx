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
import { computeCalibration } from "../lib/nutrition.js";
import { Btn, Card, MacroTarget, SectionTitle } from "../ui/primitives.jsx";

/** Fenetre d'observation du calibrage, en jours. Valeur d'origine. */
const FENETRE_CALIBRAGE = 28;

export function Nutrition({ profile, targets, currentWeight, bodyLogs, logEntries, onApplyCalibration }) {
  const calibration = useMemo(
    () => computeCalibration(bodyLogs, logEntries, FENETRE_CALIBRAGE),
    [bodyLogs, logEntries]
  );
  const base = profile.calibratedMaintenanceKcal ? "Calibré (données réelles)" : "Formule (Mifflin-St Jeor)";

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
            <p style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 12 }}>
              Base actuelle : {base}. Poids utilisé : {currentWeight ? `${currentWeight} kg` : "non renseigné"}.
            </p>
          </>
        ) : (
          <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 8 }}>
            Complète ton profil dans les réglages pour calculer tes objectifs.
          </p>
        )}
      </Card>

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
