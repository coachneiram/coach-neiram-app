/**
 * « Envoyer à mon coach » : le bilan de la semaine part vers la plateforme
 * Coach Neiram en un clic (16 novembre 2026). Voir lib/plateforme.js.
 *
 * Le partage du fichier reste à côté, dans Tendances : cet envoi s'ajoute,
 * il ne le remplace pas.
 *
 * Le rappel du dimanche ouvre l'application sur cet écran (lien
 * ?raccourci=bilan, lib/raccourcis.js) : l'intention « bilan » fait défiler
 * jusqu'ici et pose le focus sur le bouton.
 */

import { useEffect, useRef, useState } from "react";
import { COLORS } from "../tokens.js";
import { EVENEMENT_INTENTION, prendreIntention } from "../lib/reception-raccourcis.js";
import {
  TEXTES_PLATEFORME as T,
  dateEnvoi,
  envoiDeLaSemaine,
  envoyerBilanPlateforme,
  lireCodePlateforme,
  noterEnvoi
} from "../lib/plateforme.js";
import { Btn } from "./primitives.jsx";

const styleMessage = (couleur) => ({
  fontSize: 12.5,
  lineHeight: 1.5,
  color: couleur,
  margin: "8px 0 0",
  textAlign: "center"
});

export function BilanPlateforme({ cleSemaine, construire, onEnvoye, onReglages }) {
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [envoye, setEnvoye] = useState(() => envoiDeLaSemaine(cleSemaine));
  const enCours = useRef(false);
  const zone = useRef(null);
  const bouton = useRef(null);

  // Une autre semaine : on relit son dernier envoi.
  useEffect(() => {
    setEnvoye(envoiDeLaSemaine(cleSemaine));
    setResultat(null);
  }, [cleSemaine]);

  // Le rappel du dimanche (ou ?raccourci=bilan) amène ici.
  useEffect(() => {
    const aller = () => {
      if (!prendreIntention("bilan")) return;
      if (zone.current && zone.current.scrollIntoView) zone.current.scrollIntoView({ block: "center", behavior: "smooth" });
      if (bouton.current && bouton.current.focus) bouton.current.focus({ preventScroll: true });
    };
    aller();
    const ecoute = (e) => {
      if (e.detail === "bilan") aller();
    };
    window.addEventListener(EVENEMENT_INTENTION, ecoute);
    return () => window.removeEventListener(EVENEMENT_INTENTION, ecoute);
  }, []);

  const envoyer = async () => {
    // Un seul envoi à la fois : le bouton est aussi désactivé, mais deux
    // appuis dans le même instant passent avant le rendu.
    if (enCours.current) return;
    const code = lireCodePlateforme();
    if (!code) {
      setResultat({ ok: false, erreur: "sans-code", message: T.sansCode });
      return;
    }
    enCours.current = true;
    setEnvoiEnCours(true);
    setResultat(null);
    let r;
    try {
      r = await envoyerBilanPlateforme({ payload: construire(), code });
    } catch (e) {
      r = { ok: false, erreur: "reseau", message: T.echec };
    }
    if (r.ok) {
      const suivant = noterEnvoi(cleSemaine);
      setEnvoye(suivant[cleSemaine]);
      if (onEnvoye) onEnvoye();
      setResultat({ ok: true, message: T.envoye });
    } else {
      setResultat(r);
    }
    enCours.current = false;
    setEnvoiEnCours(false);
  };

  return (
    <div ref={zone} data-bilan-plateforme style={{ marginTop: 4 }}>
      <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "0 0 8px", lineHeight: 1.5, textAlign: "center" }}>{T.aide}</p>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          ref={bouton}
          type="button"
          data-envoyer-plateforme
          onClick={envoyer}
          disabled={envoiEnCours}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontWeight: 700,
            fontSize: 14,
            borderRadius: 10,
            padding: "10px 16px",
            border: "1px solid transparent",
            background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.gold})`,
            color: "#0B0B0C",
            cursor: envoiEnCours ? "default" : "pointer",
            opacity: envoiEnCours ? 0.6 : 1
          }}
        >
          {envoiEnCours ? T.envoiEnCours : T.bouton}
        </button>
      </div>

      {resultat && (
        <div role="status" data-plateforme-message style={styleMessage(resultat.ok ? COLORS.good : COLORS.warn)}>
          {resultat.message}
          {resultat.erreur === "sans-code" && onReglages && (
            <div style={{ marginTop: 8 }}>
              <Btn variant="ghost" onClick={onReglages}>
                {T.ouvrirReglages}
              </Btn>
            </div>
          )}
        </div>
      )}

      {envoye && !resultat && (
        <p data-plateforme-deja style={styleMessage(COLORS.textMuted)}>
          {T.dejaEnvoye(dateEnvoi(envoye))}. {T.renvoyer}
        </p>
      )}
      {envoye && resultat && resultat.ok && (
        <p data-plateforme-deja style={styleMessage(COLORS.textMuted)}>
          {T.dejaEnvoye(dateEnvoi(envoye))}. {T.renvoyer}
        </p>
      )}
    </div>
  );
}
