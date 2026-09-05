/**
 * Export d'une sauvegarde vers un fichier.
 *
 * Portage fidele de exportAllData (index.html, ligne 481) et slugName
 * (2037).
 *
 * La construction des donnees vit dans stockage.js ; ce module ne
 * s'occupe que de les livrer au client, ce qui est le point delicat sur
 * telephone.
 *
 * Deux chemins, dans cet ordre :
 *  1. le partage natif quand le telephone le propose. C'est ce qui permet
 *     d'envoyer la sauvegarde directement dans Drive, WhatsApp ou un mail
 *     sans passer par le dossier Telechargements, introuvable sur iPhone.
 *  2. le telechargement classique sinon.
 *
 * Un partage annule par le client renvoie « cancelled » et non une erreur :
 * il a change d'avis, ce n'est pas une panne, et lui afficher un message
 * d'echec serait faux.
 */

import { todayISO } from "./dates.js";

/** Nom de fichier lisible et sans caractere problematique. */
export function slugNom(nom) {
  return (
    String(nom || "client")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "client"
  );
}

/** Nom du fichier de sauvegarde, date du jour comprise. */
export const nomFichierSauvegarde = (nomProfil, date = todayISO()) =>
  `sauvegarde-coach-neiram-${slugNom(nomProfil)}-${date}.json`;

/**
 * Livre la sauvegarde au client.
 *
 * Renvoie « shared », « downloaded » ou « cancelled ». Les dependances au
 * navigateur sont injectables pour rester testable.
 */
export async function exporterSauvegarde(sauvegarde, nomProfil, env = {}) {
  const nav = env.navigator ?? (typeof navigator !== "undefined" ? navigator : null);
  const doc = env.document ?? (typeof document !== "undefined" ? document : null);
  const urlApi = env.URL ?? (typeof URL !== "undefined" ? URL : null);

  const contenu = JSON.stringify(sauvegarde);
  const nomFichier = nomFichierSauvegarde(nomProfil);
  const blob = new Blob([contenu], { type: "application/json" });
  const fichier = new File([blob], nomFichier, { type: "application/json" });

  if (nav && nav.canShare && nav.canShare({ files: [fichier] })) {
    try {
      await nav.share({ files: [fichier], title: "Sauvegarde Coach Neiram" });
      return "shared";
    } catch (e) {
      // Le client a ferme la feuille de partage : ce n'est pas une panne.
      if (e && e.name === "AbortError") return "cancelled";
      // Tout autre echec bascule sur le telechargement plutot que de
      // laisser le client sans sauvegarde.
    }
  }

  if (!doc || !urlApi) throw new Error("export-impossible");

  const url = urlApi.createObjectURL(blob);
  const lien = doc.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  doc.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => urlApi.revokeObjectURL(url), 4000);
  return "downloaded";
}
