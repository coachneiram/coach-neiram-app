/**
 * Mes trophees : serie de semaines tenues et paliers de seances.
 *
 * Voir lib/trophees.js pour les regles (series hebdomadaires facon Peloton,
 * paliers facon Orangetheory, joker facon Duolingo pour les semaines
 * difficiles, regle « ne jamais rater deux fois »).
 *
 * Le joker n'est explique qu'au client en ligne (avecJoker) : lui seul peut
 * declarer une semaine difficile.
 *
 * Un trophee nouvellement gagne est celebre une fois, puis memorise comme
 * vu (cle cn_trophees_vus, incluse dans les sauvegardes).
 */

import { useMemo, useState } from "react";
import { COLORS, POLICES } from "../tokens.js";
import { todayISO } from "../lib/dates.js";
import { charger, enregistrer } from "../lib/stockage.js";
import { messageSemaine, nouveauxTrophees, trophees } from "../lib/trophees.js";
import { Btn, Card, MiniBar, SectionTitle } from "../ui/primitives.jsx";

const CLE_VUS = "cn_trophees_vus";

/* TEXTE-NOUVEAU
   Trophees et serie de semaines tenues, ajoutes a la demande du coach pour
   que les clients restent actifs, d'apres Peloton, Orangetheory et Duolingo.
   Aucun de ces libelles n'existe dans index.html. */
export function Trophees({ seances, profile, semainesDifficiles, avecJoker }) {
  const date = todayISO();
  const etat = useMemo(
    () => trophees({ seances, profil: profile, semainesDifficiles, date }),
    [seances, profile, semainesDifficiles, date]
  );
  const [vus, setVus] = useState(() => {
    const v = charger(CLE_VUS, []);
    return Array.isArray(v) ? v : [];
  });
  const nouveaux = nouveauxTrophees(etat.liste, vus);
  const { serie, meilleure, enCours } = etat.series;
  const message = messageSemaine(etat.series);

  const marquerVus = () => {
    const suivant = [...new Set([...vus, ...nouveaux.map((t) => t.id)])];
    setVus(suivant);
    enregistrer(CLE_VUS, suivant);
  };

  return (
    <Card>
      <SectionTitle>Mes trophées</SectionTitle>

      {nouveaux.length > 0 && (
        <div
          data-nouveau-trophee=""
          style={{
            marginTop: 12,
            padding: "12px 14px",
            borderRadius: 10,
            border: `1px solid ${COLORS.gold}`,
            background: `${COLORS.gold}1A`
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold }}>
            🎉 {nouveaux.length > 1 ? `${nouveaux.length} nouveaux trophées !` : "Nouveau trophée !"}
          </div>
          <div style={{ fontSize: 13, color: COLORS.text, margin: "4px 0 10px" }}>
            {nouveaux.map((t) => t.titre).join(" · ")}
          </div>
          <Btn onClick={marquerVus} style={{ padding: "8px 14px" }}>
            Super !
          </Btn>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 14 }}>
        <span style={{ fontSize: 26 }}>🔥</span>
        <span data-serie-semaines="" style={{ fontFamily: POLICES.titre, fontSize: 28, fontWeight: 700, color: COLORS.text }}>
          {serie}
        </span>
        <span style={{ fontSize: 13, color: COLORS.textMuted }}>
          semaine{serie > 1 ? "s" : ""} tenue{serie > 1 ? "s" : ""} d'affilée
          {meilleure > serie ? ` · record ${meilleure}` : ""}
        </span>
      </div>

      <div style={{ marginTop: 10 }}>
        <MiniBar
          label={`Cette semaine${enCours.difficile ? " (semaine difficile)" : ""}`}
          pct={(Math.min(enCours.faites, enCours.objectif) / enCours.objectif) * 100}
          valueLabel={`${enCours.faites}/${enCours.objectif} séances`}
          color={COLORS.gold}
        />
      </div>
      {message && <p style={{ fontSize: 12.5, color: COLORS.text, margin: "0 0 12px", lineHeight: 1.5 }}>{message}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {etat.liste.map((t) => (
          <div
            key={t.id}
            data-trophee={t.id}
            data-obtenu={t.obtenu ? "oui" : "non"}
            title={t.detail}
            style={{
              padding: "10px 6px",
              borderRadius: 10,
              textAlign: "center",
              border: `1px solid ${t.obtenu ? COLORS.gold : COLORS.border}`,
              background: t.obtenu ? `${COLORS.gold}14` : COLORS.bgAlt,
              opacity: t.obtenu ? 1 : 0.55
            }}
          >
            <div style={{ fontSize: 22, filter: t.obtenu ? "none" : "grayscale(1)" }}>
              {t.famille === "seances" ? "🏅" : "🔥"}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: t.obtenu ? COLORS.gold : COLORS.textMuted, marginTop: 4 }}>
              {t.titre}
            </div>
            <div style={{ fontSize: 10, color: COLORS.textFaint, marginTop: 2 }}>{t.obtenu ? t.detail : t.progression}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: "10px 0 0", lineHeight: 1.45 }}>
        Une semaine est tenue quand tu atteins ton objectif de séances.
        {avecJoker && " Semaine difficile déclarée : une seule séance maintien suffit, ta série est protégée."}
      </p>
    </Card>
  );
}
/* FIN-TEXTE-NOUVEAU */
