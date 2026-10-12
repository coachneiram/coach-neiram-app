/**
 * Dictee vocale reutilisable : un plat, une recette ou une seance.
 *
 * Le micro remplit un champ de texte, que le client peut aussi taper ou
 * dicter avec le micro de son clavier quand le navigateur ne sait pas
 * dicter (iPhone, appli installee). L'IA range ensuite le texte dans les
 * champs de l'ecran, et c'est le client qui enregistre, apres verification.
 *
 * La logique de la dictee (delais de securite, erreurs) vit dans
 * lib/dictee.js ; celle de l'IA dans lib/dictee-saisie.js.
 */

import { useEffect, useRef, useState } from "react";
import { COLORS } from "../tokens.js";
import { completerTexte, demarrerDictee, moteurDictee } from "../lib/dictee.js";
import { analyserDescriptionRepas } from "../lib/photo-aliment.js";
import { analyserRecetteDictee, analyserSeanceDictee } from "../lib/dictee-saisie.js";
import { messageErreur } from "../lib/ia.js";
import { Btn, TextArea } from "./primitives.jsx";
import { Loader2, Sparkles } from "./icones.jsx";

/**
 * Micro branche sur un champ de texte.
 *
 * Chaque dictee s'ajoute a ce qui est deja ecrit : une recette ou une
 * seance se dicte en plusieurs fois, le navigateur coupant l'ecoute a la
 * premiere pause. Quitter l'ecran coupe le micro.
 */
export function useDictee(texte, setTexte, setErreur) {
  const [ecoute, setEcoute] = useState(false);
  const arreter = useRef(null);
  const peutDicter = Boolean(moteurDictee());

  useEffect(() => () => arreter.current && arreter.current(), []);

  const couper = () => {
    if (arreter.current) arreter.current();
  };

  const basculer = () => {
    if (ecoute) {
      couper();
      return;
    }
    setErreur(null);
    const debut = texte;
    const stop = demarrerDictee({
      surTexte: (dicte) => setTexte(completerTexte(debut, dicte)),
      surErreur: setErreur,
      surFin: () => {
        arreter.current = null;
        setEcoute(false);
      }
    });
    if (stop) {
      arreter.current = stop;
      setEcoute(true);
    }
  };

  return { peutDicter, ecoute, basculer, couper };
}

/* TEXTE-NOUVEAU
   Dictee d'un plat, d'une recette ou d'une seance, demandee par le coach
   le 12 octobre 2026 : « un endroit ou la personne fasse une dictee vocale
   pour rentrer soit ses plats, soit ses recettes, soit ses entrainements ».
   index.html n'avait que la saisie au clavier : aucun de ces libelles n'y
   existe. */
const TEXTES = {
  plat: {
    ouvrir: "🎤 Dicter un plat",
    exemple: "Ex : mon bol du matin, 50 g de flocons d'avoine, 200 g de skyr, une banane",
    ecoute: "Je t'écoute… décris ton plat et ses quantités, puis touche « Arrêter ».",
    aide: "L'IA estime les calories et les macros. Tu vérifies, puis tu enregistres le plat.",
    repli: "Estimation impossible. Précise les quantités, ou crée le plat à la main."
  },
  recette: {
    ouvrir: "🎤 Dicter toute la recette",
    exemple:
      "Ex : quiche lorraine pour 6 parts, une pâte brisée, 200 g de lardons, 3 œufs, 20 cl de crème, 100 g de gruyère",
    ecoute: "Je t'écoute… le nom, le nombre de parts, puis chaque ingrédient avec sa quantité.",
    aide: "L'IA liste les ingrédients avec leurs quantités pour la recette entière. Retire ou remplace ce qui ne va pas avant d'enregistrer.",
    repli: "Je n'ai pas réussi à lire la recette. Donne chaque ingrédient avec sa quantité, ou ajoute-les un par un."
  },
  seance: {
    ouvrir: "🎤 Dicter ma séance",
    exemple:
      "Ex : squat 4 séries de 8 à 60 kilos, développé couché 3 fois 10 à 40 kilos, 15 minutes de vélo, séance de 50 minutes, RPE 7",
    ecoute: "Je t'écoute… chaque exercice avec ses séries, ses répétitions et sa charge.",
    aide: "L'IA remplit les exercices de la séance. Vérifie les séries et les charges avant d'enregistrer.",
    repli: "Je n'ai pas réussi à lire la séance. Donne chaque exercice avec ses séries et sa charge, ou ajoute-les à la main."
  }
};

