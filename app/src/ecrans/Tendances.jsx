/**
 * Ecran Tendances.
 *
 * Portage de TendancesTab (index.html, ligne 4399) : bilan de la semaine,
 * photos de progression, bilan mensuel et courbes d'evolution.
 *
 * Le choix du graphique n'est pas decoratif et a ete verifie sur
 * l'application reelle : COURBE pour les grandeurs continues (calories
 * moyennes, poids, muscle), HISTOGRAMME pour ce qui se cumule sur une
 * semaine (sommeil, hydratation, pas). Chaque graphique porte la ligne de
 * reference de l'objectif du client — sans elle, on voit une evolution
 * mais pas si elle va dans le bon sens.
 */

import { useMemo } from "react";
import { COLORS } from "../tokens.js";
import { fmtDateShort } from "../lib/dates.js";
import { fmtL } from "../lib/score-jour.js";
import { serieCorporelle, serieHebdomadaire } from "../lib/tendances.js";
import { Btn, Card, ProgressRing, SectionTitle, StatChip } from "../ui/primitives.jsx";
import { Courbe, Histogramme } from "../ui/Courbe.jsx";
import { BilanSections } from "../ui/BilanSections.jsx";
import { Camera, Droplet, Dumbbell, Flame, Footprints, Loader2, Moon, Scale, Share, Sparkles } from "../ui/icones.jsx";

/** Attente et erreur de generation, communes aux deux bilans. */
const styleAttente = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontSize: 13,
  color: COLORS.textMuted,
  margin: "0 0 14px"
};

const styleErreur = {
  fontSize: 12.5,
  color: COLORS.bad,
  textAlign: "center",
  lineHeight: 1.5,
  margin: "0 0 12px"
};

/** Nombre de semaines affichees sur les graphiques. */
const SEMAINES_AFFICHEES = 8;

/** Les trois prises de vue proposees, dans l'ordre de l'application. */
const POSES = [
  { id: "face", label: "Face" },
  { id: "profil", label: "Profil" },
  { id: "dos", label: "Dos" }
];

const styleEnTete = {
  fontSize: 11.5,
  fontWeight: 600,
  color: COLORS.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 10
};

/** Un graphique dans sa carte, avec son titre. */
function CarteGraphique({ titre, children }) {
  return (
    <Card>
      <SectionTitle>{titre}</SectionTitle>
      <div style={{ marginTop: 12 }}>{children}</div>
    </Card>
  );
}

