/**
 * « Semaine active » (repris de l'app Neiram, 24/10/2026) : minutes
 * d'activité des 7 derniers jours face au repère de l'OMS (150 min
 * modérées, une minute soutenue compte double), jours de renforcement
 * (2 minimum) et pas moyens. Calculs : lib/activites.js.
 */

import { Plus } from "./icones.jsx";
import { COLORS } from "../tokens.js";
import { addDays, todayISO } from "../lib/dates.js";
import { conseilSedentarite, pasMoyens, REPERE_PAS, REPERES_OMS, semaineActive } from "../lib/activites.js";
import { TEXTES_SPORTS as T } from "../lib/textes-sports.js";
import { Btn, Card, SectionTitle } from "./primitives.jsx";

const enTete = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 };
const barres = { display: "flex", alignItems: "flex-end", height: 44, marginBottom: 4, gap: 6 };
const colonne = { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 };
const chiffres = { display: "flex", flexWrap: "wrap", fontSize: 12, color: COLORS.textMuted, marginTop: 6, gap: "4px 14px" };

export function CarteActivite({ seances, journal, onAjouter }) {
  const date = todayISO();
  const bilan = semaineActive(seances, date);
  const pas = pasMoyens(journal, date);
  const conseil = conseilSedentarite(bilan, pas);
  const jours = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6));
  const maxJour = Math.max(30, ...jours.map((j) => bilan.parJour[j] || 0));

  return (
    <Card>
      <div data-semaine-active={bilan.equivalent}>
        <div style={enTete}>
          <SectionTitle tuto="semaine-active">{T.semaineActive}</SectionTitle>
          <Btn variant="ghost" icon={Plus} onClick={onAjouter}>
            {T.boutonActivite}
          </Btn>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
          <span style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: 26, color: bilan.equivalent >= REPERES_OMS.minutes ? COLORS.good : COLORS.text }}>
            {bilan.equivalent}
          </span>
          <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>{T.surSeptJours(REPERES_OMS.minutes)}</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: COLORS.bgAlt, overflow: "hidden", margin: "6px 0 10px" }}>
          <div style={{ width: `${bilan.pct}%`, height: "100%", background: bilan.pct >= 100 ? COLORS.good : COLORS.gold }} />
        </div>
        <div style={barres}>
          {jours.map((j, i) => {
            const v = bilan.parJour[j] || 0;
            const jour = T.joursCourts[(new Date(j + "T12:00:00").getDay() + 6) % 7];
            return (
              <div key={j} style={colonne}>
                <div
                  title={`${v} min`}
                  style={{ width: "100%", height: Math.max(3, Math.round((v / maxJour) * 30)), borderRadius: 3, background: v ? (i === 6 ? COLORS.gold : `${COLORS.gold}99`) : COLORS.border }}
                />
                <span style={{ fontSize: 9.5, color: COLORS.textFaint }}>{jour}</span>
              </div>
            );
          })}
        </div>
        <div style={chiffres}>
          <span>{T.moderee(bilan.moderees)}</span>
          <span>{T.soutenue(bilan.soutenues)}</span>
          <span style={{ color: bilan.joursRenfo >= REPERES_OMS.joursRenfo ? COLORS.good : COLORS.textMuted }}>{T.renfo(bilan.joursRenfo, REPERES_OMS.joursRenfo)}</span>
          {pas != null && <span style={{ color: pas >= REPERE_PAS ? COLORS.good : COLORS.textMuted }}>{T.pas(pas)}</span>}
        </div>
        {conseil && <p style={{ fontSize: 12.5, color: COLORS.text, margin: "10px 0 0", lineHeight: 1.5 }}>{conseil}</p>}
        <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "8px 0 0" }}>{T.reperesOms}</p>
      </div>
    </Card>
  );
}