const ANALYSES = {
  plat: (texte) => analyserDescriptionRepas(texte),
  recette: (texte) => analyserRecetteDictee(texte),
  seance: (texte, options) => analyserSeanceDictee(texte, options.exercicesPerso)
};

/**
 * Zone de dictee repliee derriere un bouton.
 *
 * `type` : "plat", "recette" ou "seance". `onResultat` recoit ce que l'IA
 * a compris ; la zone se replie et se vide ensuite, l'ecran affichant les
 * champs remplis a verifier. `ouverte` : la zone s'affiche deja depliee.
 */
export function ZoneDictee({ type, onResultat, exercicesPerso = [], ouverte = false }) {
  const t = TEXTES[type];
  const [depliee, setDepliee] = useState(ouverte);
  const [texte, setTexte] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const { peutDicter, ecoute, basculer, couper } = useDictee(texte, setTexte, setErreur);

  if (!depliee) {
    return (
      <Btn
        variant="ghost"
        onClick={() => setDepliee(true)}
        style={{ width: "100%", marginBottom: 12 }}
      >
        {t.ouvrir}
      </Btn>
    );
  }

  const remplir = async () => {
    couper();
    setEnCours(true);
    setErreur(null);
    try {
      const resultat = await ANALYSES[type](texte, { exercicesPerso });
      onResultat(resultat);
      setTexte("");
      setDepliee(false);
    } catch (e) {
      setErreur(messageErreur(e, t.repli));
    } finally {
      setEnCours(false);
    }
  };

  const fermer = () => {
    couper();
    setDepliee(false);
    setErreur(null);
  };

  return (
    <div
      data-dictee={type}
      style={{
        border: `1px solid ${COLORS.gold}55`,
        borderRadius: 10,
        padding: 10,
        marginBottom: 12
      }}
    >
      <TextArea
        rows={4}
        placeholder={t.exemple}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {peutDicter && (
          <Btn variant="ghost" onClick={basculer} disabled={enCours} style={{ flex: 1 }}>
            {ecoute ? "⏹ Arrêter" : "🎤 Dicter"}
          </Btn>
        )}
        <Btn
          icon={enCours ? Loader2 : Sparkles}
          onClick={remplir}
          disabled={enCours || !texte.trim()}
          style={{ flex: 2 }}
        >
          {enCours ? "Lecture..." : "Remplir avec l'IA"}
        </Btn>
      </div>
      {ecoute && (
        <p style={{ fontSize: 11.5, color: COLORS.gold, margin: "8px 0 0" }}>{t.ecoute}</p>
      )}
      {erreur && <p style={{ fontSize: 12, color: COLORS.bad, margin: "8px 0 0" }}>{erreur}</p>}
      <p
        style={{
          fontSize: 10.5,
          color: COLORS.textFaint,
          margin: "8px 0 0",
          lineHeight: 1.45
        }}
      >
        {t.aide}{" "}
        {peutDicter
          ? "Tu peux dicter en plusieurs fois : chaque dictée s'ajoute au texte."
          : "Pour dicter, touche le micro de ton clavier."}
      </p>
      <button
        onClick={fermer}
        style={{
          background: "none",
          border: "none",
          color: COLORS.textMuted,
          fontSize: 11.5,
          marginTop: 6,
          padding: 0,
          cursor: "pointer",
          textDecoration: "underline"
        }}
      >
        Fermer la dictée
      </button>
    </div>
  );
}
/* FIN-TEXTE-NOUVEAU */
