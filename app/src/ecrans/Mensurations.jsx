/**
 * Ecran Mensurations.
 *
 * Portage fidele de MensurationsTab (index.html, ligne 2834).
 *
 * Point delicat conserve tel quel : le poids n'appartient pas a la prise de
 * mesures, il vit dans le journal corporel. La fiche l'affiche et l'ecrit,
 * mais via bodyApi — sinon on aurait deux poids differents pour un meme jour
 * selon l'ecran consulte.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { fmtDateShort, fmtWeekShort, round, todayISO } from "../lib/dates.js";
import { MEASUREMENT_FIELDS, ecart, parDateCroissante } from "../lib/mensurations.js";
import { Btn, Card, EmptyState, Field, IconBtn, Modal, NumberInput, SectionTitle, TextInput } from "../ui/primitives.jsx";
import { Courbe } from "../ui/Courbe.jsx";
import { Pencil, Plus, Ruler, Trash2, X } from "../ui/icones.jsx";

export function Mensurations({ api, bodyApi }) {
  const [modalOuverte, setModalOuverte] = useState(false);
  const [edition, setEdition] = useState(null);
  const [champCourbe, setChampCourbe] = useState("taille");

  const triees = parDateCroissante(api.items);
  const derniere = triees.length ? triees[triees.length - 1] : null;
  const precedente = triees.length > 1 ? triees[triees.length - 2] : null;

  // Une nouvelle prise part des dernieres valeurs connues : on ne remesure
  // pas forcement tout a chaque fois, et repartir de zero ferait perdre les
  // mesures inchangees.
  const nouvelleP = () => {
    const base = { id: null, date: todayISO(), poids: "" };
    MEASUREMENT_FIELDS.forEach((f) => {
      base[f.id] = derniere?.[f.id] ?? "";
    });
    const corpsDuJour = bodyApi.getForDate(todayISO());
    if (corpsDuJour?.weightKg != null) base.poids = corpsDuJour.weightKg;
    setEdition(base);
    setModalOuverte(true);
  };

  const modifier = (m) => {
    const corpsCeJour = bodyApi.getForDate(m.date);
    setEdition({ ...m, poids: corpsCeJour?.weightKg ?? "" });
    setModalOuverte(true);
  };

  const enregistrer = async () => {
    const payload = { date: edition.date };
    MEASUREMENT_FIELDS.forEach((f) => {
      payload[f.id] = edition[f.id] === "" || edition[f.id] == null ? null : parseFloat(edition[f.id]);
    });
    if (edition.id) await api.update(edition.id, payload);
    else await api.add(payload);
    if (edition.poids !== "" && edition.poids != null) {
      await bodyApi.upsert(edition.date, { weightKg: parseFloat(edition.poids) });
    }
    setModalOuverte(false);
  };

  const donneesCourbe = triees
    .filter((m) => m[champCourbe] != null)
    .map((m) => ({ label: fmtWeekShort(m.date), value: m[champCourbe] }));
  const libelleCourbe = MEASUREMENT_FIELDS.find((f) => f.id === champCourbe)?.label;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle>Mensurations</SectionTitle>
        <Btn icon={Plus} onClick={nouvelleP}>
          Nouvelle prise
        </Btn>
      </div>

      {!derniere ? (
        <EmptyState
          icon={Ruler}
          message="Aucune mensuration enregistrée. Prends tes mesures (poitrine, taille, hanches, bras, cuisses, mollets) et suis leur évolution mois après mois."
          ctaLabel="Première prise de mesures"
          onCta={nouvelleP}
        />
      ) : (
        <>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>
                Dernière prise · {fmtDateShort(derniere.date)}
              </span>
              {precedente && (
                <span style={{ fontSize: 11, color: COLORS.textFaint }}>vs {fmtDateShort(precedente.date)}</span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 8 }}>
              {MEASUREMENT_FIELDS.map((f) => {
                const v = derniere[f.id];
                if (v == null) return null;
                const delta = ecart(v, precedente?.[f.id]);
                return (
                  <div
                    key={f.id}
                    style={{
                      background: COLORS.bgAlt,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      padding: "10px 12px"
                    }}
                  >
                    <div style={{ fontSize: 10.5, color: COLORS.textMuted }}>{f.label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 3 }}>
                      <span style={{ fontFamily: "Poppins", fontSize: 17, fontWeight: 700, color: COLORS.text }}>
                        {v}
                        <span style={{ fontSize: 10, color: COLORS.textMuted, marginLeft: 2 }}>cm</span>
                      </span>
                      {delta != null && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: delta === 0 ? COLORS.textFaint : COLORS.gold,
                            fontFamily: "IBM Plex Mono"
                          }}
                        >
                          {delta > 0 ? "+" : ""}
                          {delta}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {donneesCourbe.length > 1 && (
            <Card>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap"
                }}
              >
                <SectionTitle>Évolution — {libelleCourbe}</SectionTitle>
                <select
                  value={champCourbe}
                  onChange={(e) => setChampCourbe(e.target.value)}
                  style={{
                    background: COLORS.bgAlt,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    padding: "6px 10px",
                    color: COLORS.text,
                    fontSize: 12.5
                  }}
                >
                  {MEASUREMENT_FIELDS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginTop: 12 }}>
                <Courbe data={donneesCourbe} color={COLORS.gold} />
              </div>
            </Card>
          )}

          <Card>
            <SectionTitle>Historique</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {[...triees].reverse().map((m) => {
                const remplis = MEASUREMENT_FIELDS.filter((f) => m[f.id] != null);
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: COLORS.bgAlt,
                      borderRadius: 10,
                      padding: "10px 12px"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{fmtDateShort(m.date)}</div>
                      <div style={{ fontSize: 10.5, color: COLORS.textFaint, marginTop: 2 }}>
                        {remplis.length} mesure{remplis.length > 1 ? "s" : ""}
                        {remplis.length
                          ? " · " + remplis.slice(0, 3).map((f) => `${f.label.split(" ")[0]} ${m[f.id]}`).join(" · ")
                          : ""}
                        {remplis.length > 3 ? " …" : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <IconBtn onClick={() => modifier(m)}>
                        <Pencil size={14} />
                      </IconBtn>
                      <IconBtn danger onClick={() => api.remove(m.id)}>
                        <Trash2 size={14} />
                      </IconBtn>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <Modal
        open={modalOuverte}
        onClose={() => setModalOuverte(false)}
        title={edition?.id ? "Modifier la prise" : "Nouvelle prise de mesures"}
        iconeFermer={X}
      >
        {edition && (
          <div>
            <Field label="Date">
              <TextInput
                type="date"
                value={edition.date}
                onChange={(e) => setEdition({ ...edition, date: e.target.value })}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {MEASUREMENT_FIELDS.map((f) => (
                <Field key={f.id} label={`${f.label} (cm)`}>
                  <NumberInput
                    step="0.1"
                    value={edition[f.id] ?? ""}
                    onChange={(e) => setEdition({ ...edition, [f.id]: e.target.value })}
                  />
                </Field>
              ))}
              <Field label="Poids (kg)">
                <NumberInput
                  step="0.1"
                  value={edition.poids ?? ""}
                  onChange={(e) => setEdition({ ...edition, poids: e.target.value })}
                />
              </Field>
            </div>
            <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "0 0 10px" }}>
              Les champs vides sont ignorés. Le poids est synchronisé avec le Journal (Corps & composition).
            </p>
            <Btn onClick={enregistrer} style={{ width: "100%" }}>
              Enregistrer
            </Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}
