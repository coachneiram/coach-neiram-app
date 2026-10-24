/**
 * Ouvre un tuto depuis n'importe quel ecran : le bouton « ? » d'une carte
 * (SectionTitle avec `tuto`, ou LienTuto) envoie l'evenement, App.jsx ouvre
 * la fenetre du tuto (ui/Tutos.jsx).
 */

export const EVENEMENT_TUTO = "neiram-tuto";

export function ouvrirTuto(id) {
  try {
    window.dispatchEvent(new CustomEvent(EVENEMENT_TUTO, { detail: id }));
  } catch (e) {
    // Sans evenement : le tuto reste dans le guide (Reglages).
  }
}
