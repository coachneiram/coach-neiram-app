/**
 * Regimes alimentaires : liste proposee, filtrage, calibrage des macros.
 *
 * POURQUOI CE FICHIER EXISTE A COTE DE catalogues.js. La liste d'origine
 * (DIET_TYPES) est EXTRAITE de index.html par un script : la completer
 * la-bas serait efface a la prochaine extraction. Les regimes ajoutes
 * apres la migration vivent donc ici, et ce fichier compose la liste
 * complete a partir des deux sources. Un test verifie qu'aucun regime
 * d'origine ne disparait au passage.
 *
 * CE QU'UN REGIME PEUT CHANGER, ET CE QU'IL NE CHANGE JAMAIS
 *
 * Un regime agit sur deux choses, et deux seulement :
 *
 *  1. LES ALIMENTS PROPOSES. Voir EXCLUSIONS ci-dessous et regimeOk dans
 *     aliments.js.
 *  2. LA REPARTITION DES MACROS. Voir calibrageRegime.
 *
 * IL NE CHANGE JAMAIS LE TOTAL CALORIQUE. C'est le point le plus important
 * du fichier, et celui qu'on se trompe le plus souvent a vouloir bien
 * faire : la depense energetique d'un client depend de son corps, de son
 * activite et de son objectif — pas de la facon dont il repartit ce qu'il
 * mange. Les calories sont calculees dans computeTargets a partir du
 * metabolisme et de l'objectif, et aucun regime ne les touche.
 *
 * L'OBJECTIF, LUI, ENTRE DANS LE CALIBRAGE. Deux clients au meme regime
 * n'ont pas les memes besoins selon qu'ils sechent ou qu'ils prennent :
 * en deficit, les proteines protegent la masse maigre et comptent
 * davantage ; hors deficit, les glucides servent a s'entrainer. Chaque
 * regime dit donc ce qu'il fait DANS CHAQUE CAS, et pas seulement dans
 * l'absolu.
 */

import { DIET_TYPES } from "./catalogues.js";

/**
 * Regimes ajoutes apres la migration.
 *
 * Le choix de ces trois-la n'est pas une liste de tout ce qui existe :
 * c'est la liste de ce que l'application sait REELLEMENT appliquer.
 *
 *  - HYPERPROTEINE et PAUVRE EN GLUCIDES changent la repartition des
 *    macros, donc l'application peut les tenir.
 *  - PESCETARIEN change les aliments proposes, et le catalogue porte les
 *    etiquettes qu'il faut (« viande », « volaille », « poisson »).
 *
 * VOLONTAIREMENT ABSENTS, et pour une raison a chaque fois :
 *
 *  - MEDITERRANEEN : ce qui le definit est la QUALITE des lipides (huile
 *    d'olive, poisson gras) et la place des legumes. Le catalogue ne porte
 *    pas cette information ; le proposer reviendrait a afficher un libelle
 *    qui ne change rien.
 *  - JEUNE INTERMITTENT : c'est un horaire, pas une composition. Ni les
 *    macros ni les aliments ne bougent. Il a sa place dans les rappels,
 *    pas ici.
 *  - HALAL, CASHER : il faudrait distinguer le porc du reste des viandes,
 *    et le catalogue ne porte qu'une etiquette « viande » globale.
 *    L'approximer serait pire que ne rien proposer.
 *  - SANS GLUTEN, SANS LACTOSE : deja proposes, et mieux, dans les
 *    allergies et intolerances du profil. Les dupliquer en regime
 *    ouvrirait la porte a deux reglages contradictoires.
 */
export const REGIMES_AJOUTES = [
  { id: "pescetarien", label: "Pescétarien (poisson, sans viande)" },
  { id: "lowcarb", label: "Pauvre en glucides (low carb)" },
  { id: "hyperproteine", label: "Hyperprotéiné (ultra protéiné)" }
];

/**
 * Ordre d'affichage dans le profil.
 *
 * Les regimes sont regroupes par NATURE : d'abord ceux qui ecartent des
 * familles d'aliments, ensuite ceux qui deplacent les macros. Sans cet
 * ordre explicite, les ajouts se retrouveraient tous en fin de liste,
 * separes de ceux qui leur ressemblent.
 */
const ORDRE = ["aucun", "vegetarien", "vegetalien", "pescetarien", "keto", "lowcarb", "hyperproteine"];

const TOUS = [...DIET_TYPES, ...REGIMES_AJOUTES];

/** Liste complete des regimes proposes dans le profil. */
export const REGIMES = [
  ...ORDRE.map((id) => TOUS.find((r) => r.id === id)).filter(Boolean),
  // Filet de securite : un regime ajoute a index.html sans etre place dans
  // ORDRE reste propose, en fin de liste, plutot que de disparaitre du
  // formulaire sans que personne ne le remarque.
  ...TOUS.filter((r) => !ORDRE.includes(r.id))
];

/** Libelle affiche d'un regime, ou son identifiant a defaut. */
export const libelleRegime = (id) => REGIMES.find((r) => r.id === id)?.label || id;

/**
 * Familles d'aliments ecartees par les regimes ajoutes.
 *
 * Les regimes d'origine (vegetarien, vegetalien, keto) gardent leurs
 * regles dans aliments.js, ecrites la-bas et verifiees ligne a ligne
 * contre index.html. On ne les rejoue pas ici : deux implementations de la
 * meme regle finissent toujours par diverger.
 */
