/**
 * « Repère d'après tes données » (lib/nutrition-perso.js), repris de la
 * carte « Mes objectifs sur mesure » de l'app Neiram le 24/10/2026.
 *
 * DIFFERENCE ESSENTIELLE AVEC L'APP GRAND PUBLIC : ici, le coach fixe les
 * objectifs. La carte n'a donc AUCUN bouton qui les applique, et elle
 * n'ecrit jamais dans le profil :
 *  - les reponses du questionnaire vont dans cn_objectifs_sur_mesure
 *    (enregistrerReglagesSurMesure), que computeTargets ne lit pas ;
 *  - le calcul (ciblesPersonnalisees) tourne sur une copie du profil et ne
 *    sert qu'a l'affichage du repere.
 * Les donnees de sante (grossesse, trouble alimentaire, rein, diabete,
 * tension) restent sur le telephone : ni synchro, ni bilan, ni IA.
 *
 * Tout est inclus pour les clients du coach : pas de verrou Premium.
 */

import { useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import { CONTRAINTES_SANTE, ciblesPersonnalisees, explicationCibles, profilPourRepere, RYTHMES, SITUATIONS } from "../lib/nutrition-perso.js";
import { apresPesee, categoriesPour, FEDERATIONS, PESEES } from "../lib/categorie-poids.js";
import { TEXTES_NUTRITION_PERSO as T } from "../lib/textes-nutrition-perso.js";
import { Btn, Card, Field, NumberInput, SectionTitle, SelectInput, TextInput } from "./primitives.jsx";

const styleCase = {
  width: 17,
  height: 17,
  accentColor: COLORS.gold,
  flexShrink: 0
};
const styleEntete = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8
};
const styleIntro = {
  fontSize: 12,
  color: COLORS.textMuted,
  margin: "6px 0 0",
  lineHeight: 1.5
};
const styleRepere = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px dashed ${COLORS.border}`,
  background: COLORS.bgAlt
};
const styleRepereChiffres = {
  fontFamily: "IBM Plex Mono",
  fontSize: 13,
  color: COLORS.text
};
const styleRepereDetail = {
  fontSize: 11.5,
  color: COLORS.textMuted,
  marginTop: 4,
  lineHeight: 1.45
};
const styleAlerte = {
  fontSize: 12,
  color: COLORS.warn,
  margin: "4px 0",
  lineHeight: 1.45
};
const styleLigneCase = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  marginBottom: 8,
  cursor: "pointer"
};
const styleLibelleCase = {
  fontSize: 12.5,
  color: COLORS.text
};
const styleDetailCase = {
  display: "block",
  fontSize: 11,
  color: COLORS.textFaint
};
const styleIntertitre = {
  fontSize: 11.5,
  fontWeight: 600,
  color: COLORS.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  margin: "4px 0 6px"
};
const styleNote = {
  fontSize: 11,
  color: COLORS.textFaint,
  margin: "0 0 12px",
  lineHeight: 1.45
};
const styleDeuxColonnes = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10
};
const styleTroisColonnes = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 8
};
const styleResume = {
  fontSize: 11.5,
  color: COLORS.gold,
  cursor: "pointer"
};
const styleListe = {
  margin: "6px 0 0",
  paddingLeft: 18
};
const styleLigneListe = {
  fontSize: 11.5,
  color: COLORS.textMuted,
  lineHeight: 1.5
};
const stylePied = {
  fontSize: 10.5,
  color: COLORS.textFaint,
  margin: "6px 0 0",
  lineHeight: 1.45
};

function sensDe(profile) {
  if (profile.goal === "perte" || (profile.goal === "performance" && profile.performanceDirection === "perte")) return "perte";
  if (profile.goal === "prise" || (profile.goal === "performance" && profile.performanceDirection === "prise")) return "prise";
  return null;
}

/** Une case a cocher avec son libelle et, au besoin, une precision. */
function Case({ coche, onChange, libelle, detail, ...attributs }) {
  return (
    <label style={styleLigneCase}>
      <input type="checkbox" style={styleCase} checked={coche} onChange={(e) => onChange(e.target.checked)} {...attributs} />
      <span style={styleLibelleCase}>
        {libelle}
        {detail ? <span style={styleDetailCase}>{detail}</span> : null}
      </span>
    </label>
  );
}

/** Force athletique, halterophilie, sports de combat : atteindre sa categorie (lib/categorie-poids.js). */
function BlocCategorie({ reglages, plan, maj }) {
  const c = reglages.categoriePoids || {};
  const majCat = (correctif) => maj({ categoriePoids: { ...c, ...correctif } });
  const categories = categoriesPour(c.federation, reglages.sexe);
  return (
    <div data-categorie-poids style={{ marginBottom: 14 }}>
      <Case data-categorie-case coche={!!c.actif} onChange={(v) => majCat({ actif: v })} libelle={T.categorieCase} />
      {c.actif && (
        <>
          <Field label={T.federation}>
            <SelectInput
              data-federation
              options={FEDERATIONS}
              value={c.federation || "libre"}
              onChange={(e) => majCat({ federation: e.target.value, limiteKg: null })}
            />
          </Field>
          <div style={styleDeuxColonnes}>
            <Field label={T.limite}>
              {categories.length ? (
                <SelectInput
                  data-limite-kg
                  options={[{ id: "", label: T.aucuneLimite }, ...categories.map((k) => ({ id: String(k), label: T.libelleLimite(k) }))]}
                  value={c.limiteKg ? String(c.limiteKg) : ""}
                  onChange={(e) => majCat({ limiteKg: Number(e.target.value) || null })}
                />
              ) : (
                <NumberInput
                  data-limite-kg
                  min="30"
                  max="200"
                  step="0.1"
                  placeholder={T.exempleLimite}
                  value={c.limiteKg ?? ""}
                  onChange={(e) => majCat({ limiteKg: Number(e.target.value) || null })}
                />
              )}
            </Field>
            <Field label={T.datePesee}>
              <TextInput type="date" data-date-pesee value={c.date || ""} onChange={(e) => majCat({ date: e.target.value })} />
            </Field>
          </div>
          <Field label={T.pesee}>
            <SelectInput options={PESEES} value={c.pesee || "veille"} onChange={(e) => majCat({ pesee: e.target.value })} />
          </Field>
          {plan && (
            <div data-plan-categorie={plan.statut} style={{ ...styleRepereDetail, color: plan.statut === "trop-rapide" ? COLORS.warn : COLORS.text }}>
              {plan.messages.map((m) => (
                <p key={m} style={{ margin: "0 0 6px" }}>
                  {m}
                </p>
              ))}
              <p style={{ margin: 0, color: COLORS.textMuted }}>{apresPesee(c.pesee)}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Proteines en g/kg, lipides en %, ou les trois macros en grammes. */
function BlocMacros({ reglages, maj }) {
  const perso = reglages.macrosPerso || {};
  const majPerso = (correctif) => maj({ macrosPerso: { ...perso, ...correctif } });
  return (
    <div data-macros-perso>
      <Field label={T.mode}>
        <SelectInput options={T.modes} value={perso.mode || ""} onChange={(e) => majPerso({ mode: e.target.value })} />
      </Field>
      {perso.mode === "grammes" ? (
        <div style={styleTroisColonnes}>
          {[
            ["p", T.proteinesG],
            ["g", T.glucidesG],
            ["l", T.lipidesG]
          ].map(([k, l]) => (
            <Field key={k} label={l}>
              <NumberInput min="0" max="1000" value={perso[k] ?? ""} onChange={(e) => majPerso({ [k]: e.target.value })} />
            </Field>
          ))}
        </div>
      ) : (
        <div style={styleDeuxColonnes}>
          <Field label={T.proteinesGKg}>
            <NumberInput
              data-proteines-gkg
              min="0.8"
              max="3"
              step="0.1"
              placeholder={T.auto}
              value={perso.proteinesGKg ?? ""}
              onChange={(e) => majPerso({ proteinesGKg: e.target.value })}
            />
          </Field>
          <Field label={T.lipidesPct}>
            <NumberInput
              min="20"
              max="45"
              step="1"
              placeholder={T.auto}
              value={perso.lipidesPct ?? ""}
              onChange={(e) => majPerso({ lipidesPct: e.target.value })}
            />
          </Field>
        </div>
      )}
      <Case
        data-cyclage
        coche={!!reglages.cyclageGlucides}
        onChange={(v) => maj({ cyclageGlucides: v })}
        libelle={T.cyclage}
        detail={T.cyclageDetail}
      />
    </div>
  );
}

/**
 * `targets` : les objectifs du coach (computeTargets, App.jsx), lus pour
 * l'ecart affiche et jamais modifies. `currentWeight`, `bodyLogs`,
 * `seances` et `seancePrevue` nourrissent le calcul du repere.
 * `reglages` / `onReglages` : les reponses du questionnaire, gardees par
 * l'ecran Nutrition (cn_objectifs_sur_mesure) et partagees avec la carte
 * des complements.
 */
export function CarteObjectifsSurMesure({ profile, targets, currentWeight, bodyLogs, seances, seancePrevue, reglages, onReglages }) {
  const [ouvert, setOuvert] = useState(false);
  const maj = (correctif) => onReglages({ ...reglages, ...correctif });

  const repere = useMemo(
    () =>
      ciblesPersonnalisees(profilPourRepere(profile, reglages), currentWeight, {
        bodyLogs,
        seances,
        aujourdhui: todayISO(),
        seancePrevue: !!seancePrevue
      }),
    [profile, reglages, currentWeight, bodyLogs, seances, seancePrevue]
  );

  const sens = sensDe(profile);
  const contraintes = Array.isArray(reglages.contraintesSante) ? reglages.contraintesSante : [];
  const lignes = explicationCibles(repere);
  const alertes = repere?.details?.alertes || [];
  const ecart = T.ecartCoach(repere, targets);

  return (
    <Card>
      <div data-objectifs-sur-mesure data-repere>
        <div style={styleEntete}>
          <SectionTitle>{T.titre}</SectionTitle>
          <Btn variant="ghost" onClick={() => setOuvert(!ouvert)}>
            {ouvert ? T.fermer : T.personnaliser}
          </Btn>
        </div>
        <p data-repere-intro style={styleIntro}>
          {T.intro}
        </p>

        {repere && repere.calories ? (
          <div style={styleRepere}>
            <div data-repere-calories={repere.calories} style={styleRepereChiffres}>
              {T.ligneRepere(repere)}
            </div>
            <div style={styleRepereDetail}>{T.ligneReperesJour(repere)}</div>
            {ecart && (
              <div data-ecart-coach style={styleRepereDetail}>
                {ecart}
              </div>
            )}
          </div>
        ) : (
          <p style={styleIntro}>{T.sansDonnees}</p>
        )}

        {alertes.length > 0 && (
          <div data-alertes-nutrition style={{ marginTop: 6 }}>
            {alertes.map((a) => (
              <p key={a} style={styleAlerte}>
                {T.alerte(a)}
              </p>
            ))}
          </div>
        )}

        {!ouvert ? (
          <p style={styleIntro}>{T.resume}</p>
        ) : (
          <div data-questionnaire style={{ marginTop: 10 }}>
            {sens && (
              <Field label={sens === "perte" ? T.rythmePerte : T.rythmePrise}>
                <SelectInput
                  data-rythme
                  options={[{ id: "", label: T.rythmeAuto }, ...RYTHMES[sens].map((r) => ({ id: String(r.id), label: r.label }))]}
                  value={reglages.rythmePct ? String(reglages.rythmePct) : ""}
                  onChange={(e) => maj({ rythmePct: e.target.value ? Number(e.target.value) : null })}
                />
              </Field>
            )}
            {profile.sex !== "homme" && (
              <Field label={T.situation}>
                <SelectInput data-situation options={SITUATIONS} value={reglages.situation || ""} onChange={(e) => maj({ situation: e.target.value })} />
              </Field>
            )}
            <div style={styleIntertitre}>{T.sante}</div>
            {CONTRAINTES_SANTE.map((c) => (
              <Case
                key={c.id}
                data-sante={c.id}
                coche={contraintes.includes(c.id)}
                onChange={(v) => maj({ contraintesSante: v ? [...contraintes, c.id] : contraintes.filter((x) => x !== c.id) })}
                libelle={c.label}
                detail={c.detail}
              />
            ))}
            <p style={styleNote}>{T.noteMasseGrasse}</p>

            <div style={styleIntertitre}>{T.titreCategorie}</div>
            <BlocCategorie reglages={{ ...reglages, sexe: profile.sex }} plan={repere?.details?.categorie} maj={maj} />

            <div style={styleIntertitre}>{T.titreMacros}</div>
            <BlocMacros reglages={reglages} maj={maj} />
            <p data-local style={styleNote}>
              {T.local}
            </p>
          </div>
        )}

        {lignes.length > 0 && (
          <details style={{ marginTop: 10 }}>
            <summary style={styleResume}>{T.commentCalcule}</summary>
            <ul data-explication-cibles style={styleListe}>
              {lignes.map((l) => (
                <li key={l} style={styleLigneListe}>
                  {l}
                </li>
              ))}
            </ul>
            <p style={stylePied}>{T.avertissement}</p>
          </details>
        )}
      </div>
    </Card>
  );
}
