/**
 * Premier lancement.
 *
 * Portage de Onboarding (index.html 4744). C'est le seul ecran qu'un
 * nouveau client voit avant tout le reste, et le seul dont depend tout le
 * reste : sans age, taille et poids, aucun objectif calorique ne peut etre
 * calcule, et la moitie de l'application n'a rien a afficher.
 *
 * D'ou les trois seuls champs obligatoires : le strict necessaire au calcul.
 * Tout le reste a une valeur par defaut raisonnable et se corrige plus tard
 * dans les reglages — on ne retient pas quelqu'un a la porte pour lui
 * demander son type de metier.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI LA RESTAURATION EST ICI, ET PAS SEULEMENT DANS LES REGLAGES
 * ─────────────────────────────────────────────────────────────────────
 *
 * Quelqu'un qui change de telephone, ou qui reinstalle apres avoir vide son
 * navigateur, arrive precisement sur cet ecran. Tant que « Restaurer » ne
 * vivait que dans les reglages — inaccessibles sans profil — il devait
 * ressaisir a la main tout ce que son fichier de sauvegarde allait de toute
 * facon remplacer. Et rien ne lui disait que le fichier suffisait.
 *
 * Deux differences assumees avec l'ecran des reglages :
 *
 *   - aucune demande de confirmation : il n'y a rien a ecraser ici. La
 *     phrase « les donnees actuelles seront remplacees » serait fausse, et
 *     effrayante au pire moment ;
 *   - le bouton reste discret et second. La voie normale est de creer un
 *     profil ; la restauration ne concerne que ceux qui reviennent.
 */

import { useRef, useState } from "react";
import { COLORS } from "../tokens.js";
import { PROFIL_PAR_DEFAUT } from "../lib/profil.js";
import { ChampsProfil } from "./ChampsProfil.jsx";
import { Btn, Card } from "../ui/primitives.jsx";
import { Dumbbell, Upload } from "../ui/icones.jsx";
import { messageErreurRestauration, restaurerDepuisFichier } from "../lib/sauvegarde-fichier.js";

export function Bienvenue({ onSave }) {
  const [valeur, setValeur] = useState(PROFIL_PAR_DEFAUT);
  const [erreur, setErreur] = useState(null);
  const champFichier = useRef(null);

  // Age, taille et poids : sans eux, computeTargets n'a rien a calculer.
  const peutEnregistrer = valeur.age && valeur.heightCm && valeur.startWeightKg;

  const restaurer = async (evenement) => {
    const fichier = evenement.target.files[0];
    // Le champ est vide APRES lecture : sans cela, rechoisir le meme
    // fichier ne declenche aucun evenement et l'ecran semble bloque.
    evenement.target.value = "";
    if (!fichier) return;
    setErreur(null);
    try {
      await restaurerDepuisFichier(fichier);
      // Rechargement plutot que remontee d'etat : la restauration a
      // reecrit TOUT le stockage, et l'application doit repartir de la.
      window.location.reload();
    } catch (e) {
      setErreur(messageErreurRestauration(e.code));
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      }}
    >
      <Card style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <Dumbbell size={30} color={COLORS.gold} style={{ transform: "rotate(-20deg)" }} />
          <h1
            style={{
              fontFamily: "Poppins",
              fontSize: 24,
              fontWeight: 800,
              color: COLORS.text,
              textTransform: "uppercase",
              margin: "6px 0 0",
              letterSpacing: 0.5
            }}
          >
            Coach Neiram
          </h1>
          <div
            style={{
              fontFamily: "Poppins",
              fontSize: 10,
              letterSpacing: 3.5,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              fontWeight: 600,
              marginTop: 4
            }}
          >
            Coaching Sportif
          </div>
          <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 14 }}>
            Configure ton suivi : ces infos calculent tes objectifs caloriques et macros. Modifiable à tout
            moment.
          </p>
        </div>

        <ChampsProfil value={valeur} onChange={setValeur} />

        <Btn onClick={() => onSave(valeur)} disabled={!peutEnregistrer} style={{ width: "100%", marginTop: 8 }}>
          Commencer le suivi
        </Btn>

        {/* TEXTE-NOUVEAU
            Tout ce bloc est nouveau : l'application d'origine n'offrait
            aucune restauration avant la creation d'un profil. C'est le
            correctif lui-meme, il ne peut donc pas exister dans l'original.
            « J'ai déjà une sauvegarde » est formule du point de vue de la
            cliente qui revient, pas du mecanisme. */}
        <input
          type="file"
          accept="application/json,.json"
          ref={champFichier}
          style={{ display: "none" }}
          onChange={restaurer}
        />
        <Btn
          variant="ghost"
          icon={Upload}
          onClick={() => champFichier.current?.click()}
          style={{ width: "100%", marginTop: 10 }}
        >
          J'ai déjà une sauvegarde
        </Btn>
        <p style={{ fontSize: 11.5, color: COLORS.textMuted, textAlign: "center", margin: "8px 0 0" }}>
          Tu changes de téléphone ? Reprends ton fichier de sauvegarde, rien ne sera perdu.
        </p>
        {erreur ? (
          <p style={{ fontSize: 12, color: COLORS.bad, textAlign: "center", margin: "8px 0 0" }}>{erreur}</p>
        ) : null}
        {/* FIN-TEXTE-NOUVEAU */}
      </Card>
    </div>
  );
}
