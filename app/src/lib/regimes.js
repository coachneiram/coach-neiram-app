/**
 * Regimes alimentaires : deux axes, filtrage, calibrage des macros.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POURQUOI DEUX AXES ET PLUS UN SEUL CHOIX
 * ─────────────────────────────────────────────────────────────────────
 *
 * Le profil ne proposait qu'un champ, « Régime alimentaire », qui melangeait
 * deux questions sans rapport :
 *
 *   - CE QUE LE CLIENT NE MANGE PAS (vegetarien, vegetalien, pescetarien) ;
 *   - COMMENT IL REPARTIT SES MACROS (keto, low carb, hyperproteine).
 *
 * Les entasser dans un seul menu rendait la moitie des combinaisons
 * inexprimables. Un vegetarien qui veut monter ses proteines devait choisir
 * entre dire qu'il est vegetarien et dire qu'il veut des proteines — et ce
 * n'est pas un cas de bord : ce sont precisement les vegetariens qui ont le
 * plus besoin de surveiller leur apport proteique. Meme chose pour un
 * pescetarien en low carb, ou un vegetalien en seche.
 *
 * Deux axes independants suppriment le probleme, et n'en ajoutent aucun :
 * une repartition « standard » est le defaut, et un client qui n'y touche
 * jamais garde exactement le comportement d'avant.
 *
 * COMPATIBILITE. Les profils existants n'ont qu'un champ `dietType`, qui
 * peut valoir « keto ». Il continue d'etre lu comme une repartition tant
 * que le client n'a pas rouvert son profil : voir repartitionDuProfil.
 * Aucun client ne voit ses objectifs changer parce qu'on a scinde un menu.
 *
 * ─────────────────────────────────────────────────────────────────────
 * CE QU'UN REGIME CHANGE, ET CE QU'IL NE CHANGE JAMAIS
 * ─────────────────────────────────────────────────────────────────────
 *
 *  1. LES ALIMENTS PROPOSES — l'axe des restrictions, plus le plafond de
 *     glucides du keto. Voir EXCLUSIONS et regimeOk dans aliments.js.
 *  2. LA REPARTITION DES MACROS — l'axe des repartitions, plus la
 *     majoration proteique des regimes vegetaux. Voir calibrageRegime.
 *
 * IL NE CHANGE JAMAIS LE TOTAL CALORIQUE. C'est le point le plus important
 * du fichier, et celui qu'on se trompe le plus souvent a vouloir bien
 * faire : la depense energetique d'un client depend de son corps, de son
 * activite et de son objectif — pas de la facon dont il repartit ce qu'il
 * mange.
 *
 * L'OBJECTIF, LUI, ENTRE DANS LE CALIBRAGE. Deux clients a la meme
 * repartition n'ont pas les memes besoins selon qu'ils sechent ou qu'ils
 * prennent : en deficit, les proteines protegent la masse maigre ; hors
 * deficit, les glucides servent a s'entrainer. Chaque repartition dit donc
 * ce qu'elle fait DANS CHAQUE CAS, et pas seulement dans l'absolu.
 */

import { DIET_TYPES, FOOD_DB } from "./catalogues.js";

/* ══════════════════════════════════════════════════════════════════════
   AXE 1 — CE QUE LE CLIENT NE MANGE PAS
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Restriction ajoutee apres la migration.
 *
 * Le pescetarien mange du poisson et des fruits de mer : c'est exactement
 * ce qui le distingue du vegetarien, et la seule raison de le proposer. Le
 * catalogue porte deja les etiquettes qu'il faut.
 */
const PESCETARIEN = { id: "pescetarien", label: "Pescétarien (poisson, sans viande)" };

/**
 * Restrictions proposees, dans l'ordre d'affichage.
 *
 * Les libelles des trois premieres viennent de la liste extraite de
 * index.html : les reecrire ici ferait diverger deux textes que le client
 * connait. « Kéto » n'y figure plus — ce n'est pas une restriction, c'est
 * une repartition, et il a change d'axe.
 */
export const RESTRICTIONS = [
  ...["aucun", "vegetarien", "vegetalien"].map((id) => DIET_TYPES.find((d) => d.id === id)).filter(Boolean),
  PESCETARIEN
];

/**
 * Familles d'aliments ecartees par les restrictions ajoutees.
 *
 * Les restrictions d'origine (vegetarien, vegetalien) gardent leurs regles
 * dans aliments.js, ecrites la-bas et verifiees ligne a ligne contre
 * index.html par tests/parite-aliments.test.mjs. On ne les rejoue pas ici :
 * deux implementations de la meme regle finissent toujours par diverger.
 */
