/**
 * Ecran Journal — vue du jour.
 *
 * Portage de JournalTab (index.html, ligne 2331), sans le sélecteur de
 * repas ni l'enregistrement des repas types, qui suivront.
 *
 * C'est l'ecran le plus utilise de l'application : le client l'ouvre
 * plusieurs fois par jour. Tout y est saisi au fil de l'eau et enregistre
 * immediatement — il n'y a pas de bouton « valider », parce que personne
 * ne pense a l'appuyer avant de fermer son telephone.
 */

import { useMemo, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { num, todayISO } from "../lib/dates.js";
import { getMonday } from "../lib/semaine.js";
import { SECTIONS_REPAS } from "../lib/onglets.js";
import { composantesDuScore, fmtL, libelleDuScore, scoreDuJour, totauxDuJour } from "../lib/score-jour.js";
import { choisirSuggestions } from "../lib/suggestions.js";
import { construireMotivation, serieDeJours } from "../lib/motivation.js";
import { dureeDeSommeil } from "../lib/sommeil.js";
import {
  Card,
  DateNav,
  Field,
  IconBtn,
  MiniBar,
  MotivationCard,
  NumberInput,
  ProgressRing,
  ScaleField,
  SectionTitle,
  TextArea,
  TextInput
} from "../ui/primitives.jsx";
import { ChevronLeft, ChevronRight, Droplet, Flame, Footprints, Plus, Star, Trash2 } from "../ui/icones.jsx";

/**
 * Volumes proposes en un geste, en millilitres.
 *
 * Ce sont des contenants reels : un verre, une canette, une petite
 * bouteille, une grande. Proposer « +100 ml » obligerait a compter.
 */
const VOLUMES_ML = [250, 330, 500, 750];

/** En deca, proposer une collation n'a pas de sens. */
const SEUIL_SUGGESTIONS_KCAL = 150;

const styleSousTitre = {
  fontSize: 11,
  fontWeight: 600,
  color: COLORS.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 8
};

export function Journal({ logEntriesApi, bodyApi, formApi, sessionsApi, targets, profile, onToast, onOuvrirAjout, onEnregistrerRepas }) {
  const [date, setDate] = useState(todayISO());

  const entreesDuJour = logEntriesApi.items.filter((e) => e.date === date);
  const totaux = totauxDuJour(entreesDuJour);
  const corps = bodyApi.getForDate(date) || {};
  const form = formApi.getForDate(date) || {};

  const composantes = composantesDuScore({
    journalDuJour: form,
    entreesDuJour,
    totaux,
    profil: profile,
    objectifs: targets,
    seances: sessionsApi.items,
    date
  });
  const score = scoreDuJour(composantes);

  const eauMl = form.waterMl || 0;
  const eauObjectifMl = (profile.targetWaterL || 2) * 1e3;
  const pas = form.steps || 0;
  const pasObjectif = profile.targetSteps || 8000;

  /**
   * Ajout d'eau. Le message n'apparait que pour la journee en cours :
   * feliciter quelqu'un qui corrige sa saisie d'avant-hier n'a pas de sens.
   */
  const ajouterEau = async (deltaMl) => {
    const suivant = Math.max(0, eauMl + deltaMl);
    await formApi.upsert(date, { waterMl: suivant });
    if (deltaMl > 0 && date === todayISO() && onToast) {
      const reste = eauObjectifMl - suivant;
      onToast(
        reste > 0
          ? `Hydratation : ${fmtL(suivant)} / ${fmtL(eauObjectifMl)} — il te reste ${fmtL(reste)} à boire aujourd'hui.`
          : `Objectif hydratation atteint : ${fmtL(suivant)} / ${fmtL(eauObjectifMl)} 💪`
      );
    }
  };

  // Les suggestions ne concernent que la journee en cours : proposer une
  // collation pour rattraper hier soir n'aurait aucun sens.
  const restantAujourdhui = useMemo(() => {
    if (!targets?.calories || date !== todayISO()) return null;
    return {
      kcal: targets.calories - totaux.calories,
      p: Math.max(0, (targets.protein || 0) - totaux.protein),
      c: Math.max(0, (targets.carbs || 0) - totaux.carbs),
      f: Math.max(0, (targets.fat || 0) - totaux.fat)
    };
  }, [targets, totaux.calories, totaux.protein, totaux.carbs, totaux.fat, date]);

  // La graine change toutes les heures, pas a chaque rendu : sinon les
  // suggestions sauteraient sous les doigts du client pendant qu'il lit.
  const graineHoraire = Math.floor(Date.now() / 36e5);

  const suggestions = useMemo(() => {
    if (!restantAujourdhui || restantAujourdhui.kcal < SEUIL_SUGGESTIONS_KCAL) return [];
    return choisirSuggestions(restantAujourdhui, profile, 3);
  }, [restantAujourdhui ? Math.round(restantAujourdhui.kcal / 50) : null, profile.dietType, (profile.allergies || []).join(",")]);

  const motivation = useMemo(() => {
    if (date !== todayISO()) return null;
    const lundi = getMonday(date);
    const seancesFaites = sessionsApi.items.filter((s) => s.date >= lundi && s.date <= date).length;
    const objectifSeances = profile.weeklyWorkoutTarget || 0;

    return construireMotivation({
      sessions: {
        target: objectifSeances,
        done: seancesFaites,
        left: Math.max(0, objectifSeances - seancesFaites)
      },
      proteinLeft: targets?.protein ? targets.protein - totaux.protein : null,
      proteinDone: totaux.protein,
      proteinTarget: targets?.protein || 0,
      waterLeftMl: eauObjectifMl - eauMl,
      stepsLeft: pasObjectif - pas,
      stepsDone: pas,
      stepsTarget: pasObjectif,
      streakDays: serieDeJours({
        date,
        repas: logEntriesApi.items,
        journal: formApi.items,
        seances: sessionsApi.items
      }),
      weightGapKg:
        profile.targetWeightKg && corps.weightKg != null
          ? Math.abs(corps.weightKg - profile.targetWeightKg)
          : null,
      emptyToday: entreesDuJour.length === 0 && !form.sleepHours && !form.energy,
      hour: new Date().getHours(),
      seed: graineHoraire
    });
  }, [date, totaux.protein, eauMl, pas, corps.weightKg, entreesDuJour.length, graineHoraire]);

  const majSommeil = (champ) => (e) => {
    const valeur = e.target.value || null;
    const heures = {
      bedTime: dureeDeSommeil(valeur, form.wakeTime),
      wakeTime: dureeDeSommeil(form.bedTime, valeur)
    }[champ];
    formApi.upsert(date, { [champ]: valeur, sleepHours: heures });
  };

  const objectif = (valeur) => (valeur != null ? valeur : "—");

  return (
    <div>
      <DateNav date={date} onChange={setDate} iconePrecedent={ChevronLeft} iconeSuivant={ChevronRight} />

      <MotivationCard text={motivation} icone={Flame} />

      {score != null && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <ProgressRing value={score} size={96} stroke={9} label={libelleDuScore(score)} />
            <div style={{ flex: 1, minWidth: 160 }}>
              {composantes.map((p) => (
                <MiniBar key={p.key} label={p.label} pct={p.value} valueLabel={`${Math.round(p.value)}%`} />
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <SectionTitle>Nutrition — mes repas du jour</SectionTitle>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginTop: 12,
            marginBottom: 14
          }}
        >
          <div>
            <span style={{ fontFamily: POLICES.titre, fontSize: 25, fontWeight: 600, color: COLORS.text }}>
              {Math.round(totaux.calories)}
            </span>
            <span style={{ fontSize: 13, color: COLORS.textMuted }}>
              {" / "}
              {objectif(targets?.calories)} kcal
            </span>
          </div>
          <span style={{ fontSize: 11.5, color: COLORS.textFaint }}>
            {entreesDuJour.length} aliment{entreesDuJour.length > 1 ? "s" : ""}
          </span>
        </div>

        <MiniBar
          label="Protéines"
          pct={targets?.protein ? (totaux.protein / targets.protein) * 100 : 0}
          valueLabel={`${Math.round(totaux.protein)} / ${objectif(targets?.protein)} g`}
          color={COLORS.gold}
        />
        <MiniBar
          label="Glucides"
          pct={targets?.carbs ? (totaux.carbs / targets.carbs) * 100 : 0}
          valueLabel={`${Math.round(totaux.carbs)} / ${objectif(targets?.carbs)} g`}
          color={COLORS.blue}
        />
        <MiniBar
          label="Lipides"
          pct={targets?.fat ? (totaux.fat / targets.fat) * 100 : 0}
          valueLabel={`${Math.round(totaux.fat)} / ${objectif(targets?.fat)} g`}
          color={COLORS.orange}
        />

        {suggestions.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
            <div style={styleSousTitre}>
              Pour compléter ta journée — reste {Math.round(restantAujourdhui.kcal)} kcal (P{" "}
              {Math.round(restantAujourdhui.p)} · G {Math.round(restantAujourdhui.c)} · L{" "}
              {Math.round(restantAujourdhui.f)})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {suggestions.map((it, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    background: COLORS.bgAlt,
                    borderRadius: 8,
                    padding: "8px 10px"
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: COLORS.text }}>{it.name}</div>
                    <div style={{ fontSize: 10, color: COLORS.textFaint, fontFamily: "IBM Plex Mono" }}>
                      {it.kcal} kcal · P{it.p} G{it.c} L{it.f}
                    </div>
                  </div>
                  <button
                    onClick={() => onOuvrirAjout?.({ suggestion: it, date })}
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "none",
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      padding: "5px 10px",
                      color: COLORS.gold,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <Plus size={12} />
                    Ajouter
                  </button>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 9.5, color: COLORS.textFaint, margin: "8px 0 0" }}>
              Suggestions filtrées selon ton régime et tes allergies (réglables dans le profil).
            </p>
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {SECTIONS_REPAS.map((section) => {
            const items = entreesDuJour.filter((e) => e.mealType === section.id);
            return (
              <div key={section.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                    {section.icon} {section.label}
                  </span>
                  <button
                    onClick={() => onOuvrirAjout?.({ mealType: section.id, date })}
                    style={{
                      background: "none",
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      padding: "4px 10px",
                      color: COLORS.gold,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    + ajouter
                  </button>
                </div>

                {items.length === 0 ? (
                  <p style={{ fontSize: 12, color: COLORS.textFaint, margin: 0 }}>Rien enregistré.</p>
                ) : (
                  <>
                    <button
                      onClick={() => onEnregistrerRepas?.({ mealType: section.id, name: section.label, portions: "1" })}
                      style={{
                        background: "none",
                        border: "none",
                        padding: "0 0 6px",
                        color: COLORS.gold,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5
                      }}
                    >
                      <Star size={11} />
                      Enregistrer ce repas
                    </button>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {items.map((it) => (
                        <div
                          key={it.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: COLORS.bgAlt,
                            borderRadius: 8,
                            padding: "8px 10px"
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 12.5, color: COLORS.text }}>{it.name}</div>
                            <div style={{ fontSize: 10, color: COLORS.textFaint, fontFamily: "IBM Plex Mono" }}>
                              {Math.round(num(it.calories))} kcal · P{num(it.protein)} G{num(it.carbs)} L
                              {num(it.fat)}
                            </div>
                          </div>
                          <IconBtn danger onClick={() => logEntriesApi.remove(it.id)}>
                            <Trash2 size={14} />
                          </IconBtn>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle>Hydratation</SectionTitle>
          <span
            style={{
              fontFamily: POLICES.titre,
              fontSize: 15,
              fontWeight: 700,
              color: eauMl >= eauObjectifMl ? COLORS.good : COLORS.text
            }}
          >
            {fmtL(eauMl)}{" "}
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 500 }}>/ {fmtL(eauObjectifMl)}</span>
          </span>
        </div>

        <div style={{ marginTop: 12 }}>
          <MiniBar
            label={eauMl >= eauObjectifMl ? "Objectif atteint 💪" : `Reste ${fmtL(eauObjectifMl - eauMl)}`}
            pct={eauObjectifMl ? (eauMl / eauObjectifMl) * 100 : 0}
            valueLabel={`${Math.round(eauObjectifMl ? (eauMl / eauObjectifMl) * 100 : 0)}%`}
            color={COLORS.blue}
          />
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 6 }}>
          {VOLUMES_ML.map((ml) => (
            <button
              key={ml}
              onClick={() => ajouterEau(ml)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "8px 12px",
                borderRadius: 9,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.bgAlt,
                color: COLORS.text,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Droplet size={13} color={COLORS.blue} />+{ml} ml
            </button>
          ))}
          <button
            onClick={() => ajouterEau(-250)}
            disabled={eauMl <= 0}
            style={{
              padding: "8px 12px",
              borderRadius: 9,
              border: `1px solid ${COLORS.border}`,
              background: "transparent",
              color: COLORS.textMuted,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: eauMl <= 0 ? "default" : "pointer",
              opacity: eauMl <= 0 ? 0.4 : 1
            }}
          >
            −250 ml
          </button>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle>Activité — pas du jour</SectionTitle>
          <span style={{ fontSize: 11.5, color: COLORS.textFaint }}>
            obj. {pasObjectif.toLocaleString("fr-FR")}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <Footprints size={20} color={COLORS.gold} style={{ flexShrink: 0 }} />
          <NumberInput
            step="500"
            placeholder="Nombre de pas"
            value={form.steps ?? ""}
            onChange={(e) => formApi.upsert(date, { steps: e.target.value ? parseInt(e.target.value) : null })}
            style={{ flex: 1 }}
          />
        </div>

        {pas > 0 && (
          <div style={{ marginTop: 10 }}>
            <MiniBar
              label={
                pas >= pasObjectif
                  ? "Objectif atteint 💪"
                  : `Reste ${(pasObjectif - pas).toLocaleString("fr-FR")} pas`
              }
              pct={(pas / pasObjectif) * 100}
              valueLabel={`${Math.round((pas / pasObjectif) * 100)}%`}
              color={COLORS.gold}
            />
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <SectionTitle>Corps &amp; composition</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
          <Field label="Poids (kg)">
            <NumberInput
              step="0.1"
              value={corps.weightKg ?? ""}
              onChange={(e) => bodyApi.upsert(date, { weightKg: e.target.value === "" ? null : num(e.target.value) })}
            />
          </Field>
          <Field label="Masse grasse (%)">
            <NumberInput
              step="0.1"
              value={corps.bodyFatPct ?? ""}
              onChange={(e) => bodyApi.upsert(date, { bodyFatPct: e.target.value === "" ? null : num(e.target.value) })}
            />
          </Field>
          <Field label="Muscle (kg)">
            <NumberInput
              step="0.1"
              value={corps.muscleKg ?? ""}
              onChange={(e) => bodyApi.upsert(date, { muscleKg: e.target.value === "" ? null : num(e.target.value) })}
            />
          </Field>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <SectionTitle>Sommeil &amp; forme</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <Field label="Coucher">
            <TextInput type="time" value={form.bedTime ?? ""} onChange={majSommeil("bedTime")} />
          </Field>
          <Field label="Lever">
            <TextInput type="time" value={form.wakeTime ?? ""} onChange={majSommeil("wakeTime")} />
          </Field>
        </div>

        {form.sleepHours != null && (
          <p
            style={{
              fontSize: 12.5,
              color: COLORS.gold,
              fontFamily: "IBM Plex Mono",
              margin: "0 0 12px",
              fontWeight: 600
            }}
          >
            = {form.sleepHours} h de sommeil
          </p>
        )}

        <ScaleField
          label="Qualité du sommeil"
          max={5}
          value={form.sleepQuality}
          onChange={(v) => formApi.upsert(date, { sleepQuality: v })}
        />

        <Field label="Pourquoi bien / mal dormi ? (optionnel)">
          <TextArea
            rows={2}
            placeholder="Ex : couché tard, réveils, café tardif, sport le soir..."
            value={form.sleepNote ?? ""}
            onChange={(e) => formApi.upsert(date, { sleepNote: e.target.value || null })}
          />
        </Field>

        <ScaleField label="Énergie" max={5} value={form.energy} onChange={(v) => formApi.upsert(date, { energy: v })} />
        <ScaleField label="Stress" max={10} value={form.stress} onChange={(v) => formApi.upsert(date, { stress: v })} />

        <Field label="Raison du stress (optionnel)">
          <TextArea
            rows={2}
            placeholder="Ex : deadline au travail, examen, conflit, fatigue..."
            value={form.stressNote ?? ""}
            onChange={(e) => formApi.upsert(date, { stressNote: e.target.value || null })}
          />
        </Field>
      </Card>
    </div>
  );
}
