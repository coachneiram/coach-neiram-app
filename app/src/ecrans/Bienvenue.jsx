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
 *
 * ─────────────────────────────────────────────────────────────────────
 * « J'AI UN CODE FEU VERT » (25 novembre 2026)
 * ─────────────────────────────────────────────────────────────────────
 *
 * En tete : le membre Feu Vert entre le code donne par Marien, et rien
 * d'autre (prenom optionnel). Le code est active, le proxy renvoie la
 * cohorte, le parcours et le debut fixes par Marien, et le profil Feu Vert
 * est cree pre-regle. C'est desormais la SEULE facon de creer un profil
 * Feu Vert : le choix manuel de la formule a disparu, pour qu'un client
 * individuel ou un inconnu ne puisse pas se mettre en Feu Vert lui-meme.
 */

import { useRef, useState } from "react";
import { accesActuel } from "../lib/acces.js";
import { MSG_REJOINDRE, profilFeuVert, rejoindreFeuVert } from "../lib/feu-vert.js";
import { TEXTES_ACCUEIL_FEU_VERT as TA } from "../lib/textes-feu-vert.js";
import { COLORS } from "../tokens.js";
import { PROFIL_PAR_DEFAUT } from "../lib/profil.js";
import { ChampsProfil } from "./ChampsProfil.jsx";
import { Btn, Card, Field, TextInput } from "../ui/primitives.jsx";
import { Dumbbell, Upload } from "../ui/icones.jsx";
import { FeuTricolore } from "../ui/icones-feu-vert.jsx";
import { messageErreurRestauration, restaurerDepuisFichier } from "../lib/sauvegarde-fichier.js";

export function Bienvenue({ onSave }) {
  const [valeur, setValeur] = useState(PROFIL_PAR_DEFAUT);
  const [erreur, setErreur] = useState(null);
  const champFichier = useRef(null);

  // Age, taille et poids : sans eux, computeTargets n'a rien a calculer.
  const peutEnregistrer = valeur.age && valeur.heightCm && valeur.startWeightKg;

  // « J'ai un code Feu Vert » : formulaire ouvert, code, prenom, envoi, erreur.
  const [codeOuvert, setCodeOuvert] = useState(false);
  const [code, setCode] = useState("");
  const [prenom, setPrenom] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreurCode, setErreurCode] = useState(null);

  const rejoindre = async (avecCode) => {
    setEnCours(true);
    setErreurCode(null);
    const r = await rejoindreFeuVert(avecCode ? code : null);
    setEnCours(false);
    if (!r.ok) {
      setErreurCode(r.erreur);
      return;
    }
    const nom = prenom.trim();
    onSave(profilFeuVert({ ...PROFIL_PAR_DEFAUT, ...(nom ? { name: nom } : {}) }, r.reglages));
  };

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
        </div>

        <div data-accueil-feu-vert style={{ marginBottom: 18 }}>
          {!codeOuvert ? (
            <Btn icon={FeuTricolore} onClick={() => setCodeOuvert(true)} style={{ width: "100%" }}>
              {TA.bouton}
            </Btn>
          ) : (
            <div data-formulaire-code-feu-vert>
              <Field label={TA.code}>
                <TextInput
                  data-code-feu-vert
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={TA.code}
                  autoCapitalize="characters"
                  autoComplete="one-time-code"
                />
              </Field>
              <Field label={TA.prenom}>
                <TextInput data-prenom-feu-vert value={prenom} maxLength={40} onChange={(e) => setPrenom(e.target.value)} />
              </Field>
              <Btn onClick={() => rejoindre(true)} disabled={enCours || code.replace(/[\s-]/g, "").length < 8} style={{ width: "100%" }}>
                {enCours ? TA.enCours : TA.activer}
              </Btn>
              {erreurCode === "non-inscrit" && accesActuel() && (
                <Btn variant="ghost" onClick={() => rejoindre(false)} disabled={enCours} style={{ width: "100%", marginTop: 8 }}>
                  {TA.reessayer}
                </Btn>
              )}
              {erreurCode && (
                <p data-erreur-code-feu-vert style={{ fontSize: 12, color: COLORS.bad, margin: "8px 0 0", lineHeight: 1.5 }}>
                  {MSG_REJOINDRE[erreurCode] || MSG_REJOINDRE.indisponible}
                </p>
              )}
            </div>
          )}
          <p style={{ fontSize: 11.5, color: COLORS.textMuted, textAlign: "center", margin: "8px 0 0" }}>{TA.aide}</p>
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: COLORS.textFaint,
            borderTop: `1px solid ${COLORS.border}`,
            paddingTop: 14,
            marginBottom: 12
          }}
        >
          {TA.separateur}
        </div>
        {/* Sous le separateur : ces infos ne concernent que le coaching individuel. */}
        <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "0 0 14px", textAlign: "center" }}>
          Configure ton suivi : ces infos calculent tes objectifs caloriques et macros. Modifiable à tout
          moment.
        </p>

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
