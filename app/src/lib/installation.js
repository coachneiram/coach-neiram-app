/**
 * Bandeau « Installe l'appli sur ton ecran d'accueil » (7 octobre 2026).
 *
 * Il ne s'adresse qu'au client qui utilise l'application dans son
 * navigateur. Sur iPhone, c'est indispensable : sans installation, aucun
 * rappel ne peut s'afficher. Il disparait des que l'application est
 * ouverte depuis son icone, et le client peut le masquer deux semaines.
 */

export const CLE_INSTALLATION = "cn_installation_masquee";
export const MASQUAGE_JOURS = 14;

/** "installee", "ios", "android" ou "autre" (ordinateur : pas de bandeau). */
export function plateformeInstallation({ userAgent = "", installee = false } = {}) {
  if (installee) return "installee";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "autre";
}

/** L'application tourne-t-elle depuis son icone (mode autonome) ? */
export function estInstallee(env = globalThis) {
  try {
    if (env.navigator && env.navigator.standalone === true) return true;
    return !!(env.matchMedia && env.matchMedia("(display-mode: standalone)").matches);
  } catch (e) {
    return false;
  }
}

export function bandeauInstallationVisible({ plateforme, masqueJusqua = null, aujourdhui }) {
  if (plateforme !== "ios" && plateforme !== "android") return false;
  return !masqueJusqua || masqueJusqua < aujourdhui;
}

/** Date (AAAA-MM-JJ) jusqu'a laquelle le bandeau reste masque. */
export function finMasquage(aujourdhui, jours = MASQUAGE_JOURS) {
  const d = new Date(aujourdhui + "T12:00:00");
  d.setDate(d.getDate() + jours);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
