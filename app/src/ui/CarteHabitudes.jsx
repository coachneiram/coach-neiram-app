/**
 * « Mes habitudes » dans le Journal (lib/habitudes.js), repris de l'app
 * Neiram le 24/10/2026 : cocher ses habitudes du jour, voir sa série (avec
 * joker) et son taux sur 30 jours. Dans l'app coach, tout est inclus :
 * jusqu'à 10 habitudes, le taux pour tous.
 */

import { useState } from "react";
import { COLORS } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import {
  ajouterPerso,
  basculer,
  CATALOGUE_HABITUDES,
  CATEGORIES_HABITUDES,
  choisir,
  CLE_HABITUDES,
  estCochee,
  habitudesActives,
  HABITUDES_MAX,
  normaliserHabitudes,
  peutAjouter,
  serie,
  taux
} from "../lib/habitudes.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { TEXTES_HABITUDES as T } from "../lib/textes-mode-de-vie.js";
import { Btn, Card, Modal, SectionTitle, TextInput } from "./primitives.jsx";
import { X } from "./icones.jsx";

const CARTE = {
  marginBottom: 16
};
const EN_TETE = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8
};
const TEXTE_VIDE = {
  fontSize: 12.5,
  color: COLORS.textMuted,
  margin: "6px 0 0",
  lineHeight: 1.5
};
const LISTE = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 8
};
const LIGNE = {
  display: "flex",
  alignItems: "center",
  gap: 10
};
const NOM = {
  flex: 1,
  minWidth: 0
};
const DETAIL = {
  fontSize: 10.5,
  color: COLORS.textFaint
};
const INTRO = {
  fontSize: 12,
  color: COLORS.textMuted,
  margin: "0 0 10px",
  lineHeight: 1.5
};
const CARTE_CATEGORIE = {
  marginBottom: 12
};
const CATEGORIE = {
  fontSize: 11,
  fontWeight: 700,
  color: COLORS.gold,
  textTransform: "uppercase",
  marginBottom: 6
};
const CASE = {
  width: 17,
  height: 17,
  accentColor: COLORS.gold,
  flexShrink: 0
};
const LIBELLE_CHOIX = {
  fontSize: 12.5,
  color: COLORS.text
};
const POURQUOI = {
  display: "block",
  fontSize: 10.5,
  color: COLORS.textFaint
};
const LIGNE_PERSO = {
  display: "flex",
  gap: 8,
  marginBottom: 12
};
const MAXIMUM = {
  fontSize: 11.5,
  color: COLORS.warn,
  margin: "0 0 8px"
};
const BOUTON_LARGE = {
  width: "100%",
  marginTop: 8
};

const styleBouton = (coche, futur) => ({
  width: 30,
  height: 30,
  borderRadius: 9,
  flexShrink: 0,
  border: `1.5px solid ${coche ? COLORS.good : COLORS.border}`,
  background: coche ? `${COLORS.good}22` : COLORS.bgAlt,
  color: COLORS.good,
  fontSize: 15,
  cursor: futur ? "default" : "pointer"
});
const styleNom = (coche) => ({
  fontSize: 13,
  color: coche ? COLORS.text : COLORS.textMuted
});
const styleChoix = (bloque) => ({
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  marginBottom: 7,
  opacity: bloque ? 0.5 : 1
});

export function CarteHabitudes({ date = todayISO() }) {
  const [etat, setEtat] = useState(() => normaliserHabitudes(charger(CLE_HABITUDES, null)));
  const [choix, setChoix] = useState(false);
  const [libre, setLibre] = useState("");
  const changer = (suivant) => {
    setEtat(suivant);
    enregistrer(CLE_HABITUDES, suivant);
  };
  const actives = habitudesActives(etat);
  const aujourdhui = todayISO();
  const futur = date > aujourdhui;
  const place = peutAjouter(etat);

  return (
    <Card style={CARTE}>
      <div data-habitudes={actives.length}>
        <div style={EN_TETE}>
          <SectionTitle tuto="habitudes">{T.titre}</SectionTitle>
          <Btn variant="ghost" onClick={() => setChoix(true)}>
            {actives.length ? T.modifier : T.choisir}
          </Btn>
        </div>
        {!actives.length ? (
          <p style={TEXTE_VIDE}>{T.vide}</p>
        ) : (
          <div style={LISTE}>
            {actives.map((h) => {
              const coche = estCochee(etat, date, h.id);
              const s = serie(etat, h.id, aujourdhui);
              return (
                <div key={h.id} data-habitude={h.id} data-serie-habitude={s.jours} style={LIGNE}>
                  <button
                    aria-label={T.aria(coche, h.label)}
                    aria-pressed={coche}
                    disabled={futur}
                    onClick={() => changer(basculer(etat, date, h.id))}
                    style={styleBouton(coche, futur)}
                  >
                    {coche ? T.coche : ""}
                  </button>
                  <div style={NOM}>
                    <div style={styleNom(coche)}>{T.nom(h)}</div>
                    <div style={DETAIL}>{T.ligne(s, taux(etat, h.id, aujourdhui))}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={choix} onClose={() => setChoix(false)} title={T.titreChoix} iconeFermer={X}>
        <div data-choix-habitudes>
          <p style={INTRO}>{T.introChoix}</p>
          {CATEGORIES_HABITUDES.map((cat) => (
            <div key={cat.id} style={CARTE_CATEGORIE}>
              <div style={CATEGORIE}>{cat.label}</div>
              {[...CATALOGUE_HABITUDES, ...(cat.id === "mental" ? etat.perso : [])]
                .filter((h) => h.categorie === cat.id)
                .map((h) => {
                  const actif = etat.choisies.includes(h.id);
                  const bloque = !actif && !place;
                  return (
                    <label key={h.id} style={styleChoix(bloque)}>
                      <input
                        type="checkbox"
                        data-choix-habitude={h.id}
                        checked={actif}
                        disabled={bloque}
                        onChange={(e) => changer(choisir(etat, h.id, e.target.checked))}
                        style={CASE}
                      />
                      <span style={LIBELLE_CHOIX}>
                        {T.nom(h)}
                        {h.pourquoi && <span style={POURQUOI}>{h.pourquoi}</span>}
                      </span>
                    </label>
                  );
                })}
            </div>
          ))}
          <div style={LIGNE_PERSO}>
            <TextInput placeholder={T.placeholderPerso} maxLength={50} value={libre} onChange={(e) => setLibre(e.target.value)} />
            <Btn
              disabled={libre.trim().length < 2 || !place}
              onClick={() => {
                changer(ajouterPerso(etat, libre));
                setLibre("");
              }}
            >
              {T.ajouter}
            </Btn>
          </div>
          {!place && <p style={MAXIMUM}>{T.maximum(HABITUDES_MAX)}</p>}
          <Btn style={BOUTON_LARGE} onClick={() => setChoix(false)}>
            {T.cestParti}
          </Btn>
        </div>
      </Modal>
    </Card>
  );
}