export const EXCLUSIONS = {
  pescetarien: ["viande", "volaille"]
};

/**
 * Majoration des proteines des regimes vegetaux, en facteur.
 *
 * Les proteines vegetales sont moins bien utilisees que les animales :
 * profil en acides amines moins complet, digestibilite plus basse. Les
 * indices de qualite proteique (DIAAS) situent la plupart des sources
 * vegetales entre 0,6 et 0,8, contre 1,0 et plus pour l'oeuf, le lait ou
 * la viande. A apport egal, un vegetalien construit donc moins.
 *
 * +15 % en vegetalien, +10 % en vegetarien : le vegetarien garde les oeufs
 * et les produits laitiers, qui sont justement les sources completes.
 *
 * ATTENTION, CE CHOIX DEPLACE LES CHIFFRES DE CLIENTS EXISTANTS. Il est
 * assume : jusqu'ici l'application demandait a un vegetalien exactement le
 * meme apport qu'a un omnivore, ce qui revenait a lui en demander moins en
 * pratique.
 */
export const MAJORATION_PROTEINES = { vegetalien: 1.15, vegetarien: 1.1 };

/* ══════════════════════════════════════════════════════════════════════
   AXE 2 — COMMENT LE CLIENT REPARTIT SES MACROS
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Repartitions proposees, dans l'ordre d'affichage.
 *
 * « Standard » vient en tete et porte son statut dans son libelle : la
 * grande majorite des clients n'a aucune raison d'en changer, et un menu
 * de reglages avances sans defaut evident pousse a bricoler.
 *
 * VOLONTAIREMENT ABSENTS, et pour une raison a chaque fois :
 *
 *  - MEDITERRANEEN : ce qui le definit est la QUALITE des lipides (huile
 *    d'olive, poisson gras) et la place des legumes. Le catalogue ne porte
 *    pas cette information. On pourrait le reduire a « 35 % de lipides »,
 *    mais ce serait promettre un regime et n'en livrer que l'ombre.
 *  - JEUNE INTERMITTENT : c'est un horaire, pas une composition. Ni les
 *    macros ni les aliments ne bougent. Il a sa place dans les rappels.
 *  - HALAL, CASHER : il faudrait distinguer le porc du reste des viandes,
 *    et le catalogue ne porte qu'une etiquette « viande » globale.
 *  - SANS GLUTEN, SANS LACTOSE : deja proposes, et mieux, dans les
 *    allergies et intolerances du profil.
 */
export const REPARTITIONS = [
  { id: "standard", label: "Standard (recommandé)" },
  { id: "lowcarb", label: "Pauvre en glucides (low carb)" },
  { id: "keto", label: "Kéto (très faible en glucides)" },
  { id: "hyperproteine", label: "Hyperprotéiné (ultra protéiné)" }
];

/** Repartitions qui posent les glucides bas plutot que de les laisser absorber. */
const REPARTITIONS_GLUCIDES_BAS = ["keto", "lowcarb"];

/** Part minimale de glucides d'un « low carb » : en dessous, c'est du keto. */
const LOWCARB_MIN_G = 50;

/**
 * Part des calories laissee aux glucides en « pauvre en glucides ».
 *
 * DEUX VALEURS, PARCE QUE L'OBJECTIF CHANGE LE BESOIN. En deficit, baisser
 * les glucides est le levier habituel : ils servent moins, la seance est
 * plus courte, et la satiete vient des proteines et des lipides. Hors
 * deficit — prise de masse, performance — le meme client s'entraine en
 * volume, et le glycogene est ce qui lui permet de finir ses series. Un
 * pourcentage unique aurait handicape la moitie des cas.
 *
 * A LA DIFFERENCE DU KETO, CES BORNES SONT NEGOCIABLES : un low carb n'a
 * pas de seuil physiologique a tenir. C'est un curseur, pas un etat
 * metabolique — d'ou l'absence de plafond en grammes : quelqu'un qui mange
 * 3 500 kcal a droit a plus de glucides en valeur absolue que quelqu'un a
 * 1 800, tout en suivant le meme regime.
 */
const LOWCARB_PART_DEFICIT = 0.25;
const LOWCARB_PART_AUTRE = 0.3;

