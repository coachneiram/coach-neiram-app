/**
 * Compléments alimentaires (repris de l'app Neiram le 24/10/2026, tout
 * inclus dans l'app coach) : ceux qui ont des preuves, pour TON objectif et
 * TA discipline. L'alimentation d'abord ; un complément ne compense pas un
 * déficit de sommeil, d'entraînement ou d'assiette.
 *
 * Référentiels : consensus du CIO (Maughan et al. 2018, BJSM), cadre de
 * l'Australian Institute of Sport (groupes A à D), positions de l'ISSN
 * (créatine 2017, caféine 2021, bêta-alanine 2015, protéines 2017),
 * avis de l'ANSES. Groupe A = preuves solides en contexte sportif ;
 * B = preuves émergentes ; C = preuves insuffisantes ; D = à éviter
 * (interdit ou risque de contamination élevé).
 *
 * Sportif soumis aux contrôles : uniquement des produits certifiés
 * (norme européenne EN 17444, qui a remplacé la norme française NF V94-001, ou Informed Sport ; l'ANSES le rappelle en 2024) ; le risque de
 * contamination par une substance interdite existe même sans intention.
 *
 * Avant 18 ans : seulement les aliments du sport (protéines en dépannage,
 * boissons et gels glucidiques, électrolytes) et les compléments prescrits
 * (ANSES 2016). Pendant une grossesse ou un allaitement, ou avec un
 * traitement : avis médical.
 */

/**
 * Familles de sport (lib/activites.js de l'app grand public) ramenees aux
 * disciplines des complements. L'app coach n'a pas encore le module « Tous
 * les sports » : une seance d'activite n'est reconnue que si elle porte sa
 * famille (`activite.famille`). Les seances de musculation et de force
 * athletique, elles, se reconnaissent a leurs exercices.
 */
const DISCIPLINE_PAR_FAMILLE = {
  endurance: "endurance",
  collectif: "collectif",
  raquette: "collectif",
  combat: "combat",
  salle: "muscu",
  eau: "endurance",
  pleinair: "endurance"
};

