/**
 * Prendre une photo, ou en choisir une.
 *
 * DIVERGENCE ASSUMEE avec l'application d'origine, qui avait le meme
 * defaut : un seul champ `accept="image/*"`, sans attribut `capture`.
 *
 * Sur Android, ce champ seul n'expose pas toujours l'appareil photo —
 * c'est le cas des applications installees sur l'ecran d'accueil, ou le
 * selecteur systeme ne propose que la photothèque et les fichiers. Des
 * clientes se sont retrouvees incapables de photographier leur assiette
 * ou un code-barres, alors que c'est la voie la plus rapide.
 *
 * La solution n'est PAS d'ajouter `capture` au champ existant : cela
 * forcerait l'appareil photo et retirerait le choix d'une photo deja
 * prise, ce qui casserait l'autre moitie des usages. Il faut deux champs
 * distincts, et deux boutons qui disent lequel fait quoi.
 *
 * `capture="environment"` demande la camera arriere : c'est celle qui
 * cadre une assiette ou un code-barres, jamais la frontale.
 */

import { useRef } from "react";
import { Btn } from "./primitives.jsx";
import { Camera, Upload } from "./icones.jsx";

/* TEXTE-NOUVEAU
   Les libelles par defaut « Prendre une photo » et « Choisir une photo »
   n'existent pas dans l'application d'origine, qui n'avait qu'un seul
   bouton et un seul champ de fichier. C'est precisement ce qui privait les
   clientes Android de leur appareil photo. */
export function ChoixPhoto({
  onFichier,
  libelleAppareil = "Prendre une photo",
  libelleGalerie = "Choisir une photo",
  enCours = false,
  libelleEnCours,
  icone: Icone = Camera,
  style
}) {
  /* FIN-TEXTE-NOUVEAU */
  const champAppareil = useRef(null);
  const champGalerie = useRef(null);

  /**
   * Le champ est vide APRES lecture : sans cela, rechoisir exactement la
   * meme photo ne declenche aucun evenement et l'ecran semble bloque.
   */
  const recevoir = (evenement) => {
    const fichier = evenement.target.files && evenement.target.files[0];
    evenement.target.value = "";
    if (fichier) onFichier(fichier);
  };

  if (enCours) {
    return (
      /* TEXTE-NOUVEAU
         Repli d'attente, quand l'appelant ne fournit pas son propre
         message. Nouveau lui aussi : l'application d'origine n'avait pas
         ce composant partage. */
      <Btn variant="ghost" icon={Icone} disabled style={{ width: "100%", ...style }}>
        {libelleEnCours || "Analyse en cours..."}
      </Btn>
      /* FIN-TEXTE-NOUVEAU */
    );
  }

  return (
    /* TEXTE-NOUVEAU
       Les libelles « Prendre une photo » et « Choisir une photo »
       n'existent pas dans l'application d'origine, qui n'avait qu'un seul
       bouton et un seul champ de fichier. C'est precisement ce qui privait
       les clientes Android de leur appareil photo : le selecteur systeme
       n'expose pas toujours la camera depuis une application installee.
       Nommer les deux voies est le correctif. */
    <div style={{ display: "flex", gap: 8, ...style }}>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={champAppareil}
        style={{ display: "none" }}
        onChange={recevoir}
      />
      <input type="file" accept="image/*" ref={champGalerie} style={{ display: "none" }} onChange={recevoir} />

      <Btn
        variant="ghost"
        icon={Camera}
        onClick={() => champAppareil.current?.click()}
        style={{ flex: 1, fontSize: 12.5 }}
      >
        {libelleAppareil}
      </Btn>
      <Btn
        variant="ghost"
        icon={Upload}
        onClick={() => champGalerie.current?.click()}
        style={{ flex: 1, fontSize: 12.5 }}
      >
        {libelleGalerie}
      </Btn>
    </div>
    /* FIN-TEXTE-NOUVEAU */
  );
}
