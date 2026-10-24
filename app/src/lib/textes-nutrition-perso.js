/**
 * Textes de la nutrition reprise de l'app Neiram le 24/10/2026 : repere
 * sur mesure, categorie de poids, complements, contraintes alimentaires et
 * allergenes des produits scannes. Les ecrans (ui/CarteObjectifsSurMesure.jsx,
 * ui/CarteComplements.jsx, ecrans/ChampsProfil.jsx,
 * ecrans/RechercheAliment.jsx) ne font que les afficher.
 *
 * Le ton suit l'app coach : tutoiement, et le coach reste la reference.
 * Les objectifs qu'il fixe ne bougent jamais ; le calcul sur mesure n'est
 * qu'un repere.
 */

const virgule = (v) => String(v).replace(".", ",");

export const TEXTES_NUTRITION_PERSO = {
  titre: "🎯 Repère d'après tes données",
  intro:
    "Les objectifs fixés par ton coach restent ceux qui comptent : ce repère ne les modifie pas. Il est calculé d'après tes réponses ci-dessous, pour en parler avec lui.",
  personnaliser: "Mes réponses",
  fermer: "Fermer",
  resume:
    "Rythme de perte ou de prise, grossesse, santé, catégorie de poids, macros au gramme près ou selon tes jours d'entraînement.",
  ligneRepere: (c) => `${c.calories} kcal · P ${c.protein} g · G ${c.carbs} g · L ${c.fat} g`,
  ligneReperesJour: (c) => `Fibres : ${c.fibres} g · Boissons : environ ${virgule(c.eauL)} L par jour`,
  ecartCoach: (repere, coach) => {
    if (!coach || !coach.calories || !repere || !repere.calories) return null;
    const ecart = repere.calories - coach.calories;
    if (Math.abs(ecart) < 50) return "Ton repère est proche des objectifs de ton coach.";
    return `Écart avec les objectifs de ton coach : ${ecart > 0 ? "+" : "−"}${Math.abs(ecart)} kcal. Parles-en avec lui avant de changer quoi que ce soit.`;
  },
  sansDonnees: "Complète ton profil dans les réglages pour calculer ce repère.",
  alerte: (a) => `⚠️ ${a}`,
  local:
    "Tes réponses (grossesse, santé, catégorie de poids) restent sur ton téléphone : elles ne sont envoyées ni à ton coach ni à l'IA.",

  // Questionnaire.
  rythmePerte: "Rythme de perte",
  rythmePrise: "Rythme de prise",
  rythmeAuto: "Automatique (selon l'objectif)",
  situation: "Situation",
  sante: "Santé",
  noteMasseGrasse: "Ta masse grasse se note dans Mesures : avec elle, ton métabolisme est calculé plus finement.",
  titreCategorie: "Catégorie de poids (compétition)",
  titreMacros: "Macros sur mesure",
  mode: "Mode",
  modes: [
    { id: "", label: "Automatique, avec mes réglages ci-dessous" },
    { id: "grammes", label: "Je saisis mes macros en grammes" }
  ],
  proteinesG: "Protéines (g)",
  glucidesG: "Glucides (g)",
  lipidesG: "Lipides (g)",
  proteinesGKg: "Protéines (g/kg)",
  lipidesPct: "Lipides (% des kcal)",
  auto: "auto",
  cyclage: "Plus de glucides les jours d'entraînement",
  cyclageDetail: "+20 % les jours de séance, un peu moins les jours de repos : même budget sur la semaine.",

  // Categorie de poids.
  categorieCase: "Je prépare une compétition dans une catégorie de poids",
  federation: "Sport / fédération",
  limite: "Limite de la catégorie (kg)",
  aucuneLimite: "—",
  libelleLimite: (k) => `-${k} kg`,
  exempleLimite: "ex. 74",
  datePesee: "Date de la pesée",
  pesee: "Pesée",

  // Explication.
  commentCalcule: "Comment c'est calculé",
  avertissement: "Repères généraux, qui ne remplacent ni l'avis de ton coach ni celui d'un professionnel de santé."
};

export const TEXTES_COMPLEMENTS = {
  titre: "💊 Compléments utiles pour toi",
  intro: "L'assiette d'abord : un complément ne remplace ni l'alimentation, ni le sommeil, ni l'entraînement.",
  selection: (libelle) => ` Sélection pour la ${libelle} (d'après tes séances).`,
  niveaux: {
    A: "Preuves solides",
    B: "Preuves émergentes",
    C: "Preuves insuffisantes"
  },
  dose: "Dose :",
  precautions: "Précautions :",
  source: (s) => `Source : ${s}`,
  aEviter: "À éviter",
  nomEvite: (nom) => `${nom} : `,
  pied:
    "Compétiteur contrôlé : uniquement des produits certifiés (norme EN 17444 ou Informed Sport), achetés hors des sites inconnus. Effet indésirable : signale-le à la nutrivigilance de l'ANSES. Traitement, grossesse, maladie : demande l'avis de ton médecin. Parles-en aussi à ton coach. Repères généraux, pas un avis médical."
};

export const TEXTES_CONTRAINTES_ALIM = {
  titre: "Contraintes alimentaires",
  aide: "Cumulables avec ton régime. Les aliments proposés et le Coach IA en tiennent compte ; tes objectifs ne changent pas."
};

export const TEXTES_ALLERGENES_PRODUIT = {
  contient: (liste) => `⛔ Contient : ${liste} (dans tes allergies)`,
  traces: (liste) => `⚠️ Traces possibles : ${liste}`
};
