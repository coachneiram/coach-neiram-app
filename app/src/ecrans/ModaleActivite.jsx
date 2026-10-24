/**
 * « Ajouter une activité » : tout ce qui n'est pas de la musculation
 * (course, vélo, natation, sports collectifs, raquettes, combat, cours en
 * salle, plein air, mobilité, vie active). Repris de l'app Neiram le
 * 24/10/2026. Catalogue et calculs : lib/activites.js ; textes et règles
 * de coaching : lib/textes-sports.js.
 */

import { useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import {
  activiteParId,
  allure,
  champsDetails,
  champVisible,
  CLE_SPORTS_PERSO,
  creerSportPerso,
  definirSportsPerso,
  EMOJIS_PERSO,
  INTENSITES_PERSO,
  lireSportsPerso,
  chargeSRPE,
  chercherActivites,
  FAMILLES_ACTIVITE,
  intensite,
  kcalActivite,
  LIBELLES_INTENSITE,
  seanceActivite
} from "../lib/activites.js";
import { TEXTES_SPORTS as T } from "../lib/textes-sports.js";
import { Btn, Field, Modal, NumberInput, ScaleField, SelectInput, TextArea, TextInput } from "../ui/primitives.jsx";
import { X } from "../ui/icones.jsx";
import { enregistrer } from "../lib/stockage.js";

const puce = (actif) => ({
  border: `1px solid ${actif ? COLORS.gold : COLORS.border}`,
  background: actif ? `${COLORS.gold}22` : COLORS.bgAlt,
  color: actif ? COLORS.gold : COLORS.textMuted,
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap"
});
const styleSport = {
  textAlign: "left",
  border: `1px solid ${COLORS.border}`,
  background: COLORS.bgAlt,
  color: COLORS.text,
  borderRadius: 12,
  padding: "10px 10px",
  fontSize: 13,
  cursor: "pointer"
};
const grilleSports = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  maxHeight: 340,
  overflowY: "auto",
  gap: 8
};
const ligneFlex = { display: "flex", flexWrap: "wrap", gap: 6 };
const ligneDefilante = { display: "flex", overflowX: "auto", paddingBottom: 6, marginBottom: 10, gap: 6 };
const deuxColonnes = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };
const styleCases = { display: "flex", flexWrap: "wrap", fontSize: 12.5, color: COLORS.textMuted, marginBottom: 12, gap: 12 };
const styleCase = { display: "flex", alignItems: "center", gap: 5 };
const styleNote = { fontSize: 10.5, color: COLORS.textFaint, marginTop: 10, lineHeight: 1.4 };

/** Saisie de depart depuis une seance existante (modification). */
function saisieDepuis(seance) {
  const a = (seance && seance.activite) || {};
  return {
    id: a.id || "",
    duree: a.duree || seance?.durationMin || "",
    rpe: a.rpe || "",
    distanceKm: a.distanceKm || "",
    denivele: a.denivele || "",
    fcMoy: a.fcMoy || "",
    details: { ...(a.details || {}) },
    notes: seance?.notes || ""
  };
}

