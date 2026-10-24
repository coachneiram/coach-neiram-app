/**
 * Textes de « Mes performances », du niveau officiel et de « Ma
 * transformation » (repris de l'app Neiram le 24/10/2026). Les écrans
 * (ui/CartePerformances.jsx, ui/NiveauPerformances.jsx,
 * ui/CarteTransformation.jsx) ne font que les afficher.
 */

import { fmtTemps } from "./performances.js";

const kg = (v) => `${String(v).replace(".", ",")} kg`;
const pts = (v) => String(v).replace(".", ",");
/** Écart de temps : « 45 s » sous la minute, « 1:12 » au-delà. */
export const ecartTemps = (e) => (e < 60 ? `${String(Math.round(e * 100) / 100).replace(".", ",")} s` : fmtTemps(e));
const categorie = (c) => `−${c.replace("+", "")} kg${c.endsWith("+") ? " et plus" : ""}`;

export const TEXTES_PERF = {
  titre: "🏆 Mes performances",
  intro:
    "Note tes meilleures performances : l'appli te donne ton niveau face aux grilles des fédérations. Elles partent dans le bilan que tu envoies à ton coach.",
  tonNiveau: "Ton niveau",
  tonNiveauForce: "Ton niveau FFForce",
  bassin: (b) => `Bassin de ${b} m`,
  unRmEstime: (v) => `1RM estimé depuis tes séries : ${kg(v)}`,
  placeholderRm: "1RM kg",
  total: (v) => `Total ${kg(v)}`,
  erreurTemps: "Temps à écrire comme 24:35 ou 1:42:10.",
  erreurCharge: "Charge non reconnue.",
  perfEn: (label, sec) => `${label} en ${fmtTemps(sec)}`,
  courseVide: "Note un chrono pour voir ton niveau FFA et les minima des championnats de France.",
  natationVide: "Note un chrono pour voir tes points World Aquatics et les repères FFN.",

  // Niveaux.
  sansPoids: "Note ton poids (onglet Mesures) pour connaître ta catégorie et ton niveau.",
  forceVide: "Note tes trois maxis pour voir ton niveau FFForce.",
  forceTotal: (total, n) => `Total ${kg(total)} : ${n.atteint ? `niveau ${n.atteint.libelle} (${n.atteint.id})` : "niveau départemental"}`,
  forceCategorie: (age, n) => `Catégorie ${age} ${categorie(n.categorie)} · grille FFForce ${n.saison}`,
  prochain: (p) => `Prochain : ${p.libelle} à ${kg(p.kg)}, encore ${kg(p.ecart)}.`,
  qualifFrance: (q) => `Championnats de France : ${kg(q.kg)} (N1) en open régional ou championnat régional${q.atteint ? " — c'est atteint ✅" : "."}`,
  franceElite: "France Élite open : les 7 premiers de chaque catégorie du classement fédéral, ouvert à partir de N2.",
  pointsGL: (v) => `Points IPF GL : ${pts(v)} (compare toutes les catégories entre elles).`,
  developpe: (bench, dc) =>
    `Développé couché seul ${kg(bench)} : ${dc.atteint ? `niveau ${dc.atteint.libelle}` : "niveau départemental"}${dc.prochain ? `, prochain ${dc.prochain.id} à ${kg(dc.prochain.kg)}` : ""}.`,
  haltVide: "Note ton arraché et ton épaulé-jeté pour voir ta série FFHM.",
  haltTotal: (total, n) => `Total ${kg(total)} : ${n.atteint ? `série ${n.atteint.libelle}` : "sous la série Débutant"}`,
  haltCategorie: (n) => `Catégorie ${categorie(n.categorie)} (IWF depuis le 01/08/2026) · séries FFHM ${n.saison}`,
  haltProchaine: (p) => `Prochaine série : ${p.libelle} à ${kg(p.kg)}, encore ${kg(p.ecart)}.`,
  haltFrance: (n) => `${n.categorieAge === "senior" ? "France Élite" : "France Élite jeunes"} : série ${n.qualificationFrance.libelle} (${kg(n.qualificationFrance.kg)}).`,
  haltHorsGrille: "Pas de grille FFHM pour cette catégorie et cet âge.",
  sinclair: (v) => `Total Sinclair : ${pts(v)} (coefficients 2025-2028).`,
  ffa: "Niveau FFA : ",
  sousD7: "sous D7",
  ffaProchain: (p) => ` · prochain ${p.id} en ${fmtTemps(p.temps)} (−${ecartTemps(p.ecart)})`,
  minima: (n) => `Minima France (${n.categorieAge}) : ${fmtTemps(n.minimaFrance.temps)}${n.minimaFrance.atteint ? " — atteint ✅" : ""}`,
  worldAquatics: "Points World Aquatics : ",
  recordMonde: " (1 000 = record du monde)",
  repere: (r) => `${r.libelle} : ${fmtTemps(r.temps)}${r.atteint ? " — atteint ✅" : ` (encore ${ecartTemps(r.ecart)})`}`,
  kg
};

export const TEXTES_TRANSFORMATION = {
  titre: "📈 Ma transformation",
  periodes: { j90: "90 jours", annee: "Cette année" },
  vide: "Pèse-toi au moins deux fois à 3 semaines d'écart (onglet Mesures, avec ta masse grasse si ta balance la donne) pour voir ta transformation.",
  poids: (a, b) => `Poids : ${kg(a)} → ${kg(b)}`,
  gras: (g) => `Gras perdu : ${kg(Math.max(0, g.perduKg))}${g.compteKg > 0 ? ` (${pts(g.pct)} % de ton poids de départ)` : ""}`,
  grasPris: (g) => `Masse grasse : +${kg(-g.perduKg)}`,
  muscle: (m) => `${m.source === "muscle" ? "Muscle pris" : "Masse maigre prise"} : ${m.prisKg >= 0 ? "+" : ""}${kg(m.prisKg)}`,
  plafonne:
    "Au-delà de 1 % du poids par semaine (gras) ou 0,25 kg par semaine (muscle), l'appli ne compte pas plus : c'est surtout de l'eau ou l'imprécision de la balance.",
  periode: (debut, fin, jours) => `Du ${debut} au ${fin} (${jours} jours).`,
  precision: "Pèse-toi dans les mêmes conditions : le matin, à jeun, après être allé aux toilettes. Une balance à impédance varie de plusieurs points d'une mesure à l'autre."
};

export const TEXTES_COMPARATEUR = {
  vide: "Ajoute une photo chaque semaine (même pose, même lumière, même tenue) : dès la 2e, tu pourras comparer avant et après.",
  titre: "Avant / après",
  pose: "Pose",
  avant: "Avant",
  apres: "Après",
  avantLe: (d) => `Avant : ${d}`,
  apresLe: (d) => `Après : ${d}`,
  etiquetteAvant: "AVANT",
  etiquetteApres: "APRÈS",
  curseur: "Glisser entre avant et après",
  poses: [
    { id: "face", label: "Face" },
    { id: "profil", label: "Profil" },
    { id: "dos", label: "Dos" }
  ]
};