export const COMPLEMENTS = [
  {
    id: "creatine",
    nom: "Créatine monohydrate",
    niveau: "A",
    pour: ["force", "muscu", "collectif", "combat", "senior", "vegetal"],
    dose: "3 à 5 g par jour, tous les jours, à n'importe quel moment (charge facultative : 20 g/j en 4 prises pendant 5 à 7 jours).",
    effet: "Plus de force et de masse maigre avec la musculation, meilleure répétition des efforts courts et intenses. Gain de 1 à 2 kg (eau dans le muscle) les premières semaines.",
    precautions: "Maladie rénale ou anti-inflammatoires au long cours : pas sans avis médical. Elle fait monter la créatinine d'une prise de sang : préviens ton médecin. Prise de poids d'eau (0,5 à 1,5 kg) à anticiper avant une pesée.",
    source: "ISSN 2017 (Kreider) ; CIO 2018"
  },
  {
    id: "cafeine",
    nom: "Caféine",
    niveau: "A",
    pour: ["force", "muscu", "endurance", "collectif", "combat"],
    dose: "3 à 6 mg/kg, 30 à 60 min avant l'effort (1 à 3 mg/kg suffisent souvent). Café ou gélule.",
    effet: "Endurance, force, vigilance et effort perçu plus bas : gains de quelques pour cent.",
    precautions: "Sommeil : pas dans les 6 h avant le coucher. Max 200 mg par prise et 400 mg/j (EFSA). Troubles cardiaques, hypertension, anxiété, grossesse, certains médicaments (fluvoxamine, ciprofloxacine) : avis médical. L'ANSES appelle à la prudence autour de l'effort.",
    source: "ISSN 2021 (Guest) ; EFSA 2015"
  },
  {
    id: "proteines",
    nom: "Protéines en poudre (lactosérum ou végétales)",
    niveau: "A",
    pour: ["force", "muscu", "endurance", "collectif", "combat", "perte", "senior", "vegetal"],
    dose: "Seulement pour compléter : 20 à 40 g par prise quand l'alimentation n'atteint pas ton objectif de protéines.",
    effet: "Aide pratique pour atteindre 1,6 g/kg/j et plus ; pas plus efficace que les mêmes protéines dans l'assiette.",
    precautions: "Allergie au lait : préférer une protéine végétale. Maladie rénale : avis médical.",
    source: "ISSN 2017 (Jäger) ; Morton 2018"
  },
  {
    id: "beta-alanine",
    nom: "Bêta-alanine",
    niveau: "A",
    pour: ["combat", "collectif", "endurance-courte"],
    dose: "3,2 à 6,4 g par jour en plusieurs prises de 0,8 à 1,6 g, pendant au moins 4 semaines.",
    effet: "Efforts intenses de 30 s à 10 min (combat, aviron, 400-1500 m, sports collectifs) : gain modeste.",
    precautions: "Picotements sans danger : prises fractionnées ou formes à libération lente.",
    source: "ISSN 2015 (Trexler) ; CIO 2018"
  },
  {
    id: "bicarbonate",
    nom: "Bicarbonate de sodium",
    niveau: "A",
    pour: ["combat", "endurance-courte"],
    dose: "0,2 à 0,3 g/kg, 60 à 180 min avant l'effort, avec un repas.",
    effet: "Efforts très intenses de 1 à 10 min et efforts répétés.",
    precautions: "Troubles digestifs fréquents : à tester à l'entraînement, jamais pour la première fois en compétition. Riche en sodium : hypertension ou traitement antihypertenseur, avis médical.",
    source: "ISSN 2021 (Grgic) ; CIO 2018"
  },
  {
    id: "nitrate",
    nom: "Nitrates (jus de betterave)",
    niveau: "A",
    pour: ["endurance", "collectif"],
    dose: "6 à 8 mmol de nitrate (environ 500 ml de jus ou un shot concentré), 2 à 3 h avant l'effort.",
    effet: "Endurance et efforts intermittents, surtout chez les sportifs non élites.",
    precautions: "Urines colorées sans gravité. Pas de bain de bouche antiseptique (il bloque l'effet). Traitement par dérivés nitrés ou contre les troubles de l'érection : avis médical (risque d'hypotension).",
    source: "CIO 2018 ; Senefeld 2020 (méta-analyse)"
  },
  {
    id: "glucides-effort",
    nom: "Boissons, gels et barres glucidiques",
    niveau: "A",
    pour: ["endurance"],
    dose: "Effort de plus de 1 h : 30 à 60 g de glucides par heure ; plus de 2 h 30 : jusqu'à 90 g/h (mélange glucose-fructose).",
    effet: "Retarde la fatigue sur les efforts longs.",
    precautions: "À entraîner : l'intestin s'habitue progressivement.",
    source: "Thomas, Erdman et Burke 2016 (ACSM/AND/DC)"
  },
  {
    id: "electrolytes",
    nom: "Électrolytes (sodium)",
    niveau: "A",
    pour: ["endurance", "combat"],
    dose: "Efforts longs ou chauds : boisson à 300-600 mg de sodium par litre. Après une pesée : boire avec du sel.",
    effet: "Hydratation et prévention des crampes liées au manque de sel.",
    precautions: "Hypertension : avis médical.",
    source: "ACSM 2007 ; Thomas 2016"
  },
  {
    id: "vitamine-d",
    nom: "Vitamine D",
    niveau: "A",
    pour: ["general", "senior", "vegetal", "force", "muscu", "endurance", "collectif", "combat"],
    dose: "Seulement en cas de manque (prise de sang) ou de faible exposition au soleil l'hiver : selon l'avis de ton médecin.",
    effet: "Santé osseuse et musculaire si tu en manques ; aucun effet si ton taux est normal.",
    precautions: "Surdosage possible : ne pas cumuler plusieurs produits. Avis médical.",
    source: "CIO 2018 (groupe médical) ; ANSES"
  },
  {
    id: "fer",
    nom: "Fer",
    niveau: "A",
    pour: ["endurance", "femme"],
    dose: "Uniquement si une prise de sang montre une carence (ferritine basse), prescrit et suivi par un médecin.",
    effet: "Corrige la fatigue et la baisse de performance liées à la carence.",
    precautions: "Jamais sans dosage : un excès de fer est toxique.",
    source: "CIO 2018 ; Sim 2019"
  },
  {
    id: "b12",
    nom: "Vitamine B12",
    niveau: "A",
    pour: ["vegetal"],
    dose: "Indispensable si tu ne manges aucun produit animal : par exemple 25 à 100 µg par jour ou 2 000 µg une fois par semaine.",
    effet: "Évite une carence grave (anémie, troubles neurologiques).",
    precautions: "Sans danger aux doses usuelles.",
    source: "ANSES 2021 ; recommandations végétaliennes"
  },
  {
    id: "omega-3",
    nom: "Oméga-3 (EPA/DHA, ou algues pour les végétaliens)",
    niveau: "B",
    pour: ["general", "vegetal", "senior"],
    dose: "Si tu manges moins de 2 portions de poisson gras par semaine : environ 250 à 500 mg d'EPA + DHA par jour.",
    effet: "Santé cardiovasculaire ; effets sur la performance et la récupération encore incertains.",
    precautions: "Anticoagulants : avis médical.",
    source: "EFSA 2010 ; CIO 2018"
  },
  {
    id: "collagene",
    nom: "Collagène + vitamine C",
    niveau: "B",
    pour: ["force", "collectif", "combat", "endurance"],
    dose: "10 à 15 g de collagène hydrolysé (ou gélatine) avec 50 mg de vitamine C, 30 à 60 min avant une séance.",
    effet: "Piste prometteuse pour les tendons et ligaments ; preuves encore limitées.",
    precautions: "Pas un apport de protéines complet.",
    source: "Shaw 2017 ; AIS groupe B"
  }
];