export function Tendances({
  allData,
  profile,
  targets,
  weekStats,
  monthStats,
  photos,
  onUploadPhoto,
  onGenerate,
  onGenerateMonthly,
  onPartager,
  bilanCourant,
  bilanMensuelCourant,
  enGeneration,
  enGenerationMensuelle,
  erreurGeneration,
  erreurGenerationMensuelle,
  iaDisponible = true
}) {
  const serie = useMemo(
    () => serieHebdomadaire(SEMAINES_AFFICHEES, allData, profile, targets),
    [allData, profile, targets]
  );
  const seriePoids = useMemo(() => serieCorporelle(allData.bodyLogs, "weightKg"), [allData.bodyLogs]);
  const serieMuscle = useMemo(() => serieCorporelle(allData.bodyLogs, "muscleKg"), [allData.bodyLogs]);

  const points = (champ) => serie.map((w) => ({ label: w.label, value: w[champ] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle>Bilan de la semaine</SectionTitle>
          <span style={{ fontSize: 11, color: COLORS.textFaint }}>
            {fmtDateShort(weekStats.start)} — {fmtDateShort(weekStats.end)}
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "center" }}>
          <ProgressRing value={weekStats.adherence} label="Adhérence" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, flex: 1, minWidth: 220 }}>
            <StatChip icon={Dumbbell} label="Séances" value={weekStats.workoutsCount} />
            <StatChip icon={Moon} label="Sommeil moy." value={weekStats.avgSleepH ? `${weekStats.avgSleepH}h` : "—"} />
            <StatChip
              icon={Scale}
              label="Poids"
              value={
                weekStats.weightDelta != null
                  ? `${weekStats.weightDelta > 0 ? "+" : ""}${weekStats.weightDelta}kg`
                  : "—"
              }
            />
            <StatChip icon={Flame} label="Calories moy." value={weekStats.avgCalories ?? "—"} />
            <StatChip
              icon={Footprints}
              label="Pas moy./jour"
              value={weekStats.avgSteps != null ? Math.round(weekStats.avgSteps).toLocaleString("fr-FR") : "—"}
            />
            <StatChip
              icon={Droplet}
              label="Eau moy./jour"
              value={weekStats.avgWaterMl != null ? fmtL(weekStats.avgWaterMl) : "—"}
            />
          </div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${COLORS.border}` }}>
          <div style={styleEnTete}>Photos de progression</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {POSES.map((pose) => (
              <div key={pose.id}>
                <button
                  onClick={() => onUploadPhoto?.(pose.id)}
                  style={{
                    width: "100%",
                    aspectRatio: "3/4",
                    borderRadius: 10,
                    border: `1px dashed ${COLORS.border}`,
                    background: photos?.[pose.id] ? `url(${photos[pose.id]}) center/cover` : COLORS.bgAlt,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    overflow: "hidden"
                  }}
                >
                  {!photos?.[pose.id] && <Camera size={18} color={COLORS.textFaint} />}
                </button>
                <div style={{ fontSize: 10, color: COLORS.textFaint, textAlign: "center", marginTop: 4 }}>
                  {pose.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${COLORS.border}` }}>
          {weekStats.hasAnyData ? (
            <div>
              {enGeneration ? (
                <p style={styleAttente}>
                  <Loader2 size={16} /> Génération du bilan par le coach IA...
                </p>
              ) : (
                bilanCourant && (
                  <div style={{ marginBottom: 16, textAlign: "left" }}>
                    <BilanSections sections={bilanCourant.sections} />
                  </div>
                )
              )}

              {erreurGeneration && <p style={styleErreur}>{erreurGeneration}</p>}

              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {iaDisponible && (
                  <Btn icon={Sparkles} onClick={onGenerate} disabled={enGeneration}>
                    {bilanCourant ? "Régénérer" : "Bilan IA (optionnel)"}
                  </Btn>
                )}
                <Btn variant="ghost" icon={Share} onClick={onPartager}>
                  {bilanCourant ? "Envoyer à mon coach" : "Envoyer sans bilan IA"}
                </Btn>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: COLORS.textMuted, textAlign: "center", margin: 0 }}>
              Ajoute des données cette semaine pour débloquer ton bilan.
            </p>
          )}
        </div>
      </Card>

      {monthStats && (
        <Card>
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
            <SectionTitle>Bilan mensuel — {monthStats.monthKey}</SectionTitle>
            <span style={{ fontSize: 11, color: COLORS.textFaint }}>
              {monthStats.workoutsCount} séance{monthStats.workoutsCount > 1 ? "s" : ""}
            </span>
          </div>
          {enGenerationMensuelle ? (
            <p style={styleAttente}>
              <Loader2 size={16} /> Génération du bilan mensuel...
            </p>
          ) : (
            bilanMensuelCourant && (
              <div style={{ marginBottom: 16 }}>
                <BilanSections sections={bilanMensuelCourant.sections} />
              </div>
            )
          )}

          {erreurGenerationMensuelle && <p style={styleErreur}>{erreurGenerationMensuelle}</p>}

          {iaDisponible && (
            <div style={{ textAlign: "center" }}>
              <Btn icon={Sparkles} onClick={onGenerateMonthly} disabled={enGenerationMensuelle}>
                {bilanMensuelCourant ? "Régénérer" : "Générer le bilan mensuel"}
              </Btn>
            </div>
          )}
        </Card>
      )}

      {/*
       * Calories : COURBE. C'est une grandeur continue dont on suit la
       * tendance. Les trois suivantes se cumulent sur la semaine et se
       * lisent mieux en barres.
       */}
      <CarteGraphique titre="Calories moyennes / semaine">
        <Courbe data={points("calories")} color={COLORS.gold} refY={targets?.calories || null} />
      </CarteGraphique>

      <CarteGraphique titre="Sommeil / semaine">
        <Histogramme data={points("sleep")} color={COLORS.gold} refY={profile.targetSleepHours || null} />
      </CarteGraphique>

      <CarteGraphique titre="Hydratation / semaine (L/jour)">
        <Histogramme data={points("water")} color={COLORS.blue} refY={profile.targetWaterL || null} />
      </CarteGraphique>

      <CarteGraphique titre="Pas / semaine (moyenne/jour)">
        <Histogramme data={points("steps")} color={COLORS.gold} refY={profile.targetSteps || null} />
      </CarteGraphique>

      <CarteGraphique titre="Poids">
        <Courbe data={seriePoids} color={COLORS.gold} />
      </CarteGraphique>

      <CarteGraphique titre="Muscle (masse maigre)">
        <Courbe data={serieMuscle} color={COLORS.amber} />
      </CarteGraphique>
    </div>
  );
}
