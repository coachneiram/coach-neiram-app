/**
 * « Mon année Neiram » (lib/bilan-annee.js), reprise de l'app Neiram le
 * 24/10/2026 : le bilan de l'année écran par écran (séances, sport
 * favori, régularité, force, transformation, pas et sommeil), puis une
 * image à partager en story. Mise en avant (bordure dorée) en décembre et
 * en janvier.
 *
 * Dans l'app coach : carte d'Entraînements, à côté du calendrier « Mon
 * année ». Le compteur de partages de l'app Neiram (badge « Stories ») n'est
 * pas repris : l'app coach n'a pas ce badge.
 */

import { useMemo, useState } from "react";
import { COLORS } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import { anneeDuBilan, bilanAnnee, saisonDuBilan } from "../lib/bilan-annee.js";
import { canvasEnPng, dessinerCarte } from "../lib/dessin-carte.js";
import { partagerCarte } from "../lib/partage-carte.js";
import { TEXTES_BILAN_ANNEE as T } from "../lib/textes-mode-de-vie.js";
import { Btn, Card, Modal, SectionTitle } from "./primitives.jsx";
import { X } from "./icones.jsx";

const BORDURE_SAISON = {
  border: `1px solid ${COLORS.gold}`
};
const INTRO = {
  fontSize: 12.5,
  color: COLORS.textMuted,
  margin: "4px 0 10px",
  lineHeight: 1.5
};
const BOUTON_LARGE = {
  width: "100%"
};
const ECRAN = {
  textAlign: "center",
  padding: "18px 6px"
};
const EMOJI = {
  fontSize: 44
};
const TITRE_ECRAN = {
  fontSize: 13,
  color: COLORS.textMuted,
  marginTop: 6,
  textTransform: "uppercase",
  letterSpacing: 1
};
const VALEUR = {
  fontSize: 30,
  fontWeight: 800,
  color: COLORS.gold,
  margin: "10px 0"
};
const DETAIL = {
  fontSize: 13.5,
  color: COLORS.text,
  marginTop: 4
};
const POINTS = {
  display: "flex",
  justifyContent: "center",
  gap: 6,
  margin: "18px 0 14px"
};
const INFO = {
  fontSize: 12,
  color: COLORS.textMuted,
  marginTop: 8
};

const stylePoint = (actif) => ({
  width: 7,
  height: 7,
  borderRadius: 4,
  background: actif ? COLORS.gold : COLORS.border
});

export function CarteBilanAnnee({ seances, journal, corps, profil, maxis }) {
  const aujourdhui = todayISO();
  const annee = anneeDuBilan(aujourdhui);
  const [ouvert, setOuvert] = useState(false);
  const [i, setI] = useState(0);
  const [info, setInfo] = useState(null);
  const bilan = useMemo(
    () => bilanAnnee({ annee, seances, journal, corps, profil, maxis }),
    [annee, seances, journal, corps, profil, maxis]
  );
  if (!bilan.ecrans.length) return null;
  const saison = saisonDuBilan(aujourdhui);
  const ecran = bilan.ecrans[Math.min(i, bilan.ecrans.length - 1)];
  const dernier = i >= bilan.ecrans.length - 1;

  const partager = async () => {
    setInfo(null);
    try {
      const png = await canvasEnPng(await dessinerCarte(bilan.lignesStory, { surtitre: T.surtitre(annee) }));
      const r = await partagerCarte(png, T.nomFichier(annee));
      if (r === "cancelled") return;
      setInfo(r === "downloaded" ? T.imageEnregistree : T.partage);
    } catch (e) {
      setInfo(T.imageRatee);
    }
  };

  return (
    <Card style={saison ? BORDURE_SAISON : undefined}>
      <div data-bilan-annee={annee} data-saison={saison ? "oui" : "non"}>
        <SectionTitle>{T.titre(annee)}</SectionTitle>
        <p style={INTRO}>{saison ? T.saison(annee) : T.horsSaison}</p>
        <Btn
          onClick={() => {
            setI(0);
            setInfo(null);
            setOuvert(true);
          }}
          style={BOUTON_LARGE}
        >
          {T.voir}
        </Btn>
      </div>
      <Modal open={ouvert} onClose={() => setOuvert(false)} title={T.titreModale(annee)} iconeFermer={X}>
        <div data-ecran-bilan={ecran.id} style={ECRAN}>
          <div style={EMOJI}>{ecran.emoji}</div>
          <div style={TITRE_ECRAN}>{ecran.titre}</div>
          <div style={VALEUR}>{ecran.valeur}</div>
          {ecran.detail.map((d) => (
            <div key={d} style={DETAIL}>
              {d}
            </div>
          ))}
          <div style={POINTS}>
            {bilan.ecrans.map((e, k) => (
              <span key={e.id} style={stylePoint(k === i)} />
            ))}
          </div>
          {dernier ? (
            <Btn onClick={partager} style={BOUTON_LARGE}>
              {T.partager}
            </Btn>
          ) : (
            <Btn onClick={() => setI(i + 1)} style={BOUTON_LARGE}>
              {T.suivant}
            </Btn>
          )}
          {info && <p style={INFO}>{info}</p>}
        </div>
      </Modal>
    </Card>
  );
}
