/**
 * Onglets de l'application.
 *
 * Repris de TABS (index.html, ligne 216).
 *
 * C'est de la donnee, pas de l'affichage : elle vit donc ici, hors des
 * composants, pour rester verifiable par les tests. Les icones sont
 * rattachees dans la coque.
 *
 * Les libelles courts servent la barre du bas des telephones, ou sept
 * boutons doivent tenir sur la largeur d'un ecran — d'ou « Séances » a la
 * place d'« Entraînements ».
 *
 * L'ordre compte : le client tape au meme endroit tous les jours sans
 * regarder. Le changer lui ferait ouvrir le mauvais ecran pendant des
 * semaines sans qu'il comprenne pourquoi.
 */

export const ONGLETS = [
  { id: "entrainements", label: "Entraînements", short: "Séances" },
  { id: "repas", label: "Repas", short: "Repas" },
  { id: "nutrition", label: "Nutrition", short: "Nutrition" },
  { id: "sommeil", label: "Sommeil", short: "Sommeil" },
  { id: "mensurations", label: "Mensurations", short: "Mesures" },
  { id: "journal", label: "Journal", short: "Journal" },
  { id: "tendances", label: "Tendances", short: "Tendances" }
];

/**
 * Sections de repas d'une journee.
 *
 * Repris de MEAL_SECTIONS (index.html, ligne ~1638). Les emojis font partie
 * du libelle dans l'application actuelle : ils servent de reperes visuels
 * pour retrouver une section d'un coup d'oeil en faisant defiler.
 */
export const SECTIONS_REPAS = [
  { id: "petit-dejeuner", label: "Petit-déjeuner", icon: "🌅" },
  { id: "dejeuner", label: "Déjeuner", icon: "☀️" },
  { id: "gouter", label: "Collation", icon: "🍎" },
  { id: "diner", label: "Dîner", icon: "🌙" }
];