export const EXCLUSIONS = {
  // Le pescetarien mange du poisson et des fruits de mer. C'est exactement
  // ce qui le distingue du vegetarien, et la seule raison de le proposer.
  pescetarien: ["viande", "volaille"]
};

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
 * Proteines en regime hyperproteine, en g/kg du poids de reference.
 *
 * 2,5 g/kg hors deficit, 2,8 g/kg en deficit. La litterature sur la
 * retention de masse maigre chez le pratiquant en seche situe l'interet
 * entre 2,3 et 3,1 g/kg de masse maigre ; l'application raisonne sur le
 * poids de reference (deja plafonne pres du poids cible), ce qui place ces
 * valeurs dans la meme plage.
 *
 * A comparer aux 2 g/kg du calcul standard, et aux 2,2 g/kg de la seche de
 * force : ce regime est bien un cran au-dessus, ce que son nom promet.
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
 * lipides ni aux glucides. Dans ces cas, le regime se rapproche
 * silencieusement du calcul standard, ce qui est le bon comportement :
 * personne ne tient 60 % de ses calories en proteines.
 */
const HYPERPROTEINE_PART_MAX = 0.5;

/** Cible de glucides en keto : 5 % des calories, bornee entre 20 et 50 g. */
const KETO_PART = 0.05;
const KETO_MIN_G = 20;
const KETO_MAX_G = 50;

/** Ce client suit-il un regime qui abaisse volontairement ses glucides ? */
export function estFaibleEnGlucides(profile) {
  const regime = profile && profile.dietType;
  return regime === "keto" || regime === "lowcarb";
}

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
 * Rend null pour un regime qui ne touche qu'aux aliments proposes
 * (vegetarien, vegetalien, pescetarien) : leur client garde exactement le
 * calcul standard, et c'est voulu — rien dans le fait d'ecarter la viande
 * n'impose une autre repartition.
 *
 * Deux formes de reponse, et une seule a la fois :
 *
 *  - { poseGlucides: true, glucides }
 *                             les glucides sont POSES a cette valeur, et
 *                             les lipides absorbent le reste des calories.
 *                             C'est l'inverse du calcul standard. `glucides`
 *                             vaut null quand les calories ne sont pas
 *                             calculables : le regime s'applique quand meme,
 *                             il n'y a simplement rien a poser.
 *  - { proteinesParKg, proteinesPartMax }
 *                             les proteines montent, le reste du calcul ne
 *                             bouge pas : les lipides suivent leur regle
 *                             au poids, les glucides absorbent le reste.
 *
 * `contexte.enDeficit` vaut pour l'objectif « perte » comme pour une seche
 * de force : ce sont deux facons de dire la meme chose au corps.
 */
export function calibrageRegime(profile, contexte = {}) {
  const regime = profile && profile.dietType;
  const { calories = null, enDeficit = false } = contexte;

  // `poseGlucides` est un drapeau, pas une deduction depuis `glucides` :
  // sans total calorique, la cible n'est pas calculable et vaut null, mais
  // le regime pose quand meme les glucides. Confondre les deux faisait
  // retomber un profil incomplet sur la repartition standard — glucides
  // inconnus mais lipides calcules au poids, ce qui donnait a lire une
  // repartition qui n'etait celle de personne.
  if (regime === "keto") return { poseGlucides: true, glucides: glucidesKeto(calories) };
  if (regime === "lowcarb") return { poseGlucides: true, glucides: glucidesLowCarb(calories, enDeficit) };
  if (regime === "hyperproteine") {
    return {
      proteinesParKg: enDeficit ? HYPERPROTEINE_PAR_KG_DEFICIT : HYPERPROTEINE_PAR_KG,
      proteinesPartMax: HYPERPROTEINE_PART_MAX
    };
  }
  return null;
}

/**
 * Phrase expliquant au client ce que son regime change pour lui.
 *
 * Elle est ecrite au present et a la deuxieme personne, parce qu'elle
 * s'affiche sous son propre reglage. Elle dit AUSSI ce qui ne change pas :
 * un client qui voit ses glucides s'effondrer sans explication conclut a
 * un bug, ou pire, mange moins.
 *
 * Rend null pour « aucun régime » : il n'y a rien a expliquer.
 */
export function descriptionRegime(profile) {
  const regime = profile && profile.dietType;
  const enDeficit = !!(profile && (profile.goal === "perte" || profile.performanceDirection === "perte"));

  if (regime === "keto") {
    return "Tes glucides descendent à 20 à 50 g par jour et tes lipides absorbent le reste de tes calories. Tes protéines et ton total calorique ne changent pas.";
  }
  if (regime === "lowcarb") {
    return enDeficit
      ? "Tes glucides sont posés à 25 % de tes calories et tes lipides absorbent le reste. En sèche, ils servent moins : c'est le levier le plus simple."
      : "Tes glucides sont posés à 30 % de tes calories et tes lipides absorbent le reste. Tu t'entraînes en volume : en descendre plus te coûterait des séries.";
  }
  if (regime === "hyperproteine") {
    return enDeficit
      ? "Tes protéines montent à 2,8 g par kilo — contre 2 g en temps normal — pour protéger ton muscle pendant la sèche. Tes glucides absorbent le reste."
      : "Tes protéines montent à 2,5 g par kilo, contre 2 g en temps normal. Tes lipides et tes glucides gardent leur calcul habituel.";
  }
  if (regime === "pescetarien") {
    return "Poisson et fruits de mer restent proposés, viande et volaille sont écartées. Tes objectifs chiffrés ne changent pas.";
  }
  if (regime === "vegetarien" || regime === "vegetalien") {
    return "Les aliments proposés sont filtrés. Tes objectifs chiffrés, eux, restent les mêmes qu'avec n'importe quel autre régime.";
  }
  return null;
}