/**
 * Proteines en repartition hyperproteinee, en g/kg du poids de reference.
 *
 * 2,5 g/kg hors deficit, 2,8 g/kg en deficit. La litterature sur la
 * retention de masse maigre chez le pratiquant en seche situe l'interet
 * entre 2,3 et 3,1 g/kg de masse maigre ; l'application raisonne sur le
 * poids de reference (deja plafonne pres du poids cible), ce qui place ces
 * valeurs dans la meme plage.
 *
 * A comparer aux 2 g/kg du calcul standard et aux 2,2 g/kg de la seche de
 * force : cette repartition est bien un cran au-dessus, ce que son nom
 * promet.
 */
const HYPERPROTEINE_PAR_KG = 2.5;
const HYPERPROTEINE_PAR_KG_DEFICIT = 2.8;

/**
 * Garde-fou : au-dela de cette part des calories, les proteines cessent de
 * monter.
 *
 * Ce n'est pas une cible, c'est une butee. Elle ne mord que dans les cas
 * extremes — un client lourd sur un tres petit budget calorique — ou
 * continuer a appliquer la regle au poids ne laisserait plus de place aux
 * lipides ni aux glucides. Dans ces cas, la repartition se rapproche
 * silencieusement du calcul standard, ce qui est le bon comportement :
 * personne ne tient 60 % de ses calories en proteines.
 */
const HYPERPROTEINE_PART_MAX = 0.5;

/**
 * Plafond absolu des proteines, en g/kg, tous cumuls compris.
 *
 * Cette butee-la repond a une autre question que la precedente : non pas
 * « reste-t-il de la place dans l'assiette » mais « y a-t-il encore un
 * interet a monter ». Au-dela de 3 g/kg, aucune donnee ne montre de
 * benefice supplementaire sur la retention de masse maigre.
 *
 * Elle existe parce que les deux axes se cumulent : un vegetalien en
 * hyperproteine et en seche additionne 2,8 g/kg et une majoration de 15 %,
 * soit 3,2 g/kg. Sans plafond, deux reglages raisonnables pris separement
 * en produisaient un qui ne l'etait plus.
 *
 * Elle est INERTE hors de ce cumul : le calcul standard plafonne a
 * 2,2 g/kg, tres loin en dessous.
 */
const PROTEINES_PAR_KG_MAX = 3;

/** Cible de glucides en keto : 5 % des calories, bornee entre 20 et 50 g. */
const KETO_PART = 0.05;
const KETO_MIN_G = 20;
const KETO_MAX_G = 50;

/* ══════════════════════════════════════════════════════════════════════
   LECTURE D'UN PROFIL
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Restriction alimentaire du client.
 *
 * Un ancien profil dont `dietType` vaut « keto » n'a aucune restriction :
 * le keto a change d'axe, et le lire comme une restriction ecarterait la
 * viande de son catalogue sans raison.
 */
export function restrictionDuProfil(profile) {
  const valeur = profile && profile.dietType;
  return RESTRICTIONS.some((r) => r.id === valeur && valeur !== "aucun") ? valeur : "aucun";
}

/**
 * Repartition des macros du client.
 *
 * L'ordre de lecture est ce qui rend la scission indolore : le nouveau
 * champ prime, et a defaut l'ancien `dietType` est relu — un client passe
 * en keto avant la scission garde ses macros keto sans rien faire, et sans
 * meme avoir rouvert son profil.
 */
export function repartitionDuProfil(profile) {
  const choisie = profile && profile.repartitionMacros;
  if (REPARTITIONS.some((r) => r.id === choisie)) return choisie;

  const ancienne = profile && profile.dietType;
  return REPARTITIONS.some((r) => r.id === ancienne && ancienne !== "standard") ? ancienne : "standard";
}

/** Libelle affiche d'une restriction ou d'une repartition. */
export const libelleRegime = (id) =>
  [...RESTRICTIONS, ...REPARTITIONS].find((r) => r.id === id)?.label || id;

/**
 * Les deux axes d'un profil, resumes pour le bilan envoye au coach.
 *
 * UNE VALEUR INCONNUE EST RECOPIEE TELLE QUELLE plutot qu'ignoree. Un
 * `dietType` que ni l'un ni l'autre axe ne reconnait — une version plus
 * ancienne, une saisie a la main dans le stockage — reste une information
 * que le client a donnee sur son alimentation. La faire disparaitre du
 * brief du coach serait la pire des reponses : il croirait le champ vide.
 * Verifie par tests/bilan-ia.test.mjs contre le comportement d'origine.
 */
