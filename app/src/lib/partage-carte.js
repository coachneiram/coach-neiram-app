/**
 * Partage de la carte de progres et invitation d'un ami.
 *
 * Meme logique que l'envoi du bilan (bilan-html.js) : le partage natif du
 * telephone quand il existe (Instagram, WhatsApp, Messages...), sinon un
 * repli qui marche partout. Les dependances au navigateur sont injectables
 * pour rester testables.
 *
 * Chaque fonction rend « shared », « downloaded »/« whatsapp », ou
 * « cancelled » quand le client ferme la feuille de partage — ce qui n'est
 * pas une panne et ne doit rien afficher d'alarmant.
 */

const navigateur = (env) => env.navigator ?? (typeof navigator !== "undefined" ? navigator : null);

/** Partage l'image ; a defaut, la telecharge. */
export async function partagerCarte(blob, nomFichier, env = {}) {
  const nav = navigateur(env);
  const Fichier = env.File ?? (typeof File !== "undefined" ? File : null);
  const fichier = Fichier ? new Fichier([blob], nomFichier, { type: "image/png" }) : null;

  if (nav && fichier && nav.canShare && nav.canShare({ files: [fichier] })) {
    try {
      await nav.share({ files: [fichier], title: "Mes progrès — Coach Neiram" });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
      // Autre echec : on telecharge plutot que de laisser le client sans rien.
    }
  }

  const doc = env.document ?? (typeof document !== "undefined" ? document : null);
  const urlApi = env.URL ?? (typeof URL !== "undefined" ? URL : null);
  if (!doc || !urlApi) throw new Error("partage-impossible");
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

/**
 * Invite un ami : feuille de partage du telephone, sinon WhatsApp avec le
 * message pre-rempli (le client choisit le destinataire).
 */
export async function inviterUnAmi(message, env = {}) {
  const nav = navigateur(env);
  if (nav && nav.share) {
    try {
      await nav.share({ text: message });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
    }
  }
  const ouvrir = env.ouvrir ?? ((url) => window.open(url, "_blank", "noopener"));
  ouvrir("https://wa.me/?text=" + encodeURIComponent(message));
  return "whatsapp";
}
