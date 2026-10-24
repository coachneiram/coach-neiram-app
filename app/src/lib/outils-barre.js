/**
 * Outils de salle (inspires de Hevy, Strong, Fitbod) :
 *  - disques a mettre de chaque cote de la barre pour une charge donnee ;
 *  - series d'echauffement progressives avant la charge de travail.
 */

export const BARRES = [
  { poids: 20, libelle: "Barre olympique 20 kg" },
  { poids: 15, libelle: "Barre 15 kg" },
  { poids: 10, libelle: "Barre EZ / courte 10 kg" },
  { poids: 0, libelle: "Sans barre (machine)" }
];
export const DISQUES = [25, 20, 15, 10, 5, 2.5, 1.25];

const arrondi = (v, pas = 0.01) => Math.round(v / pas) * pas;

/**
 * Disques par cote pour atteindre `charge` avec une barre de `barre` kg.
 * Rend { parCote: [kg...], reste, total } ; `reste` > 0 si la charge exacte
 * est impossible avec les disques disponibles (on s'arrete en dessous).
 */
export function disquesParCote(charge, barre = 20, disques = DISQUES) {
  const c = Number(charge);
  if (!Number.isFinite(c) || c <= 0) return { parCote: [], reste: 0, total: 0 };
  let resteCote = arrondi((c - barre) / 2);
  if (resteCote < 0) return { parCote: [], reste: arrondi(c - barre), total: barre };
  const parCote = [];
  for (const d of [...disques].sort((a, b) => b - a)) {
    while (resteCote + 1e-9 >= d) {
      parCote.push(d);
      resteCote = arrondi(resteCote - d);
    }
  }
  const total = arrondi(barre + 2 * parCote.reduce((a, d) => a + d, 0));
  return { parCote, reste: arrondi(c - total), total };
}

/** Disques regroupes : [{ disque, nombre }]. */
export function regrouper(parCote) {
  const m = new Map();
  for (const d of parCote) m.set(d, (m.get(d) || 0) + 1);
  return [...m].map(([disque, nombre]) => ({ disque, nombre }));
}

/** Arrondi a la charge la plus proche faisable (pas de 2,5 kg, soit 1,25 par cote). */
export const arrondiCharge = (v, pas = 2.5) => Math.max(0, Math.round(Number(v) / pas) * pas);

/**
 * Series d'echauffement avant une charge de travail (barre vide, puis
 * 40 %, 60 %, 80 %), repetitions decroissantes. Rien sous 30 kg : la
 * premiere serie de travail suffit alors a s'echauffer.
 */
export function seriesEchauffement(charge, barre = 20) {
  const c = Number(charge);
  if (!Number.isFinite(c) || c < 30) return [];
  const paliers = [
    { pct: 0, reps: 10 },
    { pct: 0.4, reps: 5 },
    { pct: 0.6, reps: 3 },
    { pct: 0.8, reps: 2 }
  ];
  const sortie = [];
  for (const p of paliers) {
    const poids = p.pct === 0 ? barre || arrondiCharge(c * 0.3) : arrondiCharge(c * p.pct);
    if (poids <= 0 || poids >= c) continue;
    if (sortie.length && poids <= sortie[sortie.length - 1].poids) continue;
    sortie.push({ poids, reps: p.reps });
  }
  return sortie;
}

export const fmtKg = (v) => `${String(Math.round(Number(v) * 100) / 100).replace(".", ",")} kg`;

/**
 * Textes de l'outil (repris de l'app Neiram le 24 octobre 2026). Dans l'app
 * coach, tout est ouvert : l'echauffement n'est pas reserve a un abonnement.
 */
export const TEXTES_BARRE = {
  ouvrir: "🧮 Disques & échauffement pour",
  barre: "Barre",
  chaqueCoteBarre: "De chaque côté de la barre :",
  chaqueCote: "Disques de chaque côté :",
  barreSeule: "Barre seule",
  pasFaisable: "n'est pas faisable exactement :",
  avecDisques: "avec ces disques.",
  echauffement: "Échauffement conseillé :"
};
