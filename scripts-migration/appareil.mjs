/**
 * L'appareil emule par les scripts de fumee.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER
 * ─────────────────────────────────────────────────────────────────────
 *
 * Le seul bug signale par une vraie cliente pendant cette migration etait
 * SPECIFIQUE A ANDROID : le selecteur de fichiers n'exposait pas l'appareil
 * photo depuis une application installee sur l'ecran d'accueil. Sur iPhone,
 * tout allait bien — et c'est precisement pour ca que personne ne l'a vu
 * avant qu'une cliente ne le signale.
 *
 * Sept scripts sur seize emulaient un iPhone 13, un seul un Pixel 7. La
 * moitie Android de la clientele reposait donc sur un seul script.
 *
 * L'appareil se choisit desormais par la variable APPAREIL, sans rien
 * changer par defaut : chaque script garde le sien. La chaine
 * d'integration lance les deux passes en parallele, donc sans allonger
 * l'attente.
 */

// « playwright-core » plutot que « playwright » : ce module ne lit que la
// TABLE des appareils, de simples donnees. Le paquet complet telecharge des
// navigateurs a l'installation, ce dont la chaine de tests unitaires n'a
// aucun besoin — et playwright-core est de toute facon installe avec
// playwright, donc les scripts de fumee ne changent pas.
import { devices } from "playwright-core";

/**
 * Rend le descripteur d'appareil a emuler.
 *
 * `defaut` est celui du script quand APPAREIL n'est pas fournie — ce qui
 * garde le comportement d'origine pour qui lance un script a la main.
 */
export function appareil(defaut = "iPhone 13") {
  const nom = process.env.APPAREIL || defaut;
  const descripteur = devices[nom];
  // Un nom inconnu rendrait `undefined`, et Playwright ouvrirait un
  // navigateur de bureau sans rien signaler : la passe mobile ne testerait
  // plus rien, en restant verte.
  if (!descripteur) {
    throw new Error(
      `Appareil inconnu : « ${nom} ». Exemples valides : "iPhone 13", "Pixel 7", "Galaxy S9+".`
    );
  }
  return descripteur;
}

/** Nom de l'appareil reellement emule, pour l'afficher dans les sorties. */
export const nomAppareil = (defaut = "iPhone 13") => process.env.APPAREIL || defaut;

/**
 * Aides deja vues (24 octobre 2026) : tutos des onglets et accord pour
 * l'IA. A passer a `contexte.addInitScript` dans les scripts qui testent
 * autre chose : sans elles, le tuto de Séances ou la fenetre d'accord
 * s'ouvrent par-dessus l'ecran teste. fumee-reprises-neiram.mjs, lui, teste
 * ces aides et ne l'utilise pas.
 */
export function sansAides() {
  try {
    if (localStorage.getItem("neiram_tutos_vus") === null) {
      localStorage.setItem(
        "neiram_tutos_vus",
        JSON.stringify(["journal", "repas", "nutrition", "sommeil", "mensurations", "entrainements", "tendances"])
      );
    }
    if (localStorage.getItem("cn_consentement_ia") === null) {
      localStorage.setItem("cn_consentement_ia", JSON.stringify({ accepte: true, version: 2, le: "2026-10-24T00:00:00.000Z" }));
    }
  } catch (e) {
    // Page sans stockage : rien a preparer.
  }
}