export function resumeRegime(profile) {
  const morceaux = [];
  const restriction = restrictionDuProfil(profile);
  const repartition = repartitionDuProfil(profile);
  if (restriction !== "aucun") morceaux.push(libelleRegime(restriction));
  if (repartition !== "standard") morceaux.push(libelleRegime(repartition));

  const brut = profile && profile.dietType;
  if (brut && brut !== "aucun" && brut !== restriction && brut !== repartition) {
    morceaux.push(libelleRegime(brut));
  }
  return morceaux.join(", ");
}

/** Ce client suit-il une repartition qui abaisse volontairement ses glucides ? */
export function estFaibleEnGlucides(profile) {
  return REPARTITIONS_GLUCIDES_BAS.includes(repartitionDuProfil(profile));
}

/* ══════════════════════════════════════════════════════════════════════
   CALIBRAGE
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Glucides cibles en regime cetogene, en grammes par jour.
 *
 * 20 g est le seuil bas classique d'induction, 50 g la limite haute
 * au-dela de laquelle la cetose n'est plus tenue chez la plupart des gens.
 * CES BORNES NE DEPENDENT PAS DE L'OBJECTIF : elles decrivent un etat
 * metabolique, pas une preference. Un client keto en prise de masse reste
 * un client keto — ce sont ses lipides qui montent, pas ses glucides.
 */
export function glucidesKeto(calories) {
  if (calories == null) return null;
  const part = (calories * KETO_PART) / 4;
  return Math.round(Math.min(KETO_MAX_G, Math.max(KETO_MIN_G, part)));
}

/** Glucides cibles en « pauvre en glucides », selon l'objectif. */
export function glucidesLowCarb(calories, enDeficit) {
  if (calories == null) return null;
  const part = enDeficit ? LOWCARB_PART_DEFICIT : LOWCARB_PART_AUTRE;
  return Math.round(Math.max(LOWCARB_MIN_G, (calories * part) / 4));
}

/**
 * Ce que le regime du client change dans la repartition de ses macros.
 *
 * Rend toujours un objet, meme pour un client sans regime : c'est
 * `majorationProteines` a 1 et rien d'autre. L'appelant n'a donc pas de
 * cas particulier a traiter.
 *
 * Trois leviers, qui se cumulent :
 *
 *  - `poseGlucides` + `glucides`   les glucides sont POSES a cette valeur,
 *      et les lipides absorbent le reste des calories. C'est l'inverse du
 *      calcul standard. `glucides` vaut null quand les calories ne sont
 *      pas calculables : la repartition s'applique quand meme, il n'y a
 *      simplement rien a poser.
 *  - `proteinesParKg`              remplace la regle au poids habituelle.
 *  - `majorationProteines`         facteur applique par-dessus, porte par
 *      la restriction alimentaire. C'est le seul endroit ou les deux axes
 *      se rencontrent.
 *
 * `contexte.enDeficit` vaut pour l'objectif « perte » comme pour une seche
 * de force : ce sont deux facons de dire la meme chose au corps.
 */
export function calibrageRegime(profile, contexte = {}) {
  const { calories = null, enDeficit = false } = contexte;
  const repartition = repartitionDuProfil(profile);

  const calibrage = {
    majorationProteines: MAJORATION_PROTEINES[restrictionDuProfil(profile)] || 1,
    proteinesParKgMax: PROTEINES_PAR_KG_MAX
  };

  if (repartition === "keto") {
    return { ...calibrage, poseGlucides: true, glucides: glucidesKeto(calories) };
  }
  if (repartition === "lowcarb") {
    return { ...calibrage, poseGlucides: true, glucides: glucidesLowCarb(calories, enDeficit) };
  }
  if (repartition === "hyperproteine") {
    return {
      ...calibrage,
      proteinesParKg: enDeficit ? HYPERPROTEINE_PAR_KG_DEFICIT : HYPERPROTEINE_PAR_KG,
      proteinesPartMax: HYPERPROTEINE_PART_MAX
    };
  }
  return calibrage;
}

/* ══════════════════════════════════════════════════════════════════════
   CE QUE LE CLIENT LIT
   ══════════════════════════════════════════════════════════════════════ */

const enDeficitProfil = (profile) =>
  !!(profile && (profile.goal === "perte" || profile.performanceDirection === "perte"));

/**
 * Phrases expliquant au client ce que ses reglages changent pour lui.
 *
 * Ecrites au present et a la deuxieme personne : elles s'affichent sous
 * ses propres reglages. Elles disent AUSSI ce qui ne change pas — un
 * client qui voit ses glucides s'effondrer sans explication conclut a un
 * bug, ou pire, mange au jugé.
 *
 * Rend un tableau, eventuellement vide : les deux axes peuvent avoir
 * quelque chose a dire en meme temps.
 */
