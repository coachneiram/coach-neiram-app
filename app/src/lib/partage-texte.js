/**
 * Partage d'un texte (liste de courses du menu de la semaine), repris de
 * l'app Neiram le 24/10/2026.
 *
 * Dans l'ordre : partage du téléphone (navigator.share), sinon copie dans
 * le presse-papiers. L'app coach est une PWA sans couche native : la
 * branche « partage natif » de l'app Neiram n'a pas lieu d'être ici.
 *
 * Rend « shared », « cancelled », « copied » ou « failed ». Le navigateur
 * est injectable pour les tests.
 */

export async function partagerTexte({ titre, texte, url }, env = {}) {
  const nav = env.navigator ?? (typeof navigator !== "undefined" ? navigator : null);
  if (nav && typeof nav.share === "function") {
    try {
      await nav.share({ title: titre, text: texte, url });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
      // Autre échec : on tente la copie.
    }
  }
  if (nav && nav.clipboard && typeof nav.clipboard.writeText === "function") {
    try {
      await nav.clipboard.writeText(url && !texte.includes(url) ? `${texte} ${url}` : texte);
      return "copied";
    } catch (e) {
      return "failed";
    }
  }
  return "failed";
}