export function ModaleActivite({ open, onClose, seance, seances, poidsKg, onEnregistrer }) {
  const [saisie, setSaisie] = useState(() => saisieDepuis(seance));
  const [date, setDate] = useState(() => seance?.date || todayISO());
  const [recherche, setRecherche] = useState("");
  const [famille, setFamille] = useState(null);
  const [etaitOuverte, setEtaitOuverte] = useState(open);
  const [creation, setCreation] = useState(null);

  // Chaque ouverture repart de la seance passee (modification, programme)
  // ou d'une saisie vide.
  if (open !== etaitOuverte) {
    setEtaitOuverte(open);
    if (open) {
      setSaisie(saisieDepuis(seance));
      setDate(seance?.date || todayISO());
    }
  }

  const sport = activiteParId(saisie.id);
  const maj = (correctif) => setSaisie((s) => ({ ...s, ...correctif }));
  const enregistrerSportsPerso = (liste) => {
    const propres = definirSportsPerso(liste);
    enregistrer(CLE_SPORTS_PERSO, propres);
    return propres;
  };
  const creerSport = () => {
    const nouveau = creerSportPerso(creation);
    if (!nouveau) return;
    enregistrerSportsPerso([nouveau, ...lireSportsPerso()]);
    setCreation(null);
    maj({ id: nouveau.id, details: {} });
  };

  const recents = useMemo(() => {
    const vus = [];
    for (const s of [...(seances || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""))) {
      const id = s && s.activite && s.activite.id;
      if (id && !vus.includes(id) && activiteParId(id)) vus.push(id);
      if (vus.length >= 4) break;
    }
    return vus.map(activiteParId);
  }, [seances]);

  const liste = chercherActivites(recherche, famille);
  const apercu = sport
    ? [
        intensite(saisie) ? T.intensite(LIBELLES_INTENSITE[intensite(saisie)]) : null,
        allure(saisie),
        kcalActivite(saisie, poidsKg) ? T.kcal(kcalActivite(saisie, poidsKg)) : null,
        chargeSRPE(saisie.duree, saisie.rpe) ? T.charge(chargeSRPE(saisie.duree, saisie.rpe)) : null
      ].filter(Boolean)
    : [];
  const donnees = sport ? seanceActivite(saisie, { poidsKg, date, id: seance?.id }) : null;

  const fermer = () => {
    setCreation(null);
    setRecherche("");
    setFamille(null);
    onClose();
  };
  const majDetail = (cle, v) => maj({ details: { ...saisie.details, [cle]: v } });

  return (
    <Modal open={open} onClose={fermer} title={seance?.id ? T.titreModifier : T.titreAjouter} iconeFermer={X}>
      {!sport ? (
        <div data-choix-activite>
          <Field label={T.quelSport}>
            <TextInput placeholder={T.placeholderRecherche} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </Field>
          {!recherche && recents.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: COLORS.textFaint, marginBottom: 6 }}>{T.recents}</div>
              <div style={ligneFlex}>
                {recents.map((a) => (
                  <button key={a.id} style={puce(false)} onClick={() => maj({ id: a.id })}>
                    {a.emoji} {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={ligneDefilante}>
            <button style={puce(!famille)} onClick={() => setFamille(null)}>
              {T.tous}
            </button>
            {FAMILLES_ACTIVITE.map((f) => (
              <button key={f.id} style={puce(famille === f.id)} onClick={() => setFamille(famille === f.id ? null : f.id)}>
                {f.emoji} {f.label}
              </button>
            ))}
          </div>
          <div style={grilleSports}>
            {liste.map((a) => (
              <button key={a.id} data-activite={a.id} onClick={() => maj({ id: a.id })} style={styleSport}>
                <span style={{ marginRight: 6 }}>{a.emoji}</span>
                {a.label}
              </button>
            ))}
            {!liste.length && <p style={{ fontSize: 12.5, color: COLORS.textMuted }}>{T.aucunSport}</p>}
          </div>
          {!creation ? (
            <Btn
              variant="ghost"
              style={{ width: "100%", marginTop: 12 }}
              onClick={() => setCreation({ label: recherche, emoji: "✨", famille: famille || "quotidien", intensite: "moderee", champs: [], renfo: false })}
            >
              {T.creerSport}
            </Btn>
          ) : (
            <div data-creation-sport style={{ marginTop: 14, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
              <Field label={T.nomSport}>
                <TextInput placeholder={T.placeholderNomSport} maxLength={40} value={creation.label} onChange={(e) => setCreation({ ...creation, label: e.target.value })} />
              </Field>
              <div style={{ ...ligneFlex, marginBottom: 12 }}>
                {EMOJIS_PERSO.map((e) => (
                  <button key={e} aria-label={T.icone(e)} style={{ ...puce(creation.emoji === e), fontSize: 16, padding: "4px 8px" }} onClick={() => setCreation({ ...creation, emoji: e })}>
                    {e}
                  </button>
                ))}
              </div>
              <div style={deuxColonnes}>
                <Field label={T.famille}>
                  <SelectInput options={FAMILLES_ACTIVITE} value={creation.famille} onChange={(e) => setCreation({ ...creation, famille: e.target.value })} />
                </Field>
                <Field label={T.intensiteHabituelle}>
                  <SelectInput
                    options={Object.entries(INTENSITES_PERSO).map(([id, v]) => ({ id, label: v.label }))}
                    value={creation.intensite}
                    onChange={(e) => setCreation({ ...creation, intensite: e.target.value })}
                  />
                </Field>
              </div>
              <div style={styleCases}>
                {T.champsPerso.map(([c, l]) => (
                  <label key={c} style={styleCase}>
                    <input
                      type="checkbox"
                      checked={creation.champs.includes(c)}
                      onChange={(e) => setCreation({ ...creation, champs: e.target.checked ? [...creation.champs, c] : creation.champs.filter((x) => x !== c) })}
                    />
                    {l}
                  </label>
                ))}
                <label style={styleCase}>
                  <input type="checkbox" checked={creation.renfo} onChange={(e) => setCreation({ ...creation, renfo: e.target.checked })} />
                  {T.renforce}
                </label>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="ghost" onClick={() => setCreation(null)}>
                  {T.annuler}
                </Btn>
                <Btn style={{ flex: 1 }} disabled={!creerSportPerso(creation)} onClick={creerSport}>
                  {T.creerEtNoter}
                </Btn>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div data-saisie-activite={sport.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: 16, color: COLORS.text }}>
              {sport.emoji} {sport.label}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {sport.perso && (
                <Btn
                  variant="ghost"
                  onClick={() => {
                    if (!window.confirm(T.confirmerRetrait(sport.label))) return;
                    enregistrerSportsPerso(lireSportsPerso().filter((x) => x.id !== sport.id));
                    maj({ id: "" });
                  }}
                >
                  {T.retirer}
                </Btn>
              )}
              <Btn variant="ghost" onClick={() => maj({ id: "", details: {} })}>
                {T.changer}
              </Btn>
            </div>
          </div>
          <div style={deuxColonnes}>
            <Field label={T.date}>
              <TextInput type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={T.duree}>
              <NumberInput data-champ="duree" min="1" max="1440" placeholder="45" value={saisie.duree} onChange={(e) => maj({ duree: e.target.value })} />
            </Field>
            {sport.champs.includes("distance") && (
              <Field label={T.distance}>
                <NumberInput data-champ="distance" min="0" step="0.1" placeholder="—" value={saisie.distanceKm} onChange={(e) => maj({ distanceKm: e.target.value })} />
              </Field>
            )}
            {sport.champs.includes("denivele") && (
              <Field label={T.denivele}>
                <NumberInput min="0" step="10" placeholder="—" value={saisie.denivele} onChange={(e) => maj({ denivele: e.target.value })} />
              </Field>
            )}
            {sport.champs.includes("fc") && (
              <Field label={T.fc}>
                <NumberInput min="40" max="230" placeholder="—" value={saisie.fcMoy} onChange={(e) => maj({ fcMoy: e.target.value })} />
              </Field>
            )}
            {champsDetails(sport)
              .filter((c) => champVisible(c, saisie.details))
              .map((c) => (
                <Field key={c.cle} label={c.label}>
                  {c.type === "choix" ? (
                    <SelectInput
                      data-detail={c.cle}
                      options={[{ id: "", label: "—" }, ...c.options.map(([id, label]) => ({ id, label }))]}
                      value={saisie.details?.[c.cle] ?? ""}
                      onChange={(e) => majDetail(c.cle, e.target.value)}
                    />
                  ) : c.type === "nombre" ? (
                    <NumberInput data-detail={c.cle} min={c.min} max={c.max} placeholder="—" value={saisie.details?.[c.cle] ?? ""} onChange={(e) => majDetail(c.cle, e.target.value)} />
                  ) : (
                    <TextInput data-detail={c.cle} maxLength={80} placeholder={c.placeholder || ""} value={saisie.details?.[c.cle] ?? ""} onChange={(e) => majDetail(c.cle, e.target.value)} />
                  )}
                </Field>
              ))}
          </div>
          <ScaleField label={T.rpe} max={10} value={Number(saisie.rpe) || null} onChange={(n) => maj({ rpe: n })} />
          {saisie.rpe ? <p style={{ fontSize: 11.5, color: COLORS.textFaint, margin: "-8px 0 12px" }}>{T.rpeLibelle(saisie.rpe)}</p> : null}
          <Field label={T.notes}>
            <TextArea rows={2} placeholder={T.placeholderNotes} value={saisie.notes} onChange={(e) => maj({ notes: e.target.value })} />
          </Field>
          {apercu.length > 0 && (
            <p data-apercu-activite style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "IBM Plex Mono", margin: "0 0 12px" }}>
              {apercu.join(" · ")}
            </p>
          )}
          <Btn
            style={{ width: "100%" }}
            disabled={!donnees}
            onClick={async () => {
              if (!donnees) return;
              await onEnregistrer(donnees);
              fermer();
            }}
          >
            {donnees ? T.enregistrer : T.indiqueDuree}
          </Btn>
          <p style={styleNote}>{T.pourCoach}</p>
          <p style={styleNote}>{T.compendium}</p>
        </div>
      )}
    </Modal>
  );
}