/** À éviter ou inutiles, avec la raison. */
export const A_EVITER = [
  { nom: "Brûleurs de graisse et « détox »", raison: "Aucune preuve d'efficacité, risques cardiaques (stimulants), contamination fréquente." },
  { nom: "BCAA", raison: "Inutiles si tu atteins ton objectif de protéines (les protéines complètes en contiennent déjà)." },
  { nom: "Ashwagandha", raison: "L'ANSES (2024) déconseille ces compléments : effets indésirables (foie, thyroïde) signalés." },
  { nom: "Boosters de testostérone, SARM, prohormones", raison: "Inefficaces ou dangereux, souvent interdits par l'Agence mondiale antidopage." },
  { nom: "Pré-workouts très stimulants", raison: "L'ANSES a recensé des effets cardiaques graves (dont 2 décès) liés aux compléments pour sportifs ; contaminations fréquentes (DMAA, synéphrine)." },
  { nom: "HMB, citrulline, L-carnitine", raison: "Preuves faibles ou nulles chez le pratiquant entraîné (CIO 2018)." }
];

/** Discipline principale sur 60 jours, d'après les séances. */
export function disciplinePrincipale(seances, aujourdhui) {
  const compte = {};
  const depuis = aujourdhui ? new Date(new Date(aujourdhui + "T12:00:00") - 60 * 86400000).toISOString().slice(0, 10) : "";
  for (const s of seances || []) {
    if (!s || (depuis && s.date < depuis)) continue;
    let d = null;
    if (s.activite) {
      d = DISCIPLINE_PAR_FAMILLE[s.activite.famille] || null;
    } else if ((s.exercises || []).some((e) => e && e.mode === "powerlifting")) d = "force";
    else if ((s.exercises || []).length) d = "muscu";
    if (d) compte[d] = (compte[d] || 0) + 1;
  }
  const tri = Object.entries(compte).sort((a, b) => b[1] - a[1]);
  return tri.length ? tri[0][0] : null;
}

/**
 * Compléments pertinents pour ce profil. Rend { bloque, raison, liste,
 * aEviter, discipline } ; `bloque` : avant 18 ans, grossesse, allaitement.
 */
export function complementsPour(profile, { seances = [], aujourdhui } = {}) {
  const p = profile || {};
  if (Number(p.age) > 0 && Number(p.age) < 18) {
    // ANSES 2016 : seulement les aliments du sport, et ce qui est prescrit.
    return {
      bloque: false,
      mineur: true,
      raison: "Avant 18 ans : pas de compléments de performance (ANSES 2016). Seulement les aliments du sport, et ce que prescrit ton médecin.",
      liste: COMPLEMENTS.filter((c) => ["proteines", "glucides-effort", "electrolytes"].includes(c.id)),
      aEviter: A_EVITER
    };
  }
  if (p.situation) {
    return { bloque: true, raison: "Pendant la grossesse ou l'allaitement, les compléments se décident avec ta sage-femme ou ton médecin (acide folique, fer, vitamine D, iode…).", liste: [], aEviter: A_EVITER };
  }
  const discipline = p.categoriePoids?.actif && p.categoriePoids.federation === "ipf" ? "force" : disciplinePrincipale(seances, aujourdhui);
  const profils = new Set(["general"]);
  if (discipline) profils.add(discipline);
  if (discipline === "combat" || discipline === "endurance") profils.add("endurance-courte");
  if (Number(p.age) >= 65) profils.add("senior");
  if (p.dietType === "vegetalien" || p.dietType === "vegetarien") profils.add("vegetal");
  if (p.sex === "femme") profils.add("femme");
  if (p.goal === "perte") profils.add("perte");
  const renal = Array.isArray(p.contraintesSante) && p.contraintesSante.includes("renal");
  const liste = COMPLEMENTS.filter((c) => c.pour.some((x) => profils.has(x)))
    .filter((c) => !(renal && (c.id === "creatine" || c.id === "proteines")))
    .filter((c) => !(c.id === "b12" && p.dietType !== "vegetalien"))
    .sort((a, b) => a.niveau.localeCompare(b.niveau));
  return { bloque: false, discipline, liste, aEviter: A_EVITER };
}

export const LIBELLES_DISCIPLINE = {
  force: "force athlétique",
  muscu: "musculation",
  endurance: "endurance",
  collectif: "sports collectifs et raquettes",
  combat: "sports de combat"
};