export function descriptionRegime(profile) {
  const phrases = [];
  const restriction = restrictionDuProfil(profile);
  const repartition = repartitionDuProfil(profile);
  const enDeficit = enDeficitProfil(profile);

  if (restriction === "pescetarien") {
    phrases.push("Poisson et fruits de mer restent proposés, viande et volaille sont écartées.");
  }
  if (restriction === "vegetarien" || restriction === "vegetalien") {
    const pct = restriction === "vegetalien" ? "15" : "10";
    phrases.push(
      `Les aliments proposés sont filtrés, et ton objectif de protéines est relevé de ${pct} % : les protéines végétales sont moins bien utilisées par le corps que les animales.`
    );
  }

  if (repartition === "keto") {
    phrases.push(
      "Tes glucides descendent à 20 à 50 g par jour et tes lipides absorbent le reste de tes calories. Ton total calorique ne change pas."
    );
  }
  if (repartition === "lowcarb") {
    phrases.push(
      enDeficit
        ? "Tes glucides sont posés à 25 % de tes calories et tes lipides absorbent le reste. En sèche, ils servent moins : c'est le levier le plus simple."
        : "Tes glucides sont posés à 30 % de tes calories et tes lipides absorbent le reste. Tu t'entraînes en volume : en descendre plus te coûterait des séries."
    );
  }
  if (repartition === "hyperproteine") {
    phrases.push(
      enDeficit
        ? "Tes protéines montent à 2,8 g par kilo — contre 2 g en temps normal — pour protéger ton muscle pendant la sèche. Tes glucides absorbent le reste."
        : "Tes protéines montent à 2,5 g par kilo, contre 2 g en temps normal. Tes lipides et tes glucides gardent leur calcul habituel."
    );
  }

  return phrases;
}

/**
 * Nombre d'aliments du catalogue qui passent les filtres d'un profil.
 *
 * Sert a l'alerte ci-dessous. Le compte est REFAIT a chaque appel plutot
 * qu'ecrit en dur : une phrase qui annonce « 4 sources de protéines »
 * doit rester vraie le jour ou le catalogue s'enrichit, sinon elle devient
 * un mensonge que personne ne pense a relire.
 *
 * `filtre` est passe par l'appelant (regimeOk vit dans aliments.js, qui
 * importe deja ce fichier : l'appeler d'ici ferait un cycle).
 */
export function sourcesProteinesDisponibles(profile, filtre) {
  return FOOD_DB.filter((a) => a.cat === "proteines" && filtre(a, profile)).length;
}

/** En dessous, une combinaison de réglages devient difficile a tenir. */
const SOURCES_PROTEINES_MIN = 8;

/**
 * Avertissement quand deux reglages, raisonnables separement, se cumulent
 * mal.
 *
 * NE BLOQUE RIEN, et c'est deliberé : le client a le droit de faire ce
 * qu'il veut de son alimentation. Mais lui laisser decouvrir tout seul, au
 * bout de trois semaines, que sa combinaison ne tient pas, c'est le perdre.
 *
 * Rend null quand il n'y a rien a signaler — le cas de la grande majorite
 * des profils.
 */
export function alerteRegime(profile, filtre) {
  const restriction = restrictionDuProfil(profile);
  const repartition = repartitionDuProfil(profile);

  // Le cas le plus dur, et le seul qui se mesure : trop peu de sources de
  // proteines passent les deux filtres a la fois.
  if (typeof filtre === "function" && repartition === "keto" && restriction !== "aucun") {
    const restantes = sourcesProteinesDisponibles(profile, filtre);
    if (restantes < SOURCES_PROTEINES_MIN) {
      return `Attention : avec ces deux réglages, ${restantes} sources de protéines seulement restent dans ton catalogue. C'est tenable, mais tes repas vont beaucoup se ressembler — parles-en à ton coach avant de te lancer.`;
    }
  }

  if (repartition === "keto" && (profile?.goal === "prise" || profile?.goal === "performance")) {
    return "Le kéto en prise de masse ou en performance est tenable, mais des glucides aussi bas limitent le volume d'entraînement que tu peux encaisser. « Pauvre en glucides » donne le même esprit sans ce coût.";
  }

  if (repartition === "hyperproteine" && restriction === "vegetalien") {
    return "Hyperprotéiné et végétalien se cumulent : ton objectif de protéines va demander des sources concentrées tous les jours (tofu ferme, seitan, protéine de pois). Vérifie que c'est réaliste pour toi avant de valider.";
  }

  return null;
}
